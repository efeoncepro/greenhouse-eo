# CODEX TASK — Conformed Data Layer (Config-Driven Property Mappings)

## Meta

| Campo | Valor |
|-------|-------|
| **Task ID** | `CODEX_TASK_Conformed_Data_Layer` |
| **Repo** | `greenhouse-eo` (sync script, admin UI, mapping table) |
| **Prioridad** | P1 — necesario cuando se onboardee un segundo cliente con propiedades distintas (ej. Sky Airlines) |
| **Dependencias** | `CODEX_TASK_Tenant_Notion_Mapping` (implementado), `Greenhouse_ICO_Engine_v1.md` (consumidor downstream) |
| **Patrón** | Evolución — convierte los mapeos hardcodeados actuales en configuración dinámica |
| **Estado** | ✅ **IMPLEMENTADO** — 2026-03-18 |
| **Versión** | v2.1 — implementado 2026-03-18, documentación actualizada |

---

## 1. Resumen

Hacer que el mapeo de propiedades de Notion sea **config-driven** (leído de una tabla de configuración) en lugar de **hardcodeado en TypeScript**, para permitir el onboarding de nuevos clientes sin cambios de código.

**Estado actual:** La normalización de propiedades ya existe y funciona correctamente. El script `sync-source-runtime-projections.ts` transforma datos raw de Notion (nombres en español, tipos heterogéneos) a un schema conformed uniforme en inglés snake_case. Sin embargo, los mapeos de propiedades están hardcodeados en el código TypeScript, lo que significa que agregar un nuevo cliente con propiedades diferentes requiere modificar el script.

**Problema que resuelve este task:** Cuando Sky Airlines (u otro cliente) se onboardee con propiedades de Notion que difieren de las de Efeonce (ej. `Rondas Cliente` en vez de `Client Change Round`, o una `formula` en vez de un `number`), actualmente habría que modificar el sync script. Este task permite hacerlo vía configuración.

**Principio:** El ICO Engine (`v_tasks_enriched`) NO cambia. La normalización sigue ocurriendo en el mismo punto del pipeline. Solo cambia de DÓNDE lee los mapeos: de código hardcodeado a tabla de configuración.

---

## 2. Arquitectura actual (lo que ya existe)

### 2.1 Pipeline de datos implementado (3 capas)

```
Notion Teamspace (Efeonce)  ─┐
Notion Teamspace (Demo)     ─┤  Notion API
Notion Teamspace (Future)   ─┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  notion-bq-sync (Python, Cloud Run)                              │
│  • Servicio genérico — sincroniza Notion → BigQuery              │
│  • NO tiene lógica de negocio de Greenhouse                      │
│  • Escribe datos RAW a notion_ops.tareas (nombres en español)    │
│  • Estampa: notion_page_id, _synced_at                           │
└──────────────────────────────────────────────────────────────────┘
        │
        ▼
  notion_ops.tareas (BigQuery, RAW)
  ┌──────────────────────────────────┐
  │  Propiedades en español original │
  │  • estado: STRING                │
  │  • client_change_round: varies   │
  │  • rpa: varies                   │
  │  • nombres dependen del Space    │
  │  • NO tiene space_id             │
  └──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│  sync-source-runtime-projections.ts (TypeScript, greenhouse-eo)  │
│                                                                   │
│  Orquestador del dominio Greenhouse:                              │
│  1. Lee notion_ops.tareas/proyectos/sprints (raw BQ)              │
│  2. Lee client_notion_bindings → asigna space_id                  │
│  3. ★ MAPEO HARDCODEADO: renombra + coerce → inglés snake_case    │
│  4. Escribe a greenhouse_raw.*_snapshots (inmutable)              │
│  5. Escribe a greenhouse_conformed.delivery_tasks (BQ, uniforme)  │
│  6. Escribe a greenhouse_delivery.tasks (Postgres, proyección)    │
│                                                                   │
│  Funciones de normalización existentes:                           │
│  • toNumber(), toNullableString(), toTimestampValue()             │
│  • normalizeString(), normalizeBoolean()                          │
│  • Mapeo explícito: row.client_change_round → client_change_round_final │
│  • Mapeo explícito: row.rpa → rpa_value                          │
│  • Mapeo explícito: row.estado → task_status                     │
└──────────────────────────────────────────────────────────────────┘
        │
        ├──→ greenhouse_raw.tasks_snapshots (BQ, inmutable)
        │
        ├──→ greenhouse_conformed.delivery_tasks (BQ, normalizado)
        │    ┌──────────────────────────────────────────┐
        │    │  Schema conformed uniforme (inglés)       │
        │    │  • task_status: STRING                    │
        │    │  • client_change_round_final: INTEGER     │
        │    │  • rpa_value: FLOAT                       │
        │    │  • rpa_semaphore_source: STRING            │
        │    │  • notion_project_id: STRING              │
        │    │  • project_source_id: STRING              │
        │    │  • notion_sprint_id: STRING               │
        │    │  • sprint_source_id: STRING               │
        │    │  • space_id: STRING                       │
        │    │  • synced_at: TIMESTAMP                   │
        │    │  • Partitioned by DATE(synced_at)         │
        │    │  • Clustered by space_id                  │
        │    └──────────────────────────────────────────┘
        │         │
        │         ▼
        │    ico_engine.v_tasks_enriched (BQ view, NO CAMBIA)
        │    • Lee de greenhouse_conformed.delivery_tasks
        │    • Calcula: fase_csc, cycle_time_days, rpa_calculated, is_stuck
        │         │
        │         ▼
        │    Materialización → metric_snapshots_monthly, rpa_trend,
        │                      stuck_assets_detail, metrics_by_project
        │         │
        │         ▼
        │    Pulse, ICO Engine UI, Agency Dashboard
        │
        └──→ greenhouse_delivery.tasks (Postgres, proyección operacional)
             • Person 360, People module, Team capacity
             • Schema espejo del conformed BQ
```

