# TASK-1837 — Efeonce ID: entrega gobernada de la invitación externa y autoridad delegada del cliente

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
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `code complete; migración APLICADA a la instancia compartida 2026-09-06T04:27Z (verificada por information_schema/pg_constraint); flags OFF en todos los runtimes; verificación viva del correo pendiente. Slices 1-4 y 5a en develop (5518d868e…189148c6e + rollout), sin push al escribir esto. Verificado: pnpm test completo 13.784 ✔, typecheck ✔, local:check ✔, pnpm build de producción ✔ (79 s), smoke read-only + --apply extendido contra PG real (reenvío/revelación/entrega/delegada/admin cleared; token_revealed se vio encender ok→warning). No existe binding externo (el único activo es internal, piloto TASK-1836): el correo real, el rebote forzado y la primera persona externa esperan la decisión del operador (organización/persona) y el flag en staging. Federación de la lane delegada en efeonce-mcp pendiente (TASK-1831/1832). Evidencia: docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `Slice 5b: decisión del operador sobre organización cliente/persona de la primera invitación real (no existe binding externo) + flag de entrega en staging con casilla controlada; lane delegada: federación en efeonce-mcp (TASK-1831/1832)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy una persona externa sólo puede entrar a Efeonce ID si alguien de Efeonce le hace llegar a mano el
token de invitación: el command lo devuelve una vez en la respuesta de la API y nadie lo envía. Esta
task cierra el recorrido completo de alta de un cliente sin intermediario humano — el sistema entrega
la invitación, el token deja de mostrarse en pantalla, el ciclo de vida (reenvío, caducidad, rebote,
revocación) queda observable, el administrador del lado del cliente recibe autoridad acotada para
invitar a su propia gente, y el consentimiento pasa a mostrar el destino del `redirect_uri` que la
especificación MCP exige y hoy omitimos.

## Why This Task Exists

`issueExternalInvitation` ([src/lib/identity/external-access/commands.ts:594](src/lib/identity/external-access/commands.ts))
crea la fila, guarda `sha256(token)`, publica `identity.external_invitation.issued` y **devuelve el
token en claro al llamador**. La ruta
[bindings/[bindingId]/invitations/route.ts](src/app/api/admin/identity/external-access/bindings/%5BbindingId%5D/invitations/route.ts)
lo entrega tal cual en el body y su propio comentario lo dice: *«El token viaja UNA vez en esta
respuesta»*. No hay ningún consumidor del evento: `grep` sobre `src/lib/sync/projections/**` no
devuelve nada para `externalInvitationIssued`. El resultado operativo es que **el último tramo del
alta lo hace una persona copiando un secreto**, con tres consecuencias:

1. **No escala.** Cada persona de cada organización cliente pasa por un operador de Efeonce. Es la
   razón por la que `TASK-1830` quedó con el carril de tokens bloqueado: *«no existe membership
   externa (3 invitaciones, las 3 revoked)»*. Sin este recorrido no hay primera persona externa real,
   y sin ella `TASK-1832` no puede abrir la cohorte.
2. **Es una postura de seguridad que ningún producto del mercado sostiene.** Mostrarle a un
   administrador el secreto de otra persona contradice NIST SP 800-63A-4 §3.8 (el secreto de
   enrolamiento va al sujeto por un canal separado), NIST SP 800-63B-4 §3.1.3.1 (secreto de un solo
   uso, no compartido) e ISO/IEC 27002:2022 §5.17 (la información de autenticación no se revela a
   terceros); tiene precedente de vulnerabilidad publicada (CVE-2022-39356, invitación adivinable/
   reutilizable en un producto de identidad).
3. **Incumplimos un MUST del protocolo.** `renderConsentPage`
   ([src/lib/auth-server/oauth/pages/render.ts:146](src/lib/auth-server/oauth/pages/render.ts))
   muestra `clientName` y `clientId`, y **no muestra el host del `redirect_uri`**. La persona autoriza
   sin ver a dónde se envía el código. Verificado por lectura: la única aparición de `redirect_uri` en
   el módulo de páginas es el copy de error `invalid_redirect_uri`.

Y hay un cuarto punto, estructural: el esquema ya tiene la columna `designated_admin` en
`external_member_invitations`
([migrations/20260904104914802_task-1631-external-identity-binding-foundation.sql:152](migrations/20260904104914802_task-1631-external-identity-binding-foundation.sql))
y el binding tiene `designated_admin_profile_id`, que `resolve-external-access.ts:293` **sí lee**
para derivar `designatedAdmin`. Pero `designated_admin` de la invitación se **escribe y nunca se
lee**: aceptar una invitación marcada como administrador no convierte a nadie en administrador de
nada. La figura existe en el modelo y no tiene ninguna autoridad detrás. Ésa es la pieza que permite
que el cliente administre a su propia gente en vez de escribirle a Efeonce.

## Goal

- Que una persona externa reciba su invitación **del sistema**, a su correo, sin que nadie de Efeonce
  vea ni transporte el secreto.
- Que el token de invitación deje de existir como dato legible: ni en la respuesta de la API, ni en
  el evento del outbox, ni en pantalla, salvo por una excepción gobernada, auditada y acotada.
- Que el ciclo de vida de la invitación (enviada, rebotada, aceptada, caducada, revocada, reemitida)
  sea observable sin abrir la base de datos.
- Que un administrador designado del lado del cliente pueda invitar a su propia gente contra un
  contrato gobernado, acotado a su binding y sin poder ampliarse a sí mismo.
- Que el consentimiento muestre el host del `redirect_uri`, cerrando el MUST del protocolo.
- Que exista **una persona externa real, viva y verificada** que desbloquee el carril de tokens de
  `TASK-1830` y la cohorte de `TASK-1832`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- **El token de invitación nunca se persiste en claro ni viaja por el outbox.** La tabla guarda
  `sha256`; el evento `identity.external_invitation.issued` conserva su payload actual sin token.
  Consecuencia de diseño (ver `Detailed Spec §1`): el envío **no puede** hacerse desde un consumer
  reactivo, porque un consumer sólo ve el evento y el evento no tiene el secreto.
- **El correo con el token es `token_sensitive`.** Se registra en `TOKEN_SENSITIVE_EMAIL_TYPES`
  ([src/lib/email/types.ts](src/lib/email/types.ts)) para que el cuerpo no quede persistido en
  `email_deliveries` — mismo mecanismo que ya usan `password_reset` y los correos de assessment.
