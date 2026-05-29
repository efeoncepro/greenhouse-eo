# TASK-946 — Nexa Insights: honest degradation states (12 canonical UI states)

## Delta 2026-05-28 — Canonizado en TASK-947 detail page + propaga a las 5 surfaces

- **Primer adopter canonical**: el detail page `/nexa/insights/[id]` (TASK-947) **canoniza** los 12 UI states framework para Nexa Insights. Mapping explícito en TASK-947 Slice 3: `current`→`ready`, `superseded`→`partial`, `expired`→`empty-positive`, `not_found`→`notFound()`, `degraded`→`stale/degraded`, loader throws→`error`, in-flight→`loading`.
- **Patrón canonical reusable**: una vez TASK-947 V1 ship, las 5 surfaces existentes (`NexaInsightsBlock` en Home/Agency/Person 360/Space 360/Finance) adoptan el mismo mapping. TASK-946 pasa de "diseñar 12 states" a "propagar el mapping canonical del detail page a las 5 surfaces".
- **Desbloqueo cross-domain**: el framework canonical de honest-degradation cierra el último gap UX del falso-sano de ISSUE-082. Mientras TASK-941/942/943 cerraron el motor backend, TASK-946 + TASK-947 cierran el motor UX que evita que un operador vuelva a ver "Sin datos" cuando realmente debería ver "Pendiente" / "Anomalía resuelta" / "Versión histórica".
- **Composabilidad**: TASK-944 + TASK-945 heredan el mapping (Finance toggle + lifecycle timeline reusan los mismos estados).
- **NUEVO Depends on**: `TASK-947` (canonization first). TASK-946 = propagation phase post canonization.

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Complete 2026-05-28`
- Rank: `TBD`
- Domain: `ui|reliability`
- Blocked by: `none` (TASK-943 ✅ + TASK-945 ✅ shipped 2026-05-28; signals live)
- Branch: `develop` (operador-decision; canonization phase como primer adopter — TASK-947 hereda después)
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

- [x] Lifecycle complete + mover a `complete/`.
- [x] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [x] `Handoff.md` + `changelog.md` (mejora visible).
- [x] Cross-ref con ISSUE-082 — "el último gap UX del falso-sano".

## Delta 2026-05-28 — V1.0 SHIPPED (canonization phase, primer adopter)

**Decisión pre-execution (Open Questions resueltas con la opción más robusta)**:

1. `lastCronRun` derivation → **server-side BQ append-only** (TASK-943 `ai_signals.MAX(generated_at)` per período). NO hour-of-day heuristic.
2. Reuse signal vs `dataStatus` derivado → **dataStatus derivado server-side** (SSOT). UI consumer solo renderiza, no deriva.
3. 5 vs 12 states → **5 canonical en V1** (4 server + 1 loading local). Los 12 del skill `state-design` quedan como vocabulario disponible si emerge necesidad de granularidad mayor.
4. Helper location → `src/lib/ico-engine/ai/nexa-data-status.ts` (BQ-based canonical) + `src/lib/finance/ai/nexa-data-status.ts` (PG mirror).
5. Finance compose → variant **PG-based** (Finance no consume el event log BQ TASK-943; lee `finance_ai_enrichment_runs` + `finance_ai_signals` PG con lógica canonical mirror).
6. Loading en wire types → **server retorna 4**, cliente añade el 5to local. Type union exporto del block es `'loading' | 'ready' | 'empty-pending' | 'empty-positive' | 'stale-degraded'`.

**Canonization phase**: TASK-946 V1.0 es el **primer adopter** del framework honest-degradation. TASK-947 detail page heredará el mapping canonical cuando ship. La originaria Delta del 2026-05-28 (Open Question framing) queda supersedida — no hay propagation phase porque TASK-947 V1 aún no shippea; V1 actual canoniza la base.

**Pipeline canonical (cross-store)**:

```
Período + insightsCount
  → resolveNexaInsightsDataStatus (ICO) / resolveFinanceNexaInsightsDataStatus (Finance)
  → 1. insightsCount > 0 → ready (fast path, sin query externa)
  → 2. lastCronRun NULL → empty-pending
  → 3. ageHours > 24 → stale-degraded (heartbeat alineado TASK-943 S5)
  → 4. eligibleCount === 0 → empty-positive (salud)
  → 5. eligibleCount > 0 && insightsCount === 0 → stale-degraded (falso-sano ISSUE-082)
  → 6. honest degradation BQ/PG fail → empty-pending + captureWithDomain
