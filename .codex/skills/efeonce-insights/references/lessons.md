# Efeonce Insights — lessons (append; newest first; each with date, symptom, rule)

- **2026-09-29 · correo de entrega · La pieza aprobada no es la plantilla.** Síntoma: al canonizar el correo de entrega
  aprobado (canvas v21), lo natural era publicarlo entero como «el correo de Efeonce». El operador acotó: se canonizan el
  pie, los CTA y el bloque de marca; el correo de Insights es **una aplicación**. Regla: la cabecera, «Lo esencial del
  mes», la órbita de medida y la tarjeta de decisión son de Insights y no se copian a otros correos; los módulos salen de
  AXIS (`efeonce.email-modules`, `efeonceEmail`, PNG `email-*`), no del HTML de Insights. Diseño aprobado ≠ runtime:
  `InsightsEditionDeliveryEmail.tsx` sigue sin cambios hasta que una task lo implemente.
- **2026-09-29 · correo de entrega · Un 62 % con sólo la estela se lee como menos.** El operador lo vio en la órbita de
  medida del correo; la decisión («aplícalo en todas») cambió La órbita para toda medida: camino recorrido tenue desde
  las 12 (60 %, 0,75 × la estela; contrato de la órbita 0.5.0). Regla: una medida de Insights en cualquier superficie
  (correo, PDF, Think) sigue esa regla cuando su consumidor adopte AXIS `0.3.38`; mientras tanto, no la pintes a mano
  ni la mezcles con la versión sin camino dentro de una misma pieza.

- **2026-09-28 · marca + AXIS · La copia a mano de los roles de color ya divergió.** Síntoma: el dato «anterior» sobre
  papel era `#1f9e94` (`--axis-deck-teal-650`, `editorial-roles.json`) en los PDF y `#0e8c82` (`orbita.accentLight`,
  `efeonce-think/src/lib/insights-tokens.ts`) en la web. Era un desvío de Think: se corrigió el mismo día
  (efeonce-think `b3c5820`, producción) al valor del PDF, `#1f9e94`, y se recapturó el dossier (greenhouse-eo
  `24571e566`). Es el costo de dos copias sin fuente común. Regla: antes de tocar un color de dato en un consumidor,
  compara los dos; el valor de referencia es el rol de `editorial-roles.json`; la salida duradera es extraer los roles
  a AXIS (follow-up en [`ui-and-brand.md`](ui-and-brand.md) §1), no otra copia.
- **2026-09-28 · marca + AXIS · Publicar la marca en AXIS no la pone en ninguna superficie.** `axis-brand-assets` 0.4.0
  trae `insights-{logo,isotype,lockup}-*`, pero Greenhouse fija 0.3.5, las portadas A4/deck componen una versión
  tipográfica («INSIGHTS» en mayúsculas espaciadas junto al logo de Efeonce) en vez del archivo oficial, el correo usa
  `brand='efeonce'` y sólo Think usa los archivos oficiales, con copias manuales. Regla: antes de afirmar que una
  superficie «lleva la marca de Insights», revisa el mapa de aplicación de [`ui-and-brand.md`](ui-and-brand.md) §2 y el
  archivo real; agregarla a una superficie nueva es decisión del operador.
- **2026-09-28 · TASK-1875 · Pasar a medios de impresión con transiciones activas deja elementos a medio camino.** Las
  transiciones CSS ganan incluso a `!important` (su origen en la cascada está por encima): al imprimir, los elementos que
  estaban animando quedaron congelados en `opacity: 0`. Regla: la hoja de impresión fija `transition: none` y
  `animation: none` en todo lo que pueda estar en movimiento.
- **2026-09-28 · TASK-1875 · Un elemento sólo-impresión oculto con igual especificidad reaparece por una regla más
  específica.** El logo del pie quedó duplicado en pantalla porque otra regla, más específica, lo volvía a mostrar.
  Regla: ocultar lo sólo-impresión con `@media screen { … display: none !important }`, no con una regla de la misma
  especificidad.
- **2026-09-28 · TASK-1875 · Salir de pantalla completa mueve el foco después del evento.** Restaurar el foco en el
  handler de `fullscreenchange` no sirve: el navegador lo mueve después. Regla: restaurarlo dos `requestAnimationFrame`
  más tarde.
- **2026-09-28 · TASK-1875 · Una auditoría de contraste que toma el fondo del ancestro miente con etiquetas fuera de su
  caja.** Los valores sobre las barras están posicionados fuera de su padre, así que el fondo «heredado» no es el que
  está detrás del texto. Regla: medir contra el ancestro cuya caja contiene el centro del texto.
- **2026-09-28 · TASK-1875 · Un waffle con total declarado ≠ suma de las partes regalaba celdas.** Greenhouse ya rechaza
  ese caso (`waffle_parts_sum_total`), pero la web distribuía sobre el total declarado. Regla: la web reparte sobre la
  suma de las partes, igual que `waffleGeometry`; la geometría de la web nunca diverge de la de los PDF.
- **2026-09-28 · TASK-1875 · El acento en etiquetas de 12 px viola «La órbita».** El acento nunca va bajo 24 px; en
  texto chico se usa el color de texto del rol, no el acento.
- **2026-09-26 · TASK-1889 · El tono de una variación sale de la dirección de la métrica, y las metas ICO se casan por
  `dimension.metric`.** El triángulo sigue al valor (▲ subió, ▼ bajó) y el tono dice mejor o peor. Para saber qué es
  «mejor», posición = menor es mejor; si no, la dirección del propio hecho y, si falta, la de su meta. Las metas ICO
  reales se llaman `target.rpa`/`band.rpa` y nombran su métrica en `dimension.metric`: buscarlas por `metricId` no
  encuentra nada y deja todo en tono neutro. El test con un fixture que compartía `metricId` pasaba por construcción;
  lo detectó la revisión del PDF real de Sky. Se testea con la forma real del adapter.
- **2026-09-26 · TASK-1889 · Los releases son squash: la ancestría no dice qué está desplegado.** Ningún commit de
  1889 era ancestro de `main` y, aun así, todo el código estaba en producción. Se verifica comparando blobs de los
  archivos (`git rev-parse origin/main:<path>` vs `origin/develop:<path>`) y el `headSha` del release exitoso.
- **2026-09-26 · TASK-1889 · Un render real en producción escribe en producción: pedir la autorización al minuto
  cero.** Crear ediciones por el lane ecosystem es una escritura real; el clasificador de permisos la bloquea sin la
  autorización explícita del operador en el chat. Pedirla al proponer el paso, no después de intentarlo.
