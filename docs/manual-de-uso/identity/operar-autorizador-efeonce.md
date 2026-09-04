# Operar el autorizador de Efeonce (`auth.efeonce.org`)

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude (release 9100bbd2765d)
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1828 · TASK-1829)
> **Ruta en portal:** sin UI; se opera con `curl`, `gcloud`, `pnpm auth-server:rotate-key`, `pnpm auth-server:register-client`, `pnpm auth-server:register-issuer-environment` y las rutas admin `POST /api/admin/auth-server/oauth-clients` y `POST /api/admin/auth-server/consents/revoke`. Señales en `/admin/operations`.
> **Documentacion relacionada:** [Autorizador de Efeonce](../../documentation/identity/autorizador-efeonce.md), [Runbook auth-server](../../operations/runbooks/auth-server.md), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md), [Operar el binding de identidad externa](operar-binding-identidad-externa.md), [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)

## Para que sirve

Este manual te guía para operar el día a día del autorizador propio de Efeonce: comprobar que está sano,
prenderlo o apagarlo, rotar la llave con la que firma y retirar la versión vieja, y leer sus señales. Cubre la
capa entregada en `TASK-1828` (runtime, llaves y dirección pública) y, desde `TASK-1829`, la superficie OAuth:
registrar un cliente confidencial, revocar el consentimiento de una persona y prender el flag en staging. Cuando
exista el login de personas (`TASK-1830`) tendrá su propia sección.

El despliegue y la publicación del host en el balanceador son operaciones de plataforma; están en el
[runbook](../../operations/runbooks/auth-server.md) (§1 y §4) y no se repiten aquí.

## Antes de empezar

- Necesitas `gcloud` autenticado en el proyecto `efeonce-group` y, para rotar llaves, acceso a PostgreSQL por el
  proxy local (`pnpm pg:connect`, queda en `127.0.0.1:15432`).
- Ten claro que es **un solo servicio** Cloud Run (`auth-server`, `us-east4`) compartido por staging y
  producción, igual que `ops-worker`. Lo que hagas afecta a ambos. Está **en producción desde el 2026-09-04**
  (release `9100bbd2765d`, revisión `auth-server-00005-pk8`).
- La única dirección válida es `https://auth.efeonce.org`. La URL `.run.app` del servicio responde `421` a
  propósito.
- Las variables del servicio viven en `services/auth-server/deploy.sh`. Cambiarlas a mano en Cloud Run no dura:
  el siguiente deploy las pisa.
- Si el flag está apagado, `/readyz` responde `503` y el JWKS `404`. Eso es normal, no una falla.
- La superficie OAuth tiene **su propio interruptor**, `AUTH_SERVER_OAUTH_ENABLED` (default `false` en
  `deploy.sh`, independiente de `AUTH_SERVER_ENABLED`). Con OFF, la metadata y todo `/oauth/*` responden `404`;
  el JWKS sigue publicándose. Hoy está apagado en todos los entornos.
- Las rutas de administración se llaman con `pnpm staging:request` y una sesión con rol `efeonce_admin` (son las
  únicas que tienen las capabilities `identity.auth_client.register` e `identity.auth_consent.revoke`).

## Paso a paso

### 1. Verificar que está sano

```bash
curl -s https://auth.efeonce.org/healthz
curl -s -o /dev/null -w '%{http_code}\n' https://auth.efeonce.org/readyz
curl -s https://auth.efeonce.org/.well-known/jwks.json
```

Esperado con el flag ON: `healthz` → `200` (body `{enabled:true, oauth:false}` mientras OAuth siga apagado);
`readyz` → `200` con `postgres`, `kms` y `activeKey` en `ok`; el JWKS lista una llave `active` y, si hay rotación
en curso, también la `retiring`. Así respondió producción el 2026-09-04 tras el release `9100bbd2765d`.

Luego compara con el registro:

```bash
pnpm auth-server:rotate-key --status
```

Los `kid` que imprime deben ser los mismos que publica el JWKS. Si acabas de rotar, espera hasta cinco minutos
(el JWKS se cachea 60 s en el servicio y 300 s en clientes).

### 2. Prender o apagar el flag

