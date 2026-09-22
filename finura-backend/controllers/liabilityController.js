const Liability = require('../models/Liability');
const { sendSuccess } = require('../middleware/errorMiddleware');

const getUserId = (req) => req.user._id || req.user.id;
const fields = ['name', 'category', 'principalAmount', 'outstandingAmount', 'interestRate', 'minimumPayment', 'dueDate', 'startDate', 'endDate', 'notes'];
const pickFields = (body) => fields.reduce((result, field) => {
  if (body[field] !== undefined) result[field] = body[field];
  return result;
}, {});

const createLiability = async (req, res, next) => {
  try {
    const liability = await Liability.create({ ...pickFields(req.body), user: getUserId(req) });
    return sendSuccess(res, liability, 201);
  } catch (error) {
    return next(error);
  }
};

const getLiabilities = async (req, res, next) => {
  try {
    const liabilities = await Liability.find({ user: getUserId(req) }).sort({ createdAt: -1 });
    return sendSuccess(res, liabilities);
  } catch (error) {
    return next(error);
  }
};

const getLiability = async (req, res, next) => {
  try {
    const liability = await Liability.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!liability) return res.status(404).json({ success: false, message: 'Liability not found' });
    return sendSuccess(res, liability);
  } catch (error) {
    return next(error);
  }
};

const updateLiability = async (req, res, next) => {
  try {
    const liability = await Liability.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!liability) return res.status(404).json({ success: false, message: 'Liability not found' });
    Object.assign(liability, pickFields(req.body));
    await liability.save();
    return sendSuccess(res, liability);
  } catch (error) {
    return next(error);
  }
};

const deleteLiability = async (req, res, next) => {
  try {
    const liability = await Liability.findOneAndDelete({ _id: req.params.id, user: getUserId(req) });
    if (!liability) return res.status(404).json({ success: false, message: 'Liability not found' });
    return sendSuccess(res, { id: liability._id }, 200, 'Liability deleted successfully');
  } catch (error) {
    return next(error);
  }
};

module.exports = { createLiability, getLiabilities, getLiability, updateLiability, deleteLiability };