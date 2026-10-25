# TASK-2066 — invitaciones con enlace y código, evidencia local

25-10-2026. Runtime commit `8308077`. Backend local, feature OFF. No correo real, proveedor live, DB cloud ni nuevo despliegue.
La demo pública conserva bd4b802. TASK-2066 permanece in-progress; TASK-2068 posee la pantalla de
código, gestión y lectura guest. El epic no está completo.

## Contrato implementado

Cada invitación vincula roomId, invitationId, versión, destinatario autorizado, permisos y vencimiento.
El correo inicial contiene enlace `/invite#token=<opaco>` y código de seis dígitos generado por Efeonce ID.
Abrir el enlace e iniciar la transacción no envían otro correo. La renovación es explícita.
Rooms no almacena ni genera OTP; prepare/verify son server-to-server al issuer TASK-2067. Proof ES256
con typ, issuer, audiencia, clientId, binding, nonce, jti y expiración exactos; jti se consume una vez.

Token/correo cifrados AES-GCM en almacenamiento; búsquedas por digest. Sesiones guest opacas,
cookies HttpOnly/SameSiteLax/Secure en HTTPS y autoridad fresca por solicitud. Scope room/client,
sólo lectura publicada y evidencia delegada expresamente. Sin personas/memberships/roles globales.
La cookie interna presente tiene prioridad: una sesión interna inválida nunca cae a guest.

Commands create/reissue/revoke usan revisión, idempotencia, audit/outbox/receipt atómicos. La entrega
ocurre después del commit y fuera de locks SQL. Pending conserva requestId; respuesta tardía no rota
nonce ni retrocede delivery aceptado. Reissue/revoke invalidan versiones y sesiones previas.

HTTP: `/api/invitations/{start,verify,resend,session,logout}` y resolver interno
`/api/internal/auth/invitation-authority/resolve`, protegido con secreto de servicio independiente,
audience exacto, sin cookie/origin ni redirects. JSON acotado, origin exacto, errores sanitizados/no-store.
API/CLI comparten las operaciones `invitations.create`, `.reissue`, `.revoke` y listado por room.
CLI: `pnpm rooms invitations --organization ID --room ID`. No bearer de negocio fabricado.
List/revoke administrativos pueden operar con la entrada OFF; create/reissue respetan el flag.

## Verificación automatizada

`pnpm lint`, `pnpm lint:negative`, `pnpm typecheck`, `pnpm build` y `pnpm test`: PASS; **132/132**, cero skips.
La matriz incluye firma/claims/nonce/jti, foreign room/RP/issuer/origin, permisos, doble cookie,
expiry, revoke concurrente, proof replay, audit rollback, fallos de entrega, pending retry,
OTP vencido con renovación explícita y races de respuesta tardía.

Hallazgo corregido en revisión independiente: entradas aleatorias podían crear buckets ilimitados.
Ahora cada acción tiene un budget duradero por RP antes de lookup (start500/h, verify3000/h,
resend500/h), y el contador individual se crea sólo tras lookup válido. Regresión comprueba
40 entradas desconocidas → un bucket por acción; 12 concurrentes al último cupo → uno admitido,
11 limitados; reconexión mantiene presupuesto y rollover reinicia correctamente. Sin llamadas al issuer.
No se confía en IP/headers arbitrarios del navegador.

## Integración real entre runtimes

`pnpm invitation:integration --issuer-fixture <PRIVATE_FIXTURE_JSON>`: PASS.
Issuer19336: runtime OTP, PostgreSQL aislado, firma ES256/JWKS y resolver HTTP reales.
Rooms19335: HTTP/servicio/reader/resolvePrincipal reales y PostgreSQL local. Chrome usa cookies reales.
Sólo autoridad inicial sintética y buzón en memoria son fixtures; no se llamó a Resend.

Observado: create + retry produce **un único mensaje en memoria con código y enlace**; token fragment
no viaja en el GET; start no envía correo; antes del código room401; código incorrecto400;
código correcto200 y room200; otras salas/organizaciones y draft404; replay404;
revoke corta sesión a401 y enlace a404. Sin PII, tokens ni notas internas en proyección pública.
La página del harness es un contenedor de transporte: no acredita pantalla UX ni aceptación visual.

Cleanup: invitación run-owned revocada, buzón RAM limpiado, browser y servidor Rooms cerrados.
Peer Auth retiró harnesses19334/19336, bases temporales, archivos0600 y puertos PG54443/56150.
No se conservan links, OTP, cookies ni credenciales en esta auditoría.

## PostgreSQL

Migraciones CLI: `1792964574644_rooms-invitations.sql` y
`1792964731337_rooms-invitation-issuer-binding.sql`. La segunda es additive; no se editó la aplicada.
Los registros anteriores sin binding issuer/origin quedan inelegibles, sin backfill inferido.

Snapshot consistente: **19 tablas, 7.754 filas, 19 hashes iguales** después de restore. ACL, constraints
y triggers coinciden. Down de ambas y up en clon desechable: 14 tablas anteriores conservan hash;
sólo las cinco tablas nuevas se vaciaron en el clon. Runtime no puede modificar/borrar proofs (42501),
count cero denegado por CHECK (23514), sesión con invitación inexistente denegada por FK (23503).
Origen sin reinicio ni down; clone y dump eliminados. Script QA temporal y resultado sanitizado
estuvieron en `/tmp/rooms-2066-recovery-qa.mjs` y `/tmp/rooms-2066-recovery-result.json`.

## Límites y siguiente entrega

El adapter issuer usa `sendEmail` existente con `token_sensitive`; no hay SDK/key Resend nuevos en Rooms.
Accepted no demuestra delivered ni lectura. Remitente, tracking OFF, href exacto y correo real siguen
como gate de rollout controlado. El flag permanece OFF y la demo desplegada no incorpora este acceso.

TASK-2068 debe limpiar el fragmento al capturarlo, soportar reload/recovery con estado seguro de
transacción, pegar/autofill, expiración/reenvío y errores accesibles, y mostrar contenido publicado real.
Falta acordar DTO seguro de gestión y política UX para coexistencia de sesión interna/guest.
No se tildan esos criterios como si el backend demostrara la experiencia completa.
