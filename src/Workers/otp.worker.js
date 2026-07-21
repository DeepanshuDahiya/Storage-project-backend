import { Worker } from "bullmq";
import bullmqConnection from "../Config/bullmqConnection.js";
import { sendMail } from "../Services/email.service.js";
import { otpTemplate } from "../Templates/opt.template.js";

await new Worker(
  "email-otp-queue",
  async (job) => {
    try {
      await sendMail({
        to: job.data.email,
        subject: "OTP for email verification",
        html: otpTemplate(job.data.name, job.data.otp),
      });
    } catch (error) {
      console.log(error);
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 4,
  },
);
