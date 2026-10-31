# TASK-2059 — Rooms: la sala es una órbita

Diseño de implementación reescrito el 2026-10-31 desde dos fuentes: el canvas «Efeonce Rooms — UI», aprobado entero
por el operador el 2026-10-29 (artifact `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`), y
el código implementado en `efeonce-rooms`, rama `claude/rooms-approved-ui` (`c133299`, `32640ee`, `5e4a73b`,
`717c478`, sin push). Cuando el canvas y el código difieren, este documento describe el código y registra la
diferencia en «Diferencias con el canvas». No es aceptación humana: `UI ready` sigue en `no`.

Esta task cubre la sala que recibe el comprador: el mundo-cámara con capítulos sobre un anillo, el mapa con la
bienvenida y el recorrido real, el explorador de pieza, la radiografía, la versión móvil apilada, la capa en vivo y
la entrada a «Vive el servicio» con sus cuatro escenas a pantalla completa. La invitación es de TASK-2068 y la mesa
de autoría de TASK-2071; las primitivas (órbita, halo, cámara, iris, grano) son de TASK-2079.

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Source durable: sección «Aprobación 2026-10-29 — canvas la sala es una órbita» de ese documento y los artboards
  `Main` («Sala · la órbita como navegación»), `Pieza`, `Radiografia`, `Movil`, `Multiplayer`, `Estados`, y la fila 6
  «Vive el servicio — la demo es la sala» (`DemoMarca`, `DemoCiclo`, `DemoRespuestas`, `DemoEquipo`). Gramáticas de
  movimiento en las notas del canvas «Motion — gramática de la sala» y «Gramática líquida» (ver el contrato de motion).
- Gobierno: [ADR de escenas](../../architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md) (Accepted
  2026-10-31), [ADR de sala en vivo](../../architecture/rooms/EFEONCE_ROOMS_LIVE_ROOM_REALTIME_DECISION_V1.md)
  (Accepted 2026-10-30) y [contrato backend](../../documentation/rooms/backend-api-for-claude-design.md).
- Quality profile: `premium`.
- Fuera de alcance (artboards del canvas no implementados aquí): `Consola` (consola del presentador), `Audiencia`
  (vista de audiencia), `Senales` (señales para Efeonce) y `Video` (pieza de video). Los botones del canvas
  «Descargar PDF» y «Preparar presentación» dependen de esas superficies y no existen en la barra.

## Rutas y superficies

| Ruta | Qué muestra | Quién entra | Fuente de datos |
|---|---|---|---|
| `/rooms/:roomId/editions/:editionId` | `RoomOrbit` dentro de `GuestSessionBoundary`; `LiveLayer` encima cuando `ROOMS_LIVE_ENABLED=true` o perfil local | Invitado con sesión de invitación o miembro interno con lectura | `getEdition` → `readingRoom` (`src/server/presentation/content.ts`) |
| `/rooms/:roomId/editions/:editionId/vive/:blockId` | Una escena de «Vive el servicio» a pantalla completa (`ServiceScene`) | La misma autoridad que la edición | La misma lectura; el bloque llega como `kind: 'scene'` ya resuelto |
| `/demo/sala` y `/demo/sala?vivo=1` | La sala con la marca ficticia volta (6 capítulos); `?vivo=1` suma dos personas ficticias | Público, sin sesión ni llamadas a la API (`offline`) | `VOLTA_ROOM` en `src/lib/demo/volta-room.ts` |
| `/demo/vive/:blockId` | Las cuatro escenas con volta | Público, sintético | `VOLTA_ROOM` + `volta-service.ts` |

## Composición de la sala (escritorio)

La sala es un plano 2D movido por una sola transformación (`CameraWorld`). Cada capítulo es una escena de
**1100 × 680 unidades de mundo** ubicada sobre un anillo de radio `worldRadiusFor(n) = max(1700, n·1300/2π)`
(12 capítulos → 2484), así que ninguna escena se superpone. La escala de una escena en pantalla es
`min(1, (ancho − 32)/1100, (alto − 150)/680)`: en 1440 × 900 la escena se ve a tamaño real centrada en el viewport.

