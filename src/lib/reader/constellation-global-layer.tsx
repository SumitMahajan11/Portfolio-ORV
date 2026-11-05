"use client";

import React, { useEffect, useState } from "react";
import { useHeroContext } from "@/components/dokja/hero-context";
import { useReaderTracker } from "./use-reader";
import { useMode } from "@/lib/flags";
import { useConstellationEngine } from "./use-constellation";
import { ConstellationOverlay } from "./constellation-overlay";

export function ConstellationGlobalLayer() {
  const { heroState } = useHeroContext();
  const { signals } = useMode();
  const readerSignals = useReaderTracker();
  const [isBiyooSpeaking, setIsBiyooSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBiyooSpeaking = (e: Event) => {
      const customEvent = e as CustomEvent<{ isSpeaking: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isSpeaking === "boolean") {
        setIsBiyooSpeaking(customEvent.detail.isSpeaking);
      }
    };
    window.addEventListener("biyoo:speaking", handleBiyooSpeaking);
    return () => {
      window.removeEventListener("biyoo:speaking", handleBiyooSpeaking);
    };
  }, []);

  const introComplete = heroState.introDone;
  const { activeLine, dismissLine } = useConstellationEngine({
    introComplete,
    introDone: introComplete,
    isBiyooSpeaking,
    scrollSpeed: readerSignals.scrollSpeed,
    idleSeconds: readerSignals.idleSeconds,
    localHour: readerSignals.localHour,
    isTouch: signals.isTouch,
    observeSections: true,
  });

  if (!introComplete) return null;

  return (
    <ConstellationOverlay
      line={activeLine}
      onDismiss={dismissLine}
      introComplete={introComplete}
    />
  );
}

export default ConstellationGlobalLayer;
