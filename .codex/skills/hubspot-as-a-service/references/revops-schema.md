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

## Commercial pipeline governance contract

Treat Lead qualification, Deal execution and Service delivery as different grains. If native Lead already owns
pre-qualification, do not recreate a prospecting/radar stage inside Deal merely to obtain a visual funnel. A
legacy Deal stage that overlaps Lead may remain temporarily when the operator explicitly excludes it from the
change; isolate it from creation rules and reporting instead of silently moving its records.

For each pipeline change set:

1. Inventory stage IDs, labels, probabilities, record counts, conditional stage properties, pipeline rules,
   creation forms and existing stage-entry workflows before writing.
2. Define the one ordinary creation stage. Use a pipeline creation rule only after checking exceptions for
   superadmins, workflows, APIs and integrations; do not combine it automatically with skip/backward/edit-access
   restrictions.
3. Put globally universal facts in the create form. Put maturity-specific evidence in conditional stage
   properties, and remove redundant or incorrectly grained conditions rather than requiring the same field twice.
4. Require the smallest evidence that makes the transition honest: next action on active stages, quoted-value
   provenance before commitment, execution context at positive close, and a reason at negative close.
5. Preserve stage IDs when semantics can be corrected safely through labels and gates. Renaming a stage must not
   move records or change probability without a separate approved operation.
6. Treat stage requiredness as prospective enforcement, not backfill. Read back the required checkbox and test a
   controlled future move; a displayed rule count alone does not prove the field blocks correctly.
7. Treat every stage-entry task as a workflow rollout. Specify title, owner resolution, due-date policy,
   notification, re-enrollment/deduplication, positive test, negative test and historical-enrollment boundary
   before publication. If those facts are missing, leave the automation designed but unpublished.
8. After execution, read back creation stage/default, every dependent property and requiredness, unchanged
   excluded stages, disabled legacy workflows and representative record counts. Record rollback separately for
   labels, requiredness, creation rules and automations.

Do not assign income type, renewal status or lifecycle truth from pipeline membership alone. Do not call a saved
stage rule or stored workflow operational until the future-entry path is verified without an unintended
historical task wave.

## Matching and bounded remediation

1. Normalize source and CRM keys without treating normalization as proof of identity.
2. Require one consistent source identity and one live target record per normalized key. If the CRM has duplicate targets, hold the entire key cohort.
3. Partition candidates into deterministic/apply, review-only and unresolved cohorts. Domain, title, owner, fuzzy name and geographic similarity are hints, never automatic identity.
4. For association remediation, accept an explicit child -> related record -> parent chain only when all paths converge on one distinct parent ID; deduplicate labeled and unlabeled association types by target ID.
5. Freeze the pre-change snapshot and approved manifest. Verification may create a separate readback artifact but must not rewrite approval evidence.
6. Apply only approved record IDs and read back target IDs, distinct cardinality and required association types. Report before/after coverage without converting a partial cohort into an official KPI.

## Calculated-property execution contract

- Check `/crm/limits/2026-03/calculated-properties` before proposing a calculated property; capacity is a portal runtime fact.
- Calculation properties created by API are API-managed. Preserve the exact request formula and rollback/archive path in the change set.
- Use exact pipeline/stage IDs when native HubSpot calculations inherit unsuitable probability semantics. Do not repair a reporting defect by moving records or changing pipeline metadata unless that is separately approved.
- The 2026 Properties API enforces a calculation formula's output type across branches. A numeric calculation cannot use `''` as its fallback even when older/native examples appear to do so.
- When the safe numeric fallback must be `0`, define the eligible cohort through a separate calculated dimension and make that report filter mandatory. A base property whose meaning depends on a filter is not a standalone KPI.
- Expect asynchronous propagation after creation. Read back the property definition, representative won/lost/no-award/open values, anomaly cohorts, and the calculated-property limit after execution before accepting downstream reports.
