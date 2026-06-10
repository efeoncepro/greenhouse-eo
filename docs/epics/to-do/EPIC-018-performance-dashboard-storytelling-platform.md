# EPIC-018 — Performance Dashboard Storytelling Platform

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui|delivery|ico|cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-018-performance-dashboard-storytelling-platform`
- GitHub Issue: `none`

## Summary

Programa cross-surface para llevar los dashboards de desempeño/ICO de Greenhouse al bar enterprise 2026 con **data storytelling real**: el usuario entiende su situación de un vistazo, no decodifica números sueltos. Construye una vez las primitives reusables (storytelling KPI card con anatomía completa, hero score compuesto, marco temporal honesto mes-cerrado/en-curso, charts potentes, degradación por-slot) y las adopta en las 4 superficies que hoy renderizan métricas ICO con template plano 2018: **Mi Desempeño (`/my/performance`)**, **Agency ICO**, **Space 360** y **Person 360**.

## Why This Epic Exists

Auditoría enterprise (GVC real entrando como `daniela.ferreira@efeonce.org`, sesión 2026-06-10, skills `greenhouse-ui-enterprise-review` + `modern-ui` + `dataviz-design` + `state-design` + `greenhouse-ux` + `info-architecture` + `product-design-loop`) sobre `/my/performance`: **veredicto BLOCK**, rubric ~2.0/5. Tres causas raíz estructurales (cero storytelling, modelo temporal incoherente que engaña, madurez visual de template plano) que **se repiten en las 4 superficies ICO** porque comparten el mismo enfoque de "números planos". El operador pidió explícitamente que el rediseño aplique a las superficies hermanas, no solo a Mi Desempeño. Resolver superficie-por-superficie sin primitives compartidas fragmentaría el sistema; el patrón canónico es foundation→adoption (TASK-611/612/613).

## Outcome

- Las 4 superficies ICO cuentan una historia: cómo cerré → qué pasa este mes → qué hago.
- KPIs con anatomía completa (sparkline + delta + meta + semáforo color+icono+label), marco temporal honesto, charts potentes, degradación por-slot — consistentes cross-surface.
- Primitives reusables data-agnósticas documentadas en `ui-platform/PRIMITIVES.md`; cero fork.
- WCAG 2.2 AA + mobile real + motion tier-apropiado en todas.
- Cero cambio en cálculo de métricas, projections, acceso ni bono — es presentación.

## Architecture Alignment

- `DESIGN.md` + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (AXIS, typography SoT, elevation roles TASK-1049, charts gov TASK-1041)
- `docs/architecture/ui-platform/PRIMITIVES.md` + `README.md`
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- Contrato modos temporales TASK-776

## Child Tasks

- `TASK-1075` — Foundation: primitives reusables (storytelling KPI card, hero score, marco temporal, charts) + **piloto en `/my/performance`**.
- `TASK-1076` — Adopción en superficies hermanas: Agency ICO, Space 360, Person 360 (consume las primitives de TASK-1075).

## Existing Related Work

- `TASK-1073` — Nexa self-view 2ª persona (voz self vs observer; alimenta el bloque "acción" y define el boundary de voz).
- `TASK-1074` — RpA suppressed honest microcopy (alimenta la KPI card).
- `TASK-1027` — My Performance rich self-service (estado `[verificar]`; misma superficie).
- `TASK-611/1059/1063` — Organization Workspace / org detail projections (Agency/Space).
- `MetricTrendCard` primitive (base a expandir).

## Exit Criteria

- [ ] TASK-1075 shipped: primitives en `PRIMITIVES.md` + `/my/performance` enterprise (GVC baseline verde, flag ON).
- [ ] TASK-1076 shipped: Agency ICO + Space 360 + Person 360 adoptan las primitives (GVC por superficie, scope/redacción correctos).
- [ ] Las 4 superficies consistentes: storytelling + temporal honesto + degradación por-slot + WCAG 2.2 AA + mobile real.
- [ ] Cero fork de primitives; cero hardcode; copy es-CL en `src/lib/copy/*`.
- [ ] Cálculo/projections/acceso/bono intactos en las 4.

## Non-goals

- Cambiar el cálculo de métricas ICO, las projections, el acceso o el bono (es presentación).
- Acelerar/activar la migración RpA V2 ni flags de captura.
- Agregar una 3ª librería de charts.
- Voz 2ª persona fuera de `/my/performance` (Person 360 = observer).
