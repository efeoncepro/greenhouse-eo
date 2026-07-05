# Gotchas & failure modes

Real traps, ranked by how often they bite. Astro-7-specific ones flagged.

## Hydration / islands

- **A plain `.astro` component won't be interactive** — no `client:*` = zero JS.
  If a button "does nothing," it's probably not an island.
- **Over-hydration**: `client:load` everywhere kills the perf story. Default
  `client:visible`.
- **`client:only` needs the framework name**: `client:only="react"`, not
  `client:only`. And it renders nothing on the server — give a sized fallback or
  you get layout shift.
- **Non-serializable props to islands** silently break — pass ISO strings, plain
  objects; no functions/class instances/live Dates.
- **Server-only imports in an island** (db client, secret) get bundled to the
  browser. Keep server work in the fence/action/endpoint.

## Forms / data

- **Form that only works via client-side `fetch`** → blank error if the fetch
  fails (the exact AEO grader failure). Use an **Action** with `accept: 'form'`
  and a real `<form action={actions.x}>` so it degrades. (`topics/actions.md`)
- **`await fetch` in a static route runs at build**, not per request — data is
  frozen at deploy. If you need freshness, the route must be `prerender = false`.
- **A single `Astro.cookies.get()` / `Astro.session` forces the route SSR** —
  it can no longer prerender. Sometimes surprising.

## Astro 7 strictness (Rust compiler)

- **Invalid HTML now ERRORS** instead of being auto-fixed: unclosed tags
  (`<p>hi`), bad nesting (`<p><div/></p>`), unterminated attributes. The error
  gives file+line — fix the markup, it's a real bug.
- **Whitespace stripped between inline elements** (`compressHTML: 'jsx'`):
  `<span>a</span><em>b</em>` renders `ab`. Add a literal space or `{' '}`:
  `<span>a</span>{' '}<em>b</em>`. Restore old behavior with `compressHTML: true`.
- **Markdown plugins stopped working after upgrade** → Sätteri is the new default;
  install `@astrojs/markdown-remark` + `markdown.processor: unified()` to get
  remark/rehype back.
- **`src/fetch.ts` suddenly "reserved"** → it's Advanced Routing now. Rename via
  `fetchFile: './src/router.ts'` or disable with `fetchFile: null`.
- **`@astrojs/db` import fails** → the package was removed in v7. Migrate to
  `node:sqlite` / Drizzle / Turso.
- **`TRANSITION_*` constant imports fail** → removed; use the event strings
  (`'astro:before-preparation'`, `'astro:after-swap'`, …).
- **Container test renderer import fails** → moved to
  `@astrojs/<fw>/container-renderer`.
- **Node 20 build fails** → v7 needs Node **22.12+**. Bump local + CI + host.

## Routing / rendering

- **Dynamic static route 404s** → you forgot to enumerate it in `getStaticPaths`,
  or the `params` key doesn't match the `[bracket]` name.
- **Page + endpoint collide** (`foo.astro` and `foo.ts`) → same route namespace.
- **Missing `site` config** → sitemap/canonical/RSS/absolute-OG break silently
  (or emit relative URLs).

## Styling

- **Styles "not applying"** → scoped styles only hit that component; use
  `is:global` or a global stylesheet for shared rules.
- **Using `@astrojs/tailwind`** → deprecated; switch to `@tailwindcss/vite`
  (Tailwind v4, CSS-first config).
- **Hardcoded brand HEX** → resolve from token CSS vars (AXIS). See
  `efeonce-overlay.md`.
- **Decorative class named like a Tailwind utility silently mutates** → a
  component class `.p-0`…`.p-13` (or `.m-2`, `.w-4`, `.gap-1`) COLLIDES with the
  Tailwind utility of the same name (`p-8` = `padding: 2rem`) and inflates your
  element. Symptom: tiny 4px particles rendering as big blurred blobs (looked
  like an accidental "feature" on the StatusScreen bokeh layer, 2026-07-05). Fix:
  prefix decorative/particle/bokeh classes distinctively (`.bk`, `.orbit`,
  `.dot`) — never `<letter><number>`.

## View Transitions

- **Vanilla `<script>` init doesn't re-run after navigation** → move it into an
  `astro:page-load` listener.
- **Using `<ViewTransitions />`** → renamed to `<ClientRouter />`.

## Deploy

- **SSR route 404 / build fail** → no adapter for an on-demand route.
- **Env change didn't take effect** → env vars don't hot-reload; redeploy.
- **Duplicate Vercel project** → stray CLI call without `--scope`; follow repo
  Vercel scope discipline (`CLAUDE.md`).
