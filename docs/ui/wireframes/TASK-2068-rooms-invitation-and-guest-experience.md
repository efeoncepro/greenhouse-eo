# TASK-2068 — Rooms: invitación «Entra.» y acceso de invitado

Diseño de implementación reescrito el 2026-10-31 desde dos fuentes: el canvas «Efeonce Rooms — UI», aprobado entero
por el operador el 2026-10-29 (artifact `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`), y
el código implementado en `efeonce-rooms`, rama `claude/rooms-approved-ui` (`c133299`, `32640ee`, `717c478`, sin
push). Cuando el canvas y el código difieren, este documento describe el código y registra la diferencia. No es
aceptación humana: `UI ready` sigue en `no`.

Esta task cubre la entrada por invitación (`/invite`): la palabra «Entra.» rodeada por la órbita, quién invita y para
quién, el código de seis dígitos, todos los estados explícitos de acceso y el paso a la sala. La sala que se abre
después es de TASK-2059; la gestión de invitaciones dentro de la sala conserva su interfaz del 2026-10-25 (fuera del
canvas, ver «Gestión de invitaciones»).

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Source durable: sección «Aprobación 2026-10-29» de ese documento y los artboards `Invitacion` («Entrada por
  invitación», 1440 × 900), `InvitacionMovil` («Invitación · móvil», 390 × 844) y `Estados` («Estados · carga, error y
  acceso»). Primitivas de [TASK-2079](TASK-2079-rooms-orbit-foundation.md): `Orbit`, `DepthLayers`, `Grain`.
- Contrato backend: [backend-api-for-claude-design.md](../../documentation/rooms/backend-api-for-claude-design.md),
  § «Tarjeta de invitación, estados, perfiles, adaptaciones y autores».
- Quality profile: `premium`.
- Fuera de alcance: `Consola`, `Audiencia`, `Senales` y `Video` no se implementan en esta task.

## Rutas y superficies

| Ruta | Qué muestra | Datos |
|---|---|---|
| `/invite` (y `/invite#token=…` desde el correo) | `InvitationEntry` → `InvitationStage` | `POST /api/invitations/start`, `GET /api/invitations/transaction`, `POST /api/invitations/verify`, `POST /api/invitations/resend`, `GET /api/invitations/session`, `POST /auth/logout` |
| `/demo/invitacion?estado=codigo\|error\|listo\|vencido\|revocado\|reemplazado\|intentos\|interna\|cargando` | `InvitationDemo`: la misma escena con personas y marca ficticias (volta) | Sin red; `000000` simula un código inválido |
| `/rooms/:roomId/invitations` | Gestión interna (interfaz del 2026-10-25) | `GET /api/v1/rooms/:roomId/invitations/management`; commands `invitations.create`, `invitations.reissue`, `invitations.revoke`, `invitations.retryDelivery` |

## Composición (escritorio, 1440 × 900)

La escena ocupa `100dvh` sobre `--room-ground`, con parallax por capas (`DepthLayers`: órbita ± 7 px, texto ± 14 px) y
grano fijo. Filas: encabezado, escenario y pie.

1. **Encabezado** (relleno 36/80): lockup `rooms-lockup-white.svg` de 211 × 24 a la izquierda y el ojal
   «Invitación privada» a la derecha (Poppins 12, espaciado 0,14 em, mayúsculas, atenuado).
2. **Héroe** (centro del escenario): la órbita canónica dibujada una vez, de radio
   `clamp((alto de ventana − 300)/2, 180, 330)` (300 en 900 px de alto), así el código nunca queda sobre el anillo. Dentro:
   - ojal «Hola, {nombre}» (o «Te damos la bienvenida, {nombre}» al validar, o el ojal del estado bloqueado);
   - la palabra en Bricolage 760, 196 px, espaciado −0,05 em: «Entra.» y, apilada para el relevo, «Listo.»; el punto
     siempre en teal;
   - la etiqueta de la sala (`card.roomLabel`, Poppins 17), por ejemplo «Campaña «Llega antes» · Edición 3».
3. **Lados** (absolutos, a la altura del 42 % menos 60 px):
   - izquierda, a 80 px y 270 de ancho: «Te invita», avatar de 64 px (foto `https` elegida por su dueño o iniciales sobre
     navy), nombre en Bricolage 26 y cargo atenuado;
   - derecha, a 80 px y 250 de ancho: «Para», el cliente en Bricolage 800 de 76 px, «{invitado} · {rol}» y «Compartes la
     sala con Diego, Paula y Tomás.» (solo nombres de pila; nunca correos).
   Cada lado aparece solo si la tarjeta trae ese dato.
