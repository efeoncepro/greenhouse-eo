# Greenhouse Knowledge Platform Decision V1

## Status

`Accepted (direction) — runtime gated per task` (desde 2026-06-11, TASK-1080)

> La **dirección** queda aceptada: Notion sigue como authoring; Greenhouse es el runtime gobernado de conocimiento publicado para humanos, Nexa y MCP. Esto **desbloquea** `TASK-1081..1086`. **NO autoriza** ingesta masiva ni runtime libre: cada task downstream ejecuta detrás de su propio gate (flag / migración / aprobación de dominio). Ver `## Acceptance Decision (TASK-1080)` al final.

## Date

2026-06-11

## Owner

Platform / Nexa / Knowledge Operations

## Scope

- Notion-authored knowledge bases used by Efeonce and Greenhouse.
- Human learning surfaces for operating Greenhouse.
- Nexa knowledge retrieval and answers with citations.
- Greenhouse MCP / webMCP knowledge resources and tools.
- API Platform contracts that expose knowledge safely to first-party UI, Nexa and agents.

## Reversibility

`Two-way but slow`

The proposal is reversible before implementation. Once documents are ingested, chunked, permissioned and used by Nexa, changing the source-of-truth boundary would require data migration, reindexing, audit preservation and retraining users on where knowledge is published.

## Confidence

`Medium`

The direction fits Greenhouse architecture and current Notion platform constraints, but the exact search/indexing substrate, first source taxonomy and publication workflow still need discovery.

## Validated as of

2026-06-11

- Greenhouse already has API Platform and MCP architecture that require MCP to be downstream of governed API contracts.
- Greenhouse already has Notion integration primitives for delivery metrics and tenant-scoped Notion source registration, but those are operational data pipelines, not a general knowledge layer.
- Notion's current public docs describe hosted Notion MCP as workspace-access tooling for AI agents, and data source query APIs as the canonical database/data source path. The proposed runtime boundary keeps deterministic Greenhouse sync separate from interactive Notion MCP usage.

## Context

Efeonce has knowledge in Notion that needs to serve two audiences:

1. **Humans** who need to learn how to operate Greenhouse, follow procedures and understand product concepts.
2. **Agents**, especially Nexa, that need a governed knowledge base to answer questions, cite sources and avoid inventing operational rules.

If Nexa reads Notion live for each answer, Greenhouse loses control over tenancy, freshness, citations, audit, prompt-injection boundaries and source lifecycle. If Greenhouse builds only a human manual, Nexa will still need a parallel retrieval layer and the system will drift.

Greenhouse should treat knowledge as product memory: authored in a friendly workspace, published into Greenhouse as governed runtime knowledge, and exposed through both human and agentic surfaces.

## Decision

Greenhouse should introduce a **Knowledge Platform**:

> Notion remains an authoring and collaboration surface. Greenhouse becomes the governed runtime source for published knowledge consumed by humans, Nexa and MCP clients.

The platform has two reader-facing layers over the same published corpus:

- **Human layer:** a Greenhouse learning/manual surface for people to browse, search and learn operational workflows.
- **Agentic layer:** API/MCP/Nexa tools for scoped retrieval, answer grounding, citations and freshness-aware responses.

The runtime path must be:

```text
Notion authoring
  -> Greenhouse Knowledge ingestion and publication
    -> API Platform knowledge contracts
      -> Human UI / Nexa / Greenhouse MCP
```

Nexa must not depend on live Notion workspace reads as the primary production retrieval path. Notion MCP can remain useful for authoring, operator research, migration and assisted editing, but it is not the Greenhouse runtime knowledge substrate.

## Alternatives Considered

### Alternative 1: Nexa connects directly to Notion MCP

Rejected as the primary runtime path. It is fast to prototype, but it makes Notion workspace permissions, live page shape and agent session state load-bearing for Greenhouse answers. It also weakens citations, tenant-scope enforcement, audit, freshness and degraded-mode behavior.

