# TASK-1292 — AEO: eval golden-set por arquetipo + drift signals

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `command`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1290`
- Branch: `task/TASK-1292-aeo-multi-archetype-eval-golden-set`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Eval-driven: extiende el golden-set del grader (hoy calibrado solo sobre "agencias de marketing en Chile") a **múltiples arquetipos** — aerolínea de consumo (SKY), SaaS B2B, retail/e-commerce — para que un cambio del generador de prompts (TASK-1290) sea regression-tested y no vuelva a producir un falso-0. Es la red de seguridad que permite reabilitar el cross-sell (TASK-1291) con confianza. Cierre de la calidad de EPIC-021.

## Why This Task Exists

`evals/golden-set.v1.json` fija casos solo del ICP agencia. Sin casos multi-arquetipo, nada impide que un futuro cambio de prompts re-rompa el caso consumo (SKY). La regla canónica del repo (eval-driven AI design: ningún cambio de prompt/agente sin eval baseline + regresión) exige cubrir los arquetipos que el motor ahora soporta.

## Goal

> **Decisión de diseño (análisis multi-skill arch/seo/commercial 2026-06-29): la eval son DOS capas ortogonales, no una.** El task original conflacionaba "cobertura del generador" (determinista) con "presencia real en el LLM" (no-determinista) en un único "golden-set v2 con presencia esperada" como CI pass/fail — esa es la trampa que el propio task advertía (eval frágil por LLM). Se separan explícitamente:

- **Capa A — eval de cobertura del generador (DETERMINISTA · CI gate · drift signal).** Para cada arquetipo, `resolveArchetypeBaselinePack(businessModel)` (función PURA) debe cubrir las etapas de buyer-intent mínimas exigibles **archetype-aware** + framing correcto, **sin fuga de agencia**. Esta es la red de no-regresión real. NO usa LLM, NO usa fixtures de "presencia" (scriptear el fake-adapter para "hacer aparecer a SKY" sería tautología: testea el scorer contra tu propio fixture, no el generador).
- **Capa B — smoke real allowlisted (EVIDENCIA, NO gate de CI).** Un run real SKY consumo score ≠ 0 valida el claim end-to-end, pero es no-determinista → es evidencia acotada (allowlisted + sin gasto en CI), NUNCA un pass/fail que pueda bloquear merges.
- **Anclaje de no-regresión agencia = DOS invariantes + 1 wiring** (no uno): (1) identidad referencial `resolveArchetypeBaselinePack('b2b_service_provider') === GROWTH_AI_VISIBILITY_PROMPT_PACK_V1`; (2) `runGoldenEval` sobre `golden-set.v1.json` sin cambios + `score_version` intacto; (3) wiring: con `GROWTH_AI_VISIBILITY_ARCHETYPE_PROMPTS_ENABLED` ON, `buildExecuteInput` selecciona el pack del arquetipo.
- **Drift signal:** alerta si un arquetipo deja de cubrir sus etapas mínimas (matriz archetype-aware) o si cualquiera de los anclajes agencia cambia.
- **Alcance = los 6 packs shipped + generic** (consumer_b2c, b2b_product_saas, retail_ecommerce, **marketplace, public_institution** + **generic/unknown**), no solo 3. La eval de cobertura es barata y determinista; cubrir solo 3 deja marketplace/public_institution/generic con cero protección de regresión — el mismo modo de falla silenciosa que motivó EPIC-021.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (evals + scoring determinista)
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`

Reglas obligatorias:

- Eval determinista por defecto (fixtures + fake adapter); runs reales solo allowlisted + acotados (patrón existente del grader).
- El caso agencia se mantiene como **anclaje de no-regresión** (su set/score no debe cambiar).
- No medir "exactitud del LLM" como pass/fail rígido — medir cobertura de etapas + framing + presencia esperada en fixtures.

## Normative Docs

