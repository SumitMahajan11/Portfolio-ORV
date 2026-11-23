# Z3 Recorded Run Output Normalization Specification

This document specifies the single deterministic normalization applied to raw tool run outputs when ingesting them into user-facing display content (`src/content/z3-recorded.ts`) and verifying them in `scripts/check-z3-provenance.mjs`.

## Privacy & Local Path Normalization Rule

Raw run outputs captured inside `%TEMP%\z3-run` contain machine-specific temporary directories and username references.
Raw files in `docs/sources/z3/runs/` are kept UNEDITED.
When generating `src/content/z3-recorded.ts`, the following single string replacement is applied:

1. **Prefix Replacement**:
   - Target: `C:\Users\SUMIT\AppData\Local\Temp\z3-run\` (or `C:/Users/SUMIT/AppData/Local/Temp/z3-run/`)
   - Replacement: `<repo>/`
   - Target without trailing slash: `C:\Users\SUMIT\AppData\Local\Temp\z3-run`
   - Replacement: `<repo>`

2. **Invariant**:
   - No characters, words, proof symbols, solver outputs, status verdicts, or numbers are altered.
   - Every displayed excerpt must match the raw source lines identically after applying this single normalization.
   - Any difference beyond this exact replacement will cause `npm run check:z3-provenance` to fail.

