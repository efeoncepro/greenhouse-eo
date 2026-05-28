# TASK-945 — Nexa Insights: signal lifecycle timeline + severity sparkline

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (refinado con skills state-design + dataviz-design + greenhouse-ux)`
- Rank: `TBD`
- Domain: `ui|ico`
- Blocked by: `TASK-943` (event log append-only — sin él, no hay lifecycle real)
- Branch: `task/TASK-945-nexa-insights-signal-lifecycle-timeline`
- Legacy ID: `none`
- GitHub Issue: `none`
- Compose con: `TASK-944` (Finance toggle) + `TASK-946` (states honest degradation)

## Summary

Aprovechar el event log append-only que entrega TASK-943 para **mostrar la evolución intra-período de cada anomalía** (emerged → severity changes → resolved) en el `NexaInsightsBlock`. Hoy el `NexaInsightsTimeline` muestra **enrichments LLM por `processedAt`**; este task agrega un nivel nuevo: el **signal lifecycle por `generated_at`**, que es la información que un operador de sprint de 15 días realmente necesita para gestión. Diseño refinado por skills `state-design` + `dataviz-design` + `greenhouse-ux`: reuse de MUI Lab Timeline + ApexCharts sparkline (canonical del repo, sin bundle nuevo), 8 estados UI canónicos honest-degradation, severity con triple encoding (color+icon+label).

## Why This Task Exists

El operador identificó en la sesión 2026-05-28 (post TASK-943 design): "puede hacerse análisis evolutivo de esas señales... análisis evolutivo intra-período en sprints de 15 días". Hoy el timeline UI muestra **el enrichment LLM** (cuándo Nexa analizó, una entrada por signal), no la **evolución de la anomalía** (cuándo apareció, cómo varió la severidad, cuándo se resolvió). Después de TASK-943 (append-only), la data está disponible — pero la UI no la visualiza.

Esta task entrega:
1. Lifecycle por signal: timeline con dots por observación, colores semaphore por severity, dot final verde si "resuelto".
2. Sparkline inline en cada card del block (header colapsado): trayectoria visual de severity en 5-7 puntos.
3. "Resolved" badge cuando la anomalía dejó de aparecer en runs posteriores (positive event de gestión).
4. Honest degradation: 8 estados UI distinguibles (vs el "todo es vacío" actual).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías activas (Apex+Recharts; no agregar nuevas).
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — tokens canonical (typography, spacing, radius, color semaphore).
- `DESIGN.md` — contrato visual compacto.
- `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- TASK-943 — append-only event log (proveedor de la data).
- TASK-743 — operational table density (referencia si se usa tabla fallback).
- Skill canónica `state-design` — 12 canonical UI states + honest degradation.
- Skill canónica `dataviz-design` — sparkline canonical + a11y chart floor (11 rows).
- Skill canónica `greenhouse-ux` — Vuexy primitives, semaphore palette.
- Skill canónica `greenhouse-ux-writing` — microcopy es-CL.

Reglas obligatorias:

- **NO** introducir librería de charts nueva. ApexCharts para sparkline inline (canonical repo); MUI Lab Timeline para el lifecycle expandido (ya en `NexaInsightsTimeline.tsx`).
- **NO** color solo como encoding. Severity siempre = chip color + icon Tabler + label es-CL.
- **NO** `fontFamily: 'monospace'` en timestamps; usar `fontVariantNumeric: 'tabular-nums'` sobre DM Sans.
- **NO** literals en JSX para microcopy; usar `getMicrocopy()` / `GH_NEXA`.
- Tokens canónicos: `customBorderRadius.md` (6) cards, `customBorderRadius.sm` (4) chips, `success #6ec207` resolved, `error #bb1954` critical, `warning #ff6500` warning.
- a11y: `role='img'` + `aria-label` resumen lifecycle por signal; keyboard nav arrow keys entre dots; `prefers-reduced-motion` → sparkline estática + sin entrada animada.

