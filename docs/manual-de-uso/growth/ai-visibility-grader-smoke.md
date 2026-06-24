# Manual — Correr el smoke del AI Visibility Grader

> **Para que sirve:** ejecutar una corrida acotada (low-volume) del AI Visibility Grader contra los answer engines, para validar el motor end-to-end. Por defecto usa un proveedor simulado (no gasta dinero); con flags + secrets corre proveedores reales.

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

Verificar luego el detalle de un run:

```text
GET /api/admin/growth/ai-visibility/runs            # lista
GET /api/admin/growth/ai-visibility/runs/<runId>    # detalle + observaciones
```

(En staging, usar `pnpm staging:request` con la persona agente.)

## Que significan los estados

- `status=skipped` en el run → el grader esta OFF o el proveedor sin secret/flag. **Es lo esperado** sin configuracion; no es un error.
- `status=partial` → algunos proveedores respondieron y otros se saltaron/fallaron. Honesto: no se infla a "exito".
- `costGuard=true` → se corto la corrida por exceder el techo de costo del modo.

## Que no hacer

- **No** encender todos los proveedores a la vez la primera vez: prender uno, validar costo/errores, recien despues el siguiente.
- **No** poner secrets en `.env.local` para correr real en serio: viven en GCP Secret Manager (server-side).
- **No** tratar la respuesta del proveedor como verdad: es evidencia; el score/reporte son un paso posterior (TASK-1227).

## Problemas comunes

- **"Tenant lookup failed" / fallo de auth en staging:** ADC de gcloud vencida → `gcloud auth login` + `gcloud auth application-default login` + reintentar.
- **Todo `skipped` con flags ON:** falta el secret del proveedor en Secret Manager (o el nombre no coincide con `*_API_KEY` / `*_SECRET_REF`).
- **Senales en `/admin/operations`:** el modulo `growth` muestra error_rate / latency_p95 / cost_budget / skipped. Con grader OFF estan en verde (esperado).

## Referencias tecnicas

- Funcional: [ai-visibility-grader.md](../../documentation/growth/ai-visibility-grader.md)
- Arquitectura + invariantes: [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- Codigo: `src/lib/growth/ai-visibility/**`, smoke `scripts/growth/ai-visibility-smoke.ts`.
