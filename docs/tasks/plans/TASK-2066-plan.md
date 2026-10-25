# TASK-2066 — invitación con enlace y código en un correo

25-10-2026. Julio pidió preparar el flujo completo y aclaró su forma final: UN correo inicial contiene enlace
y código; la persona pega el código EN Rooms. Resend existente es el proveedor. No solicita otro correo al
abrir ni se presenta como MFA. Goal, implementación local y subagentes ya autorizados.

## Discovery y decisión

Fuente Accepted: `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md` (issuer2067).
Rooms tiene ID estable, can y grants persistidos, pero no invitaciones.2065 entrega OIDC interno con binding;
una prueba OTP de invitación NO es IDtoken ni sesión SSO. Se conservan dos procedencias de sesión separadas.
El issuer posee OTP, verificación y único envío por sendEmail/Resend; Rooms no instala mailer ni recibe código
en prepare. Sólo recibe el código introducido por la persona para transmitirlo por S2Sverify.

## Delta de autoridad local

Guest pertenece sólo a Rooms. No se crea identidad/profile/source-link/MCP en Auth ni memberships globales.
Para mantener can y readers únicos, `rooms.invitation_sessions` es la autoridad local de un principal externo
virtual de rol client; su grant deriva exclusivamente de invitación/version activa y capacidades autorizadas.
No se insertan personas/memberships/grants genéricos por email. La invitación es el agregado dueño del grant
previsto; la sesión lo activa después de consumir proof. Revocar invitación invalida todas sus sesiones de esa
versión, sin tocar grants ajenos. Cada lectura relee estado y autoridad del invitador, no sólo la cookie.

El adapter `loadAuthority` conserva camino interno actual y resuelve explícitamente principals guest con ID
propio ligado al digest de sesión, nunca por campos enviados por el navegador. Sesión guest da rooms.read
sobre publicado; evidence.read sólo si fue delegado expresamente y sigue permitido al invitador. Ningún
workspace, notes, edit, publish, create, manage ni grant organización. Recurso room/edition debe coincidir.
Roles de operador/administrador no se asignan al invitado. Cookies internas y guest no unen autoridad; el
resolver elige un carril inequívoco y nunca usa un guest como fallback de una cookie interna inválida.

## Contratos y stores

- Flag ROOMS_INVITATIONS_ENABLED=false por defecto. Config issuer/RP/origin canónicos y claves independientes
  de invitaciones; mismo cliente registrado first-party pero permiso OTP explícito. No exige flagOIDCbrowserON.
- Commands `invitations.create`, `invitations.reissue`, `invitations.revoke`; reader listInvitations para
  access.read. create/reissue/revoke requieren access.manage y capacidad delegada sobre sala publicada,
  vigencia limitada a autoridad del invitador, revisión esperada e idempotencia. Recipient se fija en command
  autorizado, no en browser start/verify. Resend público sólo a ese destinatario previamente fijado.
- Entidades nuevas: rooms.invitations, rooms.invitation_transactions, rooms.invitation_sessions,
  rooms.invitation_proofs (jti UNIQUE), rooms.invitation_rate_limits; recibos/audit/outbox existentes cuando
  cambia agregado de sala. No reescribir snapshots ni modificar schema2065 aplicado.
- Invitación: org/room/id/version, owner principal, recipientReference opaca, recipient email cifrado,
  token256bits con digest y ciphertext AESGCM para entrega, expiry/status/capabilities, challengeId y estado
  accepted/pending/failed de entrega. No registrar secretos en receipts/audit/outbox. Cadena de contexto enAAD.
- Link canónico `${origin}/invite#token=...`: token en fragmento, fuera de requests/logs iniciales. Futuro UI
  captura en memoria y limpia history antes de POSTstart. El roomID estable se conserva en agregado, no es secreto.
- `start({token})`: lookup digest, valida vigencia/publicación/autoridad, crea transacción ligada a cookie
  browser opaca/nonce; devuelve estado code_required y expiry, sin correo ni contenido. GET no envía ni consume.
- `verify({code}, transactionCookie)`: transacción server-side aporta invitación/version/recipient/challenge/nonce;
  transmite aissuer, verifica proof ES256 typ=rooms-invitation-proof+jwt con iss/aud/exp≤120s/iat/amr y todos
  los bindings exactos. Una transacción consume jti UNIQUE + transaction/invitación vigentes y crea sesiónguest.
  Nunca admitir proof externo desde HTTPbrowser. Código y proof no se persisten ni se devuelven.
