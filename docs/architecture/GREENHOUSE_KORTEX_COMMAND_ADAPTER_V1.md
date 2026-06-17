# Greenhouse Kortex Command Adapter V1

## Status

- Status: Accepted — code complete, rollout pending
- Date: 2026-06-17
- Task: `TASK-1164`
- Runtime contract: `greenhouse-kortex-command-adapter.v1`

## Decision

Greenhouse exposes a governed command adapter for Kortex operations, without becoming the owner of Kortex runtime or HubSpot mutations.

Allowed commands:

- `kortex.audit.run`
- `kortex.strategy.compile`
- `kortex.strategy.release_candidate.dry_run`
- `kortex.strategy.release_candidate.execute`

Kortex remains the system that talks to HubSpot. Greenhouse adds admin access, binding preflight, idempotency, audit persistence, redacted responses, explicit live confirmation and environment flags.

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
- Live execute requires `confirmation.confirmed === true`.
- Live execute requires `confirmation.phrase === "EXECUTE KORTEX RELEASE"`.
- Live execute requires a completed dry-run command from the last 24 hours for the same release candidate.

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
KORTEX_COMMAND_ALLOWED_PORTALS=51183921
```

Production live execute remains disabled until staging evidence and explicit operator approval.
