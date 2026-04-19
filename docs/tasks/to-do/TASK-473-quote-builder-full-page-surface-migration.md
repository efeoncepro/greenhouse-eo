# TASK-473 — Quote Builder Full-Page Surface Migration & Flow Recomposition

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `Antes de TASK-466 y de cualquier follow-on UI del quote builder`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-473-quote-builder-full-page-surface-migration`
- Legacy ID: `follow-on estructural post-TASK-469/TASK-464e`
- GitHub Issue: `none`

## Summary

Migrar el quote builder desde el drawer actual a superficies full-page dedicadas (`/finance/quotes/new` y `/finance/quotes/[id]/edit`), y redefinir `/finance/quotes/[id]` como vista de review/governance/lifecycle. La task no solo mueve layout: reconecta explícitamente la cotización con el pricing catalog, el service composition catalog y los templates como fuentes de composición first-class.

## Why This Task Exists

El módulo de cotizaciones ya excedió el patrón drawer:

- `QuoteCreateDrawer` concentra demasiado trabajo en una superficie lateral: modo scratch/template, space/org, contexto comercial, líneas, simulación, addons y totales.
- `QuoteDetailView` ya está orientado a governance, document chain, approvals, audit y lifecycle; no es un buen lugar para seguir metiendo composición pesada.
- `QuoteLineItemsEditor` y `SellableItemPickerDrawer` existen como primitives reutilizables, pero no gobiernan el flujo principal.
- `TASK-469` ya fijó Surface A del programa pricing como quote builder page (`/finance/quotes/new`, `/finance/quotes/[id]/edit`); el runtime actual quedó a medio camino por haber aterrizado primero en un drawer.
- Desde la UX, el pricing catalog y el service composition catalog se perciben desconectados del flujo principal de cotización: la pantalla actual invita a capturar líneas manuales antes que a componer desde catálogo, servicio o template.

Seguir iterando sobre el drawer solo aumenta la deuda UX y deja a `TASK-466` montada sobre una superficie incorrecta.

## Goal

- Crear un builder full-page para create y edit, reutilizando la lógica útil del drawer actual.
- Separar claramente `build/edit` de `review/governance`.
- Hacer que la cotización consuma el pricing program de forma visible: catálogo, servicios, templates y manual como fuentes de composición explícitas.
- Dejar el quote detail como vista de lectura operativa, approvals, audit, chain, PDF y acciones downstream.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El builder full-page reutiliza el trabajo de `TASK-464e`; no se crean dos builders paralelos.
- El flujo principal de create/edit debe ser **catalog-first / service-first / template-first / manual**, no una tabla vacía manual-first.
- `/finance/quotes/[id]` queda orientado a review/governance/lifecycle; la edición estructural vive en `/finance/quotes/[id]/edit`.
- Los drawers quedan para subtareas acotadas: pickers, send, save-as-template y acciones similares.
- El builder debe dejar trazabilidad visual del origen de cada línea: catálogo, servicio, template o manual.
- No mezclar en esta task cambios de contrato backend, migraciones de schema o nuevas reglas de negocio de pricing.
- Tenant isolation y permisos existentes se preservan; cualquier gate broad sigue pasando por la misma familia `finance/*`.

## Normative Docs

- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/cotizaciones-gobernanza.md`
- `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md`
- `docs/tasks/complete/TASK-464e-quote-builder-ui-exposure.md`
- `docs/tasks/complete/TASK-463-unified-quote-builder-hubspot-bidirectional.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md`
- `docs/tasks/complete/TASK-464e-quote-builder-ui-exposure.md`
- `docs/tasks/complete/TASK-463-unified-quote-builder-hubspot-bidirectional.md`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`
- `docs/tasks/in-progress/TASK-465-service-composition-catalog-ui.md`
- `docs/tasks/to-do/TASK-474-quote-builder-catalog-reconnection-pass.md`
- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

### Files owned

- `src/app/(dashboard)/finance/quotes/page.tsx`
- `src/app/(dashboard)/finance/quotes/new/page.tsx`
- `src/app/(dashboard)/finance/quotes/[id]/edit/page.tsx`
- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteCreateDrawer.tsx`

## Current Repo State

### Already exists

- `src/views/greenhouse/finance/workspace/QuoteCreateDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx`
- `src/views/greenhouse/finance/workspace/AddonSuggestionsPanel.tsx`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`

### Gap

- No existe superficie full-page de builder pese a que el programa pricing ya lo necesita.
- El CTA principal del listado sigue anclado al drawer legacy.
- El flujo de create/edit/review está partido entre surfaces con responsabilidades mezcladas.
- El usuario no percibe el pricing catalog ni los servicios como fuentes naturales para armar la cotización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Builder shell y rutas dedicadas

- Crear `QuoteBuilderPageView` y `QuoteBuilderShell` como surface canónica de composición.
- Crear rutas `GET /finance/quotes/new` y `GET /finance/quotes/[id]/edit`.
- Mover la lógica útil del drawer actual al shell nuevo sin duplicar primitives.

### Slice 2 — Create flow sobre full-page

- `QuotesListView` deja de abrir `QuoteCreateDrawer` como flujo principal.
- El CTA `Nueva cotización` navega a `/finance/quotes/new`.
- El builder full-page soporta create desde scratch o template, space selection, contexto comercial, líneas, simulación, addons y guardado.

### Slice 3 — Source selector y composición canónica

- El builder expone explícitamente las fuentes de composición: `Desde catálogo`, `Desde servicio`, `Desde template`, `Manual`.
- El CTA principal de composición deja de ser un genérico `Agregar item`; la UI debe invitar primero a buscar en catálogo o servicio y dejar manual como alternativa acotada.
- Las líneas insertadas muestran su origen con chips/metadata visible (`Catálogo`, `Servicio EFG-XXX`, `Template`, `Manual`).

### Slice 4 — Edit flow unificado

- `QuoteBuilderPageView` soporta modo edit con carga de quote existente y sus líneas.
- `/finance/quotes/[id]/edit` reutiliza exactamente el mismo shell de create.
- Respetar reglas por estado: editar draft directamente; para estados no editables, surface ofrece el camino correcto (por ejemplo crear nueva versión) sin reabrir la quote de forma inconsistente.

### Slice 5 — Boundary cleanup del detail

- `QuoteDetailView` se mantiene como review/governance/lifecycle.
- El detail conserva overview, health, versions, approvals, terms, audit, PDF, send, chain y acciones downstream.
- El detail deja de ser el lugar de edición estructural profunda de líneas y contexto comercial.

## Out of Scope

- Multi-currency output final, preview y PDF/email client-facing (`TASK-466`)
- Service composition UI/recipes (`TASK-465`)
- Pricing catalog admin y cualquier scope de `/admin/pricing-catalog`
- Nuevas migraciones, cambios de schema o backend hardening no estrictamente necesarios

## Detailed Spec

### Surface contract resultante

#### `/finance/quotes`
- Surface de listado
- filtrar, navegar, crear
- no contiene el builder completo

#### `/finance/quotes/new`
- Surface de composición completa
- encabezado con breadcrumb + contexto de inicio
- selector visible de fuente de composición
- columna principal: composición / líneas
- rail derecho sticky: contexto comercial, addons, salud de margen, totales

#### `/finance/quotes/[id]`
- Surface de review y operación
- resumen, audit, approvals, terms, document chain, PDF, send, save-as-template, convert-to-invoice

#### `/finance/quotes/[id]/edit`
- misma surface que `/new`, precargada

### Reuse obligatorio

- `QuoteBuilderActions.tsx`
- `QuoteLineItemsEditor.tsx`
- `QuoteTotalsFooter.tsx`
- `AddonSuggestionsPanel.tsx`
- `SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/workspace/ServicePickerDrawer.tsx` cuando exista desde `TASK-465`

### Anti-patterns a evitar

- agrandar aún más el drawer actual
- crear dos implementaciones distintas de builder (create vs edit)
- meter governance pesada dentro del builder
- meter multi-currency final en esta task antes de que exista la surface correcta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] existe `/finance/quotes/new` como surface full-page del builder
- [ ] existe `/finance/quotes/[id]/edit` reutilizando el mismo builder shell
- [ ] `QuotesListView` ya no usa el drawer legacy como flujo principal de creación
- [ ] el builder expone fuentes de composición explícitas (`catálogo`, `servicio`, `template`, `manual`)
- [ ] la composición principal deja de ser manual-first y visibiliza el pricing catalog / service composition como fuentes first-class
- [ ] las líneas del builder dejan trazabilidad visual de origen (`Catálogo`, `Servicio`, `Template`, `Manual`)
- [ ] `QuoteDetailView` queda enfocado a review/governance/lifecycle y no a composición estructural principal
- [ ] create y edit reutilizan las mismas primitives del programa pricing ya existentes

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual autenticada:
  - `/finance/quotes`
  - `/finance/quotes/new`
  - `/finance/quotes/[id]`
  - `/finance/quotes/[id]/edit`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado
- [ ] `Handoff.md` quedó actualizado si hubo decisiones de arquitectura/UI relevantes
- [ ] `changelog.md` quedó actualizado si cambió el comportamiento visible del módulo
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-465` y `TASK-466`

## Follow-ups

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`
- `docs/tasks/in-progress/TASK-465-service-composition-catalog-ui.md`
- `docs/tasks/to-do/TASK-474-quote-builder-catalog-reconnection-pass.md`
- polish visual/microcopy posterior del builder una vez estabilizada la surface

## Delta 2026-04-19

- La task nace para formalizar el pivot ya implícito en `TASK-469`: el quote builder deja de ser un drawer sobredenso y pasa a full-page.
