# Operar la autenticacion de personas de clientes externos (Efeonce ID)

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-04 por Claude
> **Ultima actualizacion:** 2026-09-05 por Claude
> **Modulo:** Identidad y acceso (EPIC-044 · TASK-1830)
> **Ruta en portal:** sin UI propia; se opera con las rutas admin `POST /api/admin/identity/external-access/bindings/{bindingId}/invitations` y `POST /api/admin/auth-server/persons/revoke`, más `services/auth-server/deploy.sh`, `pnpm auth-server:person-auth:canary` (contra el servidor real) y `pnpm auth-server:person-auth:smoke` (contra la base). Señales en `/admin/operations`.
> **Documentacion relacionada:** [Operar el autorizador de Efeonce](operar-autorizador-efeonce.md), [Operar el binding de identidad externa](operar-binding-identidad-externa.md), [Autorizador de Efeonce](../../documentation/identity/autorizador-efeonce.md), [EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md](../../architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md), [Runbook auth-server](../../operations/runbooks/auth-server.md)

## Para que sirve

Este manual te guía para operar el login de las **personas de organizaciones cliente** en
`auth.efeonce.org` (Efeonce ID): invitar a alguien, verificar que el carril funciona de verdad, recuperarle el
acceso cuando pierde el teléfono, cortarle el acceso de emergencia y leer las señales que dicen si algo se
rompió.

Era la pieza que faltaba para que el autorizador sirviera de algo: `GET /oauth/authorize` respondía
"Necesitas iniciar sesión" (`login_required`) porque no había forma de que una persona externa se
autenticara. Con esta capa la persona entra con un enlace por correo, registra una passkey y —cuando la
acción lo exige— confirma con un código TOTP.

**Desde el 2026-09-05 la superficie está prendida.** Eso cambia el trabajo: ya no se trata de prenderla, sino
de terminar de dejarla usable. Lee entero "Antes de empezar" antes de invitar a una persona real.

No cubre el login del portal de Greenhouse (ése no cambia y sigue en Entra), ni el registro de clientes OAuth
ni la rotación de llaves: eso está en el [manual del autorizador](operar-autorizador-efeonce.md). Tampoco
cubre ligar una organización ni otorgarle capabilities: eso está en el
[manual de binding](operar-binding-identidad-externa.md), y **tiene que estar hecho antes** de que sirva
invitar a nadie.

## Antes de empezar

- La superficie está **prendida** desde el 2026-09-05. `AUTH_SERVER_OAUTH_ENABLED` y
  `AUTH_SERVER_PERSON_AUTH_ENABLED` tienen default `true` en `services/auth-server/deploy.sh` y están
  desplegados: revisión `auth-server-00007-cxb`, `/readyz` responde `200` con `oauth: true`, y `/login`
  responde `200`.
- 🔴 **El correo está roto y todavía no se arregló en el runtime.** El envío del enlace de acceso fallaba en
  producción con `RESEND_API_KEY is not configured`. El arreglo ya está en `services/auth-server/deploy.sh`,
  pero **necesita un redespliegue del auth-server para surtir efecto**. Hasta entonces, quien pida un enlace
  ve "te enviamos un correo" y el correo **no llega**. **No invites a nadie real antes de redesplegar y ver
  llegar un correo de prueba.**
- **Todavía no se pueden emitir tokens.** `authorize` exige que la persona pertenezca a una organización con
  binding activo, y hoy **no hay ninguna organización elegible declarada**. Se puede entrar (sesión, passkey,
  TOTP), no se puede autorizar una aplicación. Declarar qué organización entra es **decisión tuya**, no un
  pendiente técnico.
- Es **un solo servicio** Cloud Run (`auth-server`, `us-east4`) compartido por staging y producción. Lo que
  cambies afecta a ambos.
- Para invitar y revocar necesitas una sesión con rol **`efeonce_admin`**; en staging, `pnpm staging:request`
  ya la resuelve.
- Para el smoke y el canary necesitas PostgreSQL por el proxy local: `pnpm pg:connect` (queda en
  `127.0.0.1:15432`).
- La persona a la que vas a invitar tiene que estar colgada de un **binding activo** de su organización. Si el
  binding no existe, primero el [manual de binding](operar-binding-identidad-externa.md); invitar sin binding
  no sirve de nada.
- Ten un **canal seguro** para entregar el token de invitación. Viaja una sola vez.

### Los cuatro requisitos para que el carril sirva de verdad

Ninguno es opcional. Si falta alguno, el flujo falla de una forma que **nadie te va a reportar** (ver la
advertencia de abajo).

