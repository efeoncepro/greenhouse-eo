# GREENHOUSE_SERVICE_MODULES_V1.md

## Objective

Define `service modules` as a first-class product axis in Greenhouse.

This model exists to solve a product problem:
- not every client should see the same dashboard slices
- not every tenant buys the same type of service from Efeonce
- the portal should adapt to the commercial reality of the tenant without hardcoding UI variants by tenant name

`service modules` do not replace roles or scopes.
They complement them.

## Four Product Axes

1. `tenant`
- who owns the data

2. `role`
- who the user is

3. `scope`
- which entities the user can see

4. `service modules`
- which product capabilities make sense for that tenant

Interpretation:
- roles and scopes are the access model
- service modules are the product composition model

## Why This Matters

Greenhouse already solves:
- tenant isolation
- user roles
- project scopes
- campaign scopes

That is enough for security.

It is not enough for product fit.

Examples:
- a `creative_agency` client should see delivery throughput, creative review pressure, pieces delivered, and team load
- a `crm_solutions` client should see CRM delivery, onboarding progress, licensing context, and CRM operational health
- a `web_dev` client should see execution velocity, active build context, and release visibility

## Current Real Data Source

As of `2026-03-10`, the current reliable source for commercial service context is:
- `efeonce-group.hubspot_crm.deals.linea_de_servicio`
- `efeonce-group.hubspot_crm.deals.servicios_especificos`

This is usable because Greenhouse tenants already bootstrap from HubSpot `closedwon` companies.

## Current Observed Values

Observed from `hubspot_crm.deals` over `closedwon` deals:

### `linea_de_servicio`

- `crm_solutions`
- `globe`
- `wave`
- blank values also exist and must be handled as unknown

Observed counts on `2026-03-10`:
- `crm_solutions`: 7 closedwon deals
- `globe`: 3 closedwon deals
- `wave`: 2 closedwon deals
- blank: 1 closedwon deal

### `servicios_especificos`

Observed current values on closedwon deals:
- `licenciamiento_hubspot`
- `implementacion_onboarding`
- `consultoria_crm`
- `agencia_creativa`
- `desarrollo_web`

Observed combinations:
- `crm_solutions` -> `licenciamiento_hubspot`
- `crm_solutions` -> `licenciamiento_hubspot;implementacion_onboarding`
- `crm_solutions` -> `licenciamiento_hubspot;implementacion_onboarding;consultoria_crm`
- `globe` -> `agencia_creativa`
- `wave` -> `desarrollo_web`

Inference:
- `linea_de_servicio` is the business family
- `servicios_especificos` is the module-level capability signal

## Recommended Product Taxonomy

### Business line

Keep the raw commercial family as close to HubSpot as possible:
- `crm_solutions`
- `globe`
- `wave`
- `unknown`

### Service module

Normalize `servicios_especificos` into module codes Greenhouse can consume:
- `agencia_creativa`
- `licenciamiento_hubspot`
- `implementacion_onboarding`
- `consultoria_crm`
- `desarrollo_web`

Recommendation:
- keep raw source codes for persistence
- allow display labels in Greenhouse metadata

## Architectural Rule

`service modules` must not become the primary security layer.

Use them for:
- navigation composition
- dashboard widget selection
- route relevance
- tab visibility
- chart registries
- KPI families
- invoice and billing context

Do not use them alone for:
- tenant isolation
- role enforcement
- project access enforcement

Security remains server-side through:
- `client_users`
- `roles`
- `user_role_assignments`
- `user_project_scopes`
- `user_campaign_scopes`

## Proposed BigQuery Model

### `greenhouse.service_modules`

Canonical list of business lines and service modules.

Recommended columns:
- `module_id`
- `module_code`
- `module_label`
- `module_kind`
- `parent_module_code`
- `source_system`
- `source_value`
- `active`
- `sort_order`
- `description`
- `created_at`
- `updated_at`

### `greenhouse.client_service_modules`

Assignments of active modules per tenant.

Recommended columns:
- `assignment_id`
- `client_id`
- `hubspot_company_id`
- `module_code`
- `source_system`
- `source_object_type`
- `source_object_id`
- `source_closedwon_deal_id`
- `confidence`
- `active`
- `derived_from_latest_closedwon`
- `valid_from`
- `valid_to`
- `created_at`
- `updated_at`

## Derivation Rule

For client tenants imported from HubSpot:

1. find all `closedwon` deals for the client company
2. collect distinct `linea_de_servicio`
3. split `servicios_especificos` by `;`
4. normalize trimmed values
5. assign:
- one or more `business_line` modules
- one or more `service_module` modules

Fallback rules:
- if `linea_de_servicio` is blank but `servicios_especificos` exists, derive only service modules
- if both are blank, assign `unknown`
- never block tenant creation because service modules are missing

## Runtime Contract

Extend `getTenantContext()` with:
- `businessLines: string[]`
- `serviceModules: string[]`

Use `serviceModules` for:
- navigation filtering
- dashboard widget composition
- billing context
- campaign interpretation

Do not let `serviceModules` replace `routeGroups` or scopes.

## Product Implications

### Dashboard

`/dashboard` should evolve into a registry model:
- base widgets
- module-specific widgets
- role-aware widgets

Examples:
- creative widgets for `agencia_creativa`
- CRM widgets for `licenciamiento_hubspot`, `implementacion_onboarding`, `consultoria_crm`
- web widgets for `desarrollo_web`

### Campaign intelligence

Campaigns should later be interpreted with:
- campaign
- project
- deliverable
- business line
- service module

### Admin and billing

Admin detail and future billing views should surface:
- business line
- active modules
- latest source deal
- invoice relevance by module

## Phase Placement

### Phase 0
- finalize service module taxonomy
- finalize mapping rules from HubSpot commercial data

### Phase 2
- make dashboard composition module-aware

### Phase 5
- connect campaign KPI interpretation to service modules

### Phase 7
- surface service modules in admin governance

## Implementation Order

1. version the DDL
2. document taxonomy and mapping rules
3. derive initial assignments from current `closedwon` deals
4. expose `serviceModules` in tenant context
5. use them in navigation and dashboard composition
6. surface them in admin and billing
