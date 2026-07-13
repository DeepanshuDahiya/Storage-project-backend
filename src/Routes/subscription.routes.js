import express from "express";
import {
  createSubscription,
  verifySubscription,
} from "../Controllers/subscription.controller.js";

const router = express.Router();

router.post("/create", createSubscription);

router.post("/verify", verifySubscription);

export default router;
