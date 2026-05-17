# `FTR` — First-Time Right — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | FTR (First-Time Right) |
| Metric ID (registry) | `ftr_pct` (agregado), `ftr` (per-task, helper) |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive FTR + arch reasoning |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (TASK-903 futura implementa writeback per-task; agregado SQL existe hoy en registry) |
| Cross-refs | TASK-909 (helper canonical V1) · TASK-901 (calculateRpa prerequisito) · TASK-908 (foundation transitions prerequisito) · TASK-903 (writeback futuro) · RPA_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**FTR (First-Time Right)** mide si una tarea completada fue entregada bien a la primera, sin que el cliente pidiera correcciones. Es la lectura **binaria** (pass/fail) sobre cada tarea cerrada que complementa RpA (que es cuantitativa).

- `FTR = pass` → la tarea quedó aprobada sin correcciones del cliente (RpA = 0)
- `FTR = fail` → la tarea recibió al menos 1 ronda de correcciones del cliente (RpA ≥ 1)
- `FTR = not_applicable` → la tarea aún no está completada, o no hay data de transiciones canonical disponible

**A quién le importa**:

- **Equipo creativo**: rate de tareas entregadas perfecto-a-la-primera — input para retros + DoD calibration
- **Cliente** (vía QBR/CVR): mide la **calidad del primer entregable** — bajos `fail` = mayor confianza, menos fricción
- **Pitch comercial**: `FTR ≥ 85%` es benchmark canonical industria (per Engine doc § A.5.5)
- **Compensación variable**: `ftr_pct` per-member-month NO es input directo a bonificaciones V1 (RpA promedio sí lo es), pero sí input para reviews 360 y calibración

---

## 2. Fórmula canonical

### 2.1 Per-task (compute individual) — V1 delegación canonical

```text
FTR(task) = calculateRpa(task.source_id).value === 0 ? 'pass' : 'fail'
         = (countCorrectionTransitions(task) === 0) ? 'pass' : 'fail'

prerequisitos:
  - task.completed = true                 (FTR es post-completion only)
  - task NOT IN EXCLUDED_FROM_METRICS    (no archivada, no cancelada, no bloqueada)
  - calculateRpa.dataStatus === 'valid'   (sino FTR = not_applicable)
```

**Delegación pura**: `calculateFtr` NO duplica lógica, solo mapea `RpA → pass/fail`. Cualquier cambio en cómo se cuentan correcciones vive en `calculateRpa` (→ `countCorrectionTransitions`) y FTR se beneficia automático.

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:226-249
ROUND(
  100.0 * COUNT(*) FILTER (WHERE <CANONICAL_FTR_PASSED_SQL>)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_COMPLETED_TASK_SQL>), 0),
  1
) AS ftr_pct
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Donde `CANONICAL_FTR_PASSED_SQL = <CANONICAL_COMPLETED_TASK_SQL> AND client_change_round_final = 0` (post TASK-901 writeback: la columna `rpa` materializada en `v_tasks_enriched` será populated desde Greenhouse compute; pre-TASK-901 lee desde `notion_ops.tareas.rpa` sync legacy).

### 2.3 Versionado de fórmula

`FTR_FORMULA_VERSION = 'ftr_v1.0'` (constant en `src/lib/notion-metrics/calculate-ftr.ts`).

Bump a `ftr_v2.0` ocurre **automáticamente vía delegación** cuando `RPA_FORMULA_VERSION` bumpee a `v2.0` (Frame.io integration extiende señales en calculateRpa). FTR helper NO necesita refactor — la delegación pura propaga la mejora.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `taskSourceId` | `greenhouse_delivery.tasks.task_source_id` | primitivo | identidad de tarea |
| `RpaResult` (delegado) | `calculateRpa(taskSourceId)` | derivado | source canonical único — FTR NO consulta `task_status_transitions` directamente |
| `task.completed` | `greenhouse_delivery.tasks.completed_at IS NOT NULL` | primitivo | gate pre-evaluación: FTR solo aplica a tareas terminadas |
| `task.status` | `task_status` columna | primitivo | exclusión: tareas en `EXCLUDED_FROM_METRICS_STATUSES` no entran al agregado |
| `windowStart` / `windowEnd` (opcional) | parámetro del helper | filtro derivado | propaga a `calculateRpa` |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: status edits + completion flag (cambio de `Status` a `Completado` / `Aprobado`)
- **Greenhouse** computa: vía delegación → `calculateRpa` → `countCorrectionTransitions` → lee `task_status_transitions`
- **Greenhouse devuelve a Notion**: property read-only `[GH] FTR` (TASK-903 futura, no V1)

