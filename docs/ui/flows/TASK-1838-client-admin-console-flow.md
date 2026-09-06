# TASK-1838 — Efeonce ID: consola del administrador del cliente Flow Contract

## Meta

- Status: `draft`
- Owner task: TASK-1838
- Related wireframe: docs/ui/wireframes/TASK-1838-client-admin-console.md
- Program master flow: docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md — esta superficie es un nodo NUEVO de ese sistema, `S11 · Consola de la organización` (`GET /account/organization`), alcanzable desde `S8 · Sesión iniciada` cuando la persona es administradora designada de ≥ 1 binding. El flujo maestro hoy no lo lista (su §6 lo declara fuera de alcance como «gestión … desde Greenhouse (task futura)»); el Slice 1 de esta task lo agrega al inventario §3 y al recorrido §4 con este mismo identificador. Los recorridos de entrada (invitación → aceptación → magic link → sesión) son los de S7/S3/S4/S8 y no se redefinen aquí.
- Intended route / surface: `auth.efeonce.org` — `GET /account/organization`, `POST /account/organization/invitations`, `POST /account/organization/invitations/<id>/resend`, `POST /account/organization/invitations/<id>/revoke`.
- Flow type: `command-backed`
- Primary primitives: `IdShell`, `IdCard wide`, `IdSeatMeter`, `IdField`, `IdButton`, `IdStatus`, `IdInvitationRow` (HTML server-rendered, sin JavaScript).
- Copy source: src/lib/copy/auth-server.ts (`GH_AUTH_SERVER.org_console_*`).

## Flow Brief

La persona ya entró a Efeonce ID (magic link o passkey) y llega a la consola desde la pantalla de
sesión o escribiendo la URL. El servidor decide en este orden: sesión activa → flag de la consola
y entrega del sistema habilitadas en este runtime → memberships con `designatedAdmin` → binding
elegido (uno, o `?binding=` entre los propios) → render. Cada acción es un `POST` same-origin con
CSRF que invoca un command delegado de `@/lib/identity/external-access` y vuelve por `303` al
`GET` con `?result=<code>`, para que recargar nunca repita un envío. Éxito = la persona ve el
resultado en la región de estado y la lista actualizada; la consola nunca muestra un token ni
promete un correo que no salió.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| `S8` Sesión iniciada (`/session`, TASK-1835) | Punto de entrada | Enlace «Administrar mi organización» sólo si hay ≥ 1 membership `designatedAdmin` | Igual | `IdButton secondary` |
| `GET /account/organization` (ready / empty / partial) | Trabajo | Tarjeta ancha: cabecera + medidor + formulario + lista | Formulario y filas apiladas | `IdCard wide` + `IdInvitationRow` |
| `GET /account/organization?binding=<id>` | Cambio de organización | Selector con las organizaciones administradas; el `GET` re-renderiza | Igual, lista vertical | `IdButton link` |
| `POST …/invitations` → `303 …?result=sent\|not_sent\|exists\|invalid_email\|seats\|hourly` | Invitar | Región de estado con el resultado; lista con la fila nueva | Igual | `IdStatus` |
| `POST …/invitations/<id>/resend` → `303 …?result=resent\|exhausted\|not_open\|hourly` | Reenviar (= rotar) | Fila con `deliveryAttempts+1`; enlace anterior inutilizado | Igual | `IdStatus` |
| `GET …?confirm=revoke&invitation=<id>` | Confirmación | Tarjeta de decisión con correo enmascarado y efecto | Igual | `IdCard` + `IdButton` |
| `POST …/invitations/<id>/revoke` → `303 …?result=revoked` | Revocar | Fila pasa a `closed`; medidor baja | Igual | `IdStatus` |
| `GET /account/organization` (denied) | Sin autoridad | «No administras ninguna organización» | Igual | `IdStatus warning` |
| `GET /account/organization` (unavailable) | Flag OFF / entrega apagada | Degradación honesta; sin formulario | Igual | `IdStatus info` |
| Sin sesión | Redirect | `302 /login?return_to=/account/organization` | Igual | — |

## Flow Map

