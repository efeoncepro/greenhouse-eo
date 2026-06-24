# Greenhouse Growth Public Forms Engine Decision V1

## Status

Accepted direction — no runtime changes yet.

This ADR authorizes architecture and planning for a Greenhouse-owned public forms engine in the `growth` domain. It does not authorize implementation tasks, schema migrations, public endpoints, HubSpot property changes, production deployment, WordPress/Astro plugin release, or live submissions. Those require explicit follow-up tasks and operator approval.

## Date

2026-06-24

## Owner

Product / Platform Architecture / Growth / Marketing Operations / GTM

## Scope

- Public lead-capture and lead-magnet forms for Efeonce public surfaces.
- Greenhouse `growth` domain ownership for form definitions, versions, rendering contract, submissions ledger, consent snapshots and destination attempts.
- Portable renderer strategy for Astro, WordPress and other public runtimes.
- HubSpot Forms submission adapter, starting with the currently supported v3 secure submit endpoint.
- Future migration posture for a date-versioned HubSpot submission endpoint if/when HubSpot ships one.

Out of scope for this ADR:

- Implementing the admin UI or renderer package.
- Creating HubSpot forms/properties/workflows.
- Replacing all existing public forms immediately.
- Sending highly sensitive data through public forms.
- Autonomous creation of deals, quotes or commercial workflows.

## Reversibility

Two-way but slow.

Before runtime implementation, reversal only requires archiving this ADR/spec. After public forms launch, reversal requires disabling embeds, preserving or deleting submissions according to retention policy, removing HubSpot workflow dependencies, migrating existing Astro/WordPress consumers and keeping attribution history explainable.

## Confidence

Medium-high.

The architecture uses established Greenhouse patterns: Full API Parity, server-side commands/readers, audit/outbox, idempotency, public-site boundary discipline, HubSpot bridge discipline, feature flags and reliability signals. Confidence is not high until the first HubSpot secure-submit smoke, consent/legal copy, spam controls and one WordPress + one Astro embed are verified.

## Validated as of

2026-06-24.

External sources validated:

- HubSpot 2026-03 API reference overview: `https://developers.hubspot.com/docs/api-reference/latest/overview`
- HubSpot Legacy API reference overview: `https://developers.hubspot.com/docs/api-reference/legacy/overview`
- HubSpot 2026-09-beta Forms API guide: `https://developers.hubspot.com/docs/api-reference/2026-09-beta/marketing/forms/guide`
- HubSpot Create Form endpoint: `https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/create-form`
- HubSpot Forms secure submit endpoint: `https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated`
- HubSpot Forms unauthenticated submit endpoint: `https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-unauthenticated`
- HubSpot Sensitive Data docs referencing secure Forms submission: `https://developers.hubspot.com/docs/api-reference/latest/crm/properties/sensitive-data`
- HubSpot CRM Contacts API 2026-03: `https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide`
- HubSpot Consent banner API: `https://developers.hubspot.com/docs/api-reference/latest/account/settings/consent-banner/consent-banner-api`

