# Greenhouse Glitch Agentic Editorial Pipeline Decision V1

## Status

- Status: `Proposed`
- Date: `2026-07-18`
- Owner: `Content / Public Site / Marketing Operations`
- Scope: Glitch research, candidate memory, weekly edition authoring, Notion calendar integration, Content Factory handoff, WordPress draft lifecycle, scheduling, audit and reliability.
- Reversibility: `two-way-but-slow`
- Confidence: `high`
- Validated as of: `2026-07-18`

## Context

Glitch has operated as an agent-assisted weekly editorial product with three recurring modes: Daily candidate discovery, Flash urgent staging and Weekly selection/redaction. The exported Claude Cowork package preserves valuable editorial doctrine but uses local Markdown and a direct WordPress shell write as its operating substrate. Greenhouse already owns the governed Content Factory, WordPress/Kinsta operations, agentic blogpost runbook and ops-worker primitives.

The next numbered edition is Glitch #16, scheduled in the Efeonce Notion Q3 calendar for 2026-07-21. Q3 continues through #26 and Q4 continues with #27–#39. The architecture must preserve editorial judgment while making state, writes, retries and publication gates deterministic and auditable.

## Decision

1. Greenhouse is the operational control plane and source of truth for candidates, editions, executions, source/claim evidence and publication mappings.
2. Notion remains the team-facing editorial calendar and numbered placeholder registry. It is a projection/integration boundary, not the authoritative candidate ledger.
3. WordPress remains the editorial destination. The governed Content Factory is the only write path for Gutenberg drafts.
4. The exported Markdown corpus is migration seed, doctrine and historical evidence; it is not mutable production state.
5. One dedicated `greenhouse-glitch-editorial-agent` skill owns the editorial modes `daily`, `flash` and `weekly`. The public-site WordPress skill remains a compact publishing router.
6. Agentic autonomy may cover research, candidate scoring, selection, POV, writing, Notion preparation and creation/update of one idempotent WordPress `private` draft.
7. Public publication remains a human-authorized action. TASK-1323 auto-publish is not a dependency and cannot silently widen this boundary.
8. `weeklyEdition` and `tacticalGlitch` are distinct content kinds. Only `weeklyEdition` consumes the numbered calendar sequence.
9. Schedulers wake governed commands; prompts do not own persistence, locking, retries, budgets, audit, recovery or publication state.
10. Glitch #14 and #15 are initial golden examples. Historical #12/#13 Gutenberg structures are not migrated automatically.

## Alternatives Considered

- Keep the Claude Cowork folder as runtime: rejected because local files and direct shell writes lack shared state, idempotency and reliable audit.
- Put all Glitch behavior inside `efeonce-public-site-wordpress`: rejected because it mixes editorial judgment with infrastructure routing and would violate the compact-skill decision.
- Make Notion the complete source of truth: rejected because candidate/claim ledgers, locks, retries and audit need stronger contracts than an editorial calendar.
- Auto-publish every Tuesday: rejected for V1 because editorial truth, brand safety and public rollback still require explicit human authorization.
- Three independent agents: rejected because shared doctrine, dedupe and learning would drift across Daily, Flash and Weekly.

## Consequences

- Greenhouse gains an auditable, replayable editorial pipeline without reducing editorial judgment to deterministic ranking.
- Notion and WordPress become adapters behind a stable edition contract.
- The first production milestone can remain human-supervised while generating evidence for later autonomy.
- The system requires a small canonical data model, commands/readers, scheduler orchestration, evals and reliability signals.
- Public publishing stays slower than full autonomy by design; this is a safety boundary, not incomplete implementation.

## Runtime Contract

- Program: `docs/epics/to-do/EPIC-031-glitch-agentic-editorial-pipeline.md`.
- Policy and acceptance: `TASK-1440`.
- Controlled #16 pilot: `TASK-1441`.
- Domain/API foundation: `TASK-1442`.
- Editorial skill/evals: `TASK-1443`.
- Notion and Content Factory adapters: `TASK-1444`.
- Scheduler/reliability: `TASK-1445`.
- Rollout/closure: `TASK-1446`.
- Existing consumers/contracts: TASK-1123 Content Factory, TASK-1337 `efeoncepro/glitch-drop`, PDR-003 and the agentic blogpost runbook.

No schema/table/command name in this Proposed ADR is authoritative until TASK-1442 accepts the concrete contract and updates this document.

## Revisit When

- Human review shows a sustained false-positive/false-negative rate low enough to consider narrower auto-publication.
- Notion is replaced as the editorial calendar.
- WordPress stops being the editorial CMS/origin after public-site cutover.
- A second editorial product needs the same candidate/edition primitives.
- Tactical Glitch and numbered editions require separate public information architecture.

