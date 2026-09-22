const { generateAssistantResponse } = require('../services/ai/aiService');
const { sendSuccess } = require('../middleware/errorMiddleware');
const assistant = async (req, res, next) => { try { return sendSuccess(res, await generateAssistantResponse({ userId: req.user._id || req.user.id, message: req.body.message })); } catch (error) { return next(error); } };
module.exports = { assistant };
