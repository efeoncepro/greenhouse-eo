# TASK-1733 — People 360 Longitudinal Hiring History UI

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1733-people-360-longitudinal-hiring-history.md`
- Flow: `docs/ui/flows/TASK-1733-people-360-longitudinal-hiring-history-flow.md`
- Motion: `docs/ui/motion/TASK-1733-people-360-longitudinal-hiring-history-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno; UI actual resume sólo el journey reciente`
- Rank: `TBD`
- Domain: `hr|ui|data`
- Blocked by: `TASK-1732`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Hace visible en People 360 la historia completa candidato→aplicaciones→handoffs→activación→member, con
provenance del perfil y disclosure capability-aware. Reemplaza el resumen de “último proceso” por timeline/lista
paginada sin duplicar ni editar Hiring desde People 360.

## Why This Task Exists

People 360 ya consume parte del journey, pero la UI oculta múltiples postulaciones y la fase previa a `member`.
Esto impide comprobar que la información autogestionada por el candidato enriqueció una única ficha longitudinal.

## Goal

- Historia completa y legible con exact application drill-down autorizado.
- Estados loading/empty/error/degraded honestos y privacidad explícita.
- Responsive/keyboard premium sin card wall.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Normative Docs

- `docs/ui/visual-directions/TASK-1733-people-360-longitudinal-hiring-history.md`
- Wireframe y flow declarados en Status.

## Dependencies & Impact

### Depends on

- TASK-1732 reader/DTO paginado.

### Blocks / Impacts

- Cierra el exit criterion People 360 de EPIC-011.

### Files owned

- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` o composición sucesora
- componentes locales de journey People 360
- copy y GVC scenario asociados

## Current Repo State

### Already exists

- Tab HR con última application/handoff y primitives timeline/sidecar.

### Gap

- Sin historia completa, paginación, pre-member ni drill-down consistente.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/people`
- Future candidate home: `portal`
- Boundary: `TASK-1732 longitudinal journey DTO; UI read-only`
- Server/browser split: `reader/auth en server; browser selección/paginación/sidecar local`
- Build impact: `none`
- Extraction blocker: `People 360 shell, private assets y application routes compartidas`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `People/Talent autorizado revisando una persona`
- Momento del flujo: `comprender trayectoria y provenance sin saltar entre fichas`
- Resultado perceptible esperado: `una sola historia, múltiples aplicaciones, límites de disclosure claros`
- Fricción que debe reducir: `resumen incompleto y búsqueda manual por aplicación`
- No-goals UX: `editar Hiring, ranking, card soup o CV inline sin capability`

### Surface & system decision

- Surface: `People 360 / HR`, receta `list-detail` dentro del shell existente.
- Nav placement: `none` — tab existente.
- Composition Shell: `aplica mediante el shell dueño existente`; no anidar otro shell.
- Primitive decision: `reuse` timeline/activity + AdaptiveSidecar para application detail si el runtime lo confirma.
- Adaptive density / The Seam: `aplica`.
- Copy source: `src/lib/copy/*`.
- Access impact: `capabilities People/Hiring actuales; cada drill-down revalida`.

### State inventory

- Default: timeline/lista paginada con source/type/status/freshness.
- Loading/Empty/Error/Degraded/Denied: separados; fallo nunca se pinta como “sin historia”.
- Mobile: lista priorizada; detalle reemplaza/Drawer mediante primitive.
- Keyboard/focus: selección, cierre y restore; reduced motion equivalente.

### Implementation mapping

- Route / surface: People 360 tab HR.
- Component candidates: timeline, route links, AdaptiveSidecar, state surfaces.
- Data reader / command: TASK-1732 read-only.
- API parity: cero reglas/stage mappings en UI.
- States to implement: inventory completo + múltiples aplicaciones/rehire.

### GVC scenario plan

- Scenario file: `src/lib/frontend-capture/scenarios/task-1733-people-360-journey.ts`.
- Route: persona fixture autorizada en People 360.
- Viewports: `1440x1000`, `390x844`; quality `premium`.
- Captures: multiple apps, candidate-only, selected/member, degraded, sidecar/mobile.
- Assertions: disclosure, focus restore, no overflow, zero wrong-application CV.
- Review dossier: `docs/ui/reviews/TASK-1733-people-360-longitudinal-hiring-history/`.
- Baseline decision: `repo-native; baseline después de first-fold ACCEPT`.

### Design decision log

- Decision: timeline/list-detail, no dashboard ni tabla plana.
- Alternatives considered: cards por aplicación; sólo último proceso; pestaña Hiring separada.
- Why this pattern: preserva secuencia y soporta múltiples relaciones sin duplicar ficha.
- Reuse / extend / new primitive: `reuse`.
- Open risks: densidad histórica y detail disclosure.

## Backend/Data Contract

N/A — consumer UI read-only. TASK-1732 posee reader/API, autorización, paginación y DTO; esta task no modifica
backend/data y no agrega lógica de dominio en componentes.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Readiness/direction y first fold.
2. Timeline/list paginada + exact application detail autorizado.
3. Estados/degraded/mobile/keyboard/reduced motion.
4. GVC premium y rollout.

## Out of Scope

- Modificar Hiring, auth, reader, CV packet policy o candidato `/my`.

## Detailed Spec

La UI consume sólo TASK-1732 y conserva Application 360 como dueño del detalle especializado. El timeline presenta hechos paginados; selección/detail revalida capability y el responsive pattern mantiene selección, foco y URL segura.

## Rollout Plan & Risk Matrix

- Reader TASK-1732 → first fold → GVC → internal staging → producción.
- Flag `PEOPLE_360_LONGITUDINAL_HIRING_UI_ENABLED`; fallback conserva resumen actual.
- Riesgo: PII/documento equivocado; mitigación exact IDs/DTO y negative scenario two-app/two-CV.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Se visualizan todas las aplicaciones/handoffs/activaciones autorizadas en una sola historia.
- [ ] Candidate-only y member funcionan; múltiples apps no mezclan evidencia.
- [ ] Error/degraded/denied son honestos y recuperables.
- [ ] GVC premium desktop/390, teclado, reduced motion y overflow pasan.

## Verification

- `pnpm task:lint --task TASK-1733`
- `pnpm ui:readiness-check --task TASK-1733`
- `pnpm fe:capture task-1733-people-360-journey --env=staging`
- `pnpm ui:quality --task TASK-1733`
- lint/typecheck/tests aplicables.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog, docs funcionales/manual y dossier sincronizados.
- [ ] EPIC-011 marca People 360 longitudinal sólo con evidencia runtime.

## Follow-ups

- Analítica agregada de journey sólo si existe una decisión de métricas separada.
