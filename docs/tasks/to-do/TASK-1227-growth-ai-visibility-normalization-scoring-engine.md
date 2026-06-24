# TASK-1227 — Growth AI Visibility Normalization + Scoring Engine V1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data-quality|ai|reliability`
- Blocked by: `TASK-1226, TASK-1228`
- Branch: `task/TASK-1227-growth-ai-visibility-normalization-scoring-engine`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el segundo bloque del motor AI Visibility: normalizar `provider_observations` en `normalized_findings`, calcular `grader_score` V1 de forma deterministica y versionada, y decidir `completed` vs `review_required`/`insufficient_data` con reglas reproducibles. No crea UI publica, no genera reporte visual final y no escribe en HubSpot.

## Why This Task Exists

`TASK-1226` deja la capa de provider adapters y evidence ledger, pero la evidencia cruda de OpenAI/Perplexity/Gemini no es producto todavia. El valor del grader aparece cuando Greenhouse puede transformar observaciones heterogeneas en findings comparables, score confiable, confidence y reglas de seguridad. Sin esta task, el sistema tendria pipes de providers, pero no un motor de diagnostico auditable.

## Goal

- Definir y materializar el schema/contrato V1 de `normalized_finding` y `grader_score`.
- Implementar normalizers/extractors deterministas-first con fallback LLM solo si queda explicitamente aislado y schema-validado.
- Implementar scoring V1 reproducible por dimension: AI Visibility, Entity Clarity, Category Ownership, Competitive Share of Voice, Citation Quality, Message Alignment y Revenue Intent Coverage.
- Agregar gates de confidence, `insufficient_data` y `review_required` para impedir reportes sobreconfiados o riesgosos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — secciones 7.5, 7.6, 8.3, 8.4, 15, 16, 17 y 19.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md` — decision del grader como lead magnet/control-plane administrado desde Greenhouse.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` — frontera `growth` vs `commercial`/`public_site`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — primitives server-side y full API parity.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.

Reglas obligatorias:

- El score debe ser deterministico, versionado y recomputable desde `normalized_findings`; ningun LLM asigna el score final.
- Provider output es evidencia no confiable: todo extraction output pasa schema validation y puede preservar `unknown`.
- Si la evidencia no alcanza umbral, el resultado es `insufficient_data` o `review_required`, nunca precision falsa.
- No generar reportes publicos ni handoffs HubSpot en esta task.
- No exponer raw provider text en respuestas publicas o logs.

## Normative Docs

