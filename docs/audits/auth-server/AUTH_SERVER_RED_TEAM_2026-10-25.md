# Auth + Rooms — evaluación ofensiva reproducible, 2026-10-25

## Alcance y estado

Evaluación propia autorizada por Julio, ejecutada por auth_discovery; revisión separada inicial de
login_discovery y refutación por caso completada localmente por `auth_refutation` el 28-10. Consumer Rooms
conserva su peer. No proveedor externo, API pagadas ni afirmación de certificación
comercial independiente. Los agentes comparten proveedor; la independencia es de revisión/ownership.

Estado: 20 casos backend ejecutados localmente y refutados por separado; 18 tienen PASS local y dos
conservan cobertura parcial (B15/B20). B10 recibió un retest integrado sintético el 28-10;
B18 sumó el recorrido guest de navegador Rooms con 51 comprobaciones locales PASS.
El retest B10 posterior ya canjea y verifica un token MCP de sólo lectura; el harness HTTP
comparte una cookie de sesión respaldada por PostgreSQL. Rooms completó además el recorrido
mixto en navegador en `e0edf1e`, con recibo saneado en `develop@4b840dc80`.
No cierre completo TASK-1833. El canary productivo único
del 26-10 y el correo recibido tienen [evidencia separada](../rooms/2026-10-26-auth-rooms-real-image-canary.md).
Una [prueba posterior de recuperación](2026-10-28-recovery-atomicity-local.md) encontró y corrigió
la revocación parcial sin audit cuando fallaba su INSERT: red/green en PostgreSQL desechable, 2 PASS
tras el fix y retest 2 PASS con migraciones TASK-1830 reales bajo `greenhouse_app`. Es un hallazgo
adicional resuelto localmente, no un B21 ni ensayo de staging.
La matriz original revisó el checkout compartido `develop`, cambios1834/2067/1833; el fix de
recuperación vive sólo en el candidato local desde `main`. Nunca se enviaron ataques o ráfagas
contra SQL compartido ni correo externo. Los controles lectura HTTP pública y metadata GCP se describen en
[plan1833](../../tasks/plans/TASK-1833-plan.md), no se cuentan como explotación autenticada.

## Reproducción

```sh
pnpm exec vitest run src/lib/auth-server/first-party/protocol.test.ts src/lib/auth-server/email-otp src/lib/auth-server/oauth/oauth-flow.test.ts
pnpm exec vitest run src/lib/reliability/queries/auth-server-signals.test.ts src/lib/reliability/queries/auth-oauth-abuse-signals.test.ts src/lib/reliability/queries/auth-person-signals.test.ts
python3 scripts/qa/verify-auth-first-party-local-pg.py
python3 scripts/qa/verify-auth-first-party-local-pg.py --mcp-smoke --port 19437
```

Corrida18:59:10 America/Santiago: **122 PASS/3 SQL omitidos**, siete archivos pasados y uno omitido.
Los SQL omitidos de OTP no se cuentan en esa corrida; tienen evidencia separada del runner2067 en su
[dossier](../identity/TASK-2067-email-otp-local-qa-2026-10-25.md).
Señales17 PASS; PostgreSQL first-party aislado7 PASS (incluye clasificaciónSQL de eventos y GC), sin cloud.

La orden inicial incluía además `oauth/cimd.test.ts`, que aún no existía; Vitest no ejecutó ese filtro.
No se acredita esa ejecución inexistente. Posteriormente se creó el archivo de regresiones defensivas descrito
abajo y se ejecutó explícitamente. Evaluación ofensiva completa SSRF/DNS conserva cobertura pendiente.

## Matriz de ataques

Cada PASS significa que el ataque sintético indicado falló cerrado en el fixture/PG local y su control válido
funcionó cuando el test lo contempla; no significa explotación real ni assurance global completado.
La refutación local por caso está al final de este dossier; los parciales y el rollout siguen abiertos.

