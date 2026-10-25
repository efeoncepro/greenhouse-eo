# TASK-2066 — refuerzo del token de invitación

Solicitud directa del operador: reforzar seguridad del token ante el riesgo de ciberataques.
Revisión focalizada del código y pruebas locales; no certificación externa ni garantía de invulnerabilidad.
Runtime de partida d23e4d6; cambio `fec6d32`. Lane OFF, sin invitaciones productivas previas.

## Fronteras verificadas

- Token generado con `crypto.randomBytes(32)`: 256 bits, base64url, sin IDs/PII codificados.
- Digest SHA-256 para búsqueda; copia recuperable sólo AES-256-GCM con AAD que vincula organización,
  room, invitación, versión y campo. El código OTP no se genera ni almacena en Rooms.
- Token por sí solo no abre contenido; issuer exige código temporal de un uso y Rooms consume proof
  ES256 con audiencia, binding, nonce y jti. Sólo grants guest acotados a la sala publicada.
- Cookies opacas HttpOnly/SameSite/Secure, sesión distinta de la cuenta interna; sin bearer de URL.
- Reemisión rota token y versión; revocación invalida transacciones/sesiones; permisos frescos en cada read.

## Cambios del corte

**Techo de 24 horas al emitir o reemitir.** Antes sólo limitaba la vigencia del actor/grants, que podía ser
mucho más larga. Ahora el reloj de PostgreSQL aplica el menor límite entre24h y autoridad delegada.
Rechaza períodos mayores en vez de recortarlos silenciosamente. Las fixtures locales existentes no se
copian al entorno cloud; allí se emiten invitaciones nuevas. El OTP conserva10min y sesión guest15min
por defecto, siempre acotados por invitación/permisos.

**Cuotas sin bloqueo global inducido por un anónimo.** El corte anterior evitaba crecimiento ilimitado de
filas mediante cuotas compartidas por RP, pero un atacante podía agotarlas con tokens aleatorios y negar
acceso a todos los invitados. Ahora la búsqueda de un token/cookie inexistente no crea filas; una
invitación identificada consume presupuesto por realm+invitationId+acción, derivado por servidor.
Cambiar requesterKey, cookie o versión no crea un cupo nuevo; agotar A no bloquea B.

No se fía de cabeceras IP arbitrarias. El volumen anónimo requiere WAF/rate por IP confiable en Vercel,
capacidad y observabilidad verificadas antes de ON; las cuotas del dominio no se presentan como un WAF.

## Pruebas y límites

`tests/invitation-security.test.ts`: un administrador sintético con permisos72h no puede crear/reemitir25h;
ambos24h se aceptan. Rechazo sin revisión, recibos, auditoría, outbox, entrega ni rotación parcial.
Token y transacción no autentican sin OTP; tokens/cookies alterados y secretos incorrectos fallan cerrado.

`tests/invitation-rate-limit.test.ts`: entradas anónimas sin cardinalidad persistida, aislamiento de cuotas,
resistencia a rotación y concurrencia; ver resultado final del corte en la task.

Ningún correo real enviado en este corte. El correo único conserva el riesgo de compromiso del buzón:
quien controla ese buzón puede leer enlace y código. No es MFA. TASK-2068 aún debe demostrar limpieza del
fragmento antes de terceros/analítica, ausencia de secretos en almacenamiento browser y CSP de la entrada.
El peer Auth coordina sender/tracking OFF, prueba de href y único canary autorizado antes del rollout.

