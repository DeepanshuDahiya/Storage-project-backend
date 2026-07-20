import razorpay from "../Config/razorpay.js";
import Plans from "../Models/plan.model.js";
import AppError from "../Utils/AppError.js";
import sendResponse from "../Utils/sendResponse.js";

export const importPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;

    if (!planId) throw new AppError(400, "Plan Id is required");

    const alreadyExists = await Plans.findOne({
      razorpayPlanId: planId,
    });

    if (alreadyExists) throw new AppError(409, "Plan already imported");

    const plan = await razorpay.plans.fetch(planId);

    return sendResponse(res, 201, "Plan imported successfully", {
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

    if (exists) throw new AppError(409, "Plan already exists.");

    const razorpayPlan = await razorpay.plans.fetch(razorpayPlanId);

    if (!razorpayPlan)
      throw new AppError(409, "Plan does not exists in Razorpay.");

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

    return sendResponse(res, 201, "Plan created successfully", { plan });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const plans = await Plans.find();

    return sendResponse(res, 200, "Plans fetched successfully", { plans });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
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

    if (!planId) throw new AppError(400, "Plan Id is required");

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

    return sendResponse(res, 200, "Plan updated successfully", { plan });
  } catch (error) {
    next(error);
  }
};
