# TASK-1046 — AnimatedMetric (GSAP numeric-reveal primitive, converge AnimatedCounter)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio-Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui|platform|design-system|motion`
- Blocked by: `none` (depende de TASK-1045 — ya en `develop`)
- Branch: `develop (local-first)`

## Summary

Primera primitiva sobre la base de motion GSAP (TASK-1045): `<AnimatedMetric>` — count-up canónico de valores KPI. **Converge el `AnimatedCounter` existente swapeando el motor (framer-motion `useSpring` → `useGreenhouseGSAP`) manteniendo la API pública IDÉNTICA**, así los 31 consumidores no cambian una línea. Un solo numeric-reveal canónico + un uso menos de framer-motion.

## Why This Task Exists

Greenhouse es dashboard-heavy (MRR/ARR, Finance, ICO, Pulse, contractor drawers, Nexa). El count-up de KPIs es el motion de mayor reuso. Hoy lo hace `AnimatedCounter` (framer-motion `useSpring` + `@/hooks/useReducedMotion`), con **31 consumidores** y API `{value, format, currency, duration, locale, formatter}`. Con la base GSAP ya en pie (TASK-1045), el numeric-reveal canónico debe vivir sobre ella — pero **sin romper los 31 consumidores**.

## Goal

- `<AnimatedMetric>` canónico sobre `useGreenhouseGSAP` (tween de valor + `onUpdate`→formato), reduced-motion horneado (snap al valor final).
- API pública **idéntica** a `AnimatedCounter`; `AnimatedCounter` queda como re-export/alias por back-compat → cero churn en los 31 consumidores.
- Paridad de formato verificada (currency/percentage/integer + `formatGreenhouseCurrency/Number` + `formatter` custom).
- Un uso menos de framer-motion (paso hacia la consolidación, ADR Motion §Follow-ups).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md` (la base) — consumir `useGreenhouseGSAP`, NUNCA `gsap` directo (lint rule).
- `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md` — `<AnimatedMetric>` es una **primitiva propia** (numeric value-tween → text), NO una variant de `<Motion>` (que es para transforms). Distinción importante.
- Blast-radius (arch-architect): 31 consumidores → estrategia = **swap de motor bajo API estable**, NO rip-and-replace.

## Current Repo State

### Already exists
- `src/components/greenhouse/AnimatedCounter.tsx` (framer-motion `useSpring` + `useReducedMotion`), exportado en `src/components/greenhouse/index.ts`. API: `{value, format?, currency?, duration?, locale?, formatter?}`.
- 31 consumidores (Nexa, Finance dashboards, KPIs, contractor drawers, space-360, my/performance, …).
- Base de motion GSAP (TASK-1045): `useGreenhouseGSAP`, tokens, reduced-motion horneado.

### Gap
- El numeric-reveal no vive sobre la base canónica GSAP; usa framer-motion en paralelo.

## Scope (tentativo)

### Slice 0 — `<AnimatedMetric>` sobre useGreenhouseGSAP
- Nuevo primitive en el módulo motion (o `components/greenhouse/`) que tween-ea un número con `gsap.to({val}, { onUpdate })` vía `useGreenhouseGSAP`; formato por frame con los helpers `formatGreenhouse*`. Reduced-motion → set directo al valor final (sin tween).
- API idéntica a `AnimatedCounter`.

### Slice 1 — Convergencia sin churn
- `AnimatedCounter` → re-export/alias de `<AnimatedMetric>` (back-compat). Los 31 consumidores intactos.
- Tests de paridad de formato (currency/percentage/integer/formatter) + reduced-motion (snap) + value-change re-tween. Migrar `AnimatedCounter.test.tsx`.

### Slice 2 — GVC + docs
- GVC de 2-3 surfaces reales con KPIs (Finance dashboard, Pulse/ICO KPIs) — count-up enterprise + reduced-motion.
- Nota en DESIGN.md §Motion / ADR (numeric-reveal canónico).

## Out of Scope
- Tocar los 31 consumidores (API estable → no se tocan).
- Retirar framer-motion del resto del repo (consolidación = follow-up).
- Variants nuevas de `<Motion>` (counter NO es una variant de transform).

## Hard rules
- **NUNCA** romper la API pública de `AnimatedCounter` (31 consumidores). Swap de motor bajo API estable.
- **NUNCA** importar `gsap` directo — `useGreenhouseGSAP` (lint rule TASK-1045).
- **NUNCA** dos numeric-reveal canónicos coexistiendo — `AnimatedCounter` debe ser alias de `<AnimatedMetric>`, no un segundo componente.
- **SIEMPRE** paridad de formato es-CL (`tabular-nums`, currency/percentage/integer) verificada con tests antes de cerrar.

## Acceptance Criteria
- [ ] `<AnimatedMetric>` sobre `useGreenhouseGSAP`, reduced-motion horneado.
- [ ] API idéntica; `AnimatedCounter` = alias; 31 consumidores sin cambios; tests verdes.
- [ ] Paridad de formato + value-change re-tween testeados.
- [ ] GVC enterprise en KPIs reales.
- [ ] `pnpm test` (full) + `pnpm build` + `local:check` verdes.
