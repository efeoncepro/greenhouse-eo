# TASK-909 — FTR canonical helper V1 + Engine doc drift resolution (Throughput/Pipeline Velocity ya son specs Accepted — esta task NO toca su código, solo el puntero del Engine doc)

> **Precondiciones canonical**:
>
> - `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (ADR 2026-05-17 — boundary Notion = OS / ICO = motor)
> - `docs/architecture/GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` (ADR 2026-05-17 — 1 métrica = 1 spec canonical)
> - `docs/architecture/metrics/FTR_V1.md` (spec canonical de la métrica — TASK-909 implementa lo que ahí se canoniza, NO redefine)
> - `docs/architecture/metrics/RPA_V1.md` (FTR delega a RpA — single source of truth)
> - `docs/architecture/metrics/METRICS_INDEX.md` (índice maestro post-creación de specs)
>
> **DESBLOQUEADA 2026-05-23**: TASK-901 Slice 1 + TASK-908 Slices 0-3.5 AMBAS SHIPPED en `develop`. El helper delegado existe como `calculateRpaV2` en `src/lib/notion-metrics/calculate-rpa-v2.ts` (estrangulador RpA V2, ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`), **NO** `calculateRpa`/`calculate-rpa.ts` como decía el sketch original. FTR helper delega a `calculateRpaV2` → `countCorrectionTransitions`. Spec `FTR_V1.md` corregida 2026-05-23 (naming V2 + dataStatus mapping de 4 valores).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `SHIPPED 2026-05-24 — Slice 1 (helper + lint + tests) + Slice 5 (docs + closing). Slices 2/3/4 ya estaban hechos por sesión doc-only 2026-05-17.`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `DESBLOQUEADA 2026-05-23 — TASK-908 (countCorrectionTransitions) + TASK-901 (calculateRpaV2) AMBAS SHIPPED en develop. El helper delegado existe como calculateRpaV2 en src/lib/notion-metrics/calculate-rpa-v2.ts (estrangulador RpA V2), NO calculateRpa. La cadena de source confiable está completa.`
- Branch: `task/TASK-909-ico-ftr-throughput-pipeline-velocity-definitions-drift`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar el **helper canonical `calculateFtr` V1** que `FTR_V1.md` canoniza (delega a `calculateRpaV2`, sin lógica propia) + crear **specs canonical Throughput + Pipeline Velocity** que resuelven el drift histórico entre Engine doc y código runtime + apuntar Engine doc + Contrato a los specs nuevos como source of truth.

**Reshape post creación del pattern canonical (sesión 2026-05-17)**: esta TASK ya NO redefine las métricas inline ni edita Engine doc con cambios conceptuales. La definición canonical vive en `docs/architecture/metrics/<METRIC>_V1.md`. Esta TASK:

1. **Implementa `calculateFtr` helper V1** (Slice 1) — código TS que matchea exactamente `FTR_V1.md` section 4.1 signature canonical + tests anti-regresión section 4.2.
2. **Crea `THROUGHPUT_V1.md` spec canonical** (Slice 2) — resuelve drift: spec consolida que `monthly_count` (código actual `metric-registry.ts:310-323`) es canonical operacional; la fórmula `weekly_rate / 4` del Engine doc era artefacto histórico no implementado. Sin cambios de código.
3. **Crea `PIPELINE_VELOCITY_V1.md` spec canonical** (Slice 3) — resuelve drift: spec consolida que es **ratio `completed / (completed + open)` per-período** (código actual `metric-registry.ts:338-367`), NO "identical to throughput". Distingue semántica per Engine doc legacy. Sin cambios de código.
4. **Engine doc + Contrato pointer Delta** (Slice 4) — agregar Delta 2026-05-17 al inicio de Engine doc señalando que para definiciones canonical de cada métrica, leer `metrics/<METRIC>_V1.md`. Engine doc queda como framework conceptual sin redefinir.
5. **METRICS_INDEX update + Closing** (Slice 5) — actualizar índice con status `Accepted` para los 3 specs nuevos + cross-impact scan.

