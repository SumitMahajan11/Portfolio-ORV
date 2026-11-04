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
  setSoundOn: () => {},
  setCameraOn: () => {},
  forceMode: () => {},
};

export const ModeContext = createContext<FeatureFlags>(defaultContextValue);

export interface ModeProviderProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

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
    if (signals.reducedMotion) {
      return "reduced";
    }

    // Manual developer override (e.g. from /dev/mode UI)
    if (manualModeOverride) {
      return manualModeOverride;
    }

    return resolveDeviceMode(signals);
  }, [signals, manualModeOverride]);

  const particleCap = useMemo<number>(() => {
    return getParticleCap(mode, signals.isTouch || signals.isCoarsePointer);
  }, [mode, signals.isTouch, signals.isCoarsePointer]);

  // Client mounting, media query listener, and frame probe
  useEffect(() => {
    // Read initial client signals after paint
    const initialSignals = readClientSignals();
    requestAnimationFrame(() => {
      setSignals(initialSignals);
    });

    // Live listener for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSignals((prev) => ({
        ...prev,
        reducedMotion: e.matches,
      }));
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMotionChange);
    } else {
      mediaQuery.addListener(handleMotionChange);
    }

    // Run frame-time probe after ~500ms
    const cancelProbe = runFrameProbe((probeResult: ProbeResult) => {
      setSignals((prev) => ({
        ...prev,
        probe: probeResult,
      }));
    }, 500);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleMotionChange);
      } else {
        mediaQuery.removeListener(handleMotionChange);
      }
      cancelProbe();
    };
  }, []);

  const forceMode = useCallback((newMode: DeviceMode | null) => {
    setManualModeOverride(newMode);
  }, []);

  const value: FeatureFlags = useMemo(
    () => ({
      mode,
      lightMode: mode === "light",
      reducedMotion: mode === "reduced",
      soundOn,
      cameraOn,
      particleCap,
      signals,
      isHydrated,
      setSoundOn,
      setCameraOn,
      forceMode,
    }),
    [mode, soundOn, cameraOn, particleCap, signals, isHydrated, forceMode]
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
