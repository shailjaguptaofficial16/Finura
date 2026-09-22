const BLOCKED_PATTERNS = [/transfer money/i, /buy (?:an?|the )?investment/i, /sell (?:an?|the )?investment/i, /submit (?:a )?loan/i, /delete (?:my )?account/i, /create transaction/i];
const DISCLAIMER = 'This is general financial guidance, not professional financial advice.';
const validateMessage = (message) => {
  if (typeof message !== 'string' || !message.trim()) { const error = new Error('message is required'); error.statusCode = 400; error.errorCode = 'INVALID_AI_MESSAGE'; throw error; }
  if (message.length > 2000) { const error = new Error('message cannot exceed 2000 characters'); error.statusCode = 400; error.errorCode = 'AI_MESSAGE_TOO_LONG'; throw error; }
  return message.trim();
};
const containsMutationRequest = (message) => BLOCKED_PATTERNS.some((pattern) => pattern.test(message));
module.exports = { DISCLAIMER, validateMessage, containsMutationRequest };
