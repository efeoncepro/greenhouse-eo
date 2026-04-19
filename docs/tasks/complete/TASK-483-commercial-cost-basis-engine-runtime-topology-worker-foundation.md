# TASK-483 — Commercial Cost Basis Engine Runtime Topology & Worker Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada: worker desplegado en Cloud Run con WIF, scheduler activo y smoke run validado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir e implementar la topología runtime del motor `Commercial Cost Basis` con un modelo híbrido y un **worker dedicado**: el portal mantiene el quote builder interactivo y lecturas livianas, mientras `commercial-cost-worker` absorbe materializaciones pesadas, backfills, recomputes orquestados y foundations batch del programa. Esta task evita que `TASK-477` a `TASK-482` terminen empujando cómputo intensivo a routes request-response o ampliando `ops-worker` como hogar permanente.

## Closure Delta 2026-04-19

- `commercial-cost-worker` quedó desplegado en Cloud Run `us-east4` con auto-deploy GitHub Actions -> WIF -> Cloud Run, sin llaves estáticas nuevas.
- El scheduler `commercial-cost-materialize-daily` quedó habilitado sobre el servicio dedicado.
- Se ejecutó smoke real contra la revisión `commercial-cost-worker-00002-9xj`: HTTP `200`, `source_sync_runs` en `succeeded` y snapshot `bundle` con `56` writes / `0` failed.
- La primera corrida detectó un bug real de ambigüedad SQL en `client_labor_cost_allocation`; quedó corregido de raíz en `src/lib/commercial-cost-attribution/member-period-attribution.ts` usando alias explícito y test de regresión.

## Why This Task Exists

El programa `Commercial Cost Basis` ya existe como backlog (`TASK-476` a `TASK-482`), pero todavía no tiene una decisión de infraestructura explícita. Hoy el repo ya demuestra dos patrones distintos:

- `services/ops-worker/` resuelve materializaciones y lanes reactivos pesados fuera de Vercel.
- `services/ico-batch/` resuelve materializaciones batch/AI de larga duración.
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` resuelve cálculo síncrono para request-response.
- `greenhouse_sync.source_sync_runs` y `greenhouse_context.*` ya ofrecen una base reusable para tracking y contexto de corridas.
- `greenhouse_serving.member_capacity_economics`, `greenhouse_serving.commercial_cost_attribution` y `greenhouse_serving.provider_tooling_snapshots` ya materializan parte importante de la foundation de costo.

Si el cost basis engine crece sin una topología clara, el riesgo es triple:

- recomputar snapshots o blends pesados dentro de APIs del portal,
- duplicar lógica entre runtime interactivo y jobs batch,
- dejar sin ownership claro la observabilidad, idempotencia y reprocessing del pricing/cost engine.

Tras revisar `ops-worker` como servicio real, aparece un riesgo adicional: ese worker ya es una pieza operativa compartida y sensible para backlog reactivo, recovery, email y jobs institucionales. Montar ahí el lane comercial como hogar permanente mezclaría blast radius, recursos y deploy cadence de dos subsistemas distintos.

## Goal

- Formalizar el runtime híbrido `portal interactive lane + Cloud Run compute lane` para Commercial Cost Basis.
- Definir qué jobs se quedan síncronos en el builder y cuáles deben vivir en worker.
- Crear la foundation de worker/endpoints/run tracking para materialización y orchestration batch del programa, reutilizando contratos existentes antes de inventar otros.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PIPELINE_SCALABILITY_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- Vercel/Next.js se reserva para request-response interactivo y lecturas livianas.
- Cómputo pesado, fan-out, backfills y recomputes masivos deben vivir en Cloud Run o primitiva GCP equivalente.
- El runtime pesado de `Commercial Cost Basis` vive en un worker dedicado; `ops-worker` no es su hogar canónico.
- Toda query o materialización tenant-aware filtra por `space_id` cuando aplique.
- El worker reutiliza `getDb()`, `query()` y patrones runtime del repo; no crea conectividad PostgreSQL ad hoc.
- `Commercial Cost Basis` no recalcula métricas inline si ya existe snapshot/materialización canónica reusable.

## Normative Docs

- `docs/tasks/to-do/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md`
- `docs/tasks/to-do/TASK-478-tool-provider-cost-basis-snapshots.md`
- `docs/tasks/to-do/TASK-479-people-actual-cost-blended-role-snapshots.md`
- `docs/tasks/to-do/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md`
- `docs/tasks/to-do/TASK-482-quoted-vs-actual-margin-feedback-loop.md`
- `docs/tasks/complete/TASK-254-operational-cron-durable-worker-migration.md`
- `docs/tasks/complete/TASK-346-quotation-pricing-costing-margin-health-core.md`

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `services/ico-batch/server.ts`
- `services/ico-batch/deploy.sh`
- `src/lib/sync/reactive-run-tracker.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/commercial/service-catalog-expand.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/providers/provider-tooling-snapshots.ts`
- `src/lib/commercial/sellable-roles-store.ts`

### Blocks / Impacts

- `TASK-477`
- `TASK-478`
- `TASK-479`
- `TASK-480`
- `TASK-482`
- `TASK-466`

### Files owned

- `services/commercial-cost-worker/**`
- `src/lib/commercial-cost-basis/**`
- `src/lib/commercial-cost-worker/**`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/commercial/service-catalog-expand.ts`
- `src/lib/sync/reactive-run-tracker.ts`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

## Current Repo State

### Already exists

- `ops-worker` ya materializa `commercial_cost_attribution` vía `POST /cost-attribution/materialize`.
- `ico-batch` ya demuestra el patrón de batch/worker HTTP para jobs largos de serving y AI.
- El pricing engine actual del quote builder corre en modo síncrono dentro del portal y sirve bien para previews livianos.
- Ya existen stores/materializaciones reusables para `member_capacity_economics`, `commercial_cost_attribution` y `provider_tooling_snapshots`.
- `source_sync_runs` ya sirve como ledger base de corridas, y `greenhouse_context` permite guardar contexto rico sin inflar ese ledger.
- `commercial-cost-worker` ya existe como servicio Cloud Run productizable con deploy automatizado por WIF, endpoints activos para `people`, `tools` y `bundle`, y scheduler base diario.
- `greenhouse_commercial.commercial_cost_basis_snapshots` ya existe como manifiesto por `scope + period + run`, enlazado a `greenhouse_sync.source_sync_runs`.

### Gap

- `TASK-477` a `TASK-482` todavía deben completar la matemática y los contratos de dominio que consumen este runtime.
- `roles`, `quotes/reprice-bulk` y `margin-feedback/materialize` siguen reservados hasta que sus tasks hijas implementen el payload y la lógica final.
- `docs/architecture/schema-snapshot-baseline.sql` quedó desactualizado frente a varias tablas/columnas del lane comercial y no puede tomarse como inventario exhaustivo sin corrección.

## Scope

### Slice 1 — Runtime topology contract

- Declarar y aterrizar el modelo híbrido: `interactive quote lane` en portal, `compute lane` en Cloud Run.
- Definir criterios binarios de placement: preview síncrono, recompute scoped, backfill, repricing bulk, feedback loop, scheduler, retry.
- Formalizar que la v1 vive en un worker dedicado (`commercial-cost-worker` / `pricing-engine-worker`) y no en `ops-worker`.
- Dejar explícito que `ops-worker` y `ico-batch` son referencias de patrón, no el hogar canónico del nuevo lane.

### Slice 2 — Worker HTTP foundation

- Crear la familia inicial de endpoints/job contracts para un worker dedicado de Commercial Cost Basis.
- Incluir auth, input shape, run tracking, observabilidad y códigos de salida consistentes con el resto de workers.
- Reutilizar `source_sync_runs` + `greenhouse_context` como base de tracking antes de crear otra tabla de runs.
- Cubrir al menos materialización batch de foundations ya existentes/reutilizables:
  - people cost basis sobre `member_capacity_economics`
  - tooling/provider cost basis sobre `provider_tooling_snapshots`
  - orchestration/composición del basis comercial para consumidores posteriores
- Dejar endpoints reservados/documentados para `roles`, `reprice-bulk` y `margin-feedback`, pero no exigir matemática final que pertenece a `TASK-477`, `TASK-480` y `TASK-482`.

### Slice 3 — Portal boundary hardening

- Mantener `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` como lane interactivo y prohibir que haga recomputes batch o joins pesados cross-domain.
- Reutilizar snapshots/materializaciones ya resueltas por worker para que el builder solo haga composición y arithmetic liviana.
- Dejar guardrails documentados para `TASK-480` y `TASK-481`.

### Slice 4 — Deployment & architecture sync

- Dejar deploy contract, runbook mínimo y docs de arquitectura alineadas.
- Registrar ownership operativo del lane para mantenimiento, alerting y replay/backfill.
- Explicitar la frontera con `ops-worker`: integración mínima, pero sin compartir el mismo servicio como runtime base.

## Out of Scope

- Implementar por completo la matemática de `TASK-477`, `TASK-478`, `TASK-479` o `TASK-480`.
- Rediseñar el quote builder o sus surfaces UX.
- Mover todo el pricing interactivo a un modelo exclusivamente asíncrono.
- Introducir una topología nueva de Cloud SQL o separar infraestructura staging/production en esta task.
- Reemplazar `commercial_cost_attribution` o `member_capacity_economics` como truths actuales; esta task debe apoyarse en ellos, no reescribirlos.

## Detailed Spec

La decisión base de esta task es un runtime de dos carriles:

1. **Portal interactive lane**
   - vive en Next/Vercel;
   - resuelve lectura de snapshots, selección de inputs, arithmetic liviana, previews y explainability de UI;
   - no materializa blends pesados ni hace bulk recompute.

2. **Cloud Run compute lane**
   - vive en un worker dedicado del dominio comercial;
   - materializa y orquesta snapshots reusables de role/tool/people/provider cuando la foundation ya exista;
   - corre backfills, recomputes y orchestration batch del programa;
   - expone jobs HTTP idempotentes y observables.

Regla explícita:

- `ops-worker` puede seguir orquestando lanes reactivos y jobs operativos existentes.
- `Commercial Cost Basis` no debe usar `ops-worker` como hogar permanente porque introduciría contention de CPU/memoria/concurrency, deploy coupling y blast radius compartido con el pipeline reactivo institucional.
- La integración correcta entre ambos lanes, si hace falta, debe ser por eventos, endpoints o contratos explícitos, no por mezclar handlers en el mismo servicio.

Jobs esperables de esta foundation:

- `POST /cost-basis/materialize` — orchestration de corrida comercial por periodo/scope
- `POST /cost-basis/materialize/tools` — foundation tooling/provider
- `POST /cost-basis/materialize/people` — foundation member capacity / actual people cost
- `POST /cost-basis/materialize/roles` — reservado para follow-on sobre `TASK-477`
- `POST /quotes/reprice-bulk` — reservado para follow-on sobre `TASK-480`
- `POST /margin-feedback/materialize` — reservado para follow-on sobre `TASK-482`

La task debe aterrizar ese worker dedicado con naming, deploy, auth, run tracking y observabilidad propios. La decisión de aislamiento ya no queda abierta. La v1 no debe fingir que el catálogo/modelo de roles o el feedback loop ya están listos; debe dejar su runtime target preparado sin mezclar scope.

## Acceptance Criteria

- [x] Existe una decisión runtime explícita y aplicada para Commercial Cost Basis con separación clara entre lane interactivo del portal y lane de cómputo pesado en un worker dedicado de Cloud Run.
- [x] Existe una foundation de worker HTTP dedicado para Commercial Cost Basis con auth, run tracking y observabilidad reusando contratos existentes del repo.
- [x] El quote builder / pricing interactivo consume snapshots o resolvers livianos y no absorbe materializaciones batch inline.
- [x] La foundation batch cubre al menos `people` y `tools/provider` con contratos explícitos, y deja `roles` / `reprice-bulk` / `margin-feedback` documentados como follow-on del programa.
- [x] `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` y `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` quedan sincronizados con la topología elegida y explican por qué no se usa `ops-worker` como runtime base.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `docker build -f services/commercial-cost-worker/Dockerfile .`
- validación manual del endpoint/worker elegido en staging o entorno equivalente

### Verification Run 2026-04-19

- `pnpm build` ok
- `pnpm lint` ok
- `pnpm exec vitest run src/lib/commercial-cost-attribution/member-period-attribution.test.ts` ok
- GitHub Actions `commercial-cost-worker-deploy` ok: runs `24629415478` y `24629615574`
- Cloud Run ready revision: `commercial-cost-worker-00002-9xj`
- Smoke run vía Cloud Scheduler manual: HTTP `200`
- DB trace validada:
  - `source_sync_runs.triggered_by = 'commercial_cost_worker'`
  - `sync_run_id = commercial-cost-6382a7ca-50fb-403c-b2c0-33dfba0f5503`
  - snapshot `ccb:bundle:2026-04:global:commercial-cost-6382a7ca-50fb-403c-b2c0-33dfba0f5503`
  - `records_written = 56`, `records_failed = 0`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] la decisión final dejó explícito el nombre/ownership del worker dedicado y la frontera con `ops-worker`

## Follow-ups

- `TASK-478`
- `TASK-479`
- `TASK-480`
- `TASK-481`
- `TASK-482`
