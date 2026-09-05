# TASK-1835 — Efeonce ID: login, consentimiento y recuperación Flow Contract

## Delta 2026-09-05 — dirección aprobada «Nocturno editorial» (implementada)

El operador eligió la dirección **A · Nocturno editorial** entre tres exploradas en un lienzo de
diseño, y ya está en el producto (`802b5b869`, `501f54b52`, `300d3c5cf`). Lo que cambia respecto de
lo escrito arriba, que describía la tarjeta centrada sobre fondo claro:

- **Composición del login.** El lienzo ENTERO es el campo de marca —degradado radial sobre la rampa
  azul de AXIS más un grano de 1px— y la tarjeta clara flota encima. Desde 64rem se abre en dos: el
  panel de marca a la izquierda con el logotipo institucional en negativo, kicker, titular con
  palabra acentuada y línea de confianza; el formulario a la derecha. Bajo 64rem el panel se retira
  y queda el campo con la tarjeta y la marca arriba.
- **El formulario va PRIMERO en el DOM**; el orden visual lo pone CSS, para que el foco y los
  lectores de pantalla lleguen antes al campo que al mensaje de marca.
- **Sólo el login cambia de composición.** Consentimiento, verificación, step-up y error conservan la
  columna centrada: son decisiones puntuales, no una bienvenida.
- **El campo de marca se fija en claro y oscuro.** La tarjeta re-declara los tokens claros en su
  subárbol; el resto de las pantallas conserva el sistema claro/oscuro con los neutrales de AXIS.

- **Jerarquía de métodos.** El enlace por correo es la puerta de la mayoría (personas invitadas) y se
  queda con el botón primario; el acceso del equipo interno delega en Microsoft, va en secundario y
  lleva el logo oficial, como pide el botón estándar de Microsoft. Entre ambos, un separador.
- **Sin estado de carga en el envío.** El formulario es un POST sin JavaScript por diseño de la CSP:
  la única señal de progreso es el indicador de navegación del navegador. El step-up sí tiene estado
  de espera porque ahí corre su controlador.


## Meta

- Status: `draft`
- Owner task: TASK-1835
- Related wireframe: docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md
- Program master flow: docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md — esta superficie es sus nodos `consent`, `login`, `magic-link`, `passkey`, `step-up`, `recovery`, `session` y `error`.
- Intended route / surface: `auth.efeonce.org` — `/oauth/authorize`, `POST /oauth/consent`, `/login*`, `/session`.
- Flow type: `command-backed`
- Primary primitives: `IdShell`, `IdCard`, `IdClientBadge`, `IdScopeList`, `IdField`, `IdStatus`, `IdButton` (HTML server-rendered).
- Copy source: src/lib/copy/auth-server.ts.

## Flow Brief

Una herramienta de IA redirige a la persona a `/oauth/authorize`. El servidor decide en este
orden: cliente y redirect válidos → sesión de persona → step-up si hay escritura → consentimiento →
binding `bound` → code y vuelta a la aplicación. La UI cubre cada parada de esa cadena con una
pantalla que responde quién/qué/después y devuelve siempre a la aplicación o a un estado terminal
con salida. Éxito = redirect al `redirect_uri` con `code`; el consentimiento y la sesión los crea el
servidor, nunca el navegador.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| `/oauth/authorize` (consent 200) | Decisión de acceso | Tarjeta con cliente, organización, scopes, Permitir/Cancelar | CTAs apilados | `IdCard` + `IdScopeList` |
| `/oauth/authorize` (login_required 401 → redirect a `/login?return_to=`) | Entrada sin sesión | Con TASK-1830, redirect; hoy página mínima | Igual | `IdShell` |
| `GET /login` | Passkey primero, luego correo + enlace | «Usar mi passkey» (ceremonia con credenciales descubribles) arriba; debajo «Correo de trabajo» + «Enviarme un enlace» (`POST /auth/magic-link/request`) | Igual, botones a ancho completo | `IdButton` + `IdField` + módulo WebAuthn (nonce) |
| «Revisa tu correo» | Espera (tras pedir enlace o aceptar invitación) | Copy y latencia idénticos exista o no el correo; «Pedir un enlace nuevo» tras 60 s | Igual | `IdStatus info` |
| `GET /m/<tokenId>.<verificador>` | Página intermedia del enlace | Botón «Continuar» → `POST /auth/magic-link/consume` → sesión → `return_to`; expirado/usado → CTA | Igual | `IdButton primary` + `IdStatus` |
| `GET /i/<token>` | Aceptar invitación | Confirmar → `POST /auth/invitations/accept` → NO abre sesión: envía magic link → «Revisa tu correo» | Igual | `IdCard` + `IdButton` |
| `/login/step-up` | Segundo factor | Código TOTP / código de respaldo | `inputmode=numeric` | `IdField one-time-code` |
| `/login/recovery` | Invitación inválida | Explicación + a quién pedir re-invitación | Igual | `IdStatus warning` |
| `GET /auth/session` / `/session` | Sesión activa | «Cerrar sesión» → `POST /auth/session/logout` | Igual | `IdButton secondary` |
| Error (`invalid_client`, `invalid_redirect_uri`, `access_denied`, `slow_down`) | Terminal | Título humano + código + referencia | Igual | `IdStatus error` |

