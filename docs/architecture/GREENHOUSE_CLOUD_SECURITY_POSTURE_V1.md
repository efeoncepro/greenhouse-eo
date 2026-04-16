# Greenhouse EO — Cloud Security & Operational Posture

> **Version:** 1.0
> **Created:** 2026-03-28
> **Audience:** Platform engineers, security reviewers, on-call operators
> **Companion doc:** `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (resource inventory)
> **Task track:** TASK-096, TASK-098 through TASK-103 (Cloud Posture Hardening 1–7)

---

## Delta 2026-04-15 — Shared infra requires environment-specific secrets without pretending infra isolation

- La postura vigente de Greenhouse no es `prod infra` vs `staging infra` para todos los componentes cloud.
- Hoy el portal y el runtime reactivo operan sobre infraestructura compartida:
  - Cloud Run `ops-worker` compartido
  - Cloud SQL `greenhouse-pg-dev` compartido
- Por lo tanto, la separación de riesgo entre `staging` y `production` depende de contratos explícitos de configuración y secretos donde sí existe blast radius por ambiente.

Regla de seguridad vigente:

- No asumir aislamiento efectivo solo porque una variable o un deploy usen la palabra `production`.
- Cuando la infraestructura subyacente sea compartida, los secretos con impacto ambiente-específico deben seguir separados, especialmente:
  - `NEXTAUTH_SECRET`
  - `RESEND_API_KEY`
  - cualquier signing secret, bearer token o credencial third-party con distinto riesgo operacional por ambiente
- La documentación y los scripts de deploy deben reflejar la topología real. Inventar refs de producción inexistentes es riesgo operativo, no hardening.

## Delta 2026-04-15 — Resend deja de ser Vercel-only cuando el email corre también en Cloud Run

- ISSUE-050 confirmó drift real: el portal staging tenía `RESEND_API_KEY`, pero el runtime reactivo que procesa correos (`ops-worker`) no compartía ese contrato y degradaba emails transaccionales.
- Decisión vigente:
  - `RESEND_API_KEY_SECRET_REF` pasa a ser el contrato canónico recomendado para email cuando el mismo flujo puede ejecutarse en más de un runtime
  - `RESEND_API_KEY` directo queda como fallback legacy
  - `EMAIL_FROM` debe propagarse explícitamente a cualquier worker que pueda emitir emails; no debe asumirse solo en el runtime web
- Implementación alineada:
  - `src/lib/resend.ts` resuelve `RESEND_API_KEY` vía helper canónico `Secret Manager -> env fallback`
  - `services/ops-worker/deploy.sh` ya acepta `RESEND_API_KEY_SECRET_REF` para Cloud Run


## Delta 2026-04-09 — Secret Manager payload hygiene enforced after ISSUE-032

- Se confirmó un riesgo operativo real: un secreto podía existir, resolver por `*_SECRET_REF` y aun así romper runtime si el payload fue publicado con comillas envolventes o `\\n` literal.
- Defensa en profundidad aplicada:
  - `src/lib/secrets/secret-manager.ts` ahora sanea payloads quoted/contaminados antes de entregarlos al runtime
- Regla de seguridad vigente:
  - ese saneamiento no autoriza publicar secretos “sucios”
  - el secreto fuente debe seguir siendo un scalar crudo, sin comillas, sin `\\n` / `\\r` literal y sin whitespace residual
- Remediación en origen ya ejecutada:
  - `greenhouse-google-client-secret-shared`
  - `greenhouse-nextauth-secret-staging`
  - `greenhouse-nextauth-secret-production`
  - `webhook-notifications-secret`
  quedaron con nuevas versiones limpias en GCP Secret Manager
- Impacto operativo explícito:
  - rotar `NEXTAUTH_SECRET` puede invalidar sesiones activas y requiere tratar la rotación como cambio con impacto de autenticación
- Verificación mínima obligatoria después de una rotación:
  - confirmar payload limpio en origen
  - confirmar recuperación del consumer real en el ambiente afectado

## Delta 2026-03-31 — Dedicated bucket security posture applied

- La postura `public vs private` ya no es solo normativa; quedó aplicada en GCP.
- Buckets públicos:
  - legibles anónimamente solo para serving de logos, avatars y assets visuales no sensibles
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` conserva `roles/storage.objectAdmin` bucket-level para escritura/rotación
- Buckets privados:
  - `uniform bucket-level access=true`
  - `publicAccessPrevention=enforced`
  - sin lectura anónima
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/storage.objectAdmin` bucket-level
- Regla de seguridad vigente:
  - ningún documento privado del portal debe depender de lectura directa desde bucket
  - todo acceso privado sigue pasando por autorización Greenhouse y audit trail en `greenhouse_core.asset_access_log`
- Compatibilidad legacy controlada:
  - `GREENHOUSE_MEDIA_BUCKET` puede seguir existiendo para consumers públicos viejos
  - no debe reutilizarse para nuevos adjuntos privados ni como baseline de capacidades documentales nuevas

## Delta 2026-03-29 — TASK-131 cierra la separación runtime vs tooling

- `TASK-131` implementó la corrección pendiente en la capa `cloud/*`.
- `CloudSecretsPosture` ahora distingue entre secretos `runtime` y `tooling`.
- `postureChecks.secrets` se calcula solo sobre la porción runtime-crítica.
- `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` siguen visibles, pero ya no degradan `overallStatus` del portal cuando el runtime principal está sano.
- La visibilidad de perfiles privilegiados se conserva vía:
  - `secrets.toolingSummary`
  - `postgresAccessProfiles`

## Delta 2026-03-31 — Attachments posture approved

- `TASK-173` fija la postura de seguridad para assets y adjuntos del portal.
- Regla canónica de visibilidad:
  - `public media`: solo logos, avatars y assets visuales no sensibles
  - `private assets`: todo documento o adjunto de negocio, HR, payroll, finance, providers o tooling
- Los assets privados no deben exponerse por bucket público ni por URLs permanentes.
- Modelo de descarga aprobado para privados:
  - el caller entra por una route autenticada de Greenhouse
  - la autorización se evalúa en el portal
  - la entrega puede resolverse por streaming server-side o por signed URL de vida corta
- Regla de persistencia:
  - PostgreSQL guarda metadata y associations del asset
  - no guardar signed URLs persistentes como source of truth del dominio
- Regla de upload:
  - el browser no recibe credenciales GCP crudas
  - cualquier flujo directo a GCS debe estar mediado por autorización server-side y expiración corta
- Regla de compatibilidad con CSP:
  - `public media` puede whitelistarse como origen de assets visuales
  - `private assets` no debe depender de acceso directo desde el browser como baseline
- Requisito operativo adicional:
  - uploads y downloads privados deben dejar trazabilidad mínima de actor, aggregate y timestamp
  - assets subidos y no asociados deben poder limpiarse por lifecycle/housekeeping

## Delta 2026-03-31 — Runtime security implementation for private assets

La postura ya tiene primera materialización en repo:

- upload autenticado vía `POST /api/assets/private`
- download/delete autenticado vía `/api/assets/private/[assetId]`
- access logging en `greenhouse_core.asset_access_log`

Regla vigente:

- el portal valida acceso por aggregate owner antes de entregar el asset
- los consumers nuevos deben extender el access model shared, no bypassarlo con URLs directas persistidas

## Delta 2026-03-29 — Secret Manager validated in shared staging

- `TASK-124` ya salió del estado solo-repo y quedó validada en el entorno compartido `staging`.
- `dev-greenhouse.efeoncepro.com/api/internal/health` sobre `version=497cb19` reportó:
  - `GREENHOUSE_POSTGRES_PASSWORD` via `secret_manager`
  - `NEXTAUTH_SECRET` via `secret_manager`
  - `AZURE_AD_CLIENT_SECRET` via `secret_manager`
  - `NUBOX_BEARER_TOKEN` via `secret_manager`
- La postura sigue siendo transicional y no debe declararse cerrada aún para `production`:
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` siguen fuera del posture runtime del portal
  - los env vars legacy siguen existiendo por compatibilidad durante la transición
  - `production` ya tiene refs y secretos preparados, pero falta validación real tras promover a `main`

## Delta 2026-03-29 — Slack alerts adopta `*_SECRET_REF` sin abrir un bigbang

- `TASK-098` extendió el helper canónico a `SLACK_ALERTS_WEBHOOK_URL`.
- Nuevo contrato operativo:
  - `SLACK_ALERTS_WEBHOOK_URL`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Esta decisión mantiene una postura proporcional:
  - webhook de Slack sí puede vivir en Secret Manager
  - `CRON_SECRET` sigue fuera por ahora porque su consumer principal es síncrono (`requireCronAuth()`)
  - `SENTRY_AUTH_TOKEN` sigue fuera por ahora porque su consumer principal es build-time (`next.config.ts`)

## Delta 2026-03-29 — Health posture separa runtime de perfiles Postgres

- `GET /api/internal/health` mantiene `postgres` como postura del runtime del portal.
- Los secretos `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` no degradan el significado del runtime principal.
- Para visibilidad operativa sin mezclar semánticas, el payload ahora expone `postgresAccessProfiles` con:
  - `runtime`
  - `migrator`
  - `admin`
- Esta separación permite vigilar readiness de tooling privilegiado sin convertirlo en outage del portal.

## Delta 2026-03-29 — Proxy baseline para headers de seguridad

- `TASK-099` inició un primer slice seguro sobre `src/proxy.ts`.
- La capa nueva agrega headers estáticos cross-cutting:
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-DNS-Prefetch-Control`
  - `Strict-Transport-Security` solo en `production`
- El `Content-Security-Policy` real queda diferido para una segunda iteración por riesgo de romper MUI/Emotion, OAuth y assets.

## Delta 2026-03-29 — Transitional WIF-aware repo baseline

- `TASK-096` ya no está solo en diseño: el repo quedó con baseline WIF-aware en implementación.
- La capa `src/lib/google-credentials.ts` ahora resuelve una estrategia transicional:
  - `wif` solo en runtime real de `Vercel` cuando existe `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL` y el token OIDC efímero puede resolverse en ese contexto
  - `service_account_key` como fallback
  - `ambient_adc` para runtimes con credenciales implícitas
- Regla reforzada en 2026-04-10:
  - `VERCEL_OIDC_TOKEN` no debe persistirse en `.env.local`, `.env.production.local` ni archivos equivalentes
  - un token OIDC stale en local no debe activar `WIF`; local/CLI deben resolver por `service_account_key` o `ADC`
- Consumers alineados en esta sesión:
  - `src/lib/bigquery.ts`
  - `src/lib/postgres/client.ts`
  - `src/lib/storage/greenhouse-media.ts`
  - `src/lib/ai/google-genai.ts`
  - scripts operativos que seguían parseando `GOOGLE_APPLICATION_CREDENTIALS_JSON` manualmente
- La postura externa todavía sigue transicional:
  - el repo ya soporta WIF/OIDC
  - el rollout externo WIF ya existe en GCP/Vercel y quedó validado en un preview real (`version=7638f85`) con BigQuery + Cloud SQL Connector OK y sin SA key
  - pero `greenhouse-pg-dev` sigue con `0.0.0.0/0`, `ALLOW_UNENCRYPTED_AND_ENCRYPTED` y `requireSsl=false`
  - además sigue habiendo drift de ambientación:
    - el drift de `\n` en las variables activas del rollout WIF/conector ya fue corregido
    - el mapping del entorno compartido ya quedó aclarado: `dev-greenhouse.efeoncepro.com` sí es `staging`
    - `staging` ya absorbió el baseline WIF final de `develop`
    - `GOOGLE_APPLICATION_CREDENTIALS_JSON` ya fue retirada de `staging`
    - `dev-greenhouse.efeoncepro.com/api/internal/health` reporta `auth.mode=wif`, `serviceAccountKeyConfigured=false`, BigQuery OK y Cloud SQL Connector OK
    - `production` ya absorbió el baseline mínimo WIF y `greenhouse.efeoncepro.com/api/internal/health` reporta `auth.mode=wif`, `selectedSource=wif`, `serviceAccountKeyConfigured=false`, BigQuery OK y Cloud SQL Connector OK
    - `greenhouse-pg-dev` ya quedó endurecido con `authorizedNetworks` vacía y `sslMode=ENCRYPTED_ONLY`
    - el riesgo remanente principal ya no es WIF en Vercel ni exposición pública abierta de Cloud SQL, sino la eventual Fase 3 de Secret Manager
    - el path `vercel deploy --target staging` sigue mostrando un problema operativo intermitente; el workaround validado fue `vercel redeploy <deployment-ready> --target staging`
- por lo tanto `TASK-096` ya cerró la fase WIF en Vercel y el hardening externo de Cloud SQL; el remanente del documento es la Fase 3 de Secret Manager
- La referencia de task activa ahora vive en `docs/tasks/in-progress/TASK-096-gcp-secret-management-security-hardening.md`

## Delta 2026-03-29 — Secret Manager helper baseline

- `TASK-124` ya abrió implementación real para la Fase 3 de secretos críticos.
- Nuevo helper canónico:
  - `src/lib/secrets/secret-manager.ts`
  - contrato de resolución: `Secret Manager -> env fallback -> unconfigured`
  - convención operativa por secreto crítico: `<ENV_VAR>_SECRET_REF`
- El helper usa `@google-cloud/secret-manager`, cache corta y logging sin valores crudos.
- `GET /api/internal/health` ahora proyecta postura de secretos críticos sin exponer payloads:
  - `secret_manager`
  - `env`
  - `unconfigured`
- Primer consumer migrado al patrón:
  - `src/lib/nubox/client.ts` ya resuelve `NUBOX_BEARER_TOKEN` vía helper
- La ruta PostgreSQL del portal también quedó alineada:
  - `src/lib/postgres/client.ts` ya acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
  - `scripts/lib/load-greenhouse-tool-env.ts` ya soporta refs para `runtime`, `migrator` y `admin`
  - `pnpm pg:doctor --profile=runtime` ya fue validado con este path
- La capa auth también quedó alineada al helper:
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - `GOOGLE_CLIENT_SECRET`
    ahora resuelven vía `src/lib/auth-secrets.ts`
- Estado remanente de la fase:
  - validación real en `staging` y `production` con al menos un secreto servido desde Secret Manager

## 1. Purpose

This document defines the target security posture, observability strategy, and operational resilience baseline for Greenhouse EO's cloud infrastructure. It serves as the architectural reference for the Cloud Posture Hardening track (7 tasks) and governs how secrets, credentials, monitoring, and database resilience should be managed going forward.

It is **not** a task execution plan — each task has its own detailed spec under `docs/tasks/`. This document is the "why" and "what"; the tasks are the "how".

---

## 2. Current State Assessment (March 2026)

### 2.1 Platform Profile

| Dimension           | Value                                                             |
| ------------------- | ----------------------------------------------------------------- |
| GCP Project         | `efeonce-group`                                                   |
| Vercel Team         | Efeonce Group                                                     |
| API Routes          | 238                                                               |
| Cron Jobs           | 18 (Vercel) + 4 (Cloud Scheduler)                                 |
| Cloud Run/Functions | 10 services                                                       |
| PostgreSQL schemas  | 9                                                                 |
| BigQuery datasets   | 13 (200+ tables)                                                  |
| Secrets             | 18 total (6 critical)                                             |
| Active developers   | 1                                                                 |
| Data sensitivity    | High — payroll, compensation, identity, tax documents (SII/Nubox) |

### 2.2 Security Scorecard (Pre-Hardening)

| Dimension            | Score | Key Gap                                                                                                                                                           |
| -------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret Management    | 5/10  | El rollout WIF ya existe y quedó validado en preview real, pero la SA key sigue como fallback transicional y falta alinear el entorno compartido + retirar la key |
| Network Security     | 1/10  | Cloud SQL open to `0.0.0.0/0`, optional SSL                                                                                                                       |
| Security Headers     | 1/10  | No middleware.ts, no CSP/HSTS/X-Frame                                                                                                                             |
| Observability        | 1/10  | `console.error()` only, zero external alerting                                                                                                                    |
| CI/CD Validation     | 3/10  | Lint + build only, 86 test files not in CI                                                                                                                        |
| API Auth Consistency | 4/10  | 2 inconsistent cron auth patterns, no timing-safe                                                                                                                 |
| Database Resilience  | 8/10  | PITR, WAL retention, slow query logging, pool `15` y restore test manual ya quedaron verificados                                                                  |
| Cost Visibility      | 0/10  | No budget alerts, no BigQuery cost guards                                                                                                                         |

### 2.3 Threat Model

| Threat                             | Current Exposure                                                                     | Impact                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| SA key leak (env var exfiltration) | **High** — la SA key sigue existiendo como fallback aunque el repo ya soporte WIF    | Full GCP compromise                              |
| Cloud SQL brute force              | **High** — `0.0.0.0/0` + optional SSL + password runtime en env var                  | Database compromise (payroll, identity, finance) |
| XSS / Clickjacking                 | **Medium** — no CSP, no X-Frame-Options                                              | Session hijacking, data exfiltration             |
| Cron route spoofing                | **Medium** — loose auth (Pattern A accepts x-vercel-cron without secret)             | Unauthorized data mutation                       |
| BigQuery cost bomb                 | **Medium** — no `maximumBytesBilled`                                                 | $5-50 per accidental full-scan                   |
| Silent production failure          | **High** — zero alerting on cron/webhook/projection failures                         | Data inconsistency, delayed detection            |
| Backup unusable                    | **Low** — PITR ya existe y el restore test manual quedó verificado con clone efímero | Unable to recover from corruption                |

---

## 3. Target Architecture

### 3.1 Secret Management Strategy

#### Principle: Eliminate static credentials, not centralize them

The goal is **not** to move all 18 env vars to Secret Manager — that's overhead without proportional security gain. The strategy is:

1. **Eliminate the highest-risk credential** (SA key) via Workload Identity Federation
2. **Protect the 6 critical secrets** via Secret Manager with audit logging
3. **Leave low-risk config** in Vercel env vars (encrypted at rest)

#### Target Credential Flow

```
                        ┌──────────────────────────┐
                        │     Vercel Runtime        │
                        │                           │
  OIDC Token (ephemeral)│   ┌─────────────────┐    │
  ─────────────────────►│   │ google-          │    │
                        │   │ credentials.ts   │    │
                        │   └────────┬─────────┘    │
                        │            │               │
                        │     ┌──────▼──────┐        │
                        │     │  WIF Pool   │        │
                        │     │  (keyless)  │        │
                        │     └──────┬──────┘        │
                        │            │               │
                        │   ┌────────▼────────┐      │
                        │   │ Impersonate SA  │      │
                        │   │ greenhouse-     │      │
                        │   │ runtime@        │      │
                        │   └────────┬────────┘      │
                        │            │               │
                        └────────────┼───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                 │
              ┌─────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐
              │ BigQuery   │  │ Cloud SQL   │  │ Cloud       │
              │ (read/     │  │ (connector) │  │ Storage     │
              │  write)    │  │             │  │ (media)     │
              └────────────┘  └─────────────┘  └─────────────┘
```

**Key decisions:**

- Vercel OIDC token → WIF → SA impersonation (no static key in runtime)
- SA key retained as **transitional fallback** for local dev, scripts, and any runtime shared todavía no verificado con WIF
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` remains legacy until Production/Staging complete the real rollout and validation window

#### Secret Classification

| Tier                   | Criteria                                     | Storage                     | Rotation          | Audit            | Count                       |
| ---------------------- | -------------------------------------------- | --------------------------- | ----------------- | ---------------- | --------------------------- |
| **Critical**           | Compromise = financial/legal/identity damage | GCP Secret Manager          | Future: automated | Cloud Audit Logs | 6                           |
| **Standard**           | Compromise = limited blast radius            | Vercel env vars (encrypted) | Manual            | Vercel audit log | 10                          |
| **Target elimination** | Replaced by keyless auth after rollout       | N/A                         | N/A               | N/A              | 2 (SA key + base64 variant) |

**Critical secrets (Secret Manager):**

1. `GREENHOUSE_POSTGRES_PASSWORD` (runtime)
2. `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
3. `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
4. `NEXTAUTH_SECRET`
5. `AZURE_AD_CLIENT_SECRET`
6. `NUBOX_BEARER_TOKEN`

**Standard secrets (Vercel env vars):**

- `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `GREENHOUSE_INTEGRATION_API_TOKEN`, `CRON_SECRET`, `HR_CORE_TEAMS_WEBHOOK_SECRET`, `NUBOX_X_API_KEY`, `SLACK_ALERTS_WEBHOOK_URL`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`

**Target elimination once rollout is verified:**

- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (replaced by WIF)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` (replaced by WIF)
- `GCP_ACCESS_TOKEN` (deprecated legacy)

### 3.2 Observability Strategy

#### Principle: Detect failures in minutes, not days

```
Error occurs
    │
    ├──► Sentry (automatic)
    │      • Stack trace + request context
    │      • Deduplication + alerting rules
    │      • Source maps for production debugging
    │
    ├──► Slack (cron failures only)
    │      • #greenhouse-alerts channel
    │      • 5 critical crons: outbox, webhook, sync, ico, nubox
    │
    └──► Health endpoint (deploy validation)
           • GET /api/internal/health
           • Validates: Postgres connectivity, BigQuery access
           • Returns: service status + git SHA + environment
```

**What we intentionally skip:**

- APM (Datadog/New Relic) — cost + complexity > value for 1 developer
- Distributed tracing (OpenTelemetry) — monolith, not microservices
- Structured logging library — Sentry captures what matters; console.error is fine for debug
- Uptime monitoring service — health endpoint enables this later if needed

### 3.3 Network Security

#### Cloud SQL Network Hardening

```
Before:  0.0.0.0/0 → Cloud SQL (any IP, optional SSL)
After:   Vercel IPs + Cloud Run NAT + Dev VPN → Cloud SQL (restricted, SSL enforced)
```

| Control             | Before                            | After                                            |
| ------------------- | --------------------------------- | ------------------------------------------------ |
| Authorized networks | `0.0.0.0/0`                       | Vercel egress CIDRs + Cloud Run NAT IP + dev VPN |
| SSL mode            | `ALLOW_UNENCRYPTED_AND_ENCRYPTED` | `ENCRYPTED_ONLY`                                 |
| Cloud SQL Connector | Available, not mandatory          | Preferred for all runtime connections            |

#### Security Headers

```
middleware.ts (all routes)
├── X-Frame-Options: DENY
├── X-Content-Type-Options: nosniff
├── Referrer-Policy: strict-origin-when-cross-origin
├── Permissions-Policy: camera=(), microphone=(), geolocation=()
├── Strict-Transport-Security: max-age=63072000 (production only)
└── Content-Security-Policy: default-src 'self' ... (permissive initial, harden over time)
```

#### Cron Route Authentication

```
Before:  18 routes × 2 inconsistent patterns (some fail-open)
After:   1 helper × 18 routes (timing-safe, fail-closed)

requireCronAuth(request)
├── If CRON_SECRET not configured → 503 (fail-closed)
├── Bearer token present → timingSafeEqual comparison
├── Vercel cron header → accept as secondary factor
└── Neither → 401
```

### 3.4 Database Resilience

| Control         | Before                  | After                                             |
| --------------- | ----------------------- | ------------------------------------------------- |
| Backup          | Daily 07:00 UTC, 7 days | Daily + **PITR enabled** (7 days WAL retention)   |
| Slow queries    | Invisible               | `log_min_duration_statement=1000` → Cloud Logging |
| DDL audit       | None                    | `log_statement=ddl` → Cloud Logging               |
| Connection pool | 5                       | 15 (Vercel serverless headroom)                   |
| Restore tested  | Never                   | Tested once, documented                           |

### 3.5 Cost Management

| Control           | Before | After                                            |
| ----------------- | ------ | ------------------------------------------------ |
| GCP budget alerts | None   | Monthly budget $200 (50/80/100% thresholds)      |
| BigQuery budget   | None   | Monthly budget $50                               |
| Query cost guard  | None   | `maximumBytesBilled: 1GB` default in bigquery.ts |
| Backfill override | N/A    | Explicit `10GB` override for known-large queries |

---

## 4. Implementation Sequence

### Dependency Graph

```
                    TASK-100 (CI Tests)          TASK-103 (Budget)
                         │                            │
                    independent                  independent
                         │                            │
                    ┌────▼────┐                  ┌────▼────┐
                    │ Week 1  │                  │ Week 1  │
                    └─────────┘                  └─────────┘

    TASK-099 (Headers)        TASK-096 F1 (Cloud SQL)
         │                          │
    independent                     │
         │                     ┌────▼────┐
    ┌────▼────┐                │ Week 1  │
    │ Week 1  │                └────┬────┘
    └─────────┘                     │
                                    │ depends on
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
              │ TASK-096   │  │ TASK-098   │  │ TASK-102   │
              │ F2 (WIF)   │  │ (Sentry)   │  │ (DB Resil) │
              │ Week 2-3   │  │ Week 2-3   │  │ Week 4     │
              └─────┬──────┘  └─────┬──────┘  └────────────┘
                    │               │
                    │          depends on
                    │               │
              ┌─────▼──────┐  ┌────▼──────┐
              │ TASK-096   │  │ TASK-101   │
              │ F3 (SecMgr)│  │ (Cron Auth)│
              │ Week 4     │  │ Week 3     │
              └────────────┘  └────────────┘
```

### Execution Timeline

| Week    | Tasks                                                                                    | Parallelizable                       | Gate                                                        |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| **1**   | TASK-100 (CI tests), TASK-099 (headers), TASK-096 Fase 1 (Cloud SQL), TASK-103 (budgets) | All four in parallel                 | Cloud SQL must stay accessible from Vercel post-restriction |
| **2-3** | TASK-096 Fase 2 (WIF), TASK-098 (Sentry + health + Slack)                                | Parallel                             | WIF must work in staging before touching production         |
| **3**   | TASK-101 (cron auth standardization)                                                     | After TASK-098 (uses Slack alerting) | All 18 crons must pass auth after migration                 |
| **4**   | TASK-096 Fase 3 (Secret Manager), TASK-102 (DB resilience)                               | Parallel                             | Restore test succeeded; lane closed for baseline scope      |

### Task Cross-Reference

| Task                             | ID       | Sequence   | Effort | Dependencies                                            |
| -------------------------------- | -------- | ---------- | ------ | ------------------------------------------------------- |
| CI Pipeline Test Step            | TASK-100 | **1 of 7** | 1h     | None                                                    |
| Security Headers Middleware      | TASK-099 | **2 of 7** | 3h     | None                                                    |
| GCP Secret Management (3 phases) | TASK-096 | **3 of 7** | 2w     | Fase 2 needs Fase 1 complete                            |
| Observability MVP                | TASK-098 | **4 of 7** | 1d     | TASK-096 Fase 1 (health check validates post-hardening) |
| Cron Auth Standardization        | TASK-101 | **5 of 7** | 2h     | TASK-098 (integrates Slack alerting)                    |
| Database Resilience Baseline     | TASK-102 | **Closed** | 0.5d   | TASK-096 Fase 1 (no concurrent Cloud SQL changes)       |
| GCP Budget Alerts                | TASK-103 | **7 of 7** | 30m    | None (independent)                                      |

---

## 5. What We Intentionally Defer

These are common cloud strategy recommendations that we explicitly choose **not** to implement given the current team size (1 developer) and project maturity.

| Recommendation                           | Why Not Now                                                                               | Trigger to Reconsider                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Terraform / Pulumi (IaC)**             | ~10 GCP resources, manual provisioning is tractable. IaC overhead > value for 1 developer | Second developer joins, or >25 GCP resources                  |
| **Kubernetes / GKE**                     | Vercel + Cloud Run solve compute. K8s is a full-time job                                  | Need for long-running background workers or custom networking |
| **Multiple service accounts per domain** | WIF eliminates the static key problem. Least-privilege SA separation is overhead          | Security audit requires it, or second team/service            |
| **Cloud Armor WAF**                      | Vercel Edge provides basic DDoS. Cloud Armor needs a GCP load balancer                    | Regulatory requirement, or DDoS incident                      |
| **Multi-region DR**                      | Audience is Chile + internal team. Latency doesn't justify dual-region                    | SLA commitment >99.9%, or international expansion             |
| **Redis / external cache**               | Next.js `unstable_cache` + ISR sufficient. Redis is another service to manage             | Cache invalidation becomes a bottleneck at scale              |
| **OpenTelemetry tracing**                | Monolith → no service-to-service traces needed. Sentry covers errors                      | Decompose into microservices                                  |
| **Automated secret rotation**            | Manual rotation is acceptable at 6 critical secrets                                       | Compliance requirement (SOC 2, ISO 27001)                     |
| **E2E tests (Playwright)**               | 86 unit tests don't even run in CI yet. Fix that first                                    | Unit tests stable in CI + high regression rate on UI flows    |
| **GitOps / ArgoCD**                      | No Kubernetes → no GitOps target                                                          | Kubernetes adoption                                           |
| **PgBouncer**                            | Pool of 15 is sufficient for current load. PgBouncer is ops overhead                      | Connection pool exhaustion under sustained load               |
| **Global rate limiting**                 | Only auth tokens are rate-limited. API abuse risk is low (internal + authenticated users) | Public API exposure, or abuse incident                        |

---

## 6. Security Principles

These principles govern security decisions across the hardening track and future work:

1. **Fail-closed, not fail-open** — if a secret is missing or auth config is absent, reject the request (503), don't skip validation.

2. **Incremental hardening** — don't block feature development with a security big-bang. Each task is independently deployable and adds value.

3. **Fallback on every path** — WIF falls back to SA key, Secret Manager falls back to env var. Zero-downtime migration, always.

4. **Proportional investment** — protect critical secrets (payroll passwords, session keys, tax API tokens) with Secret Manager. `CRON_SECRET` puede seguir en env directo; `RESEND_API_KEY` puede quedar en env directo solo si el flujo corre en un único runtime. Si el email corre en más de un runtime, usar `RESEND_API_KEY_SECRET_REF`.

5. **Verify before trusting** — test the restore, test the WIF token, test the auth helper. "It should work" is not the same as "it works".

6. **Minimize operational surface** — don't add infrastructure (Redis, PgBouncer, Vault) that requires ongoing maintenance. Prefer managed services and platform features.

---

## 7. Success Criteria (Post-Hardening)

| Dimension         | Target                                    | Measurement                                                                    |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Secret Management | No static SA keys in production/staging   | Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` absent from Vercel Production env |
| Network Security  | Cloud SQL inaccessible from arbitrary IPs | `nmap 34.86.135.144` from non-authorized IP returns filtered                   |
| Observability     | Cron failures detected in <5 minutes      | Force a cron failure → verify Sentry alert + Slack message                     |
| CI Validation     | No merge without passing tests            | Push a broken test → verify CI blocks the PR                                   |
| Auth Consistency  | All 18 crons use single helper            | `grep -r "requireCronAuth" src/app/api/cron/` returns 18 matches               |
| DB Resilience     | PITR enabled, restore tested              | `gcloud sql instances describe` shows PITR = true + restore doc exists         |
| Cost Visibility   | Budget alerts configured                  | GCP Billing shows 2 active budgets                                             |

---

## 8. Revision History

| Date       | Version | Author              | Changes                                                           |
| ---------- | ------- | ------------------- | ----------------------------------------------------------------- |
| 2026-03-28 | 1.0     | Architecture review | Initial document — pre-hardening assessment + target architecture |

---

_This document supersedes the Security Notes section in `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` for secret management and security posture decisions. The infrastructure doc remains the authoritative source for resource inventory and service configuration._

_End of document._
