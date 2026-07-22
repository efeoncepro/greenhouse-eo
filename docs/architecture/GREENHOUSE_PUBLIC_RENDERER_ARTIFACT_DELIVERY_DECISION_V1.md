# Public Renderer Artifact Delivery Decision V1

- Status: Accepted
- Date: 2026-07-22
- Owner: Growth / Public Site / Platform
- Scope: portable public renderers; first adopter is Growth Meetings
- Decision confidence: high
- Reversibility: two-way, by atomic alias rollback

## Context

The meeting scheduler API is owned by Greenhouse, but its browser renderer was emitted by every Greenhouse `prebuild`. The build defaulted to `preview`, overwrote `renderer-latest.js`, and `/agenda/` consumed that mutable alias. `renderer-stable.js` was not live. Consequently an unrelated application deployment could change the public scheduler, while JS and icon CSS could come from different builds.

## Decision

Presentation artifacts are released independently from the Greenhouse application:

1. `efeonce-public-renderers` is a dedicated Vercel static project. It owns no API, secrets, booking state or WordPress content.
2. A release is content-addressed at `/releases/<releaseId>/` and contains `renderer.js`, `icons.css` and `manifest.json`. JS and CSS hashes plus SRI are recorded in the manifest.
3. `/channels/stable.json` is the only mutable pointer. `/loader.js` resolves it without cache, installs CSS and JS from the same release, and exposes matching DOM release markers.
4. Release assets use `Cache-Control: public, max-age=31536000, immutable`; loader, channel and health use revalidation. CORS and `nosniff` are mandatory.
5. Promotion is staged: build → local verification → isolated production deployment → health/release match → atomic stable alias assignment. Rollback assigns the stable alias to a previously verified deployment.
6. WordPress embeds the stable loader. `base-url` remains the Greenhouse API origin, preserving the existing origin/binding/provider contract.
7. Greenhouse may continue producing preview bundles for its own build and design-system preview, but those files do not control `/agenda/`.

## Boundary and consequences

- A visual renderer change no longer requires a Greenhouse application production release.
- API/schema/provider changes still follow the Greenhouse release control plane.
- The renderer lane is intentionally not a worker of the Greenhouse production orchestrator. It has its own static project, health resource, release evidence and rollback command.
- Legacy direct embeds can still load their colocated `icons.css`; the stable loader takes precedence when present.
- A release can fail before promotion without changing the stable URL. After promotion, existing cached immutable assets remain valid and rollback does not require rebuilding.

## Alternatives considered

- Keep `renderer-latest.js` in the Greenhouse app: rejected because application builds mutate public presentation.
- Store files directly in WordPress/Kinsta: rejected because it couples source, cache invalidation and rollback to CMS mutation.
- GCS plus Cloud CDN: technically sound, deferred because the dedicated Vercel static project provides the required immutable caching and atomic alias with less new infrastructure.

## Operational contract

- Build: `RENDERER_SOURCE_SHA=<git-sha> pnpm renderer:meeting:site:build`
- Verify: `pnpm renderer:meeting:site:verify`
- Release: `RENDERER_SOURCE_SHA=<git-sha> pnpm renderer:meeting:site:release`
- Rollback: `pnpm renderer:meeting:site:release -- --rollback=<previous-deployment>.vercel.app`
- Stable health: `https://efeonce-public-renderers.vercel.app/health.json`
- Stable loader: `https://efeonce-public-renderers.vercel.app/loader.js`

Revisit if the renderer fleet requires signed manifests, regional edge controls, multiple independently promoted channels, or a non-Vercel delivery plane.
