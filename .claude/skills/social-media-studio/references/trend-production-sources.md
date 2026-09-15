# Fuentes y límites — producción creativa social

Consultadas el **2026-09-12**. Resúmenes propios, sin copiar recetas completas. Los principios de oficio son
criterios operativos; no se presentan como garantías de alcance. Revalidar herramientas, ventanas, políticas
y datos de plataforma antes de usarlos en producción.

| Fuente primaria | Aporte aplicado | Límite |
|---|---|---|
| [TikTok — Creative advertising guide](https://ads.tiktok.com/business/en/guides/what-is-ad-creative-guide?redirected=1) | hook ligado al relato, formato nativo, integración natural del producto y pruebas de variantes | guía de publicidad/TikTok; no demuestra rendimiento de un poster orgánico en Instagram |
| [TikTok — Creative Center, Creative Guidance](https://ads.tiktok.com/business/creativecenter/quicktok/online/tiktok_creative_accelerator/pc/en) | observar conversaciones por mercado y relacionar el hook con la narrativa | los ejemplos y señales envejecen; no sustituyen observar el trend concreto |
| [Ehrenberg-Bass — Brands of Distinction](https://ebims.emdev.au/brands-of-distinction/) | activos distintivos requieren asociación y singularidad; un color nuevo no equivale a reconocimiento | no se midió aquí la asociación de activos Efeonce |
| [Magnific — Creative Upscaler API](https://docs.magnific.com/api-reference/image-upscaler-creative/image-upscaler) | separar aumento de resolución de detalle generativo; controlar fidelidad | API directa no equivale al schema del conector |
| [Magnific — producto](https://magnific.ai/) | el ajuste de creatividad puede introducir detalles nuevos | afirmaciones del proveedor, no benchmark independiente |
| [UNESCO — fiestas indígenas dedicadas a los muertos](https://ich.unesco.org/es/RL/dia-de-muertos-00054) | recuerdo/retorno de familiares y preparación de ofrendas; contexto del piloto | describe prácticas culturales, no un protocolo universal ni aprobación de branding |

## Evidencia directa de herramientas

- Higgsfield: herramientas callable descubiertas; `models_recommend` y `models_get` respondieron el
  2026-09-12 con contratos de referencias/ratio/parámetros. No se generó una imagen con ese conector en el piloto.
- Magnific: schema callable de `images_upscale` inspeccionado; `images_models_list(search:upscale)` respondió
  vacío porque consulta TTI. No se ejecutó upscale; el plate del piloto no lo necesitaba.
- Motor nativo: generación/edición realmente ejecutadas en el piloto; registrar output e input concretos en el
  expediente. El nombre del modelo interno no es observable, por lo que no se atribuye una versión.

## Decisión de arquitectura aplicable

El delta amplía instrucciones y referencias de una skill existente, preservando la separación vigente entre
dirección, generación, composición y release de `GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md` y
`GREENHOUSE_CAMPAIGN_LAYOUT_COMPILER_V1.md`. La carga por referencias sigue el ADR aceptado
`GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md`. No añade runtime, permisos, provider, ledger o
compositor de producción ni cambia estados humanos. No se necesita una nueva decisión arquitectónica para
esta implementación documental del contrato; cualquier extensión futura del compiler se evalúa aparte.


## Naturaleza de la doctrina y uso de evidencia

La distinción entre ventana estacional, conversación emergente y lenguaje de meme; los roles narrativos de
marca; la cadena observación/tensión/interpretación/mecanismo; y las cinco revisiones son el **estándar operativo
interno** del módulo 11. No atribuir toda esa taxonomía a una sola fuente ni presentarla como ley universal de
marketing. Los umbrales de reintento son reglas de trabajo para evitar gasto sin mejora, no benchmarks.

La conversación del operador sobre la silla y la libreta aportó correcciones de oficio: seasonality no equivale
a trendjacking; atribución no equivale a relación estratégica; archivo oficial no equivale a placement correcto.
El caso prueba aprendizaje de ese encargo, no rendimiento de audiencia, transferencia a video ni dominio de
Higgsfield/Magnific/3D. Registrar las pruebas de cada ruta por separado.

Para un nuevo encargo:

1. Guardar origen, fecha, mercado y observaciones que sostienen el detonante o contexto cultural.
2. Separar hechos observados, interpretación creativa, supuestos y decisiones de dirección.
3. Verificar datos volátiles de plataforma/modelo con su superficie primaria vigente; las fechas de este
   archivo indican cuándo se consultaron, no que se revalidaron automáticamente.
4. Citar la fuente que sostiene cada afirmación; no usar una guía de ads de una red como evidencia de alcance
   orgánico de otra. No prometer viralidad, asociación de marca ni ventas a partir de buenas prácticas.
5. Medir distribución, atención, respuesta, atribución y resultado según objetivo; declarar lo no medido.

Fuentes de perspectiva/material y sus límites se mantienen en [brand-in-scene.md](brand-in-scene.md), evitando
duplicar un segundo contrato de placement. La doctrina creativa dueña está en
[el módulo 11](../modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md).

## Investigación de creatividad y psicología — 2026-09-12

Las fuentes académicas, alcance de acceso y límites se mantienen junto a su aplicación en
[mechanisms](creative-mechanisms-and-innovation.md), [emotion/attention/memory](emotion-attention-memory.md)
y [heuristics/testing](heuristics-biases-and-testing.md). No convertirlas en una biblioteca de neurotrucos:
la evidencia sobre tareas de laboratorio y anuncios estudiados no equivale a eficacia de nuestra pieza.
El [módulo 12](../modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md) es el router operativo de este conocimiento.
