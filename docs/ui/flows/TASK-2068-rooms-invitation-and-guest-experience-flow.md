# TASK-2068 — Flujo de la invitación y del acceso de invitado

Contrato de navegación reescrito el 2026-10-31 desde el canvas aprobado el 2026-10-29 (`Invitacion`,
`InvitacionMovil`, `Estados`) y el código de `efeonce-rooms` `claude/rooms-approved-ui`
(`src/components/invitations/invitation-entry.tsx`). No existe un flujo maestro del programa EPIC-052 en
`docs/ui/flows/`; la sala que sigue está en [TASK-2059](TASK-2059-rooms-first-experience-flow.md).

## Recorrido principal

1. El correo trae un solo enlace `https://…/invite#token=<43 caracteres base64url>` y, aparte, el código de seis dígitos.
2. El navegador carga `/invite` sin el fragmento (nunca viaja al servidor). Al montar, el cliente lee el fragmento una
   vez y lo borra con `history.replaceState`. Si no tiene el formato exacto, el estado es «No pudimos abrir esta
   invitación.» sin ninguna petición.
3. `POST /api/invitations/start {token}`: crea la transacción (cookie HttpOnly) y devuelve la tarjeta. Luego
   `GET /api/invitations/transaction` entrega `expiresAt`, `retryAt`, `deliveryStatus`, `entryGate` y la tarjeta.
4. Con `entryGate: continue` se muestra el código; con `internal_session_present`, el panel de sesión interna.
5. La persona escribe o pega. Al sexto dígito, `POST /api/invitations/verify {code}`; mientras tanto, «Verificando el
   código…» y el campo deshabilitado (una sola verificación en vuelo).
6. Respuesta correcta: se borra el código, «Listo.» y «Código correcto. Abriendo la sala.»; a los 1400 ms (0 ms con
   movimiento reducido) `location.assign('/rooms/:roomId/editions/:editionId#mapa')`. Es navegación de documento: la sala
   lee su autoridad con la cookie nueva de invitado.

## Recarga y reapertura

- Recargar `/invite` sin fragmento llama a `GET /api/invitations/transaction`. Si hay transacción vigente, vuelve al
  código; si responde 410, muestra el estado explícito; con otro 4xx consulta `GET /api/invitations/session`: sesión de
  invitado vigente → «Tu sala está lista.» con «Continuar a la sala» (`…#mapa`); sesión interna → panel de sesión
  interna; nada → «Tu invitación empieza en el correo.». Un 5xx lleva a «Volvemos en un momento.».
- Si llega un enlace nuevo a una pestaña que ya está en `/invite` (`hashchange` con `#token=`), la página se recarga
  como documento nuevo y el flujo anterior se descarta.
- En `pagehide` se borran el token y el código; volver con Atrás nunca restaura un código escrito.

## Estados y transiciones

| Estado | Llega por | Acción disponible | Lleva a |
|---|---|---|---|
| `loading` | Montaje con o sin fragmento | — | Cualquiera de los siguientes |
| `code` | Transacción vigente con `entryGate: continue` | Escribir, pegar, «Entrar a la sala», «Enviarme un código nuevo» | Verificación, `code_expired`, `attempts`, `unavailable` |
| Código incorrecto (`invalid_code`) | `verify` | Corregir el código | `code` en fase de error; vuelve a `idle` al tocar el campo |
| `code_expired` (410) | `verify` o lectura de la transacción | «Enviarme un código nuevo» (salvo `canRequestNew: false`), sujeto a la espera | `resend` abre una transacción nueva → `code` con el foco en el campo y «Te enviamos un código nuevo. Revisa tu correo.» |
| `attempts` (429) | `verify` o `resend` | Esperar; «Intentar de nuevo» al terminar | `code`. La pausa sale de `Retry-After` (60 s si falta) y se muestra como m:ss |
| `revoked`, `expired`, `superseded` (410) | `start`, `transaction` o `verify` | Ninguna: volver al correo o pedir otra invitación | — |
| `invalid` (404 o fragmento malformado) | `start` o el formato del fragmento | Ninguna | — |
| `internal` | `entryGate: internal_session_present` o 409 `internal_session_present` en `verify` | «Cerrar sesión interna y continuar» (`POST /auth/logout` y vuelve a leer) o «Volver a mi espacio de trabajo» (`/rooms`) | `code` o `guest` |
| `guest` | Sesión de invitado vigente sin transacción | «Continuar a la sala» | La sala en `#mapa` |
| `empty` | Sin fragmento, transacción ni sesión | Ninguna | — |
| `unavailable` | 5xx o error desconocido | «Reintentar» | Repite la inicialización |

Toda acción pasa por un único candado (`act`): mientras una petición está en vuelo, ningún botón dispara otra.

## Sesiones coexistentes

La sesión interna tiene precedencia. Nunca se borra en silencio ni se usa la cookie de invitado como respaldo de una
sesión interna fallida: la persona elige cerrar la sesión interna antes de canjear el código. Cada cambio de actor es
una navegación de documento y una lectura nueva del servidor.

## Dentro de la sala (acceso de invitado)

- «Salir de la sala» (`SessionExit`): `POST /api/invitations/logout` y `location.replace('/invite')`.
- `GuestSessionBoundary` retira la sala al vencer la sesión (temporizador a `expiresAt`), si la edición deja de leerse o
  cambian los permisos (revisión cada 30 s y al volver a la pestaña), y antes del BFCache (`pagehide`; si la página vuelve
  persistida, se recarga). Muestra «Tu sesión terminó.» con el enlace a `/invite` y mueve el foco al título.
- Sin sesión o con una edición no autorizada, la sala responde `AccessState` «Este acceso no está disponible.».

## Gestión interna (sin cambios de canvas)

`/rooms` → sala → `/rooms/:roomId/invitations`. Crear, reemitir, revocar y comprobar envío envían
`invitations.create`, `invitations.reissue`, `invitations.revoke` e `invitations.retryDelivery` por
`POST /api/v1/commands` con `expectedRevision` e `Idempotency-Key`. Un 409 conserva el formulario y pide actualizar el
contexto; una respuesta incierta reintenta con la misma clave y el mismo payload; «Envío aceptado» nunca significa
entregado. Es la interfaz del 2026-10-25.

## GVC Scenario Plan

- `rooms-invitation-stage` en `/demo/invitacion`: código, error (`000000`), «Listo.», y cada `?estado=`; probe
  `code-then-resend`.
- `rooms-invitation-entry` en `/invite`: vacío, fragmento malformado y token desconocido; la URL queda sin `#token=`.
- Viewports 1440×900, 1280×800, 390×844 y 320×740; repetir con movimiento reducido.
- Pendiente: recorrido completo con correo real en la integración, retorno por BFCache tras revocar, 429 real y
  coexistencia interna → cerrar sesión → invitado sobre la escena nueva.
- Dossier: `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/`.

## Design Decision Log

- 2026-10-30 — La invitación termina en `#mapa`: la sala muestra primero el recorrido y la bienvenida con los capítulos
  reales.
- 2026-10-30 — Estados explícitos (410) solo con token o transacción reales; 404 genérico para todo lo demás.
- 2026-10-30 — La autoridad nunca se anima: verificar, cerrar sesión y perder acceso son navegaciones de documento o
  retiros inmediatos del DOM.
- 2026-10-31 — La espera de reenvío y la pausa por intentos se muestran con texto que cambia cada segundo, sin anunciarse
  cada segundo.
