# TASK-096 — GCP Secret Management & Security Hardening

## Delta 2026-03-29

- La capa Cloud ahora ya expone postura runtime GCP en `src/lib/cloud/gcp-auth.ts`.
- `GET /api/internal/health` ya existe y puede reportar la postura base de auth/runtime como parte de la validación posterior de esta task.
- Esta task ya no parte solo desde `google-credentials.ts`; ahora puede apoyarse en la capa Cloud institucional.

## Delta 2026-03-29 — Baseline WIF-aware implementado en repo

- `TASK-096` pasó a `in-progress`.
- El repo quedó con baseline WIF-aware sin hacer bigbang:
  - `src/lib/google-credentials.ts` ahora resuelve `wif | service_account_key | ambient_adc`
  - `src/lib/bigquery.ts` usa el helper canónico
  - `src/lib/postgres/client.ts` usa `createGoogleAuth()` con Cloud SQL Connector y mantiene password runtime
  - `src/lib/storage/greenhouse-media.ts` usa el helper canónico para Storage
  - `src/lib/ai/google-genai.ts` consume `googleAuthOptions` directamente y ya no escribe credenciales a `/tmp`
- Scripts que seguían parseando `GOOGLE_APPLICATION_CREDENTIALS_JSON` manualmente también quedaron alineados al helper central:
  - `scripts/check-ico-bq.ts`
  - `scripts/backfill-ico-to-postgres.ts`
  - `scripts/materialize-member-metrics.ts`
  - `scripts/backfill-task-assignees.ts`
  - `scripts/backfill-postgres-payroll.ts`
  - `scripts/admin-team-runtime-smoke.ts`
