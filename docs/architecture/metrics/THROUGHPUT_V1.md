# `Throughput` — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Throughput |
| Metric ID (registry) | `throughput` |
| Spec version | V1 |
| Status | Accepted (resuelve drift Engine doc weekly_rate/4) |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión drift resolution |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado per-período, no aplica writeback per-task) |
| Cross-refs | PIPELINE_VELOCITY_V1 (hermana — distinta semántica) · CYCLE_TIME_V1 · OTD_V1 · TASK-909 (creó este spec) · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Throughput** mide cuántas tareas se completaron en el período. Es la lectura canonical de **volumen absoluto de salida** del equipo.

- `Throughput = 20 activos / mes` → equipo completó 20 piezas en el mes
- `Throughput alto` → equipo produce mucho volumen (capacity aprovechada)
- `Throughput bajo` → equipo produce poco volumen (capacity subutilizada, pipeline pequeño, o saturación de bloqueos)

**A quién le importa**:

- **Cliente** (vía QBR/CVR): mide volumen real de piezas entregadas en el período — input al claim de "Globe expande mi capacity creativa"
- **Pitch comercial**: input al claim de "Throughput Expandido" como palanca de Revenue Enabled
- **Capacity planning**: input directo para sizing — si throughput baja sostenidamente, capacity insuficiente o bloqueos crecientes
- **Sales / Comercial**: lectura agregada de "cuánto producimos" — input para narrativa "x veces más rápido que tu equipo interno"

---

## 2. Fórmula canonical

### 2.1 Decisión canonical 2026-05-17: `monthly_count`, NO `weekly_rate / 4`

```text
Throughput(member, period) = COUNT(tareas completadas en el período)
                              dentro del scope (member / space / cliente)
                              excluyendo Bloqueado/Detenido/archivadas/canceladas
                              clasificadas como on_time o late_drop (cerradas reales)
```

**No es promedio semanal dividido**. Es conteo absoluto del período (mes calendar default).

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:310-336
COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL> OR <CANONICAL_LATE_DROP_SQL>) AS throughput
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

### 2.3 Versionado de fórmula

`THROUGHPUT_FORMULA_VERSION = 'throughput_v1.0'` (constant futura si emerge helper TS — V1 vive solo en SQL).

Bump cuando emerja modificación semántica observable (e.g. cambiar período base de monthly a quarterly, cambiar unidad de counting).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` (Notion `Fecha de completado`) | primitivo | timestamp de cierre |
| `task.report_bucket` / `performance_indicator_code` | `v_tasks_enriched.report_bucket` o `performance_indicator_code` | derivado | clasificación canonical de bucket per-task |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` | primitivo | filtro: excluir EXCLUDED_FROM_METRICS_STATUSES |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: `Fecha de completado`, `Estado 1`
- **Greenhouse** computa: clasificación `on_time` / `late_drop` per-task en VIEW BQ + agregado SQL en registry
- **Greenhouse devuelve a Notion**: N.A. — Throughput es agregado per-período, no per-task

### 3.2 Per-task semantic — qué tareas SÍ cuentan al throughput

**Solo tareas en buckets `on_time` o `late_drop`** (i.e. cerradas reales) cuentan. Razonamiento:

- **`on_time`** ✅ cuenta — cerrada a tiempo, entrega productiva
- **`late_drop`** ✅ cuenta — cerrada tarde pero al final entregada (output del equipo)
- **`overdue`** ❌ NO cuenta — aún abierta, no entregada
- **`carry_over`** ❌ NO cuenta — aún abierta, no entregada

Bloqueado/Detenido/archivadas/canceladas excluidas del scope general.

---

## 4. Helper canonical (per-task compute)

**N.A.** Throughput es métrica puramente agregada (count per-período). NO existe ni se justifica helper per-task.

Si emerge necesidad de exponer throughput desde TS (e.g. para projection comparison real-time, simulator de capacity), V2 puede crear helper `countCompletedTasksInPeriod(memberId, periodStart, periodEnd) → number`. V1 NO — agregado SQL del registry suficiente.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `throughput` count per-member-month | `src/lib/ico-engine/metric-registry.ts:310-336` | Implemented |

### 5.1 SQL canonical

Ver §2.2 arriba.

### 5.2 Denominador canonical

