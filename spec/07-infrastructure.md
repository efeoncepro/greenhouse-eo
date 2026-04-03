# Greenhouse Portal — Infraestructura y Deploy

> Versión: 2.1
> Fecha: 2026-04-02
> Actualizado: Sistema de migraciones (node-pg-migrate), Kysely typed queries, Vitest infrastructure, Cloud SQL Connector, Sentry monitoring, Email infrastructure, Scripts 165+

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
| Error Tracking | Sentry | Monitoreo de errores en producción |
| Email Delivery | Resend | Entrega de emails transaccionales |

---

## Ambientes de deploy

| Ambiente | Branch | URL | Propósito |
|----------|--------|-----|-----------|
| Production | `main` | greenhouse.efeoncepro.com | Ambiente productivo |
| Staging | `develop` (Custom Environment) | dev-greenhouse.efeoncepro.com | Integración y QA |
| Preview | Feature branches | URLs de preview por branch | Testing de features |

---

## Vercel Configuration

### `vercel.json`

```json
{
  "crons": [
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
    },
    {
      "path": "/api/finance/exchange-rates/sync",
      "schedule": "5 23 * * *"
    },
    {
      "path": "/api/cron/nubox-sync",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/attendance-materialize",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/payroll-auto-calculate",
      "schedule": "0 4 * * 1"
    }
  ]
}
```

**Cron jobs:**

| Job | Frecuencia | Propósito |
|-----|-----------|----------|
| Outbox publisher | Cada 5 minutos | Publica eventos de PostgreSQL hacia BigQuery |
| ICO materialize | Cada 6 horas | Materializa métricas de delivery del ICO Engine (snapshots, stuck assets, trends) |
| Sync conformed | Cada hora | Sincroniza datos conformados desde fuentes externas |
| Exchange rates sync | Diario 23:05 UTC | Sincroniza tipos de cambio |
| Nubox sync | Diario 02:00 UTC | Sincroniza datos de Nubox (facturas, compras, movimientos) |
| Attendance materialize | Diario 03:00 UTC | Materializa registros de asistencia |
| Payroll auto-calculate | Lunes 04:00 UTC | Calcula nómina automáticamente |

### Next.js Configuration (`next.config.ts`)

- `basePath`: Configurable vía env (`BASEPATH`). Solo definir si se usa subdirectorio.
- `distDir`: `.next` por defecto, configurable vía `NEXT_DIST_DIR`.
- Redirect: `/` → `/dashboard` (permanent).

---

## Sistema de migraciones

### Framework: node-pg-migrate

- **Ubicación**: `migrations/` directory
- **Versionado**: Basado en timestamp generado por la herramienta
- **Flujo obligatorio**: `migrate:create` → editar SQL → `migrate:up` (auto-regenera tipos) → commit todo junto
- **Regla crítica**: Columnas nullable primero, constraints después (para rollbacks sin riesgo)

### Comandos principales

| Comando | Descripción |
|---------|-------------|
| `pnpm migrate:create <nombre>` | Crear archivo de migración con timestamp automático |
| `pnpm migrate:up` | Aplicar migraciones pendientes (auto-regenera tipos en `src/types/db.d.ts`) |
| `pnpm migrate:down` | Revertir última migración |
| `pnpm migrate:status` | Mostrar estado de migraciones |
| `pnpm db:generate-types` | Regenerar tipos TypeScript de la DB (post-migración) |

### Convenciones

- **NUNCA** renombrar timestamps manualmente — `node-pg-migrate` rechaza migraciones con timestamp anterior a la última aplicada
- **NUNCA** crear archivos de migración a mano — usar `pnpm migrate:create`
- **Timestamps**: Siempre usar el comando para generar archivos. El timestamp determina el orden de ejecución.
- **Deploy workflow**: Migración ANTES del deploy, siempre. Nunca mergear cambios de schema sin migración previa.

---

## Base de datos — Conexión y tipos

### Archivo centralizado: `src/lib/db.ts`

Único punto de entrada para toda conexión PostgreSQL. Tres APIs principales:

| API | Uso |
|-----|-----|
| `query(sql, values)` | Raw SQL con parámetros |
| `getDb()` | Kysely tipado (type-safe queries) |
| `withTransaction(callback)` | Transacciones ACID |

