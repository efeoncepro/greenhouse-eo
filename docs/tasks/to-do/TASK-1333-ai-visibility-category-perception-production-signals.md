# TASK-1333 — AI Visibility Category Perception Production Signals

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data|public-site`
- Blocked by: `TASK-1331 complete; Think category renderer exists locally`
- Branch: `task/TASK-1333-ai-visibility-category-perception-production-signals`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el gap para que la seccion `06 · Categoria percibida` aparezca con datos reales en el informe publico AI Visibility, no solo con mock local. El renderer Think ya puede mostrar la seccion cuando Greenhouse envia `categoryTaxonomySummary.status='mapped'`; esta task debe hacer que los runs/snapshots reales produzcan asociaciones canonicas de categoria desde evidencia medible, con no-leak, compatibilidad y control de scoring.

## Why This Task Exists

El reporte visible ya tiene una seccion de categoria profesional y entendible, pero los tokens reales actuales pueden llegar con:

```json
{
  "categoryTaxonomySummary": {
    "status": "unknown",
    "categories": [],
    "totalSignals": 0
  }
}
```

Eso no es un problema de UI: Think ya sabe pintar la seccion si el backend entrega categorias canonicas. El gap vive en el pipeline de datos del grader: `NormalizedFinding.categoryAssociations` no siempre se pobla en runs reales, aunque Greenhouse ya tiene taxonomia, mapper y summary public-safe.

Sin esta task, la seccion aprobada queda invisible o en empty state en produccion. La solucion no puede ser mockear categorias en Think ni escribir narrativa local; debe venir de Greenhouse como source of truth.

## Goal

- Diagnosticar por que los runs reales producen `categoryTaxonomySummary.status='unknown'` aunque exista taxonomia y mapper.
- Poblar `NormalizedFinding.categoryAssociations` con IDs canonicos o candidatos mapeables desde evidencia real, sin exponer raw excerpts ni strings internos.
- Garantizar que `categoryTaxonomySummary` agregue datos public-safe suficientes para que Think renderice la seccion final: categorias, niveles, labels, conteos, total signals y estado honesto.
- Preservar el algoritmo de scoring: no cambiar pesos, formulas ni dimensiones; si los scores cambian en runs nuevos, debe ser solo por evidencia de entrada nueva y quedar evaluado/documentado.
- Mantener compatibilidad con snapshots viejos: `unknown` sigue siendo valido y no debe romper el render.
- Verificar con route/model tests, no-leak tests, fixtures con categoria mapeada y smoke con un token real o run nuevo.

## Delta 2026-07-04 — Arch review (arch-architect): diagnóstico CONFIRMADO + reframe

> Revisión con `arch-architect` (overlay Greenhouse) sobre código + **DB real** (`greenhouse-pg-dev`). El
> Slice 1 (diagnóstico) queda esencialmente RESUELTO acá; esto reencuadra el alcance real de la task.

### Diagnóstico confirmado (ya no hipótesis)

- **`categoryAssociations` se pobla SOLO por la capa prose/LLM extraction** (`prose-extraction/router.ts:104`
  → `if (!isLlmExtractionEnabled()) { return vacío }`; `llm-extraction.ts:67` mapea candidatos → IDs
  canónicos). El **normalizer determinista NO extrae categorías** (normalizer.ts:192). Flag:
  `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`, **default OFF**.
- **DB real (2026-07-04):** `category_associations` (columna `text[]`) vacío en el **100% de los findings de
  los 8 runs** (`with_cats=0`); los 8 snapshots públicos → `categoryTaxonomySummary.status=null`. → la
  extracción estuvo OFF en esos runs.
- **El mapper + builder + agregación FUNCIONAN:** un snapshot tiene 5 categorías mapeadas +
  `totalSignals=17`, `ambiguousCount=1` (`sector:marketing_services`, `category:aeo_ai_visibility`, …). → el
  bloqueo **NO está** en taxonomy/mapper/builder. El builder ya produce `unknown` honesto desde vacío.

### Reframe arquitectónico (lo más importante)

El `unknown` de categoría es un **SÍNTOMA de que la capa de extracción prose/LLM está apagada.** "Hacer
visible la categoría" = **encender esa capa**, que NO es un fix quirúrgico de categoría:

- **Multi-señal (clave):** el MISMO flag/capa puebla `categoryAssociations` **+ `sentimentLabel` +
  `messageDriftClaims` + `brandRank`** (normalizer.ts:192). Encenderlo activa/cambia **`category_ownership`,
  `message_alignment`, sentiment y posición** a la vez → cambio de comportamiento del grader AMPLIO, no
  "solo categoría".
- **Cost-bearing:** extracción = una llamada a provider POR finding POR run → **costo recurrente en cada
  run** (respetar cost-cap + circuit breaker existentes).
- **Scoring:** dimensiones hoy `null` (excluidas del promedio) pasan a medidas → el **OVERALL score cambia
  en runs nuevos** (por evidencia nueva, no por fórmula). Discontinuidad honesta con snapshots viejos
  (congelados/inmutables) → dos bases de score coexistiendo. El operador debe saberlo.
- **Es una decisión de ROLLOUT (EPIC-020/021), no de código:** el flag ya está **ON en staging / OFF en
  prod** (FEATURE_FLAG_STATE_LEDGER). La categoría en prod viaja con el **MISMO release develop→main + flip**
  que el resto del stack del grader — no es un fix aislado que se prende solo.

### Alcance de código REAL (contingente, casi nulo)

El pipeline ya funciona cuando la extracción corre. El código a tocar es **contingente al Discovery con
extracción ON**: si algunas marcas dan candidatos que no mapean (unmapped/ambiguous alto), **agregar aliases
de taxonomía CON eval** (no labels one-off). **Prohibido** "arreglar" tocando pipeline/scoring/normalizer o
mockeando categorías. Si Discovery confirma que basta prender el flag, el Slice 2 de código puede quedar
VACÍO y la task colapsa a: evidencia en staging + hardening de aliases si hay gaps + gate de rollout.

### Gate de scoring AMPLIADO (hard requirement)

El golden-set eval NO es "categoría cambia category_ownership". Debe cubrir el **delta COMPLETO de encender
extracción**: `category_ownership` + `message_alignment` + sentiment + position + el recompute del overall.
Sign-off de score-delta + costo antes del flip productivo. Versión/pesos/fórmula NO cambian.

### Anomalía a confirmar en Slice 1

Hay ≥1 snapshot con categorías baked pero cuyos findings actuales tienen 0 asociaciones (`with_cats=0` en el
run detrás de ese snapshot). Confirmar si la **re-normalización con flag OFF sobreescribe findings previos
con vacío** (bug de pipeline distinto del flag — el snapshot congelado retuvo lo mapeado, pero la tabla se
vació después). Si es así, es un fix de idempotencia/timing, NO de scoring.

### Alternativa (opcional, NO default)

Extracción **determinista** de categoría (keyword/entity → taxonomy, sin LLM, sin costo recurrente) como
camino barato/estable — pero es build nuevo + preguntas de calidad; el diseño intencional es la prose
extraction (perceived category = lo que la IA dice, no ground truth). No perseguir sin decisión explícita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/tasks/complete/TASK-1331-ai-visibility-public-report-viewmodel-contract.md`
- `docs/tasks/complete/TASK-1328-ai-visibility-report-signal-completeness.md`
- `src/lib/growth/ai-visibility/taxonomy/catalog.ts`
- `src/lib/growth/ai-visibility/taxonomy/mapper.ts`
- `src/lib/growth/ai-visibility/taxonomy/resolve-category.ts`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/normalization/prose-extraction/*`
- `src/lib/growth/ai-visibility/normalization/normalizer.ts`
- `src/lib/growth/ai-visibility/scoring/engine.ts`
- `src/lib/growth/ai-visibility/scoring/store.ts`
- `src/lib/growth/ai-visibility/report/builder.ts`
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts`

Reglas obligatorias:

- Greenhouse es source of truth del `ReportArtifactModel`; Think no deriva ni inventa categorias.
- No cambiar pesos, formulas ni scoring version. `scoreCategoryOwnership` puede recibir mejor evidencia, pero no se reescribe sin task separada.
- No tocar probes, provider adapters ni `executeClaimedGraderRun` salvo que Discovery demuestre que el orden de snapshot impide persistir asociaciones; si se toca, justificar y testear como fix de pipeline, no como scoring.
- No publicar candidatos raw, excerpts, prompts, provider answers, URLs completas ni razonamiento interno en el endpoint publico.
- `categoryTaxonomySummary` debe exponer solo IDs canonicos, nivel, label es/en, count, taxonomy version y contadores public-safe.
- Candidatos desconocidos o ambiguos degradan a `unknown`/`needs_review`; no se inventa label de producto.
- Snapshots viejos siguen funcionando con `unknown`.
- Produccion no acepta `mock-token`; para smoke final usar token real o run nuevo generado por el pipeline.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1331` complete/released: Think final renderer consume facts server-derived.
- Existing taxonomy V1 in `src/lib/growth/ai-visibility/taxonomy/**`.
- Existing report builder summary in `buildCategoryTaxonomySummary()`.
- Existing public report route no-leak contract.
- Local Think category section already capable of rendering mapped data.

### Blocks / Impacts

- Unblocks real visibility of section `06 · Categoria percibida` in public reports.
- Impacts future snapshots/runs of AI Visibility Grader.
- May affect future score values only because category evidence becomes present; score algorithm itself must remain unchanged.
- Does not block TASK-1330 short links or TASK-1332 icon library adapter.

### Files owned

- `docs/tasks/to-do/TASK-1333-ai-visibility-category-perception-production-signals.md`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/normalization/prose-extraction/*`
- `src/lib/growth/ai-visibility/taxonomy/**`
- `src/lib/growth/ai-visibility/scoring/store.ts`
- `src/lib/growth/ai-visibility/scoring/command.ts`
- `src/lib/growth/ai-visibility/report/builder.ts`
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts`
- `src/lib/growth/ai-visibility/__tests__/*category*`
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json` only if evidence expectations must be updated with explicit score-delta review
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro` only for compatibility assertion/copy-free consumption if backend contract shape changes additively

## Current Repo State

### Already exists

- `ReportCategoryAssociation` and `CategoryTaxonomySummary` exist in `src/lib/growth/ai-visibility/report/contracts.ts`.
- `buildCategoryTaxonomySummary(findings)` aggregates `NormalizedFinding.categoryAssociations`.
- `src/lib/growth/ai-visibility/taxonomy/**` contains `CATEGORY_TAXONOMY`, mapper and resolver for canonical nodes.
- `llm-extraction.ts` maps prose extraction candidates through `toCanonicalCategoryAssociationIds(...)`.
- The public report route already includes `categoryTaxonomySummary` and no-leak tests cover raw candidate protection.
- Think has a polished category section that can render mapped category rows with mock data.

### Gap

- Real production tokens can still return `categoryTaxonomySummary.status='unknown'` with empty categories.
- It is not yet verified whether the cause is flag state (`GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`), provider answer shape, extraction prompt, mapper coverage, persistence, snapshot timing or report reader compatibility.
- There is no runtime proof that a newly generated real report can produce mapped category associations end-to-end.
- The UI section cannot be considered production-visible until backend snapshots carry category facts.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `greenhouse_growth.normalized_findings.category_associations` + `ReportArtifactModel.model.categoryTaxonomySummary`
- Consumidores afectados: public report API, Think public report renderer, email/PDF/report readers if they surface the same report model
- Runtime target: `local|staging|production|worker`

### Contract surface

- Contrato existente a respetar: `GET /api/public/growth/ai-visibility/report/[token]`, `ReportArtifactModel`, `CategoryTaxonomySummary`, `NormalizedFinding`
- Contrato nuevo o modificado: no breaking contract expected; additive tests/fixtures and possibly stronger extraction/persistence behavior
- Backward compatibility: `compatible` — old snapshots can remain `unknown`; new snapshots may become `mapped`
- Full API parity: public report continues consuming the server-side report builder; no UI-only data path

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `greenhouse_growth.normalized_findings.category_associations`
  - report snapshot/public report payload derived from `readGraderReport`
- Invariantes que no se pueden romper:
  - `category_associations` stores canonical taxonomy IDs for new writes when possible; raw provider strings must not leak to public payloads.
  - Unknown/ambiguous candidates degrade honestly and do not become labels.
  - `null != 0`: absence of category evidence is `unknown`, not a zero score fabricated as fact.
  - Scoring version/weights/formulas remain unchanged.
- Tenant/space boundary: run/report token boundaries already enforced by the grader report reader; no cross-org category aggregation.
- Idempotency/concurrency: re-scoring/re-normalization must be recomputable for the same observations; any backfill/republish path must be dry-run first and idempotent by run id.
- Audit/outbox/history: no new outbox unless the task introduces a republish/backfill command; reliability signal/logging required for extraction coverage and unmapped rates.

### Migration, backfill and rollout

- Migration posture: `none` expected unless Discovery proves schema/index support is missing; existing column already stores category associations.
- Default state: local/staging validation first; production activation requires operator confirmation if flags/env/provider costs are involved.
- Backfill plan:
  - Default: new-runs-only.
  - Optional: dry-run report of existing eligible runs showing category coverage and score deltas before any republish.
  - No silent rewrite of public snapshots without explicit operator approval.
- Rollback path: disable extraction/enrichment flag if applicable, revert PR, or stop republish; old `unknown` snapshots remain valid.
- External coordination: AI provider credentials/flags may be required if LLM extraction is the chosen path; no release without confirming env state and cost posture.

### Security and access

- Auth/access gate: existing token-gated public report route; internal run/report commands remain capability-gated where applicable.
- Sensitive data posture: public-safe aggregate only; no raw provider answer, prompt, excerpt, citation URL, PII or secret in public payload.
- Error contract: extraction failures degrade to `unknown`/empty category facts; no raw errors in public response.
- Abuse/rate-limit posture: no new public write path; if extraction invokes providers, respect existing provider/cost/rate controls.

### Runtime evidence

- Local checks:
  - focal tests for taxonomy mapping, llm extraction merge, report builder, public route contract and no-leak.
  - `pnpm typecheck`, `pnpm lint`, relevant Vitest suite.
- DB/runtime checks:
  - read-only query against a known real run/token to confirm current `category_associations` coverage.
  - new-run smoke in staging/local provider mode that produces at least one mapped category.
- Integration checks:
  - if LLM extraction is enabled, smoke one provider path and verify bounded cost/circuit behavior.
- Reliability signals/logs:
  - extraction coverage/unmapped/ambiguous counts surfaced in logs or an existing reliability channel.
- Production verification sequence:
  - after release approval, generate or use a real token and confirm public API returns `categoryTaxonomySummary.status='mapped'` with categories.
  - verify Think production shows section `06 · Categoria percibida` with mapped rows and no raw labels.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A — this task modifies an existing read/model pipeline, not a new business write capability.
- [ ] The public report remains a server-side reader/model contract; Think stays a consumer.
- [ ] Any optional backfill/republish command must be governed separately with dry-run, idempotency and operator approval.

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

### Slice 1 — Runtime and pipeline diagnosis

- Inspect a real production/staging report token and its source run to confirm `category_associations` state in `greenhouse_growth.normalized_findings`.
- Confirm flag/env state for `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` and any category/extraction-related gates.
- Trace the path: provider observation -> deterministic normalizer -> prose extraction -> canonical taxonomy mapper -> normalized finding persistence -> score/report builder -> public snapshot.
- Identify the exact blocker: extraction not running, provider response insufficient, mapper misses aliases, persistence drops associations, report builder filters too aggressively, or snapshot predates category extraction.
- Document whether enabling category associations changes future `category_ownership` scores because evidence input changes; do not change scoring formulas.

### Slice 2 — Canonical category signal generation

- Implement the minimum backend/data fix proven by Slice 1.
- If extraction is disabled by flag, add a safe activation/readiness plan rather than hardcoding categories.
- If mapper coverage is the blocker, add taxonomy aliases/nodes with eval evidence and tests; do not add one-off labels for a single mock.
- If persistence/snapshot timing is the blocker, fix the pipeline so canonical IDs survive into `normalized_findings` and report snapshots.
- Preserve compatibility for legacy raw candidate strings by mapping on-read where already supported.

### Slice 3 — Contract tests, no-leak and old snapshot compatibility

- Add/extend report builder tests for:
  - mapped categories aggregate into `categoryTaxonomySummary`.
  - unmapped/ambiguous candidates do not leak and set honest counts/status.
  - old snapshots or empty findings return `unknown` safely.
- Add/extend public route tests proving the payload exposes only canonical IDs/labels/counts/version.
- Add no-leak assertions for raw candidate strings, excerpts, prompt text, provider answer text and URLs.
- Add score-delta/eval evidence if category association input changes future scores; algorithm version must remain unchanged.

### Slice 4 — End-to-end visible report proof

- Generate or select a real run/token with mapped category associations.
- Verify API response includes `categoryTaxonomySummary.status='mapped'`, non-empty `categories`, `totalSignals > 0`, and no raw labels.
- Verify local Think renders the approved category section with backend-provided mapped data, not a mocked injection.
- If production rollout is approved, verify `https://think.efeoncepro.com/brand-visibility/r/<token-real>` shows `06 · Categoria percibida` with real mapped rows.

## Out of Scope

- No UI redesign of the category section.
- No icon library work; that is TASK-1332.
- No short-link capability; that is TASK-1330.
- No scoring formula/weight/version change.
- No provider adapter rewrite unless Discovery proves category extraction cannot run through the existing abstraction.
- No silent backfill/republish of old public snapshots.
- No production release without explicit operator confirmation.

## Detailed Spec

### Expected public shape

The public report payload should continue exposing:

```ts
categoryTaxonomySummary: {
  taxonomyVersion: 'category_taxonomy_v1'
  status: 'mapped' | 'unknown' | 'needs_review'
  categories: Array<{
    nodeId: string
    level: 'industry' | 'sector' | 'product_service_category' | 'use_case' | 'buyer_persona' | 'market'
    label: { es: string; en: string }
    count: number
    taxonomyVersion: 'category_taxonomy_v1'
  }>
  totalSignals: number
  unmappedCount: number
  ambiguousCount: number
}
```

Think can render the section when:

- `status === 'mapped'`
- `categories.length > 0`
- `totalSignals > 0`

Think must keep honest empty/coverage behavior when the backend returns `unknown`.

### Data quality floor

A production-visible category row must be supported by at least one normalized finding whose category association maps to an active taxonomy node. The task may set stricter floors during implementation, for example:

- minimum total signals for mapped state,
- cap top categories shown to renderer,
- tie-breaking by count then taxonomy level priority,
- `needs_review` when mapped and ambiguous signals conflict materially.

Any such rule must live in Greenhouse report/model code, not Think.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (diagnosis) -> Slice 2 (signal generation fix) -> Slice 3 (contract/no-leak/compat tests) -> Slice 4 (E2E visible proof).
- Slice 2 MUST NOT ship until Slice 1 identifies the actual blocker.
- Slice 4 production verification MUST NOT happen without explicit release approval.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Category extraction changes future scores by adding evidence | scoring/report | medium | no algorithm change; run eval/golden comparison; document score deltas as input-evidence deltas | score delta report outside expected bounds |
| LLM/prose extraction invents or over-classifies categories | data quality | medium | taxonomy mapper only publishes canonical IDs; unknown/ambiguous degrade; tests with adversarial candidates | high unmapped/ambiguous rate |
| Raw provider/candidate text leaks to public report | public API | low | route no-leak tests and JSON forbidden-string assertions | no-leak test failure |
| Existing snapshots break or disappear | public report | low | preserve `unknown` state and old snapshot compatibility tests | 500 or missing section on old token |
| Provider cost/latency increases if extraction is enabled broadly | worker/integration | medium | flag/cost cap/staging smoke; batch size and timeout review | worker lag/cost signal |

### Feature flags / cutover

- Existing flag likely involved: `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`.
- Default rollout: validate locally/staging first; production flag or release change only with operator confirmation.
- If no flag change is needed and fix is mapper/persistence-only, cutover is additive on deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No runtime change; revert docs/diagnostic notes if needed. | <10 min | si |
| Slice 2 | Disable extraction flag if used, or revert mapper/persistence PR. | <30 min + redeploy if flagless | si |
| Slice 3 | Tests only; no runtime rollback. | N/A | si |
| Slice 4 | Stop rollout; do not republish affected snapshots; revert/flag off if production changed. | <30 min | si |

### Production verification sequence

1. Run local/focal tests and build.
2. Confirm a staging/local real-provider run produces canonical category associations.
3. Confirm public API for the resulting token returns `mapped` category summary and passes no-leak.
4. Confirm Think local renders section `06 · Categoria percibida` using backend response, not mock injection.
5. With explicit operator approval, release Greenhouse and Think if needed.
6. Generate/use real production token and verify:
   - API `modelVersion` remains compatible.
   - `categoryTaxonomySummary.status='mapped'`.
   - Think production shows the section.
   - no raw backend labels or raw provider text are visible.

### Out-of-band coordination required

- Potential provider/env/flag coordination for LLM extraction.
- Potential operator approval for any production flag flip, provider-cost increase or snapshot republish.
- No HubSpot/Vercel/DNS change expected unless production deployment is approved.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Real cause of `categoryTaxonomySummary.status='unknown'` for current real tokens is documented from runtime/code evidence.
- [ ] New runs can produce canonical `categoryAssociations` that map to taxonomy IDs without raw candidate leakage.
- [ ] Public report route returns `categoryTaxonomySummary.status='mapped'` for at least one real/new run token.
- [ ] Old snapshots with empty categories still return `unknown` and render without failure.
- [ ] No scoring algorithm, weights, score version, probes, normalizer contract or provider adapters are changed without explicit justification; any score delta comes from new input evidence and is evaluated.
- [ ] No raw prompts, provider answers, excerpts, full citation URLs, raw candidates or internal labels leak through API or Think.
- [ ] Think local visible report renders section `06 · Categoria percibida` from backend data, not mock injection.
- [ ] If production rollout happens, a real production token shows the section in `https://think.efeoncepro.com/brand-visibility/r/<token-real>`.

## Verification

- `pnpm task:lint --task TASK-1333`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `pnpm typecheck`
- `pnpm lint`
- Focal Vitest:
  - `src/lib/growth/ai-visibility/__tests__/category-taxonomy.test.ts`
  - `src/lib/growth/ai-visibility/__tests__/llm-extraction-merge.test.ts`
  - `src/lib/growth/ai-visibility/__tests__/report-builder.test.ts`
  - `src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts`
  - no-leak tests under `src/lib/growth/ai-visibility/__tests__/*leak*.test.ts`
- Runtime read-only DB query for normalized finding category coverage.
- Real/new report token smoke against public API.
- Think local visual check at `http://127.0.0.1:4322/brand-visibility/r/<token-or-fixture>` with backend-provided mapped categories.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible o pipeline de datos
- [ ] arquitectura del grader/headless report queda actualizada si cambia el contrato operativo de categoria
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1328, TASK-1329, TASK-1331, TASK-1332 y TASK-1330

## Follow-ups

- Si el renderer necesita copy adicional para `needs_review`, crear follow-up `ui-ux` en Think en lugar de derivarlo localmente.
- Si se decide re-publicar snapshots historicos para mostrar categoria, crear task backend-data separada con dry-run/backfill/rollback.
- Si la taxonomia necesita crecer por industria/mercado, crear eval set y taxonomy update task separada para evitar ajustes oportunistas.

## Open Questions

> Nota 2026-07-04: el Delta arch de arriba ya CONFIRMÓ el camino: la categoría (y sentiment/messageDrift/
> rank) dependen de la capa prose/LLM extraction gateada por `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED`
> (OFF en los runs de la DB). El taxonomy/mapper/builder funcionan. Lo que queda NO es "qué camino", sino
> las decisiones de rollout de abajo.

- **Rollout/costo/scoring:** ¿el operador aprueba encender la capa de extracción en prod (vía el release de
  EPIC-020/021) sabiendo que (a) agrega costo de provider por-finding en cada run, y (b) cambia el overall
  score de runs nuevos —category_ownership + message_alignment + sentiment + position—? Requiere golden-set
  eval del delta completo + sign-off de costo antes del flip.
- **new-runs-only vs backfill:** ¿primer rollout `new-runs-only` (snapshots viejos siguen `unknown`, honesto)
  o el operador quiere un republish/backfill gobernado (task backend-data aparte, dry-run/idempotente)?
- **Anomalía de re-normalización:** ¿la re-normalización con flag OFF vacía `category_associations` de runs
  que antes las tenían? Si sí, fix de idempotencia/timing (no de scoring), a confirmar en Slice 1.
