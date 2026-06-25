# Greenhouse Growth Domain Architecture V1

> Tipo de documento: arquitectura de dominio
> Status: Accepted direction — domain to be created by future tasks
> Version: V1
> Fecha: 2026-06-24
> Owner: Product / Platform Architecture / GTM
> Initial resident capabilities: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`, `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`

## 1. Purpose

This document defines the new **Growth** domain in Greenhouse.

It does not create runtime schema, routes, navigation, capabilities or tasks. It establishes the domain boundary so future implementation work does not place acquisition/lead-magnet intelligence inside `commercial`, `public_site`, `platform` or a vague `marketing` bucket.

Canonical summary:

```text
growth owns acquisition intelligence and pre-pipeline diagnostic motions;
commercial owns qualified revenue motion after handoff.
```

## 2. Why a new domain

Greenhouse already has strong operational domains such as `commercial`, `finance`, `delivery`, `knowledge`, `public_site`, `identity` and `platform`. The AI Visibility Grader introduces a different kind of capability:

- public lead magnet;
- acquisition diagnostic;
- intent scoring;
- prompt/evidence/report governance;
- HubSpot attribution before opportunity creation;
- future recurring monitoring for clients;
- future handoff into Verk/Kortex/Commercial motions.

Putting this inside `commercial` would make the commercial domain own top-of-funnel public acquisition mechanics, provider costs, bot protection, prompt packs, public reports and campaign attribution. That dilutes the commercial boundary, which should remain focused on qualified revenue motion: parties, deals, quotations, contracts, engagement terms, quote-to-cash and expansion/renewal workflows.

Putting this inside `public_site` would confuse runtime ownership with business ownership. The public website may host the page, but it does not own the diagnostic, scoring, evidence, HubSpot handoff or client monitoring.

Putting this inside `marketing` would be too broad and department-shaped. Greenhouse domains should model durable product capabilities, not org-chart functions. `growth` is more precise: acquisition, experiments, lead magnets, intent, attribution and pre-pipeline conversion.

## 3. Domain definition

**Growth** is the Greenhouse domain for acquisition intelligence and pre-pipeline conversion motions.

It owns capabilities that:

- attract or qualify new demand before a revenue opportunity is accepted;
- produce diagnostic evidence used by sales, strategy or productized services;
- measure and improve acquisition surfaces;
- hand off qualified intent to HubSpot/commercial workflows;
- retain reusable acquisition history for future client/account intelligence.

It does not own:

- deal lifecycle, quotes, contracts or Q2C (`commercial`);
- public-site hosting, CMS, deploy or route ownership (`public_site`);
- content production operations (`Verk`);
- CRM implementation/advisory execution (`Kortex`);
- general platform reliability/tooling (`platform`);
- AI provider infrastructure shared by many domains, unless specific to a Growth capability.

## 4. Canonical identifiers

Future implementation should use:

| Concern | Canonical value |
| --- | --- |
| Domain name | `Growth` |
| Technical module key | `growth` |
| PostgreSQL schema | `greenhouse_growth` |
| TypeScript root | `src/lib/growth/` |
| API family | `/api/growth/**` for authenticated Product APIs; `/api/public/growth/**` for public acquisition endpoints. **Delta TASK-1229:** las Product APIs admin del motor Growth Forms usan `/api/admin/growth/forms/**` (precedente del grader `/api/admin/growth/ai-visibility/**`, boring/precedente gana sobre `/api/growth/**`). Convención real vigente para superficies admin internas del dominio growth. |
| Admin surface | `/admin/growth/**` |
| Reliability signal prefix | `growth.*` |
| Capability prefix | `growth.*` |
| Event prefix | `growth.*` |
| Contract prefix | `greenhouse-growth-*` |

These identifiers are direction only until a future backend-data task materializes the domain and updates runtime catalogs.

## 5. Boundary map

| Domain/system | Owns | Does not own |
| --- | --- | --- |
| `growth` | Lead magnets, acquisition diagnostics, intent scoring, prompt packs, reports, pre-pipeline attribution, HubSpot handoff state. | Deals, contracts, quotes, public-site deployment, content production. |
| `commercial` | Qualified revenue motion: parties, deals, quotations, quote-to-cash, contracts, expansion/renewal. | Public acquisition diagnostics before handoff. |
| `public_site` | Public website runtime, route binding, deploy/drift, CMS/hosting operations. | Diagnostic scoring or lead qualification logic. |
| `Verk` | Content/distribution execution and future SEO/AEO content operations. | Greenhouse acquisition run source of truth. |
| `Kortex` | CRM intelligence/deployment/advisory over HubSpot. | Greenhouse Growth run source of truth. |
| HubSpot | CRM identity, lifecycle, owner, pipeline and campaign attribution. | Greenhouse evidence ledger or scoring truth. |

## 6. Initial resident capabilities

### 6.1 AI Visibility Grader

The first planned capability in `growth` is the public AI Visibility Grader / Surround Discovery Audit substrate.

Ownership:

- `growth` owns grader profiles, runs, prompt packs, provider observations, normalized findings, scoring, report artifacts, review state and handoff records.
- `public_site` or the target public runtime hosts the public page.
- HubSpot receives bounded lead/company/deal enrichment through a governed command.
- `commercial` consumes qualified handoffs when a deal/task/opportunity is created or when sales accepts the lead.

Canonical placement:

```text
src/lib/growth/ai-visibility/
greenhouse_growth.*
growth.ai_visibility.*
growth.ai_visibility.<signal>
```

### 6.2 Public Forms Engine

The second planned capability in `growth` is the Greenhouse-owned public forms engine for lead magnets, public website forms, diagnostic intakes and other pre-pipeline conversion surfaces.

Ownership:

- `growth` owns form definitions, versions, published render contracts, validation, consent snapshots, submissions ledger, destination routing and destination attempts.
- Public-site runtimes such as Astro and WordPress host/render the form but do not own the submission contract.
- WordPress, Astro and Greenhouse Next.js are `host_surface` consumers; HubSpot and future systems are `destination` adapters. Host surfaces are governed through surface registry/origin/embed-key policy.
- HubSpot receives submissions through a destination adapter; it does not own the renderer or Greenhouse form source of truth.
- `commercial` consumes qualified handoffs after a form submission is accepted/routed and promoted into revenue motion.

Canonical placement:

```text
src/lib/growth/forms/
greenhouse_growth.*
growth.forms.*
growth.forms.<signal>
```

The HubSpot V1 adapter intentionally starts with the documented secure Forms submission endpoint while isolating it behind adapter metadata:

```text
adapterVersion: hsforms-v3-secure-submit
endpointStatus: legacy_supported
migrationTarget: date_versioned_forms_submission_api_when_available
```

## 7. Lifecycle: pre-pipeline to commercial handoff

Growth-owned lifecycle:

```text
anonymous/visitor interest
  -> public submission
  -> diagnostic run
  -> score/report
  -> intent classification
  -> HubSpot enrichment
  -> commercial handoff candidate
```

Commercial-owned lifecycle begins when:

- a sales-owned deal is created or updated;
- a qualified company/contact is accepted into a pipeline motion;
- a quote, contract, engagement or expansion workflow starts;
- a human/operator explicitly promotes the Growth signal into Commercial work.

The handoff should be explicit and auditable. Growth should never silently mutate commercial revenue state without a governed command and policy.

## 8. Capability taxonomy

Initial planned capabilities:

| Capability | Purpose |
| --- | --- |
| `growth.ai_visibility.read` | Read runs, reports and findings. |
| `growth.ai_visibility.run` | Create/execute diagnostic runs. |
| `growth.ai_visibility.review` | Review, approve or hold reports before release/sync. |
| `growth.ai_visibility.sync_hubspot` | Sync bounded report metadata to HubSpot. |
| `growth.prompt_pack.manage` | Create/activate/deprecate prompt packs. |
| `growth.provider_health.read` | Read provider/cost/reliability status. |

Future capability families may include:

- `growth.campaign.*`
- `growth.experiment.*`
- `growth.lead_magnet.*`
- `growth.attribution.*`
- `growth.benchmark.*`

Initial planned forms capabilities:

| Capability | Purpose |
| --- | --- |
| `growth.forms.read` | Read form definitions and published contracts. |
| `growth.forms.author` | Create or edit draft form versions. |
| `growth.forms.review` | Review forms before publication. |
| `growth.forms.publish` | Publish/deprecate/archive versions. |
| `growth.forms.submissions.read` | Read accepted/rejected submissions and delivery state. |
| `growth.forms.destinations.manage` | Manage destination mappings and adapter settings. |
| `growth.forms.retry_delivery` | Retry or dead-letter destination attempts. |

Do not create these future families until a concrete capability needs them.

## 9. Data posture

Growth data may include:

- public contact submissions;
- form definitions, field schemas and consent snapshots;
- company and website information;
- competitor names;
- provider-generated responses;
- citations and source domains;
- intent signals;
- CRM handoff metadata.

Default classification:

- contact identity: restricted/confidential according to Greenhouse privacy posture;
- company/website/product text: confidential until explicitly public;
- provider responses: evidence artifact with bounded retention;
- public report: tokenized or otherwise access-controlled artifact unless intentionally published.
- form submissions: restricted/confidential by default, with consent snapshot and retention policy.

Growth must avoid storing unnecessary personal data in prompts sent to providers. Brand/company facts are usually enough; personal names/emails should not be sent to AI providers unless a future reviewed use case requires it.

## 10. Reliability and observability

Growth signals should roll up under `moduleKey='growth'` once the module exists.

Initial signal families:

- provider health: `growth.ai_visibility.provider_error_rate`;
- run health: `growth.ai_visibility.run_failure_rate`;
- report quality: `growth.ai_visibility.report_review_required_rate`;
- CRM sync: `growth.ai_visibility.hubspot_sync_failed`;
- cost: `growth.ai_visibility.cost_budget_used`;
- prompt quality: `growth.ai_visibility.prompt_pack_eval_regression`.

The domain should be visible in Ops/Reliability like other first-class Greenhouse modules once runtime work begins.

## 11. API parity

Growth capabilities must follow `GREENHOUSE_FULL_API_PARITY_DECISION_V1`.

Implications:

- public UI, admin UI, Nexa, future MCP/app consumers and scripts consume the same server-side primitives;
- public endpoints are thin wrappers around commands/readers;
- writes use commands with auth, capability gates where applicable, idempotency, audit/outbox and sanitized errors;
- future Nexa actions use `propose -> confirm -> execute` and do not execute writes directly.

## 12. Naming guidance

Use `growth` for the technical/domain boundary.

Use market-facing names by product layer:

- **AI Visibility Grader** for public conversion.
- **AI Visibility Snapshot** for the short sales artifact.
- **Surround Discovery Audit** for paid/strategic diagnostic.
- **Greenhouse AI Visibility Monitor** for future client recurring surface.

Avoid:

- `marketing` as technical domain;
- `commercial` for pre-pipeline diagnostic ownership;
- `public_site` for scoring/evidence ownership;
- `aeo` as the whole domain name, because the long-term capability is broader than the AEO category label.

## 13. Revisit when

Revisit this domain boundary if:

- Growth accumulates only one narrow capability and no broader acquisition surface emerges after launch;
- Commercial needs to own full acquisition pipeline logic end-to-end for operational reasons;
- Verk becomes the primary source of truth for all AEO/AI visibility diagnostics;
- HubSpot becomes the actual source of truth for prompt/run/report artifacts, not only CRM handoff;
- a broader `gtm` domain is introduced and intentionally absorbs Growth as a subdomain.

## 14. Related documents

- `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md`
- `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/context/02_gtm.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/14_modelo-negocio-asaas.md`

## Delta 2026-06-24 — schema greenhouse_growth nace (TASK-1226)

Primer runtime del dominio `growth`: el schema PostgreSQL **`greenhouse_growth`** existe (migración aditiva TASK-1226, aplicada a dev). Tablas: `grader_profiles`, `prompt_packs`, `grader_runs`, `provider_observations` (append-only). Es el evidence ledger del AI Visibility Grader; el primitive server-side `executeGraderRun` (`src/lib/growth/ai-visibility/run-engine.ts`) es el contrato canónico de Full API parity. Owner del flujo de acquisition intelligence: `growth` (no `commercial`). Capability namespace `growth.ai_visibility.*`; reliability module `growth`; CaptureDomain `growth`. Detalle e invariantes: `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` §Delta 2026-06-24.
