import React, { useId } from 'react';
import './FinuraLogo.css';

export default function FinuraLogo({
  className = '',
  iconOnly = false,
  inverse = false,
  ariaLabel = 'Finura logo',
}) {
  const gradientId = `finura-layered-gradient-${useId().replace(/:/g, '')}`;

  return (
    <span className={`finura-logo ${iconOnly ? 'finura-logo-icon-only' : ''} ${inverse ? 'finura-logo-inverse' : ''} ${className}`.trim()}>
      <svg className="finura-logo-mark" viewBox="0 0 48 48" role="img" aria-label={ariaLabel} focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#10B981" />
            <stop offset="1" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <path d="M24 4 L44 14 L24 24 L4 14 Z" fill={`url(#${gradientId})`} />
        <path d="M4 24 L24 34 L44 24" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 34 L24 44 L44 34" stroke="#10B981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.48" />
      </svg>
      {!iconOnly && <span className="finura-logo-wordmark">FINURA</span>}
    </span>
  );
}
