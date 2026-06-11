# Greenhouse Knowledge Platform Decision V1

## Status

`Proposed`

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
- Every agentic answer that uses the corpus must preserve citations and freshness metadata.
- Access policy is resolved by Greenhouse user/tenant/capability context, not by free-text labels or Notion page titles.
- Documents containing secrets, uncontrolled PII or unsupported legal/financial commitments are quarantined or excluded from agentic retrieval.
- Existing Notion delivery/metrics sync remains a separate operational data pipeline; this platform governs knowledge documents, not task metrics.

## Initial Task Titles To Mature

No task files are created by this ADR. Candidate titles for later discussion:

1. Knowledge Platform Architecture Acceptance + Source Taxonomy
2. Knowledge Source Registry + Notion Connector Discovery
3. Notion Knowledge Ingestion MVP: Snapshot, Normalize, Version
4. Human Knowledge Center: Greenhouse Academy / Manual
5. Nexa Knowledge Retrieval Tool With Citations
6. Greenhouse MCP Knowledge Resources V1
7. Knowledge Freshness, Feedback and Reliability Signals
8. Knowledge Access Policy + Quarantine Workflow

## Revisit When

Reopen this proposal if:

- Notion MCP gains a tenant-safe, server-side, auditable contract that can satisfy Greenhouse runtime requirements directly.
- The first corpus is too small to justify a dedicated bounded context.
- Greenhouse chooses a different enterprise knowledge system as the authoring layer.
- API Platform or MCP architecture changes the rule that MCP must be downstream of governed API contracts.
- Legal/compliance review requires a stricter publication or retention model.

## Related Documents

- [GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md](GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md)
- [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md)
- [GREENHOUSE_MCP_ARCHITECTURE_V1.md](GREENHOUSE_MCP_ARCHITECTURE_V1.md)
- [GREENHOUSE_NEXA_ARCHITECTURE_V1.md](GREENHOUSE_NEXA_ARCHITECTURE_V1.md)
- [GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md](GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md)
- [GREENHOUSE_FULL_API_PARITY_DECISION_V1.md](GREENHOUSE_FULL_API_PARITY_DECISION_V1.md)
