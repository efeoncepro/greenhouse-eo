# Antipatrones — Berel

> No es una lista teórica. **Casi todos estos errores ya se cometieron en este cliente** y quedaron
> documentados en su propia wiki. El resto son reglas que el cliente marcó en revisión, algunas más
> de una vez.

## Tutoriales: regresiones detectadas el 2026-09-03

- **Confundir cuatro encabezados con un procedimiento completo.** Cada operación necesaria debe
  tener fuente y ubicación; mezcla, dilución y esperas no desaparecen por el corte del CMS. (→ 13)
- **Generalizar campos vacíos del CMS a todas las fichas.** Leer Wiki y PDF de la variante antes de
  declarar inexistencia o bloqueo permanente. Tacto no equivale a repintado, curado o uso. (→ 12 §3)
- **Sustituir una marca y conservar los datos anteriores.** Revisar acabado, soporte, aplicación,
  cifras, tablas, FAQ, ALT, PNG, banners y pares sociales; una referencia a otro tutorial no se
  cambia a ciegas. (→ 13)
- **Reescribir ampliamente una pieza anterior durante una corrección puntual.** Preservar texto,
  metadatos, colores y assets no afectados; auditoría y permiso de edición son distintos. (→ 13)
- **Conservar en la revisión vigente una receta desmentida porque está en el V1.** El original queda
  como historial; corregir o retirar del cuerpo vigente el claim no sustentado. (→ 12, 13)
- **Dar por corregido el arte o el paquete social al guardar el artículo.** Leer tareas y subítems,
  contrastar assets; declarar pendientes y bloquear distribución cuando falte conciliación. (→ 13)

## Verificación y honestidad del dato

- 🔴 **Auditar sobre el texto rescatado en vez de la URL en vivo.** *Caso real:* se afirmó que un
  artículo no tenía enlaces de color **cuando sí los tenía**. La extracción es texto plano: pierde
  enlaces, ALT, `title`, niveles de encabezado y marcado. **La ausencia en la extracción no es
  ausencia en la página.** (→ `02`)
- 🔴 **Declarar que algo no existe porque no lo encontraste.** *Caso real:* se dio por hecho que un
  producto no tenía ficha pública porque no aparecía en el listado del catálogo. **Sí existía, y el
  cliente tenía la URL a mano.** Un listado paginado **no es un índice completo**. (→ `01`)
- **Dejar en el cuerpo una afirmación que la verificación ya desmintió.** Corregirla **en el cuerpo**,
  no solo anotarla al final. El documento no puede quedar con afirmaciones falsas. (→ `02`)
- **Presentar una estimación como dato medido.** Volúmenes de búsqueda y comparaciones de competencia
  sin herramienta van marcados como **estimación**. (→ `02`)
- **Elegir una fuente cuando dos se contradicen.** Ninguna entra: van al callout de discrepancia y se
  reportan al cliente. (→ `01`)
- 🔴 **Tomar el brief como verificado.** *Caso real:* un brief de septiembre 2026 afirmaba que el COV
  de Berelinte se declara *"menor a 50 g/L"* cuando la ficha dice `< 50 g/L`, con símbolo; daba por
  buena una cita de ficha que todavía había que confirmar y proponía enlaces a fichas de producto
  **sin dar una sola URL**. Un brief es una hipótesis de trabajo bien hecha, **no una fuente** —sus
  propios bloques de supuestos suelen decirlo, y se leen por encima—. **Todo dato que vaya entre
  comillas se confirma contra la ficha vigente antes de escribirlo**; si el brief marca un supuesto,
  es una tarea, no una nota al pie. (→ `12`, `02`)
- 🔴 **Inventar un dato porque el hueco es incómodo.** Un intervalo no se deduce del tacto ni de
  otra variante. Tampoco se declara inexistente porque un campo del CMS esté vacío: contrastar
  Wiki, página y PDF oficial. Si sigue sin respaldo, declarar el pendiente y su efecto en el
  procedimiento; no sustituirlo por un criterio práctico igualmente inventado. (→ `12` §3, `13`)
- **Prometer lo que el cliente no respaldó** — ahorros, porcentajes de eficiencia, garantías. Sin
  documento, no se escribe. (→ `01`, `09`)
