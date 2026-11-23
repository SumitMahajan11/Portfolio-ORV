import React from 'react';
import type { BiyooFaceParams, BiyooExpressionName } from './types';
import { BiyooFace } from './biyoo-face';

export interface BiyooPuppetProps {
  params: BiyooFaceParams;
  expression?: BiyooExpressionName;
  className?: string;
  style?: React.CSSProperties;
  showFaceZone?: boolean;
  isBreathing?: boolean;
  isArmSwinging?: boolean;
  isSleeping?: boolean;
  isHopping?: boolean;
  pointingArm?: 'left' | 'right' | null;
  speechBubble?: string | null;
  onDismissBubble?: () => void;
  reducedMotion?: boolean;
  bubbleAlign?: 'center' | 'right' | 'left';
  onPuppetClick?: () => void;
}

export const BiyooPuppet: React.FC<BiyooPuppetProps> = ({
  params,
  expression,
  className,
  style,
  showFaceZone = false,
  isBreathing = false,
  isArmSwinging = false,
  isSleeping = false,
  isHopping = false,
  pointingArm = null,
  speechBubble = null,
  onDismissBubble,
  reducedMotion = false,
  bubbleAlign = 'center',
  onPuppetClick,
}) => {
  const allowMotion = !reducedMotion;

  return (
    <div
      data-biyoo-expression={expression || 'neutral'}
      className={`relative select-none pointer-events-none ${className || ''}`}
      style={{
        width: '100%',
        maxWidth: 1024,
        aspectRatio: '1 / 1',
        ...style,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes biyoo-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.015) translateY(-3px); }
        }
        @keyframes biyoo-arm-swing-l {
          0%, 100% { transform: rotate(-2.5deg); }
          50% { transform: rotate(2.5deg); }
        }
        @keyframes biyoo-arm-swing-r {
          0%, 100% { transform: rotate(2.5deg); }
          50% { transform: rotate(-2.5deg); }
        }
        @keyframes biyoo-hop {
          0% { transform: translateY(0); }
          40% { transform: translateY(-26px) scale(0.97, 1.05); }
          75% { transform: translateY(3px) scale(1.02, 0.98); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes biyoo-zzz-1 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
          25% { opacity: 0.9; }
          80% { opacity: 0.5; transform: translate(18px, -45px) scale(1.1); }
          100% { opacity: 0; transform: translate(26px, -65px) scale(1.2); }
        }
        @keyframes biyoo-zzz-2 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
          25% { opacity: 0.9; }
          80% { opacity: 0.5; transform: translate(25px, -55px) scale(1.2); }
          100% { opacity: 0; transform: translate(36px, -80px) scale(1.35); }
        }
        @keyframes biyoo-zzz-3 {
          0% { opacity: 0; transform: translate(0, 0) scale(0.8); }
          25% { opacity: 0.9; }
          80% { opacity: 0.5; transform: translate(32px, -68px) scale(1.3); }
          100% { opacity: 0; transform: translate(46px, -100px) scale(1.5); }
        }
      `,
        }}
      />

      {/* Speech Bubble Overlay (wrapped to max 2 lines, max-w 240px, anchored above head, clamped inside viewport) */}
      {speechBubble && (
        <div
          data-testid="biyoo-speech-bubble"
          onClick={onDismissBubble}
          className={`biyoo-bubble-dock absolute z-30 cursor-pointer pointer-events-auto select-none px-3.5 py-1.5 rounded-2xl bg-[#070e1d]/95 border border-cyan-400/80 shadow-2xl backdrop-blur-md flex items-center justify-center gap-1.5 group transition-all ${
            bubbleAlign === 'right'
              ? 'bottom-[102%] right-0'
              : bubbleAlign === 'left'
              ? 'bottom-[102%] left-0'
              : 'top-2 left-1/2 -translate-x-1/2'
          }`}
          style={{
            maxWidth: '240px',
            width: 'max-content',
            boxSizing: 'border-box',
          }}
          title="Click to dismiss"
        >
          <span
            className="text-xs font-semibold tracking-wide text-cyan-200 text-center leading-snug break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '210px',
            }}
          >
            {speechBubble}
          </span>
          <span className="text-[10px] text-cyan-400/50 group-hover:text-cyan-300 transition-colors shrink-0">✕</span>
          <div
            className={`absolute -bottom-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-cyan-400/80 ${
              bubbleAlign === 'right'
                ? 'right-8 sm:right-12'
                : bubbleAlign === 'left'
                ? 'left-8 sm:left-12'
                : 'left-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}

      {/* Master Puppet SVG */}
      <svg
        viewBox="0 0 1024 1024"
        className="w-full h-full overflow-visible block pointer-events-none"
        style={{ pointerEvents: 'none' }}
      >
        {/* Hop transform container */}
        <g
          data-testid="biyoo-hop-group"
          style={{
            transformOrigin: '515px 850px',
            transformBox: 'view-box',
            animation: isHopping && allowMotion ? 'biyoo-hop 0.5s cubic-bezier(0.2, 0.8, 0.3, 1.2)' : 'none',
          }}
        >
          {/* Breathing transform container */}
          <g
            data-testid="biyoo-breathing-group"
            style={{
              transformOrigin: '515px 720px',
              transformBox: 'view-box',
              animation: isBreathing && allowMotion ? 'biyoo-breathe 3.6s ease-in-out infinite' : 'none',
            }}
          >
            {/* Dokkaebi silhouette hitbox: captures pointer events strictly inside puppet silhouette */}
            <ellipse
              data-testid="biyoo-silhouette-hitbox"
              cx={515}
              cy={530}
              rx={370}
              ry={380}
              fill="transparent"
              style={{ pointerEvents: 'auto', cursor: 'pointer', outline: 'none' }}
              onClick={onPuppetClick}
              role="button"
              tabIndex={0}
              aria-label="Ask Biyoo about Sumit's work"
              aria-haspopup="dialog"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPuppetClick?.();
                }
              }}
            />

            {/* Layer 1: Horns (behind body) */}
            <image
              href="/biyoo/parts/horn-l.png"
              x={235}
              y={65}
              width={188}
              height={221}
            />
            <image
              href="/biyoo/parts/horn-r.png"
              x={620}
              y={65}
              width={186}
              height={222}
            />

            {/* Layer 2: Arms (gentle hanging swing or pointing >=60deg out and up toward target) */}
            <g
              data-testid="biyoo-arm-l-group"
              style={{
                transformOrigin: '235px 485px',
                transformBox: 'view-box',
                transform: pointingArm === 'left' ? 'rotate(68deg)' : undefined,
                transition: pointingArm === 'left' && allowMotion ? 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)' : (allowMotion ? 'transform 0.28s cubic-bezier(0, 0, 0.2, 1)' : 'none'),
                animation: pointingArm === 'left' ? 'none' : (isArmSwinging && allowMotion ? 'biyoo-arm-swing-l 4.0s ease-in-out infinite' : 'none'),
              }}
            >
              <image
                data-testid="biyoo-arm-l-image"
                href="/biyoo/parts/arm-l.png"
                x={65}
                y={470}
                width={192}
                height={282}
              />
              <circle
                data-testid="biyoo-arm-l-hand"
                cx={140}
                cy={725}
                r={4}
                fill="transparent"
                pointerEvents="none"
              />
            </g>
            <g
              data-testid="biyoo-arm-r-group"
              style={{
                transformOrigin: '785px 485px',
                transformBox: 'view-box',
                transform: pointingArm === 'right' ? 'rotate(-68deg)' : undefined,
                transition: pointingArm === 'right' && allowMotion ? 'transform 0.22s cubic-bezier(0.4, 0, 1, 1)' : (allowMotion ? 'transform 0.28s cubic-bezier(0, 0, 0.2, 1)' : 'none'),
                animation: pointingArm === 'right' ? 'none' : (isArmSwinging && allowMotion ? 'biyoo-arm-swing-r 4.0s ease-in-out infinite' : 'none'),
              }}
            >
              <image
                data-testid="biyoo-arm-r-image"
                href="/biyoo/parts/arm-r.png"
                x={765}
                y={470}
                width={193}
                height={282}
              />
              <circle
                data-testid="biyoo-arm-r-hand"
                cx={884}
                cy={725}
                r={4}
                fill="transparent"
                pointerEvents="none"
              />
            </g>

            {/* Layer 3: Feet (behind body) */}
            <image
              href="/biyoo/parts/foot-l.png"
              x={240}
              y={820}
              width={191}
              height={153}
            />
            <image
              href="/biyoo/parts/foot-r.png"
              x={595}
              y={820}
              width={191}
              height={153}
            />

            {/* Layer 4: Body (on top of limbs) */}
            <image
              href="/biyoo/parts/body.png"
              x={73}
              y={74}
              width={885}
              height={878}
            />

            {/* Optional Face Zone Bounding Box for debug / calibration */}
            {showFaceZone && (
              <rect
                x={275}
                y={365}
                width={480}
                height={260}
                fill="none"
                stroke="#ec4899"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.7}
              />
            )}

            {/* Layer 5: Dynamic Vector Face */}
            <BiyooFace params={params} />

            {/* Floating "z z z" when sleeping */}
            {isSleeping && allowMotion && (
              <g data-testid="biyoo-zzz-group">
                <text
                  x={690}
                  y={240}
                  fill="#7dd3fc"
                  fontSize={42}
                  fontFamily="monospace"
                  fontWeight="bold"
                  style={{ animation: 'biyoo-zzz-1 3.2s ease-in-out infinite' }}
                >
                  z
                </text>
                <text
                  x={725}
                  y={210}
                  fill="#38bdf8"
                  fontSize={52}
                  fontFamily="monospace"
                  fontWeight="bold"
                  style={{ animation: 'biyoo-zzz-2 3.2s ease-in-out 1.0s infinite' }}
                >
                  z
                </text>
                <text
                  x={765}
                  y={180}
                  fill="#0284c7"
                  fontSize={64}
                  fontFamily="monospace"
                  fontWeight="bold"
                  style={{ animation: 'biyoo-zzz-3 3.2s ease-in-out 2.0s infinite' }}
                >
                  Z
                </text>
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
