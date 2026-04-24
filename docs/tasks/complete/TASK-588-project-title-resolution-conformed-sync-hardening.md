# TASK-588 — Project Title Resolution Hardening en Conformed Sync (fix ICO "Sin nombre")

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-588-project-title-resolution-conformed-sync-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El sync canónico de Notion hardcodea la columna `nombre_del_proyecto` como única fuente del título de proyecto. Sky Airline (y cualquier space futuro con la propiedad título nombrada distinto — en Sky se llama `Project name`) pierde el 100% de los títulos, el sync los reemplaza con el placeholder `'Sin nombre'`, y el placeholder contamina `greenhouse_conformed.delivery_projects` (BQ), `greenhouse_delivery.projects` (PG) y por cascada los `ico_engine.ai_signals` — que terminan mostrando señales como _"Proyecto 'Sin nombre' tuvo FTR de tanto"_. Esta task cierra el boquete con una cascada COALESCE determinística en el SELECT del sync, convierte el vacío real en `NULL` visible, agrega alerta en `source_sync_runs` y refuerza los guards del ICO resolver.

## Why This Task Exists

Diagnóstico de 2026-04-24 confirmó con evidencia de tres capas:

1. **Notion (via MCP):** los dos databases Proyectos conectados usan nombres de propiedad `title` distintos — Efeonce usa `"Nombre del proyecto"` y Sky usa `"Project name"`. Es un invariante del modelo Notion (cada database tiene exactamente una property `type: title`), pero su nombre lo decide el cliente.
2. **BQ raw `notion_ops.proyectos`:** el Cloud Run externo `notion-bq-sync` normaliza el nombre de la propiedad a snake_case, así que cada space termina con una columna distinta en una tabla compartida. Evidencia: 78/78 proyectos Sky tienen `nombre_del_proyecto IS NULL` y `project_name` poblada; 65/65 Efeonce tienen lo contrario.
3. **ICO signals en BQ `ico_engine.ai_signals`:** los signals con `dimension='project'` afectados tienen `payloadJson.dimensionLabel = "Sin nombre"` porque el sync conformed hardcodea `|| 'Sin nombre'` como fallback.

El sistema ya tiene infraestructura parcial para este tipo de gap (`greenhouse_delivery.space_property_mappings`, que `scripts/sync-source-runtime-projections.ts:1167` aplica a tareas), pero nunca se cerró para proyectos ni sprints. Además el patrón correcto aquí no es config-por-space sino COALESCE determinístico: en la tabla raw coexisten todas las columnas title candidatas y por cada fila solo una está poblada. No hay ambigüedad que resolver por config.

La deuda tiene tres ejes: (a) el SELECT canónico, (b) el poison `'Sin nombre'` escrito al canónico (que también llega a PG porque `project_name` es NOT NULL en el schema actual), y (c) la falta de observabilidad — hoy el vacío se oculta y no pagina a nadie, sale a la UI como placeholder.

## Goal

- El sync canónico lee el título del proyecto aplicando cascada COALESCE sobre las variantes conocidas de la columna title y jamás inyecta placeholder al canónico.
- `greenhouse_delivery.projects.project_name` (y análogamente `tasks.task_name`, `sprints.sprint_name`) pasan a ser `NULL` cuando el título no se puede resolver, con CHECK constraint que prohíbe escribir sentinels ("Sin nombre", "Sin título", "Untitled", "N/A") al canónico.
- Un rerun del sync y de materialización de ICO para Sky Airline rehidrata los 78 proyectos con sus títulos reales y reemite los signals `dimension='project'` con `dimensionLabel` correcto.
- El resolver del ICO (`entity-display-resolution.ts`, `llm-provider.ts`) rechaza explícitamente los sentinels como label válido, protegiendo signals históricos ya materializados en BQ hasta que sean recomputados.
- Cuando un sync futuro encuentre un proyecto sin título resuelto, escribe un `warning='missing_title_after_coalesce'` en `source_sync_runs` con `space_id`, count y muestra de `notion_page_id`, visible en Ops Health.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- El canónico 360 (`greenhouse_delivery.projects`) NO almacena placeholders de UI. "Desconocido" se representa con `NULL`, nunca con strings como `'Sin nombre'`. Los placeholders son responsabilidad exclusiva de la capa de render.
- El sync canónico debe ser idempotente para spaces ya hidratados: el re-run sobre Efeonce no debe producir cambios (su título sigue resolviendo vía `nombre_del_proyecto`).
- Cualquier cambio en el SELECT del sync conformed tiene que preservar la semántica del staged swap existente (`replaceBigQueryTablesWithStagedSwap` en `src/lib/sync/sync-notion-conformed.ts`).
- Los `*_name` en `greenhouse_delivery.*` pasan a nullable. Todo consumer downstream que hoy hace `row.project_name || 'Proyecto'` ya es tolerante a null (el `||` opera igual sobre `null` y sobre strings truthy) — verificar paths críticos listados en "Files touched downstream".

## Normative Docs

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (para el recovery/rematerialize de ICO signals tras backfill)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (patrón de migraciones SQL-first con `node-pg-migrate`)

## Dependencies & Impact

### Depends on

- `greenhouse_delivery.projects` (PG) — ya existe, schema en `src/types/db.d.ts:2677`
- `greenhouse_delivery.tasks`, `greenhouse_delivery.sprints` (PG) — ya existen
- `greenhouse_conformed.delivery_projects`, `greenhouse_conformed.delivery_tasks`, `greenhouse_conformed.delivery_sprints` (BQ) — ya existen
- `greenhouse_sync.source_sync_runs` (PG) — ya existe
- `notion_ops.proyectos` (BQ) — tabla raw emitida por Cloud Run externo `notion-bq-sync`, **no se toca** (out of scope)
- `ico_engine.ai_signals` (BQ) — se rematerializa, no se migra schema

