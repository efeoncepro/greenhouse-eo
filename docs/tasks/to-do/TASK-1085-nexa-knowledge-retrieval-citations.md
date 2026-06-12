# TASK-1085 — Nexa Knowledge Retrieval With Citations

## Delta 2026-06-12 — UI pre-construida (NexaComposer + assistant-ui) + cruce con el contrato

Codex canonizó la primitive `NexaComposer` (variant `chat`, runtime-agnóstica) + incorporó `@assistant-ui/react`/`-react-markdown` como dependencia (commit `78346c636`). Para 1085:

- **El cruce crítico es acá:** cuando el composer envíe la pregunta, la respuesta DEBE venir de `searchKnowledge({ mode: 'agentic' })` (citas + filtrado agéntico + `confidence='none'`→no-inventar), NUNCA un LLM call sin retrieval ni query directo a las tablas. El composer deja esto abierto correctamente (no cablea el retrieval adentro).
- **ADR pendiente:** `@assistant-ui/react` como runtime canónico de chat de Nexa es una decisión de plataforma — declararla como ADR en esta task (o una derivada) antes de cablear el runtime productivo.

## Delta 2026-06-12 — desbloqueada por TASK-1083 (contrato listo)

La Search API ya existe. Nexa **consume el contrato**, no las tablas:

- Reader SSOT `searchKnowledge({ query, subject, mode: 'agentic' })` (`src/lib/knowledge/search/search-knowledge.ts`) — lane-agnóstico, ya filtra pre-LLM (NUNCA retorna `agent_excluded`/`quarantined`/`restricted`), devuelve `KnowledgeRetrievalPacket` v1 con citas (`citationLabel`/`humanUrl`), `confidence` (`'none'`→no-answer honesto), `freshness` y `deniedOrFilteredCount`. Nexa NO debe queryear `knowledge_chunks` directo (lint `greenhouse/no-direct-knowledge-chunk-query`).
- Feedback: usar el contrato compartido `POST /api/platform/app/knowledge/feedback` (Full API Parity #5), no uno propio.
- **El signal `knowledge.retrieval.low_citation_rate` es de ESTA task** (Delta D de 1083): mide cuántas respuestas de Nexa citan; en 1083 todavía no hay "respuesta".
- Answer Rules (arch §12.4): responder solo con lo respaldado por el packet, citar, declarar stale/deprecated, distinguir dato operativo vivo vs guía publicada, pedir validación humana en legal/payroll/finance/security, decir "no encontré una guía publicada" cuando `confidence='none'`.

## Delta 2026-06-11

Cerrado por **TASK-1080** (alineado, sin cambio estructural):

- Nexa retira solo docs `agent_allowed` (la columna `agentic_policy` es la compuerta; un doc `published` puede ser `agent_excluded` y queda fuera de Nexa). Corpus MVP **solo interno**.
- **Dominios sensibles** (finance, payroll, legal, security, access): Nexa no los usa sin la firma del approver de dominio (ver arquitectura Delta tabla D). Hasta esa firma nacen `agent_excluded`.
- Sigue flag-gated (`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default false); esta aceptación NO levanta el gate.

## Delta 2026-06-11 — Visual contract input from Answer Trace Studio

El mockup `/knowledge/mockup/answer-trace` deja un target de UX para Nexa cuando use Knowledge Retrieval: respuesta verificable, citas visibles, warning de freshness, gap honesto y feedback de mejora. No conecta Nexa ni levanta `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; la integración sigue bloqueada por `TASK-1083`.

Implicaciones para esta task:

- Nexa debe renderizar/emitir fuentes como evidencia, no solo como texto decorativo.
- Si el packet indica baja confianza, stale/deprecated o datos operativos no consultados, la respuesta debe decirlo de forma directa.
- El copy de gap honesto validado en el prototipo es: `No consulté datos actuales ni fuentes fuera de Knowledge. Si necesitas estado productivo, valida en el módulo operativo.`
- El feedback de respuesta debe mapear al contrato compartido de Knowledge feedback, no a un handler local del chat.
- La métrica `knowledge.retrieval.low_citation_rate` se evalúa contra respuestas con citas reales; el mockup sirve como forma objetivo, no como medición.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|content|ai`
- Blocked by: `TASK-1083`
- Branch: `task/TASK-1085-nexa-knowledge-retrieval`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conectar Nexa a Knowledge Platform mediante retrieval-on-demand: `knowledge_search`, citation packet, respuesta con fuentes, freshness warnings, no-invención y feedback auditable. La integración debe ser flag-gated y no cargar el corpus completo en prompt.

## Why This Task Exists

Nexa necesita un depósito de conocimiento gobernado para responder consultas de uso, procedimientos y definiciones. Sin retrieval con citas y reglas de gap honesto, Nexa puede sonar segura mientras inventa o usa fuentes stale.

## Goal

- Agregar tool/context path de knowledge en Nexa.
- Hacer que Nexa cite fuentes y declare stale/deprecated.
- Capturar metadata de respuesta y feedback sin almacenar conversaciones completas por defecto.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Nexa no carga corpus completo en prompt.
- Si usa chunks, cita fuentes.
- Si no hay evidencia suficiente, responde gap honesto.
- Si la fuente está stale/deprecated, lo dice.
- Legal, payroll, finance, security o contractual commitments requieren fuente aprobada o validación humana.

## Normative Docs

- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/to-do/TASK-1084-human-knowledge-center-mvp.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` para `knowledge_search` y evals.
- Corpus piloto con golden questions.

### Blocks / Impacts

- Afecta chats de Nexa y futuras surfaces que usen Nexa como ayuda contextual.

### Files owned

- `src/lib/nexa/**`
- `src/app/api/home/nexa/**`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Nexa tiene runtime/chat/persistencia en evolución.
- Knowledge architecture define Context Contract, Retrieval Trigger, Answer Rules y Feedback Loop.

### Gap

- Nexa todavía no usa Knowledge Platform como contexto recuperado.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Retrieval trigger + tool contract

- Clasificar preguntas que requieren knowledge.
- Invocar `knowledge_search` con user context.
- Inyectar solo retrieval packet acotado al turno.

### Slice 2 — Answer rules + citations UI

- Responder con fuentes, freshness y gaps honestos.
- Renderizar fuentes como chips/accordion en chat compacto.
- Distinguir dato operativo actual vs regla publicada cuando ambos aplican.

### Slice 3 — Feedback + observability metadata

- Registrar chunk IDs usados, confidence, freshness y feedback.
- Signals mínimos: no-source, stale-source, low-confidence.

## Out of Scope

- MCP resources, embeddings, Notion live reads, writes programáticos, cambios de modelo no relacionados.

## Detailed Spec

El system prompt de Nexa solo debe incluir reglas estables de uso de knowledge. El contenido recuperado vive en tool result del turno. La UI debe mostrar fuentes sin saturar la conversación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (retrieval) -> Slice 2 (answer/citations) -> Slice 3 (feedback/signals). No activar default-on sin eval smoke verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa inventa al no recuperar docs | ai/content | medium | `confidence='none'` obliga gap honesto | `knowledge.nexa.no_source_answer_rate` |
| Fuente sensible llega al modelo | security | medium | filtering en `knowledge_search` + tests | denied chunk en prompt |
| UX se llena de citas ruidosas | ui | low | chips/accordion | feedback negativo |

### Feature flags / cutover

- Flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default false hasta smoke/evals.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag false | <5 min | sí |
| 2 | ocultar citation UI y revert prompt/tool wiring | <10 min | sí |
| 3 | deshabilitar feedback metadata writes | <10 min | sí |

### Production verification sequence

1. Eval golden questions antes/después.
2. Smoke en staging con flag true.
3. Confirmar citas/freshness/no-answer.
4. Activación gradual interna.

### Out-of-band coordination required

- Aprobación humana para corpus sensible antes de habilitar en Nexa.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Nexa llama `knowledge_search` solo cuando aplica.
- [ ] Respuestas grounded incluyen fuentes y freshness.
- [ ] No-answer/gap honesto funciona cuando `confidence='none'`.
- [ ] No hay lectura Notion live ni corpus completo en prompt.
- [ ] Metadata/feedback de uso queda auditada sin guardar conversaciones completas por defecto.
- [ ] Flag default false y rollback documentado.

## Verification

- tests/evals golden questions
- smoke chat con preguntas de manual, stale y no-answer
- `pnpm task:lint --task TASK-1085`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con flag, smoke y rollout state.
- [ ] `changelog.md` actualizado.
- [ ] Manual de uso de Nexa actualizado.

## Follow-ups

- `TASK-1086` MCP resources.
