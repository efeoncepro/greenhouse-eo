# Portafolio de proyectos — Sitio público

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.5
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-30 por Claude
> **Documentacion tecnica:** [Portafolio del sitio público (EO Portfolio)](../../architecture/public-site/PUBLIC_SITE_PORTFOLIO_V1.md)

## Qué es

El portafolio de [efeoncepro.com](https://efeoncepro.com/portafolio/) muestra proyectos de Efeonce con su contexto:
para quién se hizo, qué tenía que resolver, la idea, cómo se ejecutó y qué pasó, con las piezas en su formato real
(imagen o video, vertical, cuadrado o apaisado). Lo administra el plugin «EO Portfolio», que reemplaza al portafolio
del tema Ohio.

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

- Cada proyecto dice qué es: una campaña, un sitio web, una parte de un sitio, videos de creadores, un sistema u otro.
  Eso decide cómo se arma su página.
- Cada pieza dice qué es: una pieza de campaña, un sitio en pantalla (escritorio, teléfono o tableta, a veces la
  página completa), una parte de una página (con su nombre y dónde está), un video de creador (con su cuenta y
  plataforma), una pieza en su lugar, un diagrama o una respuesta de IA.
- Los proyectos anteriores, sin tipo, siguen siendo campañas.
- Cuatro tipos tienen una página hecha a su medida:
  - **Social media:** las publicaciones giran alrededor de la marca y, canal por canal, cada pieza aparece en el marco
    de su red (Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Threads, Pinterest) con el logo oficial del canal.
  - **Producción audiovisual:** la pieza principal abre como en el cine, los cortes se ven en una línea de tiempo, el
    rodaje en un abanico de fotos y los créditos suben como al final de una película.
  - **Producción con IA:** la página dice desde arriba que se produjo con IA, muestra cómo nace la escena, el personaje
    en todos sus ángulos y expresiones, el antes y después, y qué hizo la IA y qué hizo el equipo.
  - **SEO y contenidos:** la cifra principal con su curva, los indicadores, la búsqueda en la que la marca subió, la
    respuesta de una IA que la cita, las palabras clave antes y después, los contenidos publicados y los banners.
- Las fotos de rodaje necesitan la autorización de quienes aparecen; esa autorización nunca se publica.
- Las cifras de búsqueda se ven sólo si el cliente aprobó mostrar cifras.
- Cada publicación registra quién la hizo y con qué aprobación. Ese registro no es público.

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
