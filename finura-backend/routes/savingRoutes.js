const express = require('express');
const {
  createSaving,
  getSavings,
  getSavingById,
  updateSaving,
  deleteSaving,
  contributeToSavings,
} = require('../controllers/savingController');
const { getSavingsSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/')
  .post(createSaving)
  .get(getSavings);

router.post('/contribute', contributeToSavings);
router.get('/summary', getSavingsSummary);

router.route('/:id')
  .get(getSavingById)
  .put(updateSaving)
  .delete(deleteSaving);

module.exports = router;
