# Operar la autenticacion de personas de clientes externos (Efeonce ID)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-04 por Claude
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1830)
> **Ruta en portal:** sin UI propia; se opera con las rutas admin `POST /api/admin/identity/external-access/bindings/{bindingId}/invitations` y `POST /api/admin/auth-server/persons/revoke`, más `services/auth-server/deploy.sh` y `pnpm auth-server:person-auth:smoke`. Señales en `/admin/operations`.
> **Documentacion relacionada:** [Operar el autorizador de Efeonce](operar-autorizador-efeonce.md), [Operar el binding de identidad externa](operar-binding-identidad-externa.md), [Autorizador de Efeonce](../../documentation/identity/autorizador-efeonce.md), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md), [Runbook auth-server](../../operations/runbooks/auth-server.md)

## Para que sirve

Este manual te guía para operar el login de las **personas de organizaciones cliente** en
`auth.efeonce.org` (Efeonce ID): prender la superficie, invitar a alguien, recuperarle el acceso cuando pierde
el teléfono, cortarle el acceso de emergencia y leer las señales que dicen si algo se rompió.

Es la pieza que faltaba para que el autorizador sirva de algo: hasta ahora `GET /oauth/authorize` respondía
"Necesitas iniciar sesión" (`login_required`) porque no había forma de que una persona externa se
autenticara. Con esta capa la persona entra con un enlace por correo, registra una passkey y —cuando la
acción lo exige— confirma con un código TOTP.

No cubre el login del portal de Greenhouse (ése no cambia y sigue en Entra), ni el registro de clientes OAuth
ni la rotación de llaves: eso está en el [manual del autorizador](operar-autorizador-efeonce.md). Tampoco
cubre ligar una organización ni otorgarle capabilities: eso está en el
[manual de binding](operar-binding-identidad-externa.md), y **tiene que estar hecho antes** de que sirva
invitar a nadie.

## Antes de empezar

- La superficie está **apagada hoy** en todos los entornos: `AUTH_SERVER_PERSON_AUTH_ENABLED` tiene default
  `false` en `services/auth-server/deploy.sh`.
- Es **un solo servicio** Cloud Run (`auth-server`, `us-east4`) compartido por staging y producción. Lo que
  prendas afecta a ambos.
- Para invitar y revocar necesitas una sesión con rol **`efeonce_admin`**; en staging, `pnpm staging:request`
  ya la resuelve.
- Para el smoke necesitas PostgreSQL por el proxy local: `pnpm pg:connect` (queda en `127.0.0.1:15432`).
- La persona a la que vas a invitar tiene que estar colgada de un **binding activo** de su organización. Si el
  binding no existe, primero el [manual de binding](operar-binding-identidad-externa.md); invitar sin binding
  no sirve de nada.
- Ten un **canal seguro** para entregar el token de invitación. Viaja una sola vez.

### Los cuatro requisitos antes de prender el flag

Ninguno es opcional. Si te saltas alguno, el flujo falla de una forma que **nadie te va a reportar** (ver la
advertencia de abajo).

| # | Requisito | Cómo lo compruebas |
| --- | --- | --- |
| a | `AUTH_SERVER_OAUTH_ENABLED=true` **y** el environment `efeonce-auth` en `active` | `pnpm auth-server:register-issuer-environment --status active`. Si el environment sigue en `draft`, la sesión de la persona se crea bien pero `authorize` termina en `access_denied` con motivo `environment_inactive` |
| b | `RESEND_API_KEY_SECRET_REF` y `EMAIL_FROM` declarados en `services/auth-server/deploy.sh` | Ya están declarados (`greenhouse-resend-api-key-<env>` y `Efeonce <greenhouse@efeoncepro.com>`). Confirma que el secreto exista para el entorno |
| c | La fila `auth_server_magic_link` habilitada en `greenhouse_notifications.email_type_config` | Ya viene sembrada habilitada por migración. Es el kill-switch del correo: si alguien la apaga, el enlace no sale |
| d | La llave KMS `auth-server-totp-envelope` existente | Ya está creada, y el propio `deploy.sh` la verifica en su preflight. Si falta, el deploy falla antes de publicar |