`AUTH_SERVER_ENABLED` está en `deploy.sh` con default `true` desde 2026-09-04.

- **Apagado puntual** (por ejemplo, durante un incidente):

  ```bash
  AUTH_SERVER_ENABLED=false ENV=staging bash services/auth-server/deploy.sh
  ```

- **Apagado o encendido durable:** cambia el default en `deploy.sh`, haz commit y deja que el carril normal
  despliegue.

En ambos casos actualiza la fila del flag en
[`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md). Nunca uses
`gcloud run services update --update-env-vars` para esto.

### 3. Rotar la llave de firma

Una rotación crea una versión nueva en KMS, la registra como `active` y mueve la anterior a `retiring`, todo en
un paso:

```bash
pnpm auth-server:rotate-key
pnpm auth-server:rotate-key --status
```

Requisitos: `AUTH_SERVER_KMS_KEY` con el nombre completo de la llave y las variables de PG por el proxy
(`GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`,
`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=""`).

Después de rotar, repite el paso 1: el JWKS debe mostrar **los dos** `kid` mientras dure el solapamiento.

### 4. Retirar la versión anterior

Espera **al menos 1 hora** desde la rotación (es la ventana mínima; equivale a cuatro veces la vida máxima de un
token). Luego:

```bash
pnpm auth-server:rotate-key --retire <kid-anterior>
gcloud kms keys versions disable <n> --key auth-server-es256 --keyring auth-server \
  --location us-east4 --project efeonce-group
```

`--retire` antes de la hora falla a propósito. `--force` sólo se usa si la llave está comprometida, y queda
registrado en `signing_key_events`. Estado al 2026-09-04: versión 2 `active`, versión 1 `retiring` con retiro
pendiente.

### 5. Volver atrás

| Situación | Qué hacer | Tiempo |
| --- | --- | --- |
| Servicio degradado | Paso 2 con `AUTH_SERVER_ENABLED=false`, o volver a la revisión anterior: `gcloud run services update-traffic auth-server --to-revisions <prev>=100 --region us-east4` | < 5 min |
| Llave comprometida | Paso 3 (rotar) + paso 4 con `--force` + deshabilitar la versión en KMS; los tokens vigentes expiran solos | < 15 min |
| Host mal publicado | Plataforma: `enable_auth_host=false` en el Terraform de `efeonce-mcp` (ver runbook §4) | < 10 min |

### 6. Registrar un cliente OAuth confidencial

Sólo hace falta para conectores **hospedados** que pueden guardar un secreto (por ejemplo, un connector de
ChatGPT o una integración servidor a servidor). Las apps públicas (Claude Code, claude.ai, Codex) **no** pasan
por aquí: se presentan solas por CIMD o DCR.

Por CLI (necesita PostgreSQL por el proxy, mismas variables del paso 3):

```bash
pnpm auth-server:register-client -- --name "ChatGPT connector" \
  --redirect https://chat.example/cb \
  --auth-method client_secret_basic \
  --scopes "efeonce.mcp.read efeonce.mcp.globe.read"
```

Por la ruta admin (capability `identity.auth_client.register`):

```bash
pnpm staging:request POST /api/admin/auth-server/oauth-clients '{
  "clientName": "ChatGPT connector",
  "redirectUris": ["https://chat.example/cb"],
  "tokenEndpointAuthMethod": "client_secret_basic",
  "allowedScopes": ["efeonce.mcp.read", "efeonce.mcp.globe.read"]
}'
```

Lo que debes saber:

- La respuesta trae `client.clientId` (`efeonce-client-<hex>`, o el que pases en `--client-id` / `clientId`) y
  **`clientSecret` una sola vez**. Se guarda hasheado; si se pierde, registra otro cliente. Entrégalo por un canal
  seguro, nunca por Teams, Notion ni un commit.
- Los redirects de un cliente confidencial son **HTTPS exactos**. `localhost` por nombre se rechaza
  (`invalid_redirect_uri`, motivo `localhost_by_name`); si el conector necesita loopback, es un cliente público y
  debe usar CIMD o DCR.
- `allowedScopes` / `--scopes` acota lo que ese cliente puede pedir; si lo omites, puede pedir cualquier scope
  soportado. Los scopes de escritura igual exigen consentimiento explícito y step-up de la persona.
- Registrar con el mismo `clientId` responde `200` sin cambios (idempotente); no rota el secreto.

### 7. Revocar el consentimiento de una persona

Cuando una organización cliente pide cortar el acceso de una app a una persona, o ante una sospecha de abuso:

```bash
pnpm staging:request POST /api/admin/auth-server/consents/revoke '{
  "subject": "<sub del token o de la auditoría>",
  "clientId": "<client_id de la app: la URL CIMD, un dcr-… o un efeonce-client-…>",
  "reason": "Solicitud de la organización cliente, ticket 123"
}'
```

Campos: `subject` y `clientId` obligatorios; `reason` obligatorio (queda en la auditoría); `scopes` opcional
(lista para revocar sólo algunos; omitido = todos); `environmentId` opcional (default `efeonce-auth`). Exige la
capability `identity.auth_consent.revoke`.

Efecto:

- Los consentimientos de esa persona con esa app pasan a `revoked`; la próxima autorización vuelve a mostrar la
  pantalla de consentimiento.
- **Todas** las familias de tokens vivas de `(persona, app)` quedan revocadas: el refresh deja de servir de
  inmediato y `introspect` responde `active: false`.
- Un access token ya emitido puede seguir siendo aceptado por el gateway hasta que expire (**máximo 15 minutos**),
  porque el gateway verifica la firma con el JWKS sin consultar al emisor. Si necesitas cortar antes, revoca el
  grant o el binding de la persona ([manual de binding](operar-binding-identidad-externa.md)): eso sube `gv` y
  el gateway rechaza el token en la siguiente llamada.

### 8. Registrar el environment del emisor

Para que el emisor pueda ligar personas a organizaciones, tiene que existir como **environment** en
`greenhouse_core.external_identity_environments`. Esa fila se crea y se actualiza **sólo** con el CLI, que llama al
command canónico de `TASK-1631` (`upsertExternalIdentityEnvironment`: transacción + auditoría + outbox). Nunca con
SQL a mano.

Requisitos: `.env.local` y PostgreSQL por el proxy (`pnpm pg:connect`, perfil ops).

```bash
pnpm auth-server:register-issuer-environment                     # crea o actualiza la fila en draft (idempotente)
pnpm auth-server:register-issuer-environment --status active     # la activa (hacerlo junto con el paso 9)
pnpm auth-server:register-issuer-environment --environment-id efeonce-auth --status draft   # id explícito
```

Lo que registra: `environmentId` `efeonce-auth` (debe ser **igual** a `AUTH_SERVER_ENVIRONMENT_ID`), nombre
"Efeonce Auth", provider `efeonce_auth`, `issuerUrl` `https://auth.efeonce.org`, `jwksUri`
`https://auth.efeonce.org/.well-known/jwks.json`, `audience` `https://mcp.efeonce.org/mcp`, `issuerClass`
`external` y `subjectType` `public`. `issuerClass` **no se puede cambiar después**; si te equivocas, es un
environment nuevo.

