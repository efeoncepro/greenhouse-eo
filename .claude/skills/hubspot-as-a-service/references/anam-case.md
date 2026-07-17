# ANAM Case Routing

## Client boundary

ANAM is an Efeonce client, not a Greenhouse product initiative, internal dashboard or Efeonce CRM dataset. ANAM owns portal `19893546`, its records and its dashboards. Any separate ANAM representation in Greenhouse does not make this HubSpot work an internal capability. Greenhouse stores only engagement canon, QA, decisions and skills; Kortex provides approved portal-scoped execution. Never project ANAM client data into Greenhouse CRM, Finance, Income, Account 360 or product analytics without a separately authorized integration contract.

## Stable identifiers

- HubSpot portal: `19893546`
- Customer Agent: `Agente de clientes de ANAM`
- Human handoff owner: Maria Paz Haeger
- Public chat landing: `https://anam-2.hubspotpagebuilder.com/agente-anam`
- CMS project: `kortex-cms-react`, project `103589049`
- CLI account/profile: `anam-19893546` / `anam`; never replace the Kortex/Efeonce default.

## Canonical documentation

- `docs/architecture/kortex/hubspot-cms/anam-chat-landing.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md`
- `docs/architecture/kortex/hubspot-cms/anam-portal-access.md`
- `docs/architecture/kortex/hubspot-cms/landing-page-runbook.md`
- `docs/architecture/kortex/hubspot-as-a-service/README.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-open-work-and-exit-gates-2026-07-17.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-meeting-synthesis-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-email-attachment-synthesis-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-attachment-hubspot-classification-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-account-unit-billing-event-converged-model-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-monthly-billing-etl-operating-model-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-managed-billing-intake-ui-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/client-billing-intake-data-model-spec-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-hubspot-decision-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-migration-dry-run-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-schema-preview-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-schema-reconciliation-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-commercial-catalog-dry-run-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-sector-geography-kpi-slice-change-set-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-deal-company-association-remediation-dry-run-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-phase-3-panel-first-service-readiness-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-phase-3-forward-service-capture-contract-2026-07-16.md`
- `docs/audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`

## RevOps object model

Load the living data-model/synergies document before changing any ANAM object, property, association, automation or panel. It owns current grain, fact ownership and allowed projections; dated discovery documents preserve evidence but may contain superseded proposals.

When resuming ANAM from a handoff or deciding whether to advance a phase, first search and read the live ANAM meetings and linked tasks in Notion. Reconcile meeting/date, decision or commitment, owner, phase, runtime evidence, gap, next action and required ANAM approval. Classify material as stable, tentative, completed, open or superseded. The dated meeting synthesis is a navigation index, not current authorization; the reconciliation step is read-only and must not mutate Notion or HubSpot.

