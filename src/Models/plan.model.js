import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
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

const planSchema = new mongoose.Schema(
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
      index: true,
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

const Plans = mongoose.model("Plans", planSchema);

export default Plans;