1. Entry: desde `S8` («Administrar mi organización») o URL directa. `resolvePersonSession` sobre `__Host-efeonce_auth`; sin sesión → `302 /login?return_to=`. Con sesión, `AUTH_SERVER_ACCOUNT_CONSOLE_ENABLED` y la entrega del sistema deben estar habilitadas en el runtime del emisor; si no → `unavailable` (200, sin formulario).
2. Primary action: `resolveExternalAccess({ environmentId, subject })` → memberships `designatedAdmin`. Cero → `denied`. Una → binding implícito. Varias → la primera por `bindingId` estable + selector; `?binding=` ajeno → `denied` (sin distinguir causa). Render con `listDelegatedExternalInvitations` y el conteo de asientos (`issued+accepted+linked` vs `delegatedSeatLimit`).
3. Transition (invitar): `POST /account/organization/invitations` con CSRF + `email` + `reason?` → `issueDelegatedExternalInvitation({ environmentId, subject, bindingId, email, reason, delivery: 'system' })`. `created:true` y `delivery.status='sent'` → `303 ?result=sent`; `created:true` y `delivery.status='failed'` → `?result=not_sent` (la fila queda `issued` + `failed` con «Reenviar» disponible); `created:false` → `?result=exists`; `limit_reached` → `?result=seats`; `rate_limited` → `?result=hourly`; correo inválido → re-render del formulario con error inline (sin PRG, para conservar el valor).
4. User decision (reenviar / revocar): «Reenviar invitación» sólo en filas `issued` → command delegado de reenvío → `?result=resent` (o `exhausted` al 4.º intento, `not_open` si la fila cambió de estado entre el render y el POST). «Revocar» → `GET ?confirm=revoke&invitation=<id>` → «Sí, revocar» → command delegado de revocación (scope `invitation` si `issued`; scope `member` del propio binding si `linked`) → `?result=revoked`; «Volver sin cambios» → `GET` limpio.
5. Completion: la consola es un estado estable; no hay «terminar». La persona vuelve a la aplicación o cierra sesión desde el pie (`POST /auth/session/logout`).
6. Recovery / exit: fila `bounced`/`failed` → reenviar (rota el enlace y reintenta el correo); `expired` → «Invitar de nuevo» (nueva emisión con `reissue`); tope de asientos → revocar a alguien o escribir a Efeonce; `hourly` → esperar; error inesperado → `error` con `correlationId` y enlace de vuelta.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Administrar mi organización | `S8` sesión | `GET /account/organization` | Enter | Sólo visible con autoridad |
| Cambiar de organización | Cabecera | `GET ?binding=<id>` | Enter sobre el enlace | Sin mutación |
| Invitar | Formulario | `POST …/invitations` → PRG | Enter en el campo de correo | CSRF obligatorio; `Enter` en «motivo» también envía |
| Reenviar invitación | Fila `issued` | `POST …/<id>/resend` → PRG | Tab + Enter | Botón por fila con `aria-describedby` del correo enmascarado |
| Revocar | Fila `issued`/`linked` | `GET ?confirm=revoke&invitation=<id>` | Tab + Enter | No muta; abre la confirmación |
| Sí, revocar | Confirmación | `POST …/<id>/revoke` → PRG | Activación explícita del botón | «Volver sin cambios» antes en el DOM |
| Volver sin cambios | Confirmación | `GET /account/organization` | Enter | — |
| Invitar de nuevo | Fila `expired` | Prefill del formulario con el correo (`?email=` NO se usa: el correo va en el cuerpo del `GET` render, nunca en la URL) | Enter | Reemisión con `reissue` |
| Cerrar sesión | Pie | `POST /auth/session/logout` → `/login` | Enter | Igual que TASK-1835 |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| unauthenticated | Sin sesión | GET sin cookie válida | login → `return_to` | Redirect; nada se renderiza |
| unavailable | Consola o entrega apagadas en este runtime | flag OFF / delivery OFF | ninguno | Sin formulario; copy de degradación; NUNCA token/manual |
| denied | Sesión activa sin autoridad delegada | 0 memberships `designatedAdmin` o `?binding=` ajeno | ninguno | Sin lista; sin PII; salida por sesión/app |
| ready | Autoridad resuelta, lista con filas | render | acción | Foco en `h1`; medidor con número |
| empty | Autoridad resuelta, sólo la fila propia | render | invitar | `org_console_list_empty` + fila propia con badge |
| partial | Hay filas `failed`/`bounced` | render | reenviar | `IdStatus warning` con recuperación en la fila |
| seat_cap | `used ≥ limit` | render | revocar | «Invitar» deshabilitado con la razón al lado |
| submitting | POST en vuelo | envío | 303 | Sin render (servidor); el navegador muestra su progreso |
| result_shown | PRG con `?result=` | 303 | cualquier acción | Región de estado con `role=status\|alert`; foco en ella |
| invalid_input | Correo inválido / motivo > 200 | validación server-side | corrección | Re-render sin PRG conservando valores; `aria-invalid` |
| rate_limited | 429 del command | POST | espera | `org_console_limit_hourly`; sin contador exacto |
| revoke_confirm | Decisión destructiva | «Revocar» | confirmar / volver | Página propia; foco en `h1`; orden DOM seguro |
| error | Fallo inesperado | excepción | volver | `correlationId`; sin detalle interno |