- Contact -> Lead -> Company -> Deal -> Service is the meeting-ratified lifecycle.
- Deal owns opportunity, quotation, award and primary income classification.
- Standard HubSpot Service (`0-162`) is already active and owns each adjudicated/contracted service, term, recurrence and renewal. Extend it through an approved data dictionary; do not invent a parallel contract custom object.
- Line items preserve quote/service components and compound opportunity detail.
- Ticket owns support, Quality, claim, billing and administrative cases with SLA; it does not own the contract.
- Company owns durable account, parent-child, legal/HQ geography and governed sector data.
- Billing execution needs a source, unique key and event grain before synchronization; do not flatten repeated invoices/EDP/HES/HAS/LIMS rows into Deal or Company.
- Billing Event is the proposed custom-object grain: one source List item, idempotent composite key, original currency preserved, direct Company association and Service/Deal association only when deterministic. Current matching coverage is insufficient for import, so identity remediation precedes backfill.
- Account Unit ANAM is the proposed intermediate grain for one normalized Código ANAM/CeCo. One Company can own multiple Units; Billing Events resolve by exact Unit code and receive direct Company association only after the Unit-to-Company link is reviewed. Do not store multiple codes in a unique Company property or create child Companies without proof that the code represents a real CRM account/branch.
- The monthly billing "service" is an ETL integration, not a HubSpot Service-per-row factory. Prefer an authenticated managed Greenhouse upload/review surface backed by private GCS, Cloud Run and the external run ledger; SharePoint is an optional source adapter. Require validation plus explicit approval, upsert Billing Events by source key, and associate existing Services only through deterministic contract lineage.
- ANAM is an external client and owns the workbook, its customers and all target HubSpot objects. Greenhouse is only a tenant-scoped managed control plane. Never project ANAM billing rows into Efeonce/Greenhouse CRM, Finance, Income or Account 360, and never use the ANAM Company record in its own portal as the row identity.
- Physical ingestion tables are reusable `client_billing_*` contracts with mandatory session-derived `space_id`; ANAM is a dataset configuration bound to portal `19893546`, never a hardcoded schema or request-supplied portal.
- Billing averages must declare grain and currency. Report mean plus median per Billing Event, aggregate invoice rows by invoice number+currency before computing invoice averages, and calculate per-Unit/per-Company monthly averages only from matched eligible events. Never average or sum mixed CLP/UF/USD.
- The SharePoint workbook called `Ticket Facturación` contains billing events, not HubSpot customer Tickets. Those events must be ingested into the HubSpot model and associated to Company plus, where deterministic, Service and originating Deal so ANAM can compare sold/awarded value with billable/invoiced actuals. Customer Tickets separately cover Service follow-up, Billing inquiries and Quality cases.
- `tipo_de_ingreso` remains single-select and its legacy `Down-sell` option stays hidden: contraction is a Retention movement on comparable Services, not an income type, churn or an award below quote.
- For Service portfolio reporting use line-item TCV in original currency. For Retention compare ARR only inside a reviewed recurring/renewable cohort. Never collapse these into one “comparable awarded value.”
- Blank line-item billing frequency is unknown, not proof of one-time revenue. Billing cadence is not delivery/service frequency; Deal-level service date/frequency fields are review hints, not automatic line-item truth.
- Smart properties are credit-consuming AI evidence, never ANAM identity, money, lifecycle, renewal eligibility, churn or health-state truth. Current official eligibility does not list native Service, so Service support must be proven rather than assumed.
- GRR/NRR remain blocked until Service has comparable recurring values, currency, periodicity, start/end dates and a complete renewable cohort.
- Five controlled pilot Services are live in portal `19893546`. Their activation inputs are conspicuously marked synthetic and all calculate `fields_ready` for QA, but they remain excluded from official KPIs until Maria Paz Haeger/ANAM ratifies or replaces those facts. Workflow `1852406585` is active only as the activation-review queue: authenticated positive/negative tests passed, five pilot executions created five associated tasks and re-enrollment is disabled. Pilot Retention `21152855` and Fidelización `21152950` are live but are not final dashboards or authorization for historical backfill. Load `anam-phase-3-forward-pilot-execution-2026-07-16.md` for IDs/rollback and `anam-phase-3-pilot-dashboard-execution-2026-07-16.md` for current report evidence.
- Growth `19708354` contains three approved historical-partial diagnostics: segment `340896790`, strategic sector `340897291` and Company HQ region `340897635`. They filter exact `Ganado` plus a known Company dimension and sum Deal commercial value in Company currency. They are not invoicing, recognized revenue, TAM/SAM penetration or official complete-population KPIs; the >=95% coverage gate remains active.
- Data Quality dashboard `21144697` owns the Deal-without-Company remediation queue. The approved exact 34-pair slice moved primary Company coverage from 595/1,240 to 629/1,240 and reduced missing associations from 645 to an expected/calculated 611; the dashboard itself still preserves the verified 645 baseline until a post-remediation readback is recorded. Treat the remaining queue as operational capture/adoption debt to be worked by Deal owner, not as a HubSpot platform outage; duplicate, domain-only and ambiguous candidates remain held, and every further association write needs separate approval.
- Do not use a plain Deal `Create record → Service` workflow as ANAM's materializer: a Deal may have multiple line items and the native action does not provide the governed per-line-item iterator/idempotency contract. Use Kortex portal-scoped materialization per line item. The active activation-review workflow does not create Services, fill contractual facts, change stages or make records KPI-eligible; load `anam-phase-3-service-automation-workflow-test-2026-07-16.md`.
- ANAM delivery is commercial-first: close Company/Contact -> Lead -> Deal/line items -> Service -> renewal and the Data Quality/Growth/Retention/Loyalty dashboards before expanding Ticket, billing sync and operational dashboards.
- Commercial pipeline governance is live from the approved 2026-07-17 change set. Manual Deal creation requires
  Company and no longer receives an automatic 60-day close date. Growth `636797559` permits ordinary creation
  only in `Potencial 10%`; `Calificado 30%` and `Interesado 50%` require `Paso siguiente`; `Hot 85%` also requires
  `Monto original`; `Cierre ganado 100%` requires `Países de ejecución`, `Monto original` and `Variación vs.
  cotizado` while keeping `Región` optional; both negative outcomes require `Motivo de cierres perdidos`.
