# TASK-554 — Commercial Domain Navigation Separation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-554-commercial-domain-navigation-separation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la seccion top-level `Comercial` en la navegacion del portal y separar ahi las surfaces comerciales principales, sin renombrar labels de `Finanzas` ni mover las URLs legacy `/finance/...` en esta primera etapa.

## Why This Task Exists

Hoy el sidebar sigue proyectando quotes, master agreements y otros objetos comerciales dentro de `Finanzas`. Eso contradice el modelo real del repo y hace que cualquier evolucion futura de `Commercial` dependa de una taxonomia de menu incorrecta.

## Goal

- Crear el bloque top-level `Comercial` en el sidebar
- Mover a `Comercial` los links comerciales acordados manteniendo sus paths actuales
- Preservar `Finanzas` con sus labels actuales y sin churn innecesario

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- la primera separacion es por navegacion/surface; no por cambio de URL
- `Finanzas` conserva sus labels actuales en este corte

## Normative Docs

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`

### Blocks / Impacts

- `TASK-555`
- `TASK-556`
- `TASK-557`

### Files owned

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

## Current Repo State

### Already exists

- `Finanzas` ya es una seccion top-level del sidebar en `src/components/layout/vertical/VerticalMenu.tsx`
- labels/subtitles financieros y comerciales conviven en `src/config/greenhouse-nomenclature.ts`

### Gap

- no existe top-level `Comercial`
- quotes siguen colgadas de `Finanzas > Documentos`
- el framing de menu no refleja el ownership comercial real

## Scope

### Slice 1 — Sidebar separation

- agregar seccion `Comercial` al sidebar
- mover a esa seccion los links comerciales definidos en arquitectura, manteniendo paths legacy

### Slice 2 — Nomenclature wiring

- agregar labels/subtitles canónicos para `Comercial`
- alinear breadcrumbs y labels visibles mínimos afectados por la nueva seccion

## Out of Scope

- cambiar `routeGroups`
- cambiar `view_code`
- mover URLs a `/commercial/...`

## Detailed Spec

El corte mínimo debe cubrir:

- `Cotizaciones`
- `Contratos`
- `SOW` [verificar si ya existe surface visible]
- `Acuerdos marco`
- `Productos`

Si `SOW` aún no tiene surface separada, el task debe dejar explícito el placeholder o agruparla temporalmente bajo `Contratos`, sin inventar una route inexistente.

## Acceptance Criteria

- [ ] El sidebar renderiza una seccion top-level `Comercial`
- [ ] `Cotizaciones`, `Contratos`, `Acuerdos marco` y `Productos` dejan de colgar de `Finanzas` en la navegacion principal
- [ ] Ninguna URL legacy `/finance/...` cambia en este task

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- validacion manual del sidebar y breadcrumbs en local o preview

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se validó que los links comerciales siguen apuntando a rutas reales existentes

## Follow-ups

- `TASK-555`
- `TASK-556`
- `TASK-557`
