# GREENHOUSE_INTERNAL_IDENTITY_V1

## Objective

Create a canonical identity layer for internal Efeonce collaborators so Greenhouse can:
- unify the same person across HubSpot owners, current Greenhouse internal users, and future sources
- assign a stable `EO-ID-*` that does not depend on the current login principal
- prepare a clean bridge for future Azure AD or Entra ID federation without rewriting the product model

## Current Problem

Today Greenhouse has:
- auth principals in `greenhouse.client_users`
- HubSpot owners in `hubspot_crm.owners`
- no canonical person table for internal collaborators

This creates two gaps:
- the same Efeonce person can exist in more than one source without a shared Greenhouse identity
- future SSO would otherwise have to merge directly into `client_users`, mixing login transport with person identity

## Discovery Rule

For the internal Efeonce identity layer, the initial candidate universe should be discovered by email domain:
- `@efeonce.org`
- `@efeoncepro.com`

This rule is useful for:
- internal `client_users`
- HubSpot owners
- future Notion people exports
- future Azure AD users

Important:
- domain match is enough to classify a record as an internal candidate
- domain match is not enough by itself to auto-merge two records into the same canonical profile

## Canonical Model

### 1. Identity profile

Table:
- `greenhouse.identity_profiles`

Purpose:
- represent the person, not the login principal

Key fields:
- `profile_id`
- `public_id`
- `profile_type`
- `canonical_email`
- `full_name`
- `job_title`
- `status`
- `active`
- `default_auth_mode`
- `primary_source_system`
- `primary_source_object_type`
- `primary_source_object_id`

Public ID rule:
- internal canonical identities use `EO-ID-*`

Examples:
- HubSpot owner anchor: `EO-ID-HSO-75788512`
- Greenhouse internal auth anchor: `EO-ID-GH-USER-EFEONCE-ADMIN-JULIO-REYES`
- future Notion anchor: `EO-ID-NOT-<person_id>`
- future Azure AD anchor: `EO-ID-AAD-<object_id>`

### 2. Source link

Table:
- `greenhouse.identity_profile_source_links`

Purpose:
- attach every external identity or product principal to the canonical profile

Examples of sources:
- `hubspot_crm` + `owner`
- `greenhouse_auth` + `client_user`
- future `notion` + `person`
- future `azure_ad` + `user`

### 3. Auth principal link

Field:
- `greenhouse.client_users.identity_profile_id`

Purpose:
- let an auth principal point to a canonical profile
- keep auth and authorization stable while the person layer matures

## Matching Rules

### Safe auto-link now

Allowed now:
- exact normalized email match between internal sources

### Candidate only, not auto-link

Should remain manual review for now:
- different emails on Efeonce domains
- alias cases such as `julio.reyes@efeonce.org` vs `jreyes@efeoncepro.com`
- fuzzy name similarity

Reason:
- internal identity errors are high-cost because they affect permissions, auditability, and future SSO

## Bootstrap Strategy

### Phase A

Seed canonical profiles from:
- current internal `greenhouse.client_users`
- current `hubspot_crm.owners` on Efeonce domains

Auto-link only exact normalized email matches.

### Phase B

Attach additional source links when available:
- Notion people or user exports
- Azure AD or Entra users

### Phase C

Once SSO exists:
- login can authenticate through Azure AD
- auth principal can still resolve to the same `identity_profile_id`
- Greenhouse keeps the same canonical `EO-ID-*`

## Product Rules

- `EO-USR-*` remains the public ID of the auth principal
- `EO-ID-*` becomes the public ID of the canonical internal identity profile
- do not collapse these two concepts into one field

Why:
- one person may end up with multiple source identities over time
- auth transport can change before the person model changes

## Current Foundation In Repo

Helpers:
- `src/lib/ids/greenhouse-ids.ts`

Schema foundation:
- `bigquery/greenhouse_internal_identity_v1.sql`

Operational bootstrap:
- `scripts/backfill-internal-identity-profiles.ts`

## Non-Goal

This document does not implement Azure AD auth yet.

It only creates the canonical identity base so Azure AD can be attached later without redesigning the Greenhouse user model again.
