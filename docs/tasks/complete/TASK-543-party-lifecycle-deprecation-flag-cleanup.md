# TASK-543 — Party Lifecycle Deprecation & Flag Cleanup (Fase I)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Completada 2026-04-22`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `Ninguna bloqueante de código`
- Branch: `task/TASK-543-party-lifecycle-deprecation-flag-cleanup`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase I del programa TASK-534. Cleanup post-rollout para remover feature flags y branches legacy que ya no agregan rollback real: `GREENHOUSE_PARTY_LIFECYCLE_SYNC`, `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. El objetivo real es dejar el selector unificado como unico carril del Quote Builder, convertir el inbound HubSpot Companies sync en default-on sin env guard, limpiar tests/docs obsoletos y confirmar que no se intenten remover endpoints canónicos `organizations/[id]/*`.

## Why This Task Exists

Las fases anteriores dejaron codigo detras de flags para rollback seguro. Ese rollout ya quedo shippeado en runtime (`TASK-538`, `TASK-539`, `TASK-540`, `TASK-542`), por lo que mantener los flags es deuda: doble branch en Quote Builder, guard rails redundantes en el sync inbound, riesgo de drift documental y confusion en onboarding. Esta fase cierra el rollout y estabiliza el contrato final.

## Goal

- Remover flags `GREENHOUSE_PARTY_LIFECYCLE_SYNC`, `GREENHOUSE_PARTY_SELECTOR_UNIFIED`.
- Eliminar selector legacy de organizations en el Quote Builder.
- Confirmar que no existe ya un `GET /api/commercial/organizations` legacy pendiente en este repo y documentar que los endpoints `GET /api/commercial/organizations/[id]/contacts` y `GET/POST /api/commercial/organizations/[id]/deals` siguen siendo canónicos.
- Cleanup de tests obsoletos.
- Update de docs: remover menciones a "flag", marcar el comportamiento como default.
- Confirmar que no queda dead code en `src/lib/commercial/party/` ni consumidores.

## Delta 2026-04-22 — Cierre

- `QuoteBuilderShell` deja el selector unificado como único carril para create mode.
- `sync-hubspot-companies.ts` y `GET /api/cron/hubspot-companies-sync` quedan default-on sin `GREENHOUSE_PARTY_LIFECYCLE_SYNC`.
- Se elimina el helper legacy `src/lib/commercial/party/feature-flags.ts` y su test asociado.
- La documentación viva converge al contrato final: no se remueven `organizations/[id]/contacts` ni `organizations/[id]/deals`; solo se elimina el rollout legacy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §10.2 PR-I
- Rest of the spec as baseline

Reglas obligatorias:

- No remover flag antes de ≥2 semanas de validacion en production con traffic real.
- No intentar remover endpoints canónicos `organizations/[id]/contacts` ni `organizations/[id]/deals` porque son parte del contrato vigente del Quote Builder.
- Si existiera algún consumer externo de un path legacy no versionado, identificarlo primero; hoy el repo no contiene `src/app/api/commercial/organizations/route.ts`.
- Tests que referencian el legacy branch quedan obsoletos — remover o adaptar.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 a TASK-542 ya shippeadas; validar soak razonable antes de remover flags
- No ISSUE-### open contra las fases A-H
- Ningún consumer runtime depende de un route global legacy inexistente

### Blocks / Impacts

- Reduccion de superficie de codigo
- Simplificacion de onboarding del equipo

### Files owned

- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (absorber comportamiento default del selector unificado)
- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (remocion del branch legacy)
- `src/lib/hubspot/sync-hubspot-companies.ts` (remocion del env guard `GREENHOUSE_PARTY_LIFECYCLE_SYNC`)
- `src/app/api/cron/hubspot-companies-sync/route.ts` (quitar skip por flag)
- Tests legacy y docs/arquitectura impactadas

## Current Repo State

### Already exists

- `GET /api/commercial/parties/search` y `POST /api/commercial/parties/adopt` shippeados
- Quote Builder ya consume el selector unificado, pero mantiene branch legacy por flag
- Inbound HubSpot Companies sync corre con env guard legacy
- Endpoints `organizations/[id]/contacts` y `organizations/[id]/deals` shippeados y canónicos

### Gap

- Flags sin remover
- Branch legacy vivo
- Docs y arquitectura con narrativa previa al ship final
- Dead code potencial en `src/lib/commercial/party/`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit de consumers del endpoint legacy

- Confirmar consumers reales de `/api/commercial/parties/search` vs `organizations/[id]/*`.
- Confirmar que no existe `src/app/api/commercial/organizations/route.ts` y que no se debe remover el subárbol canónico `organizations/[id]/*`.

### Slice 2 — Remover flags

- Absorber `GREENHOUSE_PARTY_SELECTOR_UNIFIED` directamente en el runtime del Quote Builder y eliminar el helper legacy asociado.
- Eliminar el env guard `GREENHOUSE_PARTY_LIFECYCLE_SYNC` de `src/lib/hubspot/sync-hubspot-companies.ts` y del cron route.
- Limpiar Vercel env vars y documentar en changelog.

### Slice 3 — Cleanup Quote Builder

- Remover el branch legacy en `QuoteBuilderShell.tsx`.
- El selector unificado pasa a ser el unico path.

### Slice 4 — Deprecation o remocion endpoint legacy

- No aplica remover un route global inexistente.
- Confirmar en docs que `organizations/[id]/contacts` y `organizations/[id]/deals` permanecen como endpoints canónicos complementarios al buscador unificado.

### Slice 5 — Tests + docs

- Remover tests del path legacy.
- Update `docs/documentation/finance/quote-builder.md` sin menciones a flag.

## Out of Scope

- Refactor adicional del Quote Builder.
- Cambios de diseño del selector.
- Remocion de capabilities viejas (mantener hasta que Admin Center las gestione).

## Detailed Spec

Lightweight — el scope ya es suficiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Flags removidas del runtime y de la documentación viva; no quedan hits en `src/` para `GREENHOUSE_PARTY_LIFECYCLE_SYNC` ni `GREENHOUSE_PARTY_SELECTOR_UNIFIED`.
- [ ] Branch legacy del selector eliminado.
- [ ] No queda ningún runtime path intentando usar un route global legacy de `commercial/organizations`.
- [ ] Tests verdes tras cleanup.
- [ ] Doc funcional sin menciones a flag.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.
- [ ] Staging + production en verde post-deploy sin regressiones.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke test manual en staging tras deploy
- Monitoreo Sentry por 48h post-release

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con "Commercial Party Lifecycle program closed"
- [ ] Chequeo de impacto cruzado

- [x] Update TASK-534 umbrella a `complete`
- [ ] 7 open questions del spec con respuesta documentada (o task follow-up si quedan abiertas)

## Follow-ups

- Eventual programa de Party merge (open question #4) si aparece caso real.
- Multi-portal HubSpot (open question #2) si Kortex o expansion lo requiere.
