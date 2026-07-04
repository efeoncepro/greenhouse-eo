# TASK-1328 — AI Visibility public report signal completeness

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `layout`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1328-ai-visibility-report-signal-completeness.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1328-ai-visibility-report-signal-completeness-motion.md`
- Backend impact: `sync`
- Epic: `EPIC-020`
- Status real: `Complete — Greenhouse + efeonce-think released to production; runtime smoke verified with new public token`
- Rank: `TBD`
- Domain: `growth|ai|public-site|ui`
- Blocked by: `none`
- Branch: `develop -> main via PR #140`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Completar el reporte publico del AI Visibility Grader para que muestre las senales reales que el grader ya produce y hoy se pierden entre `PublicGraderReport`, `ReportArtifactModel` y el render Astro. La prioridad es cablear readiness/operabilidad, denominadores por motor, fuentes citadas por dominio y asociacion con categoria, sin inventar datos cuando un run viene parcial o sin evidencia.

La task tambien corrige el bug de orden donde el snapshot publico se publica antes de guardar probes, dejando `readiness: null` y el nivel "Be Actionable" en cobertura aunque la medicion exista.

### Execution unblock note — 2026-07-03

La task queda ejecutable local-first: `TASK-1325` esta complete y el hub `efeonce-think` vive en `https://think.efeoncepro.com/brand-visibility/r/<token>`. `TASK-1324` sigue in-progress/code-complete con rollout pendiente para trafico real de email, pero no bloquea esta implementacion; se mantiene como coordinacion de rollout antes de prometer enlaces productivos corregidos.

## Why This Task Exists

El reporte actual ya se ve enterprise, pero todavia oculta o aplana senales clave del grader:

- `run-engine` publica el snapshot antes de ejecutar `gatherRunProbes()`, por lo que la readiness queda fuera de snapshots publicos nuevos.
- `ReportArtifactModel` deja `agenticAxisScore: null` y no normaliza `readiness`, `citationSourceBreakdown` ni `categoryTaxonomySummary`.
- `efeonce-think` muestra menciones por motor, pero no el denominador `present/resolved`.
- `citationSourceBreakdown` existe y es public-safe, pero no se muestra.
- `categoryTaxonomySummary` existe, pero debe mostrarse solo cuando el run trae categorias reales; el token revisado venia `status: unknown` y `categories: []`.

El riesgo principal no es falta de datos sino mezclar narrativa con evidencia. La salida debe dejar claro que el diagnostico mide visibilidad en motores de respuesta, citabilidad/fuentes y operabilidad tecnica; no "IA" generica.

## Goal

- Hacer que el modelo publico exponga las senales public-safe del grader: readiness, denominadores por motor, desglose de fuentes, categoria, provenance y fix-it availability.
- Resolver el orden de publicacion para que snapshots nuevos incluyan probes/readiness cuando existen.
- Renderizar en `think.efeoncepro.com` bloques condicionales enterprise que usen solo datos reales del modelo.
- Mantener `null != 0`: sin medicion sigue "En cobertura" o "Sin datos"; nunca se convierte en cero ni en narrativa inventada.
- Proteger la escalera: `MaturityLadder` no se reescribe ni se degrada; solo consume scores/copy medidos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md`
- `docs/tasks/complete/TASK-1268-growth-ai-visibility-citation-source-breakdown.md`
- `docs/tasks/in-progress/TASK-1269-growth-ai-visibility-fix-it-artifacts.md`
- `docs/tasks/complete/TASK-1267-growth-ai-visibility-entity-infrastructure-probes.md`
- `docs/tasks/in-progress/TASK-1325-public-lead-magnet-hub-repo-vercel-report-render.md`

Reglas obligatorias:

- **Greenhouse es el source of truth del modelo.** `efeonce-think` debe renderizar `model`; no debe derivar scoring ni semantica desde `report` crudo salvo bridge temporal explicitamente anotado.
- **No inventar datos.** Si `readiness`, `categoryTaxonomySummary`, `sentimentSummary`, `positionSummary`, `trend` o `sourceTypeSummary` vienen vacios/unknown, se omiten o se marcan en cobertura/sin datos.
- **No mezclar ejes.** Score de percepcion/visibilidad y readiness/operabilidad son ortogonales. `Be Actionable` se alimenta de readiness agentic, no del score general.
- **No leak.** El reporte publico no expone raw provider text, prompts, full citation URLs, internal reasons, hallucination details, raw evidence ni accuracy findings internos.
- **No danar la escalera.** La primitive `MaturityLadder` aprobada en TASK-1325 permanece; cualquier cambio debe tener captura antes/despues y prueba de no-regresion de microinteracciones.
- **Lenguaje consistente.** Mantener "AI Visibility" como nombre de producto si aplica, pero en copy explicativo preferir "motores de respuesta", "respuestas generadas", "citas de fuentes" y "visibilidad en motores de respuesta".

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/ui/wireframes/TASK-1328-ai-visibility-report-signal-completeness.md`
- `docs/ui/motion/TASK-1328-ai-visibility-report-signal-completeness-motion.md`
- `/Users/jreye/Documents/efeonce-think/greenhouse.repo.json`

