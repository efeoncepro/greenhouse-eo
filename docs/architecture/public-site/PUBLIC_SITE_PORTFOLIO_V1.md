# Portafolio del sitio público (EO Portfolio) — V1

> **Tipo de documento:** Arquitectura técnica
> **Version:** 1.7
> **Creado:** 2026-10-29 por Claude (TASK-2047)
> **Ultima actualizacion:** 2026-10-30 por Claude (§7.3 verificado contra el código de la 0.8.0; estado de despliegue, TASK-2049)
> **Decisión:** [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) ·
> **Epic:** [EPIC-056](../../epics/in-progress/EPIC-056-eo-portfolio.md)
> **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/`. En producción: **v0.7.1** (runtime
> 2fa62cc: admin, tipos de pieza, páginas públicas, video, capa de teléfono y tablet, búsqueda y agentes; 17 proyectos
> publicados). **v0.8.0** (tipos de proyecto con página propia, §7.3) está construida y commiteada en runtime c6e1734,
> con el paquete armado; **no está desplegada**: el despliegue espera el OK del operador.

## 1. Qué resuelve

El portafolio guarda cada proyecto como un documento validado (`portfolio-entry.v1`) con contexto, resultados con
fuente, piezas con dimensiones reales y la aprobación del cliente. Sigue el patrón de PDR-027 (`eo-site-nav`):
documento validado, un solo servicio de guardado y tres puertas, render del servidor.

## 2. Modelo

| Pieza | Detalle |
|---|---|
| Tipo de contenido | `eo_project`: `public`, sin archivo (`has_archive=false`), sin REST genérica, sin UI nativa. URL `/portafolio/<slug>/` (`with_front=false`, independiente de la estructura `/%category%/%postname%/` del sitio). `/portafolio/` sigue siendo la página 247116. |
| Documento | JSON en `post_content`, escapado a ASCII (los filtros de contenido no lo alteran, lección de `eo-site-nav` del 2026-10-23). |
| Estado | `post_status`: `draft` hasta que `publish()` pasa la compuerta. |
| Revisiones | Revisiones nativas de WordPress (sin poda) con meta `_eop_revision`, `_eop_hash`, `_eop_message`, `_eop_author`. |
| Registro de publicación | Filas `_eop_publication` (acción, revisión, fecha, usuario, `approvalRef`, `approvalScope`, mensaje). Interno. |
| Taxonomías | `eo_line`, `eo_service`, `eo_industry`: no públicas, asignadas sólo por el servicio desde el documento. |
| Capabilities | `eo_manage_portfolio` (editar), `eo_publish_portfolio` (publicar); el administrador recibe ambas al activar. |

## 3. Esquema y reglas

`schema/portfolio-entry.v1.schema.json` (en el plugin; sin contrato AXIS hasta un segundo consumidor, PDR-028 §2) y
`EOP_Validator` (PHP puro):

- Esquema: tipos, enums (`line`: growth, brand, engine, voice, revenue; `results[].kind`: number, percent, text;
  `scope`: logo, pieces, metrics, testimonial, creators; `kind` del proyecto: campaign, website, web-section, ugc,
  system, other; `role` de cada pieza: campaign, web, section, ugc, in-situ, diagram, answer), largos, patrones (sin `<>`, `https`, slugs), campos desconocidos
  rechazados.
- Reglas de conjunto: imagen con `mediaId` y sin campos de video; video con `src` y `poster` y sin `mediaId`; voz exige
  `captionsVtt`; ids de medio únicos; `hero.mediaRef` existe; `percent` entre 0 y 100; `services` en
  `schema/services.v1.json` (9 líneas de `docs/services/`); `src`, `poster` y `captionsVtt` sólo bajo los prefijos de
  `schema/media-hosts.v1.json` (bucket público de AXIS, `MEDIA_HOST_NOT_ALLOWED`). Los mensajes `REQUIRED` nombran el
  campo en castellano (`EOP_Validator::NAMES`).
- Tipos de pieza (`EOP_Validator::ROLE_FIELDS`): una pieza sin `role` es `campaign` y un proyecto sin `kind` es
  `campaign` (los documentos anteriores siguen válidos). Cada rol trae sólo sus campos: `web` → `device`
  (desktop, mobile, tablet), `longCapture` (captura de la página completa), `liveUrl`; `section` → `sectionName`
  (obligatorio), `position` {`from`, `to`} en fracción de la página, con `from` < `to`, y `liveUrl`; `ugc` →
  `creator` {`handle` con @, `platform`, `consentRef`} obligatorio. Un campo en un rol que no lo admite es
  `INVALID_SHAPE`.
- Compuerta de publicación (`publish_issues`): `clientApproval` con `ref`, `date` y `scope` no vacío; un proyecto
  `kind: ugc` exige además `creators` en el alcance (`APPROVAL_SCOPE_CREATORS`), porque sin él no se vería ningún
  video.
- Formato derivado de las dimensiones (`9:16`, `4:5`, `1:1`, `16:9`, `3:1`, `otro`, tolerancia 3 %); no se guarda.
- Ninguna regla nombra un cliente, una campaña o un slug (guarda en `tests/eo-portfolio.test.php`).

## 4. Servicio (`EOP_Store`)

El hash ignora `revision`, `updatedAt` y los campos en `null` (equivalen a ausentes). Guardar: permiso → mensaje → validar → slug libre (sin página hija de `/portafolio/` con ese nombre) → idempotencia por
hash (sin `revision` ni `updatedAt`) → conflicto por revisión base (`force` sólo al restaurar) → si está publicado, la
compuerta → candado por slug → escritura → verificación del slug y del hash guardados → meta y revisión → términos →
purga de Kinsta si está publicado. `publish`/`unpublish` exigen `eo_publish_portfolio`, registran y purgan.
`served()` sirve el documento vigente si es válido y publicable; si no, la revisión más nueva que lo sea, y lo deja en
el log de PHP.

## 5. Tres puertas

| Puerta | Detalle |
|---|---|
| Admin | `EOP_Admin` (v0.2.0, diseño aprobado «Admin del Portafolio»): `admin.php?page=eo-portfolio` (listado, editor, revisión de sólo lectura) y `admin-post.php` (`eop_save`: save, publish, unpublish; `eop_restore`). Convierte el formulario en documento (`to_document`; dimensiones de imagen desde la biblioteca) y llama a `EOP_Store`; ids y nombres de campo derivados de la ruta del documento. Sin reglas propias. |
| `wp eo-portfolio` | `list`, `export [--revision] [--public]`, `validate [--publish] [--format=json]`, `apply [--dry-run] [--snapshot]` (uno o `{"projects": [...]}`, todo o nada), `publish [--dry-run]`, `unpublish`, `revisions`, `log`, `restore`. Escritura con `--user`. |
| REST pública | `GET /wp-json/eo/v1/portfolio` (`portfolio-index.v1`: tarjetas) y `GET /wp-json/eo/v1/portfolio/<slug>` (entrada). Sólo publicados; `ETag`, 304, `Cache-Control: public, max-age=300`; borrador = 404. |

Agentes desde Greenhouse: `pnpm public-website:portfolio` (`scripts/public-website/portfolio/cli.ts`) valida y
proyecta en local con el validador del plugin (`local.php`) y escribe por `pnpm public-website:wpcli` →
`remote.php`, que sólo reenvía a `wp eo-portfolio` una lista cerrada de subcomandos.

## 6. Proyección pública (`EOP_Projection`)

Lista blanca de campos. Nunca salen `clientApproval`, `client.greenhouseOrganizationId`, `revision`, `updatedAt` ni el
historial, ni `creator.consentRef`. Por alcance: sin `logo` no hay logo; sin `pieces` no hay `hero`, `chapters`,
`formats` ni `cover`; sin `metrics` no hay `results` ni `measure`; sin `testimonial` no hay testimonio. Un video de
creador (`role: ugc`) necesita `pieces` y además `creators`: que el cliente apruebe su campaña no autoriza mostrar la
cara de un creador. Una pieza que no se ve no deja rastro (sale de su capítulo, de `formats`, de `roles` y de la
portada; un capítulo que queda vacío no se publica). Agrega `kind`, y por pieza `role` y sus campos (`device`,
`liveUrl`, `longCapture`, `sectionName`, `position`, `creator.handle`, `creator.platform`); `roles` en la tarjeta
del índice; `format` por medio, `formats` del proyecto y `measure` (primer porcentaje con alcance `metrics`, habilita la órbita de medida). Las URLs de imágenes y
el permalink llegan como callbacks (`EOP_REST::options`).

## 7. Páginas públicas (`EOP_Render`, TASK-2048)

- Rutas: `/portafolio/` (índice) y `/portafolio/<slug>/` (entrada), atendidas en `template_redirect` (prioridad 0)
  con `templates/page.php`, que abre los mismos contenedores que el `page.php` de Ohio y llama a `get_header()` y
  `get_footer()`: menú (`eo-site-nav`) y pie del sitio. Todo sale de `EOP_Projection` (alcance de la aprobación); el
  marcado escapa cada valor.
- Interruptor `eo_portfolio_enabled`: `1` sirve a todos y engancha `eo_portfolio_render_entry` (la guarda de 404 y el
  sitemap lo ven); `preview` sirve sólo con `?eop_preview=<eo_portfolio_preview_token>`, con `noindex`, borradores
  incluidos y enlaces internos que conservan el token; cualquier otro valor deja la página 247116 en `/portafolio/` y
  las entradas en 404. Sin proyectos publicados, `/portafolio/` vuelve a la página 247116 aunque esté en `1`.
- Opciones editoriales: `eo_portfolio_order` (slugs en orden de portada) y `eo_portfolio_tally` (cifras de la agencia:
  piezas, campañas, marcas; no se calculan de los proyectos). Etiquetas de industria en `schema/industries.v1.json`.
- Portada: hero con la lente sobre la pieza destacada del primer proyecto con `hero`, cifras con el muro de todas las
  piezas visibles dentro del número grande (mezcla `lighten`), índice filtrable por línea e industria (`?linea=` en el
  servidor) con la primera fila abierta, testimonio sólo si alguno está aprobado y cierre al agendador
  (`data-action="open_meeting_scheduler"`). Entrada: hero con hasta tres piezas, ficha, reto/idea/ejecución,
  resultados y órbita de medida sólo con cifras aprobadas, galería justificada por capítulo, equipo, caso completo,
  cierre y siguiente proyecto.
- SEO: ver §7.2 (`EOP_Seo`).
- Video (`EOP_Render::piece`): sin voz, silenciado y en loop sólo mientras está en pantalla (IntersectionObserver), con
  botón de pausa visible y sin arrancar solo con «reducir movimiento»; con voz, controles y subtítulos, nunca solo. Si
  `eo-axis-video` está activo usa su reproductor (`eo_axis_video_render`); hoy no lo está y sirve el `<video>` nativo.
  Si el `hero` es un video, se reproduce en la lente y, en navy, detrás; un solo control pausa ambos.
- Filtros: enlaces `?linea=` e `?industria=` que el servidor aplica; el script sólo los hace instantáneos.
- Muro del número grande: 12 teselas por fila (72 en total, duplicadas para el loop), de imágenes primero (la más
  chica del `srcset` ≥ 120 px) y pósteres sólo para completar; van con `data-src` y `portfolio.js` las pide cuando las
  cifras están a 600 px (el `lazy` nativo no pedía las que se desplazan dentro de una fila recortada). Sin script, los
  dígitos quedan en navy.
- Footer: la portada responde sobre la página 247116, cuyas opciones de Ohio ocultaban pie y copyright; en esta ruta
  `page_footer_visibility` y `page_footer_copyright_visibility` se leen como `inherit` y cierra el footer canónico.
- Motion en `assets/portfolio.css` (expo out, resortes leves, contador con dígitos que ruedan, muro en tres filas);
  el revelado por scroll lo dispara `portfolio.js` con IntersectionObserver: `animation-timeline: view()` quedaba a
  medio camino dentro del contenedor de scroll de Ohio y dejaba títulos al 15 % de opacidad. Sin script nada se oculta;
  con `prefers-reduced-motion` todo queda quieto.
- Anfitrión: Ohio colorea los títulos por su cuenta; dentro de `#eop` heredan el color de su sección.
- La adivinanza de 404 de WordPress sigue apagada bajo `/project/` y `/portafolio/` (TASK-2046).

