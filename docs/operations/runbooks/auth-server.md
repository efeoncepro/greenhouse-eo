# Runbook — Efeonce Auth Server (`auth.efeonce.org`)

> **Tipo de documento:** Runbook operativo
> **Versión:** 1.3
> **Creado:** 2026-09-04 por Claude (TASK-1828, EPIC-044)
> **Última actualización:** 2026-09-08 por Codex (TASK-1844: v2, configuración durable, CIMD y rollback compatible)
> **Documentación técnica:** [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) · [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) · [`services/auth-server/README.md`](../../../services/auth-server/README.md)

## Para qué sirve

Operar el authorization server propio de Efeonce: desplegarlo, prender/apagar su flag, verificar que firma
con la llave de Cloud KMS, rotar esa llave, y volver atrás en menos de diez minutos. Cubre la capa de runtime y
llaves (TASK-1828) y la superficie OAuth detrás de su propio flag (TASK-1829, §`OAuth`). La autenticación de personas externas pertenece a TASK-1830; la entrada corporativa, a TASK-1836; la autoridad interna multiorganización v2, a TASK-1844.

## Autoridad interna v2 y operación diaria

TASK-1844 está desplegada para la cohorte interna exacta. [Manual](../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md) · [Funcional](../../documentation/identity/acceso-mcp-interno-multiorganizacion.md) · [Rollout/rollback](../TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md). Scope base y capability SEO de lectura; cada organización se autoriza en Greenhouse, no en una lista del JWT. Altas/bajas elegibles posteriores no exigen reconectar.

- Emisión/refresh v2 requiere `AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED` y perfil exacto en `AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS`, además de los gates internos previos. El reader Vercel y gateway tienen gates independientes; configurar uno no activa los demás.
- Expand `20260908184942851` y contract `20260908194829159` están aplicadas. No repetirlas ni restaurar el índice antiguo; rollback sólo hacia writer compatible, conservando versiones, consentimientos y auditoría.
- CIMD admite un documento con grants adicionales, pero registra únicamente la intersección soportada `authorization_code`/`refresh_token`; vacío o identificador con whitespace se rechaza. Esto no habilita token exchange JWT-bearer. DCR conserva su validación propia; no alterar scopes por compatibilidad.
- Las flags internas/multiorg y la cohorte del servicio compartido se transportan desde variables del repositorio GitHub; otros defaults pertenecen a deploy.sh y se verifican por separado. El change-gate compara valores además del código. OFF/restore debe alcanzar configuración durable y revisión servida; un override efímero será reemplazado por el deploy siguiente.
- Revocar un contexto corta todas sus familias. Para retirar sólo una familia de prueba, seleccionar el grant exacto y comprobar que la familia definitiva sigue vigente; no confundir contexto compartido con ownership eliminable.
- El rollout verificó refresh real y revocación con JWT vigente. Claude Code necesitó login estándar tras OFF/restore; no repetir login por agregar una organización ni declarar recovery por estado Connected.

## Antes de empezar

- `gcloud` autenticado en `efeonce-group`. Para PG local, `pnpm pg:connect` (proxy `127.0.0.1:15432`).
- Topología: **un** Cloud Run service `auth-server` (`us-east4`) compartido por staging y producción, como
  `ops-worker`; publicado como **segundo host** del front door del gateway MCP (`efeonce-mcp/infra/terraform`,
  variable `enable_auth_host`). Misma IP `34.111.78.237`, misma policy Cloud Armor. **En producción desde
  2026-09-04** (release `9100bbd2765d`, revisión `auth-server-00005-pk8`).
- Identidad de runtime: SA `auth-server@efeonce-group` con `roles/cloudkms.signerVerifier` **sólo** sobre la
  llave `auth-server-es256` y `roles/cloudsql.client`. No puede crear ni destruir versiones KMS.
