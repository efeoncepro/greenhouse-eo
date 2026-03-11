# Greenhouse Cross-Repo Contract V1

Public handoff for the HubSpot <-> Greenhouse integration boundary.

## Goal

Stop ambiguity across chats, repos, and workspaces by defining:
- ownership by repo
- the runtime contract consumed by Greenhouse
- branch and promotion rules
- the default smoke target

## Ownership By Repo

### `hubspot-bigquery`

Owns:
- HubSpot -> BigQuery batch sync
- HubSpot property bootstrap and backfill logic
- HubSpot webhook validation
- dedicated CRM facade service:
  - `hubspot-greenhouse-integration`

### `greenhouse-eo`

Owns:
- Greenhouse product runtime
- tenant governance
- user provisioning into `greenhouse.client_users`
- provider-neutral integrations API
- admin workflows and `/developers/api`

Rule:
- Greenhouse consumes connectors.
- Greenhouse does not reimplement connector-specific sync infrastructure.

## Runtime Contract Consumed By Greenhouse

Greenhouse consumes:
- `GET /contract`
- `GET /companies/{hubspotCompanyId}`
- `GET /companies/{hubspotCompanyId}/owner`
- `GET /companies/{hubspotCompanyId}/contacts`

Facade base URL:
- `https://hubspot-greenhouse-integration-183008134038.us-central1.run.app`

Capability relay path:
- HubSpot property-change webhook
- facade relay
- `POST /api/integrations/v1/tenants/capabilities/sync`

## Greenhouse-Hosted API

Greenhouse hosts:
- `GET /api/integrations/v1/catalog/capabilities`
- `GET /api/integrations/v1/tenants`
- `POST /api/integrations/v1/tenants/capabilities/sync`

## Golden Smoke Target

Use by default:
- HubSpot company ID: `30825221458`
- Company: `Sky Airline`
- Selector:
  - `sourceSystem=hubspot_crm`
  - `sourceObjectType=company`
  - `sourceObjectId=30825221458`

## Branch And Promotion Rules

### Greenhouse

- `main` -> Production
- `develop` -> Staging
- new work -> `feature/*`, `fix/*`, or `hotfix/*`

### Default promotion flow

1. branch
2. local validation
3. preview validation
4. merge to `develop`
5. staging validation
6. merge to `main`
7. production promotion

## Source Of Truth Rules

- HubSpot `company` = CRM root behind a Greenhouse space
- HubSpot `contacts` = CRM people associated to that company
- Greenhouse `client_users` = actual provisioned platform members
- BigQuery = audit and reporting layer, not the live CRM facade

## Current State

Already live:
- company live read
- owner live read
- contacts live read
- webhook-driven capability relay

Still pending:
- manual or semi-automatic provisioning from HubSpot contacts into `greenhouse.client_users`

## Rule For Future Agents

If chats, repos, or workspaces disagree:
- trust git state and deployed contracts
- not memory
