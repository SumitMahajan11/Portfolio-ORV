'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMode } from '@/lib/flags';
import {
  WALL_DEFINITIONS,
  DEFAULT_WALL_ID,
  TINT_DEFINITIONS,
  VISIBLE_TINT_IDS,
  SECTION_TINT_MAP,
  MONITORED_SECTION_IDS,
  type TintId,
} from '@/content/walls';
import { gsap, ScrollTrigger, registerMotionPlugins, DEFAULT_SCRUB } from '@/lib/motion';

type IdleCallbackHandle = number | ReturnType<typeof setTimeout>;

const scheduleIdle = (fn: () => void): IdleCallbackHandle => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback((deadline) => {
      if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
        fn();
      } else {
        scheduleIdle(fn);
      }
    });
  }
  return setTimeout(fn, 1000);
};

const cancelIdle = (handle: IdleCallbackHandle): void => {
  if (typeof window !== 'undefined' && typeof handle === 'number' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
    return;
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>);
};

interface SectionSpan {
  id: string;
  tintId: TintId;
  top: number;
  bottom: number;
}

/**
 * LivingWall:
 * Single global living wall background (wall-01) with GSAP ScrollTrigger
 * scrubbing a subtle zoom/drift toward the light, idle breathing loop (desktop full mode),
 * per-section color grading tint layers, and a fixed vignette/scrim layer for WCAG AA contrast.
 */
export function LivingWall() {
  const pathname = usePathname();
  const { lightMode, reducedMotion } = useMode();
  const isInstant = lightMode || reducedMotion;

  const zoomRef = useRef<HTMLDivElement>(null);
  const breathRef = useRef<HTMLDivElement>(null);
  const tintRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeTintRef = useRef<TintId>('hub');

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

    // Light mode and reduced motion: static wall at scale 1, no ScrollTrigger, no loops, no tints
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
            onUpdate: (self) => syncTint(self.scroll(), 0.8),
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
            onUpdate: (self) => syncTint(self.scroll(), 0.8),
          },
        }
      );

      gsap.set(breathEl, { scale: 1.0 });
    });

    // Per-section tint crossfade controller (opacity only, 0.8s power2.inOut)
    const crossfadeTo = (targetTint: TintId, duration = 0.8) => {
      if (activeTintRef.current === targetTint && duration > 0) return;
      activeTintRef.current = targetTint;

      VISIBLE_TINT_IDS.forEach((tintId) => {
        const el = tintRefs.current[tintId];
        if (!el) return;

        if (duration === 0) {
          gsap.set(el, { opacity: tintId === targetTint ? 0.35 : 0 });
        } else if (tintId === targetTint) {
          gsap.to(el, {
            opacity: 0.35,
            duration,
            ease: 'power2.inOut',
            overwrite: 'auto',
          });
        } else {
          gsap.to(el, {
            opacity: 0,
            duration,
            ease: 'power2.inOut',
            overwrite: 'auto',
          });
        }
      });
    };

    let sectionSpans: SectionSpan[] = [];
    let mutObserver: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let idleHandle: IdleCallbackHandle | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let initIdleHandle: IdleCallbackHandle | null = null;
    let cachedVCenter = typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400;

    const computeOffsets = () => {
      cachedVCenter = window.innerHeight * 0.5;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const spans: SectionSpan[] = [];

      for (const id of MONITORED_SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          spans.push({
            id,
            tintId: SECTION_TINT_MAP[id] || 'hub',
            top: rect.top + scrollY,
            bottom: rect.bottom + scrollY,
          });
        }
      }

      spans.sort((a, b) => a.top - b.top);
      sectionSpans = spans;
    };

    const getTargetTint = (probe: number): TintId => {
      if (sectionSpans.length === 0) return 'hub';
      if (probe < sectionSpans[0].top) return 'hub';

      for (let i = 0; i < sectionSpans.length; i++) {
        const cur = sectionSpans[i];
        const next = sectionSpans[i + 1];
        const end = next ? next.top : cur.bottom;
        if (probe >= cur.top && probe < end) {
          return cur.tintId;
        }
      }

      return 'hub';
    };

    let isInitialized = false;

    const syncTint = (scrollY: number = window.scrollY || document.documentElement.scrollTop, duration = 0.8) => {
      if (!isInitialized) {
        if (scrollY > 10) {
          isInitialized = true;
          computeOffsets();
        } else {
          return;
        }
      }
      if (sectionSpans.length === 0) return;
      const probe = scrollY + cachedVCenter;
      const targetTint = getTargetTint(probe);
      crossfadeTo(targetTint, duration);
    };

    const handleScroll = () => {
      syncTint(window.scrollY, 0.8);
    };

    const recomputeOffsets = () => {
      computeOffsets();
      ScrollTrigger.refresh();
      syncTint(window.scrollY, 0);
    };

    const debouncedRecompute = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (idleHandle !== null) {
        cancelIdle(idleHandle);
        idleHandle = null;
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        idleHandle = scheduleIdle(() => {
          idleHandle = null;
          recomputeOffsets();
        });
      }, 250);
    };

    const initTintController = () => {
      isInitialized = true;
      computeOffsets();
      syncTint(window.scrollY, 0);

      window.addEventListener('resize', debouncedRecompute);
      window.addEventListener('scroll', handleScroll, { passive: true });

      const allMounted = MONITORED_SECTION_IDS.every(
        (id) => document.getElementById(id) !== null
      );

      if (!allMounted) {
        mutObserver = new MutationObserver(() => {
          const nowAllMounted = MONITORED_SECTION_IDS.every(
            (id) => document.getElementById(id) !== null
          );
          if (nowAllMounted) {
            mutObserver?.disconnect();
            mutObserver = null;
            debouncedRecompute();
          }
        });
        const container = document.getElementById('main-content') || document.body;
        mutObserver.observe(container, { childList: true, subtree: true });
      }
    };

    // No work during the first 2s after load
    const scheduleInit = () => {
      initTimer = setTimeout(() => {
        initTimer = null;
        initIdleHandle = scheduleIdle(() => {
          initIdleHandle = null;
          initTintController();
        });
      }, 2000);
    };

    if (document.readyState === 'complete') {
      scheduleInit();
    } else {
      window.addEventListener('load', scheduleInit, { once: true });
    }

    return () => {
      window.removeEventListener('load', scheduleInit);
      if (initTimer) clearTimeout(initTimer);
      if (initIdleHandle !== null) cancelIdle(initIdleHandle);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (idleHandle !== null) cancelIdle(idleHandle);
      if (mutObserver) mutObserver.disconnect();
      window.removeEventListener('resize', debouncedRecompute);
      window.removeEventListener('scroll', handleScroll);
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

        {/* Tint Layer: One fixed layer above the wall and below the scrim; one stacked child per tint */}
        {!isInstant && (
          <div
            aria-hidden="true"
            className="living-wall-tints absolute inset-0 pointer-events-none"
            style={{ willChange: 'opacity' }}
          >
            {VISIBLE_TINT_IDS.map((tintId: TintId) => {
              const def = TINT_DEFINITIONS[tintId];
              return (
                <div
                  key={tintId}
                  ref={(el) => {
                    tintRefs.current[tintId] = el;
                  }}
                  data-tint={tintId}
                  data-tint-id={tintId}
                  className="absolute inset-0 pointer-events-none opacity-0"
                  style={{
                    background: def.gradient ?? undefined,
                    willChange: 'opacity',
                  }}
                />
              );
            })}
          </div>
        )}

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
