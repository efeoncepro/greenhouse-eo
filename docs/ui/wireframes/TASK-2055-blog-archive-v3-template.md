# TASK-2055 — Archivo del blog v3: wireframe

> Fuente visual aprobada: dirección **D · Órbita + Índice** del canvas «Portada Blog Efeonce»
> (`https://claude.ai/artifact/SmmJZC39UTJ9m6PD5x7tui`, página «Archivo del blog · D · Órbita + Índice», versión 75),
> aprobada por el operador el 2026-10-24 («Bien, me parece todo»). Copia congelada, generador y capturas:
> `docs/ui/visual-directions/TASK-2055-blog-archive-v3/` (`direcciones-2026-10-24.tar.gz`, `capturas/`).
> Este wireframe describe regiones, estados y datos; los valores visuales salen del canvas, nunca de aquí.

## Superficies

Una plantilla, seis vistas. Todas con el header y el footer canónicos del sitio (menú AXIS de TASK-2042 y pie de
`ohio-child`), sin barra lateral, sin interruptor Dark/Light, sin el riel «Follow Us» y sin el recuadro de demo de Ohio.

| Vista | Ruta | Tablero 1440 / 390 |
|---|---|---|
| Tema | `/category/<slug>/`, `/category/<padre>/<slug>/`, `…/page/N/` | `Archivo-D-tema-*` |
| Etiqueta | `/tag/<slug>/` | `Archivo-D-etiqueta-*` |
| Autor | `/author/<slug>/` (sólo autores editoriales) | `Archivo-D-autor-*` |
| Búsqueda | `/?s=<término>`, `/page/N/?s=` | `Archivo-D-busqueda-*` |
| Tema vacío | categoría con 0 publicaciones | `Archivo-D-tema-vacio-*` |
| Búsqueda sin resultados / vacía | `/?s=<término sin coincidencias>`, `/?s=` | `Archivo-D-busqueda-vacia-*` |

## Regiones (de arriba abajo)

```text
┌ header canónico del sitio (fijo, heredado) ───────────────────────────────────────────┐
├ A · Cabecera «portada de sección» (navy #001a33) ──────────────────────────────────────┤
│  migas: Inicio / Blog / Temas / HubSpot   (nav aria-label="Migas de pan", último aria-current)
│  ┌ columna 7fr ─────────────────────────────┐ ┌ columna 5fr ─────────────────────────┐
│  │ rótulo con barra del color de la línea    │ │ tarjeta destacada blanca, montada    │
│  │ H1 (único): nombre del tema / término /   │ │ sobre el borde navy→blanco:          │
│  │   nombre del autor                        │ │ imagen 16:9 (o 4:3 si la portada es  │
│  │ descripción del tema / bio del autor /    │ │ cuadrada) · rótulo «Lo más reciente» │
│  │   buscador editable (búsqueda)            │ │ / «Lo último de <nombre>» / «Mejor   │
│  │ ficha: N publicaciones | fecha, la última │ │ resultado» · formato · tema · título │
│  │   (búsqueda: N resultados)                │ │ · minutos · fecha · «Leer →»         │
│  └───────────────────────────────────────────┘ └──────────────────────────────────────┘
├ B · Barra de formato (blanco) — sólo bajo la columna 7fr ──────────────────────────────┤
│  «FORMATO»  [Todo N][Artículos N][Guías N][Casos N][Novedades N][Glitch N]  (segmentado de la portada)
│  móvil: fila de chips deslizable
├ C · Lista (blanco) ────────────────────────────────────────────────────────────────────┤
│  por año: año gigante fijo a la izquierda (4fr) + «N publicaciones en <tema>» │ filas (8fr)
│  fila: fecha corta │ título (Bricolage 30) │ [tema ·] formato · N min  →
│  búsqueda: sin grupos, por relevancia, fecha completa, término resaltado
│  pie: «Mostrando 1–10 de N publicaciones» · paginador 1 2 … Siguiente →
├ D · «Otros temas del blog.» (navy) ────────────────────────────────────────────────────┤
│  rótulo, H2, «Todo el archivo 44 →» y grilla de temas: nombre (color de su línea al hover),
│  «N publicaciones», barra del color de la línea
└ footer canónico del sitio (heredado) ──────────────────────────────────────────────────┘
```

Estados vacíos reemplazan B y C por **«Mientras tanto»** (blanco): a la izquierda el último Glitch (tarjeta con la imagen
arriba), a la derecha una guía y un artículo (tarjetas tipográficas navy y papel). La búsqueda vacía muestra además, en la
cabecera, el buscador, cuatro preguntas frecuentes como chips (las de «Pregúntale al blog») y el Spark de investigación.
El tema vacío muestra el tema que lo contiene con su cantidad.

