# TASK-1725 — Talent Pool Desk and Governed Invitation Experience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1725-talent-pool-desk.md`
- Flow: `docs/ui/flows/TASK-1725-talent-pool-desk-flow.md`
- Motion: `docs/ui/motion/TASK-1725-talent-pool-desk-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Complete y operativa en producción; Desk read-only e invitación gobernada ON desde 2026-08-16 por autorización CEO; contacto sigue consent-gated`
- Rank: `TBD`
- Domain: `hr|ui|agency`
- Blocked by: `none`
- Dependency resolution: `TASK-1723` está cerrada y operativa; su contrato consumidor (search/profile/invite, API y
  capabilities) está implementado y verificado en producción.
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el workspace interno `/agency/hiring/talent-pool`: búsqueda estructurada, resultados person-first, evidence
coverage/freshness, perfil y propuesta de invitación a una opening. La UI consume TASK-1723 y no implementa ranking,
contactability, dedupe ni creación de aplicaciones en componentes.

## Execution Evidence — 2026-08-16

- Workspace `/agency/hiring/talent-pool` integrado una sola vez a Hiring Desk con search/filter/cursor restaurables,
  ficha lateral person-first, coverage/freshness, disponibilidad y deep links por application ID exacto.
- La UI consume Product API y commands TASK-1723; no muestra contacto, notas, economics, fit score ni atributos
  protegidos, y separa propuesta de confirmación para invitaciones.
- GVC premium del Desk con visor exacto pasó desktop/mobile, teclado y reduced motion en el harness sintético
  production-disabled `.captures/2026-08-16T12-22-58_hiring-talent-pool-desk`: siete frames, sin PII real, overflow,
  errores de consola/hydration/red ni findings axe.
- Search/projection/MCP están activos en producción; invite/self-service están habilitados detrás de flags independientes.
  La invitación sigue siendo proposal→confirm, idempotente y consent-gated; no mueve etapas, asigna tests ni envía
  correo por sí sola.
  El acceso directo al CV desde el sidecar está disponible en producción mediante el reader exacto
  `applicationId → assetId`; el reader agent-safe de CV de `TASK-1718` continúa OFF y es independiente.

## Why This Task Exists

Hiring Desk está orientado a una opening/pipeline. Para reutilizar talento evaluado, People necesita partir desde una
capability o disponibilidad, comparar evidencia y volver a una aplicación exacta sin abrir vacante por vacante. Un
Kanban o galería de perfiles duplicaría el pipeline y ocultaría coverage; el patrón correcto es un workbench de
evidencia con acción permitida visible.

## Goal

- Permitir búsqueda/filtros restaurables por evidencia, rol, seniority, idioma, país autodeclarado y disponibilidad.
- Mostrar un perfil único con razones, lineage, coverage, freshness, aplicaciones y allowedActions sin contacto; el CV sólo aparece en el visor privado exacto por postulación.
- Proponer y confirmar invitación a una opening mediante el command canónico, con duplicate/conflict/readback honestos.
- Entregar experiencia premium accesible desktop/390px, sin card soup, fit score ni otro pipeline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- La unidad visual es una persona; cada evidencia/acción conserva aplicación/opening exacta.
- Search/profile/allowedActions vienen de TASK-1723. La UI no puntúa, infiere, contacta ni muta estado directamente.
- No mostrar email, teléfono, domicilio, expectativa económica, notas libres, answer keys ni atributos protegidos. El CV se abre sólo en el visor privado gobernado.
- `unknown`, partial y stale permanecen visibles; no se traducen a bajo fit.
- Invite empieza como proposal y sólo confirma mediante dialog/authority; click-away, drag o row click nunca escriben.
- El destino se ubica una sola vez dentro de la zona Hiring del sidebar; no consume un slot top-level nuevo.

## Normative Docs