1. **Barra** (`.room-bar`, 64 px, fondo `--room-deep`): lockup oficial `rooms-lockup-white.svg` de 193 × 22, regla de
   1 px, y el contexto en dos líneas: título (`cliente · título`, o solo el título si ya empieza con el cliente) en
   Poppins 14/500 y `subtítulo · edición` en 12 px atenuado; ambos con elipsis. A la derecha: la etiqueta
   «Datos ficticios» (píldora con borde punteado) solo cuando `dataOrigin !== 'real'`, y `SessionExit`
   («Salir de la sala» para invitados, «Cerrar sesión» para internos).
2. **Escena de capítulo** (`ChapterScene`, `<article aria-labelledby>`): 1100 × 680, relleno 56/60/48, radio 28, fondo
   `--room-ground` y un halo radial en la esquina superior derecha. El diseño depende de lo que contiene el capítulo,
   nunca de una plantilla elegida por el autor:
   - `idea` (sin piezas): título dominante arriba y cuerpo separado por una regla.
   - `feature` (una pieza): columna de texto de 330 px y la pieza a la derecha en su proporción original; debajo del
     texto, el botón «Explorar pieza» y el pie `pie · proporción`.
   - `gallery` (dos o más piezas): texto en dos columnas (`1fr` + 300 px) y una banda de 980 × 360 donde cada pieza
     se dimensiona con `gallerySizes`: verticales a alto completo, horizontales (ratio > 1,5) a la mitad, separación 28,
     todo escalado para caber. Nunca se recorta; cada pieza es un botón que abre el explorador.
   - `service` (escenas y ninguna pieza): columna de 380 px y un mosaico de dos columnas con una tarjeta por escena
     (número, título Bricolage 30, introducción de hasta tres líneas, «Vivir esta parte →»).
   Tipografía del título: Bricolage 700, 104 px si tiene hasta 34 caracteres y 64 px si es más largo (64 en `feature`,
   52 en `gallery`, 60 en `service`), con el punto final en teal (`withPoint`). El ojal superior es
   `NN — título del capítulo`.
3. **Bloques de texto** (`BlockText`): fragmentos; `diagnostic` en tres columnas con etiquetas de borde línea,
   punteado y relleno; `plan` como pasos numerados con «medición»; `editorial` con sus datos; y, si el lector tiene
   `evidence.read`, un botón outline por evidencia vinculada que abre la radiografía.
4. **Barra de capítulos** (`.room-camera-nav`, abajo a 20 px): un botón por capítulo con su número y, desde 1181 px,
   su título (máximo 140 px con elipsis); un punto teal marca los capítulos ya recorridos. El último botón es «Mapa»
   (`aria-pressed`).
5. **Mapa** (`#mapa`): la cámara se aleja a `min(0,18, min(ancho, alto)/(radio·2,6))`. Aparecen el anillo
   (opacidad 0,22) y, si hay recorrido, el arco teal desde las 12 proporcional a `recorridos/total`; bajo cada escena
   su etiqueta `NN · título`; las escenas recorridas llevan un borde teal. Sobre cada escena hay un botón transparente
   (mínimo 44 × 44) con nombre «Ir al capítulo NN: título». En el centro, la **bienvenida**: «Te damos la bienvenida,
   {nombre}», «{N} capítulos.» en Bricolage 72, «Recorriste x de N» cuando hay recorrido, y el botón
   «Empezar por el 01» o «Seguir en el NN».
6. **Grano**: textura fija `feTurbulence` sobre todo (opacidad 0,07, `soft-light`).
7. **Capa en vivo** (`LiveLayer`, solo con dos o más personas): arriba a la derecha, avatares de 34 px con iniciales
   (hasta cinco más «Tú»), «N personas en la sala ahora» y el botón «Ocultar cursores / Mostrar cursores»; debajo, un
   registro de 280 px «Ahora en la sala» (solo desde 1600 px); cursores con nombre y rol; selección con ocho tiradores
   y etiqueta; y una burbuja de pregunta abajo a la derecha (300 px, nueve segundos). El color de cada persona sale de
   cuatro tokens según su id opaco, nunca de un dato personal.

### Iris: explorar pieza y radiografía

