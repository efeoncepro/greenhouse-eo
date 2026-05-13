# `readers/native/` — Native BFF readers (V1.1+)

V1.0 ships ZERO native readers. This folder is intentionally empty until a
reader emerges that cannot live in a producer domain.

## When to add a native reader

A reader belongs here when **all three** of these conditions hold:

1. The read is exclusively for the `client` route group (or other surfaces
   that compose through the BFF).
2. No existing producer domain (`account-360`, `agency`, `ico-engine`,
   `commercial`, `finance`, `delivery`, `identity`) has natural ownership of
   the data being read.
3. The reader requires composition / shaping logic that is genuinely BFF-only
   (e.g. assembling a client-facing snapshot from multiple producer readers).

The first expected candidate is `resolveClientPortalModulesForOrganization`
introduced by TASK-825, which queries `greenhouse_client_portal.modules`
(owned by client_portal itself — no upstream producer).

## Convention

When you add a native reader file `foo.ts`, declare its metadata with:

```ts
import type { ClientPortalReaderMeta } from '../../dto/reader-meta'

export const fooMeta: ClientPortalReaderMeta = {
  key: 'foo',
  classification: 'native',
  ownerDomain: null, // native readers MUST set null (invariant enforced)
  dataSources: ['<producer.surface>', ...],
  clientFacing: true,
  routeGroup: 'client'
}

export const foo = async (...) => { /* implementation */ }
```

And re-export both from `./index.ts`.

## Anti-patterns

- ❌ "Promoting" a re-export from `curated/` to `native/` because a thin
  adaptation was added. If the signature must adapt, keep `ownerDomain`
  pointing to the upstream source (it remains the data owner); but if the
  composition becomes substantive, copying the underlying logic is the
  wrong move — extend the producer module's API instead.
- ❌ Moving a producer-domain reader physically into `native/`. The BFF
  surfaces readers; it does not own them.

Spec: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §3.1.
