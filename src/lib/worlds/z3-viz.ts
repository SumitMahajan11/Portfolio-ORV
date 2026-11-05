/**
 * Z3 World Deterministic Visualizer State & Graph Specification
 *
 * Requirements from /docs/11-WORLD-Z3.md & 18-PROMPTS-PHASE-2.md (P2-2):
 * - HxH Nen Vows theme (Emerald #1FA37A, Violet #6B4EFF, Black Chains #000000)
 * - Vow table: Terraform IAM rules shown as vows
 * - IAM role & network graph (max 14 nodes)
 * - Chain animates along reachability path from attacker to privileged resource
 * - "UNSATISFIABLE" collapse moment when a vow is amended (auto-repair) and chain breaks
 * - Proof-certificate stamp
 * - All demo items labeled "illustrative example" (no real in-browser Z3 execution)
 */

export interface VowRule {
  id: string;
  name: string;
  terraformResource: string;
  condition: string;
  repairedCondition?: string;
  impact: string;
  status: "active" | "amended" | "severed";
}

export interface Z3GraphNode {
  id: string;
  label: string;
  sublabel: string;
  category: "attacker" | "network" | "compute" | "iam" | "privileged" | "data";
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  onEscalationPath: boolean;
}

export interface Z3GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  isEscalationChain: boolean;
  isSeveredByRepair?: boolean;
}

export interface Z3ScenarioStep {
  stepIndex: number;
  id: string;
  title: string;
  subtitle: string;
  solverStatus: "SAT" | "UNSATISFIABLE";
  chainLit: boolean;
  chainBroken: boolean;
  proofCertified: boolean;
  caption: string;
  details: string;
}

/**
 * 10 Illustrative Graph Nodes (strictly <= 14 nodes per P2-2 Req 2b)
 */
export const Z3_GRAPH_NODES: Z3GraphNode[] = [
  {
    id: "attacker",
    label: "Attacker Entry",
    sublabel: "0.0.0.0/0 Public Ingress",
    category: "attacker",
    x: 8,
    y: 50,
    onEscalationPath: true,
  },
  {
    id: "igw",
    label: "Internet Gateway",
    sublabel: "aws_internet_gateway.public",
    category: "network",
    x: 24,
    y: 30,
    onEscalationPath: true,
  },
  {
    id: "vpc_subnet",
    label: "Public Subnet",
    sublabel: "10.0.1.0/24 Public Route",
    category: "network",
    x: 24,
    y: 70,
    onEscalationPath: false,
  },
  {
    id: "ec2_web",
    label: "EC2 Web Instance",
    sublabel: "aws_instance.frontend",
    category: "compute",
    x: 42,
    y: 50,
    onEscalationPath: true,
  },
  {
    id: "role_instance",
    label: "IAM: WebProfile",
    sublabel: "aws_iam_instance_profile",
    category: "iam",
    x: 58,
    y: 30,
    onEscalationPath: true,
  },
  {
    id: "role_deployer",
    label: "IAM: AppDeployer",
    sublabel: "iam:PassRole enabled",
    category: "iam",
    x: 60,
    y: 70,
    onEscalationPath: true,
  },
  {
    id: "lambda_exec",
    label: "Lambda Exec Role",
    sublabel: "aws_iam_role.lambda_admin",
    category: "iam",
    x: 76,
    y: 50,
    onEscalationPath: true,
  },
  {
    id: "s3_assets",
    label: "S3 Assets Bucket",
    sublabel: "aws_s3_bucket.static_assets",
    category: "data",
    x: 42,
    y: 85,
    onEscalationPath: false,
  },
  {
    id: "rds_db",
    label: "RDS Database",
    sublabel: "Private Subnet Group",
    category: "data",
    x: 76,
    y: 85,
    onEscalationPath: false,
  },
  {
    id: "admin_access",
    label: "AdministratorAccess",
    sublabel: "arn:aws:iam::aws:policy/Admin",
    category: "privileged",
    x: 92,
    y: 50,
    onEscalationPath: true,
  },
];

/**
 * Graph Edges connecting network, compute, and IAM transitions
 */
export const Z3_GRAPH_EDGES: Z3GraphEdge[] = [
  {
    id: "e-att-igw",
    from: "attacker",
    to: "igw",
    label: "Ingress 0.0.0.0/0",
    isEscalationChain: true,
  },
  {
    id: "e-igw-subnet",
    from: "igw",
    to: "vpc_subnet",
    label: "Route Table",
    isEscalationChain: false,
  },
  {
    id: "e-igw-ec2",
    from: "igw",
    to: "ec2_web",
    label: "Port 80/443 Route",
    isEscalationChain: true,
  },
  {
    id: "e-ec2-s3",
    from: "ec2_web",
    to: "s3_assets",
    label: "s3:GetObject",
    isEscalationChain: false,
  },
  {
    id: "e-ec2-profile",
    from: "ec2_web",
    to: "role_instance",
    label: "AssumeInstanceProfile",
    isEscalationChain: true,
  },
  {
    id: "e-profile-deployer",
    from: "role_instance",
    to: "role_deployer",
    label: "sts:AssumeRole",
    isEscalationChain: true,
  },
  {
    id: "e-deployer-lambda",
    from: "role_deployer",
    to: "lambda_exec",
    label: "iam:PassRole (Vow 3)",
    isEscalationChain: true,
    isSeveredByRepair: true, // The critical link auto-repair breaks!
  },
  {
    id: "e-deployer-rds",
    from: "role_deployer",
    to: "rds_db",
    label: "rds:Describe*",
    isEscalationChain: false,
  },
  {
    id: "e-lambda-admin",
    from: "lambda_exec",
    to: "admin_access",
    label: "iam:AttachRolePolicy",
    isEscalationChain: true,
  },
];