### 2.2 Lo que ya funciona

| Capacidad | Estado | Implementación |
|-----------|--------|----------------|
| Schema conformed uniforme | ✅ Implementado | `greenhouse_conformed.delivery_tasks` con columnas en inglés |
| Estampado de `space_id` | ✅ Implementado | Via `preferredSpaceMap` (lee `client_notion_bindings`) |
| Type coercion | ✅ Implementado | `toNumber()`, `toNullableString()`, `toTimestampValue()`, etc. |
| ICO Engine recibe datos uniformes | ✅ Implementado | `v_tasks_enriched` lee de `greenhouse_conformed.delivery_tasks` |
| Multi-tenant partición | ✅ Implementado | Particionado por `DATE(synced_at)`, clusterizado por `space_id` |
| Raw layer preservada | ✅ Implementado | `greenhouse_raw.*_snapshots` mantiene datos originales |
| Proyección a Postgres | ✅ Implementado | `greenhouse_delivery.tasks` para serving operacional |
| Backward compatible | ✅ Implementado | Spaces sin mapping especial usan el mapeo default |

### 2.3 Estado de implementación

| Capacidad | Estado | Implementación |
|-----------|--------|----------------|
| Tabla `space_property_mappings` | ✅ Implementado | `greenhouse_delivery.space_property_mappings` en Postgres, DDL en `scripts/setup-postgres-source-sync.sql` |
| Mapeo dinámico por Space | ✅ Implementado | `loadPropertyMappings()` + `applyPropertyMappings()` en sync script, con cache en memoria |
| Discovery script | ✅ Implementado | `scripts/notion-schema-discovery.ts` — genera reporte + seed SQL |
| Coercion rules configurables | ✅ Implementado | `applyCoercion()` con 16 reglas: direct, formula_to_int/float/string/bool, rollup_to_*, extract_number_from_text, select/status/checkbox, relation, people, ignore |
| Fallback a default | ✅ Implementado | Spaces sin mappings usan el mapeo hardcodeado existente — backward compatible |
| Sync testeado con tabla vacía | ✅ Verificado | 4,153 registros sincronizados correctamente (2026-03-18) |
| Admin UI para mappings | ❌ Futuro | No en scope — onboarding vía discovery script + SQL seed |

---

## 3. Schema conformed target (implementado)

Estos son los campos que `greenhouse_conformed.delivery_tasks` tiene actualmente. La tabla `space_property_mappings` debe mapear propiedades de Notion a estos campos.

