# Greenhouse Kortex Command Adapter V1

## Status

- Status: Accepted — TASK-1164 live, TASK-1165 full command surface implemented in staging rollout
- Date: 2026-06-17
- Task: `TASK-1164`, `TASK-1165`
- Runtime contract: `greenhouse-kortex-command-adapter.v1`

## Decision

Greenhouse exposes a governed command adapter for Kortex operations, without becoming the owner of Kortex runtime or HubSpot mutations.

Allowed commands are now registry-driven in `src/lib/kortex/commands/registry.ts`. Greenhouse does not accept arbitrary upstream paths.

Kortex remains the system that talks to HubSpot. Greenhouse adds admin access, binding preflight, idempotency, audit persistence, redacted responses, explicit live confirmation and environment flags.

Layered operating docs for the full capability live under [`kortex/`](kortex/README.md).

## API Surface

- `POST /api/admin/kortex/commands`
- Header: `Idempotency-Key`
- Response header: `X-Greenhouse-Contract: greenhouse-kortex-command-adapter.v1`

The response includes `commandExecutionId`, `kortexOperationId`, `scope`, `summary`, `sources` and `redacted: true`.

## Execution Model

The adapter reuses `executeApiPlatformCommand()` and `greenhouse_core.api_platform_command_executions`.

It preserves:

- idempotency replay for identical payloads;
- conflict for reused keys with different payloads;
- audit rows per command;
- redacted command responses.

The API Platform command execution id is propagated to Kortex as `greenhouse:<commandExecutionId>`.

## Binding Preflight

Before upstream dispatch, Greenhouse resolves scope through the TASK-1162 control-plane reader and `sister_platform_bindings`.

If binding is missing, mismatched or not allowlisted by `KORTEX_COMMAND_ALLOWED_PORTALS`, the command fails before Kortex is called.

## Safety Gates

- `KORTEX_COMMAND_ADAPTER_ENABLED=true` is required for any command.
- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=true` is required for live execute.
- `KORTEX_COMMAND_ADMIN_ENABLED=true` is required for admin/breakglass commands.
- Admin/breakglass commands require `confirmation.phrase === "EXECUTE KORTEX ADMIN COMMAND"`.
- Admin Kortex endpoints that require Kortex bootstrap auth receive server-only `X-Kortex-Admin-Token` from `KORTEX_COMMAND_ADMIN_TOKEN` or `KORTEX_ADMIN_BOOTSTRAP_TOKEN`.
- Live execute requires `confirmation.confirmed === true`.
- Live execute requires `confirmation.phrase === "EXECUTE KORTEX RELEASE"`.
- Live execute requires a completed dry-run command from the last 24 hours for the same release candidate.

## Command Catalog

| Command | Method | Upstream path | Tier |
|---|---:|---|---|
| `kortex.portal.hub_profile.put` | PUT | `/api/v1/portals/{hubspot_portal_id}/hub-profile` | `stateful` |
| `kortex.admin.snapshots.trigger` | POST | `/api/v1/admin/snapshots/trigger` | `admin_breakglass` |
| `kortex.admin.auth.verify` | POST | `/api/v1/admin/auth/verify` | `admin_breakglass` |
| `kortex.admin.users.seed` | POST | `/api/v1/admin/users/seed` | `admin_breakglass` |
| `kortex.admin.users.bootstrap_e2e_agent` | POST | `/api/v1/admin/users/bootstrap-e2e-agent` | `admin_breakglass` |
| `kortex.audit.run` | POST | `/api/v1/audits/run` | `stateful` |
| `kortex.strategy.normalize` | POST | `/api/v1/strategy/normalize` | `safe` |
| `kortex.strategy.intake` | POST | `/api/v1/strategy/intake` | `stateful` |
| `kortex.strategy.seed_from_audit` | POST | `/api/v1/strategy/seed-from-audit` | `stateful` |
| `kortex.strategy.workspace.update` | PATCH | `/api/v1/strategy/workspaces/{workspace_id}` | `stateful` |
| `kortex.strategy.workspace.compilation_run.create` | POST | `/api/v1/strategy/workspaces/{workspace_id}/compilation-runs` | `stateful` |
| `kortex.strategy.compile` | POST | `/api/v1/strategy/workspaces/{workspace_id}/compile` | `stateful` |
| `kortex.strategy.workspace.approval_decision.create` | POST | `/api/v1/strategy/workspaces/{workspace_id}/approval-decisions` | `stateful` |
| `kortex.strategy.release_candidate.dry_run` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute` | `stateful` |
| `kortex.strategy.release_candidate.execute` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute` | `external_write` |
| `kortex.strategy.release_candidate.execute_workflows` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute-workflows` | `external_write` |
| `kortex.strategy.release_candidate.execute_custom_objects` | POST | `/api/v1/strategy/release-candidates/{release_candidate_id}/execute-custom-objects` | `external_write` |
| `kortex.strategy.conversation.create` | POST | `/api/v1/strategy/conversations` | `stateful` |
| `kortex.strategy.chat.send` | POST | `/api/v1/strategy/chat` | `stateful` |
| `kortex.strategy.operation.execute_internal` | POST | `/api/v1/strategy/internal/operations/execute/{operation_id}` | `admin_breakglass` |
| `kortex.strategy.conversation.extract` | POST | `/api/v1/strategy/conversations/{conversation_id}/extract` | `stateful` |

## Boundary

Greenhouse does not:

- write HubSpot directly;
- read Kortex Cloud SQL;
- share Kortex or HubSpot secrets with the browser;
- add `kortex.*` to Greenhouse internal entitlements.

## Rollout

Recommended staging flags:

```env
KORTEX_COMMAND_ADAPTER_ENABLED=true
KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false
KORTEX_COMMAND_ADMIN_ENABLED=false
KORTEX_COMMAND_ALLOWED_PORTALS=48713323,9b0a6e91-0e08-4642-bc42-54a4b5c83ad8
```

Production live execute and admin breakglass remain disabled until staging evidence and explicit operator approval.

## Rollout Evidence — 2026-06-17

Greenhouse staging deploy `greenhouse-mq9uqn9hz-efeonce-7670142f.vercel.app` is `Ready` for TASK-1164 command adapter rollout.

Verified:

- Kortex OAuth runtime is active for HubSpot portal `48713323`;
- Greenhouse binding `EO-SPB-0002` is active;
- control-plane reader returns `200` for HubSpot portal `48713323`;
- live execute remains blocked with `kortex_live_execute_disabled`;
- `kortex.audit.run` returns `200 completed` with `commandExecutionId=EO-APC-9D220439`, `kortexOperationId=025a960d-576f-48e3-ab16-e6183c6bb0ae`.
