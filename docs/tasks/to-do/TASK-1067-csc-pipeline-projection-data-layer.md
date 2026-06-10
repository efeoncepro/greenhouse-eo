# TASK-1067 — CSC pipeline projection data layer (funnel view-model + adapters)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|agency|data|ui|platform`
- Blocked by: `none` (consume el health resolver de TASK-1066 cuando exista; degrada a `neutral` mientras tanto)
- Branch: `task/TASK-1067-csc-pipeline-projection-data-layer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Darle **inteligencia y datos reales** al patrón `GreenhouseFunnelChartCard` (hoy alimentado con mock en el lab). Modela una **projection server-only** `resolveCscPipelineProjection` (CQRS read-side, patrón TASK-835/611) que compone los readers ICO/delivery existentes en el view-model exacto que el card consume — el card queda 100% presentación, la projection es el cerebro. El data layer espeja la arquitectura del card (primitive + kinds): **un contrato `FunnelPipelineViewModel` único + adapters por kind**, materializando primero el adapter `cscPipeline`. Grano canónico **asset (default cliente) + tarea (toggle/drill interno)**; **NUNCA proyecto como unidad** (decisión de semántica ICO — el proyecto es scope/filtro, no chevron).

## Why This Task Exists

`GreenhouseFunnelChartCard` quedó canonizado como primitive con sub-primitivas internas (`GreenhouseFunnelHeaderControls`, `GreenhouseFunnelKpiStrip`, `GreenhouseFunnelStageSegment`, `GreenhouseFunnelStageRail`, `GreenhouseFunnelDiagnosticsGrid`) + un advisor Nexa (`GreenhouseNexaGreeting kind='funnelStageAdvisor'`). Pero **no tiene consumidor productivo** — solo vive en `ChartsLabView` con datos hardcodeados. La presentación está resuelta; **falta la capa de datos que le da vida**.

Modelar esa capa requiere decisiones de semántica ICO que se tomaron en sesión de diseño (2026-06-09) y deben quedar canonizadas:

1. **Grano:** el CSC pipeline es **task/asset-grain por construcción** — `fase_csc` es atributo de la tarea (`buildTaskStatusToCscPhaseSql`); una tarea está en **exactamente una** fase. Un **proyecto es multi-fase** (tiene tareas en Briefing *y* Producción *y* Revisión al mismo tiempo) → no puede ocupar un chevron. El proyecto es **scope/drill**, no unidad contada. (Un funnel "lifecycle de proyecto" sería otro `kind`, NO `cscPipeline`.)
2. **Semántica de "retención":** el card hoy llama "Retención 29.7%" a un **WIP ratio** (volumen Entrega/Briefing), que NO es conversión. Modelo (A) WIP-snapshot honesto vs (B) cohort-conversion (requiere `task_status_transitions`, TASK-908). Arrancamos (A) con labels honestos; (B) = V2.
3. **Inteligencia:** health por etapa (resolver TASK-1066), rollup de pipeline, insight desde AI signals reales (`readOrganizationAiSignals`), y el packet de contexto de Nexa con **allowlist anti-PII** (los `ownerName` NUNCA van crudos al LLM).

## Goal

- Existe un contrato `FunnelPipelineViewModel` versionado (SSOT del shape que el card consume) + interfaz `PipelineSource` (adapter por kind), con el adapter `cscPipeline` materializado.
- `resolveCscPipelineProjection({ subject, organizationId, grain, period })` compone los 4 planos (volumen, diagnósticos por fase, KPIs org-level, inteligencia) desde readers canónicos, server-only, con cache + degradación honesta + reliability signal.
- El grano contado es **asset | tarea** (toggle); el scope acepta **org | proyecto | sprint | member**; el proyecto NUNCA es chevron.
- El card recibe la projection casi 1:1 con sus props (cero cambio de presentación), incluido el `nexaContext` allowlist que alimenta `onNexaPromptSubmit` → Nexa (`src/lib/ai/`).
- Labels honestos: nada de "Retención/Conversión" sobre un WIP ratio; KPIs mapeados a métricas ICO reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Contrato_Metricas_ICO_v1.md` + `docs/architecture/metrics/*` — semántica de las métricas ICO + CSC phases.
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — boundary Notion=OS / Greenhouse=motor (el funnel computa desde Greenhouse, NUNCA desde formula Notion).
- `docs/architecture/ui-platform/PRIMITIVES.md` — contrato del `GreenhouseFunnelChartCard` (consumer de esta projection).
- Patrón projection canónico: `docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md` (runtime projection + cache + degradación honesta + reactive invalidation) y `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (TASK-611 — projection + subject scope + degraded enum).
- Skills: `greenhouse-ico` (semántica métricas + cadena causal + boundary), `arch-architect` (4-pillar + CQRS read-side + projection pattern), `greenhouse-ux` + `dataviz-design` (el consumer).

Reglas obligatorias:

- **NUNCA** computar una métrica ICO fuera de su helper canónico — el funnel **consume** readers, no recomputa fórmulas (boundary ICO).
- **NUNCA** el card recomputa nada: la projection es SSOT, el card renderiza (CQRS read-side).
- **NUNCA** proyecto como unidad contada del `cscPipeline`. Unidad = asset | tarea. Proyecto = scope/drill.
- **NUNCA** etiquetar un WIP ratio como "Retención/Conversión". Modelo (A) → label honesto ("% del volumen inicial" / "distribución por fase").
- **NUNCA** mandar PII (`ownerName`, emails) al prompt de Nexa. Allowlist de facts ICO (patrón `ALLOWED_FACT_CODES`, TASK-872/TASK-1019).
- **NUNCA** `$0` ni verde falso ante data faltante: degradación honesta (`dataStatus: loading|ready|empty|degraded` + `degradedSources[]`), patrón TASK-835/611.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery', { tags: { source: 'csc_pipeline_projection' } })`.
- **NUNCA** reader de fase que haga N+1 por fase — una query agrupada.
- Server-only enforce (`import 'server-only'`) en projection + adapters + readers.

