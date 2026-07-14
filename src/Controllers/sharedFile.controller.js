import Files from "../Models/file.model.js";
import SharedFiles from "../Models/shareFile.model.js";
import { createGetSignedUrl } from "../Services/s3.service.js";
import crypto from "crypto";

export const createShareLink = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { fileId } = req.params;

    const file = await Files.findOne({
      _id: fileId,
      userId: req.user.userId,
    });

    if (!file)
      return res
        .status(404)
        .json({ success: "false", message: "File Id is invalid" });

    const existingShare = await SharedFiles.findOne({
      fileId: file._id,
      expiresAt: null,
    });

    if (existingShare) {
      return res.status(200).json({
        success: true,
        message: "share link already exists",
        data: {
          shareUrl: `${process.env.FRONTEND_URL}/share/${existingShare.token}`,
        },
      });
    }

    const token = crypto.randomBytes(20).toString("hex");

    const share = await SharedFiles.create({
      fileId: file._id,
      owner: req.user.userId,
      token,
      expiresAt: null,
      password,
    });

    return res.json({
      success: true,
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

    await SharedFiles.findOneAndUpdate(
      { _id: sharedLinkId, owner: req.user.userId },
      { isActive, password },
    );
    res.json({ success: true, message: "Link modified successfully." });
  } catch (error) {
    next(error);
  }
};

export const deleteSharedLink = async (req, res, next) => {
  try {
    const { sharedLinkId } = req.params;

    const isDeleted = await SharedFiles.deleteOne({
      _id: sharedLinkId,
      owner: req.user.userId,
    });

    if (!isDeleted)
      return res.status(404).json({ success: true, message: "Link not found" });

    return res.json({ success: true, message: "Link deleted successfully" });
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

    if (!share)
      return res
        .status(404)
        .json({ success: "false", message: "File link is invalid" });

    if (share.expiresAt && share.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ success: "false", message: "shared File link is expired" });
    }

    if (share.password && share.password !== password) {
      return res
        .status(401)
        .json({ success: "false", message: "Invalid password" });
    }

    const file = await Files.findOne({
      _id: share.fileId,
    });

    if (!file)
      return res
        .status(404)
        .json({ success: "false", message: "File not found." });

    const awsFileName = `${file._id}${file.extension}`;

    const getSignedUrl = await createGetSignedUrl({
      key: awsFileName,
      action: fileAction,
      filename: file.name,
      expiresIn: 600,
    });

    // res.redirect(getSignedUrl);
    return res.json({
      success: true,
      url: getSignedUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSharedLinksByUser = async (req, res, next) => {
  try {
    const sharedLinks = await SharedFiles.find({ owner: req.user.userId });
    if (!sharedLinks) {
      return res.json({ message: "No active shared Links found" });
    }
    return res.json({ sharedLinks });
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

    if (!share)
      return res
        .status(404)
        .json({ success: "false", message: "File link is invalid" });

    const isPassRequired = share.password ? true : false;
    return res.json({ isPassRequired });
  } catch (error) {
    next(error);
  }
};
