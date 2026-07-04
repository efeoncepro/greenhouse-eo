# TASK-1329 — AI Visibility Report Visual Editorial Polish

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1329-ai-visibility-report-visual-editorial-polish.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|public-site|ui`
- Blocked by: `none`
- Branch: `task/TASK-1329-ai-visibility-report-visual-editorial-polish`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Mejorar el acabado visual/editorial del informe publico de AI Visibility en `think.efeoncepro.com/brand-visibility/r/<token>` ahora que TASK-1328 ya expone evidencia real. La task no cambia scoring ni modelo: hace que cobertura por motor, fuentes citadas, readiness, metodologia y CTA se lean con mejor jerarquia, estado y confianza visual.

## Why This Task Exists

TASK-1328 corrigio el contrato de datos y verifico que las secciones nuevas renderizan sin leaks ni overflow. Eso no equivale a una pasada visual/editorial profunda. El reporte ya es funcional y correcto, pero merece una iteracion dedicada para que la evidencia se perciba mas clara, premium, escaneable y reutilizable sin poner en riesgo el modelo ni la escalera aprobada.

## Goal

- Refinar jerarquia, ritmo, densidad y copy de los bloques de evidencia del reporte publico.
- Extraer o estabilizar bloques reutilizables solo si reducen duplicacion dentro de `efeonce-think`.
- Mantener el hub como renderer tonto del `ReportArtifactModel`; no derivar scoring ni semantica nueva en Astro.
- Verificar desktop, laptop y mobile 390 con capturas y medicion de overflow.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/tasks/complete/TASK-1325-public-lead-magnet-hub-repo-vercel-report-render.md`
- `docs/tasks/complete/TASK-1328-ai-visibility-report-signal-completeness.md`
- `docs/ui/wireframes/TASK-1329-ai-visibility-report-visual-editorial-polish.md`
- `/Users/jreye/Documents/efeonce-think/greenhouse.repo.json`

Reglas obligatorias:

- Greenhouse sigue siendo source of truth del modelo. `efeonce-think` renderiza `model`; no re-deriva scoring ni readiness.
- No exponer raw prompts, raw provider answers, full citation URLs, internal reasons, hallucination details, raw evidence ni accuracy findings.
- No inventar categoria, source evidence, readiness, sentiment ni trend cuando el modelo venga vacio/unknown.
- No reescribir `MaturityLadder`; cualquier ajuste alrededor de la escalera debe preservar su contrato y evidencia visual.
- No convertir esto en landing pública ni form embed; TASK-1327 owns `/brand-visibility`.
- No introducir Vuexy/MUI en el hub Astro externo.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1325 — hub publico `efeonce-think` live y `MaturityLadder` canonizada.
- TASK-1328 — secciones/evidencia del reporte ya cableadas y release productivo verificado.
- `GET /api/public/growth/ai-visibility/report/[token]` — contrato headless que alimenta el render.

### Blocks / Impacts

- Mejora el valor percibido del lead magnet y la confianza del reporte compartible.
- Puede generar componentes locales reutilizables en `efeonce-think` para futuros reportes SEO/AEO.
- Informa una posible futura consolidacion de bloques de evidencia cuando el hub converja con el rail publico mayor.

### Files owned

- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- `/Users/jreye/Documents/efeonce-think/src/components/primitives/MaturityLadder.astro` — read/protect; avoid rewrite unless a tiny non-breaking style fix is justified.
- `/Users/jreye/Documents/efeonce-think/src/components/EngineMark.astro`
- `/Users/jreye/Documents/efeonce-think/src/components/CompetitiveBenchmark.astro`
- `/Users/jreye/Documents/efeonce-think/src/lib/report.ts`
- `/Users/jreye/Documents/efeonce-think/src/lib/report-tokens.ts`
- `/Users/jreye/Documents/efeonce-think/src/styles/global.css`
- `docs/ui/wireframes/TASK-1329-ai-visibility-report-visual-editorial-polish.md`
- `docs/tasks/to-do/TASK-1329-ai-visibility-report-visual-editorial-polish.md`

## Current Repo State

### Already exists

- Production report route: `https://think.efeoncepro.com/brand-visibility/r/<token>`.
- External repo clean at commit `f4e0747` after TASK-1328.
- `MaturityLadder` primitive exists in `/Users/jreye/Documents/efeonce-think/src/components/primitives/MaturityLadder.astro`.
- TASK-1328 production smoke confirmed readiness, engine denominators, source-domain evidence, no leaks and no horizontal overflow.

### Gap

- TASK-1328 verified functional visual correctness, but did not do a dedicated product-design pass for editorial rhythm, density, hierarchy, reusable evidence sections or section-level polish.
- Evidence blocks can be made clearer without changing data semantics.
- There is no durable GVC/capture scenario specifically for visual polish regression of the public report after TASK-1328.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospect, founder, marketer or executive reading a public AI Visibility diagnostic.
- Momento del flujo: after opening a tokenized report link and scanning the evidence before a commercial conversation.
- Resultado perceptible esperado: the report feels credible, premium, easy to scan and evidence-led.
- Friccion que debe reducir: evidence blocks feel technically correct but not yet fully editorialized or reusable.
- No-goals UX: no new scoring, no backend model work, no landing page, no form embed, no full report rewrite.