- **Rellenar con supuestos una fuente vacía de la wiki.** Hay **siete páginas vacías** y varias son
  justo las que el playbook cita como insumo. Se declara el hueco, no se inventa el contenido.
- **Inventar una URL de ficha.** Si el producto no tiene ficha localizable: nombre + serie
  confirmados en catálogo, enlace al catálogo general y **pendiente declarado**. (→ `03`)
- **Omitir un pendiente.** *Un pendiente declarado es gestionable; uno omitido se publica como
  error.* (→ `03`)

## Distribución selectiva

- Crear cuatro derivados por costumbre, o considerar faltante un canal No aplica. (→ 15)
- Excluir Pinterest por palabra temática, o forzar color en una Story técnica sin encaje. (→ 15)
- Confundir el mes de producción con la fecha de publicación de una campaña. (→ 15)
- Cancelar una tarea y asumir que dejó de sumar sin revisar etiquetas; retirar etiquetas de
  una entrega real para cuadrar el cupo; alterar fórmulas o dividir tareas sin permiso. (→ 15)
- Presentar reservas etiquetadas como imágenes/videos entregados, o inventar el cupo mensual. (→ 15)

## Orden de producción

- **Numerar según qué artículo se trabajó primero.** Reservar el bloque mensual completo,
  incluidos slots nuevos. No intercalar noviembre con diciembre. (→ 16)
- **Corregir solo el título o hacer reemplazos encadenados.** Usar mapa por ID y actualizar
  dependencias; no tocar Banner N1–N4 ni renombrar archivos/URLs históricos. (→ 16)

- 🔴 **Definir un banner antes de que el artículo esté escrito.** La escena del hero, el dato de la
  infografía, la comparativa y el cierre **salen del texto**. Un banner creado antes es un
  **placeholder, no un brief**. (→ `05`)
- **Dejar la ficha de un banner reservado sin revisar contra el texto final.** Si se creó antes por
  planeación, al cerrar el artículo hay que **reescribirla completa**: escena, dato, ALT, archivo y
  posición. (→ `05`)
- **Redactar copy social sin el artículo y sin el banner 🔁 especificado.** El gancho se termina
  inventando. (→ `06`)
- **Crear subtareas para un artículo con tema por definir.** Solo tarea principal. (→ `01`)

## Enlazado

- 🔴 **Enlazar un color a la búsqueda de _otro_ color.** Error real detectado en auditoría. (→ `02`)
- 🔴 **Enlazar el nombre del producto en vez de la variante que sostiene el claim.** *Caso real:* el
  brief pedía citar que el *Esmalte Summa* tiene "más de 900 colores" y enlazarlo, pero el CMS
  publica **una URL por acabado**: la URL base del producto declara *"Disponible en 2 colores:
  Chocolate y Negro"*, y el claim de 900+ solo lo sostienen las variantes **brillante** y
  **semimate**. El enlace habría llevado al lector —y a un motor de respuesta— a una página que
  **contradice la frase que acababa de leer**: es peor que no enlazar, porque destruye la
  credibilidad justo donde intentabas construirla. **Cruza cada claim con la URL exacta que vas a
  enlazar, no con la familia de producto**; si ninguna variante lo sostiene, el claim no se publica.
  (→ `12`, `03`)
- **Enlazar un producto a la búsqueda del sitio o al Home.** Los productos **sí tienen ficha
  pública**: la asimetría con los colores es deliberada. (→ `04`)
- **Contar los enlaces de búsqueda como enlazado interno.** Son páginas de resultados: sirven como
  destino tolerado para color, **no como enlace interno** en la auditoría. (→ `02`, `04`)
- 🔴 **Usar la URL cruda como texto visible del enlace.** Siempre anchor descriptivo. **Regla
  reincidente: el cliente ya la marcó dos veces.** (→ `09`)
- **Un CTA que apunta al Home.** Siempre a la página específica de la intención:
  `ubica-tienda`, `productos/calculadora`, `colores`, `inspiracion`. (→ `09`)
- **Enlazar URLs del backend o del CMS.** Nunca salen al público. (→ `03`)

## Voz y contenido

- 🔴 **Escribir con el default es-CL del repositorio.** Berel es **español de México** y el
  "nosotros" es del cliente, no de Efeonce. (→ `04`)
