export const verifyAdmin = async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin") {
    return res
      .status(403)
      .json({ success: "false", message: "Not Authorized" });
  }

  next();
};
