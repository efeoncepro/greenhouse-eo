# TASK-1332 — Think Report Icon Library Adapter

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1332-think-report-icon-library-adapter.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|public-site|ui`
- Blocked by: `none`
- Branch: `task/TASK-1332-think-report-icon-library-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conecta la primitive `ReportIcon` del hub `efeonce-think` a una libreria de iconos gobernada, preservando su API actual y revisando la semantica visual de los iconos del informe publico AI Visibility. La meta es eliminar la deuda de SVGs locales sueltos sin redisenar el reporte ni mover semantica desde Greenhouse.

## Why This Task Exists

Durante el ajuste de la seccion `06 · Categoria percibida`, los iconos contextuales mejoraron la lectura, pero el set actual vive como SVG inline dentro de `ReportIcon.astro`. Eso funciona para el mockup, pero escala mal: cada nuevo row, control o seccion exige dibujar glyphs a mano, aumenta el riesgo de iconos que no calzan con su renglon y deja el hub sin una politica clara de iconografia.

El reporte ya fue promovido a superficie final visible para usuarios; la iconografia ahora debe comportarse como parte del sistema de producto, no como decoracion local del mockup.

## Goal

- Reemplazar el motor interno de `ReportIcon` por un adapter respaldado por una libreria de iconos verificada para Astro SSR, con Lucide como candidata preferida por coherencia con Greenhouse.
- Mantener el contrato publico de `ReportIcon` (`name`, `size`, `strokeWidth`, `label`, `class`) para no romper consumidores del informe.
- Revisar y documentar el mapping semantico de iconos por uso: categoria, mercado, comprador, accion, citabilidad, readiness, source map y controles de share/download.
- Verificar visualmente que los iconos enriquecen la comprension, no introducen ruido ni reemplazan texto visible.
- Mantener Think como renderer tonto: no agregar derivaciones de categoria, scoring, probes, normalizer ni cambios al contrato backend.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-1332-think-report-icon-library-adapter.md`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro`
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- `/Users/jreye/Documents/efeonce-think/package.json`

Reglas obligatorias:

- Greenhouse sigue siendo source of truth del `ReportArtifactModel`; Think solo renderiza.
- No tocar scoring, probes, normalizer, provider adapters, `executeClaimedGraderRun` ni `model.viewFacts`.
- No reintroducir labels crudos de backend en UI (`mid_category`, `service_line`, `adjacent_capability`, `product_or_service`).
- Mantener el wrapper `ReportIcon` como frontera de primitive; no importar iconos de la libreria directo en varias secciones del reporte salvo escape documentado.
- Usar iconos como apoyo a texto visible; nunca como unica fuente de significado.
- El output debe funcionar en SSR/HTML estatico de Astro y no depender de hidratacion cliente para mostrar iconos.
- No hacer release productivo sin confirmacion explicita del operador.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1331` complete/released: `modelVersion=1.1.0` + Think final renderer consuming server-derived facts.
- Existing Think local report route: `http://127.0.0.1:4322/brand-visibility/r/mock-token`.
- Existing Think primitive catalog in `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`.

### Blocks / Impacts

- Impacts visual quality and maintainability of the public AI Visibility report.
- Impacts future lead-magnet report sections in `efeonce-think` that need iconography.
- Does not block TASK-1330 short links, backend report contracts, PDF delivery or Growth Forms.

### Files owned

- `docs/tasks/to-do/TASK-1332-think-report-icon-library-adapter.md`
- `docs/ui/wireframes/TASK-1332-think-report-icon-library-adapter.md`
- `/Users/jreye/Documents/efeonce-think/package.json`
- `/Users/jreye/Documents/efeonce-think/pnpm-lock.yaml`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- `/Users/jreye/Documents/efeonce-think/scripts/verify-report.mjs` or a new Think-local visual verifier if needed

## Current Repo State

### Already exists

- `ReportIcon.astro` is a local Astro primitive that renders hand-written inline SVG paths for report icons.
- The current public API accepts `name`, `size`, `strokeWidth`, `label` and `class`; stroke inherits `currentColor`; icons are decorative by default.
- The category section already uses semantic public labels such as `Sector competitivo`, `Categoria de oferta`, `Caso de uso`, `Mercado` and `Comprador asociado`.
- Think has no external icon dependency in `package.json` today.
- Recent local screenshots proved the category section can render mapped mock data with five semantic rows and no raw backend labels.

### Gap

