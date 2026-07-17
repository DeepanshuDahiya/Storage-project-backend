import express from "express";
import dotenv from "dotenv/config";
import cookieParser from "cookie-parser";
import authRoutes from "./Routes/auth.routes.js";
import directoryRoutes from "./Routes/directory.routes.js";
import fileRoutes from "./Routes/file.routes.js";
import razorpayPlanRoutes from "./Routes/razorpayPlan.admin.routes.js";
import handleUsersByAdmin from "./Routes/handleUsers.admin.routes.js";
import SuperAdminRoutes from "./Routes/superAdmin.routes.js";
import subscriptionRoutes from "./Routes/subscription.routes.js";
import sharedFileRoutes from "./Routes/sharedFile.routes.js";
import userPlanRoutes from "./Routes/userPlans.routes.js";
import webhookRoutes from "./Routes/webhook.routes.js";
import { errorHandler } from "./Middlewares/error.handler.js";
import { requireAuth } from "./Middlewares/auth.middleware.js";
import { verifyRole } from "./Middlewares/verifyRole.js";
import Cors from "cors";
import "./cron/subscription.cron.js";
import "./cron/uploadCleanup.js";

const app = express();

app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(
  Cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use("/webhooks", webhookRoutes);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/directory", requireAuth, directoryRoutes);
app.use("/file", requireAuth, fileRoutes);
app.use("/subscriptions", requireAuth, subscriptionRoutes);
app.use("/share", sharedFileRoutes);
app.use("/users/plans", requireAuth, userPlanRoutes);

app.use(
  "/admin/plans",
  requireAuth,
  verifyRole("admin", "superAdmin"),
  razorpayPlanRoutes,
);
app.use(
  "/admin/users",
  requireAuth,
  verifyRole("admin", "superAdmin"),
  handleUsersByAdmin,
);

app.use("/superAdmin", requireAuth, verifyRole("superAdmin"), SuperAdminRoutes);

app.use(errorHandler);

export default app;
