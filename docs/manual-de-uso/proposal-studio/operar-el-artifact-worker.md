# Operar el artifact-worker — cola, ejecuciones, diagnóstico y apagado

> **Tipo de documento:** Manual de uso (operación / runbook)
> **Version:** 1.1
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude — se agregan deploy + selftest, verificación de la revisión activa, mapa completo de flags por ambiente y las lecciones de `ISSUE-121`
> **Modulo:** Comercial — Artifact Renderer (`TASK-1391`)
> **Ruta en portal:** `/admin/operations` (señales de confiabilidad)
> **Documentacion tecnica:** [GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md) · [`services/artifact-worker/README.md`](../../../services/artifact-worker/README.md)

---

## Para qué sirve

Este manual es para **operar y diagnosticar el motor que renderiza los PDF** — no para armar una
propuesta (eso es [`rfp-a-pdf-el-dia-a-dia.md`](rfp-a-pdf-el-dia-a-dia.md) y
[`crear-y-operar-una-propuesta.md`](crear-y-operar-una-propuesta.md)) ni para entender un rechazo
puntual (eso es [`entender-los-errores-y-rechazos.md`](entender-los-errores-y-rechazos.md)).

Lo abres cuando: un deck no sale, la cola parece atascada, quieres ver qué hizo el worker, necesitas
desplegar un cambio, o necesitas **apagar todo** con seguridad.

## Antes de empezar

**La verdad del sistema vive en PostgreSQL, no en Cloud Run.** Cloud Run te dice si un contenedor
corrió; `greenhouse_commercial.proposal_render_jobs` te dice qué pasó con el trabajo. Empieza SIEMPRE
por la base de datos.

Necesitas:

- `gcloud` autenticado con **los dos** flujos (uno no reemplaza al otro):
  `gcloud auth login` **y** `gcloud auth application-default login`.
- Proyecto `efeonce-group`, región `us-east4`.
- Proxy de PostgreSQL: `pnpm pg:connect:shell`.

Todo lo de este manual es **staging**. Producción está cerrada por diseño: nadie encola desde el portal
productivo (ver "Prender y apagar").

---

## Las 3 piezas y sus nombres exactos

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **`artifact-worker`** | Cloud Run **Job** (no service): una ejecución = un artefacto | `efeonce-group` / `us-east4` |
| **Dispatcher** | Endpoint `POST /artifact-render/dispatch` dentro del `ops-worker`: mira la cola, y si hay trabajo lanza una ejecución del Job | Cloud Run service `ops-worker` |
| **Scheduler** | `ops-artifact-render-dispatch`, cada 2 minutos, invoca al dispatcher | Cloud Scheduler / `us-east4` |

Es el **primer Cloud Run Job** del ecosistema: a diferencia de los *services*, no expone HTTP y no queda
corriendo. Se ejecuta, hace una cosa y muere (`tasks=1`, `parallelism=1`, `max-retries=0`).

**El worker elige su trabajo; el dispatcher no se lo asigna.** El Job, al arrancar sin `RENDER_JOB_ID`,
toma el job de mayor prioridad con un bloqueo atómico (`FOR UPDATE SKIP LOCKED`). Por eso dos ejecuciones
simultáneas nunca pueden tomar el mismo trabajo — y por eso el dispatcher **no necesita** el permiso
`run.jobs.runWithOverrides` (fue el hallazgo #1 de `ISSUE-121`: rediseñar para necesitar **menos**
privilegio resultó además más robusto).

**La prioridad de la cola** (nunca FIFO ciega): deadline más próximo primero; los jobs **sin** deadline
**envejecen** y a los 30 minutos alcanzan prioridad de despacho (prioridad sin envejecimiento es hambruna
con otro nombre). Los de deadline vencido **no compiten**: se cierran de forma gobernada.

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

- **`state = completed`** → el PDF existe. El problema no es del render: es dónde lo buscas. El asset es
  `output_pdf_asset_id` y se descarga en `GET /api/assets/private/{assetId}`.
