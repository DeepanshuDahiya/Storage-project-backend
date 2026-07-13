import razorpay from "../config/razorpay.js";
import { redis } from "../config/redis.js";
import Plans from "../Models/plan.model.js";
import Subscriptions from "../Models/subscription.model.js";
import Users from "../Models/user.model.js";
import {
  buildSubscriptionDocument,
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

    await Subscriptions.create(
      buildSubscriptionDocument(razorpaySubscription, razorpayPaymentId),
    );

    const plan = await Plans.findById(razorpaySubscription.notes.planId);

    await Users.findOneAndUpdate(
      { _id: req.user.userid },
      { storageLimit: plan.storageLimit, maxFileSize: plan.maxFileSize },
    );

    await redis.del(req.signedCookies.sid);
    await redis.set(
      req.signedCookies.sid,
      JSON.stringify({
        userId: req.user._id,
        email: req.user.email,
        storageLimit: plan.storageLimit,
        maxFileSize: plan.maxFileSize,
        rootDirId: req.user.rootDirId,
        role: req.user.role,
      }),
      "ex",
      60 * 60 * 24 * 30,
    );

    res.json({
      success: "true",
      message: "Subscription verification successful",
    });
  } catch (error) {
    next(error);
  }
};
