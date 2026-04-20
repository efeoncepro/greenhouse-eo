# TASK-543 — Party Lifecycle Deprecation & Flag Cleanup (Fase I)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-538`
- Branch: `task/TASK-543-party-lifecycle-deprecation-flag-cleanup`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase I del programa TASK-534. Deprecacion de endpoints/componentes legacy y remocion de feature flags tras validacion en staging+production: `GREENHOUSE_PARTY_LIFECYCLE_SYNC`, `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. Eliminar selector viejo de organizations en el Quote Builder, endpoint viejo de `/api/commercial/organizations` si queda ortopedico, cualquier branch condicional sobre flags, y tests obsoletos.

## Why This Task Exists

Las fases anteriores dejaron el codigo detras de flags para rollback seguro. Una vez validado en production por N semanas (≥2), mantener los flags es deuda: doble branch en cada call, riesgo de drift, confusion en onboarding. Esta fase cierra el rollout y estabiliza el contrato.

## Goal

- Remover flags `GREENHOUSE_PARTY_LIFECYCLE_SYNC`, `GREENHOUSE_PARTY_SELECTOR_UNIFIED`.
- Eliminar selector legacy de organizations en el Quote Builder.
- Deprecar endpoint viejo `GET /api/commercial/organizations` si quedo ortopedico (migrar consumers al `/parties/search`).
- Cleanup de tests obsoletos.
- Update de docs: remover menciones a "flag", marcar el comportamiento como default.
- Confirmar que no queda dead code en `src/lib/commercial/party/` ni consumidores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §10.2 PR-I
- Rest of the spec as baseline

Reglas obligatorias:

- No remover flag antes de ≥2 semanas de validacion en production con traffic real.
- Consumers externos del endpoint viejo (si los hay, Kortex?) deben migrar antes.
- Tests que referencian el legacy branch quedan obsoletos — remover o adaptar.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-534-commercial-party-lifecycle-program.md`

## Dependencies & Impact

### Depends on

- TASK-535 a TASK-542 completadas y validadas en production por ≥2 semanas
- No ISSUE-### open contra las fases A-H
- Kortex (si consume los endpoints legacy) migrado

### Blocks / Impacts

- Reduccion de superficie de codigo
- Simplificacion de onboarding del equipo

### Files owned

- `src/lib/flags/greenhouse-flags.ts` (remocion de 2 flags)
- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (remocion del branch legacy)
- `src/components/greenhouse/commercial/PartySelector.tsx` (remocion condicionales)
- `src/app/api/commercial/organizations/route.ts` (evaluar remocion o dejarlo como wrapper)
- Tests legacy

## Current Repo State

### Already exists

- Flags operativos en staging + production
- Selector viejo convive detras del flag off
- Endpoint viejo sigue respondiendo (consumers legacy)

### Gap

- Flags sin remover
- Branch legacy vivo
- Dead code potencial en `src/lib/commercial/party/`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit de consumers del endpoint legacy

- Grep exhaustivo sobre `src/` + `services/` por `/api/commercial/organizations`.
- Listar consumers; si hay externos (Kortex), coordinar migracion.

### Slice 2 — Remover flags

- Eliminar `GREENHOUSE_PARTY_LIFECYCLE_SYNC` y `GREENHOUSE_PARTY_SELECTOR_UNIFIED` de `greenhouse-flags.ts`.
- Limpiar Vercel env vars y documentar en changelog.

### Slice 3 — Cleanup Quote Builder

- Remover el branch legacy en `QuoteBuilderShell.tsx`.
- El selector unificado pasa a ser el unico path.

### Slice 4 — Deprecation o remocion endpoint legacy

- Si todos los consumers migraron: remover route.
- Si quedan consumers externos (Kortex Phase 1): dejar como wrapper con `Deprecation` header + fecha EOL.

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

- [ ] Flags removidas de codebase; `grep 'GREENHOUSE_PARTY_LIFECYCLE_SYNC'` devuelve 0 hits.
- [ ] Branch legacy del selector eliminado.
- [ ] Endpoint legacy removido o convertido en wrapper con Deprecation header.
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

- [ ] Update TASK-534 umbrella a `complete`
- [ ] 7 open questions del spec con respuesta documentada (o task follow-up si quedan abiertas)

## Follow-ups

- Eventual programa de Party merge (open question #4) si aparece caso real.
- Multi-portal HubSpot (open question #2) si Kortex o expansion lo requiere.
