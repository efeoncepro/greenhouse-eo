# Manual — Correr el AI Visibility Grader (smoke + endpoint)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.13 · **Ultima actualizacion:** 2026-07-05 por Codex (TASK-1327 production handoff + TASK-1341 DataForSEO guard)
>
> **Para que sirve:** ejecutar una corrida acotada (low-volume) del AI Visibility Grader contra los answer engines, para validar el motor end-to-end. Por defecto usa un proveedor simulado (no gasta dinero); con flags + secrets corre proveedores reales. Dos caminos: el **CLI** (`pnpm growth:ai-visibility:smoke`, local/dev) y el **endpoint interno** (`/api/admin/growth/ai-visibility/runs`, mismo primitive, apto staging).

## Estado actual del rollout (2026-06-29)

- **staging:** grader ON. El worker efectivo (`ops-worker-00418-2m6`) tiene `GRADER`, OpenAI, Anthropic, Perplexity, Gemini, Google AI Overview, probes, agentic readiness, entity probes, email, HubSpot y re-grade ON. Gemini usa **Gemini 3** (`gemini-3-flash-preview` via Vertex grounding; ajustable con `GREENHOUSE_GEMINI_GROUNDED_MODEL` sin redeploy).
- **Google AI Overview / AI Mode (TASK-1265):** ON en staging via DataForSEO. Usa `DATAFORSEO_API_LOGIN` + `DATAFORSEO_API_PASSWORD_SECRET_REF`; no scrapea Google directo. Si Google/DataForSEO no devuelve bloque AI Mode, la observation queda `skipped:no_ai_overview_block`, no `succeeded` vacío. DataForSEO reporta costo por request, no por tokens.
- **ejecución async (TASK-1234): ON en staging.** `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED=true` (environment `staging`). El endpoint **encola** el run (responde HTTP 202 + runId) y el worker Cloud Run (`ops-worker`, scheduler `ops-growth-grader-drain` cada 5 min) lo ejecuta sin límite de tiempo. Esto es lo único que permite correr runs `full`/`internal_audit` multi-provider (que antes morían por el timeout de la función Vercel). Verificado end-to-end: un run `full` real corrió ~12 min sin timeout. Con la flag OFF el endpoint vuelve a ejecutar inline (sólo `light`/OpenAI cabe).
- **producción:** OFF (follow-up pesado: migración `greenhouse_growth` + capabilities seed vía release control plane develop→main + env prod + sign-off). El worker es compartido staging+prod, pero el drain hace **no-op prod-safe** mientras el grader esté OFF en prod.
- **Perplexity:** ON en el worker de staging desde 2026-06-29 (`GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED=true`, revision `ops-worker-00418-2m6`) y persistido en `services/ops-worker/deploy.sh` con default staging ON / prod OFF. Pendiente recomendado: smoke async low-volume con `onlyProviders:['perplexity']` para confirmar observation nueva drenada por el worker.
- **Fix-It Artifacts (TASK-1269):** `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` ON en Vercel staging y prod OFF. Pendiente antes de entregar a prospecto/prod: smoke funcional por token público y run admin con reporte real + revisión copy/legal.
- **Re-grade recurrente (TASK-1270):** staging/develop ON (`GROWTH_AI_VISIBILITY_REGRADE_ENABLED=true`) con Cloud Scheduler `ops-growth-grader-regrade` habilitado diario `0 8 * * *` (`America/Santiago`). Produccion OFF/paused. Smoke manual 2026-06-29 termino `skipped=no_due_profiles` porque no hay perfiles opt-in/due; no hubo costo.
- **Reporte público final (TASK-1331):** producción ya sirve `modelVersion=1.1.0` con `model.viewFacts`; el hub `efeonce-think` en `https://think.efeoncepro.com/brand-visibility/r/<token>` es el reporte final user-facing. `mock-token` sólo existe localmente; producción exige un token real `grt-*`.
- **Lead magnet Think / Brand Visibility (TASK-1327):** producción ya puede aceptar submit gobernado, crear run por consumer reactivo y abrir el informe por `status_url` desde `https://think.efeoncepro.com/brand-visibility`. Si el loader queda en cola, no asumir UI: revisar `form_submission` → outbox `growth.forms.submission_accepted` → consumer `growth_grader_run_from_submission` → `grader_lead`/`grader_run` → status CORS.
- **Producción / Google AI Overview (TASK-1341):** el modo público `light` solicita `google_ai_overview`; los reportes del 2026-07-05 pueden quedar `partial` porque el runtime async que ejecuta es Cloud Run `ops-worker`, y la revisión detectó `skipped:missing_secret` por falta de `DATAFORSEO_API_LOGIN` en esa revisión. Vercel env solo no basta. TASK-1341 gobierna el guard/preflight para que AIO no pueda estar ON sin login + password secret ref en el worker.
- **DB auditada:** `greenhouse_growth` tiene 24 runs, 266 observations, 10 scores, 8 reports, 7 reviews, 23 probe results, 1 lead y 1 email dispatch. No hay perfiles org-bound opt-in para re-grade.
- Verdad live de flags: `vercel env ls`. Estado humano: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Antes de empezar

