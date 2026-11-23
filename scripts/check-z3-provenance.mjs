import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT_DIR = process.cwd();
const RUNS_DIR = process.env.Z3_RUNS_DIR || path.join(ROOT_DIR, 'docs', 'sources', 'z3', 'runs');
const RECORDED_FILE = process.env.Z3_RECORDED_FILE || path.join(ROOT_DIR, 'src', 'content', 'z3-recorded.ts');

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizeText(text) {
  return text
    .replaceAll('C:\\Users\\SUMIT\\AppData\\Local\\Temp\\z3-run\\', '<repo>/')
    .replaceAll('C:/Users/SUMIT/AppData/Local/Temp/z3-run/', '<repo>/')
    .replaceAll('C:\\Users\\SUMIT\\AppData\\Local\\Temp\\z3-run', '<repo>')
    .replaceAll('C:/Users/SUMIT/AppData/Local/Temp/z3-run', '<repo>');
}

function extractLines(filePath, startLine, endLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const selected = lines.slice(startLine - 1, endLine);
  return normalizeText(selected.join('\n'));
}

export function checkProvenance() {
  console.log('=== Z3 RECORDED PROVENANCE & TRUTHFULNESS AUDIT ===\n');

  const failures = [];

  if (!fs.existsSync(RECORDED_FILE)) {
    console.error(`[FAIL] Recorded content file missing: ${RECORDED_FILE}`);
    failures.push(`Recorded content file missing: ${RECORDED_FILE}`);
    return false;
  }

  const recordedContent = fs.readFileSync(RECORDED_FILE, 'utf8');

  // Verify Sha256 of all source run files
  const fileChained = path.join(RUNS_DIR, 'chained_escalation.tf');
  const fileRun1 = path.join(RUNS_DIR, 'run-1-privilege-escalation-sat.txt');
  const fileRun2 = path.join(RUNS_DIR, 'run-2-multirule-sg-repair.txt');
  const fileRun3 = path.join(RUNS_DIR, 'run-3-unsat-certificate.txt');
  const fileRun4 = path.join(RUNS_DIR, 'run-4-unresolvable-unknown.txt');
  const filePytestRun = path.join(RUNS_DIR, 'pytest-run.txt');

  const filesToCheck = [
    { name: 'chained_escalation.tf', path: fileChained, varName: 'RECORDED_CONFIG_EXCERPT' },
    { name: 'run-1-privilege-escalation-sat.txt', path: fileRun1, varName: 'RECORDED_SAT_WITNESS' },
    { name: 'run-2-multirule-sg-repair.txt', path: fileRun2, varName: 'RECORDED_AUTO_REPAIR' },
    { name: 'run-3-unsat-certificate.txt', path: fileRun3, varName: 'RECORDED_PROOF_CERTIFICATE' },
    { name: 'run-4-unresolvable-unknown.txt', path: fileRun4, varName: 'RECORDED_FAIL_CLOSED' },
    { name: 'pytest-run.txt', path: filePytestRun, varName: 'Z3_RECORDED_TESTS' },
  ];

  for (const f of filesToCheck) {
    if (!fs.existsSync(f.path)) {
      const msg = `Source file missing: ${f.path}`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
      continue;
    }
    const diskHash = sha256File(f.path);
    if (!recordedContent.includes(diskHash)) {
      const msg = `Hash mismatch for ${f.name}: recorded content does not contain ${diskHash}`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    } else {
      console.log(`[PASS] SHA256 matches for ${f.name} (${diskHash})`);
    }
  }

  // Helper to extract declared line range and source file from recordedContent
  function parseItemReference(varName) {
    const itemBlockRegex = new RegExp(`export const ${varName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\};`);
    const match = recordedContent.match(itemBlockRegex);
    if (!match) {
      return { found: false, raw: '' };
    }
    const blockText = match[0];
    const sourceFileMatch = blockText.match(/sourceFile:\s*"([^"]+)"/);
    const lineRangeMatch = blockText.match(/lineRange:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/);

    return {
      found: true,
      hasSourceFile: Boolean(sourceFileMatch),
      sourceFile: sourceFileMatch ? sourceFileMatch[1] : null,
      hasLineRange: Boolean(lineRangeMatch),
      lineRange: lineRangeMatch ? [parseInt(lineRangeMatch[1], 10), parseInt(lineRangeMatch[2], 10)] : null,
    };
  }

  // Items to verify against source lines
  const items = [
    {
      index: 1,
      varName: 'RECORDED_CONFIG_EXCERPT',
      fileName: 'chained_escalation.tf',
      filePath: fileChained,
      expectedDefaultRange: [1, 32],
    },
    {
      index: 2,
      varName: 'RECORDED_SAT_WITNESS',
      fileName: 'run-1-privilege-escalation-sat.txt',
      filePath: fileRun1,
      expectedDefaultRange: [81, 128],
    },
    {
      index: 3,
      varName: 'RECORDED_AUTO_REPAIR',
      fileName: 'run-2-multirule-sg-repair.txt',
      filePath: fileRun2,
      expectedDefaultRange: [7, 36],
    },
    {
      index: 4,
      varName: 'RECORDED_FAIL_CLOSED',
      fileName: 'run-4-unresolvable-unknown.txt',
      filePath: fileRun4,
      expectedDefaultRange: [9, 13],
    },
  ];

  for (const it of items) {
    const ref = parseItemReference(it.varName);
    if (!ref.found) {
      const msg = `Item ${it.index} (${it.varName}) definition not found in recorded file`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
      continue;
    }

    if (!ref.hasSourceFile) {
      const msg = `Item ${it.index} (${it.varName}) missing sourceFile reference`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    }

    if (!ref.hasLineRange) {
      const msg = `Item ${it.index} (${it.varName}) missing lineRange reference [start, end]`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
      continue;
    }

    if (fs.existsSync(it.filePath)) {
      const [start, end] = ref.lineRange;
      const diskText = extractLines(it.filePath, start, end);
      if (!recordedContent.includes(JSON.stringify(diskText))) {
        const msg = `Item ${it.index} (${it.varName}) displayed excerpt text does not match disk lines ${start}-${end} of ${it.fileName}`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      } else {
        console.log(`[PASS] Item ${it.index} (${it.varName}) excerpt matches ${it.fileName} lines ${start}-${end} exactly`);
      }
    }
  }

  // Item 5: Proof certificate truncated excerpt check
  const item5Ref = parseItemReference('RECORDED_PROOF_CERTIFICATE');
  if (!item5Ref.found) {
    const msg = `Item 5 (RECORDED_PROOF_CERTIFICATE) definition not found in recorded file`;
    console.error(`[FAIL] ${msg}`);
    failures.push(msg);
  } else {
    if (!item5Ref.hasSourceFile) {
      const msg = `Item 5 (RECORDED_PROOF_CERTIFICATE) missing sourceFile reference`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    }
    if (!item5Ref.hasLineRange) {
      const msg = `Item 5 (RECORDED_PROOF_CERTIFICATE) missing lineRange reference [start, end]`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    }
    if (!recordedContent.includes('UNSAT_PROOF_CERTIFICATE') || !recordedContent.includes('TRUNCATED EXCERPT')) {
      const msg = 'Item 5 (RECORDED_PROOF_CERTIFICATE) missing truncated excerpt marker';
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    } else {
      console.log('[PASS] Item 5 (RECORDED_PROOF_CERTIFICATE) proof certificate truncated excerpt verified against run-3');
    }
  }

  // Scan Z3 components to ensure banned mock phrases and unbacked verdict strings do not exist
  const z3Files = process.env.Z3_COMPONENTS_FILES
    ? process.env.Z3_COMPONENTS_FILES.split(',')
    : [
        path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-static-diagram.tsx'),
        path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-viz-canvas.tsx'),
        path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-world.tsx'),
        path.join(ROOT_DIR, 'src', 'lib', 'worlds', 'z3-viz.ts'),
      ];

  const BANNED_PATTERNS = [
    'ZERO CHECKS MISSED',
    'StrictBoundary',
    'SMT_PROOF_CERTIFICATE • SHA256_VERIFIED',
    '103 PASSING',
    '103 passing',
    'UNSATISFIABLE', // Old fictitious mock verdict string; real tool returns UNSAT or SAT
  ];

  let componentsClean = true;
  for (const zf of z3Files) {
    if (fs.existsSync(zf)) {
      const txt = fs.readFileSync(zf, 'utf8');
      for (const banned of BANNED_PATTERNS) {
        if (txt.includes(banned)) {
          const msg = `File ${path.basename(zf)} contains banned unverified/mock string: "${banned}"`;
          console.error(`[FAIL] ${msg}`);
          failures.push(msg);
          componentsClean = false;
        }
      }
    }
  }

  if (componentsClean) {
    console.log('[PASS] All Z3 world source files clean of banned mock patterns and unbacked verdicts');
  }

  // --- CERTIFICATE CARD PURITY & TEST-COUNT PROVENANCE AUDIT ---
  console.log('\n--- Checking Certificate Card Purity & Test-Count Provenance ---');

  // 1. Parse expected test count and run date from pytest-run.txt
  let expectedTestCount = null;
  let expectedRunDate = null;
  if (!fs.existsSync(filePytestRun)) {
    const msg = `pytest-run.txt source file missing: ${filePytestRun}`;
    console.error(`[FAIL] ${msg}`);
    failures.push(msg);
  } else {
    const pytestText = fs.readFileSync(filePytestRun, 'utf8');
    const mCount = pytestText.match(/(\d+)\s+passed/);
    if (mCount) {
      expectedTestCount = parseInt(mCount[1], 10);
    } else {
      const msg = `Could not parse passed test count from ${path.basename(filePytestRun)}`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    }
    const mDate = pytestText.match(/^# Date:\s*([0-9-]+)/m);
    if (mDate) {
      expectedRunDate = mDate[1].trim();
    } else {
      const msg = `Could not parse date from ${path.basename(filePytestRun)}`;
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    }
  }

  if (expectedTestCount !== null && expectedRunDate !== null) {
    console.log(`[INFO] Provenance baseline: ${expectedTestCount} tests passed on ${expectedRunDate} (from pytest-run.txt)`);

    // 2. Verify Z3_RECORDED_TESTS / Z3_TEST_SUITE in recordedContent
    const testBlockMatch = recordedContent.match(/export const Z3_RECORDED_TESTS\s*=\s*\{([\s\S]*?)\};/);
    if (!testBlockMatch) {
      const msg = 'Z3_RECORDED_TESTS constant not exported in recorded file';
      console.error(`[FAIL] ${msg}`);
      failures.push(msg);
    } else {
      const testBlock = testBlockMatch[1];
      const countMatch = testBlock.match(/count:\s*(\d+)/);
      const dateMatch = testBlock.match(/date:\s*"([^"]+)"/);
      const lineMatch = testBlock.match(/line:\s*"([^"]+)"/);

      if (!countMatch || parseInt(countMatch[1], 10) !== expectedTestCount) {
        const found = countMatch ? countMatch[1] : 'missing';
        const msg = `Z3_RECORDED_TESTS declared count (${found}) does not match expected (${expectedTestCount}) from pytest-run.txt`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
      if (!dateMatch || dateMatch[1] !== expectedRunDate) {
        const found = dateMatch ? dateMatch[1] : 'missing';
        const msg = `Z3_RECORDED_TESTS declared date (${found}) does not match expected (${expectedRunDate}) from pytest-run.txt`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
      const expectedSuiteLine = `Test suite: ${expectedTestCount} passed (pytest run, ${expectedRunDate})`;
      if (!lineMatch || lineMatch[1] !== expectedSuiteLine) {
        const found = lineMatch ? lineMatch[1] : 'missing';
        const msg = `Z3_RECORDED_TESTS declared line ("${found}") does not match expected ("${expectedSuiteLine}")`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
      if (!recordedContent.includes('export const Z3_TEST_SUITE = Z3_RECORDED_TESTS;')) {
        const msg = 'export const Z3_TEST_SUITE alias missing in recorded file';
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
    }

    // 3. Certificate Card Purity: Ensure NO "Tests" field or test count appears inside Beat 5 certificate card
    const cardFiles = process.env.Z3_CARD_FILES
      ? process.env.Z3_CARD_FILES.split(',')
      : [
          path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-static-diagram.tsx'),
          path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-viz-canvas.tsx'),
        ];

    for (const cf of cardFiles) {
      if (!fs.existsSync(cf)) continue;
      const cTxt = fs.readFileSync(cf, 'utf8');

      // Check card element with data-testid="z3-certificate-card"
      const cardMatch = cTxt.match(/data-testid="z3-certificate-card"[^>]*>([\s\S]*?)<\/div>/);
      if (cardMatch) {
        const cardContent = cardMatch[1];
        if (/\bTests?:?\b/i.test(cardContent)) {
          const msg = `Certificate card purity violation in ${path.basename(cf)}: "Tests" field found inside certificate card`;
          console.error(`[FAIL] ${msg}`);
          failures.push(msg);
        }
        if (/\b(?:passing|passed)\b/i.test(cardContent)) {
          const msg = `Certificate card purity violation in ${path.basename(cf)}: "passing/passed" found inside certificate card`;
          console.error(`[FAIL] ${msg}`);
          failures.push(msg);
        }
        if (cardContent.includes(String(expectedTestCount))) {
          const msg = `Certificate card purity violation in ${path.basename(cf)}: test count ${expectedTestCount} found inside certificate card`;
          console.error(`[FAIL] ${msg}`);
          failures.push(msg);
        }
      } else {
        // Fallback: check if old 4-box card containing "276 passing" or "Tests:" exists
        if (cTxt.includes('276 passing') && cTxt.includes('Complete Proof:')) {
          const msg = `Certificate card purity violation in ${path.basename(cf)}: certificate card still contains test count / Tests field`;
          console.error(`[FAIL] ${msg}`);
          failures.push(msg);
        }
      }

      // Verify that the separate line OUTSIDE the certificate card exists
      if (!cTxt.includes('Z3_TEST_SUITE.line') && !cTxt.includes(`Test suite: ${expectedTestCount} passed`)) {
        const msg = `Missing separate test suite line outside certificate card in ${path.basename(cf)}`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
    }

    // Check RECORDED_PROOF_CERTIFICATE in recordedContent has no tests field
    const certBlockMatch = recordedContent.match(/export const RECORDED_PROOF_CERTIFICATE[\s\S]*?=\s*\{([\s\S]*?)\};/);
    if (certBlockMatch) {
      const certBlock = certBlockMatch[1];
      if (/tests?:/i.test(certBlock) || certBlock.includes(String(expectedTestCount))) {
        const msg = 'RECORDED_PROOF_CERTIFICATE object contains test field or count';
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
    }

    // 4. Check Beat 5 summary in z3-viz.ts: must NOT contain "Verified against 276 passing tests" or "full transparent disclosure"
    const vizFile = process.env.Z3_VIZ_FILE || path.join(ROOT_DIR, 'src', 'lib', 'worlds', 'z3-viz.ts');
    if (fs.existsSync(vizFile)) {
      const vizTxt = fs.readFileSync(vizFile, 'utf8');
      if (vizTxt.includes('Verified against 276 passing tests') || vizTxt.includes('Verified against')) {
        const msg = `Beat 5 summary in ${path.basename(vizFile)} contains deleted phrase "Verified against"`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
      if (vizTxt.includes('full transparent disclosure')) {
        const msg = `Beat 5 summary in ${path.basename(vizFile)} contains deleted phrase "full transparent disclosure"`;
        console.error(`[FAIL] ${msg}`);
        failures.push(msg);
      }
    }

    // 5. Test count consistency check across all Z3 world files:
    // FAIL if any test-count number shown in the Z3 world differs from the number parsed from pytest-run.txt
    const worldFilesToCheck = process.env.Z3_WORLD_FILES
      ? process.env.Z3_WORLD_FILES.split(',')
      : [
          RECORDED_FILE,
          path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-static-diagram.tsx'),
          path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-viz-canvas.tsx'),
          path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-world.tsx'),
          path.join(ROOT_DIR, 'src', 'content', 'projects.ts'),
          path.join(ROOT_DIR, 'src', 'lib', 'worlds', 'z3-viz.ts'),
        ];

    for (const wf of worldFilesToCheck) {
      if (!fs.existsSync(wf)) continue;
      let wTxt = fs.readFileSync(wf, 'utf8');

      // For projects.ts, isolate the iac-verifier project definition so other projects (like Ratify) aren't conflated
      if (path.basename(wf) === 'projects.ts') {
        const iacMatch = wTxt.match(/id:\s*["']iac-verifier["'][\s\S]*?(?:\{\s*id:\s*["']|$)/);
        wTxt = iacMatch ? iacMatch[0] : wTxt;
      }

      // Find all test count occurrences matching test-specific patterns:
      // "Test suite: <num>", "Tests: <num>", "<num> passed", "<num> passing", "testCount: <num>"
      const testPatterns = [
        /\bTest\s+suite:\s*(\d+)/gi,
        /\bTests?:\s*(\d+)/gi,
        /\btestCount:\s*(\d+)/g,
        /\b(\d+)\s+(?:passing\s+tests|passed|tests\s+passing)/gi,
      ];

      for (const pattern of testPatterns) {
        let match;
        while ((match = pattern.exec(wTxt)) !== null) {
          const num = parseInt(match[1], 10);
          if (num !== expectedTestCount) {
            const msg = `Test count discrepancy in ${path.basename(wf)}: found ${num}, expected ${expectedTestCount} (from pytest-run.txt)`;
            console.error(`[FAIL] ${msg}`);
            failures.push(msg);
          }
        }
      }
    }

    if (failures.length === 0) {
      console.log('[PASS] Certificate card purity verified: no test fields or counts inside certificate card');
      console.log('[PASS] Test count consistency verified across all Z3 world files');
      console.log(`[PASS] All displayed test counts match ${expectedTestCount} from pytest-run.txt`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n>>> Z3 PROVENANCE CHECK FAILED: ${failures.length} error(s) detected <<<`);
    for (const f of failures) {
      console.error(` - ${f}`);
    }
    return false;
  }

  console.log('\n>>> ALL Z3 PROVENANCE CHECKS PASSED SUCCESSFULLY <<<\n');
  return true;
}

const passed = checkProvenance();
if (!passed) {
  process.exit(1);
}
