# TASK-2067 — preflight productivo de correo y SQL

Fecha: 2026-10-25. Revisión sólo lectura de Resend/GCP/SQL; fix de sender exclusivamente local autorizado
posteriormente. No envíos, PATCH de proveedor, cloud writes, activación de flags ni ALTER ROLE ejecutados.
El único destinatario de canary autorizado es `jreyes@efeoncepro.com`, coordinado por root una sola vez.
Estos son snapshots del preflight; no sustituyen readbacks posteriores a la promoción.

## Resend y remitente

Fuente de sender: `src/lib/email/delivery.ts`, `resolveEmailFromAddress`; antes del fix OTP caía en
`AGENCY_FROM_ADDRESS = Efeonce <greenhouse@efeoncepro.com>`. Nuevo sender local exclusivo del tipo
`auth_server_rooms_invitation_otp`: **Efeonce <acceso@mail.efeoncepro.com>**. Los demás tipos, incluido el
sender global de agencia, conservan su policy. Template y plain text no fijan remitente ni headers alternos.

Readback efectivo mediante **GET /domains/{id}**, con la key montada por el servicio actual:

| Dominio | ID | Región | Estado | Sending | Click | Open | Tracking subdomain |
| --- | --- | --- | --- | --- | --- | --- | --- |
| efeoncepro.com | 5ef7ec7a-252d-41ad-9316-14a3e7226f62 | sa-east-1 | verified | enabled | true | true | null |
| mail.efeoncepro.com | 59ea58b3-cc1e-41e0-920e-85cbd53bd5c7 | us-east-1 | verified | enabled | false | false | null |

La selección del subdominio existente evita cambiar tracking de campañas y otros correos del dominio raíz.
No se crea dominio, DNS, tracking_subdomain ni sender paralelo. El GET es evidencia de configuración; el canary
recibido debe demostrar preservación real de `href=/invite#token=<opaque43>`, sin copiar ese secreto a artifacts.
No afirmar que aceptación del proveedor equivale a entrega ni lectura.

