import { asyncHandler } from "../../utils/asyncHandler.js";
import { BookingModel } from "../../models/booking.model.js";
import { AddressModel } from "../../models/address.model.js";
import { UserModel } from "../../models/user.model.js";
import { Db_Pool } from "../../config/db_conn.js";

// Master Slots List (09:00 AM se 06:30 PM tak, 30 min interval)
const MASTER_SLOTS = [
    "09:00:00", "09:30:00",
    "10:00:00", "10:30:00",
    "11:00:00", "11:30:00",
    "12:00:00", "12:30:00",
    "13:00:00", "13:30:00",
    "14:00:00", "14:30:00",
    "15:00:00", "15:30:00",
    "16:00:00", "16:30:00",
    "17:00:00", "17:30:00",
    "18:00:00", "18:30:00"
];

// Helper: 24hr string ("14:30:00") -> 12hr display ("02:30 PM")
const formatDisplayTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h.toString().padStart(2, "0")}:${minutes} ${ampm}`;
};

// ========================================================
// 1. GET AVAILABLE TIME SLOTS (GET /api/v1/bookings/available-slots)
// ========================================================
export const getAvailableSlots = asyncHandler(async (req, res) => {
    const { date, city } = req.query;

    if (!date || !city) {
        return res.status(400).json({
            success: false,
            message: "Both date (YYYY-MM-DD) and city are required query parameters"
        });
    }

    // 1. Get capacity & booked slots
    const maxCapacity = await BookingModel.getCityBeauticiansCount(city);
    const bookedRows = await BookingModel.getBookedSlotsCount(date, city);

    const bookedMap = {};
    bookedRows.forEach(row => {
        bookedMap[row.booking_time] = row.booked_count;
    });

    // 2. Check if date is Today (disable past hours)
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const isToday = todayStr === date;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // 3. Map master slots
    const slots = MASTER_SLOTS.map(timeStr => {
        const [slotHour, slotMin] = timeStr.split(":").map(Number);
        const bookedCount = bookedMap[timeStr] || 0;

        let isAvailable = true;
        let reason = "Available";

        // Capacity check
        if (bookedCount >= maxCapacity) {
            isAvailable = false;
            reason = "Fully booked";
        }

        // Past time check for today
        if (isToday) {
            if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMinute)) {
                isAvailable = false;
                reason = "Time passed";
            }
        }

        return {
            time: timeStr,
            display_time: formatDisplayTime(timeStr),
            is_available: isAvailable,
            reason
        };
    });

    res.json({
        success: true,
        date,
        city,
        total_slots: slots.length,
        available_slots_count: slots.filter(s => s.is_available).length,
        slots
    });
});

// ========================================================
// 2. APPLY COUPON CODE (POST /api/v1/coupons/apply)
// ========================================================
export const applyCoupon = asyncHandler(async (req, res) => {
    const { coupon_code, cart_total, city } = req.body;

    if (!coupon_code) {
        return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const orderAmount = Number(cart_total);
    if (isNaN(orderAmount) || orderAmount <= 0) {
        return res.status(400).json({ success: false, message: "A valid positive cart_total is required" });
    }

    const coupon = await BookingModel.findCouponByCode(coupon_code);
    if (!coupon) {
        return res.status(404).json({ success: false, message: "Invalid or inactive coupon code" });
    }

    // Check expiration
    if (coupon.expires_at) {
        const expiry = new Date(coupon.expires_at);
        if (expiry < new Date()) {
            return res.status(400).json({ success: false, message: "This coupon code has expired" });
        }
    }

    // Check minimum order amount
    const minOrder = Number(coupon.min_order_amount) || 0;
    if (orderAmount < minOrder) {
        return res.status(400).json({
            success: false,
            message: `Minimum order amount of ₹${minOrder} required to apply this coupon`
        });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return res.status(400).json({ success: false, message: "This coupon has reached its maximum usage limit" });
    }

    // Calculate discount
    let discount = 0;
    const discountVal = Number(coupon.discount_amount);

    if (coupon.discount_type === "percent") {
        discount = (orderAmount * discountVal) / 100;
        if (coupon.max_discount_amount) {
            discount = Math.min(discount, Number(coupon.max_discount_amount));
        }
    } else {
        // Flat discount
        discount = Math.min(discountVal, orderAmount);
    }

    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.max(0, orderAmount - discount);

    res.json({
        success: true,
        message: "Coupon applied successfully",
        coupon: {
            code: coupon.code,
            title: coupon.title || "",
            subtitle: coupon.subtitle || "",
            discount_type: coupon.discount_type,
            discount_percentage: coupon.discount_type === "percent" ? discountVal : null,
            discount_amount: discount,
            original_amount: orderAmount,
            final_amount: finalAmount
        }
    });
});

// ========================================================
// 3. CREATE APPOINTMENT (POST /api/v1/appointments)
// ========================================================
export const createAppointment = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
        address_id,
        address: customAddress,
        city: customCity,
        booking_date,
        booking_time,
        services,
        coupon_code,
        payment_method = "Cash on Delivery",
        customer_name,
        customer_phone
    } = req.body;

    // 1. Validation
    if (!booking_date || !booking_time) {
        return res.status(400).json({
            success: false,
            message: "booking_date (YYYY-MM-DD) and booking_time (HH:MM:SS) are required"
        });
    }

    if (!Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
            success: false,
            message: "services must be a non-empty array of { service_id, quantity }"
        });
    }

    // 2. Fetch User Profile
    const user = await UserModel.findById(userId);
    const clientName = customer_name || user?.name || "Customer";
    const clientPhone = customer_phone || user?.phone || "";

    // 3. Address Resolution
    let finalAddress = customAddress || "";
    let finalCity = customCity || user?.city || "";
    let finalLat = null;
    let finalLng = null;

    if (address_id) {
        const savedAddr = await AddressModel.findByIdAndUserId(address_id, userId);
        if (savedAddr) {
            finalAddress = savedAddr.full_address;
            finalCity = savedAddr.city;
            finalLat = savedAddr.lat;
            finalLng = savedAddr.lng;
        }
    }

    if (!finalAddress || !finalCity) {
        return res.status(400).json({
            success: false,
            message: "Doorstep address and city are required. Please select or add an address."
        });
    }

    // 4. Calculate Services Total & Names
    const serviceIds = services.map(s => s.service_id).filter(Boolean);
    if (serviceIds.length === 0) {
        return res.status(400).json({ success: false, message: "Valid service IDs are required" });
    }

    const [dbServices] = await Db_Pool.query(
        "SELECT id, name, price, gst_percentage FROM services WHERE id IN (?)",
        [serviceIds]
    );

    const serviceMap = {};
    dbServices.forEach(s => {
        serviceMap[s.id] = s;
    });

    let subtotal = 0;
    const serviceNames = [];

    services.forEach(item => {
        const s = serviceMap[item.service_id];
        if (s) {
            const qty = Number(item.quantity) || 1;
            subtotal += Number(s.price) * qty;
            serviceNames.push(qty > 1 ? `${s.name} (x${qty})` : s.name);
        }
    });

    if (serviceNames.length === 0) {
        return res.status(400).json({ success: false, message: "None of the selected services exist" });
    }

    const serviceNameStr = serviceNames.join(", ");

    // 5. Apply Coupon (if provided)
    let couponDiscount = 0;
    let validCouponCode = "";

    if (coupon_code) {
        const coupon = await BookingModel.findCouponByCode(coupon_code);
        if (coupon) {
            const minOrder = Number(coupon.min_order_amount) || 0;
            if (subtotal >= minOrder) {
                const discountVal = Number(coupon.discount_amount);
                if (coupon.discount_type === "percent") {
                    couponDiscount = (subtotal * discountVal) / 100;
                    if (coupon.max_discount_amount) {
                        couponDiscount = Math.min(couponDiscount, Number(coupon.max_discount_amount));
                    }
                } else {
                    couponDiscount = Math.min(discountVal, subtotal);
                }
                couponDiscount = Math.round(couponDiscount * 100) / 100;
                validCouponCode = coupon.code;
                await BookingModel.incrementCouponUsage(coupon.id);
            }
        }
    }

    const gstPercentage = 0.00;
    const gstAmount = 0.00;
    const finalAmount = Math.max(0, subtotal + gstAmount - couponDiscount);

    // 6. Generate IDs
    const bookingId = BookingModel.generateBookingId();
    const serviceOtp = BookingModel.generateServiceOTP();

    // 7. Insert Appointment
    const appointmentPayload = {
        booking_id: bookingId,
        user_id: userId,
        beautician_id: null,
        service_id: serviceIds[0] || null,
        service_name: serviceNameStr,
        customer_name: clientName,
        customer_phone: clientPhone,
        booking_date: booking_date,
        booking_time: booking_time,
        amount: finalAmount,
        subtotal: subtotal,
        gst_percentage: gstPercentage,
        gst_amount: gstAmount,
        address: finalAddress,
        city: finalCity,
        lat: finalLat,
        lng: finalLng,
        payment_method: payment_method,
        status: "pending",
        otp: serviceOtp,
        coupon_code: validCouponCode,
        coupon_discount: couponDiscount
    };

    const newAppointmentId = await BookingModel.createAppointment(appointmentPayload);
    const appointmentDetails = await BookingModel.getAppointmentDetails(newAppointmentId, userId);

    res.status(201).json({
        success: true,
        message: "Appointment booked successfully!",
        booking: {
            id: newAppointmentId,
            booking_id: bookingId,
            status: "pending",
            otp: serviceOtp,
            booking_date,
            booking_time: formatDisplayTime(booking_time),
            service_name: serviceNameStr,
            customer_name: clientName,
            customer_phone: clientPhone,
            address: finalAddress,
            city: finalCity,
            subtotal,
            coupon_code: validCouponCode,
            coupon_discount: couponDiscount,
            total_amount: finalAmount,
            payment_method
        }
    });
});

// ========================================================
// 4. GET MY APPOINTMENTS (GET /api/v1/appointments)
// ========================================================
export const getMyAppointments = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status } = req.query; // optional: upcoming, completed, cancelled

    const appointments = await BookingModel.getUserAppointments(userId, status);

    res.json({
        success: true,
        count: appointments.length,
        appointments: appointments.map(a => ({
            ...a,
            formatted_date: a.booking_date ? new Date(a.booking_date).toISOString().split("T")[0] : "",
            formatted_time: a.booking_time ? formatDisplayTime(a.booking_time) : ""
        }))
    });
});

// ========================================================
// 5. GET APPOINTMENT DETAILS (GET /api/v1/appointments/:bookingId)
// ========================================================
export const getAppointmentDetails = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const appointment = await BookingModel.getAppointmentDetails(bookingId, userId);

    if (!appointment) {
        return res.status(404).json({
            success: false,
            message: `Appointment with ID ${bookingId} not found`
        });
    }

    res.json({
        success: true,
        appointment: {
            ...appointment,
            formatted_date: appointment.booking_date ? new Date(appointment.booking_date).toISOString().split("T")[0] : "",
            formatted_time: appointment.booking_time ? formatDisplayTime(appointment.booking_time) : ""
        }
    });
});
