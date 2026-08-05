# Benchmark comparativo de Globe frente a Higgsfield y Magnific

> **Tipo:** benchmark competitivo de producto, UI y flujo de trabajo
> **Fecha de corte:** 2026-08-05 (America/Santiago)
> **Entidad evaluada:** Efeonce Globe / Creative Producer
> **Pares observados:** Higgsfield y Magnific
> **Estado:** investigación completa; implementación pendiente

## Resumen ejecutivo

Globe ya tiene la capa que más cuesta construir en una plataforma creativa comercial: catálogo gobernado,
estimación antes del gasto, reserva, provenance, derechos, retrieval privado y contratos de ruta. Higgsfield y
Magnific tienen una capa de producto más cerrada: cada control visible conduce a una siguiente acción y el asset
se convierte inmediatamente en algo que se puede revisar, modificar, reutilizar, organizar o compartir.

**A nivel de UI, Higgsfield y Magnific son claramente más fuertes que Globe hoy.** La ventaja no es sólo visual:
es una ventaja de comprensión y continuidad. Sus compositores explican mejor qué se puede hacer, sus estados
bloqueados dicen qué falta, sus selectores convierten el catálogo en una decisión y sus assets mantienen el
impulso hacia editar, recrear, referenciar, organizar o compartir. Globe se siente más como una consola
gobernada y técnica que como un producto creativo terminado porque varias affordances todavía no cierran el
loop en la superficie React activa.

La conclusión no es que Globe necesite copiar sus catálogos. La prioridad es cerrar el circuito:

  crear → revisar → modificar → reutilizar → aprobar/compartir

El gap más crítico está en la interfaz activa de React, no en la ausencia de contratos server-side:

1. ProducerFeedRoute.tsx mantiene onReference, onRecreate, onFavorite y onDownload como no-ops.
2. El descriptor creativeContract llega al browser, pero ProducerComposer no lo consume; la UI sigue
   dependiendo en partes clave de inputModes y de un límite de referencias legado.
3. ProducerViewer ya tiene dialog nativo, MediaStage, facts y provenance, pero no tiene las pestañas y
   acciones de revisión que convierten un preview en un espacio de trabajo.
4. Audio está declarado en el catálogo con rutas de voz, traducción, cambio de voz, foley y TTS, pero el
   ShapeControls activo muestra Voice como «—» y no expone el contrato específico de la ruta.

**Recomendación:** tratar TASK-1643 y TASK-1552 como la primera entrega de paridad de workflow; TASK-1641
permanece en paralelo como lane backend de promoción. Después,
completar MediaStage/Viewer y las operaciones zero-spend de lineage. El catálogo de modelos se puede ampliar
cuando el selector explique compatibilidad, capacidad, latencia orientativa, resolución y coste sin divulgar
slugs de proveedor ni datos internos.

**Confianza global:** alta para los estados visibles en la sesión y para la lectura del código de Globe fijado
en efeonce-globe main@21d6ee3; media para la comparación end-to-end de los competidores porque no se ejecutó una
generación nueva.

## Qué decide este benchmark

Este documento habilita una decisión de producto: qué capacidades del workflow creativo deben cerrarse antes de
invertir en más rutas, más modelos o más superficie de catálogo.

No es un benchmark de market share, precio, calidad de outputs, latencia real de proveedores ni términos
comerciales. Tampoco convierte una observación de UI de un proveedor en un compromiso de derechos o compliance.

### Peer set y normalización

El peer set es deliberadamente focalizado: Globe y los dos productos nombrados por el operador, que fueron
observados en una sesión autenticada. Es un benchmark de best practice y cross-shop, no un estudio amplio de
mercado. No se calcula mediana, percentil ni un score agregado de mercado porque n=2 no lo justificaría.

La unidad de comparación es una operación reproducible, no un crédito nominal:

- crear imagen con prompt, modelo, shape y referencias;
- crear video desde prompt, imagen, cuadros inicial/final o control de movimiento;
- crear audio con script/prompt, voz, idioma y parámetros;
- abrir y revisar un asset;
- recrear, usar como referencia, editar, descargar, organizar y compartir.

Los créditos, rangos de precio y tiempos que aparecieron en las interfaces se registraron como señales de
decisión del usuario. No se comparan como si fueran una unidad económica común.

## Fuentes y método

### Evidencia primaria: sesión autenticada

La auditoría de Higgsfield y Magnific se realizó el 2026-08-04 en las pestañas de Chrome ya abiertas y
autenticadas por el operador. No se creó una sesión, perfil o ventana de Chrome nueva.

No se pulsó Generar, no se subieron archivos, no se descargaron resultados y no se consumió presupuesto. Se
revisaron estados ya existentes, compositores, selectores, historial, biblioteca, cards y el viewer de un asset.
La evidencia visual completa está en [la auditoría de captura del 2026-08-04](./COMPETITIVE_UI_AUDIT_HIGGSFIELD_MAGNIFIC_2026-08-04.md).

### Verificación de Globe

La línea base técnica se verificó el 2026-08-05 contra el checkout sibling efeonce-globe:

- branch: main;
- commit: 21d6ee3;
- estado del checkout: limpio;
- referencia de runtime y rollout: Handoff activo de Greenhouse;
- alcance: código React activo, contratos, catálogo, paridad legacy y share board.

