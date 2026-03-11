# GREENHOUSE_ID_STRATEGY_V1

## Objective

Define a consistent identifier strategy for Greenhouse so the product can expose readable IDs without leaking raw source prefixes such as `hubspot-company-*`.

## Core Rule

Greenhouse should separate:
- internal keys used by auth, joins, routes, and historical compatibility
- public IDs shown to operators, collaborators, and client-facing admin surfaces

Do not rename current internal keys in place as the first move.

## Why

Current internal IDs are technically stable, but visually noisy:
- tenants imported from HubSpot use `hubspot-company-<id>`
- internal spaces use `space-<slug>`
- imported users use `user-hubspot-contact-<id>`
- modules use `module-*`

Those values are acceptable as backend keys, but weak as product identifiers.

## Recommended Model

### 1. Keep internal keys stable

Keep existing fields as the source of truth for joins and route params:
- `clients.client_id`
- `client_users.user_id`
- `service_modules.module_id`
- `user_role_assignments.assignment_id`
- `client_service_modules.assignment_id`
- `client_feature_flags.flag_id`
- scope table ids

### 2. Introduce public IDs

Public IDs are deterministic, readable, and product-owned.

Recommended prefixes:
- tenant: `EO-...`
- collaborator/user: `EO-USR-...`
- business line: `EO-BL-...`
- service module: `EO-SVC-...`
- tenant capability assignment: `EO-CAP-...`
- role assignment: `EO-ROLE-...`
- feature flag assignment: `EO-FLG-...`

## Public ID Rules

### Tenant / Space

If the tenant has a numeric HubSpot company id:
- public ID = `EO-<hubspot_company_id>`
- example: `hubspot-company-30825221458` -> `EO-30825221458`

If the tenant is an internal/manual space:
- public ID = `EO-SPACE-<NORMALIZED_SLUG>`
- example: `space-efeonce` -> `EO-SPACE-EFEONCE`

Fallback for any other legacy tenant key:
- public ID = `EO-TEN-<NORMALIZED_INTERNAL_KEY>`

### Collaborator / User

If the user comes from a HubSpot contact:
- public ID = `EO-USR-<hubspot_contact_id>`
- example: `user-hubspot-contact-87929193794` -> `EO-USR-87929193794`

If the user is internal or manually created:
- public ID = `EO-USR-<NORMALIZED_INTERNAL_SUFFIX>`
- example: `user-efeonce-admin-bootstrap` -> `EO-USR-EFEONCE-ADMIN-BOOTSTRAP`

### Business Line

- public ID = `EO-BL-<NORMALIZED_MODULE_CODE>`
- example: `crm_solutions` -> `EO-BL-CRM-SOLUTIONS`

### Service Module

- public ID = `EO-SVC-<NORMALIZED_MODULE_CODE>`
- example: `licenciamiento_hubspot` -> `EO-SVC-LICENCIAMIENTO-HUBSPOT`

### Capability Assignment

- public ID = `EO-CAP-<TENANT_PUBLIC_SEGMENT>-<MODULE_PUBLIC_SEGMENT>`
- example: `EO-CAP-30825221458-LICENCIAMIENTO-HUBSPOT`

## Product Rule

In UI and documentation:
- prefer public IDs
- show internal keys only in admin/debug contexts
- keep explicit source IDs such as `hubspot_company_id` as source metadata, not as the primary product identifier

## Runtime Rule

Until a full migration is applied:
- routes keep using internal ids
- JWT/session resolution keeps using internal ids
- BigQuery joins keep using internal ids
- admin surfaces can derive public IDs at read time

## Persistence Rule

The next schema-hardening step is to add nullable `public_id` columns to:
- `greenhouse.clients`
- `greenhouse.client_users`
- `greenhouse.service_modules`
- `greenhouse.client_service_modules`
- `greenhouse.user_role_assignments`
- `greenhouse.client_feature_flags`

This lets Greenhouse persist product-facing IDs without breaking internal references.

## Current Implementation In Repo

Shared logic now lives in:
- `src/lib/ids/greenhouse-ids.ts`

Current runtime usage:
- tenant admin detail
- tenant dashboard preview
- user admin detail
- tenant capability governance

## Migration Order

1. Derive and expose public IDs in runtime reads.
2. Add `public_id` columns in BigQuery.
3. Backfill deterministic values from existing records.
4. Update bootstrap scripts so new rows persist both internal key and public ID.
5. Only consider route-level migration later, if there is a strong product reason.

## Non-Goal

This strategy does not replace source lineage.

We still keep:
- `hubspot_company_id`
- `source_system`
- `source_object_id`
- other raw source references

The goal is to stop exposing source prefixes as the primary identifier, not to hide provenance.