| ID | Amenaza y estímulo reproducible | Oráculo/control y resultado local | Fuente |
|---|---|---|---|
| B01 | Downgrade de PKCE a plain, verificador incorrecto y código expirado |Authorize/token 400; sin emisión; control S256 válido emite ES256 |`first-party/protocol.test.ts`, parametrizados y denies changed identity |
| B02 | Código A presentado por cliente B con secret B |B 400 y A conserva el derecho a intercambiar el mismo código 200 |`isolates a second relying party` |
| B03 | ID token/handle A usados ante B |Verificador de audiencia B rechaza; introspection B false; revoke B no revoca A; segundo RP tiene roundtrip propio |mismo test B02 |
| B04 | Replay concurrente durante signer pausado |Segundo canje 400; invalidación evita inserción tardía y primer canje tampoco entrega handle vivo |`revokes on code replay`; PG consumeonce/locks |
| B05 | Scope/resource MCP sobre RP first-party |400 y store de códigos vacío; no grant/consent MCP |`denies incompatible authorization`; minimal claims |
| B06 | ContextoRooms/return forjado, transacción de login consumida |Context resolver null en redirect ajeno; tx consumida replay 400 |`stores a trusted login continuation` |
| B07 | prompt=login/max_age=0 con sesión previa del mismo segundo |Redirige a login hasta hash de sesión nuevo; max_age vuelve a evaluarse |`requires a changed session`; `rechecks max_age` |
| B08 | Identidad cambiada o revocada después de authorize |Token/introspection deny; PG profile/link/session/environment/corporate evidence/enrollment revocados deniegan |protocol identity; `local-pg.test.ts` |
| B09 | Clase RP forgery/prototype en registro |`__proto__` y registro contradictorio rechazados; no sobrescribe ni secreto en auditoría |`registration is immutable/idempotent` + admin-input tests en dossier local |
| B10 | Sustitución de scope/client en consentimiento MCP y scopes de escritura sin step-up |Deny sin crear consentimiento; grant válido exige consentimiento activo, step-up mantiene vigencia |`oauth-flow.test.ts` rejects consent substitution/never issues token |
| B11 | Refresh MCP reusado/code replay |Se revoca familia; refresh conserva auth_time/contexto y no eleva autoridad |DCR flow y context-bound refresh en `oauth-flow.test.ts` |
| B12 | Fuerza bruta OTP y reset mediantechallenge/version/requestId |Cinco intentos bloquean aun rotando; cooldown de reenvío y budgets sobreviven idempotency key nueva |`email-otp/core.test.ts` blocks after five/enforces budgets |
| B13 | Doble prepare o doble verificación concurrente |Una entrega; pending no autentica; un único proof; replay deny |core onlyoneconcurrent/pendingdelivery; SQL 2067 separado |
| B14 | OTP RP/version/recipient cambiado, revocación después de consumir |Deny, nueva autoridad consultada antes de firmar; cambio de correo sin versión no sirve |core mismatchedRP/changedrecipient/rechecksrevocation |
| B15 | SSRF/redirect/body chunked excesivo en authority y link alterado |Sólo origen/path del servidor fijo, credencial dedicada, límites de 8192 B/3 s; fragmento canónico exacto, fallos cerrados |`authority-http.test.ts`, `invitation-url.test.ts` |
| B16 | Usar cookie/Origin/Bearer/Basic malformado en OTP confidencial |401 antes de authority; RP suspendido/retirado deniega |`runtime.test.ts` |
| B17 | Caída de audit inicial seguida de retry idempotente |Ambos unavailable; mailer una vez; vuelve accepted al recuperar audit sin reenviar |core auditoutage regression |
| B18 | Falla del signer o delivery incierta |Código quemado/proof no emitido; no retry automático del envío; ningún SSO global |core signerfailure/unknownmailer; claimsassertions |
| B19 | Eventos maliciosos en señales: payload con PII o success falso |SQL sólo agregados rechazados, success excluido; error de lectura≠cero |`local-pg.test.ts` mapsrealaudit; signals tests |
| B20 | Extensión GC ausente, lock ocupado, retención>30d |Skip explícito, no borra antes de retención; acotado a 500 y audit append-only |maintenance 10 PASS previo; PG 7 en corrida actual |