**Out of scope V1 (referenciado para tasks futuras)**:

- FTR writeback completo a Notion property `[GH] FTR` → TASK-903 (futura), reusa pattern TASK-901.
- Throughput writeback → TASK-905+ (futura).
- Pipeline Velocity writeback → TASK-905+ (futura).
- Frame.io integration (que poblaría las 4 señales restantes de FTR compuesto V2) → backlog separado.
- Migración progresiva del resto de métricas (OTD, Cumplimiento, Cycle Time, CT SLO%, Iteration Velocity, BCS, TTM) a specs canonical — cada uno emerge cuando una task la toca (strangler pattern per `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` §5).

## Why This Task Exists

Deep-dive sesión 2026-05-17 detectó 3 drifts entre Engine spec doc y código runtime que generan confusión cross-team:

- **FTR drift**: Engine doc § A.5.3 propone "FTR = composite 5 signals". Código implementa `completed AND client_change_round_final = 0`. Las otras 4 señales (`client_review_open`, `workflow_review_open`, `open_frame_comments`, `handoff_artifact_present`) **no se rastrean** (Frame.io no existe; handoff artifact no se mide). El spec doc describe el ideal futuro, el código describe el presente operacional. Sin resolver el drift, agentes y consumers no saben cuál es la verdad canonical.

- **Throughput drift**: Engine doc dice `weekly_rate / 4`. Código dice `COUNT(*) per month`. Operador reporta y lee throughput mensual. La fórmula `weekly_rate / 4` es artefacto histórico de un análisis previo no implementado. Documentar que `monthly_count` es canonical operacional resuelve confusión.

- **Pipeline Velocity drift**: Engine doc dice "identical to throughput". Código dice "completed / open ratio". Son métricas distintas semánticamente:
  - **Throughput**: cuántas tareas se completan en el período (volumen absoluto)
  - **Pipeline Velocity**: ratio de salida vs entrada (qué tan rápido fluye el pipeline relativo al backlog activo)
  - Un equipo puede tener `throughput` alto y `pipeline_velocity` baja si el backlog crece más rápido que la salida.

Estos drifts NO bloquean operación (las métricas funcionan), pero generan riesgo cuando:

- Un nuevo agente lee el Engine doc + intenta implementar — termina divergiendo del código existente.
- Un consumer downstream lee la spec + asume comportamiento que el código NO entrega.
- El Cycle Time canonical (TASK-908) actualiza la fórmula CT — sin housekeeping del Engine doc para las métricas adyacentes, el drift crece.