- **`state = failed` / `dead_letter`** → hay un `failure_code`: ve a
  [`entender-los-errores-y-rechazos.md`](entender-los-errores-y-rechazos.md).
- **`state = queued` hace rato** → sigue en el punto 2.
- **`state = running` hace mucho** → el worker se colgó; punto 4.

El historial completo de un job (append-only, incluidos los intentos fallidos):

```sql
SELECT from_state, to_state, actor_kind, detail, created_at
FROM greenhouse_commercial.proposal_render_job_events
WHERE render_job_id = 'prnd-...'
ORDER BY created_at;
```

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
| **El flag está apagado en el `ops-worker`** | El dispatcher registra `skip: flag OFF`. Verifícalo en la **revisión activa** (comando abajo), no en el ledger | Ver "Prender y apagar" |
| **El scheduler no corre** | `gcloud scheduler jobs describe ops-artifact-render-dispatch --location=us-east4 --project=efeonce-group` → `state` | `gcloud scheduler jobs resume ops-artifact-render-dispatch --location=us-east4 --project=efeonce-group` |
| **El deadline ya venció** | El job se cierra solo con `failure_code = 'timeout'` y detalle `deadline_expired_in_queue` | Es correcto: no se rinde un deck para un proceso cerrado |
| **El dispatcher falla al lanzar** | `failure_code = 'dispatch_error'` | Logs del dispatcher (punto 3) + binding `run.invoker` de la service account |

Verificar el flag **en la revisión activa** (la única fuente confiable):

```bash
gcloud run services describe ops-worker --project=efeonce-group --region=us-east4 \
  --format='value(spec.template.spec.containers[0].env)' | tr ',' '\n' | grep ARTIFACT

gcloud run jobs describe artifact-worker --project=efeonce-group --region=us-east4 \
  --format='value(spec.template.spec.template.spec.containers[0].env)' | tr ',' '\n' | grep ARTIFACT
```

Forzar un tick del dispatcher ahora, sin esperar los 2 minutos:

```bash
gcloud scheduler jobs run ops-artifact-render-dispatch --project=efeonce-group --location=us-east4
```

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

**Cómo leer los logs del worker:** emite JSON de una línea con `"svc":"artifact-worker"`.

| Línea | Qué significa |
|---|---|
| `flag OFF — skip` | El flag está apagado **en el Job**. No renderizó. |
| `sin jobs en cola — nada que hacer` | Corrió, hizo el claim, no había trabajo. Normal. |
| `render completed` (+ `durationMs`, `pdfBytes`, `previews`) | Éxito. |
| `render failed (gobernado)` (+ `code`) | Rechazo **con estado guardado**: el contenedor sale **0 a propósito** — el fallo vive en la base, no en Cloud Run. |
| `[artifact-worker] fallo no gobernado:` | **Bug del worker.** Exit ≠ 0 → Sentry, dominio `commercial`, tag `source=artifact_worker`. Escala. |

Del dispatcher verás `[render-dispatch] ejecución lanzada …`, `[render-dispatch] N job(s) pospuesto(s)
este tick: …` y `[render-dispatch] job … cerrado por deadline vencido en cola`. **Ningún job se descarta
en silencio**: si lo pospuso, está en el log.

**Una lista de ejecuciones vacía no significa que esté roto.** Significa que nadie encoló trabajo. Un Job
no consume nada mientras no se ejecuta.

### 4. Ejecutar un job a mano (smoke o replay dirigido)

```bash
gcloud run jobs execute artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=RENDER_JOB_ID=prnd-... --wait
```

Con `RENDER_JOB_ID` el worker **no hace claim de la cola**: toma ese job específico. Úsalo para reproducir
un fallo puntual sin esperar al dispatcher. **No cambia ninguna regla**: aplica exactamente los mismos
gates.

Equivalente local (el mismo código, contra el proxy en 15432):

