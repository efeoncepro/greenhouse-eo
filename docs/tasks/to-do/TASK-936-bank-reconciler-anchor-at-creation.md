# TASK-936 — Bank reconciler ancla expenses al crear (fix causa raíz unanchored)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `bugfix`
- Domain: `finance|data`
- Blocked by: `none`

## Summary

El bank reconciler crea `expenses` desde transacciones bancarias con `expense_type='supplier'` por default y **sin FK-anchor** (no `supplier_id`, no `member_id`/payroll, etc.). Por eso se acumulan unanchored paid expenses (37 detectados en TASK-929/934). Esta task es la **corrección de causa raíz prospectiva**: que el reconciler ancle al momento de crear, para que los cierres futuros no acumulen unanchored.

## Why This Task Exists

TASK-929 detectó 37 unanchored; TASK-934 dio la herramienta de acknowledge. Pero el goal canónico (lente finance) es **prospectivo**: lo viejo cerrado se acepta (acknowledge, sin restatear), y la fuente se arregla para que no vuelva a pasar. Sin este fix, cada mes acumula unanchored nuevos.

## Goal

- Al crear un expense desde reconciliación bancaria, resolver e anclar:
  - **vendor** → match a `supplier_id` por nombre/RUT (descripción suele traer RUT, ej. Beeconta 77.805.887-1).
  - **transfer a member** → `member_id` / payroll anchor (Daniela/Andrés/Valentina/Humberly son members).
  - **regulatorio/bank fee** → categoría apropiada (no supplier).
- Cuando no se puede resolver con confianza, dejarlo unanchored explícito → el inventory/acknowledge de TASK-934 lo maneja (no inventar anchor).

## Scope (boceto — refinar en Discovery)

- Identificar el punto de creación del reconciler (`src/lib/finance/postgres-reconciliation.ts` / matchability).
- Resolver supplier por nombre/RUT (reusar lookup canónico; hay `lookupSupplierByRut`).
- Resolver member por nombre/RUT cuando el destino es una persona.
- Tests + verificación de que NO restatea períodos cerrados (solo aplica a expenses nuevos).

## Out of Scope

- Restatear los 37 viejos (cerrados → acknowledge vía TASK-934; abiertos → anclar manual). Esta task NO toca histórico.
- Reclasificación a payroll de períodos cerrados (sería restatement).

## Verification

- Crear expense de prueba desde reconciliación → nace anclado. `pnpm pg:doctor`, tests focales.
