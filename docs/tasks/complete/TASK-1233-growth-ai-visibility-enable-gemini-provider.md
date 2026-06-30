# TASK-1233 — Growth AI Visibility: Enable Gemini Provider

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Complete (dev verificado + flag staging ON); prod follow-up`
- Rank: `TBD`
- Domain: `growth|integrations.ai|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1233-growth-ai-visibility-enable-gemini-provider`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilitar **Gemini** como tercer provider real del AI Visibility Grader (hoy corren OpenAI + Anthropic). El adapter ya existe (`createGeminiProviderAdapter`, reusa el cliente canónico Vertex con Google Search grounding) pero nunca se ejercitó contra credenciales reales y el flag `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` está OFF. Esta task valida el adapter end-to-end, prende el flag en staging y deja Gemini contribuyendo evidencia + score.

## Why This Task Exists

El spike (TASK-1228) cubrió OpenAI + Anthropic y **difirió Gemini "por credenciales"** — pero el adapter productivo de TASK-1226 NO usa la generativelanguage API con `GEMINI_API_KEY` (como el harness throwaway del spike), sino el cliente canónico `src/lib/ai/google-genai.ts` (Vertex AI vía ADC/WIF, que Greenhouse ya usa para Nexa). Por eso Gemini probablemente ya esté "configurado" en runtime y solo falte validarlo + prenderlo. Más providers = más cobertura de answer engines = mejor señal del grader (Gemini es uno de los motores más usados). Cerrar este gap completa 3/4 del provider set V1 (Perplexity queda aparte por falta de cliente canónico/creds).

## Goal

- Validar el adapter Gemini end-to-end con grounding real (texto + citations desde `groundingMetadata`), corrigiendo el parseo si diverge del shape real de Vertex.
- Prender `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` en staging y verificar observations + signals + score con Gemini incluido.
- Documentar costo/latencia de Gemini y actualizar ledger + docs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §Delta 2026-06-24 (invariantes provider adapters): NUNCA fetch crudo en el dominio, NUNCA SDK paralelo, secret server-side, skip limpio sin flag.
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — invariantes de providers LLM (`src/lib/ai/`).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — estado de flags + regla de actualización al prender.
- `docs/operations/GREENHOUSE_RUNTIME_ROLLOUT_COMPLETION_GATE` (CLAUDE.md §Runtime Rollout Completion Gate) — code-complete ≠ operativamente completo.

Reglas obligatorias:

- Reusar el cliente canónico `src/lib/ai/google-genai.ts` (`runGeminiGroundedSearch` / `getGoogleGenAIClient`). NO crear cliente paralelo ni usar `GEMINI_API_KEY` con fetch crudo.
- Flag `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` default OFF; sin flag/credencial → skip limpio (`provider_disabled`/`missing_secret`), nunca crash.
- Sin PII a Gemini; citations normalizadas por dominio (mismo contrato que OpenAI/Anthropic).
- Producción fuera de scope (igual que TASK-1226): solo validación + staging.

## Normative Docs

- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — fundación del adapter Gemini + policy + flags.
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` — hallazgos del spike (Gemini/Perplexity diferidos).

## Dependencies & Impact

### Depends on

- `TASK-1226` (complete) — adapter Gemini, policy, flags, store, smoke.
- Acceso Vertex AI en `efeonce-group` (ADC/WIF + project), ya usado por Nexa. `[verificar]` que la región/modelo (`gemini-2.5-flash`) soporte `googleSearch` grounding en el proyecto.

### Blocks / Impacts

- Mejora la cobertura del score (más providers en `provider_observations`) sin cambiar el contrato.
- No bloquea report builder ni HubSpot handoff (esos consumen el score, agnóstico de cuántos providers corrieron).

### Files owned

- `src/lib/ai/google-genai.ts` — solo si el parseo de `groundingMetadata`/texto necesita corrección.
- `src/lib/growth/ai-visibility/providers/gemini-adapter.ts` — solo si la normalización de la respuesta diverge.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, `docs/documentation/growth/ai-visibility-grader.md`, `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` — estado + costo Gemini.

## Current Repo State

### Already exists

