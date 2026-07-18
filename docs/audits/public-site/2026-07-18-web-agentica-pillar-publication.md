# Web agéntica — cierre de publicación y QA live

**Fecha:** 2026-07-18  
**Resultado:** `PASS` con deuda ajena no bloqueante  
**Post:** WordPress `249387`  
**URL:** `https://efeoncepro.com/aeo/web-agentica-agentes-ia/`

## Resultado publicado

- Título editorial vigente: `El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA`.
- El slug `web-agentica-agentes-ia` y el SEO title explícito de Yoast se conservaron; `og:title` y schema
  heredan el nuevo título editorial. Yoast 28 no emite `twitter:title`; X/Twitter consume el OG fallback y no se
  dejó un meta específico inerte.
- Estado WordPress `publish`; fecha GMT `2026-07-18 10:57:29`.
- Autor Julio (`1`), categoría primaria AEO (`156`) y canonical público exacto.
- El body gobernado sólo recibió después del publish una reconciliación mecánica
  de dos enlaces internos hacia sus canonicals `/aeo/`; no cambió la tesis ni el
  contenido editorial. Hash final de `post_content`:
  `6ba9232e5156b2ef58db530663f0280cd86a55f825628e0728227b314e547c94`;
  readback: `old_links=0`, `new_links=2`.
- 99 bloques gobernados, 14 H2 + 6 H3, TOC con 20 destinos y siete infografías `<picture>` SVG.
- Robots `index, follow`; schema con `Article`/`BlogPosting`, `WebPage`, `ImageObject`, `BreadcrumbList`, `Person`,
  `Organization` y `WebSite`.
- Sitemap Yoast contiene la URL con `lastmod` `2026-07-18T10:57:29+00:00`.

## Portada C15

- Featured WebP `1600×900`: media `251553`, hash
  `a6256cf1c8ec116ffefc5219575285bb8df06f4e6e7d594b6cfc61265aaa9ff1`.
- Open Graph/Twitter JPEG `1440×756`: media `251554`, hash
  `d0a956f4c0d800000871b89ff5fa32b56fb5b50489f9945931640d66b9e6ae29`.
- Readback remoto `200` y dimensiones/hashes coincidentes con los derivados locales.
- El template Ohio del single post no imprime la imagen destacada en el hero. Sí está verificada como
  `primaryImage`, OG/Twitter y thumbnail de la categoría AEO; no se duplicó dentro del body.

## Enlaces bidireccionales

- El artículo contiene tres enlaces hacia `https://efeoncepro.com/desarrollo-sitios-web/`.
- La landing contiene exactamente un enlace contextual visible hacia el artículo, con el texto
  `Lee la guía: qué es una web agéntica y cómo preparar tu sitio.`
- La reciprocidad fue comprobada con navegador real a `1440×1000` y `390×844`; ambas páginas respondieron `200`
  y conservaron `scrollWidth === clientWidth`.
- La landing sigue renderizando su H1, shell y formularios. La mutación se ejecutó mediante
  `Elementor\Document::save()`, no escribiendo `_elementor_data` directamente.
- La medición de ese enlace no se improvisó: no emite `gh_cta_clicked` ad hoc y permanece separada como trabajo
  pendiente de contrato runtime.

## Migración canónica de AEO

- El término AEO (`156`) dejó de ser hijo de Loop Marketing (`155`) y pasó a raíz mediante `wp_update_term()`;
  no hubo escritura SQL ni categoría paralela.
- La estructura global de permalinks sigue `/%category%/%postname%/`. Cambiaron tres posts publicados cuya
  categoría primaria Yoast es AEO y el archivo de categoría; el post SEO+AEO `248463` conserva Loop Marketing
  como primaria y no cambió.
- Yoast SEO Premium registró cuatro redirects `301` plain mediante `WPSEO_Redirect_Manager`: tres posts y
  `/category/loop-marketing/aeo/` → `/category/aeo/`.
