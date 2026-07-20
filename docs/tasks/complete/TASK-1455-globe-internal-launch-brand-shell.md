# TASK-1455 — Globe Internal Launch and Brand Shell

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1455-globe-internal-launch-brand-shell.md`
- Flow: `docs/ui/flows/TASK-1455-globe-internal-launch-brand-shell-flow.md`
- Motion: `docs/ui/motion/TASK-1455-globe-internal-launch-brand-shell-motion.md`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Complete; shell internal-only live y verificada en Cloud Run, sin Production`
- Rank: `1`
- Domain: `ui|identity|platform|agency`
- Blocked by: `none`
- Branch: `develop` (excepción confirmada por operador; sin push)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el callback técnico de Globe en una primera experiencia visible, premium e internal-only. Usa los SVG canónicos, ofrece una entrada clara desde/contra Greenhouse y presenta una superficie de sesión autenticada sin fingir que el Creative Studio funcional ya está construido.

## Why This Task Exists

TASK-1454 dejó Globe accesible pero devuelve JSON después del login y no tiene una raíz de producto ni identidad visual. Eso prueba infraestructura, no hace existir la plataforma para una persona. La solución debe ser una shell honesta y diferenciada, no una landing de marketing ni un dashboard genérico.

## Goal

- Crear una raíz branded y responsive con CTA de acceso interno.
- Redirigir el callback exitoso a una superficie de sesión local, preservando PKCE, cookie y revocación.
- Usar los SVG canónicos sin re-dibujar la marca y capturar desktop/mobile con GVC/Playwright.
- Mantener explícitos los límites: piloto interno, no Production, sin providers/runs/assets todavía.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Globe conserva runtime, sesión y assets propios; Greenhouse sólo emite identidad/acceso.
- La UI no amplía audiencia, IAM, scopes ni capabilities de TASK-1454.
- El estado funcional debe ser honesto: “piloto interno / foundation active”, no prometer generación que aún no existe.
- Los SVG canónicos se copian con proveniencia; no se altera geometría ni color de marca.
- Una acción primaria por estado; teclado, foco, contraste, reduced motion y 390 px son bloqueantes.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `docs/ui/visual-directions/TASK-1455-globe-internal-launch-direction.md`
- `docs/operations/creative-studio/TASK_1454_INTERNAL_SMOKE_RUNBOOK.md`

## Dependencies & Impact

### Depends on

- TASK-1454 complete: callback/session, `/auth/start`, `/v1/session`, revalidation and logout.
- Canonical assets under `public/branding/SVG/`.

### Blocks / Impacts

- First human-visible Globe pilot and later Greenhouse launch affordance.
- Future Studio workbench must extend this brand shell, not replace identity/session ad hoc.

### Files owned

- `../efeonce-globe/apps/studio-web/src/**`
- `../efeonce-globe/apps/studio-web/public/branding/**`
- `../efeonce-globe/apps/studio-web/Dockerfile`
- `../efeonce-globe/apps/studio-web/README.md`
- `../efeonce-globe/scripts/**` for UI smoke only
- `docs/ui/{visual-directions,wireframes,flows,motion,reviews}/TASK-1455*`
- `scripts/frontend/scenarios/globe-internal-launch*` only if cross-repo GVC can target the Cloud Run URL cleanly
- task/index/handoff/changelog closure files

## Current Repo State

### Already exists

- Globe Node 24 web runtime, secure cookie/session store, PKCE callback and live non-production Cloud Run service.
- Canonical full/negative/isotype SVG variants in Greenhouse.

### Gap

