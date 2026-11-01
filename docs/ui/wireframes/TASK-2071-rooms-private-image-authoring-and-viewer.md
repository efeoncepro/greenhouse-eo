# TASK-2071 — Rooms: mesa de autoría, ediciones y escenas

Diseño de implementación reescrito el 2026-10-31 desde dos fuentes: el canvas «Efeonce Rooms — UI», aprobado entero
por el operador el 2026-10-29 (artifact `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`), y
el código implementado en `efeonce-rooms`, rama `claude/rooms-approved-ui` (`15810f6`, `58287fb`, `95d3ac2`,
`717c478`, sin push). Cuando el canvas y el código difieren, este documento describe el código y registra la
diferencia. No es aceptación humana: `UI ready` sigue en `no`.

Esta task cubre la superficie interna donde Efeonce arma la sala: la mesa de autoría (inventario, cobertura, escenario
compartido con «Ver como», propiedades, subir imagen, publicar y reabrir borrador), la autoría de escenas «Vive el
servicio» con su escenario en vivo, y la página «Qué cambió» entre dos ediciones publicadas, que también ve el
cliente. La sala que se publica es de TASK-2059; las primitivas son de TASK-2079.

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Source durable: sección «Aprobación 2026-10-29» de ese documento y los artboards `Autoria` («Autoría · armar y
  publicar») y `Ediciones` («Qué cambió entre ediciones»); para la autoría de escenas, la fila 6 `Demo*` (el escenario
  muestra la escena tal como la verá el comprador).
- Gobierno: [ADR de escenas](../../architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md) y
  [contrato backend](../../documentation/rooms/backend-api-for-claude-design.md) (§ «Comparar ediciones, Ver como…»,
  § «Vive el servicio», § «Flujo de imagen completo»).
- Quality profile: `premium`.
- Fuera de alcance: `Consola`, `Audiencia`, `Senales` y `Video`. En la mesa tampoco existen todavía la gestión de
  adaptaciones ni la carga de medios V4 (video, PDF, audio).

## Rutas y superficies

| Ruta | Qué muestra | Quién | Datos |
|---|---|---|---|
| `/rooms/:roomId/authoring` | `AuthoringClient` → `AuthoringStudio`; sin borrador abierto, `AuthoringReopen` | Interno con `content.edit` (el reader lo exige) | `authoringModel` (`src/server/presentation/authoring.ts`): `rooms.authoring` + `content.previewAudience` por rol + `listEditions` |
| `/rooms/:roomId/authoring/vista-previa?as=buyer\|champion\|audience` | El borrador en la sala real (`RoomOrbit`, `offline`) | Interno | `model.previews[rol]` |
| `/rooms/:roomId/authoring/vista-previa/vive/:blockId?as=` | Una escena del borrador a pantalla completa | Interno | Ídem |
| `/rooms/:roomId/editions/:editionId/cambios?desde=:baseEditionId` | «Qué cambió» (`EditionChanges`) | Cualquier sesión con lectura de ambas ediciones, invitados incluidos | `editionChanges` (`src/server/presentation/edition-changes.ts`): `listEditions` + `compareEditions` + `getEdition` de las dos |
| `/demo/autoria`, `/demo/ediciones` | Mesa y «Qué cambió» con volta ficticia | Público, sin red | `authoring-demo.tsx`, `volta-editions.ts` |

## Composición de la mesa (escritorio, 1440 × 900)

Una mesa clara alrededor de la escena oscura del cliente. La página ocupa `100dvh` (mínimo 640) sin scroll de página,
en tres filas: barra de 64 px, franja de cobertura y tres columnas de **280 px | flexible | 340 px**. Fondo
`--room-paper`, texto `--room-navy`.

1. **Barra** (`--room-panel`): lockup `rooms-lockup-positive.svg` de 176 × 20, regla, migas «Salas / {cliente ·
   título}» (enlace a `/rooms`), píldora «Borrador · revisión N» y, si la sala es sintética, «Datos ficticios». A la
   derecha: el estado de guardado (`role="status"`: «Guardando…», «Cambios guardados» o el error), «Abrir vista previa»
   (outline), «Publicar edición N» (primario, solo con permiso de publicar; deshabilitado si la cobertura no lo permite
   o si ya se publicó) y la salida de sesión.
