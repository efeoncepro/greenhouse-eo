# TASK-384 — Email Compliance & Retención GDPR

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-384-email-compliance-retencion`
- Legacy ID: none
- GitHub Issue: none

## Summary

La columna `delivery_payload` en `email_deliveries` almacena datos personales (nombres, montos de nómina, contexto de permisos) indefinidamente. GDPR exige minimización de datos y un mecanismo de borrado por persona. Esta task implementa: (1) un cron semanal que nullifica `delivery_payload` a los 90 días, (2) un endpoint admin para anonimizar registros de una persona específica bajo solicitud, y (3) verificación en producción de que el priority bypass para emails `critical` y `transactional` funciona correctamente.

## Why This Task Exists

TASK-382 agregó la columna `data_redacted_at` anticipando retención, pero el cron que la utiliza nunca se implementó. Los payloads con datos de nómina (salarios, bonos, RUT) y datos de RR.HH. (decisiones de permisos, jerarquías) se acumulan indefinidamente. Si un empleado ejerce derecho de supresión, no hay mecanismo técnico para atenderlo.

Adicionalmente, la DB muestra emails de HR (`leave_request_decision`, etc.) con `priority='broadcast'` en lugar de `'transactional'` — lo que sugiere que el bypass de rate limits para emails operacionales puede no estar funcionando correctamente en producción, o que esos registros son pre-TASK-382.

## Goal

- Automatizar la redacción de `delivery_payload` a los 90 días para todos los registros
- Proveer un endpoint admin que anonimice todos los registros de email de una persona por solicitud
- Confirmar (o corregir) que emails `transactional` y `critical` bypasean el rate limiter en producción

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso runtime/migrator
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — autorización de endpoints admin

Reglas obligatorias:

- El cron de retención NO borra filas — solo nullifica `delivery_payload` y `recipient_name` (mantener `recipient_email` y `status` para auditoría)
- El endpoint de borrado individual SÍ puede anonimizar `recipient_email` → `redacted@deleted.local` bajo solicitud explícita con body `{ confirm: true }`
- Requiere `requireAdminTenantContext` o equivalente de nivel `efeonce_admin` — no debe ser accesible por tenants regulares
- El cron debe ser idempotente: filas con `data_redacted_at IS NOT NULL` no se tocan

## Normative Docs

- `src/app/api/cron/email-delivery-retry/route.ts` — patrón de cron existente
- `src/lib/email/delivery.ts` — `deliverRecipient()` y el rate limiter para verificar el bypass
- `src/lib/email/rate-limit.ts` — lógica actual de rate limiting
- `migrations/20260413162238855_email-delivery-enterprise-v2.sql` — columna `data_redacted_at` ya existe

## Dependencies & Impact

### Depends on

- `TASK-382` (complete) — columna `data_redacted_at` ya existe en `email_deliveries`
- `greenhouse_notifications.email_deliveries` — target del cron de retención
- Autorización admin (`requireAdminTenantContext`) — ya implementada en `src/lib/tenant/authorization.ts`

### Blocks / Impacts

- Ninguna task bloqueada por esta
- El endpoint de borrado individual es prerequisito para atender solicitudes GDPR individuales

### Files owned

- `src/app/api/cron/email-retention/route.ts` — nuevo cron semanal
- `src/app/api/admin/email/recipient-data/route.ts` — nuevo endpoint de anonimización
- `src/lib/email/rate-limit.ts` — posible fix si el bypass falla
- `src/lib/email/delivery.ts` — posible fix en `deliverRecipient()` si priority bypass tiene bug
- `vercel.json` — registrar nuevo cron

## Current Repo State

### Already exists

- `greenhouse_notifications.email_deliveries.data_redacted_at TIMESTAMPTZ` — columna lista para usar
- `src/lib/tenant/authorization.ts` — `requireAdminTenantContext()` disponible
- `src/app/api/cron/email-delivery-retry/route.ts` — patrón replicable para el nuevo cron
- `src/lib/email/rate-limit.ts` — rate limiter existente
- `EMAIL_PRIORITY_MAP` en `src/lib/email/types.ts` — mapping de tipo a prioridad

### Gap

- No existe cron de retención de datos
- No existe endpoint de anonimización individual
- No se ha verificado en producción que `critical`/`transactional` bypasean el rate limiter
- La DB muestra emails de HR con `priority='broadcast'` en lugar de `'transactional'` — inconsistencia sin explicación confirmada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verificación de priority bypass

- Leer `deliverRecipient()` en `delivery.ts` y `checkRateLimit()` en `rate-limit.ts`
- Confirmar que el código hace `if (priority === 'broadcast') { checkRateLimit() } else { skip }` o equivalente
- Si el bypass no está implementado correctamente: corregirlo — el rate limiter solo debe aplicar a `broadcast`
- Escribir o actualizar test en `delivery.test.ts` que verifique que `critical` y `transactional` no llaman al rate limiter
- Explicar en `Handoff.md` por qué los registros en DB muestran `broadcast` para emails HR (pre-TASK-382 vs bug real)

### Slice 2 — Cron de retención de datos

- Crear `src/app/api/cron/email-retention/route.ts` con `maxDuration=60`
- Query: `UPDATE email_deliveries SET delivery_payload = NULL, recipient_name = NULL, data_redacted_at = NOW() WHERE created_at < NOW() - INTERVAL '90 days' AND data_redacted_at IS NULL`
- Ejecutar en batches de 500 filas para evitar locks largos
- Responder con `{ redacted: N, durationMs }` para debugging
- Registrar en `vercel.json` como cron semanal (ej. `"0 3 * * 0"` — 3am domingo Santiago)

### Slice 3 — Endpoint de anonimización individual

- Crear `DELETE /api/admin/email/recipient-data` con body `{ email: string, confirm: boolean }`
- Requiere `requireAdminTenantContext()` + `confirm: true` en body (protección contra llamadas accidentales)
- Query: anonimizar todas las filas del recipient — `recipient_email = 'redacted-{hash}@deleted.local'`, `recipient_name = NULL`, `delivery_payload = NULL`, `data_redacted_at = NOW()`
- Preservar `delivery_id`, `status`, `email_type`, `created_at`, `resend_id` para auditoría
- Responder con `{ anonymized: N, email }` — nunca repetir el email original en la respuesta

## Out of Scope

- Borrado físico de filas (solo anonimización lógica)
- UI en el portal para gestionar solicitudes GDPR
- Exportación de datos de un usuario (data portability) — es otra solicitud GDPR diferente
- Observabilidad y alertas (TASK-383)
- Scaling a Cloud Run (TASK-385)

## Detailed Spec

### Verificación del rate limiter bypass

En `deliverRecipient()` debe existir algo equivalente a:

```typescript
if (priority !== 'broadcast') {
  // critical y transactional skip rate limiting completamente
} else {
  const rateLimitResult = await checkRateLimit(recipient.email)
  if (rateLimitResult.limited) {
    // ... registrar como rate_limited
  }
}
```

Si esto no existe o el check ocurre antes de leer la prioridad, el bug es real y debe corregirse.

### Hash para anonimización

```typescript
import { createHash } from 'crypto'
const hash = createHash('sha256').update(email).digest('hex').slice(0, 12)
const redactedEmail = `redacted-${hash}@deleted.local`
```

Permite detectar si dos registros pertenecían al mismo destinatario sin revelar el email original.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /api/cron/email-retention` responde 200 con `{ redacted: N }` y no toca filas con `data_redacted_at IS NOT NULL`
- [ ] `DELETE /api/admin/email/recipient-data` sin `confirm: true` responde 400
- [ ] `DELETE /api/admin/email/recipient-data` con email real y `confirm: true` anonimiza todas las filas y responde con el conteo
- [ ] Un test verifica que `sendEmail()` con `emailType: 'password_reset'` (critical) nunca llama al rate limiter aunque el recipient tenga 10 emails en la última hora
- [ ] Un test verifica que `sendEmail()` con `emailType: 'notification'` (broadcast) sí aplica rate limiting
- [ ] `pnpm lint` y `pnpm tsc --noEmit` pasan sin errores
- [ ] `pnpm test` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Llamada manual a `GET /api/cron/email-retention` en staging — verificar respuesta y que no toca filas recientes
- Llamada manual a `DELETE /api/admin/email/recipient-data` con email de prueba en staging — verificar anonimización en DB

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con el resultado de la verificación del priority bypass
- [ ] `changelog.md` quedo actualizado si se encontró y corrigió un bug en el rate limiter
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] El nuevo cron está registrado en `vercel.json` y verificado en Vercel dashboard
- [ ] Si se encontró un bug en el priority bypass, se actualizó el cierre de TASK-382 con la nota correspondiente

## Follow-ups

- TASK-385 — Email Scaling Cloud Run (diferida)
- Evaluar data portability (exportación de emails enviados a una persona) si legal lo requiere

## Open Questions

- ¿El hash de anonimización debe ser salted para evitar rainbow tables? Depende de si se considera información sensible saber que dos filas corresponden al mismo usuario. Si sí: agregar un salt fijo por ambiente desde env var.
- ¿El endpoint de anonimización debe quedar registrado en `audit_events`? Recomendado para trazabilidad — confirmar con el usuario antes de implementar.
