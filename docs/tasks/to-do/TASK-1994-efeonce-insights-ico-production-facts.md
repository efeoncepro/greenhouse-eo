# TASK-1994 — Efeonce Insights: más indicadores de producción ICO (ciclo, throughput, velocidad, piezas trabadas, atrasos, SLO y revisiones)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño; inventario de tarjetas de Insights aprobado por el operador el 2026-10-03`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `TASK-1990` (Greenhouse como canal del tablero y glifo por indicador); SLO dentro del plazo depende de `CT_SLO_PCT_METRIC_ENABLED` (TASK-918)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El informe de Insights trae de ICO sólo entregas a tiempo (OTD), primera correcta (FTR), rondas por pieza (RpA) y
piezas completadas. El motor ICO ya calcula por space y mes el ciclo de producción, el throughput, la velocidad del
pipeline y las piezas trabadas, y la base de tareas ya trae los contadores de versiones y comentarios de revisión. Esta
task lleva esos indicadores al adapter ICO como hechos, con Greenhouse en el título del tablero y un glifo Trazo por
indicador, como aprobó el operador el 2026-10-03, respetando el estado de confianza de cada métrica.

## Why This Task Exists

El tablero `Cifras-Canal-Inventario` del canvas <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB> marca tres grupos
ICO como «existe, no llega a Insights». Verificado el 2026-10-03:

- `buildMetricValuesFromRow` (`src/lib/ico-engine/read-metrics.ts`) devuelve `cycle_time`, `cycle_time_variance`,
  `throughput`, `pipeline_velocity`, `stuck_assets` y `stuck_asset_pct` por space; el adapter ICO
  (`src/lib/efeonce-insights/adapters/ico-adapter.ts`) sólo mapea `rpa`, `otd_pct` y `ftr_pct`
  (`ICO_SNAPSHOT_METRIC_IDS`).
- `overdue_carried_forward` está en el registro (`src/lib/ico-engine/metric-registry.ts`) y la fila del snapshot trae
  `overdue_carried_forward_count`, pero `buildMetricValuesFromRow` no lo devuelve.
- `cycle_time_slo_pct` existe sólo con `CT_SLO_PCT_METRIC_ENABLED` (default OFF; flip gobernado por TASK-918).
- Los contadores `frame_versions`, `frame_comments` y `open_frame_comments` existen en las filas de tareas que lee
  `src/lib/projects/get-project-detail.ts` (BigQuery); vienen de propiedades de Notion que una automatización llena
  desde Frame.io, sin integración directa (TASK-020 sigue abierta). El origen exacto del contador está por confirmar.

## Goal

- El adapter ICO emite por space y mes: ciclo de producción (días), throughput, velocidad del pipeline, piezas
  trabadas, atrasos arrastrados y, con el flag ON, el porcentaje dentro del SLO de ciclo.
- Versiones y comentarios de revisión llegan como hechos sólo si el origen del contador queda confirmado y leído por
  un reader dueño del dominio ICO.
- Cada hecho hereda el estado de confianza del motor (suprimido, baja confianza) como ya hace RpA; nunca se promedian
  spaces.
- El contrato de contenido reconoce los hechos nuevos y el planner los pone en el tablero de producción con
  Greenhouse en el título.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§15)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Notion = OS, Greenhouse = motor)
- skill `greenhouse-ico` y skill `efeonce-insights`

Reglas obligatorias:

- El adapter consume sólo readers del motor ICO (`src/lib/ico-engine/**`); si falta uno (atrasos arrastrados,
  contadores de revisión), se agrega allí.
- Meses calendario completos (grano del dueño) y nunca un promedio entre spaces.
- Se hereda `dataStatus` y la confianza de cada métrica; una métrica suprimida no se emite y deja rechazo con causa.
- `cycle_time_slo_pct` no se emite con el flag OFF ni se calcula en Insights.
- Notion no es fuente: el canal del tablero es Greenhouse; los contadores de revisión declaran su origen (Frame.io vía
  propiedades de Notion) en `method`.
- Dirección declarada: ciclo, piezas trabadas, atrasos, versiones y comentarios son «menor es mejor».

## Normative Docs

- `docs/tasks/to-do/TASK-918-cycle-time-canonical-shadow-flip.md`
- `docs/tasks/to-do/TASK-020-frameio-bigquery-analytics-pipeline.md`
- `docs/tasks/to-do/TASK-1960-efeonce-insights-report-per-contracted-service.md` (evidencia ICO acotada por servicio)

## Dependencies & Impact

### Depends on

- `TASK-1990`: canal `greenhouse` y `frameio`, glifos `reloj`, `velocidad`, `pausa`, `calendario`, `objetivo`,
  `checklist`, `assets`.
- Motor ICO materializado por space y mes (`readSpaceMetrics`).

### Blocks / Impacts

- `TASK-1996`: tablero de producción con Greenhouse en el título.
- `TASK-1960`: cuando el informe se acote por servicio, estos hechos se acotan igual que RpA y OTD.
- `TASK-1903`: el agente redactor recibe más indicadores de producción.

