import { z } from "zod";

// ----------------------------
// Reusable
// ----------------------------

export const filename = z
  .string()
  .trim()
  .min(1, "Filename is required")
  .max(255, "Filename is too long");

export const contentType = z.string().trim().min(1, "Content-Type is required");

export const fileSize = z
  .number({
    error: "File size must be a number",
  })
  .positive("File size must be greater than 0");

export const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

// ------------------------------------------------------
// ------------------------------------------------------

export const initiateUploadBodySchema = z
  .object({
    filename,
    contentType,
    fileSize,
  })
  .strict();

export const initiateUploadParamsSchema = z
  .object({
    parentDirId: objectId.optional(),
  })
  .strict();
