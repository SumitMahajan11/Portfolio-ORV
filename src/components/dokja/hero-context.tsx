"use client";

import React, { createContext, useContext, useState } from "react";

export type HeroStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface HeroState {
  stage: HeroStage;
  scrollProgress: number;
  introDone: boolean;
}

export interface HeroContextValue {
  heroState: HeroState;
  setHeroState: React.Dispatch<React.SetStateAction<HeroState>>;
}

const defaultState: HeroState = {
  stage: 1,
  scrollProgress: 0,
  introDone: false,
};

export const HeroContext = createContext<HeroContextValue | null>(null);

export interface HeroProviderProps {
  children: React.ReactNode;
  initialState?: Partial<HeroState>;
}

export function HeroProvider({ children, initialState }: HeroProviderProps) {
  const [heroState, setHeroState] = useState<HeroState>({
    ...defaultState,
    ...initialState,
  });

  return (
    <HeroContext.Provider value={{ heroState, setHeroState }}>
      {children}
    </HeroContext.Provider>
  );
}

export function useHeroContext(): HeroContextValue {
  const context = useContext(HeroContext);
  if (!context) {
    throw new Error("useHeroContext must be used within a HeroProvider");
  }
  return context;
}

export function useOptionalHeroContext(): HeroContextValue | null {
  return useContext(HeroContext);
}