### 7.1 Teléfono y tablet (0.6.0)

Cortes: teléfono ≤ 599 px, tablet 600–1023, escritorio ≥ 1024; hover sólo con `(hover: hover) and (pointer: fine)`.
Spec de diseño y hallazgos medidos: auditoría del 2026-10-29 (390/768/1440) resumida en la TASK-2049.

- **Carril** (`EOP_Render::rail`): carrusel horizontal con snap, `role="region"` y `aria-roledescription="carrusel"`;
  cada pieza conserva su proporción real (ancho = alto del carril × `--r`, con tope) y la siguiente asoma por el borde.
  Controles (anterior/siguiente, contador `n / total`, barra de progreso) que el script muestra sólo si hay desborde.
  Un video de carril se reproduce sólo si está en pantalla **y** es la pieza asentada (segundo IntersectionObserver con
  `root` en el carril). Pista única por página (`sessionStorage eopHinted`). En escritorio el carril no desborda y
  cada consumidor conserva su maqueta. Consumidores: capítulos (`wants_rail`: ≥ 2 piezas y alguna con proporción
  < 1,2 o más de 3), panel de cada fila del índice y el abanico del hero de la entrada.
- **Etiqueta de formato** (`.eop-tag`, «9:16», «4:5»…) en cada pieza, arriba a la izquierda; la pausa va arriba a la
  derecha, como botón redondo de 44 px con ícono (el texto queda como nombre accesible).