### Surface & system decision

- Surface: public report `think.efeoncepro.com/brand-visibility/r/[token]`.
- Composition Shell: `no aplica` — external Astro public report, not Greenhouse portal shell.
- Primitive decision: `extend` — stabilize local report evidence sections; reuse `MaturityLadder`; create local reusable component only if it removes real duplication.
- Adaptive density / The Seam: `aplica parcialmente` — evidence sections must adapt to container width and mobile 390 without horizontal page scroll.
- Floating/Sidecar/Dialog decision: none.
- Copy source: local one-off in `efeonce-think` unless a reusable Greenhouse copy source is explicitly introduced in a later task.
- Access impact: `none`.

### State inventory

- Default: measured evidence sections render with polished hierarchy.
- Loading: preserve SSR/fetch fallback without adding skeleton complexity unless already present.
- Empty: optional sections omit cleanly or use neutral copy when needed.
- Error: no raw errors; report remains readable.
- Degraded / partial: keep honest partial state visible.
- Permission denied: existing 404/invalid token behavior unchanged.
- Long content: top-N rows remain bounded; no full URL list.
- Mobile / compact: evidence blocks stack cleanly at 390px.
- Keyboard / focus: links and any info controls have visible focus.
- Reduced motion: no new nontrivial motion; preserve current behavior.

### Interaction contract

- Primary interaction: read/scan/share internally.
- Hover / focus / active: preserve current link/CTA feedback; no decorative-only controls.
- Pending / disabled: existing CTA state only.
- Escape / click-away: not applicable.
- Focus restore: not applicable.
- Latency feedback: existing route-level behavior only.
- Toast / alert behavior: none.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: none.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: not applicable.
- Reduced-motion fallback: preserve existing behavior.
- Non-goal motion: do not add new animated systems.

### Implementation mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`.
- Primitive / variant / kind: reuse `MaturityLadder`; possible local `EvidenceBlock` / `MetricEvidenceTable` if duplication appears.
- Component candidates: engine coverage block, source evidence block, readiness block, method bridge, optional category block.
- Copy source: local hub copy with explicit ledger in wireframe.
- Data reader / command: existing public report endpoint; no command.
- API parity: no business action introduced.
- Access / capability: public tokenized report.
- States to implement: measured, partial, omitted/empty, degraded, mobile compact, long source list.

### GVC scenario plan

- Scenario file: use or create external hub visual capture script/scenario in `/Users/jreye/Documents/efeonce-think`.
- Route: local preview fixture and production/staging token after deploy.
- Viewports: `1440x1000`, `1280x900`, `390x844`.
- Required steps: load report, capture hero, evidence intro, engine coverage, source evidence, readiness, ladder and lower CTA.
- Required captures: full page plus section clips.
- Required `data-capture` markers: `report-hero`, `report-engine-coverage`, `report-source-evidence`, `report-readiness`, `report-ladder`; category marker only when fixture has measured category data.
- Assertions: no raw prompt/provider/full URL leaks, no page horizontal overflow, category unknown omitted, ladder visible.
- Scroll-width checks: Playwright `scrollWidth <= clientWidth` at desktop and mobile 390.
- Reduced-motion / focus evidence: focus visible on CTA/links; no new reduced-motion burden.

### Design decision log

- Decision: create a visual/editorial polish task after TASK-1328 instead of mixing polish into the signal-completeness release.
- Alternatives considered: backend follow-up, full redesign, landing page work.
- Why this pattern: the data contract is already shipped; the remaining gap is clarity, hierarchy and reusable evidence presentation.
- Reuse / extend / new primitive: reuse `MaturityLadder`; extend local report sections; create local primitive only if repeated evidence blocks justify it.
- Open risks: external Astro stack differs from portal; avoid forcing Greenhouse portal patterns into the hub.

### Visual verification

- GVC scenario: external hub capture script/scenario.
- Viewports: desktop 1440, laptop 1280, mobile 390.
- Required captures: full page and section clips.
- Required `data-capture` markers: listed above.
- Scroll-width check: required.
- Accessibility/focus checks: CTA/link focus required.
- Before/after evidence: before from TASK-1328 runtime captures, after from TASK-1329 captures.
- Known visual debt: broader landing page and form embed are TASK-1327.

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

### Slice 1 — Product-design audit and before captures

- Capture current report desktop/laptop/mobile from local preview or production token.
- Review hierarchy, density, spacing, copy, evidence ordering and mobile scan path.
- Decide whether blocks stay inline or become local reusable Astro components.

### Slice 2 — Evidence-section polish

- Refine method bridge, engine coverage, source evidence and readiness hierarchy.
- Preserve category conditional behavior from TASK-1328.
- Keep all evidence semantics driven by `model`.

### Slice 3 — Reuse boundary and cleanup

