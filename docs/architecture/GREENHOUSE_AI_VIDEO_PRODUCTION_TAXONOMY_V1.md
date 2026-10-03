# Greenhouse — Taxonomía de la producción de video con IA V1

> **Tipo de documento:** Referencia técnica agent-facing (clasificación y vocabulario)
> **Version:** 1.3
> **Creado:** 2026-10-03 por Claude (sesión «Clasificación de producción de video con IA»)
> **Ultima actualizacion:** 2026-10-03 por Claude — v1.3: subtipos (§3.1b), estética o look (§3.1c), dificultad de la toma (§3.14), árbol de decisión y presupuesto por toma (§4), casos reales clasificados (§4.3). v1.2: tipo de video (§3.1b: registro visual y técnica, con camino, candidatos, costo y esfuerzo). v1.1: principio «propio primero, proveedor como puente» (§1, §3.13), carril CLI de Higgsfield (§3.12) y siete operaciones nuevas (§3.5).
> **Dueña del oficio:** skill `motion-design-studio` (audio: `audio-studio`; dirección de arte y canon fotográfico:
> `design-studio`; método de elección de modelos y costo: `ai-model-selection`)
> **Programa que la implementa:** [EPIC-051](../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md)
> **Documentación relacionada (no se duplica acá):**
> [Guía de selección de modelos](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) (la matriz operación × motor vive en su §4.3) ·
> [Método de producción y posproducción de video](../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) ·
> [ADR-024 CLI primero](creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md) ·
> [Selección de motor por contrato de fidelidad](../../.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md) ·
> [Generador visual §Pipeline de inpainting](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

---

## 0. Para qué sirve y qué no

**Sirve para clasificar** cualquier pieza de video de Efeonce antes de gastar, recorriendo sus tres fases
—**preproducción, producción y posproducción**—: qué es y de qué tipo (hiperrealista, motion, personaje 3D…), a qué barra de calidad se
entrega, qué operaciones necesita, con qué cast, qué referencias, qué texto, qué audio, en qué formato y con qué
derechos. Con esa clasificación se elige el motor (guía §3 y §4.3), se arma el paquete de producción (método) y se
sabe si la capacidad existe, existe sin garantía o no existe (§5).

**Reparto de responsabilidades — la taxonomía organiza, la guía mide, el método ejecuta:**

| Pregunta | Dónde se responde |
|---|---|
| ¿Qué tipo de pieza es, qué operaciones pide y qué barra debe pasar? | **este documento** |
| ¿Qué motor hace esa operación, con qué evidencia y a qué costo por resolución? | guía de selección (§3 árbol, §4.2 familias, **§4.3 operación × motor**, §7 costo) |
| ¿Cómo se produce de principio a fin (paquete, estados, gates)? | método de producción y posproducción + companions de `motion-design-studio` |
| ¿Qué receta funcionó en un caso real? | `motion-design-studio/workflows/` |

🔴 **Este documento NUNCA lleva precios, resoluciones máximas ni cupos de referencias.** Un número copiado acá se
desincroniza en silencio de la guía. Si necesitas el dato, ábrelo allá.

**No es:** un catálogo de modelos, una receta, ni un contrato de Globe. Los ids de operación de §3.5 son el
vocabulario que los CLIs del programa adoptan en su manifiesto (ADR-024 §D3, «contrato estable»); Globe, si algún día
gradúa una capacidad, traduce ese vocabulario a su propio contrato.

## 1. Cinco principios que mandan sobre todas las dimensiones

1. **El contrato de fidelidad elige el motor; el canal y el precio son datos de forma.** Qué debe quedar idéntico y
   qué puede reinterpretar el modelo decide si se genera y con qué tolerancia (canon: workflow de selección por
   contrato de fidelidad).
2. **Lo generativo propone; lo determinístico garantiza.** El patrón del pipeline de inpainting (TASK-1965/1973): el
   modelo trabaja dentro de una zona y el pipeline recompone sobre el original y verifica el archivo escrito (delta 0
   fuera de la zona, códigos `0` PASS · `2` FAIL · `3` REVISAR · `1` error). Toda operación nueva de video declara qué
   parte es generativa y qué parte se verifica (§3.5, columna «carril»).
3. **Neutral de motor.** Hay muchos motores de video (Seedance, Flux 3, Wan, MiniMax H3, Gemini Omni, la API de
   Higgsfield con Kling y otros) y cada operación la resuelven varios. Ninguno es el default de la clasificación: el
   motor sale del contrato de fidelidad y de la evidencia de la guía §4.3.
4. **Propio primero, proveedor como puente** *(operador, 2026-10-03)*. Si una operación la resuelven nuestros CLIs
   —los que existen o los que construye EPIC-051—, va por ahí; mientras no exista lo nuestro, se usa la herramienta
   del proveedor (CLI de Higgsfield, MCP de Higgsfield o Magnific, fal) y la operación declara qué task la reemplaza
   (§3.13). Los modelos generativos siempre son de un proveedor: lo **propio** es la capa que los invoca con
   estimación, manifiesto y garantía, más todo lo determinístico. Un puente de proveedor envuelto como motor de
   nuestro pipeline (por ejemplo, un modelo de Higgsfield dentro de `pnpm ai:inpaint video`) recupera la garantía.
5. **Un `completed` sólo acredita recepción.** Una salida técnicamente válida sigue siendo candidata hasta la revisión
   humana al 100 %; el veredicto de un detector garantiza lo que no se tocó, no que el pedido se haya cumplido.

## 2. Ficha de clasificación (lo que toda pieza declara)

Antes de la primera llamada pagada, la pieza llena esta ficha en su paquete de producción. Los nombres de campo son
los que adoptan los manifiestos del programa (EPIC-051):

```yaml
pieza: reel-social            # §3.1
tipo: personaje-3d/nexa       # §3.1b tipo/subtipo (por toma si la pieza combina tipos)
look: cine                    # §3.1c
dificultad: { R: 2, I: 2, F: 2, C: 2, D: 0, E: 1, P: 2, total: 11, banda: media }   # §3.14
uso: organico                 # §3.1
nivel: final                  # §3.2
fidelidad:                    # §3.3
  identico: [kv-aprobado, logo, copy, rostro-nexa]
  interpretable: [movimiento-de-camara, gesto, particulas]
origen: kv-aprobado           # §3.4
operaciones:                  # §3.5, por fase
  pre: [pre.brief, pre.keyframe-still, pre.cast-sheet, pre.animatic, pre.pilot, pre.estimate]
  produccion: [gen.i2v, time.extend]
  post: [finish.reframe, finish.overlay, audio.music, audio.mix, deliver.export]
cast:                         # §3.6
  - { tipo: nexa, ancla: ai-generations/_identidad-nexa/1-anclas/, detector: foto:rostro }
referencias:                  # §3.7
  - { rol: primer-cuadro, archivo: kv-4x5.png }
  - { rol: movimiento, archivo: previs-blocking.mp4 }
texto: compuesto              # §3.8
audio: { nativo: descartar, musica: licencia-propia, voz: none, lipsync: none }   # §3.9
formato: { duracion_s: 15, aspecto: [9:16, 4:5], fps: 24, entrega: 1080x1920 }    # §3.10
derechos: { personas_reales: [], voz_real: none, musica: propia, marcas_terceros: [] }   # §3.11
carril: cli-verificado        # §3.12 (el más débil de las operaciones)
```

## 3. Dimensiones

### 3.1 Tipo de pieza y uso

| Pieza | Uso típico | Qué la define (y la decide) |
|---|---|---|
| `ad-paid` | performance en Meta/LinkedIn/TikTok/YouTube | hook en los primeros cuadros, versiones por placement, safe zones de la plataforma; eficacia sólo la mide la pauta |
| `organico-social` | feed | ritmo de canal, legible sin sonido |
| `story-reel` | vertical efímero | 9:16, interfaz de la plataforma encima (zonas reservadas), loop o cierre corto |
| `hero-sitio` | portada o sección de web | loop silencioso, peso del archivo, sin texto quemado (el texto lo pone la web) |
| `demo-producto` | mostrar una interfaz o producto real | **la UI y el producto son verdad**: se componen o se graban, nunca se reinterpretan |
| `explainer` | explicar un concepto | narración, tipografía kinética, ilustración o mograph |
| `deck` | clip embebido en una presentación | corto, silencioso o con audio opcional, formato de la lámina |
| `cutdown` **[agregado]** | derivados 15/10/6 s de un master aprobado | se arman en post desde el master; no se regeneran (workflow `single-shot-to-deterministic-campaign-hero`) |
| `brand-film` **[agregado]** | pieza narrativa de marca o campaña | arco, varias tomas con continuidad, diseño sonoro propio |

**Por qué se agregaron:** `cutdown` es la mayor parte del volumen real (un master → 3 duraciones × N formatos) y su
regla es la opuesta a generar; `brand-film` es la única pieza que exige continuidad entre muchas tomas, y eso cambia
operaciones (§3.6, identidad) y nivel (§3.2). **Fuera de esta taxonomía:** el motion del logo y de Glitch, que vive en
el repo taller `efeonce-brand-workshop` (`tools/brand-motion`, `tools/glitch-motion`) y no se genera con IA.

### 3.1b Tipo de video: registro visual y técnica

El **tipo de pieza** (§3.1) dice para qué sirve; el **tipo de video** dice **qué es la imagen y con qué técnica se
hace**. Es la dimensión que más mueve la elección de motor, el costo y el esfuerzo: un video hiperrealista con
personas y un motion graphics tipográfico no comparten ni motor ni barra ni presupuesto. Una pieza puede combinar
tipos por toma (un explainer con personaje 3D y cartelas de motion); cada toma declara el suyo.

**Costo** en bandas que define la guía (§4.3, «Bandas de costo»): **0** determinístico · **bajo** · **medio** ·
**alto**. **Esfuerzo** = preproducción + iteraciones esperables + post, en tres niveles. Los motores se listan como
**candidatos sin orden**: la evidencia por tipo casi no existe todavía y la produce el banco de TASK-1980, que corre
un brief por tipo. Etiquetas: `[verificado]` corrida nuestra · `[tercero]` ranking o descripción del proveedor ·
`[criterio]` oficio de la skill, no medido.

| id | Tipo | Qué lo define | Qué juzga la barra | Camino (propio primero) | Motores candidatos | Costo IA | Esfuerzo | Riesgos que ya conocemos |
|---|---|---|---|---|---|---|---|---|
| `fotorrealista` | hiperrealista live-action: personas, lugares, objetos reales | que parezca filmado | piel, manos, ojos, física, luz creíble, identidad estable | generativo; post propio (grade, overlay, reframe) | Veo 3.1 y Kling 3.0 [contrato, CLI de Higgsfield]; Seedance 2.5 [tercero: #1 OpenArt]; H3 Max [tercero: #1 AA imagen a video con audio]; Wan 3.0 [tercero: #1 AA texto a video] | alto | alto | valle inquietante; deriva de identidad; **personas reales: los motores ByteDance las rechazan y cobran** |
| `cine` | registro cine de marca: look cinematográfico, luz con carácter, Nexa protagonista | que se sienta película, no stock | composición, cámara y lente, luz como fenómeno de la escena, canon del registro cine | still aprobado primero (`foto:*`), después i2v; isotipo compuesto | Cinema Studio 3.0/4.0 (cámara, lente, era, rig de luz) [contrato]; Seedance 2.5 [tercero]; Veo 3.1 [contrato] | alto | alto | frontera del registro cine (sólo Nexa protagonista); el plate se regenera, no se relumina |
| `producto` | producto o packshot en movimiento (real o 3D) | el objeto es la verdad | forma, material, color y marca **exactos** en todos los cuadros | still aprobado con kits → i2v o cámara sobre escena quieta; marca compuesta; variantes de producto por reemplazo | Seedance 2.x (retuvo el set desde un KV [verificado, Glitch]); `h3max-camera` (escena congelada, órbita) [verificado]; Flux 3 primer/último cuadro y keyframes [verificado]; Genjutsu reemplazo de objeto [contrato] | medio | medio | la marca no se anima dentro del plano generado; filtro ByteDance con marcas |
| `ugc` | estilo creador: cámara en mano, auténtico, «grabado con el teléfono» | que parezca orgánico | naturalidad, **acción del sujeto** («vivo no es mover la cámara», caso Social Wall), ritmo de plataforma; el pulido bajo es intencional | generativo; subtítulos y cortes propios | Omni i2v (microescenas UGC publicadas, modelo anterior) [verificado]; Marketing Studio video [contrato]; Seedance 2.5, Kling 3.0, Veo 3.1 [contrato] | medio | bajo | persona real o voz real exige consentimiento; disclosure IA |
| `personaje-3d` | personaje animado 3D: Nexa, Sparks, mascotas de partner, estilo clay | que el personaje sea siempre el mismo | identidad (proporción, emblema, vestuario) entre tomas y piezas; actuación | hoja de identidad (`pre.cast-sheet`) → r2v o i2v desde pose; previs en Blender si la cámara importa | Seedance 2.5 r2v (las mascotas de partner no se rechazaron [operador]); Wan 3.0 r2v y H3 r2v [verificado, contrato del endpoint]; Kling `elements` [contrato] | medio | alto | deriva de identidad; una mascota de partner en cuadro contamina el emblema del uniforme |
| `animacion-2d` | ilustración o dibujo animado, estilo plano | que respete un estilo dibujado | consistencia del trazo y la paleta cuadro a cuadro | **propio primero**: animar las ilustraciones propias (HyperFrames, After Effects por handoff); IA sólo si el estilo tolera reinterpretación | `wan2_6` («estilizado»), `draw_to_video` [contrato]; [sin dato] sobre estilo propio | bajo a medio | medio | la IA redibuja el estilo; las ilustraciones de Efeonce son obra propia, no stock |
| `motion-graphics` | tipografía kinética, formas, datos animados, logo, UI abstracta | el diseño se mueve con intención | texto y marca **exactos**, timing, legibilidad, safe zones | **determinístico**: HyperFrames, `tools/brand-motion` y `tools/glitch-motion` (repo taller), After Effects por handoff; IA sólo para texturas o fondos | ninguno para el texto; texturas: cualquier motor de banda baja | 0 (más diseño) | medio a alto en diseño | todo texto generado es concept-only; el motion de marca vive en el taller |
| `demo-ui` | interfaz o producto digital real en pantalla | la UI es verdad | UI legible, real y actual | **determinístico**: captura real o render de la UI (workflow `ui-without-after-effects`); IA sólo para el mundo alrededor (`hybrid-world-plus-ui`) | para el entorno: los de `fotorrealista` o `cine` | 0 a medio | medio | una UI generada se reinterpreta y miente; las pantallas en escena se protegen con texto grande y referencias |
| `atmosfera` | fondos, texturas, partículas, loops abstractos, hero de sitio | que acompañe sin protagonismo | loop sin costura, peso del archivo, sin artefactos | generativo barato + loop y export propios | H3 Max Turbo, Wan 3.0 a 480p, Seedance 2.0 mini [verificado, contrato del endpoint]; Grok Video 1.5 lite [contrato] | bajo | bajo | costura del loop sin medir (H7) |
| `hibrido` | mundo generado + producto, UI o marca compuestos exactos | lo exacto convive con lo generado | integración: luz, escala, contacto, sin bordes | generativo para el mundo + composición determinística verificada | según la parte generada (`fotorrealista`, `cine`, `atmosfera`) | medio a alto | alto | integración de luz (relight, H4) y bordes (H5) |

**Cómo decide el tipo:**

- **Fija la banda de costo esperable** antes de elegir motor: `motion-graphics` y `demo-ui` casi no gastan en IA;
  `fotorrealista` y `cine` son las bandas altas, y ahí es donde más rinde explorar barato y generar el final una sola vez
  (guía §7.2).
- **Fija el camino propio**: en `motion-graphics`, `demo-ui` y `animacion-2d` lo propio es la técnica principal, no la
  terminación. En los tipos generativos, lo propio es la preproducción (stills, cast) y la post.
- **Fija qué se mide en el canario**: identidad en `personaje-3d`, objeto exacto en `producto`, piel y manos en
  `fotorrealista`, costura en `atmosfera`. El banco de TASK-1980 corre un brief por tipo con esas métricas.
- **El nivel (§3.2) es otra dimensión**: un `fotorrealista` puede ser previs o premium; el tipo no cambia, la barra sí.

#### Subtipos: lo que cambia la decisión dentro de cada tipo

Un subtipo existe sólo si cambia algo de la decisión (camino, motor, barra o dificultad). Ids `tipo/subtipo`.

| Tipo | Subtipo | Qué cambia frente al tipo base |
|---|---|---|
| `fotorrealista` | `/persona-habla` | diálogo y lipsync (`audio.lipsync`, hueco H12); cara en plano medio o cercano: dificultad de rostro máxima |
| | `/persona-accion` | cuerpo completo, manos e interacción con objetos: la física y las manos dominan la falla |
| | `/grupo` | varias personas: identidad múltiple, interacción entre sujetos; en registro cine, nunca dos personas mirándose de cerca |
| | `/lugar` | sin gente: el riesgo baja a física del ambiente (agua, humo, multitudes lejanas); bueno para motores de banda baja |
| | `/comida` | textura, vapor y brillo; el alimento no debe deformarse (workflow `food-table-native-reel-and-exact-post`) |
| `cine` | `/nexa-protagonista` | canon del registro cine con Nexa (identidad A, cámara ≈ 2 m, 85 mm, isotipo compuesto) |
| | `/equipo` | personas del equipo en registro cine: **en prueba** en publicidad según el canon; consentimiento |
| | `/titulo` | apertura o title sequence: el texto es determinístico (`finish.overlay`) y el plano generado sólo pone atmósfera |
| `producto` | `/estudio` | packshot sobre fondo controlado: cámara sobre escena quieta (`gen.camera`) suele bastar |
| | `/en-uso` | el producto en manos o en contexto: suma rostro, manos e interacción |
| | `/cgi` | producto modelado o 3D: previs en Blender y referencia de movimiento; material exacto |
| | `/variantes` | el mismo video con otro producto, color o mercado: `edit.replace` en vez de regenerar |
| `ugc` | `/camara-al-frente` | creador hablando a cámara: lipsync y naturalidad |
| | `/unboxing` | manos + producto exacto + acción continua |
| | `/tutorial` | pasos en pantalla: texto compuesto y ritmo didáctico |
| | `/reaccion` | expresión facial y tiempo de comedia |
| `personaje-3d` | `/nexa` | identidad A, 25 expresiones, uniforme o traje biónico por kit |
| | `/sparks` | máximo dos con referencia en registro cine |
| | `/mascota-partner` | pose desde la biblioteca del estudio de origen; contamina el emblema del uniforme si comparte cuadro |
| | `/estilo` | clay, estilizado o realista: el estilo se fija con referencias y no se mezcla dentro de una pieza |
| `animacion-2d` | `/ilustracion-propia` | animar las ilustraciones de Efeonce: camino propio, nunca regenerarlas |
| | `/estilizado-ia` | estilo nuevo que tolera reinterpretación: generativo con referencias de estilo |
| `motion-graphics` | `/tipografia-kinetica` | el texto es la animación |
| | `/datos` | gráficos animados: valores exactos (`dataviz-design`) |
| | `/logo` | motion de marca: vive en el repo taller (`tools/brand-motion`), fuera de esta taxonomía |
| | `/explainer-plano` | íconos y formas planas con narración |
| `demo-ui` | `/captura` | grabación real de la interfaz |
| | `/render` | UI reconstruida y animada en código (HyperFrames) |
| | `/en-dispositivo` | pantalla dentro de una escena: la UI se protege o se compone (`hibrido`) |
| `atmosfera` | `/loop-fondo` | cierre de loop obligatorio (H7) |
| | `/textura` | capa para componer: puede ir sin audio y en baja resolución |
| `hibrido` | `/mundo-mas-ui` | workflow `hybrid-world-plus-ui` |
| | `/mundo-mas-producto` | producto exacto compuesto en un mundo generado; integración de luz (H4) |

### 3.1c Estética o look

Eje **independiente** del tipo: un `producto` puede ser documental o publicitario brillante. El look decide referencias,
lenguaje del prompt, parámetros de época o género del motor y el grade. **Regla:** lo que es **color** se logra en post
de forma determinística (`finish.grade`, LUT versionada); lo que es **luz, lente, textura de época o movimiento de
cámara** se pide en la generación, porque el grade no lo puede inventar.

| id | Look | Se logra con | Nota de marca |
|---|---|---|---|
| `documental` | observacional, cámara en mano, luz disponible | prompt de cámara en mano y luz natural; grade suave | cercano a `ugc`, pero dirigido |
| `cine` | dramático, contraste, profundidad, luz motivada | lente, luz y rig en la generación (Cinema Studio expone cámara, lente, era y luz); grade propio | el registro cine de Efeonce tiene su propio canon (luz de la línea como fenómeno de la escena) |
| `publicitario` | pulido, high-key, producto brillante | luz de estudio en la generación; grade limpio | la colorimetría de marca manda (día neutro-cálido, sombras neutras) |
| `editorial` | moda o revista: encuadres gráficos, poses | dirección de arte de los stills de entrada | lo dirige `design-studio` |
| `hecho-a-mano` | grano, papel, cinta, imperfección intencional | textura en post (grano, overlays) más que en la generación | tendencia vigente en `motion-design-studio` (doctrina 2026) |
| `epoca` | 70s, 90s, VHS, película antigua | época en la generación (parámetros de era/género donde existan) + textura en post | la textura de época generada no se puede quitar después: decidir antes |
| `estilizado` | anime, cel, pintura | referencias de estilo; motores que toleran estilización | consistencia de estilo entre tomas = riesgo principal |
| `corporativo-minimal` | limpio, plano, mucho aire | composición y post; poca generación | frecuente en `motion-graphics` y `demo-ui` |

### 3.2 Nivel de producción y barra de calidad

| Nivel | Para qué existe | Barra mínima para pasar | Motor (tier) | Evidencia |
|---|---|---|---|---|
| `previs` (boceto) | decidir intención, cámara, blocking; nunca se muestra como final | la pregunta de la prueba queda respondida | exploración: el más barato que conserve lo que se juzga (guía §7.2) | hoja de contacto + nota de decisión |
| `borrador` | aprobar actuación, cámara y ritmo | secuencia completa revisada; fps de entrega; texto y logo **ya compuestos** como placeholder; audio temporal | motor final candidato, a resolución baja o en modo draft | video + veredicto por toma |
| `final` | entregable de canal | resolución y fps de entrega declarados; texto, logo y legal compuestos exactos; identidad sin deriva visible; audio mezclado con loudness de plataforma; QA de primer, último y dos cuadros intermedios **y** revisión al 100 %; derechos atestados | motor elegido por contrato de fidelidad, a la resolución de entrega | manifiesto de entrega + hash del archivo revisado = entregado |
| `premium` (cine) | hero, brand film, portada de sitio | todo lo de `final` + detalle nativo verificado (no sólo dimensiones), continuidad entre tomas medida, grade propio, diseño sonoro propio, reconciliación de costo por request; reglas del registro cine si aplica | motor hero tras prueba corta comparativa | igual + escucha perceptual separada de la medición |

🔴 **Dimensiones no demuestran detalle.** Un 4K reescalado pasa la barra de `final` en dimensiones y no la de
`premium`. Hasta que exista el detector del programa (hueco H6), el detalle nativo se juzga al 100 % por un humano.

### 3.3 Contrato de fidelidad **[agregado]**

Por toma, no por pieza. Lista qué es **idéntico** (píxel o identidad) y qué es **interpretable**. Valores frecuentes:

| Debe quedar idéntico | Consecuencia |
|---|---|
| un key visual aprobado | i2v con ese KV como primer cuadro, o r2v anclado; medir fidelidad del primer cuadro |
| un objeto, logo, texto o UI | **no se genera**: se compone o se protege con zona + recomposición verificada (`edit.zone`) |
| un rostro (persona real, Nexa) | ancla de identidad + detector por cuadro (§3.6) |
| el resto del cuadro al editar una zona | `pnpm ai:inpaint video` (delta 0 verificado) |
| el movimiento de una toma existente | edición v2v que conserve movimiento (`edit.global`), nunca regenerar |

**Por qué es una dimensión:** es la que elige el motor (principio 1); sin ella la clasificación no decide nada.

### 3.4 Origen del material **[agregado]**

`desde-cero` (texto) · `kv-aprobado` (imagen ya aprobada con kits) · `render-previo` (un video generado que se edita o
extiende) · `metraje-real` (filmado: personas, oficina, producto) · `previs-3d` (playblast de Blender u otro).

**Por qué es una dimensión:** cambia las operaciones posibles y los riesgos. Sobre `metraje-real` con personas, los
motores con filtro de personas reales no sirven; sobre `kv-aprobado`, la marca ya está resuelta en el primer cuadro y
no se anima dentro del plano generado.

### 3.5 Operaciones por fase: preproducción, producción y posproducción (vocabulario cerrado)

La fase es el **eje principal** de la clasificación: toda operación pertenece a una fase y una pieza las recorre en
orden. Ninguna operación tiene un motor por defecto en esta taxonomía: **hay muchos motores de video y cada operación
la resuelven varios** (Seedance, Flux 3, Wan, MiniMax H3, Gemini Omni, la API de Higgsfield con Kling y otros, más los
carriles determinísticos y la mano humana). Cuál conviene lo decide el contrato de fidelidad de la toma con la guía
§4.3, no la fama del modelo.

Carril: **G** generativo · **D** determinístico (0 créditos, sólo cómputo) · **H** híbrido (el modelo trabaja dentro
de una zona y el pipeline recompone y verifica). «Garantía» = lo que un detector debe poder afirmar en código.

#### 3.5.1 Preproducción — decidir antes de gastar en video

Aquí se gasta poco y se decide casi todo. Las salidas de pre son **entradas con rol** de la producción (§3.7).

| id | Operación | Carril | Qué produce | Garantía / gate | Herramienta hoy |
|---|---|---|---|---|---|
| `pre.brief` | brief y ficha de clasificación (§2) | D | ficha completa, contrato de fidelidad por toma | ficha sin campos vacíos antes del primer gasto | paquete de producción (método) |
| `pre.storyboard` | guion visual por beats | G o D | cuadros clave por beat | criterio observable por beat | imagen (`pnpm ai:image`, `pnpm ai:fal` Seedream) o dibujo |
| `pre.animatic` | storyboard con tiempos y sonido temporal | D | animatic con duración real | ritmo aprobado antes de generar | montaje determinístico |
| `pre.previs3d` | blocking y cámara en 3D | D | playblast exportado (referencia de movimiento) | cámara y timing espaciales fijados | Blender (puente MCP local) o handoff |
| `pre.keyframe-still` | stills de entrada: primer/último cuadro, keyframes | G | imágenes aprobadas con kits | aprobadas al 100 % **antes** de animarlas (la marca va resuelta en el still) **y coincidentes con el primer cuadro del contrato de fidelidad** (caso Glitch, §4.3) | `pnpm foto:*`, `pnpm ai:image`, `pnpm ai:fal` Seedream, `pnpm ai:inpaint` |
| `pre.reference-build` | construir piezas: objetos aislados, vistas del sujeto, fondos, logo/vector | G o D | manifiesto de referencias con rol, hash y derechos | cada asset aprobado por separado | kits de marca + generadores de imagen |
| `pre.cast-sheet` | hoja de identidad del cast (ángulos, expresiones, vestuario) | G | anclas de identidad | proporción y emblema medidos en foto (`foto:rostro`, `foto:emblema`) | canon de fotografía de marca |
| `pre.coverage` | cobertura de cámaras y shot list | D | mapa de cobertura y continuidad | entradas, salidas y reservas previstas | método (companion de preproducción) |
| `pre.pilot` | piloto sólo del riesgo incierto | G | una toma corta y barata | la prueba responde una pregunta escrita antes | el motor más barato que conserve lo que se juzga |
| `pre.reference-analysis` **[agregado]** | analizar escena por escena un video de referencia (ritmo, planos, cámara) | G | desglose por escena | — (exploratorio; la precisión baja con la duración) | puente: `video_analysis` del MCP de Higgsfield |
| `pre.estimate` | estimación y autorización del gasto | D | costo por operación a la resolución de entrega | autorización explícita del monto | `--dry-run` / `--estimate` de cada CLI |

#### 3.5.2 Producción — generar o capturar la toma

| id | Operación | Carril | Garantía que debe poder verificarse | Detector hoy |
|---|---|---|---|---|
| `gen.t2v` | generar desde texto | G | duración, resolución y fps entregados | ffprobe (humo) |
| `gen.i2v` | generar desde una imagen (primer cuadro) | G | **primer cuadro fiel al still aprobado**; sin deriva de identidad | ninguno (hueco H13) |
| `gen.r2v` | generar desde referencias (imagen, video, audio) | G | identidad y producto reconocibles en todos los cuadros | ninguno (H11) |
| `gen.flf` | primer y último cuadro fijos | G | ambos cuadros fieles | ninguno (H13) |
| `gen.keyframes` | pasar por varios cuadros clave | G | cada keyframe fiel en su índice | ninguno (H13) |
| `gen.camera` | mover sólo la cámara sobre una escena quieta | G | trayectoria cumplida; escena sin cambios | ninguno |
| `gen.source-doc` | video a partir de una web o un documento | G | — (exploratorio) | — |
| `gen.motion-transfer` **[agregado]** | transferir el movimiento de un video conductor a un sujeto de referencia | G | gesto y cámara del conductor; identidad del sujeto | ninguno |
| `gen.multishot` **[agregado]** | varias tomas dentro de una sola generación | G | cortes donde el guion los pide, continuidad entre ellos | ninguno |
| `time.extend` | extender una toma | G | **costura invisible**: continuidad de posición, luz y audio en la junta | ninguno (H8) |
| `audio.native` | audio generado junto con la toma | G | — (provisional por regla) | — |
| `cast.train` | entrenar identidad (LoRA, Soul ID, elements) | G | identidad reproducible entre tomas | ninguno (H11) |
| `capture.real` **[agregado]** | grabar metraje real (equipo, oficina, producto, pantalla) | humano | spec de rodaje cumplida | handoff |

#### 3.5.3 Posproducción — rescatar, editar, finalizar y entregar

| id | Operación | Carril | Garantía que debe poder verificarse | Detector hoy |
|---|---|---|---|---|
| `edit.global` | re-render por instrucción conservando movimiento (restyle, cambio de material) | G | movimiento y encuadre conservados | deriva media (sólo dentro de `edit.zone`) |
| `edit.zone` | editar sólo una zona | H | **delta 0 fuera de la zona en cada cuadro** | ✅ `pnpm ai:inpaint video` (cámara quieta) |
| `edit.erase` | borrar un objeto | H | zona protegida en delta 0 + **sin residuo del objeto** en ningún cuadro | ninguno (H1) |
| `edit.track` | seguir un objeto (máscara por cuadro) — operación de soporte | D sobre modelo de segmentación | máscara cubre el objeto en todos los cuadros | ninguno (H2) |
| `edit.replace` **[agregado]** | reemplazar un objeto, producto, prenda o personaje en un video desde referencias | H | resto del cuadro intacto; el reemplazo sigue el movimiento | ninguno |
| `edit.depth` **[agregado]** | mapa de profundidad por cuadro — operación de soporte (relight, composición, desenfoque) | G | profundidad coherente entre cuadros | ninguno |
| `edit.background` | reemplazar el fondo (recorte con alfa + composición) | H | sujeto intacto; borde sin halo | ninguno (H5) |
| `edit.relight` | reiluminar | H | sujeto exacto (forma, color, texto); luz coherente entre cuadros | ninguno (H4) |
| `time.loop` | loop sin costura | G o D | último cuadro ≈ primero; movimiento continuo en el cierre | ninguno (H7) |
| `time.retime` | cambiar velocidad (constante o rampa) | D (H si interpola) | duración resultante; sin cuadros duplicados visibles | ninguno (H15) |
| `time.interpolate` | subir fps / slow motion | G | sin artefactos de interpolación | ninguno (H15) |
| `assemble.cut` | cortar/recortar | D | cuadros exactos | ffmpeg |
| `assemble.auto-clips` **[agregado]** | derivar clips cortos de un video largo (con subtítulos y seguimiento de cara) | G | cortes en frases completas; cara dentro del cuadro | ninguno |
| `assemble.edit` | montaje por EDL (orden, empalmes, transiciones) | D | EDL reproducible; empalmes en cuadro | ninguno (H10) |
| `finish.overlay` | componer texto, logo, firma, cartelas | D | texto y logo exactos, contraste medido | parcial (HyperFrames/Glitch; sin CLI genérico, H10) |
| `finish.captions` | subtítulos | D | sincronía y legibilidad | ninguno |
| `finish.grade` | color grade (LUT o ajustes) | D | LUT/ajuste aplicado tal cual; colorimetría de marca | ninguno (H10) |
| `finish.upscale` | subir resolución / restaurar | G | **detalle nativo**, no sólo dimensiones | ninguno (H6) |
| `finish.deflicker` **[agregado]** | quitar parpadeo | G | sin parpadeo; sin pérdida de detalle | ninguno |
| `finish.hdr` **[agregado]** | convertir SDR a HDR | G | rango y color coherentes con la fuente | ninguno |
| `finish.reframe` | reencuadrar a otro aspecto (recorte **D**, o expansión **G** cuando hay que agregar borde) | D o G | franjas recortadas vacías; sujeto y safe zones dentro | medición manual (H9) |
| `finish.stabilize` | estabilizar | D | sin bordes negros ni warping | ninguno |
| `audio.voice` | voz / TTS | G | dicción y pronunciación aprobadas | escucha humana |
| `audio.music` | música | G o licencia | medios ≥ umbral (guía §5.9); sin síntesis pura para marca | medición de balance (Glitch) |
| `audio.sfx` | efectos y foley | G o librería | causa y sincronía | escucha |
| `audio.lipsync` | sincronía labial | G | labios en sincronía en todo el diálogo | ninguno (H12) |
| `audio.mix` | mezcla y loudness | D | loudness objetivo por plataforma | ffmpeg `loudnorm` (sin CLI de manifiesto, H10) |
| `deliver.export` | exportar masters y derivados | D | hash del archivo revisado = entregado; metadata y cuadros verificados | manual (método, etapa 12) |

**Cómo se usa:** una pieza lista sus operaciones por fase (§2); por cada operación de producción y post, la guía §4.3
dice qué motores la hacen y con qué evidencia. Una operación sin motor verificado es un hueco (§5) y la pieza no la
promete al cliente.

**Por qué se agregaron (segunda pasada, 2026-10-03, tras leer el catálogo de Higgsfield):** `gen.motion-transfer`,
`edit.replace`, `edit.depth`, `finish.deflicker`, `finish.hdr`, `assemble.auto-clips` y `pre.reference-analysis` son
operaciones que un proveedor conectado ya ofrece y que la primera versión no nombraba; sin id, una pieza no podía
declararlas ni la matriz decir quién las hace. `edit.replace` es la de más valor comercial: cambiar el producto de un
video ya aprobado.

**Por qué se agregaron** `gen.multishot` (varios motores generan varias tomas en una sola solicitud y eso cambia la
continuidad), `capture.real` (parte del material de Efeonce es grabado y entra a la misma post) y `deliver.export`
(el método exige que lo revisado y lo entregado sean el mismo archivo).

### 3.6 Cast: quién aparece y cómo se mantiene su identidad

| Tipo | Quiénes | Cómo se elige | Cómo se mantiene la identidad entre tomas y piezas | Restricciones medidas |
|---|---|---|---|---|
| `persona-equipo` | personas reales de Efeonce | `docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md`; referencia de cara vigente según el roster | primer cuadro aprobado (i2v) o la misma referencia en cada toma (r2v) | **los motores ByteDance rechazan personas reales después de encolar y cobran** (guía §3) → usar los motores sin ese filtro; consentimiento de imagen y de voz (§3.11); vestir a una persona real exige foto de cuerpo entero |
| `elenco-marca` | elenco ficticio (Hum, Karo, Sophia, Isabella, Antonio) | `EFEONCE_BRAND_CAST_V1.md`; grupos de 3 a 5 | igual que arriba; casting de campaña fijado en la ficha | — |
| `nexa` | Nexa (identidad A) | home `ai-generations/_identidad-nexa/`; `NEXA_CHARACTER_BIBLE_FICHA_V1.md` | anclas + seis ángulos; detector de proporción del rostro `pnpm foto:rostro --persona nexa` aplicado a cuadros muestreados | registro cine sólo con Nexa protagonista; isotipo compuesto, nunca generado; la identidad B no entra como referencia |
| `sparks` | Sparks de marca | canon de fotografía de marca | referencias por Spark | en cine, dos Sparks con referencia como máximo; el resto lejos y desenfocado |
| `mascota-partner` | Clawd, Codex, Gigi | bibliotecas de poses del estudio que creó cada mascota | referencia de pose del estudio de origen | el filtro ByteDance **no** las rechazó [operador 2026-09-22]; **contaminan el emblema del uniforme** si aparecen en cuadro (canon) |
| `objeto-producto` | logo 3D, prendas, merch, producto | kits de marca (`EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`) | el primer cuadro ya aprobado con los kits | **la marca no se anima dentro del plano generado: se compone**; planos cortos, movimiento contenido |
| `cliente` **[agregado]** | talento, producto o marca del cliente | brief y derechos del cliente | referencias entregadas por el cliente | marcas → filtro ByteDance; derechos y uso según contrato del cliente |

**Jerarquía para sostener identidad** (de más a menos probada):
1. **Ancla única**: el mismo canónico (KV aprobado como primer cuadro o la misma hoja de referencia en r2v) en cada
   toma. Es el único camino operativo hoy (guía §6.12).
2. **Detector por cuadro**: medir sobre cuadros muestreados lo que ya medimos en foto (`foto:rostro`, `foto:emblema`).
   No existe como comando para video (hueco H11).
3. **Identidad entrenada** (LoRA de H3, `elements` de Kling, Soul ID de Higgsfield): ninguna verificada.

### 3.7 Referencias y sus roles

Toda referencia declara su **rol**; un archivo sin rol confunde al modelo y a la revisión.

| Rol | Qué aporta | Operaciones |
|---|---|---|
| `primer-cuadro` / `ultimo-cuadro` | composición exacta de entrada o salida | `gen.i2v`, `gen.flf`, `time.loop` |
| `keyframe@cuadro` | paso obligado en un índice | `gen.keyframes` |
| `sujeto` | identidad de persona, personaje o producto | `gen.r2v`, `cast.*` |
| `look` / `estilo` | paleta, textura, luz | `gen.r2v`, `edit.global`, `finish.grade` (LUT) |
| `movimiento` | trayectoria, blocking, timing (video de previs o de referencia) | `gen.r2v` |
| `fuente` | el video que se edita o extiende | `edit.*`, `time.extend` |
| `audio-ritmo` / `audio-voz` | tempo para cortar; voz para lipsync | `gen.r2v`, `audio.lipsync` |
| `prompt` | intención y acción; nunca texto final, logo ni legal | todas las G |

Cupos por motor y si el video de referencia «guía» o «se edita»: guía §3 y §4.2.

### 3.8 Texto en video

| Clase | Regla | Cómo se produce |
|---|---|---|
| `compuesto` | **default y obligatorio** para copy, titulares, logo, firma, legal, URL, CTA | post determinístico (`finish.overlay`): HyperFrames, composición ffmpeg o el motor de Glitch; tipografía y valores de AXIS; firma con el logo Efeonce centrado según la línea gráfica |
| `en-escena` | texto diegético (pantallas, carteles) que pertenece a la escena | sólo concept, o protegido: texto grande, referencias de la UI y revisión al 100 %; nunca copy final |
| `subtitulo` | accesibilidad | `finish.captions`, determinístico |

🔴 Todo texto generado dentro del video es concept-only (guía §0).

### 3.9 Audio

| Componente | Regla | Dueño |
|---|---|---|
| nativo del motor | **provisional**; se reemplaza si la pieza tiene diseño sonoro. Si la pieza no admite voz, **generar sin audio** (`--no-audio`; H3 no lo permite) y quitar del prompt lo que induce habla en vez de reforzar la prohibición (casos SKY y CMP-001, §4.3) | `audio-studio` |
| voz / TTS | dicción aprobada por escucha; voz real exige consentimiento | `audio-studio` |
| música | nunca síntesis pura para marca; medir balance antes de mostrar (guía §5.9) | `audio-studio` |
| efectos y foley | por causa y peso; siguen el corte final | `audio-studio` |
| lipsync | diálogo en español sin probar (H12) | `audio-studio` + `motion-design-studio` |
| mezcla | loudness por plataforma; escucha separada de la medición | `audio-studio` |

### 3.10 Formato

Duración (por plataforma y por pieza), resolución de entrega, aspecto y fps. Reglas estables:

- **4:5 no existe en ningún motor de video**: se genera en 3:4 y se recorta midiendo que las franjas sacrificadas estén
  vacías (guía §3). Contar con el recorte desde el brief.
- **No mezclar fps sin declararlo**: hay motores a 24 y a 30 fps (guía §4.2).
- Specs por plataforma y safe zones: `social-media-studio` y `efeonce-advertising-creative`.

### 3.11 Derechos y consentimiento

| Elemento | Requisito antes de producir | Dueño |
|---|---|---|
| persona real (imagen) | consentimiento vigente para ese uso | `greenhouse-ai-creative-rights-governance` + `legal-privacy-ip-operator` |
| voz real o clonada | consentimiento explícito de voz | ídem |
| música | licencia o generación con términos comerciales del proveedor | ídem + `audio-studio` |
| marcas de terceros | uso permitido; los filtros de algunos motores las rechazan y cobran | ídem |
| disclosure IA | criterio de la campaña y de la plataforma | ídem |

### 3.12 Carril de ejecución **[agregado]**

| Carril | Significa | Se puede prometer |
|---|---|---|
| `cli-canario` | CLI con canario de garantía documentado (ADR-024 req. 1) | sí, dentro de la garantía medida |
| `cli-verificado` | CLI con generación real verificada (contrato del endpoint), sin canario de garantía | sí, como candidato técnico con revisión al 100 % |
| `cli-contrato` | conectado en el CLI, nunca corrido | no: correr una generación real antes |
| `cli-higgsfield` | CLI de la app de Higgsfield (`higgsfield`, sesión de usuario, créditos de la suscripción): `generate cost` estima gratis, `generate create/wait` encola y retoma | sí, como **puente** con estimación en créditos y revisión al 100 %; mejor aún envuelto como motor de nuestros CLIs (TASK-1986) |
| `mcp-sesion` | sólo existe en un MCP de sesión de Claude (Magnific; las pocas herramientas de Higgsfield que no están en su CLI, como el lipsync de sync.so o el análisis de video) | como puente puntual con el costo preflight del propio MCP; sin manifiesto nuestro |
| `handoff-humano` | After Effects, Resolve, Nuke u otra mano humana | sí, con spec de handoff |

🔴 **No confundir los dos carriles de Higgsfield:** su **API** (`pnpm ai:fal --capability hf-*`, créditos de API propios,
sin Veo ni varias herramientas de post) y su **CLI de la app** (`higgsfield`, créditos de la suscripción, catálogo de la
app: Veo 3.1, Kling 3.0 completo, Cinema Studio 2.0–4.0, Genjutsu, SAM 3, Topaz, reframe, doblaje). Son cuentas,
catálogos y contratos distintos.

**Por qué es una dimensión:** ADR-024 exige saber en qué carril está cada operación para decidir qué se gradúa; y una
pieza hereda el carril **más débil** de sus operaciones.

### 3.13 Propio primero: camino propio y puente por operación

Lectura: si existe camino propio, se usa; si no, se usa el puente y la task de la columna «Propio a construir» lo
retira. Estado de cada puente (verificado o no) y su costo: guía §4.3.

| Operación | Camino propio hoy | Propio a construir | Puente de proveedor mientras tanto |
|---|---|---|---|
| `gen.t2v`, `gen.i2v`, `gen.r2v`, `gen.flf`, `gen.keyframes`, `gen.camera` | `pnpm ai:fal` (fal y API de Higgsfield) y `pnpm ai:omni`, con estimación y tope | banco de canarios (TASK-1980) | CLI de Higgsfield para motores que sólo están ahí: Veo 3.1, Kling 3.0 completo, Cinema Studio 3.0–4.0 (adaptador TASK-1986) |
| `gen.motion-transfer` | — | — (generativo puro; se mide en el banco) | Genjutsu motion control y Kling 3.0 motion control (CLI de Higgsfield) |
| `time.extend` | `ai:fal` (Seedance 2.5, `flux3-extend`), `ai:omni` | costura medida (TASK-1982) | Seedance 2.5 y Cinema Studio 4.0 (extensión hacia adelante y atrás) en el CLI de Higgsfield |
| `time.loop` | — | TASK-1982 | — |
| `time.retime` | ffmpeg a mano | TASK-1981 | rampas de Cinema Studio 3.0; `video_speed` de Magnific |
| `time.interpolate` | — | follow-up de EPIC-051 | `fps_boost` y Topaz (CLI de Higgsfield) |
| `edit.zone` | ✅ `pnpm ai:inpaint video` (canario 2026-10-02) | máscara móvil (TASK-1979) | — |
| `edit.global` | `ai:fal` (`flux3-edit`, Seedance editing), `ai:omni` editar | — | `kling_video_edit`, Cinema Studio 4.0 `video_edit` (CLI de Higgsfield); `video_modify` de Magnific |
| `edit.track` | cajas por keyframes en `ai:inpaint video` | `pnpm ai:track` (TASK-1979) | `sam_3_video` (CLI de Higgsfield), que además puede ser el motor de `ai:track` |
| `edit.erase` | — | `--op erase` con garantía (TASK-1979) | edición por instrucción sin garantía: `kling_video_edit`, Seedance 2.5 `video_edit` |
| `edit.replace` | — | follow-up sobre la máscara de TASK-1979 | Genjutsu `hf_mult_replace_object` (CLI de Higgsfield) |
| `edit.background` | — | TASK-1983 | `video_background_remover` (CLI de Higgsfield); `video_remove_background` de Magnific |
| `edit.relight` | — | TASK-1984 (tras TASK-1977) | Cinema Studio 4.0 con rig de luz (CLI de Higgsfield); `video_relight` de Magnific (Beeble) |
| `edit.depth` | — | — | `depth_anything_video` (CLI de Higgsfield) |
| `finish.grade` | ffmpeg a mano | TASK-1981 | `video_color_grade` de Magnific |
| `finish.reframe` | recorte con ffmpeg y medición a mano | recorte medido (TASK-1981) | `reframe` generativo (CLI de Higgsfield) sólo cuando hay que **agregar** borde; no ofrece 4:5 |
| `finish.upscale` | `flux3-enhance` (sólo su propio draft) | detector de detalle (TASK-1983) | `topaz_video`, `bytedance_video_upscale`, `video_upscale` (CLI de Higgsfield); Magnific |
| `finish.deflicker` | — | — | `video_deflicker` (CLI de Higgsfield) |
| `finish.hdr` | — | — | `topaz_hyperion_2_5` (CLI de Higgsfield) |
| `finish.overlay`, `finish.captions` | HyperFrames y el motor de Glitch, por pieza | TASK-1981 | — |
| `assemble.cut`, `assemble.edit` | ffmpeg a mano | TASK-1981 | — |
| `assemble.auto-clips` | — | — | `clipify` (CLI de Higgsfield, desde YouTube) |
| `audio.voice` | — | TASK-1985 | `voice_change` (CLI de Higgsfield); ElevenLabs (MCP) |
| `audio.lipsync` | — | TASK-1985 | `dubbing` (CLI de Higgsfield, incluye español); sync.so (MCP de Higgsfield) |
| `audio.mix` | ffmpeg a mano | TASK-1981 | — |
| `pre.reference-analysis` | — | — | `video_analysis` (MCP de Higgsfield) |

### 3.14 Dificultad de la toma

La dificultad predice **dónde va a fallar el modelo, cuántos intentos harán falta y cuánto va a costar**. Se mide por
toma, en siete ejes de 0 a 3. **Primero se baja la dificultad, después se sube el motor**: partir una toma, congelar la
escena y mover sólo la cámara, fijar primer y último cuadro o componer lo exacto suele rendir más que pagar el motor
más caro.

| Eje | 0 | 1 | 2 | 3 | Cómo se baja |
|---|---|---|---|---|---|
| **R** rostros y manos | ninguno | lejanos o parciales | cara en plano medio o manos visibles | primer plano, habla o manos manipulando | alejar o reencuadrar; esconder manos; diálogo con voz aparte + lipsync |
| **I** interacción | nada | sujeto solo con gesto | sujeto con objeto | sujetos entre sí o contacto físico | partir en tomas de un sujeto; resolver el contacto en el corte |
| **F** física | rígido o estático | movimiento simple | tela, pelo, humo | líquidos, multitudes, colisiones, deporte | sacar la física del plano principal o componerla como capa |
| **C** cámara | fija | paneo o push simple | órbita o grúa | coreografía compleja o cámara en mano larga | `gen.camera` sobre escena quieta; previs 3D como referencia de movimiento |
| **D** duración y continuidad | ≤ 5 s, una toma | ≤ 10 s | > 10 s o extensión | varias tomas que deben empalmar | tomas cortas y corte; handles planificados; extensión con costura medida |
| **E** exactitud | nada exacto | marca compuesta después | objeto o producto exacto en cuadro | texto o UI diegéticos, o producto exacto en movimiento | componer en post (`finish.overlay`), primer cuadro aprobado, `edit.zone` |
| **P** identidad | sin cast | extra sin identidad | cast de marca recurrente | persona real del equipo o del cliente | ancla única por toma; detector de identidad; evitar motores con filtro de personas reales |

**Puntaje** = R + I + F + C + D + E + P (0 a 21):

| Banda | Puntaje | Qué implica | Intentos esperables por toma final | Estrategia |
|---|---|---|---|---|
| **baja** | 0–5 | cualquier motor la resuelve | 1–2 | ir directo al motor de banda de costo baja o media |
| **media** | 6–11 | el motor importa | 2–3 | piloto barato de la parte riesgosa; final en el motor que pasó el banco |
| **alta** | 12–16 | varios ejes en 2–3: falla frecuente | 3–5 | previs o animatic; bajar ejes antes de generar; prueba comparativa corta |
| **extrema** | 17–21 | no conviene como toma única | — | **partir la toma** hasta que cada parte quede en media o alta |

Los intentos esperables son `[criterio]`: los calibra el banco de TASK-1980 con los casos reales (§7) y se corrigen
acá con evidencia. Un eje en 3 por sí solo ya justifica un piloto, aunque el puntaje total sea bajo.

## 4. Cómo se usa: árbol de decisión y presupuesto por toma

### 4.1 Árbol (por toma)

```text
1. TIPO (§3.1b) y SUBTIPO
   ¿El camino principal es propio? (motion-graphics, demo-ui, animacion-2d/ilustracion-propia)
   ├─ sí → técnica propia (HyperFrames, captura, taller, handoff); IA sólo para texturas o entorno → banda 0–baja
   └─ no → seguir
2. CONTRATO DE FIDELIDAD (§3.3): ¿qué es exacto?
   ├─ texto, logo, legal, UI ........ se compone en post (finish.overlay); nunca se genera
   ├─ producto, objeto o KV ......... still aprobado como primer cuadro (pre.keyframe-still → gen.i2v) o edit.zone
   └─ rostro o cast recurrente ...... ancla de identidad única + detector por cuadro (§3.6)
3. DIFICULTAD (§3.14): puntuar R I F C D E P
   ├─ bajar ejes (partir, cámara sola, primer/último cuadro, componer) y volver a puntuar
   └─ si queda EXTREMA → partir la toma; no se genera como una sola
4. NIVEL (§3.2)
   ├─ previs ........ pilotos en banda de costo baja
   ├─ borrador ...... motor candidato a baja resolución o en draft
   └─ final/premium . motor que pasó el banco, a la resolución de entrega; premium exige prueba comparativa corta
5. MOTOR (guía §4.3), filtrado por operación + tipo + restricciones duras:
   personas reales → sin motores con filtro ByteDance · 4:5 → generar 3:4 y recortar · sin audio → no H3 ·
   look de época/luz → en la generación; color → en post · propio primero en toda la post (§3.13)
6. PRESUPUESTO (§4.2) → autorización del monto → producir según el método
```

### 4.2 Presupuesto por toma

```text
presupuesto = Σ pilotos (costo del piloto)
            + intentos esperables (banda de dificultad) × duración × tarifa del motor a la resolución de entrega
            + entradas que se cobran (video de referencia, cuadro de imagen previo, segunda pasada de detector)
            + post propio (0 créditos; sólo tiempo)
            × (1 + reserva por diferencia estimación/factura)
```

- **Tarifas:** guía §4.2 y §4.3 (la taxonomía no copia precios). **Presupuestos de ejemplo por tipo y dificultad:**
  guía §7.4.
- **Reserva:** hasta que el banco de TASK-1980 reconcilie costo real por request, se usa la última diferencia medida:
  **+43 %** (SKY V11: estimado USD 23,88, facturado USD 34,16) **[verificado, 2026-09-24]**. Con reconciliación propia,
  la reserva baja a lo medido.
- **Intentos esperables:** los de la banda de dificultad (§3.14), `[criterio]` hasta calibrarlos con el banco.


### 4.3 Casos reales clasificados (ejemplos resueltos)

Piezas que Efeonce ya produjo, clasificadas con esta taxonomía. Los hechos salen de sus documentos (columna «Fuente»);
la **dificultad la puntué yo después** sobre lo documentado y es `[criterio]`. La columna «Qué habría dicho la
taxonomía» es la prueba: si la clasificación hubiera anticipado lo que pasó, sirve para decidir; si no, se corrige.

| Caso | Clasificación | Dificultad (R I F C D E P) | Qué se hizo y qué costó | Resultado | Qué habría dicho la taxonomía |
|---|---|---|---|---|---|
| **SKY CMP-003, película V17** (2026-09) | `brand-film` · `hibrido/mundo-mas-ui` + avión real como `producto` · look `cine` | 0 · 0 · 1 · 2 · **3** · **3** · 0 = 9 (media) por toma, con dos ejes en 3 | H3 Max, Seedance 2.5 (por Higgsfield y por fal) y Omni; V17 = montaje de cuatro fuentes + cierre local; cartelas en código; Topaz 2×; música aportada y SFX. **> USD 150** reportados sin ledger; V9 USD 40,99; V11 USD 34,16 facturados contra 23,88 estimados | cartelas aprobadas; V17 con aprobación final y escucha pendientes | **E = 3** (UI de búsqueda y chat diegética): componer la UI (`demo-ui/render`, workflow `hybrid-world-plus-ui`) en vez de generarla dentro del cuadro. **D = 3**: tomas cortas con handles planificados. Seedance 2.5 a 1080p es banda alta: ≈ 30 s de contenido final × ≈ USD 1,1/s × 3–5 intentos × 1,43 de reserva ≈ **USD 140–235** `[cálculo]`; el gasto reportado (> USD 150) cae dentro: la fórmula lo anticipaba |
| **CMP-001 «No fuiste tú»** (2026-09-22) | `ad-paid` · `personaje-3d/mascota-partner` (Codex) · look `corporativo-minimal` sobre negro | 1 · 0 · 0 · 0 · 2 · **3** · 2 = 8 (media) | 4 referencias; Seedance 2.5 2 tomas (USD 12,48) → `h3max-r2v` 9 tomas (USD 9,96) a 1080P, 15 s; 4:5 recortado desde 3:4; 1:1 recompuesto. **≈ USD 25,39** | aprobado (no equivale a autorizado a pautar) | **E = 3**: titular y CTA generados dentro del video; la regla es componerlos, y en el crudo 3:4 apareció un logo dibujado por el modelo. Media → **piloto barato primero**: la lección del caso fue justamente esa (H3 a USD 0,08/s contra Seedance 2.5 a USD 1,164/s). 4:5 desde 3:4: la regla de §3.10 |
| **Glitch, intro del micrófono** (2026-07-11) | intro · `fotorrealista/persona-accion` (dedo que toca un micrófono) · look `cine` | **3** · 2 · 1 · 0 · 0 · **3** · 0 = 9 (media), con dos ejes en 3 | tomas A–Z: Omni (bloqueos y un adapter que difumina el letrero), Seedance 2.0 i2v/r2v, Veo 3.1, Kling O3 edit, finish determinístico, blocking en Blender. T–Z **≈ USD 10,44** + tokens de Seedance | **sin master; producción detenida** | Dos ejes en 3 → **piloto y bajar ejes antes de generar**: partir en dos tomas (acercarse y tocar) y componer el letrero `ON AIR` (E). Y el gate de preproducción: el **still de entrada no coincidía con el primer cuadro del contrato** (abría con contacto; el contrato pedía hover). Ningún motor arregla eso: la causa estaba en pre |
| **Social Wall** (2026-07-08) | muestra en web · `ugc` (creador, mano con teléfono, trend) + VFX · look `documental` | 2 · 2 · 1 · 1 · 0 · 0 · 0 = 6 (media baja) | 8 stills con `gpt-image-2` → Omni i2v, masters de 10 s recortados a beats de 4 s, publicados sin audio | validado, en producción | El tipo `ugc` se juzga por **acción del sujeto**; la primera pasada movía los stills con pan y zoom y el operador la marcó como falsa: «vivo no es mover la cámara». Un `time.retime` o un movimiento de cámara determinístico no reemplaza `gen.i2v` con acción |
| **Fiestas Patrias, reel de comida** (2026-09-13) | `organico-social` · `fotorrealista/comida` + capa de UI compuesta (`hibrido`) · look `publicitario` | 0 · 0 · 2 · 0 · 1 · 2 · 0 = 5 (baja) | keyframe con ImageGen → Seedance 2.5 por Higgsfield, cámara fija (90 créditos por toma); 216 overlays de UI determinísticos; 4:5 y luego **toma nativa nueva** para 9:16 (otros 90 créditos) | aprobado; programado (no publicado aún) | Baja → directo al motor; **E resuelto por composición** (la UI nunca se generó). Formato: cuando el encuadre cambia de verdad, el 9:16 es toma nueva, no recorte; no prometer adaptación nativa si sólo se recortó |
| Día de Muertos, Campaña de alta frecuencia, Spot AEO Grader | ver los workflows `seasonality-visual-metaphor-to-video`, `single-shot-to-deterministic-campaign-hero` y `hybrid-world-plus-ui` | — | — | pendiente · validado · validado | Se clasificarán con el mismo formato cuando se revisen sus fuentes |

**Lo que los casos enseñan a la taxonomía (ya incorporado):**

1. **El eje E (exactitud) aparece en 3 en cuatro de cinco casos** y en todos la salida correcta era componer
   (UI, letrero, titular, logo). Es el eje que más se subestima: por eso el árbol (§4.1) lo resuelve en el paso 2,
   antes de mirar motores.
2. **Una falla de contrato hace que los intentos no converjan** (Glitch: más de veinte tomas sin master). El gate
   `pre.keyframe-still` exige que el still de entrada sea el primer cuadro del contrato de fidelidad (§3.5.1).
3. **La fórmula de presupuesto con reserva anticipaba SKY**; CMP-001 confirma que el piloto barato ahorra la mayor parte
   del gasto. Los intentos esperables de §3.14 son coherentes con los casos (CMP-001: 11 tomas en dos motores;
   Fiestas Patrias: 1–2), salvo cuando el contrato está mal (Glitch).
4. **Audio:** generar **sin audio** cuando la pieza no admite voz (SKY V7/V8 trajeron voz narrada pese a la
   prohibición) y quitar del prompt lo que induce habla en vez de reforzar la prohibición (CMP-001: trece palabras que
   inducían habla contra dos prohibiciones) (§3.9).

**Fuentes:** `docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md`,
`docs/campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md`,
`docs/operations/social/2026-09-22-primer-motion-ad-vocero-no-autorizado-production-method.md`,
`ai-generations/2026-07-11_glitch-microphone-intro/` (README, `pilot-retrospective.md`, revisión U–Z),
`ai-generations/2026-07-08_social-wall-assets/README.md`,
`docs/operations/social/2026-09-13-fiestas-patrias-production-method.md` y los workflows de `motion-design-studio`.

## 5. Huecos: lo que la taxonomía pide y nada resuelve con garantía (as-of 2026-10-03)

Severidad: **A** bloquea piezas reales frecuentes · **B** limita calidad o promesa · **C** nicho.

| # | Hueco | Severidad | Estado hoy | Dónde se cierra |
|---|---|---|---|---|
| H1 | Borrar un objeto de un video (`edit.erase`) | A | sin camino propio; puente: edición por instrucción sin garantía (`kling_video_edit`, Seedance 2.5 `video_edit` en el CLI de Higgsfield); VACE en fal sin conectar | TASK-1979 |
| H2 | Seguir un objeto: máscara por cuadro (`edit.track`) | A | propio: sólo cajas interpoladas; puente: `sam_3_video` (CLI de Higgsfield), sin corrida | TASK-1979 |
| H3 | Editar una zona con cámara en movimiento | A | la máscara fija queda pegada a la pantalla; la deriva medida está al borde del umbral aun con cámara quieta | TASK-1979 |
| H4 | Reiluminar un video (`edit.relight`) | B | sin camino propio; puente: Cinema Studio 4.0 con rig de luz (CLI de Higgsfield) y `video_relight` de Magnific, sin invocar | TASK-1984 (tras TASK-1977) |
| H5 | Reemplazar fondo / recorte de sujeto con alfa | B | sin camino propio; puente: `video_background_remover` (CLI de Higgsfield) y Magnific, sin corrida | TASK-1983 |
| H6 | Upscale con detalle verificable | B | propio: sólo `flux3-enhance`; puente: Topaz y ByteDance (CLI de Higgsfield), sin corrida; «dimensiones ≠ detalle» sin detector | TASK-1983 |
| H7 | Loop sin costura verificado | B | primer/último cuadro iguales o crossfade a mano, sin medir el cierre | TASK-1982 |
| H8 | Extensión con costura medida | B | los motores entregan la continuación sin medir la junta | TASK-1982 |
| H9 | 4:5 y reencuadre con franjas medidas | A | recorte manual con medición a mano | TASK-1981 |
| H10 | Acabado determinístico con manifiesto (grade, reencuadre, retime, montaje por EDL, overlays, loudness) | A | ffmpeg y HyperFrames ad hoc por pieza | TASK-1981 |
| H11 | Identidad entre tomas sin detector ni ancla entrenada | A | r2v sin medir; LoRA, elements y Soul ID sin verificar | TASK-1980 (detector + canario); identidad entrenada como follow-up |
| H12 | Diálogo y lipsync en español | B | sin camino propio; puente: `dubbing` en español (CLI de Higgsfield) y sync.so (MCP), sin corrida | TASK-1985 |
| H13 | Ninguna generación tiene canario de garantía (primer cuadro fiel, parpadeo, deriva) | A | sólo verificación del contrato del endpoint (humo) | TASK-1980 |
| H14 | Estimación ≠ factura | A | SKY V11 facturó ≈ 43 % sobre lo estimado; el CLI estima Seedance 2.5 1080p bajo la tarifa que publica la guía | TASK-1980 (reconciliación por request en el banco) |
| H15 | Interpolación / slow motion sin judder | C | sin camino propio; puente: `fps_boost` y Topaz (CLI de Higgsfield), sin corrida | follow-up (EPIC-051) |
| H16 | Video por la API de Higgsfield (Kling 3, PixVerse, LTX, …) | C | ninguna capacidad de video de la API verificada en salida; el CLI de la app de Higgsfield es otro carril (§3.12) | TASK-1980 (una corrida por capacidad candidata) |
| H17 | Texto en escena (pantallas) sin detector | C | protegido por receta | follow-up |
| H18 | Stream en tiempo real dirigido | C | no operable por cola | fuera del programa |

## 6. Mantenimiento

- Un id de operación nuevo se agrega a §3.5 **y** a la guía §4.3 en el mismo commit; sin fila en la guía, la operación
  no existe para ningún agente.
- Un hueco se cierra con evidencia (README de canario), no con la existencia de código: se mueve a «cerrado» con la
  fecha y la carpeta del canario.
- Cambios de criterio de nivel (§3.2) o de cast (§3.6) se reflejan en `motion-design-studio` y su espejo.
