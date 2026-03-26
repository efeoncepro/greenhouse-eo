# TASK-056 - Agency Team Capacity Semantics

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `2`
- Domain: `ops`
- Legacy ID: `TASK-008` follow-up

## Summary

`Agency > Team` ya dejó de sobrecontar assignments internos y FTE imposibles, pero la vista sigue mezclando conceptos de capacidad comercial con señales de uso operativo. Esta task formaliza el contrato de dominio antes de seguir iterando backend/UI.

El objetivo es separar de forma explícita `capacidad contractual`, `dedicación comprometida`, `uso operativo` y `disponibilidad`, y dejar dos capas canónicas reutilizables:

- unidades de capacidad: `FTE <-> horas`
- economía de capacidad: `costo hora`, `costo hundido`, `tarifa sugerida`

Ninguna de estas capas debe mezclar por sí sola reglas comerciales específicas de una vista.

## Why This Task Exists

El runtime reciente confirmó tres problemas semánticos distintos:

1. `Contratadas`, `Asignadas` y `Usadas` no son equivalentes
- `1.0 FTE` representa la capacidad base del período
- una asignación cliente representa compromiso comercial
- el uso operativo debe representar consumo real o estimado del período

2. `Efeonce` interno no debe contaminar la lectura comercial
- la autogestión interna aprovecha horas libres del equipo
- no debe tratarse como presión de demanda cliente en `Agency > Team`

3. El repo no tiene todavía una unidad canónica compartida para capacidad
- hoy se repite `FTE * 160` e inferencias similares en varias zonas
- eso facilita drift entre Team, People, Finance y futuras vistas operativas

4. Tampoco existe una capa canónica para cuantificar el costo real de una hora de capacidad
- salario base, bonos y costos variables hoy viven en módulos relacionados pero no en una abstracción reusable para pricing/capacidad
- sin esa capa, distintas vistas pueden terminar calculando distinto:
  - cuánto le cuesta una hora a la agencia
  - cuánto debería sugerirse cobrar por esa hora

## Goal

