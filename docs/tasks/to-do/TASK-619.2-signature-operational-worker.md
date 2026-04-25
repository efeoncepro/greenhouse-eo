# TASK-619.2 — Signature Operational Worker (reconciliation + expiry alerting + DLQ)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo` (~2 dias)
- Type: `implementation`
- Epic: `EPIC-001`
- Status real: `Diseno cerrado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-490, TASK-491`
- Branch: `task/TASK-619.2-signature-operational-worker`
- Legacy ID: `RESEARCH-005 P2.1 follow-up`
- GitHub Issue: `none`

## Summary

Worker operacional sobre Cloud Run `ops-worker` que ejecuta 3 jobs scheduled para garantizar consistencia eventual del sistema de firmas: reconciliation cada 6h (drift detection vs provider), expiry alerting 24h antes de vencimiento, y DLQ replay para webhooks que fallaron 3 veces.

Sin esto, drift entre estado provider (ZapSign) y estado Greenhouse queda silencioso hasta que un humano lo detecte por casualidad.

## Why This Task Exists

El webhook de ZapSign puede:

1. **No llegar nunca** (network glitch, ZapSign caido, our infra caida) — silencio inadvertido
2. **Llegar fuera de orden** (signed antes de viewed) — state machine confusa
3. **Llegar duplicado** — manejado por dedup en TASK-491, pero queda log-only
4. **Llegar con payload corrupto** — DLQ + replay manual

Adicionalmente, un envelope ZapSign con `dateLimitToSign=2026-05-25` debe alertar al sales rep el 2026-05-24 si nadie firmo aun. Sin alerting, el deal se pierde silenciosamente.

## Goal

- Job reconciliation cada 6h: para cada `signature_request` en `pending_*`, llamar `getSignatureDocument` del provider y comparar estado; si hay drift, aplicar transition correcta
- Job expiry alerting cada 1h: detectar `signature_requests` con `date_limit_to_sign` entre `now+24h` y `now+25h`, emitir evento `commercial.quote.signature_expiring_soon` (consumido por TASK-619.3 notifications)
- Job DLQ replay cada 30min: revisar `webhook_event_log` con `status='failed'` y `retry_count<3`, re-procesar con backoff exponencial
- Metricas a Cloud Monitoring: drift_count, expiring_soon_count, dlq_size, replay_success_rate
- Alerting en Cloud Monitoring: drift > 5/h o dlq_size > 50 dispara PagerDuty/Slack

## Architecture Alignment

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PIPELINE_SCALABILITY_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 (Cloud Run ops-worker)

Reglas obligatorias:

- worker idempotente: re-ejecucion no causa side-effects duplicados
- usa Cloud SQL Connector (no IP directa)
- emite metricas a Cloud Monitoring custom metrics
- DLQ replay con backoff exponencial: 30min → 1h → 2h, max 3 retries

## Dependencies & Impact

### Depends on

- `TASK-490` (signature_requests + provider interface)
- `TASK-491` (ZapSign adapter con `getSignatureDocument`)
- Cloud Run `ops-worker` ya existe
- Cloud Scheduler ya tiene patron de jobs reactive-process

### Blocks / Impacts

- `TASK-619` (calidad operacional de la firma de quotes)
- `TASK-027` (HRIS contracts firma — mismo worker, distintos consumers)

### Files owned

- `services/ops-worker/src/jobs/signature-reconciliation.ts` (nuevo)
- `services/ops-worker/src/jobs/signature-expiry-alerting.ts` (nuevo)
- `services/ops-worker/src/jobs/webhook-dlq-replay.ts` (nuevo)
- `services/ops-worker/src/routes/signature-jobs.ts` (nuevo, exposes endpoints)
- `services/ops-worker/Dockerfile` (sin cambios — ya soporta los nuevos jobs)
- `infra/cloud-scheduler/signature-jobs.yaml` (nuevo, define los 3 jobs)

## Scope

### Slice 1 — Reconciliation job (1 dia)

`services/ops-worker/src/jobs/signature-reconciliation.ts`:

```typescript
export const reconcileSignatures = async () => {
  const pendingRequests = await db
    .selectFrom('greenhouse_signatures.signature_requests')
    .where('status', 'in', ['pending_client', 'pending_countersign'])
    .where('updated_at', '<', sql`now() - interval '5 minutes'`)
    .selectAll()
    .execute()

  for (const req of pendingRequests) {
    const provider = getProvider(req.provider)
    const remoteDoc = await provider.getDocument(req.provider_document_token)
    const computedStatus = deriveStatusFromProvider(remoteDoc)
    if (computedStatus !== req.status) {
      // Drift detected — emit reconciliation event
      await publishOutboxEvent({
        type: 'platform.signature.drift_reconciled',
        payload: {
          signatureRequestId: req.signature_request_id,
          previousStatus: req.status,
          remoteStatus: computedStatus,
          source: 'reconciliation_worker'
        }
      })
      // Apply transition
      await applyStateTransition(req.signature_request_id, mapToEvent(computedStatus))
      // Metric
      emitMetric('signature.reconciliation.drift_count', 1)
    }
  }
}
```

Endpoint POST `/signature/reconcile`. Cloud Scheduler dispara cada 6h.

### Slice 2 — Expiry alerting job (0.5 dia)

`services/ops-worker/src/jobs/signature-expiry-alerting.ts`:

