const { getAiProvider } = require('./aiProvider');
const { buildFinancialContext } = require('./financialContextBuilder');
const { DISCLAIMER, validateMessage, containsMutationRequest } = require('./aiSafety');
const { consume } = require('./aiUsageLimiter');

const detectIntent = (message) => message.toLowerCase().includes('spend') ? 'spending_analysis' : message.toLowerCase().includes('budget') ? 'budget_help' : message.toLowerCase().includes('goal') ? 'goal_planning' : message.toLowerCase().includes('emergency') ? 'emergency_fund' : 'financial_summary';
const generateAssistantResponse = async ({ userId, message }) => {
  const question = validateMessage(message);
  if (containsMutationRequest(question)) { const error = new Error('AI cannot execute financial mutations'); error.statusCode = 400; error.errorCode = 'AI_MUTATION_BLOCKED'; throw error; }
  await consume(userId);
  const context = await buildFinancialContext(userId);
  const provider = getAiProvider();
  const result = await Promise.race([provider.generate({ question, context, intent: detectIntent(question) }), new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('AI provider timeout'), { statusCode: 504, errorCode: 'AI_PROVIDER_TIMEOUT' })), 8000))]);
  return { ...result, intent: result.intent || detectIntent(question), disclaimer: DISCLAIMER };
};
module.exports = { generateAssistantResponse, detectIntent };
