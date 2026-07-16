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
3. `docs/architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md`
4. `docs/architecture/kortex/hubspot-as-a-service/anam-revops-implementation-roadmap-phases-2026-07-16.md`
5. `docs/architecture/kortex/hubspot-as-a-service/anam-phase-1-commercial-reporting-foundation-2026-07-16.md`
6. `docs/architecture/kortex/hubspot-as-a-service/anam-sector-geography-kpi-slice-change-set-2026-07-16.md`
7. `docs/architecture/kortex/hubspot-as-a-service/anam-deal-company-association-remediation-dry-run-2026-07-16.md`
8. `docs/architecture/kortex/hubspot-as-a-service/anam-managed-billing-intake-ui-2026-07-16.md`
9. `docs/architecture/kortex/hubspot-as-a-service/client-billing-intake-data-model-spec-v1.md`
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
- Services: 6 total — 5 controlled pilot records in `New` plus 1 excluded sample-like record
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
- Billing Event represents one source billing item; managed private intake is primary, SharePoint is an optional adapter and native Invoice may be a later finalized projection.
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

## Executed Phase 3 property schema

- Service: [`anam-service-change-set-2026-07-16.md`](anam-service-change-set-2026-07-16.md). Group `anam_service_contract` plus nine scalar and one calculated Service property were created/read back at 17:23 UTC. Calculated readiness propagated naturally to `incomplete_core` on the sample.
- Forward capture: [`anam-phase-3-forward-service-capture-contract-2026-07-16.md`](anam-phase-3-forward-service-capture-contract-2026-07-16.md). Separates the commercial award gate from human-confirmed Service activation, uses TCV for portfolio value and ARR only for reviewed recurring Retention comparisons, and keeps AI/smart properties out of authoritative controls.
- Pilot simulation: [`anam-phase-3-forward-pilot-dry-run-2026-07-16.md`](anam-phase-3-forward-pilot-dry-run-2026-07-16.md). Five recent distinct-Company rows passed deterministic award projection and all failed activation.
- Controlled pilot execution: [`anam-phase-3-forward-pilot-execution-2026-07-16.md`](anam-phase-3-forward-pilot-execution-2026-07-16.md). With a separate operator approval, the exact five rows were created in `New`, each with one Company, one originating Deal, deterministic source lineage and preserved TCV/ARR. All five read back as `incomplete_core`; they are excluded from official KPIs. Paired Deal-role and Service-renewal association labels are live. No workflow, renewal record, bulk backfill or report was created.
- Workflow execution: [`anam-phase-3-service-automation-workflow-test-2026-07-16.md`](anam-phase-3-service-automation-workflow-test-2026-07-16.md). Native `Create Service` compiles but is not safe for one-Service-per-line-item materialization and did not execute in isolated API activation tests. The separate activation-review workflow `1852406585` was verified in the authenticated editor, activated without enrolling existing records, tested first with Gasmar, and then rolled out manually to the other four pilots. Exactly five executions completed and created exactly five associated tasks; non-pilot Service `564234555477` did not qualify. Re-enrollment remains disabled. All temporary probe records were archived and probe workflows deleted.
- Pilot dashboard execution: [`anam-phase-3-pilot-dashboard-execution-2026-07-16.md`](anam-phase-3-pilot-dashboard-execution-2026-07-16.md). At the operator's request, the five controlled Services received explicitly marked synthetic activation values for dashboard construction; all now calculate `fields_ready`, but remain non-official until ANAM ratifies or replaces those facts. Retention dashboard `21152855` contains portfolio `340874128`, risk/renewal radar `340874425`, eligible recurring count `340877391` = `2` and eligible ARR `340877588` = `22` UF. Loyalty dashboard `21152950` contains action queue `340874258`, follow-up count `340877942` = `2` and delayed count `340878184` = `1`. The action cohort uses `delivery delayed OR renewal upcoming` and reads back Härting + Hidrogistica. That Phase 3 slice did not modify Growth; a later, separately approved diagnostic slice added three explicitly partial historical charts to Growth `19708354`. No GRR/NRR, NPS or deterministic health score was claimed.

## Current Phase 1 reporting state

- `Calidad de Datos Comercial` dashboard: `21144697`; seven verified remediation controls are documented in the Phase 1 contract.
- `Dashboard de Crecimiento`: `19708354`.
- Current-quarter Growth cohort: Deal creation date from 2026-07-01 and `tipo_de_ingreso` in Venta nueva, Upsell or Cross-sell.
- Verified cohort: 29 Deals and CLF 2,443.89 of current Deal amount.
- Seven governed Growth assets are live: KPI count `340827168`, KPI amount `340827503`, income-type donut `340826108`, business-line columns `340826655`, commercial-process donut `340826976`, exact line table `340828194` and owner-by-line pivot `340830124`.
- Existing legacy reports were not altered. No CRM records, properties, workflows, forms or pipeline metadata were changed by this reporting slice.
- `Radar 0%` (`1034441224`) is incorrectly `isClosed=true` and currently contains ten Deals. Reports must not use generic open/closed semantics until this is corrected or explicitly excluded.