### Files owned

- `src/lib/efeonce-insights/adapters/ico-adapter.ts`
- `src/lib/efeonce-insights/adapters/adapters.test.ts`
- `src/lib/efeonce-insights/presentation/content-contract.ts`
- `src/lib/efeonce-insights/editorial/criterion-figures.ts`
- `src/lib/ico-engine/read-metrics.ts` (devolver `overdue_carried_forward`)
- `src/lib/ico-engine/review-activity-reader.ts` (nuevo, contadores de revisión por space y mes; sólo si se confirma el origen)
- `src/lib/copy/insights.ts`

## Current Repo State

### Already exists

- Adapter ICO con `otd`, `ftr`, `rpa`, `delivered.completed`, metas y bandas (`target.*`, `band.*`).
- `readSpaceMetrics` y `buildMetricValuesFromRow` con ciclo, throughput, velocidad y piezas trabadas por space.
- `ICO_METRIC_REGISTRY` con `overdue_carried_forward` y, con flag, `cycle_time_slo_pct`.
- Contadores de revisión en filas de tareas (`get-project-detail.ts`).

### Gap

- Ningún indicador fuera de OTD, FTR, RpA y piezas completadas llega a Insights.
- `overdue_carried_forward` no sale de `buildMetricValuesFromRow`.
- No hay reader del motor ICO para contadores de revisión por space y mes, ni confirmación de su origen.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/adapters/ico-adapter.ts` y readers en `src/lib/ico-engine/**`, en el runtime del portal y del ops-worker
- Future candidate home: `domain-package`
- Boundary: el motor ICO es la única fuente de los indicadores; Insights los mapea a hechos y el planner arma el tablero
- Server/browser split: readers y adapter server-only (Postgres y BigQuery del motor); contrato y planner sin I/O
- Build impact: `none`
- Extraction blocker: el motor ICO comparte el pool Postgres y el cliente BigQuery del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `snapshot mensual por space del motor ICO (readSpaceMetrics) y filas de tareas de delivery con contadores de revisión (sólo lectura)`
- Consumidores afectados: `plan editorial, modelo web, PDF/deck, lanes y MCP de Insights, agente redactor`
- Runtime target: `Vercel + ops-worker (generación) + Job artifact-worker (render)`

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1`, `ico_report_adapter_v1`, `MetricValue` del motor ICO
- Contrato nuevo o modificado: hechos `cycle_time`, `throughput`, `pipeline_velocity`, `stuck_assets`, `overdue_carried_forward`, `cycle_time_slo_pct` (con flag), `review.versions`, `review.comments` (con origen confirmado); `overdue_carried_forward` en `buildMetricValuesFromRow`; reader de actividad de revisión
- Backward compatibility: `compatible` — aditivo; consumers actuales de `buildMetricValuesFromRow` reciben una métrica más
- Full API parity: `los hechos viajan por el contrato de evidencia; el reader nuevo vive en el motor ICO`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura del snapshot ICO y de las tareas de delivery`
- Invariantes que no se pueden romper:
  - grano space × mes calendario completo; nunca promedio entre spaces;
  - se hereda la confianza del motor; métrica suprimida ⇒ rechazo con causa;
  - `cycle_time_slo_pct` sólo con `CT_SLO_PCT_METRIC_ENABLED` ON;
  - los contadores de revisión no entran sin origen confirmado y documentado;
  - agregar `overdue_carried_forward` a `buildMetricValuesFromRow` no cambia ningún otro valor (test de los consumers actuales).
- Write-target allowlist: `N/A — sólo lectura`
- Tenant/space boundary: `spaces de la organización (greenhouse_core.spaces.organization_id), como el adapter actual`
- Idempotency/concurrency: `determinista por mes`
- Audit/outbox/history: `sin eventos nuevos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — aditivo detrás de INSIGHTS_EDITORIAL_V2_ENABLED; SLO detrás de su flag`
- Backfill plan: `ninguno`
- Rollback path: `revert + redeploy`
- External coordination: `confirmar con delivery el origen de los contadores de Frame.io en Notion`

### Security and access

- Auth/access gate: `sin cambio`
- Sensitive data posture: `indicadores agregados por space; sin datos personales`
- Error contract: `rechazos con causa; captureWithDomain(err, 'insights', …)`
- Abuse/rate-limit posture: `N/A — sin superficie nueva`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights src/lib/ico-engine`
- DB/runtime checks: `preview-edition --editorial-v2 --plan-only` de una edición ICO de Sky
- Integration checks: `tablero de producción con Greenhouse en el título en el plan`
- Reliability signals/logs: `rechazos por métrica suprimida en rejections`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Ciclo, throughput y velocidad

- Hechos `cycle_time` (días, menor es mejor), `throughput` (piezas) y `pipeline_velocity` por space y mes desde
  `readSpaceMetrics`, con confianza heredada y comparación con el mes anterior.

### Slice 2 — Piezas trabadas, atrasos y SLO

- `stuck_assets` y `overdue_carried_forward` (agregado a `buildMetricValuesFromRow` sin cambiar los demás valores) y
  `cycle_time_slo_pct` sólo con `CT_SLO_PCT_METRIC_ENABLED` ON.

### Slice 3 — Versiones y comentarios de revisión

- Confirmar y documentar el origen de `frame_versions` y `frame_comments` (propiedad de Notion, automatización que la
  llena, tabla de BigQuery). Si se confirma: reader `review-activity-reader.ts` en el motor ICO por space y mes y
  hechos `review.versions`/`review.comments`. Si no se confirma: veredicto `no_evidence` documentado y slice cerrado
  sin código.

### Slice 4 — Contrato de contenido, planner y verificación

- Reglas nuevas (`outcome` para ciclo, velocidad, trabadas, atrasos, SLO y revisiones; `work_delivered` para
  throughput), `CONTENT_CONTRACT_VERSION` subido, tablero de producción y vista previa real de Sky.

## Out of Scope

- Flip de `CT_SLO_PCT_METRIC_ENABLED` o de la fórmula canónica de ciclo (TASK-918).
- Integración directa con Frame.io (TASK-020).
- Acotar por servicio (TASK-1960).
- Render (TASK-1996).

## Detailed Spec

| Cifra | Hecho | Fuente | Glifo | Dirección |
|---|---|---|---|---|
| Ciclo de producción | `cycle_time` | `readSpaceMetrics` | reloj | menor es mejor |
| Throughput | `throughput` | `readSpaceMetrics` | assets | más es mejor |
| Velocidad | `pipeline_velocity` | `readSpaceMetrics` | velocidad | más es mejor |
| Piezas trabadas | `stuck_assets` | `readSpaceMetrics` | pausa | menor es mejor |
| Atrasos arrastrados | `overdue_carried_forward` | `readSpaceMetrics` (extendido) | calendario | menor es mejor |
| Dentro del SLO | `cycle_time_slo_pct` | `readSpaceMetrics` con flag | objetivo | más es mejor |
| Versiones / comentarios | `review.versions` / `review.comments` | reader nuevo (si se confirma) | Frame.io según TASK-1990 | menor es mejor |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1990 en develop antes del Slice 4 (canal y glifo). Slices 1, 2 y 3 son independientes; Slice 4 cierra.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ciclo con fórmula legacy leído como canónico | ICO / lectura | medium | `method` declara la fórmula vigente y su versión | revisión del operador |
| Agregar una métrica a `buildMetricValuesFromRow` altera consumers actuales | ICO | low | test de no regresión de los consumers | tests del motor |
| Contador de revisión con origen ambiguo | data | medium | Slice 3 sólo entrega con origen confirmado | veredicto `no_evidence` |
| Promedio entre spaces | data | low | grano por space; test | tests del adapter |

### Feature flags / cutover

- Sin flag propio: aditivo detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (ON). `cycle_time_slo_pct` respeta
  `CT_SLO_PCT_METRIC_ENABLED` (OFF hoy).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–2 | revert | < 15 min | si |
| Slice 3 | revert del reader y los hechos | < 15 min | si |
| Slice 4 | revert de reglas y planner | < 15 min | si |

### Production verification sequence

1. Local: vista previa de Sky.
2. Staging: edición interna revisada por el operador.
3. Producción por el control plane; edición interna revisada antes de compartir.

### Out-of-band coordination required

- Confirmación con el equipo de delivery del origen de los contadores de revisión en Notion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El adapter ICO emite ciclo, throughput y velocidad por space y mes con confianza heredada (test con métrica suprimida).
- [ ] `buildMetricValuesFromRow` devuelve `overdue_carried_forward` y los demás valores no cambian (test).
- [ ] `cycle_time_slo_pct` sólo aparece con `CT_SLO_PCT_METRIC_ENABLED` ON (test con el flag en ambos estados).
- [ ] El origen de los contadores de revisión queda documentado; existe el reader y sus hechos, o el veredicto `no_evidence` con causa.
- [ ] Ningún hecho promedia spaces (test).
- [ ] `CONTENT_CONTRACT_VERSION` sube y los gates del contrato pasan.
- [ ] La vista previa de Sky muestra el tablero de producción con Greenhouse en el título; el resumen queda en la task.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights src/lib/ico-engine`
- `pnpm test` (suite completa al cierre)
- `scripts/insights/preview-edition.ts --editorial-v2` con Sky
- `pnpm task:lint --task TASK-1994`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.
- [ ] Delta en TASK-020 con el origen confirmado de los contadores.

## Follow-ups

- Si TASK-020 integra Frame.io de forma directa, el reader de revisión cambia de fuente sin cambiar el hecho.

## Open Questions

- ¿Las piezas trabadas se muestran como conteo o como porcentaje (`stuck_asset_pct`)? Propuesta: conteo, con el
  porcentaje en la lectura.
