# TASK-2066 — Rooms Tokenized Invitations and Email Code

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `2026-10-26: un correo inicial con enlace+código recibido y canjeado contra Rooms productivo; lectura de sala V3 e imagen, denegación de borrador/otra sala, replay y revocación verificados. Invitación revocada y sala archivada; flags web/Auth y correo OFF. Integración de la interfaz Claude Design, revisión de criterios de privacidad/concurrencia restantes y activación general separadas. No repetir el correo.`
- Rank: `Después del contrato TASK-2067; coordinar primitives de sesión/binding con TASK-2065 sin depender de su journey OIDC`
- Domain: `identity|platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; checkout compartido sin worktrees`

## Conciliación vigente — 2026-10-26

Entrega cloud y canary: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md); coordinación posterior: [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). El único correo ya recibido no se repite. Persisten como trabajo nuevo la integración del consumidor de Claude Design y sus gates; el disparo del Job ya no es un pendiente.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Implementar invitaciones Rooms con UN correo inicial que contiene enlace opaco y código temporal; el destinatario introduce el código EN Rooms y el backend lo verifica contra Efeonce ID por server-to-server. Rooms conserva invitación, expiración, redención idempotente y grant acotado a una sala; Efeonce ID autentica el correo. La aceptación no revela otras salas, no concede organización y no crea identidades por un email libre.

## Why This Task Exists

El permiso actual access.grant exige un principal ya existente. No hay token de invitación, destinatario confiable ni flujo para convertir prueba OTP en el grant previsto. Entregar un enlace directamente como bearer o copiar autenticación OTP en Rooms rompería el requisito del usuario y las fronteras Efeonce ID/Rooms.

## Goal

- Invitación versionada, revocable y expirable con token seguro; lectura inicial sólo después de destinatario verificado.
- Challenge server-to-server del issuer y prueba firmada ES256 vinculada a RP/transacción/invitación.
- Aceptación atómica, autoridad fresca, grant room-only y canary completo antes de cualquier activación externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md` — Accepted; contrato exacto de challenge, proof y sesión guest.
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md` — frontera OIDC interno/invitación guest.
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`.
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`.