4. **Acción** (hasta 640 px, centrada bajo el héroe): el formulario del código.
   - Etiqueta «Código de acceso» alineada a la izquierda.
   - Seis casillas de 64 × 80, radio 12, separadas 10 px, dígitos en Bricolage 44. La casilla activa muestra un cursor
     teal; las llenas, borde `paper` y fondo tenue. Un único `<input>` real cubre las casillas (opacidad 0):
     `type="text"`, `inputMode="numeric"`, `autoComplete="one-time-code"`, `pattern="[0-9]{6}"`, `maxLength=6`,
     `enterKeyHint="go"`, `autoFocus`; acepta escribir y pegar y descarta lo que no sea dígito.
   - Línea de ayuda que cambia con el estado (ayuda, verificando, error, correcto, código reenviado).
   - Botones: «Entrar a la sala» (primario AXIS `growth` sobre oscuro, deshabilitado hasta seis dígitos) y
     «Enviarme un código nuevo» (ghost, deshabilitado durante la espera). Bajo ellos, «Podrás pedir otro código en N s.».
   - En un estado bloqueado el formulario se reemplaza por un panel: título Bricolage 34, texto de hasta 520 px y sus
     acciones. «Entra.» baja a opacidad 0,32 detrás.
5. **Pie** (relleno 0/80/36): «¿No puedes entrar? Pídele a {nombre} que te invite de nuevo.».
6. Región `sr-only` `role="status"` `aria-live="polite"` para los anuncios.

## Desktop Target

1440 × 900: el héroe es el momento dominante; la órbita de radio 300 ocupa dos tercios del alto y «Entra.» queda dentro
con aire. Los lados flanquean la órbita sin cruzarla; el código queda bajo el héroe sin desplazamiento en el primer
viewport. En 1280 × 800 la órbita baja a radio 250 y todo conserva su lugar. Hasta 1180 px la palabra baja a 150 px y
los lados dejan de ser absolutos: pasan a una fila centrada bajo el héroe (separación 24 × 64 px, ancho máximo 320).

## Mobile Target

600 px o menos (artboard `InvitacionMovil`): órbita de radio 140 y palabra de 84 px; encabezado con relleno 20/16 y sin
el ojal; los lados se apilan a todo el ancho, cada uno con una regla superior, y el cliente baja a 52 px; las casillas
miden 44 × 56 con dígitos de 30 px y separación 6; el pie usa relleno 0/16/24 y el título de panel 28 px. Orden en
pantalla: encabezado, héroe, «Te invita», «Para», código y pie. El teclado numérico no tapa el botón: el formulario está
en el flujo normal y la página hace scroll natural. Sin scroll horizontal en 390 × 844 ni en 320 × 740. El parallax se
apaga en táctil (`pointer: fine` requerido).

## Action Hierarchy

- Con el código: escribir o pegar es la acción; al sexto dígito se verifica sola. «Entrar a la sala» queda como
  primaria explícita para teclado y lectores; «Enviarme un código nuevo» es secundaria y respeta la espera del servidor.
- En cada estado bloqueado hay como máximo una primaria: «Enviarme un código nuevo» (código vencido),
  «Intentar de nuevo» (intentos, solo cuando termina la pausa), «Cerrar sesión interna y continuar» (sesión interna),
  «Reintentar» (no disponible) o «Continuar a la sala» (sesión vigente). Invitación cerrada, vencida o reemplazada no
  tienen primaria: la salida es volver al correo o a quien invitó.
- La secundaria de sesión interna es el enlace «Volver a mi espacio de trabajo» (`/rooms`).

## Visual Fidelity Mapping