## Routing Contract

- Route changes: rutas HTML nuevas del emisor (`/account/organization` y sus tres `POST`), declaradas en `PERSON_AUTH_PATHS` y en `isPersonAuthPath`; `/oauth/*` y `/auth/*` no cambian.
- Canonical URL: `https://auth.efeonce.org/account/organization`; ninguna pantalla de Greenhouse la enlaza (la persona externa no tiene sesión en el portal).
- Deep-link behavior: `?binding=` selecciona entre memberships propias; `?confirm=revoke&invitation=` abre la confirmación sólo si la invitación pertenece al binding resuelto; `?result=` sólo pinta la región de estado (valores fuera del enum se ignoran). Ningún query param lleva correos ni tokens.
- Back button behavior: volver desde la confirmación no revoca; volver tras un PRG re-muestra el `GET` con `?result=` (inofensivo: no repite el POST).
- Reload behavior: recargar el `GET` re-lee la lista; recargar tras un `303` no reenvía nada (PRG).
- Shareability: la URL no confiere acceso; sin sesión redirige; con sesión ajena responde `denied`.

## Focus & Accessibility

- Initial focus: `h1` en ready/empty/partial/denied/unavailable; campo de correo tras `invalid_input`; región de estado tras un `?result=`; `h1` de la confirmación en `revoke_confirm`.
- Escape behavior: sin overlays; Escape no hace nada.
- Click-away behavior: no aplica.
- Focus restore: tras `?result=` el foco va a la región de estado y `Tab` sigue hacia el formulario.
- Modal vs non-modal semantics: páginas completas; sin `aria-modal`.
- Screen reader announcement: una sola región viva; éxitos `role=status`, fallos `role=alert`; el `<title>` del documento cambia por estado («Confirmar revocación · Efeonce ID»).
- Keyboard traversal: cabecera (sin tabulación) → selector de organización (si existe) → formulario → lista (botones por fila en orden de lectura) → pie. En 390 px el orden DOM es el mismo.
- Reduced motion: sin transiciones de entrada; sin animación en el medidor.

## Data & Command Boundaries

- Readers: `resolvePersonSession` (sesión), `resolveExternalAccess` (memberships y `designatedAdmin`), `listDelegatedExternalInvitations` (filas), `readExternalInvitationConfig` (tope de asientos, flags en este runtime).
- Commands: `issueDelegatedExternalInvitation` (existe, TASK-1837); `resendDelegatedExternalInvitation` y `revokeDelegatedExternalInvitation` (prerrequisito declarado en TASK-1837 §Follow-ups: envuelven `resendExternalInvitation` / `revokeExternalAccess` detrás de `resolveDelegatedAuthority` con la comprobación `invitation.bindingId === authority.membership.bindingId`, actor `external-admin:<profileId>`, audit `invitation_resent` / `invitation_revoked` con `delegated:true`). La UI sólo invoca; no toca `store.ts`.
- API routes: ninguna ruta nueva en Greenhouse; la lane ecosystem existente (`/api/platform/ecosystem/identity/invitations`) recibe en TASK-1837 los verbos `resend`/`revoke` para mantener paridad con esta consola.
- Optimistic updates: ninguno; todo viene del servidor tras el `303`.
- Cache / invalidation: `Cache-Control: no-store`; sin estado en el navegador salvo la cookie de sesión.
- Audit / signals: los commands auditan (`invitation_issued` con `delegated:true`, `invitation_resent`, `invitation_revoked`); la UI no emite nada. Señales existentes `identity.external_invitation.undelivered` / `expired_unaccepted` reflejan lo que la consola muestra.
- Tenant / access boundary: el binding sale de la resolución `(environment, subject)` de la sesión, nunca del query string como autoridad; el `bindingId` del query sólo elige entre memberships propias.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| Sin sesión | Redirect a `/login?return_to=` | Entrar | Contrato de TASK-1830 |
| Sin autoridad / binding ajeno | `denied` | Cerrar sesión / volver a la app | Sin distinguir causa (anti-oráculo) |
| Consola o entrega apagadas | `unavailable` | Escribir a Efeonce | Fail-closed; nunca token manual |
| Correo inválido | Error inline, valor conservado | Corregir | `aria-invalid` + `aria-describedby` |
| Correo con invitación abierta | `?result=exists` | Reenviar desde la fila | `created:false` |
| Correo no salió (`failed`) | `?result=not_sent` + fila `warning` | Reenviar | NUNCA «enviada» |
| Rebote posterior (`bounced`) | Fila `warning` al recargar | Reenviar tras corregir | Lo escribe el ops-worker vía `email_delivery.bounced` |
| Tope de asientos | `?result=seats` + botón deshabilitado | Revocar o escribir a Efeonce | 422 `limit_reached` |
| Tope por hora | `?result=hourly` | Esperar | 429 `rate_limited` |
| 4.º reenvío | `?result=exhausted` | Revocar e invitar de nuevo | 429 en la cadena |
| Fila cambió de estado entre render y POST | `?result=not_open` | Recargar | 409 `invitation_not_open` |
| CSRF ausente/inválido | 403 sin datos | Recargar la consola | Mecanismo existente de `persons/` |
| Excepción | `error` + `correlationId` | Volver | `captureWithDomain(err, 'identity')` |

