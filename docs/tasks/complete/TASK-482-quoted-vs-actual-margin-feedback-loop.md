# TASK-482 — Quoted vs Actual Margin Feedback Loop

## Delta 2026-04-21 — Cierre V1 (Claude Opus 4.7)

Merge candidate en rama `task/TASK-482-quoted-vs-actual-margin-feedback-loop`. Cubre Slice 1 y Slice 3 completos; Slice 2 queda como stub activable cuando TASK-452 aterrice.

**Qué aterrizó:**

- `src/lib/commercial-intelligence/margin-feedback-materializer.ts` — orchestrator `runMarginFeedbackBatch({year?, month?, monthsBack?})` que invoca `materializeProfitabilityForPeriod` + `materializeContractProfitabilityForPeriod` por ventana de períodos (idempotente, UPSERT preservado en ambos).
- Lectura agregada post-materialización: drift p50/p90/maxAbs/sampleSize + bucket counts por `drift_severity` + `topDriftByPricingModel` (top 5 por drift medio absoluto) tanto para quotation como contract. **Sin tabla nueva** — las señales viajan en el outbox event.
- `publishMarginFeedbackBatchCompleted` en `quotation-events.ts` con payload `{runId, periods, quotationCount, contractCount, calibrationSignals, serviceGrainAvailable}`. Nuevo aggregateType `margin_feedback` + eventType `commercial.margin_feedback.batch_completed` registrados en event catalog.
- Worker glue en `src/lib/commercial-cost-worker/margin-feedback.ts` (normalizer + runner) siguiendo el patrón de `materialize.ts` y `quote-reprice-bulk.ts`.
- `services/commercial-cost-worker/server.ts` — reemplaza el stub 501 de `/margin-feedback/materialize` con handler real `handleMarginFeedback`. Elimina el helper `notImplemented` ya sin uso.
- `services/commercial-cost-worker/deploy.sh` — nuevo scheduler `margin-feedback-materialize-daily` cron `10 5 * * *` (10min post cost-basis bundle), timezone `America/Santiago`.
- Docs funcionales en `docs/documentation/operations/commercial-cost-worker.md` sección "Margin Feedback Loop (TASK-482)" con body, response shape, notas operativas y trigger manual vía `pnpm staging:request`.

**Decisiones pinned:**

- No se abre tabla nueva. Las calibration signals viajan en el outbox event; consumers que necesiten historial persistido arman su propia proyección.
- Slice 2 (grain service_id) queda detrás de un probe runtime (`information_schema.tables` chequea existencia de `greenhouse_serving.service_attribution`). Flipea a `serviceGrainAvailable: true` automáticamente cuando TASK-452 materialice la tabla — no necesita deploy intermedio.
- Scheduler offset +10min vs cost-basis base: garantiza `commercial_cost_attribution` fresca cuando el feedback loop calcula drift. Si el base retrasa, el feedback usa el snapshot previo y converge en el siguiente run.
- `runId = mfb-{uuid}` para correlacionar con `greenhouse_sync.source_sync_runs` futuro y con el event payload downstream.

**Verificación local:** `pnpm tsc --noEmit` clean · `pnpm lint` clean (solo warning pre-existente en BulkEditDrawer) · `pnpm test` **1572/1572** · `pnpm build` OK.

**Out of scope confirmado:**

- UI analytics del feedback loop (dashboard dedicado) — follow-up cuando el consumer demande visualización.
- Recalibración automática del catálogo — declarado out-of-scope en la spec original.
- Persistencia histórica de calibration signals — el outbox event es la capa de distribución; proyecciones viven en consumers.

**Follow-ups derivados:**

- Cuando TASK-452 cierre, extender `margin-feedback-materializer.ts` con `loadServiceDrift(periods)` + `topDriftByServiceModel` en calibrationSignals. El probe `serviceGrainAvailable` ya soporta el flip.
- Consumer reactivo (admin dashboard o alertas Slack) del evento `commercial.margin_feedback.batch_completed` — fuera del scope de esta task.

