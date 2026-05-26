# TASK-937 — AI Observer reliability hardening (config fix + heartbeat + signal + honest banner)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-937-ai-observer-reliability-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El AI Observer (TASK-638) lleva días sin producir resúmenes ejecutivos aunque el flag `RELIABILITY_AI_OBSERVER_ENABLED=true`, el cron `ops-reliability-ai-watch` dispara cada hora y Vertex AI responde. La causa raíz son dos problemas que comparten una sola falla de diseño — **la liveness del observer se infiere de su output (una fila overview fresca) en vez de su propio run record**. Esta task arregla la config del modelo (JSON truncado), persiste un heartbeat por sweep, agrega un reliability signal del propio observer, y reescribe el banner con estados honestos.

## Why This Task Exists

Investigación en vivo 2026-05-26 (staging `dev-greenhouse`):

1. **Problema A — JSON truncado (operacional, dominante).** `gemini-2.5-flash` devuelve `unbalanced_or_truncated_json` en ~5 de cada 6 corridas. Logs del `ops-worker`:
   ```
   [ai-observer] JSON parse failed after schema retry { reason: 'unbalanced_or_truncated_json', initialChars: 295 }
   /reliability-ai-watch skipped — reason="Gemini response was not valid JSON after schema retry"
   ```
   `gemini-2.5-flash` tiene *thinking* ON por default; con `maxOutputTokens: 2048` y **sin `thinkingConfig`**, el modelo quema el budget de output en reasoning tokens y trunca el JSON. Cuando esto pasa, el sweep entero se descarta — no persiste ni overview ni módulos. Config actual en [src/lib/reliability/ai/runner.ts:150-154](../../../src/lib/reliability/ai/runner.ts#L150).

2. **Problema B — banner engañoso (UX honesty).** La UI gatea el banner "AI Observer no activo" sobre la observación `scope='overview'` en ventana de 24h ([ReliabilityAiWatcherCard.tsx:113](../../../src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx#L113)). Pero el overview se deduplica por fingerprint del **snapshot determinístico** (totales + severidades), no del texto Gemini ([runner.ts:390-413](../../../src/lib/reliability/ai/runner.ts#L390)). Datos en vivo: 429 filas `module` (última hoy 10:00) vs 126 `overview` (última hace 4 días, 2026-05-22). Con la postura global estable, el overview no re-persiste → la ventana de 24h queda vacía → banner dice "configura el env var", que es **falso** (el flag ya está `true`).

3. **La falla de diseño raíz.** No existe **heartbeat/run-log de cada sweep** ni **reliability signal del propio observer**. El observer es un path async sin señal — por eso falló ciego durante días, violando la regla canónica del repo *"reliability signals everywhere — every async path ships a signal"*. La liveness se infiere del output en vez de un run record propio.

## Goal

- Gemini devuelve JSON válido de forma confiable (tasa de éxito ~100% vs ~17% actual).
- Cada sweep deja un run record append-only consultable (corrió / dedup-skip / parse-fail / disabled).
- Un reliability signal detecta el observer caído o degradado en horas, no días.
- El banner distingue 4 estados honestos: `not_configured` / `healthy_stable` / `fresh` / `unhealthy`.
- Desacoplar las 3 preguntas: ¿corre? (heartbeat) · ¿está sano? (signal) · ¿hay narrativa fresca? (último overview sin filtro de edad).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de módulos + signals + AI Observer (TASK-638).
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `CLAUDE.md` — secciones "Reliability dashboard hygiene", "Cross-runtime observability — Sentry init", "Cloud Run ops-worker".

Reglas obligatorias (del veredicto arch-architect 4-pillar + overlay Greenhouse):

- **Reusar el primitivo canónico de run-tracking** `greenhouse_sync.source_sync_runs` con un `source_system` nuevo. **NUNCA** crear tabla `reliability_ai_sweeps` paralela (SSOT, extend-don't-parallel). Precedente vivo: `source_system='reliability_synthetic'` (synthetic monitor) y `'reactive_worker'`. Helper canónico de referencia: [src/lib/sync/reactive-run-tracker.ts](../../../src/lib/sync/reactive-run-tracker.ts).
- **Reliability signals everywhere** — el observer es un path async y debe shippear su signal, wired a `getReliabilityOverview` y visible en `/admin/operations`.
- **Mantener el dedup por fingerprint** — es control de costo correcto. El fix vive en reader + liveness, NO en matar el dedup.
- **Degradación honesta** (state-design): la UI distingue 4 estados, nunca colapsa en un booleano ambiguo.
- **No usar `Sentry.captureException` directo** — usar `captureWithDomain(err, 'cloud', ...)` en code paths del observer/ops-worker.
- **Microcopy es-CL** — invocar `greenhouse-ux-writing` antes de finalizar cualquier string del banner (TASK-265).

## Normative Docs

- `docs/tasks/complete/TASK-638-reliability-ai-observer.md` — spec original del observer.

## Dependencies & Impact

### Depends on

- `greenhouse_sync.source_sync_runs` (existe, ver `reactive-run-tracker.ts`).
- `greenhouse_ai.reliability_ai_observations` (existe, migration `20260425211608760`).
- `ops-worker` Cloud Run + Cloud Scheduler `ops-reliability-ai-watch` (existen, gated by flag — ya `true` en prod).
- `@google/genai@1.45.0` (instalado, soporta `thinkingConfig: { thinkingBudget }`).

### Blocks / Impacts

- Ninguna task bloqueada. Mejora observabilidad del propio Reliability Control Plane.
- **Contexto operacional:** `ops-worker` es servicio único compartido staging/prod (ver `TASK-930`). El deploy del fix de config va por push a `develop` → `ops-worker-deploy.yml`. No cambia el diseño de esta task.

### Files owned

- `src/lib/reliability/ai/runner.ts` (config + finishReason + heartbeat wiring)
- `src/lib/reliability/ai/ai-observer-run-tracker.ts` (nuevo — heartbeat helper)
- `src/lib/reliability/ai/reader.ts` (drop ventana 24h del overview + liveness reader)
- `src/lib/reliability/queries/ai-observer-unhealthy.ts` (nuevo — signal reader)
- `src/lib/reliability/queries/ai-observer-unhealthy.test.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wire del signal)
- `src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx` (4 estados)
- `src/app/(dashboard)/admin/page.tsx` (pasar liveness al card)
- `services/ops-worker/server.ts` (loggear finishReason / wiring heartbeat si aplica en el handler)

## Current Repo State

### Already exists

- Observer runner completo + dedup + retry de schema ([runner.ts](../../../src/lib/reliability/ai/runner.ts)).
- GenAI client Vertex via WIF ([src/lib/ai/google-genai.ts](../../../src/lib/ai/google-genai.ts)).
- Tabla observations + persist/reader/adapter en `src/lib/reliability/ai/`.
- Cron `ops-reliability-ai-watch` (`0 */1 * * *`) + endpoint `POST /reliability-ai-watch`.
- Run-tracking primitivo `source_sync_runs` + helper pattern `reactive-run-tracker.ts`.

### Gap

- Config del modelo sin `thinkingConfig` → JSON truncado.
- No se loggea `finishReason` (no se distingue `MAX_TOKENS` de JSON malformado).
- Sin heartbeat por sweep → el observer puede fallar ciego.
- Sin reliability signal del observer.
- Reader del overview con ventana 24h + banner que colapsa 3 estados en uno engañoso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Config del modelo (P0, desbloquea hoy)

- En `BASE_GENERATION_CONFIG` ([runner.ts:150](../../../src/lib/reliability/ai/runner.ts#L150)) agregar `thinkingConfig: { thinkingBudget: 0 }` y subir `maxOutputTokens` de 2048 → 4096. (Shape validado contra `@google/genai@1.45.0`: `thinkingConfig?: ThinkingConfig` con `thinkingBudget?: number`.)
- Loggear `response.candidates?.[0]?.finishReason` en el path de parse-fail (corrección del review GCP/Vertex: `MAX_TOKENS` distingue "truncado por budget" de "JSON malformado"). Incluirlo en el `skippedReason`.
- Aplicar el mismo `thinkingConfig` al retry de schema (línea ~350).
- **Verificación:** forzar corrida (`POST /reliability-ai-watch` con `force:true`) en staging y confirmar `done — persisted>=1` con un overview limpio. Tasa de parse-fail debe caer a ~0.

### Slice 2 — Heartbeat por sweep (P1)

- Nuevo helper `src/lib/reliability/ai/ai-observer-run-tracker.ts` siguiendo el pattern de `reactive-run-tracker.ts`, con `source_system='reliability_ai_observer'`:
  - `writeAiObserverRunStart({ runId, triggeredBy })` → INSERT `source_sync_runs` (`status='running'`).
  - `writeAiObserverRunComplete({ runId, summary })` → UPDATE con `records_read=evaluated`, `records_written_raw=persisted`, `notes` = skippedReason + finishReason, `finished_at=NOW()`, status derivado (ver mapeo).
  - `getLastAiObserverRun()` / `getRecentAiObserverRuns(n)` para liveness + parse-fail-rate.
- Wire vía **wrapper boundary** en `runReliabilityAiObserver` (runner.ts): renombrar impl actual a `runReliabilityAiObserverInner`; el wrapper público hace writeStart → inner → writeComplete(summary) / writeFailure(err) en try/catch. Evita tocar los múltiples return paths del inner. El heartbeat NO debe romper el sweep si falla (try/catch + warn alrededor de cada write).
- **Mapeo de status canónico (corrección Audit 2026-05-26):** el CHECK `source_sync_runs_status_check` solo permite `('running','succeeded','failed','partial','cancelled')` — `'skipped'` NO existe. Mapeo:
  - flag OFF (disabled) → `status='cancelled'`, notes=`disabled:kill-switch-off`
  - JSON parse-fail / empty response → `status='failed'`, notes=`parse_failed:<finishReason>` / `empty_response`
  - dedup-only (evaluated>0, persisted=0, sin skippedReason) → `status='succeeded'`
  - persist → `status='succeeded'`
- Agregar campo `finishReason: string | null` a `AiSweepSummary` + `buildSummary`, seteado en el path parse-fail (corrección review GCP/Vertex).

### Slice 2b — Índice parcial (corrección Audit)

- Migration `pnpm migrate:create` con índice parcial mirror de `idx_source_sync_runs_reactive_worker`:
  `CREATE INDEX ... ON source_sync_runs (source_system, started_at DESC) WHERE source_system='reliability_ai_observer'`. El reader del signal filtra `source_system` + ORDER BY → sin índice = seq scan sobre toda la tabla de sync runs.

### Slice 3 — Reliability signal del observer (P1)

- Nuevo reader `src/lib/reliability/queries/ai-observer-unhealthy.ts` → signal `reliability.ai_observer.unhealthy` (kind=`drift`, steady=0). Lee `source_sync_runs WHERE source_system='reliability_ai_observer'`:
  - Sin run en > 2.5h (cron/worker caído) → `error`.
  - Últimos N (≥4) runs todos `status='failed'` con notes `parse_failed:*` → `error` (modelo roto).
  - Último run `status='cancelled'` con notes `disabled:*` (flag OFF) → `not_configured` (opt-in, no es error).
  - Sin runs nunca → `awaiting_data`.
  - Caso normal → `ok`.
- Test `ai-observer-unhealthy.test.ts`: cubrir ok / no-run / parse-fail-streak / disabled / awaiting_data / degraded (query throws → `unknown`).
- Wire en `getReliabilityOverview` (confirmar subsystem rollup contra `RELIABILITY_REGISTRY`; el observer pertenece al control plane mismo — meta-signal).
- **Nunca con fecha-resta DATE:** si el reader computa edad, usar `(NOW() - finished_at)` con cast a `interval`/`timestamptz`, respetando el gate TASK-893 (no `EXTRACT(EPOCH FROM (date - date))`).

### Slice 4 — Reader + banner con estados honestos (P2)

- `reader.ts` `getLatestAiObservationsByScope`: para `overview`, **quitar el filtro de 24h** (devolver el último overview sin importar la edad, con su `observedAt`). Los módulos pueden conservar ventana razonable o también soltarla.
- Nuevo liveness reader que el page consume (de `getLastAiObserverRun` + parse-fail-rate) para decidir el estado del banner.
- `ReliabilityAiWatcherCard.tsx`: 4 estados:
  - `not_configured` — flag OFF / nunca corrió → mensaje de configuración (el actual, pero correcto).
  - `healthy_stable` — corriendo, postura estable, último overview con label "hace X" (sano, NO alarma).
  - `fresh` — overview reciente, render normal.
  - `unhealthy` — runs corriendo pero parse-fail streak / sin run reciente → alerta "el observer está degradado" con el `finishReason`.
- Microcopy es-CL revisada con `greenhouse-ux-writing`.

### Slice 5 — Verificación end-to-end

- Deploy a staging (push develop → `ops-worker-deploy.yml`), forzar corrida, confirmar: overview persiste limpio, heartbeat row aparece, signal = `ok`, banner muestra `fresh`/`healthy_stable`.
- `pnpm test` (full) + `pnpm build` antes de cerrar (gate canónico).

## Out of Scope

- Cambiar de modelo / multi-modelo fallback / multi-agente (boring tech; la config resuelve).
- "Observación sintética" cuando el JSON falla (contamina la narrativa; skip honesto + signal es lo correcto).
- Matar el dedup por fingerprint.
- Streaming / reparación de JSON parcial.
- Tabla nueva de run-tracking (reusar `source_sync_runs`).
- Alertas Teams del signal (V1 solo dashboard; evaluar en follow-up).
- Resolver TASK-930 (ops-worker compartido staging/prod) — es task aparte.

## Detailed Spec

### Config corregida (Slice 1)

```ts
// src/lib/reliability/ai/runner.ts
const BASE_GENERATION_CONFIG = {
  temperature: 0.1,
  responseMimeType: 'application/json',
  responseSchema: AI_RESPONSE_SCHEMA,
  maxOutputTokens: 4096,
  thinkingConfig: { thinkingBudget: 0 } // gemini-2.5-flash quema output en thinking → trunca JSON
}
```

`responseSchema` + `responseMimeType` = constrained decoding → JSON válido **si completa dentro del budget** (validado con skill gcp-vertex-ai). `thinkingBudget: 0` libera el budget. Decisión: apagar thinking del todo — la tarea es extracción estructurada de un snapshot determinístico, baja necesidad de reasoning; maximiza confiabilidad del JSON y baja costo/latencia.

### Heartbeat → source_sync_runs (Slice 2)

Mapeo de columnas (mismo shape que `reactive-run-tracker.ts`):

| columna | valor |
|---|---|
| `source_system` | `'reliability_ai_observer'` |
| `source_object_type` | `'reliability_snapshot'` |
| `sync_mode` | `'poll'` |
| `status` | `running` → `succeeded` \| `skipped` \| `failed` |
| `records_read` | `evaluated` |
| `records_written_raw` | `persisted` |
| `notes` | `skippedReason` + `finishReason` (truncado) |
| `triggered_by` | `'cloud_scheduler'` \| `'manual'` |

### Decoupling (el insight de diseño)

| Pregunta | Fuente de verdad | Antes (mal) |
|---|---|---|
| ¿El observer corre? | heartbeat `source_sync_runs` | se infería de fila overview |
| ¿Está sano? | signal `reliability.ai_observer.unhealthy` | nadie lo medía |
| ¿Hay narrativa fresca? | último overview (sin filtro de edad) | ventana 24h + dedup → falso "apagado" |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (config) es independiente y desbloquea de inmediato — puede mergear sola.
- Slice 2 (heartbeat) → Slice 3 (signal lee el heartbeat): **3 depende de 2**.
- Slice 4 (banner) depende de 2 (liveness reader) — puede correr en paralelo con 3 una vez que 2 cerró.
- Slice 5 (verificación) al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `thinkingBudget:0` baja la calidad narrativa | AI/observer | low | tarea es extracción estructurada, no creativa; revisar 1-2 overviews reales post-deploy | `reliability.ai_observer.unhealthy` |
| Heartbeat falla y rompe el sweep | cron/observer | low | try/catch + warn alrededor del run-tracker; el sweep no depende del heartbeat | logs ops-worker |
| Signal con falso positivo por cadencia (1h) | reliability | medium | umbral "sin run > 2.5h" da margen sobre el intervalo de 1h | el propio signal |
| Reader sin ventana 24h muestra overview muy viejo como "fresh" | UI | low | el estado `healthy_stable` muestra label "hace X días"; `unhealthy` se deriva del heartbeat, no de la edad del overview | N/A — visual |
| Fecha-resta DATE rompe el reader del signal | reliability/PG | medium | usar cast `::timestamptz`; respetar gate TASK-893 | falla en `pnpm test` del reader |

### Feature flags / cutover

- Sin flag nuevo. `RELIABILITY_AI_OBSERVER_ENABLED` (existente) sigue siendo el master switch. Cambios aditivos (config, heartbeat, signal, banner) — cutover inmediato al deploy.
- Revert: revertir el PR. La config es two-way door total.

### Rollback plan per slice

- Slice 1: revert del diff de config. <5 min.
- Slice 2-3: aditivo (helper + reader nuevos + wiring). Revert PR; el heartbeat no muta estado de negocio.
- Slice 4: aditivo en UI. Revert PR.
- Ningún slice muta datos productivos ni hace migration destructiva. El heartbeat solo agrega filas append-only a `source_sync_runs`.

## 4-Pillar Score

### Safety
- **Qué puede fallar:** el prompt manda el snapshot de reliability (counts/severidades/nombres de módulo) a Gemini.
- **Gates:** corre vía WIF dentro de GCP (Vertex AI, sin API key de terceros); flag opt-in; `temperature 0.1`; read-only + append.
- **Blast radius:** cero datos productivos mutados. Una plataforma (observabilidad interna).
- **Verified by:** flag OFF-por-default histórico; sin secretos en el prompt.
- **Residual risk:** un summary de signal podría arrastrar texto sensible al prompt → hardening recomendado: pase `redactSensitive` sobre el prompt (no bloqueante para V1).

### Robustness
- **Idempotencia:** heartbeat por `runId` único (`ON CONFLICT DO NOTHING` en start); observations con dedup por fingerprint + `ON CONFLICT DO NOTHING`.
- **Atomicidad:** el heartbeat es independiente del persist (try/catch), no comparten tx — por diseño (el run record debe escribirse aunque el persist falle).
- **Race protection:** N/A — un sweep por hora, single writer.
- **Constraint coverage:** CHECK sobre `status` de `source_sync_runs` (existente).
- **Verified by:** tests del signal reader (ok/no-run/parse-fail/disabled/awaiting/degraded).

### Resilience
- **Retry policy:** 1 retry de schema existente; con Slice 1 la tasa de éxito sube a ~100%.
- **Dead letter:** N/A — observación horaria, la próxima hora reintenta.
- **Reliability signal:** `reliability.ai_observer.unhealthy` (kind=drift, steady=0) — **el gap que esta task cierra**.
- **Audit trail:** `source_sync_runs` append-only es el trail forense por sweep.
- **Recovery:** `POST /reliability-ai-watch` con `force:true`.

### Scalability
- **Hot path Big-O:** O(1) — 1 call + ≤5 writes por hora.
- **Index coverage:** `source_sync_runs` indexado por `source_system` + `started_at` (confirmar índice del filtro del reader).
- **Async paths:** ya corre en ops-worker (fuera del request path).
- **Cost at 10x módulos:** lineal y despreciable (un call/hora). `thinkingBudget:0` baja costo.
- **Pagination:** N/A (signal lee últimos N).

## Hard Rules (anti-regression)

- **NUNCA** inferir liveness del observer desde la frescura de una fila overview. Liveness = heartbeat en `source_sync_runs`.
- **NUNCA** crear tabla de run-tracking nueva — `source_sync_runs` + `source_system` es el primitivo canónico.
- **NUNCA** matar el dedup por fingerprint para "arreglar" el banner — es control de costo; el fix vive en reader + signal.
- **NUNCA** usar `EXTRACT(EPOCH FROM (date - date))` en el reader del signal (gate TASK-893).
- **NUNCA** `Sentry.captureException` directo — usar `captureWithDomain(err, 'cloud', ...)`.
- **SIEMPRE** que el heartbeat falle, degradar silencioso (try/catch + warn) — nunca romper el sweep.
- **SIEMPRE** revisar la microcopy del banner con `greenhouse-ux-writing` (TASK-265).

## Open Questions — RESUELTAS pre-execution (2026-05-26)

- **Q1 — ¿Cadencia 1h vs 30min?** → MANTENER 1h. Rationale: cada call cuesta tokens Vertex; un resumen ejecutivo horario es suficiente operativamente; bajar a 30min duplica costo sin valor. No bloqueante, no toca diseño.
- **Q2 — ¿Signal alerta Teams o solo dashboard?** → SOLO dashboard `/admin/operations` en V1. Rationale: evitar alert fatigue (es observabilidad de una herramienta de observabilidad); el dashboard es el surface correcto; Teams se evalúa en follow-up si el signal prueba ser accionable. Opción más robusta/least-surprise.
- **Q3 — ¿Subsystem rollup del signal?** → `moduleKey: 'cloud'` (signalId `reliability.ai_observer.unhealthy`). Rationale: el observer corre en ops-worker/Cloud Run, dominio observability; reusa el rollup `cloud` existente (igual que `observability.cloud_run.silent_failure_rate`) — NO requiere módulo nuevo en `RELIABILITY_REGISTRY` (extend-don't-parallel). Verificado: `moduleKey 'cloud'` + `kind 'drift'` válidos en `types/reliability.ts`.

## Branch note

Implementación directa en `develop` por instrucción explícita del operador (2026-05-26) — sin branch `task/*`. Commits por slice con co-author trailer.
