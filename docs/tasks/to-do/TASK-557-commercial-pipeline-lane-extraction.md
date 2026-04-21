# TASK-557 — Commercial Pipeline Lane Extraction

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-555`
- Branch: `task/TASK-557-commercial-pipeline-lane-extraction`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Extraer `Pipeline comercial` del framing `Finance > Intelligence` y darle una lane comercial propia, manteniendo la compatibilidad de lectura mientras el resto del programa separa navegación y acceso.

## Why This Task Exists

El pipeline ya es funcionalmente comercial: mezcla deals, contracts standalone y pre-sales. Mantenerlo como sub-tab financiera perpetúa la confusión de dominio incluso si quotes y contracts ya se separaron en navegación.

## Goal

- darle a `Pipeline comercial` un framing comercial primario
- desacoplarlo de `Finance > Intelligence` como surface owner
- mantener los readers y APIs existentes donde convenga en la primera etapa

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `Pipeline comercial` pertenece a `Comercial`
- no mezclar en esta task una reescritura total de `Economía` o `Finance Intelligence`

## Normative Docs

- `docs/documentation/finance/pipeline-comercial.md`
- `docs/tasks/complete/TASK-457-ui-revenue-pipeline-hybrid.md`

## Dependencies & Impact

### Depends on

- `TASK-554`
- `TASK-555`
- `src/app/(dashboard)/finance/intelligence/page.tsx`
- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx`

### Blocks / Impacts

- futuros accesos directos y dashboards ejecutivos que quieran abrir pipeline desde `Comercial`

### Files owned

- `src/app/(dashboard)/finance/intelligence/page.tsx`
- `src/views/greenhouse/finance/CommercialIntelligenceView.tsx`
- `docs/documentation/finance/pipeline-comercial.md`

## Current Repo State

### Already exists

- el pipeline híbrido ya está materializado y funcional
- el grain y el classifier ya son comerciales

### Gap

- el framing principal sigue siendo financiero
- no existe lane comercial propia para abrir esa vista

## Scope

### Slice 1 — Surface extraction

- definir el entrypoint comercial de pipeline
- ajustar el framing visible para que deje de depender de `Finance > Intelligence` como owner surface

### Slice 2 — Compatibility and docs

- preservar compat de acceso y deep links necesarios
- actualizar la documentación funcional y de arquitectura afectada

## Out of Scope

- reescribir los readers del pipeline
- rehacer `Finance > Intelligence` completa
- mover todas las APIs a `/api/commercial/...`

## Detailed Spec

El task puede dejar compat temporal desde `Finance > Intelligence`, pero la vista debe tener owner domain comercial y un entrypoint primario bajo `Comercial`.

## Acceptance Criteria

- [ ] Existe una lane/entrypoint comercial primaria para `Pipeline comercial`
- [ ] La vista deja de depender del framing financiero como owner principal
- [ ] Los deep links y lectores existentes siguen funcionando durante la transición

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- validacion manual del entrypoint y de la vista pipeline

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedó explicitado cualquier alias o compat temporal desde `Finance > Intelligence`

## Follow-ups

- task futura opcional de normalizacion final de rutas si el nuevo entrypoint comercial se consolida
