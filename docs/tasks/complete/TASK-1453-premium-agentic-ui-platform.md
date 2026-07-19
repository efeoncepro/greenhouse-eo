# TASK-1453 — Premium agentic UI platform

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1453-premium-agentic-ui-platform.md`
- Flow: `docs/ui/flows/TASK-1453-premium-agentic-ui-platform-flow.md`
- Motion: `docs/ui/motion/TASK-1453-premium-agentic-ui-platform-motion.md`
- Backend impact: `none`
- Epic: `EPIC-033`
- Status real: `Cerrada local-first`
- Rank: `1`
- Domain: `ui|design-system|motion|platform|ops`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Materializa un sistema de nacimiento premium para nuevas interfaces Greenhouse: dirección visual obligatoria, readiness con contenido real, recipes de superficie, primitives compuestas, motion/microinteracciones gobernadas, scorecard visual y GVC desktop/mobile con evidencia revisable.

## Why This Task Exists

Hoy el repo controla tokens y arquitectura pero permite comenzar JSX sin una composición visual decidida, usar GVC sin quality gates y declarar readiness con headings vacíos. Las skills mezclan dependencias ausentes y recomendaciones incompatibles. Ese conjunto empuja a los agentes hacia una UI MUI segura y genérica, trasladando la dirección de arte a iteraciones manuales tardías.

## Goal

- Hacer imposible que una UI nueva relevante se implemente sin dirección visual, jerarquía de acciones, responsive y evidencia definidos.
- Dar a los agentes vocabulario de composición premium reusable, no sólo átomos.
- Separar gates de contrato, código, evidencia visual y calidad para diagnósticos accionables.
- Validar workbench, analytics/report y settings/flow sin clonarlos visualmente.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`

Reglas obligatorias:

- Composition Shell sigue siendo substrato; recipes lo especializan.
- Toda card reusable nace Adaptive Card/The Seam y rich-ready.
- Figma/Claude/imagen son intención; valores se mapean a tokens/primitives.
- Motion comunica orientación, selección, causalidad o feedback y preserva significado con reduced motion.
- La aceptación visual necesita juicio documentado además de checks mecánicos.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/README.md`
- `docs/ui/motion/README.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`

## Dependencies & Impact

### Depends on

- Composition Shell, card-density, motion tokens y primitives actuales.
- GVC scenario DSL, enterprise rubric y review dossier actuales.
- Task lint/readiness existentes como adopción incremental.

### Blocks / Impacts

- Toda task UI creada desde `TASK-1453`.
- Skills Codex/Claude que diseñan, implementan o revisan UI.
- Labs, GVC y documentación UI platform.

### Files owned

- `docs/ui/**`, `docs/architecture/**UI**`, `docs/operations/**UI**`
- `.codex/skills/greenhouse-ai-design-studio/**`, `.agents/skills/modern-ui/**` y mirrors Claude
- `scripts/ci/task-lint/**`, `scripts/ci/ui-*.mjs`, `scripts/frontend/**`
- `src/components/greenhouse/primitives/surface-system/**`
- `src/app/(dashboard)/design-system/surface-recipes/**`
- `scripts/frontend/scenarios/premium-ui-*.scenario.ts`
- `package.json`, `AGENTS.md`, índices y cierre documental

## Current Repo State

### Already exists

- AXIS/Geist, Composition Shell, The Seam, primitives, motion tokens, GVC y Labs.
- Wireframe/flow/motion contracts, task readiness y skills especializadas.

### Gap

- No existe Visual Direction Contract ni persistencia obligatoria del source.
- Readiness valida headings, no targets, hierarchy, mapping, source ni GVC premium.
- `design:lint` valida `DESIGN.md`, no UI; GVC permite scenarios sin quality/dossier.
- Faltan recipes y primitives compuestas de nivel superficie.
- Skills referencian dependencias inexistentes y tipografía obsoleta.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `src/components/greenhouse/primitives, scripts/frontend, scripts/ci, .codex/.agents/.claude y docs/ui`
- Future candidate home: `ui-package`
- Boundary: `contracts/recipes/primitives/gates domain-free; consumers aportan datos, copy y kinds`
- Server/browser split: `primitives browser-safe; gates/docs/scripts son tooling Node`
- Build impact: `none; aditivo, sin dependencia pesada ni entrypoint global`
- Extraction blocker: `theme/MUI/motion wrapper y rutas Design System`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: agentes, diseñadores, implementadores y reviewers.
- Momento del flujo: antes de JSX, durante first-fold y antes de aceptación.
- Resultado perceptible esperado: jerarquía, profundidad, densidad y feedback ricos desde la primera iteración.
- Friccion que debe reducir: corrección estética tardía y pantallas enterprise genéricas.
- No-goals UX: una skin única, Dribbble, animar todo o bloquear `ui-lite`.

### Surface & system decision

- Surface: tooling/contracts + Lab `/design-system/surface-recipes`.
- Composition Shell: `aplica` — `leadPlusContext`, `split` y `focused`.
- Primitive decision: `new` — ocho compuestas sobre foundations existentes.
- Adaptive density / The Seam: `aplica`.
- Floating/Sidecar/Dialog decision: sólo primitives canónicas.
- Copy source: `local one-off` para Lab; consumer canonical.
- Access impact: `views` — gate Design System existente.

### State inventory

- Default: tres composiciones diferenciadas.
- Loading: skeleton estructural sin shift.
- Empty: siguiente acción con contexto.
- Error: recovery localizado.
- Degraded / partial: frescura explícita.
- Permission denied: anti-oracle.
- Long content: reflow/density honesta.
- Mobile / compact: apilado/temporal sin overflow.
- Keyboard / focus: selección/comandos/recovery completos.
- Reduced motion: mismo significado.

### Interaction contract

- Primary interaction: elegir contexto y actuar sin perder orientación.
- Hover / focus / active: affordance tokenizada y foco visible.
- Pending / disabled: causa explícita, geometría estable.
- Escape / click-away: temporal only; dirty protegido.
- Focus restore: trigger o selección.
- Latency feedback: optimistic sólo si reversible.
- Toast / alert behavior: toast confirma; error vive en contexto.

### Motion & microinteractions

- Motion primitive: `framer layout`
- Enter / exit: reveal regional sin retrasar first paint.
- Layout morph: selection/detail y density.
- Stagger: Composition Shell rich acotado.
- Timing / easing token: `motion/core/tokens.ts`.
- Reduced-motion fallback: swap inmediato.
- Non-goal motion: loops, parallax o movimiento sin causalidad.

### Implementation mapping

- Route / surface: `/design-system/surface-recipes` + tooling/docs.
- Primitive / variant / kind: `WorkbenchHeader` with integrated support, `SignalStrip integrated|narrative`, `InventoryList rail`, `SelectionRow`, `DetailHero`, `ContextCommandBar`, `OperationalSection open|band|emphasized`, `PreviewStage`.
- Component candidates: `src/components/greenhouse/primitives/surface-system/**`.
- Copy source: Lab local; consumer canonical.
- Data reader / command: `n/a`, fixtures.
- API parity: `n/a`, presentation-only.
- Access / capability: Design System gate.
- States to implement: default, selected, compact, loading, empty, partial, error, pending, reduced.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/premium-ui-surface-recipes.scenario.ts`
- Route: `/design-system/surface-recipes`
- Viewports: `1440x1000` y `390x844`
- Quality profile: `premium`
- Required steps: workbench, report, settings, selection, pending, compact, reduced motion.
- Required captures: first fold/full page e interacción pre/post.
- Required `data-capture` markers: `recipe-workbench`, `recipe-report`, `recipe-settings` y estados causales declarados por el scenario.
- Assertions: one-primary, headings, no raw errors, selection, dossier, score.
- Scroll-width checks: ambos viewports.
- Reduced-motion / focus evidence: keyboard y preference replay.

### Design decision log

- Decision: gobernar dirección, composición y evidencia como un sistema.
- Alternatives considered: prompt largo, más átomos, sólo screenshots, corrección caso a caso.
- Why this pattern: intención + defaults + gate cubren el loop.
- Reuse / extend / new primitive: extender shell/density/motion; crear compuestas.
- Open risks: falsos positivos/scorecard complaciente; adoption ID/evidencia/umbrales.

### Visual verification

- GVC scenario: `premium-ui-surface-recipes`.
- Viewports: `1440x1000` / `390x844`.
- Required captures: tres arquetipos/estados.
- Required markers: cuatro.
- Scroll-width check: bloqueante.
- Accessibility/focus checks: keyboard, focus, live pending, reduced.
- Before/after evidence: baseline tras scorecard.
- Known visual debt: cierre bloqueado si cualquier dimensión <4 o si jerarquía, economía de superficies, impacto visual, fidelidad o resistencia genérica <4.5.

<!-- ZONE 2 — plan tracked in Codex thread -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Direction and orchestration

- Visual Direction Contract, templates, recipes y workflow first-fold/critique.
- Reparar skills y contradicciones.

### Slice 2 — Readiness and gates

- Source, content, responsive, action hierarchy, fidelity mapping y GVC premium.
- Separar `design-contract`, `ui-code`, `ui-visual` y `ui-quality`.

### Slice 3 — GVC quality

- Quality profile premium, dossier, baseline condicional y scorecard de catorce dimensiones, incluyendo economía de superficies e impacto visual como floors críticos.
- Media ≥4.5, ninguna dimensión <4, desktop/mobile; cinco dimensiones críticas ≥4.5.

### Slice 4 — Surface system

- Seis recipes y ocho primitives compuestas.
- Variants/kinds y límites documentados.

### Slice 5 — Proof

- Lab workbench, analytics/report y settings/flow.
- Captura, crítica, corrección y baseline.

### Slice 6 — Adoption/closure

- AGENTS al final, índices, changelog, Handoff, QA y docs governor.

## Out of Scope

- Migración masiva legacy, backend/data, deploy/push y archivos CTA dirty.

## Detailed Spec

Obligatorio para nuevas UI `ui-standard`/`ui-platform`; `ui-lite` mantiene vía proporcional. Source-led versiona el asset o registra dirección repo-native. La crítica mezcla automatización con scorecard de evidencia. Recipes son composición funcional, no templates de contenido.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contract/skills -> readiness/gates -> GVC/scorecard -> recipes/primitives -> Lab/evidence -> adoption/docs.
- AGENTS se actualiza al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate rompe legacy | tooling | medium | adoption `TASK-1453+` | findings legacy |
| Recipe clona | UI | medium | seis grammar/kinds | generic-template score |
| Motion degrada | UI | medium | wrappers/reduced/perf | GVC finding |
| Score complaciente | QA | medium | evidencia + 14 dims + cinco floors críticos | rationale ausente o chrome repetido |
| Conflicto CTA | repo | low | paths excluidos | diff protegido |

### Feature flags / cutover

Sin flag runtime. Hard enforcement sólo desde adoption ID.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert docs/skills | <1 h | sí |
| 2 | warning/revert | <1 h | sí |
| 3 | retirar profile | <1 h | sí |
| 4 | retirar exports | <2 h | sí |
| 5 | retirar Lab | <1 h | sí |
| 6 | revert docs | <1 h | sí |

### Production verification sequence

1. Gates focales/unit.
2. Lint/typecheck/tests.
3. GVC desktop/mobile + dossier/score.
4. QA/docs closure.
5. Sin deploy/push automático.

### Out-of-band coordination required

N/A — repo-only.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Readiness exige direction, targets, hierarchy, mapping y GVC premium.
- [x] Cuatro gates independientes.
- [x] Skills reales + Geist/AXIS.
- [x] Seis recipes y ocho primitives.
- [x] Tres arquetipos desktop/mobile sin overflow.
- [x] Score medio ≥4.5, piso 4 y cinco dimensiones críticas ≥4.5.
- [x] CTA dirty intacto.
- [x] AGENTS/docs sincronizados.

## Verification

- `pnpm task:lint --task TASK-1453`
- `pnpm ui:wireframe-check --task TASK-1453`
- `pnpm ui:flow-check --task TASK-1453`
- `pnpm ui:motion-check --task TASK-1453`
- `pnpm ui:readiness-check --task TASK-1453`
- `pnpm design-contract:lint`
- `pnpm ui:code-lint --changed`
- `pnpm ui:visual-gate --task TASK-1453`
- `pnpm ui:quality --task TASK-1453`
- `pnpm fe:capture premium-ui-surface-recipes --env=local`
- `pnpm lint && pnpm tsc --noEmit`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

### Evidence 2026-07-18

- Build optimizada: `pnpm build` PASS.
- GVC final: `.captures/2026-07-18T22-36-17_premium-ui-surface-recipes`, 2 viewports, 32 frames, cero findings no-baseline, enterprise rubric sin findings y diff máximo `0.58%` contra baseline durable.
- Scorecard: `4.63/5`, piso `4.5`; economía de superficies `4.8`, impacto visual `4.7` y profundidad `4.7`.
- Overflow medido en DOM: desktop `1440 === 1440`; mobile `390 === 390`.
- Contraste: la primera pasada detectó texto integrado dark-on-navy y descripción de reporte `4.27:1`; ambos se corrigieron antes de promover baseline.
- Gates: contrato, código, visual y calidad PASS; task/readiness/flow/motion PASS; 24 tests focales PASS; route reachability `223` rutas / `0` orphans; `claude-md`, task harness y docs closure PASS.
- QA release auditor: `PASS`. Riesgo medio-alto por primitives/tooling compartido mitigado con build optimizada, unit tests, GVC premium desktop/mobile, baseline, enterprise rubric, medición directa de overflow y documentación/ADR. No existe flag, migración, dato vivo, integración externa o deploy requerido para completar el contrato repo-local.

## Closing Protocol

- [x] Lifecycle/index/registry synchronized.
- [x] Captures reviewed visually.
- [x] QA release auditor/documentation governor invoked.
- [x] Missing runtime evidence documented: no falta evidencia requerida; Lab verificado en runtime local optimizado y el cambio no requiere rollout externo.

## Follow-ups

- Migración selective legacy by audit.

### Delta 2026-07-18 — gate compatibility hardening

- `ui:code-lint` deja de confundir `var(--mui-customShadows-*)` con una sombra literal
  fuera de primitives; dentro de primitives mantiene el bloqueo y exige elevación
  semántica Greenhouse.
- El gate alinea `inline-font-size` con la regla tipográfica canónica: permite tamaño
  óptico en `<i>`/`<Box component='i'>`, pero sigue bloqueando texto inline.
- `--changed` conserva contexto JSX y números de línea reales. Syntax checks y tests
  verifican los archivos que durante implementación fueron observados a medio escribir.

## Open Questions

- Ninguna bloqueante. Excepción de rama: se ejecuta en `develop` porque hay cambios CTA ajenos y no existe autorización para worktree; esos paths quedan fuera de ownership.
