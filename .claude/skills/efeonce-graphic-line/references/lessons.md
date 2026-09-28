# Lecciones (trampas que ya costaron tiempo)

> Cada entrada: fecha, síntoma, causa y la regla que la evita. Es la parte más valiosa de la skill: se agrega en el
> momento, no al cierre.

## 2026-09-26

- **Las recetas se alejaron del canvas en silencio.** Síntoma: lente con disco gigante, foco sin anillo, firma con el
  arco a la derecha, deck con el texto en otro lugar. Causa: se derivaba cada pieza de una sola escala, pero el canvas
  ajustó cada pieza a mano. Regla: las piezas de formato fijo se **miden** del canvas (`efeonceGraphicLine.pieces`,
  `portrait`) y la receta las reproduce; cada una tiene una prueba contra su pieza original. Antes de publicar una
  receta, compararla con su lámina (posición, trazos, opacidad, grados del arco, esfera, texto y logo).
- **IDs duplicados de SVG.** Síntoma: en el storyboard del foco, la luz de todos los cuadros quedaba en la posición del
  primero. Causa: cada cuadro repetía `id="…-mask"` y el navegador resuelve `url(#id)` al primero del documento.
  Regla: prefijo por defecto = hash del contenido; piezas idénticas en una misma página llevan su propio `idPrefix`
  (`<AxisOrbit>` usa `useId`). La e2e del Lab exige cero ids duplicados.
- **La cola de render se saltaba variantes sin avisar.** Causa: `node`/`ffmpeg` leen stdin dentro de
  `while read … < queue.txt` y se comen líneas. Regla: `< /dev/null` en todo comando dentro de un `while read`.
- **Dos colas en paralelo corrompieron 4 MP4.** Regla: candado de una sola instancia (`mkdir .lock`) y marcas
  `.done`/`.encoded`; nunca relanzar una cola sin revisar `pgrep`.
- **Un cierre que borra carpetas choca con una cola que escribe en ellas.** Regla: `chain.sh` espera al cierre antes
  de relanzar; el cierre sólo borra después de verificar archivo por archivo en el bucket.
- **Etiqueta tomada por otra sesión.** `v0.3.2` quedó en el commit anterior y `axis-tokens` 0.3.2 salió sin `motion`.
  Regla: antes de etiquetar, `git ls-remote --tags origin` y confirmar que el commit de la etiqueta contiene el cambio
  (`git merge-base --is-ancestor`); coordinar con las sesiones activas.
- **El Lab no compila con un export nuevo de otra sesión.** Síntoma: `MISSING_EXPORT` en el build del Lab. Regla:
  `pnpm build` en la raíz de AXIS (compila los paquetes) antes de construir el Lab.
- **El clasificador de permisos bloquea publicar y crear infraestructura pública** (etiquetas de release, buckets
  públicos). Regla: pedir la autorización explícita del operador al comienzo, no al final.
- **Instalar AXIS en local da 401.** Regla: credencial `read:packages` efímera con `NPM_CONFIG_USERCONFIG` apuntando a
  un archivo 600 que se borra al terminar; nunca imprimirla ni commitearla.
- **Comentario de código desactualizado citado como regla** («logo al 46 % / 58 %»). Regla: los números salen del
  código o del token, nunca de un comentario.
- **Refactor del motor sin romper lo aprobado.** Regla: renderizar el storyboard antes y después y comparar byte a
  byte (90 cuadros + 3 sonidos idénticos el 2026-09-26).
- **ffmpeg local sin libwebp.** Regla: los pósters WebP se hacen con `sharp`.
- **El panel del navegador no reproduce video de archivos locales** (muestra una instantánea). Regla: mostrar video
  desde el Lab o desde una URL, no desde un HTML local.
- **La e2e «creative typography reference» cae por tiempo con render en paralelo.** No es regresión: correrla sola.

- **Documentar el método leyendo el maestro, no de memoria (íconos, 2026-09-26).** Síntoma: un agente sin contexto
  siguió la receta de Plastilina y pintó el gesto en el acento. Causa: la receta decía «acento en la esfera y el gesto»,
  pero el maestro `IconoE` lo pinta en tinta; y la geometría vivía sólo en el canvas. Regla: toda receta se contrasta
  contra el código del maestro antes de publicarse, la geometría canónica vive en código versionado (hoy AXIS: `@efeoncepro/axis-graphic-line/icons`), y
  un método nuevo se prueba con un subagente sin contexto antes de darlo por documentado.
