# Lecciones (trampas que ya costaron tiempo)

> Delta 2026-10-20 (propuesta Assetplan) verificado contra: greenhouse-eo `develop` en `697fbecb6` (receta
> `content-live-chat` en `c0e435b38`), AXIS `9e72d38` y la corrida `ai-generations/2026-10-20_propuesta-assetplan/`.

> Delta 2026-10-19 (anuncio de alianza Efeonce | Google) verificado contra: greenhouse-eo `develop` en `cb9a8e666` y la
> corrida `ai-generations/2026-10-19_google-partner-freeze/`.

> Verificado contra: greenhouse-eo `develop` en `b0efd42a3` (árbol local de TASK-1964, sin commit propio todavía) —
> 2026-10-02 (última entrada: el login V4 de Greenhouse); antes, `d1a41babb` — 2026-10-01 (los perfiles sociales y los
> destacados de Instagram); antes, `b84ec7084` — 2026-09-30 (el deck SEO/AEO, TASK-1949); antes, AXIS `c92160b` (tag `v0.3.38`) — 2026-09-29, noche (el camino recorrido y los
> módulos de correo); antes, greenhouse-eo@f05c26e2f (`develop`) — 2026-09-29, noche (el deck de práctica
> Salesforce, TASK-1942; antes, greenhouse-eo@2c95e60b2: la órbita del AI
> Visibility Report, canonizada en AXIS `v0.3.30`, `26097c5`, con la pregunta abierta del camino recorrido; antes, los
> retratos viejos del equipo; antes, greenhouse-eo@1050036e8: los ejemplos del contrato de Marketing con Manzanitas con copy que no cabe,
> TASK-1939; antes, greenhouse-eo@24e4c72ee: el CI roto por el bump de
> AXIS 0.3.24 y los gates de AXIS bloqueados por el clasificador).

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

## 2026-09-28 (la portada con selección, TASK-1928)

- **Relajar una regla no es aflojar la receta entera.** El operador relajó «sin selección en `cover-brochure`» para
  una sola lámina (`cover-brochure-cine-lines-selection`). Regla: la excepción entra en AXIS como **layout propio**
  (`document-selection`, `v0.3.21`) con sus medidas (la respuesta baja 28 px, la evidencia a 130 px, el logo en 200);
  `document` y `line` siguen rechazando la selección (`selection-not-in-recipe`). Así ninguna otra portada la gana
  por accidente.
- **Una variante no siempre pide plantilla nueva.** La portada con selección usa la misma `CoverBrochure`: la
  plantilla marca la respuesta como objetivo (`data-gl-selection-target`), suma un slot `selection` opcional y entra a
  `TEMPLATES_WITH_SELECTION`. Regla: si la composición es la misma con una capa más, se extiende la plantilla y se
  re-promueve su frame declarándolo en `BASELINE_DELTAS.md` (entrada (n)); el conteo de plantillas no cambia (50).
- **Un slot opcional nuevo mueve el frame del gate.** El probe del gate visual rellena **todo slot no fijo**,
  obligatorio u opcional: al sumar `selection` a `CoverBrochure`, su frame ganó el marco de ocho manijas y el cursor
  aunque las portadas sin selección no cambiaran. Regla: todo slot nuevo, aunque sea opcional, se declara en
  `BASELINE_DELTAS.md` y re-promueve el frame (runbook `composer-visual-gate.md` §4bis); no lo confundas con una
  regresión.
- **Dos series de letras distintas.** Las entradas de `BASELINE_DELTAS.md` de Greenhouse ((f), (h)…(n) para TASK-1928;
  la (g) es Glitch) y los deltas del ADR de AXIS `SURFACE_COMPOSITION_DECISION_V1.md` ((f)…(l)) no se corresponden.
  Regla: cita siempre el archivo junto a la letra.
- **El ítem seleccionado no es un campo de AXIS.** En prueba y contenido lo elige `selected` (1-based) en la raíz del
  intent y en la cotización `recommended`; el builder lo traduce al slot `selection.item` que marca el hook del
  catálogo. Regla: no lo busques en `selection` del contrato; copia el ejemplo de la lámina.

## 2026-09-28 (datos reales en los slots, TASK-1930)

- **La evidencia no guarda el valor.** `proposal_evidence` dice de dónde sale un dato, cuándo y quién puede verlo,
  pero no el número ni la cita. Regla: el valor viaja en un hecho con `evidenceRef` y la evidencia sólo lo autoriza;
  no busques el valor en la tabla.
- **Un binder no sabe qué significa un número.** La única cifra `measured` de la propuesta real de prueba era el costo
  cargado del equipo, marcada interna. Regla (decisión del operador): ningún deck usa evidencia interna, ni siquiera
  uno interno; así «sin costo ni margen en una lámina» lo garantiza el sistema.
- **El validador del plan rechazaba cuatro cifras.** Un slot `metric` sólo aceptaba un valor y `decision-case.stats`
  lleva cuatro. Regla: una cifra o una lista de cifras, cada una con su fuente.

## 2026-09-28 (el plan del deck contra el catálogo, TASK-1929)

- **`pairsWith sequence` no tiene dirección.** La spec pedía una regla de orden (`sequence-order`), pero medido sobre
  el catálogo, `proposal-cinematic-nexa-lines` lista la **portada** como su secuencia: una regla «A antes que B»
  habría disparado avisos falsos. Regla: `sequence` dice qué láminas van juntas, no en qué orden; no hay código de
  orden y no se inventa uno sin que el catálogo declare dirección.
- **`variant` significaba «no seguidas», no «una por deck».** El validador rechazaba dos variantes de la misma lámina
  adyacentes (`variant-adjacent`); separadas, pasaban. **Superada el 2026-09-28 (TASK-1934):** el operador decidió que
  son alternativas y nunca van juntas; hoy rige `variant-both-in-deck` (ver la entrada de abajo). Dos portadas o dos
  cierres siguen en `frame-count`.
- **El reintento con los issues funciona.** La corrida real de `--propose` (brochure, 2026-09-28) propuso primero un
  plan sin página de servicio; AXIS lo rechazó con `brochure-needs-service-page` y el único reintento, con ese issue
  como `fixTheseIssues`, lo corrigió: 16 láminas válidas, ≈ USD 0,09. Regla: el modelo recibe los códigos tal cual;
  si tras un reintento siguen, se falla cerrado, no se reintenta en bucle.
- **Una regla, una voz.** Lo que AXIS ya valida del documento (portada primera, cierre último, foto que alterna,
  uso por receta) no se duplica en el catálogo: si AXIS habló de esa lámina, el código del catálogo calla
  (`AXIS_EQUIVALENT` en `deck-recipes/issues.ts`). Regla: antes de sumar un código, mira si AXIS ya lo emite.
- **El JSON de `docs/` no es runtime.** El código importa `catalog.generated.json` y un test prohíbe leer el JSON
  aprobado con `fs`. Regla: tras editar `EFEONCE_DECK_SLIDE_RECIPES_V1.json`, `pnpm brand:deck-recipes` (README y
  catálogo de runtime); si no, `--check` y `catalog-drift` fallan.
- **Dos «plan» distintos.** El `plan.json` de recetas (`pnpm brand:deck-plan`) nombra ids del catálogo; el
  `deck-plan.json` que escribe `brand:compose` es el `Plan` del composer, con plantillas ya resueltas. Regla: no
  pases uno donde va el otro.
- **Que el plan pase no vuelve componible un marco clásico.** El validador acepta `cover-classic`/`close-classic` en
  pitch y QBR y avisa `recipe-without-template` en esas dos láminas (el composer no tiene plantilla para ellas): el
  plan vale, pero ese deck no se compone de punta a punta y los marcos siguen sin aprobación del operador. Regla: en pitch o QBR, pregunta
  qué marco usar.

## 2026-09-28 (las nueve láminas SEO/AEO, TASK-1934)

- **Al construir la plantilla aparecen largos que el catálogo subestimaba.** Síntoma: el copy aprobado de la
  referencia no cabía en el `maxChars` que el catálogo había medido (`ownTeamTitle` de `decision-difference` pedía 25
  y el catálogo decía 19; `builtWith` de `method-eeat`, 44 contra 42). Causa: el largo se midió antes de que existiera
  la plantilla. Regla: al escribir la plantilla, mide los largos **del copy aprobado** y corrige la receta (y su
  paridad) si el catálogo quedó corto; nunca recortes el copy aprobado para que calce con una medida vieja.
- **`questionWrapChars` cuenta caracteres, no mide texto.** Síntoma: preguntas de 21–22 caracteres que en la
  referencia bajan a dos líneas a 470 px quedaban en una, porque el umbral por conteo las dejaba pasar. Regla: el
  umbral se fija contra la referencia medida (AXIS `v0.3.23` lo dejó en 20 para `decision-traffic-to-revenue` y
  `decision-diagnosis-map`) y se mira el renderizado de cada pregunta real cerca del borde; el conteo es una
  aproximación.
- **Subir la respuesta al 3× puede chocar con el escenario.** Síntoma: al llevar las respuestas de DeckIARespuesta,
  DeckDiferencia y DeckEEAT a 120 px, en DeckIARespuesta «competencia.» tocó la ventana trasera. Regla: cuando una
  respuesta crece por la norma, se vuelve a medir el escenario vecino y el ajuste entra en AXIS como medida (la
  ventana trasera se corrió a 860 y se angostó a 450, con su borde derecho en 1310), nunca achicando la respuesta ni
  moviendo la órbita.
