# TASK-1830 — Efeonce Auth External Person Authentication (passkeys, magic link, TOTP, recovery)

## Delta 2026-09-06 — el carril de tokens ya NO está bloqueado por el mecanismo de ENTREGA (TASK-1837)

`TASK-1837` (commits `5518d868e…189148c6e`, code complete, rollout pendiente) hace que el sistema envíe la invitación
externa por correo con el enlace `https://<issuer_url del environment>/i/<token>` (la landing
`PERSON_AUTH_PATHS.invitationLanding` de esta task), con estado de entrega persistido, reenvío que rota el
enlace, rebote drenado en el ops-worker y una excepción gobernada de revelación. Ya no hace falta que un
operador copie un token a mano para que una persona real llegue a `/i/<token>` → aceptar → `linked` → magic
link → sesión. El carril de tokens queda bloqueado **solo** por (a) la decisión del operador de qué
organización/persona recibe la primera invitación real (hoy en `TASK-1836`) y (b) el rollout de `TASK-1837`:
migración `20260906004450748_task-1837-…` en la instancia compartida + `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`
en Vercel (el auth-server no lee ese flag; sólo sirve `/i/<token>`). Verificar además el dominio remitente
Efeonce en Resend: el correo de invitación sale del runtime Vercel, distinto del magic link del auth-server.

## Delta 2026-09-05 — canary autenticado y correo MUERTO en vivo

`pnpm auth-server:person-auth:canary` (nuevo, commit `38fbfaeeb`) ejercita contra el host REAL el
carril que los canaries de la activación no tocaron: todos ellos fueron negativos o anónimos.

**Primera corrida: 🔴 el correo del magic link estaba fallando en producción** con
`RESEND_API_KEY is not configured`. Causa raíz mía: declaré `RESEND_API_KEY_SECRET_REF` como env var
pero nunca monté `RESEND_API_KEY` como secreto. `sendEmail` usa el cliente SÍNCRONO de Resend, que
lee un secreto ya resuelto; el carril `*_SECRET_REF` sólo sirve donde algo lo resuelve async primero.
El ops-worker lo monta con `--update-secrets`; copié la mitad del patrón. Corregido en `deploy.sh`,
**pendiente de redeploy del auth-server**.

Es exactamente el modo de falla documentado y no visto: la respuesta es 202 idéntica por
anti-enumeración, así que un correo muerto no se reporta solo. Sin el canary, esto se descubría
cuando una persona real dijera «no me llega el enlace».

**Verificado en vivo por primera vez** (22 ok, 0 fallidos): consumo del magic link y su uso único,
sesión y su contexto sin filtrar el `sub`, registro y login por passkey con `uv` abriendo en
`step_up`, enrolamiento TOTP con secreto cifrado por KMS, anti-replay del código, y la muerte de la
sesión al revocar el source link. Además, tras revocar, se comprueba que la señal
`auth.person.session_without_link` **se enciende**: un detector que nunca se ejercita es una
afirmación. Las tres señales `auth.person.*` se leyeron por primera vez y responden.

**Sigue pendiente:** redeploy para el correo, y el carril de tokens (emisión, refresh/revocación,
CIMD positivo) que exige una organización elegible — decisión del operador, hoy en `TASK-1836`.

## Delta 2026-09-04 (ejecución, sesión greenhouse-eo-18)

**Estado: `runtime activado, verificación autenticada pendiente`.** Último readback y límites en `Status real` y auditoría de rollout; el bloque siguiente conserva el estado del cierre de implementación previo a la activación. Los 4 slices están en `develop` (`7459d96d4`,
`937087404`, `db2622ba9`, `5b57b73f9`) detrás de `AUTH_SERVER_PERSON_AUTH_ENABLED=false`.

**Tres desviaciones de la spec, decididas con `arch-architect` + `efeonce-mcp-platform` y
autorizadas por el operador:**

