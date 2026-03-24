# Greenhouse Portal — Infraestructura y Deploy

> Versión: 2.0
> Fecha: 2026-03-22
> Actualizado: Nuevos cron jobs (ICO materialize, sync conformed), Nubox env vars, Account 360 scripts

---

## Plataformas

| Servicio | Plataforma | Propósito |
|----------|-----------|-----------|
| Hosting & Deploy | Vercel | Hosting de la app Next.js |
| Data Warehouse | Google BigQuery | Lectura analítica |
| Database | Google Cloud SQL (PostgreSQL) | Store transaccional |
| Storage | Google Cloud Storage | Media assets (logos, avatares) |
| AI | Google Vertex AI | Agente GenAI interno |
| Auth (SSO) | Microsoft Entra ID + Google OAuth | Proveedores SSO |
| CRM | HubSpot | Fuente de verdad para empresas/contactos |
| Project Mgmt | Notion | Fuente de verdad para proyectos/tareas (vía BigQuery) |
| CI/CD | GitHub Actions | Lint y build en PRs y pushes |
| Source Control | GitHub (private repo) | Repositorio de código |

---

## Ambientes de deploy

| Ambiente | Branch | URL | Propósito |
|----------|--------|-----|-----------|
| Production | `main` | URL de producción | Ambiente productivo |
| Staging | `develop` | URL de staging | Integración y QA |
| Preview | Feature branches | URLs de preview por branch | Testing de features |

---

## Vercel Configuration

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/finance/exchange-rates/sync",
      "schedule": "5 23 * * *"
    },
    {
      "path": "/api/cron/outbox-publish",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/ico-materialize",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/sync-conformed",
      "schedule": "30 * * * *"
    }
  ]
}
```

**Cron jobs:**
1. **Exchange rates sync** — Diario a las 23:05 UTC. Sincroniza tipos de cambio.
2. **Outbox publisher** — Cada 5 minutos. Publica eventos de PostgreSQL hacia BigQuery.
3. **ICO materialize** — *(nuevo)* Cada 6 horas. Materializa métricas de delivery del ICO Engine (snapshots, stuck assets, trends).
4. **Sync conformed** — *(nuevo)* Cada hora. Sincroniza datos conformados desde fuentes externas.

### Next.js Configuration (`next.config.ts`)

- `basePath`: Configurable vía env (`BASEPATH`). Solo definir si se usa subdirectorio.
- `distDir`: `.next` por defecto, configurable vía `NEXT_DIST_DIR`.
- Redirect: `/` → `/dashboard` (permanent).

---

## Variables de entorno

### App

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Sí | URL pública de la app |
| `BASEPATH` | No | Base path para subdirectorio |

### Google Cloud Platform

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GCP_PROJECT` | Sí | ID del proyecto GCP |
| `GOOGLE_CLOUD_LOCATION` | Sí | Región de GCP |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Sí | Service account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` | Alt | SA JSON en base64 |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | Flag para usar Vertex AI |
| `GREENHOUSE_BIGQUERY_DATASET` | No | Dataset de BigQuery |
| `GREENHOUSE_BIGQUERY_LOCATION` | No | Location de BigQuery |

### Autenticación

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXTAUTH_SECRET` | Sí | Secret para JWT |
| `NEXTAUTH_URL` | Sí | URL base para NextAuth |
| `AZURE_AD_CLIENT_ID` | Cond. | Client ID de Azure AD |
| `AZURE_AD_CLIENT_SECRET` | Cond. | Client Secret de Azure AD |
| `GOOGLE_CLIENT_ID` | Cond. | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Cond. | Client Secret de Google OAuth |

