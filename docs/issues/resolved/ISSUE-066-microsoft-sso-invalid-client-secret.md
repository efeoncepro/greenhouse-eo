# ISSUE-066 — Microsoft SSO callback invalid_client por secret rechazado

## Ambiente

production + staging

## Detectado

2026-05-03. Julio Reyes reporta que "Entrar con Microsoft" vuelve a redirigir a `/login?...&error=OAuthCallback` en producción.

## Resuelto

2026-05-03

## Síntoma

- El login con Microsoft en `https://greenhouse.efeoncepro.com/login` fallaba en el callback OAuth.
- La UI sólo mostraba el error genérico de NextAuth (`OAuthCallback`), sin exponer la causa real al usuario.
- Google SSO y credentials no eran la causa del incidente.

## Causa raíz

Los logs productivos de Vercel para `GET /api/auth/callback/azure-ad` mostraron:

- provider: `azure-ad`
- error: `OAUTH_CALLBACK_ERROR`
- Azure error: `AADSTS7000215`
- semántica: Entra ID rechazó el valor enviado como `client_secret` para la App Registration `3626642f-0451-4eb2-8c29-d2211ab3176c`.

La Azure App Registration seguía con las invariantes correctas de arquitectura:

- `signInAudience=AzureADMultipleOrgs`
- redirect URI production registrada
- redirect URI staging registrada

Esto descarta el drift de `ISSUE-061`; la falla era publicación/rotación del secret efectivo usado por Vercel.

## Solución

Se ejecutó una rotación segura vía Azure CLI con `--append`, sin eliminar el credential anterior durante la ventana de recuperación:

- App Registration: `Greenhouse`
- App ID: `3626642f-0451-4eb2-8c29-d2211ab3176c`
- nuevo credential display name: `greenhouse-production-staging-2026-05-04`
- TTL: 2 años

El nuevo secret fue validado contra el token endpoint de Microsoft antes de publicarlo. La respuesta esperada fue `invalid_grant` por Conditional Access, no `invalid_client`; eso prueba que Entra aceptó el secret aunque no emita token de `client_credentials`.

Luego se actualizó el source-of-truth operativo:

- Vercel `AZURE_AD_CLIENT_SECRET` en `production`
- Vercel `AZURE_AD_CLIENT_SECRET` en `staging`
- Vercel `AZURE_AD_CLIENT_SECRET` en `preview` scoped a `develop`
- GCP Secret Manager `greenhouse-azure-ad-client-secret-production`
- GCP Secret Manager `greenhouse-azure-ad-client-secret-staging`

## Hardening anti-regresión

`src/lib/auth/readiness.ts` ahora valida Azure en dos pasos:

1. OIDC discovery debe estar disponible.
2. Token probe controlado contra Microsoft detecta específicamente `invalid_client` / `AADSTS7000215`.

El probe no exige que Azure emita un token. `invalid_grant` por Conditional Access se considera señal sana para este chequeo, porque confirma que el secret fue aceptado y que el bloqueo ocurrió después.

## Verificación

- Logs productivos identificaron la causa exacta antes del cambio.
- Secret nuevo validado contra Microsoft token endpoint: no devuelve `invalid_client`.
- `pnpm exec vitest run src/lib/auth/readiness.test.ts src/lib/auth-secrets.test.ts src/lib/secrets/format-validators.test.ts` → 35/35 pass.
- `pnpm exec tsc --noEmit --pretty false` → pass.

## Riesgo residual

- El credential anterior se conserva temporalmente como rollback seguro. Debe retirarse después de confirmar estabilidad del login Microsoft en producción y staging.
- Si Microsoft SSO sigue fallando después de la rotación, la siguiente causa probable ya no es `invalid_client`; revisar logs del callback para Conditional Access, consentimiento tenant o autorización Greenhouse por usuario.

## Relacionado

- ISSUE-061 — Microsoft SSO callback rejection por drift multi-tenant.
- TASK-742 — Auth Resilience 7-Layer Architecture.
