# ANAM HubSpot Continuation Handoff

> **Use:** context entry point for a fresh Codex/Claude session
> **Date:** 2026-07-16
> **Workspace:** `/Users/jreye/Documents/greenhouse-eo`
> **Kortex workspace:** `/Users/jreye/Documents/dev/kortex`

## Objective

Continue the ANAM HubSpot RevOps implementation with commercial foundations first and operations second. Do not create isolated properties or dashboards before reconciling their source facts, grain, automation and denominator.

## Read first

1. `.codex/skills/hubspot-as-a-service/SKILL.md`
2. `docs/architecture/kortex/hubspot-as-a-service/anam-revops-schema-reconciliation-2026-07-16.md`
3. `docs/architecture/kortex/hubspot-as-a-service/anam-commercial-catalog-dry-run-2026-07-16.md`
4. `docs/architecture/kortex/hubspot-as-a-service/anam-hubspot-schema-readback-2026-07-16.md`
5. `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-hubspot-decision-v1.md`
6. `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-schema-preview-2026-07-16.md`
7. `docs/architecture/kortex/hubspot-cms/anam-portal-access.md`

## Business model

```text
Contact -> native Lead -> Company -> Deal -> Quote + line items -> Service
                                                                |-> renewal Service
                                                                |-> Ticket
Deal/Service/Company -> Billing Event
```

- Customer Agent resolves documented/repeatable demand and escalates only human actions.
- People own qualification, commitments, exceptions and relationship management.
- Growth measures acquisition/expansion.
- Retention measures continuity, expansion, stable, contraction/Down-sell and churn on comparable Services.
- Loyalty measures preventive relationship/activity/risk signals.
- Down-sell is not an income type and remains hidden in Deal `tipo_de_ingreso`.

## Live inventory

- Contacts: 8,859
- Companies: 1,023
- Leads: 291
- Deals: 1,240
- Line items: 506; 501 associated to Deals
- Quotes: 10; 8 drafts, 2 expired, 0 accepted, 0 with line items, only 2 associated to the same Deal
- Services: 1 sample-like record
- Tickets: 18
- Invoices: 0
- Custom object schemas: 0
- Custom object type entitlement: limit 10, usage 0

## Decisions already made

- Reuse native Lead, Quote, line items, Service, Ticket and Invoice where their grain fits.
- Product -> line item -> Quote/Deal is the prospective commercial catalog path.
- One Service represents one awarded service component/contracted scope.
- Use Service self-association for renewal lineage and associate originating/renewal Deals.
- Ticket represents tracked human work, not quotation requests or billing-ledger rows.
- Billing Event custom object represents one SharePoint billing item; native Invoice may be a later finalized projection.
- Do not create duplicate Quote number/version/status/amount properties on Deal by default.
- Historical quote-versus-award reporting needs a governed backfill/snapshot because existing Quotes are not adopted.

## Identity blocker

RUT `96967550-1` is duplicated across two ANAM Company records:

- `31284841882`: no name/domain, razón social `ANAM`; 2 unique Deals and 1 unique Contact.
- `31433962165`: name `ANAM`, domain `anam.cl`, incorrect razón social `aguas`; 1 unique Ticket and 2 unique Contacts.

No merge was executed. Before normalized-RUT uniqueness, inspect external references and approve the surviving record/legal name. Recommended direction: preserve the record with domain/name as primary only after that verification, transfer associations through governed merge and read back all related records.

## Catalog dry run

The 506 line items reduce to 20 normalized names. `M&A - Integral` accounts for 331. Two material mapping decisions remain:

- `Monitoreo Integral Minero`: ratify M&A versus Outsourcing.
- Catch-all `Otros` products remain legacy/quarantine, not default choices for new quoting.

Resolve `DyCO` versus approved `D&CO` display naming without changing stable internal codes blindly.

## Product OAuth blocker

Kortex repo task `TASK-0130` is in progress.

- HubSpot project build `#13` deployed successfully.
- `crm.objects.products.read` is required.
- `crm.objects.products.write` is conditional.
- Deprecated `e-commerce` was intentionally not added.
- Three ANAM consent attempts failed in HubSpot before callback, including read-only.
- Existing installation remains active with 109 scopes and no Product read/write.
- Product properties/search remain `403`.
- Do not retry blindly, rotate credentials or reduce the current installation scopes.

## Next execution order

1. Diagnose Product OAuth grant failure without altering the active 109-scope installation.
2. Produce/approve the Company duplicate remediation change set and legal identity.
3. Ratify the two catalog ambiguities and stable SKU codes.
4. Prepare the exact Service property/association change set and won Deal line-item -> Service dry run.
5. Execute only through Kortex release candidate + approval + dry-run + live execute + readback.
6. Build Data Quality and Growth first; Retention/Loyalty only after Service cohort coverage is adequate.
7. Implement Ticket taxonomy and Billing Event afterward.

## Safety and repository state

- No new CRM schema/record writes were performed in the final inventory cut.
- Greenhouse repo is dirty with intentional ANAM docs plus unrelated user work; do not revert unrelated changes.
- Kortex repo has intentional uncommitted `TASK-0130`, manifest, changelog and handoff changes plus unrelated untracked `hubspot-cms-react-project/`; do not touch that unrelated folder.
- The temporary Cloud SQL proxy was terminated.
- Final checks passed: Greenhouse `docs:closure-check`, `ops:lint --changed`, `git diff --check`; Kortex manifest JSON parity, `git diff --check` and `hs project validate`.

## Recommended opening instruction

Continue ANAM HubSpot from this handoff. Start by reading the seven files above, inspect current git/runtime state, and diagnose the Product OAuth blocker without risking the active installation. Then prepare the Company identity remediation and exact Service schema as separate approval-ready change sets. Do not execute CRM writes until the exact change set and rollback are approved.
