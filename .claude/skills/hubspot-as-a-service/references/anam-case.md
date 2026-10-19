# ANAM Case Routing

## Client boundary

ANAM is an Efeonce client, not a Greenhouse product initiative, internal dashboard or Efeonce CRM dataset. ANAM owns portal `19893546`, its records and its dashboards. Any separate ANAM representation in Greenhouse does not make this HubSpot work an internal capability. Greenhouse stores only engagement canon, QA, decisions and skills; Kortex provides approved portal-scoped execution. Never project ANAM client data into Greenhouse CRM, Finance, Income, Account 360 or product analytics without a separately authorized integration contract.

## Stable identifiers

- HubSpot portal: `19893546`
- Customer Agent: `Emma` (renamed live from `Agente de clientes de ANAM` on 2026-09-01)
- Chat human handoff: ticket workflow `1876744588`; customer-facing copy remains role-neutral because the assignee
  depends on intent and availability. Voice uses its own channel routing, not this workflow.
- Voice channel: `Anam - Emma`, ID `4316530466`, number `+56-6-0091-42234`, Help Desk / Asistencia al cliente.
  Current configuration and evidence: [Voice state — 2026-10-19](#voice-state--2026-10-19).
- Public chat landing: `https://anam-2.hubspotpagebuilder.com/agente-anam`
- CMS project: `kortex-cms-react`, project `103589049`
- CLI account/profile: `anam-19893546` / `anam`; never replace the Kortex/Efeonce default.
- Delivered-scope support: three months, 2026-08-13 through 2026-11-12 inclusive, for both Customer Agent and
  KPI. It covers incidents, corrections, operating questions, configuration recovery and correction-driven
  documentation. New functionality, KPI, workflows, automation, integrations, redesign or innovation require a
  separately approved scope.

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
- `docs/audits/ANAM_CUSTOMER_AGENT_EMMA_IDENTITY_QA_2026-09-01.md`
- `docs/audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`
- `docs/audits/ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md`
- `docs/audits/ANAM_EMMA_VOICE_CORREO_OSCAR_MARIA_PAZ_2026-10-19.md`
- `docs/manual-de-uso/hubspot/configurar-customer-agent-llamadas.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md`
- `docs/audits/ANAM_COMMERCIAL_BACKLOG_DASHBOARD_QA_2026-07-24.md`
- `docs/audits/ANAM_HUBSPOT_GOALS_EXECUTION_QA_2026-07-24.md`
- `docs/documentation/hubspot-as-a-service/anam-entrega-documentacion-y-soporte-2026-09-02.md`
- `docs/architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Especificacion_Tecnica_2026-09-02.pdf`
- `docs/architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Documentacion_Funcional_2026-09-02.pdf`

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
- Commercial backlog dashboard `21329151` is live as `(PILOTO)`: 575 open Deals, 205,005.55 UF nominal and
  77,134.72 UF weighted at the verified 2026-07-24 cutoff. It combines open Growth and Renewal stages, excludes
  `Radar 0%` and every closed stage, and keeps nominal, weighted and actual won values separate.
- Three native 2026 Goals are live for seven assignees: Growth revenue at 2,050 UF/month and 24,600 UF/year,
  50 emails/person/week and 5 meetings/person/week. Dashboard `21329151` contains aggregate, time-series and
  per-assignee reports for each Goal, nine reports total. Revenue is Growth-only; do not compare it to the full
  Growth-plus-Renewal backlog until ANAM supplies a fidelity target or approves a Growth-only comparison.
- Do not create ANAM Goal proxies for typed calls, qualified opportunities/quotes or win rate. The available
  calls template counts all Call records, no equivalent native templates exist for the other two contracts and
  custom Goal creation is locked in the current subscription. Fidelity remains blocked by missing metric, value,
  cadence and population.

## Landing and agent seam

As of 2026-09-24, the public landing `https://anam-2.hubspotpagebuilder.com/agente-anam` serves build `#30` of
HubSpot Developer Project `kortex-cms-react` (`103589049`) in portal `19893546`. Its source lives at
`/Users/jreye/Documents/dev/kortex/hubspot-cms-react-project`; the Greenhouse canon is
`docs/architecture/kortex/hubspot-cms/anam-chat-landing.md`.

The live experience presents Emma as a named concierge, with one intent selector and one final CTA. Landing
intents are `cotizar`, `seguimiento_servicio` and `requerimiento_calidad`. Selecting an option changes
`aria-pressed` and prepares context without opening chat; only the final CTA carries `data-chat-intent`. The
supported seam is URL intent + `HubSpotConversations.widget.refresh({ openToNewThread: true })` and chatflow
targeting. Composer prefill is not reliable in the current widget, especially before privacy consent.

Do not assume React client state is active on this CMS surface: the module is server-rendered, so runtime
selection is controlled in `base.hubl.html`. The public deploy is not verified until the page itself serves
`kortex-cms-react/<deployedBuildId>`, even if Developer Projects already reports the new build.

Brand and asset contract:

- use the horizontal ANAM wordmark from the repository without the circle above it;
- use the unaltered transparent `EMMA 2.png` portrait supplied by María Paz/ANAM for the landing
  (`emma-anam-portrait-2026-09-23.png`); retain `EMMA.png` as the separate full-body source;
- show `Tu ejecutivo comercial ANAM` above the hero and `Ejecutivo comercial ANAM` on Emma's identity plate;
- use a derivative of the client portrait with a pale mint background for the circular chat avatar. Customer Agent
  identity and chatflow `96601133` are separate image settings: save both, then inspect the public widget header
  and message avatar. The 256 px JPEG is `emma-anam-chat-avatar-256-2026-09-24.jpg`;
- the `ANÁLISIS AMBIENTALES S.A.` shirt embroidery belonged to the generated build #28 illustration, which remains
  available for rollback; do not impose that former-asset requirement on the client-provided photograph;
- verify public build ID and visible copy/image; run desktop and 390 px, overflow, keyboard/click selection,
  `aria-pressed`, CTA context and console/page/network checks for a full regression. Opening the widget to inspect
  its avatar does not require sending a real conversation. Build #30 received visual public readback, not a full
  mobile or conversational regression.

`Deployment > Workflows and bots` is the governed seam for routing only selected ANAM conversations to the Customer Agent. A candidate design is a short rule-based pre-flow that identifies one of the three landing intents, captures the minimum identifying/service context and then sends documented, repeatable needs to the agent while preserving explicit-person requests, commercial commitments, investigations, complaints/appeals and sensitive actions for human handling. This is a design pattern, not evidence of a live deployment: inventory the authenticated portal before proposing it, publish only with separate approval and verify positive, excluded, human-fallback and unavailable paths after activation.

Do not confuse this feature with workflow `1852406585`: that workflow is the controlled Service
activation-review queue and does not route conversations or deploy the Customer Agent. Channel configuration
alone never proves handling; use the 2026-07-24 operational readback and real-conversation evidence.

## Voice state — 2026-10-19

Current dated evidence lives in `docs/audits/ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md`; the exact sent
communication is `docs/audits/ANAM_EMMA_VOICE_CORREO_OSCAR_MARIA_PAZ_2026-10-19.md`. Re-read the portal before
future changes. These records supersede the historical pending 600 activation, not the separate chat contract.

- Portal `19893546` and approved Chile regulatory verification were read back. The target number initially had
  the label `Anam - Emma` but was **unassigned**, with no IVR: a number label did not connect Emma.
- The operator explicitly chose **Emma first**, approved Customer Agent Voice beta terms and 50 credits/minute
  using existing capacity, without purchasing credits or changing limits. Voice is published, all hours, 100%
  coverage, on calling channel `4316530466`. No keypad IVR was created.
- AI reception is configured 24/7, subject to available credits and service availability. This is not a promise
  of 24/7 ANAM human, laboratory or operational service.
- Human transfers: Monday–Friday, 09:00–18:00, Santiago timezone; simultaneous ringing to available Marco
  Jiménez Venegas, Pablo Puga and Maria Paz Haeger. This does **not** inherit intent routing from chat workflow
  `1876744588`. Availability must be set in HubSpot; Teams status is not evidence. Recipients need their calling
  tab open and audio permissions enabled.
- Outside human hours Emma remains first; when human help is needed, voicemail is the configured fallback.
  No human answer during hours also routes to voicemail. Those paths were saved/reopened, not call-tested.
- Voice `Lina`: female, Spanish, Colombian accent, accepted by the operator after the call. Saved parameters:
  speed 1, stability 0.5, similarity 0.75, style 0, speaker boost enabled. The account's Spanish selector showed
  six voices and no Chilean option; do not imply that an import/custom Chilean voice is supported.
- Published greeting: “Hola, soy Emma, el agente de inteligencia artificial de ANAM. ¿En qué puedo ayudarte hoy?”
  Spanish recording notice and voicemail were saved and reread; exact scripts are in the audit. Voicemail asks
  name, company, phone and reason, states human hours and offers `ventas@anam.cl`.
- Ticket defaults: Support Pipeline / New / no priority. The second number `+56-6-0091-42321`, existing chat and
  `Ventas@anam.cl` channel were not changed. September 9/14 Notion meetings already reported chat and email
  operating; earlier local “chat only” snapshots are historical, not the current channel inventory.

**Runtime evidence:** the operator made a real incoming call on 19 October at 12:02 America/Santiago and
reported satisfactory attention. Ticket `49630925083`, thread `11315753837`, call `118907575473` were independently
read back: 41 seconds, ticket New and owned by Emma, recording player available and transcript with three turns.
Emma disclosed AI identity, received a quotation request and asked matrix/objective, with water/soil/air examples,
without inventing price or timing. This proves reception, a relevant first intake response and CRM traceability;
it does not prove a complete quotation, knowledge coverage, human transfer, voicemail or resolution. The recording
was not played/downloaded for an independent auditory assessment. Structured 12:02 GMT-3 prevails over the
AI summary's inconsistent 11:02.

**Credits snapshot, not a standing balance:** 19 October, period 8 October–7 November: 33,000 monthly, 250 used,
32,750 globally available; Customer Agent voice 1 unit / 50 credits, text resolutions 0; workflows 60 and data
agent 140. Voice rounds up to whole minutes and AI minute consumption stops on human transfer; text is 50 credits
per qualifying resolution, not per message. The aggregate 50-credit voice unit is consistent with the 41-second
call, not a per-call billing receipt. Customer Agent's 33,000 limit shares account capacity, without reserving it
against other features. Account maximum 33,000 and automatic expansion mode were preexisting and unchanged.
30,000 additional credits were already contracted at US$3,240 annual billing (arithmetic US$270/month; tax
classification not verified). Telephony minutes are separate: the portal showed 7/3,000, not 3,000 free AI minutes.
Re-read current usage and limits before sizing; no subscription, budget or credit expansion is authorized here.

**Open acceptance checks:** multi-turn service/knowledge QA; transfer to an available human during hours;
voicemail with no human available and outside hours, including resulting ticket/recording; responsible person for
reviewing new tickets and voicemail; continuing credit monitoring. Preserve these as unverified until tested.

**Communication:** the operator approved sending the complete configuration, evidence, cost explanation and
pending checks to Oscar Carrasco and María Paz Haeger. Outlook sent it on 19 October at 12:16:41 America/Santiago,
with official graphical Julio signature and mandatory BCC `48713323@bcc.hubspot.com`; UI and connector read back
the sent copy. Efeonce portal `48713323` recorded EMAIL `118930883467` as `SENT` via BCC, without a duplicate note.
This is an Efeonce outbound communication record, not an ANAM data integration, and proves neither delivery nor
reading. Recipient details and exact content remain in the communication audit.

Kortex remains hibernated and was neither used nor restarted. The old Aircall proposal does not establish the
current telephony implementation. Recovery means reviewing removal of only Emma's voice deployment and verifying
the remaining call destination before use; never delete the number or alter chat/email as an implicit rollback.

## Customer Agent capability backlog

The 2026-07-24 readback shows the Customer Agent operational with 23 active sources, live chat configured all
hours/100%, published Follow-up and Quality instructions and role-neutral customer-facing handoff copy. On
2026-09-01 the visible profile and scripted greeting were published as `Emma`. Later that day the handoff matrix
was implemented through active ticket workflow `1876744588`: quotation/new business routes to Pablo Puga with
Maria Paz Haeger as availability fallback; service follow-up routes to Marco Jiménez Venegas with Pablo Puga as
fallback; Quality, billing and other requests route to Maria Paz Haeger with Marco Jiménez Venegas as fallback.
The workflow first summarizes and classifies the ticket, clears Emma as ticket owner, then applies the primary
and fallback assignments with availability checks and without overwriting a successful primary assignment.

Three public-chat E2E cases created tickets `48103069613`, `48105602378` and `48094218332`. The quotation case
reached Pablo; the follow-up case classified correctly and used Pablo because Marco was unavailable; the Quality
case reached Maria Paz. The original failed probe `48103382175` exposed and drove the owner-clear/classifier fix;
the test chats were ended after verification. This proves routing, ticket ownership and the customer-facing owner
label; it does not prove that a human replied or that a second human accepted a reassignment in the same chat.

The configured chat mode is live handoff. While the chat remains open, the first human may manually reassign its ticket
owner in Help Desk and the second human can continue in the same thread. Do not end a chat that needs this
continuity because an ended chat cannot be reopened. The current workflow routes by intent and availability; it
does not resolve arbitrary free-text names to Pablo, Marco or Maria Paz. A named-person request triggers human
handoff, but the exact person requires a governed condition or manual reassignment and runtime proof before the
public copy confirms the name.

Credit-behavior monitoring remains open; the 19 October voice usage snapshot above is the latest recorded
evidence, not ongoing monitoring. CRM permissions, reply recommendations, contact/segment-aware testing,
analytics/coaching and lead qualification still lack documented runtime proof. Voice reception and first intake
are now verified within the bounded evidence above; transfer, voicemail and broader knowledge QA remain open.

Use this sequence after a read-only portal inventory:

1. Verify `Define > Permissions`, `Train > Actions`, `Analyze`, reply recommendations, channel settings and beta eligibility without changing them.
2. Pilot reply recommendations for Maria Paz and repeat QA as a governed CRM test Contact/segment, including safe attachments and Testing Insights. These are human-in-the-loop/preview experiments, not autonomous rollout.
3. Inspect historical reports, knowledge gaps, coaching opportunities and source usage. Establish resolution, necessary/premature handoff, unresolved, feedback and source-quality baselines; never equate deflection with resolution.
4. Propose a small, separately approved Contact-property allowlist. Default to view-only; HubSpot's documented native permission does not expose Company, Deal, Ticket, Service or billing ledgers.
5. The historical external-action candidate was a read-only `GET` status lookup through a portal-bound Kortex endpoint with verified email, response allowlist, audit and human fallback. Kortex is hibernated: do not exercise that route or either `Nueva acción` draft. Any future action needs its own approved runtime, purpose, endpoint, security contract and QA.
6. Verify real conversations and credit behavior on the active channel before expanding coverage or channels.
7. Finish voice transfer/voicemail and knowledge QA on channel `4316530466` before expanding its design. Reconcile email operation reported in September with current portal evidence; forms, WhatsApp and custom channels remain separate eligibility/design/approval work. The 600 voice activation is no longer pending.
8. Keep lead qualification beta last. The current operating model assigns qualification, commitments and exceptions to people; changing lifecycle or routing from the agent requires explicit ANAM ratification and CRM-write QA.

No item in this backlog authorizes further CRM permissions, action publication, beta opt-ins, new channels,
handoff rewrites or deployment changes. The explicit 19 October authorization covered only the voice slice above.
Operational status does not remove the remaining real-conversation and credit-monitoring gate.

## Operational lessons

- HubSpot may return the same Company under labeled and unlabeled association types. Deduplicate associations by target object ID before deciding that a Deal has multiple Companies.

- Persona and empathy must survive when handoff is tightened; do not replace them with a purely procedural prompt.
- Billing/administrative information should be answered when documented. Escalate only the action requiring a person.
- Technical quotation needs service-specific intake and can require more than two questions.
- Native transfer can pre-empt short answers. Transfer copy is part of the experience.
- Customer Agent and 30,000 additional credits were confirmed purchased on 2026-07-16. The overdue-invoice
  activation failures observed on 2026-07-17 are historical, not the current state: authenticated readback on
  2026-07-24 showed the agent operational and 33,000 credits per cycle. Do not pay or change subscriptions;
  continue real-conversation and credit-use monitoring.
- Classify client attachments before modeling: migration source records, configuration inputs, reference-only evidence and exclusions are different contracts. For ANAM, only the billing ledger and customer-segmentation workbook are migration candidates. Billing remains no-go; segmentation has one approved exact/unique slice live, while held, unmatched and ambiguous rows remain no-go until separate identity, mapping, dry-run and approval gates close.
- Do not upload vendor subscription PDFs, presentation slides, email signatures, voicemail artifacts or superseded process documents into CRM records or Customer Agent knowledge merely because they were attached to a client email.
- For client-facing custom properties, use a natural visible label and a stable snake_case internal name. ANAM's governed example is label `Segmento de mercado` with internal name `segmento_de_mercado_anam`; do not expose implementation qualifiers in the label unless users need them.
- Exact source matching is not sufficient when HubSpot itself contains duplicate normalized Company keys. Require one consistent source value **and** one live Company per normalized key; hold every record under duplicate keys for separate review. In the 2026-07-16 segmentation slice this guard reduced 484 preliminary matches to 471 safe updates and held 22 records across 11 keys.
- Treat pre-change snapshots and approved manifests as immutable rollback evidence. A verification mode may add a separate post-change readback but must never regenerate or overwrite the files used to authorize the write.
- If a portal-scoped CLI credential has read scopes but lacks the approved object/schema write scopes, fail before mutation and use an authenticated HubSpot UI import only when the operator has already approved the exact manifest. Select update-existing-only, map by Record ID, disable enrichment/signals and same-object associations, then verify imported rows, updated records, zero errors and record-level readback. Do not broaden scopes merely to avoid a safe authenticated UI path.
- A HubSpot connector being authenticated does not prove it targets ANAM. Read `get_user_details.accountId` before any connector operation and abort if it is not `19893546`; the 2026-07-16 connector exposed `48713323`, while ANAM remained available through the guarded `anam-19893546` CLI/browser profile.
- For Deals missing Company, explicit `Deal -> Contact -> Company` convergence is reviewable evidence only when every associated Contact resolves to one distinct Company ID. Corporate email-domain matching is a manual-review hint, never an automatic association rule. Deal-title, owner and fuzzy-name inference remain prohibited.
- In a HubSpot two-object UI import, one approved Company↔Deal pair may be reported as two new directional associations. Reconcile the UI total to the pair count, then read back from Deal→Company and require the approved Company ID, exactly one distinct Company and Primary type ID `5`; do not mistake the doubled UI count for cohort expansion.
