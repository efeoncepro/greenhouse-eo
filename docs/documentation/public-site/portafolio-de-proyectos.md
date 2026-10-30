# Portafolio de proyectos — Sitio público

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.8
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-30 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)

## Qué es

El portafolio de [efeoncepro.com](https://efeoncepro.com/portafolio/) muestra proyectos de Efeonce con su contexto:
para quién se hizo, qué tenía que resolver, la idea, cómo se ejecutó y qué pasó, con las piezas en su formato real
(imagen o video, vertical, cuadrado o apaisado). Lo administra el plugin «EO Portfolio», que reemplaza al portafolio
del tema Ohio. En el sitio corre la versión **0.10.8** desde el 2026-10-30.

En el listado, **cada marca aparece una sola vez**. Si un cliente tiene varios proyectos (Sky Airline tiene dos
campañas), debajo de su nombre se listan sus campañas, cada una con lo que necesitaba, su cifra (si tiene una aprobada,
con su fuente) y sus piezas al abrirla. Un cliente puede tener cualquier cantidad de campañas: se ven tres y el resto
queda detrás de «Ver N campañas más». Cada proyecto sigue teniendo su propia página. (Versión 0.8.2.)

> Detalle técnico: [arquitectura §7](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md) ·
> `EOP_Render::by_brand` en `wp-content/plugins/eo-portfolio/includes/class-eop-render.php` del runtime.

## La página de un proyecto

### La ficha: lo que el cliente necesitaba

La ficha («FICHA DEL PROYECTO») se lee como una doble página editorial. A la izquierda va una frase grande con lo que
el cliente necesitaba: «Sky Airline necesitaba lanzar campañas comerciales en días sin descuidar la marca.». En
escritorio esa frase queda fija mientras se baja. A la derecha, los datos del proyecto se muestran como una ficha
técnica numerada, con líneas que se dibujan al aparecer; al pasar el mouse por una línea, se entibia y se marca. En el
teléfono las dos partes van una debajo de la otra. (Versión 0.10.2.)

Por eso lo que el cliente necesitaba se escribe para que siga a «necesitaba», sin punto final: una frase que empiece
con un sustantivo, con un verbo en infinitivo o con «que» («…necesitaba que su blog respondiera…»).

**La página habla en primera persona** («hicimos», «nuestro equipo»): nunca dice «Efeonce hizo…». Quién hizo el
proyecto lo dicen los datos que leen los buscadores, no el texto. Queda una excepción pendiente: 11 descripciones para
buscadores todavía dicen «Proyecto de Efeonce para…»; cambiarlas está por decidir.

> Detalle técnico: `EOP_Render::need_line` y `EOP_Render::has_record` en `class-eop-render.php`; autoría en el
> JSON-LD (`creator`).

### Varias campañas en un proyecto

Si un proyecto reúne **varias campañas** (Sky Airline tiene cinco destacadas), la página las muestra como un índice.
Cada campaña dice cuándo se hizo, en qué mercados y en una línea qué fue, y al abrirla muestra sus piezas. Se ven tres
y el resto queda detrás de «Ver N campañas más»; un filtro deja ver sólo las de un mercado. Si las piezas de una
campaña se hicieron con inteligencia artificial, esa campaña lo dice («Producido con IA»). (Versión 0.9.0.)

Cuando cada campaña tiene **su color** (como en Berel, donde cada una tiene la pintura que la protagoniza), su fila se
ve como en el diseño aprobado (versiones 0.10.7 y 0.10.8):

- un punto de pintura, el nombre de la campaña en grande y «Producido con IA», todo en una línea;
- debajo, en una línea, cuándo, en qué mercado y de qué se trató;
- al abrirla, las piezas aparecen sobre una mancha suave del color de la campaña que se abre desde la fila;
- al pasar el mouse, la fila entera se desliza junto (la pintura, el nombre y la etiqueta de IA), sin que el nombre se
  monte sobre la etiqueta.

Las campañas sin color (como las de Sky) se ven igual que antes.

> Detalle técnico: `EOP_Render::campaign_explorer`; `chapters[].period|markets|summary|madeWithAi|swatch` en
> `schema/portfolio-entry.v1.schema.json`.

### La voz del cliente y «Detrás del trabajo»

La voz del cliente se muestra como una escena: una banda oscura con el video del proyecto de fondo, la cita grande y,
destacada en negrita, la frase que el cliente dijo sobre el resultado; firma con su logo, si autorizó usarlo.
(Versión 0.9.1.)

Después, «Detrás del trabajo» cuenta quién lo hizo y desde cuándo, con qué servicios y en qué mercados:

- **Los servicios llevan a la página donde se vende cada uno** (agencia creativa, redes sociales, sitios web,
  performance, marketing de contenidos, SEO), con el título de esa página y una flecha. Si un proyecto no dice cuáles
  son esas páginas, sus servicios se muestran como texto. Todos los proyectos publicados las tienen desde el
  2026-10-30, y todo proyecto nuevo debe tenerlas. (Versión 0.10.1.)
- Si el proyecto es de un solo mercado, se muestra como «MERCADO» y su nombre.
- Si el trabajo está publicado en el sitio del cliente, aparece «EL TRABAJO PUBLICADO» con su enlace.
- Cuando viene después de una banda oscura (la voz del cliente o los resultados), deja aire arriba; los nombres de
  servicio largos se acomodan en dos líneas.

> Detalle técnico: `EOP_Render::behind` y `EOP_Render::service_pages` (busca páginas publicadas por su slug y omite
> las que no existen); campos `links.relatedServices` y `links.liveWork`.

## Líneas y servicios

Efeonce trabaja en **cinco líneas**: Brand, Engine, Growth, Voice y Revenue. Cada proyecto dice a qué línea pertenece
(eso le da su color de acento) y qué servicios lleva. Los servicios son **las categorías de servicio dentro de esas
líneas** (desde la versión 0.10.6):

| Línea | Categorías de servicio |
|---|---|
| Brand | Creative Services · Channel & Commerce |
| Engine | Search Visibility 360 · Web Experience 360 · Product Design 360 · Agent Systems & Platforms · Digital Automation & Integrations |
| Voice | Media & Distribution |
| Revenue | RevOps & CRM |
| Growth | Measurement & Analytics |

- **Los productos de Efeonce nunca son servicios ni líneas:** Creative Studio, Marketing Studio, Wave, Globe y Reach
  no aparecen como servicio de un proyecto. Por eso se retiraron del catálogo `wave`, `creative-studio`,
  `hubspot-as-a-service`, `salesforce` y `factory`.
- En el admin cada categoría se muestra con su línea («Creative Services · Brand»).
- Si se retira una categoría del catálogo, antes hay que cambiarla en los proyectos que la usan: un proyecto que nombra
  una categoría que ya no existe **deja de mostrarse** como página del portafolio.
- El menú principal del sitio (otra pieza del sitio) todavía muestra «ENGINE · WAVE»; queda por decidir.

> Detalle técnico: `schema/services.v1.json` del plugin; arquitectura
> [§7](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md).

## Cómo se guarda un proyecto

- Cada proyecto es una ficha con campos fijos. El sistema la revisa antes de guardarla: si falta algo obligatorio, no
  se guarda nada y dice qué falta.
- Cada cambio queda en el historial con quién lo hizo, cuándo y por qué. Se puede volver a una versión anterior sin
  borrar la historia.
- Si dos personas editan a la vez, la segunda recibe un aviso en vez de pisar el trabajo de la primera.

> Detalle técnico: `EOP_Store` y `EOP_Validator` en `includes/` del plugin.

## La aprobación del cliente

- Un proyecto **no se publica sin la aprobación del cliente**: dónde quedó registrada, la fecha y qué cubre.
- La aprobación decide qué se ve:

| La aprobación cubre | Se ve |
|---|---|
| `logo` | el logo del cliente |
| `pieces` | las piezas (imágenes y videos) y la imagen principal |
| `metrics` | las cifras de resultados |
| `testimonial` | el testimonio |
| `creators` | los videos de creadores (además de `pieces`) |

- Lo que la aprobación no cubre no aparece, aunque esté cargado.
- Un video de creador necesita dos permisos: el del cliente sobre la campaña y el del creador sobre su imagen. Por eso
  pide `creators` además de `pieces`, y cada video guarda dónde quedó la autorización del creador (eso nunca se
  publica).

> Detalle técnico: `EOP_Projection` (proyección pública según el alcance).

## Tipos de proyecto y de pieza

- Cada proyecto dice qué es: una campaña, un sitio web, una parte de un sitio, videos de creadores, un sistema, social
  media, producción audiovisual, producción con IA, marketing de contenidos, SEO y contenidos u otro.
  Eso decide cómo se arma su página.
- Cada pieza dice qué es: una pieza de campaña, un sitio en pantalla (escritorio, teléfono o tableta, a veces la
  página completa), una parte de una página (con su nombre y dónde está), un video de creador (con su cuenta y
  plataforma), una pieza en su lugar, un diagrama, una respuesta de IA, una publicación en redes, un corte de video,
  una foto de rodaje, una pieza hecha con IA o un banner.
- Los proyectos anteriores, sin tipo, siguen siendo campañas.
- Cinco tipos tienen una página hecha a su medida (ver la sección siguiente).
- Cada publicación registra quién la hizo y con qué aprobación. Ese registro no es público.

## Páginas a la medida de cada tipo

> **Estado:** los cuatro primeros tipos están en el sitio desde el 2026-10-30 (plugin 0.8.0) y el de marketing de
> contenidos desde la 0.10.0. El único proyecto real de un tipo a medida es Berel (marketing de contenidos); los demás
> publicados son de campaña o de sitio web.

| Tipo | Qué muestra la página | Qué necesita la ficha |
|---|---|---|
| **Social media** | Las publicaciones giran alrededor de la marca (cuando hay tres o más), cada una con el logo oficial de su canal. En «Canal por canal», unas pestañas muestran cada pieza en el marco de su red: Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Threads o Pinterest. La parrilla pasa como una cinta. | Cada publicación dice su canal; puede decir también su formato (feed, historia, reel, carrusel…), su texto y su fecha. |
| **Producción audiovisual** | La pieza principal abre a pantalla completa, como en el cine, con un botón para pausarla. Los cortes se ven en una línea de tiempo según lo que dura cada uno, el rodaje en un abanico de fotos y, si hay tres o más créditos, suben como al final de una película. Una ficha técnica reúne los datos de la producción (hasta diez, cada uno con su nombre y su valor). | Cada corte dice qué versión es («Pieza madre», «Corte de 15 s»…) y puede decir dónde se emitió. Cada foto o video de rodaje dice dónde quedó la autorización de quienes aparecen. |
| **Producción con IA** | Desde arriba, la etiqueta «Producido con IA». La escena aparece desde el ruido, el personaje gira en todos sus ángulos, se ven sus expresiones y poses, un deslizador compara el antes y el después, y la página explica qué hizo la IA, qué hizo el equipo y con qué modelos. | Qué modelos se usaron y para qué (imagen, video, voz, música…) y qué hizo el equipo; puede decir qué hizo la IA y si el personaje es ficticio. Cada pieza dice su etapa (referencia, ángulo, expresión, pose, fondo, escena o final). |
| **Marketing de contenidos** | Se arma por artículo (ver abajo): la portada de cada artículo en una mancha de pintura, el selector de colores, el artículo con su texto publicado y sus piezas por canal, los banners, la producción del mes y el recorrido de cada artículo. | Al menos un artículo publicado con su color y sus piezas. No necesita cifras: las de búsqueda se ven sólo con `metrics`. |
| **SEO y contenidos** | La cifra principal con su curva, los indicadores con su mini gráfica, la búsqueda en la que la marca subió de posición, la respuesta de una IA que la cita, las palabras clave antes y después, los contenidos publicados y los banners. | La fuente y el periodo de los datos, y al menos una cifra (cifra principal, indicadores, curva, búsqueda, palabras clave o respuesta de IA). La lista de contenidos sola no basta. |

### Marketing de contenidos, paso a paso

Así se ve la página, en el orden del diseño aprobado («Entrada de marketing de contenidos»):

1. **Portada.** Una mancha de pintura en movimiento contiene la portada de cada artículo, con su reel y su pin
   flotando alrededor. Debajo, el selector **«UN COLOR, UN ARTÍCULO»**: una muestra por artículo con el nombre y el
   código del color tal como el cliente los imprime en sus piezas. Al elegir otro color, la portada cambia y toda la
   página se tiñe suavemente del nuevo color. La pintura no gotea: el diseño aprobado no tiene goteo, y una versión
   con pintura derramada (0.10.3) se retiró.
2. **«Un artículo, todos sus canales».** La tarjeta del artículo tal como está publicado: su dirección, la portada,
   la etiqueta y el mes, el título, su primer párrafo copiado tal cual y «Leer el artículo en {sitio} ↗». Alrededor,
   hasta cuatro publicaciones en el marco de su canal (con el logo oficial del canal y su proporción real), unidas por
   líneas de pintura, y los banners del artículo. Sólo se reproducen los videos del artículo que se está mirando.
3. **«Una fábrica de contenidos, no piezas sueltas».** Una banda oscura con la producción del mes en contadores que
   suben (con su fuente) y **«EL RECORRIDO DE CADA ARTÍCULO»**, los pasos del trabajo sobre una línea de pintura.
4. El explorador de campañas, los resultados (si el cliente aprobó sus cifras), «Detrás del trabajo» y el cierre.

Este tipo no lleva la ficha ni el reto, idea y ejecución de los demás: su «Detrás del trabajo» abre con la misma
frase de lo que el cliente necesitaba. Sin JavaScript, el primer artículo queda arriba y todos se listan.

> Detalle técnico: `EOP_Kinds::blob`, `hero_extra` y el resto de `class-eop-kinds.php`; campos `articles`,
> `production`, `process`, `chapters[].swatch` y `links.liveWork` en el esquema; arquitectura
> [§7.3](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md).

Reglas que cuidan estas páginas:

- **Consentimiento:** una foto o video de rodaje no se guarda sin la referencia de la autorización de quienes
  aparecen, y esa referencia nunca se publica.
- **Declaración de IA:** cualquier proyecto con una pieza producida con IA lleva la etiqueta «Producido con IA» y la
  explicación de cómo se hizo. No depende de la aprobación del cliente y no se puede ocultar.
- **Cifras aprobadas:** las cifras de búsqueda se ven sólo si la aprobación cubre `metrics`; la lista de contenidos
  publicados se ve si cubre `pieces`. Un proyecto de SEO y contenidos no se puede publicar sin `metrics`, porque su
  página quedaría vacía.
- **Textos reales:** el primer párrafo de cada artículo se copia tal como está publicado, sin reescribirlo.
- Lo que una página a medida muestra en sus secciones no se repite abajo, en la galería de siempre.
- Los logos de los canales son los oficiales del sistema de marca (AXIS) y los íconos de la interfaz vienen de una
  colección de íconos existente; nada se dibuja a mano.
- El editor de WordPress no edita todavía los datos de social, audiovisual, IA y SEO: se cargan por la herramienta de
  línea de comandos, y si alguien guarda el proyecto desde el editor, esos datos se conservan. El de marketing de
  contenidos aparece en el editor como «Marketing de contenidos» y también conserva sus datos al guardar.

## Las cifras

- Toda cifra lleva su fuente. Un porcentaje con fuente es lo único que activa la órbita de medida en el diseño.

## Quién puede hacer qué

| Acción | Quién |
|---|---|
| Crear y editar proyectos | Administradores y quien tenga el permiso de gestionar el portafolio |
| Publicar y despublicar | Administradores y quien tenga el permiso de publicar el portafolio |
| Desplegar una versión nueva del plugin | Sólo con el OK del operador, cada vez |
| Ver proyectos publicados | Cualquier visitante, y otros sitios por la lectura pública en JSON |

## Estado actual

- Desde el 2026-10-30, `efeoncepro.com/portafolio/` es el portafolio nuevo, con **16 proyectos publicados** y una
  página por proyecto en `/portafolio/<proyecto>/`. Todos dicen sus páginas de servicio.
- **Sky Airline** abre la portada con su spot en la lente y muestra sus campañas, sus videos, sus cifras con fuente y
  el testimonio de su equipo. Es de la línea Brand, con el servicio Creative Services. Los videos sin voz se mueven
  solos mientras se ven y tienen un botón para pausarlos.
- **Berel, color por color** ([ver el caso](https://efeoncepro.com/portafolio/berel-pitaya-color-del-ano-2026/)) es el
  primer proyecto de marketing de contenidos, de la línea Engine, con Search Visibility 360 y Creative Services:
  - Lo que necesitaba: «Que su blog respondiera lo que la gente busca antes de pintar y que cada artículo llegara a
    todos sus canales». Trabajamos con Berel desde mayo de 2026.
  - Tres artículos publicados en berel.com, cada uno con su color: Día de Muertos (2-1810D, octubre 2026), Temporada
    2027 «Bien y de Buenas» (1-3404D, septiembre 2026) y Subtonos «Ciudadela» (4-1105D, agosto 2026). El tono que se
    ve en pantalla se tomó de las piezas: sirve para mostrarlas, no es el valor oficial de Berel.
  - Cuatro campañas en el explorador (Colores de Temporada 2027, Día de Muertos, Guías de color: subtonos y Pitaya,
    Color del Año 2026), todas «Producido con IA»: las imágenes se hicieron con IA y los textos y la intervención
    gráfica son del equipo creativo.
  - La producción de septiembre de 2026: 12 artículos, 90 banners y piezas sociales y 10 reels, según nuestro registro
    de entregables para Berel.
  - Los resultados, aprobados por el operador el 2026-10-30: 17,2 % más clics a los artículos del blog, +55,8 % de
    impresiones de los artículos y 180.696 impresiones en las funciones de IA de Google (+11 %), según Google Search
    Console de berel.com, agosto frente a julio de 2026.
  - Enlaza al trabajo publicado: «Inspiración, el blog de Berel». Efeonce entrega las piezas; otra agencia las
    publica en los canales de Berel.
- Las direcciones viejas (`/project/<proyecto>/`) y las categorías viejas de Ohio (`/portfolio-category/...`) llevan
  directo a la página nueva. Un proyecto retirado («Fiestas Patrias Perú») lleva a la página de Sky.
- Las cifras de la portada (piezas, campañas y marcas) son las de toda la agencia y se cambian sin tocar los proyectos.
- La página cierra con el pie normal del sitio (menú, oficina, newsletter, partners).
- Pendiente: apagar el portafolio de Ohio a partir del 2026-11-29.

> Detalle técnico: estado y versiones en la [arquitectura](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md);
> operación en el [manual de la CLI](../../manual-de-uso/public-site/operar-portafolio-por-cli.md).

## En el teléfono y la tablet

- Cada proyecto del índice es una tarjeta con sus piezas a la vista y un enlace directo «Ver el proyecto».
- Los filtros quedan fijos arriba al bajar por la lista; ocupan una sola línea y la industria se elige desde un botón.
- Las piezas de cada proyecto se pasan de lado, como un carrusel, cada una en su proporción real (un reel vertical se
  ve casi a pantalla completa), con contador y flechas. Sólo se mueve el video que está al frente.
- Cada pieza dice su formato («9:16», «4:5»…) y los videos tienen un botón redondo para pausar.
- En la ficha de un proyecto aparece abajo una barra con «Agenda tu diagnóstico» y el siguiente proyecto.

## Buscadores, redes y agentes de IA

- Cada página tiene su propio título y descripción, y al compartirla en redes muestra la pieza principal (si es un
  video, su imagen fija).
- Google recibe una sola descripción ordenada de cada página: que es un proyecto de Efeonce, para qué cliente, con qué
  piezas y videos, y dónde está dentro del portafolio.
- Cada ficha dice en una frase quién hizo el proyecto y para quién, para que un buscador con IA pueda citarlo.
- Una dirección mal escrita (con mayúsculas, sin la barra final o con `www`) lleva siempre a la misma página.
- Hay herramientas para que agentes de IA consulten el portafolio (listar proyectos y leer uno). Están apagadas hasta
  que se decida prenderlas.

> Detalle técnico: [arquitectura](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md) ·
> [manual](../../manual-de-uso/public-site/operar-portafolio.md) ·
> [manual de la CLI](../../manual-de-uso/public-site/operar-portafolio-por-cli.md) ·
> [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md)