Ambos son un `<dialog>` modal a pantalla completa que nace como círculo desde el botón que lo abrió (`IrisReveal`).

- **Explorar pieza** (`data-capture="piece-explorer"`): rejilla `1fr + 360 px`. Arriba, el nombre del bloque y
  «Cerrar». El escenario ajusta el marco a la proporción real de la adaptación activa (escala máxima 1,6) y nunca
  recorta. El lateral muestra las adaptaciones (forma de la proporción + etiqueta «16:9», `aria-pressed`) cuando hay
  más de una, y pestañas AXIS «Fundamento», «Evidencia» y «Preguntar». «Preguntar» solo aparece con
  `questions.create`, fuera de la demo y con `revision` numérica; envía `questions.create` anclado al bloque y al
  `assetVersionId`.
- **Radiografía** (`data-capture="evidence-paper"`): una hoja en papel de hasta 760 px (relleno 56/64) con el tipo de
  evidencia, «Declarada por el autor · sin verificar», el título, la afirmación, el hilo «Se usa en» (regla teal de
  2 px con los capítulos que la citan) y los campos Fuente declarada, Ámbito, Método, Cobertura, Fecha de captura y
  Limitación; un campo vacío dice «No indicada».

### «Vive el servicio»: entrada desde la sala y las cuatro escenas

Un capítulo de escenas se ve como mosaico (diseño `service`). Un bloque de escena dentro de otro capítulo muestra el
botón «Vivir esta parte» y la ayuda «Se abre a pantalla completa. Vuelves a este capítulo con «Volver a la sala».».
Sin escena resuelta o sin `sceneBase`, la tarjeta queda deshabilitada con «Esta parte todavía no tiene sus piezas
listas.».

Cada escena se compone sobre un **artboard de 1440 × 900** (`SceneFrame`). Con ventana de al menos 1024 × 600 se
muestra entera, escalada a `min(ancho/1440, alto/900)` y centrada. Por debajo de eso, sus regiones se apilan en el
orden `flowOrder` (la obra primero) y las regiones dibujadas en sus propias coordenadas (`fit`) se escalan al ancho.
La barra de la escena mide 64 px: lockup 193 × 22, migas «{cliente} · Vive el servicio» y la navegación «Recorrido»
(escena anterior o «Volver a la sala»; escena siguiente «Siguiente: …» o «Volver a la sala»). Las escenas no escriben
en la API: lo que el comprador hace ahí es una simulación.

| Escena (`type`) | Regiones en el artboard (x, y, ancho × alto) y orden móvil | Lo que hace el comprador |
|---|---|---|
| Tu marca, en el mundo (`showcase`) | Texto (64, 112, 400) móvil 2; escenario (488, 64, 952 × 836, ajustable) móvil 1; nota sintética (64, 850, 400) móvil 3 | Elige el lugar (feed, story, vía pública, web): la pieza se licúa hacia el nuevo marco (teléfono, story, valla con carretera, navegador). «Ver cómo está hecha» abre una lente que muestra la construcción: tercios, diagonales y las decisiones anotadas |
| Así trabajamos (`cycle`) | Texto (64, 104, 432) móvil 3; pasos (584, 104, 792) móvil 1; escenario (560, 200, 880 × 700, ajustable) móvil 2; «En la vida real» (64, 790, 432) móvil 4; aviso de simulación (976, 852, 400) móvil 5 | Elige un objetivo y «Enviar brief»; ve la gota viajar a Efeonce y volver con la propuesta (edición 1); pide un ajuste o aprueba; cada ajuste vuelve como edición nueva; «Hacer el ciclo otra vez» reinicia |
| Respuestas de IA (`answers`) | Texto (64, 104, 380); nube (470, 96, 470 × 780, ajustable); tarjeta (964, 104, 420 × 756). Sin `flowOrder`: en móvil texto, nube y tarjeta | Alterna «Hoy» y «Con el plan»: el contador «aparece en N de T» cambia, la nube se reúne y se separa; elige una pregunta y lee la respuesta con sus fuentes numeradas |
| Tu equipo (`team`) | Texto (64, 104, 400) móvil 2; escenario (520, 80, 880 × 560, ajustable) móvil 1; semana (520, 676, 856) si hay días; nota sintética (64, 850, 400) | Elige a una persona en la órbita: la tarjeta dice en qué ayuda, cómo pedirle algo y en cuánto responde; la semana se llena día por día; «Ver la semana otra vez» la repite |

