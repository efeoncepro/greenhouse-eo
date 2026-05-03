# TASK-779 — Treasury Hub Spec Canonization + Visual Regression Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0` (blocker para TASK-778 implementación — sin esto, no hay garantía de paridad mockup-implementación)
- Impact: `Crítico` (establece patrón canónico reusable de "spec-first + visual regression" para TODAS las tasks UI futuras)
- Effort: `Medio (3-4 horas — docs + test infra setup, no código de producción)`
- Type: `architecture` + `documentation` + `test-infrastructure`
- Status real: `Diseño — origen 2026-05-03 cuando se detectó que el mockup TASK-778 vivía solo en /tmp + chat sin canonización ni mecánica de validación`
- Domain: `finance / treasury / ux / quality`
- Blocked by: `none`
- Blocks: `TASK-778` (implementation)
- Branch: `develop` (instrucción explícita Greenhouse)

## Summary

Documenta canónicamente el mockup aprobado de TASK-778 (Treasury Cash Position Hub) en 6 specs separados (arquitectura, mockup HTML, microinteractions, accessibility, component manifest, decision log), y monta infraestructura de **visual regression con Playwright + Chromium + agent auth** que valida automáticamente cada slice de implementación contra el baseline visual aprobado. Sin esto, la implementación de TASK-778 dependería de mi memoria + eyeballing manual — frágil, no escalable, no auditable.

Esta task **establece el patrón canónico** para TODA task UI futura en Greenhouse: spec-first + mockup commiteado como source of truth + visual regression Playwright + screenshots side-by-side review antes de avanzar slice por slice.

## Why This Task Exists

### Bug class detectado 2026-05-03

Tras aprobar el mockup HTML de TASK-778 (`/tmp/cash-position-mockup.html`) durante audit del módulo `/finance/cash-position`, el usuario detectó:

1. **Mockup vive efímeramente** — solo en `/tmp` + chat. Si la sesión se cierra, el mockup se pierde y no hay forma de auditar paridad con la implementación.
2. **Microinteractions documentadas en chat** — duraciones, easing, ARIA roles, reduced-motion behavior — todo en mensaje conversacional, **NO en spec canónica**.
3. **Component manifest en chat** — Vuexy components + Recharts/ApexCharts + tokens — **NO en spec canónica**.
4. **Sin mecánica de validación** — implementación dependería de mi memoria + screenshots manuales del usuario para detectar drift.
5. **No escalable** — si mañana hago TASK-780 (otro mockup), repetimos el mismo problema.

### Costo de no resolverlo

- Implementación TASK-778 puede divergir del mockup aprobado sin que nadie lo note hasta producción.
- Microinteractions decisiones se pierden — operador siguiente reescribe desde cero.
- A11y checklist no se enforce — riesgo de violación WCAG 2.2 AA en producción.
- Pattern no escalable — cada task UI futura tiene mismo gap.

### Frameworks externos aplicables

- **WCAG 2.2 AA** — accessibility checklist obligatorio.
- **Visual regression testing** — patrón industry-standard (Percy, Chromatic, Playwright snapshots).
- **Spec-driven development** — Stripe/Linear/Vercel ship con design specs commiteados.

## Goal