La evidencia de código está anclada a ese commit. Un cambio posterior debe revalidar cada hallazgo antes de
convertirlo en una task o en un criterio de aceptación.

### Verificación pública de vigencia

Las páginas oficiales se revisaron el 2026-08-05 sólo para confirmar el posicionamiento y el alcance público
actual de las superficies. No se usaron como prueba de la UI autenticada:

| Producto | Fuente oficial | Qué corrobora | Confianza |
|---|---|---|---|
| Higgsfield | https://higgsfield.ai/ai-image | imagen, edición, referencias, modelos y paso de imagen a video | Media; marketing first-party |
| Higgsfield | https://higgsfield.ai/ai-video | create/edit/motion, start/end frames y catálogo de video | Media; marketing first-party |
| Higgsfield | https://higgsfield.ai/text-to-video-ai | composición de video, voiceover, música, SFX y captions | Media; marketing first-party |
| Magnific | https://www.magnific.com/ai | plataforma integrada de imagen, video, audio, editors y modelos | Media; marketing first-party |
| Magnific | https://www.magnific.com/ | herramientas, Projects, Spaces y workflow integrado | Media; marketing first-party |
| Magnific legacy | https://magnific.ai/ | alcance histórico de upscale/transform/generate de imagen | Media; primera parte, superficie distinta |

Las afirmaciones de volumen, suscriptores o cobertura de mercado que aparecen en páginas de vendor no forman
parte de este benchmark.

### Revalidación de home autenticada con Chrome + Playwright — 2026-08-05

La corrección load-bearing se hizo tomando control de las pestañas que ya estaban abiertas en el Chrome del
operador. No se creó una pestaña, un perfil ni un contexto nuevo. La pestaña de Higgsfield estaba en Audio y la
de Magnific en el generador de video; ambas se navegaron a la home y se verificó el estado resultante.

| Producto | Pestaña existente | URL final | Señales visibles de sesión |
|---|---|---|---|
| Higgsfield | `https://higgsfield.ai/audio` | `https://higgsfield.ai/` | Assets, Notifications, Account menu y navegación interna ampliada; no aparecen Login ni Sign up |
| Magnific | `https://www.magnific.com/es/app/ai-video-generator...` | `https://www.magnific.com/app` | Workspace con Home, Projects, Library, Personal/Team project, avatar y notificaciones; no aparece Log in |

#### Higgsfield autenticado: home como feed editorial que conduce a producción

- La superficie sigue siendo oscura, cinematográfica y visualmente densa. Un banner verde neón vende Seedance
  2.5, mientras la navegación persistente expone Explore, Image, Video, Audio, Cinema Studio, Seedance 2.0
  4K, MCP & CLI, Academy, Supercomputer, Community, Contests, Plugins, Marketing Studio, Canvas, Originals,
  Shorts Studio y Explainer.
- El header autenticado agrega Search Higgsfield, Upgrade, Enterprise, Assets, Notifications y Account menu.
  La cuenta no se siente como un área separada: la biblioteca de assets queda a un clic del feed.
- El primer rail presenta proyectos como puertas de entrada: Higgsfield Global Film Festival, Hell Grind,
  Supercomputer: Free Mode, Academy y MCP/Plugin para After Effects. Cada card combina media, título, claim y
  navegación; el resultado se entiende antes de abrir el workflow.
- La siguiente zona mezcla una promoción grande de Seedance 2.5 con seis accesos de producto: Seedance 2.5,
  Seedance 2.0, Supercomputer, Academy, MCP & CLI y Cinema Studio 3.5. Es una matriz editorial + launcher,
  no un simple hero comercial.
- Hell Grind funciona como caso de estudio operable: “95 minutes”, prompts, assets y canvas incluidos, con
  acceso a un proyecto completo. Después aparece “Explore the inside of every project”, con proyectos públicos
  y enlace a la comunidad.
- La home autenticada incorpora además Adathon y Higgsfield App Contest: tabs All apps/Made by Higgsfield,
  búsqueda de apps, cards con views/credits, acciones por app y Explore all apps. La comunidad se convierte en
  un catálogo de herramientas reutilizables.
- Viral Presets es un índice accionable de patrones —Earth Zoom, Mighty Fighter, Moonwalk, Sticker Peel,
  Orbit 360, Action Figure, Blue Depth, Ice Statue y decenas más— seguido por rails de productos, modelos y
  funcionalidades. La inspiración está empaquetada como una decisión inmediata.

#### Magnific autenticado: home como workspace y command center

- La navegación cambia por completo respecto de la landing pública. El sidebar fijo concentra Create, Home,
  Search, Stock, Explore, Projects, Library y All tools; debajo fija Spaces, Image Generator, Video Generator,
  Voice Generator, Designer y 3D Scenes.
- El canvas principal abre con “Good evening, start creating!” y una barra de comando “Ask Magnific or
  navigate to” con atajo `⌘ K`. La primera acción es preguntar o navegar, no buscar un modelo a ciegas.
- Debajo hay ocho lanzadores visuales: Spaces, Image, Video, Audio, Design, 3D, Stock y All tools. La
  modalidad está explícita y la acción se entiende sin abrir el mega-menú de marketing.
- La home coloca un banner de Magnific Originals y luego dos superficies de trabajo: Projects y Spaces. Projects
  distingue Personal y Team project con Upgrade; Spaces muestra cards visuales con assets y conexiones. Se ve
  continuidad de trabajo, no sólo un historial plano.
