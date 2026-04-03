# TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness

## Delta 2026-04-02 — Implementación

- Se materializó la lane formal de governance por `space` sobre el binding existente:
  - `greenhouse_sync.notion_space_schema_snapshots`
  - `greenhouse_sync.notion_space_schema_drift_events`
  - `greenhouse_sync.notion_space_kpi_readiness`
- Se agregaron APIs admin tenant-scoped:
  - `GET /api/admin/tenants/[id]/notion-governance`
  - `POST /api/admin/tenants/[id]/notion-governance/refresh`
- `POST /api/integrations/notion/register` ahora intenta refrescar governance best-effort y corrige el `nextStep` al control plane real `POST /api/admin/integrations/notion/sync`.
- `TenantNotionPanel` ya expone readiness, snapshots, drift y refresh manual sin crear una página nueva.
- `scripts/notion-schema-discovery.ts` quedó reconciliado con `greenhouse_core.space_notion_sources`.
- Limitación explícita que queda vigente:
  - `sync-notion-conformed` todavía no consume `space_property_mappings` como carril runtime principal; la tabla sigue siendo governance/override y no source of truth operativo del cron activo.

## Delta 2026-04-02

- Auditoría inicial completada antes de implementar. Hallazgos que corrigen la lectura operativa:
  - `greenhouse_core.space_notion_sources` y `POST /api/integrations/notion/register` sí existen y ya cubren onboarding básico por `space`.
  - `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx` + `GET /api/admin/tenants/[id]/notion-status` ya exponen una UX/admin mínima reusable para crear `space`, descubrir DBs y registrar bindings.
  - `greenhouse_sync.integration_registry` + `src/lib/integrations/{registry,health,readiness,sync-trigger}.ts` ya entregan governance shared de integración, pero solo a nivel upstream global, no por `space`.
  - el readiness de Notion ya existe para cron consumers (`sync-conformed`, `ico-member-sync`), pero todavía no expresa si un `space` cumple o no el contrato KPI mínimo.
  - `src/lib/sync/sync-notion-conformed.ts` ya consume `space_id` desde `notion_ops.*`, pero todavía no usa `greenhouse_delivery.space_property_mappings` como carril principal.
  - persisten dos carriles de sync con distinto nivel de actualización:
    - `src/lib/sync/sync-notion-conformed.ts` ya es `space-aware`
    - `scripts/sync-source-runtime-projections.ts` sigue siendo un seed/manual path con fallback legacy a `greenhouse.clients.notion_project_ids`
  - `scripts/notion-schema-discovery.ts` quedó desactualizado frente al schema real: sigue intentando leer `sns.notion_database_ids`, `sns.client_id` y joins legacy que ya no representan `space_notion_sources`.
  - la tabla `greenhouse_delivery.space_property_mappings` existe, pero hoy está vacía en runtime (`0` rows) y no constituye todavía una foundation activa de onboarding.
  - `POST /api/integrations/notion/register` devuelve como `nextStep` un manual sync route inexistente (`/api/integrations/notion/sync`), por lo que el carril post-register sigue incompleto aunque el binding sí persiste.
  - el runtime real solo tiene 2 bindings activos en `space_notion_sources` / réplica BigQuery (`Efeonce`, `Sky`); `ANAM` sigue documentado como referencia auditada en `TASK-186`, pero aún no está onboarded en este carril.
- Implicación operativa:
  - esta task no parte de cero en onboarding/register/admin
  - sí sigue abierta en schema registry, drift detection, KPI readiness por `space` y formalización del contrato de mappings
  - antes de implementar se debe corregir el tooling/documentación para reflejar el schema y runtime vigentes

## Delta 2026-04-01

- El `MVP` previo de confianza de métricas ya quedó resuelto en `TASK-189` + `TASK-186`:
  - período canónico `ICO` anclado por `due_date`
  - `Performance Report` mensual materializado en `ico_engine.performance_report_monthly`
  - serving OLTP formal en `greenhouse_serving.agency_performance_reports`
  - segmentación explícita `Tareas Efeonce` / `Tareas Sky`
