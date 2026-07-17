import cron from "node-cron";
import Users from "../models/user.model.js";
import Subscriptions from "../models/subscription.model.js";

cron.schedule("0 * * * *", async () => {
  console.log("cron job working");
  try {
    const now = new Date();

    const subscriptions = await Subscriptions.find({
      isProcessedByCron: false,
      $or: [
        {
          status: "pending",
          gracePeriodEndsAt: {
            $lte: now,
          },
        },
        {
          status: "cancelled",
          currentEnd: {
            $lte: now,
          },
        },
        {
          status: "completed",
          currentEnd: {
            $lte: now,
          },
        },
      ],
    });

    for (const subscription of subscriptions) {
      const user = await Users.findById(subscription.userId);

      if (!user) continue;

      user.storageLimit = 1024 ** 3;
      user.maxFileSize = 100 * 1024 * 1024;
      user.subscriptionId = null;

      await user.save();

      subscription.isProcessedByCron = true;
      subscription.gracePeriodEndsAt = null;

      await subscription.save();

      console.log(`Subscription expired for user ${user._id}`);
    }
  } catch (err) {
    console.error("Subscription cron failed:", err);
  }
});
