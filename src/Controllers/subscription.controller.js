import razorpay from "../Config/razorpay.js";
import Plans from "../Models/plan.model.js";
import Subscriptions from "../Models/subscription.model.js";
import {
  activateSubscriptionForUser,
  createRazorpaySubscription,
  verifyRazorpaySignature,
} from "../Services/razorpay.service.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";

export const createSubscription = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    const plan = await Plans.findById(planId).select("+razorpayPlanId");
    if (!plan) throw new AppError(404, "No Subscription plan found");

    const isExistingSubscription = await Subscriptions.findOne({
      userId: user.userId,
      status: "active",
    });

    if (isExistingSubscription)
      throw new AppError(409, "You already have a subscription active");

    const razorpaySubscriptionId = await createRazorpaySubscription(
      plan,
      2,
      user.userId,
    );

    return sendResponse(res, 201, "Subscription created successfully.", {
      razorpaySubscriptionId,
    });
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

    if (!razorpaySubscriptionId || !razorpayPaymentId || !razorpaySignature)
      throw new AppError(
        400,
        "Razorpay Subscription Id, Payment Id and Signature are required",
      );

    const isExistingSubscription = await Subscriptions.findOne({
      userId: req.user.userId,
      razorpaySubscriptionId: razorpaySubscriptionId,
    });

    if (isExistingSubscription)
      throw new AppError(400, "This subscription already exists");

    const isVerifiedSignature = verifyRazorpaySignature(
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
      process.env.RAZORPAY_KEY_SECRET,
    );

    if (!isVerifiedSignature)
      throw new AppError(400, "Signature does not match");

    const razorpaySubscription = await razorpay.subscriptions.fetch(
      razorpaySubscriptionId,
    );

    if (!razorpaySubscription)
      throw new AppError(400, "Razorpay Subscription not found");

    await activateSubscriptionForUser(razorpaySubscription, req.user.userId);

    return sendResponse(res, 200, "Subscription verification successful");
  } catch (error) {
    next(error);
  }
};
