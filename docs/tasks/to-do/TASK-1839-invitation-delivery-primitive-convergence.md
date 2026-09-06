# TASK-1839 — Convergencia de la invitación del portal (`inviteClientPortalUser`, TASK-1012) con la entrega gobernada de Efeonce ID (TASK-1837)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|platform`
- Blocked by: `TASK-1837 en producción (la primitive de entrega que se generaliza es su SoT); decisión de TASK-1012 sobre el origen del portal (opción A request-origin allowlisted, B env var por entorno, o ambas)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy existen dos caminos de «el sistema invita a una persona» con la misma forma de bugs: el del
portal Greenhouse (`inviteClientPortalUser`, `src/lib/client-onboarding/invite-client-portal-user.ts`,
dueña `TASK-1012`) arma la URL con `NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'` y
no tiene ciclo de vida de entrega; el del emisor (`src/lib/identity/external-access/delivery.ts`,
`TASK-1837`) ya resolvió ambos: origen desde un dato configurado (`issuer_url` del environment),
`delivery_*` persistido, reenviar = rotar, rebote proyectado y señal. Esta task extrae de TASK-1837
**una primitive de «invitación entregada por el sistema con ciclo de vida»** —resolver de origen
desde un registro configurado, contrato `delivery_*`, reenvío como rotación, proyección de
rebote por registro de recorders— y hace que **ambos** caminos la consuman. No fusiona identidades
(`client_users` ≠ `identity_profiles`) ni cambia ningún flujo de autenticación.

## Why This Task Exists

`TASK-1012` diagnosticó el bug cross-env el 2026-06-04: en staging el correo manda a producción,
el JWT firmado con el secret de staging falla `jwtVerify` allá, y la persona ve «enlace inválido o
expirado» aunque la fila exista (Cloud SQL es único). `TASK-1837` no replicó ese bug en el emisor
porque derivó el origen de `external_identity_environments.issuer_url` y lo fijó con un test de
contrato (`delivery.test.ts`: nunca `NEXT_PUBLIC_APP_URL`, nunca env vars). Pero el `## Delta
2026-09-06` de TASK-1012 lo dice sin rodeos: *«La invitación al portal cliente … sigue siendo de
esta task: mantiene `NEXT_PUBLIC_APP_URL` y `email_deliveries` sin sync de bounce»*, y el
`## Follow-ups` de TASK-1837 pide *«evaluar un primitive único después de que este cierre»*.

Dejarlo así significa dos implementaciones de la misma capacidad que se separan con el tiempo
(el caso fuente del barrido por dominio de `TASK_PROCESS.md`): una con `delivery_status` y señal,
otra con un `console.error` y `emailSent: boolean`. El rebote del portal ya existe a medias:
`src/lib/email/resend-webhook.ts:414` marca `client_users.email_undeliverable = TRUE`, pero eso es
un flag de la persona, no el estado de una invitación concreta, y ningún reenvío del portal rota el
token anterior (`resend-onboarding` emite otro y deja el viejo vivo hasta que caduca).

## Goal

- Una primitive `src/lib/identity/invitation-delivery/**` que resuelva el origen de aceptación
  desde un registro configurado (nunca `NEXT_PUBLIC_APP_URL` ni un literal de producción), envíe
  el correo con correlación durable (`source_entity` + `source_event_id`), devuelva un resultado
  honesto (`sent|failed` + `recipientMasked`) y defina el contrato de ciclo de vida `delivery_*`.
- Que `src/lib/identity/external-access/delivery.ts` pase a ser un consumer fino de esa primitive
  sin cambiar su comportamiento verificado (mismos tests, mismas señales, mismo audit).
- Que `inviteClientPortalUser` consuma la misma primitive: URL del entorno que sirve la request
  (allowlist) o del origen configurado por entorno, `delivery_*` persistido en la invitación del
  portal, reenviar = rotar el token anterior (tope 3), rebote proyectado al estado de la invitación
  y señal `identity.client_portal_invitation.undelivered`.
- Que la proyección de rebote del ops-worker despache por `email_type` a un registro de recorders,
  en vez de conocer sólo `external_access_invitation`.
