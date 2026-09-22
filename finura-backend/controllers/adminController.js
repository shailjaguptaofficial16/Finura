const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Investment = require('../models/Investment');
const CreditApplication = require('../models/CreditApplication');

// Helper to seed initial sample credit applications if collection is empty
const ensureSampleCreditApplications = async (adminUserId) => {
  const count = await CreditApplication.countDocuments();
  if (count === 0) {
    await CreditApplication.insertMany([
      {
        user: adminUserId,
        applicantName: 'Sarah Jenkins',
        applicantEmail: 'sarah.j@example.com',
        amount: 45000,
        purpose: 'Real Estate Expansion Facility',
        status: 'Pending',
        creditScore: 785,
        monthlyIncome: 12500,
      },
      {
        user: adminUserId,
        applicantName: 'Marcus Vance',
        applicantEmail: 'marcus.v@example.com',
        amount: 25000,
        purpose: 'Portfolio Liquidity Bridge Loan',
        status: 'Pending',
        creditScore: 740,
        monthlyIncome: 8200,
      },
      {
        user: adminUserId,
        applicantName: 'Elena Rostova',
        applicantEmail: 'elena.r@example.com',
        amount: 80000,
        purpose: 'Commercial Asset Acquisition',
        status: 'Approved',
        creditScore: 810,
        monthlyIncome: 21000,
      },
      {
        user: adminUserId,
        applicantName: 'David Chen',
        applicantEmail: 'david.c@example.com',
        amount: 15000,
        purpose: 'Working Capital Line',
        status: 'Rejected',
        creditScore: 620,
        monthlyIncome: 4500,
      },
    ]);
  }
};

// @desc    Get System-Wide Statistics (Admin Only)
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res, next) => {
  try {
    const adminUserId = req.user._id || req.user.id;
    await ensureSampleCreditApplications(adminUserId);

    const [
      totalUsers,
      totalGoals,
      transactionVolumeResult,
      investmentVolumeResult,
      totalApplications,
      pendingApplications,
    ] = await Promise.all([
      User.countDocuments(),
      Goal.countDocuments(),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Investment.aggregate([
        {
          $group: {
            _id: null,
            totalPortfolioValue: {
              $sum: { $multiply: ['$quantity', '$purchasePrice'] },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      CreditApplication.countDocuments(),
      CreditApplication.countDocuments({ status: 'Pending' }),
    ]);

    const totalTransactionVolume = transactionVolumeResult[0]?.totalVolume || 0;
    const totalTransactionsCount = transactionVolumeResult[0]?.count || 0;
    const totalPortfolioValue = investmentVolumeResult[0]?.totalPortfolioValue || 0;
    const totalHoldingsCount = investmentVolumeResult[0]?.count || 0;

    return res.status(200).json({
      totalUsers,
      totalTransactionVolume,
      totalTransactionsCount,
      totalGoals,
      totalPortfolioValue,
      totalHoldingsCount,
      totalApplications,
      pendingApplications,
      systemHealth: '100% Operational',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users (Admin Only)
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user's role (Admin Only)
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `User role successfully updated to ${role}`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all credit applications (Admin Only)
// @route   GET /api/admin/credit-applications
// @access  Private (Admin)
const getCreditApplications = async (req, res, next) => {
  try {
    const adminUserId = req.user._id || req.user.id;
    await ensureSampleCreditApplications(adminUserId);

    const applications = await CreditApplication.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    next(error);
  }
};

// @desc    Update credit application status (Approve / Reject) (Admin Only)
// @route   PUT /api/admin/credit-applications/:id
// @access  Private (Admin)
const updateCreditApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = String(status).trim();
    const formattedStatus =
      normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).toLowerCase();

    if (!['Approved', 'Rejected', 'Pending'].includes(formattedStatus)) {
      return res.status(400).json({
        message: "Status must be 'Approved', 'Rejected', or 'Pending'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid credit application ID' });
    }

    const application = await CreditApplication.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Credit application not found' });
    }

    application.status = formattedStatus;
    await application.save();

    return res.status(200).json({
      message: `Credit application ${formattedStatus.toLowerCase()} successfully`,
      application,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  updateUserRole,
  getCreditApplications,
  updateCreditApplicationStatus,
};
