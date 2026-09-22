/**
 * Finura Client Utility Formatters
 * Standard formatting functions for currency, dates, percentages, and user display initials.
 */

/**
 * Format a number as currency (defaults to INR)
 * @param {number|string} amount 
 * @param {string} currency - Default 'INR'
 * @returns {string} Formatted currency string (e.g. "₹12,450.00")
 */
export const formatCurrency = (amount, currency = 'INR') => {
  const parsed = Number(amount);
  const num = Number.isFinite(parsed) && Math.abs(parsed) >= 0.005 ? parsed : 0;
  const supportedCurrency = ['INR', 'USD', 'EUR', 'GBP'].includes(currency) ? currency : 'INR';
  return new Intl.NumberFormat(supportedCurrency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: supportedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const getPreferredCurrency = () => {
  if (typeof window === 'undefined') return 'INR';
  const savedCurrency = window.localStorage.getItem('finura-currency');
  return ['INR', 'USD', 'EUR', 'GBP'].includes(savedCurrency) ? savedCurrency : 'INR';
};

/**
 * Format an ISO date string or Date object into human-readable format
 * @param {string|Date} date 
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string (e.g. "Sep 6, 2026")
 */
export const formatDate = (date, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', options).format(d);
};

/**
 * Format a number as percentage
 * @param {number|string} value 
 * @param {number} decimals - Default 1
 * @returns {string} Formatted percentage (e.g. "+14.2%")
 */
export const formatPercentage = (value, decimals = 1) => {
  const num = Number(value);
  if (isNaN(num)) return '0.0%';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(decimals)}%`;
};

/**
 * Generate 1-2 character uppercase initials from full name
 * @param {string} name 
 * @returns {string} Initials (e.g. "Sarah Jenkins" -> "SJ")
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'FM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
  if (parts.length === 1 && parts[0].length === 1) return parts[0].toUpperCase();
  return 'FM';
};/**
 * Format a number safely with fallback, preventing NaN/undefined/null in the UI
 * @param {number|string} value 
 * @param {number} decimals - Default 2
 * @param {number} fallback - Default 0
 * @returns {string} Formatted number string
 */
export const formatSafeNumber = (value, decimals = 2, fallback = 0) => {
  const parsed = Number(value);
  const num = Number.isFinite(parsed) ? parsed : fallback;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
