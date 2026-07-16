import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import Users from "../Models/user.model.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";

export const makeAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await Users.findById(userId);

    if (!user) throw new AppError(404, "User not found");

    if (user.role === "admin")
      throw new AppError(403, "User is already an admin");
    if (user.role === "superAdmin")
      throw new AppError(403, "Super admin role cannot be modified");

    await Users.findOneAndUpdate({ _id: userId }, { role: "admin" });

    return sendResponse(res, 200, "User role updated to 'admin' successfully.");
  } catch (error) {
    next(error);
  }
};

export const makeUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await Users.findById(userId);

    if (!user) throw new AppError(404, "User not found");

    if (user.role === "user")
      throw new AppError(403, "User is already have the role: user");
    if (user.role === "superAdmin")
      throw new AppError(403, "Super admin role cannot be modified");

    await Users.findOneAndUpdate({ _id: userId }, { role: "user" });

    return sendResponse(res, 200, "User role updated to 'user' successfully.");
  } catch (error) {
    next(error);
  }
};

export const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalSuperAdmins,
      totalFiles,
      totalDirectories,
      storage,
    ] = await Promise.all([
      Users.countDocuments(),
      Users.countDocuments({ role: "admin" }),
      Users.countDocuments({ role: "superAdmin" }),
      Files.countDocuments(),
      Directories.countDocuments(),
      Directories.aggregate([
        {
          $match: {
            parentDiriD: null,
          },
        },
        {
          $group: {
            _id: null,
            totalStorageUsed: {
              $sum: "$size",
            },
          },
        },
      ]),
    ]);

    return sendResponse(res, 200, "Site statistics fetched successfully", {
      totalUsers,
      totalAdmins,
      totalSuperAdmins,
      totalFiles,
      totalDirectories,
      totalStorageUsed: storage[0]?.totalStorageUsed || 0,
    });
  } catch (error) {
    next(error);
  }
};
