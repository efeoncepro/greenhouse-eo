# Portafolio del sitio público (EO Portfolio) — V1

> **Tipo de documento:** Arquitectura técnica
> **Version:** 1.3
> **Creado:** 2026-10-29 por Claude (TASK-2047)
> **Ultima actualizacion:** 2026-10-30 por Claude (páginas públicas y migración, TASK-2048/2049)
> **Decisión:** [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) ·
> **Epic:** [EPIC-056](../../epics/in-progress/EPIC-056-eo-portfolio.md)
> **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (v0.4.1 en producción desde 2026-10-30,
> runtime 7fbd94a: admin, tipos de pieza y páginas públicas; 15 proyectos publicados)

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
- SEO: título, descripción, canónica y OG de la entrada desde `seo` y `hero`; JSON-LD `ItemList` en la portada y
  `CreativeWork` en la entrada. El video se muestra como su póster hasta conectar `eo-axis-video` (pendiente de TASK-2048).
- Motion en `assets/portfolio.css` (expo out, resortes leves, contador con dígitos que ruedan, muro en tres filas,
  revelado por scroll con `animation-timeline: view()`); con `prefers-reduced-motion` todo queda quieto.
- La adivinanza de 404 de WordPress sigue apagada bajo `/project/` y `/portafolio/` (TASK-2046).

## 8. Pruebas y despliegue

- `php tests/eo-portfolio.test.php` (219 comprobaciones en PHP puro sobre 4 fixtures) y
  `tests/playground/run-eo-portfolio.sh` (53 en Playground + 22 por WP-CLI + 33 del admin + 18 del render, con la
  estructura de enlaces de producción). Fixtures en `tests/fixtures/portfolio/`, marcados `[fixture]`; `cordillera.json` es
  ficticio y cubre sitio, parte de página y video de creador.
- Paquete `scripts/public-website/build-portfolio-plugin-package.cjs` y despliegue
  `deploy-portfolio-plugin-package.php` (contrato `eo-portfolio-release.v1`): lista de rutas, hashes, guarda de deriva
  contra la línea base de `export-live-code`, tar de respaldo, archivo principal al final, activación con un solo
  `flush_rewrite_rules`; se niega si `/portafolio/` tiene páginas hijas.
- Rollback: desactivar el plugin (sus reglas de URL se van con él) y restaurar el tar.

## 9. Migración desde Ohio (TASK-2049)

- `scripts/public-website/eo-portfolio/export-ohio-real-entries.php` (sólo lee) → `migration-map-2026-10-29.json`
  (texto escrito con lo que ya publicaba cada entrada, aprobación del operador del 2026-10-29 con alcance logo y
  piezas, sin cifras) → `build-migration-documents.cjs` (lote `portfolio-entry.v1` y mapa de redirecciones) →
  `apply-portfolio-bundle.php` (`wp eo-portfolio apply`, todo o nada; con `publish` publica) →
  `set-portfolio-switch.php` (interruptor, orden, cifras, token de vista previa, purga) →
  `cutover-ohio-to-portfolio.php` (301 de Yoast desde `/project/<slug>/` y desde los slugs viejos, reencadena los
  redirects que terminaban en esas páginas, entradas de Ohio a borrador; `dryRun` por defecto).
- Estado 2026-10-30: 15 proyectos publicados; 46 redirecciones 301 nuevas y 12 reencadenadas, 58 orígenes en un salto;
  las 59 entradas de Ohio en borrador, ninguna borrada. Pendiente: `/portfolio-category/*` de Ohio sigue en 200 y Ohio
  Portfolio se desactiva tras 30 días de tráfico residual.
- Rollback de la salida: `set-portfolio-switch.php` con `{"enabled":"0"}` (vuelve la página 247116), borrar las 46
  redirecciones creadas, devolver los 12 reencadenados a su destino `project/<slug>` y publicar de nuevo las 15
  entradas de Ohio (lista en la salida del `cutover`).
