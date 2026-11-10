import express from "express";
import { connectDB } from "./config/db_conn.js";
import { config } from "./config/config.js";

const app = express();

// Database connect karein
connectDB();

app.use(express.json());



export default app;