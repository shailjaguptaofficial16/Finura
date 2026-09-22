class AiProvider {
  async generate() { throw new Error('AI provider not configured'); }
}
class SafeFallbackProvider extends AiProvider {
  async generate({ question, context }) {
    const answer = context.summary
      ? `Based on your available financial data, your current net cash flow is ${context.summary.netCashFlow} and your tracked expenses are ${context.summary.totalExpense}. Review the detailed analytics pages for category-level context.`
      : `I can help explain your financial data, but there is not enough structured data to answer this question precisely.`;
    return { answer, intent: 'financial_summary', keyPoints: [question], suggestedActions: ['Review your Analytics and Planning dashboards.'], confidence: context.summary ? 'medium' : 'low' };
  }
}
const getAiProvider = () => process.env.AI_PROVIDER === 'external' ? new AiProvider() : new SafeFallbackProvider();
module.exports = { AiProvider, SafeFallbackProvider, getAiProvider };