- **Un glifo puede pasar todas las reglas medibles y no ser de la familia (íconos, segunda prueba a ciegas,
  2026-09-26).** Síntoma: un agente sin contexto armó una fila de Growth, un calendario de Trazo y una guitarra de
  Plastilina sólo con la documentación; la guitarra, con el mástil fino, pasaba los controles y aun así no se leía como
  Plastilina (masa gorda, carácter). Causa: `pnpm icons:check` mide el peso —área contra el rango del set, aire de la
  esfera, margen, gesto—, no el carácter; lo que tuvo que inventar el agente (margen en el eje, vocabulario de `use`,
  especificación del gesto, criterio para elegir la variante) se agregó a la guía y a los comandos de AXIS (commit
  `d9c62f4`, tag `v0.3.6`). Regla: un control verde no da de alta un glifo; el alta necesita las hojas de control
  **y** el ojo del operador junto al set aprobado. Si un glifo «pasa» pero se ve distinto, se descarta la variante, no
  se afloja la regla.

## 2026-09-27 (Plastilina en volumen, D24)

- **Extruir el vector en Blender da una «galleta».** Síntoma: el primer volumen salió plano, como una galleta cortada
  con molde; el operador lo rechazó («no me gusta, al menos no así»). Causa: la extrusión sólo empuja el contorno; no
  infla la masa. Regla: el volumen sale de un modelo de imagen **editando** el ícono plano aprobado (GPT Image 2.5
  Sunburst, `pnpm icons:volume -- refs` como referencia), nunca de extruir el vector.
- **El matting con IA rellena los calados.** Síntoma: `pnpm ai:image:rmbg` rellenó los huecos internos (3 966 px en el
  bombillo) y dejó semitransparente la esfera suelta de la cámara. Causa: el matting decide figura por semántica, no por
  color. Regla: con fondo liso conocido (`#001a33`), recorte por **color** (distancia al fondo + des-mezcla del borde,
  `pnpm icons:volume -- key`); nunca matting con IA para el volumen.
- **Figura y fondo se pueden invertir sin que el QA lo vea.** Síntoma: la primera pasada del laptop devolvió la pantalla
  como marco hueco con barras en relieve (en el plano es una losa sólida con ranuras); la segunda dejó las ranuras
  hundidas, no pasantes. Causa: la silueta normalizada no distingue qué es hueco y qué es relieve. Regla: el volumen se
  mira al 100 % siempre; si un detalle falla, se agrega **una** línea al prompt que lo nombre (la que resolvió el
  laptop: «la pantalla es una losa sólida; sus ranuras y cada tecla atraviesan la arcilla») y no se reescribe el prompt.
- **Contar calados no detecta un disco perdido dentro de un anillo.** Síntoma: la cámara perdió el disco del lente y el
  conteo de calados seguía igual (un agujero en ambos casos). Causa: el disco perdido no cambia la cantidad de huecos.
  Regla: el QA cuenta también las **piezas sueltas** (3 → 2 lo detecta); ambas cuentas van en `check`.
- **librsvg (sharp) recorta el gesto.** Síntoma: en la referencia faltaban los trazos del gesto que salen de la grilla
  48. Causa: `overflow="visible"` no se respeta al rasterizar. Regla: la referencia se renderiza abriendo el viewBox al
  lienzo, no confiando en el overflow.
- **Un aviso del QA no es un rechazo.** Síntoma: 7 de 18 glifos salieron con avisos (laptop 0,44, escritorio 0,64,
  teléfono 0,73 por perspectiva y grosor; pluma, tijeras y audífonos juntan piezas que se tocan; megáfono deja el anillo
  de la esfera como hueco). Causa: el volumen cambia la silueta y fusiona piezas en contacto sin reinventar la forma.
  Regla: se revisan al 100 % y se aceptan salvo forma reinventada, calado vuelto relieve o figura-fondo invertida; los
  aceptados quedan anotados (AXIS guía §9 y [iconography.md](iconography.md) §12.6).

