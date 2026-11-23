'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useBiyooIdleEngine } from './use-biyoo-idle-engine';
import { BiyooPuppet } from './biyoo-puppet';

// Lazy-load Q&A modal and matching engine on first open
const BiyooQaModal = dynamic(
  () => import('./biyoo-qa-modal').then((m) => m.BiyooQaModal),
  { ssr: false }
);

export function GlobalBiyoo() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isQaOpen, setIsQaOpen] = useState(false);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const puppetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const engine = useBiyooIdleEngine({
    initialIdleScale: 1.0,
    enableQueryScale: false,
    enableSessionGreetings: true,
  });

  // Expose engine to window for verification / tests (only on /biyoo-test or dev, not production on /)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV !== 'production' || pathname === '/biyoo-test') {
        (window as unknown as { __biyooEngine: unknown }).__biyooEngine = engine;
      } else {
        delete (window as unknown as { __biyooEngine?: unknown }).__biyooEngine;
      }
    }
  }, [engine, pathname]);

  // Sync Q&A panel open state to body class so sound prompt and other elements can react cleanly
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('biyoo-qa-open', isQaOpen);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('biyoo-qa-open');
      }
    };
  }, [isQaOpen]);

  const handleOpenQa = useCallback(() => {
    setHasEverOpened(true);
    setIsQaOpen(true);
    engine.setQaActive(true);
  }, [engine]);

  const handleCloseQa = useCallback(() => {
    setIsQaOpen(false);
    engine.setQaActive(false);
  }, [engine]);

  const handlePuppetClick = useCallback(() => {
    if (isQaOpen) {
      handleCloseQa();
    } else {
      handleOpenQa();
    }
  }, [isQaOpen, handleCloseQa, handleOpenQa]);

  // Load after first paint (client-only mount) and hide on /skip or /biyoo-test or if disabled for benchmarking
  let disabled = false;
  try {
    if (typeof sessionStorage !== 'undefined') {
      disabled = sessionStorage.getItem('biyoo_disabled') === 'true';
    }
  } catch {
    // ignore
  }

  if (!mounted || disabled || pathname === '/skip' || pathname === '/biyoo-test') {
    return null;
  }

  return (
    <aside
      aria-label="Biyoo Companion Mascot"
      data-testid="global-biyoo-container"
      className={`fixed ${isQaOpen ? 'z-50' : 'z-40'} select-none pointer-events-none flex flex-col items-end`}
      style={{
        right: 'calc(1rem + env(safe-area-inset-right, 0px))',
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Lazy-loaded Q&A Panel */}
      {hasEverOpened && (
        <BiyooQaModal
          isOpen={isQaOpen}
          onClose={handleCloseQa}
          onExpressionChange={(expr) => {
            engine.setExpression(expr);
          }}
          triggerElement={
            puppetContainerRef.current?.querySelector(
              '[data-testid="biyoo-silhouette-hitbox"]'
            ) as HTMLElement | null
          }
        />
      )}

      {/* Controls cluster: column on desktop, side-by-side row on short mobile */}
      <div className="biyoo-controls-cluster flex flex-col items-end">
        {/* Puppet Container (~140px on desktop, ~96px on mobile) - box corners remain pointer-events-none */}
        <div
          ref={puppetContainerRef}
          data-testid="biyoo-live-puppet"
          data-biyoo-puppet="global"
          data-biyoo-expression={engine.currentExpression}
          data-biyoo-mood={engine.currentMood || 'none'}
          data-biyoo-mood-section={engine.currentMoodSection || 'none'}
          className="relative w-[96px] h-[96px] sm:w-[140px] sm:h-[140px] pointer-events-none"
        >
          <span
            data-testid="biyoo-current-expression"
            className="sr-only"
            aria-hidden="true"
          >
            {engine.currentExpression}
          </span>
          <BiyooPuppet
            params={engine.faceParams}
            expression={engine.currentExpression}
            isBreathing={!engine.reducedMotion}
            isArmSwinging={!engine.reducedMotion}
            isSleeping={engine.isSleeping}
            isHopping={engine.isHopping}
            pointingArm={engine.pointingArm}
            speechBubble={engine.bubbleText}
            onDismissBubble={engine.dismissBubble}
            reducedMotion={engine.reducedMotion}
            bubbleAlign="right"
            onPuppetClick={handlePuppetClick}
          />
        </div>

        {/* Quiet Biyoo Toggle: persists in localStorage, default OFF */}
        <button
          type="button"
          id="biyoo-quiet-toggle"
          data-testid="biyoo-quiet-toggle"
          onClick={(e) => {
            e.stopPropagation();
            engine.toggleQuietMode();
          }}
          aria-label={
            engine.quietMode
              ? 'Biyoo is quiet. Click to enable reactions'
              : 'Biyoo is active. Click to quiet reactions'
          }
          title={
            engine.quietMode
              ? 'Biyoo is quiet (blink and breathe only). Click to enable reactions'
              : 'Biyoo is on. Click to quiet reactions'
          }
          className="pointer-events-auto select-none mt-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-wider transition-all duration-200 backdrop-blur-md flex items-center gap-1.5 border border-white/20 hover:border-cyan-400 bg-[#070e1d]/90 text-white/80 hover:text-cyan-200 shadow-md focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors flex-shrink-0 ${
              engine.quietMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="biyoo-toggle-text">{engine.quietMode ? 'Biyoo · quiet' : 'Biyoo · on'}</span>
        </button>
      </div>
    </aside>
  );
}

export default GlobalBiyoo;
