# TASK-569 — Typography Visual Regression + Figma Alignment + Skills/Docs Cleanup

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto` (validación final del epic)
- Effort: `Alto` (~1-2 días)
- Type: `implementation` + `policy`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform` + `content`
- Blocked by: `TASK-566` + `TASK-567` + `TASK-568`
- Branch: `task/TASK-569-typography-regression-figma-docs`

## Summary

Último task del EPIC-004. Valida el cambio tipográfico portal-wide via Playwright visual regression sweep (~20 surfaces críticas), alinea la Figma design library (swap DM Sans → Geist + add Geist Mono variant), actualiza los skills del repo (`greenhouse-ux`, `greenhouse-dev`, `greenhouse-ui-review`) y cualquier doc que mencione DM Sans o Poppins en roles incorrectos. Cierra el epic.

## Why This Task Exists

Después de TASK-566 (foundation theme), TASK-567 (code sweep + ESLint rule) y TASK-568 (emails + PDFs), el portal ya debería renderizar con el nuevo sistema tipográfico. Falta:

1. **Validar visualmente** que no hay regressions de wrap, overflow, alignment — Playwright baselines pre/post.
2. **Alinear la Figma design library** para que los diseñadores vean lo mismo que producción.
3. **Actualizar los skills** del repo que guían agentes AI + humanos (`greenhouse-ux` menciona DM Sans, `greenhouse-dev` idem, `greenhouse-ui-review` checklist).
4. **Actualizar `CLAUDE.md`** y docs de arquitectura que referencien typography.

Sin este task, el cambio queda "hecho técnicamente" pero el equipo de diseño + agentes AI siguen en la premisa anterior, generando drift en trabajos futuros.

## Goal

- Playwright visual regression verde sobre ≥20 surfaces críticas del portal.
- Figma design library components actualizados (DM Sans → Geist, Geist Mono agregado).
- Skills `greenhouse-ux`, `greenhouse-dev`, `greenhouse-ui-review` actualizados.
- `CLAUDE.md` typography references actualizados.
- Epic EPIC-004 cerrado con todos sus child tasks complete.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (post-566 rewrite)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` (si existe — método para validation visual canónico)

Reglas obligatorias:

- Visual regression con Playwright usando setup existente del repo (`tests/e2e/`).
- Figma update es paralelo — no bloquea merge del task, pero sí debe completarse antes de cerrar epic.
- Skills updates son cambios de markdown — no requieren code deploy.

## Normative Docs

- `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md`
- `docs/tasks/complete/TASK-566-typography-foundation-geist-poppins-theme.md` (debe estar complete)
- `docs/tasks/complete/TASK-567-typography-code-sweep-eslint-rule.md` (debe estar complete)
- `docs/tasks/complete/TASK-568-typography-email-pdf-font-registration.md` (debe estar complete)

## Dependencies & Impact

### Depends on

- TASK-566 (foundation) complete
- TASK-567 (code sweep + ESLint) complete
- TASK-568 (emails + PDFs) complete

### Blocks / Impacts

- Cierre del EPIC-004 depende de este task
- Figma drift (si no se alinea Figma, diseñadores siguen con DM Sans)
- Agentes AI que usen `greenhouse-ux` / `greenhouse-dev` sin update van a recomendar DM Sans por error

### Files owned

- `tests/e2e/typography-regression.spec.ts` [verificar location pattern; nuevo archivo]
- Figma design library (externa, tracking via PR checkpoint o doc de design system)
- `.claude/skills/greenhouse-ux/skill.md` (o equivalente path del repo — [verificar])
- `.claude/skills/greenhouse-dev/skill.md` [verificar]
- `.claude/skills/greenhouse-ui-review/skill.md` [verificar]
- `CLAUDE.md` (root)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (si referencia fonts)
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` (si referencia fonts)
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Playwright setup: `tests/e2e/` con `@playwright/test` v1.59, specs en `tests/e2e/smoke/`
- Agent auth flow para Playwright (TASK-517 complete)
- `playwright.config.ts` con Chromium browser
- Skills del repo en `.claude/skills/` [verificar estructura exacta]
- `CLAUDE.md` con probable referencias a DM Sans / Poppins

### Gap

- No hay Playwright spec dedicado a visual regression de typography (los smoke tests actuales validan render sin crash, no pixel diff)
- Figma design library tiene DM Sans actualmente (según tokens doc pre-566)
- Skills `.claude/skills/greenhouse-*/skill.md` referencian DM Sans + Poppins (patrón pre-566)
- `CLAUDE.md` probable referencia obsoleta a DM Sans

