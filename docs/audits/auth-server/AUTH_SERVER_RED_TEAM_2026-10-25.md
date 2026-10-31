# Auth + Rooms — evaluación ofensiva reproducible, 2026-10-25

## Alcance y estado

Evaluación propia autorizada por Julio, ejecutada por auth_discovery; refutación separada asignada a
login_discovery y consumer Rooms a su peer. No proveedor externo, API pagadas ni afirmación de certificación
comercial independiente. Los agentes comparten proveedor; la independencia es de revisión/ownership.

Estado: casos backend ejecutados localmente; matriz pendiente de consolidación con la refutación independiente
y canaries productivos del coordinador. No cierre completo TASK-1833 ni evidencia de correo real en este informe.
Código revisado en checkout compartido `develop`, cambios1834/2067/1833. Nunca se enviaron ataques o ráfagas
contra SQL compartido ni correo externo. Los controles lectura HTTP pública y metadata GCP se describen en
[plan1833](../../tasks/plans/TASK-1833-plan.md), no se cuentan como explotación autenticada.

## Reproducción

```sh
pnpm exec vitest run src/lib/auth-server/first-party/protocol.test.ts src/lib/auth-server/email-otp src/lib/auth-server/oauth/oauth-flow.test.ts
pnpm exec vitest run src/lib/reliability/queries/auth-server-signals.test.ts src/lib/reliability/queries/auth-oauth-abuse-signals.test.ts src/lib/reliability/queries/auth-person-signals.test.ts
python3 scripts/qa/verify-auth-first-party-local-pg.py
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
La refutación final del agente separado permanece pendiente por caso hasta su reporte.

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

Pendientes para aceptación final: refutación independiente completa, casos gateway roles/Entra con owner 1831,
validación ofensiva SSRF/DNS no ejecutada, readbacks del nuevo issuer y Rooms productivo, correo único autorizado,
revocación/rollback medidos y ventanas temporales exigidas. No se ocultan esos gaps tras el conteo PASS.


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