- Source of truth de env vars: `services/auth-server/deploy.sh` (`--set-env-vars` es destructivo).
- IAM del deployer de CI (`github-actions-deployer@`): `roles/iam.serviceAccountUser` sobre `auth-server@` y
  `roles/cloudkms.viewer` **sobre la llave** (el preflight de `deploy.sh` hace `gcloud kms keys describe`; sin
  el viewer, KMS responde como si la llave no existiera y el run falla — caso 2026-09-04, run `33870746218`).

## Paso a paso

### 1. Desplegar

Seguir el [runbook de release](production-release.md): preflight, candidato aprobado y orquestador `production-release.yml` con `target_sha` exacto. El workflow del emisor consume gates/cohorte desde GitHub. No copiar una invocación local con sólo `ENV`: `deploy.sh --set-env-vars` reemplaza configuración y los defaults multiorg false/cohorte vacía apagarían la autoridad existente. Uso directo sólo bajo break-glass autorizado, con todos los valores actuales preservados explícitamente y readback posterior.

Cloud Build construye `gcr.io/efeonce-group/auth-server` (~6 min) y despliega con
`--ingress=internal-and-cloud-load-balancing --allow-unauthenticated`. El script verifica que la revisión
activa sirva `GIT_SHA=EXPECTED_SHA`. En CI lo hace `.github/workflows/auth-server-deploy.yml` (staging en
push a `develop`; producción sólo vía `production-release.yml`).

El filtro de push incluye `services/auth-server/**`, también su README: un cambio documental dentro del
servicio puede iniciar el workflow. Su etiqueta staging no aísla el Cloud Run compartido de producción.
Antes de publicar documentación en esas rutas, revisar ese efecto y el plan de publicación. Una cancelación
no se considera efectiva por aceptar la solicitud: comprobar estado final del job, builds pendientes y
revisión con tráfico. El step `Deploy auth-server` incluye preflight antes del build; haberlo iniciado no
demuestra que haya creado una revisión. La publicación documental de TASK-1844 registró este caso y su
readback en el [expediente](../../audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md).

### 2. Verificar

```bash
curl -s https://auth.efeonce.org/healthz                  # 200 siempre (liveness); body incluye oauth:<bool>
curl -s -o /dev/null -w '%{http_code}\n' https://auth.efeonce.org/readyz   # 503 con flag OFF; 200 con ON
curl -s https://auth.efeonce.org/.well-known/jwks.json    # 404 con flag OFF; JWKS con ON
```

Desde TASK-1829 `/healthz` y `/readyz` reportan además `oauth: true|false` (estado de `AUTH_SERVER_OAUTH_ENABLED`);
con ese flag en `false`, la metadata OAuth y `/oauth/*` responden 404 aunque el servicio esté listo (ver §`OAuth`).

El `kid` publicado debe coincidir con `pnpm auth-server:rotate-key --status` (llave `active`, y `retiring`
durante una rotación). El JWKS lleva `Cache-Control: max-age=300` y el servicio cachea 60 s: tras una
rotación, esperar hasta cinco minutos para ver ambos `kid`.

Evidencia de producción (2026-09-04, release `9100bbd2765d`, run `33893120972`): revisión activa
`auth-server-00005-pk8` (`GIT_SHA f6db4255a`, árbol idéntico al target; deploy change-gated); `/healthz`
`{enabled:true, oauth:false}`; `/readyz` 200 con `postgres`, `kms` y `activeKey` en `ok`; JWKS con 2 `kid` (v2
`active` `xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc`, v1 `retiring` `VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8`);
`/.well-known/oauth-authorization-server` → 404 (flag OAuth OFF, esperado en ese snapshot). Para una lectura
actual, comenzar por `status.traffic` del servicio y revisar cada revisión con tráfico; `latestReadyRevisionName`
por sí sola no demuestra qué revisión recibe solicitudes. Contrastar después SHA/digest/flags de esa revisión.
`AUTH_SERVER_JWKS_URL` quedó declarada en Vercel Production y staging el mismo día (señal
`auth.issuer.jwks_unreachable` fuera de `not_configured`; lectura humana en producción pendiente).

