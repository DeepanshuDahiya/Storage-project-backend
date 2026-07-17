import express from "express";
import {
  findUserDetails,
  getSystemStats,
  makeAdmin,
  makeUser,
} from "../Controllers/superAdmin.controller.js";

const router = express.Router();

router.get("/user/:email", findUserDetails);

router.patch("/users/promote-user", makeAdmin);

router.patch("/users/demote-admin", makeUser);

router.get("/stats", getSystemStats);

export default router;