- “My work” funciona como salida a la biblioteca personal. Más abajo, el contenido se organiza por What's new,
  Use cases, Academy y Community, con cards de modelos y capacidades recientes: video con sonido nativo,
  re-voice, Seed Audio, edición con lenguaje natural, image generation y nuevos modelos.
- Customize, AI Assistant, notificaciones y perfil permanecen en el chrome de la aplicación. La home combina
  orientación, creación, workspace y actualización de producto en una sola composición.

#### Qué significa contra Globe

La evidencia autenticada confirma una brecha aún más concreta que la home pública: Higgsfield convierte la home
en un feed editorial conectado a Assets, presets, comunidad y productos; Magnific convierte la home en un
workspace con command bar, modalidades, proyectos, espacios, biblioteca y novedades. Globe hoy necesita una
home de trabajo equivalente que conecte feed → intención → ruta/modelo → composer adaptativo → estimate →
viewer → biblioteca/reuse, agregando su ventaja propia de governance y provenance.

## Inventario del workflow observado

### Imagen

| Etapa | Higgsfield | Magnific | Globe |
|---|---|---|---|
| Entrada | Prompt persistente, relación, calidad, cantidad, modo Unlimited y Draw | Prompt, modelo Auto, 0/8 referencias, slots semánticos y Prompt con IA | Prompt, ruta/modelo público, preset, shape, seed, negative prompt y referencias gobernadas |
| Referencias | Referencias dentro del composer y paso posterior a video | Estilo, Personaje, Elemento, Localización, Color, Efectos, Cámara, Dibujo; historial y upload | Contrato server-side de input/roles, ingest privado y derechos; la UI no deriva aún todos los slots desde creativeContract |
| Modelo | Catálogo visual amplio y cambio inmediato | Búsqueda, proveedor, función, resolución, tiempo y coste | Nombre/versión públicos, estado de disponibilidad y guidance de coste, velocidad y bestFor; sin search/capability filters equivalentes |
| Confirmación | CTA comunica consumo, por ejemplo Generate 2 | CTA deshabilitada cuando faltan entradas y coste en el selector | Estimate pre-spend, hard cap y vigencia; fortalece el control económico |
| Continuación | Editar/inpaint y pasar la imagen a video | Editar, recrear, guardar, referencias y biblioteca | Contratos de recreate/variation/upscale/inpaint, pero acciones del feed React aún no cableadas |

Higgsfield destaca por reducir la distancia entre una imagen y un video. Magnific destaca por convertir el
panel de referencias en una biblioteca semántica reutilizable. Globe debe adoptar la semántica sólo cuando
corresponda al contrato real de la ruta; no debe fabricar categorías genéricas que el adapter no honra.

#### La diferencia visual del composer de imagen

La superioridad se nota en la composición completa, no en un detalle aislado:

- Higgsfield mantiene un muro de outputs visible detrás del composer; el usuario sigue viendo posibilidades
  mientras decide.
- Su selector abre una superficie que mezcla Features e intención con Models: Create Image, Cinematic Cameras,
  Canvas, Soul Moodboard, Soul ID, Inpaint y Image Upscale conviven con los modelos. La elección empieza por
  «qué quiero conseguir», no por memorizar un proveedor.
- El selector tiene búsqueda, modelos destacados, badges, descripción breve y el modelo actual queda reflejado
  en la barra inferior junto con relación, calidad, cantidad y Unlimited.
- Magnific lleva la misma lógica al panel de referencias y al selector: roles semánticos, filtros, búsqueda,
  capacidades, resolución, tiempo y coste se vuelven parte de la decisión.

En Globe, el selector sí comunica identity pública, availability y guidance básico de coste/velocidad/bestFor,
pero se siente más como un selector de ruta que como un director creativo. El composer mantiene controles
genéricos y el contrato creativeContract no decide todavía la forma visible. Por eso el usuario debe entender
la ruta antes de que la UI le ayude; en los líderes, la UI ayuda a entender la ruta.

### Video

| Etapa | Higgsfield | Magnific | Globe |
|---|---|---|---|
| Modos | Create Video, Edit Video y Motion Control | Video Generator con imagen inicial, imagen final, contenido adicional y plano | Rutas separadas para create, frames, motion control, edit y upscale en el catálogo |
| Entradas | Elements y Frames; Start frame y End frame opcional | Referencias por @img/@vid, start/end, contenido y referencia de audio según modelo | creativeContract declara first-frame, last-frame, motion-source y references; el composer activo no presenta el contrato completo |
| Shape | Modelo, duración, relación y coste en el mismo panel | Duración, relación y audio visibles; selector comunica resolución/coste | Resolution, duration, aspect ratio y audioMode vienen de constraints, con estimate antes de reservar |
| Ayuda | History y How it works; presets de cámara, framing y VFX | Selector explica capabilities por modelo | La ayuda contextual todavía es deuda del workflow React |
| Revisión | Viewer con player, timecode, Info, Tools, Comments y acciones | Cards, selección múltiple, biblioteca y recreación | MediaStage nativo y facts/provenance; sin Tools/Comments/timecode/acciones de revisión en ProducerViewer |

El aprendizaje principal es que video no es una variante grande de imagen. Los slots de cuadros, fuente de
movimiento, audio, duración y edición deben aparecer sólo cuando la ruta los acepta y deben explicar qué
ocurre si se cambia el modelo.

