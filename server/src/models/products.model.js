import { Db_Pool } from "../config/db_conn.js";

export const ProductModel = {
    // 1. Sabhi active products fetch karna (Pagination + Search ke sath)
    getAllProducts: async ({ search, page = 1, limit = 20 }) => {
        const offset = (Number(page) - 1) * Number(limit);
        let whereClauses = ["status = 'active'", "shop = 1"];
        const params = [];

        if (search) {
            whereClauses.push("(name LIKE ? OR description LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        const whereSQL = "WHERE " + whereClauses.join(" AND ");

        // Total count
        const [countResult] = await Db_Pool.query(
            `SELECT COUNT(*) as total FROM inventory ${whereSQL}`,
            params
        );
        const total = countResult[0]?.total || 0;

        // Fetch products
        const [rows] = await Db_Pool.query(
            `SELECT id, name, image, sale_price as price, cost_price, qty as stock, unit, description, gst_percentage, created_at 
             FROM inventory 
             ${whereSQL}
             ORDER BY id DESC 
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
            products: rows
        };
    },

    // 2. Single product details by ID
    getProductById: async (id) => {
        const [rows] = await Db_Pool.query(
            `SELECT id, name, image, sale_price as price, cost_price, qty as stock, unit, description, gst_percentage, created_at 
             FROM inventory 
             WHERE id = ? AND status = 'active' AND shop = 1 
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    // 3. Stock check helper
    checkStock: async (id) => {
        const [rows] = await Db_Pool.query(
            "SELECT id, name, qty as stock, sale_price as price FROM inventory WHERE id = ? AND status = 'active'",
            [id]
        );
        return rows[0] || null;
    }
};