## Datos por vista

| Dato | Tema | Etiqueta | Autor | Búsqueda |
|---|---|---|---|---|
| H1 | nombre de la categoría (color `accent` de su línea) | nombre de la etiqueta | nombre visible del usuario | «término» |
| Texto bajo el H1 | descripción de la categoría (WordPress) | «Publicaciones marcadas con «x», de distintos temas.» | cargo + bio del perfil | buscador con el término |
| Ficha | publicaciones del tema (con descendientes) · fecha de la última | igual | igual | resultados |
| Destacada | la más reciente | la más reciente | la última del autor | el primer resultado por relevancia |
| Filtro | conteos por `eo_format` dentro del conjunto; los tres `glitch-*` suman «Glitch»; formatos con 0 no se muestran | igual | igual | igual |
| Fila: tema | no (implícito) | sí | sí (o logo de Glitch) | sí |
| Agrupación | por año | por año | por año | ninguna (relevancia) |

Color de cada fila y tarjeta: línea del post con `EO_CM_Util::line_of($id, $topic)` en el lado impuro (con
`update_meta_cache('post', $ids)`) y `palette_for()` en el puro; el tema usa la paleta de `TOPICS`. Minutos:
`EO_CM_Util::reading_minutes` (200 palabras por minuto). Foto del autor: `EO_Home_Readers::author_photo()` (descarta
Gravatar; sin foto, iniciales). Imagen cuadrada o ancha: dimensiones del adjunto (umbral de proporción ≥ 1,4 = ancha).

## Copy (es-CL, tuteo; nunca copy de búsqueda en un archivo)

| Id | Texto |
|---|---|
| `crumb.home` / `crumb.blog` / `crumb.topics` / `crumb.tags` / `crumb.authors` / `crumb.search` | Inicio / Blog / Temas / Etiquetas / Autores / Búsqueda |
| `eyebrow.topic` / `.tag` / `.author` / `.search` | Tema / Etiqueta / Autor / Búsqueda en el blog |
| `meta.posts` / `meta.latest` / `meta.results` | publicaciones (publicación) / la última / resultados (resultado) |
| `featured.latest` / `.author` / `.best` | Lo más reciente / Lo último de {nombre} / Mejor resultado |
| `filter.label` / `filter.all` | Formato / Todo |
| `list.year` | {N} publicaciones en {tema} · con esta etiqueta · de {nombre} |
| `pager.showing` / `pager.next` / `pager.prev` | Mostrando {a}–{b} de {N} publicaciones / Siguiente / Anterior |
| `topics.eyebrow` / `topics.title` | Explora por tema / Otros temas del blog. (autor: «Escribe sobre» / «Los temas de {nombre}.»; búsqueda: «¿No era esto? Busca por tema.») |
| `topics.all` | Todo el archivo |
| `empty.topic` | Todavía no hay publicaciones en este tema. Mientras tanto, {padre} reúne lo más cercano. |
| `empty.topic.parent` | El tema que lo contiene |
| `empty.search.title` | Nada sobre «{término}», todavía. |
| `empty.search.body` | Prueba con otra palabra o con una de las preguntas que más nos hacen. |
| `empty.search.blank` (sin término) | ¿Qué quieres resolver hoy? (mismo H1 de «Pregúntale al blog») |
| `meanwhile.topic` / `.search` | Mientras tanto / Mientras tanto, para empezar |
| `card.minutes` / `card.read` | {N} min de lectura / Leer |

## Accesibilidad

- Un solo H1 por vista; `<main id="main">` coincide con el enlace de salto del header.
- Migas en `<nav aria-label="Migas de pan">` con `aria-current="page"`.
- Filtro: enlaces `<a href="?formato=…" aria-current="page">` (no `aria-pressed` en enlaces); el indicador del segmentado
  se posiciona en servidor.
- Buscador con `<label>` propio (no el placeholder), `name="s"`, envío GET.
- Ids con prefijo `eoba-` (el header del sitio puede usar `q`).
- Contraste 4,5:1 en todo texto; foco visible de la portada (`#36c8bf` sobre oscuro, `#023c70` sobre claro).
- Movimiento reducido: sin desplazamientos al hover ni zoom de imagen.

## Responsive

Tableros a 1440 y 390; entre 768 y 1099 y bajo 390 el diseño es fluido (sin tablero propio) y se gobierna con el gate
de desborde: `scrollWidth === clientWidth` de 320 a 1920. En móvil la tarjeta destacada va después del texto (sin montarse),
la ficha queda en dos celdas, el filtro es una fila de chips deslizable y el año pierde el `sticky`.