- **Índice:** cada fila es una tarjeta con hasta 4 miniaturas (tocarlas abre la fila), resultado, servicios y un enlace
  `.eop-r__go` al proyecto que existe aunque la fila esté cerrada y sin script. Abrir una fila conserva la posición del
  dedo (compensa el cierre de la de arriba). Filtros en `.eop-fbar` fija bajo el menú AXIS (`--eop-stick`, que sigue
  al menú cuando se oculta); al quedar fija pliega la industria detrás de «Industria: …» y mantiene su alto (61 px).
  Conteo en vivo para lectores de pantalla. Hero: lente centrada bajo el menú en teléfonos; el video de fondo
  (`data-eop-src`) sólo se carga desde 600 px (los teléfonos usan el póster y decodifican un solo video).
- **Entrada:** abanico de hasta tres piezas sin solaparse con el texto (en escritorio, rejilla de dos columnas desde
  1024 px; antes se solapaba entre 1024 y 1180); fichas en dos columnas (`eop-fact--wide` para valores largos,
  `grid-auto-flow: dense`); pasos como trayectoria; anillo de resultados a 300 px y cifras en dos columnas; la cifra
  repetida con la medida (`eop-fig--dup`) se oculta en teléfonos; galería justificada de verdad
  (`flex: calc(var(--r) * 100) 1 0` con piso y techo por pieza); barra inferior `.eop-dock` (agenda y siguiente
  proyecto) visible fuera del hero, del cierre y del banner de cookies, oculta al bajar rápido.
