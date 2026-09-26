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

## Caso GTA VI «Nivel de búsqueda» — consultado el 2026-09-19

**Vigencia: el meme «We got X before GTA 6» y la tensión de la espera caducan el 19-nov-2026** (lanzamiento). Tras
esa fecha, no reutilizar el gancho; la estética puede seguir como código, con estudio revalidado. Estudio completo
con etiquetas `[V]/[O]/[NV]`: `ai-generations/2026-09-19_nivel-de-busqueda/brief/gta6-visual-study.md`.
Bitácora: `docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md`.

| Fuente | Aporte aplicado | Límite |
|---|---|---|
| [Rockstar Newswire — Grand Theft Auto VI: The Album](https://www.rockstargames.com/newswire/article/7599a881942544/announcing-grand-theft-auto-vi-the-album-coming-november-19) | álbum oficial sale el 19-nov-2026 (corrigió un «19-sep» del brief) | anuncio del álbum, no del juego |
| [Variety](https://variety.com/2025/gaming/news/gta-6-release-delayed-november-2026-1236571679/) y [Wikipedia — GTA VI](https://en.wikipedia.org/wiki/Grand_Theft_Auto_VI) | lanzamiento 19-nov-2026 tras dos retrasos; época 2020s, sátira de redes/influencers | Wikipedia es secundaria; revalidar la fecha si hay nuevo retraso |
| [Wikipedia — GTA V](https://en.wikipedia.org/wiki/Grand_Theft_Auto_V) | GTA V salió el 17-sep-2013: «13 años de espera» | — |
| [Wikipedia — GTA: Vice City](https://en.wikipedia.org/wiki/Grand_Theft_Auto:_Vice_City) | la estética synthwave de 1986 es la entrega anterior, no GTA VI | explica el error v1; no describe GTA VI |
| [Creative Boom, 27-ago-2026](https://www.creativeboom.com/insight/what-gta-6s-trailers-tell-us-about-vice-city-lucia-and-the-biggest-creative-launch-of-the-decade/) | registro de sátira del presente; paleta rosa, púrpura y turquesa | análisis editorial `[O]` |
| [Rockstar Intel — carátula y logo](https://rockstarintel.com/new-gta-6-cover-art-wallpapers-logo-released/) | carátula en collage de paneles; logo 2026 | fan site; la técnica pictórica exacta quedó `[NV]` |
| [allthings.how — HUD](https://allthings.how/gta-6-hud-icons-and-meters-explained-extended-look/) y [Sportskeeda — UI](https://www.sportskeeda.com/gta/all-ui-elements-revealed-gta-6-extended-look) | HUD mínimo: estrellas, minimapa, notificaciones; base del HUD propio dibujado | describen el Extended Look; la UI final puede cambiar |
| [GTA Wiki ES — Nivel de búsqueda](https://gta.fandom.com/es/wiki/Nivel_de_b%C3%BAsqueda_de_Grand_Theft_Auto_V) | «nivel de búsqueda» es el término de la comunidad hispana | string de la UI localizada de GTA VI `[NV]` |
| [Know Your Meme — We got X before GTA 6](https://knowyourmeme.com/memes/we-got-x-before-gta-6) | origen 2021, auge 2023; estructura del gancho de portada | muestra de uso, no medición de alcance |
| [allthings.how — vallas Spotify](https://allthings.how/spotify-s-gta-6-billboards-what-s-confirmed-and-what-isn-t/) y [TechPowerUp](https://www.techpowerup.com/352815/spotify-teases-gta-6-collaboration-with-billboards-in-major-us-cities) | Spotify con vallas en NY, LA y Miami desde el 16-sep-2026 | marcas no listadas = no documentadas, no ausentes |
| [Netflix Tudum](https://www.netflix.com/tudum/articles/grand-theft-auto-6-extended-first-look) | Netflix estrenó el Extended Look | — |
| [PlayStation LifeStyle, 11-sep-2026](https://www.playstationlifestyle.net/2026/09/11/gta-6-real-life-vice-city-miami-beach-advertising-deal/) | acuerdo de Miami (USD 3 M, marca discreta 15-oct–31-dic); ejemplo de límite de IP | no es asesoría legal |
| [Monster — Ultra Vice Guava](https://www.monsterenergy.com/en-us/energy-drinks/zero-sugar/ultra-vice-guava/) | asociación por vocabulario visual sin licencia de la IP | lectura `[O]` de la intención de la marca |

## Investigación de creatividad y psicología — 2026-09-12

Las fuentes académicas, alcance de acceso y límites se mantienen junto a su aplicación en
[mechanisms](creative-mechanisms-and-innovation.md), [emotion/attention/memory](emotion-attention-memory.md)
y [heuristics/testing](heuristics-biases-and-testing.md). No convertirlas en una biblioteca de neurotrucos:
la evidencia sobre tareas de laboratorio y anuncios estudiados no equivale a eficacia de nuestra pieza.
El [módulo 12](../modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md) es el router operativo de este conocimiento.