### PostgreSQL

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` | Cond. | Cloud SQL instance (formato: project:region:instance) |
| `GREENHOUSE_POSTGRES_HOST` | Alt. | Host directo |
| `GREENHOUSE_POSTGRES_PORT` | No | Puerto (default: 5432) |
| `GREENHOUSE_POSTGRES_DATABASE` | Sí | Nombre de la DB |
| `GREENHOUSE_POSTGRES_USER` | Sí | Usuario runtime |
| `GREENHOUSE_POSTGRES_PASSWORD` | Sí | Password runtime |
| `GREENHOUSE_POSTGRES_MIGRATOR_USER` | Scripts | Usuario migrador |
| `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` | Scripts | Password migrador |
| `GREENHOUSE_POSTGRES_ADMIN_USER` | Scripts | Usuario admin |
| `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` | Scripts | Password admin |
| `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` | No | Pool size (default: 5) |
| `GREENHOUSE_POSTGRES_SSL` | No | Habilitar SSL |
| `GREENHOUSE_POSTGRES_IP_TYPE` | No | PUBLIC, PRIVATE, o PSC |

### Integración

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GREENHOUSE_AGENT_MODEL` | No | Modelo GenAI (default: gemini-2.5-flash) |
| `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` | Cond. | URL del microservicio HubSpot |
| `CRON_SECRET` | Sí | Secret para verificar cron jobs |
| `HR_CORE_TEAMS_WEBHOOK_SECRET` | Cond. | Secret para webhook Teams |

