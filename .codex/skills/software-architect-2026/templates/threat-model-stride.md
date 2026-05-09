# Threat Model — STRIDE

A structured walk-through of security threats for a system or feature. STRIDE is a mnemonic for the six categories of threat. The goal is not exhaustive coverage; it's surfacing the threats that matter and naming the mitigations.

Run this template at design time (before implementation) and on substantive architecture changes. For AI-powered systems, also run when adding new tools / capabilities to an agent.

## Metadata

- **System / feature**: [name]
- **Date**: YYYY-MM-DD
- **Authors**: [names]
- **Scope**: [what's in scope and what's not]
- **Reviewers**: [security partners or engineers who reviewed]

## 1. Trust boundaries

> Where does the data cross from a less-trusted actor to a more-trusted one (or vice-versa)? Trust boundaries are where most threats live.

| Boundary | From | To | What crosses |
|---|---|---|---|
| 1 | Untrusted users | Web app | HTTP requests, form data, file uploads |
| 2 | Web app | API | Authenticated requests with tenant context |
| 3 | API | Database | SQL queries with parameters |
| 4 | API | LLM provider | Prompt content, possibly user-derived |
| 5 | LLM | API (tool calls) | Tool invocations and arguments |
| ... | ... | ... | ... |

## 2. Data classification

> What kinds of data flow through this system? Classify each.

| Data type | Classification | Notes |
|---|---|---|
| User credentials | Highly restricted | Never logged, encrypted in transit |
| User PII (name, email) | Restricted | Stored encrypted at rest |
| Tenant business data | Confidential | Per-tenant RLS isolation |
| System logs | Internal | No PII; structured |
| Public marketing copy | Public | No special controls |

## 3. STRIDE walk-through

For each category, list the relevant threats and mitigations. Skip categories that don't apply.

### S — Spoofing identity

> Can someone pretend to be another user, service, or system?

| Threat | Mitigation | Status |
|---|---|---|
| User credential theft (phishing, leaked password) | MFA required for sensitive actions; passwordless option (passkey) | In place / Planned / Not applicable |
| Session hijacking | httpOnly cookies, sameSite=strict, short session lifetime, rotation on privilege change | |
| Service-to-service spoofing | mTLS or signed JWT for service auth; no shared secrets | |
| Prompt-injected agent acting as user | Output validation; high-impact actions require explicit user confirmation | |

### T — Tampering with data

> Can someone modify data they shouldn't?

| Threat | Mitigation | Status |
|---|---|---|
| SQL injection | Parameterized queries (no string concatenation); ORM with safe defaults | |
| Stored XSS in user content | Output encoding; CSP; sanitize on storage | |
| Tenant data tampering across boundaries | RLS policies; tenant context required for all writes; audit log of state changes | |
| AI agent modifying data outside scope | Per-tool authz scopes; agent runs with least-privilege credentials | |
| Tampering in transit | TLS 1.2+; certificate pinning for sensitive endpoints | |

### R — Repudiation

> Can someone deny an action they took?

| Threat | Mitigation | Status |
|---|---|---|
| User denies destructive action | Audit log of every state-changing action with user, timestamp, before/after | |
| Admin denies privileged action | Same audit log with elevated retention; separate audit DB if compliance requires | |
| AI agent acts and humans can't reconstruct why | Structured trace per agent run; tool call log; reasoning chain captured in observability | |

### I — Information disclosure

> Can someone read data they shouldn't?

| Threat | Mitigation | Status |
|---|---|---|
| Cross-tenant data leak via missed filter | RLS as backstop; CI tests that try cross-tenant queries | |
| PII in logs | Logger redaction patterns; no logging of request bodies for sensitive endpoints | |
| Error messages leaking internals | Generic error responses to client; full details only in server logs | |
| LLM prompt-injected to exfiltrate data | Network egress controls on agent; output validation; no arbitrary URL fetching from agent | |
| Browser-side data exposure | Sensitive data not in localStorage; tokens in httpOnly cookies | |
| Exposed admin endpoints | Admin endpoints only accessible from internal network or with elevated MFA | |
| Data sent to vendors (LLM providers, integrations) | DPA with sub-processors; classify what goes to which vendor; avoid PII to LLMs when not needed | |