| Elemento del canvas | Fuente en código | Regla |
|---|---|---|
| Fondo, halo, teal, navy, papel | Tokens `efeonceGraphicLine.color` vía `src/styles/theme.ts` (`--room-ground`, `--room-halo`, `--room-teal`, `--room-navy`, `--room-paper`, `--room-muted-dark`) | Ningún hex en componentes |
| Órbita y halo | `Orbit` (`draw="once"`, radio calculado) de TASK-2079 | Se dibuja una vez y queda quieta; nunca indica espera |
| Profundidad | `DepthLayers` + `Grain` | Parallax solo con puntero fino y sin movimiento reducido |
| «Entra.» / «Listo.» | `--room-font-display` (Bricolage) | El punto en `--room-teal` (`.room-point`) |
| Texto funcional | `--room-font-body` (Poppins) | Ayuda 13 px, cuerpo de panel 15 px |
| Botones | `Button` de `@efeoncepro/axis-ui-primitives/react` | Primario `line="growth" surface="dark"`; secundario ghost |
| Lockup | `/brand/rooms-lockup-white.svg` desde `@efeoncepro/axis-brand-assets` | 211 × 24; nunca animado |
| Tarjeta | `InvitationCard` (`src/domain/invitation-contracts.ts`) | Nunca correos ni ids |

## Copy Ledger

Copy en `../efeonce-rooms/src/lib/copy/invitations.ts` (es-CL, tuteo):

| Objeto | Ids | Dónde |
|---|---|---|
| `INVITATION_STAGE_COPY` | `privateInvite`, `invitedBy`, `for`, `hello`, `welcome`, `hero` («Entra»), `ready` («Listo»), `sharedWith`, `codeLabel`, `codeHelp`, `codeChecking`, `codeOk`, `codeError`, `slot`, `resend`, `resendWait`, `resent`, `stuck` | Escena y formulario |
| `INVITATION_STAGE_COPY.states` | `codeExpired`, `revoked`, `expired`, `superseded`, `attempts` (`body`, `ready`, `retry`, `waiting`), `invalid` | Paneles de estado |
| `INVITATION_COPY` | `product`, `loading`, `enter`, `checking`, `retry`, `unavailable`, `internalTitle`, `internalHelp`, `internalExit`, `continue`, `entryIntro`, `emptyTitle`, `empty`, `expiredTitle`, `expired`, `deniedTitle`, `denied`, `leave` | Carga, sesión interna, sesión vigente, vacío, no disponible y estados de la sala |

Deuda de copy registrada (literales en `invitation-entry.tsx` y `invitation-demo.tsx`, a mover a
`INVITATION_STAGE_COPY` antes de la aceptación): «Sesión de Rooms», «Volver a mi espacio de trabajo»,
«Acceso vigente», «Tu sala está lista.», «Acceso a Rooms» (ya existe como `states.invalid.eyebrow`),
«Volvemos en un momento.» e «Ir al contenido».

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | «Hola, {nombre}», «Entra.», la sala, «Código de acceso» y «Escribe o pega el código de 6 dígitos que llegó a tu correo.» | El foco está en el código; al sexto dígito se verifica; «Verificando el código…» mientras espera; al validar, «Listo.», «Te damos la bienvenida, {nombre}» y «Código correcto. Abriendo la sala.»; a los 1400 ms abre la sala en `#mapa` |
| loading | «Preparando tu acceso…» (`role="status"`) | Mientras lee el enlace o la transacción; no hay casillas ni botones |
| empty | Ojal «Acceso a Rooms», «Tu invitación empieza en el correo.» y «Abre el enlace que recibiste para acceder a esta sala.» | Sin enlace, sin transacción y sin sesión: nunca se pide un correo ni otro destinatario |
| partial | Sin tarjeta o con tarjeta incompleta: faltan el lado «Te invita», el lado «Para» o «Compartes la sala con…»; el ojal dice «Hola» y el pie «¿No puedes entrar? Pídele a quien te invitó que lo haga de nuevo.» | El código funciona igual; cada dato ausente se omite, sin cajas vacías |
| error | Código incorrecto: casillas que tiemblan y «No pudimos validar este código. Revisa el correo de invitación.» (`role="alert"`). Fallo del servicio: «Volvemos en un momento.» con «El acceso no está disponible en este momento. Inténtalo nuevamente en unos minutos.» y «Reintentar» | El código se puede corregir sin recargar; «Reintentar» repite la inicialización. Demasiados intentos (429): «Acceso en pausa», «Demasiados intentos.», «Por seguridad pausamos el acceso. Podrás intentarlo de nuevo en m:ss.»; al terminar, «Ya puedes intentarlo de nuevo.» e «Intentar de nuevo» |
| denied | Código vencido: «Tu código venció.» + «Enviarme un código nuevo». Invitación cerrada: «Esta invitación ya no está activa.» + «{nombre} la cerró…». Vencida: «Esta invitación venció.». Reemplazada: «Hay un enlace más reciente.». Enlace no válido: «No pudimos abrir esta invitación.». Sesión interna abierta: «Tienes una sesión interna abierta.» + «Cerrar sesión interna y continuar» | Cada estado explícito solo existe para quien tiene el token o la transacción reales (HTTP 410); un token desconocido es siempre «No pudimos abrir esta invitación.» (404). Nunca se dice si un correo o una persona existen |

