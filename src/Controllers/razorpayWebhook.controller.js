import {
  activateSubscriptionForUser,
  handlePendingSubscription,
  handleChargedSubscription,
  verifyRazorpayWebhookSignature,
  handleCancelledSubscription,
} from "../Services/razorpay.service.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";

export const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const razorpaySignature = req.headers["x-razorpay-signature"];

    if (!razorpaySignature) throw new AppError(400, "Signature is required");

    const isVerifiedSignature = verifyRazorpayWebhookSignature(
      req.body,
      razorpaySignature,
    );

    if (!isVerifiedSignature) throw new AppError(400, "Invalid Signature");

    const data = JSON.parse(req.body.toString("utf8"));

    switch (data.event) {
      case "subscription.activated":
        await activateSubscriptionForUser(data.payload.subscription.entity);
        // console.log("activated", data.payload.subscription.entity);
        break;

      case "subscription.charged":
        await handleChargedSubscription(data.payload.subscription.entity);
        // console.log("charged", data.payload.subscription.entity);
        break;

      case "subscription.pending":
        await handlePendingSubscription(data.payload.subscription.entity);
        console.log("pending", data.payload.subscription.entity);
        break;

      case "subscription.cancelled":
        await handleCancelledSubscription(data.payload.subscription.entity);
        console.log("canceled", data.payload.subscription.entity);
        break;

      default:
        console.log(`Unhandled webhook event: ${data.event}`);
    }
    return sendResponse(res, 200, "Webhook acknowledged");
  } catch (error) {
    next(error);
  }
};
