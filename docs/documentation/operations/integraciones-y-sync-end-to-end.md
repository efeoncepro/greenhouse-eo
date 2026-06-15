# Integraciones y Sync end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Integraciones / Sync / Webhooks
> **Rutas principales:** `/admin/integrations`, `/admin/integrations/hubspot`, `/api/admin/integrations/*`, `/api/integrations/*`, `/api/webhooks/*`, `/api/cron/*`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`, `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`, `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Estado de verificacion

Documento reconciliado el 2026-06-15 contra codigo, arquitectura, schema/migrations y DB viva con datos agregados sin PII. La conexion Postgres respondio desde `greenhouse_app` con usuario runtime `greenhouse_app` a las 2026-06-15 10:50 UTC. Evidencia revisada: `src/lib/integrations/**`, `src/lib/webhooks/**`, `src/lib/sync/**`, rutas admin de integrations, crons, scripts HubSpot/Nubox/Notion y tablas `greenhouse_sync.*`.

Snapshot DB agregado del ambiente consultado:

- `greenhouse_sync.integration_registry`: 7 integraciones activas, 6 `ready` y 1 `warning`.
- `greenhouse_sync.source_sync_runs` ultimos 7 dias: senales vivas de `hubspot`, `nubox`, `notion`, `finance`, `azure-ad`, `postgres_outbox`, `reactive_worker`, `teams_notification`, `previred`, reliability y workers comerciales; hay estados `succeeded`, `partial` y `failed`, por lo que partial success/failure no son casos teoricos.
- `greenhouse_sync.webhook_endpoints`: endpoints activos para GitHub, HubSpot, Microsoft Teams, Notion y ZapSign.
- `greenhouse_sync.webhook_inbox_events` ultimos 7 dias: 10.879 `processed` y 5 `failed`.
- `greenhouse_sync.webhook_deliveries`: 309 `succeeded` y 5 `dead_letter`.

## Que es

Integraciones y Sync es la capa nativa que conecta Greenhouse con sistemas externos y fuentes internas asincronas. Su objetivo no es simplemente "llamar APIs"; su objetivo es convertir evidencia externa en datos gobernados, trazables, reintentables y consumibles por dominios producto.

El contrato canonico es:

1. **Source adapter:** habla con la fuente externa.
2. **Raw ledger:** guarda evidencia cruda o snapshot raw.
3. **Conformed snapshot:** normaliza campos y estados.
4. **Product projection:** actualiza tablas/lecturas del dominio consumidor.
5. **Status/readiness:** expone salud, freshness, errores y partial success.
6. **Replay/backfill:** permite reconstruir sin mutar a ciegas.

## Entidades principales

- **Integration registry:** `greenhouse_sync.integration_registry`, catalogo activo de integraciones, owner, tipo, source system, cadencia, endpoint, estado readiness y pause/resume.
- **Source sync run:** `greenhouse_sync.source_sync_runs`, bitacora de corridas por source system, status, conteos y tiempos.
- **Source sync failure:** `greenhouse_sync.source_sync_failures`, fallas estructuradas por run/check.
- **Watermark:** checkpoint de avance incremental.
- **Data quality run/check:** `greenhouse_sync.integration_data_quality_runs` y `integration_data_quality_checks`, auditorias de calidad por monitor.
- **Service sync queue:** `greenhouse_sync.service_sync_queue`, cola de write-back asincrono para servicios/HubSpot.
- **Outbox event:** `greenhouse_sync.outbox_events`, eventos internos para consumidores reactivos.
- **Webhook endpoint:** `greenhouse_sync.webhook_endpoints`, definicion inbound por provider/handler/auth.
- **Webhook inbox event:** `greenhouse_sync.webhook_inbox_events`, evento inbound recibido, idempotente y procesable.
- **Webhook subscription/delivery/attempt:** salida outbound, retries y trazabilidad de entregas.

## Que hace automatico Greenhouse

- Lista integraciones activas desde `integration_registry`.
- Deriva health desde `source_sync_runs`, freshness por fuente y enriquecimientos especificos como Notion raw freshness o HubSpot services freshness.
- Permite pausar una integracion marcando `paused_at`, `paused_reason` y readiness `blocked`.
- Permite reanudar integracion limpiando pause y volviendo readiness a `ready`.
- Dispara sync manual llamando el `sync_endpoint` registrado con `CRON_SECRET`, como si fuera Vercel Cron.
- Bloquea trigger manual si la integracion esta pausada, no tiene endpoint o falta `CRON_SECRET`.
- Registra corridas y fallas estructuradas para distinguir succeeded, failed, degraded o partial success.
- En webhooks inbound, normaliza recepcion, auth, idempotency key, payload redacted y estado de procesamiento.
- En webhooks outbound, firma, encola, reintenta y registra cada intento.

## Que hace el operador