### 3. Prender o apagar el flag

`AUTH_SERVER_ENABLED` vive en `deploy.sh` (default `true` desde 2026-09-04; con ON el servicio expone `/readyz`,
el JWKS y, sólo si además `AUTH_SERVER_OAUTH_ENABLED=true`, la superficie OAuth). El gate maestro afecta también a los carriles externos: no usarlo como rollback selectivo de v2. Para v2 seguir [OFF/restore por componentes](../TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md), actualizando las variables durables de emisión/cohorte y los gates separados de gateway/reader.

Cualquier apagado del maestro necesita alcance explícito y publicación gobernada de su fuente efectiva. No ejecutar un deploy local con una sola variable ni presentar un override Cloud Run como durable: el próximo deploy lo reemplaza. Preservar el resto de configuración y actualizar `FEATURE_FLAG_STATE_LEDGER.md` con readback.

### 4. Publicar el host en el front door (una sola vez)

Desde `efeonce-mcp/infra/terraform`, con el servicio Cloud Run ya existente:

```bash
tofu plan -input=false -var enable_auth_host=true     # esperado: 3 to add, 2 to change, 0 to destroy
tofu apply -input=false -var enable_auth_host=true
```

Cualquier `destroy` o `replace` sobre recursos `gateway` significa que algo está mal: abortar. El certificado
managed `efeonce-auth-server-cert` tarda entre 15 y 60 minutos en pasar a `ACTIVE`:

```bash
gcloud compute ssl-certificates describe efeonce-auth-server-cert --global --format='value(managed.status,managed.domainStatus)'
```

Verificar después que `mcp.efeonce.org` sigue respondiendo 200 en su discovery.

### 5. Rotar la llave de firma

```bash
pnpm auth-server:rotate-key            # crea versión KMS, la registra y la activa; la anterior → retiring
pnpm auth-server:rotate-key --status
# ≥ 1 h después (TTL máximo de token × 4):
pnpm auth-server:rotate-key --retire <kid-anterior>
gcloud kms keys versions disable <n> --key auth-server-es256 --keyring auth-server --location us-east4 --project efeonce-group
```

Requiere `AUTH_SERVER_KMS_KEY` y acceso a PG por el proxy con las variables `GREENHOUSE_POSTGRES_HOST=127.0.0.1`,
`GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false` y `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=""`.
`--retire` sin la ventana cumplida falla; `--force` sólo en incidente y queda en `signing_key_events`.

## OAuth (TASK-1829)

> Contrato técnico: [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md).
> Estado 2026-09-04: **`code complete, rollout pendiente`** — código en `develop` (commits `263ee3a74`, `19d1658de`,
> `d31e6e913`), migraciones aplicadas en Cloud SQL, flag `AUTH_SERVER_OAUTH_ENABLED=false` en `deploy.sh`.

### Registrar el environment del emisor (precondición del flag OAuth)

La fila `efeonce-auth` de `greenhouse_core.external_identity_environments` se registra por el command canónico de
TASK-1631 (`upsertExternalIdentityEnvironment`: tx + audit + outbox), nunca por SQL:
`pnpm auth-server:register-issuer-environment` (`scripts/auth-server/register-issuer-environment.ts`; proxy PG
`127.0.0.1:15432` + `.env.local`, perfil ops; flags `--status draft|active`, `--environment-id`). Registra
`displayName` «Efeonce Auth», provider `efeonce_auth`, `issuerUrl https://auth.efeonce.org`, `jwksUri
https://auth.efeonce.org/.well-known/jwks.json`, `audience https://mcp.efeonce.org/mcp`, `issuerClass external`,
`subjectType public`. Nace en `draft` (**registrada el 2026-09-04**, actor `cli:jreye`, `created=true`) y se pasa a
`active` con `--status active` en el mismo momento en que se prende `AUTH_SERVER_OAUTH_ENABLED` en staging; en
`draft` el resolver responde `environment_inactive` y ningún token sería `bound` (verificado en producción por el
lane ecosystem: `GET /api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=…` con el token
consumer del gateway → 200 `outcome: environment_inactive`; 400 sin parámetros; 401 sin token). `issuerClass` no
se puede cambiar después: el issuer es `https://auth.efeonce.org` exacto.

