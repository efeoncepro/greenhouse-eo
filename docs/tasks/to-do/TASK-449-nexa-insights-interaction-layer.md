# TASK-449 — Nexa Insights Interaction Layer (Read / Pin / Dismiss / Share)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-449-nexa-insights-interaction-layer`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Convierte Nexa Insights de un feed read-only en una superficie accionable: cada insight soporta `read / unread`, `pin`, `dismiss`, `snooze` y `share link`. Persistencia por usuario en `nexa_insight_user_state`, filtros UI "Sin leer" / "Pinned", permalink con `?insightId=...&highlight=mention:id` para compartir internamente y trackear conversión de signal → acción real.

## Why This Task Exists

Auditoría confirmó:

- `NexaInsightsBlock` es read-only — no tiene pin/dismiss/read state
- No hay telemetría de engagement con insights
- No hay permalink ni share — compartir un insight hoy requiere screenshot o copiar texto

Para una plataforma enterprise que aspira a ser el layer de intelligence del negocio, no tener state de lectura ni share es incompleto. Además, sin read/dismiss el feed se vuelve ruidoso en cuanto crece — el operador pierde confianza.

## Goal

- Tabla `greenhouse_core.nexa_insight_user_state` con estado por (user, insight)
- UI: menú per-card con acciones `Marcar leído`, `Fijar`, `Posponer`, `Ignorar`, `Compartir`
- Filtros en el feed: `Todos | Sin leer | Pinned | Para mí`
- Permalink `/[tenant]/nexa/insights/{id}?highlight=mention:...` que deep-linkea
- Share link generator con copy-to-clipboard
- Telemetría `insight.read`, `insight.pin`, `insight.dismiss`, `insight.share`, `insight.click`
- Snooze: vuelve a aparecer después de X días / semanas
- Badge de "Sin leer" en el menú sidebar Nexa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- Estado por usuario es privado — un usuario no ve el pin de otro
- Dismiss no borra el insight del sistema, solo del feed del usuario
- Share link respeta RBAC — si el receptor no tiene acceso a la entidad del insight, 403
- Snooze es por usuario, no global

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-436-nexa-critical-push-distribution.md`
- `docs/tasks/to-do/TASK-439-nexa-daily-role-based-briefing.md`

## Dependencies & Impact

### Depends on

- Auth / session del usuario
- `ico_signal_enrichments` y fuentes equivalentes (finance, payroll) con IDs estables

### Blocks / Impacts

- TASK-436 (critical push): push solo a usuarios que NO han dismissed el insight
- TASK-439 (daily briefing): brief respeta snoozes / dismissals
- TASK-448 (reverse index): share link highlights mención específica

### Files owned

- `migrations/<timestamp>_nexa-insight-user-state.sql` — nuevo
- `src/lib/nexa/insights/user-state.ts` — nuevo
- `src/app/api/nexa/insights/[id]/state/route.ts` — nuevo (POST / PATCH / DELETE)
- `src/app/api/nexa/insights/[id]/share/route.ts` — nuevo (opcional: crea slug corto)
- `src/components/greenhouse/NexaInsightsBlock.tsx` — modificar: acciones + filtros
- `src/components/greenhouse/NexaInsightCardMenu.tsx` — nuevo
- `src/components/greenhouse/NexaInsightShareDialog.tsx` — nuevo
- `src/app/(dashboard)/nexa/insights/[id]/page.tsx` — nuevo (permalink view)

## Current Repo State

### Already exists

- `NexaInsightsBlock` con cards read-only
- Sistema de notificaciones in-app (TASK-386..390 pipeline)
- Navigation sidebar con módulo Nexa (asumiendo mount existente)

### Gap

- No hay persistencia de estado user↔insight
- No hay menú contextual en card
- No hay permalink ni share
- No hay filtros por estado
- No hay counter de "unread" en sidebar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tabla + migración

```sql
CREATE TABLE greenhouse_core.nexa_insight_user_state (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  insight_id TEXT NOT NULL,
  insight_source TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, insight_id)
);
CREATE INDEX nius_user ON greenhouse_core.nexa_insight_user_state (tenant_id, user_id, last_interaction_at DESC);
```

### Slice 2 — API state

- `POST /api/nexa/insights/[id]/state` body `{ action: 'read' | 'pin' | 'unpin' | 'dismiss' | 'snooze' | 'undismiss', snoozeUntil? }`
- Upsert idempotente
- Telemetría emitida
- Permisos: solo el propio usuario

### Slice 3 — Menu component

- `NexaInsightCardMenu` (MUI Menu):
  - `Marcar como leído / no leído`
  - `Fijar en el tope`
  - `Posponer 1 semana / 1 mes`
  - `Ignorar este insight`
  - `Copiar link`
  - `Compartir con equipo…`

### Slice 4 — Filtros del feed

- Chips toggle: `Todos | Sin leer | Fijados | Para mí`
- Estado persistido por usuario (localStorage + preferencia en PG via `user_preferences` si existe)
- Count por filtro mostrado inline

### Slice 5 — Permalink view

- `/(dashboard)/nexa/insights/[id]` renderiza un insight card standalone con todo el contexto (explanation + rootCause + recommendedAction + mentions + preview cards)
- Query `?highlight=mention:member:id` scrolls y pulsa el chip específico
- Auto-marca como leído al abrir

### Slice 6 — Share dialog

- Selección de miembros internos + mensaje opcional
- Genera notificación in-app (TASK-388) + email fallback
- Log en `nexa_mention_events` como `shared`

### Slice 7 — Unread badge en sidebar

- Counter en el ítem Nexa del sidebar con badge de unread
- Respeta filtro "Para mí" (solo insights relevantes al rol/scope del usuario)

## Out of Scope

- Acciones colaborativas multi-usuario (comentar, reply) — follow-up
- Bulk actions (select multiple → dismiss all)
- Automatic read on scroll — decidir en plan mode (puede ser confuso)

## Detailed Spec

### Lógica de filter "Sin leer"

- Unread = no existe row en `nexa_insight_user_state` con `read_at IS NOT NULL` para ese user/insight
- Dismissed = `dismissed_at IS NOT NULL` excluido del feed por default
- Snoozed = `snoozed_until > now()` excluido hasta la fecha

### Permalink con highlight

```
/nexa/insights/ico_signal_enrichment_abc123?highlight=mention:space:spc-ae463d9f
```

El layout parsea `highlight` → aplica `data-highlight="true"` al chip correspondiente → animación pulse 2s.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Tabla creada + migración aplicada
- [ ] APIs read/pin/dismiss/snooze/share funcionales
- [ ] Menu contextual en card
- [ ] Filtros All / Unread / Pinned / For me
- [ ] Permalink renderiza insight standalone con highlight
- [ ] Share dialog notifica al destinatario
- [ ] Unread badge en sidebar
- [ ] Telemetría registrada
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm test -- nexa/insights/user-state`
- Manual: abrir insight → verificar auto-read
- Manual: pin → top del feed; dismiss → desaparece; snooze → regresa después de fecha
- Manual: share → receptor recibe notificación
- Manual: permalink con highlight → chip pulsa
- axe DevTools

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-436, TASK-439, TASK-441, TASK-446, TASK-447, TASK-448

## Follow-ups

- Bulk actions
- Reacciones y comentarios
- Auto-read on scroll con debounce
- Export CSV de insights pinned

## Open Questions

- ¿Snooze options fijos o custom date picker? Propuesta: presets (1d, 1w, 1m) + custom.
- ¿Share genera short slug o usa insight_id directo? Decisión en plan mode.
