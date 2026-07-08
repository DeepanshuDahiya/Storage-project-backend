import Crypto from "crypto";
import { redis } from "../config/redis.js";
import emailQueue from "../Queues/email.queue.js";

export async function sendVerificationOtp({
  email,
  userName,
  queueName,
  purpose,
}) {
  try {
    // Generate OTP
    const otp = Crypto.randomInt(1000, 10000);

    // Store in Redis
    const isResendAllowed = await redis.set(
      `resend:${email}`,
      otp,
      "ex",
      60,
      "nx",
    );

    if (isResendAllowed === null) {
      throw new Error("Please try after 60 seconds to resend OTP again.");
    }

    await redis.set(`otp:${purpose}:${email}`, otp, "ex", 60 * 5);

    // Queue email
    await emailQueue.add(
      `${queueName}`,
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
    return { message: "OTP sent successfully." };
  } catch (error) {
    return { error: error };
  }
}
