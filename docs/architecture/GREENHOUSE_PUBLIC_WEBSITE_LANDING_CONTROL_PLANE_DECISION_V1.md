# Greenhouse Public Website Landing Control Plane Decision V1

## Status

Proposed. Implementation is gated by `EPIC-019` child tasks and explicit operator acceptance.

## Date

2026-06-13

## Owner

Product / Platform Architecture / Marketing Operations

## Scope

- Greenhouse integration with the public Efeonce website at `efeoncepro.com`.
- WordPress content publishing for Greenhouse-owned landing pages.
- Kinsta hosting operations needed by publication workflows.
- HubSpot attribution handoff for campaign, form, meeting and deal context.
- Access, audit, drift detection and rollback boundaries for public-site operations.

## Reversibility

Two-way-but-slow.

The V1 pattern can be reversed by disabling the Greenhouse integration, revoking the WordPress and Kinsta service credentials, and leaving already published pages in WordPress. It is slow because landing manifests, approvals, attribution and deployment logs would become stranded Greenhouse records unless migrated or archived.

## Confidence

Medium-high.

The architecture uses boring integration primitives: WordPress REST API, a small WordPress bridge plugin, Kinsta API, Greenhouse server-side commands, audit logs and explicit publishing lifecycle. Confidence is not high until the current WordPress theme/builder/plugins on `efeoncepro.com` are inspected and a staging publish proves template compatibility.

## Validated As Of

2026-06-13.

External vendor capability claims were validated against official sources:

- WordPress REST API handbook: `https://developer.wordpress.org/rest-api/`
- WordPress Pages REST endpoint: `https://developer.wordpress.org/rest-api/reference/pages/`
- WordPress Application Passwords: `https://developer.wordpress.org/advanced-administration/security/application-passwords/`
- WordPress Abilities API handbook: `https://developer.wordpress.org/apis/abilities-api/`
- WordPress MCP Adapter developer article: `https://developer.wordpress.org/news/2026/02/from-abilities-to-ai-agents-introducing-the-wordpress-mcp-adapter/`
- Official WordPress Agent Skills repo: `https://github.com/WordPress/agent-skills`
- Kinsta API docs: `https://kinsta.com/docs/kinsta-api/`
- Kinsta API reference for cache clear: `https://api-docs.kinsta.com/api-reference/wordpress-site-tools/clear-site-cache`

Repo context validated against:

- `docs/context/00_INDEX.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/04_greenhouse-producto.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Context

Efeonce has a public WordPress website at `efeoncepro.com`, hosted on Kinsta. Greenhouse is the operational hub for Efeonce, and the business direction is ASaaS: software should create memory, transparency and switching cost.

Today the public website is commercially important but operationally separate from Greenhouse. Landing pages, campaigns, CTAs, forms, SEO metadata, HubSpot attribution and hosting operations can drift across WordPress, HubSpot, Kinsta and internal planning. That weakens the product flywheel: the website attracts demand, but Greenhouse does not yet govern the operational lifecycle or connect publication to account/revenue outcomes.

The requested capability is not merely "create a WordPress page." The product need is:

```text
Greenhouse can design, approve, deploy, verify and measure public landing pages on WordPress.
```

Because the capability writes to a public production site, the decision touches access, secrets, audit logs, rollback, SEO/AEO, HubSpot attribution, Kinsta operations and public brand governance. It therefore requires an ADR.

## Decision

Greenhouse should become the **control plane** for Efeonce public website landing pages, while WordPress remains the public CMS/runtime and Kinsta remains the hosting/runtime operations provider.

For Greenhouse-owned landing pages:

- Greenhouse is the source of truth for the landing manifest, lifecycle, approval state, deployment state, attribution metadata and audit trail.
- WordPress is the publication target and public runtime.
- Kinsta is the hosting operations target for cache/staging/backups/environment operations.
- HubSpot remains the CRM and conversion attribution system.
- Greenhouse reconciles drift when WordPress content changes outside the governed flow.

The V1 implementation should use a dedicated WordPress bridge plugin, tentatively `greenhouse-wp-bridge`, plus Greenhouse server-side connectors. Direct browser calls from Greenhouse UI to WordPress/Kinsta are not allowed.

The bridge should be **Abilities-first where available**:

- If the target WordPress runtime supports the WordPress Abilities API, the bridge must register Greenhouse landing operations as typed abilities with schema, descriptions and permission callbacks.
- REST endpoints may still exist as transport and compatibility paths, but they should delegate to the same underlying bridge services as the abilities.
- Abilities that can mutate public content must be narrow, permissioned and auditable.
- The architecture should stay compatible with the WordPress MCP Adapter direction, where registered abilities can become discoverable tools/resources/prompts for external agents.

## Runtime Contract

### Source of Truth

| Concern | Source of truth |
| --- | --- |
| Greenhouse-owned landing manifest | Greenhouse |
| Landing approval and deployment lifecycle | Greenhouse |
| Public page rendering/runtime | WordPress |
| Hosting environment/cache/backups | Kinsta |
| CRM campaign, form, meeting and deal attribution | HubSpot, referenced by Greenhouse |
| WordPress-owned editorial pages/posts | WordPress, observed by Greenhouse |

### Ownership Modes

Every observed public-site object must have one of these modes:

- `greenhouse_owned`: created by Greenhouse; edits are governed by Greenhouse.
- `wordpress_owned`: created/managed in WordPress; Greenhouse observes only.
- `hybrid_observed`: Greenhouse tracks and can suggest reconciliation, but WordPress edits remain allowed.

Campaign and paid/acquisition landing pages should default to `greenhouse_owned`.

### Required Capabilities

Capability keys are illustrative until a task creates the canonical catalog:

- `public_website.landing.read`
- `public_website.landing.create`
- `public_website.landing.review`
- `public_website.landing.publish`
- `public_website.landing.rollback`
- `public_website.hosting.read`
- `public_website.hosting.cache.clear`
- `public_website.integration.manage`

Publishing and rollback require stricter authorization than draft creation.

### WordPress Abilities Contract

The bridge should register abilities with namespaced IDs such as:

- `greenhouse/list-landing-templates`
- `greenhouse/get-landing-status`
- `greenhouse/create-landing-draft`
- `greenhouse/update-landing-draft`
- `greenhouse/publish-landing`
- `greenhouse/detect-landing-drift`
- `greenhouse/report-bridge-health`

Each ability must define:

- human-readable label and description;
- input and output schema;
- permission callback mapped to WordPress technical-user capability and bridge policy;
- audit/deployment correlation fields when mutating;
- `show_in_rest` only when the ability is safe to expose through the intended authenticated channel.

Greenhouse remains the source of truth for whether a human/operator is allowed to request the action. WordPress abilities enforce the WordPress-side boundary and make the runtime discoverable to tools/agents.

## Alternatives Considered

### Alternative A: Use WordPress admin only

Rejected.

This preserves current tooling, but it does not create Greenhouse memory, auditability, lifecycle governance, HubSpot/Account 360 linkage, or programmatic parity. It also keeps public-site operations outside the system that already governs Efeonce operations.

### Alternative B: Use only WordPress REST API, no plugin

Rejected for the durable architecture, acceptable only for a narrow discovery spike.

The WordPress REST API can create and update pages, but real landing operations need template enforcement, SEO metadata, custom fields, preview safety, HMAC verification, drift detection, webhooks, theme compatibility and potentially custom blocks. A bridge plugin provides a controlled contract rather than scattering assumptions across Greenhouse.

### Alternative B2: Register abilities without a Greenhouse bridge service layer

Rejected.

Abilities are the discoverability/execution contract, not a substitute for boring service boundaries. If each ability callback implements its own logic, the bridge becomes difficult to audit and REST/MCP paths diverge. Abilities and REST endpoints should delegate to shared bridge services.

### Alternative C: Make Greenhouse host the landing pages directly on Vercel

Rejected for V1.

This would give maximum control, but it splits the public website into two runtimes, complicates SEO, DNS, brand governance and editorial workflows. It can be revisited if WordPress becomes a hard constraint, but it is not the first move.

### Alternative D: Replace WordPress with a headless CMS or new website stack

Rejected for this program.

That is a website migration, not a Greenhouse integration. It would be a separate strategy with SEO risk, content migration, theme rebuild and hosting changes.

### Alternative E: Use a generic no-code page builder inside WordPress

Rejected as the Greenhouse source of truth.

It may remain part of the existing WordPress implementation, but Greenhouse should not try to automate arbitrary builder internals in V1. The governed path should use manifest-driven templates and a bridge contract.

## Consequences

### Positive

- Greenhouse gains a high-leverage marketing operations capability tied directly to the ASaaS flywheel.
- Landing pages become auditable assets with owner, lifecycle, version, approval, deployment and attribution.
- Campaigns can connect public web surfaces to HubSpot, Account 360, Pulse and future Nexa recommendations.
- Kinsta operational actions become governed instead of manual portal work.
- WordPress remains useful and familiar for public runtime/editorial content instead of being replaced prematurely.

### Costs / Risks

- Requires a small WordPress plugin and operational ownership for it.
- Requires careful inspection of the current WordPress theme, builder and SEO/form plugins before implementation.
- Publishing public pages raises blast radius: wrong copy, broken layout, SEO mistakes or cache issues can be visible immediately.
- Drift detection is mandatory because humans may still edit directly in WordPress.
- Secrets and service accounts must be managed as production credentials.

### Neutral

- This does not make WordPress a sister platform in the same sense as Kortex or Verk. It is an external public website runtime governed through the ecosystem access/control-plane patterns.
- This does not expose landing creation to clients. V1 is internal Efeonce only.

## Security Boundary

- WordPress credentials must belong to a dedicated technical user with least privilege.
- Kinsta API credentials must be scoped as narrowly as Kinsta allows and rotated.
- Secrets live in GCP Secret Manager and/or Vercel env per repo rules, never in frontend code or docs.
- Greenhouse UI never calls WordPress or Kinsta directly.
- The bridge plugin must verify Greenhouse requests with a shared secret or signed request scheme in addition to WordPress auth where applicable.
- Every mutating command must write an audit log with actor, reason, before/after reference, external target and result.
- Publishing to production should require approval and a preflight.
- Rollback must be available before broad publishing is enabled.

## Observability Contract

Minimum reliability signals for the first implementation tasks:

| Signal | Steady state | Purpose |
| --- | --- | --- |
| `public_website.wordpress_sync_failed` | 0 sustained | Detect inventory or manifest sync failures. |
| `public_website.landing_publish_failed` | 0 sustained | Detect failed deployments to WordPress. |
| `public_website.landing_drift_open` | bounded / reviewed | Detect WordPress edits outside Greenhouse ownership. |
| `public_website.cache_clear_failed` | 0 sustained | Detect Kinsta cache failures after publish. |
| `public_website.preview_unverified` | 0 before publish | Prevent publishing without preview verification. |

Every deployment should have an immutable deployment record with status, external page id, URL, WordPress revision/hash, Kinsta operation ids where applicable, verification result and error payload redacted.

## Implementation Direction

Implementation should be coordinated by `EPIC-019`:

1. Discovery and read-only inventory of WordPress/Kinsta.
2. Bridge plugin contract, Abilities API registrations and credential hardening.
3. Landing manifest model and template registry.
4. Draft publish to WordPress staging/draft.
5. Approval, production publish, Kinsta cache clear and smoke verification.
6. HubSpot attribution and reporting.
7. Nexa-assisted recommendations only after the deterministic path is reliable.

Implementation tasks that touch WordPress must load the official WordPress Agent Skills now vendored locally for Codex and Claude:

- `wordpress-router`
- `wp-project-triage`
- `wp-plugin-development`
- `wp-rest-api`
- `wp-abilities-api`
- `wp-abilities-audit`
- `wp-abilities-verify`
- `wp-block-development` when templates/blocks are touched
- `wp-wpcli-and-ops` when WP-CLI, cache, staging or operational checks are touched

## Self-Critique

### What breaks in 12 months?

The likely failure mode is template drift: WordPress theme/plugin changes make Greenhouse-generated landings render differently than expected. Mitigation: bridge plugin contract tests, staging previews, screenshot/GVC-style public checks and drift alerts.

### What breaks in 36 months?

If Efeonce outgrows WordPress or moves to a headless/front-end stack, the manifest model should survive and only the publication adapter should change. The architecture intentionally keeps Greenhouse manifests separate from WordPress internals.

### Cognitive debt risk

The risk is a hidden pile of one-off mapping rules from Greenhouse templates to WordPress builder markup. Mitigation: a small allowlisted template/component registry, documented render adapters and a bridge plugin contract.

### Lock-in

WordPress and Kinsta are real dependencies, but the one-way decision is the Greenhouse manifest lifecycle, not WordPress-specific markup. Publication adapters should be replaceable.

### Observability gap

Public verification can fail silently if the system only trusts API responses. Mitigation: publish records must include URL smoke verification and, later, visual/SEO checks.

### AI-specific risk

Nexa-generated copy or landing recommendations must remain draft/advisory until a human approves. Public claims, case studies and regulated statements require brand/legal review.

### Regional / compliance gap

Landing forms and tracking may collect personal data. Implementation must align HubSpot/Greenhouse consent, privacy policy and retention before enabling Greenhouse-owned forms or custom capture endpoints.

## Revisit When

- The WordPress site changes theme/builder or becomes headless.
- Kinsta API capabilities or credential model materially change.
- Greenhouse-owned landings exceed the approved template set.
- Client-facing landing creation is requested.
- Greenhouse begins hosting any public pages directly.
- Nexa moves from drafting suggestions to autonomous publishing.

## Related Docs

- `GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
