import React, { forwardRef } from "react";

export interface DokjaFinaleFigureProps {
  className?: string;
  width?: number;
  height?: number;
  isReduced?: boolean;
}

/**
 * DokjaFinaleFigure:
 * Front-facing final form for the Act 6 Finale scene:
 * - Wings fully expanded (white feathered arcs)
 * - White trench coat with cold rim lighting
 * - Gaze looking directly at the reader (notice eyes)
 * - Red-black horns with dedicated red rim light layer for the single pulse
 * - Phone and ambient glow with animation classes for lowering and dimming
 */
export const DokjaFinaleFigure = forwardRef<HTMLDivElement, DokjaFinaleFigureProps>(
  function DokjaFinaleFigure(
    { className = "", width = 320, height = 400, isReduced = false },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
        role="img"
        aria-label="Dokja in his final form, white coat and wings, looking directly at the reader"
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
            {/* Phone screen glow: cold teal cyan (--star: #5EE1E6) */}
            <radialGradient
              id="finale_phone_screen_glow"
              cx="160"
              cy="245"
              r="75"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#5EE1E6" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#5EE1E6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#5EE1E6" stopOpacity="0" />
            </radialGradient>

            {/* White coat gradient with cold rim lighting (--feather to --rim) */}
            <linearGradient
              id="finale_white_coat_grad"
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

            {/* White wing gradient */}
            <linearGradient id="finale_wing_grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="80%" stopColor="#E2EAF4" />
              <stop offset="100%" stopColor="#9FB4D6" />
            </linearGradient>

            {/* Horns strictly in --horn-dark (#2A0A10) */}
            <linearGradient id="finale_horn_dark_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D0F17" />
              <stop offset="100%" stopColor="#2A0A10" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* LAYER 1: Ambient phone glow                               */}
          {/* ========================================================= */}
          <g
            id="finale_dokja_glow"
            className="finale-phone-glow"
            style={{ opacity: isReduced ? 0.05 : 1 }}
          >
            <circle cx="160" cy="245" r="75" fill="url(#finale_phone_screen_glow)" />
          </g>

          {/* ========================================================= */}
          {/* LAYER 2: Back wings (spread wide in final form)           */}
          {/* ========================================================= */}
          <g id="finale_dokja_wings_back" className="finale-wings-back">
            {/* Left back wing */}
            <path
              d="M 140 160 C 90 90, 20 60, 5 110 C -5 140, 20 180, 50 210 C 80 235, 120 240, 140 215 Z"
              fill="url(#finale_wing_grad)"
              stroke="#9FB4D6"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <path
              d="M 50 130 C 20 130, 5 155, 18 185 C 35 198, 75 205, 105 185 Z"
              fill="#D5DEEB"
              opacity="0.65"
            />

            {/* Right back wing */}
            <path
              d="M 180 160 C 230 90, 300 60, 315 110 C 325 140, 300 180, 270 210 C 240 235, 200 240, 180 215 Z"
              fill="url(#finale_wing_grad)"
              stroke="#9FB4D6"
              strokeWidth="1.5"
              opacity="0.9"
            />
            <path
              d="M 270 130 C 300 130, 315 155, 302 185 C 285 198, 245 205, 215 185 Z"
              fill="#D5DEEB"
              opacity="0.65"
            />
          </g>

          {/* ========================================================= */}
          {/* LAYER 3: Body (undersuit, pants, shoes)                   */}
          {/* ========================================================= */}
          <g id="finale_dokja_body">
            <path
              d="M 135 280 L 130 365 L 148 365 L 155 300 L 165 300 L 172 365 L 190 365 L 185 280 Z"
              fill="#0E1118"
              stroke="#243044"
              strokeWidth="1"
            />
            <rect x="126" y="362" width="24" height="8" rx="2" fill="#07080B" />
            <rect x="170" y="362" width="24" height="8" rx="2" fill="#07080B" />
            <rect x="153" y="132" width="14" height="15" fill="#E2D6CB" />
          </g>

          {/* ========================================================= */}
          {/* LAYER 4: Coat (white trench coat, crisp lapels)           */}
          {/* ========================================================= */}
          <g id="finale_dokja_coat">
            <path
              d="M 130 150 L 115 220 L 110 330 L 145 335 L 160 270 L 175 335 L 210 330 L 205 220 L 190 150 Z"
              fill="url(#finale_white_coat_grad)"
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
            <path
              d="M 135 140 L 145 155 L 175 155 L 185 140 Z"
              fill="#FFFFFF"
              stroke="#9FB4D6"
              strokeWidth="1.5"
            />
          </g>

          {/* ========================================================= */}
          {/* LAYER 5: Front wings                                      */}
          {/* ========================================================= */}
          <g id="finale_dokja_wings_front">
            <path
              d="M 130 165 C 80 135, 40 145, 25 185 C 20 205, 45 230, 80 235 C 110 240, 130 205, 132 175 Z"
              fill="url(#finale_wing_grad)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <path
              d="M 190 165 C 240 135, 280 145, 295 185 C 300 205, 275 230, 240 235 C 210 240, 190 205, 188 175 Z"
              fill="url(#finale_wing_grad)"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>

          {/* ========================================================= */}
          {/* LAYER 6: Head & Notice Eyes (Looking straight at reader)  */}
          {/* ========================================================= */}
          <g id="finale_dokja_head">
            {/* Face contour */}
            <polygon
              points="148,110 172,110 168,135 160,142 152,135"
              fill="#F0E3D7"
            />

            {/* Hair silhouette */}
            <path
              d="M 144 110 C 142 90, 150 82, 160 82 C 170 82, 178 90, 176 110 C 172 104, 166 102, 160 106 C 154 102, 148 104, 144 110 Z"
              fill="#0E1118"
            />
            <path d="M 145 106 L 149 122 L 152 110 Z" fill="#0E1118" />
            <path d="M 175 106 L 171 122 L 168 110 Z" fill="#0E1118" />

            {/* Eyes looking directly at the reader with star pupils */}
            <g className="finale-eyes-notice">
              <circle cx="155" cy="116" r="2.2" fill="#0E1118" />
              <circle cx="155.6" cy="115.4" r="0.8" fill="#5EE1E6" />
              <circle cx="165" cy="116" r="2.2" fill="#0E1118" />
              <circle cx="165.6" cy="115.4" r="0.8" fill="#5EE1E6" />
            </g>
          </g>

          {/* ========================================================= */}
          {/* LAYER 7: Horns & Red Rim Light (pulse trigger layer)      */}
          {/* ========================================================= */}
          <g id="finale_dokja_horns">
            {/* Horn base bodies in #2A0A10 */}
            <path
              d="M 148 94 C 140 82, 134 68, 128 58 C 135 68, 146 78, 152 86 Z"
              fill="url(#finale_horn_dark_grad)"
              stroke="#243044"
              strokeWidth="1.2"
            />
            <path
              d="M 172 94 C 180 82, 186 68, 192 58 C 185 68, 174 78, 168 86 Z"
              fill="url(#finale_horn_dark_grad)"
              stroke="#243044"
              strokeWidth="1.2"
            />

            {/* Red Rim Light: pulsed once in finale animation */}
            <g
              id="finale_horns_red_rim"
              className="finale-horns-red-rim"
              style={{ opacity: 0 }}
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
          {/* LAYER 8: Phone & Hands (closes/lowers in finale animation) */}
          {/* ========================================================= */}
          <g
            id="finale_dokja_phone"
            className="finale-phone"
            style={{
              transform: isReduced ? "translateY(22px)" : undefined,
            }}
          >
            {/* Hands holding phone */}
            <ellipse cx="148" cy="246" rx="6" ry="5" fill="#E2D6CB" />
            <ellipse cx="172" cy="246" rx="6" ry="5" fill="#E2D6CB" />

            {/* Phone chassis */}
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

            {/* Illuminated screen displaying the novel */}
            <rect
              x="153"
              y="233"
              width="14"
              height="24"
              rx="1.5"
              fill="#5EE1E6"
              className="finale-phone-screen"
              style={{ opacity: isReduced ? 0.15 : 1 }}
            />
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