- `docs/tasks/to-do/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — dependency directa y source de contracts para `provider_observation`.
- `docs/context/00_INDEX.md`
- `docs/context/02_gtm.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/context/14_modelo-negocio-asaas.md`

## Dependencies & Impact

### Depends on

- `TASK-1226` — debe existir contract/ledger de `provider_observation`, provider ids, prompt ids, run ids y fake/no-op evidence fixtures.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — contract de dimensions/weights y provider observation semantics.

### Blocks / Impacts

- Bloquea el internal report builder y el admin evidence review surface.
- Bloquea el public grader porque el formulario no debe mostrar score sin `grader_score` V1.
- Bloquea HubSpot handoff porque `ai_visibility_score`, `primary_gap` y `recommended_motion` dependen de score/finding confiables.
- Habilita evals de prompt pack y regression gates de calidad.

### Files owned

Paths esperados; el agente debe verificar patrones reales durante Discovery:

- `src/lib/growth/ai-visibility/normalization/**`
- `src/lib/growth/ai-visibility/scoring/**`
- `src/lib/growth/ai-visibility/review-gates/**`
- `src/lib/growth/ai-visibility/evals/**`
- `src/lib/growth/ai-visibility/__tests__/**`
- Migrations bajo el directorio canonico del repo para `greenhouse_growth.normalized_findings` y `greenhouse_growth.grader_scores` si `TASK-1226` no las creo.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` solo si Discovery descubre drift del score contract.

## Current Repo State

### Already exists

- Arquitectura V1 del grader define `normalized_finding`, `grader_score`, dimensiones, pesos y reglas de confidence/review.
- `TASK-1226` esta creada como foundation de provider adapters/evidence ledger.
- Hay patrones existentes de AI signal materialization, schema validation, signals y tests en otros dominios, por ejemplo `src/lib/ico-engine/ai/**`, `src/lib/workforce/contracting/ai/**` y `src/lib/ai-tools/**`.

### Gap

- No existe normalizer del dominio `growth.ai_visibility`.
- No existe score engine V1 ni versioned scoring config.
- No existen tablas/records `normalized_findings` y `grader_scores` salvo que `TASK-1226` los cree primero.
- No existe policy de `insufficient_data`/`review_required` para report auto-release.
- No existe golden/eval baseline para validar extraction y score reproducible.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `growth.ai_visibility` derived findings and scores, schema planificado `greenhouse_growth`.
- Consumidores afectados: future admin UI, public report reader, HubSpot handoff command, Nexa/MCP future readers, eval harness.
- Runtime target: `local` y `staging`; production public exposure queda fuera de scope.

### Contract surface

- Contrato existente a respetar: `ProviderObservation`/run/prompt contracts de `TASK-1226`; architecture sections `normalized_finding`, `grader_score`, scoring dimensions and weights.
- Contrato nuevo o modificado: `NormalizedFinding`, `GraderScore`, score version config, normalization command, scoring command, review gate result.
- Backward compatibility: `gated` — nuevo contract additive y no consumido por publico hasta tasks posteriores.
- Full API parity: la futura UI/admin/public report/Nexa/HubSpot consume readers/commands server-side del motor; no se calcula score en componentes ni endpoints ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `greenhouse_growth.normalized_findings` o equivalente.
  - `greenhouse_growth.grader_scores` o equivalente.
  - `greenhouse_growth.grader_runs` status/score metadata si `TASK-1226` crea la tabla.
- Invariantes que no se pueden romper:
  - `grader_score` se deriva solo de `normalized_findings` + `score_version`.
  - Recalcular el mismo run con el mismo `score_version` produce el mismo score.
  - Evidence gaps quedan como `unknown` o `insufficient_data`; no se inventan rankings/competidores/citations.
  - Competitor/reputation language riesgosa fuerza `review_required`.
  - Public-safe fields y internal-only fields quedan separados aunque la UI todavia no exista.
- Tenant/space boundary: V1 internal/pre-tenant; findings no se comparten entre runs/brands; future tenant linkage debe depender de explicit profile/org mapping.
- Idempotency/concurrency: normalization/scoring idempotente por `(run_id, prompt_id, provider, schema_version, score_version)`; rerun reemplaza o versiona de forma explicita sin duplicar el score vigente.
- Audit/outbox/history: append-only or versioned history for score recalculation; reliability/quality signal por normalization/scoring attempt.

### Migration, backfill and rollout

- Migration posture: `additive` si las tablas no existen; compatible con que `TASK-1226` haya creado parte del schema.
- Default state: `disabled` para public release; command interno/test only.
- Backfill plan: N/A para datos historicos; si `TASK-1226` genera fixtures/observations, correr dry-run local/staging y persistir solo allowlist de test.
- Rollback path: revert PR + disable command/flags; additive tables quedan sin uso o reverse migration segun patron del repo.
- External coordination: N/A — repo/runtime interno; no secrets nuevas si usa fixtures/fake observations.

### Security and access

- Auth/access gate: internal command/reader only; si se expone API admin, usar capability `growth.ai_visibility.run`/`growth.ai_visibility.read` o capability definida por `TASK-1226`.
- Sensitive data posture: provider excerpts pueden contener company/product text; raw provider text no debe filtrarse a logs ni public fields.
- Error contract: canonical errors + `captureWithDomain('growth')` o patron existente; no raw LLM/provider extraction errors.
- Abuse/rate-limit posture: no public endpoint en esta task; command debe tener bounded batch size y timeouts para extraction fallback.

### Runtime evidence

- Local checks: unit tests para extraction, normalization, score config, score reproducibility, insufficient data y review gates.
- DB/runtime checks: migration verify/read smoke si se crean tablas; scoring dry-run sobre fixtures.
- Integration checks: N/A para providers reales; consume observations/fakes de `TASK-1226`.
- Reliability signals/logs:
  - `growth.ai_visibility.normalization_failed`
  - `growth.ai_visibility.score_recompute_failed`
  - `growth.ai_visibility.insufficient_data_rate`
  - `growth.ai_visibility.report_review_required_rate`
  - `growth.ai_visibility.prompt_pack_eval_regression`
- Production verification sequence: N/A para public launch; staging/internal only hasta task de report/admin.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes de findings/score/versionado, tenant boundary e idempotencia cubiertos en tests/docs.
- [ ] Migration/backfill/rollback posture explicita y proporcional.
- [ ] Runtime/DB evidence listada para tables o commands nuevos.
- [ ] Errores canonicos, audit/signal posture y no raw data leaks cubiertos.

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

### Slice 1 — Normalized finding schema + fixtures

- Definir `NormalizedFinding` V1 con schema validation para brand mention, brand rank, competitors, sentiment, category associations, citations, source types, message drift, commercial intent match y confidence.
- Crear fixtures de observations/fake provider outputs basadas en `TASK-1226`.
- Agregar tests que preserven `unknown` cuando evidencia es insuficiente.

### Slice 2 — Normalization engine

- Implementar normalizer determinista-first desde `ProviderObservation` hacia `NormalizedFinding`.
- Agregar extraction fallback solo si esta aislado, bounded, schema-validado y optional; si no se implementa fallback, documentar decision y dejar hook seguro.
- Normalizar citations/domains/source types sin ejecutar links ni seguir instrucciones externas.
- Emitir errores canonicos y signals de normalization attempt/failure.

### Slice 3 — Scoring config V1

- Definir `score_version='ai_visibility_score_v1'` con dimensiones y pesos:
  - AI Visibility: 25
  - Entity Clarity: 15
  - Category Ownership: 15
  - Competitive Share of Voice: 15
  - Citation Quality: 15
  - Message Alignment: 10
  - Revenue Intent Coverage: 5
- Agregar tests de suma de pesos, bounds 0-100, determinismo y score por dimension.

### Slice 4 — Scoring command + persistence

- Implementar command/read primitive para calcular y persistir `grader_score` desde findings.
- Garantizar idempotencia/recompute por `run_id` + `score_version`.
- Crear migration aditiva si las tablas no existen tras `TASK-1226`.
- Separar output interno completo de output public-safe.

### Slice 5 — Confidence, review gates and eval baseline

- Implementar policy de `insufficient_data`, `review_required` y `auto_releasable=false`.
- Agregar golden fixtures para Efeonce/Greenhouse y una marca neutra — promoviendo el `golden-set.v1.json` de `TASK-1228` desde `docs/architecture/growth/ai-visibility/` a `src/lib/growth/ai-visibility/evals/**`.
- Tests de no-overclaiming: score no se emite como definitivo sin provider coverage minima; lenguaje riesgoso/defamatorio fuerza review.
- Emitir/registrar signals de insufficient data y review required rate.

## Out of Scope

- Provider adapters reales y provider smoke (TASK-1226).
- Public landing/form/report.
- Admin UI de evidence review.
- Report builder visual o artifact `grader_report` completo.
- HubSpot properties, sync, deals, contacts o notes.
- Nexa/MCP exposure.
- Legal/privacy copy publica.

## Detailed Spec

### Normalized finding V1

El contrato final puede ajustar nombres a patrones reales, pero debe conservar esta semantica:

```ts
type NormalizedFinding = {
  findingId: string
  runId: string
  promptId: string
  provider: 'openai' | 'perplexity' | 'gemini' | 'manual_import'
  brandMentioned: 'yes' | 'no' | 'ambiguous' | 'unknown'
  brandRank: number | null
  competitorsMentioned: string[]
  sentimentLabel: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown'
  sentimentScore: number | null
  categoryAssociations: string[]
  messageDriftClaims: string[]
  citationDomains: string[]
  sourceTypes: Array<'owned' | 'earned' | 'social' | 'directory' | 'marketplace' | 'news' | 'unknown'>
  commercialIntentMatch: 'yes' | 'no' | 'partial' | 'unknown'
  confidence: number
  schemaVersion: 'normalized_finding_v1'
}
```

### Score V1

Score debe ser recomputable y explainable:

- cada dimension devuelve `{ score, weight, evidenceCount, confidence, reasons[] }`;
- score global = weighted average de dimensiones validas;
- si coverage minimo no se cumple, `score_status='insufficient_data'`;
- si safety/reputation gates fallan, `score_status='review_required'`;
- public-safe output no incluye raw provider excerpts ni prompts completos.

### Minimum gate defaults

Valores iniciales recomendados para tests/fixtures; el agente puede ajustar con rationale:

- minimum successful provider observations: `>= 3` para cualquier score interno;
- minimum prompt families covered: `>= 2`;
- public auto-release: fuera de scope y default `false`;
- confidence range: `0..1`;
- brand rank: `null` si el answer no es lista ordenada clara.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (finding schema/fixtures) -> Slice 2 (normalization engine) -> Slice 3 (score config) -> Slice 4 (scoring command/persistence) -> Slice 5 (confidence/review/evals).
- Slice 4 MUST NOT expose public score routes.
- Slice 5 gates MUST ship before any downstream public/report task can claim auto-release.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Score engañoso por evidencia insuficiente | data quality / public trust | medium | `insufficient_data` gate + provider/prompt coverage tests | `growth.ai_visibility.insufficient_data_rate` |
| LLM/extractor inventa facts o competidores | AI / data quality | medium | deterministic-first, schema validation, preserve `unknown`, review gate | `growth.ai_visibility.normalization_failed` |
| Recompute produce scores distintos | scoring / reliability | low | versioned scoring config + deterministic tests + hash/recompute fixtures | score reproducibility test |
| Competitor/reputation language riesgosa sale sin revision | legal / brand | medium | safety terms + `review_required` default for risky claims | `growth.ai_visibility.report_review_required_rate` |
| Migration conflict with TASK-1226 schema | db / migration | medium | Discovery verifies existing tables; migrations additive and idempotent | migration verify failure |
| Raw provider text leaks into public-safe DTO | privacy / security | low | separate internal/public DTO tests, no raw excerpts in public-safe output | DTO leak test |

### Feature flags / cutover

- No public feature flag is introduced by this task.
- If implementation adds an internal scorer flag, default `false` outside tests/staging.
- Downstream public release remains blocked until report/admin/public tasks explicitly consume this engine.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (types/fixtures only) | <5 min | si |
| Slice 2 | revert PR or disable normalizer command path | <5 min | si |
| Slice 3 | revert score config; previous score versions remain unused | <5 min | si |
| Slice 4 | disable command + revert PR; additive tables remain unused or reverse migration if required | <15 min | si |
| Slice 5 | revert review gate/eval changes; downstream public remains blocked | <5 min | si |

### Production verification sequence

1. Run unit tests for schema, normalizer, scoring config and gates.
2. If migrations exist, apply in local/staging and verify tables/columns/indexes.
3. Run scoring dry-run over fixtures from `TASK-1226`.
4. Verify recompute returns same score for same inputs/version.
5. Verify unsafe/insufficient fixtures return `review_required` or `insufficient_data`.
6. Do not enable public report or HubSpot sync in this task.

### Out-of-band coordination required

N/A — repo/internal runtime only. No provider secrets, HubSpot property changes, legal copy approval or public-site deployment required.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe schema/contract `NormalizedFinding` V1 con validation y tests.
- [ ] Existe normalizer desde `ProviderObservation` hacia `NormalizedFinding` que preserva `unknown`.
- [ ] Existe `score_version='ai_visibility_score_v1'` con dimensiones/pesos versionados y tests de bounds/suma.
- [ ] Existe scoring command/primitive que calcula `grader_score` desde findings, es idempotente y recomputable.
- [ ] Existe policy de `insufficient_data` y `review_required` con tests.
- [ ] Si hay tablas nuevas, migration aditiva + read/verify smoke quedan documentados.
- [ ] Public-safe DTO no contiene raw provider text, prompts completos ni excerpts sensibles.
- [ ] No se crea public UI, report builder visual, HubSpot sync ni Nexa/MCP exposure.
- [ ] Signals/logs de normalization/scoring/review gates quedan implementados o stubbeados con follow-up explicito.

## Verification

- `pnpm task:lint --task TASK-1227`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm typecheck`
- Tests focales de `src/lib/growth/ai-visibility/**`.
- Migration verify/read smoke si se crean tablas.
- Dry-run de scoring sobre fixtures fake de `TASK-1226`.
- `pnpm docs:closure-check` al cerrar si se actualizan docs/arquitectura/handoff.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado si cambia el estado.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1226` y las tasks futuras de report/admin/HubSpot.
- [ ] cualquier score version nuevo quedo documentado con rationale y fixtures.

## Follow-ups

- Task backend-data para internal report artifact / `grader_report` builder.
- Task ui-ux para admin evidence review surface.
- Task backend-data para HubSpot handoff/properties usando score/finding output.
- Task ui-ux/public-site para public grader + tokenized report.
- Task backend-data para prompt-pack eval regression automation.

## Delta 2026-06-24

Re-secuenciamiento tras revisión arquitectónica (arch-architect) del programa del grader. Cambios materiales — el agente que tome esta task DEBE respetarlos:

- **Eval-first (corrige el orden invertido):** los pesos del score y la viabilidad de las dimensiones NO se congelan por adivinanza. `TASK-1228` (Discovery & Eval Spike) corre empíricamente las 7 dimensiones sobre un golden set y recomienda pesos validados + golden eval set V1. **Slice 3 (scoring config) consume esos pesos calibrados; Slice 5 adopta el golden set de 1228** en vez de construirlo al final. Por eso `Blocked by` ahora incluye `TASK-1228`.
- **Modelo de varianza (gap nuevo):** el input (respuestas LLM) es no-determinista y deriva día a día. "Determinista" aquí = **agregación determinista sobre evidencia muestreada**, NO estabilidad del resultado entre runs. El motor DEBE definir estrategia de muestreo (N corridas por prompt) y reportar **rango/confianza**, no solo un punto. La calibración de N y del framing de confianza sale de `TASK-1228` Slice 4. Sin esto, un score que oscila destruye la confianza del prospecto.
- **Decisión de extracción (supuesto a validar):** "determinista-first con fallback LLM" es hipótesis, no hecho. `TASK-1228` Slice 5 prueba determinista vs LLM sobre evidencia real; si la prosa libre exige LLM-primary, este motor lo adopta (aislado + schema-validado), aceptando el costo/no-determinismo que eso reintroduce. No congelar el framing determinista-first sin esa evidencia.
- **Score como hipótesis hasta eval:** mantener el gate de no-overclaiming alineado con el `revisit when` del ADR (primeros runs predictivos); los pesos son hipótesis calibradas, revisables si la evidencia productiva contradice.

## Open Questions

1. El fallback LLM de extraction, si se implementa, ¿debe usar el mismo provider adapter layer de `TASK-1226` o una primitive AI interna compartida?
2. ¿El score V1 debe normalizar competitividad contra competidores declarados solamente o tambien contra competidores detectados por providers?
3. ¿El primer `review_required` policy debe ser conservador para todo sentimiento negativo o solo para negative + low confidence / defamatory phrasing?
