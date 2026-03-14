# GREENHOUSE_SERVICE_MODULES_V1.md

## Objective

Define `service modules` as a first-class product axis in Greenhouse.

This model exists to solve a product problem:
- not every client should see the same dashboard slices
- not every tenant buys the same type of service from Efeonce
- the portal should adapt to the commercial reality of the tenant without hardcoding UI variants by tenant name

`service modules` do not replace roles or scopes.
They complement them.

Use together with:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md`

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

## Canonical Product Model

Within the Greenhouse 360 object model:
- `service module` is the closest current implementation of the canonical `Product/Capability` object
- the canonical product catalog lives in `greenhouse.service_modules`
- client-level product assignments live in `greenhouse.client_service_modules`

Important distinction:
- the canonical product object is not the same thing as a portal UI module
- a portal module may be activated by one or more service modules, but it is a presentation concern, not the core product identity itself

## Current External Commercial Signal

As of March 2026, the external commercial signal for capability resolution should come from:
- explicit company-level capability payloads
- or HubSpot company properties mirrored into BigQuery, especially:
  - `hubspot_crm.companies.linea_de_servicio`
  - `hubspot_crm.companies.servicios_especificos`

Historical note:
- closedwon `hubspot_crm.deals` were useful to discover initial values and bootstrap the taxonomy
- deals should not remain the long-term canonical assignment layer for capabilities inside Greenhouse

## Current Observed Values

Observed historically from commercial discovery over HubSpot data:

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

Historical values observed on closedwon deal data:
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

Object-model rule:
- `greenhouse.service_modules` is the canonical product or capability catalog
- `greenhouse.client_service_modules` is the canonical client-to-capability assignment registry
- external CRM values are enrichment or sync signals, not the Greenhouse product identity itself

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

## Derivation and Sync Rule

Preferred rule for client capability assignment:

1. keep `greenhouse.service_modules` as the canonical capability catalog
2. keep `greenhouse.client_service_modules` as the canonical assignment registry
3. derive or sync assignments from an explicit company-level source payload
4. preserve external provenance on the assignment row

If the source is HubSpot-based, derive from company-level capability signals, not from deal rows as the long-term identity source.

Historical bootstrap discovery may still use deals for taxonomy analysis, but runtime assignment should converge on company payload or controlled sync.

For client tenants imported from HubSpot during transitional flows:

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

Transitional note:
- the deal-based derivation above should be treated as bootstrap or reconciliation logic, not as the ideal long-term canonical rule

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

## Admin Governance Model

### Tenant capability governance

The current structure is already enough to support editable tenant capabilities without adding a new table.

Use:
- `greenhouse.service_modules` as the canonical catalog
- `greenhouse.client_service_modules` as the assignment registry

Interpretation:
- `business_line` and `service_module` records together form the capability catalog
- the tenant admin screen can present that catalog as editable capabilities
- a manual admin save writes controlled assignments into `client_service_modules`

360 object rule:
- this is a client-to-product relationship, not a replacement for the Client object
- capability governance must enrich the Client object graph instead of inventing a second company identity

### Source precedence

Recommended precedence:
1. `greenhouse_admin`
2. external sync source such as `hubspot_crm`
3. bootstrap state

Operational rule:
- when admin manually fixes a capability, that row becomes controlled
- later external syncs must not overwrite controlled rows automatically

This allows:
- safe manual correction for bad commercial source data
- repeatable auto-sync from HubSpot or another provider
- explicit provenance on each assignment row

### Manual assignment convention

When admin saves capabilities from `/admin/tenants/[id]`, write rows with:
- `source_system = greenhouse_admin`
- `source_object_type = admin_user`
- `source_object_id = <actor user id>`
- `confidence = controlled`
- `derived_from_latest_closedwon = false`

If admin removes a capability that was previously active:
- keep the row
- set `active = false`
- keep `greenhouse_admin` as the controlling source

That negative override is what prevents the next external sync from reactivating the module blindly.

## API Structure

### Read current capability state

`GET /api/admin/tenants/[id]/capabilities`

Returns:
- active `businessLines`
- active `serviceModules`
- full capability catalog with selection state and provenance

### Save manual admin selection

`PUT /api/admin/tenants/[id]/capabilities`

Request body:

```json
{
  "businessLines": ["crm_solutions"],
  "serviceModules": ["licenciamiento_hubspot", "implementacion_onboarding"]
}
```

Behavior:
- validates requested codes against `greenhouse.service_modules`
- writes controlled rows into `greenhouse.client_service_modules`
- can activate or deactivate capabilities from admin

### Sync from an external source

`POST /api/admin/tenants/[id]/capabilities/sync`

Generic payload shape:

```json
{
  "sourceSystem": "hubspot_crm",
  "sourceObjectType": "company",
  "sourceObjectId": "30825221458",
  "sourceClosedwonDealId": "123456789",
  "confidence": "high",
  "businessLines": ["globe"],
  "serviceModules": ["agencia_creativa"]
}
```

If `sourceSystem = hubspot_crm` and no arrays are sent:
- derive capabilities from current `closedwon` deals using the tenant `hubspot_company_id`

Behavior:
- upserts externally-sourced assignments
- preserves rows already controlled by `greenhouse_admin`
- deactivates stale external rows no longer present in the incoming source payload

This route is intentionally provider-agnostic so the same contract can be used by:
- HubSpot readers
- future billing systems
- CRM sync jobs
- manual operational scripts

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
7. add editable admin governance and source-sync APIs
