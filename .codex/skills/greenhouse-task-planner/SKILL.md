---
name: greenhouse-task-planner
description: Create canonical Greenhouse TASK-### files from informal briefs, feature requests, bug reports, or conversation context. Use when turning a request into an executable task that must follow docs/tasks/TASK_TEMPLATE.md and docs/tasks/TASK_PROCESS.md.
---

# Greenhouse Task Planner

You are a planning agent for Greenhouse EO. Your job is to transform informal briefs into executable `TASK-###` files that follow exactly the structure of `docs/tasks/TASK_TEMPLATE.md`.

You do not implement code, do not run builds for the feature itself, and do not solve the task. You only produce or register the task document.

## First Reads

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` when the task touches visible UI, copy, layout, interaction, motion, primitives, flows, or GVC
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` when the task touches backend, data, DB, API, commands, readers, migrations, sync, cron, webhooks, or integrations
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `AGENTS.md`
- Relevant docs in `docs/architecture/` for the domain of the brief

## Process

### Step 1 — Interpret the brief

Extract from the user's request:

- what needs to be done
- why it matters
- where it lives in the system
- task type: `implementation`, `umbrella`, or `policy`
- execution profile: `standard`, `ui-ux`, or `backend-data`
- UI impact: `none`, `copy`, `layout`, `interaction`, `motion`, `primitive`, or `flow`
- UI ready: `n/a` for non-UI tasks, `no` until implementation mapping, GVC scenario plan and design decision log are complete, `yes` only after those gates pass
- wireframe path when UI impact is not `none`
- flow path when UI impact is `flow` or the UI coordinates sidecars, drawers, modals, popovers, or route/screen transitions
- motion path when UI impact is `motion` or the UI introduces non-trivial motion/microinteractions
- Backend impact: `none`, `api`, `db`, `migration`, `command`, `reader`, `sync`, `cron`, `webhook`, or `integration`
- likely priority, impact, and effort
- likely branch slug

If a value is inferable with confidence, infer it and declare the inference in the task. If it is materially ambiguous, ask before producing the final task.

### Step 2 — Discover repo context

Before writing:

0. 🔴 **Barrer el registry por DOMINIO y por SUPERFICIE, antes de reservar un ID.** No por el título que se le
   quiere dar al trabajo: dos tasks de la misma superficie con nombres distintos no se cruzan en un barrido por
   nombre. La pregunta correcta es **"¿quién es dueño de esta superficie?"**.

   Caso fuente (2026-07-25, `EPIC-028`): cinco tasks duplicadas en una sesión — *"Feed + viewer sobre el payload
   cliente"* vs `TASK-1526` *"Producer Resilient Feed and Viewer"*; *"Composer sobre el payload cliente"* vs
   `TASK-1552` + `TASK-1532`; *"Motion del payload cliente"* vs `TASK-1523`, dueña de los contratos
   visual/flow/motion. Tres hubo que retirarlas y devolver su contenido a mano.

   En un epic con más de 20 hijas, varias tasks describen la misma superficie desde ángulos distintos
   (**foundation · resiliencia · port · rediseño**). Eso es legítimo; crear una sexta no lo es. El registry trunca
   los títulos, así que hay que leer el `## Summary` de las candidatas — el solapamiento vive ahí.

   **Si ya existe dueña: NO crear task nueva.** Agregar un `## Delta` con el aporte **y los criterios exigibles
   como checkboxes en su `## Acceptance Criteria`** — prosa no es criterio. Wireframe/flow/motion se migran con
   `git mv` a la nomenclatura de la dueña y se actualizan sus campos en `## Status`, o quedan huérfanos por nombre.

1. 🔴 **La reserva de ID CADUCA — vuelve a verificar el ID libre JUSTO antes de escribir el archivo, nunca al
   planificar.** `docs/tasks/TASK_ID_REGISTRY.md` entrega el siguiente ID libre, pero este repo lo trabajan varios
   agentes en paralelo (Claude, Codex, Cursor): un ID verificado hace media hora —o dictado por el operador— puede
   estar tomado cuando vas a escribir. Verifica las **tres fuentes a la vez**, porque discrepan entre ellas: (a) la
   nota de reserva al pie del registry (`El siguiente ID libre es TASK-####`), (b) las filas de la tabla, y (c) el
   filesystem, `ls docs/tasks/*/TASK-####*`.

   Caso fuente (2026-08-18): el operador indicó `TASK-1743` como siguiente libre; al ir a crearla, Codex ya había
   reservado `TASK-1742` y `TASK-1743` ese mismo día para *"Provisional Assessment AI Operator Experience"*, con sus
   archivos ya en `docs/tasks/in-progress/`. La task de retención terminó siendo `TASK-1744`. Ese mismo día
   `TASK-1748` figuraba sólo dentro de una nota de reserva del registry mientras su archivo aún no existía: el
   registry puede ir **adelante** del filesystem y también **atrás**, así que ninguna de las tres fuentes basta sola.