## Executed Company sector/geography data-quality slice

- `segmento_de_mercado_anam` is live with visible label `Segmento de mercado` and 22 controlled options.
- Import `77871653` updated segment and `region_de_chile` on 471 exact/unique Companies; import `77871743` updated 65 direct `sector_estrategico` mappings. Both completed with 0 errors, no new records or associations.
- The stronger live-Company uniqueness guard held 22 records under 11 duplicate normalized keys; 3 source ambiguities and 527 unmatched Companies also remain untouched.
- Full readback verified all 471 IDs. The pre-change snapshot and manifest are immutable and separate from the post-change readback; exact hashes and rollback boundaries are in [`anam-sector-geography-kpi-slice-change-set-2026-07-16.md`](anam-sector-geography-kpi-slice-change-set-2026-07-16.md).
- Company composition by segment/sector/region is now available. Sales amount by those dimensions remains non-official because only 629/1,240 Deals have a Company association; the `>=95%` publication gate is unmet.
- Association execution: after exact-table approval, import `77872707` created the exact 34 high-confidence Primary Deal↔Company pairs with 0 errors and no new records. Independent readback verified 34/34 target pairs, one distinct Company per Deal and type ID `5`; global coverage is now 629/1,240 (`50.73%`). The 113 domain-only candidates and 498 held records were untouched, as were duplicate Companies. Canon: [`anam-deal-company-association-remediation-dry-run-2026-07-16.md`](anam-deal-company-association-remediation-dry-run-2026-07-16.md).
- Three diagnostic reports are live in Growth `19708354`, all titled `histórico parcial` and filtered to exact `Ganado` plus a known Company dimension: segment `340896790` (14 categories, CLF `41,830.35`), strategic sector `340897291` (2 categories, CLF `34,204.13`) and HQ region `340897635` (12 regions, CLF `41,830.35`). They use Deal commercial value in Company currency and are not invoicing, recognized revenue, TAM/SAM penetration or complete-population KPIs. Canon and rollback: [`anam-sector-geography-kpi-slice-change-set-2026-07-16.md`](anam-sector-geography-kpi-slice-change-set-2026-07-16.md).

## Reporting lessons that must survive a new session

- Select the visual from the decision, period and denominator; visual variety is not an objective.
- Preserve a legacy report when its editor persistence or historical contract is uncertain; create and read back a governed replacement.
- The simple summarized table supports one measure in the observed builder. Use the custom pivot for count plus amount.
- A selected filter is not proof of an applied filter. Verify filter count, wait for recalculation and reconcile totals before save.
- Relative quarter filters are appropriate for pulse tiles; fixed Q3 boundaries are preferable for auditable diagnostics.
- Do not create a monthly trend from one month, a funnel from invalid stage semantics or a gauge from a manually fixed population maximum.

## Mandatory first action in the next session — live Notion reconciliation

Before proposing another phase, changing a dashboard or writing to HubSpot, use the authenticated Notion connector to search and read the live ANAM meeting and task history. The local synthesis is an index and continuity aid; it is not a substitute for the current Notion pages and must not be treated as fresh authorization.

Start with these known pages from the evidenced 2025-11-07 through 2026-07-06 window, then search the ANAM workspace for related meetings and tasks, including anything newer:

- Second ANAM session — 2025-11-10: `2a739c2fefe78083bcc0ea0c9c535872`
- KPI implementation meeting — 2026-03-09: `31e39c2fefe78002b056c3c0ccbbbd0f`
- Implementation meeting — 2026-06-03: `37439c2fefe780ae8012ce22b31fd2a0`
- Ratification task: `37439c2fefe7818db9d4c4113c6028a8`
- Quote-variance task: `37439c2fefe78157b828df25fb7b8504`
- Q1-Q2 income-type backfill task: `37439c2fefe781f28b3dfc396a5d5d73`
- CRM progress meeting — 2026-06-24: `38939c2fefe7805294e6c0a48b9ec569`

Search at least for `ANAM`, `HubSpot`, `Growth`, `Crecimiento`, `Retención`, `Fidelización`, `Loyalty`, `Service`, `Servicios y Contratos`, `renovación`, `tipo de ingreso`, `variación vs cotizado`, `facturación` and `Customer Agent`. Follow backlinks and linked tasks when they contain a decision, commitment, owner or due state.

