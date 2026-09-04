# TASK-1835 — Efeonce ID: login, consentimiento y recuperación Flow Contract

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
| `/login` | Correo + método | Campo de correo, «Enviarme un enlace» / «Usar mi passkey» | Igual, botones a ancho completo | `IdField` + `IdButton` |
| `/login/magic-link/sent` | Espera | Copy anti-enumeración, CTA «Pedir un enlace nuevo» tras 60 s | Igual | `IdStatus info` |
| `/login/magic-link/verify?token` | Consumo del enlace | Verificando… → redirect a `return_to` o expirado | Igual | `IdStatus` |
| `/login/passkey` | Ceremonia WebAuthn | Botón «Usar mi passkey» + estados del módulo JS (nonce) | Igual | `IdStatus` + módulo TASK-1830 |
| `/login/step-up` | Segundo factor | Código TOTP / código de respaldo | `inputmode=numeric` | `IdField one-time-code` |
| `/login/recovery` | Invitación inválida | Explicación + a quién pedir re-invitación | Igual | `IdStatus warning` |
| `/session` | Sesión activa | Cerrar sesión | Igual | `IdButton secondary` |
| Error (`invalid_client`, `invalid_redirect_uri`, `access_denied`, `slow_down`) | Terminal | Título humano + código + referencia | Igual | `IdStatus error` |

## Flow Map

1. Entry: `GET /oauth/authorize?client_id&redirect_uri&scope&state&code_challenge…` desde la aplicación. Cliente y redirect se validan antes de renderizar nada (error → página, nunca redirect).
2. Primary action: sin sesión → `/login?return_to=<authorize URL>` (TASK-1830). La persona escribe su correo y elige método.
3. Transition: magic link → `sent` → clic en el correo → `verify` → sesión creada → redirect a `return_to`; passkey → ceremonia → sesión → redirect a `return_to`.
4. User decision: `authorize` re-evalúa: escritura sin `step_up` → `/login/step-up?return_to=`; consentimiento faltante → página de consent; `Permitir` → `POST /oauth/consent decision=allow` → `303 return_to` → `authorize` emite `302 redirect_uri?code&state&iss`.
5. Completion: la aplicación recibe el `code`; la persona ve la pantalla de la propia aplicación. `Cancelar` → `302 redirect_uri?error=access_denied&state&iss`.
6. Recovery / exit: sujeto sin binding → `access_denied` (página o redirect según `prompt`); enlace expirado → «Pedir un enlace nuevo»; invitación revocada → `/login/recovery`; `slow_down` → espera y reintento; error de protocolo → página terminal con referencia.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Permitir | Consent | `POST /oauth/consent allow` → pending → 303 | Activación explícita del botón (Tab + Enter/Espacio) | `Enter` en el documento NO envía cuando hay escritura |
| Cancelar | Consent | `POST /oauth/consent deny` → 302 `access_denied` | Tab + Enter | Hint «Volverás a {client} sin acceso» |
| Continuar / Enviarme un enlace | Login | `POST /auth/magic-link/request` → `sent` | Enter en el campo | Anti-enumeración |
| Usar mi passkey | Login | `/login/passkey` → ceremonia | Enter | Requiere JS con nonce |
| Verificar código | Step-up | `POST /auth/totp/verify` → sesión `step_up` → `return_to` | Enter | Error inline conserva el valor |
| Usar código de respaldo | Step-up | Campo alterno | Tab + Enter | Mismo formulario |
| Pedir un enlace nuevo | Magic sent/expired | `/login?email=` | Enter | Aparece tras 60 s en `sent` |
| Cerrar sesión | Session | `POST /auth/session` (delete) → `/login` | Enter | Sin confirmación |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| validating | Cliente/redirect en validación | GET authorize | válido / inválido | Sin render intermedio (server) |
| error_terminal | Cliente o redirect inválidos | validación falla | ninguno (cerrar pestaña) | Página con código + referencia; sin redirect |
| login_required | Sin sesión | `SubjectSessionPort` null | sesión creada | Redirect a `/login` (TASK-1830); hoy página 401 |
| login_email | Correo pendiente | `/login` | método elegido | Foco en el campo; Continuar deshabilitado hasta correo válido |
| magic_sent | Enlace enviado (o no) | request | clic en correo / 60 s | Copy idéntico exista o no la invitación |
| magic_verifying | Consumiendo token | `/verify` | ok / expirado / usado | Texto «Verificando…»; sin dependencia de animación |
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
| Passkey no soportada/cancelada | Estado explicativo | Usar enlace por correo | Fallback siempre visible |
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
