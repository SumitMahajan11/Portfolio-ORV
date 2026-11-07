'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMode } from '@/lib/flags';
import { WALL_DEFINITIONS, DEFAULT_WALL_ID } from '@/content/walls';
import { gsap, registerMotionPlugins, DEFAULT_SCRUB } from '@/lib/motion';

/**
 * LivingWall:
 * Single global living wall background (wall-01) with GSAP ScrollTrigger
 * scrubbing a subtle zoom/drift toward the light, idle breathing loop (desktop full mode),
 * and a fixed vignette/scrim layer for WCAG AA contrast.
 */
export function LivingWall() {
  const pathname = usePathname();
  const { lightMode, reducedMotion } = useMode();
  const isInstant = lightMode || reducedMotion;

  const zoomRef = useRef<HTMLDivElement>(null);
  const breathRef = useRef<HTMLDivElement>(null);

  // Route-aware: Plain dark background for /skip, /wanted, /dev, and /style-test routes
  const isExcludedRoute =
    pathname === '/skip' ||
    pathname === '/wanted' ||
    pathname?.startsWith('/dev') ||
    pathname?.startsWith('/style-test');

  useEffect(() => {
    if (isExcludedRoute || typeof window === 'undefined') return;
    registerMotionPlugins();

    const zoomEl = zoomRef.current;
    const breathEl = breathRef.current;
    if (!zoomEl || !breathEl) return;

    // Light mode and reduced motion: static wall at scale 1, no ScrollTrigger, no loops
    if (isInstant) {
      gsap.set(zoomEl, { scale: 1, xPercent: 0, yPercent: 0, clearProps: 'transform' });
      gsap.set(breathEl, { scale: 1, clearProps: 'transform' });
      return;
    }

    const mm = gsap.matchMedia();

    // Desktop: Scroll zoom 1.00 -> 1.12 + translate drift toward the light (max ~1.5%) + idle breathing loop
    mm.add('(min-width: 769px)', () => {
      // 1. One GSAP ScrollTrigger scrubbing the whole document scroll
      gsap.fromTo(
        zoomEl,
        { scale: 1.0, xPercent: 0, yPercent: 0 },
        {
          scale: 1.12,
          xPercent: 1.5,
          yPercent: -1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: DEFAULT_SCRUB,
            invalidateOnRefresh: true,
          },
        }
      );

      // 2. Desktop full mode only: very slow idle breathing (scale +-0.4%, ~14s sine loop)
      gsap.fromTo(
        breathEl,
        { scale: 0.996 },
        {
          scale: 1.004,
          duration: 7, // 7s each way = 14s full sine period
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        }
      );
    });

    // Mobile: Scroll zoom 1.00 -> 1.08 + translate drift toward the light (max ~1.0%), no breathing loop
    mm.add('(max-width: 768px)', () => {
      gsap.fromTo(
        zoomEl,
        { scale: 1.0, xPercent: 0, yPercent: 0 },
        {
          scale: 1.08,
          xPercent: 1.0,
          yPercent: -0.8,
          ease: 'none',
          scrollTrigger: {
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            scrub: DEFAULT_SCRUB,
            invalidateOnRefresh: true,
          },
        }
      );

      gsap.set(breathEl, { scale: 1.0 });
    });

    return () => {
      mm.revert();
    };
  }, [isExcludedRoute, isInstant]);

  if (isExcludedRoute) {
    return null;
  }

  const wall = WALL_DEFINITIONS[DEFAULT_WALL_ID];

  return (
    <>
      {/* High-priority asset preloading links for critical LCP */}
      <link
        rel="preload"
        as="image"
        href={wall.desktop.avif}
        type="image/avif"
        media="(min-width: 769px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={wall.portrait.avif}
        type="image/avif"
        media="(max-width: 768px)"
        fetchPriority="high"
      />

      <div
        aria-hidden="true"
        role="presentation"
        className="living-wall-compositor fixed inset-0 h-[100dvh] w-full pointer-events-none select-none overflow-hidden"
        style={{
          zIndex: 'var(--z-wall, 0)',
          backgroundColor: 'var(--void, #07080B)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        {/* Base image oversized (about 112% of viewport, centered), transform-origin near the bright top-right corner (75% 20%) */}
        <div
          ref={zoomRef}
          className="living-wall-zoom absolute -inset-[6%] w-[112%] h-[112%] pointer-events-none"
          style={{
            transformOrigin: '75% 20%',
            willChange: isInstant ? 'auto' : 'transform',
          }}
        >
          <div
            ref={breathRef}
            className="living-wall-breath w-full h-full pointer-events-none"
            style={{
              transformOrigin: '75% 20%',
              willChange: isInstant ? 'auto' : 'transform',
            }}
          >
            <picture className="w-full h-full block">
              {/* Mobile portrait sources */}
              <source
                media="(max-width: 768px)"
                srcSet={wall.portrait.avif}
                type="image/avif"
              />
              <source
                media="(max-width: 768px)"
                srcSet={wall.portrait.webp}
                type="image/webp"
              />

              {/* Desktop landscape sources */}
              <source
                srcSet={wall.desktop.avif}
                type="image/avif"
              />
              <source
                srcSet={wall.desktop.webp}
                type="image/webp"
              />

              {/* Fallback image */}
              <img
                src={wall.desktop.webp}
                alt=""
                width={2560}
                height={1440}
                decoding="async"
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover object-center"
              />
            </picture>
          </div>
        </div>

        {/* Fixed scrim layer above the wall: vignette + soft dark gradient */}
        <div
          className="living-wall-scrim absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at 75% 20%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) - 0.25)) 0%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) + 0.15)) 65%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) + 0.35)) 100%),
              linear-gradient(to bottom, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) - 0.1)) 0%, rgba(7, 8, 11, var(--wall-dim, 0.55)) 45%, rgba(7, 8, 11, calc(var(--wall-dim, 0.55) + 0.2)) 100%)
            `,
          }}
        />
      </div>
    </>
  );
}

// Backward-compatible alias
export const SiteWall = LivingWall;
