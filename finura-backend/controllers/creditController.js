const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const CreditScore = require('../models/CreditScore');
const CreditApplication = require('../models/CreditApplication');
const Repayment = require('../models/Repayment');
const { generateRepayments, refreshOverdue } = require('../services/repaymentService');
const { getCreditDashboard } = require('../services/creditDashboardService');
const { getCreditOverview } = require('../services/creditService');
const { sendSuccess } = require('../middleware/errorMiddleware');

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

const getUserId = (req) => req.user._id || req.user.id;
const verifyAccount = async (userId, accountId) => accountId ? Account.exists({ _id: accountId, user: userId }) : true;
const cardFields = ['name', 'issuer', 'lastFourDigits', 'creditLimit', 'outstandingBalance', 'billingCycleStart', 'billingCycleEnd', 'paymentDueDay', 'minimumDue', 'annualFee', 'status'];
const loanFields = ['name', 'lender', 'loanType', 'principalAmount', 'outstandingPrincipal', 'interestRate', 'tenureMonths', 'startDate', 'endDate', 'nextEMIDueDate', 'status'];

const pick = (body, fields) => fields.reduce((result, field) => { if (body[field] !== undefined) result[field] = body[field]; return result; }, {});
const createOwned = (Model, fields) => async (req, res, next) => { try { const data = pick(req.body, fields); if (req.body.account && !(await verifyAccount(getUserId(req), req.body.account))) return res.status(403).json({ success: false, message: 'Account does not belong to the current user', errorCode: 'ACCOUNT_ACCESS_DENIED' }); const item = await Model.create({ ...data, user: getUserId(req), ...(req.body.account ? { account: req.body.account } : {}) }); return sendSuccess(res, item, 201); } catch (error) { return next(error); } };
const listOwned = (Model, sort = { createdAt: -1 }) => async (req, res, next) => { try { return sendSuccess(res, await Model.find({ user: getUserId(req) }).sort(sort)); } catch (error) { return next(error); } };
const getOwned = (Model, label) => async (req, res, next) => { try { const item = await Model.findOne({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: `${label} not found` }); return sendSuccess(res, item); } catch (error) { return next(error); } };
const updateOwned = (Model, fields, label) => async (req, res, next) => { try { const item = await Model.findOne({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: `${label} not found` }); if (req.body.account && !(await verifyAccount(getUserId(req), req.body.account))) return res.status(403).json({ success: false, message: 'Account does not belong to the current user', errorCode: 'ACCOUNT_ACCESS_DENIED' }); Object.assign(item, pick(req.body, fields)); if (req.body.account !== undefined) item.account = req.body.account; await item.save(); return sendSuccess(res, item); } catch (error) { return next(error); } };
const closeOwned = (Model, label) => async (req, res, next) => { try { const item = await Model.findOne({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: `${label} not found` }); item.status = label === 'Credit card' ? 'closed' : 'paid'; await item.save(); return sendSuccess(res, item); } catch (error) { return next(error); } };

