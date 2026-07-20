import Crypto from "crypto";
import { redis } from "../Config/redis.js";
import emailQueue from "../Queues/email.queue.js";
import AppError from "../Utils/AppError.js";

export async function sendOtp({
  email,
  userName,
  queueName = "email-queue",
  purpose,
}) {
  const otp = Crypto.randomInt(1000, 10000);

  const isResendAllowed = await redis.set(
    `resend:${email}`,
    otp,
    "EX",
    60,
    "NX",
  );

  if (!isResendAllowed) {
    throw new AppError(
      429,
      "Please wait 60 seconds before requesting another OTP.",
    );
  }

  await redis.set(`otp:${purpose}:${email}`, otp, "EX", 300);

  await emailQueue.add(
    queueName,
    {
      email,
      name: userName,
      otp,
    },
    {
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
    },
  );
}

export async function verifyOtp({ email, otp, purpose }) {
  if (!otp || !email)
    throw new AppError(400, "Valid OTP and Email are required");

  const generatedOtp = await redis.get(`otp:${purpose}:${email}`);

  if (!generatedOtp) throw new AppError(400, "OTP expired.");

  if (generatedOtp !== otp) throw new AppError(400, "Invalid OTP.");

  await redis.del(`otp:${purpose}:${email}`);
}
// export async function sendVerificationOtp({
//   email,
//   userName,
//   queueName,
//   purpose,
// }) {
//   try {
//     // Generate OTP
//     const otp = Crypto.randomInt(1000, 10000);

//     // Store in Redis
//     const isResendAllowed = await redis.set(
//       `resend:${email}`,
//       otp,
//       "ex",
//       60,
//       "nx",
//     );

//     if (isResendAllowed === null) {
//       throw new Error("Please try after 60 seconds to resend OTP again.");
//     }

//     await redis.set(`otp:${purpose}:${email}`, otp, "ex", 60 * 5);

//     // Queue email
//     await emailQueue.add(
//       `${queueName}`,
//       {
//         email,
//         name: userName,
//         otp,
//       },
//       {
//         removeOnComplete: true,
//         attempts: 3,
//         backoff: {
//           type: "exponential",
//           delay: 3000,
//         },
//       },
//     );
//     return { message: "OTP sent successfully." };
//   } catch (error) {
//     return { error: error };
//   }
// }
