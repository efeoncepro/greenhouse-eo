# `StuckAssets` — Activos Estancados — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Stuck Assets (Activos estancados) |
| Metric ID (registry) | `stuck_assets` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `not_implemented` (V1 agregado SQL solo; per-task flag `is_stuck=TRUE` ya existe materializado en `v_tasks_enriched`) |
| Cross-refs | STUCK_ASSET_PCT_V1 (hermana — % normalizada) · CSC_DISTRIBUTION_V1 · OCF_V1 · PIPELINE_VELOCITY_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Stuck Assets** mide cuántas tareas activas no han tenido movimiento en ≥**72 horas** (3 días) — `STUCK_THRESHOLD_HOURS = 72` canonical (`metric-registry.ts:162`). Es la lectura canonical de **tareas atascadas** que requieren intervención operativa.

- `Stuck Assets = 0` → todas las tareas activas tienen movimiento reciente (flow saludable)
- `Stuck Assets = N` → N tareas activas sin actualización ≥72h — requieren investigación per-task

**A quién le importa**:

- **Equipo creativo**: lista per-task accionable — qué tareas necesitan unblock hoy
- **Management / Operations**: indicador agudo de health del flow — N creciente sostenido = procesos rotos o capacity insuficiente
- **Cliente** (vía CVR): mide cuán bien Globe mantiene el pipeline activo — input al claim "Globe no deja piezas paradas"
- **Sales / Comercial**: input al claim "Globe procesa sin atascos"

---

## 2. Fórmula canonical

### 2.1 Per-task (flag `is_stuck`)

Cada tarea activa se evalúa contra el threshold canonical:

```text
is_stuck(task) = task is open
              AND task.last_edited_time < NOW() - INTERVAL '72 hours'
              AND task NOT excluded (Bloqueado / Detenido / archivada / cancelada)
```

El flag `is_stuck` se materializa en `v_tasks_enriched` (BQ view) per-task — consumer SQL no recomputa, lee el flag directo.

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:398-424
COUNT(*) FILTER (WHERE is_stuck = TRUE) AS stuck_assets
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Resultado: count entero de tareas stuck per member en el período.

### 2.3 Versionado de fórmula

`STUCK_ASSETS_FORMULA_VERSION = 'stuck_assets_v1.0'` (constant futura si emerge helper TS). Bump cuando emerja modificación del threshold canonical (`STUCK_THRESHOLD_HOURS`) o de la definición de "movimiento" (e.g. status change vs property edit cualquiera).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.last_edited_time` | `greenhouse_delivery.tasks.source_updated_at` (canonical PG post-2026-05-16 hotfix) | primitivo | timestamp última edición del operador en Notion |
| `task.task_status` | `greenhouse_delivery.tasks.task_status` | primitivo | filtro: solo abiertas + excluir EXCLUDED |
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro: solo NULL (abiertas) entran |
| `STUCK_THRESHOLD_HOURS` (constante) | `metric-registry.ts:162` | configuración | default 72 horas |
| `is_stuck` per-task | `v_tasks_enriched.is_stuck` | derivado | materializado en VIEW BQ |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: `last_edited_time` (auto-actualizada por Notion en cada edit de cualquier property)
- **Greenhouse** computa: flag `is_stuck` per-task en VIEW BQ + agregado SQL en registry
- **Greenhouse devuelve a Notion**: N.A. (V1) — Stuck Assets es agregado per-período. Per-task flag podría writebackearse a `[GH] Stuck` property en V2 si emerge demanda

### 3.2 Definición canonical de "movimiento"

V1 = `last_edited_time` (cualquier edit en Notion). Incluye:

- Cambio de status
- Cambio de assignee
- Cambio de due_date
- Adición de comentario
- Cualquier property edit

V1 NO distingue entre tipos de edit. V2 podría discriminar (e.g. status change = movimiento real, comentario = movimiento débil). Pero V1 conservador — cualquier edit = movimiento.

---

## 4. Helper canonical (per-task compute)

**N.A. V1.** El flag `is_stuck` se materializa en VIEW BQ. Consumers SQL leen flag directo.

Si emerge necesidad de exponer flag desde TS (e.g. per-task drawer con countdown "stuck en X horas"), V2 puede crear helper:

```typescript
export const isTaskStuck = (lastEditedAt: Date | null, asOfDate: Date = new Date()): boolean => {
  if (!lastEditedAt) return false  // sin data → no es stuck (data quality issue, no operativo)
  const hoursSinceEdit = (asOfDate.getTime() - lastEditedAt.getTime()) / 3_600_000
  return hoursSinceEdit >= 72
}
```

V1 NO necesita el helper TS — VIEW BQ materializa.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `stuck_assets` count per-member-month | `src/lib/ico-engine/metric-registry.ts:398-424` | Implemented |

### 5.1 SQL canonical

Ver §2.2 arriba.

### 5.2 Denominador canonical

- **Solo tareas abiertas** — `CANONICAL_OPEN_TASK_SQL`
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`
- **Solo tareas con `is_stuck=TRUE`** entran al count

### 5.3 Granularidades soportadas

- `monthly` per member (default — reviews mensuales)
- `monthly` per space (Pulse — health del proceso del cliente)
- `monthly` per cliente (CVR)
- `weekly` (Pulse trends, early-detection de pileup)

---

## 6. Semántica de casos edge

| Escenario | Stuck Assets count |
|---|---|
| Member sin tareas activas | `0` o NULL — UI muestra `0` o `—` |
| Member con todas las tareas activas movidas hoy | `0` — pipeline saludable |
| Member con 3 tareas stuck + 7 activas con movimiento | `3` — N tareas requieren intervención |
| Tarea Bloqueada con last_edited 5 días atrás | NO cuenta (excluida del scope) |
| Tarea archivada con last_edited NULL | NO cuenta (excluida del scope) |
| Tarea sin `last_edited_time` (data quality) | Depende de VIEW BQ — V1 conservador `is_stuck=FALSE` si timestamp ausente |
| Tarea recién creada (last_edited < 72h) | NO cuenta (no es stuck todavía) |

