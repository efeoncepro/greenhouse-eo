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

## Las capas (organizadas en carpetas — crecen por dominio)

### [`system-prompt/`](system-prompt/README.md) — el prompt como artefacto versionado

- [`versioning.md`](system-prompt/versioning.md) — versionado, clases de cambio, triggers, rollback, changelog.
- [`current.md`](system-prompt/current.md) — qué tiene HOY el prompt V2.

### [`behavior/`](behavior/README.md) — qué hace por turno

- [`behavior-and-routing.md`](behavior/behavior-and-routing.md) — ruteo de tools + provider, response modes, gaps honestos, **acciones gobernadas** (propose → confirm → execute; el LLM NUNCA ejecuta un write — TASK-1137).

### [`voice/`](voice/README.md) — cómo suena

- [`voice-tone-style-personality.md`](voice/voice-tone-style-personality.md) — contrato de voz Efeonce.

### [`knowledge/`](knowledge/README.md) — recuperar + sintetizar + respaldar

- [`retrieval-answer-quality.md`](knowledge/retrieval-answer-quality.md) — search SSOT, brief, rerank, QA matrix.
- [`evidence-and-citations.md`](knowledge/evidence-and-citations.md) — `[n]` inline, panel de fuentes, excerpt hygiene.

### [`experience/`](experience/README.md) — cómo se vive en pantalla

- [`conversational-experience.md`](experience/conversational-experience.md) — el shell + coreografía + `surfaceContext`.
- [`nexa-moments.md`](experience/nexa-moments.md) — la unidad de producto: context + evidence + permission + intent + next step.
- [`nexa-answers.md`](experience/nexa-answers.md) — la respuesta que se arma (canvas, síntesis citada, render plan).

### [`governance/`](governance/README.md) — reglas + evolución segura

- [`dos-and-donts.md`](governance/dos-and-donts.md) — las reglas duras consolidadas.

### [`technical/`](technical/README.md) — cómo está construida (no qué decide)

- [`llm-models.md`](technical/llm-models.md) — modelos LLM (Gemini, Claude), provider abstraction, routing, failover, secrets.
- [`rag-pipeline.md`](technical/rag-pipeline.md) — RAG end-to-end: ingesta → FTS → rerank → brief → grounding → síntesis → citas.
- [`techniques.md`](technical/techniques.md) — 2-pass tool loop, reranking, synthesis brief, dedupe, gaps honestos, reveal.
- [`data-contracts.md`](technical/data-contracts.md) — contratos versionados (`knowledge-search.v1`, `nexa-evidence.v1`, render plan, `nexa-action-proposal.v1`).

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
TASK-1137 (runtime de acciones gobernadas: dominio `governed-actions`, capa behavior + data-contracts).
