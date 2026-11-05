'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { WALL_PLACEHOLDERS } from '@/content/wall-placeholders';

export function SiteWall() {
  const pathname = usePathname();

  // Route-aware: Plain dark background for /skip, /wanted, and /dev routes
  const isExcludedRoute =
    pathname === '/skip' ||
    pathname === '/wanted' ||
    pathname?.startsWith('/dev') ||
    pathname?.startsWith('/style-test');

  if (isExcludedRoute) {
    return null;
  }

  const placeholder = WALL_PLACEHOLDERS['wall-01'];

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="fixed inset-0 h-[100dvh] w-full pointer-events-none select-none overflow-hidden"
      style={{
        zIndex: 'var(--z-wall, 0)',
        backgroundColor: 'var(--void, #07080B)',
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <picture className="absolute inset-0 w-full h-full">
        {/* Mobile portrait sources */}
        <source
          media="(max-width: 768px)"
          srcSet="/art/wall/wall-01-portrait.avif"
          type="image/avif"
        />
        <source
          media="(max-width: 768px)"
          srcSet="/art/wall/wall-01-portrait.webp"
          type="image/webp"
        />

        {/* Desktop landscape sources */}
        <source
          srcSet="/art/wall/wall-01-desktop.avif"
          type="image/avif"
        />
        <source
          srcSet="/art/wall/wall-01-desktop.webp"
          type="image/webp"
        />

        {/* Fallback image */}
        <img
          src="/art/wall/wall-01-desktop.webp"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-center"
        />
      </picture>

      {/* Dim and vignette with CSS gradients only (no blur filters, no backdrop-filter) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 35%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) - 0.2)) 0%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) + 0.25)) 100%),
            linear-gradient(to bottom, rgba(7, 8, 11, var(--wall-dim, 0.55)), rgba(7, 8, 11, var(--wall-dim, 0.55)))
          `,
        }}
      />
    </div>
  );
}
