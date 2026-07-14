import Plans from "../models/plan.model.js";

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
