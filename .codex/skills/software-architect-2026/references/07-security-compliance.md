# Security and Compliance

This reference is loaded for the Step 6 self-critique pass on every design, and deeper when handling PII, financial data, health data, or any regulated data. In 2026, security is non-negotiable; the new dimension is that AI agents have permission-hungry profiles and need defense-in-depth treatment.

The principle: **assume breach**. Design so that when (not if) something fails, the blast radius is bounded and the failure is observable.

## The 2026 baseline (zero-trust applied)

Tech Radar Vol 34 elevated zero-trust architecture from "consider" to "non-negotiable". The principles:

1. **Never trust, always verify**: every request carries identity and is authorized at the boundary it crosses
2. **Identity-based**: services and users have identities; trust flows from identity, not network position
3. **Least privilege**: every actor has the minimum permission required for the task
4. **Defense in depth**: assume any single layer can fail; design for multiple barriers

This applies equally to humans, services, and AI agents.

## Authentication (AuthN)

**Default for B2B SaaS**: OAuth 2.0 + OIDC for users; mTLS or signed JWT for service-to-service.

| Pattern | Use when |
|---|---|
| **OIDC with auth provider** (Auth0, Clerk, WorkOS, Stytch, Cognito) | Default for new B2B; enterprise needs SSO/SAML |
| **NextAuth / Auth.js** | Self-hosted, control over user store, Next.js apps |
| **Magic links / passwordless** | Reduce password handling; good UX; combine with WebAuthn for a path to passkeys |
| **Passkeys (WebAuthn)** | The 2026 default for new consumer apps; phishing-resistant |
| **API keys** | Service-to-service when JWT is too heavy; rotate regularly |
| **mTLS** | High-security service-to-service; complex to operate |

**Anti-patterns**:
- Storing passwords yourself unless you absolutely must
- JWT in localStorage (XSS-exfiltratable) — prefer httpOnly cookies
- Long-lived JWTs without rotation
- Static secrets in env vars without rotation policy

### Multi-factor authentication

Required for any system handling: financial data, PII at scale, admin access, or regulated data. The 2026 ranking by phishing resistance:

1. **Hardware security keys (FIDO2 / WebAuthn)** — most resistant; expensive to deploy widely
2. **Passkeys** — same protocol; better UX
3. **TOTP (Authenticator app)** — phishable but better than nothing
4. **SMS** — phishable, SIM-swappable; deprecating in security-critical contexts

### Session management

- Idle timeout: 30 min - 8 hours depending on context
- Absolute timeout: 8-24 hours
- Refresh tokens: 30-90 days, rotated on use
- Session invalidation on password change, suspicious activity
- Audit log of session events

## Authorization (AuthZ)

**Default**: RBAC (role-based access control) for most B2B SaaS. ABAC (attribute-based) when policies are dynamic. ReBAC (relationship-based) for graph-shaped permissions.

### RBAC

Users have roles; roles have permissions. Standard for most B2B SaaS.

```
User (alice@acme.com) → Roles (admin, billing) → Permissions (users:read, orders:write)
```

Implementation: store roles and permissions in the database; check at the resource layer.

### Per-tenant RBAC

In multi-tenant systems, roles are scoped to tenants:

```
User (alice) is admin of Tenant A, billing of Tenant B, no access to Tenant C
```

The permission check answers two questions: "Can alice access tenant T?" and "Can alice's role in T do action X?"

### Attribute-based (ABAC)

Permissions depend on attributes of the user, resource, and environment ("can edit if document is in `draft` status AND user is owner OR user has `editor` role"). More flexible but harder to reason about.

Tools: OpenFGA, Permify, OPA (Open Policy Agent), Cerbos.

### Relationship-based (ReBAC)

Permissions follow graph relationships ("can edit if user is in the project, project belongs to org, org's plan allows editing"). The Google Zanzibar pattern, popularized by Auth0 FGA / OpenFGA.

Use when permissions follow a graph naturally (folders, teams, hierarchies).

### Audit and revocability

Every authz check that grants access to a sensitive resource should be auditable. The pattern:

- Log every grant decision with: user, resource, action, outcome, timestamp
- Make grants revocable: a token, a session, a role can be invalidated by an admin
- Periodic permission review: roles drift over time; review who has what

## Secrets management

Secrets must never be in:
- Source code
- Environment variables in plaintext outside dev
- Logs
- Error messages or HTTP response bodies
- Frontend bundles (this still happens)

**The right places**:

| Tool | Use when |
|---|---|
| **Cloud-native** (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) | Default within a cloud |
| **HashiCorp Vault** | Multi-cloud or self-hosted |
| **1Password / Doppler / Infisical** | Smaller teams, developer-friendly |
| **SOPS + age/PGP** | Git-storable encrypted secrets for IaC |

**Rotation**: every secret has a rotation policy. The most common: short-lived (hours/days) for service-to-service via dynamic credentials; quarterly for human-managed; annually for the deeply embedded ones.

