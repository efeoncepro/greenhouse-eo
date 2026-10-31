# TASK-2059 — Flujo de la sala y de «Vive el servicio»

Contrato de navegación reescrito el 2026-10-31 desde el canvas aprobado el 2026-10-29 (`Main`, `Pieza`,
`Radiografia`, `Movil`, `Multiplayer`, `Estados` y la fila 6 `Demo*`) y el código de `efeonce-rooms`
`claude/rooms-approved-ui`. Hereda las reglas de cámara, mapa e iris de
[TASK-2079](TASK-2079-rooms-orbit-foundation-flow.md). No existe un flujo maestro del programa EPIC-052 en
`docs/ui/flows/`; este documento y los de TASK-2068 y TASK-2071 se enlazan entre sí.

## Puntos de entrada

| Desde | Destino | Cómo |
|---|---|---|
| Invitación verificada (TASK-2068) | `/rooms/:roomId/editions/:editionId#mapa` | Navegación de documento tras «Listo.»; la sala abre en el mapa con la bienvenida |
| Sesión de invitado vigente en `/invite` | Mismo destino `#mapa` | Botón «Continuar a la sala» |
| Enlace compartido con hash | `#capitulo-N` o `#mapa` | El hash es la fuente de verdad: abre directo en ese nodo, sin animación de entrada |
| Vuelta desde una escena | `/rooms/:roomId/editions/:editionId#capitulo-N` | «Volver a la sala» en la barra de la escena, con N = capítulo que contiene la escena |
| Vista previa de autoría (TASK-2071) | `/rooms/:roomId/authoring/vista-previa?as=rol` | Misma `RoomOrbit` con `offline` y la proyección del rol; la barra muestra «Ver como: {rol} · volver a autoría» |
| Demo | `/demo/sala`, `/demo/sala?vivo=1`, `/demo/vive/:blockId` | Datos ficticios volta, sin sesión ni API |

## Nodos

| Nodo | Qué se ve | Entrada | Salida |
|---|---|---|---|
| Mapa | Todas las escenas a escala de mapa, anillo con el recorrido y la bienvenida | `#mapa`, botón «Mapa», tecla `M` o Escape desde una escena | Botón de bienvenida, una escena del mapa o un botón de la barra de capítulos |
| Capítulo N | Una escena a escala 1 | Barra de capítulos, ← →, escena del mapa, bienvenida o `#capitulo-N` | Otro capítulo (salto), mapa, iris, escena de servicio |
| Explorar pieza (iris) | La pieza a pantalla completa con adaptaciones y pestañas | Botón «Explorar pieza» o una pieza de la galería | «Cerrar», Escape o Atrás del navegador |
| Radiografía (iris) | La hoja de evidencia | Botón de una evidencia en un bloque | «Cerrar», Escape o Atrás |
| Hoja de capítulos (móvil) | Lista de capítulos y recorrido | Botón «Capítulos · NN/NN» | Elegir capítulo (scroll al capítulo y foco en su título), «Cerrar» o Escape |
| Escena de servicio | Artboard 1440 × 900 a pantalla completa | «Vivir esta parte» o una tarjeta del mosaico | Escena anterior o siguiente, «Volver a la sala» |
| Sesión retirada | «Tu sesión terminó.» o «Este acceso no está disponible.» | Vencimiento, permisos cambiados, BFCache, edición no autorizada | Enlace a `/invite` (invitado) o `/login?returnTo=/rooms` (interno) |

## Transiciones

- **Capítulo → capítulo**: salto orbital en dos fases (`CameraWorld.move`). El hash cambia con
  `history.replaceState` (no llena el historial). El foco va al `h3` sr-only del destino al empezar la fase de
  aterrizaje; el contenido sube cuando la cámara se asienta. `onLand` arranca el temporizador de recorrido.
- **Capítulo → mapa**: la cámara se aleja; foco en el botón del capítulo actual en la barra. Hash `#mapa`.
- **Mapa → capítulo** (escena del mapa o barra): acercamiento; foco en el título del capítulo.
- **Bienvenida → capítulo**: hoy es un ancla `#capitulo-N` (agrega una entrada de historial). La cámara corta directo
  al capítulo sin salto y sin `onLand`; ver riesgo abierto en el wireframe.
- **Capítulo → iris**: `<dialog>.showModal()` y `history.pushState` para que Atrás lo cierre; el foco entra a
  «Cerrar». Al cerrar, el foco vuelve al botón de origen y se consume la entrada de historial.
- **Capítulo → escena de servicio**: navegación de documento a `/vive/:blockId` (la escena vuelve a leer la autoridad
  de la edición). Entre escenas también es navegación de documento, en el orden de `sceneEntries` (capítulos en orden
  de lectura, escenas en orden de bloque). Con una sola escena solo existe «Volver a la sala».
