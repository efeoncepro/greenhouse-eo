# TASK-1334 — Think Category Perception Renderer Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1334-think-category-perception-renderer-contract.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `COMPLETE 2026-07-04 — Think production deployed + real mapped/unknown smoke`
- Rank: `TBD`
- Domain: `growth|ai|public-site|ui`
- Blocked by: `none`
- Branch: `task/TASK-1334-think-category-perception-renderer-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece el renderer de `efeonce-think` para que la seccion `06 · Categoria percibida` pinte correctamente lo que Greenhouse ya envia en `categoryTaxonomySummary`, sin derivar semantica local ni depender de mocks. Cubre estados `mapped`, `needs_review`, `unknown`, snapshots viejos/parciales, no-leak visible, responsive y capturas.

## Execution Intake — 2026-07-04

- TASK-1331 blocker resolved: `docs/tasks/complete/TASK-1331-ai-visibility-public-report-viewmodel-contract.md` is `Lifecycle: complete`, production released, and documents the final `modelVersion=1.1.0` public report view-model.
- TASK-1333 blocker resolved: `docs/tasks/complete/TASK-1333-ai-visibility-category-perception-production-signals.md` is `Lifecycle: complete`, documents `ops-worker` rollout, and records real mapped proof for `EO-GRUN-00040` with `categoryTaxonomySummary.status='mapped'`.
- This task is now executable as the retroactive Think renderer audit + verifier hardening described in the 2026-07-04 arch review, with no backend/scoring/model changes.

## Delta 2026-07-04 — COMPLETE; Think production deployed

**Rollout aplicado en `efeonce-think`:**

- Commit: `317853f fix(report): harden category perception renderer`.
- Push: `efeonce-think/main` actualizado (`681f1e4..317853f`).
- Vercel production: `Ready`, target `production`, deployment `https://efeonce-think-5huriwav0-efeonce-7670142f.vercel.app`, alias `https://think.efeoncepro.com`, deployment id `dpl_3HJdUKw6gxikdYiQJUMYctzHhrzG`.

**Evidencia productiva:**

- Mapped real: `EO-GRUN-00040`, token prefix `grt-b095c3a8…`; `node scripts/verify-report.mjs <prod-route-with-token-in-memory> task1334-prod-mapped` OK en `1440x1000`, `1280x900` y `390x844` con HTTP 200, `scrollWidth == clientWidth`, seccion de categoria presente, sin labels internos visibles y sin `NaN`.
- Unknown real: `EO-GRUN-00038`, token prefix `grt-45361f26…`; `node scripts/verify-report.mjs <prod-route-with-token-in-memory> task1334-prod-unknown` OK en `1440x1000`, `1280x900` y `390x844` con HTTP 200, `scrollWidth == clientWidth`, estado honesto sin filas fabricadas, sin labels internos visibles y sin `NaN`.
- Capturas productivas gitignored en `efeonce-think/.captures/task1334-prod-mapped-*` y `efeonce-think/.captures/task1334-prod-unknown-*`.

**Estado correcto:** `complete`. Think renderiza `categoryTaxonomySummary` desde Greenhouse como renderer tonto, con fallback honesto para `unknown`/`needs_review`/legacy/malformed y sin cambios backend/scoring/modelo.

## Delta 2026-07-04 — Pre-rollout local proof

**Alcance aplicado en `efeonce-think` antes del push/deploy:**

- Renderer `src/pages/brand-visibility/r/[token].astro`: se reemplazo el badge visible `N ambiguas` por copy publico `N señales en revisión`, se agregaron markers `report-category-mapped|rows|empty|review` + `data-category-status`, y se normalizaron defensivamente counts/categorias para evitar `NaN`, anchos negativos o filas vacias cuando el payload viene parcial/malformado.
- Verifier general `scripts/verify-report.mjs`: dejo de asumir que `unknown` debe omitir la seccion; ahora valida no filas fabricadas para estados no mapped, no labels internos, no `NaN`, no overflow y no leaks visibles.
- Nuevo verifier focal `scripts/verify-category-renderer.mjs`: levanta API fixture Greenhouse-shaped + Astro dev local y prueba `mapped`, `unknown`, `needs_review`, `legacy` y `malformed` en `1440x1000`, `1280x900` y `390x844`, con capturas full-page + crop de categoria.