2. **Cobertura**: ojal «Cobertura», barra de hasta 420 px (o 40 vw) y 10 px de alto con tres tramos proporcionales:
   incluidas (relleno `--room-teal-dark`), pendientes (rayado a 135°) y excluidas (neutro); leyenda «N incluidas»,
   «N pendientes», «N excluidas». Si no se puede publicar: «Hay piezas pendientes o capítulos sin ordenar: revisa la
   cobertura antes de publicar.».
3. **Inventario** (280 px, con scroll propio): «Inventario creativo · N piezas»; cada pieza es un botón con miniatura de
   64 px, nombre y «proporción · estado» (`aria-pressed` si está seleccionada). Debajo, el grupo «Vive el servicio ·
   N escenas» con un glifo de órbita por escena, su título (el del borrador sin guardar si lo hay) y
   «tipo · estado · sin guardar». Luego «Añadir escena», las imágenes listas para usar («nombre · Lista» +
   «Usar en la sala»), las que se procesan («nombre · Procesando…» o «No se pudo procesar», con un punto que late) y el
   botón de carga «Añadir imagen» con «PNG, JPG o WebP, hasta 20 MB. Se procesa en privado.».
4. **Escenario compartido** (columna central sobre un fondo apenas tintado): encabezado «Escenario compartido · {nota del
   rol}» y el selector «Ver como» (Comprador, Champion, Audiencia) con una tinta navy que se desliza. Debajo, el
   **capítulo del cliente a su tamaño real de 1100 × 680**, escalado para caber, inerte y `aria-hidden`; si la selección es
   una escena, la **escena a su tamaño real de 1440 × 900**, escalada, construida desde el borrador sin guardar. Luego
   la barra de capítulos del escenario («NN título», `aria-current="page"`) y la frase «Lo que ves aquí es exactamente lo
   que verá {quien compra | el champion | la audiencia}.».
5. **Propiedades de la pieza** (340 px, `--room-panel`, con scroll propio): «Pieza seleccionada», título y
   «proporción · proporción original, sin recorte»; interruptor «Incluir en la edición» (deshabilitado si es
   obligatoria: «Obligatoria: siempre va en la edición»); «Capítulo» (selector); «Título en la sala» (se guarda al
   salir del campo); «Por qué funciona» con «Lo lee el cliente en la pestaña Fundamento de la pieza.» (al salir del
   campo); «Evidencia vinculada» con la lista o «Sin evidencia vinculada.» y «Vincular evidencia», que abre el selector
   «Elige la evidencia».
6. **Editor de escena** (en la misma columna cuando la selección es una escena): «Escena · {tipo}», título, ayuda del
   tipo; interruptor de inclusión y capítulo; «Título en la sala»; «Introducción» («Una o dos frases bajo el título.»);
   los campos del tipo; y un pie fijo con «Cambios sin guardar. El escenario ya los muestra.», la lista de problemas y
   las acciones «Guardar escena», «Descartar cambios» o, sin cambios, «Probar a pantalla completa».
7. **Publicar**: `<dialog>` de hasta 480 px: «Publicar la edición N», «El cliente verá esta versión. Una edición
   publicada no cambia: para corregirla se crea una nueva, y la anterior queda en el historial.», el resumen
   «X piezas incluidas en Y capítulos» y, si aplica, «N piezas pendientes quedan fuera de esta edición»; «Cancelar» y
   «Publicar» («Publicando…» mientras envía).
8. **Aviso de publicación**: tostada fija abajo al centro, navy: «Edición N publicada» y «Abrir la sala».
9. **Sin borrador** (`AuthoringReopen`): título de la sala, «No hay un borrador abierto.», «La edición N está publicada y
   no cambia. Para preparar la siguiente, abre un borrador a partir de ella.», «Abrir la sala» (outline) y
   «Abrir borrador» («Abriendo…»).

### Campos por tipo de escena

