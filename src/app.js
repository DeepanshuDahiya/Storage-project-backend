import express from "express";
import dotenv from "dotenv/config";
import cookieParser from "cookie-parser";
import authRoutes from "./Routes/auth.routes.js";
import { errorHandler } from "./Middlewares/error.handler.js";

const app = express();

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

app.use("/auth", authRoutes);

// app.use(errorHandler);

export default app;
