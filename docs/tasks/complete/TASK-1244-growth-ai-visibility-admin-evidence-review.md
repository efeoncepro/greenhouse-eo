# TASK-1244 — Growth AI Visibility: Admin Evidence Review

## Delta 2026-06-25 — integration point con TASK-1245 (complete)

TASK-1245 dejó cableado el lado público de los runs `review_required`: el finalizador del worker materializa `grader_runs.public_delivery_state='in_review'` y **NUNCA auto-publica** el snapshot de un gate `review_required` (el status público responde `in_review`, espera honesta sin token). **Esta task (1244) es quien dispara el publish del snapshot al APROBAR**: el comando de aprobación debe (a) `publishGraderReportSnapshot({ runId })` y (b) actualizar `public_delivery_state='ready'` (o reusar `finalizeRunDelivery` tras mover el gate a publicable) para que el poll público (`GET /run/[handle]`) empiece a devolver el `reportToken`. Al RECHAZAR: dejar `public_delivery_state='unavailable'` (estado final honesto). NO publicar nunca sin aprobación humana (el gate `review_required` ya bloquea el auto-publish del worker).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1239`
- Branch: `task/TASK-1244-growth-ai-visibility-admin-evidence-review`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El **gate humano de release** (EPIC-020 F): cola + comando gobernado para que un operador interno **revise y apruebe/rechace** los reportes `review_required` (de los gates de scoring TASK-1227 + el detector de exactitud TASK-1238) ANTES de que se publiquen al público (snapshot TASK-1239). Cierra el loop de seguridad YMYL: ningún reporte con inexactitud/lenguaje sensible se publica sin ojo humano.

## Why This Task Exists

El scoring (TASK-1227) y el brand accuracy (TASK-1238) escalan reportes a `review_required`, y el publish (TASK-1239) **rechaza** publicar un score gateado. Pero **no existe la pieza que un humano usa para revisar y desbloquear**: hoy un reporte `review_required` queda atascado sin camino de aprobación. Sin esta task, los reportes con riesgo no se pueden publicar nunca (falso bloqueo) ni se aprueban con criterio (falso release). Es el control de release del lead magnet.

## Goal

- Reader de la **cola de revisión**: runs/reportes en `review_required` con su razón (`reviewReasons` + accuracy findings).
- Comandos gobernados `approveAiVisibilityReport(runId)` / `rejectAiVisibilityReport(runId, reason)` (state machine + audit) que marcan el reporte como releasable (o rechazado).
- El publish (TASK-1239) honra la aprobación: un `review_required` aprobado se puede publicar; uno no aprobado, no. (La UI admin es follow-up / botón en el detalle del run existente.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9.3 (`review_required` UX), §10 (admin control plane: report review), §11.2 (`requestAiVisibilityReportReview`/`approveAiVisibilityReport`), §Delta TASK-1238/1239.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — state-machine + CHECK + audit trio.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability interna + grant.

Reglas obligatorias:

- **NUNCA** auto-aprobar: la aprobación es un comando humano gobernado (audit append-only). El LLM no aprueba (loop propose→confirm→execute; el humano confirma).
- State machine explícita del estado de revisión (`review_required → approved | rejected`) con CHECK + audit.
- El publish (TASK-1239) consulta el estado de aprobación: `review_required` sin aprobar NO se publica.
- Capability interna `growth.ai_visibility.report.review` + grant (rol real interno) mismo PR.

## Normative Docs

- `docs/tasks/complete/TASK-1238-growth-ai-visibility-brand-accuracy-monitoring.md` — accuracy → `review_required` (lo que se revisa).
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `review_required`/`reviewReasons` (gates).
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md` — el publish que debe honrar la aprobación.

## Dependencies & Impact

### Depends on

- `TASK-1239` (complete dev) — `publishGraderReportSnapshot` (que hoy rechaza `review_required` sin distinción de aprobado).
- `TASK-1238`/`TASK-1227` (complete) — el estado `review_required` + razones.
- `grader_scores`/`grader_runs` + el endpoint admin detalle del run.