### Alternative 2: Use Notion API live on every Nexa question

Rejected as the primary runtime path. It avoids MCP coupling but still makes Notion latency, rate limits, page hierarchy and source availability part of the answer path. It also prevents Greenhouse from publishing stable document versions and measuring retrieval quality.

### Alternative 3: Copy Notion docs into static markdown in the repo

Rejected. It gives deterministic builds but destroys authoring ergonomics, creates review friction and makes business/process knowledge look like code. It is useful only for a small set of immutable architectural docs.

### Alternative 4: Human manual only, no agentic layer

Rejected. Nexa is a core Greenhouse interface. If humans and Nexa do not consume the same published knowledge, answers will drift from the manual.

### Alternative 5: Agentic RAG only, no human layer

Rejected. It hides the knowledge base behind answers and makes it harder for people to learn, verify and improve the source material.

## Consequences

### Positive

- Turns operational knowledge into accumulated Greenhouse memory, aligned with the ASaaS switching-cost strategy.
- Gives Nexa a governed retrieval substrate instead of ad hoc prompt context.
- Lets humans and agents consume the same published corpus through different presentations.
- Enables citations, freshness warnings, source provenance and feedback loops.
- Keeps MCP aligned with Greenhouse's existing API-first architecture.

### Negative

- Requires a new bounded context and publication workflow.
- Requires source taxonomy, access policy and freshness governance before broad ingestion.
- Adds indexing/retrieval quality work that cannot be treated as a pure UI feature.
- Requires care to avoid duplicating or contaminating the existing Notion delivery/metrics pipelines.

### Neutral / contextual

- Notion stays valuable as the authoring tool.
- Greenhouse may still use Notion MCP for operator workflows and migration assistance.
- The first version can be read-only and full-text based; embeddings/vector search can be phased in after corpus quality is understood.

## Runtime Contract

While this ADR is `Proposed`, it does not authorize implementation. If accepted later, the runtime contract should be:

- Published knowledge lives in a dedicated Greenhouse knowledge bounded context, likely `greenhouse_knowledge`.
- Notion-origin documents are snapshotted and versioned before they are exposed to Nexa.
- Human UI, Nexa and MCP consume API Platform contracts, not Notion directly.
- Greenhouse MCP knowledge tools are downstream of API Platform and read-only in V1.
- Nexa uses published knowledge through scoped retrieval tools, not by loading the whole corpus into the system prompt.
- Knowledge retrieval returns a bounded citation packet: chunks, source document metadata, freshness, access decision and confidence.
- Every agentic answer that uses the corpus must preserve citations and freshness metadata.
- If retrieved knowledge is insufficient, stale or contradictory, Nexa must answer with an honest gap instead of smoothing over uncertainty.
- Access policy is resolved by Greenhouse user/tenant/capability context, not by free-text labels or Notion page titles.
- Documents containing secrets, uncontrolled PII or unsupported legal/financial commitments are quarantined or excluded from agentic retrieval.
- Every published document must declare owner, audience, sensitivity, source, review cadence, last reviewed date and whether it is allowed for agentic retrieval.
- Human-facing knowledge must be organized as learning paths, manuals, SOPs, runbooks, FAQs, glossary entries, troubleshooting guides or policies, not exposed as raw Notion dumps.
- Documents visible to humans may be marked `agent_excluded` when Nexa/MCP should not retrieve them.
- Agentic retrieval requires pre-LLM filtering. Denied chunks are never passed to the model for discretionary filtering.
- Ingested content must be treated as untrusted input: prompt-injection-like instructions, secrets and unsafe embeds must be sanitized, quarantined or excluded before indexing.
- Each pilot corpus must define golden questions and expected citations before broad Nexa exposure.
- The first implementation should start with a small internal corpus, full-text search plus strong metadata filters, feedback capture and freshness states before embeddings or broad Notion ingestion.
- Existing Notion delivery/metrics sync remains a separate operational data pipeline; this platform governs knowledge documents, not task metrics.

## Initial Task Titles To Mature

