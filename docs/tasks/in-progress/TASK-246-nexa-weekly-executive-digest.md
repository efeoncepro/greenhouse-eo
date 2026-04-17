# TASK-246 — Narrativa ejecutiva semanal de Nexa

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado localmente + validado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-246-nexa-weekly-executive-digest`
- Legacy ID: `none`

## Summary

Nexa genera un digest semanal consolidado con los top insights **cross-Space e ICO-first**, enviado por email al equipo de liderazgo cada lunes a las 7 AM Santiago. El digest incluye narrativas con nombres de entidades, métricas de contexto del carril Nexa/ICO y acciones sugeridas. La lane cross-domain queda preparada como follow-up, pero no debe asumirse implementada en este corte.

## Why This Task Exists

Los insights de Nexa solo son visibles cuando alguien abre el portal. El equipo de liderazgo necesita un resumen proactivo semanal que llegue a su inbox sin requerir login. Hoy no existe ningún mecanismo de delivery de inteligencia operativa fuera del portal.

## Goal

- Email semanal con top 5-10 insights ordenados por severidad y impacto
- Narrativas con nombres de entidades (sin @mention chips — solo texto con links HTML)
- Métricas de contexto del serving Nexa/ICO: total insights incluidos, distribución por severidad, Spaces afectados
- Trigger: Cloud Scheduler cada lunes 7 AM Santiago
- Destinatarios resueltos por rol (`efeonce_admin`, `efeonce_operations`) con filtro explícito a usuarios internos activos

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato de la capa
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (§1.1, §4.9, §5) — Cloud Run para batch y scheduler pattern
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md` — familia `weekly_executive_digest`

Reglas obligatorias:
- El email se envía vía `src/lib/email/delivery.ts` sobre Resend
- El template usa `@react-email/components` (ya instalado)
- Cloud Scheduler trigger → Cloud Run worker (no Vercel cron)
- El worker canónico para este corte es `ops-worker`; `ico-batch` sigue reservado a materialización/enrichment ICO
- El digest es informativo — no incluye datos financieros sensibles por email

## Dependencies & Impact

### Depends on
- Enrichments materializados en PostgreSQL serving
- Readers cross-Space ya activos (`TASK-242`, `TASK-243`, `TASK-244`)
- Email delivery via Resend (`src/lib/email/delivery.ts`)
- Cloud Run worker para trigger

### Blocks / Impacts
- Primer delivery de inteligencia AI fuera del portal
- Base para futuras notificaciones proactivas (Slack, Teams)

### Files owned
- `src/lib/nexa/digest/` — nuevo: builder del digest
- `src/lib/nexa/digest/build-weekly-digest.ts` — agrega insights, formatea
- `src/emails/WeeklyExecutiveDigestEmail.tsx` — template React Email
- `src/lib/email/types.ts` — agregar `weekly_executive_digest`
- `src/lib/email/templates.ts` — registrar template + preview metadata
- `services/ops-worker/server.ts` — agregar endpoint `POST /nexa/weekly-digest`
- `services/ops-worker/deploy.sh` — agregar scheduler job semanal

## Current Repo State

### Already exists
- Enrichments cross-Space ICO en PostgreSQL serving
- Readers reutilizables en `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- Resolución de destinatarios por rol en `src/lib/notifications/person-recipient-resolver.ts`
- Email delivery via Resend + React Email + preview registry
- `@react-email/components` instalado
- Cloud Run worker (`ops-worker`) con patrón scheduler probado
- Cloud Scheduler pattern probado

### Gap
- No existe digest builder
- No existe template de email para insights
- No existe endpoint para trigger del digest
- No existe `EmailType` para `weekly_executive_digest`
- No existe resolución digest-friendly de `@mentions` a links HTML
- No existe configuración persistida `role -> digest`; el corte usa resolución runtime por rol

## Scope

### Slice 1 — Digest builder
- Crear `build-weekly-digest.ts`: agrega top N enrichments de la semana sobre el serving ICO-first
- Ordena por severity (`critical > warning > info`), luego quality score
- Agrupa por Space para narrativa contextualizada
- Incluye métricas de resumen del digest: total insights incluidos, distribución severidad, Spaces afectados

### Slice 2 — Email template
- Crear template React Email con:
  - Header: "Resumen semanal — Nexa Insights" + período
  - Sección por Space con insights (texto con links HTML, no chips)
  - Footer: disclaimer + link al portal
- Estilo: minimalista, mobile-friendly, Greenhouse branding (DM Sans, colores)

### Slice 3 — Trigger y delivery
- Agregar `POST /nexa/weekly-digest` al Cloud Run worker
- Cloud Scheduler job: lunes 7 AM Santiago
- Resolver destinatarios desde roles (`efeonce_admin`, `efeonce_operations`) reutilizando helpers existentes y filtrando a `tenant_type='efeonce_internal'`
- Enviar vía `sendEmail()`

## Out of Scope
- Personalización del digest por usuario
- Frecuencia configurable (solo semanal por ahora)
- Digest vía Slack o Teams (follow-up)
- Lane cross-domain fuera de ICO en este corte
- Datos financieros sensibles en el email

## Acceptance Criteria
- [x] `buildWeeklyDigest()` retorna estructura con top insights agrupados por Space
- [x] Template React Email renderiza correctamente con insights y links
- [x] `POST /nexa/weekly-digest` queda implementado para enviar email a destinatarios configurados
- [x] Cloud Scheduler job queda definido para disparar cada lunes 7 AM
- [ ] Email recibido con narrativas legibles y links al portal
- [x] `pnpm build` y `pnpm lint` sin errores

## Verification
- Trigger manual del endpoint → email recibido
- Validar que links en email navegan correctamente al portal

## Closing Protocol
- [x] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con canal de email delivery
- [x] Actualizar `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con nuevo scheduler job
- [x] Actualizar `GREENHOUSE_EMAIL_CATALOG_V1.md` con `weekly_executive_digest` como template activo

## Follow-ups
- Digest cross-domain real cuando Finance/otros lanes advisory estén materializados
- Digest personalizado por rol o Space asignado
- Delivery vía Slack webhook
- Frecuencia configurable (diaria, semanal, mensual)
- Métricas de apertura y click en email
