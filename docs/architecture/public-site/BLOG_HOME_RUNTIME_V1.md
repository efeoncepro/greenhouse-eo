# Portada del blog — runtime V1

Estado: **En producción en `https://efeoncepro.com/blog/` (página 18456) desde el 2026-10-24 08:13 UTC**, con datos
reales (`eo_content_model_enabled = 1`), el menú canónico del sitio y la suscripción real a Glitch conectada. Snapshot
del corte: `_gh_blog_home_v3_before_20261024_081327`. Pendientes en §Pendientes.

Dueño: Sitio público / WordPress (runtime `efeonce-public-site-runtime`)

Decisiones: [PDR-029 — Modelo de contenido de la portada del blog](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md)
(Accepted 2026-10-24) · [dirección visual aprobada y desvíos](../../ui/visual-directions/TASK-2051-blog-portada-v3/README.md)

Ejecución: [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md) (modelo de contenido) ·
[TASK-2051](../../tasks/in-progress/TASK-2051-blog-portada-v3-high-fidelity.md) (portada) · TASK-2053/TASK-2054
(formulario en línea de Growth Forms)

Segunda plantilla del mismo plugin: [Archivo del blog — runtime V1](BLOG_ARCHIVE_RUNTIME_V1.md) (búsqueda, temas, etiquetas y autores; TASK-2055, en producción desde 2026-10-24).

Funcionamiento: [Portada del blog](../../documentation/public-site/portada-del-blog.md) · Operación:
[por CLI](../../manual-de-uso/public-site/operar-portada-blog-por-cli.md) y
[desde WordPress](../../manual-de-uso/public-site/operar-contenido-portada-blog.md)

## 1. Forma del sistema

```text
canvas aprobado (tar congelado)
   └─ scripts/public-website/blog-v3/  bind-canvas → make-tablet → build-plugin   (greenhouse-eo)
         └─ eo-blog-home/assets/generated/{portada,tablet,movil}.{ast.json,css,js} + fixtures + manifest
               │
WordPress ─────┤  [eo_blog_home] en la página 18456
               │    EOBH_Data::get()  ── fixture del canvas ──► filtro `eobh_data`
               │                                                   └─ EO_Home_Adapter (efeonce-editorial-blocks)
               │                                                        gather(): readers + media + opciones
               │                                                        map():    mismo shape que el fixture
               │    EOBH_Template::render(AST, valores)  → HTML de los tres tableros (servidor)
               └─ navegador: dc-runtime.js + lógica del tablero visible (boot.js) → primer render = no-op
```

Dos plugins con versión, paquete y rollback independientes:

| Pieza | Plugin | Qué hace |
|---|---|---|
| Plantilla | `eo-blog-home` 0.1.0 (`wp-content/plugins/eo-blog-home/`) | Shortcode `[eo_blog_home]`, render en servidor del AST del canvas, assets por tablero, renderer de Growth Forms cuando hay suscripción. No conoce WordPress más allá del filtro `eobh_data`. |
| Datos | `efeonce-editorial-blocks` 0.2.0, carpeta `includes/content-model/` | Taxonomía `eo_format`, fijaciones (`EO_Home_Pins`), tipo `eo_event` + `.ics`, registro de recursos, readers (`EO_Home_Readers`), REST de sólo lectura, adaptador (`EO_Home_Adapter`), purgas (`EO_Cache_Purge`) y piezas de schema. |

## 2. Canvas como plantilla

La plantilla **es** el canvas «Portada Blog Efeonce» (versión 67 para escritorio y móvil, 68 para tablet), no una
reinterpretación:

- `bind-canvas.cjs` aplica los desvíos aprobados a cada tablero y convierte cada dato del canvas en una consulta;
  cada reemplazo declara cuántas veces debe calzar, así que un canvas distinto hace fallar el build en lugar de enlazar
  otra cosa. `make-tablet.cjs` recompone el tablero de tablet desde el de escritorio. `build-plugin.cjs` emite el AST,
  el CSS por tablero, la lógica, los fixtures y `blog-home-base.css` (con el reset del host, §5).
