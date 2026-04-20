# TASK-538 — Quote Builder Unified Party Selector (Fase D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-537`
- Branch: `task/TASK-538-quote-builder-unified-party-selector`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase D del programa TASK-534. Reemplaza el selector "Organizacion (cliente o prospecto)" actual del Quote Builder por un selector unificado que consume `/api/commercial/parties/search`. Muestra badge "Prospecto" sobre candidates HubSpot y ejecuta `/adopt` cuando el operador los selecciona. Detras del flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. Esta es la primera surface visible del programa.

## Why This Task Exists

El gap operativo reportado es especificamente el selector: hoy solo muestra organizations existentes, forzando context-switch a HubSpot. Con Fase C entregando el endpoint, esta fase materializa el valor end-user: en el builder aparece cualquier company HubSpot que cumpla criterios, con un marcador visible y adopt-on-select transparente.

## Goal

- Reemplazar el selector actual en `QuoteBuilderShell.tsx` por un componente que consume `/parties/search`.
- Badge "Prospecto" visible para candidates HubSpot (no aun materializados).
- Adopt-on-select: al elegir un candidate, llamar `/adopt` antes de setear `organizationId` en el form.
- Manejo de estados: loading, empty, error, rate-limited.
- Feature flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED` para activar/desactivar sin deploy.
- Retrocompatibilidad: si el flag esta off, usa el selector legacy (organizations only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §7.1, §7.2
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

Reglas obligatorias:

- Usar primitives del design system (Vuexy + greenhouse primitives); no hardcodear estilos.
- Usar el skill `greenhouse-dev` antes de tocar el Quote Builder.
- Usar el skill `greenhouse-ux` para decidir visual del badge "Prospecto" y estados vacios.
- Ejecutar el skill `greenhouse-ui-review` ANTES del commit final — gate obligatorio.
- Accesibilidad AA: keyboard nav, screen reader, aria-live para loading.
- Debounce de search a 250ms. Minimo 2 chars antes de query.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/Nomenclatura_Portal_v3.md` (si existe — sino usar `src/config/greenhouse-nomenclature.ts`)

## Dependencies & Impact

### Depends on

- TASK-537 cerrada (endpoints `/search` y `/adopt`)
- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (existe, TASK-473)
- `src/components/greenhouse/primitives/`

### Blocks / Impacts

- TASK-539 Fase E (inline deal creation) consume `organizationId` que este selector resuelve
- UX de todos los operadores comerciales

### Files owned

- `src/components/greenhouse/commercial/PartySelector.tsx` (nuevo)
- `src/components/greenhouse/commercial/PartySelectorItem.tsx` (nuevo)
- `src/views/greenhouse/finance/QuoteBuilderShell.tsx` (modificacion puntual del selector)
- `src/lib/flags/greenhouse-flags.ts` (agregar `GREENHOUSE_PARTY_SELECTOR_UNIFIED`)
- `src/hooks/useParties.ts` (nuevo, wrapping fetch)

## Current Repo State

### Already exists

- Selector legacy de organization en `QuoteBuilderShell.tsx` (TASK-486)
- Primitives como `Autocomplete`, `Chip`, `ListItem` del design system
- Fetch patterns con SWR o `useEffect+fetch` (revisar en Discovery)
- Skill `greenhouse-dev`, `greenhouse-ux`, `greenhouse-ui-review`

### Gap

- No existe componente reutilizable `PartySelector`.
- No existe hook `useParties`.
- No existe badge "Prospecto" como primitive.
- No hay adopt-on-select handler.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hook + types

- `useParties(query, options)` que invoca `/search` con debounce y maneja estados.
- Types alineados con response de TASK-537.

### Slice 2 — Componentes PartySelector + Item

- Autocomplete pattern con render custom de item (nombre + dominio + badge stage).
- Badge visual "Prospecto" (estilo chip tonal) cuando `kind === 'hubspot_candidate'`.
- Empty state: "No hay organizaciones. Busca en HubSpot por nombre o dominio."
- Error state: mensaje + retry.

### Slice 3 — Adopt-on-select

- Al seleccionar candidate, mostrar loader compact + llamar `/adopt`.
- Al success: actualizar la fila local a `kind='party'` con nuevo `organizationId` y proceder normal.
- Al error: rollback, mostrar toast con retry.

### Slice 4 — Wiring Quote Builder + flag

- Flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED` con fallback al selector legacy.
- Reemplazar invocacion en `QuoteBuilderShell.tsx`.
- Preservar el handshake downstream: el form sigue recibiendo `organizationId` string.

### Slice 5 — Review UX + a11y

- Ejecutar `greenhouse-ui-review` skill como pre-commit gate.
- Tests de interaccion: search, debounce, select existing, adopt candidate, error retry.

## Out of Scope

- Drawer de "Crear deal nuevo" (TASK-539).
- Creacion manual de prospect desde el builder (no es scope V1 — usar HubSpot).
- Filtros avanzados por industry/country.
- Multi-select o bulk actions.

## Detailed Spec

El selector debe respetar el shape `PartySearchResult` de spec §7.1. Para candidates HubSpot, el campo `organizationId` es undefined hasta post-adopt. El form del builder NO debe emitir `organizationId: null`; espera hasta que el adopt complete.

Visual priorities (validar con `greenhouse-ux`):

- Orden de resultados: organizations activas > opportunities > prospects existentes > HubSpot candidates.
- Badge stage: color tonal segun stage (prospect=info, opportunity=warning, active_client=success).
- Adopt CTA implicito: no hay boton "adoptar"; seleccionar el item dispara adopt.
- Feedback visible: toast/snackbar "Adoptada desde HubSpot" tras exito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con flag on, buscar "acme" devuelve organizations + candidates HubSpot en el selector.
- [ ] Seleccionar un candidate dispara adopt, muestra feedback, y el form queda con `organizationId` valido.
- [ ] Con flag off, el selector se comporta 100% igual al legacy (sin regresiones).
- [ ] Keyboard-only navegacion funcional (Tab, Arrow, Enter, Escape).
- [ ] Screen reader anuncia loading/error/empty.
- [ ] Skill `greenhouse-ui-review` aprobo pre-commit.
- [ ] No regresiones en tests existentes del QuoteBuilder.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/components/greenhouse/commercial`
- Test manual en staging con flag on: flujo completo de cotizacion con candidate HubSpot
- Ejecutar `greenhouse-ui-review` skill sobre el diff final
- Probar teclado-only + screen reader (VoiceOver o NVDA)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] Flag on en staging al merge; production detras de validacion explicita

## Follow-ups

- Dashboard Admin Center "Commercial Parties" (TASK-542) — surface de gestion manual.
- Manual prospect creation del builder (deferred post-V1).