### Nubox *(nuevo)*

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NUBOX_API_TOKEN` | Cond. | Bearer token para API Nubox |
| `NUBOX_API_KEY` | Cond. | API key adicional (dual header auth) |
| `NUBOX_API_BASE_URL` | Cond. | URL base de la API de Nubox |

---

## PostgreSQL — Perfiles de acceso

Greenhouse usa tres perfiles de PostgreSQL con privilegios distintos:

### Runtime (aplicación)

- **Usuario**: `GREENHOUSE_POSTGRES_USER`
- **Privilegios**: SELECT, INSERT, UPDATE en schemas de dominio
- **Uso**: La app Next.js en producción

### Migrator (scripts de setup)

- **Usuario**: `GREENHOUSE_POSTGRES_MIGRATOR_USER`
- **Privilegios**: CREATE TABLE, ALTER, DROP en schemas específicos
- **Uso**: Scripts `setup-postgres-*` que crean/modifican schemas

### Admin (operaciones)

- **Usuario**: `GREENHOUSE_POSTGRES_ADMIN_USER`
- **Privilegios**: SUPERUSER o equivalente
- **Uso**: Scripts de backfill, diagnóstico, operaciones excepcionales

---

## PostgreSQL — Connection Pool

Configuración del pool de conexiones (`src/lib/postgres/client.ts`):

- **Pool library**: `pg` (node-postgres)
- **Cloud SQL Connector**: `@google-cloud/cloud-sql-connector` para conexión segura
- **Singleton**: Una instancia global del pool
- **Max connections**: Configurable (default: 5)
- **Connection timeout**: 15 segundos
- **Idle timeout**: 30 segundos

### Funciones principales

| Función | Descripción |
|---------|-------------|
| `getGreenhousePostgresPool()` | Obtener/crear el pool singleton |
| `runGreenhousePostgresQuery<T>(sql, values)` | Ejecutar query parametrizado |
| `withGreenhousePostgresTransaction(cb)` | Ejecutar dentro de transacción con rollback automático |
| `closeGreenhousePostgres()` | Cerrar pool |

---

## CI/CD — GitHub Actions

### Workflow: `ci.yml`

**Triggers:**
- Pull requests (todas las ramas)
- Push a `main` y `develop`

**Job: Quality**
- Runner: `ubuntu-latest`
- Timeout: 20 minutos
- Node.js: 20
- Package manager: pnpm 10

**Steps:**
1. Checkout del código
2. Setup pnpm + Node.js con cache
3. `pnpm install --frozen-lockfile`
4. `pnpm lint`
5. `pnpm build`

**Variables de CI:**
- `CI=true`
- `NEXT_TELEMETRY_DISABLED=1`
- Placeholders para auth y GCP (no se necesitan credenciales reales para build)

### Otros workflows

- **Dependabot** — Revisa dependencias npm y GitHub Actions semanalmente
- **CODEOWNERS** — Asignación de revisores por defecto

---

## Branching strategy

| Branch | Propósito |
|--------|-----------|
| `main` | Producción. Solo recibe merges desde `develop` o hotfixes. |
| `develop` | Integración y staging. Rama base para features. |
| `feature/*` | Features nuevos. Branch desde `develop`. |
| `fix/*` | Bug fixes. Branch desde `develop`. |
| `hotfix/*` | Fixes urgentes. Branch desde `main`. |
| `docs/*` | Cambios de documentación. |

---

## Scripts NPM

### Desarrollo

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `next dev` | Servidor de desarrollo |
| `build` | `next build` | Build de producción |
| `start` | `next start` | Servidor de producción |
| `lint` | `eslint .` | Linting |
| `clean` | `rm -rf .next node_modules` | Limpieza |

### PostgreSQL Setup

| Script | Descripción |
|--------|-------------|
| `setup:postgres:canonical-360` | greenhouse_core + greenhouse_serving + greenhouse_sync |
| `setup:postgres:person-360` | person_360 serving views |
| `setup:postgres:hr-leave` | greenhouse_hr schema |
| `setup:postgres:payroll` | greenhouse_payroll schema |
| `setup:postgres:finance` | greenhouse_finance schema |
| `setup:postgres:ai-tooling` | AI tooling schema |
| `setup:postgres:access` | Access control tables |
| `setup:postgres:client-assignments` | Client assignments |
| `setup:postgres:source-sync` | Source sync infrastructure |
| `setup:postgres:account-360-m0` | *(nuevo)* Account 360: organizations, spaces, person_memberships |
| `setup:postgres:organization-360` | *(nuevo)* Organization 360 serving views |
| `setup:postgres:services` | *(nuevo)* Services table + service_history |
| `setup:postgres:space-notion-sources` | *(nuevo)* Space-Notion source mapping |
| `setup:postgres:identity-v2` | *(nuevo)* Identity profiles v2 + reconciliation |
| `setup:postgres:nubox-extensions` | *(nuevo)* Nubox extensions en greenhouse_finance |
| `setup:postgres:finance-intelligence-p1/p2` | *(nuevo)* Finance intelligence tables |
| `setup:bigquery:nubox-raw` | *(nuevo)* BigQuery nubox_raw_snapshots dataset |
| `setup:bigquery:nubox-conformed` | *(nuevo)* BigQuery nubox_conformed dataset |

### Backfill

| Script | Descripción |
|--------|-------------|
| `backfill:postgres:canonical-360` | Poblar master data |
| `backfill:postgres:person-360-coverage` | Completar perfiles |
| `backfill:postgres:hr-leave` | Datos HR |
| `backfill:postgres:payroll` | Datos payroll |
| `backfill:postgres:finance` | Datos finance |
| `backfill:postgres:ai-tooling` | Datos AI tools |
| `backfill:account-360-m1` | *(nuevo)* Poblar organizations y spaces |
| `backfill:identity-v2` | *(nuevo)* Identity profiles v2 |

### Operaciones

| Script | Descripción |
|--------|-------------|
| `pg:doctor` | Health check de PostgreSQL |
| `audit:person-360` | Auditoría de cobertura Person 360 |
| `sync:outbox` | Ejecutar outbox consumer manualmente |
| `run:identity-reconciliation` | *(nuevo)* Ejecutar reconciliación de identidades |
| `verify:account-360` | *(nuevo)* Verificar integridad del modelo Account 360 |
| `test:nubox-sync` | *(nuevo)* Smoke test del pipeline Nubox |

---

## Seguridad del repositorio

- **Repositorio privado** — No es open source
- **SECURITY.md** — Política de seguridad documentada en `.github/`
- **SUPPORT.md** — Canales de soporte
- **CODEOWNERS** — Revisión obligatoria por owners
- **No commitear secretos** — `.env.local` y `.env.production.local` en `.gitignore`
- **Dependabot** — Actualización automática de dependencias

---

## Archivos protegidos

Según AGENTS.md, estos archivos no deben modificarse sin revisión especial:

- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `src/app/layout.tsx`
- `src/components/greenhouse/**`
- `src/configs/**`
