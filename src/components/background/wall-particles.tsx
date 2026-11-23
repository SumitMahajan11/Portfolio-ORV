'use client';

import React, { useEffect, useRef } from 'react';
import { useMode } from '@/lib/flags';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alphaAmp: number;
  alphaFreq: number;
  alphaPhase: number;
  isDust: boolean;
  dustRadius: number;
}

/**
 * Creates a single reusable offscreen radial sprite for soft dust particles.
 * Avoids expensive runtime shadowBlur calls while maintaining smooth archival motes.
 */
function createDustSprite(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const size = 32;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const sctx = sprite.getContext('2d');
  if (!sctx) return null;

  const half = size / 2;
  const gradient = sctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(94, 225, 230, 0.85)');
  gradient.addColorStop(0.4, 'rgba(94, 225, 230, 0.35)');
  gradient.addColorStop(1, 'rgba(94, 225, 230, 0)');

  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, size, size);
  return sprite;
}

/**
 * AtmosphericParticles:
 * ONE fixed Canvas 2D layer situated between the section tints and the scrim.
 * Desktop: <= 40 particles with gentle ease-in pointer repulsion.
 * Mobile: <= 12 particles with no pointer interaction.
 * Reduced motion and light mode render no canvas element at all.
 */
export function AtmosphericParticles() {
  const { mode, lightMode, reducedMotion } = useMode();
  const isInstant = lightMode || reducedMotion || mode === 'light' || mode === 'reduced';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // If reduced motion or light mode, do not run anything
    if (isInstant) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dustSprite = createDustSprite();

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId: number | null = null;
    let lastTime = 0;
    let isMobile = false;

    // Pointer state (desktop only)
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;

    const particles: Particle[] = [];

    const initSize = () => {
      if (!canvas) return;
      isMobile = window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const initParticles = () => {
      particles.length = 0;
      const count = isMobile ? 12 : 36; // Desktop <= 40, mobile <= 12
      const dustCount = Math.max(1, Math.round(count * 0.1)); // ~10% soft dust

      for (let i = 0; i < count; i++) {
        // Drift speed 2-8 px/s
        const speed = 2.0 + Math.random() * 6.0;
        // Natural gentle upward & wandering buoyancy
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.85);
        const isDust = i < dustCount;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          // Radius 0.6 - 1.8 CSS px
          radius: 0.6 + Math.random() * 1.2,
          // Alpha oscillating strictly within 0.15 - 0.5
          baseAlpha: 0.22 + Math.random() * 0.15,
          alphaAmp: 0.07 + Math.random() * 0.05,
          alphaFreq: 0.5 + Math.random() * 0.8,
          alphaPhase: Math.random() * Math.PI * 2,
          isDust,
          dustRadius: 6.0 + Math.random() * 5.0,
        });
      }
    };

    // Single animation frame loop with delta time
    const tick = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const REPULSION_RADIUS = 140;
      const MAX_REPULSION_SPEED = 48; // px/s

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Natural buoyant drift
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 2. Desktop-only gentle ease-in repulsion within ~140px
        if (!isMobile && pointerActive) {
          const dx = p.x - pointerX;
          const dy = p.y - pointerY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.001 && dist < REPULSION_RADIUS) {
            const norm = (REPULSION_RADIUS - dist) / REPULSION_RADIUS;
            const easeIn = norm * norm; // Ease-in
            const force = easeIn * MAX_REPULSION_SPEED * dt;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // 3. Screen edge wrapping
        const pad = p.isDust ? p.dustRadius * 2 : 8;
        if (p.x < -pad) p.x = width + pad;
        else if (p.x > width + pad) p.x = -pad;
        if (p.y < -pad) p.y = height + pad;
        else if (p.y > height + pad) p.y = -pad;

        // 4. Alpha calculation with slow sinusoidal variation
        const alphaRaw = p.baseAlpha + p.alphaAmp * Math.sin(p.alphaPhase + (time / 1000) * p.alphaFreq);
        const alpha = Math.max(0.15, Math.min(0.5, alphaRaw));

        // 5. Render: soft dust sprite (~10%, alpha <= 0.18) or crisp cyan dot
        if (p.isDust && dustSprite) {
          ctx.globalAlpha = Math.min(alpha, 0.18);
          ctx.drawImage(
            dustSprite,
            p.x - p.dustRadius,
            p.y - p.dustRadius,
            p.dustRadius * 2,
            p.dustRadius * 2
          );
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#5EE1E6';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    // Event listeners
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initSize();
        // Keep particles on screen after resize
        for (const p of particles) {
          if (p.x > width) p.x = Math.random() * width;
          if (p.y > height) p.y = Math.random() * height;
        }
      }, 150);
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerActive = true;
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      pointerX = -9999;
      pointerY = -9999;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        lastTime = performance.now();
        if (!rafId) {
          rafId = requestAnimationFrame(tick);
        }
      }
    };

    // Start only after window load + idle (no impact on LCP)
    let idleHandle: number | ReturnType<typeof setTimeout> | null = null;
    const startSimulation = () => {
      initSize();
      initParticles();

      window.addEventListener('resize', handleResize, { passive: true });
      document.addEventListener('visibilitychange', handleVisibility);

      if (!isMobile) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
      }

      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const scheduleStart = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleHandle = (window as Window).requestIdleCallback(
          () => {
            startSimulation();
          },
          { timeout: 2000 }
        );
      } else {
        idleHandle = setTimeout(startSimulation, 200);
      }
    };

    if (document.readyState === 'complete') {
      scheduleStart();
    } else {
      window.addEventListener('load', scheduleStart, { once: true });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (idleHandle) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleHandle === 'number') {
          (window as Window).cancelIdleCallback(idleHandle);
        } else {
          clearTimeout(idleHandle as ReturnType<typeof setTimeout>);
        }
      }
      window.removeEventListener('load', scheduleStart);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [isInstant]);

  // Reduced motion and light mode: render NO canvas element at all
  if (isInstant) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="living-wall-particles fixed inset-0 pointer-events-none select-none"
      style={{
        zIndex: 1, // Sits above tints and wall, below scrim
      }}
    />
  );
}