No task files are created by this ADR. Candidate titles for later discussion:

1. Knowledge Platform Architecture Acceptance + Source Taxonomy
2. Knowledge Source Registry + Notion Connector Discovery
3. Notion Knowledge Ingestion MVP: Snapshot, Normalize, Version
4. Human Knowledge Center: Greenhouse Academy / Manual
5. Nexa Knowledge Context Retrieval Tool With Citations
6. Greenhouse MCP Knowledge Resources V1
7. Knowledge Freshness, Feedback and Reliability Signals
8. Knowledge Access Policy + Quarantine Workflow
9. Knowledge Human Learning Paths + Contextual Help
10. Nexa Knowledge Evals + Golden Questions
11. Knowledge Publication Workflow + Editorial Governance
12. Knowledge Prompt Injection Sanitizer + Quarantine Rules

## Revisit When

Reopen this proposal if:

- Notion MCP gains a tenant-safe, server-side, auditable contract that can satisfy Greenhouse runtime requirements directly.
- The first corpus is too small to justify a dedicated bounded context.
- Greenhouse chooses a different enterprise knowledge system as the authoring layer.
- API Platform or MCP architecture changes the rule that MCP must be downstream of governed API contracts.
- Legal/compliance review requires a stricter publication or retention model.

## Acceptance Decision (TASK-1080)

Cerrado 2026-06-11 por el operador (Julio) con el overlay `arch-architect`. Esta sección convierte el ADR de `Proposed` a `Accepted (direction)` y fija las decisiones pequeñas que faltaban para que `TASK-1081..1086` sean ejecutables. Detalle extendido (tablas de corpus piloto, owners/approvers, capability/view sketch, estados) en `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` → `## Delta 2026-06-11 — Acceptance (TASK-1080)`.

### D-1 — Naming + bounded context

- Superficie humana: **Knowledge**, ruta `/knowledge`.
- Bounded context / schema: `greenhouse_knowledge`. TS root: `src/lib/knowledge/`. viewCode: `plataforma.knowledge` (routeGroup `internal`, sembrado **solo a roles internos** — nunca `client_*`).
- El nombre de la surface y el del bounded context coinciden (sin alias visible adicional).

### D-2 — Audiencia MVP

- **Solo interno.** Todo el corpus piloto nace `audience = internal`, `sensitivity = internal`. Cero exposición a portal cliente en el MVP.
- `sensitivity = client_safe` y la audiencia `client` se introducen en una fase posterior, con su propio gate y revisión de acceso (no en esta ola).

### D-3 — Dos dimensiones ortogonales (corrección arquitectónica)

El draft mezclaba `agent_excluded` dentro del enum de lifecycle. Se **separan en dos dimensiones ortogonales** (regla anti-enum-mixto del overlay `arch-architect`):

- `publication_status` (lifecycle del documento): `draft → review → published → stale → deprecated`; `quarantined` es un estado de bloqueo alcanzable desde cualquiera.
- `agentic_policy` (compuerta de retrieval, independiente del lifecycle): `agent_allowed | agent_excluded`. Un documento `published` puede ser `agent_excluded` (visible para humanos, fuera de Nexa/MCP).

`quarantined` ⇒ invisible para humanos **y** agentes (gana sobre ambas dimensiones).

### D-4 — Corpus piloto

- 14 documentos internos de alto valor mapeados a `docs/manual-de-uso/` + `docs/documentation/` existentes (tabla en la arquitectura). Una sola ruta de aprendizaje inicial ("Primeros pasos / Operación Greenhouse"), no todo el portal.
- ≥1 documento nace `agent_excluded` para ejercitar la compuerta desde V1 (política interna de secretos/acceso sensible).
- Búsqueda V1: **full-text (Postgres FTS) + filtros fuertes por metadata**. Embeddings/vector diferidos hasta medir calidad y volumen real (Postgres-first, ADR §7.4).

### D-5 — Owners + approvers por dominio