- Definir el contrato canónico de `Agency > Team` sin mezclar capacidad comercial y uso operativo.
- Dejar una propuesta explícita de helper reusable para conversiones `FTE <-> horas`.
- Dejar una propuesta explícita de cuantificador económico por persona/período para traducir compensación a `costo hora` y `tarifa sugerida`.
- Preparar el refactor posterior de backend/UI con reglas de negocio y fallback claros.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/tasks/complete/TASK-008-team-identity-capacity-system.md`

Reglas obligatorias:

- `member_id` sigue siendo el ancla canónica del colaborador.
- `client_team_assignments` expresa compromiso comercial, no uso operativo real.
- `Efeonce` interno no debe computarse como carga cliente en esta vista.
- un helper de unidades no debe decidir semántica de negocio; solo convertir, normalizar y capear.
- un cuantificador económico no debe decidir descuentos comerciales ni pricing final de venta; solo producir costos y referencias defendibles por período/persona.
- si `usedHours` no tiene fuente defendible, la UI no debe inventarlas ni equipararlas a `assignedHours`.

## Dependencies & Impact

### Depends on

- `greenhouse_core.client_team_assignments`
- `greenhouse_serving.ico_member_metrics`
- `greenhouse_serving.person_operational_metrics` o su reemplazo canónico futuro
- `TASK-008` como baseline de capacidad pendiente
- `TASK-011` y `TASK-042` si se necesita consolidar señales operativas por persona

### Impacts to

- `Agency > Team`
- `People 360` y futuros tabs operativos por persona
- `Finance Intelligence` si reutiliza nociones de `FTE`, capacidad o costo por FTE
- `Staff Augmentation` y cualquier vista de disponibilidad comercial

### Files owned

- `src/app/api/team/capacity-breakdown/route.ts`
- `src/lib/team-capacity/shared.ts`
- `src/views/agency/AgencyTeamView.tsx`
- `src/lib/person-intelligence/**`
- `src/lib/person-360/**`
- `src/lib/team-capacity/**`
- `docs/tasks/to-do/TASK-056-agency-team-capacity-semantics.md`

## Current Repo State

### Ya existe

- La vista ya excluye `Efeonce` interno de la carga cliente.
- La vista ya no permite `2.0 FTE` artificiales por persona.
- El runtime actual ya se redujo a los 3 miembros billable con señal operacional materializada en `Sky Airline`.
- `Agency > Team` ya está protegida contra caché vieja y contra freezes por fetch lento.

### Gap actual

- `Usadas` todavía no tiene una definición de negocio cerrada.
- La vista sigue usando el mismo lienzo para capacidad comercial y ocupación operativa.
- No existe helper canónico para conversiones y envelopes de capacidad.
- Sigue faltando una decisión explícita sobre si `Uso operativo` se mostrará como:
  - horas reales
  - horas estimadas
  - índice/porcentaje operativo

## Scope

### Slice 1 - Contrato de dominio

- Definir formalmente estas métricas:
  - `contractedCapacity`
  - `assignedCommercialLoad`
  - `operationalUsage`
  - `commercialAvailability`
  - `operationalAvailability`
- Documentar fórmula, fuente, fallback y semántica UX de cada una.

### Slice 2 - Helper canónico de unidades

- Diseñar un módulo reusable para:
  - `fteToHours`
  - `hoursToFte`
  - `clampFte`
  - `clampHours`
  - envelope comercial y operativo
- Establecer explícitamente qué NO resuelve ese helper:
  - exclusión de clientes internos
  - pertenencia de miembros a una vista
  - inferencia de `usedHours`

### Slice 3 - Cuantificador económico de capacidad

- Diseñar una segunda capa reusable para convertir compensación del período en economía horaria:
  - `baseSalary`
  - `fixedBonuses`
  - `variableBonuses`
  - `employerCosts`
  - `monthlyCapacityHours`
  - `costPerHour`
  - `suggestedBillRate`
- Separar explícitamente:
  - costo agencia por hora
  - referencia sugerida de venta por hora
  - margen objetivo aplicado
- Dejar claro qué inputs son obligatorios y cuáles son opcionales o parametrizables por país/período.

### Slice 4 - Contrato de API + UX

- Proponer payload estable para `GET /api/team/capacity-breakdown`.
- Renombrar en diseño si hace falta:
  - `Usadas` -> `Uso operativo`
  - `Disponibles` -> `Disponible comercial`
- Definir qué copy de fallback mostrar cuando falte fuente confiable.

### Slice 5 - Follow-up técnico

- Derivar implementación posterior en backend/UI una vez cerrado el contrato.
- Revisar si `person_operational_360` y consumers relacionados siguen materializando semántica vieja de assignments.

## Out of Scope

- Implementar time tracking real.
- Rehacer toda la capa de `People 360`.
- Resolver pricing comercial final de contratos en esta misma lane.
- Mezclar este trabajo con migraciones grandes de UI o refactors de otras vistas.

## Open Questions

- ¿`Uso operativo` debe expresarse en horas o en porcentaje/índice mientras no exista imputación real?
- ¿El estado por persona debe reflejar:
  - saturación comercial
  - saturación operativa
  - ambas por separado?
- ¿La vista debe exponer dos disponibilidades (`comercial` y `operativa`) o una sola principal?
- ¿La `tarifa sugerida` debe ser:
  - solo `costPlus`
  - derivada de margen objetivo por rol
  - configurable por organización/servicio?
- ¿Qué componentes del costo deben entrar en `costPerHour`:
  - salario base
  - bonos fijos
  - bonos variables
  - cargas empleador
  - overhead de agencia?

## Acceptance Criteria

- [ ] Existe un contrato escrito y estable para `Contratadas`, `Asignadas`, `Uso operativo` y `Disponibilidad`.
- [ ] Queda documentado que `Asignadas` no equivale a `Usadas`.
- [ ] Queda definido el comportamiento de `Efeonce` interno como costo hundido/autogestión, fuera de carga cliente.
- [ ] Queda propuesta una capa reusable de conversiones `FTE <-> horas` sin lógica de negocio embebida.
- [ ] Queda propuesta una capa reusable de cuantificación económica por persona/período para `costPerHour` y `suggestedBillRate`.
- [ ] El siguiente trabajo de implementación puede ejecutarse sin depender de memoria conversacional.

## Verification

- Revisión contra `TASK-008` y arquitectura base.
- Consistencia con runtime observado en `Agency > Team`.
- Validación manual del contrato con stakeholders antes de tocar backend/UI nuevamente.
