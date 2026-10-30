# Portafolio de proyectos — Sitio público

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.6
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-30 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)

## Qué es

El portafolio de [efeoncepro.com](https://efeoncepro.com/portafolio/) muestra proyectos de Efeonce con su contexto:
para quién se hizo, qué tenía que resolver, la idea, cómo se ejecutó y qué pasó, con las piezas en su formato real
(imagen o video, vertical, cuadrado o apaisado). Lo administra el plugin «EO Portfolio», que reemplaza al portafolio
del tema Ohio.

En el listado, **cada marca aparece una sola vez**. Si un cliente tiene varios proyectos (Sky Airline tiene dos
campañas), debajo de su nombre se listan sus campañas, cada una con lo que necesitaba, su cifra (si tiene una aprobada,
con su fuente) y sus piezas al abrirla. Un cliente puede tener cualquier cantidad de campañas: se ven tres y el resto
queda detrás de «Ver N campañas más». Cada proyecto sigue teniendo su propia página. (Versión 0.8.2, en el sitio
desde el 2026-10-30.)

Dentro de un proyecto pasa lo mismo: si reúne **varias campañas** (Sky Airline tiene cinco destacadas), la página las
muestra como un índice. Cada campaña dice cuándo se hizo, en qué mercados y en una línea qué fue, y al abrirla muestra
sus piezas. Se ven tres y el resto queda detrás de «Ver N campañas más»; un filtro deja ver sólo las de un mercado. Si
las piezas de una campaña se hicieron con inteligencia artificial, esa campaña lo dice («Producido con IA»).
(Versión 0.9.0, en el sitio desde el 2026-10-30.)

La voz del cliente se muestra como una escena: una banda oscura con el video del proyecto de fondo, la cita grande y,
destacada en negrita, la frase que el cliente dijo sobre el resultado; firma con su logo, si autorizó usarlo. Después,
«Detrás del trabajo» cuenta quién lo hizo y desde cuándo, con qué servicios y en qué mercados. (Versión 0.9.1.)

## Cómo se guarda un proyecto

- Cada proyecto es una ficha con campos fijos. El sistema la revisa antes de guardarla: si falta algo obligatorio, no
  se guarda nada y dice qué falta.
- Cada cambio queda en el historial con quién lo hizo, cuándo y por qué. Se puede volver a una versión anterior sin
  borrar la historia.
- Si dos personas editan a la vez, la segunda recibe un aviso en vez de pisar el trabajo de la primera.

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

## Tipos de proyecto y de pieza

- Cada proyecto dice qué es: una campaña, un sitio web, una parte de un sitio, videos de creadores, un sistema, social
  media, producción audiovisual, producción con IA, SEO y contenidos u otro.
  Eso decide cómo se arma su página.
- Cada pieza dice qué es: una pieza de campaña, un sitio en pantalla (escritorio, teléfono o tableta, a veces la
  página completa), una parte de una página (con su nombre y dónde está), un video de creador (con su cuenta y
  plataforma), una pieza en su lugar, un diagrama, una respuesta de IA, una publicación en redes, un corte de video,
  una foto de rodaje, una pieza hecha con IA o un banner.
- Los proyectos anteriores, sin tipo, siguen siendo campañas.
- Cuatro tipos más tienen una página hecha a su medida (ver la sección siguiente).

- Cada publicación registra quién la hizo y con qué aprobación. Ese registro no es público.

## Páginas a la medida de cada tipo

> **Estado:** en el sitio desde el 2026-10-30 (plugin 0.8.0). Todavía no hay proyectos reales cargados de estos
> tipos: los 17 publicados son de campaña o de sitio web.

| Tipo | Qué muestra la página | Qué necesita la ficha |
|---|---|---|
| **Social media** | Las publicaciones giran alrededor de la marca (cuando hay tres o más), cada una con el logo oficial de su canal. En «Canal por canal», unas pestañas muestran cada pieza en el marco de su red: Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Threads o Pinterest. La parrilla pasa como una cinta. | Cada publicación dice su canal; puede decir también su formato (feed, historia, reel, carrusel…), su texto y su fecha. |
| **Producción audiovisual** | La pieza principal abre a pantalla completa, como en el cine, con un botón para pausarla. Los cortes se ven en una línea de tiempo según lo que dura cada uno, el rodaje en un abanico de fotos y, si hay tres o más créditos, suben como al final de una película. Una ficha técnica reúne los datos de la producción (hasta diez, cada uno con su nombre y su valor). | Cada corte dice qué versión es («Pieza madre», «Corte de 15 s»…) y puede decir dónde se emitió. Cada foto o video de rodaje dice dónde quedó la autorización de quienes aparecen. |
| **Producción con IA** | Desde arriba, la etiqueta «Producido con IA». La escena aparece desde el ruido, el personaje gira en todos sus ángulos, se ven sus expresiones y poses, un deslizador compara el antes y el después, y la página explica qué hizo la IA, qué hizo el equipo y con qué modelos. | Qué modelos se usaron y para qué (imagen, video, voz, música…) y qué hizo el equipo; puede decir qué hizo la IA y si el personaje es ficticio. Cada pieza dice su etapa (referencia, ángulo, expresión, pose, fondo, escena o final). |
| **SEO y contenidos** | La cifra principal con su curva, los indicadores con su mini gráfica, la búsqueda en la que la marca subió de posición, la respuesta de una IA que la cita, las palabras clave antes y después, los contenidos publicados y los banners. | La fuente y el periodo de los datos, y al menos una cifra (cifra principal, indicadores, curva, búsqueda, palabras clave o respuesta de IA). La lista de contenidos sola no basta. |

Reglas que cuidan estas páginas:

- **Consentimiento:** una foto o video de rodaje no se guarda sin la referencia de la autorización de quienes
  aparecen, y esa referencia nunca se publica.
- **Declaración de IA:** cualquier proyecto con una pieza producida con IA lleva la etiqueta «Producido con IA» y la
  explicación de cómo se hizo. No depende de la aprobación del cliente y no se puede ocultar.
- **Cifras aprobadas:** las cifras de búsqueda se ven sólo si la aprobación cubre `metrics`; la lista de contenidos
  publicados se ve si cubre `pieces`. Un proyecto de SEO y contenidos no se puede publicar sin `metrics`, porque su
  página quedaría vacía.
- Lo que una página a medida muestra en sus secciones no se repite abajo, en la galería de siempre.
- Los logos de los canales son los oficiales del sistema de marca (AXIS) y los íconos de la interfaz vienen de una
  colección de íconos existente; nada se dibuja a mano.
- El editor de WordPress todavía no tiene campos para estos datos: se cargan por la herramienta de línea de comandos.
  Si alguien guarda el proyecto desde el editor, esos datos se conservan.

## Las cifras

- Toda cifra lleva su fuente. Un porcentaje con fuente es lo único que activa la órbita de medida en el diseño.

## Quién puede hacer qué

| Acción | Quién |
|---|---|
| Crear y editar proyectos | Administradores y quien tenga el permiso de gestionar el portafolio |
| Publicar y despublicar | Administradores y quien tenga el permiso de publicar el portafolio |
| Ver proyectos publicados | Cualquier visitante, y otros sitios por la lectura pública en JSON |

## Estado actual

- Desde el 2026-10-30, `efeoncepro.com/portafolio/` es el portafolio nuevo: 17 proyectos (los 15 que ya estaban en el
  sitio más los casos de Sky Airline y Berel) y una página por proyecto en `/portafolio/<proyecto>/`.
- El caso de Sky abre la portada con su spot en la lente y muestra sus videos, sus cifras con fuente y el testimonio de
  su equipo. Los videos sin voz se mueven solos mientras se ven y tienen un botón para pausarlos.
- Las direcciones viejas (`/project/<proyecto>/`) llevan directo a la página nueva de cada proyecto.
- Las cifras de la portada (piezas, campañas y marcas) son las de toda la agencia y se cambian sin tocar los proyectos.
- Las categorías viejas del portafolio de Ohio (`/portfolio-category/...`) también llevan a la portada nueva.
- La página cierra con el pie normal del sitio (menú, oficina, newsletter, partners).

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
> [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md)
