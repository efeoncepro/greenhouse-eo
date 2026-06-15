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

## Surface context (lente conversacional)

`surfaceContext` (SSOT `@/lib/nexa/nexa-answers-surface-context`) declara `domain`/`placement`/
`density`/`dataReality`/`sensitivity`/`allowedRenderers`/`allowedActions`. El dominio entra por
DATOS, no por chrome especial.

## Reglas duras

- ❌ NUNCA romper el shape de un contrato versionado sin bumpear la versión.
- ❌ NUNCA mapear/duplicar un packet con otra forma (el contrato es idéntico cross-lane).
- ✅ Contrato nuevo → versionarlo (`*.v1`) + documentar productor + consumidores acá.