## Desktop Target

1440 × 900 es el viewport de diseño. La sala ocupa `100dvh` (mínimo 560 px) sin scroll de página: barra de 64 px y el
mundo-cámara debajo. La escena de 1100 × 680 queda centrada con aire a los lados; la barra de capítulos flota abajo
sin tapar el contenido de la escena. El primer momento visual dominante es el título del capítulo en Bricolage y,
cuando hay obra, la pieza en su proporción original. En 1280 × 800 la escena se reduce a `(800 − 150)/680 ≈ 0,96` y
todo conserva su posición. Entre 601 y 1180 px la barra de capítulos muestra solo números; la escena sigue escalando
con la misma fórmula. Las escenas de «Vive el servicio» se muestran enteras desde 1024 × 600.

## Mobile Target

En 600 px o menos (`useCompactViewport`) la sala deja el mundo-cámara y usa `RoomStack`: los capítulos apilados en una
columna con relleno 16/16/96, cada escena en su altura natural (relleno 28/20, radio 20), el título a 44 px (34 si es
largo) y, en `feature`, **la pieza primero** (artboard `Movil` «la pieza primero»). Las galerías pasan a una columna;
cada pieza ocupa el ancho con alto máximo de 70 svh (60 svh en `feature`). Abajo flota «Capítulos · 01/06» (botón de
48 px) que abre una hoja inferior (`<dialog>`, hasta 80 dvh) con una mini órbita de radio 40 que mide el recorrido,
«N capítulos» y «Recorriste x de N», y la lista de capítulos (filas de 52 px, estación rellena si se recorrió,
`aria-current="step"` en el actual). En la barra se ocultan lockup, regla y la etiqueta sintética. El explorador de pieza
pasa a una columna (encabezado, escenario de al menos 40 dvh, pestañas debajo) y la hoja de radiografía a relleno 32/24
con campos en una columna. La capa en vivo conserva avatares y burbuja y oculta conteo, botón y cursores. En 390 × 844
y 320 × 740 no hay scroll horizontal. Las escenas de «Vive el servicio» se apilan bajo 1024 px de ancho o 600 px de
alto.

## Action Hierarchy

- En una escena de capítulo, la acción primaria es la de su contenido: «Explorar pieza» en `feature`, cada pieza en
  `gallery`, «Vivir esta parte» en `service`. Las evidencias son botones outline secundarios.
- En el mapa, la primaria es «Empezar por el 01» o «Seguir en el NN»; las escenas del mapa son atajos.
- La barra de capítulos es navegación, no acción; «Mapa» es un conmutador.
- Dentro del iris, «Cerrar» va arriba a la derecha y recibe el foco; en «Preguntar», «Enviar pregunta» es la única
  primaria y se deshabilita sin texto o mientras envía.
- En una escena de «Vive el servicio», cada fase tiene una sola primaria («Enviar brief», «Aprobar edición N»,
  «Ver cómo está hecha») y la navegación del recorrido vive en la barra.
- «Salir de la sala» queda en la barra como acción terciaria (ghost).

## Visual Fidelity Mapping