- `DESIGN.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/visual-directions/TASK-1725-talent-pool-desk.md`
- `docs/ui/wireframes/TASK-1725-talent-pool-desk.md`
- `docs/ui/flows/TASK-1725-talent-pool-desk-flow.md`
- `docs/ui/motion/TASK-1725-talent-pool-desk-motion.md`
- `docs/ui/wireframes/TASK-355-hiring-desk.md`
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/tasks/complete/TASK-1715-application-360-documents-panel.md`

## Dependencies & Impact

### Depends on

- `TASK-1723` search/profile/invite DTOs, capabilities, canonical errors and receipts.
- Hiring shell/navigation, Application 360 route and existing internal role/view/capability gates.
- `TASK-1718` aporta el reader documental exacto reutilizado por el sidecar; la UI humana abre el CV directamente y conserva Application 360 como contexto adicional.

### Blocks / Impacts

- Da operación humana/paridad visual al mismo banco que TASK-1726 consulta por MCP.
- Invite puede crear/reusar application; TASK-1719 decide después si la stage/opening asigna assessment.
- No cambia pipeline, decision, handoff, activation ni Talent Assurance.

### Files owned

- `src/app/(dashboard)/agency/hiring/talent-pool/**` *(nuevo)*
- view/components route-local bajo `src/views/greenhouse/agency/hiring/` *(path final tras reuse-check)*
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringTalentPool.ts` *(nuevo o namespace equivalente)*
- navegación/reachability/view registry/grants sólo para hacer la route alcanzable con sus gates
- escenario GVC, documentación funcional y manual People aplicables

## Current Repo State

### Already exists

- Hiring Desk ofrece Demand, Pipeline, Application 360 y Publication con shell/rutas canónicas.
- Application 360 ya muestra assessments y documentos a operadores autorizados.
- Surface recipes, WorkbenchHeader, operational table/list, disclosure, AdaptiveSidecar y Dialog están disponibles.

### Gap

- No existe route global de búsqueda person-first ni perfil agregado del banco.
- No existe navegación/estado visual para contactability, evidence coverage/freshness o invite proposal.
- People sólo puede recorrer aplicaciones por opening/pipeline.
- Backend impact rationale: `none`; toda lógica/data/API nace en TASK-1723 y esta task es consumer UI puro.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `portal interno Next.js, zona Agency/Hiring y primitives Greenhouse existentes`
- Future candidate home: `portal`
- Boundary: `search/profile/invite contracts TASK-1723; Server Components leen y Client Components reciben DTO/callbacks`
- Server/browser split: `browser recibe DTO minimizado; stores, DB, PII, contactability, idempotency y authority permanecen server-only`
- Build impact: `none; reusa MUI/AXIS y primitives instaladas`
- Extraction blocker: `sesión, view/capability gate, Hiring shell y routes Application 360 permanecen en el portal`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `People/recruiter interno autorizado`
- Momento del flujo: `sourcing/reutilización antes de iniciar o durante una opening`
- Resultado perceptible esperado: `encuentra talento, entiende por qué aparece y sabe qué acción puede ejecutar`
- Friccion que debe reducir: `recorrer cada pipeline, comparar sin freshness y perder contexto al abrir perfiles`
- No-goals UX: `pipeline duplicado, fit leaderboard, contact CRM, sourcing externo o decision automática`

### Surface & system decision

- Surface: `/agency/hiring/talent-pool`
- Nav placement: `sidebar` — un sibling dentro de la zona Hiring; no top-level ni duplicado en avatar/shortcuts
- Composition Shell: `aplica` — `SurfaceRecipe kind='listDetail'` con header fuera del primary plane
- Primitive decision: `reuse` — WorkbenchHeader, operational list/table, disclosure, AdaptiveSidecar, Chip, Dialog
- Adaptive density / The Seam: `aplica` — rows/detail transforman a mobile sin clip ni tabla horizontal
- Floating/Sidecar/Dialog decision: `AdaptiveSidecar desktop; full-width detail mobile; Dialog sólo confirm invite`
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringTalentPool.ts`
- Access impact: `views` — route interna + `hiring.talent_pool.read/invite`, seeded/granted por TASK-1723

### State inventory

- Default: `search ready con filters/results/freshness`
- Loading: `header/filters estables + skeleton rows`
- Empty: `sin perfiles para filtros; clear filters`
- Error: `retry preservando query/cursor`
- Degraded / partial: `coverage/stale labels y source refs disponibles`
- Permission denied: `sin count/result/existence`
- Long content: `reasons/source labels wrap; no notas/CV`
- Mobile / compact: `compact rows → full-width detail → back restore`
- Keyboard / focus: `filter disclosure, row selection, sidecar/dialog focus and restore`
- Reduced motion: `mismo selection/detail/receipt sin interpolación`

### Interaction contract

- Primary interaction: `search/filter → inspect → open application o propose invite`
- Hover / focus / active: `selected/focus differentiated without color-only status`
- Pending / disabled: `invite pending; disabled reason visible from allowedActions`
- Escape / click-away: `closes sidecar/dialog; never confirms`
- Focus restore: `selected row after sidecar/dialog; list row after mobile Back`
- Latency feedback: `skeleton/inline pending, authoritative receipt`
- Toast / alert behavior: `inline canonical error; toast only supplementary`

### Motion & microinteractions

- Motion primitive: `Motion|CSS` through existing sidecar/dialog/disclosure primitives
- Enter / exit: `detail and dialog causal transition`
- Layout morph: `mobile list/detail continuity only through existing wrapper`
- Stagger: `none; results never animate as ranking`
- Timing / easing token: `existing UI tokens`
- Reduced-motion fallback: `immediate state with same focus/meaning`
- Non-goal motion: `animated ranking, swipe cards or decorative profiles`

### Implementation mapping

- Route / surface: `src/app/(dashboard)/agency/hiring/talent-pool/**`
- Primitive / variant / kind: `SurfaceRecipe listDetail, WorkbenchHeader workbench, AdaptiveSidecar, Dialog`
- Component candidates: `TalentPoolFilters, TalentPoolResults, TalentPoolProfile, InviteProposalDialog`
- Copy source: `hiringTalentPool bilingual dictionaries`
- Data reader / command: `TASK-1723 searchTalentPool/getTalentPoolProfile/inviteTalentToOpening`
- API parity: `UI is thin consumer; same primitive serves Nexa/App/MCP`
- Access / capability: `internal route/view + hiring.talent_pool.read/invite`
- States to implement: `ready/loading/empty/partial/stale/error/denied/detail/proposal/conflict/receipt/mobile`

### GVC scenario plan

- Scenario file: `scripts/frontend-capture/scenarios/hiring-talent-pool-desk.*`
- Route: `/agency/hiring/talent-pool`
- Viewports: `1440x1000 y 390x844`
- Quality profile: `premium`
- Required steps: `search/filter/select/evidence/propose/conflict/confirm/mobile back`
- Required captures: `ready, empty, partial/stale, detail, dialog, denied, mobile detail`
- Required `data-capture` markers: `talent-pool-header|filters|results|profile|evidence|invite-dialog`
- Assertions: `no PII/CV, reasons/freshness, focus restore, query persistence, axe/console clean`
- Scroll-width checks: `scrollWidth <= clientWidth en desktop y 390`
- Reduced-motion / focus evidence: `sidecar/dialog/mobile back mandatory`
- Review dossier: `docs/ui/reviews/TASK-1725-talent-pool-desk/`
- Baseline decision / surface ID: `new hiring-talent-pool-desk after Apto; Hiring Desk baseline unchanged`

### Design decision log

- Decision: `evidence workbench with list-detail composition`
- Alternatives considered: `card gallery; Talent Kanban`
- Why this pattern: `supports comparison/coverage without photo bias or pipeline duplication`
- Reuse / extend / new primitive: `reuse all; route-local composition`
- Open risks: `partial data must remain actionable without fit inference`

### Visual verification

- GVC scenario: `hiring-talent-pool-desk`
- Viewports: `1440 y 390`
- Required captures: `all state inventory + invite conflict/receipt`
- Required `data-capture` markers: `header|filters|results|profile|evidence|invite-dialog`
- Scroll-width check: `mandatory`
- Accessibility/focus checks: `WCAG 2.2 AA, table/list, disclosure, sidecar/dialog, mobile Back`
- Before/after evidence: `Hiring opening-scoped navigation vs new person-first workbench`
- Known visual debt: `none accepted at close`
- Visual scorecard: `docs/ui/reviews/TASK-1725-talent-pool-desk.scorecard.json`
- Quality threshold: `average >= 4.5; no dimension <4; hierarchy/surface economy/impact/fidelity/template resistance >=4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution Audit — 2026-08-16

- El task hook detectó el bloqueo documental original por `TASK-1723`. Se resolvió sin omitir dependencia: la
  migración fundacional está aplicada en desarrollo, el backfill person-first fue reconciliado y los primitives
  `searchTalentPool`, `getTalentPoolProfile` e `inviteTalentToOpening` ya existen detrás de capabilities/flags.
- `TASK-1723` sigue abierto únicamente para su cierre transversal y rollout; no bloquea el consumer UI read-only.
- Dirección aceptada tras consultar el stack UI/UX exigido: evidence workbench repo-native, `listDetail`, sin card
  gallery/Kanban/fit score, con transformación list→detail a 390 px y propuesta→confirmación para escrituras.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Route, reachability and first fold

- Añadir destination única bajo Hiring, gates y list-detail first fold con fixtures/DTO real.
- Capturar 1440/390 y aceptar composición antes de completar estados.

### Slice 2 — Search, detail and evidence states

- Cablear filters/query/cursor, results, profile sidecar/mobile detail, coverage/freshness y exact application links.
- Implementar ready/loading/empty/partial/stale/error/denied con copy bilingüe.

### Slice 3 — Governed invitation experience

- Cablear proposal, duplicate/contactability warnings, accessible confirmation, conflict y receipt/readback.
- Probar que ninguna UI predicate puede habilitar una acción denegada por server.

### Slice 4 — Premium verification and rollout

- Completar keyboard/focus/reduced-motion, nav budget, GVC premium y enterprise scorecard.
- Rollout read-only primero, luego invite allowlisted tras TASK-1724/privacy gate.

## Out of Scope

- Schema/readers/commands/backfill/capabilities (TASK-1723), candidate self-service (TASK-1724) y MCP (TASK-1726).
- El sidecar reutiliza el renderer privado canónico sobre un reader exacto por application; nunca agrega CVs por identidad/facet.
- Career Alerts, sourcing externo, contact CRM, mass email, assessment assignment, stage/decision/handoff/activation.
- Fit score, auto-ranking, auto-shortlist, inferred protected attributes o candidate photos.

## Detailed Spec

Search results never render a percent match. They show `reasonCodes/reasonLabels`, `coverage`, `freshness`, role evidence,
availability and contactability/allowedAction. Profile groups evidence by source/application and never flattens conflicting
history into one claim. Invite chooses from openings returned by server policy; proposal/confirm receives no email/template.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1723 read contracts → Slice 1/2 read-only → GVC/access gates → TASK-1724 contactability → Slice 3 invite → rollout.
- UI cannot enable invite before server allows it; read-only can ship independently. Invite quedó ON sólo después de
  la aprobación operativa del CEO y permanece consentimiento-gated.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI presenta ranking implícito | UI/hiring | medium | deterministic ordering + reason/freshness, no score | visual/UX review |
| PII/CV aparece en list/detail | UI/privacy | low | allowlisted DTO + DOM/network sentinel | TASK-1723 access signal |
| Sidecar/mobile pierde contexto | UI | medium | URL/query/cursor restoration tests | GVC/focus assertion |
| Invite pese a reconsent/duplicate | UI/API | low | server allowedActions + proposal/confirm/readback | invite reconciliation signal |

### Feature flags / cutover

- Read-only route e invite action usan flags separados de TASK-1723. Nacieron OFF; el estado live vigente es
  `read-only=ON` e `invite=ON` desde 2026-08-16, con consentimiento futuro explícito y confirmación humana.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | remove nav/reachability or route flag OFF | <5 min | yes |
| 2 | read flag OFF; no data mutation | <5 min | yes |
| 3 | invite flag OFF; preserve receipts/applications | <5 min | partial for confirmed invites |
| 4 | revert UI/evidence; backend unchanged | <10 min | yes |

### Production verification sequence

1. Verify TASK-1723 read APIs/capabilities and route grants in staging.
2. Mantén flags OFF para rollback; ejecuta nav budget/reachability y denied user tests antes de cualquier reactivación.
3. Enable read for People allowlist; execute GVC/axe/PII/query restoration desktop+390.
4. Verify TASK-1724 consent/withdrawal; enable invite for one synthetic opening.
5. Exercise proposal/duplicate/conflict/receipt; confirm exactly one application.
6. Expand gradually and observe access/invite/projection signals.

### Out-of-band coordination required

- People accepts filters, reason vocabulary and operating manual; Legal/Privacy has approved contactability via TASK-1723/1724.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Route is reachable once under Hiring sidebar and passes the applicable reachability/access gates locally.
- [x] Search/filter/cursor/detail use TASK-1723 only; no store/API/business rule duplication in UI.
- [x] Results are person-first and show reason, coverage, freshness, availability and allowed action without fit score.
- [x] Email/phone/notes/economics/protected attributes remain absent from list/search/cache/error evidence; CV bytes sólo salen por la ruta privada gobernada.
- [x] El visor y los deep links usan application ID exacto; no existe fallback documental por identidad/facet.
- [x] Invite proposal/confirm handles needs-reconsent, withdrawn, duplicate, conflict, timeout and receipt honestly.
- [x] Wireframe/flow/motion/direction exist and UI readiness checks pass.
- [x] Primitive decision remains reuse; no new pipeline, card primitive or platform pattern.
- [x] Copy is bilingual/canonical and all ready/loading/empty/partial/error/denied/mobile states are covered.
- [x] Keyboard/focus/sidecar/dialog/mobile Back/reduced-motion pass WCAG 2.2 AA locally.
- [x] GVC premium 1440/390 has no horizontal scroll, console or axe findings.
- [x] Scorecard average ≥4.5 with required floors and final enterprise verdict not BLOCK.
- [x] Read-only e invite tienen flags/rollback separados; producción mantiene ambos ON desde 2026-08-16, con invite
  gobernado por `propose → confirm`, consent-gated y reversible.

## Verification

- `pnpm task:lint --task TASK-1725`
- `pnpm ui:wireframe-check --task TASK-1725`
- `pnpm ui:flow-check --task TASK-1725`
- `pnpm ui:motion-check --task TASK-1725`
- `pnpm ui:readiness-check --task TASK-1725`
- `pnpm nav:budget`
- `pnpm design-contract:lint`
- `pnpm ui:code-lint`
- `pnpm ui:quality --task TASK-1725`
- `pnpm fe:capture hiring-talent-pool-desk --env=staging`
- `pnpm qa:gates --changed`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Hiring architecture, functional docs and People manual reflect the live route/flags/capabilities.

## Follow-ups

- Add internal/bench/freelancer source adapters only after TASK-1723 V1 external-candidate evidence is stable.
- Habilitar el packet CV por MCP sólo después de los sign-offs Security/Privacy/Talent/Identity/MCP de TASK-1718;
  el visor humano del Banco no depende de ese rollout agentic.

## Open Questions

- None for UI; filter availability/coverage comes from TASK-1723 contracts and is never fabricated here.