#### Video: aquí la brecha se amplifica

Sí, el video fue revisado y es donde la diferencia de producto se vuelve más evidente:

| Momento | Lo que muestran los líderes | Lo que ocurre en Globe |
|---|---|---|
| Orientación | Higgsfield separa Create Video, Edit Video y Motion Control; además muestra How it works con Add image, Choose preset y Get video | Globe tiene modos y rutas, pero el composer no convierte esa ruta en una guía visual equivalente |
| Dirección | Higgsfield muestra Elements/Frames, Start frame/End frame, tarjeta de modelo, duración, relación y CTA de coste en un mismo rail | Globe tiene constraints y contratos de first-frame/last-frame/motion-source, pero el consumer React no los expone de forma completa |
| Presets | Higgsfield hace visible la promesa de 250+ presets para cámara, framing y VFX | Globe todavía deja la dirección creativa principalmente en prompt y shape |
| Modelo | Magnific muestra chips Refs, Multi, Start/End, 4K, Audio y rangos de créditos; permite filtrar por proveedor, función, resolución y best-for | Globe muestra nombre, versión y guidance corto; faltan los filtros y la matriz visual de compatibilidad |
| Muro | Higgsfield organiza videos por fecha en una grilla de posters/play states; Magnific mantiene prompts, ratios, modelo y acciones alrededor de cada grupo | Globe reconcilia feed y estados con rigor, pero los posters de video todavía son una deuda y las acciones React están incompletas |
| Revisión | Higgsfield abre un stage grande con timeline, timecode, Info, Tools y Comments; se puede comentar sobre el tiempo | Globe abre MediaStage/Facts/provenance, pero el viewer de Producer todavía es pasivo |

El resultado es una diferencia de dos capas: Globe tiene el contrato de video debajo, pero el líder tiene el
director de video arriba. En una ruta de Globe con input obligatorio, el problema no es sólo que falte polish:
la UI todavía puede impedir que el operador llegue a una generación válida desde Producer. El canary de Veo
documentado en Handoff se produjo por el carril gobernado, no desde la UI del Producer.

### Audio

| Etapa | Higgsfield | Magnific | Globe |
|---|---|---|---|
| Modos | Voiceover, Change Voice y Translate | Text to Speech, modelos con tags de audio y selección de voces | speech-synthesize, audio-change-voice, audio-translate y audio-generate/foley en catálogo |
| Entrada | Prompt/script, modelo, preset de voz | Script con tags como risas/pausa, dos voces y contador | Prompt/brief y referencias gobernadas según ruta; el shape activo no expone voz |
| Controls | Voz, idioma y capacidad del modelo | Tono, intensidad, formato, sample rate, bitrate, pronunciación y streaming | Formato y velocidad visibles; Voice aparece como «—» pendiente del contrato |
| Asset | Waveform, proyecto, preset y duración | Biblioteca con selección y barra contextual | Feed con representación de audio y MediaStage con audio nativo; falta revisión especializada |
| Riesgo observado | CTA bloqueada si falta input, pero intención visible | Una opción mostró una clave interna de localization | El riesgo es más estructural: catálogo rico y UI que todavía no lo consume |

Audio confirma que el problema no es que Globe no tenga capacidades. El problema es que la ruta declarada
todavía no es la superficie que el operador utiliza para decidir.

#### La experiencia de audio también está claramente por delante en los líderes

La diferencia de audio no es sólo que ellos tengan más voces o modelos:

| Dimensión | Higgsfield | Magnific | Globe activo |
|---|---|---|---|
| Entrada | composer flotante sobre una biblioteca visual, con Voiceover, Change Voice y Translate como modos | herramienta dedicada Texto a voz dentro del mismo shell de creación | tabs de Locución, Cambiar voz y Traducir, pero con shape genérico |
| Intención | prompt de sonido, modelo Eleven v3 y Voice Preset visible | script de hasta 5000 caracteres con tags de audio, dos interlocutores y parámetros | prompt/brief de audio y sugerencias de modalidad; sin script/tag/voz visible en ShapeControls |
| Decisión de modelo | selector con Seed Audio, Eleven v3, Qwen Audio, MiniMax Speech, Seed Speech y VibeVoice; cada uno explica su especialidad | selector con ElevenLabs v3/v2, Gemini TTS y otras variantes; la descripción explica tags, calidad o interlocutores | catálogo declara rutas TTS, cambio de voz, traducción y foley; el UI sólo muestra identity/guidance básico |
| Control expresivo | emoción y delivery por tags; preset de voz | tono, intensidad, pronunciación, streaming y opciones de salida | formato y velocidad; Voice queda como «—» pendiente del contrato |
| Output | waveform, duración, proyectos y generaciones visibles en un canvas con imagen/video | cards de audio en la biblioteca, duración, selección múltiple y barra contextual de Descargar | feed con representación de waveform y filtro Audio; viewer sólo monta audio nativo |
| Continuidad | el audio vive junto a las piezas visuales y puede formar parte de la producción | el asset seleccionado se puede descargar, guardar, marcar y operar en batch | existen contratos de assets y share, pero las acciones del feed React siguen sin cablearse |

El punto importante es la sensación: en Higgsfield el audio parece una parte natural de una producción visual;
en Magnific parece una herramienta creativa completa; en Globe todavía parece una modalidad técnica que comparte
el mismo formulario.

