import React from "react";

export interface FillBadgeProps {
  label?: string;
  className?: string;
}

/**
 * Dev-only FillBadge component.
 * Renders a visible "[FILL]" badge in development/test.
 * In production (NODE_ENV === 'production'), renders nothing (null).
 */
export function FillBadge({ label = "[FILL]", className = "" }: FillBadgeProps) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-mono font-semibold bg-[rgba(94,225,230,0.1)] text-star border border-star/40 select-none ${className}`}
      title="Missing content from Content Bible (dev-only badge)"
    >
      {label}
    </span>
  );
}

/**
 * Helper to safely render a field value or the dev-only FillBadge.
 * In production, null or undefined values render nothing.
 */
export function renderField<T>(
  value: T | null | undefined,
  render?: (val: NonNullable<T>) => React.ReactNode
): React.ReactNode {
  if (value !== null && value !== undefined && value !== "") {
    if (render) {
      return render(value as NonNullable<T>);
    }
    return value as React.ReactNode;
  }

  return <FillBadge />;
}

export default FillBadge;