| # | Requisito | Cómo lo compruebas |
| --- | --- | --- |
| a | `AUTH_SERVER_OAUTH_ENABLED=true` **y** el environment `efeonce-auth` en `active` | El flag ya está en `true` y desplegado (`/readyz` con `oauth: true`). Para el environment: `pnpm auth-server:register-issuer-environment --status active`. Si sigue en `draft`, la sesión de la persona se crea bien pero `authorize` termina en `access_denied` con motivo `environment_inactive` |
| b | El secreto de Resend **montado**, no sólo referenciado, más `EMAIL_FROM` | 🔴 **Éste es el que estaba roto.** Declarar `RESEND_API_KEY_SECRET_REF` **no basta** (ver la advertencia de abajo). El arreglo ya está en `deploy.sh`, pero **pendiente de redespliegue** |
| c | La fila `auth_server_magic_link` habilitada en `greenhouse_notifications.email_type_config` | Viene sembrada habilitada por migración. Es el kill-switch del correo: si alguien la apaga, el enlace no sale |
| d | La llave KMS `auth-server-totp-envelope` existente | Ya está creada, y el propio `deploy.sh` la verifica en su preflight. Si falta, el deploy falla antes de publicar |

### Por que (b) y (c) importan mas de lo que parecen

La respuesta de pedir un enlace es **idéntica exista o no el correo** (misma pantalla, mismo texto, y con un
piso de latencia para que ni el tiempo de respuesta delate nada). Es anti-enumeración a propósito: nadie puede
usar el formulario para averiguar quién es cliente de Efeonce. El precio de esa propiedad es que **si el
correo no sale, nadie lo reporta**: la persona ve "te enviamos un enlace", se queda esperando, y el acceso
queda muerto en silencio. No hay error en pantalla, no hay alerta, no hay ticket.

Eso no es hipotético: **es exactamente lo que pasó**. El envío estuvo muerto en producción con
`RESEND_API_KEY is not configured` y sólo apareció cuando el canary (paso 5) lo ejercitó de punta a punta.
Sigue así hasta que se redespliegue el servicio.

⚠️ **Declarar `RESEND_API_KEY_SECRET_REF` NO basta.** El secreto tiene que ir **montado** en
`services/auth-server/deploy.sh`, en el bloque de secretos, como `RESEND_API_KEY`: el envío de correo usa un
cliente que lee **el secreto ya resuelto**, no la referencia. Con la referencia declarada y el secreto sin
montar, el despliegue queda verde, el endpoint responde `200`, y el correo muere. Ésa fue la causa exacta.

Dónde se ve la verdad, cuando la pantalla no te la va a dar: la fila correspondiente de
`greenhouse_notifications.email_deliveries`, en sus columnas `status` y `error_message`.

Por eso, antes de dar por bueno el carril, **manda un correo de prueba a una casilla que controles y ábrelo**.
Es el único chequeo que distingue "funciona" de "responde 200 y no hace nada".

## Paso a paso

### 1. El estado del despliegue (y lo que falta)

`AUTH_SERVER_OAUTH_ENABLED` y `AUTH_SERVER_PERSON_AUTH_ENABLED` se declaran en
`services/auth-server/deploy.sh` y hoy **ambos tienen default `true` y están desplegados**. No hay nada que
prender.

Lo que sí falta: **redesplegar para que el secreto de Resend quede montado.** Hasta ese redespliegue el correo
no sale y el carril no sirve para invitar a nadie real.

- **Durable (lo normal):** deja que el workflow `.github/workflows/auth-server-deploy.yml` despliegue.
- **Puntual, acotado:**

  ```bash
  ENV=staging bash services/auth-server/deploy.sh
  ```

Después del deploy: confirma la revisión activa, `/readyz` en `200` con `oauth: true`, actualiza la fila de
los flags en [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) y **verifica el
envío real de correo con una casilla de prueba** (paso 5).

**Nunca** cambies estos flags con `gcloud run services update --update-env-vars`. El `deploy.sh` usa
`--set-env-vars`, que es destructivo: borra toda variable que no esté declarada ahí. Un flag prendido a mano
desaparece en el siguiente deploy **sin aviso**, y lo que quede colgando de él deja de funcionar en silencio.

**Rollback:** vuelve el default a `false` en `deploy.sh` y redespliega. Las sesiones vivas dejan de servir y
las personas vuelven a ver `login_required` en `authorize`.

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

### 5. Verificar el carril: canary y smoke

Son **dos herramientas distintas y las dos hacen falta**. No se reemplazan: un almacenamiento correcto detrás
de una ruta mal cableada pasa el smoke y falla en el canary.

| Comando | Contra qué corre | Qué prueba |
| --- | --- | --- |
| `pnpm auth-server:person-auth:canary` | El **servidor real**, de punta a punta | Que el carril con persona autenticada funciona: HTTP, correo, sesión, passkey, TOTP, revocación |
| `pnpm auth-server:person-auth:smoke` | La **base de datos**, por el proxy local | Que el SQL se comporta: ledger append-only, triggers, tope de passkeys, tipos binarios, llave KMS real |

