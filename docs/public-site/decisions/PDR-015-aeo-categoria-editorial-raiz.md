# PDR-015 — AEO como categoría editorial raíz

> **Tipo:** Product Decision Record (arquitectura editorial + taxonomía + URL del sitio público).
> **Estado:** Accepted — 2026-07-18 (operador).
> **Skills:** `efeonce-public-site-wordpress`, `content-marketing-studio`, `seo-aeo`.
> **Complementa:** [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
> **Evidencia de ejecución:** [cierre de publicación Web agéntica](../../audits/public-site/2026-07-18-web-agentica-pillar-publication.md).

## Decisión

**AEO (`term_id=156`) es una categoría editorial raíz del blog público, no una
subcategoría de Loop Marketing.**

Su archivo canónico es `https://efeoncepro.com/category/aeo/` y los posts que la
declaran como categoría primaria viven bajo `/aeo/<post-slug>/` mientras la
estructura de permalinks sea `/%category%/%postname%/`.

Esta decisión no cambia la arquitectura comercial fijada por PDR-002:

- `/aeo/` y `/category/aeo/` pertenecen al carril editorial/archivo;
- la landing comercial vigente sigue siendo `/aeo-2/` hasta el cutover aprobado
  a `/servicios/aeo/`;
- un artículo pillar puede sostener una landing de servicio mediante enlaces
  bidireccionales, pero no adopta su intención transaccional ni su canonical.

## Por qué

La web agéntica, la citabilidad en motores de IA y la preparación AEO forman un
territorio editorial propio. Subordinarlos a Loop Marketing introducía una
jerarquía conceptual innecesaria y convertía la ruta de los artículos en una
afirmación de producto que ya no representa el contenido. La categoría raíz
acorta el permalink, mejora la lectura del breadcrumb y permite que el cluster
crezca sin depender de una categoría madre ajena a su tesis.

## Consecuencias operativas

- La categoría primaria Yoast, no solo la asignación de categorías, determina
  qué posts cambian de URL.
- Toda futura mutación de padre o slug es una migración de rutas: requiere
  inventario, snapshot, rollback, redirects de posts y archivo, actualización de
  enlaces propios, purge y QA live.
- Con Yoast SEO Premium, los redirects explícitos se gestionan mediante
  `WPSEO_Redirect_Manager`; el readback se compara con rutas normalizadas sin
  slash inicial/final.
- Canonical, `og:url`, BreadcrumbList, cards y sitemaps deben converger en la
  ruta nueva antes de declarar el cambio completo.
- Los enlaces controlados por Efeonce apuntan directamente al canonical vigente;
  un 301 es compatibilidad y preservación de equity, no la ruta interna normal.
- La página `/desarrollo-sitios-web/` y el pillar Web agéntica mantienen enlaces
  recíprocos porque cumplen roles distintos: conversión y autoridad editorial.

## Migración aceptada

El 2026-07-18 AEO fue promovida con `wp_update_term()` desde Loop Marketing
(`155`) a raíz. Se crearon cuatro 301 explícitos: tres posts con AEO como
primaria y el archivo histórico `/category/loop-marketing/aeo/`. El post
SEO+AEO cuya primaria sigue siendo Loop Marketing no cambió de URL.

## Alternativas descartadas

- **Mantener AEO bajo Loop Marketing:** conserva una jerarquía editorial que no
  describe el territorio ni la navegación buscada.
- **Crear una segunda categoría AEO raíz:** fragmenta archivo, sitemap, equity y
  gobierno; la mutación correcta preserva el término existente.
- **Confiar solo en redirects automáticos:** no garantiza archivo, enlaces
  internos, breadcrumbs ni reversibilidad explícita.
- **Usar `/aeo/` como landing comercial:** mezcla archivo y servicio, contradice
  PDR-002 y crea ambigüedad de intención/canonical.

## Reversibilidad

La reversión debe restaurar el padre del término y el inventario previo de
redirects desde los snapshots registrados en la auditoría. No se revierte por
SQL directo ni eliminando la categoría raíz para recrearla.