## Normative Docs

- `docs/tasks/to-do/TASK-1066-funnel-stage-semantic-health-encoding.md` — el resolver de salud que esta projection consume (health por etapa + rollup).
- `docs/tasks/to-do/TASK-1063-organization-detail-mockup-runtime-parity-completion.md` + `docs/tasks/in-progress/TASK-1059-organization-workspace-enterprise-detail-runtime.md` + `TASK-1061` — el consumer real (org-detail) donde el funnel aterriza.
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md` — el drill `/nexa/insights/[id]` al que apunta el `onAction` del insight.
- `~/.claude/skills/greenhouse-ico/SKILL.md` + `metrics-canonical-index.md`.

## Dependencies & Impact

### Depends on

- **Readers existentes (reuso, verificados por discovery 2026-06-09):**
  - `computeMetricsByContext(dimensionKey, dimensionValue, periodYear, periodMonth)` → `cscDistribution: [{phase,label,count,pct}]` — `src/lib/ico-engine/read-metrics.ts`.
  - `readOrganizationIcoMetricsFromBigQuery({organizationId, periodYear, periodMonth, mode})` → `{otd_pct, ftr_pct, rpa_avg, cycle_time_avg_days, stuck_asset_count, throughput_count, ...}` — `src/lib/account-360/organization-ico-metrics-source.ts`.
  - `getOrganizationOperationalServing(organizationId)` (PG-first → BQ fallback) — `src/lib/account-360/get-organization-operational-serving.ts`.
  - `readOrganizationAiSignals(organizationId, limit)` → AI signal items — `src/lib/ico-engine/ai/read-signals.ts`.
  - `buildTaskStatusToCscPhaseSql` + `CSC_PHASES` + `CSC_PHASE_LABELS` — `src/lib/delivery/task-status-canonical.ts` + `src/lib/ico-engine/metric-registry.ts`.
- **TASK-1066** — `resolveStageOperationalHealth` + `resolvePipelineHealth` (health plane). No hard-block; degrada a `neutral` si aún no existe.
- **Nexa agent** — `src/lib/ai/greenhouse-agent.ts` / `src/lib/ai/google-genai.ts` (consumidor del packet allowlist).

### Blocks / Impacts

- **TASK-1059 / TASK-1061 / TASK-1063** (org-detail runtime) — esta projection es lo que les permite renderizar el funnel con datos reales en vez de mock. Coordinar el wiring (Slice 5) con esas tasks.
- Cualquier consumer futuro del `GreenhouseFunnelChartCard` con kind `cscPipeline`.

### Files owned

- `src/lib/ico-engine/csc-pipeline/types.ts` — contrato `FunnelPipelineViewModel` + `PipelineSource` + `FunnelPipelineGrain` + `dataStatus` enum `[verificar ubicación final del módulo en discovery]`
- `src/lib/ico-engine/csc-pipeline/projection.ts` — `resolveCscPipelineProjection` (server-only)
- `src/lib/ico-engine/csc-pipeline/csc-adapter.ts` — adapter `cscPipeline`
- `src/lib/ico-engine/csc-pipeline/phase-diagnostics-reader.ts` — `readCscPhaseDiagnosticsForOrganization` (NUEVO)
- `src/lib/ico-engine/csc-pipeline/nexa-context.ts` — packet allowlist anti-PII
- `src/lib/ico-engine/csc-pipeline/__tests__/*` — tests
- `src/lib/reliability/queries/csc-pipeline-projection-degraded.ts` — reliability signal
- Consumer wiring en org-detail (coordinar con TASK-1063): `src/views/greenhouse/organizations/**` / `src/lib/account-360/**` `[verificar]`

## Current Repo State

### Already exists

- `GreenhouseFunnelChartCard` + sub-primitivas + advisor Nexa, props contract completo (`GreenhouseFunnelStage`, `GreenhouseFunnelMetric`, `GreenhouseFunnelInsight`, `GreenhouseFunnelNexaPromptContext`, callbacks `onStageSelect`/`onNexaPromptSubmit`/`onMetricOptionChange`/`onViewOptionChange`).
- `cscDistribution` per-space/per-context (`computeMetricsByContext`) — incluye `{phase,count,pct}`.
- Org-level ICO metrics (`readOrganizationIcoMetricsFromBigQuery`) — otd/ftr/rpa/cycle_time/stuck/throughput.
- AI signals org-scoped (`readOrganizationAiSignals`) + drill `/nexa/insights/[id]` (TASK-947).
- CSC phase mapping canónico (`buildTaskStatusToCscPhaseSql`, `CSC_PHASES`).
- Patrón projection (TASK-835/611) + degraded enum + reactive invalidation + reliability signal.

### Gap

- **Sin projection** que ensamble el view-model del funnel — el card solo recibe mock (lab).
- **Sin diagnósticos por fase CSC** (blockers/owner/freshness per fase) — `fetchDeliveryFacet` da agregados, no per-phase.
- **Sin contrato genérico** `FunnelPipelineViewModel` + adapters por kind.
- **Sin packet Nexa allowlist** — `onNexaPromptSubmit` recibe el context pero no hay capa que lo sanitice y lo lleve a `src/lib/ai/`.
- **Health por etapa** depende de TASK-1066 (a entregar).
- KPIs hoy con labels inventados ("Retención") sobre números que significan otra cosa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato `FunnelPipelineViewModel` + interfaz `PipelineSource`

- `types.ts`: el contrato versionado SSOT que el card consume (stages[] + metrics[] + insight + nexaContext + pipelineHealth + dataStatus + degradedSources[]), mapeable casi 1:1 a las props del card.
- `FunnelPipelineGrain = 'asset' | 'task'` + `PipelineScope = { kind: 'organization'|'project'|'sprint'|'member', id }`.
- Interfaz `PipelineSource` (el adapter por kind): `resolve(scope, grain, period, subject) → FunnelPipelineViewModel`.
- Tests de tipos + degraded enum.

### Slice 2 — Reader de diagnósticos por fase CSC (el gap de datos)

- `readCscPhaseDiagnosticsForOrganization({ organizationId, grain, period })` → por fase: `{ blockers, ownerRef, freshnessAt }`, **una sola query agrupada** (anti N+1).
- Resolver las reglas de negocio (ver Open Questions): qué cuenta como blocker de la fase, qué es "owner" de la fase, freshness = `MAX(last_edited_time)`.
- Soporta grano asset + tarea.
- Tests contra PG/BQ real (gate SQL canónico).

### Slice 3 — Projection `resolveCscPipelineProjection` + adapter `cscPipeline`

- Compone en paralelo (`withSourceTimeout`, degradación honesta): `cscDistribution` + `orgIcoMetrics` + `phaseDiagnostics` + `aiSignals`.
- Mapea a `FunnelPipelineViewModel`: stages (volumen modelo A + health TASK-1066 + diagnostics), metrics (KPIs ICO honestos), insight (peor etapa + AI signal real, `onAction` → drill Nexa), pipelineHealth (rollup).
- Cache TTL 30s keyed `(org, grain, period, subjectScope)` + invalidación reactiva (patrón TASK-835).
- Labels honestos (sin "Retención" sobre WIP ratio).
- Tests de composición + degradación.

### Slice 4 — Packet Nexa allowlist + wiring del advisor

- `nexa-context.ts`: convierte `GreenhouseFunnelNexaPromptContext` en un **packet con allowlist** (facts ICO permitidos; **sin PII** — owner names omitidos/hasheados), listo para `src/lib/ai/greenhouse-agent.ts`.
- Wire `onNexaPromptSubmit` → packet → Nexa (detrás del flag de IA correspondiente si aplica).
- Tests del allowlist (assert que ownerName/email NUNCA entran al packet).

### Slice 5 — Wiring al consumer real (org-detail) + reliability signal

- Cablear `resolveCscPipelineProjection` en el org-detail (coordinar con TASK-1063/1059/1061) reemplazando el mock; el card recibe el view-model real.
- Reliability signal `delivery.csc_pipeline.projection_degraded` (kind=drift, warning>0, steady=0).
- GVC del consumer real (desktop+mobile, light+dark) mirada.

## Out of Scope

- **Modelo (B) cohort-conversion** (funnel real sobre `task_status_transitions`) — V2 cuando la cobertura de transiciones (TASK-908/912) madure.
- **Otros kinds** del primitive (`commercialLifecycle`, `quoteToCash`, `onboardingActivation`) — el contrato los habilita; sus adapters son tasks aparte.
- **Funnel "lifecycle de proyecto"** (proyectos como chevron) — semántica distinta, kind aparte, NO `cscPipeline`.
- **Drill profundo** (listar las N entidades de una fase) — dataset lazy, follow-up.
- **Selector de período UI** — la projection acepta `period`; el control visual es del consumer.
- **Vista "Tabla"** (`viewOptions`) más allá de reusar el mismo view-model — render alterno es presentación del card.
- Cambiar la presentación del `GreenhouseFunnelChartCard` (es consumer, no se toca salvo wiring de props).

## Detailed Spec

Modelo canonizado en sesión de diseño 2026-06-09 (arch-architect + greenhouse-ico).

**Espina — contrato único + adapters por kind (espeja primitive+kinds del card):**

```
                       FunnelPipelineViewModel  (contrato único, versionado)
                                  ▲
        ┌─────────────────┬───────┴────────┬──────────────────────┐
   cscPipeline      commercialLifecycle  quoteToCash       onboardingActivation
   (ICO/delivery)   (HubSpot deals)      (finance)         (client-lifecycle 992)
   ── ESTA TASK ──        (futuro)         (futuro)              (futuro)
```

**4 planos del view-model (cscPipeline):**

| Plano | Qué | Fuente | Nota |
|---|---|---|---|
| 1 · Volumen | count por fase CSC (modelo A WIP) | `computeMetricsByContext(scope, grain)` → `cscDistribution` | grano **asset|tarea**; proyecto = scope, no chevron; label honesto (NO "retención") |
| 2 · Diagnósticos | blockers/owner/freshness **por fase** | `readCscPhaseDiagnosticsForOrganization` (NUEVO, query agrupada) | el gap de datos más grande |
| 3 · KPIs org | Ciclo medio / SLA-en-riesgo / OTD% (honesto) | `readOrganizationIcoMetricsFromBigQuery` | mapear a métricas ICO reales, no labels inventados |
| 4 · Inteligencia | health/etapa + rollup + insight + Nexa packet | TASK-1066 resolver + `readOrganizationAiSignals` + `src/lib/ai` | insight `onAction` → `/nexa/insights/[signalId]` (947); Nexa packet allowlist anti-PII |

**Grano (decisión cerrada):** unidad contada = **asset** (default lectura cliente, org-detail) con **tarea** como toggle/drill interno. `fase_csc` es atributo de la tarea/asset → una unidad en una sola fase. **Proyecto = scope (`computeMetricsByContext('project', id)`) o drill (qué proyectos atascan una fase), NUNCA chevron.**

**Flujo:**

```
resolveCscPipelineProjection({ subject, organizationId, grain='asset', period })
   → server-only, cache TTL 30s (org, grain, period, subjectScope)
   → Promise.all + withSourceTimeout (degradación honesta por fuente):
        cscDistribution / orgIcoMetrics / phaseDiagnostics / aiSignals
   → compose → FunnelPipelineViewModel { stages[], metrics[], insight, nexaContext, pipelineHealth, dataStatus, degradedSources[] }
   → card render (props ≈ 1:1)
```

## Rollout Plan & Risk Matrix

Capa de **lectura aditiva** (projection read-only + 1 reader nuevo) — no toca writes, payroll, finance, SCIM ni migrations destructivas. El único cómputo nuevo es un `GROUP BY` sobre BQ/PG.

### Slice ordering hard rule

- Slice 1 (contrato) **DEBE** preceder a todo — es el SSOT que el resto materializa.
- Slice 2 (reader diagnostics) y Slice 3 (projection) dependen del contrato; Slice 3 consume Slice 2.
- Slice 4 (Nexa packet) depende del view-model (Slice 3).
- Slice 5 (wiring consumer + signal) cierra último, coordinado con TASK-1063.
- TASK-1066 (health) se consume en Slice 3; si no está, el plano health degrada a `neutral` (no bloquea).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo BQ del reader de diagnostics por fase (query agrupada sobre `v_tasks_enriched`) | data / cost | medium | una query agrupada (anti N+1) + materializar vía `metrics_by_*` cuando posible + cache TTL | costo BQ dashboard |
| Semántica WIP mal leída como conversión por el consumer | ux / honestidad | medium | labels honestos en el contrato + doc + NO exponer "retención" | review GVC + copy gate |
| PII (`ownerName`) filtrado al prompt de Nexa | identity / privacy | low | allowlist explícito + test que asserta exclusión | test allowlist + review |
| Degradación silenciosa (fuente caída → `$0`/verde falso) | data quality | medium | `withSourceTimeout` + `dataStatus`/`degradedSources` honesto | `delivery.csc_pipeline.projection_degraded` |
| Drift de scope (cliente externo ve diagnostics internos) | identity | low | subject scope (patrón TASK-611) + projection server-only | review + tests de scope |

### Feature flags / cutover

Sin env/DB flag propio. El control de rollout es el **wiring del consumer**: el org-detail consume la projection detrás del flag de su propio runtime (TASK-1063/`organization_workspace_shell_*`). La projection en sí es read-only aditiva (no se activa hasta que un consumer la llama).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | revert PR (capa de lectura sin consumer productivo hasta Slice 5) | <5 min | sí |
| Slice 5 | desconectar el consumer (volver a mock / flag off org-detail) / revert PR | <5 min | sí |

### Production verification sequence

1. `pnpm lint && pnpm tsc --noEmit && pnpm test` (full — el funnel es recurso compartido) verde.
2. Smoke del reader de diagnostics contra PG/BQ real (gate SQL canónico) — verificar shape + costo + no N+1.
3. Verificar degradación honesta forzando una fuente caída (mock timeout) → `dataStatus='degraded'` + `degradedSources` poblado, nunca `$0`.
4. Test allowlist Nexa: assert `ownerName`/email NUNCA en el packet.
5. GVC del consumer org-detail real (coordinar TASK-1063) desktop+mobile, light+dark, mirada.
6. Monitorear `delivery.csc_pipeline.projection_degraded` post-wiring (steady=0).

### Out-of-band coordination required

- Coordinación con **TASK-1063/1059/1061** (org-detail runtime) para el wiring del consumer (Slice 5) y el default de grano. Repo-only; sin sistemas externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `FunnelPipelineViewModel` versionado + `PipelineSource` + `FunnelPipelineGrain ('asset'|'task')`; el card consume el view-model con cambio mínimo de wiring (props ≈ 1:1).
- [ ] `resolveCscPipelineProjection` es server-only, compone los 4 planos en paralelo con `withSourceTimeout`, cachea TTL 30s y degrada honesto (`dataStatus` + `degradedSources`), nunca `$0`/verde falso.
- [ ] El grano contado es **asset|tarea** (toggle); el scope acepta org/project/sprint/member; **ningún chevron representa un proyecto**.
- [ ] `readCscPhaseDiagnosticsForOrganization` devuelve blockers/owner/freshness por fase en **una query agrupada** (sin N+1), validada contra PG/BQ real.
- [ ] Los 3 KPIs mapean a métricas ICO reales (cycle_time, SLA-risk, OTD/FTR) con labels honestos; **ningún WIP ratio etiquetado como "Retención/Conversión"**.
- [ ] El health por etapa consume el resolver TASK-1066 (o degrada a `neutral`); el rollup de pipeline existe; el insight deriva de un AI signal real con `onAction` → `/nexa/insights/[signalId]`.
- [ ] El packet de Nexa pasa por allowlist: hay test que asserta que `ownerName`/email NUNCA entran al packet.
- [ ] Reliability signal `delivery.csc_pipeline.projection_degraded` shippeado (steady=0).
- [ ] El consumer org-detail (TASK-1063) renderiza el funnel con la projection real; GVC desktop+mobile+light+dark mirada.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (full suite — funnel + ICO son recursos compartidos)
- Smoke SQL del reader de diagnostics contra PG/BQ real (gate canónico SQL embebido)
- `pnpm fe:capture` del consumer org-detail (coordinar TASK-1063), light+dark+desktop+mobile

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes/deuda
- [ ] `changelog.md` actualizado (capa de datos visible nueva)
- [ ] chequeo de impacto cruzado sobre TASK-1066 (health), TASK-1059/1061/1063 (consumer)
- [ ] `greenhouse-documentation-governor` invocado antes de declarar complete

## Follow-ups

- **Modelo (B) cohort-conversion** sobre `task_status_transitions` (funnel de conversión real) — V2 cuando la cobertura madure.
- **Adapters de otros kinds** (`commercialLifecycle` → HubSpot deals, `quoteToCash` → finance, `onboardingActivation` → client-lifecycle TASK-992) — heredan el contrato.
- **Funnel lifecycle-de-proyecto** (kind nuevo, proyectos como chevron) — semántica distinta.
- **Drill profundo** (listar entidades de una fase, dataset lazy).
- **Selector de período** en el consumer.

## Open Questions

1. **"Owner" de una fase CSC** — ¿assignee dominante de la fase / rol responsable (Account/Ops/Design) / supervisor del cliente? Es regla de negocio (Slice 2 la necesita).
2. **"SLA en riesgo"** — ¿qué threshold define "en riesgo"? Reusar el SLO canónico de cycle time del framework ICO (`sla-slo-sli-framework`).
3. **Grano default en org-detail** — confirmado **asset** (lectura cliente) con **tarea** como toggle/drill; validar con el operador.
4. **Blocker de fase** — ¿`blocker_count > 0` de tareas en la fase, o solapar con status `Bloqueado`? Definir en Slice 2.
5. **Período** — ¿el funnel es del mes operativo vigente por default, o configurable desde el consumer?
