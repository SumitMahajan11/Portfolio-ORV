# TASK 0 Resolution: Auto-Repair Scope in `iac-verifier`

## 1. Resolution Question
FACTS.md lists auto-repair coverage as AWS SG/IAM + Azure NSG; owner notes shorthand stated SG/NSG only; the previous audit assumed IAM repair was out of scope. What does the real tool in `D:\Projects\Cloud3\solver\repair.py` actually cover?

## 2. Literal Code Evidence from `D:\Projects\Cloud3\solver\repair.py`

### Step 1: Initial Verification Dispatch (`solver/repair.py:160-208`)
```python
        # Step 1: Initial Verification
        if pattern == "SG_OVER_EXPOSURE":
            target_res = graph.resources.get(resource_address)
            if not target_res:
                return RemediationResult(...)
            initial_res = self.engine.verify_security_group(target_res)
        elif pattern == "IAM_WILDCARD_ALLOW":
            target_res = graph.resources.get(resource_address)
            if not target_res:
                return RemediationResult(...)
            initial_res = self.engine.verify_iam_policy(target_res)
        elif pattern == "NSG_OVER_EXPOSURE":
            target_res = graph.resources.get(resource_address)
            if not target_res:
                return RemediationResult(...)
            initial_res = self.engine.verify_azure_nsg(target_res)
        elif pattern == "PRIVILEGE_ESCALATION_REACHABILITY":
            initial_res = self.engine.verify_privilege_escalation(
                graph, target_resource=resource_address
            )
        else:
            return RemediationResult(...)
```

### Step 2: Collection of Candidate Deletion Tuples (`solver/repair.py:227-240`)
```python
        # Step 2: Collect Candidate Rules
        if pattern in ("SG_OVER_EXPOSURE", "IAM_WILDCARD_ALLOW", "NSG_OVER_EXPOSURE"):
            target_res = graph.resources[resource_address]
            candidate_tuples = [
                (resource_address, idx, rule)
                for idx, rule in enumerate(target_res.rule_sources)
            ]
        else:
            # For graph-level privilege escalation, candidates are rules across all IAM resources
            candidate_tuples = []
            for addr, res in sorted(graph.resources.items()):
                if res.type in ("aws_iam_role", "aws_iam_policy", "aws_iam_role_policy", "aws_iam_user_policy", "aws_iam_group_policy"):
                    for idx, rule in enumerate(res.rule_sources):
                        candidate_tuples.append((addr, idx, rule))
```

### Step 3: Re-Verification of Pruned Graph (`solver/repair.py:338-354`)
```python
        if pattern == "SG_OVER_EXPOSURE":
            final_ver = self.engine.verify_security_group(
                final_graph.resources[resource_address]
            )
        elif pattern == "NSG_OVER_EXPOSURE":
            final_ver = self.engine.verify_azure_nsg(
                final_graph.resources[resource_address]
            )
        elif pattern == "IAM_WILDCARD_ALLOW":
            final_ver = self.engine.verify_iam_policy(
                final_graph.resources[resource_address]
            )
        else:
            final_ver = self.engine.verify_privilege_escalation(
                final_graph, target_resource=resource_address
            )
```

### Step 4: UNSAT-Core Candidate Filtering (`solver/repair.py:417-438`)
```python
        core_candidates = []
        for addr, idx, rule in candidates:
            is_in_core = False
            if pattern == "SG_OVER_EXPOSURE" and isinstance(rule, SecurityGroupRule):
                if rule.direction.lower() in ("ingress", "egress") and is_port_sensitive(
                    rule.from_port, rule.to_port
                ):
                    if any(not is_cidr_private(c) for c in rule.cidr_blocks):
                        is_in_core = True
            elif pattern == "IAM_WILDCARD_ALLOW" and isinstance(rule, IamPolicyStatement):
                if rule.effect.lower() == "allow":
                    if any(is_full_wildcard_action(a) for a in rule.actions) or any(
                        is_full_wildcard_resource(r) for r in rule.resources
                    ):
                        is_in_core = True
            elif pattern == "PRIVILEGE_ESCALATION_PATH" and isinstance(rule, IamPolicyStatement):
                if rule.effect.lower() == "allow":
                    is_in_core = True
            else:
                is_in_core = True

            if is_in_core:
                core_candidates.append((addr, idx, rule))
```

## 3. Committed Documentation Confirmation

`D:\Projects\Cloud3\README.md:37`:
> `"Note: Auto-repair covers AWS (Security Groups and IAM policies) and Azure NSG only. Auto-repair is currently unsupported for GCP resources and Azure Governance Policies."`

`D:\Projects\Cloud3\cli\main.py:171-173`:
> `"Auto-repair is currently unsupported for ARM JSON templates (HCL format-preserving AST deletion only)."`

## 4. Definitive Verdict & Why the Prior Misunderstanding Occurred

1. **Exact Supported Scope**:
   The auto-repair engine performs **format-preserving Lark AST deletion** of minimal rule/statement subsets to break UNSAT violations. It supports:
   - **AWS Security Groups** (`SG_OVER_EXPOSURE`: ingress/egress rules)
   - **AWS IAM Policies & Roles** (`IAM_WILDCARD_ALLOW` and `PRIVILEGE_ESCALATION_PATH`: policy statements & role policy attachments)
   - **Azure Network Security Groups** (`NSG_OVER_EXPOSURE`: security rules)

2. **Why the Audit Flagged a Mismatch**:
   The old visualizer mock (`z3-viz.ts`) depicted auto-repair as **synthesizing new IAM conditions** (`Condition = { StrictBoundary: true, Target = ... }`). The real engine does NOT synthesize new IAM conditions or rewrite permissions constructively; it strictly deletes the minimal subset of statements causing satisfiability.

3. **Unsupported Scope**:
   - GCP resources (unsupported)
   - Azure Governance Policies (unsupported)
   - Native ARM JSON templates (unsupported; HCL AST deletion only)
   - IAM condition synthesis (unsupported; deletion-based only)

All on-page text in the rebuilt Z3 world uses ONLY this resolved scope.