- **Siempre:** títulos de fila en Poppins (`button { font: inherit }`), cita sin el borde de Ohio, objetivos ≥ 44 px,
  animaciones de cifras, muro y anillo detenidas hasta que se ven (`data-eop-play`), movimiento sin desenfoque en
  teléfonos y hero propio para teléfono en horizontal.

### 7.2 Búsqueda, compartir y agentes (`EOP_Seo`, `EOP_Agents`, 0.7.x)

- **Meta** desde la proyección, nunca desde la página 247116: portada «Portafolio de Efeonce: campañas, identidad y
  sitios web», `og:type website` y fecha del proyecto más reciente; entrada con `seo.title`/`seo.description` (un
  título guardado con «…» nunca llega a la página: cae a cliente + título). Imagen: la pieza del hero; si es video, su
  **póster** (nunca el `.mp4`), con `og:image:width/height/alt`. Slack muestra Cliente y Servicios en vez del «tiempo
  de lectura» que Yoast calculaba sobre el JSON.
- **Datos estructurados** unidos al grafo de Yoast (`wpseo_schema_graph`, `EOP_Seo::merge`): `WebPage`+`ItemPage`
  (entrada) o `CollectionPage` (portada) con `mainEntity`, `primaryImageOfPage` y fechas; `BreadcrumbList` Portada ›
  Portafolio › Cliente: título; `#primaryimage`; `CreativeWork #work` con `creator`/`publisher` = `#organization` del
  sitio, `about` el cliente, `isPartOf` el índice, `temporalCoverage` y `associatedMedia`; un `VideoObject` con `@id`
  por video (`duration` si el medio trae `durationSeconds`); `ItemList #projects` en la portada. Sin Yoast, el mismo
  grafo sale solo. El testimonio nunca va como `Review`.