const createCreditCard = createOwned(CreditCard, cardFields);
const getCreditCards = listOwned(CreditCard);
const getCreditCard = getOwned(CreditCard, 'Credit card');
const updateCreditCard = updateOwned(CreditCard, cardFields, 'Credit card');
const closeCreditCard = closeOwned(CreditCard, 'Credit card');
const createLoan = createOwned(Loan, loanFields);
const getLoans = listOwned(Loan, { nextEMIDueDate: 1 });
const getLoan = getOwned(Loan, 'Loan');
const updateLoan = updateOwned(Loan, loanFields, 'Loan');
const closeLoan = closeOwned(Loan, 'Loan');
const createCreditScore = async (req, res, next) => { try { return sendSuccess(res, await CreditScore.create({ ...pick(req.body, ['score', 'provider', 'scoreDate', 'previousScore', 'notes']), user: getUserId(req) }), 201); } catch (error) { return next(error); } };
const getLatestCreditScore = async (req, res, next) => { try { return sendSuccess(res, await CreditScore.findOne({ user: getUserId(req) }).sort({ scoreDate: -1, createdAt: -1 })); } catch (error) { return next(error); } };
const getCreditScores = listOwned(CreditScore, { scoreDate: -1 });
const updateCreditScore = updateOwned(CreditScore, ['score', 'provider', 'scoreDate', 'previousScore', 'notes'], 'Credit score');
const deleteCreditScore = async (req, res, next) => { try { const item = await CreditScore.findOneAndDelete({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: 'Credit score not found' }); return sendSuccess(res, { id: item._id }); } catch (error) { return next(error); } };
const getCreditOverviewController = async (req, res, next) => { try { return sendSuccess(res, await getCreditOverview(getUserId(req))); } catch (error) { return next(error); } };
const getCreditDashboardController = async (req, res, next) => { try { return sendSuccess(res, await getCreditDashboard(getUserId(req))); } catch (error) { return next(error); } };
const applicationFields = ['applicationType', 'lender', 'productName', 'requestedAmount', 'applicationDate', 'expectedDecisionDate', 'status', 'rejectionReason', 'approvedAmount', 'linkedLoan', 'linkedCreditCard', 'notes', 'facilityType', 'annualIncome', 'monthlyIncome', 'purpose'];
const createApplication = async (req, res, next) => { try { const item = await CreditApplication.create({ ...pick(req.body, applicationFields), user: getUserId(req), applicationDate: req.body.applicationDate || new Date() }); return sendSuccess(res, item, 201); } catch (error) { return next(error); } };
const listApplications = async (req, res, next) => { try { return sendSuccess(res, await CreditApplication.find({ user: getUserId(req) }).sort({ applicationDate: -1, createdAt: -1 })); } catch (error) { return next(error); } };
const getApplication = getOwned(CreditApplication, 'Credit application');
const updateApplication = updateOwned(CreditApplication, applicationFields, 'Credit application');
const cancelApplication = async (req, res, next) => { try { const item = await CreditApplication.findOneAndUpdate({ _id: req.params.id, user: getUserId(req) }, { $set: { status: 'cancelled' } }, { new: true, runValidators: true }); if (!item) return res.status(404).json({ success: false, message: 'Credit application not found' }); return sendSuccess(res, item); } catch (error) { return next(error); } };
const updateApplicationStatus = async (req, res, next) => { try { const allowed = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled']; if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid application status' }); const item = await CreditApplication.findOne({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: 'Credit application not found' }); item.status = req.body.status; if (req.body.rejectionReason !== undefined) item.rejectionReason = req.body.rejectionReason; if (req.body.approvedAmount !== undefined) item.approvedAmount = req.body.approvedAmount; await item.save(); return sendSuccess(res, item); } catch (error) { return next(error); } };
const listRepayments = async (req, res, next) => { try { await refreshOverdue(getUserId(req)); return sendSuccess(res, await Repayment.find({ user: getUserId(req) }).populate('loan', 'name lender').sort({ dueDate: 1 })); } catch (error) { return next(error); } };
const createRepayment = async (req, res, next) => { try { const loan = await Loan.findOne({ _id: req.body.loan, user: getUserId(req) }); if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' }); const repayment = await Repayment.create({ ...pick(req.body, ['installmentNumber', 'dueDate', 'emiAmount', 'principalAmount', 'interestAmount', 'penaltyAmount']), user: getUserId(req), loan: loan._id }); return sendSuccess(res, repayment, 201); } catch (error) { return next(error); } };
const payRepayment = async (req, res, next) => { try { const item = await Repayment.findOne({ _id: req.params.id, user: getUserId(req) }); if (!item) return res.status(404).json({ success: false, message: 'Repayment not found' }); const paidAmount = Number(req.body.paidAmount); const totalPayable = item.emiAmount + item.penaltyAmount; if (!Number.isFinite(paidAmount) || paidAmount <= 0 || paidAmount > totalPayable) return res.status(400).json({ success: false, message: 'Invalid repayment amount' }); item.paidAmount = paidAmount; item.paidDate = new Date(); item.status = paidAmount === totalPayable ? 'paid' : 'partial'; await item.save(); const loan = await Loan.findOne({ _id: item.loan, user: getUserId(req) }); if (loan) { loan.outstandingPrincipal = Math.max(0, Number(loan.outstandingPrincipal) - Number(item.principalAmount * (paidAmount / totalPayable))); if (loan.outstandingPrincipal === 0) loan.status = 'paid'; await loan.save(); } return sendSuccess(res, item); } catch (error) { return next(error); } };
const generateLoanSchedule = async (req, res, next) => { try { const loan = await Loan.findOne({ _id: req.params.id, user: getUserId(req) }); if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' }); const schedule = await generateRepayments(getUserId(req), loan); return sendSuccess(res, schedule, 201); } catch (error) { return next(error); } };

module.exports = {
  applyCredit,
  getMyApplications,
  getCreditEligibility,
  getCreditOverviewController,
  getCreditDashboardController,
  createCreditCard, getCreditCards, getCreditCard, updateCreditCard, closeCreditCard,
  createLoan, getLoans, getLoan, updateLoan, closeLoan,
  createCreditScore, getLatestCreditScore, getCreditScores, updateCreditScore, deleteCreditScore,
  createApplication, listApplications, getApplication, updateApplication, cancelApplication, updateApplicationStatus,
  createRepayment, listRepayments, payRepayment,
  generateLoanSchedule,
};