## Open Questions resueltas pre-execution

| Q | Resolución | Rationale |
|---|---|---|
| ¿ECharts o Apex para sparkline? | **Apex** (`StatsWithAreaChart` pattern existente) | dataviz-design hard rule: NUNCA 2 libs de chart; Apex+Recharts ya activos. ECharts en catálogo pero no activo. Sparkline inline de 5-7 pts: Apex es perfectamente capaz, cero bundle nuevo. |
| ¿Componente nuevo o extender existente? | **Extender** `NexaInsightsTimeline.tsx` + `NexaInsightsBlock.tsx` | Reuse de MUI Lab Timeline + accordion existente. Cambio incremental, no rewrite. |
| ¿Cómo modelar "Resolved" semánticamente? | **Estado positivo del lifecycle**, NO un vacío | state-design: "Resolved" es un evento celebratorio del lifecycle (chip success + icon check + label es-CL "Resuelto hace X"). Aparece como dot final verde en la timeline + badge en header colapsado. |
| Layout para evolución (timeline densa / card expandida / tabla / drawer) | **Hybrid**: accordion header compacto con sparkline + expand muestra MUI Timeline full | greenhouse-ux: preservar Accordion pattern actual de `NexaInsightsBlock`; agregar sparkline en header colapsado; expand muestra timeline detallada. Density OK (≤20 signals/mes × accordion = colapsado por default). |
| Severity encoding | **Triple encoding** (color chip + icon Tabler + label es-CL) | dataviz-design hard rule: color NEVER alone. a11y. Mapping: `error→bb1954+tabler-alert-octagon+'Crítico'`, `warning→ff6500+tabler-alert-triangle+'Atención'`, `ok→6ec207+tabler-circle-check+'Óptimo'`. |
| Detección "resolved" | **Latest observation < latest cron run del período**, derivado server-side en el reader | El reader incluye `lifecycleStatus: 'active'|'resolved'` en el shape de cada signal. UI solo renderiza, no deriva. SSOT. |
| Mobile | **Timeline colapsa vertical**, sparkline inline más chica | MUI Lab Timeline ya es vertical; sparkline a 60×24px en mobile (vs 120×40px desktop). Density preservada. |
| Live updates en período abierto | **Polling on focus** (no SSE/WebSocket V1) | state-design: < 1 update/min → poll on focus. Cron diario = cero presión real-time. Out of scope SSE. |
| Charts a11y mínimo | **role=img + aria-label resumen + table fallback toggle + keyboard nav arrow keys + reduced-motion** | dataviz-design 11-row floor obligatorio. Table fallback = expand "Ver datos tabulares" mostrando timestamps + severities tabular. |

## Dependencies & Impact

### Depends on

- **`TASK-943`** ✅ blocking — sin el event log append-only, el lifecycle no existe. Hasta que TASK-943 ship, esta task no se puede tomar.
- (Compose con) `TASK-944` Finance toggle — si shippea antes, Finance hereda el lifecycle gratis.
- (Compose con) `TASK-946` honest degradation states — los 8 estados de TASK-945 incluyen los 5 de TASK-946; si TASK-946 shippea antes, TASK-945 extiende; si TASK-945 shippea antes, TASK-946 se simplifica al sub-set lifecycle-specific.

### Blocks / Impacts

- 5 surfaces Nexa Insights (Home, Agency, Space 360, Person 360, Finance — esta última depende también de TASK-944).
- Endpoint readers: extender shape de `NexaInsightItem` con `lifecycle: NexaSignalObservation[]` + `lifecycleStatus: 'active'|'resolved'`.
- `NexaInsightsBlock` + `NexaInsightsTimeline` (UI components core).
- Microcopy `GH_NEXA` (extensión es-CL).

### Files owned

