# Efeonce Marketing Studio — Runtime handoff

> **Tipo:** runbook operativo
> **Creado:** 2026-09-25 por Claude (TASK-1887)
> **Arquitectura:** [EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md)
> **Repo de código:** `efeoncepro/efeonce-marketing-studio` (privado, rama `main`, local en `../efeonce-marketing-studio`)

## Estado vivo (2026-09-25)

| Pieza | Estado |
|---|---|
| Web + API `/api/v1` | Deploy de producción `READY` en Vercel (`dpl_128uickaRf8PoKVGEzxGgtR1MuTB`, commit `77e58e4`, toolchain TS 7 · React 19.3) |
| `studio.efeonce.org` | En vivo: CNAME en HostGator + certificado Let's Encrypt (renovación automática de Vercel) |
| Base de producción `marketing_studio` | Migrada (2 migraciones), import aplicado: 5 campañas, 21 conceptos, 54 piezas, 48 copys, 72 anuncios, 4 audiencias, 1 flight, 7 líneas de presupuesto, 6 posts |
| Base de staging `marketing_studio_staging` | Igual que producción |
| Renditions | 108 en cada bucket (miniatura + preview de 54 piezas) |
| Acceso | `STUDIO_ACCESS_MODE=open` (sólo lectura, sin login, noindex). Login con `auth.efeonce.org` = task hija de EPIC-049 |

## Toolchain (2026-09-25)

Node 24 LTS · pnpm 10 · Next.js 16.3 (Turbopack) · React 19.3 · **TypeScript 7** (Next lo usa en el chequeo del build) · Vitest 5 · Kysely 0.29 · Zod 4.6. Versiones únicas en el `catalog:` de `pnpm-workspace.yaml`; `dependency-catalog-gate` (en `pnpm gates`) falla ante versiones propias por paquete o dependencias duplicadas. Detalle en `AGENTS.md` del repo de Studio.

## Recursos

| Recurso | Valor |
|---|---|
| Proyecto Vercel | `efeonce-marketing-studio` · `prj_dztLezZkYxAJikDuPSdT9QROEJRS` · team `efeonce-7670142f` · root `apps/web` · pin en `.vercel/project.json` del repo |
| Instancia Cloud SQL | `efeonce-group:us-east4:greenhouse-pg-dev` (compartida con Greenhouse) |
| Bases | `marketing_studio` (prod) · `marketing_studio_staging` (preview y development) |
| Roles PG | `marketing_studio_migrator` (dueño de las bases, DDL) · `marketing_studio_runtime` (NOLOGIN, DML) · `marketing_studio_app` (prod, `CONNECT` sólo a `marketing_studio`) · `marketing_studio_staging_app` (`CONNECT` sólo a staging) |
| Secretos | `marketing-studio-pg-app-password` · `marketing-studio-pg-staging-app-password` · `marketing-studio-pg-migrator-password` · `axis-packages-read-token` (npmrc; Vercel usa sólo el `_authToken`) |
| Service accounts | `marketing-studio-runtime@` (producción: `cloudsql.client`, secreto prod, lectura del bucket prod) · `marketing-studio-runtime-stg@` (preview/development: equivalentes de staging) |
| WIF | Pool `vercel`, provider `greenhouse-eo` (issuer del team); bindings por subject `owner:efeonce-7670142f:project:efeonce-marketing-studio:environment:<env>` |
| Buckets | `efeonce-marketing-studio-media` · `efeonce-marketing-studio-media-staging` (us-east4, privados, acceso uniforme, sin acceso público) |

## Variables en Vercel

| Variable | production | preview + development |
|---|---|---|
| `STUDIO_PG_INSTANCE_CONNECTION_NAME` | `efeonce-group:us-east4:greenhouse-pg-dev` | igual |
| `STUDIO_PG_DATABASE` | `marketing_studio` | `marketing_studio_staging` |
| `STUDIO_PG_USER` | `marketing_studio_app` | `marketing_studio_staging_app` |
| `STUDIO_PG_PASSWORD_SECRET_REF` | `projects/efeonce-group/secrets/marketing-studio-pg-app-password/versions/latest` | `…/marketing-studio-pg-staging-app-password/versions/latest` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/183008134038/locations/global/workloadIdentityPools/vercel/providers/greenhouse-eo` | igual |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `marketing-studio-runtime@efeonce-group.iam.gserviceaccount.com` | `marketing-studio-runtime-stg@…` |
| `STUDIO_ACCESS_MODE` | sin definir (= `open`) | `open` |
| `STUDIO_PUBLIC_URL` | `https://studio.efeonce.org` | — |
| `NODE_AUTH_TOKEN` | token de lectura de paquetes (encrypted) | igual |

## DNS (aplicado 2026-09-25)

