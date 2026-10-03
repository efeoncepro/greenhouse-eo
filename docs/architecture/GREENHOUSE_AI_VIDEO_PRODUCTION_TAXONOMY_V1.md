# Greenhouse — Taxonomía de la producción de video con IA V1

> **Tipo de documento:** Referencia técnica agent-facing (clasificación y vocabulario)
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude (sesión «Clasificación de producción de video con IA»)
> **Ultima actualizacion:** 2026-10-03 por Claude
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
—**preproducción, producción y posproducción**—: qué es, a qué barra de calidad se
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

## 1. Cuatro principios que mandan sobre todas las dimensiones

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
4. **Un `completed` sólo acredita recepción.** Una salida técnicamente válida sigue siendo candidata hasta la revisión
   humana al 100 %; el veredicto de un detector garantiza lo que no se tocó, no que el pedido se haya cumplido.

## 2. Ficha de clasificación (lo que toda pieza declara)

Antes de la primera llamada pagada, la pieza llena esta ficha en su paquete de producción. Los nombres de campo son
los que adoptan los manifiestos del programa (EPIC-051):

```yaml
pieza: reel-social            # §3.1
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
| `pre.keyframe-still` | stills de entrada: primer/último cuadro, keyframes | G | imágenes aprobadas con kits | aprobadas al 100 % **antes** de animarlas (la marca va resuelta en el still) | `pnpm foto:*`, `pnpm ai:image`, `pnpm ai:fal` Seedream, `pnpm ai:inpaint` |
| `pre.reference-build` | construir piezas: objetos aislados, vistas del sujeto, fondos, logo/vector | G o D | manifiesto de referencias con rol, hash y derechos | cada asset aprobado por separado | kits de marca + generadores de imagen |
| `pre.cast-sheet` | hoja de identidad del cast (ángulos, expresiones, vestuario) | G | anclas de identidad | proporción y emblema medidos en foto (`foto:rostro`, `foto:emblema`) | canon de fotografía de marca |
| `pre.coverage` | cobertura de cámaras y shot list | D | mapa de cobertura y continuidad | entradas, salidas y reservas previstas | método (companion de preproducción) |
| `pre.pilot` | piloto sólo del riesgo incierto | G | una toma corta y barata | la prueba responde una pregunta escrita antes | el motor más barato que conserve lo que se juzga |
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
| `edit.background` | reemplazar el fondo (recorte con alfa + composición) | H | sujeto intacto; borde sin halo | ninguno (H5) |
| `edit.relight` | reiluminar | H | sujeto exacto (forma, color, texto); luz coherente entre cuadros | ninguno (H4) |
| `time.loop` | loop sin costura | G o D | último cuadro ≈ primero; movimiento continuo en el cierre | ninguno (H7) |
| `time.retime` | cambiar velocidad (constante o rampa) | D (H si interpola) | duración resultante; sin cuadros duplicados visibles | ninguno (H15) |
| `time.interpolate` | subir fps / slow motion | G | sin artefactos de interpolación | ninguno (H15) |
| `assemble.cut` | cortar/recortar | D | cuadros exactos | ffmpeg |
| `assemble.edit` | montaje por EDL (orden, empalmes, transiciones) | D | EDL reproducible; empalmes en cuadro | ninguno (H10) |
| `finish.overlay` | componer texto, logo, firma, cartelas | D | texto y logo exactos, contraste medido | parcial (HyperFrames/Glitch; sin CLI genérico, H10) |
| `finish.captions` | subtítulos | D | sincronía y legibilidad | ninguno |
| `finish.grade` | color grade (LUT o ajustes) | D | LUT/ajuste aplicado tal cual; colorimetría de marca | ninguno (H10) |
| `finish.upscale` | subir resolución / restaurar | G | **detalle nativo**, no sólo dimensiones | ninguno (H6) |
| `finish.reframe` | reencuadrar a otro aspecto | D | franjas recortadas vacías; sujeto y safe zones dentro | medición manual (H9) |
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
| nativo del motor | **provisional**; se reemplaza si la pieza tiene diseño sonoro | `audio-studio` |
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
| `mcp-sesion` | sólo existe en un MCP de sesión de Claude (Magnific, Higgsfield Cinema Studio) | no en producción: es out-of-band, sin presupuesto gobernado ni manifiesto; sirve para explorar |
| `handoff-humano` | After Effects, Resolve, Nuke u otra mano humana | sí, con spec de handoff |

**Por qué es una dimensión:** ADR-024 exige saber en qué carril está cada operación para decidir qué se gradúa; y una
pieza hereda el carril **más débil** de sus operaciones.

## 4. Cómo se usa

1. Llenar la ficha (§2) con la pieza, nivel, fidelidad, origen y operaciones.
2. Por operación, abrir la guía §4.3: motor, evidencia y canario. Si el carril es `cli-contrato` o `mcp-sesion`, la
   operación **no se promete**; se resuelve con otra operación o se pide un canario (EPIC-051).
3. Estimar con `--dry-run`/`--estimate` y pedir autorización del monto (guía §7).
4. Producir según el método; cerrar con la barra del nivel (§3.2).

## 5. Huecos: lo que la taxonomía pide y nada resuelve con garantía (as-of 2026-10-03)

Severidad: **A** bloquea piezas reales frecuentes · **B** limita calidad o promesa · **C** nicho.

| # | Hueco | Severidad | Estado hoy | Dónde se cierra |
|---|---|---|---|---|
| H1 | Borrar un objeto de un video (`edit.erase`) | A | ningún motor conectado; VACE inpainting existe en fal sin conectar | TASK-1979 |
| H2 | Seguir un objeto: máscara por cuadro (`edit.track`) | A | sólo cajas interpoladas en línea recta (keyframes) | TASK-1979 |
| H3 | Editar una zona con cámara en movimiento | A | la máscara fija queda pegada a la pantalla; la deriva medida está al borde del umbral aun con cámara quieta | TASK-1979 |
| H4 | Reiluminar un video (`edit.relight`) | B | nada en el CLI; candidatos sólo por MCP o fal sin conectar | TASK-1984 (tras TASK-1977) |
| H5 | Reemplazar fondo / recorte de sujeto con alfa | B | nada en el CLI; existe en el MCP de Magnific | TASK-1983 |
| H6 | Upscale con detalle verificable | B | sólo `flux3-enhance` de su propio draft; «dimensiones ≠ detalle» sin detector | TASK-1983 |
| H7 | Loop sin costura verificado | B | primer/último cuadro iguales o crossfade a mano, sin medir el cierre | TASK-1982 |
| H8 | Extensión con costura medida | B | los motores entregan la continuación sin medir la junta | TASK-1982 |
| H9 | 4:5 y reencuadre con franjas medidas | A | recorte manual con medición a mano | TASK-1981 |
| H10 | Acabado determinístico con manifiesto (grade, reencuadre, retime, montaje por EDL, overlays, loudness) | A | ffmpeg y HyperFrames ad hoc por pieza | TASK-1981 |
| H11 | Identidad entre tomas sin detector ni ancla entrenada | A | r2v sin medir; LoRA, elements y Soul ID sin verificar | TASK-1980 (detector + canario); identidad entrenada como follow-up |
| H12 | Diálogo y lipsync en español | B | declarado por proveedores, sin prueba | TASK-1985 |
| H13 | Ninguna generación tiene canario de garantía (primer cuadro fiel, parpadeo, deriva) | A | sólo verificación del contrato del endpoint (humo) | TASK-1980 |
| H14 | Estimación ≠ factura | A | SKY V11 facturó ≈ 43 % sobre lo estimado; el CLI estima Seedance 2.5 1080p bajo la tarifa que publica la guía | TASK-1980 (reconciliación por request en el banco) |
| H15 | Interpolación / slow motion sin judder | C | sin motor en el CLI | follow-up (EPIC-051) |
| H16 | Video por la API de Higgsfield (Kling 3, PixVerse, LTX, …) | C | ninguna capacidad de video verificada en salida | TASK-1980 (una corrida por capacidad candidata) |
| H17 | Texto en escena (pantallas) sin detector | C | protegido por receta | follow-up |
| H18 | Stream en tiempo real dirigido | C | no operable por cola | fuera del programa |

## 6. Mantenimiento

- Un id de operación nuevo se agrega a §3.5 **y** a la guía §4.3 en el mismo commit; sin fila en la guía, la operación
  no existe para ningún agente.
- Un hueco se cierra con evidencia (README de canario), no con la existencia de código: se mueve a «cerrado» con la
  fecha y la carpeta del canario.
- Cambios de criterio de nivel (§3.2) o de cast (§3.6) se reflejan en `motion-design-studio` y su espejo.