- The primitive owns too many hand-drawn glyphs locally and has no external icon source, license/bundle decision or registry policy.
- Adding icons one by one increases semantic drift and makes design review slower.
- There is no documented mapping from report semantics to icon choices beyond the current code.
- Existing icons are adequate for the current mockup, but not yet governed enough for a final user-facing report system.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: prospect, executive or operator reading a public AI Visibility report.
- Momento del flujo: scanning evidence-rich sections after receiving the report link by email or share.
- Resultado perceptible esperado: icons feel intentional, consistent and useful for scan speed.
- Friccion que debe reducir: generic/mismatched glyphs and local SVG maintenance.
- No-goals UX: no redesign of the report, no new data, no semantic derivation in Think, no icon-only status language.

### Surface & system decision

- Surface: `efeonce-think` public report `/brand-visibility/r/[token]`.
- Composition Shell: `no aplica` — external Astro public hub, not private Greenhouse portal.
- Primitive decision: `extend` — existing Think `ReportIcon` becomes a library-backed adapter.
- Adaptive density / The Seam: `no aplica` — no new card layout/density contract.
- Floating/Sidecar/Dialog decision: none.
- Copy source: `local one-off` in Think primitive docs; no new reusable report copy expected.
- Access impact: `none` — public tokenized report behavior unchanged.

### State inventory

- Default: all known `ReportIcon.name` values render through the adapter.
- Loading: static SSR icon output; no loader.
- Empty: category empty state remains honest and may render lens icons only when they clarify visible labels.
- Error: unknown internal icon names fail during type/build, not as broken runtime UI.
- Degraded / partial: if a library lacks a good match, use a documented inline fallback or a conservative generic icon.
- Permission denied: unchanged public token 404/expired handling.
- Long content: row icons must not force wrapping or horizontal overflow.
- Mobile / compact: icon circles and labels remain aligned at 390px.
- Keyboard / focus: icon-bearing buttons keep focus indicators and labels.
- Reduced motion: no new motion.

### Interaction contract

- Primary interaction: read/scan report rows and use share/download/copy controls.
- Hover / focus / active: existing controls remain unchanged; decorative row icons do not gain focus.
- Pending / disabled: existing controls only.
- Escape / click-away: unchanged share dock behavior.
- Focus restore: unchanged share dock behavior.
- Latency feedback: N/A.
- Toast / alert behavior: unchanged copy/share behavior.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no new motion.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A.
- Non-goal motion: no animated icon set, no decorative spin/pulse.

### Implementation mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Primitive / variant / kind: `ReportIcon` as compatibility adapter; semantic `name` union remains stable.
- Component candidates:
  - Preferred: Lucide-backed Astro-compatible adapter after package verification.
  - Fallback: inline SVG only for gaps that cannot be matched semantically.
- Copy source: `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`
- Data reader / command: none.
- API parity: N/A; no business action or data mutation.
- Access / capability: public tokenized report, no session change.
- States to implement: default, missing icon fallback, empty category, mapped category, mobile compact, icon-only controls.

### GVC scenario plan

- Scenario file: Think-local Playwright/verifier under `/Users/jreye/Documents/efeonce-think/scripts/` or equivalent `.captures` workflow.
- Route: `http://127.0.0.1:4322/brand-visibility/r/mock-token`
- Viewports: `1440x1000`, `1280x900`, `390x844`.
- Required steps: load mapped category mock, capture category section, load empty/unknown category state, capture share controls.
- Required captures: full page, category section, share/download controls, readiness/source evidence section if their icons changed.
- Required `data-capture` markers: `report-category-association`, `report-readiness`, `report-source-evidence`, `report-share-dock` if present.
- Assertions: no raw backend labels, no broken/missing icons, decorative icons stay aria-hidden, icon-bearing controls retain labels, `scrollWidth === clientWidth`.
- Scroll-width checks: desktop/laptop/mobile 390.
- Reduced-motion / focus evidence: focus evidence for icon controls; no motion introduced.

### Design decision log

- Decision: extend `ReportIcon` into a library-backed adapter and keep the report API stable.
- Alternatives considered:
  - Continue drawing inline SVGs by hand.
  - Import library icons directly from each report section.
  - Redesign the category/report sections around a new icon system.
- Why this pattern: the report is already visually approved; the debt is icon sourcing, semantic consistency and maintainability.
- Reuse / extend / new primitive: extend existing Think primitive; do not create parallel wrappers.
- Open risks: library import shape for Astro SSR, bundle size/tree-shaking, library glyphs that feel too generic, accidental icon-only semantics.