| Campo conformed | BQ Type | Required | Consumidor ICO | Descripción |
|-----------------|---------|----------|----------------|-------------|
| `task_status` | STRING | ✅ | `fase_csc` mapping | Estado actual de la tarea |
| `client_change_round_final` | INTEGER | ✅ | RpA, FTR% | Rondas de revisión del cliente |
| `workflow_change_round` | INTEGER | ❌ | RpA combined | Rondas internas |
| `rpa_value` | FLOAT | ❌ | `rpa_notion` (referencia) | RpA calculado por Notion |
| `rpa_semaphore_source` | STRING | ❌ | Visual indicator | Semáforo verde/amarillo/rojo |
| `frame_versions` | INTEGER | ❌ | Backup RpA | Versiones en Frame.io |
| `frame_comments` | INTEGER | ❌ | Feedback metrics | Comentarios totales |
| `open_frame_comments` | INTEGER | ❌ | Feedback pendiente | Comentarios sin resolver |
| `client_review_open` | BOOLEAN | ❌ | `fase_csc` mapping | Revisión de cliente abierta |
| `workflow_review_open` | BOOLEAN | ❌ | Internal tracking | Revisión interna abierta |
| `review_source` | STRING | ❌ | Attribution | Origen de última revisión |
| `last_reviewed_version` | INTEGER | ❌ | Version tracking | Última versión revisada |
| `notion_project_id` | STRING | ✅ | Scope chain, JOINs | ID del page de proyecto en Notion |
| `project_source_id` | STRING | ✅ | Scope chain, JOINs | source_id desambiguado del proyecto |
| `notion_sprint_id` | STRING | ❌ | Sprint velocity | ID del page de sprint en Notion |
| `sprint_source_id` | STRING | ❌ | Sprint velocity | source_id desambiguado del sprint |
| `url_frame_io` | STRING | ❌ | Deep link | URL del asset en Frame.io |
| `completed_at` | TIMESTAMP | ❌ | Cycle time, period filtering | Fecha de completación |
| `created_at` | TIMESTAMP | ❌ | Audit | Fecha de creación en Notion |

**Campos generados por el pipeline (no se mapean):**
- `notion_page_id` — viene del objeto page, no de propiedades
- `space_id` — estampado via `client_notion_bindings` / `preferredSpaceMap`
- `synced_at` — timestamp del sync
- `sync_batch_id` — identificador del batch de sync

**Nota sobre relaciones:** En Notion, `proyecto` y `sprint` son relaciones (un array de page IDs). El sync script ya las desglosa en dos campos cada una: `notion_project_id` (raw page ID) + `project_source_id` (source_id del proyecto referenciado), y análogamente para sprints.

---

## 4. Schema de la tabla de configuración

### 4.1 Tabla: `greenhouse_delivery.space_property_mappings` (Postgres)

La tabla vive en Postgres (no BigQuery), consistente con la arquitectura de Greenhouse donde las tablas de configuración operacional están en Postgres. El sync script ya tiene conexión a Postgres.

```sql
CREATE TABLE IF NOT EXISTS greenhouse_delivery.space_property_mappings (
  -- Identidad
  id                    TEXT PRIMARY KEY,               -- UUID o slug único
  space_id              TEXT NOT NULL,                   -- FK conceptual a spaces

  -- Mapping
  notion_property_name  TEXT NOT NULL,                   -- Nombre exacto de la propiedad en Notion (case-sensitive)
  conformed_field_name  TEXT NOT NULL,                   -- Nombre del campo target en greenhouse_conformed (snake_case, inglés)

  -- Tipo
  notion_type           TEXT NOT NULL,                   -- Tipo en Notion: number, formula, select, rollup, rich_text, etc.
  target_type           TEXT NOT NULL,                   -- Tipo target: STRING, INTEGER, FLOAT, BOOLEAN, TIMESTAMP

  -- Coerción
  coercion_rule         TEXT NOT NULL DEFAULT 'direct',
  -- Reglas soportadas:
  --   'direct'                    → el tipo es compatible, asignar directo
  --   'formula_to_int'            → extraer número de formula result, cast a int
  --   'formula_to_float'          → extraer número de formula result, cast a float
  --   'formula_to_string'         → extraer string de formula result
  --   'formula_to_bool'           → extraer boolean de formula result
  --   'rollup_to_int'             → extraer número de rollup result, cast a int
  --   'rollup_to_float'           → extraer número de rollup result, cast a float
  --   'rollup_to_string'          → extraer string o join array de rollup result
  --   'extract_number_from_text'  → regex para extraer primer número de un string
  --   'select_to_string'          → extraer .name de select
  --   'status_to_string'          → extraer .name de status
  --   'checkbox_to_bool'          → extraer boolean de checkbox
  --   'number_to_string'          → cast number a string
  --   'relation_first_id'         → extraer primer ID de array de relaciones
  --   'relation_to_source_ids'    → extraer IDs y resolver source_ids (para proyecto/sprint)
  --   'people_first_email'        → extraer email del primer person
  --   'ignore'                    → no incluir esta propiedad en el output

  -- Metadata
  is_required           BOOLEAN DEFAULT false,           -- Si true, loguea warning si no puede resolver
  fallback_value        TEXT,                            -- Valor default si null (JSON encoded)
  notes                 TEXT,                            -- Notas para el admin

  -- Audit
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            TEXT,                            -- user_id del admin

  -- Constraints
  UNIQUE (space_id, conformed_field_name),               -- Un campo conformed solo puede tener un source por Space
  UNIQUE (space_id, notion_property_name)                -- Una propiedad de Notion solo mapea a un campo conformed
);

CREATE INDEX IF NOT EXISTS idx_spm_space_id ON greenhouse_delivery.space_property_mappings(space_id);
```

