# `Cumplimiento` — Canonical Spec V1 (dual meaning: per-task audit + aggregate narrative)

| Campo | Valor |
|---|---|
| Metric name | Cumplimiento (dual canonical) |
| Metric ID (registry) | `delivery_compliance` (per-task column, sync-only) · NO aggregate dedicado en registry — alias narrativo de OTD family |
| Spec version | V1 |
| Status | Accepted |
| Owner domain | `delivery|ico` |
| Created | 2026-05-17 by sesión deep-dive |
| Last updated | 2026-05-17 |
| Writeback state | `N.A. — per-task audit signal already sync from Notion; aggregate is narrative alias` |
| Cross-refs | OTD_V1 (alias agregado) · RPA_V1 · FTR_V1 · ADR boundary · ADR metric spec pattern |

---

## 1. Definición canonical

**Cumplimiento** tiene **dos significados canonical distintos** en el ecosistema Greenhouse ICO. Esta spec los formaliza separados para que código y narrativa NO los confundan:

### 1.1 Cumplimiento de promesa — aggregate narrative (cross-métrica)

**Categoría narrativa** que agrupa la familia OTD% (`otd_pct` + `on_time_count` + `late_drop_count` + `overdue_count`) cuando se reporta a negocio (QBR, CVR, Pulse executive). Responde la pregunta: **"¿Estamos cumpliendo la promesa operativa del período?"**.

**NO es métrica con compute propio.** Es alias narrativo de OTD family. Cuando el operador o cliente lee "Cumplimiento" en un dashboard ejecutivo, está leyendo OTD%. Cuando lee "Cumplimiento %" en una tarjeta de tarea individual, está leyendo el per-task audit signal (sección 1.2).

### 1.2 Cumplimiento % — per-task audit signal

**Property Notion** `Cumplimiento %` (formula codeUrl `Yk47Tg` en Sky DB), sincronizada como columna `delivery_compliance` en `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks`. Valores observados en BQ:

- `"100 %"` → cumplimiento exacto (cerrada justo en deadline)
- `"100+ %"` → entrega adelantada (cerrada antes de deadline)
- presumiblemente `"<100 %"` cuando hay atraso

**NO entra en agregados de métricas.** Es señal explicativa per-task que sirve para entender **por qué** una tarea individual cayó en su bucket (`on_time` / `late_drop` / `overdue`). Lectura per-task en `get-project-detail.ts:494` (campo `deliveryCompliance` del API response).

**A quién le importa**:

- **Cumplimiento de promesa (1.1)**: cliente (QBR), pitch comercial, executive dashboards — narrativa de salud operativa
- **Cumplimiento % (1.2)**: operador HR/Delivery investigando un caso específico — audit forensic per-task

---

## 2. Fórmula canonical

### 2.1 Cumplimiento de promesa — alias OTD%

**Sin compute propio.** Lectura idéntica a `otd_pct` del registry (ver `OTD_V1.md` §2.2):

```sql
-- mismo SQL que otd_pct, presentado bajo etiqueta "Cumplimiento de promesa"
ROUND(
  100.0 * COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL>)
       / NULLIF(COUNT(*) FILTER (WHERE <CANONICAL_ON_TIME_SQL>
                                     OR <CANONICAL_LATE_DROP_SQL>
                                     OR <CANONICAL_OVERDUE_SQL>), 0),
  1
) AS otd_pct
-- presentado como "Cumplimiento de promesa" en QBR/CVR dashboards
```

### 2.2 Cumplimiento % per-task — formula Notion + sync read-only

La fórmula vive en **Notion** (property `Cumplimiento %`, formula codeUrl `Yk47Tg` Sky DB). Notion la computa per-task a partir de:

- `due_date` (Fecha límite)
- `completed_at` (Fecha de completado)
- Reglas de presentación: porcentaje del plazo consumido

Greenhouse **NO recomputa** — solo sincroniza via `sync-notion-conformed.ts` el valor string formateado (`"100 %"`, `"100+ %"`, `"<100 %"`) a la columna `delivery_compliance`.

### 2.3 Versionado de fórmula

- **Cumplimiento de promesa**: hereda `OTD_FORMULA_VERSION = 'otd_v1.0'` (no tiene versión propia, es alias).
- **Cumplimiento % per-task**: vive en Notion sin versionado formal. Si Notion modifica la fórmula, Greenhouse lo refleja automáticamente vía sync. Esta es **excepción canonical al ADR boundary** porque es audit signal de presentación, no compute de métrica con consecuencias downstream (P&L, bonificaciones).

