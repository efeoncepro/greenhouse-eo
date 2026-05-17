# `CycleTime` — Cycle Time — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Cycle Time (Tiempo de ciclo) |
| Metric ID (registry) | `cycle_time` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive ICO + arch reasoning |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (TASK-908 implementa helper canonical; writeback per-task no priorizado V1 — agregado SQL existe) |
| Cross-refs | TASK-908 (status transition foundation + calculateCycleTime helper) · TASK-901 (foundation transitions) · OTD_V1 · CT_SLO_PCT_V1 · CYCLE_TIME_VARIANCE_V1 · RPA_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Cycle Time (Tiempo de ciclo)** mide cuántos días calendar tomó una tarea desde que el equipo arrancó trabajo activamente hasta que se marcó como completada internamente. Es la **duración real de producción** experimentada por la pieza.

- `Cycle Time = 5 días` → tarea tomó 5 días entre arranque y completion
- `Cycle Time bajo` → equipo entrega rápido (eficiencia operativa absoluta)
- `Cycle Time alto` → tarea tomó mucho tiempo (puede ser por complejidad legítima, bloqueos, feedback lento, capacidad insuficiente)

**A quién le importa**:

- **Equipo creativo**: input directo para capacity planning, dimensionamiento de briefs futuros, detección de cuellos de botella
- **Cliente** (vía QBR/CVR): mide velocidad operativa real — input al claim de "Globe entrega más rápido"
- **Management**: indicador de salud del proceso — Cycle Time creciente = pipeline saturado o proceso degradado
- **Pitch comercial**: Cycle Time es input base para CT SLO% (% tareas dentro de benchmark industria ≤14.2d)

---

## 2. Fórmula canonical

### 2.1 Per-task — 4 decisiones canonical sesión 2026-05-17 (Contrato Delta sección C)

```text
CycleTime(task) = (end_timestamp - start_timestamp)
                - (tiempo total acumulado en Bloqueado/Detenido durante esa ventana)

donde:
  start_timestamp = primer timestamp donde task.status pasó a 'En curso' (Efeonce)
                                                    o 'Tomado' (Sky)
                    fallback: task.created_at (cuando NO hay transition row pre-TASK-908)
  end_timestamp   = task.completed_at (Notion property 'Fecha de completado')
  tiempo bloqueado = sum de (exit_blocked - enter_blocked) para transitions
                     donde to_status IN ('Bloqueado', 'Detenido')

resultado: días calendar (con decimales en BQ; pueden truncarse a integer en PG via toInteger())
```

### 2.2 4 Decisiones canonical canonizadas 2026-05-17

#### C.1 INICIO = status transition → `En curso` / `Tomado`

Cycle Time arranca cuando el equipo toma la pieza activamente (status pasa a `En curso` en Efeonce, o `Tomado` en Sky-side). **NO** desde `created_at`. Justificación operativa: tareas pueden vivir días/semanas en backlog antes de que alguien arranque trabajo real; contar ese tiempo infla CT con espera no-productiva y desincentiva grooming agresivo del backlog.

#### C.2 FIN = `completed_at` (Notion `Fecha de completado`)

Cycle Time termina cuando el equipo marca la pieza como completada internamente. **NO** cuando el cliente aprueba (`Aprobado` state). Justificación: la aprobación del cliente es un **milestone separado de validación** que mide otra cosa (responsividad del cliente, alignment del brief) — no la duración de producción.

#### C.3 Tiempo en `En feedback` (cliente revisando): SE INCLUYE

Cuando una pieza está `En feedback`, el cliente está revisando. Greenhouse no controla ese tiempo, pero se **incluye** en CT porque refleja el calendar real que vivió la pieza. Alineado con TTM y Early Launch Advantage — al cliente le importa el calendar completo, no la eficiencia interna.

#### C.4 Tiempo en `Bloqueado` / `Detenido`: SE EXCLUYE