| Elemento del canvas | Fuente en código | Regla |
|---|---|---|
| Fondo, halo, teal, navy, papel, tinta | `efeonceGraphicLine.color` de `@efeoncepro/axis-tokens` vía `src/styles/theme.ts` (`--room-ground`, `--room-deep`, `--room-halo`, `--room-teal`, `--room-navy`, `--room-paper`, `--room-ink`, `--room-mist`) | Ningún hex en componentes; los colores derivados usan `color-mix` sobre tokens |
| Tipografía | `--room-font-display` (Bricolage Grotesque, `type.answer.family`) y `--room-font-body` (Poppins, `type.text.family`) | Títulos y números en Bricolage; texto funcional en Poppins |
| Órbita del mapa y de la hoja móvil | `Orbit`, `CameraWorld` y `orbit-geometry.ts` de TASK-2079 | El arco mide un dato real (`progress.get`); sin recorrido solo hay anillo |
| Movimiento | `ORBIT_TIMING`, `ORBIT_EASE` y `SERVICE_TIMING` de `src/components/orbit/motion.ts` | Ver contrato de motion; excepciones literales registradas allí |
| Botones, pestañas, campos | `Button`, `Tabs`, `Field`, `Textarea` de `@efeoncepro/axis-ui-primitives/react` | Nada de botones recreados salvo controles de dominio (estaciones, adaptaciones, contextos, chips) |
| Lockup | `/brand/rooms-lockup-white.svg` sincronizado desde `@efeoncepro/axis-brand-assets` | Nunca recreado ni animado |
| Grano | `Grain` (`feTurbulence` estático) | No es movimiento; se mantiene con movimiento reducido |
| Marca del cliente en escenas | `--sd-brand` (acento del cliente en la demo volta; teal en salas reales) | El manifiesto nunca trae color, fuente ni duración |

## Copy Ledger

Todo el copy de la sala vive en `../efeonce-rooms/src/lib/copy/rooms.ts` (es-CL, tuteo):

| Objeto | Ids principales | Dónde se ve |
|---|---|---|
| `ROOM_ORBIT_COPY` | `welcome`, `chapters`, `startAt`, `continueAt`, `reached`, `map`, `navigation`, `chapter`, `openChapter`, `explorePiece`, `pieces`, `ratio`, `mediaPending`, `synthetic`, `close`, `pieceDialog`, `evidenceDialog` | Barra, mapa, bienvenida, escenas, iris |
| `ROOM_ORBIT_COPY` (pieza) | `tabs.rationale/evidence/ask`, `tabsLabel`, `adaptation`, `originalRatio`, `noEvidence`, `askLabel`, `askHelp`, `askSend`, `askSending`, `askSent`, `askError` | Explorar pieza |
| `ROOM_ORBIT_COPY` (radiografía) | `evidenceTitle`, `evidenceDeclared`, `usedIn`, `evidenceKinds`, `evidenceFields`, `notIndicated` | Radiografía |
| `ROOM_ORBIT_COPY` (móvil) | `mobileMap`, `chapters`, `reached` | Botón «Capítulos · NN/NN» y hoja |
| `ROOM_LIVE_COPY` | `region`, `now`, `you`, `hideCursors`, `showCursors`, `feed`, `walking`, `selecting`, `present`, `asked`, `joined`, `left`, `label`, `unnamed` | Capa en vivo |
| `SERVICE_COPY` | `crumb`, `journey`, `backToRoom`, `eyebrow`, `next`, `previous`, `liveIt`, `liveItHelp`, `unavailable` y los grupos `showcase`, `cycle`, `answers`, `team` | Entrada desde la sala y las cuatro escenas |
| `INVITATION_COPY` | `expiredTitle`, `expired`, `deniedTitle`, `denied`, `leave` | `GuestSessionBoundary`, `AccessState`, `SessionExit` |