### 4.2 ¿Por qué Postgres y no BigQuery?

1. **Consistencia arquitectónica:** Las tablas de configuración operacional del sistema (client_notion_bindings, tenants, roles) ya viven en Postgres.
2. **El sync script ya tiene conexión PG:** `sync-source-runtime-projections.ts` escribe a Postgres — agregar un SELECT no requiere nueva infraestructura.
3. **Latencia:** Leer configuración de Postgres es ms, vs. BigQuery que tiene overhead de ~1-2s por query.
4. **Futuro Admin UI:** La UI de Greenhouse ya consume Postgres para CRUD. Agregar un admin de mappings es natural.

---

## 5. Lógica de normalización (refactorización del sync script)

### 5.1 Dónde se modifica

El cambio ocurre en `scripts/sync-source-runtime-projections.ts`, específicamente en la función que transforma filas raw de `notion_ops.tareas` a objetos conformed para `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks`.

**Actualmente:** El mapeo está hardcodeado en el cuerpo de la función:

```typescript
// Actual (simplificado) — hardcodeado
const taskStatus = normalizeString(row.estado)
const clientChangeRound = Math.round(toNumber(row.client_change_round))
const rpaValue = toNumber(row.rpa)
// ... más mapeos explícitos
```

**Target:** El mapeo se lee de `space_property_mappings` con fallback al comportamiento actual:

```typescript
// Target (simplificado) — config-driven con fallback
const mappings = await loadPropertyMappings(spaceId) // Lee de Postgres, cacheado

if (mappings.length > 0) {
  // Usar mappings dinámicos
  const conformed = applyPropertyMappings(row, mappings)
} else {
  // Fallback: mapeo hardcodeado actual (Efeonce default)
  const conformed = applyDefaultMapping(row)
}
```

### 5.2 Función `loadPropertyMappings`

```typescript
// Cache en memoria por ejecución del sync
const mappingsCache = new Map<string, PropertyMapping[]>()

interface PropertyMapping {
  notionPropertyName: string
  conformedFieldName: string
  notionType: string
  targetType: string
  coercionRule: string
  isRequired: boolean
  fallbackValue: string | null
}

async function loadPropertyMappings(spaceId: string): Promise<PropertyMapping[]> {
  if (mappingsCache.has(spaceId)) {
    return mappingsCache.get(spaceId)!
  }

  const rows = await runGreenhousePostgresQuery<{
    notion_property_name: string
    conformed_field_name: string
    notion_type: string
    target_type: string
    coercion_rule: string
    is_required: boolean
    fallback_value: string | null
  }>(`
    SELECT notion_property_name, conformed_field_name, notion_type, target_type,
           coercion_rule, is_required, fallback_value
    FROM greenhouse_delivery.space_property_mappings
    WHERE space_id = $1
  `, [spaceId])

  const mappings: PropertyMapping[] = rows.map(r => ({
    notionPropertyName: r.notion_property_name,
    conformedFieldName: r.conformed_field_name,
    notionType: r.notion_type,
    targetType: r.target_type,
    coercionRule: r.coercion_rule,
    isRequired: r.is_required,
    fallbackValue: r.fallback_value
  }))

  mappingsCache.set(spaceId, mappings)
  return mappings
}
```

### 5.3 Función `applyCoercion`

