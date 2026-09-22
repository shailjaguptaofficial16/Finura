const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getUsers,
  updateUserRole,
  getCreditApplications,
  updateCreditApplicationStatus,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');

// All Admin Routes require valid JWT Authentication + Admin Role
router.use(protect);
router.use(adminMiddleware);

// System-wide statistics
router.get('/stats', getAdminStats);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

// Credit Application Governance
router.get('/credit-applications', getCreditApplications);
router.put('/credit-applications/:id', updateCreditApplicationStatus);

module.exports = router;
