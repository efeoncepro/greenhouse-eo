# Modular Migration — New Work Operating Model V1

> Status: `Active during EPIC-026`
> Date: `2026-07-10`
> Applies to: new Greenhouse product, backend, API, integration, worker and UI work
> Architecture: `GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`

## Objective

Allow Greenhouse to keep shipping product while `EPIC-026` measures and evolves the build/runtime topology. New work must not wait for the future workspace, but it should avoid creating dependencies that make a later extraction harder.

The operating rule is:

> **Build in the current runtime, extraction-ready. Do not pre-create the target topology before its evidence gate.**

## What changes now

New capabilities continue to live in the current `src/` and `services/` structure until an approved child task moves a boundary. What changes immediately is how dependencies and ownership are shaped:

1. domain primitive before route or UI;
2. browser-safe contract separated from server-only implementation;
3. routes, pages, Nexa tools, MCP and workers remain adapters/consumers;
4. long-running work follows the existing Cloud Run workload-placement policy;
5. filesystem/build-time dependencies are explicit;
6. no new catch-all shared layer;
7. task specs declare the likely future home and extraction constraints without creating it prematurely.

## Decision tree for every new capability

```text
New requirement
  |
  +-- Is it business behavior or a business write?
  |     +-- Yes -> canonical domain primitive in src/lib/<domain>/**
  |     |          + command/reader + authz + idempotency + audit/outbox
  |     |          + routes/UI/Nexa/MCP consume it
  |     +-- No -> continue
  |
  +-- Must browser code import it?
  |     +-- Yes -> browser-safe types/contracts in a file with no server imports
  |     +-- No  -> mark/keep server-only; DB/secrets/provider SDK stay behind adapter
  |
  +-- Is it batch, scheduled, async, retryable or >30s?
  |     +-- Yes -> existing appropriate Cloud Run worker/service pattern
  |     +-- No  -> request-response path may remain in current Next.js app
  |
  +-- Is it public?
  |     +-- Yes -> allowlisted public projection + abuse/privacy/cache contract
  |     +-- No  -> session/capability/space_id contract
  |
  +-- Does it introduce a heavy dependency or filesystem input?
        +-- Yes -> isolate behind adapter and document build/runtime consumers
        +-- No  -> normal bounded import
```

## Placement contract during the transition

| Concern | Place new work now | Eventual candidate home | Rule |
| --- | --- | --- | --- |
| Domain rules, commands, readers | `src/lib/<domain>/**` | `packages/domain-<domain>` if evidence supports it | No Next.js/UI imports |
| DTOs, enums, schemas used by browser and server | domain-local browser-safe contract file | `packages/contracts` only when genuinely cross-app | No DB/secrets/server-only imports |
| DB access | existing canonical DB helpers/store layer | `packages/db` + domain stores | Never create a new Pool/Client |
| Auth/capabilities | canonical auth/access primitives | `packages/auth` | Route/UI cannot invent authorization |
| Portal UI | current `src/app/**` + Greenhouse primitives | `apps/portal` | Thin consumer of readers/commands |
| Public UI | current public route/surface | possible `apps/public` | Only allowlisted payloads and governed writes |
| Programmatic HTTP/API | current governed API Platform lanes | possible `apps/api` | Adapter over primitive, not duplicate implementation |
| Async/batch/sync | appropriate existing `services/**` runtime | remains service/worker | No long-running inline Vercel execution |
| UI primitives | `src/components/greenhouse/primitives/**` | `packages/ui` if browser-safe | No domain/store imports |
| Local tooling | `scripts/**` with explicit scope | `tooling/**` | Must not become a runtime dependency accidentally |

“Eventual candidate home” is a design hint, not authorization to create the folder.

## Required shape for new backend capabilities

A new backend capability should normally have these seams, proportionally to risk:

```text
src/lib/<domain>/
  <capability>-types.ts       # browser-safe only when needed
  <capability>-contract.ts    # input/output/errors; no provider/DB imports
  <capability>-reader.ts      # canonical read primitive
  <capability>-command.ts     # canonical write primitive
  <capability>-store.ts       # persistence adapter
  <capability>-events.ts      # audit/outbox contract when applicable
```

