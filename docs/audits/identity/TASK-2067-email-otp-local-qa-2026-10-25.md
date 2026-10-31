# TASK-2067 — evidencia local de OTP por invitación

Fecha: 2026-10-25. Checkout compartido develop. Scope: issuer core, store, correo gobernado y preview
sintético; authority HTTP/runtime adapter coordinados por root. No se enviaron correos, no se aplicó Cloud SQL,
no se provisionó identidad ni se habilitó el método productivo.

## Contrato materializado

- `src/lib/auth-server/email-otp/core.ts`: seis dígitos aleatorios, HMAC con secreto obligatorio, TTL10min,
  compare/consume atómico, 5intentos/h por invitación entre versiones, cooldown60s, presupuestos por RP,
  requester y destinatario. Request idempotente conserva historial24h y no duplica envío tras rotación.
- `types.ts`, `handler.ts`: prepare/verify exclusivamente POSTJSON S2S; cliente desde authenticator;
  body sólo IDs y campos de operación. Rechaza email/URL/clientId arbitrarios, query y métodos incorrectos.
- `memory-store.ts`, `postgres-store.ts`: serialización de claves y buckets; advisory locks en orden estable,
  incluso para filas inexistentes. Sólo HMACs/bindings y estado se persisten.
- La prueba firmada por puerto ES256 liga RP, invitación/versión/destinatario y nonce, jti único, ≤120s;
  no crea sesión Auth ni identidad global. Un fallo KMS después de consumo exige otra emisión controlada.
- `mailer.ts` utiliza `sendEmail`, tipo `auth_server_rooms_invitation_otp`, `token_sensitive` y safeContext.
  Correo único lleva enlace + código; `accepted` significa aceptación del proveedor, no entrega ni lectura.
- Template `src/emails/RoomsInvitationOtpEmail.tsx` reutiliza EmailLayout Efeonce y copy aislado. No migra footer
  global pendiente ni añade promoción. Espejo plain text y preview tienen la misma semántica.

## Verificación reproducible

```sh
pnpm exec vitest run src/lib/auth-server/email-otp/core.test.ts src/lib/auth-server/email-otp/mailer.test.ts src/lib/email/templates.test.ts src/lib/email/delivery.test.ts
bash scripts/auth-server/email-otp-local-smoke.sh
pnpm exec tsx scripts/auth-server/email-otp-preview.tsx
pnpm task:lint --task TASK-2067
```

- Tests core14, mailer/render4 y regresión templates/delivery: 52 PASS en corrida focal.
- SQL local3PASS: PostgreSQL16 en cluster efímero con nombre `auth_otp_local`, loopback obligatorio. Dos prepare
  concurrentes generan un correo; ocho verify concurrentes producen una prueba. Estado consumido no contiene
  código, email ni URL. Runtime no puede DELETE; GC SECURITYDEFINER permite sólo lote1..500, por defecto dry-run,
  retención30d, privilegio PUBLIC revocado. Down/Up comprobados y tipo de correo queda OFF.
- El runner crea directorio y puerto efímeros, no lee `.env`, no usa credenciales compartidas y detiene/elimina
  su instancia mediante trap. `AUTH_OTP_PG_BIN` permite apuntar a otro binario PostgreSQL local. No hay instancia
  residual del smoke; el cluster manual inicial55467 también se detuvo.
- Tests de delivery ejercitan pipeline real con DB/provider falsos: código y URL ausentes de argumentos SQL;
  conserva sólo challenge UUID como source correlation. Fake provider no demuestra entregabilidad real.
- ESLint focal limpio. TSC global snapshot: errores propios corregidos; coordinador verifica snapshot integrado.

## Revisión visual del correo

Capturas sintéticas revisadas por el agente:

- `.captures/task-2067-email-preview/1280.png`
- `.captures/task-2067-email-preview/390.png`
- `.captures/task-2067-email-preview/evidence.json`

Marca Efeonce legible, título Rooms, código destacado completo, CTA único, advertencia personal y URL de fallback
sin clipping. A1280y390, scrollWidth equivale al viewport; cero imágenes fallidas y cero pageerror.
La revisión usa Chromium con HTML React Email renderizado, no certifica Outlook/Gmail ni transporte Resend.
El valor123456 y dominioexample.test son fixtures visibles; ningún OTP real ni invitación real se capturó.

## Migración y rollout

`migrations/20261025213415654_task-2067-invitation-email-otp.sql` fue creada mediante `pnpm migrate:create`.
Tablas greenhouse_auth.email_otp_challenges/email_otp_budgets, GC propio
`greenhouse_auth.gc_invitation_email_otp(500, true)` y seed email_type_config OFF; guards Up/Down. No backfill.
Root integró allowlist boundary y servicios con flag OFF. GC incorporado al operador existente en la misma transacción/lock, detectando funciones aún no migradas y conservando retención; 10 pruebas del wrapper PASS. No cron paralelo ni activación cloud.

## Pendientes que impiden cierre operacional

