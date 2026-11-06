#!/usr/bin/env node

/**
 * scripts/regress.mjs
 *
 * Full-suite regression runner for Sumit Mahajan's Portfolio.
 * Runs all validation and audit stages in sequence:
 * 1. Typecheck: tsc --noEmit
 * 2. Lint: eslint
 * 3. Build: next build
 * 4. Content Check (Strict): check-content.ts --strict
 * 5. Bundle Privacy: verify-bundle-privacy.mjs
 * 6. PII & Secrets Audit: audit-pii-secrets.mjs
 * 7. Pre-launch Audit: audit-prelaunch.mjs
 *
 * Prints a structured PASS / FAIL table and exits non-zero if any step fails.
 */

import { spawn } from 'node:child_process';
import process from 'node:process';

const CHECKS = [
  {
    step: 1,
    name: 'Typecheck',
    command: 'npx tsc --noEmit',
  },
  {
    step: 2,
    name: 'Lint',
    command: 'npx eslint',
  },
  {
    step: 3,
    name: 'Build',
    command: 'npx next build',
  },
  {
    step: 4,
    name: 'Content Check (Strict)',
    command: 'node --experimental-strip-types scripts/check-content.ts --strict',
  },
  {
    step: 5,
    name: 'Bundle Privacy',
    command: 'node scripts/verify-bundle-privacy.mjs',
  },
  {
    step: 6,
    name: 'PII & Secrets Audit',
    command: 'node scripts/audit-pii-secrets.mjs',
  },
  {
    step: 7,
    name: 'Pre-launch Audit',
    command: 'node scripts/audit-prelaunch.mjs',
  },
];

function runCommand(command) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn(command, {
      shell: true,
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        code: code ?? 1,
        durationSec: (durationMs / 1000).toFixed(2),
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      console.error(`Failed to start command '${command}':`, err);
      resolve({
        code: 1,
        durationSec: (durationMs / 1000).toFixed(2),
      });
    });
  });
}

async function main() {
  console.log('='.repeat(72));
  console.log('            SUMIT MAHAJAN PORTFOLIO — REGRESSION SUITE          ');
  console.log('='.repeat(72));
  console.log(`Starting regression run at: ${new Date().toISOString()}\n`);

  const results = [];
  let buildFailed = false;

  for (const check of CHECKS) {
    console.log('\n' + '-'.repeat(72));
    console.log(`[${check.step}/${CHECKS.length}] Running: ${check.name}`);
    console.log(`Command: ${check.command}`);
    console.log('-'.repeat(72) + '\n');

    // If build failed, steps depending on production build (.next) cannot execute meaningfully
    if (buildFailed && (check.name === 'Bundle Privacy' || check.name === 'Pre-launch Audit')) {
      console.log(`Skipping ${check.name} because Step 3 (Build) failed.\n`);
      results.push({
        ...check,
        status: 'SKIPPED',
        durationSec: '0.00',
        code: 1,
      });
      continue;
    }

    const { code, durationSec } = await runCommand(check.command);
    const passed = code === 0;

    if (check.name === 'Build' && !passed) {
      buildFailed = true;
    }

    results.push({
      ...check,
      status: passed ? 'PASS' : 'FAIL',
      durationSec,
      code,
    });
  }

  // Print final summary table
  console.log('\n\n' + '='.repeat(72));
  console.log('                   REGRESSION SUITE SUMMARY TABLE                       ');
  console.log('='.repeat(72) + '\n');

  console.log('| Step | Check Name                 | Command                                                 | Status | Duration |');
  console.log('| :--- | :------------------------- | :------------------------------------------------------ | :----: | -------: |');

  for (const r of results) {
    const stepStr = String(r.step).padEnd(4);
    const nameStr = r.name.padEnd(26);
    const cmdStr = (r.command.length > 55 ? r.command.slice(0, 52) + '...' : r.command).padEnd(55);
    const statusStr = r.status.padEnd(6);
    const durStr = `${r.durationSec}s`.padStart(8);
    console.log(`| ${stepStr} | ${nameStr} | ${cmdStr} | ${statusStr} | ${durStr} |`);
  }

  console.log('\n' + '='.repeat(72));

  const failedCount = results.filter((r) => r.status !== 'PASS').length;
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const totalDuration = results.reduce((acc, r) => acc + parseFloat(r.durationSec || '0'), 0).toFixed(2);

  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${passedCount} | FAILED/SKIPPED: ${failedCount} | DURATION: ${totalDuration}s`);

  if (failedCount > 0) {
    console.log('='.repeat(72));
    console.log(`>>> REGRESSION RESULT: FAIL (${failedCount} checks failed or skipped)`);
    console.log('='.repeat(72) + '\n');
    process.exit(1);
  } else {
    console.log('='.repeat(72));
    console.log('>>> REGRESSION RESULT: PASS (All checks completed successfully)');
    console.log('='.repeat(72) + '\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('FATAL REGRESSION RUNNER ERROR:', err);
  process.exit(1);
});
