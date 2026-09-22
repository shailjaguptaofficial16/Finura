const Retirement = require('../models/Retirement');
const { buildRetirementProjection } = require('../services/retirementService');

const getUserId = (req) => req.user._id || req.user.id;

const readNumber = (value, field, { required = false, min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    return required ? `${field} is required` : null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    return `${field} is invalid`;
  }
  return null;
};

const validateInputs = (input) => {
  const fields = [
    ['currentAge', 'Current age', { required: true, min: 1, max: 100, integer: true }],
    ['retirementAge', 'Retirement age', { required: true, min: 2, max: 100, integer: true }],
    ['lifeExpectancy', 'Life expectancy', { required: true, min: 3, max: 120, integer: true }],
    ['currentMonthlyExpenses', 'Current monthly expenses', { required: true, min: 0.01, max: 100000000 }],
    ['currentRetirementSavings', 'Current retirement savings', { min: 0, max: 100000000000 }],
    ['monthlyContribution', 'Monthly contribution', { min: 0, max: 100000000 }],
    ['inflationRate', 'Inflation rate', { required: true, min: 0, max: 50 }],
    ['expectedReturn', 'Expected return', { required: true, min: 0, max: 100 }],
    ['otherIncome', 'Other income', { min: 0, max: 100000000 }],
  ];
  for (const [key, label, options] of fields) {
    const error = readNumber(input[key], label, options);
    if (error) return error;
  }
  if (Number(input.retirementAge) <= Number(input.currentAge)) return 'Retirement age must be greater than current age';
  if (Number(input.lifeExpectancy) <= Number(input.retirementAge)) return 'Life expectancy must be greater than retirement age';
  return null;
};

const toPlanPayload = (input, userId) => ({
  user: userId,
  currentAge: Number(input.currentAge),
  retirementAge: Number(input.retirementAge),
  lifeExpectancy: Number(input.lifeExpectancy),
  currentMonthlyExpenses: Number(input.currentMonthlyExpenses),
  currentRetirementSavings: Number(input.currentRetirementSavings || 0),
  monthlyContribution: Number(input.monthlyContribution || 0),
  inflationRate: Number(input.inflationRate),
  expectedReturn: Number(input.expectedReturn),
  retirementLifestyle: input.retirementLifestyle ? String(input.retirementLifestyle).trim() : 'moderate',
  otherIncome: Number(input.otherIncome || 0),
  notes: input.notes ? String(input.notes).trim() : '',
});

const serializePlan = async (plan) => {
  const data = plan.toObject ? plan.toObject() : plan;
  const calculated = await buildRetirementProjection(plan);
  return {
    ...data,
    ...calculated,
  };
};

const createRetirementPlan = async (req, res, next) => {
  try {
    const validationError = validateInputs(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const userId = getUserId(req);
    const existing = await Retirement.findOne({ user: userId }).select('_id');
    if (existing) return res.status(409).json({ message: 'Retirement plan already exists' });
    const plan = await Retirement.create(toPlanPayload(req.body, userId));
    return res.status(201).json(await serializePlan(plan));
  } catch (error) {
    next(error);
  }
};

const getRetirementPlan = async (req, res, next) => {
  try {
    const plan = await Retirement.findOne({ user: getUserId(req) });
    if (!plan) return res.status(404).json({ message: 'Retirement plan not found' });
    return res.status(200).json(await serializePlan(plan));
  } catch (error) {
    next(error);
  }
};

const updateRetirementPlan = async (req, res, next) => {
  try {
    const plan = await Retirement.findOne({ user: getUserId(req) });
    if (!plan) return res.status(404).json({ message: 'Retirement plan not found' });
    const nextValues = { ...plan.toObject(), ...req.body };
    const validationError = validateInputs(nextValues);
    if (validationError) return res.status(400).json({ message: validationError });
    Object.assign(plan, toPlanPayload(nextValues, plan.user));
    await plan.save();
    return res.status(200).json(await serializePlan(plan));
  } catch (error) {
    next(error);
  }
};

const deleteRetirementPlan = async (req, res, next) => {
  try {
    const plan = await Retirement.findOneAndDelete({ user: getUserId(req) });
    if (!plan) return res.status(404).json({ message: 'Retirement plan not found' });
    return res.status(200).json({ id: plan._id, message: 'Retirement plan deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRetirementPlan,
  getRetirementPlan,
  updateRetirementPlan,
  deleteRetirementPlan,
};
