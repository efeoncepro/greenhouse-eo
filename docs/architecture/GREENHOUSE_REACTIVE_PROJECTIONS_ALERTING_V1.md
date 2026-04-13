# GREENHOUSE REACTIVE PROJECTIONS ALERTING V1

> **Status:** Canonical
> **Owner:** Platform / Ops
> **Version:** 1.0
> **Created:** 2026-04-13 (TASK-379 Slice 4)
> **Related specs:**
> - `GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md`
> - `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (to be replaced by V2)
> - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

## Proposito

Este documento define las **5 politicas de alerting** que protegen el pipeline reactivo V2 de Greenhouse. Cada politica se materializa en Cloud Monitoring y notifica a Slack (`SLACK_ALERTS_WEBHOOK_URL`) y/o PagerDuty cuando el SLO correspondiente entra en riesgo.

Las politicas estan disenadas para **provisioning manual por el operador** via `gcloud alpha monitoring policies create`. No se incluyen en Terraform porque el repositorio todavia no gestiona Cloud Monitoring declarativamente; cuando se adopte, migrar los comandos de este documento al modulo `terraform/monitoring/reactive-projections/`.

## Metricas custom emitidas

Todas las politicas dependen de las metricas custom que emite el consumer V2 (`src/lib/operations/cloud-monitoring-emitter.ts`). Los nombres exactos:

| Metrica | Tipo | Labels |
| --- | --- | --- |
| `custom.googleapis.com/greenhouse/reactive/backlog_depth` | gauge | `domain` |
| `custom.googleapis.com/greenhouse/reactive/lag_seconds_p95` | gauge | `projection_name`, `domain` |
| `custom.googleapis.com/greenhouse/reactive/throughput_events_per_run` | gauge | `domain` |
| `custom.googleapis.com/greenhouse/reactive/error_rate` | gauge | `projection_name`, `domain` |
| `custom.googleapis.com/greenhouse/reactive/circuit_breaker_state` | gauge | `projection_name` |

La metrica `circuit_breaker_state` usa una codificacion numerica: `0 = closed`, `1 = half_open`, `2 = open`.

## Canales de notificacion

Antes de crear las politicas, provisionar dos notification channels en Cloud Monitoring:

```bash
# Slack warning
gcloud alpha monitoring channels create \
  --display-name="Greenhouse Slack Alerts" \
  --type=slack \
  --channel-labels=channel_name=#greenhouse-alerts \
  --user-labels=purpose=reactive-warning

# PagerDuty critical (solo si se configura PD para Greenhouse)
gcloud alpha monitoring channels create \
  --display-name="Greenhouse PagerDuty Critical" \
  --type=pagerduty \
  --channel-labels=service_key=$PAGERDUTY_SERVICE_KEY \
  --user-labels=purpose=reactive-critical
```

Guardar los `CHANNEL_ID` resultantes y reemplazarlos en los comandos `--notification-channels` mas abajo.

---

## Politica 1 — `reactive_backlog_total_warning`

**Trigger (en lenguaje simple):** la profundidad total del backlog reactivo supera 500 eventos durante mas de 10 minutos.

**Severidad:** warning

**Canal:** Slack (`#greenhouse-alerts`)

**Por que importa:** un backlog sostenido de 500+ eventos indica que el consumer no esta drenando mas rapido de lo que los publishers estan emitiendo. Si no se corrige, se degrada el SLO 1 (latencia P99 <= 5 minutos).

**MQL query:**

```mql
fetch global
| metric 'custom.googleapis.com/greenhouse/reactive/backlog_depth'
| align max_with_NaN(1m)
| every 1m
| group_by [], [depth: max(value.backlog_depth)]
| condition depth > 500
```

**Comando gcloud:**

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID \
  --display-name='Reactive backlog total > 500 (warning)' \
  --user-labels=severity=warning,component=reactive-pipeline,slo=slo-1-latency \
  --documentation='El backlog reactivo supera 500 eventos por mas de 10 minutos. Revisar ops-worker en Cloud Run us-east4 y el endpoint /reactive/queue-depth. Escalamiento esperado: aumentar max-instances o forzar /reactive/process manual.' \
  --condition-filter='metric.type="custom.googleapis.com/greenhouse/reactive/backlog_depth" AND resource.type="global"' \
  --condition-threshold-value=500 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=600s \
  --condition-threshold-aggregations='alignment_period=60s,per_series_aligner=ALIGN_MAX,cross_series_reducer=REDUCE_MAX' \
  --condition-display-name='backlog_depth > 500 for 10m'
