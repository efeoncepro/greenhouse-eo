# TASK-1229 — Growth Forms Backend/API Parity Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|api|public-site|hubspot|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1229-growth-forms-backend-api-parity-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la fundacion backend/API-parity del motor de formularios publicos de Growth: schema, contracts, commands/readers, policy compiler, host surface registry, fake destination adapter, Product APIs y public render/submit APIs. Esta task no implementa UI final, WordPress plugin, Astro wrapper ni HubSpot write real; deja el contrato gobernado sobre el que todo consumer debe operar.

## Why This Task Exists

El motor de formularios debe nacer bajo Full API Parity. Si primero nace como wrapper WordPress o UI admin con logica local, se recrea el problema actual: formularios hardcodeados, destino acoplado y poca portabilidad hacia Astro/Nexa/MCP. La arquitectura ya define que Greenhouse Growth es SoT de definitions/versiones/render contracts/submissions/consent/destination attempts; falta materializar el primer primitive backend que todos los consumers usaran.

## Goal

- Materializar `src/lib/growth/forms/**` como capa canonica de readers/commands/contracts.
- Crear el modelo persistente minimo para definitions, versions, destinations, submissions, consent snapshots, destination attempts y host surfaces.
- Implementar policy compiler que emite `render_contract`, `submission_contract` y `destination_plan`.
- Exponer public GET/POST y Product APIs gobernadas para operar el motor sin UI-only paths.
- Dejar fake/no-op destination adapter y fixtures suficientes para tests deterministas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Full API Parity es requisito de nacimiento: toda accion de negocio vive en command/reader, no en UI ni wrapper.
- WordPress, Astro y Greenhouse Next.js son `host_surface`; HubSpot y futuros sistemas son `destination`.
- El browser nunca recibe HubSpot property names, destination mapping, private URLs, provider secrets ni server-only scoring.
- Public render/submit APIs deben validar surface/origin/embed key; no basta con `formSlug`.
- Published versions son immutables; editar un form publicado crea nueva version.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/context/02_gtm.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/11_hubspot-bowtie.md`

## Dependencies & Impact

### Depends on

- Arquitectura aceptada en `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`.
- Dominio `growth` documentado en `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`.

### Blocks / Impacts

- `TASK-1230` HubSpot Forms secure-submit adapter.
- `TASK-1231` Portable renderer + host surfaces.
- `TASK-1232` Growth Forms admin cockpit + first migration.
- Futuras capacidades `growth.forms.*` para Nexa/MCP/CLI.

### Files owned

- `src/lib/growth/forms/**`
- `src/app/api/public/growth/forms/**`
- `src/app/api/admin/growth/forms/**`
- `src/config/entitlements-catalog.ts`
- `src/lib/reliability/**`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-1229-growth-forms-backend-api-parity-foundation.md`

## Current Repo State

### Already exists

- Arquitectura/ADR docs-only del motor.
- Full API Parity ADR y proceso backend-data.
- Dominio `growth` documentado, pero sin runtime `src/lib/growth/forms/**` aun.

### Gap

- No existen aggregates, commands/readers, APIs, capabilities ni host surface registry para formularios.
- No existe render contract consumible por WordPress/Astro/Greenhouse Next.js.
- No existe submissions ledger ni destination attempt model para HubSpot/futuros destinos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_growth` planned schema + `src/lib/growth/forms/**`
- Consumidores afectados: `public host surfaces`, `Admin UI`, `Nexa`, `MCP`, `CLI/runbooks`, `Reliability`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- Contrato nuevo o modificado: public render/submit APIs, Product APIs, commands/readers, schema/contracts, browser-safe analytics event schema
- Backward compatibility: `additive`
- Full API parity: UI/wrappers/Nexa/MCP/CLI deben consumir los mismos commands/readers; no hay business logic en wrappers.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_definition`, `form_version`, `form_destination`, `form_submission`, `form_submission_consent_snapshot`, `form_destination_attempt`, `form_host_surface` o nombres equivalentes aprobados en discovery.
- Invariantes que no se pueden romper:
  - Published versions son immutables.
  - Destination mapping nunca se acepta desde browser.
  - Consent snapshot se conserva aunque falle delivery.
  - Surface authorization se valida antes de entregar render contract o aceptar submit.
  - Attempts son append-only o event-sourced con historia completa.
  - Analytics/telemetry policy no puede emitir raw field values, PII, HubSpot property names, form GUIDs or destination internals.
- Tenant/space boundary: public anonymous submit con `surface_id`/origin/embed key; admin APIs con tenant interno + capabilities `growth.forms.*`.
- Idempotency/concurrency: `dedupe_fingerprint` + optional idempotency token; commands transaccionales; retries safe.
- Audit/outbox/history: audit para author/publish/destination/surface/retry; signals para failures/stale/unauthorized.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: public APIs disabled/no published forms hasta crear fixtures y allowlist.
- Backfill plan: `none`
- Rollback path: disable routes via feature flag/config if introduced, revert PR, no destructive migration.
- External coordination: none for fake adapter; no HubSpot writes in this task.

### Security and access

- Auth/access gate: public APIs via surface registry/origin/embed key + rate limit; admin APIs via session/capability.
- Sensitive data posture: PII/contact/free text; no secrets; raw payload minimized/TTL.
- Error contract: canonical errors, no raw provider/internal errors, domain capture.
- Abuse/rate-limit posture: per-IP/form/surface rate limits, honeypot slot, replay/idempotency guard, payload size limits.

### Runtime evidence

- Local checks: unit/contract tests for compiler, readers/commands, validation, surface auth and fake adapter.
- DB/runtime checks: migration status + smoke against local/staging DB if schema is added.
- Integration checks: fake/no-op adapter only.
- Reliability signals/logs: `growth.forms.submission_error_rate`, `growth.forms.surface_unauthorized`, `growth.forms.renderer_contract_stale`, `growth.forms.dead_letter_count`, `growth.forms.client_analytics_missing_rate`, `growth.forms.measurement_degraded` seeded or planned.
- Production verification sequence: deploy additive with no published forms; smoke public GET/POST using test surface and fake destination in staging before prod.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en primitives `src/lib/growth/forms/**`, no en UI/wrappers/routes ad hoc.
- [ ] Capabilities modeladas como aggregate/resource/command, no como botones.
- [ ] Reads via readers; writes via commands con authorization, idempotencia, audit/outbox y errores sanitizados.
- [ ] Capabilities `growth.forms.*` + grants iniciales + coverage test si se gatean.
- [ ] Camino programático declarado para Product API, Nexa/MCP planned path, CLI/runbook y verification harness.
- [ ] Writes aptos para `propose -> confirm -> execute` cuando sean consumidos por Nexa.
- [ ] Un primitive, muchos consumers; cero lógica duplicada por surface.
- [ ] Parity check = SÍ para render/submit, author/review/publish, surfaces, destinations, submissions y retry/dead-letter.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Domain contracts and migrations

- Crear types/Zod/contracts para definitions, versions, fields, policy, render contract, submission contract, destination plan and host surfaces.
- Crear migrations additive para `greenhouse_growth` tables o justificar si se usa otro esquema/tabla existente.
- Seed/capability plan para `growth.forms.*` sin grants excesivos.

### Slice 2 — Commands/readers and compiler

- Implementar readers para draft/published forms, host surfaces, submissions and destination attempts.
- Implementar commands para author draft, compile/review, publish/deprecate/archive, manage surfaces, manage destinations and submit form.
- Implementar policy compiler con warnings/errors bloqueantes de publication.

### Slice 3 — Public/admin APIs and fake adapter

- Crear `GET /api/public/growth/forms/{formSlug}` y `POST /api/public/growth/forms/{formSlug}/submit`.
- Crear Product APIs admin bajo `/api/admin/growth/forms/**` para las capabilities iniciales.
- Implementar fake/no-op destination adapter y smoke fixtures.

### Slice 4 — Observability and verification

- Agregar reliability signals/logging para failures, unauthorized surfaces, stale renderer and dead letters.
- Agregar analytics/telemetry contract para renderer clients: event names, safe payload allowlist, dataLayer/CustomEvent policy and server-ledger reconciliation fields.
- Agregar contract tests de public APIs, compiler, surface registry, idempotency and fake delivery.
- Documentar operational smoke/runbook minimo si aplica.

## Out of Scope

- HubSpot secure-submit real.
- Web Component/custom element final.
- WordPress plugin/shortcode/block.
- Astro wrapper.
- Admin cockpit visible.
- Migracion de formularios reales.

## Detailed Spec

Seguir `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` §§7-21. La implementacion puede ajustar nombres fisicos si el discovery del repo recomienda un patron distinto, pero debe preservar los conceptos: `form_definition`, `form_version`, `form_destination`, `form_submission`, `form_submission_consent_snapshot`, `form_destination_attempt`, `form_host_surface`, policy compiler, render/submission/destination contracts.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No public route puede aceptar submits reales antes de existir surface registry, validation and fake adapter tests.
- No admin UI/wrapper downstream debe empezar antes de que esta task provea contracts estables.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Public submit endpoint acepta spam/PII sin controles | API/public | medium | Rate limits, honeypot, schema validation, surface allowlist, raw TTL | `growth.forms.submission_error_rate` / logs |
| UI/wrappers duplican logica por falta de contract claro | API parity | medium | Contract tests + published render contract typed | `growth.forms.renderer_contract_stale` |
| Migration crea schema prematuro dificil de cambiar | DB | low | Additive only, no real submissions, reversible before launch | migration check |
| Capability grants demasiado amplios | Access | medium | Seed minimo, coverage tests, internal-only admin APIs | entitlement coverage |

### Feature flags / cutover

- Considerar `GROWTH_FORMS_PUBLIC_API_ENABLED=false` y/o published form status como gate.
- Sin formularios reales publicados en esta task; cutover operativo = disabled/test-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR / reverse additive migration before data | <30 min | si |
| Slice 2 | Revert PR; no external writes | <30 min | si |
| Slice 3 | Disable flag/routes or revert PR | <15 min | si |
| Slice 4 | Revert signals/tests/docs | <30 min | si |

### Production verification sequence

1. Run migrations in staging and verify tables/capabilities.
2. Deploy with public forms disabled or test-only.
3. Smoke public GET/POST against a test form + fake destination.
4. Verify no HubSpot/external delivery occurs.
5. Verify signals/logs for test submission and blocked unauthorized surface.

### Out-of-band coordination required

N/A — no provider writes or public form rollout in this task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/growth/forms/**` contiene primitives canonicas para contracts, commands/readers, compiler and fake adapter.
- [ ] Migrations/capabilities/admin/public APIs existen o la task documenta una razon tecnica aprobada para diferir alguna parte.
- [ ] Public GET/POST no aceptan destination mapping desde browser y validan surface/origin/embed key.
- [ ] Render contract publica una `telemetryPolicy` segura para `CustomEvent`/GTM `dataLayer` sin raw values, PII ni internals de HubSpot.
- [ ] Published versions son immutables y publication gate bloquea policy incompleta.
- [ ] Tests cubren compiler, validation, surface auth, fake delivery, idempotency/dedupe and canonical errors.
- [ ] No HubSpot or external writes are performed.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1229`
- `pnpm ops:lint --changed`
- Migration/status checks if DB schema is added.
- Staging smoke for test form + fake destination if public APIs are deployed.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Arquitectura forms actualizada si el runtime decide nombres/contratos distintos a los planeados.

## Follow-ups

- `TASK-1230` HubSpot Forms secure-submit destination adapter.
- `TASK-1231` Portable renderer + host surfaces.
- `TASK-1232` Growth Forms admin cockpit + first migration.

## Open Questions

- Nombre fisico definitivo de tablas y flags durante discovery.
- Si el public API nace disabled por env flag o solo por ausencia de forms `published`.
