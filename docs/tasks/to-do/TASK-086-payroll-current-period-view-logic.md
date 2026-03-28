# TASK-086 - Payroll: Current Period View Logic Fix

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Domain | HR Payroll |

## Summary

La pestaña "Período actual" de Nómina muestra un período antiguo (Febrero 2026 en estado `approved`) cuando ya existe un período más reciente exportado (Marzo 2026). Debería mostrar el período activo más reciente que NO esté exportado, o un empty state para crear el siguiente período si todos están cerrados.

## Why This Task Exists

Un HR manager que abre Nómina espera ver el período en el que debe trabajar ahora. Si Marzo ya fue exportado, el siguiente paso es Abril — no volver a ver Febrero. Mostrar un mes viejo genera confusión y da la impresión de que el sistema está atrasado.

## Current Behavior

1. "Período actual" busca el último período con status no-exportado (`draft`, `calculated`, `approved`)
2. Febrero está en `approved` → lo muestra como "actual"
3. Marzo está en `exported` → solo aparece en Historial
4. El usuario ve Febrero como período activo aunque Marzo ya se cerró

## Expected Behavior

1. Si hay un período no-exportado → mostrarlo como actual (priorizar el más reciente)
2. Si todos los períodos están exportados → mostrar empty state:
   - Mensaje: "No hay período abierto"
   - CTA: "Crear período [siguiente mes] [año]" (ej. "Crear período Abril 2026")
3. Un período `approved` anterior al último exportado no debería mostrarse como "actual" — es un rezago que debería resolverse (exportar o descartar)

## Scope

### Lógica de selección de período actual
- Ordenar períodos por `year DESC, month DESC`
- El "actual" es el más reciente con status `draft | calculated | approved`
- Si el más reciente de todos (incluyendo exportados) tiene status `exported` y no hay draft/calculated/approved posterior → empty state

### Empty state
- Texto: "No hay período abierto"
- Botón: "Crear período [Mes] [Año]" — calcula el mes siguiente al último exportado
- Al hacer click, crea el período en `draft`

### Edge case: período aprobado anterior
- Si existe Febrero `approved` y Marzo `exported`, Febrero es un rezago
- Opción A: mostrarlo con advertencia "Este período es anterior al último exportado"
- Opción B: no mostrarlo en "actual" y dejarlo solo en Historial

## Dependencies & Impact

### Depends on
- Ninguna

### Impacts to
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx` (o el componente que renderiza "Período actual")
- `src/lib/payroll/get-payroll-periods.ts` (lógica de selección)

### Files owned
- Vista de período actual en Nómina

## Acceptance Criteria

- [ ] "Período actual" muestra el período no-exportado más reciente
- [ ] Si todos están exportados, muestra empty state con CTA para crear el siguiente
- [ ] No muestra un período anterior al último exportado como "actual"
- [ ] Historial sigue mostrando todos los períodos sin cambios

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint [archivos modificados]`
- Validación visual en staging con períodos en distintos estados