### Rutas y flag

Con `AUTH_SERVER_OAUTH_ENABLED=true` el servicio agrega, sobre las tres rutas de TASK-1828:

| Ruta | Qué hace |
| --- | --- |
| `GET /.well-known/oauth-authorization-server` · `GET /.well-known/openid-configuration` | Metadata RFC 8414 / OIDC; `issuer` idéntico al origen (`AUTH_SERVER_ISSUER`) |
| `POST /oauth/register` | DCR (RFC 7591) sólo para clientes **públicos**; 10/min por IP |
| `GET /oauth/authorize` · `POST /oauth/consent` | Code + PKCE `S256`; pantalla de consentimiento mínima server-side (campos `client_id`, `scope`, `return_to`, `decision`) |
| `POST /oauth/token` | `authorization_code` + `refresh_token`; auth `none` / `client_secret_basic` / `client_secret_post`; 60/min por IP · 120/min por cliente |
| `POST /oauth/revoke` · `POST /oauth/introspect` | RFC 7009 (revoca la familia) · RFC 7662 (sólo clientes confidenciales) |

Con el flag en `false` todas responden `404 {"error":"not_found"}`; `/healthz`, `/readyz` y el JWKS no cambian,
pero ambos health checks reportan `oauth: <bool>` para leer el estado del flag sin adivinar. Los clientes llegan
por **CIMD** (primario: `client_id` = URL https del documento; anti-SSRF, cache 24 h en `cimd_cache`), por DCR
(compat, sólo públicos) o pre-registrados como confidenciales (abajo). Tablas en `greenhouse_auth` (migration
`20260904130826694_task-1829-auth-oauth-tables.sql`): `oauth_clients`, `cimd_cache`, `authorization_codes`,
`refresh_tokens`, `access_tokens`, `client_consents`, `oauth_audit_events` (append-only; el rate limit cuenta
sobre ella, sin tabla extra). Access token: JWT ES256 de 15 min firmado por `signWithActiveKey`. El carril externo conserva su resolución de memberships/binding y versión de grants; la fórmula histórica `max(grantsVersion)` no se aplica a contextos internos. En v1/v2 interno, `gv` valida el ancla firmada; v2 reautoriza cada target con su propia revisión, nunca con el máximo entre organizaciones. Sin autoridad vigente en la población/contexto correspondiente, se deniega.

### Prender en staging

Precondiciones, en este orden:

1. Runtime desplegado con el código de TASK-1829 (verificar contenido del candidato aprobado y SHA servido, no ordenar SHAs lexicográficamente; lo hace
   `auth-server-deploy.yml` en el push a `develop`).
2. Fila del emisor en `greenhouse_core.external_identity_environments`: `environment_id=efeonce-auth`
   (= `AUTH_SERVER_ENVIRONMENT_ID`), `issuer_url=https://auth.efeonce.org`, `issuer_class=external`, `status=active`.
   La fila se creó en `draft` el 2026-09-04 y el bootstrap posterior la activó. Si se incorpora otro environment bajo autorización, usar
   `pnpm auth-server:register-issuer-environment --status active` (command de TASK-1631,
   `src/lib/identity/external-access`), nunca con `UPDATE` a mano. Sin la fila `active` ningún sujeto resuelve
   `bound` y todo `token` termina en `access_denied` (fail-closed por diseño, no bug).
3. Fila de `AUTH_SERVER_OAUTH_ENABLED` al día en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

