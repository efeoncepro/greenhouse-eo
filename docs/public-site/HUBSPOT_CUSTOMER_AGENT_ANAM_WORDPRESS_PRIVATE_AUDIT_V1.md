# Customer Agent ANAM — auditoría del borrador privado en WordPress

> **Estado:** `private content + SEO package complete; authenticated Ohio render pending`
> **Fecha:** 2026-07-17
> **Post:** `251432`
> **Publicación:** no autorizada ni ejecutada

## Resultado

El segundo artículo del caso ANAM quedó integrado como post privado en WordPress. La operación fue autorizada por
el operador en esta tarea después del commit editorial `f09ec6d3e`. No se envió nada a ANAM y no se publicó el
artículo.

- Título: `¿Qué necesita una IA para atender bien a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM`.
- Slug: `ia-atencion-cliente-caso-anam`.
- URL futura: `https://efeoncepro.com/hubspot/ia-atencion-cliente-caso-anam/`.
- Estado: `private`; el permalink respondió `404` sin autenticación.
- Autor: Julio Reyes (`1`).
- Categoría y primaria Yoast: HubSpot (`19`).
- Tags: ninguno.
- Robots: `noindex, follow`.
- Manifest: `greenhouse-cf-ia-atencion-cliente-caso-anam-v1`.
- SHA-256 de la spec Gutenberg: `b86fd1bf7dc9360441ce35e8392157014f4e494aa973180631050d2e7d8c5001`.
- SHA-256 del contenido persistido: `ddcb45a25b999deff0b79dbfa6635be4fd13956b321834448d19bbd78e9c5536`.

## Paquete SEO/AEO y distribución

- Meta title Yoast: `IA para atención al cliente: caso ANAM %%sep%% %%sitename%%`; la salida prevista es
  `IA para atención al cliente: caso ANAM - Efeonce`.
- Meta description: `Qué necesita una IA para atender bien a tus clientes: conocimiento, límites, pruebas y
  transferencia humana en el caso Customer Agent de ANAM.`
- Keyword principal: `IA para atención al cliente`.
- El H1 conserva la promesa editorial y el meta title concentra la intención de búsqueda; no se duplican por
  obligación mecánica.
- El excerpt, la categoría HubSpot y la categoría primaria Yoast están completos; no se añadieron tags sin una
  taxonomía editorial que los justifique.
- Open Graph y Twitter usan título y descripción propios, más el asset social `251418` de `1440×757`.
- El post privado conserva `noindex, follow`. El cambio a `index, follow` requiere el gate de publicación y no se
  ejecutó en esta operación.
- El override canonical queda vacío intencionalmente para que Yoast genere el self-canonical al publicar. No se
  puede certificar su HTML final mientras la URL privada responda `404` a visitantes anónimos.

### Contrato de schema

No se inyectó JSON-LD manual. El primer artículo publicado de la serie confirma que el stack actual de Yoast
compone un grafo conectado con `Article` + `BlogPosting`, `WebPage` + `ItemPage`, `BreadcrumbList`, `ImageObject`,
`WebSite`, `Organization` y `Person`. Este artículo comparte post type, autor, categoría y configuración, por lo
que se dejaron vacíos los overrides de tipo de página y artículo: forzar un segundo grafo crearía entidades
duplicadas y relaciones inconsistentes.

La entidad de autor está preparada como Julio Reyes y mantiene biografía y metadatos editoriales. La existencia
del grafo esperado es una inferencia fundada en el runtime publicado del artículo anterior, no evidencia del HTML
futuro de este post. Después de publicar deben verificarse en vivo los tipos, `@id`, relaciones de autor/editor,
imagen, fechas, breadcrumbs y canonical.

Yoast 28 no expone un campo nativo para `og:image:alt` o `twitter:image:alt`. Los attachments featured y social sí
tienen ALT; no se añadió un parche frágil al runtime para fabricar esas etiquetas.

## Medios e integración visual

- Featured: `251417`, WebP `1600×900`.
- Open Graph/Twitter: `251418`, JPEG `1440×757`.
- Conocimiento gobernado v2: `251434–251437`.
- Conversación mixta y handoff v2: `251438–251441`.
- Cadena de evidencia e interrupción v2: `251442–251445`.
- El cuerpo contiene tres bloques `core/image`, tres elementos `<picture>` y nueve `<source>`.
- Cada concepto mantiene un solo ALT y caption; las variantes se seleccionan por viewport y tema.
- Todos los attachments consultados respondieron `200` con el MIME esperado.

Las piezas v2 reemplazan las primeras infografías, que repetían tablas o clasificaciones ya explicadas por el
artículo. Ahora cada visual tiene un trabajo editorial propio: transformar fuentes en un contrato de respuesta,
reconstruir una conversación con cambio de responsabilidad y separar evidencia disponible de prueba runtime.
Las versiones v1 se conservaron como antecedente y ya no aparecen en el cuerpo del post.

Durante la importación se produjo una copia diagnóstica idéntica del hero (`251431`). Se comparó su SHA-256 con
el attachment canónico `251417` y se eliminó permanentemente sólo la copia creada por esta operación.

## Validación y readback

- Content Factory: `PASS`, 108 bloques semánticos, 11 H2, 3 H3, TOC y media presentes.
- Inspección profunda: 24 enlaces, cero problemas de medios y cero bloques freeform no vacíos.
- Evidencia versionada vigente: [post-deep-inspection-251432-2026-07-17T17-47-24+00-00.json](../operations/public-site-content-factory/post-deep-inspection-251432-2026-07-17T17-47-24+00-00.json).
- La actualización visual guardó además el contenido anterior en el meta privado
  `_greenhouse_content_snapshot_before_visual_v2`, con hash
  `4bdd735edbf9794effbb99a835feaddf9b2ed2c8c1367c5cea1d9b152541414f`.
- Antes del ajuste final del meta title se guardó un snapshot SEO reversible en
  `_greenhouse_seo_snapshot_before_final_v1`.
- Snapshot previo a metadata/medios: `/tmp/greenhouse-anam-customer-agent-251432-before-integration-20260717-171526.json` en el host WordPress, hash `ce6b64ccc450e349ea36621e76f6f2b7452a593a9cc47bd9a2312f45ac2a30a6`.

## QA visual privada

El contenido filtrado por WordPress se revisó en `1440×1000` y `390×844`, tanto light como dark:

- un H1, 11 H2 editoriales y 3 H3;
- tres figuras, tres `<picture>` y tres captions;
- fuente desktop/móvil y light/dark correcta en los cuatro escenarios;
- cero imágenes rotas;
- dimensiones intrínsecas presentes;
- cero overflow horizontal.

La evidencia visual local vive en `tmp/anam-customer-agent-private-qa/` y está ignorada por Git. Esta prueba no
incluye el template Ohio completo porque no existe una sesión visual autenticada disponible en el carril actual.
No se abrió una ventana pública como sustituto: el estado correcto es `authenticated Ohio render pending`.

## Frontera editorial y operativa

El artículo conserva explícitamente que el Customer Agent estaba configurado y probado en vista previa, pero no
verificado para conversaciones nuevas en operación real al corte. También mantiene el bloqueo administrativo de
facturación sin exponer montos ni datos sensibles. Nada en esta integración convierte al agente en activo.

Para publicar todavía se requiere autorización humana explícita, snapshot/rollback de publicación, QA live,
canonical/indexación final y comprobación del template público. No ejecutar `publish` a partir de este estado.
