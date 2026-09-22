import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Reusable ErrorState Component
 *
 * @param {object} props
 * @param {string} [props.title] - Error heading
 * @param {string} [props.message] - User-facing sanitized explanation
 * @param {Function} [props.onRetry] - Retry callback function
 * @param {boolean} [props.compact] - Renders as a compact banner if true
 * @param {string} [props.className] - Additional CSS classes
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = "We couldn't load this financial data. Please check your connection and try again.",
  onRetry,
  compact = false,
  className = '',
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  // Compact banner variant (e.g. for notifications or top-of-card alerts)
  if (compact) {
    return (
      <div
        className={`bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-rose-900 truncate">{title}</h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed line-clamp-2">{message}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
            <span>{retrying ? 'Retrying...' : 'Retry'}</span>
          </button>
        )}
      </div>
    );
  }

  // Full panel variant (e.g. for page or table failure)
  return (
    <div
      className={`py-12 px-6 text-center flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 ${className}`}
      role="alert"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mb-3 shadow-xs">
        <AlertCircle size={26} />
      </div>

      <h3 className="text-base font-bold text-rose-900 tracking-tight font-heading">{title}</h3>
      <p className="text-xs sm:text-sm text-rose-700 max-w-md mt-1 mb-5 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
          <span>{retrying ? 'Retrying Connection...' : 'Retry'}</span>
        </button>
      )}
    </div>
  );
}
