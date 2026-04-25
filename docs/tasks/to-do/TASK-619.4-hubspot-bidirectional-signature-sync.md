# TASK-619.4 — HubSpot Bidirectional Signature Sync

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio` (~2 dias)
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-619, TASK-620.6`
- Branch: `task/TASK-619.4-hubspot-bidirectional-signature-sync`

## Summary

Bidirectional sync entre Greenhouse signature_status y HubSpot deal stage. Cuando ZapSign reporta `signed`, HubSpot deal pasa a stage `'Signed - Awaiting Invoice'` (nuevo, separado de `Closed Won`). Si alguien cambia el deal stage manualmente en HubSpot a `Closed Won` o `Closed Lost`, refleja en Greenhouse via webhook inbound. Anti-ping-pong + conflict resolution policy explicita.

## Why This Task Exists

TASK-619 menciona superficialmente el sync con HubSpot pero sin spec. Sin esto:

- Sales rep firma en ZapSign pero deal queda en stage `Negotiation` indefinidamente
- Finance no sabe que puede facturar (deal stage es la senial de "ready")
- Si finance mueve deal manualmente a `Closed Won` antes de firma, Greenhouse no se entera
- Riesgo ping-pong: cada sync crea evento que dispara el otro

## Goal

- Stage HubSpot nuevo `Signed - Awaiting Invoice` creado en pipeline configuration
- Outbound sync: `commercial.quote.countersigned_by_efeonce` event -> HubSpot deal stage update
- Inbound sync: HubSpot webhook deal.propertyChange -> reflejar en Greenhouse signature_status si aplica
- Anti-ping-pong via `last_modified_by_source_system` (mismo patron TASK-587)
- Conflict resolution: si HubSpot dice `Closed Won` y Greenhouse dice `signed`, no-op (consistente). Si HubSpot dice `Closed Lost` y Greenhouse dice `signed`, alertar discrepancia humana.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

Reglas:

- jamas modificar HubSpot deal stage sin emitir source_system='greenhouse_signature_sync' marker
- jamas procesar webhook si source_system='greenhouse_*' (anti-ping-pong)
- conflicts logged, no auto-resueltos

## Dependencies & Impact

### Depends on

- TASK-619 (eventos signature emitidos)
- TASK-620.6 (HubSpot field mapping)
- HubSpot webhook infra existente

### Blocks / Impacts

- Finance team workflow (saben cuando facturar)
- Pipeline lane (TASK-557) muestra stage correcto

### Files owned

- `src/lib/integrations/hubspot/deal-stage-sync.ts` (nuevo)
- `src/app/api/webhooks/hubspot/deal-propertyChange/route.ts` (modificado o nuevo)
- `src/lib/sync/reactors/quote-signature-hubspot-reactor.ts` (nuevo)
- `migrations/YYYYMMDD_task-619.4-hubspot-deal-stage-mapping.sql` (nuevo)

## Scope

### Slice 1 — Stage configuration + mapping table (0.5 dia)

Migracion:

```sql
CREATE TABLE greenhouse_commercial.hubspot_deal_stage_mapping (
  greenhouse_signature_status text PRIMARY KEY,
  hubspot_deal_stage_id text NOT NULL,
  hubspot_pipeline_id text NOT NULL,
  notes text
);

INSERT INTO ... VALUES
  ('signed', 'signed_awaiting_invoice', 'default', '...'),
  ('declined', 'closed_lost', 'default', '...'),
  ('voided_after_signature', 'closed_lost', 'default', '...');
```

Crear stage `signed_awaiting_invoice` en HubSpot Pipeline configuration (manual + documentar).

### Slice 2 — Outbound reactor (0.5 dia)

`src/lib/sync/reactors/quote-signature-hubspot-reactor.ts`:

- Suscrito a outbox events `commercial.quote.countersigned_by_efeonce`, `signature_declined`, `signature_voided_after_signature`
- Lookup `quote.hubspot_deal_id` + lookup `hubspot_deal_stage_mapping`
- POST a HubSpot updateDealStage con `properties.last_modified_by_source_system='greenhouse_signature_sync'`
- Idempotencia via `webhook_event_log` ya existente

### Slice 3 — Inbound webhook handler (0.5 dia)

Webhook handler procesa `deal.propertyChange` para `dealstage`:

- Lee deal HubSpot
- Si `properties.last_modified_by_source_system === 'greenhouse_*'` -> ignore (anti-ping-pong)
- Si stage cambio a `closed_won` y greenhouse dice `signed` -> no-op consistente
- Si stage cambio a `closed_lost` y greenhouse dice `signed` -> log conflict + alerta Slack

### Slice 4 — Conflict resolution + tests (0.5 dia)

Tabla `signature_sync_conflicts` con (deal_id, conflict_type, hubspot_stage, greenhouse_status, detected_at, resolved_at, resolved_by). UI conflict resolution en Admin Center (Fase 2).

Tests:
- Reactor outbound: signed event -> HubSpot stage updated correctamente
- Webhook inbound: ignora propio source_system
- Conflict: signed vs Closed Lost -> log + alerta

## Out of Scope

- Sync de otros HubSpot deal properties (solo dealstage)
- UI conflict resolution (Fase 2)
- Multi-pipeline support (solo default pipeline en v1)

## Acceptance Criteria

- [ ] stage `signed_awaiting_invoice` creado en HubSpot prod
- [ ] mapping table poblada
- [ ] outbound reactor productivo
- [ ] inbound webhook ignora ping-pong
- [ ] conflicts logged a tabla + alerta
- [ ] tests passing

## Verification

- E2E: firmar quote -> verificar HubSpot deal stage cambia a `signed_awaiting_invoice` en < 30s
- E2E: editar manualmente HubSpot deal stage -> verificar no rebota como ciclo
- Conflict: forzar discrepancia -> verificar log + alerta

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con E2E results
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` updated
