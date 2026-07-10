import express from "express";
import objectIdValidation from "../Middlewares/objectIdValidation.js";
import {
  completeFileUpload,
  deleteFile,
  getFile,
  initiateUploadFile,
  renameFile,
  // uploadFile,
} from "../Controllers/file.controller.js";

const router = express.Router();

router.param("id", objectIdValidation);
router.param("parentDirId", objectIdValidation);

router.post("/initiate{/:parentDirId}", initiateUploadFile);
router.post("/complete/:id", completeFileUpload);
router.get("/:id", getFile);
router.patch("/:id", renameFile);
router.delete("/:id", deleteFile);

export default router;
