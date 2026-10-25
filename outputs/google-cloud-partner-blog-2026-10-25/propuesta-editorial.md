# Anuncio de partnership Google — propuesta editorial y de producción

Fecha de investigación, producción y publicación: 2026-10-25. **Estado actual: entrada 252108 publicada y verificada**, categoría Novedades Efeonce y formato Novedad; autor Julio Reyes. URL: https://efeoncepro.com/novedades/efeonce-partner-google-cloud/. Portada 252106 y apertura 252107 incorporadas. El paquete de cuatro imágenes se conserva en `imagenes/export/`; hero reservado, sin activar el banner principal. Autorización explícita: «Ok publica». Readback WordPress y 20 controles públicos en verde; revisión real a 1440/390 sin overflow. Evidencia en `publicacion.log`, `publicado-readback.log` y `.captures/google-cloud-publish-2026-10-25/`. La publicación no acredita indexación en Google.

**Actualización visual del operador, 2026-10-25:** las cuatro imágenes se entregan **sin texto ni wordmarks incrustados**. Títulos, bajadas y firma de autor pertenecen a la UI. Esta instrucción prevalece sobre las descripciones anteriores de lockup y texto en portada de este brief. La entrega vigente es la versión 2 de `imagenes/manifest.json`.

## Decisión editorial

Publicar el blogpost de anuncio aprobado, de unas 800–1.100 palabras, en la categoría existente **Novedades Efeonce**, con formato **Novedad**. La extensión final depende del contenido útil; no se alarga para alcanzar minutos de lectura.

La noticia cuenta el hito y explica qué puede evaluar una empresa con Efeonce. Su intención principal es institucional y de consideración comercial, con búsquedas de marca. Las consultas genéricas sobre implementación de Gemini o contratación de Google Cloud necesitan contenidos o landings propios.

No crear una categoría Google, Partners, Alianzas o Cloud para esta entrada. No añadir Inteligencia Artificial como categoría secundaria por mencionar Gemini. La categoría primaria participa en el permalink. Una futura guía de Gemini puede pertenecer a Inteligencia Artificial y enlazar esta noticia.

## Evidencia actual

Verificado por SSH/WP-CLI, sin operaciones de escritura:

- Categoría `Novedades Efeonce`: ID **116**, slug `novedades`, 2 publicaciones; archivo `https://efeoncepro.com/category/novedades/`.
- Formato `Novedad`: ID **219**, slug `novedad`, 2 publicaciones.
- Antecedentes: anuncio Truora, ID 245732; anuncio HubSpot, ID 245717. Este último conserva categoría primaria HubSpot y su URL histórica.
- Estructura de permalinks: `/%category%/%postname%/`.
- Autor humano existente: **Julio Reyes**, ID **1**, perfil `https://efeoncepro.com/author/jreysgo/`. Mantener la voz institucional del cuerpo. La propuesta anterior de una firma genérica «Efeonce» se ajusta al contrato de autoría humana del blog.
- Activos: Efeonce Editorial Blocks **0.5.8**, EO Portada del blog **0.1.0**, Yoast SEO **28.6**, Yoast SEO Premium **27.7**.
- Estilos registrados y disponibles: Destacado Efeonce, Pasos, Recuadro y Pregunta frecuente.
- Etiquetas existentes pertinentes: `google`, ID **191**; `partnership`, ID **117**. No crear cuatro archivos nuevos de etiquetas con una sola entrada.
- Búsqueda de títulos/slugs de posts en publish/private/draft/future/pending/trash: no apareció un anuncio equivalente de partnership Efeonce–Google. Antes de una creación real, completar la búsqueda por manifest y canonical.
- Contacto público existente: página **20729**, `https://efeoncepro.com/contacto/`.

Verificado en navegador anónimo:

- El archivo de Novedades Efeonce usa la plantilla de archivo vigente y muestra las dos noticias anteriores.
- El artículo Truora usa byline y ficha humana de Julio. Su grafo actual es `NewsArticle`, con `Person`, `Organization`, `ImageObject` y breadcrumbs de Yoast.
- La plantilla single no muestra la destacada en la apertura. La imagen que se quiera ver dentro de este artículo debe insertarse como bloque de cuerpo.
- El blog tiene slider de cinco posiciones y riel de lecturas; no confundir estos espacios con el archivo textual.

La consulta web del archivo devolvió una versión rastreada antigua; para el estado actual prevalecen WordPress y el navegador de esta revisión.

## Ficha de publicación propuesta

| Campo | Valor |
|---|---|
| Tipo | `post` |
| Manifest lógico | `efeonce-google-cloud-partner-announcement` |
| Estado del primer montaje en CMS | `private`, cuando se autorice la creación |
| H1 | Efeonce es partner de Google Cloud: más posibilidades para conectar tu negocio con la nube y la inteligencia artificial |
| Slug | `efeonce-partner-google-cloud` |
| Categoría / primaria Yoast | Novedades Efeonce / 116 |
| Formato | Novedad / 219 |
| Etiquetas | google / partnership, reutilizando los términos existentes |
| Canonical propuesto | `https://efeoncepro.com/novedades/efeonce-partner-google-cloud/` |
| Autor editorial | Julio Reyes, ID 1; perfil y foto actuales |
| Emisor / voz | Efeonce, primera persona plural institucional |
| Fecha visible | Fecha real de publicación del artículo; mencionar la confirmación previa en el cuerpo si se necesita contexto |
| Minutos de lectura | Los calcula el runtime; no fijar una cifra promocional |
| Línea cromática | Conservar la institucional de Novedades; no cambiar categoría para obtener el acento de IA |

**Bajada visible:**

Ampliamos nuestra oferta de soluciones empresariales de Google para acompañar a las organizaciones desde la elección de tecnología hasta su implementación y adopción.

**Extracto de WordPress:**

Efeonce es partner de Google Cloud. Conoce qué abre esta nueva etapa para tu empresa y cómo podemos acompañarte en proyectos de nube, colaboración e inteligencia artificial con Gemini.

El extracto es para archivos y tarjetas. La bajada abre la lectura del artículo. El sumario resume las implicaciones. No imprimir las tres piezas seguidas con el mismo mensaje.

## Secuencia de bloques

H1, categoría, fecha, byline y minutos pertenecen al título/plantilla, no se duplican dentro de Gutenberg.

| Orden | Contenido | Bloque / tratamiento |
|---|---|---|
| 1 | Bajada y dos párrafos que anuncian la relación y explican a quién sirve | `core/paragraph`; la primera frase contiene el hecho confirmado |
| 2 | Arte horizontal del anuncio, visible dentro del artículo | `core/image`, con attachment real, dimensiones y ALT; sin enlace al archivo |
| 3 | Sumario «Qué abre esta nueva etapa» | `core/list` con estilo Recuadro; 3 ítems cortos |
| 4 | Navegación «En este artículo» | TOC nativo de Yoast, compacto; 4–5 anclas H2 útiles, sin repetir los productos como secciones larguísimas |
| 5 | H2: Qué significa esta alianza para tu empresa | 2–3 párrafos; contratación, alcance y acompañamiento en lenguaje de comprador |
| 6 | H2: Nube, colaboración e inteligencia artificial | Párrafos breves + tabla de tres filas; usar H3 para productos sólo si el desarrollo lo justifica |
| 7 | Una frase editorial que sostiene el enfoque | `core/pullquote`, Destacado Efeonce; sin atribuir una cita inventada a Julio |
| 8 | H2: Cómo trabajamos contigo | Lista ordenada estilo Pasos, cuatro pasos |
| 9 | H2: Preguntas sobre esta nueva etapa | 3–4 `core/details`, estilo Pregunta frecuente; schema automático del plugin |
| 10 | Invitaciones editoriales discretas, seguidas del cierre comercial | Enlace de Glitch primero; herramienta sólo si existe una pertinente; cierre con CTA a contacto |
| 11 | Autor y relacionados | Ficha humana y relacionados de la plantilla; no duplicar en el cuerpo |

