# ISSUE-028 — HubSpot Cloud Run service devuelve 401: Private App Token expirado

## Ambiente

staging + production

## Detectado

2026-04-07, usuario (error toast al hacer sync HubSpot en Organization Detail de Sky Airline)

## Síntoma

Al presionar el botón de sincronización HubSpot en la vista de organización, aparece un toast con error:

```
HubSpot integration service returned 401 for /companies/30825221458/contacts:
{"error":"Authentication credentials not found. This API supports OAuth 2.0 authentication","status_code":401}
```

Todos los endpoints del Cloud Run service que llaman a la API de HubSpot devuelven 401 (company profile, contacts, owner, services). Solo `/health` y `/contract` funcionan porque no llaman a HubSpot.

## Causa raíz

El **Private App Token** de HubSpot almacenado en Google Secret Manager (`hubspot-access-token`, version 1) fue revocado o expiró.

El Cloud Run service `hubspot-greenhouse-integration` (en `us-central1`) usa este token via `--set-secrets=HUBSPOT_ACCESS_TOKEN=hubspot-access-token:latest` para autenticarse con la API de HubSpot. Al ser inválido, toda llamada a `api.hubapi.com` devuelve 401.

## Impacto

- **Sync HubSpot** en Organization Detail: no funciona (botón lanza error)
- **HubSpot live context** en Configuration tab: company profile, contacts, owner, services no cargan
- **Webhooks HubSpot → Greenhouse**: si están configurados, también fallarían al intentar callback

No afecta datos ya sincronizados en PostgreSQL (organization_360, person_memberships con source=hubspot). Solo afecta la lectura en tiempo real del CRM.

## Solución

1. Se generó un nuevo Private App Token en HubSpot portal 48713323 (Settings > Integrations > Private Apps)
2. Se actualizó el secret en Google Secret Manager:
   ```bash
   echo -n "<new-token>" | gcloud secrets versions add hubspot-access-token --data-file=- --project=efeonce-group
   ```
   Creó version 2 del secret.
3. Se forzó update del Cloud Run service para tomar la nueva versión:
   ```bash
   gcloud run services update hubspot-greenhouse-integration --region=us-central1 --project=efeonce-group
   ```

## Verificación

```bash
# Cloud Run service devuelve datos (antes: 401)
curl -s 'https://hubspot-greenhouse-integration-183008134038.us-central1.run.app/companies/30825221458' | jq .identity.name
# → "Sky Airline"

curl -s 'https://hubspot-greenhouse-integration-183008134038.us-central1.run.app/companies/30825221458/contacts' | jq .count
# → 17
```

## Estado

resolved

## Relacionado

- Cloud Run service source: `cesargrowth11/hubspot-bigquery` → `services/hubspot_greenhouse_integration/`
- Greenhouse client: `src/lib/integrations/hubspot-greenhouse-service.ts`
- Sync endpoint: `src/app/api/organizations/[id]/hubspot-sync/route.ts`
- Secret Manager: `projects/efeonce-group/secrets/hubspot-access-token` (version 2)
- Incidente similar anterior: ISSUE-016 (Microsoft SSO secret rotation)
