# `PipelineVelocity` — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Pipeline Velocity (Velocidad del pipeline) |
| Metric ID (registry) | `pipeline_velocity` |
| Spec version | V1 |
| Status | Accepted (resuelve drift Engine doc "identical to throughput") |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión drift resolution (TASK-909) |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado per-período, no aplica writeback per-task) |
| Cross-refs | THROUGHPUT_V1 (hermana — NO es identical, semántica distinta) · STUCK_ASSETS_V1 · OCF_V1 · CYCLE_TIME_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Pipeline Velocity** mide qué porcentaje del pipeline activo se cierra por período. Es la lectura canonical de **eficiencia relativa al backlog** — distingue equipos que mantienen pipeline saludable de equipos donde el backlog crece más rápido que la salida (**pileup detector**).

- `Pipeline Velocity = 0.8 (80%)` → por cada 10 tareas activas, 8 se cierran en el período — pipeline fluyendo
- `Pipeline Velocity = 0.4 (40%)` → por cada 10 tareas activas, solo 4 se cierran — backlog acumulándose
- `Pipeline Velocity = 1.0+ (100%+)` → cierra más tareas de las activas (entrada nuevas siendo cerradas mismo período) — pipeline ultra-saludable

**A quién le importa**:

- **Management**: indicador agudo de salud del flow — caídas sostenidas implican pileup (capacity vs intake desbalanceado)
- **Capacity planning**: input directo para sizing — velocity baja sostenida = capacity insuficiente para intake actual
- **Equipo creativo**: input para retros — investigar dónde se atascó el flow (Bloqueado, Stuck Assets, dependencias upstream)
- **Cliente** (vía CVR): mide salud del pipeline — input al claim "Globe procesa tu volumen sin saturar"

---

## 2. Fórmula canonical

### 2.1 Decisión canonical 2026-05-17: ratio `completed / open`, NO "identical to throughput"

```text
PipelineVelocity(member, period) = COUNT(tareas completadas en el período)
                                    / COUNT(tareas activas en el período)
                                  = ratio entre 0.0 y (∞ teórico, usualmente <2.0)
```

**No es throughput**. Throughput es volumen absoluto (count). Pipeline Velocity es **ratio normalizado**.

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:338-367
ROUND(
  COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL> OR <CANONICAL_LATE_DROP_SQL>)::numeric
  / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_OPEN_TASK_SQL>), 0),
  2
) AS pipeline_velocity
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Numerador: tareas **cerradas** (on_time + late_drop) en el período.
Denominador: tareas **abiertas** (open task SQL canonical) en el período.

### 2.3 Versionado de fórmula

`PIPELINE_VELOCITY_FORMULA_VERSION = 'pipeline_velocity_v1.0'` (constant futura si emerge helper TS — V1 vive solo en SQL).

