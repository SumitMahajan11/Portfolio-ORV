# Verified Facts: `iac-verifier` (Cloud3)

This document contains evidence-gated facts extracted from the real project repository `D:\Projects\Cloud3` (commit `6ed26e409270f296a2ecb7a1b3d01e0689ade954`, verified on 2026-11-08).
Format: each entry is a verified fact paired with its exact source (file:line in Cloud3 or literal command output in the execution copy).

---

## 1. Test Suite Count and Passing Status

- **Real Test Count**: 276 tests collected. | Source: command `pytest --collect-only -q` executed in temp copy `%TEMP%\z3-run` -> literal output summary line: `276 tests collected in 1.08s` (and `276 tests collected in 6.50s` on cold run).
- **Test Pass Verdict**: All 276 tests pass with 0 failures and 1 deprecation warning. | Source: command `pytest -q` executed in temp copy `%TEMP%\z3-run` -> literal output tail: `276 passed, 1 warning in 8.47s` (warning: `D:\Projects\Cloud3\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using 'httpx' with 'starlette.testclient' is deprecated; install 'httpx2' instead.`).
- **Owner's Claim of 276 Tests (Hypothesis Check)**: Confirmed. The suite contains exactly 276 tests, and all 276 tests pass. | Source: `pytest --collect-only -q` and `pytest -q` runs in `%TEMP%\z3-run`.
- **Disagreement on Test Count Across Documents (Listed Without Selection)**:
  - `README.md:12`: `## Current Status: 276 Tests Passing`
  - `README.md:78`: `Full test suite: 276 tests; 81% line coverage, source only. The CI gate (--cov=. --cov-fail-under=85) also counts test files and reads 88%; a source-only gate at 85% would currently fail.`
  - `PROJECT_STATUS.md:4`: `Current Status: 276 tests passing across AWS, Azure, and GCP test suites.`
  - `PROJECT_STATUS.md:32`: `Pass Count: 276 passed in ~6.7s`
  - `PROJECT_STATUS.md:33`: `Line Coverage: 88% overall across 276 tests (81% source only)`
  - `docs/adr/0001_azure_depth_vs_gcp_breadth.md:16`: `195 passing unit/integration tests (as of September 2026)`
  - `docs/adr/0001_azure_depth_vs_gcp_breadth.md:124`: `Full Test Suite: 259 passed (0 failures) in ~13.5s (88% overall line coverage).`
  - `docs/azure_governance_benchmark_design.md:10`: `across 195 tests with 90% code coverage (as of September 2026)`
  - Portfolio `/docs/03-CONTENT-BIBLE.md:31`: `103 passing tests. [VERIFIED]`
  - Portfolio `src/content/projects.ts:94`: `103 passing tests.`

---

## 2. Benchmark Numbers and Provenance from Committed Docs

### A. AWS Ground-Truth Benchmark Corpus
- **Corpus Size**: 28 total entries (27 evaluated cases + 1 ambiguous case excluded). | Source: `README.md:87`, `PROJECT_STATUS.md:12,27`, `docs/phase4_comparative_evaluation.md:7`.
- **Corpus Provenance**: 18 cases from independent third-party benchmarks (15 from `nccgroup/sadcloud`, 3 from `bridgecrewio/terragoat`) and 10 hand-authored project test fixtures (with 1 ambiguous excluded, leaving 9 evaluated hand-authored + 18 third-party = 27 evaluated cases), evaluated via `BenchmarkHarness` in `benchmark/harness.py`. | Source: `README.md:87`, `PROJECT_STATUS.md:27`.
- **Evaluated Outcomes**: 19 True Positives, 8 True Negatives (or 19 SAT, 6 UNSAT, 2 UNRESOLVABLE) evaluated against labeled ground-truth invariants. | Source: `docs/phase4_comparative_evaluation.md:7,71`, `PROJECT_STATUS.md:12`.
- **Classification Metrics**: Precision: 1.000 (19 / (19 + 0)), Recall: 1.000 (19 / (19 + 0)), F1 Score: 1.000. | Source: `docs/phase4_comparative_evaluation.md:72-74`, `tests/test_benchmark.py:23-24`.
- **Comparative Baseline Detection Claim (`aws_iam_role.target_role` only)**: "Neither Checkov nor TFSec detect this privilege-escalation path; the SMT engine correctly returns SAT with a witness trace." Checkov: False (misses path); TFSec: False (misses path); SMT Engine: SAT (`arn:aws:iam::111122223333:root -> aws_iam_role.jump_role -> aws_iam_role.target_role`). | Source: `README.md:102-107`, `docs/phase4_comparative_evaluation.md:18-24`.
- **Comparative Baseline Remediation-Precision Claim (`aws_security_group.multi_rule_sg` only)**: "Checkov and TFSec both detect the individual open-SSH rule, but neither can prove the minimal fix requires deleting both rules simultaneously — only UNSAT-core extraction does." Note: Represents a remediation-precision advantage (minimal-fix determination via UNSAT-core), not a detection win over static linters. | Source: `README.md:109-115`, `docs/phase4_comparative_evaluation.md:26-33`.

