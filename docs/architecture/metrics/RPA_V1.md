# `RpA` — Rounds per Asset — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | RpA (Rounds per Asset) |
| Metric ID (registry) | `rpa` (per-task), `rpa_avg` (agregado) |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive RpA + arch reasoning |
| Last updated | 2026-05-26 |
| Writeback state | Productive writeback shipped via TASK-916/TASK-917 Flip A to `[GH] RpA v2`; raw BigQuery echo `notion_ops.tareas.gh_rpa_v2` |
| Cross-refs | TASK-877 (bridge regression fuente) · TASK-901 (writeback V1) · TASK-908 (foundation transitions) · TASK-909 (FTR consume RpA) · TASK-215 (confidence policy) · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**RpA (Rounds per Asset)** mide cuántas rondas de correcciones del cliente recibió una pieza creativa antes de quedar aprobada. Es un indicador operativo del **First-Pass Quality** del equipo: cuántas iteraciones se necesitaron para llegar al entregable que el cliente acepta.

- `RpA = 0` → el cliente aprobó a la primera, sin pedir cambios (entrega perfecta first-time)
- `RpA = 1` → 1 ronda de correcciones (1 ciclo Listo → Feedback)
- `RpA = N` → N rondas

**A quién le importa**:

- **Equipo creativo**: define rondas/feedback que recibieron — input para retros, calibración de briefs, definición de DoD
- **Cliente** (visible vía QBR/CVR): mide la calidad operativa de Globe — bajos RpA = menos fricción colaborativa
- **Compensación variable**: RpA promedio per-member-month es input directo para bonificaciones (Greenhouse Payroll)
- **Management**: RpA agregado per-space es señal de fit cliente-equipo, claridad de briefs y madurez del proceso

---

## 2. Fórmula canonical

### 2.1 Per-task (compute individual)

```text
RpA(task) = countCorrectionTransitions(task.source_id)
          = COUNT(transitions WHERE from_status = 'Listo para revisión'
                            AND to_status   = 'En Feedback')
```

Donde las transiciones se leen de `greenhouse_delivery.task_status_transitions` (tabla canonical creada por TASK-908, capturada vía webhook Notion).

### 2.2 Agregado canonical (per-member per-month)

```sql
-- Pseudocódigo del registry SQL (src/lib/ico-engine/metric-registry.ts:226-249)
ROUND(AVG(rpa), 2) AS rpa_avg
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND <CANONICAL_COMPLETED_TASK_SQL>      -- solo tareas cerradas
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

### 2.3 Versionado de fórmula

`RPA_FORMULA_VERSION = 'rpa_v1.0'` (constant en `src/lib/notion-metrics/calculate-rpa.ts`).

Bump a `rpa_v2.0` cuando Frame.io integration shippee y `calculateRpa` extienda inputs con `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments`.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task_source_id` | `greenhouse_delivery.tasks.task_source_id` (Notion page ID) | primitivo | identidad canonical de la tarea |
| Status transitions `Listo para revisión → En Feedback` | `greenhouse_delivery.task_status_transitions` capturadas vía webhook Notion | primitivo (eventos observables) | **Source canonical V1 post-TASK-908**. Cada transición tiene timestamp + actor |
| `windowStart` / `windowEnd` (opcional) | parámetro del helper | filtro derivado | permite contar correcciones dentro de un período específico (e.g. "RpA del mes May 2026") |
| `clientReviewOpen` (FUTURO V2) | Frame.io integration | primitivo (NO existe hoy) | forward-compat: V2 combina con corrections count bajo policy |
| `workflowReviewOpen` (FUTURO V2) | Workflow team integration | primitivo (NO existe hoy) | forward-compat V2 |
| `openFrameComments` (FUTURO V2) | Frame.io integration | primitivo (NO existe hoy) | forward-compat V2 |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: status edits del operador (cambio de `Status` property → `Listo para revisión` o `En Feedback`)
- **Greenhouse** observa: webhook `page.properties_updated` filtrado por `Estado 1` property → persiste transition row → `countCorrectionTransitions` consume tabla
- **Greenhouse devuelve a Notion**: property read-only `[GH] RpA v2` con el valor computado. El eco raw en BigQuery es `notion_ops.tareas.gh_rpa_v2`, solo para auditoría/paridad; el motor no lo usa como input.

**Propiedad Notion legacy deprecada para RpA V1**: `Correcciones` rollup. Pre-2026-05-17 era el source primario (`Auto` path del dispatcher Notion). Post-decisión boundary 2026-05-17 + TASK-908 ship: `Correcciones` rollup queda como fallback histórico para tareas pre-TASK-908 deployment, NO se consulta en compute canonical.

