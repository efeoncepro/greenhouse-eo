# Greenhouse Tracking Engine Architecture V1

> Tipo de documento: arquitectura / ADR draft
> Status: Proposed direction — discovery complete, no runtime changes yet
> Version: V1 draft
> Fecha: 2026-06-28
> Owner: Product / Platform Architecture / Growth / Marketing Operations
> Source task: `TASK-1260`
> Domain: `growth`

## 1. Decision Summary

Greenhouse should own a first-party tracking engine for Efeonce public acquisition surfaces, but V1 must be a **hybrid tracking architecture**, not a replacement of every current analytics tool on day one.

The recommended V1:

- keeps browser `dataLayer` / GTM as a measurement surface for marketing tags;
- adds a Greenhouse-owned server ingestion path for governed behavioral events;
- keeps the existing Growth Forms submission ledger as authoritative conversion truth;
- treats HubSpot, GA/GTM, Clarity, Metricool and BigQuery as consumers, destinations or comparison sources, not source of truth;
- models visitor/session identity as pseudonymous, rotatable context, not proof of person identity.

Hard boundary:

```text
behavioral tracking != conversion ledger != CRM attribution
```

This task does not implement runtime, cookies, migrations, plugin edits, dashboards or exports.

## 2. Current Inventory

### 2.1 Public Site Live Scripts

Read-only inventory from `https://efeoncepro.com/` on 2026-06-28:

| Source | Evidence | Current role | Owner | Risk / note |
| --- | --- | --- | --- | --- |
| Google tag / Site Kit | `gtag/js?id=GT-KV5CNNKQ`, `window.dataLayer`, Site Kit event wrapper | GA-style page/event measurement | Public site / marketing ops | Useful for marketing analytics, not Greenhouse SoT. |
| Google Tag Manager | `GTM-NGHPGRLZ` plus noscript iframe | Tag orchestration | Public site / marketing ops | Keep as destination/consumer; do not use as only Greenhouse API. |
| HubSpot / Leadin | `js.hs-scripts.com/48713323.js?integration=WordPress&ver=11.3.51` | HubSpot tracking/forms/chat context | HubSpot / public site | Read-only. Version differs from 2026-06-14 discovery (`11.3.45`). |
| HubSpot Content Embed | `hubspot-content-embed` CSS/module | HubSpot embed support | HubSpot / public site | Consumer surface, not source of truth. |
| Microsoft Clarity | `clarity.ms/tag/t5fin8m159` | Session/product analytics | Public site / marketing ops | Avoid replay/PII assumptions in Greenhouse. |
| Metricool | `tracker.metricool.com/resources/be.js` | Social/marketing measurement | Public site / marketing ops | Destination/comparison only. |
| ActiveCampaign tracking | `activecampaign-subscription-forms/site_tracking.js` | Third-party behavior tracking | Public site / marketing ops | Must not become Greenhouse identity truth. |
| Contact Form 7 / Send trackers | CF7 scripts + Send form trackers | Legacy form tracking | WordPress plugins | Migration context for TASK-1258/1264. |

The HubSpot services page (`/servicios-contratar-hubspot/`) additionally contains an Elementor `hubspot-form` widget, CF7 form markup and HubSpot forms embed scripts (`forms/embed/v2.js`, `forms/embed/48713323.js`).

### 2.2 Greenhouse Runtime Already Exists

Growth Forms already provides a strong conversion and telemetry precedent:

| Layer | Existing path | Contract |
| --- | --- | --- |
| Browser-safe event taxonomy | `src/lib/growth/forms/contracts.ts` | `GTM_EVENT_NAMES`, `TELEMETRY_ALLOWED_PAYLOAD_KEYS`, forbidden payload keys. |
| Renderer event emitter | `src/growth-forms-renderer/telemetry.ts` | Emits `gh_form_*` `CustomEvent` and optional `window.dataLayer.push()` after allowlist filtering. |
| Public submit command | `src/lib/growth/forms/commands.ts` | Validates surface, consent, captcha, dedupe, server validation and abuse before accepting. |
| Conversion ledger | `src/lib/growth/forms/store.ts` | Persists accepted submission + consent snapshot + outbox event in one transaction. |
| Destination adapter | `src/lib/growth/forms/destinations/hubspot/adapter.ts` | Server-side HubSpot Forms secure submit; browser never sees HubSpot IDs/tokens. |

This means Greenhouse Tracking Engine must not reimplement form conversion truth. It should reference `form_submission`, consent snapshots and destination attempts when reconciling funnel events.

