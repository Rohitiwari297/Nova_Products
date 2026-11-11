import express from "express";
import {
    getCities,
    getBanners,
    getCategories,
    getServices,
    getServiceById
} from "./catalog.controller.js";

const router = express.Router();

// 1. Operational Cities
router.get("/cities", getCities);

// 2. Promotional Banners
router.get("/banners", getBanners);

// 3. Service Categories
router.get("/categories", getCategories);

// 4. Services list with filters (?category=...&city=...&search=...&page=...&limit=...)
router.get("/services", getServices);

// 5. Single service details by ID
router.get("/services/:id", getServiceById);

export default router;
