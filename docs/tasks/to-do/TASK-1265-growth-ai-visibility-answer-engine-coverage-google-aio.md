# TASK-1265 — Growth AI Visibility: Answer-Engine Coverage Expansion (Google AI Overviews / AI Mode)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno — DataForSEO connection prep done; provider implementation pending`
- Rank: `TBD`
- Domain: `growth|ai|integrations|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1265-growth-ai-visibility-answer-engine-coverage-google-aio`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El grader consulta hoy 4 answer engines vía API LLM (OpenAI, Anthropic, Perplexity, Gemini) pero **no mide Google AI Overviews / AI Mode**, que es ~48-50% de las búsquedas y la superficie de respuesta más grande que existe. Esta task agrega Google AI Overviews (y opcionalmente Copilot) como **provider adapter gobernado** detrás de flag, extendiendo el adapter interface canónico de TASK-1226 — sin paralelizar el run-engine.

## Why This Task Exists

`Gemini API ≠ Google AI Overviews`: distinto retrieval, distintas citas, distinta mecánica. La data dura (skill `seo-aeo`, as-of 2026-06): solo ~11% de los dominios citados se solapan entre motores → cada motor es un canal aparte. Una marca puede scorear bien en ChatGPT/Perplexity y ser **invisible en Google AI Overviews**, que es donde está el volumen de búsqueda real. Para un lead magnet que se vende como "tu visibilidad en IA", omitir la superficie de Google es un hueco de credibilidad del producto, no un detalle.

## Goal

- Agregar un provider adapter `google_ai_overview` (y, si el costo lo permite, `copilot`) que captura la respuesta de AI Overviews / AI Mode para los prompts del pack, vía una fuente gobernada (SERP/answer-engine API de terceros), NO scraping crudo.
- Normalizar su salida al mismo `GrowthAiVisibilityProviderObservation` canónico (brand mention, citas, sentiment, competidores), reusando el pipeline de normalización/scoring existente sin lógica paralela.
- Gating + cost guard + parser lock + golden eval para que la cobertura nueva sea barata de revertir y honesta cuando el motor no responde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §6 providers, §7 scoring, §13 privacy/security, §17 observability.
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — invariantes de LLM providers / secret resolution server-side.
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — adapter interface + policy + cost guard + flags default-OFF.
- `docs/tasks/complete/TASK-1228-growth-ai-visibility-discovery-eval-spike.md` — provider adoption spike + parser lock.

Reglas obligatorias:

- **Extender el adapter interface canónico** (`src/lib/growth/ai-visibility/providers/`), NUNCA un cliente paralelo. El nuevo provider implementa el mismo contract que OpenAI/Anthropic/Perplexity/Gemini y se registra en el adapter registry.
- **Fuente gobernada, no scraping crudo de Google.** AI Overviews no tiene API oficial: usar un SERP/answer-engine API de terceros (DataForSEO / Serper / SerpAPI [verificar cuál se contrata]) que devuelva el bloque de AI Overview + sus citas. El secreto del provider se resuelve server-side vía `*_SECRET_REF` + Secret Manager (grant `secretAccessor` al SA runtime), NUNCA hardcode.
- **Honest degradation (regla del grader):** si el motor no responde o la fuente no trae bloque AI Overview, la observation es `status=failed|skipped` con `error_code`, NUNCA un succeeded vacío que contamine el score. El run degrada con evidencia observable.
- **Cost guard + policy:** el provider nuevo entra al policy resolver con su propio costo por observación + tier-down en modo `light`; respeta el budget ceiling global/per-run. No gastar cobertura nueva sin acotar.
- **No PII a la fuente externa:** solo brand/market/prompt; nunca email del lead ni datos consentidos.
- **No flips ad-hoc en prod:** flag default OFF + shadow en staging antes de cualquier activación.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `src/lib/growth/ai-visibility/providers/contracts.ts` [verificar path exacto del adapter interface]
- `src/lib/growth/ai-visibility/policy.ts`
- `src/lib/growth/ai-visibility/cost.ts`

## Dependencies & Impact

### Depends on

- `TASK-1226` — adapter interface, policy resolver, cost guard, flags, run-engine.
- `TASK-1228` — provider adoption spike + parser lock methodology.
- Contratación de una SERP/answer-engine API de terceros con bloque AI Overview + secret en Secret Manager (coordinación out-of-band).

### Blocks / Impacts

- Sube la credibilidad del lead magnet de EPIC-020 (cobertura de la superficie de mayor volumen).
- Impacta el costo por run (provider adicional) → revisar budget en `TASK-1240` controls.
- Alimenta `TASK-1268` (citation source breakdown) con un canal de citas más rico (AI Overview suele citar dominios distintos).

### Files owned

- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts` [nuevo]
- `src/lib/growth/ai-visibility/providers/observation-builders.ts` [extender]
- `src/lib/growth/ai-visibility/flags.ts` [extender]
- `src/lib/growth/ai-visibility/cost.ts` [extender]
- `src/lib/growth/ai-visibility/policy.ts` [extender]
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json` [extender]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Adapter registry + interface con OpenAI/Anthropic/Perplexity/Gemini/Fake/Web Search (`src/lib/growth/ai-visibility/providers/`).
- Policy resolver con cost guard + tier-down (`policy.ts`, `cost.ts`).
- Normalización + scoring agnósticos del provider (consumen `GrowthAiVisibilityProviderObservation`).
- Golden eval set + smoke harness (`evals/`).
- Preparatory connection slice (2026-06-27): DataForSEO fue seleccionado como fuente SERP/answer-engine para esta task; el acceso se aprovisiona como Secret Manager ref `greenhouse-dataforseo-api-password` + env `DATAFORSEO_API_LOGIN`/`DATAFORSEO_API_PASSWORD_SECRET_REF`; el cliente canónico vive en `src/lib/ai/dataforseo.ts`. Esto **no** implementa todavía el provider `google_ai_overview`, no toca el adapter registry, no extiende el enum/check DB, no enciende flags y no ejecuta smoke real del grader.

### Gap

- Cero cobertura de Google AI Overviews / AI Mode (la superficie de mayor volumen de búsqueda).
- No hay adapter ni cost model para una fuente SERP/answer-engine de terceros.
- Copilot/Bing tampoco se mide (alcance secundario de esta task).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: provider adapter registry + `provider_observations` (greenhouse_growth)
- Consumidores afectados: run-engine, normalización, scoring, report builder, public lead magnet
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: adapter interface de TASK-1226 (`execute(prompt, ctx) → observation`), `GrowthAiVisibilityProviderObservation`, policy/cost contracts.
- Contrato nuevo o modificado: nuevo provider id `google_ai_overview` (enum extension) + adapter + cost rows + flag.
- Backward compatibility: `gated` (provider default OFF; runs existentes no cambian salvo que el policy lo incluya).
- Full API parity: el provider es otro consumer del run-engine canónico; la cobertura nueva la operan UI/Nexa/MCP por construcción sin lógica nueva.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.provider_observations` (append-only), `grader_runs.requested_providers[]`.
- Invariantes que no se pueden romper:
  - Una observation `succeeded` SIEMPRE tiene bloque de respuesta real; motor sin AI Overview → `failed|skipped` con `error_code`, nunca succeeded vacío.
  - El enum de provider id es ortogonal al status/mode/run-kind (no mezclar dimensiones).
  - Secreto de la fuente resuelto server-only; nunca en logs ni en la observation persistida.
- Tenant/space boundary: dominio público sin sesión; el run no porta PII a la fuente externa.
- Idempotency/concurrency: `provider_request_hash` por prompt×provider; re-ejecución no duplica observation.
- Audit/outbox/history: `provider_observations` append-only (trigger anti-UPDATE/DELETE existente); reliability signal de cobertura/costo.

### Migration, backfill and rollout

- Migration posture: `additive` (extender enum/cost catalog; sin tabla nueva — confirmar si el provider id es enum DB o constante TS [verificar]).
- Default state: `flag OFF` en todos los environments hasta shadow staging verde.
- Backfill plan: N/A (cobertura prospectiva; no se re-corren runs históricos).
- Rollback path: flag `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=false` + redeploy; el provider sale del policy y los runs siguen con los 4 actuales.
- External coordination: contratación + API key del SERP provider en Secret Manager + grant `secretAccessor`.

### Security and access

- Auth/access gate: provider server-side; ningún surface client-side toca la fuente externa.
- Sensitive data posture: sin PII a la fuente; API key crítica vía `*_SECRET_REF`.
- Error contract: errores del provider sanitizados (`captureWithDomain(err, 'growth'...)`); nunca raw provider/secret error al cliente.
- Abuse/rate-limit posture: budget ceiling global/per-run + tier-down; rate-limit de la fuente respetado con backoff.

### Runtime evidence

- Local checks: `pnpm test` focal del adapter + golden eval del provider nuevo; parser lock test.
- DB/runtime checks: smoke real contra la fuente (1 run) + verificar observation `succeeded` con citas pobladas en `provider_observations`.
- Integration checks: smoke del SERP provider con prompt real; verificar parsing del bloque AI Overview + citation domains.
- Reliability signals/logs: `growth.grader.cost.daily_spend` (incremento por provider nuevo), nuevo signal de cobertura por motor [verificar naming].
- Production verification sequence: shadow staging → eval verde → flip flag staging → smoke low-volume → flip prod con budget bajo.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provider adapter + cost/policy/flag

- Implementar `google-ai-overview-adapter.ts` contra el adapter interface canónico; resolver la fuente SERP de terceros server-side vía secret ref.
- Registrar el provider id, su cost row y su flag `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (default OFF); integrarlo al policy resolver con tier-down.

### Slice 2 — Normalización + parser lock + golden eval

- Extender `observation-builders.ts` para parsear el bloque AI Overview + citas → `GrowthAiVisibilityProviderObservation`.
- Agregar caso del provider al golden eval set + parser lock test (honest degradation cuando no hay bloque).

### Slice 3 — Shadow staging + cobertura signal + ledger

