# TASK-085 - Compensation Chile: Líquido-First Flow (remove switch)

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Implementación` |
| Domain | HR Payroll |

## Summary

Eliminar el switch "Calcular desde líquido" para empleados chilenos. El drawer siempre abre en modo reverse — el campo principal es el líquido deseado y el sueldo base se calcula automáticamente. El switch era una fricción innecesaria porque en la práctica de HR Chile el líquido contractual siempre es el punto de partida.

Para régimen internacional no cambia nada — mantiene el input de salary base directo.

## Why This Task Exists

En la operación real de RRHH Chile:
1. El líquido deseado es siempre el punto de partida — nadie ingresa un bruto manualmente
2. El sueldo base es un resultado, no un input
3. El switch "Calcular desde líquido" agrega un click extra para activar algo que debería ser el default

## Scope

### Chile (régimen 'chile')
- Eliminar el Switch toggle — el drawer siempre abre en modo reverse para Chile
- El campo principal es "Líquido deseado (CLP)"
- El sueldo base se muestra como resultado calculado (no editable)
- Si existe compensación previa con `desiredNetClp`, pre-llenar el campo
- Si existe compensación previa sin `desiredNetClp`, pre-llenar con el `baseSalary` existente en el campo de salary (modo legacy compatible)
- Colación, movilización, bonos fijos, bonos variables se editan normalmente
- Previsión Chile en accordion como está

### Internacional (régimen 'international')
- Sin cambios — input de salary base directo, sin reverse, sin preview

### Cambios de régimen
- Si el usuario cambia de Chile → Internacional: campo salary base se habilita como input editable
- Si cambia de Internacional → Chile: campo salary base se deshabilita, aparece líquido deseado como input principal

## Dependencies & Impact

### Depends on
- TASK-079 (reverse engine) — ya implementado
- TASK-083/084 (UX redesign) — ya implementado

### Impacts to
- `src/views/greenhouse/payroll/CompensationDrawer.tsx` — eliminar switch, cambiar flujo Chile
- La lógica de la API y del motor reverse NO cambia

### Files owned
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`

## Compatibility

- Compensaciones existentes creadas SIN `desired_net_clp` (legacy): el drawer abre con líquido deseado vacío y salary base como valor de referencia. El usuario puede ingresar el líquido deseado y recalcular.
- Compensaciones existentes CON `desired_net_clp`: el drawer abre con el líquido pre-llenado y el preview activo.

## Acceptance Criteria

- [x] Chile: drawer abre con "Líquido deseado" como campo principal, sin switch
- [x] Chile: salary base se calcula automáticamente y no es editable
- [x] Chile: compensación legacy (sin desired_net_clp) abre con desiredNet=0, preview vacío
- [x] Internacional: drawer sin cambios — salary base como input directo
- [x] Cambio de régimen funciona: Chile→Int limpia reverse, Int→Chile muestra líquido
- [x] Guardar persiste desiredNetClp para Chile, null para internacional
- [x] Tests existentes: 10/10 pass, TS clean, lint clean

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `pnpm test src/lib/payroll/reverse-payroll.test.ts`
- Validación visual en staging: Chile (nuevo y existente) e internacional
