---
name: greenhouse-globe-model-fleet
description: >-
  Descubre, documenta, integra y verifica rutas de modelos/proveedores para Efeonce Globe usando fichas
  machine-readable por ruta. Úsala cuando se pregunte si un modelo está disponible, cuando se agregue o
  actualice un provider/model/endpoint/capability, o cuando haya que cablear adapter, completion, outputs,
  pricing, derechos, evaluación, canary, promoción o disponibilidad en la flota. Empieza por FLUX 3 y
  extiéndela con nuevas fichas sin convertirla en un catálogo paralelo al runtime.
---

# Globe Model Fleet

Gobierna el trabajo de integración de modelos en la unidad correcta: `routeId + capability + provider + model +
version/endpoint`. La skill es el método; las fichas son evidencia y contrato de trabajo; el runtime de Globe sigue
siendo la autoridad de disponibilidad.

## Composición obligatoria

Al tocar Globe, carga también:

- `greenhouse-globe` para boundaries, adapters, completion, rights, créditos, promoción y evidencia UI.
- `software-architect-2026` para decisiones de contrato, source of truth, fallos, rollout y reversibilidad.
- `greenhouse-ai-creative-rights-governance` y `legal-privacy-ip-operator` cuando cambien derechos, consentimiento,
  datos de cliente, entrenamiento, retención o entrega comercial.

Lee la task y la arquitectura gobernantes antes de modificar `efeonce-globe`. Greenhouse conserva tasks, ADRs,
fichas y handoff; Globe conserva código, runtime, infraestructura y evidencia técnica.

## Fuentes de verdad

No mezcles estas capas:

| Pregunta | Autoridad |
|---|---|
| ¿Está disponible ahora? | reader live `globe.producer.fleet.list` en Globe |
| ¿Qué evidencia y pendientes existen? | `GLOBE_MODEL_FLEET_STATUS.md` + handoff de Globe |
| ¿Qué debe implementar una ruta? | task/ADR + route card vigente en Greenhouse |
| ¿Qué soporta realmente el proveedor? | OpenAPI, API, pricing y términos primarios fechados |
| ¿Cómo se ejecuta? | `packages/provider-contract` + adapter/runner de Globe |

La skill o una route card nunca pueden promover una ruta ni sustituir el reader live. Una divergencia entre reader y
ledger es un hallazgo que se documenta, no una invitación a elegir el estado más conveniente.

## Flujo de trabajo

### 1. Fijar identidad y superficie

Escribe la tupla exacta antes de discutir capacidades. Separa rutas que parezcan similares y no uses el nombre de
familia como identidad ejecutable. Registra, como mínimo:

```text
routeId · capability semántica · operation · provider · model · version · endpointId · región · completion driver
```

Usa nombres semánticos (`video-generate`, `video-frames`, `video-extend`), no una capability inventada por modelo.
Una ruta nueva no hereda evidencia, precios, derechos, adapter, canary ni disponibilidad de una ruta vecina.

### 2. Reconstruir evidencia primaria

Carga la ficha canónica correspondiente en `docs/architecture/creative-studio/model-fleet/routes/` y valida su
frescura. Para claims inestables conserva URL o path, autoridad, fecha observada, alcance y condición de
revalidación. Antes de implementar o promover, vuelve a consultar el proveedor; no conviertas un snapshot en hecho
actual.

Para cualquier ruta OpenAI GPT Image, carga además
[`OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`](../../../docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md).
Separa capacidades por modelo/snapshot y superficie API. La transparencia de GPT Image 2 está documentada en
preview y tiene implementación local en `OutputShapeV1`, compiler, adapter y verificación binaria; no la declares
operativa en Globe hasta que deploy, canary facturable y readback live demuestren el cable completo.

Para Fal, resuelve el endpoint desde catálogo/OpenAPI y un submit controlado. Conserva las URLs `status_url`,
`response_url` y `cancel_url` que Fal devuelva por request; nunca derives una URL de seguimiento desde el slug.
Mantén `x-app-fal-disable-fallback` (singular, nombre oficial de Fal) y la key únicamente en Globe server-side. Si
el runtime o sus tests aún usan `x-app-fal-disable-fallbacks`, regístralo como gap de integración y corrígelo antes
de la verificación 2.5. Para BFL, trata Early Access,
`latest`, límites de escala, términos y derechos como gates explícitos, no como disponibilidad comercial.

### 3. Completar el mapa de cables

Para cada ruta, registra estado y evidencia de todos estos edges:

```text
provider_supported → contract_declared → adapter_wired → transport_verified
→ output_verified → billing_verified → rights_verified → evaluated
→ canary_passed → promoted → available
```

