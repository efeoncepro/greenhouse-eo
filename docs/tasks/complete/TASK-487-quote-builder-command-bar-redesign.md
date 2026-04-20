# TASK-487 — Quote Builder Command Bar Redesign (Enterprise Pattern)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Cerrada 2026-04-19 — pendiente smoke staging + screenshot comparativo`
- Rank: `Inmediato — bloquea percepcion enterprise del programa comercial`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-487-quote-builder-command-bar-redesign`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Rediseno de `/finance/quotes/new` y `/finance/quotes/[id]/edit` bajo el patron Command Bar + Document Surface + Floating Summary Dock (convergente en Linear, Stripe, Ramp, Pilot). Reemplaza la Grid 8/4 con sidebar vertical por 4 layers apilados verticalmente: Identity Strip sticky, Context Chips Strip sticky, Document Card centrado y Summary Dock floating bottom. Libera el 33% de ancho que la sidebar consumia, escala a N campos de contexto via chips con popover, y alinea la superficie con el bar visual de producto SaaS enterprise 2024-2026.

## Why This Task Exists

La vista actual del quote builder ([QuoteBuilderShell.tsx](../../../src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx) + [QuoteBuilderActions.tsx](../../../src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx)) apila 11 controles en una sidebar vertical de 4/12 cols. Esto genera problemas concretos:

1. **Documento comprimido**: el line items editor y el cost stack viven en 8/12 cols (~700px en 1280 viewport). En laptops a 13" la tabla se desborda horizontal y el cost stack se siente apretado.
2. **Jerarquia plana**: Organizacion, Contacto, Business Line, Modelo Comercial, Pais, Moneda, Duracion, Valida Hasta, Descripcion, Addons y Warnings tienen el mismo peso visual. El usuario no sabe que es identidad vs contexto vs detalle vs totales.
3. **Warning huerfano**: `Missing cost components for role ECG-004` aparece al fondo de la sidebar, desconectado de la fila que lo origino, sin ancla de navegacion.
4. **Dos CTAs de guardado compitiendo**: `Guardar y cerrar` arriba + `Guardar cambios` en el footer de la tabla confunden el scope.
5. **Source selector + pills duplicados**: [QuoteSourceSelector.tsx](../../../src/views/greenhouse/finance/workspace/QuoteSourceSelector.tsx) arriba + 5 pills en el editor generan dos puntos de entrada para la misma accion.
6. **Mobile roto**: la sidebar en mobile colapsa debajo del documento, dejando 11 campos stackeados en 320px que el usuario debe scrollear antes de llegar a los items.
7. **Sin identidad de documento**: no hay numero `Q-XXXX`, chip de estado (`Borrador`), ni validez visible arriba como en Linear issue header o Stripe invoice create.
8. **Microinteracciones ausentes**: re-calculos de pricing, toggles de addon y adicion de lineas no tienen feedback de motion ni live region.

El patron Command Bar resuelve los 8 puntos con una sola reestructuracion y no requiere cambios de API ni schema — es puro frontend.

## Goal

- Reestructurar `QuoteBuilderShell` en 4 layers verticales (Identity + Context + Document + Summary Dock) sin sidebar
- Crear 6 componentes nuevos en `src/components/greenhouse/primitives/` y `src/components/greenhouse/pricing/`
- Consolidar `+ Agregar item` en un unico split-button que reemplaza `QuoteSourceSelector` y las 5 pills del editor
- Mover el band `Contexto de pricing` (FTE / Periodos / Tipo de contratacion) de sub-row inline a un Popover por fila (IconButton `tabler-adjustments`)
- Anclar warnings del engine a la fila que los origina (`<Alert dense>` inline con `aria-describedby`)
- Agregar live region + AnimatedCounter al total
- Respetar `useReducedMotion` en stagger, skeleton, counter y slide transitions
- Cumplir 13-row floor modern-ui en los 6 componentes nuevos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — gating del cost stack por entitlement
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `src/config/greenhouse-nomenclature.ts` — copy canonico (todo en espanol tuteo)

Reglas obligatorias:

- **Vuexy-first**: antes de crear, verificar en `full-version/src/views/` y `src/components/`. El letterhead reutiliza el patron de `full-version/src/views/apps/invoice/add/AddCard.tsx`.
- **NO modificar** `src/@core/`, `src/@layout/`, `src/@menu/`
- **Tokens, no primitives**: consumir `theme.palette.*` y `GH_PRICING` copy
- **Spanish tuteo** en todo UI
- **13-row floor modern-ui**: semantic root, keyboard, focus ring, accessible name, contrast, touch target ≥44px, all states, no ARIA where HTML works, reduced motion, touch alternatives, reflow 320/200%, tokens only, axe pass
- **Compatibilidad con TASK-486**: el selector de contacto anclable sigue ligado a organizacion y se mueve al ContextChip `Contacto`
- **No cambia API** ni contratos del pricing engine (`src/lib/finance/pricing/`) ni de los pickers (`SellableItemPickerDrawer`, `QuoteTemplatePickerDrawer`)

## Normative Docs

- `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md` — plan maestro de surfaces del programa pricing. Este task refina la Surface A (Quote Builder) con el patron Command Bar y reemplaza la sub-seccion de sidebar `QuoteBuilderActions` con `QuoteContextStrip`.
- `docs/tasks/complete/TASK-486-commercial-quotation-canonical-anchor.md` — contract de contacto anclable a organizacion; se preserva sin cambios al mover el selector al chip.
- `docs/tasks/to-do/TASK-473-quote-builder-full-page-surface-migration.md` — migracion previa a full-page (completada parcialmente); este task continua la linea de evolucion de la superficie.

## Dependencies & Impact

### Depends on

- Componentes pricing existentes: `src/components/greenhouse/pricing/{MarginIndicatorBadge,CurrencySwitcher,SellableItemPickerDrawer,CostStackPanel,SellableItemRow}.tsx`
- `src/components/greenhouse/{EmptyState,AnimatedCounter}.tsx`
- `src/hooks/useReducedMotion.ts`
- `src/hooks/usePricingSimulation.ts` (API contract intacto)
- `GH_PRICING` en `src/config/greenhouse-nomenclature.ts`

### Blocks / Impacts

- TASK-471 (Pricing Catalog Phase-4 UI Polish): el primitivo `ContextChip` es reusable en admin panels
- TASK-474 (Quote Builder Catalog Reconnection): se integra sobre este rediseno sin fricciones
- TASK-481 (Quote Builder Suggested Cost UX): el cost stack por fila sigue siendo el ancla; el popover "Ajustes" no invade esa zona

### Files owned

- `src/components/greenhouse/primitives/ContextChip.tsx` (nuevo)
- `src/components/greenhouse/primitives/ContextChipStrip.tsx` (nuevo)
- `src/components/greenhouse/pricing/QuoteIdentityStrip.tsx` (nuevo)
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (nuevo)
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` (nuevo)
- `src/components/greenhouse/pricing/AddLineSplitButton.tsx` (nuevo)
- `src/components/greenhouse/pricing/QuoteLineWarning.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (refactor)
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (refactor: popover Ajustes + inline warnings + empty state)
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx` (refactor: solo descripcion dentro del DocumentCard, el resto migra a chips)
- `src/views/greenhouse/finance/workspace/AddonSuggestionsPanel.tsx` (refactor: se integra al SummaryDock como popover-chip)
- `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx` (refactor: se divide en footer inline + QuoteSummaryDock)
- `src/views/greenhouse/finance/workspace/QuoteSourceSelector.tsx` (delete)
- `src/views/greenhouse/finance/workspace/QuotePricingWarningsPanel.tsx` (delete — reemplazado por warnings inline por row)
- `src/config/greenhouse-nomenclature.ts` (extend `GH_PRICING` con labels Identity/Context/Summary/AddMenu)