- 🔴 **Hablar de la marca en tercera persona** ("Berel ofrece…"). La marca habla en **primera persona
  del plural**. Excepción: ALT y schema. (→ `09`)
- **Meter al lector en el "nosotros"** ("seamos claros", "vamos por partes"). Al lector se le tutea;
  "nosotros" está reservado a la marca. (→ `04`)
- 🔴 **Anunciar la mexicanidad** ("la casa mexicana", "las azoteas mexicanas"). Se muestra en los
  objetos —la losa, el tinaco, el comal—, no en la etiqueta. **Excepción: las fichas de banner**, que
  son instrucción para diseño. (→ `04`)
- **Reducir lo mexicano a verde-blanco-rojo o folclore de postal.** (→ `04`)
- **Superlativos como comodín:** *impecable, ideal, perfecto, la mejor opción*. Y sus versiones
  encubiertas: "la que más rinde", "la mejor relación". (→ `04`)
- **Cerrar solo con el slogan.** El tagline es la firma, no el cierre: el cierre **retoma la escena
  de apertura**. (→ `04`)
- **Plantear una metáfora en el título y abandonarla a mitad del texto.** (→ `04`)
- **Pasarse de metáfora.** El cliente pidió lenguaje más plano en agosto 2026: *"los tres frentes"*,
  *"ya tomó la pared"* → *"orígenes"*, *"manchas que reaparecen"*. **Ante la duda, más plano.** (→ `09`)
- **Culpar al lector** ("la pintura equivocada") o denigrar el resultado ("se ve cansada"). La
  tensión se plantea en términos técnicos. (→ `09`)
- **Repetir el nombre completo del producto.** Una vez y después genérico; **contarlo antes de
  cerrar, incluido el CTA**. Tres menciones ya suenan a anuncio. (→ `04`)
- **Intercambiar beneficios entre líneas de producto.** Green purifica el aire en interiores; la
  humedad de costa es la Serie 3500; la garantía de por vida es Insignia. (→ `04`)
- 🔴 **Publicar valores RGB o HEX.** Nombre + código alfanumérico, con descripción verbal del tono.
  El Catálogo RGB es interno. (→ `09`)
- **Mencionar series de producto en el cuerpo** (*Serie 800*, *Serie 2300*) — también en tablas,
  listas de materiales y CTA. (→ `09`)
- **Usar "sin plomo" como argumento de venta.** Toda la categoría lo es hoy; el argumento es la
  una prestación verificada de la variante; ninguna garantía de años es universal. (→ `09`, `12`)
- **Incluir precios por región.** Nunca. (→ `09`)
- **Decir "estancias" o "zonas"** en vez de **"espacios"**. (→ `09`)
- **Proponer espacios que no existen** en las categorías de la sección Inspiración. (→ `09`)
- **Dar la temperatura de luz sin la fórmula completa** adjetivo + Kelvin, en **todas** las
  menciones. (→ `09`)
- **Emojis en el cuerpo del artículo.** En redes sí, con mesura; en el blog nunca. (→ `04`, `06`)
- **Mencionar o comparar con la competencia.** (→ `04`)
- **Dejar descripciones del brief dentro del cuerpo publicable.** (→ `09`)

## Imágenes

- **Imagen decorativa o intercambiable entre artículos.** Cada pieza nace de una sección real del
  texto. Si no ayuda a comprender, ni a retener, ni a cerrar la emoción, **sobra**. (→ `05`)
- **Amontonar las imágenes al principio.** Acompañan el avance del artículo. (→ `05`)
- 🔴 **ALT con el nombre de archivo, con la URL o con una etiqueta interna.** Errores reales
  detectados en auditoría. (→ `02`, `05`)
- **ALT del banner distinto al de las notas para Dev.** Una sola fuente de verdad. (→ `05`)
- **Listar en notas para Dev imágenes que no existen como banner especificado** (imágenes fantasma).
  (→ `05`)
- **Poner `loading="lazy"` en el hero.** Es el LCP. (→ `05`)
- **Marcar dos piezas con 🔁.** Una sola por artículo. (→ `05`)
- **Párrafos dentro de la imagen.** Solo título y etiquetas. (→ `05`)
- **Publicar un gráfico de la Paleta Frida Kahlo sin el logo de la licencia oficial.** Es obligación
  de licencia. (→ `09`)