#### El canary (contra el servidor real)

```bash
pnpm pg:connect                                            # levanta el proxy Cloud SQL
pnpm auth-server:person-auth:canary                        # fixture propio, se limpia solo
pnpm auth-server:person-auth:canary -- --email tu@correo   # además manda un correo REAL a esa casilla
pnpm auth-server:person-auth:canary -- --subject <sub>     # contra una persona ya ligada, sin crear una ficticia
pnpm auth-server:person-auth:canary -- --host https://...  # otro host (default: el issuer)
```

Los códigos de salida **no son binarios**, y ésa es la parte que importa:

| Código | Significa | Qué haces |
| --- | --- | --- |
| `0` | **Verde.** Todo lo que se pudo probar, se probó y pasó | Sigue |
| `1` | **Rojo.** Algo falló | Es una falla real, no ruido: léela antes de volver a correrlo |
| `2` | **Incompleto.** Algo no se pudo probar | **Un canary incompleto NO es verde.** Lee qué quedó sin probar y decide si eso te bloquea. Tratarlo como verde es cómo se pasa por alto justo la parte rota |

Usa `--email` para el chequeo que decide si el correo está vivo. **Hoy, hasta el redespliegue, ésa es
justamente la comprobación que va a fallar** — es la que descubrió el problema.

Qué quedó verificado en vivo por primera vez con esta herramienta (corrida del 2026-09-05: **22
comprobaciones correctas, ninguna fallida**): el **consumo del enlace** y que **sirve una sola vez**; la
**sesión**; el **registro y el login por passkey** —incluido que abre ya con segundo factor cuando el
dispositivo verifica a la persona—; el **enrolamiento del TOTP**; que **un mismo código no se acepta dos
veces**; y que **la sesión muere cuando el operador revoca el acceso**.

Lo que el canary **no** hace, a propósito: no emite tokens ni crea bindings de organización. Fabricar una
organización elegible para que pase una comprobación sería falsificar justamente el dato que ese control
existe para proteger.

#### El smoke (contra la base)

```bash
pnpm pg:connect                      # levanta el proxy Cloud SQL
pnpm auth-server:person-auth:smoke
```

Los tests con mocks ejercitan el TypeScript, nunca el SQL. El smoke ejercita lo que sólo se rompe en la base:
el ledger append-only, los triggers, el tope de passkeys, el round-trip de los tipos binarios y **la llave KMS
`auth-server-totp-envelope` real**. Crea sus propias filas con sufijo aleatorio y las limpia al final.

Corre los dos cada vez que toques el dominio, y antes de invitar a una persona real.

## Que significan los estados o senales

Las tres señales viven en `/admin/operations` → módulo Identity. **Las tres tienen estado estable 0**: si
ves un número, algo pasó.

El 2026-09-05 se leyeron **por primera vez** y las tres responden. Con `auth.person.session_without_link` se
fue un paso más allá: el canary comprueba que **se enciende** al revocar un acceso, no sólo que está tranquila
cuando no pasa nada. Una alarma que nunca sonó no está probada; sólo está callada.

| Señal | Severidad | Qué significa y qué hacer |
| --- | --- | --- |
| `auth.person.magic_link_rate_limited` | `warning` | Alguien pidió enlaces por sobre el límite. **No asumas ataque**: un cliente torpe que aprieta "reenviar" cinco veces la dispara igual. Mira de quién viene antes de escalar; si es una persona real atascada, ayúdala en vez de bloquearla |
| `auth.person.passkey_counter_regression` | `error` | El contador de una passkey retrocedió, y eso sólo pasa si existen **dos copias de la misma llave** — es decir, alguien clonó una credencial. La credencial ya quedó revocada sola; lo que falta es lo humano: **habla con la persona**, entiende qué dispositivo usó y re-invítala (paso 3) |
| `auth.person.session_without_link` | `error` | Hay una sesión viva cuya persona ya no está ligada. El resolver la revoca al pasar, así que un pico puntual se limpia solo. **Si no baja, la revocación de acceso NO está llegando** — alguien a quien le quitaste el acceso lo conserva. Es el fallo silencioso más caro de este dominio: trátalo como incidente, no como ruido |

## Que no hacer

- **No** construyas un reset self-service de passkey o TOTP, ni un "olvidé mi llave" que la persona dispare
  sola. La recuperación es la re-invitación del paso 3, emitida por alguien de Efeonce. Un reset abierto
  vuelve decorativo el segundo factor.
- **No** invites a una persona real sin haber visto un correo de prueba llegar de verdad. La respuesta es
  idéntica exista o no el correo, así que un envío roto no lo reporta nadie: la persona simplemente nunca
  entra. Hoy el correo **está roto** hasta que se redespliegue.