- El mismo AST lo renderiza PHP (`EOBH_Template`) y el navegador (`dc-runtime.js`). La paridad se prueba byte a byte
  (`test-php-parity.cjs`); la plantilla enlazada con el fixture rinde el mismo HTML que el canvas
  (`test-bound-equivalence.cjs`).
- `assets/generated/` nunca se edita a mano: se regenera con el pipeline y se despliega con el CLI.

### Tres tableros

| Tablero | Contenedor | Ancho | Datos |
|---|---|---|---|
| Escritorio (Portada-v3) | `.eobh-d` | ≥ 1100 px | documento `portada` |
| Tablet (Tablet-v3) | `.eobh-t` | 768–1099 px | documento `portada` (mismo contrato) |
| Móvil (Movil-v3) | `.eobh-m` | < 768 px | documento `movil` |

Los tres se sirven en el HTML y `eobh-host.css` muestra uno según el ancho. Cada tablero carga su CSS con su media
query (`EOBH_Front::MEDIA`) y `boot.js` descarga sólo la lógica del tablero visible, así que corre un solo slider y una
sola cuenta regresiva. La primera diapositiva de cada tablero se precarga con `fetchpriority="high"`. La raíz es
`<div id="eobh">` con un único H1 de lector de pantalla fuera de los tableros y el documento de datos en
`<script type="application/json" id="eobh-data">` (`JSON_HEX_TAG`).

### Desvíos del canvas (lista cerrada)

La lista y su justificación viven en la
[dirección visual](../../ui/visual-directions/TASK-2051-blog-portada-v3/README.md); cualquier otra diferencia es un
defecto del gate.

| # | Desvío | # | Desvío |
|---|---|---|---|
| 1 | Header y footer canónicos del sitio | 8 | Un solo H1 por página |
| 2 | Datos reales de WordPress | 9 | La lógica busca botones dentro de su tablero |
| 3 | Accesibilidad invisible y movimiento reducido | 10 | Rendimiento sin cambio de píxeles |
| 4 | Comportamiento sin JavaScript | 11 | Velo de lectura, bajada en 2 líneas, megáfono de Novedad |
| 5 | Raíz fluida del tablero móvil | 12 | Foto del autor |
| 6 | Espaciador de 56 px en lugar de la isla móvil | 13 | Suscripción real a Glitch (también en el pie) |
| 7 | Órbita de temas fluida bajo 390 px (retirada con el desvío 15) | 14 | Tarjetas v2 de «Para leer con calma» |
| | | 15 | «Explora por tema» v2: la órbita como puerta a las categorías |

### «Para leer con calma» v2 (desvío 14)

El riel usa una sola plantilla de tarjeta para todos los formatos y tableros: `scripts/public-website/blog-v3/lib/rail-v2.cjs`
(plantilla, CSS con clases `rc-*`, fixture de la versión 93 del canvas y la lógica del hover). `bind-canvas.cjs` la
aplica con `deviateRail()` a la referencia y a la plantilla ligada, así que la equivalencia sigue probando el resto del
tablero y la paridad PHP↔navegador prueba las tarjetas. Imágenes y logos nuevos: `RAIL_ASSETS` del módulo (se suman a
`assets.json` en `bind-canvas`, `build-fixture`, `build-plugin` y `fidelity/capture`).