- Acceso a la base PostgreSQL de Greenhouse (el smoke persiste en `greenhouse_growth`). Local: `pnpm pg:connect` levanta el proxy.
- Para **proveedores reales**: secrets en GCP Secret Manager (`greenhouse-openai-api-key`, `greenhouse-anthropic-api-key`, `greenhouse-perplexity-api-key`, `greenhouse-dataforseo-api-password`; Gemini via Vertex/WIF) + `gcloud auth login` y `gcloud auth application-default login` vigentes.
- Los flags nacen en OFF (ver `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`).

## Paso a paso

### 1. Smoke con proveedor simulado (sin secretos, recomendado primero)

```bash
pnpm growth:ai-visibility:smoke
```

Si el grader esta OFF (default) usa el fake adapter deterministico. Corre las marcas fixture (Efeonce + un control neutro) y muestra, por marca, el run, el estado y el conteo de observaciones. Sirve para confirmar que el pipeline (prompt pack → adapter → observaciones → persistencia → senales) funciona.

Forzar fake aunque el grader este ON:

```bash
GROWTH_SMOKE_FAKE=1 pnpm growth:ai-visibility:smoke
```

### 2. Smoke con un proveedor real (uno por vez)

Encender SOLO el master + un proveedor (empezar por OpenAI):

```bash
GROWTH_AI_VISIBILITY_GRADER_ENABLED=true \
GROWTH_AI_VISIBILITY_OPENAI_ENABLED=true \
pnpm growth:ai-visibility:smoke
```

Smoke solo con Google AI Overview / AI Mode (DataForSEO):

```bash
GROWTH_AI_VISIBILITY_GRADER_ENABLED=true \
GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true \
pnpm growth:ai-visibility:smoke
```

Para una prueba estrictamente local con Secret Manager, define además `GCP_PROJECT=efeonce-group` si tu ADC no trae project por defecto. No incluyas el password DataForSEO en `.env.local`; debe resolverse por `DATAFORSEO_API_PASSWORD_SECRET_REF`.

**Diagnóstico de `google_ai_overview` / DataForSEO en async:** cuando el run se ejecuta por `ops-worker`,
verifica las env vars del servicio Cloud Run, no sólo Vercel:

```bash
gcloud run services describe ops-worker \
  --project=efeonce-group \
  --region=us-east4 \
  --format='value(spec.template.spec.containers[0].env)'
```

En las observations, `status=skipped` + `reason=missing_secret` significa drift de configuración del
runtime que ejecutó el run. No equivale a "Google no mostró AI Overview". Un `skipped:no_ai_overview_block`
sí es una degradación honesta válida: DataForSEO respondió, pero no encontró bloque AI Overview para
esa consulta. Para cerrar TASK-1341, un smoke provider-scoped debe terminar en `succeeded` o
`skipped:no_ai_overview_block`, nunca en `missing_secret`.

### 3. Usar el endpoint interno (mismo primitive — apto staging)

