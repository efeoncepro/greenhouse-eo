# TASK-189 — ICO Period Filter: Due-Date Anchor & Carry-Over Logic

## Delta 2026-04-03 — Semántica original de `carry-over` queda supersedida

- Aclaración de negocio posterior:
  - la definición implementada originalmente en `TASK-189` para `carry-over` como tarea vencida de períodos anteriores aún abierta ya no debe considerarse canónica para Delivery
- Contrato vigente ahora:
  - `Carry-Over` = tarea creada en el mes con `due_date` en el mes siguiente o después
  - la deuda vencida que cruza de mes pasa a medirse por separado como `Overdue Carried Forward`
- Lectura correcta del legado de `TASK-189`:
  - sigue siendo válida la decisión de anclar el período por `due_date`
  - pero la semántica específica de `carry-over` quedó superada por la clarificación contractual posterior documentada en `TASK-200`, `TASK-204` y la arquitectura viva de Delivery

## Delta 2026-04-01 — Reader hardened + rolling rematerialization

- Se implementó el hardening faltante de `TASK-189` sin reescribir `ICO`:
  - la proyección [`ico_member_metrics`](../../../../src/lib/sync/projections/ico-member-metrics.ts) ahora respeta `periodYear` / `periodMonth` cuando el engine publica `ico.materialization.completed`
  - el cron [`/api/cron/ico-materialize`](../../../../src/app/api/cron/ico-materialize/route.ts) ahora rematerializa por defecto una ventana rolling de `3` meses (`monthsBack`, configurable hasta `6`)
- Esto fortalece el ecosistema alrededor del engine:
  - cambios semánticos del período ya no quedan atrapados tan fácilmente en snapshots viejos
  - la resincronización a PostgreSQL deja de asumir siempre “mes actual” cuando el evento viene de una rematerialización/backfill
- El gap operativo restante ya no es de código base sino de ejecución:
  - desplegar este cambio
  - disparar la rematerialización del período afectado para sanar snapshots ya existentes

## Delta 2026-04-01 — Hallazgo de auditoría sobre snapshots stale

- La reapertura no se explica solo por “cards vacías con 0 cierres”.
- La auditoría cruzada entre serving y BigQuery confirmó un segundo problema real:
  - `readMemberMetrics()` sigue privilegiando el path `materialized-first`
  - los snapshots materializados vigentes para algunos miembros/períodos todavía reflejan semántica previa al ajuste de `TASK-189`
- Evidencia observada para `daniela-ferreira`:
  - `greenhouse_serving.ico_member_metrics` y `ico_engine.metrics_by_member` en `2026-04` siguen con `carry_over_count = null`
  - el cálculo live sobre `ico_engine.v_tasks_enriched` ya devuelve `carry_over_count = 4`, `throughput_count = 3`, `otd_pct = 100`, `ftr_pct = 100`
- Lectura correcta:
  - el engine ya cambió
  - pero el consumer visible puede seguir leyendo snapshots stale y por eso mostrar `—` o `0` cuando el cálculo live actual ya no lo haría
- Implicación operativa:
  - esta task debe cerrar tanto el contrato temporal como la estrategia de consumo/backfill para no confiar ciegamente en snapshots viejos tras un cambio de semántica

## Delta 2026-04-01 — Reapertura por cierre prematuro

- La task se reabre porque el hardening del engine sí resolvió el anclaje por `due_date`, `period_anchor_date`, `carry_over_count`, la replicación a serving y el contexto visible del período, pero no cerró completamente el problema funcional que la propia spec describe.
- Estado observado en producto:
  - el período correcto ya se filtra mejor
  - el `carry-over` ya existe como contrato
  - pero las cards primarias (`RpA`, `OTD%`, `FTR%`, `Ciclo`) siguen devolviendo `null`/`—` cuando el período tiene trabajo comprometido y todavía no hay cierres
- Lectura correcta:
  - el tramo ya implementado resolvió la base temporal del engine
  - el tramo pendiente de esta misma task es endurecer la experiencia visible y el contrato operativo para que la pregunta “¿cómo vamos este mes?” no quede reducida a un banner + cards vacías

## Delta 2026-04-01

