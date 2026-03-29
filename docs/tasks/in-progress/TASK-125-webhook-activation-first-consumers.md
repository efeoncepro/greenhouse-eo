# TASK-125 — Webhook Activation: First Consumers & End-to-End Validation

## Delta 2026-03-29 — Canary aligned to Secret Manager contract

- La capa de webhooks ya no depende solo de `WEBHOOK_CANARY_SECRET` en env plano.
- `src/lib/webhooks/signing.ts` ahora resuelve secretos vía helper canónico:
  - `WEBHOOK_CANARY_SECRET`
  - `WEBHOOK_CANARY_SECRET_SECRET_REF`
- Esto alinea `TASK-125` con el patrón institucional de `TASK-124` y permite activar el canary desde Vercel usando solo la ref al secreto en Secret Manager.

## Delta 2026-03-29 — Canary subscription implementada

- Creado endpoint canary interno: `POST /api/internal/webhooks/canary`
  - Recibe deliveries del dispatcher, valida firma HMAC-SHA256, logea y retorna 200
  - Secret ref: `WEBHOOK_CANARY_SECRET` (env var)
- Creada ruta admin: `POST /api/admin/ops/webhooks/seed-canary`
  - Registra subscription `wh-sub-canary` apuntando al canary del mismo deployment
  - Event filters: `assignment.*` + `member.*` (alto volumen, bajo riesgo)
  - Idempotente: re-ejecutar reactiva la subscription si estaba pausada
  - Auto-detecta base URL del deployment vía `VERCEL_URL`