**Detection**: scan repos for accidentally committed secrets. Tools: trufflehog, gitleaks, GitHub secret scanning.

## Data classification

Most security failures trace back to confusion about what data is sensitive. Define classes:

| Class | Examples | Handling |
|---|---|---|
| **Public** | Marketing copy, public docs | No special controls |
| **Internal** | Internal documents, system logs | Access controlled to employees |
| **Confidential** | Customer data, business secrets | RBAC, encrypted, audit logged |
| **Restricted (PII / regulated)** | Names, emails, addresses, identifiers | Encrypted at rest, access logged, retention policies |
| **Highly restricted (sensitive PII)** | SSN, health, financial, biometric | Encrypted, tokenized, access tightly controlled, audit retained |

Mark schema columns with classifications in dbt or your data catalog. Make it grep-able.

## Encryption

**At rest**:
- Disk encryption is table stakes (cloud providers handle by default)
- Application-level encryption for highly restricted data (encrypt before storing, decrypt at use)
- Key management: per-tenant keys for silo or bridge; shared keys with envelope encryption for pool

**In transit**:
- TLS 1.2+ everywhere (TLS 1.3 preferred)
- mTLS for service-to-service in zero-trust architectures
- HSTS headers; preload list for production domains

**Field-level encryption** for restricted fields:
- Use a KMS to manage keys
- Application encrypts before write, decrypts on read
- Search becomes harder (encrypted fields can't be indexed normally — use deterministic encryption or tokenization)

## Compliance frameworks

### GDPR (EU)

The fundamentals every system handling EU personal data needs:
- **Lawful basis**: consent, contract, legitimate interest, etc., per processing activity
- **Data subject rights**: access, rectification, erasure, portability, restriction
- **Data residency**: keep EU data in EU regions when required
- **Data Processing Agreement** with sub-processors
- **Breach notification**: 72 hours to supervisory authority
- **DPIA** (Data Protection Impact Assessment) for high-risk processing
- **DPO** for systematic large-scale processing

**Architectural implications**:
- Logical or physical region routing for tenant data
- Soft-delete with retention windows; hard-delete on user request
- Audit log of personal data accesses
- Export tooling for portability requests

### SOC 2 Type II

Service-organization controls audit. Type II = "and you actually do these controls over a period". Common for B2B SaaS targeting US enterprise customers.

**Architectural requirements**:
- Logical access controls (RBAC + audit)
- Change management (PR reviews, deployment approvals)
- Incident response process documented and tested
- Backup and DR documented and tested
- Vendor management (sub-processor reviews)
- Logical and physical security of infrastructure
- Encryption at rest and in transit
- Vulnerability management (regular scans, patching)

You don't need a separate stack for SOC 2 — you need processes documented and infrastructure that supports them.

### LGPD (Brasil)

Similar to GDPR. Same architectural patterns work. Specific points: data subject in Brazil with rights similar to GDPR; ANPD as the supervisory authority; significant fines.

### Ley 21.719 (Chile)

Chile's modern data protection law (in force from 2024-2025, with full implementation phasing through 2026-2027). Key points:

- Aligns Chile with GDPR-style framework — significant change from prior regime
- Establishes the **Agencia de Protección de Datos Personales** as supervisory authority
- Requires legal basis for processing, with consent or other legitimated grounds
- Data subject rights: access, rectification, deletion, portability, opposition
- Data protection officer required for some processing types
- Cross-border transfer rules: adequacy or specific safeguards
- Significant fines (up to 4% of revenue, similar to GDPR scale)

**For systems serving Chilean users**:
- Treat Chilean PII similarly to EU PII (GDPR-compatible posture covers most of it)
- Verify the latest implementation phase of the law (rules are still being issued)
- Cross-border transfer to non-adequate countries needs safeguards

### HIPAA (US health data)

Strict rules for Protected Health Information (PHI). Architectural implications:
- Business Associate Agreements (BAA) with cloud providers and sub-processors
- Encryption mandatory in most contexts
- Audit log of PHI access required, retained 6 years
- Breach notification within 60 days
- Specific access controls and minimum-necessary use

Don't take HIPAA on without a clear strategy. The compliance burden is significant.

### PCI DSS (payment cards)

If you handle cardholder data:
- The strong default in 2026: **don't**. Use Stripe / Adyen / Braintree, never see the card number directly
- If you do touch card data, the requirements are extensive (network segmentation, encryption, monitoring, audits)
- Tokenization at the payment provider eliminates most PCI scope

### EU AI Act

In force in stages through 2026. Key categories:
- **Prohibited AI**: social scoring, real-time remote biometric ID in public spaces (with narrow exceptions)
- **High-risk AI**: employment screening, credit scoring, critical infrastructure — extensive obligations (risk management, data governance, transparency, human oversight, robustness)
- **Limited-risk AI**: chatbots, deepfakes — disclosure obligations
- **General-purpose AI**: foundation model providers have transparency obligations

For systems with AI features, classify the use case and meet the obligations for that category.

## Threat modeling: STRIDE

Use STRIDE for any new feature or system:

| Threat | Question |
|---|---|
| **Spoofing** | Can someone pretend to be another user/service? |
| **Tampering** | Can someone modify data they shouldn't? |
| **Repudiation** | Can someone deny an action they took? |
| **Information disclosure** | Can someone read data they shouldn't? |
| **Denial of service** | Can someone make the system unavailable? |
| **Elevation of privilege** | Can someone gain access they shouldn't have? |

For each threat, list the mitigations. See `templates/threat-model-stride.md` for the structured template.

## AI-specific security concerns

Layered on top of normal security, AI features add:

### Prompt injection

Untrusted content (web pages, emails, file contents, user input) can contain instructions the LLM may follow. There is no perfect mitigation. Layer defenses:

- **Structural separation**: instructions in system prompt, data clearly framed as data
- **Strip or sandbox** untrusted content before showing to agent
- **Detect-and-confirm**: irreversible actions require user confirmation, with the action shown
- **Gateway-level injection detection**: commercial offerings exist
- **Output validation**: don't blindly execute LLM outputs

### Data exfiltration via LLM

An agent with broad data access plus untrusted content in context = potential leak channel. The agent can be tricked into "summarizing" private data into a URL it then fetches.

Mitigations:
- **Network egress controls**: agents can only call APIs they need, not arbitrary internet
- **No outbound URL fetching from agent context**: or strict allowlist
- **Output filtering**: scan outputs for things that look like exfiltration (encoded data, suspicious URLs)

### Permission scope creep for agents

Agents accumulate tool access over time. Audit:
- What tools can each agent call?
- What's the auth scope of each tool?
- When was the last time scopes were reviewed?

Apply least privilege ruthlessly. Agents almost never need write access to everything.

### Sandboxing for code-executing agents

Tech Radar Vol 34 highlights this as core: **never run agent-generated code in your production environment**. Use:

- **Ephemeral microVMs**: Sprites, Shuru, Firecracker
- **Containers with namespace isolation**: Dev Containers, gVisor
- **OS-level sandboxing**: Bubblewrap (Linux), sandbox-exec (macOS)

The blast radius of an agent that can `rm -rf` is unbounded; the blast radius in a sandbox is the sandbox.

### Cost as a security concern

A runaway LLM agent in a loop can spend thousands of dollars in minutes. This is a security concern, not just operational. Mitigations:

- **Per-workflow daily cost ceilings** with kill-switch
- **Per-tenant rate limits** at the gateway
- **Anomaly detection** on token / cost spikes

## Supply chain security

The 2026 baseline:

- **SBOM** (Software Bill of Materials) for production releases
- **Dependency pinning**: lockfiles committed; no unpinned `latest` in production
- **Renovate / Dependabot** for monitored updates
- **Vulnerability scanning** in CI: GitHub Advanced Security, Snyk, Trivy, Grype
- **OpenSSF Scorecards** to assess critical dependencies
- **Sigstore / cosign** for artifact signing where it matters

The npm/PyPI ecosystem has had multiple high-impact compromises through 2024-2026. Treat dependencies as untrusted code that you allow in.

## Security observability

What you can't see, you can't defend:

- **Auth events**: logins, failures, password changes, MFA enrollments
- **Authz events**: permission grants, denials, role changes
- **Data access events**: especially for restricted data
- **Anomalous behavior**: location changes, unusual hours, volume spikes
- **API errors and 4xx/5xx patterns**: scanning attempts often show as 401/403 patterns

Centralize in a SIEM (Datadog Security, Splunk, Elastic Security) or build with OTel + a log warehouse.

## What to put in the architecture spec for security

For every system, the spec must answer:

- [ ] **Threat model** (STRIDE walked through)
- [ ] **AuthN model**: providers, MFA policy, session lifetimes
- [ ] **AuthZ model**: RBAC / ABAC / ReBAC; how is it enforced
- [ ] **Data classification**: what's PII, restricted, confidential
- [ ] **Encryption**: at rest, in transit, at the field level for restricted data
- [ ] **Secrets management**: where, how rotated
- [ ] **Compliance scope**: GDPR / LGPD / Ley 21.719 / SOC 2 / others
- [ ] **Data residency**: per-tenant if applicable
- [ ] **Audit log**: what's logged, where, retention period
- [ ] **For AI features**: prompt injection mitigations, sandboxing for code execution, cost ceilings, scope review process
- [ ] **Supply chain**: dependency scanning, SBOM, signing
- [ ] **Incident response plan**: who responds, on-call, runbook locations
- [ ] **Vulnerability management**: scanning cadence, patching SLA
- [ ] **Backup and DR**: RPO, RTO, tested
