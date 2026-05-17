# `OTD%` — On-Time Delivery — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | OTD% (On-Time Delivery percentage) |
| Metric ID (registry) | `otd_pct` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive ICO + arch reasoning |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (TASK-902 futura implementa writeback canonical) |
| Cross-refs | TASK-902 (writeback futuro) · TASK-908 (CT SLO% separación) · RPA_V1 · FTR_V1 · CT_SLO_PCT_V1 · CUMPLIMIENTO_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**OTD% (On-Time Delivery percentage)** mide qué porcentaje de tareas con compromiso de entrega en el período se entregó **dentro del deadline acordado**. Es la lectura canonical de **promise compliance** del equipo — ¿cumplimos lo que prometimos al cliente en cada brief?

Es métrica **negativa por exclusión**: si bajamos del 90% significa que más de 1 de cada 10 piezas se entregó tarde o no se entregó. No es métrica de velocidad absoluta (eso es Cycle Time + Throughput) — es métrica de **honor del compromiso**.

**A quién le importa**:

- **Cliente** (vía QBR/CVR): mide el cumplimiento contractual del compromiso operativo. Es la métrica que más rápidamente erosiona confianza si baja.
- **Equipo creativo**: input directo para retrospectivas — qué bloqueó la entrega, dónde estuvo el slip
- **Compensación variable**: OTD% per-member-month puede ser parte de bonificaciones según política HR
- **Management**: indicador agudo de salud operativa — caídas sostenidas implican capacidad insuficiente, dependencias rotas, o briefs sub-dimensionados
- **Pitch comercial**: `OTD% ≥ 90%` es benchmark canonical para agencias creative-tech LATAM

---

## 2. Fórmula canonical

### 2.1 Per-task (clasificación)

Cada tarea con `due_date IS NOT NULL` se clasifica en uno de 4 buckets canonical (`performance_indicator_code`) — ver §6.1 Bucket canonical:

| Bucket | ¿Cerrada? | ¿Pasada deadline? | Cuenta en denominador OTD? | Cuenta en numerador OTD? |
|---|---|---|---|---|
| `on_time` | ✅ Sí (terminal) | ❌ No | ✅ | ✅ |
| `late_drop` | ✅ Sí | ✅ Sí | ✅ | ❌ |
| `overdue` | ❌ No (abierta) | ✅ Sí | ✅ | ❌ |
| `carry_over` | ❌ No (abierta) | ❌ No (dentro de plazo) | ❌ | ❌ |

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:202-206
ROUND(
  100.0 * COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL>)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL>
                                     OR <CANONICAL_LATE_DROP_SQL>
                                     OR <CANONICAL_OVERDUE_SQL>), 0),
  1
) AS otd_pct
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Donde:

```sql
CANONICAL_ON_TIME_SQL = (report_bucket = 'on_time'
                      OR (performance_indicator_code = 'on_time'
                          AND <CANONICAL_COMPLETED_TASK_SQL>))

CANONICAL_LATE_DROP_SQL = (report_bucket = 'late_drop'
                        OR (performance_indicator_code = 'late_drop'
                            AND <CANONICAL_COMPLETED_TASK_SQL>))

CANONICAL_OVERDUE_SQL = (report_bucket = 'overdue'
                      OR (performance_indicator_code = 'overdue'
                          AND <CANONICAL_OPEN_TASK_SQL>))
```

### 2.3 Versionado de fórmula

`OTD_FORMULA_VERSION = 'otd_v1.0'` (constant futura en helper canonical si TASK-902 lo crea per-task; hoy lógica vive embedded en SQL del registry).

