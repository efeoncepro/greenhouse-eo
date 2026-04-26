# TASK-615 — Quote Builder Flow Orchestration & UX Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado 2026-04-25`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-615-quote-builder-flow-orchestration-ux-hardening`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Follow-up focalizado sobre la surface `/finance/quotes/new` y `/finance/quotes/[id]/edit` para converger la intención UX ya existente del Quote Builder con la percepción real de la pantalla. La task no reabre pricing, persistencia ni contratos HubSpot: endurece jerarquía, orquestación del flujo, copy operativa, empty states y microfeedback usando los primitives y reglas UI ya materializados en el repo.

## Why This Task Exists

El codebase del Quote Builder ya incorporó varias decisiones modernas correctas: `QuoteIdentityStrip`, `QuoteContextStrip`, `QuoteSummaryDock`, `SaveStateIndicator`, `MarginHealthChip`, `TotalsLadder`, selector unificado de parties, drawer inline de deals y empty states reutilizables. El gap actual no es de foundation sino de convergencia visual y operacional:

1. el header y el dock todavía compiten por ser el centro de acción terminal
2. el setup comercial se percibe más como metadata dispersa que como secuencia guiada
3. el empty state de ítems y el split button superior compiten entre sí cuando la tabla está vacía
4. varios estados parciales y de bloqueo ya existen en lógica, pero la pantalla no los comunica con suficiente claridad

Esto baja el percibido enterprise de una surface diaria y sensible, a pesar de que la base de producto ya es sólida.

## Goal

