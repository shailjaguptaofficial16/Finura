const SIP = require('../models/SIP');
const Investment = require('../models/Investment');
const { sendSuccess } = require('../middleware/errorMiddleware');

const userId = (req) => req.user._id || req.user.id;
const addFrequency = (date, frequency) => {
  const next = new Date(date);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
  else next.setMonth(next.getMonth() + 1);
  return next;
};
const getOwnedSip = (req) => SIP.findOne({ _id: req.params.id, user: userId(req) }).populate('mutualFund', 'name symbol schemeCode type');

const createSIP = async (req, res, next) => {
  try {
    const fund = await Investment.findOne({ _id: req.body.mutualFund, user: userId(req), type: 'mutual_fund' });
    if (!fund) return res.status(404).json({ success: false, message: 'Mutual fund holding not found' });
    const startDate = new Date(req.body.startDate);
    if (Number.isNaN(startDate.getTime())) return res.status(400).json({ success: false, message: 'Valid start date is required' });
    const frequency = req.body.frequency || 'monthly';
    if (!['weekly', 'monthly', 'quarterly'].includes(frequency)) return res.status(400).json({ success: false, message: 'Unsupported SIP frequency' });
    const sip = await SIP.create({ user: userId(req), mutualFund: fund._id, amount: Number(req.body.amount), frequency, startDate, nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : startDate, endDate: req.body.endDate || null, autoDebit: Boolean(req.body.autoDebit) });
    return sendSuccess(res, sip, 201);
  } catch (error) { return next(error); }
};
const getSIPs = async (req, res, next) => { try { return sendSuccess(res, await SIP.find({ user: userId(req) }).populate('mutualFund', 'name symbol schemeCode').sort({ nextDueDate: 1 })); } catch (error) { return next(error); } };
const updateSIP = async (req, res, next) => { try { const sip = await getOwnedSip(req); if (!sip) return res.status(404).json({ success: false, message: 'SIP not found' }); const allowed = ['amount', 'frequency', 'startDate', 'nextDueDate', 'endDate', 'autoDebit']; allowed.forEach((field) => { if (req.body[field] !== undefined) sip[field] = req.body[field]; }); await sip.save(); return sendSuccess(res, sip); } catch (error) { return next(error); } };
const setSIPStatus = (status) => async (req, res, next) => { try { const sip = await getOwnedSip(req); if (!sip) return res.status(404).json({ success: false, message: 'SIP not found' }); sip.status = status; if (status === 'active' && sip.nextDueDate < new Date()) sip.nextDueDate = addFrequency(new Date(), sip.frequency); await sip.save(); return sendSuccess(res, sip); } catch (error) { return next(error); } };

module.exports = { createSIP, getSIPs, updateSIP, pauseSIP: setSIPStatus('paused'), resumeSIP: setSIPStatus('active'), cancelSIP: setSIPStatus('cancelled'), addFrequency };