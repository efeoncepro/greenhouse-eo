---
name: hubspot-greenhouse-bridge
description: "Operate the HubSpot ↔ Greenhouse write bridge Cloud Run service (`services/hubspot_greenhouse_integration/`, Python 3.12 + Flask). Use when adding/modifying HTTP routes, webhook handlers, HubSpot custom properties, Secret Manager rotations, deploys via GitHub Actions WIF, or end-to-end smokes that cross HubSpot portal + Cloud Run + greenhouse-eo runtime. Post TASK-574 (2026-04-24) this lives in the monorepo; pre-2026-04-24 evidence may reference the sibling cesargrowth11/hubspot-bigquery."
---

# HubSpot Greenhouse Bridge Ops

Operate the Cloud Run service that bridges HubSpot CRM writes/webhooks ↔ `greenhouse-eo` runtime. The service is a Python Flask proxy with 23 HTTP routes + a webhook handler validated via HMAC. Its physical location is `greenhouse-eo/services/hubspot_greenhouse_integration/` (TASK-574 cutover 2026-04-24). The public Cloud Run URL `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` is stable across the cutover — Vercel consumers did not need config changes.

## System boundary (don't mix these up)

| System | Lives in | Canonical authority |
|---|---|---|
| **HubSpot portal app** (v2025.2): OAuth scopes, webhook URL config, private app tokens | `cesargrowth11/hubspot-bigquery/hsproject.json` + `src/app/` (sibling, **NOT moved** by TASK-574) | HubSpot Developer Platform |
| **HubSpot → BigQuery CRM sync** (Cloud Function `hubspot-bq-sync`, `main.py`) | `cesargrowth11/hubspot-bigquery/main.py` + `deploy.sh` (sibling, **NOT moved**) | GCP Cloud Function + BigQuery `hubspot_crm.*` |
| **HubSpot write bridge + webhooks** (Cloud Run `hubspot-greenhouse-integration`, 23 routes) | `greenhouse-eo/services/hubspot_greenhouse_integration/` | **this skill** owns this system |
| **Greenhouse runtime** (Next.js on Vercel) | `greenhouse-eo/src/**` | `src/lib/integrations/hubspot-greenhouse-service.ts` is the canonical client |
| **Secret Manager** (3 secrets) | GCP project `efeonce-group` | Runtime SA `greenhouse-portal@` reads at boot |

Confusing ownership is the #1 bug source. Always ask: "which of the 5 systems above owns this change?" before touching code or config.

## Canonical operational paths

### 1. Add/modify an HTTP route on the bridge

