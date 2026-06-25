# TASK-1230 — Growth Forms HubSpot Secure Submit Adapter

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|hubspot|public-site|reliability`
- Blocked by: `TASK-1229`
- Branch: `task/TASK-1230-growth-forms-hubspot-secure-submit-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el destination adapter HubSpot Forms `hsforms-v3-secure-submit` para accepted submissions del motor Growth Forms, con mapping versionado, consent payload server-side, retry/dead-letter, signals y smoke contra un form de prueba. El adapter nace encapsulado como `endpointStatus=legacy_supported` y preparado para migrar a un endpoint date-versioned futuro.

## Delta 2026-06-25 — coexistencia con el HubSpot lead handoff del grader (TASK-1242)

Este adapter (form submission → HubSpot **Forms** secure-submit) **coexiste** con `TASK-1242` (lead handoff del AI Visibility Grader: `grader_leads` → contact/company + props `ai_visibility_*` vía el Cloud Run hubspot bridge). Son dos integraciones HubSpot distintas y legítimas en `growth`:

- **1230 (esta task):** entrega de *submissions* de cualquier form del motor a HubSpot **Forms** API.
- **1242:** handoff CRM/ventas del lead del grader (prop backfill + lifecycle) — no es un submit de formulario.

Frontera dura compartida: ambos **reusan el resolver de token canónico** + `captureWithDomain(err,'integrations.hubspot',…)`; **NUNCA** un cliente HubSpot paralelo. Coordinar el scope del private app (esta task exige scope `forms`; 1242 usa el bridge) para no pisarse.

## Why This Task Exists

El primer destino CRM real del motor sera HubSpot, pero public runtimes no deben llamar HubSpot ni conocer property names/form GUIDs. La arquitectura requiere mantener atribucion/consent de HubSpot Forms sin que HubSpot sea renderer ni source of truth. Falta convertir el fake/no-op destination de TASK-1229 en un adapter real, testeado y observable.

## Goal

- Implementar adapter server-side para `POST https://api.hsforms.com/submissions/v3/integration/secure/submit/{portalId}/{formGuid}`.
- Mapear canonical submission -> `fields[]`, `context`, `legalConsentOptions` and sanitized error classes.
- Registrar attempts, retries and dead letters via el model canonico de TASK-1229.
- Smoke con HubSpot test form sin activar formularios publicos reales.

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

Reglas obligatorias:

- HubSpot es `destination`, no renderer ni host surface.
- El adapter vive server-side y nunca expone private app token al browser.
- `adapterVersion=hsforms-v3-secure-submit`, `endpointStatus=legacy_supported`, `migrationTarget=date_versioned_forms_submission_api_when_available`.
- `skipValidation` no se usa como bypass normal.
- Contacts API 2026-03 es adapter separado para upsert/enrichment; no reemplaza form-submission history.

## Normative Docs

- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/context/11_hubspot-bowtie.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms Backend/API Parity Foundation (provee el destination interface + outbox/consumer path + state machine de attempts).
- HubSpot private app token. **Reusar el resolver canónico existente** (`hubspot-access-token` en GCP Secret Manager / `HUBSPOT_ACCESS_TOKEN`, vía `gcp:hubspot-access-token` — ver `src/lib/hubspot/list-services-for-company.ts` y `src/lib/sync/projections/hubspot-services-intake.ts`). **Verificar en discovery que el private app tiene scope `forms`** (secure submit lo exige); si requiere un secret nuevo/scoped, seguir higiene de secretos (scalar crudo sin comillas/`\n`, `*_SECRET_REF`, `validateSecretFormat`) y NO crear cliente HubSpot paralelo.
- Un HubSpot test form/form GUID aprobado para smoke.

### Blocks / Impacts

- `TASK-1232` First real form migration.
- Futuras destination policies `hubspot_forms_secure_submit`.
- Coexiste con `TASK-1242` (grader HubSpot lead handoff) — integraciones HubSpot distintas, mismo token + discipline; ver Delta 2026-06-25.

### Files owned

- `src/lib/growth/forms/destinations/hubspot/**` (el adapter — archivos nuevos específicos)
- `src/lib/reliability/queries/growth-forms-hubspot-*.ts` (señales del adapter)
- `docs/tasks/to-do/TASK-1230-growth-forms-hubspot-secure-submit-adapter.md`

Extend/shared (NO owned — propiedad de TASK-1229): `src/lib/growth/forms/**` (interface de destination/attempts), `src/app/api/admin/growth/forms/**` (admin retry/manage). `src/lib/hubspot/**` solo si discovery confirma que un helper compartido pertenece ahí (reusar resolver de token, no duplicar cliente).