- 🔴 **Pedir una infografía sin nombrar formato ni variante.** Diseño tiene cinco formatos resueltos;
  una ficha que no elige uno los obliga a improvisar y la pieza se sale del sistema. (→ `10`)
- **Elegir el formato equivocado por no leer el contenido.** Si es secuencia cronológica es Pasos; si
  hay que ubicar algo en un espacio es Señalización; si el protagonista es el color aplicado es Tipos
  de Color. Una comparativa metida en Pasos no se entiende. (→ `10`)
- 🔴 **Usar el rojo corporativo como acento recurrente en una infografía.** El acento es **Rojo
  Editorial `#B3153A`**; el corporativo se reserva a branding institucional. (→ `10`)
- **Confundir las dos reglas de HEX.** El HEX de la paleta de acento SÍ va en la ficha —es
  instrucción de diseño—; el HEX de un color de pintura nunca sale al público. Negarse a poner el
  acento por "la regla del HEX" bloquea a diseño sin motivo. (→ `10`, `09`)
- **Pedirle texto a la IA en un Muestrario de Paletas.** La imagen base sale **limpia y sin texto**:
  nombres, códigos, logo y branding se agregan después en Illustrator. (→ `10`)
- **Aplicar el catálogo de infografías a un hero o a un cierre.** Esas piezas se rigen por la otra
  base, `Formatos de Diseño`. (→ `10`)
- 🔴 **Escribir la ficha de una infografía con los 13 campos de la Spec.** La infografía lleva su
  propia ficha de 9 secciones + tabla por módulo. (→ `11`)
- 🔴 **Describir un texto en vez de escribirlo.** "Un título que hable del rendimiento" no es un
  título: diseño no redacta. (→ `11`)
- **Listar productos sin decir en qué módulo va cada uno**, o poner el nombre del producto donde iba
  el nombre del PNG. Son columnas distintas a propósito. (→ `11`)
- **Deducir un dato técnico para no dejar un hueco.** Lo no confirmado se escribe
  `PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE`. (→ `11`)
- **Usar "por ejemplo", "puede llevar", "algo como" o "etc." en un elemento obligatorio.** Deja la
  decisión en manos de quien no tiene el contexto. (→ `11`)
- **Mezclar copy con instrucción visual en el mismo campo.** Dirección visual dice *cómo se ve*; la
  tabla de contenido dice *qué contiene*. (→ `11`)

## Operación en Notion

- 🔴 **Borrar o modificar contenido existente.** Todo se **agrega** como desplegable nuevo. (→ `07`)
- 🔴 **Usar la barra vertical dentro de una celda de tabla.** Parte la fila y se pierde el texto que
  sigue. Por eso los metadatos van en viñetas. (→ `07`)
- **Reintentar corregir la canonización de Notion.** Al guardar, Notion normaliza tablas, escapes y
  negritas. Es cosmético: **no se reintenta**. (→ `07`)
- 🔴 **Anclar una edición en el texto que TÚ enviaste en vez de en el guardado.** Notion expande las
  tablas a un `<tr>`/`<td>` por línea, así que el reemplazo falla con `No matches found`. Se relee la
  página y se copia el ancla del estado actual. (→ `07`)
- **Reescribir la página entera** en vez de hacer reemplazos pequeños anclados en texto copiado
  literal. (→ `07`)
- **Editar una propiedad fórmula, el bloque Frame.io o `[GH] RpA v2`.** Son calculadas o son
  writeback de Greenhouse. (→ `07`)
- **Crear la subtarea antes que la tarea, o la tarea antes que el proyecto.** Cada nivel necesita la
  URL del anterior. (→ `07`)
- 🔴 **Crear todas las tareas pero omitir el proyecto mensual.** El proyecto es el contenedor del
  ciclo y todas las principales y subtareas deben relacionarse con él. Una lista plana no permite
  auditar alcance, calendario ni estado. (→ `01`, `07`)
- **Dejar `Artículo (Content Hub)` vacío en un banner** porque el nombre ya lleva el `N##`. Hoy 187
  de 283 tareas no tienen el vínculo y la trazabilidad se sostiene por convención de nombres: **si
  alguien renombra, se pierde**. (→ `07`)