Cuando una pieza pasa a `Bloqueado` o `Detenido`, ese tiempo NO debe contar para CT. Justificación: coherencia con regla canonical de exclusión (Contrato Delta sección A.4) — si excluimos tareas bloqueadas del COUNT de denominador OTD/RpA/FTR, no podemos a la vez contar su TIEMPO bloqueado en el promedio CT. Penalizaría al equipo por dependencias externas.

### 2.3 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:256-282
ROUND(AVG(cycle_time_days), 1) AS cycle_time_avg_days
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND <CANONICAL_COMPLETED_TASK_SQL>
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Donde `cycle_time_days` viene materializado en `v_tasks_enriched` desde BQ — post TASK-908 Slice 4 actualizado para reflejar fórmula canonical (status start + descuento Bloqueado).

### 2.4 Versionado de fórmula

- `CYCLE_TIME_FORMULA_VERSION = 'cycle_time_v1.0'` (constant futura en helper canonical de TASK-908 Slice 1).
- Pre-TASK-908: fórmula vive en SQL `src/lib/ico-engine/schema.ts:108-113` como `DATE_DIFF(completed_at, created_at)` (legacy — usa `created_at` como inicio, NO descuenta Bloqueado).
- Post-TASK-908: fórmula canonical en `calculateCycleTime()` TS helper + SQL actualizado en `schema.ts` para usar status transitions.

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.task_source_id` | `greenhouse_delivery.tasks.task_source_id` (Notion page ID) | primitivo | identidad canonical |
| Status transitions → `En curso` / `Tomado` | `greenhouse_delivery.task_status_transitions` (TASK-908) | primitivo (eventos) | INICIO canonical V1 |
| Status transitions → `Bloqueado` / `Detenido` (entry + exit) | `greenhouse_delivery.task_status_transitions` (TASK-908) | primitivo (eventos) | para computar tiempo a descontar |
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` (Notion `Fecha de completado`) | primitivo | FIN canonical |
| `task.created_at` (fallback) | `greenhouse_delivery.tasks.created_at` | primitivo | usado SOLO cuando NO hay status transition row (tareas pre-TASK-908) |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` | primitivo | para exclusión Bloqueado/archivada en agregado |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: status edits (cambio a `En curso`/`Tomado`/`Bloqueado`/`Detenido`/`Completado`), `Fecha de completado`
- **Greenhouse** observa: webhook `page.properties_updated` filtrado por `Estado 1` → persiste transition row → `calculateCycleTime` consume tabla
- **Greenhouse devuelve a Notion** (TASK-908 follow-up futuro, no V1): potencial property read-only `[GH] CycleTime días` per-task. V1 NO prioriza writeback per-task — agregado SQL existe en registry.

### 3.2 Forward-compat extensiones futuras

- **Múltiples ciclos de producción** (e.g. tarea pasa a Bloqueado, vuelve a En curso, vuelve a Bloqueado): V1 maneja descontando tiempo total acumulado en Bloqueado. Funciona correctamente con N ciclos.
- **Cycle Time per fase CSC** (e.g. cuánto pasó en Producción vs Revisión vs Cambios cliente): V2 puede exponer breakdown. V1 expone solo total.
- **Cycle Time percentil** (P50, P90, P95): V2 puede exponer percentiles per-member. V1 expone solo AVG.

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `calculateCycleTime(inputs)` | `src/lib/notion-metrics/calculate-cycle-time.ts` | Designed (TASK-908 Slice 1, pending ship) |

### 4.1 Signature canonical V1 (TASK-908 Slice 1)

```typescript
import 'server-only'

export const CYCLE_TIME_FORMULA_VERSION = 'cycle_time_v1.0'

export type TaskInputsForCycleTime = {
  enCursoStartedAt: Date | null   // de task_status_transitions WHERE to_status IN ('En curso', 'Tomado'), MIN(transitioned_at)
  completedAt: Date | null        // task.completed_at
  blockedIntervals: Array<{ entered: Date; exited: Date | null }>  // pairs de transitions Bloqueado entry/exit
  createdAt: Date                 // fallback cuando enCursoStartedAt es null (tareas pre-TASK-908)
}

