import { asyncHandler } from "../../utils/asyncHandler.js";
import { UserModel } from "../../models/user.model.js";
import bcrypt from "bcryptjs";
import { genToken } from "../../utils/genToken.js";
import { rolesConst, userStatus } from "../../utils/constaint.js";

// ==========================================
// 1. REGISTER (Naya Customer Account Banana)
// ==========================================
export const register = asyncHandler(async (req, res) => {
    try {
        const { name, email, phone, password, city } = req.body;

        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already registered" });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save user to MySQL (role default 'customer')
        const userId = await UserModel.create({
            name,
            email,
            phone,
            password: hashedPassword,
            city: city || null,
            role: rolesConst.CUSTOMER,
            status: userStatus.ACTIVE
        });

        // JWT Token generate karein
        const token = genToken(userId, rolesConst.CUSTOMER);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: { id: userId, name, email, phone, role: rolesConst.CUSTOMER, city }
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 2. LOGIN (Email & Password se Login)
// ==========================================
export const login = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // User find karein
        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Password verify karein
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Token banayein
        const token = genToken(user.id, user.role);

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                city: user.city,
                wallet_balance: user.wallet_balance
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// 3. LOGOUT (User Logout)
// ==========================================
export const logout = asyncHandler(async (req, res) => {
    // JWT client-side (Frontend / App) par store hota hai
    res.json({
        success: true,
        message: "Logged out successfully"
    });
});

// ==========================================
// 4. GET ME (Current Logged-in User Data)
// ==========================================
export const getMe = asyncHandler(async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