### 3.2 Forward-compat Frame.io (V2)

Cuando `calculateRpa` extienda inputs con Frame.io signals (V2), `calculateFtr` se beneficia automático sin breaking change. El spec V1 propaga `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` a `calculateRpa` (que en V1 los ignora). V2 activa la policy combinatoria en `calculateRpa` → FTR resultará más estricto naturalmente (e.g. "pass" requiere también que no haya reviews Frame.io abiertas).

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `calculateFtr(inputs)` | `src/lib/notion-metrics/calculate-ftr.ts` | Designed (TASK-909 Slice 1, pending ship) |

### 4.1 Signature canonical V1

```typescript
import 'server-only'
import { calculateRpa, type RpaResult } from './calculate-rpa'

export const FTR_FORMULA_VERSION = 'ftr_v1.0'

export type TaskInputsForFtr = {
  taskSourceId: string
  windowStart?: Date | null
  windowEnd?: Date | null
  // V2 forward-compat (propagado a calculateRpa, V1 ignora):
  clientReviewOpen?: boolean | null
  workflowReviewOpen?: boolean | null
  openFrameComments?: number | null
  handoffArtifactPresent?: boolean | null
}

export type FtrResult = {
  value: 'pass' | 'fail' | 'not_applicable' | null
  dataStatus: 'valid' | 'unavailable'
  sourceMode: 'canonical' | 'unavailable'
  rpaSnapshot: RpaResult
  formulaVersion: typeof FTR_FORMULA_VERSION
}

export const calculateFtr = async (inputs: TaskInputsForFtr): Promise<FtrResult> => {
  const rpa = await calculateRpa({
    taskSourceId: inputs.taskSourceId,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd,
    clientReviewOpen: inputs.clientReviewOpen,
    workflowReviewOpen: inputs.workflowReviewOpen,
    openFrameComments: inputs.openFrameComments
  })

  if (rpa.dataStatus === 'unavailable' || rpa.value === null) {
    return {
      value: null,
      dataStatus: 'unavailable',
      sourceMode: rpa.sourceMode,
      rpaSnapshot: rpa,
      formulaVersion: FTR_FORMULA_VERSION
    }
  }

  return {
    value: rpa.value === 0 ? 'pass' : 'fail',
    dataStatus: 'valid',
    sourceMode: 'canonical',
    rpaSnapshot: rpa,
    formulaVersion: FTR_FORMULA_VERSION
  }
}
```

**Importante**: el caller debe pre-validar `task.completed === true` y `task.status NOT IN EXCLUDED_FROM_METRICS` antes de invocar `calculateFtr`. Si no, FTR retorna `pass`/`fail` calculado pero el caller decide si es semánticamente válido. Convención canonical: `calculateFtr` se invoca **post-completion only**.

### 4.2 Tests anti-regresión mínimos (TASK-909 Slice 1)

Mínimo 8 paths con mocks de `calculateRpa`:

1. Happy pass: RpA=0 → FTR `pass`
2. Happy fail: RpA=1 → FTR `fail`
3. Happy fail multiple: RpA=5 → FTR `fail`
4. Unavailable: RpA `sourceMode='unavailable'` → FTR `null`, `dataStatus='unavailable'`
5. RpA `value=null` → FTR `null`
6. Window filter propagation: ventana se pasa a `calculateRpa`
7. Forward-compat ignore: `clientReviewOpen=true` se propaga a `calculateRpa` (que V1 ignora) → mismo result
8. `rpaSnapshot` preservado en `FtrResult` para forensic/debugging downstream

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `ftr_pct` per-member-month | `src/lib/ico-engine/metric-registry.ts:226-249` | Implemented (lee `v_tasks_enriched.rpa` materializado) |

