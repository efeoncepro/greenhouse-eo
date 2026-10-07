# Prospect enrichment and native cohort segmentation

Use for researching, enriching and segmenting approved prospects in an independently authenticated HubSpot
portal. This is CRM preparation. It does not authorize outreach, publishing, workflow activation or changes to
subscriptions, marketing-contact status or permissions.

## Entry points and deployed configuration

Read the [functional model](../../../../docs/documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md),
[operator manual](../../../../docs/manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md) and
[dated native filter catalog](../../../../docs/operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json).
The catalog holds exact names, IDs, object types, ACTIVE expressions and dated counts without record PII.
It is a configuration snapshot, not a permanent live recipient list. Existing cohort segments are 159–177;
global 144–158 are a different universe. Historical static bases 118/119/140/122/124 do not govern intake.

## Scope before filters

Resolve the scope from the user's current request and existing authorization before creation:

| Universe                             | Required boundary                                                    | Membership consequence                                            |
| ------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entire CRM                           | Attribute expression                                                 | Older records can qualify; age/source are not restricted          |
| One research round                   | Verified cohort property AND attributes                              | No record outside that research round may enter                   |
| Individuals with email in that round | Cohort property AND individual contact kind AND email AND attributes | Shared, absent-email and identity-pending records remain separate |

If the user requests both global and new-base segments, keep them separate, name the universe and preserve both.
Do not infer that “new” means every company was newly created, or substitute a created-date filter for origin.
If scope is already explicit, proceed within it; ask only when a material ambiguity remains unresolved.

## Research and enrichment contract

1. Inventory existing companies, contacts, associations, properties and native lists in the verified portal.
2. Keep source identity, source date, signal, service fit, observed intent/state and contact type in a bounded
   local manifest. Never invent individual email; Apollo `emails: []` is a stop for email population. Preserve
   extrapolated, shared and employment-unconfirmed evidence as such.
3. Reuse live writable properties and exact enum values under [revops-schema.md](revops-schema.md). Publish
   source-backed changes and preserve unresolved conflicts. Do not infer exact employees from a range, personal
   country from company headquarters, installed CRM from CRM fit, or contracted service from a prospect request.
4. Use the user's approved scope, a per-record change set and supported dry-run. Execute only allowed changes;
   read back every changed record independently and retain provenance without copying PII into repo docs.

## Property-driven ACTIVE segments: mandatory intake rule