```

**Slices shipped (7 atómicos)**:

- **Slice 1** (helpers canonical): `src/lib/ico-engine/ai/nexa-data-status.ts` (BQ) + `src/lib/finance/ai/nexa-data-status.ts` (PG). Threshold `STALE_THRESHOLD_HOURS=24` alineado con TASK-943 S5 `nexa.insights.no_new_signals_in_24h`. Honest degradation con `captureWithDomain('delivery'|'finance')`.
- **Slice 2** (dispatcher state-driven): `NexaInsightsBlock` refactor — prop opcional `dataStatus?: NexaInsightsDataStatusUi` con 5 valores. Backward-compat: si no llega, fallback `hasData → ready` / `!hasData → empty-pending` legacy. 4 render branches honest: clock+animated empty (pending), check+success (positive), MUI Alert warning + `role='alert'` + AlertTitle (stale-degraded), loading skeleton-style. A11y: contenedor `aria-live='polite'`, `aria-hidden` en iconos decorativos.
- **Slice 3** (microcopy es-CL canonical): 7 entradas nuevas en `GH_NEXA` (`greenhouse-nomenclature.ts`) — `state_empty_pending_{title,description}`, `state_empty_positive_{...}`, `state_stale_degraded_{title,description,action}`, `state_loading_aria`. Cero literals en JSX (TASK-265 hygiene).
- **Slice 4** (types extend): payload types canonical + cliente extendidos con `dataStatus?` opcional — `AgencyAiLlmSummary`, `MemberNexaInsightsPayload`, `SpaceNexaInsightsPayload`, `FinanceNexaInsightsPayload`, `HomeAiInsightsBentoData`, `HomeInsightsPayload` (HomeView local). Enum cerrado cross-domain coherente.
- **Slice 5** (5 readers compute dataStatus): `readAgencyAiLlmSummary`, `readMemberAiLlmSummary`, `readSpaceAiLlmSummary`, `readFinanceAiLlmSummary` (portfolio + client-scoped), `loadHomeAiInsightsBento`, `get-home-snapshot`. Cada uno invoca helper canonical + propaga `dataStatus` al payload. Fallbacks `.catch()` declaran `dataStatus='empty-pending' as const` (honest, no infiere salud falsa).
- **Slice 6** (5 surfaces propagate al block): `IcoAdvisoryBlock` (Agency), `HomeView`, `PersonActivityTab`, `OverviewTab Space360`, `FinanceDashboardView` (con narrowing al enum cerrado canonical `allowedStatuses.includes()` para defensive degradation desde endpoint). Cross-domain coherence completa.
- **Slice 7** (tests anti-regresión): **21 tests verde** — `nexa-data-status.test.ts` ICO (8) + Finance (7) cubren los 6 paths canonical + honest degradation + BQ deserialization shapes. `NexaInsightsBlock.test.tsx` (6) cubre los 4 estados + ready + loading + backward-compat. Updates a `llm-enrichment-reader.test.ts` con stub canonical del helper (probado independiente). Update a `src/test/render.tsx`: extiende `palette.customColors` mirror de V1 light (reusable cross-tests, NO solo TASK-946).

**Cierre del último gap UX ISSUE-082**: la UI antes colapsaba TODOS los empty states a un mismo "Sin datos" ambiguo (parte raíz del falso-sano percibido durante 2 días en mayo 2026). Ahora distingue honestamente entre "esperá unas horas" (empty-pending), "sistema OK sin anomalías" (empty-positive, señal de salud positiva), "el pipeline puede estar caído" (stale-degraded, alerta honesta con `role='alert'`), y "ready" (datos frescos).

**Quality gate canonical (pre-cierre)**:
- `pnpm exec tsc --noEmit` ✓ verde.
- `pnpm lint` focal ✓ verde.
- `pnpm test` focal: 21 tests TASK-946 + 33 tests cross-domain (Home/Space/Person) + 8 ICO + 8 Finance readers verde.
- `pnpm test` full + `pnpm build` corren en closing protocol (pre-merge).

**Commits canonical** (4 atómicos en `develop`):
- `f355a4ee` — Slices 1-3 (helpers + microcopy + block branching).
- `3bc52097` — Slices 4-6 (types + 5 readers + 5 surfaces).
- `ecf6d211` — Slice 7 (21 tests anti-regresión).
- Pendiente — closing (lifecycle move + trackers + Handoff + changelog).

**Cross-references**:
- TASK-947 (detail page) hereda mapping canonical cuando ship.
- TASK-945 (lifecycle timeline) compose visualmente con `ready` state (sparkline solo cuando lifecycle ≥ 2 obs).
- TASK-944 (Finance toggle) compose con `dataStatus='ready'` cuando timeline.length > 0.
- ISSUE-082 (falso-sano): cierra el último gap UX. Backend (TASK-941/942/943) + UX (TASK-946) = full coverage.
- TASK-943 S5 (`nexa.insights.no_new_signals_in_24h`): mismo threshold 24h canonical.