## Current Repo State

### Already exists

- HubSpot bridge discipline/skills and existing HubSpot integration patterns elsewhere in repo.
- Architecture docs identify secure Forms submit as V1 supported path.
- TASK-1229 should provide canonical submission/destination attempt primitives.

### Gap

- No HubSpot Forms secure submit adapter exists for Growth Forms.
- No delivery parity evidence exists for consent/attribution from Greenhouse to HubSpot Forms.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `growth.forms destination attempts` + HubSpot Forms submission event
- Consumidores afectados: `destination router`, `ops/retry`, `HubSpot CRM workflows`
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: TASK-1229 destination interface and `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` §22.
- Contrato nuevo o modificado: `hubspot_forms_secure_submit` adapter.
- Backward compatibility: `additive|gated`
- Full API parity: delivery/retry/dead-letter consume canonical command/readers; no manual HubSpot-only path.

### Data model and invariants

- Entidades/tablas/views afectadas: `form_destination`, `form_submission`, `form_submission_consent_snapshot`, `form_destination_attempt`.
- Invariantes que no se pueden romper:
  - Accepted submission is recorded before delivery attempt.
  - Consent snapshot exists independently of HubSpot outcome.
  - Mapping uses allowlisted HubSpot property names from server-side destination config.
  - Raw HubSpot errors/tokens are never stored unsanitized.
  - Adapter does not create deals, quotes or commercial records.
  - **El POST a HubSpot corre en el reactive consumer (ops-worker), NUNCA inline en el route handler de submit de Vercel** (CLAUDE.md §Integraciones/infra: "NUNCA ejecutar POST/PATCH a HubSpot inline en un route handler Vercel — outbox event + reactive consumer"). El submit acepta + emite outbox event (path de TASK-1229); el consumer drena y ejecuta el adapter. Esto compone con el invariante de delivery dispatch que TASK-1229 establece.
  - **Errores capturados vía `captureWithDomain(err, 'integrations.hubspot', { extra })`, NUNCA `Sentry.captureException` directo** (CLAUDE.md §Integraciones/infra; `src/lib/observability/capture.ts` ya define el dominio).
  - **Idempotencia endurecida (no "where possible"):** HubSpot Forms secure submit NO es idempotente server-side — cada POST crea una submission nueva. La garantía de at-most-once delivery exitosa vive en Greenhouse: el state machine de `form_destination_attempt` solo reintenta attempts en estado `failed`, marca `delivered` atómicamente (CHECK + tx), y NUNCA re-entrega una submission ya `delivered`. Retry sin esta guardia duplica leads en HubSpot.
- Tenant/space boundary: internal Efeonce Growth admin config + public submission accepted via surface registry.
- Idempotency/concurrency: at-most-once delivery exitosa garantizada por el state machine de attempts (solo reintenta `failed`, marca `delivered` atómicamente); NO depender de idempotencia de HubSpot (no existe en secure submit).
- Audit/outbox/history: outbox event en la tx de accept (TASK-1229) → reactive consumer ejecuta el adapter; destination attempts append-only; audit para retry/dead-letter; señal dead-letter espejando `src/lib/reliability/queries/hubspot-companies-intake-dead-letter.ts`.

### Migration, backfill and rollout

- Migration posture: `none|additive` depending on TASK-1229 schema completeness.
- Default state: adapter disabled until test form smoke passes.
- Backfill plan: none.
- Rollback path: disable destination adapter/flag, route to fake/manual_only, revert PR.
- External coordination: HubSpot test form/form GUID, private app token/secret, optional HubSpot property review.

### Security and access

- Auth/access gate: server-side secret access only; admin retry/manage via capability.
- Sensitive data posture: contact PII, free text, consent evidence; no secrets in logs.
- Error contract: sanitized provider error classes; no raw HubSpot responses in public API.
- Abuse/rate-limit posture: inherited from public submit; adapter retry policy bounded con **exponential backoff + jitter** y **circuit breaker** (cuando HubSpot está caído, fail-fast hacia dead-letter, no martillar el endpoint); tras N intentos → `dead_letter` (humano interviene).

### Runtime evidence