## 2026-09-27 (oficio: 30 glifos nuevos, D25)

- **Las claves de glifo son únicas entre las dos voces.** Síntoma: el Trazo del teléfono no podía llamarse `telefono`.
  Causa: `telefono` ya es la clave de la Plastilina del móvil, y `ICON_CATALOG` junta Trazo y Plastilina en un solo
  espacio de claves. Regla: antes de dar de alta un glifo, buscar la clave en **todo** el catálogo, no sólo en su voz;
  si choca, se nombra por la acción (`llamada`) y no se le agrega sufijo de voz. Detalle: [iconography.md](iconography.md)
  §13.1.
- **El Trazo no usa arcos elípticos.** Síntoma: los óvalos de `base-de-datos` no se podían dibujar con un arco elíptico.
  Causa: `samplePath` sólo mide arcos circulares, y es lo que usa el control del aire de la esfera. Regla: un óvalo del
  Trazo se construye con **cuatro arcos circulares tangentes**; vale para cualquier glifo nuevo con óvalos
  ([iconography.md](iconography.md) §9.1).

## 2026-09-27 (La órbita por superficie en el Artifact Composer, TASK-1919)

- **Un gancho que mide texto espera las fuentes.** Síntoma: el frame del storyboard variaba entre corridas del gate
  visual. Causa: el gancho medía con la fuente de respaldo antes de que cargara la real. Regla: todo gancho de un
  catálogo `graphic-line-*` (selección, CTA, storyboard) espera `document.fonts.ready` antes de medir; si un frame del
  scope `graphic-line` oscila, revisa eso primero.
- **Un slot anidado en otro no puede perder sus campos.** Síntoma: un marco en la raíz que envuelve foto y voz borraba
  los campos de la voz al limpiarse. Causa: la limpieza de un slot recorría también los campos de los slots anidados.
  Regla (ya corregida en el motor, `render.ts`): un campo pertenece al slot más cercano que lo contiene.
- **La plantilla sigue la lámina aprobada, no el manifest, cuando chocan.** La burbuja URL de las láminas de sección,
  contenido y tríptico, la lente del caminero y el arco del super de dato difieren entre token/manifest y lámina: se
  siguió la lámina y se dejó la pregunta al operador ([ledger.md](ledger.md), pendientes). No inventes un token para
  cerrarla.

## 2026-09-27 (contrato 0.1.2 en Greenhouse, TASK-1927)

- **Validar contra el build local de AXIS antes de publicar tokens.** Contexto: la task hizo tres releases de AXIS
  (`v0.3.11`, `v0.3.13` y `v0.3.14`). Regla: antes de publicar tokens nuevos, valida las piezas del consumidor contra
  el build **local** de AXIS, copiando de forma temporal `packages/tokens/dist` sobre
  `node_modules/@efeoncepro/axis-tokens/dist`, y **reinstala después** para volver a la versión fijada. Así se evitó
  una cuarta versión.
- **Un release de tokens arrastra uno de contratos, aunque el contrato no cambie.** `axis-ui-contracts` fija la versión
  exacta de `axis-tokens` y los manifests se resuelven sobre esos tokens: por eso `axis-ui-contracts` 0.3.11 y 0.3.12
  se republicaron sin cambio de código. Regla: al subir `axis-tokens`, cuenta también la republicación de
  `axis-ui-contracts` y fija las dos en Greenhouse.
- **Los paquetes privados se instalan con una credencial efímera.** En esta task se usó un `.npmrc` efímero fuera del
  repo con el token de `gh auth token`, autorizado por el operador para la task. Es la misma regla del 2026-09-26
  («Instalar AXIS en local da 401»): nunca dentro del repo, nunca impresa ni commiteada.
- **El contenido de una lámina se cambia en el intent, no en la plantilla.** La foto (`photo.plateRef`, `photo.alt`),
  el copy (`voice`, `body`) y la sección (`progress`) son datos. Dos trampas al cambiar la foto: en la sección partida
  el recorte es centrado y **no hay control de foco** (el builder `sectionSplit` no lee `photo.focus`), y en
  `panel-end` la foto va **espejada**, así que un texto o un logo legible sale al revés. Detalle:
  [applications.md §L](applications.md).
