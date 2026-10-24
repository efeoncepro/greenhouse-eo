# Archivo del blog — runtime V1

Estado: **En producción en efeoncepro.com desde el 2026-10-24 ~18:20 UTC** (`eo_blog_archive_enabled = 1`), para la
búsqueda (`/?s=`), los temas (`/category/…`), las etiquetas (`/tag/…`) y los autores (`/author/…`).

Dueño: Sitio público / WordPress (runtime `efeonce-public-site-runtime`)

Ejecución: [TASK-2055](../../tasks/in-progress/TASK-2055-blog-archive-v3-template.md) · Dirección visual aprobada:
[D «Órbita + Índice»](../../ui/visual-directions/TASK-2055-blog-archive-v3/README.md) (canvas «Portada Blog Efeonce» v75) ·
[Wireframe](../../ui/wireframes/TASK-2055-blog-archive-v3-template.md) · Contrato de superficies:
[PUBLIC_MISCELLANEOUS_SURFACES_V1](PUBLIC_MISCELLANEOUS_SURFACES_V1.md) (slices 4–6) · Hermano:
[BLOG_HOME_RUNTIME_V1](BLOG_HOME_RUNTIME_V1.md)

Funcionamiento: [Archivo del blog](../../documentation/public-site/archivo-del-blog.md) · Operación:
[manual](../../manual-de-uso/public-site/operar-archivo-del-blog.md)

## 1. Forma del sistema

```text
canvas D aprobado (12 tableros, congelados en scripts/public-website/blog-archive/source/)
   └─ bind-archive.cjs ─ desvíos (lista cerrada) ─► Archivo-<vista>.reference.dc.html (6)
                      └─ archive-body.template.html ─► Archivo.bound.dc.html (una plantilla, seis vistas)
         └─ build-archive.cjs ─► eo-blog-home/assets/generated/archive.{ast.json,css}, archive-base.css, fixtures
WordPress ── template_include (EOBH_Archive, flag eo_blog_archive_enabled)
               └─ templates/archive.php: get_header() › page-container › primary › page-content › main#main › #eoba
                    EOBH_Template::render(AST, documento)   ◄── filtro eoba_data ── EO_Archive_Adapter
                                                                 (efeonce-editorial-blocks: gather() impuro, map() puro)
```

- **Mismo patrón que la portada:** la plantilla **es** el canvas (AST renderizado por `EOBH_Template`), los datos llegan
  por un filtro (`eoba_data`) y el adaptador vive en el plugin del modelo de contenido. Sin JavaScript en el navegador.
- **Todo o nada:** si el adaptador no responde o lanza, `EOBH_Archive::template()` devuelve la plantilla de Ohio y el
  error queda en el log (`eo-content-model: archive adapter failed`). Nunca un archivo a medio pintar.

## 2. Vistas y documento

Seis vistas con un solo contrato de datos (`source/fixture.<vista>.json` es la forma de referencia):

| Vista | Cuándo | Cabecera | Lista |
|---|---|---|---|
| `tema` | `is_category()` con publicaciones | nombre en el color de su línea, descripción, «N publicaciones · la última», destacada montada | por año, fila sin tema |
| `etiqueta` | `is_tag()` | nombre, «Publicaciones marcadas con «x»…», ficha, destacada | por año, fila con tema |
| `autor` | `is_author()` de un autor editorial | foto (`get_avatar_url` 336, sin Gravatar; si falta, iniciales), nombre, cargo (1.ª frase de la bio), bio | por año |
| `busqueda` | `is_search()` con resultados | «término», buscador editable, «N resultados», «Mejor resultado» | por relevancia, fecha completa, término resaltado |
| `tema-vacio` | categoría sin publicaciones | copy del tema vacío + tema que lo contiene | «Mientras tanto»: último Glitch + guía + artículo |
| `busqueda-vacia` | búsqueda sin resultados o sin término | «Nada sobre «x», todavía.» / «¿Qué quieres resolver hoy?», preguntas frecuentes, Spark | «Mientras tanto, para empezar» |

