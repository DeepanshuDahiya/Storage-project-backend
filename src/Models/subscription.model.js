import mongoose, { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    planId: {
      type: Schema.Types.ObjectId,
      ref: "Plans",
      required: true,
      index: true,
    },
    razorpayPlanId: {
      type: String,
      index: true,
      select: false,
    },

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    status: {
      type: String,
      enum: ["active", "pending", "cancelled", "completed"],
      required: true,
      index: true,
    },

    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    customerContact: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    currentStart: {
      type: Date,
      required: true,
    },

    currentEnd: {
      type: Date,
      required: true,
      index: true,
    },

    chargeAt: {
      type: Date,
      default: null,
    },

    startAt: {
      type: Date,
      required: true,
    },

    endAt: {
      type: Date,
      default: null,
    },

    totalCount: {
      type: Number,
      required: true,
      min: 1,
    },

    paidCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },
    isProcessedByCron: {
      type: Boolean,
      default: false,
    },
    gracePeriodEndsAt: Date,
  },
  {
    timestamps: true,
  },
);

const Subscriptions =
  mongoose.models.Subscriptions || model("Subscriptions", subscriptionSchema);

export default Subscriptions;
