'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMode } from '@/lib/flags';
import { WALL_DEFINITIONS, DEFAULT_WALL_ID, getWallIdForSection } from '@/content/walls';
import type { WallId } from '@/content/wall-placeholders';

export function SiteWall() {
  const pathname = usePathname();
  const { lightMode, reducedMotion } = useMode();
  const isInstant = lightMode || reducedMotion;

  // Active wall currently displayed; incoming wall being crossfaded in
  const [activeWallId, setActiveWallId] = useState<WallId>(DEFAULT_WALL_ID);
  const [incomingWallId, setIncomingWallId] = useState<WallId | null>(null);
  const [incomingVisible, setIncomingVisible] = useState(false);
  const [isHeroPinned, setIsHeroPinned] = useState(true);

  const activeWallRef = useRef<WallId>(activeWallId);
  const incomingWallRef = useRef<WallId | null>(incomingWallId);

  useEffect(() => {
    activeWallRef.current = activeWallId;
  }, [activeWallId]);

  useEffect(() => {
    incomingWallRef.current = incomingWallId;
  }, [incomingWallId]);

  // Route-aware: Plain dark background for /skip, /wanted, and /dev routes
  const isExcludedRoute =
    pathname === '/skip' ||
    pathname === '/wanted' ||
    pathname?.startsWith('/dev') ||
    pathname?.startsWith('/style-test');

  // Track hero pinned state to guarantee NO opacity transition runs while hero is pinned
  useEffect(() => {
    if (isExcludedRoute || typeof window === 'undefined') return;

    const checkHeroPinned = () => {
      const hero = document.getElementById('hero-scene-container');
      if (hero) {
        const rect = hero.getBoundingClientRect();
        // Hero is pinned/active while its bottom is visible or on-screen
        setIsHeroPinned(rect.bottom > 50);
      } else {
        setIsHeroPinned(false);
      }
    };

    checkHeroPinned();
    window.addEventListener('scroll', checkHeroPinned, { passive: true });
    window.addEventListener('resize', checkHeroPinned, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkHeroPinned);
      window.removeEventListener('resize', checkHeroPinned);
    };
  }, [isExcludedRoute]);

  // IntersectionObserver to observe sections and trigger wall switches
  useEffect(() => {
    if (isExcludedRoute || typeof window === 'undefined') return;

    // List of section IDs to observe
    const sectionIds = [
      'hero-scene-container',
      'scenario-select',
      'edge-cloud',
      'ratify',
      'iac-verifier',
      'side-quests',
      'readers-record',
      'contact',
    ];

    const elements: HTMLElement[] = [];
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) elements.push(el);
    }

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // While hero is pinned or active, strictly lock to default wall-01 with no transition
        const hero = document.getElementById('hero-scene-container');
        if (hero && hero.getBoundingClientRect().bottom > 50) {
          if (activeWallRef.current !== DEFAULT_WALL_ID) {
            setActiveWallId(DEFAULT_WALL_ID);
            setIncomingWallId(null);
            setIncomingVisible(false);
          }
          return;
        }

        // Find visible or nearing sections
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (intersecting.length > 0) {
          const topEntry = intersecting[0];
          const targetWallId = getWallIdForSection(topEntry.target.id);

          if (targetWallId !== activeWallRef.current && targetWallId !== incomingWallRef.current) {
            if (isInstant) {
              setActiveWallId(targetWallId);
              setIncomingWallId(null);
              setIncomingVisible(false);
            } else {
              setIncomingWallId(targetWallId);
              setIncomingVisible(false);

              // Allow DOM to mount incoming layer at opacity 0, then fade in
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setIncomingVisible(true);
                });
              });
            }
          }
        }
      },
      {
        rootMargin: '20% 0px 20% 0px',
        threshold: [0, 0.1, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [isExcludedRoute, isInstant]);

  // Clean up incoming layer after crossfade transition completes (750ms)
  useEffect(() => {
    if (!incomingWallId || !incomingVisible) return;

    const timer = setTimeout(() => {
      setActiveWallId(incomingWallId);
      setIncomingWallId(null);
      setIncomingVisible(false);
    }, 750);

    return () => clearTimeout(timer);
  }, [incomingWallId, incomingVisible]);

  if (isExcludedRoute) {
    return null;
  }

  // Render at most two layers: active and incoming
  const layers: { id: WallId; opacityClass: string; isIncoming: boolean }[] = [
    {
      id: activeWallId,
      opacityClass: incomingWallId && incomingVisible ? 'opacity-0' : 'opacity-100',
      isIncoming: false,
    },
  ];

  if (incomingWallId && incomingWallId !== activeWallId) {
    layers.push({
      id: incomingWallId,
      opacityClass: incomingVisible ? 'opacity-100' : 'opacity-0',
      isIncoming: true,
    });
  }

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="site-wall-compositor fixed inset-0 h-[100dvh] w-full pointer-events-none select-none overflow-hidden"
      style={{
        zIndex: 'var(--z-wall, 0)',
        backgroundColor: 'var(--void, #07080B)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      {layers.map((layer) => {
        const wall = WALL_DEFINITIONS[layer.id];
        const isFirstWall = wall.id === 'wall-01';

        return (
          <div
            key={layer.id}
            className={`absolute inset-0 w-full h-full ${
              isInstant || isHeroPinned ? '' : 'transition-opacity duration-700 ease-in-out'
            } ${layer.opacityClass}`}
          >
            <picture className="absolute inset-0 w-full h-full">
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
                width={1920}
                height={1080}
                decoding="async"
                loading={isFirstWall ? 'eager' : 'lazy'}
                fetchPriority={isFirstWall ? 'high' : 'low'}
                className="w-full h-full object-cover object-center"
              />
            </picture>
          </div>
        );
      })}

      {/* Dim and vignette as one static layer with CSS gradients only (no blur filters, no backdrop-filter) */}
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
