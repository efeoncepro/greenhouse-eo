# TASK-1156 — Nexa retrieval-first determinístico para intención knowledge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|ai|knowledge`
- Blocked by: `none`
- Branch: `task/TASK-1156-nexa-deterministic-knowledge-retrieval-routing`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Hacer **determinística** la decisión de recuperar conocimiento: cuando `classifyNexaIntent === 'knowledge'`
(y el retrieval de knowledge está habilitado), **forzar** la llamada a `search_knowledge` en vez de
dejarla a criterio probabilístico del LLM. Cierra los fallos de routing K4/G1/K7 de la QA matrix (el LLM
no llama el tool) **sin tocar el system prompt ni la voz/personalidad de Nexa** — separa ROUTING
(determinístico) de VOZ (la composición, intacta). Espejo del precedente TASK-1149 (capa determinística
de formato, sin tocar el prompt).

## Why This Task Exists

Hoy `classifyNexaIntent` (determinístico, keyword) se usa SOLO para elegir provider; la decisión de
**llamar `search_knowledge`** la toma el LLM vía function-calling (2-pass loop) → es **probabilística**.
La QA matrix (`pnpm qa:nexa-knowledge --env=local`, Gemini) falla consistentemente K4 (diferencia
Efeonce/Greenhouse/Nexa), G1 (sinsentido exacto, espera buscar→no-answer) y K7 (meta-pregunta sobre ICO):
los tres muestran `tools: '-'` / `expected search_knowledge` = el modelo no llamó el tool. Es flakiness de
routing, no del retrieval (los casos que SÍ rutean dan confianza alta + citas). Además ya existe la regla
dura *"NUNCA un LLM call sin retrieval para una respuesta de conocimiento"* — hoy solo está "sugerida por
prompt"; esta task la vuelve **garantizada por construcción**.

## Goal

- Para intención `knowledge`, `search_knowledge` se invoca de forma determinística (no depende del LLM).
- K4/G1/K7 dejan de fallar por routing (G1 → busca y da no-answer honesto en la voz de Nexa).
- **Cero cambio en el system prompt ni en la voz/personalidad** (la composición de la 2da pasada queda igual).
- Gateado + medido contra la QA matrix (no regresar los casos que ya pasan) + golden questions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md` (routing de tools/provider)
- `docs/architecture/nexa-intelligence/technical/llm-models.md` (2-pass tool loop, providers)
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NO tocar el system prompt de voz** (`nexa-system-prompt.ts`) para esto. La personalidad vive en la
  composición + módulos `voice`/`responseModes`/`answerFormatting`, que quedan intactos (palanca = capa
  determinística de routing, espejo TASK-1149).
- Separar ROUTING (determinístico) de VOZ (composición). NUNCA mezclar.
- El retrieval forzado pasa por el SSOT `searchKnowledge` (contrato `knowledge-search.v1`) — NUNCA query directo.
- Solo aplica a intención `knowledge`; lo `operational` sigue ruteando a sus tools; `general` sin tool.
- Degradación honesta: si el retrieval falla → gap honesto / sin-knowledge (patrón vigente). G1 (no-answer)
  debe seguir dando el gap honesto en la voz de Nexa.
- Provider-agnóstico (Gemini local / Claude staging): el forzado vive en el orquestrador/2-pass loop, no en un provider.

## Normative Docs

- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md` (tool + Answer Rules)
- `docs/tasks/complete/TASK-1149-*.md` (precedente: capa determinística sin tocar el prompt)
- `docs/tasks/complete/TASK-1127-nexa-knowledge-qa-nightly-eval-expansion.md` (QA matrix + `--min-pass`)
- `scripts/nexa-knowledge-qa-matrix.mjs` (la eval baseline: K4/G1/K7)

## Dependencies & Impact

### Depends on

- `src/lib/nexa/nexa-model-router.ts` (`classifyNexaIntent`)
- `src/lib/nexa/nexa-service.ts` (`generateResponse`, orquestrador)
- `src/lib/nexa/nexa-provider.ts` + `providers/` (2-pass tool loop, toolChoice)
- `src/lib/nexa/nexa-tools.ts` (`search_knowledge`)