- No `/` or `/studio` HTML surface; successful callback returns JSON.
- No copied/traceable brand assets, visual state model, responsive shell or visual evidence.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web`
- Future candidate home: `portal`
- Boundary: `Globe web shell consumes only its local session API; Greenhouse identity remains behind OAuth broker routes`
- Server/browser split: `server owns OAuth/session/revalidation; browser receives semantic HTML/CSS, public SVGs and no access token`
- Build impact: `small static assets and server-rendered HTML; no UI framework dependency in this slice`
- Extraction blocker: `session cookie/callback routing and future Globe frontend architecture`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: colaborador interno Efeonce autorizado.
- Momento del flujo: entrada a Globe, retorno de OAuth y confirmación de sesión.
- Resultado perceptible esperado: una plataforma creativa diferenciada, rápida y seria ya existe, aunque su foundation funcional siga en construcción.
- Friccion que debe reducir: JSON técnico, incertidumbre sobre autenticación y pantalla genérica sin marca.
- No-goals UX: dashboard completo, catálogo de modelos, proyectos/runs, marketing público o onboarding de clientes.

### Surface & system decision

- Surface: Globe root + authenticated foundation screen.
- Composition Shell: `no importable` — Globe es un runtime hermano sin MUI/Greenhouse; se usa una composición one-off `focused` equivalente y no se acopla al portal.
- Primitive decision: `one-off` semántico sobre HTML nativo; no crear primitive Greenhouse paralela.
- Adaptive density / The Seam: `n/a` para una shell sin cards repetibles; responsive por container/media queries.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: copy local versionado en Globe; nomenclatura canónica “Efeonce Globe”, “piloto interno”, “Greenhouse”.
- Access impact: OAuth capability `globe.studio.access` existente; no cambia views/routeGroups de Greenhouse.

### State inventory

- Default: portada no autenticada con CTA “Entrar con Greenhouse”.
- Loading: pending visible al iniciar OAuth, sin doble submit.
- Authenticated: identidad mínima + estado foundation + acción de revalidar/cerrar sesión.
- Error: mensaje canónico, correlation ID copiable y acción de reintentar.
- Degraded / partial: sesión válida pero capacidad de Studio aún no materializada, mostrado como foundation activa.
- Permission denied: acceso interno no autorizado, sin revelar policy.
- Long content: nombre/email truncados con title; correlation wrap.
- Mobile / compact: arte orbital recortado, CTA full-width, identidad reordenada.
- Keyboard / focus: skip link, foco visible, orden logo→headline→CTA→estado.
- Reduced motion: composición final inmediata, sin pérdida de información.

### Interaction contract

- Primary interaction: iniciar OAuth o entrar a la foundation cuando ya existe sesión.
- Hover / focus / active: affordance visible y contraste AA.
- Pending / disabled: CTA mantiene geometría y comunica “Conectando…”.
- Escape / click-away: n/a.
- Focus restore: callback aterriza en el heading autenticado.
- Latency feedback: navegación inmediata con pending local; no optimistic auth.
- Toast / alert behavior: errores inline; no toast efímero.

### Motion & microinteractions

- Motion primitive: CSS transform/opacity tokenizado localmente.
- Enter / exit: logo/eyebrow/headline/CTA revelan en secuencia corta sin retrasar interacción.
- Layout morph: none.
- Stagger: 40–60 ms entre regiones, máximo 360 ms total.
- Timing / easing token: variables CSS locales documentadas, no valores dispersos.
- Reduced-motion fallback: sin transición.
- Non-goal motion: órbita infinita, parallax, partículas o glow pulsante.

### Implementation mapping

- Route / surface: `GET /`, `GET /studio`, `GET /auth/callback`, existing session/logout APIs.
- Primitive / variant / kind: native `main`, branded art stage, status rail and one primary anchor/button.
- Component candidates: pure render helpers in `apps/studio-web/src/ui.ts`; request routing remains in `app.ts`.
- Copy source: `apps/studio-web/src/ui-copy.ts` or colocated immutable constants.
- Data reader / command: existing in-memory session store and `/v1/session` revalidation path.
- API parity: preserved; `/v1/session` remains the machine-readable session contract.
- Access / capability: existing `globe.studio.access`, tenant `efeonce_internal`, roles empty.
- States to implement: unauthenticated, pending, authenticated foundation, denied/error, revoked, reduced-motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/globe-internal-launch.scenario.ts`; GVC targets the live Cloud Run URL through the local-environment base URL override.
- Route: live Cloud Run `/` and authenticated `/studio` through canonical agent session.
- Viewports: `1440x1000` and `390x844`.
- Quality profile: `premium` equivalent, reviewed by enterprise rubric.
- Required steps: anonymous root, focus CTA, OAuth return, authenticated root, logout/revoked state.
- Required captures: first fold and authenticated fold desktop/mobile.
- Required `data-capture` markers: `globe-launch`, `globe-brand-stage`, `globe-primary-action`, `globe-session-status`.
- Assertions: one primary, no raw error/token, logo visible, authenticated identity minimal, 403/401 safe.
- Scroll-width checks: `scrollWidth <= clientWidth` in both viewports.
- Reduced-motion / focus evidence: emulate reduced motion and keyboard tab sequence.

### Design decision log

- Decision: `Orbital Threshold`, an immersive navy threshold with oversized canonical Globe mark and an operational status rail.
- Alternatives considered: light Studio Console; editorial Gallery Field.
- Why this pattern: creates a memorable product arrival while remaining honest and minimal.
- Reuse / extend / new primitive: reuse canonical brand assets and native web semantics; one-off shell in Globe.
- Open risks: SVG full lockup contains live Poppins text; prefer negative/full asset as supplied and verify actual browser rendering before acceptance.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Source of truth: existing in-memory internal-smoke session store and Greenhouse OAuth broker; no new schema or persistence.
- Contract surface: callback success changes from JSON `200` to same-origin `303 /studio`; `/v1/session` remains unchanged for API parity.
- Invariants: access token remains server-side; cookie remains Secure/HttpOnly/SameSite=Lax; tenant/capability/role checks are unchanged.
- Migration/backfill: none.
- Error contract: existing canonical codes are rendered through an allowlisted UI mapping, never raw upstream bodies.
- Rollback: restore callback JSON response and prior Cloud Run revision.
- Evidence: focal tests, leak assertions, live internal allow/deny/revocation smoke and browser capture.

## Hybrid Execution Justification

- Why not split: the only backend delta is changing a successful callback response into a same-origin redirect while preserving the existing machine API; splitting would not reduce risk.
- Primary execution profile: `ui-ux`.
- Contract boundary: OAuth/session primitives remain unchanged; UI reads the local session only.
- Risk controls: focal callback tests, no token in HTML/client JS, rollback to JSON response, live allow/deny/revocation smoke.