## Dependencies & Impact

### Depends on

- TASK-1325 — hub publico `efeonce-think` y render actual del reporte.
- TASK-1280 — endpoint headless con `ReportArtifactModel`.
- TASK-1266/TASK-1267 — probe layer structural/agentic/entity.
- TASK-1268 — `citationSourceBreakdown` public-safe.
- TASK-1269 — fix-it artifacts endpoint/generation, currently rollout pending.
- TASK-1324 — repoint email to the hub; not a code dependency, but recommended before live traffic.

### Blocks / Impacts

- Mejora el valor percibido del lead magnet publico.
- Alimenta futuros reportes email/PDF y client report consumers si comparten `ReportArtifactModel`.
- Puede requerir una follow-up de recovery para snapshots ya publicados si se decide republish/version bump.

### Files owned

- `src/lib/growth/ai-visibility/run-engine.ts`
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/growth/ai-visibility/report/builder.ts`
- `src/lib/growth/ai-visibility/report/command.ts`
- `src/lib/growth/ai-visibility/report/snapshot.ts`
- `src/components/growth/ai-visibility/report-artifact/model.ts`
- `src/components/growth/ai-visibility/report-artifact/**`
- `src/lib/growth/ai-visibility/probes/**`
- `src/lib/growth/ai-visibility/scoring/readiness-engine.ts`
- `src/lib/growth/ai-visibility/scoring/readiness-config.ts`
- `src/lib/copy/**` or report artifact copy source
- **External repo:** `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- **External repo:** `/Users/jreye/Documents/efeonce-think/src/lib/report.ts`
- **External repo:** `/Users/jreye/Documents/efeonce-think/src/components/**` if the report sections are extracted
- `docs/ui/wireframes/TASK-1328-ai-visibility-report-signal-completeness.md`

## Current Repo State

### Already exists

- Public DTO fields: `citationSourceBreakdown`, `categoryTaxonomySummary`, `sentimentSummary`, `positionSummary`, `trend`, `readiness`, `providerPresence`, `provenance`.
- Builder logic for presence, source type summary, citation domain breakdown, category taxonomy summary, sentiment, position and trend.
- Probe results table and readiness scoring for structural/agentic/entity axes.
- Fix-it artifact generator and endpoint behind governance/rollout.
- Public hub render in `efeonce-think` consuming the headless endpoint.

### Gap

- `gatherRunProbes()` currently runs after `finalizeRunDelivery()`, so immutable snapshots can publish before probes exist.
- `ReportArtifactModel` does not carry every public-safe signal and hardcodes `agenticAxisScore: null`.
- Public report view does not show denominators for motor coverage.
- Public report view does not show citation source breakdown by domain.
- Category association UI is not wired; for the sample token, category data is unknown and must remain empty/coverage.
- Existing frozen snapshots may not gain readiness automatically because `grader_reports` uses immutable conflict behavior.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospect, founder, marketer or executive reading a public diagnostic.
- Momento del flujo: opens tokenized report after grader completion.
- Resultado perceptible esperado: the report feels more evidence-rich and enterprise, with clear measured/partial/coverage states.
- Friccion que debe reducir: "What exactly was measured?" and "What should I improve first?"
- No-goals UX: no full redesign, no landing page, no new card-in-card pattern, no new ladder primitive.

### Surface & system decision

- Surface: public report `think.efeoncepro.com/brand-visibility/r/[token]`.
- Composition Shell: `no aplica` — external Astro public report, not Greenhouse portal shell.
- Primitive decision: `extend` — extend `ReportArtifactModel`; reuse existing `MaturityLadder`; add report sections as consumers.
- Adaptive density / The Seam: `aplica parcialmente` — sections must be responsive and avoid page horizontal scroll at 390px.
- Floating/Sidecar/Dialog decision: none. Optional info affordances must use simple accessible tooltip/popover if needed.
- Copy source: `src/lib/copy/*` for reusable report artifact copy; external Astro local copy only as bridge.
- Access impact: `none` — public tokenized report.

### State inventory

- Default: measured sections render values and method context.
- Loading: SSR/loading fallback only if external hub fetch is pending.
- Empty: optional sections hidden or shown as "sin evidencia suficiente".
- Error: no raw errors; block degrades without breaking report.
- Degraded / partial: existing partial report banner stays; per-section status labels remain explicit.
- Permission denied: existing token 404/denied behavior.
- Long content: top source domains bounded and table scroll handled within section if needed.
- Mobile / compact: no page horizontal scroll; tables convert to stacked rows if needed.
- Keyboard / focus: info controls keyboard reachable; tables have labels.
- Reduced motion: do not regress existing ladder/microinteraction fallbacks.

### Interaction contract

- Primary interaction: read/scan; optional CTA to fix-it artifacts when available.
- Hover / focus / active: preserve existing ladder hover/liquid behavior; optional info controls are subtle.
- Pending / disabled: fix-it CTA disabled/hidden when endpoint unavailable or flag off.
- Escape / click-away: only if a tooltip/popover is introduced.
- Focus restore: required only if popover is introduced.
- Latency feedback: section-level loading/degraded only.
- Toast / alert behavior: none.

### Motion & microinteractions

- Motion primitive: `CSS`/existing Astro behavior; no new GSAP work in this task.
- Enter / exit: no new nontrivial entrance motion.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: use existing hub tokens.
- Reduced-motion fallback: preserve existing behavior.
- Non-goal motion: do not rework the liquid ladder.

### Implementation mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`.
- Primitive / variant / kind: `ReportArtifactModel` as source, `MaturityLadder` unchanged, new report sections bounded.
- Component candidates: external Astro sections for engine coverage, source evidence, category association, readiness/methodology.
- Copy source: report artifact copy source or local hub bridge with follow-up to centralize.
- Data reader / command: `GET /api/public/growth/ai-visibility/report/[token]`; optional `/fix-it`.
- API parity: UI consumes public model fields; no UI-only business logic.
- Access / capability: public token; fix-it remains backend gated.
- States to implement: measured, no-data, partial, coverage, error/degraded, mobile.

### GVC scenario plan

- Scenario file: add/extend a public report GVC scenario; direct route capture acceptable if external repo remains outside Greenhouse tooling.
- Route: valid public token on staging/prod preview and local external hub preview.
- Viewports: 1440x1000, 1280x900, 390x844.
- Required steps: load, capture hero/ladder, scroll engine/source/category/readiness, hover/focus info controls if present.
- Required captures: full page + section clips.
- Required `data-capture` markers: `report-hero`, `report-ladder`, `report-engine-coverage`, `report-source-evidence`, `report-category-association`, `report-readiness`.
- Assertions: no invented empty fields, no page horizontal scroll, ladder unchanged, no raw prompts/text/URLs visible.
- Scroll-width checks: Playwright `scrollWidth <= clientWidth` desktop and mobile.
- Reduced-motion / focus evidence: verify existing ladder reduced-motion/focus behavior not regressed.

### Design decision log

- Decision: enrich the public model and render conditional evidence sections instead of adding decorative UI.
- Alternatives considered: derive from raw `report` in Astro; split into two tasks; show category placeholder always.
- Why this pattern: keeps Greenhouse as semantic owner and the hub as a dumb renderer while preserving no-leak guarantees.
- Reuse / extend / new primitive: extend `ReportArtifactModel`, reuse `MaturityLadder`, no new primitive.
- Open risks: existing snapshots need recovery; entity readiness is internal but not public; fix-it rollout may still be pending.

### Visual verification

- GVC scenario: public AI Visibility report signal completeness.
- Viewports: desktop/laptop/mobile.
- Required captures: listed above.
- Required `data-capture` markers: listed above.
- Scroll-width check: required.
- Accessibility/focus checks: required for info controls/tables.
- Before/after evidence: required around the ladder and new evidence sections.
- Known visual debt: source/category blocks need enterprise density without card-in-card.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: AI Visibility grader run lifecycle + public report snapshot/model.
- Consumidores afectados: public token report, email/PDF report artifact, client report artifact, future Nexa/MCP readers.
- Runtime target: `production` and `worker`/async grader run pipeline.

### Contract surface

- Contrato existente a respetar: `PublicGraderReport`, `ReportArtifactModel`, public route `/api/public/growth/ai-visibility/report/[token]`.
- Contrato nuevo o modificado: additive `ReportArtifactModel` fields for readiness, citation source breakdown, category taxonomy summary, provenance/method band, fix-it availability and engine denominators.
- Backward compatibility: `compatible` — additive fields; existing model consumers keep working.
- Full API parity: public report UI consumes model fields from the reader/route; no duplicate scoring logic in Astro.

### Data model and invariants

- Entidades/tablas/views afectadas: `grader_runs`, `grader_probe_results`, `grader_reports`; no schema migration expected unless snapshot versioning/recovery requires metadata.
- Invariantes que no se pueden romper:
  - `null` means not measured/coverage; it is never coerced to `0`.
  - Perception score is not blended with structural/agentic/entity readiness.
  - Public snapshot remains leak-safe and never includes raw provider evidence.
  - Existing immutable snapshot policy is respected unless a governed version bump/recovery path is explicitly implemented.
- Tenant/space boundary: public token scoped to report token; no session tenant.
- Idempotency/concurrency: probe gathering and snapshot publish must be idempotent for retried runs; avoid double-publishing conflicting snapshots.
- Audit/outbox/history: preserve current run/report delivery events and reliability signals; add signal if snapshot publishes without probes when probes are expected.

### Migration, backfill and rollout

- Migration posture: `none` expected; recovery of old snapshots may need governed republish/version bump.
- Default state: additive model fields enabled after tests; fix-it CTA gated by existing fix-it rollout/flag.
- Backfill plan: no bulk mutation by default. For already-published tokens, define a controlled recovery path: report version bump, explicit republish command, or documented "new runs only".
- Rollback path: revert model/render changes; if ordering change causes issues, revert run-engine slice and keep UI fields hidden on null.
- External coordination: deploy Greenhouse endpoint before relying on new fields in `efeonce-think`; deploy hub after model contract is live.

### Security and access

- Auth/access gate: public token only; no broader access.
- Sensitive data posture: no PII beyond existing report identity; no prompts/raw answers/full citation URLs.
- Error contract: route errors sanitized; UI degrades by section.
- Abuse/rate-limit posture: unchanged for report read; fix-it endpoint remains gated/rate-limited by its existing command contract.

### Runtime evidence

- Local checks: focal tests for run-engine ordering, report builder/model mapping, public route model shape and no-leak snapshots.
- DB/runtime checks: read-only query proving a new run snapshot includes readiness when `grader_probe_results` exists.
- Integration checks: fetch public endpoint for a test token and confirm `model.agenticAxisScore`, engine denominators, citation source breakdown and category state match source data.
- Reliability signals/logs: add/check signal for `readiness_missing_after_probe_gather` or equivalent if available.
- Production verification sequence:
  1. Deploy Greenhouse endpoint/model to staging.
  2. Run grader on staging token.
  3. Verify probes exist before/public snapshot includes readiness.
  4. Deploy hub render against staging/prod preview.
  5. Capture GVC desktop/mobile.
  6. Promote to production and smoke a token.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, token boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit, especially for frozen snapshots.
- [ ] Runtime evidence is listed beyond static tests.
- [ ] Public model and UI are no-leak by construction.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A — this task modifies report reads/projections, not a new write capability. If fix-it CTA executes generation, it must use the existing governed fix-it command from TASK-1269 and its capability/flag.

## Hybrid Execution Justification

- Why not split: the bug and UX gap cross the same public report contract; splitting would risk Astro rendering fields before Greenhouse can guarantee semantics. The task remains one execution unit with backend slices first.
- Primary execution profile: `backend-data`.
- Contract boundary: Greenhouse owns `PublicGraderReport` and `ReportArtifactModel`; `efeonce-think` renders additive fields and states only.
- Risk controls:
  - Backend/model slices ship before external Astro UI.
  - UI blocks are conditional on model fields.
  - No new prompt/raw evidence exposure.
  - GVC must prove the ladder was not regressed.

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

### Slice 1 — Signal audit and model contract map

- Confirm all public-safe signals currently generated by the grader:
  - `providerPresence.present/resolved`
  - `citationSourceBreakdown`
  - `categoryTaxonomySummary`
  - `readiness.structural` and `readiness.agentic`
  - entity readiness/probes availability and public contract gap
  - `sentimentSummary`, `positionSummary`, `trend`, `sourceTypeSummary`
  - `fix-it` availability
- Produce a model mapping table: source field -> public DTO -> `ReportArtifactModel` -> Astro section -> render condition.
- Decide which fields are in-scope v1 vs follow-up:
  - v1 required: engine denominators, citation source breakdown, readiness/Be Actionable, provenance/method, category conditional block.
  - v1 conditional: fix-it CTA if endpoint is enabled.
  - follow-up likely: entity readiness public axis, accuracy/hallucination client-only, richer commercial intent breakdown.

### Slice 2 — Run lifecycle and snapshot readiness wiring

- Reorder the run lifecycle so probes are gathered before report snapshot publication when probes are expected.
- Preserve idempotency and honest degradation when a probe fails/skips.
- Add or update tests so new snapshots include readiness when `grader_probe_results` exists.
- Define recovery for existing frozen snapshots: version bump, explicit republish command, or documented "new runs only".

### Slice 3 — Public model enrichment

- Extend `ReportArtifactModel` with additive fields for:
  - readiness/operability scores and statuses
  - engine coverage denominators
  - citation source breakdown by domain
  - category taxonomy summary
  - provenance/method metadata
  - fix-it availability if safe/enabled
- Map `readiness.agentic.overallScore` to `agenticAxisScore` and the `Be Actionable` level.
- Keep `null` values distinct from zero and make empty-state semantics explicit.
- Add no-leak tests for the enriched model.

### Slice 4 — Public hub render in efeonce-think

- Render new conditional enterprise sections from `model`:
  - Cobertura por motor de respuesta, with `present/resolved`.
  - Fuentes que sostienen las respuestas, with domain-only ranked evidence.
  - Asociacion con la categoria, only when category data exists.
  - Operabilidad del sitio / readiness, only when measured.
  - Compact methodology/provenance band.
  - Optional Kit de mejoras aplicables CTA only when generated/enabled.
- Preserve existing hero, score hierarchy, ladder and approved microinteractions.
- Use copy terminology from SEO/AEO audit: "motores de respuesta", "fuentes", "categoria", "operabilidad".

### Slice 5 — Verification, rollout and visual evidence

- Run local and focal tests for Greenhouse model/route.
- Run external Astro build/lint where applicable.
- Fetch a real/staging token and compare endpoint fields vs rendered sections.
- Capture GVC/screenshots desktop and mobile, including scroll-width check.
- Update handoff/changelog with data contract changes and any snapshot recovery decision.

## Out of Scope

- No new scoring formula.
- No raw prompt/provider answer viewer in the public report.
- No full citation URL list in the public report; domain-level aggregation only.
- No public hallucination/accuracy finding detail; that remains internal or client-gated unless a later task creates a safe summary.
- No redesign/rewrite of `MaturityLadder`.
- No category narrative if `categoryTaxonomySummary.status` is `unknown` or `categories` is empty.
- No full multi-repo control plane work; TASK-1326 owns governance of `efeonce-think`.

## Detailed Spec

### Priority ranking from investigation

| Rank | Opportunity | Existing signal | Public posture |
|---:|---|---|---|
| 1 | Cobertura por motor con denominador | `providerPresence.present/resolved` | Show now via model. |
| 2 | Fuentes que sostienen las respuestas | `citationSourceBreakdown` | Show domain-only, bounded. |
| 3 | Operabilidad del sitio / Be Actionable real | `readiness.agentic` + probes | Fix run order + model mapping. |
| 4 | Asociacion con categoria | `categoryTaxonomySummary` | Conditional; do not render unknown as insight. |
| 5 | Kit de mejoras aplicables | `/fix-it` endpoint/artifacts | CTA only if enabled/generated. |
| 6 | Prominencia y tono | `positionSummary`, `sentimentSummary` | Conditional; sample token currently empty. |
| 7 | Base de entidad publica | entity probes/readiness internal axis | Follow-up unless public contract is explicitly extended. |
| 8 | Intencion comercial | revenue intent coverage / prompt tags | Keep current dimension; richer breakdown follow-up. |
| 9 | Exactitud de representacion | accuracy detector internal | Do not show public raw details. |

### Sample token evidence from investigation

For the reviewed public token on 2026-07-03:

- `readiness` was `null` in the public snapshot even though probe rows existed after snapshot publication.
- `model.agenticAxisScore` was `null`, so the report showed "En cobertura".
- `engineSnapshot` had denominator data that the UI did not render.
- `citationSourceBreakdown` had real domain-level evidence and should be rendered when present.
- `categoryTaxonomySummary` existed but was `unknown`/empty; the category section should remain empty/coverage for this token.
- `sentimentSummary`, `positionSummary` and `sourceTypeSummary` did not carry useful measured signal for this token and should not be forced into the UI.

### Copy and naming rules

- Product label can remain `AI Visibility`.
- Explanatory copy should prefer:
  - `motores de respuesta`
  - `respuestas generadas`
  - `fuentes citadas`
  - `visibilidad en motores de respuesta`
  - `operabilidad del sitio`
  - `preparacion para citabilidad`
  - `asociacion con la categoria`
- Avoid generic "la IA" when the measured object is answer engines/providers/responses.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (signal audit) -> Slice 2 (run/snapshot readiness) -> Slice 3 (public model) -> Slice 4 (external hub render) -> Slice 5 (verification/rollout).
- Slice 4 MUST NOT ship public sections that depend on fields before Slice 3 is deployed to the environment it consumes.
- Existing snapshot recovery decision MUST be made before promising that old tokens will show readiness.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Snapshot sigue publicandose sin readiness | grader run / report snapshot | medium | reorder probes before finalize; test with synthetic run | `readiness: null` while probe rows exist |
| UI interpreta `null` como `0` | public report | medium | typed model states + tests + visual assertions | score shows 0 instead of coverage |
| Astro deriva logica desde raw report y diverge | public hub | medium | extend `ReportArtifactModel`; renderer stays dumb | fields mismatch endpoint/model |
| Public leak of prompts/raw answers/full URLs | public API/UI | low-medium | no-leak tests, domain-only citations, type boundary | raw text or URL visible in page/API |
| Ladder microinteractions regress | public UI | medium | no rewrite; before/after GVC and hover/focus check | visual/motion mismatch |
| Category block invents category when unknown | public UI/copy | medium | render condition: categories present + measured/partial status | category copy appears on empty token |
| Existing tokens remain stale | report delivery | high | explicit recovery strategy; communicate new-runs-only if chosen | old token still shows coverage |

### Feature flags / cutover

- No new flag required for additive model fields.
- Fix-it CTA must respect existing TASK-1269 flag/capability/rollout state.
- If changing snapshot publication order proves risky, gate the ordering with an internal flag or staged rollout only if Discovery finds live run volume/cost risk.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | docs/model map only; revert docs | <5 min | yes |
| Slice 2 | revert run-engine ordering change; UI fields remain null/hidden | <15 min + redeploy | yes |
| Slice 3 | revert additive model fields or keep fields unused | <15 min + redeploy | yes |
| Slice 4 | revert external Astro render sections; keep backend fields | <10 min + Vercel deploy | yes |
| Slice 5 | no runtime mutation; update handoff if verification fails | N/A | yes |

### Production verification sequence

1. Greenhouse staging: run focal tests and build.
2. Greenhouse staging: execute/inspect a grader run; verify `grader_probe_results` exists before snapshot/model readiness.
3. Public endpoint: fetch token; verify `model` fields map correctly.
4. External hub preview: render token; verify conditional sections and no-leak.
5. GVC desktop/mobile: hero, ladder, source/category/readiness sections, scroll width.
6. Production deploy Greenhouse, then production deploy hub.
7. Production smoke with a new run token and, if recovery was chosen, an old token.

### Out-of-band coordination required

- External repo deploy for `efeonce-think` via Vercel.
- Decide with operator whether old snapshots should be republished/version-bumped or remain as-is with "new runs only" behavior.
- If fix-it CTA is enabled, coordinate TASK-1269 rollout/legal copy before exposing downloads.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] New snapshots include `readiness` when probes are gathered; skipped/failed probes degrade honestly. Local unit evidence: `run-engine.test.ts`.
- [x] `ReportArtifactModel` exposes readiness, engine denominators, citation source breakdown, category summary and provenance as additive public-safe fields.
- [x] `Be Actionable`/`agenticAxisScore` is wired from `readiness.agentic.overallScore` without changing perception score.
- [x] Public report shows motor denominators and source-domain evidence when present in local `efeonce-think` fixture validation.
- [x] Category section renders only with measured category data; unknown/empty remains coverage/empty.
- [x] No raw prompts, raw provider answers, full citation URLs, internal reasons or accuracy findings appear in public API/model/UI.
- [x] Existing ladder visual and microinteraction behavior is preserved; `MaturityLadder` was not rewritten and desktop/mobile captures were inspected.
- [x] Existing snapshots recovery policy is documented as `new-runs-only` by default unless a governed republish/version bump is approved.

## Execution Evidence — 2026-07-03

- Greenhouse run lifecycle: moved `gatherRunProbes()` before `finalizeRunDelivery()` so future public snapshots can include readiness/probes before delivery freezes.
- Greenhouse model contract: `ReportArtifactModel` now carries `readiness`, `citationSourceBreakdown` and `categoryTaxonomySummary` as additive public-safe fields; `agenticAxisScore` and the `Be Actionable` level use `readiness.agentic.overallScore`.
- Public route contract: `GET /api/public/growth/ai-visibility/report/[token]` test asserts the additive fields appear in `model` without changing the existing `report`.
- External hub render: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro` renders method/provenance, engine `present/resolved`, source domains, category association, readiness and required `data-capture` markers from `model`.
- Visual evidence: local SSR fixture + Astro route `http://localhost:4321/brand-visibility/r/grt-task-1328`; captures at `/Users/jreye/Documents/efeonce-think/.captures/task1328-report-desktop.png` and `.../task1328-report-mobile.png`; Playwright assertion PASS with `scrollWidth=clientWidth` at desktop 1440 and mobile 390.
- Release evidence: Greenhouse PR #140 merged to `main` at `ef6a130d7382404b06d9dc977e85262374114c2b`; Greenhouse Vercel production deployment `greenhouse-qwypaj6zn-efeonce-7670142f.vercel.app` reached `READY`; Production Release Orchestrator run `28687175070` completed successfully after Playwright smoke and CI/deep checks passed.
- Worker evidence: `ico-batch-worker` deploy was not skipped. The production release executed its deploy job, health check passed and Cloud Run reported `Ready=True`. Post-release watchdog initially found only `ops-worker` SHA drift; `ops-worker` was redeployed to revision `ops-worker-00451-nfj` with `GIT_SHA=ef6a130d7382404b06d9dc977e85262374114c2b`, after which `pnpm release:watchdog --json` returned `aggregateSeverity: ok` and 4/4 workers synced (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, `hubspot-greenhouse-integration`).
- External hub evidence: `efeonce-think` commit `f4e0747` was pushed to `main`; Vercel production deployment `efeonce-think-1iycuu8sl-efeonce-7670142f.vercel.app` reached `READY`; canonical URL `https://think.efeoncepro.com/brand-visibility/r/<token>` renders the additive report sections from `ReportArtifactModel`.
- Production runtime smoke: new run `grun-a6e191f9-6cd9-4761-bf28-65a3dfa1895c`, public id `EO-GRUN-00038`, token `grt-45361f263b724327a4d4b95dc8c04ab624c2946469514712bbdcfccef1364b86`, public URL `https://think.efeoncepro.com/brand-visibility/r/grt-45361f263b724327a4d4b95dc8c04ab624c2946469514712bbdcfccef1364b86`. Public API returned readiness (`agentic=43.8`), engine denominators for 4/4 providers, domain citation evidence and no forbidden raw fields.
- Visual production evidence: `/Users/jreye/Documents/efeonce-think/.captures/task1328-runtime-desktop.png` and `/Users/jreye/Documents/efeonce-think/.captures/task1328-runtime-mobile.png`; desktop 1440 and mobile 390 had `scrollWidth=clientWidth`, required sections present, no no-leak tokens. `report-category-association` was intentionally absent for this smoke because category status was `unknown` with `categories=[]`.

## Verification

- `pnpm task:lint --task TASK-1328`
- `pnpm ui:wireframe-check --task TASK-1328`
- `pnpm ui:readiness-check --task TASK-1328`
- `pnpm ui:motion-check --task TASK-1328`
- `pnpm test -- --runInBand src/components/growth/ai-visibility/report-artifact`
- `pnpm test -- --runInBand src/lib/growth/ai-visibility/report`
- `pnpm test -- --runInBand src/lib/growth/ai-visibility`
- `pnpm tsc --noEmit`
- `pnpm lint`
- External repo: `pnpm build` or Astro/Vercel preview check in `/Users/jreye/Documents/efeonce-think`
- Runtime smoke: fetch public endpoint for a new token and inspect model fields
- Visual: GVC/Playwright screenshots desktop + mobile + `scrollWidth <= clientWidth`

Executed local evidence:

- `pnpm exec vitest run src/lib/growth/ai-visibility/__tests__/run-engine.test.ts src/components/growth/ai-visibility/report-artifact/__tests__/report-artifact-no-leak.test.tsx 'src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts' src/lib/growth/ai-visibility/__tests__/report-readiness.test.ts` — 4 files / 30 tests passed.
- `pnpm typecheck` — passed.
- `pnpm lint` — passed after sandbox escalation for `tsx` IPC.
- `pnpm ops:lint --changed` — passed.
- `pnpm build` — passed before production release.
- `pnpm design:lint` — passed before production release.
- `pnpm qa:gates --changed --agent codex --task TASK-1328 --ui --runtime --data` — advisory review completed; no hard failure, conservative runtime evidence warnings were closed by production smoke/watchdog.
- `pnpm docs:closure-check` — passed before production release; rerun required after final lifecycle move.
- `pnpm secrets:audit` — blocked locally by missing shell secrets; no secret/env mutation in this task.
- `/Users/jreye/Documents/efeonce-think`: `pnpm type-check` and `pnpm build` — passed.
- `/Users/jreye/Documents/efeonce-think`: `node scripts/capture.mjs http://localhost:4321/brand-visibility/r/grt-task-1328 task1328-report` — desktop/mobile HTTP 200 screenshots saved.
- `/private/tmp/task1328-assert-public-report.mjs http://localhost:4321/brand-visibility/r/grt-task-1328` — PASS, required markers present, no forbidden no-leak tokens, no horizontal overflow.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real: `complete` tras release productivo y smoke runtime.
- [x] el archivo vive en la carpeta correcta (`complete/`).
- [x] `docs/tasks/README.md` quedo sincronizado con el estado local.
- [x] `Handoff.md` quedo actualizado con cambios, evidencia, deuda y pendientes.
- [x] `changelog.md` quedo actualizado con el delta de comportamiento/code-complete.
- [x] se ejecuto chequeo de impacto cruzado sobre TASK-1324, TASK-1325, TASK-1268, TASK-1269 y TASK-1280 durante discovery/plan.
- [x] Snapshot recovery decision documented: `new-runs-only` by default; version bump or governed republish remains a future explicit task.
- [x] External `efeonce-think` deploy URL: production `https://think.efeoncepro.com/brand-visibility/r/grt-45361f263b724327a4d4b95dc8c04ab624c2946469514712bbdcfccef1364b86`.

## Follow-ups

- Possible `backend-data` follow-up: expose public-safe entity readiness axis (`knowledge_graph`, `wikidata`, `reddit_ugc`) without raw evidence.
- Possible `ui-ux` follow-up: reusable report evidence primitive if source/category blocks are reused by SEO/AEO reports.
- Possible client-only follow-up: safe representation accuracy summary for authenticated client/admin reports.
- Possible TASK-1269 follow-up: legal/copy review for public fix-it downloads.

## Open Questions

- Resolved 2026-07-03: existing snapshots are `new-runs-only` by default unless a governed republish/version bump is approved.
- Resolved 2026-07-03: entity readiness remains follow-up until a dedicated public-safe no-leak contract exists.
- Resolved 2026-07-03: source-domain evidence shows bounded top-N domain-only rows in V1.
