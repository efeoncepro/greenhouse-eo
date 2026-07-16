# Creative Workflows FAQ Disclosure Decision V1

> Estado: publicado en producción como V6; `FAQPage` no emitido.
> Fecha de decisión: 2026-07-15.
> Fecha de publicación: 2026-07-16.
> Post: `251363`.
> URL publicada: `https://efeoncepro.com/creative/creative-workflows/`.
> Spec base: `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json`.
> Spec publicada: `docs/public-site/CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V6.json`.

## Problema

La sección `Preguntas frecuentes` de la Pillar Creative Workflows está publicada como un H2 seguido por cuatro H3
y cuatro respuestas. La lectura funciona, pero alarga el tramo final del artículo y agrega las cuatro preguntas al
TOC global. En la captura del operador, la sección se percibe como demasiado larga para una FAQ editorial de cierre.

## Runtime Verificado

Inspección read-only por WP-CLI después de `pnpm public-website:ssh-check`:

- WordPress: `7.0.1`.
- Tema activo: `ohio-child`; parent `Ohio`.
- Plugins relevantes activos: Yoast SEO `28.0`, Yoast SEO Premium `27.7`, Essential Blocks `6.3.0`, Efeonce
  Editorial Blocks `0.1.0`.
- Bloques registrados relevantes: `core/details`, `core/accordion`, `essential-blocks/accordion`,
  `yoast/faq-block`, `yoast-seo/table-of-contents`.
- Estado actual del post: `publish`, canonical vacío en meta porque Yoast emite el permalink público, robots
  indexable, un `yoast-seo/table-of-contents`, `21` headings H2/H3.
- El HTML live actual no emite `FAQPage`; el graph Yoast contiene `Article/BlogPosting`, `WebPage`, `ImageObject`,
  `BreadcrumbList`, `WebSite`, `Organization` y `Person`.

## Decisión

Usar `core/details` gobernado por Content Factory para esta FAQ:

- Mantener `Preguntas frecuentes` como único H2 y destino del TOC global.
- Convertir cada pregunta en un `summary` visible dentro de un bloque `core/details`.
- Mover cada respuesta completa como child block nativo, normalmente `core/paragraph`.
- No agregar JavaScript custom, CSS global ni bloque custom.
- No usar `core/accordion` para esta iteración porque su render usa WordPress Interactivity API, `button`,
  `region`, `inert` y estado runtime; es correcto cuando se necesita acordeón agrupado/exclusivo, pero más pesado
  que lo necesario para cuatro disclosures editoriales independientes.
- No usar `essential-blocks/accordion` porque es third-party y no mejora el contrato frente a core.
- No usar `yoast/faq-block` en esta iteración porque introduciría un owner de FAQ schema distinto. Puede evaluarse
  después si una política SEO explícita decide emitir `FAQPage`; no debe añadirse sólo por tener una sección FAQ.

## TOC y Semántica

La alternativa elegida elimina los cuatro H3 de preguntas del outline global. Esto es intencional:

- el lector sigue pudiendo saltar a la sección por el H2 `Preguntas frecuentes`;
- las preguntas quedan visibles y accionables como controles nativos de disclosure;
- el TOC deja de sobre-representar una sección de soporte al final del artículo;
- no hay headings ocultos dentro de disclosures que creen tensión entre heading outline, TOC y estado colapsado.

Si en el futuro una FAQ necesita navegación directa por pregunta, evaluar `core/accordion` con `headingLevel=3` o
preguntas como H3 visibles, pero esa decisión debe regenerar/revisar TOC y QA de anchors.

## SEO, Schema y Crawlers

`core/details` guarda la pregunta y la respuesta completa en HTML. Los crawlers reciben el contenido en el documento,
aunque el navegador lo muestre colapsado por defecto. No se agrega JSON-LD manual ni `FAQPage` en esta iteración.
La regla vigente del runbook se mantiene: `FAQPage` sólo si las preguntas/respuestas visibles y la política SEO lo
justifican, sin duplicar el graph de Yoast.

## Publicación y Validación Live

El cambio fue aplicado al post publicado el 2026-07-16 por WP-CLI gobernado, después de snapshot y guard de hash.

- Snapshot remoto: `/tmp/greenhouse-creative-workflows-251363-before-faq-details-20260716-053507.json`.
- Hash previo: `98299f2948f6671b89ebc50e03b846ba6f150be74c6cb61d37a7bee8847f67a3`.
- Hash posterior WordPress: `b6ef447a19f6b54353f415c25e8834d8eca41f5928e84cd56299e62ee5c67aa4`.
- Readback CMS: `core/details=4`, `core/heading=17`, `yoast-seo/table-of-contents=1`, `nonEmptyFreeformCount=0`, `mediaIssueCount=0`.
- Inspección profunda: `docs/operations/public-site-content-factory/post-deep-inspection-251363-2026-07-16T05-37-28+00-00.json`.
- QA anónima desktop `1440x1000` + mobile `390x844`: PASS, sin overflow, teclado abre el primer disclosure, consola limpia, canonical/robots/OG preservados.
- Schema live: el graph conserva `Article`, `BlogPosting`, `WebPage`, `BreadcrumbList`, `ImageObject`, `WebSite`, `Organization` y `Person`; `FAQPage=0`.

## Validación Requerida Para Futuros Writes

Para otra actualización del post publicado:

1. Snapshot completo del post `251363`, Yoast/meta/media/taxonomía y contenido.
2. Rollback fail-closed revisado.
3. Write por ruta gobernada, nunca HTML libre pegado a mano.
4. Readback WP-CLI y comparación de bloque/TOC.
5. Purga de caché.
6. QA anónima desktop `1440x1000` y mobile `390x844`: contenido, toggles, foco, consola, schema, canonical, robots,
   TOC anchors y `scrollWidth <= clientWidth`.

El schema `FAQPage` sigue siendo una decisión separada: debe agregarse sólo si hay política SEO explícita,
preguntas/respuestas visibles 1:1 y un owner claro para no duplicar el graph de Yoast.
