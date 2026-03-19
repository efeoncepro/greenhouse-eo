# Greenhouse Data Node Architecture v2

**Greenhouse como data node operativo, no solo dashboard**

## Estado

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la vision de producto de `Greenhouse_Data_Node_Architecture_v1.md`, pero reescribe la base tecnica sobre la arquitectura viva del proyecto:
- `Postgres-first` para configuracion, API keys, preferencias y logs operativos
- `BigQuery` como fuente analitica y de lectura, no como store transaccional principal
- guards explicitos y auth por helper, no `middleware.ts`
- cron y runtime dentro del portal / infra actual antes de abrir repos o servicios adicionales

## Resumen

`Data Node` es la capacidad de Greenhouse para exponer datos operativos del cliente hacia afuera del dashboard:
- export manual desde el portal
- reportes programados
- API read-only para integraciones
- MCP como capa posterior para agentes de IA

La vision se mantiene:
- aumentar switching cost
- convertir a Greenhouse en fuente de datos dentro del ecosistema del cliente
- reforzar el modelo Agency Service as a Software

La implementacion cambia:
- empezar por export y delivery dentro del portal existente
- mover configuracion y auth externa a PostgreSQL
- tratar `MCP` como adapter posterior, no como foundation inmediata

## Decision de arquitectura

### Principios

- `PostgreSQL` guarda writes operativos de `Data Node`
- `BigQuery` sigue siendo la capa analitica subyacente que alimenta exports, reports y API responses
- no introducir `middleware.ts` como boundary de auth para la API externa
- reusar query builders, views y consumers ya existentes del portal
- evitar un repo o servicio extra en la primera fase si el portal actual puede resolverlo

### Control plane vs data plane

**Control plane en PostgreSQL**
- `api_keys`
- `client_preferences`
- `export_logs`
- `report_logs`
- `api_request_logs` si la necesidad operativa lo justifica

**Data plane desde BigQuery / runtime actual**
- KPIs ICO
- listas de proyectos, assets, sprints y modulos
- serving/export views expuestas a clientes

## Alcance por niveles

## DN0 — Data Export

### Objetivo

Agregar export manual desde el portal en formatos `csv`, `xlsx` y `json`, reusando las mismas fuentes de lectura de las vistas client-facing.

### Decision tecnica

- vive dentro del portal actual
- no requiere servicio externo
- auth por sesion existente
- tenant scoping igual a las vistas del portal

### Ruta sugerida

```text
GET /api/export/[viewId]?format=csv|xlsx|json&period=...&from=...&to=...
```

### Fuente de datos

- query builders existentes
- `ICO Engine`
- consumers runtime ya alineados al modelo canonico

### Logging

Registrar export en PostgreSQL, no solo en BigQuery.

Tabla sugerida:
- `greenhouse_core.export_logs`

Campos sugeridos:
- `export_log_id`
- `user_id`
- `client_id`
- `space_id` nullable
- `view_id`
- `format`
- `requested_at`
- `filters_json`

## DN1 — Scheduled Reports

### Objetivo

Enviar digests periodicos por email con KPIs y highlights operativos.

### Decision tecnica

No abrir un repo aparte ni una Cloud Function dedicada en la primera entrega.

Implementacion recomendada:
- configuracion en PostgreSQL
- cron desde `Vercel` o scheduler ya alineado al portal
- envio con `Resend`
- render de email desde el mismo repositorio

### Configuracion sugerida

Tabla:
- `greenhouse_core.client_preferences`

Campos minimos:
- `client_id`
- `reports_enabled`
- `reports_cadence`
- `reports_day`
- `report_recipients`
- `report_format`
- `report_modules`

### Logging sugerido

Tabla:
- `greenhouse_core.report_logs`

Campos minimos:
- `report_log_id`
- `client_id`
- `cadence`
- `format`
- `status`
- `sent_at`
- `error_message`

## DN2 — REST API

### Objetivo

Exponer endpoints read-only para integraciones del cliente.

### Decision tecnica

- auth por API key validada en helper/reusable guard
- no usar `middleware.ts` como mecanismo central
- rate limiting y scopes resueltos por helper de acceso
- responses cacheadas sobre el mismo patron del portal cuando aplique

### API keys

Tabla sugerida:
- `greenhouse_core.api_keys`

Campos:
- `api_key_id`
- `client_id`
- `key_hash`
- `key_prefix`
- `label`
- `scopes`
- `created_at`
- `last_used_at`
- `expires_at`
- `active`

### Request logging

Tabla sugerida:
- `greenhouse_core.api_request_logs`

### Endpoints sugeridos

- `GET /api/v1/kpis`
- `GET /api/v1/kpis/history`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:id/assets`
- `GET /api/v1/sprints`
- `GET /api/v1/capabilities`

### Regla de auth

- validar API key
- resolver `client_id`
- aplicar scopes
- aplicar tenant filtering
- nunca confiar en IDs entregados por el browser o por el cliente sin revalidarlos contra el scope de la key

## DN3 — MCP

### Objetivo

Exponer herramientas para agentes de IA sobre la API/Data Node ya estabilizada.

### Decision tecnica

`MCP` no es foundation. Es un adapter de capa superior.

Orden correcto:
1. export estable
2. reports estables
3. API v1 estable
4. MCP sobre esa API

### Regla operativa

No abrir el trabajo de `MCP` si:
- la API externa todavia no tiene auth/scopes claros
- los contratos de response todavia se siguen moviendo
- el `ICO Engine` o capability data aun no estan estables para consumo externo

## Seguridad

- `NextAuth` para export manual dentro del portal
- API keys hasheadas para la API externa
- rate limiting por key
- logs de export/report/api request
- signed URLs solo si un export asinc o attachment lo exige; no introducirlas desde el dia 1 si la respuesta directa ya cubre el caso

## Roadmap recomendado

### Fase 1

- `DN0` completo
- export logs en PostgreSQL
- sin servicio externo adicional

### Fase 2

- `DN1` reports
- preferencias y logs en PostgreSQL
- `Resend` como delivery

### Fase 3

- `DN2` API v1
- API key management
- docs para cliente

### Fase 4

- `DN3` MCP
- tools para cliente y modo interno Efeonce

## Criterios de aceptacion

- `DN0` no depende de BigQuery como store de configuracion
- no se usa `middleware.ts` como estrategia central de auth del Data Node
- preferencias, API keys y logs operativos viven en PostgreSQL
- exports reusan el runtime/query layer actual del portal
- `Scheduled Reports` se montan sobre el repositorio e infraestructura actual antes de justificar un servicio aparte
- `MCP` queda explicitamente downstream de la API y no como prerequisito

## Nota final

La `v1` sigue siendo valiosa como vision comercial y de producto.

La `v2` es la referencia de implementacion porque alinea `Data Node` con:
- `Postgres-first`
- `Identity & Access V2`
- `Space/client` contextual actual
- cron/runtime existente del portal
- el patron ya usado en otros dominios del repo
