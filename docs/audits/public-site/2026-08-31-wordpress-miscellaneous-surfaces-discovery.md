# Discovery de superficies misceláneas WordPress — 2026-08-31

## Alcance y estado

Auditoría read-only de las superficies especiales de `https://efeoncepro.com`:

- 404 y paginación inexistente;
- búsqueda con y sin resultados;
- categorías, tags, autor, fecha y taxonomías de portfolio;
- ownership efectivo entre WordPress, Ohio, `ohio-child` y Elementor Pro;
- HTTP, robots, canonical, schema, accesibilidad, responsive, chrome global y medición.

No se modificaron WordPress, Elementor, templates, opciones, caché, tracking ni el repositorio runtime. El
contrato técnico propuesto vive en
[`PUBLIC_MISCELLANEOUS_SURFACES_V1.md`](../../architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md).

## Evidencia utilizada

- Navegación anónima con Chromium en `1440x1000` y `390x844`.
- `curl` para status, robots, canonical y JSON-LD.
- WP-CLI remoto, después de `pnpm public-website:ssh-check`, para themes, plugins, templates y condiciones.
- Inspección read-only de Ohio `3.7.0`, `ohio-child` y el repositorio gobernado
  `/Users/jreye/Documents/efeonce-public-site-runtime`.
- Artefactos locales ignorados:
  `.captures/public-misc-discovery-2026-08-31/` y `tmp/inspect-public-misc-templates.php`.

## Runtime observado

| Componente | Estado observado |
| --- | --- |
| WordPress | `7.1` |
| Theme activo | `ohio-child` `1.0.0` |
| Parent | Ohio `3.7.0` |
| Elementor | `4.2.4` |
| Elementor Pro | `4.2.3` |
| Templates Elementor Library | 68: 38 section, 13 page, 13 kit, 3 container, 1 loop-item |
| Theme Builder especial | 0 templates 404/search/archive/single; 0 conditions |

## Resolución efectiva de templates

| Superficie | Template vivo | Observación |
| --- | --- | --- |
| 404 | parent `ohio/404.php` | No existe override `404.php` en child. |
| Búsqueda con resultados | parent `ohio/search.php` | Usa el grid y sidebar Ohio. |
| Búsqueda sin resultados | parent `ohio/search.php` → `parts/content-none.php` | El empty state habla siempre de “search terms”. |
| Categoría, tag, autor, fecha, format y portfolio taxonomy | parent `ohio/index.php` | No hay `archive.php`, `category.php`, `tag.php`, `author.php` ni `date.php`. |
| Formulario de búsqueda | parent `ohio/searchform.php` | Placeholder y nombre accesible en inglés; no exige término. |
| Headline de estas superficies | child `parts/elements/page_headline.php` | Contiene `Results for:` y `404. Nothing here`. |

WordPress cae correctamente por su template hierarchy. El fallback no debe reinterpretarse como ausencia de
ownership: hoy Ohio padre gobierna el documento y el child sólo sobreescribe headline/footer y CSS de soporte.

## Theme Builder: capacidad teórica, carril no probado

Elementor Pro documenta condiciones para 404, Search Results y Archives. Eso no significa que esta instalación
las gobierne:

- Ohio registra para Elementor únicamente `header` y `footer`;
- `header.php` y `footer.php` ejecutan esas locations;
- `404.php`, `search.php` e `index.php` no ejecutan `elementor_theme_do_location`;
- no hay templates ni conditions Theme Builder en la librería viva.

Conclusión: Theme Builder no es plug-and-play para estas superficies. Usarlo exigiría primero un spike de
compatibilidad y una integración explícita en `ohio-child`. Nunca delegar a un documento CMS el status HTTP,
robots, canonical, shell ni fallback de una 404.

## Matriz HTTP y SEO observada

| Superficie | HTTP | Robots | Canonical/schema |
| --- | --- | --- | --- |
| URL inexistente | `404` | `noindex, follow` | sin canonical; correcto |
| Paginación imposible | `404` | `noindex, follow` | correcto |
| Search con resultados | `200` | `noindex, follow` | sin canonical; `CollectionPage` + `SearchResultsPage` |
| Search sin resultados | `200` | `noindex, follow` | sin canonical; comportamiento correcto |
| Categoría | `200` | depende del término; categorías observadas indexables | canonical propio y `CollectionPage` |
| Categoría paginada | `200` | hereda la categoría | canonical propio + `rel=prev` observado |
| Autor | `200` | `index, follow` | canonical propio; `ProfilePage` + `Person` |
| Tag | `200` | `noindex, follow` | sin canonical |
| Fecha | `200` | `noindex, follow` | sin canonical |
| Portfolio taxonomy | `200` | `noindex, follow` | sin canonical |
| Taxonomía existente vacía `/type/audio/` | `200` | `noindex, follow` | H1 vacío y empty state incorrecto |

