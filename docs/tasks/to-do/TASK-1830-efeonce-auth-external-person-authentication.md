# TASK-1830 — Efeonce Auth External Person Authentication (passkeys, magic link, TOTP, recovery)

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

- Lifecycle: `to-do`
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
- Status real: `Especificación con runtime disponible (2026-09-04): auth.efeonce.org y schema greenhouse_auth entregados por TASK-1828 en staging; el auth server no tiene capa propia de autenticación de personas; falta una llave KMS simétrica para el envelope de secretos TOTP`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1631 (invitaciones y source links para ligar el subject; Slice 1 code complete + staging verificado 2026-09-04, producción con el próximo release)`
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

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

- [ ] No existe columna ni tabla de contraseñas en `greenhouse_auth`.
- [ ] Magic link: 15 min, un solo uso, bcrypt en reposo, cooldown 60 s por sujeto y 5/h por IP, consumo por POST.
- [ ] Passkeys: registro y autenticación verificados en dos navegadores; contador que retrocede invalida la credencial.
- [ ] TOTP: enrolamiento con secreto cifrado por KMS; consent de escritura exige `amr` con `totp` o passkey UV y `auth_time` < 10 min.
- [ ] Una sesión cuyo source link se revoca deja de ser válida en el siguiente request.
- [ ] Respuestas de "correo no existe" y "correo existe" son indistinguibles en cuerpo, código y tiempo (test).
- [ ] `auth_attempts` registra cada intento sin PII adicional; ningún log contiene tokens ni secretos.
- [ ] Flujo maestro UI publicado en `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` y copy en `src/lib/copy/auth-server.ts`.

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
