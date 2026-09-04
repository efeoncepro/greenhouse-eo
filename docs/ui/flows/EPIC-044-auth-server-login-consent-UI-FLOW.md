# EPIC-044 — Flujo maestro UI: login y consentimiento en `auth.efeonce.org`

> **Tipo:** flujo maestro de programa (cross-surface). Gobierna cómo se conectan las superficies
> visibles del authorization server propio de Efeonce («Efeonce ID»). Las tasks que implementan
> nodos de este flujo lo referencian y no re-deciden la arquitectura: `TASK-1830` (sesión y métodos
> de autenticación; **dueña de extender este doc con el detalle de cada método**), `TASK-1835`
> (pantallas), `TASK-1832` (canaries), `TASK-1834` (convergencia del login del portal).
> **Creado:** 2026-09-04 al autorar `TASK-1835`, con `info-architecture` como lente principal.
> **Contratos técnicos:** `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (§2, §5, §6) y
> `docs/tasks/to-do/TASK-1830-efeonce-auth-external-person-authentication.md`.

## 1. Un motor, varias formas de render

El único motor es el handler del emisor (`src/lib/auth-server/oauth/handler.ts` +
`services/auth-server/app.ts`): valida cliente y redirect, resuelve la persona por el
`SubjectSessionPort`, exige step-up para escritura, comprueba consentimiento por `(sujeto,
cliente, scope)`, resuelve el binding (`gv`) y emite el code. Cada decisión de esa cadena tiene una
**forma de render** según quién la consume:

| Consumidor | Forma de render | Dónde |
|---|---|---|
| Persona en navegador (clientes MCP loopback u hospedados) | HTML server-rendered «Efeonce ID» | `src/lib/auth-server/oauth/pages/**` (TASK-1835) |
| Cliente OAuth (Claude, ChatGPT, Codex) | Redirects y JSON del protocolo | `handler.ts` (TASK-1829) |
| Cliente con `prompt=none` | Sólo redirects con `error=` (sin pantallas) | `authorize.ts` |
| Operador Efeonce | Commands por Admin/CLI/Nexa (registro de clientes, revocación) | TASK-1829 (`identity.auth_client.register`, `identity.auth_consent.revoke`) |
| Nexa / agentes | El mismo primitive de consentimiento (`grantClientConsent`) por acción gobernada | Full API Parity |

Regla: la UI HTML no tiene lógica de negocio propia; recibe DTOs del handler y devuelve
formularios que vuelven al mismo handler.

## 2. Actores → resolución de superficie

| Actor | Cómo llega | Superficie que ve | Autoridad |
|---|---|---|---|
| Persona externa invitada (organización cliente `bound`) | `GET /oauth/authorize` desde su herramienta de IA | login → (step-up) → consent → vuelve a la app | `SubjectSessionPort` + `client_consents` + `gv` |
| Persona externa sin invitación aceptada / revocada | Igual | login → `recovery` («invitación no activa») o `access_denied` | `resolveExternalAccess` ≠ `bound` |
| Persona con sesión vigente | Igual | consent directo (o redirect inmediato si ya consintió) | sesión `__Host-efeonce_auth` |
| Operador Efeonce (pruebas/canaries) | Igual, con persona de prueba | Las mismas pantallas | Sin privilegios extra en la UI |
| Colaborador Greenhouse (portal) | No pasa por aquí hasta TASK-1834 | — | NextAuth del portal |

## 3. Inventario completo de superficies

| # | Superficie | Ruta | Estado del motor que representa | Dueño |
|---|---|---|---|---|
| S0 | Shell «Efeonce ID» (cabecera de marca, tarjeta, pie) | todas | — | TASK-1835 |
| S1 | Consentimiento | `GET /oauth/authorize` → 200 | `consent_pending_decision` | TASK-1835 (contrato TASK-1829 §5.1) |
| S2 | Inicio de sesión: correo + método | `/login?return_to=` | `login_required` | TASK-1835 (rutas/handlers TASK-1830) |
| S3 | Magic link enviado | `/login/magic-link/sent` | espera | TASK-1835 / TASK-1830 |
| S4 | Magic link verificando / expirado / usado | `/login/magic-link/verify?token` | consumo del token | TASK-1835 / TASK-1830 |
| S5 | Passkey (ceremonia WebAuthn) | `/login/passkey` | ceremonia | TASK-1830 (módulo JS) + TASK-1835 (shell) |
| S6 | Step-up TOTP / código de respaldo | `/login/step-up?return_to=` | `interaction_required` | TASK-1835 / TASK-1830 |
| S7 | Recuperación (invitación no activa) | `/login/recovery` | `access_denied` por invitación | TASK-1835 / TASK-1830 |
| S8 | Sesión activa / cerrar sesión | `/session` | sesión | TASK-1835 / TASK-1830 |
| S9 | Error terminal del protocolo | `GET /oauth/authorize` → 4xx | `invalid_client`, `invalid_redirect_uri`, `invalid_request`, `slow_down` | TASK-1835 |
| S10 | Denegado por binding | `GET /oauth/authorize` → redirect o página | `access_denied` (unbound) | TASK-1835 |

## 4. Recorridos cross-surface

**A. Primer uso (sin sesión, sin consentimiento, scope de lectura)**
App → S1? no: `authorize` detecta sin sesión → S2 (`/login?return_to`) → S3 → correo → S4 (verify)
→ sesión creada → `return_to` → `authorize` → S1 (consent) → Permitir → `POST /oauth/consent` →
303 `return_to` → `authorize` emite `302 redirect_uri?code&state&iss` → la app muestra su propia
pantalla. Efeonce ID desaparece.

**B. Escritura (scope `*.write` / funding)**
Como A hasta la sesión; `authorize` exige `authLevel=step_up` → S6 → código OK → `return_to` →
S1 con el scope de escritura marcado → Permitir (activación explícita) → code.

**C. Reuso (sesión y consentimiento vigentes)**
App → `authorize` → sin pantallas → `302 redirect_uri?code`. Cero fricción; por eso el consent debe
ser inequívoco la primera vez.

**D. Cancelar**
S1 → Cancelar → `302 redirect_uri?error=access_denied&state&iss`. La app decide qué mostrar.

**E. Persona sin organización vinculada**
Sesión OK → `authorize` → grants no `bound` → S10 (o redirect si `prompt=none`). Salida: pedir
acceso a su contacto en Efeonce (fuera de banda; sin formulario público).

**F. Invitación expirada / revocada**
S2 → magic link → S4 → el link es válido pero la invitación ya no → S7. Copy sin enumeración.

**G. Revocación posterior (operador)**
Admin/CLI/Nexa → `revokeClientConsent` → familias de tokens revocadas → la próxima llamada de la app
falla → la app reinicia A; la persona vuelve a ver S1. Ninguna pantalla de Efeonce ID «avisa»
proactivamente (no hay canal); Greenhouse podrá mostrar «Aplicaciones autorizadas» en una task
futura.

## 5. Routing, parity y consentimiento

- **Routing:** `/oauth/*` lo posee TASK-1829; `/login*` y `/session` TASK-1830; `return_to` sólo
  acepta paths del propio origen que empiecen por `/oauth/authorize?`. Ninguna pantalla se enlaza
  desde Greenhouse ni viceversa (hasta TASK-1834).
- **Command map (Full API Parity):** `grantClientConsent` ← `POST /oauth/consent` (persona) ·
  `revokeClientConsent` ← `POST /api/admin/auth-server/consents/revoke` (operador) / Nexa ·
  `registerConfidentialClient` ← `POST /api/admin/auth-server/oauth-clients` / `pnpm
  auth-server:register-client` · sesión/magic link/passkey/TOTP ← commands de TASK-1830 tras las
  rutas `/auth/*`. La UI nunca implementa un command distinto.
- **Consentimiento:** por cliente y scope, persistido, revocable; nunca preseleccionado; los scopes
  de escritura llevan etiqueta y descripción del efecto; el estado de consentimiento se crea sólo
  en el POST (nunca cookie antes de aprobar).
- **Motion:** contrato en `docs/ui/motion/TASK-1835-efeonce-id-login-consent-screens-motion.md`
  (CSS mínimo, reduced-motion de primera clase); TASK-1830 no agrega motion.
- **Accesibilidad:** un `h1` por pantalla, una región viva por página, foco inicial nunca en
  «Permitir», contraste ≥ 4.5:1, `autocomplete` correctos; verificado con axe en GVC.

## 5.bis Contrato implementado por TASK-1830 (backend)

Esta sección la escribe la task que entrega los métodos, no la que entrega las pantallas. Todo lo
de acá **ya existe y está probado** en `src/lib/auth-server/persons/**` detrás de
`AUTH_SERVER_PERSON_AUTH_ENABLED` (default `false` ⇒ toda la superficie responde 404).

### Rutas

| Ruta | Método | Qué hace |
|---|---|---|
| `/login` | GET | Formulario de acceso por correo (`return_to` opcional, sólo path propio) |
| `/auth/magic-link/request` | POST | Emite el enlace. Acepta form o JSON; responde 202 |
| `/m/<tokenId>.<verificador>` | GET | Página intermedia con el botón que hace el POST |
| `/auth/magic-link/consume` | POST | Consume el enlace, abre sesión, redirige a `return_to` |
| `/i/<token>` | GET | Página intermedia de invitación |
| `/auth/invitations/accept` | POST | Liga a la persona y despacha el enlace; **no abre sesión** |
| `/auth/passkeys/register/{start,finish}` | POST | Alta de passkey; exige sesión |
| `/auth/passkeys/authenticate/{start,finish}` | POST | Login por passkey; no exige sesión |
| `/auth/passkeys` | GET | Dispositivos registrados (id, nombre, tipo, alta, último uso) |
| `/auth/totp/enroll/{start,finish}` | POST | Alta del segundo factor; exige sesión |
| `/auth/totp/verify` | POST | Step-up: escribe `step_up_at` + `amr` en la sesión |
| `/auth/session` | GET | Contexto de la sesión vigente (JSON) |
| `/auth/session/logout` | POST | Revoca la sesión y limpia la cookie |

Los endpoints que la UI consume por formulario (`magic-link/request`, `magic-link/consume`,
`invitations/accept`, `session/logout`) responden **HTML** cuando el `Content-Type` es
`application/x-www-form-urlencoded` y **JSON** en cualquier otro caso. La misma ruta sirve a la
pantalla y al canary sin bifurcar el contrato.

### Cuatro cosas que la UI no puede contradecir

1. **La respuesta de pedir un enlace es idéntica exista o no el correo** — cuerpo, código,
   encabezados y tiempo (hay un piso de latencia deliberado). La pantalla NO puede decir «no
   encontramos ese correo», ni mostrar un estado distinto, ni saltarse el «revisa tu correo».
   El único 4xx que sí distingue es el formato inválido del correo, que no revela nada.
2. **El passkey va antes del correo.** El login por passkey usa credenciales descubribles y no
   pide correo: pedirlo primero convertiría el servidor en un oráculo de existencia. Por eso
   `login_passkey_cta` es el CTA primario y el campo de correo es el fallback.
3. **El GET del enlace no consume nada.** Los escáneres de correo abren los enlaces; si el consumo
   fuera GET, el acceso se quemaría antes de que la persona llegue. La página intermedia con botón
   es un requisito de seguridad, no una preferencia de diseño — no se puede auto-enviar el form.
4. **`step_up` no se declara, se demuestra.** Lo escribe el servidor en la sesión a partir de los
   flags reales del factor (`uv` de la aserción WebAuthn, verificación TOTP) y **caduca a los 10
   minutos**. No existe «recordar este dispositivo» para el step-up, y la UI no puede ofrecerlo.

### Estados que la UI tiene que representar

`login` · `magic_link_sent` (idéntico para correo conocido y desconocido) · `magic_link_confirm` ·
`link_invalid` / `link_expired` / `link_used` (mismo título, distinta línea de ayuda) ·
`access_revoked` · `session_started` · `session_closed` · `rate_limited` ·
`invitation_confirm` · `invitation_accepted` · `passkey_unsupported` · `passkey_failed` ·
`step_up_required` · `totp_enroll` (secreto + 10 códigos de respaldo, mostrados UNA vez).

Copy en `src/lib/copy/auth-server.ts` con los prefijos `login_*`, `confirm_*`, `link_*`,
`session_*` e `invitation_*`. TASK-1835 los consume; no crea ids paralelos.

## 6. Qué no cubre este flujo

- Registro público, recuperación de contraseña (no existen contraseñas), perfil.
- Gestión de aplicaciones autorizadas y consentimientos desde Greenhouse (task futura).
- El login del portal Greenhouse (TASK-1834 lo conecta a este mismo emisor más adelante).
- Autoadministración de dispositivos por la persona más allá de listarlos (fuera de la primera
  cohorte) y notificación por correo al agregar o quitar un passkey (follow-up de TASK-1830).
