# `<METRIC_NAME>` — Canonical Spec V1

> **Template canonical** para specs de métricas críticas. Copiar este archivo a `<METRIC_NAME>_V1.md` y reemplazar placeholders. NO modificar la estructura de las 12 secciones obligatorias.
>
> ADR de pattern: `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`. ADR de boundary ownership: `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`.

| Campo | Valor |
|---|---|
| Metric name | `<nombre canonical, e.g. RpA, OTD, FTR>` |
| Metric ID (registry) | `<id en metric-registry.ts, e.g. rpa, otd_pct, ftr_pct>` |
| Spec version | V1 |
| Status | Accepted / In design / Draft |
| Owner domain | `delivery|ico` (or `finance`, `hr`, etc. si aplica fuera de delivery) |
| Created | YYYY-MM-DD by `<autor>` |
| Last updated | YYYY-MM-DD by `<autor>` |
| Writeback state | `not_implemented` / `shadow_mode` / `enabled` / `N.A.` |
| Cross-refs | `<tasks + ADRs + otros metric specs>` |

---

## 1. Definición canonical

> Qué mide la métrica, en lenguaje simple es-CL, sin jerga técnica. 1-2 párrafos máximo.

`<Ejemplo: "RpA (Rounds per Asset) mide cuántas rondas de correcciones del cliente recibe una pieza creativa antes de quedar aprobada. RpA = 0 significa que el cliente aprobó el entregable a la primera, sin pedir cambios.">`

**A quién le importa**: `<operador / cliente / equipo / management>` — `<para qué la usan>`.

---

## 2. Fórmula canonical

> Cómo se computa. **El código es source of truth**; el spec lo refleja. Si hay drift entre código y spec, se actualiza el spec inmediatamente (no se modifica el código para "matchear" el spec viejo).

### 2.1 Per-task (compute individual)

```text
<pseudocódigo o ecuación canonical, e.g.:>
RpA(task) = countCorrectionTransitions(task.id)
         = COUNT(transitions WHERE from_status = 'Listo para revisión' AND to_status = 'En Feedback')
```

### 2.2 Agregado (per-período per-member o per-space)

```text
<pseudocódigo del agregado, e.g.:>
RpA_avg(member, period) = AVG(rpa) WHERE task in CANONICAL_COMPLETED_TASK_SQL filtered by member + period
```

### 2.3 Versionado de fórmula

`<formula_version constant en código, e.g. RPA_FORMULA_VERSION = 'rpa_v1.0'>`. Bump cuando cambie semántica observable.

---

## 3. Inputs canonical

> Qué datos consume la métrica + de dónde vienen. Distinguir inputs **primitivos** (eventos observables) de inputs **derivados** (calculados upstream).

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `<input1>` | `<tabla / event / property>` | primitivo / derivado | `<comentario>` |
| `<input2>` | ... | ... | ... |

### 3.1 Boundary canonical Notion ↔ Greenhouse

`<Aplicar la regla del ADR boundary: qué inputs vienen de Notion vía webhook (primitivos), qué se computa en Greenhouse (derivados)>`

### 3.2 Forward-compat futuras integraciones

`<Frame.io, workflow tooling, etc. — qué inputs se agregarán cuando emerja la integración, sin breaking change>`

---

## 4. Helper canonical (per-task compute)

| Helper | File | Status |
|---|---|---|
| `<calculateXxx(taskId)>` | `src/lib/notion-metrics/<file>.ts` | Implemented / Designed / Not yet |

### 4.1 Signature canonical

```typescript
export type TaskInputsFor<Metric> = {
  // ...
}

export type <Metric>Result = {
  value: <type> | null
  dataStatus: 'valid' | 'unavailable' | 'suppressed' | 'low_confidence'
  sourceMode: 'canonical' | 'unavailable' | <other>
  formulaVersion: typeof <METRIC>_FORMULA_VERSION
  // ...
}

export const calculate<Metric>(inputs: TaskInputsFor<Metric>): Promise<<Metric>Result>
```

### 4.2 Tests anti-regresión mínimos

Mínimo N paths cubriendo: happy / null / edge / forward-compat / idempotencia. `<listar paths canonical>`

---

## 5. Agregado canonical (per-período per-member, registry SQL)

| Aggregate | File | Status |
|---|---|---|
| `<metric>_aggregate` | `src/lib/ico-engine/metric-registry.ts:<lines>` | Implemented / Drift / Not yet |

### 5.1 SQL canonical

```sql
-- formula del registry, e.g.:
ROUND(100 * COUNT(*) FILTER (WHERE <numerator_condition>) / NULLIF(COUNT(*) FILTER (WHERE <denominator_condition>), 0), 1)
```

### 5.2 Denominador canonical (qué tareas entran al agregado)

`<Reglas de exclusión: CANONICAL_COMPLETED_TASK_SQL / CANONICAL_OPEN_TASK_SQL / EXCLUDED_FROM_METRICS_STATUSES>`.

### 5.3 Granularidades soportadas

`<monthly | weekly | daily | per-space | per-member | per-client>`

---

## 6. Semántica de casos edge