- **2026-09-25 · A per-figure reading that repeats the page is not a reading.** Real PDFs (Berel p. 5, Sky p. 7)
  printed the same sentence twice, and the targets page was titled with the period comparison because the planner
  emitted no `conclusion`. Also: bounded AI authoring only REWRITES, so interpretation has to be computed by the
  deterministic planner (findings over cited facts), never expected from the model. Rule: `conclusion` is always a
  finding; `meaning` only if it says something else; check real PDFs, not only the plan JSON.
- **2026-09-25 · TASK-1889 · Sólo los datos reales revelaron cinco defectos que el canvas no mostraba.** Con el canvas
  en 20/21 de fidelidad y el visual gate a 0 px, las ediciones reales de Berel (`EO-INS-000019`) y Sky
  (`EO-INS-000022`) destaparon: métricas SEO agrupadas en un eje común, la capitular suelta y presupuestos de texto
  cortos (sección del A4 y del deck, título de figura del deck, nombre de métrica, etiqueta de columna). Regla: un
  catálogo no está verificado hasta componer ediciones reales con `preview-edition.ts --editorial-v2`; el fixture de
  ejemplo prueba la forma, no el contenido.
- **2026-09-25 · TASK-1889 · Un umbral de negocio no se escribe en una plantilla: viene del registro dueño.** La zona de
  atención de las metas se dibujó primero con `0,85 × meta`; la revisión de la sesión de TASK-1846 lo detectó y se
  quitó. Ahora sólo existe si el plan trae `band` (`bandFactId`, límite del registro ICO emitido por TASK-1888); sin
  banda, pista única. Regla: ninguna cifra de negocio (meta, umbral, banda) se inventa en el render; si falta el hecho,
  la figura muestra menos, no algo supuesto.
- **2026-09-25 · TASK-1889 · Un canal compartido no hace comparables dos métricas.** Las métricas SEO de Berel llevaban
  todas `channelId = google` y caían en «columnas sobre un eje», mezclando clics con CTR. Regla: van a un eje común
  sólo si `dimensionChannelIds` son todos no nulos y **distintos** (la dimensión ES el canal); si las dimensiones son
  métricas, comparación con escala propia por métrica.
- **2026-09-25 · TASK-1889 · Una capitular CSS se aplica aunque el párrafo tenga una línea.** `::first-letter` no mide:
  con un párrafo corto la letra grande quedaba colgando. Se movió a un hook (`narrativeDropCapHook`) que mide el
  layout compuesto y la aplica sólo con ≥ 3 líneas. Regla: toda decisión tipográfica que depende del largo real del
  texto se toma midiendo el layout compuesto, no con CSS estático.

- **2026-09-25 · `artifact-composer/pure` is not browser-safe.** Importing the chart geometry into `contracts/` to
  validate value invariants failed the worker-in-Vercel lint and would have dragged Node crypto (manifest hash) into
  every browser consumer of the contracts. Rule: `contracts/**` stays structural; anything that needs the geometry
  lives in `editorial/` (`chart-values.ts`). The boundary test greps the contract SOURCE TEXT for `node:crypto`, so even a
  comment naming it fails — describe it in words.
- **2026-09-25 · Generation runs in the `ops-worker` too: watch what the composing phase imports.** Resolving the cover
  through `organization-brand-assets.ts` pulled storage, Kysely and the assets client into the generation graph (the
  commands tests broke on a `@/lib/db` mock). Rule: give the worker a light owner reader (`organization-logo-variants-reader.ts`)
  instead of importing the owner's command module.
- **2026-09-25 · Rounding hides a tiny pp change.** Berel CTR 1,83 % vs 1,87 % printed «1,8 % … 1,9 %, variación 0,0 pp».
  No unit test would have found it; the read-only v2 preview over real data did. Rule: preview real editions
  (`preview-edition.ts --editorial-v2 --plan-only`) before declaring the contract; under 0,05 pp print two decimals.
- **2026-09-25 · The AEO adapter only reads the LATEST grader run.** The comparison window never has its own score, so
  a gauge «with the previous period» has no evidence even though the canvas shows one. Rule: the family × evidence
  matrix decides, not the canvas; enabling it means selecting the run by window in the grader's domain.
- **2026-09-25 · ICO thresholds lived in several docs with different numbers.** Registry (runtime) FTR ≥ 80; glossary
  said ≥ 70; ICO contract ≥ 85. The operator made `ICO_METRIC_REGISTRY` the single source the same day (docs aligned in
  `9172cf5df`, formerly `f1a41cda0` before the 2026-09-25 history rewrite; hand-written portal semaphores → TASK-1900). Rule: the printed target comes from the registry via a
  reference fact; never copy a number from a doc.

- **2026-09-25 · Un canvas aprobado no es un diseño construido.** TASK-1847 cerró el mismo día en que el operador
  aprobó el rediseño premium en un canvas; producción siguió sirviendo los catálogos v1 y el rediseño quedó en dos
  tasks nuevas (1888 contrato, 1889 catálogos). Decir «los informes se ven así» mirando el canvas habría sido falso.
  Regla: al cerrar una task de catálogos, o al describir el producto, nombrar **qué diseño sirve producción hoy** (qué
  catálogo, qué release) y dónde vive el aprobado-sin-construir; nunca presentar una dirección aprobada como disponible.
- **2026-09-25 · La fidelidad a un diseño aprobado se exige con referencias por página y un umbral, no a ojo.** El
  operador pidió que el informe quede «igual al canvas». Eso se volvió medible: 41 páginas de referencia a tamaño nativo
  versionadas en el repo, un paquete fuente que las regenera (40 de 41 byte a byte; la restante 0,008 % por
  antialiasing), un fixture por plantilla con los datos de ejemplo del canvas y `pixelmatch` (umbral 0,1) con techo de
  1 % de píxeles distintos por página; lo que exceda se corrige o se justifica en el dossier con la región y la
  aprobación del operador. Regla: antes de construir contra un diseño, dejar referencias durables, reproducibles y un
  criterio numérico; «se parece» no es un gate. Y el fixture del canvas vive sólo en pruebas: nunca datos de ejemplo en
  producción.
- **2026-09-25 · Material de referencia con marcado HTML va empaquetado dentro del repo.** Las fuentes `.dc.html` del
  canvas se guardaron como `fuente-canvas-2026-09-25.tar.gz` para que el escaneo de Tailwind no lea su marcado (lee
  cualquier archivo de texto del árbol y materializa sus clases). Regla: HTML de referencia, ejemplos o prototipos que no
  son código del producto entran comprimidos o fuera del árbol escaneado, con el script que los reproduce al lado.
