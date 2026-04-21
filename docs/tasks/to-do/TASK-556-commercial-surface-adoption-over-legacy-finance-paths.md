# TASK-556 — Commercial Surface Adoption over Legacy Finance Paths

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-555`
- Branch: `task/TASK-556-commercial-surface-adoption-over-legacy-finance-paths`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Adoptar quotes, contracts, SOW, master agreements y products como surfaces comerciales del portal aunque sus rutas sigan temporalmente bajo `/finance/...`. Esto incluye guards, breadcrumbs, CTAs y framing funcional.

## Why This Task Exists

Aunque exista `Comercial` en la navegacion y el access model, las surfaces seguirán siendo leídas como financieras si no se adapta su framing funcional y sus entrypoints reales.

## Goal

- tratar las vistas comerciales como dominio `Comercial`
- alinear breadcrumbs, labels, guards y CTAs con ese dominio
- preservar compatibilidad con rutas legacy `/finance/...`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- el dominio owner de quotes/contracts/SOW/MSA/products es `Comercial`
- los paths legacy `/finance/...` no se mueven en este task

## Normative Docs

- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/contratos-comerciales.md`
- `docs/documentation/finance/pipeline-comercial.md`

## Dependencies & Impact

### Depends on

- `TASK-554`
- `TASK-555`
- `src/app/(dashboard)/finance/quotes/page.tsx`
- `src/app/(dashboard)/finance/contracts/page.tsx`
- `src/app/(dashboard)/finance/master-agreements/page.tsx`
- `src/app/api/finance/products/route.ts`

### Blocks / Impacts

- cualquier follow-up que migre URLs a `/commercial/...`

### Files owned

- `src/app/(dashboard)/finance/quotes/**`
- `src/app/(dashboard)/finance/contracts/**`
- `src/app/(dashboard)/finance/master-agreements/**`
- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/config/greenhouse-nomenclature.ts`

## Current Repo State

### Already exists

- surfaces reales para quotes, contracts, master agreements y products viven sobre paths `/finance/...`
- el dominio tecnico y los eventos ya son `commercial.*`

### Gap

- la UI todavía se presenta como financiera
- breadcrumbs, access helpers y framing funcional no distinguen owner domain vs legacy path

## Scope

### Slice 1 — Quotes / contracts / products adoption

- alinear el framing comercial de estas vistas
- revisar guards, breadcrumbs y CTAs que hoy asumen `Finance`

### Slice 2 — MSA / SOW alignment

- alinear master agreements y el framing de SOW/contratos con el dominio comercial
- documentar explícitamente cualquier gap visible de `SOW` si no existe surface propia aún

## Out of Scope

- mover APIs a `/api/commercial/...`
- renombrar labels existentes de `Finanzas`
- crear surfaces nuevas grandes si aún no existen

## Detailed Spec

La task debe dejar explícito:

- qué surfaces quedan comerciales aunque el path siga siendo `/finance/...`
- qué breadcrumbs o shells deben hablar de `Comercial`
- qué CTAs cruzadas desde `Finanzas` pasan a tratar estas vistas como consumers/complements, no como owner domain

## Acceptance Criteria

- [ ] Quotes, contracts, master agreements y products quedan tratados como surfaces comerciales en su framing principal
- [ ] Los paths legacy `/finance/...` siguen funcionando
- [ ] Cualquier gap pendiente de `SOW` queda documentado sin inventar rutas inexistentes

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- validacion manual de quotes / contracts / master agreements / products en local o preview

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedaron documentadas las surfaces comerciales que siguen usando paths `/finance/...`

## Follow-ups

- task futura opcional de normalizacion de URLs `/commercial/...`
