const mongoose = require('mongoose');
const Forecast = require('../models/Forecast');
const { buildForecast, buildPlanningForecast, calculateScenario } = require('../services/forecastService');

const getUserId = (req) => req.user._id || req.user.id;
const ASSUMPTION_FIELDS = ['incomeGrowthRate', 'expenseGrowthRate', 'savingsGrowthRate'];

const parsePeriod = (value) => {
  const period = Number(value);
  if (!Number.isInteger(period) || period < 1 || period > 24) return null;
  return period;
};

const normalizeAssumptions = (source = {}) => {
  const assumptions = {};
  for (const field of ASSUMPTION_FIELDS) {
    if (source[field] === undefined || source[field] === '') continue;
    const value = Number(source[field]);
    if (!Number.isFinite(value) || value < -100) return { error: `${field} must be a number greater than or equal to -100` };
    assumptions[field] = value;
  }
  return { assumptions };
};

const getForecast = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.months || req.query.period || 12);
    if (!period) return res.status(400).json({ message: 'Forecast period must be an integer between 1 and 24 months' });
    const normalized = normalizeAssumptions(req.query);
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    if (req.query.configId && !mongoose.Types.ObjectId.isValid(req.query.configId)) {
      return res.status(400).json({ message: 'Invalid forecast configuration ID' });
    }

    const config = req.query.configId
      ? await Forecast.findOne({ _id: req.query.configId, user: getUserId(req), status: 'active' })
      : null;
    if (req.query.configId && !config) return res.status(404).json({ message: 'Forecast configuration not found or paused' });

    const result = await buildForecast({
      userId: getUserId(req),
      forecastPeriod: config?.forecastPeriod || period,
      assumptions: config?.assumptions?.toObject?.() || config?.assumptions || normalized.assumptions,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getForecastConfigs = async (req, res, next) => {
  try {
    const configs = await Forecast.find({ user: getUserId(req) }).sort({ createdAt: -1 });
    return res.status(200).json(configs);
  } catch (error) {
    next(error);
  }
};

const getPlanningForecast = async (req, res, next) => {
  try {
    const period = parsePeriod(req.query.months || 12);
    if (!period) return res.status(400).json({ message: 'Forecast period must be an integer between 1 and 24 months' });
    const result = await buildPlanningForecast({ userId: getUserId(req), forecastPeriod: period });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getGoalForecast = async (req, res, next) => {
  try {
    const result = await buildPlanningForecast({ userId: getUserId(req), forecastPeriod: 12 });
    return res.status(200).json({ goals: result.goals, averageMonthlySavings: result.averageMonthlySavings });
  } catch (error) {
    next(error);
  }
};

const postScenarioForecast = async (req, res, next) => {
  try {
    const period = parsePeriod(req.body.months || 12);
    if (!period) return res.status(400).json({ message: 'Forecast period must be an integer between 1 and 24 months' });
    const scenario = {};
    for (const field of ['incomeChangePercent', 'expenseChangePercent', 'savingsChangePercent']) {
      if (req.body[field] === undefined) continue;
      const value = Number(req.body[field]);
      if (!Number.isFinite(value) || value < -100 || value > 100) {
        return res.status(400).json({ message: `${field} must be between -100 and 100` });
      }
      scenario[field] = value;
    }
    const base = await buildForecast({ userId: getUserId(req), forecastPeriod: period });
    return res.status(200).json(calculateScenario({
      currentBalance: base.currentBalance,
      averageMonthlyIncome: base.averageMonthlyIncome,
      averageMonthlyExpenses: base.averageMonthlyExpenses,
      months: period,
      scenario,
    }));
  } catch (error) {
    next(error);
  }
};

const createForecast = async (req, res, next) => {
  try {
    const period = parsePeriod(req.body.forecastPeriod || 12);
    if (!period) return res.status(400).json({ message: 'Forecast period must be an integer between 1 and 24 months' });
    if (!req.body.name || !String(req.body.name).trim()) return res.status(400).json({ message: 'Forecast name is required' });
    const normalized = normalizeAssumptions(req.body.assumptions);
    if (normalized.error) return res.status(400).json({ message: normalized.error });
    const config = await Forecast.create({
      user: getUserId(req),
      name: String(req.body.name).trim(),
      forecastPeriod: period,
      assumptions: normalized.assumptions,
      status: req.body.status || 'active',
    });
    return res.status(201).json(config);
  } catch (error) {
    next(error);
  }
};

const updateForecastConfig = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid forecast configuration ID' });
    const config = await Forecast.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!config) return res.status(404).json({ message: 'Forecast configuration not found or unauthorized' });
    const period = req.body.forecastPeriod === undefined ? config.forecastPeriod : parsePeriod(req.body.forecastPeriod);
    if (!period) return res.status(400).json({ message: 'Forecast period must be an integer between 1 and 24 months' });
    const normalized = normalizeAssumptions(req.body.assumptions);
    if (normalized.error) return res.status(400).json({ message: normalized.error });

    if (req.body.name !== undefined) config.name = String(req.body.name).trim();
    config.forecastPeriod = period;
    if (req.body.assumptions !== undefined) config.assumptions = { ...config.assumptions.toObject(), ...normalized.assumptions };
    if (req.body.status !== undefined) config.status = req.body.status;
    await config.save();
    return res.status(200).json(config);
  } catch (error) {
    next(error);
  }
};

const deleteForecastConfig = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid forecast configuration ID' });
    const config = await Forecast.findOneAndDelete({ _id: req.params.id, user: getUserId(req) });
    if (!config) return res.status(404).json({ message: 'Forecast configuration not found or unauthorized' });
    return res.status(200).json({ id: config._id, message: 'Forecast configuration deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getForecast,
  getPlanningForecast,
  getGoalForecast,
  postScenarioForecast,
  getForecastConfigs,
  createForecast,
  updateForecastConfig,
  deleteForecastConfig,
};