### B. Azure Benchmark Corpus
- **Corpus Size**: 35 total cases: 32 author-written synthetic cases (`fixtures/phase11/azure_ground_truth.json`) + 3 real-world cases (`benchmark/azure_real_world_ground_truth.json`) from TerraGoat (`networking.tf`, `roles.tf`, `policies.tf`). | Source: `README.md:88`, `PROJECT_STATUS.md:19,27`.
- **Synthetic Corpus Composition**: 32 evaluated cases across HCL (15) and ARM JSON (17): NSG Over-Exposure (7), RBAC Privilege Escalation (7), Scope Inheritance (6), Azure Governance Policy Violations (12). | Source: `docs/azure_governance_benchmark_design.md:98-104`, `tests/test_azure_benchmark_corpus.py:56-61`.
- **Synthetic Corpus Verdicts**: 27 binary decidable (16 SAT, 11 UNSAT) + 5 UNRESOLVABLE. | Source: `README.md:88`, `PROJECT_STATUS.md:19`, `tests/test_azure_benchmark_corpus.py:33-35`.
- **Synthetic Corpus Metrics**: Precision: 1.0 (100.0%), Recall: 1.0 (100.0%), F1 Score: 1.0 (100.0%), Unresolvable Accuracy: 5 of 5 (100.0%). | Source: `tests/test_azure_benchmark_corpus.py:35-40`.
- **Real-World Corpus Verdicts**: 3 cases from TerraGoat (`networking.tf`, `roles.tf`, `policies.tf`), all 3 binary decidable (1 SAT, 2 UNSAT). | Source: `PROJECT_STATUS.md:19`, `README.md:88`.
- **Scope Inheritance Limitation**: "Scope inheritance (e.g. management group overrides/exemptions) has zero real-world open-source coverage in public vulnerable repos and is documented as a permanent corpus limitation. Azure synthetic corpus (32 cases) is hand-authored for specification verification" | Source: `PROJECT_STATUS.md:27`, `docs/azure_governance_benchmark_design.md:13,94`.

### C. GCP Regression Corpus
- **Corpus Size**: 27 hand-authored test fixtures (`fixtures/phase12/gcp_corpus/`, `fixtures/phase12/gcp_ground_truth.json`). | Source: `README.md:89`, `PROJECT_STATUS.md:20,29`.
- **Corpus Categories & Verdicts**: 18 SAT, 7 UNSAT, 2 UNRESOLVABLE across firewall exposure (7: 4 SAT, 3 UNSAT), IAM roles (5: 4 SAT, 1 UNSAT), impersonation chains (4: 3 SAT, 1 UNSAT), scope hierarchy (5: 4 SAT, 1 UNSAT), Workload Identity (4: 3 SAT, 1 UNSAT), and unresolvable hierarchy (2 UNRESOLVABLE). | Source: `README.md:89`, `tests/test_gcp_benchmark_corpus.py:205-217`.
- **Methodological Note on GCP Precision/Recall (Doc Quote)**: "Methodological Note: The GCP dataset is a regression corpus (hand-authored, not independent) designed for specification conformance; precision and recall claims are not reported for it because it is not an independent third-party benchmark." | Source: `README.md:89` and `PROJECT_STATUS.md:29`.
- **Disagreement Between Docs on GCP Metrics (Listed Without Selection)**:
  - `README.md:89` & `PROJECT_STATUS.md:29` state: "precision and recall claims are not reported for it because it is not an independent third-party benchmark."
  - `docs/adr/0001_azure_depth_vs_gcp_breadth.md:135-138` states: Precision: 1.0 (100.0%), Recall: 1.0 (100.0%), F1 Score: 1.0 (100.0%), while admitting at line 143: "the GCP benchmark corpus is entirely hand-authored and synthetic for specification verification. It is NOT derived from real-world open-source vulnerable repositories ... There is currently no third-party, real-world derived vulnerable corpus for GCP in this repository."

