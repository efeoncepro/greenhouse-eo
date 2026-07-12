# Operar el artifact-worker — cola, ejecuciones, diagnóstico y apagado

> **Tipo de documento:** Manual de uso (operación / runbook)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md) · `services/artifact-worker/README.md`

---

## Para qué sirve

Este manual es para **operar y diagnosticar el motor que renderiza los PDF** — no para armar una
propuesta (eso es [`rfp-a-pdf-el-dia-a-dia.md`](rfp-a-pdf-el-dia-a-dia.md)) ni para entender un
rechazo puntual (eso es [`entender-los-errores-y-rechazos.md`](entender-los-errores-y-rechazos.md)).

Lo abres cuando: un deck no sale, la cola parece atascada, quieres ver qué hizo el worker, o
necesitas **apagar todo** con seguridad.

## Antes de empezar

**La verdad del sistema vive en PostgreSQL, no en Cloud Run.** Cloud Run te dice si un contenedor
corrió; `greenhouse_commercial.proposal_render_jobs` te dice qué pasó con el trabajo. Empieza
SIEMPRE por la base de datos.

Necesitas: acceso a `gcloud` (proyecto `efeonce-group`) y el proxy de PostgreSQL
(`pnpm pg:connect`). Todo lo de este manual es **staging** — producción está cerrada por diseño
(nadie encola desde el portal productivo).

---

## Las 3 piezas y sus nombres exactos

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **`artifact-worker`** | Cloud Run **Job** (no service): una ejecución = un artefacto | `efeonce-group` / `us-east4` |
| **Dispatcher** | Endpoint `/artifact-render/dispatch` dentro del `ops-worker`: mira la cola, y si hay trabajo lanza una ejecución del Job | Cloud Run service `ops-worker` |
| **Scheduler** | `ops-artifact-render-dispatch`, cada 2 minutos, invoca al dispatcher | Cloud Scheduler / `us-east4` |

**El worker elige su trabajo, el dispatcher no se lo asigna.** El Job, al arrancar sin
`RENDER_JOB_ID`, toma el job de mayor prioridad con un bloqueo atómico (`FOR UPDATE SKIP LOCKED`).
Por eso dos ejecuciones simultáneas nunca pueden tomar el mismo trabajo.

---

## Paso a paso — diagnóstico de "un deck no salió"

### 1. Mira el estado del job (SIEMPRE primero)

```bash
pnpm pg:connect:shell
```

```sql
SELECT render_job_id, state, attempts, failure_code, left(failure_detail, 120) AS detalle,
       output_pdf_asset_id, output_report->>'durationMs' AS ms
FROM greenhouse_commercial.proposal_render_jobs
WHERE proposal_id = 'prop-...'
ORDER BY created_at DESC;
```

- **`state = completed`** → el PDF existe. El problema no es del render: es de dónde lo buscas
  (`output_pdf_asset_id` es el asset).
- **`state = failed` / `dead_letter`** → hay un `failure_code`: ve a
  [`entender-los-errores-y-rechazos.md`](entender-los-errores-y-rechazos.md).
- **`state = queued` hace rato** → sigue en el punto 2.
- **`state = running` hace mucho** → el worker se colgó; punto 4.

### 2. La cola: ¿por qué no se despacha?

```sql
-- Todo lo que espera, en orden de prioridad real (deadline primero; sin deadline, envejecen)
SELECT render_job_id, state, deadline, created_at,
       now() - created_at AS esperando
FROM greenhouse_commercial.proposal_render_jobs
WHERE state = 'queued'
ORDER BY LEAST(COALESCE(deadline, 'infinity'::timestamptz), created_at + interval '30 minutes'), created_at;
```

Causas posibles, en orden de probabilidad:

| Causa | Cómo la confirmas | Solución |
|---|---|---|
| **El flag está apagado** | El dispatcher registra `skip: flag OFF` | Ver "Prender y apagar" abajo |
| **El scheduler no corre** | `gcloud scheduler jobs describe ops-artifact-render-dispatch --location=us-east4 --project=efeonce-group` → `state` | `gcloud scheduler jobs resume ...` |
| **El deadline ya venció** | El job se cierra solo con `failure_code = 'timeout'` y detalle `deadline_expired_in_queue` | Es correcto: no se rinde un deck para un proceso cerrado |
| **El dispatcher falla** | `failure_code = 'dispatch_error'` | Mira sus logs (punto 3) |

### 3. Logs

```bash
# Dispatcher (dentro del ops-worker)
gcloud logging read 'resource.labels.service_name="ops-worker" AND textPayload:"artifact-render"' \
  --project=efeonce-group --limit=10 --freshness=30m --format='value(textPayload)'

# El worker (el Job)
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="artifact-worker"' \
  --project=efeonce-group --limit=20 --freshness=30m --format='value(textPayload)'

# Ejecuciones del Job
gcloud run jobs executions list --job=artifact-worker --project=efeonce-group --region=us-east4 --limit=5
```

**Cómo leer los logs del worker:** emite JSON de una línea. `{"msg":"render completed",...}` es
éxito; `{"msg":"render failed (gobernado)","code":"..."}` es un rechazo **con estado guardado** (el
contenedor sale 0 a propósito: el fallo vive en la base, no en Cloud Run). Un contenedor que sale
con código ≠ 0 es un **bug del worker** (va a Sentry, dominio `commercial`).

### 4. Ejecutar un job a mano (smoke o replay dirigido)

```bash
gcloud run jobs execute artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=RENDER_JOB_ID=prnd-... --wait
```

