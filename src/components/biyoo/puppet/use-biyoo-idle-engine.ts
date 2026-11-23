'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BiyooExpressionName, BiyooFaceParams } from './types';
import { BIYOO_PRESETS } from './presets';
import { interpolateFaceParams } from './transitions';

// =====================================================================
// Behavior and Idle Threshold Constants (Step 4 & Step 5)
// =====================================================================
export const FAST_SCROLL_SPEED_THRESHOLD_PX_PER_SEC = 3000; // fast scroll > 3000px/s
export const FAST_SCROLL_SUSTAINED_MS = 400; // sustained for 400ms
export const LINGER_VISIBILITY_RATIO = 0.5; // linger > 50% in view
export const LINGER_DURATION_MS = 10000; // linger for 10s
export const CURSOR_STILL_DELAY_MS = 2500; // cursor-still 2.5s
export const SKIP_BOTTOM_FROM_RATIO = 0.1; // under 10%
export const SKIP_BOTTOM_TO_RATIO = 0.9; // over 90%
export const SKIP_BOTTOM_MAX_DURATION_MS = 2000; // within 2s
export const BUBBLE_COOLDOWN_MS = 20000; // 20s cooldown between bubble reactions
export const IDLE_CHAIN_CURIOUS_SEC = 15; // 15s: Curious
export const IDLE_CHAIN_SLEEPY_SEC = 30; // 30s: Sleepy
export const IDLE_CHAIN_SLEEPING_SEC = 60; // 60s: Sleeping
export const MOOD_VISIBILITY_START_RATIO = 0.50; // > 50% visible
export const MOOD_VISIBILITY_END_RATIO = 0.30; // < 30% visible
export const MOOD_START_DURATION_MS = 1500; // 1.5s

export interface IdleEngineLogEntry {
  timestamp: number;
  timeString: string;
  isoString: string;
  state: BiyooExpressionName;
  bubble: string | null;
  action: string;
  measuredValue?: string | number;
}

export interface BlinkLogEntry {
  timestamp: number;
  isoString: string;
  deltaMs: number;
}

export interface ReactionRequest {
  type:
    | 'fast_scroll'
    | 'linger'
    | 'cursor_still'
    | 'skip_bottom'
    | 'late_night'
    | 'return_visitor'
    | 'manual'
    | 'manual_force';
  expression: BiyooExpressionName;
  bubbleText: string;
  durationMs?: number;
  pointingArm?: 'left' | 'right' | null;
  measuredValue?: string | number;
  rawMetric?: Record<string, any>;
  force?: boolean;
}

export interface ReactionResult {
  accepted: boolean;
  reason?: 'cooldown' | 'quiet_mode' | 'sequence_active' | 'ok' | 'qa_active';
  type?: string;
  timestamp: number;
  isoString: string;
  elapsedSinceLastBubbleMs?: number;
  measuredValue?: string | number;
  rawMetric?: Record<string, any>;
}

export interface RawTriggerMetric {
  type: string;
  expression: BiyooExpressionName;
  bubbleText?: string;
  pointingArm?: 'left' | 'right' | null;
  timestamp: number;
  timeString: string;
  isoString: string;
  accepted: boolean;
  reason: string;
  elapsedSinceLastBubbleMs: number;
  measuredValue?: string | number;
  rawMetric?: Record<string, any>;
}

export interface UseBiyooIdleEngineOptions {
  initialIdleScale?: number;
  initialQuietMode?: boolean;
  enableQueryScale?: boolean;
  enableSessionGreetings?: boolean;
}

