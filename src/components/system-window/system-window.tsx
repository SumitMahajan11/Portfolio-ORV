import React from "react";

export interface SystemWindowProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  asLandmark?: boolean;
}

export function SystemWindow({
  title,
  children,
  footer,
  className = "",
  asLandmark = false,
}: SystemWindowProps) {
  return (
    <div
      className={`relative border border-line bg-[rgba(14,17,24,0.85)] font-mono shadow-2xl backdrop-blur-sm overflow-hidden ${className}`}
      {...(asLandmark ? { role: "region", "aria-label": title } : {})}
    >
      {/* Corner Ticks (decorative ORV system window HUD brackets) */}
      <span
        className="pointer-events-none absolute -top-[1px] -left-[1px] h-2.5 w-2.5 border-t-2 border-l-2 border-star"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -top-[1px] -right-[1px] h-2.5 w-2.5 border-t-2 border-r-2 border-star"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2.5 w-2.5 border-b-2 border-l-2 border-star"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2.5 w-2.5 border-b-2 border-r-2 border-star"
        aria-hidden="true"
      />

      {/* Subtle Scan-line Overlay (CSS only) */}
      <div
        className="pointer-events-none absolute inset-0 system-window-scanlines z-0"
        aria-hidden="true"
      />

      {/* Teal Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-line bg-[rgba(94,225,230,0.12)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-1.5 bg-star animate-pulse" aria-hidden="true" />
          <span className="font-display text-xs sm:text-sm font-semibold tracking-wider text-star uppercase">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-star/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-star/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-star" />
        </div>
      </div>

      {/* Content Body */}
      <div className="relative z-10 p-4 sm:p-5 text-sm leading-relaxed text-feather font-mono">
        {children}
      </div>

      {/* Optional Footer */}
      {footer && (
        <div className="relative z-10 border-t border-line bg-[rgba(22,27,38,0.7)] px-4 py-2.5 text-xs text-mist font-mono">
          {footer}
        </div>
      )}
    </div>
  );
}
