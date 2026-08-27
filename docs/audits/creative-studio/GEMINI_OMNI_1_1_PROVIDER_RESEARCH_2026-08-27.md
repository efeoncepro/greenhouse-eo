# Gemini Omni 1.1 Flash — investigación de proveedor e impacto en Globe

**Fecha de corte:** 2026-08-27  
**Estado:** investigación documental verificada; no demuestra acceso, integración ni disponibilidad en Globe  
**Decisión habilitada:** diseñar y ejecutar `TASK-1781` sin sustituir la identidad de la ruta vigente ni heredar evidencia entre superficies  
**Método:** fuentes primarias de Google abiertas y verificadas el 2026-08-27, contraste adversarial de nombres, API, límites, precio, términos y deprecación

## Resumen ejecutivo

Google lanzó **Gemini Omni 1.1 Flash** el 2026-08-27. “Gemini Omni 1.1” es una abreviación, no el nombre ni la
identidad ejecutable completa. El release amplía materialmente el control de video: generación desde texto,
imagen y referencias; first/last frame; edición; extensión; referencias de video; audio nativo; 360p, 720p,
1080p y 4K; y Content Credentials C2PA.

La integración no es un reemplazo de string. Google publica dos identidades oficiales distintas:

| Superficie | Identidad oficial | Estadio observado | Consecuencia |
|---|---|---|---|
| Gemini Developer API / Google AI Studio | `gemini-omni-1.1-flash` | modelo publicado; sin fecha de shutdown anunciada | requiere auth, endpoint, términos y canary propios |
| Gemini Enterprise Agent Platform / Google Cloud | `gemini-omni-1.1-flash-preview` | Generative AI Preview; fixed quota | es la candidata natural para el carril Vertex/Cloud de Globe, pero sigue siendo una identidad distinta |
| Ruta vigente de Globe | `gemini-omni-flash-preview` | runtime authority: reader live; proveedor anuncia shutdown 2026-09-30 | requiere migración gobernada; no se reescribe evidencia histórica |

Google recomienda `gemini-omni-1.1-flash` como reemplazo del modelo anterior en Gemini API y anuncia shutdown de
`gemini-omni-flash-preview` para el **2026-09-30**. La documentación Cloud, en cambio, nombra la variante
`-preview`. Esta diferencia es un gate, no una errata que Globe pueda normalizar por intuición.

## Claims verificadas

| Claim | Evidencia primaria | Confianza | Condición de revalidación |
|---|---|---:|---|
| Lanzamiento el 2026-08-27 | anuncio Google + catálogo Cloud + deprecations Gemini API | alta | antes de implementación si cambia el release note |
| Nombre completo Gemini Omni 1.1 Flash | anuncio y fichas oficiales | alta | ninguna para naming humano |
| IDs distintos según superficie | Gemini API deprecations y ficha Cloud | alta | probar ambos endpoints; no inferir alias |
| Cloud soporta texto, imagen y video como entrada y video/texto como salida | ficha y guías Cloud | alta | audio input es contradictorio entre narrativa, pricing y ficha; tratarlo como desconocido/no soportado hasta canary |
| T2V, I2V, referencias, first/last frame, edit y extend | ficha y guías de operación Cloud | alta | un canary separado por operación |
| Salida de 3–10 s; extensión hasta 40 s acumulados | guías de generación/extensión y anuncio | alta | revalidar por operación y superficie |
| 360p/720p/1080p/4K, 16:9 y 9:16 | ficha y guías Cloud | alta | verificar si 4K es generación directa o upscale en el endpoint exacto |
| Hasta 10 imágenes y 3 videos por prompt en la ficha de modelo | ficha Cloud | alta | la guía específica puede imponer límites más estrechos por task |
| Video input máximo 10 s; referencias de video descritas por el anuncio como hasta 3 s | ficha Cloud + anuncio | alta | distinguir input general de `reference_to_video` |
| Requests síncronos o async; async retenido hasta 14 días | guías Interactions | alta | verificar retención y delete/cleanup antes de datos cliente |
| C2PA automático para outputs creados o modificados | Content Credentials oficial | alta | validar manifest en bytes retenidos; C2PA no equivale a rights clearance |
| Preview Cloud admite uso comercial/producción y disclosure a terceros bajo contrato aplicable | ficha Cloud + supplementary terms | alta | nueva atestación legal por ID/superficie/digest; validar con abogado habilitado |
| Cloud pricing: input USD 1.50/M tokens; texto USD 9/M; video USD 17.50/M | pricing Agent Platform | alta | snapshot antes de estimate/rate; precio no equivale a Studio Credits |
| Tokens de video output: 1,931/s 360p; 5,792/s 720p; 8,688/s 1080p; 17,376/s 4K | pricing Agent Platform | alta | verificar factura y rounding con canary |
| PayGo figura no soportado y fixed quota soportado en la ficha Cloud | ficha Cloud | alta | resolver acceso/capacidad antes del primer gasto |
| Región Cloud `global`; no garantiza residencia geográfica | ficha de modelo + locations | alta | bloquear cuando el workload exija residencia/control regional |
| Modelo anterior tiene shutdown 2026-09-30 en Gemini API | deprecations Gemini API | alta | monitorear release notes; diseñar rollback sin depender del modelo retirado |
| Developer API lista 1.1 como Stable con contexto de 1.048.576; Cloud `-preview` publica 131.072/57.920 | fichas oficiales por superficie | alta | jamás compartir manifest de límites entre superficies |
| 1080p y 4K son upscaled | referencia técnica Gemini API | alta | no describirlos como generación nativa 4K |