```

---

## Politica 2 — `reactive_backlog_total_critical`

**Trigger:** la profundidad total del backlog reactivo supera 2000 eventos durante mas de 5 minutos.

**Severidad:** critical

**Canal:** Slack (`#greenhouse-alerts`) + PagerDuty

**Por que importa:** un backlog de 2000+ eventos rompe el SLO 1 inmediatamente (tiempo de drenado > 30 minutos con los batches actuales). Es la senal de un incidente operativo activo — merece pager inmediato.

**MQL query:**

```mql
fetch global
| metric 'custom.googleapis.com/greenhouse/reactive/backlog_depth'
| align max_with_NaN(1m)
| every 1m
| group_by [], [depth: max(value.backlog_depth)]
| condition depth > 2000
```

**Comando gcloud:**

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID,projects/$GCP_PROJECT/notificationChannels/$PAGERDUTY_CHANNEL_ID \
  --display-name='Reactive backlog total > 2000 (critical)' \
  --user-labels=severity=critical,component=reactive-pipeline,slo=slo-1-latency \
  --documentation='INCIDENTE ACTIVO. Backlog reactivo > 2000 eventos por 5+ minutos. Runbook: 1) revisar Cloud Run ops-worker logs en us-east4, 2) verificar que Cloud Scheduler este activo, 3) ejecutar POST /reactive/process manualmente con batchSize=1000, 4) si el backlog persiste, escalar max-instances del servicio a 10. SLO 1 y SLO 4 comprometidos.' \
  --condition-filter='metric.type="custom.googleapis.com/greenhouse/reactive/backlog_depth" AND resource.type="global"' \
  --condition-threshold-value=2000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --condition-threshold-aggregations='alignment_period=60s,per_series_aligner=ALIGN_MAX,cross_series_reducer=REDUCE_MAX' \
  --condition-display-name='backlog_depth > 2000 for 5m'
```

---

## Politica 3 — `reactive_lag_p95_warning`

**Trigger:** la latencia avg/P95 por proyeccion supera 900 segundos (15 minutos) durante al menos 15 minutos.

**Severidad:** warning

**Canal:** Slack (`#greenhouse-alerts`)

**Por que importa:** monitorea el tiempo que tarda cada proyeccion en drenar un scope group coalescido. Una sola proyeccion lenta no afecta al backlog total de inmediato, pero degrada el SLO 1 para sus consumidores especificos.

**MQL query:**

```mql
fetch global
| metric 'custom.googleapis.com/greenhouse/reactive/lag_seconds_p95'
| align mean(5m)
| every 1m
| group_by [metric.projection_name], [lag: mean(value.lag_seconds_p95)]
| condition lag > 900
```

**Comando gcloud:**

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID \
  --display-name='Reactive projection lag > 15m (warning)' \
  --user-labels=severity=warning,component=reactive-pipeline,slo=slo-1-latency \
  --documentation='Una proyeccion tiene lag sostenido > 15 minutos. Revisar /admin/ops-health, buscar la proyeccion afectada en el panel de drill-down, inspeccionar sus queries y triggers. Si es un hotspot conocido, considerar coalescing mas agresivo o rate limiting en el publisher.' \
  --condition-filter='metric.type="custom.googleapis.com/greenhouse/reactive/lag_seconds_p95" AND resource.type="global"' \
  --condition-threshold-value=900 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=900s \
  --condition-threshold-aggregations='alignment_period=300s,per_series_aligner=ALIGN_MEAN,cross_series_reducer=REDUCE_MEAN,group_by_fields=metric.label.projection_name' \
  --condition-display-name='lag_seconds_p95 > 900 for 15m'
```

---

## Politica 4 — `reactive_circuit_open_warning`

**Trigger:** el circuit breaker de una proyeccion permanece en estado `open` (valor = 2) durante mas de 60 minutos.

**Severidad:** warning

**Canal:** Slack (`#greenhouse-alerts`)

