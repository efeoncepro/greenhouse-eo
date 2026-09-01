# Operar WordPress Blog, Content Hub y Busqueda

> **Tipo de documento:** Manual de uso
> **Version:** 1.4
> **Creado:** 2026-07-09 por Codex
> **Ultima actualizacion:** 2026-08-31 por Codex
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

El write termina en `private`. Publicar requiere autorización humana explícita;
puede ejecutarse desde WP Admin o mediante el carril agentic gobernado, siempre
con snapshot, rollback, purge y QA live según el runbook end-to-end.

Para refrescar un publicado, no edites el source directamente:

```bash
pnpm public-website:content-factory:refresh-plan -- --inspection <post-deep-inspection.json> --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan <refresh-plan.json> --brief <patch-brief.json> --write
```

## Revisar Taxonomias

Procedimiento técnico canónico:
`.codex/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md`.
Este manual funciona como checklist del operador; no sustituye los guards y
readbacks de esa referencia.

Baseline canónico vigente:

```text
AEO
Diseño > Diseño Web
Glitch
Growth
HubSpot
Inbound Marketing
Inteligencia Artificial
Loop Marketing
Marketing Digital > Redes Sociales
Novedades Efeonce
SEO
```

AEO y SEO son raíces; SEO no va debajo de Inbound Marketing. `Diseño Web` y
`Redes Sociales` son las únicas hijas en este corte. La jerarquía completa y la
exposición recomendada están en
`docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`.
No confundas una raíz con un bloque destacado de la home: eso se cura en los
widgets/queries. Marketing Digital (`17`) es la categoría por defecto.

Las categorias son visibles y la categoría primaria Yoast puede formar parte de
la URL. Antes de mover un post o cambiar la jerarquía de una categoría:

1. Anota permalink, canonical, `og:url`, breadcrumb, categorías asignadas y
   `_yoast_wpseo_primary_category`.
2. Inventaría todos los posts cuya categoría primaria use el término, aunque
   también pertenezcan a otras categorías.
3. Guarda snapshot del término, posts afectados e inventario Yoast de redirects;
   prepara rollback antes de escribir.
4. Cambia padre/slug con `wp_update_term()`; no uses SQL directo.
5. Si la URL cambia, crea `301` explícitos para cada post y para el archivo de
   categoría. Con Yoast SEO Premium usa `WPSEO_Redirect_Manager` y normaliza
   slash inicial/final al validar el readback.
6. Reemplaza enlaces internos antiguos por el canonical directo. Para contenido
   Elementor usa `Document::save()`, preservando metas Ohio externas al árbol.
7. Purga cachés y comprueba rutas nuevas `200`, antiguas `301` de un salto,
   canonical, `og:url`, breadcrumb, cards de archivo, sitemaps y enlaces
   bidireccionales.

No confíes solo en la redirección para los enlaces propios: el contenido y las
landings controladas por Efeonce deben enlazar directamente a la ruta vigente.

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
- query vacía no devuelve el inventario completo;
- resultados no mezclen contenido indeseado si estas evaluando hub editorial;
- títulos públicos no contengan marcadores editoriales como `(Borrador)`;
- texto visible del headline;
- sidebar;
- sin errores de layout.

La busqueda nativa mezcla `post`, `page`, attachments, landings y portfolio. Para
un buscador del content hub, planifica una query restringida a `post`.

Para 404, no-results, archivos vacíos y paginación imposible, sigue
`docs/manual-de-uso/public-site/operar-paginas-miscelaneas.md`. No apliques una
misma política robots/canonical a todos los archivos y no asumas que Elementor
Theme Builder controla estas superficies sin una condición live verificable.

## Revisar Render Ohio

El blog usa parent Ohio. No busques `category.php` o `archive.php` en el child:
las superficies principales son:

- `ohio/index.php` para categorias/tags/archivos;
- `ohio/404.php` para 404;
- `ohio/search.php` para resultados;
- `ohio/parts/content-none.php` para no-results;
- `ohio/searchform.php` para el formulario nativo;
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
`Demo 35: Blog Magazine`. La fuente permanece protegida y ya existe una copia
de trabajo publicada con `noindex`:

