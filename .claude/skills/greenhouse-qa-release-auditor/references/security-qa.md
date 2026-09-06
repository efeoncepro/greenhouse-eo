# Security QA

Apply a proportional OWASP-style subset for security-sensitive changes. Use
official OWASP ASVS concepts as direction, but keep the gate tied to Greenhouse
runtime evidence.

Check when touched:

- Authentication and session handling: correct identity, no bypass, failure path.
- Authorization: tenant-safe, least privilege, denial path, both views and capabilities.
- Input validation: parse/validate before use, no raw SQL/string command injection.
- Output encoding and rendering: no unsafe HTML, no XSS vector, no raw errors.
- Secrets: no secret in diff/log/Sentry/client bundle, canonical secret resolution.
- Webhooks/external APIs: signature/HMAC/replay handling, idempotency, dead-letter path.
- File/document exports: access guard, no PII leak, correct branding/legal footer.
- Audit/outbox: sensitive writes produce audit and events when contract requires it.

Blockers:

- Security-sensitive change has only happy-path tests.
- Authorization failure path was not tested or reasoned.
- Raw provider error or secret-like value can reach UI/log/Sentry.
- Webhook trusts payload without re-fetch/signature/idempotency where required.

## Corporate login and native MCP authority (TASK-1836 / TASK-1831)

Load `efeonce-mcp-platform/references/native-authority.md` for the complete boundary checklist. Require
separate proof of direct anonymous login UI, corporate session, per-client consent, native token and
MCP dispatch. A canary that starts in `/oauth/authorize` does not prove the Microsoft button appears on
plain `/login`; reaching Microsoft is not a completed human session. Reuse existing UI primitives.

Verify immutable population, context-bound `gv`, current eligibility/grants and token-ledger revocation
before provider dispatch. Test family revocation without breaking a second valid family, and organization
deny with positive controls. Claims and upstream MFA are not local step-up proof. Check native form POST
and redirect CSP in a real browser; never repair Origin failure by disabling CSRF. Report skipped engines
and untested external/multicontext cases separately. Runtime flags/revisions and measured rollback go in
the dated runbook; do not embed a moving pilot snapshot in skills.
