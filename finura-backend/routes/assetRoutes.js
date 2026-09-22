const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createAsset, getAssets, getAsset, updateAsset, deleteAsset } = require('../controllers/assetController');

const router = express.Router();
router.use(protect);
router.route('/').post(createAsset).get(getAssets);
router.route('/:id').get(getAsset).put(updateAsset).delete(deleteAsset);

module.exports = router;