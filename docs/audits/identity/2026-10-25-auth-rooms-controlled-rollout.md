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
- `rooms-production-invitation-authority-token` versión1 — creado por peer Rooms; root añadió secretAccessor al SA Auth. Compartido sólo resolver/issuer.

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

## Configuración durable y contención del batch

Seis variables GitHub repo-level registradas y leídas de vuelta: flags first-party/OTP false,
RP `efeonce-rp-rooms-production`, origen `https://efeonce-rooms.vercel.app` y dos referencias de secretos
versionadas `:1`. Las variables internas/multi-org preexistentes se conservan y coinciden con runtime.

El batch pendiente también contiene el fix de correos de eventos `2a971d768`. Para impedir envíos ajenos
al canary autorizado, `services/ops-worker/deploy.sh` prepara `GROWTH_EVENT_EMAILS_ENABLED=false` por defecto.
Runtime previo ON no prueba correos efectivos; OFF servido queda pendiente del deploy y readback.
El scheduler puede seguir invocando: el handler OFF retorna antes de consultar datos o enviar correo.

`pnpm local:check` detectó errores de lint en dos scripts gráficos previamente trackeados.
Se corrigen mecánicamente sin regenerar piezas; gates globales pendientes de repetir.

Owner arquitectónico de la contención: `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`; cambia sólo el valor
durable de un flag existente, sin nuevo contrato ni ADR. Vercel metadata: flag de eventos ausente
en todos los targets listados del proyecto Greenhouse (default del lector OFF); no se leyeron payloads.

Fullsuite encontró mirror del watchdog Auth incompleto: faltaban workflow y script de config drift.
Se añaden exactamente esos dos paths al reader; revisión arquitectónica separada confirma que restringe
los skips sin debilitar el gate de paridad. Retest focal:13PASS en2suites. Fullsuite previo:21598PASS,1fallo (ese mirror),383omitidos;
no se presentan omitidos como PASS. Lint global encontró21errores de formato en5scripts del blog heredados,
además de los2scripts gráficos ya corregidos. Los5scriptsblog quedaron con AST idéntico a HEAD,
node --check y lint focal PASS; nueva pasada global en curso. TypeScript global PASS tras patch del mirror.

## Gate previo a publicación

Lint global final:0 errores/26advertencias heredadas. Esa corrida local:check alcanzó TypeScript y falló
por un import estático al repo hermano en el tooling nuevo Rooms. Peer corrigió la frontera en
`d4a1d16e0`; TypeScript global Greenhouse con12GiB y TypeScript Rooms PASS, sin excluir archivos ni
ocultar tipos. Las demás etapas de local:check pasaron; no se declara exit0 de aquella corrida fallida.
Suite general21598PASS/383skip, único fallo de mirror corregido y13retestPASS; no repetición global por
cambio acotado ya verificado. Build/CI/smoke de promoción aún pendientes.

[Recibo del operador](2026-10-25-release-operator-authority.json): roles/entitlements canónicos vivos
confirman capacidad de ejecutar release y excepción de batch. La autorización humana del goal y el
ejecutor GitHub son entidades separadas; no autoriza ignorar CI/smoke ni convierte un warning en PASS.

## Minimización de evidencia pública

Al verificar la visibilidad PUBLIC del repo, se detectó que dos recibos nuevos publicaban identificadores
y vínculos internos del operador innecesarios para una auditoría pública. Se conservan íntegros en `.auth/`
ignorada con0600 y los JSON versionados quedan como resúmenes sin IDs ni relaciones personales, con digest
del original. El helper de bootstrap lee exclusivamente el recibo privado y mantiene el pin del payload;
prueba `--snapshot` PASS sin emitir el contenido al log. No había contraseñas, OTP ni tokens en los recibos.
La corrección elimina esos datos del árbol actual; las versiones anteriores siguen en el historial Git.
No se realizó force-push ni reescritura de historial y no se afirma borrado histórico.