1. **El ledger de intentos NO va a `greenhouse_serving.auth_attempts`** sino a
   `greenhouse_auth.person_auth_attempts`. Ese ledger es del portal y no admite este runtime sin
   romperlo: `provider` y `stage` tienen CHECK cerrados de NextAuth (sin passkey ni TOTP),
   `user_id_resolved` pertenece al espacio de `client_users` y su GRANT de INSERT es sólo para
   `greenhouse_runtime`, mientras el emisor conecta como `greenhouse_app`. Además el `subject_hash`
   de `oauth_audit_events` —la otra alternativa— no está indexado, así que un bloqueo progresivo por
   sujeto allí sería un scan. El ADR aísla el RUNTIME del emisor aunque la identidad converja.
2. **Los bearers se hashean con `sha256` + comparación en tiempo constante, no con bcrypt.** Sobre
   256 bits de entropía un KDF lento no agrega resistencia y sí agrega 300-800 ms de CPU de un solo
   hilo en un endpoint NO autenticado — un amplificador de DoS en la puerta de entrada. Además
   unifica el esquema con codes/refresh/access del mismo dominio. Consecuencia de diseño: los
   códigos de respaldo se hacen LARGOS (~127 bits) para no necesitar KDF. El shim de `bcryptjs` del
   Dockerfile se queda, así que el Dockerfile no se tocó.
3. **`passkey_challenges` y `totp_backup_codes` no estaban en la lista de 5 tablas de la spec** y
   hacen falta: el reto de autenticación ocurre ANTES de que exista sesión (no puede colgarse de
   ella) y el consumo único de un código de respaldo necesita su propia fila.

**Infraestructura creada (2026-09-04):** llave KMS **simétrica** `auth-server-totp-envelope`
(`us-east4/auth-server`, HSM, `ENCRYPT_DECRYPT`, rotación 90 d) + `cryptoKeyEncrypterDecrypter`
para `auth-server@`. La existente `auth-server-es256` es EC de firma y no puede cifrar. Round-trip
y rechazo por AAD verificados contra la llave real, y el smoke los vuelve a verificar en cada corrida.

**Cuatro defectos encontrados por el trabajo, no por revisión:**

- `verifyAuthenticationResponse` LANZA cuando el contador de un passkey retrocede, así que la
  regresión llegaba como un "no verificó" cualquiera: **la credencial clonada se quedaba viva** y la
  señal nunca se habría disparado. Se le pasa `counter: 0` (omite sólo ese chequeo) y la política se
  aplica sobre datos ya verificados.
- `deactivateOrphanSourceLinks` (TASK-1631) no se llama al aceptar y su condición es por PERFIL, así
  que tras una re-invitación **el subject anterior seguía autenticando** y la recuperación no
  recuperaba nada.
- `epochTolerance` de `otplib` es opción de `verify`, no del constructor, y `epoch` va en SEGUNDOS.
- `otplib` lanza con un token que no son 6 dígitos, y ahí llega cualquier cosa: un endpoint público
  de autenticación respondía 500 en vez de rechazar.

**Rollout pendiente (lo que falta para decir "listo"):** prender el flag en staging —exige
`AUTH_SERVER_OAUTH_ENABLED=true` y el environment `efeonce-auth` en `active`, si no la sesión se
crea pero `authorize` responde `environment_inactive`—, verificar que el correo sale de verdad por
Resend (la respuesta es idéntica por anti-enumeración, así que un correo muerto NO se reporta solo)
y ejercitar passkey en dos navegadores.

**No implementado a propósito:** el evento outbox `auth.person.session_revoked` que la spec
mencionaba. No tiene consumidor: el gateway re-chequea `gv` cada 60 s y la sesión muere en el emisor
de inmediato. Publicar un evento que nadie lee es superficie sin dueño; se agrega cuando exista el
consumidor.

## Delta 2026-09-04 (TASK-1835)

