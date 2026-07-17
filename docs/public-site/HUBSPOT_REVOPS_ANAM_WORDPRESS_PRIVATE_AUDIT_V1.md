# Caso ANAM — Auditoría WordPress privada V1

> **Fecha/corte:** 2026-07-17 05:40 CLT.
> **Estado:** publicado y verificado; este documento conserva la auditoría de la fase privada y el cierre live.
> **Post WordPress:** `251397`.
> **Manifest:** `greenhouse-cf-dashboards-hubspot-confiables-caso-anam-v1`.
> **Autor:** Julio Reyes, WordPress user `1`.
> **Publicación:** no autorizada.

## Resultado

El artículo fue ensamblado con Content Factory desde
[`HUBSPOT_REVOPS_ANAM_GUTENBERG_SPEC_V1.json`](HUBSPOT_REVOPS_ANAM_GUTENBERG_SPEC_V1.json) y creado como una
única entrada privada en WordPress. La ruta futura es
`https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/`; una solicitud anónima devuelve `404`.

La categoría canónica es `HubSpot` (`19`), también fijada como categoría primaria de Yoast. El post conserva
`noindex`, la frase clave de trabajo `dashboards confiables en HubSpot`, el autor humano correcto y el manifest
idempotente. Repetir el create con el mismo manifest devolvió `already_exists` para el mismo post `251397`.

## Evidencia de authoring y readback

- Validación Content Factory: `pass`.
- Draft: `78` bloques semánticos gobernados.
- Readback WordPress: `155` entradas raw por `77` separadores `core/freeform` vacíos; `nonEmptyFreeformCount=0`.
- Estructura: `10` H2, TOC Yoast poblado, `5` listas, `1` tabla, `3` quotes y `3` pullquotes.
- Enlaces observados: `16`; incluye fuentes de ANAM/Grupo Aguas, perfil oficial de HubSpot Solutions Partner,
  documentación HubSpot y CTA interno gobernado.
- Media issues: `0`; la pieza todavía no tiene media editorial asignada.
- Canonical futura en WordPress y rutas candidatas en Think: sin duplicados observados antes del create.
- Inspecciones:
  - [`post-deep-inspection-251397-2026-07-17T09-38-31+00-00.json`](../operations/public-site-content-factory/post-deep-inspection-251397-2026-07-17T09-38-31+00-00.json), estado inicial `Uncategorized`.
  - [`post-deep-inspection-251397-2026-07-17T09-39-46+00-00.json`](../operations/public-site-content-factory/post-deep-inspection-251397-2026-07-17T09-39-46+00-00.json), categoría `HubSpot` reconciliada.

## Snapshot y rollback

Antes de enriquecer taxonomía y metas se guardó un snapshot remoto completo en
`/tmp/greenhouse-anam-post-251397-before-private-enrichment-20260717T0940Z.json`, SHA-256
`5cd1c3691abb4b7c3e5d82a4524e47b26a7b5c97ef6552822b67011be34df4e0`. La operación y el rollback fueron
preparados con guards de post ID, status `private`, author `1`, ownership y manifest. No se ejecutó rollback
porque el readback posterior coincidió.

## Pendientes antes de pedir publicación

- Revisión autoral de Julio sobre primera persona, motivo de manzanitas, cierre, CTA y disclosure.
- Confirmación final de ANAM para las cifras exactas y la descripción institucional.
- Validación por dos o tres revisores del oficio de la escala de confianza y el checklist.
- ~~Producción del [sistema visual editorial](HUBSPOT_REVOPS_ANAM_VISUAL_SYSTEM_V1.md): featured/OG, diagramas, ALT, Media Library y preview social.~~ Completado con `ANAM-V01–V04` y media `251399–251412`.
- ~~Render privado autenticado desktop/mobile, TOC, tabla, enlaces y overflow.~~ Completado en `1440×1000` y `390×844`, light/dark, sin overflow ni media rota.
- Auditoría de `Person`, schema, canonical, robots y Open Graph sobre la versión final.
- Approval packet con hash y autorización humana separada para cambiar `private` a `publish`.

## Contrato de metadata aprobado para revisión privada

- Slug: `dashboards-hubspot-confiables-caso-anam`.
- URL futura: `https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/`.
- Categoría y categoría primaria Yoast: `HubSpot` (`19`).
- Tags: ninguno.
- Focus keyphrase: `dashboards confiables en HubSpot`.
- SEO title: `Dashboards confiables en HubSpot: el caso ANAM %%sep%% %%sitename%%`.
- Open Graph/Twitter title: `Un dashboard no arregla un proceso comercial | Caso ANAM`.
- Meta description: `Cómo acompañamos a ANAM a ordenar procesos, datos y automatizaciones en HubSpot antes de separar KPI oficiales, diagnósticos y pilotos.`
- Open Graph/Twitter description: `El caso ANAM muestra por qué un dashboard confiable comienza antes del gráfico: en el proceso, los datos y los límites de cada indicador.`
- Excerpt: `ANAM pidió mejores paneles, KPI y automatizaciones. El trabajo real comenzó antes: entender su proceso, contrastarlo con el CRM y separar qué podía ser KPI, diagnóstico o piloto.`

La categoría `HubSpot` se conserva porque gobierna el permalink, breadcrumb, archivo y `articleSection`. `RevOps`
se explica dentro del artículo, pero no se crea como categoría ni tag aislado.

