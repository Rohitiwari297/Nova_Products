import { Db_Pool } from '../config/db_conn.js'

export const UserModel = {
    findByEmail: async (email) => {
        const [rows] = await Db_Pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0] || null;
    },

    findById: async (id) => {
        const [rows] = await Db_Pool.query(
            'SELECT id, name, email, phone, city, role, status, wallet_balance, created_at FROM users WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    create: async (data) => {
        const [result] = await Db_Pool.query('INSERT INTO users SET ?', [data]);
        return result.insertId;
    }
};