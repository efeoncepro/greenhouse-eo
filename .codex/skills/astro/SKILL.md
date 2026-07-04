---
name: astro
description: >-
  Robust Astro 7 architecture + reference skill. Islands / partial hydration,
  rendering modes (static / server / on-demand / prerender), Content Layer +
  Content Collections, Astro Actions, routing + getStaticPaths, endpoints +
  middleware + sessions, astro:assets images, astro:env typed env, View
  Transitions (ClientRouter), route caching (Astro.cache), Advanced Routing
  (src/fetch.ts), Vercel/Node adapters + deploy, performance (zero-JS default),
  and SEO/AEO for content sites. Use for any .astro work, hydration decisions,
  build/deploy of an Astro site, or the efeonce-think public hub. Triggers on
  "astro", ".astro", "client:load", "client:visible", "content collections",
  "content layer", "astro actions", "getStaticPaths", "server island",
  "view transitions", "astro:env", "astro adapter", "efeonce-think".
compatibility: >-
  Targets Astro 7.x (released 2026-06-22, Node 22.12+). Composes with — does not
  duplicate — seo-aeo, vercel-ops / greenhouse-cloud-run-integrations, gsap,
  motion-design, web-perf-design, modern-ui, forms-ux. Facts pinned against the
  official Astro 7.0 release notes + v7 upgrade guide.
argument-hint: "[astro topic, .astro file, hydration/render/deploy concern]"
---

# Astro 7

Senior Astro engineer + architecture advisor for **Astro 7.x** content-first
sites and hybrid apps. This skill is a **router**: it loads only the topic file
the task needs, and it **defers** SEO, motion, deep performance, and deploy to
the skills that already own them.

The north star for this repo's Astro work is **efeonce-think** — the public hub
that renders the AI Visibility / Brand Grader report as a "dumb render" of a
Greenhouse headless model. When a task is about efeonce-think, **read
`efeonce-overlay.md` first** — it pins the repo-specific decisions that override
generic Astro advice.

---

## Load order

1. Always read this `SKILL.md`.
2. If the task is about efeonce-think, read **`efeonce-overlay.md`**.
3. Read the matching topic file(s) from the routing table below. **Never load
   the whole skill at once** — the value is loading only what the task needs.
4. If upgrading a codebase, read **`migration/v6-to-v7.md`**.

---

## When to invoke / routing table

| Task / trigger | Read |
|---|---|
| static vs SSR vs on-demand, `output`, per-route `prerender`, hybrid | `topics/rendering-modes.md` |
| "should this be an island?", `client:*` directives, server islands, over-hydration | `topics/islands-hydration.md` |
| content-driven site, `src/content.config.ts`, loaders, Zod schema, `getCollection`, Content Layer | `topics/content-layer.md` |
| `.astro` syntax, slots, scoped styles, `class:list`, `set:html`, `define:vars` | `topics/astro-components.md` |
| React/Vue/Svelte/Solid islands, shared state between islands (stores) | `topics/framework-islands.md` |
| file-based routes, `[param]`, `[...rest]`, `getStaticPaths`, redirects, i18n | `topics/routing.md` |
| top-level `await` fetch, build-time vs request-time data, `Astro.props`/`params` | `topics/data-fetching.md` |
| API endpoints, `src/middleware.ts`, `Astro.session`, cookies, `context.locals` | `topics/endpoints-middleware.md` |
| type-safe server functions + form handling (the AEO grader form) | `topics/actions.md` |
| `<ClientRouter />`, SPA-like nav, `transition:*`, persistence | `topics/view-transitions.md` |
| `<Image>`/`<Picture>`, `astro:assets`, remote images, optimization | `topics/images-assets.md` |
| typed env (`astro:env`), public vs secret, `astro.config.mjs`, Vite 8 | `topics/env-config.md` |
| scoped CSS, Tailwind v4 (`@tailwindcss/vite`), CSS vars ↔ AXIS tokens | `topics/styling.md` |
| Vercel/Node/Cloudflare adapter, SSR deploy, `src/fetch.ts` advanced routing | `topics/adapters-deploy.md` |
| zero-JS default, prefetch, bundle, route caching (`Astro.cache`), CWV | `topics/performance.md` |
| `<head>` meta, sitemap, RSS, JSON-LD, `llms.txt`, crawlability | `topics/seo-aeo.md` |
| `.md`/`.mdx`, Sätteri vs remark/rehype, plugins | `topics/markdown-mdx.md` |
| Container API tests, Vitest, Playwright, `astro check` | `topics/testing.md` |
| upgrading v5/v6 → v7, breaking changes, removed APIs | `migration/v6-to-v7.md` |
| config keys at a glance | `reference/config-cheatsheet.md` |
| every `client:*` / `set:*` / `is:*` / `transition:*` directive | `reference/directives-table.md` |
| "why is this broken / rendering wrong" | `reference/gotchas.md` |

