# Efeonce Experience LaunchOps — Security & Threat Model V1

> **Status:** Proposed / pilot gate
> **Date:** 2026-07-26
> **Owner:** Architecture + Security/Privacy + Wave

## 1. Security objective

Permit faster, governed digital launches without expanding a client’s attack surface or allowing an agent to turn
content access into unauthorized publication, data disclosure or control bypass.

This is a design threat model, not a security certification or penetration-test result.

## 2. Trust boundaries

1. Client identity and approval authority.
2. Efeonce/Wave operator and delivery workspace.
3. Launch Control Plane and tenant data.
4. Agent/model provider boundary.
5. MCP/tool and adapter boundary.
6. Client CMS/runtime, analytics and CRM destinations.
7. Evidence, logs, secrets and cloud control plane.

No model or browser surface may directly hold provider credentials or bypass the server-side capability boundary.

## 3. Primary threats and controls

| Threat | Required controls |
| --- | --- |
| Prompt injection in client content | Treat external content as data, tool allowlists, content isolation, human approval |
| Data exfiltration through agent/tool | Tenant-scoped tools, output filtering, least privilege, redaction and egress policy |
| Unauthorized publish | Separate propose/approve/execute, scoped entitlements, dual approval by risk class |
| Stolen provider credential | Secret manager, short-lived tokens where possible, rotation, no frontend exposure |
| Cross-tenant leakage | Tenant keys/scopes, query guards, tests, separate evidence references and access reviews |
| Malicious/incorrect CMS mutation | Typed commands, previews, allowlisted fields, idempotency, audit and rollback |
| Supply-chain compromise | Pin/review dependencies, signed builds/artifact provenance, adapter ownership and vulnerability process |
| Log/evidence leakage | PII/secret redaction, retention policy, access controls and export audit |
| Model hallucinated compliance | Controls require source/policy reference and human/legal authority; unknown is not pass |
| Denial or provider outage | Timeouts, retries with limits, circuit breakers, manual fallback and honest degraded state |

## 4. Identity and authorization

Authorization must answer both:

- **View:** may this actor see the launch, artifact, evidence or client data?
- **Entitlement:** may this actor propose, review, approve, publish, rollback, configure policy or export evidence?

Scope includes tenant, client, site, market, environment, launch class and action. Revoked/expired roles never grant
access. Client approval is separate from Wave delivery access.

## 5. Agent controls

- Tool registry with schemas, capabilities, environment and risk class.
- Budget, timeout, rate and data-scope limits per run.
- Model/provider inventory and version pinning.
- Prompt/context provenance and output classification.
- Kill switch per agent, tool, tenant and environment.
- Evaluation set for unauthorized action, leakage, policy refusal and wrong-state reporting.
- Human confirmation for material mutation and every production release in V1.

## 6. Security acceptance gates

- Threat model reviewed by Security/Privacy owner.
- Tenant and entitlement tests exist.
- Secrets path and rotation owner are defined.
- External requests are signed/authenticated and replay-protected.
- Logs are redacted and evidence retention is approved.
- Dependency, image and IaC scans have owners and remediation policy.
- Incident path and kill switch are tested in a non-production environment.
