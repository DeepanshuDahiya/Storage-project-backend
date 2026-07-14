import { redis } from "../config/redis.js";
import Users from "../Models/user.model.js";

export const requireAuth = async (req, res, next) => {
  try {
    const sid = req.signedCookies.sid;
    if (!sid) {
      return res.status(401).json({ error: "User not logged in" });
    }

    let session = await redis.get(sid);

    if (!session) {
      res.clearCookie("sid");
      return res.status(401).json({ error: "User not logged in" });
    }

    const userData = JSON.parse(session);

    const { storageLimit, maxFileSize, subscriptionId, isDeleted } =
      await Users.findById(userData.userId)
        .select("isDeleted maxFileSize storageLimit subscriptionId")
        .populate("subscriptionId", "status");

    if (isDeleted) {
      return res.status(401).json({
        success: "false",
        message: "User is Deleted and cannot access the site",
      });
    }

    const subscriptionStatus = subscriptionId?.status;

    const user = { ...userData, storageLimit, maxFileSize, subscriptionStatus };

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
