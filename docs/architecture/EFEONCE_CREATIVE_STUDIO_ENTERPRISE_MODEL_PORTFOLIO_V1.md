# Efeonce Creative Studio — Enterprise Model Portfolio V1

> **Estado:** baseline de arquitectura y sourcing para EPIC-028; no crea runtime, credenciales ni gasto.
> **Validated as of:** 2026-07-19.
> **ADR:** [Efeonce Creative Studio: plataforma agentic peer](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md).
> **Arquitectura:** [Agentic Platform Architecture V1](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> **Registro machine-readable:** [Capability Registry V1](EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json).

## Resumen ejecutivo

Efeonce no necesita “un modelo ganador”. Necesita un **portafolio gobernado por operación**, con una ruta premium,
una ruta de escala y utilidades de postproducción que puedan combinarse sin perder identidad, derechos, costo ni
trazabilidad.

La política adoptada es:

1. **Todo modelo nativo de Google se consume directamente en Google Cloud/Vertex AI.** No se incorpora su réplica
   de Fal aunque exista. Esto conserva IAM, auditabilidad, cuotas, residencia y una relación de proveedor coherente.
2. **Fal es el agregador de modelos no-Google y utilidades especializadas.** Se usa para ByteDance, BFL, Ideogram,
   Recraft, Topaz, Bria, Kling, PixVerse, ElevenLabs y 3D, sujeto a licencia y eval por endpoint.
3. **OpenAI se consume directo** para GPT Image; no pasa por Fal.
4. **Composición, copy, logos, legales, color de entrega, codecs y preprensa son determinísticos** o humanos. El
   output del modelo es un plate/candidato, no la pieza aprobada.
5. **El router selecciona capabilities, no marcas.** `portfolio_tier` expresa prioridad/rol; `readiness` expresa
   evidencia operativa. Ninguna ruta ejecuta hasta estar explícitamente `production_approved` en el runtime del
   Studio, aunque su tier sea `core`.

Confianza **alta** en la política de proveedores, lifecycle de Google y controles de Fal; **media** en el ranking
creativo entre modelos, que sólo puede promoverse con bake-offs internos y briefs reales.

## Qué existe hoy y qué falta

| Plano | Existe en este repo | Gap para Studio enterprise |
| --- | --- | --- |
| Fal | `src/lib/ai/fal.ts` encola y bloquea hasta resultado | submit/status/result/cancel separados, webhook firmado e idempotente, políticas de retención, pricing/usage API y durable ingest |
| Google | `src/lib/ai/google-genai.ts` usa Vertex/ADC | adapters de media por capability, cuotas, jobs largos, coste y evals; el helper de imagen aún apunta por default a Imagen 4 deprecado |
| OpenAI | cliente directo de GPT Image 2 | adapter Studio separado, estimate/ledger y normalización de lineage |
| Composición | Campaign Layout Compiler V1 | integrarlo después del anchor/finish; nunca meter inferencia dentro del compilador |
| Gobernanza | ADR de Studio, lifecycle, assets, review y credit ledger definidos | bootstrap de repositorio/proyectos GCP de EPIC-028 y contratos ejecutables |

El catálogo Fal previo de Greenhouse sigue siendo inventario histórico de discovery. Este documento es el
**portafolio curado** que decide qué vale evaluar e incorporar en Creative Studio.

## Rúbrica de promoción

Cada endpoint se evalúa con los mismos ejes. No se promociona por marketing del proveedor ni por devolver HTTP 200.

| Eje | Peso | Evidencia mínima |
| --- | ---: | --- |
| Calidad y craft visual/sonoro | 25% | panel humano ciego contra golden briefs y destino real |
| Control y fidelidad | 20% | identidad, producto, layout, acción, texto/practical o audio según contrato |
| Consistencia de sistema | 15% | master + ratios/cutdowns/variantes sin deriva acumulativa |
| Escala y confiabilidad | 15% | concurrencia, cola, retries, p95, error taxonomy y recovery |
| Derechos, privacidad y compliance | 15% | licencia por endpoint, retención, consentimiento, provenance y política de assets |
| Economía | 10% | costo por **candidato aprobado**, no sólo por request/segundo |

Dealbreakers: endpoint no comercial, Google enrutado por un tercero, assets restringidos en URL pública sin waiver,
ausencia de lineage/costo, voz sin consentimiento, o modelo preview usado como única ruta de un SLA.

## Portafolio que incorporamos

### Imagen y diseño

| Tier | Capacidad | Provider | Mano preferida / lifecycle |
| --- | --- | --- | --- |
| `core` | Seedream 5 Lite / Pro | Fal | divergencia de volumen; desarrollo material, color, atmósfera y edición semántica |
| `core` | GPT Image 2 | OpenAI directo | composición, edición con máscara, texto conceptual y extensión de sistema |
| `scale` | Gemini 2.5 Flash Image | Google Vertex | fallback transitorio; GA pero con retiro 2026-10-02, no destino estratégico |
| `core` | Gemini 3.1 Flash Image | Google Vertex | carril principal GA para generación/edición contextual; 4K y video-input siguen sujetos a feature-stage |
| `specialist` | Gemini 3 Pro Image | Google Vertex | acabado premium y edición razonada compleja |
| `scale` | Gemini 3.1 Flash Lite Image | Google Vertex | volumen de baja latencia; lifecycle corto y refresh automático obligatorio |
| `specialist` | FLUX.2 Pro | Fal | realismo comercial, cámara y edición secuencial |
| `specialist` | Ideogram 4 | Fal | exploración de lettering/poster; el texto final sigue siendo determinístico |
| `specialist` | Recraft 4.1 Text-to-Vector | Fal | SVG editable para iconografía, ilustración y sistemas; logos reales requieren fuente/validación |
| `watch` | Imagen 3/4 | Google Vertex | lifecycle `deprecated`; no usar en trabajo nuevo; migración vencida 2026-06-30 |

### Video y motion

| Tier | Capacidad | Provider | Mano preferida / lifecycle |
| --- | --- | --- | --- |
| `core` | Veo 3.1 / Veo 3.1 Fast | Google Vertex | ruta premium/broadcast y escala; fixed quota/PT, `us-central1`, sin audio nativo |
| `watch` | Veo 3.1 Lite Preview | Google Vertex | social económico con sonido; preview, nunca única ruta de SLA |
| `core` | Seedance 2.0 reference/image-to-video | Fal | continuidad multimodal: hasta 9 imágenes, 3 videos y 3 audios; tomas 4–15 s |
| `specialist` | Kling 3 Pro / 4K | Fal | first/last frame, elements, multi-shot y master 4K cuando el brief lo justifica |
| `scale` | PixVerse V6 | Fal | variantes social/motion económicas, 1080p, audio y controles de cámara |
| `watch` | Gemini Omni Flash Preview | Google Vertex | text/reference-to-video, edición y audio en un mismo contexto; 720p/10 s y preview |
| `specialist` | LTX 2.3 Reframe | Fal | adaptación/reframe/outpaint de masters aprobados, hasta 60 s según endpoint |
| `watch` | Wan 2.7 | Fal | generación/reference/edit como challenger; no usar la familia 2.6 obsoleta |
| `watch` | Seedance 2.5 | — | lifecycle `blocked`: no hay endpoint oficial Fal verificado; no prometer ni diseñar alrededor de él |

### Audio, voz y localización

| Tier | Capacidad | Provider | Mano preferida / lifecycle |
| --- | --- | --- | --- |
| `core` | Gemini 2.5 Flash TTS / Gemini 2.5 Pro TTS / Chirp 3 HD | Google Cloud | locución de escala, premium y editorial mediante contratos Cloud TTS explícitos |
| `watch` | Gemini 3.1 Flash TTS | Google Cloud | preview para diálogo/voz expresiva; no única ruta de SLA |
| `watch` | Lyria 3 Pro / Clip | Google Vertex | preview; música full-song o 30 s con watermark/C2PA y rights review |
| `core` | Chirp 3 STT + Cloud Translation Advanced | Google Cloud | transcripción, diarización, glosarios y localización masiva |
| `specialist` | ElevenLabs suite | Fal | voz, diálogo, dubbing, music y STT cuando supere a la ruta Google; consentimiento obligatorio |
| `specialist` | MMAudio V2 | Fal | SFX/ambiente sincronizado a video sin regenerar la imagen |

### Post, recorte y mastering

| Tier | Capacidad | Provider | Mano preferida / lifecycle |
| --- | --- | --- | --- |
| `core` | Topaz Image / Video | Fal | upscale, recover, denoise e interpolación sólo sobre candidatos aprobados |
| `core` | Bria remove/replace/expand + VRMBG 3 video | Fal | e-commerce, alpha y fondos; VRMBG preserva audio y ofrece codecs profesionales |
| `watch` | BiRefNet v2 image/video | Fal | `enterprise_status=pending`; no habilitar sin waiver y nueva revisión |
| `core` | Sharp/FFmpeg/fontkit/color/prepress | runtime determinístico | composición exacta, copy, logo, codecs, loudness, packaging y export |

### Capas, reframe y entrenamiento gobernado

- **Qwen Image Layered** entra como challenger `watch` de `image.decompose.layers`: produce capas RGBA útiles para Layout
  Design, pero no se promete PSD ni semántica estable hasta evaluarlo.
- **FLUX.2 Max** entra como challenger `watch` frente a Pro, no como reemplazo automático.
- **FLUX.2 Trainer V2** sólo puede existir como capability restringida: dataset con derechos, consentimiento
  biométrico/likeness, retención, propósito, owner y revocación. No se expone como tool genérica.

### 3D y previs

| Tier | Capacidad | Provider | Mano preferida / lifecycle |
| --- | --- | --- | --- |
| `specialist` | Trellis 2 | Fal | asset/previs 3D rápido desde imagen |
| `watch` | Hyper3D Rodin | Fal | `enterprise_status=pending`; PBR/mesh sólo tras waiver/bake-off |
| `watch` | SAM 3D Objects | Fal | reconstrucción/clutter; no se promueve hasta probar topología y export |

3D generativo no produce por sí solo un master de campaña. Geometría, UV/PBR, rig, escala física, render y licencia
requieren QA de DCC humano.

## Dos ejes que un agente no puede confundir

- `portfolio_tier`: `core | scale | specialist | watch`. Responde “¿qué rol queremos evaluar o conservar?”.
- `lifecycle_status`: `active | preview | deprecated | blocked`. Describe al proveedor/ruta, no autorización.
- `readiness`: `research_verified | adapter_verified | eval_qualified | production_approved`. Responde “¿qué
  evidencia existe y se puede ejecutar?”.

Este research deja todas las rutas nuevas en `research_verified`. `Core` significa prioridad de incorporación,
no producción activa. El runtime del Studio deberá registrar readiness y evidencias por route/version; ausencia
del campo se interpreta como **no ejecutable**.

Las capabilities estables son semánticas (`video.reference`, `image.edit`, `post.upscale`). Los modelos del
registry son `route_candidates`; un template referencia una capability y policy, no `seedance2` o `veo3.1`.

## Arquitectura de adapters a incorporar en EPIC-028

```text
creative command/API
  -> capability registry + policy router
  -> estimate (provider price + internal credit range)
  -> reserve + explicit approval
  -> provider adapter submit
  -> webhook/poll recovery
  -> private durable ingest + hash + metadata
  -> technical/fidelity/rights QA
  -> human review
  -> deterministic compose/master/prepress
```

Contratos mínimos:

- `GoogleCreativeAdapter`: Vertex/Cloud APIs sólo, ADC/service account, model/location allowlist, fixed/dynamic
  quota handling, GCS inputs/outputs y Cloud Audit Logs.
- `FalCreativeAdapter`: endpoints no-Google allowlisted, async submit/status/result/cancel, webhook signature,
  `X-Fal-Store-IO: 0` para material sensible, lifecycle corto, ingest inmediato y pricing/usage APIs.
- `OpenAICreativeAdapter`: endpoint directo, timeout/retry idempotente y lineage normalizado.
- `DeterministicMediaAdapter`: Sharp/FFmpeg/fontkit/color pipeline; no créditos generativos.

Los adapters implementan capacidades específicas (`image.generate`, `video.reference`, `audio.tts`,
`post.upscale`), no un diccionario arbitrario de endpoint + JSON expuesto a agentes.

Los clients actuales bajo `src/lib/ai/*` son precedentes/laboratorio de Greenhouse. **No se evolucionan en este
repo hacia el runtime del Studio**: provider adapters, storage, ledger, jobs y webhooks nuevos nacen únicamente
en el repositorio de Creative Studio mediante EPIC-028.

## Escala studio enterprise

Para campañas globales el feature list no alcanza. El V1 debe incluir:

- cola durable, webhooks idempotentes, cancelación y recuperación sin doble gasto;
- presupuesto por workspace/proyecto/run, estimate vs actual y costo por candidato aprobado;
- cuotas por provider/endpoint y scheduler que distinga exploración, premium y batch;
- storage privado propio; URL Fal es pública/efímera y nunca source of truth;
- clasificación de assets y provider allowlist por cliente/territorio;
- consent ledger para voz/rostro y policy de likeness/deepfake;
- provenance, C2PA/SynthID cuando exista, disclosure y manifest de modelos;
- golden fixtures y bake-offs recurrentes; champion/challenger con rollback;
- observabilidad por run/step/attempt/model/template/version y SLO separado de calidad creativa;
- localización como sistema: glossary, safe zones, expansión de copy, voces y QA cultural;
- continuidad operativa: fallback funcional, no sustitución silenciosa de un modelo premium por uno barato.

### Controles P0 de ejecución y seguridad

- **Submission fence transaccional:** estimate/reservation, outbox, idempotency key, lease/heartbeat,
  reconciliación, DLQ, circuit breaker y recuperación de reservas huérfanas. Un retry nunca puede duplicar gasto.
- **Approval token:** single-use y con expiración; liga hash del plan, actor, workspace, route, inputs, cantidad,
  resolución/duración, región, costo máximo, fallback permitido y policy revision. Cualquier cambio material exige
  una aprobación nueva; clientes regulados pueden requerir four-eyes.
- **Matriz de privacidad:** `asset classification × provider × endpoint × region × retention × territory`.
  Material restringido, biométrico, M&A, regulado o no publicado falla cerrado. `X-Fal-Store-IO: 0` no vuelve
  privado el CDN: inputs/outputs usan ACL restrictiva e ingest privado inmediato.
- **Derechos versionados:** fuente, licencia, medios, territorios, plazo, exclusividad, releases, voz/likeness,
  derivados, revocación y disclosure; ninguna etiqueta comercial del proveedor sustituye la revisión legal.
- **DR y proveedor:** RTO/RPO, PITR, restore drills, provider kill switch, queue drain, webhook replay y fallback
  ensayado. El fallback no puede cambiar proveedor, territorio o derechos de forma silenciosa.
- **Observabilidad:** queue lag, webhook latency, ingest failure, duplicate-spend rate, estimate variance, error
  budget, coste fully-loaded y redacción de prompts/PII.
- **Escala multi-tenant:** fair scheduling, priority lanes, admission control, cuotas contratadas y límites batch.

### Capacidad por ruta Google

La capacidad no se hereda genéricamente de Vertex. Debe persistirse por route/version:

- Gemini Image: PayGo, batch y Provisioned Throughput según modelo/feature.
- Veo 3.1/Fast: fixed quota + Provisioned Throughput, sin PayGo/batch, 50 RPM en `us-central1`.
- Gemini Omni: preview y fixed quota, sin PT/batch.
- Lyria 3: preview/global, 10 RPM e Interactions API `v1beta1`.
- Gemini 2.5 Flash TTS: 150 QPM por defecto; Chirp 3 HD: 200 RPM.
- Chirp STT: 300 sync/min, 150 batch/min y 300 sesiones streaming concurrentes.
- Translation general: 6 M caracteres/min; TLLM/adaptive: 900 RPM.

Fal documenta una cola durable, reintentos y autoscaling, pero su self-service llega a 40 requests concurrentes;
los volúmenes mayores requieren acuerdo enterprise/per-endpoint. Vertex ofrece Dynamic Shared Quota y
Provisioned Throughput para cargas previsibles. La capacidad comercial debe basarse en pruebas de carga y cupos
contratados, no en la amplitud del catálogo.

## Secuencia recomendada

1. **Foundation:** registry versionado, provider policy, adapters Fal/Google/OpenAI, estimate/reserve/approve,
   ingest privado, audit/telemetry y un template de imagen.
2. **Still factory:** Seedream + GPT + Gemini Image en tres carriles (Flash Lite escala, Flash core, Pro premium)
   + FLUX/Ideogram/Recraft; Bria/Topaz; Layout Compiler como
   cierre determinístico. Validar tres familias: KV premium, catálogo/e-commerce y localización multiformato.
3. **Motion factory:** Veo 3.1 + Seedance 2.0 + PixVerse/Kling; Omni sólo canary; audio/post separado y familia
   editorial 15/10/6.
4. **Audio/localization:** TTS/STT/Translation Google, Lyria canary, ElevenLabs specialist, consent y loudness.
5. **3D/previs:** Trellis/Rodin sólo cuando una campaña demuestre ahorro frente a foto/video/2D.

## Evidencia primaria

- Fal: [Model APIs](https://fal.ai/docs/documentation/model-apis/overview),
  [Model Search API](https://fal.ai/docs/platform-apis/v1/models),
  [async queue](https://fal.ai/docs/documentation/model-apis/inference/queue),
  [webhooks](https://fal.ai/docs/documentation/model-apis/inference/webhooks),
  [concurrency](https://fal.ai/docs/documentation/model-apis/concurrency-limits),
  [pricing APIs](https://fal.ai/docs/documentation/model-apis/pricing) y
  [retención](https://fal.ai/docs/documentation/model-apis/media-expiration) y
  [file ACL](https://fal.ai/docs/documentation/model-apis/file-access-controls).
- Google: [Vertex release notes](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/release-notes),
  [Gemini 3.1 Flash Image](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image),
  [Gemini 3 Pro Image](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-pro-image),
  [Veo 3.1](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate),
  [Gemini Omni Flash](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-flash-preview),
  [Lyria 3](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/lyria/lyria-3),
  [Gemini TTS](https://docs.cloud.google.com/text-to-speech/docs/gemini-tts),
  [Chirp 3 STT](https://docs.cloud.google.com/speech-to-text/v2/docs/chirp-model) y
  [Cloud Translation](https://docs.cloud.google.com/translate/docs/overview).
- Fal endpoints curados: [Seedream 5 Lite](https://fal.ai/docs/model-api-reference/image-generation-api/bytedance-seedream-v5-lite),
  [Seedance 2.0](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api),
  [FLUX.2 Pro](https://fal.ai/models/fal-ai/flux-2-pro/api),
  [Ideogram 4](https://fal.ai/models/ideogram/v4/api),
  [Recraft Vector](https://fal.ai/models/fal-ai/recraft/v4.1/text-to-vector),
  [Qwen Image Layered](https://fal.ai/models/fal-ai/qwen-image-layered/api),
  [LTX 2.3 Reframe](https://fal.ai/models/fal-ai/ltx-2.3/reframe/api),
  [Topaz Video](https://fal.ai/models/fal-ai/topaz/upscale/video/api),
  [Bria RMBG](https://fal.ai/models/fal-ai/bria/background/remove),
  [PixVerse V6](https://fal.ai/pixverse-v6),
  [Kling 3](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video),
  [MMAudio V2](https://fal.ai/models/fal-ai/mmaudio-v2),
  [ElevenLabs](https://fal.ai/elevenlabs),
  [Trellis 2](https://fal.ai/models/fal-ai/trellis-2/api) y
  [Rodin](https://fal.ai/models/fal-ai/hyper3d/rodin/v2.5/text-to-3d/api).

## Limitaciones de este research

- Las fichas de proveedor prueban disponibilidad y contrato publicado, no superioridad creativa.
- No se ejecutó un bake-off nuevo ni carga enterprise en esta revisión; los estados `core` son prioridad de
  incorporación y deben superar fixtures antes de un SLA.
- Pricing, launch stage, licencias y endpoint schemas son volátiles; el registry exige reverificación mensual y
  antes de cada alta/promoción.