## 3. Source-Of-Truth Boundaries

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Page content/route placement | Public site runtime: WordPress now, Astro target | Host owns page placement and DOM container. |
| Browser behavioral events | Proposed Greenhouse tracking event ledger | Events like page/session/form CTA/report asset interactions. |
| Form conversion | `greenhouse_growth.form_submission` + consent/destination attempts | Browser submit events are signals, not proof. |
| CRM identity/lifecycle | HubSpot CRM mirror / Account 360 sync | HubSpot owns CRM contact/company/deal lifecycle. |
| Campaign/UTM context | Captured attribution envelope + downstream GA/HubSpot comparison | User-controlled URL values are context, not truth by themselves. |
| Analytics warehouse | Future BigQuery export | Warehouse is analytical consumer, not product write path. |
| Tag orchestration | GTM | Consumer/destination, not sole integration surface. |

## 4. Event Taxonomy V1

V1 should start with a small allowlisted taxonomy. Event names are Greenhouse names; destination adapters translate later.

| Family | Examples | Purpose |
| --- | --- | --- |
| `page` | `page_viewed`, `page_engaged`, `section_viewed` | Public route and content performance. |
| `session` | `session_started`, `consent_changed` | Pseudonymous journey grouping and consent state changes. |
| `form` | `form_viewed`, `form_started`, `form_submitted`, `submission_accepted`, `submission_rejected` | Reconcile renderer events with server conversion truth. |
| `campaign` | `campaign_landed`, `cta_clicked`, `lead_magnet_opened` | Acquisition attribution and funnel analysis. |
| `asset` | `asset_accessed`, `report_viewed`, `download_started` | Lead magnet and report engagement. |
| `handoff` | `qualified_handoff_created`, `hubspot_delivery_confirmed` | Bridge to CRM/commercial truth without making browser authoritative. |

Growth Forms `gh_form_*` events remain browser-safe measurement events. A future ingestion adapter may map them to this taxonomy, but accepted/delivered conversion states must be joined from the server ledger.

## 5. Event Envelope

Proposed contract prefix: `greenhouse-tracking-events.v1`.

```ts
interface TrackingEventEnvelopeV1 {
  schemaVersion: 1
  eventId: string
  eventName: TrackingEventName
  occurredAt: string
  receivedAt?: string
  source: {
    hostSurfaceId: string
    hostSurfaceKind: 'wordpress' | 'astro' | 'greenhouse' | 'generic_html'
    pageUri?: string
    pageTitle?: string
    referrer?: string
    rendererVersion?: string
  }
  identity: TrackingIdentityEnvelopeV1
  consent: TrackingConsentEnvelopeV1
  attribution: TrackingAttributionEnvelopeV1
  subject?: {
    formId?: string
    formVersionId?: string
    submissionId?: string
    reportId?: string
    assetId?: string
    ctaId?: string
  }
  properties: Record<string, string | number | boolean | null>
}
```

Rules:

- `eventId` is generated client-side when possible and re-keyed server-side if absent.
- Ingestion dedupes by `(host_surface_id, event_id)` plus short fallback fingerprint window.
- `properties` only accepts scalar, allowlisted keys per event type.
- Events can be rejected or redacted before persistence if they violate policy.

## 6. Identity Envelope

V1 identity is pseudonymous.

```ts
interface TrackingIdentityEnvelopeV1 {
  visitorId?: string
  sessionId?: string
  correlationId?: string
  submissionId?: string
  hubspotUtk?: string
  emailHash?: string
}
```

Rules:

- `visitorId` and `sessionId` are first-party Greenhouse identifiers, rotatable and scoped to Efeonce public surfaces.
- `hubspotutk` is attribution context only. It is never authentication and never person proof.
- `emailHash` is allowed only after a server-accepted submission or explicit consent/policy; the browser should not send raw email as analytics.
- Identity stitching is probabilistic until a governed server-side conversion or CRM sync creates a durable association.
- Reset consent / privacy request must rotate or delete optional analytics identity where policy requires it.

## 7. Consent And Privacy Envelope

```ts
interface TrackingConsentEnvelopeV1 {
  analyticsAllowed: boolean
  marketingAllowed?: boolean
  doNotTrack?: boolean
  consentPolicyVersion?: string
  source: 'cookie_banner' | 'form_consent' | 'server_policy' | 'unknown'
}
```

Rules:

- Optional behavioral analytics obey `analyticsAllowed` and browser Do Not Track where required by policy.
- Required security/audit logs remain separate from optional analytics events.
- Consent state must travel with the event or be derivable from server-side policy at receive time.
- No tracking event can contain raw field values, email, phone, national ID, document names, free text, tokens, HubSpot property names, HubSpot form GUIDs or private URLs.
- Retention must differ by class: raw behavioral events short-lived, derived aggregate/reporting longer-lived, audit/security by legal/ops policy.