### 5.1 SQL canonical (extracto del registry)

```sql
ROUND(
  100.0 * COUNT(*) FILTER (WHERE <CANONICAL_FTR_PASSED_SQL>)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_COMPLETED_TASK_SQL>), 0),
  1
) AS ftr_pct
```

Donde:

```sql
CANONICAL_FTR_PASSED_SQL = <CANONICAL_COMPLETED_TASK_SQL>
                        AND client_change_round_final = 0
```

### 5.2 Coexistencia per-task helper + SQL agregado canonical

**Ambos coexisten — ambos canonical**:

| Layer | Cuándo se usa | Source data |
|---|---|---|
| `calculateFtr(taskId)` per-task helper | Writeback Notion (TASK-903 futura) + UI per-task drawer + investigación per-task | Live: `calculateRpa` → `countCorrectionTransitions` (TASK-908 transitions table) |
| `ftr_pct` SQL aggregate registry | Dashboards mensuales (Person 360, Pulse, ICO scorecards) | Materializado: `v_tasks_enriched.rpa` (post TASK-901 writeback, viene del compute canonical) |

Pre-TASK-901 writeback: `v_tasks_enriched.rpa` viene del sync legacy `notion-bq-sync` (con bug class TASK-877 follow-up). Post-TASK-901: `v_tasks_enriched.rpa` viene del compute canonical Greenhouse via writeback → bug class eliminado upstream.

### 5.3 Denominador canonical

- **Solo tareas completadas** — `CANONICAL_COMPLETED_TASK_SQL`
- **Excluye `Bloqueado` / `Detenido` / archivadas / canceladas** — `EXCLUDED_FROM_METRICS_STATUSES` (post fix B.1 TASK-908)
- **Excluye RpA NULL** — tareas sin transitions canonical no entran al agregado

### 5.4 Granularidades soportadas

- `monthly` per member (canonical default — usado por Person 360 + reviews)
- `monthly` per space (Pulse, scorecards Sky/Efeonce)
- `monthly` per cliente (CVR client-facing)
- `weekly` (optional, trends)

---

## 6. Semántica de casos edge

### 6.1 Decisiones canonical pre-aprobadas en sesión 2026-05-17

**Q1 — ¿FTR se evalúa solo cuando la tarea está completada?** **Sí, post-completion only.** Tarea abierta con 0 correcciones hasta el momento NO es "FTR pass anticipado" — es `not_applicable` (todavía puede recibir correcciones).

**Q2 — ¿Qué cuenta como "completada"?** **Cualquier status terminal**: Efeonce usa `Completado` / `Done` / `Listo`; Sky usa `Aprobado` (post fix B.2 TASK-908). Pre-TASK-908 fix B.2, Sky `Aprobado` queda fuera del denominador (síntoma del gap, no del FTR).

**Q3 — ¿El agregado FTR% sigue siendo SQL del registry o se computa per-task?** **AMBOS coexisten** (sección 5.2 arriba). Helper per-task para writeback futuro + drawer detail; SQL aggregate para dashboards.

**Q4 — Threshold canonical FTR ≥85% (del Engine doc línea 2535-2649) — ¿se mantiene?** **Sí**, mantener `FTR ≥85%` como benchmark canonical. Calibrable per tipo de pieza en futura iteración.

### 6.2 Tabla de escenarios edge

