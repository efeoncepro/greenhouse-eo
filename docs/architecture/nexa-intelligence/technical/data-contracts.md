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

## Reglas duras

- ❌ NUNCA romper el shape de un contrato versionado sin bumpear la versión.
- ❌ NUNCA mapear/duplicar un packet con otra forma (el contrato es idéntico cross-lane).
- ✅ Contrato nuevo → versionarlo (`*.v1`) + documentar productor + consumidores acá.
