import express from "express";
import {
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

router.post("/resend-otp-for-passReset", requireAuth, sendOtpForPassReset);
router.post("/verify-passReset", requireAuth, verifyOtpForPassReset);

export default router;
