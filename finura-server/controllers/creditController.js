const mongoose = require('mongoose');
const CreditApplication = require('../models/CreditApplication');
const Transaction = require('../models/Transaction');

// ─────────────────────────────────────────────
// @desc    Submit a new Credit Facility Application
// @route   POST /api/credit/apply
// @access  Private
// ─────────────────────────────────────────────
const applyCredit = async (req, res, next) => {
  try {
    const {
      facilityType,
      requestedAmount,
      amount,
      annualIncome,
      monthlyIncome,
      purpose,
      applicantName,
      applicantEmail,
    } = req.body;

    const userId = req.user._id || req.user.id;
    const finalAmount = Number(requestedAmount || amount);
    const finalIncome = Number(annualIncome !== undefined ? annualIncome : (monthlyIncome ? monthlyIncome * 12 : 0));

    if (!facilityType) {
      return res.status(400).json({ message: 'Facility type is required' });
    }

    if (!Number.isFinite(finalAmount) || finalAmount < 100) {
      return res.status(400).json({ message: 'Requested amount must be at least $100' });
    }

    if (!Number.isFinite(finalIncome) || finalIncome < 0) {
      return res.status(400).json({ message: 'Please provide a valid annual income declaration' });
    }

    const application = await CreditApplication.create({
      user: userId,
      facilityType,
      requestedAmount: finalAmount,
      amount: finalAmount,
      annualIncome: finalIncome,
      monthlyIncome: Math.round(finalIncome / 12),
      purpose: (purpose || facilityType).trim(),
      applicantName: (applicantName || req.user.name || 'Finura Member').trim(),
      applicantEmail: (applicantEmail || req.user.email || '').trim(),
      status: 'Pending',
      creditScore: req.user.creditScore || 745,
    });

    return res.status(201).json({
      message: 'Credit application submitted successfully',
      application,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get all applications submitted by logged-in user
// @route   GET /api/credit/my-applications
// @access  Private
// ─────────────────────────────────────────────
const getMyApplications = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const applications = await CreditApplication.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json(applications || []);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Calculate pre-approved credit eligibility limit based on user cashflow
// @route   GET /api/credit/eligibility
// @access  Private
// ─────────────────────────────────────────────
const getCreditEligibility = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const transactions = await Transaction.find({ user: userId });

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += Number(t.amount || 0);
      } else if (t.type === 'expense') {
        totalExpenses += Number(t.amount || 0);
      }
    });

    const netBalance = Math.max(0, totalIncome - totalExpenses);

    // Dynamic Formula: (totalIncome * 4) + (netBalance * 0.5)
    let calculatedLimit = (totalIncome * 4) + (netBalance * 0.5);

    // Provide pre-approved baseline for new users with low/zero recorded history
    if (calculatedLimit < 50000) {
      calculatedLimit = totalIncome > 0 ? Math.max(calculatedLimit, 75000) : 50000;
    }

    calculatedLimit = Number(calculatedLimit.toFixed(0));

    const facilities = [
      {
        id: 'working_capital',
        title: 'Working Capital Line',
        maxFacilityLimit: 250000,
        preApprovedAmount: Math.min(calculatedLimit, 250000),
        interestRate: '4.25% APR',
        term: '12 - 36 Months Revolving',
        badge: 'Instant Liquidity',
        description: 'Flexible funding for operational scale, payroll smoothing, and liquidity buffers.',
      },
      {
        id: 'home_equity',
        title: 'Home Equity Access',
        maxFacilityLimit: 180000,
        preApprovedAmount: Math.min(calculatedLimit, 180000),
        interestRate: '3.85% APR',
        term: 'Up to 120 Months',
        badge: 'Tax-Efficient',
        description: 'Competitive rate structure backed by property equity with structured draw periods.',
      },
      {
        id: 'business_facility',
        title: 'Business Credit Facility',
        maxFacilityLimit: 400000,
        preApprovedAmount: Math.min(calculatedLimit, 400000),
        interestRate: '5.10% APR',
        term: '24 - 60 Months',
        badge: 'Commercial Grade',
        description: 'Institutional-grade capital reserved for strategic expansion, acquisitions, and inventory.',
      },
    ];

    return res.status(200).json({
      preApprovedLimit: calculatedLimit,
      totalIncome,
      netBalance,
      facilities,
      creditRating: 'Prime (Tier 1)',
      estimatedApr: '3.85% - 5.10%',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyCredit,
  getMyApplications,
  getCreditEligibility,
};
