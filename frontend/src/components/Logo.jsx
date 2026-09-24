/**
 * Craft Master Labs logo system.
 * Mark: chisel body meets a circuit trace — artisan + AI in one glyph.
 *
 * Exports:
 *   <Logo />          → 32x32 mark (default). Props: size, className.
 *   <LogoWordmark />  → mark + "Craft Master Labs" wordmark inline.
 *   <LogoLockup />    → mark + wordmark + tagline "AI · MARKETPLACE" (navbar variant).
 */
import React from "react";

const AMBER = "#F59E0B";
const LIME = "#B7FF3A";
const INK = "#0B0F14";

export function LogoMark({ size = 32, className = "", ...rest }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <defs>
        <linearGradient id="cml-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={AMBER} />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="cml-tip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor={AMBER} />
        </linearGradient>
      </defs>

      {/* rounded graphite tile */}
      <rect x="0" y="0" width="64" height="64" rx="16" fill={INK} />

      {/* chisel body — angled bar */}
      <g transform="translate(4 4)">
        <path
          d="M14 42 L34 22 L44 32 L24 52 Z"
          fill="url(#cml-body)"
        />
        {/* chisel tip — brighter edge */}
        <path
          d="M34 22 L44 32 L47 29 L37 19 Z"
          fill="url(#cml-tip)"
        />
        {/* handle cap */}
        <rect
          x="8" y="46" width="10" height="8" rx="2"
          transform="rotate(-45 13 50)"
          fill="#7C2D12"
        />

        {/* circuit trace — enters from chisel tip, meanders across */}
        <g fill="none" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M47 29 L52 24 L52 14 L42 14" />
          <path d="M42 14 L38 10" />
        </g>
        {/* nodes */}
        <circle cx="52" cy="14" r="2" fill={LIME} />
        <circle cx="42" cy="14" r="2" fill={LIME} />
        <circle cx="38" cy="10" r="1.5" fill={LIME} />
      </g>
    </svg>
  );
}

export function LogoWordmark({ size = 32, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-heading font-bold tracking-tight text-slate-100 leading-none">
        Craft Master <span className="text-amber-400">Labs</span>
      </span>
    </span>
  );
}

export function LogoLockup({ size = 36, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="leading-tight">
        <span className="block font-heading font-bold text-slate-100 text-base tracking-tight">
          Craft Master <span className="text-amber-400">Labs</span>
        </span>
        <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          AI · Marketplace
        </span>
      </span>
    </span>
  );
}

export default LogoMark;
