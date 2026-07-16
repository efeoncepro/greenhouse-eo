# RevOps and CRM Schema

## Property decision contract

For every requested field determine:

| Dimension | Required decision |
|---|---|
| Business definition | What decision or workflow uses it? |
| HubSpot object | contact, company, deal, ticket or custom object |
| Standard reuse | Does a native property already satisfy it? |
| Internal name | stable, lowercase and implementation-safe |
| Field type | string, number, date, boolean, enumeration, owner, etc. |
| Options | labels, internal values, ordering and deprecation policy |
| Source | human, form, workflow, integration, calculated or imported |
| Ownership | who maintains quality and approves changes |
| Requiredness | stage/process where it becomes mandatory |
| History/backfill | initial population and conflict rule |
| Consumers | views, workflows, reports, integrations, agents |
| Privacy | classification, retention and access |

## RevOps discovery order

1. Business process and decision points.
2. Lifecycle/stage definitions and entry/exit criteria.
3. Object ownership and associations.
4. Property dictionary.
5. Automation and exception paths.
6. Reporting definitions and denominator.
7. Backfill/migration and data-quality controls.

Do not start with dashboard widgets or property creation.

## Execution rules

- Inventory existing schemas first through HubSpot APIs/Agent CLI.
- Separate storage type, field type, population mechanism and governance. Use [property-types.md](property-types.md) before choosing calculation, rollup, sync, score or smart properties.
- Prefer standard properties and extend mappings before creating custom fields.
- Prepare a dry-run/change set and obtain approval.
- Create schema before backfill; verify internal names and option values by read-back.
- Activate workflows only after test records pass positive and negative paths.
- Record deprecated fields; do not delete fields with unknown consumers.
- Prefer association -> sync/rollup -> same-record calculation -> irreducible custom fact -> workflow write. Smart properties are advisory evidence, not a repair for missing deterministic data.
- Validate paired association labels directionally: read the forward object pair for `label` and the reversed pair for `inverseLabel`; one directional GET may not return both sides.
- After create, do not treat an immediate CRM search miss as absence. Search indexing can lag while the unique constraint and direct object read are already authoritative; retry or use direct/list readback before any second create.
- For Workflows v4 beta, `201`, `crmObjectCreationStatus=COMPLETE` and `isEnabled=true` prove only stored configuration. Require a real positive enrollment/action readback plus a negative path; if API-only turn-on does not execute, disable the workflow and verify through the authenticated editor/history before rollout.
- Never use one parent-object create-record action when the target grain is one child per associated component. A Deal-to-Service workflow needs a deterministic line-item iterator and per-line-item idempotency seam; otherwise keep materialization in a governed integration/custom action.

## Calculated-property execution contract

- Check `/crm/limits/2026-03/calculated-properties` before proposing a calculated property; capacity is a portal runtime fact.
- Calculation properties created by API are API-managed. Preserve the exact request formula and rollback/archive path in the change set.
- Use exact pipeline/stage IDs when native HubSpot calculations inherit unsuitable probability semantics. Do not repair a reporting defect by moving records or changing pipeline metadata unless that is separately approved.
- The 2026 Properties API enforces a calculation formula's output type across branches. A numeric calculation cannot use `''` as its fallback even when older/native examples appear to do so.
- When the safe numeric fallback must be `0`, define the eligible cohort through a separate calculated dimension and make that report filter mandatory. A base property whose meaning depends on a filter is not a standalone KPI.
- Expect asynchronous propagation after creation. Read back the property definition, representative won/lost/no-award/open values, anomaly cohorts, and the calculated-property limit after execution before accepting downstream reports.