- Sesióncookie opaca host-onlyHttpOnlySameSiteLaxSecure, digest enDB; TTL corto limitado por invitación/autoridad,
  revalidación cada petición. HTTPloopback sólo fixture explícita. Caducidad produce reentrada controlada.
- `resend(transactionCookie)`: requestId nuevo controlado, cooldown/límites compartidosissuer; nueva generación
  invalida código anterior. Respuesta genérica, no permite cambiar email. No refresca presupuesto por versión.
- Prepare externo ocurre después de commit de invitación, sin mantener locksSQL durante red. requestId durable
  garantiza un envío aunque respuesta se pierda; retry mismoID obtiene receipt issuer. Estado incierto no se
  llama delivered. Ningún GET, polling automático ni recuperación dispara email.

## Frontera S2S acordada con Auth

Issuer POST `/auth/invitations/email-otp/prepare` y `/verify` con Basic RP confidencial y allowlist OTP.
prepare: invitationId, invitationVersion:string, recipientReference, requestId>=16, requesterKey>=16.
verify: mismos bindings + requesterKey/challengeId/code6/nonce>=32. No cookies/origin ni URL/email de browser.

Rooms POST `/api/internal/auth/invitation-authority/resolve` autenticado Bearer token de servicio dedicado
(distinto RPsecret) y `X-Efeonce-Audience` igual origin Rooms. Body clientId/invitationId/version/recipientReference.
Respuesta exacta active,email,invitationUrl,roomLabel,bindings,expiresAt(epochms); sólo registros autorizados.
URL fija, HTTPS excepto harness; timeout3s, redirects:error, cache:no-store, JSON≤8KiB. Falta o inconsistencia
falla cerrado. Token servicio base64url≥32 y clave cifrado sólo servidor, no capturarlos en artefactos.

OTPissuer entrega prooffirmado. Rooms usa jose6.2.13/JWKS configurado; no firma identidad propia. Recipient y
link viven sólo en memoria servidor al resolver para mailer; Resend/token_sensitive se ejecuta en issuer2067.

## API y CLI

Root adapters públicos POST /api/invitations/start, /verify, /resend; GET /api/invitations/session; POST logout.
Origin exacto, body limitado, errores sanitizados, referrer no-referrer, sin cache ni logging de cuerpo.
Cookies de transacción/guest distintas de2065. Futura UI consume primitives, no lógica privada en click handlers.
Commands por POST /api/v1/commands y CLIexecute existente; nueva lectura por room/invitations y CLIinvitations.
No imprimir enlace/código por CLI. Catálogo operaciones explica qué está implementado y no anuncia MCPdesplegado.

## Ownership y secuencia

1. Root registra task, plan, ADRdelta, hook y cambioscapability antescódigo.
2. rooms_ui (ahora backend de invitaciones): domain/invitation-contracts.ts; server/invitations/**, migraciónCLI,
   pruebas básicas propias y exports temprano. No UIJSX, no issuer, no authority.ts/session.ts ni rutas/registry.
3. Root: adaptersHTTP/CLI/registry y wiring loadAuthority/session con funciones nuevas, docs y gates.
4. rooms_qa: tests/invitation*.test.ts, contraSQLreal y firmas; independientes de implementación.
5. PeerAuth:2067 issuer, HTTPauthorityadapter y únicoResendmailer; harnessreal coordinación.
6. Verificar create/delivery/start/verify/read/revoke conissuer+PGreales aislados y mailer memoria; noemailreal.
7. Lint/types/tests/build, restore/rollbackclon, securityreview y artefactos; preparar UI con estados firmes.

## Riesgos, rollout y cierre

Replays, código cruzado, expiración duranteverify, revocación mientrasrespuesta en vuelo, delivery tardío,
redeem tras cambio de versión y permisos del invitador revocados: todos deben negar ampliación. Ningún
secreto en assertionerror/log/URLservidor, y sin descripción raw del proveedor. Rate limits persistidos y
presupuestosissuer no se reinician por resend. Auditoría transaccional falla→rollback antes conceder sesión.

No cloud/envSecrets/correos reales por este buildlocal. ON sólo en harness; producción conservaOFF/demo.
Rollback apaga flag y revoca sesionesrun-owned; down de migración sólo clon descartable, nunca DBactiva.
Cierre exige evidencia local integrada; UI premium de inputcode/administración es siguienteunidad ui-ux,
con wireframe/motion/GVC antesactivaciónhumana. Goal completo permanece abierto, no sustituido por esta unidad.