| Tarjeta | Cuándo | Datos |
|---|---|---|
| Foto a sangre (navy / azul alternados) | entrada con imagen destacada; guía o herramienta con imagen | `img` (`_eo_card_image` si existe; si no, la destacada, que sigue siendo la OG), `pos` = `_eo_card_focus` o `center`, tema, autor, fecha, minutos |
| Cliente (papel) | caso con `_eo_client` conocido (`EO_Home_Adapter::RAIL_CLIENTS`) | logo del cliente desde los activos del plugin |
| Pregunta (tinta) | recurso `diagnostico` | las dos líneas del slider son la pregunta |
| Entrada de webinar | el próximo evento (`events.next`) hasta que termina | día, mes, día de semana y hora en su zona, «Faltan N días» |
| Onda de podcast | entrada con formato `podcast` (sin mínimo de minutos) | `_eo_video_duration` o minutos |
| Tipográfica (papel) | entrada sin imagen ni cliente | tema, título, bajada, pie |

Insignias (una por tarjeta, gana el menor rango; `EO_Home_Adapter::RAIL_BADGES`, con texto en inglés para un locale
futuro): 1 «En vivo» (reloj del evento) · 2 «Últimos cupos» / «Lista de espera» · 3 «Más leído» · 4 «Tendencia» ·
5 «Nuevo» (≤ 14 días) · 6 «Actualizado» (`_eo_reviewed_at` ≤ 30 días en una entrada de más de 60; el pie muestra
«Actualizado <fecha>») · 7 «Gratis» (recursos y eventos gratis). Cupos y lecturas no tienen lector todavía: llegan
por el filtro `eo_home_rail_signals` (id de entrada → `top`/`trend`; `event:<id>` → `seats`/`wait`) y nada más los
enciende. La guía publicada en `think.efeoncepro.com` firma con el logo de Efeonce Think; otra guía, con el de Efeonce.

El hover fija `--px/--py/--rx/--ry` en el `style` de la tarjeta; `dc-runtime.js` (`syncAttrs`) sólo reescribe un
`style` renderizado cuando cambia su valor de plantilla, así que el repintado de cada segundo ya no lo borra (también
corrige el botón magnético).

### «Explora por tema» v2 (desvío 15)

`scripts/public-website/blog-v3/lib/topics-v2.cjs` reemplaza la sección de la órbita en los tres tableros (plantilla de
escritorio/tablet y de móvil, CSS `tv-*`, el literal `T` de la versión 95 del canvas y la lógica). Contrato por tema,
igual en los dos documentos: `key, name, promise, accent, ink, href, n, desc, reads[{t, href}], pos, align, arc, sx, sy`.
`EO_Home_Readers::ORBIT` fija las seis categorías (HubSpot, AEO, Marketing digital, Inbound, Diseño, Loop Marketing)
y entrega su enlace, la descripción de la categoría y las tres lecturas más recientes; `EO_Home_Adapter::ORBIT_TOPICS`
pone nombre y promesa, y `ORBIT_SLOTS` la posición y el ángulo del arco (`orbit_arc()`, mismo cálculo que
`topics-v2.cjs`). `EOBH_View::topics()` replica la lógica (rótulos, tema activo y filas del móvil ordenadas por
lecturas). Los rótulos son enlaces `<a href>` en el HTML del servidor: el enlazado interno a las categorías existe sin
JavaScript. Cambiar un tema = las tres constantes y un deploy de `content-model`; la descripción se edita con
`topic-descriptions`. Ojo con el caché del lector (300 s): después de un deploy, la portada puede servir la forma vieja
hasta que expire.

## 3. Modelo de contenido y adaptador

El contrato completo está en PDR-029 §1–§7; lo que importa para el runtime:

- **Registro siempre activo, visitante detrás del flag.** Taxonomía, metas y tipos se registran siempre para que el
  editor prepare contenido. Lo visible (adaptador, páginas de evento, schema) espera `eo_content_model_enabled`
  (`eo_cm_enabled()`). Con el flag en 0 la portada muestra el contenido de ejemplo aprobado.
- **Adaptador todo o nada.** `EO_Home_Adapter::filter()` arma el documento real sólo si hay al menos una diapositiva,
  un tema de la órbita y un año de archivo; si falta alguno, o si algo lanza, devuelve el documento entrante completo
  y escribe `eo-content-model: home adapter skipped|failed` en el log de PHP. Nunca mezcla datos reales con ejemplo.
  `map()` es puro y conserva del documento entrante sólo los assets de marca (logos, manzana de Glitch, Spark).