Bump cuando emerja modificación semántica observable (e.g. cambiar definición de "abiertas" para incluir bloqueadas si aporta valor, cambiar normalización).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro para numerador (cerradas) |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` | primitivo | filtro para denominador (abiertas) + exclusión |
| `task.report_bucket` / `performance_indicator_code` | `v_tasks_enriched` derivados | derivado | clasificación canonical bucket per-task |

### 3.1 Boundary canonical

Sin boundary específico — Pipeline Velocity es derivada de bucket classification. Hereda boundary general del ADR.

### 3.2 Definición canonical "tarea abierta"

`CANONICAL_OPEN_TASK_SQL = (completed_at IS NULL AND task_status NOT IN EXCLUDED_FROM_METRICS_STATUSES)`

Incluye: `Sin empezar`, `Pendiente`, `En curso`, `Tomado` (Sky), `Listo para revisión`, `En feedback`, `Cambios Solicitados`.

Excluye: terminales (`Completado`, `Aprobado`), bloqueadas (`Bloqueado`, `Detenido`), archivadas, canceladas.

---

## 4. Helper canonical (per-task compute)

**N.A.** Pipeline Velocity es métrica puramente agregada (ratio per-período). NO existe ni se justifica helper per-task.

Si emerge necesidad de exponer velocity desde TS (e.g. simulator capacity, projection comparison), V2 puede crear helper `computePipelineVelocity(completedCount, openCount) → number`. V1 NO.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `pipeline_velocity` ratio per-member-month | `src/lib/ico-engine/metric-registry.ts:338-367` | Implemented |

### 5.1 SQL canonical

Ver §2.2 arriba.

### 5.2 Denominador canonical

- **Numerador**: `on_time` ∪ `late_drop` (cerradas reales del período)
- **Denominador**: `open_task` SQL canonical (abiertas no excluidas)

Si denominador = 0 (member sin tareas activas), retorna NULL (no se puede dividir por cero). UI muestra `—`.

### 5.3 Granularidades soportadas

- `monthly` per member (default — health del proceso individual)
- `monthly` per space (Pulse — health del proceso del cliente)
- `monthly` per cliente (CVR — narrativa de pipeline health)
- `weekly` (Pulse trends, capacity early-detection)

---

## 6. Semántica de casos edge

### 6.1 Decisión canonical: NO es throughput

**Drift histórico resuelto 2026-05-17**: `Greenhouse_ICO_Engine_v1.md` líneas 1089-1116 (sección Pipeline Velocity legacy) decía:

> "identical to throughput"

**ES INCORRECTO**. Throughput es volumen absoluto (count); Pipeline Velocity es ratio normalizado contra backlog. Son métricas distintas que responden preguntas distintas:

| Aspecto | Throughput | Pipeline Velocity |
|---|---|---|
| Tipo | count absoluto | ratio (0 a ∞ teórico) |
| Pregunta | ¿Cuánto producimos? | ¿Cuán eficiente el flow? |
| Unidad | activos | ratio |
| Sensible a backlog size | No | Sí |
| Detecta pileup | No | **Sí** (caso de uso primario) |

**Escenarios canonical**:

| Escenario | Throughput | Pipeline Velocity | Interpretación |
|---|---|---|---|
| 20 cerradas + 25 activas | 20 | 0.8 | Pipeline saludable |
| 20 cerradas + 50 activas | 20 | 0.4 | **Pileup** — produce mismo volumen pero backlog 2x → capacity insuficiente |
| 10 cerradas + 5 activas | 10 | 2.0 | Pipeline ultra-saludable (cerró más de las activas — intake nuevo siendo procesado mismo período) |
| 5 cerradas + 100 activas | 5 | 0.05 | **Pileup crítico** — backlog masivo no fluyendo |
| 30 cerradas + 30 activas | 30 | 1.0 | Pipeline equilibrado |

**Decisión canonical 2026-05-17**: Pipeline Velocity es ratio (cómo el código lo computa). NO es throughput. Engine doc líneas 1089-1116 queda **deprecada** — referenciar este spec post-actualización.

### 6.2 Casos edge específicos

| Escenario | Pipeline Velocity |
|---|---|
| Member sin tareas activas (denominador=0) | NULL — UI muestra `—` |
| Member con tareas activas pero ninguna cerrada en el período | 0.0 — pipeline atascado |
| Member con ratio 0.5 sostenido 3 meses | Pileup confirmado — escalation a capacity review |
| Member con ratio 1.5 puntual | Cerró más que abierto — buen mes, no necesariamente pattern |
| Member con todas tareas Bloqueado (denominador 0 también) | NULL (Bloqueado excluido del denominador) |

### 6.3 Coexistencia con Stuck Assets y OCF

Pipeline Velocity es métrica de **flow agregado**. Stuck Assets y OCF son métricas de **causa raíz**:

- Velocity baja → ¿por qué? → revisar Stuck Assets (¿hay tareas individuales atascadas?) + OCF (¿overdue de períodos anteriores?)
- Velocity alta + Stuck Assets alto → contradictorio — investigar data quality

### 6.4 Pipeline Velocity vs Cycle Time SLO%

- Velocity = ¿cuántas se cierran del total activo?
- CT SLO% = ¿de las que se cierran, cuántas están dentro de tiempo benchmark industria?

Equipo puede tener Velocity alta + CT SLO% baja (cierra mucho pero todo lento). O Velocity baja + CT SLO% alta (cierra poco pero rápido cuando lo hace).

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | Denominador > 0 + numerador computable | Pipeline Velocity + threshold zone |
| `low_confidence` | n_active < `trust.healthyMinSampleSize` (10) | Velocity + warning visual |
| `unavailable` | Denominador = 0 (sin tareas activas) | `—` |

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 0.8 | ∞ | success (verde) |
| Attention | 0.4 | 0.8 | warning (amber) |
| Critical | 0.0 | 0.4 | error (rojo) |

**Higher is better** (es métrica positiva — más fluido el pipeline es mejor).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≥ 0.8 (cerrar 80%+ del backlog activo cada mes). Equipos maduros operan en 0.9-1.2. Velocity < 0.4 sostenida = pileup crítico que requiere intervención capacity.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Hipótesis: equipos especializados en piezas long-form (video, sites) pueden tener velocity natural más baja por duración legítima. V2 calibración per tipo si emerge demanda.

---

## 9. Writeback a Notion

**N.A.** Pipeline Velocity es agregado per-período sin equivalente per-task Notion. NO aplica writeback.

Consumers (Pulse, CVR, scorecards) leen el agregado del registry SQL directamente.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created (resuelve drift Engine doc "identical to throughput")

- Spec canonical creado en TASK-909 Slice 3.
- **Decisión disparadora**: Engine doc líneas 1089-1116 decía "Pipeline Velocity identical to throughput". Código (`metric-registry.ts:338-367`) implementa ratio `completed/(completed+open)` desde día 1. Drift documental detectado en sesión 2026-05-17.
- **Resolución canonical**: NO es identical to throughput. Es ratio normalizado vs backlog activo — pileup detector. Engine doc queda deprecada — referenciar este spec.
- **Distinción canonical THROUGHPUT_V1**: documentada como métrica hermana con tabla comparativa explícita (sección 6.1).

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [THROUGHPUT_V1.md](THROUGHPUT_V1.md) — **métrica hermana CRÍTICA** (NO es identical — distinta semántica)
  - [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) — causa raíz potencial de velocity baja
  - [OCF_V1.md](OCF_V1.md) — saturation acumulada (período-a-período)
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) · [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) — velocidad per-tarea vs flow agregado
- **Tasks**: TASK-909 (creó este spec)
- **Código**:
  - Agregado: `src/lib/ico-engine/metric-registry.ts:338-367`
  - SQL constants: `CANONICAL_OPEN_TASK_SQL`, `CANONICAL_ON_TIME_SQL`, `CANONICAL_LATE_DROP_SQL`
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 1089-1116 (versión legacy con drift "identical to throughput")
  - Contrato `Contrato_Metricas_ICO_v1.md` (narrativa CSC + pipeline health)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Calibración per tipo de pieza o per rol**: V1 threshold uniforme. V2 si emerge data.
- **Helper TS standalone**: V1 NO. V2 si emerge consumer real (simulator, capacity planner).
- **Pipeline Velocity rolling window vs absolute period**: V1 mensual cerrado. V2 rolling 30d.
- **Velocity weighted by complexity**: V1 cada tarea = 1. V2 podría ponderar (video=3, GIF=1) como mismo open question de Throughput.
- **Velocity per fase CSC**: V1 expone solo total. V2 desglose Briefing/Producción/Cambios/Entrega.
- **Velocity per cliente**: V1 expone per-member, per-space, per-cliente. ¿Se necesita per-team? Decisión cuando emerja consumer.

---

## 13. Downstream consumers — qué consume Pipeline Velocity

### 13.1 Payroll bonus calculation — **NO input bonus V1**

**No**. Pipeline Velocity NO entra al cálculo de bonus V1.

**Razón canonical**: Es **ratio flow del backlog** (health composite) — no métrica per-member output direct. Velocity baja puede deberse a causa externa al member (backlog upstream creció por intake del cliente, dependencias bloqueadas) — penalizar al individuo por health composite sería injusto. HR/Finance decisión: bonus opera sobre RpA + OTD% per-member. Pipeline Velocity es indicador de **escalation operacional** (capacity review), no de **bonus negativo automático**.

**ADR detallado**: [`../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`](../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md) §10.

### 13.2 Capacity planning + management dashboards

Pileup detector — velocity baja sostenida = capacity insuficiente para intake actual. Input a escalation a sales (rebalancear scope), capacity adjustment (hiring), o process review (qué fase atasca).

### 13.3 CVR cliente narrative (pipeline health)

Velocity aparece en QBR/CVR como métrica de salud del pipeline — claim "Globe procesa tu volumen sin saturar". Diferenciador comercial vs equipos in-house saturados.
