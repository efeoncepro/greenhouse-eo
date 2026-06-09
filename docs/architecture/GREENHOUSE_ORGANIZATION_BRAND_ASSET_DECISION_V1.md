# GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1

> **Status:** Accepted (2026-06-08)
> **Date:** 2026-06-08
> **Owner:** Identity / Agency / Account 360
> **Scope:** Organization logos, brand assets, private assets, Account 360 identity, Organization Workspace chrome
> **Implementation task:** `docs/tasks/in-progress/TASK-999-organization-brand-asset-enrichment.md`

## Context

`greenhouse_core.organizations.logo_asset_id` existed before TASK-999, but its original use was tied to legal/operating-entity documents. At the same time, Organization Workspace and the organization list had avatar/logo surfaces but no canonical runtime logo.

Greenhouse also has two brand boundaries that must not blur:

- Efeonce / operating entities use institutional/legal assets for documents, payroll, contracts and formal PDFs.
- Commercial organizations, clients and providers can use organization logos in Account 360 and Workspace UI.

Using tenant media, HubSpot hotlinks or remote website image URLs as the source of truth would create parallel ownership, privacy and reliability issues.

## Decision

Greenhouse uses `greenhouse_core.organizations.logo_asset_id` as the canonical pointer to the final logo asset for an organization, with semantics determined by the organization row:

- `is_operating_entity = TRUE`: logo belongs to Efeonce/legal/institutional flows and is not mutated by TASK-999.
- `is_operating_entity = FALSE`: logo can be enriched as a commercial organization brand asset for Account 360, lists and Workspace chrome.

Accepted logos are stored as private Greenhouse assets. Product UI receives only `logoAssetId` and a proxied `logoUrl`; it never hotlinks external logo URLs.

TASK-999 introduces a separate candidate model for reviewable suggestions:

- `greenhouse_core.organization_brand_asset_candidates`
- candidate sources: `hubspot_company`, `website_metadata`, `manual_upload`, `operator_url`
- final apply command: `attachOrganizationLogoAsset`

The command must block operating entities before touching assets. There is no admin override in this flow. Any future Efeonce legal/institutional logo change requires a separate task/ADR.

## Access Contract

Reading a final logo is part of `organization.identity:read` and still goes through private asset access checks.

Mutating or reviewing organization brand assets uses the dedicated capability:

- `organization.brand_asset`
- actions: `review`, `update`
- scopes: `tenant`, `all`

This capability is separate from `organization.identity_sensitive.update`; changing a logo is brand-asset governance, not legal-identity editing.

## Runtime Rules

- Final UI logos must come from Greenhouse storage via private asset proxy.
- Remote candidate URLs are provenance only, never the final image source.
- Replacing a logo supersedes the prior asset; it does not delete historical bytes.
- Organization list/detail/workspace surfaces must preserve a stable fallback when `logoUrl` is missing or fails.
- Discovery/fetching external websites belongs in worker/scheduled infrastructure, not in a Vercel request handler.

## Current State

TASK-999 foundation shipped on 2026-06-08:

- schema column `organizations.website_url`;
- candidate table;
- `organization_360` exposes `logo_asset_id`, `website_url` and `is_operating_entity`;
- private asset contexts for organization logos;
- API command path `POST /api/organizations/[id]/brand-assets/logo`;
- Organization list/detail/workspace consume `logoUrl` with fallback.

Still pending before operational closure:

- automated discovery worker;
- review queue UI;
- reliability signals and coverage reporting;
- production/staging rollout beyond the dev migration already applied.