Este bootstrap se ejecutó durante el rollout nativo; no volver a activar el environment o a publicar por leer este apartado. Para un cambio posterior, verificar primero configuración durable/servida y usar el orquestador. El default OAuth del script es true, pero no representa los demás gates: una invocación local incompleta puede apagar interno/v2/canary. Preservar sus valores y la cohorte exacta bajo el procedimiento de cambio autorizado.

`AUTH_SERVER_ENVIRONMENT_ID` (default `efeonce-auth`) y `AUTH_SERVER_MCP_AUDIENCE` (default
`https://mcp.efeonce.org/mcp`, el `aud` de los access tokens) también viven en `deploy.sh`. Nunca
`gcloud run services update --update-env-vars` a mano: el próximo deploy lo borra en silencio.

Verificar (metadata, registro y token):

```bash
curl -s https://auth.efeonce.org/.well-known/oauth-authorization-server | jq -r .issuer   # https://auth.efeonce.org (igual al origen)
curl -s https://auth.efeonce.org/readyz | jq .oauth                                         # true
curl -s -w '\n%{http_code}\n' -X POST https://auth.efeonce.org/oauth/register \
  -H 'content-type: application/json' \
  -d '{"client_name":"smoke","redirect_uris":["http://127.0.0.1:8976/cb"],"token_endpoint_auth_method":"none"}'   # 201 + client_id dcr-…
curl -s -X POST https://auth.efeonce.org/oauth/token \
  -d 'grant_type=authorization_code&client_id=<client_id>&code=efc_invalido&redirect_uri=http://127.0.0.1:8976/cb&code_verifier=x'   # {"error":"invalid_grant"}
```

El flujo con persona real (`/oauth/authorize` → consentimiento → code → JWT) recién se ejercita en staging cuando
TASK-1830 provea la sesión: hoy `authorize` responde `login_required` (401; con `prompt=none`, redirect con
`error=login_required`) para todo el mundo, y los scopes de escritura exigen además `step_up`.

### Registrar un cliente confidencial

Los clientes públicos se registran solos (CIMD/DCR). Los confidenciales (integraciones server-to-server con
`client_secret`) se pre-registran por el command `registerConfidentialClient`, con dos consumers del mismo primitive:

```bash
pnpm auth-server:register-client -- --name "ChatGPT connector" --redirect https://chat.example/cb \
  [--redirect …] [--auth-method client_secret_basic|client_secret_post] [--scopes "efeonce.mcp.read"] [--client-id efeonce-client-xyz]
```

o `POST /api/admin/auth-server/oauth-clients` en el portal (capability `identity.auth_client.register`, módulo
`organization`, grant `EFEONCE_ADMIN`). El secreto se muestra una sola vez; en PG queda sólo el hash. Redirects
de confidenciales: HTTPS exacto; `localhost` por nombre se rechaza (el alias `localhost` es sólo para públicos).

### Revocar un consentimiento

`POST /api/admin/auth-server/consents/revoke` (capability `identity.auth_consent.revoke`) con body
`{ subject, clientId, reason }` (`reason` obligatorio). Revoca los consents activos de `(subject, client)` **y
todas las familias de tokens** de ese par; el cliente vuelve a la pantalla de consentimiento en el próximo
`authorize`. `revokeClientConsent` es el único camino: nada de `UPDATE`/`DELETE` sobre `client_consents`.

### Señales OAuth

| Señal | Steady | Cuándo alerta |
| --- | --- | --- |
| `auth.oauth.code_reuse_detected` (`incident`) | 0 | `error` con ≥ 1 `code_reuse` en 24 h: un code se presentó dos veces; la familia ya quedó revocada, investigar cliente/red |
| `auth.oauth.refresh_reuse_detected` (`incident`) | 0 | `error` con ≥ 1 `refresh_reuse` en 24 h: refresh rotado, revocado o de otro cliente reutilizado (posible robo); familia revocada |
| `auth.oauth.cimd_rejected` (`incident`) | 0 | `warning` con ≥ 1 `cimd_fetch rejected` en 24 h: documento inválido, host privado (anti-SSRF), timeout o tamaño; leer `details` del audit |

