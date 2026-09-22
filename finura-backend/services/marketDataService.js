const cache = new Map();
const CACHE_MS = 60 * 1000;

const getQuote = (symbol) => {
  const clean = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,15}$/.test(clean)) {
    const error = new Error('Invalid stock symbol');
    error.statusCode = 400;
    throw error;
  }
  const cached = cache.get(clean);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) return cached.quote;
  const seed = clean.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const currentPrice = Number((50 + (seed % 950)).toFixed(2));
  const previousClose = Number((currentPrice - ((seed % 21) - 10)).toFixed(2));
  const quote = { symbol: clean, exchange: 'MOCK', companyName: `${clean} Holdings`, currentPrice, previousClose, dayChange: Number((currentPrice - previousClose).toFixed(2)), dayChangePercentage: Number((((currentPrice - previousClose) / previousClose) * 100).toFixed(2)), lastUpdated: new Date().toISOString(), dataType: 'delayed', provider: 'mock' };
  cache.set(clean, { cachedAt: Date.now(), quote });
  return quote;
};
const searchStocks = (query) => { const clean = String(query || '').trim().toUpperCase(); if (!clean) return []; return [getQuote(clean)]; };
module.exports = { getQuote, searchStocks };