Referencias revisadas: [OWASP tokens](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
y [OWASP sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Resultado final

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: PASS; **144/144 pruebas**, cero skips.
Ocho pruebas focalizadas PG del corte: cuatro de expiración/tampering/OTP y cuatro de cuotas. La suite
conserva los negativos previos de firma/proof, revocación, aislamiento y recuperación. No cambio de schema.
Commit runtime `fec6d32`, árbol runtime limpio; sin push, despliegue ni envío en este corte.

## Continuación — vigencia de la delegación

Commit `4805c6d`: una sesión interna vigente autoriza emitir/reemitir, pero su duración corta no recorta
por sí sola la invitación. El techo sigue siendo24h y el mínimo de principal, membresía y grants
persistidos, comprobado en la misma transacción; sesión vencida rechaza el comando.

Siete pruebas PostgreSQL adicionales demuestran creación/reemisión de30min con sesión5min y autoridad2h;
sesión vencida y cada techo persistido insuficiente rechazan sin cambios parciales ni llamadas al issuer.
Resultado independiente root: **151/151 pruebas, cero skips**, lint/typecheck/build PASS.

Perímetro: [propuesta Vercel](../../operations/ROOMS_VERCEL_INVITATION_PERIMETER_V1.md) preparada con plan Pro
verificado por API y cuotas por IP nativa. No activada; no se amplía la afirmación de cobertura productiva.

## Continuación — gestión y coexistencia

Commit `7afcd07`: reader de gestión exige access.read sobre room; expone destinatario únicamente al
actor autorizado y calcula acciones/techos con la misma autoridad persistida del writer. API/CLI comparten
reader. Login OFF conserva revocación local durable; fallo DB se devuelve503, no éxito ficticio.
Presencia de cookie interna bloquea verify antes de llamar issuer; start/recovery informan entryGate.
Guest session conserva la edición inicial autorizada; retorno interno limitado a patrones explícitos Rooms.
Resultado: **160/160 pruebas, cero skips**, lint/types/build PASS. UI humana y cloud aún pendientes.

## Continuación — aislamiento cloud y cabeceras de entrada

Commit `7276df9`: WIF exclusivo Production con validación de firma, issuer, audience, subject, owner y
project; sin ADC/key o credencial migrator en runtime. Secret refs versionadas y cache acotada, errores
sanitizados, pool2 y rol mínimo comprobado antes de servir. Pruebas SDK ejercitan fallo de inicialización
y cleanup tardío; resolver de autoridad no consulta secretos bajo lock de organización.

QA independiente: **171/171 pruebas PostgreSQL16, cero skips**; build/lint/types PASS. Se verificaron
statement10s, idle-transacción15s e idle-sesión60s en SQL real local. Restore conserva owners/ACL y datos.
CSP con nonce por petición en /invite y /rooms, no-referrer/no-store y sin unsafe-inline para scripts;
test rechaza nonce suministrado por caller. UI integrada y ausencia de filtraciones browser siguen en QA.

WIF/SA y secretos cloud preparados OFF; DB cloud, WAF activo y correo real todavía no acreditados.
Esta revisión interna focalizada no equivale a pentest externo ni certificación de seguridad.

## Continuación — prueba humana integrada y recuperación

CSP/origin `56e1d45`: Next conserva la URL original mediante skipProxyUrlNormalize; sin relajar el
origin permitido. El harness real local issuer19336/Next3210 completó103 comprobaciones: OTP incorrecto
y correcto, reload sin correo adicional, lector V2/evidencia, OIDC, crear/reemitir/revocar, cuatro anchos
y200%, accesibilidad/foco y ausencia de violaciones CSP. Buzón RAM sintético; ningún envío real.

GVC público:8 frames/4viewports PASS; artefactos
`.captures/2026-10-25T22-23-26_rooms-invitation-entry` en Greenhouse. Aceptación humana aún pendiente.

El recorrido encontró reemisión antes del cooldown del issuer. `cac5311` incorpora cooldown60s visible
y operación retryDelivery para recuperar el mismo delivery_request_id sin rotar token/version; replay
no llama al issuer. Suite178/178 PASS, lint/typesPASS. La UI de esta recuperación sigue en regresión.
Cloud DB ya dispone19tablas/ACL mínimos y8negativas runtime; WAF activo, WIF desdeVercel y correo real
permanecen pendientes. Infra preparada no significa piloto activado.
