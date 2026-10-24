# TASK-2055 — Archivo del blog v3: búsqueda, temas, etiquetas y autores

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2055-blog-archive-v3-template.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `En producción desde 2026-10-24 ~18:20 UTC (eo_blog_archive_enabled = 1; runtime 2c2cfbb; descripciones de 6 temas cargadas). Verificado en vivo: matriz HTTP/robots/canonical/schema, desborde 0 y un H1 de 320 a 1920, axe 0, /blog/ y post con FAQ sin regresión. Docs y skill actualizadas. Falta para cerrar: gates de repo pnpm test/pnpm build (cambios de greenhouse-eo son scripts y docs) y decidir el push del runtime (origin/main divergido antes de esta task).`
- Rank: `TBD`
- Domain: `public-site|content|ui`
- Blocked by: `none`
- Branch: `Runtime efeonce-public-site-runtime main (checkout /Users/jreye/Documents/efeonce-public-site-runtime, con WIP ajeno: commits sólo de los archivos propios); scripts y docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza la plantilla de archivo de Ohio en la búsqueda (`/?s=`), las categorías, las etiquetas y los autores del sitio
por la plantilla «Archivo del blog» aprobada en el canvas de la portada v3: cabecera navy como portada de sección con la
publicación destacada montada sobre el borde, filtro por formato, filas por año, paginación, «Otros temas» y estados
vacíos propios. En el mismo release sale la contención: sin el recuadro de demo «Hire us! We are WordPress specialists»,
sin la barra lateral de demo, en español, sin desborde a 390, sin categorías vacías indexables y sin archivo público del
usuario de integración «Greenhouse».

## Why This Task Exists

Desde el 2026-10-24 la portada v3 manda su buscador a `?s=` y sus temas a los archivos de categoría, y esas vistas siguen
siendo la plantilla de demo de Ohio en inglés: el recuadro «Looking For Customization? Hire us!» hace parecer que Efeonce
vende desarrollo WordPress (P0 de marca), la búsqueda vacía lista páginas internas y de borrador, una categoría con 0
publicaciones es indexable y dos archivos se desbordan a 390. La auditoría y su propuesta están en
`docs/audits/public-site/2026-10-24-blog-search-archive-views.md`; el contrato `PUBLIC_MISCELLANEOUS_SURFACES_V1` define
el destino (slices 4–6) y ninguna task era dueña. El operador decidió que la contención sale junto con el rediseño.

## Goal

- Las cuatro clases de vista se ven como el canvas D aprobado (≤ 1 % de píxeles distintos por sección a 1440 y 390),
  con datos reales y header/footer canónicos.
- Cada vista cumple su matriz HTTP/robots/canonical/schema (ver Detailed Spec) y la búsqueda sólo devuelve publicaciones.
- Cero texto de demo o en inglés y cero desborde de 320 a 1920 en las vistas de la plantilla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md` (invariantes HTTP/SEO, búsqueda, medición; slices 4–6)
- `docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md` (plugin `eo-blog-home`, AST del canvas, reset del host, gates)
- `docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md` (formatos `eo_format`, readers)
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (header AXIS en todo el sitio)

Reglas obligatorias:

- El canvas congelado de `docs/ui/visual-directions/TASK-2055-blog-archive-v3/` es la fuente visual; sólo se permiten los
  desvíos de la lista cerrada (Detailed Spec).
- Child-theme-first nunca significa tocar Ohio padre; la plantilla vive en un plugin con `template_include` y un flag,
  para que el rollback sea apagar el flag.
- PHP es dueño del status, robots, canonical y schema; nunca reglas en bloque sobre todos los archivos.
- Toda escritura en vivo: `pnpm public-website:ssh-check`, línea base viva, paquete acotado, snapshot, purga y lectura a
  1440/390, con visto bueno explícito del operador. Nunca deploy completo del runtime (`fullRepoDeploySafe=false`).

## Normative Docs

- `docs/audits/public-site/2026-10-24-blog-search-archive-views.md` (hallazgos y propuesta)
- `docs/ui/visual-directions/TASK-2055-blog-archive-v3/README.md` (dirección D y decisiones del operador)
- `docs/ui/wireframes/TASK-2055-blog-archive-v3-template.md`
- `.claude/skills/efeonce-public-site-wordpress/references/miscellaneous-surfaces.md`
- `.claude/skills/efeonce-public-site-wordpress/references/blog-home-operation.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md` (líneas por tema; la órbita nunca como adorno)
- `.claude/skills/seo-aeo/SKILL.md` (archivos, Person, robots)

