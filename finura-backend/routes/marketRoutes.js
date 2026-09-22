const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { search, quote } = require('../controllers/marketController');
const router = express.Router(); router.use(protect); router.get('/stocks/search', search); router.get('/stocks/:symbol', quote); router.get('/stocks/:symbol/quote', quote); module.exports = router;