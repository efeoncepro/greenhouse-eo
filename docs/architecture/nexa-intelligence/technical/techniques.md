# Técnico — Técnicas

> Técnicas concretas que usa Nexa Intelligence, con su código y su razón de ser.

## Function-calling / 2-pass tool loop

El modelo decide si usar un tool (`search_knowledge`, tools operativos). El adapter corre un **loop
de 2 pasadas**: (1) el modelo emite un `functionCall`; (2) se ejecuta el tool y su resultado se
re-inyecta; (3) el modelo compone la respuesta final con esa evidencia. Implementado en
`NexaChatProvider.resolveTurn` (Gemini/Anthropic). El tool y las Answer Rules son provider-agnósticos.

- Caveat Gemini (ISSUE-092): el `functionResponse` se arma `{ name, response }` sin `id`.
- Caveat Anthropic: cada `tool_result` lleva `tool_use_id`.

## Routing por intención

`classifyNexaIntent` (heurística léxica) → `knowledge` | `operational` | `general`. Decide tool y,
con el auto-router, el provider. Barato, determinista, sin LLM call extra. Ver [`llm-models.md`](llm-models.md).

## Retrieval léxico (FTS) + OR-ify

Postgres FTS con `ts_rank` + OR-ify de la query para recall en preguntas naturales. Vector diferido.
Ver [`rag-pipeline.md`](rag-pipeline.md).

## Reranking conservador

Reordena el top-N de FTS (mismo set) con señales: heading match (anti wrong-source), freshness,
diversidad por documento. No muta el score. Default OFF byte-equivalente. `rerankKnowledgeChunks`.

## Synthesis brief (augmentation)

`buildKnowledgeEvidenceBrief`: agrupa por documento + dedupe (preservando `[n]`) + contexto de sección
+ instrucción de síntesis. Empuja al modelo a **cruzar** documentos en vez de copiar un pasaje.

## Citas inline `[n]` + evidencia en UI

El modelo cita `[n]` ligado al fragmento; la UI muestra las fuentes (panel de procedencia). El número
del trace sale del packet (`ts_rank`), no se inventa. Excerpt de fuente limpiado con `toPlainExcerpt`.

## Markdown hygiene del contexto LLM-facing

`stripMarkdownHeadings` (grounding/brief) saca `##` crudos del contexto que ve el modelo → el modelo
no los repite. (El excerpt de UI usa `toPlainExcerpt`, más agresivo.)

## Honest gaps / degradación

Confianza `none` → "no encontré una guía publicada", no inventa. Fuente stale/deprecated → declarado.
Tool no disponible → lo dice + ofrece el camino real. Estado real sin tool en vivo → no lo afirma.

## Reveal / streaming UI

El panel NO hace token-streaming real del provider; usa el **revelado typewriter** de assistant-ui
(TASK-1113). Markdown memoizado por nodo `hast` (anti-flicker), tool UIs registradas una vez
(anti remount-loop), sin `scroll-behavior: smooth` (sticky-bottom honesto).

## Determinismo donde importa

El builder del prompt es determinista con `now` fijo (snapshot tests). El rerank es determinista
(input fijo → output fijo). Esto hace testeable la inteligencia sin un LLM real en CI.

## Tools no-retrieval: `propose_action` (TASK-1137)

No todos los tools de Nexa recuperan conocimiento. `propose_action` es un tool **de acción gobernada**
(no retrieval): el LLM pasa una `actionKey` registrada y el resolver determinístico
(`resolveNexaActionProposal`) la valida y construye un preview read-only — NUNCA ejecuta ni inventa un
endpoint. Convive con `search_knowledge` en el mismo registry de tools, pero su contrato y su loop
(propose → confirm → execute) viven en [`../behavior/behavior-and-routing.md`](../behavior/behavior-and-routing.md)
y [`data-contracts.md`](./data-contracts.md). La seguridad NO está en el schema del tool (un hint) sino
en el **registry + resolver determinístico**: una key fuera del registry degrada a gap honesto.
