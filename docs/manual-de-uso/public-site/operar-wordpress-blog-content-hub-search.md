# Operar WordPress Blog, Content Hub y Busqueda

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-07-09 por Codex
> **Ultima actualizacion:** 2026-07-09 por Codex
> **Modulo:** Public Site / WordPress / Ohio / Content Hub
> **Documentacion relacionada:** `docs/documentation/public-site/wordpress-blog-content-hub-search.md`

## Antes de Empezar

Trabaja read-only por defecto. El blog publico esta vivo en WordPress/Kinsta y
las entradas publicadas pueden tener URLs dependientes de categoria. No cambies
categorias, tags, slug, status, featured image, Yoast meta, sidebar ni busqueda
sin snapshot y aprobacion explicita.

## Revisar Estado General

Usa discovery cuando necesites inventario actualizado:

```bash
pnpm public-website:discover -- --authenticated --wpcli --write
```

Guarda el reporte bajo `docs/operations/discovery-public-website-wordpress-*.md`.
Revisa:

- total de posts/pages;
- theme activo;
- plugins activos;
- taxonomias;
- post types REST;
- disponibilidad de WP-CLI.

## Inspeccionar un Post Existente

Para un articulo puntual:

```bash
pnpm public-website:content-factory:inspect-post-deep -- --post-id <id> --write
```

Antes de planificar cambios, confirma:

- `post_status`;
- URL/permalink;
- categorias y categoria primaria Yoast si existe;
- tags;
- featured image;
- excerpt;
- Yoast title/metadesc;
- outline H2/H3;
- TOC Yoast poblado;
- bloques legacy `core/freeform`;
- links y media.

## Crear o Refrescar un Articulo

Para articulo nuevo, usa Content Factory:

```bash
pnpm public-website:content-factory:ideate -- --idea "..." --out spec.json
pnpm public-website:content-factory:run -- --spec spec.json
```

Para escribir un borrador privado gobernado:

```bash
pnpm public-website:content-factory:run -- --spec spec.json --send --author-id 1
```

El write termina en `private`. Publicar es paso humano desde WP Admin.

Para refrescar un publicado, no edites el source directamente:

```bash
pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json> --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json> --write
```

## Revisar Taxonomias

Las categorias son visibles y pueden formar parte de la URL. Antes de mover un
post de categoria:

1. Anota permalink actual.
2. Anota categorias actuales y categoria primaria Yoast si existe.
3. Verifica si el slug nuevo cambiara la URL.
4. Define redirect/canonical si cambia.
5. Revisa archivos de categoria afectados.

No uses tags actuales como navegacion publica hasta limpiar deuda demo y
duplicados.

## Revisar Busqueda

Smoke rapido:

```bash
curl -sSIL 'https://efeoncepro.com/?s=hubspot'
curl -sSIL 'https://efeoncepro.com/search/hubspot/'
```

Verifica:

- status 200;
- `noindex, follow`;
- resultados no mezclen contenido indeseado si estas evaluando hub editorial;
- texto visible del headline;
- sidebar;
- sin errores de layout.

La busqueda nativa mezcla `post`, `page`, attachments, landings y portfolio. Para
un buscador del content hub, planifica una query restringida a `post`.

## Revisar Render Ohio

El blog usa parent Ohio. No busques `category.php` o `archive.php` en el child:
las superficies principales son:

- `ohio/index.php` para categorias/tags/archivos;
- `ohio/search.php` para resultados;
- `ohio/single.php` para entradas;
- `ohio/parts/blog_grid/layout_type*.php` para cards.

El child theme solo sobreescribe headline/footer y estilos de soporte. Si una
card se ve mal, revisa primero:

- imagen destacada;
- excerpt;
- titulo largo;
- categoria/tag;
- opciones Ohio `global_blog_*`;
- sidebar activo;
- CSS global de soporte.

## Revisar o Preparar el Layout Demo 35

El layout elegido como referencia visual para la home del blog es
`Demo 35: Blog Magazine`:

```text
page_id=225984
url=https://efeoncepro.com/homedemo35-elementor/
auditoria=docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md
```