- Cierre de QA backend/atomicidad TASK-2066; el contrato remoto S2S y recorrido guest ya pasaron localmente en ambos runtimes (evidencia posterior abajo).
- Canary productivo con transporte Resend/KMS y recovery; pruebas locales no certifican estas dependencias externas.
- Configuración de secretos/allowlist, migración, email kill switch y despliegue autorizados.
- Verificación del sender exacto y click tracking desactivado, href canary recibido y entrega de proveedor.
- QA del correo en clientes de correo y decisión visual humana si cambia su composición.

Estos pendientes mantienen TASK-2067 in-progress; pruebas locales y mocks no sustituyen rollout.

## Delta — contrato de fragmento Rooms (TASK-2066)

El enlace canónico es `{RoomsOrigin}/invite#token=<opaque43>`. Core y authority HTTP usan el mismo validador
`src/lib/auth-server/email-otp/invitation-url.ts`: origin exacto, pathname `/invite`, search vacío, sin userinfo,
fragmento `^#token=[A-Za-z0-9_-]{43}$` y representación textual exacta (sin normalización tolerante).
Fixtures OTP de core, runtime, authority, SQL y mailer fueron actualizados. Casos negativos cubren query,
query vacía, otra ruta/origen, userinfo, fragmento ausente/corto/largo/parametrizado, escapes, dot-segments,
backslashes y controles. Core rechaza el enlace inválido tanto antes de entrega como antes de verificar OTP.

- `pnpm exec vitest run src/lib/auth-server/email-otp`: 80 PASS y 3 SQL omitidos sin variable local dedicada.
- `bash scripts/auth-server/email-otp-local-smoke.sh`: 3 PASS con URL canónica y cleanup, sin envío ni cloud.
- Preview metadata, script de captura, mailer, plain text y prueba de persistencia usan ahora el fragmento
  canónico con token sintético. Se regeneraron y revisaron las capturas1280/390: fallback más largo se ajusta
  sin overflow; cero imágenes fallidas y pageerror. El preview no implica entrega en un cliente de correo.
- Suite ampliada `pnpm exec vitest run src/lib/auth-server/email-otp src/lib/email/templates.test.ts src/lib/email/delivery.test.ts`: 114 PASS, 3 SQL skip (SQL comprobado por separado).
- ESLint focal y `git diff --check` PASS tras el ajuste de fragmento.
- Rooms conserva la responsabilidad de leer fragmento en memoria, limpiar history y POST start. Esta suite
  issuer no demuestra por sí sola que el frontend Rooms retire el bearer ni su consumo transaccional guest.

## Harness HTTP OTP para integración entre runtimes

`python3 scripts/qa/verify-auth-first-party-local-pg.py --otp-smoke` PASS con ambas migraciones reales en PostgreSQL aislado, autoridad HTTP sintética canónica, prepare y reintento con una sola entrega RAM, verificación ES256/typ/aud/nonce, proof sin `sub` y replay denegado con 400. El cluster del smoke fue detenido y eliminado. No prueba entrega de correo ni KMS productivo.

El modo `--serve --otp` ofrece el mismo runtime OTP y store reales a Rooms local; issuer19336 y authority19335. El mailer es exclusivamente RAM (100 entregas máximo), sólo destinatarios `.test`/`.invalid`; controles devuelven como máximo20 entregas o un deliveryId exacto. El proceso OIDC19334 anterior se conserva independiente.

Verificación independiente del coordinador: configuración0600 sin HMAC persistido; control sin bearer, con Origin o con cookie devuelve403; bearerfixture válido devuelve200 con buzón vacío. Sólo el script QA expone captura de código/link, nunca el servicio desplegable. El runner hereda únicamente variables de tooling allowlisted, sin credenciales cloud/proveedor, y limpia PostgreSQL/archivos al terminar. ESLint y TypeScript global PASS. Configuración privada entregada a la sesión Rooms para E2E TASK-2066; no registrar su contenido ni la ruta temporal como dependencia durable.

## E2E Rooms/issuer y limpieza final — 2026-10-25

La sesión dueña de Rooms ejecutó `../efeonce-rooms/scripts/invitation-integration.ts` con Chrome/cookies y HTTP,
PostgreSQL de ambos runtimes y proof ES256 real. Resultado PASS: create+retry produce una entrega RAM;
fragmento no viaja en GET; abrir no envía otro correo; código incorrecto400, correcto200 y sala200;
otra sala/tenant404, borrador404, replay404, revocación→401. El script limpió RAM, revocó su invitación de
prueba y cerró navegador/servidor Rooms19335. No hubo mensajes externos ni cambios cloud.

Cleanup independiente del coordinador: se detuvieron los dos procesos issuer19334/19336 mediante SIGTERM
a sus nodos hijos; los runners ejecutaron `finally`. Se verificó eliminación de ambos directorios temporales,
incluidas credenciales0600 y datos; puertos19334/19336 y puertos PostgreSQL54443/56150 cerrados.
El harness visual19064 es independiente y conserva sólo la vista local. No hay bases ni secretos residuales
de estas dos fixtures. TASK-2067 sigue in-progress por canary/rollout y dependencias externas pendientes.