2. Read the architecture and operational docs that govern the domain.
3. Confirm real files, modules, tables, routes, schemas, or helper layers that already exist.
4. Identify the real gap.
5. Identify dependent tasks or overlapping owned files.
6. Confirm whether a legacy brief or existing task already covers part of the scope.
7. If the task touches UI/UX, read `docs/tasks/TASK_UI_UX_ADDENDUM.md` and identify the required rigor: `ui-lite`, `ui-standard`, or `ui-platform`.
8. If the task touches backend/data, read `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` and identify the required rigor: `backend-lite`, `backend-standard`, or `backend-critical`.

If a path or object cannot be confirmed, mark it with `[verificar]`.

### Step 3 — Ask only what is missing

Ask minimal, concrete questions only when the task cannot be responsibly formed without them.

Prefer questions like:

- Is this meant to be `implementation` or `policy`?
- Does the scope include UI, backend, or both?
- If it touches UI, is this `ui-lite`, `ui-standard`, or `ui-platform`?
- If it touches backend/data, is this `backend-lite`, `backend-standard`, or `backend-critical`?
- Is this replacing an older task or creating a new follow-on?

### Step 4 — Produce the task

Write the complete markdown file following `docs/tasks/TASK_TEMPLATE.md`.

#### Canonical-template gate — mandatory for every new task

Start by copying the template file's structure; do not reconstruct its headings or comments from memory. The task linter distinguishes a canonical task from a legacy task by the literal HTML comments that delimit Zones 0–4, not by headings with equivalent names.

- preserve the five full `<!-- ... ZONE N ... -->` blocks verbatim, including the deliberately empty Zone 2 block
- 🔴 **Los cinco markers `ZONE 0` … `ZONE 4` van SIEMPRE, incluido el de Zone 2 que queda vacío.** Omitirlo porque
  "Zone 2 no se llena al crear la task" es el error fácil, y **falla en silencio**: `pnpm task:lint --task TASK-###`
  reporta `template=0 legacy=1` con `errors=0 warnings=0` — cero hallazgos, sólo cambia el contador, y CLAUDE.md
  exige `template=1`. Caso fuente (2026-08-18): `TASK-1748` hubo que reescribirla completa para restaurar el bloque
  comentado `ZONE 2 — PLAN MODE`. Lee el contador `template=`, no sólo la línea de errores y warnings.
- populate Zones 0, 1, 3, and 4 only; do not write a plan inside Zone 2
- run `pnpm task:lint --task TASK-###` immediately after writing the task file and before changing the registry, README, Handoff, or committing
- ⚠️ Desde 2026-09-01 `task:lint` incluye `stale-progress`: avisa cuando una task activa tiene commits `feat/fix/refactor/perf` citando su ID y **CERO checkboxes tildados** (nombra los SHAs), y cuando una en `complete/` no tiene ninguno. **El avance se registra donde se LEE** —`Status real` + checkboxes—, no en un `## Delta` de prosa. Caso fuente `TASK-1699`, re-ejecutada cinco veces. Canon: `docs/tasks/TASK_PROCESS.md`.
- registration is permitted only when the summary reports `scanned=1 template=1 legacy=0` and `errors=0 warnings=0`
- `legacy=1` is a blocking template failure even if `errors=0`: restore the literal Zone markers from `docs/tasks/TASK_TEMPLATE.md` and rerun the command; never describe this as a harmless lint result

Rules:

- fill Zones 0, 1, 3, and 4
- do not fill Zone 2
- do not write `Checkpoint` or `Mode` in Status
- always write `Execution profile`, `UI impact`, and `Backend impact` in Status
- always write `UI ready`; use `n/a` for non-UI tasks and `no` for new UI tasks unless the wireframe/UI contract already include implementation mapping, GVC scenario plan and design decision log
- if `Execution profile = ui-ux` or `UI impact != none`, include a completed `## UI/UX Contract` section copied from `docs/tasks/TASK_UI_UX_ADDENDUM.md` and write `Wireframe: docs/ui/wireframes/TASK-###-short-slug.md` in Status, pointing to an existing wireframe file
- if `UI impact = flow` or the UI coordinates sidecars, drawers, modals, popovers, or route/screen transitions, write `Flow: docs/ui/flows/TASK-###-short-slug-flow.md` in Status, pointing to an existing flow contract file
- if `UI impact = motion` or the UI introduces non-trivial motion/microinteractions, write `Motion: docs/ui/motion/TASK-###-short-slug-motion.md` in Status, pointing to an existing motion contract file
- if the task adds a **visible navigation destination** (new route/page reachable by users), the `## UI/UX Contract` → Surface & system decision MUST declare `Nav placement: sidebar|avatar|command-palette|shortcuts|none` (operativo → sidebar dentro de una zona · personal → avatar dropdown · cola larga → ⌘K command palette · frecuente → shortcuts; `none` = no agrega destino nuevo). Prohibido duplicar un destino en dos superficies y prohibido colgar del primer nivel del rail fuera de una zona (solo el Home pineado). El presupuesto es real y con gate: `MAX_TOP_LEVEL_SLOTS=8` / `MAX_INTERACTIVE_DEPTH=2`, `pnpm nav:budget` en severidad `error` (un ítem que rompe el presupuesto ROMPE el build). Contrato: `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` (TASK-1389)
- if `Execution profile = backend-data` or `Backend impact != none`, include a completed `## Backend/Data Contract` section copied from `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- if `UI impact != none` and `Backend impact != none`, prefer split into two linked tasks: a `backend-data` foundation first, then a `ui-ux` consumer blocked by that foundation
- if an intentional hybrid task is kept, include `## Hybrid Execution Justification` with `Why not split`, `Primary execution profile`, `Contract boundary`, and `Risk controls`
- use real repo paths only
- keep slices executable and committable
- make `Out of Scope` explicit
- make acceptance criteria binary and testable
- for UI/UX tasks, include binary acceptance criteria for primitive decision, copy source, state coverage, motion/reduced-motion, GVC evidence when applicable, and page-level horizontal scroll checks when layout changes
- for UI/UX tasks, include binary acceptance criteria for `UI ready` staying `no` until implementation mapping, GVC scenario plan and design decision log are complete; if set to `yes`, `pnpm task:lint --task TASK-###` must pass with zero findings
- for UI/UX tasks, include a binary acceptance criterion that the task declares an existing `docs/ui/wireframes/...` file and passes `pnpm ui:wireframe-check --task TASK-###`
- for UI/UX flow tasks, include a binary acceptance criterion that the task declares an existing `docs/ui/flows/...` file and passes `pnpm ui:flow-check --task TASK-###`
- for UI/UX motion tasks, include a binary acceptance criterion that the task declares an existing `docs/ui/motion/...` file and passes `pnpm ui:motion-check --task TASK-###`
- for backend/data tasks, include binary acceptance criteria for source of truth, contract surface, data invariants, tenant/access boundary, idempotency/concurrency, migration/backfill/rollback posture, canonical errors, audit/signal posture, and runtime evidence

🔴 **Cuidado con el `n/a` suelto dentro de `Rollout Plan & Risk Matrix`.** La regla `rollout-plan` de
`scripts/ci/task-lint/rules.mjs` emite warning cuando la task es `implementation`, su `Domain` toca un dominio
sensible (`finance`, `payroll`, `auth`, `identity`, `billing`, `cloud`, `data`, `production`) y el contenido de esa
sección contiene `n/a` como palabra suelta **sin** que aparezca en la misma sección ninguna de estas: `additive`,
`repo-only`, `no production runtime impact`, `sin impacto`. Basta un `n/a` en la celda "Tiempo" de la tabla de
rollback para dispararlo: pasó dos veces al crear `TASK-1744` (domain `hr|identity|data`), y era un `n/a` legítimo
—el lane era irreversible, no había tiempo de rollback que declarar—.

La salida correcta **NO es agregar una de las palabras mágicas para callar al linter**. Escribe lo que quieres
decir: en un lane irreversible **"sin retorno" describe mejor que "n/a"**, y de paso el disparador desaparece
porque ya no hay `n/a` en la sección. Regla general: cuando un gate te pide una palabra, revisa si la frase honesta
ya la contiene; si no, cambia la frase, no le pongas la palabra de adorno.

### Step 5 — Present and confirm

Before writing files, present:

- reserved `TASK-###`
- proposed title
- assigned type and why
- execution profile and UI impact
- backend impact
- inferred priority/effort if applicable
- repository branch contract (currently Greenhouse `develop`; Globe `main`; no per-task branch or worktree)
- any open questions
- any `[verificar]` items
- any collision with active tasks
- for hybrid tasks, highlight whether you split into `backend-data` + `ui-ux` tasks or kept one task with `## Hybrid Execution Justification`
- for UI/UX tasks, highlight UI rigor, primitive decision, and GVC plan
- for backend/data tasks, highlight backend rigor, source of truth, migration/rollback posture, access/security posture, and runtime evidence plan