- **Solo tareas en `on_time` o `late_drop`** (cerradas reales). Excluye `overdue` y `carry_over` (aún abiertas).
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`

### 5.3 Granularidades soportadas

- `monthly` per member (default — capacity reviews mensuales)
- `monthly` per space (Pulse — productividad del cliente)
- `monthly` per cliente (CVR — volumen entregado al cliente)
- `weekly` (Pulse trends, capacity early-detection)

---

## 6. Semántica de casos edge

### 6.1 Decisión canonical: monthly_count, NO weekly_rate / 4

**Drift histórico resuelto 2026-05-17**: `Greenhouse_ICO_Engine_v1.md` líneas 998-1025 (sección Throughput legacy) decía:

> "Throughput = weekly_rate / 4"

**Eso era artefacto de análisis previo NO implementado**. El código (`metric-registry.ts:310-336`) implementa `monthly_count` directo desde día 1. Operador reporta y lee throughput mensual — alineado con cómo opera Greenhouse.

**Decisión canonical 2026-05-17**: `monthly_count` ES el throughput operativo Greenhouse. Fórmula `weekly_rate / 4` queda **deprecada** en Engine doc — referenciar este spec post-actualización.

### 6.2 Throughput vs Pipeline Velocity (distinción canonical IMPORTANTE)

Otra confusión histórica del Engine doc (líneas 1089-1116): decía Pipeline Velocity "identical to throughput". **NO lo es** (ver `PIPELINE_VELOCITY_V1.md`):

- **Throughput** = volumen absoluto (cuántas tareas se completaron)
- **Pipeline Velocity** = eficiencia relativa al backlog (qué porcentaje del pipeline se cierra)

Equipo con throughput alto + velocity baja = "produce mucho pero el backlog crece más rápido = pileup". Equipo con throughput bajo + velocity alta = "produce poco pero el pipeline está bien cerrado (pipeline pequeño + bien gestionado)".

### 6.3 Casos edge específicos

| Escenario | Cuenta al Throughput? |
|---|---|
| Tarea cerrada a tiempo (`on_time`) | **Sí** |
| Tarea cerrada tarde (`late_drop`) | **Sí** — al final fue entregada |
| Tarea abierta vencida (`overdue`) | No — no entregada todavía |
| Tarea abierta dentro de plazo (`carry_over`) | No — no entregada todavía |
| Tarea bloqueada o detenida | No — excluida del scope |
| Tarea archivada o cancelada | No — fuera de scope |
| Tarea Sky internal (Efeonce internal) | Sí | per regla operativa |
| Tarea con due_date NULL | Depende de bucket — si fue clasificada `on_time` (sin due, se considera entregada a tiempo) cuenta |

### 6.4 Tareas re-asignadas mid-período

Si tarea pasa de member A a member B mid-período y la cierra B, cuenta al throughput de B (current assignee). V1 NO trackea ownership histórico per-period. V2 podría exponer split-credit.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | Datos completos del período | Throughput + threshold zone |
| `low_confidence` | Período en curso (no cerrado) | Throughput running + indicador "(parcial)" |
| `unavailable` | Sin datos del período (member nuevo, sin actividad) | `0` o `—` según preferencia consumer |

Distinción: `0` significa "evaluable y zero tareas cerradas" (probable bug operativo). `—` significa "no hay datos para evaluar" (member sin actividad).

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 20 | ∞ | success (verde) |
| Attention | 10 | 20 | warning (amber) |
| Critical | 0 | 10 | error (rojo) |

**Higher is better** (es métrica positiva — más volumen es mejor, asumiendo no comprometer calidad).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≥ 20 piezas / member / mes para creative producer. Roles específicos pueden tener target distinto (e.g. content lead → 8-12; designer junior → 25-30). V1 usa threshold uniforme.

### 8.2 Calibración per rol (futuro)

Out of scope V1. V2 podría calibrar threshold per `role_title` del member (`role_title='Senior Designer'` → 25 target; `role_title='Content Lead'` → 12 target).

---

## 9. Writeback a Notion

**N.A.** Throughput es agregado per-período sin equivalente per-task Notion. NO aplica writeback.

Consumers (Pulse, CVR, scorecards) leen el agregado del registry SQL directamente.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created (resuelve drift Engine doc weekly_rate/4)

- Spec canonical creado en TASK-909 Slice 2.
- **Decisión disparadora**: Engine doc línea 998-1025 decía `weekly_rate / 4`. Código (`metric-registry.ts:310-323`) implementa `monthly_count` directo. Drift documental detectado en sesión 2026-05-17 deep-dive.
- **Resolución canonical**: `monthly_count` ES el throughput operativo Greenhouse (alineado con operador). Fórmula `weekly_rate / 4` queda deprecada en Engine doc — referenciar este spec post-actualización.
- **Distinción canonical de Pipeline Velocity**: NO es "identical to throughput" como decía Engine doc. Ver `PIPELINE_VELOCITY_V1.md`.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — **métrica hermana CRÍTICA** (NO es identical, semántica distinta)
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) — métrica complementaria (velocidad per-tarea vs volumen agregado)
  - [OTD_V1.md](OTD_V1.md) — métrica complementaria (compliance vs volumen)
  - [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) — métrica relacionada (cuántas tareas estancan vs cuántas se completan)
- **Tasks**: TASK-909 (creó este spec) · TASK-908 (afecta indirectamente vía cambio fórmula CT, no afecta Throughput count directo)
- **Código**:
  - Agregado: `src/lib/ico-engine/metric-registry.ts:310-336`
  - SQL constants canonical: `CANONICAL_ON_TIME_SQL`, `CANONICAL_LATE_DROP_SQL`
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 998-1025 (versión legacy con drift)
  - Contrato `Contrato_Metricas_ICO_v1.md` § 2.3 (palanca "Throughput Expandido" de Revenue Enabled)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Calibración per rol del member**: V1 threshold uniforme `≥20 activos/mes`. V2 calibrar per `role_title`.
- **Per-cliente threshold**: ¿cliente enterprise con SLA volumen específico? V1 NO — usar Contrato CVR matrix.
- **Tareas re-asignadas split-credit**: V1 cuenta al current assignee. V2 podría exponer split per-period si emerge necesidad analítica.
- **Throughput weighted by complexity**: V1 cuenta cada tarea = 1. V2 podría ponderar por `task_type` complexity (video=3 puntos, GIF=1 punto). Decisión cuando emerja consumer real.
- **Helper TS standalone**: V1 NO. V2 si emerge consumer real (e.g. capacity simulator).
- **Throughput rolling window**: V1 mensual cerrado. V2 rolling 30d para early-detection.
