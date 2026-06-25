# TASK-1242 — Growth AI Visibility: HubSpot Lead Handoff

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|crm|integrations`
- Blocked by: `TASK-1240`
- Branch: `task/TASK-1242-growth-ai-visibility-hubspot-lead-handoff`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el lead capturado en el intake público (`grader_leads`, TASK-1240) en un **lead de ventas en HubSpot** (EPIC-020 D): `syncAiVisibilityRunToHubSpot` crea/actualiza el contact/company + props `ai_visibility_*` (score, `primary_gap`, `recommended_motion`) + lifecycle stage, vía el patrón **outbox + reactive consumer** (no POST inline en la route). Cierra el bow-tie: el grader (acquisition) entrega el lead a ventas (SQL).

## Delta 2026-06-25 — frontera con el HubSpot destination adapter del Forms engine (TASK-1230)

Hay **dos caminos de escritura a HubSpot en el dominio `growth`** que NO deben confundirse ni colapsar en un tercer cliente:

| Esta task (1242) — lead/CRM handoff | TASK-1230 — form submission delivery |
|---|---|
| `grader_leads` → upsert contact/company + back-fill props `ai_visibility_*` + lifecycle | una *submission* de cualquier form del motor → HubSpot **Forms** API (`/submissions/v3/.../secure/submit`) |
| Vía el **Cloud Run hubspot bridge** (patrón integraciones) | Vía el **destination adapter** del forms engine (TASK-1229 path) |
| Dispara al **completar el run** del grader | Dispara al **aceptar un submit** |

Son **complementarios, no redundantes** (uno es backfill CRM orientado a ventas; el otro es la entrega gobernada de submissions de cualquier form del motor). Frontera dura compartida: ambos **reusan el resolver de token canónico** + `captureWithDomain(err,'integrations.hubspot',…)`; **NUNCA** un cliente HubSpot paralelo. Si el grader migra su intake al forms engine (convergencia TASK-1229/1232), evaluar si este handoff sigue siendo un paso aparte (probable) o se modela como `destination` adicional del submission — decisión diferida, fuera de esta task.

## Why This Task Exists

El intake público (TASK-1240) captura el lead (email + consent + marca) pero **no lo sincroniza a HubSpot** — el lead muere en `grader_leads` sin llegar a ventas. El valor comercial del lead magnet es justamente el handoff: el reporte ya produce `primary_gap` + `recommended_motion` (TASK-1235) que orientan el siguiente movimiento comercial. Sin esto, el grader genera leads que nadie trabaja.

## Goal

- Command `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)` que upserta el contact/company + props `ai_visibility_*` + lifecycle, vía outbox + reactive (idempotente, sin POST inline).
- Disparo del handoff al completar el run público (lead + score + reporte listos), respetando consent + sin PII sensible cruda.
- Reliability signal del handoff (lag/fallo) + estado en `grader_leads.hubspot_synced_at`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` + `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Run hubspot bridge, patrón de write a HubSpot.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — outbox event + reactive consumer (NUNCA POST/PATCH inline en route Vercel); `captureWithDomain`.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — declarar el evento outbox.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.8 (HubSpot handoff), §11.2 (`syncAiVisibilityRunToHubSpot`).
- **Invocar la skill `hubspot-greenhouse-bridge`** al tocar el bridge/props/secretos.

Reglas obligatorias:

- **NUNCA** ejecutar POST/PATCH a HubSpot inline en un route handler Vercel: outbox event + reactive consumer (Cloud Run hubspot bridge).
- **NUNCA** `Sentry.captureException` directo: `captureWithDomain(err, 'integrations.hubspot'|'commercial', …)`.
- Idempotente por `idempotencyKey` (el outbox/reactive ya es at-least-once); respetar consent (no sync sin consent).
- Sólo back-fill de props `ef_*`/`ai_visibility_*` (no sincronizar Greenhouse → pipelines `0-162`).

## Normative Docs

- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md` — `grader_leads` (email/consent/run_id/`hubspot_synced_at`).
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — `primary_gap` + `recommended_motion` (del reporte).
- Skill `seo-aeo` `efeonce/AI_VISIBILITY_GRADER.md` + `commercial-expert` (bow-tie, lifecycle).

## Dependencies & Impact

### Depends on

- `TASK-1240` (complete dev) — `grader_leads` con el lead + consent + run_id.
- `TASK-1235` (complete) — `readGraderReport` → `primary_gap`/`recommended_motion`.
- Cloud Run hubspot-greenhouse-integration bridge + HubSpot custom properties `ai_visibility_*` (out-of-band).

### Blocks / Impacts