- `Radar 0%` stage `1034441224` and its ten Deals are explicitly excluded from the pipeline correction because
  native Lead owns pre-qualification. It remains labeled `Radar 0%`, probability/lost metadata unchanged, with
  no stage logic and outside the Growth creation rule. Do not move those Deals or reinterpret the stage without
  a separate approval and dependency review.
- Renewal pipeline `636594526` preserves its seven stage IDs/probabilities and now uses labels `Por revisar`,
  `Elegibilidad confirmada`, `Contacto iniciado`, `Propuesta en negociación`, `Renovado`, `No renovado` and `No
  aplica / Desestimado`. Ordinary creation is limited/defaulted to `Por revisar`; the four open stages require
  `Paso siguiente`, `Renovado` requires `Países de ejecución`, and both negative outcomes require the lost reason.
  This governs Deal capture only; it does not create prior/successor Services or make Retention official.
- Eight stage-entry task automations are designed but not published. They remain a separate controlled slice
  until owner, due date, notification, dedupe/re-enrollment and positive/negative future-entry tests are ratified.
  Workflows `1805870398` and `1805693705` remain disabled because assigning `Venta nueva` from pipeline membership
  would corrupt income classification. Canon and QA: `anam-commercial-pipeline-governance-change-set-2026-07-17.md`
  and `docs/audits/ANAM_COMMERCIAL_PIPELINE_GOVERNANCE_QA_2026-07-17.md`.

## Landing and agent seam

Landing intents are `cotizar`, `seguimiento_servicio` and `requerimiento_calidad`. The supported seam is URL intent + `HubSpotConversations.widget.refresh({ openToNewThread: true })` and chatflow targeting. Composer prefill is not reliable in the current widget, especially before privacy consent.

`Deployment > Workflows and bots` is the governed seam for routing only selected ANAM conversations to the Customer Agent. A candidate design is a short rule-based pre-flow that identifies one of the three landing intents, captures the minimum identifying/service context and then sends documented, repeatable needs to the agent while preserving explicit-person requests, commercial commitments, investigations, complaints/appeals and sensitive actions for human handling. This is a design pattern, not evidence of a live deployment: inventory the authenticated portal before proposing it, publish only with separate approval and verify positive, excluded, human-fallback and unavailable paths after activation.

Do not confuse this feature with workflow `1852406585`: that workflow is the controlled Service activation-review queue and does not route conversations or deploy the Customer Agent. Do not infer that the existing 24/7/100% chatflow configuration proves a `Workflows and bots` assignment or effective handling while the Customer Agent remains paused by the documented billing blocker.

## Customer Agent capability backlog

The live 2026-07-17 baseline is knowledge-and-handoff heavy: 23 active sources, one live-chat channel configured all hours/100%, direct Help Desk handoff to Maria Paz Haeger, zero published actions and two unnamed action drafts. There is no documented runtime proof yet for CRM permissions, reply recommendations, contact/segment-aware testing, analytics/coaching, lead qualification or additional channels. Absence from the local pack is a discovery gap, not proof that the portal is ineligible.

Use this sequence after a read-only portal inventory:

1. Verify `Define > Permissions`, `Train > Actions`, `Analyze`, reply recommendations, channel settings and beta eligibility without changing them.
2. Pilot reply recommendations for Maria Paz and repeat QA as a governed CRM test Contact/segment, including safe attachments and Testing Insights. These are human-in-the-loop/preview experiments, not autonomous rollout.
3. Inspect historical reports, knowledge gaps, coaching opportunities and source usage. Establish resolution, necessary/premature handoff, unresolved, feedback and source-quality baselines; never equate deflection with resolution.
4. Propose a small, separately approved Contact-property allowlist. Default to view-only; HubSpot's documented native permission does not expose Company, Deal, Ticket, Service or billing ledgers.
5. Design the first external action as a read-only `GET` status lookup through a portal-bound Kortex endpoint with verified email, response allowlist, audit and human fallback. Do not publish either existing `Nueva acción` draft until its purpose, endpoint and security contract are known.
6. After ANAM resolves billing and activation is read back, use a reversible coverage cohort or bounded hours before returning to 100%; verify real conversations and credit behavior.
7. Evaluate email/form deployment, then WhatsApp. Treat calling and custom channels as eligibility-dependent betas and prove whether they satisfy the separate 600-number requirement.
8. Keep lead qualification beta last. The current operating model assigns qualification, commitments and exceptions to people; changing lifecycle or routing from the agent requires explicit ANAM ratification and CRM-write QA.