- **2026-09-25 · Un diseño aprobado no autoriza familias, y la evidencia se verifica en la fuente, no se supone.** El
  canvas dibuja 15 familias con datos de ejemplo; varias (embudo, Venn, UpSet, cascada) piden evidencia que ningún
  adapter produce hoy. Y en sentido contrario, la primera matriz de TASK-1888 subestimó lo que sí existe: Sky tenía 11
  meses de ICO en BigQuery, el snapshot traía `ftr_pct` que el adapter no leía y SEO ya declaraba granularidad
  `day`/`month` (corregida en `e845ab562`). Regla: la matriz familia × evidencia decide qué se emite; cada veredicto se
  verifica contra el adapter y la fuente (BigQuery/PG), nunca contra el diseño ni contra la memoria del planner.
- **2026-09-25 · Los títulos del planner determinista repiten la etiqueta del hecho.** Hallazgo del cierre de
  TASK-1847: el título repite la etiqueta en vez de afirmar la conclusión. Es del contrato del plan
  (TASK-1888), no de un catálogo: arreglarlo en la plantilla escondería el defecto en una sola salida.

- **2026-09-24 · El gate global puede bloquear un catálogo nuevo por drift histórico ajeno.** El baseline de
  `deck-axis`/SKY ya difería en el `develop` limpio. Usa `--catalog=insights` para congelar y comparar sólo los
  frames de Insights, preservando hashes ajenos; valida ambos comandos y mantén ISSUE-122 abierta para el gate global.

- **2026-09-24 · Campos geométricos vacíos pueden borrar geometría SVG authored.** El resolver scatter escribía
  `d=""` desde slots vacíos aunque el SVG ya tuviera path; el PDF quedaba sin puntos. Regla: un efecto de figura
  vacío debe ser no-op y no sobrescribir la geometría del molde; cubrirlo con una regresión y abrir el PDF real.

- **2026-09-24 · El baseline de Insights no puede promoverse sobre veinte frames ajenos.** El freeze halló cambios
  declarados en diez plantillas nuevas y veinte frames `deck-axis` no declarados; las plantillas comerciales estaban
  limpias en Git. Regla: conservar el baseline y resolver esa deriva con su dueño; no añadir frames ajenos al ledger
  para forzar el freeze de otra task.

- **2026-09-24 · El primer baseline de un catálogo nuevo sigue sujeto al commit atómico.** `composer:visual-gate`
  reportó diez frames Insights aún no promovidos; el nuevo índice ya estaba declarado y el resto era el set del
  2026-09-21. Regla: conserva los frames ajenos intactos y no ejecutes `--freeze` sin poder incluir baseline y
  catálogo en el mismo commit.

- **2026-09-22 · OTD nunca llegó a un informe, y nada falló.** El adapter ICO buscaba `metricId === 'otd'`; el
  registro del motor lo llama `otd_pct`. Sin match, el `if (otd)` sin `else` omitía la métrica en silencio, y el
  fixture del test repetía el id equivocado, así que el test confirmaba el error en vez de detectarlo. Regla: los ids que
  un adapter lee de otro dominio van en una constante exportada (`ICO_SNAPSHOT_METRIC_IDS`) que un test cruza contra
  el registro dueño (`ICO_METRIC_REGISTRY`); y una métrica esperada que no llega se narra como límite, nunca se omite.
- **2026-09-22 · La barra destacada era invisible.** El molde A4 define `.lead` (párrafo introductorio con
  `margin-top`); la barra usaba la clase de tono `lead`, heredaba el margen y quedaba fuera de su riel. Ningún test ni
  gate lo vio: sólo mirar el PDF. Regla: las clases de estado de un resolver van con espacio de nombres propio
  (`tone-lead`/`tone-rest`), nunca con nombres que un molde pueda usar para tipografía.
- **2026-09-22 · La guarda barra↔etiqueta rechazaba toda etiqueta bien redondeada.** Exigía igualdad exacta entre
  «1,9 %» y 1,88. Regla: la tolerancia es media unidad del último decimal IMPRESO (`roundingToleranceOf`); una cifra
  distinta sigue fallando. La guarda vive una sola vez en `artifact-composer/bar-figure.ts` (las copias por catálogo
  ya habían divergido).
- **2026-09-22 · El deck productivo sobre `deck-axis` no servía con datos reales.** Recortaba con «…», imprimía el
  período anterior como otra métrica con el mismo nombre y callaba lo que no cabía (2 de 6 métricas SEO). Cutover a
  `insights-deck` (`insights-deck-mapper.ts`): toda afirmación aparece en alguna lámina, nada se recorta. Lo ya
  encolado con `deck-axis` sigue componiendo con su input sellado.
- **2026-09-22 · Una figura de comparación necesita pares con escala propia.** En escala compartida, 9 mil clics
  junto a 488 mil impresiones quedan como una raya; y nombrar la barra por la serie («Período») no dice qué mide.
  `figure-pages.ts`: cada métrica es un grupo (período + anterior, `scaleGroup`), la figura se pagina sin partir
  pares ni dejar una barra sola, y cada página se narra con las afirmaciones que citan sus hechos.
- **2026-09-22 · El período se rotulaba con el mes de inicio.** Una edición del 1 al 20 de septiembre decía
  «Septiembre de 2026». `render/labels.ts` rotula la ventana civil medida, dentro del presupuesto de 28.
- **2026-09-22 · Límites y metodología imprimían identificadores internos.** `ico`, `rank`, el `detail` del adapter
  («Rank evolution: no_data») y el nombre de la función lectora (`readSeoOverviewKpisForWindow`) llegaban tal cual al
  documento. El planner los redacta desde `GH_INSIGHTS` (`metrics`, `sources`, `units`); un test barre todo
  identificador conocido. AEO usa el copy es-CL que el grader ya declara para clientes.
- **2026-09-22 · La edición de Demo no ejercita nada.** Sin datos, el A4 de Demo salió «perfecto» y no mostró ninguno
  de los defectos anteriores: todos aparecieron con Berel y Sky. El canary de un render se hace con datos reales, y la
  vista previa local (adapters → planner → validador → mapper → composer) los encuentra antes de desplegar.