1. Edit `services/hubspot_greenhouse_integration/app.py` (route decorator + handler).
2. If the route is surface-visible, update `contract.py` (returned by `GET /contract`).
3. If the route uses a new HubSpot response shape, update `models.py` (build_*_profile functions).
4. Add a test in `services/hubspot_greenhouse_integration/tests/test_app.py` (minimum: happy path + auth rejection if it's a write route).
5. Update the TypeScript client in `src/lib/integrations/hubspot-greenhouse-service.ts` — same PR.
6. CI runs pytest → deploys via `.github/workflows/hubspot-greenhouse-integration-deploy.yml` on merge.

**Rule of preservation:** the bridge contract is one-to-one with what Vercel consumes. Any route shape change needs matching client update or the contract drifts at runtime.

### 2. Rotate a secret

Three secrets:
- `hubspot-access-token` (HubSpot private app token used for API v3 calls)
- `greenhouse-integration-api-token` (Bearer token validated by mutation routes + used by service callback to Greenhouse)
- `hubspot-app-client-secret` (HMAC key for `/webhooks/hubspot` signature validation)

Rotation protocol (per `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`):

```bash
printf %s "$NEW_VALUE" | gcloud secrets versions add <secret-id> --data-file=-
```

Then redeploy the Cloud Run service so the new secret version is mounted:

```bash
ENV=production bash services/hubspot_greenhouse_integration/deploy.sh
# Or via GitHub Actions: workflow_dispatch on hubspot-greenhouse-integration-deploy.yml
```

**Critical:** rotating `greenhouse-integration-api-token` breaks the Vercel consumer until the same token is updated in Vercel env vars. Coordinate:

1. Generate new token.
2. Update Secret Manager + redeploy Cloud Run.
3. Update Vercel env `GREENHOUSE_INTEGRATION_API_TOKEN` → redeploy (or Vercel env is `GREENHOUSE_INTEGRATION_API_TOKEN_SECRET_REF` pointing to Secret Manager — verify what env model is active).
4. Smoke: `curl -H "Authorization: Bearer $NEW" <cloud_run>/contract`.

### 3. Add a new HubSpot custom property

Use the migrated helper:

```bash
python services/hubspot_greenhouse_integration/scripts/ensure_hubspot_company_properties.py \
    --spec <path-to-json>
```

(See `references/company_property_spec.example.json` for shape.)

Decision tree:
- If the field already exists as a HubSpot standard property (e.g. `industry`, `hubspot_owner_id`) → **do not** create a custom prop. Extend the mapping in `models.py` instead.
- If the field exists on another HubSpot object (contact, deal) but needs to live on company → decide if you backfill to company or expose via join.
- If genuinely new on company → run the script with a JSON spec.

After adding the property, update:
- `models.py::build_company_profile` to surface it.
- `src/lib/integrations/hubspot-greenhouse-service.ts` to type it in the response shape.

### 4. Deploy

**Automated (post-cutover):** push to `develop` or `main` with changes to `services/hubspot_greenhouse_integration/**` triggers `hubspot-greenhouse-integration-deploy.yml`. Workflow runs pytest → Cloud Build → Cloud Run deploy → smoke (`/health` + `/contract`).

**Manual:**
```bash
ENV=staging bash services/hubspot_greenhouse_integration/deploy.sh
ENV=production bash services/hubspot_greenhouse_integration/deploy.sh
```

Region is locked to `us-central1` (do NOT change — would break the public URL).

### 5. Webhook signature validation

`POST /webhooks/hubspot` validates with `validate_hubspot_request_signature()` supporting both v1 (legacy) and v3 (canonical) HubSpot signatures. Anti-replay window: `HUBSPOT_GREENHOUSE_WEBHOOK_MAX_AGE_MS` (default 300000ms = 5min).

If webhooks fail with 401: check `HUBSPOT_APP_CLIENT_SECRET` matches the app config in the HubSpot portal. The portal secret is set at `src/app/app-hsmeta.json` + installation state.

### 6. Smoke the bridge end-to-end

```bash
# Health + contract
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/contract

# Deal metadata (reads pipelines + stages)
curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/deals/metadata

# Read back a deal creation (requires auth)
curl -H "Authorization: Bearer $GREENHOUSE_INTEGRATION_API_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"name":"smoke-test","pipelineId":"default","stageId":"appointmentscheduled","ownerHubspotUserId":"..."}' \
  https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/deals

# BigQuery verification of arrived webhook events (sibling scope)
bq query 'SELECT count(*) FROM hubspot_crm.events WHERE DATE(receivedAt) = CURRENT_DATE()'
```

## Known rules and gotchas

- **Do not claim a deploy succeeded unless the smoke ran.** CI fails the workflow if `/health` or `/contract` don't return 200 within 15s — local runs should mimic this.
- **Do not change region.** The URL contains `-uc.a.run.app` (us-central1). Migration to `us-east4` invalidates the webhook URL registered in the HubSpot portal app config.
- **Do not bundle Python imports cross-service.** The service is self-contained. If you need shared code, duplicate locally; the `greenhouse_client.py` talks to Greenhouse via HTTP, not imports.
- **Do not alter the `try/except` import block at top of `app.py`.** It supports both `from .config import ...` (package import for tests) and `from config import ...` (standalone gunicorn). Breaking either breaks runtime or tests.
- **Sibling has a different `greenhouse_bridge.py`.** That file lives in `cesargrowth11/hubspot-bigquery/greenhouse_bridge.py` and is part of the BQ sync, NOT this Cloud Run. Do not conflate.

## References

- `services/hubspot_greenhouse_integration/README.md` — full route table + env var reference + local dev
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — service topology
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` — monorepo vs sibling ownership post-TASK-574
- `src/lib/integrations/hubspot-greenhouse-service.ts` — client TS + types shared with the bridge contract
- `references/workflows.md` (this skill dir) — exact command sequences for common ops
- `references/company_property_spec.example.json` (this skill dir) — input format for `ensure_hubspot_company_properties.py`
- `scripts/ensure_hubspot_company_properties.py` (this skill dir) — property lifecycle helper