## Accessibility Contract

- Skip link a `#main-content`; `main` con `tabIndex=-1`.
- El `h1` lleva `aria-label` «Entra.» o «Listo.»; sus dos palabras visibles son `aria-hidden` para que el relevo no se
  lea dos veces. La órbita es `aria-hidden`.
- Código: un solo campo con etiqueta visible enlazada, `aria-describedby` a la línea de ayuda, `aria-invalid` solo tras
  un error, y la ayuda con `role="alert"` en error. Las casillas son decorativas y hacer clic en ellas enfoca el campo.
- Anuncios corteses (`aria-live="polite"`): «Dígito N de 6» al escribir, «Verificando el código…», «Código correcto.
  Abriendo la sala.» y «Te enviamos un código nuevo. Revisa tu correo.». La cuenta regresiva de reenvío y la de pausa no
  se anuncian cada segundo.
- Tras «Enviarme un código nuevo», el foco vuelve al campo del código.
- Los lados son `aside` con nombre («Te invita», «Para»); el cliente lleva `role="img"` con su nombre.
- Objetivos táctiles: casillas de 44 × 56 en móvil y botones AXIS de al menos 44 px; foco visible con `--room-outline`
  sobre `--room-halo` (el grupo de casillas muestra un contorno a 8 px).
- El estado no depende del color: error con texto y temblor, éxito con «Listo.» y texto, panel con título propio.
- Privacidad: el fragmento `#token=` se lee una vez y se borra con `history.replaceState` antes de cualquier petición; no
  se guarda en almacenamiento ni viaja en query, analítica o referrer (`referrer: no-referrer`). En `pagehide` se borran
  el token y el código para que Atrás no restaure un código escrito.
- `prefers-reduced-motion: reduce`: sin dibujo, entradas, temblor ni relevo animado; la sala se abre sin la espera de
  1400 ms.

## Implementation Mapping

| Pieza | Archivo en `efeonce-rooms` | Notas |
|---|---|---|
| Página | `src/app/invite/page.tsx` | `dynamic = 'force-dynamic'`, `referrer: 'no-referrer'`; importa `orbit.css` e `invitation-stage.css` |
| Lógica | `src/components/invitations/invitation-entry.tsx` | Máquina de modos `loading`, `code`, `internal`, `guest`, `empty`, `invalid`, `unavailable`, `code_expired`, `revoked`, `expired`, `superseded`, `attempts`; reloj único de 1 s para esperas |
| Vista | `src/components/invitations/invitation-stage.tsx` | `InvitationStage` con `view: loading \| code \| panel` y `phase: idle \| busy \| error \| ok` |
| Demo | `src/components/invitations/invitation-demo.tsx`, `src/app/demo/invitacion/page.tsx` | Estados por `?estado=` |
| Transporte | `src/components/invitations/client-api.ts` | `requestData`, `ClientApiError` (status, code, details, retryAfter), `editionPath` |
| Contrato | `src/domain/invitation-contracts.ts` | `InvitationCard` (`roomLabel`, `inviter`, `client`, `invitee`, `sharedWith`) |
| Estilos | `src/styles/invitation-stage.css`, `src/styles/orbit.css` | Tokens de `theme.ts` |
| Sesión en la sala | `src/components/guest-session-boundary.tsx`, `src/components/invitations/{product-frame,session-actions}.tsx` | `AccessState`, `SessionExit` («Salir de la sala» → `POST /api/invitations/logout` → `/invite`) |
| Copy | `src/lib/copy/invitations.ts` | `INVITATION_STAGE_COPY`, `INVITATION_COPY` |

## Gestión de invitaciones (fuera del canvas)

