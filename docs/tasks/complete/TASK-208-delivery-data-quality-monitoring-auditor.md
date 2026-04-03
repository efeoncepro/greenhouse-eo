# TASK-208 - Delivery Data Quality Monitoring & Drift Auditor

## Delta 2026-04-03 — Implementation closed

- `TASK-208` queda implementada y cerrada como monitor recurrente de calidad para `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
- se agregaron tablas históricas especializadas en `greenhouse_sync`:
  - `integration_data_quality_runs`
  - `integration_data_quality_checks`
- se agregó el helper operativo `src/lib/integrations/notion-delivery-data-quality.ts` para:
  - correr el auditor por `space_id`
  - persistir score, checks y evidencia
  - emitir alertas Slack en estados `degraded` y `broken`
  - exponer overview para admin e historial tenant-scoped
- la ejecución recurrente quedó cerrada en dos carriles:
  - cron dedicado `GET /api/cron/notion-delivery-data-quality`
  - hook post-sync dentro de `GET /api/cron/sync-conformed`
- las surfaces reutilizadas quedaron conectadas al monitor:
  - `/admin/integrations`
  - `/admin/ops-health`
  - `TenantNotionPanel`
- el contrato operativo ya no depende de una auditoría manual aislada:
  - ahora existe scoring persistido `healthy / degraded / broken`
  - historial corto de runs
  - findings accionables por `space`

## Delta 2026-04-03 — Audit correction after repo discovery

- La spec queda corregida para reflejar el estado real del repo antes de implementar:
  - el helper reusable ya existe en `src/lib/space-notion/notion-parity-audit.ts`
  - la route admin tenant-scoped ya existe en `GET /api/admin/tenants/[id]/notion-parity-audit`
  - el gap real no es “crear el auditor desde cero”, sino convertirlo en monitoreo recurrente, scoring histórico, persistencia especializada y visibilidad operativa
- El baseline `docs/architecture/schema-snapshot-baseline.sql` no es suficiente como source of truth de este dominio:
  - no incluye `greenhouse_sync.integration_registry`
  - no incluye `greenhouse_sync.notion_publication_runs`
  - no incluye `greenhouse_sync.notion_space_schema_snapshots`
  - no incluye `greenhouse_sync.notion_space_schema_drift_events`
  - no incluye `greenhouse_sync.notion_space_kpi_readiness`
- La implementación debe leer el estado actual combinando:
  - migraciones en `migrations/`
  - setup scripts en `scripts/`
  - contratos efectivos en `src/types/db.d.ts`
- La spec también queda corregida en cuanto a surfaces existentes:
  - ya existen `/admin/integrations`, `/admin/ops-health` y `TenantNotionPanel` como capas reutilizables para exponer el monitor
  - el gap es la señal específica de data quality para `Notion -> raw -> conformed`, no la ausencia total de UI/admin

## Delta 2026-04-03 — Impact after TASK-207 closure

- `TASK-207` ya cerró el hardening estructural base:
  - gate real de frescura por `space_id` sobre `notion_ops`
  - preservación de `tarea_principal_ids` / `subtareas_ids` en `greenhouse_conformed.delivery_tasks`
  - validación runtime `raw -> transformed -> persisted`
  - convergencia práctica a writer canónico porque el carril legacy ya no sobreescribe conformed por defecto
- Implicación:
  - esta lane ya no necesita inventar el contrato mínimo de salud del pipeline
  - debe reutilizar esos guardrails y convertirlos en monitoreo recurrente, scoring histórico y alerting

## Delta 2026-04-03 — Impact after TASK-205 closure

- `TASK-205` ya cerró el primer auditor reusable manual/on-demand:
  - helper `src/lib/space-notion/notion-parity-audit.ts`
  - route admin `GET /api/admin/tenants/[id]/notion-parity-audit`
  - script `pnpm audit:notion-delivery-parity`
- Implicación:
  - esta lane no parte desde cero
  - debe convertir ese auditor on-demand en monitoreo recurrente, scoring operativo y alerting histórico

## Delta 2026-04-03

- Orden de implementación explícito dentro de la secuencia Notion native integration:
  - `TASK-205` va primero
  - `TASK-207` va segundo
  - `TASK-208` va tercero
- Justificación:
  - esta lane no debe nacer antes de entender el drift real
  - ni antes de endurecer la tubería que se quiere monitorear
- Re-encuadre explícito:
  - esta lane no debe vivir como un monitor lateral de Delivery
  - queda definida como observabilidad y data quality de la integración nativa de `Notion` dentro de Greenhouse
  - su foundation shared sigue siendo `TASK-188` y su carril específico de Notion sigue siendo `TASK-187`
- Implicación:
  - el auditor recurrente debe medir salud real de la integración `Notion -> raw -> conformed`, no solo de un consumer aislado
  - cualquier dashboard, helper o cron que nazca aquí debe quedar integrado al operating model nativo de integraciones

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `61`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Crear un proceso continuo de monitoreo y auditoría de data quality para el pipeline de Delivery, de modo que Greenhouse detecte automáticamente desalineaciones entre:

- `Notion` origen
- `notion_ops` raw
- `greenhouse_conformed.delivery_tasks`
- readers y materializaciones downstream cuando aplique

La intención no es esperar otra auditoría manual como la actual. Greenhouse debe quedar con un helper, auditor o job recurrente que diga explícitamente si la data está sana, degradada o rota.

Esta task debe ejecutarse como parte de la integración nativa de `Notion` en Greenhouse, no como una supervisión paralela desconectada del integration layer.

## Why This Task Exists

La auditoría reciente mostró que estábamos ciegos:

- el pipeline podía correr “bien” técnicamente y aun así producir `delivery_tasks` incompleto o stale
- el problema se descubrió solo cuando se comparó manualmente `Notion vs Greenhouse`
- no existía un monitor que alertara:
  - pérdida de filas
  - drift de `task_status`
  - drift de `assignee`
  - drift de `due_date`
  - stale raw vs stale conformed

Sin un auditor continuo de calidad, cualquier fix al sync queda vulnerable a degradarse otra vez sin señal temprana.

## Goal

- Definir y construir un mecanismo recurrente de auditoría de calidad de datos para Delivery.
- Medir y exponer automáticamente drift entre capas del pipeline.
- Dejar señal operativa clara para saber si el pipeline está sano, degradado o roto.

## Recommended Execution Order

1. Ejecutar `TASK-205` primero.
2. Ejecutar `TASK-207` después.
3. Ejecutar `TASK-208` al final.

Razonamiento:

- esta lane convierte aprendizajes y contratos previos en guardrails permanentes
- si se implementa antes, corre el riesgo de monitorear un problema todavía mal definido o una tubería todavía inestable

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- el monitoreo debe integrarse al operating model nativo de `Notion`, no vivir como script paralelo sin ownership de integración
- el monitoreo no puede depender de lectura manual ad hoc
- debe comparar capas reales del pipeline, no solo health general
- debe producir resultados auditables y accionables
- no debe romper el runtime actual para existir
- debe construirse sobre el helper de paridad y guardrails ya cerrados por `TASK-205` y `TASK-207`, no duplicarlos

## Dependencies & Impact

### Depends on

- `TASK-188 - Native Integrations Layer: Platform Governance, Runtime Contracts & Shared Operating Model`
- `TASK-187 - Notion Integration Formalization: Space Onboarding, Schema Governance & KPI Readiness`
- `TASK-205 - Delivery Notion Origin Parity Audit`
- `TASK-207 - Delivery Notion Sync Pipeline Hardening & Freshness Gates`
- `notion_ops.tareas`
- `greenhouse_conformed.delivery_tasks`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/app/api/cron/sync-conformed/route.ts`