export type CycleTimeResult = {
  cycleTimeDays: number | null
  sourceMode: 'canonical' | 'fallback_created_at' | 'unavailable'
  blockedDaysExcluded: number
  formulaVersion: typeof CYCLE_TIME_FORMULA_VERSION
}

export const calculateCycleTime = (inputs: TaskInputsForCycleTime): CycleTimeResult => {
  const { enCursoStartedAt, completedAt, blockedIntervals, createdAt } = inputs

  // 1. Sin completion → unavailable (CT requiere ventana cerrada)
  if (!completedAt) {
    return { cycleTimeDays: null, sourceMode: 'unavailable', blockedDaysExcluded: 0, formulaVersion: CYCLE_TIME_FORMULA_VERSION }
  }

  // 2. Resolver inicio canonical
  const start = enCursoStartedAt ?? createdAt
  const sourceMode = enCursoStartedAt ? 'canonical' : 'fallback_created_at'

  // 3. Raw days calendar
  const rawMs = completedAt.getTime() - start.getTime()
  const rawDays = rawMs / 86_400_000

  // 4. Descontar tiempo en Bloqueado/Detenido dentro de [start, end]
  let blockedMs = 0
  for (const { entered, exited } of blockedIntervals) {
    const effectiveEntered = entered.getTime() < start.getTime() ? start.getTime() : entered.getTime()
    const effectiveExited = (exited === null || exited.getTime() > completedAt.getTime())
      ? completedAt.getTime()
      : exited.getTime()
    if (effectiveExited > effectiveEntered) {
      blockedMs += effectiveExited - effectiveEntered
    }
  }
  const blockedDays = blockedMs / 86_400_000

  const cycleTimeDays = Math.max(0, rawDays - blockedDays)

  return { cycleTimeDays, sourceMode, blockedDaysExcluded: blockedDays, formulaVersion: CYCLE_TIME_FORMULA_VERSION }
}
```

### 4.2 Tests anti-regresión mínimos (TASK-908 Slice 1)

Mínimo 12 paths:

1. Happy canonical: enCursoStartedAt + completedAt + sin bloqueado → cycleTimeDays positivo, sourceMode='canonical'
2. Happy fallback: solo createdAt (no transition) + completedAt → cycleTimeDays positivo, sourceMode='fallback_created_at'
3. Edge: sin completedAt → null, sourceMode='unavailable'
4. Bloqueado overlap full: tarea inició en B en mitad y salió a En curso → solo cuenta tiempo activo
5. Bloqueado pre-start (entered antes que start) → clamp a start, no cuenta tiempo pre-ventana
6. Bloqueado post-end (exited después de completed) → clamp a completed, no cuenta tiempo post-ventana
7. Múltiples intervalos Bloqueado → suma todos, descontados correctamente
8. Bloqueado abierto al cierre (exited=null) → usa completedAt como exit
9. CT 0 días (mismo timestamp start y end) → 0
10. CT que daría negativo por excesivo bloqueado → clamp a 0 (defensive)
11. Idempotencia: 2 invocaciones consecutivas con mismos inputs → mismo result
12. Edge: enCursoStartedAt posterior a completedAt (data inconsistente) → clamp a 0 o handle como bug upstream

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `cycle_time` (avg days) per-member-month | `src/lib/ico-engine/metric-registry.ts:256-282` | Implemented (lee `cycle_time_days` materializado de `v_tasks_enriched`) |

### 5.1 SQL canonical (extracto)

```sql
ROUND(AVG(cycle_time_days), 1) AS cycle_time_avg_days
FROM v_tasks_enriched
WHERE <CANONICAL_COMPLETED_TASK_SQL>
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

### 5.2 Materialización `cycle_time_days` en `v_tasks_enriched`

Pre-TASK-908: SQL legacy `src/lib/ico-engine/schema.ts:108-113`:

```sql
DATE_DIFF(
  COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
  COALESCE(DATE(dt.created_at), DATE(dt.synced_at)),
  DAY
) AS cycle_time_days
```

Post-TASK-908 Slice 4: SQL actualizado para usar status transition start + descontar Bloqueado. Migration requiere full re-materialization de `metrics_by_*` downstream (impacto declarado en TASK-908).

