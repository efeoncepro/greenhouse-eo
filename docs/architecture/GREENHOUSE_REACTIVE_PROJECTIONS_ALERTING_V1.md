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

**Historia**: la version inicial de este documento proponia usar un notification channel de `--type=slack`, que es el tipo OAuth-native de Cloud Monitoring. Al intentar provisionarlo via `gcloud` descubrimos que ese tipo requiere **autenticacion OAuth a nivel de workspace admin via la UI de Cloud Console** — no es scriptable desde un agente, una CI, ni un operador que no tenga permisos de install de Slack apps en el workspace.

**Solucion adoptada 2026-04-13**: usar `--type=webhook_tokenauth` apuntando directamente al secret `greenhouse-slack-alerts-webhook` en Secret Manager, que ya contenia la URL del Slack incoming webhook. Bypass total del OAuth, scriptable end-to-end.

### Comando exacto que funciono en prod

```bash
SLACK_URL=$(gcloud secrets versions access latest \
  --secret=greenhouse-slack-alerts-webhook \
  --project=efeonce-group)

gcloud alpha monitoring channels create \
  --display-name="Greenhouse Reactive Pipeline Alerts (Slack via webhook)" \
  --type=webhook_tokenauth \
  --channel-labels="url=${SLACK_URL}" \
  --user-labels="component=reactive-pipeline,managed-by=task-379" \
  --project=efeonce-group
```

**Notification channel provisionado**: `projects/efeonce-group/notificationChannels/8736345518502755361`. Usar este ID en el flag `--notification-channels` de cada politica mas abajo.

### Caveat sobre el formato de los mensajes

El payload que Cloud Monitoring envia al webhook **no es Slack Block Kit** — es el schema generico de Cloud Monitoring (`incident`, `policy_name`, `state`, `summary`, `documentation`, etc.). Slack lo renderiza como JSON plano dentro de un code block. Adecuado para alerting operacional (warning/critical), no para dashboards bonitos.

Si en el futuro se necesita pretty-formatting (mentions, colores, botones de ack), la evolucion correcta es **Pub/Sub → Cloud Run → Slack bot**: Cloud Monitoring publica a un Pub/Sub topic, un Cloud Run service chiquito consume el mensaje, mapea a Block Kit, y hace `POST` al webhook. No aplica hoy — el formato raw es suficiente para la criticidad de las 5 politicas.

### PagerDuty (opcional, no provisionado)

PagerDuty sigue soportado por Cloud Monitoring via `--type=pagerduty --channel-labels=service_key=...`. No se provisiono hoy porque Greenhouse todavia no tiene cuenta PD activa. Cuando se agregue, la unica politica que debe notificar a PD es la **Politica 2 (backlog critical)** — el resto se queda en Slack.

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

**Provisioned in production (2026-04-13):** `projects/efeonce-group/alertPolicies/12724517129604513698`.

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

**Provisioned in production (2026-04-13):** `projects/efeonce-group/alertPolicies/12724517129604512902`. Actualmente solo notifica a Slack (PagerDuty pendiente de setup).

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

**Provisioned in production (2026-04-13):** `projects/efeonce-group/alertPolicies/9439773336525841089`.

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

**Provisioned in production (2026-04-13):** `projects/efeonce-group/alertPolicies/9439773336525840646`.

---

## Politica 5 — `reactive_projection_error_rate_warning`

**Trigger:** el `error_rate` de una proyeccion (fallos / total runs) supera el 30% sostenido por 15 minutos.

**Severidad:** warning

**Canal:** Slack (`#greenhouse-alerts`)

**Por que importa:** una proyeccion con error_rate > 30% durante un cuarto de hora esta efectivamente rota — la mayoria de los scope groups que intenta procesar fallan. Es la senal operativa mas directa de que algo anda mal en el codigo de `refresh()`, en los datos upstream, o en dependencias externas (Postgres, BigQuery, Nubox). Antes de que la proyeccion llegue a dead-letters o a que el circuit breaker se abra (que ya cubre Politica 4), esta alerta avisa del deterioro progresivo.

**Historia — por que NO usamos una log-based metric de dead-letter:** la v1 de este doc proponia una Opcion A con cron job + structured log + log-based metric, y una Opcion B con `--condition-matched-log`. Al momento de provisionar descubrimos que (a) la Opcion A requiere un cron adicional solo para emitir el log, (b) la Opcion B basada en matched-log tiene limitaciones de throughput en Cloud Monitoring que la hacen poco confiable, y (c) el `error_rate` custom metric que ya emite el consumer V2 cubre el mismo signal operacional de forma mas directa. Una proyeccion que genera dead-letters sostenidos tambien genera error_rate alto — atacamos la causa upstream en vez del sintoma terminal.

**MQL query:**

```mql
fetch global
| metric 'custom.googleapis.com/greenhouse/reactive/error_rate'
| align mean(5m)
| every 1m
| group_by [metric.projection_name], [err: mean(value.error_rate)]
| condition err > 0.30
```