| Tipo | Campos (límites del contrato) | Reglas que bloquean guardar |
|---|---|---|
| `showcase` — Tu marca, en el mundo | «Pieza» (cambiarla vacía lugares y notas); «Lugares»: por superficie (feed, story, vía pública, web) el formato o «Sin usar», «Dónde» (≤ 120), texto del post o de la página en feed y web (≤ 240) y «Botón de la página» en web (≤ 40); «Lo que muestra la lente»: hasta 24 decisiones, cada una con su formato, «Etiqueta» (≤ 40), «Decisión» (≤ 160) y posición «Horizontal (%)» y «Vertical (%)», que también se fija tocando la imagen | La pieza existe y está incluida; cada formato existe; una superficie por lugar; cada decisión sobre un formato mostrado |
| `cycle` — Así trabajamos | «Pieza»; «Objetivos del brief» (2 a 4, ≤ 80); «Ajustes que puede pedir» (1 a 4: etiqueta ≤ 40 y «Cómo cambia la pieza»: Más luz, Encuadre más cerrado, Más contraste, Más cálida); «Plazo de respuesta» y «Rondas incluidas» (≤ 60) | La pieza existe y está incluida |
| `answers` — Respuestas de IA | «Origen de las respuestas» (Medidas o Ilustrativas) y «Fecha de captura» si son medidas; «Preguntas» (3 a 16), cada una con la pregunta (≤ 200), «Respuesta hoy» (≤ 800) y hasta 4 fuentes («Fuente», «Tipo», «Citada»); «Con el plan, la marca aparece» abre «Respuesta con el plan» y sus fuentes, o si no «Por qué el plan no la incluye» (≤ 200) | Medidas exigen fecha; sin plan exige la razón |
| `team` — Tu equipo | «Personas» (1 a 6: nombre y rol ≤ 60, «Te ayuda con» ≤ 240, «Pídele así» ≤ 160); «Semana» (hasta 7 días: día ≤ 20, «Qué pasa» ≤ 80, «Quién»); «Responde en» (≤ 60); «Nota sobre el ritmo» (≤ 120) | Cada día apunta a una persona del equipo |

Comunes: título obligatorio; ids únicos; en una sala real, ningún marcador entre corchetes (`scene_placeholder`). Una
escena nueva nace con valores editables; en salas reales los marcadores (`[PLAZO]`, `[N] rondas`, `[Nombre]`) impiden
publicar hasta reemplazarlos.

## Composición de «Qué cambió» (escritorio)

Fondo oscuro (`--room-ground` 55 % con negro), barra de 64 px con «Volver a la sala» y el lockup blanco de 176 × 20.
Contenido con relleno 28/48/48:

1. **Encabezado**: ojal con la sala; a la derecha, la **línea de tiempo** «Historial de ediciones» con las seis
   ediciones más recientes hasta la mostrada y la base si es anterior (puntos de 14 px: base con borde claro, objetivo
   relleno teal, tramo teal entre ambos; las anteriores son enlaces). Título en Bricolage `clamp(44px, 5vw, 72px)`:
   «Qué cambió desde la edición N.».
2. **Cuerpo** en dos columnas (hasta 520 px | resto, separación 40): la **lista** («N cambios» y «El cliente ve la
   edición M») con un botón por cambio: número en Bricolage 32 ligero, «capítulo · tipo» (Nuevo, Retirado, Cambió,
   Cambió de lugar o Pieza corregida), el título y el resumen («Se agregó en esta edición.», «Ya no está en esta
   edición.», «Pasó de la posición X a la Y» o «Cambió: Título, Texto…»).
3. **Detalle** del cambio elegido: si cambió la imagen, un **comparador deslizante** (proporción real de la imagen nueva,
   imagen anterior debajo y nueva recortada desde `--wipe`, tirador de 44 px, etiquetas de ambas ediciones y un `range`
   0–100) junto al texto; si no, una tarjeta con el texto. El texto muestra el título tachado y el nuevo, el diff por
   palabras (`del` atenuado, `ins` con fondo teal y subrayado) y los datos Capítulo, Cambió y Formato.

Sin cambios: «Estas dos ediciones tienen el mismo contenido.».

## Desktop Target

1440 × 900: la mesa no hace scroll de página; inventario y propiedades hacen scroll propio y el escenario conserva la
escena completa a escala (un capítulo de 1100 × 680 cabe a ~0,7 en la columna central). El momento dominante es la
escena del cliente, oscura, sobre la mesa clara. En 1280 × 800 la columna central se reduce y la escena escala con
ella. Desde 1101 px se mantienen las tres columnas. «Qué cambió» usa sus dos columnas desde 1001 px.

## Mobile Target

