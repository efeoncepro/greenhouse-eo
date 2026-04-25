# Runbook — Rollback del Weekly Digest ICO

> **Tipo de documento:** Runbook operacional
> **Creado:** 2026-04-24 por Claude
> **Owner:** Platform / Observability
> **Relacionado:** [TASK-598](../tasks/complete/TASK-598-ico-narrative-presentation-layer.md)

## Cuándo usar este runbook

Este runbook se activa cuando el correo semanal **Nexa Executive Digest** (cron `ops-nexa-weekly-digest`, lunes 07:00 Chile) falla o sale con contenido incorrecto después de un deploy. Señales:

- El monitor Cloud Logging no emitió `[ops-worker] /nexa/weekly-digest done — status=sent` dentro de la ventana 07:00-08:00 Chile del lunes.
- Un recipient del liderazgo reportó un email con narrativas raras (sentinels, IDs técnicos, referencias a proyectos que no existen).
- El endpoint `POST /nexa/weekly-digest` devuelve `500` al ser invocado manualmente.
- Logs muestran `[ops-worker] /nexa/weekly-digest failed` con error específico.

## Decisión rápida

| Síntoma | Acción primaria |
|---|---|
| Email salió con contenido incorrecto (sentinels, narrativas raras) | **Pausar cron + comunicar + investigar antes de reintentar** |
| Cron no ejecutó (silencio total) | **Ejecutar manual una vez; si falla → rollback revision** |
| `500` en el endpoint | **Rollback revision + abrir issue** |
| Recipients vacíos | **Investigar identity-store** (no requiere rollback de código) |

## Paso 1 — Pausar el cron inmediatamente

Impide que el siguiente tick semanal vuelva a disparar el envío roto. Los tick son semanales, pero si hay re-trigger manual o misfire, el pause lo detiene.

```bash
gcloud scheduler jobs pause ops-nexa-weekly-digest \
  --location=us-central1 \
  --project=efeonce-group
```

Verificar estado:

```bash
gcloud scheduler jobs describe ops-nexa-weekly-digest \
  --location=us-central1 \
  --project=efeonce-group \
  --format="value(state)"
```

Debe aparecer `PAUSED`.

## Paso 2 — Revertir el deploy del ops-worker

Si el problema fue un deploy reciente de ops-worker Cloud Run:

```bash
# Ver revisiones recientes con traffic
gcloud run services describe ops-worker \
  --project efeonce-group --region us-east4 \
  --format="value(status.traffic)"

# Listar revisiones con timestamps
gcloud run revisions list \
  --service ops-worker \
  --project efeonce-group --region us-east4 \
  --format="table(metadata.name, metadata.creationTimestamp.date('%Y-%m-%d %H:%M'))"

# Redirigir 100% del traffic a una revisión anterior (reemplaza PREVIOUS_REVISION)
gcloud run services update-traffic ops-worker \
  --project efeonce-group --region us-east4 \
  --to-revisions=PREVIOUS_REVISION=100
```

Validar:

```bash
gcloud run services describe ops-worker \
  --project efeonce-group --region us-east4 \
  --format="value(status.traffic[*].revisionName,status.traffic[*].percent)"
```

## Paso 3 — Comunicar a stakeholders

Usar template pre-escrito. Copiar y adaptar el periodo:

> **Asunto:** Resumen semanal Nexa del {DD/MM} — problema de renderizado
>
> Hola equipo,
>
> El resumen semanal Nexa del {DD/MM} tiene un problema de renderizado que produjo narrativas incorrectas. Ya estamos corrigiendo.
>
> **No es necesario que actúen sobre las alertas mostradas en ese email** — muchos de los eventos ya fueron resueltos automáticamente por el sistema y las referencias a proyectos/personas pueden estar desactualizadas.
>
> Les vamos a re-enviar la versión corregida apenas el fix esté desplegado.
>
> — Platform team

Canales de envío sugeridos:
- Slack `#ops-alerts` y `#liderazgo` (según audience del digest).
- Email dirigido a los mismos recipients originales del digest.

## Paso 4 — Re-enviar manualmente cuando el fix esté listo

Una vez el rollback (o fix forward) está deployed y validado con dry-run:

```bash
# Obtener URL del ops-worker
export OPS_WORKER_URL=$(gcloud run services describe ops-worker \
  --project efeonce-group --region us-east4 --format="value(status.url)")

# Obtener id token (requiere acceso run.invoker)
export ID_TOKEN=$(gcloud auth print-identity-token)

# Dry-run primero — inspecciona output sin enviar
curl -X POST "${OPS_WORKER_URL}/nexa/weekly-digest" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 8}' | jq '.digest | {totalInsights, criticalCount, spaces: .spaces[].name}'

# Si el output se ve limpio, envío real a recipient de test
curl -X POST "${OPS_WORKER_URL}/nexa/weekly-digest" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"recipients_override": ["tu-email@efeonce.org"], "limit": 8}'

# Si el email de test se ve OK, envío real al liderazgo (SIN override)
curl -X POST "${OPS_WORKER_URL}/nexa/weekly-digest" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 8}'
```

## Paso 5 — Re-activar el cron

Una vez el problema resuelto y validado:

```bash
gcloud scheduler jobs resume ops-nexa-weekly-digest \
  --location=us-central1 \
  --project=efeonce-group
```

## Monitoreo post-rollback

Durante las 24h siguientes al rollback, monitorear:

- Cloud Logging ops-worker — buscar `[narrative_presentation]` con `fallback_rate > 0.2`.
- Email deliveries table en PG — confirmar que el re-envío llegó con status `sent`.
- Reportes manuales de recipients — confirmar visualmente que el email recibido se ve coherente.

## Diagnóstico por tipo de error

### A. Email con narrativas `Sin nombre` / `Untitled`

Probable causa: capa de presentación (`resolveMentions`) no se aplicó. Verificar:

```bash
# El deploy live tiene el módulo narrative-presentation.ts?
grep -l "resolveMentions" /app/dist/*.mjs  # Dentro del container
```

Si no tiene el módulo → rollback del deploy que quitó el fix. Ver Paso 2.

### B. Email con `totalInsights=0` inesperado

Probable causa: filtros de `selectPresentableEnrichments` son demasiado estrictos.

```bash
# Ejecutar preview localmente para matrices
pnpm tsx scripts/ico-digest-threshold-preview.ts
```

Si ninguna combinación razonable produce ≥3 insights → hay un problema upstream (materialize ICO no corrió, enrichment worker falló). Revisar:
- Último tick de `ico-materialize-daily`.
- Último tick de `ico-llm-enrich-daily`.
- Filas en `greenhouse_serving.ico_ai_signal_enrichment_history` con `status='succeeded'`.

### C. Sendgrid/Resend devuelve rate limit

Probable causa: demasiados recipients o retry loop. El sistema tiene circuit breaker pero si falló, pausar cron y re-enviar en ventana distinta.

## Contacto de escalación

- Platform owner: revisar `CODEOWNERS` del repo.
- Cloud Run IAM / Cloud Scheduler: revisar `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`.
- ICO Engine internals: revisar `docs/architecture/Greenhouse_ICO_Engine_v1.md`.
