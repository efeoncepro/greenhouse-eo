# Greenhouse Event Catalog V1

Catalogo canonico de eventos del sistema de outbox de Greenhouse. Cada evento se registra en `greenhouse_sync.outbox_events` y se publica a BigQuery via el consumer `outbox-publish`.

## Infraestructura

| Componente | Ubicacion | Funcion |
|---|---|---|
| Tabla outbox | `greenhouse_sync.outbox_events` | Cola de eventos pendientes (Postgres) |
| Helper publicacion | `src/lib/sync/publish-event.ts` | `publishOutboxEvent()` — helper reutilizable |
| Catalogo tipos | `src/lib/sync/event-catalog.ts` | Constantes de aggregate types y event types |
| Consumer BigQuery | `src/lib/sync/outbox-consumer.ts` | Publica eventos a `greenhouse_raw.postgres_outbox_events` |
| Consumer reactivo | `src/lib/sync/reactive-consumer.ts` | Procesa eventos via projection registry |
| Projection registry | `src/lib/sync/projection-registry.ts` | Mapa declarativo evento → proyecciones afectadas |
| Projections | `src/lib/sync/projections/*.ts` | Definiciones individuales por proyeccion |
| Refresh queue | `src/lib/sync/refresh-queue.ts` | Cola persistente con dedup, prioridad y retry |
| Cron publish | `/api/cron/outbox-publish` | Cada 5 min — publica a BigQuery |
| Cron react (all) | `/api/cron/outbox-react` | Procesa todos los dominios (secuencial) |
| Cron react (org) | `/api/cron/outbox-react-org` | Solo dominio `organization` |
| Cron react (people) | `/api/cron/outbox-react-people` | Solo dominio `people` |
| Cron react (finance) | `/api/cron/outbox-react-finance` | Solo dominio `finance` |
| Cron react (notify) | `/api/cron/outbox-react-notify` | Solo dominio `notifications` |
| Log reactivo | `greenhouse_sync.outbox_reactive_log` | Tracking con retries y dead-letter |
| Observabilidad | `/api/internal/projections` | Stats por proyeccion + queue health |

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

## Consumer reactivo — Projection Registry

El consumer ya no usa handlers hardcodeados. Usa el Projection Registry declarativo:

| Projection | Domain | Trigger Events | Accion |
|---|---|---|---|
| `organization_360` | organization | assignment.*, membership.* | Invalida `updated_at` de la organizacion afectada |
| `notification_dispatch` | notifications | service.created, identity.reconciliation.approved, finance.dte.discrepancy_found, identity.profile.linked | Despacha notificacion in-app + email via NotificationService |
| `ico_member_metrics` | people | member.*, assignment.* | Refresh dirigido: pull member data BQ → Postgres |
| `client_economics` | finance | membership.*, assignment.* | Recompute snapshots del periodo actual |

## Extensibilidad

### Para agregar un nuevo evento:

1. Agregar aggregate type y event type en `src/lib/sync/event-catalog.ts`
2. Llamar `publishOutboxEvent()` en la mutacion del store
3. Documentar en esta tabla

### Para agregar una nueva proyeccion reactiva:

1. Crear archivo en `src/lib/sync/projections/my-projection.ts` con `ProjectionDefinition`
2. Registrar en `src/lib/sync/projections/index.ts`
3. Declarar `domain`, `triggerEvents`, `extractScope`, `refresh`
4. NO tocar `reactive-consumer.ts` ni crear crons nuevos
5. Documentar en esta tabla

Ver playbook completo: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

### Para agregar un nuevo dominio de cron:

1. Agregar el dominio a `ProjectionDomain` type en `projection-registry.ts`
2. Crear cron route en `src/app/api/cron/outbox-react-{domain}/route.ts`
3. Registrar en Vercel cron config si aplica
