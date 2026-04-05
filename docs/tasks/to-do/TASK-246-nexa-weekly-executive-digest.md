# TASK-246 — Narrativa ejecutiva semanal de Nexa

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-244` (valida widget de Home)
- Branch: `task/TASK-246-nexa-weekly-executive-digest`
- Legacy ID: `none`

## Summary

Nexa genera un digest semanal consolidado con los top insights cross-Space y cross-dominio, enviado por email al equipo de liderazgo cada lunes a las 7 AM. El digest incluye narrativas con nombres de entidades, métricas operativas y acciones sugeridas.

## Why This Task Exists

Los insights de Nexa solo son visibles cuando alguien abre el portal. El equipo de liderazgo necesita un resumen proactivo semanal que llegue a su inbox sin requerir login. Hoy no existe ningún mecanismo de delivery de inteligencia operativa fuera del portal.

## Goal

- Email semanal con top 5-10 insights ordenados por severidad y impacto
- Narrativas con nombres de entidades (sin @mention chips — solo texto con links HTML)
- Métricas de contexto: total señales analizadas, distribución por severidad, Spaces afectados
- Trigger: Cloud Scheduler cada lunes 7 AM Santiago
- Destinatarios configurables por rol (efeonce_admin, efeonce_operations)

## Architecture Alignment

Revisar y respetar:
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato de la capa
- `docs/architecture/GREENHOUSE_BATCH_PROCESSING_POLICY_V1.md` (§1.1) — Cloud Run para batch

Reglas obligatorias:
- El email se envía vía Resend (ya integrado para notificaciones)
- El template usa `@react-email/components` (ya instalado)
- Cloud Scheduler trigger → Cloud Run worker (no Vercel cron)
- El digest es informativo — no incluye datos financieros sensibles por email

## Dependencies & Impact

### Depends on
- Enrichments materializados en PostgreSQL serving
- TASK-244 (valida que reader cross-Space funciona)
- Email delivery via Resend (`src/lib/notifications/`)
- Cloud Run worker para trigger

### Blocks / Impacts
- Primer delivery de inteligencia AI fuera del portal
- Base para futuras notificaciones proactivas (Slack, Teams)

### Files owned
- `src/lib/nexa/digest/` — nuevo: builder del digest
- `src/lib/nexa/digest/build-weekly-digest.ts` — agrega insights, formatea
- `src/lib/nexa/digest/digest-email-template.tsx` — template React Email
- `services/ico-batch/server.ts` — agregar endpoint `POST /nexa/weekly-digest`

## Current Repo State

### Already exists
- Enrichments cross-Space en PostgreSQL serving
- Email delivery via Resend
- `@react-email/components` instalado
- Cloud Run worker (`ico-batch-worker`)
- Cloud Scheduler pattern probado

### Gap
- No existe digest builder
- No existe template de email para insights
- No existe endpoint para trigger del digest
- No existe configuración de destinatarios por rol

## Scope

### Slice 1 — Digest builder
- Crear `build-weekly-digest.ts`: agrega top N enrichments de la semana
- Ordena por severity (critical > warning > info), luego quality score
- Agrupa por Space para narrativa contextualizada
- Incluye métricas de resumen: total señales, distribución severidad, Spaces afectados

### Slice 2 — Email template
- Crear template React Email con:
  - Header: "Resumen semanal — Nexa Insights" + período
  - Sección por Space con insights (texto con links HTML, no chips)
  - Footer: disclaimer + link al portal
- Estilo: minimalista, mobile-friendly, Greenhouse branding (DM Sans, colores)

### Slice 3 — Trigger y delivery
- Agregar `POST /nexa/weekly-digest` al Cloud Run worker
- Cloud Scheduler job: lunes 7 AM Santiago
- Resolver destinatarios desde roles (efeonce_admin, efeonce_operations)
- Enviar vía Resend

## Out of Scope
- Personalización del digest por usuario
- Frecuencia configurable (solo semanal por ahora)
- Digest vía Slack o Teams (follow-up)
- Datos financieros sensibles en el email

## Acceptance Criteria
- [ ] `buildWeeklyDigest()` retorna estructura con top insights agrupados por Space
- [ ] Template React Email renderiza correctamente con insights y links
- [ ] `POST /nexa/weekly-digest` envía email a destinatarios configurados
- [ ] Cloud Scheduler job dispara cada lunes 7 AM
- [ ] Email recibido con narrativas legibles y links al portal
- [ ] `pnpm build` y `pnpm lint` sin errores

## Verification
- Trigger manual del endpoint → email recibido
- Validar que links en email navegan correctamente al portal

## Closing Protocol
- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con canal de email delivery
- [ ] Actualizar `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con nuevo scheduler job

## Follow-ups
- Digest personalizado por rol o Space asignado
- Delivery vía Slack webhook
- Frecuencia configurable (diaria, semanal, mensual)
- Métricas de apertura y click en email
