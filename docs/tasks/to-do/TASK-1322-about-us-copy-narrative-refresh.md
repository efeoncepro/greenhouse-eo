# TASK-1322 — About Us Copy Narrative Refresh

## Delta 2026-07-08 — superseded por TASK-1369

Esta task era un **refresh de copy ligero** que mantenía el hero actual y no rediseñaba la página. Esa premisa quedó **obsoleta**: [PDR-010](../../public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md) movió el pitch a la Home y definió el About Us como página de **identidad**, y [PDR-011](../../public-site/decisions/PDR-011-about-us-identidad-golden-circle.md) lo reconstruye como **Golden Circle (Why→How→What)** liderando el **Why de marca** recién articulado (SSOT `docs/context/09_marca-agencia.md`) — lo que **cambia el hero** ("No te entregamos crecimiento. Lo construimos contigo."), no lo mantiene. El trabajo del About Us vive ahora en **[`TASK-1369`](TASK-1369-about-us-identidad.md)** (que absorbe el scope de copy de esta task). **Recomendación: cerrar esta task como superseded** (no ejecutar en paralelo — mismo archivo `/about-us-efeonce/`).

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
- UI impact: `copy`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1322-about-us-copy-narrative-refresh.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `none`
- Branch: `task/TASK-1322-about-us-copy-narrative-refresh`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Refresca la narrativa completa de la landing pública About `/about-us-efeonce/` para reducir densidad y repetición sin cambiar la tesis ni rediseñar la página. La tarea mantiene el hero actual, el video como única acción del primer fold y el proof `+90`; reescribe el resto de secciones para que cada una cumpla un rol narrativo distinto: creencia, modelo, método, prueba, experiencia, fundador, infraestructura y CTA final.

## Why This Task Exists

La auditoría de copywriting del 2026-07-03 confirmó que la página no es excesivamente larga por volumen, pero sí se siente densa porque repite el mismo mecanismo con variaciones: sistema, integración, visibilidad, datos y gobernanza. La gran idea es correcta (`Efeonce no vende piezas sueltas; opera un sistema de crecimiento`), pero la progresión editorial puede ser más clara y más propia de la voz Efeonce: concisa, con filo, específica y sin sobreexplicar.

## Goal

- Reducir repetición conceptual y cortar entre 15% y 25% del copy explicativo sin perder sustancia ni SEO crítico.
- Mantener el hero como está: `Ver cómo operamos` es la única acción del hero; `Agenda una conversación` vive solo en el CTA final.
- Reescribir las secciones densas (`Qué hacemos`, `Cómo trabajamos`, `No es lo que hacemos`, `Fundador`, `Infraestructura`) para que cada una tenga un rol narrativo diferente.
- Corregir microcopy/typos visibles (`Un ecosistema ,`, `MÉTRICAS`, `Suscríbete`, acentos y tuteo es-CL).
- Mutar WordPress/Elementor con backups, proteger metas de hero, purgar Kinsta y verificar About desktop/mobile + AEO `whylogo` sin regresión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md`
- `.codex/skills/efeonce-public-site-wordpress/references/elementor-mutation.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

Reglas obligatorias:

- Mutar Elementor con `Document::save()` y backup de `_elementor_data` / `_elementor_page_settings` antes de guardar.
- Proteger metas de hero: `_thumbnail_id=249769`, `page_header_title_background_type=featured`, `page_header_title_background_image=""`.
- No reintroducir el CTA de agenda en el hero; el hero mantiene solo `Ver cómo operamos`.
- No cambiar el proof count `+90`, no tocar AEO `/aeo-2/` salvo verificación de no-regresión en el bloque real `whylogo`.
- No aplicar CSS global ni romper el margen/fixes de About ya page-scoped en `global-fixes.css`.
- Si la implementación necesita CSS, scopearlo bajo `body.page-id-249770`; no tocar clases base de AEO.

## Normative Docs

- `docs/ui/wireframes/TASK-1322-about-us-copy-narrative-refresh.md`
- `changelog.md`
- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- Live WordPress page `page_id=249770`, URL `https://efeoncepro.com/about-us-efeonce/`.
- Existing public-site runtime repo `/Users/jreye/Documents/efeonce-public-site-runtime`.
- Existing About hero proof replacement and CTA simplification already live.

### Blocks / Impacts

- Impacts public About narrative and SEO/body text.
- Impacts skill references for future public-site agents.
- Does not block backend, Growth Forms, AEO Grader, or private Greenhouse UI work.