| Escenario | FTR resultado | Justificación |
|---|---|---|
| Tarea completada con 0 correcciones | `pass` | RpA=0 → first-time right |
| Tarea completada con 3 correcciones | `fail` | RpA>0 → no fue first-time |
| Tarea abierta `En curso` con 0 correcciones | `not_applicable` | FTR es post-completion only |
| Tarea abierta `En Feedback` con 2 correcciones | `not_applicable` | Aún puede recibir más correcciones — FTR final TBD |
| Tarea completada pero pre-TASK-908 (sin transitions) | `not_applicable` (`dataStatus='unavailable'`) | NO se infiere desde Notion `Correcciones` legacy |
| Tarea `Bloqueado` o `Detenido` | NO entra al agregado | Excluida del denominador (EXCLUDED_FROM_METRICS) |
| Tarea archivada o cancelada | NO entra al agregado | Excluida del denominador |
| Tarea Sky completada en estado `Aprobado` pre fix B.2 | NO entra (gap conocido) | Síntoma TASK-908 Slice 7 — post fix B.2 entra correctamente |
| Tarea internal-only Efeonce | Sí entra | Per regla operativa: Efeonce se trata como cliente más (interno) |

### 6.3 Workflow team rounds (internal review)

**NO afectan FTR**. FTR mide rondas de **cliente** (vía RpA que mide solo rondas de cliente). Internal review rounds, si emergen como métrica, van a `IRR` (Internal Review Rounds) separada.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI | Decisión consumer |
|---|---|---|---|
| `valid` | `calculateRpa` returns valid + tarea completada | Pass/Fail badge + benchmark | Usar para reportes, dashboards, writeback futuro |
| `unavailable` | `calculateRpa` returns unavailable (tarea pre-TASK-908 sin transitions) | "Sin datos" / `—` | NO contar en agregado; NO afecta `ftr_pct` |
| `not_applicable` (semantic V1) | Tarea aún no completada o en estado excluido | Oculto en UI per-task; NO entra al agregado | Consumer entiende que FTR aún no es evaluable |
| `low_confidence` (futuro V2) | Tarea con data parcial — e.g. ventana de medición incompleta | Pass/Fail + warning visual | Usar con caveat |

### 7.1 Mapping `value → dataStatus`

| `FtrResult.value` | `FtrResult.dataStatus` | Significado |
|---|---|---|
| `'pass'` | `'valid'` | Tarea completada, RpA=0, evaluación firme |
| `'fail'` | `'valid'` | Tarea completada, RpA≥1, evaluación firme |
| `'not_applicable'` | `'valid'` | Tarea fuera de scope (e.g. abierta) — uso futuro V1.1 cuando emerja caller que pre-valide |
| `null` | `'unavailable'` | Data no disponible (RpA sourceMode unavailable) |

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 85% | 100% | success (verde) |
| Attention | 70% | 85% | warning (amber) |
| Critical | 0% | 70% | error (rojo) |

**Higher is better** (es métrica positiva — más first-time-right es mejor).

### 8.1 Benchmark externo (industria)

Engine doc `Greenhouse_ICO_Engine_v1.md` línea 2535-2649 cita: **`FTR ≥85%`** como benchmark canonical para agencias creative-tech LATAM (alineado con `metric-registry.ts` thresholds existentes).

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Hipótesis: GIFs y banners estáticos tienen FTR esperado más alto (90%+) que videos largos o sites (75-85%). Calibración per tipo queda como TASK derivada cuando emerja data suficiente.

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion | `[GH] FTR` (select `Pass` / `Fail` / `N/A`, read-only para operadores) |
| Estado actual | `not_implemented` |
| Task de writeback | **TASK-903** (futura, post TASK-901 RpA writeback verde 30+ días) |
| Frecuencia | Per-edit (webhook reactive) + nightly safety net |
| Latencia esperada | 5-30s post-edit (mismo pattern TASK-901) |
| Feature flag | `NOTION_FTR_WRITEBACK_ENABLED` (default `false`) |
| Reliability signal de paridad | `notion.metrics.shadow_paridad_ftr` (TASK-903 shadow mode futuro) |

### 9.1 Pre-condiciones de activación canonical

Pre-flip de `NOTION_FTR_WRITEBACK_ENABLED=true`:

1. TASK-908 Slices 0-3.5 shipped + backfill verde
2. TASK-901 SHIPPED + writeback RpA en `enabled` 30+ días verde
3. TASK-903 shadow mode FTR 7 días verde
4. `notion.metrics.shadow_paridad_ftr` signal steady=0
5. Allowlist en `Handoff.md` con `[GH] FTR` property confirmada en Sky + Efeonce DBs

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado post sesión deep-dive 2026-05-17 + ADR boundary + decisión delegación pura
- **Decisión canonical clave**: `calculateFtr` delega a `calculateRpa` (zero lógica propia — `value === 0 ? 'pass' : 'fail'`). NO implementa el motor compuesto de 5 señales que describe Engine doc § A.5.3 (4 de las 5 dependen de Frame.io que no existe). Forward-compat: cuando Frame.io shippee, `calculateRpa` se extiende y FTR se beneficia automático sin breaking change.
- **4 decisiones semánticas canonical pre-aprobadas en sesión** (Q1-Q4 sección 6.1): post-completion only, "completada" incluye Sky `Aprobado` post fix B.2, helper per-task + SQL agregado coexisten, threshold 85% mantenido.
- TASK-909 implementa Slice 1 (helper). TASK-903 futura implementa writeback completo cuando TASK-901 esté en `enabled` 30d.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**: [RPA_V1.md](RPA_V1.md) (FTR delega a RpA — source canonical único)
- **Tasks**: TASK-909 (helper canonical V1) · TASK-901 (calculateRpa prerequisite) · TASK-908 (foundation transitions prerequisite) · TASK-903 (writeback futuro, post TASK-901 30d)
- **Código**:
  - Helper canonical: `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1, pending)
  - Helper delegado: `src/lib/notion-metrics/calculate-rpa.ts` (TASK-901 Slice 1, pending)
  - Agregado: `src/lib/ico-engine/metric-registry.ts:226-249` (existing — usa `CANONICAL_FTR_PASSED_SQL`)
  - Constant: `CANONICAL_FTR_PASSED_SQL` en `metric-registry.ts:155-158`
- **Docs reference (consume el spec, NO redefine)**:
  - `Contrato_Metricas_ICO_v1.md` (narrativa de negocio cross-métrica)
  - `Greenhouse_ICO_Engine_v1.md` § A.5.3 FTR composite (framework conceptual V2 aspiracional — V1 helper es delegación pura)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Motor compuesto V2 (5 señales)**: spec del Engine doc § A.5.3 describe FTR como composite de 5 señales (Correcciones=0, client_review_open=false, workflow_review_open=false, open_frame_comments=0, handoff_artifact_present=true). V1 implementa solo señal #1 (delegada a RpA). V2 emerge cuando Frame.io integration shippee — el motor compuesto vive en `calculateRpa` (extensión), NO en `calculateFtr` (que sigue delegando).
- **Calibración per tipo de pieza**: V1 usa threshold uniforme `≥85%`. V2 calibrable per video/sitio/estático — TASK derivada.
- **Estado semántico `not_applicable` per-task explícito**: V1 usa `dataStatus='unavailable'` cuando RpA no disponible. V1.1 puede agregar `value='not_applicable'` cuando caller pre-valida que la tarea no está completada (semantic clarity > overloading null).
- **Internal Review Rounds (IRR) como métrica hermana**: V1 NO mide internal review. Si emerge necesidad operativa, evaluar TASK separada `IRR_V1.md` como métrica paralela a FTR sin afectar el contrato de RpA/FTR de cliente.
- **Per-cliente threshold customization**: ¿Sky merece threshold distinto a Efeonce internal? V1 NO. Si emerge demanda comercial (cliente Globe enterprise pide SLA específico de FTR), evaluar V2 per-cliente.
- **FTR rolling window vs absolute period**: V1 usa periodo mensual cerrado (month-end snapshot). V2 podría exponer FTR rolling 30d para early-detection. Decisión cuando emerja consumer real.
