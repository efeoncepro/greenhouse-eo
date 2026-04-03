# TASK-205 - Delivery Notion Origin Parity Audit

## Delta 2026-04-03 — Task closure

- `TASK-205` queda cerrada como lane de auditoría reusable, no como hardening del pipeline.
- Implementación entregada:
  - helper reusable `src/lib/space-notion/notion-parity-audit.ts`
  - route admin `GET /api/admin/tenants/[id]/notion-parity-audit`
  - script `pnpm audit:notion-delivery-parity --space-id=... --assignee-source-id=... --year=2026 --month=4 --period-field=due_date|created_at`
  - tests unitarios `src/lib/space-notion/notion-parity-audit.test.ts`
- Verificación real ejecutada contra datos vivos:
  - `Daniela / due_date / Abril 2026`
    - `Sky Airline`: `raw 56` vs `conformed 50`
    - `Efeonce`: `raw 24` vs `conformed 23`
  - `Andrés / due_date / Abril 2026`
    - `Sky Airline`: `raw 6` vs `conformed 4`
    - `Efeonce`: `raw 7` vs `conformed 6`
    - total: `raw 13` vs `conformed 10`
  - `Andrés / created_at / Abril 2026`
    - `Sky Airline`: `raw 8` vs `conformed 0`
    - `Efeonce`: `raw 1` vs `conformed 1`
    - total: `raw 9` vs `conformed 1`
- Buckets confirmados por el auditor:
  - `missing_in_conformed`
  - `status_mismatch`
  - `due_date_mismatch`
  - `fresh_raw_after_conformed_sync`
  - `hierarchy_gap_candidate`
- Handoff explícito:
  - el fix estructural permanece en `TASK-207`
  - el monitoreo recurrente queda para `TASK-208`

## Delta 2026-04-03 — Spec correction after repo audit

- `TASK-205` pasa a `in-progress`.
- Corrección de realidad operativa:
  - el repo sí conserva dos writers hacia `greenhouse_conformed.delivery_tasks`
  - pero no están hoy en el mismo nivel de activación
  - carril runtime activo:
    - `src/lib/sync/sync-notion-conformed.ts`
    - invocado por `GET /api/cron/sync-conformed`
  - carril legacy/manual todavía ejecutable:
    - `scripts/sync-source-runtime-projections.ts`
    - expuesto en `package.json` como `pnpm sync:source-runtime-projections`
- Implicación:
  - el riesgo actual no es solo “dos crons corriendo”
  - también es drift reintroducible por carril manual/seed con lógica distinta y capacidad de reescribir `greenhouse_conformed.delivery_tasks`
- Corrección de contrato local:
  - la hipótesis de jerarquía `task/subtask` sigue siendo válida
  - pero el repo no versiona hoy esa jerarquía en el contrato local de `greenhouse_conformed.delivery_tasks`
  - ni `src/lib/sync/sync-notion-conformed.ts`
  - ni `scripts/sync-source-runtime-projections.ts`
  - ni `scripts/setup-bigquery-source-sync.sql`
    preservan hoy `tarea_principal_ids` o `subtareas_ids` en conformed
- Implicación:
  - implementar jerarquía en esta lane no es “solo proyectar un campo ya modelado”
  - requiere explicitar primero el contrato aditivo local y su impacto downstream
- Aclaración adicional:
  - parte de la documentación viva del repo todavía habla de la capa conformed como `config-driven` vía `space_property_mappings`
  - el cron runtime actual no usa esa tabla como source of truth principal
  - la task debe seguir la realidad del runtime vigente, no el wording legacy de esos docs

## Delta 2026-04-03

- Orden de implementación explícito dentro de la secuencia Notion native integration:
  - `TASK-205` va primero
  - `TASK-207` va después
  - `TASK-208` va al final
- Justificación:
  - primero cerrar evidencia y buckets reales de drift contra origen
  - después endurecer el pipeline que produce ese drift
  - y recién entonces automatizar monitoreo continuo sobre un contrato ya entendido y corregido
- Re-encuadre explícito:
  - esta lane ya no debe leerse como un carril separado de Delivery
  - queda absorbida como hardening específico de la integración nativa de `Notion` dentro de Greenhouse
  - su marco shared/control plane sigue siendo `TASK-188` y su primera implementación fuerte en Notion sigue siendo `TASK-187`
