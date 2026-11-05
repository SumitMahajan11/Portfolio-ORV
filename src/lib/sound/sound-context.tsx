"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { SoundName } from "./types";
import { SOUND_CONFIGS } from "./types";

export interface SoundContextValue {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  playSound: (name: SoundName) => void;
  stopSound: (name: SoundName) => void;
  stopAllSounds: () => void;
  promptVisible: boolean;
  dismissPrompt: (turnOn: boolean) => void;
  showPrompt: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

const STORAGE_KEY = "sound_pref";

export interface SoundProviderProps {
  children: React.ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps) {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      return false;
    }
  });
  const [promptVisible, setPromptVisible] = useState<boolean>(false);

  // Active audio elements tracking
  const breathAudioRef = useRef<HTMLAudioElement | null>(null);
  const isTabHiddenRef = useRef<boolean>(false);
  const wasBreathPlayingBeforeHiddenRef = useRef<boolean>(false);

  // Schedule prompt after initial arrival / intro (~4.5s) if first-time visitor
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const promptTimer = setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setPromptVisible(true);
        }
      } catch {
        // storage error
      }
    }, 4500);

    return () => clearTimeout(promptTimer);
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // storage unavailable
    }

    if (!enabled && breathAudioRef.current) {
      breathAudioRef.current.pause();
      breathAudioRef.current.currentTime = 0;
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [soundEnabled, setSoundEnabled]);

  const dismissPrompt = useCallback(
    (turnOn: boolean) => {
      setPromptVisible(false);
      setSoundEnabled(turnOn);
      if (turnOn) {
        // User gesture unlocks audio context: play a gentle click sound
        try {
          const audio = new Audio(SOUND_CONFIGS.pat.file);
          audio.volume = SOUND_CONFIGS.pat.volume;
          audio.onerror = () => {};
          audio.play().catch(() => {});
        } catch {
          // silently fail
        }
      }
    },
    [setSoundEnabled]
  );

  const showPrompt = useCallback(() => {
    setPromptVisible(true);
  }, []);

  const stopSound = useCallback((name: SoundName) => {
    if (name === "breath" && breathAudioRef.current) {
      try {
        breathAudioRef.current.pause();
        breathAudioRef.current.currentTime = 0;
      } catch {
        // silently fail
      }
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    if (breathAudioRef.current) {
      try {
        breathAudioRef.current.pause();
        breathAudioRef.current.currentTime = 0;
      } catch {
        // silently fail
      }
    }
  }, []);

  const playSound = useCallback(
    (name: SoundName) => {
      if (!soundEnabled || isTabHiddenRef.current) return;

      const config = SOUND_CONFIGS[name];
      if (!config) return;

      try {
        if (name === "breath") {
          // Looping breath sound
          if (!breathAudioRef.current) {
            const audio = new Audio(config.file);
            audio.loop = true;
            audio.volume = config.volume;
            audio.onerror = () => {};
            breathAudioRef.current = audio;
          }

          if (breathAudioRef.current.paused) {
            breathAudioRef.current.currentTime = 0;
            breathAudioRef.current.play().catch(() => {
              // Silently catch audio play policy / missing file errors
            });
          }
          return;
        }

        // One-shot sound effects
        const audio = new Audio(config.file);
        audio.volume = config.volume;
        audio.onerror = () => {};
        audio.play().catch(() => {
          // Silently catch audio play policy / missing file errors
        });
      } catch {
        // Native audio instantiation failure: fail silently
      }
    },
    [soundEnabled]
  );

  // Tab hidden handling: pause everything when tab is hidden, resume loop on return
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabHiddenRef.current = true;
        if (breathAudioRef.current && !breathAudioRef.current.paused) {
          wasBreathPlayingBeforeHiddenRef.current = true;
          breathAudioRef.current.pause();
        } else {
          wasBreathPlayingBeforeHiddenRef.current = false;
        }
      } else {
        isTabHiddenRef.current = false;
        if (
          wasBreathPlayingBeforeHiddenRef.current &&
          soundEnabled &&
          breathAudioRef.current
        ) {
          breathAudioRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [soundEnabled]);

  // Global event listener for custom "biyoo:sound" & "biyoo:sound-stop"
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCustomSound = (e: Event) => {
      const customEv = e as CustomEvent<{ sound: SoundName }>;
      if (customEv.detail?.sound) {
        playSound(customEv.detail.sound);
      }
    };

    const handleCustomStop = (e: Event) => {
      const customEv = e as CustomEvent<{ sound?: SoundName }>;
      if (customEv.detail?.sound) {
        stopSound(customEv.detail.sound);
      } else {
        stopAllSounds();
      }
    };

    window.addEventListener("biyoo:sound", handleCustomSound);
    window.addEventListener("biyoo:sound-stop", handleCustomStop);
    return () => {
      window.removeEventListener("biyoo:sound", handleCustomSound);
      window.removeEventListener("biyoo:sound-stop", handleCustomStop);
    };
  }, [playSound, stopSound, stopAllSounds]);

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        playSound,
        stopSound,
        stopAllSounds,
        promptVisible,
        dismissPrompt,
        showPrompt,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