### Impacts to

- la observabilidad operativa de la integración nativa de `Notion`
- monitoreo operativo del pipeline Delivery
- alerting y observabilidad de integraciones
- futuras decisiones de `ICO`, reporting y publication
- cualquier lane que quiera asumir que `delivery_tasks` está sano sin verificarlo

### Files owned

- `docs/tasks/complete/TASK-208-delivery-data-quality-monitoring-auditor.md`
- `src/lib/sync/**`
- `src/lib/integrations/**`
- `src/app/api/cron/**`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Current Repo State

### Ya existe

- auditoría manual fuerte en `TASK-205`
- evidencia concreta de drift `Notion -> raw -> conformed`
- timestamps suficientes para detectar stale data en varios casos
- infraestructura de cron y health básica
- guard de frescura real y control-plane de runs cancelados/fallidos cerrados por `TASK-207`
- validación de paridad e invariantes de jerarquía ya integrada al writer canónico
- monitor recurrente persistido en `greenhouse_sync.integration_data_quality_runs`
- checks históricos persistidos en `greenhouse_sync.integration_data_quality_checks`
- cron dedicado y hook post-sync para recalcular salud del pipeline
- visibilidad admin/ops/tenant reutilizando surfaces existentes

### Gap actual

- follow-on futuro: endurecer alert routing multi-canal más allá de Slack si el operating model lo exige
- follow-on futuro: extender el patrón de `integration_data_quality_*` a otros upstreams más allá de `Notion`

## Scope

### Slice 1 - Contrato de calidad

- definir qué checks son mínimos para declarar sano el pipeline:
  - conteo total por `space`
  - conteo por `task_status`
  - conteo con/sin assignee
  - conteo con/sin due date
  - drift por `task_source_id`
  - frescura `raw vs conformed`

### Slice 2 - Auditor reusable

- diseñar un helper o servicio que pueda correr estos checks automáticamente
- permitir ejecución por:
  - `space`
  - período
  - persona de referencia
  - corte global

### Slice 3 - Estado operativo

- definir una salida clara del auditor:
  - `healthy`
  - `degraded`
  - `broken`
- incluir detalles accionables del porqué

### Slice 4 - Ejecución recurrente

- decidir si vive como:
  - cron
  - post-sync hook
  - ambos
- guardar resultados históricos para detectar tendencias y regresiones

### Slice 5 - Alerting y visibilidad

- dejar señal visible cuando el pipeline caiga en drift
- preparar alertas para casos como:
  - missing rows
  - drift de status
  - raw fresco pero conformed viejo
  - gaps por `space`

## Out of Scope

- arreglar el sync por sí solo
- redefinir métricas de Delivery
- publication a Notion
- reemplazar la auditoría estructural de `TASK-205`

## Acceptance Criteria

- [x] Existe un contrato explícito de data quality para Delivery sync.
- [x] Existe un auditor/helper reusable que compare capas del pipeline.
- [x] El auditor puede clasificar el estado del pipeline como sano, degradado o roto.
- [x] Existe una estrategia explícita de ejecución recurrente y almacenamiento de resultados.
- [x] La lane deja claro cómo alertar y cómo actuar cuando se detecta drift.

## Verification

- `pnpm pg:doctor --profile=migrator`
- `pnpm migrate:up`
- `pnpm exec vitest run src/lib/integrations/notion-delivery-data-quality-core.test.ts`
- `pnpm build`
- `pnpm lint`
- `rg -n "new Pool\\(" src scripts`
- validación funcional sobre surfaces reutilizadas:
  - `/admin/integrations`
  - `/admin/ops-health`
  - `TenantNotionPanel`