Antes de pedir o aplicar cambios sobre ese layout:

1. Inspecciona el documento sin catalogo si solo necesitas el resumen:

```bash
pnpm public-website:bridge-inspect -- --page-id 225984 --no-catalog
```

2. Confirma que sigue siendo Elementor builder, `post_status=publish`,
   `post_type=page`, y que no cambio el conteo base aproximado: 55 containers,
   58 widgets, 15 `ohio_recent_posts`.

3. Mapea la seccion afectada por `path`/widget ID. Referencias principales:

| Bloque | Path/widget | Uso |
| --- | --- | --- |
| Hero | `0`, `ohio_heading#f10dd3b`, `ohio_recent_posts#abd5d75` | H1 + post destacado |
| Top Headlines | `1.0`, `ohio_recent_posts#1757589`, `#e711472` | grilla principal |
| Rail Top | `1.1`, `#6890894`, `#ae9c70c`, `#c9979a1` | promo/sidebar editorial |
| Feature NASA | `2` | feature full-bleed con CTA externo demo |
| Popular Categories | `3.1`, banners `#6d2ded3`, `#01608b5`, `#7a644d0`, `#871ea73` | tiles de categoria |
| In Brief | `3.2` | mezcla de cards, incluye widgets vacios por attachments |
| Staff Picks | `3.3` | bloque grande + lista boxed |
| Feature Goal Setting | `4` | feature full-bleed con CTA externo demo |
| Don't Miss It | `5` | grilla + rail final |
| Suscripcion | `6`, `ohio_contact_form#7740c26` | CF7 `Subscribe Form 1` |

4. No edites directo el documento publicado para probar ideas. Primero crear una
   copia/draft gobernada o acordar la mutacion explicita con snapshot.

5. Si el cambio toca Elementor, no escribir `_elementor_data` directo. Usar el
   protocolo Elementor document save de la skill `efeonce-public-site-wordpress`.

6. Antes de promoverlo como hub, resolver deudas minimas:
   - reemplazar posts demo y IDs de attachments;
   - corregir banners `/demo35/category/...`;
   - reemplazar `See More` `href="#"`;
   - cambiar `Read More` externos a `ohio.clbthemes.com`;
   - conectar suscripcion a Growth Forms/HubSpot/Greenhouse si se espera
     medicion;
   - retirar recursos/footer demo si aparecen en la experiencia final.

7. Verificar render:

```bash
node tmp/<render-summary>.mjs
```

La verificacion minima debe cubrir desktop `1440` y mobile `390`, status 200,
`scrollWidth == clientWidth`, widgets esperados visibles, enlaces internos sin
404 y consola sin errores relevantes.

## Checklist Antes de Publicar en el Content Hub

- [ ] Post en Gutenberg, sin H1 dentro del contenido.
- [ ] H2/H3 anclados y TOC Yoast poblado si es post largo.
- [ ] Categoria canonica revisada.
- [ ] Tags limpios o intencionalmente omitidos.
- [ ] Yoast title/metadesc revisados.
- [ ] Excerpt curado.
- [ ] Imagen destacada o fallback decidido.
- [ ] CTA definido si corresponde.
- [ ] Search/archivo afectado revisado si cambio taxonomia.
- [ ] No se publico demo/sidebar/tag cloud accidentalmente.

## No Hacer

- No cambiar categoria principal de un post publicado sin mapa de URL.
- No publicar desde el pipeline automatico.
- No usar `core/freeform` en drafts nuevos.
- No dejar articulos largos con TOC vacio.
- No asumir que `eo-vibe-coding-api` `blog-hub` es un hub final.
- No indexar resultados de busqueda interna.
- No limpiar posts demo dentro de una tarea de articulo puntual.

## Trabajo Recomendado Para Refresh del Hub

Crear tareas separadas para:

- taxonomia editorial canonica;
- limpieza de demo posts/categorias/tags/sidebar;
- buscador editorial post-only;
- pagina hub canonica o cutover Think/Astro;
- medicion de clicks internos, newsletter/grader y search queries.