- `src/components/greenhouse/NexaInsightsBlock.tsx` — MODIFY (sparkline inline en header colapsado, badge "Resuelto", lifecycle expandido).
- `src/components/greenhouse/NexaInsightsTimeline.tsx` — MODIFY (acepta `NexaSignalLifecycle[]` además del shape actual; backward-compat).
- `src/components/greenhouse/NexaSeveritySparkline.tsx` — NEW (componente sparkline canonical, reusa ApexCharts pattern de `StatsWithAreaChart`).
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — MODIFY (reader devuelve `lifecycle` + `lifecycleStatus` por signal).
- `src/config/greenhouse-nomenclature.ts` — MODIFY (microcopy es-CL nuevo).
- 5 endpoints Nexa Insights — MODIFY (incluyen `lifecycle` en payload).
- Tests Vitest + Testing Library en cada componente nuevo/modificado.

## Current Repo State

### Already exists

- `NexaInsightsTimeline.tsx` — MUI Lab Timeline funcional con dots, connectors, severity chip (refactorable).
- `NexaInsightsBlock.tsx` — Accordion + toggle recent/timeline funcional.
- `StatsWithAreaChart` Vuexy — pattern canonical sparkline ApexCharts (referencia para `NexaSeveritySparkline`).
- 5 surfaces ya consumen el block + 4 ya pasan timeline.
- ApexCharts + Recharts activos (no agregar lib nueva).
- TASK-943 entregará el event log append-only.

### Gap

- Timeline actual muestra **enrichment events** (LLM), no **signal lifecycle** (anomaly observations).
- Sin sparkline inline en header colapsado.
- Sin "Resolved" detection ni badge.
- Sin 8 estados UI distinguibles (todo colapsa a EmptyState ambiguo).
- Severity encoding actual usa solo chip color (sin icon + label), no triple-encoding.

## Scope

### Slice 1 — Reader extiende shape lifecycle

- En `llm-enrichment-reader.ts` (ICO y Finance equivalente), agregar al shape `NexaInsightItem`:
  - `lifecycle: NexaSignalObservation[]` (ordered ASC by `generated_at`): `[{ generatedAt, severity, currentValue }]`.
  - `lifecycleStatus: 'active' | 'resolved'` derivado: `resolved` si `lifecycle[last].generated_at < latest_cron_run_for_period`.
- Query lee de `ai_signals_current` (latest per signal_id) para active+latest, + `ai_signals` raw filtered por `signal_id IN (...)` para historic trail.
- Limit lifecycle a últimas 30 observations por signal (suficiente para 1 mes con cron diario; raro que excedan).

### Slice 2 — `NexaSeveritySparkline` component (canonical)

- Nuevo componente reusable: `<NexaSeveritySparkline observations={lifecycle} compact={boolean} />`.
- Implementación: ApexCharts sparkline mode (canonical Vuexy `StatsWithAreaChart` referencia).
- Encoding: severity → numeric proxy (ok=1, warning=2, error=3); stepped line; color del último punto = severity actual (semaphore).
- Dimensiones: `120×40px` desktop, `60×24px` mobile (compact).
- a11y: `role='img'` + `aria-label='Evolución de severidad: 5 observaciones del 5 al 25 de mayo. Última: Crítico.'` (generado por helper).
- `prefers-reduced-motion`: render estático (`animations.enabled = false`).

### Slice 3 — `NexaInsightsTimeline` extiende a lifecycle

- Aceptar nuevo shape: `lifecycles: NexaSignalLifecycle[]` (cada uno con sus observations).
- Backward-compat: shape actual `insights: NexaTimelineItem[]` sigue funcionando (alias derivado: una lifecycle = un dot único en timeline).
- Render por lifecycle: MUI Timeline vertical con dots = observations + connector entre dots + dot final verde si `lifecycleStatus='resolved'`.
- Dot severity = triple-encoding (chip color + icon Tabler + tooltip con label es-CL + timestamp).
- Keyboard nav: arrow keys mueven focus entre dots; Enter abre detalle (drawer / modal con narrativa LLM enriched).
- a11y: `role='list'` + cada dot `role='listitem'` + `aria-label` per dot.

