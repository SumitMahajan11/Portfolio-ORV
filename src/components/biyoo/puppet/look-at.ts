import type { Point2D } from './types';

export interface LookAtResult {
  pupilOffsetX: number;
  pupilOffsetY: number;
  faceShiftX: number;
  faceShiftY: number;
}

// Default face anchor center in 1024x1024 canvas
export const DEFAULT_FACE_CENTER: Point2D = { x: 515, y: 495 };

// Physical constraints
const MAX_PUPIL_RADIUS = 13.0; // max px pupils can travel inside the eye
const MAX_FACE_SHIFT_X = 10.0; // max px whole face shifts horizontally
const MAX_FACE_SHIFT_Y = 7.0;  // max px whole face shifts vertically

/**
 * Calculates pupil offset and whole-face parallax shift given a target point.
 *
 * @param target Target point { x, y } (e.g. in 1024x1024 canvas coordinates or client screen coordinates)
 * @param center Optional center origin (defaults to Biyoo's face center 515, 495)
 */
export function calculateLookAt(
  target: Point2D,
  center: Point2D = DEFAULT_FACE_CENTER
): LookAtResult {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 0.001) {
    return {
      pupilOffsetX: 0,
      pupilOffsetY: 0,
      faceShiftX: 0,
      faceShiftY: 0,
    };
  }

  const dirX = dx / dist;
  const dirY = dy / dist;

  // Non-linear distance curve for realistic eye movement:
  // Quick responsiveness nearby, asymptotic approach to max range
  const normDist = Math.min(dist / 350, 1.0);
  const pupilTravel = Math.pow(normDist, 0.8) * MAX_PUPIL_RADIUS;

  const pupilOffsetX = dirX * pupilTravel;
  const pupilOffsetY = dirY * pupilTravel;

  // Face shift is subtle, proportional to target direction
  const faceShiftX = dirX * normDist * MAX_FACE_SHIFT_X;
  const faceShiftY = dirY * normDist * MAX_FACE_SHIFT_Y;

  return {
    pupilOffsetX: Math.round(pupilOffsetX * 100) / 100,
    pupilOffsetY: Math.round(pupilOffsetY * 100) / 100,
    faceShiftX: Math.round(faceShiftX * 100) / 100,
    faceShiftY: Math.round(faceShiftY * 100) / 100,
  };
}

