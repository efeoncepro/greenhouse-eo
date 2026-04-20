# TASK-501 — Quote Builder Unit Price UX + Fresh Simulate-on-Save

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (bloquea guardar + UX engañosa en toda cotización con catálogo)
- Effort: `Bajo-Medio`
- Type: `fix` + `ux`
- Status real: `En implementación`
- Rank: `Post-TASK-500`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-501-quote-unit-price-resolution-backend`

## Summary

Dos problemas observados en `/finance/quotes/new`:

1. **No deja guardar**: el mensaje "No pudimos guardar la cotización porque una o más líneas de catálogo no tienen precio calculado. Espera a que termine el pricing o revisa el catálogo" aparece incluso cuando todas las líneas tienen precio visible. Causa raíz: race condition entre `simulation.lines` (snapshot del último run del engine) y la snapshot actual del draft (mutada por quantity/FTE/etc.). `buildPersistedQuoteLineItems` compara `JSON.stringify(lineInput)` exacto y aborta ante cualquier diferencia.

2. **Precio unitario vacío + caption duplicada**: el input muestra `value=''` y el placeholder con el precio del catálogo; debajo aparece una caption "Sugerido $X". El patrón se percibe como "completar precio" cuando realmente ya existe un precio del catálogo que el engine recomienda. Si hay catálogo, hay precio — el input debe mostrarlo de una vez.

## Why This Task Exists

Codex cerró la parte backend (persist robusto, 422 tipado, engine v2 expone cost data, rehidratación de `businessLineCode` + `quoteDate`). Falta cerrar la parte frontend:

- Eliminar la race condition al guardar.
- Unificar la visualización del precio catálogo vs override (patrón enterprise: Stripe Billing, Ramp, Linear).
- Gate del CTA Save mientras el engine recalcula.

## Goal

1. Al cambiar cantidad/FTE, el precio del engine re-simula y el input se actualiza en vivo, respetando el override manual si existe.
2. El input de "Precio unitario" nunca se ve vacío cuando hay catálogo — muestra el sugerido de entrada.
3. Override manual: edita libremente → aparece chip "Override" con botón reset al catálogo.
4. "Guardar" se bloquea mientras `simulating=true`.
5. Antes de persistir, fuerza una simulación fresca sincrónica. El output de esa simulación fresca es la fuente de unit prices en el payload. Cero race condition posible.

## Acceptance Criteria

- [ ] Input de precio unitario muestra `line.unitPrice ?? enginePrice` como valor visible (no placeholder, no caption "Sugerido $X" duplicada).
- [ ] Si el engine aún no responde (first-load), skeleton en el input hasta que llegue el primer `suggestedBillRate`.
- [ ] Cambiar cantidad → engine recalcula → el input actualiza su valor en vivo (mientras no haya override activo).
- [ ] Editar el input convierte la línea en override (`line.unitPrice` deja de ser null). Aparece chip "Override" con reset que vuelve a `null`.
- [ ] Botón "Guardar" (y CTA primaria del dock) deshabilitado mientras `simulating=true`.
- [ ] Submit dispara simulación fresca sincrónica; el payload se construye con el output de esa fresca (no con `simulation.lines` cacheado).
- [ ] Si después del fresh-simulate sigue faltando precio para una línea catalog-backed, error nombra la línea específica ("Creative Operations Lead — ECG-001").
- [ ] Override manual se respeta en el re-simulate: líneas con `unitPrice !== null` conservan ese valor.
- [ ] Gates: tsc/lint/test/build verdes.
- [ ] Smoke staging: crear con 3 líneas catálogo → cambiar cantidad → click guardar → éxito sin mensaje de "no hay precio".

## Scope

### Frontend — QuoteLineItemsEditor

- Input precio unitario: `value={line.unitPrice ?? enginePrice ?? ''}`, remover placeholder con engine price (redundante), remover caption "Sugerido $X".
- Skeleton en el input durante first-load si `simulating && enginePrice === null && unitPrice === null`.
- Chip "Override" + botón refresh permanece pero simplificado.

### Frontend — QuoteBuilderShell

- `primaryCtaDisabled` del dock suma `|| simulating`.
- Nueva función `simulatePricingNow(input)` que hace `POST /api/finance/quotes/pricing/simulate` fuera del hook (síncrono con await).
- `handleSubmit`: si hay líneas auto-priced, llamar `simulatePricingNow` antes de `buildPersistedQuoteLineItems`.
- Pasar `freshSimulation.lines` a `buildPersistedQuoteLineItems` (no `simulation.lines`).

### Nomenclature cleanup

- `greenhouse-nomenclature.ts`: remover `adjustPopover.periodsLabel` huérfano tras TASK-500 (ya no se usa).

## Out of Scope

- Cambiar el contrato de `/api/finance/quotes` o `/api/finance/quotes/:id/lines` (Codex ya lo endureció en b1aad3b6).
- Mover resolución de pricing al commercial-cost-worker (innecesario para 1 quote síncrona; reservado para re-pricing masivo futuro).
- Audit trail extendido (TASK-499 EM1).

## Follow-ups

- Activar `POST /quotes/reprice-bulk` en `commercial-cost-worker` cuando haya use-case de re-pricing masivo (cambio de tier margin → re-simular N quotes abiertas).
- TASK-497 react-hook-form migration (Sprint 2) absorbe el handleSubmit para validation declarativa.
