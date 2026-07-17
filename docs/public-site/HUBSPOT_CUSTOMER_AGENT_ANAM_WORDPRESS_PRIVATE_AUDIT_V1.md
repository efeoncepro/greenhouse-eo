# Customer Agent ANAM — auditoría WordPress privada y cierre de publicación

> **Estado:** `publicado y verificado`; este documento conserva la auditoría privada y el cierre live
> **Fecha:** 2026-07-17
> **Post:** `251432`
> **Publicación:** autorizada y ejecutada el 2026-07-17

## Resultado de la fase privada

El segundo artículo del caso ANAM quedó integrado inicialmente como post privado en WordPress. Esa operación fue
autorizada por el operador en esta tarea después del commit editorial `f09ec6d3e`. En esa fase no se envió nada a
ANAM ni se publicó el artículo; el cierre live se documenta más adelante.

- Título: `¿Qué necesita una IA para atender bien a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM`.
- Slug: `ia-atencion-cliente-caso-anam`.
- URL prevista en esa fase: `https://efeoncepro.com/hubspot/ia-atencion-cliente-caso-anam/`.
- Estado de esa fase: `private`; el permalink respondió `404` sin autenticación.
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

Este fue el estado previo a la autorización final. La publicación, sus guards, el rollback preparado y la
verificación anónima quedaron registrados en el cierre siguiente.

## Cierre de publicación — 2026-07-17

El operador autorizó explícitamente publicar y luego hacer commit. La publicación se ejecutó sobre el mismo post
`251432`, sin crear una segunda entrada y después de aprobar `public-website:ssh-check`.

- Snapshot recuperable previo a publicación:
  `/tmp/greenhouse-anam-customer-agent-251432-before-publish-20260717-180700.json`.
- SHA-256 del snapshot:
  `464f3a8f34628beeb562044905061c8eea7935550d9ecaa641be70235b644b07`.
- Rollback preparado: restaurar `private`, `noindex` y el estado completo registrado en el snapshot.
- Estado final: `publish`; autor `1`; categoría `19`; categoría primaria Yoast `19`; tags vacíos.
- Featured: `251417`; Open Graph/Twitter: `251418`.
- Contenido publicado inicialmente con SHA-256
  `6bfa99a5bbbc672ef5c9edd47041419bd687a17183462aa1b9e9bdec6b8554f2`.
- Spec Gutenberg de la aprobación inicial con SHA-256
  `11acacc807cc1b0cbc0f74eb1bfb42c26d10d71d5cf9826f817af6b0bee20599`.
- Cache Kinsta purgada después del cambio.

### Verificación live

La URL pública es
`https://efeoncepro.com/hubspot/ia-atencion-cliente-caso-anam/`. Dos lecturas anónimas sin cache y cuatro renders
Playwright devolvieron `200` estable y confirmaron:

- un canonical único y exacto, sin redirect ni copia pública equivalente detectada en Think;
- robots `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` y ausencia de `noindex`;
- meta title renderizado `IA para atención al cliente: caso ANAM - Efeonce`;
- Open Graph `article` y Twitter `summary_large_image`, ambos con el JPEG social `1440×757`;
- grafo Yoast con `Article` + `BlogPosting`, `WebPage` + `ItemPage`, `ImageObject`, `BreadcrumbList`, `WebSite`,
  `Organization` y `Person`; autor `Julio Reyes` y `articleSection: HubSpot`;
- un H1, once H2 editoriales, cuatro H3 y quince anchors de TOC únicos y resolubles;
- tres figuras, tres `<picture>`, tres captions y selección correcta de variantes desktop/móvil × light/dark;
- cero imágenes rotas, cero errores de consola, cero errores de página y cero overflow horizontal en
  `1440×1000` y `390×844`;
- presencia literal de las fronteras sobre 23 fuentes, tres intenciones, pruebas, handoff, seis limitaciones,
  bloqueo de facturación y estado no operativo del agente al corte.

La tarjeta editorial aparece con título, featured y ALT correcto en el archivo de HubSpot, sin overflow en
desktop ni móvil. La URL ya figura en `post-sitemap.xml`. Las diez URL HTTP únicas del artículo respondieron
`200`, incluidas las fuentes oficiales de HubSpot, DOI, Zendesk, el primer artículo ANAM y los medios.

El readback autenticado final quedó versionado en
[post-deep-inspection-251432-2026-07-17T18-15-26+00-00.json](../operations/public-site-content-factory/post-deep-inspection-251432-2026-07-17T18-15-26+00-00.json):
estado `publish`, 227 bloques inspeccionados, 32 enlaces, cero problemas de medios y cero `core/freeform` no
vacíos. La evidencia visual y los reportes locales viven en
`.captures/anam-customer-agent-public-2026-07-17/` y permanecen ignorados por Git.

### Corrección post-publicación de la nota de autoría

El primer render público reveló que la nota de autoría todavía decía `Este borrador` y trataba la aprobación de
publicación como un evento futuro. Se corrigió únicamente ese párrafo para reflejar el estado real, manteniendo el
disclosure de apoyo de IA y la dirección editorial humana.

- Snapshot recuperable:
  `/tmp/greenhouse-anam-customer-agent-251432-before-authorship-note-20260717.json`.
- SHA-256 del snapshot:
  `e064fb64bcb5d1dc5bd269b645f87bd8e9740608e4fd35f92bceff7d5fda2e7b`.
- SHA-256 final del contenido:
  `845f31055ef18c95328a104fb768410963ac030f73241986ee53efd79f718b42`.
- SHA-256 final de la spec Gutenberg:
  `c997280a96e50b3b06b50b6623d8e90113719bfdf657daf2641f8042d6ff1c6b`.
- La spec local quedó sincronizada con la política pública `index`.
- Cache Kinsta purgada y readback anónimo confirmado con la nota final visible.

Después de la corrección se repitieron los cuatro renders, las dos lecturas sin cache y la inspección profunda.
Canonical, robots, schema, metadata social, TOC, imágenes art-directed, contenido crítico y responsive conservaron
el mismo resultado satisfactorio.

## Estado operativo que el artículo preserva

Publicar el artículo no modifica el runtime del Customer Agent. El texto continúa afirmando, de manera visible y
verificada, que estaba **configurado y probado en vista previa, pero no operativo para conversaciones nuevas al
corte** por una dependencia administrativa de facturación. No se presenta el agente como activo ni se atribuyen
a ANAM los resultados agregados informados por HubSpot.
