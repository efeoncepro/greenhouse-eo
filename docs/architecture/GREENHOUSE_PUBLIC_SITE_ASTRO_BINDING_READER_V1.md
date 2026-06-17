# Greenhouse Public Site Astro Binding Reader V1

> Tipo de documento: arquitectura / contrato tecnico
> Status: Accepted
> Date: 2026-06-17
> Owner: Platform / Public Site / Marketing Operations
> Task: `TASK-1161`
> Contract: `public-site-astro-binding.v1`

## Purpose

Greenhouse exposes a read-only binding reader for the target Astro/Vercel rail of `efeoncepro.com`.

The reader lets Greenhouse, agents and future Public Site Ops surfaces observe:

- the static binding for `efeoncepro/efeonce-web` and Vercel project `efeonce-web`;
- live GitHub branch HEAD state for `main` and `develop`;
- live Vercel production/staging deployment state;
- the route ownership matrix for the WordPress-to-Astro migration window.

It does **not** deploy, roll back, edit assets, publish WordPress content, change DNS, clear cache or promote traffic.

## Runtime Contract

Canonical code:

- `src/config/public-site-astro-binding.ts`
- `src/lib/public-site/astro/binding-types.ts`
- `src/lib/public-site/astro/binding-reader.ts`
- `src/app/api/admin/public-site/binding/route.ts`

API:

```http
GET /api/admin/public-site/binding
```

Access:

- `requireAdminTenantContext()`
- `public_site.runtime_binding.read`
- `public_site.route_ownership.read`

Capability seed:

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/20260617185349908_task-1161-public-site-binding-capabilities.sql`

## Source Of Truth

| Concern | Source |
|---|---|
| Current live runtime | WordPress/Kinsta until cutover |
| Target frontend rail | GitHub `efeoncepro/efeonce-web` + Vercel project `prj_i52CnPvaoNB0Lweqk7L7cLimv7W9` |
| Static binding metadata | `src/config/public-site-astro-binding.ts`, derived from `docs/operations/public-site-astro-runtime-binding-20260616.json` |
| Route ownership | `docs/operations/public-site-route-ownership-matrix-20260616.md` mirrored as typed config |
| Live deploy state | Vercel deployments API |
| Live repo state | GitHub commits API |

The older `src/lib/public-site/runtime-binding.ts` models the WordPress/Kinsta rail and must not be mixed with this Astro/Vercel contract.

## Degraded Modes

The reader uses `withSourceTimeout` around independent GitHub and Vercel reads.

- One source unavailable or timed out -> response status `degraded`, lower `confidence`, populated `degradedSources[]`.
- Both sources unavailable -> `confidence='none'`.
- No production deployment returned -> `status='empty'`.
- Provider errors are sanitized; tokens never appear in responses.

This contract deliberately avoids false-green states. A degraded source is still a successful reader response unless the internal Greenhouse route itself fails.

## Observability

Reliability signal:

- `public_site.astro_deploy_failed`
- reader: `src/lib/reliability/queries/public-site-astro-deploy-failed.ts`
- rollup: `moduleKey='platform'` / cloud operational posture for V1

Predicate:

- latest Vercel production deployment `ERROR` -> `severity='error'`;
- `BUILDING` or `QUEUED` -> `severity='unknown'`;
- `READY` -> `severity='ok'`;
- missing deployment -> awaiting-data style note, not a false incident.

## Architecture Decision 2026-06-17 -- Binding Reader First

- Status: Accepted
- Owner: Platform / Public Site
- Scope: Public Site Astro/Vercel reader, admin API, capabilities, reliability signal
- Reversibility: two-way
- Confidence: high
- Validated as of: 2026-06-17

### Context

`GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1` accepted Astro/Vercel as the target public frontend rail, but Greenhouse needed a governed read contract before any deploy/rollback commands.

### Decision

Create a read-only Greenhouse reader and admin API for `public-site-astro-binding.v1`, seeded with the minimum two capabilities required to observe runtime binding and route ownership.

### Alternatives Considered

- Use Vercel/GitHub directly from future UI: rejected because it violates Full API Parity and hides degradation/access policy.
- Store binding in a database table now: rejected for V1 because there is one site and no mutable lifecycle yet.
- Create a new reliability module immediately: rejected until Public Site has multiple active signals.

### Consequences

Future deploy, rollback, SEO preflight and Public Site Ops UI tasks can consume a stable server-side contract instead of reimplementing provider calls.

Runtime rollout still needs provider secrets/scopes in each target environment. In local smoke on 2026-06-17, Vercel resolved and returned `READY`; GitHub degraded through the reader because no app/PAT token was available in that shell, while `gh api` confirmed `main` and `develop` at the same SHA as Vercel.

### Revisit When

- More than one public site needs binding state.
- Public Site accumulates at least three reliability signals.
- Deploy/rollback commands need persisted audit/outbox records tied to this reader.
