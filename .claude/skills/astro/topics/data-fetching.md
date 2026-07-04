# Data fetching

Data is fetched in the **component script** (the `---` fence), which runs on the
server. Astro supports top-level `await`, so you fetch directly — no
`useEffect`, no loading spinner for the initial render.

## Build-time vs request-time

**The same `await fetch()` means different things depending on the route's
rendering mode:**

- **Static route** → the fetch runs **at build time, once**. The result is baked
  into HTML. Great for content that's the same for everyone and refreshed on
  deploy.
- **On-demand route** (`prerender = false`) → the fetch runs **per request**.
  Use for per-user or freshness-critical data.

```astro
---
// Static: fetched at build, baked into the page
const reports = await fetch('https://api.example.com/reports').then((r) => r.json())
---
{reports.map((r) => <li>{r.title}</li>)}
```

```astro
---
// Request-time: fresh every hit
export const prerender = false
const live = await fetch('https://api.example.com/live').then((r) => r.json())
---
```

## Prefer collections for structured content

For content with a shape, don't hand-fetch — model it as a Content Collection
with a loader (build-time, validated, typed). See `topics/content-layer.md`. Raw
`fetch` is for one-off/dynamic data that isn't a content type.

## Passing data to islands

Fetch on the server, pass **serializable** props into the island. Don't fetch
inside the island on mount if the server can fetch it — that reintroduces the
spinner and the waterfall you came to Astro to avoid.

```astro
---
import Chart from '../components/Chart.tsx'
const series = await getSeries()          // server fetch
---
<Chart client:visible data={series} />    {/* island gets data as a prop */}
```

Exception: data that genuinely depends on client state (user interaction after
load) is fetched in the island — ideally via an **Action** (`topics/actions.md`)
for type-safety.

## Error & empty states

A server fetch that fails should not blank the page or show `$0`. Catch it and
render an honest degraded state (compose with `state-design`): show "Pendiente"
/ "No pudimos cargar…" with a cause, not a fake zero. On a static build, a failed
fetch **fails the build** — which is usually what you want (don't ship a broken
page); guard with a fallback only when partial content is acceptable.

## Astro 7: route caching for request-time fetches

For SSR routes that fetch upstream, wrap the response in route caching so you're
not hammering the origin every hit — `Astro.cache.set({ maxAge, swr, tags })`.
SWR keeps serving valid-stale data if the upstream blips (resilience). See
`topics/performance.md`.

## Hard rules

- **NEVER** fetch in an island on mount what the server could fetch and pass as a
  prop.
- **NEVER** show a fake `0` on fetch failure — degrade honestly with a reason.
- **SIEMPRE** know whether your `await fetch` is running at build or per request —
  it's determined by the route's `prerender`.