Estado actual: la fila **ya existe en `draft`** (registrada el 2026-09-04, actor `cli:jreye`). Se deja en borrador
a propósito hasta el momento exacto en que se prenda `AUTH_SERVER_OAUTH_ENABLED` en staging (paso 9); ahí se corre
el CLI con `--status active`.

Qué significa `environment_inactive`: mientras el environment siga en `draft`, cualquier consulta de binding para
ese emisor (por ejemplo `pnpm staging:request "/api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=<sub>"`
con el token consumer del gateway) responde `200` con `outcome: environment_inactive`, y ningún token sería
`bound`. Es fail-closed por diseño, no una falla: en producción se comprobó exactamente eso el 2026-09-04 (`400`
sin parámetros, `401` sin token).

### 9. Prender la superficie OAuth en staging

Hoy `AUTH_SERVER_OAUTH_ENABLED` está apagado en todos los entornos (el runtime de producción lo lleva apagado
desde el release `9100bbd2765d`). Antes de prenderlo en staging, confirma:

1. El runtime está sano (paso 1) con `AUTH_SERVER_ENABLED=true`.
2. El emisor existe como environment en `greenhouse_core.external_identity_environments` (paso 8; hoy en `draft`)
   con `environmentId` **igual** a `AUTH_SERVER_ENVIRONMENT_ID` (default `efeonce-auth`), `issuerUrl`
   `https://auth.efeonce.org` y `audience` `https://mcp.efeonce.org/mcp`. En el mismo momento del flip, pásalo a
   `active` con `pnpm auth-server:register-issuer-environment --status active`. Sin la fila `active`, toda
   autorización termina en `access_denied` aunque el resto funcione.