- **Un slot opcional nuevo en una plantilla compartida tiene dos caras.** Síntoma (lo encontró el operador, no el
  gate): la nota del pie que TASK-1934 sumó a `proposal-cinematic` emitía sus medidas sólo cuando había nota, y la
  propuesta creativa **sin** nota dejó de componer (el renderer resuelve todos los campos del frame y fallaba con
  gl-css «undefined»). Causa: el probe del gate rellena siempre todo slot opcional, así que **el gate nunca ejercita
  el camino «ausente»**, y los snapshots de planes no renderizan. Es la misma clase de hueco que `CoverBrochure` con selección (TASK-1928, entrada de
  arriba), vista desde el otro lado. Regla: **todo slot opcional nuevo necesita un test que componga una receta
  existente SIN el slot** (corregido en `af32d9353`: las medidas van siempre y sólo el texto es opcional; test
  `src/lib/brand-surfaces/__tests__/proposal-cinematic-note.test.ts`, con la página creativa sin nota y la AEO con
  nota).
- **`variant` ahora significa «una por deck».** Decisión del operador: dos recetas de un par `variant` son
  alternativas y nunca van juntas, seguidas o no (`variant-both-in-deck` reemplaza a `variant-adjacent`). Regla: al
  cambiar una regla del validador, barre los goldens: `golden-pitch.json` llevaba `content-text` y `decision-why-us`
  separadas y tuvo que cambiar `content-text` por `content-measure`.
- **Una plantilla compartida no hace cumplir el largo de una sola receta.** `proposal-cinematic-seo` quedó con
  `slots: null` en `recipe-map.json`, como sus cuatro hermanas de cine: la plantilla admite textos más largos que los
  de cada receta. Regla: ahí el freno es `slot-over-max-chars` de `validateDeckPlan` (hay un fixture adversarial que
  lo prueba); mapear las cinco juntas queda para TASK-1933.

## 2026-09-28 (el plate propio de la portada creativa, CR4, TASK-1934)

- **Cambiar el plate de una pieza aprobada puede borrarle el concepto.** Síntoma: `CR3` («Tu squad») siguió al pie la
  receta de portada de línea (sujeto a la derecha mirando al lente + una tira naranja sobre una mesa, el squad fuera
  de foco), pasó el validador (4/5, zona de texto 0,40) y el operador la rechazó: «perdió impacto visual»; se leía
  como un retrato con la oficina detrás. Causa: la receta fija geometría y luz, no concepto; el impacto de la portada
  aprobada estaba en el contenido vivo en órbita. Regla: se conserva el **concepto de impacto** y se cambia la toma
  (gesto, forma del fenómeno, disposición), nunca al revés.
- **La órbita de una foto es la trayectoria de la línea como luz, y su forma dice algo.** En `CR4` la cinta naranja
  es la órbita de la pieza (una sola; sin órbita gráfica encima): nace en el squad al fondo, sube por encima de la
  directora y baja a sus manos. La mirada recorre squad → manos → lector en tres planos de profundidad reales. La
  elipse **cerrada** de `CR2` rodea a la persona (ella dirige); el trayecto **abierto** de `CR4` va del fondo al lector
  (el equipo te entrega). Regla: elige la forma de la órbita por lo que tiene que decir la foto, no por la receta.
- **La reserva por porcentaje no se respeta; la geográfica sí.** `CR4` v1 decía «inside the RIGHT 55%» y el modelo
  puso a una persona y el origen de la cinta a la izquierda: el «?» tocaba la cinta. v2 ancló todo respecto del cuerpo
  («behind her right shoulder», «nothing lit… to the left of her left elbow») y la zona de texto pasó de 0,34 a 0,46.
