import { asyncHandler } from "../../utils/asyncHandler.js";
import { AddressModel } from "../../models/address.model.js";

// 1. Get all saved addresses of current logged-in user
export const getAddresses = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await AddressModel.findByUserId(userId);

        res.json({
            success: true,
            count: addresses.length,
            addresses
        });
    } catch (error) {
        console.error("getAddresses Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Add a new address
export const createAddress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_address, city, landmark, lat, lng, label } = req.body;

        if (!full_address || !city) {
            return res.status(400).json({
                success: false,
                message: "Full address and city are required fields"
            });
        }

        const addressId = await AddressModel.create({
            userId,
            full_address,
            city,
            landmark,
            lat,
            lng,
            label: label || "Home"
        });

        const newAddress = await AddressModel.findByIdAndUserId(addressId, userId);

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            address: newAddress
        });
    } catch (error) {
        console.error("createAddress Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Update an existing address
export const updateAddress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { full_address, city, landmark, lat, lng, label } = req.body;

        if (!full_address || !city) {
            return res.status(400).json({
                success: false,
                message: "Full address and city are required fields"
            });
        }

        const existing = await AddressModel.findByIdAndUserId(id, userId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Address not found or unauthorized to edit"
            });
        }

        await AddressModel.update(id, userId, {
            full_address,
            city,
            landmark: landmark !== undefined ? landmark : existing.landmark,
            lat: lat !== undefined ? lat : existing.lat,
            lng: lng !== undefined ? lng : existing.lng,
            label: label || existing.label
        });

        const updated = await AddressModel.findByIdAndUserId(id, userId);

        res.json({
            success: true,
            message: "Address updated successfully",
            address: updated
        });
    } catch (error) {
        console.error("updateAddress Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Delete an address
export const deleteAddress = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = await AddressModel.findByIdAndUserId(id, userId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Address not found or unauthorized to delete"
            });
        }

        await AddressModel.delete(id, userId);

        res.json({
            success: true,
            message: "Address deleted successfully"
        });
    } catch (error) {
        console.error("deleteAddress Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
