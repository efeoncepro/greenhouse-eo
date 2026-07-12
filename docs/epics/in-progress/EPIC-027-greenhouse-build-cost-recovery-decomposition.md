# EPIC-027 — Greenhouse Build Cost Recovery & Decomposition

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Accepted — physical decomposition starts with Labs pilot`
- Rank: `1`
- Domain: `platform|ops|cross-domain`
- Owner: `Platform / Architecture`
- Branch: `epic/EPIC-027-greenhouse-build-cost-recovery-decomposition`
- GitHub Issue: `none`

## Summary

Recuperar control de costo y feedback separando Greenhouse en unidades de build medibles. El programa parte con Design System Labs y mantiene el dominio/datos como modular monolith.

## Why This Epic Exists

El costo reportado escaló de ~USD 20 a USD 530 en Elastic; Standard llegó a 45 minutos o no completó, y Elastic sigue en USD 250 aun con local-first. Optimizar dentro de la única app no cerró el límite estructural.

## Outcome

- Labs y Portal se construyen independientemente según archivos afectados.
- El portal reduce grafo/costo sin mover transacciones ni sources of truth.
- Existe ledger verificable de costo, duración, fallos y máquina por proyecto.
- El siguiente límite se decide con evidencia, no por intuición.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Child Tasks

- `TASK-1382` — workspace + Design System Labs physical pilot and affected-build proof.
- `TBD` — preview routing/auth and Vercel project cutover after TASK-1382 local gate.
- `TBD` — 30-day cost rebaseline and next-boundary decision.
- `TASK-1392` — Tender Proposal Studio F0 agentic foundation: aggregate, assets and governed context/tool/proposal contract within the modular monolith. It is a prerequisite for the render candidate; it **does not** authorize a deployable or move existing transactions.
- `TASK-1391` — Tender Deck Renderer worker/artifact pipeline: the next-boundary **candidate** for a dedicated `tender-worker` Cloud Run Job, after `TASK-1392`. It remains blocked until EPIC-027 explicitly resolves `continue` for that boundary, with cost, routing/auth, rollback and runtime ownership evidence.

## Existing Related Work

- `EPIC-026` and TASK-1376/1379/1380/1381 preserve baseline and failed optimization evidence.
- `scripts/ci/vercel-ignore-build.mjs` already skips docs-only builds.
- `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` defines the proposed Tender runtime and its agentic/full-API-parity boundaries; it does not supersede this epic's deployable authorization gate.

## Exit Criteria

- [ ] Labs-only changes do not build Portal.
- [ ] Portal graph meets the accepted reduction gate or the pilot is rolled back with evidence.
- [ ] Cost attribution is available per deployable for at least one billing cycle.
- [ ] Production routing/auth/rollback passes before duplicate routes are removed.
- [ ] Next boundary has explicit `continue|pause|stop` decision.

## Non-goals

- Split PostgreSQL or domain transactions.
- Big-bang rewrite or immediate host migration.
- Stop feature delivery while the migration advances.
