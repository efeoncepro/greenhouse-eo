# TASK-538 — Quote Builder Unified Party Selector (Fase D)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none — TASK-537 cerrada`
- Branch: `develop`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Fase D del programa TASK-534. Reemplaza el selector contextual de organizacion actual del Quote Builder por un selector unificado que consume `/api/commercial/parties/search`. Muestra estado/lifecycle visible sobre resultados materializados y sobre `hubspot_candidate`, y ejecuta `/api/commercial/parties/adopt` cuando el operador selecciona un candidate adoptable. Detras del flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. Esta es la primera surface visible del programa.

## Why This Task Exists

El gap operativo reportado es especificamente el selector: hoy solo muestra organizations existentes, forzando context-switch a HubSpot. Con Fase C entregando el endpoint, esta fase materializa el valor end-user: en el builder aparece cualquier company HubSpot que cumpla criterios, con un marcador visible y adopt-on-select transparente.

## Goal

- Reemplazar el selector actual del carril `QuoteContextStrip -> ContextChip` por una variante que consume `/api/commercial/parties/search`.
- Badge/lifecycle visible para candidates HubSpot (no aun materializados) y parties ya materializadas.
- Adopt-on-select: al elegir un candidate, llamar `/adopt` antes de setear `organizationId` en el form.
- Manejo de estados: loading, empty, error, rate-limited.
- Feature flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED` para activar/desactivar el carril unificado con fallback legacy.
- Retrocompatibilidad: si el flag esta off, usa el selector legacy (organizations only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — §7.1, §7.2
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`

Reglas obligatorias:

- Usar primitives del design system (Vuexy + greenhouse primitives); no hardcodear estilos.
- Usar el skill `greenhouse-agent` antes de tocar React/TypeScript del Quote Builder o helpers del dominio.
- Usar `greenhouse-ui-orchestrator` para resolver layout/composicion del selector unificado.
- Usar `greenhouse-vuexy-ui-expert` si la surface requiere refinamiento fuerte sobre Vuexy + MUI.
- Usar `greenhouse-ux-content-accessibility` para labels, empty states, errores, helper text y feedback.
- Accesibilidad AA: keyboard nav, screen reader, aria-live para loading.
- Debounce de search a 250ms. Minimo 2 chars antes de query.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/Nomenclatura_Portal_v3.md` (si existe — sino usar `src/config/greenhouse-nomenclature.ts`)

## Dependencies & Impact

### Depends on

- TASK-537 cerrada (endpoints `/search` y `/adopt`)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (existe, TASK-473)
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx`
- `src/components/greenhouse/primitives/`

### Blocks / Impacts

- TASK-539 Fase E (inline deal creation) consume `organizationId` que este selector resuelve
- UX de todos los operadores comerciales

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (modificacion del wiring y adopt-on-select)
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (integracion del selector unificado)
- `src/components/greenhouse/primitives/ContextChip.tsx` (solo si hace falta extender soporte async/renderOption/feedback)
- `src/hooks/useParties.ts` o helper equivalente (nuevo, wrapping fetch si no basta con estado local)
- helper de flag en el dominio finance/commercial si no basta con leer `session.user.featureFlags` o env flag existente

## Current Repo State

### Already exists

- Selector legacy de organization en `QuoteContextStrip.tsx` con wiring en `workspace/QuoteBuilderShell.tsx`
- Primitive reutilizable `ContextChip` con `Autocomplete`, loading y empty state basico
- Fetch patterns con `useEffect+fetch`, `AbortController`, `useDebounce` y hooks async ligeros
- Skills vigentes `greenhouse-agent`, `greenhouse-ui-orchestrator`, `greenhouse-vuexy-ui-expert`, `greenhouse-ux-content-accessibility`

### Gap

- No existe hook reusable para party search/adopt en el builder.
- No existe render rico para options de parties/candidates dentro del `ContextChip`.
- No existe adopt-on-select handler en el Quote Builder.
- No existe helper canonico del flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED` en esta zona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hook + types

- `useParties(query, options)` que invoca `/search` con debounce y maneja estados.
- Types alineados con `PartySearchResult` / `PartySearchItem` de TASK-537.

### Slice 2 — Componentes PartySelector + Item

- Extender el patron actual `QuoteContextStrip -> ContextChip` con render custom de item (nombre + dominio + badge stage/kind).
- Badge visual de lifecycle/candidate (estilo chip tonal) cuando `kind === 'hubspot_candidate'` y/o cuando exista `lifecycleStage`.
- Empty state: mensaje orientado a nombre o dominio, consistente con restricciones reales del tenant.
- Error state: mensaje + retry.

### Slice 3 — Adopt-on-select

- Al seleccionar candidate, mostrar loader compact + llamar `/adopt`.
- Al success: actualizar la fila local a `kind='party'` con nuevo `organizationId` y proceder normal.
- Al error: rollback, mostrar toast con retry.

### Slice 4 — Wiring Quote Builder + flag

- Flag `GREENHOUSE_PARTY_SELECTOR_UNIFIED` con fallback al selector legacy.
- Reemplazar la invocacion legacy dentro de `QuoteContextStrip` y su wiring en `workspace/QuoteBuilderShell.tsx`.
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

El selector debe respetar el shape real `PartySearchResult` / `PartySearchItem` de TASK-537. Para `hubspot_candidate`, `organizationId` es `undefined` hasta post-adopt. El form del builder NO debe emitir `organizationId: null`; espera hasta que el adopt complete. El selector debe considerar que el backend V1 solo expone `hubspot_candidate` para tenants `efeonce_internal`, y que `canAdopt` puede venir `false`.

Visual priorities (validar con `greenhouse-ux-content-accessibility` y `greenhouse-ui-orchestrator`):

- Orden de resultados: organizations activas > opportunities > prospects existentes > HubSpot candidates.
- Badge stage: color tonal segun stage real (`prospect`, `opportunity`, `active_client`, `inactive`) y distincion visible de `hubspot_candidate`.
- Adopt CTA implicito: no hay boton "adoptar"; seleccionar el item dispara adopt.
- Feedback visible: toast/snackbar "Adoptada desde HubSpot" tras exito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Con flag on, buscar "acme" devuelve organizations + candidates HubSpot en el selector.
- [x] Seleccionar un candidate dispara adopt, muestra feedback, y el form queda con `organizationId` valido.
- [x] Con flag off, el selector se comporta 100% igual al legacy (sin regresiones).
- [x] En tenants no internos, el selector sigue funcionando sin exponer `hubspot_candidate` fuera del contrato V1.
- [x] Keyboard-only navegacion funcional (Tab, Arrow, Enter, Escape).
- [x] Screen reader anuncia loading/error/empty.
- [x] No regresiones en tests existentes del QuoteBuilder.
- [x] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test manual en staging con flag on: flujo completo de cotizacion con candidate HubSpot
- Probar teclado-only + screen reader (VoiceOver o NVDA)

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] Chequeo de impacto cruzado

- [ ] Update TASK-534 umbrella
- [ ] Flag on en staging al merge; production detras de validacion explicita

## Follow-ups

- Dashboard Admin Center "Commercial Parties" (TASK-542) — surface de gestion manual.
- Manual prospect creation del builder (deferred post-V1).
