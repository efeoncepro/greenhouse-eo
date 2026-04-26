# TASK-686 — Tender To Deal / Quote Bridge

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-684`
- Branch: `task/TASK-686-tender-to-deal-quote-bridge`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Conecta oportunidades publicas aprobadas internamente con el ecosistema Commercial existente: party/deal, quote builder, product catalog y links de trazabilidad. Permite pasar de bid/no-bid a pipeline comercial sin duplicar logica de cotizaciones.

## Why This Task Exists

El modulo de licitaciones debe hacer sinergia con Greenhouse, no ser un silo. Cuando una oportunidad califica, debe poder crear o vincular organization/deal/quote usando contratos comerciales existentes.

## Goal

- Crear links entre `public_procurement_opportunity` y deals/quotes/contracts.
- Implementar commands controlados para crear deal/quote desde oportunidad.
- Prellenar contexto de quote con items/requirements cuando sea seguro.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Reutilizar quote builder, party lifecycle y deal commands existentes.
- No duplicar product catalog ni pricing logic.
- Toda accion requiere capability fina.
- Usar `greenhouse-agent`; UI/API usan `greenhouse-ui-orchestrator`, `greenhouse-ux-content-accessibility` y `vercel:nextjs` segun corresponda.

## Normative Docs

- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-684`
- Existing commercial quote/deal runtime in `src/lib/commercial/` and `src/app/api/finance/quotes/`.

### Blocks / Impacts

- Futuro proposal assistant.
- Reporting de pipeline publico.

### Files owned

- `src/lib/commercial/public-procurement/`
- `src/lib/commercial/`
- `src/app/api/commercial/`
- `src/views/greenhouse/commercial/`
- `src/app/api/finance/quotes/`

## Current Repo State

### Already exists

- Quote/deal infrastructure en `src/lib/commercial/` y rutas finance/commercial.

### Gap

- No hay link canonico entre oportunidades publicas y objetos comerciales.

## Scope

### Slice 1 — Link Model

- Crear/usar tabla `public_procurement_links`.
- Soportar link a organization, deal, quote y contract si aplica.

### Slice 2 — Commands

- Implementar create/link deal desde oportunidad.
- Implementar create draft quote desde oportunidad reutilizando quote builder/contracts existentes.

### Slice 3 — UI Integration

- Agregar acciones en detail cuando decision sea compatible.
- Mostrar objetos vinculados y estado.

## Out of Scope

- Enviar oferta a Mercado Publico.
- Calcular precios fuera del pricing engine existente.
- Crear cliente duplicado sin party lifecycle.

## Acceptance Criteria

- [ ] Un usuario autorizado puede vincular o crear deal desde oportunidad.
- [ ] Un usuario autorizado puede iniciar draft quote reutilizando quote builder.
- [ ] Links son idempotentes y auditables.
- [ ] No se duplican organizaciones si ya existe party.

## Verification

- Tests de commands/linking.
- `pnpm lint`
- `pnpm build`
- Smoke manual de flujo con datos de prueba.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] changelog/client changelog si la capacidad queda visible.

## Follow-ups

- Proposal/response assistant future task.