El endpoint es un cliente fino del mismo `executeGraderRun`; no reimplementa nada. Requiere sesión interna + capability `growth.ai_visibility.{observation.read,run.execute}` (grant: internal ∪ EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN). En staging va con `pnpm staging:request` (bypass SSO + agent auth):

```bash
# Listar runs (capability observation.read)
pnpm staging:request /api/admin/growth/ai-visibility/runs

# Ejecutar un run real (capability run.execute) — light = barato (OpenAI, perplexity/gemini skip)
pnpm staging:request POST /api/admin/growth/ai-visibility/runs \
  '{"brandName":"Efeonce","websiteUrl":"https://efeoncepro.com","market":"Chile","locale":"es-CL","category":"marketing y diseño","mode":"light","runKind":"smoke","competitorsDeclared":["Cebra"]}'

# Detalle de un run + observaciones
pnpm staging:request /api/admin/growth/ai-visibility/runs/<runId>
```

Campos del body POST: `brandName`/`market`/`locale`/`category` (requeridos), `mode` (`light`/`full`/`internal_audit`), `runKind` (default `smoke`), `websiteUrl`/`competitorsDeclared`/`onlyProviders`/`discoveryOnly`/`idempotencyKey` (opcionales). Respuesta: `{ run, observationCount, idempotentHit, costGuardTripped }`. Con `idempotencyKey` repetido NO reejecuta (devuelve el run previo).

### 4. Puntuar un run (normalización + score — TASK-1227)

Una vez que un run tiene observaciones, se computa el score (determinista, recomputable):

```bash
# Computar/persistir el score de un run (capability run.execute, idempotente)
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/score

# El detalle del run ya incluye findings + score
pnpm staging:request /api/admin/growth/ai-visibility/runs/<runId>
```

Respuesta del POST: `{ score, findingCount, publicSafe }`. El `score` interno trae las 7 dimensiones con reasons + status; el `publicSafe` es el resumen sin texto crudo. Recomputar el mismo run = mismo score (no duplica).

**Enriquecimiento de prosa (opcional, default OFF):** sentiment / categoryAssociations / messageDriftClaims los llena un paso de IA aislado solo si `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED=true` (+ secret Anthropic). Sin el flag, esos campos quedan en `unknown`/`[]` y `message_alignment` no puntúa (honesto).

## Ejecución async — worker Cloud Run (TASK-1234)

Los runs lentos/grandes (`full`/`internal_audit` multi-provider, Gemini 3) **no caben** en el
timeout de la función Vercel del endpoint. Para esos, la ejecución corre en un **worker async**
Cloud Run (`ops-worker`, endpoint `POST /growth/grader/drain`, disparado por Cloud Scheduler
`ops-growth-grader-drain` cada 5 min). El endpoint admin **encola** el run (`202` + `runId`) y el
worker lo ejecuta sin límite de duración; el `GET /runs/[runId]` es el **poll** del progreso.

Gated por `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` (default OFF → el endpoint ejecuta
inline como antes; sólo `light`/OpenAI cabe). **En staging ya está APLICADO y verificado
(2026-06-24)** — los pasos quedan como referencia (y como receta para producción):

1. ✅ **Deploy del worker** — hecho vía CI `ops-worker-deploy.yml` (push a `develop`). Crea el scheduler `ops-growth-grader-drain` (*/5), monta flags (staging ON / prod OFF) + secret refs OpenAI/Anthropic, sube el `TIMEOUT` del worker a 3600s. Break-glass manual: `ENV=staging bash services/ops-worker/deploy.sh`.

2. ✅ **Cutover async** — hecho: `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED=true` en el environment `staging` (`vercel env add ... staging`) + redeploy del portal.

3. ✅ **Verificado** — run `full` real EO-GRUN-00011 → `202` + runId → el worker lo ejecutó async **~12 min sin timeout** → `partial` con 48 observations (OpenAI 12/12, Anthropic 9+3, Gemini 11+1, Perplexity 12 skipped por flag OFF); las observations crecieron incrementalmente (23→48 vía `GET /runs/[runId]`); el huérfano EO-GRUN-00006 fue recuperado a `failed`; signals `run_execution_lag`/`run_stuck_running` en `0`.

