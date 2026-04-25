# EPIC-004 — Typography Unification: Poppins Display + Geist Product UI

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (visible en toda pantalla del portal)
- Effort: `Alto` (~4-5 días calendario con paralelización; ~6 días secuencial)
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Owner: `unassigned`
- Branch: `epic/EPIC-004-typography-unification`
- GitHub Issue: `[optional]`

## Summary

Unificar el sistema tipográfico de Greenhouse EO a **Poppins** (display, solo variants `h1-h4`) + **Geist Sans** (todo product UI body, forms, tables, data, buttons, chips, labels) + **Geist Mono** (IDs, códigos, `monoId/monoAmount`). Eliminar **DM Sans** del portal. Eliminar **toda referencia a `fontFamily: 'monospace'`**. Establecer governance vía ESLint custom rule y reescritura del token doc canónico.

## Why This Epic Exists

El sistema actual tiene 3 problemas compuestos que no caben en una sola task:

1. **Violación del token canónico declarado**: `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` declara "Poppins solo en marketing landing pages, prohibida en product UI". El theme (`mergedTheme.ts`) aplica Poppins a `h1-h6, button, overline, kpiValue` — todo product UI. El propio theme contradice la política.

2. **`fontFamily: 'monospace'` prohibido pero presente**: el token doc `§3.4 Prohibitions` dice "NEVER use `fontFamily: 'monospace'` for numbers. Use `fontVariantNumeric: 'tabular-nums'`". `mergedTheme.ts` usa monospace en `monoId` y `monoAmount`. Adicionalmente hay ocurrencias hardcoded en múltiples componentes (confirmadas en `src/components/greenhouse/GreenhouseFunnelCard.tsx`, `src/components/agency/SpaceHealthTable.tsx`, `src/components/agency/SpaceCard.tsx`, `src/components/agency/PulseGlobalHeader.tsx`, y probables en otros).

3. **DM Sans no es enterprise-leading para 2026**: Linear, Figma, Notion, Vercel, GitHub, Atlassian, Slack consolidaron en Inter / Geist / custom families purpose-built for UI. DM Sans es competente pero mid-tier en adoption, con feature depth OpenType menor que Geist y runway trayectorial declining. Para un portal que va a operar 10+ años con escalabilidad LATAM+global, Geist es la apuesta más robusta que preserva brand voice (Poppins en títulos) sin sacrificar data legibility (Geist en todo lo demás).

Cambiar esto a nivel portal toca ~15 workstreams distintos (theme, code sweep, emails, PDFs, governance, regression, Figma, skills). Un solo task bloquearía valor y volvería el review inmanejable. El epic coordina 4 tasks hijas para permitir paralelización + risk isolation + ship incremental.

## Outcome

