import React from "react";

export default function BonusArrowUp({ className = "" }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bUpMain" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#19C94B" />
          <stop offset="0.55" stopColor="#59FF8E" />
          <stop offset="1" stopColor="#D6FFE7" />
        </linearGradient>

        <linearGradient id="bUpShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="0.55" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <filter id="bUpDrop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      <path
        d="M32 8c1.8 0 3.3.7 4.5 2l15.5 16.8c1.2 1.3 1.4 3.2.5 4.7-.9 1.5-2.5 2.4-4.2 2.4H41v18.3c0 2.8-2.3 5-5 5H28c-2.8 0-5-2.2-5-5V34.6h-7.3c-1.7 0-3.3-.9-4.2-2.4-.9-1.5-.7-3.4.5-4.7L27.5 10c1.2-1.3 2.7-2 4.5-2z"
        fill="url(#bUpMain)"
        stroke="rgba(0,0,0,0.38)"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#bUpDrop)"
      />

      <path d="M16 40 L48 18" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <path d="M16 40 L48 18" stroke="rgba(0,0,0,0.30)" strokeWidth="2" strokeLinecap="round" opacity="0.45" />

      <path
        d="M32 11c1 0 1.9.4 2.6 1.1l13.9 15.1c.3.3.2.7-.1.9-.2.2-.5.3-.8.3H39c-1.1 0-2 .9-2 2v0.2c0 0 0 0 0 0
           C37 21.5 34.2 11 32 11z"
        fill="url(#bUpShine)"
        opacity="0.55"
      />

      <path
        d="M32 12c.9 0 1.7.3 2.3 1l14.4 15.7c.4.5.1 1.2-.6 1.2H40.5c-1.4 0-2.5 1.1-2.5 2.5v19.8c0 1.7-1.3 3-3 3H29c-1.7 0-3-1.3-3-3V32.4c0-1.4-1.1-2.5-2.5-2.5H15.9c-.7 0-1-0.7-.6-1.2L29.7 13c.6-.7 1.4-1 2.3-1z"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