Hay además un contraste útil para QA: Magnific mostró una clave interna de localization en el selector de
audio. El benchmark no recomienda copiar ese defecto; lo registra como evidencia de que una plataforma fuerte
visualmente también necesita pruebas de copy, fallback y nombres de modelo.

## Revisión de un asset: patrón de referencia

### Qué hace Higgsfield

El viewer Asset showcase observado es el patrón de workflow más completo:

- reproductor con pausa, velocidad, mute, volumen, timecode, progreso, comentario sobre el tiempo y fullscreen;
- pestañas Info, Tools y Comments;
- prompt copiable, inputs, modelo, calidad, tamaño y fecha;
- Recreate, Reference, Download, Like, compartir y menú de más acciones;
- Edit video, Reframe, Upscale, Remove Background y Change scene & lighting;
- comentarios generales y ligados a un rango temporal, dibujo y emojis.

El resultado es una revisión accionable: el usuario puede entender la pieza, marcar feedback y continuarla sin
volver a empezar desde cero.

### Qué hace Magnific

Magnific combina dos niveles:

1. cards densas con prompt, relación, modelo, modo de razonamiento y resolución;
2. acciones rápidas de seleccionar, más opciones, eliminar, descargar, me gusta, editar, guardar y recrear.

La selección múltiple y la barra contextual de biblioteca reducen el coste de revisar una colección. El modelo
de biblioteca hace visible que un asset puede ser un insumo, no sólo un resultado final.

### Qué hace Globe hoy

Globe ya tiene una base correcta de confianza:

- ProducerViewer usa dialog nativo, captura/restaura foco y sirve bytes mediante governed-media;
- MediaStage reconoce image, video y audio con controles nativos;
- Facts, route/model identity, estado y provenance se mantienen fuera de una simple thumbnail;
- ShareBoard ya conserva facts, comentarios y una vista read-only con MediaStage;
- los contratos de assets incluyen favorite y copyAsReference, y el inventario legacy incluye review, decide,
  share, library y output readers.

La superficie React activa todavía termina antes de la revisión colaborativa:

- ProducerViewer sólo recibe onClose;
- no hay tabs Info/Tools/Comments;
- no hay acciones onReference/onRecreate/onFavorite/onDownload conectadas desde el feed;
- no hay timecode, comentarios sobre rango temporal, dibujo ni herramientas por capability;
- MediaStage no tiene track de captions porque el contrato de share no proyecta ese campo.

La lectura correcta es «fundación de plataforma sólida, workflow de asset incompleto», no «viewer inexistente».

## Scorecard cualitativo

La escala mide madurez de workflow observado, no calidad del modelo ni performance de infraestructura:

| Puntaje | Significado |
|---|---|
| 0 | No observado |
| 1 | Idea o shell; no hay evidencia de contrato/acción utilizable |
| 2 | Contrato o superficie parcial; la acción no cierra el loop |
| 3 | Flujo funcional observado, con límites o poca profundidad |
| 4 | Flujo cerrado con revisión, continuación y estados comprensibles |

| Métrica primaria | Globe | Higgsfield | Magnific | Confianza / lectura |
|---|---:|---:|---:|---|
| Composer por modalidad | 2 | 4 | 4 | Alta: Globe tiene tabs y shape, pero no route-native completo |
| Decisión de modelo | 3 | 3 | 4 | Media-alta: Magnific expone más filtros y señales comparables |
| Referencias y roles | 2 | 3 | 4 | Alta: Globe tiene contrato gobernado, UI todavía genérica |
| Pre-spend y control económico | 4 | 3 | 3 | Alta para Globe; la CTA de los pares comunica créditos, no el mismo hard cap |
| Feed, biblioteca y estados | 2 | 3 | 4 | Alta para observación UI; Globe tiene reconciliación, pero acciones incompletas |
| Revisión del asset | 2 | 4 | 3 | Alta: Higgsfield muestra viewer profundo; Magnific destaca en cards/batch |
| Reutilización y lineage | 2 | 4 | 4 | Alta: los contratos Globe existen, los handlers React son el gap |
| Audio de primera clase | 2 | 4 | 4 | Alta: catálogo Globe rico, controls activos incompletos |
| Home de trabajo e IA | 2 | 4 | 4 | Alta: Higgsfield conecta feed/presets/assets; Magnific conecta command bar, modalidades, proyectos y biblioteca |
| Rights/provenance visible | 4 | 2 | 2 | Media: Globe evidencia governance; en pares sólo se observó una parte de los estados |

No se debe sumar esta tabla para declarar un ranking general. Sirve para localizar el cuello de botella y
decidir la siguiente slice.

La lectura de UI sí es inequívoca: Higgsfield y Magnific están por delante en madurez percibida, claridad de
decisión y continuidad del workflow. Globe sólo supera a los pares observados en la dimensión de
rights/provenance visible y control económico; esa ventaja no compensa todavía que una card o viewer pueda
mostrar acciones que no terminan la operación.

En términos prácticos, la brecha es de una categoría de madurez completa en imagen y de dos capas en video:

| Superficie | Globe activo | Líder observado | Magnitud del gap |
|---|---|---|---|
| Composer de imagen | selector de ruta + controles genéricos | intención, features, modelo, referencias y outputs en una misma composición | alta |
| Muro de imágenes/assets | feed gobernado, pero menos expresivo y con acciones pendientes | canvas/grilla visual, metadata contextual y acciones inmediatas | alta |
| Viewer de imagen/video | stage gobernado, facts y provenance | stage inmersivo, tabs, tools, comentarios y continuidad | muy alta |
| Composer de video | constraints fuertes en backend, consumer incompleto | modos, presets, frames, capabilities y coste visibles | muy alta |
| Historial de video | reconciliación y estados técnicamente sólidos | posters, fechas, playback y estados legibles | alta |
| Composer y revisión de audio | catálogo rico, controls genéricos y Voice pendiente | script, voz, parámetros, waveform y selección contextual | alta |
| Home autenticada | superficie Producer con feed y composer, pero sin una entrada orquestadora completa | feed editorial o workspace con proyectos, modalidades, assets/biblioteca y siguientes acciones | alta |

No es una crítica estética menor. Es la diferencia entre una UI que ayuda a crear y una UI que exige que el
operador ya sepa cómo funciona la plataforma.

Por eso la prioridad no es hacer que Globe “se vea como” un competidor. Es hacer que la UI sea igual de
consecuente: cada estado tiene que explicar su razón, cada control tiene que ejecutar su contrato y cada asset
tiene que ofrecer una siguiente acción segura.

## Hallazgos accionables

### H1 — Globe tiene una ventaja defendible en confianza, pero no la convierte todavía en ventaja de uso

**Afirmación:** Globe está más avanzado en control de gasto, provenance, derechos, grants y retrieval privado.

**Evidencia:** Creative Producer, contratos de assets, governed-media, Asset Governance y share board; además,
el estado operativo y de rollout están registrados en Handoff y en la arquitectura de Creative Studio.

**Confianza:** Alta.

**Implicación:** mantener esta capa como diferenciador. La prioridad es hacerla visible y utilizable en cards,
viewer y composer, no esconderla detrás de contratos server-side.

### H2 — La brecha principal es el loop create → review → reuse

**Afirmación:** Los competidores convierten el asset en una siguiente acción; Globe muestra muchas de esas
acciones como intención o contrato, pero la interfaz React activa aún no las ejecuta.

**Evidencia:** no-ops explícitos en ProducerFeedRoute.tsx:311-337; viewer acotado a MediaStage/Facts en
ProducerViewer.tsx:116-181; acciones y readers ya inventariados en legacy-parity.ts:51-109.

**Confianza:** Alta.

**Implicación:** cerrar TASK-1643 antes de ampliar el catálogo. Una UI que anuncia Reference o Download y no
hace nada erosiona confianza más rápido que una capability ausente y explicada.

### H3 — El contrato creativo de ruta es el puente entre flota y UX

**Afirmación:** Globe ya tiene la abstracción necesaria para diferenciar first-frame, last-frame, motion-source,
voice-script, source-audio, controls y output; el composer aún se comporta en parte como formulario común.

**Evidencia:** RouteCreativeContractV1 en packages/contracts/src/producer-catalog.ts:263-271; rutas de Omni,
Veo frames, Seedance motion, voice change, translate, foley y TTS en packages/domain/src/producer-catalog.ts;
ProducerComposer usa referenceCapOf y no contiene ocurrencias de creativeContract en la UI activa.

**Confianza:** Alta.

**Implicación:** TASK-1552 debe derivar controls, slots y validaciones del descriptor publicado. Cada control
debe tener una de tres salidas explícitas: se aplica, se rechaza antes de gastar o no aparece.

### H4 — Model picker debe explicar la decisión, no sólo enumerar nombres

**Afirmación:** Magnific hace más visible la elección comparando función, proveedor, resolución, tiempo y coste;
Higgsfield favorece descubrimiento visual; Globe ya muestra nombre público y guidance básico.

**Evidencia:** selectores observados y ProducerComposer.tsx:2407-2469; ProducerModelGuidanceV1 en el contrato.

**Confianza:** Media-alta.

**Implicación:** agregar búsqueda, compatibilidad, capacidades y restricciones sólo cuando provengan de una
fuente gobernada. Mantener ocultos provider slug, margen, coste interno y cualquier dato no destinado al
audience del Producer.

### H5 — Audio es la prueba de que la paridad debe ser route-native

**Afirmación:** Los pares presentan audio como producto completo; Globe declara rutas equivalentes, pero el UI
activo no permite elegir ni revisar todas sus dimensiones.

**Evidencia:** ShapeControls audio en ProducerComposer.tsx:3048-3071 muestra Voice como «—»; el catálogo
declara rutas en producer-catalog.ts:573-683.

**Confianza:** Alta.

**Implicación:** implementar audio como slice de contrato, no como más campos genéricos. Incluir voz, script,
idioma, tags, sample rate, formato, pronunciación y waveform sólo donde la ruta los soporte.

### H6 — La biblioteca y el viewer son dos escalas de revisión

**Afirmación:** Magnific enseña que la revisión rápida necesita cards, selección y batch; Higgsfield enseña que
la revisión profunda necesita player, metadata, tools y comments.

**Evidencia:** cards/biblioteca de Magnific y viewer Info/Tools/Comments de Higgsfield; Globe Feed y ShareBoard
ya tienen primitives parciales, pero ProducerViewer no integra la segunda escala.

**Confianza:** Alta.

