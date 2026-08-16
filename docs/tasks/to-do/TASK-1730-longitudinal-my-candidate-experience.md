# TASK-1730 — Longitudinal `/my` Candidate Experience

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1730-longitudinal-my-candidate-experience.md`
- Flow: `docs/ui/flows/TASK-1730-longitudinal-my-candidate-experience-flow.md`
- Motion: `docs/ui/motion/TASK-1730-longitudinal-my-candidate-experience-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno; direction y contratos iniciales creados, JSX pendiente`
- Rank: `TBD`
- Domain: `hr|ui|identity|content`
- Blocked by: `TASK-1728, TASK-1729`
- Branch: `Greenhouse develop; sin worktrees`
- GitHub Issue: `none`

## Summary

Convierte `/my` en una experiencia capability-composed que permite al candidato ver postulaciones/acciones,
actualizar su perfil profesional y CV, responder datos del rol y gestionar privacidad. Al activarse como
colaborador, la misma ruta suma secciones laborales sin recrear cuenta, ficha ni historia.

## Why This Task Exists

El `/my` actual presume `member` y mezcla perfil con superficies laborales. La UI candidata necesita reutilizar
shell/componentes sin conceder navegación o endpoints internos ni comprimir la experiencia laboral en un fork.

## Goal

- Una entrada `/my` coherente desde candidato hasta colaborador.
- Estado, acciones y edición comprensibles en desktop/mobile/teclado.
- Navegación derivada del manifest server-side, con estados honestos y privacidad visible.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Normative Docs

- `docs/ui/visual-directions/TASK-1730-longitudinal-my-candidate-experience.md`
- Wireframe y flow declarados en Status.

## Dependencies & Impact

### Depends on

- TASK-1728 profile reader/commands y TASK-1729 application DTO/commands.

### Blocks / Impacts

- Cierra el MVP candidato visible; impacta `/my` shell/nav/copy sin cambiar lógica backend.

### Files owned

- `src/app/(dashboard)/my/**` en rutas candidatas acordadas
- `src/views/greenhouse/my/**` y componentes candidatos locales
- `src/lib/navigation/my-nav-items.ts`
- `src/lib/copy/*` aplicable

## Current Repo State

### Already exists

- Shell `/my`, perfil y CRUD visuales, CompositionShell/primitives y navegación de colaborador.

### Gap

- Sin manifest candidato, lista de aplicaciones, acciones, privacidad ni transformación candidate→workforce.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/my y src/views/greenhouse`
- Future candidate home: `portal`
- Boundary: `MyExperienceManifest + readers/commands TASK-1728/1729`
- Server/browser split: `manifest y fetch autorizados en server; clientes sólo interacción/estado local`
- Build impact: `none; reusa MUI/Vuexy/Greenhouse primitives`
- Extraction blocker: `App Router/session/nav y primitives compartidas`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `candidato autenticado; seleccionado/preboarding; colaborador con faceta candidata coexistente`
- Momento del flujo: `después de postular y durante seguimiento/actualización`
- Resultado perceptible esperado: `sé dónde está cada postulación, qué falta y qué información controlo`
- Fricción que debe reducir: `silencio de estado, formularios repetidos y ruptura al contratar`
- No-goals UX: `dashboard de scores, notes internas, card soup o onboarding laboral prematuro`

### Surface & system decision

- Surface: `/my`, receta `operational workbench` con overview y rutas hermanas.
- Nav placement: `avatar` — evolución del destino personal existente; no agrega rail global.
- Composition Shell: `aplica` — lead de acciones + primary journey + aside de perfil/progreso no evaluativo.
- Primitive decision: `reuse` — CompositionShell, WorkbenchHeader, timeline, state surfaces, forms y upload existentes.
- Adaptive density / The Seam: `aplica` — desktop compuesto; 390 px prioriza acción y lista.
- Copy source: `src/lib/copy/*`.
- Access impact: `manifest/capabilities, no routeGroup my completo`.

### State inventory

- Default: aplicaciones + próxima acción + perfil.
- Loading/Empty/Error/Degraded/Denied: estados separados y recuperables, nunca “sin postulaciones” por fallo.
- Long content: múltiples aplicaciones/CV/preguntas paginadas.
- Mobile: orden acción→postulaciones→perfil; cero scroll horizontal.
- Keyboard/focus: route tabs, dialogs/upload y confirmación de retiro con restore.
- Reduced motion: significado idéntico sin transiciones.

### Implementation mapping

- Route / surface: `/my`, `/my/applications`, `/my/profile`, `/my/documents`, `/my/privacy`.
- Component candidates: primitives existentes + adapters del dominio.
- Data reader / command: TASK-1728/1729.
- API parity: UI no interpreta stages ni ownership.
- Access / capability: `hiring.self.*`, `person.self.*` y workforce additive.
- States to implement: los del inventario y selection/preboarding transition.

### GVC scenario plan

- Scenario file: `src/lib/frontend-capture/scenarios/task-1730-longitudinal-my.ts`.
- Route: `/my` y `/my/applications`.
- Viewports: `1440x1000`, `390x844`.
- Quality profile: `premium`.
- Captures: overview, dos aplicaciones, action required, error/degraded, mobile, keyboard/reduced motion.
- Assertions: capability nav, no internal leaks, focus restore, `scrollWidth === clientWidth`.
- Review dossier: `docs/ui/reviews/TASK-1730-longitudinal-my-candidate-experience/`.
- Baseline decision: `repo-native; declarar baseline después de first-fold ACCEPT`.

### Design decision log

- Decision: `/my` lifecycle workbench, no candidate portal paralelo.
- Alternatives considered: dashboard de cards; wizard único; ruta `/candidate` separada.
- Why this pattern: conserva identidad/URL y permite facetas simultáneas.
- Reuse / extend / new primitive: `reuse`; nueva primitive sólo si lookup demuestra hueco transversal.
- Open risks: densidad móvil y coexistencia de nav candidate/workforce.

## Backend/Data Contract

N/A — esta task es un consumer UI puro. No crea ni modifica schema, API, reader, command o autorización; consume
los contratos server-side cerrados por TASK-1727–1729 y queda bloqueada hasta que existan.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Congelar direction/readiness y manifest/nav capability-composed.
2. Implementar first fold y obtener `ACCEPT FIRST FOLD` desktop/390.
3. Completar aplicaciones, perfil, CV, preguntas, privacidad, estados y acciones.
4. GVC premium, a11y/keyboard/reduced motion y rollout flag.

## Out of Scope

- Backend/policy, People 360 interno, payroll/legal intake y nueva primitive sin protocolo platform.

## Detailed Spec

El JSX se implementa únicamente después de `ui:readiness-check` y first-fold approval. El server entrega `MyExperienceManifest`; rutas/client components renderizan y ejecutan intents, sin derivar capabilities, ownership o stage mappings.

## Rollout Plan & Risk Matrix

- TASK-1728/1729 reales → first fold → states → staging candidate cohort → producción gradual.
- Flag `CANDIDATE_LONGITUDINAL_MY_ENABLED`; fallback conserva `/my` laboral y links tokenizados existentes.
- Riesgo principal: navegación/PII incorrecta; mitigación manifest server-side + negative GVC/auth tests.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Candidato opera sus aplicaciones/perfil sin ver superficies workforce/client/internal.
- [ ] Seleccionado conserva la misma experiencia y recibe sólo preboarding autorizado.
- [ ] Colaborador ve capabilities laborales aditivas y conserva historia candidata.
- [ ] GVC premium desktop/390, teclado, reduced motion y overflow pasan.

## Verification

- `pnpm task:lint --task TASK-1730`
- `pnpm ui:readiness-check --task TASK-1730`
- `pnpm fe:capture task-1730-longitudinal-my --env=staging`
- `pnpm ui:quality --task TASK-1730`
- lint/typecheck/tests aplicables.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff, changelog, manual y dossier sincronizados.
- [ ] First fold y enterprise review aceptados con evidencia posterior al último cambio.

## Follow-ups

- Referencias/recomendaciones, agenda y passkeys quedan fuera del MVP.