- **Slider (cinco lugares).** Las tres invitaciones de PDR-020 tienen su lugar reservado y las fijadas nunca las
  desplazan: Glitch (recurso `newsletter` o, sin él, la última edición o Flash), guía o herramienta, diagnóstico. Los
  lugares que quedan son para las fijadas vigentes y, si sobran, para las entradas recientes que pueden liderar
  (`auto_slide_candidate`: con imagen, ni Glitch ni Novedad). En pantalla van primero las entradas (fijadas y
  recientes) y después las invitaciones. Una Novedad sólo entra fijada; el «sticky» de WordPress no se lee.
- **Velo y bajada (desvío 11).** Una entrada sin `_eo_hero_image` usa su imagen destacada con velo de lectura del lado
  del texto y la bajada se corta en dos líneas; con imagen propia del slider no hay velo (`scrim: false`).
- **Campos de imagen (medidos en vivo el 2026-10-24).** Una entrada nueva entra sola al slider
  (`EO_Home_Readers::build_featured`: las más nuevas con imagen, ni Glitch ni Novedad) y, con 12 minutos o más (o
  pódcast, sin Glitch ni Novedades), al riel (`EO_Home_Readers::rail`, las cuatro más nuevas). La destacada de un post
  de Marketing con Manzanitas trae texto, así que los dos lugares tienen su campo propio:

  | Meta | Superficie | Contrato | Sin el campo |
  |---|---|---|---|
  | `_eo_hero_image` (adjunto) | diapositiva del slider y miniatura «Siguiente» (96 × 64) | WebP 2:1, 2400 × 1200, sin texto. Escritorio 1440/1920 × 900 con `object-fit: cover`, `object-position: 100% 50%` y ~10 % de margen por el parallax; en 390, franja de 390 × 300 que muestra x 42–100 % con el título debajo. Visible en todos los anchos x 42–96 % · y 7–93 %; tapan el título (x 29–65 % · y 31–61 % en 1440; x 19–54 % en 1920), «Siguiente» (x 75–92 % · y 68–77 %) y la tira (desde y 86 %) | la destacada con velo (`scrim: true`); la miniatura «Siguiente» usa la destacada |
  | `_eo_card_image` (adjunto) | tarjeta de foto del riel: 440 × 600 escritorio, 361 × 492 tablet, 304 × 540 teléfono, `cover` | el plate PNG 2560 × 1440 tal cual, sin texto; etiqueta y flecha en y 5–8 %, degradado desde y 36 % (sólido bajo 70 %), título desde y 64 % | la destacada (que sigue siendo la OG) |
  | `_eo_card_focus` (`"x% y%"`) | `pos` de la tarjeta → `object-position` | con la cara del plate al 71 %, `84% 30%`: se ve x 49–91 % del plate (x 57–89 % en el teléfono) | `center` |

  La destacada (y la OG de Yoast) se escribe aparte con `scripts/public-website/blog-post-cover-apply.php`; ningún
  comando de la portada la cambia (`card` falla si cambiara). Inventario completo y diagramas de zonas seguras:
  [BLOG_ARTICLE_IMAGE_INVENTORY_V1](../../operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md).
- **Foto del autor (desvío 12).** `EO_Home_Readers::author_photo()` usa `get_avatar_url($user, size 96)`, que sirve la
  foto subida con el plugin One User Avatar, y descarta cualquier URL de `gravatar.com`: sin foto propia la plantilla
  muestra las iniciales del canvas. Las diapositivas de Glitch no llevan foto.
- **Eventos.** Sin evento próximo, `event.show = false` y la sección se oculta entera (así está hoy: no hay evento real
  cargado). Un evento sin arte clave no ocupa el bloque grande. «Próximo» dura hasta inicio + duración.