## Flow Map

1. Entry: `GET /oauth/authorize?client_id&redirect_uri&scope&state&code_challenge…` desde la aplicación. Cliente y redirect se validan antes de renderizar nada (error → página, nunca redirect).
2. Primary action: sin sesión → `/login?return_to=<authorize URL>` (TASK-1830). Primero «Usar mi passkey» (sin correo); si no, correo + «Enviarme un enlace».
3. Transition: magic link → «revisa tu correo» (idéntico exista o no) → clic en el correo abre `GET /m/<tokenId>.<verificador>` (sin consumir) → «Continuar» hace el POST de consumo → sesión creada → redirect a `return_to`; passkey → ceremonia `start/finish` → sesión → redirect a `return_to`. Invitación: `GET /i/<token>` → aceptar → magic link → «revisa tu correo» → mismo camino.
4. User decision: `authorize` re-evalúa: escritura sin `step_up` → `/login/step-up?return_to=`; consentimiento faltante → página de consent; `Permitir` → `POST /oauth/consent decision=allow` → `303 return_to` → `authorize` emite `302 redirect_uri?code&state&iss`.
5. Completion: la aplicación recibe el `code`; la persona ve la pantalla de la propia aplicación. `Cancelar` → `302 redirect_uri?error=access_denied&state&iss`.
6. Recovery / exit: sujeto sin binding → `access_denied` (página o redirect según `prompt`); enlace expirado → «Pedir un enlace nuevo»; invitación revocada → `/login/recovery`; `slow_down` → espera y reintento; error de protocolo → página terminal con referencia.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Permitir | Consent | `POST /oauth/consent allow` → pending → 303 | Activación explícita del botón (Tab + Enter/Espacio) | `Enter` en el documento NO envía cuando hay escritura |
| Cancelar | Consent | `POST /oauth/consent deny` → 302 `access_denied` | Tab + Enter | Hint «Volverás a {client} sin acceso» |
| Usar mi passkey | Login (primero) | `POST /auth/passkeys/authenticate/start` → ceremonia → `finish` → sesión | Enter | Sin correo; requiere JS con nonce; fallback visible al enlace |
| Enviarme un enlace | Login (correo) | `POST /auth/magic-link/request` → «revisa tu correo» | Enter en el campo | Respuesta idéntica exista o no |
| Continuar (enlace) | `GET /m/<tokenId>.<verificador>` | `POST /auth/magic-link/consume` → sesión → `return_to` | Enter | El GET nunca consume |
| Aceptar invitación | `GET /i/<token>` | `POST /auth/invitations/accept` → magic link → «revisa tu correo» | Enter | No abre sesión |
| Verificar código | Step-up | `POST /auth/totp/verify` → sesión `step_up` → `return_to` | Enter | Error inline conserva el valor |
| Usar código de respaldo | Step-up | Campo alterno | Tab + Enter | Mismo formulario |
| Pedir un enlace nuevo | Magic sent/expired | `/login?email=` | Enter | Aparece tras 60 s en `sent` |
| Cerrar sesión | Session | `POST /auth/session/logout` → `/login` | Enter | Sin confirmación |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| validating | Cliente/redirect en validación | GET authorize | válido / inválido | Sin render intermedio (server) |
| error_terminal | Cliente o redirect inválidos | validación falla | ninguno (cerrar pestaña) | Página con código + referencia; sin redirect |
| login_required | Sin sesión | `SubjectSessionPort` null | sesión creada | Redirect a `/login` (TASK-1830); hoy página 401 |
| login_email | Correo pendiente | `/login` | método elegido | Foco en el campo; Continuar deshabilitado hasta correo válido |
| magic_sent | Enlace enviado (o no) | request | clic en correo / 60 s | Copy idéntico exista o no la invitación |
| link_confirm | Página intermedia del enlace | `GET /m/<tokenId>.<verificador>` | Continuar (POST) → ok / expirado / usado | Botón explícito; el GET no consume (escáneres de correo) |
| invitation_accept | Aceptar invitación | `GET /i/<token>` | aceptar → «revisa tu correo» | No crea sesión |
| totp_enroll_pending | QR/secreto/códigos mostrados una vez | `POST /auth/totp/enroll/start` | confirmación «ya guardé» + código válido (`enroll/finish`) | Sin éxito visible hasta el código; sin re-solicitud de códigos |
| totp_envelope_unavailable | Envelope KMS caído | `enroll`/`verify` fallan cerrados | ninguno (volver con lectura) | Degradación honesta: lecturas siguen; escritura espera |
| passkey_ceremony | WebAuthn en curso | botón | ok / cancelado / no soportado | Estados del módulo; fallback a magic link |
| step_up | Escritura exige 2FA | authorize con scope write y `authLevel=primary` | código ok | Campo `one-time-code`; error inline; límite por TASK-1830 |
| consent_pending_decision | Falta consentimiento | authorize sin consents | allow / deny | `Permitir` sin foco inicial; escritura marcada |
| consent_submitting | POST en vuelo | Permitir/Cancelar | 303/302 | Pending + `aria-busy`; ambos botones deshabilitados |
| denied | Sin binding / revocado | grants no `bound` | ninguno | Explicación + a quién pedir acceso |
| rate_limited | `slow_down` | 429 | espera | Reintento deshabilitado N s |
| completed | Code emitido | consent ok + bound | redirect | La persona ya no ve Efeonce ID |
| session_active | Sesión existente | `/session` | logout | Cerrar sesión |