## Scope

### Slice 1 — Playwright visual regression sweep

- Crear `tests/e2e/typography-regression.spec.ts`
- Snapshot test de las ~20 surfaces críticas:
  - `/login` (hero Poppins visible)
  - `/home`
  - `/pulse` (dashboard KPI view)
  - `/finance` (dashboard)
  - `/finance/quotes/new` (Quote Builder — strip rediseñado)
  - `/finance/quotes` (list view)
  - `/finance/income`
  - `/finance/expenses`
  - `/hr/payroll` (periods list)
  - `/hr/payroll/periods/[periodId]` (detail view)
  - `/admin`
  - `/admin/tenants`
  - `/admin/team`
  - `/admin/commercial/parties`
  - `/agency` (Pulse Global)
  - `/agency/spaces/[spaceId]` (detail)
  - `/people`
  - `/people/[memberId]` (detail + tabs)
  - `/my/profile`
  - `/my/payroll`
- Para cada surface: `await expect(page).toHaveScreenshot(...)` con tolerance razonable
- Primera ejecución genera baseline en `tests/e2e/typography-regression.spec.ts-snapshots/`
- Commit de baselines
- Cualquier regression identificada se fixea en este task (wraps, overflow, alignment)

### Slice 2 — Fix regressions detectadas

- Ajustes de `maxWidth`, `lineHeight`, `letterSpacing` donde el text rendering cambia perceptiblemente
- Chips, tables, cards que truncan de manera distinta
- Botones que cambian de width
- KPI cards con números que rompen layout (usar `fontFeatureSettings: '"tnum" 1'` si aún no tienen)

### Slice 3 — Figma design library alignment

- Acceder al design library de Greenhouse en Figma (vía MCP si disponible, o tracking manual)
- Swap DM Sans → Geist en los text styles del library
- Agregar Geist Mono como text style
- Mantener Poppins con los roles nuevos (solo h1-h4)
- Publicar update del library
- Documentar changes en un archivo de tracking (ej. `docs/ui/FIGMA_LIBRARY_CHANGELOG.md` si existe, o nuevo)

### Slice 4 — Skills update

- Leer `.claude/skills/greenhouse-ux/skill.md` — reemplazar cualquier referencia a DM Sans por Geist + Poppins (h1-h4 only) + Geist Mono
- Leer `.claude/skills/greenhouse-dev/skill.md` — idem
- Leer `.claude/skills/greenhouse-ui-review/skill.md` — actualizar checklist de design-time audit (row "typography uses DM Sans" → "typography uses Geist, with Poppins only in h1-h4")
- Si existe `greenhouse-microinteractions-auditor` u otros skills con refs a typography, actualizar también

### Slice 5 — CLAUDE.md + architecture docs cleanup

- `CLAUDE.md` root: actualizar typography section (si existe) a Geist + Poppins (h1-h4) + Geist Mono
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`: actualizar font references
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`: idem
- Cualquier otro doc identificado via grep

### Slice 6 — Epic closure

- Actualizar `docs/epics/to-do/EPIC-004-typography-unification-poppins-geist.md`:
  - `Lifecycle: complete`
  - `Child Tasks` tabla con estado final de cada task
  - Nota de cierre con fecha + resumen
- Mover archivo a `docs/epics/complete/`
- Actualizar `EPIC_ID_REGISTRY.md`
- Actualizar `docs/epics/README.md` si existe con índice
- Update `Handoff.md` + `changelog.md` con cierre del programa

## Out of Scope

- **No agregar/remover features del portal**. Solo validación + cleanup.
- **No tocar theme, layout, components**. Eso fue 566, 567.
- **No tocar emails, PDFs**. Eso fue 568.
- **No agregar smoke tests nuevos** fuera del typography sweep.
- **No refactorear Figma beyond font swap** (no re-organizar components, no agregar design tokens nuevos).

## Detailed Spec

### Playwright spec shape (Slice 1)

