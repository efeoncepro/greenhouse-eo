# TASK-128 — Webhook Consumers Roadmap: Slack, Invalidation, Nubox Push & In-App Notifications

## Delta 2026-03-29
- El Slice 4 (`In-App Notifications via webhook bus`) ya quedó implementado y validado en `staging` por `TASK-129`.
- Evidencia real:
  - `assignment.created` visible en campanita
  - `payroll_period.exported` crea notificaciones `payroll_ready` para recipients resolubles del período
- Este roadmap ya no debe tratar el consumer `notification-dispatch` como gap abierto; queda como baseline implementada y operativa.
- Los consumers UX-facing del bus ya deben nacer sobre recipient resolution `person-first`, no `client_user-first`.
- La deuda transversal del modelo de identidad en Notifications quedó formalizada en `TASK-134`.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Infrastructure / Integrations / UX |
| Sequence | Post TASK-125 (Webhook Activation) |

## Summary

La infraestructura de webhooks está construida (TASK-006) y validada con un canary E2E (TASK-125). Esta task registra los primeros consumers reales que resuelven dolores operativos existentes: Slack para alertas de negocio, invalidación de cache para latencia, Nubox push para reemplazar polling, y notificaciones in-app alimentadas por el bus de eventos.

## Why This Task Exists

Hoy Greenhouse sabe cuando pasan cosas (outbox events) pero no avisa a nadie. Los usuarios deben entrar al portal y revisar manualmente. Los sistemas downstream (Nubox, Slack) dependen de crons de polling que corren cada 24h. Las notificaciones in-app existen (TASK-023) pero se crean manualmente por cada caso de uso.

Con la infraestructura de webhooks lista, conectar consumers es un `INSERT INTO webhook_subscriptions` — el signing, retries, dead-letter y auditoría ya están resueltos.

## Dependencies & Impact

- **Depende de:**
  - TASK-006 (Webhook Infrastructure MVP) — `complete`
  - TASK-125 (Webhook Activation: Canary) — `in-progress`, pipeline validado
  - TASK-023 (Notification System) — `complete`, despacha in-app + email
  - TASK-095 (Email Delivery Layer) — `complete`
  - TASK-098 (Observability) — `complete`, Slack webhook ya configurado
- **Impacta a:**
  - Todos los módulos de dominio (Payroll, Finance, People, Delivery)
  - Admin Center (más actividad visible en Webhooks y jobs)
  - UX general (usuarios dejan de depender de polling manual)
- **Archivos owned:**
  - `src/lib/webhooks/consumers/` (nuevo directorio para consumer handlers)
  - Seeds de subscriptions en `scripts/` o admin routes
  - Integración con `src/lib/notifications/notification-service.ts`

## Scope

### Slice 1 — Slack como consumer outbound (~1h)

El paso más inmediato. Registrar una subscription que entregue eventos de negocio a un canal de Slack.

1. Registrar subscription con `target_url = SLACK_ALERTS_WEBHOOK_URL` (ya existe)
2. Event filters iniciales:
   - `payroll_period.closed` → "Nómina {mes} cerrada, {n} colaboradores"
   - `payroll_period.exported` → "Recibos de {mes} enviados"
   - `finance.dte.discrepancy_found` → "Discrepancia DTE en {org}"
3. El dispatcher ya firma y entrega — Slack ignora la firma pero recibe el payload
4. Desafío: Slack espera `{ "text": "..." }`, no el envelope canónico de Greenhouse. Opciones:
   - **A)** Crear un transformer endpoint interno que recibe el envelope y re-envía a Slack con formato legible
   - **B)** Registrar la subscription con `auth_mode: 'none'` y un endpoint proxy que formatea
   - **C)** Agregar soporte de templates al dispatcher (scope creep para v1)
5. Recomendación: opción A — un endpoint `/api/internal/webhooks/slack-relay` que recibe el envelope, extrae el event type, construye el texto legible y llama a Slack

### Slice 2 — Invalidación de cache interna (~1.5h)

Subscription self-loop que invalida caches cuando cambian datos upstream. Reduce latencia de horas a minutos.

1. Crear endpoint `/api/internal/webhooks/cache-invalidation`
2. Registrar subscription con filtros:
   - `compensation_version.created` → invalidar payroll proyectado
   - `assignment.created` / `assignment.updated` → invalidar capacity economics + organization_360
   - `member.updated` → invalidar person intelligence
3. El handler llama a las funciones de invalidación existentes en cada módulo
4. Diferencia con projections: las projections re-computan snapshots completos; la invalidación solo marca un cache como stale para que la próxima lectura lo refresque

### Slice 3 — Nubox push (reemplazar polling) (~2h)

Invertir el flujo Nubox de pull diario a push en tiempo real.

1. Crear endpoint `/api/internal/webhooks/nubox-push`
2. Registrar subscription con filtros:
   - `finance.income.created` → push ingreso a Nubox
   - `finance.expense.created` → push gasto a Nubox
3. El handler usa la API de Nubox (`api.pyme.nubox.com`) para crear el registro
4. Fallback: si Nubox falla, el dead-letter del webhook pipeline lo retiene para retry
5. El cron `nubox-sync` diario se mantiene como safety net (reconciliación)

