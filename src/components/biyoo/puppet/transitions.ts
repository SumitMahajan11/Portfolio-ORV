import { useState, useRef, useEffect, useCallback } from 'react';
import type { BiyooFaceParams, BiyooEyeStyle, BiyooMouthShape } from './types';

// Standard easeInOutCubic for organic, fluid animation
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Pure interpolation between two BiyooFaceParams states at progress t in [0, 1].
 * All numeric parameters interpolate smoothly.
 * Style transitions dynamically modulate eyelid openness around the midpoint
 * to simulate a natural micro-blink, preventing any visual snapping between styles.
 */
export function interpolateFaceParams(
  from: BiyooFaceParams,
  to: BiyooFaceParams,
  progress: number
): BiyooFaceParams {
  const t = Math.max(0, Math.min(1, progress));
  const eased = easeInOutCubic(t);

  const styleSwitch = t >= 0.5;
  const eyeStyleL: BiyooEyeStyle = styleSwitch ? to.eyeStyleL : from.eyeStyleL;
  const eyeStyleR: BiyooEyeStyle = styleSwitch ? to.eyeStyleR : from.eyeStyleR;
  const mouthShape: BiyooMouthShape = styleSwitch ? to.mouthShape : from.mouthShape;
  const wateryEyes = styleSwitch ? to.wateryEyes : from.wateryEyes;
  const browStyle = styleSwitch ? to.browStyle : from.browStyle;
  const highlightPos = styleSwitch ? to.highlightPos : from.highlightPos;

  // Base interpolated openness
  let eyeOpennessL = lerp(from.eyeOpennessL, to.eyeOpennessL, eased);
  let eyeOpennessR = lerp(from.eyeOpennessR, to.eyeOpennessR, eased);

  // If changing eye styles (e.g. normal -> arc / squeeze), blend via a micro-dip
  if (from.eyeStyleL !== to.eyeStyleL) {
    // Parabolic dip at midpoint t=0.5
    const dip = 4 * t * (1 - t); // 0 at t=0, 1 at t=0.5, 0 at t=1
    eyeOpennessL = Math.max(0, eyeOpennessL - dip * 0.4);
  }
  if (from.eyeStyleR !== to.eyeStyleR) {
    const dip = 4 * t * (1 - t);
    eyeOpennessR = Math.max(0, eyeOpennessR - dip * 0.4);
  }

  return {
    eyeOpennessL,
    eyeOpennessR,
    eyeSizeL: lerp(from.eyeSizeL, to.eyeSizeL, eased),
    eyeSizeR: lerp(from.eyeSizeR, to.eyeSizeR, eased),
    eyeStyleL,
    eyeStyleR,
    eyeShiftX: lerp(from.eyeShiftX ?? 0, to.eyeShiftX ?? 0, eased),
    eyeShiftY: lerp(from.eyeShiftY ?? 0, to.eyeShiftY ?? 0, eased),
    pupilOffsetX: lerp(from.pupilOffsetX, to.pupilOffsetX, eased),
    pupilOffsetY: lerp(from.pupilOffsetY, to.pupilOffsetY, eased),
    highlightPos,
    browHeightL: lerp(from.browHeightL, to.browHeightL, eased),
    browHeightR: lerp(from.browHeightR, to.browHeightR, eased),
    browAngleL: lerp(from.browAngleL, to.browAngleL, eased),
    browAngleR: lerp(from.browAngleR, to.browAngleR, eased),
    browVisibleL: styleSwitch ? to.browVisibleL : from.browVisibleL,
    browVisibleR: styleSwitch ? to.browVisibleR : from.browVisibleR,
    browStyle,
    mouthShape,
    mouthOpenness: lerp(from.mouthOpenness, to.mouthOpenness, eased),
    mouthWidth: lerp(from.mouthWidth, to.mouthWidth, eased),
    blushOpacity: lerp(from.blushOpacity, to.blushOpacity, eased),
    wateryEyes,
    faceRotate: lerp(from.faceRotate ?? 0, to.faceRotate ?? 0, eased),
    faceShiftX: lerp(from.faceShiftX, to.faceShiftX, eased),
    faceShiftY: lerp(from.faceShiftY, to.faceShiftY, eased),
  };
}

/**
 * Hook to smoothly transition face parameters over time using requestAnimationFrame.
 */
export function useFaceTransition(initialParams: BiyooFaceParams) {
  const [params, setParams] = useState<BiyooFaceParams>(initialParams);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const startParamsRef = useRef<BiyooFaceParams>(initialParams);
  const targetParamsRef = useRef<BiyooFaceParams>(initialParams);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(300);
  const rafIdRef = useRef<number | null>(null);

  const transitionTo = useCallback(
    (target: BiyooFaceParams, durationMs: number = 320) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      startParamsRef.current = { ...params };
      targetParamsRef.current = { ...target };
      durationRef.current = Math.max(16, durationMs);
      startTimeRef.current = performance.now();
      setIsTransitioning(true);

      const step = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(1.0, elapsed / durationRef.current);
        const current = interpolateFaceParams(
          startParamsRef.current,
          targetParamsRef.current,
          progress
        );
        setParams(current);

        if (progress < 1.0) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          setIsTransitioning(false);
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [params]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    params,
    setParams,
    isTransitioning,
    transitionTo,
  };
}

