import express from "express";
import {
  cancelSubscription,
  createSubscription,
  currentSubscription,
  verifySubscription,
} from "../Controllers/subscription.controller.js";

const router = express.Router();

router.post("/create", createSubscription);

router.post("/verify", verifySubscription);

router.get("/current", currentSubscription);

router.patch("/cancel", cancelSubscription);

export default router;