1. **Canonizar el mockup aprobado** de TASK-778 en 6 specs documentados + commiteados.
2. **Montar visual regression infra** con Playwright + Chromium + agent auth.
3. **Generar baseline snapshots** desde el mockup HTML aprobado.
4. **Establecer pattern reusable** para futuras tasks UI (TASK-780, 781...).
5. **Crear template** `docs/specs/mockups/TEMPLATE-task-spec.md` para que cualquier task UI futura siga el mismo flow.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — UI stack
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — visual tokens
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` — a11y baseline
- `docs/tasks/to-do/TASK-778-treasury-grade-cash-position-contract.md` — task que esta foundation desbloquea
- WCAG 2.2 AA standard
- IAS 7 (subyacente al spec del módulo)

Reglas obligatorias:

- NUNCA arrancar implementación de UI compleja sin mockup commiteado + spec canónico.
- NUNCA aprobar PR que modifique surfaces canonizadas sin validar visual regression Playwright.
- NUNCA documentar microinteractions/a11y solo en chat o PR description — siempre spec dedicado.
- Pattern aplica a futuras tasks UI: si hay mockup → debe estar commiteado.

## Scope

### Slice 1 — Spec arquitectónica `GREENHOUSE_TREASURY_HUB_SPEC_V1.md`

Crear `docs/architecture/GREENHOUSE_TREASURY_HUB_SPEC_V1.md` con:

- 8 surfaces canónicos: KPI strip / Critical week alert / Composición de caja / IAS 7 historical / AR aging / AP scheduling / FX exposure / 13-week forecast
- Contract de cada KPI (formula, source, refresh frequency, treasury_class filter)
- Mapping IAS 7 (Operating / Investing / Financing) por economic_category
- Treasury_class enum canónico (6 valores)
- Decision log: por qué 2 rutas separadas, por qué Recharts vs ApexCharts, por qué Vuexy primitives, por qué tokens canónicos
- Reglas duras (NUNCA agregar assets+liabilities, NUNCA mostrar Posición neta como caja, etc.)
- Referencias cruzadas a TASK-766/768/774/776 (canonical helpers que consume)

### Slice 2 — Mockup HTML commiteado como baseline visual

Crear `docs/specs/mockups/TASK-778-cash-position.html`:

- Mockup HTML aprobado, idéntico al `/tmp/cash-position-mockup.html`
- Self-contained (CSS + JS inline, sin dependencies externas — solo tokens Greenhouse)
- 2 vistas (snapshot + forecast) con tab switcher
- Comentarios `<!-- SURFACE: ... -->` delimitando cada surface para snapshot regions
- Tokens canónicos hardcoded como CSS custom properties (validación cruzada con `GREENHOUSE_DESIGN_TOKENS_V1.md`)

### Slice 3 — Microinteractions canónicas `TASK-778-microinteractions.md`

Crear `docs/specs/mockups/TASK-778-microinteractions.md`:

- Tabla por surface: trigger / pattern / duration / easing / reduced-motion behavior / ARIA role / live region
- KPI cards (hover, focus, AnimatedCounter on viewport-enter)
- Critical week alert (Collapse 200ms ease-in, role="alert", aria-live="assertive")
- Charts (Recharts isAnimationActive gated by useReducedMotion, tooltip 150ms fade)
- AR aging accordion (expand 200ms ease-out, single-open debounce)
- AP buckets (hover shadow +1, vencidas badge static)
- FX banner (inline always, MuiTooltip explica recommendation)
- Scenario toggles (instant feedback + LinearProgress recompute + role="status" announce)
- Critical week marker (ReferenceArea + ReferenceDot, NO auto-pulse continuo)
- Confidence chips (color + shade pattern ▰▰▰▰▰)

### Slice 4 — Accessibility checklist `TASK-778-accessibility.md`

Crear `docs/specs/mockups/TASK-778-accessibility.md`:

- WCAG 2.2 AA checklist por surface
- ARIA roles + labels obligatorios (article, dialog, tablist, alert, status, figure)
- Color contrast verificado (4.5:1 normal text, 3:1 UI components)
- Focus targets ≥ 24×24 CSS px
- Keyboard navigation paths (Tab order, Escape, Enter)
- Screen reader announcements (KPI cards full context, charts text alternative, dynamic updates aria-live)
- Reduced motion behavior por componente
- Color-never-only verifications (chips con icon + label, semaphores con shade pattern)

### Slice 5 — Component manifest `TASK-778-component-manifest.md`

Crear `docs/specs/mockups/TASK-778-component-manifest.md`:

- Tabla por surface: Vuexy component + props + chart library + tokens utilizados
- Lista de NUEVO componente a crear: `<CashFlowForecastChart>` (composición Recharts)
- Tokens applied: typography variants (h4/h5/overline/caption/tabular-nums), spacing (6 outer / 3 inner), borderRadius (customBorderRadius.md), colors (semantic only para state, NO para CTA differentiation)
- Responsive breakpoints (md=4cols, sm=2cols, xs=1col por strip)
- Anti-patterns explícitos (NO monospace, NO raw px, NO gradients, NO nested elevation > 0)

### Slice 6 — Visual regression infra (Playwright + agent auth)

Crear `tests/e2e/visual/cash-position.spec.ts` + `cash-forecast.spec.ts`:

- Setup Playwright snapshot tests con `expect(page).toHaveScreenshot()`
- Agent auth pre-configurado (storageState.json)
- Chromium project con viewport 1440×900 desktop + 768×1024 tablet + 375×667 mobile
- Por surface: snapshot región específica (no full page) usando `<!-- SURFACE: ... -->` markers
- Tolerance: `maxDiffPixelRatio: 0.01` (1% drift permitido para anti-aliasing)
- `pnpm test:visual:cash-position` script en package.json
- Update baseline workflow: `pnpm test:visual:cash-position --update-snapshots` (solo con flag explícito + PR review obligatoria)

### Slice 7 — Generar baseline snapshots desde mockup HTML

- Servir mockup HTML local (puerto 3001 vía simple http-server)
- Ejecutar Playwright contra mockup → captura baselines en `tests/e2e/visual/__snapshots__/`
- Commitear baselines (git LFS si pesan > 100KB cada uno)
- Documentar workflow para regenerar baselines: cuándo (cambio aprobado de spec), cómo (`--update-snapshots`), quién aprueba (PR review obligatoria con visual diff inline)

### Slice 8 — Template reusable + docs cierre

- `docs/specs/mockups/TEMPLATE-task-spec.md` — template canonizable para futuras tasks UI
- CLAUDE.md sección "UI tasks: spec-first + visual regression contract"
- AGENTS.md mismo bloque para Codex
- `docs/operations/UI_TASK_SPEC_OPERATING_MODEL_V1.md` — modelo operativo: cuándo aplica, cómo documentar, cómo validar
- E2E smoke verificando que los snapshots cargan correctamente
- Closing protocol completo

## Out of Scope

- NO implementar TASK-778 (esta foundation solo prepara infraestructura — TASK-778 viene después).
- NO migrar visual regression de tasks UI ya completas (TASK-720/721/722/766/772/776 quedan sin baseline retroactivo — patrón aplica forward).
- NO setup Percy / Chromatic externos (Playwright snapshots locales son suficientes para mid-market).
- NO crear componentes nuevos (TASK-778 los implementa).

## Acceptance Criteria

- [ ] `GREENHOUSE_TREASURY_HUB_SPEC_V1.md` creado con 8 surfaces + decision log + reglas duras
- [ ] `docs/specs/mockups/TASK-778-cash-position.html` commiteado, idéntico al aprobado
- [ ] `docs/specs/mockups/TASK-778-microinteractions.md` con tabla canónica por surface
- [ ] `docs/specs/mockups/TASK-778-accessibility.md` con WCAG 2.2 AA checklist completo
- [ ] `docs/specs/mockups/TASK-778-component-manifest.md` con tabla Vuexy + props + tokens
- [ ] `tests/e2e/visual/cash-position.spec.ts` + `cash-forecast.spec.ts` ejecutables
- [ ] Baseline snapshots commiteados en `tests/e2e/visual/__snapshots__/`
- [ ] `pnpm test:visual:cash-position` corre y pasa contra el mockup
- [ ] `docs/specs/mockups/TEMPLATE-task-spec.md` template para futuras tasks
- [ ] CLAUDE.md + AGENTS.md sección "UI tasks: spec-first + visual regression contract"
- [ ] `UI_TASK_SPEC_OPERATING_MODEL_V1.md` doc operativo
- [ ] Verde global: tsc + lint + tests + build
- [ ] PR review aprobada antes de desbloquear TASK-778

## Verification

- `pnpm playwright test tests/e2e/visual/cash-position.spec.ts --project=chromium` verde
- `pnpm playwright test tests/e2e/visual/cash-forecast.spec.ts --project=chromium` verde
- Visual regression tolerance ≤ 1% por surface
- `git log docs/specs/mockups/` muestra mockup commiteado con SHA fijo (no `/tmp`)
- TASK-778 spec actualizada declarando "Blocked by: TASK-779"

## Open Questions (resolver pre-execution)

- (Q1) ¿Snapshot full page o por surface region? **Sugerencia**: por surface (más granular, drift detection localizado, baseline más estable a cambios menores en otros sections). Usar `<!-- SURFACE: kpi-strip -->` markers + Playwright `locator(...).screenshot()`.
- (Q2) ¿Tolerance threshold? **Sugerencia**: `maxDiffPixelRatio: 0.01` (1%) — permite anti-aliasing variations cross-OS, captura cambios estructurales reales. Si genera falsos positivos, ajustar a 0.02.
- (Q3) ¿Qué viewports? **Sugerencia**: desktop 1440×900 (primary), tablet 768×1024, mobile 375×667. 3 baselines per surface.
- (Q4) ¿Mockup HTML como archivo único o split por vista? **Sugerencia**: archivo único con tabs (igual que el approved mockup), fácil de servir y review side-by-side.
- (Q5) ¿Cómo manejar update de baseline cuando spec cambia (e.g. nuevo KPI)? **Sugerencia**: workflow obligatorio: (a) update spec doc primero, (b) update mockup HTML, (c) regenerar baseline con `--update-snapshots`, (d) PR review + sign-off explícito antes de merge.
- (Q6) ¿Visual regression CI gate o local-only? **Sugerencia**: CI gate `mode=warn` durante TASK-778 implementation (no bloquea merge, solo alerta), promueve a strict (bloqueante) tras estabilización.

## Dependencies & Impact

### Depends on

- TASK-742 (agent auth headless) — ✅ deployed (storageState.json funcional)
- Playwright + Chromium ya en repo — ✅
- WCAG 2.2 AA guidelines en `docs/ui/` — ✅

### Impacta a

- **TASK-778** (implementation) — bloqueado hasta TASK-779 complete
- Pattern reusable para futuras tasks UI (TASK-780+)
- CI workflow `.github/workflows/playwright.yml` (extender con visual lane)

### Files owned

- `docs/architecture/GREENHOUSE_TREASURY_HUB_SPEC_V1.md` (nuevo)
- `docs/specs/mockups/TASK-778-cash-position.html` (nuevo, commiteado del aprobado)
- `docs/specs/mockups/TASK-778-microinteractions.md` (nuevo)
- `docs/specs/mockups/TASK-778-accessibility.md` (nuevo)
- `docs/specs/mockups/TASK-778-component-manifest.md` (nuevo)
- `docs/specs/mockups/TEMPLATE-task-spec.md` (nuevo, template reusable)
- `docs/operations/UI_TASK_SPEC_OPERATING_MODEL_V1.md` (nuevo)
- `tests/e2e/visual/cash-position.spec.ts` (nuevo)
- `tests/e2e/visual/cash-forecast.spec.ts` (nuevo)
- `tests/e2e/visual/__snapshots__/` (nuevo dir, commiteado)
- `package.json` (scripts `test:visual:*`)
- `CLAUDE.md` (sección nueva)
- `AGENTS.md` (sección nueva)

## Frameworks Cited

- **WCAG 2.2 AA** Accessibility Guidelines
- **IAS 7** Statement of Cash Flows (subyacente al spec módulo)
- **Visual regression testing** industry standard pattern (Percy, Chromatic, Playwright snapshots)

## Closing Protocol

Estándar Greenhouse:

1. Lifecycle `complete` + mover a `complete/`
2. Sync `README.md` + `TASK_ID_REGISTRY.md`
3. `Handoff.md` con resumen + foundations entregados
4. `changelog.md` entry visible
5. Arch doc `GREENHOUSE_TREASURY_HUB_SPEC_V1.md` referenciado en CLAUDE.md
6. Doc operativo `UI_TASK_SPEC_OPERATING_MODEL_V1.md` referenciado en CLAUDE.md "Key Docs"
7. PR (`gh pr create --base develop`) con summary + visual baselines preview
8. **Una vez merged: desbloquea TASK-778 implementation**
