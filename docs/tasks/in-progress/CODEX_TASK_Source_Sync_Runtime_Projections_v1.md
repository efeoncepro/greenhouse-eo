# CODEX TASK — Source Sync Runtime Projections (v1)

## Resumen

Esta task abre la lane de pipelines reales para desacoplar el portal de lecturas live a `Notion` y `HubSpot`.

No es solo documentacion.
La fundacion tecnica ya existe.
Lo que falta ahora es poblarla y volverla util para runtime.

Objetivo de esta task:
- llenar `greenhouse_raw`
- materializar `greenhouse_conformed`
- proyectar slices runtime a PostgreSQL en `greenhouse_crm` y `greenhouse_delivery`

## Por que esta lane existe ahora

Ya se materializo la estructura minima:
- BigQuery:
  - `greenhouse_raw`
  - `greenhouse_conformed`
  - `greenhouse_marts`
- PostgreSQL:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
  - `greenhouse_crm.*`
  - `greenhouse_delivery.*`

Pero esa fundacion sigue vacia o subutilizada.
Mientras no entren datos reales:
- `Payroll` sigue leyendo KPI desde `notion_ops`
- `Finance` sigue enriqueciendo parte del runtime desde `hubspot_crm`
- seguimos acoplados a datasets legacy

## Estado actual de partida

### Ya existe

- arquitectura formal en:
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- scripts de setup ya ejecutados:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- datasets y schemas base creados

### Todavia no existe

- jobs de sync reales
- runs y watermarks vivos
- raw snapshots poblados desde una estrategia repetible
- `conformed` alimentado automaticamente
- proyecciones runtime-críticas realmente usables por modulo

## Alineacion obligatoria con arquitectura

Revisar antes de implementar:
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:
- no calcular negocio directamente desde APIs live de `Notion` o `HubSpot` en request-time
- `greenhouse_raw` es append-only
- `greenhouse_conformed` es la capa de normalizacion
- PostgreSQL recibe solo el subset runtime-critico
- toda sync debe registrar:
  - run
  - watermark
  - failure si aplica

## Scope de esta task

### 1. Implementar control plane real

Usar `greenhouse_sync` para registrar:
- inicio y fin de runs
- entidad sincronizada
- watermark usado
- filas leidas
- filas escritas
- errores

### 2. Llenar raw de Notion y HubSpot

Construir jobs o runners para:
- `greenhouse_raw.notion_projects_snapshots`
- `greenhouse_raw.notion_tasks_snapshots`
- `greenhouse_raw.notion_sprints_snapshots`
- `greenhouse_raw.hubspot_companies_snapshots`
- `greenhouse_raw.hubspot_deals_snapshots`
- `greenhouse_raw.hubspot_contacts_snapshots`

Fase pragmatica permitida:
- seed inicial desde datasets legacy `notion_ops.*` y `hubspot_crm.*` si eso acelera la puesta en marcha
- pero respetando el contrato de raw y watermarks para que luego se pueda reemplazar por sync directo al source system

### 3. Materializar conformed

Construir la carga actualizada de:
- `greenhouse_conformed.delivery_projects`
- `greenhouse_conformed.delivery_tasks`
- `greenhouse_conformed.delivery_sprints`
- `greenhouse_conformed.crm_companies`
- `greenhouse_conformed.crm_deals`
- `greenhouse_conformed.crm_contacts`

### 4. Proyectar a PostgreSQL

Publicar el subset runtime-critico en:
- `greenhouse_delivery.projects`
- `greenhouse_delivery.tasks`
- `greenhouse_delivery.sprints`
- `greenhouse_crm.companies`
- `greenhouse_crm.deals`
- `greenhouse_crm.contacts`

Relaciones obligatorias:
- `HubSpot Company -> Greenhouse Client/Tenant`
- `HubSpot Contact -> Greenhouse User / Identity Profile`
- `HubSpot Owner -> Greenhouse Member / Greenhouse User`
- `Notion project database -> Greenhouse Space`

Boundary obligatoria:
- `raw` y `conformed` pueden conservar el universo CRM completo
- `greenhouse_crm` runtime solo debe proyectar companias que ya pertenecen al universo de clientes Greenhouse
- sus contactos asociados heredan esa misma frontera de tenant
- el sync modela y reconcilia contactos CRM, pero no auto-provisiona accesos nuevos; la provisión de `client_users` sigue en la integración/admin live
- `delivery` debe proyectar `space_id` como boundary operativo y `client_id` solo cuando el space es client-backed

