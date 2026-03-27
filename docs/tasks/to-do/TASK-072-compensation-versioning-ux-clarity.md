# TASK-072 - Compensation Versioning UX Clarity

## Summary

Reducir el riesgo operativo de que RRHH o managers interpreten la compensación como una carga mensual en vez de una configuración versionada por vigencia. El runtime ya modela bien la compensación como `effective_from/effective_to`, pero la UX actual en People y Payroll sigue usando copy que puede inducir a error.

## Why This Matters

- La compensación vigente es crítica para `Payroll official`, `Payroll projected` y recálculos históricos.
- El modelo backend ya es robusto, pero la semántica visible no lo comunica con suficiente claridad.
- Un mal uso manual puede producir versiones innecesarias, confusión en auditoría y dudas sobre qué monto aplica a un período dado.

## Current Findings

### Qué ya existe

- `greenhouse_payroll.compensation_versions` modela compensación versionada por vigencia.
- La creación bloquea duplicados por `member_id + effective_from`.
- Cuando una nueva versión entra en vigencia, el runtime cierra correctamente la versión anterior si corresponde.
- La edición de una versión existente no permite cambiar `effectiveFrom`; si cambia la vigencia, debe crearse una nueva versión.
- `Payroll` y `Projected Payroll` resuelven la compensación aplicable al período imputable, no una carga mensual ad hoc.
- La ficha de persona consume la compensación como superficie de edición, pero el ownership del dato sigue siendo de `Payroll`.

### Gap real

- El drawer usa copy como `Nueva compensación`, que puede leerse como carga periódica.
- La ficha persona no deja explícito que se trata de una versión con fecha efectiva.
- No existe ayuda contextual corta para RRHH que explique cuándo crear una nueva versión y cuándo editar la vigente.

## Goal

Dejar explícito en la UX y en la documentación operativa que la compensación:

- se configura una vez y permanece vigente hasta un cambio real
- no se carga mes a mes
- debe versionarse solo ante cambios de sueldo, bonos, régimen o condiciones efectivas

## Scope

### In Scope

- Alinear copy y labels en People y Payroll para hablar de vigencia/versionado.
- Agregar hints cortos cerca del drawer o card de compensación vigente.
- Dejar explícito en UX cuándo editar la vigente y cuándo crear una nueva versión.
- Documentar la regla operativa en task, handoff y arquitectura si hace falta delta.

### Out of Scope

- Cambios al modelo `compensation_versions`.
- Cambios a cálculo de nómina.
- Migraciones o backfills de compensaciones existentes.
- Consolidación de ownership de atributos laborales fuera de compensación.

## Proposed UX Direction

### People

- Cambiar `Nueva compensación` por algo como `Nueva versión de compensación`.
- Cambiar `Configurar compensación` por `Configurar compensación vigente`.
- Agregar hint corto:
  - `La compensación no se carga mes a mes. Crea una nueva versión solo cuando cambien sueldo, bonos o régimen desde una fecha efectiva.`

### Payroll

- Reforzar que la compensación vigente se usa por período imputable.
- Si existe historial, mostrar que la versión activa depende de la fecha efectiva.

### Microcopy de apoyo

- `Vigente desde`
- `Versión aplicable`
- `Editar versión vigente`
- `Crear nueva versión desde una fecha`

## Dependencies & Impact

### Depende de

- `TASK-061` para contexto de go-live y riesgos operativos reales de nómina.
- `TASK-065` para mantener consistencia entre policy variable y surface de compensación.

### Impacta a

- `Payroll official`
- `Projected Payroll`
- `People > Compensation`
- onboarding operativo de RRHH

### Archivos owned

- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/tabs/PersonCompensationTab.tsx`
- `src/views/greenhouse/people/PersonLeftSidebar.tsx`
- documentación viva de payroll/person UX si cambia wording canónico

## Acceptance Criteria

- La UI no induce a pensar que la compensación es mensual.
- El usuario entiende que una compensación tiene vigencia y puede ser reemplazada por una nueva versión.
- La diferencia entre editar la vigente y crear una nueva versión queda visible.
- No se altera el contrato del backend ni el cálculo actual.

## Validation

- Revisión manual de People y Payroll con al menos:
  - una persona sin compensación
  - una persona con compensación vigente
  - una persona con historial de compensaciones
- Revisión de copy con foco en entendibilidad operativa.

## Status

- `to-do`
