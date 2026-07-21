import mongoose, { Schema, model } from "mongoose";

const featureSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    highlighted: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const planSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    razorpayPlanId: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    currency: {
      type: String,
      default: "INR",
    },

    price: {
      type: Number,
      required: true,
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    billingInterval: {
      type: Number,
      required: true,
    },

    storageLimit: {
      type: Number,
      required: true,
    },

    maxFileSize: {
      type: Number,
      required: true,
    },

    maxDevices: {
      type: Number,
      required: true,
      min: [1, "Minimum 1 device must be allowed."],
      max: [5, "Maximum 5 devices can be allowed."],
    },

    features: {
      type: [featureSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailableToUsers: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Plans = mongoose.models.Plans || model("Plans", planSchema);

export default Plans;
