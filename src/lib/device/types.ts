export type DeviceMode = "full" | "light" | "reduced";

export interface ProbeResult {
  state: "idle" | "probing" | "completed" | "skipped";
  avgFrameTimeMs: number;
  fps: number;
  isSlow: boolean;
  frameCount: number;
}

export interface DeviceSignals {
  reducedMotion: boolean;
  hardwareConcurrency: number | undefined;
  deviceMemory: number | undefined;
  isCoarsePointer: boolean;
  isTouch: boolean;
  probe: ProbeResult;
  queryOverride: "light" | "full" | null;
}

export interface DeviceState {
  mode: DeviceMode;
  particleCap: number;
  signals: DeviceSignals;
  isHydrated: boolean;
}
