const { buildPlanningOverview } = require('../services/planningService');
const { sendSuccess } = require('../middleware/errorMiddleware');

const getPlanningOverview = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const overview = await buildPlanningOverview(userId);
    return sendSuccess(res, overview);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlanningOverview };
