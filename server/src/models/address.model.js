import { Db_Pool } from "../config/db_conn.js";

export const AddressModel = {
    // 1. Get all saved addresses for a specific user
    findByUserId: async (userId) => {
        const [rows] = await Db_Pool.query(
            "SELECT id, user_id, full_address, city, landmark, lat, lng, label, created_at FROM addresses WHERE user_id = ? ORDER BY id DESC",
            [userId]
        );
        return rows;
    },

    // 2. Find a specific address by ID and user_id (security check)
    findByIdAndUserId: async (id, userId) => {
        const [rows] = await Db_Pool.query(
            "SELECT id, user_id, full_address, city, landmark, lat, lng, label, created_at FROM addresses WHERE id = ? AND user_id = ? LIMIT 1",
            [id, userId]
        );
        return rows[0] || null;
    },

    // 3. Create a new address
    create: async ({ userId, full_address, city, landmark = null, lat = null, lng = null, label = "Home" }) => {
        const [result] = await Db_Pool.query(
            "INSERT INTO addresses (user_id, full_address, city, landmark, lat, lng, label) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [userId, full_address, city, landmark, lat, lng, label]
        );
        return result.insertId;
    },

    // 4. Update an existing address
    update: async (id, userId, { full_address, city, landmark = null, lat = null, lng = null, label = "Home" }) => {
        const [result] = await Db_Pool.query(
            `UPDATE addresses 
             SET full_address = ?, city = ?, landmark = ?, lat = ?, lng = ?, label = ? 
             WHERE id = ? AND user_id = ?`,
            [full_address, city, landmark, lat, lng, label, id, userId]
        );
        return result.affectedRows > 0;
    },

    // 5. Delete an address
    delete: async (id, userId) => {
        const [result] = await Db_Pool.query(
            "DELETE FROM addresses WHERE id = ? AND user_id = ?",
            [id, userId]
        );
        return result.affectedRows > 0;
    }
};
