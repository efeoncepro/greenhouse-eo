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

- Golden-set extendido con casos por arquetipo (≥3: consumer_b2c, b2b_product_saas, retail_ecommerce) con expectativas de presencia/ausencia y framing correcto.
- Harness de eval que corre el generador (TASK-1290) por arquetipo y valida que los prompts + la presencia esperada son coherentes (sin gastar en runs reales: fixtures + adapter fake; runs reales allowlisted + acotados como hoy).
- Drift signal: alerta si un arquetipo deja de cubrir sus etapas de buyer-intent o si el caso de no-regresión agencia cambia.

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

- `src/lib/growth/ai-visibility/evals/golden-set.v2.json` (multi-arquetipo) `[verificar naming]`
- `src/lib/growth/ai-visibility/evals/*` (harness por arquetipo) `[verificar]`
- `src/lib/reliability/queries/growth-ai-visibility-*-signals.ts` (drift signal) `[verificar]`

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

- Contrato nuevo: `runArchetypeEval(goldenSet) → { perArchetype: pass/fail, regressionAgency: pass/fail }`; golden-set v2.
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

### Slice 1 — Golden-set v2 multi-arquetipo

- Casos para consumer_b2c (aerolínea), b2b_product_saas, retail_ecommerce + anclaje agencia. Expectativas de framing + presencia.

### Slice 2 — Harness + CI gate

- `runArchetypeEval` corre el generador por arquetipo + no-regresión agencia; integrado a la suite.

### Slice 3 — Drift signal

- Reliability signal de cobertura de etapas por arquetipo.

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

- [ ] Golden-set v2 cubre ≥3 arquetipos (consumer_b2c, b2b_product_saas, retail_ecommerce) + el anclaje agencia; expectativas de framing + presencia.
- [ ] Harness `runArchetypeEval` corre en la suite; el caso agencia pasa idéntico (no-regresión); eval determinista por fixtures.
- [ ] Drift signal de cobertura de etapas por arquetipo en steady esperado.

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

- ¿Cuántas marcas reales por arquetipo se usan como casos (1 fuerte + 1 débil, como el golden-set actual)? (definir en Discovery con AEO).