```bash
RENDER_JOB_ID=prnd-... npx tsx --require ./scripts/lib/server-only-shim.cjs services/artifact-worker/main.ts
```

> ⚠️ `--update-env-vars` en un `execute` afecta **sólo esa ejecución**. **No lo uses para prender o apagar
> el flag** — eso se hace por `deploy.sh` (ver "Prender y apagar").

### 5. Reintentar un job fallido

El reintento es **del dominio**, no de Cloud Run (el Job tiene `max-retries=0` a propósito). Se hace con
el command canónico:

```bash
pnpm staging:request POST "/api/commercial/proposals/prop-.../render-jobs/prnd-.../retry" '{"ownerOrgId":"org-2df565fb-..."}'
```

**Se rechaza el reintento** (`409 proposal_render_conflict`) si el fallo **no es reintentable**
(`audience_violation`, `accessibility_unsupported`, `semantic_rejected`, `size_rejected`,
`geometry_rejected`, `manifest_drift`): el mismo manifiesto produciría el mismo rechazo. Ahí hay que
**corregir el plan o la evidencia y pedir un render nuevo**.

Un job pasa a `dead_letter` cuando agota sus intentos (`attempts >= max_attempts`, por defecto **3**) **o**
cuando su fallo no es reintentable.

### 6. Desplegar el worker

```bash
ENV=staging bash services/artifact-worker/deploy.sh
```

Qué hace, en orden:

1. Construye la imagen en Cloud Build (base `mcr.microsoft.com/playwright:v1.59.1`, **pinneada**).
2. **La imagen se prueba a sí misma** (`--selftest`): catálogo completo + checksums de las 13 fuentes +
   Chromium + un render de prueba, **dentro de la imagen recién construida**. Si falla, **no hay deploy**.
3. Despliega el Job (2 vCPU, 2 GiB, timeout 900 s, `--tasks=1 --parallelism=1 --max-retries=0`).
4. Concede `roles/run.invoker` al dispatcher sobre el Job.
5. **Verifica que el SHA desplegado sea el SHA que construiste.** Si no coincide, aborta.

> **Producción todavía no.** El script acepta `ENV=production`, pero el rollout productivo exige sign-off
> del operador **+** integrar `artifact-worker-deploy.yml` al release control plane
> (`RELEASE_DEPLOY_WORKFLOWS`). No lo ejecutes sin eso.

---

## Qué significan las señales

En `/admin/operations` (Reliability), bajo `Commercial`. **Estado sano = 0 en las cuatro.**

| Señal | Se enciende cuando | Severidad | Qué significa |
|---|---|---|---|
| `artifact.render.queue.starvation` | Hay jobs `queued` (con deadline vigente) esperando **> 20 min** | `error` | Con el dispatcher corriendo cada 2 minutos, 20 minutos **no es lentitud: es inanición o el dispatcher está caído.** |
| `artifact.render.dead_letter` | Hay jobs en `dead_letter` en los **últimos 7 días** | `error` | Un job agotó sus reintentos o falló de forma terminal: **requiere una persona**. |
| `commercial.proposal.deadline_at_risk` | Una propuesta vence en **< 72 h** y no está lista para presentar | `error` | Si se pasa, **el proceso se pierde sin recuperación**. |
| `commercial.proposal.stuck_in_state` | Una propuesta activa lleva **> 14 días** sin movimiento | `warning` | Un bid pudriéndose en silencio. |

---

## Prender y apagar (el flag es MULTI-RUNTIME)

`ARTIFACT_RENDER_JOBS_ENABLED` se lee en **tres runtimes independientes**. Apagarlo —o prenderlo— en uno
solo NO configura el sistema.

