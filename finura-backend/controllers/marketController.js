const { getQuote, searchStocks } = require('../services/marketDataService');
const { sendSuccess } = require('../middleware/errorMiddleware');
const search = (req, res, next) => { try { return sendSuccess(res, searchStocks(req.query.q)); } catch (error) { return next(error); } };
const quote = (req, res, next) => { try { return sendSuccess(res, getQuote(req.params.symbol)); } catch (error) { return next(error); } };
module.exports = { search, quote };