**Comando gcloud (via `--policy-from-file`):**

```json
{
  "displayName": "Reactive projection error_rate > 30% (warning)",
  "userLabels": {
    "severity": "warning",
    "component": "reactive-pipeline",
    "slo": "slo-3-hygiene"
  },
  "documentation": {
    "content": "Una proyeccion tiene error_rate > 30% sostenido por 15 minutos. Pasos: 1) buscar la proyeccion en /admin/ops-health, 2) revisar perProjection.failures en los logs del ops-worker, 3) reproducir localmente con pnpm reactive:backfill --domain=<dominio>, 4) si persiste mas de 1 hora, abrir ISSUE y considerar pausar el publisher upstream."
  },
  "conditions": [
    {
      "displayName": "error_rate > 0.30 for 15m",
      "conditionThreshold": {
        "filter": "metric.type=\"custom.googleapis.com/greenhouse/reactive/error_rate\" AND resource.type=\"global\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.30,
        "duration": "900s",
        "aggregations": [
          {
            "alignmentPeriod": "300s",
            "perSeriesAligner": "ALIGN_MEAN",
            "crossSeriesReducer": "REDUCE_MEAN",
            "groupByFields": ["metric.label.projection_name"]
          }
        ]
      }
    }
  ],
  "notificationChannels": [
    "projects/efeonce-group/notificationChannels/8736345518502755361"
  ],
  "combiner": "OR"
}
```

Aplicar con:

```bash
gcloud alpha monitoring policies create \
  --policy-from-file=policy-5-error-rate.json \
  --project=efeonce-group
```

**Provisioned in production (2026-04-13):** `projects/efeonce-group/alertPolicies/242492081293795724`.

---

## Checklist de provisioning

- [x] Canal Slack via `webhook_tokenauth` creado — `8736345518502755361` (2026-04-13)
- [ ] Canal PagerDuty (pendiente — no se provisiono aun)
- [x] Politica 1 activa (`reactive_backlog_total_warning`) — `12724517129604513698` (2026-04-13)
- [x] Politica 2 activa (`reactive_backlog_total_critical`) — `12724517129604512902` (2026-04-13)
- [x] Politica 3 activa (`reactive_lag_p95_warning`) — `9439773336525841089` (2026-04-13)
- [x] Politica 4 activa (`reactive_circuit_open_warning`) — `9439773336525840646` (2026-04-13)
- [x] Politica 5 activa (`reactive_projection_error_rate_warning`) — `242492081293795724` (2026-04-13, reemplaza al dead-letter log-based original)
- [ ] Probar cada politica con un evento sintetico (ver runbook abajo)
- [x] `policy_id` y `channel_id` documentados en `Handoff.md` (2026-04-13)

## Runbook de verificacion post-provisioning

Para cada politica, inyectar una senal que cruce el umbral y validar que Slack/PagerDuty reciben la notificacion:

0. **Verificar el canal**: antes de nada, confirmar que el notification channel existe y esta enabled:
   ```bash
   gcloud alpha monitoring channels describe \
     projects/efeonce-group/notificationChannels/8736345518502755361 \
     --project=efeonce-group
   ```
   El output debe mostrar `type: webhook_tokenauth`, `enabled: true`, y una url label que empieza con `https://hooks.slack.com/services/...`.
1. **Backlog warning/critical:** publicar 600 (o 2100) eventos sinteticos de un tipo inofensivo via `scripts/publish-synthetic-reactive-events.ts` (a crear como follow-up). Verificar que `/admin/ops-health` muestra el backlog crecer y que la alerta se dispara.
2. **Lag warning:** forzar una proyeccion lenta inyectando un `setTimeout` de 16 minutos en una copia local del consumer ejecutada contra staging. Verificar que `lag_seconds_p95` supera 900 en Cloud Monitoring.
3. **Circuit open:** hacer fallar 5 veces consecutivas una proyeccion en staging (via un scope que triggea una constraint violation conocida). Verificar que el breaker abre, esperar 60 minutos, verificar que la alerta se dispara.
4. **Error rate:** forzar una proyeccion a fallar en el 50%+ de sus runs durante 20 minutos (por ejemplo, devolviendo `throw new Error('synthetic')` desde el refresh en staging para eventos con cierto tag en el payload). Verificar que `error_rate` supera 0.30 en Cloud Monitoring y que la alerta llega a Slack.

## Referencias

- `src/lib/operations/cloud-monitoring-emitter.ts` — implementacion del emitter
- `src/lib/sync/reactive-consumer.ts` — punto de emision (al final de `processReactiveEvents`)
- `src/lib/operations/reactive-circuit-breaker.ts` — fuente de verdad del estado del breaker
- Cloud Monitoring docs: https://cloud.google.com/monitoring/alerts/using-alerting-ui
