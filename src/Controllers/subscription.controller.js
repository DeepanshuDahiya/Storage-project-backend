import razorpay from "../Config/razorpay.js";
import Plans from "../Models/plan.model.js";
import Subscriptions from "../Models/subscription.model.js";
import {
  activateSubscriptionForUser,
  createRazorpaySubscription,
  verifyRazorpaySignature,
} from "../Services/razorpay.service.js";

export const createSubscription = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    const plan = await Plans.findById(planId).select("+razorpayPlanId");
    if (!plan) {
      return res
        .status(404)
        .json({ success: "false", message: "No Subscription plan found" });
    }

    const isExistingSubscription = await Subscriptions.findOne({
      userId: user.userId,
      status: "active",
    });
    if (isExistingSubscription) {
      return res.status(409).json({
        success: "false",
        message: "You already have a subscription active",
      });
    }

    const newSubscriptionId = await createRazorpaySubscription(
      plan,
      2,
      user.userId,
    );

    return res.json({ newSubscriptionId });
  } catch (error) {
    next(error);
  }
};

export const verifySubscription = async (req, res, next) => {
  try {
    const {
      razorpay_subscription_id: razorpaySubscriptionId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: "false",
        message:
          "Razorpay Subscription Id, Payment Id and Signature are required",
      });
    }

    const isExistingSubscription = await Subscriptions.findOne({
      userId: req.user.userId,
      razorpaySubscriptionId: razorpaySubscriptionId,
    });

    if (isExistingSubscription) {
      return res.status(400).json({
        success: "false",
        message: "This subscription already exists",
      });
    }

    const isVerifiedSignature = verifyRazorpaySignature(
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
      process.env.RAZORPAY_KEY_SECRET,
    );

    if (!isVerifiedSignature) {
      return res.status(400).json({
        success: "false",
        message: "Signature does not match",
      });
    }

    const razorpaySubscription = await razorpay.subscriptions.fetch(
      razorpaySubscriptionId,
    );

    if (!razorpaySubscription) {
      return res.status(400).json({
        success: "false",
        message: "Razorpay Subscription not found.",
      });
    }

    await activateSubscriptionForUser(razorpaySubscription, req.user.userId);

    res.json({
      success: "true",
      message: "Subscription verification successful",
    });
  } catch (error) {
    next(error);
  }
};
