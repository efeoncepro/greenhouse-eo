# TASK-1124 — Nexa Knowledge Answer Quality + System Prompt Refresh

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|content|ai|knowledge`
- Blocked by: `none`
- Branch: `task/TASK-1124-nexa-knowledge-answer-quality-system-prompt-refresh`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fortalecer Nexa Chat para que las respuestas basadas en Knowledge dejen de sentirse como "un trozo de chunk" y pasen a ser respuestas sintetizadas, actuales y confiables. La task actualiza el system prompt de Nexa a la realidad 2026 del repo, corrige contradicciones de fuentes, define una voz Nexa amigable/creativa sin caer en lo jugueton, limpia Markdown crudo (`##`) del contexto enviado al LLM, agrega contexto documental/parent expansion y amplifica la QA de Knowledge.

## Why This Task Exists

Nexa ya consume el corpus gobernado de Knowledge (`knowledge-search.v1`) via `search_knowledge`, incluyendo Notion wikis y manuales. El problema observado es de **calidad de respuesta**, no de ausencia de corpus: el retrieval devuelve chunks y el modelo responde desde pasajes acotados, a veces con encabezados Markdown crudos (`##`) y sin suficiente contexto de documento/seccion para sintetizar.

El system prompt actual vive dentro de `NexaService.buildSystemPrompt()` y fue escrito para una realidad anterior: Home panel breve, tools operativos y un primer Knowledge retrieval. Hoy el repo ya tiene Nexa Answers Canvas, Knowledge Center, Notion ingestion, Answer Trace, primitives de grounding, provider router, QA matrix y una vision conversacional mas rica. El prompt no refleja esa topologia, y ademas hay una contradiccion concreta: el prompt principal dice no agregar `Fuentes:` al final, mientras el summary del tool `search_knowledge` pide cerrar con `Fuentes:` y el post-procesador puede agregarlas si faltan marcadores `[n]`.

Tambien falta un contrato de voz propio para Nexa. Greenhouse/Efeonce no debe sonar como una mesa de ayuda seca, pero tampoco como un bot "jugueton". Somos una agencia creativa con sistema operativo propio: la voz debe sentirse estrategica, clara, humana, con criterio creativo y siempre con evidencia.

## Goal

