# TASK-084 - Compensation Drawer: Manual Mode UX Polish

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P2` |
| Impact | `Medio` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Domain | HR Payroll |

## Summary

Pulir la UX del CompensationDrawer en modo manual (reverse OFF) para que se sienta enterprise y profesional. El rediseño de TASK-083 mejoró el modo reverse pero el modo manual quedó como formulario plano sin jerarquía visual.

## Why This Task Exists

El drawer en modo manual es una lista plana de 15+ campos sin agrupación, sin secciones visuales y sin formato de moneda. No transmite la calidad enterprise que el portal necesita. Aplica tanto para Chile como para internacional.

## Problems

1. Régimen ocupa todo el ancho — debería compartir fila con salary base
2. Sin agrupación visual — todos los campos al mismo nivel, sin cards ni fondos de sección
3. Demasiado scroll — el usuario ve todos los campos sin jerarquía ni priorización
4. Sin indicador de moneda en inputs numéricos (539658 vs $539.658)
5. Colación, movilización, bonos y previsión sin secciones diferenciadas
6. Toggle "Calcular desde líquido" flota sin contexto visual entre salary y colación
7. Previsión Chile siempre expandida cuando rara vez se edita

## Scope

### Layout
- Régimen + Salary base en una fila (Grid 6/6)
- Toggle "Calcular desde líquido" integrado visualmente debajo del salary base

### Secciones con cards
- **Salario y haberes**: salary base, colación, movilización, bono conectividad
- **Bonos**: fijo + variables (OTD, RpA)
- **Previsión Chile**: accordion colapsado por defecto en modo manual también (AFP, salud, contrato, cesantía, APV)
- **Vigencia y motivo**: siempre visible al final

### Formato de moneda
- Inputs numéricos CLP con separador de miles al blur
- Input limpio (solo números) al focus para edición

### Micro-copy
- Helper texts concisos
- Section headers con overline typography consistente

## Out of Scope

- Cambios al motor reverse o al flujo de guardado
- Cambios a la lógica de negocio
- Rediseño del modo reverse (ya hecho en TASK-083)

## Dependencies & Impact

### Depends on
- TASK-083 (enterprise UX redesign — ya implementado)

### Files owned
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`

## Acceptance Criteria

- [ ] Régimen y salary base en una fila
- [ ] Secciones visuales con fondos sutiles o borders
- [ ] Previsión Chile en accordion colapsado por defecto (manual y reverse)
- [ ] Inputs numéricos CLP formateados con separador de miles
- [ ] Drawer se ve profesional tanto en Chile manual como en internacional

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint src/views/greenhouse/payroll/CompensationDrawer.tsx`
- Validación visual en staging: Chile reverse, Chile manual, internacional