Repo context validated:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/context/02_gtm.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`

## Context

Efeonce needs consistent, portable public forms across lead magnets, public website pages, Astro routes, WordPress pages and future public acquisition surfaces. The previous direction of embedding HubSpot forms directly creates two problems:

- without Marketing Pro, HubSpot embed styling cannot be shaped enough to preserve Efeonce brand quality;
- form behavior, hidden fields, destination mapping and campaign logic drift into hardcoded page/runtime snippets.

At the same time, HubSpot must remain the CRM destination for contacts, companies, lifecycle, owner, campaign attribution and commercial motion. Replacing HubSpot with a custom CRM is not the problem. The problem is that HubSpot should not own the public form renderer or the Greenhouse submission contract.

HubSpot's API posture is nuanced. The Forms definition API has a date-versioned beta path for 2026-09 (`/marketing/forms/2026-09-beta`) and the same behavior as the older `/marketing/v3/forms` path. However, as of 2026-06-24, the form submission endpoints documented for sending data to a HubSpot form are still the v3 Forms Submission endpoints under `api.hsforms.com`, including the authenticated secure submit endpoint. HubSpot also references that secure endpoint from latest docs for Sensitive Data use cases. That means Greenhouse should use the supported submission endpoint, but isolate it behind an adapter so a future date-versioned submission endpoint can replace it without changing public sites.

This is a Growth domain capability because it controls top-of-funnel lead capture, lead magnets, consent, attribution and pre-pipeline conversion. The public site hosts forms; `commercial` receives qualified handoffs later; HubSpot receives CRM submissions. Growth owns the form engine and submissions ledger.

Terminology:

- **Host surface / render surface**: where the form is displayed. Initial surfaces are Efeonce public site on WordPress, future Efeonce public site on Astro, and Greenhouse itself on Next.js for preview/internal usage. These are consumers of the render contract.
- **Destination**: where accepted submission data is delivered after Greenhouse validation/routing, e.g. HubSpot Forms, HubSpot Contacts, Greenhouse-only ledger, internal notification or future handoff adapters.
- **Surface adapter**: a thin integration package for a host surface. It must not own form definitions, destination mappings, consent policy or submissions.

## Decision

Greenhouse will own a portable **Growth Public Forms Engine**. Public sites will render Greenhouse-authored forms and submit to Greenhouse public submission endpoints. Greenhouse validates, normalizes, records, audits and routes submissions to configured destinations. HubSpot is a destination adapter, not the form renderer or source of truth for the form engine.

The engine will model every published form as an operational contract, not only a field list:

```text
formKind + riskProfile + dataClasses + consentPolicy + destinationPolicy + persistencePolicy + successBehavior
```

This means a newsletter subscription, lead magnet, quote request, diagnostic intake, pricing simulation, document upload, preference update and application form can share renderer infrastructure while enforcing different storage, review, security and handoff rules.

V1 will use HubSpot's authenticated Forms secure submit endpoint as the HubSpot destination implementation:

```text
POST https://api.hsforms.com/submissions/v3/integration/secure/submit/{portalId}/{formGuid}
```

The adapter must be explicitly labeled as:

```text
provider: hubspot
adapterKind: forms_submission
adapterVersion: hsforms-v3-secure-submit
endpointStatus: legacy_supported
migrationTarget: date_versioned_forms_submission_api_when_available
```

No Astro component, WordPress plugin, public landing, lead magnet or renderer may call HubSpot submission endpoints directly. Public consumers call Greenhouse:

```text
POST /api/public/growth/forms/{formSlug}/submit
```

The backend must act as a **policy compiler and submission orchestrator**, not as a thin submit proxy. Greenhouse compiles a published form version into a bounded browser-safe render contract, validation contract, success behavior and destination plan. The UI may be conditional, but it is conditioned by form purpose and policy (`formKind`, `riskProfile`, `dataClasses`, `destinationPolicy`, `successBehavior`), not by a public runtime checking whether the destination is HubSpot, email, Greenhouse-only or a future adapter.

Destinations contribute constraints to the compiler; they do not own the experience. For example, HubSpot field names and consent payloads stay server-side in destination mapping, while the public renderer receives only safe field keys, labels, validation hints, state rules and success behavior.

The first host surface is the current Efeonce public site on WordPress. The renderer must still be surface-agnostic from day one because the target public-site runtime is Astro and Greenhouse itself is Next.js. The portable core should therefore be a framework-light renderer, preferably a Web Component/custom element with thin wrappers:

- WordPress shortcode/block/plugin wrapper that enqueues a pinned renderer bundle and emits the custom element;
- Astro component wrapper around the same custom element;
- Greenhouse Next.js wrapper/preview using the same render contract and, when possible, the same renderer core.

The portable renderer core must not depend on React, Next.js, WordPress globals, Astro runtime APIs or HubSpot scripts. Host-specific wrappers may adapt loading, CSP, nonce, asset enqueue, preview fixtures and local design-token injection, but they must not change behavior.

The default renderer is an in-page Web Component/custom element, not an iframe. Public forms must be measurable from the host page's GTM container and `window.dataLayer`, so the renderer emits browser-safe `CustomEvent` and optional parent-page `dataLayer.push()` events under the published `telemetryPolicy`. Iframe embedding is only an explicit fallback for hostile/restricted hosts; it must be marked as degraded measurement and use an allowlisted `postMessage` bridge without raw field values or PII.

Greenhouse preserves the HubSpot attribution contract by collecting and forwarding allowed context such as `hutk`, `pageUri`, `pageName`, consent options and campaign metadata. When the goal is only to update CRM records without a form-submission event, a separate CRM Contacts adapter may use the 2026-03 Contacts API, but that is not the primary lead-capture path.

## Alternatives considered

### Alternative A: Continue embedding HubSpot forms directly

Rejected. This is fastest, but it leaves styling constrained by HubSpot plan limits and scatters hidden fields, behavior, consent and campaign mappings across public surfaces. It weakens Efeonce brand consistency and gives Greenhouse no durable submissions ledger.

### Alternative B: Submit directly from public sites to HubSpot Forms API

Rejected as the primary architecture. It preserves some attribution, but it exposes the form engine to every runtime and creates per-site coupling to HubSpot endpoint details. It also makes spam control, consent audit, idempotency, retry policy and destination routing inconsistent.

### Alternative C: Use HubSpot CRM Contacts API only

Rejected for lead-capture forms. The Contacts API is current and useful for CRM upsert, but it does not naturally represent HubSpot form-submission history, inline form behavior, form workflows or Forms API consent semantics. It can be a secondary adapter for enrichment/upsert, not the default form destination.

### Alternative D: Build a standalone forms service outside Greenhouse

Rejected. It would duplicate auth, secrets, audit, consent, HubSpot integration, reliability, admin UI and public-site governance. Greenhouse is already the operating control plane.

### Alternative E: Wait for a future date-versioned HubSpot submission endpoint

Rejected. There is a current business need and no authoritative date-versioned submission endpoint validated as available on 2026-06-24. Waiting would keep the embed/hardcode problem alive. The adapter boundary makes the current endpoint replaceable later.

### Alternative F: Make WordPress or Astro own form definitions locally

Rejected. Runtime-local definitions would recreate drift. WordPress and Astro should be render/host consumers. Greenhouse owns form definitions, versions, validation, consent and destinations.

### Alternative G: Make the UI destination-driven

Rejected. A renderer that shows fields or changes behavior because `destination === hubspot` leaks vendor coupling into the public surface. Destination constraints are real, but they must be compiled server-side into policy-safe render contracts. Public UI reacts to purpose and policy; backend adapters react to provider details.

### Alternative H: Build a WordPress-native form plugin first and port later

Rejected. WordPress is the first host surface, but it is not the long-term runtime target. A WordPress-native engine would repeat the current coupling problem and make the Astro migration harder. WordPress should get a thin surface adapter around the portable renderer core.

### Alternative I: Build separate native renderers for Next.js, WordPress and Astro

Rejected for V1. Native wrappers are acceptable, but separate renderer implementations would create UX, validation, accessibility and analytics drift. The render contract should have one portable renderer core and surface-specific wrappers.

### Alternative J: Use iframe embeds as the default portable renderer

Rejected for V1. Iframes simplify isolation, but they make GTM/dataLayer measurement, DOM-level accessibility, responsive behavior, styling and attribution harder on the public site. The default is host-DOM rendering through a Web Component/custom element. Iframes remain a fallback only when a host cannot safely run the renderer in-page.

## Consequences

### Positive

- Efeonce controls brand, UX, copy, states and accessibility for all public forms.
- A single Greenhouse form definition can render in Astro, WordPress and future surfaces.
- The current WordPress public site can be the first host surface without becoming the form engine.
- The future Astro migration can reuse form definitions and render contracts instead of replatforming forms.
- Greenhouse Next.js can preview/test forms with the same contract used by public surfaces.
- Submissions become governed evidence with audit, consent snapshots and retryable destination attempts.
- HubSpot attribution is preserved without coupling public runtimes to HubSpot internals.
- Conditional UI, multi-step behavior and success states become portable because they are compiled from Greenhouse policy, not hardcoded per destination.
- New destinations can be added later without changing embeds.
- Growth gains durable acquisition memory before commercial handoff.

### Negative

- Greenhouse becomes responsible for spam protection, rate limits, uptime, consent audit and submission delivery.
- The first implementation must handle public attack surface risk, not only internal portal behavior.
- The HubSpot adapter starts on a numeric-versioned endpoint labeled legacy by HubSpot docs.
- Operators need a form lifecycle/admin surface; otherwise form governance drifts back into code.
- The renderer package now has a compatibility burden across WordPress, Astro and Next.js.

### Neutral / contextual

- HubSpot remains CRM source of truth, not renderer source of truth.
- The legacy endpoint is acceptable only because it is isolated behind a destination adapter and still officially documented.
- The renderer may be distributed as a Web Component, Astro wrapper and WordPress shortcode/plugin, but all consume the same published form contract.
- Measurement is a renderer contract, not an afterthought: parent-page GTM/dataLayer events and Greenhouse server-side conversion ledger must be reconciled by form/version/surface.

## Runtime contract

Future implementation must follow these rules:

- Domain placement: `growth`.
- Future TypeScript root: `src/lib/growth/forms/`.
- Future PostgreSQL schema: `greenhouse_growth`.
- Public API family: `/api/public/growth/forms/**`.
- Admin API/UI family: `/api/admin/growth/forms/**`, `/admin/growth/forms`.
- Capability prefix: `growth.forms.*`.
- Event prefix: `growth.forms.*`.
- Signal prefix: `growth.forms.*`.
- Contract prefix: `greenhouse-growth-public-forms-*`.

Required server-side primitives:

- form definition reader;
- published form renderer contract reader;
- form policy compiler;
- render contract compiler;
- host surface registry / embed key verifier;
- submission validator;
- consent snapshot builder;
- destination router;
- HubSpot Forms secure-submit adapter;
- destination attempt retry/reconciliation;
- submissions ledger reader;
- form lifecycle command set.

Full API parity is a birth requirement, not a follow-up cleanup. The engine must be operable through governed programmatic contracts before or alongside any UI/wrapper surface:

- Public render/submit APIs are the contract for anonymous/public host surfaces.
- Admin author/review/publish/destination/retry actions are Product API + command/readers, not admin UI-only behavior.
- Nexa and future MCP/app/ecosystem consumers use the same commands/readers; writes follow `propose -> confirm -> execute`.
- CLI/runbook/smoke tooling uses the same public/admin/programmatic contracts, not private backdoors.
- WordPress, Astro and Greenhouse Next.js wrappers are clients of the render/submit contract, not privileged alternate implementations.

Parity completion is evaluated at business capability level:

| Capability | Canonical primitive | Required consumers |
| --- | --- | --- |
| Read published form contract | Published form reader / policy compiler | Web Component, WordPress, Astro, Greenhouse preview, verification harness. |
| Submit public form | Submission command | Public hosts, smoke/contract tests, future public apps. |
| Author draft form | Form author command + draft reader | Admin UI, Nexa/MCP planned path, CLI/runbook. |
| Review/publish form version | Review/publish commands | Admin UI, Nexa propose-confirm-execute, CLI/runbook. |
| Manage host surfaces | Surface registry commands/readers | Admin UI, public-site migration tooling, CLI/runbook. |
| Manage destinations | Destination commands/readers | Admin UI, Nexa propose-confirm-execute, CLI/runbook. |
| Retry/dead-letter delivery | Delivery attempt commands/readers | Admin UI, ops runbook, Reliability workflows. |

No implementation slice should ship a visible form/admin workflow unless its canonical command/reader and proportional contract evidence exist.

Required aggregates:

- `form_definition`;
- `form_version`;
- `form_destination`;
- `form_submission`;
- `form_submission_consent_snapshot`;
- `form_destination_attempt`;
- `form_host_surface` / `form_embed_key` or equivalent public allowlist primitive.

Required policy fields on published versions:

- `form_kind`;
- `risk_profile`;
- `data_classification_json`;
- `destination_policy_json`;
- `ui_policy_json`;
- `success_behavior_json`;
- `consent_policy_version`;
- `retention_policy`;
- `analytics_policy_json`;
- `upload_policy` when file fields exist;
- `commercial_handoff_policy` when the form can lead to revenue motion.

Canonical initial `form_kind` values:

- `subscribe`;
- `lead_magnet`;
- `contact`;
- `diagnostic_intake`;
- `quote_request`;
- `pricing_simulation`;
- `document_upload`;
- `event_registration`;
- `survey`;
- `preference`;
- `application`.

Required form lifecycle:

```text
draft -> review -> published -> deprecated -> archived
```

Published versions are immutable. Editing a live form creates a new version.

Publication must freeze the compiled contract:

- field schema;
- validation rules;
- conditional visibility/requiredness rules;
- copy/legal/consent references;
- destination constraints;
- success behavior;
- renderer compatibility target.

Required submission lifecycle:

```text
received -> validated -> accepted -> routed -> delivered
received -> rejected
accepted -> routed -> destination_failed -> retrying -> delivered
accepted -> routed -> destination_failed -> dead_letter
```

## HubSpot adapter contract

The HubSpot Forms adapter must accept a canonical Greenhouse submission and map it to HubSpot's Forms submission body:

- `fields[]` with allowed HubSpot property names;
- `submittedAt`;
- `context.hutk` from `hubspotutk` when present and consent permits;
- `context.pageUri`;
- `context.pageName`;
- optional campaign fields supported by the form/destination;
- `legalConsentOptions` when configured.

Rules:

- The browser never receives HubSpot private app tokens.
- Prefer secure submit from Greenhouse server-side for V1.
- The unauthenticated CORS submit endpoint is allowed only as a break-glass or explicitly documented low-risk mode, not the default.
- Do not use `skipValidation` as a normal bypass; HubSpot marks it deprecated.
- The adapter records request id, destination form id, outcome, retry count and sanitized error class.
- The adapter does not create deals, quotes or commercial records directly.
- CRM Contacts API 2026-03 is a separate adapter for enrichment/upsert, not a replacement for form-submission history.

Business action boundaries:

- `quote_request` creates a handoff candidate, not a formal quotation.
- `pricing_simulation` can use only public-safe simulation primitives and never exposes costs, margins or internal rate cards.
- `document_upload` stays Greenhouse-only until file scan/review passes; HubSpot receives metadata or reviewed summary by default, not raw files.
- `diagnostic_intake` can create a Growth diagnostic run candidate; risky report sync requires quality/review policy.
- `preference` uses a canonical consent/preference path, not a generic lead form.

## Security and compliance posture

Public forms are an internet-facing write surface. V1 must include:

- server-side validation with a strict field allowlist per form version;
- field-level data classification;
- per-form and per-IP/user-agent rate limits;
- bot/honeypot and a provider-agnostic challenge slot if needed;
- idempotency key or dedupe fingerprint for accidental retries;
- allowlisted embed origins or public embed keys;
- sanitized errors with no HubSpot payload leakage;
- no secrets in browser bundles;
- structured audit for accepted/rejected submissions;
- consent text/version snapshot per accepted submission;
- retention policy for raw submission payloads and destination attempts;
- delete/export posture for personal data requests.
- malware scan, quarantine, tokenized access and retention policy for any upload form.

Data classification:

- email, phone, name and free-text lead notes: restricted/confidential;
- company/website/campaign metadata: confidential until intentionally public;
- consent snapshot: audit evidence;
- spam/debug metadata: internal operational evidence with bounded retention.

The system must not collect highly sensitive data in V1. Any future sensitive-data form requires a separate review of HubSpot scopes, storage, encryption, consent and retention.

## Observability

Initial signal families:

- `growth.forms.submission_error_rate`;
- `growth.forms.validation_rejection_rate`;
- `growth.forms.destination_failure_rate`;
- `growth.forms.hubspot_submit_failed`;
- `growth.forms.consent_missing_rate`;
- `growth.forms.spam_rejection_rate`;
- `growth.forms.dead_letter_count`;
- `growth.forms.renderer_contract_stale`.

Every submission and destination attempt should carry:

- form id/version;
- destination id/version;
- request id/correlation id;
- embed surface/runtime (`astro`, `wordpress`, `greenhouse`, `other`);
- page URI/domain;
- destination outcome;
- sanitized error class;
- latency and retry count.

## Revisit when

Reopen this ADR if:

- HubSpot ships a stable date-versioned Forms submission endpoint.
- HubSpot deprecates or announces end-of-life for `hsforms` v3 secure submit.
- Efeonce upgrades HubSpot Marketing tier and direct embedded forms become brand-controllable enough to reconsider.
- Public forms need to collect sensitive/highly sensitive data.
- Another CRM becomes a first-class destination.
- Form submissions become high-volume enough that Greenhouse needs a dedicated ingestion service instead of Next.js/API route primitives.
- Legal/privacy review requires a different consent or retention model.

## Related documents

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/context/02_gtm.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/11_hubspot-bowtie.md`