- La auditoría del repo confirmó que esta task sí toca el contrato canónico de `ICO`, pero también impacta consumers reales en `payroll`, `serving` y proyecciones reactivas.
- Se corrigió la spec para dejar explícito que `carry-over` debe ser **relativo al período consultado/materializado**, no calculado contra `CURRENT_DATE()`.
- Se corrigió el alcance: no basta con “filtro SQL + vista”; también hay contrato de snapshot, serving y compatibilidad con `readMemberMetrics()` / `readMemberMetricsBatch()`.
- Se dejó explícito que cualquier ajuste debe alinear o desactivar el carril legacy paralelo en `scripts/materialize-member-metrics.ts`.
- Implementación cerrada:
  - `buildPeriodFilterSQL()` y `buildMetricSelectSQL()` ya usan ancla canónica por `due_date` con `carry-over` relativo al período consultado.
  - `metric_snapshots_monthly` y `metrics_by_*` ya persisten `carry_over_count` de forma aditiva.
  - `greenhouse_serving.ico_member_metrics` ya replica `carry_over_count` para consumers OLTP protegidos.
  - `PersonActivityTab` ya expone chip de `carry-over` y banner cuando todavía no hay completaciones del período.
  - `readMemberMetrics()` ya corrige el path materialized-first para reconstruir `cscDistribution`.

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Bajo`
- Status real: `Reabierta`
- Rank: `1`
- Domain: `delivery / ico-engine`

## Summary

Cambiar el filtro de período canónico del ICO Engine (`buildPeriodFilterSQL`) para que el período de una tarea se determine por su **`due_date`** (fecha límite) en vez de `completed_at`. Incorporar lógica de **carry-over** para tareas vencidas en meses anteriores que siguen activas. El cambio sigue siendo quirúrgico, pero ya no se lee como “solo una view”: afecta el contrato canónico que consumen `materialize.ts`, `read-metrics.ts`, serving Postgres y payroll.

Esta task forma parte del carril `MVP` inmediato para recuperar confianza operativa en métricas junto con `TASK-186`, antes de abordar el hardening estructural completo de la `Native Integrations Layer`.

## Why This Task Exists

Hoy el ICO Engine determina el período de una tarea así:

```sql
-- shared.ts:163 — buildPeriodFilterSQL()
(completed_at IS NOT NULL
  AND EXTRACT(YEAR FROM completed_at) = @periodYear
  AND EXTRACT(MONTH FROM completed_at) = @periodMonth)