Hasta 1100 px la mesa pasa a una columna con scroll de página: barra que se ajusta en varias líneas (el estado de
guardado ocupa su propia línea), cobertura, inventario como rejilla de tarjetas de al menos 220 px, escenario de
`min(60vw, 520px)` de alto y propiedades debajo. Hasta 600 px se ocultan lockup, regla y la píldora de revisión; la barra
de cobertura ocupa todo el ancho; el escenario mide 56 vw; los rellenos bajan a 16 px; los pares de campos pasan a una
columna; el pie de guardado de escena sigue fijo abajo. En «Qué cambió», hasta 1000 px lista y detalle se apilan (el
comparador hasta 360 px) y hasta 600 px se oculta el lockup, la línea de tiempo se ajusta en varias filas y los títulos
bajan a 28 px. Sin scroll horizontal en 390 × 844.

## Action Hierarchy

- Primaria de la mesa: «Publicar edición N», una sola, a la derecha de la barra y con confirmación. «Abrir vista previa»
  es secundaria.
- Por pieza, las acciones son ediciones in situ (interruptor, selector, campos que se guardan al salir); no hay botón
  «Guardar» para piezas.
- Por escena, «Guardar escena» es la primaria y solo se habilita con cambios válidos; «Descartar cambios» es secundaria;
  «Probar a pantalla completa» aparece solo sin cambios pendientes.
- «Añadir imagen» y «Añadir escena» viven al pie del inventario; «Usar en la sala» es la acción de cada imagen lista.
- En «Qué cambió», «Volver a la sala» es la única salida; la lista selecciona y el comparador se arrastra.

## Visual Fidelity Mapping

| Elemento del canvas | Fuente en código | Regla |
|---|---|---|
| Mesa clara y escena oscura | `--room-paper`, `--room-panel`, `--room-navy`, `--room-teal-dark`, `--room-ground`, `--room-deep` vía `src/styles/theme.ts`; líneas con `color-mix` sobre navy | Ningún hex en componentes |
| Escenario idéntico a la sala | `ChapterScene` de `room-orbit.tsx` y `SceneBody` dentro de `SceneEmbed` | La mesa no reimplementa la escena: usa los mismos componentes que el comprador |
| «Ver como» | Proyección `content.previewAudience` por rol (`model.previews`) | El rol solo puede ocultar; nunca crea sesión |
| Botones, campos | `Button`, `Field`, `Input`, `Textarea` de `@efeoncepro/axis-ui-primitives/react` | Selectores, interruptor y radios son controles nativos estilizados |
| Tipografía | Bricolage para títulos de escena, de «Qué cambió» y de la confirmación; Poppins para el resto | Ojales 11–12 px con espaciado 0,14 em |
| Lockup | `rooms-lockup-positive.svg` (mesa) y `rooms-lockup-white.svg` («Qué cambió») | Nunca animado |
| Comparador | `clip-path: inset()` sobre la imagen nueva | Nunca recorta la proporción: `object-fit: contain` |

## Copy Ledger

Copy en `../efeonce-rooms/src/lib/copy/rooms.ts`:

| Objeto | Ids principales | Dónde |
|---|---|---|
| `AUTHORING_COPY` | `rooms`, `draft`, `saving`, `saved`, `saveError`, `conflict`, `preview`, `publish`, `published`, `notPublishable`, `coverage`, `coverageAria`, `included`, `pending`, `excluded`, `inventory`, `pieces`, `state`, `processing`, `addImage`, `addImageHelp`, `uploading`, `uploadError`, `readyLabel`, `placeInRoom`, `placeInRoomLabel`, `stage`, `stageSr`, `viewAs`, `roles`, `roleNote`, `whoSees`, `exactly`, `chapters`, `empty`, `selected`, `originalRatio`, `include`, `required`, `chapter`, `noChapter`, `titleLabel`, `why`, `whyHelp`, `evidence`, `noEvidence`, `link`, `linkPick`, `excludedReason`, `confirmTitle`, `confirmBody`, `confirmIncluded`, `confirmPending`, `confirm`, `confirming`, `cancel`, `openRoom`, `synthetic`, `noDraftTitle`, `noDraftBody`, `reopen`, `reopening`, `reopenError` | Mesa, confirmación, aviso, sin borrador |
| `SCENE_AUTHORING_COPY` | `group`, `count`, `add`, `addHelp`, `chapterTitle`, `types`, `typeHelp`, `needsPiece`, `eyebrow`, `intro`, `introHelp`, campos por tipo, `save`, `discard`, `dirty`, `unsaved`, `tryIt`, `invalid`, `issues`, `fieldIssue`, `fields`, `defaults` | Inventario de escenas y editor |
| `EDITIONS_COPY` | `back`, `history`, `edition`, `title`, `summary`, `current`, `kinds`, `pieceChanged`, `compare`, `fields`, `changedFields`, `moved`, `noChanges`, `added`, `removed`, `chapter`, `format`, `formatValue` | «Qué cambió» |

