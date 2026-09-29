# Lecciones (trampas que ya costaron tiempo)

> Verificado contra: AXIS `c92160b` (tag `v0.3.38`) — 2026-09-29, noche (última entrada: el camino recorrido y los
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
