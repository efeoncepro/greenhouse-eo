# ISSUE-120 — AI Visibility Grader: `citation_quality` estructuralmente 0 + degradación silenciosa de la extracción de prosa

> **Tipo:** incidente de runtime (calidad de dato del producto grader)
> **Detectado:** 2026-07-11, durante los runs reales `EO-GRUN-00044` y `EO-GRUN-00045` (SKY Airline, `internal_audit`, `full`, 5 providers) preparando la licitación del blog SKY.
> **Ambiente:** staging (runs) + el pipeline compartido de normalización/scoring (`src/lib/growth/ai-visibility/`); afecta a **todos los clientes/marcas** que pasen por el grader.
> **Estado:** open

## Síntomas (observados en runs reales)

1. **`citation_quality = 0` en ambos runs**, pese a que las 35 observaciones traen citas reales que incluyen dominios *owned* (`skyairline.com` ×6 + subdominios) y *news* (`biobiochile.cl` ×5, `df.cl`, `latercera.com`).
2. **`sentimentLabel = 'unknown'` en 35/35 findings** y `message_alignment = null`, pese a que `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` está ON en Vercel staging (ledger delta 2026-06-30) y en el ops-worker (delta 2026-07-04, persistido en `deploy.sh`).
3. **`status = partial`** en `EO-GRUN-00045`: 34/35 obs `succeeded`, 1 obs Gemini `failed` (`provider_error`, prompt `gn03`). El reporte público no explica qué motor/prompt faltó.

## Causa raíz (verificada en código)

### Gap A — Las citas nunca traen `sourceType` → `citation_quality` no puede puntuar jamás

- Los provider adapters emiten citas con `{url, title, domain}` **sin `sourceType`** (verificado en las observations del run: `sourceTypes` agregado = `{'unknown': 33}`).
- `normalizer.ts:81` mapea `citation.sourceType ?? 'unknown'` y **no existe un clasificador dominio→tipo** en la normalización.
- `scoring/engine.ts:27` define `CREDIBLE_SOURCE_TYPES = {'owned','earned','news'}` y (línea ~199) puntúa `credible / withCitations`. Con todo en `'unknown'`, el numerador es siempre 0.
- **Consecuencia:** la dimensión `citation_quality` (peso 15 del score) es **estructuralmente 0 para cualquier marca**, y el motor de recomendaciones sugerirá "mejorar citation quality" sin haberla medido. El informe público muestra un 0 que NO es un hecho del cliente.

### Gap B — Matching de dominio del sujeto es igualdad exacta (www/subdominios no cuentan)

- `normalizer.ts:97`: `citationDomains.includes(context.subjectDomain)` — igualdad exacta de string.
- `www.skyairline.com` (websiteUrl del perfil) ≠ `skyairline.com` (como citan los motores) ≠ `blog.skyairline.com`. La señal fuerte `domainCited` (confidence 0.85) se pierde y la presencia cae al match por nombre en el excerpt.
- **Consecuencia:** presencia *owned* subestimada para cualquier marca cuyo perfil use `www.` o cuyo activo viva en subdominio.

### Gap C — La extracción de prosa degrada con causa conocida pero invisible

- El router (`prose-extraction/router.ts`) produce metadata de fallback explícita: `disabled` · `empty_excerpt` · `not_configured` · `schema_invalid` · `cost_estimate_exceeded` · `provider_error` (líneas 104-170), y captura el error crudo en Sentry.
- **Pero `enrichFindingWithLlm` (`llm-extraction.ts`) descarta esa metadata** — sólo consume `fields`. El finding queda `unknown` y ni el response del score ni el run detail dicen POR QUÉ.
- **Consecuencia:** el operador no puede distinguir "sentimiento neutro real" de "extracción no corrió" sin ir a Sentry. En los runs SKY, 35/35 `unknown` con flags ON ⇒ la causa real (probable `not_configured`/secret del provider de extracción en el runtime Vercel staging que ejecutó el `POST /score`, o `cost_estimate_exceeded` con el ceiling default de $0.02) sólo es diagnosticable por Sentry `domain=growth`.
- Nota: es la MISMA clase del root cause de TASK-1333 (drift de runtime), que se "arregló" prendiendo flags — pero el sistema sigue sin exponer la causa cuando degrada. Bug class recurrente hasta que el fallback reason sea visible.