- Cierra el bow-tie del lead magnet (acquisition → ventas).
- Alimenta el "AI Visibility Snapshot" (artefacto de ventas en HubSpot/Account 360).
- Coexiste con el HubSpot **destination adapter** del Forms engine (`TASK-1230`) — integraciones HubSpot distintas, mismo token + discipline; ver Delta de frontera 2026-06-25.

### Files owned

- `src/lib/growth/ai-visibility/hubspot/**` — `syncAiVisibilityRunToHubSpot` + mapper props + publisher de outbox event [verificar estructura].
- `src/lib/sync/**` — reactive consumer del evento [verificar].
- `src/lib/reliability/queries/growth-ai-visibility-*.ts` — signal del handoff.
- `migrations/` — sólo si se requiere estado/cola adicional (preferir reusar `grader_leads.hubspot_synced_at` + outbox).

## Current Repo State

### Already exists

- `grader_leads` con `email`/`consent`/`run_id`/`profile_id`/`hubspot_synced_at` (TASK-1240).
- `readGraderReport` → `primaryGap`/`recommendedMotion` + el score persistido.
- Outbox/reactive infra (`greenhouse_sync.outbox_events`) + Cloud Run hubspot bridge + `captureWithDomain`.

### Gap

- No existe `syncAiVisibilityRunToHubSpot` ni el mapper a props `ai_visibility_*`.
- No hay outbox event ni reactive consumer del handoff.
- Las HubSpot custom properties `ai_visibility_*` no existen aún (out-of-band).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (HubSpot write vía outbox).
- Source of truth afectado: HubSpot (contact/company props) + `grader_leads.hubspot_synced_at`.
- Consumidores afectados: ventas (Account 360 / HubSpot), el "AI Visibility Snapshot".
- Runtime target: `staging` + `production` gated.

### Contract surface

- Contrato existente a respetar: outbox event catalog, Cloud Run hubspot bridge, `grader_leads`, `readGraderReport`.
- Contrato nuevo: `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)` + outbox event `growth.ai_visibility.lead_handoff` + reactive consumer + mapper props.
- Backward compatibility: `additive`.
- Full API parity: command server-side reusable (no click-handler); el handoff lo dispara el run completo, no la UI.

### Data model and invariants

- Entidades afectadas: `grader_leads` (UPDATE `hubspot_synced_at`), HubSpot contact/company (upsert vía bridge).
- Invariantes que no se pueden romper:
  - **NUNCA** POST/PATCH HubSpot inline en route: outbox + reactive.
  - **NUNCA** sync sin consent (`grader_leads.consent = TRUE`).
  - Idempotencia por `idempotencyKey`; el reactive re-lee de PG (no estado en memoria).
  - Sólo props `ai_visibility_*`/`ef_*`; no tocar pipelines `0-162`.
- Tenant/space boundary: lead público/pre-tenant; el binding a company sigue el matching del bridge.
- Idempotency/concurrency: outbox state machine + `hubspot_synced_at` como guard.
- Audit/outbox/history: el outbox event ES el ledger.

### Migration, backfill and rollout

- Migration posture: `none` (reusa `grader_leads` + outbox); additive sólo si se requiere cola dedicada.
- Default state: detrás del flag del intake (no hay leads hasta que TASK-1240 esté ON) + flag propio si se quiere gating extra.
- Backfill plan: leads ya capturados sin sync → re-disparar el handoff (idempotente).
- Rollback path: flag OFF / revert PR; el outbox event no consumido se descarta.
- External coordination: **crear las HubSpot custom properties `ai_visibility_*`** + verificar el bridge.

### Security and access

- Auth/access gate: el handoff corre server-side (reactive worker); sin endpoint público nuevo.
- Sensitive data posture: email = PII con consent (Ley 21.719); no enviar raw provider text a HubSpot.
- Error contract: `captureWithDomain('integrations.hubspot'|'commercial', …)`; sin raw HubSpot errors al cliente.
- Abuse/rate-limit posture: el handoff es interno (post-run); respeta los rate limits del bridge.

### Runtime evidence

- Local checks: tests del mapper (lead+reporte → props), idempotencia, no-sync-sin-consent.
- DB/runtime checks: outbox event emitido + `hubspot_synced_at` actualizado.
- Integration checks: smoke contra HubSpot sandbox/staging (contact upsert + props).
- Reliability signals/logs: `growth.ai_visibility.lead_handoff_lag`/`_failed`, steady=0.
- Production verification sequence: lead real → outbox → bridge → contact en HubSpot con props.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Outbox + reactive (no POST inline), idempotencia y consent-gate explícitos.
- [ ] Migration posture explícita (reusa grader_leads/outbox); props HubSpot como out-of-band.
- [ ] Evidencia runtime (tests + smoke HubSpot staging) listada.
- [ ] Sin raw HubSpot errors al cliente; `captureWithDomain`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mapper + command + outbox event