| Runtime | Qué hace con el flag **apagado** | Fuente de verdad de la variable |
|---|---|---|
| **Vercel** (encolar) | Rechaza el enqueue con `flag_disabled` — **nadie puede pedir renders** | Variable de entorno del proyecto |
| **`ops-worker`** (dispatcher) | No despacha; registra el skip. Los jobs se quedan en `queued` **para siempre** | `services/ops-worker/deploy.sh` |
| **`artifact-worker`** (Job) | Registra `flag OFF — skip` y sale con código 0. No renderiza | `services/artifact-worker/deploy.sh` |

**Estado real hoy (2026-07-12):**

| Runtime | Staging | Production |
|---|---|---|
| Vercel | **ON** | **OFF — la variable no existe** |
| `ops-worker` | **ON** | *(servicio único compartido: ON)* |
| `artifact-worker` | **ON** | *(job único compartido: ON)* |

> **Por qué producción sigue cerrada:** `ops-worker` y `artifact-worker` son **servicios únicos** (no hay
> uno por ambiente). La puerta de producción es **el enqueue en Vercel** —que no tiene la variable— **más**
> el entitlement per-org. Abrirla exige sign-off del operador + integrar el workflow al release control
> plane.

### Apagar TODO (rollback, < 10 min)

```bash
# 1. Deja de despachar (efecto inmediato)
gcloud run services update ops-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=ARTIFACT_RENDER_JOBS_ENABLED=false

# 2. El Job no renderiza aunque lo invoquen
gcloud run jobs update artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=ARTIFACT_RENDER_JOBS_ENABLED=false

# 3. Cierra la puerta de entrada (nadie encola)
vercel env ls                                                   # confirma en qué environments está
vercel env rm ARTIFACT_RENDER_JOBS_ENABLED staging --scope efeonce-7670142f
# (Vercel NO toma env vars en caliente: requiere redeploy de ese environment)

# 4. (opcional) Para el reloj
gcloud scheduler jobs pause ops-artifact-render-dispatch --project=efeonce-group --location=us-east4
```

Los jobs en curso terminan; los encolados quedan esperando. **Nada se pierde**: la tabla es append-only y
los PDF ya generados no se borran nunca.

> 🚨 **Un cambio hecho sólo con `--update-env-vars` dura hasta el próximo deploy.** Los `deploy.sh` usan
> `--set-env-vars`, que es **destructivo**: borra cualquier variable agregada por fuera. Si el apagado (o
> el encendido) debe ser permanente, **cámbialo también en el `deploy.sh`** —es la fuente de verdad— y
> actualiza la fila en [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md).
> Ya le pasó a otro flag del repo: se prendió sólo en vivo, un deploy posterior lo borró **en silencio**,
> y el flujo quedó muerto mientras el ledger decía que estaba encendido.

### Apagar el dominio completo (no sólo el render)

Sin tocar datos, revocando el entitlement per-org:

```sql
UPDATE greenhouse_client_portal.module_assignments
   SET effective_to = CURRENT_DATE
 WHERE module_key = 'proposal_studio_v1'
   AND organization_id = 'org-2df565fb-98aa-42f7-b324-ea9a2209017f';
```

Toda la API de propuestas empieza a devolver `403 proposal_not_entitled`. El historial, la evidencia y los
assets quedan intactos.

---

## Qué NO hacer nunca

- **NUNCA prendas o apagues el flag en un solo runtime.** Son 3 e independientes. Sólo en Vercel → los
  jobs se encolan y nadie los ejecuta. Sólo en Cloud Run → nadie puede encolar.
- **NUNCA des por permanente una env var agregada a Cloud Run "a mano".** El `deploy.sh` la borra en el
  próximo deploy, en silencio. Declara en el `deploy.sh` **y** aplica en vivo si necesitas efecto inmediato.
- **NUNCA borres filas de `proposal_render_jobs` ni de `proposal_render_job_events`** — son append-only y
  un trigger lo impide. Los jobs son evidencia de qué se generó y con qué.
- **NUNCA "arregles" un job editando su manifiesto en la base.** Los campos de contrato son inmutables
  (trigger). Un plan distinto = un job nuevo. Si lo forzaras, el worker lo detectaría igual
  (`manifest_drift`) y no renderizaría.