### D. Label Production and Author Tuning Against Corpus
- **TerraGoat GCP Baseline Execution**: Evaluated against third-party vulnerable GCP infrastructure in `bridgecrewio/terragoat` (pinned commit `729f8da62c6a85ce4af5ad3d123de97776d954c4`, directory `terraform/gcp`). | Source: `README.md:92`.
- **Pre-Tuning TerraGoat Baseline Numbers (Doc Quote)**: "Independent Pre-Tuning Baseline: Of 11 parsed resources: 1 flagged, 1 modeled but missed before the fix, 9 not modeled. At graph level, 5 of the 7 Terraform files (big_data.tf, gcs.tf, gke.tf, instances.tf, networks.tf) are UNRESOLVABLE ... All 5 resource-bearing TerraGoat GCP files are UNRESOLVABLE at graph level, reason not yet diagnosed". | Source: `README.md:93`.
  - 1 Flagged: `google_compute_firewall.allow_all` correctly flagged SAT for public exposure (`0.0.0.0/0`) on TCP ports `0-65535` (`GCP_FIREWALL_OVER_EXPOSURE`). | Source: `README.md:94`.
  - 1 Modeled but Missed Before Fix: `google_storage_bucket_iam_binding.allow_public_read` (public read access granted to `allUsers` missed pre-tuning due to evaluation against admin/wildcard roles rather than public exposure; pre-fix printed `[UNSAT] google_storage_bucket_iam_binding.allow_public_read: GCP IAM resource 'google_storage_bucket_iam_binding.allow_public_read' is safe from high-privilege wildcard role permissions`). | Source: `README.md:95`.
  - 9 Not Modeled: `google_bigquery_dataset`, `google_compute_disk`, `google_compute_instance`, `google_compute_network`, `google_compute_subnetwork`, `google_container_cluster`, `google_container_node_pool`, `google_sql_database_instance`, `google_storage_bucket`. | Source: `README.md:96`.
- **Author Post-Hoc Tuning Wording (Doc Quote)**: "Post-Fix Tuning Note: Support for public IAM exposure (GCP_IAM_PUBLIC_EXPOSURE matching allUsers/allAuthenticatedUsers) is a rule-based check, not a formal proof, implemented post-hoc to detect allow_public_read. Post-fix behavior was tuned on the same repository (bridgecrewio/terragoat)." | Source: `README.md:97`.

---

## 3. Stated Limitations from Committed Docs (README, PROJECT_STATUS, ADRs)

- **TerraGoat GCP Baseline**: 11 resources parsed: 1 flagged, 1 modeled but missed before fix, 9 not modeled. | Source: `README.md:93-96`.
- **UNRESOLVABLE Files in TerraGoat GCP**: All 5 resource-bearing TerraGoat GCP files (`big_data.tf`, `gcs.tf`, `gke.tf`, `instances.tf`, `networks.tf`) are UNRESOLVABLE at graph level, reason not yet diagnosed. | Source: `README.md:93`.
- **Unmodeled Resources**: 9 GCP resource types parsed but not modeled by SMT engine: `google_bigquery_dataset`, `google_compute_disk`, `google_compute_instance`, `google_compute_network`, `google_compute_subnetwork`, `google_container_cluster`, `google_container_node_pool`, `google_sql_database_instance`, `google_storage_bucket`. | Source: `README.md:96`.
- **Public-Exposure Check is a Rule, Not a Proof**: Support for public IAM exposure (`GCP_IAM_PUBLIC_EXPOSURE` matching `allUsers`/`allAuthenticatedUsers`) is a rule-based check, not a formal proof, implemented post-hoc to detect `allow_public_read`. | Source: `README.md:97`.
- **Auto-Repair Coverage (Hypothesis Check)**:
  - "Note: Auto-repair covers AWS (Security Groups and IAM policies) and Azure NSG only. Auto-repair is currently unsupported for GCP resources and Azure Governance Policies." | Source: `README.md:37`.
  - "Auto-repair is currently unsupported for ARM JSON templates (HCL format-preserving AST deletion only)." | Source: `cli/main.py:172-173`, `PROJECT_STATUS.md:49`.
  - Owner's hypothesis confirmed: Auto-repair covers AWS Security Groups, AWS IAM policies, and Azure NSG only; candidates in `solver/repair.py:227-240` only evaluate `aws_security_group`, `aws_iam_*`, and `azurerm_network_security_group`. | Source: `solver/repair.py:227-240`.
