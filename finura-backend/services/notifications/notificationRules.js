const NOTIFICATION_TYPES = Object.freeze({ LOW_BALANCE: 'LOW_BALANCE', BUDGET_LIMIT: 'BUDGET_LIMIT', BUDGET_EXCEEDED: 'BUDGET_EXCEEDED', GOAL_MILESTONE: 'GOAL_MILESTONE', GOAL_DEADLINE: 'GOAL_DEADLINE', EMI_DUE: 'EMI_DUE', EMI_OVERDUE: 'EMI_OVERDUE', CREDIT_SCORE_CHANGE: 'CREDIT_SCORE_CHANGE', LOAN_PAYMENT: 'LOAN_PAYMENT', INVESTMENT_ALERT: 'INVESTMENT_ALERT', SYSTEM: 'SYSTEM' });
const RULES = Object.freeze({
  LOW_BALANCE: { enabled: true, priority: 'high', channels: ['in_app'] },
  BUDGET_LIMIT: { enabled: true, threshold: 80, priority: 'medium', channels: ['in_app'] },
  BUDGET_EXCEEDED: { enabled: true, priority: 'high', channels: ['in_app'] },
  GOAL_MILESTONE: { enabled: true, priority: 'medium', channels: ['in_app'] },
  GOAL_DEADLINE: { enabled: true, priority: 'medium', channels: ['in_app'] },
  EMI_DUE: { enabled: true, priority: 'high', channels: ['in_app'] },
  EMI_OVERDUE: { enabled: true, priority: 'critical', channels: ['in_app'] },
  CREDIT_SCORE_CHANGE: { enabled: true, priority: 'medium', channels: ['in_app'] },
  LOAN_PAYMENT: { enabled: true, priority: 'low', channels: ['in_app'] },
  INVESTMENT_ALERT: { enabled: true, priority: 'medium', channels: ['in_app'] },
  SYSTEM: { enabled: true, priority: 'critical', channels: ['in_app'] },
});
module.exports = { NOTIFICATION_TYPES, RULES };