Las tres leen `greenhouse_auth.oauth_audit_events` (ventana 24 h) desde el mismo reader de TASK-1828
(`getAuthServerSignals`), módulo `identity`.

### Rollback OAuth

`AUTH_SERVER_OAUTH_ENABLED=false` + redeploy (< 5 min): la metadata y `/oauth/*` vuelven a 404, los access tokens
vigentes expiran solos en ≤ 15 min y los refresh dejan de poder canjearse. No hace falta tocar tablas ni llaves.
Para cortar a un solo cliente o persona sin apagar el emisor: revocar el consentimiento (arriba).

### Qué no hacer (OAuth)

- No prender el flag sin la fila del environment `efeonce-auth` ni sin validar la metadata: el emisor quedaría
  publicado sin poder emitir, o con un `issuer` distinto del origen.
- No registrar clientes, consents ni tokens con SQL directo; no "limpiar" familias con `DELETE`: revocar por command.
  Las filas expiradas no se sirven; su limpieza programada (`oauth-gc`) es follow-up.
- No aceptar `localhost` para clientes confidenciales ni `code_challenge_method=plain`; no relajar el anti-SSRF ni
  el TTL de 24 h de CIMD.
- No editar `src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts` a mano: regenerar con
  `pnpm auth-server:brand-assets:generate` (hay test de drift contra `public/branding/SVG/isotipo-full-efeonce.svg`).
- No hacer que el gateway dependa de `/oauth/introspect`: verifica JWT + JWKS + recheck de `gv` (TASK-1831).

## Qué significan las señales

