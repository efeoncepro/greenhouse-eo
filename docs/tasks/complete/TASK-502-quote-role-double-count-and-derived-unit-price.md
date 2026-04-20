# TASK-502 — Fix Role Double-Count + Derived Unit Price + Read-Only Catalog Prices

## Status

- Lifecycle: `complete`
- Priority: `P0` (bug de matemática visible al usuario)
- Impact: `Crítico` (cualquier cotización con rol y Cantidad ≠ 1 persiste totales mal)
- Effort: `Bajo-Medio`
- Type: `bugfix` + `ux`
- Status real: `En implementación`
- Rank: `Post-TASK-501`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-502-quote-role-double-count-fix-and-derived-unit-price`

## Summary

Tres problemas conectados en el builder de cotizaciones cuando la línea es de tipo `role` o `person`:

1. **Doble conteo**: TASK-500 sincronizó `metadata.periods = line.quantity`, pero el engine v2 sigue leyendo **ambos** (`periods * quantity * fte * unitPrice`). Con cantidad 0.5 el engine bill by 0.25× en vez de 0.5×. Subtotales y totales persistidos quedan a la mitad.
2. **Precio unitario no refleja FTE**: si FTE baja de 1 a 0.5, el precio unitario sigue mostrando el rate del catálogo completo y el subtotal "parece" no cuadrar. La experiencia de Stripe Billing / Ramp / Linear muestra precios **efectivos** (con ajustes aplicados).
3. **Override en items de catálogo confunde la SoT**: si el catálogo es la fuente de verdad para role/person/tool/overhead, permitir editar el precio unitario rompe el contrato. Escenarios de excepción caben en líneas manuales (`direct_cost`).

## Why This Task Exists

El usuario reportó que al poner Cantidad=0.5 el subtotal bajó a $730.875 cuando el precio unitario es $2.923.500. Esperado: $1.461.750. Real: $730.875 = 0.5 × 0.5 × $2.923.500. El engine ejecuta `quantity × periods × fte × unitPrice` y ambos (quantity, periods) son 0.5 tras TASK-500 → multiplicación doble.

Corregir esto abre la oportunidad de limpiar el contrato semántico:
- Cantidad en role/person **es períodos** (meses facturables), no el multiplicador genérico.
- Precio unitario es derivado del catálogo; el usuario no lo edita.
- FTE y EmpType viven en Ajustes (ya) y son los únicos knobs mutables del pricing por línea.

## Goal

1. `subtotal = periods × fte × unitPrice` para role/person, sin double-count.
2. La celda "Precio unitario" para items de catálogo muestra **texto read-only** con el precio efectivo (`unitPrice × fteFraction`). No input, no chip Override, no reset.
3. Chip "FTE 1.0×" al lado del precio unitario abre el popover Ajustes (discoverability del ajuste sin agregar columna).
4. `line.quantity` permanece en 1 para role/person; el engine recibe `quantity=1, periods=metadata.periods`.
5. Líneas manuales (`direct_cost`) conservan precio unitario editable.

## Acceptance Criteria

- [ ] Cambiar Cantidad a 0.5 en un role con FTE=1 → subtotal = 0.5 × unitPrice (no 0.25×).
- [ ] Cambiar FTE a 0.5 en Ajustes → precio unitario mostrado se divide a la mitad → subtotal = qty × (unitPrice × 0.5).
- [ ] No hay input de precio unitario para role/person/tool/overhead_addon — es texto.
- [ ] Chip "FTE 1.0×" visible junto al precio unitario solo en role/person; click abre popover.
- [ ] Líneas manuales siguen con input editable para el precio.
- [ ] Tests de `quote-builder-pricing.test.ts` verdes; si alguna fixture necesita ajuste (`quantity=1` ya era el valor esperado, así que no hay regresión).
- [ ] Engine input via `buildQuotePricingLineInput` envía `quantity: 1` para role/person.
- [ ] Gates: tsc/lint/test/build verdes.
- [ ] Smoke staging: crear quote con rol, cantidad 0.5, fte 1 → subtotal = (catalogPrice × 0.5); cambiar fte a 0.5 → subtotal = (catalogPrice × 0.25).

## Scope

### `quote-builder-pricing.ts`

- `buildQuotePricingLineInput` role/person: `quantity: 1` (siempre). El multiplicador real es `periods` (= Cantidad mostrada).
- `buildPersistedQuoteLineItems`: para catalog items, siempre usar engine price (ignorar `line.unitPrice`). Override solo aplicable a `direct_cost` / lineas sin `pricingV2LineType`.

### `QuoteLineItemsEditor.tsx`

- **Columna Cantidad**:
  - Para role/person: input bound a `metadata.periods` (no `line.quantity`). onChange muta solo `metadata.periods`, deja `line.quantity=1`.
  - Para resto: sin cambios (bound a `line.quantity`).
- **Columna Precio unitario**:
  - Para role/person/tool/overhead_addon: render como `<Typography>` read-only (no input). Valor = `enginePrice × fteFraction` (para role/person) o `enginePrice` (tool/overhead).
  - Skeleton si el engine aún no respondió en first-load.
  - Chip "FTE 1.0×" junto al precio en role/person, click abre Ajustes popover (reusa `handleAdjustOpen`).
  - Para otros tipos: input editable como hoy (manual direct_cost).
- **Override chip + reset**: se elimina del layout (code path muerto para catalog).

## Out of Scope

- Columna dedicada FTE (scope para TASK-499 si el usuario lo pide).
- Split de una línea rol en N hires (quantity > 1 para role). Hoy se resuelve creando múltiples líneas.
- Permitir override temporal con workflow de aprobación (TASK futuro si aparece caso).

## Follow-ups

- Actualizar `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`: documentar contrato Cantidad=periods para role/person.
- Verificar en TASK-497 (RHF migration) que el binding periods↔cantidad se preserve en el nuevo form state.