### Slice 4 — Notificaciones in-app via webhook bus (~2h)

El slice con mayor impacto en UX. Conectar el bus de webhooks con el sistema de notificaciones existente (TASK-023) para que los eventos de negocio generen notificaciones automáticamente.

1. Crear consumer `/api/internal/webhooks/notification-dispatch`
2. Registrar subscription con filtros por evento de negocio:
   - `payroll_period.closed` → notificar a admins de RRHH
   - `payroll_period.exported` → notificar al colaborador que sus recibos están listos
   - `finance.dte.discrepancy_found` → notificar al responsable de finanzas
   - `identity.reconciliation.approved` → notificar al usuario cuya identidad se vinculó
   - `assignment.created` → notificar al colaborador asignado a un nuevo proyecto
   - `compensation_version.created` → notificar al colaborador de cambio de compensación
3. El handler:
   - Recibe el envelope del webhook
   - Resuelve los recipients según el event type y el payload (e.g., `memberId` → `userId`)
   - Llama a `dispatchNotification()` de `notification-service.ts`
   - La preferencia in-app/email del usuario se respeta automáticamente (ya implementado en TASK-023)
4. Resultado: la campanita del navbar muestra actividad real sin código custom por módulo
5. Cada nuevo event type que se agregue al catálogo puede generar notificaciones con solo agregar un mapping en el consumer

### Mapeo evento → notificación

| Evento | Título | Recipients | action_url |
|--------|--------|------------|------------|
| `payroll_period.closed` | "Nómina {mes} cerrada" | Admins RRHH | `/payroll` |
| `payroll_period.exported` | "Tus recibos de {mes} están listos" | Colaboradores del período | `/my/payroll` |
| `finance.dte.discrepancy_found` | "Discrepancia DTE detectada en {org}" | Admins Finance | `/finance/reconciliation` |
| `assignment.created` | "Fuiste asignado a {proyecto}" | Colaborador asignado | `/my/assignments` |
| `compensation_version.created` | "Tu compensación fue actualizada" | Colaborador | `/my/profile` |
| `identity.reconciliation.approved` | "Tu identidad fue vinculada" | Usuario | `/my/profile` |

### Slice 5 — Data Node / consumers externos (~futuro)

Un partner o servicio externo se suscribe a eventos vía la API de subscriptions. Requiere:
- Admin UI para gestión de subscriptions (crear/pausar/eliminar)
- Documentación pública del event catalog
- Rate limiting por subscriber

Este slice es futuro y depende de que los slices internos validen el pipeline bajo carga real.

## Visión arquitectónica

```
                              outbox_events
                                    │
                    ┌───────────────┼───────────────┬──────────────────┐
                    │               │               │                  │
              BigQuery pub    Reactive proj    Webhook dispatch    (future)
              (analytics)    (serving interno)       │
                                              ┌─────┼─────┬──────────┐
                                              │     │     │          │
                                          Slack   Cache  Nubox   In-app
                                          relay   inval  push    notifications
                                              │     │     │          │
                                           #channel stale  API    campanita
                                                   flag  call    + email
```

## Out of Scope

- Admin UI para CRUD de subscriptions (futuro, Slice 5)
- Event catalog público para consumers externos (futuro)
- Rate limiting por subscriber (futuro)
- Transformación de payload por subscription (usar endpoint relay en su lugar)
- Reemplazar el cron de Nubox por completo (mantener como safety net)

## Acceptance Criteria

- [ ] Slice 1: Al menos 1 evento de negocio llega a Slack vía subscription (no vía `sendSlackAlert()` directo)
- [ ] Slice 2: Cambio de compensación invalida cache de payroll proyectado en <5 min
- [ ] Slice 3: Ingreso creado en Greenhouse aparece en Nubox sin esperar sync diario
- [ ] Slice 4: Evento de negocio genera notificación in-app visible en campanita del navbar
- [ ] Slice 4: Preferencias de usuario (in-app/email/mute) se respetan automáticamente
- [ ] Admin Center muestra deliveries con actividad real de cada consumer
- [ ] Dead-letter funciona para cada consumer (delivery fallida no se pierde)
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Verificar subscriptions activas
psql -c "SELECT subscriber_code, event_filters_json, active FROM greenhouse_sync.webhook_subscriptions;"

# Verificar deliveries exitosas por consumer
psql -c "SELECT ws.subscriber_code, wd.status, COUNT(*)
         FROM greenhouse_sync.webhook_deliveries wd
         JOIN greenhouse_sync.webhook_subscriptions ws ON wd.webhook_subscription_id = ws.webhook_subscription_id
         GROUP BY ws.subscriber_code, wd.status;"

# Verificar notificaciones generadas vía webhook
psql -c "SELECT category, title, created_at FROM greenhouse_notifications.notifications ORDER BY created_at DESC LIMIT 10;"

# Admin Center
curl -s https://dev-greenhouse.efeoncepro.com/api/admin/ops/overview | jq .webhooks
```