```ts
// tests/e2e/typography-regression.spec.ts
import { test, expect } from '@playwright/test'
import { authenticateAsAgent } from './fixtures/auth' // reuso de TASK-517

const TYPOGRAPHY_SURFACES = [
  { name: 'home', path: '/home' },
  { name: 'pulse', path: '/pulse' },
  { name: 'finance-dashboard', path: '/finance' },
  { name: 'quote-builder', path: '/finance/quotes/new' },
  { name: 'payroll-period', path: '/hr/payroll' },
  { name: 'admin-tenants', path: '/admin/tenants' },
  { name: 'agency-pulse', path: '/agency' },
  { name: 'people-list', path: '/people' },
  // ... etc. 20 total
] as const

test.describe('Typography visual regression — EPIC-004', () => {
  for (const surface of TYPOGRAPHY_SURFACES) {
    test(`${surface.name} matches typography snapshot`, async ({ page }) => {
      await authenticateAsAgent(page)
      await page.goto(surface.path)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot(`${surface.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02 // 2% tolerance
      })
    })
  }
})
```

### Skills update shape (Slice 4)

Search-and-replace pattern in each skill file:

- "DM Sans" → "Geist Sans"
- "`var(--font-dm-sans)`" → "`var(--font-geist)`"
- "Poppins (hero)" → "Poppins (h1-h4 only)"
- "monospace" → "Geist Mono" where referring to ID/code display
- Agregar governance clause: "Never hardcode `fontFamily` in sx. Use variants."

## Acceptance Criteria

- [ ] `tests/e2e/typography-regression.spec.ts` existe con ≥20 surfaces snapshot
- [ ] Baselines commiteados en `tests/e2e/typography-regression.spec.ts-snapshots/`
- [ ] `pnpm test:e2e` ejecuta el spec y pasa (o documenta regressions fixeadas en Slice 2)
- [ ] Figma design library alineada: swap DM Sans → Geist ejecutado, Geist Mono agregado, captura de confirmación agregada a `docs/ui/FIGMA_LIBRARY_CHANGELOG.md`
- [ ] `greenhouse-ux` skill no menciona DM Sans (grep vacío)
- [ ] `greenhouse-dev` skill no menciona DM Sans (grep vacío)
- [ ] `greenhouse-ui-review` skill checklist actualizado con "typography uses Geist + Poppins h1-h4 + Geist Mono"
- [ ] `CLAUDE.md` typography section actualizada (si existe)
- [ ] EPIC-004 movido a `docs/epics/complete/` con `Lifecycle: complete`
- [ ] `EPIC_ID_REGISTRY.md` actualizado
- [ ] TASK-566, 567, 568 todos en `docs/tasks/complete/`
- [ ] `Handoff.md` + `changelog.md` cierran el programa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` (Playwright smoke + typography-regression)
- Manual Figma review: abrir design library, confirmar DM Sans reemplazado
- Grep verification: `grep -rn "DM Sans" .claude/skills/ CLAUDE.md docs/` retorna 0 matches fuera de changelog histórico
- Visual review staging post-merge: comparar 5-10 surfaces con Figma

## Closing Protocol

- [ ] `Lifecycle` task sincronizado
- [ ] TASK-569 archivo en `docs/tasks/complete/`
- [ ] EPIC-004 movido a `docs/epics/complete/` y `EPIC_ID_REGISTRY.md` sincronizado
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/epics/README.md` sincronizado (si existe)
- [ ] `Handoff.md` actualizado con cierre del epic + screenshots before/after clave
- [ ] `changelog.md` actualizado con entrada de alcance epic
- [ ] Chequeo cruzado: `TASK-021` ya debería estar cerrada en TASK-567 — confirmar estado

- [ ] Skills actualizados (greenhouse-ux, greenhouse-dev, greenhouse-ui-review)
- [ ] Figma library publicada con cambios
- [ ] Playwright baselines commiteadas

## Follow-ups

- Si Playwright encuentra regressions sistemáticas en cards/tables, considerar un task adicional de ajuste fino.
- Evaluar si vale la pena agregar `greenhouse-microinteractions-auditor` skill update con new fonts (solo si menciona fonts).
- Post-epic: measure adoption via Vercel Analytics — LCP impact de la carga extra de fonts (Geist + Geist Mono + Poppins). Si degrada >200ms, considerar dropear Poppins si no hay marketing activo.
- Bricolage Grotesque como opción futura si Greenhouse quiere rebrand más design-forward — task separado post-epic.

## Open Questions

- ¿Location exacta de skills en el repo? Podría ser `.claude/skills/`, `~/.claude/skills/` (user-level), o ambos. **Resolver en Discovery** con `find` del repo + user dir.
- ¿Figma design library es publicada desde Greenhouse o desde Efeonce brand library compartida? Affecta alcance del Figma update. **Resolver en Discovery** consultando con team design.
- ¿Hay un `FIGMA_LIBRARY_CHANGELOG.md` existente o debemos crearlo? **Resolver en Discovery**.
- ¿Tolerance de `maxDiffPixelRatio` correcto para el tipo de cambio tipográfico? **Default assumed**: 2% (0.02). Ajustar si demasiado estricto/permisivo.
