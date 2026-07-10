# Greenhouse Build Unit Decomposition Architecture V1

## Objective

Reduce cost and feedback time by making Greenhouse independently buildable by product surface, without turning transactional domains into premature microservices.

## Target Platform

```text
greenhouse-eo repository
├── apps/portal       authenticated product + presentation BFF
├── apps/labs         design-system labs and governed mockups
├── apps/public       future candidate; only with measured boundary
├── packages/ui       browser-safe primitives/tokens
├── packages/contracts versioned DTOs/capabilities/errors
├── packages/auth     server entrypoint + browser-safe contract split
├── packages/db       server-only connection and transaction chokepoint
├── packages/domain-* domain commands/readers; extracted only by demand
├── services/*        existing and future async/worker runtimes
├── tooling/*         build, lint, affected graph and release tooling
└── docs/*            architecture and operating contracts
```

This is an evolutionary target, not permission to create every directory. TASK-1382 may create only the minimum workspace, Labs app and packages required to demonstrate isolation.

## Migration Sequence

1. **Economic ledger and graph:** preserve invoice evidence; measure build duration, peak tree RSS and project trigger by change class.
2. **Labs pilot:** extract pure-UI Labs pages, share only tokenized browser-safe UI, and keep coupled/API pages in Portal.
3. **Affected builds:** a Labs-only commit builds Labs, a Portal-only commit builds Portal, shared package changes build both.
4. **Preview routing/auth:** validate navigation, session posture, deep links, CSP/CORS and rollback without production cutover.
5. **Measured cutover:** remove duplicate Portal routes only after thresholds pass.
6. **Next boundary selection:** compare Admin, Public and API using graph size, change affinity, data coupling, security and TCO.

## Boundary Rules

- Route ownership is singular after cutover; temporary duplication is allowed only during an explicitly dated pilot.
- Labs cannot import `@/lib/db`, server actions, filesystem readers, domain commands or portal-private aliases.
- Browser packages cannot export server modules. Conditional exports and lint boundaries enforce the split.
- Shared changes legitimately build all consumers. “Affected build” does not mean hiding shared impact.
- Cookies or auth tokens are not copied casually across domains; preview access starts with Vercel protection or the existing governed auth contract.
- Rewrites/proxies do not become permanent architecture without ownership, timeout, error and observability contracts.

## New Work During Migration

Development does not stop:

- new Portal product features continue under `src/app`/future `apps/portal` and declare their candidate home;
- new Design System demos target Labs once its foundation exists;
- new backend capabilities stay behind canonical commands/readers/API primitives;
- no feature creates its own deployable, auth adapter, DB pool or generic shared package;
- a task touching shared packages must state which deployables rebuild and why.

## Measurement

Each experiment records:

- local clean/warm duration and peak process-tree RSS;
- Vercel queued/build/ready duration by project and machine type;
- build trigger matrix for Portal-only, Labs-only and shared changes;
- build CPU minutes/cost from invoice or FOCUS charge export;
- failure/timeout rate and rollback time.

The economic target is not merely a faster Labs build. The portal must avoid unrelated builds and show measurable graph reduction.

## Eventually

Users continue seeing one Greenhouse platform. Internally, Portal, Labs and later justified surfaces release independently. Business data remains coherent behind one governed domain/data plane; deployables are delivery boundaries, not duplicate products. Local work runs only the app and packages being changed, while a full integration path remains available before release.