- **2026-09-22 · El validador de cifras rechazaba toda edición SEO real, y la de ICO iba a caer igual.** Síntoma:
  la edición de Berel falló con `unreferenced_number` por `"10"` y `"-08"`. Causas: el lector de cifras partía
  `2026-08` en `2026` + `-08` (el mes, leído como negativo), y la etiqueta del hecho —texto del adapter— traía cifras
  propias (`Keywords en primera página (≤10)`, `Tráfico orgánico estimado 2026-08`, y en ICO `RpA · <space> · <mes>`).
  Los fixtures sólo usaban etiquetas sin cifras: el gate probaba la forma del primer caso, no la de los adapters.
  Regla: una fecha ISO es UN token; la etiqueta LITERAL de un hecho **referenciado** se enmascara antes de leer
  cifras (una cifra fuera de ella, o la etiqueta de un hecho no referenciado, se sigue rechazando). **NUNCA** se
  arregla renombrando la etiqueta en el adapter (el snapshot ya sellado la conserva) ni agregando las cifras de la
  etiqueta al conjunto permitido (eso sí relaja la guarda). Los fixtures del validador usan etiquetas reales.
- **2026-09-22 · Un import de VALOR desde el barrel del composer rompe la función de Vercel.** Síntoma: staging
  falló el deploy con una función de 441 MB (límite 250 MB). `report-mapper.ts` corre en Vercel (encola) e importaba
  `paginateFlow` desde `@/lib/artifact-composer`, que arrastra Playwright, pdf-lib y los catálogos. `pnpm build` local
  no lo detecta. Regla: código que corre en Vercel importa del composer sólo TIPOS (barrel) o VALORES de la entrada
  liviana `@/lib/artifact-composer/pure` (paginate, chart-geometry, bar-figure, manifest-hash); el catálogo viaja como
  string (`INSIGHT_RENDER_CATALOG_BY_OUTPUT`). Desde ISSUE-177 lo hace cumplir la regla ESLint
  `greenhouse/no-worker-only-module-in-vercel-code` y el gate `pnpm vercel:reachability-gate`.
- **2026-09-22 · Un capítulo sin afirmaciones se narra, no se rechaza.** Mi guarda del mapper A4 rechazaba el
  capítulo vacío y contradecía la filosofía de narrar lo que falta. Ahora el titular es el título del capítulo y el
  cuerpo dice que la sección no registró hallazgos en el período.
