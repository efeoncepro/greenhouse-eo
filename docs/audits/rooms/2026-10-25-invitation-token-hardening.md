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
