import express from "express";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
    getAvailableSlots,
    applyCoupon,
    createAppointment,
    getMyAppointments,
    getAppointmentDetails
} from "./booking.controller.js";

const router = express.Router();

// 1. GET /api/v1/bookings/available-slots (Public/Protected: date & city slots)
router.get("/bookings/available-slots", getAvailableSlots);

// 2. POST /api/v1/coupons/apply (Validate & calculate discount)
router.post("/coupons/apply", applyCoupon);

// 3. POST /api/v1/appointments (Book new appointment - Requires Customer JWT)
router.post("/appointments", verifyToken, createAppointment);

// 4. GET /api/v1/appointments (List customer's bookings - Requires Customer JWT)
router.get("/appointments", verifyToken, getMyAppointments);

// 5. GET /api/v1/appointments/:bookingId (Single booking details - Requires Customer JWT)
router.get("/appointments/:bookingId", verifyToken, getAppointmentDetails);

export default router;
