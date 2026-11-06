import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { optimize } from "svgo";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const ART_DIR = path.resolve(ROOT_DIR, "public", "art");

// Budgets per Phase 5-1 spec
const HERO_SVG_MAX_BYTES = 60 * 1024; // 60 KB
const RASTER_MAX_BYTES = 150 * 1024; // 150 KB
const HERO_TOTAL_MAX_BYTES = 600 * 1024; // 600 KB

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB (${bytes.toLocaleString()} B)`;
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name !== ".gitkeep") {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runArtCheck() {
  console.log("=================================================");
  console.log(" ART ASSET PIPELINE BUDGET CHECK (Phase 5-1)");
  console.log("=================================================");
  console.log(`Scanning: ${ART_DIR}\n`);

  if (!fs.existsSync(ART_DIR)) {
    console.error(`ERROR: Art directory does not exist at ${ART_DIR}`);
    process.exit(1);
  }

  const files = getAllFiles(ART_DIR);
  const results = [];
  let totalHeroBytes = 0;
  let heroFileCount = 0;
  let hasFailure = false;

  for (const filePath of files) {
    const relPath = path.relative(ART_DIR, filePath).replace(/\\/g, "/");
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isHero = relPath.startsWith("dokja/") || relPath.startsWith("biyoo/");

    let budget = RASTER_MAX_BYTES;
    let budgetLabel = "150 KB";
    let type = ext.replace(".", "").toUpperCase();

    if (ext === ".svg") {
      budget = isHero ? HERO_SVG_MAX_BYTES : 100 * 1024;
      budgetLabel = isHero ? "60 KB" : "100 KB";
      
      // Validate SVG with SVGO
      try {
        const svgContent = fs.readFileSync(filePath, "utf8");
        const svgoResult = optimize(svgContent, { multipass: true });
        if (svgoResult.error) {
          console.warn(`[WARN] SVGO parse warning on ${relPath}: ${svgoResult.error}`);
        }
      } catch (err) {
        console.warn(`[WARN] SVGO check failed on ${relPath}: ${err.message}`);
      }
    } else if ([".png", ".webp", ".avif", ".jpg", ".jpeg"].includes(ext)) {
      budget = RASTER_MAX_BYTES;
      budgetLabel = "150 KB";
      
      // Inspect image metadata with sharp
      try {
        const metadata = await sharp(filePath).metadata();
        type = `${metadata.format.toUpperCase()} (${metadata.width}x${metadata.height})`;
      } catch (err) {
        // file could not be parsed by sharp
      }
    }

    if (isHero) {
      totalHeroBytes += stat.size;
      heroFileCount += 1;
    }

    const passed = stat.size <= budget;
    if (!passed) hasFailure = true;

    results.push({
      file: relPath,
      type,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      budget: budgetLabel,
      passed,
      isHero,
    });
  }

  // Display Table
  console.log("Asset Inventory & Budget Check:");
  console.log("--------------------------------------------------------------------------------------------------");
  console.log(
    "Asset File".padEnd(35) +
    "Type".padEnd(20) +
    "Size".padEnd(25) +
    "Budget".padEnd(12) +
    "Status"
  );
  console.log("--------------------------------------------------------------------------------------------------");

  if (results.length === 0) {
    console.log("No asset files found in public/art (only .gitkeep present).");
  } else {
    for (const r of results) {
      const statusStr = r.passed ? "[PASS]" : "[FAIL EXCEEDED]";
      console.log(
        r.file.padEnd(35) +
        r.type.padEnd(20) +
        r.sizeFormatted.padEnd(25) +
        r.budget.padEnd(12) +
        statusStr
      );
    }
  }

  console.log("--------------------------------------------------------------------------------------------------\n");

  // Hero Summary
  console.log("Hero Art Summary:");
  console.log(`- Hero Files Present: ${heroFileCount}`);
  console.log(`- Total Hero Art Size: ${formatBytes(totalHeroBytes)} / Max Allowed: 600.00 KB (${HERO_TOTAL_MAX_BYTES.toLocaleString()} B)`);

  const heroTotalPassed = totalHeroBytes <= HERO_TOTAL_MAX_BYTES;
  if (!heroTotalPassed) {
    hasFailure = true;
    console.error(`\n[FAIL] Hero art total size (${formatBytes(totalHeroBytes)}) EXCEEDS 600 KB budget!`);
  } else {
    console.log(`- Total Hero Budget: [PASS]`);
  }

  if (hasFailure) {
    console.error("\n[FAIL] One or more assets exceeded performance budgets.");
    process.exit(1);
  } else {
    console.log("\n[PASS] All present art assets comply with performance budgets.");
    process.exit(0);
  }
}

runArtCheck().catch((err) => {
  console.error("Art check script encountered an unhandled error:", err);
  process.exit(1);
});