---

## 3. Inputs canonical

### 3.1 Cumplimiento de promesa (idéntico a OTD%)

Ver `OTD_V1.md` §3. Inputs idénticos.

### 3.2 Cumplimiento % per-task

| Input | Origen | Tipo | Comentario |
|---|---|---|---|
| `delivery_compliance` (string formateado) | Notion property `Cumplimiento %` → sync a `greenhouse_conformed.delivery_tasks.delivery_compliance` → `greenhouse_delivery.tasks.delivery_compliance` | derivado por Notion | string `"100 %"`, `"100+ %"`, `"<100 %"` |
| `due_date` (subyacente) | `greenhouse_delivery.tasks.due_date` (Notion `Fecha límite`) | primitivo | input para Notion formula |
| `completed_at` (subyacente) | `greenhouse_delivery.tasks.completed_at` (Notion `Fecha de completado`) | primitivo | input para Notion formula |

### 3.3 Boundary canonical Notion ↔ Greenhouse

**Excepción canonical**: `Cumplimiento % per-task` es el único caso donde una fórmula Notion sigue siendo source-of-truth post-decisión 2026-05-17. Razones:

1. **No tiene blast radius downstream** — no entra en agregados, no afecta bonificaciones, no genera writeback Notion (es READ-only from Notion).
2. **Es presentación, no compute con consecuencia** — formato `"100 %"` / `"100+ %"` es visual, no aritmético.
3. **Si Notion lo borra/rompe, Greenhouse degrada graceful** — campo opcional, UI muestra `—` cuando ausente.
4. **Migrar a Greenhouse compute requiere infra desproporcionada** para un campo audit-only de baja criticidad.

Si en futuro emerge necesidad de Cumplimiento % per-task con compute canonical Greenhouse (e.g. para writeback consistente cross-DB), TASK derivada migra. Por ahora, sync-only es óptimo.

---

## 4. Helper canonical (per-task compute)

### 4.1 Cumplimiento de promesa

NO helper propio. Reusa helpers de OTD% (ver `OTD_V1.md` §4).

### 4.2 Cumplimiento % per-task

NO helper TS. Lectura directa de `task.deliveryCompliance` (string) en consumers. Ejemplo: `get-project-detail.ts:494` expone `deliveryCompliance` field en API response sin transformación.

---

## 5. Agregado canonical

### 5.1 Cumplimiento de promesa

Reusa `otd_pct` aggregate del registry (`src/lib/ico-engine/metric-registry.ts:194-224`). Ver `OTD_V1.md` §5.

### 5.2 Cumplimiento % per-task

**NO se agrega.** Es señal explicativa per-task. Si emerge demanda de agregado (e.g. "promedio Cumplimiento % per-member-month"), evaluar TASK derivada — pero V1 deja explícitamente sin agregar para evitar promediar strings de formato variable (`"100 %"` + `"100+ %"` + `"<100 %"` no son aritméticamente comparables sin parser).

---

## 6. Semántica de casos edge

### 6.1 Cumplimiento de promesa

Misma semántica que OTD% (ver `OTD_V1.md` §6). Excluye `Bloqueado` / `Detenido` / archivadas / canceladas / sin due_date.

### 6.2 Cumplimiento % per-task

| Escenario | Cumplimiento % per-task valor |
|---|---|
| Tarea cerrada exactamente en deadline | `"100 %"` |
| Tarea cerrada antes de deadline | `"100+ %"` |
| Tarea cerrada después de deadline | `"<100 %"` (presunto) |
| Tarea sin due_date | `NULL` o vacío — UI muestra `—` |
| Tarea abierta | `NULL` o cálculo running de plazo consumido (depende de fórmula Notion) |
| Tarea en Bloqueado/Cancelada | `NULL` o legacy value — UI muestra `—` |

---

## 7. Estados / dataStatus

### 7.1 Cumplimiento de promesa

Idéntico a OTD% (`OTD_V1.md` §7).

### 7.2 Cumplimiento % per-task

| dataStatus | Cuándo aplica | Qué muestra UI |
|---|---|---|
| `valid` | `delivery_compliance` string presente (`"100 %"` / `"100+ %"` / `"<100 %"`) | Render verbatim del string Notion |
| `unavailable` | Field NULL o vacío en Notion (sin due_date, sin completed, o fórmula no evaluada) | `—` |

NO existe `low_confidence` ni `suppressed` para per-task — es read-only de Notion.

---