**Decisión arquitectónica canonical 2026-05-17 (ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`)**: cuando hay drift entre Engine doc (conceptual) y código (runtime), **el código es source of truth canonical**. El Engine doc se actualiza para reflejar el código + documentar diferida lo que aún no se implementa (con cross-ref a backlog task).

## Goal

- **FTR canonical V1 helper** (`src/lib/notion-metrics/calculate-ftr.ts`): pure function async `calculateFtr(inputs): Promise<FtrResult>` que delega a `calculateRpaV2(inputs)` (de TASK-901) y devuelve `{ value: 'pass' | 'fail' | 'not_applicable' | null, dataStatus: 'valid' | 'unavailable' | 'low_confidence', sourceMode, rpaSnapshot, formulaVersion: 'ftr_v1.0' }`. NO implementa señales Frame.io (forward-compat: cuando emerja, `calculateRpaV2` extiende y `calculateFtr` se beneficia automático sin breaking change).
- **Throughput canonical decision documented**: actualizar Engine doc para que diga "Throughput = monthly_count per period, alineado con código runtime canonical en `metric-registry.ts:310-323`. El `weekly_rate / 4` original del spec era artefacto histórico no implementado". Sin cambios de código.
- **Pipeline Velocity canonical decision documented**: actualizar Engine doc para clarificar que NO es identical to throughput. Es el ratio `completed_count / (completed_count + open_count)` per período (cómo `metric-registry.ts:338-367` lo computa). Mide flow eficiencia relativa al backlog activo. Sin cambios de código.
- **Engine doc housekeeping**: actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-1116 + secciones impactadas. Agregar Delta 2026-05-17 al inicio que liste las 3 resoluciones canonical + cross-ref ADR boundary.
- **Lint rule defense canonical**: `eslint-plugins/greenhouse/rules/no-inline-ftr-calculation.mjs` modo `warn` durante migración (mismo pattern que `no-inline-rpa-calculation`).
- **Tests anti-regresión**: helper `calculateFtr` con mocks de `calculateRpaV2`, mínimo 9 paths cubriendo casos canonical (pass/fail/unavailable/suppressed/low_confidence/forward-compat ignored Frame.io signals).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — **PRECONDICIÓN CANONICAL** (ADR boundary Notion = OS / ICO Engine = motor)
- `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones F + G — semántica canonical de corrección y boundary
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-1116 — sección a resolver drift
- `docs/tasks/to-do/TASK-908-ico-status-transition-tracking-canonical-cycle-time.md` — foundation prerequisita (countCorrectionTransitions Slice 3.5)
- `docs/tasks/complete/TASK-901-canonical-notion-metric-compute-v1-rpa.md` — calculateRpaV2 Slice 1 prerequisito (SHIPPED)

Reglas obligatorias canonical:

- **NUNCA** reescribir FTR como motor compuesto de 5 señales en V1 — las 4 señales Frame.io NO existen. Forward-compat: cuando emerjan, extender `calculateRpaV2` (no `calculateFtr`).
- **NUNCA** modificar el código de Throughput o Pipeline Velocity en V1 — son canonical operacional, solo se documenta su semántica para resolver drift conceptual.
- **NUNCA** consumer downstream recomputa FTR/Throughput/Pipeline Velocity inline. Toda lectura pasa por columna materializada o helper canonical.
- **NUNCA** invocar `Sentry.captureException()` directo — usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'metric_compute', metric: 'ftr' } })`.

## Normative Docs

- `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — ADR canonical
- `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 sección G — semántica canonical de corrección
- `Greenhouse_ICO_Engine_v1.md` líneas 2330-2346 (§ A.5.3 FTR composite spec) — drift a resolver
- `src/lib/ico-engine/metric-registry.ts` líneas 155-158 (CANONICAL_FTR_PASSED_SQL), 226-249 (ftr_pct), 310-323 (throughput), 338-367 (pipeline_velocity)
- TASK-908 spec — countCorrectionTransitions helper
- TASK-901 spec — calculateRpaV2 helper (`src/lib/notion-metrics/calculate-rpa-v2.ts`)

## Dependencies & Impact

### Depends on

- **TASK-908 Slices 0-3.5 SHIPPED** (transitions foundation + countCorrectionTransitions helper)
- **TASK-901 Slice 1 SHIPPED** (`calculateRpaV2` canonical async helper en `calculate-rpa-v2.ts`)
- `src/lib/observability/capture.ts` (`captureWithDomain`)
- `src/lib/notion-metrics/index.ts` barrel export (de TASK-901)

### Blocks / Impacts

- **TASK-903 (FTR writeback futura)**: consume `calculateFtr` de esta TASK + reusa infra writeback de TASK-901.
- **Consumers downstream UI** (Person 360, Pulse, ICO scorecards): NO cambian. Siguen leyendo `metrics_by_*.ftr_pct` agregado por SQL del registry (NO consumen `calculateFtr` per-task directo).
- Lint rule `greenhouse/no-inline-ftr-calculation`: afecta cualquier consumer futuro que intente recomputar FTR inline.

### Files owned

- `src/lib/notion-metrics/calculate-ftr.ts` — NEW: helper canonical async `calculateFtr` que delega a `calculateRpaV2`
- `src/lib/notion-metrics/calculate-ftr.test.ts` — NEW: tests mínimo 8 paths con mocks
- `src/lib/notion-metrics/ftr-types.ts` — NEW (o consolidar en `types.ts` de TASK-901): `TaskInputsForFtr`, `FtrResult` types
- `eslint-plugins/greenhouse/rules/no-inline-ftr-calculation.mjs` — NEW: lint rule modo warn
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — MODIFY: secciones FTR (§ A.5.3) + Throughput + Pipeline Velocity + Delta canonical al inicio
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — MODIFY (light): agregar nota de cross-ref a TASK-909 closure cuando shippee
- `CLAUDE.md` — MODIFY (light): agregar pointer a `calculate-ftr.ts` en la sección "Delivery Metrics Ownership Boundary invariants" (helpers canonical list)

## Current Repo State

### Already exists

- `src/lib/ico-engine/metric-registry.ts:155-158` — `CANONICAL_FTR_PASSED_SQL` actual
- `src/lib/ico-engine/metric-registry.ts:226-249` — métrica `ftr_pct` actual (agregado SQL)
- `src/lib/ico-engine/metric-registry.ts:310-323` — `throughput` actual (monthly_count)
- `src/lib/ico-engine/metric-registry.ts:338-367` — `pipeline_velocity` actual (ratio completed/open)
- `Greenhouse_ICO_Engine_v1.md` líneas 887-1116 con drift documentado
- `src/lib/notion-metrics/calculate-rpa-v2.ts` (`calculateRpaV2` — TASK-901 Slice 1 SHIPPED — prerequisite)

### Gap

- No existe helper canonical `calculateFtr()` per-task — la lógica vive solo en SQL agregado del registry
- No existe forward-compat documentado para Frame.io signals en FTR
- Engine doc tiene drift documental no resuelto (FTR composite, Throughput formula, Pipeline Velocity definition)
- No existe lint rule anti-inline FTR

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `calculateFtr` canonical helper

- Crear `src/lib/notion-metrics/calculate-ftr.ts`:

  ```typescript
  import 'server-only'
  import { calculateRpaV2, type RpaV2Result } from './calculate-rpa-v2'

  export const FTR_FORMULA_VERSION = 'ftr_v1.0'

  export type TaskInputsForFtr = {
    taskSourceId: string
    windowStart?: Date | null
    windowEnd?: Date | null
    // Forward-compat Frame.io (propagado a calculateRpaV2, que hoy los ignora):
    clientReviewOpen?: boolean | null
    workflowReviewOpen?: boolean | null
    openFrameComments?: number | null
    // handoffArtifactPresent: reservado V2; calculateRpaV2 aún NO lo acepta → NO se propaga.
    handoffArtifactPresent?: boolean | null
  }

  export type FtrResult = {
    value: 'pass' | 'fail' | 'not_applicable' | null
    // Hereda los estados computables de RpA V2 (que tiene 4: valid | unavailable
    // | low_confidence | suppressed). low_confidence se propaga, no se colapsa.
    dataStatus: 'valid' | 'unavailable' | 'low_confidence'
    sourceMode: 'canonical' | 'unavailable'
    rpaSnapshot: RpaV2Result
    formulaVersion: typeof FTR_FORMULA_VERSION
  }

  export const calculateFtr = async (inputs: TaskInputsForFtr): Promise<FtrResult> => {
    const rpa = await calculateRpaV2({
      taskSourceId: inputs.taskSourceId,
      windowStart: inputs.windowStart,
      windowEnd: inputs.windowEnd,
      clientReviewOpen: inputs.clientReviewOpen,
      workflowReviewOpen: inputs.workflowReviewOpen,
      openFrameComments: inputs.openFrameComments
    })

    // No computable: sin data canonical, valor nulo, o data suprimida.
    if (
      rpa.value === null ||
      rpa.dataStatus === 'unavailable' ||
      rpa.dataStatus === 'suppressed'
    ) {
      return {
        value: null,
        dataStatus: 'unavailable',
        sourceMode: rpa.sourceMode,
        rpaSnapshot: rpa,
        formulaVersion: FTR_FORMULA_VERSION
      }
    }

    // value no-nulo + dataStatus valid|low_confidence → computa pass/fail.
    // El caveat low_confidence se propaga (NO se colapsa silenciosamente a valid).
    return {
      value: rpa.value === 0 ? 'pass' : 'fail',
      dataStatus: rpa.dataStatus === 'low_confidence' ? 'low_confidence' : 'valid',
      sourceMode: 'canonical',
      rpaSnapshot: rpa,
      formulaVersion: FTR_FORMULA_VERSION
    }
  }
  ```

- Tests mínimo 9 paths (mock `calculateRpaV2`):
  1. Happy pass: RpA=0 → FTR `pass`, `dataStatus='valid'`
  2. Happy fail: RpA=1 → FTR `fail`, `dataStatus='valid'`
  3. Happy fail multiple: RpA=5 → FTR `fail`
  4. Unavailable: RpA `dataStatus='unavailable'` → FTR `null`, `dataStatus='unavailable'`
  5. RpA `value=null` → FTR `null`, `dataStatus='unavailable'`
  6. Suppressed: RpA `dataStatus='suppressed'` con value no-nulo → FTR `null`, `dataStatus='unavailable'`
  7. Low confidence: RpA `dataStatus='low_confidence'`, value=0 → FTR `pass`, `dataStatus='low_confidence'` (señal propagada)
  8. Window filter propagation: ventana pasada correctamente a `calculateRpaV2`
  9. Forward-compat: `clientReviewOpen=true` propagado a `calculateRpaV2` (que hoy lo ignora) → same result; `rpaSnapshot` preservado en `FtrResult` para forensic/debugging

- Lint rule `eslint-plugins/greenhouse/rules/no-inline-ftr-calculation.mjs` modo `warn`:
  - Detecta patterns: `client_change_round_final = 0` inline en SQL embedded TS, `FTR_PASSED_SQL` referencias fuera del registry, `formula.ftr` lectura inline de Notion
  - Override block exime el helper canonical + tests + `metric-registry.ts` (única fuente legítima de agregado SQL)

### Slice 2 — ~~Crear `THROUGHPUT_V1.md` spec canonical~~ **REMOVIDO 2026-05-17 (cont.)**

> **REMOVIDO**: `THROUGHPUT_V1.md` ya fue creado en la misma sesión 2026-05-17 como parte del paquete "crear los 12 specs canonicales pendientes" — sesión doc-only que canonizó las 14 métricas críticas. Ver `docs/architecture/metrics/THROUGHPUT_V1.md` Accepted. TASK-909 NO necesita crearlo.

### Slice 3 — ~~Crear `PIPELINE_VELOCITY_V1.md` spec canonical~~ **REMOVIDO 2026-05-17 (cont.)**

> **REMOVIDO**: `PIPELINE_VELOCITY_V1.md` ya fue creado en la misma sesión. Ver `docs/architecture/metrics/PIPELINE_VELOCITY_V1.md` Accepted. TASK-909 NO necesita crearlo.

### Slice 4 — Engine doc + Contrato + DECISIONS_INDEX pointer Delta

- Agregar **Delta 2026-05-17** al inicio de `Greenhouse_ICO_Engine_v1.md` (antes de la sección 1) con párrafo + tabla:

  > **Delta 2026-05-17 — Migración a specs canonical por métrica**
  >
  > Post sesión deep-dive 2026-05-17 + ADR `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`, cada métrica crítica tiene su spec canonical dedicado en `docs/architecture/metrics/<METRIC>_V1.md` que es **single source of truth** de definición, fórmula, helper, agregado, semántica, threshold, writeback, estados y casos edge.
  >
  > Este doc (Engine doc) queda como **framework conceptual enterprise** (drivers operativos, 3 niveles, cadena causal, narrativa pitch). Las definiciones de métrica individual viven en los specs canonical referenciados acá:
  >
  > | Métrica | Spec canonical | Status |
  > |---|---|---|
  > | RpA | `metrics/RPA_V1.md` | Accepted |
  > | FTR | `metrics/FTR_V1.md` | Accepted |
  > | Throughput | `metrics/THROUGHPUT_V1.md` | Accepted |
  > | Pipeline Velocity | `metrics/PIPELINE_VELOCITY_V1.md` | Accepted |
  > | Resto (9 métricas pendientes) | `metrics/METRICS_INDEX.md` | Strangler migration |
  >
  > **Reglas canonical**: si emerge drift entre las definiciones acá vs los specs canonical, **el spec canonical gana**. Las secciones acá que redefinen métricas serán simplificadas progresivamente a cross-refs a medida que cada spec emerja.

- Agregar a `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 nueva sección **I) Migración progresiva a specs canonical por métrica** apuntando al pattern + index + 4 specs Accepted.
- Update `DECISIONS_INDEX.md` con entry nueva: "1 métrica crítica = 1 spec canonical en `docs/architecture/metrics/<METRIC>_V1.md`" pointing to `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`.

