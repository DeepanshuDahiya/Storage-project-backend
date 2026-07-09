import path from "path";
import Files from "../Models/file.model.js";
import Directories from "../Models/directory.model.js";
import mongoose from "mongoose";

export const uploadFile = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const user = req.user;

    const parentDirId = req.params.parentDirId || user.rootDirId;

    const { filename } = req.body;
    if (!filename) {
      return res
        .status(400)
        .json({ success: "false", message: "File name is required." });
    }

    const extension = path.extname(filename);
    if (!extension) {
      return res
        .status(400)
        .json({ success: "false", message: "File extension is required." });
    }
    const filenameWithoutExtension = filename.split(extension)[0];

    await session.startTransaction();

    const fileResult = await Files.create(
      {
        name: filenameWithoutExtension,
        extension,
        parentDirId,
        userId: user.userId,
      },
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
    //upload to cloud here
    await session.commitTransaction();
    return res.json({ message: "File Uploaded successfully" });
  } catch (error) {
    if (session.inTransaction) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};

export const getFile = async (req, res, next) => {
  try {
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

    const fileResult = await Files.findOneAndDelete(
      {
        _id: id,
        userId: user.userId,
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
    console.log(dirResult, fileResult);

    await session.commitTransaction();
    res
      .status(200)
      .json({ success: "true", message: "File deleted successfully" });
  } catch (error) {
    if (session.inTransaction) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    await session.endSession();
  }
};