- **`foto:isotipo` puede tapar la luz de la escena** (un rectángulo plano sobre la cinta, visible sólo al 100 %) y **el
  frame del probe no aprueba nada** (silueta sintética): se mira al 100 % después de `foto:isotipo` y se aprueba con la
  pieza compuesta con su plate real. Caso completo:
  [registro cine §16.7](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#167-cr4-el-squad-te-la-entrega-cambiar-el-plate-de-una-pieza-aprobada-sin-perder-su-concepto).

## 2026-09-28 (el freeze aceptaba declaraciones viejas)

- **Una pieza compartida mueve frames que nadie declaró.** En TASK-1928 (`2c7c67c5d`) un cambio en
  `graphic-line-shared/selection-hook.ts` movió 10 frames ya aprobados (`ProposalCinematic`, `HeroLens`, los tres
  `HeroMobileNative*`, …). El `--freeze` de entonces los re-promovió sin error porque sus nombres aparecían en
  entradas viejas del ledger. Ahora el freeze sólo acepta los frames de la sección nueva sin sellar y la sella; los
  demás los lista como no declarados. Regla: cuando el freeze lista frames que no esperabas, se miran uno por uno
  (se declaran con su porqué o se arregla el código), nunca se copian a la sección para que pase.
  [Runbook §5](../../../../docs/operations/runbooks/composer-visual-gate.md).

## 2026-09-28 (el Glitch Flash de Claude Sonnet 5.5)

- **La «imagen» de portada de la fuente era una animación en canvas.** Síntoma: la foto oficial de la página de
  Anthropic no aparecía como imagen ni como video descargable. Causa: se dibuja en un `<canvas>` desde un binario
  (`cupola.gz.bin`). Regla: si la imagen de una fuente es un canvas, se captura limpia con Playwright a 3840×2160
  ocultando el overlay de la página (ahí, `#mh-ov`), con crédito; no se busca un archivo que no existe.
- **Una escena oscura en duotono se funde con el fondo navy.** Síntoma: la falla en bytes no se veía; la foto era una
  mancha navy sobre navy. Causa: el duotono de Glitch lleva las sombras al mismo navy del fondo. Regla: recortar cerca
  del sujeto (ahí, el horizonte) y **levantar la exposición antes de `processPhoto`** (se usó lineal 1,7 + gamma 1,25),
  luego `computeByteFracture`; mirar el resultado antes de componer.
- **«el resto, el lunes» sonó forzado.** Síntoma: el operador lo rechazó («no se escucha natural»). Causa: se adaptó la
  muletilla de la edición («el #N+1 sale el lunes.») al Flash cambiando palabras. Regla: la muletilla de la
  contraportada **se escribe para cada edición** y se lee en voz alta; en un Flash nunca promete un número. La que
  pasó: «léelo completo / en nuestro blog.», en dos líneas.
- **«PORTADA» es un chip de prueba.** Síntoma: el operador lo marcó al revisar la pieza productiva. Causa: el chip de
  las maquetas pasó tal cual; además las plantillas `CoverPhoto`, `BlogBannerPhoto` y `BlogSquarePhoto` del Composer lo
  pintan fijo. Regla: en productivo el chip es **«LA NOTICIA»** (2026-09-28). Resuelto el mismo día: las tres
  plantillas ya lo pintan.
- **El Flash no cabía en `pnpm glitch:compose`.** El manifiesto semanal exige ocho noticias (`news` de largo 8). Regla:
  no inventes siete noticias de relleno ni fuerces el manifiesto semanal. Resuelto el 2026-09-28: el Flash tiene su
  propio manifiesto (`edition.kind: "flash"`) y sus plantillas `Flash*` ([glitch.md](glitch.md) §14.4).
- **Un bump de `axis-tokens` rompió el CI aunque `pnpm glitch:tokens` estaba al día.** Síntoma: el CI de `53002b352`
  (Greenhouse fija `axis-tokens` 0.3.24) falló en `scripts/brand-surfaces/__tests__/graphic-line-tokens-sync.test.ts`
  (4 tests). Causa: los tokens generados de «La órbita» del Composer
  (`graphic-line-{deck,stills,overlays}/graphic-line-tokens.css` y `graphic-line-shared/graphic-line-tokens.json`)
  llevan el sello de la versión de `axis-tokens`; sólo se había regenerado lo de Glitch. Los valores eran idénticos: el
  único cambio fue el sello. Arreglo: `609353e83` con `pnpm brand:tokens`. Regla: **todo bump de
  `@efeoncepro/axis-tokens` en Greenhouse corre `pnpm brand:tokens` Y `pnpm glitch:tokens`, y los dos con `--check`,
  antes del commit**, aunque el cambio de AXIS sea sólo de Glitch o sólo de La órbita.
- **El clasificador de permisos bloqueó los gates de AXIS.** Síntoma: los comandos de verificación de AXIS no corrían
  desde la sesión de Greenhouse. Causa: comando compuesto con `cd` al repo hermano y logs en `/tmp`. El operador
  configuró los permisos vía Codex, que ejecutó el release `v0.3.24`. Regla: en el repo hermano, comandos sueltos con
  `pnpm -C <repo>` / `git -C <repo>`, sin `cd` encadenado ni redirecciones a `/tmp`; y pedir la autorización de la
  mutación externa (push, release) al empezar, no al final.

## 2026-09-29 (el eslogan como texto suelto)

- **El eslogan quedó más ancho que el logo.** Síntoma: en el pie del correo de Insights y en la contraportada del
  informe del Grader, «Empower your Growth» a 26 px medía cerca de 300 px bajo un logo de 170 px. Causa: se compuso
  como una línea de texto con un cuerpo elegido a ojo, no como el bloque de marca. Regla: el eslogan se dimensiona
  desde el logo, al 64 % de su ancho (cuerpo = 0,64 × ancho del logo ÷ 11,586 em), siempre debajo y como una sola
  unidad centrada; el acento en «Growth» exige un logo de 435 px o más, y bajo eso la palabra va en blanco o navy
  (criteria.md §5).

- **«¿Conversamos? Cuando quieras.» escrito como un titular de dos pesos.** Síntoma: en la contraportada del informe
  del Grader la pregunta iba a 72 px en Bricolage y la respuesta en peso liviano, sin anillo ni esfera. Causa: se tomó
  la frase del cierre de brochure como un titular y no como la voz. Regla (operador, 2026-09-29: «el conversamos cuando
  quieras debe ser las normas»): es un par pregunta–respuesta y sigue §4 de `criteria.md` en cualquier superficie —
  pregunta chica en Poppins Light 300 con el anillo pequeño delante (0,42 em, trazo `max(1px, 0,06 em)`, en el acento;
  `recipes.ts`), respuesta en Bricolage 760 **al menos 3× la pregunta** con tracking −0,035 em, que cierra con la
  esfera (0,2 em, hueco óptico de `efeonceGraphicLine.sphere.opticalGapEm`) **en lugar del punto**; la evidencia
  debajo, en Poppins con una palabra en negrita. Nunca pregunta grande y respuesta chica.

## 2026-09-29 (el catálogo Marketing con Manzanitas, TASK-1939)

- **Los ejemplos del contrato pueden traer copy que no cabe en la geometría aprobada: el render es el juez, no el
  contrato.** Síntoma: tres ejemplos de AXIS (`docs/examples/manzanitas/`) resuelven con el contrato
  `efeonce.manzanitas-register` y, al componerlos en el Artifact Composer, el motor los rechaza: la portada «Todavía no»
  (`carrusel-revops-salesforce`, `carrusel-voz-revenue-hubspot`) llega al «Desliza» que comparte su línea; el concepto
  «Quién responde» (`carrusel-texto-denso-growth`) no cabe en su medida (partido, dejaría la esfera sola en la línea
  siguiente), y la pregunta de «De cada 100», «¿Cuántos leads llegan ya informados?» (`carrusel-voz-revenue-hubspot`),
  pasaría a dos líneas y empujaría la respuesta sobre la fuente (lo prueba `manzanitas-fit.test.ts`). Causa: el contrato
  valida la pieza, las palabras de la respuesta y la estructura, pero no declara largos máximos por pieza; las reglas de
  una línea viven en las plantillas de Greenhouse y sólo el render las mide (`measureSlideFit`). Regla: un copy válido
  para el contrato no está aprobado hasta que el motor lo compone; si no cabe, se acorta el copy (Greenhouse usa «Aún
  no», «Quién cita» y «¿Cuántos llegan ya informados?») y nunca se recorta, se parte ni se relaja la plantilla. Los
  ejemplos de AXIS quedan como hallazgo para un patch de AXIS ([manzanitas.md](manzanitas.md) §10.3).

## 2026-09-29 (el equipo real en la fotografía de Marketing con Manzanitas)

- **Los retratos del repo pueden ser viejos: antes de fijar una identidad, pregunta cuál es la foto actual.** Síntoma: al
  armar el roster del equipo para las fotos cine de MCM se partió de los retratos que ya estaban en el repo
  (`public/images/greenhouse/team/`). El operador corrigió: «Esos retratos son viejos, hoy todos a
  excepción de Valentina y de mí salen con Hoodie Efeonce»; y Melkin cambió de peinado (el retrato antiguo lo muestra
  con el pelo largo amarrado; su foto actual es la de `squad/`). Causa: que una foto esté en el repo no dice que sea la
  de hoy, ni la ropa ni el pelo. Regla: antes de fijar la identidad o el vestuario de una persona real, pregunta al
  operador cuál es su foto actual y cómo se viste hoy; ancla la identidad en esa foto (o márcala «falta foto actual»,
  como Humberly y Luis en el [roster](../../../../docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md)) y
  declara el vestuario en la escena (si no, lo decide la referencia).
  **Actualización 2026-10-02:** la pregunta ya tiene respuesta del operador: la referencia de identidad del equipo es
  el **avatar oficial con la bomber** («Es el último, descarta los anteriores, es donde salen con la bomber»;
  `ai-generations/_identidad-equipo/<persona>/avatar-bomber-2026-09.png`, maestro de `team/avatars/v1/1080/`), para
  Andrés, Daniela, Melkin, Humberly y Valentina; Julio conserva su set. `actual` y `antiguo` quedan en disco pero ya no
  son referencia ([ledger](ledger.md), 2026-10-02 (c); roster §«Quién está y de qué foto sale»).

## 2026-09-29 (la órbita del AI Visibility Report dice la gravedad)

- El operador pidió que la órbita de la portada cambie de color según el puntaje sea crítico u óptimo. Choca en
  apariencia con «el estado se dice con la forma, nunca semáforo» (§3.10), pero esa regla es para la **marca de
  estado** (libre/ocupado), no para una medida. Se canonizó como excepción acotada en §3.4: sólo un puntaje con escala de
  gravedad publicada, siempre con su etiqueta y con la escala a la vista.
- El paso 500 de la rampa sobre `#091951` pasa como gráfico, pero apenas (error 3,54 y éxito 3,28). En la portada se
  usa el 400 (4,62 y 5,61); atención queda en 500 (9,47). **Regla:** mide el color de gravedad sobre el fondo real antes
  de elegir el paso; no copies el HEX semántico de papel a un fondo oscuro.
- Sin dato no es «0»: la portada deja el anillo solo, «—» sin «de 100» y la etiqueta «Sin dato».
- **Se canonizó el mismo día en AXIS** (el operador aprobó el informe y pidió canonizarlo; tag `v0.3.30`, `main`
  `26097c5`): token `efeonceGraphicLine.measureSeverity` (también el punto de la etiqueta y el brillo de la esfera, 3
  veces su radio al 50 %; sobre claro `error[600]`, `warning[900]`, `success[500]`, ≥ 3:1), contrato de la órbita
  **0.4.0** con cuatro códigos `measure-severity-*`, contrato `efeonce.ai-visibility-report` 0.1.0 `candidate`, receta
  `aiVisibilityReportOrbitSvg` en `@efeoncepro/axis-graphic-line/report` (0.12.0) y la página
  [/references/ai-visibility-report/](https://axis.efeonce.org/references/ai-visibility-report/). **Regla:** la gravedad
  ya no se revisa a ojo: la exige el contrato; pero Greenhouse fija 0.3.29 hasta TASK-1938, así que en el repo sigue
  siendo revisión. Los umbrales (< 40 crítico, < 70 atención) son del productor, no de AXIS: no los copies al token ni
  al contrato.
- ~~**Pregunta abierta, no regla (2026-09-29):**~~ **Decidida esa noche («aplícalo en todas»): ver la entrada «el
  camino recorrido y los módulos de correo», abajo.** Lo que decía: en el canvas del correo de Insights, el operador notó que una medida de
  62 % con sólo la estela corta se lee como menos de 62 %, porque el ojo no sabe la dirección. En ese tablero, y sólo
  ahí, se agregó el camino recorrido desde las 12 al 60 % de opacidad y 3 px. Se le preguntó si pasa a ser regla de La
  órbita y si se aplica a la portada del informe; **no hay respuesta**. Hasta que decida: no pintes el camino recorrido
  en ninguna otra pieza, no lo agregues a la portada del informe y no lo presentes como canon. Choca en apariencia con
  «nunca un arco que crece desde el origen» (§3.4): por eso lo decide el operador.

## 2026-09-29 (el deck de práctica Salesforce, TASK-1942)

- **El script de dirección cargaba sólo algunas caras de Poppins.** Síntoma: SF16 y SF18 aprobadas con las negritas en
  800 y la plantilla, fiel al token, en 700. Causa: el render de las láminas cargaba 300/400/500/600/800 y no la 700; el
  navegador cayó al peso más cercano. **Regla:** un script de render de láminas carga **todas** las caras que declaran
  los tokens que usa; si una lámina aprobada depende de un fallback, manda el token (se decidió el 700) y se anota.
- **El probe del gate llena TODOS los slots opcionales.** Síntoma: al sumar `partnerMark` (opcional) a la portada de
  línea y a `close-proposal`, `CoverBrochure` y `CloseProposal` cambiaron en el gate aunque ninguna lámina aprobada use
  el slot. Causa: el probe compone con los `example` de cada slot, incluidos los opcionales. **Regla:** un slot opcional
  nuevo **sí** mueve el frame de su plantilla; se declara en `BASELINE_DELTAS.md` y se prueba aparte que las láminas
  aprobadas SIN el slot quedan a 0 px (`partner-mark.test.ts`).
- **`--freeze` exige UNA sola sección sin sellar en `BASELINE_DELTAS.md`.** Con dos sesiones escribiendo deltas el
  mismo día, el freeze se niega hasta que quede una. **Regla:** una sección por freeze, con su letra (aquí la (s)), y el
  freeze serializado con su commit; si otra sesión tiene una sección abierta, coordina antes de congelar. Correr el gate
  mientras otra sesión congela da `missing_baseline` en masa: no es regresión, es una carrera; vuelve a correrlo cuando
  el baseline esté commiteado.
- **Una variante por línea no es una receta nueva: es `reservesByLine`.** La portada Salesforce cuelga la columna de
  190 y las demás de 200. Resolverlo con una receta aparte o moviendo la reserva general cambiaba cinco portadas
  aprobadas. **Regla:** cuando una línea necesita otra medida en una receta compartida, la reserva va por línea en el
  token (AXIS `v0.3.32`) y sólo se aplica si el intent declara esa línea.
- **La reserva de un logo o un claim de partner exige readback.** La insignia «Salesforce Partner» es el activo que la
  guía del programa pide, y aun así es un claim: la aceptación de 2025 como *Provisional* Consulting Partner no prueba el
  estado actual. **Regla:** todo slot que afirma una relación con un tercero nace opcional, con `requires:
  'readback-current'` y un respaldo que no afirma nada («Operamos sobre» + logo); nunca fijo en una plantilla.
- **Una autorización del titular reemplaza el readback, pero no apaga la guarda (2026-09-29, b).** Cuando el operador
  declaró la insignia «Salesforce Partner» autorizada por Salesforce, lo correcto no fue quitar la exigencia de
  `readbackRef` sino pasarle la **referencia estable de la autorización** (`salesforce-partner-authorization-2026-09-29`, registrada en el
  registro de partnerships) desde los intents y planes del deck. **Regla:** el deck lleva la marca por defecto en sus
  datos; el código sigue fallando cerrado para cualquier otro partner (hay un test que lo prueba con HubSpot).
- **Un título de referencia vive donde vive el dato (2026-09-29, b).** Para mostrar la insignia en las referencias del
  Lab de SF0 y SF19 no basta cambiar la imagen: el título «(sin insignia)» está en `axis-tokens` (`surfaceReference`).
  **Regla:** antes de prometer «sólo brand-assets y Lab», buscar en los tokens todo texto que describa la imagen que se
  va a cambiar; si está ahí, la release es de tokens.
- **La salida de un editor de canvas puede re-espaciar las filas.** Lo que el canvas guardó no era lo que la lámina
  aprobada pintaba (filas y aires distintos). **Regla:** se mide sobre el render aprobado (`render-src/salesforce.mjs`),
  no sobre el export del canvas (así se midió el delta (q) de AXIS: «manda la lámina aprobada»).
- **Un wordmark de terceros sin vector publicado se ARMA, no se dibuja.** Claudeforce: «force», «a» y «e» del vector
  oficial de Dreamforce; «d», «l», «u» y «C» construidas con las medidas oficiales y verificadas superponiendo contornos
  sobre el cuadro del video (`logos/FUENTES.txt`). **Regla:** vector oficial + medidas + verificación contra la fuente,
  procedencia escrita en el registro del asset, y reemplazo apenas el tercero publique el vector.
- **Dos incidentes de proceso en la misma jornada.** (1) Un commit se hizo con `--no-verify`; se deshizo y se rehízo
  con los hooks (`3221911b9`). (2) El `ledger.md` quedó vacío por un momento durante una edición concurrente y se
  restauró desde git antes de commitear. **Regla:** nunca `--no-verify` sin autorización del operador; y antes de
  editar el ledger, relee el archivo y confirma con `git diff --stat` que el cambio es sólo tuyo (otras sesiones lo
  tocan el mismo día).
- **Una receta con pasos medidos sin `layouts` rompía el resolver.** Síntoma: un intent de `method-waves` con `steps`
  lanzaba TypeError en `axis-ui-contracts` 0.3.33 (lo confundía con `method-staircase`), y el ejemplo tuvo que usar la
  clave `waves`. **Regla:** toda receta con pasos medidos declara `icons: false` y `layouts` con su `count` (patrón de
  `decision-traffic-to-revenue` y `method-waves`); el resolver ya devuelve `steps: null` sin `layouts` (AXIS
  `v0.3.34`, delta (r)). Desde entonces el intent de SF10 es `steps: [{ kicker, name, desc }]`; `waves` ya no compone.
- **Un builder no repinta en silencio un color que contradice una regla transversal.** SF18 traía `loop.number.color:
  accent` a 15 px, contra `accent-text-min-size`; el builder pintaba suave sin avisar. **Regla:** se corrige el token
  (AXIS `v0.3.34`) y el builder **falla** (`surface-issues`) si un token vuelve a pedir el acento bajo 24 px.
- **Un test de sincronía que lista un directorio no puede leer subdirectorios como archivos.** Al sumar
  `assets/partners/` (marcas de terceros), `graphic-line-tokens-sync.test.ts` reventó con EISDIR. **Regla:** recorrer
  recursivo y comparar también lo anidado byte a byte (`94eb4e4b0`), no filtrar los directorios fuera.

## 2026-09-29 (el camino recorrido y los módulos de correo)

- **Una medida con sólo la estela corta se lee como menos de lo que vale.** Síntoma: en el correo de Insights, un 62 %
  con su estela corta «me hace pensar que está a menos» (operador). Causa: la estela dice dónde está la esfera, pero no
  por dónde vino; el ojo no sabe la dirección ni la distancia recorrida. Regla (operador, «aplícalo en todas»): toda
  medida dibuja el **camino recorrido** desde las 12, tenue y bajo la estela (60 %, 0,75 × su trazo;
  `trajectory.measure.travelledPath`, órbita 0.5.0). La decisión reemplaza «nunca un arco que crece desde el origen»:
  lo que no se permite es que el camino compita con la estela (mismo grosor u opacidad) y la medida vuelva a leerse
  como un loader ([criteria.md](criteria.md) §3.4).
- **Un ajuste hecho «sólo en este tablero» es una pregunta, no una regla, hasta que el operador responde.** Síntoma: el
  camino recorrido existió unas horas sólo en el tablero del correo, con la instrucción de no pintarlo en otra pieza.
  Regla: un cambio a un invariante de la línea que nace en una aplicación se registra como pendiente en el ledger y no
  se propaga; cuando el operador decide, se canoniza **en AXIS primero** (token, contrato, pintor, órbitas estáticas) y
  recién después en las aplicaciones.
- **El correo aprobado es una aplicación, no la plantilla.** El operador acotó el alcance al canonizar: se canonizan el
  pie, los CTA y el bloque de marca; el cuerpo de Insights (cabecera, «Lo esencial del mes», su órbita, la tarjeta de
  decisión) no. Regla: al canonizar una pieza aprobada, pregunta qué parte es sistema y qué parte es de esa pieza; un
  token con `template: false` y `applications` lo deja escrito para que nadie copie el correo entero.
- **Logo y eslogan van en dos archivos, también en correo.** La tentación en correo es hornear el bloque de marca en
  un solo PNG (una imagen, un `alt`, menos riesgo en Outlook). El SSOT de marca dice que el eslogan nunca se funde con
  el logo, así que AXIS publica `email-logo-negative` y `email-slogan-<línea>-negative` por separado y los apila. Dos
  trampas medidas: (1) el PNG del logo termina con 0,31 px transparentes, así que el espaciador bajo la **imagen** es
  `stack.gapBelowLogoImagePx` del sello (16,10 px en Growth), no el `gapPx` calculado desde el dibujo (16,41); (2) los
  `width`/`height` del `<img>` salen del sello (141), no del ancho calculado (140,8). Regla: un eslogan se genera para
  **su** ancho de logo (`pnpm email:assets`), nunca se escala otro.
- **«Suscribirme» y la agenda por correo se retiraron por contrato, no por costumbre.** Regla: la agenda va a
  `/contacto/` con UTM y el contrato rechaza `cta-subscribe-retired` y `agenda-never-email`; un correo que «necesita»
  suscripción es una decisión del operador y una versión nueva del contrato, no una excepción en la plantilla.
- **Canon de AXIS publicado ≠ adoptado en Greenhouse.** Greenhouse fija el set anterior, `src/emails/` sigue igual y
  el adapter de la órbita sólo acepta 0.3.1. Regla: al citar los módulos o el camino recorrido desde Greenhouse, di que
  son canon en AXIS y están **sin adoptar**; el bump del adapter exige soportar el contrato 0.5.0, no sólo subir la
  versión.
- **Un elemento comercial en un correo de servicio pide una excepción explícita, no una ambigüedad.** Síntoma: el pie
  aprobado (agenda, redes, baja) chocaba con la política que prohíbe promoción en correos de servicio, y el contrato
  0.1.0 exigía la agenda en todo pie. Regla (operador, 2026-09-29): se decide el propósito del tipo y, si conserva
  algo comercial, se registra una excepción por tipo con aprobador, fecha y motivo (Insights:
  `efeonce-insights-delivery`); el contrato valida por `purpose` + `application`. Nunca reclasificar el correo para que
  calce ni quitar módulos en el adapter.

## 2026-09-29 (fondos de Teams en la oficina)

- **Una foto de 16:9 no es un fondo de Teams.** La persona tapa el centro y Teams lo muestra a 300–600 px: el chiste va
  en un tercio lateral y grande (≥ 8–10 % del alto), y se prueba con una silueta encima reducida a 480 y 1280 px. El
  piloto tenía el texto al 40–76 % del ancho: la cabeza lo tapaba.
- **Un logo corpóreo en la pared de una sala se ve puesto.** El operador lo pidió como product placement: el logo 3D de
  escritorio del kit (24 cm) sobre una mesa o repisa, y siempre fuera de la zona de la persona (a la altura de la mesa,
  los hombros cubren del 29 al 71 %).
- **El modelo tiñe el navy de azul rey** en objetos chicos: el prompt dice «DEEP NAVY (#023C70), never royal blue» y
  se mide el color. **Y escribe mal lo chico** («cámarrs»): todo texto sale de un arte exacto y se revisa al 100 %;
  el error se corrige editando con el arte como referencia.
- **Editar conserva**: mover un objeto, cambiar una pantalla o corregir un color se hace editando el candidato
  aprobado, nunca regenerando; un cambio de arquitectura (oficina moderna) sí exige regenerar.
- **Los íconos de Plastilina en volumen no se regeneran** dentro de una pieza: en la mesa de producción va plastilina
  genérica; para una pantalla, el render oficial (la nave 3D) entra como arte exacto de la pantalla.

## 2026-09-30 (el deck SEO/AEO, TASK-1949)

- **El PDF horneado no es la fuente del orden: es el canvas.** Síntoma: el brochure SEO/AEO exportado ponía industrias y
  mercados antes que clientes, y el plan golden lo copió. Causa: un índice sin actualizar en `render-src/bake.cjs`.
  **Regla:** al canonizar un deck, el orden se toma del canvas aprobado y se compara contra el PDF; si difieren, manda
  el canvas y se corrige el plan y el horneado (`b84ec7084`).
- **Una anotación y una marca del contrato no son lo mismo.** El operador sacó de las láminas «datos de ejemplo»,
  «preguntas de ejemplo» y «maquetas» (decisión 13), pero `mark`, `sampleMark` y `report.sample` se quedan: el
  compositor rechaza la lámina sin ellas. **Regla:** antes de borrar un rótulo de muestra, mira si el contrato lo exige;
  la anotación va a las notas del plan, la marca se queda.
- **Un elemento que reemplaza a otro no se resuelve haciendo opcional al primero.** La AEO de cine va sin eyebrow porque
  el lockup ocupa su lugar; volver opcional el eyebrow habría permitido una lámina sin ninguno de los dos. **Regla:**
  `requiredUnless: <slot>` en el catálogo (y el validador y AXIS lo hacen cumplir), nunca `required: false`.
- **Un slot opcional nuevo en una receta con plantilla deja la paridad en rojo hasta que la plantilla lo tenga.**
  **Regla:** una lista temporal (`PENDING_TEMPLATE_SLOTS` en `recipe-slot-parity.test.ts`) con dueña y condición de
  retiro, que sólo admite slots opcionales y falla si la entrada ya está mapeada: así no se olvida.
- **El logo de un cliente dentro de una foto de caso se compone, nunca se genera.** La tarjeta de Banco BICE salió en
  blanco del modelo y el logo oficial se compuso con sharp (rotación, opacidad y posición medidas). Cuidado con la
  procedencia: el `Bice-logo.svg` de Wikimedia es del BICE argentino.

## 2026-10-01 (perfiles sociales y destacados de Instagram)

- **Una unión recta se ve aunque el tono calce.** Síntoma: al pasar la portada aprobada de un destacado a la historia
  completa 9:16, la línea de y 420/1500 se veía a tamaño real. Causa: la extensión generada y el cuadro aprobado
  difieren en nitidez, no sólo en tono. Regla: reponer el aprobado **por el borde del círculo** (radio 488 → 540 px
  desde x 540, y 960), con el tono de la extensión igualado en baja frecuencia; nunca por una línea recta.
- **Una segunda pasada de relleno sobre la unión la empeora.** Síntoma: sombras posterizadas y la línea copiada en la
  zona nueva. Causa: el modelo toma la unión como parte de la escena y la reproduce. Regla: no se repara la unión con
  otro relleno; se rehace la reposición por el círculo.
- **La «posterización» era de la vista previa.** Síntoma: en hojas grandes leídas por el agente, las sombras parecían
  en bandas. Causa: la reducción de la hoja; el archivo tenía 24 562 colores en esa zona. Regla: antes de concluir que
  algo posterizó, mira un recorte pequeño a tamaño real.
- **`setContent` no carga imágenes `file://`.** Síntoma: el render de Playwright salía sin fotos. Regla: abrir el HTML
  local como archivo (`page.goto('file://…')`) y esperar `document.fonts.ready` antes de capturar.
- **En el canvas de Claude Design, Poppins no carga por ruta relativa.** Síntoma: la fuente del sistema de diseño no
  aparecía. Regla: subir las fuentes como asset `/_blob/` del canvas.
- **Correr la foto deja una franja.** Síntoma: en la portada de LinkedIn personal, al mover la foto a la derecha para
  liberar la foto de perfil, el hueco quedaba con otro tono. Causa: un fondo plano o un fundido no tienen la textura de
  la foto. Regla: llenar el hueco **reflejando el propio borde** de la foto.
- **Correr la foto para liberar el texto empuja al sujeto al borde.** La primera versión de las portadas personales
  corría la foto hasta 240 px: el operador, al verla en su perfil, notó a Nexa pegada al borde con la mano cortada y el
  logo flotando lejos del texto. Regla: no correr a ciegas; medir dónde está la cara en cada foto y ubicarla en un mismo
  punto (x ≈ 1190), achicando la foto lo necesario (1300 px), y pegar el logo al bloque de texto.
- **Una edición de nitidez puede meter personas.** En Portafolio y Recetas, la edición con GPT Image que pedía sólo
  detalle agregó personas ajenas al roster; se sacaron con recorte. Regla: después de una edición, mirar al 100 % si
  apareció alguien; nunca personas fuera del roster en una foto de marca.

## 2026-10-02 (el login V4 de Greenhouse, TASK-1964)

- **`vector-effect: non-scaling-stroke` con `pathLength` + `stroke-dasharray` parte el arco en dos.** Síntoma: en
  Chrome, el arco de acento de la lente salía como dos tramos separados. Causa: el trazo deja de escalar con el SVG
  pero el guion sigue normalizado por `pathLength`, y el patrón de guiones ya no calza con el largo real del trazo
  [la explicación es inferencia; el síntoma, medido en Chrome]. Regla: el arco es **un path con sus dos extremos**
  (`arcPath` en `src/components/greenhouse/motion/orbit-geometry.ts`), nunca un círculo con guiones, y el grosor se
  escala a mano (× ancho/794, `orbitWidthScale`) en vez de `non-scaling-stroke`.
- **Con `object-fit: cover` la lente se corre del sujeto según la proporción del contenedor.** Síntoma: al cambiar
  el ancho de la ventana, el círculo caía sobre otra parte de la foto. Causa: `cover` recorta distinto según la proporción y
  el punto de la foto ya no es el punto del contenedor. Regla: `object-position: x% y%` con el mismo `lens.x`/`lens.y`
  de la lente; así el punto de la foto y el del escenario coinciden en cualquier proporción (`LoginLens.tsx`).
- **La anatomía de la lente se escala por el ancho, con piso.** Trazos y esfera crecen × ancho/794
  (`orbit.baseWidthPx`, `orbitWidthScale`); en lienzos chicos manda el piso del token, `orbit.arcStrokePx[0]` y
  `orbit.sphereRadiusPx[0]`. Nunca un grosor fijo en px ni transcrito del canvas.
- **El paquete raíz `@efeoncepro/axis-graphic-line` arrastra el pintor SVG y los íconos al bundle del cliente.** Para
  una pantalla del producto que sólo necesita una medida (la esfera de la respuesta), se lee el token y se replica la
  función mínima: `answerSphere` en `orbit-geometry.ts` sale de `efeonceGraphicLine.sphere` con el mismo cálculo del
  paquete. Regla: en UI de cliente, tokens (`@efeoncepro/axis-tokens`) sí; el paquete de pintura, no, salvo un subpath
  liviano verificado en el bundle.
- **La voz en una pantalla del producto también es par pregunta-respuesta.** El operador pidió «El ring y la esfera
  faltan como manda /efeonce-graphic-line»: el anillo pequeño va delante del kicker y la esfera es el punto del
  titular, en el acento de la línea. Quedó **pendiente** que la respuesta sea de 1–3 palabras y que el kicker, que hoy
  es una etiqueta, no se escriba como pregunta si no lo es ([criteria.md](criteria.md) §4).
- **Una foto cuya luz ya es una órbita no lleva lente.** Las novedades cine del login (`LG1`, `LG2e`) van sin lente
  (una órbita por pieza); la foto en registro B (`LG3e`) sí la lleva. El operador lo aceptó.

## 2026-10-07 (portada de propuesta con el arte del cliente, Sika LIC-1164)

- **El arte de un cliente pegado sobre una foto terminada siempre se lee pegado.** Dos intentos rechazados («se ve
  horrible», «se nota demasiado lo determinístico»): nueve piezas con homografía sobre tarjetas de luz de un plate
  ajeno, y un Master Graphic sobre un lightbox en blanco con la persona recortada y movida. Causa: el **orden** (el
  arte no recibe la luz de la escena, la escena no recibe luz del arte; la persona movida conserva la luz de su lugar
  original). Regla: generar la escena **con el arte como referencia** (`foto:generar --dry` + `ai:image` con imagen
  extra), componer el arte exacto encima y terminar sólo con materia y luz (`ai:inpaint image` Sunburst). Nunca mover
  una persona recortada: se regenera la toma.
- **El acabado Sunburst reinventa texto chico aunque el prompt lo prohíba** («PURFORM» → «PUREFORM», «-119» → «-119S»)
  y vira el amarillo de marca a limón (b alto). Se resuelve fuera del modelo: híbrido de frecuencias (alta frecuencia
  del arte exacto + baja del acabado, sigma 10) y ganancia de color sólo en los píxeles del color de marca; una
  corrección global tiñe blancos y azules.
- **`ai:image:rmbg` toma un lightbox brillante como sujeto:** la máscara de la persona sólo vale en su zona; las manos
  se recortan con `rmbg` sobre un recorte local.
- **`foto:expandir` con reposición deja costura vertical en fondos oscuros;** con `--reponer no` queda limpio pero el
  modelo puede recortar el arte: se repone sólo el arte exacto encima.
- Detalle y archivos: `docs/commercial/tenders/sika-mexico-campana-creativa-1164/propuesta-grafica-creativa.md` §3.5.

## 2026-10-08 (propuesta técnica Pibank v11: borrar la selección sobre fichas superpuestas)

- **Síntoma:** al borrar la selección por defecto de `content-team` con `borrar-seleccion.mjs`, quedaron guiones
  sueltos (las manijas del centro de cada lado) y la línea derecha, que cruzaba el nombre de la ficha vecina, dejó la
  «D» de «Daniela» corrida.
- **Causa:** el script interpola a través del trazo; donde el recuadro pasa sobre texto de otra ficha, interpola con
  píxeles de letra.
- **Regla:** después de borrar, mirar al 100 % los costados del recuadro. Los guiones se rellenan interpolando en
  horizontal; el texto cruzado se restaura desde la composición original **sin** la columna del punteado, y esa
  columna se rellena con el fondo de la ficha interpolando en vertical. Además, `method-eeat` admite 24 caracteres en
  `meterTopic` y `content-team` exige cinco fichas (un rol por asignar va con ficha neutra, nunca con la foto de otra
  persona).

## 2026-10-07 (recetas del compositor en la propuesta técnica Pibank v10)

- **La selección colaborativa no se apaga en `cover-proposal`, `content-team` ni `content-clients`.** Síntoma: las
  tres láminas salen siempre con un recuadro de selección y cursor que nadie pidió (el operador rechaza selecciones sin
  sentido). Causa: la receta pinta la selección por defecto; `selection: false` se ignora, `null` rompe el render y
  `"none"` es inválido. Regla: hoy se borra en post (`borrar-seleccion.mjs`, `quitar-seleccion-portada.mjs` en
  `ai-generations/2026-10-07_pibank-propuesta/`) y se revisa al 100 % que no quede resto. **Pendiente:** corregir la
  receta para que la selección sea opcional; al hacerlo, borrar esta línea.
- **`content-measure-formulas` no agranda la tarjeta con el texto.** Síntoma: una fórmula de tres líneas empuja
  «Dueño · Efeonce» fuera de la tarjeta. Causa: la tarjeta tiene alto fijo. Regla: fórmulas de **dos líneas** como
  máximo y mirar la lámina al 100 % antes de darla por buena.
- **El límite de largo de la respuesta no es arbitrario.** En esa misma receta la respuesta tiene un tope (≈15
  caracteres) porque a 150 px el texto se desborda. Regla: acortar la respuesta, nunca subir el límite ni bajar el
  cuerpo para que quepa.
- **`method-eeat` y `content-day` pintan los realces en turquesa aunque la línea sea Engine.** Causa: toman la tinta
  del anillo, no el acento de la línea. Lo mismo pasa con láminas importadas de otros decks (esfera y anillo de los
  casos). Regla: llevar la lámina a un solo acento con `teal2engine.cjs` (corre los tonos 155–192° a 208°) y revisar
  fotos al 100 %, porque el corrimiento de tono también las toca.
- **`productMark` (lockup de submarca) no es campo del intent.** Regla: se superpone en post, como `bake.cjs` del deck
  SEO/AEO; en el reporte con Insights quedó en (140, 44) con alto 40.
- Método completo de esta propuesta y su checklist: skill `deck-studio`,
  [propuesta-tecnica-seo-sin-presentador.md](../../deck-studio/references/propuesta-tecnica-seo-sin-presentador.md).

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
  SVG del eslogan ni el logo de Greenhouse en brand-assets (desde 0.4.6 sí hay PNG de correo del eslogan, sólo para el
  logo de 220 px y siempre separados del logo). No los inventes; proponlos.

Regla: al tocar cualquiera de estos puntos, corregir la fuente (código o doc), borrar la línea de aquí y anotarlo en el
registro.

### 2026-10-07 · Foco residual y autoocultado de video

Verificado contra AXIS release `7fb549a` (primitives 0.6.3), 2026-10-07. `:focus-within` persistía tras Play y anulaba el fade de Media Chrome. Distinguir foco de teclado con `keyboardcontrol`; usar `autohideovercontrols` para puntero inmóvil, sin temporizador paralelo. Probar Play sin blur, subtítulos, fullscreen, hover inmóvil y menús abiertos. WebKit podía cerrar el menú por focusout antes del click de su header, enviando el gesto al video; prevenir `mousedown` del cierre preserva el click y su retorno de foco. Cancelar `pointerdown` suprime el click táctil y no sirve. Pruebas Chrome/WebKit pasan; no equivale a certificación física.

### 2026-10-07 · Compacto no significa pegado al marco

Una fila de controles reduce altura, pero necesita margen exterior además del padding de targets. En video embedded: 12 px de separación al marco, botones 44×44 y thumb con ≥9 px de aire frente a Play. En Media Chrome, un time-range estilizado como block no reparte gaps como el volume-range flex: medir el thumb real y usar padding del wrapper. Probar proporciones verticales y CSS del host (Think/WordPress), no sólo el ancho de viewport del Lab.

- Video: un canvas con fotogramas y currentTime avanzando no prueba que el usuario vea imagen. Ante superficie azul, comparar captura pintada, decoder, video nativo y reproducción completa; conservar el incidente abierto si recargar sólo recupera. No añadir estilos o ciclos de reload sin causa comprobada. Replay es una acción orbital estática con nombre accesible, no un loader. Ver `video-player.md` (2026-10-07).

### 2026-10-07 · Distribución compartida y costo de CI

Síntoma: Think funcionaba localmente y fallaba en Vercel al resolver `/video-player`. Causa: `link:`
a un checkout hermano ausente en cloud. Regla: paquete privado publicado, pin exacto + lockfile y credencial
de lectura en el entorno de build; instalación limpia antes del push. No copiar/vendorear el reproductor
ni confundir una preview local con un despliegue. Resuelto en Think `cd428c7`, primitives 0.6.3.

Síntoma: publicación prolongada por reintentos y suites completas. Los primeros fallos fueron timeout de
matrices agregadas y click tapado por header; después, instalación lenta de dependencias del runner Ubuntu.
Regla: estabilizar casos locales, verificar exports baratos antes de navegador y distinguir CI, release y deploy
por SHA. Documentación sola no justifica otro release. Reutilizar evidencia del mismo artefacto sería una mejora
futura del pipeline, no una optimización ya entregada. No atribuir costo monetario sin medición.

Verificado contra: release `37630788367` SUCCESS (`7fb549a`), main documental `15b1898` — 2026-10-07.

## 2026-10-08 — Lámina importada a Engine: manchas del recolor y el título vacío que dibuja puntos (UTEM)

- **Síntoma:** al pasar una lámina compuesta de turquesa a Engine con `teal2engine.cjs` (corte por saturación > 0,18), el
  operador vio «manchas teal» en la plataforma de `content-team`; y al dejar `center.title` vacío con U+2800 aparecieron
  seis circulitos sobre el logo del cliente.
- **Causa:** el umbral de saturación deja islas sin recolorear en los degradados suaves; U+2800 es el patrón braille
  vacío y la fuente lo dibuja con puntos. Borrar la palabra del centro con interpolación dejaba además un rectángulo,
  porque la palabra lleva brillo detrás.
- **Regla:** recolorear con peso continuo por tono (`ai-generations/2026-10-08_utem-propuesta/recolor-engine.mjs`,
  `RECOLOR_LO=156` para no tocar el verde de Greenhouse); para poner un logo al centro de `content-team`, componer con
  título vacío, borrar sólo los puntos del U+2800 y componer el logo encima, sin parche. Revisar siempre al 100 % y con
  contraste aumentado: el rectángulo y las manchas no se ven a tamaño de hoja de contacto.

## 2026-10-08 — Cotización A4: HTML para PDF y conservación del paquete (UTEM)

La cotización vertical de cuatro páginas fue aprobada por Julio y presentada como parte del proceso UTEM. El HTML es fuente editable para exportar el PDF: tamaño físico A4, saltos definidos, encabezado/pie reservados y fuentes/logos oficiales incluidos. Verificar todos los folios del **PDF exportado**, texto extraíble, fuentes incrustadas y montos; un screenshot del HTML no sustituye esa revisión. Este documento comercial no amplía ni cambia las recetas de deck o los tokens de La órbita.

Tras la presentación, actualizar metadatos y continuidad conservando los bytes/hashes aprobados. [Registro de la presentación y archivos](../../../../docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). El caso no autoriza variantes nuevas de logos, eslóganes ni reglas de composición.

## 2026-10-08 — Cotización A4 guardada como plantilla

Por mandato de Julio, el HTML aprobado se guardó como [plantilla A4 para oferta económica documental rápida de licitación](../../../../docs/commercial/templates/cotizacion-a4/README.md): `template.html` con data slots, CSS, JSON de ejemplo y generador `scripts/documents/render-cotizacion-a4.mjs`. Usarla ante una licitación/Compra Ágil urgente que requiere HTML para PDF, desde alcance, precio y condiciones aprobados. Puede emitir una oferta formal; sólo el ejemplo es sin validez comercial.

Conserva cuatro hojas, recursos AXIS y pie institucional; calcula neto/IVA/total y referencia mensual opcional. Los datos se sustituyen en el JSON; no se editan tokens ni recetas de deck. El generador rechaza desborde y versiones firmadas/presentadas; cada PDF exige revisión visual propia. La cotización enviada a UTEM permanece intacta.

Es un artefacto documental local: no crea `quoteId`, costea/valida margen, aprueba precio, ejecuta maker-checker ni registra CRM/facturación/envío. Pedir operar el sistema de cotizaciones Greenhouse activa [Cotizador](../../../../docs/documentation/finance/cotizador.md) y [Pricing Comercial](../../../../docs/documentation/finance/pricing-comercial.md), con catálogo/engine/Quote Builder/snapshots y estado runtime verificado; no activa esta plantilla por compartir el nombre «cotización». Su manifiesto no es el de Artifact Composer ni un snapshot del sistema.

## 2026-10-09 — Halo recortado en cuadrado: región de filtro sin declarar (Pibank v13, `method-surround-cycle`)

- **Síntoma:** en la lámina del ciclo (Pibank v13, lámina 22) el halo detrás del ícono «Crear» terminaba en un borde
  cuadrado.
- **Causa raíz:** en la receta `method-surround-cycle`
  (`src/lib/brand-surfaces/recipes/seo-aeo/method-surround-cycle.ts`) los filtros SVG `sur-sphere-glow` y
  `sur-lit-glow` no declaraban región. Por defecto, un filtro SVG pinta sólo dentro de la caja del objeto más 10 % por
  lado (`objectBoundingBox`, `-10%`/`120%`): un desenfoque amplio se corta en ese rectángulo.
- **Corrección:** declarar la región en coordenadas del lienzo completo:
  `filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"`. Snapshot actualizado (1 línea) y visual-gate
  de La órbita a cero píxeles en el resto del set. La lámina aprobada se recompuso y se transplantaron sólo los píxeles
  que cambian, sin tocar la zona post-procesada (logo del cliente).
- **Regla:** todo filtro con desenfoque o resplandor que pueda exceder su objeto declara su región. Ante un artefacto
  visual, se corrige la **receta** del compositor, no se atenúa el síntoma en la imagen: el primer intento (difuminar
  el borde a mano) fue rechazado por el operador porque «no se ve que se resolvió, solo atenuaste»; además dejaba el
  defecto vivo para la próxima composición.

## 2026-10-12 — Deck técnico para un cliente en línea Brand, con generador propio, y el motion de su campaña (Sika, Wherex N.º 1164)

Mismo cliente que la entrada del 2026-10-07 («LIC-1164» allá); aquélla es el anexo gráfico, ésta el deck técnico (21
láminas 16:9, Efeonce Creative Studio) y el reel de muestra. Fuente: `ai-generations/2026-10-12_sika-propuesta-tecnica/LEEME.md`.

- **Qué sale del compositor y qué no.** El deck lo arma un generador propio (`build-tecnica.py`, molde «propuesta para
  leer sin presentador»): un solo script produce el HTML local (PNG y PDF) y los tableros del lienzo. Del compositor
  (`pnpm brand:compose`) salen **sólo** tres láminas: portada (`cover-proposal`, layout `dawn`, línea `brand`), cierre
  (`close-proposal`, línea `brand`) y caso (`decision-case`). De `@efeoncepro/axis-graphic-line` salen la navegación en
  anillo y los íconos Trazo (`deckSlideHtml`, `resolveIcon`, `auditIconGroup`; `axis-assets.mjs`). Regla: lo que ya
  existe aprobado se toma de su fuente; el generador propio cubre lo que el catálogo no tiene, no lo que sí tiene.
- **La selección «Cliente» de `cover-proposal` · `dawn` tampoco se apaga desde el intent.** Es el mismo pendiente de la
  entrada del 2026-10-07 (Pibank v10), en el layout `dawn`. Se quitó con `quitar-seleccion-dawn.mjs` (en la carpeta del
  taller): `dawn` es simétrica en x = 960, así que la etiqueta y el cursor se reponen con el espejo del lado izquierdo;
  el recuadro se rellena interpolando en vertical y los píxeles del logo del cliente se devuelven intactos. Sus cajas
  están en coordenadas de 1920 px de ancho y medidas sobre esa portada. Regla: mirar al 100 % después de borrar; la
  receta sigue pendiente.
- **Una respuesta de dos líneas en esa portada se monta sobre la burbuja URL.** Regla: respuesta de una línea (la
  portada quedó con «Así lo hacemos»).
- **`decision-case` sólo compone en claro y en la línea `growth`.** Con línea Brand en claro falla el contrato
  `line-piece-keeps-efeonce-dark` (una pieza de línea es oscura). En un deck Brand entra como lámina clara de Efeonce
  en `growth`, a página completa, tal como la entrega el compositor. Ya estaba en la
  [norma](../../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) («Recetas sólo claras»);
  aquí se volvió a medir con Brand.
- **El caso de éxito es la lámina aprobada, no una hecha a mano** (regla del operador, 2026-10-12). El generador traía
  una lámina de caso propia y el operador la rechazó: va `decision-case` con la foto correcta del caso (pidió el avión
  de Sky en lugar del ala al amanecer). Es la misma disciplina del sello y la firma de más abajo: lo aprobado se
  reutiliza desde su generador.
- **La lámina de equipo del compositor truncaba los nombres completos** y traía la selección «Cliente». Aquí se armó en
  el generador con las fotos reales del squad (`src/lib/artifact-composer/catalogs/deck-axis/assets/squad/`). Queda
  como hecho del caso, no como regla: choca con la anterior («lo aprobado se reutiliza») y la corrección de fondo es
  de la receta.
- **En la capa de motion de un video de campaña del cliente manda el manual de esa campaña.** Síntoma: el operador
  preguntó «¿Sientes que el video sigue la línea gráfica que se armó?»; no la seguía, y el agente había inventado una
  caja «2 EN 1». Regla: el elemento aprobado se **reutiliza desde su generador** (el sello de lanzamiento salió de
  `gen.sello_lanz` del manual, no se redibujó), nunca se inventa una variante; y **no se usa un elemento que el manual
  reserva** (el triángulo rojo suelto queda para la firma y el logo). Lo mismo en la página del reel: la firma de la
  campaña es el render de `gen.firma`. Inventar o redibujar lo aprobado fue rechazado dos veces en este caso.
- **El generador en modo lienzo fallaba en silencio** cuando una imagen nueva no tenía su blob en `blobs.json`: al
  sumar una imagen, revisar primero esa entrada.
- Página del reel y su reproductor: [video-player.md](video-player.md#página-suelta-de-muestra-en-think-2026-10-12).

## 2026-10-17 — El manual del artifact «Efeonce — La órbita» todavía pinta las líneas sobre `#091951` (mega menú del sitio)

- **Síntoma:** en el canvas del mega menú de efeoncepro.com, el fondo del panel cambiaba de `#001a33` (Growth) a
  `#091951` al activar Brand, Engine, Voice o Revenue. El operador lo corrigió: «el azul es el mismo para toda la línea
  de la órbita, la línea sólo aporta el acento».
- **Causa:** se siguió el `project/README.md` y la `usage` del token `ground-family` del design system en Claude
  (https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc, versión 1792253949-5d96), que aún dicen «Las líneas Brand, Engine,
  Voice y Revenue usan `ground-family` como oscuro». Esa regla quedó superada el 2026-10-09 ([ledger.md](ledger.md):
  una pieza de línea lleva el fondo Efeonce `#001A33` y sólo el acento; `#091951` es de piezas de **producto**) y
  coincide con D21 de la iconografía.
- **Regla:** el fondo de cualquier pieza o superficie de Efeonce es `#001a33`, sea cual sea la línea; `#091951` sólo en
  piezas de producto (Wave, Reach, Globe, submarcas SEO/AEO). Ante una contradicción entre el artifact del design system
  y esta skill, manda el ledger de esta skill; reportar la deriva del artifact en vez de seguirla.
- **Corregido el mismo día** (operador): el artifact quedó en la versión `1792274262-8626` con el README, la nota de
  `ground-family` y los contrastes de Engine (3,8:1) y Voice (4,7:1) medidos sobre `ground`.
- **Misma pasada:** en un menú, los nombres de línea son navegación y van en Poppins (Bricolage sólo para títulos y voz
  editorial, [criteria.md](criteria.md), «Rooms: design system de producto»).

## 2026-10-19 — Deck para un cliente armado a mano en un canvas de Design (propuesta SGS Chile)

- **Síntoma:** el operador pidió «con /design arma un canvas con la propuesta en un deck» y la sesión dibujó las 14
  láminas a mano en `.dc.html` con los componentes del design system La órbita en Claude. El operador lo rechazó:
  portada y contraportada distintas de las canónicas (se copió la voz de la portada de SKY, la contraportada no era la
  `close-proposal-horizon` de la línea), y selección, cursores y etiquetas dibujados a mano («cambiaste hasta los
  bounding box»).
- **Causa:** no se cargó esta skill antes de componer; se tomó el design system como kit de piezas sueltas y no como el
  catálogo de recetas aprobadas.
- **Regla:** un deck de marca propia, aunque se vaya a mostrar en un canvas, se compone con `pnpm brand:compose` sobre
  recetas aprobadas: plan con `pnpm brand:deck-plan -- --plan` → un intent por lámina partiendo del ejemplo más cercano
  de `src/lib/brand-surfaces/examples/` → PNG compuesto → canvas que sólo muestra esos PNG (patrón de
  `ai-generations/2026-10-06_deck-hubspot/build-canvas.py`). El canvas nunca redibuja una lámina.
- **Trampas medidas en esta corrida** (carpeta `ai-generations/2026-10-19_propuesta-sgs-contactabilidad/`):
  `selected`, `selectedVerdict` y `selectedStep` son base 1; una selección en la columna derecha de `content-bullets`
  sale del lienzo con el ancla por defecto (`top-end`) y pide `selection.anchor` (`bottom-start` en la fila de abajo,
  `top-start` en la de arriba, para que la etiqueta no tape el texto vecino); `decision-risk` sólo existe en claro y una
  pieza de línea debe ir en oscuro (`line-piece-keeps-efeonce-dark`), así que se compone como lámina de Efeonce en
  `growth`, igual que en el deck HubSpot; `decision-plan` antepone «n · » al `range` dentro del máximo de 16;
  `content-pricing` exige 4 o 5 prestaciones por plan; `cover-proposal` no pinta la insignia de partner (va en la
  contraportada).

## 2026-10-19 — Anuncio de alianza «Efeonce | Google» (post + reel)

Carpeta: `ai-generations/2026-10-19_google-partner-freeze/` (`r4-impacto-premium/`, `r5-cine/`, `export/`). Tarjeta:
[applications.md](applications.md) §A16.

- **El acabado Sunburst borró el contorno de tinta de Gigi** (ronda de objetos con Gigi, luego rechazada). Síntoma: la mascota perdió su trazo negro
  exterior tras la pasada de acabado. Causa: la pasada redibuja todo; un trazo fino de identidad no sobrevive.
  Regla: después de todo acabado generativo, comparar al 100 % cada marca, mascota o ícono contra la escena compuesta;
  lo que cambió se **repone componiendo** el original (aquí, el contorno de la pose original), no regenerando.
- **Un núcleo de luz detrás del logo blanco dejaba 1,3:1.** Síntoma: el fondo con la luz concentrada en el centro se
  comía el lockup. Causa: la luz ocupaba la caja de la firma. Regla: el fondo se pide con la luz como **horizonte bajo**
  (≈ 60–64 % del alto) y el **centro oscuro** para el título, y el contraste se **mide bajo la caja de la firma antes de
  componer** (la versión final quedó en 15–19:1 de media). Nunca rescatar con scrim.
- **`pnpm ai:inpaint expand` no corrió: fal sin saldo.** Síntoma: «User is locked. Exhausted balance» en la cuenta
  `FAL_API_KEY_B` (el expand usa Flux Fill por fal). Regla: `pnpm ai:fal --balance` antes de planear un expand; recargar
  lo hace el operador. El fallback usado: extender el 4:5 a 9:16 **de forma determinística** (color por columna +
  grano), válido porque el fondo era un espacio vacío sin objetos que continuar.
- **`pnpm ai:inpaint image` abortó porque el prompt decía «logos»**, aunque fuera en negativo («sin logos»). Causa: la
  guarda de marca lee la palabra, no la intención. Regla: si la edición toca el contexto y el prompt tiene que nombrar
  marcas o logos, `--allow-brand`; nunca para generar o reconstruir una marca.
- **`pnpm ai:image` generó con `gpt-image-2`** (carpeta `v1-gpt-image-2/`). Causa: es el default del CLI. El operador
  esperaba GPT Image 2.5. Regla: pedir siempre `--model gpt-image-2.5-flare` (fondo) o `--model gpt-image-2.5-sunburst`
  (acabado o edición final).
- **El isotipo de Google Cloud salió cortado a la derecha.** Causa: se recortó de `google_cloud_logo.svg` con un
  `viewBox` escrito a mano. Regla: usar el ícono completo (OneDrive `Workspace/Portafolio/03 DDSoft/Recursos}/google-cloud-1.svg`)
  o calcular el bbox real del trazo antes de recortar; nunca estimar el `viewBox` a ojo.

## 2026-10-20 — Landing `/agenda/`: el agendador dibujado y el verde lima

Tarjeta: [applications.md](applications.md) §A17. Decisiones: [ledger.md](ledger.md) (2026-10-20).

- **El agendador dibujado en el canvas no es el agendador.** Síntoma: la corrección del operador: la landing tiene que
  funcionar con el agendador real, nunca con uno dibujado. Causa: tratar el componente vivo como una ilustración más de
  la composición. Regla: la fuente del carril (`agenda-source/Main.dc.html`) va sin agendador dibujado y la landing se
  diseña **alrededor del componente real** (`<efeonce-meeting-scheduler>`): el canvas deja el hueco, el host sólo lo
  enmarca y lo tematiza con `--gh-meeting-*`, y la evidencia se toma con el agendador cargado con disponibilidad real.
  Tampoco se promete en el copy lo que el agendador no hace (se retiró «Quién te recibe»: Nexa no acompaña dentro).
- **El verde lima `cta-growth` se coló en el CTA.** Síntoma: el CTA de la landing salió en `#7ed600`; el operador: «Este
  verde no lo usamos en ninguna parte de nuestra línea gráfica». Causa: se tomó el token `cta-growth` oscuro porque
  existe en `tokens.json`. Regla: el CTA Growth sobre oscuro va en `accent-growth` con texto `ground`; antes de usar un
  token `cta-*`, comprobar que aparece en una pieza aprobada ([criteria.md](criteria.md), «CTA de landing: sin verde
  lima»).

## 2026-10-20 — Propuesta Assetplan (deck de 22 láminas, `revenue-hubspot`)

Carpeta: `ai-generations/2026-10-20_propuesta-assetplan/` (`LEEME.md` lista cada ajuste fuera de receta). Recetas:
[README de recetas](../../../../docs/operations/brand-graphic-line/deck-recipes/README.md), «La propuesta Assetplan».

- **El chip de `content-live-chat` mostraba la nube de Salesforce en un deck HubSpot.** Síntoma: el operador lo
  rechazó: «no forces nada, sino consigues la receta haz una nueva, no parches». Causa: el logo de la plataforma
  estaba fijo en la receta. Regla: corregir la receta, no la lámina. Desde `c0e435b38`
  (`src/lib/brand-surfaces/recipes/line-stage/content-live-chat.ts`) el logo sigue a la línea con
  `productPartnerOf(line)` (isotipo de HubSpot en `revenue-hubspot`, Salesforce en las demás) y el wordmark Claudeforce
  (`platformMark`) se rechaza con `invalid-intent` fuera de Salesforce.
- **Una cifra sobre foto no muestra una inversión.** Síntoma: el precio en `content-focus` fue rechazado: «no se detalla
  bien ni el precio real ni la oferta… agarra alguna adecuada de pricing». Regla: cuando la propuesta necesita el precio
  a la vista, la receta es `content-pricing` live (líneas con monto, total, CTA «Aprobar propuesta», chips laterales).
  Los montos van como `[MONTO]` (`src/lib/brand-surfaces/recipes/close.ts`, `AMOUNT`); montos reales sólo con excepción
  explícita del operador, documentada en el `LEEME.md` de la corrida, y con un script que sólo reemplaza el marcador
  sobre el builder y la plantilla canónicos (aquí, `render-eyebrow-chip.ts --montos`).
- **La respuesta señalaba como equipo a personajes generados.** Síntoma: en `section-cine` `team` (foto del elenco
  ficticio con Nexa), «Este equipo» fue rechazado porque «los de la foto son personajes generados con IA». Regla: nunca
  una respuesta que presente a las personas de una foto de elenco ficticio o generado como el equipo real; la
  respuesta nombra la capacidad («Expertos.», con «**Multidisciplinarios** en CRM, desarrollo, integraciones y datos,
  con una contraparte.»). Ojo: el `example` de la receta `section-cine-team` es justamente «Este equipo», y la respuesta
  admite 16 caracteres («multidisciplinarios», 19, no cabe: va en la evidencia).
- **Pregunta en tres líneas pegada a la respuesta gigante.** Síntoma: «¿Tengo que reemplazar mis sistemas?» en
  `decision-platform-coexistence` se partía en tres líneas y tocaba la respuesta; el operador: «Esto se ve mal».
  Regla: la pregunta va en una o dos líneas; si llega a tres, se acorta (quedó «¿Y mis otros sistemas?»), no se mueve
  la respuesta.
- **La órbita en una foto no es un aro con una esfera suelta.** Síntoma: la contraportada BR3h v1, un aro grueso con la
  esfera rosada aparte, fue rechazada: «se ve super artificial la órbita con ese punto rosado allí, no estás sabiendo
  cómo funciona la órbita». Regla (§1.3): anillo fino y tenue, un arco corto (≈ 50°) en el acento que termina en la
  esfera, del mismo color y trazo; nunca una esfera suelta. Recolorear una foto de otra línea tampoco sirve (rotación de
  tono: «se nota mucho, sobre todo en la esfera»; inpaint: «en exceso rosado»): se regenera la foto. La norma de foto y
  el registro cine los lleva la sesión de fotografía.
- **El eyebrow como chip de contorno sin relleno no es estándar.** Fue un pedido del operador sólo para esta propuesta,
  hecho clonando el catálogo `graphic-line-deck` en una carpeta temporal (`render-eyebrow-chip.ts`); el catálogo del
  repo no cambió. Regla: no aplicarlo en otro deck hasta que el operador lo apruebe para todos; si se adopta, va como
  propuesta a AXIS.
- **Portada de propuesta sin pregunta, sin parche.** El script de SGS que retira la pregunta
  (`quitar-pregunta-portada.mjs`) es el parche que el operador no quiere. AXIS ya tiene `cover-proposal` ·
  `orbit-decision` (`axis-ui-contracts` 0.7.6 / `axis-tokens` 0.6.6, commit `9e72d38`), pero Greenhouse fija 0.3.4x y
  no la ve hasta TASK-2014. Regla mientras tanto: armar la portada a mano con las medidas del token
  (`portada-orbit-decision.css` de la corrida), como la A01 aprobada ([criteria.md](criteria.md), caso SGS).
- **El compositor no emite enlaces en el PDF.** Para que la tarjeta de agenda de `decision-next-steps` lleve a
  `https://efeoncepro.com/agenda/` se agregó una anotación URI con pdf-lib al armar el PDF (`pdf-sprocket.mjs`,
  constante `LINKS`) y un `<a>` sobre la tarjeta en el canvas.