### 5.3 Denominador canonical

- **Solo tareas completadas** (CT requiere ventana cerrada) — `CANONICAL_COMPLETED_TASK_SQL`
- **Excluye Bloqueado / Detenido / archivadas / canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`
- **Excluye CT NULL** (tareas sin completedAt o sin start válido)

### 5.4 Granularidades soportadas

- `monthly` per member (default — reviews mensuales, capacity planning)
- `monthly` per space (Pulse, scorecards)
- `monthly` per cliente (CVR client-facing)
- `weekly` (Pulse trends)

---

## 6. Semántica de casos edge

| Escenario | Cycle Time computado |
|---|---|
| Tarea completada normal | `(completedAt - enCursoStartedAt) - blockedDays`, sourceMode='canonical' |
| Tarea pre-TASK-908 (sin transition row) | `(completedAt - createdAt)`, sourceMode='fallback_created_at' |
| Tarea abierta (sin completedAt) | NULL, sourceMode='unavailable' |
| Tarea cerrada el mismo día que arrancó | CT = 0 días |
| Tarea con días en Bloqueado | CT = días totales − días bloqueado |
| Tarea con `created_at` posterior a `completed_at` (data corrupta) | Clamp a 0, posible bug upstream a investigar |
| Tarea Bloqueada toda la ventana → desbloqueada al final → cerrada | CT ≈ 0 (todo el calendar fue Bloqueado, exclusión correcta) |
| Tarea en estado terminal (`Cancelada`, `Archivada`) | NO entra al agregado (excluida del denominador) |

### 6.1 Distinción canonical CT vs OTD% vs CT SLO%

- **Cycle Time** = duración real de la pieza (días absolutos), métrica de velocidad operativa
- **OTD%** = % cumplió SU deadline individual (variable per brief)
- **CT SLO%** = % CT ≤ threshold industria (14.2d constante)

Las 3 son complementarias. Equipo con CT promedio 8 días puede tener OTD% bajo si los deadlines fueron de 5 días. Equipo con CT promedio 20 días puede tener CT SLO% bajo aunque cumpla deadlines holgados.

### 6.2 Workflow team rounds y feedback time

- **Tiempo en `En feedback`** SE INCLUYE en CT (decisión canonical C.3).
- **Tiempo en internal review interno** SE INCLUYE en CT (es trabajo activo del equipo).
- **Solo Bloqueado/Detenido se excluyen** (decisión canonical C.4).

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI | Decisión consumer |
|---|---|---|---|
| `valid` | sourceMode='canonical' + completedAt presente | CT en días + threshold zone | Usar para reportes, CT SLO% compute |
| `valid` | sourceMode='fallback_created_at' + completedAt presente | CT + indicador "(estimado pre-transitions)" | Usar con caveat — tarea antigua sin status history |
| `unavailable` | Sin completedAt | "—" / "En curso" | NO incluir en agregados |
| `low_confidence` (futuro V2) | Tarea con < N días observation, ventana muy chica | CT + warning visual | Usar con caveat |

---

## 8. Threshold canonical + benchmark

| Threshold | Min días | Max días | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 7 | success (verde) |
| Attention | 7 | 14 | warning (amber) |
| Critical | 14 | ∞ | error (rojo) |

**Lower is better** (es métrica negativa — menos tiempo es mejor).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≤ 7 días para piezas estándar (estáticos, GIFs). Videos largos pueden tener target ≤ 14 días. Sites/landings ≤ 21 días. V1 usa threshold uniforme.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Engine doc § A.5.5 cita variabilidad esperada per tipo. Calibración per tipo queda como TASK derivada cuando emerja data suficiente per categoría.

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion | `[GH] CycleTime días` (number, read-only) — NO priorizado V1 |
| Estado actual | `not_implemented` |
| Task de writeback | TASK-908 follow-up futuro (no priority — agregado SQL ya existe) |
| Rationale V1 NO writeback | CT es derivado de transitions ya capturadas; consumers downstream consumen agregado SQL del registry directo sin necesidad de Notion property |

Si emerge demanda operativa de ver CT live per-task en Notion (e.g. operador quiere ver "esta tarea va por 12 días"), TASK derivada activa writeback siguiendo pattern TASK-901.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created con 4 decisiones canonical (Contrato Delta sección C)

- **Decisión C.1**: INICIO = primer transition a `En curso` / `Tomado`, NO `created_at`. Justificación: tiempo en backlog NO es producción.
- **Decisión C.2**: FIN = `completedAt` (Notion `Fecha de completado`), NO aprobación cliente. Justificación: separar duración producción de validación cliente.
- **Decisión C.3**: Tiempo en `En feedback` SE INCLUYE. Justificación: calendar real que vivió la pieza importa al cliente.
- **Decisión C.4**: Tiempo en `Bloqueado` / `Detenido` SE EXCLUYE. Justificación: coherencia con regla A.4 de exclusión + no penalizar dependencias externas.
- Helper TS pendiente — TASK-908 Slice 1 implementa.

### Pre-V1 — Código legacy con decisiones implícitas distintas

- `src/lib/ico-engine/schema.ts:108-113` usa `DATE_DIFF(completed_at, created_at)` (createdTime → completed_at, calendar puro sin descuentos).
- Decisiones implícitas: inicio=created (no transition), fin=completed (ok), feedback time incluido (ok por puro DATE_DIFF), Bloqueado incluido (no descuenta).
- Decisiones C.1 + C.4 son **cambios canonical** vs legacy. C.2 + C.3 ya estaban alineadas implícitamente.
- TASK-908 Slice 4 + Slice 1 cierran el gap legacy → canonical.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [CYCLE_TIME_VARIANCE_V1.md](CYCLE_TIME_VARIANCE_V1.md) — varianza (previsibilidad), consume mismo cycle_time_days
  - [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) — % CT dentro de threshold industria, consume cycle_time_days
  - [OTD_V1.md](OTD_V1.md) — métrica complementaria (promise compliance vs duration)
  - [THROUGHPUT_V1.md](THROUGHPUT_V1.md) · [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — velocidad/flow
  - [RPA_V1.md](RPA_V1.md) · [FTR_V1.md](FTR_V1.md) — quality complementarias
- **Tasks**: TASK-908 (foundation + helper canonical + Slice 4 SQL update + CT SLO%) · TASK-901 (foundation transitions común)
- **Código**:
  - Helper canonical (futuro): `src/lib/notion-metrics/calculate-cycle-time.ts` (TASK-908 Slice 1, pending)
  - Agregado: `src/lib/ico-engine/metric-registry.ts:256-282`
  - SQL legacy: `src/lib/ico-engine/schema.ts:108-113` (será reemplazado en TASK-908 Slice 4)
- **Docs reference**:
  - Contrato Delta 2026-05-17 sección C (4 decisiones canonical detalladas)
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 887-921 (drift documental — versión legacy)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **`time_to_client_approval` métrica nueva** (mencionada en Contrato Delta C.2 como complementaria): días entre `Fecha de completado` y `Aprobado` cliente. Mide responsividad del cliente, NO del equipo. V1 NO. Si emerge consumer real, TASK derivada.
- **Cycle Time per fase CSC** (Briefing/Producción/Revisión/Cambios/Entrega breakdown): V1 expone solo total. V2 si emerge demanda.
- **Percentiles (P50, P90, P95)** per-member: V1 expone solo AVG. V2 si emerge demanda — operadores avanzados pueden querer mediana en lugar de promedio para evitar skew de outliers.
- **Writeback per-task Notion**: V1 NO prioriza. Agregado SQL suficiente para dashboards. Si emerge necesidad operativa, TASK derivada.
- **Calibración per tipo de pieza**: V1 threshold uniforme. V2 con diferenciación video/sitio/estático/GIF.
- **Backfill histórico de transitions**: TASK-908 Slice 9 cubre best-effort. Tareas sin history queda en `sourceMode='fallback_created_at'` permanentemente (no es bug — es honestidad operativa).
