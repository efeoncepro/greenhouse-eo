# TASK-1164 — Kortex Greenhouse Command Adapter for HubSpot Strategy Ops

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Complete; staging smoke passed end-to-end against Kortex runtime portal 48713323`
- Rank: `TBD`
- Domain: `platform|crm|integrations|ops|ecosystem|hubspot`
- Blocked by: `none`
- Branch: `task/TASK-1164-kortex-command-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar que Greenhouse pueda solicitar comandos gobernados a Kortex para operaciones HubSpot/estrategia: auditoria, compile, dry-run y execute. Kortex sigue siendo el runtime que muta HubSpot; Greenhouse agrega access gate, binding preflight, idempotencia, audit trail, respuesta redacted y confirmacion humana para live execute.

## Why This Task Exists

El operador pidio usar desde Greenhouse las capacidades Kortex para modificar propiedades HubSpot y desplegar programaticamente una estrategia. TASK-1162 dejo un reader read-only sano, pero bloqueo writes a proposito. Abrir writes sin command adapter expondria riesgo de replay, portal equivocado, secrets leak o execute sin aprobacion humana.

## Goal

- Crear el contrato versionado `greenhouse-kortex-command-adapter.v1`.
- Exponer `POST /api/admin/kortex/commands` para comandos allowlisted.
- Reusar `executeApiPlatformCommand` y `greenhouse_core.api_platform_command_executions`.
- Usar el reader de TASK-1162 como preflight/binding.
- Bloquear live execute sin flag, dry-run reciente y confirmacion humana.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`

Reglas obligatorias:

- Greenhouse no escribe HubSpot directo.
- Kortex sigue siendo owner runtime de strategy/audit/HubSpot mutations.
- No agregar `kortex.*` al catalogo interno de entitlements.
- Todo command requiere `Idempotency-Key`.
- Production live execute queda default OFF hasta aprobacion explicita.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1162` complete.
- `src/lib/api-platform/core/commands.ts`
- `src/lib/api-platform/core/idempotency.ts`
- `src/lib/kortex/control-plane/**`

### Blocks / Impacts

- Desbloquea UI/Admin/Nexa futura para operar Kortex desde Greenhouse.
- Desbloquea dry-run/execute gobernado por API server-side.

### Files owned

- `src/lib/kortex/commands/**`
- `src/app/api/admin/kortex/commands/route.ts`
- `docs/architecture/GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`
- `docs/documentation/plataforma/kortex-command-adapter.md`
- `docs/manual-de-uso/plataforma/kortex-command-adapter.md`
- `docs/tasks/complete/TASK-1164-kortex-greenhouse-command-adapter-hubspot-strategy-ops.md`

## Current Repo State

### Already exists

- `GET /api/admin/kortex/control-plane` read-only.
- Binding Kortex para portal piloto `51183921` observado por TASK-1162.
- API Platform command foundation e idempotency.

### Gap

