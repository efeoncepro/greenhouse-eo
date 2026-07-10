# TASK-1379 — Roadmap Materialized Index Build-Input Extraction Experiment

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-026`
- Status real: `Complete — no-go; RSS gate failed and runtime cutover rolled back`
- Rank: `TBD`
- Domain: `platform|ops|roadmap|data`
- Blocked by: `none`
- Branch: `task/TASK-1379-roadmap-materialized-index-build-input-experiment`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplazar experimentalmente el escaneo dinámico de 2.493 Markdown por request y su inclusión en tres output traces por un índice Roadmap materializado, conservando Markdown como source of truth. Repetir el baseline de `TASK-1376` para decidir con A/B si el programa modular avanza o emite `no-go`.

## Why This Task Exists

`TASK-1376` probó que `/roadmap` genera un artifact analyzer de 9,61 MB y sus dos endpoints ~8,83 MB cada uno; Turbopack advierte un patrón dinámico de 30.278 archivos. Cada uno de los tres traces arrastra 2.493 Markdown. Separar primero API/admin sería prematuro porque auth, DB, observabilidad y entitlements son los nodos de mayor fanout. Roadmap ofrece una frontera reversible para probar si eliminar filesystem inputs reduce build y RSS antes de crear workspaces o deployables.

## Goal

- Diseñar y construir una proyección materializada que preserve Markdown como SSOT y el contrato `roadmap-work-item-index.v1`.
- Eliminar Markdown de los tres NFT traces Roadmap y reducir al menos 75% sus artifacts analyzer.
- Ejecutar A/B reproducible y emitir `go` o `no-go` para la siguiente fase de `EPIC-026`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1152-roadmap-task-index-reader-markdown-ssot.md`
- `docs/audits/platform/2026-07-10-greenhouse-build-dependency-baseline.md`

Reglas obligatorias:

- Markdown sigue siendo SSOT; la proyección es derivada, reemplazable y read-only.
- No crear `apps/*`, `packages/*`, proyecto Vercel, DB source of truth ni deployable nuevo.
- No degradar auth/capability, parser parity, lifecycle health, filtros ni freshness observable.
- No aceptar la solución por tamaño de archivo solamente: debe cumplir el A/B de duración y RSS.

## Normative Docs

- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/epics/complete/EPIC-026-greenhouse-modular-build-runtime-decoupling.md`

## Dependencies & Impact

### Depends on

- `src/lib/roadmap/work-item-index/**`
- `src/app/api/roadmap/work-items/route.ts`
- `src/app/api/roadmap/work-items/[id]/route.ts`
- `src/app/(dashboard)/roadmap/page.tsx`
- `next.config.ts` `outputFileTracingIncludes`
- `scripts/architecture/build-baseline/**`

### Blocks / Impacts

- Bloquea workspace foundation y cualquier extracción piloto de `EPIC-026`.
- Puede actualizar el ADR modular a `Accepted` o `Rejected` según el A/B.
- Impacta el reader/API Roadmap, pero no su UI visible ni contrato externo.

### Files owned

- `src/lib/roadmap/work-item-index/**`
- `src/app/api/roadmap/work-items/route.ts`
- `src/app/api/roadmap/work-items/[id]/route.ts`
- `next.config.ts`
- `scripts/roadmap/**` o `scripts/architecture/build-baseline/**` para materialización/medición
- `docs/audits/platform/2026-07-XX-roadmap-materialized-index-ab.md`
- ADR/arquitectura/EPIC/task/handoff/changelog relacionados

## Current Repo State

### Already exists

- Reader tipado, parser, health y cache bajo `src/lib/roadmap/work-item-index/`.
- API read-only y capability interna vigentes desde `TASK-1152/1153`.
- Markdown bundleado por `outputFileTracingIncludes` para dos endpoints; la página Roadmap lo hereda por import.
- Baseline reproducible y analyzer evidence de `TASK-1376`.

### Gap

- El reader resuelve paths dinámicos y obliga a Turbopack a considerar 30.278 archivos.
- No existe artifact/proyección materializada con freshness, hash, schema version y fallback gobernados.
- No hay comparación A/B que pruebe si eliminar `docs/**` reduce p50/RSS del build completo.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/roadmap/work-item-index/** + scripts/roadmap/** + next.config.ts`
- Future candidate home: `remain-shared`
- Boundary: `roadmap-work-item-index.v1 materialized projection; portal/API consume el reader, Markdown authoring sigue en docs/**`
- Server/browser split: `materializador y reader server-only; browser recibe únicamente DTOs allowlisted del API existente`
- Build impact: `elimina docs/{epics,tasks,mini-tasks,issues}/** de output traces y reemplaza filesystem glob dinámico por un artifact acotado`
- Extraction blocker: `freshness, parser parity, auth/capability y fallback del índice derivado`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `Markdown bajo docs/** permanece SSOT; cambia su proyección derivada runtime`
- Consumidores afectados: `Roadmap UI, GET /api/roadmap/work-items, endpoint [id], agentes internos`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `roadmap-work-item-index.v1`, parsers/health de `src/lib/roadmap/work-item-index/**`, capability Roadmap vigente.
- Contrato nuevo o modificado: manifest materializado versionado con `schemaVersion`, source hash, generatedAt, item count y health/freshness.
- Backward compatibility: `compatible`; payload API no cambia salvo metadata aditiva si se justifica.
- Full API parity: la UI y agentes siguen consumiendo el reader/API canónico; nunca leen el artifact ni Markdown desde browser.

### Data model and invariants

- Entidades/tablas/views afectadas: `none` por defecto; una opción persistida requiere ADR explícito dentro de Slice 1 antes de implementación.
- Invariantes:
  - Markdown sigue siendo SSOT y el materializador nunca lo reescribe.
  - Mismo corpus produce resultado determinista y hash estable.
  - Índice stale/corrupto falla de forma honesta o usa fallback explícito; nunca devuelve backlog vacío como válido.
  - Parser health y canonical/legacy behavior mantienen paridad con `TASK-1152`.
- Tenant/space boundary: backlog interno, protegido por la capability/session vigente; sin `space_id` público.
- Idempotency/concurrency: generación atómica temp→rename; mismo source hash es no-op; readers nunca observan archivo parcial.
- Audit/outbox/history: manifest con hash/timestamp/counts; reliability signal o log canónico para stale/corrupt/missing; sin outbox porque no muta negocio.

### Migration, backfill and rollout

- Migration posture: `none` salvo que Slice 1 apruebe una persistencia aditiva mediante ADR.
- Default state: `shadow`; generar/probar paridad antes de cambiar el reader.
- Backfill plan: materializar corpus completo, comparar item-by-item y health contra reader actual.
- Rollback path: restaurar reader filesystem + `outputFileTracingIncludes`; revert PR, sin data repair.
- External coordination: `none` para artifact repo/build; opciones object storage/DB que requieran env/deploy quedan fuera sin aprobación adicional.

### Security and access

- Auth/access gate: session/capability Roadmap vigente, sin relajación.
- Sensitive data posture: metadata operativa interna; no rutas absolutas, env, secrets ni contenido Markdown completo en logs.
- Error contract: `roadmap_index_missing|stale|corrupt|schema_mismatch|generation_failed`, sanitizados.
- Abuse/rate-limit posture: cache read-through y límites del endpoint existente; materialización no ocurre por request.

### Runtime evidence

- Local checks: parser/manifest/parity/failure tests; baseline 3 clean + 5 warm por variante.
- DB/runtime checks: N/A si artifact; si se propone persistencia, smoke read-only y rollback obligatorio.
- Integration checks: endpoints lista/[id], página Roadmap y capability denial sin cambio de payload/semántica.
- Reliability signals/logs: freshness/hash/counts y fallos canónicos verificables.
- Production verification sequence: staging shadow/parity → staging cutover → A/B build → decisión; production solo si gates pasan y release separado es aprobado.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence is listed for reader/API behavior and A/B build evidence.
- [ ] Canonical errors, freshness signal and redaction posture are implemented.

<!-- ZONE 2 — PLAN MODE: completar al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Projection decision and contract

- Comparar build artifact, object storage y proyección persistida por determinismo, freshness, rollback, auth, costo y build isolation.
- Elegir la opción más pequeña que pueda cumplir el A/B; documentar decisión y schema versionado antes de escribir el cutover.

### Slice 2 — Materializer and parity

- Extraer el parsing completo a un comando/materializador determinista, atómico y sanitizado.
- Probar paridad item-by-item, relaciones, health y legacy behavior contra el reader vigente.

### Slice 3 — Shadow reader and failure contract

- Hacer que el reader pueda consumir la proyección en shadow, validar source hash/freshness/schema y degradar con errores canónicos.
- Verificar lista, detalle, filtros, capability denial y corpus stale/corrupt/missing.

### Slice 4 — Build-input cutover

- Retirar el glob dinámico y `outputFileTracingIncludes` de Roadmap solo después de paridad verde.
- Confirmar cero Markdown en los tres NFT traces y ejecutar `next experimental-analyze --output`.

### Slice 5 — A/B and architecture verdict

- Ejecutar ≥3 clean y ≥5 warm por variante con mismo commit/máquina/workers.
- Publicar audit A/B y actualizar ADR `Accepted` o `Rejected`; no dejar un resultado ambiguo.

## Out of Scope

- Crear workspaces, packages, apps o proyectos Vercel.
- Extraer admin/API, cambiar URLs, auth, cookies o Cloud SQL.
- Editar Markdown desde UI/API.
- Rediseñar la UI Roadmap.
- Activar production o hacer deploy como parte automática de la task.

## Detailed Spec

El índice materializado debe incluir como mínimo `schemaVersion`, `generatedAt`, `sourceCommit`, `sourceHash`, `itemCount`, counts por kind/lifecycle, parse warnings y los DTOs `roadmap-work-item-index.v1`. Debe escribirse atómicamente y nunca registrar paths absolutos. El reader valida schema/hash/freshness antes de responder.

Gates A/B obligatorios derivados de TASK-1376:

- cero Markdown en traces Roadmap;
- reducción ≥75% de artifacts analyzer contra 9,61/8,83/8,83 MB;
- reducción ≥10% de p50 clean (baseline 138 s) o de una fase atribuible con evidencia;
- reducción ≥10% de p95 warm RSS (baseline 7,51 GB);
- duración warm no empeora >5%;
- payload, auth y parser parity permanecen compatibles.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`decision/schema → materializer/parity → shadow/failures → tracing cutover → A/B/verdict`. No retirar Markdown de traces antes de paridad y rollback verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Índice stale muestra backlog viejo | Roadmap | medium | source hash + freshness gate + fallback | `roadmap_index_stale` |
| Paridad legacy se pierde | parser/data | medium | comparación item-by-item y fixtures | mismatch count/health |
| Build mejora solo en analyzer | build | high | A/B full build con RSS/tiempo | no alcanza 10% |
| Artifact parcial/corrupto | runtime | low | temp→rename + schema/hash | `roadmap_index_corrupt` |
| Se introduce nuevo SoT | governance | low | Markdown SSOT explícito; proyección reemplazable | writes fuera de docs |

### Feature flags / cutover

- Shadow/cutover por configuración local o constante server-only con default filesystem durante parity.
- Production no cambia hasta release separado; rollback inmediato al reader filesystem.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–2 | revertir schema/materializer | <30 min | sí |
| 3 | desactivar shadow reader | <10 min | sí |
| 4 | restaurar reader + tracing includes | <30 min | sí |
| 5 | publicar `no-go`, preservar audit | <1 h | sí |

### Production verification sequence

1. Tests/parity local.
2. Shadow local y staging con corpus real.
3. Cutover staging + endpoint/page/capability smoke.
4. A/B build y decisión arquitectónica.
5. Production solo mediante release posterior aprobado si todos los gates pasan.

### Out-of-band coordination required

La opción artifact local/build no requiere coordinación externa. Object storage, DB, env o deploy nuevos requieren aprobación y ADR antes de ampliar alcance.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Artifact gzip fue seleccionado, implementado experimentalmente y evaluado con rollback/TCO.
- [x] Materializer determinista/atómico conservó Markdown como SSOT durante el experimento.
- [x] Paridad parser/reader/health/legacy pasó 32/32 antes del A/B.
- [x] Missing/stale/corrupt/schema mismatch tuvieron errores canónicos en la variante experimental.
- [x] Endpoints y página conservaron el reader/API contract; auth/capability no se modificaron.
- [x] NFT traces experimentales contuvieron cero Markdown.
- [x] Analyzer Roadmap redujo 88,6–96,2%, sobre el target de 75%.
- [x] A/B incluyó 3 clean y 5 warm post-cambio contra el baseline TASK-1376.
- [x] Gate compuesto evaluado: clean p50 mejoró 19,9%, warm quedó dentro de +5%, pero RSS p95 **falló** (+9,8%); resultado `no-go`.
- [x] ADR queda `Rejected` y EPIC-026 detenido/cerrado.
- [x] No se crearon apps/packages/proyectos ni se hizo deploy.
- [x] Variante runtime fue revertida; reader filesystem vigente mantiene el Backend/Data Contract original.

## Verification

- `pnpm architecture:build-baseline:test`
- focal tests de `src/lib/roadmap/work-item-index/**`
- `pnpm architecture:build-baseline inventory`
- clean/warm A/B según audit TASK-1376
- `next experimental-analyze --output`
- inspección de `.nft.json` sin `docs/**`
- `pnpm task:lint --task TASK-1379`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1379 --runtime --docs`

## Closing Protocol

- [x] lifecycle/carpeta/README/registry sincronizados.
- [x] Handoff/changelog/contexto reflejan resultado real.
- [x] Audit A/B y ADR/arquitectura/EPIC sincronizados.
- [x] QA Release Auditor y Documentation Governor invocados para cierre.
- [x] Artifacts permanecen gitignored; `.generated/**` experimental fue eliminado.

## Follow-ups

- Workspace foundation y spike admin/control-plane quedan cancelados bajo EPIC-026.
- Mantener enforcement extraction-ready de TASK-1377.
- Una futura reconsideración requiere hipótesis distinta y task/ADR nuevos; no repetir el gzip Roadmap.

## Open Questions

- Resuelta: artifact gzip generado en prebuild, atómico y gitignored. Es la opción más reversible, sin infraestructura ni nuevo source of truth; DB/object storage quedan descartados para este experimento.

## Completion Evidence

- Audit: `docs/audits/platform/2026-07-10-roadmap-materialized-index-ab.md`.
- Analyzer: `/roadmap` -88,6%; endpoints -96,2%; Markdown refs 0.
- Post A/B: clean p50 110.676 ms; warm p50/p95 103.252/113.264 ms; warm RSS p95 8.245.166.080 B.
- Verdict: `no-go` por RSS +9,8% contra target ≤-10%.
- Rollback aplicado antes de commit: runtime, tracing, prebuild, generated artifact y errores experimentales restaurados/removidos.

## Execution Audit

- Branch override confirmado: ejecución en `develop`, sin push/deploy.
- Worktree contiene scripts ajenos untracked; quedan fuera del scope.
- Ejecución secuencial: filesystem source → materializer → runtime reader → tracing → A/B.