## Hallazgos y retests incorporados

| Hallazgo | Corrección y prueba | Estado |
|---|---|---|
| RP B podía consumir códigoA antes de validar client |Store consume exige clientId bajo lock; A intercambia después del intento B |Corregido; B02/PG PASS |
| promptlogin podía reutilizar auth_time del mismo segundo |Transacción guarda previousSessionHash y requiere cambio de sesión; max_age0 siempre fuerza |Corregido; B07 PASS |
| Replay podía preceder inserción tardía de handle |Invalidación de código y lock durante insert; replay revoca existentes |Corregido; B04PASS |
| Retry prepare OTP eludía audit caído |Todas las respuestas idempotentes pasan audited; no doble envío |Repro antes: unavailable→accepted/auditcalls1; corregido B17 PASS |
| Basic malformado OTP se traducía a 503 |Captura de error protocolario deauth→401 |Corregido por raíz; B16PASS |
| Señal MCP code_reuse ignoraba nuevo evento token/reason first-party |Reader específico agregado + fixture SQL real |Corregido; B19PASS |

Prueba de sensibilidad de B19: se sustituyó temporalmente sólo el predicadoSQL
`first_party_code_reuse` por un valor que no coincide; el test PG real de clasificación falló.
El archivo se restauró en `finally`. Resultado redactado en `/tmp/task1833-signal-mutation-test.txt`;
no es artefacto durable ni contiene secretos. Prueba verde previa7 PASS y posterior focal/SQL se conservan en comandos.

## Observabilidad y límites

Se integran en `getAuthServerSignals` (consumido por `get-reliability-overview`) cinco señales:
`auth.keys.rotation_overdue`, `auth.first_party.code_reuse_detected`,
`auth.invitation_otp.rate_limited`, `auth.invitation_otp.delivery_failed`, `auth.invitation_otp.unavailable`.
Antigüedad de activación >80 d produce warning; fecha futura/malformada o cero/múltiples active produce error.
Las señales operativas usan ventana de 24 h y métricas agregadas, nunca email/link/code/proof/clientId raw.

Un ledger que no pudo escribir no puede demostrar su propia indisponibilidad: `unavailable` representa
sólo eventos registrados. HTTP503/KMS, health y logs y cobertura operativa completan esa observación; cero eventos
no acredita cero fallos. No se tocó almacenamiento de credenciales ni se imprimieron secretos.

Pendientes para aceptación final: flujo integrado de sesión first-party/MCP, casos gateway roles/Entra con owner
1831, validación ofensiva SSRF/DNS detenida por control automático, readback del nuevo código Login V4, UI Rooms
pendiente de entrega, simulacros y ventanas temporales exigidas. El canary y correo únicos ya se completaron;
no se repiten. No se ocultan los gaps tras el conteo PASS.


## Remediación defensiva CIMD y revisión de magic link

La ampliación de validación ofensiva CIMD fue detenida por el control automático de seguridad
(`possible cybersecurity risk`) de la subtarea revisora. El operador fue informado por el coordinador.
No se repitió por otro agente, proveedor o canal. La ampliación gateway/roles-sin-scope tampoco se ejecutó
en esta pasada. Lo siguiente es remediación defensiva del código propio y regresión unitaria sin red;
no se presenta como pentest completo ni como exfiltración demostrada.

Revisión source de `oauth/cimd.ts`, corroborada por el coordinador antes del parche:

| Observación | Corrección local | Alcance de evidencia |
|---|---|---|
| DNS se validaba antes de `fetch(hostname)`, que podía resolver de nuevo |`https.request` usa un `lookup` limitado a la IP previamente validada, socket nuevo `agent:false`, hostname/SNI originales y verificación TLS activa |Contrato de transporte inspeccionado y mock unitario; no explotación de red. Severidad HIGH provisional por separación entre validación/conexión, condicionada por resolución variable y certificado válido del hostname |
| Comparación textual IPv6 omitía formas equivalentes y partes de rangos locales |`node:net.BlockList` compara direcciones binarias; IPv6 global unicast fuera rangos especiales, sin mapped/scoped; IPv4 conserva los rangos rechazados existentes |Casos parametrizados sin sockets. No se afirma que todo IPv4 especial esté vetado: rangos de documentación siguen admitidos por fixtures |
| Plazo de descarga comenzaba después de DNS |Deadline único 3 s desde antes de resolver hasta completar cuerpo, carrera explícita y AbortSignal al socket |Reloj simulado prueba DNS pendiente y presupuesto compartido DNS/transporte. DNS de Node ya iniciado no es cancelable, pero su resultado tardío no abre socket |

Se usa sólo la primera IP aprobada. Si falla, la resolución CIMD falla cerrada; no se reintenta con un DNS nuevo.
HTTPS de Node no sigue redirects. Los cuerpos se limitan a 64 KiB durante streaming y también en el puerto
inyectado. No hay nueva dependencia. Las respuestas no-200 se destruyen con listener de error instalado.

```sh
pnpm exec vitest run src/lib/auth-server/oauth/cimd.test.ts src/lib/auth-server/oauth/oauth-flow.test.ts
pnpm exec vitest run src/lib/auth-server/persons/return-to-security.test.ts src/lib/auth-server/persons/person-auth-flow.test.ts
pnpm exec eslint src/lib/auth-server/oauth/cimd.ts src/lib/auth-server/oauth/cimd.test.ts
```

CIMD/OAuth: **64 PASS**, 19:03:03 America/Santiago; HTTPS siempre sustituido por mock, sin red.
Magic link: **128 PASS**, 19:03:27; ejecutados por auth_discovery sobre corrección de login_discovery.
La lectura independiente confirmó rechazo de controles/backslashes/destinos que al normalizar cambian
origen o comienzan `//`, conservación de parámetros OAuth válidos y revalidación al consumir el
`record.returnTo` persistido. El test de registro legado contaminado conserva autenticación y cookie,
pero no emite Location externo. Es revisión separada de autoría, no independencia comercial.

El coordinador revisó el parche CIMD y pidió instalar el listener antes de destruir respuestas no-200;
la sugerencia está incorporada. El coordinador reportó revisión defensiva de correctness y corrida
independiente de cuatro suites CIMD/OAuth/magic-link/persons: **192 PASS**, además de **TypeScript global PASS**.
El fixture de magic link recibió `internalLoginEnabled: () => false` antes de ese chequeo.
Esta refutación corresponde a correctness y regresiones locales; no sustituye la validación ofensiva bloqueada.

## Refutación separada por caso — 2026-10-28

`auth_refutation` revisó los oráculos y tests existentes sin editar el árbol ni acceder a red ofensiva,
staging, producción, secretos o PII. No confirmó un hallazgo crítico/alto. Reprodujo 122 PASS/3 SQL omitidos
en la suite focal, 17 PASS de señales, 8 PASS de consentimiento/step-up, 10 PASS/2 live omitidos de mantenimiento,
7 PASS en PostgreSQL efímero y el smoke OTP con PG efímero PASS. Los omitidos no se cuentan como PASS.