- Greenhouse staging deploy esta activo y los flags externos quedaron configurados.
- El smoke real llega a Kortex, pero `kortex.audit.run` queda bloqueado por el runtime externo de Kortex: la instalacion HubSpot `runtime` para portal `51183921` esta `reconnect_required` y el refresh token devuelve `BAD_SCOPES / missing or invalid scopes`.
- La solucion no era cambiar el adapter ni inventar tokens: el app runtime de Kortex estaba pidiendo scopes de cuenta/tier como required o como optional_scope masivo durante el install base.
- Fix externo aplicado en Kortex: `crm.schemas.custom.write` movido a `conditionallyRequiredScopes`; `tax_rates.read` movido a optional; `settings.currencies.*` y `settings.billing.write` removidos del install runtime; `/hubspot/oauth/authorize` ya no envia `optional_scope` por defecto y solo lo incluye con opt-in explicito. Commit Kortex: `d664be9`.
- Cloud Run Kortex desplegado con la correccion de scopes en `kortex-control-plane-00103-pw6`; verificacion runtime del URL de re-consent: `optional_scope` ausente, `required_count=68`, sin `crm.schemas.custom.write`, `tax_rates.read`, `settings.currencies.*` ni `settings.billing.write` en required.
- Follow-up OAuth selector aplicado en Kortex commit `7266902` y Cloud Run `kortex-control-plane-00104-4dh`: el install base ahora usa `https://app.hubspot.com/oauth/authorize` y guarda `hubspot_portal_id=null` en state, permitiendo seleccionar otro portal durante OAuth. El lock anterior solo queda disponible bajo opt-in explicito `lock_hubspot_portal=true`.
- Re-consent completado por el operador en portal HubSpot `48713323` (`www.efeoncepro.com`). Kortex DB confirma runtime install `active`, `scope_count=68`, `reconnect_required=false`.
- Binding Greenhouse creado para el portal Kortex `9b0a6e91-0e08-4642-bc42-54a4b5c83ad8` / HubSpot `48713323`: `EO-SPB-0002`, `binding_status=active`, `greenhouse_scope_type=internal`.
- Staging allowlist actualizado: `KORTEX_COMMAND_ALLOWED_PORTALS=51183921,48713323,9b0a6e91-0e08-4642-bc42-54a4b5c83ad8`.
- Redeploy staging Ready: `https://greenhouse-mq9uqn9hz-efeonce-7670142f.vercel.app`.

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.api_platform_command_executions`.
- Consumidores: operadores internos, futuros agentes/Nexa, Kortex runtime.
- Runtime target: staging first; production live execute gated.

Invariantes:

- Mismo `(principal, Idempotency-Key, fingerprint)` no duplica ejecucion.
- Payload distinto con misma key devuelve conflicto.
- `execute` live requiere dry-run/preview reciente, confirmation phrase y flag live.
- Response Greenhouse nunca incluye tokens ni raw HubSpot payload.
- Portal scope se resuelve por binding, no por parametro arbitrario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract and docs

- Crear ADR `GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`.
- Documentar funcional y manual operativo.

### Slice 2 — Greenhouse command adapter

- Crear `src/lib/kortex/commands/**`.
- Implementar `POST /api/admin/kortex/commands`.
- Reusar `executeApiPlatformCommand`.

### Slice 3 — Guardrails and tests

- Validar command names, reason, idempotency, binding, flags y confirmation.
- Tests focales de adapter y route.

### Slice 4 — Rollout

- Configurar staging env y smoke externo.
- Mantener production live execute OFF hasta aprobacion.

## Out of Scope

- UI visible.
- Mutar HubSpot directo.
- Agregar `kortex.*` a entitlements internos.
- Live execute production sin aprobacion explicita.

## Detailed Spec

Comandos permitidos:

- `kortex.audit.run`
- `kortex.strategy.compile`
- `kortex.strategy.release_candidate.dry_run`
- `kortex.strategy.release_candidate.execute`

Request minimo:

- header `Idempotency-Key`
- `commandName`
- `hubspotPortalId` o `portalId`
- `reason`
- `payload`
- `confirmation` solo para live execute.

Response minimo:

- `contractVersion`
- `commandExecutionId`
- `status`
- `kortexOperationId`
- `scope`
- `summary`
- `sources`
- `redacted: true`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Live execute nunca se habilita antes de dry-run staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble ejecucion por retry | Greenhouse/Kortex/HubSpot | medium | API Platform idempotency + key propagada | replay/conflict headers |
| Portal equivocado | HubSpot | medium | binding preflight + allowlist | `kortex_portal_mismatch` |
| Execute accidental | Ops/security | low | flag live OFF + confirmation phrase + preview | `kortex_live_execute_disabled` |
| Secret leak | Security | low | redaction + server-only tokens | tests/review |

### Feature flags / cutover

- `KORTEX_COMMAND_ADAPTER_ENABLED=false` default.
- `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false` default.
- `KORTEX_COMMAND_ALLOWED_PORTALS=51183921` para staging piloto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert docs | <5 min | si |
| 2 | disable `KORTEX_COMMAND_ADAPTER_ENABLED` | <5 min | si |
| 3 | revert tests/code or keep disabled | <10 min | si |
| 4 | force `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false` | <5 min | si |

### Production verification sequence

1. Deploy con live execute OFF.
2. Smoke `GET /api/admin/kortex/control-plane`.
3. Smoke `POST /api/admin/kortex/commands` bloqueando sin flag/key.
4. Habilitar adapter solo en staging con portal allowlist.
5. Ejecutar dry-run/audit safe y verificar row en command executions.
6. Live execute solo con aprobacion explicita.

### Out-of-band coordination required

- Re-consent OAuth completado para portal HubSpot `48713323`.
- Smoke `POST /api/admin/kortex/commands` ejecutado contra staging y Kortex runtime real.
- Mantener `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false` hasta aprobacion explicita de live execute.

## Acceptance Criteria

- [x] `greenhouse-kortex-command-adapter.v1` documentado y versionado.
- [x] `POST /api/admin/kortex/commands` existe, admin-gated y usa idempotencia/audit canonica.
- [x] El adapter resuelve binding via TASK-1162 y bloquea portal mismatch.
- [x] `audit.run`, `strategy.compile`, `dry_run` y `execute` estan modelados con validacion por comando.
- [x] `execute` live no corre sin dry-run/preview vigente, confirmacion humana, reason e idempotency key.
- [x] Greenhouse no muta HubSpot directo ni almacena tokens HubSpot/Kortex.
- [x] Tests focales cubren parser, idempotency missing, flag disabled, dry-run dispatch, live flag y preview.
- [x] Staging smoke deja evidencia de command execution row y Kortex operation/status redacted.
- [x] Production queda deployable con live execute disabled por default.

## Verification

```bash
pnpm test src/lib/kortex/commands/adapter.test.ts src/app/api/admin/kortex/commands/route.test.ts
pnpm task:lint --task TASK-1164
pnpm ops:lint --changed
NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false
pnpm docs:closure-check
```

### Staging Rollout Evidence — 2026-06-17

- Commit desplegado: `076d31f99` en `origin/develop`.
- Deployment Vercel staging: `https://greenhouse-h4py587vz-efeonce-7670142f.vercel.app`, status `Ready`, branch `develop`, commit `076d31f`.
- Flags Vercel staging configuradas:
  - `KORTEX_COMMAND_ADAPTER_ENABLED=true`
  - `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED=false`
  - `KORTEX_COMMAND_ALLOWED_PORTALS=51183921`
  - `KORTEX_COMMAND_API_BASE_URL=https://kortex-control-plane-758246035804.us-central1.run.app`
- Smoke Greenhouse:
  - `GET /api/admin/kortex/control-plane?hubspot_portal_id=51183921` -> `200`, contract `greenhouse-kortex-control-plane-reader.v1`, capabilities Kortex observadas.
  - `POST /api/admin/kortex/commands` con `kortex.strategy.release_candidate.execute` -> `409`, code `kortex_live_execute_disabled`, esperado por guardrail.
  - `POST /api/admin/kortex/commands` con `kortex.audit.run` -> `400`, code `kortex_preflight_failed`; upstream Kortex devuelve HubSpot token refresh `403 BAD_SCOPES / missing or invalid scopes`.
- Diagnostico Kortex externo:
  - Cloud Run `kortex-control-plane` vive en GCP project `efeonce-kortex-dev`.
  - Instalacion `integration.hubspot_app_installations` para portal `51183921`, app_role `runtime`, esta en `reconnect_required`.
  - Los secrets runtime disponibles (`kortex-hubspot-refresh-token-runtime-51183921` y legacy `kortex-hubspot-refresh-token-51183921`) tienen el mismo hash y ambos fallan refresh con HubSpot `403 access_denied`.
  - El secret embedded refresca, pero solo corresponde al app low-scope y no desbloquea el runtime broad-scope.

### External OAuth Fix + Final Smoke Evidence — 2026-06-17

- Kortex scopefix commit: `d664be9`.
- Kortex generic portal selector commit: `7266902`.
- Kortex Cloud Run final revision: `kortex-control-plane-00104-4dh`.
- HubSpot OAuth selected portal: `48713323` / `www.efeoncepro.com`.
- Kortex runtime install verification: `install_status=active`, `scope_count=68`, `reconnect_required=false`.
- Greenhouse binding created: `EO-SPB-0002`, external `portal:9b0a6e91-0e08-4642-bc42-54a4b5c83ad8`, status `active`.
- Vercel staging allowlist updated and redeployed:
  - URL: `https://greenhouse-mq9uqn9hz-efeonce-7670142f.vercel.app`
  - Deployment status: `Ready`
  - `KORTEX_COMMAND_ALLOWED_PORTALS=51183921,48713323,9b0a6e91-0e08-4642-bc42-54a4b5c83ad8`
- Final smoke:
  - `POST /api/admin/kortex/commands` with `kortex.audit.run`, `hubspotPortalId=48713323` -> `200`.
  - `commandExecutionId=EO-APC-9D220439`.
  - `kortexOperationId=025a960d-576f-48e3-ab16-e6183c6bb0ae`.
  - Summary: `operationKind=audit_run`, `status=completed`, observed keys `audit_run`, `findings`, `heuristics_report`, `objective_links`, `portal`, `scorecard`, `snapshot`.

### QA Release Audit — 2026-06-17

- Verdict: `PASS`
- Closure state: `complete`
- Risk classification: external integration + env/flag/deploy + security-sensitive secret boundary.
- Evidence passed:
  - Greenhouse code, build and deploy staging OK.
  - Vercel staging env flags configured.
  - Control-plane reader smoke OK.
  - Live execute guardrail smoke OK (`kortex_live_execute_disabled`).
  - Kortex runtime OAuth re-consent completed for portal `48713323`.
  - Binding `EO-SPB-0002` active.
  - Final command adapter smoke OK (`kortex.audit.run` -> `200`, `completed`).
  - Documentation/task lifecycle gates OK.
- Blocker:
  - none.
- False-closure traps checked:
  - Tests green do not prove Kortex runtime OAuth health.
  - Greenhouse staging env vars are present and were redeployed before final smoke.
  - Embedded low-scope token cannot be substituted for runtime broad-scope commands.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — DELIVERY, VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Closing Protocol

- Re-consent OAuth Kortex runtime completado.
- Smoke staging externo completado.
- Flags/env y evidencia documentados en `Handoff.md`.
- Movido a `complete/` con live execute production aun disabled por guardrail.

## Operational Notes

- Production live execute queda OFF hasta aprobacion explicita.