### Slice 5 — CLAUDE.md + METRICS_INDEX final + Closing

- Update `CLAUDE.md` sección "Delivery Metrics Ownership Boundary invariants" — agregar `calculateFtr` a la lista de helpers canonical + agregar pointer al ADR metric spec pattern.
- Update `METRICS_INDEX.md` final con los 4 specs Accepted (RPA + FTR + THROUGHPUT + PIPELINE_VELOCITY) + status final post-shipping.
- Update `docs/tasks/README.md` + `Handoff.md` + `changelog.md` con shipping notice TASK-909.
- Cross-impact scan `docs/tasks/to-do/` por tasks referenciando FTR/Throughput/Pipeline Velocity (sobre todo TASK-903 cuando emerja).
- Mover task a `complete/`.

## Out of Scope

- **FTR writeback completo a Notion `[GH] FTR` property** → TASK-903 (futura). Reusa infra TASK-901 (webhook + outbox + Cloud Tasks + bulk PATCH).
- **Throughput writeback** → TASK-905+ (futura).
- **Pipeline Velocity writeback** → TASK-905+ (futura).
- **Frame.io integration** (que poblaría 4 de 5 señales del FTR compuesto V2) → backlog separado, NO blocking V1.
- **Cambios a código de Throughput o Pipeline Velocity** → out of scope. V1 documenta el código actual como canonical; modificaciones requieren TASK separada con análisis impacto downstream.
- **BCS y TTM** (también pendientes en backlog) → TASK-910 separada cuando emerja necesidad operativa.
- **IRR (Internal Review Rounds)** mencionada en CLAUDE.md como métrica futura paralela a RpA — out of scope V1, evaluar cuando workflow review system emerja.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `src/lib/notion-metrics/calculate-ftr.ts` existe + tests 13 paths verde (9 spec §4.2 + idempotencia/version)
- [x] Helper `calculateFtr` delega a `calculateRpaV2` (zero lógica propia — solo mapping `value === 0 ? 'pass' : 'fail'` + propagación de `dataStatus`)
- [x] Lint rule `greenhouse/no-inline-ftr-calculation` modo warn activa + tests del rule (7 valid + 6 invalid via node)
- [x] `Greenhouse_ICO_Engine_v1.md` Delta 2026-05-17 al inicio + specs canonical → **YA EXISTÍA** (sesión doc-only 2026-05-17, verificado head líneas 3-38)
- [x] `CLAUDE.md` sección boundary actualizada con pointer a `calculateFtr` (`calculate-ftr.ts`, delega a `calculateRpaV2`)
- [x] `Contrato_Metricas_ICO_v1.md` migración progresiva → **YA EXISTÍA** como sección H (verificado línea 330)
- [x] README + Handoff + changelog actualizados
- [x] `pnpm test src/lib/notion-metrics/calculate-ftr.test.ts` verde (13/13)
- [x] `pnpm lint` verde (incluye nueva lint rule, 0 hits en repo — zero false positives)
- [x] `pnpm tsc --noEmit` verde
- [x] Zero cambios de código en `metric-registry.ts` (throughput + pipeline_velocity intactos)
- [x] Task movida a `complete/`

