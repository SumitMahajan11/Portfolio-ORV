import React, { forwardRef } from "react";
import { DokjaFigure } from "@/components/dokja/dokja-figure";

export interface DokjaFinaleFigureProps {
  className?: string;
  width?: number;
  height?: number;
  isReduced?: boolean;
}

/**
 * DokjaFinaleFigure:
 * Act 6 Finale figure reusing the canonical layered DokjaFigure model.
 *
 * Rules:
 * - Front-facing final form (stage 7 pose)
 * - White wings fully expanded with rich feather groups
 * - White trench coat with cold rim lighting
 * - Gaze looking directly at the reader
 * - Dark red-black horns with dedicated red rim stroke (.finale-horns-red-rim)
 * - Phone (.finale-phone, .finale-phone-screen) and glow (.finale-phone-glow)
 */
export const DokjaFinaleFigure = forwardRef<HTMLDivElement, DokjaFinaleFigureProps>(
  function DokjaFinaleFigure(
    { className = "", width = 320, height = 400, isReduced = false },
    ref
  ) {
    return (
      <DokjaFigure
        ref={ref}
        className={className}
        width={width}
        height={height}
        isFinale={true}
        isReduced={isReduced}
        stage={7}
      />
    );
  }
);

export default DokjaFinaleFigure;