### Files owned

- `.codex/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md`
- `.claude/skills/efeonce-public-site-wordpress/references/landings/about-us-efeonce.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/architecture/public-site/PRIMITIVES.md` only if primitive guidance changes
- `Handoff.md`
- `changelog.md`
- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/themes/ohio-child/assets/css/global-fixes.css` only if copy edits reveal small page-scoped spacing fixes

## Current Repo State

### Already exists

- About landing documented in Codex/Claude public-site skill refs.
- Hero root `6e46dcc`, video widget `e18428a`, subhead `70afd83`, proof root `abproof`.
- Former hero agenda CTA `a452380` was removed live; backup key `_gh_backup_before_about_hero_remove_agenda_cta_20260703T052019Z`.
- About proof strip reuses `greenhouse_logo_marquee` + `BrandProofAvatarGroup` and has dark-context page-scoped CSS.
- Copy audit extraction/captures exist at `.captures/about-copy-audit-2026-07-03T05-48-09-186Z/`.

### Gap

- Several sections repeat the same system/integration/data argument instead of progressing the story.
- `Qué hacemos` cards are feature-heavy and hard to scan.
- `Infraestructura` can read like a list of tools rather than proof of friction removal.
- Founder section reads closer to a corporate bio than a founder thesis.
- Microcopy typos and accents remain visible.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: public website visitor evaluating Efeonce as an agency/growth partner.
- Momento del flujo: reading About after seeing services, AEO, proof, or a referral.
- Resultado perceptible esperado: the visitor understands Efeonce as an integrated growth operating system, not a collection of service lines.
- Friccion que debe reducir: cognitive fatigue from repeated explanations and long card paragraphs.
- No-goals UX: no redesign, no new form, no new animation, no new primitive, no new proof number, no AEO visual changes.

### Surface & system decision

- Surface: public WordPress About landing `/about-us-efeonce/`, `page_id=249770`.
- Composition Shell: `no aplica` — WordPress/Ohio/Elementor public page, not private Greenhouse app.
- Primitive decision: `reuse` — existing Elementor sections and public-site patterns; no new primitive.
- Adaptive density / The Seam: `no aplica` — no private app cards; existing responsive Elementor layout remains.
- Floating/Sidecar/Dialog decision: none.
- Copy source: `local one-off` in Elementor, governed operationally by public-site skill refs and this wireframe.
- Access impact: `none` — public page.

### State inventory

- Default: refreshed copy live.
- Loading: static WordPress page; no app loading state.
- Empty: N/A.
- Error: Elementor save or cache deployment failure; restore from backup.
- Degraded / partial: Kinsta stale cache or only some text widgets saved; verify via cache-buster and backup.
- Permission denied: N/A for public viewer; WP mutation requires authenticated WP CLI/admin.
- Long content: reduce density and verify no new visual overflow.
- Mobile / compact: verify 390px copy wraps cleanly and does not increase existing mobile overflow.
- Keyboard / focus: preserve video CTA/final CTA/FAQ keyboard behavior.
- Reduced motion: no new motion.

### Interaction contract

- Primary interaction: read/scan page, play video, open FAQ, use final scheduling form.
- Hover / focus / active: existing behavior only.
- Pending / disabled: N/A.
- Escape / click-away: N/A.
- Focus restore: N/A.
- Latency feedback: operational only, cache purge + verification.
- Toast / alert behavior: N/A.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: existing page behavior only.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: N/A.
- Reduced-motion fallback: no new motion introduced.
- Non-goal motion: no parallax, no new animated counters, no decorative effects.

### Implementation mapping

- Route / surface: `https://efeoncepro.com/about-us-efeonce/`, WordPress `page_id=249770`.
- Primitive / variant / kind: existing Elementor/Ohio sections; About dark proof skin remains page-scoped.
- Component candidates: no new component.
- Copy source: copy ledger in `docs/ui/wireframes/TASK-1322-about-us-copy-narrative-refresh.md`.
- Data reader / command: none.
- API parity: N/A; editorial public content, no business action.
- Access / capability: authenticated WP mutation only; public viewer unchanged.
- States to implement: default live state; operational rollback/degraded states.

### GVC scenario plan

