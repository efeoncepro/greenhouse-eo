# Operar Integraciones y Sync

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Integraciones / Sync / Webhooks
> **Rutas:** `/admin/integrations`, `/api/admin/integrations/*`, `/api/webhooks/*`, `/api/cron/*`
> **Documentacion relacionada:** `docs/documentation/operations/integraciones-y-sync-end-to-end.md`, `docs/manual-de-uso/operations/notion-bq-sync-operacion.md`

## Para que sirve

Este manual explica como revisar salud de integraciones, disparar una sync manual, pausar/reanudar conectores y diagnosticar webhooks sin romper la cadena raw -> conformed -> projection.

## Antes de empezar

Necesitas acceso admin a Integrations. Para acciones que disparan sync o pausan conectores, confirma que tienes capability correspondiente y una razon operativa.

No ejecutes syncs manuales para "probar suerte" en produccion si hay una causa de falla no entendida.

## Revisar salud de integraciones

1. Abre `/admin/integrations`.
2. Revisa estado general: healthy, degraded, down, idle o blocked.
3. Revisa freshness y ultima sync.
4. Revisa runs de las ultimas 24 horas y failures.
5. Si es Notion, revisa ademas raw freshness y data quality.
6. Si es HubSpot, revisa freshness de services/companies segun el panel.
7. Si hay degraded, lee la razon antes de ejecutar retry.

## Disparar sync manual

1. Confirma que la integracion no este pausada.
2. Confirma que tenga `sync_endpoint`.
3. Confirma que el entorno tiene `CRON_SECRET`.
4. Ejecuta trigger desde Admin Center.
5. Lee la respuesta: "triggered" solo significa que el endpoint fue llamado.
6. Espera o revisa `source_sync_runs` para confirmar resultado.
7. Revisa data quality si el flujo actualiza datos criticos.

## Pausar una integracion

1. Identifica la integracion.
2. Confirma causa: fuente externa mala, credenciales rotas, mapping riesgoso, writes no deseados.
3. Usa accion pause.
4. Escribe razon concreta.
5. Verifica que readiness quede blocked.
6. Comunica impacto a dominios consumidores.

## Reanudar una integracion

1. Verifica que la causa este resuelta.
2. Revisa si hace falta backfill/replay antes de reanudar.
3. Usa accion resume.
4. Ejecuta una sync controlada si corresponde.
5. Revisa runs, failures y data quality.

## Diagnosticar webhook inbound

1. Identifica `endpointKey`.
2. Confirma que el endpoint este activo.
3. Revisa auth mode y secret configurado.
4. Busca inbox events por provider/idempotency key.
5. Si el evento esta duplicado, no lo reproceses manualmente sin revisar idempotencia.
6. Si el handler fallo, registra replay o fix gobernado.

## Diagnosticar webhook outbound

1. Revisa subscription activa.
2. Busca delivery por event id.
3. Revisa attempts y ultimo error.
4. Confirma si esta pendiente de retry o dead-letter.
5. No cambies status a mano salvo runbook explicitamente aprobado.

## Que significan los estados

- **healthy:** ultima evidencia sana y freshness aceptable.
- **degraded:** parte de la cadena falla o esta atrasada.
- **down:** fallas criticas o sin success reciente.
- **idle:** sin actividad suficiente para clasificar.
- **blocked:** pausada o bloqueada por operador/sistema.

## Problemas comunes

### La sync manual dice success pero los datos no cambiaron

La respuesta del trigger solo confirma llamada HTTP. Revisa `source_sync_runs`, projection y data quality.

### Notion envio webhook pero no veo cambio

El webhook es aviso. Greenhouse debe re-fetch, normalizar y proyectar.

### Una integracion tiene runs sanos pero datos malos

Revisa data quality checks. Run sano no equivale a calidad completa.

### Falta `CRON_SECRET`

No intentes llamar endpoints internos sin secreto. Configura entorno o marca rollout pendiente.

## Que no hacer

- No escribir directo en tablas producto saltandote raw/conformed/projection.
- No borrar failures para limpiar paneles.
- No reanudar una integracion pausada sin resolver causa.
- No declarar healthy solo por un HTTP 200.
- No ignorar partial success.

## Referencias tecnicas

- `src/lib/integrations/registry.ts`
- `src/lib/integrations/health.ts`
- `src/lib/integrations/sync-trigger.ts`
- `src/lib/webhooks/store.ts`
- `greenhouse_sync.integration_registry`
- `greenhouse_sync.source_sync_runs`
- `greenhouse_sync.source_sync_failures`
- `greenhouse_sync.webhook_*`