- Que nada de esto toque la aceptación: `/auth/accept-invite` (portal, contraseña) y `/i/<token>`
  (emisor, magic link) siguen siendo dos flujos distintos con dos identidades distintas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Persona` = `identity_profiles`; `client_users` es principal de auth del portal, no una segunda persona.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — un primitive canónico, muchos consumers; extraer antes de duplicar.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separación auth principal vs identidad canónica.
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — `inviteClientPortalUser` es SSOT de la invitación del portal; nadie escribe `client_users`/`user_role_assignments` por fuera.
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — §Auth resilience (TASK-742) y las reglas de TASK-1837 sobre el token.
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — proyecciones reactivas + recovery.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — `email_delivery.bounced`, `identity.external_invitation.*`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — primitive antes que ruta; contratos browser-safe separados.

Reglas obligatorias:

- El origen de aceptación NUNCA sale de `NEXT_PUBLIC_APP_URL` ni de un literal de producción: sale del registro de orígenes (`issuer_url` del environment para el emisor; request origin validado contra allowlist o `GREENHOUSE_PORTAL_ORIGIN` por entorno para el portal). Un test de contrato lo fija para AMBOS consumers.
- Un envío fallido NUNCA reporta `emailSent: true` ni deja la invitación como «enviada»: el estado queda `failed` con `errorCode`, audit y evento; la respuesta lo dice.
- Reenviar = rotar: el token/invitación anterior deja de servir en la misma transacción que emite el nuevo; tope 3 por cadena.
- El token en claro no viaja por outbox, audit ni logs; sólo por el correo (`token_sensitive`).
- La proyección de rebote sólo actúa sobre entregas que existen (`email_deliveries` con `source_entity`/`source_event_id`); no infiere por recipient.
- No se fusionan `client_users` con `identity_profiles`, no se cambia `auth_mode`, no se toca `/auth/accept-invite` ni `/i/<token>`, no se altera el contrato verificado de TASK-1837 (sus tests siguen verdes sin editar sus asserts).
- Migración additive, expand antes del deploy; contract (si alguna vez) después del release.

## Normative Docs

- `docs/tasks/to-do/TASK-1012-invite-activation-cross-env-url-and-delivery-status.md` — diagnóstico, opciones A/B, `## Delta 2026-09-06`.
- `docs/tasks/in-progress/TASK-1837-efeonce-id-external-invitation-delivery-delegated-authority.md` — `## Detailed Spec` §1 (por qué el envío no va por consumer reactivo), §4 (desviaciones), `## Rollout Plan`.
- `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md` — evidencia viva del rebote proyectado y del reenvío.
- `docs/issues/resolved/ISSUE-084-*.md` — origen del bug cross-env del portal.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — filas `EXTERNAL_INVITATION_*`; fila nueva del flag de esta task.
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` — Capability Definition of Done.

## Dependencies & Impact

### Depends on

- `TASK-1837` en producción: `src/lib/identity/external-access/delivery.ts` (`resolveInvitationAcceptanceUrl`, `sendInvitationEmailViaPlatform`, `recordExternalInvitationDeliveryOutcome`, `maskEmail`), `src/lib/sync/projections/external-invitation-delivery-bounced.ts`, `durableSensitiveSource` en `src/lib/email/delivery.ts`, migración `20260906004450748` aplicada.
- `TASK-1012` — decisión sobre el origen del portal (A: request origin allowlisted; B: `GREENHOUSE_PORTAL_ORIGIN` por entorno en Vercel; la task propone A+B con A prioritario).
- `greenhouse_core.client_users` (`status='invited'`, `email_undeliverable`) y `greenhouse_core.auth_tokens` (`token_type='invite'`, `used`, `expires_at`) — `src/lib/auth-tokens.ts`.
- `greenhouse_notifications.email_deliveries` (`email_type`, `source_entity`, `source_event_id`, `provider_status`) y el webhook `src/lib/email/resend-webhook.ts`.
- `src/lib/sync/projections/index.ts` (registro de proyecciones del ops-worker) y `src/lib/reliability/queries/external-identity-binding-signals.ts` (patrón de señal).

### Blocks / Impacts

- `TASK-1012` — pasa a consumer: sus dos gaps se cierran aquí; recibe `## Delta` y sus criterios se tildan o se marcan supersedidos con fecha.
- `TASK-1837` — su `delivery.ts` se vuelve consumer fino de la primitive; recibe `## Delta`; sus tests no cambian de assert.
- `TASK-1838` — la consola muestra los mismos `deliveryStatus`; no cambia.
- `TASK-1834` — la convergencia del login de clientes hereda una sola primitive de invitación.
- `src/app/api/admin/users/[id]/resend-onboarding/route.ts` y `src/app/api/admin/clients/[organizationId]/lifecycle/portal-users/invite/route.ts` — pasan a llamar los commands del portal con el origen de la request.

### Files owned

- `src/lib/identity/invitation-delivery/origins.ts` *(nuevo: registro de orígenes + allowlist del portal)*
- `src/lib/identity/invitation-delivery/contract.ts` *(nuevo: `InvitationDeliveryLifecycle`, `InvitationDeliveryOutcome`, `InvitationDeliveryRecorder`; browser-safe)*
- `src/lib/identity/invitation-delivery/deliver.ts` *(nuevo: `deliverInvitationEmail`, `maskEmail` movido; server-only)*
- `src/lib/identity/invitation-delivery/recorders.ts` *(nuevo: registro `email_type → recorder`)*
- `src/lib/identity/invitation-delivery/index.ts` + tests (`origins.test.ts`, `deliver.test.ts`, `recorders.test.ts`)
- `src/lib/identity/external-access/delivery.ts` (consumer; re-exporta lo que TASK-1837 publica)
- `src/lib/client-onboarding/invite-client-portal-user.ts` (consumer) + `src/lib/client-onboarding/resend-client-portal-invitation.ts` *(nuevo: reenviar = rotar)* + tests
- `src/lib/client-onboarding/record-client-portal-invitation-delivery.ts` *(nuevo: recorder del portal)*
- `src/lib/sync/projections/external-invitation-delivery-bounced.ts` (despacho por registro; nombre del handler conservado) + `src/lib/sync/projections/index.ts`
- `src/lib/reliability/queries/client-portal-invitation-signals.ts` *(nuevo)* + registro en el catálogo de señales
- `src/lib/sync/event-catalog.ts` (`identity.client_portal_invitation.delivery_failed`)
- `src/app/api/admin/users/[id]/resend-onboarding/route.ts`, `src/app/api/admin/clients/[organizationId]/lifecycle/portal-users/invite/route.ts` (pasan el request origin)
- `migrations/` — una migración additive (`client_users.invitation_delivery_*`)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§Invitation delivery primitive), `docs/documentation/identity/`, `docs/manual-de-uso/identity/`

## Current Repo State

### Already exists