### 5. Dejar listo el consumo por modulos

No hace falta cortar todos los consumidores en esta misma task, pero si dejar:
- conteos
- ejemplos de filas reales
- mapping estable de ids fuente y canonical ids
- criterio para que `Payroll`, `Finance` y otras surfaces puedan dejar de leer datasets legacy

## No scope

- reescribir UI
- mover todo el BI a PostgreSQL
- eliminar en una sola pasada `hubspot_crm.*` o `notion_ops.*`
- cerrar todos los consumidores runtime en el mismo lote

## Boundary segura para trabajo en paralelo

Archivos y zonas permitidas:
- `scripts/setup-postgres-source-sync*.{sql,ts}`
- `scripts/setup-bigquery-source-sync*.{sql,ts}`
- futuros `scripts/sync-*.ts`
- `src/lib/postgres/**`
- `src/lib/bigquery.ts`
- nuevos `src/lib/source-sync/**` si hacen falta
- docs de arquitectura/source sync relacionados

No deberia tocar:
- `src/lib/payroll/**` salvo para cambiar una dependencia concreta una vez que exista la proyeccion
- `src/lib/finance/**` salvo para cambiar una dependencia concreta una vez que exista la proyeccion
- `src/views/**`

## Dependencias cruzadas

Esta lane habilita a:
- `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
- `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`

Puede avanzar en paralelo con ambas porque su output es una capa de datos y no deberia intervenir directamente las rutas de producto hasta que las proyecciones esten listas.

## Entregables esperados

- uno o mas jobs ejecutables de sync
- runs y watermarks registrados en PostgreSQL
- raw poblado para Notion y HubSpot
- conformed actualizado con datos reales
- proyecciones `greenhouse_crm` y `greenhouse_delivery` con filas reales
- documentacion de incremental sync y fallback de seed inicial

## Estado 2026-03-15

- `crm_contacts` ya quedó materializado en:
  - `greenhouse_conformed.crm_contacts`
  - `greenhouse_crm.contacts`
- el slice respeta el boundary del modelo:
  - solo entran contactos asociados a companias que ya están dentro del universo Greenhouse
  - no se exige que la integración live de HubSpot escriba directo a BigQuery
  - la reconciliación de acceso reutiliza `client_users` existentes en vez de provisionar usuarios nuevos silenciosamente
- owners CRM ya se resuelven a colaboradores usando `greenhouse.team_members.hubspot_owner_id`
- conteos validados tras rerun:
  - `crm_contacts = 63`
  - `linked_user_id = 29`
  - `linked_identity_profile_id = 29`
  - `owner_member_id = 63`
  - `owner_user_id = 61`
- source links de owner validados:
  - `member <- hubspot owner = 6`
  - `user <- hubspot owner = 1`
  - `identity_profile <- hubspot owner = 6`

## Criterios de aceptacion

### Datos

- existe al menos un `sync_run` exitoso por `Notion` y por `HubSpot`
- watermarks quedan actualizados
- raw contiene snapshots con metadata de ingesta
- conformed devuelve filas consistentes y sin depender de queries manuales ad hoc
- PostgreSQL contiene proyecciones runtime utilizables
- la relacion `HubSpot Contact -> client_user / identity_profile` queda modelada o explicitamente abierta con contrato documentado

### Operacion

- un rerun no rompe la consistencia
- los errores fallan en `source_sync_failures`
- la estrategia incremental es repetible

### Plataforma

- queda documentado que consumers pueden empezar a leer `greenhouse_delivery` y `greenhouse_crm`
- disminuye la necesidad de tocar `notion_ops.*` y `hubspot_crm.*` desde features nuevas

## Primeros archivos sugeridos

- `scripts/setup-postgres-source-sync.ts`
- `scripts/setup-bigquery-source-sync.ts`
- futuros `scripts/sync-notion-*.ts`
- futuros `scripts/sync-hubspot-*.ts`
- `src/lib/postgres/client.ts`
- `src/lib/bigquery.ts`

## Handoff recomendado para Claude

Si Claude toma esta lane:
- puede arrancar por seed inicial desde datasets legacy si eso acelera la entrega
- no debe saltarse el control plane de runs y watermarks
- debe privilegiar que el output sea consumible por runtime, no solo por analitica
- cualquier consumer nuevo debe leer proyecciones o conformed, nunca raw directo
