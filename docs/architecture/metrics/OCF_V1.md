# `OCF` — Overdue Carried Forward — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | OCF (Overdue Carried Forward) |
| Metric ID (registry) | `overdue_carried_forward` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado per-período, no aplica writeback per-task) |
| Cross-refs | OTD_V1 (relacionada: overdue del período actual vs OCF de períodos anteriores) · STUCK_ASSETS_V1 · PIPELINE_VELOCITY_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**OCF (Overdue Carried Forward)** mide cuántas tareas con **deadline vencido en períodos anteriores** siguen abiertas al cierre del período actual. Es el **saturation indicator de deuda acumulada** — distingue equipos que cierran su backlog de equipos que arrastran deudas crecientes mes-a-mes.

- `OCF = 0` → equipo cerró todas las overdue de períodos anteriores
- `OCF = N` → N tareas con deadline vencido (de meses anteriores) aún abiertas hoy
- `OCF creciente sostenido` → backlog tóxico — equipo NO está procesando las que arrastra

**A quién le importa**:

- **Management**: indicador agudo de salud sustainable del flow — caídas sostenidas en OCF (cerrar lo arrastrado) = recovery. Crecimientos = deuda creciente.
- **Capacity planning**: input directo para capacity adjustment — OCF creciente = capacity insuficiente para clear pasado + intake nuevo
- **Equipo creativo**: lista per-task accionable de lo más viejo pendiente — priorización canonical "primero lo más arrastrado"
- **Cliente** (vía CVR): mide cumplimiento de **promesa histórica** — distinta a OTD% que mide promesa del período actual

---

## 2. Fórmula canonical

### 2.1 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:456-482
COUNT(*) AS overdue_carried_forward
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND completed_at IS NULL                                       -- aún abiertas
  AND due_date < DATE_TRUNC('month', $period_first_day)::date    -- deadline vencido de período anterior
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Resultado: count entero de tareas abiertas con `due_date < period_start`. La diferencia clave vs `overdue` actual (que está en OTD% denominador) es:

- **Overdue actual** (OTD%): tareas con `due_date < hoy` del **período actual**
- **OCF**: tareas con `due_date < period_start` (arrastre de períodos anteriores)

### 2.2 Versionado de fórmula

`OCF_FORMULA_VERSION = 'ocf_v1.0'` (constant futura si emerge helper TS). Bump si emerge modificación de la definición canonical de "período anterior" (e.g. quarter vs month como unit).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro: solo NULL (abiertas) entran |
| `task.due_date` | `greenhouse_delivery.tasks.due_date` (Notion `Fecha límite`) | primitivo | compromiso original — filtro vs period_start |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` | primitivo | filtro: excluir EXCLUDED_FROM_METRICS_STATUSES |
| `period_first_day` | parámetro del query | derivado | first day of evaluation period (e.g. 2026-05-01 para mayo 2026) |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: `due_date`, `completed_at`, `Estado 1`
- **Greenhouse** computa: filtro temporal vs `period_first_day` + count agregado en registry
- **Greenhouse devuelve a Notion**: N.A. (V1) — OCF es agregado per-período sin writeback per-task

### 3.2 Distinción canonical "overdue" vs "carried forward"

**Decisión arquitectónica importante**: OCF NO es lo mismo que overdue del bucket OTD%.

- **`overdue` bucket** (OTD% denominator): tareas vencidas del período en curso evaluado — input al cumplimiento de promesa de ESTE mes.
- **OCF**: tareas vencidas **arrastradas de períodos anteriores** — input al cumplimiento de promesa histórica.

Una tarea con `due_date = 2026-04-15` aún abierta al 2026-05-15:

- En período abril 2026 contó como `overdue` (en denominador OTD% abril)
- En período mayo 2026 cuenta como **OCF** (deuda arrastrada)

---

## 4. Helper canonical (per-task compute)

**N.A. V1.** OCF es métrica puramente agregada. Si emerge necesidad de exponer flag per-task (e.g. "esta tarea es OCF del mes Y"), V2 puede crear helper:

```typescript
export const isTaskOcfForPeriod = (
  dueDate: Date | null,
  completedAt: Date | null,
  periodFirstDay: Date
): boolean => {
  if (!dueDate || completedAt !== null) return false
  return dueDate < periodFirstDay
}
```

V1 NO. Consumer SQL del agregado suficiente.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `overdue_carried_forward` count per-member-month | `src/lib/ico-engine/metric-registry.ts:456-482` | Implemented |

### 5.1 SQL canonical

Ver §2.1 arriba.

### 5.2 Denominador canonical

- **Solo tareas abiertas** (completed_at IS NULL)
- **Solo con due_date vencido vs period_start** (deadlines del período anterior o antes)
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`

### 5.3 Granularidades soportadas

