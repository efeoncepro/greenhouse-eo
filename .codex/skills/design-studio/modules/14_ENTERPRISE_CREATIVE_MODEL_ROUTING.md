# 14 · Enterprise Creative Model Routing

> **Cárgalo cuando** haya que elegir o incorporar modelos/providers para producción profesional a escala,
> construir un plan de campaña multimodal, estimar una corrida o diseñar tooling operable por agentes.
> **As-of:** 2026-07-19; modelos, precios y launch stages deben reverificarse antes de ejecutar.

## Source of truth

- Portafolio y razonamiento: `docs/architecture/EFEONCE_CREATIVE_STUDIO_ENTERPRISE_MODEL_PORTFOLIO_V1.md`.
- Registry para agentes: `docs/architecture/EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json`.
- Plataforma objetivo: `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`.

## Regla de provider

1. Modelo Google nativo → **Google Cloud/Vertex directo**. Nunca Fal.
2. Modelo no-Google curado → Fal, sólo si el endpoint está allowlisted y la licencia sirve al destino.
3. GPT Image → OpenAI directo.
4. Copy/logo/legal/mastering → compositor determinístico; nunca un “pase final” sobre el anuncio compuesto.

`portfolio_tier` (`core | scale | specialist | watch`) no autoriza ejecución. `lifecycle_status`
(`active | preview | deprecated | blocked`) tampoco. Toda route candidate de este research parte en `research_verified` y
es no ejecutable hasta que el runtime del Studio la marque explícitamente `production_approved`. `Canary` no
puede ser la única ruta de un SLA; `watch` requiere bake-off; `deprecated` y `blocked` no se ejecutan. Seedance
2.5 está `blocked` hasta que exista ficha oficial Fal verificable.

## Cómo el agente elige

Resolver en este orden:

1. `operation`: diverge, develop, exact edit, vector, reference video, premium video, scale video, TTS, music,
   localization, matting, upscale o 3D.
2. `fidelity contract`: qué debe preservarse y qué puede variar.
3. `risk`: asset classification, likeness/voice consent, territory, license, disclosure y launch stage.
4. `service level`: premium/interactive/batch, deadline y fallback permitido.
5. `economics`: cantidad de candidatos, resolución/duración y costo por candidato aprobado.
6. `route proposal`: capability estable, route candidate, model/endpoint exacto, readiness, límites, estimate,
   fallback y gates humanos.

Sin aprobación firmada el agente sólo puede `list_capabilities`, `get_estimate`, `provider_health`,
`prepare_plan` y `request_approval`. Ejecutar/cancelar/reintentar exige token single-use ligado a plan, actor,
workspace, route, hashes de inputs, cantidad, resolución/duración, región, costo máximo, fallbacks, policy
revision y expiración. Aprobar una ruta, delivery o publicación permanece en un principal humano/policy.

## Defaults por operación

| Operación | Ruta primaria | Alternativa |
| --- | --- | --- |
| Divergencia still | Seedream 5 Lite / Fal | PixVerse sólo si ya es motion |
| Look/material premium | Seedream 5 Pro / Fal | FLUX.2 Pro para realismo/cámara |
| Imagen de escala | Gemini 3.1 Flash Lite Image / Vertex | Seedream 5 Lite / Fal para divergencia |
| Imagen contextual core | Gemini 3.1 Flash Image / Vertex | Gemini 2.5 sólo como fallback hasta 2026-10-02 |
| Edición/acabado premium | Gemini 3 Pro Image / Vertex | GPT Image 2 directo según máscara/composición |
| Vector editable | Recraft 4.1 / Fal | humano en Illustrator/Figma para identidad final |
| Premium video | Veo 3.1 / Vertex | Kling 3 4K / Fal según control/costo |
| Reference-to-video | Seedance 2.0 / Fal | Gemini Omni / Vertex sólo canary |
| Video de volumen | PixVerse V6 / Fal | Veo 3.1 Fast / Vertex |
| Voz/localización | Gemini TTS + Chirp/Translation / Google Cloud | ElevenLabs / Fal con consentimiento |
| Música | Lyria 3 / Vertex canary | ElevenLabs / Fal después de rights review |
| Mastering | Topaz / Fal + post determinístico | DCC/humano cuando el detalle inventado sea riesgoso |
| 3D/previs | Trellis 2 / Fal | Rodin / Fal para PBR/mesh |

## Edit sobre un candidato ya generado

`exact edit` sobre un output propio no es un generate con más prompt: es una operación **con base**, y su
mecanismo condiciona el ruteo. Dos paradigmas, no intercambiables:

- **Stateful** — encadena por el handle de sesión del proveedor. Sólo significa algo para quien lo emitió:
  **no cruza de proveedor**.
- **Reference-based** — re-inyecta el output del padre como base del edit. Es el único que habilita **edit
  cross-model** (refinar un candidato de Seedream con Nano Banana) y exige que el output se haya **retenido**:
  si el pipeline hashea los bytes y los descarta, el candidato no es refinable por nadie.

El set de referencias va **edit base primero** (el orden es condicionamiento) y cada ruta declara su tope; al
excederlo debe **fallar cerrado**, nunca truncar — truncar devuelve trabajo plausible que no es el pedido.
Dentro de la plataforma gobernada esto ya existe como una sola semántica de capability (`editFrom`, con el
paradigma resuelto adentro y declarado en el manifest): `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
§"Edit / refine cross-model".

## Contrato de salida del agente

```yaml
capability: video.reference
route_id: fal.seedance2.reference-to-video.v1
provider: fal
model: Seedance 2.0
endpoint: bytedance/seedance-2.0/reference-to-video
portfolio_tier: core
readiness: research_verified
reason: <por qué resuelve este fidelity contract>
inputs: <refs y roles>
limits: <duración/resolución/referencias/idioma>
estimate: <rango + unidad + assumptions>
fallback: <capability id o none>
privacy: <asset classification/provider/endpoint/region/retention/territory + ACL>
acceptance: <gates técnicos + craft + rights>
approval_required: true
```

## Gate de promoción

Antes de mover una ruta a `production_approved`:

- ≥3 golden briefs por modalidad y al menos un cliente/brand mode realista;
- panel humano ciego y first-pass compliance medido;
- costo por candidato aprobado y p95, no sólo precio nominal;
- retry/cancel/duplicate-spend probado;
- licencia, retención, consent y provenance revisados;
- fallback ensayado sin sustitución silenciosa;
- registry, source link, `verified_at`, owner y revisit date actualizados.
- submission fence/outbox/lease/reconciliation/DLQ/circuit breaker y recuperación sin doble gasto probados;
- RTO/RPO, restore drill, provider kill switch, webhook replay y queue drain documentados;
- derechos y consentimiento versionados por territorio/medio/plazo, no inferidos desde marketing del proveedor.

## Antipatrones

- exponer `endpoint + arbitrary JSON` como tool a un agente;
- listar 1.000 modelos como si 1.000 fueran producción aprobada;
- usar Fal como proxy de Google;
- llamar “core” a un preview sin fallback;
- confiar en URL pública del provider como storage;
- medir escala por requests enviados en vez de entregables aprobados;
- convertir texto raster generado en legal/copy final;
- confundir `provider completed` con `approved` o `delivered`.
