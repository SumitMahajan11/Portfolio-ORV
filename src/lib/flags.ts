"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  DeviceMode,
  DeviceSignals,
  ProbeResult,
} from "./device/types";
import {
  getInitialDeviceState,
  readClientSignals,
  resolveDeviceMode,
  getParticleCap,
} from "./device/detect";
import { runFrameProbe } from "./device/probe";

const SESSION_STORAGE_MOTION_KEY = "motion_mode";

/**
 * FeatureFlags interface per /docs/04 and task requirements:
 * - lightMode: boolean
 * - reducedMotion: boolean
 * - soundOn: boolean (default false)
 * - cameraOn: boolean (default false)
 * - mode: 'full' | 'light' | 'reduced'
 */
export interface FeatureFlags {
  mode: DeviceMode;
  lightMode: boolean;
  reducedMotion: boolean;
  soundOn: boolean;
  cameraOn: boolean;
  particleCap: number;
  signals: DeviceSignals;
  isHydrated: boolean;
  setSoundOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  setCameraOn: (on: boolean | ((prev: boolean) => boolean)) => void;
  forceMode: (mode: DeviceMode | null) => void;
  toggleMotionMode: () => void;
}

const defaultInitialState = getInitialDeviceState();

const defaultContextValue: FeatureFlags = {
  mode: defaultInitialState.mode,
  lightMode: defaultInitialState.mode === "light",
  reducedMotion: defaultInitialState.mode === "reduced",
  soundOn: false,
  cameraOn: false,
  particleCap: defaultInitialState.particleCap,
  signals: defaultInitialState.signals,
  isHydrated: false,
  setSoundOn: () => { },
  setCameraOn: () => { },
  forceMode: () => { },
  toggleMotionMode: () => { },
};

export const ModeContext = createContext<FeatureFlags>(defaultContextValue);

export interface ModeProviderProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => { };

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => { };
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  } else {
    mql.addListener(callback);
    return () => mql.removeListener(callback);
  }
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/**
 * ModeProvider:
 * Sits near root to evaluate device capabilities, listen for prefers-reduced-motion
 * changes, run frame-time probe, and provide typed feature flags across the app.
 *
 * Guarantees zero hydration mismatch by initializing with safe server defaults
 * and updating after mount on the client.
 */
export function ModeProvider({ children }: ModeProviderProps) {
  // Canonical React pattern for safe hydration detection without cascading renders
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Synchronous, reactive subscription to system prefers-reduced-motion
  const systemReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const [signals, setSignals] = useState<DeviceSignals>(
    defaultInitialState.signals
  );
  const [manualModeOverride, setManualModeOverride] = useState<
    DeviceMode | null
  >(null);
  const [soundOn, setSoundOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  // Compute active mode
  const mode = useMemo<DeviceMode>(() => {
    // If reduced-motion is requested by user, it strictly overrides everything
    if (systemReducedMotion || signals.reducedMotion) {
      return "reduced";
    }

    // Manual developer/user override (e.g. from Motion: Full / Light toggle or /dev/mode UI)
    if (manualModeOverride) {
      return manualModeOverride;
    }

    return resolveDeviceMode({
      ...signals,
      reducedMotion: systemReducedMotion || signals.reducedMotion,
    });
  }, [systemReducedMotion, signals, manualModeOverride]);

  const particleCap = useMemo<number>(() => {
    return getParticleCap(mode, signals.isTouch || signals.isCoarsePointer);
  }, [mode, signals.isTouch, signals.isCoarsePointer]);

  // Client mounting: read client hardware capabilities, session storage, and run frame probe
  useEffect(() => {
    const initialSignals = readClientSignals();
    initialSignals.reducedMotion = systemReducedMotion;

    requestAnimationFrame(() => {
      setSignals(initialSignals);

      try {
        const savedMode = sessionStorage.getItem(SESSION_STORAGE_MOTION_KEY);
        if (savedMode === "light" || savedMode === "full") {
          setManualModeOverride(savedMode);
        }
      } catch {
        // Ignore sessionStorage access errors
      }
    });

    // Run frame-time probe after ~500ms
    const cancelProbe = runFrameProbe((probeResult: ProbeResult) => {
      setSignals((prev) => ({
        ...prev,
        probe: probeResult,
      }));
    }, 500);

    return () => {
      cancelProbe();
    };
  }, [systemReducedMotion]);

  const forceMode = useCallback((newMode: DeviceMode | null) => {
    setManualModeOverride(newMode);

    try {
      if (newMode === "light" || newMode === "full") {
        sessionStorage.setItem(SESSION_STORAGE_MOTION_KEY, newMode);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_MOTION_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleMotionMode = useCallback(() => {
    // Cannot force Full when the OS says reduce motion
    if (systemReducedMotion || signals.reducedMotion) {
      return;
    }
    const nextMode = mode === "light" ? "full" : "light";
    forceMode(nextMode);
  }, [systemReducedMotion, signals.reducedMotion, mode, forceMode]);

  const value: FeatureFlags = useMemo(
    () => ({
      mode,
      lightMode: mode === "light",
      reducedMotion: mode === "reduced",
      soundOn,
      cameraOn,
      particleCap,
      signals: {
        ...signals,
        reducedMotion: systemReducedMotion || signals.reducedMotion,
      },
      isHydrated,
      setSoundOn,
      setCameraOn,
      forceMode,
      toggleMotionMode,
    }),
    [
      mode,
      soundOn,
      cameraOn,
      particleCap,
      signals,
      systemReducedMotion,
      isHydrated,
      forceMode,
      toggleMotionMode,
    ]
  );

  return React.createElement(ModeContext.Provider, { value }, children);
}

/**
 * useMode hook:
 * Provides access to current feature flags and device mode.
 */
export function useMode(): FeatureFlags {
  return useContext(ModeContext);
}

export default useMode;
