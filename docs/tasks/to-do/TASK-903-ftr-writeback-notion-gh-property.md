# TASK-903 — FTR writeback a Notion `[GH] FTR` (sibling de TASK-916 RpA writeback)

## Delta 2026-05-24

- Dependencia **TASK-909 Slice 1 SATISFECHA**: el helper canonical `calculateFtr` shipped en `src/lib/notion-metrics/calculate-ftr.ts` (delegación pura a `calculateRpaV2`, `ftr_v1.0`, 13 tests). Esta task ya puede invocarlo como su consumer real — gap "calculate-ftr.ts aún no existe" cerrado.
- Lint rule `greenhouse/no-inline-ftr-calculation` (warn) activa — esta task DEBE consumir `calculateFtr` (NO recomputar el veredicto FTR inline) o disparará la regla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (bloqueada — ver Dependencies)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `TASK-909 Slice 1 (calculateFtr helper) + TASK-916/917 (RpA V2 writeback productivo en estado 'enabled' 30+ días verde) + TASK-912 (captura de transiciones activa) + creación de la propiedad [GH] FTR en las DBs Tareas de Efeonce + Sky.`
- Branch: `task/TASK-903-ftr-writeback-notion-gh-property`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar el **writeback productivo de FTR** a la propiedad Notion `[GH] FTR` (select `Pass` / `Fail` / `N/A`, read-only para operadores), espejando el patrón sibling canonical de **TASK-916** (RpA V2 productive compute + writeback). FTR se computa vía el helper canonical `calculateFtr` (TASK-909 Slice 1) — que delega a `calculateRpaV2` — y se proyecta a Notion de forma asíncrona, decoupled del request path, gated por feature flag `NOTION_FTR_WRITEBACK_ENABLED` (default OFF).

Es el **consumidor real** de `calculateFtr`. Sin esta task, el helper de TASK-909 no tiene quién lo invoque.

## Why This Task Exists

`FTR_V1.md` §9 declara el writeback de FTR como `not_implemented` y lo asigna a "TASK-903 (futura)". Múltiples docs (TASK-909, FTR_V1, Contrato, Migration ADR) referencian "TASK-903" como la task de writeback pero **nunca se creó**. Esta task cierra ese hueco.

**Honestidad arquitectónica (leer antes de priorizar)**: FTR es una **derivada pura de RpA** (`FTR = pass ⇔ calculateRpaV2.value === 0`). RpA ya escribe su propio valor a Notion (`[GH] RpA v2`, TASK-916). Por lo tanto, un operador o cliente **puede derivar Pass/Fail trivialmente** del número de RpA que ya está en Notion. La pregunta canonical antes de shipear:

> ¿Existe demanda operativa/comercial real de una propiedad **binaria explícita** `[GH] FTR` distinta del número RpA ya visible?

Si la respuesta es no, esta task **no debe shipearse** — la información ya está disponible vía RpA. Por eso nace en **P3 / Impact Bajo**. Solo subir prioridad si:

- Un reporte/CVR cliente pide específicamente un badge Pass/Fail por tarea, o
- Un dashboard Notion-resident necesita filtrar/agrupar por FTR como select nativo (no como fórmula derivada del número RpA).

## Goal

