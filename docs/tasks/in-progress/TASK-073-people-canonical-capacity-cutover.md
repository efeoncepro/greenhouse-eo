# TASK-073 - People Canonical Capacity Cutover

## Summary

Corregir el módulo `People` para que deje de mezclar fuentes crudas o semánticamente equivocadas al mostrar `FTE`, capacidad e indicadores operativos, y pase a consumir la capa canónica ya materializada (`member_capacity_economics`, `person_intelligence`, `person_delivery_360`, `person_hr_360`) donde corresponde.

## Why This Task Exists

La auditoría de `/people` mostró que:

- la lista de personas sigue mostrando `FTE` como suma de `fte_allocation` en `client_team_assignments`
- la ficha de persona sigue derivando `capacity` desde assignments + métricas raw en vez de snapshots serving
- parte de las métricas operativas todavía se calculan contra `notion_ops.tareas` en vez de serving canónico

Esto produce:

- números inconsistentes entre `People`, `Agency`, `Person Intelligence` y `Projected Payroll`
- naming engañoso (`FTE` vs `FTE asignado` vs `FTE contratado`)
- riesgo de que People contradiga el modelo canónico que ya definimos para capacidad

## Goal

Hacer que `People`:

- use una fuente única y canónica para capacidad/economía por persona
- diferencie explícitamente entre `FTE contratado` y `FTE asignado` si muestra ambos
- deje de recalcular indicadores operativos desde raw cuando ya existe un serving consistente

## Architecture Alignment

Fuentes canónicas relevantes:

- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

Principio:

- `client_team_assignments` sigue siendo el ledger canónico de asignaciones
- `member_capacity_economics` es la fuente canónica para capacidad/economía por miembro y período
- `person_intelligence` es la fuente canónica para intelligence operacional enriquecida
- `person_delivery_360` y `person_hr_360` son las superficies 360 de lectura, no se debe rearmar su semántica desde raw en `People`

## Current Findings

### 1. Lista People usa fuente equivocada para `FTE`

En `src/lib/people/get-people-list.ts`:

- `assignment_agg` lee `greenhouse_core.client_team_assignments`
- `SUM(fte_allocation)` se expone como `total_fte`
- la UI luego lo muestra simplemente como `FTE`

Esto hoy representa `assigned/allocated FTE`, no `contracted_fte`.

### 2. Ficha persona deriva `capacity` desde assignments crudos

En `src/lib/people/get-person-detail.ts`:

- `summary.totalFte` se construye desde assignments activos
- `capacity` se arma con `getAssignedHoursMonth(totalFte)` + `getPersonOperationalMetrics()`

Eso ignora `member_capacity_economics` y `person_intelligence`, aunque ya existen como snapshots canónicos.

### 3. People todavía calcula métricas desde `notion_ops` raw

En `src/lib/people/get-person-operational-metrics.ts`:

- consulta `notion_ops.tareas`
- hace matching por nombre/email/notion user
- calcula `rpaAvg30d`, `otdPercent30d` y breakdown directo desde raw

Eso compite con:

- `greenhouse_serving.person_operational_metrics`
- `greenhouse_serving.ico_member_metrics`
- `greenhouse_serving.person_delivery_360`
- `person_intelligence`

## Desired Semantic Model

### En People List

- columna principal:
  - `FTE contratado` desde `member_capacity_economics.contracted_fte` o derivado equivalente canónico
- opcionalmente una columna secundaria:
  - `FTE asignado` desde `assigned_hours / 160` o serving equivalente

### En cards superiores

- separar:
  - `FTE contratado`
  - `FTE asignado`
- no usar el label genérico `FTE` si en realidad es asignación comercial

### En Person Detail

- `summary` y `capacity` deben venir de `person_intelligence` / `member_capacity_economics`
- `assignments` puede seguir mostrando el detalle raw de `client_team_assignments`
- `operationalMetrics` raw 30d debe reemplazarse o degradarse a serving canónico

## Scope

### In Scope

- Cutover de `/api/people` hacia serving canónico para FTE/capacidad
- Revisar `PersonDetail.summary` y `detail.capacity`
- Reemplazar o encapsular `getPersonOperationalMetrics()` cuando exista fuente serving mejor
- Ajustar labels/microcopy donde `FTE` hoy sea ambiguo
- Agregar tests unitarios del mapping nuevo

### Out of Scope

- Cambios al ledger `client_team_assignments`
- Cambios al modelo de compensación
- Cambios a `Agency Team` salvo que se detecte inconsistencia compartida
- Reescritura total de People 360

## Dependencies & Impact

### Depende de

- `TASK-056` Agency Team Capacity Semantics
- `TASK-042` Person Operational Serving Cutover
- `TASK-043` Person 360 Runtime Consolidation
- `member_capacity_economics` projection ya materializada
- `person_intelligence` serving vigente

### Impacta a

- `/people`
- `/people/[memberId]`
- `Person Intelligence`
- posibles consumers de People summary en Home o dashboards laterales

### Archivos owned

- `src/lib/people/get-people-list.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `src/views/greenhouse/people/PeopleListStats.tsx`
- `src/views/greenhouse/people/PeopleListTable.tsx`
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
- tests asociados de People

## Proposed Implementation Slices

### Slice 1 — Semántica explícita en People List

- reemplazar `total_fte` por campos con nombre correcto
- introducir `contractedFte` y `assignedFte` en `PersonListItem`
- ajustar cards y tabla para no mostrar `assigned FTE` como si fuera el único FTE

### Slice 2 — Summary/capacity desde serving canónico

- leer `member_capacity_economics` o `person_intelligence` para:
  - `contractedHoursMonth`
  - `assignedHoursMonth`
  - disponibilidad
  - health
  - total FTE contractual / asignado

### Slice 3 — Operacional raw -> serving

- reducir dependencia de `getPersonOperationalMetrics()` sobre `notion_ops`
- preferir `person_operational_metrics`, `ico_member_metrics`, `person_delivery_360` o `person_intelligence`
- dejar raw sólo como fallback si el serving no existe

### Slice 4 — Tests y docs

- tests de mapping de list/detail
- delta en arquitectura si cambia el contrato visible de People
- actualizar task cross-impact si `TASK-042` / `TASK-043` quedan parcialmente absorbidas

## Acceptance Criteria

- `People List` no muestra `assigned FTE` como si fuera `FTE` contractual
- `Person Detail` usa serving canónico para capacidad
- los números de capacidad en `People` no contradicen `Agency` ni `Person Intelligence`
- `getPersonOperationalMetrics()` deja de ser la fuente primaria cuando hay serving disponible
- existen tests que cubren el mapping y naming correcto

## Validation

- revisar manualmente `/people`
- revisar manualmente `/people/[memberId]`
- comparar al menos 2 personas entre:
  - People
  - Agency Team
  - Person Intelligence
- correr tests unitarios de `src/lib/people/**` y componentes impactados

## Status

- `to-do`