export function useBiyooIdleEngine(options: UseBiyooIdleEngineOptions = {}) {
  const {
    initialIdleScale = 1.0,
    initialQuietMode = false,
    enableQueryScale = false,
    enableSessionGreetings = true,
  } = options;

  const [idleScale, setIdleScale] = useState<number>(initialIdleScale);
  const [quietMode, setQuietModeState] = useState<boolean>(initialQuietMode);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Expression and physical states
  const [currentExpression, setCurrentExpression] = useState<BiyooExpressionName>('neutral');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isHopping, setIsHopping] = useState<boolean>(false);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [pointingArm, setPointingArm] = useState<'left' | 'right' | null>(null);
  const [idleSeconds, setIdleSeconds] = useState<number>(0);

  // Step 7: Project-world moods
  const [currentMood, setCurrentMood] = useState<BiyooExpressionName | null>(null);
  const [currentMoodSection, setCurrentMoodSection] = useState<string | null>(null);
  const currentMoodRef = useRef<BiyooExpressionName | null>(null);
  const currentMoodSectionRef = useRef<string | null>(null);
  const sectionVisibleSinceRef = useRef<{ [id: string]: number }>({});
  const lastFastScrollTimeRef = useRef<number>(0);
  const moodStartTimestampRef = useRef<{ [id: string]: number }>({});
  const idleStageFiredRef = useRef<{
    curious: boolean;
    sleepy: boolean;
    sleepyBubble: boolean;
    sleeping: boolean;
  }>({
    curious: false,
    sleepy: false,
    sleepyBubble: false,
    sleeping: false,
  });

  // Smooth interpolated face params
  const [faceParams, setFaceParams] = useState<BiyooFaceParams>(BIYOO_PRESETS.neutral);
  const currentParamsRef = useRef<BiyooFaceParams>(BIYOO_PRESETS.neutral);
  const targetParamsRef = useRef<BiyooFaceParams>(BIYOO_PRESETS.neutral);
  const transitionStartRef = useRef<number>(0);
  const transitionDurationRef = useRef<number>(180);
  const animFrameRef = useRef<number | null>(null);

  // Activity & event timers
  const lastActivityRef = useRef<number>(0);
  const lastBubbleTimeRef = useRef<number>(0);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tabAwayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const returnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>('');
  const wasTabAwayRef = useRef<boolean>(false);
  const isSleepingRef = useRef<boolean>(false);
  const isWakingRef = useRef<boolean>(false);
  const quietModeRef = useRef<boolean>(initialQuietMode);
  const idleScaleRef = useRef<number>(initialIdleScale);
  const reducedMotionRef = useRef<boolean>(false);
  const currentExpressionRef = useRef<BiyooExpressionName>('neutral');
  const pointingArmRef = useRef<'left' | 'right' | null>(null);

  // Precise timing measurements
  const lastSurprisedStartRef = useRef<number>(0);
  const lastSurprisedDurationRef = useRef<number>(0);
  const lastHappyHoldStartRef = useRef<number>(0);
  const lastHappyHoldDurationRef = useRef<number>(0);

  // Blink logging
  const blinkHistoryRef = useRef<BlinkLogEntry[]>([]);
  const [blinkHistory, setBlinkHistory] = useState<BlinkLogEntry[]>([]);

  // Logs
  const logEntriesRef = useRef<IdleEngineLogEntry[]>([]);
  const [logEntries, setLogEntries] = useState<IdleEngineLogEntry[]>([]);

  // Scroll & cursor tracking refs
  const lastScrollTimeMsRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollPerfTimeRef = useRef<number>(0);
  const fastScrollStartRef = useRef<number>(0);
  const fastScrollPeakSpeedRef = useRef<number>(0);
  const lastUnder10PctTimeRef = useRef<number>(0);
  const lastUnder10PctValRef = useRef<number>(0);
  const hoverTargetRef = useRef<Element | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lingerHandledElementRef = useRef<Element | null>(null);

  // Raw trigger metrics history (Item 2 & 3 real input deltas)
  const rawTriggerHistoryRef = useRef<RawTriggerMetric[]>([]);

  // Q&A panel state
  const [qaActive, setQaActiveState] = useState<boolean>(false);
  const qaActiveRef = useRef<boolean>(false);

  // Log recording helper
  const logAction = useCallback(
    (
      state: BiyooExpressionName,
      bubble: string | null,
      action: string,
      measuredValue?: string | number
    ) => {
      const now = Date.now();
      const d = new Date(now);
      const isoString = d.toISOString();
      const timeString =
        d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
      const entry: IdleEngineLogEntry = {
        timestamp: now,
        timeString,
        isoString,
        state,
        bubble,
        action,
        measuredValue,
      };
      logEntriesRef.current = [entry, ...logEntriesRef.current.slice(0, 49)];
      setLogEntries([...logEntriesRef.current]);
    },
    []
  );

  // Keep refs in sync
  useEffect(() => {
    quietModeRef.current = quietMode;
  }, [quietMode]);

  const setQuietMode = useCallback((val: boolean) => {
    setQuietModeState(val);
    quietModeRef.current = val;
    try {
      localStorage.setItem('biyoo_quiet_mode', JSON.stringify(val));
    } catch {
      // ignore
    }
  }, []);

  // Load quiet mode from localStorage on client mount (try/catch, default OFF)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('biyoo_quiet_mode');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'boolean') {
          setQuietModeState(parsed);
          quietModeRef.current = parsed;
        }
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  useEffect(() => {
    idleScaleRef.current = idleScale;
  }, [idleScale]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    currentExpressionRef.current = currentExpression;
  }, [currentExpression]);

  useEffect(() => {
    pointingArmRef.current = pointingArm;
  }, [pointingArm]);

  // Read URL query parameter ?idleScale= only on /biyoo-test or if explicitly enabled
  useEffect(() => {
    if (typeof window === 'undefined') return;
    lastActivityRef.current = Date.now();
    lastScrollTimeMsRef.current = Date.now();
    try {
      const isTestbench =
        enableQueryScale ||
        window.location.pathname.startsWith('/biyoo-test') ||
        process.env.NODE_ENV !== 'production';
      if (isTestbench) {
        const sp = new URLSearchParams(window.location.search);
        const scaleParam = sp.get('idleScale');
        if (scaleParam) {
          const val = parseFloat(scaleParam);
          if (!isNaN(val) && val > 0) {
            setIdleScale(val);
            idleScaleRef.current = val;
          }
        }
      }
    } catch {
      // ignore
    }
  }, [enableQueryScale]);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    reducedMotionRef.current = media.matches;

    const listener = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      reducedMotionRef.current = e.matches;
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Capture original document title on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (!originalTitleRef.current && document.title) {
        originalTitleRef.current = document.title;
      }
    }
  }, []);

  // Smooth face parameter animator (~180ms ease, instant 0ms if reducedMotion)
  const transitionToParams = useCallback(
    (target: BiyooFaceParams, durationMs: number = 180) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      if (reducedMotionRef.current || durationMs <= 0) {
        currentParamsRef.current = target;
        setFaceParams(target);
        return;
      }

      const startParams = { ...currentParamsRef.current };
      targetParamsRef.current = target;
      transitionDurationRef.current = durationMs;
      transitionStartRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - transitionStartRef.current;
        const progress = Math.min(1, elapsed / transitionDurationRef.current);
        const interpolated = interpolateFaceParams(startParams, target, progress);
        currentParamsRef.current = interpolated;
        setFaceParams(interpolated);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          currentParamsRef.current = target;
          setFaceParams(target);
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    []
  );

  // Set expression helper
  const setExpression = useCallback(
    (name: BiyooExpressionName, durationMs: number = 180) => {
      setCurrentExpression(name);
      const isSleep = name === 'sleeping';
      setIsSleeping(isSleep);
      isSleepingRef.current = isSleep;
      transitionToParams(BIYOO_PRESETS[name], durationMs);
    },
    [transitionToParams]
  );

  const toggleQuietMode = useCallback(() => {
    setQuietModeState((prev) => {
      const next = !prev;
      quietModeRef.current = next;
      if (next) {
        currentMoodRef.current = null;
        currentMoodSectionRef.current = null;
        setCurrentMood(null);
        setCurrentMoodSection(null);
        setExpression('neutral', 0);
      }
      try {
        localStorage.setItem('biyoo_quiet_mode', JSON.stringify(next));
      } catch {
        // ignore
      }
      logAction(
        currentExpressionRef.current,
        null,
        `Quiet Biyoo toggled ${next ? 'ON' : 'OFF'}`
      );
      return next;
    });
  }, [logAction, setExpression]);

  // Dismiss bubble
  const dismissBubble = useCallback(() => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = null;
    }
    setBubbleText(null);
  }, []);

  // Show bubble with 4s auto-fade and 20s cooldown check
  const showBubble = useCallback(
    (text: string, force: boolean = false) => {
      if (quietModeRef.current) return false;
      const now = Date.now();
      const minCooldown = BUBBLE_COOLDOWN_MS * idleScaleRef.current;
      if (!force && lastBubbleTimeRef.current > 0 && now - lastBubbleTimeRef.current < minCooldown) {
        logAction(
          currentExpressionRef.current,
          null,
          `Bubble "${text}" suppressed: ${(now - lastBubbleTimeRef.current)}ms elapsed (< ${minCooldown}ms cooldown)`
        );
        return false;
      }

      dismissBubble();
      setBubbleText(text);
      lastBubbleTimeRef.current = now;

      // Auto fade after 4s (or scaled if idleScale < 0.25 to prevent overlapping tests)
      const fadeDuration =
        idleScaleRef.current < 0.25 ? Math.max(1200, 4000 * idleScaleRef.current) : 4000;
      bubbleTimerRef.current = setTimeout(() => {
        setBubbleText(null);
        bubbleTimerRef.current = null;
      }, fadeDuration);
      return true;
    },
    [dismissBubble, logAction]
  );

  // Section visibility measurement helper (Step 7)
  const getSectionVisibility = useCallback((id: string): number => {
    if (typeof document === 'undefined') return 0;
    const el = document.getElementById(id);
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const visibleHeight = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
    if (visibleHeight <= 0) return 0;
    const elemRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
    const vpRatio = vh > 0 ? visibleHeight / vh : 0;
    return Math.max(elemRatio, vpRatio);
  }, []);

  // Helper to restore active mood or neutral (priority winner restoration)
  const restoreMoodOrNeutral = useCallback(
    (animDuration = 180) => {
      if (
        currentMoodRef.current &&
        currentMoodSectionRef.current &&
        getSectionVisibility(currentMoodSectionRef.current) >= MOOD_VISIBILITY_END_RATIO
      ) {
        setExpression(currentMoodRef.current, reducedMotionRef.current ? 0 : animDuration);
      } else {
        setExpression('neutral', reducedMotionRef.current ? 0 : animDuration);
      }
    },
    [getSectionVisibility, setExpression]
  );

  // Q&A panel open/close handler
  const setQaActive = useCallback(
    (active: boolean) => {
      qaActiveRef.current = active;
      setQaActiveState(active);
      lastActivityRef.current = Date.now();
      if (active) {
        dismissBubble();
        setPointingArm(null);
      } else {
        restoreMoodOrNeutral(reducedMotionRef.current ? 0 : 180);
      }
    },
    [dismissBubble, restoreMoodOrNeutral]
  );

  // Trigger blink (dip eye openness to 0, then recover; runs even in quietMode)
  const triggerBlink = useCallback(() => {
    if (isSleepingRef.current || currentExpressionRef.current === 'blink') return;

    const now = Date.now();
    const prevTime =
      blinkHistoryRef.current.length > 0
        ? blinkHistoryRef.current[blinkHistoryRef.current.length - 1].timestamp
        : now;
    const deltaMs = now - prevTime;
    const entry: BlinkLogEntry = {
      timestamp: now,
      isoString: new Date(now).toISOString(),
      deltaMs,
    };
    blinkHistoryRef.current = [...blinkHistoryRef.current.slice(-99), entry];
    setBlinkHistory([...blinkHistoryRef.current]);

    const baseParams = BIYOO_PRESETS[currentExpressionRef.current];
    const closedParams: BiyooFaceParams = {
      ...baseParams,
      eyeOpennessL: 0,
      eyeOpennessR: 0,
      eyeStyleL: 'slit',
      eyeStyleR: 'slit',
    };

    transitionToParams(closedParams, 80);
    setTimeout(() => {
      transitionToParams(baseParams, 120);
    }, 110);
  }, [transitionToParams]);

  // Trigger small hop
  const triggerHop = useCallback(() => {
    if (reducedMotionRef.current) return;
    setIsHopping(true);
    setTimeout(() => setIsHopping(false), 500);
  }, []);

  // Shared Happy hold implementation used by BOTH wake sequence and tab return (holds exactly 2000ms)
  const triggerHappyHold = useCallback(
    (bubbleMsg: string | null = null, onComplete?: () => void) => {
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }

      const happyStart = performance.now();
      lastHappyHoldStartRef.current = happyStart;
      setExpression('happy', 180);
      if (bubbleMsg) {
        showBubble(bubbleMsg, true);
      }
      logAction('happy', bubbleMsg, `Happy hold started (target: 2000ms)`);

      returnTimerRef.current = setTimeout(() => {
        const durationMs = Math.round(performance.now() - happyStart);
        lastHappyHoldDurationRef.current = durationMs;
        isWakingRef.current = false;
        restoreMoodOrNeutral(180);
        logAction(
          currentMoodRef.current || 'neutral',
          null,
          `Happy hold completed in ${durationMs}ms -> ${currentMoodRef.current || 'Neutral'}`
        );
        if (onComplete) onComplete();
      }, 2000);
    },
    [logAction, restoreMoodOrNeutral, setExpression, showBubble]
  );

  const triggerHappyHoldRef = useRef(triggerHappyHold);
  triggerHappyHoldRef.current = triggerHappyHold;

  // -----------------------------------------------------------------
  // Requirement 1: Unified Reaction Gate
  // -----------------------------------------------------------------
  const requestReaction = useCallback(
    (req: ReactionRequest): ReactionResult => {
      const now = Date.now();
      const d = new Date(now);
      const isoString = d.toISOString();
      const timeString =
        d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');

      const recordHistory = (accepted: boolean, reason: string, elapsedMs: number) => {
        const hist: RawTriggerMetric = {
          type: req.type,
          expression: req.expression,
          bubbleText: req.bubbleText,
          pointingArm: req.pointingArm,
          timestamp: now,
          timeString,
          isoString,
          accepted,
          reason,
          elapsedSinceLastBubbleMs: elapsedMs,
          measuredValue: req.measuredValue,
          rawMetric: req.rawMetric,
        };
        rawTriggerHistoryRef.current.push(hist);
      };

      // Rule 0: Q&A panel open suppresses all reaction bubbles and expressions
      if (qaActiveRef.current) {
        logAction(
          currentExpressionRef.current,
          null,
          `Reaction [${req.type}] rejected: Q&A panel is open`
        );
        recordHistory(false, 'qa_active', 0);
        return {
          accepted: false,
          reason: 'qa_active',
          type: req.type,
          timestamp: now,
          isoString,
          measuredValue: req.measuredValue,
          rawMetric: req.rawMetric,
        };
      }

      // Rule 1: A new reaction never interrupts Sleeping-wake or tab-return sequences
      if (isWakingRef.current || wasTabAwayRef.current) {
        logAction(
          currentExpressionRef.current,
          null,
          `Reaction [${req.type}] rejected: Sleeping-wake or tab-return sequence active`
        );
        recordHistory(false, 'sequence_active', 0);
        return {
          accepted: false,
          reason: 'sequence_active',
          type: req.type,
          timestamp: now,
          isoString,
          measuredValue: req.measuredValue,
          rawMetric: req.rawMetric,
        };
      }

      // Rule 2: Quiet Biyoo disables all new reactions (unless force is set)
      if (!req.force && quietModeRef.current) {
        logAction(
          currentExpressionRef.current,
          null,
          `Reaction [${req.type}] rejected: Quiet Biyoo is ON`
        );
        recordHistory(false, 'quiet_mode', 0);
        return {
          accepted: false,
          reason: 'quiet_mode',
          type: req.type,
          timestamp: now,
          isoString,
          measuredValue: req.measuredValue,
          rawMetric: req.rawMetric,
        };
      }

      // Rule 3: 20s cooldown between bubble reactions (scaled by idleScale)
      const minCooldown = BUBBLE_COOLDOWN_MS * idleScaleRef.current;
      const elapsed = lastBubbleTimeRef.current > 0 ? now - lastBubbleTimeRef.current : Infinity;
      if (!req.force && lastBubbleTimeRef.current > 0 && elapsed < minCooldown) {
        logAction(
          currentExpressionRef.current,
          null,
          `Reaction [${req.type}] suppressed by cooldown: ${elapsed}ms < ${minCooldown}ms`
        );
        recordHistory(false, 'cooldown', elapsed);
        return {
          accepted: false,
          reason: 'cooldown',
          type: req.type,
          timestamp: now,
          isoString,
          elapsedSinceLastBubbleMs: elapsed,
          measuredValue: req.measuredValue,
          rawMetric: req.rawMetric,
        };
      }

      // Reaction Accepted!
      lastBubbleTimeRef.current = now;
      recordHistory(true, 'ok', elapsed === Infinity ? 0 : elapsed);

      // Pointing arm
      if (req.pointingArm) {
        setPointingArm(req.pointingArm);
      }

      // Expression & speech bubble
      const animDuration = reducedMotionRef.current ? 0 : 180;
      setExpression(req.expression, animDuration);
      showBubble(req.bubbleText, true);

      logAction(
        req.expression,
        req.bubbleText,
        `Reaction [${req.type}] accepted (${req.measuredValue ?? ''})`,
        req.measuredValue
      );

      // Schedule return to mood or neutral
      const holdMs =
        (req.durationMs ?? 2000) * (idleScaleRef.current < 0.25 ? idleScaleRef.current : 1.0);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = setTimeout(() => {
        restoreMoodOrNeutral(animDuration);
        setPointingArm(null);
        reactionTimerRef.current = null;
        logAction(
          currentMoodRef.current || 'neutral',
          null,
          `Reaction [${req.type}] hold completed: Return to ${currentMoodRef.current || 'Neutral'}`
        );
      }, holdMs);

      return {
        accepted: true,
        reason: 'ok',
        type: req.type,
        timestamp: now,
        isoString,
        elapsedSinceLastBubbleMs: elapsed,
        measuredValue: req.measuredValue,
      };
    },
    [logAction, setExpression, showBubble]
  );

  // Expose triggerReactionBubble (alias for backward compatibility in Item 4 test)
  const triggerReactionBubble = useCallback(
    (text: string) => {
      return requestReaction({
        type: 'manual',
        expression: 'curious',
        bubbleText: text,
      });
    },
    [requestReaction]
  );

  // Force a specific state manually (goes through gate if bubble requested, unless force=true)
  const forceState = useCallback(
    (
      name: BiyooExpressionName,
      bubbleMsg?: string | null,
      arm?: 'left' | 'right' | null,
      force = false
    ) => {
      // If bubble is requested and force is false, run it through requestReaction gate
      if (bubbleMsg && !force) {
        return requestReaction({
          type: 'manual_force',
          expression: name,
          bubbleText: bubbleMsg,
          pointingArm: arm,
          durationMs: 2000,
          force: false,
        });
      }

      isWakingRef.current = false;
      setExpression(name, 180);
      if (arm) {
        setPointingArm(arm);
      } else {
        setPointingArm(null);
      }
      if (bubbleMsg) {
        showBubble(bubbleMsg, true);
      } else {
        dismissBubble();
      }
      if (name === 'surprised') {
        triggerHop();
      }
      logAction(
        name,
        bubbleMsg ?? null,
        `Manual state set (${force ? 'force bypass' : 'expression only'}): ${name}${bubbleMsg ? ` ("${bubbleMsg}")` : ''}${arm ? ` (arm: ${arm})` : ''}`
      );
    },
    [dismissBubble, logAction, requestReaction, setExpression, showBubble, triggerHop]
  );

  // Quick fix 0: Wake sequence - cut Surprised hold to 460ms so measured DOM-visible duration is 600ms +/- 100ms
  const triggerWakeSequence = useCallback(() => {
    if (isWakingRef.current) return;
    isWakingRef.current = true;
    isSleepingRef.current = false;
    setIsSleeping(false);

    const surprisedStart = performance.now();
    lastSurprisedStartRef.current = surprisedStart;
    triggerHop();
    setExpression('surprised', 140);
    logAction('surprised', null, 'Wake from sleeping: Surprised hold started (target: 600ms DOM-visible)');

    // 580ms timeout lands measured DOM-visible duration right at ~600ms (+/- 100ms)
    setTimeout(() => {
      const surprisedDuration = Math.round(performance.now() - surprisedStart);
      lastSurprisedDurationRef.current = surprisedDuration;
      logAction('surprised', null, `Surprised hold completed in ${surprisedDuration}ms`);

      // Calls the EXACT same code path triggerHappyHold!
      triggerHappyHold("oh! you're back");
    }, 580);
  }, [logAction, setExpression, triggerHappyHold, triggerHop]);

  // Visitor activity listener
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    idleStageFiredRef.current = { curious: false, sleepy: false, sleepyBubble: false, sleeping: false };

    if (isWakingRef.current) return;

    if (isSleepingRef.current) {
      triggerWakeSequence();
    } else if (
      currentExpressionRef.current !== 'neutral' &&
      currentExpressionRef.current !== 'happy' &&
      currentExpressionRef.current !== 'surprised' &&
      !reactionTimerRef.current
    ) {
      // Any activity before 60s: return to mood or Neutral quietly
      restoreMoodOrNeutral(180);
      dismissBubble();
      setPointingArm(null);
      logAction(
        currentMoodRef.current || 'neutral',
        null,
        `Activity detected before 60s: Return to ${currentMoodRef.current || 'Neutral'} quietly`
      );
    }
  }, [dismissBubble, logAction, restoreMoodOrNeutral, triggerWakeSequence]);

  // Bind activity events (mouse move, mousedown, keydown, touch, scroll)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove'];
    const onEvent = () => handleUserActivity();
    events.forEach((ev) => window.addEventListener(ev, onEvent, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, onEvent));
  }, [handleUserActivity]);

  // -----------------------------------------------------------------
  // Requirement 2: Scroll Behaviors (Fast Scroll & Skip to Bottom)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      const now = performance.now();
      const nowMs = Date.now();
      lastActivityRef.current = nowMs;
      lastScrollTimeMsRef.current = nowMs;
      lingerHandledElementRef.current = null;

      const currentY = window.scrollY;
      if (lastScrollPerfTimeRef.current === 0) {
        lastScrollPerfTimeRef.current = now;
        lastScrollYRef.current = currentY;
        return;
      }

      const dy = Math.abs(currentY - lastScrollYRef.current);
      const dt = now - lastScrollPerfTimeRef.current;
      lastScrollPerfTimeRef.current = now;
      lastScrollYRef.current = currentY;

      if (dt < 2) return;

      // 1. Fast Scroll Detection: > 3000px/s sustained for 400ms
      const speed = dt > 0 ? (dy / dt) * 1000 : 0;
      if (speed > 2000) {
        lastFastScrollTimeRef.current = now;
        sectionVisibleSinceRef.current = {};
      }
      if (speed > FAST_SCROLL_SPEED_THRESHOLD_PX_PER_SEC) {
        if (fastScrollStartRef.current === 0) {
          fastScrollStartRef.current = now;
          fastScrollPeakSpeedRef.current = speed;
        } else {
          fastScrollPeakSpeedRef.current = Math.max(fastScrollPeakSpeedRef.current, speed);
          const sustainedMs = now - fastScrollStartRef.current;
          if (sustainedMs >= FAST_SCROLL_SUSTAINED_MS * idleScaleRef.current) {
            const rawSpeed = Math.round(fastScrollPeakSpeedRef.current * 10) / 10;
            const rawSustained = Math.round(sustainedMs * 10) / 10;
            requestReaction({
              type: 'fast_scroll',
              expression: 'confused',
              bubbleText: "slow down, the story's not going anywhere",
              durationMs: 1500,
              measuredValue: `${rawSpeed}px/s sustained for ${rawSustained}ms`,
              rawMetric: {
                speedPxPerSec: rawSpeed,
                sustainedMs: rawSustained,
              },
            });
            fastScrollStartRef.current = 0;
            fastScrollPeakSpeedRef.current = 0;
          }
        }
      } else if (speed < 1000 || dt > 200) {
        fastScrollStartRef.current = 0;
        fastScrollPeakSpeedRef.current = 0;
      }

      // 2. Skip to Bottom Detection: under 10% to over 90% of page height within 2s
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pct = maxScroll > 0 ? currentY / maxScroll : 0;

      if (pct < SKIP_BOTTOM_FROM_RATIO) {
        lastUnder10PctTimeRef.current = now;
        lastUnder10PctValRef.current = pct;
      } else if (
        pct > SKIP_BOTTOM_TO_RATIO &&
        lastUnder10PctTimeRef.current > 0 &&
        now - lastUnder10PctTimeRef.current <= SKIP_BOTTOM_MAX_DURATION_MS * idleScaleRef.current
      ) {
        const elapsedSkip = Math.round((now - lastUnder10PctTimeRef.current) * 10) / 10;
        const fromPctVal = Math.round((lastUnder10PctValRef.current ?? 0) * 1000) / 10;
        const toPctVal = Math.round(pct * 1000) / 10;
        requestReaction({
          type: 'skip_bottom',
          expression: 'surprised',
          bubbleText: 'you skipped the story?',
          durationMs: 2000,
          measuredValue: `${fromPctVal}% to ${toPctVal}% in ${elapsedSkip}ms`,
          rawMetric: {
            fromPercent: fromPctVal,
            toPercent: toPctVal,
            elapsedSkipMs: elapsedSkip,
          },
        });
        lastUnder10PctTimeRef.current = 0;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [idleScale, requestReaction]);

  // -----------------------------------------------------------------
  // Requirement 2: Linger Behavior ([data-biyoo-linger] > 50% in view for 10s)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const timeSinceScroll = nowMs - lastScrollTimeMsRef.current;
      const lingerThresholdMs = LINGER_DURATION_MS * idleScaleRef.current;

      if (timeSinceScroll >= lingerThresholdMs) {
        const lingerElements = document.querySelectorAll('[data-biyoo-linger]');
        for (let i = 0; i < lingerElements.length; i++) {
          const el = lingerElements[i];
          if (lingerHandledElementRef.current === el) continue;

          const rect = el.getBoundingClientRect();
          const visibleHeight = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
          const elemRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
          const viewportRatio = window.innerHeight > 0 ? visibleHeight / window.innerHeight : 0;
          const ratio = Math.max(elemRatio, viewportRatio);

          if (ratio >= LINGER_VISIBILITY_RATIO) {
            const rawVis = Math.round(ratio * 1000) / 10;
            const rawElapsed = Math.round(timeSinceScroll * 10) / 10;
            const line =
              el.getAttribute('data-biyoo-line') || 'reading this part closely, huh?';
            const res = requestReaction({
              type: 'linger',
              expression: 'curious',
              bubbleText: line,
              durationMs: 2000,
              measuredValue: `${rawVis}% in view with no scroll for ${rawElapsed}ms`,
              rawMetric: {
                visibilityPercent: rawVis,
                elapsedLingerMs: rawElapsed,
              },
            });
            if (res.accepted) {
              lingerHandledElementRef.current = el;
            }
            break;
          }
        }
      } else {
        lingerHandledElementRef.current = null;
      }
    }, 200);

    return () => clearInterval(interval);
  }, [idleScale, requestReaction]);

  // -----------------------------------------------------------------
  // Requirement 2: Cursor Still Behavior (stays 2.5s over a, button, [data-biyoo-point])
  // -----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPointerMove = (e: MouseEvent) => {
      const nowMs = Date.now();
      lastActivityRef.current = nowMs;

      // If arm is currently pointing and cursor moves, return arm!
      if (pointingArmRef.current) {
        const dx = Math.abs(e.clientX - hoverPosRef.current.x);
        const dy = Math.abs(e.clientY - hoverPosRef.current.y);
        if (dx > 12 || dy > 12) {
          setPointingArm(null);
          pointingArmRef.current = null;
        }
      }

      const target = (e.target as Element | null)?.closest('a, button, [data-biyoo-point]');
      if (target) {
        // Track hover
        if (hoverTargetRef.current !== target) {
          hoverTargetRef.current = target;
          hoverPosRef.current = { x: e.clientX, y: e.clientY };
          const hoverStartPerf = performance.now();
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

          const stillDelay = CURSOR_STILL_DELAY_MS * idleScaleRef.current;
          hoverTimerRef.current = setTimeout(() => {
            const actualStillMs = Math.round((performance.now() - hoverStartPerf) * 10) / 10;
            // Determine nearest arm: target center vs stage center
            const targetRect = target.getBoundingClientRect();
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const stageEl =
              document.querySelector('[data-testid="puppet-stage"]') ||
              document.querySelector('[data-testid="biyoo-live-puppet"]') ||
              document.querySelector('[data-biyoo-puppet]');
            const stageCenterX = stageEl
              ? stageEl.getBoundingClientRect().left + stageEl.getBoundingClientRect().width / 2
              : window.innerWidth * 0.9;

            const arm: 'left' | 'right' = targetCenterX < stageCenterX ? 'left' : 'right';

            requestReaction({
              type: 'cursor_still',
              expression: 'curious',
              bubbleText: "that one's good",
              pointingArm: arm,
              durationMs: 3000,
              measuredValue: `still ${actualStillMs}ms over <${target.tagName.toLowerCase()}> (pointing nearest arm: ${arm})`,
              rawMetric: {
                stillMs: actualStillMs,
                targetTag: target.tagName.toLowerCase(),
                pointingArm: arm,
              },
            });
          }, stillDelay);
        }
      } else {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        hoverTargetRef.current = null;
        if (pointingArmRef.current) {
          setPointingArm(null);
          pointingArmRef.current = null;
        }
      }
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [idleScale, requestReaction]);

  // Idle lifecycle ticker (checks every 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isWakingRef.current || qaActiveRef.current) return;

      const now = Date.now();
      const inactiveMs = now - lastActivityRef.current;
      const inactiveSec = inactiveMs / 1000;
      setIdleSeconds(inactiveSec);

      // In Quiet Mode, no bubbles and no Curious/Sleepy/Sleeping idle reactions fire!
      if (quietModeRef.current) return;

      const scale = idleScaleRef.current;
      const t15 = IDLE_CHAIN_CURIOUS_SEC * scale;
      const t30 = IDLE_CHAIN_SLEEPY_SEC * scale;
      const t60 = IDLE_CHAIN_SLEEPING_SEC * scale;

      // 60s: Sleeping + slow "z z z" floating up, no bubble
      if (inactiveSec >= t60 && !idleStageFiredRef.current.sleeping) {
        idleStageFiredRef.current.sleeping = true;
        dismissBubble();
        setPointingArm(null);
        setExpression('sleeping', 180);
        logAction(
          'sleeping',
          null,
          `Inactivity threshold reached (${t60.toFixed(1)}s): Sleeping + z z z`
        );
      }
      // 30s: Sleepy + bubble "...getting sleepy" (cooldown-gated)
      else if (
        inactiveSec >= t30 &&
        inactiveSec < t60 &&
        !isSleepingRef.current
      ) {
        if (!idleStageFiredRef.current.sleepy) {
          idleStageFiredRef.current.sleepy = true;
          setExpression('sleepy', 180);
          logAction(
            'sleepy',
            null,
            `Inactivity threshold reached (${t30.toFixed(1)}s): Sleepy`
          );
        }
        if (!idleStageFiredRef.current.sleepyBubble) {
          const shown = showBubble('...getting sleepy');
          if (shown) {
            idleStageFiredRef.current.sleepyBubble = true;
            logAction(
              'sleepy',
              '...getting sleepy',
              `Inactivity threshold reached (${t30.toFixed(1)}s): Sleepy + bubble`
            );
          }
        }
      }
      // 15s: Curious + bubble "hey... still there?" (cooldown-gated)
      else if (
        inactiveSec >= t15 &&
        inactiveSec < t30 &&
        !idleStageFiredRef.current.curious &&
        !isSleepingRef.current
      ) {
        idleStageFiredRef.current.curious = true;
        setExpression('curious', 180);
        const shown = showBubble('hey... still there?');
        logAction(
          'curious',
          shown ? 'hey... still there?' : null,
          `Inactivity threshold reached (${t15.toFixed(1)}s): Curious${shown ? ' + bubble' : ' (bubble suppressed by cooldown)'}`
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [dismissBubble, logAction, setExpression, showBubble]);

  // Quick fix 0: Random blink timer strictly clamped to 3-6s
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const scheduleNextBlink = () => {
      const rawDelay = 3000 + Math.random() * 3000;
      const delay = Math.max(3000, Math.min(6000, rawDelay));
      timer = setTimeout(() => {
        triggerBlink();
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timer);
  }, [triggerBlink]);

  // Always-on idle life: small eye drift when in Neutral
  useEffect(() => {
    if (reducedMotion || quietMode) return;
    const driftInterval = setInterval(() => {
      if (currentExpressionRef.current === 'neutral' && !isSleepingRef.current && !isWakingRef.current) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.2 + Math.random() * 2.0; // 1.2 to 3.2px drift
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        setFaceParams((prev) => ({
          ...prev,
          pupilOffsetX: BIYOO_PRESETS.neutral.pupilOffsetX + dx,
          pupilOffsetY: BIYOO_PRESETS.neutral.pupilOffsetY + dy,
        }));
      }
    }, 2500);

    return () => clearInterval(driftInterval);
  }, [quietMode, reducedMotion]);

  // Tab away & back detection
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!originalTitleRef.current && document.title) {
      originalTitleRef.current = document.title;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden: after 3s, Sad + set document.title to "Biyoo misses you"
        const delay = 3000 * idleScaleRef.current;
        tabAwayTimerRef.current = setTimeout(() => {
          wasTabAwayRef.current = true;
          if (document.title !== 'Biyoo misses you') {
            originalTitleRef.current = document.title;
          }
          document.title = 'Biyoo misses you';
          setExpression('sad', 180);
          logAction('sad', null, `Tab hidden > 3s: Sad + document.title set to "Biyoo misses you"`);
        }, delay);
      } else {
        // Tab visible again
        if (tabAwayTimerRef.current) {
          clearTimeout(tabAwayTimerRef.current);
          tabAwayTimerRef.current = null;
        }

        if (wasTabAwayRef.current) {
          wasTabAwayRef.current = false;
          // Restore original title exactly
          const restoreTitle = originalTitleRef.current || 'Sumit Mahajan';
          document.title = restoreTitle;

          logAction(
            'happy',
            null,
            `Tab visible again: Restored title to "${restoreTitle}"`
          );

          // EXACT SAME code path triggerHappyHold!
          triggerHappyHoldRef.current(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (tabAwayTimerRef.current) clearTimeout(tabAwayTimerRef.current);
    };
  }, [logAction, setExpression]);

  // Manual simulation of Tab Away / Return
  const simulateTabAway = useCallback(() => {
    wasTabAwayRef.current = true;
    if (document.title !== 'Biyoo misses you') {
      originalTitleRef.current = document.title;
    }
    document.title = 'Biyoo misses you';
    setExpression('sad', 180);
    logAction('sad', null, 'Simulated tab away: Sad + document.title set to "Biyoo misses you"');
  }, [logAction, setExpression]);

  const simulateTabReturn = useCallback(() => {
    const restoreTitle = originalTitleRef.current || 'Sumit Mahajan';
    document.title = restoreTitle;
    wasTabAwayRef.current = false;
    logAction('happy', null, `Simulated tab return: Restored title to "${restoreTitle}"`);

    // EXACT SAME code path triggerHappyHold!
    triggerHappyHold(null);
  }, [logAction, triggerHappyHold]);

  // Helper to reset inactivity counter
  const resetInactivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    lastScrollTimeMsRef.current = Date.now();
    lingerHandledElementRef.current = null;
    idleStageFiredRef.current = { curious: false, sleepy: false, sleepyBubble: false, sleeping: false };
    setIdleSeconds(0);
    restoreMoodOrNeutral(180);
    dismissBubble();
    setPointingArm(null);
    logAction(currentMoodRef.current || 'neutral', null, 'Manual inactivity reset');
  }, [dismissBubble, logAction, restoreMoodOrNeutral]);

  // Step 4: Specific Behavior Triggers for manual / automated testing
  const triggerFastScroll = useCallback(
    (speed = 3450, sustainedMs = 420, force = false) => {
      return requestReaction({
        type: 'fast_scroll',
        expression: 'confused',
        bubbleText: "slow down, the story's not going anywhere",
        durationMs: 1500,
        measuredValue: `${speed}px/s sustained for ${sustainedMs}ms`,
        force,
      });
    },
    [requestReaction]
  );

  const triggerLinger = useCallback(
    (line = 'reading this part closely, huh?', ratio = 0.85, force = false) => {
      return requestReaction({
        type: 'linger',
        expression: 'curious',
        bubbleText: line,
        durationMs: 2000,
        measuredValue: `${(ratio * 100).toFixed(0)}% in view with no scroll for 10s`,
        force,
      });
    },
    [requestReaction]
  );

  const triggerCursorStill = useCallback(
    (arm: 'left' | 'right' = 'left', targetName = 'button', force = false) => {
      return requestReaction({
        type: 'cursor_still',
        expression: 'curious',
        bubbleText: "that one's good",
        pointingArm: arm,
        durationMs: 2500,
        measuredValue: `still 2.5s over <${targetName}> (arm: ${arm})`,
        force,
      });
    },
    [requestReaction]
  );

  const triggerSkipBottom = useCallback(
    (pct = 0.94, elapsedSec = 0.85, force = false) => {
      return requestReaction({
        type: 'skip_bottom',
        expression: 'surprised',
        bubbleText: 'you skipped the story?',
        durationMs: 2000,
        measuredValue: `<10% to ${(pct * 100).toFixed(0)}% in ${elapsedSec}s`,
        force,
      });
    },
    [requestReaction]
  );

  // Step 5: Late Night & Return Visitor triggers for testing
  const triggerLateNight = useCallback(
    (force = false) => {
      return requestReaction({
        type: 'late_night',
        expression: 'sleepy',
        bubbleText: 'why are we both awake?',
        durationMs: 4000,
        force,
      });
    },
    [requestReaction]
  );

  const triggerReturnVisitor = useCallback(
    (visitCount = 2, force = false) => {
      const bubble = visitCount >= 3 ? "third time? I'm flattered" : "you're back";
      return requestReaction({
        type: 'return_visitor',
        expression: 'happy',
        bubbleText: bubble,
        durationMs: 3000,
        measuredValue: `visit count: ${visitCount}`,
        force,
      });
    },
    [requestReaction]
  );

  // Step 5: Automated Late Night & Return Visitor Session Greetings
  useEffect(() => {
    if (typeof window === 'undefined' || !enableSessionGreetings) return;

    const timer = setTimeout(() => {
      // 1. Late Night check (hour 0-4 or ?fakeHour=N)
      let fakeHour: number | null = null;
      try {
        const isTestEnv =
          process.env.NODE_ENV !== 'production' ||
          window.location.pathname.startsWith('/biyoo-test');
        if (isTestEnv) {
          const sp = new URLSearchParams(window.location.search);
          const fh = sp.get('fakeHour');
          if (fh !== null) {
            const parsed = parseInt(fh, 10);
            if (!isNaN(parsed)) fakeHour = parsed;
          }
        }
        // Dedicated priority test hook via sessionStorage
        const sessionFh = sessionStorage.getItem('biyoo_fake_hour');
        if (sessionFh !== null) {
          const parsed = parseInt(sessionFh, 10);
          if (!isNaN(parsed)) fakeHour = parsed;
        }
      } catch {
        // ignore
      }

      const currentHour = fakeHour !== null ? fakeHour : new Date().getHours();
      const isLateNight = currentHour >= 0 && currentHour <= 4;

      let lateNightFired = false;
      let lateNightChecked = false;
      try {
        lateNightChecked = sessionStorage.getItem('biyoo_late_night_checked') === 'true';
      } catch {
        // ignore
      }

      if (isLateNight && !lateNightChecked) {
        try {
          sessionStorage.setItem('biyoo_late_night_checked', 'true');
        } catch {
          // ignore
        }

        const res = requestReaction({
          type: 'late_night',
          expression: 'sleepy',
          bubbleText: 'why are we both awake?',
          durationMs: 4000,
        });
        if (res.accepted) {
          lateNightFired = true;
        }
      }

      // 2. Return Visitor check (once per session)
      let returnSessionChecked = false;
      try {
        returnSessionChecked = sessionStorage.getItem('biyoo_return_session_checked') === 'true';
      } catch {
        // ignore
      }

      if (!returnSessionChecked) {
        try {
          sessionStorage.setItem('biyoo_return_session_checked', 'true');
          const rawCount = localStorage.getItem('biyoo_visit_count');
          const count = rawCount ? parseInt(rawCount, 10) : 0;
          const newCount = (isNaN(count) ? 0 : count) + 1;
          localStorage.setItem('biyoo_visit_count', String(newCount));

          // If late night already fired, gate cooldown (20s) suppresses; only fire if late night didn't fire
          if (!lateNightFired) {
            if (newCount === 2) {
              requestReaction({
                type: 'return_visitor',
                expression: 'happy',
                bubbleText: "you're back",
                durationMs: 3000,
                measuredValue: `visit count: ${newCount}`,
              });
            } else if (newCount >= 3) {
              requestReaction({
                type: 'return_visitor',
                expression: 'happy',
                bubbleText: "third time? I'm flattered",
                durationMs: 3000,
                measuredValue: `visit count: ${newCount}`,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [enableSessionGreetings, requestReaction]);

  // -----------------------------------------------------------------
  // Requirement: Project-world moods (Step 7)
  // #edge-cloud -> Happy with bounce
  // #ratify -> Curious
  // #iac-verifier -> Neutral
  // Starts when > 50% visible for 1.5s
  // Ends when < 30% visible -> Neutral
  // Suppressed during fast scroll and quiet mode
  // Overridden by idle chain, wake-up, tab-return, bubble reactions
  // -----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sections: { id: string; expression: BiyooExpressionName; bounce: boolean }[] = [
      { id: 'edge-cloud', expression: 'happy', bounce: true },
      { id: 'ratify', expression: 'curious', bounce: false },
      { id: 'iac-verifier', expression: 'neutral', bounce: false },
    ];

    const interval = setInterval(() => {
      // Quiet Biyoo ON: zero mood changes
      if (quietModeRef.current) {
        if (currentMoodRef.current !== null) {
          currentMoodRef.current = null;
          currentMoodSectionRef.current = null;
          setCurrentMood(null);
          setCurrentMoodSection(null);
          setExpression('neutral', reducedMotionRef.current ? 0 : 180);
        }
        sectionVisibleSinceRef.current = {};
        return;
      }

      const now = Date.now();
      const perfNow = performance.now();
      const isFastScrolling =
        perfNow - lastFastScrollTimeRef.current < 600 || fastScrollStartRef.current !== 0;

      // Check exit of currently active mood section (< 30% visible)
      if (currentMoodSectionRef.current) {
        const activeVis = getSectionVisibility(currentMoodSectionRef.current);
        if (activeVis < MOOD_VISIBILITY_END_RATIO) {
          const endedSection = currentMoodSectionRef.current;
          const rawVis = Math.round(activeVis * 1000) / 10;
          currentMoodRef.current = null;
          currentMoodSectionRef.current = null;
          setCurrentMood(null);
          setCurrentMoodSection(null);
          delete moodStartTimestampRef.current[endedSection];

          if (
            !reactionTimerRef.current &&
            !isWakingRef.current &&
            !wasTabAwayRef.current &&
            !isSleepingRef.current
          ) {
            setExpression('neutral', reducedMotionRef.current ? 0 : 180);
            logAction(
              'neutral',
              null,
              `Mood ended for section #${endedSection}: visibility ${rawVis}% (< 30%) -> Neutral`
            );
          }
        }
      }

      if (isFastScrolling) {
        sectionVisibleSinceRef.current = {};
        return;
      }

      // Check sections for mood start (> 50% for 1.5s)
      for (const sec of sections) {
        const vis = getSectionVisibility(sec.id);
        if (vis > MOOD_VISIBILITY_START_RATIO) {
          if (!sectionVisibleSinceRef.current[sec.id]) {
            sectionVisibleSinceRef.current[sec.id] = now;
          } else {
            const visibleDuration = now - sectionVisibleSinceRef.current[sec.id];
            if (visibleDuration >= MOOD_START_DURATION_MS) {
              if (currentMoodSectionRef.current !== sec.id) {
                currentMoodRef.current = sec.expression;
                currentMoodSectionRef.current = sec.id;
                setCurrentMood(sec.expression);
                setCurrentMoodSection(sec.id);
                moodStartTimestampRef.current[sec.id] = now;

                const rawVis = Math.round(vis * 1000) / 10;
                logAction(
                  sec.expression,
                  null,
                  `Mood started for section #${sec.id}: ${sec.expression} (${rawVis}% visible for ${(visibleDuration / 1000).toFixed(1)}s)`
                );

                if (
                  !reactionTimerRef.current &&
                  !isWakingRef.current &&
                  !wasTabAwayRef.current &&
                  !isSleepingRef.current
                ) {
                  setExpression(sec.expression, reducedMotionRef.current ? 0 : 180);
                  if (sec.bounce && !reducedMotionRef.current) {
                    triggerHop();
                  }
                }
              }
            }
          }
        } else {
          delete sectionVisibleSinceRef.current[sec.id];
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [getSectionVisibility, logAction, setExpression, triggerHop]);

  return {
    currentMood,
    currentMoodSection,
    getMoodStartTimestamp: (secId: string) => moodStartTimestampRef.current[secId] || null,
    currentExpression,
    faceParams,
    bubbleText,
    isHopping,
    isSleeping,
    pointingArm,
    setPointingArm,
    idleSeconds,
    idleScale,
    setIdleScale,
    quietMode,
    setQuietMode,
    toggleQuietMode,
    reducedMotion,
    setReducedMotion,
    logEntries,
    blinkHistory,
    showBubble,
    triggerReactionBubble,
    requestReaction,
    dismissBubble,
    triggerBlink,
    triggerHop,
    forceState,
    triggerWakeSequence,
    triggerHappyHold,
    simulateTabAway,
    simulateTabReturn,
    resetInactivity,
    resetBubbleCooldown: () => {
      lastBubbleTimeRef.current = 0;
    },
    triggerFastScroll,
    triggerLinger,
    triggerCursorStill,
    triggerSkipBottom,
    triggerLateNight,
    triggerReturnVisitor,
    getOriginalTitle: () => originalTitleRef.current,
    getLastSurprisedDuration: () => lastSurprisedDurationRef.current,
    getLastHappyHoldDuration: () => lastHappyHoldDurationRef.current,
    lastSurprisedDuration: lastSurprisedDurationRef.current,
    lastHappyHoldDuration: lastHappyHoldDurationRef.current,
    getBlinkHistory: () => blinkHistoryRef.current,
    resetBlinkHistory: () => {
      blinkHistoryRef.current = [];
      setBlinkHistory([]);
    },
    getRawTriggerHistory: () => rawTriggerHistoryRef.current,
    clearRawTriggerHistory: () => {
      rawTriggerHistoryRef.current = [];
    },
    qaActive,
    setQaActive,
    setExpression: (name: BiyooExpressionName) =>
      setExpression(name, reducedMotionRef.current ? 0 : 180),
  };
}