| Caso | Veredicto de refutación local | Límite que permanece |
| --- | --- | --- |
| B01 | PASS: PKCE, verificador y expiración | Sin HTTP desplegado |
| B02 | PASS local/PG: B no consume código de A | Sin segundo RP productivo |
| B03 | PASS: audiencia, introspección y revocación por RP | Sin consumer desplegado nuevo |
| B04 | PASS local/PG: replay concurrente e inserción tardía | Sin carga contra SQL compartido |
| B05 | PASS: scope/resource MCP denegados en first-party | Sin flujo browser mixto |
| B06 | PASS: continuación confiable de un solo uso | Sin UI Rooms nueva |
| B07 | PASS: `prompt=login` y `max_age=0` requieren sesión nueva | Sin browser productivo nuevo |
| B08 | PASS local/PG: identidad/autoridad revalidadas | Sin revocación de cohorte ampliada |
| B09 | PASS local/PG: registro inmutable, `__proto__` y audit sin secret | Sin registro cloud nuevo |
| B10 | PASS local: Rooms y MCP comparten la misma cookie de sesión PostgreSQL; 16 comprobaciones MCP de navegador exigen consentimiento read explícito, bloquean write por step-up, canjean/verifican JWT sólo read y rechazan replay del código | Store OAuth MCP y grantsPort del harness sintéticos; sin dispatch gateway, MFA humana ni evidencia productiva |
| B11 | PASS: reuso revoca familia refresh y preserva contexto/`auth_time` | Sin nuevo token desplegado |
| B12 | PASS: cinco intentos y budgets OTP | Sin ráfagas contra SQL compartido |
| B13 | PASS local/PG: una entrega en memoria y proof de un uso | No repetir correo real |
| B14 | PASS: RP, versión, destinatario y autoridad revocada | Sin ampliación a clientes |
| B15 | **Parcial**: origen y enlace con mocks; redirect y cuerpo fragmentado con HTTP real en loopback, 22 tests PASS | SSRF/DNS fuera de loopback no demostrado; ampliación detenida por control automático |
| B16 | PASS: Basic malformado y RP suspendido fallan cerrado | Sin HTTP cloud nuevo |
| B17 | PASS: caída de audit y retry sin doble entrega | Mailer real no reensayado |
| B18 | **PASS local**: fallas signer/delivery, smoke HTTP+PG del issuer y [51 comprobaciones browser Rooms](../rooms/2026-10-28-b18-guest-without-internal-sso.md). OTP guest crea sólo cookie HttpOnly de invitado; sesión interna 401, `prompt=none` → `login_required` sin code | No acredita el runtime desplegado ni una UI nueva de Rooms |
| B19 | PASS local/PG: señales agregadas sin PII ni éxitos | Steady productivo pendiente |
| B20 | **Parcial**: límites/retención/extensiones PASS local/PG; GC base horario observado en producción el 28-10 | Extensiones first-party/OTP no servidas por la revisión activa del ops-worker; retención operativa de esas tablas no demostrada |

Readback B20 de sólo lectura, 2026-10-28T23:13Z: Cloud Scheduler
`ops-auth-ephemeral-gc` está `ENABLED`, `13 * * * *`, `America/Santiago`, con último intento
`23:13:03Z` al endpoint `/auth/ephemeral-gc`. El log de Scheduler informa HTTP 200; Cloud Logging del
ops-worker registra `auth_ephemeral_gc_completed` con `dryRun=false`, `locked=true`, `batchSize=500`,
cutoff de 30 días y once contadores base en cero. La revisión con 100% de tráfico es
`ops-worker-00787-7fd`, `GIT_SHA=ba15711d022cb0450e2e9d185e692d02631fc306`, con
`AUTH_SERVER_GC_ENABLED=true`. El `gc.ts` de ese SHA sólo devuelve `counts`; no tiene el campo
`extensions` del código local. HTTP 200 y conteos cero prueban ejecución del GC base, no limpieza ni
retención efectiva de códigos/handles first-party u OTP. No se ejecutó GC manual ni mutación cloud.

Delta local 28-10: el evento `auth_ephemeral_gc_completed` del `ops-worker` ahora incluye el campo
acotado `extensions` (`first_party` y `email_otp`: `ran`, `not_migrated`, `retention_mismatch` o
`lock_unavailable`) que devuelve el command canónico. Así una corrida futura podrá distinguir
helpers ejecutados de helpers omitidos sin depender del body que Scheduler descarta ni registrar PII.
GC focal 10 PASS, ESLint, TypeScript y los tres gates de worker PASS. **B20 sigue parcial**: esta
instrumentación es sólo local, las extensiones no están servidas por la revisión productiva leída.
La forma del evento sigue el ADR del emisor nativo y el control plane de reliability existentes;
no cambia autoridad, retención ni API.