- Implicación:
  - la auditoría de paridad contra origen pasa a ser parte del contrato nativo de confiabilidad de la integración `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - cualquier fix posterior debe vivir dentro de esa arquitectura, no como bypass paralelo
- Verificación explícita de estatus ya completada para `Efeonce` y `Sky Airline`.
- Resultado:
  - `Efeonce` usa propiedad `Estado` tipo `status`
  - `Sky Airline` usa propiedad `Estado 1` tipo `status`
  - `sync-notion-conformed.ts` sí contempla ambas variantes mediante `COALESCE(estado, estado_1)`
- Hallazgo importante:
  - `Notion directo` y `notion_ops.tareas` coinciden exactamente en distribución de estatus para ambos spaces
  - por lo tanto, el problema no está en leer `Estado` o `Estado 1`
  - el drift nace después, entre `notion_ops.tareas` y `greenhouse_conformed.delivery_tasks`
- Distribución confirmada `Notion directo = raw`:
  - `Efeonce` (`1222`):
    - `Listo 868`
    - `Sin empezar 141`
    - `Archivadas 135`
    - `En curso 20`
    - `Detenido 17`
    - `Cancelada 14`
    - `Cambios Solicitados 9`
    - `Listo para revisión 9`
    - `Pendiente Dir. Arte 4`
    - `Listo para diseñar 3`
    - `Bloqueado 2`
  - `Sky Airline` (`3103`):
    - `Aprobado 2452`
    - `Sin empezar 428`
    - `Tomado 97`
    - `Listo para revisión 73`
    - `Pendiente 25`
    - `En curso 14`
    - `Archivado 9`
    - `Bloqueado 5`
- Drift `raw vs conformed` ya cuantificado:
  - `Efeonce`: casi paridad total, con principal swap entre `Listo (-7)` y `Sin empezar (+7)`
  - `Sky Airline`: drift material, principalmente:
    - `Sin empezar: 428 -> 357` (`-71`)
    - `Aprobado: 2452 -> 2463` (`+11`)
    - `Listo para revisión: 73 -> 68` (`-5`)
    - `En curso: 14 -> 16` (`+2`)
- Bucket específico auditado sobre `Sky / Sin empezar`:
  - `428` tareas en raw
  - `348` quedan iguales en conformed
  - `62` desaparecen por completo en conformed
  - `18` mutan de `Sin empezar` a `Aprobado`
- Patrón de las `62` faltantes:
  - mayoría creadas el `2026-04-02T11:44:00.000Z`
  - muchas son padres o subtareas con `tarea_principal_ids` o `subtareas_ids` poblados
  - ejemplos:
    - `Prom perú (4)`
    - `YT`
    - `PPLA GIF`
    - `FLN (10)`
    - `Brasil (7)`
    - `UY (3)`
    - `Argentina (7)`
- Patrón de las `18` mutadas a `Aprobado`:
  - corresponden a tareas antiguas de enero 2026
  - en raw hoy siguen figurando como `Sin empezar`
  - en conformed aparecen como `Aprobado`
  - ejemplos:
    - `HPH`
    - `PPLA GIF`
    - `STORY`
    - `YT`
- Auditoría de writer/mapping ya completada:
  - `greenhouse_delivery.space_property_mappings` hoy tiene `0` filas
  - no existen overrides activos de `task_status`, `due_date` o `assignee_source_id` para `Sky` ni `Efeonce`
  - por lo tanto, el drift actual no viene de config-driven mappings
- Evidencia fuerte de desfase de pipeline:
  - las filas raw problemáticas en `Sky` traen `_synced_at = 2026-04-03T06:01:53.473592Z`
  - las filas conformed comparadas contra ellas traen `synced_at = 2026-04-03T03:45:21.802Z`
  - esto indica que `greenhouse_conformed.delivery_tasks` fue materializado antes de que el raw de Notion terminara de refrescarse
- Hallazgo adicional sobre readiness:
  - la route `GET /api/cron/sync-conformed` sí llama `checkIntegrationReadiness('notion')`
  - pero esa readiness hoy se apoya en `greenhouse_core.space_notion_sources.last_synced_at` y health general
  - no valida explícitamente que `notion_ops.tareas` ya haya recibido el batch fresco del día
- Conclusión provisional más fuerte:
  - el bucket `62 missing + 18 mutated` en `Sky / Sin empezar` apunta más a un problema de orden/frescura del pipeline que a un problema de lectura de estatus o mapping por space
- Auditoría de pipeline ya completada sobre el tramo `Notion -> notion_ops.tareas -> greenhouse_conformed.delivery_tasks`.
- Hallazgo estructural principal:
  - las tareas auditadas sí existen en `notion_ops.tareas`
  - la inconsistencia nace después, en la proyección hacia `greenhouse_conformed.delivery_tasks`
- Hallazgo estructural adicional:
  - hoy existen dos writers distintos hacia `greenhouse_conformed.delivery_tasks`:
    - `src/lib/sync/sync-notion-conformed.ts`
    - `scripts/sync-source-runtime-projections.ts`
  - esto deja la paridad expuesta a drift por duplicidad de lógica y `last writer wins`
- Hallazgo específico de jerarquía:
  - `notion_ops.tareas` ya preserva:
    - `subtareas`
    - `subtareas_ids`
    - `tarea_principal`
    - `tarea_principal_ids`
  - ninguno de los dos writers lo proyecta hoy a `delivery_tasks`
- Hallazgo específico de integridad:
  - existen tareas presentes en raw pero ausentes en `delivery_tasks`
  - existen tareas presentes en ambos lados pero con drift de:
    - `assignee`
    - `due_date`
    - `task_status`
- Se amplió la reconciliación contra origen más allá de `Daniela / Abril 2026` y ya existe un segundo caso confirmado con `Andrés Carlosama / Abril 2026`.
- Resultado `Andrés / due_date en abril 2026`:
  - `Notion`: `13`
  - `Greenhouse`: `10`
  - drift: `-3`
- Resultado `Andrés / created_at en abril 2026`:
  - `Notion`: `9`
  - `Greenhouse`: `1`
  - drift: `-8`
- Diff explícito `Notion only` para `Andrés / due_april`:
  - `Generar Banco de poses + expresiones` (`Efeonce`, due `2026-04-10`)
  - `HM Argentina - Diseños Nuevos` (`Sky Airline`, due `2026-04-07`)
  - `Shopping Story` (`Sky Airline`, due `2026-04-07`)
- Diff explícito `Notion only` para `Andrés / created_april`:
  - `8` tareas en `Sky Airline`, todas creadas el `2026-04-02T11:44:00.000Z`
  - varias llegan con `due_date = null`
  - títulos observados:
    - `UY (3)`
    - `Argentina (7)`
    - `YT` (múltiples)
    - `Brasil (7)`
- Insight nuevo a auditar:
  - Notion distingue entre tareas normales y `subitems` / subtareas
  - es una inferencia razonable que parte del drift venga de cómo Greenhouse está ingiriendo, filtrando o colapsando subitems frente a tareas principales
  - esta hipótesis debe verificarse explícitamente en el pipeline antes de seguir atribuyendo el gap solo a `created_at` o `due_date`
- Verificación adicional ya hecha sobre esa hipótesis:
  - `Notion` sí maneja jerarquía explícita en ambos teamspaces mediante `Subtareas` y `Tarea principal`
  - `notion_ops.tareas` ya preserva esa semántica en:
    - `subtareas`
    - `subtareas_ids`
    - `tarea_principal`
    - `tarea_principal_ids`
  - `sync-notion-conformed.ts` hoy no selecciona ni proyecta esos campos hacia `greenhouse_conformed.delivery_tasks`
  - conclusión parcial:
    - en `Sky Airline`, la jerarquía de subtareas sí es una causa probable relevante del drift
    - en `Efeonce`, no explica por sí sola los casos faltantes auditados
- Ejemplos concretos de `Sky Airline` donde sí existe jerarquía padre-hijo:
  - `HM Argentina - Diseños Nuevos`
    - tiene `Subtareas`, entre ellas `Shopping Story`
  - `Shopping Story`
    - tiene `Tarea principal = HM Argentina - Diseños Nuevos`
  - varios faltantes creados el `2026-04-02T11:44:00.000Z`
    - `UY (3)`
    - `Argentina (7)`
    - múltiples `YT`
    - `Brasil (7)`
    - varios de ellos traen `Tarea principal` o `Subtareas` pobladas
- Ejemplos concretos de `Efeonce` donde la hipótesis no aplica:
  - `Crear Post Expectativa RDG`
  - `Generar Banco de poses + expresiones`
  - ambos aparecen como tareas normales:
    - `Subtareas = []`
    - `Tarea principal = []`
- Hallazgo adicional:
  - parte del drift no es solo “fila faltante”
  - algunas tareas auditadas sí existen en `greenhouse_conformed.delivery_tasks`, pero con drift de campos mutables respecto a Notion actual:
    - responsable distinto
    - `due_date` distinta
  - ejemplos auditados:
    - `HM Argentina - Diseños Nuevos`
    - `Shopping Story`
    - `Generar Banco de poses + expresiones`

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `58`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Auditar y cerrar la paridad de universo de tareas entre `Notion` origen y `Greenhouse` para Delivery, empezando por el caso real `Daniela / Abril 2026` sobre los teamspaces `Efeonce` y `Sky Airline`.

Sin esta paridad de origen, cualquier cálculo posterior en `ICO`, `Performance Report`, `Top Performer`, `Carry-Over` u `Overdue` queda contaminado por un universo incompleto.

Esta task no debe ejecutarse como una lane lateral de Delivery. Debe leerse como un slice de auditoría y cierre de contrato dentro de la integración nativa de `Notion` ya institucionalizada en `TASK-188` y aterrizada para Notion en `TASK-187`.

## Why This Task Exists

La reconciliación directa contra Notion ya mostró drift real, no teórico.

Caso auditado:

- `Notion` directo, `due_date` en `abril 2026`, `Daniela`:
  - `Efeonce`: `24`
  - `Sky Airline`: `56`
  - `Total`: `80`
- `Greenhouse`, mismo corte:
  - `Efeonce`: `23`
  - `Sky Airline`: `50`
  - `Total`: `73`

Caso `created_at` en `abril 2026`:

- `Notion` directo:
  - `Efeonce`: `2`
  - `Sky Airline`: `20`
  - `Total`: `22`
- `Greenhouse`:
  - `Efeonce`: `1`
  - `Sky Airline`: `0`
  - `Total`: `1`

Esto confirma que el problema ya no es solo semántica de métricas. También existe una brecha material de datos base entre `Notion` y `Greenhouse`.

## Goal

- Identificar exactamente qué tareas existen en `Notion` y no están llegando a `Greenhouse`.
- Determinar si el gap nace en sync, mapeo de assignee, `space_id`, `created_at`, `due_date` o filtrado downstream.
- Dejar evidencia y tooling reusable suficientes para que `TASK-207` corrija el pipeline estructural sin hacerlo a ciegas.

## Recommended Execution Order

1. Ejecutar `TASK-205` primero.
2. Ejecutar `TASK-207` después, usando la evidencia y buckets cerrados aquí.
3. Ejecutar `TASK-208` al final, para monitorear una tubería ya entendida y endurecida.

Razonamiento:

- esta lane define la verdad operativa del problema
- `TASK-207` no debe corregir “a ciegas” sin diff explícito contra origen
- `TASK-208` no debe automatizar checks sobre un contrato todavía ambiguo

## Resolution Strategy

Resolver esta task sin invadir el scope de `TASK-207` requiere cerrar primero la evidencia reusable del problema, en este orden:

### Step 1 - Congelar la metodología de diff contra origen

- definir un helper/auditor reusable para comparar:
  - `Notion` origen o evidencia raw equivalente
  - `notion_ops.tareas`
  - `greenhouse_conformed.delivery_tasks`
- normalizar el corte por:
  - `space_id`
  - persona / assignee source
  - período (`due_date` y `created_at`)

Objetivo de este paso:

- que la auditoría sea repetible y no dependa de una query ad hoc distinta cada vez

### Step 2 - Cerrar integridad fila por fila antes de tocar el pipeline

- comparar `raw vs conformed` por `task_source_id`
- clasificar cada diferencia en:
  - fila ausente
  - `assignee` mutado
  - `due_date` mutada
  - `task_status` mutado

Objetivo de este paso:

- que una tarea existente en `notion_ops.tareas` no cambie de persona, fecha o estado sin una regla explícita y auditable

### Step 3 - Atacar primero el patrón más repetido del gap como evidencia

- auditar específicamente las tareas de `Sky` creadas en abril con `due_date = null`
- verificar por qué existen en raw y no en conformed
- dejar explícito si el writer las está filtrando, descartando o dejando fuera por contrato implícito

Objetivo de este paso:

- cerrar el bucket más repetido del undercount actual a nivel de evidencia y clasificación

### Step 4 - Reconciliación reusable por persona y período

- repetir el diff completo con:
  - `Daniela / Abril 2026`
  - `Andrés / Abril 2026`
- luego extender a más personas solo después de cerrar el helper reusable de auditoría

Objetivo de este paso:

- demostrar que la metodología explica el drift y deja insumo estructurado para el fix de `TASK-207`

### Step 5 - Handoff estructural a `TASK-207`

- consolidar el resultado en buckets estructurales:
  - stale raw vs conformed
  - pérdida de filas
  - mutación de campos
  - jerarquía no preservada
- documentar qué parte del fix debe continuar en `TASK-207`

Objetivo de este paso:

- evitar que `TASK-207` recorra nuevamente el mismo diagnóstico base

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- esta lane debe fortalecer la integración nativa de `Notion`, no abrir un carril paralelo fuera del integration layer
- no ajustar métricas para “hacerlas cuadrar” si el universo de tareas sigue incompleto
- la comparación de paridad debe hacerse contra `Notion` origen, no solo contra `notion_ops`
- toda reconciliación debe producir diff explícito `Notion only` vs `Greenhouse only`
- los cortes por persona deben usar el `person id` real de cada base de Notion, no asumir que el `user search id` del MCP coincide con los `people ids` de las propiedades
- no absorber en esta task el hardening estructural ya asignado a `TASK-207`
- no depender de que las tablas `greenhouse_sync.notion_space_*` estén materializadas en todos los entornos; la auditoría debe poder correr aunque esa governance esté incompleta

## Dependencies & Impact

### Depends on

- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-197 - Delivery Source Sync Assignee & Project Relation Parity`
- `TASK-198 - Delivery Notion Assignee Identity Coverage`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `greenhouse_conformed.delivery_tasks`
- bases Notion `Efeonce/Tareas` y `Sky Airline/Tareas`

