# TASK-1382 — Design System Labs Build Unit Pilot

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-027`
- Status real: `Ready — accepted architecture; execution requires task hook/plan`
- Rank: `1`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1382-design-system-labs-build-unit-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar la primera unidad de build independiente de Greenhouse: Design System Labs. Crear solo la foundation de workspace necesaria, extraer un subconjunto representativo pure-UI y demostrar que cambios Labs no construyen Portal antes de ampliar o cortar rutas.

## Why This Task Exists

El monolito de build ya produjo gasto reportado de USD 530/mes en Elastic; Standard llegó a 45 minutos y fallos. Los experimentos dentro de la app no resolvieron el grafo. Design System aporta 55 páginas con menor riesgo transaccional y permite probar desacople físico sin mover DB/API.

## Goal

- Crear una app Labs ejecutable/buildable de forma aislada.
- Extraer 5–10 páginas pure-UI representativas con imports gobernados.
- Probar matriz de builds afectados y reducción del Portal.
- Entregar veredicto `expand|hold|rollback` antes de provisioning/cutover productivo.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- El piloto no mueve DB, APIs, commands/readers, auth source of truth ni rutas productivas.
- No crear paquete `shared`; cada package tiene ownership y export server/browser explícito.
- Las páginas con API, filesystem, server actions o imports de dominio quedan fuera del primer slice.
- Preservar rutas Portal hasta que preview, reducción y rollback pasen.

## Normative Docs

- `docs/audits/platform/2026-07-10-vercel-build-cost-escalation.md`
- `docs/tasks/complete/TASK-1376-build-baseline-dependency-boundary.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- pnpm/Next.js/Vercel monorepo support already present in the toolchain.
- Existing primitives, theme, copy and motion entrypoints.

### Blocks / Impacts

- Blocks preview Vercel Labs project and route/auth cutover task.
- Impacts root build scripts, TypeScript aliases, lint boundaries and selected Labs routes.

### Files owned

- `pnpm-workspace.yaml`
- `apps/labs/**`
- `packages/**` only when required by the selected pages
- root manifests/config only for workspace orchestration
- selected `src/app/(dashboard)/design-system/**`
- build/affected tooling and tests
- task/audit/architecture closure docs

## Current Repo State

### Already exists

- 55 Design System pages and 44 mockup pages inside the single Portal graph.
- Vercel project `greenhouse-eo` rooted at repository `.`.
- Docs-only ignore-build guard and reproducible build profiler.
- TASK-1376 baseline: 279 pages, 946 handlers, warm RSS p95 7.51 GB.

### Gap

- No workspace or independently buildable frontend unit.
- Labs imports are not classified server/browser-safe.
- Any Labs change can trigger the full Portal build.
- No per-project cost/build-trigger ledger.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/app/(dashboard)/design-system/** inside the single Next.js portal`
- Future candidate home: `ui-package`
- Boundary: `apps/labs owns pure-UI design-system routes; Portal retains product routes and all server/domain contracts`
- Server/browser split: `Labs consumes browser-safe primitives/tokens only; server-only imports are lint/build errors`
- Build impact: `creates a separately buildable app and affected-project trigger matrix`
- Extraction blocker: `shared dashboard shell/auth and pages backed by /api/design-system; excluded or adapted explicitly`

<!-- ZONE 2 — PLAN MODE: executor runs discovery and records plan after task hook -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Route/import eligibility inventory

- Classify all 55 Design System pages: pure UI, auth-shell only, API-backed, filesystem-backed, domain-coupled.
- Select 5–10 pages spanning primitives/theme/motion but with no server/domain imports.
- Record import graph and explicit exclusions.

### Slice 2 — Minimum workspace and Labs app

- Add the minimum pnpm workspace/app manifests and scripts.
- Reuse existing UI through narrow browser-safe entrypoints; create packages only when isolation requires them.
- Make Labs dev/build work without starting Portal.

### Slice 3 — Representative physical extraction

- Move/copy selected pages behind a temporary pilot route map while preserving Portal routes.
- Add boundary lint/tests that reject DB, filesystem, server actions and domain imports from Labs.
- Verify visual/runtime parity proportionally; no redesign.

### Slice 4 — Affected-build and A/B evidence

- Prove trigger matrix: Labs-only, Portal-only and shared-package changes.
- Run clean/warm A/B for current Portal baseline, decomposed Portal and Labs.
- Produce `expand|hold|rollback` verdict against thresholds.

## Out of Scope

- Creating/mutating Vercel projects, domains, DNS, production env vars or production routes.
- Removing Portal routes before preview/cutover task.
- Extracting API, Admin, Finance, HR, Public or database/domain packages broadly.
- UI redesign, copy changes or new primitives.

## Detailed Spec

Eligibility is fail-closed. A page is pure-UI only when its transitive graph has no `@/lib/db`, Node filesystem, route handler/server action, domain command/reader or secret/env dependency. Shared primitives can remain physically in the Portal tree during the first proof only if Labs consumes them through a bounded alias and the A/B shows real isolation; otherwise extract the minimum browser-safe package. Do not duplicate primitives as a shortcut.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. No external Vercel provisioning or route removal in this task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Shared UI recreates global build | build | high | import graph + A/B gate | Portal RSS/time unchanged |
| Server module leaks into Labs | security/build | medium | fail-closed boundary lint | forbidden import/build error |
| Workspace breaks canonical build | release | medium | additive scripts + root parity | `pnpm build` regression |
| Duplicate route drifts | UI | low | short-lived pilot map + parity checks | screenshot/runtime mismatch |

### Feature flags / cutover

No production flag or cutover. Pilot routes remain non-production/local-preview; existing Portal routes are canonical.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | remove inventory artifacts | <15 min | sí |
| 2 | revert workspace/app manifests | <30 min | sí |
| 3 | remove pilot copies/map; Portal routes remain | <30 min | sí |
| 4 | retain audit, select `rollback`, remove pilot code | <60 min | sí |

### Production verification sequence

N/A — no production mutation. Local tests -> isolated builds -> trigger simulation -> A/B -> preview eligibility verdict.

### Out-of-band coordination required

None in this task. A follow-up needs approval/evidence before creating a Vercel project or changing routing.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Eligibility inventory covers all 55 Design System pages.
- [ ] Labs app builds and runs without Portal.
- [ ] 5–10 representative pages compile with no server/domain imports.
- [ ] Boundary enforcement has automated tests.
- [ ] Labs-only change does not require Portal build.
- [ ] Root canonical build remains valid.
- [ ] A/B reports duration, process-tree RSS, output and failures.
- [ ] Verdict follows thresholds: Portal >=15% duration reduction or >=10% peak RSS reduction, plus affected-build isolation.
- [ ] No external project/domain/env/production mutation occurred.

## Verification

- `pnpm codex:task-hook TASK-1382 --develop`
- targeted boundary/tooling tests
- isolated Labs build
- canonical Portal/root build
- `pnpm task:lint --task TASK-1382`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex --task TASK-1382`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] Audit A/B, Handoff y changelog actualizados.
- [ ] QA Release Auditor y Documentation Governor ejecutados.
- [ ] Follow-up de preview/cutover creado solo si verdict=`expand`.

## Follow-ups

- Preview Vercel Labs project, auth/routing/observability and cutover task if verdict=`expand`.
- 30-day per-project cost rebaseline after cutover.

## Delta 2026-07-10

Creada por decisión explícita del operador tras confirmar costo y latencia reales. No ejecutada todavía: requiere hook y plan de implementación; la autorización amplia del turno cubre documentación y preparación, no mutaciones externas.

