# TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover

## Delta 2026-04-02

- `TASK-201` ya quedó cerrada.
- Marzo 2026 ya no es solo un “caso por reconciliar”; ahora existe congelado en Greenhouse con snapshot task-level `locked`.
- El residual frente al reporte histórico de Notion quedó documentado como historia mutable posterior al cierre.
- Consecuencia para esta task:
  - la publicación mensual a Notion debe salir desde el snapshot congelado del período
  - el runbook de `Abril 2026` debe incluir explícitamente `freeze:delivery-performance-period` antes de publicar
- Delta de auditoría:
  - el output canónico base ya existe en Greenhouse como combinación de `ico_engine.delivery_task_monthly_snapshots`, `ico_engine.performance_report_monthly` y `greenhouse_serving.agency_performance_reports`
  - el gap principal ya no es “definir el reporte desde cero”, sino formalizar e implementar el `publication contract` `Greenhouse -> Notion`
  - el cutover debe reutilizar el control plane de integraciones y no vivir como script aislado
- Delta de implementación:
  - se creó el target canónico de salida en `greenhouse_core.space_notion_publication_targets`
  - se creó el ledger `greenhouse_sync.notion_publication_runs`
  - se registró la integración outbound `notion_delivery_performance_reports`
  - se implementó la route cron `GET /api/cron/notion-delivery-performance-publish`
  - se implementó writer real a la base Notion `Performance Reports`
  - la validación `dryRun` de `Marzo 2026` resolvió correctamente:
    - `space_id = spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`
    - `target_database_id = 935718d8e8ec4a79b0261be1ce300f73`
    - `target_page_id = 4504bd15-76da-4cef-8404-c2d8b0769b30`
    - `payloadHash = 5a7c586865bd7d5e745da78a046ac9edc7344e40939afe4f5a0e59a98a188ad4`

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `58`
- Domain: `ops`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Cerrar el carril operativo para que Greenhouse calcule el `Performance Report` mensual y Notion lo consuma como resultado canónico, en vez de recalcularlo por separado.

Esta task toma la base canónica ya cerrada en cálculo, semántica y congelamiento mensual, y la convierte en un flujo operativo reproducible de publicación `Greenhouse -> Notion`.

## Why This Task Exists

La meta final de la lane no es solo “igualar marzo”. Es cambiar la fuente de verdad:

- Greenhouse calcula el informe
- Notion consume los resultados
- Notion deja de ser un motor alterno de cálculo

Sin este cutover, la organización seguiría expuesta a drift semántico aunque marzo ya cierre bien en Greenhouse.

## Goal

- Formalizar el `publication payload` canónico del `Performance Report` desde Greenhouse.
- Definir cómo se publica o sincroniza a Notion.
- Dejar el operating model mensual para producir el reporte de `Abril 2026` desde Greenhouse.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- Notion debe consumir resultados canónicos de Greenhouse
- el proceso mensual debe ser reproducible, auditable y con criterios de readiness explícitos
- la publicación no debe reintroducir reglas de negocio implícitas fuera de Greenhouse

## Dependencies & Impact

### Depends on

- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- integraciones Notion necesarias para publicación o consumo

### Impacts to

- operating model mensual de Delivery
- scorecards compartidos con `Efeonce Admin`
- surfaces futuras que consuman reportes mensuales canonizados

### Files owned

- `docs/tasks/complete/TASK-202-delivery-performance-notion-publication-cutover.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `src/lib/space-notion/**` que se creen para publicación
- `src/app/api/admin/integrations/**` que se creen para publicación
- scripts, jobs o readers de publicación que se creen para esta lane

## Current Repo State

### Ya existe

- snapshots task-level congelados en `ico_engine.delivery_task_monthly_snapshots`
- output mensual canónico en `ico_engine.performance_report_monthly`
- serving cache mensual en `greenhouse_serving.agency_performance_reports`
- documentación inicial del operating model
- baseline real de reporte en Notion
- epic `TASK-196` como paraguas de la lane
- control plane de integraciones con `integration_registry`, triggers y readiness

### Gap actual

- no quedan gaps estructurales en el carril de publicación
- queda pendiente únicamente la operación mensual del período real siguiente (`Abril 2026`)

## Scope

### Slice 1 - Output canónico

- formalizar el dataset o payload mensual canónico ya calculado por Greenhouse
- definir qué números y hallazgos se publican
- definir el grano mínimo necesario para trazabilidad

### Slice 2 - Publicación a Notion

- definir si la salida va a una base, página o ambas
- definir qué parte es dato canónico y qué parte es narrativa
- dejar el mecanismo de actualización mensual con idempotencia y trazabilidad

### Slice 3 - Operating model mensual

- dejar runbook para cierre y publicación
- definir validaciones previas y owner operativo
- dejar criterio para declarar `Abril 2026` como primer período Greenhouse-first
- colgar la operación del control plane de integraciones nativas

## Out of Scope

- reabrir definiciones de fórmula o identidad
- rehacer todo el workspace de Notion
- diseñar una UI nueva del reporte en el portal

## Acceptance Criteria

- [x] Existe definición del `publication payload` canónico mensual desde Greenhouse.
- [x] Existe plan claro de consumo/publicación en Notion.
- [x] Existe un mecanismo técnico implementado para publicar el reporte desde Greenhouse a Notion.
- [x] Existe runbook mensual para cierre, validación y publicación.
- [x] `Abril 2026` queda en condiciones de operarse como primer período Greenhouse-first.

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm build`
- `GET /api/cron/notion-delivery-performance-publish?year=2026&month=3&dryRun=true`