- **Recursos.** Sólo se muestran con tipo, URL y revisión de los últimos 180 días (`EO_Resource_Registry::FRESH_DAYS`).
- **Búsqueda y archivo.** El formulario de búsqueda es GET a la búsqueda del sitio (`s`); las URL de archivo filtrado
  (`ano`, `tema`, `formato`, `pagina`) salen `noindex, follow` por `EO_Home_Adapter::robots()`.
- **REST de sólo lectura.** `/wp-json/eo/v1/home`, `/home/{featured|topics|glitch|events|rail|archive|resources}`,
  `/home/board/{portada|movil}` y `/eo/v1/events/{id}/ics`.
- **Caché y purgas.** Los readers se cachean (el slider por minuto) y `EO_Cache_Purge` purga `/blog/` en Kinsta al
  publicar o cambiar una entrada, evento o recurso: la primera purga sale de inmediato y las que siguen se agrupan en
  una ventana de 60 s (`eo_cm_purge_log` registra cada una).

## 4. Suscripción real a Glitch

Hasta el 2026-10-24 los formularios del canvas sólo simulaban el envío. Tras el corte, `/blog/` respondió «¡Listo!»
sin registrar nada durante unos 40 minutos; la mitigación quedó como regla permanente.

### Interruptor `data-subscribe`

- El adaptador expone `subscribe = { action, live, formKey, surface, base }`. `live` es verdadero sólo si la opción
  `eo_blog_glitch_form_key` tiene la clave de un Growth Form publicado (superficie en `eo_blog_glitch_form_surface`,
  por defecto `fhsf-efeonce-blog-subscription`).
- Con datos reales y `live === false`, la raíz lleva `data-subscribe="off"` y `eobh-host.css` oculta todas las
  suscripciones de Glitch (nunca la de un evento). **Nunca hay un éxito simulado.** El fixture del canvas no tiene la
  clave `live` y conserva sus formularios de ejemplo.
- Con `live === true`, `EOBH_Front::enqueue()` carga `renderer-latest.js` de Greenhouse con el handle
  `gh-growth-forms-renderer-latest` (el mismo del widget de Elementor, así una página con ambos lo carga una vez).

### Formulario conectado

| Dato | Valor |
|---|---|
| Formulario | `efeonce-blog-subscription`, clave `6bc62588-a4a0-4214-9501-13b0c2948c81` |
| Versión publicada | `fver-e6850cc8-4b39-40c7-9428-a148cfdd53bc`, política `efeonce-blog-glitch-subscription-pill-v1` |
| Superficie | `fhsf-efeonce-blog-subscription` |
| Destino | formulario HubSpot `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, subscription type `535702717` |
| Presentación | `inline_pill`, Turnstile invisible al enviar (misma site key que AEO) |
| Textos | «Suscríbete a Glitch» / «Suscribirme» / «¡Listo!» / «Ya estás suscrito a Glitch» |
| Aviso | «Al suscribirte aceptas la {privacyLink}. Te das de baja cuando quieras.» → `https://efeoncepro.com/politica-de-privacidad/` |

Lo publica `pnpm growth:forms:publish-glitch-pill` (`scripts/growth/publish-glitch-inline-pill.ts`: dry-run en
memoria, `--apply` borrador + destino + revisión, `--publish` exige que `origin/main` sirva el código) y lo conecta
`pnpm public-website:blog-home subscription <clave> --apply`.

**Consentimiento** (aprobado por el operador el 2026-10-24): en una píldora de suscripción, suscribirse bajo el aviso
visible es el consentimiento. El servidor guarda `sha256` del aviso (`inlinePillNoticeHash`) en
`form_submission_consent_snapshot.notice_text_hash`, y la entrada `communications[]` del destino HubSpot con
`consentBy: 'submission'` sólo suscribe si ese hash existe. El contrato de Growth Forms es dueño de esa parte:
[`growth-public-forms-runtime-contract.md`](../growth-public-forms-runtime-contract.md).