- Canonical, `og:url`, BreadcrumbList, cards del archivo, post sitemap y category sitemap usan las rutas nuevas;
  las cuatro rutas históricas devuelven `301` exacto.
- El enlace recíproco Elementor de `/desarrollo-sitios-web/` fue actualizado mediante
  `Elementor\Document::save()` para apuntar directamente al nuevo canonical, sin depender del redirect.

## Evidencia y reversibilidad

- Snapshot pre-publicación remoto: `/tmp/gh-post-249387-before-publish-c15-20260718.json`.
- Snapshot previo al ajuste de título: `/tmp/gh-post-249387-before-title-v2-20260718.json`.
- Rollback del título local: `tmp/rollback-web-agentica-title-v2.php`.
- Snapshot previo a promover AEO: `/tmp/gh-category-156-before-root-migration-20260718.json`.
- Snapshot previo a los redirects Yoast: `/tmp/gh-yoast-redirects-before-aeo-root-migration-20260718.json`.
- Rollbacks de taxonomía/redirects: `tmp/rollback-aeo-category-root-migration.php` y
  `tmp/rollback-aeo-yoast-redirects.php`.
- Snapshot previo a actualizar el enlace Elementor:
  `/tmp/gh-page-250816-before-aeo-canonical-link-20260718.json`.
- Snapshot previo a reconciliar los dos enlaces internos del artículo:
  `/tmp/gh-post-249387-before-canonical-internal-links-20260718.json`.
- Rollback del enlace canonical: `tmp/rollback-desarrollo-web-aeo-canonical-link.php`.
- Rollback de publicación local: `tmp/rollback-web-agentica-publish-c15.php`.
- Snapshot pre-enlace recíproco remoto:
  `/tmp/gh-page-250816-before-web-agentica-reciprocal-link-20260718.json`.
- Rollback del enlace local: `tmp/rollback-desarrollo-web-reciprocal-link.php`.
- Inspección profunda del publish inicial, anterior al título y a la
  retaxonomía:
  `docs/operations/public-site-content-factory/post-deep-inspection-249387-2026-07-18T10-57-51+00-00.json`.
- Inspección profunda final post-título, post-taxonomía y post-reconciliación de
  enlaces:
  `docs/operations/public-site-content-factory/post-deep-inspection-249387-2026-07-18T11-37-13+00-00.json`.
- QA integral del artículo: `.captures/web-agentica-public-c15-2026-07-18/report.json`.
- QA específico de bidireccionalidad: `.captures/web-agentica-bidirectional-2026-07-18/report.json`.
- QA del título final: `.captures/web-agentica-title-v2-2026-07-18/report.json`.
- QA de migración AEO: `.captures/aeo-category-root-migration-2026-07-18/report.json`.
- Caché Kinsta purgada después de ambas mutaciones.

## Riesgo residual

El módulo global de Related Posts intenta cargar una variante inexistente de la portada de `Surround Discovery`
y genera un `404`. No corresponde al body, portada ni media de este artículo y ya existía fuera de este cambio.
Las siete infografías y la portada Web agéntica no presentan recursos rotos. Se registra como deuda del módulo
relacionado, no como motivo para revertir esta publicación.

Las siete infografías complejas cuentan con ALT breve, caption y contexto HTML
adyacente, pero todavía no poseen una descripción larga dedicada equivalente a
toda su estructura. Esto no impide su publicación ni su descubrimiento, pero es
una deuda real de accesibilidad para lectores que no consumen la imagen; no debe
confundirse con indexación del SVG ni marcarse como resuelta por el ALT.

La ruta Think `/web-agentica` permanece como landing del ebook y no duplica el canonical ni el contenido del
artículo. Las rutas equivalentes al slug editorial en Think responden `404`.

El archive móvil de Ohio reporta `scrollWidth=396` con viewport `390`: el excedente nace del drawer global de
filtros/menú (`ordering-filters-holder` y labels off-canvas), no de las cards, el título o la jerarquía AEO. La
migración no lo amplificó y el render visible no presenta recorte; queda como deuda global del template de
archives, separada de este cambio taxonómico.