- Cada documento declara `owner_domain` + `approver_role`. Mapa canónico en la arquitectura (usa `ROLE_CODES` reales: `efeonce_admin`, `finance_admin`, `hr_manager`/`hr_payroll`, `efeonce_operations`, `efeonce_account`).
- **Dominios sensibles** (finance, payroll, legal, security, access) **no pasan a `agent_allowed` sin aprobación del approver del dominio**. No existe rol `legal` → su approver es `efeonce_admin` con confirmación humana out-of-band registrada.

### D-6 — Capabilities (granular, no coarse)

Módulo `knowledge`. Capabilities propuestas (materializan en TASK-1081):

- `knowledge.document.read` — leer corpus publicado (scoped por tenant/role/audience/sensitivity).
- `knowledge.document.publish` — publicar Notion→Greenhouse (owner domains + `efeonce_admin`; sensibles exigen approver de dominio).
- `knowledge.source.admin` — administrar source registry (`efeonce_admin`).
- `knowledge.agentic.retrieve` — retrieval Nexa/MCP scoped (capability de sistema/agente).
- `knowledge.feedback.submit` — feedback humano sobre un documento/respuesta.

Cada capability se siembra con su grant en `runtime.ts` en el mismo PR que la introduce (invariante TASK-873/935).

### D-7 — Secuencia de rollout (gated por task)

```text
TASK-1080 (esta, policy/accepted)
  -> TASK-1081 schema + source registry + capabilities (gate: migración)
    -> TASK-1082 ingesta Notion MVP (snapshot/normalize/version/sanitize/quarantine)
      -> TASK-1083 knowledge_search API + golden questions (gate: eval harness)
        -> TASK-1084 Human Knowledge Center  ─┐
        -> TASK-1085 Nexa retrieval + citas   ├─ paralelas tras 1083, cada una con su flag
        -> TASK-1086 MCP knowledge resources  ─┘
```

Cada task downstream conserva su `Out of Scope` y su gate propio (flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default false, etc.). Esta aceptación NO levanta esos gates.

### 4-pillar scoring (de la decisión, no del runtime)

- **Safety:** internal-only + `agentic_policy` ortogonal + pre-LLM filtering + dominios sensibles con approver + `quarantined` que gana sobre todo. Blast radius del MVP acotado a un tenant interno; cero superficie cliente.
- **Robustness:** corpus chico y evaluable; golden questions antes de exponer a Nexa en producción; publicación como decisión explícita (no auto-publish de todo Notion).
- **Resilience:** estados `stale/deprecated` + signals de freshness/no-source/low-confidence ya definidos en la arquitectura; degradación honesta ("no encontré guía publicada") es contractual.
- **Scalability:** full-text antes que embeddings evita comprometer un substrato vectorial sin medir; el source registry escala a más fuentes sin rediseño; embeddings son una fase aditiva, no un rework.

### Open decisions deferred (con owner + condición de cierre)

| Decisión diferida | Owner | Condición de cierre |
| --- | --- | --- |
| Substrato vector (`pgvector` vs Vertex/BQ) | Platform | Tras medir calidad/volumen del corpus full-text en TASK-1083 |
| Audiencia `client` + `client_safe` | Product + Identity | Fase posterior, con revisión de acceso dedicada |
| Set final de golden questions + quién las aprueba | Nexa / dominio | Se cierra en TASK-1083 por dominio del documento |
| Versionado de docs que tocan legal/finance/payroll | Finance/HR/Legal approvers | Se define en TASK-1081/1082 con el publish workflow |

## Related Documents

- [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md)
- [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md)
- [GREENHOUSE_MCP_ARCHITECTURE_V1.md](GREENHOUSE_MCP_ARCHITECTURE_V1.md)
- [GREENHOUSE_NEXA_ARCHITECTURE_V1.md](GREENHOUSE_NEXA_ARCHITECTURE_V1.md)
- [GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md](GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md)
- [GREENHOUSE_FULL_API_PARITY_DECISION_V1.md](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
