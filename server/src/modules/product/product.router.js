import express from "express";
import { getProducts, getProductById } from "./product.controller.js";

const router = express.Router();

// 1. GET /api/v1/products
router.get("/", getProducts);

// 2. GET /api/v1/products/:id
router.get("/:id", getProductById);

export default router;
