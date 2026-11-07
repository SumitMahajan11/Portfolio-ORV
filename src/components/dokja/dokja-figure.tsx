import React, { forwardRef } from "react";

export type DokjaStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DokjaWingState = "closed" | "half" | "open";

export interface DokjaFigureProps {
  className?: string;
  width?: number;
  height?: number;
  stage?: DokjaStage;
  wingState?: DokjaWingState;
  isFinale?: boolean;
  isReduced?: boolean;
  style?: React.CSSProperties;
}

/**
 * Computes deterministic static visual styles for storyboard / reduced-motion poses.
 * When neither stage nor wingState is provided, returns empty styles so GSAP
 * timeline orchestrators can freely animate the elements via class selectors.
 */
function getStageStyles(
  stage?: DokjaStage,
  wingStateOverride?: DokjaWingState,
  isFinale?: boolean,
  isReduced?: boolean
) {
  if (stage === undefined && wingStateOverride === undefined && !isFinale) {
    return {
      wingBackL: {},
      wingBackR: {},
      wingFrontL: {},
      wingFrontR: {},
      horns: {},
      hornsRedRim: { opacity: 0 },
      eyesReading: { opacity: 1 },
      eyesNotice: { opacity: 0 },
      browIrritated: { opacity: 0 },
      phone: {},
      glow: {},
    };
  }

  const effectiveStage = isFinale ? 7 : stage ?? 1;

  // Eyes & Facial expression
  const isReading = effectiveStage === 1;
  const isIrritated = effectiveStage === 3;
  const eyesReading = { opacity: isReading ? 1 : 0 };
  const eyesNotice = { opacity: isReading ? 0 : 1 };
  const browIrritated = { opacity: isIrritated ? 1 : 0 };

  // Horns & Red Rim Light
  const hornsGrown = effectiveStage >= 4;
  const horns = {
    transform: hornsGrown ? "scale(1.15)" : "scale(0.45)",
    transformOrigin: "160px 94px",
    transition: "transform 0.3s ease-out",
  };
  const hornsRedRim = {
    opacity: hornsGrown ? 1 : 0,
    transition: "opacity 0.3s ease-out",
  };

  // Phone & Cyan Screen Glow
  const phoneLowered = effectiveStage >= 2;
  const phone = {
    transform: phoneLowered ? "translateY(12px)" : "translateY(0px)",
    transition: "transform 0.3s ease-out",
  };
  const glow = {
    opacity: isReduced ? 0.05 : effectiveStage >= 4 ? 0.8 : effectiveStage >= 3 ? 0.85 : 0.5,
    transform: phoneLowered ? "translateY(12px) scale(1.2)" : "scale(1)",
    transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
  };

  // Wings state logic
  let effectiveWingState: DokjaWingState = "closed";
  if (wingStateOverride) {
    effectiveWingState = wingStateOverride;
  } else if (effectiveStage >= 6) {
    effectiveWingState = "open";
  } else if (effectiveStage === 5) {
    effectiveWingState = "half";
  } else {
    effectiveWingState = "closed";
  }

  let wingBackL: React.CSSProperties = { transformOrigin: "140px 160px" };
  let wingBackR: React.CSSProperties = { transformOrigin: "180px 160px" };
  let wingFrontL: React.CSSProperties = { transformOrigin: "140px 160px" };
  let wingFrontR: React.CSSProperties = { transformOrigin: "180px 160px" };

  if (effectiveWingState === "closed") {
    const closedOpacity = effectiveStage === 4 ? 0.25 : 0;
    wingBackL = {
      ...wingBackL,
      opacity: closedOpacity,
      transform: "scale(0.2) rotate(24deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingBackR = {
      ...wingBackR,
      opacity: closedOpacity,
      transform: "scale(0.2) rotate(-24deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontL = {
      ...wingFrontL,
      opacity: closedOpacity,
      transform: "scale(0.2) rotate(28deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontR = {
      ...wingFrontR,
      opacity: closedOpacity,
      transform: "scale(0.2) rotate(-28deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
  } else if (effectiveWingState === "half") {
    wingBackL = {
      ...wingBackL,
      opacity: 0.9,
      transform: "scale(1.0) rotate(0deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingBackR = {
      ...wingBackR,
      opacity: 0.9,
      transform: "scale(1.0) rotate(0deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontL = {
      ...wingFrontL,
      opacity: 1.0,
      transform: "scale(1.0) rotate(0deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontR = {
      ...wingFrontR,
      opacity: 1.0,
      transform: "scale(1.0) rotate(0deg)",
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
  } else {
    // "open" (Stage 6, Stage 7, Finale)
    const expansionScale = effectiveStage === 7 ? 1.6 : 1.45;
    const shiftX = effectiveStage === 7 ? 48 : 38;
    wingBackL = {
      ...wingBackL,
      opacity: 1.0,
      transform: `scale(${expansionScale}) translateX(-${shiftX}px) rotate(-12deg)`,
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingBackR = {
      ...wingBackR,
      opacity: 1.0,
      transform: `scale(${expansionScale}) translateX(${shiftX}px) rotate(12deg)`,
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontL = {
      ...wingFrontL,
      opacity: 1.0,
      transform: `scale(${expansionScale}) translateX(-${shiftX}px) rotate(-12deg)`,
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
    wingFrontR = {
      ...wingFrontR,
      opacity: 1.0,
      transform: `scale(${expansionScale}) translateX(${shiftX}px) rotate(12deg)`,
      transition: "transform 0.4s ease-out, opacity 0.4s ease-out",
    };
  }

  return {
    wingBackL,
    wingBackR,
    wingFrontL,
    wingFrontR,
    horns,
    hornsRedRim,
    eyesReading,
    eyesNotice,
    browIrritated,
    phone,
    glow,
  };
}

/**
 * DokjaFigure:
 * Canonical character model for Dokja with discrete layered anatomy:
 * - Body: trousers, boots, neck, head, hair, dynamic eye/brow variants
 * - Coat: white trench coat with cold rim gradient and sway origin
 * - Left & Right Wings: multi-layered feather plumes (back coverts, mid secondaries, front primaries)
 * - Horns: dark red-black cone horns with separate red rim light stroke
 * - Phone & Glow: illuminated smartphone device and cyan ambient cast
 *
 * Supports:
 * - HeroScene timeline scrub (exposes standard query classes and shoulder pivots)
 * - Static reduced-motion storyboard poses (stage 1 through 7)
 * - Act 6 Finale scene (via isFinale={true})
 */
export const DokjaFigure = forwardRef<HTMLDivElement, DokjaFigureProps>(
  function DokjaFigure(
    {
      className = "",
      width = 320,
      height = 400,
      stage,
      wingState,
      isFinale = false,
      isReduced = false,
      style,
    },
    ref
  ) {
    const s = getStageStyles(stage, wingState, isFinale, isReduced);

    return (
      <div
        ref={ref}
        style={style}
        className={`hero-dokja-figure relative inline-flex flex-col items-center justify-center select-none ${className}`}
        role="img"
        aria-label="Dokja: protagonist in white coat with layered feathered wings and glowing phone"
      >
        <svg
          width={width}
          height={height}
          viewBox="0 0 320 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-2xl overflow-visible"
        >
          <defs>
            {/* Phone Screen Glow: Cold teal cyan (--star: #5EE1E6) */}
            <radialGradient
              id="dokja_phone_glow_grad"
              cx="160"
              cy="245"
              r="75"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#5EE1E6" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#5EE1E6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#5EE1E6" stopOpacity="0" />
            </radialGradient>

            {/* White Coat Gradient: (--feather #F4F6FA to --rim #9FB4D6) */}
            <linearGradient
              id="dokja_coat_grad"
              x1="160"
              y1="130"
              x2="160"
              y2="340"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#F4F6FA" />
              <stop offset="100%" stopColor="#D5DEEB" />
            </linearGradient>

            {/* White Wing Primary Gradient: Soft layered plumage */}
            <linearGradient id="dokja_wing_primary_grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#E2EAF4" />
              <stop offset="100%" stopColor="#9FB4D6" />
            </linearGradient>

            {/* Wing Secondary / Feather Shadow Gradient */}
            <linearGradient id="dokja_wing_secondary_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#D5DEEB" />
              <stop offset="100%" stopColor="#9AA7BD" />
            </linearGradient>

            {/* Horns Gradient: Dark red-black (--horn-dark #2A0A10) */}
            <linearGradient id="dokja_horn_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D0F17" />
              <stop offset="100%" stopColor="#2A0A10" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* LAYER 1: dokja_phone_glow (cyan ambient glow cast)        */}
          {/* ========================================================= */}
          <g
            id="dokja_glow"
            data-layer="glow"
            className={`dokja-layer-glow ${isFinale ? "finale-phone-glow" : ""}`}
            style={s.glow}
          >
            <circle cx="160" cy="245" r="75" fill="url(#dokja_phone_glow_grad)" />
          </g>

          {/* ========================================================= */}
          {/* LAYER 2: dokja_wings_back (left & right rear plumage)    */}
          {/* ========================================================= */}
          <g
            id="dokja_wings_back"
            data-layer="wings-back"
            className={`dokja-layer-wings-back ${isFinale ? "finale-wings-back" : ""}`}
          >
            {/* Left Back Wing (Shoulder pivot at 140, 160) */}
            <g
              id="dokja_wings_back_l"
              data-layer="wings_back_l"
              className="dokja-wing-back-l"
              style={s.wingBackL}
            >
              {/* Covert mantle upper feathers */}
              <path
                d="M 140 160 C 115 125, 80 90, 45 92 C 30 110, 45 135, 75 155 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.95"
              />
              {/* Secondary mid plume 1 */}
              <path
                d="M 115 150 C 75 120, 25 110, 10 135 C 18 160, 50 175, 90 178 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.9"
              />
              {/* Secondary mid plume 2 */}
              <path
                d="M 90 168 C 55 145, 10 142, 2 170 C 12 192, 45 200, 80 192 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.92"
              />
              {/* Long primary flight feather 1 */}
              <path
                d="M 80 188 C 45 170, 5 178, 0 205 C 12 225, 52 228, 88 212 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.88"
              />
              {/* Long primary flight feather 2 (lower sweep) */}
              <path
                d="M 88 210 C 60 205, 20 220, 16 242 C 38 252, 90 244, 138 212 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.85"
              />
            </g>

            {/* Right Back Wing (Shoulder pivot at 180, 160) */}
            <g
              id="dokja_wings_back_r"
              data-layer="wings_back_r"
              className="dokja-wing-back-r"
              style={s.wingBackR}
            >
              {/* Covert mantle upper feathers */}
              <path
                d="M 180 160 C 205 125, 240 90, 275 92 C 290 110, 275 135, 245 155 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.95"
              />
              {/* Secondary mid plume 1 */}
              <path
                d="M 205 150 C 245 120, 295 110, 310 135 C 302 160, 270 175, 230 178 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.9"
              />
              {/* Secondary mid plume 2 */}
              <path
                d="M 230 168 C 265 145, 310 142, 318 170 C 308 192, 275 200, 240 192 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.92"
              />
              {/* Long primary flight feather 1 */}
              <path
                d="M 240 188 C 275 170, 315 178, 320 205 C 308 225, 268 228, 232 212 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.88"
              />
              {/* Long primary flight feather 2 (lower sweep) */}
              <path
                d="M 232 210 C 260 205, 300 220, 304 242 C 282 252, 230 244, 182 212 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#9FB4D6"
                strokeWidth="1.2"
                opacity="0.85"
              />
            </g>
          </g>

          {/* ========================================================= */}
          {/* LAYER 3: dokja_body (trousers, boots, neck, head, hair)   */}
          {/* ========================================================= */}
          <g id="dokja_body" data-layer="body" className="dokja-layer-body">
            {/* Trousers and dark undersuit */}
            <path
              d="M 135 280 L 130 365 L 148 365 L 155 300 L 165 300 L 172 365 L 190 365 L 185 280 Z"
              fill="#0E1118"
              stroke="#243044"
              strokeWidth="1"
            />
            {/* Boots */}
            <rect x="126" y="362" width="24" height="8" rx="2" fill="#07080B" />
            <rect x="170" y="362" width="24" height="8" rx="2" fill="#07080B" />

            {/* Neck */}
            <rect x="153" y="132" width="14" height="15" fill="#E2D6CB" />

            {/* Head container */}
            <g id="dokja_head" data-layer="head" className="dokja-layer-head">
              {/* Face contour */}
              <polygon
                points="148,110 172,110 168,135 160,142 152,135"
                fill="#F0E3D7"
              />

              {/* Hair silhouette with sway class */}
              <g className="dokja-layer-hair">
                <path
                  d="M 144 110 C 142 90, 150 82, 160 82 C 170 82, 178 90, 176 110 C 172 104, 166 102, 160 106 C 154 102, 148 104, 144 110 Z"
                  fill="#0E1118"
                />
                <path d="M 145 106 L 149 122 L 152 110 Z" fill="#0E1118" />
                <path d="M 175 106 L 171 122 L 168 110 Z" fill="#0E1118" />
              </g>

              {/* Eye State 1: Reading (downcast arcs toward phone) */}
              <g className="dokja-eyes-reading" style={s.eyesReading}>
                <path
                  d="M 152 118 Q 155 120 158 118"
                  stroke="#0E1118"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 162 118 Q 165 120 168 118"
                  stroke="#0E1118"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* Eye State 2: Notice / Resolute (looking directly forward) */}
              <g className="dokja-eyes-notice" style={s.eyesNotice}>
                <circle cx="155" cy="116" r="2.2" fill="#0E1118" />
                <circle cx="155.6" cy="115.4" r="0.8" fill="#5EE1E6" />
                <circle cx="165" cy="116" r="2.2" fill="#0E1118" />
                <circle cx="165.6" cy="115.4" r="0.8" fill="#5EE1E6" />
              </g>

              {/* Eye State 3: Irritated brow */}
              <g className="dokja-brow-irritated" style={s.browIrritated}>
                <line
                  x1="151"
                  y1="112"
                  x2="158"
                  y2="114"
                  stroke="#243044"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="169"
                  y1="112"
                  x2="162"
                  y2="114"
                  stroke="#243044"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>

          {/* ========================================================= */}
          {/* LAYER 4: dokja_coat (white trench coat with sway loop)    */}
          {/* ========================================================= */}
          <g id="dokja_coat" data-layer="coat" className="dokja-layer-coat">
            <path
              d="M 130 150 L 115 220 L 110 330 L 145 335 L 160 270 L 175 335 L 210 330 L 205 220 L 190 150 Z"
              fill="url(#dokja_coat_grad)"
              stroke="#9FB4D6"
              strokeWidth="1.5"
            />
            <path
              d="M 140 150 L 160 200 L 152 235 L 138 180 Z"
              fill="#CCD5E4"
              stroke="#9FB4D6"
              strokeWidth="1"
            />
            <path
              d="M 180 150 L 160 200 L 168 235 L 182 180 Z"
              fill="#CCD5E4"
              stroke="#9FB4D6"
              strokeWidth="1"
            />
            {/* White Collar & Lapels */}
            <path
              d="M 135 140 L 145 155 L 175 155 L 185 140 Z"
              fill="#FFFFFF"
              stroke="#9FB4D6"
              strokeWidth="1.5"
            />
          </g>

          {/* ========================================================= */}
          {/* LAYER 5: dokja_horns (dark horns + red rim stroke)       */}
          {/* ========================================================= */}
          <g
            id="dokja_horns"
            data-layer="horns"
            className="dokja-layer-horns"
            style={s.horns}
          >
            {/* Horn base bodies (#2A0A10) */}
            <path
              d="M 148 94 C 140 82, 134 68, 128 58 C 135 68, 146 78, 152 86 Z"
              fill="url(#dokja_horn_grad)"
              stroke="#243044"
              strokeWidth="1.2"
            />
            <path
              d="M 172 94 C 180 82, 186 68, 192 58 C 185 68, 174 78, 168 86 Z"
              fill="url(#dokja_horn_grad)"
              stroke="#243044"
              strokeWidth="1.2"
            />

            {/* Dedicated Red Rim Light: pure opacity on stroke, NO filter */}
            <g
              data-layer="horns-rim"
              className={`dokja-horns-red-rim ${isFinale ? "finale-horns-red-rim" : ""}`}
              style={s.hornsRedRim}
            >
              <path
                d="M 148 94 C 140 82, 134 68, 128 58"
                stroke="#B3122B"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 172 94 C 180 82, 186 68, 192 58"
                stroke="#B3122B"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>

          {/* ========================================================= */}
          {/* LAYER 6: dokja_wings_front (forward primary feathers)     */}
          {/* ========================================================= */}
          <g
            id="dokja_wings_front"
            data-layer="wings-front"
            className={`dokja-layer-wings-front ${isFinale ? "finale-wings-front" : ""}`}
          >
            {/* Left Front Wing (Shoulder pivot at 140, 160) */}
            <g
              id="dokja_wings_front_l"
              data-layer="wings_front_l"
              className="dokja-wing-front-l"
              style={s.wingFrontL}
            >
              {/* Primary blade 1 (upper reach) */}
              <path
                d="M 130 165 C 95 135, 52 135, 36 160 C 35 182, 60 205, 95 210 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Primary blade 2 (mid reach) */}
              <path
                d="M 115 178 C 82 155, 38 165, 24 192 C 34 212, 70 220, 105 214 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Primary blade 3 (lower edge) */}
              <path
                d="M 105 200 C 75 185, 36 200, 28 222 C 45 235, 88 232, 128 205 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>

            {/* Right Front Wing (Shoulder pivot at 180, 160) */}
            <g
              id="dokja_wings_front_r"
              data-layer="wings_front_r"
              className="dokja-wing-front-r"
              style={s.wingFrontR}
            >
              {/* Primary blade 1 (upper reach) */}
              <path
                d="M 190 165 C 225 135, 268 135, 284 160 C 285 182, 260 205, 225 210 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Primary blade 2 (mid reach) */}
              <path
                d="M 205 178 C 238 155, 282 165, 296 192 C 286 212, 250 220, 215 214 Z"
                fill="url(#dokja_wing_secondary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              {/* Primary blade 3 (lower edge) */}
              <path
                d="M 215 200 C 245 185, 284 200, 292 222 C 275 235, 232 232, 192 205 Z"
                fill="url(#dokja_wing_primary_grad)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          </g>

          {/* ========================================================= */}
          {/* LAYER 7: dokja_phone (hands and illuminated device)       */}
          {/* ========================================================= */}
          <g
            id="dokja_phone"
            data-layer="phone"
            className={`dokja-layer-phone ${isFinale ? "finale-phone" : ""}`}
            style={s.phone}
          >
            {/* Hands */}
            <ellipse cx="148" cy="246" rx="6" ry="5" fill="#E2D6CB" />
            <ellipse cx="172" cy="246" rx="6" ry="5" fill="#E2D6CB" />
            {/* Phone casing */}
            <rect
              x="151"
              y="230"
              width="18"
              height="30"
              rx="2.5"
              fill="#0E1118"
              stroke="#243044"
              strokeWidth="1.5"
            />
            {/* Illuminated screen */}
            <rect
              x="153"
              y="233"
              width="14"
              height="24"
              rx="1.5"
              fill="#5EE1E6"
              className={isFinale ? "finale-phone-screen" : ""}
            />
            {/* Screen novel lines */}
            <line x1="155" y1="237" x2="165" y2="237" stroke="#07080B" strokeWidth="1" />
            <line x1="155" y1="240" x2="163" y2="240" stroke="#07080B" strokeWidth="1" />
            <line x1="155" y1="243" x2="165" y2="243" stroke="#07080B" strokeWidth="1" />
            <line x1="155" y1="246" x2="161" y2="246" stroke="#07080B" strokeWidth="1" />
            <line x1="155" y1="249" x2="164" y2="249" stroke="#07080B" strokeWidth="1" />
          </g>
        </svg>
      </div>
    );
  }
);

export default DokjaFigure;