- `src/lib/growth/ai-visibility/evals/golden-set.v1.json` (golden-set actual)
- `docs/tasks/to-do/TASK-1290-aeo-archetype-prompt-packs.md` (lo que se evalúa)
- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`

## Dependencies & Impact

### Depende de

- **TASK-1290** (generador por arquetipo) — es lo que se evalúa. Bloqueante.

### Impacta a

- **TASK-1291** (reabilitación del cross-sell) — la eval verde es criterio de reabilitación.
- CI (el eval corre como gate).

### Files owned

- `src/lib/growth/ai-visibility/evals/archetype-coverage-eval.v1.json` (NO `golden-set.v2`: es otra clase de artefacto — `{arquetipo → aserciones de cobertura}`, no `{input → expectedFinding}`. Precedente canónico: `category-taxonomy-eval.v1.json` de TASK-1272). `golden-set.v1.json` se conserva intacto como ancla del scorer.
- `src/lib/growth/ai-visibility/evals/archetype-coverage-eval.ts` (harness `runArchetypeCoverageEval`, PURO; reusa `resolveArchetypeBaselinePack` + `tag-vocabulary`).
- `src/lib/growth/ai-visibility/__tests__/archetype-coverage-eval.test.ts` (suite CI) + test de wiring `buildExecuteInput` flag ON.
- `src/lib/reliability/queries/growth-ai-visibility-archetype-coverage-signals.ts` (drift signal). Espeja los signals growth existentes (`growth-ai-visibility-*-signals.ts`).

## Current Repo State

### Already exists

- `evals/golden-set.v1.json` (casos agencia) + harness/fake adapter (`__tests__/fake-adapter.test.ts`).

### Gap

- No hay casos por arquetipo ni harness que valide el generador multi-arquetipo ni drift signal.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (harness de eval) (+ reliability signal)
- Source of truth afectado: el golden-set (artefacto de eval) — no toca datos de runtime
- Consumidores afectados: CI · TASK-1291 (criterio de reabilitación)
- Runtime target: `local|staging` (eval), no toca production data

### Contract surface

- Contrato nuevo: `runArchetypeCoverageEval(matrix) → { perArchetype: pass/fail, regressionAgency: pass/fail }` (PURO, sin LLM); fixture `archetype-coverage-eval.v1.json`. `golden-set.v1.json` se conserva como ancla del scorer (no se versiona a v2 — es otra clase de artefacto).
- Backward compatibility: `additive` (v1 se conserva como anclaje).
- Full API parity: harness interno (CI/CLI); sin UI.

### Data model and invariants

- Entidades: golden-set JSON (fixtures, no DB).
- Invariantes: el caso agencia debe seguir pasando idéntico (anclaje); cada arquetipo cubre sus etapas; eval determinista.
- Tenant/space boundary: n/a (eval).
- Idempotency/concurrency: determinista.
- Audit/outbox/history: n/a; drift signal sobre cobertura.

### Migration, backfill and rollout

- Migration posture: `repo-only` (no schema).
- Default state: eval corre en CI; drift signal default ON.
- Backfill plan: ninguno.
- Rollback path: revert PR.
- External coordination: validar las expectativas de presencia con casos reales conocidos (SKY aparece para consumo).

### Security and access

- Auth/access gate: n/a (eval interno).
- Sensitive data posture: sin PII (marcas públicas).
- Error contract: el eval falla loud en CI (no swallow).
- Abuse/rate-limit posture: runs reales allowlisted + acotados (no gasto en CI).

### Runtime evidence

- Local checks: `pnpm test` del harness por arquetipo + no-regresión agencia.
- DB/runtime checks: n/a (eval no toca runtime data).
- Integration checks: (opcional, allowlisted) un run real SKY confirma presencia consistente con el fixture.
- Reliability signals/logs: drift signal de cobertura de etapas por arquetipo.
- Production verification sequence: eval verde en CI → habilita el flip de TASK-1291.

### Acceptance criteria additions

- [ ] Golden-set v2 multi-arquetipo + harness nombrados; agencia como anclaje de no-regresión.
- [ ] Eval determinista (fixtures); runs reales allowlisted.
- [ ] Drift signal de cobertura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Matriz de cobertura + `archetype-coverage-eval.v1.json`

- Definir la **matriz archetype-aware `{arquetipo → etapas mínimas exigibles}`** (el contrato real, derivado del JTBD de cada modelo + amplitud de Query Fan-Out). Archetype-aware: `public_institution` NO exige `purchase_intent` (sin transacción comercial); `consumer_b2c` exige `local`, `b2b_product_saas` exige `enterprise`, etc. Cubre los **6 packs + generic**.
- Fixture `archetype-coverage-eval.v1.json`: por arquetipo, etapas mínimas + framing esperado (category-noun) + aserción `noAgencyLeak` + cobertura de fan-out (≥3 de los 4 `PROMPT_FAN_OUT_TYPES`).

### Slice 2 — Harness `runArchetypeCoverageEval` + CI gate (Capa A, determinista)

- `runArchetypeCoverageEval` corre sobre `resolveArchetypeBaselinePack` (PURO, sin LLM/provider) y valida la matriz; integrado a la suite.
- **Anclaje agencia (los 2 invariantes + wiring):** (1) identidad referencial `resolveArchetypeBaselinePack('b2b_service_provider') === GROWTH_AI_VISIBILITY_PROMPT_PACK_V1`; (2) `runGoldenEval` sobre `golden-set.v1.json` sin cambios + `score_version` intacto; (3) wiring `buildExecuteInput` flag ON selecciona el pack del arquetipo.

### Slice 3 — Drift signal de cobertura

- Reliability signal `growth.ai_visibility.archetype_coverage_gap` (cobertura de etapas mínimas por arquetipo vs la matriz). Steady esperado = 0 gaps.

### Slice 4 (opcional, allowlisted) — Capa B: smoke real de evidencia

- Run real SKY consumo consistente con la expectativa (score ≠ 0). **EVIDENCIA, NO gate de CI** — allowlisted + acotado, nunca bloquea merges (no-determinismo del LLM).

## Out of Scope

- El generador de prompts (TASK-1290).
- El gate operador (TASK-1291).
- Medición de Share of Voice IA en producción (eje de medición aparte).

## Detailed Spec

La eval es la red que permite generalizar prompts sin re-romper casos. Determinista por fixtures; el caso agencia es el anclaje de no-regresión del lead magnet; cada arquetipo nuevo trae casos con framing + presencia esperada (SKY consumo → aparece). El eval verde es prerequisito duro para reabilitar el cross-sell (TASK-1291).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (golden-set v2) → S2 (harness+CI) → S3 (drift signal). Bloqueada por TASK-1290.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Eval frágil (falsos rojos por LLM) | growth/CI | medium | fixtures deterministas + no medir exactitud rígida del LLM | flakiness en CI |
| Casos no representativos | growth | medium | validar con marcas reales conocidas + review AEO | eval pasa pero el run real difiere |

### Feature flags / cutover

- N/A — repo-only (eval + CI). El drift signal default ON.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR | <5 min | sí |
| Slice 3 | revert PR | <5 min | sí |

### Production verification sequence

1. `pnpm test` harness verde (multi-arquetipo + no-regresión agencia).
2. (opcional allowlisted) run real SKY consistente con el fixture.
3. eval verde habilita el flip del cross-sell (TASK-1291).

### Out-of-band coordination required

- Review AEO de las expectativas de presencia por arquetipo (marcas reales conocidas).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `archetype-coverage-eval.v1.json` + matriz archetype-aware cubren los **6 packs + generic** (no solo 3); etapas mínimas por arquetipo, framing category-noun, `noAgencyLeak`, cobertura fan-out ≥3/4.
- [ ] Harness `runArchetypeCoverageEval` corre en la suite, **determinista (sin LLM/provider)**.
- [ ] Anclaje agencia: (1) identidad referencial pack v1; (2) `runGoldenEval`/`golden-set.v1` + `score_version` intactos; (3) wiring `buildExecuteInput` flag ON.
- [ ] Drift signal `archetype_coverage_gap` en steady = 0.
- [ ] (opcional/allowlisted) smoke real SKY ≠ 0 como evidencia — NO gate de CI.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (harness de eval por arquetipo + no-regresión agencia)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-021, TASK-1290/1291, ISSUE-110)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (eval multi-arquetipo)

## Follow-ups

- Medición continua de Share of Voice IA en producción por arquetipo (eje de medición, fuera de eval).

## Open Questions

- **La decisión que importa (NO "cuántas marcas"):** la **matriz `{arquetipo → etapas mínimas exigibles}`** archetype-aware. Es el contrato real del drift signal; sin ella "cada arquetipo cubre sus etapas" no es testeable. Definir en Discovery con seo-aeo (Query Fan-Out) + commercial-expert (JTBD por modelo de negocio). Punto de partida verificado contra los packs shipped: consumer_b2c {awareness, consideration, comparison, trust, purchase_intent, local, risk, message_recall}; b2b_product_saas {awareness, problem_aware, consideration, comparison, trust, purchase_intent, enterprise, risk, message_recall}; retail_ecommerce {awareness, consideration, comparison, trust, purchase_intent, local, risk, message_recall}; public_institution {awareness, consideration, local, message_recall} (SIN purchase_intent — no hay transacción comercial).
- Las marcas reales para la Capa B (allowlisted) solo se usan como evidencia, no como fixtures de CI: 1 fuerte + 1 débil por arquetipo conocido basta (SKY ya validado en el smoke de TASK-1290).