### Blocks / Impacts

- QA matrix (K4/G1/K7) + golden questions (eval baseline).
- Confiabilidad de las respuestas de conocimiento de Nexa (chat flotante + lente + MCP comparten backend).

### Files owned

- `src/lib/nexa/nexa-service.ts` (forzado determinístico del tool por intención)
- `src/lib/nexa/nexa-provider.ts` / `providers/*.ts` (`toolChoice`/forced tool en 1ra pasada, si esa es la vía)
- `src/lib/nexa/flags.ts` (flag de rollout, si aplica)
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md` (Delta)

## Current Repo State

### Already exists

- `classifyNexaIntent` determinístico (`knowledge|operational|general`) con tests.
- 2-pass tool loop (`provider.resolveTurn`) + `search_knowledge` (TASK-1085).
- System prompt versionado con "REGLAS DE BASE DE CONOCIMIENTO (tool search_knowledge)" (sugerencia, no garantía).
- QA matrix + golden questions como eval baseline.

### Gap

- La llamada al tool es probabilística (LLM decide). No hay forzado determinístico por intención.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (orquestación del turno de Nexa)
- Source of truth afectado: `NexaService.generateResponse` (routing del tool) — NO el prompt, NO el retrieval
- Consumidores afectados: chat flotante + lente + MCP (comparten `/api/home/nexa`)
- Runtime target: `local|staging|production` (gated)

### Contract surface

- Contrato existente a respetar: `knowledge-search.v1`, `nexa-evidence.v1`, `NEXA_PROMPT_GOVERNANCE` (sin bump — no se toca el prompt)
- Contrato nuevo o modificado: ninguno público; cambia la lógica interna de cuándo se dispara el tool
- Backward compatibility: `gated` (flag default OFF = comportamiento actual probabilístico)
- Full API parity: el retrieval sigue por el SSOT `searchKnowledge`

### Data model and invariants

- Entidades afectadas: ninguna (no toca schema). Solo orquestación del turno.
- Invariantes: voz/personalidad intacta (prompt sin cambios); solo `knowledge` fuerza tool; degradación honesta; retrieval por SSOT
- Tenant/access boundary: igual que hoy (sesión + capabilities knowledge)
- Idempotency/concurrency: N/A (read path conversacional)
- Audit/outbox/history: telemetría de turno existente (`nexa_turn_telemetry`) captura tools usados

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` (comportamiento actual) → flip tras validar contra la QA matrix + golden
- Backfill plan: N/A
- Rollback path: flag OFF (instantáneo)
- External coordination: N/A (ADC/Vertex ya disponible)

### Security and access