**Sumario propuesto:**

- Podemos evaluar contigo soluciones de Google Cloud y Google Workspace para tu organización.
- Acompañamos proyectos que conectan nube, datos, colaboración e inteligencia artificial con Gemini.
- Definimos el alcance de contratación, implementación y adopción según las necesidades de tu equipo.

**Tabla de soluciones:**

| Solución | Necesidad que puede abordar | Trabajo a evaluar con Efeonce |
|---|---|---|
| Google Cloud | Aplicaciones, integración de sistemas y trabajo con datos | Arquitectura, servicios requeridos, implementación y operación acordada |
| Google Workspace | Comunicación y colaboración del equipo | Contratación, configuración, organización de accesos y adopción |
| Gemini | Tareas con información y asistencia mediante IA | Caso de uso, producto adecuado, permisos, revisión humana y evaluación de utilidad |

La tabla presenta ámbitos posibles, no equivalencia entre productos ni un catálogo de SKUs habilitados.

**Destacado propuesto:**

«La tecnología empieza a aportar cuando encuentra un lugar claro en la forma de trabajar de tu equipo.»

Mover la idea al destacado; no repetirla en los párrafos vecinos. Es voz editorial de Efeonce, no testimonio.

**Pasos propuestos:**

1. Entender qué necesita resolver la organización y cómo trabaja hoy.
2. Elegir las soluciones y precisar alcance, disponibilidad, costos y responsabilidades.
3. Implementar y probar el flujo acordado, con los accesos y controles necesarios.
4. Acompañar la adopción y revisar su utilidad con el equipo.

**FAQ propuesta:**

1. ¿Qué significa que Efeonce sea partner de Google Cloud? Explicar relación y alcance confirmado; no equiparar membresía a todas las certificaciones o especializaciones.
2. ¿Puedo evaluar Google Cloud y Google Workspace con Efeonce? Explicar el proceso de revisión del requerimiento y condiciones aplicables al país/proyecto.
3. ¿Qué proyectos con Gemini podemos explorar? Dar ejemplos como síntesis documental o asistencia sobre información, condicionados al producto, datos y configuración elegidos.
4. ¿Cómo empezamos? Dirigir a contacto con una necesidad concreta, no prometer un diagnóstico gratuito o un plazo que no se acordó.

Usar `kind: faq` con `schema.source: plugin`. El plugin produce el schema desde las preguntas visibles; no pegar otro FAQPage.

**Cierre:** «¿Estás evaluando Google Cloud, Google Workspace o una aplicación de Gemini para tu organización? Conversemos sobre lo que necesitas resolver.»

CTA: **Conversemos sobre tu proyecto** → `https://efeoncepro.com/contacto/`.

El sistema editorial establece Glitch → herramienta → diagnóstico para las invitaciones aplicables. Este anuncio no debe introducir una herramienta de AEO sin relación con el tema ni inventar un diagnóstico de Google. Usar el módulo/enlace existente de Glitch y mantener el contacto como acción del proyecto.

## Dirección de arte y archivos

**Concepto producido, versión 2:** trasladar el ambiente del anuncio aprobado a un fondo cinematográfico azul con símbolos tridimensionales de Gemini y Google Cloud. La portada concentra los dos protagonistas dentro del cuadrado central. Plate y hero dejan aire para los títulos de la UI. Todas las imágenes finales carecen de texto, firma y wordmarks.

Fuente aprobada inspeccionada: `ai-generations/2026-10-19_google-partner-freeze/export/efeonce-google-feed-4x5.png` (1080 × 1350). Export contiene las piezas aprobadas; r5-cine son intermedios, y las rondas con Gigi o esferas chocando fueron descartadas.

