import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BIYOO_DIR = path.resolve('public/art/biyoo');
const PROOFS_DIR = path.resolve('docs/proofs');
fs.mkdirSync(PROOFS_DIR, { recursive: true });

const TASKS = [
  {
    name: 'calm',
    input: path.join(BIYOO_DIR, 'biyoo-cut.png'),
    variants: [
      { prefix: 'biyoo-calm-360', width: 360 },
      { prefix: 'biyoo-calm-720', width: 720, is2xPose: true },
    ],
  },
  {
    name: 'excited',
    input: path.join(BIYOO_DIR, 'biyoo-excited-cut.png'),
    variants: [
      { prefix: 'biyoo-excited-360', width: 360 },
      { prefix: 'biyoo-excited-720', width: 720, is2xPose: true },
    ],
  },
  {
    name: 'burst',
    input: path.join(BIYOO_DIR, 'biyoo-burst.png'),
    variants: [
      { prefix: 'biyoo-burst-96', width: 96 },
      { prefix: 'biyoo-burst-192', width: 192 },
    ],
  },
];

async function optimizeBiyoo() {
  console.log('====================================================');
  console.log(' OPTIMIZING BIYOO MASCOT ASSETS (WEBP & AVIF) ');
  console.log(' Budget: Each 2x pose <= 60 KB AVIF');
  console.log('====================================================\n');

  const results = [];
  let budgetFailed = false;

  for (const task of TASKS) {
    if (!fs.existsSync(task.input)) {
      console.error(`Missing input file: ${task.input}`);
      process.exit(1);
    }

    for (const variant of task.variants) {
      // 1. WebP
      const webpPath = path.join(BIYOO_DIR, `${variant.prefix}.webp`);
      await sharp(task.input)
        .resize(variant.width, null, { withoutEnlargement: true })
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);

      const webpStat = fs.statSync(webpPath);

      // 2. AVIF
      const avifPath = path.join(BIYOO_DIR, `${variant.prefix}.avif`);
      await sharp(task.input)
        .resize(variant.width, null, { withoutEnlargement: true })
        .avif({ quality: 80, effort: 6 })
        .toFile(avifPath);

      const avifStat = fs.statSync(avifPath);

      const avifKb = (avifStat.size / 1024).toFixed(1);
      const webpKb = (webpStat.size / 1024).toFixed(1);

      let status = 'OK';
      if (variant.is2xPose) {
        if (avifStat.size > 60 * 1024) {
          status = 'FAIL (>60KB)';
          budgetFailed = true;
        } else {
          status = 'PASS (<=60KB)';
        }
      }

      results.push({
        Asset: task.name,
        Width: `${variant.width}px`,
        'AVIF Size': `${avifKb} KB (${avifStat.size} B)`,
        'WebP Size': `${webpKb} KB (${webpStat.size} B)`,
        '2x Budget Check': status,
      });
    }
  }

  console.table(results);

  const report =
    `=== BIYOO ASSET OPTIMIZATION REPORT ===\n\n` +
    `Date: ${new Date().toISOString()}\n` +
    `Budget: Each 2x pose <= 60 KB AVIF\n\n` +
    JSON.stringify(results, null, 2) +
    `\n\nVerdict: ${budgetFailed ? 'FAILED' : 'ALL BUDGETS SATISFIED'}\n`;

  fs.writeFileSync(path.join(PROOFS_DIR, 'biyoo-optimization-report.txt'), report);
  console.log('\nReport written to docs/proofs/biyoo-optimization-report.txt');

  if (budgetFailed) {
    console.error('FAILED: One or more 2x AVIF poses exceeded 60 KB budget.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All Biyoo assets optimized within performance budgets.');
  }
}

optimizeBiyoo().catch((err) => {
  console.error(err);
  process.exit(1);
});