- **Reenviar es rotar, nunca reexpedir el mismo secreto.** Es lo que hacen los dos vendors auditados
  (Ory `POST /admin/recovery/link` genera uno nuevo; FusionAuth invalida el anterior con 404). El
  command ya tiene el parámetro `reissue`; se apoya en él.
- **Capability antes que rol.** Toda autoridad nueva pasa por `can(subject, capability, action,
  scope)`; prohibido `roleCodes.includes(...)` inline. Capability + grant a ≥1 rol real en el MISMO
  PR (TASK-873/935), o el guard `capability-grant-coverage.test.ts` rompe el build.
- **El administrador delegado no se puede auto-elevar.** Un administrador designado jamás emite una
  invitación con `designatedAdmin: true` ni amplía grants; sólo invita personas de su propio binding.
- **Errores canónicos.** Toda respuesta de error usa `canonicalErrorResponse` / `ExternalAccessError`;
  ninguna prosa en inglés cruda llega a un consumidor, ningún detalle técnico llega al cliente.
- **Anti-enumeración.** Ninguna respuesta revela si un correo existe, si una invitación existe, o por
  qué falló — el contrato actual de `src/lib/auth-server/persons/invitations.ts` ya lo declara y se
  conserva.

## Normative Docs

- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md` — dueña del binding,
  la invitación y los grants. Esta task **extiende su contrato, no lo reemplaza**.
- `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md` — dueña de la
  autenticación de la persona una vez que acepta.
- `docs/tasks/to-do/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md` — consumidora:
  la cohorte no abre sin esta task.
- `docs/tasks/to-do/TASK-1012-invite-activation-cross-env-url-and-delivery-status.md` — ya declaró dos
  gaps idénticos para el portal (URL de activación cross-env y sync de estado de entrega con Resend).
  Esta task resuelve ambos **para el emisor**; la del portal sigue siendo suya.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — el flag nuevo se registra ahí en el mismo PR.

## Dependencies & Impact

### Depends on

- `greenhouse_core.external_member_invitations`, `external_organization_bindings`,
  `external_identity_environments` — creadas por `TASK-1631`, aplicadas en producción.
- `src/lib/identity/external-access/commands.ts` — `issueExternalInvitation`,
  `acceptExternalInvitation`, `revokeExternalAccess`.
- `src/lib/email/delivery.ts` + `src/lib/email/types.ts` + `src/lib/email/templates.ts` — envío,
  deduplicación por `sourceEventId` y postura `token_sensitive`.
- `src/lib/entitlements/runtime.ts` — grants; ya declara `identity.external_invitation.issue`.
- `src/lib/auth-server/persons/adapters.ts` — consumidor in-process de `acceptExternalInvitation`.
- `services/auth-server/` vivo en `https://auth.efeonce.org` (TASK-1828).

### Blocks / Impacts

- `TASK-1832` — la cohorte de clientes no abre sin entrega automática ni divulgación del
  `redirect_uri`.
- `TASK-1830` — su carril de tokens está bloqueado por ausencia de membership externa real; esta task
  la produce.
- `TASK-1834` — la convergencia del login de clientes hereda el mismo camino de alta.
- `TASK-1012` — comparte el diagnóstico de URL cross-env y estado de entrega; se agrega `## Delta`.
- `TASK-1835` — recibe `## Delta` por el dato nuevo del consentimiento (host del `redirect_uri`).

### Files owned

