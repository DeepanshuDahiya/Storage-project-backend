import { redis } from "../config/redis.js";
import Users from "../Models/user.model.js";
import AppError from "../Utils/AppError.js";

export const requireAuth = async (req, res, next) => {
  try {
    const sid = req.signedCookies.sid;
    if (!sid) throw new AppError(401, "User not logged in");

    let session = await redis.get(sid);
    if (!session) {
      res.clearCookie("sid");
      throw new AppError(401, "User not logged in");
    }

    const userData = JSON.parse(session);

    const { storageLimit, maxFileSize, subscriptionId, isDeleted } =
      await Users.findById(userData.userId)
        .select("isDeleted maxFileSize storageLimit subscriptionId")
        .populate("subscriptionId", "status");

    if (isDeleted)
      throw new AppError(401, "User is Deleted and cannot access the site");

    const subscriptionStatus = subscriptionId?.status;
    const user = { ...userData, storageLimit, maxFileSize, subscriptionStatus };

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
