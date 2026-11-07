import path from 'node:path';
import sharp from 'sharp';

// Design tokens from src/styles/globals.css & docs/02-DESIGN-SYSTEM.md
const TOKENS = {
  void: { r: 7, g: 8, b: 11, hex: '#07080B' },       // Overlay / base void
  feather: { r: 244, g: 246, b: 250, hex: '#F4F6FA' }, // Body text
  mist: { r: 154, g: 167, b: 189, hex: '#9AA7BD' },   // Secondary text
  star: { r: 94, g: 225, b: 230, hex: '#5EE1E6' },   // Cyan accent
};

// Defined section tints per docs/02 and src/content/walls.ts
const TINTS = [
  { id: 'hub', label: 'Hub (Untinted)', color: null },
  { id: 'edge-cloud', label: 'Edge-Cloud (Teal / #6EE7A8)', color: { r: 94, g: 225, b: 230 } },
  { id: 'raft', label: 'Ratify / Raft (#F28C28 / #F1E4C3)', color: { r: 241, g: 228, b: 195 } }, // brightest tone (parchment)
  { id: 'z3', label: 'iac-verifier / Z3 (#1FA37A / #6B4EFF)', color: { r: 31, g: 163, b: 122 } },
  { id: 'backtrace', label: 'Backtrace (#D4B15F / #0F1B3D)', color: { r: 212, g: 177, b: 95 } },
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

function softLightChannel(a, b) {
  // a (base), b (tint) normalized to [0, 1] per W3C Compositing & Blending Level 1
  if (b <= 0.5) {
    return a - (1 - 2 * b) * a * (1 - a);
  } else {
    const d = a <= 0.25 ? ((16 * a - 12) * a + 4) * a : Math.sqrt(a);
    return a + (2 * b - 1) * (d - a);
  }
}

function blendSoftLight(base, tint, alpha) {
  const rD = softLightChannel(base.r / 255, tint.r / 255);
  const gD = softLightChannel(base.g / 255, tint.g / 255);
  const bD = softLightChannel(base.b / 255, tint.b / 255);
  return {
    r: Math.round(((base.r / 255) * (1 - alpha) + rD * alpha) * 255),
    g: Math.round(((base.g / 255) * (1 - alpha) + gD * alpha) * 255),
    b: Math.round(((base.b / 255) * (1 - alpha) + bD * alpha) * 255),
  };
}

function blendAlpha(fg, bg, alpha) {
  return {
    r: Math.round(fg.r * (1 - alpha) + bg.r * alpha),
    g: Math.round(fg.g * (1 - alpha) + bg.g * alpha),
    b: Math.round(fg.b * (1 - alpha) + bg.b * alpha),
  };
}

async function analyze() {
  const args = process.argv.slice(2);
  let dimArg = 0.55;
  for (const a of args) {
    if (a.startsWith('--dim=')) {
      dimArg = parseFloat(a.split('=')[1]);
    }
  }

  console.log(`=== Wall & Section Tints WCAG Contrast Verification (Overlay dim = ${dimArg}) ===\n`);
  const lumBody = getLuminance(TOKENS.feather.r, TOKENS.feather.g, TOKENS.feather.b);
  const lumCyan = getLuminance(TOKENS.star.r, TOKENS.star.g, TOKENS.star.b);

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

  // Sort descending by luminance to find brightest region behind text
  pixels.sort((a, b) => b.lum - a.lum);

  // Brightest 5%
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

  const report = [];
  let anyFailed = false;

  for (const tint of TINTS) {
    // 1. Base image blended with tint (max opacity 0.35 with soft-light)
    let tintedBase = avgTop5;
    if (tint.color) {
      tintedBase = blendSoftLight(avgTop5, tint.color, 0.35);
    }

    // 2. Tinted base blended with fixed scrim overlay at dimArg
    const blended = blendAlpha(tintedBase, TOKENS.void, dimArg);
    const lumBlended = getLuminance(blended.r, blended.g, blended.b);

    const bodyContrast = getContrast(lumBody, lumBlended);
    const cyanContrast = getContrast(lumCyan, lumBlended);

    // Calculate minimum dim needed to pass WCAG AA (body >= 4.5, cyan >= 3.0)
    let minPassDim = null;
    for (let testDim = 0.0; testDim <= 1.0; testDim += 0.01) {
      const bTest = blendAlpha(tintedBase, TOKENS.void, testDim);
      const lTest = getLuminance(bTest.r, bTest.g, bTest.b);
      const cBody = getContrast(lumBody, lTest);
      const cCyan = getContrast(lumCyan, lTest);
      if (cBody >= 4.5 && cCyan >= 3.0) {
        minPassDim = testDim.toFixed(2);
        break;
      }
    }

    const passBody = bodyContrast >= 4.5;
    const passCyan = cyanContrast >= 3.0;
    const pass = passBody && passCyan;
    if (!pass) anyFailed = true;

    report.push({
      State: tint.label,
      'Tinted RGB': `rgb(${tintedBase.r},${tintedBase.g},${tintedBase.b})`,
      'Blended RGB': `rgb(${blended.r},${blended.g},${blended.b})`,
      'Body (#F4F6FA)': `${bodyContrast.toFixed(2)}:1 (${passBody ? 'PASS' : 'FAIL'})`,
      'Cyan (#5EE1E6)': `${cyanContrast.toFixed(2)}:1 (${passCyan ? 'PASS' : 'FAIL'})`,
      'Min Dim Needed': minPassDim ?? '> 1.00',
    });
  }

  console.table(report);

  if (anyFailed) {
    console.error(`\nFAILED: At dim=${dimArg}, one or more tinted states fail the WCAG AA contrast threshold.`);
    process.exit(1);
  }

  console.log(`\nPASSED: All tinted states meet WCAG AA requirements with dim overlay >= ${dimArg}.`);
}

analyze().catch((err) => {
  console.error(err);
  process.exit(1);
});
