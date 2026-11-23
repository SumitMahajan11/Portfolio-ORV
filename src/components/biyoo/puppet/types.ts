export type BiyooExpressionName =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'sad'
  | 'confused'
  | 'sleepy'
  | 'sleeping'
  | 'curious'
  | 'blink';

export type BiyooEyeStyle = 'normal' | 'arc' | 'squeeze' | 'sleeping_arc' | 'slit' | 'small_pupil';

export type BiyooBrowStyle = 'curve' | 'tick';

export type BiyooMouthShape = 'smile' | 'open' | 'small_o' | 'open_oval' | 'frown' | 'wavy' | 'flat';

export interface Point2D {
  x: number;
  y: number;
}

export interface BiyooFaceParams {
  // Eye openness (0 = closed, 1 = fully open)
  eyeOpennessL: number;
  eyeOpennessR: number;

  // Eye size multiplier (1 = default size)
  eyeSizeL: number;
  eyeSizeR: number;

  // Eye visual style
  eyeStyleL: BiyooEyeStyle;
  eyeStyleR: BiyooEyeStyle;

  // Eye offset shift relative to face center
  eyeShiftX?: number;
  eyeShiftY?: number;

  // Pupil offset from eye center (clamped inside the eye)
  pupilOffsetX: number;
  pupilOffsetY: number;

  // Highlight placement direction
  highlightPos?: 'default' | 'upper-right';

  // Eyebrows
  browHeightL: number; // vertical offset (negative = raised, positive = lowered)
  browHeightR: number;
  browAngleL: number; // rotation in degrees
  browAngleR: number;
  browVisibleL: boolean;
  browVisibleR: boolean;
  browStyle?: BiyooBrowStyle;

  // Mouth
  mouthShape: BiyooMouthShape;
  mouthOpenness: number; // 0 = closed line, 1 = fully open
  mouthWidth: number; // relative width scale, default 1.0

  // Blush marks
  blushOpacity: number; // 0 = invisible, 1 = fully visible

  // Watery highlight band (for sad expression)
  wateryEyes?: boolean;

  // Whole-face rotation angle in degrees
  faceRotate?: number;

  // Whole-face parallax shift (shifts face slightly toward look target)
  faceShiftX: number;
  faceShiftY: number;
}

