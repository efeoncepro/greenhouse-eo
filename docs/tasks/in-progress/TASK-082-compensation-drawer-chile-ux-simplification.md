# TASK-082 - Compensation Drawer: Chile UX Simplification

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

Simplificar el drawer de compensación para empleados chilenos en modo reverse. Cuando el usuario activa "Calcular desde líquido", los parámetros previsionales (AFP, salud, contrato, cesantía, APV, bonos) se colapsan en una sección expandible. El drawer queda enfocado en: líquido deseado → preview → vigencia → motivo.

Los empleados internacionales no se ven afectados — su drawer queda igual.

## Why This Task Exists

Con el reverse engine implementado (TASK-079), el flujo para Chile es: HR ingresa un líquido deseado y el sistema calcula todo lo demás. Los campos previsionales ya están preconfigurados desde la compensación existente y rara vez cambian. Mostrarlos todos distrae del flujo principal y hace que el drawer se vea complejo cuando en realidad es simple.

## Goal

- En modo reverse + régimen Chile: colapsar campos secundarios en sección expandible "Parámetros previsionales"
- Campos visibles siempre: líquido deseado, preview, colación, movilización, vigencia, motivo
- Campos colapsados: bono conectividad, bono fijo, gratificación legal, bonos variables, AFP, salud, contrato, cesantía, APV
- Régimen internacional: sin cambios
- Modo manual (reverse off): sin cambios — todos los campos visibles como antes

## Dependencies & Impact

### Depends on

- TASK-079 (reverse engine — ya implementado)

### Impacts to

- `src/views/greenhouse/payroll/CompensationDrawer.tsx`

### Files owned

- `src/views/greenhouse/payroll/CompensationDrawer.tsx`

## Acceptance Criteria

- [ ] En modo reverse + Chile: campos previsionales colapsados por defecto
- [ ] Sección expandible "Parámetros previsionales" permite ver/editar si es necesario
- [ ] En modo manual o internacional: drawer sin cambios
- [ ] Colación y movilización siempre visibles (afectan el cálculo directamente)

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint src/views/greenhouse/payroll/CompensationDrawer.tsx`
- Validación visual en staging para Chile e internacional
