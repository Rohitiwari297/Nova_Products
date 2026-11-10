import mysql from "mysql2/promise";
import { config } from "./config.js";

// Connection Pool create karna
export const Db_Pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export const connectDB = async () => {
    try {
        const connection = await Db_Pool.getConnection();
        console.log(`MySQL Database connected sucessfully to, ${config.db.database}`)
        connection.release(); // connection pool me wapas release karein
    } catch (err) {
        console.error(" MySQL Connection Failed:", err.message);
        process.exit(1);
    }
}