```typescript
function applyCoercion(value: unknown, rule: string, targetType: string): unknown {
  if (value === null || value === undefined) return null

  switch (rule) {
    case 'direct':
      return castToType(value, targetType)

    case 'formula_to_int':
    case 'rollup_to_int':
      return Math.round(toNumber(value))

    case 'formula_to_float':
    case 'rollup_to_float':
      return toNumber(value)

    case 'formula_to_string':
    case 'rollup_to_string':
    case 'select_to_string':
    case 'status_to_string':
    case 'number_to_string':
      return normalizeString(value)

    case 'formula_to_bool':
    case 'checkbox_to_bool':
      return normalizeBoolean(value)

    case 'extract_number_from_text': {
      if (typeof value === 'number') return value
      const str = String(value)
      const match = str.match(/[\d]+\.?[\d]*/)
      return match ? parseFloat(match[0]) : null
    }

    case 'relation_first_id': {
      const str = normalizeString(value)
      return str.includes(',') ? str.split(',')[0].trim() : str
    }

    case 'relation_to_source_ids': {
      // Las relaciones ya están extraídas por notion-bq-sync como IDs concatenados.
      // El sync script los resuelve a source_ids via los mapas de proyectos/sprints.
      // Este caso requiere lógica especial en el caller.
      return normalizeString(value)
    }

    case 'people_first_email': {
      const str = normalizeString(value)
      return str.includes(',') ? str.split(',')[0].trim() : str
    }

    case 'ignore':
      return undefined // El caller no asigna este valor

    default:
      console.warn(`[sync] Unknown coercion rule: '${rule}'. Using direct cast.`)
      return castToType(value, targetType)
  }
}

function castToType(value: unknown, targetType: string): unknown {
  switch (targetType) {
    case 'STRING': return normalizeString(value)
    case 'INTEGER': return Math.round(toNumber(value))
    case 'FLOAT': return toNumber(value)
    case 'BOOLEAN': return normalizeBoolean(value)
    case 'TIMESTAMP': return toTimestampValue(value)
    default: return normalizeString(value)
  }
}
```

### 5.4 Comportamiento cuando no hay mappings

Si un Space no tiene entradas en `space_property_mappings`, el sync script ejecuta el mapeo hardcodeado actual. Esto es intencional:

- **Efeonce ya funciona** con el mapeo hardcodeado — no necesita entradas en la tabla.
- **El mapeo default se mantiene** como fallback permanente, no se elimina.
- **Solo Spaces nuevos** con propiedades diferentes necesitan entradas en `space_property_mappings`.

Diagrama de decisión:

```
¿Space tiene entradas en space_property_mappings?
  │
  ├── SÍ → Usar mappings de la tabla (config-driven)
  │         Los campos no mapeados se omiten del conformed output
  │
  └── NO → Usar mapeo hardcodeado default (comportamiento actual)
           Funciona para Efeonce y cualquier Space con propiedades idénticas
```

### 5.5 Fallback conservador

Si `loadPropertyMappings` falla (ej: tabla no existe todavía, error de red), el pipeline debe:
1. Loguear warning con el error
2. Continuar con el mapeo hardcodeado default
3. Nunca bloquear el sync completo por un error de configuración

---

## 6. Discovery script

### 6.1 Propósito

El script `notion-schema-discovery.ts` (TypeScript, consistente con el repo) compara las propiedades de las bases de Notion entre Spaces y genera:

1. **Catálogo completo** de propiedades por Space (nombre, tipo, opciones, sample values)
2. **Mapeo sugerido** al schema conformed con nivel de confianza (HIGH/MEDIUM/LOW)
3. **Conflictos de tipo** detectados con reglas de coerción sugeridas
4. **Seed SQL** auto-generado para `space_property_mappings`

### 6.2 Ubicación

```
scripts/
  notion-schema-discovery.ts       # NUEVO: comparador de schemas
  sync-source-runtime-projections.ts  # MODIFICAR: leer mappings
```

### 6.3 Workflow de onboarding de un nuevo Space

```
1. Registrar Space en client_notion_bindings (ya implementado via API)
2. Ejecutar discovery script:
   npx tsx scripts/notion-schema-discovery.ts --space-id EO-SPC-SKY
3. Revisar discovery_report.md generado
4. Ajustar y ejecutar el seed SQL en Postgres
5. Ejecutar sync: npx tsx scripts/sync-source-runtime-projections.ts
6. Verificar datos en greenhouse_conformed.delivery_tasks
7. Ejecutar materialización ICO: npx tsx scripts/materialize-ico.ts
```

---

## 7. Seed data