- Auth/access gate: igual que hoy
- Sensitive data posture: sin cambios (mismos filtros de envelope/política del retrieval)
- Error contract: `captureWithDomain('home'/'knowledge')`; sin error.message crudo
- Abuse/rate-limit posture: un retrieval extra por turno de `knowledge` (intencional, barato)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/nexa src/lib/knowledge`
- DB/runtime checks: N/A
- Integration checks: `pnpm qa:nexa-knowledge --env=local` (K4/G1/K7 dejan de fallar por routing) + golden questions
- Reliability signals/logs: `nexa_turn_telemetry` (tools por turno); señal opcional de "knowledge-intent sin tool"
- Production verification sequence: local → staging (provider Claude) con el flag ON; medir QA matrix `--min-pass`

<!-- ZONE 2 — PLAN MODE: no llenar al crear la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Forzado determinístico del tool por intención

- En `NexaService.generateResponse` (o el 2-pass loop del provider), cuando `classifyNexaIntent === 'knowledge'`
  AND el retrieval está habilitado, **forzar** `search_knowledge`: vía `toolChoice` que obliga el tool en la
  1ra pasada, **o** retrieval proactivo + inyección del packet como tool result, regardless de si el LLM lo pidió.
- La 2da pasada compone la respuesta en la voz de Nexa con la evidencia (sin cambios al prompt).
- Flag de rollout `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` (default OFF = comportamiento actual).

### Slice 2 — Validación contra la eval baseline

- Correr `pnpm qa:nexa-knowledge` (local + staging) → K4/G1/K7 dejan de fallar por `expected search_knowledge`;
  no regresar los casos que ya pasan; respetar `--min-pass`.
- Correr golden questions (retrieval) — sin regresión.

## Out of Scope

- Cambiar el system prompt de voz / personalidad (explícitamente prohibido — esa es la palanca equivocada).
- Cambiar el retrieval (FTS/híbrido) — es ortogonal (TASK-1151).
- Forzar tools operativos (solo `knowledge`).
- Tuning del clasificador de intención más allá de lo necesario (si hay falsos positivos materiales, evaluar aparte).

## Detailed Spec

La voz/personalidad de Nexa vive en `nexa-system-prompt.ts` (módulos `voice`/`responseModes`/`answerFormatting`)
+ la 2da pasada de composición — NADA de eso se toca. Esta task solo cambia **cuándo se dispara el retrieval**:
de "el LLM decide" a "determinístico si intención = knowledge". Precedente de forma: TASK-1149
(`downgradeStructuralHeadings`, capa determinística sin tocar el prompt). Mecánica preferida: `toolChoice`
forzado en la 1ra pasada del provider cuando intent=knowledge; alternativa: retrieval proactivo + inyección
del packet. Resolver en Discovery según el shape del 2-pass loop de cada provider (Gemini/Claude).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (forzado) → Slice 2 (validación). El flag DEBE existir antes de cualquier flip.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falso positivo del clasificador fuerza retrieval innecesario | nexa | medium | degradación honesta (no-answer → gap en voz); medir con QA matrix | nexa_turn_telemetry tools |
| Se aplana la personalidad por tocar el prompt | nexa | low | regla dura: NO tocar el prompt; capa determinística (TASK-1149) | golden snapshot del prompt sin cambios |
| Regresión en casos que hoy pasan | nexa | low | flag + QA matrix `--min-pass` + golden questions antes de flip | qa:nexa-knowledge |
| Latencia: un retrieval extra por turno knowledge | ai/cost | low | FTS sub-ms; intencional | telemetría de latencia |

### Feature flags / cutover

- `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` (default OFF = routing probabilístico actual). Flip tras validar. Revert = flag OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED=false` | < 5 min | si |
| Slice 2 | N/A (validación) | N/A | si |

### Production verification sequence

1. Local (Gemini): flag ON → `pnpm qa:nexa-knowledge --env=local` → K4/G1/K7 OK por routing; golden sin regresión.
2. Staging (Claude vía auto-router): flag ON → QA matrix con `--min-pass`.
3. Flip prod = decisión del operador tras staging verde.

### Out-of-band coordination required

N/A — repo + ADC/Vertex ya disponibles.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cuando `classifyNexaIntent === 'knowledge'` y retrieval habilitado, `search_knowledge` se invoca determinístico.
- [ ] K4/G1/K7 dejan de fallar por `expected search_knowledge` (G1 → busca y da no-answer honesto).
- [ ] El system prompt / voz / golden snapshot del prompt quedan **sin cambios** (personalidad intacta).
- [ ] No regresan los casos de la QA matrix que ya pasan; golden questions sin regresión.
- [ ] Gateado por flag (default OFF = comportamiento actual); retrieval por el SSOT `searchKnowledge`.

## Verification

- `pnpm vitest run src/lib/nexa src/lib/knowledge`
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm qa:nexa-knowledge -- --env=local`
- `pnpm nexa:doc-gate --changed`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] chequeo de impacto cruzado
- [ ] Delta en `behavior-and-routing.md`

## Follow-ups

- Si emergen falsos positivos materiales del clasificador de intención, evaluar mejorar `classifyNexaIntent` aparte.

## Open Questions

- ¿`toolChoice` forzado en la 1ra pasada vs retrieval proactivo + inyección del packet? Resolver en Discovery
  según el shape del 2-pass loop de cada provider (Gemini/Claude).