## 8. Threshold canonical + benchmark

### 8.1 Cumplimiento de promesa

Idéntico a OTD% (`OTD_V1.md` §8). Threshold ≥90% optimal.

### 8.2 Cumplimiento % per-task

**NO tiene threshold formal** — es audit signal de auditoría operativa, no KPI agregado. Operador interpreta:

- `"100+ %"` → cumplimiento excepcional, posible candidate para reconocimiento
- `"100 %"` → cumplimiento exacto, normal operacional
- `"<100 %"` → slip, investigar causa raíz (bloqueo upstream, brief sub-dimensionado, capacidad insuficiente)

---

## 9. Writeback a Notion

**N.A.** Cumplimiento NO tiene writeback canonical:

- **Cumplimiento de promesa** = alias narrativo de OTD%. Si OTD% se writeback (TASK-902 futura), la lectura "Cumplimiento de promesa" se beneficia automático en QBR/CVR sin writeback propio.
- **Cumplimiento % per-task** = ya viene de Notion (formula property). Greenhouse NO escribe ahí — sería duplicación y rompería el contrato.

---

## 10. Histórico de decisiones

### 2026-05-17 — V1 created

- Spec canonical creado para **formalizar el dual-meaning** detectado en deep-dive sesión 2026-05-17 (Contrato Delta sección A.3).
- **Decisión canonical**: separar los 2 significados en código y narrativa. Antes vivían mezclados — "Cumplimiento" era usado en dashboards executive (alias OTD%) y en tarjetas per-task (audit signal) sin distinción explícita.
- **Excepción canonical al ADR boundary**: `Cumplimiento % per-task` queda como sync-only de Notion formula. Las 3 razones (no blast downstream, presentación no compute, degradación graceful) justifican mantener excepción. Si emerge necesidad cambia.
- **NO crear writeback** ni en V1 ni en futuras tasks — la métrica está cubierta por OTD% writeback (TASK-902 futura).

### Pre-V1 — Contrato Delta línea 47-53 dual meaning

- Documentado en `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 sección A.3 como decisión canonical.
- Engine doc línea 2363 (`A.5.4.0 Categorías funcionales de métricas ICO`) cita "Cumplimiento de promesa" como categoría narrativa.
- Engine doc línea 2372 cita "Cumplimiento %" como "Contexto de auditoría" — no agregado.

---

## 11. Cross-refs

- **ADRs**: `../GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (excepción documentada §6), `../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- **Specs hermanas**:
  - [OTD_V1.md](OTD_V1.md) — agregado underlying de "Cumplimiento de promesa"
  - [CT_SLO_PCT_V1.md](CT_SLO_PCT_V1.md) — métrica complementaria a OTD%
  - [RPA_V1.md](RPA_V1.md) · [FTR_V1.md](FTR_V1.md) — métricas hermanas core
- **Tasks**: TASK-902 (writeback OTD% futuro, beneficia "Cumplimiento de promesa")
- **Código**:
  - Aggregate underlying: `src/lib/ico-engine/metric-registry.ts:194-224` (otd_pct)
  - Sync per-task: `src/lib/sync/sync-notion-conformed.ts:1284` (mapping `delivery_compliance`)
  - Aliases en governance contract: `src/lib/space-notion/notion-governance-contract.ts:204`
  - API exposure per-task: `get-project-detail.ts:494` (`deliveryCompliance` field)
- **Docs reference**:
  - Contrato Delta 2026-05-17 sección A.3 (formalización dual-meaning)
  - Engine doc `Greenhouse_ICO_Engine_v1.md` líneas 2363 + 2372

---

## 12. Open questions deliberadamente NO resueltas en V1

- **Migrar Cumplimiento % per-task a Greenhouse compute**: V1 deja como sync-only de Notion. Si emerge necesidad downstream (writeback consistente, agregado per-período, decisión bonificación), TASK derivada migra.
- **Agregar Cumplimiento % per-task**: V1 NO. Si emerge demanda real, evaluar parser canonical de strings `"100 %"` / `"100+ %"` / `"<100 %"` + agregado per-período.
- **Renombrar "Cumplimiento de promesa" para evitar ambigüedad**: ¿usar "Promise Compliance" en código y "Cumplimiento" solo como label visual? V1 mantiene "Cumplimiento de promesa" como alias narrativo per Engine doc convention.
- **Threshold per-task implícito**: ¿operadores hacen reviews automáticas cuando `<100 %` aparece? Hoy NO automatizado. Si emerge workflow, evaluar.
