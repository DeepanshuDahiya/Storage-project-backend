import { Queue } from "bullmq";
import bullmqConnection from "../Config/bullmqConnection.js";

const emailQueue = new Queue("email-otp-queue", {
  connection: bullmqConnection,
});

export default emailQueue;