## Matriz de capacidades y efecto contractual

| Operación de proveedor | Forma observada | Contrato Globe requerido | Estado hoy |
|---|---|---|---|
| `text_to_video` | texto → video/audio | routeId propio o binding exacto con constraints | candidato; no publicado por esta investigación |
| `image_to_video` | imagen + texto → video/audio | input role y cardinalidad exactos | candidato |
| `reference_to_video` | imágenes y/o videos + texto | separar referencias de imagen y video; hashes/rights por input | candidato; la ruta vigente sólo declara imágenes |
| first/last frame | dos keyframes + texto | `video-frames`, orden y roles start/end | candidato; no hereda el canary de Veo |
| `edit` | video + texto, sync o async | `video-edit`, parent/child lineage, preservation/audio policy | candidato; ownership de `TASK-1573` debe reconciliarse |
| `extend` | video previo + texto, 24 fps, hasta 40 s acumulados | `video-extend`, continuidad, cumulative cap, cobro por child | candidato |
| stateful continuation | `previous_interaction_id` en ejemplos Developer API | identidad de superficie, retención y chainability exactas | desconocido para Cloud `-preview`; no heredar de la versión anterior |
| 360p draft | output de menor costo/latencia | output shape + tier/rate versionados | candidato |
| 1080p/4K | output de alta resolución | MIME/codec/bytes, rate, derivatives y playback | candidato |

Cada fila es una identidad de ruta potencial. `provider_supported` no implica `contract_declared`,
`adapter_wired`, `canary_passed`, `promoted` ni `available`.

## API y completitud

La superficie Cloud documenta `POST /v1beta1/projects/{project}/locations/global/interactions`. Los ejemplos usan
`background: true` para ejecución asíncrona y devuelven un `interaction id` que luego se relee. Los ejemplos
síncronos pueden tardar más de un minuto. Globe debe preservar el ID opaco, correlación e idempotencia; ante timeout,
leer primero el mismo interaction/run y nunca repetir un submit billable a ciegas.

La documentación oficial presenta inconsistencias de ejemplo: algunas respuestas aún muestran el modelo anterior y
algunos cuerpos async ubican `background` dentro del item de input. La implementación debe capturar el request/response
real del endpoint y no copiar esos ejemplos como contrato sin prueba.

La Developer API conserva `store=true` por defecto y documenta retención paga configurable de 7/14/28/55 días;
Cloud documenta hasta 14 días para interacciones async y requiere `store=false` explícito para el carril ZDR. Stateful
continuation y ZDR son decisiones incompatibles en el mismo run: la task debe elegir y evidenciar una, nunca aceptar el
default del proveedor. Developer y Cloud tampoco comparten límites de contexto ni restricciones regionales de uploads.

## Economía reproducible

Precios Cloud observados, USD:

| Unidad | Precio |
|---|---:|
| input multimodal | 1.50 / 1M tokens |
| texto output/reasoning | 9.00 / 1M tokens |
| video output | 17.50 / 1M tokens |

Con el rate de tokens publicado, el costo nominal de solo video output es aproximadamente:

| Resolución | Tokens/s | USD/s aproximado | USD por 10 s aproximado |
|---|---:|---:|---:|
| 360p | 1,931 | 0.0338 | 0.338 |
| 720p | 5,792 | 0.1014 | 1.014 |
| 1080p | 8,688 | 0.1520 | 1.520 |
| 4K | 17,376 | 0.3041 | 3.041 |

Estos cálculos excluyen input y texto/reasoning, impuestos, descuentos, cuotas y redondeo real. No deben convertirse
directamente en Studio Credits. `TASK-1781` debe capturar billing/receipt y sellar un rate versionado por
`routeId × outputShape`.

## Seguridad, datos, derechos y entrega comercial

