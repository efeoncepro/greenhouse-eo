# Auth + Rooms: preparación de producción controlada

Coordinador: Codex Auth; peer Rooms «Mira el epic de rooms». Goal autorizado por Julio25Oct,
incluye infraestructura/deploy y un correo real a `jreyes@efeoncepro.com`. No clientes ni ampliación general.
Inicio observado de preparación:2026-10-25T21:54:34Z. Estado: **preparación cloud parcial; no deploy ni envío**.

## Cambios aplicados y verificados

| Operación | Evidencia | Límite |
|---|---|---|
| Migraciones1834/2067 |`MIGRATE_SKIP_TYPES=true pnpm pg:connect:migrate`, exit0; dry-run previo sólo esas dos. Ambas markers con literal UTC22:06:33.813079; seis tablas y dos funciones presentes |Base compartida; no equivale a código servido. Se omitió regeneración automática de tipos; implementación usa queries/ports tipados explícitos |
| ACL nuevas |Readback separado: owner greenhouse_ops; app SELECT/INSERT/UPDATE true y DELETE false; GC SECURITY DEFINER con search_path fijo; EXECUTE runtime true/PUBLIC false |No elimina permisos amplios preexistentes del login; finding en preflight |
| Mail config |`auth_server_rooms_invitation_otp.enabled=false`; magic-link existente permanece true |Ningún correo nuevo enviado |
| Registro RP |CLI canónica: `efeonce-rp-rooms-production`, product rooms, único callback `https://efeonce-rooms.vercel.app/auth/callback`; hash comparado en memoria con credencial emitida |Registro active no enciende flujo; flags issuer aún ausentes/OFF; sin nuevas personas/grants |
| Secretos |`rooms-production-auth-client-secret` y `auth-server-rooms-invitation-otp-hmac`, versión1 ENABLED; réplicas us-east4; comparación exacta y scalar clean en memoria |No montados en runtimes nuevos aún. Archivos locales exclusivos0600 eliminados tras verificar |
| IAM |HMAC: secretAccessor sólo añadido a SA `auth-server@efeonce-group.iam.gserviceaccount.com` en ese secreto |SA Rooms y acceso al client secret los coordina2069; issuer guarda hash y no necesita ese secreto |
| Runtime preservado |Readback independiente Auth00165-kn4/100%, flags/client/origin nuevos ausentes |No sirve todavía V4, fixes ni foundation nuevos |
| GC existente |Cloud Logging20:13/21:13UTC: locked=true,dryRun=false,batch500, once counts0, cutoff30d |No acredita extensiones nuevas: worker anterior no las invoca |

Referencias para montaje (no payload):

- `projects/efeonce-group/secrets/rooms-production-auth-client-secret/versions/1` — consumidor Rooms.
- `projects/efeonce-group/secrets/auth-server-rooms-invitation-otp-hmac/versions/1` — emisor Auth.
- `rooms-production-invitation-authority-token` — creación por peer Rooms, pendiente; compartido sólo resolver/issuer.

No crear `rooms.efeonce.org` por inferencia. Origen canary acordado: `https://efeonce-rooms.vercel.app`.
Los comandos con credenciales se ejecutaron sin imprimir valores; nunca incorporar secretos/OTP/URL invitación al reporte.

## Seguridad y publicación pendientes

La [evaluación propia](../auth-server/AUTH_SERVER_RED_TEAM_2026-10-25.md) y
[revisión separada](../auth-server/2026-10-25-independent-protocol-review.md) registran los fixes y límites.
CIMD/magic-link:192 pruebas locales separadas y TypeScript globalPASS; no se declara validación ofensiva
completa tras el bloqueo automático. SenderOTP exclusivo `acceso@mail.efeoncepro.com`; GET con credencial
de producción confirma mismo dominioverified, click/open trackingOFF. [Preflight completo](TASK-2067-production-preflight-2026-10-25.md).

Workflow now wires first-party/OTP/client/origin/secretrefs and compares configuration before skipping a
deploy; nine drift testsPASS. Shared IAM helper accepts pinned numeric versions; six testsPASS. These are
local changes until publication, not live behavior. Existing internal/multi-org settings remain intact.

Antes de ON/envío: terminar2068UI y2069adapter/DB/WIF/WAF, publicar código por release gobernado,
montar referencias exactas, verificar configuración durable y servida, aplicar cohort/contratos, ejecutar
canary único y revocación/rollback. El registro cliente y las migraciones no satisfacen esos gates.
Schedulerrotación, simulacro masivo y steady7d permanecen abiertos; runbooks preparados, sin falsa ejecución.
Privacidad técnicaV2 documentada sin declaración de cumplimiento ni contratación jurídica.