## Routing Contract

- Route changes: rutas HTML nuevas de TASK-1830 (`/login*`, `/session`); `/oauth/*` no cambia. `return_to` sólo acepta paths del propio origen que empiecen por `/oauth/authorize?` (ya validado en `handleConsent`).
- Canonical URL: `https://auth.efeonce.org/...`; ninguna pantalla se enlaza desde Greenhouse.
- Deep-link behavior: `/login` sin `return_to` termina en `/session`; `/oauth/authorize` sin params → página de error `invalid_request`.
- Back button behavior: volver desde consent a `/login` no cierra sesión; volver desde la aplicación a consent re-ejecuta `authorize` (idempotente: si ya consintió, redirige con code nuevo).
- Reload behavior: recargar consent re-renderiza el mismo estado; recargar `verify` con token usado → «ya no es válido» + CTA.
- Shareability: ninguna URL confiere acceso; `return_to` no contiene secretos; los enlaces de magic link son de un solo uso.

## Focus & Accessibility

- Initial focus: campo de correo/código en formularios; `h1` en consent, error y estados terminales; nunca en «Permitir».
- Escape behavior: sin overlays; Escape no hace nada.
- Click-away behavior: no aplica.
- Focus restore: tras error inline, al campo con `aria-describedby`; tras `slow_down`, al `h1` del estado.
- Modal vs non-modal semantics: páginas completas; sin `aria-modal`.
- Screen reader announcement: una región viva por página; errores `role=alert`, confirmaciones `role=status`; el cambio de página lo anuncia el título del documento.
- Keyboard traversal: cabecera (sin tabulación) → contenido → secundario → primario en desktop (izquierda→derecha); en mobile primario antes que secundario en el DOM.
- Reduced motion: entrada de tarjeta sin transición; pending sin animación (texto + `aria-busy`).

## Data & Command Boundaries

