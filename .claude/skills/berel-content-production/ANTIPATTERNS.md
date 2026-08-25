# Antipatrones — Berel

> No es una lista teórica. **Casi todos estos errores ya se cometieron en este cliente** y quedaron
> documentados en su propia wiki. El resto son reglas que el cliente marcó en revisión, algunas más
> de una vez.

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
- **Prometer lo que el cliente no respaldó** — ahorros, porcentajes de eficiencia, garantías. Sin
  documento, no se escribe. (→ `01`, `09`)
- **Rellenar con supuestos una fuente vacía de la wiki.** Hay **siete páginas vacías** y varias son
  justo las que el playbook cita como insumo. Se declara el hueco, no se inventa el contenido.
- **Inventar una URL de ficha.** Si el producto no tiene ficha localizable: nombre + serie
  confirmados en catálogo, enlace al catálogo general y **pendiente declarado**. (→ `03`)
- **Omitir un pendiente.** *Un pendiente declarado es gestionable; uno omitido se publica como
  error.* (→ `03`)

## Orden de producción

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
  **nueva garantía de 10 años**. (→ `09`)
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

## Operación en Notion

- 🔴 **Borrar o modificar contenido existente.** Todo se **agrega** como desplegable nuevo. (→ `07`)
- 🔴 **Usar la barra vertical dentro de una celda de tabla.** Parte la fila y se pierde el texto que
  sigue. Por eso los metadatos van en viñetas. (→ `07`)
- **Reintentar corregir la canonización de Notion.** Al guardar, Notion normaliza tablas, escapes y
  negritas. Es cosmético: **no se reintenta**. (→ `07`)
- **Reescribir la página entera** en vez de hacer reemplazos pequeños anclados en texto copiado
  literal. (→ `07`)
- **Editar una propiedad fórmula, el bloque Frame.io o `[GH] RpA v2`.** Son calculadas o son
  writeback de Greenhouse. (→ `07`)
- **Crear la subtarea antes que la tarea, o la tarea antes que el proyecto.** Cada nivel necesita la
  URL del anterior. (→ `07`)
- **Dejar `Artículo (Content Hub)` vacío en un banner** porque el nombre ya lleva el `N##`. Hoy 187
  de 283 tareas no tienen el vínculo y la trazabilidad se sostiene por convención de nombres: **si
  alguien renombra, se pierde**. (→ `07`)
- **Reiniciar la numeración `N##` cada mes.** Es continua entre meses. (→ `01`)
- **Mover el estado de artículos ya publicados o sin tema.** No se tocan. (→ `01`)

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

## Reporte

- 🔴 **Entregar un conteo sin el motivo del bloqueo.** El avance se reporta en **tres grupos**:
  listos · faltantes con su bloqueo · fuera de alcance. *Un conteo sin el motivo no sirve para
  decidir nada.* (→ `01`)
- **Resolver en silencio un conflicto entre dos documentos del cliente.** Hay tres abiertos: se
  pregunta cuál rige y se corrige el que quedó viejo. (→ `SKILL.md`)
- **Lanzar búsqueda y extracción en paralelo.** Una de las dos se cae y se pierde el resultado.
  (→ `01`)
