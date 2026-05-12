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
- `theme.palette.customColors.success` (#6ec207 lime) — positive deltas
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
- Comparison period (`caption`, "vs mes anterior")
- Optional sparkline (small ECharts line, no axis)

Honest degradation: when value is `null` from `SourceResult`, show "Pendiente" + tooltip with reason, NEVER `$0`.

### 5. Axis design — start at 0 for bars, ISO date format

Bars: `min: 0`. Lines: optional 0 (use scale that shows the change).

Time format: `dd MMM` (es-CL). For multi-year: `dd MMM yyyy`. NEVER `M/D/YY` American format.

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

## Compose with (Greenhouse skills)

- `web-perf-design-greenhouse-overlay` — lazy load + bundle budgets.
- `motion-design-greenhouse-overlay` — animation duration caps.
- `a11y-architect-greenhouse-overlay` — chart a11y contract.
- `greenhouse-ux-writing` — chart titles + tooltips + axis labels.

## Version

- **v1.0** — 2026-05-11 — Initial overlay.