## Dependencies & Impact

### Depends on

- TASK-2050/TASK-2051 — `eo-blog-home` (render del AST, `HOST_RESET`) y `efeonce-editorial-blocks` 0.4.3 en vivo
  (`EO_Home_Readers::index/archive/author_photo/glitch`, `EO_CM_Util::LINES/line_of/palette_for`, `eo_format`).
- Sesión «Análisis de Analytics y Search Console»: despliega `efeonce-editorial-blocks` y tiene la regla global de
  `a.axis-mention`; coordinar el orden antes de tocar ese plugin.
- Sesión «Blog v3 portada: correos y eventos»: comparte `eo-blog-home` y el carril de despliegue.

### Blocks / Impacts

- TASK-1802 — su alcance de «búsqueda, filtros y colecciones» queda cubierto en la parte de archivos y búsqueda (Delta).
- TASK-2051 — la portada pasa a enlazar a archivos con la misma familia visual; comparte plugin y gates (Delta).
- `PUBLIC_MISCELLANEOUS_SURFACES_V1` — slices 4–6 quedan con dueño; el 404 (slices 2–3) sigue sin dueño.

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/includes/class-eobh-archive.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/templates/archive.php` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/assets/generated/archive*` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/assets/css/eoba-host.css` [crear]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-archive-adapter.php` [crear, coordinado]
- `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/class-eo-home-readers.php` (extensión acotada, coordinada)
- `greenhouse-eo/scripts/public-website/blog-archive/` [crear: fuente congelada, bind, build, pruebas, fidelidad, preview]
- `greenhouse-eo/scripts/public-website/blog-home/deploy-blog-home-plugin-package.php` (allowlist)
- `greenhouse-eo/docs/ui/visual-directions/TASK-2055-blog-archive-v3/`

## Current Repo State

### Already exists

- Canvas D aprobado y congelado (`direcciones-2026-10-24.tar.gz`: 12 tableros `Archivo-D-*`, `gen_d.py`, `portada.css`).
- Pipeline de la portada en `scripts/public-website/blog-v3/` (`lib/dc-template.cjs` → AST, `build-plugin.cjs`,
  `test-bound-equivalence.cjs`, `test-php-parity.cjs`, `fidelity/{capture,compare,a11y}.cjs`, `preview/serve.cjs`).
- `eo-blog-home` renderiza un AST en PHP (`EOBH_Template`) y anula el padding de Ohio sólo donde vive `#eobh`.
- Readers reutilizables: `EO_Home_Readers::index()` (posts con tema, árbol, formato, minutos, imagen, autor y foto),
  `archive($args)` por año/tema/formato, `glitch()`, `author_photo()`; `EO_Format_Taxonomy::TERMS` con flag `glitch`.
- Yoast ya da: búsqueda 200 `noindex, follow` con `SearchResultsPage`; etiquetas `noindex, follow`; página imposible 404;
  autor editorial `ProfilePage` + `Person`; autores sin entradas `noindex`.

### Gap

- Ohio pinta categoría, etiqueta y autor con `index.php` y búsqueda con `search.php`; el child no sobrescribe ninguna de
  esas plantillas. `page_headline.php:259-269` imprime la categoría del primer post sobre el H1 (hallazgo 4).
- Recuadro de demo y «Staff Picks/Recent Comments/Recommended Topics» son widgets del área `ohio-sidebar-blog`;
  Dark/Light es la opción de tema `page_dark_mode_switcher` (leída en `ohio-child/parts/elements/footer.php:7-8,282-303`);
  el riel «Follow Us» es `.elements-bar.right` (clave de opción sin verificar: Ohio padre no está en el repo).
- No hay `template_include`, `pre_get_posts` ni filtros de robots para estas vistas en ningún plugin propio.
- La búsqueda vacía lista 154 resultados (páginas internas y de borrador incluidas); la búsqueda mezcla posts, páginas
  y `elementor_library`.
