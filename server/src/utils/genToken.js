import jwt from "jsonwebtoken";

export const genToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET || "nova_beauty_secret_jwt_key_2026",
        { expiresIn: "7d" }
    );
};
