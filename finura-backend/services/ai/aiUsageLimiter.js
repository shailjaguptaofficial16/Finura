const usage = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 30;
const consume = async (userId) => { const now = Date.now(); const record = usage.get(String(userId)); if (!record || now - record.startedAt >= WINDOW_MS) { usage.set(String(userId), { startedAt: now, count: 1 }); return; } if (record.count >= LIMIT) { const error = new Error('AI usage limit exceeded'); error.statusCode = 429; error.errorCode = 'AI_RATE_LIMITED'; throw error; } record.count += 1; };
module.exports = { consume, LIMIT, usage };