### 3.2 Forward-compat futuras integraciones

Cuando Frame.io exista, `calculateRpa` extiende inputs sin breaking change:

```typescript
type TaskInputsForRpa = {
  taskSourceId: string
  windowStart?: Date | null
  windowEnd?: Date | null
  // V2 Frame.io extension (V1 ignora estos campos):
  clientReviewOpen?: boolean | null
  workflowReviewOpen?: boolean | null
  openFrameComments?: number | null
}
```

V1: `value = countCorrectionTransitions.count`. V2 (cuando emerja): `value = combinePolicy(correctionTransitions, frameIoSignals)` — la policy V2 se diseña en task separada cuando Frame.io shippee.

**Workflow team rounds (internal review)** NO cuentan para RpA — son métrica paralela `IRR` (Internal Review Rounds) si emerge necesidad operativa. RpA es exclusivamente rondas de **cliente**.

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `calculateRpa(inputs)` | `src/lib/notion-metrics/calculate-rpa.ts` | Designed (TASK-901 Slice 1, pending ship) |
| `countCorrectionTransitions(input)` | `src/lib/notion-metrics/count-correction-transitions.ts` | Designed (TASK-908 Slice 3.5, pending ship) |

### 4.1 Signature canonical V1

```typescript
import 'server-only'
import { countCorrectionTransitions } from './count-correction-transitions'

export const RPA_FORMULA_VERSION = 'rpa_v1.0'

export type TaskInputsForRpa = {
  taskSourceId: string
  windowStart?: Date | null
  windowEnd?: Date | null
  // V2 forward-compat (V1 ignora):
  clientReviewOpen?: boolean | null
  workflowReviewOpen?: boolean | null
  openFrameComments?: number | null
}

export type RpaResult = {
  value: number | null
  dataStatus: 'valid' | 'unavailable' | 'low_confidence' | 'suppressed'
  sourceMode: 'canonical' | 'unavailable'
  inputsUsed: { correctionTransitionsCount: number; windowStart?: Date | null; windowEnd?: Date | null }
  formulaVersion: typeof RPA_FORMULA_VERSION
}

export const calculateRpa = async (inputs: TaskInputsForRpa): Promise<RpaResult> => {
  const transitions = await countCorrectionTransitions({
    taskSourceId: inputs.taskSourceId,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd
  })

  if (transitions.sourceMode === 'unavailable') {
    return {
      value: null,
      dataStatus: 'unavailable',
      sourceMode: 'unavailable',
      inputsUsed: { correctionTransitionsCount: 0, windowStart: inputs.windowStart, windowEnd: inputs.windowEnd },
      formulaVersion: RPA_FORMULA_VERSION
    }
  }

  return {
    value: transitions.count,
    dataStatus: 'valid',
    sourceMode: 'canonical',
    inputsUsed: { correctionTransitionsCount: transitions.count, windowStart: inputs.windowStart, windowEnd: inputs.windowEnd },
    formulaVersion: RPA_FORMULA_VERSION
  }
}
```

### 4.2 Tests anti-regresión mínimos (TASK-901 Slice 1)

Mínimo 8 paths con mock de `countCorrectionTransitions`:

1. Happy: 0 transitions → `value=0`, `dataStatus='valid'`
2. Happy: 1 transición → `value=1`
3. Happy: 5 transiciones (oscilación múltiple) → `value=5`
4. Window filter: 3 transiciones, 2 dentro de ventana → `value=2`
5. Edge: tarea pre-TASK-908 (sourceMode='unavailable') → `value=null`, `dataStatus='unavailable'`
6. Edge: taskSourceId vacío → `value=null`, `dataStatus='unavailable'`
7. Forward-compat ignore: `clientReviewOpen=true` pasado pero V1 lo ignora → mismo result
8. Idempotencia: 2 invocaciones consecutivas con mismos inputs → mismo result

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `rpa_avg` per-member-month | `src/lib/ico-engine/metric-registry.ts:226-249` | Implemented (lee `v_tasks_enriched.rpa` materializado) |

### 5.1 SQL canonical (extracto del registry)

