# TASK-439 — Nexa Daily Role-Based Briefing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (puede arrancar con ICO/Finance; beneficia más cuando Payroll/Staff Aug estén activos)
- Branch: `task/TASK-439-nexa-daily-role-based-briefing`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (follow-on daily briefing)

## Summary

Agrega un brief diario por rol, accionable y corto, complementario al Weekly Executive Digest. Mientras el weekly es ejecutivo/agregado, el daily es operativo/action-oriented: "Ops lead — hoy 2 Spaces con signals nuevas", "Finance lead — 3 clientes bajaron margen sobre umbral", "HR admin — período abierto con 5 anomalías pendientes". Distribución vía email + in-app; Slack/Teams sigue cubierto por TASK-436 para críticos.

## Why This Task Exists

El Weekly Digest es buena vista ejecutiva pero llega tarde para actuar en lo operativo:

- Un signal ICO del lunes no puede esperar al digest del lunes siguiente — el sprint ya está en ejecución.
- Un líder de Finance necesita saber el día siguiente al cierre, no 7 días después.
- Un admin HR necesita brief durante el período abierto, no después del cierre.

TASK-436 cubre críticos (push real-time). Este brief cubre la franja intermedia: signals `warning` + `info` que no son urgentes pero sí relevantes para la cadencia diaria. Role-scoped para que cada persona vea lo suyo.

## Goal

- Email diario (L-V 07:00 Santiago) por rol operativo con signals relevantes del último día.
- Versión in-app en Home: widget "Brief de hoy" que muestra el mismo contenido sin esperar email.
- Scope por rol: ops lead ve ICO + delivery; finance lead ve Finance; HR admin ve Payroll; account lead ve Staff Aug de sus clientes.
- Respetar entitlements: cada persona solo ve signals cuyo scope le corresponde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — follow-on daily briefing.
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — weekly digest como referencia.
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — role-based scoping.

Reglas obligatorias:

- Brief diario L-V (no fin de semana). Configurable por usuario.
- No duplicar señales entre daily y weekly — el weekly consolida lo del week, el daily lo del día.
- Respetar entitlements y scopes: cada persona ve solo lo que le corresponde.
- Si no hay signals relevantes para el rol, NO enviar email vacío (o enviar versión "sin novedades" si el usuario lo prefiere).
- Advisory-only.

## Normative Docs

- `src/lib/nexa/digest/build-weekly-digest.ts` — patrón a adaptar.
- `src/lib/nexa/digest/recipient-resolver.ts`
- `src/emails/WeeklyExecutiveDigestEmail.tsx` — patrón template.

## Dependencies & Impact

### Depends on

- Engines ICO + Finance emiting signals (ya operativos). Se enriquece con TASK-433, TASK-434 cuando estén activos.

### Blocks / Impacts

- Puede reducir uso del Home landing para algunos usuarios (si reciben brief en email directamente).
- Amplifica el ROI de todos los engines sin tocarlos.

### Files owned

- `src/lib/nexa/digest/daily/` (nuevo) — builder por rol
- `src/emails/DailyNexaBriefEmail.tsx`
- `src/lib/email/templates.ts` — registra `daily_nexa_brief`
- Cloud Scheduler: `ops-nexa-daily-brief` (L-V 07:00 Santiago)
- Endpoint en `ops-worker`: `POST /nexa/daily-brief`
- UI widget en Home: `src/views/greenhouse/home/DailyBriefWidget.tsx`
- Settings de usuario: preference "recibir brief diario" + selección de roles activos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Role mapping

- Definir mapping rol → dominios + scope (a validar en planning):
  - `ops_lead` → ICO signals cross-Space + Delivery
  - `finance_lead` → Finance signals portfolio
  - `hr_admin` → Payroll signals del período abierto
  - `account_lead` → Signals de los clients donde tiene ownership
  - `agency_lead` → Agregado ops + finance cross-Space
- Permitir suscripción a múltiples roles por usuario.

