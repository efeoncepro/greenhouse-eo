# Prospect enrichment and native cohort segmentation

Use for researching, enriching and segmenting approved prospects in an independently authenticated HubSpot
portal. This is CRM preparation. It does not authorize outreach, publishing, workflow activation or changes to
subscriptions, marketing-contact status or permissions.

## Current rule (2026-10-12): industry is a Company attribute; segments group by attributes

Operator finding: the bank segment did not show up inside the finance segment. Cause: 188 listed 14 Company IDs,
while Contact segment 153 read the hand-filled Contact property `industria`; 19 of 28 bank contacts had it empty
and six banks had no Company `industry`. Two segments that should nest used unrelated keys.

- Sector is classified once, on Company `industry`. Contact sector segments **151–155** read the Primary
  Company: `ASSOCIATION(object = '0-2', association = 1) { industry IN (...) }`, with the same value sets as
  Company segments 144–148 (Technology uses the four-value set of 150). Contact `industria` is no longer read
  by 151–155; keep existing values, do not require it on new intakes and do not copy Company industry into it.
- Every intake leaves Company `industry` and `country` populated with exact catalog values and evidence. A
  Company without industry silently excludes all its contacts from every sector segment.
- 188 is attribute-driven: research date known AND `individual_email` AND email known AND Primary Company
  `industry IN ('BANKING') AND country = 'Chile'`. A new Chilean bank enters without editing the filter.
- Never bound a universe with record IDs in a filter. A sub-segment uses the same key as its parent and must be
  verified as a subset of it. If an approved universe is narrower than the attribute, an attribute is missing:
  propose it instead of listing IDs.
- HubSpot enrichment mislabels industry (a university as consumer services, a marketplace as e-learning). When
  a contact would leave a segment under the Company rule, inspect the Company first; correct only what is
  evident and authorized, and report the rest. Do not change a true value to make a record qualify: a group
  whose record is an insurer stays `INSURANCE` even when it was approved as a bank account, and is reported.
- 151–155 are global: they include historical CRM contacts of those companies, not only researched ones.
  Report the researched subset separately. Historical cohort segments 166–170 still read `industria` and are
  frozen; do not migrate them.
- Before changing a filter: save definition and members, simulate who enters and leaves, apply, read back, then
  enumerate members and compare with the simulation (zero missing, zero extra). `segments update-filters
  --dry-run` returns no digest and does not validate the expression; only the real call and readback do.
- Membership reader that works with user OAuth in Agent CLI 0.15.1: `hubspot objects search --type contacts
  --filter "hs_crm_search.ilsListIds=<id>"`, paginated with `--after`. `segments members-list` still requires
  a service key. In the MCP SQL reader, do not combine `hs_crm_search.ilsListIds` with cross-object columns
  (`COMPANY.industry`): the list filter is dropped without error and the whole object is returned.

[Verified definitions and counts](../../../../docs/operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json) ·
[decision delta](../../../../docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-12--la-industria-vive-en-la-empresa).

## Rule since 2026-10-11: research date, not dated cohorts

