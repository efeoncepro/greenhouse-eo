# TASK-554 — Commercial Domain Navigation Separation

## Delta 2026-05-07 — Discovery decisions

- Se ejecuta en `develop` por instrucción explícita del usuario, sin crear branch `task/TASK-554-commercial-domain-navigation-separation`.
- `SOW` no tiene route/page propia en el runtime actual. En este corte se representa dentro del item `Contratos`, que ya usa subtitle `SOWs, renovaciones y ejecución comercial activa`; no se inventa una ruta inexistente.
- `/finance/products` no existe como page, aunque sí existen `src/views/greenhouse/finance/ProductCatalogView.tsx` y APIs `/api/finance/products*`. Para cumplir el contrato de navegación sin link roto, este task puede crear la page legacy mínima `/finance/products` reutilizando `ProductCatalogView`; no mueve URLs ni APIs.
- `routeGroups`, `view_code`, `authorizedViews` y entitlements comerciales quedan fuera de este task y son responsabilidad de `TASK-555`; TASK-554 solo puede reutilizar gates legacy `finanzas.*` cuando el path siga bajo `/finance/...`.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-002`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (user-requested direct execution; no task branch)
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
- `src/config/greenhouse-navigation-copy.ts`
- `src/app/(dashboard)/finance/products/page.tsx` (solo si se materializa el route legacy faltante reutilizando `ProductCatalogView`)
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

## Current Repo State

### Already exists

- `Finanzas` ya es una seccion top-level del sidebar en `src/components/layout/vertical/VerticalMenu.tsx`
- labels/subtitles financieros y comerciales conviven en `src/config/greenhouse-nomenclature.ts`
- el runtime i18n ya consume `src/config/greenhouse-navigation-copy.ts` para labels de navegación
- existe `ProductCatalogView` y APIs `/api/finance/products*`, pero no existe page `/finance/products`

### Gap

- no existe top-level `Comercial`
- quotes siguen colgadas de `Finanzas > Documentos`
- el framing de menu no refleja el ownership comercial real
- `Productos` no puede enlazarse de forma segura hasta materializar `/finance/products` o apuntar a una ruta real existente

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

Si `Productos` no tiene page legacy real, el task debe materializar `/finance/products` como page mínima sobre el view/API existentes antes de agregar el link al sidebar.

## Acceptance Criteria

- [x] El sidebar renderiza una seccion top-level `Comercial`
- [x] `Cotizaciones`, `Contratos`, `Acuerdos marco` y `Productos` dejan de colgar de `Finanzas` en la navegacion principal
- [x] Ninguna URL legacy `/finance/...` cambia en este task

## Verification

- `pnpm test src/config/greenhouse-navigation-copy.test.ts` — OK
- `pnpm exec tsc --noEmit --pretty false` — OK
- `pnpm design:lint` — OK, 0 errors / 0 warnings
- `pnpm lint` — OK
- `pnpm build` — OK; route table confirma `/finance/products`
- chequeo estático de legacy pages: `/finance/quotes`, `/finance/contracts`, `/finance/master-agreements`, `/finance/products` existen

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] se validó que los links comerciales siguen apuntando a rutas reales existentes

## Follow-ups

- `TASK-555`
- `TASK-556`
- `TASK-557`
