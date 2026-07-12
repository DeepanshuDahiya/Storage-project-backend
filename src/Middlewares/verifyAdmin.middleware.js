export const verifyAdmin = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ success: "false", message: "User is not logged in." });
  }

  if (user.role !== "admin") {
    return res
      .status(401)
      .json({ success: "false", message: "Not Authorized" });
  }

  next();
};