<!-- ZONE 2 — plan approved by operator direction to proceed after TASK-1454 -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Brand source and first fold

- Copy canonical SVG variants with provenance and implement anonymous root.
- Capture desktop/mobile first fold before exhaustive states.

### Slice 2 — Authenticated foundation

- Redirect successful callback to `/studio`, render local session safely and preserve `/v1/session` API.
- Implement denied/revoked/logout states with no raw errors.

### Slice 3 — Evidence and rollout

- Tests, build, browser capture, overflow/a11y/reduced-motion review and Cloud Run internal redeploy.
- Update docs and keep Production/external access absent.

## Out of Scope

- Greenhouse navigation CTA, projects, runs, models, providers, storage, client access and Production.
- New frontend framework/design-system package; revisit when the Studio workbench is specified.

## Detailed Spec

The shell is server-rendered, progressively enhanced only for CTA pending feedback, and CSP-friendly. Browser HTML never embeds OAuth access tokens, bypass secrets or raw upstream bodies. Authenticated display is limited to name/email, internal status and correlation ID. The mark is dominant; content remains concise and operational.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Direction/contracts → first fold → callback redirect/session surface → visual/security smoke → internal redeploy.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Callback rompe SSO | identity | medium | preserve token/session code + focal/live smoke | callback non-303 or session 401 |
| Token/PII entra al HTML | security | low | allowlisted projection + leak tests | secret-like body finding |
| Marca pierde fidelidad | UI | medium | canonical SVG + capture | wrong font/color/crop |
| Mobile overflow | UI | medium | 390 px DOM measurement | scrollWidth > clientWidth |
| Piloto parece producto completo | product | medium | explicit foundation copy | misleading capability claim |

### Feature flags / cutover

Sin flag nuevo: servicio completo sigue limitado a `internal_smoke`, client OAuth internal-only y Cloud Run no productivo. Rollback de UI = redeploy de la revisión TASK-1454.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | remove static shell/assets | <15 min | sí |
| 2 | restore JSON callback response | <15 min | sí |
| 3 | route traffic to prior Cloud Run revision | <5 min | sí |

### Production verification sequence

No Production. Local tests/build → first-fold capture → authenticated/denied/revoked smoke → deploy internal revision → repeat live capture/smoke.

### Out-of-band coordination required

Cloud Run non-production redeploy already authorized under the internal Globe provisioning plan. No push or Production.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Canonical Globe logo/isotype renders faithfully with recorded provenance.
- [x] Anonymous and authenticated folds are premium, responsive and honest about foundation status.
- [x] Callback redirects without weakening PKCE, cookie, tenant or capability controls.
- [x] HTML/client bundle contains no access token, OAuth secret, bypass secret or raw provider error.
- [x] Desktop/mobile, keyboard, reduced-motion and DOM overflow evidence pass.
- [x] Client tenant, revoked session and anonymous API denial remain green.
- [x] Internal Cloud Run revision is live; Production/external access remains absent.
- [x] Task/UI/QA/docs gates pass with evidence paths.

## Verification

- `pnpm task:lint --task TASK-1455`
- `pnpm ui:wireframe-check --task TASK-1455`
- `pnpm ui:flow-check --task TASK-1455`
- `pnpm ui:motion-check --task TASK-1455`
- `pnpm ui:readiness-check --task TASK-1455`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- browser capture desktop/mobile + scroll-width + keyboard/reduced-motion
- internal allow/deny/revocation smoke after deploy
- `pnpm qa:gates --changed --agent codex --task TASK-1455 --runtime --auth --security --docs`
- `pnpm docs:closure-check`

Evidence:

- Cloud Run `globe-studio-internal-00006-445`, build `fd79b83e-eafc-4fb1-93c9-ddf6309c4c17`, image digest `sha256:7b213f7dcab49e96f1c4340dc4a188ae3fcfbf34c52880fda849444b248c8f4a`.
- GVC `.captures/2026-07-19T11-33-05_globe-internal-launch`: premium `PASS`, 1440×1000 + 390×844, enterprise rubric `pass`.
- Durable baselines: `scripts/frontend/baselines/globe.internal-launch/`.
- Review and scorecard: `docs/ui/reviews/TASK-1455-globe-internal-launch.{review.md,scorecard.json}`; average `4.73`, floor `4.5`.
- Globe checks: `pnpm check && pnpm build`; studio tests include successful callback/session, tenant denial, revocation and expired HTML leak guard.

## Closing Protocol

- [x] First fold explicitly accepted after visual inspection.
- [x] GVC/browser dossier and scorecard saved.
- [x] QA auditor and documentation governor invoked.
- [x] Lifecycle/folder/index/registry/handoff/changelog synchronized.

## Follow-ups

- Separate Greenhouse launch affordance/nav task after this shell is visually accepted.
- Choose the long-term Globe frontend stack before the first real Studio workbench.

## Open Questions

- No blocker for first fold; long-term UI framework remains deliberately deferred.