### Por que (b) y (c) importan mas de lo que parecen

La respuesta de pedir un enlace es **idéntica exista o no el correo**. Es anti-enumeración a propósito: nadie
puede usar el formulario para averiguar quién es cliente de Efeonce. El precio de esa propiedad es que **si el
correo no sale, nadie lo reporta**: la persona ve "te enviamos un enlace", se queda esperando, y el acceso
queda muerto en silencio. No hay error en pantalla, no hay alerta, no hay ticket.

Por eso, antes de dar por bueno el flip, **manda un correo de prueba a una casilla que controles y ábrelo**.
Es el único chequeo que distingue "funciona" de "responde 200 y no hace nada".

## Paso a paso

### 1. Prender la superficie

`AUTH_SERVER_PERSON_AUTH_ENABLED` se declara en `services/auth-server/deploy.sh` con default `false`.

- **Durable (lo normal):** cambia el default en `deploy.sh` a `true`, haz commit y deja que el workflow
  `.github/workflows/auth-server-deploy.yml` despliegue.
- **Puntual, para una prueba acotada en staging:**

  ```bash
  AUTH_SERVER_PERSON_AUTH_ENABLED=true ENV=staging bash services/auth-server/deploy.sh
  ```

Después del deploy, actualiza la fila del flag en
[`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) y verifica el envío real de
correo con una casilla de prueba.

**Nunca** lo prendas con `gcloud run services update --update-env-vars`. El `deploy.sh` usa
`--set-env-vars`, que es destructivo: borra toda variable que no esté declarada ahí. Un flag prendido a mano
desaparece en el siguiente deploy **sin aviso**, y lo que quede colgando de él deja de funcionar en silencio.

**Rollback:** vuelve el default a `false` y redespliega. Las sesiones vivas dejan de servir y las personas
vuelven a ver `login_required` en `authorize`.

### 2. Invitar a una persona

La invitación es el único camino de entrada. No hay registro abierto ni auto-servicio.

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/invitations '{
  "email": "persona@acme.example",
  "reason": "Acceso acordado en el kickoff del 2026-09-04."
}'
```

Requiere la capability `identity.external_invitation.issue`.

Qué hacer con la respuesta:

- Trae **`token` una sola vez**. Greenhouse guarda sólo su hash; si lo pierdes, no se recupera, se reemite.
- Entrégalo por el canal seguro que prefieras. No lo pegues en Teams abierto, Notion, un ticket, una captura
  ni un commit.
- La persona lo usa en **`https://auth.efeonce.org/i/<token>`**.

El detalle completo de los campos (`designatedAdmin`, `expiresInHours`, `profileId`) está en el
[manual de binding](operar-binding-identidad-externa.md#5-invitar-al-administrador-designado).

### 3. Recuperar el acceso de alguien

Sirve para el caso real y frecuente: **perdió el teléfono, cambió de dispositivo, se quedó sin la passkey**.

La recuperación es **emitir una re-invitación**, el mismo endpoint del paso 2 con `reissue: true`:

```bash
pnpm staging:request POST /api/admin/identity/external-access/bindings/xob-<uuid>/invitations '{
  "email": "persona@acme.example",
  "reissue": true,
  "reason": "Cambio de teléfono; perdió la passkey y el TOTP."
}'
```

Qué pasa cuando la persona **acepta** esa re-invitación: el sistema desactiva sus subjects anteriores y
revoca, de una vez, su sesión, **todas** sus passkeys y su TOTP. Vuelve a empezar limpia. Eso es lo que hace
que la recuperación sea segura sin necesitar un botón de "resetear mi 2FA".

**No existe self-service de reset, y no debe construirse uno.** Un formulario de "olvidé mi llave" que la
propia persona pueda disparar es exactamente el camino que un atacante usaría para saltarse la passkey y el
TOTP: convierte el segundo factor en decorativo. La recuperación pasa por una persona de Efeonce que emite la
re-invitación y sabe a quién se la está mandando.

### 4. Cortar el acceso de emergencia

Cuando **no** quieres devolver el acceso: alguien salió de la organización, hay sospecha de compromiso, el
cliente pide corte inmediato.

```bash
pnpm staging:request POST /api/admin/auth-server/persons/revoke '{
  "subject": "<sub del token o de la auditoría>",
  "reason": "Salida de la organización confirmada por el cliente, ticket 123."
}'
```

- Requiere la capability `identity.auth_person.revoke` (rol `EFEONCE_ADMIN`).
- `reason` es obligatoria y debe tener **10 caracteres o más**: queda en la auditoría y es lo que va a leer
  quien revise esto en seis meses.
- Es **idempotente**: llamarla dos veces devuelve ceros, no falla. Si dudas si ya la corriste, córrela.
- Revoca sesión, passkeys y TOTP de esa persona.

Diferencia con el paso 3: re-invitar **devuelve** el acceso (limpio); revocar **lo corta** y no lo devuelve.

### 5. Verificar contra PostgreSQL real

Los tests con mocks ejercitan el TypeScript, nunca el SQL. El smoke ejercita lo que sólo se rompe en la base:
el ledger append-only, los triggers, el tope de passkeys, el round-trip de los tipos binarios y **la llave KMS
real**.

```bash
pnpm pg:connect                      # levanta el proxy Cloud SQL
pnpm auth-server:person-auth:smoke
```

Crea sus propias filas con sufijo aleatorio y las limpia al final. Ejercita sesión, magic link, límites de
frecuencia, passkeys y TOTP contra la llave `auth-server-totp-envelope` de verdad.

Córrelo antes de prender el flag y cada vez que toques el dominio.

## Que significan los estados o senales

Las tres señales viven en `/admin/operations` → módulo Identity. **Las tres tienen estado estable 0**: si
ves un número, algo pasó.

| Señal | Severidad | Qué significa y qué hacer |
| --- | --- | --- |
| `auth.person.magic_link_rate_limited` | `warning` | Alguien pidió enlaces por sobre el límite. **No asumas ataque**: un cliente torpe que aprieta "reenviar" cinco veces la dispara igual. Mira de quién viene antes de escalar; si es una persona real atascada, ayúdala en vez de bloquearla |
| `auth.person.passkey_counter_regression` | `error` | El contador de una passkey retrocedió, y eso sólo pasa si existen **dos copias de la misma llave** — es decir, alguien clonó una credencial. La credencial ya quedó revocada sola; lo que falta es lo humano: **habla con la persona**, entiende qué dispositivo usó y re-invítala (paso 3) |
| `auth.person.session_without_link` | `error` | Hay una sesión viva cuya persona ya no está ligada. El resolver la revoca al pasar, así que un pico puntual se limpia solo. **Si no baja, la revocación de acceso NO está llegando** — alguien a quien le quitaste el acceso lo conserva. Es el fallo silencioso más caro de este dominio: trátalo como incidente, no como ruido |

## Que no hacer

- **No** construyas un reset self-service de passkey o TOTP, ni un "olvidé mi llave" que la persona dispare
  sola. La recuperación es la re-invitación del paso 3, emitida por alguien de Efeonce. Un reset abierto
  vuelve decorativo el segundo factor.
- **No** prendas el flag sin haber visto un correo de prueba llegar de verdad. La respuesta es idéntica exista
  o no el correo, así que un envío roto no lo reporta nadie: la persona simplemente nunca entra.
- **No** cambies variables a mano en Cloud Run con `--update-env-vars`. El SoT es
  `services/auth-server/deploy.sh` y su `--set-env-vars` es destructivo: lo que agregues por fuera se pierde
  en el próximo deploy, en silencio.
- **No** borres ni edites filas de `greenhouse_auth.person_auth_attempts`. Es append-only por trigger (el
  `DELETE` falla), y es el registro con el que se investiga cualquier sospecha.
- **No** uses la llave `auth-server-es256` para cifrar. Es la llave de **firma** (EC P-256) del emisor; la de
  cifrado del secreto TOTP es `auth-server-totp-envelope`, y son cosas distintas.
- **No** prendas la superficie con el environment `efeonce-auth` en `draft`: la persona se autentica bien y
  después choca con `access_denied`, que es el diagnóstico más confuso posible.
- **No** entregues el token de invitación por un canal abierto ni lo guardes "por si acaso". Viaja una vez; si
  se perdió, reemite.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| La persona dice "pedí el enlace y nunca llegó" | El correo no está saliendo: falta el secreto de Resend en ese entorno, o la fila `auth_server_magic_link` de `email_type_config` está deshabilitada | Revisa los requisitos (b) y (c); manda un correo de prueba a una casilla tuya. La superficie **no** te va a avisar de esto |
| `/oauth/authorize` responde "Necesitas iniciar sesión" (`login_required`) | `AUTH_SERVER_PERSON_AUTH_ENABLED` está en `false` (estado actual) | Esperado hasta prenderlo (paso 1); no es una falla |
| La persona entra, pero `authorize` termina en `access_denied` | El environment `efeonce-auth` sigue en `draft` (`environment_inactive`), o la persona no tiene membership `bound` | `pnpm auth-server:register-issuer-environment --status active`; si el environment ya está activo, revisa el binding ([manual de binding](operar-binding-identidad-externa.md)) |
| El flag estaba prendido y "se apagó solo" | Se prendió con `--update-env-vars` y el siguiente deploy lo borró | Cambia el default en `deploy.sh` y redespliega; actualiza el ledger de flags |
| La persona pide enlaces y le responden que espere | Límite de frecuencia: hay cooldown por persona y un tope por IP por hora, con bloqueo progresivo si insiste | Que espere la ventana. Si es alguien legítimo atascado, re-invítalo (paso 3) en vez de pelear con el límite |
| `auth.person.passkey_counter_regression` en `error` | Hay dos copias de una misma passkey | La credencial ya está revocada; contacta a la persona y re-invítala. Trátalo como incidente de seguridad, no como ruido |
| `auth.person.session_without_link` no baja | La revocación de acceso no está llegando a las sesiones vivas | Incidente: alguien a quien le quitaste el acceso lo conserva. Revisa el resolver y el estado del binding |
| El smoke falla al conectar | Falta el proxy o el `.env.local` | `pnpm pg:connect` primero; el smoke usa el perfil `ops` |
| El deploy falla en el preflight de KMS | Falta la llave `auth-server-totp-envelope` o los permisos sobre ella | Revisa la llave en `us-east4/auth-server` y el IAM del service account del servicio |

## Referencias tecnicas

- Manual del emisor (llaves, OAuth, clientes, consentimientos): [`operar-autorizador-efeonce.md`](operar-autorizador-efeonce.md)
- Manual de binding (organizaciones, grants, invitaciones): [`operar-binding-identidad-externa.md`](operar-binding-identidad-externa.md)
- Runbook operativo: [`docs/operations/runbooks/auth-server.md`](../../operations/runbooks/auth-server.md)
- Contrato OAuth: [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md)
- ADR nativo: [`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
- Invariantes para agentes: [`IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`](../../architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md)
- Código: `src/lib/auth-server/persons/**` (`magic-link.ts`, `passkeys.ts`, `totp.ts`, `totp-cipher.ts`,
  `sessions.ts`, `recovery.ts`, `routes.ts`, `config.ts`, `store/postgres-store.ts`) ·
  `services/auth-server/deploy.sh` · `scripts/auth-server/person-auth-smoke.ts` ·
  `src/app/api/admin/auth-server/persons/revoke/route.ts` ·
  `src/app/api/admin/identity/external-access/bindings/[bindingId]/invitations/route.ts` ·
  `src/lib/reliability/queries/auth-server-signals.ts`
- Migraciones: `migrations/20260904184837565_task-1830-auth-person-session-magic-link.sql` ·
  `migrations/20260904192936981_task-1830-auth-server-magic-link-email-type.sql` ·
  `migrations/20260904202029472_task-1830-auth-passkey-credentials.sql` ·
  `migrations/20260904205119719_task-1830-auth-totp-step-up.sql` ·
  `migrations/20260904213806938_task-1830-auth-person-revoke-capability.sql`
- Flags: [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (`AUTH_SERVER_PERSON_AUTH_ENABLED`)
- Task: `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md`