- `monthly` only (canonical default — V1)
- weekly NO en V1 — semánticamente OCF se mide en períodos cerrados (semanas-a-semanas no aporta valor operativo claro)

---

## 6. Semántica de casos edge

| Escenario | OCF count |
|---|---|
| Member sin tareas vencidas anteriores | `0` — recovery o backlog limpio |
| Member con 3 tareas overdue de abril + abril cerrado, mayo en curso | OCF mayo = 3 — deuda arrastrada |
| Member cierra esas 3 tareas en mayo | OCF junio = 0 (asumiendo no nuevas overdue acumuladas) |
| Member acumula OCF creciente Apr=2 → May=5 → Jun=8 | Pileup crítico — escalation capacity |
| Tarea sin `due_date` | NO entra OCF (sin compromiso que arrastrar) |
| Tarea Bloqueada con due vencido | NO entra (excluida del scope general) |
| Tarea archivada / cancelada | NO entra (fuera de scope) |

### 6.1 OCF vs OTD%

- **OTD%** = % cumplimiento del período actual (promesas hechas para este mes)
- **OCF** = count de promesas históricas que aún no se cumplieron

Equipo puede tener OTD% 90% (cumple promesas nuevas) pero OCF creciente (no procesa lo viejo). Este escenario es **especialmente peligroso** — equipo prioriza "lo nuevo" y deja deuda histórica creciente.

### 6.2 OCF vs Stuck Assets

- **Stuck Assets** = tareas activas sin **movimiento** ≥72h
- **OCF** = tareas activas con **deadline vencido** de períodos anteriores

Cruce: tarea OCF + stuck = peor caso (overdue + no se mueve). Tarea OCF + activa = "está overdue pero al menos se mueve". V2 podría exponer cross-tabulation.

### 6.3 Threshold canonical: count absoluto, no %

OCF se reporta como **count absoluto** (no %). Razón: la magnitud absoluta importa (5 tareas overdue arrastradas es problema operativo independiente del backlog size). V2 podría agregar `ocf_pct` normalizado si emerge demanda comparativa cross-member.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n_active ≥ 10 | Count + threshold zone |
| `low_confidence` | 2 ≤ n_active < 10 | Count + warning visual |
| `unavailable` | Sin tareas activas | `0` o `—` según preferencia |

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 2 | success (verde) |
| Attention | 2 | 5 | warning (amber) |
| Critical | 5 | ∞ | error (rojo) |

**Lower is better** (es métrica negativa — menos OCF = menos deuda).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≤ 2 OCF por member al cierre de cada mes. ≥5 OCF = backlog tóxico, escalation.

### 8.2 Calibración per rol / tipo de pieza (futuro)

Out of scope V1. Hipótesis: equipos especializados en piezas long-form pueden tolerar OCF mayor legítimamente. V2 si emerge data.

---

## 9. Writeback a Notion

**N.A.** Agregado per-período sin equivalente per-task Notion. NO aplica writeback.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado documentando el agregado existente.
- **Decisión canonical**: OCF vive como métrica DEDICADA (no se reduce a "es overdue acumulado"). Razón: semántica distinta — OTD% mide compliance del período actual, OCF mide deuda arrastrada de períodos anteriores. Métricas hermanas pero **NO redundantes**.
- **Granularidad solo monthly V1** — weekly no aporta valor operativo claro.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [OTD_V1.md](OTD_V1.md) — métrica complementaria (período actual vs arrastre histórico)
  - [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) · [STUCK_ASSET_PCT_V1.md](STUCK_ASSET_PCT_V1.md) — saturation actual vs arrastre histórico
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — flow vs deuda
- **Tasks**: ninguna activa V1
- **Código**:
  - Agregado: `src/lib/ico-engine/metric-registry.ts:456-482`
  - Source: `v_tasks_enriched.due_date` + `completed_at`
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` (sección OCF)
  - Contrato `Contrato_Metricas_ICO_v1.md` (palanca operacional sustained)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **OCF normalizado en %** (`ocf_pct = ocf / total_open`): V1 NO. V2 si emerge demanda cross-member comparativo.
- **OCF per aging bucket** (1-30 días overdue, 31-60d, 60-90d, 90+d): V1 cuenta plano. V2 desglose aging si emerge demanda priorización.
- **Helper TS standalone**: V1 NO. V2 si emerge consumer real per-task drawer.
- **Writeback per-task** (`[GH] OCF flag`): V1 NO. TASK derivada si emerge.
- **Cross-tabulation OCF × Stuck Assets**: V1 expone separadamente. V2 si emerge consumer real (matrix view).
- **Calibración per rol**: V1 uniforme. V2 si emerge data.
- **OCF rolling vs cierre estricto period**: V1 mes calendar cerrado. V2 rolling 30d para early-detection.
