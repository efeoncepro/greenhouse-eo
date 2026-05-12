---
name: web-perf-design-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global web-perf-design skill defaults. Load this first whenever web-perf-design is invoked inside this repo.
type: overlay
overrides: web-perf-design
---

# web-perf-design — Greenhouse Overlay

Load global `web-perf-design/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Pinned decisions

### 1. Field metrics source: Vercel Analytics (RUM) + CrUX

Greenhouse uses Vercel Speed Insights / Analytics. CrUX is secondary. Lab (Lighthouse, WPT) is for debugging only — NEVER for shipping decisions.

### 2. Per-route perf budgets (current)

| Route class | LCP (p75 field) | INP (p75 field) | CLS | First-load JS |
|---|---|---|---|---|
| Marketing / landing | ≤ 1.5 s | ≤ 150 ms | ≤ 0.05 | ≤ 150 KB |
| Dashboard / list | ≤ 2.5 s | ≤ 200 ms | ≤ 0.1 | ≤ 200 KB |
| Detail / drawer | ≤ 2.0 s | ≤ 200 ms | ≤ 0.1 | ≤ 220 KB |
| Heavy charting (ECharts) | ≤ 3.0 s | ≤ 250 ms | ≤ 0.1 | ≤ 300 KB |

ECharts adds ~280 KB gzipped — lazy load via `next/dynamic({ ssr: false })`. Greenhouse already uses this pattern; preserve it.

### 3. RSC by default — MUI is the friction

MUI 7.x supports RSC via `@mui/material-pigment-css` (experimental) but Greenhouse uses classic emotion stack. That means MOST `<Card>`, `<Typography>`, `<Box>` rendered with `sx` need to be in client components OR rendered via `mergedTheme` server-side. The current default in Greenhouse: client components for surfaces that use MUI heavily; RSC for layout chrome + data fetching.

**Pattern**: do server fetch + pass typed data as props to client component. NEVER `useEffect` to fetch.

### 4. Font stack — DM Sans + Poppins, preloaded

- DM Sans: variable, Latin-only subset, preloaded above fold.
- Poppins: variable, used for display only (marketing); lazy-loaded for product UI.
- Fallback metric overrides applied (eliminates CLS).

Files live in `src/assets/fonts/`. Preload in `app/layout.tsx`. `font-display: swap` always.

### 5. Image stack — Next.js Image + Vercel CDN

Use `<Image>` from `next/image` always. AVIF + WebP automatic via Vercel CDN. `priority` on LCP image. `sizes` math required.

NEVER `<img>` raw except for SVG icons (Tabler icons are inline SVG via `<i className='tabler-...' />` pattern).

### 6. Bundle hygiene — analyzed per PR

Run `pnpm build` + check `.next/analyze/` (already configured). Watch for:

- Date libraries (use `date-fns` modular imports, NEVER `moment`).
- Lodash (use `lodash-es` with named imports, or native).
- MUI icons (Tabler icons preferred — smaller, tree-shakes).
- Recharts (avoid; use ECharts per CLAUDE.md decision).
- `framer-motion` (full lib only when needed; otherwise CSS).

### 7. Edge runtime — selectively

Vercel Functions default to Node (Cloud SQL connector + Kysely require Node). Edge runtime only for:

- Middleware (auth check, locale, A/B cookie).
- Pure stateless endpoints (geo lookup, rate-limit gate).

NEVER move DB-touching routes to Edge.

### 8. Cron + heavy compute → ops-worker Cloud Run

Vercel functions have 800 s max + warm-start cost. Heavy compute (cost attribution materializer, payroll PDF generation, sync orchestration) lives in `ops-worker` Cloud Run (already canonized in CLAUDE.md). Hot path stays in Vercel; heavy ops async via outbox + reactive consumer.

### 9. INP hot spots known in Greenhouse

The historical INP killers:

- Bonus input slider in payroll review tables → fixed via TASK-743 density contract + `<InlineNumericEditor>`
- ECharts mount on tab change → lazy load + cap `animationDuration: 400`
- Massive `setState` after period selector change → use `useDeferredValue`
- Drawer open with heavy detail content → Suspense boundary inside drawer

### 10. CLS — verified at `/admin/operations` + main dashboards

These surfaces ship with skeleton sizing matched to final content. Audit them when shipping a new variant (KPI count change, chart swap, table column change).

## Compose with (Greenhouse skills)

- `frontend-architect-greenhouse-overlay` — RSC vs client topology dictates perf.
- `dataviz-design-greenhouse-overlay` — ECharts lazy load + animation caps.
- `motion-design-greenhouse-overlay` — compositor-only properties.
- `vercel-ops` — for runtime env + deploy logs.

## Version

- **v1.0** — 2026-05-11 — Initial overlay.