### Gap D (menor) — `partial` sin desglose + clasificación de error gruesa para Vertex

- 1 obs Gemini `provider_error` (prompt `gn03`) → run `partial` (honesto), pero ni el run detail agregado ni el reporte público explican qué motor/prompt faltó.
- **NO es la clase ISSUE-113** (config/credencial Vertex rota): Gemini sirvió 6/7 prompts con citas reales en el mismo run. Fue un fallo **transitorio de una llamada** que agotó su retry acotado (policy `full`: `maxRetriesPerCall=2` → 3 intentos).
- **Dos sub-gaps del pipeline:** (1) el SDK Vertex no expone HTTP status (`httpStatus: null` siempre) → `mapThrownErrorToErrorCode` colapsa todo error no-timeout/no-parse en el bucket genérico `provider_error` — un 429/`RESOURCE_EXHAUSTED` (cuota) es indistinguible de un 500; (2) los reintentos del `web-search-adapter` son **inmediatos, sin backoff exponencial** → un throttle de cuota mata los 3 intentos dentro de la misma ventana. `latencyMs: 0` en la obs fallida es consistente con rechazo inmediato (throttle), no timeout.
- El error crudo SÍ está en Sentry: `captureWithDomain(error, 'growth', {runId, promptId, attempt})` — verificar `domain=growth`, run `grun-9dddd496…`, `promptId=gn03`, ~2026-07-11 15:07Z para la causa exacta.
- **Fix propuesto adicional:** backoff exponencial + jitter en los retries del adapter; inspeccionar `error.message`/`error.code` de Vertex para clasificar `rate_limited` aunque no haya httpStatus.

## Impacto

- **Comercial:** el informe público (que ahora se incrusta en propuestas, p.ej. licitación SKY) muestra `citation_quality 0/100` como si fuera un hecho del cliente. En la propuesta SKY se corrigió el claim a lo verificable por dominios (blog: 0 citas en 35 respuestas), pero cualquier otro consumidor del informe leerá el 0 crudo.
- **Producto:** 1 de 7 dimensiones muerta + `message_alignment` null silencioso ⇒ overall score sesgado a la baja (~-10 a -15 pts) para TODAS las marcas.

## Solución propuesta

1. **Clasificador determinista de `sourceType` en la normalización** (Gap A): `subjectDomain` + subdominios → `owned`; listas curadas de news (biobiochile, df.cl, latercera, forbes…), social (instagram/youtube/facebook/tiktok/reddit), directorios/OTAs (tripadvisor, despegar, turismocity), review sites (trustpilot, reclamos.cl) → tipos correspondientes; resto `unknown`. No requiere LLM.
2. **Normalización de dominio subdomain-aware** (Gap B): comparar por eTLD+1 (`skyairline.com` matchea `www.`/`blog.`/`cda.`), preservando el detalle del subdominio en el finding.
3. **Persistir/exponer el fallback reason de la extracción** (Gap C): guardar la metadata del router en el finding (`proseExtraction: {ran, fallbackReason, provider}`) y agregarla al response del score + señal de reliability (`growth.ai_visibility.prose_extraction_degraded`, steady=0).
4. **Desglose del `partial`** (Gap D): el run detail/report expone qué provider×prompt faltó.

## Verificación pendiente

- [ ] Confirmar en Sentry (`domain=growth`, 2026-07-11 ~14:30-15:15Z) el fallback reason real de los 35 enriquecimientos del run `EO-GRUN-00045`.
- [ ] Re-run SKY tras el fix → `citation_quality > 0` con las mismas citas; sentiment poblado o causa visible.

## Referencias

- Runs: `EO-GRUN-00044`, `EO-GRUN-00045` (`greenhouse_growth`); reporte público `grt-d8cb68da…` (incrustado en la propuesta SKY).
- Código: `src/lib/growth/ai-visibility/normalization/normalizer.ts` (líneas 81, 97), `scoring/engine.ts` (27, 192-208), `normalization/llm-extraction.ts`, `normalization/prose-extraction/router.ts` (104-170).
- Contexto: TASK-1333 (drift extracción worker/Vercel), ISSUE-113 (Gemini provider_error), FEATURE_FLAG_STATE_LEDGER deltas 2026-06-30/07-04.
