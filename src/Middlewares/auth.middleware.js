import { redis } from "../Config/redis.js";
import Users from "../Models/user.model.js";
import AppError from "../Utils/AppError.js";

export const requireAuth = async (req, res, next) => {
  try {
    const sid = req.signedCookies.sid;
    if (!sid) throw new AppError(401, "User not logged in");

    let session = await redis.get(`session:${sid}`);
    if (!session) {
      res.clearCookie("sid");
      throw new AppError(401, "User not logged in");
    }

    const userData = JSON.parse(session);

    const now = Date.now();

    if (userData.lastSeen < now + 1000 * 60 * 5) {
      userData.lastSeen = now;

      await redis.set(`session:${sid}`, JSON.stringify(userData), "KEEPTTL");
    }

    const { storageLimit, maxFileSize, subscriptionId, isDeleted, role } =
      await Users.findById(userData.userId)
        .select("isDeleted maxFileSize storageLimit subscriptionId role")
        .populate("subscriptionId", "status");

    if (isDeleted)
      throw new AppError(401, "User is Deleted and cannot access the site");

    const subscriptionStatus = subscriptionId?.status;
    const user = {
      ...userData,
      storageLimit,
      maxFileSize,
      subscriptionStatus,
      role,
    };

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