Además registra `completion_driver`, `input_encoder`, `result_driver`, `rate/settlement`, `rights/policy`,
`evaluation`, `canary`, `rollback` y consumidores (`ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform`,
`e2e`). Un edge ausente es un gap, no un `true` implícito.

Usa solo estos estados de edge: `verified`, `proposed`, `wired`, `not_started`, `blocked`, `unsupported`,
`unknown` o `stale`. Usa `gated`, `not_promoted` y `available` solo para el estado de disponibilidad de la ruta.
`provider_supported` no implica `globe_supported`; `available` exige reader live, binding/readiness, derechos,
evaluación, canary y promoción convergentes.

Cuando una ficha declare `exposure`, conserva cuatro audiencias distintas: estado gobernado (`candidate|sealed|promoted`),
reader (`available|gated|unknown`), Producer UI (`selectable|visible-gated|blocked|not-exposed`) y rollout externo
(`allowed|gated|deferred`). Un canary sellado no demuestra por sí solo que la UI pueda resolver inputs obligatorios ni
que exista disponibilidad externa.

### 4. Validar antes de gastar

Antes de estimate, prepare o reserve, valida shape, MIME, tamaño, cardinalidad, orden, índices temporales, audio,
derechos e idempotencia contra el contrato de la ruta. Rechaza antes del spend lo que la ruta declara
`unsupported`; no descartes campos o referencias en silencio.

En el contrato creativo, `duration`, ratio y resolución son forma de salida (`RouteConstraintsV1`/`OutputShapeV1`),
no controles creativos. Controles como audio, seguridad o dirección creativa necesitan mecanismo y `valueShape` por
ruta. Keyframes, drafts y cache opaco requieren semántica explícita, lineage y recuperación; no los reduzcas a una
lista de imágenes o a una variante de resolución.

### 5. Cablear por el seam gobernado

El primer call billable debe seguir:

```text
command/reader → provider-contract → creative-runner → provider → completion
→ result driver → private ingest/hash → governance → receipt/settlement
```

No uses SDK del proveedor desde UI, MCP, CLI, scripts o tests. No agregues `endpoint + arbitrary JSON`, fallbacks
por capability ni un adapter BFL paralelo sin decisión explícita. Los slugs, costos vendor, URLs temporales,
headers y errores raw permanecen server-side.

### 6. Promover por ruta

La secuencia de promoción es independiente para cada identidad: rate snapshot, derechos/terms digest, evaluación,
binding/readiness/circuito, canary con spend fence, output retenido, settlement y readback de
`globe.producer.fleet.list`. Un canary de una ruta no habilita las demás. Si hay timeout, lee primero el estado con
la misma correlación/idempotencia; nunca repitas un submit billable a ciegas.

No escribas esa secuencia a mano: `pnpm producer:canary --route=<routeId>` la ejecuta completa, deriva el
`outputShape` desde `constraints` y resuelve las entradas desde el feed retenido. **Sin `--execute` no gasta**,
y ése es el primer diagnóstico, no el último recurso. Con `--execute` exige dirección creativa explícita: sin
`--route-prompt` aborta con `producer_canary_route_prompt_required`. El instrumento **no inventa un prompt para
un gasto real** — y el dry-run sí corre sin él, así que la ausencia se descubre justo en la corrida que iba a
costar. Si no sabes qué debe producir la ruta, la ruta todavía no está lista para gastarse. El gasto se aprueba
con `--approve-route=N`, excluyente de `--approve`.

## FLUX 3 inicial

Carga [`FLUX_3_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json)
para el inventario actual. Incluye cinco rutas estándar Fal, cinco drafts, `draft-enhance` y la superficie directa
BFL como Early Access no conectada. La ficha declara explícitamente namespace, keyframes, first/last, extend, audio,
cache, pricing, derechos y cada cable. Las fichas concretas viven en la arquitectura de Greenhouse, no dentro de la
skill, para que la skill no se convierta en un segundo catálogo.

La primera implementación prevista usa el adapter Fal existente de Globe; no crea SDK ni adapter BFL paralelo. Todas
las rutas parten `gated`. Resuelve primero los gaps de namespace, OpenAPI auténtico, pricing, keyframe/draft contract,
result schema y rights antes de tocar disponibilidad.

## Inventario inicial auditado: Omni, Veo y Seedance

La primera ficha de FLUX 3 no era un inventario completo de Globe. El conjunto inicial de fichas concretas ahora cubre
las rutas de video ya encontradas en el runtime y conserva las variantes que todavía no son rutas públicas:

- [`GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json)
  — `ref/motion/reference-v1`, `gemini-omni-flash-preview` `preview`, Vertex Interactions, región `global`,
  `reference-to-video`, completion `poll`.