La noticia es institucional: no aplicar cabecera, manzana ni pregunta/respuesta de Marketing con Manzanitas; tampoco verde, bytes o numeración de Glitch. El anuncio previo no contiene insignia de nivel de Google Cloud y la adaptación tampoco. La identificación verbal del hito vive en la UI y en los metadatos.

| Archivo propuesto | Medidas / formato | Uso y decisión |
|---|---|---|
| `efeonce-google-cloud-partner-plate.png` | 2560 × 1440, PNG 16:9, sin texto | Base visual obligatoria del paquete, recompuesta desde las capas aprobadas. Sirve para derivar el hero y como imagen propia de tarjeta con punto focal cuando esa superficie utilice la entrada. No incrustar el título ni el lockup donde la tarjeta superpone su contenido |
| `efeonce-google-cloud-partner-portada-og.jpg` | 2400 × 1260, JPEG, <300 KB | Destacada + OG + imagen principal del schema + tarjeta grande de X + relacionados. Recomposición horizontal sin texto ni wordmarks; protagonistas completos en el cuadrado central |
| `efeonce-google-cloud-partner-apertura.webp` | 1600 × 900, WebP, objetivo ≤200 KB | Una imagen visible en el cuerpo, después de la introducción. Misma dirección de arte, encuadre 16:9 deliberado; no un duplicado de imagen en la cabecera |
| `efeonce-google-cloud-partner-slider.webp` | 2400 × 1200, WebP 2:1 | Preparar con el paquete del lanzamiento. Activar al fijar la novedad en el slider. Fondo sin lockup ni texto incrustado donde el slider pone su propio título |
| Master editable y manifiesto | Capas/SVG/JSON según compositor | Procedencia, logos oficiales, fuentes, contraste y derivadas. No se sube como imagen adicional del artículo |

**Paquete de imágenes corregido (instrucción del operador, 2026-10-25):** producir **cuatro archivos**: plate sin texto, portada destacada/OG, hero sin texto y apertura del cuerpo, además del master editable. La portada es obligatoria aunque la noticia no se destaque: identifica el artículo en relacionados, previews y cualquier superficie que consuma la destacada. Su inclusión no depende de la selección del slider o del riel.

**Mapa de tarjetas:** «Te puede interesar» usa la destacada con recorte cuadrado; la tarjeta del riel usa el plate con punto focal (`_eo_card_image` / `_eo_card_focus`) cuando corresponde. Se prepara el plate aunque las reglas actuales excluyan Novedades de ese riel. Archivo y búsqueda interna v3 hoy son textuales; esto no elimina la portada del paquete. No se crea otra imagen exclusiva de tarjeta si el plate ya cumple su encuadre.

**Antes de subir:** presentar juntas la portada horizontal completa, su recorte cuadrado, el hero y la simulación de tarjeta con título superpuesto a 1440 y 390. Preparar una variante no activa por sí mismo la superficie ni cambia la curaduría. La tabla y los Pasos comunican el alcance en HTML; no añadir una infografía por defecto.

**Texto dentro de la portada:** ninguno. Tampoco se incrustan lockup, firma ni fila de productos. Título del artículo y metadatos identifican la noticia.

**Zona segura:** sobre lienzo lógico 1200 × 630, identificación y mensaje esenciales dentro del cuadrado central x=285–915; al exportar 2×, x=570–1830. Reservar unos 15 px lógicos arriba y abajo para el recorte 2:1 de X. Probar el recorte cuadrado real; no basta con que el lockup quepa en horizontal.

**ALT de portada:** «Símbolos tridimensionales de Gemini y Google Cloud con luz multicolor sobre un fondo azul cinematográfico, sin texto.»

**ALT de apertura:** «Gemini y Google Cloud como esculturas luminosas en un entorno azul con profundidad cinematográfica, sin texto.»

