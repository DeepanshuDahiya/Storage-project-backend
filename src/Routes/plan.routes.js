import express from "express";
import {
  createPlan,
  getPlans,
  importPlan,
  updatePlan,
} from "../Controllers/razorpayPlan.controller.js";

const router = express.Router();

// Fetch all plans from DB
router.get("/", getPlans);

// Fetch a plan from Razorpay
router.get("/import/:planId", importPlan);

// Save a plan to DB after fetching from Razorpay
router.post("/create", createPlan);

// Update plan details in DB
router.patch("/update/:id", updatePlan);

export default router;
