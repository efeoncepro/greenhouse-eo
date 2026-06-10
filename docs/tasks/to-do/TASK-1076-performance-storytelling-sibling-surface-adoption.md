# TASK-1076 — Adopción de las primitives de storytelling en superficies hermanas ICO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-018`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|delivery|ico|agency|content|identity`
- Blocked by: `TASK-1075`
- Branch: `task/TASK-1076-performance-storytelling-sibling-adoption`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Adopta las **primitives reusables** que entrega TASK-1075 (storytelling KPI card, hero score, marco temporal honesto, charts potentes, degradación por-slot) en las **3 superficies hermanas** que hoy renderizan métricas ICO con el mismo template plano: **Agency ICO**, **Space 360** y **Person 360**. Objetivo: que el sistema de dashboards de desempeño enterprise sea consistente cross-surface y nadie quede con el "look 2018". NO re-diseña las primitives (eso es TASK-1075) — las consume con el data shape + access + redacción propios de cada superficie.

## Why This Task Exists

El rediseño de `/my/performance` (TASK-1075) arregla una superficie, pero las hermanas comparten exactamente el mismo problema (números planos sin storytelling, charts débiles, sin marco temporal). El operador pidió explícitamente que el sistema **aplique a las superficies hermanas** (sesión 2026-06-10). Construir las primitives una vez (TASK-1075) y adoptarlas por superficie (esta task) es el patrón canónico foundation→adoption (TASK-611/612/613), evita fork y mantiene consistencia. Cada superficie tiene su propio scope de datos/acceso, por eso es adopción separada, no un parámetro más de TASK-1075.

## Goal

