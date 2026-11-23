import React, { useId } from 'react';
import type { BiyooFaceParams } from './types';

export interface BiyooFaceProps {
  params: BiyooFaceParams;
  className?: string;
}

// Sampled colors from artwork/biyoo/source/E-expressions.png
export const BIYOO_COLORS = {
  darkLine: '#3e1d1c', // dark espresso brown outline and pupils
  eyeIrisShadow: '#562724',
  mouthFill: '#e17e71', // warm coral-rose pink interior
  mouthTongue: '#eb9186',
  blush: '#e78b7e', // soft salmon pink ticks
  highlight: '#ffffff',
} as const;

// Base anchor points: eyes at ~50% of body height (body y=74, height=878 -> 74 + 439 = 513)
// Eye spacing preserved at 289px (658 - 369)
export const FACE_ANCHORS = {
  center: { x: 515, y: 513 },
  eyeLeft: { x: 369, y: 513 },
  eyeRight: { x: 658, y: 513 },
  mouth: { x: 515, y: 596 },
  blushLeft: { x: 312, y: 554 },
  blushRight: { x: 716, y: 554 },
  browLeft: { x: 369, y: 442 },
  browRight: { x: 658, y: 442 },
} as const;

export const BiyooFace: React.FC<BiyooFaceProps> = ({ params, className }) => {
  const clipIdL = useId();
  const clipIdR = useId();

  const {
    eyeOpennessL,
    eyeOpennessR,
    eyeSizeL,
    eyeSizeR,
    eyeStyleL,
    eyeStyleR,
    pupilOffsetX,
    pupilOffsetY,
    browHeightL,
    browHeightR,
    browAngleL,
    browAngleR,
    browVisibleL,
    browVisibleR,
    browStyle = 'curve',
    mouthShape,
    mouthOpenness,
    mouthWidth,
    blushOpacity,
    wateryEyes = false,
    faceRotate = 0,
    eyeShiftX = 0,
    eyeShiftY = 0,
    highlightPos = 'default',
    faceShiftX = 0,
    faceShiftY = 0,
  } = params;

  // Base eye dimensions scaled ~1.6x (28 * 1.643 = 46px radius -> 92px diameter = 10.40% of 885px body width)
  const baseRx = 46;
  const baseRy = 46;

  // Helper to render an eye given its side
  const renderEye = (
    side: 'left' | 'right',
    center: { x: number; y: number },
    style: typeof eyeStyleL,
    openness: number,
    size: number,
    clipId: string
  ) => {
    const rx = baseRx * size;
    const ry = baseRy * size;
    const cx = center.x + eyeShiftX;
    const cy = center.y + eyeShiftY;

    if (style === 'arc') {
      // Happy upward arc ^ (scaled with new face size)
      return (
        <path
          d={`M ${cx - 42 * size} ${cy + 10 * size} Q ${cx} ${cy - 38 * size} ${cx + 42 * size} ${cy + 10 * size}`}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={8.5 * size}
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    if (style === 'squeeze') {
      // Excited > < squeeze eyes (scaled with new face size)
      if (side === 'left') {
        return (
          <path
            d={`M ${cx - 36 * size} ${cy - 26 * size} L ${cx + 16 * size} ${cy} L ${cx - 36 * size} ${cy + 26 * size}`}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={8.5 * size}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      } else {
        return (
          <path
            d={`M ${cx + 36 * size} ${cy - 26 * size} L ${cx - 16 * size} ${cy} L ${cx + 36 * size} ${cy + 26 * size}`}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={8.5 * size}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      }
    }

    if (style === 'sleeping_arc') {
      // Sleeping downward curved arc u with eyelash ticks (scaled with new face size)
      const flip = side === 'left' ? -1 : 1;
      return (
        <g>
          <path
            d={`M ${cx - 42 * size} ${cy - 6 * size} Q ${cx} ${cy + 38 * size} ${cx + 42 * size} ${cy - 6 * size}`}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={8.5 * size}
            strokeLinecap="round"
            fill="none"
          />
          {/* Outer eyelash tick */}
          <line
            x1={cx + 38 * size * flip}
            y1={cy}
            x2={cx + 52 * size * flip}
            y2={cy - 10 * size}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={6.0 * size}
            strokeLinecap="round"
          />
        </g>
      );
    }

    if (style === 'slit') {
      // Blink horizontal slit line (scaled with new face size)
      return (
        <line
          x1={cx - 42 * size}
          y1={cy}
          x2={cx + 42 * size}
          y2={cy}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={8.5 * size}
          strokeLinecap="round"
        />
      );
    }

    if (style === 'small_pupil') {
      // Surprised: eyes ~1.25x larger than Neutral with small pupils
      const spx = pupilOffsetX * 0.4;
      const spy = pupilOffsetY * 0.4;
      return (
        <g>
          {/* White eyeball with dark outline */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="#ffffff"
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={6.0 * size}
          />
          {/* Small contracted dark pupil */}
          <ellipse
            cx={cx + spx}
            cy={cy + spy}
            rx={rx * 0.38}
            ry={ry * 0.38}
            fill={BIYOO_COLORS.darkLine}
          />
          {/* Tiny center highlight */}
          <circle
            cx={cx + spx - rx * 0.10}
            cy={cy + spy - ry * 0.10}
            r={rx * 0.10}
            fill={BIYOO_COLORS.highlight}
          />
        </g>
      );
    }

    // Normal big round dark eyes with highlights & upper eyelid clipping
    // Clamp pupil offset inside eye
    const maxOffset = 22 * size;
    const dist = Math.hypot(pupilOffsetX, pupilOffsetY);
    const scaleOffset = dist > maxOffset ? maxOffset / dist : 1.0;
    const px = pupilOffsetX * scaleOffset;
    const py = pupilOffsetY * scaleOffset;

    // Eyelid cut: openness = 1 shows full eye; openness = 0.38 (sleepy) cuts top 62%
    const lidDrop = (1 - Math.max(0, Math.min(1, openness))) * (ry * 2.1);
    const lidY = cy - ry * 1.05 + lidDrop;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            {/* Visible area: everything below the upper eyelid line */}
            <rect
              x={cx - rx - 10}
              y={lidY}
              width={(rx + 10) * 2}
              height={ry * 2 + 20}
            />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Main dark eye pupil oval */}
          <ellipse
            data-testid={`biyoo-eye-pupil-${side}`}
            cx={cx + px * 0.3}
            cy={cy + py * 0.3}
            rx={rx}
            ry={ry}
            fill={BIYOO_COLORS.darkLine}
          />
          {/* Subtle lower iris shading */}
          <ellipse
            cx={cx + px * 0.3}
            cy={cy + ry * 0.35 + py * 0.3}
            rx={rx * 0.72}
            ry={ry * 0.42}
            fill={BIYOO_COLORS.eyeIrisShadow}
            opacity={0.65}
          />
          {highlightPos === 'upper-right' ? (
            <>
              {/* Curious: large highlight shifted upper-right */}
              <circle
                data-testid={`biyoo-highlight-primary-${side}`}
                cx={cx + px + rx * 0.28}
                cy={cy + py - ry * 0.28}
                r={rx * 0.34}
                fill={BIYOO_COLORS.highlight}
              />
              {/* Small secondary highlight lower-left */}
              <circle
                cx={cx + px - rx * 0.28}
                cy={cy + py + ry * 0.30}
                r={rx * 0.18}
                fill={BIYOO_COLORS.highlight}
                opacity={0.9}
              />
            </>
          ) : (
            <>
              {/* Large primary highlight (upper-left) */}
              <circle
                data-testid={`biyoo-highlight-primary-${side}`}
                cx={cx + px - rx * 0.28}
                cy={cy + py - ry * 0.28}
                r={rx * 0.34}
                fill={BIYOO_COLORS.highlight}
              />
              {/* Small secondary highlight (lower-right) */}
              <circle
                cx={cx + px + rx * 0.30}
                cy={cy + py + ry * 0.30}
                r={rx * 0.18}
                fill={BIYOO_COLORS.highlight}
                opacity={0.9}
              />
            </>
          )}

          {/* Sad: bright watery highlight band ~40% thinner, curved along lower eye edge (reads as moisture, not glare) */}
          {wateryEyes && (
            <g>
              <path
                d={`M ${cx - rx * 0.65} ${cy + ry * 0.68} Q ${cx} ${cy + ry * 0.54} ${cx + rx * 0.65} ${cy + ry * 0.68} Q ${cx} ${cy + ry * 0.96} ${cx - rx * 0.65} ${cy + ry * 0.68} Z`}
                fill={BIYOO_COLORS.highlight}
                opacity={0.88}
              />
              <circle
                cx={cx - rx * 0.26}
                cy={cy + ry * 0.72}
                r={rx * 0.08}
                fill={BIYOO_COLORS.highlight}
                opacity={0.95}
              />
            </g>
          )}
        </g>

        {/* Eyelid stroke line when partially closed (e.g. Sleepy) */}
        {openness < 0.95 && openness > 0.05 && (
          <path
            d={`M ${cx - rx * 1.05} ${lidY} Q ${cx} ${lidY + 2 * size} ${cx + rx * 1.05} ${lidY}`}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={6.0 * size}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </g>
    );
  };

  // Helper to render eyebrows
  const renderBrow = (
    side: 'left' | 'right',
    center: { x: number; y: number },
    heightOffset: number,
    angleDeg: number,
    visible: boolean
  ) => {
    if (!visible) return null;
    const cx = center.x;
    const cy = center.y + heightOffset;
    const flip = side === 'left' ? -1 : 1;

    if (browStyle === 'tick') {
      // High brow tick marks (Surprised)
      const tickW = 16;
      const tickH = 10;
      return (
        <g transform={`rotate(${angleDeg}, ${cx}, ${cy})`}>
          <line
            x1={cx - tickW * flip}
            y1={cy - tickH * 0.5}
            x2={cx + tickW * flip}
            y2={cy + tickH * 0.5}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      );
    }

    return (
      <g
        data-testid={`biyoo-brow-${side}`}
        transform={`rotate(${angleDeg}, ${cx}, ${cy})`}
      >
        <path
          d={`M ${cx - 24 * flip} ${cy + 1} Q ${cx} ${cy - 10} ${cx + 24 * flip} ${cy}`}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={5.0}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  };

  // Helper to render mouth
  const renderMouth = () => {
    const mx = FACE_ANCHORS.mouth.x;
    const my = FACE_ANCHORS.mouth.y;
    const w = mouthWidth;

    if (mouthShape === 'open') {
      // Wide open happy / excited mouth with tongue
      const topW = 34 * w;
      const botDrop = 38 * Math.max(0.4, mouthOpenness);
      return (
        <g>
          {/* Outer mouth cavity */}
          <path
            d={`M ${mx - topW} ${my - 6} Q ${mx} ${my - 2} ${mx + topW} ${my - 6} C ${mx + topW * 0.9} ${my + botDrop} ${mx - topW * 0.9} ${my + botDrop} ${mx - topW} ${my - 6} Z`}
            fill={BIYOO_COLORS.mouthFill}
            stroke={BIYOO_COLORS.darkLine}
            strokeWidth={4.5}
            strokeLinejoin="round"
          />
          {/* Cute inner tongue curve */}
          <path
            d={`M ${mx - topW * 0.55} ${my + botDrop * 0.72} Q ${mx} ${my + botDrop * 0.28} ${mx + topW * 0.55} ${my + botDrop * 0.72} C ${mx + topW * 0.45} ${my + botDrop * 0.92} ${mx - topW * 0.45} ${my + botDrop * 0.92} ${mx - topW * 0.55} ${my + botDrop * 0.72} Z`}
            fill={BIYOO_COLORS.mouthTongue}
          />
        </g>
      );
    }

    if (mouthShape === 'open_oval') {
      // Surprised: small but clearly visible open oval (about 3x the small dot)
      const ow = 12 * w;
      const oh = 17 * Math.max(0.5, mouthOpenness);
      return (
        <ellipse
          cx={mx}
          cy={my}
          rx={ow}
          ry={oh}
          fill={BIYOO_COLORS.mouthFill}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={4.2}
        />
      );
    }

    if (mouthShape === 'small_o') {
      // Curious: cute small "o" mouth
      const ow = 6.5 * w;
      const oh = 9.0 * Math.max(0.4, mouthOpenness);
      return (
        <ellipse
          cx={mx}
          cy={my}
          rx={ow}
          ry={oh}
          fill={BIYOO_COLORS.mouthFill}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={3.8}
        />
      );
    }

    if (mouthShape === 'frown') {
      // Sad small downturned mouth
      const fw = 22 * w;
      return (
        <path
          d={`M ${mx - fw} ${my + 8} Q ${mx} ${my - 5} ${mx + fw} ${my + 8}`}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    if (mouthShape === 'wavy') {
      // Confused wavy squiggly mouth ~
      const ww = 32 * w;
      return (
        <path
          d={`M ${mx - ww} ${my - 2} Q ${mx - ww * 0.5} ${my - 10} ${mx} ${my - 1} T ${mx + ww} ${my - 2}`}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
      );
    }

    if (mouthShape === 'flat') {
      // Sleepy flat line -
      const lw = 22 * w;
      return (
        <line
          x1={mx - lw}
          y1={my}
          x2={mx + lw}
          y2={my}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      );
    }

    // Default: 'smile' cute cat w mouth
    const sw = 32 * w;
    return (
      <g>
        <path
          d={`M ${mx - sw} ${my - 2} Q ${mx - sw * 0.5} ${my + 14} ${mx} ${my} Q ${mx + sw * 0.5} ${my + 14} ${mx + sw} ${my - 2}`}
          stroke={BIYOO_COLORS.darkLine}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  };

  // Helper to render blush marks: three short diagonal ticks each ///
  const renderBlush = (center: { x: number; y: number }) => {
    if (blushOpacity <= 0.01) return null;
    const cx = center.x;
    const cy = center.y;
    // Ticks angle: dx = 7, dy = 16 (slope ~-65 deg)
    const dx = 7;
    const dy = 16;
    const spacing = 11;

    return (
      <g opacity={blushOpacity}>
        {[-1, 0, 1].map((i) => {
          const tx = cx + i * spacing;
          return (
            <line
              key={i}
              x1={tx + dx * 0.5}
              y1={cy - dy * 0.5}
              x2={tx - dx * 0.5}
              y2={cy + dy * 0.5}
              stroke={BIYOO_COLORS.blush}
              strokeWidth={3.8}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    );
  };

  return (
    <g
      data-testid="biyoo-face-group"
      className={className}
      transform={`translate(${faceShiftX}, ${faceShiftY}) rotate(${faceRotate}, ${FACE_ANCHORS.center.x}, ${FACE_ANCHORS.center.y})`}
      style={{ willChange: 'transform' }}
    >
      {/* Eyebrows */}
      {renderBrow(
        'left',
        FACE_ANCHORS.browLeft,
        browHeightL,
        browAngleL,
        browVisibleL
      )}
      {renderBrow(
        'right',
        FACE_ANCHORS.browRight,
        browHeightR,
        browAngleR,
        browVisibleR
      )}

      {/* Eyes */}
      {renderEye(
        'left',
        FACE_ANCHORS.eyeLeft,
        eyeStyleL,
        eyeOpennessL,
        eyeSizeL,
        clipIdL
      )}
      {renderEye(
        'right',
        FACE_ANCHORS.eyeRight,
        eyeStyleR,
        eyeOpennessR,
        eyeSizeR,
        clipIdR
      )}

      {/* Blush marks (three short diagonal ticks each) */}
      {renderBlush(FACE_ANCHORS.blushLeft)}
      {renderBlush(FACE_ANCHORS.blushRight)}

      {/* Mouth */}
      {renderMouth()}
    </g>
  );
};