## GVC Scenario Plan

- Scenario: task1838-client-admin-console.
- Scenario file: `scripts/frontend/scenarios/task1838-client-admin-console.scenario.ts`, declarado en el wireframe.
- Route: harness local `pnpm auth-server:dev-ui` con rutas fijas de fixture (`/account/organization`, `/empty`, `/partial`, `/seat-cap`, `/denied`, `/unavailable`, `/revoke-confirm`, `/rate-limited`); runtime real en staging con el binding de prueba de TASK-1837.
- Viewports: 1440×1000 y 390px.
- Quality profile: `premium`.
- Required steps: la secuencia del Flow Map: ready → invitar (`sent`) → repetido (`exists`) → partial → reenviar (`resent`) → revocar → confirmación → `revoked` → seat_cap → rate_limited → denied → unavailable.
- Required captures: cada estado en ambos viewports + foco tras cada PRG + reduced-motion.
- Required data-capture markers: `id-shell`, `id-org-header`, `id-org-seats`, `id-org-invite-form`, `id-org-status`, `id-org-list`, `id-org-row-actions`, `id-org-revoke-confirm`.
- Assertions: ningún frame con token, URL `/i/` ni correo completo ajeno; «Invitar» deshabilitado en seat_cap; orden DOM de la confirmación; CSP sin `unsafe-inline`; axe sin violaciones serias.
- Scroll-width checks: igualdad de ancho de documento en todas las capturas.
- Accessibility/focus checks: orden de tabulación, `role=status|alert`, `role=meter`, contraste ≥ 4.5:1.
- Reduced-motion evidence: misma secuencia sin transiciones.
- Review dossier: `pnpm fe:capture:review task1838-client-admin-console`.
- Baseline decision: baseline nuevo `efeonce-id-account-organization` derivado de `efeonce-id` (TASK-1835).

## Design Decision Log

- Decision: consola server-rendered del emisor con PRG; cada acción es un `POST` con CSRF que invoca un command delegado y vuelve al `GET` con `?result=`; la revocación exige una pantalla de confirmación propia.
- Alternatives considered: consola en el portal Greenhouse (rechazada: segunda identidad); SPA sobre la lane del gateway (rechazada: JS, CSP laxa, salto innecesario); confirmación en modal (rechazada: sin JS por CSP; «una decisión por pantalla»); acciones por `GET` (rechazada: un escáner de correo o un prefetch revocaría a alguien).
- Why this pattern: cero secretos en el navegador, cada estado es una URL verificable, mismo contrato que la lane MCP (paridad real), y recargar nunca repite un envío.
- Reuse / extend / new primitive: `extend` (kinds `IdInvitationRow`, `IdSeatMeter`; variante `IdCard wide`).
- Open risks: los commands delegados de reenvío/revocación viven en TASK-1837 y deben existir antes del Slice 3; el flag de entrega es Vercel-only y la consola corre en el auth-server (declararlo en `services/auth-server/deploy.sh` + ledger); administradores internos (TASK-1836) podrían resolver como `designatedAdmin` con otra población — decidir en Slice 1 si la consola los sirve o los excluye.
- Follow-up: agregar S11 al flujo maestro EPIC-044 en el Slice 1; alinear con TASK-1836 la población admitida.

## Acceptance Checklist

- [ ] Cada estado del State Machine tiene pantalla, copy y recuperación implementados y capturados.
- [ ] Recorrido completo por teclado y a 390 px sin scroll horizontal; ningún `GET` muta.
- [ ] GVC secuencial demuestra invitar → reenviar → revocar con confirmación, y los cuatro negativos (denied, seats, hourly, unavailable).
