# Greenhouse Cross-Repo Contract V1

Use this document as the canonical cross-repo operating contract for the HubSpot <-> Greenhouse integration.

Its purpose is to stop ambiguity across chats, repos, local workspaces, and deployment surfaces.

## Goal

Define:
- which repo owns each integration responsibility
- which contract `greenhouse-eo` consumes at runtime
- which branch and promotion rules apply
- which tenant/company should be used as the default smoke target
- what must not be reimplemented inside Greenhouse

## System Boundaries

### Repo: `hubspot-bigquery`

Primary responsibilities:
- scheduled full-refresh sync from HubSpot into BigQuery
- HubSpot property bootstrap and backfill helpers
- constrained Greenhouse bridge actions for capability sync
- dedicated operational facade service source:
  - `services/hubspot_greenhouse_integration/*`

Owned production surfaces:
- Cloud Function `hubspot-bq-sync`
- Cloud Run service `hubspot-greenhouse-integration`

What this repo should own:
- HubSpot app metadata and scopes
- HubSpot secrets and webhook validation
- CRM-facing reads and webhook relay logic
- capability push relay into Greenhouse

What this repo should not expect Greenhouse to reimplement:
- raw HubSpot sync logic
- HubSpot webhook validation
- CRM object flattening or provider-specific transport behavior

### Repo: `greenhouse-eo`

Primary responsibilities:
- Greenhouse product runtime and admin surfaces
- tenant governance
- user provisioning into `greenhouse.client_users`
- capability catalog and tenant state runtime
- machine-to-machine integration API under `/api/integrations/v1/*`

Owned production surfaces:
- `https://greenhouse.efeoncepro.com`
- admin routes such as `/admin/tenants/[id]`
- `/developers/api`

What this repo should own:
- tenant model
- user model
- admin workflows
- role assignment and scopes
- displaying and consuming external connector data

What this repo should not reimplement:
- HubSpot full-refresh syncs
- HubSpot webhook signature logic
- direct CRM integration logic that already lives in the dedicated facade

## Runtime Contract Consumed By Greenhouse

Greenhouse currently consumes the dedicated HubSpot facade service:

- base URL:
  - `https://hubspot-greenhouse-integration-183008134038.us-central1.run.app`

Current runtime endpoints consumed by `greenhouse-eo`:
- `GET /contract`
- `GET /companies/{hubspotCompanyId}`
- `GET /companies/{hubspotCompanyId}/owner`
- `GET /companies/{hubspotCompanyId}/contacts`

Current semantics:
- `company` is the CRM root for a Greenhouse space
- `owner` is the current HubSpot owner for that company
- `contacts` are the associated CRM people who may become tenant members in Greenhouse

Capability propagation:
- `companies.linea_de_servicio`
- `companies.servicios_especificos`

Those capabilities are propagated from HubSpot to Greenhouse through:
- HubSpot property-change webhooks
- Cloud Run facade relay
- `POST /api/integrations/v1/tenants/capabilities/sync`

## Greenhouse-Hosted API Contract

Greenhouse hosts the provider-neutral integrations API at:
- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`

Important rule:
- Greenhouse consumes connectors.
- Greenhouse does not replace or absorb connector-specific sync infrastructure.

## Golden Smoke Target

Use this target by default when validating end-to-end behavior:

- HubSpot company ID: `30825221458`
- Company name: `Sky Airline`
- Canonical source selector:
  - `sourceSystem=hubspot_crm`
  - `sourceObjectType=company`
  - `sourceObjectId=30825221458`

Useful runtime checks:
- Greenhouse tenant resolve by selector
- live company read
- live owner read
- live contacts read
- webhook capability relay

## Branch Policy

### `greenhouse-eo`

- `main` is the product baseline and maps to Production.
- `develop` is the shared integration branch and maps to Staging.
- new work should start on a task branch:
  - `feature/*`
  - `fix/*`
  - `hotfix/*`

Do not keep extending `main` interactively for new work once the baseline is established.

### `hubspot-bigquery`

- `main` currently carries the validated integration baseline.
- risky changes should still be isolated on a branch first when they can affect production behavior.

## Promotion Flow

Default expected flow for Greenhouse product work:
1. start from a task branch
2. validate locally
3. deploy Preview if needed
4. merge to `develop`
5. validate in Staging
6. merge to `main`
7. promote to Production

Default expected flow for connector or facade changes:
1. change `hubspot-bigquery`
2. validate locally
3. deploy Cloud Run or Cloud Function
4. smoke the live endpoint
5. only then update Greenhouse if the consumed contract changed

## Source Of Truth Rules

- HubSpot `company` is the source of truth for the CRM company identity behind a Greenhouse space.
- HubSpot `contacts` associated to that company are the source CRM people for potential tenant membership.
- Greenhouse `client_users` is the source of truth for actual provisioned platform members.
- BigQuery is the audit, history, and reporting layer; it is not the live CRM facade.

## Current State As Of 2026-03-11

Already live:
- Greenhouse live reads for company
- Greenhouse live reads for owner
- Greenhouse live reads for contacts
- HubSpot -> Greenhouse capability relay by webhook

Still pending:
- manual or semi-automatic provisioning flow from HubSpot contacts into `greenhouse.client_users`
- hardening the public Cloud Run service

## Read Order For Future Agents

In `greenhouse-eo`:
1. `GREENHOUSE_CROSS_REPO_CONTRACT_V1.md`
2. `GREENHOUSE_INTEGRATIONS_API_V1.md`
3. `GREENHOUSE_API_REFERENCE_V1.md`
4. `project_context.md`
5. `Handoff.md`

In `hubspot-bigquery`:
1. `project_context.md`
2. `README.md`
3. `Handoff.md`
4. `services/hubspot_greenhouse_integration/contract.py`
5. `services/hubspot_greenhouse_integration/app.py`

## Non-Negotiable Rule

If there is confusion between chats, repos, or local workspaces:
- trust the current git state and deployed contract
- not memory
- not a previous chat summary