3. Tienes al menos un cliente de prueba: un documento CIMD publicado por HTTPS o un registro DCR (abajo).
4. La fila del flag existe en [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md).

Prender:

- **Durable:** en `services/auth-server/deploy.sh` cambia el default de
  `AUTH_SERVER_OAUTH_ENABLED=${AUTH_SERVER_OAUTH_ENABLED:-false}` a `true`, haz commit y deja que el workflow
  `.github/workflows/auth-server-deploy.yml` despliegue al empujar a `develop`.
- **Puntual:** `AUTH_SERVER_OAUTH_ENABLED=true ENV=staging bash services/auth-server/deploy.sh`.

Verificar la metadata:

```bash
curl -s https://auth.efeonce.org/.well-known/oauth-authorization-server \
  | jq '.issuer, .code_challenge_methods_supported, .client_id_metadata_document_supported'
```

Esperado: `"https://auth.efeonce.org"` (idéntico al origen, sin barra final), `["S256"]` y `true`.

Probar un registro DCR y un canje inválido:

```bash
curl -s -X POST https://auth.efeonce.org/oauth/register -H 'content-type: application/json' -d '{
  "client_name": "smoke", "redirect_uris": ["http://127.0.0.1:43110/callback"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"]
}'
# → 201 con "client_id": "dcr-…"

curl -s -X POST https://auth.efeonce.org/oauth/token \
  -d 'grant_type=authorization_code&code=efc_invalido&client_id=<dcr-id>' \
  -d 'redirect_uri=http://127.0.0.1:43110/callback' \
  -d 'code_verifier=0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
# → 400 {"error":"invalid_grant"}
```

`GET /oauth/authorize` con ese cliente responde "Necesitas iniciar sesión" (`login_required`) hasta que
`TASK-1830` esté en staging: es lo esperado, no una falla. Deja evidencia en la task y actualiza el ledger.

**Rollback:** vuelve el default a `false` (o corre el deploy puntual con `false`) y redespliega. La metadata y
`/oauth/*` vuelven a `404`; los pases ya emitidos siguen siendo verificables con el JWKS hasta que expiren
(máximo 15 minutos) y no se pueden refrescar.

## Que significan las senales

