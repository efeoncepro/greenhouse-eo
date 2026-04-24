# TASK-595 — UI inbox operativo + timeline + filtros (EPIC-006 child 6/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-592`
- Branch: `task/TASK-595-ico-signals-inbox-ui`

## Summary

Reemplazar las cards stateless de signals en dashboards por un inbox operativo con status badges, acciones (acknowledge/assign/resolve/snooze), timeline del signal (eventos completos), filtros por status/severity/dimension/período/tenant, y panel de métricas agregadas (MTTA, MTTR, volumen por severity). Es la superficie humana del sistema.

## Why This Task Exists

Las cards actuales tipo "Nexa insight" muestran narrativa pero no permiten acción — no se puede marcar un signal como visto, cerrarlo, ni ver su historia. Tampoco hay filtros ni ordenamiento. Un inbox operativo eleva la capa a producto alertable con governance de acción.

## Goal

- Vista `/ico-signals` (ruta TBD en discovery) con inbox.
- Filtros: status, severity, dimension, period_year/month, space_id, tag.
- Card de signal con status badge, severity, current vs expected, contribution, `detected_at`/`last_seen_at`, timeline trigger.
- Acciones: acknowledge, resolve (con reason modal), suppress (con until + reason), reenrich.
- Panel métricas: MTTA, MTTR, volumen por severity, auto-resolve rate.
- Reemplaza la sección "Nexa insights" en home con ingest de inbox pero en formato condensado.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`

Reglas UI:
- Invocar skills `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing` durante Discovery.
- Usar primitives Vuexy + tokens canónicos (no hardcoded colors).
- i18n ES por default, tolerante a EN.

## Dependencies & Impact

### Depends on
- `TASK-592` — transitions API.
- `TASK-590` — datos v2.

### Blocks / Impacts
- Home page — reemplaza sección Nexa insights actual (convergencia).
- Admin Ops Health — panel SLIs puede profundizar a inbox.

### Files owned
- `src/views/greenhouse/ico-signals/InboxView.tsx` (nuevo)
- `src/views/greenhouse/ico-signals/SignalCard.tsx`
- `src/views/greenhouse/ico-signals/SignalTimeline.tsx`
- `src/views/greenhouse/ico-signals/SignalFilters.tsx`
- `src/views/greenhouse/ico-signals/SignalActionsMenu.tsx`
- `src/app/(dashboard)/ico-signals/page.tsx`
- `src/views/greenhouse/home/sections/NexaInsightsSection.tsx` (refactor a consumer de inbox)

## Current Repo State

### Already exists
- Home section de Nexa insights (actualmente stateless cards sin acción).
- Cards de root_cause + recommendation en UI (parte del `llm-enrichment-reader.ts` path).
- Primitives Vuexy + theme tokens.

### Gap
- No hay ruta dedicada para signals inbox.
- No hay UX de acciones ni timeline.
- No hay filtros ni panel de métricas agregadas.

## Scope

### Slice 1 — Inbox list view

- Lista paginada con query params `?status=open&severity=critical`.
- Ordenamiento por `priority_score DESC`.
- Card compacta con badges + CTA primary "Revisar".

### Slice 2 — Signal detail drawer + timeline

- Drawer que muestra todo: metadata, narrativa LLM, evidencia (current/expected/z_score/contribution), timeline completo de `signal_events`.
- Actor + timestamp visible en cada evento.

### Slice 3 — Acciones

- `Acknowledge` one-click.
- `Resolve` con modal + `reason` required.
- `Suppress` con `until` + `reason`.
- `Reenrich` con confirmación (consume budget).
- Todas vía POST a transitions API (TASK-592).

### Slice 4 — Filters panel

- Drawer/sidebar con checkbox por status + severity + dimension + period.
- Persiste filtros en URL query params.

### Slice 5 — Aggregates panel

- Top card: MTTA, MTTR, # critical open, auto-resolve rate 30d.
- Gráfica de volumen por día 30d con color por severity.

### Slice 6 — Home section refactor

- `NexaInsightsSection` consume el mismo endpoint pero limit=5, muestra compact cards.
- Link a inbox completo.

### Slice 7 — Copy + accessibility + microinteractions

- Invocar `greenhouse-ux-writing` para copy de modales, empty states, tooltips.
- WCAG AA, keyboard nav, focus management en drawer.
- Microinteractions según `greenhouse-microinteractions-auditor`.

## Out of Scope

- Bulk actions (marcar N signals). Follow-up si UX lo justifica.
- Export CSV (follow-up).
- Dashboard por tenant customizable (v1 es per-user).

## Acceptance Criteria

- [ ] Ruta `/ico-signals` funcional con filtros + acciones.
- [ ] Timeline muestra eventos completos con actor + reason.
- [ ] Todas las transiciones funcionan end-to-end desde UI.
- [ ] Home consume inbox sin duplicar lógica.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean.
- [ ] Revisado con `greenhouse-ui-review` + `greenhouse-microinteractions-auditor`.

## Verification

- Manual: correr todo el flow en staging con tenant Efeonce + tenant Sky.
- A11y check, keyboard nav.
- Screenshots antes/después para changelog.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 6/8 marcado complete.
- [ ] Doc funcional `docs/documentation/ico-signals-inbox.md` creada.

## Follow-ups

- Export CSV.
- Bulk acknowledge.
- Per-tenant customization.
