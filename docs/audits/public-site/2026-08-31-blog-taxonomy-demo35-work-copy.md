# Blog WordPress: taxonomía final y copia de trabajo Demo 35

> **Fecha de verificación:** 2026-08-31  
> **Runtime:** `https://efeoncepro.com` / WordPress Kinsta  
> **Alcance:** categorías, posts demo, redirects y copia de trabajo de la home  
> **Estado:** aplicado y verificado; la copia no está lista para reemplazar `/blog/`

## Resultado

- Se enviaron a papelera 20 posts explícitamente demo de Ohio.
- Se reclasificaron 11 posts reales antes de retirar 15 categorías descartadas.
- La categoría por defecto quedó en Marketing Digital (`17`).
- WordPress conserva 13 categorías canónicas:

| Categoría | ID | Slug | Padre | Posts |
| --- | ---: | --- | --- | ---: |
| AEO | 156 | `aeo` | — | 4 |
| Diseño | 196 | `design` | — | 2 |
| Diseño Web | 98 | `diseno-web` | Diseño | 1 |
| Glitch | 183 | `glitch` | — | 9 |
| Growth | 80 | `growth` | — | 1 |
| HubSpot | 19 | `hubspot` | — | 12 |
| Inbound Marketing | 96 | `inbound` | — | 10 |
| Inteligencia Artificial | 194 | `ai` | — | 2 |
| Loop Marketing | 155 | `loop-marketing` | — | 5 |
| Marketing Digital | 17 | `marketing-digital` | — | 6 |
| Redes Sociales | 202 | `social` | Marketing Digital | 0 |
| Novedades Efeonce | 116 | `novedades` | — | 2 |
| SEO | 106 | `seo` | — | 2 |

La jerarquía y el criterio editorial quedan fijados en
`docs/public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md`.

## Migraciones de URL

La mudanza de Diseño Web cambió el permalink del post `245091`:

- anterior: `/diseno-web/sitios-web-que-generan-resultados/`
- vigente: `/design/diseno-web/sitios-web-que-generan-resultados/`

Se preservaron sus categorías `[98, 96]` y la primaria Yoast `98`. El post
`245154` quedó con dos enlaces internos a la ruta nueva y ninguno a la anterior.

Redirects explícitos creados:

- `category/diseno-web` → `category/design/diseno-web`
- `diseno-web/sitios-web-que-generan-resultados` →
  `design/diseno-web/sitios-web-que-generan-resultados`
- `category/social` → `category/marketing-digital/social`
- `category/inbound/seo` → `category/seo`

Las URLs de posts demo eliminados responden mediante redirects Yoast `410`.
Tras el write se purgó caché y se verificaron rutas, canonical/`og:url`, H1 y
ausencia de overflow en 1440 y 390 px para archivos de control.

## Copia de trabajo Demo 35

| Campo | Fuente protegida | Copia de trabajo |
| --- | --- | --- |
| Page ID | `225984` | `251875` |
| Estado | publish | publish + `noindex` |
| URL | `/homedemo35-elementor/` | `/demo35-blog-magazine-copia-trabajo/` |
| Propósito | referencia Demo 35 | `demo35-blog-home-work-copy-v1` |
| Árbol | 7 raíces / 113 nodos | 7 raíces / 113 nodos |
| `_elementor_data` SHA-256 | `e63a70342e2cb83fae341637968ac05ccb30d0679438e143b8a8f3b047537394` | igual a la fuente en este corte |

La copia conserva marcador de origen `225984`, las metas Ohio equivalentes y
el backup `_gh_backup_before_demo35_work_copy_publish_20260831_231614`. No es la
home del blog ni está asignada como `page_for_posts`; esa opción sigue en `0`.

## Snapshots remotos

- `/tmp/efeonce-blog-category-cleanup-20260831-234011.json` —
  `66904c50e60f52e7322949e29744413bef5e990b26dfcf38fa99e8e3eb7bad13`
- `/tmp/efeonce-blog-category-cleanup-20260831-234059.json` —
  `05603235a3f44b584a98f55e9764f13ba71c08f4219aeee3582d49f6adfb2f6e`
- `/tmp/efeonce-category-label-hierarchy-20260831-235007.json` —
  `4c0e6b9674429fee9bc3c2bb67950212bbd366f54dfd13182ecb9bfe4ee79b10`
- `/tmp/efeonce-remaining-demo-posts-20260831-234256.json` —
  `1277a525957a0f02a5fd19cae0df13f941bc85560b30bab3fcf37760de9a92f7`
- `/tmp/efeonce-seo-root-ia-label-20260901-000046.json` —
  `37fa78075430edb26b628fb096b2ff23723d5a3589cc50f67f9de862b4eb0fe7`

## Pendientes reales

La copia de trabajo conserva copy, imágenes, enlaces y widgets Ohio de demo.
Como los IDs de posts demo ya no están publicados, algunos de sus 15 widgets
`ohio_recent_posts` quedan vacíos o incompletos. Antes del cutover hay que:

1. clasificar cada widget como curado manual, query canónica o eliminado;
2. reconectarlo a posts reales y a las categorías de PDR-019;
3. reemplazar banners `/demo35/category/*`, CTAs `#`, enlaces externos Ohio y
   el formulario de suscripción demo;
4. resolver el chrome de archivos Ohio, que aún muestra copy inglés/demo en
   algunas vistas;
5. completar QA visual, enlaces, teclado, responsive, SEO y medición;
6. obtener aprobación antes de convertir `/blog/` en esta experiencia.

