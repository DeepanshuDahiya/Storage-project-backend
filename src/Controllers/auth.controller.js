import mongoose from "mongoose";
import {
  loginSchema,
  registerSchema,
  resendEmailVerificationOtpSchema,
  sendPasswordResetOtpSchema,
  verifyEmailSchema,
  verifyPasswordResetSchema,
} from "../validation/auth.validation.js";
import { sendOtp, verifyOtp } from "../Services/otp.service.js";
import Directories from "../Models/directory.model.js";
import bcrypt from "bcrypt";
import Users from "../Models/user.model.js";
import { redis } from "../config/redis.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";

const otpTypes = {
  email_verification: "email-verification",
  password_reset: "password-reset",
};

export const registerUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { name, email, password } = await registerSchema.parseAsync(req.body);

    const hashedPassword = await bcrypt.hash(password, 10);

    await session.startTransaction();

    const userId = new mongoose.Types.ObjectId();
    const rootDirId = new mongoose.Types.ObjectId();

    const [user] = await Users.create(
      [
        {
          _id: userId,
          name,
          email,
          password: hashedPassword,
          rootDirId,
        },
      ],
      { session },
    );

    const [rootDir] = await Directories.create(
      [
        {
          _id: rootDirId,
          userId,
        },
      ],
      { session },
    );

    await sendOtp({
      email,
      userName: name,
      purpose: otpTypes.email_verification,
    });

    await session.commitTransaction();

    return sendResponse(
      res,
      201,
      "User created Successfully, now verify the user.",
    );
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    if (error.code === 11000) {
      throw new AppError(409, "Email already exists");
    } else {
      next(error);
    }
  } finally {
    session.endSession();
  }
};

export const resendEmailVerificationOtp = async (req, res, next) => {
  try {
    const { email } = await resendEmailVerificationOtpSchema.parseAsync(
      req.body,
    );

    const user = await Users.findOne({ email });
    if (!user) throw new AppError(400, "User does not exists");

    if (user.isEmailVerified)
      throw new AppError(400, "User is already verified");

    await sendOtp({
      email,
      userName: user.name,
      purpose: otpTypes.email_verification,
    });

    return sendResponse(res, 200, "OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

export const verifyEmailByOtp = async (req, res, next) => {
  try {
    const { otp, email } = await verifyEmailSchema.parseAsync(req.body);

    await verifyOtp({ email, otp, purpose: otpTypes.email_verification });

    await Users.findOneAndUpdate({ email }, { isEmailVerified: true });

    return sendResponse(res, 200, "User verified successfully");
  } catch (error) {
    next(error);
  }
};

export const sendOtpForPassReset = async (req, res, next) => {
  try {
    const { email } = await sendPasswordResetOtpSchema.parseAsync(req.body);

    const user = await Users.findOne({ email });

    if (!user) throw new AppError(400, "User does not exists");

    await sendOtp({
      email,
      userName: user.name,
      purpose: otpTypes.password_reset,
    });

    return sendResponse(res, 200, "OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

export const verifyOtpForPassReset = async (req, res, next) => {
  try {
    const { otp, email, password } = await verifyPasswordResetSchema.parseAsync(
      req.body,
    );

    await verifyOtp({ email, otp, purpose: otpTypes.password_reset });

    const hashedPassword = await bcrypt.hash(password, 10);

    await Users.findOneAndUpdate({ email }, { password: hashedPassword });

    return sendResponse(res, 200, "Password changed successfully");
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = await loginSchema.parseAsync(req.body);

    if (req.signedCookies.sid)
      return sendResponse(res, 400, "User already logged-in");

    const user = await Users.findOne({ email }).select("+password").lean();

    if (!user) throw new AppError(401, "Invalid Credentials");

    if (!user.isEmailVerified)
      throw new AppError(
        400,
        "Verify the user's E-mail to log into the account.",
      );

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) throw new AppError(401, "Invalid Credentials");

    let sid = new mongoose.Types.ObjectId().toString();

    await redis.set(
      sid,
      JSON.stringify({
        userId: user._id,
        email: user.email,
        storageLimit: user.storageLimit,
        rootDirId: user.rootDirId,
        role: user.role,
      }),
      "ex",
      60 * 60 * 24 * 30,
    );

    res.cookie("sid", sid, {
      httpOnly: true,
      signed: true,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return sendResponse(res, 200, "User logged in successfully");
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await redis.del(req.signedCookies.sid);
    res.clearCookie("sid");

    return sendResponse(res, 200, "User logged out successfully");
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const userDetails = await Users.findById(req.user.userId).populate(
      "rootDirId",
      "size",
    );

    return sendResponse(res, 200, "User fetched successfully", { userDetails });
  } catch (error) {
    next(error);
  }
};