- **2026-09-21 · El riel de una barra puede leerse como el dato.** En el deck, el fondo del riel usaba `fieldMid`
  (#023c70) sobre el navy del molde y se leía como una barra llena: el valor chico (3,1 %) parecía grande. Ningún
  test lo vio; salió de abrir el PNG. Regla: el riel va un escalón por encima del fondo (`fieldEdge`), nunca a media
  distancia entre fondo y relleno — un riel que compite con su relleno es un segundo dato que nadie declaró.
- **2026-09-21 · `CompositionPlanInput` usa `artifactId`, no `deckId`.** Una sonda con el campo equivocado compone
  igual y deja un `undefined.manifest.json` y un `undefined.pdf` junto a los archivos buenos. No es un bug del motor:
  es el campo mal escrito, y el motor no lo reclama.
- **2026-09-21 · El llenador clona el PRIMER HIJO del contenedor.** Un campo declarado directamente sobre ese hijo
  (`<th data-slot-field="label">`) no se encuentra: el campo va DENTRO del elemento repetible
  (`<th><span data-slot-field="label">`). Y un dato de presentación que se repetiría por fila —la alineación de una
  columna numérica— se resuelve en el CSS del molde por posición, no declarándolo en cada item.

- **2026-09-21 · Una guarda que no puede fallar es una afirmación, no un mecanismo.** Escribí en el resolver del
  catálogo A4 una verificación de que la etiqueta impresa representara el valor que dibuja la barra, y la anuncié en
  el commit. Estaba muerta: `printedValue` es `string` por contrato y el helper sólo aceptaba `number`, así que
  siempre daba `null` y la comparación se saltaba entera. El render pasaba. Regla: para toda guarda, escribir primero
  el test que la hace SALTAR (etiqueta que contradice el dato, etiqueta ilegible); si no se puede escribir ese test,
  la guarda no existe. Y una entrada ilegible nunca desactiva una verificación: la convierte en error.
- **2026-09-21 · Los tests verdes NO son typecheck.** 263 tests del composer pasaban con cuatro errores TS vivos
  (`ResolverRegistry`/`FieldEffect` importados del módulo equivocado): Vitest transpila con esbuild y no verifica
  tipos. Regla: `pnpm typecheck` es un gate propio, no una consecuencia de la suite; correrlo antes de cada commit
  de código, no sólo al cerrar.
- **2026-09-21 · El `composer:visual-gate` da rojo en `develop` limpio, y es más ancho que ISSUE-122.** Sin tocar
  nada: 19 de 33 plantillas, 1–443 píxeles. El runbook documenta la variación de rasterización entre entornos, pero
  ISSUE-122 la acota a láminas con FOTOS, y acá fallan también `ProcessStepsFull` (443), `TimelineFull` (332) y
  `MaturityLadderFull` (197), que son geometría y texto. El gate no corre en CI: es local. Regla: al tocar el
  composer, exigir cero píxeles SÓLO en los frames que uno introduce, y nunca re-congelar frames ajenos para
  ponerse en verde — el runbook llama a eso «rebaseline silencioso».
- **2026-09-21 · La tubería de marca estaba atada al primer catálogo.** El ADR del Composer sostiene que agregar un
  catálogo no toca el motor — cierto para el motor, falso para `compile-tokens`, que derivaba TODAS sus rutas de
  `deckAxisCatalogDir`. Mientras hubo un solo catálogo, «el catálogo es dato» no se probó en esa frontera. Regla: al
  extraer una tubería compartida, la no-regresión se verifica con el mecanismo que el repo YA tiene
  (`brand-pack-sync` compara CSS compilado vs committeado) y con `sha256`, no con un script inventado para la ocasión.
- **2026-09-21 · Un redondeo cosmético puede romper la promesa del gráfico.** El Venn de dos conjuntos resuelve por
  bisección la distancia entre centros cuya lente vale exactamente la intersección. Redondear esa distancia a 4
  decimales degradaba el área fuera de tolerancia; su propio test lo detectó porque **recalcula el área desde la
  geometría devuelta** con una implementación independiente. Regla: cuando un valor alimenta otra magnitud, la
  precisión del intermedio es parte del contrato. Y un test de geometría que sólo comprueba que el código corre no
  prueba nada.
- **2026-09-21 · Venn de tres conjuntos no se implementa, y no por costo.** Con tres conjuntos las áreas
  proporcionales exactas en general NO existen: es una limitación matemática. Un Venn de tres con números adentro es
  un esquema, y si aparenta proporcionalidad, miente. El caso de 3+ es UpSet (longitud de barra, escala a N).
- **2026-09-21 · Contrato de catálogo: `item.shape`, no `item.fields`; y `consumer`.** Un campo del item que no se
  imprime se declara `consumer: 'resolver-only'` o `'validation-only'`; si no, el motor exige un
  `[data-slot-field]` en el HTML y falla con «quedaría el contenido de ejemplo del prototipo». `composeArtifact`
  tiene firma POSICIONAL `(catalog, deckPlan, outDir, options)`.

- **2026-09-18 · Release from an explicit SHA, not from the tip of `develop`.** TASK-1848's release was cut from an explicit
  SHA to exclude a peer commit on `develop` that had not been validated. Rule: dispatch the release from the explicit, validated SHA so an
  unvalidated peer commit stays out; verify the manifest's `target_sha` before approving.
- **2026-09-18 · The gateway deploys only after the Greenhouse release that publishes its routes.** `efeonce-mcp`
  `deploy.yml` is `workflow_dispatch` (merging to its `main` does NOT deploy). Federating tools whose ecosystem routes are
  not yet in production makes the gateway point at 404s. Order: Greenhouse release → contract canary → dispatch the
  gateway deploy → provider canary.
- **2026-09-18 · "Delivered" cannot be read from the ledger.** Resend's lifecycle webhook does not operate (ISSUE-160), so
  `provider_status` stays null after `accepted`. Rule: a real-email canary is confirmed by the operator looking at the
  authorized inbox and saying so; record it as human evidence, never as ledger evidence.
- **2026-09-18 · A concurrent burst against a public route nearly exhausted the shared PostgreSQL.** Measuring the share
  reader's rate limit with 64 concurrent requests left 86–88 idle `greenhouse_app` connections (max 100) for exactly 5 min:
  each Vercel invocation opens its own pool, the pool's idle timeout never runs while the function is frozen, and the
  server only cuts at `idle_session_timeout` (5 min). DB-backed rate limiters spend a connection before rejecting, so the
  limiter itself does not protect the database. Rule: never probe limits with concurrent bursts against public DB-backed
  routes on the single shared Cloud SQL (it serves production); sequence them. Fix owner: TASK-1876 (ISSUE-174).
- **2026-09-18 · The email platform's token-sensitive intent index is unique per (type, source_event_id, source_entity).**
  Symptom: a retry that reuses the SAME correlation never creates a new `email_deliveries` row (it collides with the
  previous attempt). Rule: correlate per attempt — `idlr-<uuid>` for attempt 1, `idlr-<uuid>:aN` for retries N=2..5 —
  so a retry never collides with, nor is confused with, the previous attempt when reconciling.
- **2026-09-18 · `email_type_config` fails OPEN.** Symptom: a new EmailType without a seeded row is enabled the moment
  the code deploys. Rule: every new EmailType ships with its `email_type_config` row seeded `enabled=false` in the same
  migration; turning email on is a row flip, not a side effect of the deploy.
- **2026-09-18 · `NotificationService.dispatch` cannot restrict channels.** Symptom: using it for an "in-app" notice
  also fires its own generic `notification` email — a double send with no dedupe. Rule: do not use it for in-app next to
  a domain email until channel restriction exists (owners TASK-690–693 / TASK-1849); document the gap instead.
- **2026-09-18 · `pnpm pg:connect:migrate` stops the Cloud SQL Proxy when it finishes.** Symptom: a proxy you started
  earlier is dead afterwards (`ECONNREFUSED 127.0.0.1:15432`) for readbacks and live tests. Rule: restart the proxy after
  migrating before any readback or `pnpm test:live`.
- **2026-09-18 · `tenant/access` drags bcrypt/BigQuery/notifications into the worker bundle.** Symptom: revalidating an
  authority from the ops-worker through the tenant access helpers pulls heavy, unrelated deps. Rule: read
  `greenhouse_serving.session_360` (role_codes with lifecycle) and build the subject there.
- **2026-09-18 · The Grader's share link is not a model for sharing.** Symptom: it stores the token in clear and serves
  without anti-index headers (`public, max-age=300`). Rule: the model is the talent-pool token (digest only) plus the
  headers of `hiring/assessment/public-session/http.ts`.
- **2026-09-16 · A cold Job start makes the dispatcher launch twice for one output.** Production canary: the Job took
  ~2 min to start, so the next 2-min tick (22:14) still saw the `deck_pdf` output `queued` and launched a second
  execution after the 22:12 one. Only one finalized (atomic claim + fencing); the other found no work. Rule: count
  executions per output as "≥1", never "exactly 1"; integrity lives in claim + fence, not in the dispatcher. Two Job
  executions for one output after a cold start are expected, not a double render — do not retry or cancel. If the
  cost ever matters, the fix is for the dispatcher to account for Job executions still running before launching.
- **2026-09-16 · A hand-launched canary hid the dispatcher's missing flag.** The 13:00Z render canary executed the
  `artifact-worker` Job manually and passed; the `ops-worker` dispatcher did not have `INSIGHTS_RENDER_ENABLED`
  (logs 13:02Z `insightsQueued=0` with an output queued), so nothing would have drained on its own. Rule: a canary
  exercises the production path (enqueue → scheduler tick → dispatcher → Job), never a shortcut. Map every runtime
  that reads the flag with `grep` before declaring the rollout, including the one that only *launches* work.
- **2026-09-16 · A single Job cannot carry lane-dependent config.** The `artifact-worker` Job and the `ops-worker` are one
  instance each for staging AND production; the assets bucket is fixed to the staging bucket and assets keep
  `bucket_name` per row. Rule: per-environment behaviour lives at the enqueue gate (Vercel per target), not in Job env;
  never assume a flag or bucket on the Job can differ between staging and production.
- **2026-09-16 · Audit the human actor on EVERY event, not only on the run.** Before migration
  `20260916201127095`, runs and events of a client-requested render were recorded as `system` (the CHECK did not
  accept `client_user`). Rule: when a command can be invoked by a human of any kind (`member`, `client_user`), the actor
  travels to the run, the enqueue event, retry and cancel — and the CHECK accepts every actor kind the lanes allow.
- **2026-09-16 · Throughput is the tick, not the render.** Rendering takes ~7 s but the dispatcher launches one Job
  execution per 2-min tick (`parallelism=1`, Proposal first): a burst of 5 took 11 min. Promise ≈ 2·N min, not seconds.

- **2026-09-16 · Down of a migration must respect governance tables.** Symptom: `migrate:down` failed twice
  (`module_assignments_module_key_fkey`, then `module_assignment_events is append-only`); node-pg-migrate rolled the
  whole transaction back (no damage). Rule: a domain's Down retires its own schema and deprecates capabilities; it
  never deletes catalog rows, assignments or audit. Editing only the Down section of an applied migration is fine.
- **2026-09-16 · Announce destructive shared-instance actions and WAIT.** A peer session (TASK-1846) sent an ALTO that
  arrived after the down had run, because the docs said "real editions in production". Rule: announce, wait for a
  reply, name the owning org, and write "synthetic (sandbox org); production = runtime".
- **2026-09-15 · Vercel freezes env vars at build.** `INSIGHTS_GENERATION_ENABLED` added after the deployment was
  created ⇒ `generation_disabled` until `vercel redeploy`. Same in Production after the release.
- **2026-09-15 · Idempotent replay is HTTP 200, not 202.** `status: result.idempotent ? 200 : 202` in both lanes. A
  lane-level replay (header key) returns the cached 202 with `idempotent:false`: lane behaviour, not the command.
- **2026-09-15 · The served manual must be self-sufficient.** An agent with no context built a valid request from it,
  but lacked title/purpose, window limits, `comparison.custom` shape, pagination, `includeEvidence`, `allowPartial`
  with all modules empty, and the real error codes. All added; keep it that way when contracts change.
- **2026-09-15 · `plan.limits` repeats the same line per rejection** ("ico: sin datos." ×4). Dedupe belongs to TASK-1846.
- **2026-09-15 · Gateway surface baseline trap.** If `surface-baseline.json` already carries the new version with the
  old hash, `pnpm surface:baseline` aborts: `git checkout -- surface-baseline.json`, bump `package.json`, regenerate.
- **2026-09-15 · Parity/authorized-tools tests build their own server.** New provider ⇒ add the stub to
  `test/authorized-tools.test.ts` and the parity test's server build, plus `src/surface.ts`.
- **2026-09-15 · Permission classifier vs. autonomy.** `az rest`, `gh pr`/push to the gateway repo, `pnpm migrate:down`,
  `gh workflow run`, `vercel env add … production` were blocked until the operator added Bash allow rules in
  `~/.claude/settings.json`; chained commands get blocked more often than single ones. Ask for the rules up front.
- **2026-09-15 · `git push` over SSH (ssh.github.com:443) dropped the pack; HTTPS with `gh auth git-credential` worked.**
- **2026-09-15 · Docs-only merge before a release cancels staging (Ignored Build Step)** and `vercel_readiness`
  then fails preflight; touching a deploy-control doc (flag ledger) produces the build honestly.
- **2026-09-15 · Served manual leak test rejects TASK ids, repo paths, UUIDs, org ids, secret names.** Write for an
  external agent; keep those in the local skill, never in `docs/mcp/skills/**`.
- **2026-09-15 · ISSUE-172 pattern applied:** public codes use a plpgsql function with a single `nextval` and
  `lpad(n, GREATEST(6, length(n)), '0')`; never `to_char FM` nor a per-row DEFAULT in `INSERT … SELECT`.
- **2026-09-16 · `proposal_render_jobs` has NO lease, fencing token or heartbeat.** The claim
  (`claimNextRenderJobForExecution`) is atomic via `FOR UPDATE SKIP LOCKED`, and `markRenderJobCompleted` only
  checks `expectFromStates:['running']` — it never verifies the finisher still owns the claim. Consequence today:
  no double execution (nothing re-claims), but a worker that dies leaves the job in `running` forever;
  `listExpiredQueuedRenderJobs` only covers `queued` past its deadline. TASK-1846's acceptance about "a stale lease
  must not produce two final outputs" describes a hazard **that task itself introduces** by adding reclaim — so
  lease and fencing must ship in the SAME slice. Never split them.
- **2026-09-16 · In the shared checkout, another session's `git push` carries YOUR local commits.** Three
  documentation commits of TASK-1846 reached `origin/develop` inside greenhouse-eo-96's push of TASK-1845, with no
  action from the 1846 session. Local-first is not protection: if a commit must not leave the machine yet, it must
  not be committed to `develop` yet. Verify after any peer push with `git merge-base --is-ancestor <sha> origin/develop`.
- **2026-09-16 · `Handoff.md` budget: the gate counts TOKENS, the rotator works on SESSIONS.** `docs:context-rotate`
  reported "2/20 sessions, 439/600 lines, nothing to rotate" while `docs:context-check:strict` failed at ~12411
  tokens over a 12000 ceiling. Baseline was 11994 with a single session — six tokens of headroom, so ANY new entry
  overflows it. Fixes, in order: `--max-sessions=N` to force rotation, and then trim your own entry to a pointer
  (most of the file's bulk is not in dated sections, so rotation alone does not get you under).
- **2026-09-16 · How to verify the synthetic-edition claim AFTER the fact.** The vocabulary trap is in SKILL.md; the
  operational check is: `module_assignments WHERE module_key='insights_v1'` must return exactly the sandbox org, and
  `organizations.organization_name` confirms it is "Greenhouse Demo". That check survives a `down`/`up`; the rows
  themselves do not. Post-rollback you can prove "no real org had the module", never "what the deleted rows were".
- **2026-09-16 · Un parámetro `$N` sin referenciar revienta en PostgreSQL, no se ignora.** Al agregar la
  cuota por organización quedó `$2` sin usar en el SELECT del claim (usaba `$1` y `$3`): PG responde
  `could not determine data type of parameter $2`. Numerar los `$N` consecutivos POR QUERY, no por la lista de
  variables del TS. Lo destapó el live test; el typecheck no ve dentro del SQL.
- **2026-09-16 · `zsh` NO hace word-splitting de `$VAR` sin comillas.** `P="a b c"; git add $P` pasa la cadena
  entera como UN path y falla con `did not match any files`. En bash funcionaría. Usar rutas literales o `${=P}`.
  Falló ruidoso, que es lo bueno; la variante silenciosa de esta clase es la que muerde.
- **2026-09-16 · Un live test que falla con `invalid_rapt` NO es un bug de tu SQL: es la ADC de gcloud vencida.**
  El stack apunta a `cloud-sql-connector`/`google-auth-library`, no a tu query. Se arregla con
  `pnpm gcloud:auth:playwright -- --force` y se re-corre; perseguir el SQL es perder el rato.
- **2026-09-16 · `pnpm build` de producción MODIFICA `tsconfig.json`** (le agrega includes con timestamp
  `.next-local/build-<ts>/types/**`). Es un archivo versionado: commitear después de un build sin mirar
  `git status` se lleva esa basura, distinta en cada corrida. Revertir con `git checkout -- tsconfig.json`.
- **2026-09-16 · El guard de write-target del dominio atrapa tus tablas nuevas, y está bien.**
  `boundary-domain.test.ts` falla con la lista de writes no registrados; la task lo exige en el mismo PR.
  Registrarlas en `ALLOWED_WRITE_TARGETS` es la acción correcta — el boundary no se ensancha hacia módulos
  productores, sólo reconoce tablas propias.
- **2026-09-16 · A re-export does not bring the name into local scope.** Moving `hashResolvedManifest` to the composer and
  writing `export { … } from` in `render-jobs.ts` broke its own internal use; the fix is `import` + `export { name }`.
- **2026-09-16 · Two canonical-JSON implementations = two hashes.** `request-hash.ts` and `render-jobs.ts` each had one;
  the worker's drift check would give false positives if enqueue and worker hashed differently. One domain-free
  function in the composer, re-exported by Proposal, byte-identical (`composer:visual-gate` unaffected).
- **2026-09-16 · `CoverFull` is proposal vocabulary.** Its `proposalKind` enum renders "Propuesta Técnica" / "Capacitación
  HubSpot": an Insights deck must not emit it. The section divider opens the deck until TASK-1847 ships real catalogs.
- **2026-09-16 · Slot budgets are tuned for tender copy** (title 32, KPI value 8, unit 8, qual 72). Insights copy from a
  frozen plan will exceed them; the honest answer is `render_rejected` with the cause, never a silent truncation.
- **2026-09-16 · The `unit` slot of `MetricsSplit` renders glued and wrapped** (`45–50por`/`mes`) in delivered tender
  decks too — it is a catalog defect, invisible to slot validation and to the pixel gate (baselined). Separate issue.
- **2026-09-16 · macOS `xargs` has no `-a`.** Use `git add --pathspec-from-file=<file>` / `git commit --pathspec-from-file`
  for explicit-path commits in the shared checkout.
- **2026-09-25 · The sandbox org cannot prove a report with data.** «Greenhouse Demo» has no ICO snapshots, so a
  productive canary with figures needs an internal edition of a real client (operator authorization). Check the
  source (BigQuery) before concluding a client "has no data": Sky had 11 months while the sandbox had none.
- **2026-09-25 · A percentage delta printed as a relative percent is ambiguous.** OTD 80,1 → 81,9 printed
  «+2,2 %»; the reader expects «+1,8 pp». Owned by TASK-1888 (plan contract), not a catalog fix.
- **2026-09-25 · `cmd; echo EXIT=$?; tail log` reports tail's exit code.** A background gate must end with
  `exit $rc` of the gated command, or its green notification proves nothing.

- **2026-09-26 · Un empate no tiene dueño: la cifra principal es el valor empatado.** Síntoma: en staging, Berel
  mostraba «39» (puntaje global, primer hecho de la figura) con la bajada «Dimensiones evaluadas.», mientras el empate
  era en 100. Regla: todo superlativo exige máximo ÚNICO en lo impreso (se dice el empate); la bajada de un empate es
  el nombre común; y la cifra es la EMPATADA. Sólo apareció al generar una edición real en staging: el plan-only local
  no lo mostraba porque nadie leyó `keyFigure.value` contra su bajada.
- **2026-09-26 · Recrear una var de Vercel exige un deployment POSTERIOR.** Tras un rollback, la var de Production se
  borró y se volvió a crear (10:24:26Z); el deployment que la ve empezó a las 10:24:34Z. Verificar con
  `vercel api /v9/projects/<id>/env` (createdAt exacto) contra `vercel inspect --json` (createdAt del deployment):
  «1h ago» en `vercel env ls` no alcanza para decidir.
- **2026-09-26 · Un rewrite de historia cambia todos los SHAs citados.** Tras sacar blobs de `ai-generations/`, los SHAs
  de las tasks dejaron de existir en origin con contenido idéntico. Anotar el vigente con el viejo entre paréntesis y
  verificar despliegues por blobs, nunca por ancestría (el release a main es squash).
- **2026-09-26 · Ecosystem tiene dos capas de idempotencia.** Repetir con `Idempotency-Key` HTTP reproduce el status/body
  originales (incluido 202); para comprobar el replay de dominio `200 idempotent:true`, conserva `idempotencyKey` en
  el body y omite el header de transporte. En la primera canary Production el env Vercel se había guardado como
  `true` + salto de línea; `isOn` usa igualdad estricta con `true`, así que la generación emitió plan v1. Actualizar
  el env con `--value true` lo dejó en cuatro caracteres y el nuevo deployment selló v2. La canary SEO+AEO+ICO aún
  tenía cero facts y nueve rejections (SEO 3, AEO 2, ICO 4), por lo que falló validación; eso es independiente del
  contrato v2, cuya prueba son las tres `scopeLines` y el cover congelado.
- **2026-09-26 · Un flag comparado con `=== 'true'` muere con un salto de línea en el valor.** La primera canary de
  producción selló un plan v1 con la var «en `true»: según Codex el valor tenía `\n` final (una lectura por API no lo
  mostró). Regla: cargar flags con `printf %s true | vercel env add …` (nunca `echo`) y probar el COMPORTAMIENTO con una
  canary que selle algo que sólo existe con el flag (aquí `plan.scopeLines`), no el listado de vars.
- **2026-09-26 · Un script que reescribe docs compartidos debe LEER antes de abrir para escribir.** En Python,
  `open(p,'w').write(fn(open(p).read()))` trunca el archivo antes de leerlo: vació `docs/tasks/README.md` con WIP ajeno.
  Se recuperó desde un blob colgante (`git fsck --unreachable` + búsqueda de una línea única del WIP) con hash idéntico.
- **2026-09-28 · `sendEmail().deliveryId` es el id del BATCH, no la fila de `email_deliveries`, y en el envío
  secuencial de primer intento `recipientResults[].deliveryId` TAMBIÉN es el batch** (`sendEmail` descarta el id de
  `createDeliveryRow`). La modalidad `attachment` guardó el batch en `insight_delivery_recipients.email_delivery_id`:
  referencia a una fila inexistente. Ningún test lo vio porque el estado de transporte se lee por `source_event_id`; lo
  destapó un JOIN contra datos reales. **El primer fix (`34d763460`, `recipientResults[0]`) no corregía nada y su test
  pasaba porque el mock inventaba la fila: el mismo modo de falla que ocultó el bug.** Lo refutó un subagente leyendo
  `src/lib/email/delivery.ts`. Fix real `8882af0e3`: resolver la fila por `source_entity` + `source_event_id`. Reglas:
  (1) al persistir una referencia a otra tabla, verifícala con un JOIN contra datos reales; (2) un mock de un contrato
  ajeno se escribe leyendo el código de ese contrato, nunca con el valor que tu fix espera.

### 2026-09-28 — Un enlace sin `downloadOutputs` no descarga nada (TASK-1875)

Síntoma: el canary de Think en staging mostró la edición sin botones de descarga y `?descargar=deck_pdf` devolvió 303,
con el deck renderizado y la edición emitida. Causa: el grant se creó con `{"ttlDays":1}`; ese campo no existe
(el correcto es `expiresInDays`) y `downloadOutputs` vacío es el default. Regla: al crear un enlace, pasar
`downloadOutputs` explícito y verificar el TTL en la respuesta (`expiresAt`), no en lo que se mandó.

### 2026-09-28 — Astro permite un solo `astro dev` por proyecto (TASK-1875)

Síntoma: el servidor de Think contra staging salía con código 1 en 4 s («Another astro dev server is already
running»). Regla: parar el servidor de fixtures antes de levantar el de staging; en `--mode staging` los tokens
`fixture-*` siguen resolviendo porque `import.meta.env.DEV` sigue en `true`.



## 2026-10-02 · TASK-1957 — la traducción vivía en el render, no en el contrato

- **Dos humanizaciones divergen en silencio.** El PDF traducía la fuente en `figure-slots.ts`; el modelo web copiaba
  `fact.source` (la tabla lectora) aunque su propio contrato decía «fuente legible». Nadie lo vio hasta mirar el
  informe con datos reales. Regla: el vocabulario de cara al lector es UNA función que comparten todas las formas.
- **El gate atrapó un fixture que mentía.** El primer fixture rotulaba la presencia con el código del proveedor
  (`google_ai_overview`); el adapter real usa el nombre visible. Un gate derivado del payload no se ajusta para pasar:
  se corrige el dato que lo viola.
- **Una regla nueva puede producir su propio caso borde.** Las bandas de magnitud dejaban un cero en banda aparte y
  dos puntajes empatados sin figura; se limitaron a unidades sin tope y el cero se lee en cualquier eje desde cero.
- **Planner y gate deben compartir la regla, no parecerse.** «n de m junto a su total» pasaba el planner y lo marcaba el
  gate; la salida fue UNA regla escrita en los dos con el mismo predicado.
- Vista previa local con datos reales sin emitir: mock del lector público (sirve el JSON armado por
  `buildInsightWebModel` sobre un plan regenerado desde el snapshot sellado) + Think dev con
  `GREENHOUSE_API_BASE` apuntando al mock. No escribe nada salvo la bitácora de acceso al logo.

- **El indicador tiene nombre estándar y una sola fórmula.** «Presencia 2 de 6» era un dato correcto con la forma
  equivocada: el operador pidió Share of Voice / Share of Model (skill `seo-aeo` §07). La definición se toma del Grader
  (misma fórmula), no se reescribe en Insights; el roster del Grader NO se reusó porque descarta motores desconocidos y
  el contrato de canales de Insights promete mostrarlos sin isotipo.
- **Un `$` en el texto de reemplazo de `String.replace` es un patrón**, y una búsqueda de ancla con `indexOf` puede
  casar antes de tiempo (`"  return {…"` dentro de `"      return {…"`). En ediciones por script: reemplazo por
  función o por `slice`, y anclas únicas.
- **Partir una figura puede borrar las conclusiones del capítulo.** Las lecturas, la tesis y «Lo esencial» salen de
  figuras con página; una figura de una sola barra no tiene página. Separar métricas SEO por magnitud dejó tres figuras
  de una barra y el resumen de Berel cayó en «… lideran con 100» (2026-10-02). Antes de cambiar la elegibilidad de
  figuras, regenerar la vista previa real y mirar tesis + esenciales, no sólo el gate.
- **Un puntaje compuesto hereda la falla de sus partes.** Excluir `competitive_sov` = 100 sin competidores no basta: pesa
  15 % del global del Grader, así que el global también queda fuera hasta que el Grader lo corrija.

## 2026-10-02 — TASK-1962: qué dice el informe antes de cómo se ve

- **Una UI que «filtra» puede estar decidiendo contenido.** Think infería el módulo de un hallazgo por la primera cifra,
  buscaba su figura recorriendo capítulos y contaba hallazgos para ocultar el tablero. Ninguna cifra era inventada, pero
  eran decisiones que el PDF, el deck, Nexa y el MCP habrían tenido que repetir. Regla: si otro consumer tendría que
  hacer lo mismo, va al modelo.
- **«Más cambió» tiene que significar lo mismo en todo el informe.** La lectura genérica de barras elegía el mayor cambio
  RELATIVO (/colores, -20,7 %) mientras el hallazgo de causas hablaba del mayor cambio en clics (la portada). Las figuras
  de un productor especializado traen su propia lectura.
- **Una petición al cliente es sólo lo que el cliente puede dar.** Sin perfil del Grader o sin space es trabajo nuestro;
  pedírselo al cliente lo confunde. Search Console sin conectar sí es suyo.
- **La regla de exposición competitiva vive en el dominio dueño.** El código de competidores SEO lo dice («la comparativa
  competitiva no se expone al cliente»): leer el dominio antes de sumar un dato evitó llevar la competencia SEO al
  informe sin decisión del operador.
- **Un dominio es una sola palabra.** La figura de columnas parte etiquetas sólo por espacios: «greatplacetowork.com.mx»
  hizo fallar cerrado el PDF de Berel. Las listas de dominios van a hallazgo y tabla, no a columnas.
- **Una página de tabla se llena por altura, no por filas.** 16 filas con etiquetas de dos líneas se desbordaban; el
  mapper ahora pesa doble una etiqueta larga.
- **El PDF rechazaba el informe entero ante una familia sin página.** Por eso todo salía en barras aunque Think dibuja
  15 familias. Ahora los mappers filtran con `PDF_FIGURE_FAMILIES`: la web dibuja cascada y waffle, el PDF conserva
  hallazgo y tabla. Una figura de familia nueva no debe tener lectura de página si no tiene página.
- **Las preguntas del Grader importan más que el informe.** Berel aparecía citado por indeed y glassdoor porque su perfil
  estaba en «Manufactura» y sus sets curados nunca se aprobaron: las corridas usaban el paquete genérico. Antes de leer un
  resultado del Grader, mirar `prompt_set_id` de la corrida.
- **Los PDF no dibujan el plan de acción**: Think sí. Al revisar «qué falta» en un formato, mirar el mapper, no el plan.
