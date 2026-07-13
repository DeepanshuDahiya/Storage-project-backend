import { model, Schema } from "mongoose";

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
    },

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
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

    paymentId: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
  },
);

const Subscriptions = model("Subscriptions", subscriptionSchema);

export default Subscriptions;