Reglas obligatorias: token de enlace no es identidad ni grant; issuer posee OTP; Rooms sólo concede scope room autorizado; publicado no implica invitación. El plan consume el ADR OTP Accepted y formaliza sólo su delta consumidor de sesión/autoridad guest, sin inventar contrato issuer. Diseño temporal en `/tmp/rooms-invitation-discovery.md`, no fuente canónica durable; esta task conserva sus invariantes exigibles.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/ui/flows/rooms-v1.md` como frontera de experiencia; no autoriza UI en esta task.
- Skills `software-architect-2026`, `greenhouse-secret-hygiene`; TASK-2067 debe aplicar contrato vigente de `sendEmail`/Resend del issuer.

## Dependencies & Impact

### Depends on

- TASK-2065: coordinación para reutilizar primitives de sesión/binding cuando sean compatibles. Su OIDC interno es independiente: no requiere authorize/callback visible para que el invitado introduzca OTP. Seguir su archivo por ID si cambia lifecycle.
- `docs/tasks/in-progress/TASK-2067-auth-invitation-email-otp.md` y `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`: contrato Accepted prepare/verify, proof ES256 y entrega única.
- TASK-1834 foundation issuer; TASK-2060 authority/commands Rooms; contenido publicado compatible V1/V2 bajo TASK-2062.

### Blocks / Impacts

- Unidad ui-ux posterior de captura OTP EN Rooms, invitación/recovery y administración, dependiente de este backend y contrato TASK-2067; sin autorizar nuevas pantallas aquí.
- Activación externa exige DB cloud, RP/secret por entorno, remitente/entrega verificados y canary controlado; no se infiere de demo Vercel.
- No altera consentimiento MCP, enrolamiento corporativo, login Greenhouse ni passwords del issuer.

### Files owned

- Nuevos `../efeonce-rooms/src/domain/invitation-contracts.ts` y `src/server/invitations/**`.
- Migración additive nueva bajo `../efeonce-rooms/migrations/`; tests dedicados `tests/*invitation*.test.ts` y script smoke propio.
- Adapters HTTP nuevos de invitación y registro de operaciones/CLI Rooms; integración a primitives de sesión/binding bajo coordinación TASK-2065, sin acoplar redención al callback OIDC.
- Plan y contrato ADR de invitaciones bajo docs de arquitectura Rooms; no editar issuer, TASK-2062 ni UI runtime.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- `../efeonce-rooms/src/server/commands/execute.ts`: access.grant/revoke con autoridad actual, expiry y capability ceiling.
- `src/server/persistence/authority.ts`: principal/membership/grants releídos; externos cliente sin grant de organización.
- `migrations/1792962301842_rooms-foundation.sql`: grants, audit/outbox/receipts; sin invitaciones ni OTP.
- ADR Rooms-first especifica sesión por producto; issuer tiene magic link y todavía no OTP por correo según discovery del peer.

### Gap

- Sin invitation aggregate/token digest/redemption ni vínculo verificable a destinatario/challenge.
- Sin contrato de evidencia OTP que permita sólo el binding/grant previsto.
- Sin UI invitado ni mailer Rooms; lo segundo se conserva deliberadamente: entrega será del issuer reutilizando Resend.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms/src/server/invitations` con adapter s2s al issuer, dentro del runtime existente.
- Future candidate home: `remain-shared`
- Boundary: commands/readers y captura consumer Rooms; challenge/verificación/entrega única en TASK-2067 issuer; sesión Rooms con procedencia OTP explícita, reuse2065 si compatible.
- Server/browser split: browser captura token/código sólo para transmisión mínima; no persistirlos ni registrarlos. Prueba, correo, secrets y stores sólo servidor; DTO público sin recipient ni contenido.
- Build impact: sin SDK mailer nuevo; cliente HTTP aislado al contrato issuer, sin importar su runtime al browser o a Rooms.
- Extraction blocker: aceptación transaccional con grants Rooms y prueba de un uso del issuer; sin topología nueva.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: invitación/grant Rooms; prueba de identidad/OTP y entrega gobernada del issuer.
- Consumidores afectados: HTTP/CLI y futura UI Rooms; gateway MCP sólo como adapter futuro, sin delegación implícita.
- Runtime target: `local` integrado; staging/canary reales antes de activación productiva.

### Contract surface

- Contrato existente a respetar: can/loadAuthority/access.grant, expiración y roles; primitives sesión/binding2065 cuando compatibles; issuer TASK-2067.
- Contrato nuevo o modificado: invite/getInvitation/reissue/revoke/start/redeem; challenge s2s confiable y proof ES256 RP/transaction-bound.
- Backward compatibility: additive y gated; v1/v2 publicadas, grants previos y /demo conservados.
- Full API parity: primitives y schemas únicos, registry de operaciones y HTTP/CLI; no reglas en click handler. No anunciar tools MCP desplegadas; adapter gateway posterior con owner EPIC-052 y condición de retiro contrato estable/certificado.

### Data model and invariants

- Entidades/tablas/views afectadas: propuestas rooms.invitations, rooms.invitation_attempts y registro de redención/prueba; reutiliza grants/audit/outbox/receipts. Nombres finales fijados en plan.
- Invariantes que no se pueden romper:
  - invitationId/roomId/recipientBindingRef/expiry/capacidades pertenecen a la transacción confiable, nunca input libre del browser.
  - Token opaco con digest en reposo; no es bearer de sala; GET no consume, acepta ni envía códigos.
  - Prueba OTP de otro destinatario, RP, transacción o invitación no concede acceso; recipientReference autorizado y proof exacto, sin crear identidad global por email-match.
  - Grant exclusivamente room; externo cliente, sólo capabilities permitidas al invitador, sin workspace/notes/edit/publish/descarga implícita.
  - Revocar invitación aceptada revoca grant asociado por command explícito atómico; no afecta grants ajenos de otro origen.
- Write-target allowlist: grants SQL mínimos y boundary tests para nuevas tablas; sesión guest sólo sala, sin crear profile/source-link/membership/rol global ni ampliar writes sobre identidad.
- Tenant/space boundary: organización derivada de invitación server-side; can sobre room y destinatario exactos; lectura nunca enumera sala por token inválido.
- Idempotency/concurrency: create/reissue/revoke con clave y revisión; prepare requestId idempotente sin segundo envío. Verify consume OTP una vez; Rooms consume jti UNIQUE y versión/invitación en transacción de sesión guest. Reissue invalida token/challenge anteriores y no reinicia presupuesto. No persistir proof para retry.
- Audit/outbox/history: eventos de emisión, aceptación, reemisión y revocación con IDs/correlación; sin token, OTP, correo, URL secreta ni proveedor raw.

### Migration, backfill and rollout

- Migration posture: additive; tablas, índices de unicidad, expiry y privilegios; test SQL real y rollback local.
- Default state: invitations OFF independiente de auth/OTP; ausencia de issuer prueba válida deniega.
- Backfill plan: ninguno; grants existentes no se reinterpretan como invitaciones. Fixture controlada local sin contactos reales.
- Rollback path: gates OFF + revoke de invitaciones/grants run-owned; preserva auditoría; migración down sólo DB aislada sin datos durables.
- External coordination: TASK-2067 OTP/entrega única; TASK-2065 sesión/binding compartible; RP por entorno, Resend existente/remitente exacto/tracking OFF. Sin nuevas cuentas o API keys.

### Security and access

- Auth/access gate: invite/reissue/revoke requieren access.manage vigente y scope exacto; redeem exige evidencia issuer verificada + invitación elegible + autoridad permitida al emisor revalidada según ADR final.
- Sensitive data posture: correo sólo dominio autorizado/administración, nunca DTO anónimo. Token raw sólo entrega inicial autorizada; redacción de URL en toda cadena; secretos sólo servidor.
- Error contract: respuesta pública indistinguible invalid/expired/revoked; estados internos tipados con correlación. Renovación opcional explícita con respuesta genérica sin enumerar email, cuenta o binding; no existe solicitud inicial adicional de código.
- Abuse/rate-limit posture: issuer controla código/intent limits/cooldown; Rooms controla start/redeem/token abuse; límites coordinados sin duplicar autenticador, sin bloqueo global a partir de input anónimo.

### Runtime evidence

- Local checks: lint/typecheck/tests/build, contract tests de adapters y negativas cross-room/cross-RP.
- DB/runtime checks: SQL real acepta/revoca/concurrencia/expiry/rollback; readback del grant exacto y ausencia de ampliación.
- Integration checks: issuer real aislado genera/verifica OTP s2s + prueba + estado vigente; correo inicial único controlado sólo con destinatario y acción/test definidos; evidencia proveedor separada del accepted.
- Reliability signals/logs: rooms.invitation.redeem_denied, rooms.invitation.proof_replay, rooms.invitation.delivery_pending, rooms.invitation.revoked; métricas sin correo/token.
- Production verification sequence: gates y canary descritos abajo; no se acredita activación con respuestas genéricas o mocks.

### Acceptance criteria additions

- [x] Source of truth y contrato s2s se congelan con owner issuer; no autenticador/mail sender paralelo.
- [x] Invariantes de tenant/scope/prueba/idempotencia y concurrencia están cubiertas por SQL/HTTP real.
- [x] Migración additive, rollback y privilegios mínimos verificados.
- [x] Evidencia distingue solicitud de envío, entrega, OTP, grant y lectura; sin secretos.

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

### Slice 1 — Contrato, ADR y almacenamiento

- Formalizar ADR de invitación ligada a OTP issuer y política de destinatario/binding previo; registrar operaciones, schemas y errores.
- Crear aggregate/token digest/expiry/revision y stores transaccionales, sin emitir correos ni activar tráfico.

### Slice 2 — Commands y prueba confiable

- Invite/read/reissue/revoke y start/redeem con autoridad granular; transacción segura de grant previsto.
- Integrar challenge s2s/proof de TASK-2067 y sesión Rooms de procedencia OTP; reutilizar stores de TASK-2065 sin fabricar handle/IDtoken OIDC; no duplicar verificación OTP.
- HTTP/CLI sobre primitives, estados sanitizados y protección de tokens.

### Slice 3 — Certificación y handoff UI

- Ejercitar replays, carreras, aislamiento, expiry y revocación de principio a fin.
- Publicar contrato para unidad UI posterior: estados/retryAt/recovery, sin páginas, formularios ni correo directo Rooms.

## Out of Scope

- OTP issuer, nueva cuenta/API key Resend, SDK mailer Rooms, magic link como sustituto del código confirmado.
- Crear personas/memberships/roles por email libre, grant organización o acceso por token sin identidad.
- UI invitado/administrador, editor, invitaciones masivas, analítica comercial o consentimiento MCP.
- DB cloud, activación de tráfico real y envío a destinatarios no definidos por acción o canary autorizado.

## Detailed Spec

La última instrucción de Julio prevalece: UN correo inicial incluye enlace tokenizado de roomId y código temporal generado por el sistema. El destinatario abre Rooms y copia/pega el código en Rooms. No hay solicitud inicial «Enviar código», segundo correo inicial ni redirect visible a pantalla OTP del issuer. Enlace+código por el mismo canal NO se presenta como 2FA/MFA. Renovación por vencimiento es opcional, explícita y gobernada.

La invitación nace de actor autorizado y fija roomId, initialEditionId publicado, recipientBindingRef, capabilities y expiresAt. Primer retorno conserva edición inicial; si no existe/no es accesible no sustituye otra silenciosamente. El grant room-scoped permite ediciones publicadas según política; consumer UI lo explica.

Contrato ADR OTP Accepted: prepare recibe invitationId, invitationVersion, recipientReference, requestId y requesterKey backend normalizado; cliente derivado de client-auth. Issuer llama InvitationAuthority.resolve de Rooms para obtener estado/expiry/recipient/enlace canónicos. Origen exacto allowlisted, sin email/URL/asunto/HTML arbitrarios. Issuer genera código uniforme de seis dígitos, MAC protegido y envía UN correo vía InvitationOtpMailer/sendEmail/Resend con persistence.mode=token_sensitive; safeContext sólo locale/tiempo. OTP/enlace sólo en memoria durante entrega, jamás ledger/retry payload. Receipt expone challengeId/expiry/accepted|failed; resultado incierto invalida challenge, no reenvío automático.

POST de redención Rooms recibe código y contexto opaco y transmite verify al issuer por s2s autenticado con challengeId/nonce y bindings exactos, sin logging/persistencia del código. Issuer revalida autoridad antes de consumir y antes de firmar. Devuelve proof ES256 con typ=rooms-invitation-proof+jwt, iss/aud/iat/exp/jti, invitationId/version, recipientReference, nonce y amr=[email_otp], sin email/profile/roles/org/gv. Rooms valida JWKS/firma/typ/issuer/audiencia/tiempos/nonce y referencias; consume jti UNIQUE y versión/invitación y crea sesión guest de esa sala en una transacción. No crea SSO/profile/source-link/membership/rol global; autoridad guest exclusivamente de invitación vigente. TASK-2065 OIDC interno es independiente: no fabricar IDtoken/access handle OIDC ni reutilizar introspection de ese carril para guest.

Política inicial Accepted de TASK-2067: seis dígitos, TTL 10 min acotado por invitación, proof máximo 120 s, cooldown 60 s; 3 envíos/invitación/hora, 10/destinatario, 50/requester, 500/RP; 5 verificaciones/invitación/hora compartidas entre reenvíos/versiones y límites adicionales requester/RP. Son valores issuer-owned, no defaults UI independientes. Rooms agrega límites de redeem/renovación sin duplicar OTP store. Verify nunca devuelve dos proofs del mismo código. Si falla firma o creación de sesión después de consumir OTP, permanece consumido: nueva emisión explícita bajo mismos límites, sin persistir proof/rawOTP para recuperación. Receipt de sesión confirmada sólo consultable en contexto autorizado Rooms. Renovación permitida rota token+challenge e invalida anteriores y genera UN correo combinado nuevo; no se activa automáticamente ni revive revocación. Respuesta pública genérica no enumera correo/cuenta/binding. retryAt servidor. Delivery accepted/sent/delivered distintos; tracking OFF y remitente exacto validado. Ningún correo se envía durante planificación.

Paths candidatos sólo de transporte: `/api/v1/invitations/resolve`, `/api/v1/invitations/redeem` y `/api/v1/invitations/renew` más adapters administrativos API/CLI. `/invite` con input de código y `/rooms/[roomId]` visuales pertenecen a task posterior. Evaluar fragmento transferido por POST same-origin y limpiado de history frente a query redacted end-to-end; congelar decisión con evidencia de no filtración. GET nunca acepta ni envía códigos. Reutilizar protección CSRF/origin/store compatible con TASK-2065, sin callback OIDC obligatorio para invitado.

Si revocan durante challenge o aceptación, no crear grant. Revocación posterior se comprueba por request y retorno a foreground mediante consumer futuro; no snapshots ViewTransition entre identidades/revocación. No prometer retirar bytes/capturas ya entregados ni invalidación inmediata de medios con tickets fuera de la política medida.

## Rollout Plan & Risk Matrix

Foundation additive OFF. La autorización de construir no convierte una invitación o correo propuesto en envío realizado.

### Slice ordering hard rule

Contrato2067 + ADR + decisión de reutilización de stores de TASK-2065 → migración/gates → commands/prueba s2s → SQL/concurrencia → integración issuer real → consumer UI y canary de release. No activar invitación antes de que proof/revoke funcionen.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token filtrado abre contenido | privacidad | medium | token no identidad + OTP + redacción integral | proof_replay/redeem_denied |
| Email-match aprovisiona otra persona | identidad | medium | recipient handle y subjectbinding confiables | redeem_denied |
| Reintentos duplican grant | Rooms | medium | idempotencia/unique/transacción | duplicate receipt test |
| Invitación revocada sigue autorizando | acceso | medium | asociación grant exacta y revoke atómico | revoked + deny canary |
| 202 oculta correo fallido | delivery | medium | evidencia proveedor y estados separados | delivery_pending |
| Spam por GET/scanner | correo | medium | GET inerte, emisión administrada única y renovación explícita limitada | challenge rate-limit |

### Feature flags / cutover

Flag propuesto ROOMS_INVITATIONS_ENABLED default false, independiente del consumidor OIDC y método OTP issuer. OFF impide nuevas aceptaciones; revocación administrativa de existentes debe seguir disponible. Activación sólo tras contrato congelado, evidencia y unidad de release.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | gates OFF; down sólo fixture aislada; retener ledger real | medido en smoke | sí local |
| 2 | denegar nuevos start/redeem; revocar invitaciones/grants run-owned exactos | medido en smoke | parcial: correo recibido no se retira |
| 3 | retirar canary propio conservando auditoría; no tocar otros destinatarios/RPs | medido en canary | sí sobre acceso futuro |

### Production verification sequence

1. Contrato/proof issuer congelados; suites y SQL real aislado, concurrencia/expiry/revoke verdes.
2. Configuración RP/remitente/Resend/TTL/gates verificada sin exponer secretos; DBcloud y UI consumer en unidades propias.
3. Dark deploy OFF y comprobar demo/401 y absence de envíos.
4. Canary explícito con destinatario controlado: invite→UN correo con enlace+código→abrir Rooms→pegar OTP en Rooms→s2s verify/redeem→read published→deny otra sala→revoke→deny con sesión vigente.
5. Comprobar token ausente de logs/analytics/referrers; medir rollback y límites de tickets; ampliar cohorte sólo con evidencia.

### Out-of-band coordination required

Peer Identity TASK-2067/1834, sesión Rooms2065 y dueño Resend/remitente. Reutilizar credencial existente por referencias gobernadas; no crear cuenta/clave ni operar bandejas por inferencia. La acción o test de correo define destinatario y alcance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria


- [x] Canary interno real de identidad, un correo y una imagen: acceso válido, denegaciones y revocación, con flags restaurados OFF. Evidencia: [canary2026-10-26](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). No acredita UI ni activación general.
- [x] ADR Accepted prepare/verify se consume fielmente; proof ES256 exacto con jti UNIQUE/nonce/aud/typ/expiry, sin autenticador alterno.
- [x] Emisión inicial produce UN correo con enlace tokenizado y código; sin envío inicial separado, sin primer CTA de solicitud OTP ni verificación visible fuera de Rooms. Evidencia: recibo canary26Oct, una entrega Resend recibida en Outlook con enlace+código y una redención; no repetir.
- [x] Contrato permite capturar código EN Rooms y verificar sólo por issuer s2s; no autenticador alterno ni afirmación 2FA/MFA de mismo canal.
- [x] GET/scanner no consume token, concede grant ni envía correo; enlace solo no revela contenido/correo/organización.
- [ ] Invalid/expired/revoked públicos son indistinguibles; renovación opcional no enumera correo por body/status/tiempo y nunca revive una invitación revocada.
- [x] Prueba incorrecta/vencida/repetida/otro RP/otro subject/otra transacción no acepta ni auto-provisiona por email.
- [x] Invitador, invitación y destinatario se revalidan; grant sólo room/client/capabilities permitidas y nunca organización/workspace/notas.
- [x] Aceptación concurrente consume jti/versión una vez y crea sesión guest acotada; sin profile/membership/rol global. OTP consumido no recupera proof: nueva emisión gobernada si falló el resto.
- [x] Revocación durante y después de aceptación deniega; grant asociado revocado sin afectar grants ajenos; expiry probada con reloj servidor.
- [x] Readback llega sólo a edición inicial publicada autorizada; fallback demo/otra sala prohibido. Evidencia: canary real salaV3+imagen200, borrador y otro espacio404; no fallback de demo.
- [ ] Token/código/prueba/URL secreta no aparecen en logs/analytics/browser persistente; secreto digest y sesión OTP de producto correctos, sin fabricar token OIDC.
- [x] Entrega usa issuer sendEmail/Resend existente, remitente exacto y tracking OFF; accepted no se declara delivered; sin mailer/key nuevos. Evidencia: remitente exacto y trackingOFF comprobados; recepción Outlook observada, no inferida de accepted.
- [x] Authority.resolve confiable revalida invitación/versión/recipient/expiry/RP; URL fuera de origen denegada y ningún caller libre decide destinatario.
- [x] Migración/rollback SQL y integración issuer real con canary controlado verificados; mocks o 401 anónimos no acreditan éxito. Evidencia: migracionescloud/readback, canary real y cierre OFF26Oct; down sólo en clones, sin revertir schema vivo.
- [x] OFF default, UI consumer y cloud pendientes documentados; task no afirma experiencia humana/productiva completa.

## Verification

Refuerzo por solicitud de seguridad del operador: [auditoría del token](../../audits/rooms/2026-10-25-invitation-token-hardening.md). Techo24h create/reissue y cuotas por invitación/realm/acción; presupuesto global anterior retirado.144testsPASS0skip, lint/types/buildPASS. WAF por IP confiable y controles browser/correo son gates de activación pendientes.

Continuación4805c6d: sesión vigente autoriza el comando; principal/membresía/grants persistidos fijan
vigencia delegada, con techo24h.151testsPASS0skip y lint/types/buildPASS. Propuesta concreta del perímetro:
[`ROOMS_VERCEL_INVITATION_PERIMETER_V1.md`](../../operations/ROOMS_VERCEL_INVITATION_PERIMETER_V1.md), sin activación.

Evidencia del corte local: [auditoría de invitaciones](../../audits/rooms/2026-10-25-tokenized-invitations.md).
Los criterios tildados se acreditan mediante SQL/HTTP y el harness de dos runtimes, no por envío real.
Los pendientes de browser persistente, pantalla humana, remitente/tracking y canary externo permanecen
sin tildar. TASK-2068 posee el consumer UI; no se da esta task por cerrada con esos límites ambiguos.


- En Rooms: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y suites dedicadas de invitación.
- SQL real de emisión/aceptación/revoke/expiry/concurrencia con readback; comando exacto registrado en plan.
- Integración real TASK-2067 + sesión Rooms de procedencia OTP y canary controlado sólo bajo acción/test definido.
- En Greenhouse: `pnpm task:lint --task TASK-2066`; revisar links de dependencias y ADR final.

## Closing Protocol

- [ ] Lifecycle/carpeta/Status real sincronizados; criterios tildados con evidencia, pendientes explícitos.
- [ ] Registry/README/Handoff/changelog coordinados por raíz; no sobrescribir trabajo concurrente.
- [ ] Chequeo cruzado2065/2067/1834/2062 y asignación del consumer UI antes de rollout humano.
- [ ] Canary/secret/handles propios retirados; auditoría sanitizada conservada y límites de revocación documentados.

## Follow-ups

- Unidad ui-ux Rooms para administración/invitado/recovery: depende de TASK-2066/TASK-2067; requisitos 320px/200%, teclado, OTP single-input EN Rooms, pegar/autofill, cooldown de renovación accesible y reducedmotion. No pantalla OTP issuer en este journey.
- Unit cloud/release: RP y DB gobernados, deploy/cohorte/canary; no asumidos por demo existente.
- Adapter MCP de invitaciones sólo tras política y contrato certificados; owner EPIC-052, sin tools ficticias en catálogo actual.