En el panel DNS de HostGator para `efeonce.org`:

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| `CNAME` | `studio` | `e33b47bdb5fb489f.vercel-dns-016.com.` | 3600 (o el mínimo del panel) |

Alternativa si el panel no acepta ese destino: `CNAME studio → cname.vercel-dns.com.`. Verificación:
`dig +short CNAME studio.efeonce.org` y `curl -I https://studio.efeonce.org/api/v1/health` (200). Vercel emite el
certificado solo tras la propagación. El 2026-09-25 no lo emitió solo en ~7 min; se destrabó con `vercel certs issue studio.efeonce.org --scope efeonce-7670142f`. El CNAME en `studio` no afecta el correo (MX, `autodiscover` y SPF de Outlook viven en la raíz y en `autodiscover`).

## Comandos (desde `../efeonce-marketing-studio`)

```bash
NODE_AUTH_TOKEN="$(gh auth token)" pnpm install        # el registro AXIS exige token
pnpm check                                              # gates + typecheck (incl. theme:check) + tests
pnpm dev                                                # http://localhost:3100 (apps/web/.env.local con STUDIO_PG_* hacia staging)

# Túnel a Cloud SQL para CLI (puerto propio para no chocar con Greenhouse)
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15433

# Migraciones (credencial de migrador)
DATABASE_URL="postgres://marketing_studio_migrator:<secreto>@127.0.0.1:15433/<base>" pnpm migrate up

# Import del catálogo (dry-run por defecto; --apply escribe). Idempotente: reimportar inserta 0 filas.
STUDIO_PG_HOST=127.0.0.1 STUDIO_PG_PORT=15433 STUDIO_PG_DATABASE=<base> STUDIO_PG_USER=<usuario app> \
STUDIO_PG_PASSWORD="$(gcloud secrets versions access latest --secret=<secreto app>)" \
pnpm import:catalog --catalog "<…>/Campaign Manager/CATALOGO-DATOS.json" \
  --readback "CMP-003=<greenhouse-eo>/ai-generations/2026-09-24_cmp003-sky-reel-cover/scheduling/metricool-readback.json" [--apply]

# Renditions (miniatura 640 px + preview 1600 px WebP; ffmpeg para videos). Idempotente.
pnpm media:renditions --root "<…>/Alineación/5. Contenidos" --bucket <bucket> [--apply]

# Tema: regenerar tras subir la versión de @efeoncepro/axis-tokens
pnpm --filter @studio/web theme:generate
```

Probar un deployment protegido por SSO sin crear bypass manual: `vercel curl /api/v1/health --deployment <url> --scope efeonce-7670142f`.

## Rollback

| Qué | Cómo |
|---|---|
| Deploy | `vercel rollback` al deployment anterior o redeploy de un commit previo |
| Datos | Reimportar la fuente (idempotente). Deshacer completo: `DROP DATABASE marketing_studio` (no toca Greenhouse) |
| Migración de renditions | `pnpm migrate down` (borra la tabla y restaura las rutas previas) |
| Dominio | Quitar el CNAME o el dominio del proyecto |

## Trampas conocidas

- **Autor de commit.** Vercel bloquea deployments por Git (`COMMIT_AUTHOR_REQUIRED`) si el email del autor no se asocia a una cuenta de GitHub vinculada al team. El repo usa `user.email = jreyes@efeonce.cl`. Con `jreye@MacBook-Air.local` o `jreyes@efeoncepro.com`, los deployments quedaron `BLOCKED`.
- **Secreto `axis-packages-read-token`.** Guarda un `.npmrc` completo, no un token suelto. Si se copia entero en `NODE_AUTH_TOKEN`, pnpm falla con `ERR_INVALID_CHAR`. A Vercel va solo el valor `_authToken` de `npm.pkg.github.com`.
- **Usuarios en Cloud SQL.** No crearlos con `gcloud sql users create`: quedan en `cloudsqlsuperuser` y podrían leer la base de Greenhouse. Los roles de Studio se crearon por SQL (`SET ROLE cloudsqlsuperuser`).
- **IAM DB auth no está disponible.** La instancia no tiene el flag `cloudsql.iam_authentication`, y activarlo modifica la instancia compartida con Greenhouse en producción. Por eso Studio usa usuario con contraseña guardada en Secret Manager.
- **Riesgo residual.** Los roles de Studio pueden abrir conexión a `greenhouse_app` por el `CONNECT` de PUBLIC, pero verificado: 0 tablas legibles y ninguna función `SECURITY DEFINER` alcanzable. Cerrarlo del todo requiere revocar ese `CONNECT` en la base de Greenhouse, que es un cambio de Greenhouse.
- **Constantes compartidas.** Un Server Component no puede importar constantes desde un módulo `'use client'` (llegan como referencia de cliente). La cookie del tema vive en `components/theme.ts`.