## Delta 2026-04-20 — Reanclaje contra codebase real

La revisión del repo mostró que el loop base ya existe:

- `greenhouse_serving.quotation_profitability_snapshots` ya compara margen cotizado vs ejecución atribuida a nivel quote
- `greenhouse_serving.contract_profitability_snapshots` ya existe para el anchor contractual

Por eso esta task deja de ser "crear el feedback loop" y pasa a ser el follow-on que:

1. converge esos snapshots bajo el worker dedicado
2. los mejora con grain servicio cuando `TASK-452` exista
3. deja señales de calibración más explícitas para cost basis

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-452`
- Branch: `task/TASK-482-quoted-vs-actual-margin-feedback-loop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Converger y profundizar el feedback loop de rentabilidad ya existente. Esta task ya no crea desde cero la comparación quoted-vs-actual; la endurece sobre `commercial-cost-worker`, la acerca a grain servicio y deja señales más útiles para recalibrar cost basis y pricing assumptions.

## Why This Task Exists

Greenhouse ya tiene snapshots de profitability por quote y por contract, pero todavía faltan tres cosas:

- una materialización batch explícita en `commercial-cost-worker`
- convergencia con atribución por servicio para explicar drift con mayor precisión
- señales de calibración más reutilizables para follow-ons del lane comercial

## Goal

- materializar el feedback loop en el worker dedicado
- mejorar la explicación del drift con servicio/atribución cuando exista `TASK-452`
- dejar outputs consumibles para recalibración posterior

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/to-do/TASK-452-service-attribution-foundation.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

Reglas obligatorias:

- El feedback loop consume serving/attribution; no recalcula heurísticas opacas inline.
- La comparación debe mantener provenance suficiente para explicar el desvío.
- La materialización batch de este loop debe vivir en `commercial-cost-worker`, sobre `POST /margin-feedback/materialize`, no en `ops-worker`.

## Dependencies & Impact

### Depends on

- `src/lib/commercial-intelligence/profitability-materializer.ts`
- `src/lib/commercial-intelligence/contract-profitability-materializer.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/contracts-store.ts`
- `services/commercial-cost-worker/server.ts`

### Blocks / Impacts

- recalibración futura del cost basis

### Files owned

- `src/lib/commercial-intelligence/profitability-materializer.ts`
- `src/lib/commercial-intelligence/contract-profitability-materializer.ts`
- `services/commercial-cost-worker/server.ts`
- `docs/documentation/operations/commercial-cost-worker.md`

## Current Repo State

### Already exists

- `quotation_profitability_snapshots`
- `contract_profitability_snapshots`
- quote y contract anchors ya convergidos
- `TASK-483` ya dejó `commercial-cost-worker` operativo y reservó `POST /margin-feedback/materialize` como runtime target para esta task

### Gap

- El endpoint batch dedicado sigue reservado
- El drift todavía se explica sin grain servicio
- No existe una salida consolidada de calibración posterior al snapshot base

## Scope

### Slice 1 — Comparison contract

- Converger los contratos quote/contract profitability en una salida batch explícita para margin feedback.

### Slice 2 — Read model

- Extender la comparación para aprovechar `TASK-452` cuando exista attribution fact por `service_id`.

### Slice 3 — Calibration signals

- Dejar outputs consumibles para recalibrar assumptions/modeling futuros sin mutar el catálogo automáticamente.

## Out of Scope

- UI completa de analytics.
- Recalibración automática del catálogo.
- Rehacer los snapshots base ya implementados.

## Acceptance Criteria

- [ ] `POST /margin-feedback/materialize` deja de estar reservado y corre en `commercial-cost-worker`
- [ ] El feedback loop reutiliza las snapshots de profitability ya existentes en vez de duplicarlas
- [ ] La comparación aprovecha `TASK-452` cuando exista attribution fact por servicio
- [ ] Queda base para recalibrar assumptions comerciales posteriores

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