- Agency ICO, Space 360 y Person 360 renderizan KPIs ICO con la anatomía completa + hero score + marco temporal honesto de las primitives EPIC-018.
- Cada superficie respeta su **scope/acceso/redacción** propio (no se filtra data entre audiencias).
- **Person 360 mantiene voz observador (3ª persona)** en la narrativa Nexa — NO 2ª persona (boundary TASK-1073: la 2ª persona es solo self-view).
- Cero fork de primitives; consumo + mapeo `kind→variant` por dominio.
- GVC desktop+mobile por superficie + estados honestos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- TASK-1075 (primitives + contrato de uso) + `ui-platform/PRIMITIVES.md`.
- `DESIGN.md` + tokens AXIS + typography SoT + elevation roles + charts gov (TASK-1041).
- TASK-611 Organization Workspace Projection (Agency/Space facets) + TASK-1059/1063 (org detail) — Agency/Space consumen sus projections.
- TASK-1073 (voz Nexa: self vs observer) — Person 360 = observer.
- `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (no cambia cálculo).

Reglas obligatorias:

- **NUNCA** forkear las primitives de TASK-1075 — consumir/expandir vía variant/kind.
- **NUNCA** filtrar data fuera del scope de la audiencia (Person 360 sin comp/cost a no-autorizados; Space client-scoped; Agency rollup de su scope).
- **NUNCA** usar voz 2ª persona en Person 360 (observer); solo `/my/performance` es self-view.
- **NUNCA** pintar freehand — product-design-loop si una superficie necesita layout propio + GVC en loop.
- Mismo contrato de tokens/copy/a11y/temporal/estados que TASK-1075.

## Normative Docs

- TASK-1075 spec + primitives entregadas.
- Vistas hermanas: `[verificar paths]` Agency ICO (`src/views/greenhouse/agency/**`), Space 360, Person 360 (`PersonProfileTab` / facets account-360).

## Dependencies & Impact

### Depends on

- **TASK-1075** (primitives + hero score + marco temporal) — bloqueante duro.
- Projections de cada superficie (Agency/Space org-workspace TASK-611/1063; Person 360 account-360 facets).

### Blocks / Impacts

- EPIC-018 exit (consistencia cross-surface).
- Las 3 superficies hermanas (visual + UX).

### Files owned

- `src/views/greenhouse/agency/**` (ICO surface) `[verificar path exacto]`
- Space 360 + Person 360 views `[verificar paths]`
- Posible expansión de variant/kind en `src/components/greenhouse/primitives/**` (sin fork)
- `src/lib/copy/**` (copy por superficie)
- `scripts/frontend/scenarios/` (scenarios GVC por superficie)

## Current Repo State

### Already exists

- Las 3 superficies renderizan métricas ICO hoy (template plano, mismo problema que `/my/performance`).
- Projections de cada superficie ya proveen los datos.

### Gap

- Ninguna consume las primitives de storytelling (no existen hasta TASK-1075).
- `[verificar]` paths exactos + data shape de cada superficie + dónde renderizan ICO hoy.
- `[verificar]` qué redacción/acceso aplica cada una.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Agency ICO

- Adoptar storytelling KPI cards + hero score (rollup de equipo/scope) + marco temporal en la superficie Agency ICO.
- Hero score = agregado del scope (no de un miembro). Mapear `kind` Agency→variant.
- GVC desktop+mobile.

### Slice 2 — Space 360

- Adoptar las primitives en el facet de delivery/métricas de Space 360 (client-scoped).
- Respetar redacción client-portal si aplica. Mapear `kind` Space→variant.
- GVC desktop+mobile.

### Slice 3 — Person 360

- Adoptar las primitives en Person 360 (manager/internal viendo a un colaborador).
- **Voz Nexa = observer (3ª persona)**, NO self-view. Redacción: sin comp/cost a no-autorizados.
- GVC desktop+mobile.

## Out of Scope

- **NO** re-diseñar ni forkear las primitives (eso es TASK-1075).
- **NO** cambiar cálculo de métricas, projections, acceso ni bono.
- **NO** la voz 2ª persona en Person 360 (boundary TASK-1073).

## Detailed Spec

Consumir el contrato de uso de TASK-1075. Por superficie: resolver el data shape de su projection → mapear a las props de las primitives (KPI story card, hero score, temporal) → mapear `kind` de dominio a `variant` → estados honestos por-slot → GVC. Las diferencias materiales por superficie (rollup vs single-member vs client-scoped; voz observer; redacción) se resuelven en el consumer, NO en la primitive.

## Rollout Plan & Risk Matrix

Adopción de presentación sobre superficies existentes, una por slice, cada una flag-gated + GVC baseline. No toca datos/cálculo/acceso.

### Slice ordering hard rule

- TASK-1075 DEBE estar shipped (primitives) antes de cualquier slice.
- Slices 1/2/3 independientes entre sí (paralelizables); cada uno cierra con su GVC.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Filtrar data fuera de scope de audiencia | identity/acceso | medium | respetar projection + redacción existente; review por superficie | code review |
| Voz 2ª persona se cuela en Person 360 | content | low | observer explícito; test anti-regresión | GVC + test |
| Primitive necesita expansión no prevista | ui | medium | expandir variant/kind en TASK-1075 contract, no fork | code review |
| Regresión visual por superficie | ui | medium | flag-gated + GVC baseline por superficie | GVC diff |

### Feature flags / cutover

- Flag por superficie (o reuso del flag del sistema) default OFF; flip post GVC baseline verde. Revert: flag OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 Agency | flag OFF | <5 min | sí |
| Slice 2 Space | flag OFF | <5 min | sí |
| Slice 3 Person | flag OFF | <5 min | sí |

### Production verification sequence

1. TASK-1075 shipped + primitives en `PRIMITIVES.md`.
2. Por superficie: mockup/adopt → GVC desktop+mobile → flag ON staging → baseline diff match → verificar scope/redacción correctos → prod flag ON.

### Out-of-band coordination required

- Ninguna integración externa. Coordinar con TASK-611/1063 (Agency/Space projections) + TASK-1073 (voz).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Agency ICO, Space 360 y Person 360 consumen las primitives de storytelling (KPI anatomy + hero score + marco temporal) sin fork.
- [ ] Cada superficie respeta su scope/acceso/redacción (sin fuga cross-audiencia).
- [ ] Person 360 usa voz observer (3ª persona) en Nexa; no 2ª persona.
- [ ] GVC desktop+mobile por superficie; estados honestos; cero hardcode; copy validado.
- [ ] Cálculo/projections/acceso/bono intactos.

## Verification

```bash
pnpm local:check:ui
pnpm test src/lib src/views
pnpm fe:capture agency-ico-redesign --env=staging
pnpm fe:capture space360-perf-redesign --env=staging
pnpm fe:capture person360-perf-redesign --env=staging
```

## Closing Protocol

- Lifecycle → complete + mover + sincronizar README + EPIC-018 child status.
- `greenhouse-documentation-governor`: PRIMITIVES.md (si se expandió variant/kind), HISTORIAL, changelog, Handoff.
- `pnpm test` (full) + `pnpm build`.

## Follow-ups

- Cerrar EPIC-018 cuando las 4 superficies (incl. `/my/performance` de TASK-1075) estén consistentes.