Deuda registrada: «Ir al contenido» y el `alt` «Efeonce Rooms» son literales en la mesa y en «Qué cambió»; la barra de la
vista previa compone «{Ver como}: {rol} · volver a autoría» con un literal; `AUTHORING_COPY.changes` («Ver qué cambió»)
existe pero no tiene punto de entrada (ver flujo).

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | Mesa con inventario, cobertura, escenario «Comprador» y la primera pieza no excluida seleccionada; «Qué cambió desde la edición N.» con la lista y el primer cambio | Cada edición se envía por command y refresca el modelo del servidor; el estado de guardado lo confirma |
| loading | «Guardando…» en la barra; «Publicando…» en el diálogo; «Abriendo…» al reabrir; «nombre · Subiendo…» y «nombre · Procesando…» en el inventario | No hay bloqueo de pantalla: se puede seguir mirando mientras se guarda; los botones de la acción en curso se deshabilitan |
| empty | «Elige una pieza del inventario para verla en su capítulo.» sin selección; «Primero añade una pieza con imagen.» para escenas que necesitan pieza; «Sin evidencia vinculada.»; sin borrador: «No hay un borrador abierto.» con «Abrir borrador»; en «Qué cambió», «Estas dos ediciones tienen el mismo contenido.» | Cada vacío dice qué hacer: elegir, subir, vincular o reabrir |
| partial | Cobertura incompleta: «Hay piezas pendientes o capítulos sin ordenar…» y «Publicar» deshabilitado; imagen que falló: «nombre · No se pudo procesar»; escena con problemas guardados: la lista de `issues`; sin permiso de publicar: no aparece «Publicar»; sin permiso de carga: no aparecen «Añadir imagen» ni «Añadir escena» | La mesa sigue editable; la publicación espera cobertura completa |
| error | «No pudimos guardar el cambio. Vuelve a intentarlo.»; conflicto de revisión: «La sala cambió mientras editabas. Recargamos la última versión.»; carga fallida (incluido un archivo que no es PNG, JPG o WebP de hasta 20 MB, rechazado antes de enviar): hoy muestra el mismo «No pudimos guardar el cambio…», porque `AUTHORING_COPY.uploadError` («No pudimos subir la imagen. Revisa el formato y el tamaño.») existe pero no está conectado; escena inválida: «Completa: título, …» o «Revisa la escena antes de guardar.»; reabrir: «No pudimos abrir el borrador. Vuelve a intentarlo.» | Todo error refresca el modelo del servidor; un conflicto nunca pisa la versión ajena; la escena sin guardar conserva el borrador local para corregir |
| denied | `AccessState` «Este acceso no está disponible.» si la sesión no es interna, el reader niega `content.edit`, la sala está archivada o hay un borrador que la mesa no pudo leer; en «Qué cambió», el mismo estado si alguna edición no se puede leer o no existe una edición base | Enlace a `/login?returnTo=/rooms` (interno) o `/invite` (invitado) |

## Accessibility Contract

- Skip link a `#main-content` (la columna del escenario). Inventario y propiedades son `aside` con nombre
  («Inventario creativo», «Pieza seleccionada»); la cobertura es una `section` con nombre y la barra un `role="img"` con
  `aria-label` «N incluidas, N pendientes, N excluidas»; la leyenda repite los números en texto.
- «Ver como» es un `radiogroup` con `aria-checked`, foco itinerante y flechas ← →; el foco sigue a la opción marcada.
- Los ítems del inventario son botones con `aria-pressed`; el estado se dice con texto («Incluida», «Pendiente»,
  «Excluida», «sin guardar»), nunca solo con color.
- El escenario es una imagen fiel no interactiva: el contenido escalado es `inert` y `aria-hidden`, y un párrafo sr-only
  explica «Vista reducida del capítulo tal como lo verá el cliente. Para recorrerla completa, usa Abrir vista previa.».
- «Incluir en la edición» es un `role="switch"` con `aria-checked` y nombre; los campos usan `Field` con etiqueta y
  ayuda; los grupos de escena son `fieldset` con `legend`; quitar un elemento tiene nombre propio («Quitar {nombre}»).
- El fijador de la lente es un botón con nombre «Ubicar «etiqueta» en la imagen»; la posición también se escribe en dos
  campos numéricos 0–100.