- Ninguna categoría tiene descripción; `/category/marketing-digital/social/` (0 entradas) es indexable.
- `/author/greenhouse-integration/` responde 200; el usuario Greenhouse es autor de 12 páginas (incluida la Home).
- `Person.sameAs` del autor `jreysgo` (`instagram.com/cesargrowth`, `linkedin.com/in/cesargrowth`): confirmado por el operador el 2026-10-24 como sus cuentas reales; no requiere corrección.
- El allowlist de `deploy-blog-home-plugin-package.php:17` no admite CSS ni assets generados nuevos.
- Faltan en `index()`: id de autor, tags y dimensiones de imagen; faltan conteos por formato dentro de un término.
- `EO_Cache_Purge` sólo purga `/blog/`.
- Runtime: `main` va 78 commits delante y 1 detrás de `origin/main`, con WIP ajeno en el árbol.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime` → `eo-blog-home` (plantilla) + `efeonce-editorial-blocks` (datos) en WordPress/Kinsta
- Future candidate home: `public`
- Boundary: la plantilla sólo recibe un documento de datos por el filtro `eoba_data` (mismo patrón que `eobh_data`); el adaptador vive en `efeonce-editorial-blocks` y sólo usa sus readers
- Server/browser split: HTML completo en servidor (PHP); sin `dc-runtime.js` ni JS de la plantilla; como mucho un script inline mínimo para el grosor del haz al escribir
- Build impact: AST y CSS generados por `scripts/public-website/blog-archive/` en Greenhouse; sin bundler nuevo
- Extraction blocker: depende de Ohio para header/footer y de Kinsta para caché

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante del blog que llega desde la portada, el menú, una entrada o Google
- Momento del flujo: explorar un tema, un autor o una búsqueda después de la portada
- Resultado perceptible esperado: la misma revista de la portada, con lo más reciente arriba y todo el archivo ordenado
- Fricción que debe reducir: página de demo en inglés, filtros que no sirven, búsqueda que mezcla páginas internas
- No-goals UX: búsqueda con IA, filtros por varios temas a la vez, colecciones, rediseño del header o del footer, 404

### Surface & system decision

- Surface: vistas de búsqueda, categoría, etiqueta y autor de WordPress (no son páginas editables)
- Nav placement: `none` (destinos ya enlazados desde la portada, las entradas y el menú)
- Composition Shell: `no aplica` — sitio público WordPress, no portal
- Primitive decision: `reuse` — CSS literal de la portada v3 (botones, segmentado, chips, filas del archivo, buscador con haz); piezas nuevas sólo con valores de la portada
- Adaptive density / The Seam: `no aplica` — página editorial con tableros 1440/390
- Floating/Sidecar/Dialog decision: ninguno
- Copy source: `local one-off` — copy del canvas D con ids del wireframe; datos de WordPress
- Access impact: `none`

### State inventory

- Default: cabecera, filtro, lista por año, paginación y otros temas con datos reales
- Loading: no aplica (render de servidor)
- Empty: tema vacío (enlace al tema padre + «Mientras tanto») y búsqueda sin resultados o vacía (preguntas sugeridas + «Mientras tanto»); nunca copy de búsqueda en un archivo
- Error: no aplica (consultas de servidor; si el adaptador falla, la vista cae a la plantilla anterior y registra el error)
- Degraded / partial: sin JavaScript todo funciona (filtro y paginación son enlaces, búsqueda GET)
- Permission denied: autor no editorial → 404 real
- Long content: títulos con `text-wrap: balance`; nombres de tema largos en dos líneas; término de búsqueda largo cortado por palabras
- Mobile / compact: tableros 390; fluido de 320 a 1099
- Keyboard / focus: migas → buscador → destacada → filtro → filas → paginador → otros temas; foco visible de la portada
- Reduced motion: sin desplazamientos al hover ni zoom de imagen

### Interaction contract

- Primary interaction: abrir una publicación (destacada o fila)
- Hover / focus / active: fila con fondo suave y avance de 8 px; tarjeta que sube; botones con texto que rueda; segmento activo navy
- Pending / disabled: no aplica
- Escape / click-away: no aplica
- Focus restore: no aplica (navegación completa)
- Latency feedback: no aplica
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: ninguno
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: curvas y duraciones de la portada (`cubic-bezier(0.2,0,0,1)`, 150–700 ms)
- Reduced-motion fallback: sin transform ni zoom
- Non-goal motion: animaciones de entrada por scroll

### Implementation mapping

- Route / surface: `is_search()`, `is_category()`, `is_tag()`, `is_author()` en el front, detrás del flag `eo_blog_archive_enabled`
- Primitive / variant / kind: piezas del canvas D (`.ah`, `.hc`, `.fb`/`.segc`, `.yg`/`.arch-row`, `.pgw`, `.ot`, `.mt`)
- Component candidates: `EOBH_Archive` (front + vista) y seis AST enlazados (`archive-{tema,etiqueta,autor,busqueda,tema-vacio,busqueda-vacia}`)
- Copy source: canvas D + tabla de copy del wireframe
- Data reader / command: `EO_Archive_Adapter` (filtro `eoba_data`) sobre `EO_Home_Readers` y `EO_CM_Util`
- API parity: lectura pública ya expuesta por WordPress (`/wp/v2/posts`, `/wp/v2/categories`); la plantilla no agrega escrituras
- Access / capability: público
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: `scripts/public-website/blog-archive/fidelity/sections.cjs` (+ `capture/compare/a11y` de `blog-v3` parametrizados)
- Route: preview local (`preview/serve.cjs` con rutas de archivo) → producción con el flag apagado para el público → producción
- Viewports: 1440×900, 390×844 (fidelidad); 320–1920 en 8 anchos (desborde)
- Quality profile: `premium`
- Required steps: cargar cada una de las seis vistas; aplicar un filtro; ir a la página 2
- Required captures: una por sección y viewport
- Required `data-capture` markers: `archive-head`, `archive-filter`, `archive-list`, `archive-topics`, `archive-meanwhile`
- Assertions: `pixelmatch` ≤ 1 % por sección; un H1; axe WCAG 2.2 AA sin violaciones; ningún texto en inglés ni de demo
- Scroll-width checks: `scrollWidth === clientWidth` de 320 a 1920
- Reduced-motion / focus evidence: corrida con movimiento reducido y recorrido con teclado
- Review dossier: `docs/ui/visual-directions/TASK-2055-blog-archive-v3/` (referencias y diferencias)
- Baseline decision / surface ID: baseline = referencias de los tableros D; surface `public-blog-archive-v3`

### Design decision log

- Decision: dirección D «Órbita + Índice» (cabecera navy como portada de sección, destacada montada, filas por año, otros temas)
- Alternatives considered: A Índice (sin imagen), B Órbita (grilla de tarjetas, porcentaje del tema), C Buscador
- Why this pattern: impacto de la órbita de la portada sin depender de portadas antiguas; la tipografía hace lo editorial
- Reuse / extend / new primitive: reutiliza el CSS de la portada; piezas nuevas sólo con sus valores
- Open risks: categorías desindexadas si no hay descripciones; marco de Ohio en páginas que no son Elementor; columna del año fija bajo el header real

### Visual verification

- GVC scenario: `blog-archive/fidelity`
- Viewports: 1440, 390 (+ desborde 320–1920)
- Required captures: por sección
- Required `data-capture` markers: los cinco del plan
- Scroll-width check: sí
- Accessibility/focus checks: axe 0 violaciones; foco visible; skip link a `#main`
- Before/after evidence: capturas de la auditoría 2026-10-24 vs vistas nuevas en vivo
- Known visual debt: portadas antiguas de los artículos (contenido, no plantilla)
- Visual scorecard: `docs/ui/visual-directions/TASK-2055-blog-archive-v3/scorecard.json` [crear]
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fuente congelada, referencias y gate

