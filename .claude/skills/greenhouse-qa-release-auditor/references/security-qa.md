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

## Corporate login and native MCP authority (TASK-1836 / TASK-1831 / TASK-1844)

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

For internal v2, require distinct actor/target authority and a new consent/context from v1; flags or refresh
must not upgrade v1. Test paginated authorized discovery (including a revoked cursor), exact target selection,
A/B allowed, C/missing/invalid denied, A after deny, concurrent isolation, selective B revoke/restore without
reconnecting, and family/context revocation while the access token remains unexpired. Positive authorization
is never cached; role/space scope and effective permission precedence come from the canonical reader.

Use actual client events or Request/Response/Error blocks. A successful process exit with zero tools, model
prose or Connected status does not certify dispatch. Initialization/refresh denial is evidence at that layer,
not an invented MCP tool response. Distinguish provider `no_entitlement` from OAuth/target denial. Record
per-client rollback recovery: TASK-1844 observed Claude Code needing login after OFF/ON while Codex retained
its family. Hosted web/Desktop may share one OAuth family; a second UI is not a second OAuth certification.

Close only the authorized cohort. A one-person PASS does not establish general rollout capacity: require
reader-specific latency/errors before expansion, not a mixed transport p95 or an unmeasured zero-revocation
metric. Preserve external canary ownership/window and final internal families when retiring test fixtures.
The precise matrix and commands live in `efeonce-mcp-platform/references/client-certification.md` and its
linked runbook; reusable QA rules must not embed live tokens, family IDs or cohort snapshots.

## Efeonce ID external invitation (TASK-1837)

Check when `src/lib/identity/external-access/**`, the admin invitation routes, the ecosystem
`identity/invitations` lane, the invitation email or the consent page are touched:

- Token never in an HTTP response under system delivery (`token` only with `delivery.mode='manual'`); never
  in outbox payloads, audit metadata, logs or Sentry — the email body is not persisted (token-sensitive type).
- Acceptance URL comes from `external_identity_environments.issuer_url` (`/i/<token>`), never from
  `NEXT_PUBLIC_APP_URL` or any env var.
- Resend = rotate: previous row `revoked` (`resent`), old token rejected; cap 3 per chain + per-binding hourly cap.
- Reveal requires capability `identity.external_invitation.reveal_token` + reason ≥10 chars; 1 h row; audit
  `invitation_token_revealed` with actor + reason and without the token; signal `token_revealed` steady 0.
- Designated admin is unique per binding (a second accept conflicts instead of overwriting; revoke clears it
  with audit).
- Delegated lane: 404 flag OFF / non-internal consumer, 403 non-admin or foreign binding, 422 self-elevation
  or seat cap, 429 hourly cap; response without token; `Idempotency-Key` on POST.
- Delegated `resend`/`revoke`: a delegated admin can never revoke themself (`invalid_request`); a foreign
  invitation answers `not_found` (anti-oracle); binding-scope revoke clears the designated admin
  (`designated_admin_profile_id = NULL` + audit `designated_admin_cleared`, `cause: 'binding_revoked'`), same as
  member scope; the write-boundary test exists (`src/lib/identity/external-access/boundary-domain.test.ts` —
  allowlist `external_*`, `identity_profiles`, `identity_profile_source_links`; `email_deliveries` and
  `outbox_events` forbidden) and must stay green.
- Consent page shows the host of the validated `redirect_uri`; a missing host is a render error.
- Evidence hint: Resend test addresses `bounced@resend.dev` / `delivered@resend.dev` force a real bounce /
  delivery through the webhook → outbox → projection path (`delivery_status` `bounced` with `bounce:Permanent`
  and the `undelivered` signal lighting is the proof, not the 201).
- Evidence hint: a live issuer session must die — `/auth/session` answers 401 — after `revokeExternalAccess`
  revokes the scope binding; a session that survives the revoke is a blocker.
- Rollout order: migration before the code deploy (the invitation SELECT reads the new columns).

Blockers: a token-bearing response, outbox event or log line; an acceptance URL built from an env var;
a resend that reuses the open token; a delegated path without the four denial cases tested.