The first deliverable of the new session is a reconciliation matrix with:

| Meeting/date | Decision or commitment | Owner | Related phase | Current runtime evidence | Gap or drift | Next action | Needs ANAM approval? |
|---|---|---|---|---|---|---|---|

Classify every item as `stable decision`, `tentative note`, `completed task`, `open task` or `superseded`. Reconcile the result against this handoff, the phase roadmap, the living object model and the live dashboard evidence. During this opening review, perform no Notion mutations and no HubSpot writes. End the review by stating which phases are actually complete, pilot-only, blocked or ready for the next slice.

## Next execution order

1. Complete the live Notion meeting/task review and deliver the meeting-to-phase reconciliation matrix above.
2. Update the phase assessment only where live Notion evidence or runtime readback proves drift; do not turn tentative meeting notes into execution authority.
3. For the requested sales-by-segment/sector/region KPI, treat the exact 34-pair Contact-chain slice as closed and assign owner review of the 113 domain-only candidates. Do not infer Company from Deal title and do not execute any newly reviewed association without a separate approval; publish official amount reports only after >=95% coverage.
4. Maria Paz/ANAM replaces or explicitly ratifies the five synthetic activation payloads: start/end dates, delivery status, revenue model, renewal eligibility/status and Service stage.
5. Read back the five after review. `anam_service_field_readiness=fields_ready` is necessary but not sufficient; official cohorts also require valid Company/originating-Deal gates and reviewed facts.
6. Iterate the live pilot Retention/Loyalty dashboards. Remove `(PILOTO)` only after coverage, periods and denominators reconcile; official Retention KPIs and Loyalty signals remain gated by comparable renewable history and ratified inputs.
7. Implement the Kortex per-line-item idempotent materializer/custom workflow action before automating new Service creation. Do not activate plain Deal → Create Service or treat this pilot as bulk-backfill authorization.
8. Keep funnel reporting deferred until stage-entry/exit semantics are verified. Do not substitute current-stage counts for true conversion.
9. Fix the durable Kortex authorization-URL scope drift through its own approved release; current ANAM Product read is already active and is not a Phase 3 blocker.
10. Build the tenant-scoped billing foundation as the next committed construction slice: managed private intake,
    versioned parser and no-write profiler over `client_billing_*`. Do not create HubSpot schema, import rows or
    sync anything during this first slice. SharePoint is an optional adapter, not the primary dependency.

Billing is the next committed construction slice, not the only remaining work. Items 3–9 remain approval-gated,
client-owned or deferred and must keep their honest status.

## Safety and repository state

- Five authorized pilot Service records, three paired association-label definitions, the Company segmentation schema and two approved bounded Company imports were written and read back. Their exact IDs and rollback boundaries are in the execution ledgers.
- Greenhouse repo is dirty with intentional ANAM docs plus unrelated user work; do not revert unrelated changes.
- Kortex repo has intentional uncommitted `TASK-0130`, manifest, changelog and handoff changes plus unrelated untracked `hubspot-cms-react-project/`; do not touch that unrelated folder.
- The temporary Cloud SQL proxy was terminated.
- Final checks passed: Greenhouse `docs:closure-check`, `ops:lint --changed`, `git diff --check`; Kortex manifest JSON parity, `git diff --check` and `hs project validate`.

## Recommended opening instruction

Continue ANAM HubSpot from this handoff without restarting broad discovery. Before proposing or executing any write, use the authenticated Notion connector to search and read the ANAM meetings and linked tasks in the evidenced 2025-11-07 through 2026-07-06 window and any newer ANAM pages, starting with the page IDs listed under “Mandatory first action”. Build the required meeting → decision/commitment → owner → phase → runtime evidence → gap → next action/approval matrix. Distinguish stable decisions, tentative notes, completed tasks, open tasks and superseded material; use the local meeting synthesis only as an index and verify the live pages. Reconcile the matrix with the phase roadmap, living data model and current dashboard evidence, then report which phases are complete, pilot-only, blocked or ready. Do not mutate Notion or HubSpot during this first review. Current runtime baseline: Phase 1 and Growth are complete; the Phase 3 Service schema, association labels, five-record controlled pilot and activation-review workflow `1852406585` are live; the five Services contain conspicuously marked synthetic activation values and calculate `fields_ready` only for QA. Retention `21152855` has four verified pilot reports and Fidelización `21152950` has three; neither is official. Do not add bulk backfill, renewal records, remove `(PILOTO)` or modify/merge the duplicate ANAM Companies without separate documented approval.