- `scripts/public-website/blog-archive/source/`: los 12 tableros D, `assets.json` y las 5 imágenes que faltan en el repo
  (portadas ANAM, Excel, Loop, Glitch Flash y la foto del autor) traídas del almacén del canvas.
- `fidelity/sections.cjs` con los marcadores por vista; `capture.cjs`/`a11y.cjs` parametrizados (raíz y lista de URLs);
  `test-mob-equivalence.cjs` (las reglas `.mob` = las de `@media (max-width:767px)`).
- Referencias PNG por sección a 1440×900 y 390×844 en `docs/ui/visual-directions/TASK-2055-blog-archive-v3/referencias/`.

### Slice 2 — Enlace y build

- `bind-archive.cjs` (desvíos con conteo exacto, huecos de datos, `sc-for` para filas, años, filtro, paginador y temas),
  `build-fixture.cjs` (datos del canvas como documento), `build-archive.cjs` (seis AST + un CSS con alcance y sin `.mob`).
- `test-bound-equivalence.cjs` y `test-php-parity.cjs` para las seis vistas.

### Slice 3 — Datos (coordinado con la sesión de Analytics)

- `EO_Archive_Adapter` en `efeonce-editorial-blocks` (filtro `eoba_data`): documento por vista con cabecera, destacada,
  conteos por formato (los `glitch-*` suman «Glitch»), filas por año o por relevancia, paginación, otros temas y picks
  del estado vacío; línea por post con `line_of()` + `update_meta_cache`; imagen ancha o cuadrada por dimensiones.
