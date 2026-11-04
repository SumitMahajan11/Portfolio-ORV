/**
 * Reader Tracking Types & Constants
 *
 * Local-only tracker types:
 * Zero network calls, zero persistent storage.
 * Follows /docs/07-BIYOO-PERSONALITY-AND-SOUND.md and /docs/14-CONSTELLATION-LINES.md.
 */

export interface PointerPosition {
  x: number;
  y: number;
}

export interface ReaderSignals {
  /** Seconds elapsed since the last user interaction (scroll/pointer/key/touch) */
  idleSeconds: number;
  /** Smoothed scroll speed in pixels per second */
  scrollSpeed: number;
  /** Current viewport coordinates of the pointer (defaults to center of screen) */
  pointerPosition: PointerPosition;
  /** Description or tag name of the element currently hovered */
  hoverTarget: string | null;
  /** Visitor local hour from 0 to 23 (e.g. 0-4 is night, 5-9 is morning) */
  localHour: number;
}

/**
 * Fast-scroll threshold in smoothed pixels per second.
 * Exceeding this rate indicates intentional rapid skipping or skimming.
 */
export const FAST_SCROLL_THRESHOLD_PX_PER_SEC = 1200;

/**
 * Cooldown between constellation comment appearances in seconds.
 * Per /docs/14: max 1 line per 20 seconds.
 */
export const CONSTELLATION_COOLDOWN_SECONDS = 20;

/**
 * Idle nudge threshold in seconds.
 * Triggers Biyoo yawn-wake nudge sequence if no input arrives after introDone.
 */
export const IDLE_NUDGE_SECONDS = 8;

/**
 * Inactivity sleep threshold in seconds.
 * Triggers Biyoo sleepy-again state if no input arrives for 60s.
 */
export const SLEEPY_AGAIN_SECONDS = 60;