- Revisa `/admin/integrations` para saber si una integracion esta healthy, degraded, down o idle.
- Pausa una integracion cuando una fuente externa esta rompiendo datos o generando writes riesgosos.
- Reanuda solo cuando la causa de pausa fue resuelta.
- Ejecuta sync manual cuando hay endpoint gobernado y una razon operativa.
- Revisa data quality antes de declarar que una integracion "esta sana".
- No debe saltarse raw/conformed/projection escribiendo directo en tablas producto.
- No debe borrar runs/failures para "limpiar" paneles.

## Integraciones relevantes

### HubSpot

HubSpot participa en comercial, products, companies, services, quotes y lifecycle de parties. Los flujos correctos usan Cloud Run/middleware o scripts especializados, outbox/events y `source_sync_runs`. HubSpot no debe convertirse en fuente unica si Greenhouse ya tiene source of truth interno para una entidad.

### Notion

Notion alimenta Delivery/operaciones y transiciones demo. La arquitectura exige raw freshness real, titulos reales o `NULL` cuando falten, warnings en `source_sync_failures` y prohibicion de placeholders sentinela. El webhook de Notion es aviso; la fuente de verdad se re-fetch/normaliza.

### Nubox

Nubox participa en finance/quotes y syncs programadas. El patron esperado es raw BigQuery, conformed BigQuery, projection Postgres y runs en `source_sync_runs`.

### Webhooks

Los webhooks inbound entran por `/api/webhooks/[endpointKey]`, se autentican segun endpoint, se guardan en inbox y luego se procesan. Los outbound se encolan como deliveries, se firman y se reintentan desde dispatcher.

## Estados de salud

- **healthy:** hay runs exitosos recientes y freshness aceptable.
- **degraded:** hay datos parciales, freshness vieja o readiness especifica fallando.
- **down:** fallas recientes o freshness critica.
- **idle:** no hay runs ni fallas para esa integracion.
- **blocked:** integracion pausada o bloqueada operativamente.

## Flujo: sync programada

1. Vercel Cron o Cloud Scheduler llama endpoint `/api/cron/*`.
2. El endpoint valida secreto/guard.
3. Adapter consulta fuente externa o servicio interno.
4. Se registra run en `source_sync_runs`.
5. Se guarda raw evidence.
6. Se produce conformed snapshot.
7. Se actualiza projection producto.
8. Se actualizan watermarks.
9. Si hay error, se registra failure estructurada y estado degraded/failed.

## Flujo: sync manual desde Admin

1. Operador abre `/admin/integrations`.
2. Selecciona integracion y solicita sync.
3. API lee `integration_registry`.
4. Si `paused_at` existe, responde que no dispara.
5. Si no hay `sync_endpoint`, responde passive integration.
6. Si falta `CRON_SECRET`, responde configuracion incompleta.
7. Si todo esta listo, llama el endpoint interno con timeout.
8. El resultado indica si fue disparada, no si toda la cadena ya se proyecto.

## Flujo: webhook inbound

1. Provider llama `/api/webhooks/[endpointKey]`.
2. Greenhouse valida endpoint activo y auth mode.
3. Calcula o lee idempotency key.
4. Inserta `webhook_inbox_events`; si ya existe, no duplica procesamiento.
5. Handler procesa o agenda trabajo.
6. Estados y errores quedan auditables.

## Fronteras importantes

- Trigger manual no equivale a sync completada.
- Run exitoso no siempre equivale a data quality perfecta.
- Webhook recibido no equivale a fuente final leida.
- Pausar una integracion no borra datos existentes.
- Partial success debe declararse, no ocultarse como success completo.
- Replay/backfill debe usar rutas gobernadas; no scripts ad hoc sin evidencia.

## Preguntas que Nexa debe responder bien

- "Como se si Notion esta sincronizando bien?"
- "Que es raw, conformed y projection?"
- "Puedo disparar una sync manual?"
- "Que pasa si una integracion esta pausada?"
- "Que significa partial success?"
- "Un webhook de Notion ya trae toda la data?"
- "Como se reintenta una entrega outbound?"
- "Por que no puedo escribir directo en la tabla producto?"

## Referencias de codigo y DB

- `src/lib/integrations/registry.ts`
- `src/lib/integrations/health.ts`
- `src/lib/integrations/sync-trigger.ts`
- `src/lib/integrations/notion-sync-operational-overview.ts`
- `src/lib/webhooks/store.ts`
- `src/lib/sync/event-catalog.ts`
- `scripts/sync-source-runtime-projections.ts`
- `scripts/setup-postgres-webhooks.sql`
- `migrations/20260402001400000_integration-registry.sql`
- `migrations/20260403110709982_integration-data-quality-monitoring.sql`
- Tablas: `greenhouse_sync.integration_registry`, `source_sync_runs`, `source_sync_failures`, `integration_data_quality_runs`, `integration_data_quality_checks`, `webhook_endpoints`, `webhook_inbox_events`, `webhook_subscriptions`, `webhook_deliveries`, `webhook_delivery_attempts`, `outbox_events`
