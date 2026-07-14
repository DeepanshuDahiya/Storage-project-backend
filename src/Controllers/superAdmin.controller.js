import Directories from "../Models/directory.model.js";
import Files from "../Models/file.model.js";
import Users from "../Models/user.model.js";

export const makeAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "User is already an admin",
      });
    }

    if (user.role === "superAdmin") {
      return res.status(400).json({
        message: "Super admin role cannot be modified.",
      });
    }

    await Users.findOneAndUpdate({ _id: userId }, { role: "admin" });

    return res.json({
      message: "User promoted to admin successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const makeUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "user") {
      return res.status(400).json({
        message: "User is already have the role: user",
      });
    }

    if (user.role === "superAdmin") {
      return res.status(400).json({
        message: "Super admin role cannot be modified.",
      });
    }

    await Users.findOneAndUpdate({ _id: userId }, { role: "user" });

    return res.json({
      message: "User demoted to admin successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemStats = async (req, res) => {
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
            parentId: null,
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

    return res.json({
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
