# `CscDistribution` — Distribución CSC — Canonical Spec V1

| Campo | Valor |
|---|---|
| Metric name | CSC Distribution (Distribución de activos por fase de la Cadena de Suministro Creativo) |
| Metric ID (registry) | `csc_distribution` |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `N.A.` (agregado distribution per-período, no aplica writeback per-task) |
| Cross-refs | STUCK_ASSETS_V1 · PIPELINE_VELOCITY_V1 · CYCLE_TIME_V1 · TASK-908 (Fix B.2 mapea estados Sky a CSC) · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**CSC Distribution** describe cómo se distribuyen las **tareas activas** del período entre las 5 fases canonical de la **Cadena de Suministro Creativo (CSC)**: Briefing, Producción, Revisión interna, Cambios cliente, Entrega.

Es una métrica de **shape**, no de magnitud — responde la pregunta: **"¿Cómo se ve nuestro flujo creativo en este momento? ¿Estamos balanceados o atascados en alguna fase?"**

- Distribución **balanceada** (~20% por fase) → flujo saludable, las piezas atraviesan todas las fases sin congestión
- Distribución **concentrada en una fase** (e.g. 60% en Cambios cliente) → cuello de botella identificado en esa fase
- Distribución **concentrada en Briefing** → backlog acumulado sin arranque (capacity, dependencias upstream)
- Distribución **concentrada en Producción** → producción saturada o piezas longform (legítimo si rebrand de portfolio)

**A quién le importa**:

- **Management / Operations**: indicador agudo de salud del flow — diagnóstico inicial de cuellos de botella
- **Capacity planning**: input para sizing — saber qué fase necesita más recursos
- **Cliente** (vía CVR/Pulse): mide salud del flow visualmente (donut chart) — input al claim "Globe procesa tu volumen sin saturarse"
- **Equipo creativo**: contexto para retros — entender dónde se atascan las piezas

---

## 2. Fórmula canonical

### 2.1 Per-task (clasificación)

Cada tarea activa se mapea a una fase CSC vía `TASK_STATUS_TO_CSC` lookup en `metric-registry.ts:103-115`:

```typescript
{
  'Sin empezar': 'briefing',
  'Backlog': 'briefing',
  'Pendiente': 'briefing',
  'Listo para diseñar': 'briefing',
  'En curso': 'produccion',
  'En Curso': 'produccion',
  'Cambios Solicitados': 'cambios_cliente',
  'Listo': 'entrega',
  'Done': 'entrega',
  'Finalizado': 'entrega',
  'Completado': 'entrega'
  // POST TASK-908 Fix B.2:
  // 'Tomado': 'briefing',              // Sky-side initial state
  // 'Listo para revisión': 'entrega',  // antes de envío al cliente
  // 'En feedback': 'cambios_cliente',  // equivalente a "Cambios Solicitados"
  // 'Aprobado': 'entrega',             // estado terminal Sky-side
  // 'Bloqueado' NO mapea (excluido)
}
```

`'Listo para revisión'` históricamente se manejaba via LIKE match en SQL del view (no en TS lookup) — TASK-908 Fix B.2 lo formaliza en el lookup explícito.

### 2.2 Agregado canonical (per-member per-month)

```sql
-- src/lib/ico-engine/metric-registry.ts:368-397
SELECT
  csc_phase,
  COUNT(*) AS task_count,
  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS phase_pct
FROM v_tasks_enriched
WHERE assignee_member_id = $member
  AND period_year = $year AND period_month = $month
  AND <CANONICAL_OPEN_TASK_SQL>
  AND task_status NOT IN (<EXCLUDED_FROM_METRICS_STATUSES>)
GROUP BY csc_phase
```

Resultado: 5 rows (uno per fase CSC), con `task_count` y `phase_pct`.

### 2.3 Versionado de fórmula

`CSC_DISTRIBUTION_FORMULA_VERSION = 'csc_distribution_v1.0'` (constant futura si emerge helper TS). Bump cuando emerja modificación en mapping `TASK_STATUS_TO_CSC` (e.g. agregar fase CSC nueva).

---

## 3. Inputs canonical

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `task.task_status` | `greenhouse_delivery.tasks.task_status` (Notion `Estado 1`) | primitivo | input para mapping CSC |
| `TASK_STATUS_TO_CSC` lookup | `src/lib/ico-engine/metric-registry.ts:103-115` | configuración | mapping canonical status → fase CSC |
| `task.completed_at` | `greenhouse_delivery.tasks.completed_at` | primitivo | filtro: solo tareas abiertas entran |

### 3.1 Boundary canonical Notion ↔ Greenhouse

- **Notion** captura: status edits (cambio de `Estado 1`)
- **Greenhouse** computa: mapping `status → csc_phase` en VIEW BQ + agregado SQL
- **Greenhouse devuelve a Notion**: N.A. — CSC distribution es agregado per-período, no per-task