```sql
ROUND(AVG(rpa), 2) AS rpa_avg
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year
  AND period_month = $month
  AND (<CANONICAL_COMPLETED_TASK_SQL>)
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

### 5.2 Denominador canonical

- **Solo tareas completadas** (post-completion compute) — `CANONICAL_COMPLETED_TASK_SQL`
- **Excluye `Bloqueado` / `Detenido` / archivadas / canceladas** — `EXCLUDED_FROM_METRICS_STATUSES` (post fix B.1 de TASK-908)
- **Excluye RpA NULL** (sourceMode='unavailable' a nivel agregado se filtra)

### 5.3 Granularidades soportadas

- `monthly` per member (canonical default — usado por bonificaciones y Person 360)
- `monthly` per space (Pulse, scorecards)
- `monthly` per cliente (Pulse client-side, CVR)
- `weekly` (optional, Pulse trends)

---

## 6. Semántica de casos edge

| Escenario | Cuenta como corrección? | Justificación operativa |
|---|---|---|
| `Listo para revisión → En Feedback` | **Sí** (+1) | El cliente vio el entregable y pidió cambios — evento canonical de corrección |
| `En Feedback → Listo para revisión` (re-submit) | No | Es el colaborador re-entregando, no rechazo del cliente |
| `En curso → En Feedback` (sin pasar por revisión) | No | Trabajo en progreso, no rechazo del cliente |
| `Listo para revisión → Completado/Aprobado` | No | Aprobación directa — RpA = 0 para esa tarea |
| `Listo para revisión → En curso` (sin feedback) | No | Colaborador decidió retomar sin envío al cliente |
| Múltiples ciclos `Listo → Feedback → Listo → Feedback` | Sí (+N) | Cada ronda independiente cuenta |

### 6.1 Tareas excluidas del denominador del agregado

- `Bloqueado`, `Detenido` — esperando dependencias externas (no atribuible al equipo) — post fix B.1 TASK-908
- `Archivada`, `Archivado`, `Archivadas` — fuera del scope operativo
- `Cancelada`, `Canceled`, `Cancelled` — no entregable cancelado

### 6.2 Internal review (workflow team rounds)

**NO cuentan para RpA**. Son rondas internas del equipo, no del cliente. Si emerge necesidad de medir internal review, va a métrica separada `IRR` (Internal Review Rounds).

### 6.3 Tareas pre-TASK-908 (sin transitions capturadas)

`countCorrectionTransitions` retorna `sourceMode='unavailable'` → `calculateRpa` retorna `dataStatus='unavailable'`, `value=null`. **NO** se cae al anti-patrón legacy de leer Notion `Correcciones` rollup. Si la tarea es histórica importante, el backfill (TASK-908 Slice 9) recompone transitions desde Notion history API.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI | Decisión consumer |
|---|---|---|---|
| `valid` | Tarea completada + transitions capturadas + value computado | Valor + benchmark | Usar para reportes, bonificaciones, FTR computation |
| `unavailable` | Tarea pre-TASK-908 sin transitions OR `taskSourceId` inválido | "Sin datos" / `—` | NO usar para FTR (FTR queda `not_applicable`); NO contar en agregado |
| `low_confidence` | (V2 future) Tarea con datos parciales — e.g. tarea con transitions pero ventana incompleta | Valor + warning visual | Usar con caveat documentado |
| `suppressed` | (TASK-215 policy) Compute deliberadamente omitido — e.g. tarea de tipo que no debe medir RpA | Oculto o flag | Razón explícita en metadata |

### 7.1 Cross-ref TASK-215 confidence policy

`src/lib/ico-engine/rpa-policy.ts` (108 líneas) ya define la policy de confianza canonical. `calculateRpa` la consume cuando emerja decisión de classify result como `low_confidence` o `suppressed` per task.

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 2.0 | success (verde) |
| Attention | 2.0 | 3.5 | warning (amber) |
| Critical | 3.5 | ∞ | error (rojo) |

**Lower is better** (es métrica negativa — menos correcciones es mejor).

### 8.1 Benchmark externo (industria)

Engine doc `Greenhouse_ICO_Engine_v1.md` línea 2535-2649 cita: **`RpA ≤ 2.0`** como benchmark para agencias creative-tech LATAM. Greenhouse target operativo histórico: 1.5 promedio.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Hipótesis: video y sitios web tienen RpA esperado más alto (3-4) que estáticos/GIFs (1-2). Calibración per tipo de pieza queda como TASK derivada cuando emerja data suficiente per categoría.

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion | `[GH] RpA v2` (number, read-only para operadores) |
| Estado actual | Productive writeback shipped; raw echo `notion_ops.tareas.gh_rpa_v2` |
| Task de writeback | **TASK-916/TASK-917 Flip A** (productivo) |
| Frecuencia | Per-edit (webhook reactive) + nightly safety net (Cloud Run Job) |
| Latencia esperada | 5-30s post-edit (webhook → outbox → consumer → Cloud Tasks → bulk PATCH) |
| Feature flag | `NOTION_RPA_WRITEBACK_ENABLED` (default `false`) |
| Reliability signal de paridad | `notion.metrics.shadow_paridad_rpa` (TASK-901 Slice 4 shadow mode) |

### 9.1 Pre-condiciones de activación canonical

Pre-flip de `NOTION_RPA_WRITEBACK_ENABLED=true` en producción:

1. TASK-908 Slices 0-3.5 shipped (transitions capture + countCorrectionTransitions) + backfill (Slice 9) verde
2. TASK-901 Slice 4 shadow mode activo 7 días verde
3. `notion.metrics.shadow_paridad_rpa` signal steady=0 (paridad calculateRpa vs RpA formula Notion en > 95% tareas con transitions completas)
4. Allowlist explícita en `Handoff.md` con properties target Notion confirmadas (`[GH] RpA v2` existe en Sky + Efeonce DBs; raw alias `gh_rpa_v2`)
5. Approval HR (compensación variable consume RpA → cambio cross-team)

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado post sesión deep-dive 2026-05-17 + ADR boundary `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1`
- **Decisión semántica canonical clave**: 1 corrección = 1 transición `Listo para revisión → En Feedback` capturada en `task_status_transitions`. RpA = count de esas transiciones per tarea.
- Source primario abandonado: Notion `Correcciones` rollup (anti-patrón frágil — operador puede editar fórmula). Source canonical V1: status transitions canonical capturadas vía webhook (TASK-908).
- TASK-901 es primera writeback completa del pattern. TASK-908 es foundation prerequisito.
- Bug class disparador: TASK-877 follow-up 2026-05-16 (Sky 3,168 tareas con rpa=null 10 meses por bug del sync notion-bq-sync). La decisión canonical elimina dependencia del sync (Greenhouse computa, Notion recibe writeback).

### 2026-04-03 — TASK-215 confidence policy (preservada V1)

- Runtime confidence policy formalizada: dataStatus `valid` / `low_confidence` / `suppressed` / `unavailable`
- Helper `src/lib/ico-engine/rpa-policy.ts` (108 líneas)
- Sigue vigente en V1 — `calculateRpa` resultará compatible con la policy cuando emerja decisión de classify per-task

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**: [FTR_V1.md](FTR_V1.md) (FTR delega a calculateRpa), [CYCLE_TIME_V1.md] (pending — comparte foundation TASK-908)
- **Tasks**: TASK-877 (bridge regression disparador) · TASK-901 (writeback V1) · TASK-908 (foundation transitions + countCorrectionTransitions) · TASK-909 (FTR canonical delega a RpA) · TASK-215 (confidence policy)
- **Código**:
  - Helper canonical: `src/lib/notion-metrics/calculate-rpa.ts` (TASK-901 Slice 1, pending)
  - Foundation: `src/lib/notion-metrics/count-correction-transitions.ts` (TASK-908 Slice 3.5, pending)
  - Policy: `src/lib/ico-engine/rpa-policy.ts` (TASK-215 SHIPPED)
  - Agregado: `src/lib/ico-engine/metric-registry.ts:226-249`
  - Reliability signal coverage: `src/lib/reliability/queries/identity-notion-bridge-coverage.ts` (post-TASK-877, asegura bridge necesario para `assignee_member_id`)
- **Docs reference (consume el spec, NO redefine)**:
  - `Contrato_Metricas_ICO_v1.md` líneas 13-19 + Delta 2026-05-17 secciones A.1 + A.5 + F + G (queda como narrativa de negocio)
  - `Greenhouse_ICO_Engine_v1.md` sección RpA + § A.5.4.0 (queda como framework conceptual)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Calibración per tipo de pieza**: V1 usa threshold uniforme `≤2.0`. V2 calibrable per video/sitio/estático/GIF — TASK derivada cuando emerja data suficiente per categoría.
- **Frame.io integration**: 4 señales V2 (`clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` / `handoffArtifactPresent`) quedan ignoradas en V1. Cuando Frame.io shippee, task separada activa policy V2 + bump `RPA_FORMULA_VERSION = 'rpa_v2.0'`.
- **Internal Review Rounds (IRR)**: métrica paralela hipotética. V1 NO la implementa. Cuando workflow review system emerja, evaluar si crear `IRR_V1.md` como métrica hermana o si IRR es feature interno de un dashboard sin merece spec propio.
- **Backfill histórico de transitions**: TASK-908 Slice 9 cubre el backfill best-effort desde Notion API history. Tareas sin history disponible quedan `unavailable` permanentemente. NO se reconstruye desde Notion `Correcciones` rollup legacy (rompe boundary canonical).
- **Workflow auto-resolución de `low_confidence`**: V1 deja `low_confidence` como concepto disponible vía `rpa-policy.ts` pero NO classify automático. Cuándo aplicar `low_confidence` (e.g. tarea con < N días de observation) → decisión a tomar cuando emerja caso real.

---

## 13. Downstream consumers — qué consume RpA

### 13.1 Payroll bonus calculation — **input PRIMARIO canonical**

**Sí, RpA es uno de los 2 únicos inputs canonical de bonus V1** (el otro es OTD%). Aplica a contratos `indefinido` / `plazo_fijo` / `international_internal` + `deel`. Excluye `honorarios` (discrecional manual).

**Pipeline canonical**:

```text
metrics_by_member.rpa (materializado per member-month)
  ↓