- **Una URL por página:** como la ruta corre antes de `redirect_canonical`, normaliza ella misma host (www),
  mayúsculas, barra final y `?eo_project=<slug>` con un 301 en un salto (`EOP_Seo::canonical_target`; el puerto no
  cuenta).
- **Sitemap:** imágenes de cada proyecto (`wpseo_sitemap_urlimages`) y la fecha y portada del índice
  (`wpseo_sitemap_entry`). `<link rel="alternate" type="application/json">` a la REST de cada página; la REST del
  índice sale en el orden editorial.
- **Atribución:** cada entrada dice en una frase quién hizo qué para quién (`EOP_Render::attribution`).
- **Agentes** (apagado: `eo_portfolio_agent_tools` = `0`): Abilities `eo-portfolio/list-projects` y
  `eo-portfolio/get-project` (sólo lectura, datos públicos) y, con la opción en `1`, WebMCP en el navegador
  (`portfolio_list_projects`, `portfolio_get_project`, `readOnlyHint`, salida ≤ 1,5 K) detectando
  `navigator.modelContext`. Leen sólo la proyección pública.
- Fuera del plugin (pendiente): `llms.txt` de Yoast desactualizado, HTTPS forzado y HSTS en Cloudflare, enlaces
  contextuales al portafolio desde la portada y los servicios, TTFB en frío de 20–57 s en todo el sitio.

### 7.3 Tipos de proyecto con página propia (`EOP_Kinds`, 0.8.0)

Tableros aprobados del canvas «Portafolio Efeonce — concepto» (2026-10-30). Esquema aditivo dentro de
`portfolio-entry.v1`: los documentos existentes no cambian.