## 8. Attribution Envelope

```ts
interface TrackingAttributionEnvelopeV1 {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  fbclid?: string
  landingPageUri?: string
  referrerDomain?: string
  firstTouchId?: string
  lastTouchId?: string
}
```

Rules:

- UTM/referrer/click IDs are normalized and bounded at ingestion.
- First/last touch should be derived server-side from accepted events, not trusted from hidden fields.
- Form submissions should store only the attribution snapshot required for reconciliation and destination delivery.
- HubSpot can receive allowed context, but HubSpot cannot dictate the Greenhouse event schema.

## 9. Storage Recommendation

V1 should use PostgreSQL as the operational ledger and BigQuery as a downstream analytical export once volume or reporting needs justify it.

Proposed future tables:

- `greenhouse_growth.tracking_events` — append-only sanitized event envelope.
- `greenhouse_growth.tracking_sessions` — current/session projection keyed by pseudonymous IDs.
- `greenhouse_growth.attribution_touches` — derived touchpoints for first/last/multi-touch attribution.
- `greenhouse_growth.tracking_event_rejections` — minimal rejection/degrade evidence.

Pattern:

```text
append-only raw/sanitized event log -> current projections/readers -> optional BigQuery export
```

This follows the Greenhouse distinction: historical observations are append-only; current state is derived by views/readers.

## 10. Architecture Options

| Option | Summary | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| Client-only `dataLayer` | Keep GTM/GA/HubSpot and map events only in browser. | Fast, no backend. | No Greenhouse SoT, weak consent/dedupe/reconciliation, hard for Nexa/API parity. | Rejected as SoT. Keep as destination surface. |
| Server-only ingestion | Browser posts every event only to Greenhouse. | Strong governance. | Harder GTM continuity; more rollout risk; can overbuild before first migration. | Not V1 alone. |
| Hybrid client + server | Browser emits safe `CustomEvent`/`dataLayer` and selected events post to Greenhouse ingestion. | Preserves marketing tooling, adds Greenhouse ledger, rollout per surface. | Requires dedupe and reconciliation. | Recommended V1. |
| Edge collection | Collect at edge/proxy before app. | High coverage and latency. | More privacy/consent complexity, infrastructure blast radius. | Defer. |
| Warehouse-first | Stream directly to BigQuery/GA. | Good analytics scale. | Not operationally governed; weak Product API parity. | Downstream export only. |
| HubSpot-first | Rely on HubSpot cookies/events/forms. | CRM-native. | Vendor-coupled, plugin-owned, weak Greenhouse memory. | Rejected as internal model. |

## 11. Recommended V1 Flow

```text
Host page (WP/Astro)
  -> Greenhouse renderer / small tracking client
  -> CustomEvent + optional dataLayer push
  -> POST /api/public/growth/tracking/events (selected allowlisted events)
  -> tracking_events append-only ledger
  -> attribution/readers/projections
  -> optional destinations: GTM/GA/HubSpot activity/BigQuery

Form submit
  -> POST /api/public/growth/forms/{slug}/submit
  -> form_submission + consent snapshot + destination attempts
  -> reconciliation by submissionId/correlationId/sessionId
```

Public ingestion should be default OFF per host surface and event family. Initial rollout should be shadow-only: persist sanitized events and compare against `dataLayer` / server submissions before any dashboard or HubSpot activity write depends on it.

## 12. API And Full Parity

Future capability paths:

| Capability | Canonical primitive | First surface | Future parity |
| --- | --- | --- | --- |
| Ingest tracking event | `recordTrackingEvent` command | Public API `/api/public/growth/tracking/events` | CLI/smoke, host adapters. |
| Read funnel events | `readTrackingFunnel` reader | Admin/internal Product API | Nexa/MCP read, reporting UI. |
| Reconcile attribution | `resolveAttributionForSubmission` reader/command | Worker/admin route | HubSpot/BigQuery export. |
| Export events | `dispatchTrackingExport` command | Worker/runbook | BigQuery/GA/HubSpot destinations. |

No future UI should scrape GTM, parse browser snippets or query raw tables directly. Consumers read server-side readers/contracts.

## 13. Security, Abuse And Reliability

Future ingestion endpoint must include:

- per-surface origin allowlist or signed embed key;
- event schema allowlist per event type;
- payload size limits and scalar-only properties;
- rate limit by surface, session and IP hash;
- bot/noise posture for high-volume surfaces;
- consent/Do Not Track gate;
- idempotency/dedupe by event id;
- sanitized errors and no raw provider errors;
- reliability signals:
  - `growth.tracking.ingest_error_rate`;
  - `growth.tracking.consent_drop_rate`;
  - `growth.tracking.event_dedupe_rate`;
  - `growth.tracking.payload_rejected_rate`;
  - `growth.tracking.client_server_mismatch_rate`;
  - `growth.tracking.destination_export_failed`.

## 14. HubSpot Boundary

The HubSpot `leadin` plugin and HubSpot scripts remain read-only in every V1 option.

Allowed:

- inventory script/plugin presence;
- compare HubSpot form/event outcomes against Greenhouse submissions;
- use `hubspotutk` as attribution context when consent permits;
- send bounded form submission context through the existing server-side HubSpot destination adapter;
- propose future HubSpot activity timeline export as a separate governed destination task.

Forbidden:

- patching, forking or monkey-patching `leadin`;
- treating HubSpot cookie as person identity proof;
- exposing HubSpot form GUIDs/property names in browser tracking events;
- writing HubSpot activities directly from browser analytics;
- making HubSpot the only path to answer Greenhouse operational questions.

## 15. Reconciliation Rules

| Question | Reconciliation source |
| --- | --- |
| Did the visitor see/start the form? | Browser tracking event, optional analytics. |
| Did Greenhouse accept the submission? | `form_submission.status='accepted'`. |
| Did HubSpot receive it? | `form_destination_attempt` / adapter outcome. |
| Which campaign influenced it? | Derived attribution touches joined by session/correlation/submission. |
| Is the lead qualified? | Growth/Commercial handoff command, not browser event. |

Mismatch is expected and should be observable:

- browser event without submission = abandoned or blocked submit;
- submission without browser event = JS blocked / API direct / measurement degraded;
- submission delivered but no HubSpot cookie = accepted lead with degraded attribution;
- HubSpot event without Greenhouse submission = legacy embed or plugin path still active.

## 16. Implementation Breakdown

Do not register these as formal `TASK-###` files until operator approval. Suggested sequence:

1. **Tracking ingestion foundation** (`backend-data`, `api/db/command`): schema, contracts, public ingestion command, privacy filters, dedupe, default-OFF flags, focal tests.
2. **Host adapters and renderer bridge** (`backend-data` or split with UI if visible): WordPress/Astro event adapter using the same event envelope, no plugin `leadin` edits.
3. **Attribution reconciliation** (`backend-data`, `reader/sync`): readers that join tracking events to Growth Forms submissions, HubSpot context and UTM first/last touches.
4. **Destination/export adapters** (`backend-data`, `integration/sync`): BigQuery export first, then optional GA/HubSpot activity export after evidence.
5. **Reporting/readers** (`ui-ux` after backend): Growth funnel/attribution surfaces consuming readers, not raw event tables.

Dependencies:

- Coordinate with `TASK-1258`, `TASK-1259`, `TASK-1261` and `TASK-1264` because Growth Forms migration changes where form events originate.
- Reuse Growth Forms telemetry policy and surface registry patterns.
- Privacy/legal review required before enabling cookies or server collection in production.

## 17. Self-Critique

### What breaks in 12 months?

Event taxonomy sprawl. Mitigation: event registry, event-family ownership and publication review before new event names ship.

### What breaks in 36 months?

Warehouse and CRM destinations may outgrow Postgres-only operational storage. Mitigation: keep the event envelope stable and make BigQuery export a destination, not a rewrite.

### Cognitive debt risk

Tracking systems become folklore quickly. Mitigation: one envelope, one ingestion command, explicit examples, and no hidden GTM-only business logic.

### Lock-in

GTM/GA and HubSpot remain useful but non-authoritative. The Greenhouse event envelope is the anti-lock-in boundary.

### Observability gap

The dangerous silent failure is client measurement disappearing while submissions still work. Mitigation: `client_server_mismatch_rate` and measurement-degraded events by surface.

### AI-specific risk

Future Nexa answers about attribution must cite Greenhouse readers and confidence, not infer from raw events or CRM-only data.

### Regional / compliance gap

Chile/LATAM privacy posture requires explicit consent, retention, deletion/export path and no unnecessary PII in analytics. Legal review is a launch gate for cookies/server collection.

## 18. Revisit When

Revisit this draft when:

- `TASK-1258/1259/1264` cut over the first production Growth Form embed;
- legal/privacy signs off or rejects first-party tracking cookies;
- BigQuery export becomes necessary for volume/reporting;
- HubSpot changes tracking/forms APIs materially;
- public site migrates from WordPress/Kinsta to Astro/Vercel for the target surfaces.