- Smoke real low-volume en staging detrás del flag; verificar observation + citas en `provider_observations`.
- Agregar/extender el reliability signal de cobertura por motor + fila en `FEATURE_FLAG_STATE_LEDGER.md` (estado por environment).

### (Opcional) Slice 4 — Copilot/Bing adapter

- Replicar el patrón para Copilot si la fuente lo cubre y el budget lo permite; mismo gating + eval.

## Out of Scope

- Cambiar el scoring model o los pesos de dimensiones (esta task solo agrega un canal de evidencia).
- Construir UI pública del reporte (`TASK-1241`) ni el render del nuevo canal.
- Rollout productivo del lead magnet (gobernado por `TASK-1246`).

## Detailed Spec

El provider de AI Overviews es estructuralmente un adapter más: recibe `(prompt, runContext)`, llama la fuente gobernada, y devuelve una observation normalizada. La diferencia clave vs los 4 LLM directos es que la fuente es un SERP/answer-engine API (no un endpoint chat), así que el adapter mapea el bloque `ai_overview` (texto + `references[]`) de la respuesta a `answer_text` + `citations[]`. El `provider_request_hash` se computa sobre `(prompt_id, provider, query, locale, market)` para idempotencia. Si la respuesta no trae bloque AI Overview (Google no lo mostró para esa query), la observation es `skipped` con `error_code=no_ai_overview_block` — eso es señal honesta de "no apareces", no un fallo del sistema. El costo se modela por request a la fuente (no por token), así que `cost.ts` gana una rama por unidad-de-request.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (adapter+flag) → Slice 2 (normalización+eval) → Slice 3 (shadow staging+signal). No activar el flag en ningún environment antes de que el golden eval del Slice 2 esté verde.
- Slice 4 (Copilot) es opcional y depende de que Slice 1-3 estén cerrados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo no acotado por provider pago | cost/reliability | medium | cost row + budget ceiling + tier-down + flag OFF rollback | `growth.grader.cost.daily_spend` |
| Parsing frágil del bloque AI Overview | robustness | high | parser lock test + golden eval + honest degradation (skipped, no succeeded vacío) | eval rojo / observation skipped rate |
| ToS de la fuente / scraping crudo de Google | legal/integration | medium | usar SERP API contratada, NO scraping directo de google.com | handoff/legal review |
| Secret de la fuente resuelve null silencioso | security | medium | grant `secretAccessor` + verificar consumer real post-rotación | provider "not configured" / 500 |
| Cobertura nueva contamina score con datos vacíos | data quality | medium | honest degradation: failed/skipped excluido del scoring, nunca succeeded vacío | observation status mix |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (default `false` en todos los environments). Flip a `true` solo post-eval verde + shadow staging. Revert: env var a `false` + redeploy. Tiempo de revert: <5 min vía Vercel.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + flag OFF | <5 min | si |
| Slice 2 | revert PR (normalización additive) | <5 min | si |
| Slice 3 | flag OFF; provider sale del policy | <5 min | si |
| Slice 4 | flag Copilot OFF | <5 min | si |

### Production verification sequence

1. Contratar SERP provider + publicar secret en Secret Manager + grant `secretAccessor`.
2. Deploy con flag OFF + verificar runs existentes sin cambio.
3. Flip flag en staging + smoke 1 run real + verificar observation `succeeded` con citas en PG.
4. Golden eval verde + revisar costo del run.
5. Flip flag prod con budget bajo + smoke low-volume + signals steady.

### Out-of-band coordination required

- Contratación del SERP/answer-engine API de terceros + API key.
- Legal/compliance: confirmar que la fuente es ToS-safe (no scraping directo de Google).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El adapter `google_ai_overview` implementa el interface canónico y se registra en el adapter registry sin lógica paralela.
- [ ] El provider corre detrás de `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (default OFF) + entra al policy resolver con cost guard.
- [ ] Una query sin bloque AI Overview produce observation `skipped` con `error_code`, no un `succeeded` vacío.
- [ ] Golden eval + parser lock test verdes para el provider nuevo.
- [ ] Smoke real en staging deja observation `succeeded` con `citations[]` pobladas en `provider_observations`.
- [ ] Secret de la fuente resuelto server-side vía `*_SECRET_REF` con `secretAccessor` verificado; cero hardcode.
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con fila del flag y estado por environment.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke real del provider en staging + verificación PG de la observation

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1240 budget, TASK-1268 citas, TASK-1246 rollout)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- Evaluar AI Mode (conversacional multi-turno) como variante del mismo adapter si la fuente lo expone.
- Rebalanceo de prompt pack si AI Overviews exige queries distintas a las de los LLM directos.

## Open Questions

1. ¿Qué fuente SERP/answer-engine se contrata (DataForSEO / Serper / SerpAPI)? → **Resuelta 2026-06-27:** DataForSEO queda seleccionado como fuente inicial. Prep slice ya dejó cliente canónico + Secret Manager/Vercel env refs, pero el provider `google_ai_overview` completo sigue pendiente.
2. ¿El provider id vive como enum DB o como constante TS? Confirmar en Discovery para decidir si hay migration o solo cambio de código.
