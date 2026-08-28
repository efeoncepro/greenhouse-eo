---
name: hubspot-greenhouse-bridge
description: 'Operate the HubSpot ↔ Greenhouse write bridge Cloud Run service (`services/hubspot_greenhouse_integration/`, Python 3.12 + Flask) and its human-readable operational Deal register. Use when reviewing CRM deal state; adding/modifying HTTP routes, webhook handlers or HubSpot custom properties; rotating secrets; deploying via GitHub Actions WIF; or running end-to-end smokes across HubSpot + Cloud Run + Greenhouse. Post TASK-574 (2026-04-24) this lives in the monorepo; older evidence may reference cesargrowth11/hubspot-bigquery.'
---

# HubSpot Greenhouse Bridge Ops

Operate the Cloud Run service that bridges HubSpot CRM writes/webhooks ↔ `greenhouse-eo` runtime. The service is a Python Flask proxy with 23 HTTP routes + a webhook handler validated via HMAC. Its physical location is `greenhouse-eo/services/hubspot_greenhouse_integration/` (TASK-574 cutover 2026-04-24). The public Cloud Run URL `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` is stable across the cutover — Vercel consumers did not need config changes.

## System boundary (don't mix these up)

| System                                                                                                             | Lives in                                                                                                                                                                                                                                                                                                                              | Canonical authority                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **HubSpot portal app** (v2025.2): OAuth scopes (`app-hsmeta.json`), webhook subscriptions (`webhooks-hsmeta.json`) | **MONOREPO** `greenhouse-eo/services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/` (`hsproject.json` + `src/app/`). Deploy: `hs project upload --account=48713323` desde ese dir.                                                                                                                                     | HubSpot Developer Platform                                                     |
| **HubSpot → BigQuery CRM sync** (Cloud Function `hubspot-bq-sync`, `main.py`)                                      | **`cesargrowth11/hubspot-bigquery`** (sibling, **NO transferido** — verificado vía gh API 2026-06-04: sin redirect, owner=cesargrowth11, y `efeoncepro/hubspot-bigquery` no existe). OJO: el que SÍ se transfirió a `efeoncepro/` fue **`notion-bigquery`** (el sync de **Notion**, no HubSpot — changelog 2026-05-18). No confundir. | GCP Cloud Function + BigQuery `hubspot_crm.*`                                  |
| **HubSpot write bridge + webhooks** (Cloud Run `hubspot-greenhouse-integration`, 23 routes)                        | `greenhouse-eo/services/hubspot_greenhouse_integration/`                                                                                                                                                                                                                                                                              | **this skill** owns this system                                                |
| **Greenhouse runtime** (Next.js on Vercel)                                                                         | `greenhouse-eo/src/**`                                                                                                                                                                                                                                                                                                                | `src/lib/integrations/hubspot-greenhouse-service.ts` is the canonical client   |
| **Secret Manager** (3 secrets)                                                                                     | GCP project `efeonce-group`                                                                                                                                                                                                                                                                                                           | Runtime SA `greenhouse-portal@` reads at boot                                  |
| **Kortex HubSpot CMS / Content Hub operations**                                                                    | `greenhouse-eo/docs/architecture/kortex/hubspot-cms/` + Kortex control plane                                                                                                                                                                                                                                                          | Kortex OAuth runtime + HubSpot Developer Platform; this skill only cross-links |

Confusing ownership is the #1 bug source. Always ask: "which system above owns this change?" before touching code or config.

## Registro operativo general de negocios

Antes de responder en qué está un negocio, lee `docs/commercial/CRM_DEAL_REGISTER.md` para obtener el índice
rápido y confirma el estado live en HubSpot. El archivo no reemplaza el CRM: resume Deal, Company, movimiento
`Core`/`Strategic Bet`, pipeline, stage, owner, cierre y próximo paso después del readback.

Reglas:

1. Una fila requiere un Deal HubSpot verificado; leads o radares sin Deal permanecen en su registro de origen.
2. Nunca crees una Company, Contact o asociación para completar el Markdown. Primero aplica el flujo gobernado
   `propose → confirm → write → readback`; luego actualiza el registro con IDs observados.
3. Toda mutación de Deal, Company, asociaciones, owner, amount, `closedate`, pipeline, stage, bucket o resultado
   exige actualizar `docs/commercial/CRM_DEAL_REGISTER.md` después del readback.
4. Para una licitación, actualiza además `docs/commercial/tenders/LICITATION_CRM_REGISTER.md` con el mismo
   `deal_id`; este último conserva bid/no-bid, bases, plazo oficial y comprobante de postulación.
5. Los negocios históricos no aparecen automáticamente: ausencia del registro no significa ausencia en HubSpot.

## Related but separate: Kortex HubSpot CMS / Content Hub

Use `docs/architecture/kortex/hubspot-cms/` for Kortex-backed HubSpot Content Hub / CMS work: landing pages, CMS Pages API, templates, modules, CMS React, Developer Projects, and portal-specific access notes.

Hard boundary:

- Do **not** use or rotate `hubspot-access-token` for Kortex/ANAM CMS operations. That secret belongs to the Greenhouse HubSpot bridge/private app path.
- Kortex portal-scoped OAuth is the runtime path for ANAM (`hubspot_portal_id=19893546`, active as of 2026-07-02).
- HubSpot CLI asset work for ANAM needs a separate CLI account/auth profile, e.g. `hs account auth --account anam-19893546`; do not replace the existing Efeonce profile.
- Landing-page creation via API must be draft-first (`state: DRAFT`). Publishing, scheduling, archiving, deleting, replacing templates, or overwriting modules/themes requires explicit operator approval.
- Treat page/content payloads as reviewed artifacts: inspect inventory/templates first, create draft, preview/validate, then publish only as a separate approved step.

## Canonical operational paths

### 1. Add/modify an HTTP route on the bridge

1. Edit `services/hubspot_greenhouse_integration/app.py` (route decorator + handler).
2. If the route is surface-visible, update `contract.py` (returned by `GET /contract`).
3. If the route uses a new HubSpot response shape, update `models.py` (build\_\*\_profile functions).
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

**Automated (post-cutover):** push to `develop` with changes to `services/hubspot_greenhouse_integration/**` triggers staging deploy. Production deploy is owned by `production-release.yml` via `workflow_call`; `workflow_dispatch` is break-glass only. Workflow runs pytest → Cloud Build → Cloud Run deploy → smoke (`/health` + `/contract`).

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

## Public tender intake — discovered contract, not shipped

For a deal sourced from LicitaLAB, first load `greenhouse-public-private-tenders` and its
`licitalab-radar-playwright.md` companion. LicitaLAB is a public-tender source only. Treat the following as the
target CRM contract discovered against portal `48713323` on 2026-08-28; re-read live properties and pipeline
metadata before any write because portal configuration can drift.

The deal projection uses these existing HubSpot properties:

| Property                        | Meaning                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `id_de_licitacion`              | Canonical public tender ID. Normalize case and surrounding whitespace for duplicate checks. |
| `ficha_de_licitacion`           | Direct LicitaLAB opportunity URL used to return quickly to the application screen.          |
| `fecha_de_cierre_de_licitacion` | Official submission deadline from the tender source.                                        |
| `closedate`                     | Expected commercial resolution/close date. It is independent from the submission deadline.  |
| `modalidad_de_venta`            | Public mechanism, normally `Licitación` or `Compra ágil`.                                   |
| `dealtype`                      | `newbusiness` or `existingbusiness`.                                                        |
| `pipeline_bucket`               | `Core Pipeline`, `Strategic Bets`, or `Opportunistic / Administrative`.                     |
| `gh_idempotency_key`            | Stable retry key, for example `hubspot-public-tender:CL:<normalized-id>`.                   |