**Evidencia:**

- Fixture matrix local: `node scripts/verify-category-renderer.mjs task1334-category-renderer` OK; manifest `.captures/task1334-category-renderer-2026-07-04T14-45-21-556Z/manifest.json`.
- Think gates: `pnpm type-check` OK (0 errors; hint existente por `document.execCommand` deprecated), `pnpm build` OK.
- Real mapped payload: DB confirmo `EO-GRUN-00040`, token prefix `grt-b095c3a8…`, `category_status=mapped`, `category_count=1`; smoke local contra Greenhouse API real + Think local `node scripts/verify-report.mjs <local-route-with-token-in-memory> task1334-real-mapped-local` OK en 1440/1280/390.
- Real unknown payload: DB confirmo `EO-GRUN-00038`, token prefix `grt-45361f26…`, `category_status=unknown`, `category_count=0`; smoke local contra Greenhouse API real + Think local `node scripts/verify-report.mjs <local-route-with-token-in-memory> task1334-real-unknown-local` OK en 1440/1280/390.
- Greenhouse task gates: `pnpm task:lint --task TASK-1334`, `pnpm ui:wireframe-check --task TASK-1334`, `pnpm ui:readiness-check --task TASK-1334`, `pnpm ops:lint --changed` OK.

**Estado de este checkpoint:** `code complete local, rollout pendiente`. En ese momento no se hizo push a `efeonce-think/main` ni deploy productivo porque la task prohibia deploy productivo sin confirmacion explicita del operador. El rollout productivo final quedo documentado en el delta de cierre superior.

## Why This Task Exists

La seccion de categoria ya quedo ajustada visual/editorialmente en el mockup, pero el cierre correcto no es solo que Greenhouse produzca datos reales. Think tambien debe ser capaz de renderizar fielmente el contrato backend existente, incluyendo los casos donde Greenhouse todavia responde `unknown` o donde un snapshot antiguo no trae todos los campos.

Si Think solo funciona con la data mockeada local, la seccion puede verse bien en desarrollo y fallar en produccion: filas vacias, `NaN`, raw labels, copy demasiado tecnico o secciones que desaparecen sin explicacion. Esta task formaliza el lado visible del contrato.

## Goal

- Renderizar `categoryTaxonomySummary` desde Greenhouse tal como viene, con normalizacion defensiva solo para presentacion.
- Mostrar estado `mapped` con filas claras, nivel traducido, conteos/porcentajes bounded y helpers entendibles.
- Mostrar estados `unknown`, `needs_review` y legacy/partial sin inventar categoria ni exponer internals.
- Eliminar cualquier dependencia de mock-only shape; los fixtures locales deben copiar la forma exacta del payload Greenhouse.
- Verificar desktop/laptop/mobile con no-overflow, no-leak visible y compatibilidad con snapshots viejos.
- Mantener Think como renderer tonto: sin scoring, sin category inference, sin local taxonomy ownership.

## Delta 2026-07-04 — Arch review (arch-architect): el renderer YA está implementado (y en prod)

> Revisión con `arch-architect` sobre el código real de `efeonce-think` post-`681f1e4`. La task es
> correcta pero su premisa cambió: **el renderer de Slice 2 ya se implementó** por el commit concurrente
> de Codex `681f1e4` "feat(report): render category perception states" (token page +271, ReportIcon +45),
> **ya pusheado a `origin/main` → en producción.** La task se reencuadra de "implementar" a "AUDITAR lo
> shipped contra el contrato + cerrar gaps + agregar la infra de VERIFICACIÓN que es ahora el valor real".

### Realidad del renderer HOY (verificado en el código)

- **`mapped`** → panel rico: lectura principal + filas con nivel **traducido** (`categoryLevelCopy(cat.level)`
  → label/helper user-facing, NO el `nodeId`/level crudo), `count` + `share%` bounded (`share = total>0 ?
  round(count/total*100) : null`; `barWidth = Math.max(6, share)`) → **sin `NaN`, sin ancho negativo**.