- Local checks: adapter unit tests with mocked HubSpot responses.
- DB/runtime checks: destination attempt rows and retry/dead-letter state.
- Integration checks: staging smoke against HubSpot test form.
- Reliability signals/logs: `growth.forms.hubspot_submit_failed`, `growth.forms.destination_failure_rate`, `growth.forms.dead_letter_count`.
- Production verification sequence: disabled/default OFF -> staging smoke -> low-risk form only in follow-up.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Adapter delivery, retry and dead-letter are canonical commands/readers, not HubSpot portal manual-only actions.
- [ ] Admin UI/Nexa/CLI future consumers can inspect attempts and request retry through same primitive.
- [ ] Writes remain server-side and propose-confirm-execute compatible when invoked by agent surfaces.
- [ ] Reusar capabilities `growth.forms.destinations.manage` + `growth.forms.retry_delivery` (definidas en domain arch §8 / seedeadas por TASK-1229) — NO crear capabilities nuevas. Si esta task `can()`-checkea alguna, grant a ≥1 ROLE_CODE real + coverage test verde el mismo PR.

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

### Slice 1 — Adapter contract and mapping

- Implement `hubspot_forms_secure_submit` adapter over TASK-1229 destination interface.
- Add mapping validation for HubSpot field names, consent requirements and context fields.
- Add tests for success, validation error, auth error, rate limit, timeout and sanitized failure.

### Slice 2 — Delivery attempts, retry and signals

- Wire adapter into destination router **ejecutado por el reactive consumer (ops-worker), no inline en el submit handler**, behind disabled/configured destination.
- Record attempts and retry/dead-letter outcomes con backoff+jitter+circuit breaker; state machine garantiza at-most-once delivery exitosa.
- Add signals (`captureWithDomain('integrations.hubspot', ...)`) and logs for HubSpot failures without leaking payload/secrets.

### Slice 3 — Test form smoke

- Configure a test destination/form in staging or local secure env.
- Submit representative fixtures through public submit command/API.
- Verify HubSpot received expected form submission context/consent and Greenhouse recorded success.

## Out of Scope

- Public launch of real forms.
- WordPress/Astro renderer work.
- HubSpot workflows/properties creation beyond test form needs.
- CRM Contacts API upsert adapter.
- Deal/quote creation.

## Detailed Spec

Use the HubSpot adapter metadata defined in the ADR. The canonical adapter input is Greenhouse accepted submission + consent snapshot + destination mapping; browser payload is never mapped directly to HubSpot.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3.
- No real HubSpot submit before unit tests and test form config are in place.
- No real production form migration in this task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bad mapping pollutes HubSpot properties | HubSpot | medium | Test form first, mapping allowlist, review gate | `growth.forms.hubspot_submit_failed` |
| Consent payload mismatch | HubSpot/legal | medium | Consent snapshot tests + HubSpot smoke | destination attempt error class |
| Retry duplicates submissions | HubSpot/Growth | medium | Idempotency/dedupe policy and bounded retry | duplicate attempt audit |
| Secret leaks in logs/errors | Security | low | Redaction tests and canonical errors | log scan/capture |

### Feature flags / cutover

- Adapter disabled until configured per destination.
- Optional `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED=false` if repo pattern favors env flags.
- **Si se introduce el flag, registrar su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` el mismo PR** (gate `pnpm docs:closure-check` / feature-flags-audit --strict bloquea el cierre si falta).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert adapter code | <30 min | si |
| Slice 2 | Disable adapter/destination, revert PR | <15 min | si |
| Slice 3 | Disable test destination, revoke test token if needed | <30 min | si |

### Production verification sequence

1. Verify adapter disabled by default.
2. Staging smoke with test form and non-sensitive fixture.
3. Verify Greenhouse attempts + HubSpot submission.
4. Production deploy with adapter available but no real public form cutover.

### Out-of-band coordination required

- HubSpot test form/form GUID.
- Secret/token availability.
- Operator approval before any production HubSpot form receives real public submissions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] HubSpot secure-submit adapter maps canonical submissions to HubSpot body server-side.
- [ ] Consent/context fields are tested and recorded through destination attempts.
- [ ] Retry/dead-letter and sanitized errors work for representative failure classes.
- [ ] Staging/test HubSpot smoke evidence exists or blocker is documented exactly.
- [ ] Adapter is disabled or unconfigured for real public traffic until migration task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm task:lint --task TASK-1230`
- `pnpm ops:lint --changed`
- HubSpot test form smoke with sanitized evidence.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] HubSpot endpoint status/migration target stays documented.
- [ ] Si se introdujo `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`, fila agregada a `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` verde.

## Follow-ups

- `TASK-1232` first real form migration.

## Open Questions

- Which HubSpot portal/test form is used for staging smoke.
- Whether adapter is gated by env flag or only destination config.
