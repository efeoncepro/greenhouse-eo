# TASK-1835 — Efeonce ID: pantallas de login, consentimiento y recuperación en `auth.efeonce.org`

## Delta 2026-09-05 — dirección aprobada, implementada y pendiente de build

El operador eligió la dirección **A · «Nocturno editorial»** entre tres exploradas en un lienzo de
diseño y quedó implementada en `develop`. Lo verificado, lo que falta y una trampa operativa:

- **Verificado**: Playwright + Chrome contra los renderers REALES del emisor (no el harness del
  19035) en `/login`, `/login/error`, `/consent`, `/sent` y `/step-up`, a 1440×900 y 390×844, claro y
  oscuro. `pnpm vitest run src/lib/auth-server` 313 passed, typecheck limpio, lint sin errores.
- **Bug de marca cerrado en la causa**: el color de los SVG institucionales venía en un `<style>`
  interno que la CSP del emisor bloquea por hash, y la regla compensatoria sólo alcanzaba a `<path>`
  — el `<circle>` del logotipo salía negro. Ahora se normalizan a `currentColor` al generarlos, con
  drift test y una guarda que falla si reaparece un `<style>` embebido.
- **Pendiente para `UI ready: yes`**: login por passkey, matriz completa de estados capturada, GVC
  premium de las 11 fixtures, scorecard y los gates `design-contract:lint` / `ui:code-lint` /
  `ui:visual-gate` / `ui:quality`.
- **Trampa operativa que hay que leer antes de empujar**: `auth-server-deploy.yml` dispara en todo
  push a `develop` que toque `src/lib/**`, y el servicio Cloud Run es UNO solo compartido que sirve
  `auth.efeonce.org` en vivo. El push ES el despliegue y la pantalla queda pública. La advertencia
  anterior sobre flags de main quedó corregida tras verificación de Codex contra `origin/main`
  `a68662508`: `deploy.sh` ya declara OAuth y person auth con default true. El gate interno sigue
  separado y durable en GitHub false hasta terminar la publicación y los readbacks de TASK-1836.

## Delta 2026-09-04 — acceso interno nativo (TASK-1836)

El flujo interno depende del contrato backend de TASK-1836 (U11). Incluir entrada corporativa Microsoft, retorno OAuth, errores de elegibilidad y consentimiento con organización/permisos reales; actualizar wireframe/flow/motion antes de implementar ese slice. La UI no determina población por correo ni concede permisos. El flujo externo conserva su contrato.


## Delta 2026-09-05 — el consentimiento debe mostrar el destino (TASK-1837)

La pantalla de consentimiento muestra hoy `clientName` y `clientId`, y **no muestra el host del `redirect_uri`**
(`renderConsentPage`, `src/lib/auth-server/oauth/pages/render.ts`). Es un MUST de la especificación de
autorización MCP: quien autoriza tiene derecho a ver a dónde se envía el código, porque el nombre de la
aplicación es auto-declarado y el destino no.

