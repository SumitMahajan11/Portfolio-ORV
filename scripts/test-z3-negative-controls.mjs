import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT_DIR = process.cwd();
const CHECKER_SCRIPT = path.join(ROOT_DIR, 'scripts', 'check-z3-provenance.mjs');
const PROOFS_DIR = path.join(ROOT_DIR, 'docs', 'proofs');

fs.mkdirSync(PROOFS_DIR, { recursive: true });

function runChecker(env = {}) {
  try {
    const output = cp.execSync(`node "${CHECKER_SCRIPT}"`, {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { success: true, output, exitCode: 0 };
  } catch (err) {
    const combinedOutput = (err.stdout || '') + (err.stderr || '');
    return { success: false, output: combinedOutput, exitCode: err.status || 1 };
  }
}

async function main() {
  console.log('================================================================');
  console.log(' RUNNING Z3 PROVENANCE NEGATIVE CONTROLS AUDIT');
  console.log('================================================================\n');

  const tmpBase = path.join(os.tmpdir(), `z3-controls-${Date.now()}`);
  fs.mkdirSync(tmpBase, { recursive: true });

  try {
    // -------------------------------------------------------------
    // Negative Control (a): Change ONE character inside displayed excerpt text in z3-recorded.ts
    // -------------------------------------------------------------
    console.log('Testing Control (a): Mutate 1 character inside displayed excerpt text...');
    const originalRecorded = fs.readFileSync(path.join(ROOT_DIR, 'src', 'content', 'z3-recorded.ts'), 'utf8');
    const tempRecordedA = path.join(tmpBase, 'z3-recorded-a.ts');
    
    // Mutate 'jump_role' to 'jump_xole' inside exactText of RECORDED_CONFIG_EXCERPT
    const mutatedA = originalRecorded.replace('jump_role', 'jump_xole');
    fs.writeFileSync(tempRecordedA, mutatedA, 'utf8');

    const resA = runChecker({ Z3_RECORDED_FILE: tempRecordedA });
    console.log(`Control (a) Exit Code: ${resA.exitCode} (Expected: 1)`);
    console.log(resA.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-a-excerpt-mutation.txt'), resA.output, 'utf8');

    if (resA.success || !resA.output.includes('RECORDED_CONFIG_EXCERPT')) {
      throw new Error('Control (a) did not fail or did not name RECORDED_CONFIG_EXCERPT!');
    }
    console.log('[PASS] Control (a) failed as expected naming broken item RECORDED_CONFIG_EXCERPT.\n');

    // -------------------------------------------------------------
    // Negative Control (b): Change 1 character of a source line in temporary copy of a run file
    // -------------------------------------------------------------
    console.log('Testing Control (b): Mutate 1 character in temporary copy of a run file...');
    const tempRunsDir = path.join(tmpBase, 'runs');
    fs.mkdirSync(tempRunsDir, { recursive: true });

    // Copy all files from runs to tempRunsDir
    const originalRunsDir = path.join(ROOT_DIR, 'docs', 'sources', 'z3', 'runs');
    for (const f of fs.readdirSync(originalRunsDir)) {
      fs.copyFileSync(path.join(originalRunsDir, f), path.join(tempRunsDir, f));
    }

    // Mutate 1 character in run-1: change "path_length": 2 to "path_length": 3
    const run1Path = path.join(tempRunsDir, 'run-1-privilege-escalation-sat.txt');
    const run1Content = fs.readFileSync(run1Path, 'utf8');
    const mutatedRun1 = run1Content.replace('"path_length": 2,', '"path_length": 3,');
    fs.writeFileSync(run1Path, mutatedRun1, 'utf8');

    const resB = runChecker({ Z3_RUNS_DIR: tempRunsDir });
    console.log(`Control (b) Exit Code: ${resB.exitCode} (Expected: 1)`);
    console.log(resB.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-b-source-mutation.txt'), resB.output, 'utf8');

    if (resB.success || !resB.output.includes('run-1-privilege-escalation-sat.txt') || !resB.output.includes('RECORDED_SAT_WITNESS')) {
      throw new Error('Control (b) did not fail or did not report all failures naming run-1 and RECORDED_SAT_WITNESS!');
    }
    console.log('[PASS] Control (b) failed as expected reporting all failures naming run-1 and RECORDED_SAT_WITNESS.\n');

    // -------------------------------------------------------------
    // Negative Control (c): Hardcode verdict string outside recorded data into a Z3 component
    // -------------------------------------------------------------
    console.log('Testing Control (c): Hardcode unbacked verdict "UNSATISFIABLE" into component copy...');
    const originalComponent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-static-diagram.tsx'), 'utf8');
    const tempComponentC = path.join(tmpBase, 'z3-static-diagram-c.tsx');
    const mutatedC = originalComponent + '\n// Unbacked mock verdict\nconst fakeVerdict = "UNSATISFIABLE";\n';
    fs.writeFileSync(tempComponentC, mutatedC, 'utf8');

    const resC = runChecker({ Z3_COMPONENTS_FILES: tempComponentC });
    console.log(`Control (c) Exit Code: ${resC.exitCode} (Expected: 1)`);
    console.log(resC.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-c-hardcoded-verdict.txt'), resC.output, 'utf8');

    if (resC.success || !resC.output.includes('UNSATISFIABLE')) {
      throw new Error('Control (c) did not fail or did not name UNSATISFIABLE!');
    }
    console.log('[PASS] Control (c) failed as expected naming unbacked mock verdict UNSATISFIABLE.\n');

    // -------------------------------------------------------------
    // Negative Control (d): Delete one source-line reference from an item
    // -------------------------------------------------------------
    console.log('Testing Control (d): Delete source-line reference from an item...');
    const tempRecordedD = path.join(tmpBase, 'z3-recorded-d.ts');
    // Remove lineRange: [1, 32], from RECORDED_CONFIG_EXCERPT
    const mutatedD = originalRecorded.replace('lineRange: [1, 32],', '');
    fs.writeFileSync(tempRecordedD, mutatedD, 'utf8');

    const resD = runChecker({ Z3_RECORDED_FILE: tempRecordedD });
    console.log(`Control (d) Exit Code: ${resD.exitCode} (Expected: 1)`);
    console.log(resD.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-d-deleted-source-reference.txt'), resD.output, 'utf8');

    if (resD.success || !resD.output.includes('RECORDED_CONFIG_EXCERPT') || !resD.output.includes('lineRange')) {
      throw new Error('Control (d) did not fail or did not name RECORDED_CONFIG_EXCERPT lineRange!');
    }
    console.log('[PASS] Control (d) failed as expected naming broken item RECORDED_CONFIG_EXCERPT lineRange.\n');

    // -------------------------------------------------------------
    // Negative Control (e): Mutate displayed test count in a temp copy (change 276 to 277)
    // -------------------------------------------------------------
    console.log('Testing Control (e): Mutate displayed test count in temp copy (276 -> 277)...');
    const tempRecordedE = path.join(tmpBase, 'z3-recorded-e.ts');
    const mutatedE = originalRecorded
      .replace('count: 276,', 'count: 277,')
      .replace('276 passed', '277 passed');
    fs.writeFileSync(tempRecordedE, mutatedE, 'utf8');

    const resE = runChecker({ Z3_RECORDED_FILE: tempRecordedE });
    console.log(`Control (e) Exit Code: ${resE.exitCode} (Expected: 1)`);
    console.log(resE.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-e-count-discrepancy.txt'), resE.output, 'utf8');

    if (resE.success || (!resE.output.includes('Test count discrepancy') && !resE.output.includes('Z3_RECORDED_TESTS declared count (277) does not match expected (276)'))) {
      throw new Error('Control (e) did not fail or did not report test count discrepancy!');
    }
    console.log('[PASS] Control (e) failed as expected detecting test count discrepancy 277 vs 276.\n');

    // -------------------------------------------------------------
    // Negative Control (f): Insert "Tests" field back into certificate card in a temp component copy
    // -------------------------------------------------------------
    console.log('Testing Control (f): Mutate certificate card to include "Tests" field...');
    const originalStatic = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'worlds', 'z3', 'z3-static-diagram.tsx'), 'utf8');
    const tempComponentF = path.join(tmpBase, 'z3-static-diagram-f.tsx');
    const mutatedF = originalStatic.replace(
      'data-testid="z3-certificate-card"',
      'data-testid="z3-certificate-card">\n          <div><span>Tests:</span><span>276 passing</span></div'
    );
    fs.writeFileSync(tempComponentF, mutatedF, 'utf8');

    const resF = runChecker({ Z3_CARD_FILES: tempComponentF });
    console.log(`Control (f) Exit Code: ${resF.exitCode} (Expected: 1)`);
    console.log(resF.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'z3-control-f-card-impurity.txt'), resF.output, 'utf8');

    if (resF.success || !resF.output.includes('Certificate card purity violation')) {
      throw new Error('Control (f) did not fail or did not report certificate card purity violation!');
    }
    console.log('[PASS] Control (f) failed as expected detecting certificate card purity violation.\n');

    // -------------------------------------------------------------
    // Clean Pass: Verify normal unmodified working tree passes cleanly
    // -------------------------------------------------------------
    console.log('Testing Clean Pass: Verifying unmodified working tree...');
    const resClean = runChecker({});
    console.log(`Clean Pass Exit Code: ${resClean.exitCode} (Expected: 0)`);
    console.log(resClean.output);

    fs.writeFileSync(path.join(PROOFS_DIR, 'check-z3-provenance.txt'), resClean.output, 'utf8');

    if (!resClean.success) {
      throw new Error('Clean working tree failed provenance checks!');
    }
    console.log('[PASS] Clean working tree passed all provenance checks with code 0.\n');

    console.log('================================================================');
    console.log(' ALL 6 NEGATIVE CONTROLS AND CLEAN PASS VERIFIED SUCCESSFULLY');
    console.log('================================================================');
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});

