# NOTION_BQ_SYNC_AUDIT_2026-04-30

## Status

- Date: 2026-04-30
- Scope: auditoria tecnica y operativa completa de `notion-bq-sync`
- Auditor: Codex
- Criticality: alta
- Primary downstream impacted: `greenhouse_conformed.delivery_*` y `ICO Engine`

## Executive Summary

`notion-bq-sync` es una pieza critica del runtime Greenhouse porque escribe la materia prima `notion_ops.*` que luego consume `sync-conformed` y finalmente el `ICO Engine`.

La auditoria muestra que el servicio hoy combina tres riesgos estructurales:

1. **Seguridad**: expone sync y discovery/sample de Notion sin autenticacion.
2. **Consistencia de datos**: el refresh multi-tenant usa `DELETE + APPEND` no atomico por `space_id`.
3. **Operabilidad**: hay deuda de versionado Notion legacy, runtime ambiguo Cloud Run/Cloud Functions y ausencia de test suite reproducible.

La conclusion operativa es:

- a corto plazo, el pipeline debe endurecerse antes de seguir ampliando superficie o tenants
- a mediano plazo, por criticidad del flujo que alimenta ICO, conviene evaluar absorcion/ownership mas cercano al monorepo Greenhouse
- migrar solo el cliente SDK de Notion en `greenhouse-eo` no resuelve el riesgo principal del carril critico

## Audit Scope

Aristas auditadas:

- repo hermano local `/Users/jreye/Documents/notion-bigquery`
- metadata remota GitHub via `gh`
- runtime principal `main.py`
- despliegue e infraestructura `deploy.sh`
- documentacion viva del repo hermano
- acople desde `greenhouse-eo`
- impacto sobre `notion_ops -> greenhouse_conformed.delivery_* -> ICO`

Fuentes principales contrastadas:

- `notion-bigquery/main.py`
- `notion-bigquery/deploy.sh`
- `notion-bigquery/README.md`
- `notion-bigquery/project_context.md`
- `notion-bigquery/HANDOFF.md`
- `greenhouse-eo/docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `greenhouse-eo/docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `greenhouse-eo/src/lib/sync/sync-notion-conformed.ts`

## System Context

### Posicion en el pipeline Greenhouse

El flujo real hoy es:

1. `notion-bq-sync` escribe `notion_ops.{tareas,proyectos,sprints,revisiones}`
2. `greenhouse-eo` ejecuta `sync-conformed`
3. `greenhouse_conformed.delivery_*` alimenta materializaciones y consumers
4. `ICO Engine` consume esa capa conformed

Esto significa que `notion-bq-sync` no es una utilidad administrativa de bajo riesgo; es una dependencia directa del calculo operativo y de confiabilidad del dominio Delivery/ICO.

### Ownership actual

- Repo canónico: `cesargrowth11/notion-bigquery`
- Repo consumidor principal: `efeoncepro/greenhouse-eo`
- Superficies del portal que dependen del servicio:
  - `GET /api/integrations/notion/discover`
  - `POST /api/integrations/notion/register` para verificacion/sample
  - readers y orquestacion downstream sobre `notion_ops`

## Runtime Inventory

### Tecnologia

- Lenguaje: Python 3.12
- Entrypoint: `notion_bq_sync`
- App server: Flask + gunicorn
- HTTP client: `requests`
- Data plane: `google-cloud-bigquery`
- Deploy target: autodetecta Cloud Run o Cloud Functions Gen2

### Dependencias

`requirements.txt`:

- `gunicorn>=21.2`
- `flask>=2.0`
- `requests>=2.28`
- `google-cloud-bigquery>=3.20`

Observacion:

- las dependencias no estan pinneadas
- no hay lockfile
- no hay suite de tests visible en el repo

### Superficie HTTP expuesta

- `GET /` — health + config summary
- `POST /` — sync full
- `POST /?table=<table>` — sync parcial por tabla
- `POST /?space_id=<space>` — sync parcial por tenant
- `GET /discover` — busqueda de databases Notion
- `GET /discover/<database_id>/sample` — sample de registros de una base Notion

## Findings

### F-001 — Exposicion publica de sync y discovery con token runtime

Severity: Critical

El deploy deja el runtime con `--allow-unauthenticated` tanto para Cloud Run como para Cloud Functions. Ademas, el Scheduler invoca por HTTP directo sin OIDC. Esto expone no solo el sync `POST /`, sino tambien `GET /discover` y `GET /discover/<database_id>/sample`, que funcionan como proxy del workspace Notion usando el `NOTION_TOKEN` del runtime.

Impacto:

- ejecucion arbitraria de sync full o parcial
- exploracion de metadata de Notion desde un endpoint publico
- ampliacion innecesaria de superficie sensible en un servicio critico
- riesgo operacional y de costo por abuso del endpoint

Evidencia:

- `deploy.sh` usa `--allow-unauthenticated`
- `deploy.sh` crea Scheduler HTTP sin auth extra
- `main.py` expone `POST /`, `GET /discover` y `GET /discover/<db>/sample`

