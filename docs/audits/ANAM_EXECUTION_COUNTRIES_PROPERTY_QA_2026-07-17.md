# ANAM execution countries property QA — 2026-07-17

> **Verdict:** PASS
> **Closure state:** approved schema slice complete
> **Risk class:** high — external CRM schema/data
> **Portal:** ANAM HubSpot `19893546`
> **Scope:** one additive Deal property; no records, workflows, reports, forms, pipelines or backfill

## Intent and acceptance

ANAM needed to distinguish the customer Company's headquarters from the country or countries where a Deal is
executed. Acceptance required a natural visible label, a stable snake-case internal name, multiselect behavior,
LATAM options, a dry run, an exact one-property release and direct HubSpot readback.

## Verification matrix

| Layer | Evidence | Result |
|---|---|---|
| Target boundary | HubSpot CLI account and Kortex portal resolve to `19893546`; Greenhouse/Efeonce is `48713323` | PASS |
| Existing schema | `zona` read as Deal `checkbox`, label `Región`, with 16 Chilean regions | PASS |
| Collision check | No existing Deal property matched execution-country name/label | PASS |
| Direct credential probe | PAK POST rejected `403` for missing `crm.schemas.deals.write`; follow-up read confirmed no property created | PASS — safe failure |
| Governance preflight | First Kortex RC rejected `paises_de_ejecucion` before HubSpot because managed names require `ef_` | PASS — safe failure |
| Final dry run | Run `4aca0530-3b95-4e5f-bd4c-501cec536a88`: create one Deal property, no validation errors, no pipelines | PASS |
| Live deployment | Run `2c80ce1a-0527-471b-a1c4-8ac40a7164e8`: property created `1`, errors `0`; existing group reused | PASS |
| Runtime readback | `ef_paises_de_ejecucion`, label `Países de ejecución`, `enumeration` + `checkbox`, 20 expected options, active/non-archived/editable | PASS |
| Record impact | `HAS_PROPERTY` search returned `0` Deals | PASS — no backfill intended |
| Documentation | Change set, living model, functional doc, runbook, service catalog, Handoff and changelog synchronized | PASS |

Repository closure also passed `pnpm qa:gates --changed --agent codex --runtime --data --integration --docs`,
`pnpm docs:closure-check`, `pnpm docs:context-check`, `pnpm ops:lint --changed` and targeted
`git diff --check`. The context check returned only the two pre-existing size/history warnings for `Handoff.md`;
there were no errors and the documentation closure check returned zero warnings.

## Exact runtime contract

- object: Deal;
- property: `ef_paises_de_ejecucion`;
- label: `Países de ejecución`;
- group: `dealinformation`;
- type/field type: `enumeration` / `checkbox`;
- values: 20 Latin American countries documented in the technical change set;
- current populated records: `0`;
- deployment source: approved Kortex release candidate `6533ebe9-d910-4ba1-ac97-53056d11f8ed`.

## Negative-path and false-closure review

- The direct API credential did not have schema-write scope. Its `403` did not leave a partial property.
- Kortex rejected the first non-prefixed internal name before any CRM write.
- The successful release changed no workflow, pipeline, form, report or Deal record.
- `formField: false` is not treated as evidence of create-record-form placement.
- CRM readback proves schema existence and options, not user adoption or historical coverage.
- Zero populated records is expected for this slice and prevents presenting a country KPI as available.
- A multi-country Deal must not be counted once per country in a consolidated sales total.

## Residual risks and owned follow-up

| Risk | Current control | Owner / next action |
|---|---|---|
| Users omit the field | Runbook defines capture at award/close | ANAM commercial owner; decide later whether to add stage requiredness |
| Historical reporting remains empty | No inference/backfill allowed | ANAM must approve any bounded historical cohort separately |
| Multi-select double counting | Non-additivity rule documented | Efeonce must design Deal-deduplicated reporting before publishing a chart |
| UI placement not verified | API schema readback is authoritative for this slice | Verify and approve create-record/stage UI only if requested |
| Country taxonomy may expand beyond current LATAM list | Stable internal values and governed change set | ANAM ratifies additions; Efeonce releases them separately |

These follow-ups do not block the approved property-creation scope. They do block claims of adoption, coverage or
an official sales-by-execution-country KPI.

## Specialized review applied

- `hubspot-as-a-service`: property governance, client-portal boundary and reversible change discipline;
- `software-architect-2026`: additive source-of-truth and no-ADR determination;
- `hubspot-greenhouse-bridge`: boundary review only; no ANAM data was projected into Greenhouse;
- `efeonce-agency`: client delivery and approval ownership;
- `greenhouse-qa-release-auditor`: evidence ladder, negative paths and verdict;
- `greenhouse-documentation-governor`: architecture/functional/manual/service/handoff closure.

## Verdict rationale

PASS applies only to the additive property slice because the exact requested schema exists in the correct portal,
the governed deployment completed without errors, direct runtime readback matches the approved contract and no
unapproved records or adjacent assets changed. Adoption, enforcement, historical population and reporting are
explicitly separate future slices.