> Qué cuenta / qué no cuenta + razonamiento operativo. Tabla canonical de escenarios.

| Escenario | Cuenta? | Justificación operativa |
|---|---|---|
| `<escenario 1>` | Sí / No | `<por qué>` |
| `<escenario 2>` | ... | ... |

### 6.1 Tareas excluidas del denominador

`<Bloqueado, Detenido, Archivada, Cancelada, etc. — referenciar EXCLUDED_FROM_METRICS_STATUSES canonical>`

### 6.2 Estados ambiguos / no mapeados

`<Estados Sky-specific, drift de status taxonomy, etc.>`

---

## 7. Estados / dataStatus

> Enum cerrado de estados que la métrica puede reportar. Distinguir `valid` (compute exitoso) de `unavailable` (data no disponible) de `suppressed` (compute deliberadamente omitido) de `low_confidence` (compute con caveat).

| dataStatus | Cuándo aplica | Qué muestra UI | Decisión consumer |
|---|---|---|---|
| `valid` | `<condición>` | Valor + benchmark | Usar para reportes/bonificaciones |
| `unavailable` | `<condición>` | "Sin datos" / `—` | NO usar como pass/fail; honesto |
| `suppressed` | `<condición>` | Oculto o flag visual | Razón explícita en metadata |
| `low_confidence` | `<condición>` | Valor + warning | Usar con caveat documentado |

`<Cross-ref a `rpa-policy.ts` TASK-215 si aplica>`

---

## 8. Threshold canonical + benchmark

| Threshold | Min | Max | Severidad UI |
|---|---|---|---|
| Optimal | `<n>` | `<n>` | success (verde) |
| Attention | `<n>` | `<n>` | warning (amber) |
| Critical | `<n>` | `<n>` | error (rojo) |

### 8.1 Benchmark externo (industria)

`<Fuente del benchmark, e.g. "Engine doc § A.5.5 dice agencias LATAM operan en X%">`

### 8.2 Calibración per tipo de pieza (futuro)

`<¿El threshold es uniforme o per tipo de entregable? Out of scope V1 si es uniforme.>`

---

## 9. Writeback a Notion

> Estado de la migración canonical para que Greenhouse escriba la métrica de vuelta a Notion property `[GH] <Metric>` read-only.

| Aspecto | Valor |
|---|---|
| Target property Notion | `[GH] <Metric>` |
| Estado actual | `not_implemented` / `shadow_mode` / `enabled` / `N.A.` |
| Task de writeback | TASK-`<###>` (referencia) |
| Frecuencia | Per-edit (webhook) / nightly safety net |
| Latencia esperada | `<5-30s post-edit, etc.>` |
| Feature flag | `NOTION_<METRIC>_WRITEBACK_ENABLED` (default `<true/false>`) |
| Reliability signal de paridad | `notion.metrics.shadow_paridad_<metric>` |

### 9.1 Pre-condiciones de activación

`<Las pre-condiciones canonical del ADR boundary: shadow mode 7d verde, signal steady=0, allowlist explícito en Handoff>`

---

## 10. Histórico de decisiones (append-only)

### YYYY-MM-DD — V1 created

- `<resumen de la decisión que motivó el spec V1>`
- `<source tasks + delta references>`

### YYYY-MM-DD — V1.1 update

- `<cambio menor preservando semántica>`

`<Append entries, NEVER delete>`

---

## 11. Cross-refs

- **ADRs**: `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`, `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`, `<otros ADRs aplicables>`
- **Specs hermanas**: `<otros metric specs relacionados, e.g. RPA_V1.md cita CYCLE_TIME_V1.md cuando comparten infra>`
- **Tasks**: `<TASK-### que tocaron la métrica>`
- **Código**: `<file:line del helper + del registry>`
- **Docs reference**: `Contrato_Metricas_ICO_v1.md` (narrativa de negocio), `Greenhouse_ICO_Engine_v1.md` (framework conceptual)

---

## 12. Open questions deliberadamente NO resueltas en V1

> Lista honesta de lo que quedó fuera + por qué + bajo qué condición se resolvería.

- `<question 1>`: `<scope deferido, condición de re-evaluación>`
- `<question 2>`: ...

---

## 13. Downstream consumers — qué consume esta métrica (opcional)

> Sección opcional pero recomendada cuando la métrica tiene downstream consumers críticos (Payroll bonus, P&L attribution, cliente reporting, CVR/QBR narrative, etc.). Lista cada consumer + cómo lo usa + cross-ref al spec/ADR del consumer.

### 13.1 Payroll bonus calculation

`Sí / No / Indirect via <alias>`. Si `Sí`:

- Helper canonical consumer: `src/lib/payroll/bonus-proration.ts:<helper>`
- Thresholds: `<defaults + override per-tenant via payroll_bonus_config>`
- Per-member tope: `compensation_versions.bonus_<metric>_max`
- ADR detallado: `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`

Si `No`:

- Razón canonical: `<por qué NO entra bonus V1 — política HR/Finance / double-counting / no per-member-month / etc.>`

### 13.2 Otros consumers (P&L, CVR, dashboards, reports)

Listar consumers adicionales con cross-ref + comportamiento esperado.