4. **Disparo manual del drain** (sin esperar el cron, para diagnóstico):

   `gcloud scheduler jobs run ops-growth-grader-drain --project=efeonce-group --location=us-east4`

- **Producción:** fuera de scope (release control plane develop→main). El worker es compartido staging+prod, pero el drain hace **no-op prod-safe** (`isGraderEnabled()` OFF en prod → cero queries, no requiere que `greenhouse_growth` exista en prod).
- **Revert (<5 min):** `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED=false` → el endpoint vuelve a inline para `light`.
- **Recovery de huérfanos:** el drain corre `recoverStuckRunningRuns` antes de drenar — un run colgado en `running` > 90 min se finaliza con la evidencia ya persistida (signal `run_stuck_running`).

## Re-grade recurrente / Scheduler (TASK-1270)

Este flujo vuelve a correr el grader para perfiles de cliente que aceptaron monitoreo recurrente. No sirve para leads one-shot ni para forzar un analisis manual: para eso usa el endpoint admin de runs.

### Antes de tocarlo

- Confirmar que la migracion `20260629103000000_task-1270-recurring-regrade` esta aplicada (`pnpm pg:connect:status` debe decir que no hay migraciones pendientes).
- Confirmar flags live en el worker:

```bash
gcloud run services describe ops-worker \
  --project=efeonce-group \
  --region=us-east4 \
  --format='value(spec.template.spec.containers[0].env)'
```

- Confirmar Scheduler:

```bash
gcloud scheduler jobs describe ops-growth-grader-regrade \
  --project=efeonce-group \
  --location=us-east4
```

Estado esperado en staging: `state: ENABLED`, schedule `0 8 * * *`, timezone `America/Santiago`. Estado esperado en produccion: pausado/off hasta release control plane + budget sign-off.

### Smoke seguro sin costo

Ejecuta manualmente el Scheduler:

```bash
gcloud scheduler jobs run ops-growth-grader-regrade \
  --project=efeonce-group \
  --location=us-east4
```

Luego revisa logs del worker:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="ops-worker" AND textPayload:"/growth/grader/regrade"' \
  --project=efeonce-group \
  --limit=20 \
  --format='value(textPayload)'
```

Si no hay perfiles opt-in/due, el resultado sano es:

```text
claimed=0 enqueued=0 failed=0 skipped=no_due_profiles
```

Eso prueba Scheduler + endpoint + flag sin gastar en providers.

### E2E real con un perfil opt-in

No activar opt-in al azar. Usa solo una organizacion cliente contratada para AEO y con aprobacion del operador.

1. Identificar un `grader_profile` con `organization_id` y modulo `ai_visibility_v1` contratado (`module_assignments.metadata_json.aeo_tier='contracted'`).
2. Activar opt-in gobernado para ese perfil: `recurring_regrade_enabled=true`, `recurring_regrade_cadence='monthly'`, `recurring_regrade_next_at <= now()`.
3. Ejecutar `gcloud scheduler jobs run ops-growth-grader-regrade ...`.
4. Verificar logs: `claimed=1`, `enqueued=1`, `failed=0`.
5. Esperar el drain async (`ops-growth-grader-drain`) o dispararlo manualmente si estas en ventana de smoke.
6. Confirmar que el run recurrente pasa por `pending -> running -> terminal` (`succeeded|partial|failed` honesto) y que el reporte muestra tendencia si hay un run previo comparable.
7. Revisar signals en `/admin/operations`: `growth.ai_visibility.regrade_lag`, `growth.ai_visibility.regrade_cost`, `growth.ai_visibility.regrade_stale_profiles`.
8. Documentar runId, perfil, costo observado y decision de rollback/continuar en `Handoff.md` y la task.

### Revert rapido staging

1. Apagar el flag del worker (`GROWTH_AI_VISIBILITY_REGRADE_ENABLED=false`) o redeploy con el default off.
2. Pausar el Scheduler:

```bash
gcloud scheduler jobs pause ops-growth-grader-regrade \
  --project=efeonce-group \
  --location=us-east4
