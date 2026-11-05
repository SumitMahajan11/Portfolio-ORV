import path from 'node:path';
import sharp from 'sharp';

// Design tokens from src/styles/globals.css & docs/02-DESIGN-SYSTEM.md
const TOKENS = {
  void: { r: 7, g: 8, b: 11, hex: '#07080B' },       // Overlay / base void
  feather: { r: 244, g: 246, b: 250, hex: '#F4F6FA' }, // Body text
  mist: { r: 154, g: 167, b: 189, hex: '#9AA7BD' },   // Secondary text
  star: { r: 94, g: 225, b: 230, hex: '#5EE1E6' },   // Cyan accent
};

const WALLS = [
  { id: 'wall-01', source: 'docs/reference/walls/wall-01.png', label: 'Story Wall (wall-01)' },
  { id: 'wall-02', source: 'docs/reference/walls/wall-02.png', label: 'Worlds Wall (wall-02)' },
  { id: 'wall-03', source: 'docs/reference/walls/wall-03.png', label: 'Finale Wall (wall-03)' },
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

function blend(fg, bg, alpha) {
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

  console.log(`=== Wall WCAG Contrast Verification (Overlay dim = ${dimArg}) ===\n`);
  const lumBody = getLuminance(TOKENS.feather.r, TOKENS.feather.g, TOKENS.feather.b);
  const lumCyan = getLuminance(TOKENS.star.r, TOKENS.star.g, TOKENS.star.b);

  const report = [];
  let anyFailed = false;

  for (const wall of WALLS) {
    const src = path.resolve(wall.source);
    // Downscale for robust pixel sampling
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

    // Sort descending by luminance
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

    // Blend with --void at current dim
    const blended = blend(avgTop5, TOKENS.void, dimArg);
    const lumBlended = getLuminance(blended.r, blended.g, blended.b);

    const bodyContrast = getContrast(lumBody, lumBlended);
    const cyanContrast = getContrast(lumCyan, lumBlended);

    // Check minimum dim needed to pass (body >= 4.5, cyan/large >= 3.0)
    let minPassDim = null;
    for (let testDim = 0.0; testDim <= 1.0; testDim += 0.01) {
      const bTest = blend(avgTop5, TOKENS.void, testDim);
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
      Wall: wall.id,
      'Top 5% RGB': `rgb(${avgTop5.r},${avgTop5.g},${avgTop5.b})`,
      'Blended RGB': `rgb(${blended.r},${blended.g},${blended.b})`,
      'Body (#F4F6FA)': `${bodyContrast.toFixed(2)}:1 (${passBody ? 'PASS' : 'FAIL'})`,
      'Cyan (#5EE1E6)': `${cyanContrast.toFixed(2)}:1 (${passCyan ? 'PASS' : 'FAIL'})`,
      'Min Dim Needed': minPassDim ?? '> 1.00',
    });
  }

  console.table(report);

  if (anyFailed) {
    console.error(`\nFAILED: At dim=${dimArg}, one or more walls fail the WCAG AA contrast threshold.`);
    process.exit(1);
  }

  console.log(`\nPASSED: All walls meet WCAG AA requirements with dim overlay >= ${dimArg}.`);
}

analyze().catch((err) => {
  console.error(err);
  process.exit(1);
});