## Delta 2026-05-24 — SHIPPED

- **Slice 1 (código)**: helper `calculateFtr` ([calculate-ftr.ts](../../../src/lib/notion-metrics/calculate-ftr.ts)) delegación pura a `calculateRpaV2` + 13 tests + lint rule `greenhouse/no-inline-ftr-calculation` (warn) precisa al recompute del veredicto FTR (NO matchea `client_change_round_final = 0` a secas — agregados BQ legítimos quedan limpios). Plugin v1.9.0. Commit `feat(ico): TASK-909 Slice 1`.
- **Slice 5 (cierre)**: METRICS_INDEX FTR row → SHIPPED (+ corregido RpA row a `calculate-rpa-v2.ts`), CLAUDE.md helpers canonical list actualizado, FTR_V1.md §4 → SHIPPED + §10 Delta.
- **Slices 2/3/4 SKIP**: ya estaban hechos por la sesión doc-only 2026-05-17 (THROUGHPUT_V1.md + PIPELINE_VELOCITY_V1.md Accepted, Engine doc Delta head, Contrato sección H, DECISIONS_INDEX entries METRIC_SPEC_PATTERN + OWNERSHIP_BOUNDARY) — verificado pre-execution, NO re-hecho.
- **Decisión robusta pre-execution**: lint rule PRECISA (recompute del veredicto FTR: P1/P2/P3) en vez de matchear la columna `client_change_round_final` a secas — esta última generaría ruido en ~6 agregados BQ legítimos ("tareas sin ajustes"). Verificado ZERO false positives en todo el repo.
- **Gate cierre**: `pnpm lint` 0 · `pnpm tsc --noEmit` 0 · `pnpm test` 5338 passed · `pnpm build` OK.

