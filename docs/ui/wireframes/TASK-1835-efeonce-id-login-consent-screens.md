# TASK-1835 — Efeonce ID: login, consentimiento y recuperación (wireframe)

## Meta

- Status: `draft`
- Owner task: TASK-1835
- Product Design asset: dirección visual «Efeonce ID» por materializar en `docs/ui/direction/TASK-1835-efeonce-id-direction.md` (Slice 1) comparando 2–3 direcciones; evidencia de partida: página mínima actual en `src/lib/auth-server/oauth/pages/render.ts` (isotipo del SSOT, tarjeta única) y contrato §5.1 de `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: personas de organizaciones cliente que conectan Claude / ChatGPT / Codex al MCP de Efeonce; operador Efeonce en pruebas y canaries (TASK-1832).
- Copy source: `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`).
- Primitive decision: `new` — primitives HTML+CSS del emisor (runtime `node:http`, sin React); tokens generados desde el SSOT.
- UI ready target: `no`

## Brief

Una sola tarjeta centrada bajo la marca Efeonce, que en cada paso responde tres preguntas en este
orden: **quién** pide (cliente / método), **qué** se concede o se hace, **qué pasa después**. La
persona llega desde una herramienta de IA, no desde Greenhouse: la tarjeta debe verse legítima
(marca, dominio `auth.efeonce.org`, sin popups), honesta (scopes explicados, escritura marcada) y
terminable en una acción. Sin dashboard, sin navegación, sin decoración que compita con la decisión.

## Desktop Target — 1440×1000

Fondo neutro claro del SSOT con una veladura sutil de marca en la parte superior (no gradiente
protagonista). Cabecera de marca fuera de la tarjeta: isotipo (44 px) + «Efeonce ID» + dominio
visible `auth.efeonce.org` como señal de legitimidad. Tarjeta centrada de 440 px, radio y sombra
por tokens, padding 40/36. Dentro, de arriba abajo: contexto del cliente (monograma o logo 40 px,
nombre, `client_id` en monoespaciado de sistema pequeño), título `h1`, organización a la que se
accede, lista de permisos (una fila por scope: icono de lectura/escritura, título humano, descripción
de una o dos líneas, etiqueta «Escritura» en los de escritura), nota de revocación, acciones en fila
(secundario a la izquierda, primario a la derecha, ancho igual). Pie fuera de la tarjeta con «Ayuda»
y «Privacidad» (enlaces al sitio público). Nada por encima del fold que no sea la decisión.

## Mobile Target — 390×844

Misma tarjeta a ancho completo con márgenes de 16 px y padding 28/20; cabecera de marca reducida
(isotipo 36 px + nombre). El contexto del cliente ocupa una fila; la lista de scopes conserva
descripciones completas (no se truncan; la tarjeta crece). Acciones apiladas: primario arriba a
ancho completo, secundario debajo como botón de texto. Campos de formulario con `inputmode`
correcto y altura táctil ≥ 44 px. Sin scroll horizontal; el scroll vertical es del documento, nunca
interno a la tarjeta.

## Action Hierarchy

- Primary: «Permitir» (consent), «Usar mi passkey» (login, ANTES del correo: credenciales descubribles), «Continuar» (página intermedia del enlace, POST consume), «Verificar código» (step-up).
- Secondary: «Cancelar» (consent → `access_denied`), «Enviarme un enlace» (con el correo), «Pedir un enlace nuevo», «Usar código de respaldo».
- Destructive: ninguna; «Cancelar» del consent se explica antes de enviar («Volverás a {client} sin acceso»).
- Selection vs action: elegir método no autentica; sólo el paso final (enlace verificado, passkey OK, código OK) crea sesión.
- Pending / disabled: al enviar, primario en pending con copy «Confirmando…»/«Enviando…»; secundario deshabilitado; sin doble submit.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Marca (isotipo, «Efeonce», eslogan) | `src/config/efeonce-brand.ts` + `public/branding/SVG/isotipo-full-efeonce.svg` bundleado | Legitimidad y reconocimiento | Ningún logo re-dibujado ni color de marca literal |
| Navy del isotipo | token de color primario del SSOT (`src/lib/design-tokens/*`) exportado al CSS generado | Un solo acento para acciones y foco | `#023c70` escrito en el CSS de las plantillas |
| Tipografía del portal | `typography-tokens.ts`: Poppins para texto, Geist `tabular-nums` para códigos/números | Misma voz visual que Greenhouse | `font-size` inline; fuentes de terceros sin decisión |
| Botones del DS | primitives `IdButton primary|secondary|link` con los mismos radios/alturas por token | Jerarquía de acciones idéntica al portal | Botón MUI (no ejecutable en este runtime) |
| Estados del DS (`state-design`) | `IdStatus info|success|warning|error` con icono + texto | Estado nunca sólo por color | Color como única señal |
| Espaciado 4n | escala de spacing del SSOT en el CSS generado | Ritmo consistente | `px` sueltos |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Brand header | Legitimidad: isotipo + «Efeonce ID» + dominio | `layout.ts` (`IdShell`) | `EFEONCE_BRAND_NAME`, `GH_AUTH_SERVER.brand_title` |
| 1 | Client context | Quién pide: monograma/logo, nombre, `client_id` | `IdClientBadge` | `OAuthClientRecord` (nombre, `clientId`, `metadata.cimd.logo_uri`) |
| 2 | Title + org | Qué se decide y sobre qué organización | `IdCard` header | handler (`AuthenticatedSubject`, memberships `bound`) |
| 3 | Scopes / form | Permisos (consent) o campos (login/step-up) | `IdScopeList` · `IdField` | scopes pedidos + `GH_AUTH_SERVER.scope_descriptions` |
| 4 | Status | Pending, error inline, confirmación | `IdStatus` (`role=alert|status`) | estado del request |
| 5 | Actions | Primario/secundario | `IdButton` | `POST /oauth/consent` · rutas de TASK-1830 |
| 6 | Footer | Ayuda, privacidad, versión corta del emisor | `layout.ts` | `EFEONCE_URL_HTTPS` |

## Copy Ledger

Propuestas para `src/lib/copy/auth-server.ts` (`GH_AUTH_SERVER`); los ids existentes se conservan.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| brand_domain | 0 | auth.efeonce.org | — | Señal de legitimidad; texto, no enlace |
| consent_title | 2 | Autorizar acceso | — | existe |
| consent_intro | 2 | {clientName} quiere acceder a tu cuenta de Efeonce con estos permisos: | clientName | existe |
| consent_org_label | 2 | Organización | — | nuevo |
| consent_org_multiple | 2 | Tus organizaciones vinculadas: {names} | names | nuevo; informa, no elige |
| consent_write_badge | 3 | Escritura | — | nuevo; junto al scope |
| consent_read_badge | 3 | Lectura | — | nuevo |
| consent_deny_hint | 5 | Volverás a {clientName} sin acceso. | clientName | nuevo; bajo «Cancelar» |
| consent_pending | 4 | Confirmando… | — | nuevo; `aria-busy` |
| consent_footer | 6 | Puedes revocar este acceso en cualquier momento desde Efeonce. | — | existe |
| login_* / confirm_* / link_* / session_* | 2–5 | (ya existen en `src/lib/copy/auth-server.ts`, agregados por TASK-1830 el 2026-09-04) | — | La UI los consume tal cual; cualquier ajuste se negocia con TASK-1830 |
| (login) orden de la pantalla | 3–5 | «Usar mi passkey» primero; luego «Correo de trabajo» + «Enviarme un enlace» | — | Credenciales descubribles: passkey no pide correo |
| login_passkey_cta · login_passkey_unsupported · login_passkey_failed · login_email_fallback_hint | 3–5 | (ids de TASK-1830, 2026-09-04) «Entrar con mi passkey»; sin soporte del dispositivo; la ceremonia no resultó; pista para usar el enlace | — | **Dos estados distintos, nunca el mismo mensaje:** `unsupported` es del dispositivo y NO ofrece reintento (sólo el fallback al enlace); `failed` SÍ ofrece «Intentar de nuevo» + el fallback |
| (revisa tu correo) | 2–3 | Copy y tiempo de respuesta IDÉNTICOS exista o no el correo; misma pantalla tras aceptar invitación | email | Anti-enumeración (TASK-1830) |
| (enlace) página intermedia | 2–5 | `GET /m/<tokenId>.<verificador>` muestra «Continuar» que hace el POST de consumo; expirado/usado → «Pedir un enlace nuevo» | — | Los escáneres de correo abren los GET |
| stepup_title | 2 | Confirma que eres tú | — | nuevo |
| stepup_code_label | 3 | Código de tu app de autenticación | — | nuevo; `one-time-code` |
| stepup_backup_cta | 5 | Usar un código de respaldo | — | nuevo |
| stepup_error_invalid | 4 | El código no es válido. Inténtalo de nuevo. | — | nuevo; inline |
| recovery_title | 2 | Tu invitación ya no está activa | — | nuevo |
| recovery_body | 3 | Pídele a tu contacto en Efeonce que te envíe una invitación nueva. | — | nuevo; sin formulario |
| session_title | 2 | Sesión activa | — | nuevo |
| session_logout_cta | 5 | Cerrar sesión | — | nuevo |
| error_correlation | 4 | Referencia: {correlationId} | correlationId | nuevo; para soporte |
| error_rate_limited_body | 3 | Demasiados intentos. Espera un momento y vuelve a intentarlo. | — | existe |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Autorizar acceso | {clientName} quiere acceder… + lista de permisos | Permitir · Cancelar | Escritura marcada; foco inicial en el título |
| loading | Autorizar acceso | Confirmando… | CTAs deshabilitados | `aria-busy`; texto siempre presente |
| empty | Inicia sesión en Efeonce | Campo de correo vacío con ayuda | Continuar deshabilitado hasta correo válido | Sólo login |
| partial | Revisa tu correo | (copy `link_*`/`confirm_*` de TASK-1830) | Pedir un enlace nuevo (tras 60 s) | Anti-enumeración incluida la latencia; misma pantalla tras aceptar invitación |
| confirm | Continuar a Efeonce | Página intermedia del enlace: un botón «Continuar» hace el POST de consumo | Continuar · Pedir un enlace nuevo (si expiró) | Nunca se consume por GET |
| error | No pudimos completar la autorización | Cuerpo por código + Referencia | Volver a la aplicación (si hay redirect válido) | Sin detalle interno |
| denied | Tu cuenta no tiene una organización vinculada | Explicación breve | Pedir acceso a tu contacto en Efeonce | `access_denied`; sin PII |
| stepup | Confirma que eres tú | Código de tu app | Verificar código · Usar código de respaldo | Error inline conserva el valor; sin «recordar este dispositivo» (el `amr` sale de la aserción real, TASK-1830) |
| passkey_unsupported | (login) | `login_passkey_unsupported` | Sólo «Enviarme el enlace» (sin reintento) | Del dispositivo/navegador; el botón de passkey se oculta o deshabilita |
| passkey_failed | (login) | `login_passkey_failed` | «Intentar de nuevo» · «Enviarme el enlace» | La ceremonia falló o se canceló; sí tiene reintento útil |
| totp_enroll (pending) | (`totp_*` de TASK-1830) QR + secreto alterno + 10 códigos de respaldo | El servidor los entrega UNA sola vez; no hay endpoint para volver a pedirlos | Checkbox obligatorio «Ya guardé mis códigos» ANTES de habilitar «Continuar»; luego campo de código | El enrolamiento queda `pending` hasta un código correcto: esta pantalla NO celebra nada |
| totp_enroll (confirmado) | Segundo factor activo | Confirmación sólo tras código válido (`totp_*` confirmación) | Volver a la aplicación / `return_to` | El éxito es después del código, nunca al mostrar el QR |
| totp_envelope_unavailable | Degradación honesta (`totp_*` envelope caído) | Explica que las lecturas siguen funcionando y la escritura espera | Volver a la aplicación con permisos de lectura | Copy de degradación, no «error de sistema» |
| invitation_confirm | Activa tu acceso (`confirm_invitation_*`) | Botón que hace el POST de aceptación | Activar mi acceso | No abre sesión; después «revisa tu correo» (`invitation_accepted_*`) |
| access_revoked | Tu acceso ya no está activo (`link_access_revoked_*`) | Sin PII; a quién escribir | — | Sustituye a la antigua «recovery» |
| session_started / session_closed | `session_started_*` / `session_closed_*` | Volver a la aplicación / cerrar pestaña | — | Terminales |
| rate_limited | Demasiados intentos | Espera un momento… | Reintentar (deshabilitado por N s) | `slow_down` |

## Accessibility Contract

- Heading order: un `h1` por página (título de la tarjeta); «Efeonce ID» de la cabecera es texto de marca, no heading.
- Chart/table alternatives: la lista de scopes es `ul` con `li` semánticos; sin tablas.
- Aria labels: `main aria-labelledby=h1`; `IdStatus` con `role=alert` (errores) o `role=status` (confirmaciones), una sola región viva; botones con texto visible (sin icon-only); logo del cliente con `alt` = nombre del cliente.
- Focus notes: foco inicial en el primer campo (login/step-up) o en el `h1` (consent/error); anillo de foco de 2 px por token visible sobre todos los fondos; tras error inline el foco vuelve al campo con `aria-describedby`.
- Color-independent state labels: lectura/escritura con etiqueta de texto + icono; estados con texto siempre.
- Formularios: `label` explícito, `autocomplete` (`email`, `one-time-code`, `webauthn`), `inputmode` correcto, errores asociados por `aria-describedby`, `Enter` envía sólo en login/step-up (en consent con scopes de escritura se exige activación explícita del botón).

## Implementation Mapping

- Route / surface: `GET /oauth/authorize` (consent 200 · login_required 401 · step-up 403 · error), `POST /oauth/consent`; rutas de TASK-1830: `GET /login`, `GET /m/<tokenId>.<verificador>`, `GET /i/<token>`, `/auth/*` (magic-link request/consume, invitations/accept, passkeys, totp, session, session/logout).
- Primitives: `IdShell`, `IdCard`, `IdClientBadge`, `IdScopeList`, `IdField`, `IdStatus`, `IdButton` como funciones `render*(input) → string` en `src/lib/auth-server/oauth/pages/`.
- Variants / kinds: `IdButton primary|secondary|link`; `IdStatus info|success|warning|error`; `IdScopeList` items `read|write`.
- Component candidates: `layout.ts`, `consent.ts`, `login.ts`, `magic-link.ts`, `passkey.ts`, `step-up.ts`, `recovery.ts`, `session.ts`, `error.ts`; `styles.generated.ts` (tokens → CSS).
- Copy source: `src/lib/copy/auth-server.ts`.
- Data reader / command: DTOs del handler (`ConsentPageInput` extendido con `client.logoUri`, `organizations`, `correlationId`); TASK-1830 provee los DTOs de login/step-up/sesión.
- API parity: la UI es cliente de `grantClientConsent`/`revokeClientConsent` y de los commands de sesión; sin lógica propia.
- Access / capability: ninguna nueva.
- Runtime consumers: sólo `services/auth-server`; ningún email/PDF.
- Print/email/PDF considerations: no aplica.
- GVC markers: `id-shell`, `id-client`, `id-scopes`, `id-actions`, `id-status`, `id-form`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1835-efeonce-id.scenario.ts` (nuevo al implementar).
- Route: harness local `pnpm auth-server:dev-ui` (`http://127.0.0.1:8787`) con `?fixture=consent|consent-write|login|magic-sent|magic-verify|passkey|step-up|recovery|denied|error|slow_down`; `[verificar]` soporte de base URL en `pnpm fe:capture --env=local`, si no Playwright directo con el mismo DSL.
- Viewports: 1440×1000 y 390×844.
- Quality profile: `premium`.
- Required steps: consent lectura → allow pending → consent con escritura → deny → login correo → magic-sent → magic-verify ok/expirado → step-up error/ok → denied → error `invalid_client` → `slow_down`.
- Required captures: cada fixture en ambos viewports + foco visible + `prefers-reduced-motion`.
- Required data-capture markers: los seis de arriba, registrados en el shell antes de capturar.
- Assertions: `scrollWidth === clientWidth`; foco inicial nunca en «Permitir»; escritura marcada; sin `sub`/token en el DOM; CSP `script-src` sin `unsafe-inline`; axe sin violaciones serias.
- Scroll-width checks: en las 22 capturas.
- Accessibility/focus checks: orden de tabulación, `role=alert|status`, contraste ≥ 4.5:1, etiquetas y `autocomplete`.
- Reduced-motion evidence: misma secuencia con la preferencia activada; entrada sin transición.
- Review dossier: `pnpm fe:capture:review task1835-efeonce-id` obligatorio.
- Baseline: baseline nuevo `efeonce-id` declarado en la dirección visual; sin surface ID de Figma (repo-native).

## Design Decision Log

- Decision: una tarjeta, una decisión por pantalla, marca fuera de la tarjeta como sello de legitimidad, tokens del SSOT por artefacto generado, sin framework.
- Alternatives considered: app Next.js separada (rechazada: segundo runtime y cookies); reutilizar MUI del portal (rechazada: no ejecutable en `node:http`); mantener la página mínima (rechazada: no cumple el estándar premium ni explica los scopes).
- Why this pattern: máxima legibilidad de la decisión de consentimiento, CSP estricta, render determinista y testeable como string, coherencia visual con el portal por tokens compartidos.
- Reuse / extend / new primitive: `new` (primitives HTML del emisor), registradas como patrón «runtime sin React» en la UI Platform.
- Open risks: dirección visual pendiente de aprobación; fuentes web vs sistema (peso/CSP); `logo_uri` de clientes CIMD (allowlist por origen); el módulo WebAuthn (TASK-1830) exige nonce en CSP.
- Follow-up: dirección visual + lookup de tokens de motion/spacing antes de escribir HTML.

## Acceptance Checklist

- [ ] Dirección visual «Efeonce ID» aprobada y versionada en `docs/ui/direction/`.
- [ ] Copy final de cada estado en `src/lib/copy/auth-server.ts`, validado con `greenhouse-ux-writing`.
- [ ] GVC premium desktop + 390 px y scorecard ≥ 4.5 demuestran jerarquía, legitimidad y accesibilidad.
