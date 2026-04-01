# TASK-189 — ICO Period Filter: Due-Date Anchor & Carry-Over Logic

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Bajo`
- Status real: `Diseño completo`
- Rank: `1`
- Domain: `delivery / ico-engine`

## Summary

Cambiar el filtro de período canónico del ICO Engine (`buildPeriodFilterSQL`) para que el período de una tarea se determine por su **`due_date`** (fecha límite) en vez de `completed_at`. Incorporar lógica de **carry-over** para tareas vencidas en meses anteriores que siguen activas. Este cambio es quirúrgico: los datos ya existen en `greenhouse_conformed.delivery_tasks` y en `v_tasks_enriched`; solo hay que cambiar el filtro SQL y ajustar la vista.

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
- **Tareas de meses anteriores aún activas aparecen como carry-over en el mes actual**
- Las métricas de un mes responden: "del trabajo comprometido para este mes, ¿cómo fue?"

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

Reglas:
- El cambio debe ser en `buildPeriodFilterSQL()` y `buildMetricSelectSQL()` — el filtro canónico que todas las queries usan.
- No se toca el sync ni la capa conformed (los datos ya están).
- Las materializaciones (`metrics_by_member`, `metrics_by_project`, `metric_snapshots_monthly`) se recalculan automáticamente porque consumen el mismo filtro.
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

### 2. Nuevo campo derivado en `v_tasks_enriched`

**Archivo:** `src/lib/ico-engine/schema.ts`

Agregar al view:

```sql
-- Derived: Period assignment (canonical month the task belongs to)
COALESCE(due_date, DATE(created_at), DATE(synced_at)) AS period_anchor_date,

-- Derived: Is carry-over (due in a previous month, still active)
(
  COALESCE(due_date, DATE(created_at)) < DATE_TRUNC(CURRENT_DATE(), MONTH)
  AND completed_at IS NULL
  AND task_status NOT IN (
    'Listo', 'Done', 'Finalizado', 'Completado', 'Aprobado',
    'Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled'
  )
) AS is_carry_over
```

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

### 5. Actualizar vista `PersonActivityTab`

**Archivo:** `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`

- Mostrar chip de carry-over junto a los chips de tareas/completadas/activas
- Cuando `completedTasks === 0` y hay tareas del período, mostrar banner informativo (las métricas de calidad requieren completaciones)

### 6. Fix colateral: CSC distribution para member metrics

**Archivo:** `src/lib/ico-engine/read-metrics.ts`

`readMemberMetrics()` (línea 586) siempre retorna `cscDistribution: []` porque la tabla materializada no la incluye. Agregar query CSC en paralelo para el path materializado, igual que `computeMetricsByContext()`.

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
- `src/lib/ico-engine/schema.ts` — `v_tasks_enriched` view (agregar `period_anchor_date`, `is_carry_over`)
- `src/lib/ico-engine/read-metrics.ts` — tipos, `readMemberMetrics()` CSC fix
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — carry-over chip, banner informativo
- `src/app/api/ico-engine/context/route.ts` — sin cambios (consume los mismos tipos)
- Materializaciones (`materialize.ts`) — se recalculan automáticamente con el nuevo filtro

**Archivos owned:**
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`

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