- Actualizar Nexa a un prompt modular V2, versionado y testeable, que refleje la realidad actual de Greenhouse/Nexa/Knowledge sin depender de memoria stale.
- Convertir el contexto de Knowledge que recibe el LLM desde "chunks crudos" a un **evidence brief sintetizable**: metadata limpia, contexto padre, dedupe por documento/seccion y reglas de respuesta por tipo de pregunta.
- Evitar que Markdown estructural (`#`, `##`, frontmatter, boilerplate) aparezca como texto de respuesta salvo que sea parte real de un ejemplo citado.
- Resolver la politica de citas: marcadores inline `[n]` + evidence UI, sin lista textual `Fuentes:` duplicada en la respuesta final.
- Definir un contrato de voz Nexa: amigable, estrategica y creativa con sobriedad; nunca infantil, chistosa por defecto ni excesivamente informal.
- Crear governance de evolucion del prompt: versionado, triggers de cambio, snapshots/evals obligatorias, rollout por flag y documentacion de por que cambio.
- Ampliar la QA para medir calidad de respuesta, no solo source hit: no `##`, no source-list duplicada, respuesta completa, cita correcta, no-answer honesto y no confusion entre Knowledge y datos vivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`

Reglas obligatorias:

- Knowledge es un **consumer** de Nexa, no el dueno del shell. No crear un chat paralelo ni un answer surface nuevo.
- No consultar `greenhouse_knowledge.knowledge_chunks` desde UI/Nexa fuera del reader SSOT `searchKnowledge`.
- No inventar respuestas sin fuentes. `confidence='none'` debe producir gap honesto.
- No mezclar guia publicada con dato operativo vivo. Knowledge explica como funciona algo; los tools operativos consultan estado actual.
- No duplicar `Fuentes:` al final de la respuesta cuando la UI ya muestra evidencia. La respuesta textual usa marcadores inline `[n]`.
- Nexa debe reflejar la voz Efeonce: profesional-directa, calida, con criterio creativo y prueba; nunca startup-bro, consultora abstracta, humor decorativo ni "asistente jugueton".
- El prompt no se cambia a mano sin governance: todo cambio material debe tener version, razon, diff, tests/evals y rollback.
- No hardcodear copy visible reusable en JSX; usar `src/lib/copy/nexa.ts` si emergen labels/estados.
- Coordinar con `TASK-1112`: esta task mejora **calidad de prompt/retrieval/sintesis**; `TASK-1112` mejora **experiencia Chat/Answers, streaming, evidence packet y primitives en el thread**.

## Normative Docs

- `docs/tasks/complete/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md`
- `docs/tasks/complete/TASK-1088-notion-knowledge-connector.md`
- `docs/tasks/in-progress/TASK-1092-nexa-knowledge-production-readiness-inline-citations.md`
- `docs/tasks/to-do/TASK-1112-nexa-chat-answers-experience-unification.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` complete: `searchKnowledge()` reader SSOT, `KnowledgeRetrievalPacket`, FTS tunables y golden questions.
- `TASK-1085` complete: `search_knowledge` tool, Answer Rules, packet in `raw.packet` y UI evidence renderer.
- `TASK-1088` complete: Notion connector + blocks-to-markdown ingestion, source of the wiki/manual corpus.
- `TASK-1091` complete: provider router and Anthropic/Gemini adapters.
- `TASK-1092` in-progress: production readiness and QA matrix for Nexa Knowledge.
- `TASK-1112` to-do: Chat/Answers experience unification; coordinate but do not duplicate.

### Blocks / Impacts

- Improves `TASK-1092` production-readiness confidence.
- Informs `TASK-1112` by giving the Chat route a cleaner answer/evidence contract to render.
- Impacts `pnpm qa:nexa-knowledge`, Knowledge golden questions and any future Knowledge MCP answer quality eval.
- May require re-ingestion/backfill of Knowledge summaries or normalized chunks if document/section summaries become persisted.

### Files owned

- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-provider.ts`
- `src/lib/nexa/providers/gemini.ts`
- `src/lib/nexa/providers/anthropic.ts`
- `src/lib/nexa/nexa-model-router.ts`
- `src/lib/nexa/flags.ts`
- `src/lib/nexa/[prompt-builder].ts` [verificar nombre exacto en Discovery]
- `src/lib/knowledge/search/search-knowledge.ts`
- `src/lib/knowledge/search/golden-questions.ts`
- `src/lib/knowledge/ingestion/markdown.ts`
- `src/lib/knowledge/ingestion/pipeline.ts`
- `src/lib/knowledge/notion/blocks-to-markdown.ts`
- `src/lib/knowledge/store.ts`
- `scripts/nexa-knowledge-qa-matrix.mjs`
- `src/lib/copy/nexa.ts`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`

## Current Repo State

### Already exists

- `NexaService.buildSystemPrompt()` builds the current prompt inline in `src/lib/nexa/nexa-service.ts`.
- Current prompt identity: "Eres Nexa, el asistente inteligente de Greenhouse"; mission: help navigate the real portal operation and resolve quick doubts with reliable context.
- Current prompt injects user name, role, available modules, task count and optional finance status.
- Current response rules are concise and Home-oriented: professional/human/grounded, no invented metrics, use tools for payroll/OTD/emails/capacity/receivables, mention pending tasks, use finance signal if present, keep answers brief for Home.
- Current Knowledge rules are appended only when `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` is ON: use `search_knowledge` for processes/policies/guides/definitions; answer only from retrieved fragments; inline `[n]`; stale/deprecated honesty; no-answer honesty; distinguish Knowledge vs live operational data; human validation for sensitive topics.
- `search_knowledge` retrieves from `searchKnowledge({ mode: 'agentic' })`, default limit 6, max 12, and returns `raw.packet` for UI evidence.
- `buildKnowledgeGroundingSummary()` sends each chunk to the LLM as `[n] citationLabel ... excerpt`, truncating each chunk to 600 chars.
- `chunkMarkdown()` splits Markdown by headings and currently includes the heading line itself in `bodyText`.
- `searchKnowledge()` uses Postgres FTS (`body_tsv` weighted heading/body, OR-ified `websearch_to_tsquery`, rank floor 0.10), with no vector reranker or parent expansion.
- `pnpm qa:nexa-knowledge` already validates routing, citations, no-answer and sensitive-validation behavior.

### Gap

- The LLM sees excerpts, not a structured synthesis brief. This encourages "fragment answers".
- Markdown structural markers (`##`, `#`) can enter `chunk.text` and leak into answers.
- The prompt is stale relative to current platform reality: Nexa Answers Canvas, Answer Trace, Knowledge Center, Notion corpus, provider router, evidence UI and QA matrix are not reflected as first-class operating rules.
- There is no explicit Nexa voice contract. Current rules say "conciso, profesional y humano", but do not encode Efeonce's creative/strategic voice or the boundary between warm and playful.
- There is no prompt evolution protocol: no prompt version field, no required eval gates, no trigger list for when the prompt must be refreshed after platform changes.
- Source policy is contradictory: main prompt says no final `Fuentes:` list; tool summary asks for `Fuentes:`; post-processing may append `Fuentes:` if no inline marker exists.
- There is no answer-quality eval that asserts "no raw Markdown heading", "no final duplicate sources block", "complete synthesized response" or "uses parent context when chunks are narrow".

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Baseline eval and prompt extraction

