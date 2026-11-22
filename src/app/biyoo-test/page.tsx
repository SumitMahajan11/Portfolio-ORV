'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { notFound } from 'next/navigation';
import {
  BiyooPuppet,
  BIYOO_PRESETS,
  calculateLookAt,
  useFaceTransition,
  useBiyooIdleEngine,
  type BiyooExpressionName,
  type BiyooFaceParams,
  type Point2D,
} from '@/components/biyoo/puppet';

// Mapping of preset to its reference image in public/biyoo/reference/
const PRESET_REFERENCE_MAP: Record<
  BiyooExpressionName,
  {
    image: string;
    label: string;
    notes: string;
  }
> = {
  neutral: {
    image: '/biyoo/reference/cell_0_0.png',
    label: 'Neutral',
    notes: 'Big round dark eyes, upper-left large highlight, lower-right small highlight, gentle cat smile.',
  },
  happy: {
    image: '/biyoo/reference/cell_0_1.png',
    label: 'Happy',
    notes: 'Closed upward arc eyes (^ ^) + open smile with pink mouth fill.',
  },
  excited: {
    image: '/biyoo/reference/cell_0_1.png',
    label: 'Excited',
    notes: '> < squeeze eyes + wide open smile (adapted from Happy reference).',
  },
  surprised: {
    image: '/biyoo/reference/cell_0_2.png',
    label: 'Surprised',
    notes: 'Eyes ~1.25x larger than Neutral (115px), dark glossy dual highlights, curved brow arcs, open oval mouth.',
  },
  sad: {
    image: '/biyoo/reference/cell_1_0.png',
    label: 'Sad',
    notes: 'Curved watery moisture highlight band along lower eye edge, inward-up tilted brows, downturned mouth.',
  },
  confused: {
    image: '/biyoo/reference/cell_1_1.png',
    label: 'Confused',
    notes: 'Raised brow higher, one eye ~10% larger than other, wavy squiggly mouth (~).',
  },
  sleepy: {
    image: '/biyoo/reference/cell_1_2.png',
    label: 'Sleepy',
    notes: 'Half-closed upper lids (no under-eye bags), flat line mouth (-).',
  },
  sleeping: {
    image: '/biyoo/reference/cell_2_0.png',
    label: 'Sleeping',
    notes: 'Downward curved arc eyes with eyelash ticks (u u), peaceful small smile, floating zzz particles.',
  },
  curious: {
    image: '/biyoo/reference/cell_2_1.png',
    label: 'Curious',
    notes: 'Eyes +8px R, -10px U, upper-right highlights, tilted ~4°, one brow raised higher, small "o" mouth.',
  },
  blink: {
    image: '/biyoo/reference/cell_2_2.png',
    label: 'Blink',
    notes: 'Closed flat horizontal slit lines (- -), neutral mouth.',
  },
};

// 9 Canonical Expressions in 3x3 grid order corresponding to E-expressions.png
const CANONICAL_9_EXPRESSIONS: {
  preset: BiyooExpressionName;
  label: string;
  row: number;
  col: number;
  refImage: string;
}[] = [
  { preset: 'neutral', label: 'Neutral', row: 0, col: 0, refImage: '/biyoo/reference/cell_0_0.png' },
  { preset: 'happy', label: 'Happy', row: 0, col: 1, refImage: '/biyoo/reference/cell_0_1.png' },
  { preset: 'surprised', label: 'Surprised', row: 0, col: 2, refImage: '/biyoo/reference/cell_0_2.png' },
  { preset: 'sad', label: 'Sad', row: 1, col: 0, refImage: '/biyoo/reference/cell_1_0.png' },
  { preset: 'confused', label: 'Confused', row: 1, col: 1, refImage: '/biyoo/reference/cell_1_1.png' },
  { preset: 'sleepy', label: 'Sleepy', row: 1, col: 2, refImage: '/biyoo/reference/cell_1_2.png' },
  { preset: 'sleeping', label: 'Sleeping', row: 2, col: 0, refImage: '/biyoo/reference/cell_2_0.png' },
  { preset: 'curious', label: 'Curious', row: 2, col: 1, refImage: '/biyoo/reference/cell_2_1.png' },
  { preset: 'blink', label: 'Blink', row: 2, col: 2, refImage: '/biyoo/reference/cell_2_2.png' },
];

