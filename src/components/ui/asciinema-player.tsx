"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "asciinema-player/dist/bundle/asciinema-player.css";

export interface AsciinemaPlayerProps {
  src: string;
  className?: string;
  ariaLabel?: string;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionClientSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AsciinemaPlayer({
  src,
  className = "",
  ariaLabel = "Terminal session recording of 3-node Raft consensus",
}: AsciinemaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const isClient = useSyncExternalStore(subscribeClient, getClientSnapshot, getServerSnapshot);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionClientSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!isClient || !container) return;

    let playerInstance: { dispose?: () => void } | null = null;
    let disposed = false;

    async function init() {
      try {
        const Asciinema = await import("asciinema-player");
        if (disposed || !container) return;

        container.innerHTML = "";

        playerInstance = Asciinema.create(src, container, {
          fit: "width",
          autoPlay: false,
          preload: false,
          terminalFontSize: "small",
        });
      } catch (err) {
        console.error("Asciinema player initialization failed:", err);
        setError(true);
      }
    }

    init();

    return () => {
      disposed = true;
      if (playerInstance && typeof playerInstance.dispose === "function") {
        try {
          playerInstance.dispose();
        } catch {
          // ignore cleanup errors
        }
      }
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [src, isClient]);

  if (!isClient) {
    return (
      <div className="w-full aspect-video rounded border border-line bg-ink-2/60 flex items-center justify-center font-mono text-xs sm:text-[13px] text-mist">
        Loading terminal recording player...
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {prefersReducedMotion && (
        <div className="p-2.5 rounded border border-line/60 bg-ink-2/80 text-xs sm:text-[13px] font-mono text-mist flex items-center justify-between">
          <span>Reduced motion preference detected: autoplay is disabled.</span>
        </div>
      )}

      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className="w-full rounded border border-line bg-[#121314] overflow-hidden min-h-[300px] shadow-lg"
      />

      {error && (
        <div className="p-3 rounded border border-red-500/40 bg-red-950/20 text-xs sm:text-[13px] font-mono text-mist text-center">
          Unable to initialize embedded terminal player.{" "}
          <a
            href={src}
            download
            className="text-star underline hover:text-feather ml-1"
          >
            Download .cast recording directly ↗
          </a>
        </div>
      )}

      <div className="flex items-center justify-between font-mono text-xs sm:text-[13px] text-mist pt-1">
        <span>Format: asciicast v2 (.cast)</span>
        <a
          href={src}
          download="demo_recording.cast"
          className="text-mist hover:text-star transition-colors underline underline-offset-4"
        >
          Download raw .cast file fallback ↗
        </a>
      </div>
    </div>
  );
}

export default AsciinemaPlayer;
