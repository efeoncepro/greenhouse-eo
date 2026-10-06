# Prospect enrichment and native cohort segmentation

Use for researching, enriching and segmenting approved prospects in an independently authenticated HubSpot
portal. This is CRM preparation. It does not authorize outreach, publishing, workflow activation or changes to
subscriptions, marketing-contact status or permissions.

## Scope before filters

Resolve the scope from the user's current request and existing authorization before creation:

| Universe                             | Required boundary                                                   | Membership consequence                                            |
| ------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Entire CRM                           | Attribute expression                                                | Older records can qualify; age/source are not restricted          |
| One research round                   | Verified cohort membership AND attributes                           | No record outside that research round may enter                   |
| Individuals with email in that round | Research cohort AND verified individual-email cohort AND attributes | Shared, absent-email and identity-pending records remain separate |

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

## Cohort plus active attributes

Freeze the cohort once using the verified source-to-CRM manifest. A static base list is a valid research-origin
snapshot; derived industry, size and role segments are ACTIVE native lists whose attributes can change.
Use one cohort boundary rather than copying record-ID arrays into each segment. The dated case and commands
live in the [operator manual](../../../../docs/manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).

The Agent CLI filter language uses native list-membership expressions:

```sql
IN_LIST(list = <research_cohort_id>) AND industry IN ('COMPUTER_SOFTWARE')
```

The angle-bracket values are placeholders, not executable syntax. Resolve actual list IDs, object types and
verified members in the destination portal first. For contacts, intersect the research cohort and the
individual-email cohort before applying the property filter. An OR must remain inside the same boundary;
when the CLI serializes OR branches, each branch must retain both membership conditions.

`ilsListIds` is usable in CRM search for membership readback. It is not interchangeable with `IN_LIST` in a
CLI creation expression. After a failed create, search/get existing definitions before retrying so an uncertain
response cannot produce duplicates. Use CLI help and stored readback rather than assuming SQL/API parity.

## Independent verification

- Read back list ID, name, object type, `ACTIVE` type and complete filter expression.
- Enumerate every member through an authorized reader and paginate until complete. A displayed count or first
  page does not verify a set. User OAuth may not support CLI `segments members-list`; an independently verified
  MCP CRM search for `ilsListIds` can supply membership without changing credentials or portal.
- Compare exact expected and actual IDs. Assert no missing/extra records, zero records outside the research
  cohort, and zero non-individual-email records in individual-email segments. Check OR leakage explicitly.
- Read back the base lists against the frozen manifest and any global segments the user asked to retain.
- Record date, portal, CLI version, expression, count and set-comparison result. Keep row-level PII and manifests
  in access-controlled working files; versioned docs hold aggregates, definitions and evidence pointers.

An ACTIVE segment with a static research boundary will not ingest a later search round by itself. Create a new
dated cohort, or expand a combined base only when that broader universe is requested and verified. A changed
title or industry can change membership inside the cohort. Revalidate actual recipients before future use.

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