- Extract the current inline prompt into a versioned prompt builder module, preserving byte-equivalent output behind the default path.
- Add focused tests that snapshot the prompt when Knowledge is ON/OFF, finance status exists/does not exist, and different tool availability contexts apply.
- Run and extend the QA baseline with representative Notion/wiki/manual questions that currently feel fragmentary.
- Record the current contradictions in a small prompt audit note inside the task delta or architecture doc.

### Slice 2 — System Prompt V2 + Nexa Voice Contract

- Create a modular `NexaSystemPromptV2` with sections for identity, current platform reality, tool routing, Knowledge answer policy, operational-data policy, response modes and placement/length policy.
- Add current-date/runtime freshness awareness: Nexa should know when it is answering from Knowledge vs live tools, and when it is not checking live state.
- Add answer modes: `definition`, `how_to`, `policy`, `troubleshooting`, `comparison`, `operational_live`, `unknown/no_answer`.
- Encode Nexa's voice contract from `docs/context/05_voz-tono-estilo.md` and `docs/context/09_marca-agencia.md`: strategic, warm, useful, creatively sharp, evidence-led, no generic helpdesk tone.
- Add negative voice rules: no "jugueton" default, no jokes unless surgically useful, no emoji-as-personality, no startup-bro language, no empty hype, no exaggerated enthusiasm.
- Add governed emoji usage: emojis are allowed when they clarify tone, status or momentum, but must be sparse, semantically useful and never replace evidence, labels or operational meaning.
- Add positive voice patterns: "dato primero, interpretacion despues", "no es X, es Y" when it clarifies, one concise creative framing when helpful, and concrete next action when the user is trying to do work.
- Update the Knowledge rules: synthesize across sources; do not quote raw chunk headings; do not emit `Fuentes:` final block; cite inline `[n]`; if evidence is insufficient, say what is missing.
- Gate V2 behind a default-OFF flag such as `NEXA_SYSTEM_PROMPT_V2_ENABLED` until QA is green in staging.

### Slice 3 — Knowledge context hygiene

- Change the LLM-facing Knowledge grounding summary so headings are metadata, not raw Markdown body text.
- Strip or normalize leading Markdown heading lines (`#`, `##`, `###`) from the excerpt sent to the model while preserving `headingPath`, `citationLabel`, `humanUrl` and `citationAnchor` in the packet.
- Resolve the source-policy contradiction: the tool summary must not ask for final `Fuentes:` if the UI owns evidence.
- Keep the packet contract backward-compatible; do not break `KnowledgeRetrievalPacket` consumers.

### Slice 4 — Parent expansion, stitching and synthesis brief

- Add a retrieval-to-answer preparation layer that groups chunks by document/section, dedupes near-duplicate chunks from the same document, and selects the best evidence set for the answer.
- Add parent context for narrow chunks: document title, heading path, surrounding section context and optional adjacent/parent text where safe.
- If persisted document or section summaries are introduced, add them via additive schema/migration and an idempotent re-ingestion/backfill path.
- Produce a compact "evidence brief" for the LLM: query, intent, answer mode, top evidence groups, gaps, freshness, denied/filtered count and citation map.

### Slice 5 — Retrieval quality and reranking

- Improve ranking without replacing the FTS SSOT: rerank the top candidates by coverage, document diversity, heading match, exact phrase/semantic intent and freshness.
- Consider a vector/reranker layer only as additive and measured; do not remove the current FTS path.
- Add tests for wrong-source prevention when Notion manuals have generic headings like "Introduccion", "Uso", "Paso a paso" or "De".
- Tune default `limit`/grouping so the model sees enough context for synthesis without flooding the prompt.

