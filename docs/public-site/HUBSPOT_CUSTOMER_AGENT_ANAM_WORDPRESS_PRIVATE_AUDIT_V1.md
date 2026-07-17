# Customer Agent ANAM — auditoría del borrador privado en WordPress

> **Estado:** `private content + SEO + evidence package complete; authenticated Ohio render pending`
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
- SHA-256 de la spec Gutenberg: `11acacc807cc1b0cbc0f74eb1bfb42c26d10d71d5cf9826f817af6b0bee20599`.
- SHA-256 del contenido persistido: `6bfa99a5bbbc672ef5c9edd47041419bd687a17183462aa1b9e9bdec6b8554f2`.

## Evidencia externa y E-E-A-T

Tres líneas de investigación paralelas revisaron fuentes oficiales de HubSpot, estudios independientes y el
encaje editorial de cada dato. El ledger canónico es
[HUBSPOT_CUSTOMER_AGENT_ANAM_EVIDENCE_LEDGER_V1.md](./HUBSPOT_CUSTOMER_AGENT_ANAM_EVIDENCE_LEDGER_V1.md).

Se incorporaron sólo cuatro claims cuantitativos, con atribución, población y límite junto al dato:

- 386 casos analizados en dos experimentos sobre aclaración frente a error no resuelto;
- 74% de 6.182 consumidores en 22 países frustrado por repetir información durante la atención;
- 65% de resolución y 39% menos tiempo reportados por HubSpot entre más de 8.000 clientes activados;
- ventana de 72 horas usada por HubSpot para evaluar una resolución sin handoff.

Las cifras de HubSpot se identifican como resultados agregados informados por el fabricante y no como outcomes
de ANAM. La nota metodológica separa explícitamente evidencia externa de inventario, QA y estado operativo del
caso. No se añadieron proyecciones de mercado, porcentajes futuros ni un cálculo sintético de éxito de ANAM.
Las infografías no cambiaron porque representan evidencia propia del caso; mezclar benchmarks externos dentro de
ellas rompería esa frontera semántica.

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

- Content Factory: `PASS`, 114 bloques semánticos, 11 H2, 4 H3, TOC y media presentes.
- Inspección profunda: 32 enlaces, cero problemas de medios y cero bloques freeform no vacíos.
- Evidencia versionada vigente: [post-deep-inspection-251432-2026-07-17T18-06-00+00-00.json](../operations/public-site-content-factory/post-deep-inspection-251432-2026-07-17T18-06-00+00-00.json).
- La actualización visual guardó además el contenido anterior en el meta privado
  `_greenhouse_content_snapshot_before_visual_v2`, con hash
  `4bdd735edbf9794effbb99a835feaddf9b2ed2c8c1367c5cea1d9b152541414f`.
- Antes del ajuste final del meta title se guardó un snapshot SEO reversible en
  `_greenhouse_seo_snapshot_before_final_v1`.
- Antes de incorporar evidencia externa se guardó el contenido anterior en
  `_greenhouse_content_snapshot_before_evidence_v1`, con hash
  `ddcb45a25b999deff0b79dbfa6635be4fd13956b321834448d19bbd78e9c5536`.
- El reemplazo de la fuente Zendesk por su página oficial recuperable guardó un segundo snapshot en
  `_greenhouse_content_snapshot_before_evidence_link_hardening_v1`.
- Snapshot previo a metadata/medios: `/tmp/greenhouse-anam-customer-agent-251432-before-integration-20260717-171526.json` en el host WordPress, hash `ce6b64ccc450e349ea36621e76f6f2b7452a593a9cc47bd9a2312f45ac2a30a6`.

## QA visual privada

El contenido filtrado por WordPress se volvió a revisar después de incorporar la evidencia, en `1440×1000` y
`390×844`, tanto light como dark:

- un H1, 11 H2 editoriales y 4 H3;
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