OR
(completed_at IS NULL
  AND task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado'))
```

**Problemas con esta lógica:**

1. **Tareas activas aparecen en TODOS los meses** — no tienen filtro temporal. Si una persona tiene 17 tareas activas, las ve en enero, febrero, marzo, abril... siempre las mismas 17.
2. **Al inicio de mes las métricas están vacías** — las métricas de calidad (RpA, OTD%, FTR%, Ciclo) solo computan sobre `completed_at IS NOT NULL`. El día 1 del mes, hay 0 completaciones → todo es null.
3. **No hay concepto de carry-over** — una tarea que venció en marzo y sigue abierta en abril no aparece como arrastre; simplemente se mezcla con las activas sin distinción.
4. **No responde la pregunta operativa** — "¿cómo vamos en abril?" debería significar "de lo comprometido para abril, ¿cómo va?" No "de lo que se completó en abril".

**Evidencia del modelo correcto:**

Sky Airlines ya implementó exactamente este modelo en Notion con sus fórmulas:
- `Mes actual`: retorna 1 si `Fecha límite` cae en el mes calendario en curso
- `Indicador de Performance`: clasifica cada tarea en On-Time, Late Drop, Overdue, Carry-Over
- `Mes de cierre`: YYYY-MM de `Fecha de completado` para reportes históricos

La capa conformed ya sincroniza estos campos:
- `due_date` (DATE) — de "Fecha límite" de Notion
- `completed_at` (TIMESTAMP) — de "Fecha de Completado"
- `performance_indicator_code` (STRING) — `on_time`, `late_drop`, `overdue`, `carry_over`
- `original_due_date` (DATE) — "Fecha límite original"

## Goal

Que el filtro de período del ICO Engine refleje la realidad operativa:

- **Una tarea pertenece al mes de su `due_date`**
- **Si no tiene `due_date`, fallback a `created_at`**
- **Tareas de meses anteriores aún activas aparecen como carry-over en el período posterior que se consulte o materialice**
- Las métricas de un mes responden: "del trabajo comprometido para este mes, ¿cómo fue?"

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

Reglas:
- El cambio debe ser en `buildPeriodFilterSQL()` y `buildMetricSelectSQL()` — el filtro canónico que todas las queries usan.
- No se toca el sync ni la capa conformed (los datos ya están).
- Las materializaciones (`metrics_by_member`, `metrics_by_project`, `metric_snapshots_monthly`) se recalculan automáticamente porque consumen el mismo filtro.
- Debe preservarse compatibilidad con consumers protegidos:
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/app/api/ico-engine/context/route.ts`
  - `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- Esta task no autoriza reescribir `ICO`; solo permite un ajuste quirúrgico, compatible y verificable sobre el engine vigente.
- Si el cambio rompe métricas existentes fuera del problema de período/carry-over, debe detenerse y corregirse antes de avanzar.

## Diseño Técnico

### 1. Nuevo `buildPeriodFilterSQL()`

**Archivo:** `src/lib/ico-engine/shared.ts`

```sql
-- Tareas del período seleccionado (due_date en el mes/año, o fallback created_at)
(
  COALESCE(due_date, DATE(created_at)) IS NOT NULL
  AND EXTRACT(YEAR FROM COALESCE(due_date, DATE(created_at))) = @periodYear
  AND EXTRACT(MONTH FROM COALESCE(due_date, DATE(created_at))) = @periodMonth
)
OR
-- Carry-over: tareas de meses anteriores que siguen activas (no completadas, no archivadas)
(
  COALESCE(due_date, DATE(created_at)) IS NOT NULL
  AND COALESCE(due_date, DATE(created_at)) < DATE(@periodYear, @periodMonth, 1)
  AND completed_at IS NULL
  AND task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado',
                          'Archivadas','Archivada','Cancelada','Canceled','Cancelled')
)
```

**Semántica:**
- Cláusula 1: tareas cuya fecha límite (o creación) cae en el período seleccionado — completadas o no
- Cláusula 2: tareas de períodos anteriores que aún están activas (carry-over)

### 2. Campo derivado opcional en `v_tasks_enriched`

**Archivo:** `src/lib/ico-engine/schema.ts`

Si el cambio necesita un ancla reutilizable en la view, agregar solo el campo estable de anclaje:

```sql
-- Derived: Period assignment (canonical month the task belongs to)
COALESCE(due_date, DATE(created_at), DATE(synced_at)) AS period_anchor_date,
```

`is_carry_over` no debe persistirse como columna estática basada en `CURRENT_DATE()`, porque eso rompe consultas históricas. La semántica de carry-over debe resolverse en `buildPeriodFilterSQL()` y en los selects canónicos usando `@periodYear` / `@periodMonth`.

### 3. Ajustes a `buildMetricSelectSQL()`

**Archivo:** `src/lib/ico-engine/shared.ts`

Agregar al SELECT canónico:

```sql
-- Carry-over count
COUNTIF(
  COALESCE(due_date, DATE(created_at)) < DATE(@periodYear, @periodMonth, 1)
  AND completed_at IS NULL
  AND task_status NOT IN ('Listo','Done','Finalizado','Completado','Aprobado',
                          'Archivadas','Archivada','Cancelada','Canceled','Cancelled')
) AS carry_over_count
```

### 4. Actualizar tipo `IcoMetricSnapshot`

**Archivo:** `src/lib/ico-engine/read-metrics.ts`

Agregar a `context`:

```typescript
context: {
  totalTasks: number
  completedTasks: number
  activeTasks: number
  carryOverTasks: number  // ← nuevo
}
```

Si el snapshot por miembro sigue alimentando serving o payroll materialized-first, la introducción de `carryOverTasks` debe mantenerse backward compatible y no alterar los campos ya consumidos (`otdPercent`, `rpaAvg`, `tasksCompleted`).

### 5. Actualizar vista `PersonActivityTab`

**Archivo:** `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`

- Mostrar chip de carry-over junto a los chips de tareas/completadas/activas
- Cuando `completedTasks === 0` y hay tareas del período, mostrar banner informativo (las métricas de calidad requieren completaciones)

### 6. Fix colateral: CSC distribution para member metrics

**Archivo:** `src/lib/ico-engine/read-metrics.ts`

`readMemberMetrics()` (línea 586) siempre retorna `cscDistribution: []` porque la tabla materializada no la incluye. Agregar query CSC en paralelo para el path materializado, igual que `computeMetricsByContext()`.

### 7. Alinear carril legacy paralelo

**Archivo:** `scripts/materialize-member-metrics.ts`

Existe un carril legacy que duplica parte de la semántica de member metrics y hoy ya deriva del contrato canónico. Esta task debe:

- alinearlo al builder canónico nuevo, o
- dejarlo explícitamente deprecado para que no siga materializando bajo la semántica antigua

## Escenarios de Validación

| Escenario | `due_date` | Estado | Período seleccionado | Resultado esperado |
|---|---|---|---|---|
| Tarea de abril, completada a tiempo | 2026-04-15 | Listo | Abr 2026 | En métricas de abril, OTD = on_time |
| Tarea de abril, completada tarde | 2026-04-10 | Listo (completada 04-18) | Abr 2026 | En métricas de abril, OTD = late |
| Tarea de abril, aún en curso | 2026-04-20 | En curso | Abr 2026 | Activa en abril, cuenta para stuck/CSC |
| Tarea de marzo, aún en curso | 2026-03-25 | En curso | Abr 2026 | **Carry-over** en abril |
| Tarea de marzo, aún en curso | 2026-03-25 | En curso | Mar 2026 | En métricas de marzo como no completada |
| Tarea sin fecha límite | null | En curso | Abr 2026 | Asignada por `created_at` month |
| Tarea de enero, aún activa | 2026-01-15 | Bloqueado | Abr 2026 | Carry-over en abril |

## Dependencies & Impact

**Depende de:**
- `greenhouse_conformed.delivery_tasks` — columnas `due_date`, `completed_at`, `created_at` (ya existen)
- `ico_engine.v_tasks_enriched` — view que consume conformed (ya pasa `due_date`)

**Impacta a:**
- `src/lib/ico-engine/shared.ts` — `buildPeriodFilterSQL()`, `buildMetricSelectSQL()`
- `src/lib/ico-engine/schema.ts` — `v_tasks_enriched` view (si hace falta agregar `period_anchor_date`)
- `src/lib/ico-engine/read-metrics.ts` — tipos, `readMemberMetrics()` CSC fix
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — carry-over chip, banner informativo
- `src/app/api/ico-engine/context/route.ts` — sin cambios (consume los mismos tipos)
- `src/lib/payroll/fetch-kpis-for-period.ts` — consumer protegido de métricas por miembro
- `src/lib/sync/projections/ico-member-metrics.ts` — puente BigQuery -> Postgres
- `scripts/materialize-member-metrics.ts` — carril legacy que debe alinearse o deprecarse
- Materializaciones (`materialize.ts`) — se recalculan automáticamente con el nuevo filtro

**Archivos owned:**
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- `scripts/materialize-member-metrics.ts`

## Relación con otras Tasks

- **TASK-186** (Delivery Metrics Trust) — esta task resuelve uno de los gaps identificados: el período de las métricas no es confiable. Complementa la auditoría de propiedades.
- **MVP inmediato** — `TASK-189` + `TASK-186` deben entregar una primera versión confiable y visible de métricas antes de entrar al carril estructural `TASK-188` / `TASK-187`.
- **TASK-011** (ICO Person 360 Integration) — el carry-over y el nuevo filtro enriquecen la vista 360 de persona.

## Notion Reference

Bases de datos auditadas para este diseño:

| Space | DB | ID | Data Source |
|---|---|---|---|
| Efeonce | Proyectos | `15288d9b-1459-4052-9acc-75439bbd5470` | `collection://abaeb422-4538-44d8-b43f-026a907746a2` |
| Efeonce | Tareas | `3a54f090-4be1-4158-8335-33ba96557a73` | `collection://5126d7d8-bf3f-454c-80f4-be31d1ca38d4` |
| Sky Airlines | Proyectos | `23039c2f-efe7-817a-8272-ffe6be1a696a` | `collection://23039c2f-efe7-8116-8a83-000b758078f8` |
| Sky Airlines | Tareas | `23039c2f-efe7-8138-9d1e-c8238fc40523` | `collection://23039c2f-efe7-81f8-af2d-000b67594d18` |

**Modelo de referencia (Sky Airlines):**
- Fórmula `Indicador de Performance` → clasifica On-Time / Late Drop / Overdue / Carry-Over
- Fórmula `Mes actual` → ancla período por `Fecha límite`
- Fórmula `Mes de cierre` → YYYY-MM de `Fecha de completado`