- Esta task ya no bloquea visibilidad operativa del scorecard; su foco queda más claramente en onboarding, schema registry, drift y readiness estructural.
- `TASK-188` ya dejó además una foundation operativa reusable para Notion:
  - registry central de integraciones nativas
  - control plane básico (`pause`, `resume`, `sync`)
  - readiness endpoint compartido
  - self-service register API para nuevas integraciones
- Por lo mismo, `TASK-187` puede enfocarse en lo realmente específico de Notion:
  - source binding por `space`
  - discovery de DBs
  - schema registry
  - drift detection
  - KPI readiness por contrato

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementado`
- Rank: `3`
- Domain: `platform`

## Summary

Formalizar Notion como una integración gobernada del platform layer de Greenhouse, de modo que onboardear un nuevo teamspace/cliente no dependa de discovery manual por MCP, memoria conversacional o “vibe coding”.

La integración debe permitir registrar un nuevo `space`, descubrir sus bases de `Proyectos` y `Tareas`, versionar el schema, sugerir mappings contra el contrato KPI core, soportar extensiones por cliente y validar si ese space está listo o no para alimentar `ICO` y reportes como el `Performance Report`.

La meta no es desechar las tablas, endpoints y jobs actuales, sino absorberlos dentro de un carril formal de onboarding y gobernanza. Esta lane debe construir encima de `space_notion_sources`, `space_property_mappings`, el register route y los syncs actuales.

Dentro de la arquitectura canónica vigente, esta task debe leerse como la `reference implementation` de la `Native Integrations Layer` para `Notion`, no como una arquitectura paralela.

En términos de ejecución, esta lane queda después del `MVP` operativo de confianza de métricas (`TASK-189` + `TASK-186`), para no bloquear visibilidad de valor mientras se formaliza la capability completa.

## Why This Task Exists

Hoy Greenhouse ya tiene piezas útiles para integrar Notion:

- `greenhouse_core.space_notion_sources`
- `greenhouse_delivery.space_property_mappings`
- endpoint de registro `POST /api/integrations/notion/register`
- `scripts/notion-schema-discovery.ts`
- sync multi-tenant con overrides por `space_id`

Pero el proceso completo sigue siendo semi-manual y poco gobernado:

- alguien tiene que encontrar las DB correctas
- alguien tiene que validar cuál es `Proyectos`, cuál es `Tareas` y si faltan otras
- alguien tiene que interpretar el schema y decidir qué importa para KPIs
- el sistema no versiona formalmente el schema ni detecta drift como parte del onboarding
- la readiness para `ICO` y para scorecards no está institucionalizada

Eso genera dos riesgos:

- onboarding no escalable: cada nuevo cliente requiere trabajo artesanal
- métricas no confiables: el contrato depende demasiado de descubrimiento manual y no de una integración formal

## Goal

- Implementar en `Notion` el modelo de `Native Integrations Layer` definido en `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`.
- Permitir onboarding de nuevos spaces sin depender de discovery manual vía MCP como carril principal.
- Versionar schemas de Notion por `space_id` y detectar drift.
- Separar formalmente `core KPI contract` de `space-specific extensions`.
- Incorporar una validación explícita de readiness para `ICO` y `Performance Report`.

## Iteration Principle

- No romper el carril actual de registro, bindings y sync mientras se formaliza la integración.
- Reusar como base `greenhouse_core.space_notion_sources`, `greenhouse_delivery.space_property_mappings`, `POST /api/integrations/notion/register` y `scripts/notion-schema-discovery.ts`.
- Encapsular y gobernar foundations existentes antes de reemplazar cualquier pieza.
- Tratar MCP como carril de auditoría y fallback, no como path operativo principal de onboarding.

## Recommended Execution Order

1. Tomar `TASK-188` como paraguas arquitectónico y shared operating model.
2. Fortalecer Notion como primera implementación formal sin cortar el runtime existente.
3. Usar el contrato resultante para endurecer `TASK-186` y habilitar paridad confiable del `Performance Report`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Notion debe seguir siendo `source system`, no identidad canónica de Greenhouse.
- esta task no redefine la arquitectura general de integraciones; la implementa para `Notion`
- El onboarding de un space nuevo no debe depender de conocimiento tácito de un agente.
- Las variaciones por cliente deben resolverse por contrato y configuración, no por hardcodes oportunistas.
- El sync no debe activarse como “listo para KPI” si el espacio no cumple el contrato mínimo de métricas.
- esta task no puede degradar el runtime actual de `ICO`; cualquier formalización de `Notion` debe convivir con el engine vigente hasta que el nuevo carril esté probado

## Dependencies & Impact

### Depends on

- `TASK-002 - Tenant / Space -> Notion mapping`
- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/space-notion/space-notion-store.ts`
- `scripts/notion-schema-discovery.ts`
- `scripts/sync-source-runtime-projections.ts`
- `greenhouse_core.space_notion_sources`
- `greenhouse_delivery.space_property_mappings`