### Kysley para typed queries

- **SDK**: `@kythe-sql/postgres` v0.31
- **Tipos generados**: `kysely-codegen` (automático post-migración)
- **Ventaja**: Type safety al 100%, IDE autocompletion

```typescript
const db = getDb()
const members = await db
  .selectFrom('team_members')
  .selectAll()
  .where('member_id', '=', memberId)
  .execute()
```

### Tipos generados

- **Ubicación**: `src/types/db.d.ts`
- **Tablas**: 119+ tablas del sistema completo
- **Regeneración**: `pnpm db:generate-types` (automático post-`migrate:up`)

### Reglas de conexión

- **NUNCA** crear `new Pool()` fuera de `src/lib/postgres/client.ts`
- Módulos nuevos deben usar Kysely (`getDb()`) para type safety
- Módulos legacy usando `runGreenhousePostgresQuery` están OK (deprecados pero funcionales)
- Cloud SQL Connector (`@google-cloud/cloud-sql-connector`) toma prioridad sobre TCP directo si `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida

---

## PostgreSQL — Perfiles de acceso

Greenhouse usa tres perfiles de PostgreSQL con privilegios distintos:

### Runtime (aplicación)

- **Usuario**: `GREENHOUSE_POSTGRES_USER`
- **Privilegios**: SELECT, INSERT, UPDATE, DELETE en schemas de dominio
- **Uso**: La app Next.js en producción (Vercel, Cloud Run, local)
- **Conexión**: Cloud SQL Connector (recomendado) o TCP directo

### Migrator (scripts de setup)

- **Usuario**: `GREENHOUSE_POSTGRES_MIGRATOR_USER`
- **Privilegios**: CREATE TABLE, ALTER, DROP, CREATE INDEX en schemas específicos
- **Uso**: Scripts `setup-postgres-*` que crean/modifican schemas
- **Conexión**: Cloud SQL Auth Proxy vía `127.0.0.1:15432` local

### Admin (operaciones)

- **Usuario**: `GREENHOUSE_POSTGRES_ADMIN_USER`
- **Privilegios**: SUPERUSER o equivalente
- **Uso**: Scripts de backfill, diagnóstico, operaciones excepcionales
- **Conexión**: Cloud SQL Auth Proxy vía local tunnel

---

## PostgreSQL — Connection Pool

Configuración del pool de conexiones (`src/lib/postgres/client.ts`):

- **Pool library**: `pg` (node-postgres)
- **Cloud SQL Connector**: `@google-cloud/cloud-sql-connector` para conexión segura vía Cloud SQL Admin API
- **Singleton**: Una instancia global del pool
- **Max connections**: Configurable (default: 5)
- **Connection timeout**: 15 segundos
- **Idle timeout**: 30 segundos
- **Fail-fast en IP pública**: Guarda `scripts/migrate.ts` aborta inmediatamente si `GREENHOUSE_POSTGRES_HOST` apunta a una IP pública (no esperar timeout)

### Funciones principales

| Función | Descripción |
|---------|-------------|
| `getGreenhousePostgresPool()` | Obtener/crear el pool singleton |
| `runGreenhousePostgresQuery<T>(sql, values)` | Ejecutar query parametrizado (legacy) |
| `withGreenhousePostgresTransaction(cb)` | Ejecutar dentro de transacción con rollback automático |
| `closeGreenhousePostgres()` | Cerrar pool |

### Acceso desde Vercel

- **Recomendado**: Cloud SQL Connector con Vercel OIDC + `@vercel/oidc` para autenticación sin credenciales hardcodeadas
- **Fallback**: TCP directo con credenciales (almacenadas en Vercel secrets)
- **No soportado**: Acceso a IP pública de Cloud SQL (no hay authorized networks configuradas)

---

## Cloud SQL Auth Proxy (para scripts standalone)

Para migraciones y binarios que requieran conexión local:

```bash
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
```

Luego en `.env.local`:
```
GREENHOUSE_POSTGRES_HOST=127.0.0.1
GREENHOUSE_POSTGRES_PORT=15432
GREENHOUSE_POSTGRES_SSL=false
```

---

## Testing Infrastructure

### Framework: Vitest 4.1.0

| Componente | Detalle |
|-----------|---------|
| **Test runner** | Vitest 4.1.0 |
| **DOM environment** | jsdom |
| **Component testing** | React Testing Library |
| **Mocking** | Vitest built-in mocks |

### Configuración

- **Archivo**: `vitest.config.ts`
- **Setup**: `src/test/setup.ts`
- **Render helper**: `src/test/render.tsx` (renderWithTheme)

### Helpers principales

```typescript
// src/test/render.tsx
import { render } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'