```

3. Verificar que un run manual del Scheduler ya no encola perfiles.

### Que no hacer

- No re-gradear perfiles publicos/lead magnet one-shot.
- No habilitar produccion sin release control plane, budget sign-off y un E2E staging con perfil opt-in.
- No cambiar la cadencia masivamente sin revisar costo mensual esperado.
- No crear un cron paralelo en Vercel: este flujo es Cloud Scheduler + ops-worker.

## Que significan los estados

- `status=skipped` en el run → el grader esta OFF o el proveedor sin secret/flag. **Es lo esperado** sin configuracion; no es un error.
- `status=partial` → algunos proveedores respondieron y otros se saltaron/fallaron. Honesto: no se infla a "exito".
- `costGuard=true` → se corto la corrida por exceder el techo de costo del modo.
- **scoreStatus** (score, TASK-1227): `completed` (score válido) · `insufficient_data` (sin cobertura mínima → no se emite puntaje, nunca falso) · `review_required` (lenguaje riesgoso o sentimiento negativo poco confiable → revisión humana). `auto_releasable` siempre false en esta etapa.
- **dimensión con `score: null`** → no hubo evidencia para esa dimensión; queda excluida del promedio (no se inventa 0 ni 100).

## Que no hacer

- **No** encender todos los proveedores a la vez la primera vez: prender uno, validar costo/errores, recien despues el siguiente.
- **No** poner secrets en `.env.local` para correr real en serio: viven en GCP Secret Manager (server-side).
- **No** tratar la respuesta del proveedor como verdad: es evidencia. El score (TASK-1227) se deriva con reglas deterministas; el reporte visual es un paso posterior.

## Leer el reporte de un run (TASK-1235)

Una vez que un run tiene puntaje persistido (corriste `POST /runs/[runId]/score`), puedes leer su **reporte** derivado:

```bash
pnpm staging:request /api/admin/growth/ai-visibility/runs/<runId>/report --pretty
```

Devuelve `{ report, publicReport }`:

- `report` = vista **interna** completa: `gate` (con `reason` + `nextAction`), `headline` (KPI dominante), `dimensions` (7, cada una con `score`/`status`/`severity`/`explainer` + `recommendation`), `recommendations` priorizadas, `primaryGap` + `recommendedMotion`, `competitiveSov`, `sourceTypeSummary`, **`providerPresence`** (presencia por motor) y `provenance`.
- `publicReport` = DTO **público seguro**: headline/score/findings/competidores top/fuentes/disclaimer, `providerPresence` agregado (conteos por motor), `citationInsight`, `citationSourceBreakdown`, `categoryTaxonomySummary`, `sentimentSummary`, `positionSummary`, `trend` y readiness public-safe si hubo probes. No incluye texto crudo de motores, prompts, `providerFindings`, accuracy findings, reasons internos ni dominios crudos de citación.

Requiere la capability `growth.ai_visibility.report.read` (roles internos / `efeonce_admin` / `ai_tooling_admin`). Si el run no tiene score aún → `404 score_not_found` (corre `score` primero).

Verificación local (sin endpoint), contra un run real con score:

```bash
# levanta el proxy + corre el builder vía readGraderReport sobre el run más reciente con score
# (patrón scripts/_dryrun-report.ts: runGreenhousePostgresQuery + readGraderReport)
```

## Public delivery, review gate y lectura publica

La entrega publica es write-side: el worker finaliza el run y decide `ready`, `in_review` o `unavailable`. Un GET publico nunca publica ni dispara email/HubSpot.

```bash
# Poll publico por pollToken o submissionId
pnpm staging:request /api/public/growth/ai-visibility/run/<handle> --pretty

# Leer snapshot publico por token no enumerable
pnpm staging:request /api/public/growth/ai-visibility/report/<reportToken> --pretty
```

Estados sanos:

- `queued` / `processing`: run pendiente o corriendo.
- `ready`: existe snapshot publico y el response incluye `reportToken`.
- `in_review`: score `review_required`; espera aprobación humana.
- `unavailable`: fallo, `insufficient_data`, rechazo humano o run no publicable.

Review humano:

```bash
# Cola de reviews pendientes
pnpm staging:request /api/admin/growth/ai-visibility/reviews --pretty

