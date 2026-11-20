import { Db_Pool } from "../config/db_conn.js";
import crypto from "crypto";

export const BookingModel = {
    // 1. Get beauticians count for capacity check
    getCityBeauticiansCount: async (city) => {
        const [rows] = await Db_Pool.query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'beautician' AND city = ? AND status = 'active'",
            [city]
        );
        return rows[0]?.count || 3;
    },

    // 2. Get booked slots for a specific date and city
    getBookedSlotsCount: async (date, city) => {
        const [rows] = await Db_Pool.query(
            `SELECT booking_time, COUNT(*) as booked_count 
             FROM appointments 
             WHERE booking_date = ? 
               AND city = ? 
               AND status != 'cancelled'
             GROUP BY booking_time`,
            [date, city]
        );
        return rows;
    },

    // 3. Find coupon by code
    findCouponByCode: async (code) => {
        const [rows] = await Db_Pool.query(
            `SELECT * FROM vendor_coupons 
             WHERE LOWER(TRIM(code)) = LOWER(TRIM(?)) 
               AND status = 'active' 
               AND (approval_status = 'approved' OR approval_status IS NULL) 
             LIMIT 1`,
            [code]
        );
        return rows[0] || null;
    },

    // 4. Increment coupon usage count
    incrementCouponUsage: async (couponId) => {
        await Db_Pool.query(
            "UPDATE vendor_coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE id = ?",
            [couponId]
        );
    },

    // 5. Create new appointment
    createAppointment: async (appointmentData) => {
        const [result] = await Db_Pool.query(
            "INSERT INTO appointments SET ?",
            [appointmentData]
        );
        return result.insertId;
    },

    // 6. Get user appointments with optional status filter
    getUserAppointments: async (userId, statusFilter) => {
        let query = `
            SELECT id, booking_id, user_id, beautician_id, service_name, customer_name, customer_phone,
                   booking_date, booking_time, amount, subtotal, gst_amount, address, city, payment_method,
                   status, otp, rating, coupon_code, coupon_discount, created_at
            FROM appointments
            WHERE user_id = ?
        `;
        const params = [userId];

        if (statusFilter === "upcoming") {
            query += " AND status IN ('pending', 'assigned', 'in_progress', 'confirmed')";
        } else if (statusFilter === "completed") {
            query += " AND status = 'completed'";
        } else if (statusFilter === "cancelled") {
            query += " AND status = 'cancelled'";
        }

        query += " ORDER BY id DESC";
        const [rows] = await Db_Pool.query(query, params);
        return rows;
    },

    // 7. Get single appointment details by ID or booking_id
    getAppointmentDetails: async (bookingIdentifier, userId) => {
        const isNumeric = /^\d+$/.test(bookingIdentifier);
        const whereClause = isNumeric 
            ? "(a.id = ? OR a.booking_id = ?) AND a.user_id = ?"
            : "a.booking_id = ? AND a.user_id = ?";
        const params = isNumeric 
            ? [bookingIdentifier, bookingIdentifier, userId]
            : [bookingIdentifier, userId];

        const [rows] = await Db_Pool.query(
            `SELECT a.*, 
                    b.name as beautician_name, 
                    b.phone as beautician_phone, 
                    b.rating as beautician_rating, 
                    b.profile_pic as beautician_image
             FROM appointments a
             LEFT JOIN users b ON a.beautician_id = b.id
             WHERE ${whereClause}
             LIMIT 1`,
            params
        );
        return rows[0] || null;
    },

    // 8. Generate unique booking ID (e.g. ORD-42BA24)
    generateBookingId: () => {
        const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
        return `ORD-${randomHex}`;
    },

    // 9. Generate 6-digit service OTP
    generateServiceOTP: () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
};