- **Scope Inheritance Benchmark Limitation**: Scope inheritance (management group overrides/exemptions) has zero real-world open-source coverage in public vulnerable repos and is documented as a permanent corpus limitation. | Source: `PROJECT_STATUS.md:27`, `docs/azure_governance_benchmark_design.md:13`.
- **Active Directory Group Fail-Closed Gating**: Assignments using `azuread_group` or `azuread_group_member` principals route to `UNRESOLVABLE` status because static group expansion requires runtime Microsoft Graph API calls. | Source: `PROJECT_STATUS.md:41`.
- **IAM Wildcard Pattern Matching Scope Boundary (v1)**: True mid-string wildcards (`s3:Get*Object`), prefix/middle globs (`arn:aws:s3:::*-logs`), or pattern wildcards (`?`, `[...]`) fail closed by returning `Unresolved` sentinel. | Source: `README.md:65-66`.
- **Account-ID Scope Boundary**: Static HCL resolution extracts and matches role targets via role resource names/ARNs; account-ID cross-validation across static roles is an accepted, documented limitation of static analysis. | Source: `README.md:71`.
- **Bounded Unreachability**: Complete proofs (`UNSAT`) are guaranteed only when `role_count <= configured_cap`. For graphs exceeding the hop cap, non-reachability within $k$ steps is reported as `UNSAT_BOUNDED`. | Source: `README.md:72`, `PROJECT_STATUS.md:46`.
- **ARM Dynamic Function & `copy` Loop Fail-Closed Gating**: Expressions containing unresolved dynamic runtime functions (`resourceId()`, `reference()`) or unsupported `copy` iteration loops evaluate to `Unresolved` and yield `UNRESOLVABLE` status. Direct Bicep `.bicep` parsing is explicitly deferred (requires pre-transpilation to ARM JSON). | Source: `README.md:22`, `PROJECT_STATUS.md:49-50`.
- **GCP `serviceAccountUser` vs `TokenCreator` Modeling Simplification**: `roles/iam.serviceAccountUser` is modeled directly as a reachability edge to the target service account, abstracting intermediate compute-attachment step. | Source: `PROJECT_STATUS.md:54`, `docs/adr/0001_azure_depth_vs_gcp_breadth.md:145`.
- **CI Test Coverage Gate Disparity**: Line coverage is 88% overall across 276 tests, but 81% source-only; CI gate (`--cov=. --cov-fail-under=85`) counts test files; a source-only gate at 85% would currently fail. | Source: `README.md:78`, `PROJECT_STATUS.md:33`.

---

## 4. Z3 Outcome States and UNKNOWN Handling

- **Formal Outcome States Used by Engine**: `status: str # "SAT" | "UNSAT" | "UNSAT_BOUNDED" | "UNKNOWN" | "UNRESOLVABLE"`. | Source: `solver/engine.py:57, 60`.
- **Internal Timeout State Distinction**: When `z3.Solver.check()` returns `z3.unknown`, engine inspects `solver.reason_unknown()`: `status = "TIMEOUT" if is_timeout else "UNKNOWN"` where `is_timeout = reason in ("timeout", "interrupted", "canceled")`. | Source: `solver/engine.py:438, 549-551, 716-718, 849-851, 939-941, 1100-1102`.
- **CLI Handling of UNKNOWN**:
  - `elif res_eval.status in ("UNRESOLVABLE", "UNKNOWN"): has_unresolvable = True` | Source: `cli/main.py:117-118`.
  - `if has_unresolvable: return 2` | Source: `cli/main.py:156-157`.
  - Verdict: CLI maps `UNKNOWN` (and `UNRESOLVABLE`) to exit code 2 (Engine Exception / Unresolvable Dependency). `UNKNOWN` is never treated as safe (exit code 0).
- **Admission Webhook Handling of UNKNOWN**:
  - `elif res.status in ("SAT", "UNRESOLVABLE", "UNKNOWN"): is_safe = False` | Source: `cli/webhook.py:102-103`.
  - Verdict: Webhook rejects deployment admission if verification status is `UNKNOWN`. It is never treated as safe.
- **Unit Test Assertion for UNKNOWN**:
  - `assert ver_res.status in ("UNKNOWN", "TIMEOUT")` | Source: `tests/test_unknown_outcome.py:27`.

---

## 5. CLI Commands

- **Verify a Directory or File**:
  `python -m cli.main verify <path>` | Source: `cli/main.py:213-214, 227-229`.
- **Verify and Print Witness Trace in JSON**:
  `python -m cli.main verify <path> --json` | Source: `cli/main.py:135-141, 215`.
- **Verify and Export SMT Proof Certificate**:
  `python -m cli.main verify <path> --export-certificate <cert_path.json>` | Source: `cli/main.py:128-132, 216`.
- **Auto-Repair Vulnerable Resource and Print Minimal-Fix Diff**:
  `python -m cli.main repair <path> --resource <resource_address> --pattern <SG_OVER_EXPOSURE|IAM_WILDCARD_ALLOW|PRIVILEGE_ESCALATION_PATH>` | Source: `cli/main.py:183-195, 219-224, 230-232`.
- **Auto-Repair with Structured JSON (Initial/Reverified Certificates and Patch)**:
  `python -m cli.main repair <path> --resource <resource_address> --pattern <pattern> --json` | Source: `cli/main.py:180-182, 223`.
