# Manual — Correr el AI Visibility Grader (smoke + endpoint)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4 · **Ultima actualizacion:** 2026-06-24 por Claude (TASK-1234, ejecución async)
>
> **Para que sirve:** ejecutar una corrida acotada (low-volume) del AI Visibility Grader contra los answer engines, para validar el motor end-to-end. Por defecto usa un proveedor simulado (no gasta dinero); con flags + secrets corre proveedores reales. Dos caminos: el **CLI** (`pnpm growth:ai-visibility:smoke`, local/dev) y el **endpoint interno** (`/api/admin/growth/ai-visibility/runs`, mismo primitive, apto staging).

## Estado actual del rollout (2026-06-24)

- **staging:** `GROWTH_AI_VISIBILITY_GRADER_ENABLED` + `_OPENAI_ENABLED` + `_ANTHROPIC_ENABLED` + `_GEMINI_ENABLED` **ON**. El endpoint corre proveedores reales (OpenAI/Anthropic/Gemini). Gemini usa **Gemini 3** (`gemini-3-flash-preview` vía Vertex grounding; ajustable con `GREENHOUSE_GEMINI_GROUNDED_MODEL` sin redeploy). Costo Gemini ~$0.016/marca (light, el más barato del set).
- **producción:** OFF (follow-up pesado: migración `greenhouse_growth` + capabilities seed vía release control plane develop→main + env prod + sign-off).
- **Perplexity:** OFF (sin cliente con grounding/creds aún).
- Verdad live de flags: `vercel env ls`. Estado humano: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Antes de empezar

- Acceso a la base PostgreSQL de Greenhouse (el smoke persiste en `greenhouse_growth`). Local: `pnpm pg:connect` levanta el proxy.
- Para **proveedores reales**: secrets en GCP Secret Manager (`greenhouse-openai-api-key`, `greenhouse-anthropic-api-key`; Perplexity/Gemini cuando haya creds) + `gcloud auth login` y `gcloud auth application-default login` vigentes.
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
inline como antes; sólo `light`/OpenAI cabe). Rollout (operador):

1. **Deploy del worker** (crea el scheduler + monta flags/secrets + sube el timeout del worker a 3600s):

   `ENV=staging bash services/ops-worker/deploy.sh`

2. **Prender el cutover async** (Preview/develop) + los flags de provider que correspondan, y redeploy del portal:

   `vercel env add GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` (valor `true`, Preview)

3. **Verificar:** encolar un run `full` (Gemini 3) por el endpoint → respuesta `202` + `runId`; en `GET /runs/[runId]` ver el `status` pasar a `running`/`succeeded` y las observations crecer; en `/admin/operations` los signals `growth.ai_visibility.run_execution_lag` y `run_stuck_running` en verde.

4. **Disparo manual del drain** (sin esperar el cron), para diagnóstico:

   `gcloud scheduler jobs run ops-growth-grader-drain --project=efeonce-group --location=us-east4`

- **Revert (<5 min):** `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED=false` → el endpoint vuelve a inline para `light`.
- **Recovery de huérfanos:** el drain corre `recoverStuckRunningRuns` antes de drenar — un run colgado en `running` > 90 min se finaliza con la evidencia ya persistida (signal `run_stuck_running`).

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

## Problemas comunes

- **"Tenant lookup failed" / fallo de auth en staging:** ADC de gcloud vencida → `gcloud auth login` + `gcloud auth application-default login` + reintentar.
- **Todo `skipped` con flags ON:** falta el secret del proveedor en Secret Manager (o el nombre no coincide con `*_API_KEY` / `*_SECRET_REF`).
- **Senales en `/admin/operations`:** el modulo `growth` muestra error_rate / latency_p95 / cost_budget / skipped. Con grader OFF estan en verde (esperado).

## Referencias tecnicas

- Funcional: [ai-visibility-grader.md](../../documentation/growth/ai-visibility-grader.md)
- Arquitectura + invariantes: [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- Codigo: `src/lib/growth/ai-visibility/**`, smoke `scripts/growth/ai-visibility-smoke.ts`.