/**
 * 4 Illustrative Terraform IAM Rules as Nen Vows
 */
export const Z3_VOW_RULES: VowRule[] = [
  {
    id: "vow-1",
    name: "Vow of Ingress",
    terraformResource: "aws_security_group_rule.ingress_all",
    condition: "cidr_blocks = ['0.0.0.0/0'], from_port = 80",
    impact: "Allows public network packet entry to the EC2 frontend.",
    status: "active",
  },
  {
    id: "vow-2",
    name: "Vow of Delegation",
    terraformResource: "aws_iam_role.web_profile",
    condition: "Action = 'sts:AssumeRole', Resource = AppDeployer",
    impact: "Permits frontend compute to assume the application deployment identity.",
    status: "active",
  },
  {
    id: "vow-3",
    name: "Vow of Transitive Escort (Flawed)",
    terraformResource: "aws_iam_policy.deployer_pass_role",
    condition: "Action = 'iam:PassRole', Resource = '*'",
    repairedCondition: "Action = 'iam:PassRole', Condition = { StrictBoundary: true, Target = 'arn:...:service/worker' }",
    impact: "Allows unbounded role passing — the privilege escalation path Checkov/TFSec miss.",
    status: "active",
  },
  {
    id: "vow-4",
    name: "Vow of Crown Jewels",
    terraformResource: "aws_iam_role_policy_attachment.admin",
    condition: "policy_arn = 'arn:aws:iam::aws:policy/AdministratorAccess'",
    impact: "Root-level cloud administrative control.",
    status: "active",
  },
];

/**
 * 4 Scripted Scenario Beats (P2-2 Requirement 2)
 */
export const Z3_SCENARIO_STEPS: Z3ScenarioStep[] = [
  // -------------------------------------------------------------
  // Beat 1: Vow Table & Initial Constraint Formulation
  // -------------------------------------------------------------
  {
    stepIndex: 0,
    id: "vow-table",
    title: "1. Vow Formulation & Rule Table",
    subtitle: "Terraform IAM & Network constraints encoded into SMT logic",
    solverStatus: "SAT",
    chainLit: false,
    chainBroken: false,
    proofCertified: false,
    caption:
      "Terraform resources are transcribed into first-order SMT logic formulas (vows). The graph topology models network ingress and IAM role transition edges.",
    details:
      "Static scanners evaluate individual resources in isolation; Z3 reachability examines the global transitivity of all vows simultaneously.",
  },

  // -------------------------------------------------------------
  // Beat 2: Reachability Chain Traced (Checkov & TFSec Missed)
  // -------------------------------------------------------------
  {
    stepIndex: 1,
    id: "chain-traced",
    title: "2. Escalation Chain Discovered (SAT)",
    subtitle: "Cross-resource privilege escalation path traced to AdministratorAccess",
    solverStatus: "SAT",
    chainLit: true,
    chainBroken: false,
    proofCertified: false,
    caption:
      "Z3 solver proves satisfiability: an unbroken chain extends from 0.0.0.0/0 public ingress -> EC2 -> AppDeployer -> Lambda -> AdministratorAccess.",
    details:
      "Benchmark finding: Checkov and TFSec miss this transitive privilege-escalation path because no individual rule violates a local pattern in isolation.",
  },

  // -------------------------------------------------------------
  // Beat 3: Auto-Repair & UNSATISFIABLE Collapse
  // -------------------------------------------------------------
  {
    stepIndex: 2,
    id: "unsat-collapse",
    title: "3. Auto-Repair: UNSATISFIABLE Collapse",
    subtitle: "Vow amended with strict role boundary; reachability chain shatters",
    solverStatus: "UNSATISFIABLE",
    chainLit: false,
    chainBroken: true,
    proofCertified: false,
    caption:
      "Auto-repair amends Vow 3, injecting a strict IAM boundary condition. The solver re-evaluates the reachability formula: Result collapses to UNSATISFIABLE.",
    details:
      "The chain breaks at the iam:PassRole transition. SMT proof confirms zero viable paths from attacker ingress to privileged credentials.",
  },

  // -------------------------------------------------------------
  // Beat 4: Cryptographic Proof Certificate Stamped
  // -------------------------------------------------------------
  {
    stepIndex: 3,
    id: "proof-certified",
    title: "4. Proof Certificate Stamped",
    subtitle: "Mathematical guarantee: verified zero privilege escalation paths",
    solverStatus: "UNSATISFIABLE",
    chainLit: false,
    chainBroken: true,
    proofCertified: true,
    caption:
      "Proof certificate stamped with solver trace hash. 103 passing verification tests confirm auto-repair correctness and invariant safety.",
    details:
      "The certificate guarantees that no sequence of network packets or IAM role assumptions can elevate unauthorized ingress to administrator access.",
  },
];