- **FTR compute projection** reactiva (`notion.task.status_transitioned` → `calculateFtr` → snapshot → chain event `notion.task.ftr_writeback_requested`), sibling exacto de `notionRpaComputeProjection` (TASK-916).
- **FTR writeback projection** reactiva (PATCH `[GH] FTR` select vía `patchNotionPage`, gated `NOTION_FTR_WRITEBACK_ENABLED` default OFF, maxRetries=4, re-read PG defensive), sibling de `notionRpaWritebackProjection`.
- **Snapshot table** `greenhouse_delivery.task_ftr_snapshots` (CHECK `workspace_id IN ('efeonce','sky')`, append-only triggers + writeback columns mutables para idempotency).
- **2 reliability signals**: `notion.metrics.ftr_writeback_dead_letter` + `notion.metrics.ftr_writeback_lag` (subsystem `delivery`, steady=0).
- **Shadow paridad signal** `notion.metrics.shadow_paridad_ftr` (pre-flip gate).
- Feature flag `NOTION_FTR_WRITEBACK_ENABLED` (default OFF) — cero escrituras a Notion productivo al merge.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/metrics/FTR_V1.md` §9 — contrato canonical del writeback FTR (target property, frecuencia, pre-condiciones §9.1)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion = OS / Greenhouse = motor. `[GH] FTR` es read-only para operadores; Greenhouse integration es el único writer.
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — patrón sibling + 8 stop-gates + backward compat 90+ días
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — estrategia strangler progresiva
- CLAUDE.md "RpA V2 productive compute + writeback invariants (TASK-916)" — el patrón EXACTO a clonar (compute projection + writeback projection + snapshot table + 2 signals + chain event + flag + echo-loop safety)

Reglas obligatorias canonical:

- **NUNCA** computar FTR inline — toda lectura pasa por `calculateFtr` (que delega a `calculateRpaV2`).
- **NUNCA** crear formula property en Notion para FTR — compute en Greenhouse + writeback `[GH] FTR`.
- **NUNCA** confiar el valor del payload del chain event en el writeback — re-read del snapshot desde PG (defensive re-read, patrón TASK-771/916).
- **NUNCA** escribir a `[GH] FTR` en DBs productivas con el flag OFF. Default OFF garantiza cero impacto al merge.
- **NUNCA** invocar `Sentry.captureException()` directo — usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'ftr_compute' | 'ftr_writeback' } })`.
- **NUNCA** mezclar la lógica FTR prod/demo en un mismo módulo — siblings físicamente separados (mismo invariante que RpA TASK-913/916).

## Dependencies & Impact

### Depends on

- **TASK-909 Slice 1 SHIPPED** — helper canonical `calculateFtr` (`src/lib/notion-metrics/calculate-ftr.ts`)
- **TASK-916/917 — RpA V2 writeback productivo en estado `enabled` 30+ días verde** (per FTR_V1 §9.1; no shipear FTR writeback antes que RpA esté estable)
- **TASK-912 — captura de transiciones activa** (`task_status_transitions` poblándose → `calculateRpaV2` retorna `sourceMode='canonical'`)
- Propiedad `[GH] FTR` creada en las DBs Tareas de **Efeonce + Sky** (operador-side, vía Notion UI; verificar como TASK-916 verificó que `[GH] RpA v2` no existía aún)
- `patchNotionPage` (`src/lib/space-notion/notion-client.ts`, TASK-916)
- `src/lib/observability/capture.ts` (`captureWithDomain`)

### Blocks / Impacts

- Es el primer **consumidor real** de `calculateFtr` (TASK-909 Slice 1). Hasta esta task, el helper no tiene quién lo invoque.
- Consumers UI (Person 360, Pulse, scorecards): **NO cambian**. Siguen leyendo `metrics_by_*.ftr_pct` agregado SQL del registry. Esta task solo agrega el valor per-task a Notion.

### Files owned

- `src/lib/notion-metrics/calculate-ftr.ts` — CONSUMER (creado por TASK-909; esta task lo invoca)
- `src/lib/sync/projections/notion-ftr-compute.ts` — NEW: compute projection reactiva
- `src/lib/sync/projections/notion-ftr-writeback.ts` — NEW: writeback projection reactiva
- `src/lib/reliability/queries/notion-metrics-ftr-signals.ts` — NEW: 2 signal readers
- `migrations/<ts>_task-903-ftr-snapshots.sql` — NEW: tabla `task_ftr_snapshots`
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY: wire de los 2 signals
- `CLAUDE.md` — MODIFY: invariants "FTR writeback (TASK-903)" sibling de TASK-916

## Current Repo State

### Already exists

- `src/lib/notion-metrics/calculate-rpa-v2.ts` — `calculateRpaV2` (TASK-901, SHIPPED)
- `src/lib/sync/projections/notion-rpa-compute.ts` + `notion-rpa-writeback.ts` (TASK-916 — patrón a clonar)
- `greenhouse_delivery.task_rpa_snapshots` + migration `20260521182825984` (esquema a espejar)
- `src/lib/ico-engine/metric-registry.ts:226-249` — `ftr_pct` agregado SQL (no cambia)

