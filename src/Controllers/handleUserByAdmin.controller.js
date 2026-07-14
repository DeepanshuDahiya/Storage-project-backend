import mongoose from "mongoose";
import Users from "../Models/user.model.js";
import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import { deleteFilesFromS3 } from "../Services/s3.service.js";
import { collectDeletionData } from "./directory.controller.js";

export const getUser = async (req, res, next) => {
  try {
    const { limit = 10, cursorId, search = "" } = req.query;

    const maxLimit = Math.min(Number(limit), 100);

    const filter = {};

    if (cursorId) {
      filter._id = { $lt: cursorId };
    }

    if (search.trim()) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const users = await Users.find(filter)
      .sort({
        _id: -1,
      })
      .limit(maxLimit + 1)
      .populate("rootDirId", "size")
      .lean();

    const usersWithStorage = users.map((user) => ({
      ...user,
      usedStorage: user.rootDirId?.size || 0,
      availableStorage: user.storageLimit - (user.rootDirId?.size || 0),
    }));

    let hasMore = users.length > maxLimit;
    if (hasMore) {
      users.pop();
    }

    let nextCursorId = null;
    if (users.length > 0) {
      const last = users[users.length - 1];
      nextCursorId = last._id;
    }

    console.log(usersWithStorage, users);

    return res.json({ users: usersWithStorage, nextCursorId, hasMore });
  } catch (error) {
    next(error);
  }
};

export const softDeleteUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await Users.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User with this email does not exists",
      });
    if (user.isDeleted)
      return res.status(404).json({
        success: false,
        message: "User is already soft delete",
      });

    if (user.role !== "user" || req.user.role !== "superAdmin") {
      return res.status(404).json({
        success: false,
        message: "User cannot be deleted",
      });
    }

    await Users.findOneAndUpdate({ email: email }, { isDeleted: true });

    return res.json({
      success: true,
      message: "Soft delete for User done successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const recoverUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await Users.findOneAndUpdate({ email }, { isDeleted: false });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User with this email does not exists",
      });

    return res.json({ success: true, message: "User recovered successfully" });
  } catch (error) {
    next(error);
  }
};

export const permanentDeleteUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { email } = req.body;

    const user = await Users.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User with this email does not exists",
      });

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deleted.",
      });
    }

    const allS3Keys = [];
    const dirIds = [];
    const fileIds = [];

    await collectDeletionData(
      user.rootDirId,
      Directories,
      allS3Keys,
      dirIds,
      fileIds,
    );

    await deleteFilesFromS3({ keys: allS3Keys });

    await session.startTransaction();

    await Files.deleteMany(
      {
        _id: { $in: fileIds },
      },
      { session },
    );

    await Directories.deleteMany(
      {
        _id: { $in: dirIds },
      },
      { session },
    );

    await Users.deleteOne({ _id: user._id }, { session });

    await session.commitTransaction();
    return res.json({ message: "User Permanently Deleted Successfully" });
  } catch (error) {
    console.error(error);
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    return res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};