fetchKpisForPeriod() → PayrollKpiSnapshot.rpaAvg
  ↓
calculateRpaBonus(rpaAvg, compensation.bonusRpaMax, bonusConfig)
  ↓
{amount, prorationFactor, qualifies} → persisted en payroll_entries
```

**Helper canonical**: `src/lib/payroll/bonus-proration.ts:54-108` (`calculateRpaBonus`).

**Banded inverse proration** (4 zonas) — RpA lower is better:

| RpA promedio | Zona | Pago % del `bonusRpaMax` |
|---|---|---|
| `≤ 1.7` (`rpaFullPayoutThreshold`) | Full payout | **100%** |
| `1.7 - 2.0` (soft band linear) | Soft band | 100% → 80% (`rpaSoftBandFloorFactor`) |
| `2.0 - 3.0` (hard band linear) | Hard band | 80% → 0% |
| `≥ 3.0` (`rpaThreshold`) | Cutoff | **$0** |

**Ejemplo RpA 1.85** (mid soft band) con `bonusRpaMax = $180,000`:

```text
bandProgress = (1.85 - 1.7) / (2.0 - 1.7) = 0.5
factor = 1 - 0.5 × (1 - 0.8) = 0.9
amount = $180,000 × 0.9 = $162,000
```

**Ejemplo RpA 2.5** (mid hard band) mismo tope:

```text
declineProgress = (2.5 - 2.0) / (3.0 - 2.0) = 0.5
factor = 0.8 × (1 - 0.5) = 0.4
amount = $180,000 × 0.4 = $72,000
```

**Thresholds**: configurables per-tenant via BQ table `payroll_bonus_config` (con vigencia temporal `effective_from`). Defaults canonical en `src/lib/payroll/bonus-config.ts:3-10`.

**Per-member tope**: `greenhouse_payroll.compensation_versions.bonus_rpa_max` (numeric). Cada colaborador puede tener tope distinto según rol/contrato.

**Edge canonical crítico**: `rpaAvg === null` (data unavailable) → helper retorna `{amount: 0, qualifies: false}` — **degradación honesta, NO inventa data**. Bug class TASK-877 follow-up demostró el impacto: 3,168 tareas Sky con `rpa=null` 10 meses → toda la nómina Sky proyectada perdía bonus RpA silenciosamente. TASK-901 elimina la dependencia del sync legacy → bonus estables post-ship.

**Persistencia auditable en `payroll_entries`**:

- `bonus_rpa_amount` — monto computado ($)
- `bonus_rpa_proration_factor` — factor 0-1 (reproducible)
- `bonus_rpa_min` / `bonus_rpa_max` — snapshot del tope al momento del cálculo
- `kpi_rpa_avg` — snapshot del valor KPI ICO usado

**ADR detallado**: [`../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`](../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md) §4.2.

### 13.2 Person 360 + Pulse + ICO scorecards

Display per-member-month de RpA promedio con threshold zone (verde / ámbar / rojo). Consumer lee `metrics_by_member.rpa` directo del registry agregado SQL. NO recompute inline.

### 13.3 CVR / QBR cliente narrative

RpA agregado per-cliente per-período aparece en reportes ejecutivos al cliente (lectura "rondas promedio que tu equipo Globe necesitó para entregar"). Input al claim de "calidad first-pass" de Globe.

### 13.4 Iteration Velocity (Revenue Enabled palanca 2) — relación NO directa

RpA **NO es input directo** de Iteration Velocity. Iteration Velocity discrimina iteración útil (frame_versions ≥ 2 sin client_change_round) vs corrective rework — RpA cuenta solo el rework client-side. Métricas hermanas pero distintas semánticas. Ver `ITERATION_VELOCITY_V1.md` §6.1.