- El pie de guardado de escena es `aria-live="polite"`; el estado de guardado de la barra es `role="status"`; la
  tostada es `role="status"`.
- Publicar usa un `<dialog>` modal con `aria-labelledby`; Escape y «Cancelar» cierran.
- «Qué cambió»: la línea de tiempo es un `nav` con nombre y `aria-current` en la edición mostrada; cada cambio es un
  botón con `aria-pressed`; el detalle es `aria-live="polite"`; el comparador es un `range` con nombre «Comparar
  edición N y edición M», operable con flechas y con foco visible en todo el marco; las dos imágenes tienen `alt` con su
  edición.
- Objetivos de al menos 44 px en el comparador, la línea de tiempo y «Volver a la sala»; foco visible con
  `--room-outline`.
- `prefers-reduced-motion: reduce`: sin transiciones ni entradas (contrato de motion).

## Implementation Mapping

| Pieza | Archivo en `efeonce-rooms` | Notas |
|---|---|---|
| Página de la mesa | `src/app/rooms/[roomId]/authoring/page.tsx` | Sesión interna; sin modelo: `getRoom` + `getDraft` deciden entre `AuthoringReopen` y `AccessState` |
| Cliente de commands | `src/components/authoring/authoring-client.tsx` | `expectedRevision` vigente e `Idempotency-Key` por acción; tras cada write, `router.refresh()`; `rearrange` reubica bloques sin dejar capítulos vacíos |
| Mesa | `src/components/authoring/authoring-studio.tsx` | `AuthoringStudio`, `RoleSwitch`, `SceneStage`, `ScenePreview`, `PieceProperties`, `AddScene` |
| Escenas | `src/components/authoring/{scene-editor,scene-defaults}.tsx` | `newScene`, `surfaceFor`, `draftView` (mismo resolutor que la sala), `draftProblems` (zod + `sceneIssues`) |
| Modelo | `src/components/authoring/authoring-model.ts`, `src/server/presentation/authoring.ts` | `AuthoringModel`: piezas, escenas, formatos, procesando, listas, capítulos, evidencia, previews por rol |
| Reabrir | `src/components/authoring/authoring-reopen.tsx` | `editions.reopen {sourceEditionId}` |
| Vista previa | `src/app/rooms/[roomId]/authoring/vista-previa/page.tsx` y `.../vive/[blockId]/page.tsx` | `RoomOrbit offline` y `ServiceScene` con `?as=` |
| «Qué cambió» | `src/app/rooms/[roomId]/editions/[editionId]/cambios/page.tsx`, `src/components/editions/{edition-changes,changes-model}.tsx`, `src/server/presentation/edition-changes.ts` | `compareEditions` + ambas ediciones leídas con la autoridad de quien mira |
| Contrato de escenas | `src/domain/scene-contracts.ts` | `showcase`, `cycle`, `answers`, `team` (`schemaVersion: 1`), `SCENE_SURFACES`, `CYCLE_EFFECTS`, `sceneIssues`, `PLACEHOLDER` |
| Estilos | `src/styles/authoring.css`, `src/styles/editions.css` (+ `orbit.css`, `room.css`, `service.css` para el escenario) | Tokens de `theme.ts` |
| Copy | `src/lib/copy/rooms.ts` | `AUTHORING_COPY`, `SCENE_AUTHORING_COPY`, `EDITIONS_COPY` |

Commands: `content.upsertBlock` (renombrar, fundamento, excluir, escenas), `content.arrange` (capítulos),
`content.attachAsset` (imagen nueva como principal), `content.linkEvidence`, `uploads.initiate` → `PUT` al descriptor
de transferencia → `uploads.complete`, `editions.publish`, `editions.reopen`. Ninguno se ejecuta desde un componente de
la sala: todos pasan por `POST /api/v1/commands` con el cliente de `src/client`.

## Diferencias con el canvas