| `kind` | Roles de pieza y campos | Lo que agrega la página |
|---|---|---|
| `social` | `post`: `channel` (instagram, facebook, linkedin, x, tiktok, youtube, threads, pinterest), `placement` (feed, story, reel, carousel, document, post, short, video, pin, thread), `postText`, `postedAt` | Hero con las publicaciones en órbita 3D desde 3 publicaciones (isotipo del canal en cada una); «Canal por canal» con pestañas (píldora con resorte, teclado con flechas; sin script se ven todos los canales) y cada pieza en el marco de su red; la parrilla en cinta |
| `audiovisual` | `cut`: `version`, `where` (y `durationSeconds` en el video); `bts`: `consentRef` (nunca público); `specs` (ficha técnica, ≤ 10 pares) | Hero de cine (la pieza madre a pantalla completa, cortinas que se abren, grano, pausa visible); línea de tiempo de cortes a escala de su duración; detrás de cámara en abanico; créditos que suben cuando hay 3 o más (si no, el bloque de equipo de siempre) |
| `ai-production` | `ai` (obligatorio: `models` con `stage` —image, video, voice, music, upscale, compositing, other— y `name`, y `teamDid`; opcionales `aiDid` y `fictional`); `ai`: `aiStage` (anchor, angle, expression, pose, plate, scene, final), `label`, `compareTo` | Etiqueta «Producido con IA» (también en cualquier proyecto con una pieza `ai`); la escena se resuelve del ruido y entra la marca; vista giratoria de ángulos; expresiones; poses; antes y después con deslizador; qué hizo la IA y qué hizo el equipo; cómo se gobierna |
| `seo-content` | `search` (obligatorio: `source`, `period` y al menos una cifra entre `highlight`, `kpis` —con `series` opcional—, `series` —con `compare` del mismo largo—, `query`, `keywords` o `aeo`; `contents` no cuenta como cifra); `banner`: `size` | Cifra principal y curva dibujada en el servidor (SVG); indicadores con su mini gráfica; el resultado que sube en una búsqueda; la respuesta de IA que cita a la marca; palabra por palabra; contenidos publicados; banners |

- Reglas (`EOP_Validator`): `ROLE_FIELDS` limita cada campo a su rol (`INVALID_SHAPE` si aparece en otro);
  `ROLE_REQUIRED` exige `channel` en `post`, `version` en `cut`, `consentRef` en `bts` y `aiStage` en `ai`;
  `compareTo` debe ser el id de otra pieza del mismo proyecto (`UNKNOWN_REFERENCE`); `durationSeconds` sólo en video;
  `ai-production` exige `ai` y `seo-content` exige `search`; un `seo-content` no se publica sin el alcance `metrics`
  (`APPROVAL_SCOPE_METRICS`, en `publish_issues`).
- Proyección (`EOP_Projection::search`): las cifras de `search` salen con `metrics`; sus `contents` (con `source` y
  `period`) salen con `pieces`; `specs` y `ai` salen siempre (la declaración
  de IA no se puede ocultar); `consentRef` nunca sale.
- Las piezas que un tipo muestra en sus secciones salen de la galería genérica (`EOP_Kinds::taken`).
- Isotipos oficiales de canal copiados de AXIS (`@efeoncepro/axis-brand-assets`, `assets/platforms/`; Pinterest del set
  `logos` de Iconify) en `EOP_Platforms`; íconos de interfaz de Remix Icon en `EOP_Icons`. Nada dibujado a mano.
- Admin: los tipos y roles nuevos aparecen en los selectores; los campos que el formulario aún no edita (`specs`, `ai`,
  `search` y los de cada rol nuevo) se conservan al guardar (`EOP_Admin::carry_over`). Se editan por la CLI.
- CLI: `kinds` explica cada tipo; `new <slug> --kind <tipo>` parte de `scripts/public-website/portfolio/templates/`;
  `apply` se niega mientras queden marcadores `[COMPLETAR…]` o el `mediaId` 1 de la plantilla.

## 8. Pruebas y despliegue

- Estado: 0.8.0 en producción desde el 2026-10-30 (runtime c6e1734, paquete sha256 `f0553b87…`, 23 archivos;
  respaldo previo en el servidor `/tmp/eo-portfolio-before-20261030-121629.tar`). Verificado: el sitio sirve
  `?ver=0.8.0`, las 17 entradas responden 200 sin errores PHP y el validador vivo acepta los cuatro tipos nuevos.

