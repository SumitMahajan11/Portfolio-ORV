import type { HeroStage } from "../hero-context";
import type { DeviceMode } from "@/lib/device/types";

export interface StageOptions {
  mode: DeviceMode;
  isTouch: boolean;
  reducedMotion: boolean;
}

export interface StageCallbackHooks {
  setStage: (stage: HeroStage) => void;
  onGlitchState?: (active: boolean, visible: boolean) => void;
}
