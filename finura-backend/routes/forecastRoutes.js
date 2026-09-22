const express = require('express');
const {
  getForecast,
  getPlanningForecast,
  getGoalForecast,
  postScenarioForecast,
  getForecastConfigs,
  createForecast,
  updateForecastConfig,
  deleteForecastConfig,
} = require('../controllers/forecastController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/planning', getPlanningForecast);
router.get('/goals', getGoalForecast);
router.post('/scenario', postScenarioForecast);
router.get('/', getForecast);
router.get('/configs', getForecastConfigs);
router.post('/', createForecast);
router.put('/configs/:id', updateForecastConfig);
router.delete('/configs/:id', deleteForecastConfig);

module.exports = router;
