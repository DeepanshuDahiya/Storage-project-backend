import mongoose from "mongoose";
import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import { deleteFilesFromS3 } from "../Services/s3.service.js";
import sendResponse from "../Utils/sendResponse.js";
import AppError from "../Utils/AppError.js";
import {
  collectDeletionData,
  handleParentDirSize,
} from "../Services/directory.service.js";
import {
  createDirectoryBodySchema,
  createDirectoryParamsSchema,
  deleteDirectoryParamsSchema,
  getDirectoryParamsSchema,
  renameDirectoryBodySchema,
  renameDirectoryParamsSchema,
} from "../validation/directory.validation.js";

export const createDirectory = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;

    const { dirName } = await createDirectoryBodySchema.parseAsync(req.body);
    let { parentDirId } = await createDirectoryParamsSchema.parseAsync(
      req.params,
    );
    parentDirId ??= user.rootDirId;

    await session.startTransaction();

    const [dirResult] = await Directories.create(
      [
        {
          name: dirName,
          parentDirId,
          userId: user.userId,
          files: [],
          directories: [],
        },
      ],
      { session },
    );

    await Directories.findOneAndUpdate(
      { _id: parentDirId },
      {
        $push: {
          directories: dirResult._id,
        },
      },
      { session },
    );

    await session.commitTransaction();

    return sendResponse(res, 201, "Folder created successfully", {
      dirId: dirResult._id,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};

export const getDir = async (req, res, next) => {
  try {
    const user = req.user;
    let { dirId } = await getDirectoryParamsSchema.parseAsync(req.params);
    dirId ??= user.rootDirId;

    let dirData = await Directories.findOne({
      _id: dirId,
      userId: user.userId,
    })
      .populate("files")
      .populate("directories")
      .lean();

    if (!dirData) throw new AppError(404, "Folder not found");

    return sendResponse(res, 200, "Folder Data", { dirData });
  } catch (error) {
    next(error);
  }
};

export const renameDir = async (req, res, next) => {
  try {
    const user = req.user;
    const { name } = await renameDirectoryBodySchema.parseAsync(req.body);
    const { id } = await renameDirectoryParamsSchema.parseAsync(req.params);

    const result = await Directories.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { name } },
    );

    if (!result) throw new AppError(404, "Folder not found");

    return sendResponse(res, 200, "Folder name updated");
  } catch (err) {
    next(err);
  }
};

export const deleteDir = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;
    const { id } = await deleteDirectoryParamsSchema.parseAsync(req.params);

    if (id == user.rootDirId)
      throw new AppError(400, "Root Folder cannot be deleted");

    const dir = await Directories.findOne({
      _id: id,
      userId: user.userId,
    });

    if (!dir) throw new AppError(404, "Folder not found");

    if (!dir.parentDirId) throw new AppError(400, "Cannot delete Root Folder");

    const allS3Keys = [];
    const dirIds = [];
    const fileIds = [];

    await collectDeletionData(id, allS3Keys, dirIds, fileIds);

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

    await Directories.findOneAndUpdate(
      { _id: dir.parentDirId },
      {
        $pull: { directories: dir._id },
      },
      { session },
    );

    await handleParentDirSize(dir.parentDirId, -dir.size, session);

    await session.commitTransaction();
    return sendResponse(res, 200, "Folder deleted successfully");
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};