### 6.1 Distinción canonical vs OCF

- **Stuck Assets** = tareas activas sin **movimiento** ≥72h (proceso atascado)
- **OCF (Overdue Carried Forward)** = tareas activas con **deadline vencido** de períodos anteriores (saturation acumulada)

Una tarea puede ser stuck pero NO overdue (deadline aún futuro). O overdue pero NO stuck (movida ayer pero deadline vencido hace 1 mes). Métricas complementarias.

### 6.2 Distinción canonical vs CSC Distribution

- **Stuck Assets** = subset de tareas activas que no se mueven
- **CSC Distribution** = composición de tareas activas por fase

Stuck Assets puede mostrarte qué fase tiene más stuck (cruce con CSC Distribution per-fase). V1 expone counts por separado. V2 podría exponer breakdown stuck per-fase.

### 6.3 Threshold canonical 72h

Decisión histórica: 72h (3 días) balance entre:

- Threshold muy bajo (e.g. 24h) → false positives (operador no movió en un fin de semana = stuck)
- Threshold muy alto (e.g. 168h / 1 semana) → false negatives (tarea atascada toda la semana → invisible)

V1 = 72h uniforme. V2 podría calibrar per tipo de pieza (videos largos → 120h; GIFs → 48h).

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n_active ≥ 10 + flag materializado correctamente | Count + threshold zone + lista per-task drilldown |
| `low_confidence` | 2 ≤ n_active < 10 | Count + warning visual |
| `unavailable` | n_active = 0 | `0` o `—` según preferencia consumer |
| `degraded` | N tareas con `last_edited_time` NULL (data quality) | Count + flag "data quality issue: N tareas sin timestamp" |

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 2 | success (verde) |
| Attention | 2 | 5 | warning (amber) |
| Critical | 5 | ∞ | error (rojo) |

**Lower is better** (es métrica negativa — menos stuck es mejor).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≤ 2 tareas stuck per member en cualquier momento. ≥5 stuck = pileup operacional que requiere escalation a capacity planning o resolución de dependencias upstream.

### 8.2 Calibración per rol o tipo de pieza (futuro)

Out of scope V1. V2 podría calibrar threshold per `role_title` (e.g. content lead ≤5 stuck = OK; designer junior >2 stuck = problema).

---

## 9. Writeback a Notion

| Aspecto | Valor |
|---|---|
| Target property Notion per-task | `[GH] Stuck` (boolean / select indicating stuck status, read-only) — NO priorizado V1 |
| Estado actual | `not_implemented` |
| Task de writeback | TASK derivada futura si emerge demanda operativa real |
| Rationale V1 NO writeback | Operador ve stuck assets en dashboards Greenhouse (Pulse, Person 360). NO se justifica writeback per-task a Notion en V1 — agregado SQL suficiente. Si emerge necesidad operativa (e.g. operador quiere ver `[GH] Stuck` en filter view de Notion), TASK derivada activa writeback. |

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado documentando el agregado existente + flag `is_stuck` materializado.
- **Threshold canonical 72h** confirmado del registry (`STUCK_THRESHOLD_HOURS = 72`).
- **Source canonical de `last_edited_time`**: post-2026-05-16 hotfix Sentry JAVASCRIPT-NEXTJS-63, source PG canonical es `greenhouse_delivery.tasks.source_updated_at` (NO `last_edited_time` columna — no existe en PG real, solo en Notion/BQ raw).
- **NO crear helper TS V1** — flag `is_stuck` ya materializado en VIEW BQ suficiente.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [STUCK_ASSET_PCT_V1.md](STUCK_ASSET_PCT_V1.md) — métrica normalizada en % (Stuck Assets / Open Tasks)
  - [OCF_V1.md](OCF_V1.md) — métrica complementaria (saturation acumulada vs stuck reciente)
  - [CSC_DISTRIBUTION_V1.md](CSC_DISTRIBUTION_V1.md) — composition + cuáles fases tienen más stuck (cruce)
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — flow vs stuck count
- **Tasks**: ninguna activa que toque V1; TASK derivada futura para writeback si emerge demanda
- **Código**:
  - Constant: `metric-registry.ts:162` (`STUCK_THRESHOLD_HOURS = 72`)
  - Agregado: `metric-registry.ts:398-424`
  - Flag canonical: `v_tasks_enriched.is_stuck` (materializado)
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` (sección Stuck Assets — narrative)
  - Contrato `Contrato_Metricas_ICO_v1.md` (palanca operacional)
  - Hotfix Sentry post-mortem `changelog.md` 2026-05-16 (source_updated_at canonical fix)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Calibración per tipo de pieza o per rol**: V1 threshold uniforme 72h. V2 si emerge data justificación.
- **Definición de "movimiento" más sofisticada**: V1 = cualquier edit. V2 podría discriminar (status change = real, comentario = débil).
- **Writeback per-task**: V1 NO. TASK derivada si emerge.
- **Per-cliente threshold**: V1 uniforme. V2 si cliente enterprise pide SLA.
- **Stuck Assets per fase CSC**: V1 expone solo count total. V2 desglose per fase (¿stuck en Briefing vs Producción vs Cambios cliente?).
- **Helper TS standalone**: V1 NO. V2 si emerge consumer real con countdown per-task.
- **Notificación automática operacional**: cuando stuck count llega a critical (≥5), ¿auto-alert al member? V1 NO automatizado. V2 si emerge workflow.
