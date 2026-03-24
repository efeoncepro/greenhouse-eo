# Greenhouse Event Catalog V1

Catalogo canonico de eventos del sistema de outbox de Greenhouse. Cada evento se registra en `greenhouse_sync.outbox_events` y se publica a BigQuery via el consumer `outbox-publish`.

## Infraestructura

| Componente | Ubicacion | Funcion |
|---|---|---|
| Tabla outbox | `greenhouse_sync.outbox_events` | Cola de eventos pendientes (Postgres) |
| Helper publicacion | `src/lib/sync/publish-event.ts` | `publishOutboxEvent()` — helper reutilizable |
| Catalogo tipos | `src/lib/sync/event-catalog.ts` | Constantes de aggregate types y event types |
| Consumer BigQuery | `src/lib/sync/outbox-consumer.ts` | Publica eventos a `greenhouse_raw.postgres_outbox_events` |
| Consumer reactivo | `src/lib/sync/reactive-consumer.ts` | Procesa eventos para invalidar caches y recalcular vistas |
| Cron publish | `/api/cron/outbox-publish` | Cada 5 min — publica a BigQuery |
| Cron react | `/api/cron/outbox-react` | Cada 5 min — procesa eventos reactivos |
| Log reactivo | `greenhouse_sync.outbox_reactive_log` | Tracking de eventos ya procesados por el consumer reactivo |

## Ciclo de vida de un evento

```
Mutacion en store
  -> publishOutboxEvent() inserta en outbox_events (status: 'pending')
  -> outbox-publish cron lee pending, escribe a BigQuery, marca 'published'
  -> outbox-react cron lee published + tipo reactivo, ejecuta handler, registra en reactive_log
```

## Catalogo de eventos

### Finance

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `income` | `income.created`, `income.updated`, `income.deleted` | `finance/postgres-store.ts` | `{ incomeId, clientProfileId, amount, currency }` | — |
| `expense` | `expense.created`, `expense.updated`, `expense.deleted` | `finance/postgres-store.ts` | `{ expenseId, amount, currency }` | — |
| `account` | `account.created`, `account.updated` | `finance/postgres-store-slice2.ts` | `{ accountId }` | — |
| `supplier` | `supplier.created`, `supplier.updated` | `finance/postgres-store-slice2.ts` | `{ supplierId }` | — |
| `exchange_rate` | `exchange_rate.updated` | `finance/postgres-store-slice2.ts` | `{ currency, rate }` | — |

### Nubox

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `nubox_emission` | `nubox.emission.*` | `nubox/emission.ts` | `{ emissionId, dteType }` | — |
| `nubox_sync` | `nubox.sync.*` | `nubox/sync-nubox-to-postgres.ts` | `{ syncRunId }` | — |

### HR Leave

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `leave_request` | `leave.request.*` | `hr-core/postgres-leave-store.ts` | `{ requestId, memberId }` | — |
| `leave_balance` | `leave.balance.*` | `hr-core/postgres-leave-store.ts` | `{ memberId }` | — |

### Payroll

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `payroll_period` | `payroll.period.*` | `payroll/postgres-store.ts` | `{ periodId, month, year }` | — |
| `payroll_entry` | `payroll.entry.*` | `payroll/postgres-store.ts` | `{ entryId, memberId }` | — |

### AI Tools

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `ai_credits` | `ai.credits.*` | `ai-tools/postgres-store.ts` | `{ tenantId, amount }` | — |
| `ai_wallet` | `ai.wallet.*` | `ai-tools/postgres-store.ts` | `{ walletId }` | — |

### Account 360 (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `organization` | `organization.updated` | `account-360/organization-store.ts` | `{ organizationId, updatedFields }` | — |
| `membership` | `membership.created` | `account-360/organization-store.ts` | `{ membershipId, profileId, organizationId, spaceId }` | `invalidateOrganization360` |
| `membership` | `membership.updated` | `account-360/organization-store.ts` | `{ membershipId, updatedFields }` | `invalidateOrganization360` |
| `membership` | `membership.deactivated` | `account-360/organization-store.ts` | `{ membershipId }` | `invalidateOrganization360` |

### HR Core / People (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `member` | `member.created` | `team-admin/mutate-team.ts` | `{ memberId, email, displayName }` | — |
| `member` | `member.updated` | `team-admin/mutate-team.ts` | `{ memberId, updatedFields }` | — |
| `member` | `member.deactivated` | `team-admin/mutate-team.ts` | `{ memberId }` | — |
| `assignment` | `assignment.created` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId, fteAllocation }` | `invalidateOrganization360` |
| `assignment` | `assignment.updated` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId, updatedFields }` | `invalidateOrganization360` |
| `assignment` | `assignment.removed` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId }` | `invalidateOrganization360` |

### Identity (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `identity_reconciliation` | `identity.reconciliation.approved` | `identity/reconciliation/apply-link.ts` | `{ proposalId, status, resolvedBy }` | — |
| `identity_reconciliation` | `identity.reconciliation.rejected` | `identity/reconciliation/apply-link.ts` | `{ proposalId, status, resolvedBy }` | — |
| `identity_profile` | `identity.profile.linked` | `identity/reconciliation/apply-link.ts` | `{ proposalId, profileId, memberId, sourceSystem, sourceObjectId }` | — |

### Services (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `service` | `service.created` | `services/service-store.ts` | `{ serviceId, spaceId, organizationId, lineaDeServicio }` | — |
| `service` | `service.updated` | `services/service-store.ts` | `{ serviceId, updatedFields }` | — |
| `service` | `service.deactivated` | `services/service-store.ts` | `{ serviceId }` | — |

## Consumer reactivo — handlers

| Event Type | Handler | Accion |
|---|---|---|
| `assignment.created` | `invalidateOrganization360` | Toca `updated_at` de la organizacion afectada para invalidar cache de serving view |
| `assignment.updated` | `invalidateOrganization360` | Idem |
| `assignment.removed` | `invalidateOrganization360` | Idem |
| `membership.created` | `invalidateOrganization360` | Idem |
| `membership.updated` | `invalidateOrganization360` | Idem |
| `membership.deactivated` | `invalidateOrganization360` | Idem |

## Extensibilidad

Para agregar un nuevo evento:

1. Agregar aggregate type y event type en `src/lib/sync/event-catalog.ts`
2. Llamar `publishOutboxEvent()` en la mutacion del store
3. Si necesita procesamiento reactivo: agregar event type a `REACTIVE_EVENT_TYPES` y registrar handler en `reactive-consumer.ts`
4. Documentar en esta tabla

Para agregar un nuevo consumer reactivo:

1. Agregar handler en `reactive-consumer.ts` → objeto `handlers`
2. Agregar event type a `REACTIVE_EVENT_TYPES` en `event-catalog.ts`
3. Documentar accion en la tabla de handlers