## Current Repo State

### Already exists

- Vuexy invoice pattern: `full-version/src/views/apps/invoice/add/{AddCard,AddActions}.tsx`
- Greenhouse pricing primitives (TASK-469): `src/components/greenhouse/pricing/*` con `SellableItemPickerDrawer`, `CurrencySwitcher`, `CostStackPanel`, `MarginIndicatorBadge`
- Pricing engine v2 y simulation hook: `usePricingSimulation`, `PricingLineOutputV2`
- Copy extension `GH_PRICING` en `src/config/greenhouse-nomenclature.ts`
- Builder state + submit flow funcional en `QuoteBuilderShell.tsx` (no se toca la logica, solo la superficie)

### Gap

- Patron Command Bar no existe en ningun lado del repo — este es el primer consumidor
- `ContextChip` primitivo no existe (no hay componente reusable de "chip con popover de edicion")
- No hay sticky dock pattern en el repo — todos los totales viven dentro de cards
- `QuoteSourceSelector` y pills de agregar estan duplicados; ambos se consolidan
- Warnings del engine estan agregados sin anclaje por row
- No hay `Popover` de "Ajustes" por fila para pricing context (FTE / Periodos / EmploymentType)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

(Plan consolidado en la conversacion 2026-04-19 aprobada por Julio. Ver Zone 3.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Primitivos reusables

- `ContextChip.tsx`: boton con estados (empty/filled/invalid/locked), abre Popover con contenido arbitrario, focus ring visible, ARIA `aria-haspopup="dialog"` + `aria-expanded`, keyboard Enter/Space, touch target ≥44px
- `ContextChipStrip.tsx`: container horizontal con overflow-x scroll en narrow containers, shadow edges en bordes cuando hay overflow, overflow menu `⋯` para N+1 chips en desktop si exceden ancho, `role="toolbar"` + `aria-label`

### Slice 2 — Componentes de quote

- `QuoteIdentityStrip.tsx`: sticky top, logo + numero `Q-XXXX` + status chip (Borrador/Enviada/Aprobada) + validez editable + CTAs (Cancel / Preview / Save split-button)
- `QuoteContextStrip.tsx`: wrapper que arma los 8 chips del builder (Org, Contacto, BL, Modelo, Pais, Moneda, Duracion, Terminos Pago) con sus popovers respectivos
- `AddLineSplitButton.tsx`: MUI ButtonGroup + Menu con 4 opciones (Catalogo / Servicio / Template / Manual), default on click = Catalogo
- `QuoteSummaryDock.tsx`: sticky bottom floating, bg-paper, elevation 4, muestra Subtotal / Factor / IVA / Total con AnimatedCounter, chip de addons + popover, primary CTA `Enviar al cliente`, colapsa a mini en scroll-down con intersection observer
- `QuoteLineWarning.tsx`: Alert dense severity=warning, `role="alert"`, `aria-describedby` al row id de la linea, con anchor link `Ir a la fila`

### Slice 3 — Refactor integrado

- `QuoteBuilderShell.tsx`: layout vertical `Stack spacing 0` con 4 layers (Identity → ContextStrip → DocumentCard → Dock), elimina Grid 8/4, elimina render de `QuoteSourceSelector`, mueve descripcion a Accordion "Detalle" dentro del DocumentCard
- `QuoteLineItemsEditor.tsx`: remove row pills (`+ Rol / + Persona / ...`), remove sub-row `Contexto de pricing`, add `IconButton tabler-adjustments` por row que abre Popover de pricing context, render inline `QuoteLineWarning` bajo rows con `structuredWarning.lineIndex === idx`, reemplazar empty state con `EmptyState` component
- `QuoteBuilderActions.tsx`: se trims a solo `<CustomTextField multiline Description>` (la descripcion vive en el Accordion "Detalle"); el resto (business line, modelo, pais, moneda, duracion, valida) migra al ContextStrip
- `AddonSuggestionsPanel.tsx`: contenido embebido dentro del Popover del chip de addons en SummaryDock
- `QuoteTotalsFooter.tsx`: version compact se mantiene dentro del DocumentCard (solo subtotales); SummaryDock toma los totales finales + CTA
- `QuoteSourceSelector.tsx`: **delete** (reemplazado por AddLineSplitButton)
- `QuotePricingWarningsPanel.tsx`: **delete** (reemplazado por QuoteLineWarning inline)

### Slice 4 — Copy + nomenclature

- Extension `GH_PRICING` con los 30+ labels nuevos:
  - `identityStrip.{titleNew, titleEdit, statusDraft, statusSent, statusApproved, statusExpired, validUntilLabel, previewCta, saveDraft, saveAndClose}`
  - `contextChips.{organizationEmpty, contactEmpty, businessLineEmpty, commercialModelEmpty, countryFactorEmpty, currencyEmpty, durationEmpty, paymentTermsEmpty, organizationLabel, contactLabel, ...}`
  - `summaryDock.{subtotalLabel, factorLabel, ivaLabel, totalLabel, addonsChip, sendCta, previewCta, scrollHintLabel}`
  - `addMenu.{triggerLabel, catalog, service, template, manual}`
  - `lineWarning.{fixAnchor, scrollToRow}`
  - `emptyItems.{title, subtitle, ctaPrimary, ctaSecondary, ctaTertiary}`
  - `adjustPopover.{triggerLabel, fteLabel, periodsLabel, employmentTypeLabel, applyLabel}`

### Slice 5 — Verificacion + cleanup

- Run `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build`
- Smoke staging: crear quote de 0 → agregar rol → ver cost stack → cambiar commercial model chip → ver total recalcular con counter
- Screenshot comparativo antes/despues
- Update `Handoff.md` + `changelog.md` + `docs/tasks/README.md`

## Out of Scope

- Cambios a API routes (`/api/finance/quotes/**`) — contrato inmutable
- Cambios a pricing engine (`src/lib/finance/pricing/`) — contrato inmutable
- Cambios a schema PostgreSQL — ninguna migracion
- Rediseno de `/finance/quotes/[id]` (preview del cliente) — este task es solo `/new` y `/edit`
- Rediseno de `/finance/quotes` (lista) — surface separada
- Eliminacion del toggle de preview/send drawer externo — se mantienen `QuoteSendDialog`, `QuoteSaveAsTemplateDialog`
- Multi-currency dynamic refresh — el `CurrencySwitcher` existente se reusa sin cambios, solo migra de sidebar a chip
- Activar animaciones Lottie nuevas — se reusa `EmptyState` existente con iconos

## Detailed Spec

### Layout blueprint

```
┌────────────────────────────────────────────────────────────────────────┐
│ BREADCRUMB  Finanzas › Cotizaciones › Nueva                            │
├────────────────────────────────────────────────────────────────────────┤
│ ROW 1 — IDENTITY STRIP  (h=64, sticky top 64)                          │
│ [G logo]  Nueva cotizacion  ·  Nº Q-NUEVO  ·  ● Borrador                │
│           Valida hasta [dd/mm/aaaa]       [Cancel][Preview][Save ▾]    │
├────────────────────────────────────────────────────────────────────────┤
│ ROW 2 — CONTEXT CHIPS STRIP  (h=56, sticky top 128)                    │
│ 🏢 Sky Airline▾  👤 Dianesty Santander▾  🎯 Globe▾  💼 On-Going▾        │
│ 🌎 Chile Corporate (×1.00)▾  💵 CLP▾  ⏱ 12 meses▾  💳 30d▾  ⋯         │
├────────────────────────────────────────────────────────────────────────┤
│ DOCUMENT SURFACE  (centered, max-width 1200, Card outlined)            │
│ Items (N)                                    [ + Agregar item ▾ ]      │
│ ──────                                                                 │
│ Empty: EmptyState Lottie + 3 CTAs jerarquicas                          │
│ Filled: table inline + Popover Ajustes + CostStack por row + Alert     │
│ ──────                                                                 │
│ Detalle (Accordion collapsible): Descripcion · Notas internas          │
│ ──────                                                                 │
│ TotalsFooter inline: Subtotal (preview) — los totales finales en Dock  │
├────────────────────────────────────────────────────────────────────────┤
│ FLOATING SUMMARY DOCK  (bottom sticky, h=72, z-index 1100, shadow 4)   │
│ Subtotal $1.200.000  ·  Factor ×1.00  ·  IVA $228.000                  │
│ TOTAL $1.428.000 CLP  [AnimatedCounter]                                │
│ ✨ 2 addons sugeridos▾         [Enviar al cliente →]                   │
└────────────────────────────────────────────────────────────────────────┘
```

### ContextChip props contract

```ts
interface ContextChipProps {
  icon: string                  // tabler-* icon class name
  label: string                 // "Organizacion"
  value?: string | null         // "Sky Airline" | null
  placeholder?: string          // "Seleccionar organizacion"
  status?: 'empty' | 'filled' | 'invalid' | 'locked'
  required?: boolean
  disabled?: boolean
  popoverContent: ReactNode     // el editor real dentro del popover
  popoverWidth?: number         // default 320
  onOpen?: () => void
  onClose?: () => void
  errorMessage?: string
  testId?: string
}
```

Variantes visuales:

- `empty` → border dashed `divider`, text `secondary`, icon skin `light-static secondary`
- `filled` → bg `primary.lightOpacity`, border `primary.main`, text `primary`, icon `primary`
- `invalid` → border `error.main`, text `error`, icon `tabler-alert-triangle` `error`, tooltip con `errorMessage`
- `locked` → bg `action.disabledBackground`, icon `tabler-lock` `disabled`, no clickable

Estados interactivos:

- hover → elevation 2, border `primary.main`
- focus-visible → outline 2px `primary.main` + offset 2px
- active → scale 0.98, 100ms
- popover abierto → border `primary.main` mantenido

A11y:

- `role="button"`, `aria-haspopup="dialog"`, `aria-expanded={open}`
- `aria-describedby={errorMessage ? errorId : undefined}` + `aria-invalid={status === 'invalid'}`
- Popover recibe focus trap automatico de MUI

### QuoteSummaryDock props contract

```ts
interface QuoteSummaryDockProps {
  subtotal: number | null
  factor: number | null
  ivaAmount: number | null
  total: number | null
  currency: PricingOutputCurrency
  loading?: boolean
  addonCount?: number
  addonContent?: ReactNode      // reused AddonSuggestionsPanel content
  primaryCtaLabel: string       // "Enviar al cliente"
  primaryCtaDisabled?: boolean
  primaryCtaLoading?: boolean
  onPrimaryClick: () => void
  secondaryCtaLabel?: string    // "Vista previa"
  onSecondaryClick?: () => void
  collapseOnScroll?: boolean    // default true — colapsa a mini en scroll down
}
```

Layout interno (desktop ≥ 900px):

- flex row, `justify-content: space-between`
- left: `Stack direction='row' spacing=4` con labels + values formatted
- middle: chip ✨ addons + popover
- right: `Stack direction='row' spacing=1` con secondary + primary CTAs

Layout interno (mobile < 900px):

- flex col
- total centrado grande
- FAB flotante (bottom-right) abre bottomsheet con desglose

Motion:

- Total value change: `AnimatedCounter duration=400 format='currency'`
- Loading: skeleton de ancho fijo con pulse, no spinner
- Scroll collapse: `transform: translateY(60px)` + mini label "Total $X — Ver"

### AddLineSplitButton props contract

```ts
interface AddLineSplitButtonProps {
  onCatalog: () => void
  onService: () => void
  onTemplate: () => void
  onManual: () => void
  disabled?: boolean
  defaultLabel?: string         // default GH_PRICING.addMenu.catalog
}
```

Render:

- MUI `ButtonGroup variant='contained'`
- Main button (left): label + icon `tabler-plus`, on click = onCatalog
- Caret button (right): icon `tabler-chevron-down`, opens Menu
- Menu items: catalog (default, bold), service, template, manual — cada uno con icon tabler-*

### Popover "Ajustes" por linea

Trigger: `IconButton` con `tabler-adjustments` en la columna de acciones (junto al trash).

Solo se muestra para rows cuyo `lineType === 'role' || lineType === 'person'` (los que tienen pricing context).

Contenido del Popover:

```tsx
<Popover open={open} anchorEl={anchorEl} onClose={close}>
  <Box sx={{ p: 3, width: 320 }}>
    <Typography variant='subtitle2'>Ajustes de pricing</Typography>
    <Stack spacing={2} sx={{ mt: 2 }}>
      <CustomTextField label='FTE' type='number' value={fte} helperText='0.1 a 1.0' />
      <CustomTextField label='Periodos (meses)' type='number' value={periods} />
      <CustomTextField select label='Tipo de contratacion' value={empType}>
        {employmentTypes.map(...)}
      </CustomTextField>
    </Stack>
    <Stack direction='row' spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
      <Button variant='tonal' color='secondary' onClick={close}>Cerrar</Button>
      <Button variant='contained' onClick={apply}>Aplicar</Button>
    </Stack>
  </Box>
</Popover>
```

Los cambios se aplican al metadata de la linea y disparan el re-calculo del engine.

### Microinteraction contract

| Trigger | Implementation | Reduced-motion fallback |
|---|---|---|
| Chip popover open | MUI `Popover` default transition (225ms ease-out) | MUI ya respeta `prefers-reduced-motion` |
| Chip value commit | CSS `@keyframes flash` 600ms tonal→default bg | skip flash, show check icon 2s |
| Line add stagger | Framer Motion `AnimatePresence` con delay `idx * 40ms` cap 200ms | `initial=false` + instant mount |
| Pricing simulating | MUI `Skeleton variant='text' animation='pulse'` | `animation=false`, static shimmer |
| Total change | `<AnimatedCounter duration={400} format='currency'>` existente | renders final value directly |
| SummaryDock collapse | `IntersectionObserver` + `transform: translateY` CSS transition 250ms | `collapseOnScroll={false}` |
| Cost stack expand | `<details>` nativo + `@starting-style` content | `details` nativo funciona con reduced-motion |
| Remove row | Row `motion.tr` con `exit={{ opacity: 0, height: 0 }}` 200ms | instant unmount |

### 13-row floor gate (por componente nuevo)

| Componente | SemRoot | Kbd | Focus | A11y name | Contrast | Target | States | HTML>ARIA | Reduced | Touch | Reflow | Tokens | Axe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ContextChip | button | ✓ Enter/Space | 2px primary | label+value | 4.5:1 | 44px | empty/filled/invalid/locked/hover/focus | ✓ | MUI respects | ✓ | wrap | ✓ | pass |
| ContextChipStrip | div role=toolbar | ✓ arrow keys | via children | `aria-label` | — | — | overflow/scroll edges | ✓ | — | ✓ | scroll-x | ✓ | pass |
| QuoteIdentityStrip | header | Tab | via children | `aria-labelledby=h1` | 4.5:1 | 44px | loading/saved/editing | ✓ | ✓ | ✓ | stack mobile | ✓ | pass |
| QuoteContextStrip | nav | Tab | via ContextChip | `aria-label="Contexto de la cotizacion"` | — | — | all chip states | ✓ | ✓ | ✓ | scroll-x mobile | ✓ | pass |
| QuoteSummaryDock | aside role=status | ✓ | primary CTA focus | `aria-live=polite` | 4.5:1 | 44px | empty/loading/filled/collapsed | ✓ | ✓ | ✓ | stack mobile | ✓ | pass |
| AddLineSplitButton | ButtonGroup | ✓ Enter on caret = menu | 2px primary | main+caret names | 4.5:1 | 44px | default/disabled/menu-open | ✓ | MUI respects | ✓ | wrap | ✓ | pass |
| QuoteLineWarning | Alert role=alert | focusable via link | default | `aria-describedby` | 3:1 | — | warning/info | ✓ | ✓ | — | stack | ✓ | pass |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/finance/quotes/new` y `/finance/quotes/[id]/edit` renderizan el nuevo layout (Identity + Context + Document + Dock) sin sidebar vertical
- [ ] 6 componentes nuevos creados y con tests unitarios minimos (render + happy path): ContextChip, ContextChipStrip, QuoteIdentityStrip, QuoteContextStrip, QuoteSummaryDock, AddLineSplitButton, QuoteLineWarning
- [ ] `QuoteSourceSelector.tsx` y `QuotePricingWarningsPanel.tsx` eliminados del repo
- [ ] `QuoteLineItemsEditor` ya no renderiza pills de agregar ni sub-row de contexto de pricing; usa `IconButton Ajustes` + Popover por row
- [ ] Totales se animan con `AnimatedCounter` en SummaryDock cuando cambia el valor
- [ ] Warnings del engine se renderizan inline bajo la row afectada con anchor al row id
- [ ] Mobile < 900px: ContextStrip scroll-x, Dock colapsa a FAB + bottomsheet
- [ ] Reduced-motion: stagger, counter, flash, collapse todos se degradan limpio
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes
- [ ] Smoke staging: flujo end-to-end crear borrador → agregar rol → ver cost stack → cambiar modelo via chip → total recalcula → guardar y cerrar
- [ ] Copy extension `GH_PRICING.identityStrip/contextChips/summaryDock/addMenu/lineWarning/emptyItems/adjustPopover` commiteado sin colisiones

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual staging smoke (via `pnpm staging:request` para agent auth)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`to-do` → `in-progress` → `complete`)
- [ ] archivo en carpeta correcta (`in-progress/` durante ejecucion, `complete/` al cerrar)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `TASK_ID_REGISTRY.md` con fila `TASK-487`
- [ ] `Handoff.md` registra resumen del rediseno + decisiones
- [ ] `changelog.md` registra cambio visible para usuarios finales
- [ ] chequeo de impacto cruzado sobre TASK-471, TASK-474, TASK-481
- [ ] Screenshot antes/despues anexado al handoff

## Follow-ups

- Evaluar extender `ContextChip` a otras superficies (invoice builder, PO builder, contract builder) — TASK derivada
- Explorar `popover` HTML nativo + anchor positioning para reemplazar MUI Popover en el futuro
- Medir WebVitals antes/despues (LCP del /new deberia mejorar por menos DOM)

## Open Questions

- Ninguna al inicio de ejecucion — plan aprobado por Julio 2026-04-19