- Extensiones acotadas de `EO_Home_Readers` (id de autor, tags, dimensiones) con pruebas PHP.

### Slice 4 — Plantilla y comportamiento en WordPress

- `EOBH_Archive`: `template_include` para las cuatro vistas detrás de `eo_blog_archive_enabled`; plantilla que llama
  `get_header()`/`get_footer()`, `<main id="main">` y un H1; sin `get_sidebar`; Dark/Light y riel apagados sólo en estas
  vistas (filtro acotado, sin tocar opciones globales); `eoba-host.css` para el marco de Ohio.
- Búsqueda: `pre_get_posts` sólo en la consulta principal del front (`post` publicado; `eo_event` sólo con su flag);
  término vacío → estado vacío sin inventario; `?formato=` filtra la consulta.
- SEO: robots y canonical por vista (matriz del Detailed Spec) con `wpseo_robots`/`wpseo_canonical`; títulos sin
  «archivos»; autor no editorial → 404 real, sin enlace (`author_link`) y fuera del sitemap de autores.
- `EO_Cache_Purge` extendido a las URLs de tema, etiqueta y autor de la publicación cambiada.

### Slice 5 — Fidelidad, preview y release

- `preview/serve.cjs` con rutas de archivo dentro del shell real; gate ≤ 1 % por sección a 1440/390, axe, desborde 320–1920.
- Allowlist del paquete de `eo-blog-home` ampliado; despliegue acotado de los dos plugins con el flag apagado; lectura
  en vivo con el flag encendido para una sesión de prueba; encendido general con visto bueno; matriz HTTP verificada.

### Slice 6 — Documentación y skill

- `PUBLIC_MISCELLANEOUS_SURFACES_V1` (slices 4–6 implementados), `BLOG_HOME_RUNTIME_V1` (segunda plantilla), manual de
  operación, `miscellaneous-surfaces.md` y `blog-home-operation.md` de la skill, Handoff y changelog.

## Out of Scope

- 404 (slices 2–3 del contrato), páginas de fecha (`/2026/`) y portafolio.
- Exposición de usuarios por `/wp-json/wp/v2/users` y `?author=N` (follow-up de seguridad).
- `/wp-json/wp/v2/search` (otra superficie).
- Reasignar las páginas del usuario Greenhouse a otro autor.
- Cambiar las portadas antiguas de los artículos.
- Alinear «lecturas» de la órbita de la portada con «publicaciones».

## Detailed Spec

**Desvíos permitidos del canvas D (lista cerrada):**

1. Header y footer canónicos del sitio en lugar de la isla y el pie de reserva del canvas.
2. Datos reales de WordPress (términos, cantidades, fechas es-CL, minutos, imágenes, foto del autor).
3. Sin JavaScript: segmentado y chips como `<a href="?formato=…" aria-current>`; paginador con URLs reales; búsqueda GET.
4. Indicador del segmentado posicionado desde el servidor.
5. Accesibilidad invisible: ids con prefijo `eoba-`, `<main id="main">`, un H1.
6. Se elimina el CSS `.mob` (equivalente probado al media query).
7. Rendimiento sin cambio de píxeles: `loading="lazy"` en la lista, `fetchpriority="high"` en la destacada.
8. Fluido entre 768 y 1099 y bajo 390 (sin tablero), gobernado por el gate de desborde.
9. Columna del año fija a la altura del header real (medida), no a la de la isla del canvas.

**Matriz HTTP/SEO objetivo:**

