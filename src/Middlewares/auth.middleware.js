import { redis } from "../config/redis.js";
import Users from "../Models/user.model.js";

export const requireAuth = async (req, res, next) => {
  try {
    const sid = req.signedCookies.sid;
    if (!sid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let session = await redis.get(sid);

    if (!session) {
      res.clearCookie("sid");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = JSON.parse(session);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