| Señal (en `/admin/operations`) | Normal | En alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` | `ok` | `not_configured`: a Vercel le falta `AUTH_SERVER_JWKS_URL` — ya está configurada en producción y staging desde el 2026-09-04 (con redeploy), así que verla ahora es un drift, no lo esperado; la primera lectura humana en producción sigue pendiente. `error`: el JWKS no responde `200` o sus `kid` no coinciden con `signing_keys`. |
| `auth.signing_keys.lifecycle` | `ok` | `error`: no hay llave `active` o hay más de una. `warning`: una llave lleva más de 7 días en `retiring` — te olvidaste del paso 4. |
| `auth.oauth.code_reuse_detected` | `ok` (0 en 24 h) | `error`: alguien canjeó dos veces el mismo código de autorización. La familia ya quedó revocada sola; busca en `oauth_audit_events` por `client_id` para saber si es un cliente mal implementado o un código robado. |
| `auth.oauth.refresh_reuse_detected` | `ok` (0 en 24 h) | `error`: se presentó un refresh ya rotado o revocado (o desde otro cliente). Igual que arriba: familia revocada, investigar por `client_id` y `grant_id`. |
| `auth.oauth.cimd_rejected` | `ok` (0 en 24 h) | `warning`: una app se presentó con un documento CIMD inválido (redirects, `client_id` distinto de la URL, host privado, timeout). El motivo está en el evento `cimd_fetch` de la auditoría; el rechazo se recuerda 15 minutos. |
| Incidentes Sentry `component=auth-server` | ninguno | `check=kms`: fallo al firmar (permisos del SA o la versión activa fue deshabilitada). `check=postgres`: grants o Connector. |

Y en las respuestas del servicio: `503` en `/readyz` con el flag ON significa que una de las tres revisiones
falló (la respuesta dice cuál); `421` significa que el `Host` no está permitido; `404` en el JWKS con el flag ON
no debería pasar nunca.

## Que no hacer

- **No** intentes exportar, descargar o "respaldar" la llave privada. No existe fuera del HSM y no hay forma
  soportada de sacarla.
- **No** compartas `NEXTAUTH_SECRET`, cookies ni sesión del portal con este servicio, ni al revés.
- **No** retires una llave antes de la hora de solapamiento: hay pases firmados con ella que aún son válidos.
- **No** deshabilites en KMS la versión que está `active`: el servicio deja de firmar y `/readyz` cae a `503`.
- **No** edites `managed.domains` del certificado de `mcp.efeonce.org` para "agregar" `auth.efeonce.org`. Es un
  certificado aparte; tocar el del gateway lo deja fuera de servicio mientras se re-provisiona.
- **No** cambies variables con `--update-env-vars` a mano en Cloud Run: se pierden en el próximo deploy sin
  aviso.
- **No** agregues hosts a `AUTH_SERVER_ALLOWED_HOSTS` "para probar" desde la URL `.run.app`.
- **No** prendas `AUTH_SERVER_OAUTH_ENABLED` sin el environment `efeonce-auth` registrado y `active`: todo
  termina en `access_denied` y el diagnóstico se vuelve confuso.
- **No** cambies `AUTH_SERVER_ISSUER` a otro origen, a `http://` ni con barra final: los clientes rechazan la
  metadata si el `issuer` no es idéntico a la URL desde la que la leyeron.
- **No** registres clientes confidenciales con redirect `localhost` ni pidas "abrir" la política de redirects:
  las apps públicas ya tienen loopback en cualquier puerto por CIMD/DCR, y un cliente hospedado usa HTTPS exacto.
- **No** copies un `client_secret` a Teams, Notion, un ticket ni un commit. Se muestra una sola vez y se guarda
  hasheado; si se filtra, registra un cliente nuevo y deja el viejo sin uso.
- **No** borres ni edites filas de `oauth_audit_events` (es append-only, el trigger lo impide) ni "limpies"
  tokens o códigos con `DELETE` a mano: la revocación se hace por los commands (`revoke`, consentimiento).
- **No** hagas que ningún consumidor (gateway, portal) dependa de `/oauth/introspect` para autorizar: se verifica
  el JWT con el JWKS y se vuelve a comprobar `gv`.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| `/readyz` responde `503` y `activeKey: error` | No hay fila `active` en `signing_keys` | `pnpm auth-server:rotate-key --register` (o rotar) y volver a verificar |