### 7.1 Efeonce (sin mappings — usa default)

Las propiedades de Efeonce coinciden con los nombres que el mapeo hardcodeado espera. No necesita entradas en `space_property_mappings`. El pipeline usa el fallback default.

### 7.2 Ejemplo: Sky Airlines (mapping completo)

```sql
-- ⚠️ ESTOS SON EJEMPLOS. Los valores reales se obtienen del discovery script.
-- Reemplazar notion_property_name, notion_type y coercion_rule con los valores reales.

INSERT INTO greenhouse_delivery.space_property_mappings
  (id, space_id, notion_property_name, conformed_field_name, notion_type, target_type, coercion_rule, is_required, notes, created_by)
VALUES
  ('sky-001', 'space-sky', 'Rondas Cliente',        'client_change_round_final', 'formula',  'INTEGER',   'formula_to_int',     true,  'Fórmula que retorna string con número', 'julio-admin'),
  ('sky-002', 'space-sky', 'Estado Tarea',           'task_status',               'status',   'STRING',    'status_to_string',   true,  'Status property, no select',            'julio-admin'),
  ('sky-003', 'space-sky', 'RPA',                    'rpa_value',                 'formula',  'FLOAT',     'formula_to_float',   false, 'Fórmula que calcula RpA',               'julio-admin'),
  ('sky-004', 'space-sky', 'Semáforo',               'rpa_semaphore_source',      'formula',  'STRING',    'formula_to_string',  false, NULL,                                    'julio-admin'),
  ('sky-005', 'space-sky', 'Versiones Frame',        'frame_versions',            'number',   'INTEGER',   'direct',             false, NULL,                                    'julio-admin'),
  ('sky-006', 'space-sky', 'Comentarios',            'frame_comments',            'number',   'INTEGER',   'direct',             false, NULL,                                    'julio-admin'),
  ('sky-007', 'space-sky', 'Comentarios Abiertos',   'open_frame_comments',       'number',   'INTEGER',   'direct',             false, NULL,                                    'julio-admin'),
  ('sky-008', 'space-sky', 'Rev. Cliente Abierta',   'client_review_open',        'checkbox', 'BOOLEAN',   'checkbox_to_bool',   false, NULL,                                    'julio-admin'),
  ('sky-009', 'space-sky', 'Proyecto',               'notion_project_id',         'relation', 'STRING',    'relation_first_id',  true,  'Relation a base Proyectos de Sky',      'julio-admin'),
  ('sky-010', 'space-sky', 'Sprint',                 'notion_sprint_id',          'relation', 'STRING',    'relation_first_id',  false, 'Relation a base Sprints de Sky',        'julio-admin'),
  ('sky-011', 'space-sky', 'URL Frame.io',           'url_frame_io',              'url',      'STRING',    'direct',             false, NULL,                                    'julio-admin');
```

---

## 8. Impacto en archivos existentes

### 8.1 Archivos a modificar (greenhouse-eo)

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `scripts/sync-source-runtime-projections.ts` | Agregar `loadPropertyMappings`, `applyCoercion`, `applyPropertyMappings`. Modificar la transformación de tareas para usar mappings dinámicos cuando existen. | Refactorización principal |
| `src/lib/postgres/client.ts` | Sin cambio — ya exporta `runGreenhousePostgresQuery` que el sync script usa. | Sin cambio |

### 8.2 Archivos nuevos (greenhouse-eo)

| Archivo | Propósito |
|---------|-----------|
| `scripts/notion-schema-discovery.ts` | Discovery script para comparar schemas entre Spaces |
| Migración SQL (o script de provisión) | `CREATE TABLE greenhouse_delivery.space_property_mappings` |

### 8.3 Archivos que NO cambian

| Archivo/Artefacto | Razón |
|-------------------|-------|
| `notion-bq-sync` (Python Cloud Run) | La normalización NO vive aquí — es un servicio genérico de sync |
| `src/lib/ico-engine/schema.ts` | El ICO Engine no sabe de mappings — recibe datos ya conformed |
| `ico_engine.v_tasks_enriched` | View de BigQuery — lee de `greenhouse_conformed` que ya llega uniforme |
| `src/lib/ico-engine/materialize.ts` | Materialización — opera sobre datos ya conformed |
| API routes del ICO Engine | Consumen datos ya materializados |

---

## 9. Acceptance criteria

