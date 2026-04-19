# TASK-474 — Quote Builder Catalog / Service Reconnection Pass

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `Despues de TASK-465 y TASK-473 si la integracion final queda partida entre ramas`
- Domain: `ui`
- Blocked by: `TASK-465 (service composition catalog) y TASK-473 (builder full-page)`
- Branch: `task/TASK-474-quote-builder-catalog-reconnection-pass`
- Legacy ID: `follow-on de integracion UX del programa pricing`
- GitHub Issue: `none`

## Summary

Sellar la reconexión UX entre quote builder, pricing catalog y service composition cuando `TASK-465` y `TASK-473` hayan aterrizado en paralelo pero el resultado todavía se perciba desconectado. La task existe como red de seguridad para evitar que catálogo y servicios queden técnicamente disponibles pero ocultos o secundarios dentro de la cotización.

## Why This Task Exists

`TASK-465` puede cerrar correctamente schema, store, admin UI y expansión `service -> line items`, mientras `TASK-473` puede cerrar correctamente el builder full-page. Aun así, existe riesgo real de que el usuario final siga viendo la cotización como un editor manual con botones genéricos, en vez de como un workspace de composición gobernada por catálogo y servicios.

Esta task absorbe esa brecha de integración si las dos ramas principales aterrizan sin una orquestación UX suficientemente fuerte.

## Goal

- Garantizar que catálogo, servicios, templates y manual aparezcan como fuentes de composición explícitas.
- Garantizar que el service composition catalog se pueda invocar de forma natural desde el builder.
- Garantizar que las líneas de cotización dejen trazabilidad visible de origen.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md`

Reglas obligatorias:

- Esta task no reabre schema ni backend de `TASK-465`; consume lo ya construido.
- Esta task no reabre la migración full-page de `TASK-473`; la termina de conectar.
- El flujo manual sigue existiendo, pero ya no domina la experiencia.
- Toda línea que venga de catálogo/servicio/template debe dejar evidencia visible en el builder.

## Normative Docs

- `docs/documentation/finance/cotizador.md`
- `docs/tasks/in-progress/TASK-465-service-composition-catalog-ui.md`
- `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-465-service-composition-catalog-ui.md`
- `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`
- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`

### Files owned

- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx`
- `src/views/greenhouse/finance/workspace/ServicePickerDrawer.tsx`
- `docs/documentation/finance/cotizador.md`

## Current Repo State

### Already exists

- `TASK-464e` dejó primitives de picker y simulación
- `TASK-465` materializa el catálogo de servicios y el endpoint `from-service`
- `TASK-473` materializa el builder full-page

### Gap

- Puede persistir una UX manual-first aunque catálogo y servicios existan.
- El usuario puede no entender que el builder consume pricing catalog y service composition.
- Los servicios pueden expandirse a líneas sin dejar identidad visible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Entry points y jerarquía de composición

- Reordenar CTAs y puntos de entrada para que `Desde catálogo`, `Desde servicio`, `Desde template` y `Manual` sean visibles y entendibles.
- Evitar que `Agregar item` siga siendo el único gesto dominante.

### Slice 2 — Provenance visible

- Toda línea compuesta desde catálogo/servicio/template muestra chip o metadata de origen.
- Las líneas expandidas desde servicio conservan vínculo legible con `serviceSku` / nombre del servicio.

### Slice 3 — Source-aware editing

- El usuario puede editar una línea derivada sin perder completamente la noción de que viene de catálogo/servicio.
- Definir copy/estados para overrides locales sobre líneas derivadas.

## Out of Scope

- Nuevas migraciones o cambios de schema
- Nuevos cálculos de pricing engine
- Multi-currency final client-facing (`TASK-466`)

## Detailed Spec

Esta task existe solo si la integración entre `TASK-465` y `TASK-473` queda incompleta. El entregable no es “más features”, sino cerrar la experiencia de composición:

- el builder debe enseñar desde dónde se construye una quote
- el catálogo debe sentirse invocable
- el service composition catalog no puede quedar escondido detrás de una expansión silenciosa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] el builder expone claramente `catálogo`, `servicio`, `template` y `manual` como fuentes de composición
- [ ] el service composition catalog puede invocarse sin depender de descubrir un control secundario oculto
- [ ] las líneas del builder dejan trazabilidad visible de origen
- [ ] editar una línea derivada no rompe la comprensión del origen ni del override local

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual autenticada:
  - `/finance/quotes/new`
  - `/finance/quotes/[id]/edit`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado
- [ ] `Handoff.md` quedó actualizado si hubo decisiones de arquitectura/UI relevantes
- [ ] `changelog.md` quedó actualizado si cambió el comportamiento visible del módulo
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-465`, `TASK-473` y `TASK-466`

## Follow-ups

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`

## Delta 2026-04-19

- La task se crea como red de seguridad para absorber una integración UX incompleta entre ramas paralelas de `TASK-465` y `TASK-473`.