**ALT del slider:** describir sólo el fondo final, sin atribuirle texto que no está incrustado. Si repite por completo el texto adyacente, revisar si su función resulta decorativa.

**Pie de imagen:** «Una nueva etapa para conectar soluciones de Google con los proyectos de nuestros clientes. Arte del anuncio de Efeonce.» Es una pieza ilustrativa; no representa una reunión o ceremonia con Google.

No se necesita foto de oficina, apretón de manos, certificado inventado o captura del portal con información privada. El retrato del autor ya existe y lo resuelve el perfil.

## Metadatos completos

| Superficie | Valor propuesto |
|---|---|
| SEO title | Efeonce es partner de Google Cloud \| Nube e IA |
| Meta description | Efeonce es partner de Google Cloud. Conoce cómo podemos acompañar a tu empresa en proyectos de nube, colaboración e inteligencia artificial con Gemini. |
| Focus phrase editorial | Efeonce partner de Google Cloud |
| Intención | Noticia de marca / validación de relación / consideración comercial |
| OG title | Efeonce es partner de Google Cloud |
| OG description | Una nueva etapa para conectar Google Cloud, Google Workspace y la inteligencia artificial con los proyectos de tu empresa. |
| OG type / site_name | `article` / `Efeonce` |
| OG locale | Conservar `es_LA`, que emite hoy el sitio |
| OG URL | Canonical propuesto del artículo |
| OG image | URL pública real de la destacada JPEG después de su subida autorizada; no inventar un attachment o URL |
| OG image width / height / type | `2400` / `1260` / `image/jpeg` |
| OG image ALT | ALT del adjunto final; comprobar exactamente una etiqueta |
| X card | `summary_large_image` |
| X title / description | Herencia de los valores sociales cuando funcione; override sólo si hace falta |
| X image | La misma portada vía OG; no se necesita un segundo archivo por red |
| X image ALT | El ALT real de la portada; comprobar salida del plugin |
| Robots al publicar | `index, follow, max-image-preview:large`, con las directivas globales existentes |
| Robots del montaje privado | Mantener protección y no indexabilidad de la fase privada |
| Canonical | Autorrefencial, único, HTTPS, con slash final |
| Schema de artículo | `NewsArticle`, conforme al uso institucional existente; un solo grafo de Yoast |
| Identidad schema | Autor Person de Julio; publisher Organization de Efeonce, reutilizando sus IDs |
| Otros nodos | WebPage, BreadcrumbList, ImageObject, WebSite y FAQ según contenido visible |
| headline / image / section | H1 exacto / destacada real / Novedades Efeonce |
| Fechas | `datePublished` y `dateModified` reales, con zona horaria; no fingir publicación el día de la confirmación |
| Sitemap | Inclusión de la URL final en el sitemap de posts al publicar; lastmod honesto |

Yoast es dueño de title/canonical/social/grafo. No añadir JSON-LD paralelo ni credenciales, precios, ratings o especializaciones inexistentes. El schema describe la publicación; no acredita por sí solo la relación comercial ni garantiza resultados de búsqueda.

## Distribución dentro del sitio

- Archivo de categoría Novedades Efeonce y archivo general: incorporación normal al publicar.
- Slider: **no fijar ni activar este anuncio por ahora**, instrucción explícita del operador. El hero se produce y entrega reservado para una decisión futura; una Novedad no entra automáticamente.
- Copy corto del slider: «Efeonce y Google» / «Oficialmente partners». CTA del formato: «Leer la novedad».
- Riel Para leer con calma: no corresponde por las reglas actuales de Novedades.
- Bloque de Partners: ya hay logo de Google Cloud en el footer; no requiere agregar un décimo logo. Si se incorpora una referencia comercial al artículo, hacerlo cuando la superficie de Partners tenga su estado y enlace revisados. No se encontró una página publicada en el path exacto `partners` durante esta revisión.
- Newsletter/canales sociales: sólo el plan de distribución que se acuerde. La vista OG sirve para compartir el enlace; no es una pieza nativa de LinkedIn ni una story.