Bump a `otd_v2.0` cuando emerjan extensiones de semántica (e.g. grace period, partial credit por late_drop dentro de window de tolerancia).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.completed_at` | `greenhouse_delivery.tasks` (Notion property `Fecha de completado`) | primitivo | timestamp terminal de la tarea |
| `task.due_date` | `greenhouse_delivery.tasks.due_date` (Notion property `Fecha límite`) | primitivo | compromiso original |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` (Notion property `Estado 1`) | primitivo | estado actual para clasificación abierta/cerrada |
| `task.performance_indicator_code` | `v_tasks_enriched.performance_indicator_code` | derivado | bucket canonical computado por la VIEW BQ a partir de fecha completado vs due_date |
| `task.report_bucket` | `v_tasks_enriched.report_bucket` | derivado | alternativa de clasificación (legacy, coexiste con performance_indicator_code) |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: `due_date` (operador setea al crear brief), `completed_at` (operador marca al cerrar)
- **Greenhouse** computa: `performance_indicator_code` per-task en la VIEW BQ `v_tasks_enriched` aplicando reglas canonical (completed vs due_date)
- **Greenhouse devuelve a Notion** (TASK-902 futura): property read-only `[GH] OTD bucket` per-task (e.g. `On-Time` / `Late Drop` / `Overdue` / `Carry-Over`) + property `[GH] OTD% (member period)` agregado al member-month en el header de su workspace personal

### 3.2 Forward-compat extensiones futuras

- **Grace period configurable**: V2 podría aceptar grace `±N días` antes de clasificar `late_drop`. V1 NO — `due_date` es absoluto.
- **Partial credit**: V2 podría dar score parcial a `late_drop` si está dentro de window de tolerancia. V1 NO — binario pass/fail.
- **Re-negotiated deadline**: V2 podría tracar `due_date_renegotiated` separado de `due_date_original` y medir compliance vs renegociado. V1 NO — un solo `due_date` vigente.

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `classifyOtdBucket(task)` | (NO existe helper TS standalone hoy) | NOT yet — TASK-902 futura lo crea cuando emerja writeback |

V1 la lógica vive **solo en SQL** dentro de `v_tasks_enriched` BQ view + el registry agregado. Cuando TASK-902 implemente writeback per-task a Notion, emergerá helper `classifyOtdBucket(task) → 'on_time' | 'late_drop' | 'overdue' | 'carry_over' | 'not_applicable'` server-only consumido por reactive consumer.

### 4.1 Signature canonical (V2 futura — TASK-902)

```typescript
import 'server-only'

export const OTD_FORMULA_VERSION = 'otd_v1.0'

export type TaskInputsForOtd = {
  completedAt: Date | null
  dueDate: Date | null
  taskStatus: string | null
  asOfDate?: Date | null  // default: NOW() — para evaluación retrospectiva
}

export type OtdBucket = 'on_time' | 'late_drop' | 'overdue' | 'carry_over' | 'not_applicable'

export type OtdResult = {
  bucket: OtdBucket
  dataStatus: 'valid' | 'unavailable'
  countsInDenominator: boolean   // true si bucket IN (on_time, late_drop, overdue)
  countsInNumerator: boolean     // true si bucket === 'on_time'
  formulaVersion: typeof OTD_FORMULA_VERSION
}

export const classifyOtdBucket = (inputs: TaskInputsForOtd): OtdResult => {
  const { completedAt, dueDate, taskStatus, asOfDate = new Date() } = inputs

  // 1. Excluded states → not_applicable
  if (taskStatus && EXCLUDED_FROM_METRICS_STATUSES.includes(taskStatus)) {
    return { bucket: 'not_applicable', dataStatus: 'valid', countsInDenominator: false, countsInNumerator: false, formulaVersion: OTD_FORMULA_VERSION }
  }

  // 2. Without due_date → not_applicable (no commitment to measure against)
  if (!dueDate) {
    return { bucket: 'not_applicable', dataStatus: 'unavailable', countsInDenominator: false, countsInNumerator: false, formulaVersion: OTD_FORMULA_VERSION }
  }

  // 3. Completed
  if (completedAt) {
    if (completedAt <= dueDate) {
      return { bucket: 'on_time', dataStatus: 'valid', countsInDenominator: true, countsInNumerator: true, formulaVersion: OTD_FORMULA_VERSION }
    }
    return { bucket: 'late_drop', dataStatus: 'valid', countsInDenominator: true, countsInNumerator: false, formulaVersion: OTD_FORMULA_VERSION }
  }

  // 4. Open
  if (asOfDate > dueDate) {
    return { bucket: 'overdue', dataStatus: 'valid', countsInDenominator: true, countsInNumerator: false, formulaVersion: OTD_FORMULA_VERSION }
  }
  return { bucket: 'carry_over', dataStatus: 'valid', countsInDenominator: false, countsInNumerator: false, formulaVersion: OTD_FORMULA_VERSION }
}
```