- **No** des el correo por configurado sólo porque `RESEND_API_KEY_SECRET_REF` está declarado. **Declarar la
  referencia no basta:** el secreto tiene que ir **montado** en `services/auth-server/deploy.sh` como
  `RESEND_API_KEY`, porque el envío usa un cliente que lee **el secreto ya resuelto**, no la referencia. Con
  la referencia puesta y el secreto sin montar, el deploy queda verde y el correo muere en silencio.
- **No** trates un canary con salida `2` como si fuera verde. `2` es **incompleto**: hubo algo que no se pudo
  probar. Un incompleto leído como aprobado es exactamente cómo se deja pasar la parte rota.
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
- **No** asumas que pedir un reto de passkey está protegido. Hoy `/auth/passkeys/authenticate/start` **no
  tiene límite de intentos y se puede llamar sin sesión**. Es un hueco conocido y declarado, no una sorpresa:
  el reto por sí solo no abre nada sin la llave del dispositivo, pero sí permite golpear ese punto sin costo.
  Si ves tráfico raro ahí, reconócelo como esto antes de tratarlo como compromiso.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| La persona dice "pedí el enlace y nunca llegó" | **Hoy la causa más probable es el secreto de Resend sin montar**, pendiente de redespliegue (`RESEND_API_KEY is not configured`). Otras: la fila `auth_server_magic_link` de `email_type_config` deshabilitada | Mira `greenhouse_notifications.email_deliveries` (`status`, `error_message`): ahí está la verdad. Revisa los requisitos (b) y (c), redespliega y manda un correo de prueba a una casilla tuya. La pantalla **no** te va a avisar de esto |
| El canary sale con código `2` | Hubo comprobaciones que **no se pudieron correr**, no que fallaran | No lo cuentes como verde. Lee cuáles quedaron sin probar y decide si te bloquean |
| `/oauth/authorize` responde "Necesitas iniciar sesión" (`login_required`) | Ya no es el flag: ambos están en `true` y desplegados. Significa que esa persona **no tiene sesión** | Que se identifique primero (enlace por correo o passkey). Si el enlace no le llega, es la fila de arriba |
| La persona entra, pero `authorize` termina en `access_denied` | **Hoy es lo esperado:** no hay ninguna organización elegible declarada, así que nadie tiene membership `bound`. También ocurre si el environment `efeonce-auth` sigue en `draft` (`environment_inactive`) | Es una decisión pendiente, no una falla. Declara la organización elegible ([manual de binding](operar-binding-identidad-externa.md)); si además el environment está en `draft`, `pnpm auth-server:register-issuer-environment --status active` |
| Un flag o un secreto estaba puesto y "se fue solo" | Se aplicó con `--update-env-vars` y el siguiente deploy lo borró: `deploy.sh` usa `--set-env-vars`, que es destructivo | Decláralo en `deploy.sh` y redespliega; actualiza el ledger de flags |
| La persona pide enlaces y le responden que espere | Límite de frecuencia: hay cooldown por persona y un tope por IP por hora, con bloqueo progresivo si insiste | Que espere la ventana. Si es alguien legítimo atascado, re-invítalo (paso 3) en vez de pelear con el límite |
| `auth.person.passkey_counter_regression` en `error` | Hay dos copias de una misma passkey | La credencial ya está revocada; contacta a la persona y re-invítala. Trátalo como incidente de seguridad, no como ruido |
| `auth.person.session_without_link` no baja | La revocación de acceso no está llegando a las sesiones vivas | Incidente: alguien a quien le quitaste el acceso lo conserva. Revisa el resolver y el estado del binding |
| El smoke o el canary fallan al conectar | Falta el proxy o el `.env.local` | `pnpm pg:connect` primero; ambos usan el perfil `ops` |
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
  `src/lib/reliability/queries/auth-server-signals.ts` · `scripts/auth-server/person-auth-canary.ts`
- Migraciones: `migrations/20260904184837565_task-1830-auth-person-session-magic-link.sql` ·
  `migrations/20260904192936981_task-1830-auth-server-magic-link-email-type.sql` ·
  `migrations/20260904202029472_task-1830-auth-passkey-credentials.sql` ·
  `migrations/20260904205119719_task-1830-auth-totp-step-up.sql` ·
  `migrations/20260904213806938_task-1830-auth-person-revoke-capability.sql`
- Flags: [`FEATURE_FLAG_STATE_LEDGER.md`](../../operations/FEATURE_FLAG_STATE_LEDGER.md) (`AUTH_SERVER_OAUTH_ENABLED`, `AUTH_SERVER_PERSON_AUTH_ENABLED`)
- Documentación funcional: [`autenticacion-clientes-externos.md`](../../documentation/identity/autenticacion-clientes-externos.md)
- Task: `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md`