### Slice 4 — `NexaInsightsBlock` integra sparkline + resolved badge

- En el header colapsado del Accordion de cada signal:
  - Severity chip actual (triple-encoded).
  - **NEW** `<NexaSeveritySparkline observations={...} compact />` inline.
  - **NEW** "Resuelto hace X" badge (success chip + icon `tabler-circle-check`) si `lifecycleStatus='resolved'`.
- En el body expandido del Accordion:
  - Narrativa LLM existente (preservar).
  - **NEW** Timeline completa via `NexaInsightsTimeline lifecycles={[lifecycle]}`.
  - Footer: toggle "Ver datos tabulares" → table fallback (a11y).

### Slice 5 — Estados UI honest degradation

Render del Block según `dataStatus` (composable con TASK-946):

| Estado | Render |
|---|---|
| `loading` | Skeleton sized 4 cards + header (Vuexy Skeleton); `aria-busy=true` |
| `empty-pending` (cron no corrió) | `EmptyState` icon `tabler-clock` + microcopy "Aún sin observaciones para este período. Volvé en unas horas." |
| `empty-positive` (cron OK, sin anomalías) | `EmptyState` icon `tabler-circle-check` color success + microcopy "Sin anomalías detectadas — salud operativa OK." |
| `ready-single-point` (1 observation per signal) | Block normal SIN sparkline (datapoint único no es trayectoria); chip severity. |
| `ready-evolving` (multiple observations) | Block normal CON sparkline + lifecycle expandido disponible. |
| `stale-degraded` (signal `no_new_signals_in_24h` warning/error) | MUI Alert severity='warning' arriba del block: "Análisis del pipeline pausado — última observación hace X. Revisar estado." + render del block actual con badge "Stale" en cada signal. `role='alert'`. |
| `readonly` (mes cerrado, congelado) | Block normal + chip header "Período cerrado — sin updates" + disabled live updates. |
| `resolved-per-signal` | NO es estado del block, ES estado del signal individual → badge "Resuelto hace X" en header de ese accordion específico. |

### Slice 6 — Microcopy es-CL canonical

Extender `GH_NEXA` en `greenhouse-nomenclature.ts`:

```ts
GH_NEXA = {
  // ... existentes
  lifecycle_emerged: 'Anomalía detectada',
  lifecycle_severity_changed: 'Severidad cambió',
  lifecycle_resolved: 'Resuelta',
  lifecycle_resolved_relative: (when) => `Resuelta hace ${when}`,
  state_empty_pending: 'Aún sin observaciones para este período',
  state_empty_pending_help: 'El cron diario corre en la madrugada Santiago. Volvé en unas horas.',
  state_empty_positive: 'Sin anomalías detectadas',
  state_empty_positive_help: 'Salud operativa OK para el período actual.',
  state_stale_degraded: 'Análisis del pipeline pausado',
  state_stale_degraded_help: 'Sin observaciones nuevas en {hours}h. Revisar estado del pipeline.',
  state_readonly: 'Período cerrado',
  state_readonly_help: 'Las observaciones de este período están congeladas.',
  sparkline_aria_label: (count, severity) => `Evolución de severidad: ${count} observaciones. Última: ${severity}.`,
  table_fallback_toggle: 'Ver datos tabulares'
}
```

Validar con skill `greenhouse-ux-writing` antes de mergear.

### Slice 7 — Tests + a11y audit

- Vitest + Testing Library:
  - `NexaSeveritySparkline.test.tsx` — render shape, a11y, reduced-motion.
  - `NexaInsightsTimeline.test.tsx` — backward-compat (insights[]) + new shape (lifecycles[]).
  - `NexaInsightsBlock.test.tsx` — 8 estados, sparkline inline, resolved badge, table fallback.
- a11y audit con axe-core en cada estado.
- Keyboard navigation manual: Tab into block → arrow keys entre dots → Enter expande detalle → Esc colapsa.
- Visual regression en staging (browser smoke con `prefers-reduced-motion` + dark mode).