### Montaje en la plantilla

- La píldora de la sección Glitch y la suscripción del pie son
  `<greenhouse-form data-dc-keep class="eo-inline-pill eo-inline-pill--glitch" form-key surface base-url locale="es-CL" color-scheme="dark" appearance="bare">`
  dentro de un `sc-if` sobre `subLive` (`bind-canvas.cjs`, `LIVE_PILL`). La del pie reemplaza el campo con casilla del
  canvas (desvío 13).
- **`data-dc-keep`.** El morph de `dc-runtime.js` no toca un elemento con ese atributo. Sin él, el autoplay del slider
  re-renderizaba la plantilla y borraba el formulario que el renderer había montado.
- **Antes del renderer (o sin JavaScript).** Dentro del elemento va `a.ghf-fallback` hacia Glitch con las clases de la
  píldora en reposo del canvas y el aviso `.gxs__note` reservando su lugar: no hay salto visual cuando el renderer
  reemplaza el contenido.
- **Anchos.** `.gxw` es un flex que encoge a su contenido: `<greenhouse-form>` toma 480 px (el ancho abierto del canvas);
  en tablet alinea a la izquierda con los tokens públicos `--ghf-inline-align: flex-start` y
  `--ghf-inline-note-align: left`; en móvil ocupa todo el ancho; en el pie, el ancho de la columna (en móvil con 32 px
  arriba y 16 px a los lados). El tono sale de `--ghf-inline-tone*`.

## 5. Aislamiento del tema y reset del host

La raíz `#eobh` lleva `all: initial` y un reset con especificidad de ID que revierte lo que Ohio aplica a los
elementos HTML, imágenes y SVG (sin tocar `width`, `height` ni `fill`). Los keyframes tienen nombre propio por tablero.
`eobh-host.css` anula el padding de 16 px y el margen de −16 px que Ohio pone alrededor de la página sólo donde vive
`#eobh`.

El reset **excluye todo lo que está dentro de `<greenhouse-form>`** con `:not(greenhouse-form *)` (`HOST_RESET` en
`build-plugin.cjs`). Sin esa exclusión anulaba los estilos del renderer: texto duplicado y píldora aplastada (se
detectó y se desconectó la suscripción en minutos). Regla: lo que vive dentro de un elemento que pinta otro script no
lo toca el host.

## 6. Gates

| Gate | Herramienta | Presupuesto |
|---|---|---|
| Equivalencia de la plantilla | `test-bound-equivalence.cjs` | mismo HTML que el canvas |
| Paridad servidor / navegador | `test-php-parity.cjs [--write-fixtures]` | byte a byte |
| Fidelidad de píxeles | `fidelity/capture.cjs` (`reference`, `bound`, `url`) + `fidelity/compare.cjs` | ≤ 1 % por sección (`pixelmatch` umbral 0,1) |
| Accesibilidad | `fidelity/a11y.cjs` | axe WCAG 2.2 AA, 0 violaciones |
| Desborde | `blog-home verify --browser` | 0 px en 8 anchos de 320 a 1920 |

Evidencia en vivo del 2026-10-24: sin desborde de 320 a 1920 px, un solo H1, axe 0 violaciones en los tres tableros,
indexable (robots `index`, canonical `/blog/`). Con la suscripción real conectada, el gate sin JavaScript da en la
sección Glitch 0,016 % (escritorio), 0,027 % (tablet) y 0,061 % (móvil); las tres secciones del pie difieren por el
desvío 13 y esperan el visto bueno del operador.

Preview local: `node scripts/public-website/blog-v3/preview/serve.cjs` sirve la portada dentro del shell real del sitio
(`--now <ms>` congela el reloj). `--subscribe <formKey>` conecta el formulario publicado a través de un proxy local de
sólo lectura (`/__ghf/`, GET con el origen del sitio): permite probar la píldora real sin exponerla en vivo y sin que
un envío sea posible.