Deuda de copy registrada (literales en JSX fuera de esos objetos): «Ir al contenido» en el skip link de
`RoomOrbit`; «Cargando la sala…», «No pudimos abrir esta sala.» y su ayuda en `src/app/rooms/loading.tsx` y
`error.tsx` (los ids `ROOM_COPY.loading`, `errorTitle` y `errorDescription` existen pero no se usan); «Cerrar sesión» en
`SessionExit`. Ningún texto nuevo se agrega sin moverlo a `rooms.ts` o `invitations.ts`.

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | Escena del capítulo con su título y obra; en `#mapa`, «Te damos la bienvenida, {nombre}» y «N capítulos.» | Barra de capítulos, mapa, explorador y radiografía operan; el recorrido se marca tras 1,5 s en un capítulo |
| loading | «Cargando la sala…» (`src/app/rooms/loading.tsx`, `role="status"`) mientras el servidor lee la edición; «La pieza se está procesando. Vuelve en unos minutos.» para un medio sin renditions | La página es SSR; no hay esqueleto animado. La pieza en proceso no se refresca sola: recargar la muestra cuando esté lista |
| empty | Un capítulo sin bloques visibles no se muestra (`chapterViews` lo filtra); una escena sin piezas listas dice «Esta parte todavía no tiene sus piezas listas.»; sin recorrido no se dibuja arco en el mapa | La sala nunca inventa capítulos ni recorrido; el autor completa la sala desde la mesa |
| partial | Sin `evidence.read`: no hay botones de evidencia y la pestaña Evidencia dice «Esta pieza no tiene evidencia asociada en esta edición.»; sin `questions.create`: no aparece «Preguntar»; `progress.get` falla: la sala se lee igual sin puntos de recorrido; capa en vivo apagada: no hay presencia | Cada ausencia es silenciosa y sin controles vacíos; el contenido autorizado se lee completo |
| error | «No pudimos abrir esta sala.» con «Inténtalo nuevamente. Tu acceso se volverá a verificar.» (`src/app/rooms/error.tsx`); en Preguntar, «No pudimos enviar la pregunta. Inténtalo de nuevo.» bajo el campo | El botón de reintento vuelve a renderizar la ruta; la pregunta conserva el texto escrito para reintentar |
| denied | «Este acceso no está disponible.» y «Comprueba tu sesión o contacta a quien te invitó.» (`AccessState`), con enlace a `/invite` (invitado) o `/login?returnTo=/rooms` (interno); al vencer la sesión, «Tu sesión terminó.» y «Abre nuevamente el enlace de tu invitación para continuar.» | `GuestSessionBoundary` retira la sala del DOM al vencer, al cambiar permisos (revisión cada 30 s y al volver a la pestaña) y antes del BFCache, y mueve el foco al título |

## Accessibility Contract

- Skip link a `#main-content`; `main` con `tabIndex=-1`. Cada escena es un `article` con `aria-labelledby` al título
  `h2`; además, cada escena del mundo lleva un `h3` sr-only «Capítulo NN: título» que recibe el foco al aterrizar.
- Las escenas fuera de cámara (y todas en el mapa) llevan `aria-hidden` e `inert`: el teclado nunca entra a un
  capítulo que no se ve.
- Barra de capítulos: `nav` con nombre «Capítulos de la sala»; botones con texto sr-only «Capítulo NN: título» y
  `aria-current="step"` en el actual; «Mapa» con `aria-pressed`. Teclado: ← → cambian de capítulo, `M` y Escape van al
  mapa; ningún atajo actúa en campos de texto, con modificadores o con un diálogo abierto.
- Iris: `<dialog>` modal con `aria-label` («Pieza a pantalla completa», «Evidencia a pantalla completa»); «Cerrar»
  recibe el foco; Escape y Atrás del navegador cierran; el foco vuelve al botón que lo abrió.
- Adaptaciones con `aria-pressed` y texto sr-only «Adaptación N de T»; las pestañas son las de AXIS con su rol.
- El recorrido se dice con texto («Recorriste x de N»), nunca solo con el arco o el punto teal; los capítulos
  recorridos llevan además `data-visited` y la estación rellena.
- Capa en vivo: los cursores y selecciones son `aria-hidden`; las llegadas, salidas y preguntas se anuncian en una
  región `aria-live="polite"`; la burbuja es `role="note"`; el conmutador de cursores mantiene el foco.
- Escenas de servicio: cada escena tiene un `h1` y anuncia sus cambios en un `aria-live="polite"` (lente, fases del
  ciclo, conteo de respuestas, persona elegida). Los grupos de opciones usan `aria-pressed` o `role="radio"` con
  `aria-checked`, y todo lo decorativo (órbitas, gotas, cromos) es `aria-hidden`.
- Objetivos táctiles de al menos 44 px (botones de mapa, adaptaciones, chips, contextos, navegación de escena); foco
  visible con `--room-outline` sobre `--room-halo`.
- Contraste: texto `paper` sobre `ground` y tinta sobre papel en la radiografía; el teal nunca es el único portador de
  un estado.
- `prefers-reduced-motion: reduce`: cortes directos (contrato de motion).

## Implementation Mapping