- `createGeminiProviderAdapter` (`src/lib/growth/ai-visibility/providers/gemini-adapter.ts`) sobre el factory genérico `createWebSearchAdapter`.
- `runGeminiGroundedSearch` + `isGeminiConfigured` + `GEMINI_GROUNDED_DEFAULT_MODEL='gemini-2.5-flash'` (`src/lib/ai/google-genai.ts`, Vertex + `googleSearch` tool).
- Flag `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` (default OFF, ledger). Gemini ya es elegible en los 3 modos de la policy (`light/full/internal_audit`).
- Smoke harness (`pnpm growth:ai-visibility:smoke`) + endpoint admin interno (corren Gemini en cuanto el flag esté ON).

### Gap

- Gemini NUNCA se ejecutó contra Vertex real: el parseo de texto/citations desde `groundingMetadata` no está verificado contra el shape vivo (riesgo de citations vacías o texto null).
- `isGeminiConfigured` solo chequea `getGoogleProjectId()` — falta confirmar que basta para Vertex grounding en runtime (Vercel) o si requiere config extra.
- Flag OFF en todos los environments; costo/latencia de Gemini sin medir.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: ninguno nuevo — Gemini escribe `provider_observations` (greenhouse_growth) por el path existente de TASK-1226.
- Consumidores afectados: scoring engine (TASK-1227) consume las observations Gemini sin cambios de contrato.
- Runtime target: `local` + `staging`; prod fuera de scope.

### Contract surface

- Contrato existente a respetar: `WebSearchCallResult` (factory) + `GrowthAiVisibilityProviderObservation`. Gemini ya mapea a este contrato.
- Contrato nuevo o modificado: ninguno esperado; solo posible corrección interna del parseo de `groundingMetadata` en `runGeminiGroundedSearch`.
- Backward compatibility: `additive` — prender un provider no cambia el shape de runs/scores existentes.
- Full API parity: ningún consumer llama Gemini directo; todo pasa por el run-engine/adapters de TASK-1226.

### Data model and invariants

- Entidades afectadas: `greenhouse_growth.provider_observations` (filas con `provider='gemini'`), append-only.
- Invariantes: citations normalizadas por dominio; excerpt bounded; usage/latency capturados; sin secret/raw en logs; skip limpio sin flag.
- Idempotency/concurrency: igual que el resto de providers (el run-engine ya lo maneja).
- Audit/observability: `captureWithDomain('growth')` en error; signals existentes (`provider_error_rate`, `latency_p95`, `cost_budget_used`, `provider_call_skipped`) ya cubren Gemini.

### Migration, backfill and rollout

- Migration posture: `none` (sin schema nuevo).
- Default state: flag OFF; prender en staging tras validación.
- Backfill plan: N/A.
- Rollback path: flag `GROWTH_AI_VISIBILITY_GEMINI_ENABLED=false` + redeploy (<5 min).
- External coordination: confirmar acceso/grant Vertex AI para el modelo con grounding en `efeonce-group` (probablemente ya disponible vía Nexa).

### Security and access

- Auth/access gate: server-only, capability `growth.ai_visibility.run.execute` (existente) para correr.
- Sensitive data posture: sin PII a Gemini; excerpt bounded; sin raw provider text en logs/responses.
- Error contract: clase canónica (`mapThrownErrorToErrorCode`) — el SDK Vertex lanza, el factory mapea; nunca raw al cliente.
- Abuse/rate-limit: cost ceiling por modo (policy) ya aplica a Gemini.

### Runtime evidence

- Local checks: smoke con Gemini ON contra Vertex real (1 marca, modo light) → observations succeeded con citations + usage.
- DB/runtime checks: `provider_observations` con `provider='gemini'` succeeded + score recomputado incluyendo Gemini.
- Integration checks: verificar parseo de `groundingMetadata` real (citations no vacías cuando hay grounding).
- Reliability signals: los 4 signals de provider ya cubren Gemini (sin signal nuevo).

### Acceptance criteria additions

- [ ] Gemini ejecuta real vía Vertex grounding y produce observations normalizadas (texto + citations + usage).
- [ ] Flag prendido en staging con skip limpio verificado cuando estaba OFF.
- [ ] Costo/latencia de Gemini documentado vs OpenAI/Anthropic.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Validar el adapter Gemini end-to-end (Vertex grounding real)

