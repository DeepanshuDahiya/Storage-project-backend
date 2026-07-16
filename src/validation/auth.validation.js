import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters")
  .max(50, "Name cannot exceed 50 characters");

const email = z.email("Enter a valid email").trim().toLowerCase();

const password = z
  .string()
  .trim()
  .min(8, "Password must contain at least 8 characters")
  .max(100, "Password cannot exceed 100 characters");

const confirmPassword = z.string();

const otp = z.string().trim().regex(/^\d+$/, "OTP must contain only digits");

// -------------------------------------------------
// -------------------------------------------------

export const registerSchema = z
  .object({
    name,
    email,
    password,
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z
  .object({
    email,
    password,
  })
  .strict();

export const resendEmailVerificationOtpSchema = z
  .object({
    email,
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    email,
    otp,
  })
  .strict();

export const sendPasswordResetOtpSchema = z
  .object({
    email,
  })
  .strict();

export const verifyPasswordResetSchema = z
  .object({
    email,
    otp,
    password,
  })
  .strict();
