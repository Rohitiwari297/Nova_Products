import express from "express";
import { verifyToken } from "../../middleware/auth.middleware.js";
import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} from "./cart.controller.js";

const router = express.Router();

// All cart endpoints require user JWT authentication
router.use(verifyToken);

// 1. GET /api/v1/cart
router.get("/", getCart);

// 2. POST /api/v1/cart (Add item)
router.post("/", addToCart);

// 3. PUT /api/v1/cart/:id (Update quantity)
router.put("/:id", updateCartItem);

// 4. DELETE /api/v1/cart/:id (Remove item)
router.delete("/:id", removeFromCart);

// 5. DELETE /api/v1/cart (Clear all)
router.delete("/", clearCart);

export default router;