Retest B15 local del 28-10: `authority-http.test.ts` usó dos servidores HTTP reales en
`127.0.0.1`. El origen configurado recibió una sola solicitud al path fijo con la credencial
dedicada; respondió 302 hacia el segundo servidor, que recibió cero solicitudes. El resolver
falló cerrado (`null`). Un segundo servidor entregó un JSON válido seguido de relleno fragmentado
que excede 8192 B: el resolver lo rechazó y aceptó después el control acotado. Suite focal
22 PASS, ESLint y TypeScript PASS. El límite se prueba además con `Response` sintética; el
ensayo de red demuestra el rechazo, sin aislar el límite del timeout como causa única. Este retest
verifica transporte en loopback, sin ejercer DNS, red externa ni la revisión productiva; B15 sigue parcial.

El retest B10 usa `src/lib/auth-server/first-party/protocol.test.ts` con un solo handler OAuth y la
misma identidad sintética para Rooms y un cliente MCP nuevo. Verifica código y canje first-party sin
crear consentimiento MCP; la lectura MCP pide consentimiento explícito antes de emitir código; la
escritura responde 403 con enlace de step-up y no crea grant ni código, incluso después de aprobar
sólo lectura. El retest posterior canjea el código MCP y verifica firma, audiencia, cliente y
scope `efeonce.mcp.read`, sin scope de escritura. `pnpm exec vitest run
src/lib/auth-server/first-party/protocol.test.ts --reporter=dot`: 19 PASS.

`python3 scripts/qa/verify-auth-first-party-local-pg.py --mcp-smoke --port 19437` pasó con
HTTP loopback, sesión first-party real en PostgreSQL, la misma cookie para Rooms y MCP, router
OAuth real, consentimiento explícito read y step-up write; canje MCP devolvió JWT read-only.
No hubo correo ni DB compartida. El store OAuth MCP y el grantsPort del harness son sintéticos;
ese smoke HTTP por sí solo no cubre navegador, persistencia MCP PostgreSQL ni dispatch gateway.
Rooms completó posteriormente el navegador real en rama local `codex/rooms-design-integration@e0edf1e`
contra fuentes Auth idénticas a `codex/auth-develop-integration-local@1136ac273`, con 16 checks MCP
y ocho grupos Rooms PASS. La misma cookie y BrowserContext sobrevivieron sin renovar sesión; read
exigió consentimiento, `prompt=none` devolvió `consent_required`, write quedó 403 por step-up
antes/después, el token ES256 tuvo sólo scope read y el replay de código fue denegado. ESLint y
TypeScript PASS. Recibo saneado: `develop@4b840dc80`,
`docs/audits/rooms/2026-10-28-b10-rooms-mcp-explicit-consent.{md,json}`. No se probó dispatch
del gateway, persistencia MCP PostgreSQL ni MFA humana; no cambia B15/B20 ni el release retenido.

Retest posterior B10: `python3 scripts/qa/verify-auth-first-party-local-pg.py --mcp-smoke
--mcp-pg --port 19438` PASS con `PostgresOAuthStore` y base efímera. Aplica la migración OAuth
TASK-1829 real y proyecta las columnas e índice de contexto TASK-1836 usados por este caso NULL;
no aplica el resto de TASK-1836. Comprueba que Rooms no deja filas MCP, que read crea una sola
fila de consentimiento y código, que el código queda consumido, que se persiste un access token
sólo read y que el replay devuelve `invalid_grant`; write sigue en 403 por step-up. La variante
anterior en memoria, OTP smoke y siete tests PG first-party también pasaron; TypeScript/ESLint
focal PASS. La autoridad MCP (`grantsPort`) sigue sintética. El browser con store MCP PG y el
dispatch gateway requieren evidencia separada; ninguna prueba aquí acredita producción.