- Cloud etiqueta la oferta como Pre-GA/Preview. El permiso comercial declarado no equivale a GA, SLA ni indemnidad.
- La excepción de términos permite uso comercial/producción y disclosure para la oferta listada, sujeto al acuerdo
  Cloud aplicable y al DPA. La atestación debe ser nueva para cada ID/superficie y digest de términos.
- El endpoint `global` no permite fijar dónde se procesa la solicitud. Cargas con requisito de residencia regional
  deben fallar cerradas.
- Async retiene interacciones hasta 14 días. Globe debe decidir minimización, `store`, cleanup y no-training/no-
  improvement con evidencia contractual; no inferirlos del marketing.
- C2PA prueba provenance técnica del output firmado, no copyright, consentimiento, likeness, uso de marca,
  sublicencia ni derechos del input.
- Antes de entrega a cliente: provider/plan exactos, input permission register, policy snapshot inmutable, revisión
  humana sustantiva y release state de Asset Governance.

Esto orienta la operación y no es asesoría legal. Antes de uso o entrega comercial, valida términos, privacidad,
IP y jurisdicción con un abogado habilitado.

## Benchmark contra la ruta vigente

| Eje | Omni Flash previo | Omni 1.1 Flash | Gap Globe |
|---|---|---|---|
| modelo | `gemini-omni-flash-preview` | dos IDs por superficie | resolver surface, auth y alias sin colapsarlos |
| lifecycle | preview; shutdown 2026-09-30 anunciado | Cloud preview / Gemini API publicado | migración antes del sunset, con rollback realista |
| resolución | ruta Globe 720p | 360p–4K | constraints, rate, codecs, derivatives y QA por shape |
| inputs públicos Globe | referencias de imagen | texto, imagen y video | nuevos roles, ingest, rights y routeIds |
| operaciones | reference-to-video | generate, frames, edit, extend | no ampliar una route existente por marketing |
| canary | sellado para identidad anterior | ninguno en Globe | evaluación, billing, rights, canary y promotion por ruta |

## Riesgos prioritarios

1. **P0 — sunset:** dejar la ruta vigente sin migración antes del 2026-09-30.
2. **P0 — identidad:** mandar el ID Developer a Cloud o el `-preview` a Gemini API y degradarlo como fallback.
3. **P0 — herencia falsa:** reutilizar canary, derechos, rate o promotion de la versión anterior.
4. **P1 — gasto duplicado:** reintentar una interaction async después de timeout sin readback.
5. **P1 — residencia:** usar `global` con material que exige ubicación de procesamiento controlada.
6. **P1 — derechos:** tratar C2PA o permiso comercial Pre-GA como clearance del asset.
7. **P1 — UI/contract drift:** exponer 4K/edit/extend antes de que route contract, credits y playback converjan.
8. **P2 — docs volátiles:** copiar ejemplos oficiales inconsistentes como shape definitivo.

## Decisión de arquitectura

No se propone un ADR nuevo en esta investigación. Aplican ADR-021 (completion por proveedor), ADR-022 (contrato
creativo por ruta) y ADR-023 (route cards). `TASK-1781` debe abrir un ADR sólo si la evidencia obliga a cambiar un
contrato compartido, por ejemplo: modelar identidades cross-surface, introducir `video-extend`, ampliar
`OutputShapeV1`, cambiar settlement o modificar el mecanismo de promotion. La sustitución de un modelo dentro de
los contratos existentes se mantiene como implementación gobernada.

## Fuentes primarias verificadas

- Google, anuncio de lanzamiento: <https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/>
- Google Cloud, ficha del modelo: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash>
- Google Cloud, text-to-video: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-text>
- Google Cloud, referencias: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-references>
- Google Cloud, edición: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/edit-videos>
- Google Cloud, extensión: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/extend-videos>
- Google Cloud, locations: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations>
- Google Cloud, pricing: <https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing>
- Google Cloud, Content Credentials: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/content-credentials>
- Google Cloud, términos Preview: <https://cloud.google.com/terms/genai-preview-products>
- Gemini API, guía Omni e Interactions: <https://ai.google.dev/gemini-api/docs/omni>
- Gemini API, deprecations: <https://ai.google.dev/gemini-api/docs/deprecations>

## Limitaciones honestas

- No se ejecutó un request billable ni se verificó acceso/cuota en los proyectos de Efeonce.
- No se leyó `globe.producer.fleet.list` en esta investigación; ninguna afirmación aquí cambia disponibilidad.
- No se verificaron todavía codecs, audio, C2PA en bytes, latencia, filtros, billing receipt ni fidelidad real.
- Los benchmarks cualitativos del anuncio son claims del proveedor; no se presentan como evaluación de Efeonce.
- La task debe repetir esta verificación inmediatamente antes de implementar o gastar.
