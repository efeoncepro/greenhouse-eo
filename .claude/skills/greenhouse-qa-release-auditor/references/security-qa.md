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