### Blocks / Impacts

- Desbloquea el release público de reportes que requerían revisión (sin esto, se quedan atascados).
- Habilita el control de calidad/seguridad del lead magnet (YMYL).

### Files owned

- `src/lib/growth/ai-visibility/review/**` — cola reader + comandos approve/reject + state machine [verificar estructura].
- `migrations/` — estado de aprobación (columna/tabla additive: `report_review_state` + audit) [verificar].
- `src/lib/growth/ai-visibility/report/snapshot.ts` — el gate de publish honra la aprobación.
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability `report.review` + grant.
- `src/app/api/admin/growth/ai-visibility/**` — endpoints admin de cola + approve/reject.

## Current Repo State

### Already exists

- `review_required` + `reviewReasons` en el score (TASK-1227) + accuracy escalation (TASK-1238).
- `publishGraderReportSnapshot` rechaza `review_required` (TASK-1239) — pero sin camino de aprobación.
- Endpoint admin detalle del run + capability framework + patrón state-machine+audit.

### Gap

- No existe estado de aprobación del reporte ni comandos approve/reject ni cola de revisión.
- El publish no distingue `review_required` aprobado de no aprobado (hoy bloquea ambos).
- No hay capability `report.review`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (approve/reject + state machine) + migration additive (estado).
- Source of truth afectado: estado de aprobación del reporte (additive en `greenhouse_growth`).
- Consumidores afectados: publish (TASK-1239), admin UI (follow-up), reliability.
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `publishGraderReportSnapshot`, score `review_required`, capability framework.
- Contrato nuevo: `approveAiVisibilityReport`/`rejectAiVisibilityReport` + reader de cola + estado `report_review_state` + capability `report.review`.
- Backward compatibility: `additive`.
- Full API parity: comandos gobernados (audit), no click-handler; el publish los consume.

### Data model and invariants

- Entidades afectadas: estado de revisión additive (`report_review_state`: `pending|approved|rejected` + `reviewed_by`/`reviewed_at`/`reason`) + audit append-only.
- Invariantes que no se pueden romper:
  - Transiciones válidas: `pending → approved | rejected` (CHECK); audit en cada cambio.
  - **NUNCA** auto-aprobar; el LLM no aprueba (humano confirma).
  - El publish honra el estado: `review_required` + `approved` → publicable; sino, 409.
  - Capability interna `report.review` + grant mismo PR.
- Tenant/space boundary: interno (admin).
- Idempotency/concurrency: approve idempotente; transición atómica.
- Audit/outbox/history: audit append-only de cada aprobación/rechazo.

### Migration, backfill and rollout

- Migration posture: `additive` (estado de revisión + audit).
- Default state: nuevos `review_required` nacen `pending`.
- Backfill plan: los `review_required` existentes → `pending` (no auto-aprobar).
- Rollback path: revert PR / reverse migration (estado sin uso).
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: `requireInternalTenantContext` + capability `report.review`.
- Sensitive data posture: el reviewer ve la evidencia interna (incl. accuracy findings) — interno, no público.
- Error contract: canónico; `captureWithDomain('growth')`.
- Abuse/rate-limit posture: interno autenticado.

### Runtime evidence

- Local checks: tests de la state machine (transiciones válidas/ inválidas), publish honra aprobación, audit, capability+grant.
- DB/runtime checks: migration verify; el publish de un `review_required` aprobado funciona.
- Reliability signals/logs: cola de pendientes (`report_review_pending`) opcional.
- Production verification sequence: aprobar un `review_required` real → publish → snapshot.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] State machine (CHECK) + audit append-only + no-auto-approve explícitos.
- [ ] Migration additive (estado de revisión) con DO block.
- [ ] Evidencia runtime (tests state machine + publish-honra-aprobación) listada.
- [ ] Capability `report.review` + grant (rol interno real) mismo PR.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Estado de revisión + state machine + capability

- Migración additive (`report_review_state` + audit) + state machine pura (`pending → approved|rejected`) + capability `report.review` + grant.
- Tests de transiciones + grant coverage.