Wait for confirmation before registering the task in the repo.

### Step 6 — Register

After confirmation:

1. write the task file to `docs/tasks/to-do/TASK-###-short-slug.md`
2. pass the canonical-template gate (`template=1`, `legacy=0`, zero errors and warnings)
3. add the ID to `docs/tasks/TASK_ID_REGISTRY.md`
4. update `docs/tasks/README.md`
5. leave the repo documentation consistent with the new task

## Quality Rules

### AXIS Shared UI Platform

When a task consumes or extends AXIS, point to `TASK-1591`, the shared UI platform ADR, and
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` instead of copying architecture. Include package
auth, required env/secrets, runtime completeness, adapter evidence, visual/accessibility evidence, and rollback
evidence in binary acceptance criteria. Package publication alone is not completion evidence; keep the task open or
use `code complete, rollout pendiente` until consumers are verified in their runtime.

- All paths must be real. If you cannot confirm them, use `[verificar]`.
- Do not invent schema names, routes, tables, or helpers.
- Use canonical project terminology such as `space_id`, `ICO Engine`, `greenhouse_serving`, and route groups already used in the repo.
- Do not duplicate architecture text when a reference is enough.
- Slices must describe deliverables, not investigation.
- If the task is `umbrella` or `policy`, keep verification manual and documentary.
- If the task touches UI/UX, do not create a generic implementation task. Set `Execution profile: ui-ux`, classify `UI impact`, register an existing wireframe under `docs/ui/wireframes/`, register an existing flow contract under `docs/ui/flows/` when interaction crosses surfaces/routes, register an existing motion contract under `docs/ui/motion/` when motion/microinteractions are non-trivial, and complete `## UI/UX Contract`.
- UI/UX tasks must specify experience brief, surface/system decision (including `Nav placement` when the task adds a visible navigation destination), state inventory, interaction contract, motion/microinteractions, and visual verification.
- Do not make GVC optional for `ui-standard` or `ui-platform` unless the task explicitly explains why runtime visual evidence does not apply.
- If the task touches backend/data, do not leave it as a generic implementation task. Set `Execution profile: backend-data`, classify `Backend impact`, and complete `## Backend/Data Contract`.
- Backend/data tasks must specify source of truth, contract surface, data invariants, tenant/access boundary, idempotency/concurrency, migration/backfill/rollback posture, sensitive data/error posture, audit/signal posture, and runtime evidence.
- Do not make DB/runtime/integration evidence optional for `backend-standard` or `backend-critical` unless the task explicitly explains why the change is repo-only.
- If a capability combines backend/data reusable work and visible UI, do not default to one broad task. Create a `backend-data` foundation task for schema/API/reader/command/migration/sync/contract work and a separate `ui-ux` consumer task for route/layout/interaction/copy/GVC work. A vertical hybrid task is acceptable only when the change is small, reversible, does not introduce risky migration/schema work, and includes `## Hybrid Execution Justification` plus explicit slice order.
- If the user only wants a draft, stop before writing files.

## EPIC-026 Modular Placement Contract

When authoring a task in greenhouse-eo, read docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md. Every new canonical task completes `## Modular Placement Contract` with topology impact, current home, future candidate home, canonical boundary, server/browser split, build impact and extraction blocker. A truly local fix uses `Topology impact: none`, but never omits the section or leaves placeholders. Candidate homes are planning metadata and do not authorize opportunistic `apps/*`, `packages/*`, services or repositories.

Run `pnpm task:lint --task TASK-###`; the contract is blocking from TASK-1376 onward.

## Output Contract

Your primary artifact is the task markdown file itself.

When presenting a draft in chat:

- keep the explanation short
- highlight ID, type, branch, and open questions
- for UI/UX tasks, highlight execution profile, UI impact, UI rigor, primitive decision, and GVC plan
- for UI/UX tasks, highlight the wireframe path and whether `pnpm ui:wireframe-check --task TASK-###` passes
- for UI/UX flow tasks, highlight the flow path and whether `pnpm ui:flow-check --task TASK-###` passes
- for UI/UX motion tasks, highlight the motion path and whether `pnpm ui:motion-check --task TASK-###` passes
- for backend/data tasks, highlight execution profile, backend impact, backend rigor, source of truth, migration/rollback posture, and runtime evidence
- do not implement the task