### 4.2 Tests anti-regresión mínimos (TASK-902 futura)

Mínimo 10 paths cubriendo los 5 buckets × 2 estados (con/sin completion):

1. Happy `on_time`: completed dentro de deadline → bucket=on_time
2. Happy `late_drop`: completed después de deadline → bucket=late_drop
3. Happy `overdue`: abierta + asOfDate > dueDate → bucket=overdue
4. Happy `carry_over`: abierta + asOfDate ≤ dueDate → bucket=carry_over
5. Edge: `not_applicable` sin due_date → bucket=not_applicable, dataStatus=unavailable
6. Edge: excluded state (Bloqueado/Archivada) → bucket=not_applicable, dataStatus=valid
7. Boundary: completedAt === dueDate exacto → on_time (≤ inclusive)
8. Edge: completed pero status Cancelado → not_applicable (exclusion wins)
9. Edge: dueDate sin completedAt + asOfDate === dueDate → carry_over (no overdue todavía)
10. Idempotencia: 2 invocaciones consecutivas con mismos inputs → mismo result

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `otd_pct` per-member-month | `src/lib/ico-engine/metric-registry.ts:194-224` | Implemented |

### 5.1 SQL canonical (extracto del registry)

Ver §2.2 arriba. La fórmula vive embedded en `metric-registry.ts` con dos constantes auxiliares (`CANONICAL_ON_TIME_SQL` y los buckets late_drop/overdue) que distribuyen filter logic.

### 5.2 Denominador canonical

**Tareas elegibles para OTD** (denominador):

- `on_time` ∪ `late_drop` ∪ `overdue` — tres buckets que SÍ entraron a la "competencia" del período (cerradas a tiempo, cerradas tarde, o aún abiertas vencidas)
- Excluye `carry_over` (aún dentro de plazo — no es falla)
- Excluye `Bloqueado` / `Detenido` / archivadas / canceladas — `EXCLUDED_FROM_METRICS_STATUSES`
- Excluye tareas SIN `due_date` (no hay compromiso que medir)

### 5.3 Granularidades soportadas

- `monthly` per member (canonical default — usado para reviews mensuales)
- `monthly` per space (Pulse, scorecards)
- `monthly` per cliente (CVR client-facing)
- `weekly` (Pulse trends + early-detection de slip)

---

## 6. Semántica de casos edge

### 6.1 Bucket canonical (4 valores, definición operacional)

| Bucket | Definición operacional | Ejemplo |
|---|---|---|
| `on_time` | Cerrada dentro del deadline original | Brief con due 15-may, cerrada 14-may |
| `late_drop` | Cerrada después del deadline (slip terminal) | Brief con due 15-may, cerrada 18-may |
| `overdue` | Abierta y deadline ya pasó (slip vigente) | Brief con due 15-may, hoy 17-may, aún abierta |
| `carry_over` | Abierta pero dentro de plazo (continuación normal) | Brief con due 30-may, hoy 17-may, aún abierta |

### 6.2 Tareas excluidas del denominador

| Escenario | Excluida? | Justificación |
|---|---|---|
| Tarea en `Bloqueado` o `Detenido` | **Sí** | Dependencia externa, no atribuible al equipo (post fix B.1 TASK-908) |
| Tarea archivada o cancelada | **Sí** | Fuera de scope operativo |
| Tarea sin `due_date` (rare) | **Sí** | No hay compromiso que medir |
| Tarea en estado `Sin empezar` con due futura | No (queda como `carry_over`) | Aún dentro de plazo, NO falla |
| Tarea Internal Efeonce | No | Per regla operativa: Efeonce se trata como cliente más (interno) |

### 6.3 Tarea con due_date dentro del mes pero abierta al cierre del mes

Si due_date es 15-mayo y la tarea aún está abierta al 31-mayo (cierre mes):

- Si hoy (cuando se mide) > due_date → bucket `overdue` → cuenta en denominador como falla
- Si hoy < due_date → bucket `carry_over` → NO cuenta (aún tiene tiempo)

La clasificación es **dinámica per asOfDate**. Cuando se cierra el mes el 31-mayo, el snapshot fija los buckets per `asOfDate=2026-05-31`.

