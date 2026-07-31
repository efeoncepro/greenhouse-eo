# Creative Workflows FAQ Disclosure + Schema Decision V1

> Estado: publicado en producción como V6; `FAQPage` emitido desde FAQ semántica de Content Factory.
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
- Estado previo del post: `publish`, canonical vacío en meta porque Yoast emite el permalink público, robots
  indexable, un `yoast-seo/table-of-contents`, `21` headings H2/H3.
- Antes de la intervención FAQ, el HTML live no emitía `FAQPage`; el graph Yoast contenía `Article/BlogPosting`, `WebPage`, `ImageObject`,
  `BreadcrumbList`, `WebSite`, `Organization` y `Person`.

## Decisión

Usar una primitive semántica reusable de Content Factory (`kind: "faq"`) para esta clase de FAQ editorial:

- Mantener `Preguntas frecuentes` como único H2 y destino del TOC global.
- Declarar las preguntas y respuestas una sola vez en `items[]`.
- Renderizar cada pregunta como `summary` visible dentro de `core/details`.
- Renderizar cada respuesta completa como child block nativo, normalmente `core/paragraph`.
- Emitir un `FAQPage` JSON-LD desde el mismo `items[]`, dentro de un `core/html` gobernado.
- No agregar JavaScript custom, CSS global ni bloque custom.
- No permitir `core/html` como escape hatch: el validator sólo acepta `application/ld+json` parseable con `FAQPage`
  y bloquea preguntas de schema que no coinciden con un `summary` visible.
- No usar `core/accordion` para esta iteración porque su render usa WordPress Interactivity API, `button`,
  `region`, `inert` y estado runtime; es correcto cuando se necesita acordeón agrupado/exclusivo, pero más pesado
  que lo necesario para cuatro disclosures editoriales independientes.
- No usar `essential-blocks/accordion` porque es third-party y no mejora el contrato frente a core.
- No usar `yoast/faq-block` porque introduciría otro owner de UI/schema y rompería la fuente única de Content
  Factory.
- No crear todavía un bloque Gutenberg runtime propio (`efeonce/faq`): sería correcto si humanos necesitan autorar
  FAQs desde el editor sin pasar por Content Factory, pero exige plugin/theme runtime, editor JS, render PHP, deploy,
  migración y soporte. Para los posts agentic actuales, la fuente de verdad es la spec de Content Factory.

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
aunque el navegador lo muestre colapsado por defecto. El `FAQPage` se emite sólo porque las cuatro preguntas y
respuestas son visibles, editoriales y 1:1 con el contenido del artículo.

La implementación no promete rich result de Google: Google retiró la visualización de FAQ rich results en Search en
mayo de 2026 y removió su documentación en junio de 2026. `FAQPage` sigue siendo un tipo válido de Schema.org y en
este caso se usa como dato estructurado de contenido visible, no como promesa de snippet.

## Publicación y Validación Live

El cambio fue aplicado al post publicado el 2026-07-16 por WP-CLI gobernado, después de snapshot y guard de hash.

- Snapshot remoto: `/tmp/greenhouse-creative-workflows-251363-before-faq-details-20260716-053507.json`.
- Hash previo: `98299f2948f6671b89ebc50e03b846ba6f150be74c6cb61d37a7bee8847f67a3`.
- Hash posterior WordPress: `b6ef447a19f6b54353f415c25e8834d8eca41f5928e84cd56299e62ee5c67aa4`.
- Readback CMS: `core/details=4`, `core/heading=17`, `yoast-seo/table-of-contents=1`, `nonEmptyFreeformCount=0`, `mediaIssueCount=0`.
- Inspección profunda: `docs/operations/public-site-content-factory/post-deep-inspection-251363-2026-07-16T05-37-28+00-00.json`.
- QA anónima desktop `1440x1000` + mobile `390x844`: PASS, sin overflow, teclado abre el primer disclosure, consola limpia, canonical/robots/OG preservados.
- Schema live en ese corte: el graph conservaba `Article`, `BlogPosting`, `WebPage`, `BreadcrumbList`, `ImageObject`, `WebSite`, `Organization` y `Person`; `FAQPage=0`.

El 2026-07-16 se aplicó un segundo write autorizado para agregar el schema desde la nueva primitive semántica `faq`.

- Snapshot remoto previo al schema: `/tmp/greenhouse-creative-workflows-251363-before-faq-details-20260716-055050.json`.
- Hash previo al schema: `b6ef447a19f6b54353f415c25e8834d8eca41f5928e84cd56299e62ee5c67aa4`.
- Hash posterior WordPress: `829dce00785c373c1a182ebbb47aee2c64fc28d02a81506df7fd2a0520a50b09`.
- Readback apply: `core/details=4`, `core/html=1`, `FAQPage=1`, `faqQuestionCount=4`, `faqQuestionH3Count=0`, TOC presente.
- Cache Kinsta purgada: `Success: All caches were cleared`.
- Inspección profunda: `docs/operations/public-site-content-factory/post-deep-inspection-251363-2026-07-16T05-52-24+00-00.json`.
- QA anónima desktop `1440x1000` + mobile `390x844`: PASS; canonical, robots, OG, Article/Breadcrumb schema,
  teclado, mobile overflow y consola preservados. El schema live contiene `FAQPage=1`, `Question=4` y las cuatro
  preguntas del JSON-LD coinciden con los cuatro `summary` visibles.

## Validación Requerida Para Futuros Writes

Para otra actualización del post publicado:

1. Snapshot completo del post `251363`, Yoast/meta/media/taxonomía y contenido.
2. Rollback fail-closed revisado.
3. Write por ruta gobernada, nunca HTML libre pegado a mano.
4. Readback WP-CLI y comparación de bloque/TOC.
5. Purga de caché.
6. QA anónima desktop `1440x1000` y mobile `390x844`: contenido, toggles, foco, consola, schema, canonical, robots,
   TOC anchors y `scrollWidth <= clientWidth`.

Para futuros artículos, no duplicar FAQ visible y schema. Usar `kind: "faq"` en la spec cuando se quiera
`core/details` + `FAQPage` sincronizado; usar `kind: "details"` sólo para disclosures que no representan una FAQ
marcable como schema.
