# TASK-1835 — Plan de integración visible de Efeonce ID

## Alcance y coordinación

Dependencia del goal aprobado TASK-1836. Hook ejecutado con `--subagents` el 2026-09-05.
Checkout compartido develop, sin cambio de branch ni worktrees. No publicar ni activar flags en este
paso. UI ready sigue no hasta la aprobación visual y verificación completa exigidas por la task.
La dirección y el primer fold ya revisados permiten avanzar integración local; la aprobación pendiente
no se interpreta como autorización de publicación ni como UI terminada.

## Evidencia del contrato actual

- Authorize valida cliente/redirect/PKCE antes de pedir sesión. Su respuesta 401 ya enlaza a `/login`
  conservando el retorno validado al authorize original; `prompt=none` mantiene el protocolo.
- `/login` presenta magic link y opción corporativa gated mediante `/auth/internal/login`, manteniendo
  el recorrido externo. Nunca clasificar por correo, dominio o texto del nombre de organización.
- Callback corporativo ya valida nonce/state/PKCE, identidad canónica y enrollment, crea cookie y
  retorna al authorize validado. Sus errores GET ofrecen HTML seguro cuando el navegador lo solicita;
  conservan JSON para otros consumers y orientan a reiniciar desde la aplicación.
- Step-up no debe usar authenticate passkey: ese comando crea otra sesión. Usar endpoints
  `/auth/passkeys/step-up/start|finish` o `/auth/totp/verify` sobre la sesión corporativa vigente.
- Consent renderer ya recibe organizaciones del DTO server-side vigente, con nombres escapados y
  capabilities separadas. Authorize y POST lo revalidan; nunca confiar en query/form para identidad.
- WebAuthn requiere JS con nonce y `connect-src 'self'` por página. No relajar la CSP global ni
  registrar cookies, códigos, tokens o cuerpos sensibles. Alta de TOTP ya integrada localmente.

## Secuencia

1. Dirección repo-native comparando tres alternativas, tokens reales del SSOT y decisión para runtime
   node:http sin React/MUI. Actualizar wireframe/flow/motion, luego readiness.
2. Harness hermético que renderiza first fold login/consent en 1440 y 390, revisión visual antes del
   resto de estados. Copy canónico, accesibilidad y motion reducido.
3. Integrar retorno OAuth, entrada corporativa, DTO de consentimiento y step-up con comandos existentes.
4. Pruebas de recorrido, tampering/CSRF, ausencia de elevación, teclado y CSP. GVC premium completo,
   quality/QA/documentación. No declarar login operativo por una captura de fixtures.
5. Despliegue coordinado con consumers compatibles y cohorte mínima; canary real y rollback medido
   permanecen en TASK-1832/1836. Registrar por separado código, configuración y evidencia runtime.

## Estado

Plan y mapa de contratos revisados; dirección visual propuesta B documentada y preview implementado con
GVC. El DTO server-side de consentimiento tiene 24 pruebas y está integrado al renderer real.
Retorno OAuth y entrada Microsoft están conectados localmente con pruebas de flags/tampering.
El recorrido real completo todavía no está verificado.

El generador compartido ya produce CSS AXIS y fuentes con avisos OFL; el servidor entrega rutas
exactas de assets. Shell ya consume CSS/fuentes/avisos y CSP por hash. `/login/step-up` ya integra
TOTP/passkey UV y alta TOTP con QR, secreto alterno y respaldo; scripts con nonce. Las mutaciones de sesión/factores ya verifican origen, incluido
login sin cookie previa; el canary programático declara Origin.


## Avance del primer fold

Harness local login/consent y revisión documentados en `docs/ui/reviews/TASK-1835-first-fold-review.md`.
GVC pasó seis frames desktop/mobile; prueba Chromium sin bypassCSP también pasa. Aprobación de dirección
solicitada al operador, todavía pendiente. Se puede continuar auditoría backend mientras se espera, pero
no marcar UI ready ni interpretar las acciones del preview como autenticación real.

## Evidencia de los renderers reales

El harness `scripts/auth-server/dev-ui-server.ts` en `127.0.0.1:19036` usa renderers de producto,
DTOs ficticios y sólo GET; no ejecuta OAuth ni autenticación. GVC pasa desktop 1440/móvil 390 para
consentimiento, login, step-up y alta de factor; rutas completas en la review del primer fold.
`node scripts/auth-server/verify-ui-browser.mjs` terminó exit 0 con 6 checks y 0 violations:
fuentes/overflow y controladores TOTP/UV con respuestas simuladas. No es un canary real.

Siguiente: completar login passkey, matriz de estados y review enterprise; recibir aprobación visual
antes de UI ready. Typecheck global y build completo verificados. Deploy y autenticación real
permanecen pendientes y separados de la evidencia local.