Operator decision: a new enum option per working day does not scale. Every intake or re-research now writes
`efeonce_prospecting_researched_on` (date, `YYYY-MM-DD`) on BOTH Company and Contact; one does not populate the
other. That date is the universe boundary of the continuous segments **180–187**
(`efeonce_prospecting_researched_on IS NOT NULL` AND attributes). `efeonce_prospecting_cohorts` is historical:
it keeps its four October options and values, feeds only segments 159–179, and receives no new options or
assignments. Do not create a cohort option or a per-round segment for a new intake; a period view is a date-range
filter. The date holds the latest research only; round history lives in the associated CRM notes. Wherever the
text below says to populate a cohort for a new intake, populate the research date instead; the cohort rules
still describe the historical rounds. In Agent CLI 0.15.1 the single-record `objects update <ID> --property`
form hung without writing in a non-interactive shell: use JSONL on stdin (preview + digest) or the MCP connector.
[Decision delta and verification](../../../../docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

## Current admission rule (2026-10-11): email and B2B account coverage

Operator-approved canon: [actionable contacts and account coverage](../../../../docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--contactos-accionables-y-cobertura-de-la-cuenta-b2b).
Research the target AND always seek **an initial 2–3 additional relevant people**, even when the target has email.
This search baseline is not a ceiling or a complete buying group. Expand for critical functions, approvals and
risks of the opportunity/phase; document remaining gaps, owner and next validation within the authorized scope.
Prioritize functional peers, area owners, management and related decision makers as routes to the target.
Use the shared [buying-group method](../../efeonce-b2b-prospecting/references/buying-group-and-access.md).

1. Reconcile the account and every person's identity, current role and source. Record why each adjacent person
   is relevant and whether the connection is confirmed or only a functional hypothesis. Same-company employment
   does not prove reporting lines, personal relationships or willingness to introduce the target.
2. **Do not create a prospect Contact/Lead without a verified individual corporate email attributable to that
   person.** Keep the exact returned address, source, research date and validation status. Never infer an address
   from a pattern; do not substitute personal or shared mailboxes. Presence and provider verification do not
   guarantee delivery; preserve and resolve conflicting validation before treating the channel as actionable.
3. Apollo `emails: []` stops admission of that person, not account research. Keep the target's identity, source
   and need in the research manifest or a Company note; continue seeking adjacent contacts. A shared mailbox
   may be documented only as a secondary account route, not the person's email or a substitute for admission.
4. Before credit-consuming enrichment, resolve authorization for the bounded set of people and provider scope.
   Existing authorization is reusable within that scope; a single-person approval does not cover new people.
   Prioritize existing authorized sources while preserving any unfilled email or coverage gaps.
5. Create/reuse eligible contacts within the authorized scope, with the correct Primary Company, research date
   and evidence-backed properties. Keep observed buying intent attached to its actual author; adjacent contacts
   are access routes, not automatically interested buyers. Never create Deals or send outreach from this alone.
6. Independently read back email, properties, Primary Company, source notes and native segment membership.
   Report target status and each additional person's role, email provenance/quality, relationship evidence and
   route priority. Report distinct people and critical roles separately; mailbox count does not establish role
   participation, authority or sufficient coverage. If the initial additional-contact search or a critical function
   remains uncovered, state the gap, risk and next route. Eligible partial intake may proceed; do not present it
   as a complete group or qualified opportunity. Never fabricate contacts or register people without email.
   A critical stakeholder without email stays in research; a relevant access route may be documented without
   creating that person. A first conversation does not require a confirmed champion or the entire committee.

Historical `individual_no_email`, `shared_inbox` and `identity_pending` values remain readable classifications,
not exceptions to new-contact admission. Preserve existing records and enums; this rule does not authorize
deletion, schema/filter changes or historical migration. Do not duplicate an existing no-email record.

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
   Research remains in the lead stage until effective qualification. Creating/enriching a prospect is not
   authority to create a qualified opportunity. Preserve existing Deals when the operator explicitly says to
   leave them unchanged; document the exception instead of retroactively moving or deleting them.
2. Keep source identity, source date, signal, service fit, observed intent/state and contact type in a bounded
   local manifest. Apply the admission and account-coverage rule above before creating records. Never invent
   individual email; Apollo `emails: []` stops that person's admission and requires adjacent-contact research. Preserve
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

1. Inspect existing ACTIVE definitions before creating any segment. If the required segment already exists,
   populate supported record properties and verify membership; do not create another segment. Preserve static
   snapshots and unrelated active definitions. Change filters only when the approved scope requires it.
   Resolve the authorized research universe and reconcile source identities to CRM IDs. Reuse existing records
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
| Company and Contact | `efeonce_prospecting_researched_on` | date; latest research date. Boundary of 180–187 since 2026-10-11                     |

Group: `efeonce_prospecting` / Prospección Efeonce. The cohort examples below are historical; future intakes
write the research date under the current rule above. Do not label the entire historical CRM as current research.

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
- `industry` (Company) and `industria` (Contact) have separate enums. Since 2026-10-12 the Contact sector
  segments read Company `industry` through the Primary association, so the Contact enum no longer limits which
  sectors a contact can be grouped by. Keep the evidence-backed classification; do not force Retail to make a
  sector filter match.
- Unknown job title stays unknown. Do not manufacture a title for 171 or a service-interest value for 172/173.
  The current catalog has no dedicated SEO/AEO/GEO or open-tender segment; notes retain those specific signals
  until an authorized compatible property/consumer is defined.
- Sika LIC-1164 demonstrated cohort on both objects, Company Chemicals and Contact individual_email + creative:
  effective membership 177 for Company and 174/176 for Contact, excluding 175. See the functional model for
  the verified delta. A lifecycle/Deal pipeline change by HubSpot automation is not a reason to remove cohort,
  nor proof of a won client. Do not overwrite lifecycle just to match segmentation expectations.
- New intakes use the research date and existing continuous definitions; a period view filters that date.
  Do not relabel the historical CRM or future intakes with `research_2026_10_06`; preserve historical values.

## Account-based continuous segments

Select an account universe through attributes of the Primary Company, never through a list of Company IDs.
The Primary association decides the entity even when the email domain differs. `associatedcompanyid`
(**Empresa principal asociada**) stays useful for reading and reconciling, not for defining a segment.

ACTIVE **188**, `Efeonce | Prospección continua | Bancos Chile | Personas con email`, reads since 2026-10-12:
research date known AND `individual_email` AND email known AND Primary Company `industry IN ('BANKING') AND
country = 'Chile'`. The complete `ilsListIds=188` read returned 26/26 expected contacts across 13 banks, zero
missing and zero extra, all contained in 153. Consorcio (2 contacts) left 188 because its Company record is the
insurance group (`INSURANCE`); it remains in 153 and counting it as a bank is an operator decision on that one
field. The 2026-10-11 definition (14 Company IDs, 28 contacts) is superseded; do not restore it.
[Current definitions and counts](../../../../docs/operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json) ·
[superseded snapshot](../../../../docs/operations/HUBSPOT_BANKS_SEGMENT_2026-10-11.json) ·
[case, provenance and remaining gaps](../../../../docs/commercial/prospects/bancos-chile-2026-10/README.md).

When reporting each contact's properties, distinguish live field values from proposed services in notes.
Report blanks explicitly; do not fill cargo, country or service fit merely to make the table complete.
`creative`/`hubspot_crm` are fit, not installed-platform evidence or observed purchase interest. No compatible
SEO enum exists in the verified dictionary: retain the specific SEO/web focus in notes without forcing fit.
Email known is presence only; preserve contradictory validator results and require channel review before use.

If an authorized CLI segment create fails with 502, inspect the complete existing catalog for a possible
successful creation before retrying or using the native UI. A dry-run proves only the payload. Keep the same
portal, identity, scope and ACTIVE definition in the fallback; read it back through CLI and enumerate membership
independently through MCP. The observed UI fallback for 188 succeeded after two CLI failures; this is a dated
observation, not evidence that CLI segment creation is always unavailable.

## New opportunity on an existing prospect

- A new tender Deal does not recreate Company/Contact or automatically establish a new research cohort.
  Preserve supported cohort/type/fit values unless new evidence and the authorized scope require a change.
  Record the new buying signal in its own Deal-associated note; do not force HubSpot intent from creative demand.
- Reusing an associated contact means relationship context, not verified responsibility for the new process.
  If the brief names no buyer, retain the role/authority gap in the note instead of inferring job title or decision power.
- For an unchanged record, membership search combining `hs_object_id` and `ilsListIds` proves only that record's
  membership in the specified segment. It is a reader, never a new ID-based segment expression. A filtered
  result of one is not the segment total or an audit of its full recipient set; do not refresh dated totals from it.
- Preserve legal Company Primary on Contact and Deal and record any automation drift. No manual list enrollment,
  schema recreation or current-cohort relabeling is needed when the existing values already qualify.
  New/changed rules or cohort-wide claims still require the complete-set verification below.

Process-level CRM method: [tender portfolio companion](../../greenhouse-public-private-tenders/crm-portfolio-operating-model.md).
Dated example: [Sika Q4 LIC-1169](../../../../docs/commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md).

## Independent verification

- Read back ID, name, object type, ACTIVE type and complete expression. Preserve unrelated global definitions.
- Read all tagged records and compare their exact set with the source manifest and authorized delta.
- Enumerate every actual segment member through an authorized reader, paginating until complete. With user OAuth,
  MCP CRM search by `ilsListIds` can read membership when CLI `segments members-list` is unavailable.
- Assert zero missing/extra records, no record outside the authorized cohort, and no shared, absent-email or
  identity-pending record inside individual-email segments. Check OR boundaries and unrelated service exclusions.
- Record portal, version, date, counts and comparisons. Keep PII/manifests locally; repo docs contain aggregates.

A new intake qualifies automatically once its research date and classification match the continuous rules.
Historical cohort consumers remain unchanged; do not create a new daily option or per-round segment.
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

## Prospecting Agent: diagnose, then enroll within authority

- Inspect the effective portal UI, play, user, connected inbox and saved configuration before declaring the
  agent unavailable. Missing MCP/CLI capability or an outdated document is not evidence that the native agent
  is broken, especially when the operator reports recent successful use.
- Read [the Prospecting Agent reference](../../hubspot-solutions-partner/references/prospecting-agent.md) and
  [voice configuration manual](../../../../docs/manual-de-uso/hubspot/ajustar-voz-prospecting-agent.md). Check
  the actual play language separately from Brand Voice; one does not prove the other.
- Record eligibility, enrolled state, draft generation, approval/review mode and sent state independently.
  Segment membership is selection readiness, not enrollment or sending authorization. Research on how to
  enroll does not itself enroll a contact. Existing authorization applies only to its stated scope.
- Reconcile prior sends and active enrollments before any authorized enrollment; avoid duplicate outreach
  across overlapping segments. Read back the actual native enrollment/result rather than inferring it from
  contact properties or a successful configuration save.
- Keep the commercial follow-up agent separate from HubSpot's native Prospecting Agent. Operational state,
  draft locations, Notion tasks and next actions live in
  [the follow-up register](../../../../docs/commercial/follow-up-agent/README.md), not in this skill. A connector
  that can read mail may still lack draft/send capability. A 403 remains a permission error until the affected
  operation is verified; reconnection alone does not prove it is repaired.