No item in this backlog authorizes a CRM permission, action publication, beta opt-in, new channel, handoff rewrite or deployment change. The current billing blocker still prevents claiming autonomous runtime even if configuration remains visible.

## Operational lessons

- HubSpot may return the same Company under labeled and unlabeled association types. Deduplicate associations by target object ID before deciding that a Deal has multiple Companies.

- Persona and empathy must survive when handoff is tightened; do not replace them with a purely procedural prompt.
- Billing/administrative information should be answered when documented. Escalate only the action requiring a person.
- Technical quotation needs service-specific intake and can require more than two questions.
- Native transfer can pre-empt short answers. Transfer copy is part of the experience.
- Customer Agent and 30,000 additional credits were confirmed purchased on 2026-07-16. Live readback on 2026-07-17 showed 33,000 monthly credits, but the account is overdue on invoice `#760627868` (due 2026-06-07) and the operator has restricted billing access. Two approved activation attempts failed server-side and credit usage remained off. Treat this as an ANAM billing-administration blocker: do not pay or change subscriptions; after ANAM regularizes the invoice, retry activation, require `ACTIVADA`, resume the agent and verify new-conversation handling. Configuration, 23 sources and the chatflow remain present; load the independent source pack before any knowledge change.
- Classify client attachments before modeling: migration source records, configuration inputs, reference-only evidence and exclusions are different contracts. For ANAM, only the billing ledger and customer-segmentation workbook are migration candidates. Billing remains no-go; segmentation has one approved exact/unique slice live, while held, unmatched and ambiguous rows remain no-go until separate identity, mapping, dry-run and approval gates close.
- Do not upload vendor subscription PDFs, presentation slides, email signatures, voicemail artifacts or superseded process documents into CRM records or Customer Agent knowledge merely because they were attached to a client email.
- For client-facing custom properties, use a natural visible label and a stable snake_case internal name. ANAM's governed example is label `Segmento de mercado` with internal name `segmento_de_mercado_anam`; do not expose implementation qualifiers in the label unless users need them.
- Exact source matching is not sufficient when HubSpot itself contains duplicate normalized Company keys. Require one consistent source value **and** one live Company per normalized key; hold every record under duplicate keys for separate review. In the 2026-07-16 segmentation slice this guard reduced 484 preliminary matches to 471 safe updates and held 22 records across 11 keys.
- Treat pre-change snapshots and approved manifests as immutable rollback evidence. A verification mode may add a separate post-change readback but must never regenerate or overwrite the files used to authorize the write.
- If a portal-scoped CLI credential has read scopes but lacks the approved object/schema write scopes, fail before mutation and use an authenticated HubSpot UI import only when the operator has already approved the exact manifest. Select update-existing-only, map by Record ID, disable enrichment/signals and same-object associations, then verify imported rows, updated records, zero errors and record-level readback. Do not broaden scopes merely to avoid a safe authenticated UI path.
- A HubSpot connector being authenticated does not prove it targets ANAM. Read `get_user_details.accountId` before any connector operation and abort if it is not `19893546`; the 2026-07-16 connector exposed `48713323`, while ANAM remained available through the guarded `anam-19893546` CLI/browser profile.
- For Deals missing Company, explicit `Deal -> Contact -> Company` convergence is reviewable evidence only when every associated Contact resolves to one distinct Company ID. Corporate email-domain matching is a manual-review hint, never an automatic association rule. Deal-title, owner and fuzzy-name inference remain prohibited.
- In a HubSpot two-object UI import, one approved Company↔Deal pair may be reported as two new directional associations. Reconcile the UI total to the pair count, then read back from Deal→Company and require the approved Company ID, exactly one distinct Company and Primary type ID `5`; do not mistake the doubled UI count for cohort expansion.
