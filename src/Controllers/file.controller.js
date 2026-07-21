import path from "path";
import Files from "../Models/file.model.js";
import Directories from "../Models/directory.model.js";
import mongoose from "mongoose";
import {
  createGetSignedUrl,
  createUploadSignedUrl,
  deleteFilesFromS3,
  getFileDetailsFromS3,
} from "../Services/s3.service.js";
import { handleParentDirSize } from "../Services/directory.service.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";
import {
  initiateUploadBodySchema,
  initiateUploadParamsSchema,
} from "../validation/file.validation.js";
import SharedFiles from "../Models/shareFile.model.js";

const deleteFileFromDB = async (fileId, userId, session) => {
  const fileResult = await Files.findOneAndDelete(
    {
      _id: fileId,
      userId: userId,
    },
    { session },
  );
  if (!fileResult) throw new AppError(404, "File not found");

  const dirResult = await Directories.findOneAndUpdate(
    { _id: fileResult.parentDirId, userId: userId },
    {
      $pull: { files: fileResult._id },
    },
    { session },
  );
  return { fileResult, dirResult };
};

export const initiateUploadFile = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;

    const { filename, contentType, fileSize } =
      await initiateUploadBodySchema.parseAsync(req.body);

    let { parentDirId } = await initiateUploadParamsSchema.parseAsync(
      req.params,
    );
    parentDirId ??= user.rootDirId;

    const extension = path.extname(filename);
    if (!extension) throw new AppError(400, "File extension is required.");

    const filenameWithoutExtension = path.basename(filename, extension);

    const rootDir = await Directories.findById(user.rootDirId);
    const availableStorageLimit = user.storageLimit - rootDir.size;

    if (fileSize > availableStorageLimit || fileSize > user.maxFileSize)
      throw new AppError(507, "File size exceeds you storage limit.");

    await session.startTransaction();

    const [fileResult] = await Files.create(
      [
        {
          name: filenameWithoutExtension,
          extension,
          parentDirId,
          userId: user.userId,
          size: Number(fileSize),
          isUploading: true,
        },
      ],
      { session },
    );
    const fileId = fileResult._id;

    await Directories.findOneAndUpdate(
      { _id: parentDirId },
      {
        $push: {
          files: fileId,
        },
      },
      { session },
    );

    await handleParentDirSize(file.parentDirId, file.size, session);

    const uploadSignedUrl = await createUploadSignedUrl({
      key: `${fileId}${extension}`,
      contentType,
    });

    await session.commitTransaction();

    return sendResponse(res, 200, "File Uploaded initiated successfully", {
      uploadUrl: uploadSignedUrl,
      fileId,
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

export const completeFileUpload = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;
    const fileId = req.params.id;

    if (!fileId) throw new AppError(400, "File Id is required");
    const file = await Files.findOne({
      _id: fileId,
      userId: user.userId,
      isUploading: true,
    });

    if (!file) throw new AppError(404, "File does not exists");

    await session.startTransaction();

    const filename = `${file._id}${file.extension}`;
    const fileDetails = await getFileDetailsFromS3({ key: filename });

    if (fileDetails.status === 404) {
      await deleteFileFromDB(fileId, user.userId, session);
      throw new AppError(404, "Uploaded file not found on S3");
    }

    if (fileDetails.ContentLength !== file.size) {
      await deleteFilesFromS3({ keys: filename });
      await deleteFileFromDB(fileId, user.userId, session);
      await handleParentDirSize(file.parentDirId, -file.size, session);
      await session.commitTransaction();

      return sendResponse(res, 400, "File size does not match");
    }

    await Files.findOneAndUpdate(
      { _id: fileId, userId: user.userId },
      { $set: { isUploading: false } },
      { session },
    );

    await session.commitTransaction();
    return sendResponse(res, 201, "File uploaded successfully");
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};

export const getFile = async (req, res, next) => {
  try {
    const user = req.user;
    const fileId = req.params.id;
    const fileAction =
      req.query.action === "download" ? "attachment" : "inline";

    if (!fileId) throw new AppError(400, "File Id is required");

    const file = await Files.findOne({ _id: fileId, userId: user.userId });
    if (!file) throw new AppError(404, "File not found");

    const awsFileName = `${file._id}${file.extension}`;

    const getSignedUrl = await createGetSignedUrl({
      key: awsFileName,
      action: fileAction,
      filename: file.name,
      expiresIn: 60 * 5,
    });

    res.redirect(getSignedUrl);
  } catch (error) {
    next(error);
  }
};

export const renameFile = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const newFilename = req.body.newFilename;

    if (!id || !newFilename)
      throw new AppError(400, "File name and Id both are required");

    const file = await Files.findOneAndUpdate(
      { _id: id, userId: user.userId },
      {
        $set: {
          name: `${newFilename}`,
        },
      },
    );
    if (!file) throw new AppError(404, "File not found");

    return sendResponse(res, 200, "File name updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  const session = await mongoose.startSession();
  await session.startTransaction();
  try {
    let { id } = req.params;
    if (!id) throw new AppError(400, "File Id is required");

    const user = req.user;

    const file = await Files.findById(id);
    if (!file) throw new AppError(404, "File not found");

    const s3FileName = [`${file._id}${file.extension}`];

    await deleteFilesFromS3({ keys: s3FileName });
    await deleteFileFromDB(id, user.userId, session);
    await handleParentDirSize(file.parentDirId, -file.size, session);

    await SharedFiles.deleteOne({ fileId: id });

    await session.commitTransaction();

    return sendResponse(res, 200, "File deleted successfully");
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};
