"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useMode } from "@/lib/flags";

export interface UseCameraReflectionOptions {
  sectionRef?: React.RefObject<HTMLElement | null>;
}

export interface UseCameraReflectionReturn {
  isActive: boolean;
  isRequesting: boolean;
  biyooLine: string | null;
  videoRefCallback: (node: HTMLVideoElement | null) => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  reducedMotion: boolean;
}

/**
 * useCameraReflection:
 * Manages optional user-triggered camera reflection in the Act 6 Finale scene.
 *
 * Rules:
 * 1. Never auto-requested. Only triggered on explicit button click.
 * 2. getUserMedia({ video: { facingMode: 'user' }, audio: false }).
 * 3. On success: faint mirrored reflection, opacity ~0.2, grayscale, behind Dokja's gaze layer.
 * 4. Stays strictly local on device. No canvas capture, no recording, no storage, no network calls.
 * 5. On denial / error / insecure context: shows short in-character Biyoo line, no error banners.
 * 6. Stop all tracks and remove video on:
 *    - toggle off
 *    - leaving the finale section (IntersectionObserver)
 *    - tab hidden (visibilitychange)
 *    - unmount
 * 7. Feature flag cameraOn defaults to false.
 */
export function useCameraReflection(
  options?: UseCameraReflectionOptions
): UseCameraReflectionReturn {
  const { setCameraOn, reducedMotion } = useMode();
  const [isActive, setIsActive] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [biyooLine, setBiyooLine] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        for (const track of tracks) {
          track.stop();
        }
      } catch {
        // Silent failure
      }
      streamRef.current = null;
    }

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }

    setIsActive(false);
    setIsRequesting(false);
    setCameraOn(false);
  }, [setCameraOn]);

  const startCamera = useCallback(async () => {
    setBiyooLine(null);
    setIsRequesting(true);

    // Guard for insecure contexts or unsupported browsers
    if (
      typeof window === "undefined" ||
      !navigator?.mediaDevices?.getUserMedia
    ) {
      setIsRequesting(false);
      setIsActive(false);
      setCameraOn(false);
      setBiyooLine("Ba-at! Biyoo understands. The reader stays hidden in the stars.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setIsActive(true);
      setIsRequesting(false);
      setCameraOn(true);

      // Connect stream to video element if already mounted
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(() => {});
      }
    } catch {
      // Denial, device unavailable, permission dismissed, or error
      // Rule 3: Show a short Biyoo line and keep everything else working. No error banners.
      setIsRequesting(false);
      setIsActive(false);
      setCameraOn(false);
      setBiyooLine("Ba-at! Biyoo understands. The reader stays hidden in the stars.");
    }
  }, [setCameraOn]);

  // Video node callback ref: sets stream the moment video element mounts
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoElementRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Trigger 2: Stop tracks when leaving the finale section
  useEffect(() => {
    const section = options?.sectionRef?.current;
    if (!section || !isActive) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting && isActive) {
          stopCamera();
        }
      },
      { threshold: 0 }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, [isActive, options?.sectionRef, stopCamera]);

  // Trigger 3: Stop tracks when tab is hidden
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        stopCamera();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive, stopCamera]);

  // Trigger 4: Stop tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        try {
          const tracks = streamRef.current.getTracks();
          for (const track of tracks) {
            track.stop();
          }
        } catch {
          // Silent failure
        }
        streamRef.current = null;
      }
    };
  }, []);

  return {
    isActive,
    isRequesting,
    biyooLine,
    videoRefCallback,
    startCamera,
    stopCamera,
    reducedMotion,
  };
}

/**
 * CameraReflectionOverlay:
 * Faint mirrored reflection inside the dark-glass area behind Dokja's gaze layer.
 * Strictly decorative, pointer-events-none, muted, playsInline.
 */
export function CameraReflectionOverlay({
  videoRefCallback,
  isActive,
  isReduced,
}: {
  videoRefCallback: (node: HTMLVideoElement | null) => void;
  isActive: boolean;
  isReduced: boolean;
}) {
  if (!isActive) return null;

  return (
    <video
      ref={videoRefCallback}
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full object-cover opacity-20 grayscale -scale-x-100 z-0 ${
        isReduced ? "" : "transition-opacity duration-700 ease-out"
      }`}
    />
  );
}

/**
 * CameraReflectionControls:
 * Non-intrusive interactive trigger and status for the optional camera reflection.
 */
export function CameraReflectionControls({
  isActive,
  isRequesting,
  biyooLine,
  onStart,
  onStop,
  className = "",
}: {
  isActive: boolean;
  isRequesting: boolean;
  biyooLine: string | null;
  onStart: () => void;
  onStop: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center space-y-2 pt-2 ${className}`}
      aria-label="Story camera reflection controls"
    >
      {isActive ? (
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg border border-line hover:border-rose/60 bg-surface/50 hover:bg-surface text-xs font-mono tracking-wider uppercase text-feather hover:text-rose transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/50"
        >
          Turn camera off
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={isRequesting}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg border border-line hover:border-star/60 bg-surface/50 hover:bg-surface text-xs font-mono tracking-wider uppercase text-feather hover:text-star transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star/50"
        >
          {isRequesting ? "Opening lens..." : "Let the story see you?"}
        </button>
      )}

      {/* In-character Biyoo feedback upon denial, error, or insecure context (no error banners) */}
      {biyooLine && (
        <div
          role="status"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-void/85 border border-star/30 text-xs font-sans text-feather shadow-sm"
        >
          <span className="text-star font-mono font-bold">[Biyoo]</span>
          <span>{biyooLine}</span>
        </div>
      )}

      {/* Mandatory privacy microcopy */}
      <p className="font-mono text-[11px] text-mist/80 tracking-wide select-none">
        Stays on your device. Nothing is recorded.
      </p>
    </div>
  );
}
