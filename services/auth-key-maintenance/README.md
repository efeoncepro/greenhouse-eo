# Auth key maintenance — local candidate (TASK-1833)

One Cloud Run Job owns the automated signing-key command. It does not serve HTTP,
share the issuer's service account, send email, or run during deploy. The active
key remains in `greenhouse_auth.signing_keys`; only the public JWK is stored.

## Current boundary

- `AUTH_KEY_MAINTENANCE_ENABLED=false` and `AUTH_KEY_MAINTENANCE_DRY_RUN=true`
  are fixed in `deploy.sh`. A release can publish only a disabled Job definition.
- The production release invokes the deploy workflow only when the repository
  variable `AUTH_KEY_MAINTENANCE_PROVISIONED=true` has been set after IAM, login,
  pinned secret and migration readbacks. No push trigger or standalone dispatch.
- No Scheduler exists in this candidate. Provision it PAUSED with a separate
  caller after the Job definition, one task, zero retries and an empty request
  to the Jobs API using OAuth. Do not enable it until the cloud recovery rehearsal.
- The Job never retires, disables or destroys the predecessor. Those actions
  remain under the manual runbook until issuer, consumers, caches and retention
  policy are demonstrated.

## One-time baseline

The current v2 active / v1 retiring registry has no durable verified rotation
operation. The command therefore returns `baseline_required` (or `blocked` while
v1 is still retiring) and will never create a version by inference. After the
prior key has been retired under the runbook and an audit records real issuer
signing, JWKS and consumer checks, an operator may run:

```bash
pnpm auth-server:attest-rotation-baseline -- --predecessor <retired-kid> \
  --evidence docs/audits/auth-server/<review>.md
```

This command verifies current KMS signing/public key and issuer ready/JWKS,
then records a one-time baseline in PostgreSQL. Its `verified_at` is the start
of the first 90-day interval; the audit remains the evidence for actual issuer
and consumer behavior. The command does not rotate or disable KMS.

## Infrastructure prerequisites before a governed deploy

1. Apply the additive TASK-1833 migration with the canonical migration runner.
   Verify its objects, unique open-operation index and grants in the target DB.
2. Provision login `auth_key_maintenance` with no inherited `greenhouse_app`
   privileges; grant only membership in the migration-created
   `greenhouse_auth_key_maintenance` group role. Store its password in the
   dedicated Secret Manager secret, pin an enabled version, and verify actual
   login plus positive/negative table privileges. The migration creates no
   password or login.
3. Provision `auth-key-maintenance@efeonce-group` with Cloud SQL Client, access
   to that pinned password secret, and KMS create/get/list/public/sign only on
   the exact `auth-server-es256` CryptoKey. No project-scope KMS admin, destroy,
   restore or access to email/person/session secrets.
4. Verify deployer build/deploy and `actAs` grants scoped to this Job/SA, plus
   the current tariff, HSM version inventory and cost model. Set
   `AUTH_KEY_MAINTENANCE_PG_PASSWORD_REF` and only then mark
   `AUTH_KEY_MAINTENANCE_PROVISIONED=true` for a later approved main release.
5. Read back Job image SHA, service account, 1 task, parallelism 1, retries 0,
   timeout 300s, OFF/dry-run flags and exact KMS key. A successful deploy is
   not a successful execution.

## Recovery

`creating` is persisted before the non-idempotent KMS create RPC. A lost
response or crash leaves `create_uncertain`: no later tick creates again.
Inventory KMS versions and audit logs, bind only an unambiguous version through
`pnpm auth-server:reconcile-key-rotation -- --created <operation-uuid> --version
<exact-kms-version> --evidence docs/audits/auth-server/<review>.md`. The
operator must establish that the KMS version belongs uniquely to this create;
the command verifies key membership/state and signature when ENABLED, then
records the named version. Never choose the newest version heuristically.
`version_created` with an exact name may resume after KMS generation becomes
ENABLED. A failed preverify or JWKS readback blocks activation/retirement and
requires operator review. An already activated candidate whose JWKS publication
has been repaired can be attested with `--publication <operation-uuid> --kid
<candidate-kid> --evidence <audit.md>` through the same recovery CLI; it checks
KMS signature and issuer ready/JWKS again. Both recovery modes need a cloud
rehearsal before Scheduler ON.