- `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)`: lee `grader_leads` + `readGraderReport` → mapper a props `ai_visibility_*` (score, `primary_gap`, `recommended_motion`, lifecycle).
- Publica outbox event `growth.ai_visibility.lead_handoff` (catalog). Consent-gate. Tests del mapper + idempotencia.

### Slice 2 — Reactive consumer + bridge write + estado

- Reactive consumer re-lee de PG y llama al Cloud Run hubspot bridge (upsert contact/company + props); actualiza `grader_leads.hubspot_synced_at`.
- Reliability signal + smoke HubSpot staging.

## Out of Scope

- La página pública (EPIC-020 C / TASK-1241).
- Crear las HubSpot custom properties (out-of-band; documentar cuáles).
- Sincronizar Greenhouse → pipelines `0-162`.
- El "AI Visibility Snapshot" UI en Account 360 (follow-up).

## Detailed Spec

El handoff sigue el patrón canónico HubSpot del repo: **outbox event + reactive consumer**, NUNCA POST inline. El command lee el lead (`grader_leads`) + el reporte (`readGraderReport`) y mapea a props `ai_visibility_*`. El consent es gate duro (no sync sin consent). El bridge (Cloud Run) hace el upsert; `hubspot_synced_at` marca el estado + idempotencia. Las custom properties HubSpot se crean out-of-band (documentar el set exacto).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mapper + command + outbox) → Slice 2 (reactive consumer + bridge + estado). El consumer (2) consume el evento que emite el command (1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| POST HubSpot inline → bloquea/timeouts route | reliability | low | outbox + reactive (patrón canónico) | `lead_handoff_lag` |
| Sync sin consent (PII) | legal (Ley 21.719) | medium | consent-gate duro + test | code review |
| Props HubSpot inexistentes → fallo silencioso | integration | medium | crear props out-of-band + validar en smoke | `lead_handoff_failed` |
| Doble sync del mismo lead | data quality | low | idempotencia + `hubspot_synced_at` guard | test idempotencia |

### Feature flags / cutover

- Sin flag nuevo obligatorio (gateado de facto por el intake OFF → no hay leads). Opcional flag de gating del handoff. Cutover = el intake genera leads + el consumer corre.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (command/mapper/event) | <5 min | si |
| Slice 2 | flag/consumer OFF + revert PR | <10 min | si |

### Production verification sequence

1. Crear HubSpot custom properties `ai_visibility_*` (out-of-band).
2. Staging: lead real → outbox → reactive → contact en HubSpot con props + `hubspot_synced_at`.
3. Verificar idempotencia (re-disparo no duplica) + signals en steady.
4. Prod: vía release control plane junto a EPIC-020.

### Out-of-band coordination required

- **Crear las HubSpot custom properties `ai_visibility_*`** (portal 48713323).
- Verificar el Cloud Run hubspot bridge acepta el upsert.
- Coordinar con TASK-1240 (consent) + TASK-1241 (cuándo se completa el flujo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `syncAiVisibilityRunToHubSpot(runId, idempotencyKey)` lee lead + reporte → props `ai_visibility_*`; idempotente; consent-gate.
- [ ] Outbox event + reactive consumer (NUNCA POST inline); el consumer re-lee de PG.
- [ ] `grader_leads.hubspot_synced_at` refleja el estado; re-disparo no duplica.
- [ ] Reliability signal del handoff (lag/fallo) en steady; `captureWithDomain`.
- [ ] Smoke HubSpot staging: contact/company upsert con props.
- [ ] Sin PII sensible cruda ni raw provider/HubSpot text a HubSpot/cliente.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- Smoke HubSpot staging (contact upsert)
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` + `EVENT_CATALOG` (evento nuevo) + `EPIC-020` Child Task D
- [ ] chequeo de impacto cruzado (TASK-1240/1241 + Account 360)

## Follow-ups

- "AI Visibility Snapshot" en Account 360 (artefacto de ventas que lee estas props).
- Re-sync al re-correr el grader (tendencia en HubSpot).

## Open Questions

1. ¿Qué set exacto de HubSpot custom properties `ai_visibility_*`? Propuesta: `ai_visibility_score`, `ai_visibility_primary_gap`, `ai_visibility_recommended_motion`, `ai_visibility_report_url`, `ai_visibility_as_of`. Confirmar con commercial + el bridge.
2. ¿Lifecycle stage del lead (MQL/SQL)? El score bajo = alta necesidad → posible MQL automático. Decidir con `commercial-expert` (bow-tie).
