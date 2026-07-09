import express from "express";
import objectIdValidation from "../Middlewares/objectIdValidation.js";
import {
  deleteFile,
  getFile,
  renameFile,
  uploadFile,
} from "../Controllers/file.controller.js";

const router = express.Router();

router.param("id", objectIdValidation);
router.param("parentDirId", objectIdValidation);

router.post("{/:parentDirId}", uploadFile);
router.get("/:id", getFile);
router.patch("/:id", renameFile);
router.delete("/:id", deleteFile);

export default router;