`/rooms/:roomId/invitations` conserva la interfaz implementada el 2026-10-25 (`invitation-management.tsx`,
`invitations.css`; commit `20f9fe9`): lista con acceso y envío como estados separados, «Invitar», «Reemitir», «Revocar
acceso», «Comprobar envío» y «Actualizar estado», diálogos AXIS con consecuencias, `expectedRevision` e
`Idempotency-Key` estables ante respuesta incierta y 409 recuperable. El canvas no tiene artboard para esta superficie;
no se rediseñó. Hueco: el formulario de creación no pide `recipientName` ni `recipientRole`, así que el lado «Para» de la
invitación solo muestra a la persona cuando la invitación se creó por API o CLI con esos campos.

## Diferencias con el canvas

| Canvas aprobado | Código | Motivo |
|---|---|---|
| Código de 6 caracteres alfanuméricos | 6 dígitos (`/^[0-9]{6}$/`), teclado numérico | Contrato del backend |
| «Vence en 7 días, como el anterior» | Los códigos duran 10 minutos; la invitación tiene su propia vigencia | Contrato del backend |
| «Escríbele a Julio» como enlace | Texto «Pídele a {nombre} que te invite de nuevo.» sin enlace | Nunca se expone un correo |
| «Llegó a c•••@volta.cl» al reenviar | «Te enviamos un código nuevo. Revisa tu correo.» sin dirección | Nunca se expone un correo, ni enmascarado |
| Mensaje personal de quien invita («Camila, armamos esta sala…») | No existe | La tarjeta no tiene campo de mensaje |
| Valida al sexto carácter sin botón | Valida al sexto dígito y además muestra «Entrar a la sala» | Respaldo para teclado, pegado parcial y lectores |
| Tras «Listo.», «Bienvenida, Camila. 5 capítulos. Empezar por el 01» en la invitación | «Listo.» se sostiene 1400 ms y la sala abre en `#mapa`, donde la bienvenida muestra nombre, capítulos y «Empezar por el 01» | La bienvenida necesita los capítulos reales, que solo lee la sala |

## GVC Scenario Plan

- Scenario files: `scripts/frontend/scenarios/rooms-invitation-stage.scenario.ts` (`/demo/invitacion`) y
  `rooms-invitation-entry.scenario.ts` (`/invite` real: vacío, inválido y malformado, limpiando el token).
- Quality profile: premium
- Viewports: desktop 1440×900, laptop 1280×800, mobile 390×844 y compacto 320×740.
- Required captures: «Entra.» de página completa, error de código, «Listo.», y cada `?estado=` (vencido, revocado,
  reemplazado, intentos, interna, cargando).
- Required `data-capture` markers: `invitation-entry`, `invitation-code`, `invitation-recovery`.
- Assertions: Bricolage en la palabra y Poppins en el resto; ningún texto cruza el anillo; la URL no conserva
  `#token=`; ningún correo en DOM ni en red.
- Scroll-width checks: `scrollWidth <= clientWidth` en los cuatro anchos y en todos los estados.
- Reduced-motion / focus evidence: `reducedMotionCheck`; probe `code-then-resend` (Tab desde el código al primer botón
  habilitado con anillo de foco visible).
- Pendiente: recorrido con correo real en la integración (correo → `/invite` → código → sala), retorno por BFCache tras
  revocar y estado de pausa con un 429 real.
- Review dossier: `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/`.
- Baseline decision / surface ID: `rooms.invitation-stage`; capturas candidatas hasta la aceptación humana.

## Design Decision Log

- 2026-10-29 — El canvas aprobado reemplaza la entrada en papel del 2026-10-25 por «Entra.» dentro de la órbita.
- 2026-10-30 — Seis casillas visuales sobre un único campo real: conserva pegar, autocompletar de un solo uso y
  lectores, y da la forma del canvas. Alternativa descartada: seis campos, que rompen pegar y autocompletar.
- 2026-10-30 — Verificación automática al sexto dígito (cambio aprobado respecto del contrato anterior, que no
  autoverificaba), con el botón como respaldo.
- 2026-10-30 — Estados explícitos solo para quien tiene el token o la transacción; el resto es genérico para no
  confirmar la existencia de invitaciones.
- 2026-10-30 — El paso a la sala es navegación de documento (`location.assign`), nunca transición: la autoridad privada
  se lee de nuevo con la cookie nueva.
- Riesgo abierto: literales de copy sin mover a `invitations.ts` (ver Copy Ledger).
