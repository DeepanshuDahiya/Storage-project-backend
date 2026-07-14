import Users from "../Models/user.model.js";
import {
  activateSubscriptionForUser,
  handlePendingSubscription,
  handleChargedSubscription,
  verifyRazorpayWebhookSignature,
  handleCancelledSubscription,
} from "../Services/razorpay.service.js";

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const razorpaySignature = req.headers["x-razorpay-signature"];
    const isVerifiedSignature = verifyRazorpayWebhookSignature(
      req.body,
      razorpaySignature,
    );

    if (!isVerifiedSignature) {
      return res
        .status(400)
        .json({ success: "false", message: "Invalid Signature" });
    }

    const data = JSON.parse(req.body.toString("utf8"));

    switch (data.event) {
      case "subscription.activated":
        await activateSubscriptionForUser(data.payload.subscription.entity);
        break;

      case "subscription.charged":
        await handleChargedSubscription(data.payload.subscription.entity);
        console.log("charged", data);
        break;

      case "subscription.pending":
        await handlePendingSubscription(data.payload.subscription.entity);
        console.log("pending", data);
        break;

      case "subscription.cancelled":
        const cancelled = await handleCancelledSubscription(
          data.payload.subscription.entity,
        );
        console.log("canceled", data.payload.subscription.entity, cancelled);
        break;

      default:
        break;
    }
    res.status(200).json({ message: "ok" });
  } catch (error) {
    next(error);
  }
};
