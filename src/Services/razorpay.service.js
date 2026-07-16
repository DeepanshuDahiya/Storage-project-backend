import Crypto from "crypto";
import razorpay from "../config/razorpay.js";
import Subscriptions from "../Models/subscription.model.js";
import Plans from "../Models/plan.model.js";
import Users from "../Models/user.model.js";
import AppError from "../Utils/AppError.js";

export const verifyRazorpaySignature = async (
  paymentId,
  subscriptionOrOrderId,
  razorpaySignature,
) => {
  if (!paymentId || !subscriptionOrOrderId || !razorpaySignature) {
    throw new AppError(400, "All fields are required to generate hash");
  }
  const generatedSignature = Crypto.createHmac(
    "sha256",
    process.env.RAZORPAY_KEY_SECRET,
  )
    .update(paymentId + "|" + subscriptionOrOrderId)
    .digest("hex");

  return generatedSignature === razorpaySignature;
};

export const verifyRazorpayWebhookSignature = (rawBody, razorpaySignature) => {
  if (!rawBody || !razorpaySignature) {
    throw new AppError(400, "All fields are required to generate hash.");
  }
  const generatedSignature = Crypto.createHmac(
    "sha256",
    process.env.RAZORPAY_WEBHOOK_SECRET,
  )
    .update(rawBody)
    .digest("hex");

  return generatedSignature === razorpaySignature;
};

export const createRazorpaySubscription = async (
  plan,
  totalBillingCycles,
  userId,
) => {
  const subscription = await razorpay.subscriptions.create({
    plan_id: plan.razorpayPlanId,
    total_count: totalBillingCycles,
    notes: {
      userId,
      planId: plan._id,
    },
  });
  return subscription.id;
};

export const buildSubscriptionDocument = (subscription) => {
  return {
    userId: subscription.notes.userId,
    planId: subscription.notes.planId,
    razorpayPlanId: subscription.plan_id,
    razorpaySubscriptionId: subscription.id,
    status: subscription.status,
    customerEmail: subscription.customer_email,
    customerContact: subscription.customer_contact,
    paymentMethod: subscription.payment_method,
    currentStart: new Date(subscription.current_start * 1000),
    currentEnd: new Date(subscription.current_end * 1000),
    chargeAt: subscription.charge_at
      ? new Date(subscription.charge_at * 1000)
      : null,
    startAt: new Date(subscription.start_at * 1000),
    endAt: subscription.end_at ? new Date(subscription.end_at * 1000) : null,
    totalCount: subscription.total_count,
    paidCount: subscription.paid_count,
    remainingCount: subscription.remaining_count,
    cancelledAt: null,
    endedAt: subscription.ended_at
      ? new Date(subscription.ended_at * 1000)
      : null,
  };
};

export const activateSubscriptionForUser = async (
  razorpaySubscription,
  userId,
) => {
  const subscription = await Subscriptions.create(
    buildSubscriptionDocument(razorpaySubscription),
  );

  const plan = await Plans.findById(razorpaySubscription.notes.planId);

  await Users.findOneAndUpdate(
    { _id: userId || razorpaySubscription.notes.userId },
    {
      storageLimit: plan.storageLimit,
      maxFileSize: plan.maxFileSize,
      subscriptionId: subscription._id,
    },
  );
};

export const handleChargedSubscription = async (chargedSubscriptionData) => {
  const subscription = await Subscriptions.findOneAndUpdate(
    {
      razorpaySubscriptionId: chargedSubscriptionData.id,
    },
    {
      status: chargedSubscriptionData.status,
      currentStart: new Date(chargedSubscriptionData.current_start * 1000),
      currentEnd: new Date(chargedSubscriptionData.current_end * 1000),
      chargeAt: new Date(chargedSubscriptionData.charge_at * 1000),
      paidCount: chargedSubscriptionData.paid_count,
      remainingCount: chargedSubscriptionData.remaining_count,
      gracePeriodEndsAt: null,
    },
  );
};

export const handlePendingSubscription = async (pendingSubscriptionData) => {
  const subscription = await Subscriptions.findOneAndUpdate(
    {
      razorpaySubscriptionId: pendingSubscriptionData.id,
    },
    {
      status: pendingSubscriptionData.status,
      currentStart: new Date(pendingSubscriptionData.currentStart * 1000),
      currentEnd: new Date(pendingSubscriptionData.currentEnd * 1000),
      chargeAt: new Date(pendingSubscriptionData.chargeAt * 1000),
      gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  );
};

export const handleCancelledSubscription = async (canceledSubscriptionData) => {
  const subscription = await Subscriptions.findOneAndUpdate(
    {
      razorpaySubscriptionId: canceledSubscriptionData.id,
    },
    {
      status: canceledSubscriptionData.status,
    },
  );
  if (!subscription) return false;
};