- **Los ejemplos de intent no son borradores.** `src/lib/brand-surfaces/examples/` está vigilado por un snapshot
  (`__tests__/example-plans.test.ts`). Regla: una pieza nueva nace con un intent propio fuera de esa carpeta.

## 2026-09-27 (plantillas de las 38 recetas restantes, TASK-1928)

- **Una composición que no hereda la receta.** Regla: el builder recibe el token **base** de la receta y debe
  **mezclar** el de la composición (`layouts[layout]`) encima, campo por campo, como `withLayout` de AXIS (patrón en
  `sectionSplit`, `src/lib/brand-surfaces/recipes/deck.ts`). Leer sólo el de la composición deja fuera lo que ésta no
  repite; leer sólo el base ignora la composición.
- **Una composición nueva cae en la plantilla por defecto.** Regla: el builder de una composición con plantilla propia
  **devuelve su `contentType`** (`deck.section-cine.about`, `deck.content-day.tools`…); si no lo devuelve, el mapper
  (`src/lib/brand-surfaces/index.ts`) usa `<superficie>.<receta>` y la lámina cae en la plantilla de la receta, no en
  la de su composición.
- **Prefijo CSS repetido.** Las variables de todas las plantillas viven en el mismo espacio `--gl-` (helper `css` de
  `kit.ts`). Regla: una plantilla nueva estrena su propio prefijo (`cdt-` es el de `content-day.tools`); **nunca reusa
  uno existente**.
- **El largo del catálogo no es orientativo.** El `maxChars` de la receta y el `maxCharacters` del `slots.json` deben
  coincidir (`recipe-slot-parity.test.ts`, mapa en `recipe-map.json`) y el compositor rechaza el texto que se pasa.
  Regla: si un copy no cabe, se acorta; nunca se sube el largo de la plantilla sin cambiar la receta aprobada.
- **La referencia aprobada no siempre cumple la norma.** Las láminas de referencia traían acento bajo 24 px, respuestas
  bajo 3×, cifras sin fuente, velo sobre la foto y logo chico en secciones de cine. Regla: la plantilla aplica la norma
  (D1, 3×, fuente visible, sin logo ni velo en lámina interior con foto) y la diferencia se declara en
  `BASELINE_DELTAS.md` y en el registro; nunca se copia el defecto de la referencia.

## Derivas conocidas entre docs y código (abiertas, 2026-09-26)

- `paintGraphicLine` (AXIS) no pinta `voice`, `url-bubble`, `slogan`, `state`, `logo-inline` ni `brand-close`: esos
  elementos los materializa quien consume (texto, `answerHtml`, `stateMarkerSvg`, archivos de brand-assets).
- El adapter de Greenhouse no pinta `spotlight` ni `family-map` (la capa `graphic_line` de `creative:layout` los acepta y
  los omite sin aviso), no pinta la marca de partida de una medida y su SVG no lleva `focusable="false"`.
- En AXIS, la guía de agentes todavía dice que se rechaza la burbuja como firma fuera de Efeonce (ese código ya no
  existe) y los ejemplos `deck-progress-manifest.json` y `report-measure-manifest.json` son de la 0.2.0 (arco que se
  llena). Un comentario de `measureSvg` dice que a 0 % queda el anillo solo; el código pone la esfera en la partida.
- El eslogan usa `#848484` en `src/config/efeonce-brand.ts` y en el render del motion (3,51:1 sobre papel); el token
  claro es `#6b6b6b` (5:1).
- `sphereDividerSvg` usa por defecto una esfera de 6 px; la firma de correo pide 9 px (`emailSignature`).
- `urlBubble.assets` guarda nombres heredados (`url-lum-*.svg`) que no existen en brand-assets.
- No existen: Lottie, un componente HTML de firma de correo, un pintor del `area-mark` de la firma de equipo, un archivo
  del eslogan ni el logo de Greenhouse en brand-assets. No los inventes; proponlos.

Regla: al tocar cualquiera de estos puntos, corregir la fuente (código o doc), borrar la línea de aquí y anotarlo en el
registro.