Archivos:

- `notion-bigquery/deploy.sh`
- `notion-bigquery/main.py`

### F-002 — Estrategia multi-tenant no atomica por `space_id`

Severity: High

El refresh multi-tenant hace:

1. `DELETE FROM table WHERE space_id = ...`
2. `APPEND` de nuevas filas

Si falla entre ambos pasos, el space queda vacio o parcialmente refrescado. Si el `DELETE` falla, el runtime sigue con `APPEND` y solo emite warning, abriendo la puerta a duplicados.

Impacto:

- drift por tenant dentro de `notion_ops`
- huecos parciales o duplicados en tablas planas y `stg_*`
- inconsistencia aguas abajo en `greenhouse_conformed.delivery_*`
- impacto directo en el pipeline que alimenta ICO

Evidencia:

- `_delete_space_rows()` degrada fallas a warning
- `sync_table()` usa `DELETE + APPEND` para flat y staging

Archivos:

- `notion-bigquery/main.py`

### F-003 — Dependencia de Notion API legacy en carril critico

Severity: High

El runtime fija `Notion-Version: 2022-06-28` y consulta via `/v1/databases/{id}/query`. Ese contrato pertenece al carril legacy previo al split `database` / `data source`.

Impacto:

- deuda de compatibilidad en la pieza que alimenta el flujo mas critico de Notion
- mayor costo futuro de migracion
- riesgo de que cambios de plataforma peguen primero donde mas duele

Evidencia:

- `_notion_headers()` fija `2022-06-28`
- `_notion_query_page()` llama `/databases/{database_id}/query`
- `discover_sample()` tambien usa el endpoint legacy

Archivos:

- `notion-bigquery/main.py`

### F-004 — `raw_pages_snapshot` append-only sin politica de retencion visible

Severity: Medium-High

Cada corrida appendea payload completo por pagina (`raw_page_json`, `raw_properties_json`) en una tabla shared sin que el runtime explicite particionado, clustering ni TTL. El documento `BIGQUERY_SCHEMA.md` propone una estrategia mas madura, pero el runtime actual no la materializa.

Impacto:

- crecimiento de costo de almacenamiento
- mayor blast radius de datos sensibles/operativos si se expone el dataset
- deuda de mantenimiento sobre snapshots historicos sin lifecycle claro

Archivos:

- `notion-bigquery/main.py`
- `notion-bigquery/BIGQUERY_SCHEMA.md`

### F-005 — Discovery/sample no reutiliza la politica robusta de retries

Severity: Medium

El sync principal implementa retries para `429`, `5xx` y errores de transporte. Los endpoints `discover` y `sample` hacen requests directos con `raise_for_status()` y manejo ad-hoc. La superficie admin queda menos resiliente que el sync principal aunque hoy es parte del contrato que usa `greenhouse-eo`.

Impacto:

- onboarding/admin mas fragil
- mayor incidencia de errores transientes visibles al portal
- degradacion operativa en flows de registro/verificacion

Archivos:

- `notion-bigquery/main.py`

### F-006 — Runtime ambiguo y documentacion operativa inconsistente

Severity: Medium

El repo mezcla lenguaje de Cloud Function Gen2 y Cloud Run. El deploy autodetecta target existente y despliega ahi. El codigo se presenta como Flask app servida por gunicorn. Operativamente esto dificulta saber con precision:

- cual es el owner real del runtime
- donde mirar logs primero
- que superficie IAM/Invoker es la canonica
- cual es el contrato de rollback y redeploy

Impacto:

- incident response mas lento
- mas friccion entre agentes/humanos
- riesgo de fixes aplicados en el target equivocado

Archivos:

- `notion-bigquery/deploy.sh`
- `notion-bigquery/AGENTS.md`
- `notion-bigquery/project_context.md`
- `notion-bigquery/main.py`

### F-007 — Falta de testing automatizado y dependencias no pinneadas

Severity: Medium

No se observo suite de tests en el repo ni comandos tipo `pytest`. Las dependencias usan rangos abiertos `>=`.

Impacto:

- upgrades menos reproducibles
- fixes mas dependientes de deploy manual
- menor confianza al tocar un servicio que alimenta ICO

Archivos:

- `notion-bigquery/requirements.txt`
- `notion-bigquery/TASKS.md`

## Security Posture

### Secrets

Uso observado:

- `NOTION_TOKEN` via Secret Manager
- callback token opcional via Secret Manager

Fortalezas:

- el token de Notion no esta hardcodeado
- el callback a Greenhouse acepta secret separado

Debilidades:

- el secreto esta bien tratado, pero el runtime que lo usa esta sobreexpuesto
- discovery/sample convierten el token runtime en una capacidad publica indirecta

### Auth / Invoker

Estado actual:

- runtime publico
- Scheduler HTTP publico
- deuda de auth reconocida pero no cerrada (`TASK-002` del repo hermano)

Recomendacion:

- separar health publico de superficies sensibles
- exigir IAM invoker u OIDC para scheduler/runtime
- cerrar `discover` y `sample` detras de auth explicita o moverlos fuera del runtime critico

