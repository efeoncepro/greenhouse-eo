# TASK-684 — Public Tenders Bid / No-Bid Workflow

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-683`
- Branch: `task/TASK-684-public-tenders-bid-no-bid`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agrega workflow interno para decidir `watch`, `qualify`, `bid/quote/respond`, `no-bid`, asignar owner y registrar rationale. El modulo pasa de discovery a gestion comercial sin automatizar postulacion externa.

## Why This Task Exists

Las oportunidades publicas necesitan gobierno interno antes de crear deals o quotes. Sin decision traceable, el equipo no sabe por que una licitacion se persiguio, se descarto o quedo pendiente.

## Goal

- Persistir decisiones internas por oportunidad.
- Soportar ownership, estado, rationale, deadline y actividad.
- Emitir eventos para notificaciones e integraciones posteriores.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Decision interna no debe mutar el estado externo de Mercado Publico.
- Toda accion requiere capability adecuada.
- Usar `greenhouse-agent`; UI requiere `greenhouse-ui-orchestrator` y copy `greenhouse-ux-content-accessibility`.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-683`

### Blocks / Impacts

- `TASK-686`
- `TASK-687`
- `TASK-688`

### Files owned

- `migrations/`
- `src/lib/commercial/public-procurement/`
- `src/app/api/commercial/`
- `src/views/greenhouse/commercial/`

## Current Repo State

### Already exists

- Workbench quedara definido por `TASK-683`.

### Gap

- No hay decision log ni internal lifecycle para oportunidades publicas.

## Scope

### Slice 1 — Decision Model

- Crear/usar tabla `public_procurement_decisions`.
- Definir estados internos y rationale required para descartes.

### Slice 2 — Commands And Events

- Implementar commands idempotentes para assign/status/rationale.
- Publicar eventos de decision/assignment/deadline.

### Slice 3 — UI Controls

- Agregar controles en detail para owner, decision y notes.
- Mostrar history/audit minimal.

## Out of Scope

- Crear deal/quote automaticamente.
- Enviar postulacion externa.

## Acceptance Criteria

- [ ] Decision y owner quedan persistidos por `space_id`.
- [ ] `no-bid` exige rationale.
- [ ] Eventos internos se publican con correlation id.
- [ ] UI respeta permisos de read/evaluate/assign.

## Verification

- `pnpm migrate:up`
- Tests de commands.
- `pnpm lint`
- `pnpm build`

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] schema snapshot/db types actualizados si aplica.

## Follow-ups

- `TASK-686`
- `TASK-687`