### Impacts to

- la confiabilidad operativa de la integración nativa de `Notion`
- `TASK-207 - Delivery Notion Sync Pipeline Hardening & Freshness Gates`
- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `TASK-204 - Delivery Carry-Over & Overdue Carried Forward Semantic Split`
- cualquier reader `ICO` por `member`, `space`, `project` y `agency`
- cualquier publicación de reportes a Notion

### Files owned

- `docs/tasks/in-progress/TASK-205-delivery-notion-origin-parity-audit.md`
- `src/lib/sync/sync-notion-conformed.ts`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`

## Current Repo State

### Ya existe

- `Greenhouse` ya preserva mejor `assignee_source_id`, `assignee_member_ids` y `project_source_ids`.
- `Daniela` ya fue reconciliada hasta el nivel de `person id` real en Notion:
  - `161d872b-594c-813c-a3db-000239c8a466`
- ya existe un caso concreto de comparación directa `Notion API vs Greenhouse conformed`

### Gap actual

- `Greenhouse` sigue subcontando tareas frente a `Notion` origen
- el drift es visible tanto por `due_date` como por `created_at`
- `Sky Airline` concentra la mayor parte del gap observado
- no existe todavía una reconciliación fila por fila que explique cuáles tareas faltan ni en qué tramo del pipeline se pierden
- todavía no está auditado si `subitems` / subtareas de Notion están entrando completos, siendo colapsados, o quedando excluidos en alguna capa del sync
- ya existe evidencia de que `notion_ops.tareas` sí trae la jerarquía `Subtareas / Tarea principal`, pero `delivery_tasks` no la preserva
- ya existe evidencia de que el drift nace después de `notion_ops.tareas`, no antes
- ya existe evidencia de que hay dos writers distintos hacia `delivery_tasks`
- el drift actual parece partirse al menos en tres buckets:
  - pérdida de jerarquía `subitems` en `Sky`
  - pérdida de filas entre `notion_ops.tareas` y `delivery_tasks`
  - drift de campos mutables (`assignee`, `due_date`) entre Notion actual y Greenhouse
- el repo no tiene todavía un helper reusable que convierta estos hallazgos en auditoría repetible
- el helper reusable ya existe en `src/lib/space-notion/notion-parity-audit.ts`
- existe una route admin tenant-scoped para ejecutar la auditoría sin query ad hoc manual
- existe un script CLI reutilizable para repetir el audit por `space`, `persona` y `period_field`
- la governance `greenhouse_sync.notion_space_*` existe en código/tipos pero no está respaldada de forma consistente por los artefactos DDL visibles del repo local

## Scope

### Slice 1 - Diff contra origen

- construir diff `Notion only` vs `Greenhouse only`
- empezar por `Daniela / Abril 2026`

### Slice 2 - Triage de causa

- clasificar cada diferencia en:
  - sync faltante
  - pérdida de `assignee`
  - pérdida de `created_at`
  - pérdida de `space_id`
  - filtro downstream
  - tratamiento inconsistente de `subitems` / subtareas

### Slice 2.1 - Jerarquía de tareas como evidencia

- verificar explícitamente si los `subitems` deben vivir como filas independientes en `delivery_tasks`
- dejar explícito si `Tarea principal` y `Subtareas` deben proyectarse a `conformed`
- diferenciar qué parte del drift es ausencia de fila y qué parte es colapso de jerarquía

### Slice 3 - Auditor reusable

- construir un helper/servicio reusable para repetir el audit por:
  - `space`
  - persona
  - período
- exponer un reporte legible con:
  - tareas faltantes
  - tareas mutadas
  - buckets por causa probable

### Slice 4 - Handoff estructural a `TASK-207`

- dejar explícitas las causas sistémicas que exigen hardening del pipeline
- documentar qué parte del fix debe continuar en `TASK-207`

## Out of Scope

- redefinir semántica de métricas
- ajustar publicación a Notion
- cambiar owner attribution sin evidencia nueva
- converger a un solo writer canónico
- agregar freshness gates al cron
- proyectar jerarquía a `delivery_tasks`
- endurecer validaciones automáticas dentro del pipeline runtime

## Acceptance Criteria

- [x] Existe diff explícito `Notion vs Greenhouse` para `Daniela / Abril 2026`.
- [x] Existe diff explícito `Notion/raw/conformed` reutilizable para al menos `Daniela / Abril 2026` y `Andrés / Abril 2026`.
- [x] Cada tarea faltante queda clasificada por causa probable de pérdida.
- [x] El residual queda explicado tarea por tarea o bucket por bucket cuando todavía no pueda corregirse en esta lane.
- [x] La task deja una metodología reusable para repetir el audit con otras personas o períodos.
- [x] La task deja handoff explícito de causas estructurales hacia `TASK-207`.

## Verification

- `pnpm exec vitest run src/lib/space-notion/notion-parity-audit.test.ts`
- `pnpm exec eslint src/lib/space-notion/notion-parity-audit.ts src/lib/space-notion/notion-parity-audit.test.ts 'src/app/api/admin/tenants/[id]/notion-parity-audit/route.ts' scripts/audit-notion-delivery-parity.ts`
- `pnpm build`
- `pnpm lint`
- `pnpm audit:notion-delivery-parity --space-id=spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9 --assignee-source-id=161d872b-594c-813c-a3db-000239c8a466 --year=2026 --month=4 --period-field=due_date`
- `pnpm audit:notion-delivery-parity --space-id=spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad --assignee-source-id=161d872b-594c-813c-a3db-000239c8a466 --year=2026 --month=4 --period-field=due_date`
- `pnpm audit:notion-delivery-parity --space-id=spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9 --assignee-source-id=2a4d872b-594c-8161-9250-000270ffdfea --year=2026 --month=4 --period-field=due_date`
- `pnpm audit:notion-delivery-parity --space-id=spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad --assignee-source-id=2a4d872b-594c-8161-9250-000270ffdfea --year=2026 --month=4 --period-field=due_date`
- `pnpm audit:notion-delivery-parity --space-id=spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9 --assignee-source-id=2a4d872b-594c-8161-9250-000270ffdfea --year=2026 --month=4 --period-field=created_at`
- `pnpm audit:notion-delivery-parity --space-id=spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad --assignee-source-id=2a4d872b-594c-8161-9250-000270ffdfea --year=2026 --month=4 --period-field=created_at`