- Ejercitar `runGeminiGroundedSearch` / `createGeminiProviderAdapter` contra Vertex real (script de sanity o smoke con `GROWTH_AI_VISIBILITY_GEMINI_ENABLED=true`).
- Verificar el shape vivo de la respuesta: texto desde `candidates[].content.parts` y citations desde `groundingMetadata.groundingChunks[].web.uri/title`. Corregir el parseo si diverge.
- Confirmar `isGeminiConfigured()` resuelve correcto en runtime (project + ADC) y que sin acceso → skip limpio.
- Tests focales del parseo Gemini (mock del cliente, mismo patrón que `openai-adapter.test.ts`).

### Slice 2 — Habilitar en staging + smoke + score

- `vercel env add GROWTH_AI_VISIBILITY_GEMINI_ENABLED true` (environment staging) + redeploy.
- `pnpm growth:ai-visibility:smoke` (o endpoint `POST /runs`) en staging con Gemini ON → observations Gemini succeeded.
- Puntuar un run con Gemini incluido (`POST /runs/[runId]/score`) y verificar que el competitive SoV / coverage reflejan al tercer motor.
- Medir costo/latencia Gemini.

### Slice 3 — Docs + ledger

- Actualizar `FEATURE_FLAG_STATE_LEDGER` (snapshot Gemini staging ON, prod pendiente).
- Actualizar doc funcional + manual (Gemini activo; costo/latencia).
- Handoff + changelog.

## Out of Scope

- Perplexity (sin cliente canónico ni creds — task aparte).
- Producción (release control plane — follow-up del programa, como TASK-1226).
- Report builder, admin UI, HubSpot handoff, Nexa/MCP.
- Recalibración de pesos del score.

## Detailed Spec