| Pieza | Archivo en `efeonce-rooms` | Notas |
|---|---|---|
| Página de edición | `src/app/rooms/[roomId]/editions/[editionId]/page.tsx` | `presentationSession` → `getEdition` → `readingRoom`; `viewerName` para la bienvenida; `sceneBase` hacia `/vive/` |
| Sala | `src/components/room/room-orbit.tsx` | `RoomOrbit`, `ChapterScene`, `BlockText`, `gallerySizes`, `PieceExplorer`, `AskForm`, `EvidencePaper` |
| Capítulos | `src/components/room/chapter-view.tsx` | `chapterViews` (filtra capítulos vacíos) y `withPoint` |
| Móvil | `src/components/room/room-stack.tsx` | `IntersectionObserver` (umbral 0,55) marca el capítulo actual y el recorrido |
| Recorrido | `src/components/room/use-room-progress.ts` | `progress.get` al montar; `progress.mark` por bloque al salir de un capítulo visitado ≥ 1,5 s (`keepalive` en `pagehide`, `dwellMs` ≤ 600 000) |
| En vivo | `src/components/room/live-layer.tsx` | SSE `GET /api/v1/rooms/:roomId/live`; `POST .../live/events` (`presence.heartbeat` cada 5 s, `cursor.move` ≤ 10/s, `selection.set`, `presence.leave`) |
| Escenas | `src/components/service/{service-scene,scene-frame,showcase-scene,cycle-scene,answers-scene,team-scene}.tsx` | `sceneEntries` ordena las escenas por capítulo; `SceneFrame` decide artboard o pila |
| Primitivas | `src/components/orbit/{camera-world,iris-reveal,orbit,depth,motion}.tsx` | TASK-2079 |
| Estilos | `src/styles/room.css`, `src/styles/orbit.css`, `src/styles/service.css` | Tokens de `theme.ts` |
| Contratos | `src/components/content/reader-contract.ts`, `src/domain/scene-contracts.ts`, `src/domain/live-contracts.ts` | Escenas validadas por zod; `LIVE_LIMITS` |
| Copy | `src/lib/copy/rooms.ts` | `ROOM_ORBIT_COPY`, `ROOM_LIVE_COPY`, `SERVICE_COPY` |

Commands que dispara la sala: `progress.mark` y `questions.create`. Readers: edición publicada, `progress`,
`questions` (para la burbuja en vivo) y presencia. Las escenas no escriben.

## Diferencias con el canvas

| Canvas aprobado | Código | Motivo |
|---|---|---|
| Barra con «Descargar PDF» y «Preparar presentación» | No existen | Dependen de la consola y la exportación, fuera de esta task |
| La sala abre en el mapa y la cámara entra sola al capítulo 01 | La sala abre en `#mapa` con la bienvenida y espera que la persona elija «Empezar por el 01» | Decisión de implementación: la persona controla la entrada y ve primero el recorrido |
| Explorar pieza con capas «Vista limpia», «En contexto» y «Detalle 220 %» | Solo vista limpia con adaptaciones; el contexto de uso vive en la escena «Tu marca, en el mundo» | «En contexto» se resolvió como escena de servicio; «Detalle» no implementado |
| Preguntar muestra el hilo de preguntas y respuestas de la pieza | Solo envía la pregunta y confirma «Pregunta enviada» | La lectura del hilo dentro de la pieza no está implementada |
| Radiografía sobre un artículo con modo «Lectura / Radiografía», fragmentos subrayados y un hilo dibujado hasta la decisión | Hoja de evidencia en el iris, abierta desde el botón de cada evidencia, con el hilo estático «Se usa en» | El modo de lectura con fragmentos anclados no está implementado |
| Pieza procesándose «aparece aquí sola, sin recargar» (`Estados`) | Mensaje fijo; aparece al recargar | No hay suscripción a cambios de rendition en la sala |
| Escenas de capítulo fijas de cinco capítulos | De 1 a 12 capítulos, radio del anillo creciente | Contrato de capítulos de TASK-2080 |

## GVC Scenario Plan