```text
page_id=225984
url=https://efeoncepro.com/homedemo35-elementor/
work_page_id=251875
work_url=https://efeoncepro.com/demo35-blog-magazine-copia-trabajo/
auditoria=docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md
contrato=docs/audits/public-site/2026-08-22-demo35-elementor-runtime-contract.md
estado=docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md
```

Antes de pedir o aplicar cambios sobre ese layout:

1. Inspecciona el documento sin catalogo si solo necesitas el resumen:

```bash
pnpm public-website:bridge-inspect -- --page-id 225984 --no-catalog
```

2. Confirma que sigue siendo Elementor builder, `post_status=publish`,
   `post_type=page`, y que no cambió el baseline: 7 raíces, 113 nodos, 55
   containers, 58 widgets y 15 `ohio_recent_posts`. Para la fuente intacta,
   contrasta además el hash `_elementor_data`
   `e63a70342e2cb83fae341637968ac05ccb30d0679438e143b8a8f3b047537394`.

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

4. No edites la fuente `225984`. Trabaja sobre `251875` y confirma antes del
   write sus marcadores `source=225984`, `purpose=demo35-blog-home-work-copy-v1`
   y `noindex=1`.

   Incluye en el snapshot la copia `251875`, la fuente `225984`, la página
   actual `/blog/` `18456`, document settings, metas Ohio `page_*`,
   `_thumbnail_id`, Yoast, slug y menú. Ubica cada pieza por path, tipo y
   fingerprint, no únicamente por ID.

5. Mantén `page_for_posts=0`. No asignes Demo 35 ni su copia como página de
   entradas: WordPress omite el contenido Elementor y renderiza el archivo Ohio.

6. Los 20 posts demo ya están en papelera. Clasifica cada
   `ohio_recent_posts` de la copia como `manual`, `query` o `remove` antes de
   tocarlo. Catorce usan IDs fijos y cinco referencias son attachments; varios
   bloques quedan vacíos o incompletos. Vaciar `posts` tampoco es neutro: puede
   activar una query fallback.

7. Si el cambio toca Elementor, no escribir `_elementor_data` directo. Usar el
   protocolo Elementor document save de la skill `efeonce-public-site-wordpress`.
   El guardado debe incluir `elements` y `settings`; las metas Ohio externas al
   árbol se preservan o actualizan explícitamente.

8. Antes de promoverlo como hub, resolver deudas minimas:
   - conectar posts reales y las categorías de PDR-019;
   - reemplazar IDs de posts demo y attachments;
   - corregir banners `/demo35/category/...` con archivos canónicos;
   - reemplazar `See More` `href="#"`;
   - cambiar `Read More` externos a `ohio.clbthemes.com`;
   - conectar suscripcion a Growth Forms/HubSpot/Greenhouse si se espera
     medicion;
   - retirar recursos/footer demo si aparecen en la experiencia final.

9. Para el corte, conserva una única canónica `/blog/`: define si se reemplaza el
   contenido de `18456` o se hace un swap controlado de slug, con redirects,
   menú, Yoast y rollback. Revisa también el shell: Demo 35 renderiza
   `with-header-3`; el `/blog/` actual usa `with-header-6` con sidebar.

10. Verificar render:

```bash
node tmp/<render-summary>.mjs
```

La verificacion minima debe cubrir navegación anónima desktop `1440` y mobile
`390`, status 200, `scrollWidth == clientWidth`, siete raíces y tarjetas
esperadas visibles, header/footer, enlaces internos sin 404, reduced motion,
formulario y consola sin errores relevantes. La barra administrativa puede
introducir un falso positivo de 440 px en mobile; no lo atribuyas al documento
Elementor sin aislar `#wpadminbar` y el menú fuera de lienzo.

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

La taxonomía de categorías, la reclasificación de posts reales y la retirada de
posts/categorías demo están terminadas. Sigue en este orden:

1. adaptar `251875`: mapear sus 15 widgets a `manual | query | remove` y
   reemplazar copy, assets y enlaces Ohio;
2. definir qué categorías y posts ocupan hero, bloques principales y rails
   según PDR-019;
3. reemplazar la suscripción demo por un contrato medible;
4. corregir sidebar/chrome de archivos y limpiar tags;
5. implementar buscador editorial restringido a `post`;
6. ejecutar QA visual, responsive, teclado, SEO, enlaces y medición;
7. pedir aprobación para el cutover manteniendo una sola canónica `/blog/`.
