import path from 'node:path';
import sharp from 'sharp';

const TOKENS = {
  void: { r: 7, g: 8, b: 11, hex: '#07080B' },
  feather: { r: 244, g: 246, b: 250, hex: '#F4F6FA' }, // Body text
  mist: { r: 154, g: 167, b: 189, hex: '#9AA7BD' },   // Secondary text
  star: { r: 94, g: 225, b: 230, hex: '#5EE1E6' },   // Cyan accent
};

const TINT_PALETTES = [
  { id: 'hub', label: 'Hub (Untinted)', primary: null, secondary: null },
  { id: 'edge-cloud', label: 'Edge Cloud', primary: { r: 94, g: 225, b: 230 }, secondary: { r: 110, g: 231, b: 168 } },
  { id: 'raft', label: 'Ratify (Raft)', primary: { r: 242, g: 140, b: 40 }, secondary: { r: 241, g: 228, b: 195 } },
  { id: 'z3', label: 'iac-verifier (Z3)', primary: { r: 31, g: 163, b: 122 }, secondary: { r: 107, g: 78, b: 255 } },
  { id: 'backtrace', label: 'Backtrace', primary: { r: 15, g: 27, b: 61 }, secondary: { r: 212, g: 177, b: 95 } },
];

function sRGBtoLinear(c255) {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getLuminance(r, g, b) {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function getContrast(lum1, lum2) {
  const l1 = Math.max(lum1, lum2);
  const l2 = Math.min(lum1, lum2);
  return (l1 + 0.05) / (l2 + 0.05);
}

// W3C Soft-light blend mode formula:
// For blend color B and base color A (normalized 0..1):
// If B <= 0.5: D = A - (1 - 2B) * A * (1 - A)
// If B > 0.5:  D = A + (2B - 1) * (D_w3c(A) - A) where D_w3c(A) = A <= 0.25 ? ((16A - 12)A + 4)A : sqrt(A)
function softLightChannel(baseNorm, blendNorm) {
  const A = baseNorm;
  const B = blendNorm;
  if (B <= 0.5) {
    return A - (1 - 2 * B) * A * (1 - A);
  } else {
    const d = A <= 0.25 ? ((16 * A - 12) * A + 4) * A : Math.sqrt(A);
    return A + (2 * B - 1) * (d - A);
  }
}

function softLight(base, blendColor, opacity) {
  const rSoft = softLightChannel(base.r / 255, blendColor.r / 255);
  const gSoft = softLightChannel(base.g / 255, blendColor.g / 255);
  const bSoft = softLightChannel(base.b / 255, blendColor.b / 255);

  // Interpolate by opacity
  return {
    r: Math.round(((1 - opacity) * (base.r / 255) + opacity * rSoft) * 255),
    g: Math.round(((1 - opacity) * (base.g / 255) + opacity * gSoft) * 255),
    b: Math.round(((1 - opacity) * (base.b / 255) + opacity * bSoft) * 255),
  };
}

function alphaBlend(fg, bg, alpha) {
  return {
    r: Math.round(fg.r * (1 - alpha) + bg.r * alpha),
    g: Math.round(fg.g * (1 - alpha) + bg.g * alpha),
    b: Math.round(fg.b * (1 - alpha) + bg.b * alpha),
  };
}

async function runContrastVerification() {
  console.log('====================================================');
  console.log(' CONTRAST RE-CHECK: TINTED STATES & BRIGHTEST REGION ');
  console.log(' Sampling Brightest 5% Region with 0.35 Tint + 0.55 Scrim ');
  console.log('====================================================\n');

  const src = path.resolve('docs/reference/walls/wall-01.png');
  const { data, info } = await sharp(src)
    .resize(400, null, { withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const pixels = [];

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * info.channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = getLuminance(r, g, b);
    pixels.push({ r, g, b, lum });
  }

  // Brightest 5%
  pixels.sort((a, b) => b.lum - a.lum);
  const top5Count = Math.max(1, Math.round(pixelCount * 0.05));
  let rSum = 0, gSum = 0, bSum = 0;
  for (let i = 0; i < top5Count; i++) {
    rSum += pixels[i].r;
    gSum += pixels[i].g;
    bSum += pixels[i].b;
  }
  const avgTop5 = {
    r: Math.round(rSum / top5Count),
    g: Math.round(gSum / top5Count),
    b: Math.round(bSum / top5Count),
  };

  const lumBody = getLuminance(TOKENS.feather.r, TOKENS.feather.g, TOKENS.feather.b);
  const lumMist = getLuminance(TOKENS.mist.r, TOKENS.mist.g, TOKENS.mist.b);
  const lumCyan = getLuminance(TOKENS.star.r, TOKENS.star.g, TOKENS.star.b);

  const report = [];
  let anyFailed = false;

  for (const tint of TINT_PALETTES) {
    let tintedBase = avgTop5;
    if (tint.primary) {
      // Apply soft-light tint at max opacity 0.35
      tintedBase = softLight(avgTop5, tint.primary, 0.35);
    }

    // Apply fixed scrim layer at 0.55 dim with --void (#07080B)
    const composite = alphaBlend(tintedBase, TOKENS.void, 0.55);
    const lumComp = getLuminance(composite.r, composite.g, composite.b);

    const bodyContrast = getContrast(lumBody, lumComp);
    const mistContrast = getContrast(lumMist, lumComp);
    const cyanContrast = getContrast(lumCyan, lumComp);

    const passBody = bodyContrast >= 4.5; // WCAG AA normal text
    const passCyan = cyanContrast >= 3.0; // WCAG AA large text / graphical UI
    const pass = passBody && passCyan;
    if (!pass) anyFailed = true;

    report.push({
      'Tint State': tint.label,
      'Top 5% RGB': `rgb(${avgTop5.r},${avgTop5.g},${avgTop5.b})`,
      'Tinted RGB': `rgb(${tintedBase.r},${tintedBase.g},${tintedBase.b})`,
      'Composited RGB': `rgb(${composite.r},${composite.g},${composite.b})`,
      'Body (#F4F6FA)': `${bodyContrast.toFixed(2)}:1 (${passBody ? 'PASS' : 'FAIL'})`,
      'Cyan (#5EE1E6)': `${cyanContrast.toFixed(2)}:1 (${passCyan ? 'PASS' : 'FAIL'})`,
      'Mist (#9AA7BD)': `${mistContrast.toFixed(2)}:1`,
      'WCAG AA': pass ? 'PASS' : 'FAIL',
    });
  }

  console.table(report);

  if (anyFailed) {
    console.error('\nFAILED: One or more tint states fail WCAG AA contrast threshold.');
    process.exit(1);
  } else {
    console.log('\nPASSED: All tinted states satisfy WCAG AA contrast on the brightest region behind text.');
  }
}

runContrastVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