- Scenario files (Greenhouse): `scripts/frontend/scenarios/rooms-orbit-room.scenario.ts` (`/demo/sala`),
  `rooms-orbit-room-mobile.scenario.ts`, `rooms-live-room.scenario.ts` (`/demo/sala?vivo=1`) y
  `rooms-service-{showcase,cycle,answers,team}.scenario.ts` (`/demo/vive/:blockId`), contra el servidor local de Rooms.
- Quality profile: premium
- Viewports: desktop 1440×900 y laptop 1280×800 para la sala y las escenas; mobile 390×844 y compacto 320×740 para la
  pila; mobile 390×844 para las escenas.
- Required captures: capítulos `idea`, `feature`, `gallery`, `plan` y `service`; mapa con bienvenida; explorador de
  pieza y adaptación 9:16; radiografía; pila móvil con la pieza primero y la hoja de capítulos; cursores y selección en
  vivo y cursores ocultos; en cada escena, el estado inicial y el estado tras la interacción principal (lugar `ooh` y
  lente, ciclo aprobado, «Con el plan», persona elegida).
- Required `data-capture` markers: `room-orbit`, `guest-room`, `camera-world`, `room-stack`, `piece-explorer`,
  `evidence-paper`, `iris-dialog`, `room-live`, `service-showcase`, `service-cycle`, `service-answers`, `service-team`.
- Assertions: Bricolage en títulos y Poppins en texto; ninguna pieza recortada (`object-fit: contain` y marco con la
  proporción real); foco en la barra de capítulos al volver del mapa; foco devuelto al cerrar el iris y la hoja móvil.
- Scroll-width checks: `scrollWidth <= clientWidth` en todos los viewports y estados.
- Reduced-motion / focus evidence: `reducedMotionCheck` en cada escenario; probes `map-focus-lands-on-chapter-bar`,
  `sheet-open-close-focus`, `cursor-toggle-keeps-focus` y `context-keyboard`.
- Pendiente: GVC con una sala real de 8 a 12 capítulos y con medios V4 (video y PDF); recorrido de dos personas en vivo
  contra la integración (verificado en local el 2026-10-30, sin evidencia GVC).
- Review dossier: `docs/ui/reviews/TASK-2059-rooms-first-experience/`.
- Baseline decision / surface ID: `rooms.orbit-room`, `rooms.orbit-room-mobile`, `rooms.live-room` y
  `rooms.service-scenes`; capturas candidatas hasta la aceptación humana, sin autoaceptar baseline.

## Design Decision Log

- 2026-10-29 — El operador aprobó el canvas entero; reemplaza la composición editorial del scaffold anterior.
- 2026-10-30 — El diseño de cada escena sale de su contenido (`idea`, `feature`, `gallery`, `service`); el autor no
  elige plantilla. Alternativa descartada: un selector de diseño por capítulo, que permitía capítulos vacíos de obra.
- 2026-10-30 — Móvil apilado bajo 600 px en vez de una cámara reducida: en un teléfono la cámara dejaba la pieza
  pequeña y el gesto de deslizar competía con el scroll.
- 2026-10-30 — El recorrido cuenta tras 1,5 s en un capítulo; un paso rápido camino a otro no es una visita.
- 2026-10-30 — La presencia en vivo no es evidencia de atención: el recorrido y las señales salen solo de
  `progress.mark` (ADR de sala en vivo).
- 2026-10-31 — «Vive el servicio» son bloques de contenido con contrato propio y se abren a pantalla completa en su
  propia ruta, no dentro del iris: necesitan el artboard completo de 1440 × 900 (ADR de escenas).
- 2026-10-31 — Las escenas no escriben en la API; registrar el ajuste pedido sería un comando propio futuro.
- Riesgo abierto: el botón de bienvenida es un ancla a `#capitulo-N`; la cámara corta directo sin el salto, el
  aterrizaje no llama a `onLand` (ese capítulo no cuenta en el recorrido hasta el siguiente cambio) y el foco queda en
  el `body` porque la bienvenida se desmonta. Visto en el código, no ejercitado en navegador; corregir llamando a
  `move()` desde la bienvenida antes de la aceptación humana.
- Riesgo abierto: la pila móvil no lee el hash, así que `#capitulo-N` (por ejemplo, al volver de una escena) abre la
  pila en el primer capítulo.