- [`GEMINI_OMNI_1_1_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/GEMINI_OMNI_1_1_VIDEO_ROUTE_CARD_V1.json)
  — candidatura fechada de Gemini Omni 1.1 Flash. Distingue la identidad Developer API
  `gemini-omni-1.1-flash` de la identidad Cloud/Agent Platform `gemini-omni-1.1-flash-preview`; ambas están
  `gated` en Globe hasta completar `TASK-1781`. El modelo vigente `gemini-omni-flash-preview` conserva su
  evidencia histórica y tiene shutdown anunciado para el 2026-09-30: no heredes su canary, rate, rights ni
  promotion a 1.1.
- [`VEO_3_1_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/VEO_3_1_VIDEO_ROUTE_CARD_V1.json)
  — `ref/video/frames-v1`, `veo-3.1-generate-001` `3.1`, Vertex `predictLongRunning`, región `us-central1`,
  primer cuadro y último cuadro opcional, completion `poll`.
- [`SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json)
  — Seedance 2.0 completo para `ref/motion/loop-v1`, Seedance 2.0 R2V para `ref/video/motion-v1` y la superficie
  Mini/I2V separada.

La respuesta a “¿qué Seedance está conectado?” requiere distinguir tres identidades: `seedance-2.0` para el loop
text-to-video, `seedance-2.0-r2v` para motion/reference-to-video y `seedance-2.0-i2v` detrás del slug
`bytedance/seedance-2.0/mini/image-to-video` para el capability genérico `video-extend`. Mini existe en Fal y está
alambrado en el adapter Lab, pero no tiene `routeId` público, binding gobernado ni canary de producción; no es el
Seedance que muestra la ruta pública “Seedance 2.0”.

La misma separación aplica a Veo: el adapter genérico contiene `veo-3.1-fast-generate-001`, pero el binding sellado
de `ref/video/frames-v1` usa exactamente `veo-3.1-generate-001`. Omni tiene una ruta pública de referencias de imagen;
las capacidades de video-reference o edición stateful del proveedor quedan como superficies diferidas hasta tener
routeId, contrato, evidencia, canary y readback propios.

### Gemini Omni 1.1 Flash — delta 2026-08-27

Google documenta 1.1 por dos superficies con madurez, auth, límites y retención distintos. Nunca las trates como
aliases. La Developer API usa `generativelanguage.googleapis.com/v1beta/interactions` + API key y el ID sin
`-preview`; Cloud usa `aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/interactions` +
ADC/WIF y el ID `-preview`. El modelo Developer figura estable, pero Interactions sigue en `v1beta`; Cloud es
Pre-GA/Preview. Conserva `providerSurface`/endpoint/model ID en la identidad y en la evidencia.

Capacidades oficiales —360p/720p/1080p/4K, first/last frame, video references, edit y extend— no amplían la ruta
existente. 1080p/4K son outputs upscaled según la referencia técnica; `video-extend` llega hasta 40 s acumulados;
audio input, PayGo y residencia regional tienen contradicciones documentales. Cada operación/shape exige route
contract, rate, rights, evaluation y canary propios. Investigación y gates:
[`GEMINI_OMNI_1_1_PROVIDER_RESEARCH_2026-08-27.md`](../../../docs/audits/creative-studio/GEMINI_OMNI_1_1_PROVIDER_RESEARCH_2026-08-27.md).

## Inventario inicial auditado: imagen, Seedream y Nano Banana

La auditoría del 2026-08-04 añadió cuatro fichas de imagen sin mover la autoridad live del reader:

- [`GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json)
  — “Imagen 2 de ChatGPT” se normaliza a **GPT Image 2** (`gpt-image-2`), ruta `ref/still/openai-v2`,
  snapshot `2026-04-21`, endpoint `openai.gpt-image-2`, región `us-central1`, completion `poll` y salida PNG.
  Google `imagen-2` es otra familia, deprecated y **no existe como routeId, adapter ni binding en Globe**. OpenAI
  soporta edición en sus superficies de proveedor, pero Globe mantiene esa operación `deferred` porque `/v1/images/edits`
  requiere un transporte multipart y una ruta gobernada propios.
  La misma ficha registra transparencia como superficie provider-supported en preview, code-complete local y
  Globe-gated por rollout; no degradar la ruta completa ni afirmar fondo opaco cuando el request usa `auto`.
