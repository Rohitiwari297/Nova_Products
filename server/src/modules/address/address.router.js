import express from "express";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress
} from "./address.controller.js";

const router = express.Router();

// All address routes require customer JWT authentication
router.use(verifyToken);

// 1. GET /api/v1/user/addresses
router.get("/", getAddresses);

// 2. POST /api/v1/user/addresses
router.post("/", createAddress);

// 3. PUT /api/v1/user/addresses/:id
router.put("/:id", updateAddress);

// 4. DELETE /api/v1/user/addresses/:id
router.delete("/:id", deleteAddress);

export default router;