- La task `ui-ux` de login/consentimiento ya existe: `TASK-1835` (`docs/tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md`), con wireframe, flow y motion.
- El flujo maestro `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (listado en `Files owned` de esta task) fue CREADO al autorar TASK-1835 con el inventario de superficies S0–S10 y los recorridos A–G: esta task lo **extiende** con el detalle de cada método (magic link, passkey, TOTP, rutas `/auth/*` y `/login*`), no lo recrea.
- TASK-1835 consume de aquí: rutas HTML `/login*`/`/session`, DTOs de login/step-up/sesión, errores canónicos y el copy de métodos en `src/lib/copy/auth-server.ts`; TASK-1835 aporta el shell «Efeonce ID» y las plantillas.

## Delta 2026-09-04 (TASK-1829)

- `TASK-1829` quedó `code complete, rollout pendiente` en `develop` (commits `263ee3a74`, `19d1658de`,
  `d31e6e913`): la superficie OAuth del emisor (metadata RFC 8414/OIDC, CIMD, DCR, `authorize` con PKCE S256,
  `token` ES256 15 min + refresh rotativo, `revoke`, `introspect`, consentimiento persistido) existe detrás de
  `AUTH_SERVER_OAUTH_ENABLED=false`; contrato en
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` — cerrado por trabajo en `TASK-1829`.
- **Contrato que esta task debe implementar:** `SubjectSessionPort` en `src/lib/auth-server/oauth/subject.ts`
  (`resolve(request) → { subject, environmentId, authLevel: 'primary' | 'step_up', authTime } | null`). Hoy el
  runtime inyecta `unauthenticatedSubjectPort`, así que `authorize` responde `login_required` (página 401;
  `prompt=none` ⇒ redirect con `error=login_required`) y **no se emite ningún code** hasta que esta task provea la
  sesión (`greenhouse_auth.sessions`, cookie `__Host-efeonce_auth`). Los scopes de escritura exigen
  `authLevel = 'step_up'` (TOTP, Slice 3); sin él, `interaction_required`.
- **Write-target allowlist:** `src/lib/auth-server/boundary-domain.test.ts` ya existe (creado por
  `TASK-1829`); esta task agrega sus cinco tablas ahí, no crea otro guard.
- La pantalla de consentimiento actual es una página mínima server-side (isotipo del SSOT, copy en
  `src/lib/copy/auth-server.ts`, form `POST /oauth/consent` con `client_id`/`scope`/`return_to`/`decision`);
  la task `ui-ux` la reemplaza sin cambiar el contrato, y el login de esta task convive con ese mismo patrón.
- `Blocked by` no cambia (`TASK-1631`); `TASK-1829` nunca fue bloqueante de esta task, es consumidora de su sesión.

## Delta 2026-09-04

- `TASK-1828` entregó el runtime y el schema sobre los que viven las primitives de esta task: Cloud Run
  `auth-server` (us-east4, revisión `auth-server-00003-jtf`, `AUTH_SERVER_ENABLED=true`),
  `https://auth.efeonce.org/readyz` 200, `services/auth-server/server.ts` como host de las rutas JSON y schema
  `greenhouse_auth` aplicado (`signing_keys`, `signing_key_events`) por
  `migrations/20260904111156246_task-1828-greenhouse-auth-schema.sql` — cerrado por trabajo en `TASK-1828`.
- **Corrección de supuesto:** la llave KMS que existe (`us-east4/auth-server/auth-server-es256`, HSM) es una
  llave de **firma** EC (ES256) con SA `auth-server@` como `signerVerifier`; **no sirve para envelope**. El
  cifrado en reposo de los secretos TOTP (Slice 3) necesita una llave KMS **simétrica propia** (encrypt/decrypt)
  con su IAM, que esta task debe declarar y provisionar; se registra como gap nuevo.
- `TASK-1631` Slice 1 quedó code complete y verificado en staging el 2026-09-04 (invitaciones, source links,
  `acceptExternalInvitation` in-process); sigue en `Blocked by` hasta que su release a producción acompañe al
  del runtime, pero el contrato ya existe para diseñar contra él.
- `Blocked by` pierde `TASK-1828`; queda sólo `TASK-1631`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-044`
- Status real: `verificación autenticada VERDE en el emisor, carril de tokens pendiente (2026-09-05T18:59Z). pnpm auth-server:person-auth:canary contra https://auth.efeonce.org (runtime gitSha 1c75e89f1): 28 ok, 0 fallidos, 1 aviso, 0 omitidos, exit 0. Cerrados contra runtime real: despacho de correo (email_deliveries status=sent — era el único pendiente sin evidencia observable, y el 202 del magic link es indistinguible por diseño, así que nadie más lo reportaría), magic link (GET no consume, un solo uso), sesión (__Host-, amr, no filtra el sub), passkey (registro, login uv → step_up, sin Origin 403 y origen ajeno 403, reto sin oráculo), TOTP (enrolamiento cifrado por KMS, step-up, anti-replay) y revocación (401 + fila revocada). El detector auth.person.session_without_link se vio ENCENDERSE (ok → error) al revocar el link, no sólo en ok. Aviso: auth.person.magic_link_rate_limited en warning (12 bloqueos/24 h) = actividad del propio canary, esperado. Pendiente: passkeys en dos navegadores reales; y el carril de tokens/refresh/revocación de token, bloqueado porque no existe membership externa (3 invitaciones, las 3 revoked) y falta decidir qué organización cliente es elegible. Deploy por staging sobre servicio compartido; no hay nuevo release main. Evidencia: docs/audits/2026-09-04-epic-044-auth-rollout.md`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `none`

**Dependencia verificada 2026-09-05 UTC:** TASK-1631 ya viajó en el release 9100bbd2765d; environment efeonce-auth presente en draft y tablas del emisor disponibles. La activación y el despliegue de personas son trabajo de este rollout.
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la autenticación de personas externas del auth server **sin contraseñas**: passkeys (WebAuthn)
como método primario, magic link por Resend como alternativa, TOTP como step-up para clases de autoridad de
escritura, recuperación por re-invitación auditada del operador, sesión propia con cookie `__Host-`, y
anti-abuso (rate limiting por sujeto e IP, anti-enumeración, bloqueo progresivo). Entrega primitives, rutas
JSON y el contrato de flujo que consume la task `ui-ux` de login; no entrega pantallas.

## Why This Task Exists

El broker existente delega la autenticación de la persona en la sesión NextAuth del portal. Para clientes
externos esa sesión no existe ni debe existir. El ADR nativo decide que Efeonce no operará un password store:
la clase de ataque más frecuente contra un servicio de auth público (credential stuffing, phishing de
contraseñas, reset abusable) desaparece por diseño y lo que queda (passkeys, enlaces de un solo uso, TOTP)
tiene superficies acotadas y verificables.

## Goal

- Passkeys: registro y autenticación con `@simplewebauthn/server`, `rpId = auth.efeonce.org`, verificación
  de origen, contadores anti-clonación, hasta 5 credenciales por persona, nombres por dispositivo.
- Magic link: token de 32 bytes, bcrypt en reposo, 15 minutos, un solo uso, cooldown 60 s por sujeto y 5/h
  por IP (reusa el modelo de `src/lib/auth/magic-link.ts`), correo por Resend con plantilla gobernada.
- TOTP: enrolamiento con secreto cifrado en reposo (KMS envelope), verificación con ventana ±1, códigos de
  respaldo hasheados, exigido como step-up al consentir un scope de escritura.
- Sesión: `greenhouse_auth.sessions` con id aleatorio hasheado, TTL 12 h deslizante y 7 días absoluto,
  binding a `identity_profile` vía `(environment, subject)`, `auth_time` y `amr` para la decisión de step-up.
- Recuperación: sin self-service de reset; el operador emite una nueva invitación auditada
  (`issueExternalInvitation` de `TASK-1631`) que re-liga al mismo `identity_profile` y revoca sesiones y passkeys previas.
- Contrato de flujo para la UI: estados, errores canónicos es-CL, orden de métodos, step-up, y qué copia va en `src/lib/copy/auth-server.ts`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§Invariants: una persona = un `identity_profile`)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§Auth resilience, capas TASK-742)
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`

Reglas obligatorias:

- NUNCA persistir contraseñas ni crear un segundo credencial permanente para una persona que ya existe en Greenhouse.
- NUNCA revelar si un correo existe (respuestas idénticas en tiempo y forma); anti-enumeración obligatoria.
- NUNCA loggear tokens de magic link, secretos TOTP, challenges WebAuthn ni ids de sesión crudos.
- SIEMPRE ligar la sesión a un source link verificado `(environment, subject)`; sin invitación aceptada no hay sesión.
- SIEMPRE registrar en `auth_attempts` (ledger TASK-742) cada intento con resultado, sin PII adicional.
- Copy visible SOLO desde `src/lib/copy/auth-server.ts` validado con `greenhouse-ux-writing`.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `src/lib/auth/magic-link.ts` (propiedades de seguridad a replicar)
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md` (correo gobernado; EPIC-042)

## Dependencies & Impact

### Depends on

- `TASK-1828` (cumplida en staging 2026-09-04): runtime `services/auth-server/**` y schema `greenhouse_auth`. Su
  llave KMS `auth-server-es256` es de firma (EC), NO de envelope: la llave simétrica para secretos TOTP es de esta task.
- `TASK-1631` (`external_member_invitations`, `identity_profile_source_links`, `external_identity_environments`;
  Slice 1 code complete y verificado en staging 2026-09-04).
- Resend (`src/lib/resend.ts`) y un `EmailType` nuevo para magic link e invitación externa `[verificar catálogo de EmailType]`.

### Blocks / Impacts

- Task `ui-ux` de login/consentimiento: consume el contrato de flujo de esta task.
- `TASK-1829`: `authorize` exige la sesión que produce esta task.
- `TASK-1832`: los canaries autentican personas reales por estos métodos.
- `TASK-1833`: audita anti-abuso y recuperación.

### Files owned

- `src/lib/auth-server/persons/**` (nuevo: passkeys, magic-link, totp, sessions, recovery, rate-limit)
- `services/auth-server/routes/persons/**` (nuevo)
- `migrations/<timestamp>_task-1830-auth-person-credentials.sql` (nuevo: `sessions`, `passkey_credentials`, `magic_link_tokens`, `totp_enrollments`, `auth_rate_limits`)
- `src/lib/copy/auth-server.ts` (nuevo)
- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (nuevo: flujo maestro que la task ui-ux referencia)
- `docs/documentation/identity/autenticacion-clientes-externos.md` (nuevo)

## Current Repo State

### Already exists

- `src/lib/auth/magic-link.ts` (TASK-742 capa 5) con bcrypt, TTL 15 min, single-use y rate limit declarado.
- `src/lib/auth/attempt-tracker.ts` (ledger `auth_attempts`).
- `bcryptjs`, `jose`, `resend` en dependencias; plantillas de correo gobernadas (`src/emails/**`).
- Invitaciones y source links de `TASK-1631`: schema APLICADO en PG (2 migraciones), commands
  (`issueExternalInvitation`, `acceptExternalInvitation`), rutas admin y reader ecosystem; staging verificado 2026-09-04.
- **Desde `TASK-1828` (2026-09-04):** runtime `services/auth-server/server.ts` en Cloud Run (`readyz`, JWKS;
  host donde nacen las rutas `/auth/*` de esta task), `deploy.sh` como SoT de env vars (flag
  `AUTH_SERVER_ENABLED`), schema `greenhouse_auth` con `signing_keys`/`signing_key_events`, SA `auth-server@`
  con `cloudsql.client`, runbook `docs/operations/runbooks/auth-server.md`.

### Gap

- No hay WebAuthn ni TOTP en el repo; no hay sesión fuera de NextAuth (`greenhouse_auth` no tiene `sessions`
  ni tablas de credenciales).
- **Sin llave KMS simétrica para el envelope de secretos TOTP:** la única llave del auth server
  (`auth-server-es256`) es EC de firma y su IAM es `signerVerifier`; hay que crear una llave `ENCRYPT_DECRYPT`
  propia en el keyring `auth-server` y otorgar `cryptoKeyEncrypterDecrypter` a `auth-server@`.
- No hay `EmailType` para invitación externa/magic link del auth server.
- No hay flujo maestro UI para login/consentimiento.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/auth-server/persons/**` (server-only) consumido por `services/auth-server/**`
- Future candidate home: `worker`
- Boundary: commands `startPasskeyRegistration`, `finishPasskeyRegistration`, `startPasskeyAuthentication`, `finishPasskeyAuthentication`, `requestMagicLink`, `consumeMagicLink`, `enrollTotp`, `verifyTotp`, `revokePersonSessions`; reader `getSessionContext`; consumidores: rutas del servicio y la task ui-ux
- Server/browser split: server; el browser sólo recibe options/challenges JSON de WebAuthn
- Build impact: dependencias nuevas `@simplewebauthn/server`, `otplib`; gate de deps de worker
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_auth.sessions`, `passkey_credentials`, `magic_link_tokens`, `totp_enrollments`, `auth_rate_limits`; lectura de `identity_profile_source_links`
- Consumidores afectados: `authorize` de `TASK-1829`, task ui-ux, canaries
- Runtime target: `worker`

### Contract surface

- Contrato existente a respetar: `auth_attempts` ledger; invitaciones de `TASK-1631`; `EmailType` gobernado
- Contrato nuevo o modificado: rutas JSON bajo `/auth/passkeys/*`, `/auth/magic-link/*`, `/auth/totp/*`, `/auth/session`
- Backward compatibility: `not applicable` (superficie nueva)
- Full API parity: las revocaciones (`revokePersonSessions`, `revokePasskey`) son commands con capability `auth.person.revoke`, operables desde Admin Center, CLI y Nexa vía propose→confirm

### Data model and invariants

- Entidades/tablas/views afectadas: las cinco tablas nuevas
- Invariantes que no se pueden romper:
  - `Una sesión referencia exactamente un source link active de tipo external_idp; si el link se revoca, la sesión muere en el próximo request.`
  - `Un magic link se consume una sola vez; un passkey counter que retrocede invalida la credencial.`
  - `Un scope de escritura sólo se consiente con amr que incluya totp o passkey con user verification, y auth_time < 10 min.`
- Write-target allowlist: declarar las cinco tablas en `src/lib/auth-server/boundary-domain.test.ts` (creado por `TASK-1829`)
- Tenant/space boundary: `identity_profile` vía source link; la organización la resuelve el binding en el gateway
- Idempotency/concurrency: `SELECT FOR UPDATE` en consumo de magic link; challenges WebAuthn de un solo uso con TTL 5 min
- Audit/outbox/history: `auth_attempts` + audit de enrolamiento/revocación; evento outbox `auth.person.session_revoked`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `AUTH_SERVER_PERSON_AUTH_ENABLED=false`
- Backfill plan: none
- Rollback path: flag `false`; revocar sesiones por command; tablas se conservan
- External coordination: `rpId` y origen exactos en producción; plantilla Resend aprobada (EPIC-042)

### Security and access

- Auth/access gate: sin sesión no hay nada; enrolamiento sólo tras invitación aceptada
- Sensitive data posture: correo de la persona (mínimo necesario); secretos TOTP cifrados; sin PII en logs
- Error contract: códigos canónicos es-CL sin distinguir "no existe" de "no autorizado"
- Abuse/rate-limit posture: por sujeto, por IP y por `client_id`; bloqueo progresivo; Cloud Armor en el borde

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server/persons`
- DB/runtime checks: filas de sesión/credenciales tras flujo en staging; `auth_attempts` con resultados
- Integration checks: registro y login con passkey desde Chrome y Safari; magic link real por Resend a un correo de prueba; TOTP con app estándar
- Reliability signals/logs: `auth.person.magic_link_rate_limited`, `auth.person.passkey_counter_regression`, `auth.person.session_without_link` steady = 0
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio, en el mismo PR — las 8 en `src/lib/auth-server/boundary-domain.test.ts`; el guard las atrapó dos veces durante la implementación.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk — 5 migraciones additive-only, todas con bloque DO anti pre-up-marker, aplicadas y verificadas contra PG real.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling — `pnpm auth-server:person-auth:smoke` ejercita el SQL y la llave KMS reales.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Sesión y magic link

- Tablas `sessions`, `magic_link_tokens`, `auth_rate_limits`; commands de sesión; magic link con Resend y `EmailType` nuevo; anti-enumeración.

### Slice 2 — Passkeys

- `passkey_credentials`; registro y autenticación con `@simplewebauthn/server`; contadores; gestión de dispositivos.

### Slice 3 — TOTP y step-up

- `totp_enrollments` con envelope KMS; verificación; códigos de respaldo; regla de step-up consumida por `authorize`.

### Slice 4 — Recuperación y contrato de flujo

- Recuperación por re-invitación; revocación de sesiones/credenciales; flujo maestro UI en `docs/ui/flows/` y copy en `src/lib/copy/auth-server.ts`.

## Out of Scope

- Pantallas y componentes (task ui-ux).
- SSO/SAML de clientes, SCIM, autoadministración.
- Autenticación de personas internas (siguen en Entra).
- Password store de cualquier tipo.

## Detailed Spec

- WebAuthn: `residentKey: preferred`, `userVerification: required` para step-up, `attestation: none`, algoritmos `-7` y `-257`. `rpId` fijo por environment del registry.
- Magic link: URL `https://auth.efeonce.org/m/<token>`; consumo por POST (no por GET) para evitar prefetchers de correo.
- Sesión: cookie `__Host-efeonce_auth`, `SameSite=Lax`, valor = id aleatorio; en PG se guarda `sha256(id)`.
- TOTP: `otplib` con `step 30`, `digits 6`, `window 1`; 10 códigos de respaldo bcrypt.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. `authorize` (`TASK-1829`) no se habilita para personas hasta que Slice 1 esté en staging; el consentimiento de scopes de escritura exige Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Enumeración de correos por diferencia de respuesta | identity | medium | respuestas idénticas y temporizadas; test que compara cuerpos y tiempos | revisión en `TASK-1833` |
| Magic link consumido por scanner de correo | identity | medium | consumo por POST con página intermedia; token de un solo uso | `auth.person.magic_link_consumed_without_ui` |
| Passkey clonado | identity | low | contador monotónico; credencial invalidada al retroceder | `auth.person.passkey_counter_regression` |
| Sesión sobrevive a revocación del link | identity / MCP | low | check de link active por request; test negativo | `auth.person.session_without_link` |
| Correo transaccional mal presentado (EPIC-042) | email | medium | plantilla gobernada y revisión antes de canary | QA de correo |

### Feature flags / cutover

- `AUTH_SERVER_PERSON_AUTH_ENABLED` (default `false`); ledger actualizado; runtime `auth-server`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag `false`; `revokePersonSessions` masivo | < 5 min | sí |
| Slice 2 | deshabilitar método passkey por config; credenciales se conservan | < 5 min | sí |
| Slice 3 | deshabilitar step-up (bloquea consent de escritura, no lectura) | < 5 min | sí |
| Slice 4 | revert del PR de docs/flujo; sin efecto en runtime | < 5 min | sí |

### Production verification sequence

1. Staging: persona de prueba invitada (`TASK-1631`) → magic link real → sesión creada → link revocado → sesión muere.
2. Staging: registro y login con passkey en dos navegadores; contador verificado.
3. Staging: TOTP enrolado; consent de scope de escritura sin TOTP rechazado; con TOTP aceptado.
4. Producción: repetir con persona interna de prueba antes de cualquier cliente; cooldown 24 h.

### Out-of-band coordination required

- Plantilla de correo aprobada bajo EPIC-042; dominio de envío Resend verificado para `auth.efeonce.org` `[verificar dominio de envío vigente]`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] No existe columna ni tabla de contraseñas en `greenhouse_auth`. — 8 tablas nuevas revisadas; ninguna guarda un secreto reusable de la persona salvo el TOTP, y ése va cifrado por KMS.
- [x] Magic link: 15 min, un solo uso (UPDATE condicional con `rowCount === 1` en transacción), cooldown 60 s por correo y 5/h por IP (`auth_rate_limits`, con bloqueo progresivo), consumo por POST con página intermedia. — **Desviación declarada: `sha256` + comparación en tiempo constante en vez de bcrypt.** Razón en el Delta de abajo; el criterio pedía bcrypt, la intención era "no reconstruible desde un dump" y sha256 sobre 256 bits la cumple mejor en este runtime. Tests `person-auth-flow.test.ts` + smoke contra PG real.
- [ ] Passkeys: registro y autenticación **verificados en dos navegadores** — PENDIENTE de rollout: exige staging con el flag prendido. Lo que SÍ está verificado: la ceremonia completa CONTRA EL HOST DESPLEGADO en el canary del 2026-09-05 (registro 201, login con `uv` que abre en `step_up`, mismo origen exigido con 403 sin `Origin` y 403 con origen ajeno, reto que no revela credenciales de nadie), y antes contra `@simplewebauthn/server` con un autenticador de software que firma con P-256 real (`passkeys.test.ts`, 19 casos), y que un contador que retrocede invalida la credencial (ese caso encontró un defecto real: la librería lanzaba y la credencial clonada quedaba viva).
- [x] TOTP: enrolamiento con secreto cifrado por KMS — llave simétrica `auth-server-totp-envelope` creada 2026-09-04 (HSM, rotación 90 d), round-trip y rechazo por AAD verificados contra la llave REAL en `pnpm auth-server:person-auth:smoke`. El consent de escritura exige `amr` con `totp` o passkey `uv` y factor reciente < 10 min (`resolveAuthLevel`, consumido por `authorize` vía `SubjectSessionPort`).
- [x] Una sesión cuyo source link se revoca deja de ser válida en el siguiente request — y además queda revocada en el store, no sólo rechazada. Verificado por test y por mutación (quitar el chequeo pone 2 tests en rojo).
- [x] Respuestas de "correo no existe" y "correo existe" indistinguibles en cuerpo, código, encabezados **y tiempo** — dos tests separados; quitar el piso de latencia o cambiar el cuerpo pone uno en rojo cada uno.
- [x] Cada intento queda registrado sin PII adicional; ningún log contiene tokens ni secretos. — **Desviación declarada:** el ledger es `greenhouse_auth.person_auth_attempts`, no `greenhouse_serving.auth_attempts`. Razón en el Delta. Tests verifican que ni el correo, ni el sujeto crudo, ni el verificador llegan al ledger.
- [x] Flujo maestro UI extendido en `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (§5.bis, coordinado con `TASK-1835`) y copy en `src/lib/copy/auth-server.ts`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth-server`
- flujo real en staging con correo Resend y passkey de navegador
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre la task ui-ux, `TASK-1829`, `TASK-1832`, `TASK-1833`
- [ ] doc funcional `docs/documentation/identity/autenticacion-clientes-externos.md` publicada

## Follow-ups

- Autoadministración de dispositivos por la persona (fuera de la primera cohorte).
- Notificación por correo al enrolar/quitar un passkey.

## Open Questions

- Si magic link queda como método permanente o sólo como bootstrap hasta registrar el primer passkey.
