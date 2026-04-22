# TASK-565 — Quote Builder Context Strip Modernization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-565-quote-builder-context-strip-modernization`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

El `QuoteContextStrip` actual renderiza 8 chips uniformes (`Organización*`, `Contacto`, `Deal HubSpot`, `Business line`, `Modelo comercial`, `País`, `Moneda`, `Duración`) + un `Válida hasta` huérfano en segunda fila. Todos al mismo peso visual, mismo tono outline azul, mismo `maxWidth: 320` hardcoded, sin jerarquía entre campos críticos (requeridos) y metadata (derivable). Visualmente "del 2016": patrón form-row legacy vestido de chip. Esta task lo moderniza al bar 2026 (Stripe/Linear/Vercel) introduciendo 3 tiers de prominencia, agrupación semántica (Party / Commercial terms / Timing), estado empty-blocking con tensión warning, y un progress counter de completitud — sin instalar librerías nuevas.

## Why This Task Exists

El strip es la puerta de entrada de Quote Builder — es lo primero que el usuario ve y toca. Su diseño actual:

1. **No jerarquiza**: `Organización*` (foundation de todo el builder, requerido) se ve igual que `Duración: Meses` (metadata blanda). El usuario no sabe dónde arrancar.
2. **No agrupa**: los 8 slots se dividen naturalmente en 3 grupos cognitivos (Party / Terms / Timing), la UI no lo refleja. El cerebro procesa 8 equals en paralelo cuando debería procesar 3 grupos.
3. **No comunica tensión**: cuando `Deal HubSpot` está vacío y bloquea downstream (ver TASK-564), el chip se ve idéntico a `Moneda: CLP` que está ok. Italic gris no señala "acción requerida".
4. **Tokens off**: `fontSize: '0.6875rem'`, `opacity: 0.7`, `maxWidth: 320` hardcoded en [`ContextChip.tsx:221,260-269`](src/components/greenhouse/primitives/ContextChip.tsx#L221) violan `GREENHOUSE_DESIGN_TOKENS_V1.md`.
5. **Densidad plana**: todos los chips consumen la misma vertical real-estate sin reflejar su peso en el flujo de cotización.

Cerrar este gap sube el percibido de craft del flujo comercial (surface diaria para Sales Ops) sin tocar lógica — es puramente visual + estructural.

## Goal

- 3 tiers de prominencia visual claramente diferenciados: Identity primario (Party), terms inline secundarios, timing metadata terciario.
- Agrupación semántica con `<fieldset>` + `<legend class='sr-only'>` para screen readers.
- `status='blocking-empty'` con bg `warning` tinted + icon `tabler-alert-circle` + CTA adyacente condicional ("Vincular Company HubSpot", "Agregar contacto") — la tensión empty no es más silent placeholder italic.
- `FieldsProgressChip` con radial 20px ApexCharts + `AnimatedCounter` para el counter "N de M campos".
- Eliminación de primitives hardcoded (`maxWidth: 320`, `fontSize: '0.6875rem'`, `opacity: 0.7`) → tokens canónicos.
- Responsive: desktop 3 líneas, tablet Party + Terms en grid 2×2, mobile Party en scroll-x + Terms colapsable en `<Details>`.
- **Cero dependencias nuevas**: se resuelve con MUI v7 + framer-motion + ApexCharts ya instalados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — fuente canónica de tipografía, spacing, borderRadius, colores semánticos
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías disponibles, reglas de import
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` — UX baseline
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — WCAG 2.2 AA

Reglas obligatorias:

- **Cero nuevas dependencias npm.** Este rediseño se resuelve con MUI v7 + framer-motion (vía `@/libs/FramerMotion`) + ApexCharts + tokens canónicos. La robustez viene de extraer primitives bien.
- Motion imports solo desde `@/libs/FramerMotion`; reduced-motion via `@/hooks/useReducedMotion`.
- Toda tipografía, spacing, borderRadius debe citar tokens de `GREENHOUSE_DESIGN_TOKENS_V1.md`. Prohibido hardcodear `fontSize`, `maxWidth`, `opacity` crudos.
- Color `warning` (`#ff6500`) reservado para tensión de estado required/bloqueante, **no** para CTA diferenciation — regla del skill `greenhouse-ux`.
- Interaction cost cap: cada chip Tier 1 ≤2 clicks (abrir popover + seleccionar); Tier 2 inline ≤2 clicks.
- Reduced-motion: toda microinteracción gated por `useReducedMotion`.
- 13-row component floor del skill `modern-ui` debe pasarse en review.

## Normative Docs

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — tokens canónicos
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` — UX baseline
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — a11y rules
- `src/config/greenhouse-nomenclature.ts` (`GH_PRICING.contextChips.*`) — source de strings de UI

## Dependencies & Impact

### Depends on

- Ninguna task bloqueante. Toda la foundation existe: `ContextChip` primitive, `ContextChipStrip` primitive, `AnimatedCounter`, `useReducedMotion`, ApexCharts wrapper, tokens V1.
- `TASK-564` (gating del CTA "Crear deal nuevo") convive con este task — si se ejecuta antes, la UX de `blocking-empty` de Deal HubSpot ya tendrá el path de remediación; si se ejecuta en paralelo, ambos tocan `QuoteBuilderShell.tsx` y deben coordinarse en merge (ver Impacts).

### Blocks / Impacts

- Impacta **todas las surfaces que usan `ContextChipStrip`** — hoy solo Quote Builder. Si se introducen otras superficies que lo reusan antes de cerrar este task, revisar contrato.
- Colisiones potenciales:
  - `TASK-564` toca `QuoteBuilderShell.tsx` (línea 1562-1574). Si ambos ejecutan en paralelo, coordinar merge.
  - `TASK-562` (Quote Tax Explicitness Follow-ups Slice 1 — dropdown de `tax_code` en header de Quote Builder) probablemente va a agregar un chip más al strip. Si ejecuta después, va a consumir los primitives nuevos de este task. Si ejecuta antes, hay re-work.

### Files owned

- `src/components/greenhouse/primitives/ContextChip.tsx` — agregar `prominence` prop (`primary` | `inline` | `meta`) + `status='blocking-empty'`
- `src/components/greenhouse/primitives/ContextChipStrip.tsx` — soportar layout multi-tier
- `src/components/greenhouse/primitives/InlineContextTokens.tsx` — nuevo primitive para Tier 2 (dots inline)
- `src/components/greenhouse/primitives/FieldsProgressChip.tsx` — nuevo primitive con radial ApexCharts + AnimatedCounter
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` — restructure completo a 3-tier layout
- `src/config/greenhouse-nomenclature.ts` — ajustar `GH_PRICING.contextChips.*` a verbos accionables (coordinar con `greenhouse-ux-writing`)
- `docs/ui/stories/` (o equivalente showcase) — stories de prominence variants para axe gate

## Current Repo State

### Already exists

- `src/components/greenhouse/primitives/ContextChip.tsx` (546 líneas) — popover + Autocomplete pattern, `status: 'empty' | 'filled' | 'invalid' | 'locked'`, `outline 2px focus`, keyboard nav, reduced-motion respect
- `src/components/greenhouse/primitives/ContextChipStrip.tsx` (130 líneas) — `role='toolbar'`, flex-wrap desktop + scroll-x mobile con gradient edges
- `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (639 líneas) — render de 8 chips
- `src/components/greenhouse/AnimatedCounter.tsx` — reusable para progress counter
- `src/hooks/useReducedMotion.ts` — a11y helper canónico
- `src/libs/FramerMotion/*` — motion imports canónicos
- ApexCharts wrapper `AppReactApexCharts` — usable para radial 20px
- `GREENHOUSE_DESIGN_TOKENS_V1.md` — tokens canónicos de tipografía, spacing, borderRadius

### Gap

- `ContextChip` no tiene variant de prominencia — todos los chips se renderean igual.
- `status` no cubre `blocking-empty` (empty + required + bloquea downstream). Hoy empty muestra dashed border + italic gray, sin tensión.
- `maxWidth: 320` hardcoded en `ContextChip.tsx:221` → rompe ritmo visual con valores cortos (CLP).
- `fontSize: '0.6875rem'`, `opacity: 0.7` en el label rompen la escala canónica de tokens V1.
- `QuoteContextStrip` renderiza todo en un solo `Stack direction='row'` sin agrupación semántica (no `<fieldset>`).
- Copy actual de empty-state es placeholder descriptivo pasivo ("Sin deal vinculado", "Sin contacto asignado") en vez de verbos accionables.
- No hay indicador de progreso de completitud — el usuario no sabe cuántos campos faltan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Prominence tiers + blocking-empty semantics

Re-arquitectura visual del strip. Entregable: UI del strip pasa del patrón "8 chips iguales" al patrón "3 tiers agrupados semánticamente" con feedback de tensión para empty-bloqueante.

- `ContextChip`: agregar prop `prominence: 'primary' | 'inline' | 'meta'`, default `'primary'` para backwards-compat.
  - `primary`: caja completa, `minHeight: 44` (touch target), icon+label+value+chevron, tipografía `overline` (label) + `subtitle2` (value filled).
  - `inline`: sin caja, valor como `body2` con `border-bottom: 1px dashed divider` on hover, separador `·` inyectado por el padre.
  - `meta`: `caption` + `color='text.secondary'`, touch target mínimo 24×24 (no requerido que llegue a 44 por ser metadata derivable).
- `ContextChip`: agregar `status: 'blocking-empty'` con:
  - `backgroundColor: alpha(warning.main, 0.08)`
  - `border: 1px solid warning.main`
  - `icon`: override a `tabler-alert-circle`
  - `color: warning.dark` (contraste ≥4.5:1 verificado)
  - Micro-label "requerido" debajo del chip con `caption` + `color='warning.main'`.
- `ContextChip`: remover `maxWidth: 320` hardcoded; reemplazar por `maxWidth: '40ch'` + `minWidth: 'max-content'`.
- `ContextChip`: reemplazar `fontSize: '0.6875rem'` + `opacity: 0.7` del label por `Typography variant='overline'` + `color='text.secondary'`. Cita canonical del skill: "Metric label → `overline` + `color='text.secondary'`".
- `QuoteContextStrip`: restructure a 3 `<fieldset>` anidados:
  - Fieldset 1 "Cliente" (legend sr-only): chips Tier 1 — Organización, Contacto, Deal HubSpot.
  - Fieldset 2 "Términos comerciales" (legend sr-only): inline Tier 2 — Business line, Modelo comercial, País, Moneda (render con `InlineContextTokens` primitive nuevo).
  - Fieldset 3 "Plazos" (legend sr-only): Tier 2/3 inline — Duración, Válida hasta.
- CTA adyacente condicional: cuando chip primary tiene `status='blocking-empty'`, renderizar `Button variant='text' color='warning' size='small'` inline después del chip con label accionable ("Vincular Company HubSpot", "Agregar contacto"). Solo cuando existe un path de remediación.
- `src/config/greenhouse-nomenclature.ts`: actualizar `GH_PRICING.contextChips.deal.empty`, `contact.empty`, etc. a verbos accionables. Mantener keys, cambiar strings. Coordinación con `greenhouse-ux-writing` antes de mergear.

### Slice 2 — FieldsProgressChip + microinteracciones de estado

Entregable: counter de completitud con radial animado, pulse sutil en blocking-empty, transitions emphasized.

- Nuevo primitive `src/components/greenhouse/primitives/FieldsProgressChip.tsx`:
  - Props: `filled: number`, `total: number`, `testId?: string`.
  - Render: `Stack direction='row'` con ApexCharts radialBar 20×20 + `AnimatedCounter value={filled} format='integer'` + "de {total} campos" en `caption`.
  - Color del radial: `success.main` si ≥80% filled, `warning.main` 50-79%, `error.main` <50%.
  - `role='status'`, `aria-live='polite'`, `aria-atomic='true'`.
  - Mensaje sr-only: "Cotización completa en {percent}%. Faltan {n} campos."
  - Reduced-motion: radial static, `AnimatedCounter` con `duration=0` (ya soporta).
- `ContextChip` con `status='blocking-empty'`: pulse sutil `opacity: 0.88 ↔ 1.0` durante 1.2s × 2 ciclos, disparado **solo una vez** post-organization-select (no infinite loop). Gated por `useReducedMotion`. Implementado con `motion.div` wrapper, `animate={shouldPulse ? { opacity: [0.88, 1, 0.88, 1] } : {}}`.
- Transitions: subir `transitions.duration.shortest` (150ms) a `200ms` con easing `cubic-bezier(0.2, 0, 0, 1)` (Material 3 emphasized) para el state-change de empty→filled. Aplicar solo en el chip primary; inline+meta mantienen 150ms.
- Progress counter integrado en `QuoteContextStrip` al final del Tier 3 (right-aligned en desktop, debajo de Tier 1 en mobile).

### Slice 3 — Responsive density + mobile refinement

Entregable: strip se adapta cleanly a 3 breakpoints sin romper jerarquía.

- Desktop (`≥md`): 3 líneas visibles (Party / Terms / Timing + progress counter).
- Tablet (`sm`–`md`): Party en línea propia (3 chips Tier 1), Terms en grid 2×2 inline, Timing colapsa en `<Details>` nativo HTML con chevron.
- Mobile (`<sm`): Party en `ContextChipStrip` con scroll-x horizontal (patrón actual ✓), Terms colapsa en MUI `Accordion` labeled "Configuración avanzada", Timing solo muestra `FieldsProgressChip` + tap-to-expand.
- Touch targets en mobile: todos los chips Tier 1 a `minHeight: 44`. Verificar con test Playwright de viewport 320px.
- Validar reflow a 320×200% zoom + WCAG 1.4.12 text-spacing overrides (line-height 1.5, paragraph 2×, letter 0.12em).

## Out of Scope

- **Rediseño del popover interno del chip.** El Autocomplete + listbox actual es accesible y funcional — solo se toca si un hallazgo específico del slice emerge. Este task es sobre el strip en idle/hover/focus, no sobre el search-within-popover.
- **Command palette global tipo Linear.** Sería una task separada que introduciría `cmdk` o equivalente, paralelo al strip. No aquí.
- **Atajos de teclado para focus directo a un chip** (`O → Organización`, `D → Deal`). Follow-up con `react-hotkeys-hook` si la telemetría muestra uso power-user.
- **Cambios a la lógica de validación del form.** Este task es visual/estructural; las reglas de qué es required/optional siguen viniendo del builder.
- **Nuevos campos.** No se agregan chips nuevos (ej. `tax_code` de TASK-562). Si TASK-562 ejecuta después de este, va a consumir los primitives nuevos.
- **Redesign del resto del Quote Builder** (items de cotización, footer totals). Solo el strip superior.

## Detailed Spec

### Layout blueprint (desktop)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ┌─ Cliente ──────────────────────────────────────────────────────────────┐ ║
║  │ ╭───────────────────╮ ╭─────────────────╮ ╭──────────────────╮         │ ║
║  │ │ 🏢 Organización*  │ │ 👤 Contacto     │ │ 🔗 Deal HubSpot  │         │ ║
║  │ │ Santander – Chile │ │ Agregar contacto│ │ Vincular deal    │ Vincular│ ║
║  │ ╰───────────────────╯ ╰─────────────────╯ ╰──────────────────╯ Company │ ║
║  │                                            ↑ blocking-empty    HubSpot │ ║
║  └──────────────────────────────────────────────────────────────────────────┘
║  ┌─ Términos comerciales ─────────────────────────────────────────────────┐ ║
║  │ Efeonce Digital · On-Going +0% · Chile Corp ×1.00 · CLP                │ ║
║  │ ↑ cada token underlinable on-hover, click abre popover                 │ ║
║  └──────────────────────────────────────────────────────────────────────────┘
║  ┌─ Plazos ─────────────────────────────────────── [3 de 5 ✓ 60%] ───────┐ ║
║  │ Duración: Meses · Válida hasta: —              ↑ FieldsProgressChip    │ ║
║  └──────────────────────────────────────────────────────────────────────────┘
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Component APIs (nuevos/modificados)

```tsx
// ContextChip (modificado)
interface ContextChipProps {
  // ... props existentes
  prominence?: 'primary' | 'inline' | 'meta' // default 'primary'
  status?: 'empty' | 'filled' | 'invalid' | 'locked' | 'blocking-empty'
  requiredHint?: string // label cuando status='blocking-empty' (ej "requerido")
  actionSlot?: ReactNode // CTA adyacente renderizada fuera del chip por el padre
}

// InlineContextTokens (nuevo)
interface InlineContextTokensProps {
  tokens: Array<{
    id: string
    label: string
    value: string
    onClick: () => void
    ariaLabel?: string
  }>
  separator?: ReactNode // default: middot
  ariaLabel: string
}

// FieldsProgressChip (nuevo)
interface FieldsProgressChipProps {
  filled: number
  total: number
  testId?: string
}
```

### Token mapping (cita `GREENHOUSE_DESIGN_TOKENS_V1.md`)

| Elemento | Token |
|---|---|
| Label Tier 1 | `overline` + `color='text.secondary'` |
| Value filled Tier 1 | `subtitle2` (14/600) + `color='text.primary'` |
| Value empty Tier 1 | `body2` + `color='text.secondary'` + `fontStyle='italic'` (reusar actual) |
| Value blocking-empty Tier 1 | `body2` + `color='warning.dark'` + `fontWeight=500` |
| Value Tier 2 inline | `body2` + `color='text.primary'` |
| Separador `·` Tier 2 | `body2` + `color='text.secondary'` + `mx: 1.5` |
| Counter Tier 3 | `caption` + `color='text.secondary'` |
| Radius chip primary | `customBorderRadius.md` (6px) |
| Spacing outer strip | `spacing={3}` (12px) entre líneas |
| Spacing inner Tier 1 | `spacing={1.5}` (6px) entre chips |
| Touch target Tier 1 | `minHeight: 44` (subida desde 40) |
| Pulse reduced-motion | `useReducedMotion` → `animate={{}}` |
| Transition emphasized | `cubic-bezier(0.2, 0, 0, 1)` 200ms en Tier 1 |

### Copy ajustes (coordinación con `greenhouse-ux-writing`)

| Key | Actual | Propuesto |
|---|---|---|
| `deal.empty` | "Sin deal vinculado" | "Vincular deal" |
| `deal.emptyHelper` (nuevo) | — | "Seleccioná un deal de HubSpot o creá uno nuevo" |
| `contact.empty` | "Sin contacto asignado" | "Agregar contacto" |
| `organization.emptyRequired` (nuevo) | — | "Elegí el cliente antes de cotizar" |
| `progress.label` (nuevo) | — | "{filled} de {total} campos" |

### Accesibilidad floor (13-row checklist del skill `modern-ui`)

| # | Row | Implementation |
|---|---|---|
| 1 | Semantic root | `<fieldset>` + `<legend class='sr-only'>` por grupo; `ContextChipStrip` mantiene `role='toolbar'` |
| 2 | Keyboard reachable | Tab/Shift+Tab entre chips; Enter/Space abre popover; Escape cierra; arrows dentro del listbox (ya resuelto por MUI Autocomplete) |
| 3 | Focus ring | `outline 2px primary + offset 2px` en `:focus-visible` (ya existe) |
| 4 | Accessible name | `aria-label` compuesto por `label + value` (ya existe); CTA adyacente con `aria-describedby` al chip padre |
| 5 | Color contrast | Verificar `warning.main #ff6500` vs bg paper en light+dark con axe — objetivo ≥3:1 border UI, ≥4.5:1 texto |
| 6 | Touch target | `minHeight: 44` en Tier 1; Tier 2/3 ≥24 CSS px (cumple por defecto en body2) |
| 7 | All states designed | default, hover, focus, active, disabled, loading, empty, blocking-empty, invalid, filled, locked, readonly |
| 8 | No ARIA where HTML works | `<fieldset>`, `<legend>`, `<button>`, `<dialog>` (popover) — minimizar ARIA |
| 9 | Reduced motion | pulse, radial, counter — todos gated |
| 10 | Touch alternatives | No drag-only interactions |
| 11 | Reflow | Test Playwright 320×200% |
| 12 | Tokens, not primitives | Eliminar `maxWidth: 320`, `fontSize: '0.6875rem'`, `opacity: 0.7` hardcoded |
| 13 | Automated gate | `axe` en stories nuevos (`/primitives/context-chip`, `/primitives/fields-progress-chip`) |

### Zero-dependency policy

Verificación explícita: las 3 slices se resuelven con los siguientes imports ya en package.json:

- `@mui/material` (v7) — Stack, Box, Typography, Button, Popover, Autocomplete, Fieldset (nativo HTML), Details (nativo)
- `@/libs/FramerMotion` — motion.div para pulse
- `@/hooks/useReducedMotion` — gate canónico
- `AppReactApexCharts` — radial 20×20 en FieldsProgressChip
- `@/components/greenhouse/AnimatedCounter` — counter del progress
- Tokens canónicos (no se instala nada nuevo)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `QuoteContextStrip` renderiza 3 grupos visuales distinguibles (Party / Commercial terms / Timing) con `<fieldset>` + `<legend class='sr-only'>` cada uno.
- [ ] Chips Tier 1 tienen `minHeight: 44` y touch target accesible en mobile.
- [ ] Chips Tier 2 se renderizan como tokens inline con separador `·` y subrayado punteado on-hover (no cajas).
- [ ] `ContextChip` acepta prop `prominence` con 3 valores y default `'primary'` (backwards-compat).
- [ ] `status='blocking-empty'` renderiza bg warning tinted + icon `tabler-alert-circle` + micro-label "requerido" debajo.
- [ ] CTA adyacente ("Vincular Company HubSpot") aparece **solo** cuando el chip es blocking-empty y hay path de remediación definido por el padre.
- [ ] `FieldsProgressChip` muestra radial ApexCharts 20×20 + AnimatedCounter, con `role='status'` + `aria-live='polite'`.
- [ ] Pulse de blocking-empty se dispara máximo 2 ciclos post-select de organización, nunca en loop infinito.
- [ ] Reduced-motion desactiva pulse + radial animation + counter tweening.
- [ ] Axe a11y scan clean sobre las stories nuevas (context-chip prominence variants + fields-progress-chip).
- [ ] `pnpm test` pasa con ≥3 tests nuevos por primitive nuevo (ContextChip prominence, InlineContextTokens, FieldsProgressChip).
- [ ] `package.json` no suma dependencias nuevas — verificado por diff.
- [ ] Strip se renderiza limpiamente en 320px viewport con 200% zoom (sin horizontal scroll innecesario, sin overflow de chips).
- [ ] Validación visual manual contra el screenshot "2016" + comparativa con Stripe/Linear/Vercel en desktop + mobile.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test` (incluye unit tests de cada primitive)
- `pnpm build`
- Verificación manual en `dev-greenhouse.efeoncepro.com/finance/quotes/new` con 3 escenarios:
  - Org sin deal → chip Deal HubSpot en `blocking-empty` con CTA "Vincular Company HubSpot" inline (happy con TASK-564 cerrado)
  - Org nueva + contacto faltante → chip Contacto en `empty` simple (no blocking, hay organization seleccionada pero contact es optional)
  - Quote completo (5/5) → progress counter 100% verde
- axe + Playwright visual regression snapshot en las 3 breakpoints (320 / 768 / 1440).

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con screenshots before/after
- [ ] `changelog.md` actualizado (cambio visible de UI)
- [ ] Chequeo de impacto cruzado sobre `TASK-562` (si agregó chip de tax_code) y `TASK-564` (CTA de deal creation)

- [ ] `greenhouse-ui-review` skill gate ejecutado sobre el PR antes de mergear.
- [ ] `greenhouse-ux-writing` skill ejecutado sobre los ajustes de `GH_PRICING.contextChips.*` antes de mergear.
- [ ] Stories de los 3 primitives agregadas al showcase del repo (axe-auditable).

## Follow-ups

- **Atajos de teclado power-user** (`O` → focus Organización, `D` → focus Deal): evaluar `react-hotkeys-hook` (~1KB) si telemetría muestra ≥10% de sesiones con >3 cambios al strip. Task hermana.
- **Command palette global** tipo Linear/Raycast (`cmd+K` para editar cualquier campo del quote): spawn task nueva con `cmdk` o equivalente si se adopta como patrón cross-surface. No solo para Quote Builder.
- **Inferencia automática de `País` y `Moneda`** desde `organizationId` (legal entity) — si se implementa, los chips Tier 2 correspondientes pasan a `status='locked'` con badge "derivado".
- **Progress counter con breakdown**: tooltip del counter mostrando qué campos faltan por nombre (ej. "Falta: Contacto, Válida hasta").
- **Variante del strip para otras surfaces** (ej. Purchase Orders, Contracts) — reutilizar los mismos primitives. Evaluar al cerrar este task.

## Open Questions

- ¿El `País` actual (`Chile Corporate · ×1.00`) es editable o derivado de `organizationId`? Si es derivado, debería ser `status='locked'` con badge "heredado". Resolver en Discovery.
- ¿La `Moneda` (`CLP`) es editable post-organization-select o queda locked por country factor? Afecta si Tier 2 o meta.
- ¿Qué métrica define "campo completo" para el progress counter? Organización + Contacto + Deal + Business line + País/Moneda + Duración + Válida hasta = 7; ¿se cuentan los 7 o se pondera required vs optional?
- ¿El pulse de blocking-empty debe ejecutarse una vez por sesión o cada vez que el usuario cambia de organización? Recomendación: **una vez por organization-change**, no por session.
