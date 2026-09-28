---
name: dataviz-design-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global dataviz-design skill defaults. Load this first whenever dataviz-design is invoked inside this repo.
type: overlay
overrides: dataviz-design
---

# dataviz-design — Greenhouse Overlay

Load global `dataviz-design/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Pinned decisions

### 1. Stack canónico — ECharts > Apex > Recharts (already in CLAUDE.md)

- **Nuevas vistas con dashboards de alto impacto** (MRR/ARR, Finance, ICO, Pulse, Portfolio): **Apache ECharts** vía `echarts-for-react`. Lazy load.
- **Vistas existentes con ApexCharts** (32 archivos al 2026-04-26): siguen activas. Migración Apex → ECharts es oportunista.
- **NO usar Recharts** para vistas nuevas.

Razón: ECharts gana en visual atractivo (10/10), enganche, cobertura de tipos (heatmap, sankey, geo, sunburst, calendar).

### 2. Lazy load mandatory

ECharts adds ~280 KB. ALWAYS `next/dynamic({ ssr: false })`:

```tsx
const RevenueChart = dynamic(() => import('./RevenueChart'), {
  loading: () => <Skeleton variant='rectangular' height={320} />,
  ssr: false
})
```

### 3. Color palette — Greenhouse customColors first

NEVER bare hex in chart configs. Use:

- `theme.palette.primary.main` (#7367F0) — primary series
- `theme.palette.customColors.success` (#6ec207 lime) — improving deltas (better for the metric, not merely "up"; see §4)
- `theme.palette.customColors.warning` (#ff6500) — warning
- `theme.palette.customColors.error` (#bb1954) — negative
- `theme.palette.customColors.info` (#00BAD1) — neutral / informational

For categorical (>5 series), use Tol's qualitative palette (colorblind-safe up to 12). Already exported in `src/lib/charts/palettes.ts`.

### 4. KPI cards — `<KpiCard>` primitive (compose with `<EmptyState>` for degraded)

Greenhouse has `src/components/greenhouse/KpiCard/` primitive. Use it. Anatomy:

- Title (`subtitle1`) + tooltip
- Value (`h3` + `tabular-nums`) — NEVER monospace
- Currency suffix (`caption`, neutral)
- Delta chip (icon + color + text, NEVER color alone)
  - **Variation rule (tables and figures):** the triangle follows the VALUE (▲ went up, ▼ went down); the TONE says whether the change is better or worse FOR THAT METRIC. A rank position that goes ▲ is worse; a lower-is-better ratio that goes ▼ is better. Metric direction comes from data, in order: the direction the fact itself declares; positions are always lower-is-better; the direction of a reference fact (target/band) for the same metric. Unknown direction ⇒ neutral tone, never guessed (never "up = green"). Reference implementation: `trendOf` / `higherIsBetterOf` in `src/lib/efeonce-insights/render/figure-slots.ts`.
- Comparison period (`caption`, "vs mes anterior")
- Optional sparkline (small ECharts line, no axis)

Honest degradation: when value is `null` from `SourceResult`, show "Pendiente" + tooltip with reason, NEVER `$0`.

### 5. Axis design — start at 0 for bars, ISO date format

Bars: `min: 0`. Lines: optional 0 (use scale that shows the change).

Time format: `dd MMM` (es-CL). For multi-year: `dd MMM yyyy`. NEVER `M/D/YY` American format.

**Inverted axis (lower = better, e.g. rank position): an area MUST declare its `baseValue`.** An area's base defaults to the axis zero; with the axis inverted that zero sits at the TOP, so the gradient paints OVER the line as a floating blob instead of filling under it. In Recharts (`<Area>` + `<YAxis reversed>`) the fix is `baseValue='dataMax'` — see `MetricTrendCard` (`invertY`). Runtime-only defect: lint, types and tests all pass while the chart is wrong, so it is only caught by looking at the frame.

### 6. Tooltip — multi-series ✓ but cap to 5 lines

ECharts default tooltip is rich. Override formatter when >5 series to scroll or summarize. Honor reduced motion (instant show/hide).

### 7. Animation — `animationDuration: 400`, decel easing

```ts
{
  animationDuration: 400,
  animationEasing: 'cubicOut'
  // disable on reduced motion
}
```

### 8. Accessibility — `aria-label` on chart container + table fallback

Every chart container has `role="img" aria-label="<descripción>"`. Below the chart, a `<details><summary>Ver datos</summary><table>...</table></details>` for screen readers + keyboard users.

### 9. Real KPIs (TASK-758 etc.) — `tabular-nums`, never monospace

Numbers use `fontVariantNumeric: 'tabular-nums'` on Geist Sans / DM Sans, NEVER `fontFamily: 'monospace'`. Already canonized in TASK-758 receipt presenter.

### 10. Greenhouse-specific patterns

- ICO scorecard heatmap — categorical × period
- MRR/ARR cohort waterfall — stacked bar over time
- Finance cash-out — area + brush selector
- Payroll period summary — stacked bar by régimen (chile_dependent / honorarios / international_deel / international_internal) — uses `RECEIPT_REGIME_BADGES` tokens (TASK-758)

### 11. Annotating a chart with external facts — curated registry only

When a chart is annotated with real-world events (algorithm updates, regulatory changes, campaigns), the registry admits **only facts confirmed by the authoritative source**, each carrying its verification source, with a dated verification per batch and deliberate manual maintenance. Painting a third-party rumour as a band on a client's chart is fabricating context, and the client cannot tell the difference. Reference implementation: `src/lib/growth/seo/algorithm-updates.ts` (`CONFIRMED_ALGORITHM_UPDATES` + `algorithmUpdatesInRange`, rendered as ECharts `markArea`). Automating it against a third-party feed is a declared follow-up, never an implicit TODO.

### 12. Gauges — deterministic SVG arc, NOT Apex `radialBar` in a fluid container

ApexCharts `radialBar` **measures 0 on mount inside a fluid container and simply does not draw** — no error, no warning, build green, tests green. Same defect class as §5: only visible by looking at the frame. For a single-value gauge the canonical is a **deterministic SVG arc** — `src/views/greenhouse/admin/growth/seo/shared/SeoHealthGauge.tsx` (TASK-1306, shared by the SEO overview and the site audit so both screens keep one set of thresholds). It measures nothing, needs no library and costs no bundle.

Only reach for `radialBar` when the container has explicit dimensions AND you verified it in GVC. General corollary: **any chart that derives its size from its container is suspect** inside fluid layouts, hidden tabs, collapsed accordions, and Playwright `fullPage` capture (which resizes the viewport and yields empty cards that look like a bug that isn't there — use `clipSelector`).

### 13. Two adjacent numbers measured by different instruments must say so

"Salud 95" next to "519 issues" reads as a screen bug. It isn't: the score is the **provider's** own weighting (it weights what breaks indexing) and the count comes from **our** curated check catalog. A site with no critical issues can carry hundreds of minor ones and still score high.

Rule: in a KPI row, any figure whose **provenance** differs from its neighbours — an in-house estimate, a third party's weighting, a sample instead of a census, a lab measurement instead of field data — declares that difference **on the surface**, not in the docs. When the explanation flips with the data, the copy flips too: "sin críticos se mantiene alto aunque haya muchos menores" vs "los críticos son los que más lo bajan". Reference: `GH_GROWTH_SEO_AUDIT.kpi.healthScope*` + `issues.effortHint` (TASK-1309).

### 14. Brand social pieces are not portal charts — no ECharts; the chart grammar is the brand's

Decisions 1–13 govern charts inside the Greenhouse portal. A chart on an Efeonce brand social piece (carousel slide, story, blog image) is **not** built with ECharts, Apex or Recharts: it is deterministic SVG computed from its data, and it follows the grammar of the graphic line «La órbita» and, for **Marketing con Manzanitas** pieces, the **registro Marketing con Manzanitas** (approved 2026-09-28; it complements La órbita, it does not replace it). Norm: [`MANZANITAS_REGISTER_V1.md`](../../../docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) + `efeonce-graphic-line` → `references/manzanitas.md`.

- **The only donut is the orbit's measure** (the sphere at value × 360° from 12 o'clock, clockwise, short trail; geometry from AXIS `measureSvg`). **No parts donut**: an orbit travels, it never fills. Parts (up to 3) go in a 100 % bar.
- **One sphere per piece**; in the measure and the trend the sphere *is* the datum, so those slides carry no voice sphere. **No loose circle** in a chart: counts go in squares, the Venn in translucent discs without a ring.
- **One accent, only where the idea is**; everything else in navy and gray. The accent is the theme's service line (`efeonceGraphicLine.lines`) and **never text under 24 px**.
- **Bars grow from their number** and start at zero; none is drawn by hand. The template only paints: the slide logic receives `datos` or `valor` and computes lengths, positions, the sphere, the highlight and any numeric answer.
- **Figures with source**; sample data is marked «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» until the real one exists. Without a source, the figure does not ship.

The nine chart recipes (Medida en la órbita, Ranking, Antes y después, Tendencia, Partes de un todo, De cada 100, Venn de tres, Matriz 2 × 2, Embudo) are approved **only for Marketing con Manzanitas**; whether they pass to La órbita for other Efeonce pieces is pending. None of the register is in AXIS yet: the source is the [canvas v39](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG) (boards `Grafico-1…9`).

## Compose with (Greenhouse skills)

- `web-perf-design-greenhouse-overlay` — lazy load + bundle budgets.
- `motion-design-greenhouse-overlay` — animation duration caps.
- `a11y-architect-greenhouse-overlay` — chart a11y contract.
- `greenhouse-ux-writing` — chart titles + tooltips + axis labels.

## Version

- **v1.3** — 2026-09-28 — pinned decision 14 (brand social pieces do not use ECharts; they follow the chart grammar of La órbita and of the registro Marketing con Manzanitas).
- **v1.2** — 2026-08-08 — TASK-1309: pinned decision 12 (Apex `radialBar` measures 0 in a fluid container; deterministic SVG arc is the canonical gauge) and 13 (adjacent KPIs with different provenance declare it on the surface).
- **v1.1** — 2026-08-07 — TASK-1307: `baseValue` rule for areas over an inverted axis (§5); pinned decision 11 (curated registry of confirmed external facts for chart annotation).
- **v1.0** — 2026-05-11 — Initial overlay.
