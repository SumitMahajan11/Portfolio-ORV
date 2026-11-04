# 11 World: iac-verifier (Z3) as Hunter x Hunter: Nen Vows

Phase: 2. Palette: z3. Biyoo costume: chain bracelet.

## Story mapping
Constraints = vows and conditions. A satisfiable set of vows holds. An unsatisfiable set collapses ("UNSATISFIABLE"). Reachability proof = tracing a chain from attacker to a privileged resource.

## Beats
1. Vow table: Terraform IAM rules shown as vows.
2. Graph of IAM roles and network edges; Z3 chain searches for a path.
3. Privilege-escalation path found (chain lights up), one that Checkov and TFSec miss (per README benchmark).
4. Auto-repair: a vow is amended, chain breaks, proof certificate stamped.
5. Proof: 103 passing tests, benchmark link, repo link.

## Pre-launch
Clean repo root (tfsec.exe, scratch/, checkov_*.json) before this world goes live.

## Done when
Demo graph is a faithful simplified example (labeled "illustrative example" unless it is a real output from the repo), claims match 03.