`TASK-1837` aporta el **dato** (resuelve y valida el host, lo pasa al input de `renderConsentPage` y agrega el
copy en `src/lib/copy/auth-server.ts`). El **tratamiento visual** —dónde vive dentro de la ficha de aplicación,
su jerarquía frente a la marca verificada y al aviso de aplicación no verificada— sigue siendo de esta task.
No es una línea decorativa: es la señal que impide que una aplicación con nombre creíble se lleve el código a
un dominio ajeno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md`
- Flow: `docs/ui/flows/TASK-1835-efeonce-id-login-consent-screens-flow.md`
- Motion: `docs/ui/motion/TASK-1835-efeonce-id-login-consent-screens-motion.md`
- Backend impact: `none`
- Epic: `EPIC-044`
- Status real: `Dirección visual APROBADA por el operador (A · «Nocturno editorial») e implementada en develop 2026-09-05: commits 802b5b869 (composición), 501f54b52 (presencia de la tarjeta), 300d3c5cf (UX writing + estados) y 78cc2dc67 (color de marca por currentColor). Wireframe/flow/motion/review sincronizados con lo implementado. Verificado con Playwright + Chrome contra los renderers REALES del emisor —login, error, consent, sent, step-up a 1440x900 y 390x844, claro y oscuro—; vitest src/lib/auth-server 313 passed, typecheck limpio, lint sin errores. SIN DESPLEGAR: el push a develop dispara auth-server-deploy y el servicio Cloud Run es UNO compartido que sirve auth.efeonce.org en vivo, así que el push ES el despliegue. UI ready sigue no: faltan login por passkey, matriz completa de estados capturada, GVC premium de las 11 fixtures, scorecard y los gates ui:*; sin estado de carga en el envío por diseño de la CSP (POST sin JS).`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Diseñar y construir la experiencia visible de **Efeonce ID** en `auth.efeonce.org`: la pantalla de
inicio de sesión (passkey y magic link, con step-up TOTP), la pantalla de consentimiento por
aplicación y permiso, las páginas de éxito/error/recuperación y el shell de marca que las une. Hoy
existe una página mínima server-side (isotipo del SSOT + copy es-CL) que cumple el contrato del
protocolo; esta task la convierte en una superficie enterprise-ready sin cambiar ese contrato
(rutas, campos del formulario, copy ids, `SubjectSessionPort`).

## Why This Task Exists

TASK-1829 entregó el protocolo OAuth y, a propósito, sólo una página mínima de consentimiento y de
error: la UI no era su dominio. TASK-1830 entrega la autenticación de personas (sesión, passkeys,
magic link, TOTP) como contratos JSON y un flujo maestro, no pantallas. Sin esta task, el primer
cliente externo (TASK-1832) vería una pantalla de texto sin jerarquía, sin identidad de marca, sin
estados de carga/error diseñados y sin accesibilidad verificada — y un flujo de identidad es el
momento de mayor desconfianza de un usuario: cada segundo sin claridad se paga en abandono o en
consentimientos otorgados sin entender qué se concede. La UI vive en un runtime `node:http` sin
React ni Next, así que además hace falta decidir cómo se construye una superficie premium fuera del
portal reutilizando el SSOT de marca y tokens.

## Goal

- Shell visual «Efeonce ID» server-rendered (sin framework) con tokens derivados del SSOT
  (`src/config/efeonce-brand.ts`, `src/components/theme/typography-tokens.ts`, `src/@core/theme/axis-tokens.ts`),
  isotipo bundleado, CSP estricta y sin JS salvo donde el protocolo lo exige (WebAuthn).
- Pantalla de consentimiento que muestre con claridad quién pide acceso (`client_name`, `client_id`,
  `logo_uri` de CIMD cuando exista), a qué organización se accede, qué permisos se conceden (lectura
  vs escritura, descripción es-CL por scope) y cómo revocarlos después.
- Pantallas de login (elección de método, magic link enviado/verificado, passkey, step-up TOTP con
  código de respaldo) y de recuperación (invitación expirada, enlace inválido, sesión cerrada),
  cada una con estados loading/error/denied diseñados y accesibles.
- Evidencia GVC premium desktop 1440 + mobile 390 mirada, scorecard ≥ 4.5, sin scroll horizontal,
  recorrido por teclado y reduced-motion verificados, sobre un harness local que renderiza cada
  estado sin depender de KMS ni PG.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§2 endpoints, §5.1 contrato de la pantalla de consentimiento, §6 `SubjectSessionPort`)
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- El contrato del protocolo NO cambia: rutas `/oauth/authorize`, `POST /oauth/consent` (campos
  `client_id`, `scope`, `return_to`, `decision`), `login_required` (401) y los códigos de error de
  `OAuthProtocolError` se mantienen; la UI es un render distinto del mismo handler.
- NUNCA JS que toque tokens, codes ni `code_verifier`; NUNCA loggear ni renderizar `sub` crudo.
- NUNCA compartir cookies, `NEXTAUTH_SECRET` ni componentes cliente del portal: el runtime es
  `services/auth-server` (`node:http`), sin React/Next/MUI. La marca se consume desde el SSOT por
  artefacto generado (patrón `efeonce-isotipo.generated.ts`), nunca importando `@core/*` ni el theme.
- CSP estricta por defecto (`default-src 'none'`; `script-src` sólo con nonce cuando WebAuthn lo
  necesite); sin fuentes ni assets de terceros salvo decisión explícita en el decision log.
- Copy visible SOLO desde `src/lib/copy/auth-server.ts` (es-CL, tuteo, validado con
  `greenhouse-ux-writing`); nunca literal inline en el HTML.
- Anti-enumeración: las pantallas de magic link y recuperación no revelan si un correo existe o si
  una invitación es de otra persona (copy idéntico para ambos casos).
- La pantalla de consentimiento nunca preselecciona «permitir», nunca esconde scopes de escritura y
  nunca setea estado de consentimiento antes del POST (mcp-craft §security: cookie-antes-de-aprobar).
- Toda UI nueva nace con el loop `greenhouse-ai-design-studio` + `product-design-loop` + GVC premium;
  sin freehand.

## Normative Docs

- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (flujo maestro del programa; esta task es sus nodos «consent», «login», «step-up», «recovery» y «error»; la **§5.bis** (TASK-1830, commit `95a569265`) trae la tabla completa de rutas, las cuatro cosas que la UI no puede contradecir y la lista de estados a representar — es contrato, no sugerencia)
- `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md` (contrato de sesión, métodos y errores canónicos que consumen las pantallas de login)
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md` (GVC)
- `.claude/skills/mcp-craft/security-and-auth.md` (consentimiento, confused deputy)

## Dependencies & Impact

### Depends on

- `TASK-1829` (OAuth ON en el readback 2026-09-05): handler `src/lib/auth-server/oauth/handler.ts`, páginas
  `src/lib/auth-server/oauth/pages/render.ts`, copy `src/lib/copy/auth-server.ts`,
  `InMemoryOAuthStore` y `createStaticSubjectPort` para el harness.
- `TASK-1830` (Slices 2–3): `greenhouse_auth.sessions`, rutas `/auth/passkeys/*`, `/auth/magic-link/*`,
  `/auth/totp/*`, `/auth/session`, errores canónicos y el flujo maestro UI.
- SSOT de marca y tokens: `src/config/efeonce-brand.ts`, `src/components/theme/typography-tokens.ts`
  (Poppins para texto, Geist para numéricos), `src/@core/theme/axis-tokens.ts`, `public/branding/SVG/*`.

### Blocks / Impacts

- `TASK-1832` (canaries y primera cohorte): usa estas pantallas con clientes reales.
- `TASK-1830`: sus rutas JSON se consumen desde estas pantallas; su flujo maestro se extiende con
  el detalle visual de cada nodo.
- `TASK-1833`: la revisión de seguridad audita estas pantallas (CSP, anti-enumeración, clickjacking).
- `TASK-1834`: reutiliza el shell «Efeonce ID» cuando el portal converja al emisor.

### Files owned

- `src/lib/auth-server/oauth/pages/**` (shell, plantillas por pantalla, `styles.generated.ts`)
- `scripts/auth-server/generate-brand-assets.ts` (extender: tokens → CSS generado)
- `scripts/auth-server/dev-ui-server.ts` (nuevo: harness local con fixtures por estado para GVC)
- `scripts/frontend/scenarios/task1835-efeonce-id.scenario.ts` (nuevo)
- `src/lib/copy/auth-server.ts` (extender; TASK-1830 agrega el copy de métodos, esta task el de layout/estados)
- `docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md`
- `docs/ui/flows/TASK-1835-efeonce-id-login-consent-screens-flow.md`
- `docs/ui/motion/TASK-1835-efeonce-id-login-consent-screens-motion.md`
- `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md` (nuevo, dirección visual versionada; prerequisito de `UI ready: yes`)
- `docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens.scorecard.json` (nuevo)

## Current Repo State

### Already exists — código local verificado 2026-09-05

- Shell compartido en `oauth/pages/render.ts`, CSS generado desde AXIS, fuentes locales y enlaces
  a sus licencias OFL. `oauth/http.ts` permite estilos por hash y fuentes del propio origen.
- Login corporativo/correo, consentimiento con DTO server-side de organización y permisos, páginas
  de magic link/recuperación y respuestas de protocolo usan los renderers reales.
- `/login/step-up` consume TOTP y passkey UV sobre la sesión existente; alta TOTP con QR, secreto
  alterno, confirmación y respaldo mediante comandos existentes. Script con nonce y conexión al
  propio origen; no afirma MFA por login Microsoft.
- `scripts/auth-server/dev-ui-server.ts` sirve esos renderers en `127.0.0.1:19036`, sólo GET,
  con DTOs ficticios y sin handlers OAuth/autenticación reales. GVC de cuatro superficies pasa.
- `scripts/auth-server/verify-ui-browser.mjs`: 6 checks, 0 violations, exit 0; verifica fuentes,
  overflow y controladores con respuestas de factores simuladas. Evidencia detallada en la review.

### Gap

- Aprobación visual del operador pendiente; `UI ready: no`.
- Login passkey completo, matriz de estados/recuperación, contenido largo, review enterprise y
  scorecard final siguen pendientes. Fixtures disponibles no equivalen a estados revisados.
- No se ha verificado aquí autenticación real, consentimiento persistido, canary ni despliegue de
  estos renderers. El typecheck global sigue sin resultado confirmado para esta integración.
- Logos CIMD, todos los criterios de accesibilidad y registro del patrón requieren su evidencia
  específica antes de marcar los criterios completos.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/auth-server/oauth/pages/**` (server-only, HTML strings) consumido por `services/auth-server/app.ts`
- Future candidate home: `worker`
- Boundary: las plantillas reciben DTOs ya resueltos por el handler (`ConsentPageInput`, contratos de TASK-1830); nunca leen store, KMS ni sesión; el copy viene de `src/lib/copy/auth-server.ts`
- Server/browser split: 100 % server-rendered; el único JS es el módulo WebAuthn de TASK-1830, servido con nonce; sin React ni bundle de cliente
- Build impact: ninguna dependencia nueva; `styles.generated.ts` y `efeonce-isotipo.generated.ts` son artefactos generados desde el SSOT (nunca `node:fs` en runtime)
- Extraction blocker: none — el shell es autocontenido y viaja con el deployable `auth-server`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona de una organización cliente (invitada por Efeonce) que conecta una herramienta de IA (Claude, ChatGPT, Codex) al MCP de Efeonce; secundariamente, el operador de Efeonce que prueba el flujo.
- Momento del flujo: llega desde la aplicación (`/oauth/authorize`) → inicia sesión (o ya tiene sesión) → confirma o niega el acceso → vuelve a la aplicación. Toda la experiencia dura menos de un minuto y suele ocurrir una sola vez por aplicación.
- Resultado perceptible esperado: entender en tres segundos quién pide acceso, a qué y para qué; iniciar sesión sin contraseña con confianza; volver a la aplicación con la certeza de que el acceso quedó concedido (o negado) y de que se puede revocar.
- Friccion que debe reducir: texto plano sin jerarquía, scopes crípticos (`efeonce.mcp.seo.write`), dudas de legitimidad («¿esto es Efeonce?»), no saber qué hacer tras «revisa tu correo», y pantallas de error sin salida.
- No-goals UX: registro público, recuperación de contraseña (no existen contraseñas), perfil de usuario, listado de aplicaciones autorizadas (vive en Greenhouse), branding por cliente más allá de nombre/logo, y **«recordar este dispositivo» / saltar el step-up** — el `amr` sale de la aserción real WebAuthn/TOTP (decisión TASK-1830, 2026-09-04): la pantalla de step-up nunca ofrece recordarlo.

### Surface & system decision

- Surface: `auth.efeonce.org` — rutas `/oauth/authorize` (consent, login_required, step-up, error) y las HTML/JSON de TASK-1830 (contrato 2026-09-04): `GET /login` (passkey primero, luego correo → `POST /auth/magic-link/request`), `GET /m/<tokenId>.<verificador>` (página intermedia obligatoria con botón que hace `POST /auth/magic-link/consume` — los escáneres de correo abren los GET y quemarían el enlace), `GET /i/<token>` + `POST /auth/invitations/accept` (aceptar invitación NO abre sesión: envía un magic link → pantalla «revisa tu correo»), `POST /auth/passkeys/{register,authenticate}/{start,finish}`, `POST /auth/totp/{enroll/start,enroll/finish,verify}`, `GET /auth/session`, `POST /auth/session/logout`.
- Nav placement: `none` — no es una superficie del portal; no agrega destino de navegación en Greenhouse.
- Composition Shell: `no aplica` — runtime `node:http` sin React; se define un **shell HTML propio «Efeonce ID»** (documento, cabecera de marca, tarjeta única centrada, pie con ayuda/legal) documentado en el wireframe, que cumple el mismo rol de regiones declaradas.
- Primitive decision: `new` — primitives HTML+CSS propias del emisor (`IdShell`, `IdCard`, `IdButton`, `IdField`, `IdScopeList`, `IdClientBadge`, `IdStatus`) derivadas por tokens del SSOT, sin duplicar el DS del portal (no puede ejecutarse ahí). Se registran como patrón en `docs/architecture/ui-platform/PATTERNS.md` con la nota «runtime sin React».
- Adaptive density / The Seam: `no aplica` — una tarjeta de ancho fijo (máx. 440 px) sin densidad variable.
- Floating/Sidecar/Dialog decision: ninguna superficie flotante; el «diálogo» de consentimiento es la página misma.
- Copy source: `src/lib/copy/auth-server.ts`
- Access impact: `none` — la autorización la decide el handler (`SubjectSessionPort`, consent, `gv`); la UI no introduce planos de acceso.

### State inventory

- Default: consent con cliente identificado, lista de scopes (lectura primero, escritura con marca «escritura» y descripción del efecto), organización, CTAs «Permitir» (primario) y «Cancelar» (secundario).
- Loading: envío del formulario (`allow`/`deny`) con botón en pending y texto «Confirmando…»; verificación de magic link con estado «Verificando tu enlace…».
- Empty: no aplica a consent (siempre hay ≥ 1 scope); en login, el botón «Usar mi passkey» va ANTES del campo de correo (credenciales descubribles, sin `allowCredentials`) y el campo de correo vacío sólo gobierna «Enviarme un enlace».
- Error: `invalid_client`, `invalid_redirect_uri`, `invalid_request` → página de error con código visible, sin redirect; magic link inválido/expirado → estado con CTA «Pedir un enlace nuevo»; TOTP incorrecto → error inline sin bloquear (límite de intentos lo gobierna TASK-1830).
- Degraded / partial: `slow_down` (429) → «Demasiados intentos» con espera sugerida; la respuesta de pedir magic link es IDÉNTICA exista o no el correo, incluido el tiempo de respuesta (TASK-1830): una sola pantalla «revisa tu correo», sin estados distintos; aceptar una invitación termina en esa misma pantalla.
- Permission denied: `access_denied` por sujeto sin organización vinculada → explicación y CTA «Pedir acceso a tu contacto en Efeonce» (mailto/texto, sin formulario); invitación revocada → misma página.
- Long content: cliente con nombre largo (truncado con `title`), lista de 5 scopes con descripciones de dos líneas; nunca scroll interno en la tarjeta.
- Mobile / compact: tarjeta a ancho completo con márgenes 16 px, CTAs apilados (primario arriba), campo de correo con `inputmode=email`, TOTP con `inputmode=numeric` y `autocomplete=one-time-code`.
- Keyboard / focus: orden cabecera → contenido → CTA primario → secundario; foco inicial en el primer campo (login) o en el título (consent), nunca en «Permitir»; `Enter` en el campo envía; Escape no cierra nada (no hay overlay).
- Reduced motion: todas las transiciones se sustituyen por cambios inmediatos; ningún spinner infinito depende de animación para transmitir estado (texto «Confirmando…» siempre presente).

### Interaction contract

- Primary interaction: `Permitir` (POST `/oauth/consent` `decision=allow`); en login `Usar mi passkey` (primario, antes del correo) y `Enviarme un enlace` (secundario, con el correo); en la página intermedia del enlace `Continuar` (POST consume); en step-up `Verificar código`.
- Hover / focus / active: botones con estados por token (contraste ≥ 4.5:1 en todos), anillo de foco visible de 2 px con color de marca sobre fondo claro; enlaces subrayados en foco.
- Pending / disabled: al enviar, el botón primario pasa a `disabled` + `aria-busy` + copy «Confirmando…»; el secundario se deshabilita para evitar doble decisión; sin doble submit (el servidor además es idempotente).
- Escape / click-away: no aplica (sin overlays). El botón «Cancelar» del consent devuelve `access_denied` a la aplicación y lo dice antes de enviar («Volverás a {client} sin acceso»).
- Focus restore: tras un error inline (TOTP incorrecto), el foco vuelve al campo con `aria-describedby` al mensaje; tras `slow_down`, el foco va al título del estado.
- Latency feedback: pending inmediato (< 100 ms) en el botón; si la verificación de magic link tarda > 3 s, texto secundario «Esto puede tardar unos segundos».
- Toast / alert behavior: sin toasts; los mensajes viven inline con `role=alert` (errores) o `role=status` (confirmaciones), una sola región viva por página.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: entrada de la tarjeta con opacidad+desplazamiento de 8 px en 160 ms; salida sin transición (redirect del servidor).
- Layout morph: cambio de método de login (magic link ↔ passkey) por navegación server-side, sin morph.
- Stagger: ninguno.
- Timing / easing token: duraciones y easing exportados desde el SSOT de motion (`src/@core/theme/axis-tokens.ts` / tokens de motion del portal) al CSS generado; sin valores literales en las plantillas.
- Reduced-motion fallback: `@media (prefers-reduced-motion: reduce)` anula la entrada y los cambios de estado son inmediatos; el pending se comunica por texto y `aria-busy`.
- Non-goal motion: sin loaders decorativos, sin confetti al conceder, sin parallax.

### Implementation mapping

- Route / surface: `GET /oauth/authorize` (consent 200 / login_required 401 / step-up 403 / error), `POST /oauth/consent`, y las rutas HTML de TASK-1830 (`/login*`, `/session`).
- Primitive / variant / kind: primitives HTML propias del emisor (ver Surface & system decision); variantes de botón `primary|secondary|link`; kinds de estado `info|success|warning|error`.
- Component candidates: `src/lib/auth-server/oauth/pages/{layout,consent,login,magic-link,passkey,step-up,recovery,error}.ts` (funciones puras `render*Page(input) → string`).
- Copy source: `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`), ids nuevos en el Copy Ledger del wireframe.
- Data reader / command: `handleAuthorize`/`handleConsent` (TASK-1829) y los handlers de TASK-1830; las plantillas sólo reciben DTOs. Los endpoints que la UI consume por formulario (`magic-link/request`, `magic-link/consume`, `invitations/accept`, `session/logout`) responden HTML cuando el `Content-Type` es `application/x-www-form-urlencoded` y JSON en cualquier otro caso: los formularios postean directo, sin `fetch` ni JS.
- API parity: la UI es un cliente del mismo handler que Nexa/CLI/Admin (`grantClientConsent`); no hay lógica de negocio en el HTML.
- Access / capability: ninguna nueva; `SubjectSessionPort` + consent + `gv` deciden en el handler.
- States to implement: los del State inventory por pantalla más la lista cerrada de §5.bis del flujo maestro (`login`, `magic_link_sent`, `magic_link_confirm`, `link_invalid/expired/used`, `access_revoked`, `session_started`, `session_closed`, `rate_limited`, `invitation_confirm`, `invitation_accepted`, `passkey_unsupported`, `passkey_failed`, `step_up_required`, `totp_enroll`), enumerados en el wireframe (§State Copy) y en el flow (§State Machine).

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1835-efeonce-id.scenario.ts` (nuevo)
- Route: harness local `pnpm auth-server:dev-ui` en `http://127.0.0.1:8787` con fixtures `?fixture=consent|consent-write|login|magic-sent|magic-verify|passkey|step-up|recovery|denied|error|slow_down` `[verificar]` que `pnpm fe:capture --env=local` acepte base URL/puerto distinto de `localhost:3000`; si no, capturar con Playwright directo desde el mismo scenario DSL y documentarlo.
- Viewports: 1440×1000 y 390×844
- Quality profile: `premium`
- Required steps: consent (lectura) → allow pending → consent con scope de escritura → deny → login (correo) → magic-sent → magic-verify (ok / expirado) → step-up (error inline / ok) → denied (`access_denied`) → error (`invalid_client`) → `slow_down`.
- Required captures: una por fixture en ambos viewports + recorrido por teclado (focus visible) + `prefers-reduced-motion`.
- Required `data-capture` markers: `id-shell`, `id-client`, `id-scopes`, `id-actions`, `id-status`, `id-form`.
- Assertions: `scrollWidth === clientWidth`; `Permitir` nunca tiene foco inicial; scopes de escritura marcados; ningún `sub`/token en el DOM; CSP sin `unsafe-inline` en `script-src`.
- Scroll-width checks: en las 11 fixtures × 2 viewports.
- Reduced-motion / focus evidence: misma secuencia con la preferencia activada y capturas del anillo de foco.
- Review dossier: `pnpm fe:capture:review task1835-efeonce-id` obligatorio antes de `UI ready: yes`.
- Baseline decision / surface ID: baseline nuevo `efeonce-id` en `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md`; sin surface ID de Figma (dirección repo-native).

### Design decision log

- Decision: shell HTML propio «Efeonce ID» server-rendered, tokens generados desde el SSOT, una tarjeta centrada, sin framework; la pantalla de consentimiento es la superficie principal.
- Alternatives considered: (a) montar una app Next.js para la UI del emisor — rechazada: duplica runtime, cookies y superficie de ataque, y el ADR fija un deployable propio y mínimo; (b) reutilizar componentes MUI del portal vía SSR aislado — rechazada: `@core/*` y el theme son del portal y su bundle no aplica a un servicio `node:http`; (c) dejar las páginas mínimas actuales — rechazada: no cumplen el estándar premium ni la claridad que exige el consentimiento.
- Why this pattern: cero dependencias, CSP estricta, render determinista y testeable como string, mismos tokens que el portal por artefacto generado; el patrón ya existe (`efeonce-isotipo.generated.ts`).
- Reuse / extend / new primitive: `new` (primitives HTML del emisor), registradas en la UI Platform como patrón «runtime sin React» para que no nazcan copias en otros servicios.
- Open risks: dirección visual aún no aprobada (`UI ready: no`); falta revisión completa de estados y canary real. Fuentes locales con OFL y script por nonce ya integrados; la matriz completa de CSP/accesibilidad queda pendiente.

### Visual verification

- GVC scenario: `task1835-efeonce-id`
- Viewports: 1440×1000 · 390×844
- Required captures: 11 fixtures × 2 viewports + teclado + reduced-motion
- Required `data-capture` markers: `id-shell`, `id-client`, `id-scopes`, `id-actions`, `id-status`, `id-form`
- Scroll-width check: en todas las capturas
- Accessibility/focus checks: orden de tabulación, foco inicial, `role=alert|status`, contraste ≥ 4.5:1 (axe), etiquetas de campos, `autocomplete` correctos
- Before/after evidence: capturas de la página mínima actual (before) vs shell nuevo (after) para consent y login_required
- Known visual debt: ninguna al crear la task; la página mínima actual se retira por completo
- Visual scorecard: `docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección visual, shell «Efeonce ID» y consentimiento (no bloqueado)

- Dirección visual versionada `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md` (Decision, Desktop target, Mobile target, Token mapping, Anti-patterns) autorada con `greenhouse-ai-design-studio`, comparando 2–3 direcciones antes de elegir.
- Generador de tokens → `styles.generated.ts` (extensión de `generate-brand-assets.ts` con drift test) y shell `layout.ts` con cabecera de marca, tarjeta, pie y CSP.
- Consentimiento rediseñado (`consent.ts`): cliente identificado (nombre, `client_id`, `logo_uri` sólo si viene de CIMD validado y pasa allowlist de esquema `https`), organización, lista de scopes con lectura/escritura diferenciada, CTAs, estado pending; página de error y `login_required` con el shell.
- Harness `scripts/auth-server/dev-ui-server.ts` + fixtures + scenario GVC; capturas desktop/mobile miradas; scorecard.

### Slice 2 — Login: correo, magic link y passkey (bloqueado por TASK-1830 Slices 1–2)

- Pantalla `/login` (passkey primero; correo + «Enviarme un enlace»), «revisa tu correo» (anti-enumeración; también tras aceptar invitación en `/i/<token>`), página intermedia `/m/<tokenId>.<verificador>` con botón que consume por POST (ok / expirado / usado), estados del módulo WebAuthn de TASK-1830.
- Copy: reutilizar los ids `login_*`, `confirm_*`, `link_*`, `session_*` que TASK-1830 ya agregó a `src/lib/copy/auth-server.ts`; esta task sólo agrega los de layout/consent (`consent_*`, `brand_domain`, `error_correlation`), validados con `greenhouse-ux-writing`.

### Slice 3 — Step-up, recuperación y sesión (bloqueado por TASK-1830 Slice 3)

- Step-up TOTP (`POST /auth/totp/verify`, error inline, límite de intentos), **alta del segundo factor** (`totp_enroll`, copy `totp_*` de TASK-1830, commit `fa01887bc`: QR + secreto alterno + 10 códigos de respaldo entregados por el servidor UNA sola vez y sin endpoint para repetirlos → confirmación explícita «ya guardé mis códigos» antes de avanzar; el enrolamiento queda `pending` hasta un código correcto, así que el éxito se muestra DESPUÉS del código, nunca al mostrar el QR; estado `totp_envelope_unavailable` como degradación honesta: las lecturas siguen, la escritura espera), página de invitación `GET /i/<token>` (`invitation_confirm` → `invitation_accepted`), `access_revoked`, `session_started` y `session_closed` (`POST /auth/session/logout`). Estados exactos: §5.bis del flujo maestro.
- GVC completo de las 11 fixtures, `pnpm ui:quality`, before/after y `UI ready: yes`.

## Out of Scope

- Cualquier cambio al protocolo OAuth, al `SubjectSessionPort`, a las tablas `greenhouse_auth` o a los
  commands (TASK-1829/1830).
- Implementar passkeys, magic link, TOTP o sesiones (TASK-1830): esta task renderiza sus estados.
- Pantallas dentro de Greenhouse (Admin Center de clientes/consentimientos, «Aplicaciones
  autorizadas» del usuario) — task propia cuando exista demanda.
- Convergencia del login del portal (TASK-1834) y branding por cliente más allá de nombre/logo.
- Internacionalización: es-CL únicamente; `lang` y copy en inglés quedan como follow-up.

## Detailed Spec

Contratos completos en los tres docs de UI declarados en `## Status` y en el flujo maestro
`docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md`. Puntos que el implementador no debe
re-decidir:

- **Tokens generados, nunca literales.** `styles.generated.ts` se produce con
  `pnpm auth-server:brand-assets:generate` leyendo `efeonce-brand.ts`, `typography-tokens.ts` y los
  tokens runtime-agnósticos de `src/@core/theme/axis-tokens.ts`; un test de drift compara el artefacto con
  la fuente (mismo mecanismo que el isotipo). Las plantillas sólo usan clases del CSS generado.
- **Consentimiento honesto.** Orden: identidad del cliente → organización → permisos (lectura
  primero; escritura con etiqueta «Escritura» y descripción del efecto: «mueve dinero», «modifica
  configuración») → nota de revocación → acciones. `Permitir` nunca recibe foco inicial ni es el
  botón por defecto de `Enter` cuando hay scopes de escritura (se exige clic/activación explícita).
- **Cliente CIMD.** `logo_uri` se renderiza sólo si el documento fue validado, el esquema es `https`
  y la CSP `img-src` lo permite por origen exacto del `client_id` (`img-src 'self' data:
  https://<host-del-client_id>`); si no, se muestra el monograma del nombre. `client_id` completo
  visible bajo el nombre (los clientes CIMD son URLs: es su identidad verificable).
- **Anti-enumeración.** `/login/magic-link/sent` muestra el mismo copy exista o no la invitación;
  nunca «no encontramos tu correo».
- **Errores del protocolo.** La página de error muestra título humano + `error` + `error_description`
  del `OAuthProtocolError` (ya sanitizados) + correlation id corto para soporte; nunca stack ni
  razón interna.
- **HTML accesible por construcción.** Un `h1` por página, `main` con `aria-labelledby`, campos con
  `label` explícito, `autocomplete` (`email`, `one-time-code`, `webauthn`), `role=alert` sólo en
  errores, `role=status` en confirmaciones, contraste verificado con axe en GVC.
- **Harness local.** `scripts/auth-server/dev-ui-server.ts` levanta `createAuthServerRequestHandler`
  con `InMemoryOAuthStore`, firmador P-256 local, `createStaticSubjectPort` y clientes fixture
  (CIMD con y sin logo, DCR, confidencial); `?fixture=` fuerza cada estado sin tocar KMS/PG.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Slice 1 no depende de TASK-1830; Slices 2–3 sólo arrancan con el
  contrato de flujo y las rutas JSON de TASK-1830 en `develop` (nunca sobre supuestos).
- `UI ready: yes` sólo al cerrar Slice 3 con GVC y scorecard; ningún slice cambia el contrato del
  protocolo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El shell rompe el contrato del formulario de consentimiento (campos/rutas) | identity / OAuth | low | tests existentes de `oauth-flow.test.ts` (afirman `action="/oauth/consent"` y campos) + test de render por pantalla | tests rojos; `auth.oauth.*` y canary de consentimiento |
| `logo_uri` de un cliente hostil abre vector de tracking/phishing | identity | medium | sólo CIMD validado, esquema https, CSP `img-src` por origen exacto, fallback a monograma; nunca `client_uri` clicable sin `rel=noopener` | `auth.oauth.cimd_rejected` |
| CSP relajada para fuentes/JS | identity | medium | decisión explícita en el decision log; `script-src` sólo nonce; test que afirma la cabecera CSP por página | test de CSP rojo |
| Copy inline fuera de `src/lib/copy/auth-server.ts` | UI | medium | lint `greenhouse/no-untokenized-copy` (si aplica al runtime) + revisión con `greenhouse-ux-writing` | lint |
| Contraste/foco insuficientes en la tarjeta | UI / a11y | medium | axe en GVC, tokens con contraste verificado, capturas de foco | `pnpm ui:quality` |

### Feature flags / cutover

- Sin flag propio: las pantallas viajan con el runtime y sólo son visibles cuando
  `AUTH_SERVER_OAUTH_ENABLED=true` (TASK-1829) y personas activo. Ambos están ON en el runtime
  compartido al readback 2026-09-05: desplegar modifica la superficie viva inmediatamente. El botón
  corporativo requiere además el gate interno específico de TASK-1836; no apagar todo OAuth como rollback.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (las plantillas mínimas de TASK-1829 vuelven); sin datos | < 15 min (deploy change-gated del auth-server) | sí |
| Slice 2 | revert PR; las rutas JSON de TASK-1830 siguen operativas | < 15 min | sí |
| Slice 3 | revert PR | < 15 min | sí |

### Production verification sequence

1. Slice 1 en `develop`: harness local + GVC desktop/mobile + scorecard; tests de contrato verdes.
2. Staging (servicio único) con `AUTH_SERVER_OAUTH_ENABLED=true`: `GET /oauth/authorize` de un
   cliente de prueba muestra el consentimiento nuevo con sesión de prueba de TASK-1830; `deny` y
   `allow` reales; axe sin errores serios.
3. Producción: llega con el release del runtime; verificación visual con un cliente canary de
   TASK-1832 antes de la primera cohorte.

### Out-of-band coordination required

- Aprobación de la dirección visual «Efeonce ID» por el operador (Product Design) antes de
  `UI ready: yes`.
- Fuentes locales con licencias OFL ya implementadas; conservar esos assets en el artefacto desplegado.
- Coordinación con la sesión dueña de TASK-1830 para el copy de métodos y el módulo WebAuthn.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Auditoría MCP de TASK-1836 §11/13: UI consume el mapping de assurance aprobado; muestra challenge/cancelación y consentimiento por cliente. SSO previo no equivale a aprobar un cliente nuevo. Actualizar flujo antes de implementación; el perfil proxy exige orden de preconsent distinto al login OIDC puro.

- [ ] Flujo interno Microsoft de TASK-1836 integrado en wireframe/flow y validado en GVC desktop/390, con teclado, errores y consentimiento; no duplica identidad ni reglas backend.

- [x] Se declaró `Execution profile: ui-ux` y `UI impact: flow`; wireframe, flow y motion existen y describen el diseño real (no stubs).
- [ ] `UI ready` permanece `no` hasta que exista la dirección visual aprobada, el implementation mapping, el GVC scenario plan y el decision log; si pasa a `yes`, `pnpm task:lint --task TASK-1835` sin findings.
- [x] El contrato del protocolo no cambia: `oauth-flow.test.ts` sigue verde sin editar sus asserts de rutas/campos.
- [ ] Ningún valor literal de color/tipografía/spacing en las plantillas: todo sale de `styles.generated.ts` y el drift test contra el SSOT pasa.
- [x] La pantalla de consentimiento muestra cliente (nombre + `client_id`), organización y cada scope con descripción es-CL; los scopes de escritura están marcados y `Permitir` nunca tiene foco inicial. **Delta 2026-09-05:** ese CTA ahora se llama `Autorizar acceso` (verbo + objeto, pasada de UX writing) y la fila de escritura se distingue por icono, palabra y tinte, no sólo por color; el consentimiento no lleva autofoco.
- [ ] `logo_uri` sólo se renderiza para clientes CIMD validados con esquema https y CSP por origen; en otro caso se muestra monograma.
- [x] Copy visible únicamente desde `src/lib/copy/auth-server.ts`, validado con `greenhouse-ux-writing`.
- [ ] Los estados loading/error/degraded/denied/long content/mobile/keyboard/reduced-motion de cada pantalla están implementados y capturados.
- [ ] CSP por página verificada por test: `default-src 'none'`, `script-src` sólo nonce (cuando hay WebAuthn), sin `unsafe-inline` en scripts.
- [ ] Anti-enumeración: el copy de magic link enviado y de recuperación es idéntico exista o no la invitación (test de render).
- [ ] GVC premium desktop 1440 + mobile 390 capturado y mirado para las 11 fixtures; dossier revisado; sin scroll horizontal; foco y reduced-motion evidenciados.
- [ ] Scorecard `docs/ui/reviews/TASK-1835-efeonce-id-login-consent-screens.scorecard.json` con promedio ≥ 4.5, piso ≥ 4 y ≥ 4.5 en jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template.
- [ ] `pnpm design-contract:lint --task TASK-1835`, `pnpm ui:code-lint --changed`, `pnpm ui:visual-gate --task TASK-1835` y `pnpm ui:quality --task TASK-1835` en verde.
- [ ] Patrón «runtime sin React» registrado en `docs/architecture/ui-platform/PATTERNS.md`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/auth-server`
- `pnpm auth-server:dev-ui` + `pnpm fe:capture task1835-efeonce-id --env=local` (o Playwright directo, ver `[verificar]`) + `pnpm fe:capture:review task1835-efeonce-id`
- `pnpm design-contract:lint --task TASK-1835` · `pnpm ui:code-lint --changed` · `pnpm ui:visual-gate --task TASK-1835` · `pnpm ui:quality --task TASK-1835`
- `pnpm task:lint --task TASK-1835`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` §5.1 y el manual `operar-autorizador-efeonce.md` actualizados con las pantallas finales; `EPIC-044` U06 cerrado.

## Follow-ups

- «Aplicaciones autorizadas» del usuario y gestión de consentimientos en Greenhouse (Admin Center) — task propia.
- Versión en inglés del copy (`en-US`) cuando llegue el primer cliente fuera de LatAm.
- Reutilizar el shell «Efeonce ID» en TASK-1834 (login del portal por el emisor).

## Open Questions

- Fuentes resueltas localmente: Poppins/Geist servidas desde rutas exactas del emisor, con licencias OFL y `font-src 'self'`; pendiente verificar su entrega tras deploy.
- ¿La pantalla de consentimiento muestra la organización cuando el sujeto tiene varias memberships
  `bound`? Para el slice interno TASK-1836 la autoridad está fijada por contexto server-side y `gv`
  por contexto. El `max(gv)` sólo describe el carril externo legacy. La UI informa la organización
  resuelta; no elige ni modifica autoridad mediante el formulario.

## Correction 2026-09-05 — TASK-1836

El ADR aceptado D1/D5 de TASK-1836 define login OIDC corporativo como primary y TOTP/passkey UV local para step-up sobre esa sesión. Mostrar ese recorrido y errores; no afirmar MFA por el mero retorno de Microsoft. Proxy a APIs upstream fuera de alcance.


### Dependencias de rollout (no bloquean implementación local)

Verificación interna en runtime requiere deploy TASK-1836 y consumer TASK-1831 compatible antes de habilitar la cohorte.


## Evidencia de first fold — 2026-09-05

[Revisión](../../ui/reviews/TASK-1835-first-fold-review.md). Harness scripts/auth-server/ui-preview-*.ts,
copy en src/lib/copy/auth-server-preview.ts, sin rutas productivas. GVC incorpora modo anonymous
explícito para no fabricar ni cargar sesiones del portal en login público. 27 pruebas focales del
contrato de captura; defaults agent, production gates y restricciones mutating conservados.

## Avance de integración local — 2026-09-05

La [review actualizada](../../ui/reviews/TASK-1835-first-fold-review.md) distingue el preview inicial
19035 del harness 19036 que consume renderers reales. Cuatro capturas GVC nuevas (consentimiento,
login, step-up y alta de factor) pasan en desktop/móvil. La verificación del controlador usa mocks;
no autentica personas ni ejecuta writes de negocio. Se mantienen sin marcar los criterios integrales
que requieren aprobación, matriz completa, review y runtime real.

## Entrada directa a Microsoft — 2026-09-06

Hallazgo del operador posterior a PR225: el botón de Claude existía pero `corporateLoginUrl`
lo ocultaba en `/login` sin `return_to`. El canary anterior inició desde OAuth y no acreditaba
la entrada directa. La corrección reutiliza el mismo botón, icono, shell y estilos; no es un rediseño.

Flujo directo: `/login` → botón Microsoft → `/auth/internal/login` → Entra → callback protegido
→ `/auth/session` HTML autenticado, con salida por el POST de logout existente. Sólo la ausencia
de `return_to` selecciona ese destino fijo; vacío/duplicado/inválido se rechaza. El único destino
adicional admitido es `/auth/session` exacto, sin query/fragmento; se valida al iniciar y al consumir
la transacción. OAuth conserva su retorno validado y crea sus contextos y permisos por su carril.
No se fabrica cliente, audiencia, grant ni contexto para iniciar una sesión directamente.

`GET /auth/session` reutiliza `resolvePersonSession`: HTML explícito muestra la confirmación y
logout; anónimo/revocado muestra login con401, sin afirmar sesión activa. JSON conserva su contrato,
`Vary: Accept` y no-store. Copy directo en `src/lib/copy/auth-server.ts` distingue sesión de permisos.
La dirección visual es reuse de «Nocturno editorial» de Claude, sin CSS ni primitive nuevos.

Validación local:235 pruebas pasan/4 live omitidas, tipos y lint dirigido correctos. Chromium6/6
para origen/CSP/redirect; renderers reales a1440px y390px con Microsoft visible, foco de teclado,
sin overflow ni errores JS; fixtures visuales no sustituyen sesión real. Revisión independiente
sin hallazgos de seguridad. Publicación y verificación de `/login` público todavía pendientes.