Comunes: migas en español, filtro por formato (`?formato=articulo|guia|caso|novedad|glitch|grabacion`; los tres
`glitch-*` cuentan juntos; un solo formato → sin filtro), paginación de 10 (la primera página no repite la destacada),
«Otros temas del blog» con las categorías y su cantidad, línea de color por post con `EO_CM_Util::line_of()` +
`update_meta_cache`. Destacada ancha (16:9) si la imagen mide ≥ 1,4 de proporción; si no, 4:3. El H1 se achica con
`--ah-fit` cuando la palabra más larga no cabe (`EO_Archive_Adapter::fit`, 11 letras a 184 px, 16 a 132 px).

## 3. Reglas de WordPress (EOBH_Archive)

- **Flag `eo_blog_archive_enabled`:** `0` (por defecto: Ohio), `preview` (sólo `?eoba_preview=<eo_blog_archive_preview_token>`,
  `noindex`), `1` (todos). Las URL con query string no pasan por el caché de Kinsta (`x-kinsta-cache: BYPASS`): el preview
  nunca queda cacheado.
- **Búsqueda:** `pre_get_posts` sólo en la consulta principal del front (no admin, AJAX ni REST): `post_type=post`,
  `post_status=publish`, 10 por página; término vacío → `post__in=[0]` (estado vacío, nunca el inventario).
- **Autor no editorial → 404 real** (`template_redirect`, `set_404`, `status_header(404)`): cuentas de servicio
  (`greenhouse-integration`) y usuarios con 0 entradas publicadas. `author_link` los manda a `/blog/` y se excluyen del
  sitemap de autores de Yoast.
- **SEO (filtros de Yoast, sólo donde rinde la plantilla):** tema indexable sólo con descripción y ≥ 4 publicaciones
  (contando subcategorías); etiqueta, búsqueda, tema vacío y cualquier `?formato=` → `noindex, follow`; autor editorial
  conserva Yoast (`ProfilePage` + `Person`). Título «Nombre - Blog de Efeonce» (página N: «Nombre · Página N - …»;
  búsqueda «Búsqueda: «x» - …»). Meta description del tema = su descripción.
- **Marco de Ohio:** el body pierde `with-switcher`, `with-mobile-switcher`, `with-headline`, `with-breadcrumbs`,
  `custom-cursor` y `with-fixed-search` y gana `eoba-page`; `eoba-host.css` oculta switcher, riel social, cursor, buscador
  flotante y el **`header-cap` de 108 px** que Ohio imprime en archivos (medido en vivo el 2026-10-24: franja blanca sobre
  la cabecera). No se llama `get_sidebar()`: la barra lateral de demo («Hire us!», «Staff Picks»…) no existe aquí.

## 4. Desvíos del canvas (lista cerrada)

1. Header y footer canónicos del sitio. 2. Datos reales. 3. Sin JavaScript: el filtro y la paginación son enlaces
(`aria-current`), la búsqueda es GET. 4. Indicador del segmentado posicionado por el servidor. 5. Ids `eoba-` y
`main#main` abierto por la plantilla de página. 6. Sin las reglas `.mob` (iguales a la media query). 7. `fetchpriority`
en la destacada, `lazy` en la tarjeta de Glitch. 8. Tipografía fluida: el H1 sigue la ventana hasta el tamaño del canvas
(`min(184px,12.8vw)`, `min(76px,19.5vw)` en teléfono) y un bloque 768–1099 a una columna. 9. Iniciales cuando el autor no
tiene foto. Cualquier otra diferencia es un defecto del gate.

## 5. Gates

