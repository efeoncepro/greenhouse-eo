# Portafolio del sitio público (EO Portfolio) — V1

> **Tipo de documento:** Arquitectura técnica
> **Version:** 1.1
> **Creado:** 2026-10-29 por Claude (TASK-2047)
> **Decisión:** [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) ·
> **Epic:** [EPIC-056](../../epics/to-do/EPIC-056-eo-portfolio.md)
> **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (v0.2.0 con el admin, activo en producción
> desde 2026-10-29, runtime 3ab38ad)

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
  `scope`: logo, pieces, metrics, testimonial), largos, patrones (sin `<>`, `https`, slugs), campos desconocidos
  rechazados.
- Reglas de conjunto: imagen con `mediaId` y sin campos de video; video con `src` y `poster` y sin `mediaId`; voz exige
  `captionsVtt`; ids de medio únicos; `hero.mediaRef` existe; `percent` entre 0 y 100; `services` en
  `schema/services.v1.json` (9 líneas de `docs/services/`); `src`, `poster` y `captionsVtt` sólo bajo los prefijos de
  `schema/media-hosts.v1.json` (bucket público de AXIS, `MEDIA_HOST_NOT_ALLOWED`). Los mensajes `REQUIRED` nombran el
  campo en castellano (`EOP_Validator::NAMES`).
- Compuerta de publicación (`publish_issues`): `clientApproval` con `ref`, `date` y `scope` no vacío.
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
historial. Por alcance: sin `logo` no hay logo; sin `pieces` no hay `hero`, `chapters`, `formats` ni `cover`; sin
`metrics` no hay `results` ni `measure`; sin `testimonial` no hay testimonio. Agrega `format` por medio, `formats` del
proyecto y `measure` (primer porcentaje con alcance `metrics`, habilita la órbita de medida). Las URLs de imágenes y
el permalink llegan como callbacks (`EOP_REST::options`).

## 7. Salvaguardas mientras no hay plantilla

Hasta que `TASK-2048` enganche `eo_portfolio_render_entry`: una entrada publicada responde 404, el JSON nunca sale
como contenido o extracto y el tipo queda fuera del sitemap de Yoast. La adivinanza de 404 de WordPress está apagada
bajo `/project/` y `/portafolio/` (`do_redirect_guess_404_permalink`): con ella, `/project/lifestyle-app/` caía en otra
entrada en vez de responder 410 (TASK-2046).

## 8. Pruebas y despliegue

- `php tests/eo-portfolio.test.php` (126 comprobaciones en PHP puro sobre 3 fixtures) y
  `tests/playground/run-eo-portfolio.sh` (53 en Playground + 21 por WP-CLI, con la estructura de enlaces de
  producción). Fixtures en `tests/fixtures/portfolio/`, marcados `[fixture]`.
- Paquete `scripts/public-website/build-portfolio-plugin-package.cjs` y despliegue
  `deploy-portfolio-plugin-package.php` (contrato `eo-portfolio-release.v1`): lista de rutas, hashes, guarda de deriva
  contra la línea base de `export-live-code`, tar de respaldo, archivo principal al final, activación con un solo
  `flush_rewrite_rules`; se niega si `/portafolio/` tiene páginas hijas.
- Rollback: desactivar el plugin (sus reglas de URL se van con él) y restaurar el tar.
