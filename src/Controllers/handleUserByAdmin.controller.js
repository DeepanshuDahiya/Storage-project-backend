import mongoose from "mongoose";
import Users from "../Models/user.model.js";
import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import { deleteFilesFromS3 } from "../Services/s3.service.js";
import { collectDeletionData } from "../Services/directory.service.js";
import sendResponse from "../Utils/sendResponse.js";
import AppError from "../Utils/AppError.js";

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

    let hasMore = users.length > maxLimit;
    if (hasMore) {
      users.pop();
    }

    const usersWithStorage = users.map((user) => ({
      ...user,
      usedStorage: user.rootDirId?.size || 0,
      availableStorage: user.storageLimit - (user.rootDirId?.size || 0),
    }));

    let nextCursorId = null;
    if (users.length > 0) {
      const last = users[users.length - 1];
      nextCursorId = last._id;
    }

    return sendResponse(res, 200, "Users fetched successfully", {
      users: usersWithStorage,
      nextCursorId,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

export const softDeleteUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await Users.findOne({ email });
    if (!user) throw new AppError(404, "User with this email does not exists");

    if (user.isDeleted) throw new AppError(400, "User is already soft deleted");

    if (user.role !== "user" || req.user.role !== "superAdmin")
      throw new AppError(
        400,
        "Admin cannot delete other admins and Super-admin",
      );

    await Users.findOneAndUpdate({ email: email }, { isDeleted: true });

    return sendResponse(res, 200, "Soft delete for User done successfully");
  } catch (error) {
    next(error);
  }
};

export const recoverUser = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await Users.findOneAndUpdate({ email }, { isDeleted: false });
    if (!user) throw new AppError(404, "User with this email does not exists");

    return sendResponse(res, 200, "User recovered successfully");
  } catch (error) {
    next(error);
  }
};

export const permanentDeleteUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { email } = req.body;

    const user = await Users.findOne({ email });
    if (!user) throw new AppError(404, "User with this email does not exists");

    if (user.role !== "user" || req.user.role !== "superAdmin")
      throw new AppError(
        400,
        "Admin cannot delete other admins and Super-admin",
      );

    const allS3Keys = [];
    const dirIds = [];
    const fileIds = [];

    await collectDeletionData(user.rootDirId, allS3Keys, dirIds, fileIds);

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

    return sendResponse(res, 200, "User Permanently Deleted Successfully");
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};