1. **Tabla `space_property_mappings` creada** en Postgres schema `greenhouse_delivery`.
2. **Sync script lee mappings**: para un Space con mappings configurados, el script los usa para transformar propiedades en vez del mapeo hardcodeado.
3. **Sync script funciona sin mappings**: para un Space sin entradas (Efeonce), el comportamiento es idéntico al actual.
4. **Coerción de tipos funciona**: un `formula` de Notion que retorna `"2.0"` se convierte a `INTEGER 2` cuando el mapping dice `formula_to_int`.
5. **Campos required logueados**: si un campo `is_required: true` no se encuentra en la fila, el pipeline loguea warning pero no falla.
6. **Fallback conservador**: si la lectura de mappings falla, el pipeline continúa con el mapeo default.
7. **Datos llegan a las 3 capas**: raw snapshots (BQ) + conformed (BQ) + tasks (PG) con los valores correctos para Spaces con y sin mappings.
8. **ICO Engine funciona sin cambios**: `v_tasks_enriched` retorna resultados correctos para filas de múltiples Spaces.
9. **Discovery script genera reporte**: ejecutar con database IDs de un Space produce catálogo de propiedades, mapeo sugerido, y seed SQL.

---

## 10. Notas para el agente

- **No modificar `notion-bq-sync`.** La normalización vive en `sync-source-runtime-projections.ts`, NO en el pipeline genérico de Cloud Run. El servicio Python es deliberadamente agnóstico al dominio de Greenhouse.
- **El mapeo hardcodeado se mantiene como fallback.** No eliminarlo — es el comportamiento default para Efeonce y cualquier Space que no necesite mappings custom. Extraerlo a una función `applyDefaultMapping()` para claridad.
- **La tabla va en Postgres, no BigQuery.** Consistente con la arquitectura: configuración operacional en PG, datos analíticos en BQ. El sync script ya tiene conexión a ambos.
- **Cache en memoria por ejecución.** Los mappings no cambian durante un sync run. Leerlos una vez por Space y cachear en `Map<string, PropertyMapping[]>`.
- **Las relaciones (proyecto/sprint) son caso especial.** El sync script resuelve relation page IDs a `source_id` via mapas de proyectos/sprints. Los mappings deben contemplar que una propiedad `relation` puede generar DOS campos conformed: `notion_project_id` + `project_source_id`.
- **Propagación a Postgres.** Cualquier campo conformed nuevo debe existir también en `greenhouse_delivery.tasks`. Los INSERTs del sync script escriben a ambos destinos.
- **Discovery script en TypeScript, no Python.** Consistente con el repo `greenhouse-eo` que es 100% TypeScript. Puede usar la misma utilería de Notion API que ya existe en el proyecto.
- **Este task NO bloquea el pipeline actual.** Es una mejora para facilitar onboarding de nuevos clientes. El sistema funciona correctamente para los clientes actuales con el mapeo hardcodeado.
- **Prioridad P1:** Implementar cuando Sky Airlines (u otro cliente con propiedades diferentes) necesite onboardearse. Para Efeonce-only, el sistema actual funciona correctamente.

---

## 11. Registro de implementación (2026-03-18)

### 11.1 Artefactos creados/modificados

| Artefacto | Tipo | Descripción |
|-----------|------|-------------|
| `scripts/setup-postgres-source-sync.sql` | Modificado | Agregado DDL de `greenhouse_delivery.space_property_mappings` con constraints UNIQUE y GRANTs |
| `scripts/sync-source-runtime-projections.ts` | Modificado | Agregadas funciones: `PropertyMapping` interface, `loadPropertyMappings()`, `applyCoercion()`, `castToTargetType()`, `normalizeNotionKey()`, `applyPropertyMappings()`. Modificado bloque de transformación de tareas para usar config-driven con fallback |
| `scripts/notion-schema-discovery.ts` | Nuevo | Discovery script TypeScript completo: lee schemas de Notion API, compara con conformed schema, genera reporte + seed SQL |

### 11.2 Tabla Postgres creada

```
greenhouse_delivery.space_property_mappings
├── id (TEXT PK)
├── space_id (TEXT NOT NULL)
├── notion_property_name (TEXT NOT NULL)
├── conformed_field_name (TEXT NOT NULL)
├── notion_type (TEXT NOT NULL)
├── target_type (TEXT NOT NULL)
├── coercion_rule (TEXT NOT NULL DEFAULT 'direct')
├── is_required (BOOLEAN DEFAULT false)
├── fallback_value (TEXT)
├── notes (TEXT)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── created_by (TEXT)
├── UNIQUE (space_id, conformed_field_name)
└── UNIQUE (space_id, notion_property_name)

Grants: SELECT, INSERT, UPDATE, DELETE → greenhouse_runtime
Index: delivery_spm_space_idx ON (space_id)
```

