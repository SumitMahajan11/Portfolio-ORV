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

    // Per-section tint crossfade controller (opacity only, 0.8s power2.inOut)
    const crossfadeTo = (targetTint: TintId, duration = 0.8) => {
      if (activeTintRef.current === targetTint && duration > 0) return;
      activeTintRef.current = targetTint;

      VISIBLE_TINT_IDS.forEach((tintId) => {
        const el = tintRefs.current[tintId];
        if (!el) return;

        if (tintId === targetTint) {
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

    // Attach one ScrollTrigger per monitored section element
    const sectionTriggers: ScrollTrigger[] = [];
    const attachedIds = new Set<string>();

    const syncCurrentSectionTint = (duration = 0) => {
      const vCenter = window.innerHeight * 0.5;
      for (const id of MONITORED_SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= vCenter && rect.bottom >= vCenter) {
            crossfadeTo(SECTION_TINT_MAP[id] || 'hub', duration);
            return;
          }
        }
      }
      crossfadeTo('hub', duration);
    };

    const resizeObserver = new ResizeObserver(() => {
      ScrollTrigger.refresh();
      syncCurrentSectionTint(0);
    });

    const attachSectionTriggers = () => {
      let anyNew = false;
      for (const id of MONITORED_SECTION_IDS) {
        if (!attachedIds.has(id)) {
          const el = document.getElementById(id);
          if (el) {
            attachedIds.add(id);
            resizeObserver.observe(el);
            const tintId = SECTION_TINT_MAP[id] || 'hub';
            const st = ScrollTrigger.create({
              trigger: el,
              start: id === 'hero-scene-container' ? 'top top' : 'top 50%',
              end: 'bottom 50%',
              onEnter: () => crossfadeTo(tintId),
              onEnterBack: () => crossfadeTo(tintId),
              onLeaveBack: id === 'scenario-select' || id === 'hero-scene-container' ? () => crossfadeTo('hub') : undefined,
              onLeave: id === 'contact' ? () => crossfadeTo('hub') : undefined,
            });
            sectionTriggers.push(st);
            anyNew = true;
          }
        }
      }
      if (anyNew) {
        ScrollTrigger.refresh();
      }
    };

    attachSectionTriggers();

    // Sync initial active section tint immediately
    syncCurrentSectionTint(0);

    // Observe deferred worlds mounting below the fold
    const mutObserver = new MutationObserver(() => {
      attachSectionTriggers();
      if (attachedIds.size >= MONITORED_SECTION_IDS.length) {
        mutObserver.disconnect();
      }
    });
    mutObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutObserver.disconnect();
      resizeObserver.disconnect();
      sectionTriggers.forEach((st) => {
        if (st && typeof st.kill === 'function') {
          st.kill();
        }
      });
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
