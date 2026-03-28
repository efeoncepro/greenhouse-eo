# TASK-083 - Compensation Drawer: Enterprise UX Redesign

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementación` |
| Domain | HR Payroll |

## Summary

Rediseñar el CompensationDrawer para que la experiencia de reverse payroll Chile se sienta enterprise y profesional. El drawer actual es funcional pero tiene jerarquía visual débil, inputs sin formato, preview plano y falta de secciones claras.

## Why This Task Exists

El reverse payroll es la feature principal del drawer para Chile. HR y Finance lo usan para fijar compensaciones contractuales. La UI actual no transmite confianza ni claridad — parece un formulario genérico, no una herramienta de nómina profesional.

## Problems

1. Preview es texto plano sin jerarquía visual ni color semántico
2. Inputs numéricos sin separador de miles ($710441 vs $710.441)
3. Salary base disabled parece roto, no "calculado"
4. Toggle "Calcular desde líquido" es básico para ser la acción principal
5. Accordion de parámetros es un text button, no un componente real
6. Sin secciones visuales claras — todo tiene el mismo peso
7. Helper texts verbosos ocupan demasiado espacio
8. No hay distinción visual entre resultado positivo y deducciones

## Scope

### Preview card redesign
- Sección "Haberes" con fondo neutro y valores en negro
- Sección "Descuentos legales" con valores en rojo semántico
- Sección "Resultado" con fondo destacado: líquido deseado en verde/primary, excedente Isapre en rojo, líquido a pagar en bold
- Costo empleador en gris muted separado
- Tipografía mono para montos, regular para labels

### Input formatting
- Números con separador de miles en display (CLP)
- Input limpio al editar, formateado al blur

### Salary base como resultado
- Chip o display-value con icono de calculadora, no input disabled
- Label "Calculado desde líquido" más integrado

### Accordion profesional
- MUI Accordion real con header styled
- Summary muestra resumen de params actuales (ej. "AFP Uno · Isapre · Indefinido")

### Micro-interactions
- Loading state con skeleton en el preview mientras calcula
- Transición suave al aparecer/desaparecer el preview

## Out of Scope

- Cambios al flujo de guardado
- Cambios al motor reverse
- Cambios para régimen internacional

## Dependencies & Impact

### Depends on
- TASK-079 (reverse engine) — ya implementado
- TASK-082 (collapse UX) — ya implementado, se absorbe aquí

### Files owned
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`

## Acceptance Criteria

- [x] Preview con secciones visuales claras (haberes/descuentos/resultado)
- [x] Colores semánticos: haberes neutro (action.hover), descuentos rojo (error.lighter), resultado primary (primary.lighter)
- [x] Accordion MUI real para parámetros previsionales con summary (AFP Uno · Isapre · Indefinido)
- [x] Salary base como display value con Chip "Desde líquido" y tipografía mono
- [x] Micro-copy conciso: helper texts reducidos, overline labels para secciones
- [x] Row component con font monospace para montos y font-size 13px
- [x] AdvancedFields extraído como subcomponente reutilizable
- [x] Drawer ancho aumentado a 440px para dar más espacio al preview

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint src/views/greenhouse/payroll/CompensationDrawer.tsx`
- Validación visual en staging para Chile reverse, Chile manual e internacional
