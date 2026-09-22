const Asset = require('../models/Asset');
const { sendSuccess } = require('../middleware/errorMiddleware');

const getUserId = (req) => req.user._id || req.user.id;
const fields = ['name', 'category', 'currentValue', 'purchaseValue', 'purchaseDate', 'notes'];

const pickFields = (body) => fields.reduce((result, field) => {
  if (body[field] !== undefined) result[field] = body[field];
  return result;
}, {});

const createAsset = async (req, res, next) => {
  try {
    const asset = await Asset.create({ ...pickFields(req.body), user: getUserId(req) });
    return sendSuccess(res, asset, 201);
  } catch (error) {
    return next(error);
  }
};

const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.find({ user: getUserId(req) }).sort({ createdAt: -1 });
    return sendSuccess(res, assets);
  } catch (error) {
    return next(error);
  }
};

const getAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    return sendSuccess(res, asset);
  } catch (error) {
    return next(error);
  }
};

const updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req) },
      { $set: pickFields(req.body) },
      { new: true, runValidators: true }
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    return sendSuccess(res, asset);
  } catch (error) {
    return next(error);
  }
};

const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findOneAndDelete({ _id: req.params.id, user: getUserId(req) });
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    return sendSuccess(res, { id: asset._id }, 200, 'Asset deleted successfully');
  } catch (error) {
    return next(error);
  }
};

module.exports = { createAsset, getAssets, getAsset, updateAsset, deleteAsset };