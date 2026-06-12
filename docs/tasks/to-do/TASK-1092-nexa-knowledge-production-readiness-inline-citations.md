# TASK-1092 — Nexa Knowledge Production Readiness: Inline Citations + Coverage QA

## Delta 2026-06-12 — Refinamiento arch-architect (revisión + 4-pillar + verificación de runtime)

Revisada con arch-architect contra el runtime real. La estructura de Codex es correcta; cuatro precisiones afinan el scope (cada una verificada en el código/corpus):

1. **La cita inline es un fix de UNA línea de instrucción, no de plumbing.** Verificado: el grounding summary del tool (`buildKnowledgeGrounding` en `src/lib/nexa/nexa-tools.ts:~647`) **YA numera los fragmentos** (`[1] citationLabel (freshness) — excerpt`). El gap es que la instrucción (≈línea 663) dice "CITA la fuente (citationLabel)" pero **nunca pide el marcador `[n]` inline**. → Slice 1 = cambiar esa instrucción para exigir `[n]` inline ligado al fragmento `n` + lista final "Fuentes: [n] = citationLabel". El **guard determinístico NUNCA fabrica colocación inline** (no sabe qué oración soporta qué chunk); su fallback honesto = si una respuesta grounded no trae ningún `[n]`, **apendar el bloque "Fuentes: [n]" derivado del packet**. Es el cambio de mayor leverage y el más barato (no toca el contrato `knowledge-search.v1`).
2. **"Modo mantenimiento" es gap de cobertura LEGÍTIMO, no bug de ranking.** Verificado: `src/lib/knowledge/ingestion/pilot-corpus.ts` tiene **15 docs y NO incluye un doc de modo-mantenimiento**. → Slice 2 NO debe tunear ranking: el doc no existe en el corpus. El fix es una **decisión de contenido** — agregar un doc de modo-mantenimiento al manifest + re-ingerir (pipeline TASK-1082), o aceptar el gap y documentarlo con owner. Parte del `no_source_answer_rate=21%` es **estructural del MVP de 15 docs** (esperado, no defecto); el threshold de salida debe distinguir "gap de cobertura honesto" de "defecto de retrieval".
3. **Hard rule de secuenciación (anti-WT-churn).** 1092 owns los MISMOS archivos que el TASK-1085 activo (`nexa-service.ts`, `nexa-tools.ts`, los signals, el renderer, y el propio task doc de 1085). → 1092 **NO arranca hasta que TASK-1085 esté COMPLETE** (no solo code-complete). Dos agentes editando `nexa-tools.ts`/`nexa-service.ts` en paralelo = exactamente el WT churn de esta sesión. "Blocked by TASK-1085" significa **1085 cerrado**.
4. **Exit metric pin-eado.** `low_citation_rate → ~0` se mide sobre la **re-corrida de la QA matrix** (set controlado de preguntas grounded), NO sobre la ventana ruidosa de n=14 de staging (la señal es rolling 30 días → n pequeño es engañoso).

**4 pillars.** Safety: docs sensibles citan + wording de validación humana, cero fabricación. Robustness: el guard nunca fabrica; fallback honesto (Fuentes del packet). Resilience: `low_citation_rate` maneja el drive-to-zero; rollback = flag flip. Scalability: el contrato de citas es independiente del tamaño del corpus; el corpus crece por el pipeline TASK-1082/1088.

