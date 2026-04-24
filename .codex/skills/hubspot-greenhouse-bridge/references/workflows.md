# Efeonce HubSpot Greenhouse Workflows

## Repo Paths

- HubSpot bridge repo:
  - `C:\Users\jreye\OneDrive - Efeonce Group SpA\Workspace\Devs\hubspot-bigquery`
- Greenhouse app repo:
  - `C:\Users\jreye\OneDrive - Efeonce Group SpA\Workspace\Devs\greenhouse-eo`

## Primary Files

### hubspot-bigquery

- `main.py`
- `greenhouse_bridge.py`
- `deploy.sh`
- `.env.yaml`
- `create_hubspot_properties.py`
- `backfill_company_capabilities_from_deals.py`
- `rotate_greenhouse_integration_secret.py`
- `project_context.md`
- `Tasks.md`
- `Handoff.md`
- `changelog.md`
- `skills/efeonce-hubspot-greenhouse-ops/scripts/ensure_hubspot_company_properties.py`

### greenhouse-eo

- `src/lib/integrations/greenhouse-integration.ts`
- `src/lib/admin/tenant-capabilities.ts`
- `src/app/api/integrations/v1/catalog/capabilities/route.ts`
- `src/app/api/integrations/v1/tenants/route.ts`
- `src/app/api/integrations/v1/tenants/capabilities/sync/route.ts`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Local Validation

Run these in `hubspot-bigquery`:

```powershell
python -m py_compile main.py greenhouse_bridge.py create_hubspot_properties.py backfill_company_capabilities_from_deals.py rotate_greenhouse_integration_secret.py
python -m unittest tests.test_greenhouse_bridge tests.test_main tests.test_backfill_company_capabilities_from_deals
```

If the Greenhouse repo changed:

```powershell
cd "C:\Users\jreye\OneDrive - Efeonce Group SpA\Workspace\Devs\greenhouse-eo"
npx pnpm lint src/lib/admin/tenant-capabilities.ts src/lib/integrations/greenhouse-integration.ts src/app/api/integrations/v1/tenants/capabilities/sync/route.ts
npx pnpm build
```

## GCP Auth Checks

Run before deploys or BigQuery inspection:

```powershell
gcloud config get-value project
gcloud auth list --filter=status:ACTIVE
gcloud auth print-access-token > $null
gcloud auth application-default print-access-token > $null
```

If auth is stale, refresh with:

```powershell
gcloud auth login --update-adc
```

## Deploy Cloud Function

From `hubspot-bigquery`:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' deploy.sh
```

## HubSpot App / Property Operations

Upload the HubSpot project after scope changes:

```powershell
hs project upload
```

Bootstrap properties:

```powershell
python create_hubspot_properties.py
```

For generic company-property requests coming from Greenhouse:

```powershell
python skills\efeonce-hubspot-greenhouse-ops\scripts\ensure_hubspot_company_properties.py --spec skills\efeonce-hubspot-greenhouse-ops\references\company_property_spec.example.json --validate-only
python skills\efeonce-hubspot-greenhouse-ops\scripts\ensure_hubspot_company_properties.py --spec skills\efeonce-hubspot-greenhouse-ops\references\company_property_spec.example.json
python skills\efeonce-hubspot-greenhouse-ops\scripts\ensure_hubspot_company_properties.py --spec skills\efeonce-hubspot-greenhouse-ops\references\company_property_spec.example.json --apply
```

Decision rule before creating anything:

- If Greenhouse asks for a standard HubSpot company field such as `industry` or `hubspot_owner_id`, reuse that existing property and extend the mapping or outbound payload. Do not create a duplicate custom property.
- Only create a custom company property when the requested field does not already exist in `companies` and Greenhouse truly needs a company-level source of truth.

Backfill company capabilities from associated deals:

```powershell
python backfill_company_capabilities_from_deals.py
python backfill_company_capabilities_from_deals.py --apply
```

Operational rules:

- If HubSpot returns `403 requires [companies-write]`, the live installation/token is still wrong even if local metadata is correct.
- If property creation depends on new scopes, refresh or reinstall the app and rotate the static token before retrying.

## Greenhouse Token Rollout

Rotate the deployed GCP secret from `hubspot-bigquery`:

```powershell
python rotate_greenhouse_integration_secret.py --token "REDACTED" --redeploy
```

Operational sequence:

1. Rotate the integration token in Vercel for `greenhouse-eo`.
2. Update the same token in GCP Secret Manager.
3. Redeploy `hubspot-bq-sync`.
4. Run smoke tests from the deployed function.

## Bridge Smoke Tests

### Health

```powershell
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=health" -Method Get | ConvertTo-Json -Depth 10
```

### Catalog

```powershell
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=catalog" -Method Get | ConvertTo-Json -Depth 10
```

### Resolve tenant by canonical HubSpot selector

```powershell
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=resolve_tenants&sourceSystem=hubspot_crm&sourceObjectType=company&sourceObjectId=30825221458" -Method Get | ConvertTo-Json -Depth 10
```

### Dry run from HubSpot companies

```powershell
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=sync_companies&dryRun=true" -Method Post -ContentType "application/json" -Body "{}" | ConvertTo-Json -Depth 10
```

### Real push from HubSpot companies

```powershell
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=sync_companies" -Method Post -ContentType "application/json" -Body "{}" | ConvertTo-Json -Depth 10
```

### Provider-neutral payload

```powershell
$body = @{
  records = @(
    @{
      sourceSystem = 'hubspot_crm'
      sourceObjectType = 'company'
      sourceObjectId = '30825221458'
      clientId = 'hubspot-company-30825221458'
      publicId = 'EO-30825221458'
      businessLines = @('globe')
      serviceModules = @('agencia_creativa')
      metadata = @{
        companyName = 'Sky Airline'
        domain = 'skyairline.com'
      }
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=sync_capabilities&dryRun=true" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri "https://hubspot-bq-sync-y6egnifl6a-uc.a.run.app?bridge=greenhouse&action=sync_capabilities" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

## BigQuery Verification

When the local `bq` CLI is unreliable, use Python with ADC:

```powershell
@'
from google.cloud import bigquery
client = bigquery.Client(project='efeonce-group')
query = """
SELECT status, source_object_id, idempotency_key, synced_at
FROM `efeonce-group.hubspot_crm.integration_bridge_log`
WHERE action = 'push_capabilities'
ORDER BY synced_at DESC
LIMIT 20
"""
for row in client.query(query).result():
    print(f"{row.status}\t{row.source_object_id}\t{row.idempotency_key}\t{row.synced_at}")
'@ | python -
```

Useful verification targets:

- `hubspot_crm.integration_bridge_log`
- `hubspot_crm.greenhouse_capability_catalog`
- `hubspot_crm.greenhouse_capability_catalog_history`
- `hubspot_crm.greenhouse_tenant_pulls`

## Contract Rules

- Capability source of truth is HubSpot `companies`, not `deals`.
- Canonical HubSpot selector is `hubspot_crm/company/<hubspot_company_id>`.
- Greenhouse route body for sync is `{target, sync}`.
- `dryRun=true` should log as `dry_run`, not `success`.
- This Cloud Function is a batch sync plus constrained bridge, not a generic HubSpot API facade.
