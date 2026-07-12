import mongoose from "mongoose";
import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import { handleParentDirSize } from "./file.controller.js";
import { deleteFilesFromS3 } from "../Services/s3.service.js";

export const createDirectory = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { dirName } = req.body;

    const user = req.user;

    const parentDirId = req.params.parentDirId
      ? req.params.parentDirId
      : user.rootDirId;

    await session.startTransaction();

    const [dirResult] = await Directories.create(
      [
        {
          name: dirName || "Untitled",
          parentDirId,
          userId: user.userId,
          files: [],
          directories: [],
        },
      ],
      { session },
    );

    const parentFolder = await Directories.findOneAndUpdate(
      { _id: parentDirId },
      {
        $push: {
          directories: dirResult._id,
        },
      },
      { session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: "true",
      message: "Folder created",
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
  const user = req.user;
  const dirId = req.params.dirId || user.rootDirId;

  try {
    let dirData = await Directories.findOne({ _id: dirId, userId: user.userId })
      // .fineOneById({ _id: new ObjectId(id) })
      .populate("files")
      .populate("directories")
      .lean();

    if (!dirData) {
      return res.status(404).json({ error: "Directory not found" });
    }

    return res.status(200).json(dirData);
  } catch (error) {
    next(error);
  }
};

export const renameDir = async (req, res, next) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const name = req.body.name || "Untitled";

    if (!id) {
      id = user.rootDirId;
    }

    const result = await Directories.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { $set: { name } },
    );

    if (!result) {
      return res.status(404).json({ error: "Folder not found" });
    }

    res.json({ success: "true", message: "Folder name updated" });
  } catch (err) {
    next(err);
  }
};

export const deleteDir = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const user = req.user;

    if (!id || id == user.rootDirId) {
      return res
        .status(400)
        .json({ success: "false", message: "Valid Dir Id is required." });
    }

    const dir = await Directories.findOne({
      _id: id,
      userId: user.userId,
    });

    if (!dir) {
      return res.status(404).json({ error: "Directory not found" });
    }
    if (!dir.parentDirId) {
      return res.status(404).json({ error: "Cannot delete Root Directory" });
    }

    await session.startTransaction();

    const allS3Keys = [];

    await delDir(id, Directories, Files, session, allS3Keys);

    const delResult = await deleteMayFilesFromS3({ keys: allS3Keys });

    const updateParentSize = await handleParentDirSize(
      dir.parentDirId,
      -dir.size,
      session,
    );

    await session.commitTransaction();
    return res.json({ message: "Folder Deleted Successfully", allFileIds });
  } catch (error) {
    console.error(error);
    if (session.inTransaction()) {
      await session.abortTransaction;
    }
    return res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
};

// delete directory Recursive function
async function delDir(id, Directories, Files, session, allS3Keys) {
  const currFolder = await Directories.findById(id).populate(
    "files",
    "_id extension",
  );
  if (!currFolder) return;

  //  delete child folders recursively
  if (currFolder.directories.length) {
    for (const childId of currFolder.directories) {
      await delDir(childId, Directories, Files, session, allS3Keys);
    }
  }

  //  delete all files in ONE query
  if (currFolder.files.length > 0) {
    const filesToBeDeleted = currFolder.files.map(
      (file) => `${file._id}${file.extension}`,
    );
    allS3Keys.push(...filesToBeDeleted);

    await Files.deleteMany(
      {
        _id: { $in: currFolder.files },
      },
      { session },
    );
  }

  //  remove from parent
  if (currFolder.parentDirId) {
    await Directories.findOneAndUpdate(
      { _id: currFolder.parentDirId },
      {
        $pull: { directories: id },
      },
      { session },
    );
  }

  //  delete current folder
  await Directories.findOneAndDelete({ _id: id }, { session });
}
