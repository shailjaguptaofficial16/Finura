import React from 'react';
import { Layers, Plus } from 'lucide-react';
import FinuraLogo from '../FinuraLogo';

/**
 * Reusable EmptyState Component
 *
 * @param {object} props
 * @param {string} props.title - Main heading (e.g. "No transactions yet")
 * @param {string} props.description - Supportive text describing how to get started
 * @param {React.ReactNode} [props.icon] - Optional Lucide icon component or element
 * @param {string} [props.actionText] - Label for primary CTA button
 * @param {Function} [props.onAction] - Click handler for primary CTA button
 * @param {string} [props.secondaryActionText] - Label for secondary button
 * @param {Function} [props.onSecondaryAction] - Click handler for secondary button
 * @param {string} [props.className] - Additional CSS classes
 */
export default function EmptyState({
  title = 'No data available',
  description = 'There is no financial information to display right now.',
  icon: Icon = Layers,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}) {
  return (
    <div
      className={`py-12 px-6 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 ${className}`}
    >
      <FinuraLogo iconOnly className="empty-state-logo" />
      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mb-3 shadow-xs">
        {React.isValidElement(Icon) ? Icon : <Icon size={24} />}
      </div>

      <h4 className="text-base font-bold text-slate-800 tracking-tight font-heading">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-5 leading-relaxed">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>{actionText}</span>
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>{secondaryActionText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