export const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  )
}
```

### Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm test` | Ejecutar suite de tests |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Cobertura |

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
6. `pnpm test` (si aplica)

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
| `SENTRY_DSN` | Cond. | DSN para Sentry |
| `SENTRY_AUTH_TOKEN` | Cond. | Auth token para Sentry release tracking |

### Nubox

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NUBOX_API_TOKEN` | Cond. | Bearer token para API Nubox |
| `NUBOX_API_KEY` | Cond. | API key adicional (dual header auth) |
| `NUBOX_API_BASE_URL` | Cond. | URL base de la API de Nubox |

### Email

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `RESEND_API_KEY` | Cond. | API key para Resend |
| `EMAIL_FROM` | Cond. | Dirección de envío por defecto |

---

## Monitoreo y Observabilidad

### Sentry

- **SDK**: `@sentry/nextjs`
- **Configuración**: `sentry.config.ts` (vía `SENTRY_DSN`)
- **Propósito**: Captura de errores en producción, performance monitoring, release tracking

### Secret Management

- **Google Secret Manager**: `resolveSecret()` para secretos sensibles
- **Vercel Secrets**: Variables de entorno almacenadas de forma segura

---

## Scripts NPM

### Desarrollo

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `next dev` | Servidor de desarrollo |
| `build` | `next build` | Build de producción |
| `start` | `next start` | Servidor de producción |
| `lint` | `eslint .` | Linting |
| `test` | `vitest` | Tests unitarios |
| `clean` | `rm -rf .next node_modules` | Limpieza |

### PostgreSQL Setup (90+ scripts)

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
| `setup:postgres:account-360-m0` | Account 360: organizations, spaces, person_memberships |
| `setup:postgres:organization-360` | Organization 360 serving views |
| `setup:postgres:services` | Services table + service_history |
| `setup:postgres:space-notion-sources` | Space-Notion source mapping |
| `setup:postgres:identity-v2` | Identity profiles v2 + reconciliation |
| `setup:postgres:nubox-extensions` | Nubox extensions en greenhouse_finance |
| `setup:postgres:finance-intelligence-p1/p2` | Finance intelligence tables |
| `setup:postgres:transactional-email` | Email transaccional tables |
| `setup:bigquery:nubox-raw` | BigQuery nubox_raw_snapshots dataset |
| `setup:bigquery:nubox-conformed` | BigQuery nubox_conformed dataset |
| `setup:bigquery:outbox` | BigQuery outbox events table |
| `setup:bigquery:email-logs` | BigQuery email logs table |

### Backfill (25+ scripts)

| Script | Descripción |
|--------|-------------|
| `backfill:postgres:canonical-360` | Poblar master data |
| `backfill:postgres:person-360-coverage` | Completar perfiles |
| `backfill:postgres:hr-leave` | Datos HR |
| `backfill:postgres:payroll` | Datos payroll |
| `backfill:postgres:finance` | Datos finance |
| `backfill:postgres:ai-tooling` | Datos AI tools |
| `backfill:account-360-m1` | Poblar organizations y spaces |
| `backfill:identity-v2` | Identity profiles v2 |
| `backfill:hubspot-contact-names` | Sincronizar nombres desde HubSpot |
| `backfill:efeonce-microsoft-aliases` | Alinear aliases Microsoft |

### Operaciones

| Script | Descripción |
|--------|-------------|
| `pg:doctor` | Health check de PostgreSQL |
| `audit:person-360` | Auditoría de cobertura Person 360 |
| `sync:outbox` | Ejecutar outbox consumer manualmente |
| `run:identity-reconciliation` | Ejecutar reconciliación de identidades |
| `verify:account-360` | Verificar integridad del modelo Account 360 |
| `test:nubox-sync` | Smoke test del pipeline Nubox |

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
- `src/lib/db.ts`
- `src/lib/postgres/client.ts`
- `migrations/**`
