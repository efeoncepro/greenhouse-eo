# `src/lib/client-portal/` — Client Portal BFF / Anti-Corruption Layer

> TASK-822 (EPIC-015 child 1/8). Spec: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`.

## What this folder IS

A **Backend-for-Frontend (BFF) / Anti-Corruption Layer** for the `client`
route group of the Greenhouse portal. It surfaces readers from producer
domains (`account-360`, `agency`, `ico-engine`, `commercial`, `finance`,
`delivery`, `identity`) curated for client-facing consumption, and hosts
native composition helpers when no producer domain owns the data.

## What this folder is NOT

- **NOT** a data owner. Re-export does NOT transfer ownership. If you find
  yourself wanting to move a reader physically from `account-360/` to
  `client-portal/readers/curated/`, stop: the reader belongs in its producer
  domain; this folder only points at it.
- **NOT** an importable target from producer domains. `client_portal` is a
  **leaf of the DAG**. The ESLint rule `greenhouse/no-cross-domain-import-from-client-portal`
  blocks the inverse direction at commit time.

## Layout

```text
src/lib/client-portal/
├── README.md                                # this file
├── index.ts                                 # public barrel
├── dto/
│   ├── reader-meta.ts                       # ClientPortalReaderMeta contract
│   └── index.ts
├── readers/
│   ├── index.ts
│   ├── curated/                             # re-exports from producer domains
│   │   ├── index.ts
│   │   ├── account-summary.ts               # ← shipped V1.0 Slice 4
│   │   └── ico-overview.ts                  # ← shipped V1.0 Slice 4
│   └── native/                              # born here; empty V1.0
│       └── README.md
└── helpers/
    └── index.ts                             # placeholder V1.0
```

## Module classification (spec §3.1)

Every reader file under `readers/` declares its metadata via
`ClientPortalReaderMeta` (from `./dto/reader-meta.ts`):

- `curated` — pure re-export of a producer-domain reader. `ownerDomain` is
  non-null. Examples: `account-summary.ts`, `ico-overview.ts`.
- `native` — born here because no producer domain owns the data.
  `ownerDomain` is `null`. Examples (V1.1+): resolver of TASK-825.

The classification + ownerDomain invariants are enforced by
`assertReaderMeta()` (runtime, used in tests).

## Domain import direction (spec §3.2)

`client_portal` is a **leaf of the DAG**:

```text
Allowed:    client-portal/**  →  producer-domain/**
Prohibited: producer-domain/**  →  client-portal/**
```

Enforcement:

1. ESLint rule `greenhouse/no-cross-domain-import-from-client-portal`
   (modo `error`, TASK-822 Slice 3).
2. Override block in `eslint.config.mjs` exempts `src/lib/client-portal/**`
   itself and the rule's test fixtures.
3. Doctrine canonized in `CLAUDE.md` under the BFF invariants section.

## Observability

Sentry domain `client_portal` is registered in `src/lib/observability/capture.ts`
(TASK-822 Slice 2). Use:

```ts
import { captureWithDomain } from '@/lib/observability/capture'

try {
  await someClientPortalRead(...)
} catch (err) {
  captureWithDomain(err, 'client_portal', { extra: { orgId } })
  throw err
}
```

## Roadmap

| Slice | Task | What lands |
|---|---|---|
| 1 | TASK-822 | Folder + DTO + barrels + Sentry whitelist + ESLint rule + 2 curated re-exports |
| 2 | TASK-823 | `/api/client-portal/*` namespace (read endpoints) consuming this module |
| 4 | TASK-825 | First **native** reader: resolver of `modules` per organization |
| 6 | TASK-827 | UI composition layer consuming this module from `(client)/*` |

Producer-domain readers should be added to `readers/curated/` here when a
client-portal consumer needs them. NEVER move them physically from their
owner domain.
