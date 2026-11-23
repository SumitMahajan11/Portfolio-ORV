# 11 World: iac-verifier (Z3) as Hunter x Hunter: Nen Vows

Phase: 2. Palette: z3. Biyoo costume: chain bracelet.

## Story mapping
Constraints = vows and conditions. A satisfiable set of vows holds ("SAT"). An unsatisfiable set collapses ("UNSATISFIABLE"). Reachability proof = tracing a transitive assumption chain from attacker to a privileged target role.

## Beats (Rebuilt from recorded real tool output, commit 6ed26e4, 2026-11-08)
1. The Question & Real Config: Can an external entity reach AdministratorAccess? Shows real fixture excerpt from chained_escalation.tf.
2. SAT Witness Graph: SMT reachability finds a 2-hop privilege escalation path (account:111122223333 -> jump_role -> target_role), with recorded hops and trust statements.
3. Auto-Repair & Unified Diff: Deletion-based minimal repair (REMEDIATED_MINIMAL) removes vulnerable multi-rule ingress, restoring UNSAT with the real recorded unified diff.
4. Fail-Closed Posture: SMT UNKNOWN and UNRESOLVABLE states are never treated as safe (exit code 2 / webhook rejection).
5. Proof Certificate & Limitations: Truncated real Z3 proof object excerpt, verified limitations (TerraGoat GCP, auto-repair scope), 276 passing tests, repo link.

## Pre-launch
Clean repo root (tfsec.exe, scratch/, checkov_*.json) before this world goes live.

## Done when
Every scene displays recorded output of the real tool with commit hash and date; no simulated or browser-computed verdicts; claims match 03.