- Extract local reusable evidence components only if repeated blocks justify it.
- Keep `MaturityLadder` unchanged unless a tiny non-breaking fix is necessary.
- Remove one-off duplicate styles if they conflict with `report-tokens`.

### Slice 4 — Visual verification and release notes

- Run external hub type/build checks.
- Capture before/after desktop/laptop/mobile.
- Verify no overflow, no forbidden data and category omission behavior.
- Update task evidence, `Handoff.md` and `changelog.md`.

## Out of Scope

- No backend/model/scoring changes in Greenhouse.
- No changes to `executeClaimedGraderRun`, probes, snapshots or `ReportArtifactModel`.
- No public landing `/brand-visibility` work.
- No form embed or self-serve intake.
- No full SEO/indexing cutover.
- No new public data exposure.

## Detailed Spec

The executor should treat TASK-1328 as the functional baseline. The expected output is a more polished public report that keeps the same measured fields but improves:

- section order and bridge copy;
- hierarchy between headline score and evidence;
- evidence table/card density;
- mobile stacking;
- source-domain trust cues without full URLs;
- readiness explanation as site operability, not visibility score;
- CTA continuity after evidence.

The page must remain a token-gated report with `noindex` behavior inherited from the hub.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (audit/before captures) -> Slice 2 (visual polish) -> Slice 3 (reuse cleanup) -> Slice 4 (verification/release notes).
- Do not extract reusable components before Slice 1 decides which blocks actually repeat.
- Do not deploy visual polish without comparing before/after and checking mobile 390 overflow.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Visual polish hides missing-data honesty | public report | medium | explicit empty/unknown states and fixture with unknown category | category appears for unknown/empty model |
| Refactor breaks approved ladder | public report | low-medium | no rewrite; section capture before/after | ladder missing or interaction visually degraded |
| Mobile layout gains horizontal overflow | public report | medium | Playwright scroll-width check at 390px | `scrollWidth > clientWidth` |
| Astro derives data semantics locally | public report/model boundary | medium | consume `model`; no scoring derivation in Astro | computed labels diverge from API/model |
| New visual components overfit one token | public report | medium | test measured and unknown/partial fixtures | empty/partial token looks broken |

### Feature flags / cutover

- No new flag. This is a visual/editorial change in the external hub.
- Rollback is Vercel/Git rollback of `efeonce-think` if production visual smoke fails.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | docs/captures only; no runtime change | N/A | yes |
| Slice 2 | revert hub commit or Vercel rollback | <10 min | yes |
| Slice 3 | revert extraction commit | <10 min | yes |
| Slice 4 | no runtime mutation; update docs if validation fails | N/A | yes |

### Production verification sequence

1. `/Users/jreye/Documents/efeonce-think`: run type/build checks.
2. Capture local preview with a representative token/fixture.
3. Verify `scrollWidth <= clientWidth` at 1440, 1280 and 390.
4. Verify no forbidden raw fields appear in HTML/text.
5. Deploy hub preview/production through its normal Vercel rail.
6. Smoke a real report token after deploy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux`, `UI impact: primitive`, `Backend impact: none` remain accurate.
- [ ] `UI ready` stays `no` until implementation mapping, GVC scenario plan and design decision log are confirmed by the executor.
- [ ] Wireframe exists at `docs/ui/wireframes/TASK-1329-ai-visibility-report-visual-editorial-polish.md`.
- [ ] The report still consumes `ReportArtifactModel` fields and does not derive scoring/readiness/category semantics locally.
- [ ] `MaturityLadder` is preserved; no rewrite of the primitive.
- [ ] Measured, partial, unknown/empty and mobile states are visually reviewed.
- [ ] Category block remains absent or neutral when category status is `unknown` and categories are empty.
- [ ] No raw prompts, provider answers, full citation URLs, internal findings or raw evidence appear in public HTML.
- [ ] Desktop 1440, laptop 1280 and mobile 390 captures show no page horizontal overflow.
- [ ] Before/after captures are linked in the task closure.
- [ ] `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md` and `changelog.md` are updated at closure.

## Verification

- `pnpm task:lint --task TASK-1329`
- `pnpm ui:wireframe-check --task TASK-1329`
- `pnpm ui:readiness-check --task TASK-1329`
- `/Users/jreye/Documents/efeonce-think`: `pnpm type-check`
- `/Users/jreye/Documents/efeonce-think`: `pnpm build`
- External hub Playwright/GVC visual captures desktop/laptop/mobile 390
- `git diff --check`

## Closing Protocol

- [ ] Move task to `docs/tasks/complete/` and set `Lifecycle: complete`.
- [ ] Sync `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `Handoff.md` with before/after evidence and any rollout caveat.
- [ ] Update `changelog.md`.
- [ ] If hub production deploy happens, record Vercel deployment URL and smoke token.

## Follow-ups

- Promote evidence blocks into a broader public-report primitive library if SEO/AEO reports reuse them.
- Coordinate with TASK-1327 if the landing should share the same evidence visual language.