# Aprobar un run review_required y publicar snapshot
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/review/approve \
  '{"reason":"Revisado contra evidencia y apto para release"}'

# Rechazar y dejar unavailable
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/review/reject \
  '{"reason":"Confusion de entidad no publicable"}'
```

Regla: `review_required` solo publica con aprobación humana sobre la misma `score_version`; `insufficient_data` no se publica nunca.

### Verificar señales del reporte público completo (TASK-1328)

Después de desplegar el cambio de TASK-1328, validar con un **token nuevo** generado post-deploy (los snapshots antiguos son `new-runs-only` por defecto):

```bash
pnpm staging:request /api/public/growth/ai-visibility/report/<newReportToken> --pretty
```

Checks mínimos sobre el JSON:

- `model.agenticAxisScore` coincide con `model.readiness.agentic.overallScore` cuando readiness agentic fue medida.
- `model.levels` mantiene `null` como cobertura/sin dato; `Be Actionable` usa readiness agentic, no el score de percepción.
- `model.engineSnapshot[]` trae `present` y `resolved`; `resolved=0` se trata como "sin respuestas evaluables", no como "sin mención".
- `model.citationSourceBreakdown.domains[]` muestra dominios agregados/top-N, sin URLs completas ni texto de providers.
- `model.categoryTaxonomySummary.status='unknown'` o `categories=[]` no debe forzar narrativa pública.
- El payload público no contiene `providerFindings`, `accuracyFindings`, prompts, raw provider text, full citation URLs ni reasons internos.

Luego validar el hub `efeonce-think` contra el mismo token: secciones `report-engine-coverage`, `report-source-evidence`, `report-category-association`, `report-readiness` y `report-ladder`, desktop + mobile 390 con `scrollWidth <= clientWidth`.

### Verificar reporte público final (TASK-1331)

Usa este smoke cuando el cambio toque el contrato headless, el render de `efeonce-think`, email/HubSpot `report_url`, PDF público o una promoción mockup→runtime del informe.

1. Usa un token real de snapshot público. En producción la URL final es:

```text
https://think.efeoncepro.com/brand-visibility/r/<token-real>
```

No uses `mock-token` contra producción: sólo sirve para fixture/local.

2. Verifica el payload público de Greenhouse:

```bash
curl -sS "https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/report/<token-real>" \
  | jq '{
      modelVersion,
      hasViewFacts: (.model.viewFacts != null),
      engineCount: (.model.viewFacts.engineCoverage.providers | length),
      citationTotal: .model.viewFacts.citationTotals.totalCitations,
      competitorRows: (.model.viewFacts.competitiveBenchmark.rows | length),
      rawProviderResponseLeak: (tostring | contains("rawProviderResponse")),
      answerTextLeak: (tostring | contains("answer_text")),
      promptTextLeak: (tostring | contains("prompt_text"))
    }'
```

Esperado para el contrato final: `modelVersion="1.1.0"`, `hasViewFacts=true`, no leaks. En snapshots antiguos, algunos facts pueden degradar a `null` o `engineCount=0`; eso es compatible si no hay 500 y el render muestra ausencia de dato sin inventar.

3. Desde el repo `efeonce-think`, verifica el render final en desktop/laptop/mobile:

```bash
node scripts/verify-report.mjs \
  "https://think.efeoncepro.com/brand-visibility/r/<token-real>" \
  task1331-prod-final
