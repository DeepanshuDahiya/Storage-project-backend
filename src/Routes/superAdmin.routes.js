import express from "express";
import {
  getSystemStats,
  makeAdmin,
  makeUser,
} from "../Controllers/superAdmin.controller.js";

const router = express.Router();

router.patch("/users/promote-user", makeAdmin);

router.patch("/users/demote-admin", makeUser);

router.get("/stats", getSystemStats);

export default router;