### Impacts to

- `TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening`
- onboarding de nuevos clientes/spaces con Notion
- `ICO` y cualquier scorecard dependiente de Delivery
- health/freshness de integraciones
- surfaces admin para integraciones y gobernanza
- futuras lanes de CRM/Agency/Delivery que dependan de Notion como upstream

### Files owned

- `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
- `src/app/api/integrations/notion/register/route.ts`
- `src/lib/space-notion/space-notion-store.ts`
- `scripts/notion-schema-discovery.ts`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

## Current Repo State

### Nueva posición arquitectónica

- `TASK-188` y `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` definen el modelo shared de integraciones nativas.
- `TASK-187` implementa ese modelo en `Notion`.
- `TASK-186` consume esa foundation para trust y paridad de métricas Delivery.

### Ya existe

- registro canónico básico de DB IDs por `space_id`
- soporte de mapping por `space_property_mappings`
- script de discovery que compara schema y propone seed de mappings
- sync que aplica overrides por `space_id`
- posibilidad de registrar DB IDs por API
- surface admin reusable para onboarding básico:
  - `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
  - `src/app/api/admin/tenants/[id]/notion-status/route.ts`
  - `src/app/api/admin/spaces/route.ts`
- registry shared de integraciones y control plane básico:
  - `greenhouse_sync.integration_registry`
  - `GET /api/admin/integrations`
  - `POST /api/admin/integrations/[integrationKey]/pause`
  - `POST /api/admin/integrations/[integrationKey]/resume`
  - `POST /api/admin/integrations/[integrationKey]/sync`
- readiness gate compartido del sync conformed:
  - `src/app/api/cron/sync-conformed/route.ts`
  - `src/lib/integrations/readiness.ts`
- readiness gate compartido del downstream KPI:
  - `src/app/api/cron/ico-member-sync/route.ts`
  - `src/lib/integrations/readiness.ts`

### Gap actual

- el discovery no es un onboarding gobernado de producto/plataforma
- no existe `schema registry` persistido como source of truth
- no existe clasificación formal `core KPI` vs `space-specific`
- no existe `KPI readiness` por espacio
- no existe drift detection institucional sobre cambios de schema en Notion
- la UX/admin layer no ofrece un flujo completo de onboarding y mantenimiento
- `scripts/notion-schema-discovery.ts` no refleja el schema ni joins actuales y debe corregirse antes de usarlo como foundation de onboarding
- `space_property_mappings` todavía no participa del carril runtime principal y no tiene seeds activas en DB
- el carril post-register tiene drift operativo porque el sync manual sugerido por la API no existe
- la readiness actual es solo de integración global; falta derivar readiness contractual por `space`
- persiste dualidad de modelo entre:
  - `space_notion_sources -> greenhouse_core.spaces`
  - FKs legacy de `greenhouse_delivery.{projects,sprints,tasks} -> greenhouse_core.notion_workspaces`
- el coverage real de spaces onboarded sigue parcial:
  - `Efeonce`
  - `Sky`
  - `ANAM` todavía fuera del binding canónico persistido

## Scope

### Slice 1 - Integration model formal

- aterrizar el modelo institucional de integración Notion ya definido por la `Native Integrations Layer`
- fijar responsabilidades entre:
  - source binding
  - schema discovery
  - mapping governance
  - sync operations
  - KPI readiness