If the question is a one-line lookup and you already know the answer cold,
answer directly. This skill is for decisions, unfamiliar API, and anything the
codebase will keep.

---

## Defer to / compose with (do NOT reimplement here)

| Concern | Owner skill |
|---|---|
| SEO strategy, AEO/GEO, structured data content, `llms.txt` policy | `seo-aeo` (this skill only shows the Astro *wiring*) |
| Vercel project/env/deploy operations, protection bypass | `vercel-ops` / repo Vercel discipline in `CLAUDE.md` |
| Motion systems, scroll-driven, GSAP timelines | `gsap`, `motion-design` |
| Deep perf budgets, CWV thresholds, skeleton sizing | `web-perf-design` |
| Visual/component design, tokens, elevation | `modern-ui`, `typography-design` |
| Form UX (validation timing, error recovery, masks) | `forms-ux` (this skill shows the Astro Actions *mechanism*) |
| Accessibility floor (WCAG, aria) | `a11y-architect` |
| **Architecture decisions** (shape, reversibility, SSOT, schema, governed contract) | `arch-architect` (Claude) / `software-architect-2026` (Codex) — see synergy below |

Astro-specific structure (rendering mode, hydration boundary, data flow, adapter,
route shape) stays **here**. Domain content and cross-framework doctrine go to
the owner skill. For *peer / implementation* skills, run this skill first to
decide the Astro shape, then defer. For *architecture*, the direction inverts —
see the handoff contract next.

### ⚙️ Architecture synergy — the handoff contract (bidirectional)

The architecture skill (`arch-architect` on Claude, `software-architect-2026` on
Codex) and this skill are **direct partners**. Split of ownership:

- **Architecture owns the SHAPE** — reversibility / blast-radius, the 4-pillar
  scoring, SSOT & domain boundaries (the *what-computes-where* line, e.g. the
  efeonce-think dumb-render boundary), canonical-primitive-vs-new-entity,
  schema/migration, multi-tenant data exposure, and whether a capability needs a
  governed contract (Full API Parity). "Static vs SSR" **as a structural call**
  starts there.
- **Astro owns the IMPLEMENTATION** — `output`/`prerender` wiring, island
  boundaries + `client:*`, Content Layer modeling, Actions/endpoints, adapter +
  deploy, View Transitions, perf/cache wiring.

Who moves first:

| The task smells like… | Run FIRST | Then |
|---|---|---|
| "design / model / right architecture / blast radius / reversible / SSOT / new entity / schema / governed write-path / multi-tenant" | **architecture skill** (decide the shape) | come here to implement it in Astro |
| "which `client:*` / static-or-SSR wiring / model this collection / adapter / route shape" | **this skill** | escalate up **only if** it turns into a shape decision |

**Hand UP to the architecture skill when** an Astro question is really an
architecture question: the dumb-render / SSOT boundary itself, whether
efeonce-think should own any logic, a new governed write-path (the AEO grader
form), multi-tenant data exposure, or a hard-to-reverse structural choice. Decide
the shape there; implement it here. The architecture skill routes *back* here for
the Astro specifics — the loop closes on both ends.

---

## Astro's core mental model (memorize)

1. **Zero JS by default.** Every page is HTML. JavaScript ships only for the
   components you explicitly mark interactive (`client:*`). This inverts the
   SPA default — you *opt in* to hydration cost, per-island.
2. **Islands are isolated.** Each hydrated component boots independently. A
   failing island does not take down the static page around it. There is no
   shared component tree between islands — cross-island state needs an external
   store (nanostores) or custom events.
3. **The `---` fence runs on the server** (build-time for static, request-time
   for SSR). It never ships to the client. Put data fetching, secrets, and
   heavy logic there.
4. **Content is a first-class data source.** Content Collections + the Content
   Layer give you typed, validated content with build-time loaders. A content
   site should model content as collections, not ad-hoc `fs` reads.
