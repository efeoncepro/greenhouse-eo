# TASK-1271 — Growth AI Visibility: Cost-Efficient Prose Extraction Router

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data-quality|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1271-growth-ai-visibility-prose-extraction-router`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El AEO/AI Visibility Grader ya tiene capacidad de extraer sentimiento, category associations y drift narrativo, pero hoy el hook esta acoplado a Anthropic y apagado por costo. Esta task convierte ese paso en un router de proveedores costo-eficiente, evalua Gemini/OpenAI low-cost contra el golden set y permite prender sentiment/prose extraction sin que Claude Haiku sea el default permanente.

## Why This Task Exists

El normalizer determinista preserva `sentimentLabel='unknown'` y `sentimentScore=null`; la unica capa que puede llenarlos es `enrichFindingWithLlm`, detras de `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` y usando Anthropic. Eso es seguro, pero caro para un paso cognitivamente simple: clasificar un excerpt en `positive|neutral|negative|mixed|unknown`, extraer asociaciones y claims, y devolver confianza. Si EPIC-020 lanza el grader publico con sentimiento activo, el costo por run puede escalar innecesariamente. La solucion no es borrar Anthropic, sino introducir un puerto gobernado con modelos baratos primero, fallback premium y eval antes del cutover.

## Goal

- Separar la extraccion de prosa del proveedor Anthropic en un puerto `ProseExtractionProvider` reutilizable y testeable.
- Agregar candidatos low-cost (Gemini Flash-Lite / OpenAI nano o equivalente vigente) usando clientes canonicos `src/lib/ai/*`, sin SDK paralelo ni fetch crudo.
- Decidir el default por evidencia: golden eval + costo estimado + tasa de schema-valid responses + tasa de `unknown`, con fallback y flags por proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §Delta TASK-1226/TASK-1227/TASK-1237: provider adapters, normalizer determinista-first, report signal enrichment.
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` — decisiones de calibracion y limites del golden set.
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `NormalizedFinding`, `llm-extraction.ts`, default OFF.
- `docs/tasks/complete/TASK-1249-growth-ai-visibility-calibration-provider-completion.md` — provider completion + decision de mantener score V1.
- `docs/tasks/to-do/TASK-1272-growth-ai-visibility-category-taxonomy-contract.md` — taxonomia gobernada para que `categoryAssociations` no sean strings libres product-facing.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — flags del grader y registro de cualquier flag nuevo.

Reglas obligatorias:

- **NUNCA** un LLM asigna el `grader_score`; esta task solo cambia el extractor de campos de prosa de `normalized_findings`.
- **NUNCA** enviar PII del lead a proveedores. El extractor recibe solo `answerExcerpt` + marca/dominio del perfil, igual que el hook actual.
- **NUNCA** instanciar SDKs paralelos ni `fetch` crudo. Reusar `src/lib/ai/openai.ts`, `src/lib/ai/google-genai.ts` y `src/lib/ai/anthropic.ts`.
- **NUNCA** cambiar el default productivo sin eval y flag. El default seguro inicial es equivalente al estado actual: extraction OFF o Anthropic unchanged; el nuevo proveedor se prende por flag/shadow.
- **NUNCA** publicar categorias libres del proveedor como verdad de producto. `categoryAssociations` debe mapear a la taxonomia gobernada de `TASK-1272` o degradar a `unknown` / `needs_review`.
- **Preservar `unknown`** cuando la evidencia o el schema no alcanzan. Fallo de proveedor/schema → finding determinista intacto.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/normalization/normalizer.ts`
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json`
- `src/lib/growth/ai-visibility/evals/eval-runner.ts`
- `src/lib/growth/ai-visibility/flags.ts`

## Dependencies & Impact

### Depends on

- `TASK-1227` — normalized finding contract + current LLM extraction hook.
- `TASK-1249` — provider set completion and calibration posture.
- `TASK-1272` — requerido para habilitar category associations product-facing; sentiment/drift pueden shippear sin bloquearse por taxonomia si preservan `categoryAssociations` como internal-only o `unknown`.
- Canonical AI clients under `src/lib/ai/*`.

### Blocks / Impacts

- Enables meaningful `sentimentSummary` from `TASK-1237` without making Anthropic the permanent cost center.
- Improves `message_alignment` evidence coverage when prose extraction is ON.
- Feeds `TASK-1272` with raw category candidates, but does not define category taxonomy or publish free-form categories.
- Reduces launch/runtime cost risk for `TASK-1246` and report/email/client surfaces (`TASK-1241`, `TASK-1248`, `TASK-1250`).

### Files owned

- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/normalization/prose-extraction/` [nuevo]
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- `src/lib/growth/ai-visibility/evals/eval-runner.ts`
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json`
- `src/lib/growth/ai-visibility/flags.ts`
- `src/lib/ai/openai.ts`
- `src/lib/ai/google-genai.ts`
- `src/lib/ai/anthropic.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`

## Current Repo State

### Already exists

- `normalizeObservation` determinista llena presencia, citas, source types, competidores declarados e intent, y deja `sentimentLabel`/`sentimentScore` en `unknown`/`null`.
- `enrichFindingWithLlm` puede llenar `sentimentLabel`, `sentimentScore`, `categoryAssociations`, `messageDriftClaims` y `confidence`, pero esta acoplado a Anthropic.
- `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` existe y esta default OFF.
- El report ya agrega `sentimentSummary`; cuando no hay labels resueltos devuelve `sin_dato`.

### Gap

- No hay router de proveedor para prose extraction.
- No hay eval focal que compare Anthropic vs Gemini/OpenAI en sentiment/prose extraction.
- No hay cost ceiling especifico para el paso de extraccion de prosa.
- El default operacional para sentiment real depende de prender un hook Anthropic caro.
- No hay taxonomia gobernada para `categoryAssociations`; esta task solo puede emitir candidatos o categorias mapeadas por `TASK-1272`, no labels libres product-facing.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `normalized_findings` como derivacion recomputable de `provider_observations`.
- Consumidores afectados: scoring, report builder, public/client report surfaces, HubSpot handoff summaries.
- Runtime target: `local|staging|worker|production`

### Contract surface

- Contrato existente a respetar: `NormalizedFinding`, `scoreGraderRun`, `enrichFindingWithLlm`, `PublicGraderReport` leak-proof.
- Contrato nuevo o modificado: `ProseExtractionProvider` + registry/router + provider flags/model config + eval/cost summary.
- Backward compatibility: `gated` — default behavior no cambia hasta que flags se enciendan.
- Full API parity: el extractor vive en el primitive server-side de scoring; todos los consumers reciben findings/report por el mismo reader, no por logica UI.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.normalized_findings` (mismos campos existentes); sin tabla nueva por defecto.
- Invariantes que no se pueden romper:
  - Mismo excerpt + proveedor/version/config → resultado schema-valido o fallback determinista.
  - `grader_score` sigue siendo determinista y no asignado por LLM.
  - Prose extraction no toca citations, sourceTypes, rank ni competidores si no hay evidencia.
  - `unknown` es un resultado valido, no un error.
- Tenant/space boundary: scoring corre server-side sobre runs internos/publicos; no expone raw excerpt al DTO publico.
- Idempotency/concurrency: recomputar un run con la misma `score_version` y `proseExtractionVersion` debe ser estable; si se introduce version nueva, documentar provenance sin recomputar historico a ciegas.
- Audit/outbox/history: no outbox nuevo; registrar modelo/proveedor/version en logs/eval y definir si se requiere provenance persistido antes de default cutover.

### Migration, backfill and rollout

- Migration posture: `none` inicialmente. Si se decide persistir `prose_extraction_provider/version`, debe ser migracion additive y justificada antes del cutover.
- Default state: `flag OFF` / comportamiento actual. Proveedor nuevo empieza en shadow/eval.
- Backfill plan: no backfill automatico. Re-score manual allowlisted para runs de evaluacion solamente.
- Rollback path: flag a OFF o volver provider default a `anthropic`; revert PR si el router falla.
- External coordination: secrets/flags de Gemini/OpenAI ya deben existir o provisionarse por el rail canonico; actualizar ledger y deploy del `ops-worker` si el scoring corre ahi.

### Security and access

- Auth/access gate: hereda `scoreGraderRun` / endpoints internos del grader; no endpoint publico nuevo.
- Sensitive data posture: sin PII; excerpt de answer engine tratado como dato anti prompt-injection.
- Error contract: provider/schema errors capturados con `captureWithDomain('growth')`, nunca raw al cliente.
- Abuse/rate-limit posture: cost ceiling por run/extraction; circuit breaker por proveedor si el costo o error rate excede umbral.

### Runtime evidence

- Local checks: tests unitarios del router + schema validation + fallback deterministic.
- DB/runtime checks: re-score de runs fixture/locales y comparacion de `sentimentSummary`/`message_alignment` antes/despues.
- Integration checks: smoke low-volume con Gemini/OpenAI candidate en staging, con gasto acotado.
- Reliability signals/logs: signal o log estructurado para `prose_extraction_provider_error`, `prose_extraction_schema_invalid`, `prose_extraction_cost_estimate`.
- Production verification sequence: shadow staging → eval gates → flip staging default → smoke report → prod gated junto a EPIC-020.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no nueva capability de negocio. La task modifica un primitive interno (`scoreGraderRun` → prose extraction) consumido por los readers/reports existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Prose extraction port + router, behavior-preserving

- Extraer el contrato `ProseExtractionProvider` y un registry/router desde el hook actual.
- Mantener Anthropic como adapter compatible y fallback; `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED=false` conserva behavior actual.
- Agregar tests de fallback: flag OFF, provider missing secret, schema invalido, excerpt vacio, provider throws.

### Slice 2 — Low-cost provider candidates + flags

- Implementar adapters candidatos con clientes canonicos: `gemini-flash-lite`/modelo vigente via `src/lib/ai/google-genai.ts` y `openai-nano`/modelo vigente via `src/lib/ai/openai.ts`.
- Agregar flags/config: provider default, allowlist de providers, modelo por provider, max tokens, budget ceiling por extraction.
- Registrar flags en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Slice 3 — Eval/cost harness + cutover decision

- Extender el eval runner para comparar providers sobre sentiment/prose extraction usando `golden-set.v1.json` y fixtures adicionales si hace falta.
- Reportar precision por campo, tasa de `unknown`, schema-valid rate, latencia y costo estimado por run.
- Definir decision documentada: `gemini` / `openai` / `anthropic` / no cutover, con default en staging solo si los gates pasan.

## Out of Scope

- Recalibrar `ai_visibility_score_v1` o cambiar pesos.
- Publicar reportes automaticamente por sentimiento.
- Cambiar prompt packs de answer-engine providers.
- UI de configuracion de proveedor.
- Backfill masivo de runs historicos.

## Detailed Spec

El extractor debe producir el mismo shape que hoy devuelve `enrichFindingWithLlm`: `brandMentioned`, `sentimentLabel`, `sentimentScore`, `categoryAssociations`, `messageDriftClaims`, `confidence`. El router recibe el finding determinista, la observation y el contexto `{ subjectBrand, subjectDomain }`; selecciona provider segun flags y presupuesto; valida schema; sanitiza arrays; y si algo falla retorna el finding determinista intacto. La salida debe incluir metadata interna suficiente para evaluacion (provider/model/version/cost estimate), sin contaminar el DTO publico.

Para categorias, el extractor puede producir **raw category candidates** con evidencia, pero el dominio solo puede publicar o puntuar `categoryAssociations` si pasan por la taxonomia gobernada de `TASK-1272`. Hasta entonces, las categorias del proveedor deben quedarse internal-only, `unknown`, o `needs_review`; no pueden alimentar `category_ownership` fuerte ni copy del reporte publico como verdad de producto.

### Sentiment methodology contract

La metodologia aceptada para V1 es **structured sentiment extraction over answer-engine excerpts**, no `sentiment analytics` estadistico ni inferencia reputacional amplia. La unidad de analisis es una respuesta/excerpt de un answer engine, y el objetivo es clasificar el **sentimiento hacia la marca sujeto** cuando la evidencia lo permite.

Reglas metodologicas obligatorias:

- El extractor debe separar explicitamente `sentiment toward subject brand` de `general tone of the answer`. Una respuesta cordial, util o optimista no es `positive` si no evalua positivamente a la marca sujeto.
- `sentimentLabel` es la senal primaria para V1. `sentimentScore` es auxiliar/no calibrado hasta que exista evidencia de calibracion; no debe usarse como threshold fuerte de producto sin decision adicional.
- `unknown` es correcto cuando la marca no aparece, cuando la respuesta solo lista opciones sin juicio, o cuando el tono positivo/negativo no se dirige claramente a la marca sujeto.
- `mixed` se reserva para evidencia real de pros y contras sobre la marca sujeto, no para incertidumbre del modelo. Incertidumbre = `unknown` o baja `confidence`.
- El prompt debe pedir evidencia conservadora y tratar el excerpt como dato anti prompt-injection; ninguna instruccion dentro del excerpt puede alterar el schema ni el comportamiento.
- El reporte publico solo puede mostrar agregados factuales (`positive|neutral|negative|mixed|unknown` count/net), no editorializaciones ni claims reputacionales sobre competidores.
- Antes de elevar sentimiento a evidencia material de producto, debe existir eval focal de false positives/false negatives y decision documentada sobre thresholds.

El eval compara al menos:

- exactitud de `sentimentLabel` contra golden expected.
- false positives de sentimiento positivo/negativo cuando el excerpt solo tiene tono general.
- false negatives cuando existe juicio claro sobre la marca sujeto.
- preservacion de `unknown` cuando corresponde.
- drift claims no vacios solo cuando hay evidencia.
- schema-valid response rate.
- costo estimado por run light/full.
- exactitud de category candidates solo como input de `TASK-1272`; ningun candidato libre cuenta como categoria product-facing.

El cutover debe ser evidencia-first: no basta con que un proveedor sea mas barato; debe mantener calidad aceptable y degradar honestamente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (port/router behavior-preserving) → Slice 2 (provider candidates + flags) → Slice 3 (eval/cost + cutover decision). No prender default nuevo antes de Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Provider barato baja calidad y clasifica sentimiento erroneo | data quality | medium | golden eval + `unknown` conservative + staging-only first | eval mismatch / review_required spike |
| Costo sube por retries o output largo | cost/reliability | medium | max tokens + budget ceiling + circuit breaker | `prose_extraction_cost_estimate` |
| Provider/schema falla y rompe scoring | scoring | low | fallback determinista intacto + tests de thrown/schema invalid | `prose_extraction_schema_invalid` |
| Drift de provenance si se re-scorean runs historicos | reporting | medium | no backfill automatico; versionar extractor antes de cutover | score/report diff inesperado |
| Excerpt prompt-injection afecta extractor | safety | low | system prompt anti-injection + schema validation + no tool/action capability | provider output rejected |

### Feature flags / cutover

- Existing: `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` controla si hay extraccion de prosa.
- New proposed:
  - `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER` (`anthropic|gemini|openai`, default `anthropic` or unset behavior-preserving).
  - `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_SHADOW_ENABLED` (default `false`) para comparar sin persistir.
  - Provider/model overrides por env si el cliente canonico los soporta.
- Cutover: shadow staging → persist staging → prod only via EPIC-020 release gate. Revert: set provider back to `anthropic` or disable `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; no data migration | <5 min | si |
| Slice 2 | flags OFF / provider unset / revert PR | <5 min | si |
| Slice 3 | no runtime cutover if eval fails; revert default flag | <5 min | si |

### Production verification sequence

1. Local unit/eval verde con Anthropic behavior-preserving.
2. Staging shadow with low-cost providers on a tiny allowlist of runs.
3. Compare eval summary and cost estimate; document cutover decision.
4. Flip staging provider default if gates pass; score a controlled run; verify `sentimentSummary` and `message_alignment`.
5. Production remains OFF unless EPIC-020 release gate explicitly includes the flip.

### Out-of-band coordination required

- Confirm current official pricing/model names at execution time (provider prices drift).
- Provision/verify provider secrets and worker env vars if staging smoke uses Gemini/OpenAI.
- Product/sign-off on quality threshold for switching default.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `enrichFindingWithLlm` delegates through a provider-agnostic router while preserving current behavior when all new flags are OFF.
- [ ] Anthropic remains available as compatible fallback; Gemini/OpenAI low-cost candidates are implemented using canonical clients only.
- [ ] Provider/model/flag config is documented and registered; no raw provider SDK/fetch is introduced in the grader domain.
- [ ] Golden eval reports sentiment/prose quality, schema-valid rate, latency and cost estimate per provider.
- [ ] Sentiment methodology is tested as `sentiment toward subject brand`, not general answer tone; `unknown`/`mixed` semantics are covered by fixtures.
- [ ] `sentimentScore` is treated as auxiliary until calibrated; product/report logic uses label/count/net semantics unless a documented calibration decision says otherwise.
- [ ] `categoryAssociations` product-facing quedan mapeadas por `TASK-1272` o degradan a `unknown` / `needs_review`; ningun string libre de proveedor alimenta `category_ownership` fuerte ni reporte publico.
- [ ] Cutover decision is documented; default provider changes only if quality/cost gates pass.
- [ ] Scoring remains deterministic from persisted findings; `grader_score` is never assigned by an LLM.
- [ ] Failure path returns the deterministic finding intact and captures sanitized growth-domain errors.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/growth/ai-visibility`
- `pnpm growth:ai-visibility:smoke` with extraction OFF (behavior-preserving)
- Provider eval/smoke low-volume in staging with explicit budget cap
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` actualizado si se agregan flags
- [ ] arquitectura/calibracion actualizadas con la decision de cutover
- [ ] chequeo de impacto cruzado: TASK-1237, TASK-1246, TASK-1248, TASK-1250, TASK-1265

## Follow-ups

- Persistir provenance de `prose_extraction_provider/model/version` si los reportes publicos empiezan a depender de sentimiento como evidencia material.
- Score V1.1 que use sentiment/prose coverage solo cuando haya volumen productivo y holdout suficiente.

## Open Questions

1. ¿Default candidato inicial: Gemini Flash-Lite por costo/GCP governance, u OpenAI nano por structured output/tooling? Propuesta: evaluar ambos en Slice 3 y no decidir por intuicion.
2. ¿El shadow debe llamar dos providers por run o solo en eval allowlisted? Propuesta: eval allowlisted para no duplicar costo en runs normales.
