import express from "express";
import {
  createDirectory,
  deleteDir,
  getDir,
  renameDir,
} from "../Controllers/directory.controller.js";
import objectIdValidation from "../Middlewares/objectIdValidation.js";

const router = express.Router();

router.param("id", objectIdValidation);
router.param("parentDirId", objectIdValidation);
router.param("dirId", objectIdValidation);

// Create Directory
router.post("{/:parentDirId}", createDirectory);

// View Directory
router.get("{/:dirId}", getDir);

// Rename Directory
router.patch("{/:id}", renameDir);

// Delete Directory
router.delete("{/:id}", deleteDir);

export default router;