## 7. Operación por CLI

`pnpm public-website:blog-home` (`scripts/public-website/blog-home/{cli.ts,remote.php,verify-browser.cjs}`) es la única
puerta de escritura para agentes y operadores; pasa por las metas, taxonomías y readers del plugin, igual que el editor.

- Lecturas: `status`, `slider`, `post <id|slug>`, `verify [--browser] [--url]`. `verify` revisa por HTTP la plantilla
  (`#eobh`), un H1, el menú canónico, robots `index` y datos reales; `--browser` espera el selector `#eobh` (no el
  evento `load`, que terceros del sitio pueden retener minutos) y mide desborde y axe.
- Escrituras: plan sin `--apply`; cada apply imprime `before`, lee de vuelta, resetea readers, purga `/blog/` y agrega
  una línea al ledger `scripts/public-website/blog-home/ledger/<AAAA-MM>.jsonl`. Comandos: `pin --until`, `unpin`,
  `format`, `line`, `client`, `reviewed`, `hero`, `card` (imagen y punto focal de la tarjeta), `resource <json>`, `review`, `event <json>` (rechaza enlaces de Zoom, Teams o Meet),
  `retire resource|event`, `subscription <clave|off> [--surface]`, `flag 0|1`, `purge`.
- Despliegue: `deploy home|content-model [--apply]` exporta la línea base viva y arma un paquete guardado (se niega si
  alguien cambió esos archivos en Kinsta); `content-model` apaga el flag, despliega, lo restaura y corre
  `verify-content-model.php`. Corte de página: `page publish|rollback --snapshot <opción>`.

## 8. Rollback

| Qué | Cómo | Efecto |
|---|---|---|
| Suscripción | `subscription off --apply` | borra las opciones; la portada deja de mostrar suscripción |
| Datos reales | `flag 0 --apply` | vuelve el contenido de ejemplo aprobado; los datos quedan inertes |
| Plugin | restaurar el `.tar` que imprime el despliegue | código anterior |
| Página `/blog/` | `page rollback --snapshot _gh_blog_home_v3_before_20261024_081327 --apply` | vuelve exactamente a la página previa al corte |
| Formatos | `backfill-format.php` en modo `restore` con el ledger del apply | formatos previos |

## Pendientes

- **Envío real de verificación.** Un envío desde el navegador automatizado de Claude no salió: Turnstile rechazó el
  navegador (sin token, sin `POST /submit`; la misma configuración funciona con personas en AEO). No se intentó eludir
  la verificación. Falta que una persona se suscriba y confirmar en HubSpot el contacto suscrito al tipo `535702717`.
- Visto bueno visual del operador a la píldora en el pie (desvío 13).
- Primer evento real (hoy la sección está oculta) y prueba de `Event` en Rich Results Test y del `.ics`.
- Medir en Kinsta la purga de `/blog/` (< 2 min); hoy sólo está medida en Playground.
- Papelera de la página de revisión 252046 `/blog-v3-revision/` (publicada, noindex): espera confirmación del operador.
- LCP de laboratorio sobre 2,5 s en el perfil móvil por el peso de scripts del sitio (seguimiento de sitio, ver
  TASK-2051).

## Referencias de código

- Plantilla: `efeonce-public-site-runtime/wp-content/plugins/eo-blog-home/` (`includes/class-eobh-{front,data,view,template}.php`,
  `assets/js/{dc-runtime,boot}.js`, `assets/css/eobh-host.css`, `assets/generated/`).
- Modelo: `efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/includes/content-model/`.
- Pipeline y gates: `greenhouse-eo/scripts/public-website/blog-v3/`.
- CLI: `greenhouse-eo/scripts/public-website/blog-home/`.
- Suscripción: `src/lib/growth/forms/{hash.ts,commands.ts,destinations/hubspot/adapter.ts}`,
  `scripts/growth/publish-glitch-inline-pill.ts`.