### Aplicación y readback

El contrato se aplicó al post privado `251397` el 2026-07-17 y tuvo readback independiente a las
`10:04:08 UTC`. Antes del cambio se creó el snapshot remoto restaurable
`/tmp/greenhouse-anam-post-251397-before-metadata-v2-20260717-100255.json`, SHA-256
`45089d86b94c3d7eb275015445d99086653bc33bc84467096adfe4d2fbaad574`.

- Estado posterior: `private`; autor `1`; categoría `19`; tags vacíos; `noindex=1`.
- El hash del contenido permaneció sin cambios:
  `9b4298227438bbabc4ca1513d9e234e4df5ea7523d49dfaad04f4c0351e2bf55`.
- El readback confirmó excerpt, SEO title/description, focus keyphrase y campos Open Graph/Twitter.
- La URL futura respondió `404` en una solicitud anónima posterior al cambio.
- Featured/OG image sigue pendiente: `featuredMedia=0`; se resolverá con el sistema visual antes de publicar.

## Integración visual privada V2

El 2026-07-17 se tomó el snapshot remoto restaurable
`/tmp/greenhouse-anam-post-251397-before-visual-integration-20260717-110031.json`, SHA-256
`1dad80c6fb9cdae35040effcbb6bd34e32f469f3388d1fe1c61b7809f277dc1b`, antes de mutar el artículo. El contenido
de origen tenía SHA-256 `9b4298227438bbabc4ca1513d9e234e4df5ea7523d49dfaad04f4c0351e2bf55`.

- Featured WebP: `251399`; Open Graph/Twitter JPEG: `251400`.
- V02: principal `251401`, variantes responsive/theme `251402–251404`.
- V03: principal `251405`, variantes responsive/theme `251406–251408`.
- V04: principal `251409`, variantes responsive/theme `251410–251412`.
- Readback: `3` bloques `core/image`, `3` elementos `<picture>`, `9` fuentes art-directed, `0` media issues y
  `nonEmptyFreeformCount=0`.
- Inspección profunda: `post-deep-inspection-251397-2026-07-17T11-03-33+00-00.json`.
- QA privado: desktop/mobile × light/dark; selección de fuentes correcta, imágenes cargadas y
  `scrollWidth === clientWidth`.
- Prueba anónima posterior: la futura URL siguió respondiendo `404`; los assets públicos respondieron `200` con
  MIME y bytes esperados.

Un segundo snapshot antes de declarar dimensiones intrínsecas quedó en
`/tmp/greenhouse-anam-post-251397-before-visual-integration-20260717-110738.json`, SHA-256
`8d87a35c2e22b4ed7c720b648fe6a26234a937f2ba32da51f9702d1bdd221a03`. El readback final confirmó tres pares
`width/height`, hash de contenido `9fa2adc32896c48c6939ab682fc871c987519aec5bdf4e0b523225e03b25c8c0` y la inspección
`post-deep-inspection-251397-2026-07-17T11-08-05+00-00.json` sin media issues.

Hasta resolver revisión/autorización final de publicación, el estado correcto es
`private content complete; publication pending`; no `publicado` ni `indexado`.

## Cierre de publicación — 2026-07-17

El operador autorizó explícitamente reemplazar la portada por V6 y publicar el post `251397`. Se ejecutó por el
carril Kinsta SSH/WP-CLI después de `public-website:ssh-check`:

- snapshot recuperable remoto:
  `/tmp/greenhouse-anam-post-251397-before-v6-publish-20260717-122140.json`;
- snapshot SHA-256: `32b63321fab1e64ca4fc1002e39be3cbf4571b71c735d590c0fceecfa2974333`;
- featured V6: media `251415`, WebP `1600×900`, SHA-256
  `7cbf478784c10032a1b67a8cca87e9f340ff0b11f9dffe5ccf80209d6c3e1baf`;
- Open Graph/Twitter V6: media `251416`, JPEG `1440×757`, SHA-256
  `51027f07b57bfc92193cebcfb2630dd8ebc68aa38f55a36855df675fc401e468`;
- contenido preservado con SHA-256
  `9fa2adc32896c48c6939ab682fc871c987519aec5bdf4e0b523225e03b25c8c0`;
- estado final `publish`, autor `1`, categoría `19`, tags vacíos y cache Kinsta purgada.

Readback live:

- URL canónica: `https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/`;
- respuesta anónima `200`, canonical único, robots `index, follow`;
- schema `Article`/`BlogPosting`, `WebPage`, `BreadcrumbList`, `Organization` y `Person`;
- OG/Twitter `1440×757` apuntando a media V6;
- TOC con diez anchors únicos y resolubles;
- cero imágenes rotas después de activar lazy loading con scroll;
- cero errores de consola/página y cero overflow en `1440×1000` y `390×844`;
- crop central real de la tarjeta de archivo: `258×258` desktop y `358×358` móvil, `object-fit:cover` y
  `object-position:50% 50%`;
- nueve URLs HTTP del artículo respondieron `200`; no existe copia equivalente en Think (`404`).

Evidencia visual y reportes:
`.captures/anam-public-v6-2026-07-17/`. Inspección post-publicación:
`docs/operations/public-site-content-factory/post-deep-inspection-251397-2026-07-17T12-30-02+00-00.json`.
