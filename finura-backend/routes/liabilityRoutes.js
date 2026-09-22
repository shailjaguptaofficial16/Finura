const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createLiability, getLiabilities, getLiability, updateLiability, deleteLiability } = require('../controllers/liabilityController');

const router = express.Router();
router.use(protect);
router.route('/').post(createLiability).get(getLiabilities);
router.route('/:id').get(getLiability).put(updateLiability).delete(deleteLiability);

module.exports = router;