- Botón "Activar canary subscription" agregado en Admin Center > Webhooks y jobs
- Pendiente para validación E2E:
  - Configurar `WEBHOOK_CANARY_SECRET` en Vercel env vars
  - Hacer click en "Activar canary subscription" desde Admin Center
  - Esperar que el cron `webhook-dispatch` (cada 2 min) entregue el primer evento
  - Verificar que Admin Center muestra subscriptions > 0 y deliveries con actividad

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P2` |
| Impact | `Medio` |
| Effort | `Bajo` |
| Status real | `Implementación` |
| Rank | — |
| Domain | Infrastructure / Integrations |
| Sequence | Post TASK-006 (Webhook Infrastructure MVP) |

## Summary

La infraestructura de webhooks está construida (TASK-006) pero no tiene consumidores. Las tablas `webhook_endpoints`, `webhook_subscriptions`, `webhook_inbox_events` y `webhook_deliveries` existen en `greenhouse_sync` pero están vacías. El Admin Center muestra 0 endpoints, 0 subscriptions, 0 inbox events — todo correcto porque nadie ha registrado un consumer real. Esta task activa el primer flujo end-to-end.

## Why This Task Exists

La inversión de TASK-006 construyó:
- Tablas canónicas en `greenhouse_sync`
- Library compartida en `src/lib/webhooks/*` (signing, envelope, inbound, outbound, retry, store)
- Inbound gateway: `POST /api/webhooks/[endpointKey]`
- Outbound dispatcher: `GET /api/cron/webhook-dispatch`
- Cron de dispatch cada 2 min

Pero hoy:
- **0 endpoints activos** — nadie registró un endpoint receptor
- **0 subscriptions activas** — nadie suscribió un event type a un endpoint
- **0 inbox events** — sin endpoints, no llega nada
- **0 deliveries** — sin subscriptions, no se despacha nada
- Admin Center marca **warning** en "Inbound + outbound"
- El cron `webhook-dispatch` corre cada 2 min sin hacer nada útil

La infraestructura está idle. Sin al menos un consumer real, no se puede validar que el pipeline funciona end-to-end.

## Goal

Registrar el primer endpoint + subscription real, validar el flujo completo (outbox → subscription match → delivery → attempt → success/retry), y que el Admin Center muestre estado `ok` con actividad real.

## Dependencies & Impact

- **Depende de:**
  - TASK-006 (Webhook Infrastructure MVP) — ya `complete`
  - Outbox events siendo emitidos (ya activo — `outbox-publish` corre cada 5 min)
  - Al menos un event type en el catálogo de outbox (`GREENHOUSE_EVENT_CATALOG_V1.md`)
- **Impacta a:**
  - TASK-098 (Observability) — Slack alerts para webhook failures se vuelven relevantes
  - TASK-012 (Outbox Event Expansion) — validar que el pipeline soporta event families adicionales
  - Admin Center Cloud Integrations — pasa de warning a ok
- **Archivos owned:**
  - Script o seed para registrar primer endpoint + subscription
  - Documentación del primer consumer registrado

## Current Repo State

- `greenhouse_sync.webhook_endpoints` — tabla existe, 0 rows
- `greenhouse_sync.webhook_subscriptions` — tabla existe, 0 rows
- `greenhouse_sync.webhook_inbox_events` — tabla existe, 0 rows
- `greenhouse_sync.webhook_deliveries` — tabla existe, 0 rows
- `src/lib/webhooks/store.ts` — funciones de read/write para todas las tablas
- `src/lib/webhooks/outbound.ts` — dispatcher que matchea events con subscriptions
- `src/lib/webhooks/signing.ts` — firma HMAC para deliveries
- `src/app/api/cron/webhook-dispatch/route.ts` — cron activo cada 2 min
- Admin Center: `src/lib/operations/get-operations-overview.ts` lee los conteos
- `schemaReady` requiere que las 4 tablas existan (línea 575)

## Scope

### Slice 1 — Elegir primer event family (~30 min)

1. Revisar `GREENHOUSE_EVENT_CATALOG_V1.md` y `outbox_events` para identificar qué event types ya se emiten en producción
2. Elegir el event type con mayor volumen y menor riesgo como primer candidato
3. Documentar la elección y el consumer destino (puede ser un webhook.site de test o un endpoint interno)

### Slice 2 — Registrar primer endpoint + subscription (~1h)

1. Crear script de seed en `scripts/seed-first-webhook-consumer.ts`:
   - INSERT en `webhook_endpoints` con un endpoint receptor (interno o externo de test)
   - INSERT en `webhook_subscriptions` vinculando el endpoint al event type elegido
   - Generar shared secret para firma
2. Ejecutar el seed contra `greenhouse-pg-dev`
3. Verificar en Admin Center que los contadores ya no son 0

### Slice 3 — Validar flujo end-to-end (~1h)

1. Provocar un evento del type elegido (o esperar al siguiente ciclo natural)
2. Verificar que `outbox-publish` lo procesa
3. Verificar que `webhook-dispatch` lo matchea con la subscription
4. Verificar que se crea un `webhook_delivery` con status progresando
5. Verificar que el endpoint receptor recibe el payload firmado
6. Confirmar en Admin Center:
   - Endpoints activos > 0
   - Subscriptions activas > 0
   - Deliveries visibles
   - Chip cambia de `warning` a `ok`

### Slice 4 — Documentar y limpiar (~30 min)

1. Documentar el primer consumer en la wiki operativa
2. Si el endpoint era de test, decidir si se deja como canary permanente o se reemplaza por un consumer real
3. Actualizar `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` con el estado post-activación

## Visión: señales en UI más allá del Admin Center

La infraestructura de webhooks no es solo backend. Conforme se activen consumidores, habilita señales de UI en dos niveles:

### Nivel operativo (Admin Center) — evolución natural post-activación

- **Timeline de deliveries** — intentos, retries, dead-letters con detalle por evento. La data ya existe en `webhook_delivery_attempts` pero no tiene surface dedicada.
- **Gestión de subscriptions** — activar/pausar/crear endpoints desde la UI en vez de SQL directo.
- **Replay manual** — re-despachar un dead-letter con un click desde Ops Health.

### Nivel de negocio (módulos de dominio) — habilitado por el bus de eventos

- **Payroll** — toast o badge cuando nómina se cierra y el webhook de notificación se entregó exitosamente a downstream.
- **People** — indicador de que un cambio de compensación ya se propagó a sistemas suscritos.
- **Finance** — señal de que Nubox recibió el push de un DTE reconciliado.
- **Home** — feed de actividad reciente alimentado por outbox events en vez de queries ad-hoc.

### Lógica de evolución

El backend ya tiene el bus (`outbox_events` → `webhook_deliveries`). La UI hoy solo observa la salud del bus (Admin Center). El paso natural post-TASK-125 es que los módulos de dominio **consuman esas señales** para darle feedback al usuario de que sus acciones tuvieron efecto más allá del portal.

> Ninguna de estas surfaces es scope de TASK-125. Esta task solo activa el primer consumer E2E. Las surfaces se derivan como tasks independientes una vez validado el flujo.

## Out of Scope

- UI de gestión de subscriptions (mejora futura — ver visión arriba)
- Surfaces de negocio por módulo (mejora futura — ver visión arriba)
- Registrar múltiples consumers (esta task es solo el primero)
- Nuevos event types en el catálogo (eso es TASK-012)
- Retry policy tuning (usar defaults de TASK-006)

## Acceptance Criteria

- [x] Canary endpoint creado: `POST /api/internal/webhooks/canary`
- [x] Admin seed route creado: `POST /api/admin/ops/webhooks/seed-canary`
- [x] Botón en Admin Center para activar canary subscription
- [x] Subscription apunta al mismo deployment (self-loop E2E)
- [x] Firma HMAC-SHA256 validada en canary (secret ref: `WEBHOOK_CANARY_SECRET`)
- [ ] `WEBHOOK_CANARY_SECRET` o `WEBHOOK_CANARY_SECRET_SECRET_REF` configurado en Vercel
- [ ] Canary activado desde Admin Center (click en "Activar canary subscription")
- [ ] Al menos 1 subscription activa registrada en `webhook_subscriptions`
- [ ] Al menos 1 delivery exitosa registrada en `webhook_deliveries`
- [ ] Admin Center muestra contadores > 0 en "Inbound + outbound"
- [ ] Flujo E2E validado: outbox event → subscription match → delivery → canary receipt
- [x] `pnpm build` pasa
- [x] `pnpm test` pasa (539 tests)

## Verification

```bash
# Verificar endpoint registrado
psql -c "SELECT endpoint_key, active FROM greenhouse_sync.webhook_endpoints;"

# Verificar subscription activa
psql -c "SELECT event_type, active FROM greenhouse_sync.webhook_subscriptions WHERE paused_at IS NULL;"

# Verificar deliveries
psql -c "SELECT status, COUNT(*) FROM greenhouse_sync.webhook_deliveries GROUP BY status;"

# Admin Center
curl -s https://dev-greenhouse.efeoncepro.com/api/admin/ops/overview | jq .webhooks
```
