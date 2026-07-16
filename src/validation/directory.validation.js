import { z } from "zod";

export const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ObjectId");

export const directoryName = z
  .string()
  .trim()
  .min(1, "Directory name is required")
  .max(100, "Directory name cannot exceed 100 characters");

// ------------------------------------------------------
// ------------------------------------------------------

export const createDirectoryBodySchema = z
  .object({
    dirName: directoryName,
  })
  .strict();

export const createDirectoryParamsSchema = z
  .object({
    parentDirId: objectId.optional(),
  })
  .strict();

export const renameDirectoryBodySchema = z
  .object({
    name: directoryName,
  })
  .strict();

export const renameDirectoryParamsSchema = z
  .object({
    id: objectId,
  })
  .strict();

export const deleteDirectoryParamsSchema = z
  .object({
    id: objectId,
  })
  .strict();

export const getDirectoryParamsSchema = z
  .object({
    dirId: objectId.optional(),
  })
  .strict();