// Step 3: The 7 States of the Expression Engine & Idle Chain
const STEP3_IDLE_STATES: {
  id: string;
  name: BiyooExpressionName;
  label: string;
  badge: string;
  bubble: string | null;
  isSleeping?: boolean;
  notes: string;
}[] = [
  {
    id: 'state-1',
    name: 'neutral',
    label: 'Neutral',
    badge: 'State 1 · Idle Life',
    bubble: null,
    notes: 'Always-on idle life: breathing (~1.5%), arm swing, eye drift, random blink (3-6s).',
  },
  {
    id: 'state-2',
    name: 'curious',
    label: 'Curious + Bubble',
    badge: 'State 2 · 15s Inactive',
    bubble: 'hey... still there?',
    notes: 'Eyes shifted up-right, 4° face tilt, raised brow. One-line bubble fades after 4s.',
  },
  {
    id: 'state-3',
    name: 'sleepy',
    label: 'Sleepy + Bubble',
    badge: 'State 3 · 30s Inactive',
    bubble: '...getting sleepy',
    notes: 'Half-closed upper lids (no bags), flat line mouth. Cooldown & click-to-dismiss.',
  },
  {
    id: 'state-4',
    name: 'sleeping',
    label: 'Sleeping + ZZZ',
    badge: 'State 4 · 60s Inactive',
    bubble: null,
    isSleeping: true,
    notes: 'Downward curved arc eyes (u u), slow animated "z z z" floating upward, no bubble.',
  },
  {
    id: 'state-5',
    name: 'surprised',
    label: 'Surprised (Hop)',
    badge: 'State 5 · Wake Step 1',
    bubble: null,
    notes: 'Activity after sleeping: 600ms Surprised with small vertical hop animation.',
  },
  {
    id: 'state-6',
    name: 'happy',
    label: 'Happy + Bubble',
    badge: 'State 6 · Wake Step 2',
    bubble: "oh! you're back",
    notes: 'Wake step 2: Happy for 2s with bubble "oh! you\'re back", then returns to Neutral.',
  },
  {
    id: 'state-7',
    name: 'sad',
    label: 'Sad (Tab Away)',
    badge: 'State 7 · Tab Hidden > 3s',
    bubble: null,
    notes: 'Tab hidden > 3s: Sad + title "Biyoo misses you". On return: Happy (2s) + restores title.',
  },
];