- Convertir el first fold del Quote Builder en una lectura más dominante y secuencial.
- Reubicar el peso visual de acciones para que la acción terminal viva donde ya están save state y total.
- Hacer que el setup superior, el estado vacío y los estados parciales enseñen mejor el flujo real del builder.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`

Reglas obligatorias:

- No tocar contratos de negocio del Quote Builder: pricing engine, persistencia de quotations, endpoints `/api/finance/quotes/**` y carriles HubSpot quedan fuera de esta task salvo wiring visual mínimo.
- Reutilizar primitives y wrappers existentes (`QuoteIdentityStrip`, `QuoteContextStrip`, `QuoteSummaryDock`, `EmptyState`, `SaveStateIndicator`, `TotalsLadder`, `Custom*`) antes de crear nuevos componentes.
- Toda mejora de motion o feedback debe respetar reduced motion y las reglas de `GREENHOUSE_UI_PLATFORM_V1.md`.
- La action hierarchy debe respetar la baseline UX: un CTA terminal dominante por momento, secundarios con menor peso visual.

## Normative Docs

- `docs/tasks/complete/TASK-505-quote-summary-dock-v2-hierarchy.md`
- `docs/tasks/complete/TASK-565-quote-builder-context-strip-modernization.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/components/greenhouse/pricing/QuoteIdentityStrip.tsx`
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx`
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/components/greenhouse/pricing/AddLineSplitButton.tsx`
- `src/config/greenhouse-nomenclature.ts`

### Blocks / Impacts

- Impacta directamente la percepción UX de `/finance/quotes/new` y `/finance/quotes/[id]/edit`.
- Puede reordenar affordances y copy que también usan primitives del Quote Builder; revisar compat con follow-ups como `TASK-609` y `TASK-620.4` antes de mezclar cambios.
- Si durante la ejecución se decide migrar `AddLineSplitButton` a `Floating UI`, coordinar con el backlog de popovers pendiente descrito en `GREENHOUSE_UI_PLATFORM_V1.md` y no mezclar un refactor platform-wide dentro de esta misma task.

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/components/greenhouse/pricing/QuoteIdentityStrip.tsx`
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx`
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`
- `src/components/greenhouse/pricing/AddLineSplitButton.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `Handoff.md`

## Current Repo State

### Already exists

- `QuoteBuilderShell` ya compone identidad, setup contextual, editor, notas y dock sticky en una sola surface.
- `QuoteContextStrip` ya modela `organization -> contacts -> deals` y soporta selector unificado de parties, progress chip y estados dependientes.
- `QuoteSummaryDock` ya materializa `SaveStateIndicator`, `MarginHealthChip`, `TotalsLadder`, emptyStateMessage y CTA terminal.
- `QuoteLineItemsEditor` ya tiene `EmptyState`, `headerAction`, wiring para catálogo / servicio / template y tabla editable con warnings por línea.
- `src/config/greenhouse-nomenclature.ts` ya concentra gran parte del microcopy operativo del builder.

### Gap

- La jerarquía real del flujo todavía no se lee con suficiente claridad en el first fold.
- La acción terminal aparece duplicada entre header y dock, erosionando el centro de gravedad de la pantalla.
- El setup comercial todavía se percibe más como una fila de contexto que como un paso guiado.
- El estado vacío de ítems y el split button superior compiten cuando todavía no existe contenido.
- Algunos blockers y estados parciales ya existen en lógica, pero el copy y el feedback visual todavía subcomunican el siguiente paso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Action Hierarchy Convergence

- Reequilibrar `QuoteIdentityStrip` y `QuoteSummaryDock` para que no compitan por la acción terminal del builder.
- Mantener el header enfocado en identidad, navegación y save draft; hacer del dock el lugar canónico de cierre operativo cuando sea coherente con el estado de la quote.
- Hacer visible la razón cuando la acción terminal esté deshabilitada, sin depender solo de contraste bajo.

### Slice 2 — Guided Commercial Setup

- Reforzar en `QuoteContextStrip` la lectura de setup secuencial: organización, contacto, negocio asociado y condiciones comerciales.
- Ajustar microcopy y placeholders en `greenhouse-nomenclature.ts` para que el strip explique mejor dependencia, bloqueo y siguiente paso.
- Subir el valor del progress feedback para que no sea solo conteo sino orientación contextual.

### Slice 3 — Empty State vs Toolbar Orchestration

- Reordenar `QuoteLineItemsEditor` para que, sin líneas, el empty state sea la affordance principal y el split button no compita visualmente.
- Mantener el split button como acelerador de continuidad una vez que ya existan ítems.
- Reescribir el empty state para enseñar el modelo de composición del builder con una acción primaria clara y secundarios honestos.

### Slice 4 — Partial States & Microfeedback Polish

- Endurecer feedback de loading, partial, ready y save-state en el shell y primitives existentes sin introducir una capa paralela de feedback.
- Mejorar señales inline cuando organización destraba contactos/deals o cuando el builder todavía no puede emitir.
- Revisar affordances de foco, disabled reasons y consistencia de estados bajo las reglas de accessibility y reduced motion ya vigentes.

## Out of Scope

- Cambios al `pricing-engine-v2`, `buildPersistedQuoteLineItems()`, simulación de pricing o contracts `/api/finance/quotes/**`.
- Cambios a `CreateDealDrawer` o a la lógica comercial/HubSpot más allá del copy o el wiring visual mínimo necesario.
- Rediseño de todo el editor de líneas o migración platform-wide de popovers a `Floating UI`.
- Features nuevas como IA asistiva, picker directo adicional o nuevos line types.

## Detailed Spec

La task debe tratar el Quote Builder como una convergencia, no como una reinvención. El criterio operativo es:

- preservar la arquitectura actual de `QuoteBuilderShell`
- ordenar la narrativa de la pantalla
- usar copy y jerarquía para aclarar el flujo antes de introducir motion nueva
- aprovechar foundations ya materializadas en `TASK-505` y `TASK-565` en vez de abrir otra familia de primitives

Decisiones de diseño esperadas:

1. **Header vs dock**
   - evitar dos acciones terminales con el mismo peso visual
   - conservar la relación entre total/margen/save state y la decisión de emitir

2. **Strip superior**
   - el usuario debe entender rápidamente qué necesita completar primero
   - los campos dependientes deben expresar por qué están vacíos o qué los destraba

3. **Estado vacío**
   - el CTA primario debe ser inequívoco
   - el estado vacío debe enseñar el modelo de composición, no solo invitar a “empezar”

4. **Feedback**
   - el sistema debe acusar recibo cuando un paso destraba el siguiente
   - los estados deshabilitados deben explicar causa y no solo bloquear

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El Quote Builder tiene un solo centro de gravedad claro para la acción terminal y ya no duplica ese peso visual entre header y dock.
- [ ] El bloque superior comunica mejor el setup de la quote y hace explícitos los estados dependientes de organización, contacto y deal.
- [ ] Cuando no hay líneas, el estado vacío de `QuoteLineItemsEditor` es la affordance dominante y el split button deja de competir con él.
- [ ] Los estados deshabilitados o parciales explican mejor qué falta y qué acción sigue, sin tocar contratos backend del builder.
- [ ] La surface sigue siendo consistente con `GREENHOUSE_UI_PLATFORM_V1.md`, `GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` y `GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- prueba manual en `/finance/quotes/new`
- prueba manual en `/finance/quotes/[id]/edit`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verificó la surface en create y edit para evitar que la jerarquía nueva solo funcione en uno de los dos modos

## Follow-ups

- Si el split button o los popovers del builder se migran a `Floating UI`, abrir follow-up separado y coordinarlo con el backlog platform-wide de popovers.
- Si durante la ejecución emerge deuda estructural en `QuoteContextStrip` o `QuoteSummaryDock`, preferir extraerla como follow-up reusable en vez de mezclar refactor platform-wide dentro de esta task.