### 3.2 Las 5 fases CSC canonical

| Fase | Label visual | Color (CSC_CHART_COLORS) | Status que mapean |
|---|---|---|---|
| `briefing` | Briefing | `#7367F0` (purple) | Sin empezar / Backlog / Pendiente / Listo para diseñar / Tomado (Sky) |
| `produccion` | Producción | `#00BAD1` (cyan) | En curso / En Curso |
| `revision_interna` | Revisión interna | `#ff6500` (orange) | (estados internal review — futuro V2 cuando workflow integration exista) |
| `cambios_cliente` | Cambios cliente | `#bb1954` (red) | Cambios Solicitados / En feedback (Sky) |
| `entrega` | Entrega | `#6ec207` (green) | Listo / Done / Finalizado / Completado / Aprobado (Sky) / Listo para revisión |

### 3.3 Gap canonical B.2 (TASK-908 Fix)

Pre-TASK-908: estados Sky-specific `Tomado` / `Listo para revisión` / `En feedback` / `Aprobado` NO mapeados en `TASK_STATUS_TO_CSC`. Resultado: tareas Sky con esos status caen en `csc_phase = NULL` o `'otros'`. CSC Distribution charts mostraban data incompleta para Sky.

Post-TASK-908 Fix B.2 (Slice 7): mapping completo canonical. `Bloqueado` NO se mapea (excluido del scope via `EXCLUDED_FROM_METRICS_STATUSES`).

---

## 4. Helper canonical (per-task compute)

**N.A.** CSC Distribution es métrica agregada (distribution per-período). NO existe ni se justifica helper per-task — el mapping `TASK_STATUS_TO_CSC` ya provee la clasificación per-task.

Si emerge necesidad de exponer fase per-task desde TS, lookup directo: `TASK_STATUS_TO_CSC[task.taskStatus] ?? 'otros'`.

---

## 5. Agregado canonical (registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `csc_distribution` per-member-month | `src/lib/ico-engine/metric-registry.ts:368-397` | Implemented |

### 5.1 SQL canonical

Ver §2.2 arriba.

### 5.2 Denominador canonical

- **Solo tareas abiertas** — `CANONICAL_OPEN_TASK_SQL` (distribution es snapshot del pipeline activo, NO incluye cerradas)
- **Excluye Bloqueado/Detenido/archivadas/canceladas** — `EXCLUDED_FROM_METRICS_STATUSES`
- **Excluye tareas con `csc_phase = NULL`** (mapping no encontrado — síntoma de gap)

### 5.3 Granularidades soportadas

- `monthly` per member (default — diagnóstico individual)
- `monthly` per space (Pulse, Sky/Efeonce scorecards — diagnóstico del cliente)
- `monthly` per cliente (CVR — visualización flow donut)
- `weekly` (Pulse trends — early-detection de pileup en fase específica)

---

## 6. Semántica de casos edge

| Escenario | Comportamiento |
|---|---|
| Member sin tareas activas | Distribution vacía o NULL — UI muestra "Sin pipeline activo" |
| Member con todas tareas en una sola fase (e.g. 100% Briefing) | Distribution `briefing: 100%, otros: 0%` — clear cuello de botella |
| Tarea Sky en estado `Aprobado` pre-Fix B.2 | `csc_phase = NULL` o `'otros'` — gap visible en chart |
| Tarea Sky en estado `Aprobado` post-Fix B.2 | `csc_phase = 'entrega'` — chart completo |
| Tarea Bloqueado | NO entra al chart (excluida del scope) |
| Estado nuevo en Notion sin mapping | `csc_phase = NULL` → tarea no aparece en distribución — síntoma de gap que requiere extender lookup |
| Estado mapeado a fase con 0 tareas | Fase aparece con `0%` o se omite del chart (decisión UI) |

### 6.1 Distinción canonical vs Stuck Assets

- **CSC Distribution** = snapshot de **dónde están** las tareas (qué fase)
- **Stuck Assets** = subset de tareas activas que **no se han movido** en ≥N horas

Una tarea puede estar en fase `produccion` y ser `stuck` (Producción atascada). El CSC Distribution la cuenta como "en Producción" (correcto); Stuck Assets agrega contexto adicional.

### 6.2 Distinción canonical vs Pipeline Velocity

- **CSC Distribution** = composición del pipeline activo en un momento
- **Pipeline Velocity** = ratio de cierre vs apertura en período

CSC Distribution puede estar balanceada (20% per fase) con Pipeline Velocity baja (intake > output sostenido). Las 2 métricas son complementarias.

---

## 7. Estados / dataStatus

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | n_active ≥ 10 + mapping completo | Donut chart con 5 fases + percentiles |
| `low_confidence` | n_active < 10 | Donut chart + warning visual (sample chico) |
| `unavailable` | n_active = 0 | "Sin pipeline activo" o `—` |
| `degraded` | n_active > 0 + N tareas con `csc_phase=NULL` (gap mapping) | Donut chart + flag "Mapping incompleto: revisar TASK_STATUS_TO_CSC" |