## Out of Scope

- Cambios al modelo backend (TASK-943 entrega la data).
- SSE / WebSocket / live updates en tiempo real (poll-on-focus suficiente V1).
- Dashboard cross-signal (cuántas activas vs resueltas por día) — task derivada si emerge.
- Sonification de severity (dataviz-design lo menciona como emerging; out of scope V1).
- Cambio de chart library (Apex es canonical; ECharts queda para futura migración estratégica si emerge).
- Tabla full DataTableShell (TASK-743) — table fallback es solo toggle a11y, no surface principal.

## Acceptance Criteria

- [ ] `NexaInsightsBlock` muestra sparkline severity inline en el header colapsado de cada signal con ≥2 observations.
- [ ] Signal con `lifecycleStatus='resolved'` muestra badge "Resuelta hace X" en el header (chip success + icon Tabler + label es-CL).
- [ ] `NexaInsightsTimeline` renderiza la lifecycle completa al expandir (dots por observation con triple-encoding severity, connectors, dot final verde si resolved).
- [ ] 8 estados UI distinguibles (loading, empty-pending, empty-positive, ready-single-point, ready-evolving, stale-degraded, readonly, resolved-per-signal).
- [ ] a11y: cada dot keyboard-navigable, role/aria-label correctos, table fallback toggle funcional, `prefers-reduced-motion` respetado.
- [ ] Microcopy es-CL canonical extendiendo `GH_NEXA`, validado con `greenhouse-ux-writing`.
- [ ] Tests anti-regresión cubren backward-compat (consumers que aún no pasan lifecycle siguen funcionando).
- [ ] 5 surfaces (Home/Agency/Space/Person/Finance) ven el nuevo render sin breakage.

## Verification

- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm lint`.
- `pnpm vitest run src/components/greenhouse src/lib/ico-engine/ai/llm-enrichment-reader`.
- `pnpm build`.
- Browser smoke: cada surface (Home/Agency/Space/Person/Finance) con datos reales — verificar render lifecycle + sparkline + resolved badge.
- a11y audit axe-core en cada estado UI.
- `prefers-reduced-motion`: verificar sparkline estática + sin entrada animada.
- Dark mode: verificar contraste severity colors + sparkline visible.
- Mobile breakpoint: verificar sparkline `60×24px` + timeline vertical sin overflow.

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md` (mejora visible).
- [ ] `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` Delta si el patrón sparkline-en-accordion-header emerge como canonical reusable.
- [ ] Doc funcional `docs/documentation/...` si el operador descubre nueva capacidad.
- [ ] Cross-ref: TASK-943 (proveedor data), TASK-944 (Finance toggle), TASK-946 (states), ISSUE-082 (parent incident).

## Pillars (5-pillar ICO + 4-pillar arch)

| | |
|---|---|
| **Safety** | UI-only task; cero impacto en bonus/payroll/writeback. Backward-compat (consumers que no pasan lifecycle siguen funcionando). Honest degradation: nunca pinta `null`/`0` como sano (cierra el último gap UX del falso-sano ISSUE-082). |
| **Robustness** | Reusa MUI Lab Timeline + ApexCharts canonical (battle-tested). Triple-encoding severity (a11y robust). Table fallback para a11y total. |
| **Resilience** | 8 estados UI distinguibles cubren toda la matriz de fallos (loading/empty-pending/empty-positive/stale-degraded/readonly). Reduced-motion respetado. Mobile-first. |
| **Scalability** | Volumen ICO (~5-20 signals/mes × 1-30 obs/signal). Apex sparkline renderiza linear, sin contention. Cero bundle nuevo (reuse libs activos). |
| **Auditability** ⭐ | Cada dot del timeline = observación reproducible desde el event log append-only (TASK-943). El operador puede auditar "cuándo apareció X anomalía, cómo evolucionó, cuándo se resolvió" con evidencia visual + tabla fallback. |
