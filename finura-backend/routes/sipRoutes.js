const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createSIP, getSIPs, updateSIP, pauseSIP, resumeSIP, cancelSIP } = require('../controllers/sipController');
const router = express.Router(); router.use(protect); router.route('/').post(createSIP).get(getSIPs); router.put('/:id', updateSIP); router.patch('/:id/pause', pauseSIP); router.patch('/:id/resume', resumeSIP); router.patch('/:id/cancel', cancelSIP); module.exports = router;