# ISSUE-016 — Microsoft SSO roto en produccion (secret rotado + member_id faltante en BQ)

## Ambiente

production

## Detectado

2026-04-05, reporte de usuario tras merge develop → main. Ni el admin ni otros colaboradores podian ingresar con Microsoft SSO. URL mostraba `error=OAuthCallback`.

## Sintoma

Al hacer click en "Entrar con Microsoft", el flujo OAuth completaba la autenticacion en Microsoft pero al regresar a Greenhouse, NextAuth mostraba `error=OAuthCallback` y redireccionaba a `/login`.

## Causa raiz

Dos problemas independientes que se manifestaron juntos tras el merge a produccion:

### 1. Azure AD client secret rotado sin sincronizar produccion

El `AZURE_AD_CLIENT_SECRET` fue rotado en Azure Portal y actualizado en GCP Secret Manager solo para staging (`greenhouse-azure-ad-client-secret-staging` v2, 2026-04-05 15:54). El secret de produccion (`greenhouse-azure-ad-client-secret-production`) seguia en v1 (2026-03-29), que ya no era valido en Azure AD.

Resultado: el token exchange OAuth (code → access_token) fallaba porque Vercel Production enviaba un client_secret invalido a Microsoft.

### 2. Columna `member_id` inexistente en BigQuery `greenhouse.client_users`

TASK-255 agrego `cu.member_id` al SELECT y GROUP BY de la query BigQuery en `getIdentityAccessRecord()` (`src/lib/tenant/access.ts`). Esa columna existe en PostgreSQL `client_users` pero NO en BigQuery `greenhouse.client_users`.

Cuando el lookup de PostgreSQL falla y el login cae al path BigQuery (fallback), la query fallaba con columna inexistente. Esto afectaba tanto Microsoft SSO como Google SSO y credentials si el path PG no estaba disponible.

## Impacto

**Critico.** Ningun usuario podia ingresar a produccion via Microsoft SSO. Login con credentials (email/password) tambien estaria afectado si el path PostgreSQL fallaba.

## Solucion

### Fix 1 — Sincronizar secret de produccion

```bash
# Copiar secret de staging a produccion
gcloud secrets versions access latest \
  --secret=greenhouse-azure-ad-client-secret-staging \
  --project=efeonce-group \
| gcloud secrets versions add greenhouse-azure-ad-client-secret-production \
  --project=efeonce-group --data-file=-

# Forzar redeploy para que el nuevo cold start tome el secret actualizado
npx vercel redeploy <deployment-url> --scope efeonce-7670142f
```

El redeploy es necesario porque `authSecrets` se resuelve como module-level `await` en `src/lib/auth-secrets.ts` — solo se ejecuta en cold start, no se refresca en caliente.

### Fix 2 — Reemplazar `cu.member_id` con NULL en query BQ

```sql
-- Antes (rompe porque la columna no existe en BQ)
cu.member_id,

-- Despues (safe fallback)
CAST(NULL AS STRING) AS member_id,
```

Y se removio `cu.member_id` del GROUP BY. El `member_id` solo esta disponible via el path PostgreSQL (que es el path primario).

Commit: `79bb899f` — `hotfix(auth): fix SSO login — member_id column missing in BigQuery client_users`

## Verificacion

- Microsoft SSO funciona en produccion — confirmado por usuario admin
- Deploy `greenhouse-p1l2e67b9` Ready en produccion
- Secret Manager produccion en v2 (`2026-04-05T21:25:45`)

## Estado

resolved

## Reglas preventivas

1. **Al rotar secrets de Azure AD (o cualquier OAuth provider)**, actualizar Secret Manager en TODOS los ambientes: staging Y produccion. Verificar con `gcloud secrets versions list`.

2. **Al agregar columnas al SELECT de `getIdentityAccessRecord()` (query BQ)**, verificar que la columna existe en BigQuery `greenhouse.client_users`. Las tablas PG y BQ no tienen paridad de schema — PG tiene columnas que BQ no tiene (como `member_id`). Usar `CAST(NULL AS <type>) AS <col>` para columnas que solo existen en PG.

3. **Despues de un merge a produccion**, verificar SSO haciendo al menos un login de prueba antes de declarar el deploy exitoso.

## Relacionado

- Commit hotfix BQ: `79bb899f` — `hotfix(auth): fix SSO login — member_id column missing in BigQuery client_users`
- Archivo: `src/lib/tenant/access.ts` (lineas 263, 321)
- Secret Manager: `greenhouse-azure-ad-client-secret-production` v1→v2
- TASK-255 introdujo el cambio de `member_id` en BQ query
- `src/lib/auth-secrets.ts` — module-level await, requiere redeploy para refrescar
- `src/lib/secrets/secret-manager.ts` — resolucion: Secret Manager > env var, cache 60s
