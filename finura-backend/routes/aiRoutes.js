const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { assistant } = require('../controllers/aiController');
const router = express.Router();
router.use(protect);
router.post('/assistant', assistant);
router.post('/qa', assistant);
module.exports = router;
