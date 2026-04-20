# TASK-480 — Pricing Engine Cost Resolver, Provenance & Confidence

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-477`, `TASK-478`, `TASK-479`, `TASK-475`
- Branch: `task/TASK-480-pricing-engine-cost-resolver-provenance-confidence`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Evolucionar el pricing engine para que resuelva la mejor base de costo disponible por línea usando la capa `Commercial Cost Basis`, persistiendo provenance, confidence, freshness y snapshot metadata. El engine deja de depender de montos manuales como camino principal y pasa a resolver `actual`, `blended`, `modeled` o `manual` con una semántica única.

## Why This Task Exists

Aunque existan buenas foundations de roles, personas y tools, si el engine sigue preguntando “monto”, nada cambió realmente. Esta task convierte al engine en consumidor de la jerarquía de costo y en emisor de metadata confiable para UI, PDF, email, governance y analytics.

## Goal

- Resolver costo por línea desde fuentes shared.
- Persistir provenance/confidence/freshness.
- Congelar snapshot de costo de forma consistente para el lifecycle de cotizaciones.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-476-commercial-cost-basis-program.md`
- `docs/tasks/to-do/TASK-475-greenhouse-fx-currency-platform-foundation.md`
- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

Reglas obligatorias:

- La prioridad de resolución debe ser explícita y determinística.
- El engine no debe recalcular lógica de FX ni de costo factual inline; consume readers shared.
- Override manual sigue existiendo, pero como excepción gobernada, no como camino default.
- Repricing bulk o recomputes masivos salen del runtime interactivo y se delegan a `commercial-cost-worker`, sobre `POST /quotes/reprice-bulk` cuando esta task lo habilite.

## Dependencies & Impact

### Depends on

- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/service-catalog-expand.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`

### Blocks / Impacts

- `TASK-481`
- `TASK-466`

### Files owned

- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/service-catalog-expand.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- pricing engine v2
- quote canonical store
- service expansion
- `TASK-483` ya dejó `commercial-cost-worker` como compute lane canónico y reservó `POST /quotes/reprice-bulk` para el follow-on batch de esta task.

### Gap

- No existe un cost resolver shared con provenance/confidence/freshness persistida.

## Scope

### Slice 1 — Resolver contract

- Definir la salida canónica del cost resolver:
  - `resolvedAmount`
  - `currency`
  - `sourceKind`
  - `sourceRef`
  - `snapshotDate`
  - `confidence`
  - `fxRateUsed`
  - `assumptionNotes`

### Slice 2 — Engine integration

- Hacer que el engine consuma `member_actual`, `role_blended`, `role_modeled`, `tool_provider_actual`, `tool_catalog_baseline`, `manual_override`.

### Slice 3 — Snapshot persistence

- Persistir la metadata suficiente para que la cotización y sus downstreams puedan explicarse históricamente.

## Out of Scope

- UI del builder.
- Facturación multi-moneda client-facing.

## Acceptance Criteria

- [ ] El engine resuelve costo desde una jerarquía explícita de fuentes.
- [ ] Cada línea queda con provenance/confidence/freshness suficientes.
- [ ] Override manual sigue soportado, pero no es el camino principal.
- [ ] La salida del engine ya es consumible por UI y document chain sin recalcular de nuevo.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