export default function BiyooTestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [mounted, setMounted] = useState(false);
  const [bgTheme, setBgTheme] = useState<'dark' | 'light' | 'green'>('dark');
  const [showFaceZone, setShowFaceZone] = useState<boolean>(false);
  const [forceBypassGate, setForceBypassGate] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize the Biyoo Expression Engine & Idle Chain hook
  const idleEngine = useBiyooIdleEngine({ initialIdleScale: 1.0 });

  // Expose idleEngine globally for automated verification & console inspection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __biyooEngine: unknown }).__biyooEngine = idleEngine;
    }
  }, [idleEngine]);

  // Target look point for pupil tracking
  const [lookTarget, setLookTarget] = useState<Point2D>({ x: 515, y: 495 });
  const [isDraggingTarget, setIsDraggingTarget] = useState<boolean>(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Change preset manually via idleEngine
  const handleSelectPreset = useCallback(
    (name: BiyooExpressionName) => {
      idleEngine.forceState(name);
    },
    [idleEngine]
  );

  // Handle pupil look-at point update
  const updateLookPointFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      const canvasX = normX * 1024;
      const canvasY = normY * 1024;
      setLookTarget({ x: canvasX, y: canvasY });
    },
    []
  );

  // Mouse / Touch handlers for draggable look point
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingTarget(true);
    updateLookPointFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingTarget) return;
    updateLookPointFromClient(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsDraggingTarget(false);
  };

  // Background style
  const bgStyles = {
    dark: 'bg-[#0a1428] text-slate-100',
    light: 'bg-[#f0f0f0] text-slate-900',
    green: 'bg-[#00ff00] text-slate-900',
  };

  const currentScale = idleEngine.idleScale;
  const t15 = (15 * currentScale).toFixed(1);
  const t30 = (30 * currentScale).toFixed(1);
  const t60 = (60 * currentScale).toFixed(1);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0a1428]" />;
  }

  return (
    <div
      className={`relative z-20 min-h-screen p-4 md:p-8 font-sans transition-colors duration-300 ${bgStyles[bgTheme]}`}
    >
      {/* Suppress site-wide fixed layout elements and Next.js dev indicator on this testbench */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .living-wall-compositor,
        .living-wall-scrim,
        .living-wall-tints,
        [data-biyoo-companion],
        .biyoo-companion,
        [class*="BiyooCompanion"],
        #sound-permission-prompt,
        .sound-permission-prompt-pos,
        [class*="CornerBountyButton"],
        nextjs-portal,
        #__next-build-watcher,
        header.sticky {
          display: none !important;
        }
        body {
          overflow-y: auto !important;
        }
      `,
        }}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Biyoo Puppet Testbench</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                Step 3: Expression Engine & Idle Chain
              </span>
            </h1>
            <p className="text-sm opacity-70 mt-1">
              Autonomous idle life: breathing (~1.5%), arm swing, eye drift, random blink (3-6s), inactivity chain (15s/30s/60s), wake hop, tab away/return.
            </p>
          </div>

          {/* Theme toggles */}
          <div className="flex items-center gap-2 text-xs">
            <span className="opacity-60">Backdrop:</span>
            <button
              onClick={() => setBgTheme('dark')}
              className={`px-3 py-1.5 rounded font-mono ${
                bgTheme === 'dark' ? 'bg-cyan-500 text-black font-semibold' : 'bg-black/30 hover:bg-black/50'
              }`}
            >
              Dark #0a1428
            </button>
            <button
              onClick={() => setBgTheme('light')}
              className={`px-3 py-1.5 rounded font-mono ${
                bgTheme === 'light' ? 'bg-cyan-500 text-black font-semibold' : 'bg-black/30 hover:bg-black/50'
              }`}
            >
              Light #f0f0f0
            </button>
            <button
              onClick={() => setBgTheme('green')}
              className={`px-3 py-1.5 rounded font-mono ${
                bgTheme === 'green' ? 'bg-cyan-500 text-black font-semibold' : 'bg-black/30 hover:bg-black/50'
              }`}
            >
              Green #00FF00
            </button>
          </div>
        </header>

        {/* Main Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Puppet Canvas with Live Idle Life */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div
              ref={stageRef}
              data-testid="puppet-stage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full max-w-[540px] aspect-square rounded-2xl shadow-2xl border border-white/20 overflow-visible cursor-crosshair touch-none select-none flex items-center justify-center p-4 bg-slate-900/60"
            >
              {/* Assembled Puppet with live Idle State, Breathing, Arm Swing, and Bubble */}
              <BiyooPuppet
                params={idleEngine.faceParams}
                showFaceZone={showFaceZone}
                isBreathing={!idleEngine.reducedMotion}
                isArmSwinging={!idleEngine.reducedMotion}
                isSleeping={idleEngine.isSleeping}
                isHopping={idleEngine.isHopping}
                pointingArm={idleEngine.pointingArm}
                speechBubble={idleEngine.bubbleText}
                onDismissBubble={idleEngine.dismissBubble}
                reducedMotion={idleEngine.reducedMotion}
              />

              {/* Status Badge */}
              <div
                data-testid="active-state-badge"
                className="absolute top-3 right-3 text-[11px] font-mono px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-md font-bold uppercase tracking-wider"
              >
                {idleEngine.currentExpression}
              </div>

              {/* Inactivity Live Ticker */}
              <div
                data-testid="inactivity-ticker"
                className="absolute bottom-3 left-3 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-black/80 text-white/90 pointer-events-none backdrop-blur-md border border-white/10 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Inactive: <strong>{idleEngine.idleSeconds.toFixed(1)}s</strong> (Scale: {currentScale}x)
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="w-full max-w-[540px] mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                data-testid="blink-btn"
                onClick={idleEngine.triggerBlink}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-300 animate-pulse" />
                Random Blink
              </button>

              <button
                data-testid="hop-btn"
                onClick={idleEngine.triggerHop}
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                Trigger Hop
              </button>

              <button
                data-testid="wake-sequence-btn"
                onClick={idleEngine.triggerWakeSequence}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                Wake Seq
              </button>

              <button
                data-testid="trigger-bubble-btn"
                onClick={() => idleEngine.triggerReactionBubble('Test bubble reaction')}
                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                Test Bubble
              </button>

              <button
                data-testid="reset-inactivity-btn"
                onClick={idleEngine.resetInactivity}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono transition-all cursor-pointer"
              >
                Reset
              </button>

              <label className="flex items-center gap-2 cursor-pointer font-mono select-none">
                <input
                  type="checkbox"
                  checked={showFaceZone}
                  onChange={(e) => setShowFaceZone(e.target.checked)}
                  className="rounded text-pink-500"
                />
                Zone
              </label>
            </div>
          </div>

          {/* Right Column: Step 3 Engine Controls & Event Log */}
          <div className="lg:col-span-6 space-y-5">
            {/* Control Panel: Inactivity Chain & Scaling */}
            <div className="bg-slate-900/90 rounded-xl p-5 border border-white/10 shadow-lg backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <h2 className="text-sm font-bold tracking-wide uppercase">
                    Step 3: Idle Chain Engine
                  </h2>
                </div>
                <div className="text-xs font-mono text-cyan-300">
                  State: <strong className="uppercase">{idleEngine.currentExpression}</strong>
                </div>
              </div>

              {/* Time Scale Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-mono opacity-80">Time Scale (?idleScale=):</span>
                <div className="flex items-center gap-2 font-mono">
                  {[
                    { label: '0.1x (1.5s/3s/6s)', val: 0.1 },
                    { label: '0.5x (7.5s/15s/30s)', val: 0.5 },
                    { label: '1.0x (15s/30s/60s)', val: 1.0 },
                  ].map((sc) => (
                    <button
                      key={sc.val}
                      data-testid={`scale-btn-${sc.val}`}
                      onClick={() => idleEngine.setIdleScale(sc.val)}
                      className={`px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                        Math.abs(idleEngine.idleScale - sc.val) < 0.01
                          ? 'bg-cyan-500 text-black font-bold shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-white/90'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestones Visualizer */}
              <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Inactive: {idleEngine.idleSeconds.toFixed(1)}s</span>
                  <span>Thresholds: {t15}s · {t30}s · {t60}s</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 h-full transition-all duration-100"
                    style={{
                      width: `${Math.min(100, (idleEngine.idleSeconds / (60 * currentScale)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className={idleEngine.idleSeconds >= 15 * currentScale ? 'text-cyan-300 font-bold' : ''}>
                    15s: Curious
                  </span>
                  <span className={idleEngine.idleSeconds >= 30 * currentScale ? 'text-indigo-300 font-bold' : ''}>
                    30s: Sleepy
                  </span>
                  <span className={idleEngine.idleSeconds >= 60 * currentScale ? 'text-purple-300 font-bold' : ''}>
                    60s: Sleeping
                  </span>
                </div>
              </div>

              {/* Toggles: Quiet Biyoo & Reduced Motion */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  data-testid="quiet-toggle-btn"
                  onClick={() => idleEngine.setQuietMode(!idleEngine.quietMode)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    idleEngine.quietMode
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-xs uppercase flex items-center justify-between">
                    <span>Quiet Biyoo</span>
                    <span className="font-mono text-[10px]">
                      {idleEngine.quietMode ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-1 leading-snug">
                    Disables bubbles & idle reactions. Keeps blink/breathing.
                  </div>
                </button>

                <button
                  data-testid="reduced-motion-btn"
                  onClick={() => idleEngine.setReducedMotion(!idleEngine.reducedMotion)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    idleEngine.reducedMotion
                      ? 'bg-purple-500/20 border-purple-400/60 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-xs uppercase flex items-center justify-between">
                    <span>Reduced Motion</span>
                    <span className="font-mono text-[10px]">
                      {idleEngine.reducedMotion ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-1 leading-snug">
                    Disables breathing, arm swing & hop. Instant swaps only.
                  </div>
                </button>
              </div>

              {/* Tab Away / Back Simulation */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono opacity-80">Tab Hidden & Return:</span>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[240px]">
                    doc.title: &quot;{typeof document !== 'undefined' ? document.title : ''}&quot;
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    data-testid="sim-tab-away-btn"
                    onClick={idleEngine.simulateTabAway}
                    className="px-3 py-2 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-mono transition-all cursor-pointer text-center"
                  >
                    Simulate Tab Hidden (&gt;3s Sad)
                  </button>
                  <button
                    data-testid="sim-tab-return-btn"
                    onClick={idleEngine.simulateTabReturn}
                    className="px-3 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-mono transition-all cursor-pointer text-center"
                  >
                    Simulate Tab Visible (Happy 2s)
                  </button>
                </div>
              </div>

              {/* Force Gate Bypass Checkbox */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-black/40 border border-white/5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                    <input
                      type="checkbox"
                      data-testid="force-bypass-gate-checkbox"
                      checked={forceBypassGate}
                      onChange={(e) => setForceBypassGate(e.target.checked)}
                      className="rounded text-pink-500 cursor-pointer"
                    />
                    <span className="font-bold">Force Bypass Gate</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {forceBypassGate ? '⚠️ Bypasses 20s gate & quiet' : '🛡️ Gate Enforced (default)'}
                  </span>
                </div>
              </div>

              {/* Manual Force Buttons for all 7 Verification States */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-xs font-mono opacity-80">Manual Expression Triggers (Bypass toggleable):</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    data-testid="force-neutral-btn"
                    onClick={() => idleEngine.forceState('neutral', null, null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white/90 text-xs font-mono text-left border border-white/5 cursor-pointer"
                  >
                    1. Neutral
                  </button>
                  <button
                    data-testid="force-curious-btn"
                    onClick={() => idleEngine.forceState('curious', 'hey... still there?', null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-mono text-left border border-cyan-700/40 cursor-pointer"
                  >
                    2. Curious+Bubble
                  </button>
                  <button
                    data-testid="force-sleepy-btn"
                    onClick={() => idleEngine.forceState('sleepy', '...getting sleepy', null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 text-xs font-mono text-left border border-indigo-700/40 cursor-pointer"
                  >
                    3. Sleepy+Bubble
                  </button>
                  <button
                    data-testid="force-sleeping-btn"
                    onClick={() => idleEngine.forceState('sleeping', null, null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs font-mono text-left border border-purple-700/40 cursor-pointer"
                  >
                    4. Sleeping+ZZZ
                  </button>
                  <button
                    data-testid="force-surprised-btn"
                    onClick={() => idleEngine.forceState('surprised', null, null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-200 text-xs font-mono text-left border border-amber-700/40 cursor-pointer"
                  >
                    5. Surprised (Hop)
                  </button>
                  <button
                    data-testid="force-happy-btn"
                    onClick={() => idleEngine.forceState('happy', "oh! you're back", null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-mono text-left border border-emerald-700/40 cursor-pointer"
                  >
                    6. Happy+Bubble
                  </button>
                  <button
                    data-testid="force-sad-btn"
                    onClick={() => idleEngine.forceState('sad', null, null, forceBypassGate)}
                    className="px-2.5 py-2 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-200 text-xs font-mono text-left border border-blue-700/40 cursor-pointer col-span-2 sm:col-span-1"
                  >
                    7. Sad
                  </button>
                </div>
              </div>

              {/* Step 4: Scroll & Cursor Behaviors (Reaction Gate) */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono opacity-80">
                  <span>Step 4: Sensor &amp; Reactive Behaviors:</span>
                  <span className="text-[10px] text-cyan-300">
                    {forceBypassGate ? '⚠️ Gate Bypassed' : '🛡️ 20s Gate Protected'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    data-testid="trigger-fast-scroll-btn"
                    onClick={() => idleEngine.triggerFastScroll(undefined, undefined, forceBypassGate)}
                    className="px-3 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/40 text-amber-200 text-left transition-all cursor-pointer"
                  >
                    ⚡ Fast Scroll (&gt;3000px/s)
                  </button>
                  <button
                    data-testid="trigger-linger-btn"
                    onClick={() => idleEngine.triggerLinger(undefined, undefined, forceBypassGate)}
                    className="px-3 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-600/40 text-indigo-200 text-left transition-all cursor-pointer"
                  >
                    ⏳ Linger (10s in view)
                  </button>
                  <button
                    data-testid="trigger-cursor-still-btn"
                    onClick={() => idleEngine.triggerCursorStill('left', undefined, forceBypassGate)}
                    className="px-3 py-2 rounded-lg bg-pink-950/60 hover:bg-pink-900/80 border border-pink-600/40 text-pink-200 text-left transition-all cursor-pointer"
                  >
                    👈 Point Left Arm (2.5s)
                  </button>
                  <button
                    data-testid="trigger-cursor-still-right-btn"
                    onClick={() => idleEngine.triggerCursorStill('right', undefined, forceBypassGate)}
                    className="px-3 py-2 rounded-lg bg-pink-950/60 hover:bg-pink-900/80 border border-pink-600/40 text-pink-200 text-left transition-all cursor-pointer"
                  >
                    👉 Point Right Arm (2.5s)
                  </button>
                  <button
                    data-testid="trigger-skip-bottom-btn"
                    onClick={() => idleEngine.triggerSkipBottom(undefined, undefined, forceBypassGate)}
                    className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/40 text-rose-200 text-left transition-all cursor-pointer col-span-2"
                  >
                    🚀 Skip to Bottom (&lt;10% to &gt;90% in 2s)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Event Log */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-white/10 shadow-lg backdrop-blur-sm space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono font-bold uppercase text-slate-300">
                  Event Firing Log ({idleEngine.logEntries.length})
                </span>
                <span className="text-[10px] font-mono text-slate-500">Live State Stream</span>
              </div>
              <div
                data-testid="event-log-container"
                className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-1 select-text"
              >
                {idleEngine.logEntries.length === 0 ? (
                  <div className="text-slate-500 italic p-2">Awaiting state transitions...</div>
                ) : (
                  idleEngine.logEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      data-testid={`log-entry-${entry.state}`}
                      className="p-1.5 rounded bg-black/40 border border-white/5 flex items-start gap-2"
                    >
                      <span className="text-cyan-400 font-semibold shrink-0">{entry.timeString}</span>
                      <span className="text-xs px-1.5 py-0.2 rounded bg-white/10 uppercase font-bold shrink-0">
                        {entry.state}
                      </span>
                      <span className="text-slate-300 truncate">{entry.action}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 Mock Sensors: Pointing Targets & Linger Story Section */}
        <section className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
              Step 4 Sensor Test Zones: Cursor Still &amp; Linger
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              Hover &gt;2.5s for arm pointing · Linger &gt;10s for curious line
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-wrap gap-4 items-center justify-between">
            <span className="text-xs font-mono opacity-80">
              Interactive Targets (hover still 2.5s):
            </span>
            <div className="flex gap-3">
              <button
                data-biyoo-point="true"
                data-testid="biyoo-point-target-left"
                className="px-4 py-2 rounded-lg bg-pink-600/30 border border-pink-500/50 text-pink-200 text-xs font-mono hover:bg-pink-600/50 cursor-pointer transition-all"
              >
                👈 Target Left [data-biyoo-point]
              </button>
              <button
                data-biyoo-point="true"
                data-testid="biyoo-point-target-right"
                className="px-4 py-2 rounded-lg bg-cyan-600/30 border border-cyan-500/50 text-cyan-200 text-xs font-mono hover:bg-cyan-600/50 cursor-pointer transition-all"
              >
                👉 Target Right [data-biyoo-point]
              </button>
            </div>
          </div>

          {/* Mock Linger Section */}
          <div
            data-biyoo-linger="true"
            data-biyoo-line="reading this part closely, huh?"
            data-testid="biyoo-linger-section"
            className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-purple-950/70 border border-indigo-500/40 space-y-3"
            style={{ minHeight: '360px' }}
          >
            <div className="inline-block px-3 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs">
              [data-biyoo-linger] · Linger Sensor Target (&gt;50% in view for 10s with no scroll)
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white">
              The Lore of Biyoo &amp; The Constellations
            </h3>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
              &quot;Biyoo floated through the dimensional rift, tiny horns glowing with starlight. Whether the reader scrolls furiously past the scenarios or pauses to reflect upon the broken chronicles, the dokkaebi observes silently. Linger upon this passage for ten seconds without scrolling, and Biyoo will tilt curiously to see what held your gaze.&quot;
            </p>
          </div>
        </section>

        {/* Section 10: Step 4 Contact Sheet of 4 Reactive Behaviors */}
        <section id="step4-reactions-section" className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>Step 4: Scroll &amp; Cursor Reactive Behaviors (4 States)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Sensor Behaviors
                </span>
              </h2>
              <p className="text-sm opacity-70 mt-1">
                Fast scroll (&gt;3000px/s), Linger (10s in view), Cursor still (2.5s pointing nearest arm), and Skip to bottom (&lt;10% to &gt;90% in 2s).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/biyoo/step4-reactions-contact-sheet.png"
                download="biyoo-step4-reactions-contact-sheet.png"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Download Step 4 Contact Sheet PNG</span>
              </a>
            </div>
          </div>

          {/* Section 11: Dedicated Neutral vs Curious Live DOM Side-by-Side (1:1) */}
          <div className="flex flex-col items-center justify-center my-6 space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-300 font-bold">
              Neutral vs Curious · Live Page DOM (1:1 Side-by-Side)
            </div>
            <div
              id="live-dom-neutral-curious"
              data-testid="live-dom-neutral-curious"
              className="flex flex-wrap items-center justify-center gap-8 p-6 bg-[#081020] rounded-2xl border border-cyan-500/40 shadow-2xl"
            >
              {/* Neutral Live DOM Card */}
              <div
                data-testid="live-dom-neutral-card"
                className="flex flex-col items-center bg-[#0a1428] rounded-2xl p-4 border border-white/10 shadow-xl"
                style={{ width: '420px', height: '420px' }}
              >
                <div className="w-full flex items-center justify-between text-xs font-mono text-cyan-400 mb-2 px-1">
                  <span className="font-bold uppercase tracking-wider">Neutral</span>
                  <span className="text-slate-400 font-bold">Live DOM 1:1</span>
                </div>
                <div className="w-full h-full flex items-center justify-center overflow-visible relative">
                  <BiyooPuppet params={BIYOO_PRESETS.neutral} />
                </div>
              </div>

              {/* Curious Live DOM Card */}
              <div
                data-testid="live-dom-curious-card"
                className="flex flex-col items-center bg-[#0a1428] rounded-2xl p-4 border border-cyan-500/50 shadow-xl"
                style={{ width: '420px', height: '420px' }}
              >
                <div className="w-full flex items-center justify-between text-xs font-mono text-cyan-300 mb-2 px-1">
                  <span className="font-bold uppercase tracking-wider">Curious</span>
                  <span className="text-cyan-400 font-bold">Tilt &gt;=6° · Pupils Up-Right</span>
                </div>
                <div className="w-full h-full flex items-center justify-center overflow-visible relative">
                  <BiyooPuppet params={BIYOO_PRESETS.curious} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 10B: Dedicated 1:1 Arm Point Single Cell (Requirement 1) */}
          <div className="flex flex-col items-center justify-center my-6 space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-pink-400 font-bold">
              Arm-Point: Raised Arm Toward Target (1:1 Cell)
            </div>
            <div
              id="step4-arm-point-single-cell"
              data-testid="step4-arm-point-single-card"
              className="w-[480px] h-[480px] bg-[#0a1428] rounded-2xl p-6 border border-pink-500/50 shadow-2xl relative flex items-center justify-center overflow-visible"
              style={{ width: '480px', height: '480px' }}
            >
              <BiyooPuppet
                params={BIYOO_PRESETS.curious}
                pointingArm="left"
                speechBubble="that one's good"
              />
            </div>
          </div>

          {/* Contact Sheet Container for Playwright Capture */}
          <div
            id="step4-contact-sheet-container"
            data-testid="step4-reactions-grid"
            className="p-6 md:p-8 rounded-2xl bg-[#081020] border border-white/15 shadow-2xl max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="text-center pb-5 border-b border-white/10 mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] tracking-widest uppercase mb-2">
                Biyoo Reactive Engine · Step 4 Sensor Verification Matrix
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-widest text-white">
                4 Sensor-Driven Reactive Behaviors
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Approved Body (885px width) · 20s Reaction Gate · Speech Bubbles &amp; Arm Pointing
              </p>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* 1. Fast Scroll */}
              <div
                data-testid="step4-card-fast-scroll"
                className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-amber-500/40 shadow-xl relative overflow-visible"
              >
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-amber-400 mb-2 px-1">
                  <span className="font-bold tracking-wider uppercase">Fast Scroll</span>
                  <span className="text-slate-400 font-bold">&gt;3000px/s</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                  <BiyooPuppet
                    params={BIYOO_PRESETS.confused}
                    speechBubble="slow down, the story's not going anywhere"
                  />
                </div>
                <div className="mt-3 text-center w-full space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Confused + Bubble
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 leading-tight">
                    Triggered when scroll &gt;3000px/s sustained for 400ms. Holds 1.5s.
                  </div>
                </div>
              </div>

              {/* 2. Linger */}
              <div
                data-testid="step4-card-linger"
                className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-indigo-500/40 shadow-xl relative overflow-visible"
              >
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-indigo-400 mb-2 px-1">
                  <span className="font-bold tracking-wider uppercase">Linger</span>
                  <span className="text-slate-400 font-bold">&gt;10s in view</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                  <BiyooPuppet
                    params={BIYOO_PRESETS.curious}
                    speechBubble="reading this part closely, huh?"
                  />
                </div>
                <div className="mt-3 text-center w-full space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Curious + Bubble
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 leading-tight">
                    Triggered when [data-biyoo-linger] &gt;50% visible with no scroll for 10s.
                  </div>
                </div>
              </div>

              {/* 3. Cursor Still (Arm Point) */}
              <div
                data-testid="step4-card-cursor-still"
                className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-pink-500/40 shadow-xl relative overflow-visible"
              >
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-pink-400 mb-2 px-1">
                  <span className="font-bold tracking-wider uppercase">Cursor Still</span>
                  <span className="text-slate-400 font-bold">2.5s hover</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                  <BiyooPuppet
                    params={BIYOO_PRESETS.curious}
                    pointingArm="left"
                    speechBubble="that one's good"
                  />
                </div>
                <div className="mt-3 text-center w-full space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Arm-Point + Bubble
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 leading-tight">
                    Cursor still 2.5s over button/link: raises nearest arm toward target.
                  </div>
                </div>
              </div>

              {/* 4. Skip to Bottom */}
              <div
                data-testid="step4-card-skip-bottom"
                className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-rose-500/40 shadow-xl relative overflow-visible"
              >
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-rose-400 mb-2 px-1">
                  <span className="font-bold tracking-wider uppercase">Skip to Bottom</span>
                  <span className="text-slate-400 font-bold">&lt;10% to &gt;90% in 2s</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                  <BiyooPuppet
                    params={BIYOO_PRESETS.surprised}
                    speechBubble="you skipped the story?"
                  />
                </div>
                <div className="mt-3 text-center w-full space-y-1">
                  <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                    Surprised + Bubble
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 leading-tight">
                    Rapid jump from under 10% to over 90% of page within 2 seconds.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Biyoo Mascot · Step 4 Reactive Engine</span>
              </div>
              <div>Single Reaction Gate · 20s Cooldown · Non-Interrupting Priority</div>
            </div>
          </div>
        </section>

        {/* Scroll Spacer to provide page height for real scroll & skip-to-bottom testing */}
        <div
          data-testid="scroll-test-spacer"
          className="w-full py-12 flex flex-col items-center justify-center text-xs font-mono text-slate-500 border border-dashed border-white/10 rounded-xl my-8 space-y-2"
          style={{ minHeight: '1400px' }}
        >
          <div className="p-3 rounded bg-black/40 border border-white/5 text-center">
            [Scroll Test Runway] · Height 1400px provides &gt;90% page height span for scroll sensor verification
          </div>
        </div>

        {/* Section 9: Step 3 Contact Sheet of All 7 Idle Engine States */}
        <section id="step3-states-section" className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>Step 3: Expression Engine &amp; Idle Chain (7 States)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Engine Matrix
                </span>
              </h2>
              <p className="text-sm opacity-70 mt-1">
                Full lifecycle verification: Neutral, Curious+bubble, Sleepy+bubble, Sleeping+zzz, Surprised (hop), Happy+bubble, and Sad on approved body.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/biyoo/step3-idle-contact-sheet.png"
                download="biyoo-step3-idle-contact-sheet.png"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Download Step 3 Contact Sheet PNG</span>
              </a>
            </div>
          </div>

          {/* Contact Sheet Container for Playwright Capture */}
          <div
            id="step3-contact-sheet-container"
            data-testid="step3-states-grid"
            className="p-6 md:p-8 rounded-2xl bg-[#081020] border border-white/15 shadow-2xl max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="text-center pb-5 border-b border-white/10 mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] tracking-widest uppercase mb-2">
                Biyoo Expression Engine · Step 3 Verification Matrix
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-widest text-white">
                7 States of Expression Engine &amp; Idle Chain
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Approved Body (885px width) · Real-Time State Machine · One-Line Speech Bubbles · Animated ZZZ
              </p>
            </div>

            {/* 7 States Grid (Top row: 4 cards, Bottom row: 3 cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {STEP3_IDLE_STATES.slice(0, 4).map((item) => {
                const presetParams = BIYOO_PRESETS[item.name];
                return (
                  <div
                    key={item.id}
                    data-testid={`card-${item.id}`}
                    className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-white/10 shadow-xl relative overflow-visible"
                  >
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2 px-1">
                      <span className="font-bold tracking-wider uppercase">{item.badge}</span>
                      <span className="text-slate-400 uppercase font-bold">{item.name}</span>
                    </div>

                    <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                      <BiyooPuppet
                        params={presetParams}
                        speechBubble={item.bubble}
                        isSleeping={item.isSleeping}
                        isBreathing={item.name === 'neutral'}
                        isArmSwinging={item.name === 'neutral'}
                      />
                    </div>

                    <div className="mt-3 text-center w-full space-y-1">
                      <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 leading-tight">
                        {item.notes}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom row: 3 cards centered */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6 max-w-4xl mx-auto">
              {STEP3_IDLE_STATES.slice(4, 7).map((item) => {
                const presetParams = BIYOO_PRESETS[item.name];
                return (
                  <div
                    key={item.id}
                    data-testid={`card-${item.id}`}
                    className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-white/10 shadow-xl relative overflow-visible"
                  >
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2 px-1">
                      <span className="font-bold tracking-wider uppercase">{item.badge}</span>
                      <span className="text-slate-400 uppercase font-bold">{item.name}</span>
                    </div>

                    <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-visible relative">
                      <BiyooPuppet
                        params={presetParams}
                        speechBubble={item.bubble}
                        isSleeping={item.isSleeping}
                      />
                    </div>

                    <div className="mt-3 text-center w-full space-y-1">
                      <div className="font-extrabold text-sm uppercase tracking-wider text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 leading-tight">
                        {item.notes}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Biyoo Mascot · Portfolio ORV Step 3</span>
              </div>
              <div>Single State Machine · 180ms Transitions · Local Execution Only</div>
            </div>
          </div>
        </section>

        {/* Section 7: 3x3 Contact Sheet of All 9 Canonical Expressions on Approved Body */}
        <section id="contact-sheet-section" className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>3×3 Contact Sheet (Approved Body)</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Canonical 9
                </span>
              </h2>
              <p className="text-sm opacity-70 mt-1">
                All 9 canonical expressions from <code className="text-cyan-400 font-mono">artwork/biyoo/source/E-expressions.png</code> in exact 3×3 grid order, rendered on the approved body assembly with labels.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/biyoo/contact-sheet.png"
                download="biyoo-9-expressions-contact-sheet.png"
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Download Contact Sheet PNG</span>
              </a>
            </div>
          </div>

          {/* Contact Sheet Container (Target for High-Res Export) */}
          <div
            id="biyoo-contact-sheet"
            data-testid="biyoo-contact-sheet-3x3"
            className="p-6 md:p-10 rounded-2xl bg-[#081020] border border-white/15 shadow-2xl max-w-5xl mx-auto"
            style={{ minWidth: '768px' }}
          >
            {/* Contact Sheet Header */}
            <div className="text-center pb-6 border-b border-white/10 mb-8">
              <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] tracking-widest uppercase mb-2">
                Biyoo Model Sheet · Contact Matrix
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-white">
                Biyoo 9 Expressions
              </h3>
              <p className="text-xs md:text-sm font-mono text-slate-400 mt-2">
                Approved Body Assembly · Vector Face Synthesis · 3×3 Matrix Order
              </p>
            </div>

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-6 md:gap-8">
              {CANONICAL_9_EXPRESSIONS.map((item) => {
                const presetParams = BIYOO_PRESETS[item.preset];
                return (
                  <div
                    key={item.preset}
                    data-testid={`sheet-cell-${item.preset}`}
                    className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 md:p-5 border border-white/10 shadow-xl relative group transition-all hover:border-cyan-500/40"
                  >
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 px-1">
                      <span className="text-cyan-400/90 font-semibold uppercase tracking-wider">
                        [{item.row}, {item.col}]
                      </span>
                      <span className="opacity-50">E-expr</span>
                    </div>

                    <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-hidden">
                      <BiyooPuppet params={presetParams} />
                    </div>

                    <div className="mt-3.5 text-center w-full">
                      <div className="font-extrabold text-sm md:text-base uppercase tracking-wider text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {PRESET_REFERENCE_MAP[item.preset]?.notes.split(',')[0]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Biyoo Mascot · Portfolio ORV</span>
              </div>
              <div>Approved Body Parts · 1024×1024 Master Vector Face</div>
            </div>
          </div>
        </section>

        {/* Section 8: Side-by-Side Comparison of Neutral, Surprised, Curious, Sad (1:1) */}
        <section id="side-by-side-section" className="pt-8 border-t border-white/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <span>Side-by-Side: Neutral · Surprised · Curious · Sad</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  1:1 Comparison Crop
                </span>
              </h2>
              <p className="text-sm opacity-70 mt-1">
                Visual proof of face patch: Neutral (1.0x 92px), Surprised (dark glossy 1.25x 115px, curved brows, open oval mouth), Curious (eyes +8px R, -10px U, upper-right highlights, tilted ~4°, raised brow), Sad (watery band ~40% thinner along lower edge).
              </p>
            </div>

            <div>
              <a
                href="/biyoo/patch-proof-side-by-side.png"
                download="biyoo-patch-proof-side-by-side.png"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>Download 1:1 Side-by-Side PNG</span>
              </a>
            </div>
          </div>

          <div
            id="four-expressions-side-by-side"
            data-testid="four-expressions-side-by-side"
            className="p-6 md:p-8 rounded-2xl bg-[#081020] border border-white/15 shadow-2xl max-w-6xl mx-auto"
          >
            <div className="text-center pb-5 border-b border-white/10 mb-6">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] tracking-widest uppercase mb-2">
                Patch Verification Crop · 1:1 Scale
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-widest text-white">
                Neutral · Surprised · Curious · Sad
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Approved Body (885px width) · 1024×1024 Master Vector Assembly
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 md:gap-6">
              <div className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-xl">
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-2 px-1">
                  <span className="font-bold tracking-wider">[0, 0] NEUTRAL</span>
                  <span className="text-slate-400">1.0x (92px)</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-hidden">
                  <BiyooPuppet params={BIYOO_PRESETS.neutral} />
                </div>
                <div className="mt-3 text-center space-y-0.5 text-xs">
                  <div className="font-bold text-white uppercase tracking-wide">Neutral</div>
                  <div className="font-mono text-[10px] text-cyan-300">Dual Highlights (UL + LR)</div>
                  <div className="font-mono text-[10px] text-slate-400">Gentle Cat Smile</div>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-amber-500/30 shadow-xl">
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-amber-400 mb-2 px-1">
                  <span className="font-bold tracking-wider">[0, 2] SURPRISED</span>
                  <span className="text-slate-400">1.25x (115px)</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-hidden">
                  <BiyooPuppet params={BIYOO_PRESETS.surprised} />
                </div>
                <div className="mt-3 text-center space-y-0.5 text-xs">
                  <div className="font-bold text-white uppercase tracking-wide">Surprised</div>
                  <div className="font-mono text-[10px] text-amber-300">Dark Glossy · Dual Highlights</div>
                  <div className="font-mono text-[10px] text-slate-400">High Curved Arcs · Open Oval</div>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/30 shadow-xl">
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-2 px-1">
                  <span className="font-bold tracking-wider">[2, 1] CURIOUS</span>
                  <span className="text-slate-400">1.0x (92px)</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-hidden">
                  <BiyooPuppet params={BIYOO_PRESETS.curious} />
                </div>
                <div className="mt-3 text-center space-y-0.5 text-xs">
                  <div className="font-bold text-white uppercase tracking-wide">Curious</div>
                  <div className="font-mono text-[10px] text-emerald-300">Eyes Up-R · Highlights UR</div>
                  <div className="font-mono text-[10px] text-slate-400">Face Tilt 4° · Small &quot;o&quot;</div>
                </div>
              </div>

              <div className="flex flex-col items-center bg-slate-900/90 rounded-2xl p-4 border border-blue-500/30 shadow-xl">
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-blue-400 mb-2 px-1">
                  <span className="font-bold tracking-wider">[1, 0] SAD</span>
                  <span className="text-slate-400">1.0x (92px)</span>
                </div>
                <div className="w-full aspect-square flex items-center justify-center p-2 rounded-xl bg-[#0a1428] border border-white/5 overflow-hidden">
                  <BiyooPuppet params={BIYOO_PRESETS.sad} />
                </div>
                <div className="mt-3 text-center space-y-0.5 text-xs">
                  <div className="font-bold text-white uppercase tracking-wide">Sad</div>
                  <div className="font-mono text-[10px] text-blue-300">~40% Thinner Moisture Band</div>
                  <div className="font-mono text-[10px] text-slate-400">Inward-Up Brows · Frown</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-500">
              <div>Biyoo Puppet Testbench · 1:1 Scale Proof</div>
              <div>Neutral (92px) · Surprised (115px) · Curious (92px) · Sad (92px)</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