- **Poppins aparece exclusivamente en `<Typography variant='h1|h2|h3|h4'>`** dentro del portal autenticado. El resto del tiempo el usuario lee en Geist Sans (body, controls, data, chips) o Geist Mono (IDs).
- **DM Sans eliminada** de `app/layout.tsx` y del theme.
- **Cero `fontFamily: 'monospace'`** en el codebase, incluyendo `mergedTheme.ts` (monoId/monoAmount) y componentes.
- **ESLint rule custom activa** que bloquea `fontFamily` hardcoded en `sx` y `fontFamily: 'monospace'` global, sparing h1-h4 context.
- **`GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` reescrito** con la política Poppins-display + Geist-UI + Geist-Mono-IDs, y governance clause explícita.
- **Visual regression Playwright verde** sobre ~20 surfaces críticas (Home, Pulse, Agency, Finance dashboards, HR Payroll, Admin Center, Quote Builder, People 360, login).
- **Email templates** (`src/emails/*`) con stack fallback inline declarado para `Poppins` y `Geist` con fallbacks a system fonts.
- **PDF generation** (`src/lib/finance/pdf/*`, `src/lib/payroll/generate-payroll-pdf.tsx`) registra las 3 fonts via `@react-pdf` `Font.register()`.
- **Figma design library** alineada: swap DM Sans → Geist en componentes del design system, agregar Geist Mono variant.
- **Skills y docs** actualizados: `greenhouse-ux`, `greenhouse-dev`, `greenhouse-ui-review`, `CLAUDE.md` dejan de mencionar DM Sans.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — fuente canónica de typography tokens (se reescribe §3.1)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` — UX baseline
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — contraste y legibilidad

Reglas transversales:
- Poppins **solo** en variants `h1-h4` del theme. Cualquier `sx={{ fontFamily: 'var(--font-poppins)' }}` fuera de un `<Typography variant='h1|h2|h3|h4'>` es violación.
- Geist Sans es **el default implícito** del theme. Nunca se declara explícito en `sx`.
- Geist Mono solo en variants `monoId`, `monoAmount`, y cualquier otro display de ID/código (caso por caso, documentado).
- Poppins queda cargada para posible uso marketing público (`/login` hero si se convierte en brand moment). Si no se usa, se dropea en el cleanup final.

## Child Tasks

- `TASK-566` — **Foundation**: font loading (`app/layout.tsx`), theme override (`mergedTheme.ts`), token doc §3.1 reescrito. Bloqueante para todas las demás. [~1 día]
- `TASK-567` — **Code sweep**: remover `fontFamily` y `fontWeight` hardcoded en componentes, eliminar `fontFamily: 'monospace'` global, ESLint rule custom. Depende de TASK-566. [~1 día]
- `TASK-568` — **Delivery surfaces**: email templates (`src/emails/*`) + PDF font registration (`@react-pdf`). Paralelizable con TASK-567 post-566. [~1 día]
- `TASK-569` — **Visual regression + Figma + docs cleanup**: Playwright baselines, sweep visual, Figma library swap, update skills (`greenhouse-ux`/`greenhouse-dev`/`greenhouse-ui-review`), `CLAUDE.md` typography section. Depende de TASK-566+567+568 completas. [~1-2 días]

## Existing Related Work

- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md` — **colisión parcial**: esta task existe para migrar `fontWeight/fontFamily` hardcoded al sistema de variants del theme manteniendo DM Sans+Poppins actual. TASK-567 de este epic **supersedes** TASK-021 porque además del sweep cambia la familia base. Al cerrar el epic, TASK-021 debe marcarse como resuelta o reclasificada.
- `docs/tasks/complete/CODEX_TASK_Typography_Hierarchy_Fix.md` — task legacy cerrada que estableció la hierarchy actual (DM Sans + Poppins). Referenciada como contexto histórico, no bloquea.
- `src/@core/theme/typography.ts` — **NO se toca**. Todos los overrides viven en `mergedTheme.ts` (convención Vuexy).

## Exit Criteria

- [ ] `app/layout.tsx`: DM Sans removida, Geist + Geist Mono cargadas via `next/font/google` como variable fonts, Poppins reducida a weights {500, 600, 700, 800}
- [ ] `mergedTheme.ts`: base `fontFamily` = Geist, solo `h1-h4` override a Poppins, `monoId/monoAmount` → Geist Mono, `button/overline/kpiValue/h5/h6` heredan Geist (sin Poppins)
- [ ] `GREENHOUSE_DESIGN_TOKENS_V1.md §3.1` reescrito con política nueva + decision matrix actualizada + governance clause
- [ ] `grep -r "fontFamily:" src/ --include='*.tsx' --include='*.ts'` retorna solo `mergedTheme.ts`, `Typography` theme helpers, y referencias a variables CSS — cero ocurrencias inline en componentes
- [ ] `grep -r "fontFamily: .monospace." src/ --include='*.tsx' --include='*.ts'` retorna 0 matches
- [ ] ESLint rule custom activa que bloquea: (a) `fontFamily` inline en `sx` en archivos bajo `src/app/(dashboard)/**` y `src/views/greenhouse/**`, (b) `fontFamily: 'monospace'` en cualquier archivo
- [ ] Email templates `src/emails/*` usan stack fallback explícito inline en `<style>` blocks: `'Geist', 'Helvetica', 'Arial', sans-serif` para body, `'Poppins', 'Helvetica', 'Arial', sans-serif` para headings marketing
- [ ] PDF generation: `src/lib/finance/pdf/render-quotation-pdf.ts`, `src/lib/payroll/generate-payroll-pdf.tsx`, `src/app/api/finance/income/[id]/dte-pdf/route.ts` registran Geist + Geist Mono + Poppins via `Font.register()`
- [ ] Playwright baselines pre-change capturados, post-change comparados, regressions de wrap/overflow/alignment resueltas
- [ ] Figma design library actualizada (DM Sans → Geist en todos los componentes, Geist Mono variant agregada)
- [ ] Skills `greenhouse-ux`, `greenhouse-dev`, `greenhouse-ui-review` actualizadas para referenciar Geist + Poppins + Geist Mono en lugar de DM Sans + Poppins
- [ ] `CLAUDE.md` typography section (si existe) actualizada
- [ ] `Handoff.md` + `changelog.md` sincronizados con el cambio

## Non-goals

- **No migrar a Inter**. Geist es la elección deliberada para balance enterprise + design-forward, no Inter.
- **No eliminar Poppins completamente**. Poppins queda cargada y activa en h1-h4 como brand voice permanente del portal.
- **No rediseñar componentes** mientras se hace el font swap. Este epic es cambio de familia + governance, no redesign de UX.
- **No tocar `src/@core/theme/*`** (convención Vuexy: los core themes no se tocan, solo `mergedTheme.ts`).
- **No migrar logos, iconografía, ni branding visual** más allá de typography.
- **No tocar Grift**. Grift sigue siendo tipografía editorial/print para logo SVG únicamente.
- **No actualizar branding físico** (tarjetas, presentaciones, decks) — alcance exclusivo al portal.

## Risk inventory

| Riesgo | Mitigación |
|---|---|
| Bundle size +150KB por cargar Geist + Geist Mono sobre Poppins existente | Variable fonts (single file por font) minimizan impact; `display: 'swap'` evita FOUT |
| Geist i18n coverage menor (Latin + Extended sólido, Cyrillic/Greek básico, Vietnamese ausente) | Fallback explícito a `system-ui` en el stack. Flag para Follow-up si Globe clients expanden a scripts no cubiertos |
| Text wrap/overflow regressions en tablas y chips (métricas ligeramente distintas Geist vs DM Sans) | TASK-569 con Playwright baselines + sweep manual |
| Email clients ignoran custom fonts → fallback al system default | Stack fallback robusto declarado inline. Testing en Gmail/Outlook/iCloud |
| PDF rendering inconsistente si `Font.register()` falla | Validación manual de quote PDF, payroll receipts post-change |
| Dual-family tension visual (h4 Poppins vs body Geist cerca) | Design review Slice 1 de TASK-569. Ajuste de `fontWeight` h4 si necesario para armonía |
| Figma library drift post-code-change (diseñadores siguen usando DM Sans en nuevos mockups) | TASK-569 sweep Figma + comunicación al equipo de diseño |
| Lint rule false positives / falsos negativos | TASK-567 test set de casos edge documented |

## Delta YYYY-MM-DD

_(Espacio reservado para registrar cambios materiales al epic después de su creación.)_
