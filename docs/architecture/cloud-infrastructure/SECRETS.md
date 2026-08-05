# Cloud Infrastructure — Secret Manager + Auth Runtime GCP

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> Skill mandatoria para rotaciones: `greenhouse-secret-hygiene`. Postura de seguridad
> authoritative: [`GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`](../GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md).

## Contrato runtime `*_SECRET_REF` (TASK-124)

Helper canónico: `src/lib/secrets/secret-manager.ts`.

- Valor legacy: `<ENV_VAR>` · Referencia opcional: `<ENV_VAR>_SECRET_REF`
- Resolución efectiva: **Secret Manager → env fallback → unconfigured**
- `GET /api/internal/health` expone la postura de secretos críticos sin devolver valores.
- Capa auth alineada: `src/lib/auth-secrets.ts` resuelve `NEXTAUTH_SECRET`,
  `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`; PostgreSQL acepta
  `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF` (`src/lib/postgres/client.ts`); tooling soporta
  refs para `runtime`/`migrator`/`admin` (`scripts/lib/load-greenhouse-tool-env.ts`).
- Nubox: `NUBOX_BEARER_TOKEN_SECRET_REF` + `NUBOX_X_API_KEY_SECRET_REF` provisionados para
  Development, Preview, staging y Production.

## Protocolo de publicación de secretos (ISSUE-032)

- Publicar secretos scalar como **valor crudo**: sin comillas envolventes, sin `\n`/`\r`
  literal, sin whitespace residual.
- Patrón canónico:

  ```bash
  printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
  ```

- No usar `JSON.stringify`, copy/paste entre comillas ni blobs multilínea cuando el consumer
  espera un token/password simple.
- Después de cada versión nueva o rotación, **validar el consumer real** (auth:
  `/api/auth/providers`; webhooks: firma/HMAC; PostgreSQL: `pnpm pg:doctor`).
- Si el secreto afecta auth (`NEXTAUTH_SECRET`, client secrets OAuth), considerar el impacto de
  sesión/re-login. Rotaciones de auth: usar `pnpm secrets:rotate` (verify-before-cutover).

## Helper IAM binding para deploys Cloud Run (2026-06-06)

`gcloud secrets add-iam-policy-binding` puede devolver `409 concurrent policy changes` cuando
varios deploy scripts mutan bindings de los mismos secrets en paralelo. Contrato vigente:

- Los deploy scripts que otorgan `roles/secretmanager.secretAccessor` al runtime SA usan
  **`services/_shared/gcloud-secret-iam.sh`**.
- El helper verifica si el binding ya existe antes de mutar IAM; los `409`/`ABORTED` se
  reintentan con backoff acotado y jitter; errores permanentes fallan loud.
- No se imprimen valores de secretos, no se amplían roles, no se introducen SA keys.
- Consumers actuales: `services/ops-worker/deploy.sh`,
  `services/commercial-cost-worker/deploy.sh`,
  `services/hubspot_greenhouse_integration/deploy.sh`. Deploy scripts nuevos lo reutilizan en
  vez de reimplementar `add-iam-policy-binding` inline.

## Auth runtime GCP — orden efectivo

Capa canónica: `src/lib/google-credentials.ts`, `src/lib/cloud/gcp-auth.ts`,
`src/lib/cloud/postgres.ts`.

1. **Workload Identity Federation** en runtime real de Vercel (token OIDC efímero +
   `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL`)
2. Fallback a `GOOGLE_APPLICATION_CREDENTIALS_JSON` o `_BASE64`
3. `ambient ADC` cuando el entorno ya provee credenciales implícitas

Reglas:

- `VERCEL_OIDC_TOKEN` **no se persiste** en `.env*`; local/scripts/CLI no dependen de ese token
  (usan SA key o ADC).
- Consumers alineados: `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`,
  `src/lib/storage/greenhouse-media.ts`, `src/lib/ai/google-genai.ts`.
- WIF materializado en GCP: project number `183008134038`, pool `vercel`, provider
  `greenhouse-eo`, runtime SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`,
  bindings `roles/iam.workloadIdentityUser` para principals de development/preview/staging/
  production. (El WIF de CI/CD es otro pool: ver [CICD_WIF.md](CICD_WIF.md).)

## Inventario y adopción (as-of 2026-04-23: 29 secrets)

Highlights del inventario:

- PostgreSQL: `greenhouse-pg-dev-postgres-password`, `greenhouse-pg-dev-app-password`,
  `greenhouse-pg-dev-migrator-password`, `greenhouse-pg-dev-ops-password`
- Auth/session: `greenhouse-nextauth-secret-staging`, `greenhouse-nextauth-secret-production`,
  `greenhouse-google-client-secret-shared`, `greenhouse-azure-ad-client-secret-staging`,
  `greenhouse-azure-ad-client-secret-production`
- Integrations: `greenhouse-integration-api-token`, `hubspot-access-token`,
  `hubspot-app-client-secret`, `notion-token`, `scim-bearer-token`,
  `webhook-notifications-secret`

Patrón de adopción por runtime slice:

| Runtime slice | Posture |
| --- | --- |
| `ops-worker` | secretos montados desde Secret Manager |
| `commercial-cost-worker` | secretos montados desde Secret Manager |
| `hubspot-greenhouse-integration` | Secret Manager parcial |
| `notion-bq-sync` | Secret Manager para `NOTION_TOKEN` |
| `ico-batch-worker` | **password PostgreSQL en env plano** (gap) |
| legacy Functions | postura mixta; varias con tokens sensibles en env plano |

Rotation notes (as-of 2026-04-23): varios secretos críticos ya tienen `v2`; los passwords de
PostgreSQL siguen en `v1` sin evidencia de rotación posterior a marzo/abril 2026.

## Observability webhook

`SLACK_ALERTS_WEBHOOK_URL` sigue el patrón `Secret Manager → env fallback`
(`SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`). Fuera de alcance de ese rollout: `CRON_SECRET` y
`SENTRY_AUTH_TOKEN` de build.
