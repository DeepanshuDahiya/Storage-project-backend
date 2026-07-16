import Files from "../Models/file.model.js";
import SharedFiles from "../Models/shareFile.model.js";
import { createGetSignedUrl } from "../Services/s3.service.js";
import crypto from "crypto";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";
import bcrypt from "bcrypt";

export const createShareLink = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { fileId } = req.params;

    const file = await Files.findOne({
      _id: fileId,
      userId: req.user.userId,
    });

    if (!file) throw new AppError(400, "File Id is invalid");

    const existingShare = await SharedFiles.findOne({
      fileId: file._id,
      expiresAt: null,
    });

    if (existingShare)
      return sendResponse(res, 200, "share link already exists", {
        shareUrl: `${process.env.FRONTEND_URL}/share/${existingShare.token}`,
      });

    const token = crypto.randomBytes(20).toString("hex");

    const hashedPassword = password ? await bcrypt.hash(password, 8) : null;

    const share = await SharedFiles.create({
      fileId: file._id,
      owner: req.user.userId,
      token,
      expiresAt: null,
      password: hashedPassword,
    });

    return sendResponse(res, 200, "Created Share link", {
      shareUrl: `${process.env.FRONTEND_URL}/share/${share.token}`,
    });
  } catch (error) {
    next(error);
  }
};

export const modifyShareLink = async (req, res, next) => {
  try {
    const { sharedLinkId } = req.params;
    const { isActive, password } = req.body;

    if (!sharedLinkId) throw new AppError(400, "Shared link Id is required");

    const hashedPassword = password ? await bcrypt.hash(password, 8) : null;

    const share = await SharedFiles.findOneAndUpdate(
      { _id: sharedLinkId, owner: req.user.userId },
      { isActive, password: hashedPassword },
    );

    if (!share) throw new AppError(404, "Share link not found");

    return sendResponse(res, 200, "Link modified successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteSharedLink = async (req, res, next) => {
  try {
    const { sharedLinkId } = req.params;

    const result = await SharedFiles.deleteOne({
      _id: sharedLinkId,
      owner: req.user.userId,
    });

    if (result.deletedCount === 0) throw new AppError(404, "Link not found");

    return sendResponse(res, 200, "Share link deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const accessSharedFile = async (req, res, next) => {
  try {
    const fileAction =
      req.query.action === "download" ? "attachment" : "inline";

    const { password } = req.query;

    const share = await SharedFiles.findOne({
      token: req.params.token,
      isActive: true,
    });

    if (!share) throw new AppError(400, "File link is invalid");

    if (share.expiresAt && share.expiresAt < new Date())
      throw new AppError(400, "Shared link is expired");

    if (share.password) {
      const isPasswordValid = await bcrypt.compare(password, share.password);
      if (!isPasswordValid) throw new AppError(401, "Invalid password");
    }

    const file = await Files.findOne({
      _id: share.fileId,
    });

    if (!file) throw new AppError(404, "File not found");

    const awsFileName = `${file._id}${file.extension}`;

    const getFileSignedUrl = await createGetSignedUrl({
      key: awsFileName,
      action: fileAction,
      filename: file.name,
      expiresIn: 60 * 15,
    });

    return sendResponse(res, 200, "Share file found", {
      url: getFileSignedUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSharedLinksByUser = async (req, res, next) => {
  try {
    const sharedLinks = await SharedFiles.find({
      owner: req.user.userId,
    })
      .populate("fileId", "name size")
      .lean();

    return sendResponse(res, 200, "All shared links found", { sharedLinks });
  } catch (error) {
    next(error);
  }
};

export const accessSharedFileMetadata = async (req, res, next) => {
  try {
    const share = await SharedFiles.findOne({
      token: req.params.token,
      isActive: true,
    });

    if (!share) throw new AppError(400, "File link is invalid");

    const isPassRequired = Boolean(share.password);

    return sendResponse(
      res,
      200,
      "Shared link's metadata fetched successfully",
      { isPassRequired },
    );
  } catch (error) {
    next(error);
  }
};
