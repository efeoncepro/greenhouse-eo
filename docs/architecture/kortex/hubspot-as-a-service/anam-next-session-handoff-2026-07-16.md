# ANAM HubSpot Continuation Handoff

> **Use:** context entry point for a fresh Codex/Claude session
> **Date:** 2026-07-16
> **Workspace:** `/Users/jreye/Documents/greenhouse-eo`
> **Kortex workspace:** `/Users/jreye/Documents/dev/kortex`

## Objective

Continue the ANAM HubSpot RevOps implementation with commercial foundations first and operations second. Do not create isolated properties or dashboards before reconciling their source facts, grain, automation and denominator.

## Read first

1. `.codex/skills/hubspot-as-a-service/SKILL.md`
2. `.codex/skills/hubspot-as-a-service/references/report-design.md`
3. `docs/architecture/kortex/hubspot-as-a-service/anam-phase-1-commercial-reporting-foundation-2026-07-16.md`
4. `docs/architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md`
5. `docs/architecture/kortex/hubspot-as-a-service/anam-revops-schema-reconciliation-2026-07-16.md`
6. `docs/architecture/kortex/hubspot-as-a-service/anam-commercial-catalog-dry-run-2026-07-16.md`
7. `docs/architecture/kortex/hubspot-as-a-service/anam-hubspot-schema-readback-2026-07-16.md`
8. `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-hubspot-decision-v1.md`
9. `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-schema-preview-2026-07-16.md`
10. `docs/architecture/kortex/hubspot-cms/anam-portal-access.md`

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

## Out-of-scope CRM data anomaly

RUT `96967550-1` is duplicated across two ANAM Company records:

- `31284841882`: no name/domain, razón social `ANAM`; 2 unique Deals and 1 unique Contact.
- `31433962165`: name `ANAM`, domain `anam.cl`, incorrect razón social `aguas`; 1 unique Ticket and 2 unique Contacts.

This is a data-quality error in the CRM operated by ANAM. It is not a dependency for the commercial model, Product catalog, Service design or dashboards in this engagement. Do not correct, merge, enrich or otherwise mutate either Company as part of this work. No merge was executed.

## Catalog dry run

The 506 line items reduce to 20 normalized names. `M&A - Integral` accounts for 331. Two material mapping decisions remain:

- `Monitoreo Integral Minero`: ratify M&A versus Outsourcing.
- Catch-all `Otros` products remain legacy/quarantine, not default choices for new quoting.

Resolve `DyCO` versus approved `D&CO` display naming without changing stable internal codes blindly.

## Product OAuth diagnosis and current state

Kortex repo task `TASK-0130` is in progress.

- HubSpot project build `#13` deployed successfully.
- `crm.objects.products.read` is required.
- `crm.objects.products.write` is conditional.
- Deprecated `e-commerce` was intentionally not added.
- Three ANAM consent attempts failed in HubSpot before callback, including read-only.
- Before the final authorized consent, the installation remained active with 109 scopes and Product properties/search returned `403`.
- Current installation is active with 110 scopes, Product read present and Product write absent.
- Product properties/search now return HTTP 200 (65 properties, 22 Products).
- Do not request Product write, rotate credentials or reduce the current installation scopes without a separate approved change set.

Diagnosis completed in [`anam-product-oauth-diagnosis-2026-07-16.md`](anam-product-oauth-diagnosis-2026-07-16.md): all three prior grants failed with `Please provide a valid recaptcha value`. A newly generated control-plane URL also omitted required `crm.objects.products.read`, proving deployed Kortex runtime drift from HubSpot build `#13`. With explicit authorization, the operator completed a manually corrected consent. Callback/activation succeeded, the installation is active with 110 scopes and Product properties/search now return HTTP 200 (65 properties, 22 Products). No Product write, deploy or credential rotation occurred. The durable Kortex URL-generation drift remains to be fixed.

## Approval-ready change set

- Service: [`anam-service-change-set-2026-07-16.md`](anam-service-change-set-2026-07-16.md). Exact property enums, renewal/Deal association labels and deterministic Closed Won line-item migration dry run; no schema or record writes executed.