| Gate | Herramienta | Resultado del corte (2026-10-24) |
|---|---|---|
| Plantilla = canvas | `test-bound-equivalence.cjs` | 6/6 vistas |
| PHP = navegador | `test-php-parity.cjs` | 36/36 casos byte a byte |
| Píxeles | `fidelity/capture.cjs` + `blog-v3/fidelity/compare.cjs` | 44/44 secciones ≤ 1 % en el shell real (máx. 0,518 %, sólo el header) |
| Desborde y H1 | `fidelity/overflow.cjs` | 0 px, un H1, ninguna palabra cortada, 6 vistas × 8 anchos (local, preview y vivo) |
| Accesibilidad | `fidelity/a11y.cjs` | axe WCAG 2.2 AA 0 en 6 vistas × 3 anchos (local, preview y vivo) |
| Runtime | `php tests/eo-blog-archive.test.php` | 59 checks; `eo-content-model` 184 y `eo-blog-home` 27 siguen verdes |

Preview local: `node scripts/public-website/blog-archive/preview/serve.cjs` (o `blog-archive-preview` en
`.claude/launch.json`) → `http://127.0.0.1:8845/<vista>/`. **Limitación medida:** usa el shell de `/blog/`, que no tiene el
`header-cap` de los archivos; el gate contra producción (preview con token) es el que lo detecta.

## 6. Matriz en vivo (2026-10-24, tras el encendido)

| URL | Estado | robots | canonical |
|---|---|---|---|
| `/category/hubspot/`, `/category/glitch/` | 200 | index, follow | propio |
| `/category/hubspot/page/2/` | 200 | index, follow | `/page/2/` |
| `/category/hubspot/page/99/` | 404 | noindex | — |
| `/category/hubspot/?formato=guia` | 200 | noindex, follow | — |
| `/category/marketing-digital/social/` (vacía) | 200 | noindex, follow | — |
| `/tag/inbound/` | 200 | noindex, follow | — |
| `/author/jreysgo/` | 200 | index, follow (ProfilePage + Person) | propio |
| `/author/greenhouse-integration/`, `/author/daniela/` | 404 | noindex | — |
| `/?s=Inbound`, `/?s=metaverso`, `/?s=` | 200 | noindex, follow (CollectionPage + SearchResultsPage) | — |

## 7. Operación y rollback

CLI `pnpm public-website:blog-home` (mismo carril que la portada):

- `archive <0|preview|1> [--apply]` — el flag; crea el token de preview si falta; purga todo el caché al pasar a `1` o
  salir de `1`.
- `topic-descriptions <archivo.json> [--apply]` — descripciones de categoría con `before`, lectura de vuelta y purga.
  Las seis aprobadas están en `scripts/public-website/blog-archive/ops/descripciones-temas.json`.
- `deploy home|content-model [--apply]` — los dos plugins (el allowlist de `eo-blog-home` admite la plantilla y sus assets).

| Qué | Cómo |
|---|---|
| Plantilla nueva | `archive 0 --apply` (vuelve Ohio para todos, con purga) |
| Descripciones | `topic-descriptions` con el `before` del ledger (estaban vacías) |
| Código de `eo-blog-home` | restaurar `/tmp/eo-blog-home-before-20261024-182009.tar` en Kinsta |
| Adaptador | restaurar el `.tar` del deploy de `content-model` |

## 8. Pendientes

- `/wp-json/wp/v2/users` y `?author=N` siguen exponiendo usuarios (follow-up de seguridad).
- `/wp-json/wp/v2/search` sigue mezclando tipos (otra superficie).
- El 404 del sitio (slices 2–3 del contrato) sigue en Ohio.
- La órbita de la portada dice «lecturas»; el archivo dice «publicaciones» (alinear es decisión aparte).
- El banner de cookies tapa la tarjeta destacada en la primera visita a 1440 (comportamiento del sitio, no del archivo).

## Referencias de código

- Plantilla y reglas: `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/{includes/class-eobh-archive.php,templates/archive.php,assets/css/eoba-host.css,assets/generated/archive*}`.
- Datos: `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-archive-adapter.php`.
- Pipeline y gates: `greenhouse-eo/scripts/public-website/blog-archive/`. CLI: `greenhouse-eo/scripts/public-website/blog-home/`.
- Pruebas: `efeonce-public-site-runtime/tests/eo-blog-archive.test.php`.
