/**
 * Z3 World Visualizer Data & Types
 * Rebuilt strictly from real recorded tool output (commit 6ed26e409270f296a2ecb7a1b3d01e0689ade954, 2026-11-08)
 * Theme: Hunter x Hunter Nen Vows / SMT Constraints
 */

import {
  Z3_RECORDED_METADATA,
  RECORDED_CONFIG_EXCERPT,
  RECORDED_SAT_WITNESS,
  RECORDED_AUTO_REPAIR,
  RECORDED_FAIL_CLOSED,
  RECORDED_PROOF_CERTIFICATE,
  type HopTrace,
} from "@/content/z3-recorded";

export interface Z3BeatInfo {
  beat: number;
  title: string;
  subtitle: string;
  verdictLabel: string;
  verdictColor: string;
  summary: string;
  sourceRef: string;
}

export interface WitnessGraphNode {
  id: string;
  name: string;
  roleType: "entry" | "role" | "target";
  sublabel: string;
  arnOrAddress: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  trustSummary: string;
}

export interface WitnessGraphEdge {
  id: string;
  from: string;
  to: string;
  action: string;
  statement: string;
}

export const Z3_BEATS: Z3BeatInfo[] = [
  {
    beat: 1,
    title: "1. The Question & Real HCL Config",
    subtitle: "Can an external untrusted account escalate to AdministratorAccess?",
    verdictLabel: "UNCHECKED",
    verdictColor: "#9CA3AF",
    summary:
      "A real Terraform configuration (fixtures/phase3/chained_escalation.tf) defines multiple IAM roles and attached policies. Static linters checking individual blocks in isolation miss transitive assumption chains.",
    sourceRef: RECORDED_CONFIG_EXCERPT.sourceFile,
  },
  {
    beat: 2,
    title: "2. SAT Witness Graph",
    subtitle: "SMT solver extracts shortest 2-hop privilege escalation path",
    verdictLabel: "SAT (VULNERABLE)",
    verdictColor: "#EF4444",
    summary:
      "Z3 proves satisfiability of the reachability formula: account:111122223333 assumes jump_role via trust policy, and jump_role's identity policy allows sts:AssumeRole into target_role (AdministratorAccess).",
    sourceRef: RECORDED_SAT_WITNESS.sourceFile,
  },
  {
    beat: 3,
    title: "3. Auto-Repair & Unified Diff",
    subtitle: "Minimal subset deletion via Lark AST repair eliminates multi-rule exposure",
    verdictLabel: "REMEDIATED_MINIMAL",
    verdictColor: "#1FA37A",
    summary:
      "Evaluated on multi_rule_vulnerability.tf: deleting only one open-SSH ingress block leaves the security group in SAT. The engine computes the minimal subset (both rules deleted simultaneously) and outputs a format-preserving unified diff patch.",
    sourceRef: RECORDED_AUTO_REPAIR.sourceFile,
  },
  {
    beat: 4,
    title: "4. Fail-Closed Posture",
    subtitle: "SMT UNKNOWN and UNRESOLVABLE states are never treated as safe",
    verdictLabel: "FAIL CLOSED",
    verdictColor: "#F59E0B",
    summary:
      "In formal verification, solver timeouts, quantifier incompleteness (UNKNOWN), or dynamic template functions (UNRESOLVABLE) must never pass. The CLI exits with code 2, and the Kubernetes admission webhook immediately rejects deployment.",
    sourceRef: RECORDED_FAIL_CLOSED.sourceFile,
  },
  {
    beat: 5,
    title: "5. Proof Certificate & Verified Limitations",
    subtitle: "Authentic Z3 proof object excerpt, empirical limitations, and links",
    verdictLabel: "UNSAT (SAFE)",
    verdictColor: "#10B981",
    summary:
      "Safe invariant proven by genuine Z3 proof object. Verified against 276 passing tests with full transparent disclosure of TerraGoat GCP and multi-cloud validation boundaries.",
    sourceRef: RECORDED_PROOF_CERTIFICATE.sourceFile,
  },
];

/**
 * Witness graph nodes derived directly from RECORDED_SAT_WITNESS.hops
 */
export const WITNESS_GRAPH_NODES: WitnessGraphNode[] = [
  {
    id: "account:111122223333",
    name: "External Entry Point",
    roleType: "entry",
    sublabel: "arn:aws:iam::111122223333:root",
    arnOrAddress: "account:111122223333",
    x: 12,
    y: 50,
    trustSummary: "Untrusted external account identity anchor",
  },
  {
    id: "aws_iam_role.jump_role",
    name: "aws_iam_role.jump_role",
    roleType: "role",
    sublabel: "Middle Delegation Hop",
    arnOrAddress: "aws_iam_role.jump_role",
    x: 50,
    y: 50,
    trustSummary: "Trusts 111122223333:root; identity policy grants sts:AssumeRole to target_role",
  },
  {
    id: "aws_iam_role.target_role",
    name: "aws_iam_role.target_role",
    roleType: "target",
    sublabel: "AdministratorAccess",
    arnOrAddress: "aws_iam_role.target_role",
    x: 88,
    y: 50,
    trustSummary: "Trusts jump_role; identity policy grants Action: '*', Resource: '*'",
  },
];

export const WITNESS_GRAPH_EDGES: WitnessGraphEdge[] = [
  {
    id: "hop-1",
    from: "account:111122223333",
    to: "aws_iam_role.jump_role",
    action: "sts:AssumeRole",
    statement: "Trust policy allows arn:aws:iam::111122223333:root",
  },
  {
    id: "hop-2",
    from: "aws_iam_role.jump_role",
    to: "aws_iam_role.target_role",
    action: "sts:AssumeRole",
    statement: "Attached policy allows sts:AssumeRole on role/target_role",
  },
];

export {
  Z3_RECORDED_METADATA,
  RECORDED_CONFIG_EXCERPT,
  RECORDED_SAT_WITNESS,
  RECORDED_AUTO_REPAIR,
  RECORDED_FAIL_CLOSED,
  RECORDED_PROOF_CERTIFICATE,
};
export type { HopTrace };
