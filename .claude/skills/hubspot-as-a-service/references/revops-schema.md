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
- Prefer standard properties and extend mappings before creating custom fields.
- Prepare a dry-run/change set and obtain approval.
- Create schema before backfill; verify internal names and option values by read-back.
- Activate workflows only after test records pass positive and negative paths.
- Record deprecated fields; do not delete fields with unknown consumers.