- **`unknown`** → "En cobertura" / "Este corte no trae categoría medible" — honesto, NO inventa categoría.
- **`needs_review`** → "Revisión requerida" / "Hay señales, pero no son publicables todavía".
- **legacy/missing** → `showCategorySection = Boolean(categorySummary)` omite la sección si falta el summary.
- Copy user-facing (industria/sector/oferta/caso de uso/mercado/comprador); nombre de categoría vía
  `categoryLabel` (es/en), sin `nodeId` visible. → el grueso del no-leak/copy YA está bien.

### Gap real detectado (a corregir en la auditoría)

- **`[token].astro` línea ~1193 muestra `{categorySummary?.ambiguousCount} ambiguas`** (badge). El propio
  copy guardrail de esta task lista `ambiguousCount` como **label interno prohibido**. Es borderline (está
  traducido a "N ambiguas"), pero **viola la regla tal como está escrita** → decidir en la auditoría:
  reemplazar por copy neutro ("señales en revisión") o quitarlo. Ya está en PROD vía `681f1e4`.
- Reconciliar el **wireframe** (`docs/ui/wireframes/TASK-1334-...`, 160 líneas, existe/robusto) con el
  renderer shipped — confirmar que describen los MISMOS estados (el renderer se construyó fuera del proceso
  de la task).

### Reframe del alcance

- **Slice 2 (renderer hardening): ~HECHO** por `681f1e4`. Queda AUDITAR contra el contrato + fix del
  `ambiguousCount` si se confirma leak + reconciliar con el wireframe. **NO reimplementar de cero.**
- **Slices 1/3/4 (fixtures + verifier + prueba real) = el VALOR CENTRAL ahora.** Justo el riesgo que la
  task existe para prevenir se materializó: el renderer se shipeó **mock/ad-hoc, sin fixtures ni verifier**
  del contrato. La infra de verificación es lo que valida retroactivamente lo que ya está en prod.
- **Estado de prod HOY: NO roto.** El backend produce `unknown` (ver TASK-1333) → prod muestra el estado
  honesto "En cobertura". El camino `mapped` en prod queda sin probar hasta que TASK-1333 encienda la
  extracción → la prueba real de Slice 4 sigue gateada por TASK-1333. La task no es urgente por corrección
  (prod honesto), sí por completitud/verificación.

### Nota cross-agent

El renderer llegó a prod por el sweep concurrente de Codex (`681f1e4`) sin lifecycle de task, sin fixtures
ni verifier. No revertir (es funcionalmente correcto + arrastra otras cosas del commit). El cierre correcto
de TASK-1334 es la **verificación retroactiva**, no un rewrite.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/tasks/complete/TASK-1331-ai-visibility-public-report-viewmodel-contract.md`
- `docs/tasks/complete/TASK-1333-ai-visibility-category-perception-production-signals.md`
- `docs/ui/wireframes/TASK-1334-think-category-perception-renderer-contract.md`
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md`
- `/Users/jreye/Documents/efeonce-think/scripts/verify-report.mjs`

Reglas obligatorias:

- Greenhouse es source of truth del dato; Think solo renderiza.
- No inferir categorias desde `brandName`, `websiteUrl`, copy del sitio, prompts, labels o strings raw.
- No mostrar labels internos como `mid_category`, `service_line`, `adjacent_capability`, `product_or_service`, `canonical signals`.
- No generar narrativa cuando `status='unknown'`; usar estado honesto.
- No ocultar errores con filas falsas; si falta data, mostrar fallback seguro u omitir seccion segun contrato.
- No cambiar backend/data/scoring/probes/normalizer ni endpoint Greenhouse.
- No hacer deploy productivo sin confirmacion explicita del operador.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1331` complete/released: public report contract and Think final renderer exist.
- Existing Greenhouse `categoryTaxonomySummary` contract in the public API/model.
- Existing Think category section prototype/local mock.

### Blocks / Impacts

- Complements TASK-1333: once Greenhouse produces real mapped data, Think is ready to show it.
- Impacts public AI Visibility report route in `efeonce-think`.
- Does not block TASK-1330 short links or TASK-1332 icon library adapter.

### Files owned

- `docs/tasks/complete/TASK-1334-think-category-perception-renderer-contract.md`
- `docs/ui/wireframes/TASK-1334-think-category-perception-renderer-contract.md`
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/ReportIcon.astro` only if icon semantics need small consumer-safe mapping
- `/Users/jreye/Documents/efeonce-think/scripts/verify-report.mjs`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md` only if renderer pattern gets documented

## Current Repo State

### Already exists

- Think public report route fetches Greenhouse server-side and renders the final user-facing report.
- Category section local iteration can show mapped mock data and an honest empty state.
- Greenhouse already sends `categoryTaxonomySummary` as part of `report`/`model`.
- TASK-1333 owns making real runs produce mapped category signals when currently unknown.

### Gap

- The renderer contract is not yet formalized as a task: Think must prove it handles the exact backend payload shape, not only injected mock data.
- The UI must cover `mapped`, `needs_review`, `unknown`, partial/missing field and old snapshot compatibility.
- Current visual verification must explicitly assert no raw labels, no `NaN`, no fabricated rows and no horizontal overflow.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: public report reader evaluating the credibility and positioning implications of an AI Visibility diagnostic.
- Momento del flujo: section `06 · Categoria percibida`, after readiness/operability.
- Resultado perceptible esperado: the reader understands the category frame when measured, and trusts the report when it says the signal is not strong enough.
- Friccion que debe reducir: confusion from raw taxonomy/status labels, empty numbers, unexplained section disappearance or mock-only behavior.
- No-goals UX: no backend data creation, no report redesign, no icon system migration, no local category inference.

### Surface & system decision

- Surface: `efeonce-think` public report `/brand-visibility/r/[token]`.
- Composition Shell: `no aplica` — external Astro public hub, not private Greenhouse portal.
- Primitive decision: `reuse` — existing Think report section and `ReportIcon`; optional local row extraction only if it reduces duplication.
- Adaptive density / The Seam: `no aplica` — no private portal card primitive.
- Floating/Sidecar/Dialog decision: none.
- Copy source: `local one-off` in Think report; backend facts supply data only.
- Access impact: `none` — public tokenized report behavior unchanged.

### State inventory

- Default: `mapped` category summary and rows.
- Loading: Astro SSR; no client loading state inside the rendered report.
- Empty: `unknown` state with user-facing explanation, not internal taxonomy language.
- Error: safe fallback/omission; no raw error.
- Degraded / partial: `needs_review`, missing counts, missing labels or old snapshot.
- Permission denied: unchanged 404/expired token page behavior.
- Long content: cap/render rows without page overflow; long labels wrap.
- Mobile / compact: 390px layout stacks rows cleanly.
- Keyboard / focus: no new interactive controls expected.
- Reduced motion: no new motion.

### Interaction contract

- Primary interaction: reading/scanning; no new user action.
- Hover / focus / active: existing share/download controls unaffected.
- Pending / disabled: N/A.
- Escape / click-away: unchanged share dock if present.
- Focus restore: unchanged.
- Latency feedback: N/A.
- Toast / alert behavior: unchanged.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no new motion.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A.
- Non-goal motion: no animated counters or row reveals in this task.

### Implementation mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Primitive / variant / kind: existing category section; state branches `mapped|needs_review|unknown|legacy`.
- Component candidates:
  - `normalizeCategoryTaxonomySummaryForRender` local pure helper if needed.
  - `categoryLevelPresentation` map for level label/helper/icon.
  - optional row fragment for repeated category rows.
- Copy source: local Think report copy.
- Data reader / command: server-side fetch from Greenhouse public report endpoint.
- API parity: N/A; read-only rendering of existing backend contract.
- Access / capability: public tokenized report.
- States to implement: mapped, needs_review, unknown, partial/legacy, long labels, zero/missing totals, mobile.

### GVC scenario plan

- Scenario file: `/Users/jreye/Documents/efeonce-think/scripts/verify-report.mjs` or new Think-local verifier.
- Route: local Think route with exact Greenhouse-shaped fixtures for mapped, unknown and legacy/partial category summary.
- Viewports: `1440x1000`, `1280x900`, `390x844`.
- Required steps: load each state, capture category section/full page, inspect text and metrics.
- Required captures: mapped section, unknown/empty section, needs_review/partial if fixture exists, mobile mapped section.
- Required `data-capture` markers: `report-category-association`; add `report-category-empty`/`report-category-review` if useful.
- Assertions: no raw labels, no `NaN`, no fabricated rows for unknown, no horizontal overflow, decorative icons hidden.
- Scroll-width checks: desktop/laptop/mobile 390.
- Reduced-motion / focus evidence: no new motion; no new focus targets.

### Design decision log

- Decision: create a UI companion task rather than folding this into TASK-1333.
- Alternatives considered:
  - Keep only backend TASK-1333: rejected because visible renderer states can still fail or feel unprofessional.
  - Make TASK-1333 hybrid: rejected because backend data production and public UI rendering deserve separate gates.
  - Mock category in Think until backend is ready: rejected for production.
- Why this pattern: Greenhouse owns category facts; Think owns presentation and compatibility.
- Reuse / extend / new primitive: reuse existing report section; optional tiny helper extraction only.
- Open risks: fixtures drift from real payload; copy over-explains; backend remains unknown until TASK-1333.

### Visual verification

- GVC scenario: Think-local Playwright/verifier.
- Viewports: 1440, 1280, 390.
- Required captures: mapped, unknown, partial/review if available.
- Required `data-capture` markers: `report-category-association`.
- Scroll-width check: `scrollWidth === clientWidth`.
- Accessibility/focus checks: icons decorative, no unlabeled controls.
- Before/after evidence: current local category screenshots can be used as visual baseline.
- Known visual debt: icon library upgrade remains TASK-1332.

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

### Slice 1 — Contract fixture matrix

- Capture or define exact Greenhouse-shaped fixtures for:
  - `mapped` with multiple categories and counts.
  - `unknown` with empty categories.
  - `needs_review` with ambiguous/unmapped counters.
  - legacy/partial missing `categoryTaxonomySummary` or missing optional counters.
- Ensure fixtures mirror the actual public API shape, not an invented Think-only shape.
- Document how each state should render.

### Slice 2 — Renderer hardening

> **~HECHO por `681f1e4` (ver Delta 2026-07-04): NO reimplementar de cero.** Este slice pasa a ser
> AUDITAR lo shipped contra el contrato + (a) corregir el badge `{ambiguousCount} ambiguas` (línea ~1193,
> viola el copy guardrail; reemplazar por copy neutro o quitar) + (b) reconciliar con el wireframe.

- Add a small defensive presentation normalizer if needed, scoped to Think rendering only.
- Render mapped categories with bounded percentages and no `NaN`.
- Translate canonical levels to user-facing labels/helpers.
- Render `unknown` and `needs_review` with professional UX writing and no internal jargon.
- Keep old snapshot compatibility and safe omission/fallback if the field is missing.

### Slice 3 — Visual and no-leak verifier

- Extend `/Users/jreye/Documents/efeonce-think/scripts/verify-report.mjs` or add a focused verifier for category states.
- Assert raw backend labels do not appear.
- Assert category rows only appear when backend data supports them.
- Assert no horizontal page overflow at 1440/1280/390.
- Capture mapped and unknown states for review.

### Slice 4 — Backend integration proof

- Test against a real Greenhouse API response that currently returns `unknown`.
- When TASK-1333 provides a mapped real token, verify the same renderer displays mapped rows without code changes.
- Document the exact token/test route used for smoke without exposing sensitive tokens in public docs.

## Out of Scope

- No backend changes; TASK-1333 owns category signal generation.
- No icon library migration; TASK-1332 owns that.
- No short-link changes; TASK-1330 owns that.
- No scoring, probes, normalizer, provider adapter or `ReportArtifactModel` derivation changes.
- No production deploy without explicit operator confirmation.

## Detailed Spec

### Renderer states

| Backend state | Think behavior |
|---|---|
| `mapped` + categories | Show section, primary summary, row list, counts/shares and helpers. |
| `mapped` + empty categories | Degrade to unknown/coverage; do not show empty row list. |
| `needs_review` | Show cautious state or compact review panel; no raw `ambiguous` label. |
| `unknown` | Show honest coverage/empty state or omit only if report flow remains coherent. |
| missing field | Legacy fallback; no crash. |
| malformed counts | Clamp/bound display; no `NaN`, no negative widths. |

### Copy guardrails

- Use user-facing language: categoria, industria, sector, oferta, caso de uso, mercado, comprador.
- Avoid internal language: canonical signals, taxonomy nodes, ambiguousCount, unmappedCount, mid_category, service_line.
- Avoid overclaiming: say the AI "tiende a encuadrar" or "asocia", not that it "define" the brand.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (fixture matrix) -> Slice 2 (renderer hardening) -> Slice 3 (visual/no-leak verifier) -> Slice 4 (backend integration proof).
- Slice 2 MUST use exact backend-shaped fixtures from Slice 1.
- Slice 4 mapped-real proof may wait for TASK-1333 if production currently has only `unknown`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Think fixture drifts from Greenhouse payload | UI/API contract | medium | derive fixtures from real API samples and route-contract docs | verifier passes mock but fails real token |
| Section fabricates category for unknown data | public report | low | explicit assertion no rows for unknown | visible fake rows |
| Raw internal labels leak | public report | medium | forbidden-string assertions | verifier detects raw labels |
| Mobile overflow from long labels/counts | UI | medium | 390px scroll-width checks and wrapping | scrollWidth > clientWidth |
| Backend later adds mapped data but UI misreads it | UI/API contract | medium | TASK-1333 integration proof with real mapped token | mapped token still shows empty state |

### Feature flags / cutover

- Sin flag — Think renderer-only change.
- Deployment to production is the Think Vercel deployment and requires explicit operator confirmation.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Remove/update fixtures/docs. | <10 min | si |
| Slice 2 | Revert renderer changes in `[token].astro`. | <30 min | si |
| Slice 3 | Revert verifier changes. | <15 min | si |
| Slice 4 | Stop rollout or revert Think deploy. | <30 min | si |

### Production verification sequence

1. Run Think `pnpm type-check` and `pnpm build`.
2. Run local category verifier for mapped/unknown/legacy fixtures.
3. Test a real Greenhouse token with current payload.
4. After TASK-1333 maps a real token, smoke the same renderer with mapped backend data.
5. With explicit approval, push/deploy Think and verify production URL.

### Out-of-band coordination required

- N/A for code implementation.
- Production deploy requires operator approval.
- Real mapped token proof may depend on TASK-1333 runtime work.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] `UI ready` queda `yes` porque wireframe y UI/UX contract tienen implementation mapping, GVC scenario plan y design decision log.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-1334-think-category-perception-renderer-contract.md` y el archivo existe.
- [ ] Think renders `mapped`, `unknown`, `needs_review` and legacy/partial category states without crashing.
- [ ] Think does not derive, infer or mock production category facts locally.
- [ ] Raw backend/internal labels do not appear in visible report.
- [ ] Counts/shares are bounded; no `NaN`, negative progress widths or empty rows.
- [ ] Desktop/laptop/mobile captures show no horizontal page overflow.
- [ ] A real Greenhouse `unknown` payload renders an honest state.
- [ ] When a real mapped token exists from TASK-1333, the same renderer shows the mapped section without code changes.

## Verification

- `pnpm task:lint --task TASK-1334`
- `pnpm ui:wireframe-check --task TASK-1334`
- `pnpm ui:readiness-check --task TASK-1334`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- In `/Users/jreye/Documents/efeonce-think`: `pnpm type-check`
- In `/Users/jreye/Documents/efeonce-think`: `pnpm build`
- Think-local Playwright/verifier for category states at 1440/1280/390

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible del reporte
- [ ] `/Users/jreye/Documents/efeonce-think/src/components/primitives/README.md` o docs del hub se actualizan si queda un nuevo patrón renderer
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1331, TASK-1332, TASK-1333 y TASK-1330

## Follow-ups

- Si TASK-1333 cambia o amplía el contrato backend, actualizar fixtures/verifier de TASK-1334 en el mismo ciclo.
- Si la sección se reutiliza en otros lead magnets, extraer una primitive Think separada con task propia.

## Open Questions

- Confirmar durante implementación si `needs_review` debe ser visible o si se degrada a un estado de cobertura más neutro.
- Confirmar si el section number `06` debe permanecer fijo o derivarse del orden real del reporte si aparecen secciones condicionales nuevas.