**Por que importa:** el circuit breaker es una salvaguarda de ultima linea. Si lleva mas de 60 minutos cerrado significa que el reintento automatico despues del cooldown fallo (el probe en half-open fallo o la proyeccion sigue lanzando errores). Requiere intervencion humana — en ese tiempo los scope groups de esa proyeccion se acumulan en el backlog.

**MQL query:**

```mql
fetch global
| metric 'custom.googleapis.com/greenhouse/reactive/circuit_breaker_state'
| align max_with_NaN(1m)
| every 1m
| group_by [metric.projection_name], [state: max(value.circuit_breaker_state)]
| condition state >= 2
```

**Comando gcloud:**

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID \
  --display-name='Reactive circuit breaker open > 60m (warning)' \
  --user-labels=severity=warning,component=reactive-pipeline,slo=slo-2-completeness \
  --documentation='Una proyeccion lleva > 60 minutos en estado open. El cooldown expiro y el probe en half-open fallo. Pasos: 1) buscar la proyeccion en el dashboard Ops Health, 2) revisar greenhouse_sync.projection_circuit_state para leer last_error, 3) si la proyeccion tiene un bug real, abrir incidente, 4) si es transitorio, reiniciar el circuit con UPDATE projection_circuit_state SET state='"'"'closed'"'"' WHERE projection_name = ... (requiere confirmacion de ops lead).' \
  --condition-filter='metric.type="custom.googleapis.com/greenhouse/reactive/circuit_breaker_state" AND resource.type="global"' \
  --condition-threshold-value=1.5 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=3600s \
  --condition-threshold-aggregations='alignment_period=60s,per_series_aligner=ALIGN_MAX,cross_series_reducer=REDUCE_MAX,group_by_fields=metric.label.projection_name' \
  --condition-display-name='circuit_breaker_state == open (>=2) for 60m'
```

---

## Politica 5 — `reactive_dead_letter_warning`

**Trigger:** aparece al menos un evento con `result = 'dead-letter'` en `greenhouse_sync.outbox_reactive_log` dentro de las ultimas 24 horas.

**Severidad:** warning

**Canal:** Slack (`#greenhouse-alerts`)

**Por que importa:** dead-letters son eventos que la proyeccion no pudo procesar despues de agotar sus reintentos. Requieren intervencion manual (fix + replay o mass-ack). No deben quedar sin resolver por mas de 24 horas — eso rompe el SLO 3 (higiene).

**Nota sobre implementacion:** esta alerta no depende de una metrica custom, sino de una metrica derivada de logs (log-based metric). Cloud Monitoring genera la metrica desde los logs de Postgres emitidos via `pg_logical_read` o desde un cron job que consulta la tabla y escribe un log estructurado.

**Opcion A — Log-based metric via cron job:**

1. Crear un cron job (Cloud Scheduler + Cloud Run existente `ops-worker`, endpoint nuevo opcional `GET /reactive/dead-letter-count`) que emita un log estructurado cada 5 minutos:

    ```json
    {
      "severity": "WARNING",
      "labels": {
        "metric_type": "greenhouse.reactive.dead_letter_count"
      },
      "jsonPayload": {
        "deadLetterCount": 3,
        "eventIds": ["outbox-evt-abc", "outbox-evt-def", "outbox-evt-ghi"]
      }
    }
    ```

2. Crear la log-based metric:

    ```bash
    gcloud logging metrics create reactive_dead_letter_count \
      --description='Conteo de eventos en dead-letter en outbox_reactive_log en las ultimas 24 horas.' \
      --log-filter='resource.type="cloud_run_revision"
    resource.labels.service_name="ops-worker"
    jsonPayload.metric_type="greenhouse.reactive.dead_letter_count"' \
      --value-extractor='EXTRACT(jsonPayload.deadLetterCount)' \
      --metric-descriptor-value-type=INT64 \
      --metric-descriptor-metric-kind=GAUGE
    ```

