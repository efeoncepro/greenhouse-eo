# Runbook — Efeonce Auth Server (`auth.efeonce.org`)

> **Tipo de documento:** Runbook operativo
> **Versión:** 1.0
> **Creado:** 2026-09-04 por Claude (TASK-1828, EPIC-044)
> **Última actualización:** 2026-09-04
> **Documentación técnica:** [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md) · [`services/auth-server/README.md`](../../../services/auth-server/README.md)

## Para qué sirve

Operar el authorization server propio de Efeonce: desplegarlo, prender/apagar su flag, verificar que firma
con la llave de Cloud KMS, rotar esa llave, y volver atrás en menos de diez minutos. Cubre sólo la capa de
runtime y llaves (TASK-1828). Los flujos OAuth (TASK-1829) y la autenticación de personas (TASK-1830)
agregan sus propias secciones cuando existan.

## Antes de empezar

- `gcloud` autenticado en `efeonce-group`. Para PG local, `pnpm pg:connect` (proxy `127.0.0.1:15432`).
- Topología: **un** Cloud Run service `auth-server` (`us-east4`) compartido por staging y producción, como
  `ops-worker`; publicado como **segundo host** del front door del gateway MCP (`efeonce-mcp/infra/terraform`,
  variable `enable_auth_host`). Misma IP `34.111.78.237`, misma policy Cloud Armor.
- Identidad de runtime: SA `auth-server@efeonce-group` con `roles/cloudkms.signerVerifier` **sólo** sobre la
  llave `auth-server-es256` y `roles/cloudsql.client`. No puede crear ni destruir versiones KMS.
- Source of truth de env vars: `services/auth-server/deploy.sh` (`--set-env-vars` es destructivo).
- IAM del deployer de CI (`github-actions-deployer@`): `roles/iam.serviceAccountUser` sobre `auth-server@` y
  `roles/cloudkms.viewer` **sobre la llave** (el preflight de `deploy.sh` hace `gcloud kms keys describe`; sin
  el viewer, KMS responde como si la llave no existiera y el run falla — caso 2026-09-04, run `33870746218`).

## Paso a paso

### 1. Desplegar

```bash
ENV=staging    bash services/auth-server/deploy.sh
ENV=production bash services/auth-server/deploy.sh
```

Cloud Build construye `gcr.io/efeonce-group/auth-server` (~6 min) y despliega con
`--ingress=internal-and-cloud-load-balancing --allow-unauthenticated`. El script verifica que la revisión
activa sirva `GIT_SHA=EXPECTED_SHA`. En CI lo hace `.github/workflows/auth-server-deploy.yml` (staging en
push a `develop`; producción sólo vía `production-release.yml`).

### 2. Verificar

```bash
curl -s https://auth.efeonce.org/healthz                  # 200 siempre (liveness)
curl -s -o /dev/null -w '%{http_code}\n' https://auth.efeonce.org/readyz   # 503 con flag OFF; 200 con ON
curl -s https://auth.efeonce.org/.well-known/jwks.json    # 404 con flag OFF; JWKS con ON
```

El `kid` publicado debe coincidir con `pnpm auth-server:rotate-key --status` (llave `active`, y `retiring`
durante una rotación). El JWKS lleva `Cache-Control: max-age=300` y el servicio cachea 60 s: tras una
rotación, esperar hasta cinco minutos para ver ambos `kid`.

### 3. Prender o apagar el flag

`AUTH_SERVER_ENABLED` vive en `deploy.sh` (default `true` desde 2026-09-04; con ON el servicio sólo expone
`/readyz` y el JWKS). Para apagarlo de forma durable, cambiar el default en `deploy.sh` y redeployar; para un
apagado puntual:

```bash
AUTH_SERVER_ENABLED=false ENV=staging bash services/auth-server/deploy.sh
```

Nunca `gcloud run services update --update-env-vars` a mano: el próximo deploy lo borra en silencio.
Actualizar la fila del ledger (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`).

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

## Qué significan las señales

| Señal | Steady | Cuándo alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` (`runtime`) | `ok` | `not_configured` mientras Vercel no tenga `AUTH_SERVER_JWKS_URL`; `error` si el JWKS no responde 200 o sus `kid` difieren del registry |
| `auth.signing_keys.lifecycle` (`data_quality`) | `ok` | `error` sin llave `active` (o con más de una); `warning` si una `retiring` lleva más de 7 días sin retirarse |
| Incidentes `identity` con tag `component=auth-server` | 0 | Fallos de KMS (`check=kms`), de PG o del handler; sustituyen a un contador `auth.kms.sign_failures` propio |

## Qué no hacer

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

- `services/auth-server/{server.ts,deploy.sh,Dockerfile}` · `src/lib/auth-server/keys/**` ·
  `src/lib/reliability/queries/auth-server-signals.ts` · `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql`
- Task: `docs/tasks/in-progress/TASK-1828-efeonce-auth-server-runtime-deployable.md`