- Readers: `resolveClient` (cliente + `metadata.cimd.logo_uri`), `listActiveConsents`, `GrantsVersionPort` (memberships `bound` para «Organización»), sesión de TASK-1830.
- Commands: `grantClientConsent` (vía `POST /oauth/consent`), commands de sesión/magic link/passkey/TOTP de TASK-1830; la UI sólo invoca.
- API routes: `/oauth/*` (TASK-1829), `/auth/*` (TASK-1830). Ninguna nueva.
- Optimistic updates: ninguno; todo estado viene del servidor tras el POST.
- Cache / invalidation: `Cache-Control: no-store` en todas las páginas; sin estado en el navegador salvo la cookie `__Host-efeonce_auth` (TASK-1830).
- Audit / signals: el handler audita `authorize`/`consent_granted`/`consent_revoked`; la UI no emite nada.
- Tenant / access boundary: la organización mostrada sale de las memberships `bound` resueltas por el servidor; nunca de un parámetro.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| `invalid_client` / `invalid_redirect_uri` | Página de error terminal con código y referencia | Cerrar y volver a la aplicación | Nunca redirect |
| `access_denied` (unbound) | Explicación + a quién pedir acceso | Contacto en Efeonce | Sin PII; redirect a la app si `prompt=none` |
| `consent_required` con `prompt=none` | Redirect a la app con error | La app reintenta sin `prompt=none` | Sin pantalla |
| Magic link expirado/usado | «Este enlace ya no es válido» | Pedir un enlace nuevo | Copy anti-enumeración |
| Passkey sin soporte (`login_passkey_unsupported`) | Estado del dispositivo, sin botón de reintento | Sólo «Enviarme el enlace» | Distinto de «no resultó»: reintentar aquí manda a la persona a revisar lo que no es |
| Passkey falló/cancelada (`login_passkey_failed`) | Estado con «Intentar de nuevo» | Reintento + fallback al enlace | Sí tiene reintento útil |
| TOTP incorrecto | Error inline | Reintentar; código de respaldo | Límite de intentos (TASK-1830) |
| `slow_down` (429) | «Demasiados intentos» | Esperar y reintentar | Sin contador exacto |
| Proveedor de correo degradado | Mismo copy de `sent` | Pedir un enlace nuevo tras 60 s | No revelar el fallo |

## GVC Scenario Plan

- Scenario: task1835-efeonce-id.
- Scenario file: `scripts/frontend/scenarios/task1835-efeonce-id.scenario.ts`, declarado en el wireframe.
- Route: harness local `pnpm auth-server:dev-ui` con `?fixture=`.
- Viewports: 1440×1000 y 390px.
- Required steps: la secuencia del Flow Map con allow pending, deny, magic sent/expired, step-up error/ok, denied, error y slow_down.
- Required captures: cada estado en ambos viewports + foco + reduced-motion.
- Required data-capture markers: `id-shell`, `id-client`, `id-scopes`, `id-actions`, `id-status`, `id-form`.
- Assertions: ningún frame con «Permitir» enfocado por defecto; escritura marcada; sin token/`sub` en el DOM; CSP sin `unsafe-inline` en scripts.
- Scroll-width checks: igualdad de ancho de documento en todas.
- Accessibility/focus checks: orden de tabulación, `role=alert|status`, axe.
- Reduced-motion evidence: misma secuencia sin transiciones.

## Design Decision Log

- Decision: cada parada de la cadena `authorize` tiene una pantalla terminal o de decisión; ninguna pantalla mantiene estado en el navegador.
- Alternatives considered: SPA con estados en cliente (rechazada: JS innecesario y CSP más laxa); modal de consentimiento dentro de la app cliente (imposible: el consentimiento vive en el emisor).
- Why this pattern: mínima superficie de ataque, cada estado es una URL server-rendered verificable, y el consentimiento se materializa sólo por POST.
- Reuse / extend / new primitive: `new` (primitives HTML del emisor).
- Open risks: rutas HTML finales de TASK-1830 (nombres y params) pueden ajustarse; el flujo maestro las gobierna.
- Follow-up: alinear con el contrato de flujo de TASK-1830 antes de Slice 2.

## Acceptance Checklist

- [ ] Cada estado del State Machine tiene pantalla, copy y recuperación implementados.
- [ ] Recorrido completo por teclado y a 390 px sin scroll horizontal.
- [ ] GVC secuencial demuestra el flujo entero (consent → allow → redirect; login → magic → verify → consent).

## Extensión corporativa TASK-1836

Authorize 401 conserva retorno validado hacia login; Microsoft lleva a `/auth/internal/login` y
el callback vuelve al authorize original tras enrollment canónico, sin otorgar consentimiento.
Conservar el 401 del contrato; no sustituirlo silenciosamente por redirect automático. Para escritura,
UV usa `/auth/passkeys/step-up/start|finish` o TOTP verify sobre la misma sesión. El consentimiento
expone organización interna exacta del contexto; `gv=max` sólo pertenece al recorrido externo legacy.
DOM y tabulación conservan el mismo orden en ambos viewports.