Creating a contact, company, lead or note alone does not complete an approved prospect intake. Native ACTIVE
segments must consume record properties so assigning supported values incorporates eligible records automatically.
Static research lists are historical snapshots, not an ordinary enrollment step or a prerequisite for intake.
Canon: [property segmentation decision](../../../../docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

1. Resolve the authorized research universe and reconcile source identities to CRM IDs. Reuse existing records
   when appropriate. Preserve the original snapshot and document every authorized extension as a dated delta.
2. Inventory writable properties and exact enum values. Reuse fields with matching semantics. When automatic
   cohort/fit incorporation requires missing fields and schema creation is authorized, define the minimum dictionary
   in a dedicated business group using Agent CLI. Keep source, type, fit and observed intent separate.
3. Populate cohort on BOTH Company and Contact; one does not automatically populate the other. Preserve existing
   multiselect cohort values. Fill evidence-backed industry, role, contact kind and service fit. Do not infer
   personal country from company headquarters, exact headcount from a range, or installed CRM from fit.
4. Use cohort AND attributes in each ACTIVE expression. Individual-email segments additionally require
   `individual_email` AND email present. Every OR branch retains the same boundary. Reuse existing segment IDs
   with `segments update-filters` when correcting filters; do not duplicate segments to work around permissions.
5. Keep the exact observed request, source, dates/state and unresolved qualification in an associated CRM note.
   Populate a compatible intent property only when its enum and meaning fit. A request for audiovisual production
   does not become Social Media, Content Management or HubSpot interest merely to match a filter.
6. Read back every changed property, the complete native expressions and every actual member after recalculation.
   Compare exact sets with the authorized manifest/delta and verify intended exclusions. Do not report automatic
   incorporation from a property write alone. Report membership and any unresolved schema gap before closing.

Verified portal dictionary (2026-10-06; revalidate before use):

| Object              | Property                           | Values                                                                                |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Company and Contact | `efeonce_prospecting_cohorts`      | checkbox; `research_2026_10_06`                                                       |
| Contact             | `efeonce_prospecting_contact_kind` | select; `individual_email`, `individual_no_email`, `shared_inbox`, `identity_pending` |
| Contact             | `efeonce_prospecting_service_fit`  | checkbox; `creative`, `hubspot_crm`                                                   |

Group: `efeonce_prospecting` / Prospección Efeonce. Future rounds require a defined option and authorized universe;
records may carry multiple rounds. Do not label the entire historical CRM as a current research cohort.

```sql
-- Company sector within this research round
industry IN ('COMPUTER_SOFTWARE') AND efeonce_prospecting_cohorts IN ('research_2026_10_06')

-- Creative-fit individual contacts with email in this research round
efeonce_prospecting_cohorts IN ('research_2026_10_06')
  AND efeonce_prospecting_contact_kind IN ('individual_email')
  AND email IS NOT NULL AND efeonce_prospecting_service_fit IN ('creative')
```

Use installed CLI help, supported dry-run and definition readback. `ilsListIds` is a CRM search membership reader,
not the expression for defining segments. `IN_LIST(list = <id>)` is supported for intentionally snapshot-bound
historical cases; it is not the default automatic-intake strategy. CLI OAuth may reject member operations:
use the authorized MCP membership reader rather than changing credentials. No manual member write is needed
for a correctly property-driven ACTIVE segment.

## Association and classification edge cases

- Reconcile the legal company independently of email-domain automation. An email subdomain may differ from the
  official web domain and generate an empty company. After create, read Company associations and Primary on
  Contact and Deal; correct within the approved intake only after resolving the intended entity. Do not delete
  or merge the generated record solely because it is nameless or has a similar domain.
- `industry` (Company) and `industria` (Contact) have separate enums. Chemicals is supported on Company but not
  in this Contact enum. Keep the evidence-backed supported classification/gap; do not force Retail to make a
  sector filter match. Company segment 177 does not automatically define a Contact recipient sector.
- Unknown job title stays unknown. Do not manufacture a title for 171 or a service-interest value for 172/173.
  The current catalog has no dedicated SEO/AEO/GEO or open-tender segment; notes retain those specific signals
  until an authorized compatible property/consumer is defined.
- Sika LIC-1164 demonstrated cohort on both objects, Company Chemicals and Contact individual_email + creative:
  effective membership 177 for Company and 174/176 for Contact, excluding 175. See the functional model for
  the verified delta. A lifecycle/Deal pipeline change by HubSpot automation is not a reason to remove cohort,
  nor proof of a won client. Do not overwrite lifecycle just to match segmentation expectations.
- New rounds require their own option/filter or an explicitly approved combined universe. Do not relabel the
  historical CRM or every future intake with `research_2026_10_06`. Preserve multiselect values when extending.

## Independent verification

- Read back ID, name, object type, ACTIVE type and complete expression. Preserve unrelated global definitions.
- Read all tagged records and compare their exact set with the source manifest and authorized delta.
- Enumerate every actual segment member through an authorized reader, paginating until complete. With user OAuth,
  MCP CRM search by `ilsListIds` can read membership when CLI `segments members-list` is unavailable.
- Assert zero missing/extra records, no record outside the authorized cohort, and no shared, absent-email or
  identity-pending record inside individual-email segments. Check OR boundaries and unrelated service exclusions.
- Record portal, version, date, counts and comparisons. Keep PII/manifests locally; repo docs contain aggregates.

A new intake qualifies automatically once its authorized cohort and classification values match the active
rules. A different future round needs its own option/filter or an explicitly requested combined universe.
Revalidate actual recipients before future use; the dated count is not a permanent recipient list.

## Personalized email preparation

Keep four decisions separate: research origin, commercial fit, observed intent and channel eligibility.
Segment overlap is expected; deduplicate by contact ID and select one primary angle for each person.

| Evidence                                    | Safe personalization                                              | Do not imply                                     |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| Sector, role and researched company context | A relevant operational or creative hypothesis                     | Buying authority, urgency or budget              |
| Explicit request with source/date/state     | Exact requested service and an honest reference to its timing     | A closed or historical process is still open     |
| HubSpot/CRM fit                             | Discovery of lead handoff, lifecycle, adoption or reporting needs | HubSpot is already installed or must be selected |
| Creative fit                                | Campaign/content production needs in the recorded context         | The company lacks an internal studio             |
| SEO/AEO/GEO request                         | The specific requested discipline                                 | Every search/AI discipline was requested         |

Available email is not proof of current validity, deliverability, consent or marketing-send eligibility. Before
an authorized send, verify the actual sending lane, suppression/unsubscribe state, relevant subscription and
contact status, current employment, identity, signal timing and duplicate outreach. Use
[email-api-routing.md](email-api-routing.md) for the chosen marketing/sales/sequence route. Shared procurement
inboxes, named contract/payment contacts and confirmed marketing buyers require different copy and routing.

## Required evidence

Leave the source manifest, property change set/prestate, execution ledger, definition readback, complete member
verification, named residual gaps and preparation strategy. Preparing these artifacts never constitutes proof
of an email sent, read or delivered, an opportunity qualified, or a purchase invitation received.