Documentación oficial consultada 2026-10-25:
[tracking por dominio](https://resend.com/docs/dashboard/domains/tracking),
[Send Email](https://resend.com/docs/api-reference/emails/send-email),
[Update Domain](https://resend.com/docs/api-reference/domains/update-domain).
La documentación declara tracking para todos los correos del dominio. La API Send Email y
`node_modules/resend/dist/index.d.mts` (`CreateEmailBaseOptions`, SDK6.9.4) no ofrecen un override por email.
No se implementa un header o atributo HTML no documentado como sustituto del control de dominio.

## Credenciales y servicio — metadata solamente

Baseline observado: Cloud Run `auth-server`, us-east4, revisión `auth-server-00165-kn4`, tráfico100%,
GIT_SHA `ba15711d022cb0450e2e9d185e692d02631fc306`; SA `auth-server@efeonce-group.iam.gserviceaccount.com`.
`RESEND_API_KEY` está montada desde `greenhouse-resend-api-key-staging:latest`; latest resolvió versión1,
ENABLED, escalar limpio y lectura disponible, con secretAccessor directo para la SA. La key no fue impresa ni
persistida; sólo alimentó GET de dominios. El servicio compartido usa esa referencia staging: no deducir aislamiento
ni reemplazarla automáticamente por el default production sin verificar la cuenta/configuración destino.

La revisión no declara first-party/OTP flags, clientId/origin ni montajes OTP/authority. Maestro Auth, OAuth y
person-auth están true. DB compartida `efeonce-group:us-east4:greenhouse-pg-dev`, `greenhouse_app`, role
`greenhouse_app`, contraseña montada desde `greenhouse-pg-dev-app-password:latest`.

## SQL — catálogo y privilegios

Lectura mediante loader/perfil runtime y cliente PostgreSQL canónicos, transacción READ ONLY y timeout8s.
Sin lectura de sesiones, invitaciones, correos o payloads de personas.

- Ninguna de las seis tablas existe: first_party_clients, first_party_login_transactions, first_party_codes,
  first_party_access_handles, email_otp_challenges, email_otp_budgets (schema greenhouse_auth).
- No existen gc_first_party_ephemeral ni gc_invitation_email_otp.
- pgmigrations no tiene TASK-1834/2067. Comparación de nombres locales/aplicados: sólo dos pendientes,
  `20261025212915003_task-1834-first-party-oidc` y `20261025213415654_task-2067-invitation-email-otp`.
- email_type_config contiene auth_server_magic_link enabled=true; OTP aún no tiene fila. Su migración nace OFF.
- Runtime tiene USAGE en greenhouse_auth y no CREATE en ese schema. No default table ACLs auth/global de
  greenhouse_ops/greenhouse_migrator_user observadas. Los permisos concretos de las tablas nuevas se verifican
  después del apply; no se declaran comprobados antes de que existan.

## Finding separado — privilegios del login runtime

**Observado, sin explotación:** `greenhouse_app.rolsuper=false`, `rolcreaterole=true`, `rolcreatedb=true`.
Membresías directas: `cloudsqlsuperuser` y `greenhouse_runtime`, ambas admin_option=false. El grupo
`greenhouse_runtime` tiene CREATEROLE=false y CREATEDB=false. `greenhouse_ops` hereda greenhouse_app,
greenhouse_migrator, greenhouse_migrator_user y postgres; no se observó herencia inversa de app hacia ops.

Esto amplía el poder del login usado por Auth fuera del contrato DML de runtime. No equivale a rol SUPERUSER
PostgreSQL irrestricto ni prueba una explotación. Dueño de remediación: Platform/Cloud/PostgreSQL, bajo
`docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` §§Access Roles, Runtime Role (sin DDL/ad-hoc grants).
El owner canónico de objetos es greenhouse_ops; runtime no debe asumir ese ownership.

Registrar como finding independiente del OTP en el pentest propio; revisar origen, consumidores y dependencias
antes de una remediación gobernada. No quitar memberships ni atributos unilateralmente: Cloud SQL compartido
atiende múltiples runtimes y requerirá evidencia/rollback. Este preflight no ejecutó CREATE ROLE, CREATE DATABASE
ni ningún ensayo mutante para demostrar impacto.

## Ruta canónica de promoción — plan, no ejecución

1. Publicar fix de sender con pruebas y candidato SHA exacto. Revalidar pending migrations y bloqueo de despliegues
   concurrentes antes del apply. Fuente del DB tooling: `scripts/migrate.ts` (perfil ops),
   `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`. Sobre proxy coordinado ya operativo:

   ```sh
   MIGRATE_SKIP_TYPES=true pnpm migrate:up 2 --dry-run
   MIGRATE_SKIP_TYPES=true pnpm migrate:up 2
   ```

   El `2` sólo es válido si el dry-run sigue mostrando exactamente las dos migraciones anteriores. No desactivar
   order/lock, no ejecutar SQL concatenando Up+Down y no regenerar tipos por accidente en checkout compartido.
   Si falta proxy, coordinar primero `pnpm pg:connect` con su dueño: su script puede reemplazar un proxy previo.
   Readback: seis tablas owned by ops, SELECT/INSERT/UPDATE esperados para app, sin DELETE directo de efímeros,
   funciones GC SECURITYDEFINER con search_path fijo y PUBLIC sin EXECUTE; correo OTP OFF.
2. Registrar RP por CLI canónica, `scripts/auth-server/register-first-party-client.ts`, usando el origen real
   acordado con peer y callback exacto verificado en `../efeonce-rooms/src/server/auth/config.ts` (`/auth/callback`):

   ```sh
   pnpm auth-server:register-first-party-client -- \
     --client-id "$ROOMS_CANARY_CLIENT_ID" --product rooms \
     --redirect "$ROOMS_CANARY_ORIGIN/auth/callback" \
     --secret-out "$ROOMS_PRIVATE_SECRET_FILE"
   ```

   Las variables son metadata/ruta acordadas, no valores secretos en argumentos. Archivo nuevo0600, no overwrite,
   no stdout de credential. Transferir sólo por el carril seguro al env `ROOMS_AUTH_CLIENT_SECRET` del consumer.
3. Configurar los secretos HMAC y authority dedicados: payload escalar aleatorio por stdin/archivo0600 a Secret
   Manager, usando referencias aprobadas. `services/_shared/gcloud-secret-iam.sh` y `services/auth-server/deploy.sh`
   gobiernan accessor y montaje; no loggear, serializar como JSON ni poner valores en GitHub vars. OTP requiere
   `AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET_REF`, `ROOMS_INVITATION_AUTHORITY_TOKEN_SECRET_REF`; las env vars
   montadas son `AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET`, `ROOMS_INVITATION_AUTHORITY_TOKEN`.
4. **Blocker detectado y corregido localmente antes del release:** `.github/workflows/auth-server-deploy.yml` no transportaba flags first-party/OTP,
   clientId/origin ni refs OTP/authority al deploy, ni los comparaba en config-drift. `deploy.sh` los soporta con
   defaultOFF. Root completó el wiring y el helper de drift, validados independientemente con 9 tests PASS; agregar
   sólo vars GitHub sin promover este cambio no evita que el siguiente deploy apague el método. Conservar todos los gates/cohorte de autoridad interna; `--set-env-vars` es destructivo.
5. Promover con `production-release.yml`, target_sha explícito y workflow auth-server, según
   `docs/operations/runbooks/auth-server.md`. Break-glass directo sólo con autorización y preservación completa de
   configuración. Verificar traffic/revision/SHA/secrets mounts; no confundir latestReady con tráfico servido.
6. Una vez Auth y Rooms listos y origen/cliente exactos: activar gates coordinados y email_type_config de este tipo
   mediante operación gobernada. Root orquesta un solo envío a jreyes@efeoncepro.com. Validar provider receipt,
   correo recibido y href intacto, nonce/jti/consumo, sesión guest limitada y revocación. Sin reintento de envío
   automático ante resultado desconocido. OTP/proof/link jamás en logs/artifacts.

## Fix local del sender — validación

Cambios limitados a `src/lib/email/delivery.ts`, `src/lib/email/delivery.test.ts` y documentación OTP.
El test de OTP ejercita sendEmail real con DB/Resend simulados: remitente exclusivo, un dispatch, contexto sensible
fuera de argumentos SQL y correlation UUID segura. Regresiones explícitas prueban que magic link de Auth y la
invitación externa mantienen sus remitentes anteriores. Suite OTP+templates+delivery: **116 PASS**, 3 SQL omitidos
por falta de env local en esa corrida; SQL aislado ya posee su runner independiente. ESLint focal PASS. TypeScript completo (`pnpm exec tsc --noEmit --pretty false`) PASS.


## Revisión independiente del workflow — corregido antes del release

Archivos revisados: `.github/workflows/auth-server-deploy.yml`,
`scripts/auth-server/rooms-config-drift.py`, `scripts/auth-server/test_rooms_config_drift.py`.
Los seis parámetros first-party/OTP llegan tanto al comparador como a deploy.sh. Flags ausentes equivalen a OFF;
OTP ON exige first-party ON, clientId/origin y secretos montados. Activación, desactivación, cambio de origin y
versión de secret producen drift aun con el mismo SHA. Los paths del helper/workflow participan en la decisión
de deploy. OTP OFF no exige secretos, coherente con el deploy que omite sus montajes.

Se detectó un falso match local al comparar referencias completas de secretos: el parser descartaba el proyecto,
y una ref de otro proyecto con el mismo nombre/versión coincidía. Root corrigió el parser para exigir
`GCP_PROJECT_ID` (default efeonce-group) y agregó regresión negativa. Revisión posterior: **9 tests PASS** con
`python3 scripts/auth-server/test_rooms_config_drift.py`; diff-check focal PASS. Hallazgo de pre-release corregido,
no vulnerabilidad explotada ni modificación de credenciales/cloud. La comparación de una referencia `latest`
no detecta una versión nueva detrás del alias: para rotaciones deterministas, usar versión numérica y readback.

## Signing keys — readback de metadata, sin rotación

Fecha de lectura: 2026-10-25. Config pública del servicio y deploy coincide en
`projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256`.
Consulta PostgreSQL mediante perfil runtime, transacción READ ONLY; GET KMS versions y JWKS público.

| Versión | kid público | Registro SQL | Activación UTC | Inicio retiring UTC | KMS |
| --- | --- | --- | --- | --- | --- |
| 2 | xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc | active | 2026-09-04 11:49:52.869 | — | ENABLED |
| 1 | VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8 | retiring | 2026-09-04 11:22:33.612 | 2026-09-04 11:49:52.869 | ENABLED |

Ambas son EC_SIGN_P256_SHA256/HSM y aparecen en `https://auth.efeonce.org/.well-known/jwks.json` como ES256,
EC P-256, use=sig. No hay filas retired. La v1 lleva más de 51 días en retiring, superior al warning operativo
>7 días documentado en `docs/manual-de-uso/identity/operar-autorizador-efeonce.md`. La ventana mínima del código
es 1 hora. Plan: revisar consumidores/cachés y ventana vigente, luego ejecutar el retiro canónico y disable KMS
con autorización separada del rollout; no se ejecutó `--retire`, rotate, disable ni operación de firma.

ACL observada: signing_keys owned by greenhouse_ops, app SELECT/INSERT/UPDATE true, DELETE false;
signing_key_events mismo owner, app SELECT/INSERT true, UPDATE/DELETE false. Los grants de signing_keys coinciden
con `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql`, no son un drift nuevo. Como revisión de
mínimo privilegio, un login runtime compartido capaz de modificar el registro de confianza amplía el impacto de
una eventual credencial comprometida; evaluar separar administración de llaves de los readers/signers. No se
probó explotación ni se afirma que la credencial DB permita extraer la llave privada HSM.

IAM directo observado de auth-server SA: en esa llave `roles/cloudkms.signerVerifier`, y en proyecto
`roles/cloudsql.client`; sin bindings directos KMS admin observados en esos scopes. No constituye una auditoría
exhaustiva de herencia IAM de organización/grupos. El finding CREATEROLE/CREATEDB del login SQL sigue separado.
