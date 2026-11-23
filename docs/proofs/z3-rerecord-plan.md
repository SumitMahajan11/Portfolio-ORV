# Proposed Plan: Z3 Re-Record for Absolute Privacy Cleanliness

> **Status:** Proposal Only (Not Applied per User Instructions).  
> **Objective:** Eliminate all occurrences of `C:\Users\SUMIT\AppData\Local\Temp\` from raw recorded runs in `docs/sources/z3/runs/` without manual redaction or hand-editing.

---

## 1. Root Cause Analysis

In `z3-Z1`, the real tool was executed in an isolated temporary directory created under `%TEMP%\z3-run` (`C:\Users\SUMIT\AppData\Local\Temp\z3-run`).
Three commands embedded absolute filesystem paths into raw output:
1. `run-3-unsat-certificate.txt` lines 3 and 9:
   - Embedded the CLI argument `--export-certificate C:\Users\SUMIT\AppData\Local\Temp\z3-run\proof_cert_sg_restricted.json`.
2. `run-4-unresolvable-unknown.txt` line 58:
   - `pytest` printed `rootdir: C:\Users\SUMIT\AppData\Local\Temp\z3-run`.

Because `check-z3-provenance.mjs` strictly verifies SHA256 hashes of unedited raw files, manual edits to those files would invalidate the cryptographic provenance. Currently, displayed excerpts use a single documented normalization (`NORMALIZATION.md`) replacing the path prefix with `<repo>/`.

---

## 2. Proposed Sanitized Execution Environment

To eliminate the local Windows user profile path at the source, execute the recorded runs in an environment with sanitized root paths:

### Option A: Virtual Drive Mount (Recommended)
Mount the isolated test directory to a single-letter drive root:
```powershell
# 1. Create clean temp directory
$IsolatedDir = Join-Path $env:TEMP "z3-run"
# (Copy Cloud3 source to $IsolatedDir excluding .git, .venv, .iac_cache, __pycache__)

# 2. Map virtual drive X:
subst X: $IsolatedDir
Set-Location X:\
```
*Effect:* Any absolute paths printed by tools become `X:\...` instead of `C:\Users\...\AppData\...`.

### Option B: Relative Path Execution & Pytest Flags
When invoking the CLI and pytest, use relative target paths and explicitly specify pytest's root directory:
```powershell
# Certificate export with relative path:
python -m cli.main verify fixtures/phase2/sg_restricted_ssh.tf --export-certificate proof_cert_sg_restricted.json

# Pytest with explicit relative rootdir:
pytest -o rootdir=. -q tests/test_unknown_outcome.py
```
*Effect:* Eliminates path prefixes entirely from command line arguments and pytest headers.

---

## 3. Step-by-Step Re-Record Protocol

1. **Safety Pre-Check**:
   Verify `D:\Projects\Cloud3` is untouched:
   ```powershell
   $env:GIT_OPTIONAL_LOCKS="0"; git -C D:\Projects\Cloud3 status --porcelain
   ```

2. **Stage Isolated Copy**:
   Copy `D:\Projects\Cloud3` (excluding `.git`, `.venv`, `.iac_cache`, `__pycache__`) to an isolated directory mapped as `X:\`.

3. **Execute and Record Clean Runs**:
   - **Run 1 (Privilege Escalation SAT)**:
     ```powershell
     python -m cli.main verify fixtures/phase3/chained_escalation.tf --json > docs/sources/z3/runs/run-1-privilege-escalation-sat.txt
     ```
   - **Run 2 (Security Group AST Repair)**:
     ```powershell
     python -m cli.main repair fixtures/phase2/multi_rule_vulnerability.tf --resource aws_security_group.multi_rule_sg --pattern SG_OVER_EXPOSURE > docs/sources/z3/runs/run-2-multirule-sg-repair.txt
     ```
   - **Run 3 (UNSAT Proof Certificate)**:
     ```powershell
     python -m cli.main verify fixtures/phase2/sg_restricted_ssh.tf --export-certificate proof_cert_sg_restricted.json > docs/sources/z3/runs/run-3-unsat-certificate.txt
     # Append exported certificate JSON to the log file
     Get-Content proof_cert_sg_restricted.json | Add-Content docs/sources/z3/runs/run-3-unsat-certificate.txt
     ```
   - **Run 4 (Fail-Closed UNRESOLVABLE & UNKNOWN)**:
     ```powershell
     python -m cli.main verify fixtures/phase3/unresolved_trust.tf > docs/sources/z3/runs/run-4-unresolvable-unknown.txt
     pytest -o rootdir=. -q tests/test_unknown_outcome.py >> docs/sources/z3/runs/run-4-unresolvable-unknown.txt
     ```

4. **Regenerate Recorded Data & Hashes**:
   ```powershell
   node scripts/build-z3-recorded.mjs
   ```
   This will automatically recalculate the SHA256 checksums and update `src/content/z3-recorded.ts`.

5. **Update Verification Checker**:
   - Remove the `normalizeText` regex replacement from `scripts/build-z3-recorded.mjs` and `scripts/check-z3-provenance.mjs` (or simplify to identity).
   - Update `docs/sources/z3/NORMALIZATION.md` to record that all paths are native relative repository paths.

6. **Run Negative & Positive Controls**:
   ```powershell
   npm run check:z3-provenance
   node scripts/test-z3-negative-controls.mjs
   ```

7. **Verify D:\Projects\Cloud3 Cleanliness**:
   ```powershell
   $env:GIT_OPTIONAL_LOCKS="0"; git -C D:\Projects\Cloud3 status --porcelain
   ```

8. **Unmount Virtual Drive**:
   ```powershell
   subst X: /D
   Remove-Item -Recurse -Force $IsolatedDir
   ```