- Emisor (TASK-1837): `resolveInvitationAcceptanceUrl(environment, token)` → `${issuer_url origin}/i/<token>` con test de contrato anti-`NEXT_PUBLIC_APP_URL`; `sendInvitationEmailViaPlatform` (import dinámico de `@/lib/email/delivery`, `token_sensitive`, dedupe por `(sourceEventId, sourceEntity, recipient)`); `recordExternalInvitationDeliveryOutcome` (UPDATE + audit + outbox en una tx); `maskEmail`; `resendExternalInvitation` (rotación, tope 3); proyección `external_invitation_delivery_bounced` (ops-worker, lane `ops-reactive-notifications`, sin flag); señal `identity.external_invitation.undelivered`; columnas `delivery_status/delivery_attempts/last_delivery_at/last_delivery_error_code` en `external_member_invitations`.
- Correlación durable en `src/lib/email/delivery.ts` (`durableSensitiveSource`): conserva `source_entity='external_member_invitations'` + `source_event_id=xmi-…` por regex; para `invitation` del portal hoy sólo conserva el `sourceEntity='client_users'` sin `sourceEventId`.
- Portal: `inviteClientPortalUser` (tx `client_users` + `user_role_assignments` + outbox `role.assigned`; fuera de la tx `generateToken`/`storeToken` (`auth_tokens`, 72 h) + `sendEmail({ emailType: 'invitation', sourceEntity: 'client_users' })`; `emailSent = status !== 'failed'` + `console.error`); `resend-onboarding` re-emite token y correo sin rotar el anterior; `/api/account/accept-invite` valida y consume el token y fija la contraseña; `resend-webhook.ts` marca `client_users.email_undeliverable` en rebote.
- Ledger de flags con las filas `EXTERNAL_INVITATION_*` y la regla multi-runtime.

### Gap

