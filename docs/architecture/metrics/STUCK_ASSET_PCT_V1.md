# `StuckAssetPct` — Porcentaje Estancado — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | Stuck % (Porcentaje estancado) |
| Metric ID (registry) | `stuck_asset_pct` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado per-período, no aplica writeback per-task) |
| Cross-refs | STUCK_ASSETS_V1 (hermana — count absoluto) · PIPELINE_VELOCITY_V1 · CSC_DISTRIBUTION_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Stuck %** mide qué porcentaje de las tareas activas del período están estancadas (sin movimiento ≥72h). Es la versión **normalizada por backlog size** de Stuck Assets — útil para comparar health cross-member o cross-tiempo cuando los volúmenes de backlog varían.

- `Stuck % = 5%` → solo 1 de cada 20 tareas activas está stuck (flow saludable)
- `Stuck % = 25%` → 1 de cada 4 tareas activas está stuck (problema operacional sostenido)
- `Stuck % alto + Stuck Assets count alto` → pileup masivo
- `Stuck % alto + Stuck Assets count bajo` → pipeline pequeño con poca actividad (también pileup, pero a otra escala)

**A quién le importa**:

- **Management cross-member comparison**: member con 3 stuck de 5 activas (60%) es peor problema que member con 3 stuck de 50 activas (6%) — Stuck % normaliza
- **Cliente enterprise** (multi-team scorecard): comparar health % cross-team independiente de team size
- **Capacity planning**: ratio sostenido = indicador de proceso o capacity issue, no de carga puntual

---

## 2. Fórmula canonical

### 2.1 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:425-455
ROUND(
  100.0 * COUNT(*) FILTER (WHERE is_stuck = TRUE)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_OPEN_TASK_SQL>), 0),
  1
) AS stuck_asset_pct
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
```

Numerador: tareas con `is_stuck=TRUE`.
Denominador: tareas activas (`CANONICAL_OPEN_TASK_SQL`).

### 2.2 Versionado de fórmula

Hereda `STUCK_ASSETS_FORMULA_VERSION = 'stuck_assets_v1.0'` (no tiene versión propia — es ratio derivado de la misma definición de stuck). Si threshold `STUCK_THRESHOLD_HOURS` cambia, ambas (Stuck Assets count + Stuck %) bumpean coherente.

---

## 3. Inputs canonical

Idénticos a `STUCK_ASSETS_V1.md` §3. Mismo flag `is_stuck` materializado + mismo `CANONICAL_OPEN_TASK_SQL` para denominador.

---

## 4. Helper canonical (per-task compute)

**N.A.** Métrica puramente agregada (ratio). Ver `STUCK_ASSETS_V1.md` §4.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `stuck_asset_pct` per-member-month | `src/lib/ico-engine/metric-registry.ts:425-455` | Implemented |

### 5.1 SQL canonical

Ver §2.1 arriba.

### 5.2 Denominador canonical

Solo tareas abiertas (`CANONICAL_OPEN_TASK_SQL`). Si member sin tareas activas (denominador=0), retorna NULL.

### 5.3 Granularidades soportadas

Mismas que Stuck Assets: monthly / weekly per member, space, cliente.

---

## 6. Semántica de casos edge

| Escenario | Stuck % |
|---|---|
| Member sin tareas activas | NULL — UI `—` |
| Member con 0 stuck de 10 activas | 0.0% — flow saludable |
| Member con 5 stuck de 10 activas | 50.0% — pipeline atascado mayoritariamente |
| Member con 1 stuck de 1 activa | 100.0% — alta concentración, pero sample bajo (trust=low_confidence) |
| Member con 1 stuck de 100 activas | 1.0% — ratio sano aunque count absoluto bajo |

### 6.1 Stuck % vs Stuck Assets count

**Ambas son canonical** — no redundantes:

- **Stuck Assets count** = lista per-task accionable ("estas N tareas necesitan unblock hoy")
- **Stuck %** = health % normalizada para comparar cross-member o cross-tiempo

Member con 5 stuck en pipeline de 20 (25%) y member con 5 stuck en pipeline de 50 (10%) — ambos tienen 5 stuck count pero el primero tiene problema operacional más severo. Stuck % lo expone.

### 6.2 Distinción canonical vs Pipeline Velocity

- **Stuck %** = snapshot de cuánto del backlog activo está atascado
- **Pipeline Velocity** = ratio flow (cierre vs apertura) del período

Stuck % alta + Velocity alta = "muchas atascadas pero las que se mueven se cierran rápido" — backlog dual: bloqueado vs fluido. Stuck % alta + Velocity baja = "todo atascado, ninguna se cierra" — pipeline roto.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n_active ≥ 10 | Stuck % + threshold zone |
| `low_confidence` | 2 ≤ n_active < 10 | Stuck % + warning visual |
| `unavailable` | n_active = 0 | `—` |

---

## 8. Threshold canonical + benchmark

| Threshold | Min % | Max % | Severidad UI |
|---|---|---|---|
| Optimal | 0 | 10 | success (verde) |
| Attention | 10 | 25 | warning (amber) |
| Critical | 25 | 100 | error (rojo) |

**Lower is better** (es métrica negativa — menos % stuck es mejor).

### 8.1 Benchmark interno

Greenhouse operating policy: target ≤ 10% Stuck del backlog activo. ≥25% = pileup operacional. ≥50% = pipeline roto, escalation inmediata.

### 8.2 Calibración per tipo de pieza (futuro)

Out of scope V1. Hipótesis: equipos especializados en videos largos pueden tolerar Stuck % mayor legítimamente. V2 si emerge data.

---

## 9. Writeback a Notion

**N.A.** Agregado per-período. NO aplica writeback per-task.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado documentando el agregado existente.
- **Decisión canonical**: Stuck % vive como métrica hermana DEDICADA de Stuck Assets (NO se reduce a "es la versión %"). Razón: distintas use cases — Stuck Assets para lista accionable, Stuck % para health normalizado.
- Hereda inputs/threshold/flag de Stuck Assets — coherencia cross-métrica.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) — **métrica hermana DIRECTA** (count absoluto vs % normalizado)
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — flow vs stuck ratio
  - [OCF_V1.md](OCF_V1.md) — saturation acumulada
  - [CSC_DISTRIBUTION_V1.md](CSC_DISTRIBUTION_V1.md) — composition vs stuck
- **Tasks**: ninguna activa V1
- **Código**:
  - Agregado: `src/lib/ico-engine/metric-registry.ts:425-455`
  - Source: flag `v_tasks_enriched.is_stuck` (materializado) — mismo que Stuck Assets
- **Docs reference**: `STUCK_ASSETS_V1.md` §3 (inputs canonical compartidos)

---

## 12. Open questions deliberadamente NO resueltas en V1

Idénticas a `STUCK_ASSETS_V1.md` §12. Cualquier cambio de threshold, definición de movimiento o calibración aplica coherente a ambas (Stuck Assets count + Stuck %).