**Implicación:** no escoger entre feed o viewer. Construir acciones rápidas en card y MediaStage profundo,
con la misma identidad de asset, permisos, lineage y estado.

## Qué adoptar, adaptar y evitar

### Adoptar

- Composer específico por modalidad y operación.
- Model picker con capacidades, compatibilidad, resolución, latencia orientativa y coste.
- Slots semánticos de referencia derivados de creativeContract.
- CTA con razón de bloqueo y confirmación pre-spend.
- Cards accionables con estado, lineage resumido y operaciones zero-spend.
- Viewer con Info, Tools, Comments, metadata, prompt, inputs, provenance y playback.
- Audio con waveform, script, voz, idioma, formato y parámetros de salida cuando aplique.
- Help contextual tipo How it works para video y operaciones con inputs complejos.

### Adaptar a Globe

- Convertir Reference y Recreate en prellenado de composer con sourceAssetId, sin crear job hasta confirmación.
- Mostrar en el viewer sólo tools permitidas por capability, rights y modality.
- Separar información pública del modelo de la información interna de proveedor.
- Mostrar governance como una razón comprensible: retained, quarantined, rights verification, policy-blocked,
  dependency_unavailable y degraded no son sinónimos.
- Mantener el patrón de lectura de Globe: estimate vigente, hard cap, reserved vs spent y no reintentar gasto
  ambiguo.

### Evitar

- Catálogo grande diferenciable sólo por nombre.
- Control visual sin handler real.
- Field genérico que el adapter ignora o que viaja como texto accidental.
- Categorías semánticas de referencias que no estén respaldadas por el contrato.
- Rangos de coste/tiempo sin unidad o sin explicar si dependen de plan.
- Copiar claims de marketing como si fueran evidencia de calidad o legalidad.
- Mostrar claves internas de localization; Magnific expuso una durante la observación y debe quedar como
  contraejemplo de QA.
- Crear un ADR nuevo sólo para registrar esta auditoría. El benchmark recomienda decisiones; no las acepta.

## Backlog priorizado y criterios de aceptación

| Prioridad | Entrega | Task/carril | Evidencia de cierre |
|---|---|---|---|
| P0 | Conectar Reference, Recreate, Favorite y Download del feed; explicar input obligatorio en rutas bloqueadas | TASK-1643; contracts `TASK-1503`, `TASK-1552`, shell `TASK-1559` | captura browser de cada acción, command/reader real, error visible y prueba de no duplicación |
| P0 | Hacer que el composer consuma creativeContract, slots y controls de la ruta | TASK-1552, alineado con TASK-1633 | ruta con first-frame, ruta con motion-source y ruta de audio; cada control aplicado o rechazado antes de estimate/prepare |
| P1 | Completar MediaStage/ProducerViewer con Info, Tools, Comments, prompt, inputs, lineage y acciones | viewer / review | desktop y 390 px; teclado; reduced motion; herramientas condicionadas por capability |
| P1 | Implementar Reference/Recreate zero-spend con sourceAssetId y recipe gobernada | feed + composer + assets | no aparece job ni reserva hasta confirmar; lineage visible; rights heredados |
| P1 | Mejorar model picker con search, compatibilidad, capabilities, latencia orientativa, resolución y coste | model fleet + UI | sólo datos públicos/gobernados; provider slug y margen nunca llegan al browser |
| P1 | Completar biblioteca/historial con estados terminales, rights, retención, selección y batch | library / feed | selección reversible, acciones persistidas, paginación y estados sin placeholders |
| P2 | Exponer audio route-native y revisión de audio | audio composer/viewer | voice/script/tags/idioma/formato visibles sólo cuando el contrato los soporta; waveform y duración |
| P2 | Añadir ayuda contextual y empty/loading/error recovery | UX / copy / QA | toda CTA disabled explica qué falta; recovery no reenvía gasto ambiguo |

### Orden de ejecución recomendado

1. TASK-1643: eliminar affordances mentirosas del feed y cerrar el handoff zero-spend a Composer.
2. TASK-1552: consumir creativeContract para que la forma visible sea la forma ejecutable.
3. Viewer/review: convertir el asset retenido en una superficie de trabajo.
4. Reference/Recreate: cerrar el ciclo de lineage sin gasto accidental.
5. Model picker y biblioteca: hacer descubrible la flota y operable la colección.
6. Audio: completar la modalidad con la misma disciplina.

## Riesgos y controles de derechos

Este benchmark no autoriza copiar assets, prompts, nombres de modelos o comportamientos protegidos de los
competidores. Las capturas documentan una interfaz observada; no constituyen licencia de contenido, marca,
voz, personaje o proveedor.

Para Globe, cualquier implementación debe mantener:

- autorización y workspace server-side;
- referencias privadas sólo después de ingest, malware, C2PA y rights;
- herencia de restrictions en derivados;
- separación entre candidate_ready y aprobación humana;
- no entrega de assets internal-evaluation-only o no-client-delivery;
- grant efímero para preview/download y no acceso directo al bucket;
- disclosure público basado en route/model identity, nunca en provider slug o coste interno.

## Limitaciones y qué debe validarse después

- No se ejecutó una nueva generación en Higgsfield ni Magnific; no hay comparación de output quality, real
  latency, failure recovery o charge settlement.
- Los nombres, modelos, precios, tiempos, disponibilidad y orden del catálogo pueden cambiar por fecha, plan,
  región o rollout.
