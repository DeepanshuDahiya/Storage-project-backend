import mongoose from "mongoose";
import { registerSchema } from "../validation/auth.validation.js";
import emailQueue from "../Queues/email.queue.js";
import crypto from "crypto";
import { sendVerificationOtp } from "../Services/otp.service.js";
import Directories from "../Models/directory.model.js";
import bcrypt from "bcrypt";
import Users from "../Models/user.model.js";
import { redis } from "../config/redis.js";

const otpTypes = {
  email_verification: "email-verification",
  password_reset: "password-reset",
};

export const registerUser = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const parsedInput = await registerSchema.parseAsync(req.body);
    const { name, email, password } = parsedInput;

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

    const response = await sendVerificationOtp({
      email,
      userName: name,
      queueName: "email-queue",
      purpose: otpTypes.email_verification,
    });

    if (response.error) {
      throw new Error(response.error);
    }
    await session.commitTransaction();
    return res
      .status(201)
      .json({ message: "User created Successfully, now verify the user." });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    if (error.code === 11000) {
      next("Email already exists");
    } else {
      next(error);
    }
  } finally {
    session.endSession;
  }
};

export const verifyEmailByOtp = async (req, res, next) => {
  const { otp, email } = req.body;

  if (!otp || !email)
    return res
      .status(400)
      .json({ success: "false", message: "valid OTP is required." });

  try {
    const generatedOtp = await redis.get(
      `otp:${otpTypes.email_verification}:${email}`,
    );

    if (!generatedOtp) {
      return res
        .status(500)
        .json({ success: "false", message: "OTP is invalid." });
    }

    if (otp !== generatedOtp) {
      return res
        .status(400)
        .json({ success: "false", message: "OTP is invalid." });
    }

    await Users.findOneAndUpdate({ email }, { isEmailVerified: true });

    await redis.del(`otp:${otpTypes.email_verification}:${email}`);

    return res
      .status(200)
      .json({ success: "true", message: "User verified successfully" });
  } catch (error) {
    next(error);
  }
};

export const resendEmailVerificationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await Users.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User does not exists" });
    }

    if (user.isEmailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "User is already verified" });
    }

    const response = await sendVerificationOtp({
      email,
      userName: user.name,
      queueName: "email-queue",
      purpose: otpTypes.email_verification,
    });

    if (response.error) {
      throw new Error(response.error);
    }
  } catch (error) {
    next(error);
  }
};

export const sendOtpForPassReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await Users.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User does not exists" });
    }

    const response = await sendVerificationOtp({
      email,
      userName: user.name,
      queueName: "email-queue",
      purpose: otpTypes.password_reset,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return res
      .status(200)
      .json({ success: "true", message: "OTP sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const verifyOtpForPassReset = async (req, res, next) => {
  const { otp, email, newPass } = req.body;

  if (!newPass) {
    return res
      .status(400)
      .json({ success: "false", message: "Enter a valid new password" });
  }

  if (!otp || !email)
    return res
      .status(400)
      .json({ success: "false", message: "valid OTP and Email is required." });

  try {
    const generatedOtp = await redis.get(
      `otp:${otpTypes.password_reset}:${email}`,
    );

    if (!generatedOtp) {
      return res
        .status(500)
        .json({ success: "false", message: "OTP is invalid." });
    }

    if (otp !== generatedOtp) {
      return res
        .status(400)
        .json({ success: "false", message: "OTP is invalid." });
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await Users.findOneAndUpdate({ email }, { password: hashedPassword });

    await redis.del(`otp:${otpTypes.password_reset}:${email}`);

    return res
      .status(200)
      .json({ success: "true", message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    if (req.signedCookies.sid) {
      return res.status(400).json({ error: "User already logged in" });
    }

    const user = await Users.findOne({ email }).select("+password").lean();
    if (!user) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Verify the user's E-mail to log into the account." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

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

    res
      .status(201)
      .json({ success: "true", message: "User logged in successfully" });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  try {
    await redis.del(req.signedCookies.sid);
    res.clearCookie("sid");
    return res.json({
      success: "true",
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