3. Crear la alerting policy sobre la log-based metric:

    ```bash
    gcloud alpha monitoring policies create \
      --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID \
      --display-name='Reactive dead-letters detected (warning)' \
      --user-labels=severity=warning,component=reactive-pipeline,slo=slo-3-hygiene \
      --documentation='Hay al menos 1 evento en estado dead-letter en outbox_reactive_log en las ultimas 24 horas. Runbook: 1) consultar SELECT event_id, handler, last_error, retries FROM greenhouse_sync.outbox_reactive_log WHERE result = '"'"'dead-letter'"'"' AND reacted_at > NOW() - INTERVAL '"'"'24 hours'"'"'; 2) decidir si corresponde fix + replay o mass-ack; 3) documentar en ISSUE-###.' \
      --condition-filter='metric.type="logging.googleapis.com/user/reactive_dead_letter_count" AND resource.type="global"' \
      --condition-threshold-value=0 \
      --condition-threshold-comparison=COMPARISON_GT \
      --condition-threshold-duration=60s \
      --condition-threshold-aggregations='alignment_period=300s,per_series_aligner=ALIGN_MAX' \
      --condition-display-name='dead_letter_count > 0'
    ```

**Opcion B — Alerta directa sobre logs estructurados (recomendada si no se quiere mantener un cron job extra):** emitir un log `severity=ERROR` desde el consumer V2 cada vez que marca un evento como `dead-letter` (ya lo hace en `actions.push('[name] DEAD-LETTER event ...')`) y configurar una alerting policy basada en el conteo de entradas coincidentes:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/$GCP_PROJECT/notificationChannels/$SLACK_CHANNEL_ID \
  --display-name='Reactive dead-letter log event (warning)' \
  --user-labels=severity=warning,component=reactive-pipeline,slo=slo-3-hygiene \
  --condition-matched-log='filter=resource.type="cloud_run_revision" AND textPayload=~"DEAD-LETTER event"' \
  --condition-display-name='Any dead-letter log in 5m window'
```

La Opcion B es mas rapida de provisionar pero no permite umbrales cuantitativos; se dispara con el primer dead-letter visible. Para Greenhouse es apropiada porque el SLO 3 define "0 dead-letters por mas de 24 horas" — cualquier aparicion debe ser visible.

---

## Checklist de provisioning

- [ ] Canales Slack y PagerDuty creados
- [ ] Politica 1 activa (`reactive_backlog_total_warning`)
- [ ] Politica 2 activa (`reactive_backlog_total_critical`)
- [ ] Politica 3 activa (`reactive_lag_p95_warning`)
- [ ] Politica 4 activa (`reactive_circuit_open_warning`)
- [ ] Politica 5 activa (`reactive_dead_letter_warning`) — Opcion A o B
- [ ] Probar cada politica con un evento sintetico (ver runbook abajo)
- [ ] Documentar los `policy_id` resultantes en `Handoff.md`

## Runbook de verificacion post-provisioning

Para cada politica, inyectar una senal que cruce el umbral y validar que Slack/PagerDuty reciben la notificacion:

1. **Backlog warning/critical:** publicar 600 (o 2100) eventos sinteticos de un tipo inofensivo via `scripts/publish-synthetic-reactive-events.ts` (a crear como follow-up). Verificar que `/admin/ops-health` muestra el backlog crecer y que la alerta se dispara.
2. **Lag warning:** forzar una proyeccion lenta inyectando un `setTimeout` de 16 minutos en una copia local del consumer ejecutada contra staging. Verificar que `lag_seconds_p95` supera 900 en Cloud Monitoring.
3. **Circuit open:** hacer fallar 5 veces consecutivas una proyeccion en staging (via un scope que triggea una constraint violation conocida). Verificar que el breaker abre, esperar 60 minutos, verificar que la alerta se dispara.
4. **Dead-letter:** forzar una proyeccion a fallar con `maxRetries=0`, publicar un evento, verificar que se marca dead-letter y que la alerta llega.

## Referencias

- `src/lib/operations/cloud-monitoring-emitter.ts` — implementacion del emitter
- `src/lib/sync/reactive-consumer.ts` — punto de emision (al final de `processReactiveEvents`)
- `src/lib/operations/reactive-circuit-breaker.ts` — fuente de verdad del estado del breaker
- Cloud Monitoring docs: https://cloud.google.com/monitoring/alerts/using-alerting-ui