### Slice 2 — Recipient resolver

- `src/lib/nexa/digest/daily/recipient-resolver.ts`:
  - Input: lista de roles soportados.
  - Output: lista de `{ userId, email, roles[], scopes }`.
  - Lee de PostgreSQL usando entitlements + ownership.

### Slice 3 — Daily builder

- Construir brief por usuario (no broadcast, cada brief es personalizado):
  - Signals del último día (24h rolling desde 07:00 ayer).
  - Filtrado por los scopes del usuario.
  - Limitado a top N (ej. 5) por severidad + recency.
  - Agrupado por dominio.

### Slice 4 — Email template

- `DailyNexaBriefEmail.tsx` usando React Email.
- Diseño: corto, accionable, mobile-first.
- Cada signal con narrativa breve + link (CTA si TASK-435 está cerrada).
- Empty state: si no hay signals del día, email opcional "sin novedades" según preferencia.

### Slice 5 — Scheduler + endpoint

- `POST /nexa/daily-brief` en `ops-worker`.
- Cloud Scheduler `ops-nexa-daily-brief` L-V 07:00 `America/Santiago`.
- Feriados: respetar `operational-calendar` canónico — no enviar en feriado (configurable).

### Slice 6 — In-app widget

- `DailyBriefWidget.tsx` en Home: mismo contenido, formato visual.
- Se actualiza cuando el usuario entra a Home, sin esperar email.
- CTA "Ver en Nexa" que expande al `NexaInsightsBlock` completo.

### Slice 7 — User preferences

- Settings del usuario: toggle "Recibir brief diario por email", selección de roles.
- Default: activado para roles operativos (ops_lead, finance_lead, hr_admin).
- Desactivado para roles pasivos (colaborador sin ownership).

### Slice 8 — Unsubscribe flow

- Link "Preferencias" en cada email va a settings directo.
- Cumplimiento con regla de unsubscribe one-click (estándar anti-spam).

## Out of Scope

- Brief para clientes externos (el cliente consume vía Client Portal, TASK-432).
- Brief en formato audio/voice.
- Personalización ML del contenido (orden basado en engagement histórico). Follow-on.
- SMS/push móvil (solo email + in-app).

## Acceptance Criteria

- [ ] Recipient resolver devuelve lista correcta según roles y scopes.
- [ ] Daily builder produce brief personalizado por usuario.
- [ ] Email template renderiza correcto en clientes mainstream.
- [ ] Cloud Scheduler activa el endpoint L-V 07:00 Santiago.
- [ ] Feriados respetan operational-calendar.
- [ ] Widget in-app en Home muestra el brief cuando el usuario entra.
- [ ] User preferences permiten toggle + selección de roles.
- [ ] Unsubscribe one-click funcional.
- [ ] No se envía email a usuarios sin signals relevantes (salvo que preferencia lo pida).
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] Validación manual: un usuario con role `finance_lead` recibe brief con solo Finance signals.

## Verification

- Tests unitarios del recipient resolver, builder, template rendering.
- Tests de integración: scheduler trigger → emails enviados correctamente.
- Validación manual en staging con 2-3 usuarios de roles distintos.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con daily brief.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con follow-on cerrado.
- [ ] Documentar en `docs/documentation/delivery/` el nuevo brief operativo.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El brief incluye predicciones/forecasts o solo signals ya detectados? Recomendación: solo signals — evitar especulación.
- ¿Cuándo el usuario está de vacaciones (permiso activo), se suspende el brief? Recomendación: sí, automáticamente si `hr.leaves` tiene permiso aprobado activo.
- ¿El brief se co-genera con LLM o es determinístico (listado de signals ya enriquecidos)? Recomendación: determinístico — el enrichment LLM ya ocurrió al generar los signals; este brief solo ordena y filtra.
- ¿Se respeta el quiet-hour del usuario (ej. recibir a las 09:00 en vez de 07:00)? V1: hora fija; v2: configurable.
