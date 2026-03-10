# Greenhouse Executive UI System V1

## Purpose

This document defines the reusable executive UI system for Greenhouse.

It exists to prevent:
- copying Vuexy dashboards as-is
- creating one-off cards per tenant
- improving data coverage while leaving visual hierarchy weak

Greenhouse should borrow the compositional discipline of Vuexy analytics while preserving:
- Greenhouse semantics
- Efeonce branding
- tenant-safe data contracts
- reusable product components

## Reference Sources

Primary visual references:
- `../full-version/src/views/dashboards/analytics/page.tsx`
- `../full-version/src/views/dashboards/analytics/WebsiteAnalyticsSlider.tsx`
- `../full-version/src/views/dashboards/analytics/EarningReports.tsx`
- `../full-version/src/views/dashboards/analytics/SupportTracker.tsx`
- `../full-version/src/views/dashboards/analytics/ProjectsTable.tsx`

Primary product references:
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `GREENHOUSE_SERVICE_MODULES_V1.md`
- `SKY_TENANT_EXECUTIVE_SLICE_V1.md`

## Design Goal

Greenhouse should feel like an executive operating system.

That means:
- immediate first-screen readability
- strong metric hierarchy
- compact supporting context
- predictable card rhythm
- reusable sections that survive tenant variation

It does not mean:
- a generic analytics SaaS clone
- a purple Vuexy skin
- tenant-specific dashboards hardcoded by company name

## Core Rules

### 1. Layout hierarchy before more data

The first improvement axis is composition, not metric count.

The dashboard must read in layers:
- hero narrative
- compact summary signals
- medium analysis cards
- bottom contextual tables or lists

### 2. Reuse by capability, not by tenant

Components should represent reusable executive capabilities such as:
- relationship context
- delivery performance
- quality signals
- account team
- tooling footprint
- portfolio attention

Tenant-specific logic may affect:
- visibility
- emphasis
- copy
- seeded fallback values

Tenant-specific logic must not create unique JSX structures.

### 3. Shared primitives live in `src/components/greenhouse/*`

Reusable executive cards, shells, metric rows, and table wrappers belong in:
- `src/components/greenhouse/*`

Route-specific assembly belongs in:
- `src/views/greenhouse/<module>/*`

### 4. Vuexy is a pattern source, not a merge source

Allowed reuse from Vuexy:
- card rhythm
- chart framing
- spacing and density references
- MUI composition patterns
- table and list layouts

Not allowed as-is:
- fake data
- demo semantics
- Vuexy brand language
- unrelated template business modules

### 5. Explanatory copy must get shorter

Executive cards should prefer:
- title
- short subheader
- primary metric
- one support line
- compact breakdown row or chip row

Long descriptive paragraphs should be exceptional.

## Target Dashboard Composition

Recommended row hierarchy for `/dashboard`:

### Row 1
- `ExecutiveHeroCard`
- `ExecutiveMiniStatCard`
- `ExecutiveMiniStatCard`

### Row 2
- `ExecutiveChartCard` for delivery performance
- `ExecutiveChartCard` for quality or review pressure

### Row 3
- `ExecutiveListCard` for account team and capacity
- `ExecutiveListCard` for tooling footprint
- `ExecutiveStatGroupCard` for portfolio or risk read

### Row 4
- `ExecutiveProjectsTableCard`
- optional companion list or risk card

## Reusable Component Set

The executive UI system should standardize these building blocks.

### Foundational wrappers
- `ExecutiveSectionHeader`
- `ExecutiveCardShell`
- `ExecutiveMetricValue`
- `ExecutiveMetricDelta`
- `ExecutiveChipRow`

### Card families
- `ExecutiveHeroCard`
- `ExecutiveMiniStatCard`
- `ExecutiveChartCard`
- `ExecutiveListCard`
- `ExecutiveInsightCard`
- `ExecutiveProjectsTableCard`

### Support components
- `ExecutiveAvatarStack`
- `ExecutiveProgressRow`
- `ExecutiveLegendList`
- `ExecutiveEmptyState`

These may internally use:
- `Card`
- `CardHeader`
- `CardContent`
- `Chip`
- `LinearProgress`
- `Avatar`
- `OptionMenu`
- `AppReactApexCharts`

## Data-to-UI Rules

### Stable data contract first

UI composition should depend on stable payload capabilities such as:
- `summary`
- `relationship`
- `qualitySignals`
- `accountTeam`
- `tooling`
- `attentionProjects`

It should not depend on ad hoc booleans spread through JSX.

### Visibility rules

Cards should render based on:
- `serviceModules`
- `businessLines`
- data availability
- explicit tenant overrides

Cards should not render based on:
- client name string checks

### Composition orchestrator

The executive UI system should not rely on manual JSX ordering per tenant.

It needs a deterministic composition layer that:
- knows which executive blocks exist
- knows which data each block requires
- knows which services or capabilities make a block relevant
- chooses the final mix and order of blocks for the current tenant context

Runtime reference:
- `src/views/greenhouse/dashboard/orchestrator.ts`

This is not an AI chooser.
It is a product-controlled registry and resolver for executive blocks.

### Metric source honesty

If a metric is:
- measured
- seeded
- inferred
- unavailable

the UI must preserve that truth.

This is especially important for:
- `RpA`
- `First-Time Right`
- capacity
- tooling attribution

## Typography and Density Rules

### Type scale

Use a narrow hierarchy:
- page heading
- card title
- card subheader
- metric value
- support text

Metric values should dominate.
Secondary labels should recede.

### Density

Prefer:
- tighter cards
- shorter copy
- smaller legend rows
- controlled heights

Avoid:
- full-width narrative cards stacked vertically
- repeated explanatory paragraphs

## Chart Rules

Charts should be bounded and legible.

Preferred chart roles:
- line or area for trend
- compact bar for distribution or monthly comparison
- radial only where a single completion or health score matters

Chart cards should include:
- title
- short subheader
- one primary number
- chart
- compact legend or support metrics

## Brand Rules

Greenhouse should preserve:
- Efeonce logo system
- Greenhouse route semantics
- current Greenhouse visual identity unless intentionally redesigned globally

Greenhouse should not inherit:
- Vuexy logo
- Vuexy purple-first palette
- generic template copy

## Implementation Sequence

### Stage 1. Documentation and contract lock
- define the executive UI system in repo docs
- align architecture, backlog, matrix, context, and handoff

### Stage 2. Reusable UI layer
- create executive wrappers in `src/components/greenhouse/*`
- keep dashboard-specific assembly in `src/views/greenhouse/dashboard/*`
- introduce the executive block orchestrator before tenant-specific branching spreads

### Stage 3. Dashboard refactor
- reorganize `/dashboard` into row hierarchy
- migrate existing sections into executive card families
- preserve current data contracts

### Stage 4. Extension to other modules
- reuse the same card system in `/admin`, `/equipo`, `/campanas`, and internal views

## Success Criteria

The executive UI system is successful when:
- the dashboard reads clearly above the fold
- sections no longer feel visually flat
- new tenant slices reuse existing cards instead of creating new layout patterns
- future modules can reuse the same executive card language
- the product feels intentionally designed, not template-derived

## Immediate Next Action

Use this document as the UI contract for the next dashboard refactor.

The next implementation step is:
- refactor `/dashboard` into the executive UI system without changing the semantic data model first
