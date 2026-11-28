import { asyncHandler } from "../../utils/asyncHandler.js";
import { ProductModel } from "../../models/products.model.js";

// GET /api/v1/products (with ?search=...&page=...&limit=...)
export const getProducts = asyncHandler(async (req, res) => {
    try {
        const { search, page, limit } = req.query;
        const result = await ProductModel.getAllProducts({ search, page, limit });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("getProducts Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/products/:id
export const getProductById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.getProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product with ID ${id} not found`
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error("getProductById Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
