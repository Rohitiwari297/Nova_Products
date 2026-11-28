import { Db_Pool } from "../config/db_conn.js";

export const CartModel = {
    // 1. Get user cart with full item details (Product or Service)
    getCartByUserId: async (userId) => {
        // Fetch raw cart items
        const [cartRows] = await Db_Pool.query(
            "SELECT id, user_id, item_type, item_id, quantity, updated_at FROM user_cart WHERE user_id = ? ORDER BY id DESC",
            [userId]
        );

        if (cartRows.length === 0) {
            return {
                items: [],
                total_items: 0,
                cart_total: 0
            };
        }

        const productIds = cartRows.filter(r => r.item_type === "product").map(r => r.item_id);
        const serviceIds = cartRows.filter(r => r.item_type === "service").map(r => r.item_id);

        // Fetch products details
        let productMap = {};
        if (productIds.length > 0) {
            const [prods] = await Db_Pool.query(
                "SELECT id, name, image, sale_price as price, qty as stock, unit FROM inventory WHERE id IN (?)",
                [productIds]
            );
            prods.forEach(p => { productMap[p.id] = p; });
        }

        // Fetch services details
        let serviceMap = {};
        if (serviceIds.length > 0) {
            const [servs] = await Db_Pool.query(
                "SELECT id, name, image, price, duration, category FROM services WHERE id IN (?)",
                [serviceIds]
            );
            servs.forEach(s => { serviceMap[s.id] = s; });
        }

        // Combine and calculate
        let cartTotal = 0;
        let totalItems = 0;

        const items = cartRows.map(cartItem => {
            const isProduct = cartItem.item_type === "product";
            const detail = isProduct ? productMap[cartItem.item_id] : serviceMap[cartItem.item_id];

            const name = detail ? detail.name : "Unavailable Item";
            const price = detail ? Number(detail.price) : 0;
            const image = detail ? detail.image : null;
            const itemTotal = price * cartItem.quantity;

            cartTotal += itemTotal;
            totalItems += cartItem.quantity;

            return {
                cart_id: cartItem.id,
                item_type: cartItem.item_type,
                item_id: cartItem.item_id,
                name,
                image,
                price,
                quantity: cartItem.quantity,
                item_total: itemTotal,
                unit: isProduct ? detail?.unit : null,
                duration: !isProduct ? detail?.duration : null,
                stock: isProduct ? detail?.stock : null,
                is_available: !!detail
            };
        });

        return {
            items,
            total_items: totalItems,
            cart_total: Math.round(cartTotal * 100) / 100
        };
    },

    // 2. Add item to cart or increment quantity
    addToCart: async ({ userId, item_type = "product", item_id, quantity = 1 }) => {
        const [result] = await Db_Pool.query(
            `INSERT INTO user_cart (user_id, item_type, item_id, quantity) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
            [userId, item_type, item_id, Number(quantity)]
        );
        return result;
    },

    // 3. Update quantity of specific cart item
    updateQuantity: async ({ cartId, userId, quantity }) => {
        const qty = Number(quantity);
        if (qty <= 0) {
            await Db_Pool.query("DELETE FROM user_cart WHERE id = ? AND user_id = ?", [cartId, userId]);
            return { action: "removed" };
        } else {
            await Db_Pool.query("UPDATE user_cart SET quantity = ? WHERE id = ? AND user_id = ?", [qty, cartId, userId]);
            return { action: "updated" };
        }
    },

    // 4. Remove single item from cart
    removeItem: async ({ cartId, userId }) => {
        const [result] = await Db_Pool.query("DELETE FROM user_cart WHERE id = ? AND user_id = ?", [cartId, userId]);
        return result.affectedRows > 0;
    },

    // 5. Clear entire cart
    clearCart: async (userId) => {
        await Db_Pool.query("DELETE FROM user_cart WHERE user_id = ?", [userId]);
    }
};