| `/readyz` responde `503` y `kms: error` | La identidad del servicio perdió `cloudkms.signerVerifier` sobre la llave, o la versión activa está deshabilitada | Revisar IAM de `auth-server@efeonce-group` sobre la llave; revisar estado de la versión en KMS |
| `/readyz` responde `503` y `postgres: error` | Grants del schema `greenhouse_auth` o Connector | Verificar grants a `greenhouse_runtime` / `greenhouse_app`; `pnpm pg:doctor` |
| El deploy en CI falla con «KMS key not found» | El deployer `github-actions-deployer@` no tiene `roles/cloudkms.viewer` sobre la llave (pasó el 2026-09-04, run `33870746218`) | Otorgar el viewer sobre la llave y relanzar el workflow |
| `auth.signing_keys.lifecycle` en `warning` | Una llave lleva más de 7 días en `retiring` | Paso 4 |
| El JWKS no muestra la llave nueva después de rotar | Caché (60 s en el servicio, 300 s en clientes) | Esperar hasta 5 minutos y repetir el paso 1 |
| `421 misdirected_request` | Llamaste por la URL `.run.app` o con otro `Host` | Usar `https://auth.efeonce.org` |
| `https://auth.efeonce.org` no responde | El certificado sigue `PROVISIONING` o el host no está publicado (`enable_auth_host=false`) | Runbook §4 (plataforma) |
| La metadata y `/oauth/*` responden `404` con `AUTH_SERVER_ENABLED=true` | `AUTH_SERVER_OAUTH_ENABLED` está en `false` (estado actual, también en producción) | Esperado hasta prenderlo (paso 9); no es una falla |
| Un cliente rechaza la metadata por «issuer mismatch» | `AUTH_SERVER_ISSUER` no es idéntico al origen (`https://auth.efeonce.org`, sin barra final, sin `http://`) | Revisar el valor en `services/auth-server/deploy.sh`, corregir y redesplegar |
| `invalid_redirect_uri` al registrar o autorizar | La política de redirects: público = loopback `127.0.0.1`/`[::1]`/`localhost` en cualquier puerto con path y query exactos, o HTTPS exacto; confidencial = HTTPS exacto, `localhost` rechazado; nunca comodines | Corregir el redirect en la app o en el registro; no relajar la política |
| `access_denied` (o `invalid_grant` al canjear un código válido) con una persona autenticada | La persona no tiene membership `bound` en el environment `efeonce-auth`, o el environment sigue en `draft` (`environment_inactive`) | Activar el environment (paso 8, `--status active`) y ligar a la persona ([manual de binding](operar-binding-identidad-externa.md)); no es un problema del emisor |
| `/oauth/authorize` responde «Necesitas iniciar sesión» (`login_required`) | El emisor aún no autentica personas (`TASK-1830`) | Esperado; ningún código se emite hasta esa task |
| `consent_required` con `prompt=none` | La persona nunca consintió esa app y ese scope | Repetir la autorización sin `prompt=none` para que vea la pantalla |
| `429 slow_down` | Rate limit: `token` 60/min por IP y 120/min por cliente; `register` 10/min por IP | Esperar la ventana (60 s); si es un cliente legítimo en loop, revisar su implementación de refresh |
| `auth.oauth.cimd_rejected` en `warning` | El documento CIMD de una app es inválido o apunta a una red privada | Leer el motivo en el evento `cimd_fetch` de `oauth_audit_events`; el rechazo se recuerda 15 min, luego reintenta |
| `auth.oauth.code_reuse_detected` / `refresh_reuse_detected` en `error` | Reuso de un código o refresh; la familia ya fue revocada | Buscar en la auditoría por `client_id`/`grant_id`; si es un cliente conocido, revisar su implementación; si no, tratar como incidente |

## Referencias tecnicas

- Runbook operativo: [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md)
- ADR nativo (§Delta 2026-09-04 = lo implementado): [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
- Contrato OAuth (endpoints, claims, tablas, invariantes): [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)
- Invariantes para agentes: [`IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §Auth server propio](../../architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md#auth-server-propio-task-1828)
- Código: `services/auth-server/{server.ts,app.ts,deploy.sh,Dockerfile,README.md}` · `src/lib/auth-server/keys/**` ·
  `src/lib/auth-server/oauth/**` · `scripts/auth-server/rotate-signing-key.ts` ·
  `scripts/auth-server/register-oauth-client.ts` · `scripts/auth-server/register-issuer-environment.ts` ·
  `scripts/auth-server/oauth-store-smoke.ts` · `scripts/auth-server/generate-brand-assets.ts` ·
  `src/app/api/admin/auth-server/**` ·
  `src/lib/reliability/queries/auth-server-signals.ts` ·
  `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql` ·
  `migrations/20260904130826694_task-1829-auth-oauth-tables.sql`
- Flags: [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (`AUTH_SERVER_ENABLED`, `AUTH_SERVER_OAUTH_ENABLED`)
- Tasks: `docs/tasks/in-progress/TASK-1828-efeonce-auth-server-runtime-deployable.md` ·
  `docs/tasks/in-progress/TASK-1829-efeonce-auth-server-oauth-protocol-surface.md`