```

Esperado: HTTP 200 en 1440/1280/390, `scrollWidth == clientWidth`, sin leaks visibles ni claves internas. Si `category` viene `unknown` o sin categorías, la sección de categoría puede no renderizar; eso es correcto.

Regla de diagnóstico: si el render necesita calcular Share of Model, benchmark, readiness, sentimiento, totales de citas o next step localmente, el contrato está incompleto. Agrega el fact en Greenhouse y sólo después simplifica el renderer.

## Generar Fix-It Artifacts (TASK-1269) — staging ON, smoke funcional pendiente

Los Fix-It Artifacts se generan on-demand desde un reporte/snapshot existente y los probes del run. No llaman LLM, no escriben en el sitio del prospecto y quedan detrás de `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED`.

**Admin por run** (requiere sesión interna + capability `growth.ai_visibility.fix_it.generate`):

```bash
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/fix-it --pretty
```

**Público por token** (mismo token no enumerable del snapshot):

```bash
pnpm staging:request /api/public/growth/ai-visibility/report/<reportToken>/fix-it --pretty
```

Respuesta esperada: `{ runId, artifacts[] }`, con `kind`, `filename`, `mimeType`, `content`, `publicSafe`, `source`, `derivedFrom` y `pendingFields`.

Validación antes de considerar prod:

1. Confirmar `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED=true` en Vercel staging y OFF en prod.
2. Generar por run admin y por token público para el mismo snapshot.
3. Confirmar que el flag OFF responde no disponible/404 en un environment controlado.
4. Parsear el artifact `json_ld_starter` como JSON y validar contra schema.org/Rich Results.
5. Revisar que `llms.txt` esté formado y que los briefs no prometan rankings ni contengan evidence/reasons internos.
6. Si pasa copy/legal, documentar el run/token usado y recién ahí considerar prod vía EPIC-020.

## Probes de readiness y evidencia en DB

Los probes corren best-effort despues del run de percepción. Fallar o saltar un probe no rompe el run; `score=null` significa "no medido", no 0. El 0 medido sí es gap real.

```sql
SELECT axis, probe_kind, status, score, reason
FROM greenhouse_growth.grader_probe_results
WHERE run_id = '<run_uuid>'
ORDER BY axis, probe_kind;
```

Ejes esperados:

- `structural`: robots IA, JSON-LD, llms.txt, sitemap, CWV (CWV puede quedar `skipped/no_headless`).
- `agentic`: `.well-known/mcp`, API discoverability, potentialAction, DOM semantics, WebMCP (WebMCP puede quedar `skipped/no_headless`).
- `entity`: Knowledge Graph, Wikidata/Wikipedia, Reddit UGC. KG requiere secret; Reddit puede degradar por 403/limit.

## HubSpot handoff

El handoff corre solo para leads consentidos y reportes publicables. Runs de portal/operador sin `grader_lead` hacen skip sano.

```bash
# Reintentar handoff de un run publicable con lead consentido
pnpm staging:request POST /api/admin/growth/ai-visibility/runs/<runId>/lead-handoff --pretty
```

Checks:

- `GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED=true` en Vercel y ops-worker.
- `grader_leads.consent=true`.
- Score/report publicable (`completed` o partial publicable; no `insufficient_data`).
- `hubspot_synced_at` queda seteado en `grader_leads` tras exito.

## Entrega del informe por email (TASK-1250) — rollout + smoke

El email al lead se dispara write-side cuando se publica el snapshot (reactive consumer `growth_ai_visibility_report_email`, lane `ops-reactive-growth`), NUNCA on-read. Marca **Efeonce**, adjunto = PDF de TASK-1273.

**Rollout (dual-location, espeja el handoff):**

- El WRITE (`dispatchAiVisibilityReportEmail`) corre en el **ops-worker**: redeploy con `bash services/ops-worker/deploy.sh` (o push a develop → GitHub Actions) — el flag `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED` queda declarativo en `deploy.sh` (staging ON / prod OFF).
- Verificar el flag en el servicio: `gcloud run services describe ops-worker --region us-east4 --project efeonce-group --format=json | grep REPORT_EMAIL`.
- Logo del email: el wordmark blanco Efeonce se sirve desde el **bucket GCS público** (`gs://efeonce-group-greenhouse-public-media-{staging,prod}/emails/efeonce-wordmark-white.png`), NO desde `/branding/pdf` del portal (ese path solo existe en el branch desplegado). Si el logo no aparece, confirmar que el objeto está en el bucket del environment.

**Smoke E2E (staging):**

