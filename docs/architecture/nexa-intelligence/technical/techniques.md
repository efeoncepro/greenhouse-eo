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

## Tools operativos no-retrieval: desempeño por persona `get_member_performance` (TASK-1216)

No todos los tools recuperan conocimiento; muchos son operativos (`get_otd`, `check_payroll`, …).
`get_member_performance` consulta el desempeño ICO (OTD, RpA, FTR, salud + tendencia) de **una persona
específica** nombrada por el usuario ("el OTD de Daniela Ferreira"). Es un **wrapper fino**: delega en el
primitive canónico `readMemberIcoProfileForSubject` (`src/lib/people/person-activity-access.ts`) — NO
recomputa métricas ni queryea `ico_member_metrics` directo. **Un primitive, muchos consumers (Full API
Parity):** el MISMO reader lo consumen este tool, los lanes MCP/app de API Platform
(`api/platform/{ecosystem,app}/people/performance`) y la UI; cada consumer solo mapea su caller a
`PeopleActivitySubject` (shape neutral session-free). La autorización es la de People (`canViewActivity` +
anti-IDOR de scope); `isAvailable = tenantType === 'efeonce_internal'` (mirror de `get_insight`). Routing
duro: `get_member_performance` = persona; `get_otd` = agregado de organización/agencia (NUNCA persona).
`not_found` es uniforme (no existe / fuera de scope, indistinguibles → no filtra existencia); nombre ambiguo
→ pide desambiguación; sin métricas materializadas → gap honesto.

## Tools no-retrieval: `propose_action` (TASK-1137)

No todos los tools de Nexa recuperan conocimiento. `propose_action` es un tool **de acción gobernada**
(no retrieval): el LLM pasa una `actionKey` registrada y el resolver determinístico
(`resolveNexaActionProposal`) la valida y construye un preview read-only — NUNCA ejecuta ni inventa un
endpoint. Convive con `search_knowledge` en el mismo registry de tools, pero su contrato y su loop
(propose → confirm → execute) viven en [`../behavior/behavior-and-routing.md`](../behavior/behavior-and-routing.md)
y [`data-contracts.md`](./data-contracts.md). La seguridad NO está en el schema del tool (un hint) sino
en el **registry + resolver determinístico**: una key fuera del registry degrada a gap honesto.