- La auditoría de UI no es prueba de que una acción del competidor sea durable en backend.
- La línea base de Globe está fijada a 21d6ee3; cualquier cambio posterior puede cerrar o mover los gaps.
- No se calcula costo unitario ni margen a partir de créditos nominales.
- No se acepta aquí ninguna decisión arquitectónica nueva. Si la implementación cambia un contrato compartido,
  una proyección o la política de lineage, debe pasar el ADR gate vigente.

## Source log de capturas

### Higgsfield

- [Image composer](./evidence/2026-08-04/higgsfield-image-compose.png)
- [Image model selector](./evidence/2026-08-04/higgsfield-image-model-selector.png)
- [Video composer](./evidence/2026-08-04/higgsfield-video-compose.png)
- [Video history](./evidence/2026-08-04/higgsfield-video-history.png)
- [Video asset viewer](./evidence/2026-08-04/higgsfield-video-asset-viewer.png)
- [Video asset Info](./evidence/2026-08-04/higgsfield-video-asset-info.png)
- [Video asset Tools](./evidence/2026-08-04/higgsfield-video-asset-tools.png)
- [Audio composer](./evidence/2026-08-04/higgsfield-audio-compose.png)
- [Audio model selector](./evidence/2026-08-04/higgsfield-audio-model-selector.png)

### Magnific

- [Image composer](./evidence/2026-08-04/magnific-image-compose.png)
- [Image model selector](./evidence/2026-08-04/magnific-image-model-selector.png)
- [Image references](./evidence/2026-08-04/magnific-image-references.png)
- [Reference characters](./evidence/2026-08-04/magnific-reference-characters.png)
- [Image generator library](./evidence/2026-08-04/magnific-image-generator.png)
- [Image assets](./evidence/2026-08-04/magnific-image-assets.png)
- [Video composer](./evidence/2026-08-04/magnific-video-compose.png)
- [Video model selector](./evidence/2026-08-04/magnific-video-model-selector.png)
- [Video references](./evidence/2026-08-04/magnific-video-references.png)
- [Audio composer](./evidence/2026-08-04/magnific-audio-compose.png)
- [Audio model selector](./evidence/2026-08-04/magnific-audio-model-selector.png)
- [Audio selected asset](./evidence/2026-08-04/magnific-audio-selected.png)

### Evidencia de home autenticada con Chrome + Playwright — 2026-08-05

Estas capturas y snapshots se tomaron sobre las pestañas existentes del Chrome autenticado. Los snapshots
conservan la navegación, el estado de cuenta y la composición visible de cada workspace.

#### Higgsfield

- [Home autenticada viewport](./evidence/2026-08-05/home-chrome-auth/higgsfield-home-authenticated-viewport.png)
- [Home autenticada completa](./evidence/2026-08-05/home-chrome-auth/higgsfield-home-authenticated-full.png)
- [Snapshot autenticado](./evidence/2026-08-05/home-chrome-auth/higgsfield-home-authenticated.snapshot.txt)

#### Magnific

- [Home autenticada viewport](./evidence/2026-08-05/home-chrome-auth/magnific-home-authenticated-viewport.png)
- [Home autenticada completa](./evidence/2026-08-05/home-chrome-auth/magnific-home-authenticated-full.png)
- [Snapshot autenticado](./evidence/2026-08-05/home-chrome-auth/magnific-home-authenticated.snapshot.txt)

### Evidencia complementaria de home pública — Playwright aislado — 2026-08-05

Esta segunda carpeta se conserva sólo como referencia de las landings públicas y no debe usarse para afirmar
estado autenticado.

- [Higgsfield pública desktop](./evidence/2026-08-05/home-playwright/higgsfield-home-public-desktop.png)
- [Magnific pública desktop](./evidence/2026-08-05/home-playwright/magnific-home-public-desktop.png)
- [Magnific pública Creative Suite](./evidence/2026-08-05/home-playwright/magnific-home-public-creative-suite-menu.png)

## Referencias canónicas de Globe

- [Creative Producer — documentación funcional](../../documentation/creative-studio/efeonce-globe-creative-producer.md)
- [Contrato creativo por ruta](../../documentation/creative-studio/efeonce-globe-contrato-creativo-ruta.md)
- [Creative Producer — manual de uso](../../manual-de-uso/creative-studio/usar-creative-producer-globe.md)
- [Feed y viewer — manual operativo](../../manual-de-uso/creative-studio/operar-feed-viewer-producer-globe.md)
- [Arquitectura de Creative Producer](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- [ADR-022 — contrato creativo de ruta](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md)
- [Estado de la flota](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md)
- [Handoff activo](../../../Handoff.md)

## Cierre documental

**Actualizado:** auditoría comparativa, síntesis contra Globe, detalle de home, scorecard, backlog y source
log con capturas y snapshots de Playwright.

**No actualizado:** arquitectura, ADR, código, tasks, project_context y changelog. Este documento es evidencia
fechada y recomendación; no cambia el contrato runtime ni acepta una decisión de arquitectura.

**Verificación esperada:** pnpm docs:closure-check, pnpm docs:context-check:strict si se modifica Handoff,
y git diff --check.

**Estado honesto:** home autenticada documentada con las pestañas existentes de Chrome y comparación actualizada;
la evidencia pública queda separada como referencia secundaria. Implementación y asignación formal de owners
pendientes.