### Slice 2 — Comandos approve/reject + cola reader + publish gate

- `approveAiVisibilityReport(runId)` / `rejectAiVisibilityReport(runId, reason)` (audit) + reader de cola (`review_required` pendientes con razón).
- `publishGraderReportSnapshot` honra la aprobación (review_required aprobado → publicable). Endpoints admin.
- Tests + dry-run (aprobar → publish OK).

## Out of Scope

- La UI admin de revisión (follow-up / botón en el detalle del run existente).
- El público (A) / cliente (E) / HubSpot (D).
- Cambiar los gates de scoring/accuracy (sólo se consume su `review_required`).

## Detailed Spec

El control de release es un state-machine + CHECK + audit (patrón canónico). Los reportes `review_required` (de TASK-1227/1238) nacen `pending`. Un operador interno (capability `report.review`) los aprueba o rechaza con audit. El `publishGraderReportSnapshot` (TASK-1239) deja de rechazar ciegamente `review_required`: ahora consulta el estado — `review_required` + `approved` es publicable; `pending`/`rejected`, no (409). El LLM nunca aprueba (humano confirma). La UI admin (botón aprobar/rechazar en el detalle del run) es follow-up que consume estos comandos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (estado + state machine + capability) → Slice 2 (comandos + cola + publish gate). El publish gate (2) depende del estado (1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Auto-aprobación / LLM aprueba | safety (YMYL) | low | comando humano gobernado + audit; no LLM | code review + test |
| Publish de un review_required no aprobado | safety/legal | medium | el gate del publish consulta el estado (409 si no approved) | test publish-gate |
| Transición inválida (rejected → approved) | data quality | low | CHECK + state machine pura | test transiciones |
| Reportes atascados sin reviewer | ops | medium | cola reader + signal de pendientes | `report_review_pending` |

### Feature flags / cutover

- Sin flag: gated por capability `report.review` (sin grant hasta el rollout). Cutover = grant + UI admin.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (estado additive) + revert PR | <10 min | si |
| Slice 2 | revert PR (comandos + publish gate) | <5 min | si |

### Production verification sequence

1. Migrar estado de revisión + verificar.
2. Staging: un `review_required` real → aprobar (capability) → publish OK; rechazar → publish 409.
3. Prod: vía release control plane junto a EPIC-020.

### Out-of-band coordination required

- N/A — repo/interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Estado de revisión additive (`pending|approved|rejected` + `reviewed_by`/`reviewed_at`/`reason`) con CHECK + audit append-only.
- [ ] `approveAiVisibilityReport`/`rejectAiVisibilityReport` gobernados (audit); NUNCA auto-aprobar; el LLM no aprueba.
- [ ] Reader de cola: `review_required` pendientes con su razón (reviewReasons + accuracy).
- [ ] `publishGraderReportSnapshot` honra la aprobación: `review_required` aprobado publicable; no aprobado → 409.
- [ ] Capability `growth.ai_visibility.report.review` + grant (rol interno real) (guard coverage).
- [ ] Dry-run: aprobar un `review_required` real → publish funciona.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm migrate:up` + verify
- Dry-run aprobar → publish
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` + `EPIC-020` Child Task F
- [ ] chequeo de impacto cruzado (TASK-1238/1239 + admin run detail)

## Follow-ups

- UI admin de revisión (botón aprobar/rechazar + cola en `/admin/growth/ai-visibility`).
- Notificación al reviewer cuando entra un `review_required` (Teams/email).

## Open Questions

1. ¿El estado de revisión vive en `grader_scores` (columna) o en una tabla `grader_report_reviews` (con audit)? Propuesta: tabla dedicada con audit append-only (mejor para historial de revisiones).
2. ¿`requestAiVisibilityReportReview` explícito o el `review_required` del score ya es la solicitud? Propuesta: el `review_required` ES la solicitud (no duplicar); la task añade approve/reject.
3. ¿Rol interno que revisa? Propuesta: `efeonce_admin` + `efeonce_account` (o un rol de growth si existe). Confirmar contra `role-codes.ts`.

## Closure 2026-06-26 — code complete (dev); rollout pendiente

**Open Questions resueltas:**

1. **Estado de revisión:** tabla dedicada `greenhouse_growth.grader_report_reviews` **append-only** (= audit + estado en una sola tabla, espejo de la inmutabilidad de `grader_reports`). El estado vigente de un `(run_id, score_version)` = la fila más reciente; **AUSENCIA de fila = `pending`** → no se toca el writer de scoring (additive puro, backfill no-op).
2. **`requestReview` explícito:** NO. El `review_required` del score (TASK-1227/1238) ES la solicitud; esta task sólo añade approve/reject. La cola = `review_required` sin decisión.
3. **Rol que revisa:** mismo set interno del dominio (`route_group internal ∪ EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN`), NO `efeonce_account` (no estaba en el bloque growth → no se amplió superficie). Rationale: el reviewer del gate YMYL debe ser ≥ privilegiado que el publisher (`report.publish` vive en ese bloque).

**Implementado (2 slices):**

- **Slice 1** — migración `20260626001120742_task-1244-grader-report-reviews.sql` (append-only: CHECK enum + reason-no-vacía-en-rejected + trigger `block_report_review_mutation` + DO anti-marker + GRANTs); state machine pura `review/state.ts` (`resolveReviewTransition`: `pending→approved|rejected`, idempotente, anti-flip terminal); capability `growth.ai_visibility.report.review` (`entitlements-catalog.ts`) + grant (`runtime.ts`).
- **Slice 2** — `review/queries.ts` (`readReportReviewState`, `isReportReviewApproved`, `listPendingReportReviews`); `review/commands.ts` (`approveAiVisibilityReport`/`rejectAiVisibilityReport`); `report/snapshot.ts` honra la aprobación (gate `review_required`+`approved` → publicable; `insufficient_data` jamás); `setPublicDeliveryState` exportado; 3 endpoints admin (`GET /reviews` + `POST /runs/[runId]/review/{approve,reject}`); signal `report_review_pending` (`growth-ai-visibility-public-delivery-signals.ts`).

**Decisiones de diseño clave:**

- **Aprobación ligada a `score_version`:** un re-score (nueva versión `review_required`) NO hereda la decisión → re-revisión obligatoria (anti "approve-once auto-release futuro"; propiedad de seguridad YMYL).
- **Approve idempotente = recovery:** re-aprobar no re-inserta pero re-drivea publish + delivery `ready` (cubre un fallo parcial post-aprobación).
- **Paridad con la publish route:** approve dispara el HubSpot lead handoff (non-fatal) igual que un publish normal — un `review_required` aprobado es un reporte publicado a todos los efectos.

**Evidencia runtime:**

- Migración aplicada+verificada en dev PG (474 tablas, types regen). CHECK (reject sin reason, decision inválido) y append-only (UPDATE/DELETE bloqueados en 2 capas: GRANT + trigger) **ejercitados live**.
- SQL embebida (CTE de la cola + subquery del signal + date-math `INTERVAL '24 hours'`) validada contra PG real (gate TASK-893).
- 16 tests nuevos (7 state machine + 4 publish-gate + 7 commands + 1 signal). Full suite **8092 passed** + `pnpm build` exit 0 + `local:check` (lint+tsc) verdes.

**Rollout pendiente (NO operativamente completo):**

- **Dry-run aprobar→publish sobre un `review_required` real:** no ejecutable en dev (los flags de providers están OFF → no se produce un `review_required` real). Pendiente en **staging** con worker activo + flag ON (gated por EPIC-020).
- **UI admin de revisión:** TASK-1247 (desbloqueada por esta task; cliente puro de los endpoints).
- **Grant a roles operativos** más allá del set interno actual = decisión de cutover (EPIC-020 H / TASK-1246).
- Artefacto de test en dev: una fila `approved` con `score_version='__inv_test__'` quedó en `grader_report_reviews` (append-only, no borrable sin disable trigger; inofensiva — versión bogus que ningún reader real matchea).