## Enlaces y medición

- Enlaces externos de contexto: Google Cloud Partner Network, Google Cloud, Google Workspace y Gemini, con destino oficial exacto revisado al montar.
- Enlace interno de acción: contacto final, sin pasar por redirects o usar UTMs en enlaces internos.
- Lecturas relacionadas: elegir 1–2 artículos actuales de IA que ayuden a entender implementación; no añadir otros anuncios antiguos sólo por compartir la palabra partner. La selección automática de relacionados se verifica en la preview.
- Invitación a Glitch: reutilizar el destino/módulo vigente. No crear una nueva lista de correo ni un formulario independiente.
- Medición: page views y engagement del artículo, clic hacia contacto y conversiones observadas en el destino con la medición existente. Usar el page path y campañas externas; no publicar GTM ni crear eventos por inferencia. Diferenciar clic, envío, lead y oportunidad.

## Precisión comercial

- Partner es un hecho confirmado por el operador; no reabrir ese gate.
- La documentación registra Cloud y Workspace activos para reventa indirecta. El texto público no menciona al distribuidor, por instrucción del operador.
- Gemini Enterprise mantiene una nota de catálogo comercial pendiente en el registro. En esta noticia, hablar de proyectos con Gemini y de selección del producto pertinente; no convertirlo en disponibilidad irrestricta de cualquier licencia o SKU.
- No declarar nivel Select/Premier/Diamond, competencia de IA obtenida o equipo certificado sin su evidencia específica.
- El alcance comprobado de distribución es Chile. Una propuesta para otra geografía se evalúa por proyecto; no prometer cobertura de reventa para toda Latinoamérica.

## Qué falta para producir y publicar

1. **Producción terminada:** plate, portada, hero reservado y apertura, con dimensiones, pesos, ALT, hashes, contraste y revisión de recortes en `imagenes/manifest.json`. Falta el visto bueno visual del operador sobre esta nueva adaptación. No activar el banner principal.
2. Convertir el texto aprobado a GutenbergArticleSpec con la composición propuesta, enlaces oficiales, ALT definitivos y metadatos; ensamblar y validar en seco.
3. Con autorización de montaje, crear una sola entrada privada, con autor humano y manifest estable; subir sólo los medios necesarios por el carril gobernado.
4. Revisar preview real a 1440 y 390: H1 único, sumario, TOC y anclas, tablas, FAQ, contraste claro/oscuro, autor, imágenes y cero desbordamiento horizontal.
5. Con autorización de publicación, publicar y comprobar contenido anónimo, canonical, robots, schema único, OG/X, formatos/categoría, sitemap y caché. Verificar enlaces y CTA sin enviar una consulta comercial de prueba.
6. El control de publicación no prueba indexación ni adquisición comercial. Observar esos estados después con sus fuentes correspondientes.

## Fuentes y contratos utilizados

- `.codex/skills/efeonce-public-site-wordpress/SKILL.md` y referencias `agentic-blogpost-end-to-end`, `content-factory-gutenberg`, `blog-home-operation`, `taxonomy-permalink-migrations`.
- Skills SEO/AEO, línea gráfica Efeonce, publicidad creativa y AXIS para separar metadatos, uso de marca, producción y formatos.
- `docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`.
- `docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md`.
- `docs/public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md`.
- `docs/operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md`: contrato de superficies; su portada Manzanitas no se aplica como estética a esta noticia institucional.
- `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md`.
- `docs/operations/social/2026-10-19-google-partner-announcement-production-method.md` y LEEME del arte aprobado.
- Google, [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
- Google, [Brand Resource Center — Partnerships](https://about.google/brand-resource-center/guidance/partnerships/).

Las decisiones de imagen, bloque, copy y metadatos de este documento son propuestas. Las comprobaciones actuales están separadas en «Evidencia actual».
