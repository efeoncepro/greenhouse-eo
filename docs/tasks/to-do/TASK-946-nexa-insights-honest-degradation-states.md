# TASK-946 — Nexa Insights: honest degradation states (12 canonical UI states)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|reliability`
- Blocked by: `none` (puede shipear sin TASK-943; complementario)
- Branch: `task/TASK-946-nexa-insights-honest-degradation-states`
- Legacy ID: `none`
- GitHub Issue: `none`
- Cross-ref: `ISSUE-082` (el falso-sano fue parcialmente UI: estados vacíos ambiguos)

## Summary

Aplicar los **12 canonical UI states** (skill `state-design`) al `NexaInsightsBlock` para que la UI distinga honestamente entre **vacío-pendiente**, **vacío-positivo**, **stale-degraded** y **ready**. Hoy todos los estados sin insights colapsan a un único "EmptyState" ambiguo — exactamente el mismo síntoma UX del falso-sano de ISSUE-082 (la UI no sabía si "está sano sin anomalías" o "el pipeline está roto"). Cierra el gap final del incidente desde el lado de presentación.

## Why This Task Exists

ISSUE-082 reveló que durante semanas, el `NexaInsightsBlock` mostró "Sin insights" cuando en realidad el pipeline estaba roto (raw signals existían pero el worker descartaba todas). Los reliability signals back-end (TASK-941 Slice 5 `nexa.insights.stale_with_eligible_signals`) ahora detectan eso — pero el **componente UI sigue colapsando todos los estados** a un vacío ambiguo. Lección post-incidente: la honest degradation no es solo backend, es UI.

5 estados que la UI debe distinguir:

1. **Loading inicial** — el endpoint aún no respondió (skeleton).
2. **Empty-pending** — período actual, el cron del día aún no corrió (legítimo, "esperá unas horas").
3. **Empty-positive** — el cron corrió, no se detectaron anomalías (señal de salud positiva, no error).
4. **Ready** — hay insights frescos (estado actual del Block).
5. **Stale-degraded** — el signal `no_new_signals_in_24h` está activo: el pipeline puede estar roto (banner honesto, no esconder).

## Architecture Alignment

Revisar y respetar:

- Skill canónica `state-design` — los 12 canonical UI states.
- Skill canónica `greenhouse-ux` — selección Vuexy/MUI primitives.
- Skill canónica `greenhouse-ux-writing` — microcopy es-CL.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — signals consumidos.
- TASK-265 — microcopy hygiene + `getMicrocopy()`.

Reglas obligatorias:
- Copy via `getMicrocopy()` / `greenhouse-nomenclature.ts`, no literals JSX.
- Tokens visuales canónicos (severity color matrix, Tabler icons).
- Vuexy `EmptyState` reusado para los 2 sabores empty; banner/alert para stale-degraded.
- a11y: `aria-live` para transiciones de estado, `role='alert'` para degraded.

## Open Questions

1. ¿Distinguir empty-pending solo por hora del día o consultar un endpoint de "last cron run for this period"? Trade-off entre simplicidad UI y precisión.
2. ¿Reusar el signal `nexa.insights.stale_with_eligible_signals` directo en el endpoint, o exponer un `dataStatus: 'ready'|'empty-pending'|'empty-positive'|'stale-degraded'` derivado server-side?

Resolución sugerida pre-execution: **dataStatus derivado server-side** — el endpoint computa el estado (consulta el signal + last cron timestamp + count); la UI solo renderiza. Single source of truth.

## Dependencies & Impact

### Depends on

- Ninguna bloqueante.
- (Complementa) `TASK-941` Slice 5 — signal `nexa.insights.stale_with_eligible_signals` ya existe.

### Blocks / Impacts

- `NexaInsightsBlock.tsx` (UI core).
- 5 surfaces que lo consumen (Home, Agency, Space360, Person, Finance).
- 5 endpoints que sirven Nexa Insights — todos extienden el shape con `dataStatus`.
- Microcopy en `greenhouse-nomenclature.ts` / `src/lib/copy/`.

### Files owned

- `src/components/greenhouse/NexaInsightsBlock.tsx` — MODIFY (state branching + render states).
- `src/config/greenhouse-nomenclature.ts` / `src/lib/copy/` — MODIFY (microcopy es-CL).
- 5 endpoints que sirven Nexa Insights — MODIFY (derivar `dataStatus`).
- 5 views consumers — verificar wiring del nuevo prop.

## Current Repo State

### Already exists

- `NexaInsightsBlock` con `EmptyState` Vuexy genérico.
- Signal `nexa.insights.stale_with_eligible_signals` (TASK-941 Slice 5).
- `getMicrocopy()` + `GH_NEXA` nomenclature.

### Gap

- Todos los empty states colapsan a un mismo "EmptyState".
- No hay distinción visual ni semántica entre "esperá unas horas" vs "sistema OK" vs "sistema roto".
- Frontend desconoce el status del pipeline (no consume reliability signals).

## Scope

### Slice 1 — Shape extension server-side

- En cada uno de los 5 endpoints Nexa Insights, derivar `dataStatus: 'ready' | 'empty-pending' | 'empty-positive' | 'stale-degraded' | 'loading'` (este último es solo para client; server retorna los 4 reales).
- Helper canónico `resolveNexaInsightsStatus({insights, lastCronRun, freshnessSignal})`.

### Slice 2 — Render states del NexaInsightsBlock

- 5 ramas de render según `dataStatus`.
- `loading`: skeleton (Vuexy `Skeleton`).
- `empty-pending`: `EmptyState` icon clock + microcopy "Aún sin observaciones para este período. Volvé en unas horas".
- `empty-positive`: `EmptyState` icon check + microcopy positivo "Sin anomalías detectadas — salud operativa OK".
- `stale-degraded`: MUI `Alert severity='warning'` + microcopy honesto referenciando ISSUE-082 lesson.
- `ready`: estado actual.

### Slice 3 — Microcopy es-CL

- Agregar entradas a `GH_NEXA` para los 4 estados.
- Validar con skill `greenhouse-ux-writing`.

### Slice 4 — a11y + tests

- `aria-live='polite'` en el contenedor para transiciones state→state.
- `role='alert'` en stale-degraded.
- Vitest + Testing Library tests para cada estado.

## Out of Scope

- Cambios al modelo backend de signals/enrichments (TASK-943).
- Nuevo componente UI; reusar `NexaInsightsBlock` actual.

## Acceptance Criteria

- [ ] `NexaInsightsBlock` renderiza 5 estados distinguibles (loading, empty-pending, empty-positive, stale-degraded, ready).
- [ ] Cada estado tiene microcopy es-CL canónico, no literals.
- [ ] `stale-degraded` se muestra cuando el signal `nexa.insights.stale_with_eligible_signals` está warning/error.
- [ ] a11y: transiciones state→state son aria-live; degraded es role='alert'.
- [ ] Tests anti-regresión cubren los 5 estados.
- [ ] Las 5 surfaces (Home/Agency/Space/Person/Finance) reciben el `dataStatus` derivado.

## Verification

- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm lint`.
- `pnpm vitest run src/components/greenhouse src/app/api`.
- Browser smoke: forzar cada estado en staging (mock data) y verificar render.
- a11y audit con axe-core en cada estado.

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md` (mejora visible).
- [ ] Cross-ref con ISSUE-082 — "el último gap UX del falso-sano".