### D — Denial of service

> Can someone make the system unavailable?

| Threat | Mitigation | Status |
|---|---|---|
| Resource exhaustion via unbounded request | Rate limits at gateway and per endpoint; pagination required for list endpoints | |
| Noisy-neighbor tenant degrading others | Per-tenant rate limits; per-tenant query timeouts; per-tenant connection pool quotas | |
| Slow loris / connection holding | Reasonable timeouts on idle connections; web server limits | |
| LLM cost runaway from looping agent | Per-workflow daily cost ceiling with kill-switch; rate limits on LLM API calls | |
| Layer 7 DDoS | CDN/Cloudflare in front; rate limiting; geo-blocking if applicable | |
| Database lock contention | Connection pool sizing; query timeouts; expand-and-contract migrations only | |

### E — Elevation of privilege

> Can someone gain access they shouldn't have?

| Threat | Mitigation | Status |
|---|---|---|
| Authz bypass — user accesses higher role | All authz checks at the resource layer; never trust client-side role indicators | |
| Privilege escalation via admin endpoints | Admin endpoints behind elevated MFA; audit log with notification | |
| Service account abuse | Service credentials short-lived; rotated; scoped to minimum needed | |
| Tenant admin escalating to platform admin | Strict separation between platform-admin and tenant-admin roles; no tenant role grants platform privileges | |
| Agent gaining tools / scopes it shouldn't have | Tool grants reviewed periodically; agent scope is whitelist not blacklist | |
| Container escape (in sandboxed agent) | Use ephemeral microVM or strong namespace isolation; treat sandbox compromise as possible | |

## 4. Specific to AI features (if applicable)

> Threats that don't fit STRIDE cleanly but are critical for systems with LLMs / agents.

### Prompt injection

| Threat | Mitigation |
|---|---|
| Untrusted content (web pages, emails, file contents) injecting instructions | Structural separation: instructions in system prompt, untrusted data clearly framed as data. Strip / sandbox where possible. Detect-and-confirm for irreversible actions. |

### Agent autonomy mismatch

| Threat | Mitigation |
|---|---|
| Agent given more autonomy than its evaluated reliability supports | Explicit autonomy tiers; graduation requires evidence; downgrade is one-click |

### Cost as security

| Threat | Mitigation |
|---|---|
| Runaway agent racks up thousands in LLM costs | Daily cost ceiling per workflow; anomaly detection on cost; kill-switch tested |

## 5. Risks accepted

> Sometimes you accept a risk because mitigation cost exceeds the risk. Document explicitly.

| Risk | Why accepted | Conditions for re-evaluation |
|---|---|---|
| [Risk] | [Why we're accepting this — cost, complexity, scope] | [What would change our mind] |

## 6. Action items

> Mitigations that aren't yet in place. Each has an owner and a target.

- [ ] [Mitigation] — owner: [name] — by: [date]
- [ ] [Mitigation] — owner: [name] — by: [date]

## 7. Re-evaluation cadence

This threat model is re-evaluated:

- On substantive architecture changes
- On new AI features or agent tool additions
- On security incidents (post-mortem may identify new threats)
- At minimum: every 12 months

---

## Skill behavior with threat models

When generating a threat model:

1. **Walk through STRIDE methodically.** Don't skip categories — the categories you skip are the ones with surprises.
2. **For every threat, name a specific mitigation** (not "improve security" — name the control).
3. **Include AI-specific threats** when the system has LLMs or agents.
4. **Flag risks accepted explicitly.** A risk you accepted on purpose is fine; a risk that fell through the cracks is the dangerous kind.
5. **Use the Status column honestly.** "In place / Planned / Not applicable" — don't claim mitigations that aren't there.
6. **Connect to compliance scope.** If the system is in SOC 2 / GDPR / Ley 21.719 scope, name the controls those frameworks require explicitly.
