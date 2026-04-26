# TASK-658 — API Platform Resource Authorization Bridge

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-658-api-platform-resource-authorization-bridge`
- Legacy ID: `TASK-649 child`
- GitHub Issue: `—`

## Summary

Crear el bridge de autorización para resources API Platform sensibles: mapping de consumer/binding scope + resource capability/sensitivity + action, sin confundir `views` con permisos ecosystem-facing.

## Why This Task Exists

Ecosystem API ya tiene scope safety, pero no capability safety. `allowed_greenhouse_scope_types` no dice si un consumer puede leer People, payroll, costs, finance details o person-level ICO.

## Goal

- Definir policy de resource sensitivity para API Platform.
- Reutilizar entitlements/capabilities existentes donde aplique.
- Enforcear policy en resource adapters.
- Documentar cómo se relaciona con `views`.

## Architecture Alignment

Revisar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- `views`/`authorizedViews` govern visible surfaces; API resources need resource policy.
- Sensitive fields require explicit capability/sensitivity rule.
- Binding scope alone is insufficient for People/payroll/cost details.

## Normative Docs

- `docs/tasks/in-progress/TASK-649-api-platform-completion-program.md`

## Dependencies & Impact

### Depends on

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/api-platform/core/context.ts`
- `src/lib/sister-platforms/types.ts`

### Blocks / Impacts

- `TASK-650`
- `TASK-651`
- `TASK-652`
- `TASK-653`
- `TASK-654`

### Files owned

- `src/lib/api-platform/core/authorization.ts`
- `src/lib/api-platform/core/authorization.test.ts`
- optional policy config under `src/config/**`
- docs/OpenAPI updates

## Current Repo State

### Already exists

- Entitlements runtime/governance for users.
- Binding scope enforcement for ecosystem consumers.

### Gap

- No resource sensitivity/capability policy for API Platform consumers.

## Scope

### Slice 1 — Policy design

- Define resource IDs, actions and sensitivity classes.

### Slice 2 — Runtime enforcement

- Add assertion/helper for resource adapters.

### Slice 3 — Pilot adoption

- Apply to existing capabilities or event control plane resource.

### Slice 4 — Docs/tests

- Document user-entitlements vs ecosystem-resource policy.

## Out of Scope

- Full UI governance surface unless needed as follow-up.
- Hosted OAuth.

## Acceptance Criteria

- [ ] API Platform resources can declare required resource policy.
- [ ] Sensitive resources can be blocked independent of binding scope.
- [ ] Tests cover allow/deny cases.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- focused tests
- `git diff --check`

## Closing Protocol

- [ ] README/Handoff updated.