- [`SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json)
  — `ref/still/rrss-v1` usa Fal `seedream-5-pro` / `v5-pro` con el slug bare
  `bytedance/seedream/v5/pro/text-to-image`, y `ref/still/reference-v1` usa `seedream-5-pro-edit` / `v5-pro`
  con `bytedance/seedream/v5/pro/edit`. La primera ruta está `available`; la edición conserva cables de proveedor y
  adapter, pero el último reader readback la deja `gated` por binding deshabilitado. Seedream 5 Lite queda como
  superficie `candidate`, no como “Mini” ni como variante conectada.
- [`NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json)
  — `ref/still/nanobanana-2-v1`, Vertex `gemini-3.1-flash-image` `preview`, endpoint `vertex.gemini.image.flash`,
  región `global`, `generateContent` y binding `poll`; está `available`. Edición, multi-turn y video-to-image del
  proveedor siguen como superficies diferidas sin routeId público.
- [`NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json`](../../../docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json)
  — `ref/still/nanobanana-pro-v1`, Vertex `gemini-3-pro-image` `preview`, endpoint `vertex.gemini.image`, región
  `global`, `generateContent` y binding `poll`; está `available`. El último circuito consultado devolvió `not_found`,
  así que la ficha conserva esa reconciliación como blocker aunque el reader siga proyectando `available`.

La identidad de runtime siempre se lee como `routeId + capability + provider + model + version/endpoint + region + completionDriver`.
No sustituyas los IDs de Vertex por un nombre comercial, no cambies `global` por analogía y no conviertas una capacidad
de edición del proveedor en una ruta pública. Para las cuatro familias, el selector puede mostrar sólo lo que devuelva el
reader; `externalRollout` permanece gated mientras el rollout multitenant no tenga entitlement y readback propios.

Estas fichas reflejan evidencia observada, no disponibilidad final. Antes de afirmar `available`, lee siempre
`globe.producer.fleet.list` y reconcilia el resultado con el ledger y el handoff de Globe.

`ref/still/openai-v1-5` requiere una ficha y un sunset gobernado: OpenAI anunció el retiro de
`gpt-image-1.5` para el 2026-12-01. No puede seguir actuando como fallback silencioso de transparencia ni heredar
disponibilidad futura de GPT Image 2. GPT Image 1, 1 Mini y `chatgpt-image-latest` también están deprecated, pero
no se inventan routeIds de Globe para representar superficies que el runtime no publica.

## Cómo leer y modificar una ficha

1. Ejecuta el validador estructural antes y después de editarla:

   ```bash
   node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs
   node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs --strict-freshness
   ```

   En Claude, usa el path espejo `.claude/skills/greenhouse-globe-model-fleet/`. La ficha concreta sigue siendo la
   ruta canónica de Greenhouse; no crees una copia bajo `references/routes/`.
2. Añade evidencia y fecha antes de cambiar un edge a `verified`.
🔴 **Edita una ficha con reemplazo de TEXTO, nunca reserializando el JSON.** Medido el 2026-08-05: cambiar dos
campos con `json.dumps(indent=2)` expandió todos los objetos compactos del archivo y produjo un diff de **404
líneas para un cambio de 4**. El contenido queda correcto y el validador pasa, pero el cambio real se vuelve
irrevisable y el archivo deja de parecerse a sus hermanos. Las fichas usan objetos de una línea para entradas
cortas (`{ "name": …, "owner": …, "valueShape": …, "mechanism": … }`) a propósito: son tablas, y una tabla se
lee de un vistazo. Si necesitas validar la estructura después de editar, parsea para **comprobar**, no para
**reescribir**.

3. Cambia un edge a `unknown` o `stale` cuando la evidencia no permita afirmar soporte; no lo omitas.
4. No pongas secretos, tokens, cookies, cuerpos raw, URLs firmadas, `status_url` vivos ni `response_url` vivos en la
   ficha. Registra el tipo de evidencia y el requisito de revalidación, no la credencial ni el artefacto efímero.
5. Actualiza la task/ADR/handoff que gobierna el cambio. La ficha no reemplaza esos artefactos ni el ledger humano.
6. Verifica paridad de los bundles Codex/Claude:

   ```bash
   pnpm skills:mirrors
   ```

## Criterio de salida

Entrega un resultado que permita a otro agente continuar sin adivinar:

- identidad exacta y superficie del proveedor;
- matriz de capacidades e inputs/outputs por ruta;
- estado de cada cable, incluyendo `unknown`/`unsupported`;
- evidencia primaria fechada y qué debe revalidarse;
- archivos de Globe y Greenhouse que son dueños de cada cambio;
- riesgos, dependencias, rollback y siguiente paso ejecutable.

Nunca describas una capacidad de marketing como implementada solo porque aparece en una ficha. `provider_supported`,
`contract_declared`, `adapter_wired`, `transport_verified`, `output_verified`, `billing_verified`, `rights_verified`,
`evaluated`, `canary_passed`, `promoted` y `available` deben poder demostrarse por separado.