### Visual verification

- GVC scenario: Think-local Playwright capture/verifier.
- Viewports: 1440, 1280 and 390.
- Required captures: full page, category mapped rows, empty category/lens state, icon controls.
- Required `data-capture` markers: `report-category-association`, `report-share-dock` if present.
- Scroll-width check: assert `scrollWidth === clientWidth`.
- Accessibility/focus checks: decorative row icons aria-hidden; icon controls labeled and focus visible.
- Before/after evidence: compare against current category mapped mock capture if available.
- Known visual debt: final icon library package is not selected until Slice 1 validates SSR/license/bundle.

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

### Slice 1 — Icon library decision and registry mapping

- Evaluate Astro-compatible icon options for Think, with Lucide as the preferred candidate unless evidence shows a better fit.
- Verify package license, SSR behavior, tree-shaking/import shape, TypeScript support and output SVG quality.
- Produce a mapping table from existing `ReportIcon.name` values to library icons, including rationale for category-specific names.
- Decide and document any fallback inline glyphs that remain because no library icon is semantically good enough.

### Slice 2 — Adapter implementation

- Add the selected icon package to `/Users/jreye/Documents/efeonce-think/package.json` and lockfile.
- Refactor `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro` so the public props contract remains stable.
- Keep stroke, size, `currentColor`, decorative default and `label` accessibility behavior.
- Make unknown icon names impossible through TypeScript and avoid runtime user-data lookups.
- Keep first paint SSR-safe; do not require client JS to display icons.

### Slice 3 — Report consumer review

- Audit `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro` for direct icon semantics.
- Ensure category-level icon mapping remains user-facing and not raw backend terminology.
- Re-check share/copy/link/download icons if the adapter changes their visual weight.
- Update the Think primitive README with the library choice, mapping policy and accessibility rules.

### Slice 4 — Visual, accessibility and build verification

- Run Think `pnpm type-check` and `pnpm build`.
- Capture mapped category mock and unknown/empty category state at desktop/laptop/mobile.
- Assert no horizontal page overflow at desktop/laptop/mobile 390.
- Assert raw backend labels do not appear in the report.
- Inspect icon semantic fit manually and adjust mappings before closing.

## Out of Scope

- No Greenhouse backend/API/report model changes.
- No category taxonomy extraction, classifier, scoring, probes, normalizer or snapshot changes.
- No change to TASK-1330 short links or share URL generation.
- No full redesign of the report or the category section.
- No migration from Think to `efeonce-web`.
- No production deploy/release without explicit operator confirmation.

## Detailed Spec

### Adapter contract

`ReportIcon.astro` keeps the same public props:

```ts
{
  name: ReportIconName
  size?: number
  strokeWidth?: number
  label?: string
  class?: string
}
```

Required behavior:

- `label` absent: render as decorative (`aria-hidden="true"`, `focusable="false"`).
- `label` present: expose `role="img"` and a title/accessible name.
- SVG inherits `currentColor`.
- Default `size=18`, `strokeWidth=1.8` or visually equivalent values remain.
- The wrapper owns all package imports; report sections do not import icon-library components directly.

### Initial semantic mapping target

| ReportIcon name | Semantic role | Candidate library direction |
|---|---|---|
| `signal` | measured signal / trend | activity, chart-line, radio/signal |
| `engines` | sampled engines / model set | network, bot, boxes |
| `citation` | citations / answer mention | message-square-quote or quote |
| `readiness` | operability / readiness | shield-check |
| `sample` | sample/provenance | list/checklist |
| `calendar` | report date | calendar |
| `sourceMap` | source network / competitive space | network/share-nodes |
| `domain` | domain/site/industry | globe |
| `dependency` | warning/dependency | triangle-alert |
| `read` | read site | book-open |
| `validate` | validate evidence | badge-check/check-circle |
| `act` | execute action | cursor-click/send |
| `category` | offer/category | layout-grid/tags |
| `target` | use case | target |
| `market` | geography/market | map |
| `buyer` | buyer/persona | user-round/search |
| `priority` | next priority | flag |
| `share` | share action | share-2 |
| `copy` | copy action | copy |
| `link` | link action | link |
| `download` | download action | download |

