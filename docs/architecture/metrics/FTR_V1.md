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
| Writeback state | `infra_shipped_flag_off` (TASK-903 SHIPPED 2026-05-24 — pipeline compute+writeback con flag `NOTION_FTR_WRITEBACK_ENABLED` default OFF; agregado SQL `ftr_pct` ya existe en registry) |
| Cross-refs | TASK-909 (helper canonical V1 — SHIPPED) · TASK-901 (calculateRpaV2 prerequisito — SHIPPED) · TASK-908 (foundation transitions prerequisito — SHIPPED) · TASK-903 (writeback infra — SHIPPED flag OFF) · RPA_V1 · ADR boundary · ADR metric spec pattern |

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
FTR(task) = calculateRpaV2(task.source_id).value === 0 ? 'pass' : 'fail'
         = (countCorrectionTransitions(task) === 0) ? 'pass' : 'fail'

prerequisitos:
  - task.completed = true                  (FTR es post-completion only)
  - task NOT IN EXCLUDED_FROM_METRICS     (no archivada, no cancelada, no bloqueada)
  - calculateRpaV2.dataStatus === 'valid'  (sino FTR = unavailable/not_applicable)
```

**Delegación pura**: `calculateFtr` NO duplica lógica, solo mapea `RpA → pass/fail`. Cualquier cambio en cómo se cuentan correcciones vive en `calculateRpaV2` (→ `countCorrectionTransitions`) y FTR se beneficia automático.

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

La versión de FTR trackea **su propia lógica de mapping** (`pass/fail`), desacoplada de la versión interna de RpA. El helper delegado ya shipeó en `rpa_v2.0` (TASK-901, estrangulador RpA V2) — por eso `ftr_v1.0` delega a `rpa_v2.0` sin que eso sea un mismatch: cada métrica versiona su propia transformación. Para trazabilidad full, `rpaSnapshot.formulaVersion` registra qué versión de RpA produjo el input. FTR sube a `ftr_v2.0` solo si cambia su propio mapping (e.g. si V2 incorpora señales Frame.io con lógica combinatoria propia más allá de delegar a RpA).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `taskSourceId` | `greenhouse_delivery.tasks.task_source_id` | primitivo | identidad de tarea |
| `RpaV2Result` (delegado) | `calculateRpaV2(taskSourceId)` | derivado | source canonical único — FTR NO consulta `task_status_transitions` directamente |
| `task.completed` | `greenhouse_delivery.tasks.completed_at IS NOT NULL` | primitivo | gate pre-evaluación: FTR solo aplica a tareas terminadas |
| `task.status` | `task_status` columna | primitivo | exclusión: tareas en `EXCLUDED_FROM_METRICS_STATUSES` no entran al agregado |
| `windowStart` / `windowEnd` (opcional) | parámetro del helper | filtro derivado | propaga a `calculateRpaV2` |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: status edits + completion flag (cambio de `Status` a `Completado` / `Aprobado`)
- **Greenhouse** computa: vía delegación → `calculateRpaV2` → `countCorrectionTransitions` → lee `task_status_transitions`
- **Greenhouse devuelve a Notion**: property read-only `[GH] FTR` (TASK-903 SHIPPED infra, flag OFF — activación gated)

### 3.2 Forward-compat Frame.io (V2)

Cuando `calculateRpaV2` extienda inputs con Frame.io signals, `calculateFtr` se beneficia automático sin breaking change. El spec V1 propaga `clientReviewOpen` / `workflowReviewOpen` / `openFrameComments` a `calculateRpaV2` (que hoy los ignora — están declarados como forward-compat en `TaskInputsForRpaV2`). La integración futura activa la policy combinatoria en `calculateRpaV2` → FTR resultará más estricto naturalmente (e.g. "pass" requiere también que no haya reviews Frame.io abiertas). `handoffArtifactPresent` queda como campo FTR-level reservado: `calculateRpaV2` aún NO lo acepta, por lo que NO se propaga en V1.

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `calculateFtr(inputs)` | `src/lib/notion-metrics/calculate-ftr.ts` | **SHIPPED** (TASK-909 Slice 1, 2026-05-24) |

### 4.1 Signature canonical V1

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
  // handoffArtifactPresent: campo FTR-level reservado V2; calculateRpaV2 aún
  // NO lo acepta como input, por lo que NO se propaga en V1.
  handoffArtifactPresent?: boolean | null
}

export type FtrResult = {
  value: 'pass' | 'fail' | 'not_applicable' | null
  // Hereda los estados computables de RpA V2. `low_confidence` se propaga para
  // no perder la señal cuando RpA lo emite (RpaV2Result.dataStatus tiene 4
  // valores: valid | unavailable | low_confidence | suppressed).
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

  // No computable: sin data canonical (`unavailable`), valor nulo, o
  // explícitamente suprimida (`suppressed`) → FTR `null` + `unavailable`.
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

  // value no-nulo + dataStatus `valid` o `low_confidence` → computa pass/fail.
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

**Importante**: el caller debe pre-validar `task.completed === true` y `task.status NOT IN EXCLUDED_FROM_METRICS` antes de invocar `calculateFtr`. Si no, FTR retorna `pass`/`fail` calculado pero el caller decide si es semánticamente válido. Convención canonical: `calculateFtr` se invoca **post-completion only**.

### 4.2 Tests anti-regresión mínimos (TASK-909 Slice 1)

Mínimo 9 paths con mocks de `calculateRpaV2`:

1. Happy pass: RpA=0 → FTR `pass`, `dataStatus='valid'`
2. Happy fail: RpA=1 → FTR `fail`, `dataStatus='valid'`
3. Happy fail multiple: RpA=5 → FTR `fail`
4. Unavailable: RpA `dataStatus='unavailable'` → FTR `null`, `dataStatus='unavailable'`
5. RpA `value=null` → FTR `null`, `dataStatus='unavailable'`
6. Suppressed: RpA `dataStatus='suppressed'` (con value no-nulo) → FTR `null`, `dataStatus='unavailable'` (no se computa pass/fail sobre data suprimida)
7. Low confidence: RpA `dataStatus='low_confidence'`, value=0 → FTR `pass`, `dataStatus='low_confidence'` (señal propagada, NO colapsada a valid)
8. Window filter propagation: ventana se pasa a `calculateRpaV2`
9. Forward-compat: `clientReviewOpen=true` se propaga a `calculateRpaV2` (que hoy lo ignora) → mismo result; `rpaSnapshot` preservado en `FtrResult` para forensic/debugging downstream

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
| `calculateFtr(taskId)` per-task helper | Writeback Notion (TASK-903 SHIPPED, flag OFF) + UI per-task drawer + investigación per-task | Live: `calculateRpaV2` → `countCorrectionTransitions` (TASK-908 transitions table) |
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
| `valid` | `calculateRpaV2` returns `valid` + tarea completada | Pass/Fail badge + benchmark | Usar para reportes, dashboards, writeback futuro |
| `unavailable` | `calculateRpaV2` returns `unavailable` o `suppressed`, o `value=null` (tarea pre-TASK-908 sin transitions, o data suprimida) | "Sin datos" / `—` | NO contar en agregado; NO afecta `ftr_pct` |
| `low_confidence` (V1-activo) | `calculateRpaV2` returns `low_confidence` con value no-nulo (data parcial — e.g. ventana de medición incompleta) | Pass/Fail + warning visual | Usar con caveat; la señal se propaga, NO se colapsa a `valid` |
| `not_applicable` (semantic, value-level) | Tarea aún no completada o en estado excluido | Oculto en UI per-task; NO entra al agregado | Consumer entiende que FTR aún no es evaluable (caller pre-valida; ver §7.1) |

### 7.1 Mapping `value → dataStatus`

| `FtrResult.value` | `FtrResult.dataStatus` | Significado |
|---|---|---|
| `'pass'` | `'valid'` | Tarea completada, RpA=0, evaluación firme |
| `'fail'` | `'valid'` | Tarea completada, RpA≥1, evaluación firme |
| `'pass'` / `'fail'` | `'low_confidence'` | Computada pero RpA marcó data parcial — usar con caveat |
| `'not_applicable'` | `'valid'` | Tarea fuera de scope (e.g. abierta) — uso futuro V1.1 cuando emerja caller que pre-valide |
| `null` | `'unavailable'` | Data no disponible (RpA `unavailable`/`suppressed` o `value=null`) |

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
| Estado actual | `infra_shipped_flag_off` (TASK-903 SHIPPED 2026-05-24 — pipeline compute+writeback con flag `NOTION_FTR_WRITEBACK_ENABLED` default OFF; cero escrituras a Notion hasta el flip gated) |
| Task de writeback | **TASK-903** (SHIPPED 2026-05-24; activación gated post TASK-916 RpA writeback `enabled` 30+ días + decisión FTR-explícito) |
| Frecuencia | Per-edit (webhook reactive) + nightly safety net |
| Latencia esperada | 5-30s post-edit (mismo pattern TASK-901) |
| Feature flag | `NOTION_FTR_WRITEBACK_ENABLED` (default `false`) |
| Reliability signal de paridad | **Cubierto por `notion.metrics.shadow_paridad_rpa` (TASK-916)** — NO existe signal `shadow_paridad_ftr` standalone. FTR es derivada pura de RpA (`pass ⇔ RpA===0`) sin fórmula Notion legacy que diffear; si RpA paridad ≥95%, FTR paridad ≥95% por construcción. Signals FTR operacionales: `notion.metrics.ftr_writeback_{dead_letter,lag}` (SHIPPED) |

### 9.1 Pre-condiciones de activación canonical

Pre-flip de `NOTION_FTR_WRITEBACK_ENABLED=true`:

1. TASK-908 Slices 0-3.5 shipped + backfill verde
2. TASK-901 SHIPPED + writeback RpA en `enabled` 30+ días verde
3. TASK-903 shadow mode FTR 7 días verde (flag ON observado, signals `ftr_writeback_{dead_letter,lag}` steady=0)
4. `notion.metrics.shadow_paridad_rpa` (TASK-916) steady=0 — cubre FTR por construcción (no existe `shadow_paridad_ftr` standalone)
5. Allowlist en `Handoff.md` con `[GH] FTR` property confirmada en Sky + Efeonce DBs
6. Decisión explícita: FTR explícito vale vs derivarlo del número RpA ya visible (ver "Why This Task Exists" en TASK-903)

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado post sesión deep-dive 2026-05-17 + ADR boundary + decisión delegación pura
- **Decisión canonical clave**: `calculateFtr` delega a `calculateRpaV2` (zero lógica propia — `value === 0 ? 'pass' : 'fail'`). NO implementa el motor compuesto de 5 señales que describe Engine doc § A.5.3 (4 de las 5 dependen de Frame.io que no existe). Forward-compat: cuando Frame.io shippee, `calculateRpaV2` se extiende y FTR se beneficia automático sin breaking change.

### 2026-05-23 — Corrección naming drift V2 + dataStatus mapping

- **Naming**: el helper delegado shipeó en TASK-901 como `calculateRpaV2` / `RpaV2Result` / `TaskInputsForRpaV2` en `src/lib/notion-metrics/calculate-rpa-v2.ts` (estrangulador RpA V2, ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`), NO `calculateRpa` / `RpaResult` / `./calculate-rpa` como decía el sketch original. Spec corregida en §2.1, §3, §4.1, §5.2, §10, §11.
- **dataStatus mapping**: `RpaV2Result.dataStatus` emite 4 valores (`valid | unavailable | low_confidence | suppressed`). El mapping V1 quedó canonizado: `unavailable`/`suppressed`/`value=null` → FTR `unavailable`; `low_confidence` → FTR `low_confidence` (señal propagada, no colapsada a `valid`). `FtrResult.dataStatus` ampliado a `valid | unavailable | low_confidence`.
- **Versionado**: `ftr_v1.0` delega a `rpa_v2.0` — no es mismatch; cada métrica versiona su propia transformación (§2.3).
- TASK-901 + TASK-908 SHIPPED → TASK-909 está **desbloqueada** (era el estado pendiente correcto).
- **4 decisiones semánticas canonical pre-aprobadas en sesión** (Q1-Q4 sección 6.1): post-completion only, "completada" incluye Sky `Aprobado` post fix B.2, helper per-task + SQL agregado coexisten, threshold 85% mantenido.
- TASK-909 implementa Slice 1 (helper). TASK-903 implementa la infra de writeback (SHIPPED 2026-05-24, flag OFF); el flip a writeback activo queda gated post TASK-916 RpA `enabled` 30d.