- Scenario file: create `scripts/frontend/scenarios/public-about-copy-refresh.scenario.ts` if promoting to canonical GVC; Playwright evidence is acceptable only if documented and repeated desktop/mobile.
- Route: `/about-us-efeonce/`.
- Viewports: desktop 1440x1100, mobile 390x950.
- Required steps: load with cache-buster, capture scroll slices, verify hero/final CTA, verify AEO `whylogo`.
- Required captures: hero, why, capabilities, loop, proof, operating, experience, founder, infrastructure, FAQ/final CTA, AEO `whylogo`.
- Required `data-capture` markers: preferred markers listed in the wireframe; fallback to Elementor IDs/classes.
- Assertions: no hero agenda CTA; final CTA exists; `+90` unchanged; AEO `whylogo` unchanged; no worsened page overflow.
- Scroll-width checks: desktop + mobile 390px.
- Reduced-motion / focus evidence: no new motion; video CTA and FAQ remain focusable.

### Design decision log

- Decision: refresh copy in place, no redesign.
- Alternatives considered: full redesign, adding more proof, moving scheduling CTA back to hero.
- Why this pattern: the problem is repetition/density; the current visual structure can carry the story after copy reduction.
- Reuse / extend / new primitive: reuse existing public-site sections/patterns; no new primitive.
- Open risks: duplicate Elementor widgets, SEO loss if FAQ/body copy is over-cut, stale Kinsta cache, encoding of Spanish accents.

### Visual verification

- GVC scenario: `public-about-copy-refresh` or equivalent Playwright capture.
- Viewports: desktop 1440x1100 and mobile 390x950.
- Required captures: listed in wireframe.
- Required `data-capture` markers: preferred but not mandatory if Elementor IDs are stable.
- Scroll-width check: compare before/after; do not worsen existing mobile residual overflow.
- Accessibility/focus checks: heading order, video CTA focus, FAQ keyboard behavior.
- Before/after evidence: before audit `.captures/about-copy-audit-2026-07-03T05-48-09-186Z/`; after capture to be created by implementer.
- Known visual debt: current About has some mobile residual overflow unrelated to this copy task; do not expand scope unless copy changes worsen it.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Elementor discovery and backup

- Inspect `_elementor_data` for `/about-us-efeonce/` and map the text widgets/sections that correspond to the wireframe ledger.
- Identify duplicated desktop/mobile text widgets before editing.
- Create a backup meta containing `_elementor_data`, `_elementor_page_settings`, and protected hero metas.
- Confirm current hero state: no `a452380` hero agenda CTA, `e18428a` video CTA present, `abproof` proof present.

### Slice 2 — Copy refresh in Elementor

- Apply the copy ledger from the wireframe section-by-section via Elementor `Document::save()`.
- Preserve existing HTML structure and emphasis where possible; do not introduce raw layout wrappers unless necessary.
- Correct visible typos and Spanish accents.
- Preserve final scheduling CTA section and FAQ accordion.
- Do not change proof numbers, case metrics, markets, or form behavior.

### Slice 3 — Minimal page-scoped polish if needed

- Only if copy reduction creates awkward spacing, adjust page-scoped CSS under `body.page-id-249770`.
- Do not touch base AEO classes or global Ohio selectors.
- Upload CSS to Kinsta with remote backup and purge cache.

### Slice 4 — Live verification and docs sync

- Purge Kinsta.
- Verify About desktop/mobile with cache-buster.
- Verify AEO `/aeo-2/` real `whylogo` block desktop/mobile.
- Update landing skill refs, public-site layout doc, handoff, changelog, and project context if the durable contract changes.

## Out of Scope

- New visual design, new section order, new imagery, new animations, new primitives.
- Changing AEO `/aeo-2/` or the base `BrandProofAvatarGroup`.
- Changing Growth Forms, HubSpot destination, or final contact form behavior.
- Changing proof metrics (`+90`, case percentages) unless separately verified and requested.
- Fixing unrelated mobile overflow unless this task worsens it.

## Detailed Spec

Use `docs/ui/wireframes/TASK-1322-about-us-copy-narrative-refresh.md` as the source for section-level copy, narrative order, copy ledger, implementation mapping and GVC plan.

Implementation must keep the current high-level page structure:

1. Hero stays as currently approved.
2. `Por qué existimos` sharpens the belief.
3. `Qué hacemos` becomes four connected capabilities, less feature dumping.
4. Loop Marketing explains the operating cycle.
5. Cases show context -> mechanism -> result.
6. Industries stays light.
7. Operating principles become compact.
8. Client experience stays as a key About differentiator.
9. Founder becomes origin/thesis.
10. Infrastructure proves friction removal.
11. FAQ answers objections without duplicating entire page.
12. Final CTA remains the scheduling moment.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (discovery/backup) MUST complete before Slice 2.
- Slice 2 (copy mutation) MUST complete before Slice 3.
- Slice 3 (CSS polish) is optional and only allowed after live visual inspection.
- Slice 4 (verification/docs) closes the task; do not declare complete before live About + AEO verification.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Elementor save drops hero featured image meta | public-site WordPress | medium | preserve protected metas after `Document::save()` | hero background disappears in capture |
| Duplicate responsive widgets keep old copy visible | public-site Elementor | medium | inspect all matching text widgets and grep live DOM after save | old phrases still in `document.body.innerText` |
| SEO/body value reduced too aggressively | public-site content | medium | keep FAQ and proof content; cut repetition, not substance | FAQ loses key answers or search terms |
| AEO proof receives About CSS by accident | public-site AEO | low | all CSS page-scoped to `page-id-249770`; verify `whylogo` | AEO marquee hidden or pill dimensions changed |
| Kinsta stale cache masks result | public-site ops | medium | purge cache and verify with cache-buster | old copy visible after mutation |

### Feature flags / cutover

Sin flag — public-site editorial copy change, immediate cutover after Elementor save and Kinsta purge. Rollback is backup-based via stored Elementor meta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No mutation beyond backup; delete temp scripts if needed | <5 min | si |
| Slice 2 | Restore `_elementor_data` and `_elementor_page_settings` from backup meta, then purge Kinsta | 10-20 min | si |
| Slice 3 | Restore remote CSS backup and purge Kinsta | 5-10 min | si |
| Slice 4 | Docs-only revert if evidence wording is wrong | <5 min | si |

### Production verification sequence

1. Load `https://efeoncepro.com/about-us-efeonce/?cb=<timestamp>`.
2. Assert no hero agenda CTA and video CTA visible.
3. Assert expected new copy appears in major sections.
4. Capture desktop and mobile.
5. Check `scrollWidth - clientWidth` desktop and mobile.
6. Load `https://efeoncepro.com/aeo-2/?cb=<timestamp>`, scroll to real `.elementor-element-whylogo.gh-aeo-why-logo-marquee-wrap`.
7. Assert AEO `marquee.display=block`, pill text `+90–Chile · Colombia · México · Perú`, page overflow unchanged.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux`, `UI impact: copy`, `UI ready: yes`, and existing wireframe path are declared.
- [ ] `pnpm task:lint --task TASK-1322` passes with `errors=0`.
- [ ] `pnpm ui:wireframe-check --task TASK-1322` passes.
- [ ] Elementor data was backed up before mutation and backup key is recorded in `Handoff.md`.
- [ ] Protected hero metas remain `_thumbnail_id=249769`, `page_header_title_background_type=featured`, `page_header_title_background_image=""`.
- [ ] Hero still has video CTA `Ver cómo operamos` and does not contain hero `Agenda una conversación`.
- [ ] Final CTA section still contains `Agenda una conversación`.
- [ ] Major copy sections match the wireframe ledger or explicitly document a final approved deviation.
- [ ] No proof number was changed (`+90` remains in About/AEO proof).
- [ ] AEO `/aeo-2/` real `whylogo` block is verified desktop/mobile with marquee visible and pill unchanged.
- [ ] Desktop and mobile captures are saved under `.captures/`.
- [ ] Page-level horizontal scroll is checked desktop and mobile 390px; any residual overflow is documented and not worsened by this task.
- [ ] Kinsta cache is purged after live mutation.
- [ ] `Handoff.md`, `changelog.md`, and public-site skill refs are updated with the final live state and rollback references.

## verification

Minimum:

```bash
pnpm task:lint --task TASK-1322
pnpm ui:wireframe-check --task TASK-1322
git -C /Users/jreye/Documents/greenhouse-eo diff --check
git -C /Users/jreye/Documents/efeonce-public-site-runtime diff --check
```

Live verification:

```bash
pnpm public-website:wpcli -- --eval-file <script> --wp-user 12
# then Playwright/GVC capture for About + AEO whylogo
```

## closing protocol

- [ ] Move task to `docs/tasks/complete/` only after live verification and docs sync.
- [ ] Update `docs/tasks/README.md` lifecycle row.
- [ ] Update `docs/tasks/TASK_ID_REGISTRY.md` lifecycle row if completed.
- [ ] Remove temp mutation scripts.
- [ ] Record final CSS hash if any runtime CSS changed.
- [ ] Do not stage/commit unless operator asks.