5. **Rendering mode is per-route, not per-app.** With a server adapter you still
   `prerender` the static routes; you pay SSR only where a route genuinely needs
   request-time data.
6. **Astro 7 is Rust under the hood.** Rust compiler + Sätteri Markdown + Vite 8
   / Rolldown. Faster, but **stricter** — invalid HTML now errors loudly instead
   of being silently auto-corrected. Treat compiler errors as real bugs in your
   markup, not noise.

---

## Decision defaults (opinionated)

- **Content-first, sparse interaction** (report hubs, landings, docs, blogs) →
  **`output: 'static'`** (SSG) + a few islands. This is efeonce-think.
- **Per-route data at request time** (personalized dashboards, auth) → server
  adapter + `prerender = false` only on those routes; everything else stays
  prerendered.
- **Below-the-fold interactivity** → `client:visible`. **Above-the-fold and
  critical** → `client:load`. **Nice-to-have** → `client:idle`. Default to the
  laziest directive that still feels instant.
- **Content** → Content Collections with a Zod schema. Never scatter raw `fs` /
  `import.meta.glob` reads for structured content.
- **Server logic a form or client calls** → **Astro Actions** (type-safe,
  progressive-enhancement-friendly) over hand-rolled `POST` endpoints, unless
  you need a public REST contract.
- **Styling** → scoped `<style>` by default; Tailwind v4 via `@tailwindcss/vite`
  (NOT the deprecated `@astrojs/tailwind` integration); brand as CSS variables.
- **Markdown plugins** → if you rely on remark/rehype, install
  `@astrojs/markdown-remark` and set `markdown.processor: unified()`; otherwise
  ride the faster Sätteri default.

---

## Hard rules (anti-regression)

- **NEVER** put business logic (scoring, model derivation, pricing, decisions)
  inside an island of a "dumb render" site like efeonce-think. The island sends
  data and renders a result; the headless model computes. (SSOT.)
- **NEVER** ship a form/CTA that exists *only* via a client-side `fetch`. Resolve
  the contract server-side and render a real `<form>` that degrades without JS,
  then hydrate for UX. (This is exactly the failure class seen on the AEO grader
  embed.)
- **NEVER** over-hydrate: reading content that never changes must stay zero-JS.
  `client:load` on a static section is pure dead weight.
- **NEVER** transcribe Astro API from memory when the codebase is on a specific
  minor and you're unsure — check `docs.astro.build` and mark `[verify]`.
- **NEVER** rely on Astro auto-fixing invalid HTML in v7. It errors now. Fix the
  markup.
- **NEVER** read secrets via `import.meta.env` public vars or expose them to an
  island. Server-only secrets go through `astro:env/server`.
- **SIEMPRE** declare `export const prerender` explicitly on routes when the app
  uses a server/hybrid `output` — don't leave the mode ambiguous.
- **SIEMPRE** put the interactive boundary as low in the tree as possible: one
  small island beats hydrating a whole layout.

---

## 4-pillar lens (apply to any Astro architecture call)

- **Safety** — what runs on the client vs server; no secrets or business logic in
  islands; forms degrade + validate server-side.
- **Robustness** — invalid-HTML errors are caught at build (v7 strictness is a
  feature); islands fail in isolation; content is schema-validated at build.
- **Resilience** — static routes survive an island failure; a server route's
  data fetch has a fallback state (compose with `state-design`); route caching +
  SWR absorb upstream hiccups.
- **Scalability** — SSG scales to CDN for free; SSR paths are the minority and
  cache-guarded; a new topic/section is a new file, not a rebuild of the shell.

---

## File map

```
astro/
├── SKILL.md                    # this router
├── efeonce-overlay.md          # repo-specific pins (read first for efeonce-think)
├── topics/
│   ├── rendering-modes.md
│   ├── islands-hydration.md
│   ├── content-layer.md
│   ├── astro-components.md
│   ├── framework-islands.md
│   ├── routing.md
│   ├── data-fetching.md
│   ├── endpoints-middleware.md
│   ├── actions.md
│   ├── view-transitions.md
│   ├── images-assets.md
│   ├── env-config.md
│   ├── styling.md
│   ├── adapters-deploy.md
│   ├── performance.md
│   ├── seo-aeo.md
│   ├── markdown-mdx.md
│   └── testing.md
├── migration/
│   └── v6-to-v7.md
└── reference/
    ├── config-cheatsheet.md
    ├── directives-table.md
    └── gotchas.md
```
