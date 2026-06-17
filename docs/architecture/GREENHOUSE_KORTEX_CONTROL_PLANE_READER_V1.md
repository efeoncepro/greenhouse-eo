# Greenhouse Kortex Control Plane Reader V1

## Status

- Status: Accepted
- Date: 2026-06-17
- Task: `TASK-1162`
- Runtime contract: `greenhouse-kortex-control-plane-reader.v1`

## Decision

Greenhouse exposes a read-only Kortex control-plane reader from Greenhouse, without absorbing Kortex runtime ownership.

The reader composes:

- GitHub repository status for `efeoncepro/kortex`.
- Kortex Cloud Run read surfaces through an allowlisted GET client.
- Greenhouse `sister_platform_bindings` resolution for Kortex portal scope.
- A single admin-gated packet at `GET /api/admin/kortex/control-plane`.

Kortex remains a peer system. Greenhouse does not read Kortex Cloud SQL, does not share Kortex secrets, and does not call Kortex mutative endpoints in V1.

## Boundary

Allowed V1 read sources:

- `GET /openapi.json`
- `GET /api/v1/greenhouse/context`
- `GET /portal-runtime/overview`
- `GET /api/v1/audits/latest`
- `GET /api/v1/portals/{hubspot_portal_id}/deployment-summary`
- `GET /api/v1/portals/{hubspot_portal_id}/adoption-kpis`

Explicitly blocked in V1:

- `POST /api/v1/audits/run`
- `/api/v1/strategy/*/compile`
- `/api/v1/strategy/release-candidates/*/execute`
- Any HubSpot mutation.
- Any direct Kortex database or Secret Manager read.

## Runtime Shape

The endpoint returns a machine-first packet with:

- `contractVersion`
- `generatedAt`
- `confidence`
- `scope`
- `repository`
- `runtime`
- `binding`
- `observedCapabilities`
- `sources`
- `warnings`

Errors from GitHub, Kortex, or Greenhouse binding resolution degrade their source and are redacted before surfacing. A source failure should not produce a global 5xx unless the requester auth/access path or the composer itself fails unexpectedly.

## Access

`GET /api/admin/kortex/control-plane` is guarded by `requireAdminTenantContext`.

This V1 does not add `kortex.*` to Greenhouse internal entitlements. `kortex.*` strings are descriptive observed capabilities inside the reader packet only, pending the ecosystem capability registry work.

## Evidence

TASK-1162 local/runtime smoke on 2026-06-17 confirmed:

- GitHub repo `efeoncepro/kortex`, default branch `main`, open issues `2`, open PRs `1`.
- Kortex OpenAPI title `Kortex OAuth Service`, version `0.1.0`, no declared security schemes in current OpenAPI.
- Kortex portal context for HubSpot portal `51183921` resolves Kortex portal `0c0af3a3-627e-4e05-96f3-557712a2e06a` and Greenhouse binding `EO-SPB-0001`.
- Greenhouse binding reader resolves the same portal via `greenhouse_core.sister_platform_bindings` as active/internal.
- Kortex portal overview reports environment `staging`, installation `active`, latest deployment `failed`, live schema unavailable.
- Kortex latest audit reports status `completed`, finding count `3`, score `88`.

The existing Kortex `deployment-summary` and `adoption-kpis` endpoints returned `401 Unauthorized` without a dedicated reader token. V1 treats them as optional degraded sources and still extracts deployment basics from `portal-runtime/overview`.

## Follow-Ups

- Dedicated Kortex Greenhouse read adapter or token/HMAC if production requires authenticated deployment/adoption summaries.
- Greenhouse-safe Kortex command adapter for audit/compile/dry-run/execute with idempotency, audit trail and human confirmation.
- Ecosystem capability registry adoption for formal `kortex.*` capabilities.
- UI/admin surface consuming this endpoint after TASK-889.