- **Escena → sala**: documento nuevo en `#capitulo-N`. En escritorio la cámara abre directo en ese capítulo; en la pila
  móvil el hash no se lee y la pila abre en el capítulo 01.
- **Móvil**: el scroll es la navegación. Un `IntersectionObserver` (umbral 0,55) define el capítulo actual y alimenta el
  recorrido; elegir en la hoja cierra la hoja, hace scroll suave (directo con movimiento reducido) y enfoca el `h2`.

## Recorrido y escrituras

- Al montar, `progress.get` pinta los capítulos ya recorridos; si falla, la sala se lee igual.
- Un capítulo cuenta como recorrido tras 1,5 s; al salir de él se envía un `progress.mark` por bloque con su `dwellMs`
  (≤ 600 000) y una `Idempotency-Key` por reporte. Al cerrar la pestaña se envía con `keepalive` desde `pagehide`.
- «Enviar pregunta» envía `questions.create` con `expectedRevision`, `questionId` propio y ancla
  `{blockId, assetVersionId}`; el éxito se dice en `role="status"`, el error bajo el campo.
- La demo y la vista previa de autoría son `offline`: no leen ni escriben recorrido ni preguntas.
- Las escenas de servicio no escriben nada.

## Sala en vivo

- Solo con `ROOMS_LIVE_ENABLED=true` o perfil local. Abre `EventSource` a `/api/v1/rooms/:roomId/live`; `ready` trae
  `self` y `peers`; `peer.update`, `peer.leave` y `question.created` actualizan; `closed` con `renew` reconecta y con
  `revoked` o `unavailable` vacía la capa.
- Envía `presence.heartbeat` cada 5 s con el capítulo en pantalla (salvo pestaña oculta), `cursor.move` a 10 por
  segundo como máximo y normalizado a la escena, `selection.set` al hacer clic en un bloque y `presence.leave` al salir.
- En táctil no se envían cursores. Una persona sin nombre visible se nombra por lo que es («Equipo Efeonce» o
  «Invitado»), nunca por un identificador.

## Estados de error, vacío y permiso

| Situación | Respuesta |
|---|---|
| Sin sesión o edición no autorizada | `AccessState` «Este acceso no está disponible.» con el enlace de recuperación según el tipo de sesión |
| Sesión vence o cambian los permisos | `GuestSessionBoundary` reemplaza la sala por «Tu sesión terminó.»; el foco va al título; no queda contenido privado en el DOM |
| Volver con Atrás desde otra página (BFCache) | La sala se retira en `pagehide` y la página se recarga en `pageshow` persistido |
| Error de servidor al leer | `src/app/rooms/error.tsx` con reintento |
| Escena inexistente o mal codificada en la URL | «Esta parte todavía no tiene sus piezas listas.» con «Volver a la sala» (nunca un 500) |
| Capítulo sin bloques visibles | No se muestra |
| Sin `evidence.read` o sin `questions.create` | Se ocultan los controles, nunca se muestran deshabilitados |

## Teclado

← → cambian de capítulo; `M` y Escape van al mapa; Enter activa una escena del mapa o un botón de la barra; Escape
cierra el iris o la hoja. Ningún atajo actúa con el foco en un campo, con modificadores o con un diálogo abierto. En las
escenas de servicio todo se opera con Tab, Enter y Espacio sobre botones nativos.

## GVC Scenario Plan

- Scenarios: `rooms-orbit-room` (pasos: capítulos 01 a 05, mapa con bienvenida, explorar pieza, adaptación 9:16,
  radiografía), `rooms-orbit-room-mobile` (pila, pieza primero, hoja de capítulos con apertura y cierre por teclado),
  `rooms-live-room` (cursores y selección, ocultar cursores) y `rooms-service-*` (entrada, interacción principal y
  navegación de la escena).
- Viewports 1440×900, 1280×800, 390×844 y 320×740; repetir con movimiento reducido.
- Pendiente: recorrido de documento completo invitación → `#mapa` → capítulo → escena → «Volver a la sala» contra la
  integración con una sala real.
- Evidencia en `docs/ui/reviews/TASK-2059-rooms-first-experience/`.

## Design Decision Log

- 2026-10-30 — Los capítulos van en el hash con `replaceState`; el iris sí entra al historial porque Atrás debe
  cerrarlo (heredado de TASK-2079).
- 2026-10-31 — Las escenas de servicio son rutas propias con navegación de documento: cada una relee la autoridad de la
  edición y se puede compartir; descartado abrirlas dentro del iris.
- 2026-10-31 — El orden entre escenas sigue el orden de lectura de la sala, no un orden fijo de tipos.
- Riesgo abierto: la bienvenida usa un ancla en vez de `move()`, y la pila móvil ignora el hash de vuelta (ver
  wireframe).