### Gap

- ~~`calculate-ftr.ts` aún no existe (lo crea TASK-909 Slice 1)~~ → **cerrado 2026-05-24**: `src/lib/notion-metrics/calculate-ftr.ts` SHIPPED (TASK-909 Slice 1)
- No existe pipeline de writeback FTR (compute + writeback projections, snapshot table, signals)
- Propiedad `[GH] FTR` aún no creada en Notion (operador-side)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope (clonado mecánico de TASK-916, repointeado a FTR)

### Slice 0 — Snapshot table + migration

- `greenhouse_delivery.task_ftr_snapshots`: PK `snapshot_id UUID`, `task_source_id`, `workspace_id` (CHECK `IN ('efeonce','sky')`), `ftr_value` (`pass|fail|null`), `ftr_data_status`, `rpa_value`, `formula_version`, writeback columns (`written_to_notion_at`, `notion_writeback_event_id`, `notion_writeback_attempt_count`, `notion_writeback_last_error`), `computed_at`.
- Append-only triggers anti-UPDATE/anti-DELETE (excepción: writeback columns mutables para idempotency). Mirror de `task_rpa_snapshots`.

### Slice 1 — Compute projection

- `notionFtrComputeProjection` (trigger `notion.task.status_transitioned`): invoca `calculateFtr({ taskSourceId })` → persiste snapshot → emite chain event `notion.task.ftr_writeback_requested` v1 cuando `ftr_data_status='valid'`.

### Slice 2 — Writeback projection

- `notionFtrWritebackProjection` (trigger `notion.task.ftr_writeback_requested`): re-read PG defensive → PATCH `[GH] FTR` (select Pass/Fail/N/A) vía `patchNotionPage`/`NOTION_TOKEN`, **gated `NOTION_FTR_WRITEBACK_ENABLED` default OFF → skip honest** → mark `written_to_notion_at`. maxRetries=4.

### Slice 3 — Reliability signals

- `notion.metrics.ftr_writeback_dead_letter` + `notion.metrics.ftr_writeback_lag` (mirror de TASK-916, subsystem `delivery`, steady=0).
- Shadow paridad: `notion.metrics.shadow_paridad_ftr`.

### Slice 4 — Cierre + docs

- CLAUDE.md invariants sibling de TASK-916. README + Handoff + changelog. Mover a `complete/`.

## Out of Scope

- **FTR compuesto V2 (señales Frame.io)** — vive en `calculateRpaV2` cuando emerja, NO en esta task.
- **Activación del flag** (`NOTION_FTR_WRITEBACK_ENABLED=true`) — requiere los 8 stop-gates ADR Strangler + decisión explícita de que FTR explícito vale vs derivarlo de RpA. Esta task ship con flag OFF.
- **Cambios al agregado `ftr_pct`** del registry.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `task_ftr_snapshots` migration aplicada + tipos regenerados + CHECK rechaza `workspace_id='demo'`
- [ ] `notionFtrComputeProjection` + `notionFtrWritebackProjection` registradas + tests
- [ ] Writeback gated `NOTION_FTR_WRITEBACK_ENABLED` default OFF → smoke confirma skip honest sin escrituras a Notion
- [ ] 2 signals wired en `get-reliability-overview` + steady=0 verificado
- [ ] `calculateFtr` invocado (consumidor real); re-read PG defensive en writeback (no confía payload)
- [ ] `pnpm test` (full) + `pnpm build` verde
- [ ] Task movida a `complete/`

## Pre-condiciones de activación (flip a `NOTION_FTR_WRITEBACK_ENABLED=true`) — FTR_V1 §9.1

1. TASK-908 + TASK-912 captura activa
2. TASK-916/917 RpA writeback en `enabled` 30+ días verde
3. TASK-903 shadow mode FTR 7 días verde
4. `notion.metrics.shadow_paridad_ftr` steady=0
5. `[GH] FTR` confirmada en Sky + Efeonce DBs
6. Decisión explícita: FTR explícito vale vs derivarlo de RpA (ver "Why This Task Exists")

## Follow-ups

- Backlog — Frame.io integration (activa FTR compuesto V2 vía `calculateRpaV2`)