### Slice 6 — QA matrix and quality gates

- Extend `pnpm qa:nexa-knowledge` with assertions for:
  - no raw Markdown heading markers in final answer (`##`, orphan `#`);
  - no duplicate final `Fuentes:` block when evidence UI is available;
  - inline citation markers exist for grounded answers;
  - no-answer remains honest;
  - sensitive topics mention human validation;
  - Knowledge answers do not claim live operational state;
  - response is synthesized, not just first excerpt copied.
- Add voice-quality checks with curated examples:
  - warm/direct without "jugueton";
  - agency-creative framing without hype;
  - emojis allowed only when purposeful and sparse;
  - no generic support phrasing ("Como asistente...", "Estoy encantado...");
  - no empty superlatives;
  - preserves `tu` treatment.
- Add golden questions for the Notion wiki/manual corpus, including broad "como funciona X" and multi-document synthesis questions.
- Add at least one regression fixture for the original "manuales con ##" failure mode.

### Slice 7 — Prompt evolution governance

- Create a prompt governance contract (code + docs) that defines when Nexa's prompt must evolve.
- Add prompt version metadata to responses or internal logs where feasible (`promptVersion`, `promptFamily`, `promptFlags`) without exposing sensitive prompt text to end users.
- Define mandatory triggers for prompt review:
  - new tool or capability added/removed;
  - new domain consumer of Nexa Answers/Chat;
  - Knowledge packet/schema/evidence contract changes;
  - Notion/manual corpus expands materially or changes authoring conventions;
  - brand voice/context docs change;
  - QA matrix regression or user feedback flags stale/wrong-source/tone issue;
  - provider/model/router changes;
  - production incident involving hallucination, wrong source, unsafe tone or missing citation.
- Define change classes:
  - `patch`: typo/copy clarity, no behavior change;
  - `minor`: new rule/section/eval, flag-gated;
  - `major`: routing/tool/contract change, requires staging sign-off and docs update.
- Add a prompt changelog location or section in architecture docs; each material prompt change records why, expected behavior, eval evidence and rollback.

### Slice 8 — Rollout and docs

- Update `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`, `CONVERSATIONAL_EXPERIENCE.md` and human docs only where the contract actually changes.
- Stage with V2 prompt flag OFF, then ON in staging for QA, then decide production rollout.
- Document final prompt sections, source policy, voice contract, evolution governance and answer quality rules in a compact agent-facing section.

## Out of Scope

- No redesign of the Nexa UI shell, floating panel or Answers Canvas. That belongs to `TASK-1112` and adjacent UI tasks.
- No activation of Knowledge retrieval in production unless `TASK-1092`/operator rollout approves it.
- No broad Notion ingestion expansion beyond the authorized corpus manifest.
- No MCP transport redesign; MCP should benefit downstream from the same Knowledge retrieval/summary primitives.
- No destructive rewrite of existing chunks. Any schema/content enrichment must be additive and idempotent.

## Detailed Spec

### Prompt V2 shape

The prompt should stop being a single inline string and become a composed contract. Suggested sections:

| Section | Purpose |
|---|---|
| `Identity` | Nexa as Greenhouse assistant, not generic chatbot. |
| `Current platform reality` | Greenhouse as ASaaS operational platform; Knowledge Center/Notion corpus; live tools vs docs. |
| `User/runtime context` | User, role, modules, finance signal, date/timezone, visible capabilities. |
| `Tool routing` | Which questions require tools, which require Knowledge, which need no tool. |
| `Knowledge answer policy` | Synthesize from evidence, cite inline, no raw headings, no final source list, no invention. |
| `Operational data policy` | Do not infer live state from manuals; use live tools or say it was not checked. |
| `Response modes` | definition/how-to/policy/troubleshooting/comparison/live/no-answer. |
| `Voice contract` | Warm, strategic, creative with restraint; evidence-led; no generic chatbot or playful persona. |
| `Prompt evolution metadata` | prompt version/family/flags and trigger rules for future changes. |
| `Placement policy` | Home/floating = concise; Knowledge lens = deeper synthesis; future placements can override. |

### Nexa voice contract

Nexa should sound like Efeonce operating inside the product: a strategic partner that understands creative work, delivery pressure and business proof. The voice is:

- **Friendly but not playful:** warm and easy to talk to, without jokes-as-default, emoji personality or exaggerated excitement.
- **Creative but grounded:** can frame a problem with taste and sharpness, but must tie the framing to evidence or next action.
- **Direct but not cold:** says the useful thing first, then context.
- **Honest without theatrics:** if there is no source, says so; if there is risk, names it.
- **Agency-native:** understands briefs, creative quality, campaign systems, revenue impact and client trust.
- **Emoji-aware:** can use emojis as light semantic markers (for example a check, warning or spark) when they help scanability or warmth. They must be rare, accessible in rendered UI and never carry the only meaning.

Approved tonal pattern:

> "La respuesta corta: X. El matiz importante es Y. Lo encontré en Z [1]. Si quieres actuar ahora, el siguiente paso seguro es W."

Anti-patterns:

- "¡Claro que sí! 😊" as default personality.
- "Como asistente de IA..." unless legally/security necessary.
- "Esto es increíble / espectacular / mágico" without proof.
- Long corporate abstraction before the answer.
- Humor that trivializes finance, payroll, legal, security, client delivery or operational risk.
- Replacing status text with emoji-only meaning.

### Current prompt issues to fix

- It optimizes for "panel de Home" brevity globally, but Knowledge questions often need deeper synthesis.
- It does not encode that the repo now has Knowledge Center, Notion corpus, Answer Trace, Nexa Answers Canvas, evidence UI and QA gates.
- It says no final sources list, while the tool summary asks for one.
- It says "fragmentos recuperados" and passes excerpts with raw Markdown, nudging the model to answer in fragments.
- It has no explicit voice gradient for an agency product: friendly/creative/strategic, with governed emoji usage, without becoming playful.
- It has no lifecycle rule for when to refresh the prompt after product, corpus or brand changes.

### Knowledge evidence brief contract

The LLM-facing brief should be independent from UI packets. It may be derived from `KnowledgeRetrievalPacket`, but it should not expose raw Markdown structure as answer prose.

Minimum fields:

- `query`
- `answerMode`
- `confidence`
- `freshness`
- `evidenceGroups[]` grouped by document/section
- `citationMap[]`
- `knownGaps[]`
- `policyNotes[]`
- `mustNotClaimLiveState: boolean`

### Prompt evolution governance

Prompt changes are product/runtime changes. Treat the prompt as a versioned artifact, not prose hidden in code.

Minimum governance:

- `promptVersion`: semantic-ish version (`nexa-system-prompt.v2.x`).
- `promptFamily`: e.g. `home-chat`, `knowledge-answer`, `floating-chat` if placements diverge.
- `changeReason`: short string in tests/docs.
- Snapshot tests for prompt assembly.
- QA matrix before staging flag flip.
- Rollback by flag to previous prompt family/version.
- Documentation delta when prompt rules, tone contract, tool routing or source policy changes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST ship before any behavior change.
- Slice 2 can ship flag-OFF after tests.
- Slice 3 MUST ship before enabling Prompt V2 broadly, because prompt quality depends on clean evidence.
- Slice 4 and Slice 5 can iterate after Slice 3, but any persisted summary/backfill must be staged separately.
- Slice 6 gates any production flag flip.
- Slice 7 governance MUST ship before production rollout, so future prompt edits do not become invisible drift.
- Slice 8 closes docs only after runtime behavior and QA evidence are real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Prompt V2 reduces tool-calling accuracy | Nexa runtime | medium | default-OFF flag, snapshot tests, QA matrix staging | `qa:nexa-knowledge` failures / tool invocation rate drift |
| Voice becomes too playful or generic | Nexa tone/product trust | medium | voice contract + curated eval cases + operator review | user feedback / tone QA failures |
| Prompt evolves invisibly and drifts again | Nexa governance | medium | prompt version metadata + changelog + required triggers | prompt version missing in tests/logs |
| Chunk hygiene breaks citation mapping | Knowledge / Nexa evidence | medium | packet backward compatibility, mapper tests, citation fixture | grounded answer missing `[n]` |
| Parent expansion leaks restricted/agent_excluded text | Knowledge access control | low-medium | derive only from already-authorized docs/chunks via reader SSOT; no direct UI query | denied/filtered regression test |
| Reranking overfits current corpus | Knowledge retrieval | medium | golden questions broadening, compare before/after results | wrong-source guard failures |
| Persisted summaries drift from source docs | Knowledge ingestion | medium | checksum-bound summaries, idempotent reingestion, freshness metadata | summary checksum mismatch |

### Feature flags / cutover