## Data Reliability Review

### Contrato de escritura

Flat tables:

- `notion_ops.tareas`
- `notion_ops.proyectos`
- `notion_ops.sprints`
- `notion_ops.revisiones`

Additional outputs:

- `notion_ops.stg_*`
- `notion_ops.raw_pages_snapshot`
- `notion_ops.sync_log`

### Riesgos de consistencia

- `DELETE + APPEND` por tenant no atomico
- flat y staging se reescriben en pasos separados
- callback a Greenhouse solo se ejecuta si el sync completo no tiene errores, pero la consistencia intra-space puede haberse degradado antes del callback

### Riesgos downstream

`greenhouse-eo` lee `notion_ops` para componer `greenhouse_conformed.delivery_*`. Si una tabla avanza y otra no, el problema no se queda en el repo hermano:

- rompe la frescura del conformed
- sesga paridad de delivery
- puede contaminar materializaciones/lecturas del `ICO Engine`

## Observability And Operations

Fortalezas:

- `sync_log` append-only
- logging de retries y resultados
- callback a Greenhouse documentado

Debilidades:

- no hay test lane ni smoke lane versionada en este repo
- no hay alerting visible en el repo
- no hay indicadores de drift/quality propios del runtime mas alla de `sync_log`
- no hay CI visible via issues/PRs/checklists formales; en GitHub solo se observó 1 PR mergeada y 0 issues listadas via `gh`

## GitHub / Repo Signals

Metadata remota observada:

- Repo: `cesargrowth11/notion-bigquery`
- Visibility: private
- Default branch: `main`
- Updated at: 2026-04-04
- PRs visibles via `gh`: 1 mergeada
- Issues visibles via `gh`: 0

Lectura:

- bajo volumen de governance formal para una pieza critica
- alta dependencia en conocimiento local/documental mas que en procesos de repo

## Coupling With Greenhouse

### Acople directo

`greenhouse-eo` depende del servicio en dos planos:

1. **Plano de datos**
   - writer canonico de `notion_ops`
   - callback opcional para cerrar `raw -> conformed`

2. **Plano admin**
   - `discover`
   - `sample`
   - validacion de bases durante registro/onboarding

### Implicacion

Este servicio ya no debe considerarse un pipeline aislado de BI. Su salud afecta:

- onboarding de integraciones Notion
- contrato de `delivery_*`
- confiabilidad operativa de Delivery
- calculo downstream de ICO

## Recommendations

## Horizon 1 — 48h Hardening

- Cerrar `POST /`, `GET /discover` y `GET /discover/<db>/sample` detras de auth.
- Pasar Scheduler a OIDC/IAM invoker.
- Documentar un solo runtime canonico: Cloud Run o Cloud Functions Gen2, no ambos.
- Congelar dependencias con versiones pinneadas.

## Horizon 2 — 2-Week Reliability Lane

- Reemplazar `DELETE + APPEND` por estrategia atomica por tenant:
  - staging por corrida
  - merge/swap controlado
  - rollback limpio por space
- Unificar retry policy tambien para discovery/sample.
- Agregar smoke lane automatizada del contrato:
  - Notion -> notion_ops
  - notion_ops -> sync-conformed
  - sync-conformed -> readiness minima para ICO
- Definir retencion/TTL/particionado real para `raw_pages_snapshot`.

## Horizon 3 — Platform Modernization

- Planificar migracion de API legacy Notion hacia el modelo moderno `data source`.
- Separar superficies:
  - batch sync critico
  - discovery/onboarding admin
- Evaluar absorcion/ownership mas cercano a `greenhouse-eo` o, minimo, un contrato de operacion shared mas estricto.

## Recommended Decision

Decision operativa recomendada al 2026-04-30:

- **no** seguir ampliando superficie o tenants sobre el runtime actual sin hardening
- **sí** priorizar una lane de confiabilidad del pipeline Notion antes que una migracion cosmética del SDK del portal
- **sí** reevaluar absorcion de `notion-bq-sync` despues del hardening minimo, porque el proceso ya es demasiado critico para quedar con ownership partido y postura pública

## File References

- Repo auditado:
  - `/Users/jreye/Documents/notion-bigquery/main.py`
  - `/Users/jreye/Documents/notion-bigquery/deploy.sh`
  - `/Users/jreye/Documents/notion-bigquery/README.md`
  - `/Users/jreye/Documents/notion-bigquery/project_context.md`
  - `/Users/jreye/Documents/notion-bigquery/HANDOFF.md`
  - `/Users/jreye/Documents/notion-bigquery/TASKS.md`
  - `/Users/jreye/Documents/notion-bigquery/BIGQUERY_SCHEMA.md`
- Contrato Greenhouse:
  - `/Users/jreye/Documents/greenhouse-eo/docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
  - `/Users/jreye/Documents/greenhouse-eo/docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `/Users/jreye/Documents/greenhouse-eo/src/lib/sync/sync-notion-conformed.ts`