This is not a mandate to create six files for trivial work. It is a dependency-direction contract: presentation and transport stay outside business behavior; infrastructure stays behind the primitive.

## Required shape for new UI

UI work continues to follow the Greenhouse UI contracts. Additionally:

- Server Components may compose readers but must not become the only business implementation.
- Client Components receive browser-safe DTOs and callbacks; they do not import stores, provider SDKs or server-only modules.
- Route handlers validate transport/auth and delegate to a primitive.
- Visible workflows still require their normal wireframe/flow/motion/GVC evidence.
- A future app extraction must be able to replace the transport without rewriting the business rule.

## Required task authoring note

While `EPIC-026` is active, every new non-trivial task should answer in `## Architecture Alignment`, `## Dependencies & Impact` or its backend/UI contract:

- **Current home:** real path/runtime where it will be built now.
- **Future candidate home:** portal, public, API, worker, domain package, UI package or `remain shared`.
- **Boundary:** contract consumers may import/call.
- **Server/browser split:** which files are safe for each environment.
- **Build impact:** new heavy dependencies, filesystem inputs or global entrypoints.
- **Extraction blocker:** transaction, auth/session, routing, data or provider constraint that would prevent an independent deployment.

For a small local fix, a one-line `no modular topology impact` statement is sufficient. Do not inflate task scope merely to satisfy this note.

## Examples

### Example A — New Hiring feature

Build now:

```text
src/lib/hiring/interview/**        canonical behavior
src/app/api/hiring/interview/**    HTTP adapter
src/app/(dashboard)/agency/**      portal consumer
```

Future:

- domain logic could become `packages/domain-hiring`;
- portal route remains in `apps/portal`;
- API adapter could move to `apps/api` only if the boundary and release cadence justify it.

Do not create a Hiring microservice or duplicate the command for the API.

### Example B — New public lead magnet

Build now:

- canonical run/report primitive in its Greenhouse domain;
- public intake command with abuse/privacy/cost guards;
- allowlisted public projection;
- headless/public renderer as a consumer.

Future:

- renderer/public intake may become a separate build unit;
- scoring/data primitives remain canonical and shared through a governed contract.

### Example C — New scheduled sync

Build now in the appropriate Cloud Run worker or dedicated service if the existing worker would become a catch-all. The portal/API only exposes status, trigger or replay commands when required. Do not add a heavy sync loop to a Vercel route because `apps/api` may exist later.

## Things that are forbidden now

- Creating `apps/portal`, `apps/api`, `apps/public` or `packages/*` opportunistically inside an unrelated feature task.
- Duplicating a domain primitive “for the future service.”
- Adding a generic `shared`, `common`, `utils` or `platform` dumping ground.
- Letting browser code import `server-only`, DB, Secret Manager or provider SDK modules.
- Adding long-running/batch behavior to Vercel because the future topology is undecided.
- Splitting a transaction across network calls to make code look service-ready.
- Publishing internal packages or creating a multirepo without an ADR/task.
- Blocking ordinary product delivery while waiting for `TASK-1376` when the work can follow these seams safely.

## Review checklist

- [ ] The capability has one canonical primitive.
- [ ] UI/API/Nexa/MCP/worker are consumers, not parallel implementations.
- [ ] Browser-safe and server-only imports are separated.
- [ ] No new DB pool, auth policy or provider client was duplicated.
- [ ] Async workload placement follows the current cloud policy.
- [ ] Heavy dependencies and filesystem inputs are declared.
- [ ] Current home and future candidate home are documented.
- [ ] The change remains valid if the future extraction is rejected.
- [ ] The feature can ship now without depending on an unapproved workspace move.

## Revisit and retirement

This model remains active through `EPIC-026`. After the workspace foundation is accepted and implemented, replace candidate-home guidance with the actual package/app ownership map. If `TASK-1376` returns `no-go`, retain the dependency-direction rules that improve modularity and retire only the multi-app placement assumptions.
