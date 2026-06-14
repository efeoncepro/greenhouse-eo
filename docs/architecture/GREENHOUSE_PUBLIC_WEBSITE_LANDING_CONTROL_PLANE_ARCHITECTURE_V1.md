# Greenhouse Public Website Landing Control Plane Architecture V1

> Tipo de documento: arquitectura de producto/plataforma
> Status: Proposed; implementation gated per `EPIC-019`
> Version: V1
> Fecha: 2026-06-13
> Owner: Product / Platform Architecture / Marketing Operations
> ADR: `GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
> WordPress skills: official `WordPress/agent-skills` vendored under `.codex/skills/*` and `.claude/skills/*`
> React/Interactivity update: WordPress Developer Blog / Make Core review on 2026-06-14

## 1. Purpose

This document defines the target architecture for Greenhouse to govern Efeonce public website landing pages on WordPress/Kinsta.

It does not ship runtime by itself. It gives `EPIC-019` and future `TASK-###` slices a durable contract:

```text
Greenhouse owns landing operations. WordPress serves the public page. Kinsta operates the hosting runtime. HubSpot owns CRM attribution.
```

## 2. Product Thesis

The Efeonce public website is not just a brochure. It is an acquisition and expansion surface in the ASaaS flywheel. Greenhouse should connect that surface to campaign operations, HubSpot motion, Account 360, Pulse, revenue attribution and eventually Nexa recommendations.

The target capability is:

```text
compose -> review -> preview -> approve -> publish -> verify -> measure -> learn
```

Greenhouse should not become a freeform website builder in V1. It should become a governed landing operations control plane.

## 3. Archetype

Primary archetype: **Internal tool / admin**.

Dominant risk: state-changing actions against a public production website require RBAC, approval, audit and rollback.

Secondary archetypes:

- **Headless content site**: WordPress content schema, SEO, preview and cache invalidation matter.
- **B2B SaaS multi-tenant**: Greenhouse tenancy/access rules still apply internally, even if V1 targets the Efeonce operating entity.
- **Real-time/event-driven**: webhooks/outbox are needed for drift, deployment status and future conversion events.
- **Agentic AI system**: future Nexa generation is advisory/draft only until deterministic publication is reliable.

## 4. System Context

```mermaid
flowchart LR
  Operator["Efeonce operator"]
  Greenhouse["Greenhouse"]
  WPBridge["greenhouse-wp-bridge plugin"]
  WordPress["WordPress site efeoncepro.com"]
  Kinsta["Kinsta API"]
  HubSpot["HubSpot"]
  Analytics["GA4 / Search Console / analytics sources"]
  Visitor["Public visitor"]

  Operator --> Greenhouse
  Greenhouse --> WPBridge
  WPBridge --> WordPress
  Greenhouse --> Kinsta
  Greenhouse --> HubSpot
  Analytics --> Greenhouse
  Visitor --> WordPress
  WordPress --> HubSpot
```

## 5. Container View

```mermaid
flowchart TB
  subgraph GH["Greenhouse"]
    UI["Internal Web Presence / Landing Ops UI"]
    Commands["Landing commands"]
    Readers["Landing readers"]
    Registry["Template registry"]
    Store["Postgres records: manifests, versions, deployments, drift, audit"]
    Worker["Sync / publish worker"]
    Signals["Reliability signals"]
  end

  subgraph WP["WordPress / Kinsta"]
    Plugin["greenhouse-wp-bridge"]
    WPRest["WordPress REST API"]
    Theme["Theme/templates/blocks"]
    KAPI["Kinsta API"]
  end

  UI --> Readers
  UI --> Commands
  Commands --> Store
  Commands --> Registry
  Commands --> Worker
  Worker --> Plugin
  Plugin --> WPRest
  Plugin --> Theme
  Worker --> KAPI
  Worker --> Signals
  Readers --> Store
```

## 6. Ownership Model

### 6.1 Public Website Object Modes

| Mode | Meaning | Allowed writes from Greenhouse |
| --- | --- | --- |
| `greenhouse_owned` | Greenhouse created and governs the object. | Yes, through commands and approvals. |
| `wordpress_owned` | Native WordPress editorial object. | No; observe only. |
| `hybrid_observed` | Greenhouse tracks object but does not fully own it. | Limited; task-specific. |

Default for campaign landing pages: `greenhouse_owned`.

Default for existing institutional pages and blog content: `wordpress_owned` until explicitly migrated.

### 6.2 Source of Truth Boundaries

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Landing manifest | Greenhouse | JSON/typed contract, versioned. |
| Landing lifecycle | Greenhouse | Draft/review/approve/publish/archive. |
| Published page html/runtime | WordPress | Rendered via template/blocks controlled by bridge. |
| Hosting operations | Kinsta | Cache, staging, backups, environment status. |
| Conversion CRM lifecycle | HubSpot | Forms, meetings, contacts, deals. |
| Performance analytics | Analytics sources | Ingested/read by Greenhouse for reporting. |

## 7. Landing Manifest Contract

The manifest is the durable Greenhouse artifact. It should be renderer-independent enough to survive a future WordPress replacement.

Minimum shape:

```ts
type PublicWebsiteLandingManifestV1 = {
  contractVersion: 'public-website-landing.v1'
  landingId: string
  ownershipMode: 'greenhouse_owned'
  templateKey: string
  locale: 'es-CL' | 'en-US' | 'pt-BR'
  slug: string
  title: string
  seo: {
    title: string
    description: string
    canonicalUrl?: string
    indexPolicy: 'index' | 'noindex'
    openGraphImageAssetId?: string
    structuredDataKind?: string
  }
  attribution: {
    campaignId?: string
    hubspotCampaignId?: string
    buyerPersona?: string
    serviceKey?: string
    primaryCtaKind: 'hubspot_form' | 'hubspot_meeting' | 'external_url' | 'greenhouse_capture'
    primaryCtaTarget: string
  }
  sections: LandingSection[]
  legalAndBrand: {
    claimsReviewed: boolean
    caseStudyConsentRef?: string
    logoUsageRefs?: string[]
  }
}
```

V1 hard rules:

- No arbitrary script injection.
- No raw unreviewed HTML as the default authoring model.
- No public claims without review state.
- No direct use of private Greenhouse data in public copy.
- No client logos/case studies without consent reference.

## 8. Template Strategy

V1 should ship with governed templates, not a blank canvas.

Candidate templates:

| Template | Purpose |
| --- | --- |
| `service_landing` | A service/capability landing page. |
| `campaign_landing` | Paid/inbound campaign page. |
| `case_study` | Public success story with consent gates. |
| `lead_magnet` | Download/resource capture. |
| `event_webinar` | Event registration. |
| `abm_account` | Account-specific landing, internal review required. |

Each template defines:

- allowed sections;
- required fields;
- SEO defaults;
- CTA contract;
- HubSpot attribution fields;
- preview requirements;
- publish blockers.

## 9. WordPress Bridge Plugin

The bridge plugin is the contract boundary between Greenhouse and the public WordPress runtime.

Responsibilities:

- Register a private REST namespace, e.g. `/wp-json/greenhouse/v1/*`.
- Register WordPress Abilities API abilities for Greenhouse landing operations when the runtime supports it.
- Verify requests from Greenhouse.
- Accept a rendered/normalized landing payload from Greenhouse.
- Create/update WordPress pages as draft/published.
- Attach metadata:
  - `greenhouse_landing_id`
  - `greenhouse_revision_id`
  - `greenhouse_deployment_id`
  - `greenhouse_ownership_mode`
  - `greenhouse_content_hash`
- Apply WordPress template, custom fields and SEO metadata through the active site stack.
- Expose preview and status endpoints.
- Emit webhook or polling-friendly status for out-of-band edits.
- Provide a health endpoint with plugin/theme compatibility information.

Non-responsibilities:

- It does not own Greenhouse business logic.
- It does not call Greenhouse tables directly.
- It does not decide campaign attribution.
- It does not authorize Greenhouse users; Greenhouse authorizes before calling it.

### 9.1 Abilities-First Contract

The bridge should expose operations through shared services with two adapters:

```text
Greenhouse request
  -> bridge auth/signature verification
  -> bridge service
  -> WordPress page/template/metadata operation

WordPress ability execution
  -> ability permission callback
  -> same bridge service
  -> WordPress page/template/metadata operation
```

This keeps REST, Abilities API and future MCP Adapter exposure aligned.

Candidate abilities:

| Ability | Mutates? | Purpose |
| --- | --- | --- |
| `greenhouse/report-bridge-health` | No | Confirm plugin/theme/API compatibility. |
| `greenhouse/list-landing-templates` | No | Return templates accepted by the WordPress runtime. |
| `greenhouse/get-landing-status` | No | Read current WordPress state for a Greenhouse landing. |
| `greenhouse/create-landing-draft` | Yes | Create a draft page from a Greenhouse deployment payload. |
| `greenhouse/update-landing-draft` | Yes | Update a draft page/revision before production publish. |
| `greenhouse/publish-landing` | Yes | Publish an approved draft/revision. |
| `greenhouse/detect-landing-drift` | No | Compare stored metadata/hash with current WordPress state. |

Ability hard rules:

- Register with `wp_register_ability()` inside `wp_abilities_api_init` when available.
- Use precise input/output JSON schemas.
- Permission callbacks must be narrower than "authenticated user can do anything."
- Mutating abilities must require a correlation id from Greenhouse and must write an audit/deployment trace.
- If WordPress runtime is below the required Abilities API version, the bridge degrades to REST-only and reports that state in health.

### 9.2 Required Official WordPress Skills

Any task implementing or auditing the bridge must load the official WordPress Agent Skills vendored for both agents:

- `wordpress-router`
- `wp-project-triage`
- `wp-plugin-development`
- `wp-rest-api`
- `wp-abilities-api`
- `wp-abilities-audit`
- `wp-abilities-verify`
- `wp-block-development` when blocks/templates are involved
- `wp-wpcli-and-ops` when WP-CLI/cache/staging/ops are involved
- `wp-performance` before production publish paths are enabled

### 9.3 React, Gutenberg and Interactivity Boundary

WordPress can work with React, but the Greenhouse public-site strategy must use React in the WordPress-native lanes instead of turning `efeoncepro.com` into a second SPA.

Validated official signals as of 2026-06-14:

- WordPress Developer Blog, "What's new for developers? (June 2026)": WordPress 7.0 is out, Gutenberg 23.2/23.3 shipped developer-facing updates, React 19 compatibility is a watch item, Abilities API refinements continue, and Playground is the recommended test surface for current Gutenberg/WordPress behavior.
- Make/Core, "React 19 upgrade temporarily reverted in Gutenberg" (2026-06-05): Gutenberg 23.3.0 briefly shipped the React 19 upgrade, then Gutenberg 23.3.2 reverted to React 18 because plugins built against the React 18 JSX runtime crashed under React 19. Core still intends to work toward React 19 for WordPress 7.1 through a more incremental strategy.
- WordPress Interactivity API reference, updated 2026-06-11: the Interactivity API is bundled in WordPress Core from 6.5, uses `@wordpress/interactivity`, `viewScriptModule`, `data-wp-*` directives and block-level stores for frontend interactions in blocks.

Implication for Greenhouse:

| Layer | Recommended use | Not recommended in V1 |
| --- | --- | --- |
| Greenhouse control plane | Next.js/Greenhouse owns landing manifests, approvals, previews, publish commands, audit and drift. | Embedding WordPress admin React inside Greenhouse as the source of truth. |
| WordPress bridge plugin admin/editor tooling | React via WordPress packages such as `@wordpress/element`, Gutenberg blocks, SlotFills/DataViews/DataForm when needed. | Bundling a separate React runtime that conflicts with Gutenberg/Core. |
| WordPress public frontend | Server-rendered blocks/templates plus Interactivity API for scoped interactions, motion toggles, forms, filters, accordions or client-side navigation where safe. | A full React SPA rewrite of the public site or arbitrary React hydration across Elementor/Ohio pages. |
| Landing templates | Dynamic/server-rendered blocks and constrained template sections that can be authored from Greenhouse manifests. | Freeform raw HTML/JS or ungoverned Elementor automation as the default publish model. |

Hard rules:

- Treat React 19 in WordPress as a compatibility watch item until the target runtime proves support with the active plugins/theme.
- If the bridge ships compiled JSX, test it against the exact WordPress/Gutenberg runtime on Kinsta staging before production.
- Prefer WordPress-provided React abstractions (`@wordpress/element`, block editor packages) over direct `react`/`react-dom` imports inside the plugin.
- For public frontend interactivity, prefer the Interactivity API and server-rendered blocks over broad React hydration.
- Greenhouse remains the control plane. WordPress React/Gutenberg is an implementation surface for the WordPress runtime, not a new product source of truth.

## 10. Publishing Lifecycle

```mermaid
stateDiagram-v2
  [*] --> internal_draft
  internal_draft --> ready_for_review
  ready_for_review --> changes_requested
  changes_requested --> internal_draft
  ready_for_review --> approved
  approved --> wordpress_draft
  wordpress_draft --> preview_verified
  preview_verified --> publish_requested
  publish_requested --> published
  publish_requested --> publish_failed
  publish_failed --> approved
  published --> cache_cleared
  cache_cleared --> smoke_verified
  smoke_verified --> live
  live --> drifted
  drifted --> reconciled
  live --> archived
```

### Publish Preflight

Before production publish:

- actor has publish capability;
- approval is current;
- manifest has valid slug/SEO/CTA;
- required consent/review gates pass;
- WordPress bridge health is green;
- Kinsta target environment is known;
- preview exists and was verified;
- rollback target exists or backup policy is explicit.

### Post-Publish Verification

After publish:

- WordPress API confirms final status/URL;
- Kinsta cache clear operation is queued/completed or degraded explicitly;
- public URL returns expected status;
- canonical/metadata basics are visible;
- deployment record is immutable;
- failure state is operator-visible.

## 11. Drift Detection

Drift is first-class, not a surprise.

Drift inputs:

- WordPress page modified timestamp differs from Greenhouse deployment timestamp.
- Stored `greenhouse_content_hash` differs from current rendered content/hash.
- Greenhouse metadata missing from a page that claims Greenhouse ownership.
- SEO metadata diverges.
- Slug/URL changed outside Greenhouse.
- Page status changed outside Greenhouse.

Drift states:

- `in_sync`
- `drift_detected`
- `acknowledged`
- `reconciled_from_wordpress`
- `reapplied_from_greenhouse`
- `dismissed`

Greenhouse must never silently overwrite drifted public content without an explicit actor/action.

## 12. API and Commands

Full API Parity applies. UI buttons consume server-side commands; they are not the business logic.

Candidate command/readers:

| Contract | Purpose |
| --- | --- |
| `readPublicWebsiteInventory()` | WordPress/Kinsta observed inventory. |
| `readLandingManifest(id)` | Greenhouse source manifest and state. |
| `createLandingDraft(command)` | Create internal draft. |
| `updateLandingDraft(command)` | Update draft manifest. |
| `submitLandingForReview(command)` | Move to review. |
| `approveLanding(command)` | Approve current revision. |
| `publishLandingDraft(command)` | Create/update WordPress draft. |
| `publishLandingToProduction(command)` | Publish and clear cache. |
| `rollbackLandingDeployment(command)` | Restore previous known version. |
| `reconcileLandingDrift(command)` | Resolve drift explicitly. |

Potential route lanes:

- Internal app/admin lane for Greenhouse UI.
- Ecosystem lane only if future sister platforms or MCP need server-to-server access.
- MCP read-only tools only after deterministic readers exist.

WordPress-side abilities do not replace Greenhouse API parity. They are the WordPress runtime contract that Greenhouse commands call into. Greenhouse commands remain the product source of truth and authorization boundary.

## 13. Data Model Direction

Schema names are implementation-time decisions, but V1 should keep the model legible:

```text
public_website_landing_manifests
public_website_landing_revisions
public_website_landing_deployments
public_website_external_objects
public_website_drift_events
public_website_approval_events
public_website_audit_log
public_website_sync_runs
public_website_template_registry
```

Rules:

- Revisions are immutable once submitted/published.
- Deployments are immutable once attempted.
- Audit logs are append-only.
- External objects store WordPress/Kinsta ids and observed state; they are not the source of truth for Greenhouse-owned manifests.
- Idempotency keys are required for publish commands.

## 14. Kinsta Operations

Kinsta integration should start narrow:

- read site/environment status;
- read recent backups or backup availability;
- clear cache after publish;
- optionally publish first to staging if the environment contract is available;
- record Kinsta operation ids/results.

Destructive operations such as reset site, delete site, restore backup over production or push staging to live require separate task, explicit confirmation and likely an ADR delta.

## 15. HubSpot and Revenue Attribution

Each landing should be attributable from the start:

- campaign id or HubSpot campaign;
- service/capability being promoted;
- buyer persona / audience;
- CTA type and target;
- form/meeting id;
- expected conversion event.

Greenhouse should eventually connect:

```text
landing -> visit/conversion -> HubSpot contact/company/deal -> Account 360/Pulse -> revenue outcome
```

V1 may store metadata and link to HubSpot records without building the full analytics pipeline.

## 16. Nexa Posture

Nexa is not part of V1 publishing authority.

Allowed early:

- suggest missing SEO fields;
- flag stale content;
- propose copy variants as drafts;
- identify pages with traffic but weak conversion;
- summarize performance.

Not allowed in V1:

- publish autonomously;
- create claims without human review;
- edit WordPress directly;
- bypass approval;
- use private client data in public copy without consent and review.

Autonomy tier: `draft` at most, with human approval before publish.

## 17. Access and Security

Minimum access requirements:

- Internal-only route group for V1.
- Separate capabilities for read/create/review/publish/rollback/integration management.
- Dedicated WordPress technical user.
- Kinsta API credential stored as a secret.
- Bridge plugin shared secret or signed request verification.
- No secrets in logs, frontend bundles or docs.
- Audit log for every mutation.
- Approval requirement for production publish and rollback.
- Rate limiting on bridge endpoints.
- Sanitized errors from WordPress/Kinsta before showing in Greenhouse.

## 18. Observability

Minimum records:

- sync run logs;
- deployment records;
- external API call outcomes;
- drift events;
- reliability signals;
- redacted errors;
- Kinsta operation references.

Minimum signals:

| Signal | Kind | Steady state |
| --- | --- | --- |
| `public_website.wordpress_sync_failed` | integration | 0 sustained |
| `public_website.landing_publish_failed` | deployment | 0 sustained |
| `public_website.landing_drift_open` | drift | bounded and reviewed |
| `public_website.cache_clear_failed` | integration | 0 sustained |
| `public_website.preview_unverified` | release_gate | 0 before publish |

## 19. Rollout Sequence

1. **Discovery/read-only:** inspect WordPress/Kinsta, sync inventory, no writes.
2. **Bridge foundation:** plugin health/status, auth, Abilities API registrations, metadata, draft creation in safe target.
3. **Manifest/templates:** Greenhouse schema, template registry, preview generation.
4. **Draft publishing:** publish to WordPress as draft only; verify preview.
5. **Approval and production publish:** approval gate, publish, cache clear, smoke verification.
6. **Attribution:** HubSpot campaign/form/meeting linkage and basic reporting.
7. **Nexa advisory:** recommendations and draft copy after deterministic core is stable.

## 20. Non-Goals

- Replacing WordPress.
- Migrating the public website theme.
- Building a freeform page builder.
- Exposing landing creation to clients.
- Hosting public landing pages on Greenhouse/Vercel in V1.
- Automating destructive Kinsta operations in V1.
- Allowing Nexa to publish autonomously.
- Making WordPress the source of truth for Greenhouse-owned landings.

## 21. Open Questions Before Implementation

- What WordPress version is currently running on `efeoncepro.com`, and does it support Abilities API in production?
- Which WordPress theme/builder currently renders `efeoncepro.com`?
- Which SEO plugin is active and how does it expose metadata?
- Which forms/meeting embeds are canonical for HubSpot conversion?
- Does Kinsta staging mirror production closely enough for preview approval?
- Should the first template be `service_landing` or `campaign_landing`?
- Which internal role owns publish authority?
- What is the rollback standard: WordPress revision, Greenhouse previous manifest, Kinsta backup, or layered?

## 22. Related Docs

- `GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
