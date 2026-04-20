# TASK-500 — Quote Builder Quantity↔Periods Sync + EmpType Dropdown

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto` (bug visible en todos los quotes con role/person)
- Effort: `Bajo` (focused fix)
- Type: `fix` + `ux`
- Status real: `En implementación`
- Rank: `Post-TASK-496`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-500-quote-builder-qty-periods-sync`

## Summary

Hotfix focalizado al Quote Builder: al cambiar `Cantidad` o `Unidad` en una row de tipo `role`/`person`, el engine no recalcula el subtotal ni el total. La única forma hoy de recalcular es abrir el popover "Ajustes" y cambiar `Períodos`, que es una feature oculta. Además, "Tipo de contratación" dentro del popover es un text field libre — debe ser dropdown con los employment types del backend.

## Why This Task Exists

El engine v2 para lineas `role`/`person` calcula `totalBill = unitPriceUsd × fteFraction × periods × quantity`. Hoy la columna `Cantidad` sólo muta `line.quantity` y `Unidad` sólo muta `line.unit`. Ninguno de los dos toca `metadata.periods`, que es el multiplicador real que usa el engine para lineas con base mensual (rol, persona).

Resultado: el usuario cambia cantidad de 1 → 5, espera que el total se multiplique por 5, pero se queda igual hasta que abra Ajustes y cambie periods. Esto es un bug de percepción y de datos — el valor guardado tampoco refleja la intención.

Adicionalmente, el text field libre de Tipo de contratación permite typos y valores inválidos que el engine rechaza silenciosamente.

## Goal

1. **Auto-sync `metadata.periods = quantity`** para `role`/`person`. Cambiar cantidad → engine re-simula total.
2. **Lock Unidad a "Mes"** para `role`/`person` (engine ignora el campo, mostrarlo editable confunde).
3. **Eliminar Períodos del popover Ajustes** (ahora redundante con quantity).
4. **Tipo de contratación = dropdown** con opciones desde `/api/finance/quotes/pricing/config` (`catalog.employmentTypes`).

## Acceptance Criteria

- [ ] Cambiar `Cantidad` en una fila `role` actualiza subtotal y total inmediatamente (engine re-simula).
- [ ] La columna `Unidad` para `role`/`person` muestra "Mes" como read-only / disabled select.
- [ ] El popover Ajustes ya no contiene el campo `Períodos` (solo FTE + Tipo de contratación).
- [ ] "Tipo de contratación" es `CustomTextField select` con `MenuItem` poblado desde backend (`employmentTypeCode` → `labelEs`).
- [ ] El valor se guarda en `metadata.employmentTypeCode` (mismo campo que hoy).
- [ ] Otras lineas (`deliverable`, `direct_cost`, tool, overhead) conservan el comportamiento actual de quantity/unit libres.
- [ ] Gates: `pnpm tsc`, `pnpm lint`, `pnpm build` verdes.
- [ ] Smoke staging: crear quote con rol, cambiar cantidad, verificar que total cambia.

## Scope

### Backend (ya existente)

`GET /api/finance/quotes/pricing/config` expone `catalog.employmentTypes: EmploymentTypeEntry[]` con `employmentTypeCode` + `labelEs`. No requiere migración.

### Frontend

**`QuoteBuilderShell.tsx`**
- Extraer `employmentTypes` del response de `/pricing/config`
- Agregarlo a `builderOptions` state
- Pasarlo como prop nueva `employmentTypeOptions` al `QuoteLineItemsEditor`

**`QuoteLineItemsEditor.tsx`**
- Nueva prop `employmentTypeOptions?: Array<{ value: string; label: string }>` (default: `[]`)
- Handler `onQuantityChange`: si `line.lineType === 'role' | 'person'`, también setear `metadata.periods = quantity`
- Columna Unidad: si `needsPricingContext` (role/person), render read-only `CustomChip` "Mes" en vez de dropdown
- Popover Ajustes: eliminar el `CustomTextField` de `periods`, convertir el de `employmentTypeCode` a `select` con los options
- Preservar `metadata.periods` en el payload que se envía al backend (engine sigue leyéndolo; aunque en UI no es editable directamente, es la fuente de verdad)

**`greenhouse-nomenclature.ts`**
- `adjustPopover.subtitle`: remover mención a períodos
- Remover `adjustPopover.periodsLabel` (no se usa)
- Mantener `adjustPopover.employmentTypeLabel` + `employmentTypePlaceholder`
- Nuevo: `quantityPeriodsCaption` = "períodos facturables (meses)"

## Out of Scope

- Cambios en el engine v2 (fuera del ámbito del fix de UI)
- Audit trail de cambios (TASK-499 EM1)
- Validation via react-hook-form (TASK-497)

## Follow-ups

- Integrar dentro de TASK-497 cuando se migre a react-hook-form
- Si el usuario pide cantidad decimal (ej: 0.5 meses), evaluar en TASK-499