### 6.4 Tarea con due_date renegociado mid-period

V1 usa solo el `due_date` actual vigente — NO trackea historial de renegociación. Si el operador cambió due_date del 15-may al 22-may, la tarea se mide contra 22-may.

V2 (futuro, fuera de scope) podría tracar `due_date_original` separado y reportar dual: OTD% vs original (compromiso al cliente) + OTD% vs vigente (cumplimiento del plan renegociado).

### 6.5 OTD% vs CT SLO% (distinción canonical importante)

- **OTD% = promise compliance** — ¿cumplió SU deadline (variable per brief)?
- **CT SLO% = competitive benchmark** — ¿tomó ≤ threshold industria (constante 14.2d)?

Una pieza puede ser **on_time** (cumplió SU deadline de 30d) pero **fuera del SLO** (tomó >14.2d). Otra puede ser **late_drop** (no cumplió SU deadline) pero **dentro del SLO** (tomó <14.2d, deadline era irrealmente corto). Ambas canonical, NO redundantes. Ver `CT_SLO_PCT_V1.md` para spec hermana.

### 6.6 Internal review rounds y feedback time

NO afectan OTD%. OTD% mide solo cumplimiento del compromiso final (cerrada vs due_date). Internal review y feedback time son inputs operativos del Cycle Time, no del OTD.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI | Decisión consumer |
|---|---|---|---|
| `valid` | due_date presente + clasificación canonical exitosa | OTD% + threshold zone | Usar para reportes, dashboards, agregados |
| `unavailable` | Tarea sin due_date | OTD% del agregado excluye esta tarea | Honesto — no hay compromiso que medir |
| `not_applicable` (per-task) | Tarea en excluded state | Oculto en UI per-task; NO entra en agregado | Consumer entiende no aplica |

### 7.1 Agregado per-member-month sin tareas elegibles

Si un member no tiene tareas elegibles en el período (todas excluidas o sin due_date), el agregado `otd_pct` retorna **`NULL`** (no `0`). Consumer UI muestra `—` o `Sin datos`, NO `0%`. Distinción canonical: `0%` significa "todas las tareas fallaron"; `NULL` significa "no hay tareas evaluables".

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 90% | 100% | success (verde) |
| Attention | 70% | 90% | warning (amber) |
| Critical | 0% | 70% | error (rojo) |

**Higher is better** (es métrica positiva — más on-time es mejor).

### 8.1 Benchmark externo (industria)

Engine doc `Greenhouse_ICO_Engine_v1.md` línea 2535-2649 cita: **`OTD% ≥ 90%`** (idealmente `≥98%`) como benchmark canonical para agencias creative-tech LATAM. Greenhouse target operativo histórico: 92%.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Threshold uniforme `≥90%`. Hipótesis: videos largos podrían tener target más bajo (85%) por complejidad, GIFs/estáticos más alto (95%). Calibración per tipo queda como TASK derivada cuando emerja data.

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion per-task | `[GH] OTD bucket` (select `On-Time` / `Late Drop` / `Overdue` / `Carry-Over` / `N/A`, read-only para operadores) |
| Target property Notion per-member-month | `[GH] OTD% mes` (number percentage, escrito al header del workspace personal del member) |
| Estado actual | `not_implemented` |
| Task de writeback | **TASK-902** (futura, post TASK-901 RpA writeback verde 30+ días) |
| Frecuencia | Per-edit (webhook reactive: cambio de status, completed_at, due_date) + nightly safety net |
| Latencia esperada | 5-30s post-edit (mismo pattern TASK-901) |
| Feature flag | `NOTION_OTD_WRITEBACK_ENABLED` (default `false`) |
| Reliability signal de paridad | `notion.metrics.shadow_paridad_otd` (TASK-902 shadow mode futuro) |

### 9.1 Pre-condiciones de activación canonical

Pre-flip de `NOTION_OTD_WRITEBACK_ENABLED=true`:

1. TASK-901 SHIPPED + writeback RpA en `enabled` 30+ días verde
2. TASK-902 shadow mode 7 días verde
3. `notion.metrics.shadow_paridad_otd` signal steady=0
4. Allowlist en `Handoff.md` con propiedades `[GH] OTD bucket` y `[GH] OTD% mes` confirmadas en Sky + Efeonce DBs
5. Approval HR (si OTD% entra en compensación variable)

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado post sesión deep-dive 2026-05-17 + ADR boundary + ADR metric spec pattern.
- **Confirmación canonical de los 4 buckets** (Contrato Delta sección A.2): `on_time`, `late_drop`, `overdue`, `carry_over` con tabla de pertenencia al denominador/numerador.
- **Distinción canonical OTD% vs CT SLO%** (Contrato Delta sección D): OTD% = promise compliance (per-task deadline); CT SLO% = competitive benchmark (constante 14.2d). NO mezclar. Ver `CT_SLO_PCT_V1.md`.
- **Regla canonical de exclusión** (Contrato Delta sección A.4): `Bloqueado`/`Detenido`/archivadas/canceladas EXCLUIDAS del denominador.
- Helper TS standalone NO existe hoy — lógica embedded en SQL del registry. TASK-902 futura emerge cuando writeback per-task se justifique.

### Pre-V1 — Engine doc línea 958-992 drift

- Engine doc decía `OTD% = cycle_time_days ≤ 14.2`. Eso es CT SLO% (competitive benchmark), NO OTD% (promise compliance).
- Resolución canonical 2026-05-17: las 2 métricas se separan formalmente (este spec OTD% + spec hermano `CT_SLO_PCT_V1.md`). Engine doc líneas 958-992 quedan deprecadas — referenciar specs canonicales.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) — métrica complementaria (competitive benchmark vs promise compliance)
  - [CUMPLIMIENTO_V1.md](CUMPLIMIENTO_V1.md) — alias narrativo agregado OTD family + per-task audit signal
  - [RPA_V1.md](RPA_V1.md) — métrica hermana (rondas vs entrega)
  - [FTR_V1.md](FTR_V1.md) — métrica hermana (first-time vs entrega)
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) — duration de la tarea, base de CT SLO%
- **Tasks**: TASK-902 (writeback futuro) · TASK-908 (CT SLO% separación) · TASK-901 (pattern fuente del writeback)
- **Código**:
  - Helper canonical (futuro): `src/lib/notion-metrics/classify-otd-bucket.ts` (TASK-902 Slice 1, pending)
  - Agregado: `src/lib/ico-engine/metric-registry.ts:194-224`
  - SQL canonical constants: `metric-registry.ts:138-151` (CANONICAL_ON_TIME_SQL, CANONICAL_LATE_DROP_SQL, CANONICAL_OVERDUE_SQL)
  - VIEW BQ: `v_tasks_enriched.performance_indicator_code` (computed)
- **Docs reference**: Contrato `Contrato_Metricas_ICO_v1.md` (narrativa de negocio) · Engine doc `Greenhouse_ICO_Engine_v1.md` (framework conceptual) · Notion property `Indicador de Performance` (formula codeUrl `b00_Og` Sky)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Grace period configurable**: V2 podría aceptar grace `±N días` antes de clasificar `late_drop`. V1 NO.
- **Partial credit**: V2 podría dar score parcial a `late_drop` dentro de tolerancia. V1 NO — binario.
- **Re-negotiated deadline tracking**: V2 podría medir compliance vs `due_date_original` separado de `due_date_vigente`. V1 mide solo vigente.
- **Calibración per tipo de pieza**: V2 con thresholds diferenciados (video, sitio, estático, GIF). V1 uniforme.
- **`performance_indicator_code` enum extensión**: agregar `'carry_over'` como 4° valor explícito al enum TS en código (hoy solo `on_time`/`late_drop`/`overdue` se manejan en enum). Sin esto, `carry_over` llega como string suelto. Resolverlo en TASK-908 o tasks asociadas.
- **Per-cliente threshold**: ¿Cliente enterprise pide SLA OTD específico distinto al benchmark? V1 NO. V2 si emerge demanda comercial.
- **OTD% rolling window vs absolute period**: V1 usa periodo mensual cerrado. V2 podría exponer OTD% rolling 30d para early-detection trends.
- **Granularidad team vs member**: V1 expone per-member-month. ¿OTD% per-team-month como agregado nuevo? Decisión cuando emerja consumer real (e.g. team scorecards).