- `php tests/eo-portfolio.test.php` (498 comprobaciones en PHP puro sobre 8 fixtures, uno por tipo) y
  `tests/playground/run-eo-portfolio.sh` (53 en Playground + 22 por WP-CLI + 33 del admin + 64 del render, con la
  estructura de enlaces de producción). Fixtures en `tests/fixtures/portfolio/`, marcados `[fixture]`; `cordillera.json` es
  ficticio y cubre sitio, parte de página y video de creador.
- Paquete `scripts/public-website/build-portfolio-plugin-package.cjs` y despliegue
  `deploy-portfolio-plugin-package.php` (contrato `eo-portfolio-release.v1`): lista de rutas, hashes, guarda de deriva
  contra la línea base de `export-live-code`, tar de respaldo, archivo principal al final, activación con un solo
  `flush_rewrite_rules`; se niega si `/portafolio/` tiene páginas hijas.
- Rollback: desactivar el plugin (sus reglas de URL se van con él) y restaurar el tar.
- Un despliegue de código no purga la caché de páginas (un guardado de proyecto sí): después de cambiar marcado,
  `purge-portfolio-cache.php`. La caché perimetral de Kinsta/Cloudflare tarda unos minutos en soltar la copia vieja.

## 9. Migración desde Ohio (TASK-2049)

- `scripts/public-website/eo-portfolio/export-ohio-real-entries.php` (sólo lee) → `migration-map-2026-10-29.json`
  (texto escrito con lo que ya publicaba cada entrada, aprobación del operador del 2026-10-29 con alcance logo y
  piezas, sin cifras) → `build-migration-documents.cjs` (lote `portfolio-entry.v1` y mapa de redirecciones; el título SEO se escribe
  entero, ≤ 65 caracteres, y el armado falla en vez de recortarlo con «…» — guarda `whole()`, tras llegar recortado a
  Google en 10 proyectos el 2026-10-30) →
  `apply-portfolio-bundle.php` (`wp eo-portfolio apply`, todo o nada; con `publish` publica) →
  `set-portfolio-switch.php` (interruptor, orden, cifras, token de vista previa, purga) →
  `cutover-ohio-to-portfolio.php` (301 de Yoast desde `/project/<slug>/` y desde los slugs viejos, reencadena los
  redirects que terminaban en esas páginas, entradas de Ohio a borrador; `dryRun` por defecto).
- Estado 2026-10-30: 15 proyectos publicados; 46 redirecciones 301 nuevas y 12 reencadenadas, 58 orígenes en un salto;
  las 59 entradas de Ohio en borrador, ninguna borrada. Archivos de categoría de Ohio: una redirección regex de Yoast
  `^/?portfolio-category(/.*)?$` → `/portafolio/` (301; `redirect-portfolio-categories.php`). Yoast compara la regex
  contra la ruta completa con la barra inicial, así que el origen debe admitirla. Pendiente: desactivar Ohio Portfolio
  tras 30 días de tráfico residual.
- Casos agregados después (aprobación del operador del 2026-10-30 sobre el canvas «Portafolio Efeonce — concepto»):
  `sky-airline-un-ano-de-campanas` (Black Sky, Cyber Sky, Always On y Perú; 5 videos en
  `portfolio/v1/sky-airline-un-ano-de-campanas/` del bucket público de AXIS; cifras con fuente «Caso «Un año con Sky»
  (2026)» y testimonio) y `berel-pitaya-color-del-ano-2026`; Gobierno de Santiago, Marca Chile, PabellonToGo y Bresler
  sumaron piezas. Las imágenes que el sitio ya servía en `eo-elementor-widgets` entraron a la biblioteca con
  `import-portfolio-media.php` (idempotente por `_eop_source`); los lotes están en `scripts/public-website/eo-portfolio/batches/`.
- Rollback de la salida: `set-portfolio-switch.php` con `{"enabled":"0"}` (vuelve la página 247116), borrar las 46
  redirecciones creadas, devolver los 12 reencadenados a su destino `project/<slug>`, borrar la regex de
  `portfolio-category` y publicar de nuevo las 15 entradas de Ohio (lista en la salida del `cutover`).
