# Nexa Intelligence — capas de producto (índice canónico)

> **Tipo:** Arquitectura / governance de producto (agent-facing)
> **Creado:** 2026-06-15 (TASK-1124 follow-up)
> **SSOT machine-readable:** [`manifest.json`](manifest.json)
> **Gate:** `pnpm nexa:doc-gate` ([scripts/ci/nexa-intelligence-doc-gate.mjs](../../../scripts/ci/nexa-intelligence-doc-gate.mjs))

## Qué es esto

**Nexa Intelligence** es la inteligencia conversacional de Greenhouse: el conjunto de capas
que gobiernan *cómo piensa, habla, decide y responde* Nexa. Esta carpeta es el **mapa canónico
de esas capas** — la fuente de verdad agent-facing de cada decisión de producto de Nexa, para
que cualquier agente (Claude, Codex) o persona entienda y evolucione cada plano sin re-derivarlo
del código.

NO reemplaza:
- el contrato de la **experiencia conversacional** (shell + coreografía + contratos SSOT):
  [`ui-platform/CONVERSATIONAL_EXPERIENCE.md`](../ui-platform/CONVERSATIONAL_EXPERIENCE.md);
- la **arquitectura** de Nexa: [`GREENHOUSE_NEXA_ARCHITECTURE_V1.md`](../GREENHOUSE_NEXA_ARCHITECTURE_V1.md);
- la **governance del system prompt**: [`GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`](../GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md).

Es la **vista por capas** que organiza esos contratos en planos de producto navegables.

## Las capas

| # | Capa | Qué gobierna | Doc |
|---|---|---|---|
| 01 | **System prompt — versionado** | Cómo se versiona el prompt, clases de cambio, triggers, rollback, changelog | [`01-system-prompt-versioning.md`](01-system-prompt-versioning.md) |
| 02 | **System prompt — vigente** | Qué tiene HOY el prompt V2 (módulos, contenido, qué entra cuándo) | [`02-system-prompt-today.md`](02-system-prompt-today.md) |
| 03 | **Comportamiento + routing** | Qué hace Nexa por turno: intención → provider, retrieval, response modes, gaps honestos | [`03-behavior-and-routing.md`](03-behavior-and-routing.md) |
| 04 | **Voz, tono, estilo y personalidad** | Cómo suena Nexa (contrato de voz Efeonce) | [`04-voice-tone-style-personality.md`](04-voice-tone-style-personality.md) |
| 05 | **Do's & Don'ts** | Las reglas duras consolidadas (qué SIEMPRE / qué NUNCA) | [`05-dos-and-donts.md`](05-dos-and-donts.md) |
| 06 | **Evidencia + citas** | Cómo se respaldan las respuestas: `[n]` inline, panel de fuentes, hygiene del excerpt | [`06-evidence-and-citations.md`](06-evidence-and-citations.md) |
| 07 | **Knowledge retrieval + calidad de respuesta** | Cómo se recupera del corpus y se sintetiza: SSOT de búsqueda, brief, rerank, QA matrix | [`07-knowledge-retrieval-answer-quality.md`](07-knowledge-retrieval-answer-quality.md) |

## Documentación técnica ([`technical/`](technical/README.md))

Cómo está **construida** la inteligencia (no qué decide):

| Doc | Cubre |
|---|---|
| [`technical/llm-models.md`](technical/llm-models.md) | Modelos LLM (Gemini, Claude), provider abstraction, model IDs, routing, failover, secrets |
| [`technical/rag-pipeline.md`](technical/rag-pipeline.md) | RAG end-to-end: ingesta → FTS → rerank → brief → grounding → síntesis → citas |
| [`technical/techniques.md`](technical/techniques.md) | Técnicas: 2-pass tool loop, reranking, synthesis brief, dedupe, gaps honestos, reveal |
| [`technical/data-contracts.md`](technical/data-contracts.md) | Contratos versionados: `knowledge-search.v1`, `nexa-evidence.v1`, render plan, governance del prompt |

## Cómo se mantiene (el gate)

Cada capa mapea a uno o más **dominios de código** en [`manifest.json`](manifest.json). El gate
`pnpm nexa:doc-gate`:

1. **`--changed`** (default CI, vs `origin/develop`): si cambia código de un dominio Nexa pero
   **no** cambió ninguno de sus docs de capa → **falla** y dice qué dominio quedó sin documentar.
2. **`--audit`**: chequeo estructural — cada doc de capa existe, cada code path Nexa pertenece a
   un dominio (no hay código Nexa huérfano sin capa), el manifest y el índice están en sync.

Regla dura: **al tocar cualquier dominio Nexa, actualizá su(s) doc(s) de capa en el mismo cambio.**
Si agregás un dominio Nexa nuevo (un módulo, un provider, una surface), agregalo al `manifest.json`
+ creá/asigná su capa. El gate convierte "toqué Nexa pero no documenté" en un fallo mecánico.

## Procedencia

TASK-1124 (calidad de respuesta de Knowledge + system prompt V2 versionado) + su follow-up
(hygiene del excerpt de fuentes). Capas previas referenciadas: TASK-1085 (retrieval + citas),
TASK-1091 (provider abstraction + router), TASK-1101 (lente conversacional), TASK-1083 (search SSOT).
