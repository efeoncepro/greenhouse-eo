# Efeonce architecture router

Load this overlay automatically inside an Efeonce repository or when the request concerns Greenhouse, Kortex, Globe, Efeonce Think, the public site, or another governed Efeonce capability. Outside that context, apply it only when localization is requested or clearly material.

## Precedence

Resolve authority in this order:

1. repository instructions and the active task/issue/epic/spec;
2. accepted decisions and domain architecture;
3. verified code, schema, configuration, data, and runtime;
4. domain invariants and routed skills;
5. this overlay as discovery help;
6. historical snapshots only as searchable evidence.

The overlay never overrides canon and never stores a parallel stack, legal digest, task template, schema rule, or runtime status.

## Greenhouse preflight

Read `AGENTS.md`, `project_context.md`, `Handoff.md`, and the active work artifact. Use `docs/operations/agent-context-router.json` and the domain table in `AGENTS.md` to load only the relevant architecture, invariants, and skills.

For structural work, load:

- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`;
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`;
- `docs/architecture/DECISIONS_INDEX.md`;
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` when an ADR gate is triggered.

Do not infer authorization to create an `apps/*`, `packages/*`, service, deployable, repository, shared database/session, or cross-runtime secret from a candidate future home.

## Concern routing

| Concern | Load next |
|---|---|
| Task/issue/epic execution | `task-routing.md` and the repository operating loop |
| Technology or runtime fact | `technology-resolution.md` and verified repository/runtime evidence |
| Privacy, law, IP, data transfers | `compliance-routing.md` and `legal-privacy-ip-operator` |
| UI platform or visible experience | `greenhouse-ai-design-studio`, then the UI implementation/accessibility skills and UI invariants |
| Backend/API/events/webhooks | `software-architect-2026`, API/webhook architecture, backend invariants, and domain owner |
| Identity/access | identity/workforce invariants and entitlements/roles architecture |
| Finance/payroll | finance or payroll specialist plus their canonical invariants |
| Knowledge/Nexa | `greenhouse-nexa-conversational` and Knowledge/Nexa invariants |
| HubSpot/CRM | `hubspot-greenhouse-bridge` or `hubspot-as-a-service` plus intake architecture |
| Growth/SEO/forms/CTAs/meetings | routed growth/SEO/GTM skill, `docs/context/`, tracking/privacy contracts |
| Public WordPress site | `efeonce-public-site-wordpress` and `docs/public-site/README.md` |
| Think/Astro | `seo-aeo`, `seo-aeo-practice`, and `astro`; runtime is outside this repo |
| Globe/Creative Studio | `greenhouse-globe`; preserve sister-platform ownership boundaries |
| Cloud/deploy/secrets | applicable cloud skill, `greenhouse-secret-hygiene`, and release/runtime canon |
| QA/closure | `greenhouse-qa-release-auditor`, then `greenhouse-documentation-governor` |

## Efeonce-wide design checks

Verify rather than assume:

- one source of truth per domain and explicit projection/consumer ownership;
- Full API Parity and governed non-UI consumers where the domain requires them;
- views and entitlements as distinct access planes;
- extraction-ready placement without premature topology changes;
- sister-platform boundaries for identity, data, sessions, buckets, secrets, and runtime;
- rollout completeness across flags, env, deploy, migrations, backfills, workers, integrations, data recovery, and live evidence;
- reuse of canonical readers, commands, primitives, capabilities, routes, copy, and signals.

If a current repository fact is missing from the router, find the canonical owner and update that owner/router through the repository workflow. Do not add the fact here as a shortcut.