The implementer must verify these visually; the table is a starting contract, not permission to accept a mismatched icon.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (library decision) -> Slice 2 (adapter implementation) -> Slice 3 (consumer/docs review) -> Slice 4 (visual/build verification).
- Slice 2 MUST NOT start until Slice 1 confirms SSR, license and bundle posture.
- Slice 4 MUST pass before any push/deploy to `efeonce-think/main`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Icon library imports break Astro SSR/build | UI | medium | verify with `pnpm type-check` and `pnpm build` before committing | build/type-check failure |
| Icons become generic or semantically wrong | UI | medium | manual visual review against mapped category rows; adjust mapping table | screenshots show confusing glyphs |
| Bundle grows unexpectedly | UI | low | use direct/tree-shaken imports; avoid whole-library dynamic registry if package does not tree-shake | build output or package review |
| Accessibility regression for icon-only controls | UI | medium | preserve `label` behavior and focus checks | Playwright/a11y manual finding |
| Raw backend labels return while editing category mapping | UI | low | explicit assertion against raw labels | verifier detects raw strings |

### Feature flags / cutover

- Sin flag — UI primitive implementation in an external public hub. Cutover is the Think deployment itself.
- No Greenhouse runtime flag is required because backend payload and public report token behavior do not change.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No code runtime change; revert documentation/mapping notes if needed. | <10 min | si |
| Slice 2 | Revert `ReportIcon.astro`, package dependency and lockfile. | <30 min | si |
| Slice 3 | Revert consumer mapping/docs changes. | <20 min | si |
| Slice 4 | No runtime change; failing evidence blocks deploy until fixed. | N/A | si |

### Production verification sequence

1. Validate locally in `efeonce-think`: `pnpm type-check` and `pnpm build`.
2. Run local visual capture for mapped category mock and unknown/empty category state at 1440/1280/390.
3. Confirm no raw backend labels and no horizontal overflow.
4. If operator approves production deployment, push to `efeonce-think/main` and verify Vercel production Ready.
5. Smoke production with a real token and capture category/readiness/share-control sections.

### Out-of-band coordination required

- N/A — repo-only package/code change in `efeonce-think`.
- Production deploy still requires explicit operator confirmation because this affects the final public report.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: primitive`.
- [ ] `UI ready` queda `yes` porque el wireframe y `## UI/UX Contract` incluyen implementation mapping, GVC scenario plan y design decision log, y `pnpm task:lint --task TASK-1332` pasa.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-1332-think-report-icon-library-adapter.md` y el archivo existe.
- [ ] Se valida y documenta una libreria de iconos Astro-compatible con licencia, SSR y bundle posture aceptables.
- [ ] `ReportIcon` mantiene la API publica actual y se convierte en adapter gobernado; los consumers no importan la libreria directo de forma repetida.
- [ ] Los iconos de categoria, mercado, comprador, oferta, caso de uso y sector se revisan por fit semantico con screenshots.
- [ ] No aparecen labels crudos como `mid_category`, `service_line`, `adjacent_capability` o `product_or_service`.
- [ ] Los iconos decorativos siguen fuera del arbol accesible y los controles icon-only conservan label/focus.
- [ ] Think pasa `pnpm type-check` y `pnpm build`.
- [ ] Se capturan desktop/laptop/mobile 390 con `scrollWidth === clientWidth`.
- [ ] No se cambia backend/data/scoring/probes/normalizer ni `executeClaimedGraderRun`.

## Verification

- `pnpm task:lint --task TASK-1332`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- En `/Users/jreye/Documents/efeonce-think`: `pnpm type-check`
- En `/Users/jreye/Documents/efeonce-think`: `pnpm build`
- Think-local Playwright/screenshot verification for `http://127.0.0.1:4322/brand-visibility/r/mock-token`
- Manual visual review of mapped category icons and share/download controls

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible o protocolo de primitive
- [ ] `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md` documenta la libreria, mapping policy y accesibilidad
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1329, TASK-1331 y TASK-1330

## Follow-ups

- Si `efeonce-think` gana un paquete compartido de design system, mover el registry de iconos a ese paquete y mantener `ReportIcon` como fachada de compatibilidad.
- Si la seccion de categoria evoluciona a un `viewFacts.categoryPerception` server-derived, crear task backend-data separada; esta task no lo implementa.

## Open Questions

- Confirmar en Slice 1 si la libreria final sera `lucide-astro`, `lucide` con imports SSR-safe u otra alternativa compatible.
- Confirmar si el adapter debe cubrir todos los iconos actuales en una sola pasada o permitir fallbacks inline temporales para glyphs sin match semantico fuerte.