Úsalo para reproducir un fallo puntual sin esperar al dispatcher. **No** cambia ninguna regla: el
worker aplica los mismos gates.

### 5. Reintentar un job fallido

El reintento es **del dominio**, no de Cloud Run (el Job tiene `max-retries=0` a propósito). Se hace
con el command canónico:

```bash
POST /api/commercial/proposals/<proposalId>/render-jobs/<renderJobId>/retry
Body: { "ownerOrgId": "org-..." }
```

**Se rechaza el reintento** si el fallo no es reintentable (`audience_violation`,
`accessibility_unsupported`, `semantic_rejected`, `size_rejected`, `geometry_rejected`,
`manifest_drift`): el mismo manifiesto produciría el mismo rechazo. Ahí hay que **corregir el plan o
la evidencia y pedir un render nuevo**.

---

## Qué significan las señales

En `/admin/operations` (Reliability), bajo `Commercial`:

| Señal | Estado sano | Si se enciende |
|---|---|---|
| `artifact.render.queue.starvation` | **0** | Hay jobs esperando > 20 min. El dispatcher está caído, el flag apagado, o la cola tiene inanición |
| `artifact.render.dead_letter` | **0** | Un job agotó sus reintentos o falló de forma terminal: **requiere una persona** |
| `commercial.proposal.deadline_at_risk` | **0** | Una propuesta vence en < 72 h y no está lista |
| `commercial.proposal.stuck_in_state` | **0** | Una propuesta activa lleva > 14 días sin movimiento |

---

## Prender y apagar (el flag es MULTI-RUNTIME)

`ARTIFACT_RENDER_JOBS_ENABLED` se lee en **tres** runtimes independientes. Apagarlo en uno solo NO
apaga el sistema.

| Runtime | Qué hace con el flag apagado | Dónde está declarado (fuente de verdad) |
|---|---|---|
| **Vercel** (encolar) | Rechaza con `flag_disabled` | Variable de entorno del proyecto (staging la tiene; **producción NO**) |
| **ops-worker** (dispatcher) | No despacha; registra el skip | `services/ops-worker/deploy.sh` |
| **artifact-worker** (Job) | Sale sin renderizar | `services/artifact-worker/deploy.sh` |

### Apagar TODO (rollback, < 10 min)

```bash
# 1. Deja de despachar (efecto inmediato)
gcloud run services update ops-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=ARTIFACT_RENDER_JOBS_ENABLED=false

# 2. El Job no renderiza aunque lo invoquen
gcloud run jobs update artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=ARTIFACT_RENDER_JOBS_ENABLED=false

# 3. Cierra la puerta de entrada (nadie encola)
vercel env rm ARTIFACT_RENDER_JOBS_ENABLED staging --scope efeonce-7670142f
# (requiere redeploy de staging para tomar efecto)
```

Los jobs en curso terminan; los encolados quedan esperando (nada se pierde: la tabla es
append-only). Los PDF ya aprobados **no se borran nunca**.

> ⚠️ **Un cambio hecho solo con `--update-env-vars` dura hasta el próximo deploy.** Los `deploy.sh`
> usan `--set-env-vars`, que es **destructivo**: borra cualquier variable agregada por fuera. Si el
> apagado debe ser permanente, **cámbialo también en el `deploy.sh`** (es la fuente de verdad) y
> registra la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

---

## Qué NO hacer nunca

- **NUNCA borres filas de `proposal_render_jobs`** — la tabla es append-only y un trigger lo impide.
  Los jobs son evidencia de qué se generó y con qué.
- **NUNCA "arregles" un job editando su manifiesto en la base.** Los campos de contrato son
  inmutables (trigger). Un plan distinto = un job nuevo. Si lo forzaras, el worker lo detectaría
  igual (`manifest_drift`) y no renderizaría.
- **NUNCA subas los reintentos de Cloud Run** (`max-retries`). El reintento es del dominio: si Cloud
  Run reintentara por su cuenta, el contador de intentos y el dead-letter dejarían de significar
  algo.
- **NUNCA ejecutes el render en el `ops-worker` ni en Vercel.** Chromium ahí bloquearía el publisher
  del outbox (y ese es un invariante duro del repo).
- **NUNCA cambies la imagen a un tag flotante de Playwright.** La versión está pinneada porque otro
  Chromium = otro píxel = otro artefacto. Un test de CI lo impide.

---

## Problemas comunes

| Síntoma | Causa más probable | Qué haces |
|---|---|---|
| El job queda `queued` para siempre | Flag apagado o scheduler pausado | Revisa los 3 runtimes del flag |
| `dispatch_error` | Permisos o la Jobs API rechazó la ejecución | Logs del dispatcher; revisa el binding `run.invoker` de la service account |
| El contenedor sale con código 1 | **Bug del worker** (no un rechazo de negocio) | Sentry, dominio `commercial`, tag `source=artifact_worker` |
| El deploy falla en el paso de selftest | La imagen no tiene lo que el runtime necesita (catálogo, fuentes, Chromium) | Es el gate haciendo su trabajo: mira el log del selftest en Cloud Build |
| `manifest_drift` | El catálogo cambió después de encolar | Pide un render nuevo (el manifiesto viejo describe un artefacto que ya no existe) |

---

## Referencias técnicas

- Spec del pipeline: [`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md)
- Runbook del worker (para quien toca el código): `services/artifact-worker/README.md`
- La bug class del primer deploy y sus lecciones: [`ISSUE-121`](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
- Decisiones y alternativas rechazadas: [`decisiones-de-diseno.md`](../../documentation/proposal-studio/decisiones-de-diseno.md)