**Decisión de no-fold (alternativa rechazada):** se mantiene como task SEPARADA (no slice de 1085) para no reabrir 1085 que está cerrándose; el costo es la hard rule de secuenciación (#3).

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
- Epic: `none`
- Status real: `Staging flag ON; production bloqueado por hardening de citas/cobertura`
- Rank: `TBD`
- Domain: `nexa|platform|content|ai|ui`
- Blocked by: `TASK-1085`
- Branch: `task/TASK-1092-nexa-knowledge-production-readiness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Preparar el rollout productivo de Nexa Knowledge Retrieval. Staging ya tiene `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true` y el circuito Nexa -> `search_knowledge` -> packet `knowledge-search.v1` -> reliability funciona end-to-end, pero la matriz QA detectó dos gaps: respuestas grounded no siempre imprimen citas inline `[n]`, y algunas guías publicadas/ranking de corpus no aparecen cuando deberían.

## Why This Task Exists

TASK-1085 probó que la arquitectura funciona, pero production requiere una experiencia confiable, no "casi confiable". Si el packet trae citas pero la prosa no las muestra consistentemente, el humano puede percibir la respuesta como no trazable. Si una guía existente como modo mantenimiento no se recupera, se crea deuda de cobertura/ranking y el `no_source_answer_rate` sube aunque haya documentación en repo.

## Goal

- Garantizar que toda respuesta de Nexa grounded en `search_knowledge` incluya citas inline cuando el packet trae `citationLabel`.
- Corregir o documentar la brecha de cobertura/ranking para docs publicados relevantes antes de production.
- Repetir una matriz QA de staging y dejar production listo solo si los criterios de trazabilidad y gap honesto pasan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Nexa consume `searchKnowledge({ mode: 'agentic' })` mediante el tool `search_knowledge`; la UI no consulta tablas de Knowledge.
- El corpus completo nunca entra al prompt; solo el packet del turno.
- El no-answer honesto (`confidence='none'`) no debe inventar ni usar fuentes débiles como si fueran correctas.
- Las citas visibles no son decoración: si hay chunks citables, la respuesta en prosa y la evidence UI deben conservar trazabilidad.
- Production no se enciende hasta que staging pase la matriz QA y reliability no muestre señales críticas por este rollout.

## Normative Docs

- `docs/manual-de-uso/plataforma/knowledge-platform.md`
- `docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md`
- `docs/tasks/in-progress/TASK-1089-nexa-knowledge-answer-surface.md`
- `docs/tasks/to-do/TASK-1091-nexa-provider-abstraction-anthropic-adapter.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` complete — `searchKnowledge` + packet `knowledge-search.v1`.
- `TASK-1085` in-progress/code-complete — tool `search_knowledge`, Answer Rules, UI evidence renderer, reliability signals.
- `TASK-1089` in-progress — Answer Surface/Conversation Trace pattern used as product target.

### Blocks / Impacts

- Production activation of `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`.
- `TASK-1091` provider abstraction should preserve the citation contract and can reuse the QA matrix.
- `TASK-1084` Human Knowledge Center may receive coverage/ranking follow-ups if missing documents need editorial surfacing.

### Files owned

- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/search-knowledge-tool.test.ts`
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`
- `src/views/greenhouse/home/components/NexaToolRenderers.test.ts`
- `src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`
- `docs/tasks/in-progress/TASK-1085-nexa-knowledge-retrieval-citations.md`

## Current Repo State

### Already exists

- Staging flag ON: `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true` in Vercel `staging`; Production remains OFF.
- Staging redeploy ready: `https://greenhouse-jss6yzle7-efeonce-7670142f.vercel.app` with aliases `dev-greenhouse.efeoncepro.com` and `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`.
- Smoke API verified:
  - real Knowledge question -> `search_knowledge`, `confidence=high`, `freshness=current`, chunks with `citationLabel`.
  - live payroll/finance questions -> operational tools (`check_payroll`, `pending_invoices`), not Knowledge.
  - exact nonsense query -> `confidence=none`, `chunks=0`, no-answer honest.
- Reliability shows the 3 signals in module `knowledge`: `knowledge.nexa.no_source_answer_rate`, `knowledge.nexa.stale_source_retrievals`, `knowledge.retrieval.low_citation_rate`.

### Gap

- QA matrix found responses where `raw.packet.chunks[].citationLabel` exists, but the assistant prose did not include inline citation markers (`[1]`, `[2]`).
- Query "modo mantenimiento" answered no-guide even though repo docs/manual mention maintenance mode; investigate whether the doc is not ingested, excluded for agentic policy, or ranked below threshold.
- Sensitive guide answers (for example payroll) need consistent inline citations and human validation wording when required by the Answer Rules.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Citation discipline hardening

> **Precisión (Delta arch-architect):** el grounding **ya numera los fragmentos** (`[1] citationLabel…` en `buildKnowledgeGrounding`); el cambio es la **instrucción**, no el plumbing.

- Cambiar la instrucción del grounding (≈`nexa-tools.ts:663`) de "CITA la fuente (citationLabel)" a exigir el **marcador `[n]` inline** ligado al fragmento `n` + una lista final "Fuentes: [n] = citationLabel". Provider-agnóstico (no toca el contrato `knowledge-search.v1`).
- Reforzar la regla sensible: respuestas de dominios sensibles (finance/payroll/legal/security) **siempre** citan + incluyen wording de validación humana.
- **Guard determinístico (fallback, NO repara inline):** si una respuesta grounded (`chunks.length > 0 && confidence !== 'none'`) no contiene ningún `[n]`, **apendar el bloque "Fuentes: [n] = citationLabel" derivado del packet**. NUNCA fabricar la colocación inline (no se sabe qué oración soporta qué chunk) — solo el handoff explícito de evidencia.
- Tests: grounded con chunks (debe traer `[n]` o el bloque Fuentes), `confidence='none'` (no fabrica), y wording de validación humana en dominio sensible.

### Slice 2 — Coverage audit (NO es ranking — ya verificado)

> **Precisión (Delta arch-architect):** `src/lib/knowledge/ingestion/pilot-corpus.ts` tiene **15 docs y NO incluye un doc de modo-mantenimiento**. El miss de "modo mantenimiento" es **gap de cobertura legítimo, NO bug de ranking** — no tunear ranking ni umbrales por esto.

- Confirmar el inventario del manifest (`pilot-corpus.ts`) vs los misses de la QA matrix; clasificar cada miss como **coverage-gap** (doc no ingerido — esperado en el MVP de 15 docs) o **retrieval-defect** (doc ingerido `published`/`agent_allowed`/`internal` pero no rankea sobre el piso 0.10).
- Para "modo mantenimiento" (coverage-gap confirmado): decisión de **contenido** — agregar un doc canónico al manifest + re-ingerir (pipeline TASK-1082), **o** aceptar el gap y documentarlo con owner. NO es trabajo de ranking.
- Solo si aparece un **retrieval-defect real** (doc ingerido que debería rankear y no): ahí sí tunear el substrato (umbral/`pg_trgm`/query expansion) — es el mecanismo canónico de TASK-1083, no de esta task.

### Slice 3 — QA matrix + reliability threshold

- Codify or script the 12-case staging QA matrix used in the rollout smoke.
- Re-run against staging after Slice 1/2.
- Verify `low_citation_rate`, `no_source_answer_rate`, and `stale_source_retrievals` after the run and record expected interpretation for small sample sizes.

### Slice 4 — Production rollout decision packet

- Prepare production activation checklist: env var, redeploy, 3 smoke cases, rollback (`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=false` + redeploy), monitoring window.
- Do not turn on production unless explicitly authorized after QA evidence is reviewed.

## Out of Scope

- Replacing Gemini/Claude provider routing; see `TASK-1091`.
- Building the Human Knowledge Center UI; see `TASK-1084`.
- Changing MCP resources/tools; see `TASK-1086`.
- Broad corpus ingestion from Notion; see `TASK-1088`.
- Client-facing activation. V1 remains internal/agentic-gated.

## Detailed Spec

### QA matrix baseline from staging rollout

Use at least these cases:

| ID | Intent | Expected |
|---|---|---|
| K1 | ICO personal metrics | Uses `search_knowledge`, high/current if covered, inline citations |
| K2 | ICO glossary RpA/OTD/FTR | Uses `search_knowledge`, inline citations |
| K3 | MCP Greenhouse read-only | Uses `search_knowledge`, inline citations |
| K4 | Efeonce/Greenhouse/Nexa | Uses `search_knowledge`, inline citations |
| K5 | Maintenance mode | Retrieves correct guide or documents coverage gap explicitly |
| K6 | Payroll guide | Uses `search_knowledge`, inline citations, human validation wording if sensitive |
| O1 | Live payroll amount | Uses operational payroll tool, not Knowledge |
| O2 | Live receivables | Uses operational finance tool, not Knowledge |
| G1 | Exact nonsense query | `confidence='none'`, `chunks=0`, no-answer honest |
| G2 | Semantic nonsense query | No invention; if retrieval returns weak chunks, answer says no published guide |
| P1 | Agentic policy/filtering | Preserves `deniedOrFilteredCount` and does not expose denied content |
| K7 | Current-period ICO caveat | Uses Knowledge and explains sample/snapshot caveat with citations |

### Exit thresholds

- 0 stale source retrievals in QA unless the question intentionally asks about stale/deprecated docs.
- 100% of grounded answers with `chunks.length > 0` and `confidence !== 'none'` must show inline citations (`[n]`) **o** el bloque "Fuentes: [n]" del guard (afordancia equivalente; el **operador** decide si el `[n]` inline es además obligatorio, dado que la evidence card de TASK-1089 ya es una afordancia).
- **`low_citation_rate → ~0` medido sobre la re-corrida de la QA matrix** (set controlado de grounded), NO sobre la ventana rolling-30d de staging (n=14 es ruidoso).
- 100% no-answer cases must avoid fabricating a procedure/document.
- Coverage-gap honesto (doc no en el corpus MVP) NO cuenta como defecto; se documenta con owner. Solo retrieval-defect (doc ingerido que debería rankear) bloquea.
- Production remains OFF until the operator approves the decision packet.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. Do not request production activation before Slice 3 evidence is reviewed.

**Hard rule de secuenciación cross-task (Delta arch-architect):** NO arrancar 1092 hasta que **TASK-1085 esté COMPLETE** (no solo code-complete). 1092 edita los mismos archivos que 1085 (`nexa-service.ts`, `nexa-tools.ts`, signals, renderer) — dos agentes editándolos en paralelo = WT churn. "Blocked by TASK-1085" = 1085 cerrado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Grounded answers look uncited even though packet has sources | Nexa / UI trust | medium | Citation hardening + QA matrix | `knowledge.retrieval.low_citation_rate` |
| Search misses existing docs | Knowledge corpus/search | medium | Coverage/ranking audit + content follow-up | `knowledge.nexa.no_source_answer_rate` |
| Sensitive docs answer without validation language | Nexa / compliance | medium | Answer Rules tests + QA payroll/legal cases | manual QA + future eval |
| Production activation exposes immature behavior | staging/prod rollout | medium | Staging-only until operator approval; instant flag rollback | reliability module `knowledge` |

### Feature flags / cutover

- `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` controls server-side availability of the tool and Answer Rules.
- Staging is ON as of 2026-06-12 for QA.
- Production remains OFF.
- Rollback: set `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=false` or remove env var in the affected Vercel target, then redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert citation hardening commit; flag can stay OFF in production | <10 min | yes |
| Slice 2 | Revert ranking/query change or keep editorial follow-up only | <10 min | yes |
| Slice 3 | No runtime change if implemented as script/docs; remove QA helper if noisy | <5 min | yes |
| Slice 4 | Do not activate production; if activated and degraded, env false + redeploy | <10 min | yes |

### Production verification sequence

1. Run focal tests locally for Nexa tool/service and UI renderer.
2. Deploy to staging with flag ON.
3. Run QA matrix and inspect reliability signals.
4. Review evidence with operator.
5. If approved, add `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true` in Vercel `production` and redeploy production.
6. Smoke production with 3 cases: grounded cited answer, no-answer honest, live operational data using non-Knowledge tool.
7. Monitor reliability signals for at least one business day.

### Out-of-band coordination required

- Operator approval before production activation.
- Domain approver review if payroll/finance/legal/security docs are used in production answers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Grounded Knowledge answers in the QA matrix include inline citations or an approved equivalent citation affordance.
- [ ] Exact no-answer test returns `confidence='none'`, `chunks=0`, and no fabricated procedure.
- [ ] Live operational-data questions do not use Knowledge when a domain tool exists.
- [ ] "Modo mantenimiento" miss is fixed or documented as a content/ranking follow-up with owner.
- [ ] Reliability signals are reviewed after QA and interpreted with sample size.
- [ ] Production activation checklist is documented; production flag remains OFF unless explicitly approved.

## Verification

- `pnpm vitest run src/lib/nexa/search-knowledge-tool.test.ts src/lib/nexa/nexa-service.test.ts src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/reliability/queries/nexa-knowledge-retrieval-signals.test.ts`
- `pnpm task:lint --task TASK-1092`
- Staging QA matrix via authenticated `/api/home/nexa`
- `pnpm staging:request /api/admin/reliability --grep 'knowledge.retrieval|knowledge.nexa'`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` actualizado.
- [ ] `Handoff.md` actualizado con rollout state.
- [ ] `docs/manual-de-uso/plataforma/knowledge-platform.md` actualizado si cambia el estado production/staging.

## Follow-ups

- `TASK-1091` provider/router must preserve the citation discipline contract.
- Create a content/ranking follow-up if Slice 2 identifies corpus coverage gaps outside this task.