```typescript
export const alertExpiringSoon = async () => {
  const expiringSoon = await db
    .selectFrom('greenhouse_signatures.signature_requests')
    .where('status', 'in', ['pending_client', 'pending_countersign'])
    .where('date_limit_to_sign', '>=', sql`now() + interval '23 hours'`)
    .where('date_limit_to_sign', '<', sql`now() + interval '25 hours'`)
    .where('expiry_alert_emitted', '=', false)
    .selectAll()
    .execute()

  for (const req of expiringSoon) {
    await publishOutboxEvent({
      type: 'commercial.quote.signature_expiring_soon',
      payload: {
        signatureRequestId: req.signature_request_id,
        aggregateType: req.aggregate_type,
        aggregateId: req.aggregate_id,
        dateLimitToSign: req.date_limit_to_sign,
        currentStatus: req.status
      }
    })
    await db.updateTable('greenhouse_signatures.signature_requests')
      .set({ expiry_alert_emitted: true })
      .where('signature_request_id', '=', req.signature_request_id)
      .execute()
  }
}
```

Endpoint POST `/signature/alert-expiring`. Cloud Scheduler dispara cada 1h.

Migration adicional: `ALTER TABLE signature_requests ADD COLUMN expiry_alert_emitted boolean NOT NULL DEFAULT false`.

### Slice 3 — DLQ replay job (0.5 dia)

`services/ops-worker/src/jobs/webhook-dlq-replay.ts`:

```typescript
export const replayFailedWebhooks = async () => {
  const failed = await db
    .selectFrom('greenhouse_signatures.webhook_event_log')
    .where('status', '=', 'failed')
    .where('retry_count', '<', 3)
    .where('next_retry_at', '<=', sql`now()`)
    .selectAll()
    .execute()

  for (const event of failed) {
    try {
      await processWebhookEvent(event.event_id, event.payload)
      await db.updateTable('greenhouse_signatures.webhook_event_log')
        .set({ status: 'replayed', replayed_at: new Date() })
        .where('event_id', '=', event.event_id)
        .execute()
      emitMetric('signature.dlq.replay_success', 1)
    } catch (error) {
      const nextRetryDelayMins = [30, 60, 120][event.retry_count]
      await db.updateTable('greenhouse_signatures.webhook_event_log')
        .set({
          retry_count: event.retry_count + 1,
          next_retry_at: sql`now() + interval '${nextRetryDelayMins} minutes'`,
          last_error: error.message
        })
        .where('event_id', '=', event.event_id)
        .execute()
      emitMetric('signature.dlq.replay_failure', 1)
    }
  }
}
```

Endpoint POST `/signature/replay-dlq`. Cloud Scheduler dispara cada 30min.

### Slice 4 — Cloud Scheduler config (0.25 dia)

```yaml
# infra/cloud-scheduler/signature-jobs.yaml
- name: signature-reconciliation
  schedule: "0 */6 * * *"        # cada 6h
  timezone: America/Santiago
  http_target:
    uri: https://ops-worker-${ENV}.run.app/signature/reconcile
    http_method: POST
    oidc_token: { service_account: ops-worker-invoker }

- name: signature-expiry-alerting
  schedule: "0 * * * *"          # cada 1h en punto
  timezone: America/Santiago
  http_target:
    uri: https://ops-worker-${ENV}.run.app/signature/alert-expiring

- name: webhook-dlq-replay
  schedule: "*/30 * * * *"       # cada 30min
  timezone: America/Santiago
  http_target:
    uri: https://ops-worker-${ENV}.run.app/signature/replay-dlq
```

### Slice 5 — Metricas + alerting (0.25 dia)

Custom metrics emitidas a Cloud Monitoring:

- `signature.reconciliation.drift_count`
- `signature.expiry.alerting_count`
- `signature.dlq.replay_success`
- `signature.dlq.replay_failure`
- `signature.dlq.size_total` (snapshot al final de cada run)

Alert policies:

- `drift_count > 5/h` → Slack #greenhouse-alerts
- `dlq.size_total > 50` → PagerDuty (P2)
- `replay_failure / (replay_success + replay_failure) > 0.5` → Slack #greenhouse-alerts

## Out of Scope

- Auto-cancelacion de envelopes expirados (politica humana, no automatica)
- Re-creation automatica de envelopes (sales rep decide manualmente)
- Notificaciones (las maneja TASK-619.3)

## Acceptance Criteria

- [ ] 3 jobs corriendo en los 3 envs (dev/staging/prod)
- [ ] reconciliation detecta drift simulado en dev (forzar status diff manualmente)
- [ ] expiry alerting emite evento outbox 24h antes de vencimiento
- [ ] DLQ replay funciona con backoff exponencial documentado
- [ ] metricas custom visibles en Cloud Monitoring dashboard
- [ ] alert policies disparan en condiciones simuladas
- [ ] runbook actualizado para troubleshooting de DLQ

## Verification

- Job reconciliation: forzar `signature_requests.status='pending_client'` cuando ZapSign dice `signed` → run job → verificar transition aplicada + evento emitido
- Job expiry: crear request con `date_limit_to_sign = now() + 24h` → run job → verificar evento outbox + `expiry_alert_emitted=true`
- Job DLQ: insertar evento con `status='failed', retry_count=0` → run job → verificar replay attempted + retry_count incrementa o status=replayed

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con metricas observadas en staging
- [ ] `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` actualizado seccion "Cloud Run ops-worker"
- [ ] Cloud Monitoring dashboard "Signature Operations" creado y compartido