- Validación ejecutada en repo:
  - `pnpm exec eslint ...` sobre runtime/scripts tocados
  - `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
- Pendiente para cerrar la task:
  - validar preview/staging reales con OIDC runtime antes de retirar la SA key
  - cerrar Fase 1 externa de Cloud SQL (`authorizedNetworks`, SSL, `requireSsl`)

## Delta 2026-03-29 — Rollout externo WIF fase controlada

- Se creó el pool real `vercel` y el provider `greenhouse-eo` en `efeonce-group`.
- `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` ya quedó bindada con `roles/iam.workloadIdentityUser` para principals de Vercel en:
  - `development`
  - `preview`
  - `staging`
  - `production`
- Vercel ya tiene cargadas las variables:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
- `src/lib/google-credentials.ts` se ajustó para leer el token OIDC desde `@vercel/oidc`, no depender solo de `process.env.VERCEL_OIDC_TOKEN`.
- Validación externa ejecutada sin SA key:
  - BigQuery OK
  - Cloud SQL Connector OK con `SELECT 1::int as ok`
- Validación real en preview Vercel:
  - se completó el env set mínimo de `feature/codex-task-096-wif-baseline`
  - se redeployó el preview
  - `/api/internal/health` respondió `200 OK` con:
    - `auth.mode=wif`
    - BigQuery reachable
    - Cloud SQL reachable vía connector
- Drift detectado durante la validación:
  - `vercel env pull` devolvió algunos valores con sufijo literal `\n`
  - ese drift ya fue saneado en los targets activos del rollout WIF/conector
  - `dev-greenhouse.efeoncepro.com` ya quedó confirmado como `target=staging`
  - tras redeploy del staging activo, health respondió con `auth.mode=mixed` y `usesConnector=true`
  - staging sigue pendiente de absorber el baseline WIF final porque aún corre código previo de `develop` (`version=7a2ecec`)
  - decisión operativa: no desplegar la feature branch al entorno compartido; cerrar esta fase por merge a `develop` y revalidación de staging
  - no se endurece Cloud SQL hasta completar esa validación en staging compartido
  - estado posterior:
    - `develop` ya recibió el lote limpio de `TASK-096`
    - el deploy manual de ese árbol a `staging` falló dos veces en Vercel con `Unexpected error`
    - `inspect --format json` devolvió `readyState=ERROR` con build `READY`
    - esto se trata como bloqueo operativo externo antes de seguir con retiros de SA key o hardening de Cloud SQL

## Delta 2026-03-29 — Staging compartido validado sin SA key

- El rollout compartido ya quedó validado sobre `develop`:
  - el dominio `dev-greenhouse.efeoncepro.com` ahora sirve `version=796f5e5`
  - el redeploy activo es `greenhouse-j8884qwf1-efeonce-7670142f.vercel.app`
  - `vercel redeploy <deployment-ready> --target staging` funcionó como mecanismo seguro para completar el cutover
- Cambio externo aplicado en `staging`:
  - se removió `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - se mantuvieron `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL` y `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
- Validación compartida ejecutada sobre `dev-greenhouse.efeoncepro.com`:
  - `GET /api/internal/health` respondió `200 OK`
  - `auth.mode=wif`
  - `serviceAccountKeyConfigured=false`
  - BigQuery reachable
  - Cloud SQL reachable vía connector
  - `GET /api/auth/session` respondió `{}` sin error de NextAuth
- Estado transicional actualizado:
  - `Preview` puede seguir usando SA key fallback cuando una rama todavía no valida WIF end-to-end
  - `Staging` ya quedó WIF-only y validado
  - `Production` sigue pendiente antes de cerrar la fase externa de esta task
  - Cloud SQL sigue pendiente de hardening externo (`authorizedNetworks`, `sslMode`, `requireSsl`)

## Delta 2026-03-29 — Production validado sin SA key

- Se promovió a `main` un lote mínimo de runtime para no arrastrar UI/Nexa:
  - `src/lib/google-credentials.ts`
  - `src/lib/bigquery.ts`
  - `src/lib/postgres/client.ts`
  - `src/lib/storage/greenhouse-media.ts`
  - `src/lib/ai/google-genai.ts`
  - `src/lib/cloud/*`
  - `src/app/api/internal/health/route.ts`
  - `package.json` / `pnpm-lock.yaml`
- Validación local del lote mínimo sobre árbol limpio basado en `origin/main`:
  - `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts src/lib/cloud/postgres.test.ts src/lib/cloud/bigquery.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec eslint ...` sobre runtime cloud/WIF
  - `pnpm build`
- `Production` ya corre `version=74bb5a1`.
- El inventario actual de Vercel `Production` ya no incluye `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- Tras redeploy de `greenhouse.efeoncepro.com`, la validación real respondió:
  - `GET /api/internal/health` → `200 OK`
  - `auth.mode=wif`
  - `selectedSource=wif`
  - `serviceAccountKeyConfigured=false`
  - BigQuery reachable
  - Cloud SQL reachable vía connector
  - `GET /api/auth/session` → `{}`
- Estado final de la fase WIF:
  - `Preview`: fallback legado permitido
  - `Staging`: WIF-only validado
  - `Production`: WIF-only validado
  - pendiente de la task: hardening externo de Cloud SQL

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementación` |
| Rank | — |
| Domain | Infrastructure / Security |

## Summary

Hardening progresivo de la gestión de secretos y autenticación GCP en Greenhouse EO. Tres fases: (1) restringir red Cloud SQL + forzar SSL, (2) adoptar Workload Identity Federation vía Vercel OIDC para eliminar la SA key estática, (3) migrar los 6 secretos más críticos a GCP Secret Manager.

## Why This Task Exists

Greenhouse maneja datos de payroll, compensaciones, identidad de colaboradores, facturación tributaria (Nubox/SII), y finanzas — todo autenticado con una única service account key JSON almacenada como variable de entorno sin rotación. El análisis de marzo 2026 identificó:

| Riesgo | Severidad | Estado actual |
|--------|-----------|---------------|
| SA key estática con acceso total a GCP (BigQuery, Cloud SQL, Storage, Vertex AI) | **Alto** | JSON completo en `GOOGLE_APPLICATION_CREDENTIALS_JSON` — nunca expira |
| Cloud SQL abierto a internet (`0.0.0.0/0`) | **Crítico** | Sin restricción de red |
| SSL no forzado en Cloud SQL | **Medio** | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` |
| 3 passwords de Postgres en env vars planos | **Medio** | Runtime, migrator, admin — rotación manual |
| `NEXTAUTH_SECRET` en env var | **Medio** | Permite forjar sesiones si se filtra |
| `NUBOX_BEARER_TOKEN` en env var | **Medio** | Puede crear documentos tributarios en SII |
| Secret Manager solo en 2 de 10 Cloud Functions | **Bajo** | Adopción parcial, inconsistente |

### Inventario completo de secretos (18 total)

| # | Secreto | Categoría | Blast radius | Fase objetivo |
|---|---------|-----------|--------------|---------------|
| 1 | `GOOGLE_APPLICATION_CREDENTIALS_JSON` | GCP SA Key | **Total** — BigQuery, Cloud SQL, Storage, Vertex AI | Fase 2 (eliminar) |
| 2 | `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` | GCP SA Key | **Total** (variante base64) | Fase 2 (eliminar) |
| 3 | `GREENHOUSE_POSTGRES_PASSWORD` | Database | Runtime app DB access | Fase 3 |
| 4 | `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` | Database | Schema migration DDL | Fase 3 |
| 5 | `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` | Database | Full admin access | Fase 3 |
| 6 | `NEXTAUTH_SECRET` | Auth | Session forgery | Fase 3 |
| 7 | `AZURE_AD_CLIENT_SECRET` | OAuth | Azure AD compromise | Fase 3 |
| 8 | `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth compromise | Mantener en Vercel |
| 9 | `RESEND_API_KEY` | Email | Spam/phishing | Mantener en Vercel |
| 10 | `GREENHOUSE_INTEGRATION_API_TOKEN` | Integration | Portal API access | Mantener en Vercel |
| 11 | `CRON_SECRET` | Auth | Cron job invocation | Mantener en Vercel |
| 12 | `HR_CORE_TEAMS_WEBHOOK_SECRET` | Integration | Teams webhook | Mantener en Vercel |
| 13 | `GCP_ACCESS_TOKEN` | GCP | Deprecated OAuth refresh | Eliminar |
| 14 | `NUBOX_BEARER_TOKEN` | Integration | Documentos tributarios SII | Fase 3 |
| 15 | `NUBOX_X_API_KEY` | Integration | Dual-auth Nubox | Mantener en Vercel |
| 16 | `VERCEL_OIDC_TOKEN` | Platform | Auto-inyectado, no usado | Fase 2 (activar) |
| 17 | `GREENHOUSE_MEDIA_BUCKET` | Config | No es secreto | N/A |
| 18 | `GCP_PROJECT` | Config | No es secreto | N/A |

## Goal

Reducir el riesgo de compromiso de credenciales de **Alto** a **Bajo** sin agregar overhead operativo desproporcionado para un equipo de 1 developer. El 80% de la reducción de riesgo viene de las Fases 1 y 2; la Fase 3 es incremental.

## Architecture Alignment

- Fuente canónica GCP: `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- Modelo de acceso PostgreSQL: `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- Infraestructura Cloud: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Credential loading actual: `src/lib/google-credentials.ts`
- BigQuery client: `src/lib/bigquery.ts`
- PostgreSQL client: `src/lib/postgres/client.ts`
- Cloud Storage client: `src/lib/storage/greenhouse-media.ts`
- Vertex AI client: `src/lib/ai/google-genai.ts`

## Dependencies & Impact

- **Depende de:**
  - Acceso admin a GCP Console (`efeonce-group` project)
  - Acceso admin a Vercel (environment variables management)
  - `google-auth-library` v10.6.1+ (ya instalada, soporta WIF)
  - `@google-cloud/cloud-sql-connector` (ya instalado)
  - Cloud SQL instance `greenhouse-pg-dev` admin access
- **Impacta a:**
  - Todas las API routes que usan BigQuery, PostgreSQL, o Cloud Storage
  - Cloud Run services (notion-bq-sync, hubspot-bq-sync, etc.) — solo si se estandariza SA
  - Scripts de backfill en `scripts/` que usan GCP credentials
  - `src/lib/ai/google-genai.ts` — Vertex AI temp file workaround
  - CI/CD: preview deployments necesitan funcionar con WIF
- **Archivos owned:**
  - `src/lib/google-credentials.ts` (refactor principal)
  - `src/lib/secrets/secret-manager.ts` (nuevo — Fase 3)
  - `scripts/setup-gcp-workload-identity.sh` (nuevo — Fase 2)
  - `docs/architecture/GREENHOUSE_SECRET_MANAGEMENT_V1.md` (nuevo — spec)

## Current Repo State

### Cómo se cargan las credenciales hoy

```
src/lib/google-credentials.ts
  → getGoogleAuthOptions() / createGoogleAuth()
  → Resuelve source efectivo: wif | service_account_key | ambient_adc
  → Mantiene getGoogleCredentials() como fallback legado de SA key

src/lib/bigquery.ts
  → new BigQuery(getGoogleAuthOptions())

src/lib/postgres/client.ts
  → createGoogleAuth({ scopes: ['sqlservice.admin'] })
  → Cloud SQL Connector + password runtime (no IAM DB auth todavía)

src/lib/storage/greenhouse-media.ts
  → new GoogleAuth(getGoogleAuthOptions({ scopes: ['devstorage.read_write'] }))

src/lib/ai/google-genai.ts
  → GoogleGenAI({ vertexai: true, googleAuthOptions })
  → sin archivo temporal de credenciales
```

### Topología de deploy actual

```
Vercel (Next.js 16)
  ├─ Production  → main   → greenhouse.efeoncepro.com
  ├─ Staging     → develop → dev-greenhouse.efeoncepro.com
  └─ Preview     → feature/* → *.vercel.app
       │
       ├── Cloud SQL (us-east4) ← WIF-ready connector + runtime password
       ├── BigQuery (US)        ← WIF-aware helper / SA key fallback
       ├── Cloud Storage        ← WIF-aware helper / SA key fallback
       └── Vertex AI            ← WIF-aware helper / SA key fallback / ADC
```

### Servicios GCP que autentican independientemente

| Servicio | Auth actual | Secret Manager |
|----------|-------------|----------------|
| notion-bq-sync (Cloud Run) | Runtime SA (implicit) | No |
| hubspot-bq-sync (Cloud Function) | Runtime SA (implicit) | Sí (parcial) |
| hubspot-greenhouse-integration (Cloud Run) | Runtime SA | No |
| hubspot-notion-deal-sync (Cloud Function) | Runtime SA | No |
| notion-hubspot-reverse-sync (Cloud Function) | Runtime SA | No |
| notion-frameio-sync (Cloud Function) | Runtime SA | No |
| notion-teams-notify (Cloud Function) | Runtime SA | Sí (MS_CLIENT_SECRET, NOTION_TOKEN) |

---

## Scope

### Fase 1 — Cloud SQL Network Hardening (CRITICAL, ~2h)

**Objetivo:** Cerrar el vector de ataque más expuesto — Cloud SQL accesible desde cualquier IP.

#### Slice 1.1 — Restringir Authorized Networks

1. En GCP Console → Cloud SQL → `greenhouse-pg-dev` → Connections:
   - Remover `0.0.0.0/0`
   - Agregar Vercel egress IP ranges (documentados en Vercel docs)
   - Agregar Cloud Run egress IP (si hay VPC connector) o dejar Private IP para Cloud Run
   - Agregar IP de desarrollo local (VPN o IP fija del developer)
2. Verificar que Vercel deployments siguen conectando correctamente
3. Verificar que Cloud Run services siguen conectando

#### Slice 1.2 — Forzar SSL

1. En Cloud SQL → `greenhouse-pg-dev` → Connections → SSL:
   - Cambiar de `ALLOW_UNENCRYPTED_AND_ENCRYPTED` a `ENCRYPTED_ONLY`
2. Verificar que `GREENHOUSE_POSTGRES_SSL=true` está configurado en todos los ambientes Vercel
3. Verificar que Cloud SQL Connector maneja SSL automáticamente (debería — usa certificados internos)

#### Slice 1.3 — Documentar

1. Actualizar `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` con la nueva config de red
2. Documentar las IPs autorizadas y el proceso para agregar nuevas

### Fase 2 — Workload Identity Federation (HIGH IMPACT, ~1 semana)

**Objetivo:** Eliminar la SA key estática. Vercel autentica a GCP usando tokens OIDC efímeros que expiran en minutos.

```
Hoy:    Vercel → SA JSON key (never expires) → GCP APIs
Futuro: Vercel → OIDC token (expires in minutes) → WIF Pool → GCP APIs
```

#### Slice 2.1 — Setup GCP Workload Identity Pool

1. Crear script `scripts/setup-gcp-workload-identity.sh`:
   ```bash
   # Crear Workload Identity Pool
   gcloud iam workload-identity-pools create greenhouse-vercel-pool \
     --location="global" \
     --display-name="Greenhouse Vercel Pool"

   # Crear Provider para Vercel OIDC
   gcloud iam workload-identity-pools providers create-oidc vercel-provider \
     --location="global" \
     --workload-identity-pool="greenhouse-vercel-pool" \
     --issuer-uri="https://oidc.vercel.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.project_id=assertion.project_id" \
     --attribute-condition="assertion.iss == 'https://oidc.vercel.com'"

   # Bind SA impersonation
   gcloud iam service-accounts add-iam-policy-binding \
     greenhouse-runtime@efeonce-group.iam.gserviceaccount.com \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/greenhouse-vercel-pool/*"
   ```
2. Ejecutar en GCP Console o Cloud Shell
3. Anotar el `WORKLOAD_IDENTITY_POOL_PROVIDER` resource name

#### Slice 2.2 — Refactorizar `google-credentials.ts`

1. Modificar `getGoogleCredentials()` para intentar WIF primero, fallback a SA key:
   ```typescript
   export async function getGoogleCredentials() {
     // Path 1: Workload Identity Federation (Vercel runtime)
     const oidcToken = process.env.VERCEL_OIDC_TOKEN
     if (oidcToken && process.env.GCP_WORKLOAD_IDENTITY_PROVIDER) {
       return getWifCredentials(oidcToken)
     }

     // Path 2: SA key fallback (local dev, scripts, Cloud Run)
     return getSaKeyCredentials()
   }
   ```
2. Implementar `getWifCredentials()` usando `ExternalAccountClient` de `google-auth-library`
3. Mantener fallback a SA key para:
   - Desarrollo local (no tiene OIDC token)
   - Scripts de backfill
   - Cualquier entorno sin Vercel OIDC

#### Slice 2.3 — Configurar Vercel Environment Variables

1. Agregar en todos los environments de Vercel:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER` = resource name del pool provider
   - `GCP_SERVICE_ACCOUNT_EMAIL` = `greenhouse-runtime@efeonce-group.iam.gserviceaccount.com`
2. Marcar `GOOGLE_APPLICATION_CREDENTIALS_JSON` como **solo para Preview** (fallback)
3. Verificar en staging primero, luego production

#### Slice 2.4 — Fix Vertex AI temp file workaround

1. Refactorizar `src/lib/ai/greenhouse-agent-model.ts`:
   - Si WIF está disponible, usar `GoogleAuth` directamente (sin temp file)
   - Si SA key, mantener temp file como fallback
2. Limpiar el patrón de `/tmp/greenhouse-genai-*`

#### Slice 2.5 — Validar y remover SA key de Production

1. Deploy staging con WIF → validar todos los flujos:
   - BigQuery queries (read + write)
   - Cloud SQL connections (runtime profile)
   - Cloud Storage uploads (media bucket)
   - Vertex AI inference (Gemini agent)
   - Cron jobs (outbox, materialize, sync)
2. Deploy production con WIF
3. Una vez estable (~1 semana), remover `GOOGLE_APPLICATION_CREDENTIALS_JSON` de Production environment
4. Mantener en Preview para desarrollo local

### Fase 3 — Secret Manager para secretos críticos (MEDIUM IMPACT, ~3 días)

**Objetivo:** Los 6 secretos con mayor blast radius salen de env vars y van a Secret Manager con acceso auditado.

#### Slice 3.1 — Crear secrets en GCP Secret Manager

1. Crear los 6 secrets:
   ```bash
   echo -n "$VALUE" | gcloud secrets create greenhouse-postgres-runtime-password --data-file=-
   echo -n "$VALUE" | gcloud secrets create greenhouse-postgres-migrator-password --data-file=-
   echo -n "$VALUE" | gcloud secrets create greenhouse-postgres-admin-password --data-file=-
   echo -n "$VALUE" | gcloud secrets create greenhouse-nextauth-secret --data-file=-
   echo -n "$VALUE" | gcloud secrets create greenhouse-azure-ad-client-secret --data-file=-
   echo -n "$VALUE" | gcloud secrets create greenhouse-nubox-bearer-token --data-file=-
   ```
2. Otorgar `roles/secretmanager.secretAccessor` a la SA de runtime (o al WIF pool principal)
3. Habilitar audit logging en Secret Manager

#### Slice 3.2 — Implementar client de Secret Manager

1. Crear `src/lib/secrets/secret-manager.ts`:
   ```typescript
   import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

   const client = new SecretManagerServiceClient()
   const cache = new Map<string, { value: string; expiry: number }>()
   const TTL = 5 * 60 * 1000 // 5 min cache

   export async function getSecret(name: string): Promise<string> {
     const cached = cache.get(name)
     if (cached && cached.expiry > Date.now()) return cached.value

     const [version] = await client.accessSecretVersion({
       name: `projects/efeonce-group/secrets/${name}/versions/latest`,
     })
     const value = version.payload?.data?.toString() ?? ''
     cache.set(name, { value, expiry: Date.now() + TTL })
     return value
   }
   ```
2. Instalar `@google-cloud/secret-manager` como dependency
3. Cache de 5 minutos para evitar latencia en hot paths (no llamar a SM en cada request)

#### Slice 3.3 — Migrar consumers de secretos

1. `src/lib/postgres/client.ts`:
   - `getGreenhousePostgresConfig()` → obtener password de Secret Manager con fallback a env var
2. `src/lib/auth.ts`:
   - `NEXTAUTH_SECRET` → obtener de Secret Manager
   - `AZURE_AD_CLIENT_SECRET` → obtener de Secret Manager
3. `src/lib/nubox/client.ts`:
   - `NUBOX_BEARER_TOKEN` → obtener de Secret Manager
4. Cada consumer: si Secret Manager falla, fallback a env var (graceful degradation)

#### Slice 3.4 — Validación de startup

1. Crear `src/lib/secrets/validate-secrets.ts`:
   - Al arrancar, verificar que los 6 secretos críticos son accesibles
   - Log warning si alguno falla (no crashear — fallback a env var)
   - Reportar a `/api/internal/health` el estado de secretos

## Out of Scope

- Migrar Cloud Run/Cloud Functions a Secret Manager (ya tienen runtime SA implicit)
- Rotación automática de secretos (mejora futura post-Fase 3)
- Múltiples service accounts por dominio (diferido hasta que haya equipo)
- Hashicorp Vault o soluciones externas de KMS
- Migrar los 12 secretos de bajo blast radius fuera de Vercel env vars
- VPC Service Controls o Private Service Connect

## Risk Assessment

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| WIF OIDC falla en runtime → downtime | Media | Fallback automático a SA key; rollback inmediato |
| Secret Manager latencia en hot path | Baja | Cache de 5 min; fallback a env var |
| Cloud SQL restricción de red bloquea Vercel | Media | Probar en staging primero; documentar IPs; tener rollback plan |
| Preview deployments pierden acceso a GCP | Media | Mantener SA key solo en Preview environment |
| Vertex AI no soporta WIF credentials | Baja | Mantener temp file fallback para GenAI client |

## Acceptance Criteria

### Fase 1
- [ ] Cloud SQL `greenhouse-pg-dev` no tiene `0.0.0.0/0` en authorized networks
- [ ] Cloud SQL SSL mode es `ENCRYPTED_ONLY`
- [x] Production deploy conecta a Cloud SQL correctamente
- [x] Staging deploy conecta a Cloud SQL correctamente
- [ ] Cloud Run services siguen conectando sin error
- [ ] Documentación actualizada en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

### Fase 2
- [x] Workload Identity Pool `greenhouse-vercel-pool` creado en GCP
- [x] `google-credentials.ts` intenta WIF primero, fallback a SA key
- [x] Production usa WIF (no SA key)
- [x] Staging usa WIF (no SA key)
- [ ] BigQuery, Cloud SQL, Storage y Vertex AI funcionan con WIF en Production
- [ ] Todos los cron jobs ejecutan correctamente
- [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` removido de Production env
- [ ] Preview deployments siguen funcionando (SA key fallback)
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

### Fase 3
- [ ] 6 secrets creados en GCP Secret Manager
- [ ] `@google-cloud/secret-manager` instalado
- [ ] `src/lib/secrets/secret-manager.ts` implementado con cache
- [ ] PostgreSQL passwords se leen de Secret Manager (con fallback)
- [ ] `NEXTAUTH_SECRET` se lee de Secret Manager (con fallback)
- [ ] `NUBOX_BEARER_TOKEN` se lee de Secret Manager (con fallback)
- [ ] Startup validation reporta estado de secretos
- [ ] Audit logging habilitado en Secret Manager
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

### Fase 1
```bash
# Verificar SSL forzado
gcloud sql instances describe greenhouse-pg-dev --format="value(settings.ipConfiguration.requireSsl)"
# → true

# Verificar authorized networks (no debe contener 0.0.0.0/0)
gcloud sql instances describe greenhouse-pg-dev --format="json(settings.ipConfiguration.authorizedNetworks)"

# Verificar conectividad desde Vercel
curl -s https://dev-greenhouse.efeoncepro.com/api/internal/health | jq .postgres
```

### Fase 2
```bash
# Verificar WIF pool
gcloud iam workload-identity-pools describe greenhouse-vercel-pool --location=global

# Verificar que production no usa SA key
# (check Vercel env vars — GOOGLE_APPLICATION_CREDENTIALS_JSON must be absent from Production)

# Verificar funcionalidad end-to-end
pnpm build
pnpm test
curl -s https://dev-greenhouse.efeoncepro.com/api/internal/health
```

### Fase 3
```bash
# Verificar secrets existen
gcloud secrets list --filter="name:greenhouse-"

# Verificar acceso desde runtime
gcloud secrets versions access latest --secret=greenhouse-postgres-runtime-password

# Health check de secretos
curl -s https://dev-greenhouse.efeoncepro.com/api/internal/health | jq .secrets

# Full validation
pnpm build
pnpm test
pnpm pg:doctor
```

## Decision Log

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-03-28 | Estrategia incremental en 3 fases, no big-bang | Solo 1 developer activo; overhead de migración total es desproporcionado |
| 2026-03-28 | Solo 6 de 18 secretos van a Secret Manager | Los otros 12 tienen blast radius limitado; Vercel encripta at rest |
| 2026-03-28 | WIF antes de Secret Manager | Elimina el secreto con mayor blast radius (SA key) sin agregar dependencia nueva |
| 2026-03-28 | No separar service accounts por dominio | Overhead operativo para equipo de 1; WIF resuelve el problema de credencial estática |
| 2026-03-28 | Fallback a env var en todos los paths | Zero-downtime migration; si Secret Manager falla, el sistema sigue funcionando |
| 2026-03-28 | Deprecar `GCP_ACCESS_TOKEN` | Variable legacy sin uso activo; limpiar en Fase 2 |
