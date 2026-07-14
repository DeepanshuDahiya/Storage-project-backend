import express from "express";
import {
  getUser,
  permanentDeleteUser,
  recoverUser,
  softDeleteUser,
} from "../Controllers/handleUserByAdmin.controller.js";

const router = express.Router();

router.get("/", getUser);

router.delete("/soft", softDeleteUser);

router.delete("/permanent", permanentDeleteUser);

router.patch("/", recoverUser);

export default router;
