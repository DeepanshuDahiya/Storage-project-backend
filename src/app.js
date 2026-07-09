import express from "express";
import dotenv from "dotenv/config";
import cookieParser from "cookie-parser";
import authRoutes from "./Routes/auth.routes.js";
import directoryRoutes from "./Routes/directory.routes.js";
import fileRoutes from "./Routes/file.routes.js";
import { errorHandler } from "./Middlewares/error.handler.js";
import { requireAuth } from "./Middlewares/auth.middleware.js";

const app = express();

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/directory", requireAuth, directoryRoutes);
app.use("/file", requireAuth, fileRoutes);

app.use(errorHandler);

export default app;