Apply this identity and association sequence before creation:

1. Search exact normalized `id_de_licitacion` and the stable `gh_idempotency_key`. If either resolves one deal,
   update/reuse it; if they conflict or return more than one, stop for reconciliation.
2. Resolve the buyer first in Greenhouse Organization/Party using its public tax identifier, then map/reuse the
   HubSpot Company through `gh_commercial_party_id`. An exact legal name plus a specific institutional domain is
   only a fallback. A generic shared domain such as `gob.cl` is not an identity key.
3. Never create a duplicate Company merely to satisfy deal creation. Never fabricate a Contact. Associate a real
   verified Contact when one exists; otherwise keep the deal associated to the Company and leave the contact gap
   explicit.
4. Ensure Deal↔Company, Deal↔Contact when applicable, and Contact↔Company associations idempotently. Read back the
   deal properties and associations after the write.

Classify Core versus Bet with customer relationship first, not the procurement mechanism alone:

- existing customer / expansion / renewal → `dealtype=existingbusiness` and `pipeline_bucket=Core Pipeline`;
- new-account public `Licitación` → `dealtype=newbusiness` and `pipeline_bucket=Strategic Bets`;
- new-account `Compra ágil` → `policy_required` until the operator defines whether it is Strategic or
  Opportunistic; do not infer it from historical records.

For public tenders that pass human selection, GO, and basic admissibility, create the deal in `Pipeline de ventas`
(`pipeline='default'`) at `Calificado para comprar` (`dealstage='qualifiedtobuy'`, live probability 25%). Do not use
`appointmentscheduled` as the default because a tender does not imply a commercial meeting. Do not use the
`HubSpot Shared Selling Pipeline`; it belongs to co-selling/deal registration. Advance tender deals as follows:
`presentationscheduled` for the technical offer, optional `1356915244` only for a requested sample/pilot,
`decisionmakerboughtin` for completed pricing and terms, `contractsent` after award while formalization is pending,
then `closedwon` or `closedlost` from verified outcome evidence. Raw radar candidates remain outside HubSpot.

Writes follow `propose → confirm → write → readback`. Discovery and ranking remain read-only. The current
`POST /deals` bridge is insufficient for this flow: it accepts only `origin='greenhouse_quote_builder'`, expects an
existing Company, supports at most one optional Contact, and does not carry the tender fields or ensure
Contact↔Company. A governed implementation must extend `app.py`, `contract.py`, tests, and
`src/lib/integrations/hubspot-greenhouse-service.ts` together; add Company/Contact resolution and all three
association paths; and obtain the required ADR/external-API approval. Do not bypass the bridge with direct CRM
writes.

Historical snapshot, useful only as migration evidence: 99 LicitaLAB deals were found; 97 had a different tender
deadline and commercial close date, 86 had no associated Contact, and their buckets were 94 Opportunistic, 4 Core,
and 1 Strategic. Stage distribution was 95 `closedlost`, 3 `closedwon`, 1 `appointmentscheduled`, and 0 in every
intermediate stage. These inconsistencies are why historical bucket and stage values are not policy.

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
- `docs/architecture/kortex/hubspot-cms/README.md` — Kortex + HubSpot CMS / Content Hub documentation index
- `docs/architecture/kortex/hubspot-cms/developer-platform-research.md` — HubSpot CMS developer platform research
- `docs/architecture/kortex/hubspot-cms/landing-page-runbook.md` — draft-first landing page runbook
- `docs/architecture/kortex/hubspot-cms/anam-portal-access.md` — ANAM portal OAuth install/access notes
- `src/lib/integrations/hubspot-greenhouse-service.ts` — client TS + types shared with the bridge contract
- `references/workflows.md` (this skill dir) — exact command sequences for common ops
- `references/company_property_spec.example.json` (this skill dir) — input format for `ensure_hubspot_company_properties.py`
- `scripts/ensure_hubspot_company_properties.py` (this skill dir) — property lifecycle helper
