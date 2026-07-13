import Crypto from "crypto";
import razorpay from "../config/razorpay.js";

export const verifyRazorpaySignature = async (
  paymentId,
  subscriptionOrOrderId,
  razorpaySignature,
) => {
  if (!paymentId || !subscriptionOrOrderId || !razorpaySignature) {
    throw new Error("All fields are required to generate hash.");
  }
  const generatedHash = Crypto.createHmac(
    "sha256",
    process.env.RAZORPAY_KEY_SECRET,
  )
    .update(paymentId + "|" + subscriptionOrOrderId)
    .digest("hex");

  return generatedHash === razorpaySignature;
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

export const buildSubscriptionDocument = (subscription, razorpayPaymentId) => {
  return {
    userId: subscription.notes.userId,
    planId: subscription.notes.planId,
    razorpayPlanId: subscription.plan_id,
    razorpaySubscriptionId: subscription.id,
    status: subscription.status,
    customerEmail: subscription.customer_email,
    customerContact: subscription.customer_contact,
    paymentMethod: subscription.payment_method,
    paymentId: razorpayPaymentId,
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