## Current Phase 1 reporting state

- `Calidad de Datos Comercial` dashboard: `21144697`; seven verified remediation controls are documented in the Phase 1 contract.
- `Dashboard de Crecimiento`: `19708354`.
- Current-quarter Growth cohort: Deal creation date from 2026-07-01 and `tipo_de_ingreso` in Venta nueva, Upsell or Cross-sell.
- Verified cohort: 29 Deals and CLF 2,443.89 of current Deal amount.
- Seven governed Growth assets are live: KPI count `340827168`, KPI amount `340827503`, income-type donut `340826108`, business-line columns `340826655`, commercial-process donut `340826976`, exact line table `340828194` and owner-by-line pivot `340830124`.
- Existing legacy reports were not altered. No CRM records, properties, workflows, forms or pipeline metadata were changed by this reporting slice.
- `Radar 0%` (`1034441224`) is incorrectly `isClosed=true` and currently contains ten Deals. Reports must not use generic open/closed semantics until this is corrected or explicitly excluded.

## Reporting lessons that must survive a new session

- Select the visual from the decision, period and denominator; visual variety is not an objective.
- Preserve a legacy report when its editor persistence or historical contract is uncertain; create and read back a governed replacement.
- The simple summarized table supports one measure in the observed builder. Use the custom pivot for count plus amount.
- A selected filter is not proof of an applied filter. Verify filter count, wait for recalculation and reconcile totals before save.
- Relative quarter filters are appropriate for pulse tiles; fixed Q3 boundaries are preferable for auditable diagnostics.
- Do not create a monthly trend from one month, a funnel from invalid stage semantics or a gauge from a manually fixed population maximum.

## Next execution order

1. Finish Phase 1 outcome semantics. Inventory all Growth stage IDs and report dependencies around `Radar 0%`; produce a rollback-ready proposal for either correcting its metadata or temporarily excluding exact stage `1034441224`. Do not mutate pipeline metadata without explicit approval.
2. Build won/lost count and current Deal amount using exact eligible stage IDs and the correct close-date period. Calculate win rate only from that explicit denominator and read it back against source records.
3. Keep funnel reporting deferred until stage-entry/exit semantics are verified. Do not substitute current-stage counts for true conversion.
4. Prepare the P1.4 Q1-Q2 adoption change set from the existing 82-Deal owner queue. Inferences remain suggestions; writes require evidence, named review and approval.
5. After Phase 1 acceptance, reconcile the 22 Products against the 506 line items and ratify catalog ambiguities and stable SKU codes.
6. Review the exact Service property/association proposal against the reconciled catalog, then generate the won Deal line-item -> Service dry run before any migration write.
7. Implement Retention, Renewal and Loyalty only after Service cohort coverage is adequate; Ticket taxonomy and Billing Event follow the commercial foundation.
8. Fix the durable Kortex authorization-URL scope drift through its own approved release; current ANAM Product read is already active and is not a Phase 1 blocker.

## Safety and repository state

- No new CRM schema/record writes were performed in the final inventory cut.
- Greenhouse repo is dirty with intentional ANAM docs plus unrelated user work; do not revert unrelated changes.
- Kortex repo has intentional uncommitted `TASK-0130`, manifest, changelog and handoff changes plus unrelated untracked `hubspot-cms-react-project/`; do not touch that unrelated folder.
- The temporary Cloud SQL proxy was terminated.
- Final checks passed: Greenhouse `docs:closure-check`, `ops:lint --changed`, `git diff --check`; Kortex manifest JSON parity, `git diff --check` and `hs project validate`.

## Recommended opening instruction

Continue ANAM HubSpot from this handoff and finish Phase 1 before catalog or Service implementation. Read the Phase 1 contract and report-design reference, inspect current git/runtime state, then audit the `Radar 0%` stage and its report dependencies without writing. Prepare the exact exclusion-or-correction proposal, build won/lost outcome reports only from explicit eligible stage IDs and verify every denominator. Do not create a funnel, pipeline mutation, backfill or other CRM write without the documented gate and explicit approval. Treat the duplicate ANAM Company records as out-of-scope and do not correct or merge them.
