# TASK-1249 — Growth AI Visibility: Calibration + Provider Completion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data-quality|reliability`
- Blocked by: `TASK-1228, TASK-1226`
- Branch: `task/TASK-1249-growth-ai-visibility-calibration-provider-completion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Captura los follow-ups de calidad del motor que quedaron fuera del launch path inmediato: habilitar/verificar Perplexity, cerrar prompt pack v2 y recalibrar pesos/umbrales contra el golden set real. No bloquea el MVP publico, pero reduce riesgo de score fragil y mejora comparabilidad multi-provider.

## Why This Task Exists

`TASK-1228` dejo follow-ups claros: recalibrar pesos con data real, completar Gemini/Perplexity con credenciales, ADR delta Anthropic y prompt pack v2. Gemini ya fue cubierto por `TASK-1233`; Perplexity y la recalibracion siguen sin task dedicada.

## Goal

- Habilitar Perplexity en staging con secret/flag y smoke real low-volume.
- Promover prompt pack v2 con fixes del spike y golden eval actualizado.
- Recalibrar pesos/umbrales del score V1.1 o documentar por que V1 se mantiene.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — provider adapters, scoring, evals.
- `docs/architecture/growth/ai-visibility/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`
- `docs/architecture/growth/ai-visibility/prompt-pack.v1.json`
- `docs/architecture/growth/ai-visibility/golden-set.v1.json`
- `docs/tasks/complete/TASK-1228-growth-ai-visibility-discovery-eval-spike.md`
- `docs/tasks/complete/TASK-1233-growth-ai-visibility-enable-gemini-provider.md`

Reglas obligatorias:

- No cambiar pesos/umbrales sin golden eval antes/despues y versionado de `score_version`.
- No llamar providers directo fuera de `src/lib/growth/ai-visibility/providers/**`.
- Perplexity debe nacer flag-gated y skippable si falta secret.
- No bloquear public launch si la cobertura OpenAI/Anthropic/Gemini cumple el umbral definido por producto.

## Normative Docs

- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md`
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md`

## Dependencies & Impact

### Depends on

- `TASK-1226` — provider adapter foundation.
- `TASK-1228` — spike/golden set/calibration evidence.
- `TASK-1227` — scoring engine versionado.

### Blocks / Impacts

- Mejora precision del AI Visibility Grader y confianza para paid diagnostic.
- Puede alimentar un futuro score version `ai_visibility_score_v1_1`.

### Files owned

- `src/lib/growth/ai-visibility/providers/perplexity-adapter.ts`
- `src/lib/growth/ai-visibility/scoring/config.ts`
- `src/lib/growth/ai-visibility/evals/**`
- `src/lib/growth/ai-visibility/prompt-packs/**`
- `docs/architecture/growth/ai-visibility/**`

## Current Repo State

### Already exists

- Adapter Perplexity en la foundation, pero sin evidencia de rollout real comparable.
- Gemini fue habilitado por `TASK-1233`.
- Golden set V1 existe y scoring V1 usa pesos hipotesis documentados.

### Gap

- Perplexity no esta validado como provider real en staging.
- Prompt pack v2 y recalibracion de pesos/umbrales siguen como follow-up sin task.
- No hay decision versionada sobre mantener V1 vs crear V1.1.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: provider policy, prompt packs, score config/evals
- Consumidores afectados: run engine, scoring, report builder, public lead magnet, admin QA
- Runtime target: `local|staging|external`

### Contract surface

- Contrato existente a respetar: provider adapter interface, `score_version`, prompt pack versioning, golden evals.
- Contrato nuevo o modificado: Perplexity rollout evidence; prompt pack v2; optional score version v1.1.
- Backward compatibility: `compatible` si versionado; breaking prohibido.
- Full API parity: todos los consumers siguen usando run-engine/scoring primitives, sin provider calls directos.

### Data model and invariants

- Entidades/tablas/views afectadas: `prompt_packs`, `provider_observations`, `grader_scores` [verificar persistencia real].
- Invariantes que no se pueden romper:
  - Score deterministico; ningun LLM asigna score final.
  - Cambios de pesos/version no mutan snapshots publicos ya publicados.
  - Provider failures degradan a partial/skip, no rompen todo el run.
  - Cost ceiling se respeta.
- Tenant/space boundary: internal/staging only; no public PII to providers.
- Idempotency/concurrency: evals re-ejecutables; smoke low-volume; no doble gasto innecesario.
- Audit/outbox/history: registrar versiones y evidencia de calibracion en docs/architecture.

### Migration, backfill and rollout

- Migration posture: `none` esperado; additive solo si se versionan prompt packs en DB [verificar].
- Default state: Perplexity flag OFF hasta secret/smoke.
- Backfill plan: no recomputar scores historicos salvo task separada.
- Rollback path: flag Perplexity OFF; mantener score_version anterior.
- External coordination: Perplexity secret, provider quota/cost, staging flags.

### Security and access

- Auth/access gate: internal admin/worker flags; secrets en GCP/Vercel.
- Sensitive data posture: no email/PII a providers; prompts usan brand/category/market.
- Error contract: provider errors sanitizados + `captureWithDomain('growth')`.
- Abuse/rate-limit posture: budget/cost guard del run engine.

### Runtime evidence

- Local checks: eval runner/golden tests.
- DB/runtime checks: staging smoke Perplexity low-volume.
- Integration checks: provider response parsing, citations/search grounding si aplica.
- Reliability signals/logs: provider error/latency/cost/skipped.
- Production verification sequence: no prod en esta task salvo aprobacion separada.

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

### Slice 1 — Perplexity provider completion

- Verificar secret/flag y staging smoke con adapter canonico.
- Ajustar parser si el payload real difiere del contrato esperado.

### Slice 2 — Prompt pack v2

- Incorporar fixes del spike y casos del golden set.
- Versionar prompt pack y mantener V1 reproducible.

### Slice 3 — Calibration decision

- Re-ejecutar golden eval con providers disponibles.
- Proponer score weights/thresholds V1.1 o documentar decision de mantener V1.

## Out of Scope

- Public UI o rollout publico.
- Recomputar snapshots publicos publicados.
- Crear nuevos providers fuera de Perplexity.
- Cambiar report UX.

## Detailed Spec

Esta task endurece el motor despues del MVP: completa el provider set originalmente planteado y convierte el spike empirico en versionado operacional. Todo cambio de prompt/score debe quedar versionado y trazable para que snapshots anteriores sigan siendo reproducibles.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (provider) y Slice 2 (prompt pack) pueden avanzar en paralelo tras discovery; Slice 3 depende de ambos para comparar resultados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Perplexity payload real rompe parser | integration | medium | smoke low-volume + tests fixtures | provider_error_rate |
| Recalibracion cambia scores sin version | data quality | medium | `score_version` nuevo o decision explicita | golden eval diff |
| Costos altos en eval | cost | medium | N acotado + flags + budget | cost_budget_used |
| Public snapshots cambian retrospectivamente | trust | low | snapshots inmutables + versioning | snapshot version audit |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED`
- Prompt/score version deben ser seleccionables/configurados sin romper V1.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Perplexity flag OFF | <5 min | si |
| Slice 2 | usar prompt pack V1 | <5 min | si |
| Slice 3 | mantener score V1 | <5 min | si |

### Production verification sequence

Esta task no activa produccion. Si el operador aprueba activar Perplexity o score V1.1 despues de staging, el cierre debe dejar un follow-up de rollout con: flag actual, version activa, smoke low-volume, rollback a flag OFF/score V1 y evidencia de que snapshots publicos previos no cambiaron.

### Out-of-band coordination required

- Secret/API key Perplexity.
- Budget/quota de provider.
- Product sign-off para score V1.1 si cambia pesos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Perplexity validado en staging o documentado como bloqueado por secret/quota.
- [ ] Prompt pack v2 versionado o decision documentada de no promoverlo aun.
- [ ] Golden eval antes/despues registrado con delta de scores y provider coverage.
- [ ] Cualquier cambio de pesos/umbrales usa `score_version` nuevo o deja V1 intacto.
- [ ] Public snapshots existentes no se modifican.
- [ ] Signals de provider/cost revisadas.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/lib/growth/ai-visibility`
- `pnpm growth:ai-visibility:smoke` [verificar comando vigente]
- `pnpm task:lint --task TASK-1249`
- Staging smoke Perplexity low-volume si secret disponible

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arquitectura/calibration docs actualizados con version/delta

## Follow-ups

- Production rollout de Perplexity o score V1.1 si aprobado.
- Benchmarks por industria/mercado cuando haya volumen.

## Open Questions

1. ¿Perplexity es requisito del MVP publico o mejora P2? Propuesta: P2, no bloquea launch si OpenAI/Anthropic/Gemini cumplen cobertura/costo.
