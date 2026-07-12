# Greenhouse Build Unit Decomposition Decision V1

## Status

- Status: `Accepted`
- Date: `2026-07-10`
- Owner: `Platform / Architecture`
- Scope: `repository topology, Next.js build graph, Vercel deployables, local development and release routing`
- Reversibility: `two-way-but-slow`
- Confidence: `high` for beginning decomposition; `medium` for the first boundary benefit
- Validated as of: `2026-07-10`
- Epic: `EPIC-027`
- First implementation task: `TASK-1382`

## Context

Greenhouse's single Next.js unit has reached an economic and operational limit. The operator reports an Elastic bill increase from roughly USD 20 to USD 530, Standard builds taking up to 45 minutes or failing, and a current Elastic bill of USD 250 despite local-first work. The repository contains 1,269 App Router entrypoints and has measured warm RSS p95 of 7.51 GB.

The rejected `GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1` answered a narrower evidence question: a Roadmap filesystem-input experiment failed its memory gate. It did not test a physical deployment boundary, and it did not include the now-confirmed invoice history. That negative experiment remains valid; its inference that no decomposition should begin does not.

## Decision

Greenhouse will begin an incremental physical decomposition into independently buildable and deployable units while retaining one repository and a modular monolith for business data and transactions.

The first pilot is `Design System Labs`:

- create workspace/build foundations only as required by the pilot;
- move a representative pure-UI subset first, then the remaining eligible Labs pages;
- exclude API/DB/filesystem-dependent pages until they have an explicit server contract;
- configure affected-project build skipping so labs-only changes do not build the portal;
- measure portal and Labs separately before route removal or production cutover;
- keep PostgreSQL, domain commands/readers, auth source of truth and API handlers in the portal during the pilot.

This ADR supersedes the program-level no-decomposition conclusion in `GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1`; it does not erase TASK-1379's no-go result for Roadmap materialization.

## Runtime Contract

- Current production remains the existing `greenhouse-eo` Vercel project until TASK-1382 passes local and preview gates.
- No domain transaction, schema or API source of truth moves in the Labs pilot.
- New product work continues in its current candidate home and declares `Modular Placement Contract`; it must not wait for the full migration.
- A feature belongs to the deployable that owns its user-facing lifecycle. Shared code must be server/browser safe and owned by a named package; no generic `shared` package.
- Cross-app calls require versioned HTTP/contracts, authz, correlation and sanitized errors; direct cross-runtime DB coupling is not introduced by this decision.
- Every deployable owns build, tests, env manifest, release evidence, observability and rollback.
- Vercel billing/export failures are recorded as missing evidence, never zero spend.

## Alternatives Considered

| Alternative | Decision |
| --- | --- |
| Keep one app and continue build tuning | Rejected as the primary strategy: three experiments did not remove the structural graph and costs are already material. |
| Downgrade permanently to Standard | Rejected as current fallback: reported 45-minute/incomplete builds break delivery. |
| Big-bang multi-app rewrite | Rejected: excessive product and release risk. |
| Split Admin or API first | Deferred: larger graph but high auth/data/transaction blast radius. |
| Extract Design System Labs first | Accepted as reversible pilot with meaningful page count and low transaction risk. |
| Migrate away from Vercel now | Out of scope; hosting choice can be revisited after build units and cost attribution exist. |

## Consequences

### Positive

- Product and Labs changes can stop rebuilding the whole platform.
- Cost and duration become attributable per deployable.
- The repository gains enforceable seams without splitting business data prematurely.

### Negative

- More manifests, environments, releases and version-skew concerns.
- Shared UI packages may still make both graphs expensive; the pilot can fail its benefit gate.
- Auth/routing for Labs requires explicit preview and rollback verification.

## Revisit When

- TASK-1382 fails both portal reduction thresholds and affected-build isolation.
- Labs operational overhead costs more than the savings for two consecutive billing periods.
- Vercel pricing or build semantics change materially.
- A different host produces a verified lower TCO after deployable boundaries exist.

## Evidence

- `docs/audits/platform/2026-07-10-vercel-build-cost-escalation.md`
- `docs/tasks/complete/TASK-1376-build-baseline-dependency-boundary.md`
- `docs/tasks/complete/TASK-1379-roadmap-materialized-index-build-input-experiment.md`

## Delta 2026-07-12 — Excepción documentada: frontera `artifact-worker` (Cloud Run Job) AUTORIZADA

**Decisión del operador (2026-07-12, sesión TASK-1391):** se autoriza la creación del deployable
**`artifact-worker`** (primer **Cloud Run Job** del ecosistema; imagen con Playwright/Chromium pinneado)
por la **vía de excepción documentada** que TASK-1391 contempla ("EPIC-027 debe autorizar… o documentar
la excepción antes de crear `services/artifact-worker/`"), sin esperar la vía ordinaria
(pilot Labs TASK-1382 + rebaseline de costo de 30 días).

**Evidencia exigida por EPIC-027 (cost · routing/auth · rollback · runtime ownership):**

- **Costo:** Cloud Run **Job** con scale-to-zero — se paga sólo por ejecución. Benchmark local
  (Slice 0): deck 15 láminas = 4,4 s / PDF 3,2 MB · 25 láminas = 6,2 s / PDF 5,6 MB · RSS del
  proceso node ~260 MB. Envelope inicial 2 CPU / 2 GiB / timeout acotado; el perfil de carga del
  catálogo deck es **raro** (unidades/mes, no unidades/hora). El costo dominante es Artifact
  Registry (imagen Chromium ~1 GiB) + ejecuciones esporádicas — órdenes de magnitud bajo el
  problema de costo que originó EPIC-027 (builds Vercel/Elastic).
- **Routing/auth:** el Job **no expone endpoint HTTP**. Invocación exclusiva vía Jobs API
  (`jobs.run`) por el dispatcher autenticado (ops-worker, OIDC/IAM `roles/run.invoker`); patrón
  IAM idéntico a los 4 services existentes (`--no-allow-unauthenticated`).
- **Rollback:** < 10 min — flag `ARTIFACT_RENDER_JOBS_ENABLED` OFF + pausar el dispatch; los jobs
  quedan auditables (tabla append-only) y los assets aprobados no se borran. El deployable puede
  eliminarse por completo sin tocar dominio (el render vuelve a ser CLI local).
- **Runtime ownership:** Ops/Platform (deploy, señales, runbook) + Commercial (semántica del job).
  El render pesado NUNCA corre en Vercel ni `ops-worker` (invariante del outbox publisher).

**Por qué la excepción es segura respecto del espíritu del ADR:** este deployable NO toca el problema
que el gate protege (el grafo/build del portal Next.js): no mueve rutas, no divide el build de Vercel,
no crea `apps/*` ni `packages/*`. Es un worker batch aislado, del mismo tipo operativo que los 4 ya
productivos, con la única novedad del modo Job + Chromium. La decisión de frontera del PORTAL
(Labs/Admin/Public) sigue intacta y sigue gateada por la vía ordinaria.

**Registro cruzado:** EPIC-027 (child + exit criterion parcial), `DECISIONS_INDEX.md`, TASK-1391 Slice 0.

