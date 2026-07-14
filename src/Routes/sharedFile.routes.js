import express from "express";
import { requireAuth } from "../Middlewares/auth.middleware.js";
import {
  accessSharedFile,
  accessSharedFileMetadata,
  createShareLink,
  deleteSharedLink,
  getAllSharedLinksByUser,
  modifyShareLink,
} from "../Controllers/sharedFile.controller.js";

const router = express.Router();

router.get("/all", requireAuth, getAllSharedLinksByUser);

router.get("/:token", accessSharedFileMetadata);

router.get("/view/:token", accessSharedFile);

router.post("/:fileId", requireAuth, createShareLink);

router.patch("/:sharedLinkId", requireAuth, modifyShareLink);

router.delete("/:sharedLinkId", requireAuth, deleteSharedLink);

export default router;