### Blocks / Impacts

- TASK-585 (Notion BQ Sync Cost Efficiency) — no bloquea, pero comparten el carril Notion. Coordinar no hacer deploys simultáneos.
- TASK-586 (Notion Sync & Billing Export Observability) — esta task agrega warnings a `source_sync_runs` que esa task va a surfacear en Admin Center. Interfaces compatibles.
- ICO engine runtime: los signals afectados se rematerializan en el primer tick scheduler post-deploy. No hay downtime.
- Proyecciones downstream que leen `greenhouse_delivery.projects.project_name` (~50 lugares en `src/**`): todos ya tolerantes a null por el patrón `|| '…'` o `?? '…'`, pero verificar en Discovery con grep canónico.

### Files owned

- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `src/lib/sync/helpers/title-cascade.ts` (nuevo — helper data-driven de cascada + shadow emit)
- `src/lib/ico-engine/ai/entity-display-resolution.ts`
- `src/lib/ico-engine/ai/llm-provider.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `migrations/*_project-title-nullable-sentinel-cleanup.sql` (nueva migración — nombre exacto lo genera `pnpm migrate:create`)
- `src/lib/ico-engine/ai/__tests__/entity-display-resolution.test.ts` (nuevo, si no existe)
- `src/lib/ico-engine/ai/__tests__/resolve-signal-context.test.ts` (extender)
- `src/lib/sync/helpers/__tests__/title-cascade.test.ts` (nuevo)
- `.env.example` (documentar `DELIVERY_TITLE_CASCADE_ENABLED`)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (nota sobre contrato del resolved_title data-driven y el sentinel policy)
- `docs/tasks/in-progress/TASK-588-*.md` (este archivo, durante ejecución)

## Current Repo State

### Already exists

- Sync canónico BQ: `src/lib/sync/sync-notion-conformed.ts` con `replaceBigQueryTablesWithStagedSwap` — línea 968 hardcodea `nombre_del_proyecto`, línea 1062 hace fallback `|| 'Sin nombre'`.
- Sync legacy BQ + writer PG autoritativo: `scripts/sync-source-runtime-projections.ts` — línea 1013 hace el mismo fallback para `project_name`, línea 1120 para `task_name`, línea 1211 para `sprint_name`; INSERT/UPSERT a PG en línea 1301+.
- Resolver ICO: `src/lib/ico-engine/ai/entity-display-resolution.ts` con `isTechnicalProjectIdentifier` (reconoce UUID, hex32, prefix `project-`) y `sanitizeProjectDisplayLabel` (rechaza technical IDs pero acepta "Sin nombre" como label válido).
- LLM enrichment con fallback "este proyecto" cuando no resuelve: `src/lib/ico-engine/ai/llm-provider.ts:74`.
- Materialización con `safeProjectLabel`: `src/lib/ico-engine/ai/materialize-ai-signals.ts:232-242`.
- Patrón de COALESCE ya usado en runtime: `src/lib/capability-queries/creative-hub-runtime.ts:263` (`pickFirstExistingColumn(projectColumns, ['nombre_del_proyecto', 'titulo', 'name'])`).
- Property mappings config table: `greenhouse_delivery.space_property_mappings` (existe, aplicada solo a tareas).
- Infra de `source_sync_runs` y patrón de warnings: ya emite warnings en pipelines existentes [verificar exactamente schema del `warnings` column en Discovery].

### Gap

- El SELECT del sync canónico no resuelve title alternativo — el código asume una sola convención de nomenclatura Notion.
- No existe helper data-driven para construir cascadas de columnas BQ — lo que hay es ad-hoc (`taskColumns.has(...)` en `sync-notion-conformed.ts`). Esta task extrae el patrón a `src/lib/sync/helpers/title-cascade.ts`.
- `greenhouse_delivery.projects.project_name` es NOT NULL en PG ([src/types/db.d.ts:2692](src/types/db.d.ts#L2692) declara `project_name: string;` sin `| null`), lo cual fuerza el placeholder.
- No hay CHECK constraint que prohíba sentinels como `'Sin nombre'` en el canónico.
- `sanitizeProjectDisplayLabel` (línea 55-59) no filtra los sentinels conocidos — "Sin nombre" pasa como label válido y termina en la narrativa del signal.
- No hay telemetría cuando un proyecto queda sin título resuelto — el vacío se oculta con placeholder, no emerge a Ops Health.
- No hay kill-switch ni shadow mode para cambios en el contrato de escritura del canónico: hoy un deploy rompe o arregla, no hay estado intermedio de observar.
- Los 78 proyectos Sky en PG tienen `project_name='Sin nombre'` hoy (verificar count exacto en Discovery con `pnpm pg:connect`).
- Los 4 signals de período 2026-02 con `dimension='project'` en BQ tienen `dimensionLabel='Sin nombre'` en payloadJson.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar aquí)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-04-24 — Discovery + Decisión de simplificación

Supuestos corregidos y decisión de eliminar la feature flag tras auditar el
código real (no cambian el alcance ni criterios de aceptación materiales, sí
la implementación):

**Decisión de simplificación: SE REMUEVE la feature flag `GREENHOUSE_DELIVERY_TITLE_CASCADE_ENABLED`
y el shadow run del Slice 0.**

Razones:
- La cascada es determinística: `COALESCE(nombre_del_proyecto, project_name)`
  solo puede elegir entre dos columnas semánticamente equivalentes (ambas
  son el Notion title property normalizado), no hay escenario "pick incorrecto".
- El CHECK constraint activo post-migración rechaza sentinels por construcción;
  protege mejor que una flag porque actúa a nivel base de datos y no depende de env.
- El canónico `sync-notion-conformed.ts` escribe solo a BQ (sin CHECK); el
  legacy `sync-source-runtime-projections.ts` escribe a PG pero es CLI-only
  (invocado manualmente vía `pnpm sync:source-runtime-projections`, sin cron).
  El CHECK no bloquea operaciones agendadas.
- Rollback = `git revert` + `pnpm migrate:down` si algo se rompe. Protocol
  estándar.
- Shadow mode era para validar "new_value vs legacy_value" pero el cambio ES
  la corrección: para Sky, new_value es el título real, legacy_value es el
  placeholder roto. La divergencia ES lo que queremos.

Otros supuestos ajustados:

1. **Observabilidad**: no existe `source_sync_runs.warnings`. Los warnings se
   emiten a `greenhouse_sync.source_sync_failures` con `retryable=false` y
   `error_code='sync_warning_missing_title'`, usando `writeFailure` (helper
   existente en `scripts/sync-source-runtime-projections.ts:744` y variantes
   en `src/lib/sync/outbox-consumer.ts:88` y `src/lib/nubox/sync-nubox-raw.ts:103`).
   El `payload_json jsonb` lleva `{space_id, count, sample_notion_page_ids}`.
2. **Helper de cascada**: NO crear `src/lib/sync/helpers/title-cascade.ts`.
   El patrón ya existe inline en `sync-notion-conformed.ts:261-286`:
   `readTableColumns` + `buildRawTaskNameExpression`. Extender con
   `buildRawProjectNameExpression` y `buildRawSprintNameExpression` en
   el mismo archivo y replicar el patrón en el script legacy.
3. **Scope asimétrico entre writers**: el canónico `sync-notion-conformed.ts`
   YA resuelve tareas correctamente via `COALESCE(nombre_de_tarea, nombre_de_la_tarea)`.
   Sky usa `nombre_de_la_tarea` y el canónico ya lo captura. Falta cascade
   para projects (columnas reales: `nombre_del_proyecto`, `project_name`) y
   sprints (solo `nombre_del_sprint` confirmada, cascade defensivo).
   El legacy `scripts/sync-source-runtime-projections.ts` NO tiene cascade
   para ninguno → agregar en los tres.

4. **Volumen confirmado para Slice 1 (batch cleanup)**: Sky tiene 3618 tareas
   (3590 con `task_name='Sin nombre'` en PG, escritas por el legacy writer),
   78 proyectos afectados, 0 sprints afectados. El batch cleanup de `tasks`
   es obligatorio.
5. **Freeze window no aplica a signals ICO**: `replaceBigQuerySignalsForPeriod`
   hace DELETE+INSERT sin consultar `period_closure_status`. Slice 5 camino
   único = Path A (invocar `materializeAiSignals` para 2026-02 sin override).

## Scope

### Slice 0 — Kill-switch flag + shadow run del nuevo cascade (gating)

Este slice va PRIMERO, antes de tocar schema o writer. Objetivo: poder activar/desactivar el nuevo contrato de nombre canónico sin migración ni rollback de código.

- Agregar env var `DELIVERY_TITLE_CASCADE_ENABLED` (default `0` en prod hasta que las validaciones staging pasen). Documentar en `.env.example` y en `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`.
- Implementar **shadow mode** dentro de `sync-notion-conformed.ts`: cuando la flag está en `0`, el sync escribe el valor viejo (`nombre_del_proyecto || 'Sin nombre'`) pero adicionalmente computa el valor nuevo (con la cascada data-driven del Slice 2) y lo emite a logs estructurados con shape `{event: 'title_cascade_shadow', space_id, notion_page_id, legacy_value, new_value, diverges: boolean}`.
- Correr el shadow en staging por al menos un ciclo completo de sync (1 cron tick). Analizar logs: confirmar que para Efeonce los dos valores coinciden (no-regression check) y para Sky el valor nuevo es el título real.
- Solo tras ese check pasar `DELIVERY_TITLE_CASCADE_ENABLED=1` en preview, luego staging, luego production (por ambientes, no flip global).
- La flag se retira en un follow-up task tras ~2 semanas estables en prod (documentar como deuda declarada en Follow-ups).

### Slice 1 — Migración PG: nullable + sentinel cleanup batch-safe + CHECK constraints

- `pnpm migrate:create project-title-nullable-sentinel-cleanup` (NUNCA crear el archivo a mano).
- La migración se deploya **antes** que cualquier código del Slice 2 (regla de CLAUDE.md: migración antes del deploy). Incluir nota explícita en el header SQL:
  ```sql
  -- DEPLOY ORDER: esta migración debe aplicarse ANTES de desplegar el código de TASK-588.
  -- El código viejo sigue escribiendo 'Sin nombre' mientras la flag DELIVERY_TITLE_CASCADE_ENABLED=0,
  -- pero el CHECK constraint se agrega SOLO al final para evitar que el writer viejo lo viole durante deploy.
  ```
- Contenido SQL dividido en 3 fases dentro del MISMO archivo de migración, en orden:
  - **Fase 1 — DROP NOT NULL** (instantáneo, sin lock prolongado):
    - `ALTER TABLE greenhouse_delivery.projects ALTER COLUMN project_name DROP NOT NULL`.
    - Idem `tasks.task_name`, `sprints.sprint_name`.
  - **Fase 2 — Cleanup batcheado** para tablas grandes:
    - `projects` tiene ~200 filas: un `UPDATE … SET project_name = NULL WHERE LOWER(TRIM(project_name)) IN (…)` directo es aceptable.
    - `tasks` tiene orden de magnitud más alto (miles de rows): usar patrón batch via `DO $$ LOOP` con `UPDATE … WHERE ctid IN (SELECT ctid FROM greenhouse_delivery.tasks WHERE LOWER(TRIM(task_name)) IN (…) LIMIT 2000) RETURNING 1; EXIT WHEN NOT FOUND; COMMIT; PERFORM pg_sleep(0.1); END LOOP`. Esto evita ACCESS EXCLUSIVE LOCK prolongado y permite que los syncs en curso no se bloqueen.
    - Idem para `sprints` (menor volumen pero aplicar por consistencia).
    - Lista canónica de sentinels (insensible a mayúscula/espacios): `['sin nombre','sin título','sin titulo','untitled','no title','sem nome','n/a']`.
  - **Fase 3 — CHECK constraints** (aplicar solo tras cleanup completo para no violar datos existentes):
    - `ALTER TABLE greenhouse_delivery.projects ADD CONSTRAINT projects_name_no_sentinel_chk CHECK (project_name IS NULL OR (TRIM(project_name) <> '' AND LOWER(TRIM(project_name)) NOT IN ('sin nombre','sin título','sin titulo','untitled','no title','sem nome','n/a')))`.
    - Mismo patrón para `tasks_name_no_sentinel_chk`, `sprints_name_no_sentinel_chk`.
- **DOWN migration** (reverso cleanly):
  - `DROP CONSTRAINT IF EXISTS projects_name_no_sentinel_chk` (idem para tasks, sprints).
  - NO revertir el UPDATE: los valores `'Sin nombre'` se perdieron a propósito y no se reinstalan.
  - NO re-agregar `NOT NULL`: si hay valores `NULL` en la tabla (esperado), el ALTER fallaría. Dejar DROP NOT NULL como destructivo irreversible y documentarlo en el comentario de la migración.
- `pnpm migrate:up` en local con `pnpm pg:connect`, luego `pnpm db:generate-types` para regenerar `src/types/db.d.ts` con los campos `string | null`.
- Commit separado: `feat(migration): make delivery name columns nullable + batch-safe cleanup + no-sentinel constraint`.

### Slice 2 — Cascada COALESCE data-driven + eliminación de placeholder en los dos syncs

Principio: NO hardcodear la lista de columnas candidatas en el SQL. `notion_ops.proyectos` es tabla compartida multi-tenant donde el Cloud Run `notion-bq-sync` agrega columnas dinámicamente. Una cascada `COALESCE(col_a, col_b, …)` con columnas que no existen aún en el dataset produce `Unrecognized name` y tumba el sync completo. La cascada se construye en TypeScript consultando `INFORMATION_SCHEMA.COLUMNS`.

**Helper compartido nuevo** (ubicar en `src/lib/sync/helpers/title-cascade.ts` o extender un helper existente si ya hay uno para introspección de columnas BQ):

```ts
// Conceptual — el nombre real lo define el agente en Discovery
const TITLE_COLUMN_CANDIDATES = ['nombre_del_proyecto','project_name','titulo','title','name','nombre']

async function buildResolvedTitleExpression(
  projectId: string,
  dataset: string,
  table: string,
  candidates: string[]
): Promise<string> {
  const available = await fetchBigQueryColumns(projectId, dataset, table)   // cached by runId
  const applicable = candidates.filter(c => available.has(c))
  if (applicable.length === 0) return 'NULL'
  return `COALESCE(${applicable.map(c => `NULLIF(TRIM(\`${c}\`), '')`).join(', ')})`
}
```

- El patrón ya existe parcialmente en `sync-notion-conformed.ts` con `taskColumns.has(...)` para `tarea_principal_ids` y `subtareas_ids` (condicional por columna disponible). Extender el mismo enfoque.
- Cada tabla raw tiene su propio set de candidatos:
  - `notion_ops.proyectos` → `['nombre_del_proyecto','project_name','titulo','title','name','nombre']`
  - `notion_ops.tareas` → `['nombre_de_tarea','task_name','titulo','title','name','nombre']`
  - `notion_ops.sprints` → `['nombre_del_sprint','sprint_name','titulo','title','name','nombre']`
- Los sets canónicos viven en una constante exportada. Si un espacio nuevo exige un nombre fuera del set, el warning del Slice 3 lo visibiliza y la remediación es un PR de 1 línea al set (declarado en Follow-ups).

**En `src/lib/sync/sync-notion-conformed.ts`:**

- Antes del SELECT de línea 968, llamar `buildResolvedTitleExpression(projectId, 'notion_ops', 'proyectos', PROJECT_TITLE_CANDIDATES)` y usar el resultado en el SELECT como `${resolvedTitleExpr} AS resolved_title`.
- Extender el `interface NotionProjectRow` (línea 69) agregando `resolved_title: string | null`.
- En línea 1062, si `DELIVERY_TITLE_CASCADE_ENABLED === '1'` usar `toNullableString(row.resolved_title)`, si no, conservar el legacy `toNullableString(row.nombre_del_proyecto) || 'Sin nombre'` — este toggle es el feature flag del Slice 0.
- Aplicar el MISMO patrón para tasks (línea 1130) y sprints (línea 1245).
- Cuando la flag está en `0` pero `resolved_title` está disponible, emitir el shadow log del Slice 0 por cada row antes de escribir el valor legacy.

**En `scripts/sync-source-runtime-projections.ts`:**

- Mismo patrón data-driven en los `.map` de projects (línea 989-1031), tasks (línea 1080-1177), sprints (línea 1197-1225). Si la lectura ya no tiene `resolved_title` computada (porque el SELECT previo no lo trae), hacer la cascada en JS aplicando `firstNonEmpty([row.nombre_del_proyecto, row.project_name, row.titulo, …])`.
- Cambiar los 3 `|| 'Sin nombre'` por null (gated por la flag también).
- El INSERT/UPSERT a PG post-migración acepta null.

**Criterio de diseño:** el canónico jamás escribe string placeholder. Si después de la cascada el título sigue siendo null, eso refleja un hecho real (page Notion vacía o nueva convención de columna no contemplada) y se propaga con null + warning del Slice 3.

### Slice 3 — Observability: warning en source_sync_runs + Ops Health surface

- Tras construir `deliveryProjects`/`deliveryTasks`/`deliverySprints`, contar los rows con `resolved_title === null` agrupados por `space_id`.
- Si count > 0, emitir un warning estructurado en `source_sync_runs` con shape:
  ```json
  {
    "code": "missing_title_after_coalesce",
    "surface": "delivery_projects|delivery_tasks|delivery_sprints",
    "space_id": "spc-xxx",
    "count": 4,
    "sample_notion_page_ids": ["page-1","page-2","page-3"]
  }
  ```
- Verificar si `source_sync_runs` tiene columna `warnings jsonb[]` o similar en Discovery y usar el helper existente si hay uno; crear helper `emitSyncWarning(runId, warning)` si no existe.
- Surface mínimo en Ops Health: reusar el badge existente de "Source Sync" en Admin → Ops Health que ya lista `source_sync_runs` recientes; agregar expander de warnings count o link a filtrar por code. Si este surface ya está cubierto por TASK-586 (Notion Sync & Billing Export Observability), dejar solo la emisión del warning y coordinar con la task owner.
- Regla: un space con ≥1 proyecto sin título resuelto después de esta task no debe poder considerarse "sano" en Ops Health.

### Slice 4 — Resolver hardening (defensa en profundidad ICO)

- `src/lib/ico-engine/ai/entity-display-resolution.ts`:
  - Agregar constante `PROJECT_DISPLAY_SENTINELS = new Set(['sin nombre','sin título','sin titulo','untitled','n/a'])`.
  - Extender `sanitizeProjectDisplayLabel` (línea 55-59) para devolver null también si `normalized.toLowerCase() IN PROJECT_DISPLAY_SENTINELS`.
  - Extender `isTechnicalProjectIdentifier` para reconocer también: strings puramente numéricos de longitud ≥12 (IDs HubSpot), prefijos `notion-`, `proj-`, `task-`. Opcional — bajo cambio de fidelidad si ya no llegan technical IDs al narrativo tras el fix de sync, pero útil como red de seguridad para signals históricos en BQ no recomputados.
- `src/lib/ico-engine/ai/llm-provider.ts`:
  - Línea 74 (`projectName ?? 'este proyecto'`): si `projectName` cae dentro de los sentinels, forzar el fallback también. Encapsular la lógica en un helper `safeResolvedLabel(raw)` que centralice la decisión.
- `src/lib/ico-engine/ai/materialize-ai-signals.ts:232-242`:
  - Reforzar `safeProjectLabel` para consultar el mismo helper que `llm-provider.ts`.

### Slice 5 — Backfill y rematerialización verificada (con decisión explícita sobre freeze window)

- Disparar sync Notion manualmente para Sky desde el endpoint canónico (`/api/cron/notion-sync` o equivalente — confirmar en Discovery) con `space_id=spc-ae463d9f…`, con ambiente preview o staging primero.
- Validar que `greenhouse_conformed.delivery_projects` en BQ y `greenhouse_delivery.projects` en PG ahora tienen `project_name` poblado para los 78 proyectos Sky.
- **DECISIÓN OBLIGATORIA EN DISCOVERY — freeze window del período 2026-02**:
  - Consultar `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` y el estado real de `scripts/freeze-delivery-performance-period.ts` / `scripts/reconcile-delivery-performance-history.ts`.
  - Consultar la tabla de freeze relevante (`greenhouse_sync.period_closure_status` u similar — confirmar) para determinar si 2026-02 está frozen para Sky.
  - Elegir uno de los dos paths y declarar cuál se aplicó:
    - **Path A (no frozen o override disponible)** — invocar el entrypoint canónico de materialize ICO para período 2026-02. Si hay admin command de override/force (ej. `reconcile-delivery-performance-history --space=spc-ae… --period=2026-02 --force`) usarlo tras confirmar con ownership. Validar post-rematerialización que los 4 signals de 2026-02 tienen `dimensionLabel` humano.
    - **Path B (frozen y override no disponible o no autorizado)** — aceptar que los signals históricos de 2026-02 quedan con poison en `payloadJson.dimensionLabel`. En este escenario el Slice 4 (guards del resolver) pasa de "defensa en profundidad" a "el único filtro que protege la UI" — el sanitizer rechaza el sentinel y la UI muestra el fallback humano "este proyecto" o sintetizado con client name. Los signals de período 2026-04+ (a partir del próximo materialize scheduler) nacen limpios porque el canónico ya está corregido. Documentar esta decisión en `Handoff.md` con la ventana de períodos afectados.
- UI check: navegar en staging (con `pnpm staging:request` + agent auth) al surface ICO donde aparecen signals del space Sky y verificar que el texto muestra títulos humanos o el fallback "este proyecto" — NUNCA "Sin nombre" ni ID crudo — dependiendo del path (A o B).
- Promover a producción tras validación staging.

### Slice 6 — Tests

- Nuevo test `src/lib/ico-engine/ai/__tests__/entity-display-resolution.test.ts`:
  - `isTechnicalProjectIdentifier` rechaza UUID, hex32, prefijo `project-`, numérico largo ≥12 dígitos, prefijos `notion-` / `proj-`; acepta texto humano.
  - `sanitizeProjectDisplayLabel` rechaza `'Sin nombre'`, `'Sin título'`, `'untitled'`, `'N/A'` (todos case-insensitive), technical IDs, string vacío; acepta texto humano.
- Extender `src/lib/ico-engine/ai/__tests__/resolve-signal-context.test.ts`:
  - Escenario nuevo: `greenhouse_delivery.projects` devuelve row con `project_name=null` → `getResolvedProjectLabel` devuelve null, no el raw ID.
  - Escenario nuevo: `project_name='Sin nombre'` (poison histórico en BQ antes de backfill completo) → `getResolvedProjectLabel` devuelve null.
- Test del helper de sync cascade: dado un row con `nombre_del_proyecto=null, project_name='X'`, el `resolved_title` transformado debe ser `'X'`. Dado row con ambos null, `resolved_title` es null.
- Test del warning emit en `source_sync_runs`: si hay rows sin title resuelto, el run registra un warning con shape correcto.

## Out of Scope

- **NO se toca el Cloud Run externo `notion-bq-sync`** (repo separado `/tmp/notion-bigquery`). La tabla raw `notion_ops.proyectos` queda exactamente como está.
- **NO se agrega entries a `greenhouse_delivery.space_property_mappings` para resolver el title por space.** La cascada COALESCE es suficiente y no requiere config por tenant.
- **NO se implementa propagación retroactiva de los títulos a BQ `ico_engine.ai_signals` históricos fuera del período 2026-02.** Los periodos más antiguos ya están frozen por el playbook de materialization; si aparece una demanda futura de rewrite histórico, se hace en task derivada.
- **NO se extiende el scope de project identity** (creación de proyectos fuera de Notion, HubSpot-born projects): esta task asume que todos los proyectos válidos tienen row en `notion_ops.proyectos`. Proyectos huérfanos (sin row en raw Notion) son un problema distinto y out of scope.
- **NO se cambia el schema de `greenhouse_conformed.delivery_*` en BQ** a nullable — BQ ya permite null en string columns; el cambio de schema solo aplica en PG.
- **NO se agrega UI nueva para "ver proyectos sin título"** en Admin. El warning en `source_sync_runs` es suficiente. TASK-586 puede consumirlo.
- **NO se modifica el `ico-batch` service ni el cron scheduler** — la materialización usa el entrypoint existente.

## Detailed Spec

### Flujo actual (roto)

```
Notion DB Sky Proyectos (title prop = "Project name")
       │
       ▼
Cloud Run notion-bq-sync (force_string=True, normaliza a snake_case)
       │
       ▼
BQ notion_ops.proyectos  ← tabla compartida con columnas de TODOS los spaces
       │ space Efeonce row: nombre_del_proyecto='…', project_name=NULL
       │ space Sky     row: nombre_del_proyecto=NULL,  project_name='…'
       ▼
sync-notion-conformed.ts SELECT nombre_del_proyecto   ← lee SOLO esta columna
       │  Sky → NULL siempre
       ▼
deliveryProjects.project_name = nombre_del_proyecto || 'Sin nombre'   ← poison
       │
       ▼
BQ greenhouse_conformed.delivery_projects  + PG greenhouse_delivery.projects
       │ Sky projects: project_name='Sin nombre'
       ▼
ICO materialize-ai-signals.ts   ← lee project_source_id, JOIN con PG para label
       │ resolveProjectDisplayBatch devuelve 'Sin nombre' (sanitizer no lo rechaza)
       ▼
payloadJson.dimensionLabel = 'Sin nombre'   ← llega al LLM y a la UI
```

### Flujo post-fix

```
Notion DB Sky Proyectos
       │
       ▼
Cloud Run notion-bq-sync  (sin cambios)
       │
       ▼
BQ notion_ops.proyectos   (sin cambios)
       │
       ▼
sync-notion-conformed.ts SELECT COALESCE(nombre_del_proyecto, project_name, titulo, title, name) AS resolved_title
       │  Efeonce → 'Nombre del proyecto value'
       │  Sky     → 'Project name value'
       │  vacío real → NULL
       ▼
deliveryProjects.project_name = resolved_title   (null-safe, sin placeholder)
       │
       ▼
PG + BQ canonical   CHECK constraint rechaza sentinels
       │
       ▼  si resolved_title es NULL → emit warning en source_sync_runs
       │
       ▼
ICO resolver   sanitizer rechaza sentinels históricos como fallback defensivo
       │
       ▼
UI muestra título real o degradación controlada ("este proyecto")
```

### Consumers downstream del campo `project_name` (revisar tolerancia a null)

Locations detectadas en grep (non-exhaustive — confirmar en Discovery):

- `src/lib/projects/get-project-detail.ts:316` — `COALESCE(dp.project_name, p.nombre_del_proyecto, requested_project.notion_page_id) AS project_name` ✓ tolerante
- `src/lib/projects/get-projects-overview.ts:181` — `row.project_name || row.notion_page_id || 'Unnamed project'` ✓ tolerante
- `src/lib/account-360/facets/delivery.ts:109` — SELECT sin coerce ✓ tolerante en el shape TS (ya había casos null de historia)
- `src/lib/person-360/facets/delivery.ts:110` — `name: r.project_name` — **revisar** si null rompe la vista; si sí, agregar `|| 'Proyecto sin título'` en el render (UI-only placeholder)
- `src/lib/admin/get-admin-user-detail.ts:236` — `ORDER BY COALESCE(dp.project_name, ups.project_id)` ✓ tolerante
- `src/lib/admin/get-admin-tenant-detail.ts:340` — `projectName: String(row.project_name || row.project_id || '')` ✓ tolerante
- `src/lib/capability-queries/shared.ts:419` — `row.project_name || row.project_id || 'Proyecto sin nombre'` ✓ tolerante (**atención** al literal — revisar si hay que cambiarlo a algo menos confuso con el sentinel eliminado)
- `src/app/api/analytics/delivery/route.ts:93` — `projectName: String(r.project_name || 'Proyecto')` ✓ tolerante
- `src/app/api/reviews/queue/route.ts:107` — `projectName: r.project_name || 'Proyecto'` ✓ tolerante

Patrón general: ~50 lugares usan `|| 'X'` o `?? 'X'`, todos tolerantes a null. El único riesgo real es SELECT sin coerce en TSX/JS que `undefined` el prop y rompe un `.trim()` o similar — buscar con grep `project_name\.` y `projectName\.`.

### Ejemplo real para validar post-fix (Sky)

Sample esperado tras backfill:

| notion_page_id | pre-fix project_name | post-fix project_name |
|---|---|---|
| `10c15729-e9fd-497b-8411-fb72b7af580f` | `'Sin nombre'` | `'TEASER TS - Chile (S)'` |
| `20dd5c6f-9156-40e0-a99f-d0f3837f847a` | `'Sin nombre'` | `'72 HR LOCURA - Chile (M)'` |
| `23d42e0b-6eef-4276-adf7-712a336905b0` | `'Sin nombre'` | `'TRAVEL SALE - Chile (L)'` |
| `24839c2f-efe7-801b-99b8-d7a3359c436a` | `'Sin nombre'` | `'Travel Sale CL'` |
| `24d39c2f-efe7-80d4-9777-e753450f18f7` | `'Sin nombre'` | `'Travel Sale AR'` |

(Datos extraídos de `bq query` sobre `notion_ops.proyectos` el 2026-04-24 — ver sección "Evidence snapshots" en Discovery.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Flag `DELIVERY_TITLE_CASCADE_ENABLED` documentada en `.env.example` y leída por ambos syncs.
- [ ] Shadow run corrido en staging por al menos 1 ciclo; logs `title_cascade_shadow` muestran `diverges: false` para Efeonce y `diverges: true` con `new_value` = título real para Sky.
- [ ] `pnpm migrate:status` muestra la migración `*_project-title-nullable-sentinel-cleanup` aplicada.
- [ ] La migración NO rompe durante apply: el UPDATE de `tasks` completa en batches sin ACCESS EXCLUSIVE LOCK prolongado (verificar con `pg_stat_activity` durante la corrida o por log de duración).
- [ ] `src/types/db.d.ts` refleja `project_name: string | null`, `task_name: string | null`, `sprint_name: string | null` en `GreenhouseDeliveryProjects/Tasks/Sprints`.
- [ ] Query PG `SELECT COUNT(*) FROM greenhouse_delivery.projects WHERE project_name IN ('Sin nombre','sin nombre','Untitled','N/A')` devuelve 0 tras la migración. Idem para `tasks` y `sprints`.
- [ ] Insertar manualmente `INSERT INTO greenhouse_delivery.projects (…, project_name, …) VALUES (…, 'Sin nombre', …)` falla con el CHECK constraint.
- [ ] La cascada de título en ambos syncs es **data-driven** (construida a partir de `INFORMATION_SCHEMA.COLUMNS`), no hardcoded en el SQL — verificable por inspección de código.
- [ ] Simular dataset BQ sin columna `titulo` (o con cualquier candidato faltante): el sync NO falla con `Unrecognized name`, solo omite esa columna de la cascada.
- [ ] `src/lib/sync/sync-notion-conformed.ts` con flag en `1` no asigna el literal `'Sin nombre'` a `project_name`, `task_name` ni `sprint_name`.
- [ ] `scripts/sync-source-runtime-projections.ts` igual — cero ocurrencias del literal como fallback cuando la flag está activa.
- [ ] Tras rerun del sync Notion sobre `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9` (con flag en `1`), query PG `SELECT COUNT(*) FROM greenhouse_delivery.projects WHERE space_id = 'spc-ae463d9f…' AND project_name IS NULL AND active AND NOT is_deleted` devuelve 0.
- [ ] Tras rerun del sync sobre `spc-c0cf6478…` (Efeonce — no-regression check), los 65 proyectos conservan su título idéntico al pre-fix.
- [ ] Tras rerun del sync, query BQ `SELECT COUNT(*) FROM greenhouse_conformed.delivery_projects WHERE space_id = 'spc-ae463d9f…' AND (project_name IS NULL OR TRIM(project_name) = '' OR project_name = 'Sin nombre')` devuelve 0.
- [ ] Path del Slice 5 sobre período 2026-02 declarado explícitamente (A o B) en `Handoff.md`. Si Path A: query BQ `SELECT payload_json FROM ico_engine.ai_signals WHERE dimension = 'project' AND period_year = 2026 AND period_month = 2` NO contiene `"Sin nombre"` en ningún `dimensionLabel`. Si Path B: el Slice 4 (guards) queda verificado para que la UI no muestre el sentinel igual.
- [ ] `sanitizeProjectDisplayLabel('Sin nombre')` devuelve null; `sanitizeProjectDisplayLabel('SIN NOMBRE')` devuelve null (case-insensitive); `sanitizeProjectDisplayLabel('Sem nome')` devuelve null; `sanitizeProjectDisplayLabel('TEASER TS')` devuelve `'TEASER TS'`.
- [ ] `source_sync_runs` del último run canónico para Sky muestra cero warnings `missing_title_after_coalesce` porque todos los títulos resolvieron.
- [ ] Corrida manual del sync con una page Notion test deliberadamente sin título resulta en `source_sync_runs` conteniendo exactamente un warning `{code: 'missing_title_after_coalesce', space_id, count: 1, sample_notion_page_ids: […]}`.
- [ ] UI staging (verificado con agent auth + `pnpm staging:request` o navegación directa con SSO bypass) muestra títulos reales o fallback humano "este proyecto" en los signals ICO de Sky — nunca "Sin nombre" ni IDs crudos.
- [ ] Los tests nuevos/extendidos en Slice 6 corren verdes (`pnpm test` pasa al menos sobre `src/lib/ico-engine/ai` y el helper nuevo `src/lib/sync/helpers/title-cascade`).

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm migrate:status` + inspección en `pnpm pg:connect:shell`
- Validación manual staging: rerun sync Sky + materialize ICO + navegación a `/analytics/delivery` o surface ICO correspondiente del space Sky con credenciales válidas; contrastar con Notion MCP para ≥3 proyectos que el título mostrado coincida con el título de la página.
- Validación BQ post-fix: 3 queries de los Acceptance Criteria (conformed sin poison, delivery sin null para active, signals sin sentinel en dimensionLabel).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` sincronizado con el cierre.
- [ ] `Handoff.md` actualizado con el fix, el rerun, y cualquier rastro residual en `source_sync_runs`.
- [ ] `changelog.md` actualizado (cambio de schema PG + semántica de nombre resolvable + warning nuevo).
- [ ] chequeo de impacto cruzado ejecutado sobre TASK-585, TASK-586, y cualquier task en `to-do/` que toque `greenhouse_delivery.projects` o `sync-notion-conformed.ts`.

- [ ] Documentación funcional actualizada en `docs/documentation/` si hay un doc existente para delivery / ICO signals que mencione "Sin nombre" o placeholder de título.
- [ ] Referenciar la evidencia del diagnóstico (Sky 78/78, Efeonce 65/65) como nota breve en `Handoff.md` para que futuras tasks sepan por qué la cascada COALESCE es el contrato.

## Follow-ups

- **Retirar la flag `DELIVERY_TITLE_CASCADE_ENABLED`** tras ~2 semanas estables en producción. Tarea derivada: eliminar el gating, borrar la rama legacy del código, actualizar docs. Convertir en PR directo si no amerita task formal (policy de doc-only a develop).
- Si aparece un space nuevo con una propiedad título fuera del set canónico (`nombre_del_proyecto`, `project_name`, `titulo`, `title`, `name`, `nombre`), el warning `missing_title_after_coalesce` lo expone. Remediación trivial: agregar al set. Política de handling: PR directo a develop si el agregado es ≤1 nombre; task formal si hay ≥3 (patrón emergente que merece revisión).
- Evaluar extender el CHECK constraint a lista de sentinels **extensible via tabla** (`greenhouse_delivery.reserved_name_sentinels`) si aparecen más placeholders en el ecosistema (portugués, inglés, francés). Trade-off: tabla agrega lookup overhead vs. inflexibilidad del hardcoded. Decidir con data real tras 1 trimestre.
- Evaluar si la misma cascada data-driven aplica a otras propiedades del proyecto con varianza por space (`estado`, `resumen`, `prioridad`). En Notion Sky mostró `Estado`, `Prioridad`, `Resumen` con mismos nombres que Efeonce, pero no es garantía. Tarea candidata: "Property resolution audit full-width" (P3).
- Integrar con TASK-586 (Admin Center observability de Notion sync): el surface del warning puede necesitar refinamiento de UI para drill-down al `notion_page_id` sample con link directo a Notion.
- Considerar agregar validación en `scripts/notion-schema-discovery.ts` y en el flujo de `notion-governance.ts` que alerte durante onboarding si la property title del space nuevo tiene nombre fuera del set canónico — así el warning no aparece primero en runtime sino en el pipeline de setup.
- Si Path B se aplicó en Slice 5 (signals 2026-02 no rematerializados), planificar un "historical signal narrative cleanup" como task P3 para cuando aparezca necesidad de reporting limpio sobre ese período.

## Open Questions

- ¿El entrypoint de "rerun manual del sync Notion" canónico está expuesto en una ruta admin hoy, o es solo vía cron trigger? Necesario para Slice 5 — confirmar en Discovery si hay `/api/admin/sync/notion?space_id=…` o solo reejecutar el scheduler job.
- ¿`source_sync_runs.warnings` es columna `jsonb`, `jsonb[]`, o se modelan en tabla hija? El shape del emit debe matchear la convención del repo. Confirmar en Discovery leyendo schema PG y patrón de consumers.
- ¿El `ico-batch` service tiene un endpoint de "recompute period" expuesto, o la rematerialización del período 2026-02 requiere invocar directamente el trigger de `reactive-consumer.ts` / `replaceBigQuerySignalsForPeriod`? Confirmar en Discovery leyendo `services/ico-batch/` y `/api/cron/ico-*`.
- ¿Cuál es el umbral real de filas en `greenhouse_delivery.tasks` con `task_name='Sin nombre'`? Si es <5k, el UPDATE directo es aceptable; si es ≥10k, batcheo obligatorio. Confirmar count exacto en Discovery antes de escribir la migración.
- ¿Hay `source_sync_runs` o equivalente que ya agrupa warnings con structured shape hoy? Si sí, reusarlo; si no, proponer shape mínimo viable y coordinar con TASK-586 que consume.