Rooms completó después ese browser con `--mcp-pg` y ambas bases PostgreSQL desechables: 16 checks
MCP y ocho grupos Rooms PASS en `e0edf1e`, sin modificar fuentes Rooms. Readback SQL independiente:
un consentimiento read, un código consumido, un access token y un refresh token sólo read. El
recibo saneado está en `develop@8c41f5b95`,
`docs/audits/rooms/2026-10-28-b10-rooms-mcp-postgres.{md,json}`. Esto cierra el límite de
persistencia MCP local de B10; grants reales, contexto multiorganización completo, gateway,
MFA humana y producción siguen fuera.

El [probe Auth→gateway local](2026-10-28-auth-issued-token-gateway-local.md) tomó un token read
emitido por el issuer después de ese consentimiento y lo pasó al verificador y HTTP `/mcp` del
gateway `69423e1`: lectura 200 con un dispatch sintético, write 403 y binding negado 401 sin
dispatch adicional. El issuer HTTP exigió adaptar sólo la config del probe; el binding reader,
proveedor y grantsPort siguieron sintéticos. No acredita la configuración HTTPS ni la autoridad
productiva, pero ejercita el contrato de token real entre ambos runtimes locales.

El [retest B10 con reader real](2026-10-28-b10-real-grants-reader-local.md) añadió una
variante aislada del issuer: `--mcp-smoke --mcp-pg --mcp-authority --port 19446`
PASS. `createExternalAccessGrantsPort()` leyó binding, membership y `gv=7` desde
PostgreSQL efímero; tras revocar el binding, una nueva autorización MCP se negó
y el log registró `revoked`. La variante PG previa también PASS. Esquema y filas
de autoridad son proyección/fixtures locales; no acredita el binding reader del
gateway ni el recorrido cruzado completo.

El [probe cruzado posterior](2026-10-28-b10-real-binding-gateway-local.md) conectó el
resolver canónico del gateway a la ruta ecosystem real de Auth mediante adapter HTTP sólo
loopback: credencial de máquina ausente 401, binding sister-platform ausente 404,
status 200 con token read `gv=7`, write 403, binding externo revocado 401.
El despliegue de la ruta ecosystem y el proveedor quedaron fuera; no se convierte
este resultado en E2E completo ni en aprobación de release.

El retest B18 amplía `python3 scripts/qa/verify-auth-first-party-local-pg.py --otp-smoke --port 19436`:
PASS con HTTP loopback, PostgreSQL efímero, autoridad sintética y entrega sólo en memoria. Compara antes
y después las filas de sesiones, transacciones, códigos y handles first-party; verifica ausencia de
`Set-Cookie` en prepare/verify y que `prompt=none` sin cookie responde `login_required` antes y después.
El proof ES256 sigue acotado al RP, sin `sub`, y el replay se rechaza. La
[comprobación complementaria](../rooms/2026-10-28-b18-guest-without-internal-sso.md) en el navegador
de Rooms pasó 51 checks locales: cookie guest HttpOnly, ninguna cookie interna o del issuer,
`/api/auth/session` 401 y `prompt=none` → `login_required` sin code antes/después. No se envió correo.

Esta revisión cierra la **refutación local del catálogo** con resultados y límites por caso. No cierra la
evaluación completa, la cobertura bloqueada por auto-review, las pruebas gateway de TASK-1831, la rotación,
el simulacro, la privacidad aprobada ni siete días de steady. No es certificación externa.

Delta posterior 28-10: [regresiones gateway (a)/(b)](2026-10-28-gateway-a-b-local.md) en
`efeonce-mcp@9c76c88` local recorrieron JWT firmados, verificador, callback SDK y HTTP
loopback: 3 PASS focales, 240 PASS en `pnpm check`. Rechazo, cero dispatch y evento redactado
probados; faltan integración remota, staging y observación productiva. El límite anterior de
assurance completo permanece.