- `src/lib/identity/external-access/commands.ts`
- `src/lib/identity/external-access/delivery.ts` *(nuevo)*
- `src/lib/identity/external-access/types.ts`
- `src/lib/identity/external-access/store.ts`
- `src/lib/identity/external-access/http.ts`
- `src/app/api/admin/identity/external-access/bindings/[bindingId]/invitations/route.ts`
- `src/app/api/admin/identity/external-access/bindings/[bindingId]/invitations/[invitationId]/resend/route.ts` *(nuevo)*
- `src/app/api/admin/identity/external-access/bindings/[bindingId]/invitations/[invitationId]/reveal/route.ts` *(nuevo)*
- `src/app/api/platform/ecosystem/identity/invitations/route.ts` *(nuevo, lane delegada)*
- `src/lib/email/types.ts`, `src/lib/email/templates.ts`
- `src/lib/copy/auth-server.ts`
- `src/lib/auth-server/oauth/pages/render.ts`
- `src/lib/auth-server/oauth/consent-context.ts` *(`[verificar]` — referenciado por `render.ts:1`)*
- `src/lib/reliability/queries/external-identity-binding-signals.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/` — una migración additive
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/documentation/identity/` + `docs/manual-de-uso/identity/`

## Current Repo State

### Already exists

- `issueExternalInvitation` con token de 32 bytes (`randomBytes(32).toString('base64url')`,
  [ids.ts](src/lib/identity/external-access/ids.ts)), `sha256` en la tabla, `expires_at`, `reissue`,
  revocación de la invitación abierta previa y evento outbox — **la criptografía está bien; lo que
  falta es el recorrido.**
- `acceptExternalInvitation` con `FOR UPDATE` sobre `token_hash`, verificación de estado, caducidad y
  correo. **Verificado por lectura ([commands.ts:737](src/lib/identity/external-access/commands.ts)):
  con correo verificado distinto lanza `ExternalAccessError` DENTRO de la transacción, así que la
  transacción revierte y el token NO se consume.** Es el modo de falla documentado en otros productos
  y nosotros no lo tenemos; queda como invariante a proteger con un test de regresión.
- `designated_admin` (invitación) y `designated_admin_profile_id` (binding) en el esquema;
  `resolve-external-access.ts:293` deriva `designatedAdmin` desde el binding.
- Seis señales de fiabilidad del dominio en
  [external-identity-binding-signals.ts](src/lib/reliability/queries/external-identity-binding-signals.ts)
  y el smoke `pnpm identity:external-access:smoke`.
- Infraestructura de correo completa: `sendEmail` con deduplicación por evento,
  `TOKEN_SENSITIVE_EMAIL_TYPES`, `AGENCY_BRANDED_EMAIL_TYPES`, plantillas y previews.
- Precedente de invitación enviada por el sistema:
  [invite-client-portal-user.ts](src/lib/client-onboarding/invite-client-portal-user.ts) — crea, emite
  token, arma URL y llama `sendEmail`, todo en el mismo camino, con `emailSent` en el resultado.
- Consentimiento server-rendered con ficha de aplicación y marca verificada por origen CIMD
  ([client-marks.ts](src/lib/auth-server/oauth/pages/client-marks.ts)).

### Gap

- **Cero consumidores** de `identity.external_invitation.issued`: el evento se publica y nadie lo
  atiende. El correo no existe.
- La respuesta de la API entrega el token en claro al operador; no hay capability, razón ni auditoría
  para ese acto.
- No hay reenvío explícito, ni estado de entrega, ni tratamiento del rebote: una invitación que nunca
  llegó es indistinguible de una que llegó y no se usó.
- `designated_admin` de la invitación no se lee en ninguna parte: la figura del administrador del
  cliente no confiere autoridad.
- No existe carril `ecosystem` para que el cliente opere su propia gente: todo pasa por
  `api/admin/**`, que es de Efeonce.
- El consentimiento no muestra el host del `redirect_uri` (MUST del protocolo).
- La URL de aceptación no está derivada en ningún sitio; el precedente del portal usa
  `NEXT_PUBLIC_APP_URL` con fallback a producción, que es exactamente el bug cross-env de
  `TASK-1012`/`ISSUE-084` y no debe replicarse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/identity/external-access/**` (compartido, sin `server-only`, consumido
  in-process por `services/auth-server/`), rutas `src/app/api/**` en Vercel, señales en
  `src/lib/reliability/**`.
- Future candidate home: `domain-package`
- Boundary: el command canónico `issueExternalInvitation` / `resendExternalInvitation` /
  `issueDelegatedExternalInvitation` es el único punto de emisión. Consumidores autorizados: ruta
  admin (Efeonce), lane `api/platform/ecosystem` (cliente delegado), `auth-server` in-process
  (aceptación). Prohibido: cualquier `INSERT`/`UPDATE` directo sobre
  `greenhouse_core.external_member_invitations` fuera del módulo.
- Server/browser split: el módulo entero corre en servidor. El token existe únicamente en memoria del proceso
  que lo emite y en el cuerpo del correo; nunca cruza a un bundle de cliente ni a un log.
- Build impact: `none` — reusa `sendEmail` y el pool canónico; sin dependencias nuevas.
- Extraction blocker: la emisión y la aceptación viven en una transacción sobre `greenhouse_core`
  compartido con `identity_profiles` y `identity_profile_source_links`; el envío del correo cuelga del
  mismo camino por el invariante del token. No es extraíble hasta que EPIC-026 defina la frontera de
  identidad.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration` (correo saliente) + `api` + `command` + `migration` additive
- Source of truth afectado: `greenhouse_core.external_member_invitations` (estado y entrega),
  `greenhouse_core.external_organization_bindings` (`designated_admin_profile_id`),
  `greenhouse_core.email_deliveries` (entrega)
- Consumidores afectados: operador Efeonce (API admin), administrador delegado del cliente (lane
  ecosystem), `auth-server` (aceptación), `/admin/operations` (señales), `TASK-1832` (cohorte)
- Runtime target: `staging` → `production` (Vercel para la emisión; Cloud Run `auth-server` para la
  aceptación; el `ops-worker` sólo drena el rebote)

### Contract surface

- Contrato existente a respetar: `issueExternalInvitation` / `acceptExternalInvitation`
  (`TASK-1631`), `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`, contrato de no-oráculo de
  `src/lib/auth-server/persons/invitations.ts`.
- Contrato nuevo o modificado:
  - `issueExternalInvitation` deja de devolver `token`; devuelve `delivery: { status, attempts,
    recipientMasked }`.
  - `resendExternalInvitation(invitationId, reason)` — command nuevo, rota el token.
  - `revealExternalInvitationToken(invitationId, reason)` — command nuevo, excepción gobernada.
  - `issueDelegatedExternalInvitation` — command nuevo, autoridad del cliente.
  - `POST /api/platform/ecosystem/identity/invitations` — lane delegada.
  - Evento nuevo `identity.external_invitation.delivery_failed` en `EVENT_TYPES`.
  - `renderConsentPage` acepta `redirectHost`.
- Backward compatibility: `breaking` para el llamador de la ruta admin (desaparece `token` del body).
  El único consumidor es el operador vía `curl`/smoke; se declara en el `## Delta` de `TASK-1631` y en
  el runbook. Gateado por flag para poder volver atrás.
- Full API parity: la capability «invitar a una persona de mi organización» queda como command
  gobernado con autorización fina, idempotencia y auditoría; la consumen la ruta admin, la lane
  ecosystem y —por construcción— Nexa mediante `propose → confirm → execute`. No se construye nada
  específico para un consumidor.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.external_member_invitations` (columnas
  additive de entrega), `greenhouse_core.external_organization_bindings` (lectura de
  `designated_admin_profile_id`), `greenhouse_core.email_deliveries` (escritura vía `sendEmail`).
- Invariantes que no se pueden romper:
  - `token_hash` sigue siendo el único rastro del secreto; **nunca** se agrega una columna con el
    token, ni cifrado ni codificado.
  - El payload del evento outbox no contiene el token (hoy no lo contiene; hay que probarlo con un
    test que falle si alguien lo agrega).
  - Un correo verificado que no coincide con la invitación **no consume** el token (regresión de
    `commands.ts:737`).
  - Una invitación abierta por binding+correo: reemitir revoca la anterior en la misma transacción.
  - El administrador delegado no emite `designatedAdmin: true` ni invita fuera de su binding.
  - `designated_admin` de la invitación sólo tiene efecto al aceptar, y sólo si el binding no tiene ya
    un `designated_admin_profile_id` distinto activo (no hay dos dueños silenciosos).
- Write-target allowlist: el dominio `external-access` no declara hoy un boundary test tipo
  `ALLOWED_WRITE_TARGETS` `[verificar]`. Si existe, la columna nueva se declara ahí en el mismo PR; si
  no existe, esta task **no** crea uno nuevo (fuera de alcance) y lo registra como follow-up.
- Tenant/space boundary: el binding es la frontera. La lane ecosystem deriva el `binding_id` del token
  del cliente (`AuthContext`), **nunca del body**; un `binding_id` en el body que no coincida es 403.
- Idempotency/concurrency: emisión y reenvío en `withTransaction` con `FOR UPDATE` sobre la invitación
  abierta; `sendEmail` deduplica por `(sourceEventId, sourceEntity, recipientEmail)`, así que un
  reintento del mismo acto no manda dos correos. Tope de reenvíos por invitación y ventana temporal.
- Audit/outbox/history: `external_access_audit_log` (append-only, ya existe vía `buildExternalAuditId`)
  para emisión, reenvío, revelación y emisión delegada — la revelación registra actor, razón y
  `invitation_id`, **nunca el token**. Outbox conserva `issued`/`linked` y suma `delivery_failed`.

### Migration, backfill and rollout

- Migration posture: `additive` — columnas `delivery_status`, `delivery_attempts`,
  `last_delivery_at`, `last_delivery_error_code` sobre `external_member_invitations`, con `DEFAULT` y
  `CHECK` de estado; marcador `-- Up Migration` y bloque `DO $$ … RAISE EXCEPTION` de verificación
  post-DDL (regla anti pre-up-marker, CLAUDE.md).
- Default state: `flag OFF`. `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED=false` en el primer deploy:
  con el flag apagado el comportamiento actual se conserva (token en la respuesta, sin correo).
- Backfill plan: ninguno. Las 3 invitaciones históricas están `revoked` (evidencia: `Status real` de
  `TASK-1830`); no hay estado que migrar. Las columnas nuevas nacen con default.
- Rollback path: flag a `false` + redeploy (< 5 min en Vercel). La migración es additive y no se
  revierte; el `CHECK` acepta el default.
- External coordination: registrar el flag en `FEATURE_FLAG_STATE_LEDGER.md`; **mapear dónde se lee
  antes de prenderlo** (`grep -rn` en `src/` y `services/`) — el rebote se drena en el `ops-worker`, la
  emisión corre en Vercel: son dos runtimes con env vars independientes. Verificar dominio remitente y
  reputación en Resend antes de mandar a un dominio de cliente.

### Security and access

- Auth/access gate: `identity.external_invitation.issue` (existente) para la ruta admin;
  `identity.external_invitation.reveal_token` (nueva, con razón obligatoria) para la excepción;
  `identity.external_invitation.issue_delegated` (nueva) para la lane del cliente, resuelta contra el
  `designated_admin_profile_id` del binding del token. Cada una con grant a ≥1 rol real en el mismo PR.
- Sensitive data posture: PII (correo, nombre) + secreto de enrolamiento. El correo del destinatario se
  enmascara en respuestas y logs; el token no se registra en ningún sitio; el cuerpo del correo no se
  persiste (`token_sensitive`).
- Error contract: `ExternalAccessError` con códigos canónicos + `canonicalErrorResponse` en las rutas;
  `captureWithDomain(err, 'identity.external_access', …)` para observabilidad. Ninguna respuesta revela
  existencia de correo, invitación o motivo del rechazo.
- Abuse/rate-limit posture: tope de reenvíos por invitación (p. ej. 3) y por binding/hora; tope de
  asientos que un administrador delegado puede invitar; piso de latencia en la lane ecosystem para no
  volverla un oráculo de correos; la revelación queda limitada por capability + razón + auditoría, y
  el enlace revelado caduca en 1 hora en vez de las 72 horas por defecto.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/identity/external-access src/lib/auth-server` + tests nuevos
  (token ausente del payload del evento; correo distinto no consume token; delegado no puede elevarse;
  host del `redirect_uri` presente en el consentimiento).
- DB/runtime checks: `pnpm migrate:up` + `SELECT` contra `information_schema.columns` confirmando las
  cuatro columnas; `pnpm identity:external-access:smoke` verde.
- Integration checks: emisión real a una casilla controlada de Efeonce en staging → correo recibido →
  aceptación → `linked` → sesión; rebote forzado a un buzón inválido → `delivery_status='bounced'`.
- Reliability signals/logs: `identity.external_invitation.undelivered` (steady 0),
  `identity.external_invitation.expired_unaccepted` (informativa),
  `identity.external_invitation.token_revealed` (steady 0; cualquier valor > 0 exige razón registrada).
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan de ejecución (2026-09-06, sesión greenhouse-eo-21)

- S1 entrega (`5518d868e`): `config.ts` (flags), `delivery.ts` (URL desde `issuer_url` del environment, envío
  post-commit por import dinámico, registro de resultado), `issueExternalInvitation` devuelve `delivery`, EmailType
  `external_access_invitation` token_sensitive + plantilla + copy, evento `delivery_failed`, migración additive
  (columnas `delivery_*`, CHECK del audit, seeds de capabilities y `email_type_config`), ruta admin sin `token`.
- S2 ciclo de vida (`6cb8042a8`): `resendExternalInvitation` (rota, topes), ruta `resend`, consumer de rebote
  `external_invitation_delivery_bounced` (sin flag), 3 señales, smoke con `delivery:'manual'`.
- S3 retiro + excepción (`c9371b28f`): `revealExternalInvitationToken` (1 h, razón, audit), ruta `reveal`,
  capabilities en catálogo + grant `efeonce_admin` + test focal de cobertura.
- S4 autoridad delegada (`4f03cdff6`): guard de admin único al aceptar + limpieza al revocar,
  `resolveDelegatedAuthority`/`issueDelegatedExternalInvitation`/`listDelegatedExternalInvitations`, lane ecosystem
  GET/POST (consumer interno, flag OFF ⇒ 404), 4 negativos.
- S5a consentimiento (`189148c6e`): `redirectHost` obligatorio en `renderConsentPage`, copy, test.
- S6 docs + gates: ledger, catálogo de eventos, control plane, invariantes, funcional, manual, Deltas cruzados.
- Rollout (fuera de esta sesión, exige confirmación): migrate:up compartido → deploy OFF + smoke → flag staging →
  correo real → rebote → reenvío/revelación → S4 en staging vía gateway → consentimiento → producción → S5b.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El sistema entrega la invitación

- `EmailType` nuevo `external_access_invitation` en `src/lib/email/types.ts`, registrado en
  `TOKEN_SENSITIVE_EMAIL_TYPES`; plantilla + `registerPreviewMeta` en `src/lib/email/templates.ts`,
  con copy es-CL validado por `greenhouse-ux-writing`, marca del emisor (Efeonce ID) y caducidad
  explícita.
- `src/lib/identity/external-access/delivery.ts`: resuelve la URL de aceptación desde el **origen
  configurado del emisor** (`AUTH_SERVER_PUBLIC_ORIGIN` `[verificar]`), nunca desde
  `NEXT_PUBLIC_APP_URL` — el bug cross-env de `TASK-1012` no se replica acá.
- `issueExternalInvitation` envía el correo en el mismo camino, después de que la transacción
  confirma, y devuelve `delivery` en vez de `token`. Detrás de
  `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`.
- Degradación honesta: si el envío falla, la invitación queda emitida con
  `delivery_status='failed'`, la respuesta lo dice y se publica
  `identity.external_invitation.delivery_failed`. **Nunca se responde «listo» sin correo.**
- Test que falla si el payload del evento `issued` incluye un campo con el token.

### Slice 2 — Ciclo de vida observable

- Migración additive: `delivery_status`, `delivery_attempts`, `last_delivery_at`,
  `last_delivery_error_code` con `CHECK` y verificación post-DDL.
- `resendExternalInvitation`: **rota** el token sobre el camino `reissue` existente, con tope por
  invitación y ventana; ruta admin `POST …/invitations/[invitationId]/resend`.
- Rebote: consumidor del webhook de Resend marca `delivery_status='bounced'` — el drenaje corre en el
  `ops-worker`, lane `ops-reactive-notifications`.
- Señales `identity.external_invitation.undelivered` y `…expired_unaccepted` en
  `external-identity-binding-signals.ts`, visibles en `/admin/operations`.
- El reader de invitaciones expone el estado de entrega; nada de esto revela el token.

### Slice 3 — El token deja de mostrarse

- La ruta admin deja de devolver `token`. Guard de regresión que falla si el campo reaparece en el
  contrato de respuesta.
- Excepción gobernada: `POST …/invitations/[invitationId]/reveal` con capability
  `identity.external_invitation.reveal_token`, razón obligatoria de ≥10 caracteres (nunca se registra
  el valor del token), auditoría, y **enlace de 1 hora** en vez de 72. Pensado para el caso real de
  una persona sin correo operativo, no para el flujo normal.
- Capability + grant + entrada en `capabilities_registry` en el mismo PR; señal
  `identity.external_invitation.token_revealed`.

### Slice 4 — Autoridad delegada del cliente

- Al aceptar, `designated_admin: true` fija `designated_admin_profile_id` en el binding, si y sólo si
  no hay otro activo; queda auditado.
- Command `issueDelegatedExternalInvitation`: emite para el binding propio, con tope de asientos,
  `designatedAdmin` forzado a `false`, y las mismas garantías de entrega del Slice 1.
- Lane `POST /api/platform/ecosystem/identity/invitations`: deriva el binding del `AuthContext` del
  token del cliente, nunca del body; capability `identity.external_invitation.issue_delegated`.
- Reader `GET` equivalente para que el administrador vea a su propia gente y el estado de sus
  invitaciones, sin ver nada de otras organizaciones.
- Negativos obligatorios: binding ajeno → 403; auto-elevación a administrador → 422; tope de asientos
  superado → 429/422; token sin la capability → 403.

### Slice 5 — Divulgación del destino y verificación viva

- `renderConsentPage` recibe y muestra el **host** del `redirect_uri` (host, no la URL completa), con
  copy nuevo en `src/lib/copy/auth-server.ts`; `## Delta` en `TASK-1835` por el tratamiento visual.
- Test que falla si el consentimiento se renderiza sin el host.
- Alta real de punta a punta con una persona externa: invitación enviada por el sistema → correo →
  aceptación → binding `linked` → consentimiento con host visible → token MCP → lectura gobernada.
- Evidencia en `docs/audits/` y actualización de `TASK-1830` (carril de tokens) y `TASK-1832`
  (cohorte).

## Out of Scope

- **La consola del administrador del cliente.** Esta task entrega el contrato gobernado; la pantalla
  es una task `ui-ux` derivada, con su wireframe y su flow. Sin diseño aprobado no se inventa la UI.
- **Registro por dominio / self-service signup.** El alta sigue siendo por invitación nominal a un
  binding existente. Los dos vendors auditados **no verifican propiedad del dominio** y Ory lo
  advierte en su propia documentación; el dominio enruta, no otorga.
- **SCIM / aprovisionamiento automático desde el IdP del cliente.**
- **Contraseñas.** El emisor no las tiene y no las tendrá (`TASK-1830`).
- **La invitación del portal Greenhouse** (`inviteClientPortalUser`) y su bug cross-env: siguen siendo
  de `TASK-1012`.
- **El gateway multi-issuer** (`TASK-1831`) y **la cohorte** (`TASK-1832`).
- **Rediseño de las pantallas del emisor** (`TASK-1835`).

## Detailed Spec

### 1. Por qué el envío NO va por un consumer reactivo

La propuesta intuitiva —y la que yo mismo planteé antes de leer el código— era un consumer reactivo
sobre `identity.external_invitation.issued`. **No funciona, y es importante que quede escrito para que
nadie lo reintente:** el consumer sólo recibe el payload del evento, y el evento no lleva el token
porque el token no se persiste en claro en ninguna parte. Para que un consumer pudiera enviar el
enlace habría que meter el secreto en el outbox — es decir, en Postgres y en la copia a BigQuery — o
guardarlo cifrado y recuperable. Ambas cosas destruyen la propiedad que hace segura a la invitación.

El camino correcto es el que ya usa el precedente del portal: **el correo se envía en el mismo acto que
genera el token**, con el secreto viviendo sólo en memoria del proceso y en el cuerpo del mensaje. El
evento del outbox se conserva para auditoría y observabilidad, no para entrega. Si el envío falla, no
se reintenta con el mismo secreto: se **rota** (Slice 2), que es exactamente lo que hacen Ory y
FusionAuth.

### 2. Anexo — investigación de mercado (2026-09-05)

Cuatro frentes, todos con fuente verificada el mismo día.

**Productos (8/8).** En Slack, Notion, Figma, Linear, GitHub, Atlassian, Google Workspace y Microsoft
365, la invitación nominal la envía el sistema. Ninguno de los ocho deja que un enlace compartible sea
el mecanismo por el que entra una persona externa: el enlace es para gente de la propia casa; el
externo entra por invitación nominal y aprobada.

**Vendors de identidad (Ory, FusionAuth).** Ninguno tiene invitación nativa. Ory lo dice textualmente:
*«It is currently not possible to send the recovery link directly to a user's email»* (issue #595).
FusionAuth no tiene la cadena «invit» en todo su índice de APIs. **Pero la conclusión no es que
nosotros estemos bien: el vendor entrega el token y el producto manda el correo. Nosotros somos el
producto.** FusionAuth lo hace explícito con dos caminos opuestos: `sendSetPasswordIdentityType:
"email"` (lo manda el sistema) o `sendForgotPasswordEmail: false`, que devuelve el `changePasswordId`
en el body con la advertencia *«Treat the generated code and the API key permissions for this endpoint
with extreme caution»*. Hoy estamos en el segundo camino, el de excepción, sin haberlo elegido.

**Administración delegada.** FusionAuth tiene una aplicación dedicada (Tenant Manager, plan
Enterprise, desde 1.58.0) y justifica su existencia con una frase que describe nuestro problema:
*«it gives access to all tenants»*. Ory **no** delega administración de usuarios: su Onboarding Portal
sólo configura SSO y SCIM. La figura del administrador del cliente es una categoría de producto real,
con dos implementaciones distintas; el Slice 4 construye su contrato.

**Revocación y dominio.** Ninguno de los dos puede revocar una invitación ya emitida (sólo bajar el
TTL o desactivar a la persona), lo que deja nuestro TTL de 1 hora para el caso excepcional alineado
con el mercado, no por encima. Y ninguno verifica propiedad del dominio para enrutar organizaciones —
Ory advierte: *«Some identity providers do not validate email domain ownership»*.

**Normas citadas:** NIST SP 800-63A-4 §3.8, NIST SP 800-63B-4 §3.1.3.1, ISO/IEC 27002:2022 §5.17,
CVE-2022-39356.

### 3. Lo que ya está bien y no se toca

El token es de 256 bits, se guarda hasheado con SHA-256, caduca en 72 horas, está ligado al correo
invitado, se consume una sola vez y la aceptación con correo distinto revierte la transacción sin
quemarlo. **El problema nunca fue la criptografía: es el recorrido.** Cualquier plan que proponga
cambiar el esquema del token está resolviendo algo que no está roto.

### 4. Desviaciones de ejecución respecto al diseño (2026-09-06)

1. La tabla de audit es `greenhouse_core.external_identity_audit_log` (no `external_access_audit_log`); su CHECK de
   `event_type` se amplió con 6 tipos (`invitation_resent`, `invitation_token_revealed`, `invitation_delivery_failed`,
   `invitation_delivery_bounced`, `designated_admin_assigned`, `designated_admin_cleared`).
2. `designated_admin` de la invitación **ya se escribía** al aceptar (`commands.ts`, `UPDATE … designated_admin_profile_id`),
   sin guard ni audit. Lo nuevo es el guard de único admin vigente (conflict fail-closed, token no consumido), el
   audit y la limpieza al revocar al admin. El §Why This Task Exists estaba desactualizado en ese punto.
3. El origen del emisor no es una env var (`AUTH_SERVER_PUBLIC_ORIGIN` no existe; Vercel no tiene `AUTH_SERVER_ISSUER`):
   es el DATO `external_identity_environments.issuer_url` del environment del binding, hecho para absorber la
   rotación de issuer. Cero env vars; test de contrato en `delivery.test.ts`.
4. El drenaje del rebote (ops-worker) **no lleva flag**: sólo actúa sobre entregas que existen, así que es inerte
   mientras nadie envía; gatearlo habría creado el riesgo multi-runtime del ledger sin proteger nada. El flag de
   entrega se lee sólo en Vercel.
5. La lane delegada es gateway-mediated: el harness ecosystem autentica consumers máquina (sister-platform) y ningún
   runtime de este repo verifica el JWT del emisor. Como `identity/binding`, el gateway (consumer `internal`) verifica
   el token de la persona y llama con `(environment, subject)`; Greenhouse resuelve la membership y exige
   `designatedAdmin` sobre el `bindingId` pedido. La capability `issue_delegated` la materializa la membership (las
   personas externas no tienen `ROLE_CODES`); el grant a `efeonce_admin` cubre la parity. Federación en
   `efeonce-mcp` = TASK-1831/1832.
6. `identity.external_invitation.expired_unaccepted` es informativa: warning ≥1, nunca error.
7. Sin piso de latencia en la lane delegada: es una lane máquina detrás del gateway con rate limit propio, y las
   respuestas son legítimamente distintas (`created` true/false sobre la propia organización).
8. El command `issueExternalInvitation` conserva `token` en su resultado para consumidores in-process (smoke,
   revelación); es la RUTA HTTP la que lo retira con entrega del sistema (guard `route.test.ts`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (entrega) → Slice 2 (ciclo de vida) → Slice 3 (retiro del token).
- **Slice 1 DEBE estar verde en producción ANTES de Slice 3.** Retirar el token de la respuesta sin
  que el correo salga deja el alta sin ningún camino: nadie puede invitar a nadie.
- Slice 4 (autoridad delegada) exige Slice 1 + Slice 2: un administrador del cliente no puede recibir
  autoridad para emitir invitaciones cuya entrega no está resuelta ni es observable.
- Slice 5 se parte en dos: la divulgación del `redirect_uri` es independiente y puede ir en paralelo
  desde el principio; la verificación viva de punta a punta cierra al final, después de 1–4.
- El flag se prende **después** de que la migración del Slice 2 esté aplicada, aunque el Slice 1
  técnicamente no la necesite: prenderlo antes deja envíos sin estado observable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se retira el token de la respuesta y el correo no sale: el alta queda sin ningún camino | identity | medium | Orden duro Slice 1 → Slice 3; flag independiente por slice; verificación en staging con correo real antes de prod | `identity.external_invitation.undelivered` |
| El correo del emisor cae en spam del cliente y la persona nunca entra | integration | high | Verificar dominio/reputación en Resend antes del primer envío a un cliente; asunto y remitente de marca; el operador ve `delivery_status` y puede reemitir | `identity.external_invitation.undelivered` |
| Alguien agrega el token al payload del outbox para «poder mandarlo desde un consumer» | identity | medium | Test de contrato que falla si el payload trae el secreto + invariante escrito en `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` + esta sección `Detailed Spec §1` | test rojo en CI |
| La URL de aceptación se arma con `NEXT_PUBLIC_APP_URL` y el enlace de staging apunta a producción | identity | medium | Derivar del origen configurado del emisor; test que falla con host distinto al del emisor; precedente documentado en `TASK-1012`/`ISSUE-084` | enlace inválido reportado por la persona |
| El administrador delegado se auto-eleva o invita a un binding ajeno | identity | low | `designatedAdmin` forzado a `false` en el command delegado; binding derivado del `AuthContext`, nunca del body; cuatro negativos obligatorios en el Slice 4 | `identity.external_binding.unaudited_write` |
| La excepción de revelación se vuelve el camino normal | identity | medium | Capability separada, razón obligatoria, auditoría, TTL de 1 h, y señal con estado estable 0 revisada en cada cierre | `identity.external_invitation.token_revealed` |
| Reenviar duplica correos o permite enumerar casillas | integration | medium | Deduplicación de `sendEmail` por evento; tope por invitación y por binding/hora; piso de latencia y respuesta indistinguible en la lane ecosystem | `auth.person.magic_link_rate_limited` (precedente) |
| El flag se prende sólo en Vercel y el drenaje del rebote queda muerto en el `ops-worker` | ops | high | Mapear dónde se lee antes de prender; declararlo en `deploy.sh` del worker **y** aplicarlo en vivo; fila en el ledger con el runtime | fila del ledger vs. `vercel env ls` / revisión activa de Cloud Run |
| Dos administradores designados silenciosos en el mismo binding | identity | low | Sólo se fija `designated_admin_profile_id` si no hay otro activo; conflicto → error explícito y auditado | `identity.external_binding.orphan_grant` |

### Feature flags / cutover

- `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` (default `false`) — controla el envío del Slice 1 y el
  retiro del token del Slice 3. Con el flag apagado, el comportamiento actual se conserva íntegro.
- `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` (default `false`) — controla la lane ecosystem del
  Slice 4.
- La divulgación del `redirect_uri` en el consentimiento **no lleva flag**: es aditiva, no rompe nada y
  cierra un MUST del protocolo; retrasarla detrás de un flag sólo alarga el incumplimiento.
- Ambos flags se registran en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el MISMO PR que los
  declara, con su runtime; `pnpm docs:closure-check` falla si falta la fila.
- Revert: flag a `false` + redeploy. < 5 min en Vercel; el worker exige `deploy.sh` + `gcloud run
  services update` (los dos, o el flag desaparece en el próximo deploy).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED=false` + redeploy Vercel | < 5 min | sí |
| Slice 2 | Migración additive, no se revierte (columnas con default). El reenvío y el consumidor de rebote se desactivan revirtiendo el PR | < 15 min | parcial |
| Slice 3 | Mismo flag del Slice 1: con el flag apagado el token vuelve a la respuesta | < 5 min | sí |
| Slice 4 | `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED=false` + redeploy. Los `designated_admin_profile_id` ya fijados se retiran con el command de revocación existente, sujeto por sujeto | < 10 min | sí |
| Slice 5 | Revert del PR de la página de consentimiento; la verificación viva no muta estado salvo la persona real dada de alta, que se revoca con `revokeExternalAccess` | < 10 min | sí |

### Production verification sequence

1. ✅ 2026-09-06 — `pnpm pg:connect:migrate` (instancia compartida) + `SELECT` contra `information_schema.columns`:
   las cuatro columnas con su default, CHECKs, índice, capabilities y kill-switch presentes.
2. Deploy a staging con ambos flags en `false` + `pnpm identity:external-access:smoke` verde: el
   comportamiento actual no cambió.
3. Prender `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` en staging (Vercel **y** el worker para el
   rebote) + emitir a una casilla controlada de Efeonce → correo recibido → aceptar → binding `linked`
   → sesión en el emisor. **Stop si el correo no llega en 2 minutos.**
4. Forzar un rebote a un buzón inválido → `delivery_status='bounced'` + señal encendida. Verificar que
   la señal **enciende** (`ok → warning/error`), no sólo que existe apagada.
5. Reenviar → token nuevo, token anterior rechazado. Verificar el tope.
6. Ejercitar la excepción de revelación una vez → auditoría con actor y razón, sin el valor del token;
   señal en 1.
7. Slice 4 en staging: los cuatro negativos (binding ajeno, auto-elevación, tope, capability ausente).
8. Consentimiento: `authorize` real → el host del `redirect_uri` visible en la pantalla.
9. Repetir 2–8 en producción con 24 h de enfriamiento, **coordinando con la sesión que lleve el
   release** (`gh run list` antes de cualquier dispatch: un release en vuelo cancelado aborta el
   manifest).
10. Alta real de la primera persona externa de la organización cliente que el operador designe →
    evidencia en `docs/audits/` → actualizar `TASK-1830` y `TASK-1832`.
11. Vigilar las tres señales 7 días.

### Out-of-band coordination required

- **Operador:** designar qué organización cliente y qué persona reciben la primera invitación real.
  Sin esa decisión el Slice 5 no cierra (es el mismo bloqueo que hoy tiene el carril de tokens de
  `TASK-1830`).
- **Resend:** verificar dominio remitente y reputación antes del primer envío a un dominio de cliente.
- **Cloud Run `ops-worker`:** el consumidor de rebote exige el flag en `deploy.sh` **y** un
  `gcloud run services update` para efecto inmediato.
- **Ventana del piloto:** el grant del piloto vence **2026-09-12**. Si la verificación viva no ocurre
  antes, hay que renovarlo o la evidencia de punta a punta queda sin camino.
- **Coordinación con Codex y con la sesión de release:** el árbol es compartido y sin worktrees.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Emitir una invitación desde la ruta admin envía un correo al invitado sin que ninguna persona de
      Efeonce vea el token, y la respuesta **no** contiene el campo `token`. *(código + tests: `commands.test.ts`
      «with system delivery sends the email AFTER the transaction», `route.test.ts`; correo real pendiente de
      rollout con el flag en staging)*
- [x] Existe un test que falla si el payload del evento `identity.external_invitation.issued` incluye
      el token. *(`commands.test.ts` «never puts the token in the outbox payload»)*
- [x] Existe un test que falla si la respuesta de la ruta de emisión vuelve a incluir el token.
      *(`bindings/[bindingId]/invitations/route.test.ts`)*
- [x] La URL de aceptación se deriva del origen configurado del emisor; un test falla si se arma con
      `NEXT_PUBLIC_APP_URL`. *(`delivery.test.ts`: origen = `issuer_url` del environment; el módulo no referencia
      ninguna env var `*URL`)*
- [x] El correo del invitado está registrado como `token_sensitive` y su cuerpo no queda persistido en
      `email_deliveries`. *(`TOKEN_SENSITIVE_EMAIL_TYPES` + `persistence.mode='token_sensitive'` con `safeContext`
      acotado)*
- [x] Un fallo de envío deja la invitación con `delivery_status='failed'`, lo dice en la respuesta y
      publica `identity.external_invitation.delivery_failed`; ninguna respuesta afirma entrega no
      ocurrida. *(`commands.test.ts` «a failed send leaves the invitation issued…»)*
- [x] Reenviar genera un token nuevo y el anterior queda rechazado; el tope por invitación y por
      binding/hora se aplica y se prueba. *(`commands.test.ts` bloque «resendExternalInvitation» + smoke live
      2026-09-06: token rotado rechazado con `invitation_not_open` contra PG real; topes 3/cadena y 20/binding/hora
      con `rate_limited` 429)*
- [ ] Un rebote de Resend deja `delivery_status='bounced'` y **enciende**
      `identity.external_invitation.undelivered` (observado pasando de `ok` a alerta, no sólo en `ok`).
      *(consumer + señal implementados y probados con mocks; la señal hermana `token_revealed` SÍ se vio encender
      ok→warning en el smoke live; el rebote real exige flag en staging + casilla controlada + binding externo)*
- [x] Revelar el token exige la capability `identity.external_invitation.reveal_token` y una razón de
      ≥10 caracteres; el acto queda auditado con actor, razón e `invitation_id`, y **sin** el valor del
      token; el enlace revelado caduca en 1 hora. *(`commands.test.ts` bloque «revealExternalInvitationToken»;
      ruta `reveal` con la capability)*
- [x] Las tres capabilities nuevas están en `capabilities_registry`, en el catálogo TS y granteadas a
      ≥1 rol real en el mismo PR; `capability-grant-coverage.test.ts` pasa. *(catálogo TS + grant `efeonce_admin` +
      `capability-grants.test.ts` ✔; seed aplicado 2026-09-06 y leído en `capabilities_registry`: `reveal_token`
      (execute) e `issue_delegated` (create) activas —son 2 nuevas; `issue` ya existía)*
- [x] Aceptar una invitación con `designated_admin: true` fija `designated_admin_profile_id` en el
      binding sólo si no hay otro activo; el conflicto da error explícito y auditado. *(`commands.test.ts`
      «acceptance with designated_admin fails closed»; el conflicto responde `conflict` 409 dentro de la tx —el
      token NO se consume— y el intento queda en el ledger del emisor vía `rejected: conflict`; la asignación
      exitosa audita `designated_admin_assigned`)*
- [ ] Un administrador delegado puede invitar a una persona de su propio binding desde
      `POST /api/platform/ecosystem/identity/invitations` usando su propio token. *(lane implementada y probada
      con mocks; el token de la persona lo verifica el gateway, cuya federación de esta lane es follow-up en
      `efeonce-mcp` (TASK-1831/1832); flag OFF)*
- [x] Los cuatro negativos del Slice 4 responden como se especifica: binding ajeno 403, auto-elevación
      422, tope superado 429/422, capability ausente 403. *(`commands.test.ts` bloque «autoridad delegada» +
      `ecosystem-identity-invitations.test.ts`: 403 forbidden, 422 invalid_request, 422 limit_reached, 429
      rate_limited)*
- [x] La pantalla de consentimiento muestra el **host** del `redirect_uri`, y un test falla si se
      renderiza sin él. *(`oauth/pages/render.test.ts`; `renderConsentPage` lanza sin `redirectHost`)*
- [x] Aceptar con un correo verificado distinto al de la invitación **no** consume el token (test de
      regresión sobre el comportamiento actual verificado). *(`commands.test.ts` «rejects a verified email that
      differs from the invited email»: el throw ocurre dentro de la tx, antes de cualquier UPDATE)*
- [x] Ambos flags tienen fila en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado, y
      `pnpm docs:closure-check` pasa. *(filas en § Pendientes, § Snapshot e § Inventario; `pnpm flags:audit
      --strict --no-vercel` ✔)*
- [ ] Existe una persona externa real, dada de alta de punta a punta sin intervención humana en la
      entrega, con evidencia fechada en `docs/audits/`. *(bloqueado: decisión del operador sobre organización y
      persona + rollout)*
- [x] `TASK-1830` y `TASK-1832` quedan actualizadas con el desbloqueo, y `TASK-1631`, `TASK-1012` y
      `TASK-1835` con su `## Delta`. *(`## Delta 2026-09-06` en las cinco; TASK-1012 sigue `legacy` por formato
      previo, no por este cambio)*

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/identity/external-access src/lib/auth-server src/lib/email`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre, coordinados para no correr en
  paralelo con otra sesión que esté compilando
- `pnpm migrate:up` + verificación por `information_schema` de las cuatro columnas
- `pnpm identity:external-access:smoke`
- `pnpm auth-server:person-auth:canary` contra `https://auth.efeonce.org`
- `pnpm docs:closure-check`
- Verificación viva: alta real de punta a punta según `Production verification sequence`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` recoge los invariantes nuevos (token fuera del outbox,
      reenviar es rotar, el delegado no se eleva, el consentimiento muestra el destino)
- [ ] Documentación funcional en `docs/documentation/identity/` y manual en
      `docs/manual-de-uso/identity/` explicando cómo se invita, cómo se reenvía, qué significa cada
      estado de entrega y qué hacer cuando un correo rebota
- [ ] Las tres señales nuevas están visibles en `/admin/operations` con su estado estable declarado

## Follow-ups

- **Consola del administrador del cliente** (task `ui-ux` derivada): pantalla para que el
  administrador designado vea a su gente, invite, reenvíe y revoque. Exige wireframe y flow propios y
  dirección de diseño aprobada; sin eso no nace.
- **Boundary test de destinos de escritura** para `external-access`, si se confirma que no existe.
- **Convergencia con la invitación del portal** (`TASK-1012`): dos caminos de invitación con el mismo
  bug cross-env; evaluar un primitive único después de que este cierre.
- **Caducidad configurable por binding** en vez de las 72 horas fijas, si algún cliente lo pide.

## Open Questions

- **¿Qué organización cliente y qué persona reciben la primera invitación real?** Decisión del
  operador. Bloquea el Slice 5, igual que hoy bloquea el carril de tokens de `TASK-1830`.
- **¿Cuántos asientos puede invitar un administrador delegado sin aprobación de Efeonce?** Propuesta:
  un tope conservador por binding, configurable, con el exceso pidiendo aprobación. Requiere decisión
  comercial, no técnica.
- **¿El copy `consent_footer` («Puedes revocar este acceso en cualquier momento desde Efeonce») debe
  nombrar dónde?** Hoy promete una revocación sin decir por dónde. Ligado a `TASK-1835`.