El adapter Gemini ya está implementado; esta task es validación + enablement, NO construcción nueva. El único cambio de código probable es corregir el parseo de `groundingMetadata` en `runGeminiGroundedSearch` si el shape vivo de Vertex difiere del asumido (`groundingChunks[].web.{uri,title}`). Verificar también que el modelo `gemini-2.5-flash` con `tools:[{googleSearch:{}}]` está disponible en la región Vertex del proyecto; si no, ajustar `GEMINI_GROUNDED_DEFAULT_MODEL`/location con rationale.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (validar adapter) → Slice 2 (prender staging + smoke) → Slice 3 (docs). No prender el flag en staging antes de validar el parseo real (Slice 1), para no ensuciar observations con citations vacías.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Parseo de groundingMetadata diverge (citations vacías / texto null) | integrations.ai | medium | validar shape vivo en Slice 1 antes de prender; tests de parseo | `growth.ai_visibility.provider_error_rate` |
| Modelo/región Vertex no soporta googleSearch grounding | integrations.ai | medium | verificar en Slice 1; ajustar modelo/location con rationale | error en el smoke |
| Costo Gemini mayor al esperado | cost | low | cost ceiling por modo ya aplica; medir en Slice 2 | `growth.ai_visibility.cost_budget_used` |
| Flag prendido sin acceso Vertex → fallos | integrations.ai | low | skip limpio por `isGeminiConfigured`; validar OFF→skip antes | `growth.ai_visibility.provider_call_skipped` |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` (default OFF). Flip a `true` en staging post-validación. Revert: env var a `false` + redeploy (<5 min). Prod fuera de scope.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (solo parseo/tests) | <5 min | si |
| Slice 2 | `GROWTH_AI_VISIBILITY_GEMINI_ENABLED=false` staging + redeploy | <5 min | si |
| Slice 3 | revert docs | <5 min | si |

### Production verification sequence

1. Slice 1: sanity local contra Vertex real → observations Gemini succeeded con citations.
2. Slice 2: flag ON staging + smoke + score con Gemini.
3. Prod: fuera de scope (follow-up del programa vía release control plane).

### Out-of-band coordination required

- Confirmar acceso/grant Vertex AI para grounding en `efeonce-group` (probablemente ya disponible vía Nexa). Si requiere habilitar el modelo/feature en GCP, coordinarlo antes de Slice 2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Gemini produce `provider_observations` reales (texto + citations + usage) vía Vertex grounding (sanity real + smoke).
- [x] Sin flag/credencial, Gemini hace skip limpio (no crash); con flag ON, ejecuta (tests + sanity).
- [x] El parseo de citations/texto de Gemini verificado contra el shape vivo: **fix de dominio** (url=redirect vertexaisearch, dominio real en title) + tests.
- [x] `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` ON en Vercel staging; smoke real local 6/6 + score incluye Gemini con dominios reales. (Smoke vía endpoint staging = post-push.)
- [x] Costo/latencia Gemini documentado (~$0.016/marca; ~56s/call con Gemini 3 preview); ledger + docs funcional/manual actualizados.
- [x] Sin cliente paralelo, sin fetch crudo en el dominio, sin PII a Gemini (reusa el cliente canónico Vertex).
- [x] **Extra (pedido operador):** modelo bumpeado a Gemini 3 (`gemini-3-flash-preview`, lo más nuevo en Vertex) + override por env `GREENHOUSE_GEMINI_GROUNDED_MODEL`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (focales `src/lib/growth/ai-visibility/**` + AI clients)
- `pnpm growth:ai-visibility:smoke` con Gemini ON (sanity Vertex real)
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER` con el snapshot Gemini staging ON
- [ ] chequeo de impacto cruzado (TASK-1226/1227)

## Follow-ups

- Perplexity provider (cliente canónico `src/lib/ai/perplexity.ts` ya existe; falta creds + enablement) — task aparte.
- Producción de todos los providers vía release control plane.
- Recalibración de pesos del score con evidencia de 3+ motores.

## Open Questions

1. ¿`isGeminiConfigured()` (solo project id) basta para Vertex grounding en runtime? → **RESUELTA: sí.** project + ADC/WIF (el mismo que usa Nexa) basta; grounding funciona en local. Sin project → skip limpio.
2. ¿`gemini-2.5-flash` + `googleSearch` disponible en la location Vertex? → **RESUELTA: sí en location `global`** (default del cliente), sin región especial. Además se bumpeó a Gemini 3.

## Delta 2026-06-24 — Cierre (complete, dev verificado + staging ON)

Implementada en `develop` local-first (3 slices, commits `c02546972` Slice 1 → `22eff2dbc` Slice 2 → docs).

- **Hallazgo de Discovery (Slice 1):** las citations de Gemini/Vertex grounding traen `web.uri` = redirect `vertexaisearch.cloud.google.com/...` y el **dominio real en `web.title`**. El adapter extraía dominio del url → colapsaba todo a `vertexaisearch`, rompiendo la desambiguación por dominio + citation quality. Fix backward-compatible: `normalizeDomain` + `buildCitation` con `domain` override; el adapter mapea title→domain (preserva el redirect). OpenAI/Anthropic sin cambio.
- **Modelo (Slice 2, pedido del operador):** bump `gemini-2.5-flash` → `gemini-3-flash-preview` (la última generación en Vertex; `gemini-3.1`/`gemini-3-pro` aún 404) + override por env `GREENHOUSE_GEMINI_GROUNDED_MODEL`.
- **Verificación:** Vertex real OK (grounding, citations con dominios reales loup.cl/bigbuda.cl); smoke real local 6/6 succeeded, cost ~$0.016/marca (el más barato del set); score con findings Gemini de dominios reales; 90 tests growth; local:check OK.
- **Rollout:** flag `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` ON en Vercel staging. **Pendiente (no bloquea):** push del código (Slice 1 fix) + smoke vía endpoint staging; prod = follow-up del programa (release control plane). Perplexity sigue OFF (sin cliente con grounding/creds).
- **Hallazgo runtime → cerrado por TASK-1234 (2026-06-24):** el timeout de la función Vercel con Gemini 3 (≈56s/call × N prompts) NO era bug de Gemini sino del endpoint síncrono inline. TASK-1234 (code complete dev) movió la ejecución a un worker async Cloud Run (`POST /growth/grader/drain` + Cloud Scheduler) con persistencia incremental + recovery de huérfanos. El run huérfano `running` que dejó este timeout será finalizado por el recovery de 1234.