| Vista | Status | robots | canonical | schema |
|---|---|---|---|---|
| Búsqueda con o sin resultados, o vacía | 200 | noindex, follow | ninguno | `SearchResultsPage` de Yoast |
| Búsqueda o archivo con página imposible | 404 | noindex | — | — |
| Categoría con descripción y ≥ N publicaciones (N propuesto: 4, con descendientes) | 200 | index, follow | propio (en page > 1, el de su página) | `CollectionPage` + `BreadcrumbList` |
| Categoría que no cumple | 200 | noindex, follow | propio | `CollectionPage` |
| Categoría vacía | 200 (estado vacío) | noindex, follow | propio | `CollectionPage` |
| Cualquier archivo con `?formato=` | 200 | noindex, follow | URL sin filtro | igual a su base |
| Etiqueta | 200 | noindex, follow | propio | `CollectionPage` |
| Autor editorial (≥ 1 publicación y no cuenta de servicio) | 200 | index, follow | propio | `ProfilePage` + `Person` |
| Autor no editorial (Greenhouse, autores sin publicaciones) | 404 | noindex | — | — |

**Medición:** se conservan `page_view` y `view_search_results`; eventos propios opcionales sin el término crudo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices 1 y 2 antes de cualquier PHP: sin referencias y equivalencia no hay forma de medir fidelidad.
- Slice 3 antes de la 4 y coordinado con la sesión de Analytics (mismo plugin); nunca dos despliegues de
  `efeonce-editorial-blocks` en paralelo.
- Las descripciones de los temas (pregunta abierta 1) se cargan en WordPress antes de encender la regla de indexación.
- Slice 5 sólo con todo lo anterior verde y visto bueno explícito del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se desindexan de golpe HubSpot, Inbound, Glitch… al exigir descripción | SEO | high | descripciones aprobadas y cargadas antes del flag; o regla sólo «≥ N» hasta tenerlas | robots `noindex` en `/category/hubspot/` tras el corte |
| El filtro de búsqueda alcanza wp-admin, REST o consultas secundarias | WordPress | medium | condición `is_main_query && !is_admin && !REST`; pruebas | búsqueda del editor vacía |
| El 404 del autor Greenhouse deja enlaces vivos (12 páginas) | WordPress/SEO | medium | filtro `author_link` + sitemap; barrido de enlaces | 404 en el informe de rastreo |
| Marco de Ohio (rieles, padding, clases de body) distinto en páginas no Elementor | UI | medium | `eoba-host.css` medido en preview con el shell real | desborde o diferencia en `archive-head` |
| Despliegue de `efeonce-editorial-blocks` choca con el de la sesión de Analytics | release | medium | aviso y turno explícito; `deploy content-model` apaga el flag del modelo un instante | drift en la línea base viva |
| La implementación deriva del canvas | UI | medium | gate ≤ 1 % por sección + equivalencia de AST | `compare.cjs` en rojo |

### Feature flags / cutover

- `eo_blog_archive_enabled` (opción de WordPress, por defecto 0): con 0, Ohio sigue sirviendo las vistas; con 1, la
  plantilla nueva. Se puede encender primero sólo para una cookie de prueba y después para todos.
- Las reglas de búsqueda, robots, 404 de autor y purga dependen del mismo flag (un solo interruptor de rollback).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–2 | Revertir commits de `scripts/public-website/blog-archive/` | 1 min | sí |
| Slice 3 | Restaurar el `.tar` de `efeonce-editorial-blocks` que imprime el despliegue | 5 min | sí |
| Slice 4–5 | `eo_blog_archive_enabled = 0` + purga; si hace falta, restaurar el `.tar` de `eo-blog-home` | 2–5 min | sí |

### Production verification sequence

1. `pnpm public-website:ssh-check`, `export-live-code`, `diff-runtime` (sólo paquetes acotados).
2. Aviso y turno con la sesión de Analytics y con «Blog v3 portada: correos y eventos».
3. Despliegue de los dos plugins con el flag en 0; verificar que nada cambió en vivo.
4. Encender para la cookie de prueba; gate de fidelidad, axe y desborde contra producción.
5. Visto bueno del operador; encender para todos; purgar.
6. Matriz HTTP/robots/canonical/schema por vista a 1440/390; lectura de `view_search_results`.

### Out-of-band coordination required

