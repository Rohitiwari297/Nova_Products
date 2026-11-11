import { Db_Pool } from "../config/db_conn.js";

export const CatalogModel = {
    // 1. Get all active operational cities
    getCities: async () => {
        const [rows] = await Db_Pool.query(
            "SELECT id, name, state, status FROM cities WHERE status = 'active' ORDER BY name ASC"
        );
        return rows;
    },

    // 2. Get active promotional banners
    getBanners: async (city) => {
        let query = "SELECT id, image, title, link, sort_order FROM banners WHERE status = 'active'";
        const params = [];

        if (city) {
            query += " AND (target_cities LIKE ? OR target_cities IS NULL OR target_cities = '' OR target_cities = '[]')";
            params.push(`%${city}%`);
        }

        query += " ORDER BY sort_order ASC, id DESC";
        const [rows] = await Db_Pool.query(query, params);
        return rows;
    },

    // 3. Get active categories
    getCategories: async (city) => {
        let query = "SELECT id, name, image, sort_order FROM categories WHERE status = 'active'";
        const params = [];

        if (city) {
            query += " AND (target_cities LIKE ? OR target_cities IS NULL OR target_cities = '' OR target_cities = '[]')";
            params.push(`%${city}%`);
        }

        query += " ORDER BY sort_order ASC, name ASC";
        const [rows] = await Db_Pool.query(query, params);
        return rows;
    },

    // 4. Get services with filters (category, search, city, pagination)
    getServices: async ({ category, city, search, page = 1, limit = 20 }) => {
        const offset = (Number(page) - 1) * Number(limit);
        let whereClauses = ["status = 'active'"];
        const params = [];

        if (category) {
            whereClauses.push("category = ?");
            params.push(category);
        }

        if (search) {
            whereClauses.push("(name LIKE ? OR about LIKE ?)");
            params.push(`%${search}%`, `%${search}%`);
        }

        if (city) {
            whereClauses.push("(city = ? OR target_cities LIKE ? OR target_cities IS NULL OR target_cities = '' OR target_cities = '[]')");
            params.push(city, `%${city}%`);
        }

        const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // Total count
        const countQuery = `SELECT COUNT(*) as total FROM services ${whereSQL}`;
        const [countResult] = await Db_Pool.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        // Fetch paginated data
        const dataQuery = `
            SELECT id, name, price, duration, category, about, included, experts, image, 
                   offer_percentage, offer_text, gst_percentage
            FROM services 
            ${whereSQL}
            ORDER BY id ASC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await Db_Pool.query(dataQuery, [...params, Number(limit), Number(offset)]);

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
            services: rows.map(service => ({
                ...service,
                included_list: service.included ? service.included.split("\n").map(s => s.trim()).filter(Boolean) : [],
                experts_list: service.experts ? service.experts.split("\n").map(s => s.trim()).filter(Boolean) : []
            }))
        };
    },

    // 5. Get single service details by ID
    getServiceById: async (id) => {
        const [rows] = await Db_Pool.query(
            `SELECT id, name, price, duration, category, about, included, experts, image, 
                    offer_percentage, offer_text, gst_percentage, created_at
             FROM services 
             WHERE id = ? AND status = 'active' 
             LIMIT 1`,
            [id]
        );

        if (!rows || rows.length === 0) return null;

        const service = rows[0];
        return {
            ...service,
            included_list: service.included ? service.included.split("\n").map(s => s.trim()).filter(Boolean) : [],
            experts_list: service.experts ? service.experts.split("\n").map(s => s.trim()).filter(Boolean) : []
        };
    }
};