- `NEXA_SYSTEM_PROMPT_V2_ENABLED=false` by default. Enables the new prompt builder only after QA.
- If the answer-preparation layer materially changes retrieved context, add a separate default-OFF flag such as `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED`.
- Revert path: set flags to `false` + redeploy. Existing prompt/retrieval path remains available until production validation is complete.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert prompt extraction if snapshot parity fails before merge | <30 min | si |
| Slice 2 | Disable `NEXA_SYSTEM_PROMPT_V2_ENABLED` | <5 min + redeploy | si |
| Slice 3 | Disable synthesis brief flag or revert grounding summary change | <30 min | si |
| Slice 4 | Disable summary/parent expansion flag; if summaries persisted, leave unused | <5 min + redeploy | parcial |
| Slice 5 | Revert/tune reranker; preserve FTS fallback | <30 min | si |
| Slice 6 | QA-only; no runtime rollback needed | N/A | si |
| Slice 7 | Governance docs/code can be disabled from enforcement or reverted | <30 min | si |
| Slice 8 | Docs-only; revert doc delta if inaccurate | <15 min | si |

### Production verification sequence

1. Run prompt snapshot tests locally.
2. Run focal Knowledge retrieval tests and `pnpm qa:nexa-knowledge -- --env=local` if local auth/data are available.
3. Deploy staging with flags OFF; verify byte-equivalent behavior.
4. Flip Prompt V2 + synthesis brief flags ON in staging.
5. Run `pnpm qa:nexa-knowledge -- --env=staging` and review representative answers manually.
6. Verify no raw `##`, no duplicate `Fuentes:`, citations present, no-answer honest, and sensitive-validation wording.
7. Only after operator sign-off, flip production flags.
8. Monitor feedback and Knowledge reliability signals for at least 48h.

### Out-of-band coordination required

- Operator sign-off before production flag flip.
- If persisted summaries are added, schedule re-ingestion/backfill window and document the run report.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] The system prompt is versioned, modular and covered by snapshot tests.
- [ ] Prompt V2 reflects current repo reality: Knowledge Center, Notion corpus, Nexa Answers/Answer Trace, evidence UI, provider router and live-vs-docs distinction.
- [ ] Nexa voice contract is encoded and tested: friendly/strategic/creative-with-restraint, governed emoji usage, not playful or generic.
- [ ] Prompt evolution governance exists: triggers, change classes, version metadata, eval requirements and rollback path.
- [ ] Final Knowledge answers do not leak raw Markdown heading markers from chunks.
- [ ] Source policy is consistent: inline `[n]` citations in text, evidence in UI, no duplicated final `Fuentes:` list when evidence UI is available.
- [ ] Knowledge grounding sent to the LLM is an evidence brief with grouping/context, not only raw excerpt lines.
- [ ] Parent expansion/dedupe/reranking are covered by tests and do not bypass access control.
- [ ] QA matrix includes answer-quality assertions and at least one regression for manual/wiki `##` leakage.
- [ ] QA matrix includes tone assertions or curated cases for agency-creative voice without empty hype/jokes, and with emojis used only when purposeful.
- [ ] Staging QA passes with flags ON before any production activation.

## Verification

- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/nexa`
- `pnpm test src/lib/knowledge`
- `pnpm qa:nexa-knowledge -- --env=local` when local auth/data are available
- `pnpm qa:nexa-knowledge -- --env=staging` before rollout
- Manual review of representative Knowledge answers in staging

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` y `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` reflejan solo los contratos que realmente cambiaron
- [ ] `TASK-1092` y `TASK-1112` quedaron actualizadas/enlazadas si el resultado cambia su scope o desbloquea rollout

## Follow-ups

- Possible future vector/reranker task if FTS + rerank still cannot answer broad wiki questions after measured QA.
- Possible persisted document-summary maintenance task if summaries need scheduled refresh beyond ingestion.

## Delta 2026-06-14

Task created from operator request after observing that Knowledge-backed Nexa answers can feel chunk-like and may leak Markdown headings from manual/wiki ingestion.

## Delta 2026-06-14b

Expanded scope per operator direction: Prompt V2 must include a governed evolution model and a Nexa voice contract that reflects Efeonce as a creative agency with operational proof. Voice target: warmer and more strategically creative, without becoming playful, jokey or hype-driven.

## Open Questions

- Should Prompt V2 be enabled only for Knowledge-intent turns first, or for all Nexa turns after QA?
- Are persisted section/document summaries required in V1, or can Slice 4 start as an in-memory evidence brief derived from existing packets?
