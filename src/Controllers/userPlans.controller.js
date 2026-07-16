import Plans from "../models/plan.model.js";
import sendResponse from "../Utils/sendResponse.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await Plans.find({
      isActive: true,
    });

    return sendResponse(res, 200, "All plans fetched successfully", { plans });
  } catch (error) {
    next(error);
  }
};
