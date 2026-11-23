import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WALLS = [
  {
    id: 'archive',
    source: 'docs/reference/walls/Cinematic_Teal_Archive_of_Aged_Pages.png',
    referenceBright: 'docs/reference/walls/Luminous_Blue_Wall_of_Pages.png',
    role: 'living',
  },
];

const BUDGETS = {
  desktopAvif: 200 * 1024,          // 200 KB target
  desktopWebp: 300 * 1024,          // 300 KB
  portraitAvif: 120 * 1024,         // 120 KB target
  portraitWebp: 180 * 1024,         // 180 KB
  brightDesktopAvif: 150 * 1024,    // 150 KB target
  placeholder: 1024,                // 1 KB
};

const OUT_DIR = path.resolve('public/art/wall');
const SCREENS_DIR = path.resolve('docs/proofs/screens');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SCREENS_DIR, { recursive: true });

async function optimize() {
  console.log('=== Optimizing Living Wall Assets (archive) ===\n');
  const results = [];
  const placeholders = {};
  let anyFailed = false;

  for (const wall of WALLS) {
    const srcPath = path.resolve(wall.source);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source wall file not found: ${srcPath}`);
    }

    const image = sharp(srcPath);
    const meta = await image.metadata();

    // 1. Desktop: 2560x1440 cover crop (AVIF target <= 200KB)
    const desktopBufferAvif = await sharp(srcPath)
      .resize(2560, 1440, { fit: 'cover', position: 'center' })
      .avif({ quality: 60, effort: 6 })
      .toBuffer();

    const desktopBufferWebp = await sharp(srcPath)
      .resize(2560, 1440, { fit: 'cover', position: 'center' })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    // 2. Mobile portrait: 1080x1920 cover crop (AVIF target <= 120KB)
    // Anchored to upper right to keep the light source
    const cropWidth = Math.round(meta.height * (9 / 16));
    const cropLeft = meta.width - cropWidth;
    const cropTop = 0;
    const cropHeight = meta.height;
    const cropBox = { left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight };
    console.log(`Portrait crop box anchored to upper right: left=${cropLeft}, top=${cropTop}, width=${cropWidth}, height=${cropHeight}`);

    const portraitCrop = sharp(srcPath)
      .extract(cropBox)
      .resize(1080, 1920, { fit: 'cover' });

    const portraitBufferAvif = await portraitCrop
      .clone()
      .avif({ quality: 60, effort: 6 })
      .toBuffer();

    const portraitBufferWebp = await portraitCrop
      .clone()
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    // 3. Derived BRIGHT layer from the SAME dark source with sharp (desktop only, AVIF <= 150KB)
    // Gamma lift + brightness + slight saturation, tuned by eye to harmonize with reference
    const brightBufferAvif = await sharp(srcPath)
      .resize(2560, 1440, { fit: 'cover', position: 'center' })
      .gamma(1.8)
      .modulate({ brightness: 1.45, saturation: 1.22 })
      .avif({ quality: 46, effort: 6 })
      .toBuffer();

    // 4. Tiny placeholder: 24px wide blurred version (base64 string <= 1 KB)
    const placeholderBuffer = await sharp(srcPath)
      .resize(24)
      .blur(1.5)
      .webp({ quality: 20 })
      .toBuffer();

    const placeholderBase64 = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;
    placeholders[wall.id] = placeholderBase64;

    // Save files
    const desktopAvifPath = path.join(OUT_DIR, `${wall.id}-desktop.avif`);
    const desktopWebpPath = path.join(OUT_DIR, `${wall.id}-desktop.webp`);
    const portraitAvifPath = path.join(OUT_DIR, `${wall.id}-portrait.avif`);
    const portraitWebpPath = path.join(OUT_DIR, `${wall.id}-portrait.webp`);
    const brightAvifPath = path.join(OUT_DIR, `${wall.id}-desktop-bright.avif`);

    fs.writeFileSync(desktopAvifPath, desktopBufferAvif);
    fs.writeFileSync(desktopWebpPath, desktopBufferWebp);
    fs.writeFileSync(portraitAvifPath, portraitBufferAvif);
    fs.writeFileSync(portraitWebpPath, portraitBufferWebp);
    fs.writeFileSync(brightAvifPath, brightBufferAvif);

    // 5. Generate Contact Sheet: base, derived bright, reference bright side by side
    const refPath = path.resolve(wall.referenceBright);
    if (fs.existsSync(refPath)) {
      const thumbW = 850;
      const thumbH = 480;
      const baseThumb = await sharp(srcPath).resize(thumbW, thumbH, { fit: 'cover' }).toBuffer();
      const derivedThumb = await sharp(srcPath)
        .resize(thumbW, thumbH, { fit: 'cover' })
        .gamma(1.8)
        .modulate({ brightness: 1.45, saturation: 1.22 })
        .toBuffer();
      const refThumb = await sharp(refPath).resize(thumbW, thumbH, { fit: 'cover' }).toBuffer();

      const contactSheetPath = path.join(SCREENS_DIR, 'wall-contact-sheet.png');
      await sharp({
        create: {
          width: thumbW * 3 + 40,
          height: thumbH + 40,
          channels: 3,
          background: { r: 10, g: 13, b: 20 },
        },
      })
        .composite([
          { input: baseThumb, left: 10, top: 20 },
          { input: derivedThumb, left: thumbW + 20, top: 20 },
          { input: refThumb, left: thumbW * 2 + 30, top: 20 },
        ])
        .png()
        .toFile(contactSheetPath);

      console.log(`Saved contact sheet to ${contactSheetPath}`);
    }

    // Verify budgets
    const checks = [
      { name: `${wall.id}-desktop.avif`, size: desktopBufferAvif.length, limit: BUDGETS.desktopAvif },
      { name: `${wall.id}-desktop.webp`, size: desktopBufferWebp.length, limit: BUDGETS.desktopWebp },
      { name: `${wall.id}-portrait.avif`, size: portraitBufferAvif.length, limit: BUDGETS.portraitAvif },
      { name: `${wall.id}-portrait.webp`, size: portraitBufferWebp.length, limit: BUDGETS.portraitWebp },
      { name: `${wall.id}-desktop-bright.avif`, size: brightBufferAvif.length, limit: BUDGETS.brightDesktopAvif },
      { name: `${wall.id} placeholder`, size: Buffer.byteLength(placeholderBase64, 'utf8'), limit: BUDGETS.placeholder },
    ];

    for (const c of checks) {
      const pass = c.size <= c.limit;
      if (!pass) anyFailed = true;
      results.push({
        file: c.name,
        sizeKb: (c.size / 1024).toFixed(2) + ' KB',
        limitKb: (c.limit / 1024).toFixed(2) + ' KB',
        status: pass ? 'PASS' : 'FAIL',
      });
    }
  }

  // Write wall-placeholders.ts
  const placeholderTs = `/**
 * Tiny blur placeholders (base64) for wall backgrounds.
 * Generated by scripts/optimize-walls.mjs - DO NOT EDIT MANUALLY.
 */

export const WALL_PLACEHOLDERS: Record<string, string> = ${JSON.stringify(placeholders, null, 2)} as const;

export type WallId = 'archive';
`;

  const placeholderPath = path.resolve('src/content/wall-placeholders.ts');
  fs.mkdirSync(path.dirname(placeholderPath), { recursive: true });
  fs.writeFileSync(placeholderPath, placeholderTs, 'utf8');
  console.log(`Saved placeholders to ${placeholderPath}`);

  console.table(results);

  if (anyFailed) {
    console.error('\nERROR: One or more wall assets exceeded their size budget!');
    process.exit(1);
  }

  console.log('\nAll wall assets successfully optimized within budget.');
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
