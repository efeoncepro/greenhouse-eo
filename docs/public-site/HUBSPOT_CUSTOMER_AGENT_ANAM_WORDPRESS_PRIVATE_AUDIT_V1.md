# Customer Agent ANAM — auditoría del borrador privado en WordPress

> **Estado:** `private content complete; authenticated Ohio render pending`
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
- SHA-256 de la spec Gutenberg: `736ce5fe7a58cd210c416ccd4881a367c067223ec310b7a46ef432817e1cf596`.
- SHA-256 del contenido persistido: `ddcb45a25b999deff0b79dbfa6635be4fd13956b321834448d19bbd78e9c5536`.

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
