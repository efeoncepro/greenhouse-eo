# Técnico — Contratos de datos

> Contratos versionados que estructuran la inteligencia de Nexa. Romper su shape exige **bumpear la
> versión** (NUNCA mutación silenciosa) — los consumen Nexa, MCP, la UI y partners.

## `knowledge-search.v1` — retrieval

- **Productor:** `searchKnowledge` (SSOT, [`search-knowledge.ts`](../../../../src/lib/knowledge/search/search-knowledge.ts)).
- **Shape:** `KnowledgeRetrievalPacket { contractVersion, query, mode, confidence, freshness, chunks[], deniedOrFilteredCount, notes[] }`.
- **`KnowledgeRetrievalChunk`:** `{ chunkId, documentId, title, headingPath[], text, citationLabel, score (ts_rank), freshness, sensitivity, humanUrl, … }`.
- **Consumidores:** tool `search_knowledge` de Nexa (modo agentic), lane MCP/ecosystem, Knowledge Center UI.
- `score` es el **único número de retrieval**; la confianza por fuente/overall se deriva de él.

## `nexa-evidence.v1` — evidencia para la UI

- **Productor:** `nexaToolResultToConversationalEvidence` ([`conversational-evidence.ts`](../../../../src/lib/nexa/conversational-evidence.ts)).
- **Shape:** `ConversationalEvidencePacket` con `sources[]` (`ConversationalEvidenceSource { id, documentId, title, citationLabel, headingPath, excerpt, score, freshness, … }`).
- El `excerpt` se limpia con `toPlainExcerpt` (sin Markdown crudo). Consumido por `NexaEvidencePanel`/`NexaProvenanceTrace`.

## `nexa-answer-render-plan.v1` — render plan del canvas

- Mapper `packet → render plan` para la lente conversacional (TASK-1101). Citas vía
  `nexa-answers-citation-mapper.ts` (`truncateCitationExcerpt` → `toPlainExcerpt`). Domain-neutral.

## Governance del prompt — `NEXA_PROMPT_GOVERNANCE`

- **Productor:** [`nexa-system-prompt.ts`](../../../../src/lib/nexa/nexa-system-prompt.ts).
- Metadata machine-readable: `{ family, activeVersion, rollbackVersion, activationFlag, changeClasses, changelog[] }`.
- `buildNexaSystemPrompt` devuelve `{ text, version, family }` (la metadata viaja con el turno).

## `nexa-turn-telemetry.v1` — telemetría de turno (TASK-1129)

- **Productor:** `NexaService.generateResponse` ([`nexa-service.ts`](../../../../src/lib/nexa/nexa-service.ts)); tipos en [`nexa-turn-telemetry.ts`](../../../../src/lib/nexa/nexa-turn-telemetry.ts).
- **Shape:** `NexaTurnTelemetry { contractVersion, promptVersion, promptFamily, primaryProvider, resolvedProvider, resolvedModel, providerStepCount, didFailover, failoverFrom, outcome, totalLatencyMs, toolsUsed[], toolCount, suggestionCount, suggestionOutcome, detail{ providerSteps[], tools[], usage{tokens,costUsd} } }`.
- **Persistencia:** ledger aditivo `greenhouse_ai.nexa_turn_telemetry` (best-effort post-commit, `store.ts`). NO se devuelve al cliente; NO se rehidrata al leer un thread.
- **Consumidores:** reliability signal `nexa.turn.degraded_outcomes` (módulo Home) + lectura ad-hoc por `prompt_version`/`resolved_provider`/`outcome`.
- **Observabilidad, NO conversación:** nunca el prompt, el texto de respuesta, los tool results crudos ni secretos. `usage` (tokens/costo) = `null` hasta que el SDK exponga usage estable.

## Surface context (lente conversacional)

`surfaceContext` (SSOT `@/lib/nexa/nexa-answers-surface-context`) declara `domain`/`placement`/
`density`/`dataReality`/`sensitivity`/`allowedRenderers`/`allowedActions`. El dominio entra por
DATOS, no por chrome especial.

## `nexa-action-proposal.v1` — propuesta de acción gobernada (TASK-1137)

SSOT: `@/lib/nexa/actions/types.ts`. **NO es un write** — es el artefacto read-only, permission-checked
y con preview de datos reales que Nexa propone para que un humano confirme antes de mutar.

- **Productor**: el tool `propose_action` (`nexa-tools.ts`) vía el resolver determinístico
  `resolveNexaActionProposal` (`actions/registry.ts`). El LLM solo pasa una `actionKey` registrada.
- **Transporte**: el orquestador (`nexa-service.ts`) eleva las propuestas a `NexaResponse.actionProposals`
  (`extractNexaActionProposals`, validando el shape — un `raw` malformado nunca se vuelve propuesta).
- **Consumidor**: la UI del chat (confirm-card, follow-up) → `POST /api/nexa/actions/[actionKey]/confirm`.

Campos: `contractVersion` · `proposalId` (UUID, liga la idempotency key) · `actionKey` · `intent` ·
`sensitivity` (`low|medium|high`) · `preview` (`title`/`summary`/`metrics[]`, datos frescos) ·
`confirmation` (copy es-CL) · `execution` (`confirmEndpoint` + `idempotencyKey` server-generada) ·
`expiresAt`. Cuando el resolver no puede proponer → `NexaActionGap` (`reason` ∈ `unknown_action |
not_permitted | runtime_disabled | no_command_binding | unavailable` + `message` + `deepLink?`).

**Ledger de eventos** (no es contrato de cliente): `greenhouse_ai.nexa_action_events` (append-only) —
una fila por evento del ciclo de vida (`proposed | proposal_denied | executed | failed |
execution_denied | conflict | cancelled`). Lo leen las reliability signals `nexa.action.failure_rate`
y `nexa.action.unauthorized_proposal_rate`. NUNCA guarda contenido de conversación.

## Reglas duras

- ❌ NUNCA romper el shape de un contrato versionado sin bumpear la versión.
- ❌ NUNCA mapear/duplicar un packet con otra forma (el contrato es idéntico cross-lane).
- ❌ NUNCA ejecutar un write desde el LLM: `nexa-action-proposal.v1` se PROPONE; ejecutar requiere
  confirmación humana + el endpoint determinístico (idempotency foundation TASK-655).
- ✅ Contrato nuevo → versionarlo (`*.v1`) + documentar productor + consumidores acá.