- **Reiniciar la numeración `N##` cada mes.** Es continua entre meses. (→ `01`)
- **Mover el estado de artículos ya publicados o sin tema.** No se tocan. (→ `01`)
- **Meter filas `Idea` de artículos nuevos dentro de una ejecución limitada a reescrituras.** Se
  conservan para Modalidad B; compartir mes no amplía por sí solo el alcance. (→ `01`)
- 🔴 **Dar por buena la respuesta de escritura sin una segunda lectura.** Automatizaciones de Notion
  pueden sobrescribir fecha o estado después del alta. La evidencia de cierre es una consulta fresca
  del lote completo, no el payload aceptado. (→ `01`, `07`)
- 🔴 **Clasificar como reescritura una canónica planificada porque devuelve HTTP 200.** En Berel una
  ruta inexistente responde con shell vacío; sin `title`, H1 y cuerpo sigue siendo Modalidad B y sus
  enlaces entrantes/sociales permanecen bloqueados hasta QA live. (→ `01`, `03`)
- 🔴 **Forzar `vinílica` / `acrílica` / `esmalte` como categorías excluyentes.** Mezcla resina, base,
  familia y función, y produce recomendaciones falsas. Ordenar por superficie, exposición, función y
  ficha concreta. (→ `03`, `12`)

## Publicación en el CMS

- **Subir un artículo que el cliente no aprobó** en el Content Hub. (→ `08`)
- 🔴 **Dejar marcado "Generar alias de URL automático" en una reescritura.** Cambia la URL existente
  y rompe los enlaces entrantes. (→ `08`)
- **Pegar callouts de Notion tal cual.** No se pegan bien: van como emoji + "Berel tip", sin
  etiquetas HTML residuales. (→ `08`)
- **Dejar el title en el formato por defecto**, con la marca al inicio comiéndose los caracteres de
  más peso. (→ `08`)
- **Subir contenido marcado como "no se publica"** en el documento de Notion. (→ `08`)
- **Olvidar taguear "productos que aplican"**, o dejar que la tabla de productos no coincida con la
  imagen de producto de esa sección. (→ `09`)
- 🔴 **Copiar las credenciales del CMS fuera de Notion** — a este repo, a un log, a un commit o a un
  prompt. **Nunca.** (→ `08`)

## Selección de tema y medición

- 🔴 **Descartar un tema porque no tiene impresiones.** *Caso real:* el tema de sala tenía **147
  impresiones y cero clics** en 23 días, el último lugar de su serie, y por eso estuvo a punto de
  caerse — hasta que el propio brief desarmó el razonamiento: **no hay impresiones porque no existe
  la página**, no al revés. El argumento es circular: no hay contenido, luego no hay impresiones,
  luego se concluye que no vale la pena crear contenido. Y el filtro de *striking distance* sirve
  para empujar páginas que **ya** rankean: un tema sin pieza que funcione no puede aparecer en ese
  filtro por construcción. **Para contenido nuevo, la evidencia es el volumen del cluster y la
  debilidad del SERP, no la línea base propia.** (→ `01`, `02`)
- **Medir el resultado contra el volumen estimado en vez de contra la línea base.** La medición
  posterior se hace **contra esa línea base** —las impresiones que la página tenía antes, cero si no
  existía—. Comparar el resultado con el volumen estimado fabrica un fracaso donde puede haber un
  éxito. (→ `02`)

## Reporte

- 🔴 **Entregar un conteo sin el motivo del bloqueo.** El avance se reporta en **tres grupos**:
  listos · faltantes con su bloqueo · fuera de alcance. *Un conteo sin el motivo no sirve para
  decidir nada.* (→ `01`)
- **Resolver en silencio un conflicto entre dos documentos del cliente.** Quedan **dos** abiertos
  —esqueleto del artículo y longitud objetivo—: se pregunta cuál rige y se corrige el que quedó
  viejo. El de Instagram ya se cerró. (→ `SKILL.md`, `06`)
- **Lanzar búsqueda y extracción en paralelo.** Una de las dos se cae y se pierde el resultado.
  (→ `01`)
