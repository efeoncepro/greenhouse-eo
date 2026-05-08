# Efeonce Overlay

> Optional opinionation layer. Activated when the work is for Efeonce Group SpA (Greenhouse, Kortex, Verk, Efeonce Web, Nexa, ICO Engine, etc.) or when the user explicitly invokes it.

The base skill (`software-architect-2026`) is product- and company-agnostic — universal architecture principles, evidence-based recommendations, current 2026 stack reality. This overlay layers Julio's specific context on top:

- The product ecosystem (Greenhouse / Kortex / Verk / Efeonce Web / Nexa)
- The IDD methodology (Intelligence-Driven Development) and TASK system
- Stack defaults that have already been validated and adopted
- LATAM-specific compliance (Ley 21.719 Chile, LGPD Brasil)
- Conventions documented in the per-repo CONSTITUTION files

## When this overlay is loaded

The skill should activate this overlay when **any** of the following is true:

1. The user mentions any Efeonce product or system: Greenhouse, Kortex, Verk, Nexa, ICO Engine, AXIS, Efeonce Web, ICO framework, Surround Discovery, Praxis, IDD
2. The user mentions Efeonce business units: Globe, Efeonce Digital, Reach, Wave, CRM Solutions
3. The user references Efeonce-specific tooling: TASK system, CONSTITUTION.md, plan.md, the agent skill protocol, IDD
4. The user is working in repos with `efeoncepro` GitHub org or repos: `greenhouse-eo`, `kortex`, `efeonce-web`, `notion-bigquery`, `hubspot-bigquery`
5. The user explicitly says "use the Efeonce overlay" or equivalent
6. The conversation context (memories, prior turns) makes it clear the work is for Efeonce

If unsure, ask: "Should I apply the Efeonce-specific conventions and stack defaults here, or treat this as a general design problem?"

## What the overlay changes

### Stack defaults

Instead of evaluating stack choices fresh for each problem, the overlay applies the validated Efeonce defaults from `stack-defaults.md` unless there's a specific reason to deviate. This saves time and keeps the ecosystem coherent.

### Conventions enforced

The overlay loads Efeonce-specific conventions:
- ICO Engine as sole metrics source (no inline calculations)
- Domain-per-schema in PostgreSQL
- `@/lib/db` as only connection entry point (Greenhouse)
- Reuse-before-create
- Fix-mínimo (only change what's necessary)
- Agent branch + PR discipline (never merge directly to main/develop)
- AI stack separation: Kortex uses Anthropic API directly; Greenhouse Nexa uses Vertex AI

See `conventions.md` for the full list.

### Compliance scope

The overlay assumes LATAM compliance is in scope by default:
- Ley 21.719 Chile (in force from 2024-2025; full implementation phasing through 2026-2027)
- LGPD Brasil
- GDPR for any EU users that arrive
- SOC 2 readiness for enterprise tier on Kortex

See `compliance-latam.md` for treatment.

### Output handoff

Architecture artifacts (architecture spec, component spec, ADR) produced by the skill should be convertible to the TASK_TEMPLATE_v2 format that Efeonce's agent system uses (Claude Code, Codex). When the user asks for a "TASK doc", the skill output should be:

- Match the zone-based structure (Zone 0: Header / Zone 1: Context / Zone 2: Schema / Zone 3: Vista specs / Zone 4: Acceptance + agent notes)
- Use Spanish-LATAM with English code-switching for technical terms (matching Julio's style)
- Use Given/When/Then for acceptance criteria
- Reference repo-specific CONSTITUTION invariants where applicable

See `handoff-to-task.md` for the conversion template.

## What the overlay does NOT change

- The 8-step workflow (still applies)
- The mandatory research pass (still applies — Efeonce stack defaults still need to be revalidated periodically)
- The mandatory self-critique pass (still applies)
- The cognitive debt checklist (still applies — actually especially relevant for agent-generated code)
- The discipline of citing sources for current-reality claims

## How to deactivate

If the user is working on something for Efeonce but explicitly wants the skill to evaluate fresh (e.g., "for this decision, ignore that we use Vercel — I want to know if AWS would be better"), the skill respects that and treats the choice as open.

The overlay is a **default**, not a constraint. Julio asks for fresh evaluation, the skill gives fresh evaluation.

## Files in this overlay

- `README.md` (this file): when to activate, what changes
- `conventions.md`: the invariants that apply across Efeonce repos
- `stack-defaults.md`: validated stack choices per product
- `compliance-latam.md`: Ley 21.719 Chile, LGPD Brasil, regional data residency
- `handoff-to-task.md`: how to convert skill output to TASK doc format