No aplicar `noindex` ni canonical de forma global a “misceláneas”. Cada query type conserva su contrato.
Feeds, sitemaps, `robots.txt` y otras superficies machine-readable quedan fuera del sistema visual.

## Hallazgos priorizados

### P0 — Contenido público con señal de borrador

`/?s=hubspot` expone la página
`/empodera-tu-crecimiento-con-hubspot-efeonce-borrador/`. La URL responde `200`, está `index, follow`, tiene
canonical propio y aparece en `page-sitemap.xml`. Requiere decisión editorial/SEO separada: corregir y mantener,
retirar/noindexar o redirigir según ownership. Un rediseño del buscador no resuelve este estado público.

### P0 — Chrome global y residuos Ohio/demo

Las superficies revisadas heredan enlaces y copy ajenos a Efeonce:

- Help Center y Submit Request de Colabrio/Ticksy;
- reviews de ThemeForest y “Get Figma Source File”;
- banner externo de customización WordPress;
- Facebook de Colabrio, Instagram con dominio incorrecto y Spotify `#`;
- `/terminos-y-condiciones` responde `404`;
- dirección pública desactualizada;
- `Staff Picks`, `Recent Comments`, `Recommended Topics`, `Read More` y `Follow Us` en inglés.

Es deuda global de footer/sidebar. Debe tener unidad y rollback propios; no duplicarla ni corregirla ocultamente
desde la 404.

### P1 — Recuperación, semántica y accesibilidad

- 404 y búsqueda vacía no tienen `<main>` ni `id="main"`; el skip link a `#main` queda roto.
- `Back` usa `href=""` y recarga la misma URL rota.
- Copy, placeholder y varios CTAs están en inglés aunque el documento declara `lang="es"`.
- El input no muestra foco visible suficiente.
- El hamburger contiene un elemento enfocable sin nombre.
- Axe detectó cinco enlaces sociales sin nombre discernible (`serious`).
- No se observaron fallas de contraste AA ni overflow en 404/search-empty a 390 px.

### P1 — La búsqueda no tiene política editorial

- `/?s=` vacío devuelve `200` y 154 contenidos.
- `hubspot` devuelve 53 resultados y mezcla posts/páginas, incluida la página con “(Borrador)”.
- Los tipos públicos registrados también permiten attachments, `e-landing-page`, `e-floating-buttons` y
  `ohio_portfolio`.
- El sidebar de 320 px comprime el grid desktop y mantiene residuos demo.

Se deben separar búsqueda global y búsqueda editorial/content hub. La primera necesita allowlist explícita de
tipos públicos; la segunda debe restringirse a `post` y taxonomías gobernadas.

### P1/P2 — Los archivos son superficies editoriales

- Categoría y autor pueden ser indexables y requieren introducción visible, metadata y enlaces internos.
- La biografía de autor existe en metadata/schema pero no es visible en el archivo.
- Tags/fechas pueden usar una variante compacta noindex, sin promover el tag cloud actual.
- Se observó overflow horizontal de hasta 34 px en categorías/tags/fecha por el drawer de filtros y textos fuera
  del viewport.

## Medición observada

- Container live: `GTM-NGHPGRLZ`.
- La 404 emite `page_view`.
- Search emite automáticamente `view_search_results` con `search_term`.
- No se observó clasificación específica de 404, `results_count`, éxito/vacío ni CTA de recuperación.

Una futura instrumentación debe ser diagnóstica, no key event: `page_type`, `results_count`, outcome y destino de
recuperación. No duplicar ni volver a emitir el término crudo si puede contener PII.

## Decisión de discovery

La propuesta correcta es un sistema por capas gobernado por `ohio-child`:

1. **Recovery Shell:** 404, search-empty y taxonomía existente vacía.
2. **Search Experience:** formulario, política de tipos, resultados, conteo y paginación.
3. **Editorial Archives:** categoría/autor indexables y tag/fecha compactos.
4. **Global Chrome:** footer/sidebar/datos institucionales en una unidad separada.

El runtime repo está sucio por WIP ajeno en `eo-elementor-widgets` y el reporte vigente declara
`fullRepoDeploySafe=false`. Una futura entrega debe ser un paquete acotado de `ohio-child`, nunca un deploy del
repo completo.

## Estado de cierre

- Discovery: completo.
- Arquitectura: propuesta/documentada; no implementada.
- Runtime: sin cambios.
- Rollout: no iniciado.
- Riesgos inmediatos: página pública “Borrador”, enlaces globales demo/rotos, búsqueda sin policy y overflow de
  archivos.

## Referencias oficiales de contraste

- [WordPress Template Hierarchy](https://developer.wordpress.org/themes/classic-themes/basics/template-hierarchy/)
- [Elementor Theme Builder display conditions](https://elementor.com/help/conditions/)
- [Elementor Search Results archive](https://elementor.com/help/customize-the-search-results-archive/)