| Señal | Steady | Cuándo alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` (`runtime`) | `ok` | `not_configured` mientras Vercel no tenga `AUTH_SERVER_JWKS_URL`; `error` si el JWKS no responde 200 o sus `kid` difieren del registry |
| `auth.signing_keys.lifecycle` (`data_quality`) | `ok` | `error` sin llave `active` (o con más de una); `warning` si una `retiring` lleva más de 7 días sin retirarse |
| Incidentes `identity` con tag `component=auth-server` | 0 | Fallos de KMS (`check=kms`), de PG o del handler; sustituyen a un contador `auth.kms.sign_failures` propio |
| `auth.oauth.code_reuse_detected` · `auth.oauth.refresh_reuse_detected` · `auth.oauth.cimd_rejected` (`incident`) | 0 | Ver §`OAuth` → *Señales OAuth* (ventana 24 h sobre `oauth_audit_events`) |

## Verificar las pantallas antes de tocarlas (TASK-1835)

El emisor sirve HTML propio, sin React ni bundle de cliente. Tres comandos lo verifican en local; los
tres exigen el harness levantado.

```bash
pnpm auth-server:dev-ui          # renderers REALES con DTOs ficticios, 127.0.0.1:19036, sólo lectura
pnpm auth-server:verify-contrast # contraste medido sobre los PÍXELES de la captura
pnpm auth-server:verify-passkey  # el carril de passkey del login en un navegador real
```

**Por qué el contraste se mide sobre píxeles y no con axe.** El gate de accesibilidad de GVC corre
axe y llegó a reportar `violations: 0` en 40 capturas del emisor. Ese cero no decía «pasa», decía «no
pude mirar»: con el fondo en degradado y un `::after`, axe devuelve TODAS las filas de texto en
`incomplete`. Debajo de ese cero había texto a 1.53:1 en la ficha de aplicación del consentimiento.
**Un cero de axe no es evidencia de contraste en este servicio.**

Capturas de las 29 pantallas: `AGENT_AUTH_BASE_URL=http://127.0.0.1:19036 pnpm fe:capture
task1835-runtime-<fixture> --env=local` (la lista sale de `scripts/frontend/scenarios/`).

## Qué no hacer

- **No confiar en un `violations: 0` de axe** como prueba de contraste acá: ver la sección anterior.
- **No reusar una clase de texto entre el lienzo y la tarjeta.** Son fondos opuestos; la regla escrita
  para uno le impone su color al otro. Costó 1.53:1 y 3.28:1 en la misma sesión.
- **No editar los `*.generated.ts`.** El CSS, los assets de marca y los controladores del navegador se
  generan con `pnpm auth-server:brand-assets:generate`; hay drift tests que fallan si se editan a mano.
- **No escribir backticks dentro de los comentarios CSS de `scripts/auth-server/styles.ts`.** El CSS
  vive en un template literal: un backtick cierra la plantilla y el generador aborta.
- No compartir `NEXTAUTH_SECRET`, cookies ni sesión del portal con este servicio.
- No exportar ni copiar la llave privada: no existe fuera del HSM.
- No editar `managed.domains` del certificado del gateway para agregar `auth.efeonce.org`: re-provisiona
  `mcp.efeonce.org`. Es un segundo certificado.
- No retirar un `kid` con tokens vigentes (ventana mínima 1 h).

## Rollback

| Situación | Acción | Tiempo |
| --- | --- | --- |
| Servicio degradado | `AUTH_SERVER_ENABLED=false` + redeploy, o `gcloud run services update-traffic auth-server --to-revisions <prev>=100` | < 5 min |
| Host mal publicado | `tofu apply -var enable_auth_host=false` (quita host rule, backend, NEG y cert; el gateway no cambia) | < 10 min |
| Llave comprometida | rotar (`rotate-key`), retirar con `--force`, deshabilitar la versión KMS; los tokens vigentes expiran en ≤ 15 min | < 15 min |

## Problemas comunes

- **`/readyz` 503 con flag ON:** revisar `checks` en la respuesta. `postgres: error` → grants o Connector;
  `activeKey: error` → no hay fila `active` (registrar con `rotate-key --register`); `kms: error` → IAM del SA.
- **HTTPS no responde en `auth.efeonce.org`:** el certificado sigue `PROVISIONING` o el host no está en el URL
  map (`enable_auth_host=false`).
- **421 `misdirected_request`:** el `Host` no está en `AUTH_SERVER_ALLOWED_HOSTS`.
- **`ERR_PNPM_FETCH_401` en Cloud Build:** credencial de paquetes AXIS vencida; ver la skill de release.

## Referencias técnicas

- `services/auth-server/{server.ts,app.ts,deploy.sh,Dockerfile}` · `src/lib/auth-server/keys/**` · `src/lib/auth-server/oauth/**` ·
  `src/lib/reliability/queries/auth-server-signals.ts` · `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql` ·
  `migrations/20260904130826694_task-1829-auth-oauth-tables.sql` · `scripts/auth-server/{rotate-signing-key,register-oauth-client,oauth-store-smoke,generate-brand-assets,register-issuer-environment}.ts`
- Gates OAuth: `pnpm vitest run src/lib/auth-server` (68 tests, flujo completo in-process) · `pnpm auth-server:oauth-store:smoke` (PG real)
- Tasks: `TASK-1828` (runtime + llaves) · `TASK-1829` (OAuth) en `docs/tasks/`

## Rollout conjunto OAuth/personas autorizado 2026-09-04

El servicio Cloud Run es único para staging y producción: un despliegue de staging cambia el mismo host público. La activación conjunta requiere llevar TASK-1830 al runtime, activar `efeonce-auth` por `pnpm auth-server:register-issuer-environment --status active` y declarar ambos flags en `deploy.sh`. El mailer necesita además `secretAccessor` del runtime sobre la referencia Resend; el deploy reconcilia ese permiso con `ensure_secret_accessor_binding`. Declarar la referencia no concede IAM.

Evidencia y estado: [auditoría de rollout](../../audits/2026-09-04-epic-044-auth-rollout.md). La revisión de rollback inicial es `auth-server-00006-znf` (OAuth OFF, sin personas); no confundir readiness con un flujo autenticado.