## Verification

- Manual review: leer Engine doc Delta + cross-refs canonical → entendible para nuevo agente sin background
- Manual review: tests cubren forward-compat path (Frame.io signals ignored sin warning ni breakage)
- `pnpm test` (full suite) + `pnpm build` (production Turbopack) verde como gate final canonical (CLAUDE.md regla "Task Closing Quality Gate")

## Closing Protocol

1. Verificar acceptance criteria todas en verde
2. `pnpm test && pnpm build` local pre-close
3. Mover archivo a `docs/tasks/complete/TASK-909-...`
4. Update `Lifecycle` a `complete` en frontmatter
5. Update `docs/tasks/README.md` (mover entrada a Complete)
6. Update `Handoff.md` + `changelog.md`
7. Cross-impact scan `docs/tasks/to-do/` por tasks referenciando FTR canonical (TASK-903 sobre todo)
8. Commit + push develop con conventional message `feat(ico): TASK-909 ship FTR canonical V1 + Engine doc drift resolution`

## Follow-ups

- `TASK-903` (futura) — FTR writeback completo a Notion (consume calculateFtr de esta task, reusa infra TASK-901)
- `TASK-905+` (futuras) — Throughput + Pipeline Velocity writebacks (cuando se justifique operativamente — UI ya consume agregados del registry sin necesidad de writeback inmediato a Notion)
- `TASK-910` (futura) — BCS AI layer activation
- Backlog separado — Frame.io integration (cuando emerja → activa señales V2 de FTR/RpA)
