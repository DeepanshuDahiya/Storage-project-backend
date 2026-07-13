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

export const handleParentDirSize = async (currentDirId, deltaSize, session) => {
  try {
    let parent = currentDirId;
    while (parent) {
      const currDir = await Directories.findOneAndUpdate(
        { _id: parent },
        { $inc: { size: deltaSize } },
        {
          session,
        },
      );
      parent = currDir.parentDirId;
    }
    return { success: true };
  } catch (error) {
    throw new Error(error);
  }
};

const deleteFileFromDB = async (fileId, userId, session) => {
  try {
    const fileResult = await Files.findOneAndDelete(
      {
        _id: fileId,
        userId: userId,
      },
      { session },
    );

    if (!fileResult) {
      return res.status(404).send("File not found");
    }

    const dirResult = await Directories.findOneAndUpdate(
      { _id: fileResult.parentDirId, userId: user.userId },
      {
        $pull: { files: fileResult._id },
      },
      { session },
    );
    return { fileResult, dirResult };
  } catch (error) {
    next(error);
  }
};

export const initiateUploadFile = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;

    const parentDirId = req.params.parentDirId || user.rootDirId;
    const { fileSize, filename, contentType } = req.body;

    if (!fileSize || !filename) {
      return res.status(400).json({
        success: "false",
        message: "FileSize, contentType and FileName are required.",
      });
    }

    const rootDir = await Directories.findById(user.rootDirId);
    const availableStorageLimit = user.storageLimit - rootDir.size;

    if (fileSize > availableStorageLimit || fileSize > user.maxFileSize) {
      // return res.destroy();
      return res.status(507).json({
        success: "false",
        message: "File size exceeds you storage limit.",
      });
    }

    const extension = path.extname(filename);
    if (!extension) {
      return res
        .status(400)
        .json({ success: "false", message: "File extension is required." });
    }
    const filenameWithoutExtension = filename.split(extension)[0];

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

    const parentFolder = await Directories.findOneAndUpdate(
      { _id: parentDirId },
      {
        $push: {
          files: fileId,
        },
      },
      { session },
    );

    const uploadSignedUrl = await createUploadSignedUrl({
      key: `${fileId}${extension}`,
      contentType,
    });

    await session.commitTransaction();
    return res.json({
      message: "File Uploaded initiated successfully",
      uploadUrl: uploadSignedUrl,
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

    if (!fileId) {
      return res
        .status(400)
        .json({ success: "false", message: "File Id is required" });
    }

    const file = await Files.findOne({
      _id: fileId,
      userId: user.userId,
      isUploading: true,
    });

    if (!file) {
      return res
        .status(404)
        .json({ success: "false", message: "File does not exists" });
    }

    await session.startTransaction();

    const filename = [`${file._id}${file.extension}`];
    const fileDetails = await getFileDetailsFromS3({ key: filename });

    if (fileDetails.status === 404) {
      await deleteFileFromDB(fileId, user.userId, session);
    }

    if (fileDetails.ContentLength !== file.size) {
      await deleteFilesFromS3({ keys: filename });
      await deleteFileFromDB(fileId, user.userId, session);

      return req
        .status(400)
        .json({ success: "false", message: "File size does not match" });
    }

    await Files.findOneAndUpdate(
      { _id: fileId, userId: user.userId },
      { $set: { isUploading: false } },
      { session },
    );

    const updateParentSize = await handleParentDirSize(
      file.parentDirId,
      file.size,
      session,
    );

    await session.commitTransaction();
    return res.json({ success: "true", message: "File upload completed" });
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

    if (!fileId) {
      return res
        .status(400)
        .json({ success: "false", message: "File Id is required." });
    }

    const file = await Files.findOne({ _id: fileId, userId: user.userId });
    if (!file)
      return res
        .status(404)
        .json({ success: "false", message: "File not found." });

    const awsFileName = `${file._id}${file.extension}`;

    const getSignedUrl = await createGetSignedUrl({
      key: awsFileName,
      action: fileAction,
      filename: file.name,
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

    if (!id || !newFilename) {
      return res
        .status(400)
        .json({ error: "File name and id both are required" });
    }

    const file = await Files.findOneAndUpdate(
      { _id: id, userId: user.userId },
      {
        $set: {
          name: `${newFilename}`,
        },
      },
    );
    if (!file) {
      return res.status(404).send("File not found");
    }

    return res.json({ message: "Name Updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  const session = await mongoose.startSession();
  await session.startTransaction();
  try {
    let { id } = req.params;

    const user = req.user;

    const { fileResult, DirResult } = await deleteFileFromDB(
      id,
      user.userId,
      session,
    );

    const updateParentSize = await handleParentDirSize(
      fileResult.parentDirId,
      -fileResult.size,
      session,
    );

    const s3FileName = [`${fileResult._id}${fileResult.extension}`];
    const delFile = await deleteMayFilesFromS3({ keys: s3FileName });

    await session.commitTransaction();
    res
      .status(200)
      .json({ success: "true", message: "File deleted successfully" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};