### 2026-05-24 — Writeback infra SHIPPED flag OFF (TASK-903)

- Pipeline FTR writeback PRODUCTIVO shipped: `notionFtrComputeProjection` (calculateFtr → `task_ftr_snapshots` → chain event `notion.task.ftr_writeback_requested`) + `notionFtrWritebackProjection` (PATCH select `[GH] FTR` Pass/Fail) — clone mecánico de TASK-916 RpA repointeado a FTR. Gated `NOTION_FTR_WRITEBACK_ENABLED` default OFF → cero escrituras a Notion al merge.
- 2 reliability signals operacionales: `notion.metrics.ftr_writeback_dead_letter` + `notion.metrics.ftr_writeback_lag` (subsystem delivery, steady=0).
- **`notion.metrics.shadow_paridad_ftr` NO se creó standalone**: FTR es derivada pura de RpA y no tiene fórmula Notion legacy que diffear; su paridad queda cubierta por `notion.metrics.shadow_paridad_rpa` (TASK-916) por construcción. Crear un signal sin comparando legacy sería placeholder no-funcional.
- Consumer real de `calculateFtr` (TASK-909). Migration `20260524200315533` aplicada + tipos regenerados. 42 tests focales. Activación (flip flag) gated por §9.1 + decisión "FTR explícito vale vs derivar de RpA" (ver TASK-903 "Why This Task Exists").