- No hay una primitive compartida: el resolver de origen, el envío con correlación, el resultado honesto y el contrato `delivery_*` viven dentro de `external-access` y el portal no puede consumirlos sin importar un dominio ajeno.
- El portal arma la URL con `NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'` (línea 165 de `invite-client-portal-user.ts`): bug cross-env vivo (ISSUE-084 / TASK-1012).
- La invitación del portal no tiene estado de entrega propio: `client_users.email_undeliverable` es un flag de la persona; `auth_tokens` no sabe si el correo salió; `emailSent:false` se pierde en un log.
- `resend-onboarding` no rota: dos tokens vivos para la misma persona hasta que caducan; sin tope.
- La proyección de rebote conoce un solo `email_type`; `durableSensitiveSource` no conserva `sourceEventId` para `invitation`.
- No hay señal para invitaciones del portal no entregadas.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/identity/invitation-delivery/**` (primitive nueva) con consumers en `src/lib/identity/external-access/delivery.ts` y `src/lib/client-onboarding/**`; proyección en `src/lib/sync/projections/**` (ops-worker); rutas admin en `src/app/api/admin/**` (Vercel)
- Future candidate home: `domain-package`
- Boundary: `resolveInvitationOrigin`, `deliverInvitationEmail`, `InvitationDeliveryLifecycle`, `registerInvitationDeliveryRecorder`; consumers autorizados: `external-access` (emisor), `client-onboarding` (portal), la proyección de rebote y las señales; ninguna ruta ni UI importa la primitive directo
- Server/browser split: `contract.ts` es browser-safe (tipos y enums); `origins.ts`, `deliver.ts` y `recorders.ts` son `server-only` (email, PG, env); ningún consumer cliente
- Build impact: none — sin dependencia nueva; `deliver.ts` carga `@/lib/email/delivery` por import dinámico como hoy, porque el auth-server bundlea el consumer del emisor
- Extraction blocker: transacción PG del recorder (UPDATE + audit + outbox en una tx por aggregate) y acceso a `email_deliveries` desde la proyección del ops-worker; la primitive puede extraerse como paquete de dominio sólo junto con el helper de outbox

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.external_member_invitations` (sin cambio de schema; consumer), `greenhouse_core.client_users` (columnas additive `invitation_delivery_*`), `greenhouse_core.auth_tokens` (rotación: `used=true` del token anterior), `greenhouse_notifications.email_deliveries` (correlación `source_event_id` para `invitation`)
- Consumidores afectados: `inviteClientPortalUser` + rutas admin del portal (Vercel), `external-access/delivery.ts` (Vercel + auth-server), proyección de rebote (ops-worker), señales (`/admin/operations`), TASK-1838 (lectura de `deliveryStatus`)
- Runtime target: `production` (Vercel), `worker` (ops-worker), auth-server (consumer del emisor, sin cambio de comportamiento)

### Contract surface

- Contrato existente a respetar: `IssueExternalInvitationResult.delivery` (`{ mode, status, attempts, recipientMasked, errorCode }`), `delivery.test.ts` (contrato anti-env-var), `InviteClientPortalUserResult` (`emailSent`), `EVENT_TYPES.externalInvitationDeliveryFailed`, handler `external_invitation_delivery_bounced` y su scope de idempotencia
- Contrato nuevo o modificado: `resolveInvitationOrigin(input)` (`{ kind:'efeonce_auth', environment } | { kind:'greenhouse_portal', requestOrigin?: string }` → `{ origin } | { error:'origin_unavailable' }`); `deliverInvitationEmail({ emailType, recipient, url, sourceEntity, sourceEventId, context })` → `{ status:'sent', deliveryId } | { status:'failed', errorCode }`; `InvitationDeliveryLifecycle` (`not_attempted|sent|delivered|bounced|failed`, attempts, lastAt, lastErrorCode); `registerInvitationDeliveryRecorder(emailType, recorder)`; `resendClientPortalInvitation({ userId, actor })` (rotación); `InviteClientPortalUserResult.delivery` (mismo shape que el emisor; `emailSent` se conserva como derivado para compatibilidad); evento `identity.client_portal_invitation.delivery_failed`; señal `identity.client_portal_invitation.undelivered`
- Backward compatibility: `gated` — el portal cambia de camino sólo con `CLIENT_PORTAL_INVITATION_DELIVERY_PRIMITIVE_ENABLED=true`; el emisor no cambia de comportamiento (refactor con tests intactos); `emailSent` sigue existiendo
- Full API parity: las rutas admin del portal (`portal-users/invite`, `resend-onboarding`) son adapters de `inviteClientPortalUser`/`resendClientPortalInvitation`; ninguna arma URLs ni manda correos por su cuenta; la primitive no expone ruta propia (no es una capability de negocio, es infraestructura de dominio)

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.client_users` (+4 columnas additive), `greenhouse_core.auth_tokens` (sin schema; `used=true` al rotar), `greenhouse_notifications.email_deliveries` (sin schema; `source_event_id` poblado para `invitation`), `greenhouse_sync.outbox_events` (evento nuevo)
- Invariantes que no se pueden romper:
  - El origen de aceptación proviene del registro configurado; nunca de `NEXT_PUBLIC_APP_URL` ni de un literal; un origen no allowlisted es `origin_unavailable` y la invitación queda `failed` con ese código, nunca enviada a otro entorno.
  - `delivery_status='sent'` sólo si `sendEmail` no devolvió `failed`; `failed` nunca se reporta como éxito al llamador.
  - Reenviar rota: el token anterior queda `used=true` (portal) / la invitación anterior `revoked` con `revoke_reason='resent'` (emisor) en la misma transacción que emite el nuevo; `delivery_attempts` se hereda y aumenta; tope 3 por cadena ⇒ `rate_limited`.
  - El token en claro no aparece en `outbox_events`, audit, logs ni `email_deliveries` (`token_sensitive`).
  - La proyección de rebote sólo actualiza la invitación cuyo `source_event_id` coincide; sin correlación ⇒ `skip` observable.
  - El contrato verificado del emisor no cambia: los tests de TASK-1837 pasan sin editar asserts.
- Write-target allowlist: `src/lib/identity/external-access/boundary-domain.test.ts` y `src/lib/auth-server/boundary-domain.test.ts` existen; la primitive nueva NO escribe tablas nuevas — los recorders escriben cada uno en su aggregate (`external_member_invitations` desde `external-access`; `client_users` desde `client-onboarding`), declarados en el mismo PR en el boundary test del dominio que corresponda
- Tenant/space boundary: portal: `client_id` de `client_users` y actor con `requireAdminTenantContext` en las rutas; emisor: `binding_id` → `organization_id` (sin cambio); la primitive no conoce tenants: recibe `sourceEntity`/`sourceEventId` y devuelve resultado
- Idempotency/concurrency: dedupe de `sendEmail` por `(sourceEventId, sourceEntity, recipient)`; rotación con `SELECT … FOR UPDATE` del token/invitación abierta; reenvío sobre un token ya rotado ⇒ `invitation_not_open`; la proyección de rebote es idempotente por `scope='email_delivery:<deliveryId>'`
- Audit/outbox/history: portal: outbox `identity.client_portal_invitation.delivery_failed` (`{ schemaVersion:1, userId, clientId, deliveryStatus, errorCode, attempts, changedByUserId }`, sin token ni email) + `role.assigned` existente; emisor: sin cambio (audit `invitation_delivery_failed/bounced` + evento existente)

### Migration, backfill and rollout

- Migration posture: `additive` — `client_users.invitation_delivery_status TEXT NOT NULL DEFAULT 'not_attempted'` (CHECK 5 valores), `invitation_delivery_attempts INT NOT NULL DEFAULT 0` (CHECK ≥ 0), `invitation_last_delivery_at TIMESTAMPTZ`, `invitation_last_delivery_error_code TEXT`; índice parcial `(client_id, invitation_delivery_status) WHERE status='invited'`; bloque DO anti pre-up-marker; Down conserva columnas. Aplicar ANTES del deploy del código (el SELECT del portal leerá las columnas).
- Default state: `flag OFF` — `CLIENT_PORTAL_INVITATION_DELIVERY_PRIMITIVE_ENABLED=false`: el portal sigue el camino actual byte-idéntico; el emisor no tiene flag nuevo (refactor sin cambio de comportamiento)
- Backfill plan: sin backfill — las invitaciones del portal ya emitidas quedan `not_attempted` (honesto: no sabemos si llegaron); el recorder del portal sólo actúa sobre entregas nuevas con `source_event_id`
- Rollback path: flag OFF + redeploy (< 5 min, Vercel) para el portal; revert PR para el refactor del emisor (sus tests son el gate); columnas se conservan (contract sólo después de un release estable, `docs/tasks/pending-migrations/` si aplica)
- External coordination: `GREENHOUSE_PORTAL_ORIGIN` por entorno en Vercel (staging → `https://dev-greenhouse.efeoncepro.com`, producción → `https://greenhouse.efeoncepro.com`) sólo como fallback B; allowlist A en código; redeploy del ops-worker para la proyección generalizada; fila del flag en el ledger

### Security and access

- Auth/access gate: rutas admin del portal con `requireAdminTenantContext` + capability `client.lifecycle.portal_user.invite` (existente); reenvío con la misma capability; el emisor sin cambio (`identity.external_invitation.issue`/delegada)
- Sensitive data posture: PII (correo) enmascarada en resultados/logs (`maskEmail`); token `token_sensitive` (cuerpo no persistido); sin PII en outbox
- Error contract: `ClientPortalInviteError` con códigos nuevos `origin_unavailable` (500 → canónico `configuration_missing`), `rate_limited` (429), `invitation_not_open` (409); respuestas API por `canonicalErrorResponse`; `captureWithDomain(err, 'identity', …)`
- Abuse/rate-limit posture: tope 3 reenvíos por cadena (portal y emisor); tope por actor/hora del portal reusa el knob del emisor (`EXTERNAL_INVITATION_*` constantes) o declara el propio con razón

### Runtime evidence

- Local checks: `pnpm test src/lib/identity src/lib/client-onboarding src/lib/sync/projections src/lib/email`; tests de contrato de origen para ambos consumers (env var seteada a producción y request de staging ⇒ URL de staging); test de rotación (token anterior rechazado por `validateToken`); test del despacho de recorders
- DB/runtime checks: `pnpm pg:connect:migrate` + `information_schema.columns` (4 columnas) + `pg_constraint` (2 CHECK); invitación real del portal en staging con flag ON → `client_users.invitation_delivery_status='sent'` + `email_deliveries.source_event_id` poblado
- Integration checks: correo real a casilla controlada desde staging con URL `https://dev-greenhouse.efeoncepro.com/auth/accept-invite?token=…` (cierra ISSUE-084 en staging); rebote forzado (`bounced@resend.dev`) → `invitation_delivery_status='bounced'` vía ops-worker; reenvío → token anterior `used=true` y `validateToken` lo rechaza
- Reliability signals/logs: `identity.client_portal_invitation.undelivered` (warning ≥ 1, error ≥ 5, steady 0) visible en `/admin/operations`; `identity.external_invitation.undelivered` sin cambio
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Ninguna tabla nueva; los recorders escriben cada uno en su aggregate y quedan declarados en el boundary test del dominio correspondiente en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Primitive extraída del emisor (sin cambio de comportamiento)

- `src/lib/identity/invitation-delivery/{contract,origins,deliver,recorders,index}.ts` con tests.
- `resolveInvitationOrigin({ kind:'efeonce_auth', environment })` reproduce `resolveInvitationAcceptanceUrl` (origen de `issuer_url`; sólo provider `efeonce_auth`); `deliverInvitationEmail` envuelve `sendEmail` con `token_sensitive`, correlación y resultado `sent|failed`; `maskEmail` se mueve y `external-access/delivery.ts` lo re-exporta.
- `external-access/delivery.ts` pasa a consumer: sus tests (`delivery.test.ts`, `commands.test.ts`) verdes sin editar asserts; `pnpm identity:external-access:smoke` read-only sin cambios.
- `registerInvitationDeliveryRecorder('external_access_invitation', recordExternalInvitationDeliveryOutcome)`; la proyección `external_invitation_delivery_bounced` despacha por registro conservando su `name` y scope.

### Slice 2 — Origen del portal y ciclo de vida (migración + flag OFF)

- Migración additive en `client_users` (4 columnas + CHECK + índice parcial + bloque DO) aplicada con `pnpm pg:connect:migrate`; `pnpm db:generate-types`.
- `resolveInvitationOrigin({ kind:'greenhouse_portal', requestOrigin })`: allowlist canónica (`https://greenhouse.efeoncepro.com`, `https://dev-greenhouse.efeoncepro.com`, orígenes `*.vercel.app` del proyecto `greenhouse-eo`) → fallback `GREENHOUSE_PORTAL_ORIGIN` → `origin_unavailable` (nunca literal de producción).
- `inviteClientPortalUser` detrás de `CLIENT_PORTAL_INVITATION_DELIVERY_PRIMITIVE_ENABLED`: `requestOrigin` en el input, `deliverInvitationEmail` con `sourceEntity='client_users'` + `sourceEventId=<token_id>`, recorder del portal (`record-client-portal-invitation-delivery.ts`: UPDATE `client_users.invitation_delivery_*` + outbox `delivery_failed` en una tx), resultado `delivery` + `emailSent` derivado.
- Rutas `portal-users/invite` pasan `request.headers.origin/host` validado; `durableSensitiveSource` conserva `sourceEventId` para `invitation`.
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md`; flag OFF ⇒ camino actual byte-idéntico (test de paridad).

### Slice 3 — Reenviar = rotar, rebote y señal del portal

- `resendClientPortalInvitation({ userId, actor, requestOrigin })`: `FOR UPDATE` del token `invite` abierto, `used=true`, token nuevo, `invitation_delivery_attempts+1`, tope 3 ⇒ `rate_limited`; `resend-onboarding` pasa a adapter.
- Recorder del portal registrado para `email_type='invitation'`; rebote forzado en staging → `invitation_delivery_status='bounced'` (+ `email_undeliverable` existente intacto).
- Señal `identity.client_portal_invitation.undelivered` en `src/lib/reliability/queries/client-portal-invitation-signals.ts`, registrada en el catálogo y visible en `/admin/operations`; evento nuevo en `event-catalog.ts`.

### Slice 4 — Verificación viva, docs y cierre

- Staging con flag ON: invitación real → correo con URL de staging → `accept-invite` en staging OK (cierra ISSUE-084 en staging); rebote forzado; reenvío con token anterior rechazado; evidencia en `docs/audits/`.
- `## Delta` en TASK-1012 (criterios supersedidos con fecha), TASK-1837 (consumer de la primitive), TASK-1838; invariantes en `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §Invitation delivery primitive; doc funcional y manual.
- Producción: migración ya aplicada (instancia compartida); flag ON tras 24 h de staging; readback de señales.

## Out of Scope

- Fusionar `client_users` con `identity_profiles`, cambiar `auth_mode`, o hacer que la invitación del portal se acepte en el emisor (eso es `TASK-1834`, convergencia del login).
- Tocar `/auth/accept-invite` (contraseña) o `/i/<token>` (magic link): los flujos de aceptación no cambian.
- Cambiar el contrato verificado de TASK-1837 (topes, revelación gobernada, lane delegada, señales del emisor).
- Backfill del estado de entrega de invitaciones del portal ya emitidas.
- UI: ni la consola del administrador del cliente (`TASK-1838`) ni una pantalla de estado de invitaciones del portal (follow-up si la señal lo justifica).
- Retirar `NEXT_PUBLIC_APP_URL` de otros usos del repo que no sean invitaciones.
- Webhook de Resend: ya existe y publica `email_delivery.bounced`; no se toca.

## Detailed Spec

### Forma de la primitive

```text
src/lib/identity/invitation-delivery/
  contract.ts    InvitationDeliveryLifecycle · InvitationDeliveryOutcome · InvitationOriginInput · InvitationDeliveryRecorder   (browser-safe)
  origins.ts     resolveInvitationOrigin(input) → { origin: URL } | { error: 'origin_unavailable', reason }                (server-only)
  deliver.ts     deliverInvitationEmail(input) → { status:'sent', deliveryId } | { status:'failed', errorCode }; maskEmail   (server-only)
  recorders.ts   registerInvitationDeliveryRecorder(emailType, recorder) · resolveInvitationDeliveryRecorder(emailType)     (server-only)
  index.ts
```

- `origins.ts`, caso `efeonce_auth`: idéntico a `resolveInvitationAcceptanceUrl` de TASK-1837 (origen de `external_identity_environments.issuer_url`; provider ≠ `efeonce_auth` ⇒ `landing_unavailable`, que se mapea a `origin_unavailable` con `reason`).
- `origins.ts`, caso `greenhouse_portal`: `requestOrigin` (de `Origin`, o `X-Forwarded-Proto` + `Host`) normalizado y comparado contra la allowlist; si no hay request (worker/cron), `GREENHOUSE_PORTAL_ORIGIN`; si nada resuelve ⇒ `origin_unavailable`. **Nunca** `NEXT_PUBLIC_APP_URL`, **nunca** un literal.
- `deliver.ts`: carga `@/lib/email/delivery` por import dinámico (mismo motivo que hoy: el auth-server bundlea el consumer del emisor); exige `sourceEntity` + `sourceEventId`; devuelve `recipientMasked`.
- El recorder es del aggregate: la primitive no sabe de `external_member_invitations` ni de `client_users`; sólo invoca `recorder({ sourceEventId, outcome, errorCode, actor })`.

### Consumer del portal (flag ON)

```text
inviteClientPortalUser(input + requestOrigin)
  tx: client_users + user_role_assignments + role.assigned           (sin cambio)
  si created:
    origin = resolveInvitationOrigin({ kind:'greenhouse_portal', requestOrigin })
      error → recorder(failed, 'origin_unavailable'); result.delivery.status='failed'   (NO se envía a otro entorno)
    token = generateToken(...); storeToken(...)                       (sin cambio; token_id = sourceEventId)
    delivery = deliverInvitationEmail({ emailType:'invitation', url: `${origin}/auth/accept-invite?token=…`, sourceEntity:'client_users', sourceEventId: token_id })
    recorder(delivery)  → client_users.invitation_delivery_* + outbox delivery_failed si aplica
  result: { …, delivery: { mode:'system', status, attempts, recipientMasked, errorCode }, emailSent: status !== 'failed' }
```

### Lo que NO cambia

- `acceptExternalInvitation`, `issueExternalInvitation`, `resendExternalInvitation`, `revealExternalInvitationToken` y la lane delegada: intactos; sólo `delivery.ts` se vuelve consumer fino.
- `/api/account/accept-invite`: intacto (valida + consume token + contraseña).
- `client_users.email_undeliverable` (flag de la persona) sigue siendo escrito por el webhook; el estado por invitación es adicional, no lo reemplaza.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (primitive + emisor como consumer, sin cambio de comportamiento) → Slice 2 (migración additive + portal detrás de flag OFF) → Slice 3 (rotación + rebote + señal) → Slice 4 (staging con flag ON → producción).
- La migración del Slice 2 se aplica ANTES del deploy que lee las columnas (expand antes del deploy), en la instancia compartida.
- El Slice 1 NO se mergea si algún test de TASK-1837 cambió de assert: el refactor del emisor tiene que ser invisible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El refactor del emisor altera la URL o el resultado de entrega ya verificados en staging | identity | low | Tests de TASK-1837 intactos como gate; smoke read-only antes/después; sin flag nuevo en el emisor | `identity.external_invitation.undelivered` |
| El portal resuelve un origen equivocado (allowlist incompleta, header `Host` manipulado) | identity | medium | Allowlist cerrada en código; `origin_unavailable` ⇒ `failed` sin enviar; test de contrato con env var apuntando a producción y request de staging | `identity.client_portal_invitation.undelivered` (failed con `origin_unavailable`) |
| Con el flag ON, `emailSent` cambia de semántica para un consumer legacy | identity | low | `emailSent` se conserva como derivado de `delivery.status`; test de paridad flag OFF byte-idéntico | no signal — emerge en tests |
| Rotación deja a la persona sin ningún token válido (falla entre `used=true` y el nuevo INSERT) | identity | low | Rotación en una sola transacción con `FOR UPDATE`; test de fallo a mitad | no signal — emerge en tests |
| La proyección generalizada pierde el scope de idempotencia y re-procesa rebotes | outbox | low | `name` y `scope` del handler conservados; test del despacho; recorder idempotente por `sourceEventId` + estado | `sync.outbox.dead_letter` |
| Migración registrada sin ejecutar (pre-up-marker) | migration | low | Bloque DO con RAISE EXCEPTION; SELECT `information_schema` post-apply; `pnpm migration-marker-gate` | no signal — emerge en el verify |
| Deploy del ops-worker no incluye la proyección generalizada | cron | medium | Verificar que el metafile del worker incluya el módulo; readback de la revisión activa antes de prender el flag en Vercel | `sync.outbox.unpublished_lag` no aplica; verificar en logs del handler (`bounced:`/`skip:`) |

### Feature flags / cutover

- `CLIENT_PORTAL_INVITATION_DELIVERY_PRIMITIVE_ENABLED` (nuevo; default `false`; runtime **Vercel únicamente** — es donde emiten `portal-users/invite` y `resend-onboarding`): OFF ⇒ camino actual del portal byte-idéntico; ON ⇒ origen por registro + `delivery_*` + rotación. Fila en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. Revert: flag a `false` + redeploy (< 5 min).
- La proyección de rebote generalizada y el recorder del portal NO llevan flag (mismo criterio que TASK-1837: sólo actúan sobre entregas que existen y correlacionan); corren en el ops-worker con el próximo deploy.
- El emisor no recibe flag nuevo: el Slice 1 es refactor sin cambio de comportamiento (sus flags `EXTERNAL_INVITATION_*` siguen gobernando).
- `GREENHOUSE_PORTAL_ORIGIN` (knob no-flag, fallback B) por entorno en Vercel; documentado en el ledger como knob.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR (el emisor vuelve a su `delivery.ts` original; tests idénticos) | < 10 min + redeploy | si |
| Slice 2 | Flag OFF + redeploy Vercel; columnas additive permanecen (inertes) | < 5 min | si |
| Slice 3 | Flag OFF detiene rotación/recorder desde el portal; la proyección sigue pero no encuentra `source_event_id` de portal ⇒ `skip`; revert PR si hace falta | < 5 min | si |
| Slice 4 | Flag OFF en producción; docs revertidas | < 5 min | si |

### Production verification sequence

1. Slice 1 en develop: `pnpm test src/lib/identity/external-access` verde sin editar asserts; `pnpm identity:external-access:smoke` read-only igual que antes; deploy staging; emitir una invitación del emisor → URL y `delivery` idénticos a la evidencia de TASK-1837.
2. `pnpm pg:connect:migrate` (instancia compartida) + verify de 4 columnas y 2 CHECK; `pnpm db:generate-types`.
3. Deploy con flag OFF → invitación del portal en staging se comporta igual que hoy (test de paridad + verificación manual del correo).
4. Flag ON en staging → invitación real a casilla controlada → correo con URL `https://dev-greenhouse.efeoncepro.com/auth/accept-invite?token=…` → activación en staging OK (ISSUE-084 cerrado en staging) → `client_users.invitation_delivery_status='sent'`, `email_deliveries.source_event_id` poblado.
5. Rebote forzado (`bounced@resend.dev`) → ops-worker → `invitation_delivery_status='bounced'` + señal `identity.client_portal_invitation.undelivered` ok→warning.
6. Reenvío → token anterior `used=true`; `validateToken` lo rechaza; cuarto reenvío ⇒ 429.
7. Negativo: request con `Host` fuera de la allowlist y sin `GREENHOUSE_PORTAL_ORIGIN` ⇒ invitación `failed` con `origin_unavailable`, ningún correo enviado.
8. Producción: flag ON tras 24 h de staging sin anomalías; readback `vercel env ls`; una invitación real supervisada; señales 24 h.

### Out-of-band coordination required

- `GREENHOUSE_PORTAL_ORIGIN` por entorno en Vercel (staging y producción) como fallback B.
- Aplicación de la migración en la instancia compartida (dev/staging/prod) con confirmación del operador.
- Redeploy del ops-worker (control plane) para la proyección generalizada antes de prender el flag en Vercel.
- Aviso a People/Account de que el reenvío del portal ahora invalida el enlace anterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/identity/invitation-delivery/**` con `resolveInvitationOrigin`, `deliverInvitationEmail`, `InvitationDeliveryLifecycle` y el registro de recorders; `contract.ts` no importa nada server-only.
- [ ] `src/lib/identity/external-access/delivery.ts` consume la primitive y **todos** los tests de TASK-1837 (`delivery.test.ts`, `commands.test.ts`, `route.test.ts`, projection test) pasan sin editar asserts; `pnpm identity:external-access:smoke` read-only reporta lo mismo que antes del cambio.
- [ ] Un test de contrato demuestra, para AMBOS consumers, que con `NEXT_PUBLIC_APP_URL` apuntando a producción y una request de staging la URL generada es la de staging; `grep -rn "NEXT_PUBLIC_APP_URL" src/lib/client-onboarding src/lib/identity` devuelve cero.
- [ ] Un origen no allowlisted sin `GREENHOUSE_PORTAL_ORIGIN` produce `delivery.status='failed'` con `errorCode='origin_unavailable'` y ningún `sendEmail` (test).
- [ ] Migración additive aplicada y verificada por `information_schema.columns` (4 columnas en `client_users`) y `pg_constraint` (CHECK de estado y de attempts); bloque DO anti pre-up-marker presente; `pnpm migration-marker-gate` verde.
- [ ] Con `CLIENT_PORTAL_INVITATION_DELIVERY_PRIMITIVE_ENABLED=false`, `inviteClientPortalUser` produce exactamente el mismo resultado y la misma URL que hoy (test de paridad); la fila del flag existe en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Con el flag ON, `InviteClientPortalUserResult.delivery` tiene el shape `{ mode, status, attempts, recipientMasked, errorCode }` y `emailSent === (status !== 'failed')`; `client_users.invitation_delivery_*` refleja el resultado en la misma transacción que el outbox `identity.client_portal_invitation.delivery_failed` cuando falla.
- [ ] `resendClientPortalInvitation` rota: el token anterior queda `used=true` en la misma transacción que emite el nuevo; `validateToken` lo rechaza (test); cuarto reenvío ⇒ `rate_limited` 429; `resend-onboarding` es un adapter sin lógica propia.
- [ ] La proyección `external_invitation_delivery_bounced` despacha por `email_type` a un registro con al menos dos recorders (`external_access_invitation`, `invitation`), conserva su `name` y scope, y un rebote de `invitation` deja `client_users.invitation_delivery_status='bounced'` (staging con `bounced@resend.dev`).
- [ ] `durableSensitiveSource` conserva `source_event_id=<token_id>` para `email_type='invitation'` (test) y `email_deliveries` lo muestra poblado en staging.
- [ ] Señal `identity.client_portal_invitation.undelivered` registrada y visible en `/admin/operations`; observada encendiéndose (ok→warning) en staging tras el rebote forzado.
- [ ] Ningún token en claro en `outbox_events`, `external_identity_audit_log`, `email_deliveries` ni logs (grep sobre fixtures de test + revisión de la evidencia).
- [ ] `/auth/accept-invite`, `/i/<token>`, `auth_mode`, `identity_profiles` y `client_users.email_undeliverable` no cambian (diff limitado a los `Files owned`).
- [ ] Evidencia viva fechada en `docs/audits/`: invitación del portal desde staging aceptada en staging (ISSUE-084 cerrado ahí), rebote, reenvío; `## Delta` en TASK-1012 (criterios supersedidos con fecha), TASK-1837 y TASK-1838; invariantes en `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`; doc funcional y manual en `docs/documentation/identity/` y `docs/manual-de-uso/identity/`.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm local:check`; `pnpm test src/lib/identity src/lib/client-onboarding src/lib/sync/projections src/lib/email src/lib/reliability`.
- `pnpm task:lint --task TASK-1839`; `pnpm migration-marker-gate`; `pnpm flags:audit --strict --no-vercel`; `pnpm docs:closure-check`.
- `pnpm pg:connect:migrate` + `pnpm pg:connect:shell` para el verify de columnas/CHECK; `pnpm db:generate-types`.
- `pnpm identity:external-access:smoke` (read-only) antes y después del Slice 1: salida idéntica.
- Staging: `pnpm staging:request POST /api/admin/clients/<org>/lifecycle/portal-users/invite '{…}'` con flag ON → correo real a casilla controlada; rebote forzado; reenvío; lectura de `client_users.invitation_delivery_*` y `email_deliveries.source_event_id`.
- `[downstream-verified: client-portal-invitation-delivery]` en el último commit del Slice 4 con lo verificado.
- `pnpm test` completo + `pnpm build` (con autorización del operador) antes de mover a `complete/`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1012 recibió `## Delta` con sus criterios tildados o supersedidos con fecha y pasa a `complete` o queda con el alcance residual escrito (decisión del operador).
- [ ] `greenhouse-documentation-governor` y `greenhouse-qa-release-auditor` ejecutados; si falta la verificación viva en staging/producción, el estado es `code complete, rollout pendiente`.

## Follow-ups

- Pantalla de estado de invitaciones del portal para People/Account (hoy sólo la señal), si la señal se enciende con frecuencia.
- Extender la primitive a otros correos con enlace de un solo uso (magic link del portal, verificación de correo) si su ciclo de vida lo pide.
- Retirar `NEXT_PUBLIC_APP_URL` de los usos restantes del repo (fuera de invitaciones) con una auditoría propia.
- Contract de `emailSent` (dejar sólo `delivery`) un release después de que todos los consumers lean `delivery`.

## Open Questions

- ¿El epic correcto es `EPIC-044` (la primitive nace del emisor y TASK-1834 la hereda) o el epic de TASK-1012 (`EPIC-CLIENT-360`)? Se dejó `EPIC-044` porque el SoT de la primitive es TASK-1837 y el dominio es `identity`; cambiar el campo no altera el alcance.
- ¿Opción A (request origin allowlisted) es suficiente sola, o `GREENHOUSE_PORTAL_ORIGIN` debe existir siempre como fallback para crons/workers que inviten sin request? La task propone A+B; TASK-1012 decide.
- ¿El tope por actor/hora del portal reusa la constante del emisor (20) o el portal, operado por Efeonce, no necesita tope? Propuesta: reusar la constante con razón escrita.