---

## 8. Threshold canonical + benchmark

**N.A. — distribution NO tiene threshold canonical** porque no es métrica magnitudinal. La interpretación es contextual:

- **Concentración alta en una fase** (e.g. ≥50% en Cambios cliente) → posible cuello de botella, escalation operacional
- **Distribución balanceada** (~20% per fase) → flujo saludable
- **Concentración en Entrega** → buen mes (mucho cerca de cierre)
- **Concentración en Briefing** → pileup backlog (capacity vs intake)

Si emerge demanda de threshold automático (e.g. alertar cuando `cambios_cliente ≥40%`), V2 puede agregar reglas operacionales. V1 NO — interpretación contextual humana.

### 8.1 Trust signal

`trust.healthyMinSampleSize = 10` enforced. Con n<10 el chart se renderiza con warning "sample bajo, interpretación frágil".

---

## 9. Writeback a Notion

**N.A.** CSC Distribution es agregado per-período sin equivalente per-task Notion. NO aplica writeback.

Consumers (Pulse, CVR, scorecards, Person 360) leen el agregado del registry SQL directamente.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado documentando el agregado existente + el mapping `TASK_STATUS_TO_CSC`.
- **Gap canonical B.2 documentado**: estados Sky-specific (`Tomado`/`Listo para revisión`/`En feedback`/`Aprobado`) requieren mapping en TASK-908 Fix B.2. Pre-fix, tareas Sky con esos status quedan en `csc_phase=NULL` → CSC Distribution charts incompletos para Sky.
- **5 fases CSC canonical** confirmadas con labels y colors. Color palette canonical en `metric-registry.ts:92-98`.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [STUCK_ASSETS_V1.md](STUCK_ASSETS_V1.md) — métrica complementaria (qué fases tienen tareas atascadas)
  - [PIPELINE_VELOCITY_V1.md](PIPELINE_VELOCITY_V1.md) — métrica complementaria (composition vs flow)
  - [CYCLE_TIME_V1.md](CYCLE_TIME_V1.md) — duration per-tarea + flow distribution
- **Tasks**: TASK-908 Slice 7 (Fix B.2 cierra gap mapping Sky)
- **Código**:
  - Mapping: `src/lib/ico-engine/metric-registry.ts:103-115` (`TASK_STATUS_TO_CSC`)
  - Colors canonical: `metric-registry.ts:92-98` (`CSC_CHART_COLORS`)
  - Labels canonical: `metric-registry.ts:83-89` (`CSC_PHASE_LABELS`)
  - 5 fases enum: `metric-registry.ts:80-81` (`CSC_PHASES`)
  - Agregado: `metric-registry.ts:368-397`
- **Docs reference**:
  - Engine doc `Greenhouse_ICO_Engine_v1.md` (definición CSC en Contrato Delta)
  - Contrato `Contrato_Metricas_ICO_v1.md` (narrativa CSC + tier matrix)

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Fase `revision_interna`** sin status mapeados V1: existe el bucket pero ningún status actual de Notion mapea. Cuando workflow team rounds integration emerja (futuro), agregar status mappings + bumpe formula version.
- **Threshold automático para alertar cuellos de botella**: V1 NO. Si emerge demanda operacional (e.g. alertar cuando `cambios_cliente ≥40%`), V2 con reglas opcionales.
- **CSC Distribution rolling** vs snapshot puntual: V1 snapshot a `period_year/month`. V2 rolling 7d para early-detection de shifts.
- **Per-cliente CSC custom phases**: V1 fases uniformes. ¿Cliente enterprise pide tracking de fase custom (e.g. "Legal review", "Brand check")? V2 si emerge demanda — pero risk de fragmentar el contrato canonical.
- **CSC Distribution per tipo de pieza**: V1 agregado uniforme. V2 podría desglosar video vs estático separadamente.

---

## 13. Downstream consumers — qué consume CSC Distribution

### 13.1 Payroll bonus calculation — **NO input bonus V1**

**No**. CSC Distribution NO entra al cálculo de bonus V1.

**Razón canonical**: Es **shape metric** (distribución), no magnitudinal — NO bonus-evaluable. No tiene threshold operacional fijo, interpretación contextual humana. Bonus opera sobre métricas magnitudinales con thresholds canonical (OTD%, RpA).

**ADR detallado**: [`../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`](../GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md) §10.

### 13.2 Pulse + scorecards + capacity planning

Donut chart per-member, per-space, per-cliente. Diagnóstico visual de cuellos de botella — qué fase tiene pileup. Input para retros + capacity adjustment (qué fase necesita más recursos).

### 13.3 CVR cliente narrative (pipeline visual)

CSC Distribution aparece en QBR como visualización del flow creativo — input al claim "Globe procesa tu volumen sin saturar ninguna fase".