### 2026-05-24 — Helper SHIPPED (TASK-909 Slice 1)

- `calculateFtr` shipped en `src/lib/notion-metrics/calculate-ftr.ts` — delegación pura a `calculateRpaV2`, tipos inline, `FTR_FORMULA_VERSION = 'ftr_v1.0'`. 13 tests (9 paths spec §4.2 + idempotencia + version anti-regresión). Mapping canonizado: `unavailable`/`suppressed`/`value=null` → FTR `unavailable`; `low_confidence` propagado (no colapsado a `valid`).
- Lint rule `greenhouse/no-inline-ftr-calculation` (modo `warn`) shipped — **precisa al recompute del veredicto FTR** (P1 `client_change_round_final` + literal `'pass'/'fail'`, P2 `.value === 0 ? 'pass'`, P3 `formula.ftr` legacy). NO matchea `client_change_round_final = 0` a secas (agregados BQ legítimos "tareas sin ajustes" en dashboard/capability-queries/sla-compliance/ico-engine). Full-source scan, ZERO false positives verificado. Override block exime helper + tests + rule.
- **Slices 2/3/4 ya estaban hechos** por la sesión doc-only 2026-05-17 (THROUGHPUT_V1.md + PIPELINE_VELOCITY_V1.md Accepted, Engine doc Delta 2026-05-17 head, Contrato sección H, DECISIONS_INDEX entries METRIC_SPEC_PATTERN + OWNERSHIP_BOUNDARY) → TASK-909 ejecutó solo Slice 1 (código) + Slice 5 (METRICS_INDEX/CLAUDE.md touch-up + closing).
- Zero cambios de código en `metric-registry.ts` (FTR/throughput/pipeline_velocity intactos — confirma boundary "código es source of truth").

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**: [RPA_V1.md](RPA_V1.md) (FTR delega a RpA — source canonical único)
- **Tasks**: TASK-909 (helper canonical V1 — SHIPPED) · TASK-901 (calculateRpaV2 prerequisite — SHIPPED) · TASK-908 (foundation transitions prerequisite — SHIPPED) · TASK-903 (writeback infra — SHIPPED flag OFF, activación gated post TASK-916 30d)
- **Código**:
  - Helper canonical: `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1, pending)
  - Helper delegado: `src/lib/notion-metrics/calculate-rpa-v2.ts` (`calculateRpaV2` — TASK-901 Slice 1, SHIPPED)
  - Agregado: `src/lib/ico-engine/metric-registry.ts:226-249` (existing — usa `CANONICAL_FTR_PASSED_SQL`)
  - Constant: `CANONICAL_FTR_PASSED_SQL` en `metric-registry.ts:155-158`
- **Docs reference (consume el spec, NO redefine)**:
  - `Contrato_Metricas_ICO_v1.md` (narrativa de negocio cross-métrica)
  - `Greenhouse_ICO_Engine_v1.md` § A.5.3 FTR composite (framework conceptual V2 aspiracional — V1 helper es delegación pura)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Motor compuesto V2 (5 señales)**: spec del Engine doc § A.5.3 describe FTR como composite de 5 señales (Correcciones=0, client_review_open=false, workflow_review_open=false, open_frame_comments=0, handoff_artifact_present=true). V1 implementa solo señal #1 (delegada a RpA). V2 emerge cuando Frame.io integration shippee — el motor compuesto vive en `calculateRpaV2` (extensión), NO en `calculateFtr` (que sigue delegando). Nota: `handoffArtifactPresent` aún NO existe como input de `TaskInputsForRpaV2`; cuando se agregue, FTR podrá propagarlo.
- **Calibración per tipo de pieza**: V1 usa threshold uniforme `≥85%`. V2 calibrable per video/sitio/estático — TASK derivada.
- **Estado semántico `not_applicable` per-task explícito**: V1 usa `dataStatus='unavailable'` cuando RpA no disponible. V1.1 puede agregar `value='not_applicable'` cuando caller pre-valida que la tarea no está completada (semantic clarity > overloading null).
- **Internal Review Rounds (IRR) como métrica hermana**: V1 NO mide internal review. Si emerge necesidad operativa, evaluar TASK separada `IRR_V1.md` como métrica paralela a FTR sin afectar el contrato de RpA/FTR de cliente.
- **Per-cliente threshold customization**: ¿Sky merece threshold distinto a Efeonce internal? V1 NO. Si emerge demanda comercial (cliente Globe enterprise pide SLA específico de FTR), evaluar V2 per-cliente.
- **FTR rolling window vs absolute period**: V1 usa periodo mensual cerrado (month-end snapshot). V2 podría exponer FTR rolling 30d para early-detection. Decisión cuando emerja consumer real.

---

## 13. Downstream consumers — qué consume FTR

### 13.1 Payroll bonus calculation — **NO input bonus V1**

**No**. FTR NO entra al cálculo de bonus V1.

**Razón canonical**: FTR es derivada pura de RpA (`calculateFtr` pass ⇔ `calculateRpaV2.value === 0`). Incluirla como input bonus separado sería **double-counting** con RpA — la misma señal operativa (rondas de cliente = 0) pagaría dos veces. HR/Finance decisión: bonus opera sobre RpA cuantitativo (granularidad fina: pago varía por número de rondas) en lugar de FTR binario.

Si V2 cambia FTR para incluir señales adicionales Frame.io (`client_review_open`, `workflow_review_open`, `open_frame_comments`) cuando esa integración exista, evaluar si emerge FTR como input bonus independiente con compute distinto a RpA puro. V1 NO.

**ADR detallado**: [`../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`](../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md) §10.

### 13.2 Dashboards Person 360 + Pulse + scorecards

Display per-member-month de `ftr_pct` con threshold zone (verde ≥85% / ámbar 70-85% / rojo <70%). Consumer lee `metrics_by_member.ftr_pct` agregado SQL directo. NO recompute inline.

### 13.3 CVR / QBR cliente narrative

`ftr_pct` aparece en reportes ejecutivos al cliente como métrica de **calidad first-pass** — claim "X% de las piezas Globe se aprueban a la primera". Diferenciador comercial.
