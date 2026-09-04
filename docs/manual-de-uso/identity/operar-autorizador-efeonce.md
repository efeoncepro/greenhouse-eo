# Operar el autorizador de Efeonce (`auth.efeonce.org`)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1828)
> **Ruta en portal:** sin UI; se opera con `curl`, `gcloud` y `pnpm auth-server:rotate-key`. Señales en `/admin/operations`.
> **Documentacion relacionada:** [Autorizador de Efeonce](../../documentation/identity/autorizador-efeonce.md), [Runbook auth-server](../../operations/runbooks/auth-server.md), [EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)

## Para que sirve

Este manual te guía para operar el día a día del autorizador propio de Efeonce: comprobar que está sano,
prenderlo o apagarlo, rotar la llave con la que firma y retirar la versión vieja, y leer sus señales. Cubre sólo
la capa entregada en `TASK-1828` (runtime, llaves y dirección pública). Cuando existan los flujos OAuth
(`TASK-1829`) y el login de personas (`TASK-1830`), tendrán sus propias secciones.

El despliegue y la publicación del host en el balanceador son operaciones de plataforma; están en el
[runbook](../../operations/runbooks/auth-server.md) (§1 y §4) y no se repiten aquí.

## Antes de empezar

- Necesitas `gcloud` autenticado en el proyecto `efeonce-group` y, para rotar llaves, acceso a PostgreSQL por el
  proxy local (`pnpm pg:connect`, queda en `127.0.0.1:15432`).
- Ten claro que es **un solo servicio** Cloud Run (`auth-server`, `us-east4`) compartido por staging y
  producción, igual que `ops-worker`. Lo que hagas afecta a ambos.
- La única dirección válida es `https://auth.efeonce.org`. La URL `.run.app` del servicio responde `421` a
  propósito.
- Las variables del servicio viven en `services/auth-server/deploy.sh`. Cambiarlas a mano en Cloud Run no dura:
  el siguiente deploy las pisa.
- Si el flag está apagado, `/readyz` responde `503` y el JWKS `404`. Eso es normal, no una falla.

## Paso a paso

### 1. Verificar que está sano

```bash
curl -s https://auth.efeonce.org/healthz
curl -s -o /dev/null -w '%{http_code}\n' https://auth.efeonce.org/readyz
curl -s https://auth.efeonce.org/.well-known/jwks.json
```

Esperado con el flag ON: `healthz` → `200`; `readyz` → `200` con `postgres`, `kms` y `activeKey` en `ok`; el
JWKS lista una llave `active` y, si hay rotación en curso, también la `retiring`.

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

## Que significan las senales

| Señal (en `/admin/operations`) | Normal | En alerta |
| --- | --- | --- |
| `auth.issuer.jwks_unreachable` | `ok` | `not_configured`: Vercel aún no tiene `AUTH_SERVER_JWKS_URL` (esperado hasta que se configure). `error`: el JWKS no responde `200` o sus `kid` no coinciden con `signing_keys`. |
| `auth.signing_keys.lifecycle` | `ok` | `error`: no hay llave `active` o hay más de una. `warning`: una llave lleva más de 7 días en `retiring` — te olvidaste del paso 4. |
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

## Referencias tecnicas

- Runbook operativo: [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md)
- ADR nativo (§Delta 2026-09-04 = lo implementado): [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
- Invariantes para agentes: [`IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §Auth server propio](../../architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md#auth-server-propio-task-1828)
- Código: `services/auth-server/{server.ts,deploy.sh,Dockerfile,README.md}` · `src/lib/auth-server/keys/**` ·
  `scripts/auth-server/rotate-signing-key.ts` · `src/lib/reliability/queries/auth-server-signals.ts` ·
  `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql`
- Flag: [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (`AUTH_SERVER_ENABLED`)
- Task: `docs/tasks/in-progress/TASK-1828-efeonce-auth-server-runtime-deployable.md`