- Visto bueno del operador para cada `--apply` en producción y para el encendido.
- Descripciones de los temas aprobadas por el operador.
- Turno de despliegue con las sesiones que tocan `efeonce-editorial-blocks` y `eo-blog-home`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2055`.
- [x] Se declaro `Wireframe: docs/ui/wireframes/TASK-2055-blog-archive-v3-template.md` y el archivo existe.
- [x] Cada sección de las seis vistas pasa el gate (≤ 1 % de píxeles distintos) a 1440 y 390 contra las referencias del canvas D. Preview con el shell real (2026-10-24): 44/44, máximo 0,518 % (sólo el header canónico). En producción con datos reales se revisó a ojo cada vista (los datos difieren del fixture); el gate en preview de producción detectó el `header-cap` de Ohio, corregido en 2c2cfbb.
- [x] La plantilla enlazada con el fixture rinde el mismo HTML que el canvas y PHP = navegador byte a byte. `test-bound-equivalence.cjs` 6/6 vistas; `test-php-parity.cjs` 36/36 casos (2026-10-24).
- [x] En vivo, ninguna de las cuatro vistas muestra el recuadro de demo, la barra lateral de demo, Dark/Light, el riel ni texto en inglés (2026-10-24).
- [x] Sin scroll horizontal de 320 a 1920, incluidos `/category/glitch/` y `/tag/inbound/`. En vivo: 0 px en 6 vistas × 8 anchos y ninguna palabra del H1 cortada; `/category/glitch/` 0 px a 390 y 1440.
- [x] Un solo H1, `<main id="main">`, axe WCAG 2.2 AA sin violaciones en las seis vistas. En vivo: un H1 y axe 0 en 6 vistas × 3 anchos.
- [x] La búsqueda sólo devuelve entradas publicadas; `/?s=` muestra el estado vacío sin listar páginas (en vivo, 2026-10-24).
- [x] La matriz HTTP/robots/canonical/schema del Detailed Spec se cumple en vivo para cada vista (tabla en BLOG_ARCHIVE_RUNTIME_V1 §6). Con `?formato=` Yoast omite el canonical al ser noindex.
- [x] `/author/greenhouse-integration/` responde 404 (también `/author/daniela/`); `author_link` los envía a /blog/ y salen del sitemap de autores.
- [x] Rollback probado: con la plantilla instalada y el flag sin activar (paso 2, 2026-10-24) las 8 URL de control salieron idénticas a Ohio, también sin caché; `archive 0 --apply` vuelve a ese estado.
- [x] Documentación y skill actualizadas (Slice 6): BLOG_ARCHIVE_RUNTIME_V1, funcional, manual, contrato de superficies, skill y espejo.

## Verification

- `node scripts/public-website/blog-archive/test-bound-equivalence.cjs`, `test-php-parity.cjs`, `test-mob-equivalence.cjs`
- `node scripts/public-website/blog-v3/fidelity/compare.cjs <referencias> <candidata>` por vista
- `php -l` y pruebas PHP de `eo-blog-home` y `efeonce-editorial-blocks`
- Playwright a 1440/390 y 8 anchos de 320 a 1920; `curl` de la matriz HTTP
- `pnpm public-website:ssh-check` antes de cualquier escritura en vivo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Exposición de usuarios por REST y `?author=N`.
- 404 del sitio con el mismo sistema (slices 2–3 del contrato).
- Alinear «lecturas» de la órbita de la portada con «publicaciones».

## Open Questions

1. **Descripciones de los temas** (decidido 2026-10-24: Claude las redacta, el operador aprueba): ¿las redacto para los temas con ≥ 4 publicaciones (HubSpot, Glitch, Inbound
   Marketing, Marketing Digital, Loop Marketing, AEO) y las apruebas antes del corte? Sin ellas, la regla deja todos los
   temas fuera de Google; la alternativa es indexar sólo por «≥ N» hasta tenerlas.
2. **Autores sin publicaciones** (Daniela, Andrés): decidido 2026-10-24 — 404 igual que Greenhouse mientras no publiquen.
3. **Perfil de Julio:** resuelto — «cesargrowth» es la cuenta real del operador (Instagram y LinkedIn); el `sameAs` queda como está.
4. **Plugin:** decidido 2026-10-24 — la plantilla vive en `eo-blog-home`.
