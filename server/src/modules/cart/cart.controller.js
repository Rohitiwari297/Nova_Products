import { asyncHandler } from "../../utils/asyncHandler.js";
import { CartModel } from "../../models/cart.model.js";

// GET /api/v1/cart (Get user's cart)
export const getCart = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await CartModel.getCartByUserId(userId);

        res.json({
            success: true,
            ...cart
        });
    } catch (error) {
        console.error("getCart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/cart (Add to cart)
export const addToCart = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { item_id, item_type = "product", quantity = 1 } = req.body;

        if (!item_id) {
            return res.status(400).json({
                success: false,
                message: "item_id is required"
            });
        }

        const validTypes = ["product", "service"];
        if (!validTypes.includes(item_type)) {
            return res.status(400).json({
                success: false,
                message: "item_type must be either 'product' or 'service'"
            });
        }

        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: "quantity must be a positive integer"
            });
        }

        await CartModel.addToCart({
            userId,
            item_type,
            item_id: Number(item_id),
            quantity: qty
        });

        const updatedCart = await CartModel.getCartByUserId(userId);

        res.status(201).json({
            success: true,
            message: "Item added to cart successfully",
            ...updatedCart
        });
    } catch (error) {
        console.error("addToCart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/cart/:id (Update item quantity)
export const updateCartItem = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: cartId } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined || isNaN(Number(quantity))) {
            return res.status(400).json({
                success: false,
                message: "A valid quantity number is required"
            });
        }

        const result = await CartModel.updateQuantity({
            cartId,
            userId,
            quantity: Number(quantity)
        });

        const updatedCart = await CartModel.getCartByUserId(userId);

        res.json({
            success: true,
            message: result.action === "removed" ? "Item removed from cart" : "Cart updated successfully",
            ...updatedCart
        });
    } catch (error) {
        console.error("updateCartItem Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/cart/:id (Remove single item from cart)
export const removeFromCart = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: cartId } = req.params;

        const removed = await CartModel.removeItem({ cartId, userId });
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found or unauthorized"
            });
        }

        const updatedCart = await CartModel.getCartByUserId(userId);

        res.json({
            success: true,
            message: "Item removed from cart successfully",
            ...updatedCart
        });
    } catch (error) {
        console.error("removeFromCart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/cart (Clear whole cart)
export const clearCart = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        await CartModel.clearCart(userId);

        res.json({
            success: true,
            message: "Cart cleared successfully",
            items: [],
            total_items: 0,
            cart_total: 0
        });
    } catch (error) {
        console.error("clearCart Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