1. Tener un run con lead consentido + snapshot publicado (`public_delivery_state='ready'`). Para un envío real, apuntar el email del lead a un inbox que controles.
2. Encolar: `requestAiVisibilityReportEmail({ runId, trigger: 'admin_resend' })` (o publicar el snapshot, que lo dispara solo).
3. Esperar el drain (Cloud Scheduler: `ops-outbox-publish` cada 2 min → `ops-reactive-growth` cada 5 min).
4. Verificar: `greenhouse_growth.grader_report_email_dispatches.status='sent'` (1 fila, sin doble-envío) + `greenhouse_notifications.email_deliveries.has_attachments=true` + el correo recibido (marca Efeonce + PDF). Re-smoke de un dispatch ya enviado: `UPDATE … SET status='failed'` → re-encolar (el claim reclama failed).
5. Signal: `growth.ai_visibility.report_email_failed` debe quedar en steady (sin failed >15 min).

**Prod:** gated por release control plane develop→main + EPIC-020 + sign-off legal/from-address del lead magnet (TASK-1246).

## Auditoria rapida DB/runtime

Usa esto cuando sospeches drift entre docs, worker y base:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'greenhouse_growth'
ORDER BY table_name;

SELECT status, mode, run_kind, run_source, cost_attribution, count(*) AS runs, round(sum(coalesce(estimated_cost_usd,0))::numeric, 4) AS cost
FROM greenhouse_growth.grader_runs
GROUP BY status, mode, run_kind, run_source, cost_attribution
ORDER BY runs DESC;

SELECT provider, status, count(*)
FROM greenhouse_growth.provider_observations
GROUP BY provider, status
ORDER BY provider, status;

SELECT
  count(*) FILTER (WHERE recurring_regrade_enabled) AS opt_in_profiles,
  count(*) FILTER (WHERE recurring_regrade_enabled AND recurring_regrade_next_at <= now()) AS due_profiles,
  count(*) FILTER (WHERE organization_id IS NOT NULL) AS org_bound_profiles
FROM greenhouse_growth.grader_profiles;
```

Runtime live del worker:

```bash
gcloud run services describe ops-worker \
  --project=efeonce-group \
  --region=us-east4 \
  --format='value(status.latestReadyRevisionName,spec.template.spec.containers[0].env)'
```

La auditoria del 2026-06-29 encontro primero `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED=false` en el worker aunque Vercel staging tenia el flag registrado. Ese drift quedo corregido con revision `ops-worker-00418-2m6` (`true`) y `deploy.sh` persistente; para provider efectivo async, sigue mandando el worker.

## Problemas comunes

- **"Tenant lookup failed" / fallo de auth en staging:** ADC de gcloud vencida → `gcloud auth login` + `gcloud auth application-default login` + reintentar.
- **Todo `skipped` con flags ON:** falta el secret del proveedor en Secret Manager (o el nombre no coincide con `*_API_KEY` / `*_SECRET_REF`).
- **Senales en `/admin/operations`:** el modulo `growth` muestra error_rate / latency_p95 / cost_budget / skipped. Con grader OFF estan en verde (esperado).

## Referencias tecnicas

- Funcional: [ai-visibility-grader.md](../../documentation/growth/ai-visibility-grader.md)
- Arquitectura + invariantes: [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- Codigo: `src/lib/growth/ai-visibility/**`, smoke `scripts/growth/ai-visibility-smoke.ts`.

## Delta 2026-07-11 — TASK-1390 (pipeline v2)

- Los findings/scores nuevos usan `normalized_finding_v2` / `ai_visibility_score_v2`: `sourceTypes` ahora se clasifican determinísticamente por dominio (owned same-site + listas curadas) → `citation_quality` puntúa de verdad (antes 0 estructural, ISSUE-120). Los runs viejos conservan sus filas v1 (conviven); un re-score produce la versión nueva sin tocar la vieja.
- Cada finding lleva `proseExtraction {ran,status,provider}`: si `sentiment` sale `unknown`, el status dice POR QUÉ (`disabled`=flag OFF esperado; `not_configured`/`provider_error`/`schema_invalid`=degradación real → señal `growth.ai_visibility.prose_extraction_degraded` en `/admin/operations`).
- Un throttle de cuota (Vertex `RESOURCE_EXHAUSTED`) ahora clasifica `rate_limited` y reintenta con backoff — un `provider_error` genérico ya no lo enmascara.