- **NUNCA subas los reintentos de Cloud Run** (`max-retries`), ni `tasks`/`parallelism` "para que rinda
  más". El reintento es del dominio: si Cloud Run reintentara por su cuenta, el contador de intentos y el
  dead-letter dejarían de significar algo. La concurrencia se abre **con datos de carga reales**, no a ojo.
- **NUNCA ejecutes el render en el `ops-worker` ni en Vercel.** Chromium ahí bloquearía el publisher del
  outbox — y con él, todas las proyecciones reactivas de la plataforma.
- **NUNCA cambies la imagen a un tag flotante de Playwright.** La versión está pinneada porque **otro
  Chromium = otro píxel = otro artefacto**. Un test de CI lo impide.
- **NUNCA declares "listo" un cambio del worker sin ejecutarlo en Cloud Run.** Los 5 bugs del primer deploy
  (`ISSUE-121`) eran **invisibles en local por construcción**: IAM real, filesystem del contenedor,
  ejecución como root, latencia de disco, rutas del Mac del autor. El smoke real no es un trámite: es donde
  vive esa clase de bug.

---

## Problemas comunes

| Síntoma | Causa más probable | Qué haces |
|---|---|---|
| El job queda `queued` para siempre | Flag apagado en el `ops-worker`, o scheduler pausado | Revisa los 3 runtimes del flag **en la revisión activa** |
| `dispatch_error` | Permisos, o la Jobs API rechazó la ejecución | Logs del dispatcher; revisa el binding `run.invoker` de `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` sobre el Job (el `deploy.sh` lo aplica) |
| El contenedor sale con código 1 | **Bug del worker** (no un rechazo de negocio) | Sentry, dominio `commercial`, tag `source=artifact_worker` |
| El deploy falla en el paso de selftest | La imagen no tiene lo que el runtime necesita (catálogo, fuentes, Chromium) | Es el gate haciendo su trabajo: mira el log del selftest en Cloud Build |
| `manifest_drift` | El catálogo cambió después de encolar | Pide un render nuevo (el manifiesto viejo describe un artefacto que ya no existe) |
| `missing_asset` en imágenes que "sí están" | Fue una **carrera** en el gate (juzgaba sin esperar la carga) y también rutas absolutas horneadas en 2 plantillas | Ambas cerradas en `ISSUE-121` (#4 y #5) con guards permanentes (`catalog-portability.test.ts`). Si reaparece, es un bug nuevo: escala con el `failureDetail` |
| El PDF de Cloud Run se ve distinto al local | Otro Chromium u otra imagen | La imagen está pinneada. Corre `pnpm composer:visual-gate`: debe dar **cero píxeles** de diferencia contra el baseline |
| El ledger dice que el flag está ON pero nada funciona | El ledger es un SSOT **humano**; la verdad está en la revisión activa | `gcloud run jobs describe` / `services describe` + `vercel env ls` |

---

## Referencias técnicas

- Spec del pipeline: [`GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md)
- Runbook del worker (para quien toca el código): [`services/artifact-worker/README.md`](../../../services/artifact-worker/README.md)
- Worker: `services/artifact-worker/main.ts`, `Dockerfile`, `deploy.sh`, `selftest.ts`, `deploy-contract.test.ts`
- Dispatcher: `src/lib/commercial/tenders/proposals/render-dispatch.ts` · endpoint en `services/ops-worker/server.ts` · Scheduler en `services/ops-worker/deploy.sh`
- Commands y estados del job: `src/lib/commercial/tenders/proposals/render-jobs.ts`
- Señales: `src/lib/reliability/queries/commercial-proposal-signals.ts`
- Ledger de flags: [`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md)
- La bug class del primer deploy y sus lecciones: [`ISSUE-121`](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
- Decisiones y alternativas rechazadas: [`decisiones-de-diseno.md`](../../documentation/proposal-studio/decisiones-de-diseno.md)