### Slice 2 - Source registry and discovery

- formalizar el binding `space_id -> DBs Notion`
- diseñar un flujo de discovery para detectar automáticamente candidatos a:
  - `Proyectos`
  - `Tareas`
  - `Sprints`
  - `Revisiones`
- permitir confirmación humana cuando haya ambigüedad

### Slice 3 - Schema registry and drift detection

- persistir snapshot/versiones del schema por `space_id` y por DB
- detectar cambios de nombre, tipo o eliminación de propiedades
- clasificar drift como:
  - bloqueante para KPI core
  - warning para extensiones
  - informativo

### Slice 4 - Mapping governance

- separar formalmente:
  - `core KPI contract`
  - `space-specific extensions`
  - `ignored`
  - `unknown`
- usar `space_property_mappings` como carril gobernado, no como parche manual

### Slice 5 - KPI readiness

- definir un score/estado de readiness por `space`
- validar cobertura mínima antes de declarar que un space puede alimentar:
  - `ICO`
  - `Performance Report`
  - scorecards por persona

### Slice 6 - Admin / operational UX

- diseñar una surface de administración para:
  - registrar o editar DB IDs
  - correr discovery
  - revisar mappings sugeridos
  - ver drift
  - ver readiness y estado del sync

## Out of Scope

- reemplazar inmediatamente el sync Notion actual por un framework nuevo
- reemplazar Notion como upstream operativo en esta lane
- rediseñar todos los reportes Delivery
- implementar toda la UI admin final si primero hace falta cerrar el contrato de datos
- resolver en esta misma task todos los gaps métricos de `TASK-186`

## Target Operating Model

### Today

- registrar DB IDs manualmente
- correr discovery/script o usar MCP para entender schema
- decidir mappings de forma asistida
- activar sync
- después descubrir si el KPI quedó bien o no

### Target

- registrar el `space`
- descubrir automáticamente las DBs candidatas
- confirmar las fuentes correctas
- capturar y versionar schema
- sugerir mappings contra el core
- clasificar extensiones
- validar readiness KPI
- recién entonces activar el sync como producer confiable para `ICO`

## Acceptance Criteria

- [ ] `TASK-187` queda explícitamente posicionada como `reference implementation` de la `Native Integrations Layer` para `Notion`.
- [ ] Queda definido el flujo de onboarding de un nuevo `space` sin depender de discovery manual por MCP como camino principal.
- [ ] Queda especificado un `schema registry` o mecanismo equivalente para versionar schemas de Notion.
- [ ] Queda definida la separación `core KPI contract` vs `space-specific extensions`.
- [ ] Queda definido un mecanismo de `drift detection`.
- [ ] Queda definida una validación de `KPI readiness` por `space`.
- [ ] La task deja follow-ups concretos de datos, backend y UI/admin para implementarla por slices.

## Verification

- Revisión de:
  - `src/app/api/integrations/notion/register/route.ts`
  - `scripts/notion-schema-discovery.ts`
  - `scripts/sync-source-runtime-projections.ts`
  - `greenhouse_core.space_notion_sources`
  - `greenhouse_delivery.space_property_mappings`
- Contraste contra `TASK-186` y la arquitectura viva de source sync

## Open Questions

- ¿El discovery de DBs debe correr desde Greenhouse contra Notion API directa o seguir apoyándose en el pipeline externo?
- ¿El `schema registry` debe vivir en PostgreSQL, BigQuery o ambos?
- ¿La clasificación `core / extension / ignored / unknown` debe ser editable desde Admin?
- ¿El readiness bloquea el sync completo o solo bloquea el consumo KPI downstream?
- ¿El carril operativo correcto post-register será un sync manual por `space`, o debe quedar explícitamente delegado al cron + readiness + observabilidad?

## Follow-ups

- `TASK-186 - Delivery Metrics Trust: Notion Property Audit & Conformed Contract Hardening`
- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- implementar `schema registry` para Notion
- implementar drift detection y health en admin
- formalizar `Notion KPI readiness`
- conectar onboarding Notion con `TASK-186` para que nuevos spaces entren al contrato de métricas desde el día 1
