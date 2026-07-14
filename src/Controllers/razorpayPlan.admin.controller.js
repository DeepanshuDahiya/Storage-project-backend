import razorpay from "../config/razorpay.js";
import Plans from "../models/plan.model.js";

export const importPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      return res
        .status(400)
        .json({ success: "false", message: "Plan Id is required" });
    }

    const alreadyExists = await Plans.findOne({
      razorpayPlanId: planId,
    });

    if (alreadyExists) {
      return res.status(409).json({
        message: "Plan already imported.",
      });
    }

    const plan = await razorpay.plans.fetch(planId);

    return res.json({
      success: "true",
      name: plan.item.name,
      description: plan.item.description,
      razorpayPlanId: plan.id,
      price: plan.item.amount / 100,
      currency: plan.item.currency,
      billingPeriod: plan.period,
      billingInterval: plan.interval,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      description,
      razorpayPlanId,
      storageLimit,
      maxFileSize,
      features,
      isActive,
      isAvailableToUsers,
    } = req.body;

    const exists = await Plans.findOne({
      razorpayPlanId,
    });

    if (exists) {
      return res.status(409).json({
        message: "Plan already exists.",
      });
    }

    const razorpayPlan = await razorpay.plans.fetch(razorpayPlanId);

    if (!razorpayPlan) {
      return res.status(409).json({
        message: "Plan does not exists in Razorpay.",
      });
    }

    const plan = await Plans.create({
      name: razorpayPlan.item.name,
      description,
      razorpayPlanId,
      price: razorpayPlan.item.amount,
      currency: razorpayPlan.item.currency,
      billingPeriod: razorpayPlan.period,
      billingInterval: razorpayPlan.interval,
      storageLimit,
      maxFileSize,
      features,
      isActive,
      isAvailableToUsers,
    });

    return res.status(201).json({
      success: true,
      message: "Plan created successfully.",
      plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const plans = await Plans.find({
      isActive: true,
    });

    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res) => {
  try {
    const planId = req.params.id;

    const {
      description,
      storageLimit,
      maxFileSize,
      features,
      isActive,
      isAvailableToUsers,
    } = req.body;

    const plan = await Plans.findByIdAndUpdate(
      planId,
      {
        description,
        storageLimit,
        maxFileSize,
        features,
        isActive,
        isAvailableToUsers,
      },
      {
        returnDocument: "after",
      },
    );

    res.json({ success: "true", message: "Plan updated successfully.", plan });
  } catch (error) {
    next(error);
  }
};
