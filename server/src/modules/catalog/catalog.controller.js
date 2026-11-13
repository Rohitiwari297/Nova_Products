import { asyncHandler } from "../../utils/asyncHandler.js";
import { CatalogModel } from "../../models/catalog.model.js";

// 1. Get operational cities
export const getCities = asyncHandler(async (req, res) => {
    try {
        const cities = await CatalogModel.getCities();
        res.json({
            success: true,
            count: cities.length,
            cities
        });
    } catch (error) {
        console.error("getCities Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Get homepage promotional banners
export const getBanners = asyncHandler(async (req, res) => {
    try {
        const { city } = req.query;
        const banners = await CatalogModel.getBanners(city);
        res.json({
            success: true,
            count: banners.length,
            banners
        });
    } catch (error) {
        console.error("getBanners Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Get all service categories
export const getCategories = asyncHandler(async (req, res) => {
    try {
        const { city } = req.query;
        const categories = await CatalogModel.getCategories(city);
        res.json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error("getCategories Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Get services list (with category, city, search, pagination)
export const getServices = asyncHandler(async (req, res) => {
    try {
        const { category, city, search, page = 1, limit = 20 } = req.query;
        const result = await CatalogModel.getServices({ category, city, search, page, limit });
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("getServices Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Get single service details by ID
export const getServiceById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const service = await CatalogModel.getServiceById(id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: `Service with ID ${id} not found`
            });
        }

        res.json({
            success: true,
            service
        });
    } catch (error) {
        console.error("getServiceById Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