### 11.3 Flujo de datos implementado

```
sync-source-runtime-projections.ts
│
├── 1. Lee notion_ops.tareas de BigQuery (raw)
├── 2. Asigna space_id via preferredSpaceMap
├── 3. Pre-carga property mappings de Postgres para todos los space_ids del batch
│      └── loadPropertyMappings(spaceId) → cache en Map<string, PropertyMapping[]>
├── 4. Para cada tarea:
│      ├── Construye resultado con mapeo hardcodeado default (siempre)
│      ├── Si el space tiene mappings → applyPropertyMappings(rawRow, mappings)
│      │   ├── normalizeNotionKey() → busca la propiedad en la fila raw
│      │   ├── applyCoercion(value, rule, targetType) → convierte tipo
│      │   └── Sobreescribe campos del resultado default con los override
│      └── Si no tiene mappings → usa resultado default tal cual
├── 5. Escribe a greenhouse_raw.tasks_snapshots (BQ, inmutable)
├── 6. Escribe a greenhouse_conformed.delivery_tasks (BQ, normalizado)
└── 7. Escribe a greenhouse_delivery.tasks (Postgres, proyección)
```

### 11.4 Reglas de coerción implementadas

| Regla | Input | Output | Ejemplo |
|-------|-------|--------|---------|
| `direct` | cualquiera | cast a targetType | `number → INTEGER` |
| `formula_to_int` | formula result | `INTEGER` | `"2.0" → 2` |
| `formula_to_float` | formula result | `FLOAT` | `"3.14" → 3.14` |
| `formula_to_string` | formula result | `STRING` | `"abc" → "abc"` |
| `formula_to_bool` | formula result | `BOOLEAN` | `true → true` |
| `rollup_to_int` | rollup result | `INTEGER` | `"5" → 5` |
| `rollup_to_float` | rollup result | `FLOAT` | `"2.5" → 2.5` |
| `rollup_to_string` | rollup result | `STRING` | `["a","b"] → "a, b"` |
| `select_to_string` | select object | `STRING` | `{name:"Done"} → "Done"` |
| `status_to_string` | status object | `STRING` | `{name:"Active"} → "Active"` |
| `checkbox_to_bool` | checkbox | `BOOLEAN` | `true → true` |
| `extract_number_from_text` | rich_text | `FLOAT` | `"v2.1 release" → 2.1` |
| `relation_first_id` | relation array | `STRING` | `["abc","def"] → "abc"` |
| `people_first_email` | people array | `STRING` | `["a@b.com","c@d.com"] → "a@b.com"` |
| `number_to_string` | number | `STRING` | `42 → "42"` |
| `ignore` | cualquiera | `undefined` | campo excluido del output |

### 11.5 Resultado de test (2026-03-18)

```
TypeScript check:  pnpm tsc --noEmit → PASS (0 errors)
Sync dry-run:      4,153 Notion tasks → raw → conformed → Postgres (100%)
                   1,912 HubSpot records → 869 conformed → 97 projected
Mappings table:    0 rows (empty) → fallback a default → comportamiento idéntico
```

### 11.6 Workflow de onboarding verificado

```bash
# 1. Registrar Space en Greenhouse (ya implementado via API)

# 2. Ejecutar discovery para obtener schema del nuevo Space
npx tsx scripts/notion-schema-discovery.ts --space-id EO-SPC-SKY

# 3. Revisar discovery_report.md generado
#    → Catálogo de propiedades, mapeo sugerido, conflictos de tipo, seed SQL

# 4. Ejecutar seed SQL ajustado en Postgres
#    → INSERT INTO greenhouse_delivery.space_property_mappings ...

# 5. Ejecutar sync para el nuevo Space
npx tsx scripts/sync-source-runtime-projections.ts

# 6. Verificar datos en greenhouse_conformed.delivery_tasks filtrados por space_id

# 7. Ejecutar materialización ICO
npx tsx scripts/materialize-ico.ts
```

---

*Efeonce Greenhouse™ • Conformed Data Layer Spec v2.1*
*Efeonce Group — Marzo 2026 — CONFIDENCIAL*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
