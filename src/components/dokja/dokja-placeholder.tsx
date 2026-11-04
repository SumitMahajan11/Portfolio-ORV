import React from "react";

export interface DokjaPlaceholderProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Dokja placeholder:
 * Code-drawn SVG component matching the layer names in /docs/08-ART-ASSET-LIST.md:
 * - body, head, coat, horns, wings back L/R, wings front L/R, phone, glow.
 *
 * Rules:
 * - White wings and coat (--feather / #F4F6FA).
 * - Horns in --horn-dark (#2A0A10) only (no bright red yet).
 * - Static, front-facing.
 */
export function DokjaPlaceholder({
  className = "",
  width = 300,
  height = 380,
}: DokjaPlaceholderProps) {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${className}`}
      role="img"
      aria-label="Dokja placeholder: front-facing protagonist in white coat with white wings reading a glowing phone"
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 320 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        <defs>
          {/* Cyan screen glow from the phone (--star: #5EE1E6) */}
          <radialGradient id="phone_screen_glow" cx="160" cy="245" r="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5EE1E6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#5EE1E6" stopOpacity="0" />
          </radialGradient>

          {/* White coat gradient with cold rim lighting (--feather #F4F6FA to --rim #9FB4D6) */}
          <linearGradient id="white_coat_grad" x1="160" y1="130" x2="160" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F4F6FA" />
            <stop offset="100%" stopColor="#D5DEEB" />
          </linearGradient>

          {/* White wing gradient */}
          <linearGradient id="wing_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="80%" stopColor="#E2EAF4" />
            <stop offset="100%" stopColor="#9FB4D6" />
          </linearGradient>

          {/* Horns strictly in --horn-dark (#2A0A10) with dark shading */}
          <linearGradient id="horn_dark_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D0F17" />
            <stop offset="100%" stopColor="#2A0A10" />
          </linearGradient>
        </defs>

        {/* LAYER: glow (ambient screen backlight) */}
        <g id="dokja_glow" data-layer="glow">
          <circle cx="160" cy="245" r="75" fill="url(#phone_screen_glow)" />
        </g>

        {/* LAYER: wings back L/R (large rear feather wings spreading out) */}
        <g id="dokja_wings_back_l" data-layer="wings back L">
          <path
            d="M 140 160 C 100 110, 40 80, 20 120 C 15 145, 35 175, 60 200 C 85 225, 120 230, 140 210 Z"
            fill="url(#wing_grad)"
            stroke="#9FB4D6"
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Secondary back feather tips */}
          <path
            d="M 60 140 C 35 140, 20 160, 30 185 C 45 195, 80 200, 105 185 Z"
            fill="#D5DEEB"
            opacity="0.6"
          />
        </g>

        <g id="dokja_wings_back_r" data-layer="wings back R">
          <path
            d="M 180 160 C 220 110, 280 80, 300 120 C 305 145, 285 175, 260 200 C 235 225, 200 230, 180 210 Z"
            fill="url(#wing_grad)"
            stroke="#9FB4D6"
            strokeWidth="1.5"
            opacity="0.85"
          />
          {/* Secondary back feather tips */}
          <path
            d="M 260 140 C 285 140, 300 160, 290 185 C 275 195, 240 200, 215 185 Z"
            fill="#D5DEEB"
            opacity="0.6"
          />
        </g>

        {/* LAYER: body (dark undersuit / trousers / shoes) */}
        <g id="dokja_body" data-layer="body">
          {/* Trousers and boots */}
          <path
            d="M 135 280 L 130 365 L 148 365 L 155 300 L 165 300 L 172 365 L 190 365 L 185 280 Z"
            fill="#0E1118"
            stroke="#243044"
            strokeWidth="1"
          />
          {/* Shoes */}
          <rect x="126" y="362" width="24" height="8" rx="2" fill="#07080B" />
          <rect x="170" y="362" width="24" height="8" rx="2" fill="#07080B" />
        </g>

        {/* LAYER: coat (iconic white trench coat, front lapels) */}
        <g id="dokja_coat" data-layer="coat">
          {/* Coat body */}
          <path
            d="M 130 150 L 115 220 L 110 330 L 145 335 L 160 270 L 175 335 L 210 330 L 205 220 L 190 150 Z"
            fill="url(#white_coat_grad)"
            stroke="#9FB4D6"
            strokeWidth="1.5"
          />
          {/* Coat Lapels */}
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
          {/* Coat Collar */}
          <path
            d="M 135 140 L 145 155 L 175 155 L 185 140 Z"
            fill="#FFFFFF"
            stroke="#9FB4D6"
            strokeWidth="1.5"
          />
        </g>

        {/* LAYER: wings front L/R (primary forward feathered arcs) */}
        <g id="dokja_wings_front_l" data-layer="wings front L">
          <path
            d="M 130 165 C 90 140, 55 145, 40 180 C 35 195, 55 220, 85 225 C 110 230, 130 200, 132 175 Z"
            fill="url(#wing_grad)"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </g>
        <g id="dokja_wings_front_r" data-layer="wings front R">
          <path
            d="M 190 165 C 230 140, 265 145, 280 180 C 285 195, 265 220, 235 225 C 210 230, 190 200, 188 175 Z"
            fill="url(#wing_grad)"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </g>

        {/* LAYER: head (dark hair, neck, tilted downward slightly) */}
        <g id="dokja_head" data-layer="head">
          {/* Neck */}
          <rect x="153" y="132" width="14" height="15" fill="#E2D6CB" />
          {/* Face contour */}
          <polygon points="148,110 172,110 168,135 160,142 152,135" fill="#F0E3D7" />
          {/* Dark hair silhouette */}
          <path
            d="M 144 110 C 142 90, 150 82, 160 82 C 170 82, 178 90, 176 110 C 172 104, 166 102, 160 106 C 154 102, 148 104, 144 110 Z"
            fill="#0E1118"
          />
          {/* Hair strands framing face */}
          <path
            d="M 145 106 L 149 122 L 152 110 Z"
            fill="#0E1118"
          />
          <path
            d="M 175 106 L 171 122 L 168 110 Z"
            fill="#0E1118"
          />
        </g>

        {/* LAYER: horns (two curved horns in --horn-dark #2A0A10 only - strictly NO red) */}
        <g id="dokja_horns" data-layer="horns">
          {/* Left horn */}
          <path
            d="M 148 94 C 140 82, 134 68, 128 58 C 135 68, 146 78, 152 86 Z"
            fill="url(#horn_dark_grad)"
            stroke="#243044"
            strokeWidth="1.2"
          />
          {/* Right horn */}
          <path
            d="M 172 94 C 180 82, 186 68, 192 58 C 185 68, 174 78, 168 86 Z"
            fill="url(#horn_dark_grad)"
            stroke="#243044"
            strokeWidth="1.2"
          />
        </g>

        {/* LAYER: phone (held in both hands with illuminated screen) */}
        <g id="dokja_phone" data-layer="phone">
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
          {/* Illuminated screen displaying the novel (--star: #5EE1E6) */}
          <rect
            x="153"
            y="233"
            width="14"
            height="24"
            rx="1.5"
            fill="#5EE1E6"
          />
          {/* Miniature text lines on screen */}
          <line x1="155" y1="237" x2="165" y2="237" stroke="#07080B" strokeWidth="1" />
          <line x1="155" y1="240" x2="163" y2="240" stroke="#07080B" strokeWidth="1" />
          <line x1="155" y1="243" x2="165" y2="243" stroke="#07080B" strokeWidth="1" />
          <line x1="155" y1="246" x2="161" y2="246" stroke="#07080B" strokeWidth="1" />
          <line x1="155" y1="249" x2="164" y2="249" stroke="#07080B" strokeWidth="1" />
        </g>
      </svg>

      <span className="font-mono text-xs text-mist mt-3 tracking-wider">
        [DOKJA_PLACEHOLDER]
      </span>
    </div>
  );
}

export default DokjaPlaceholder;