| Canvas aprobado | Código | Motivo |
|---|---|---|
| «Guardado hace un momento» | «Cambios guardados» | Sin reloj relativo; el estado se basa en la confirmación del command |
| Notas «sólo el champion» sobre el escenario | No existen en la mesa | Notas propias del presentador pertenecen a la consola, fuera de alcance |
| «El champion recibe el aviso por correo» en la confirmación | No se promete aviso | No hay aviso por correo al publicar |
| «Edición N publicada. El cliente ya la ve.» | «Edición N publicada» + «Abrir la sala» | Copy más corto; el enlace lleva a la edición nueva |
| Ediciones: tipo de evidencia que cambia («Hipótesis → Observación»), motivo del cambio y autor («Por Efeonce · 3 de noviembre») | Tipo de cambio, campos cambiados y diff por palabras; sin motivo ni autor | El comparador del backend no trae motivo ni autor por cambio |
| Estado «Pendiente de revisión» | «Pendiente» | Cobertura del backend: incluida, pendiente o excluida |
| Adaptaciones agrupadas en la mesa («Cero tacos · cuadrado») | Cada imagen se usa como pieza nueva; las adaptaciones se crean por API o CLI | Gestión de adaptaciones desde la mesa no implementada |
| Autoría de escenas | No existe en el canvas; se diseñó sobre la misma mesa con el escenario de 1440 × 900 | Requisito del operador del 2026-10-31 (ADR de escenas) |

## GVC Scenario Plan

- Scenario files: `scripts/frontend/scenarios/rooms-authoring.scenario.ts` y `rooms-authoring-scenes.scenario.ts`
  (`/demo/autoria`), `rooms-edition-changes.scenario.ts` (`/demo/ediciones`).
- Quality profile: premium
- Viewports: desktop 1440×900, laptop 1280×800 y mobile 390×844 (mesa y escenas); desktop 1440×900 y mobile 390×844
  («Qué cambió»).
- Required captures: mesa como comprador y como champion, pieza excluida, confirmación de publicar, editor de
  `showcase` y de `cycle`, menú «Añadir escena», comparador de pieza y diff de texto.
- Required `data-capture` markers: `authoring`, `authoring-scene-stage`, `authoring-reopen`, `edition-changes`.
- Assertions: el escenario muestra la misma escena que la sala para ese rol; ninguna imagen recortada; el foco se queda
  en «Ver como» al cambiar con flechas.
- Scroll-width checks: `scrollWidth <= clientWidth` en todos los viewports.
- Reduced-motion / focus evidence: `reducedMotionCheck`; probes `view-as-arrows`, `add-scene-keyboard` y
  `wipe-slider-keyboard`.
- Evidencia de runtime (local, contra la integración, sala sintética): renombrar persistió (revisión 36 → 37); se publicó
  la edición 6 y «Qué cambió» mostró el cambio; subir imagen → «Usar en la sala» creó, adjuntó y ubicó la pieza;
  `editions.reopen` abrió el borrador siguiente; crear, editar, guardar y probar una escena en la sala sintética Lumbre.
- Pendiente: adaptaciones y medios V4 en la mesa; conflicto de revisión con dos editores; aceptación humana.
- Review dossier: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`.
- Baseline decision / surface ID: `rooms.authoring`, `rooms.authoring-scenes` y `rooms.edition-changes`; capturas
  candidatas hasta la aceptación humana.

## Design Decision Log

- 2026-10-29 — El canvas aprobado reemplaza el panel de imagen única del 2026-10-25 por una mesa completa: inventario,
  cobertura, escenario compartido y propiedades.
- 2026-10-30 — El escenario usa los mismos componentes que la sala (no una maqueta): «lo que ves aquí es exactamente lo
  que verá» es verificable.
- 2026-10-31 — Las piezas se guardan al salir de cada campo; las escenas, completas y con guardar explícito, porque su
  bloque se valida entero y el escenario ya muestra el borrador.
- 2026-10-31 — Cada write refresca el modelo del servidor en vez de mutar una copia local; un conflicto recarga la
  última versión y lo dice.
- 2026-10-31 — Sin borrador tras publicar, la mesa ofrece «Abrir borrador» (`editions.reopen`) en vez de un error.
- 2026-10-31 — Una escena nueva se ubica en el capítulo que ya tiene escenas o crea «Vive el servicio».
- Riesgo abierto: el error de carga usa el mensaje genérico de guardado; conectar `AUTHORING_COPY.uploadError` antes de
  la aceptación humana.
- Riesgo abierto: «Qué cambió» no tiene punto de entrada en la sala ni en la tostada de publicar; hoy se llega por URL.
- 2026-10-31 — Las tres proyecciones de «Ver como» se leen en el servidor al cargar la mesa: cambiar de rol es
  instantáneo y no tiene estado de carga. Costo: tres lecturas de vista previa por cada refresco tras un write.
