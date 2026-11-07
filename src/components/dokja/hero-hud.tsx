import React from "react";
import { SystemWindow } from "@/components/system-window";

export interface HeroHudProps {
  glitchVisible: boolean;
  glitchActive: boolean;
}

export function HeroHud({ glitchVisible, glitchActive }: HeroHudProps) {
  return (
    <>
      {/* ========================================================= */}
      {/* SYSTEM NOTIFICATION: Stage 2 "A Reader has been detected."*/}
      {/* Fixed coordinates: top safe-area offset; title & dots safe*/}
      {/* ========================================================= */}
      <div
        data-layer="system-window"
        className="hero-system-window absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-10 z-30 w-[260px] sm:w-[280px] pointer-events-auto transition-opacity"
        style={{
          top: "calc(56px + env(safe-area-inset-top, 0px))",
          opacity: 0,
        }}
      >
        <SystemWindow
          title="SYSTEM NOTIFICATION"
          className="[&_.font-display]:text-[11px] sm:[&_.font-display]:text-xs [&_.font-display]:tracking-wider"
        >
          <p className="text-xs sm:text-sm text-star font-mono">
            A Reader has been detected.
          </p>
        </SystemWindow>
      </div>

      {/* ========================================================= */}
      {/* STAGE 7 GLITCH NOTIFICATION: "A Scenario has arrived."    */}
      {/* ========================================================= */}
      <div
        data-layer="glitch-notification"
        className={`hero-glitch-container pointer-events-none absolute left-1/2 -translate-x-1/2 w-fit z-30 transition-opacity duration-300 ${
          glitchVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          top: "calc(105px + env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-ink/90 border border-star/60 text-star font-mono text-xs sm:text-sm tracking-widest uppercase shadow-2xl backdrop-blur-md">
          <span
            className={`inline-block font-bold ${
              glitchActive ? "glitch-text-active" : ""
            }`}
          >
            A Scenario has arrived.
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SCROLL HINT: Visible at 0% scroll; hidden when scrolling  */}
      {/* Safe bottom area offset avoiding Biyoo and Bounty button  */}
      {/* ========================================================= */}
      <div
        data-layer="scroll-hint"
        className="hero-scroll-hint absolute left-1/2 -translate-x-1/2 w-fit z-20 flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-150 select-none"
        style={{
          bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
          opacity: 1,
        }}
        aria-hidden="true"
      >
        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-star">
          scroll
        </span>
        <span className="text-star font-mono text-sm sm:text-base animate-bounce">
          &darr;
        </span>
      </div>
    </>
  );
}
