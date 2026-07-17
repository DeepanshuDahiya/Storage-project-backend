import express from "express";
import {
  getCurrentUser,
  login,
  logout,
  registerUser,
  resendEmailVerificationOtp,
  sendOtpForPassReset,
  verifyEmailByOtp,
  verifyOtpForPassReset,
} from "../Controllers/auth.controller.js";
import { requireAuth } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", login);
router.post("/logout", requireAuth, logout);

router.post("/resend-otp-for-email", resendEmailVerificationOtp);
router.post("/verify-email", verifyEmailByOtp);

router.get("/me", requireAuth, getCurrentUser);

router.post("/resend-otp-for-passReset", sendOtpForPassReset);
router.post("/verify-passReset", verifyOtpForPassReset);

export default router;
