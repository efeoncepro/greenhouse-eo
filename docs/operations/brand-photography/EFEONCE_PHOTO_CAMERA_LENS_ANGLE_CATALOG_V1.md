# Catálogo de cámaras, lentes y ángulos — fotografía de marca Efeonce V1

> **Tipo de documento:** Catálogo técnico de tomas (dirección de fotografía)
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20
> **Documentación relacionada:** [Índice](./README.md) · [Lenguaje fotográfico (maestro)](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma: primer plano y logo](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Colorimetría](./EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Bloques de prompt y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Personas, identidad y vestuario](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Manual de uso](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md)

Este catálogo reúne **las 20 tomas probadas** en la corrida del 2026-09-19 (`ai-generations/2026-09-19_lenguaje-fotografico-efeonce/`).
Cada ficha dice qué lente y posición declarar, qué comunica, dónde usarla, qué lecho (primer plano desenfocado de la
firma) le corresponde, el texto de prompt que funcionó (verbatim, sólo la parte específica de la toma: los bloques
comunes están en [bloques de prompt](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)), lo que se midió y lo que falló.

Marcas: **[medido]**, **[decisión del operador]**, **[criterio]**, **[pendiente]** (ver [índice](./README.md)).

Métricas de cada ficha (re-medidas el 2026-09-19 sobre el plate): **Logo** = color y contraste peor caso con
`LOGO=0.15` (`componer.mjs`, medición histórica; valor vigente `0.20`); **Lecho** = Sobel `max`/`p99`/`lum media` en la caja x 0,30–0,70 × y 0,87–0,995
(`medir.mjs`); **Q** = % quemado; **A** = % aplastado; **Con** = contraste p95−p5. Definiciones exactas en
[Colorimetría §7](./EFEONCE_PHOTO_COLORIMETRY_V1.md#7-métricas-definición-exacta).

---

## 1. Lo que el modelo respeta y lo que no

| Afirmación | Tipo |
|---|---|
| El lente declarado (mm, f/) **cambia la sensación** de la foto: compresión del tele, distorsión del ojo de pez, fondo cremoso a f/2. | [medido, visual] |
| El modelo **no respeta la física exacta**: la profundidad de campo y la distorsión son aproximadas. Declarar el lente es dirección, no simulación óptica. | [criterio] |
| La **posición de cámara** («camera on the floor», «lens only a few centimeters behind the near edge of the table») pesa más que el número del lente para lograr el lecho. | [medido] |
| Pedir «so close to the lens that it dissolves into a soft abstract blur with no visible edges or details» es lo que desenfoca de verdad el lecho; «out of focus» solo no basta. | [medido: góndola y bebidas fallaron sin esto] |

---

## 2. Tabla resumen

| # | Toma | Lente / ajuste | Altura y distancia | Comunica | Servicios | Lecho y tono | Logo medido |
|---|---|---|---|---|---|---|---|
| 1 | Asiento en la mesa | 50 mm f/2 u 85 mm f/1,8 | Lente a ras de la mesa, desde el asiento del cliente | «Estás en la sesión»: co-creación | Estrategia, RevOps, sesiones | Borde de mesa (oscuro o claro, **declarado**) | 13,8:1 (JN1) |
| 2 | Asiento a ras + ojo de pez (N1) | 10 mm | Cámara baja en el borde de la mesa | Taller, cercanía | Talleres creativos | Borde curvo de mesa | 3,70:1 **falla** (tono medio) |
| 3 | Ojo de pez fuerte (N1b) | 8 mm, distorsión evidente | Muy baja, en el borde de mesa redonda | Energía, taller | Talleres, contenido | Borde curvo claro | 6,16:1 |
| 4 | Ojo de pez grupo | 8 mm full-frame | Centro de mesa redonda mirando arriba | Equipo alrededor de la obra | Talleres, branding | Borde curvo claro | 5,29:1 |
| 5 | Dron cenital | 90°, ~25 m, todo enfocado | Aérea | Escala de una activación | Eventos, BTL, activaciones | Sin desenfoque (**excepción**) | 3,11 → 7,50:1 |
| 6 | Tilt-shift | Balcón a 45°, franja nítida | Alta | Rodaje como maqueta | Run & Gun, calle | Desenfoque óptico del propio tilt-shift | 7,82 / 9,27:1 |
| 7 | Contrapicado (gusano) | 24 mm f/2,8 | Cámara en el piso | Dirección, autoridad, rodaje | Run & Gun, audiovisual | Maleta de equipo oscura | 17,3 / 18,6:1 |
| 8 | Reflejo en vidrio | 50 mm f/2 | A través del vidrio de la sala | Estrategia con ciudad | Estrategia, journeys | Marco/zócalo del vidrio oscuro | 17,5 / 18,2 / 9,5:1 |
| 9 | Tele 200 | 200 mm f/2,8 | Cruzando la calle / fondo de sala | Equipo en ciudad; escenario | Equipo, eventos, thought leadership | Techo de auto / cabezas del público | 16,8 / 12,7 / 15,1:1 |
| 10 | Macro | 100 mm macro f/4 | A centímetros del material | Textura del oficio; pausa visual | Creative, producto | La superficie misma | 8,7:1 |
| 11 | Retrato 105–135 | 105–135 mm f/2 | Ojo, desde el escritorio del visitante | Persona con carácter | Equipo, liderazgo | Borde de mesa/escritorio claro | 5,3–8,5:1 |
| 12 | Marco en marco | 50 mm f/2,8 | Desde un pasillo oscuro | Estrategia observada, foco | Estrategia, research | Consola del pasillo oscura | 16,8:1 |
| 13 | Escala | 35 mm f/4 | Ojo, espacio enorme | Datos, magnitud | RevOps, data, AEO | Piso de concreto claro | 4,92:1 |
| 14 | Barrido (movimiento) | 35 mm, obturación lenta paneando | Caminando con el sujeto | Velocidad, Run & Gun | Run & Gun, social | Mostrador oscuro | 19,1:1 |
| 15 | Noche | 50 mm f/1,8 | Escritorio | Cierre de proyecto | Todos (cierre) | Borde oscuro con textura | 18,4:1 |
| 16 | Por encima del respaldo | 70–85 mm f/1,8–2 | Hombro sentado, detrás de la silla vacía | «Tu lugar en la mesa» | Presentaciones | Respaldo curvo | 11,6:1 (v2/02) |
| 17 | Mesa larga en profundidad | 135 mm f/2 | A centímetros sobre la mesa | Retrato al fondo, calma | Estrategia, retrato | La propia mesa, clara | 3,15 → 9,26:1 |
| 18 | Por encima del hombro | 85 mm f/2 | Detrás de un hombro | Descubrimiento en pantalla | SEO/AEO, producto | Borde de mesa claro | 6,92:1 |
| 19 | Picado 60° | 50 mm f/4 | ~60° hacia abajo sobre la mesa | La obra sobre la mesa | Dirección de arte, KV | Borde de mesa de luz claro | 8,56 / 8,89:1 |
| 20 | Respaldo del espectador (B) | 70 mm f/2 | Ojo sentado, cabecera | Presentación desde tu silla | Estrategia | Respaldo de silla vacía | 18,6:1 |

---

## 3. Fichas

Formato de cada ficha: **Ajuste** · **Qué comunica** · **Usar en** · **Lecho** · **Prompt verbatim** · **Medido** ·
**Fallos y fix** · **Formatos**.

### 3.1 Asiento en la mesa (base del sistema)

- **Ajuste:** 50 mm f/2 (dos personas) u 85 mm f/1,8 (sesión); lente «only a few centimeters behind the near edge of
  the table and just above its surface». Foco en los ojos de quien explica.
- **Qué comunica:** el espectador ocupa el asiento del cliente; co-creación («No te entregamos crecimiento. Lo
  construimos contigo»).
- **Usar en:** sesiones de estrategia, RevOps, workshops, onboarding, reuniones con dato visible (no reuniones
  genéricas: debe haber obra o dato).
- **Lecho:** el borde más cercano de la mesa. **Tono obligatorio** («DARK walnut in shadow» o «VERY LIGHT pale oak»).
- **Prompt verbatim** (`personas/JN1-mesa.txt`):
  > SCENE: taken from the client's own seat at a clean oak table, golden late-afternoon sun raking in from the side: Julio (plain white shirt, sleeves rolled) and Nexa (cream knit) work together over large printed storyboard frames for a coffee brand; Nexa points at one frame and laughs, Julio leans in explaining with his pen. 50mm lens at f/2, focus on both faces.
  >
  > FOREGROUND (planned): the client's side of the oak table, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), DARK walnut in shadow; its center calm and even.
- **Medido:** JN1 logo blanco 13,8:1; lecho 14/9/39; Q 2,10 %; Con 85 **[medido]**.
- **Fallos y fix:** la versión `asiento/A-mesa` (lecho sin tono) dio madera media: logo **3,20:1 (falla)**, lecho lum 145;
  `asiento/A2-mesa` declaró «DARK band in soft shadow … bottom 14%» → logo **18,96:1**, lecho lum 16 **[medido]**.
- **Formatos de esta toma:** 4:5 probado; adaptación de este encuadre a 16:9 (mesa a lo ancho) **[pendiente]**.

### 3.2 Asiento a ras + ojo de pez (N1, original)

- **Ajuste:** 10 mm ojo de pez, cámara baja en el centro/borde de una mesa redonda.
- **Qué comunica:** estar dentro del taller, a la altura de la obra. **Aprobado por el operador como ángulo de uso**
  («son dos ángulos que podemos usar») **[decisión del operador]**.
- **Usar en:** talleres creativos, sesiones de ideación, contenido de cultura.
- **Lecho:** borde curvo de la mesa. Debe declararse **muy claro**.
- **Prompt verbatim** (`personas/N1-ojo-pez.txt`):
  > SCENE: 10mm FISHEYE lens, camera low at the center of a round work table in a bright clean Santiago studio: Nexa, in a cream knit, leans over the table laughing while placing printed campaign frames, two colleagues' hands at the edges; the ceiling and window light curve around her. Accent: one orange (#F55D01) marker.
  >
  > FOREGROUND (planned): the curved near edge of the pale oak table, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, pale oak in daylight; its center calm and even.
- **Medido:** logo **3,70:1 (falla)**; lecho lum **127** (tono medio) **[medido]**.
- **Fallos y fix:** «pale oak in daylight» no bastó; el fix es el de N1b («bleached pale oak lit directly by daylight,
  almost white, the brightest surface in the lower frame»).
- **Formatos:** 4:5; 1:1 muy natural para ojo de pez **[criterio]**.

### 3.3 Ojo de pez fuerte (N1b)

- **Ajuste:** 8 mm con distorsión evidente, cámara «very low right at the near edge of a round work table».
- **Qué comunica:** energía, cercanía, taller vivo. Destacado por el operador **[decisión del operador]**.
- **Prompt verbatim** (`personas/N1b.txt`):
  > SCENE: 8mm FISHEYE lens with STRONG, obvious barrel distortion (straight lines of the ceiling, windows and table visibly curved into arcs, dramatic exaggerated perspective), camera very low right at the near edge of a round work table in a bright clean Santiago studio: Nexa, in a cream knit, leans over the table laughing while placing printed campaign frames, two colleagues' hands at the edges; the ceiling and window light curve around her. Accent: one orange (#F55D01) marker.
  >
  > FOREGROUND (planned): the curved near edge of the pale oak table, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, bleached pale oak lit directly by daylight, almost white, the brightest surface in the lower frame; its center calm and even.
- **Medido:** logo navy **6,16:1**; lecho 28/21/186; Q 2,34 %; Con 82 **[medido]**. El `max` 28 en la caja estándar
  está sobre el umbral de ~25: revisar al zoom que no haya borde nítido bajo el logo **[criterio]**.
- **Formatos:** 4:5 probado.

### 3.4 Ojo de pez grupo

- **Ajuste:** 8 mm full-frame, «camera placed low at the center of a round work table looking up and across».
- **Qué comunica:** cinco personas alrededor de la obra; co-creación con cliente.
- **Prompt verbatim** (`camaras/batch.json`, `1-ojo-de-pez-plate.png`):
  > CAMERA: an 8mm circular-free full-frame FISHEYE lens (strong natural barrel distortion, curved horizon lines), camera placed low at the center of a round work table looking up and across. SCENE: a creative workshop in a clean Santiago studio; five people (Efeonce creatives and client team, diverse Latin American faces, natural clothes, one in a plain azure-blue #0375DB sweater) lean in over the table from all sides, sketching and placing printed frames, one woman laughing; the ceiling and window light curve around them. Story accent: one orange (#F55D01) marker in a hand.
  > FOREGROUND (planned): the curved near edge of the pale oak table, closest to the lens, spanning the entire width of the bottom 18% of the frame, out of focus gradually, VERY LIGHT pale oak in daylight, almost white; its center calm and even.
- **Medido:** logo navy **5,29:1**; lecho 15/9/184; Q **1,55 %** (ventanas); Con 75 **[medido]**.
- **Fallos:** el quemado de ventanas es propio del ángulo (mira hacia el techo); pedir «windows keep detail» **[criterio]**.

### 3.5 Dron cenital

- **Ajuste:** «straight top-down (90 degrees), from about 25 meters high, deep focus, crisp».
- **Qué comunica:** la escala y la geometría de una activación; el azul como campo gráfico (35,8 % del cuadro).
- **Usar en:** activaciones, BTL, eventos, instalaciones.
- **Lecho:** **no hay desenfoque** (todo enfocado). Es la **excepción** del sistema: la firma va sobre una franja
  serena y muy clara planeada («BOTTOM AREA»).
- **Prompt verbatim** (`camaras/b2.json`, `2b-drone-plate.png`):
  > CAMERA: DRONE photograph, straight top-down (90 degrees), from about 25 meters high, deep focus, crisp. SCENE: a brand activation on a clean paved plaza in Santiago on a sunny morning: a neat grid of large azure-blue (#0375DB) floor panels forming a simple geometric installation, people walking through it casting long soft shadows, a small Efeonce production crew with a camera on a tripod at one corner, a few trees at the edge. Story accent: one orange (#F55D01) umbrella. Everything tidy.
  > BOTTOM AREA (planned): the bottom 18% of the frame is a calm, even band of very pale, almost white limestone paving in full sun, seamless with no joints or lines, with nothing on it (no people, no shadows, no objects).
- **Medido:** versión 1 (pavimento gris medio) logo **3,11:1 (falla)**, lecho 182/102/189; versión 2b logo **7,50:1**,
  lecho 89/35/224 (nítido pero sereno) **[medido]**.
- **Fallos:** la franja clara se lee «algo puesta» **[criterio, revisor]**. Decisión abierta: ¿firma distinta para
  tomas todo-enfocado? **[pendiente]**.
- **Formatos de esta toma:** 4:5 probado; 1:1 y adaptación de este encuadre a 16:9 (instalación a lo ancho) **[pendiente]**.

### 3.6 Tilt-shift

- **Ajuste:** «from a high balcony looking down at 45 degrees, with the classic miniature effect: only a thin horizontal
  band across the middle of the frame is sharp».
- **Qué comunica:** el rodaje como maqueta: producción ágil observada con cariño. **Mejor lecho natural del sistema**:
  el desenfoque lo pone la óptica **[criterio, medido]**.
- **Usar en:** Run & Gun, producción en calle, retail exterior.
- **Prompt verbatim** (`cruce/batch.json`, `X4-tiltshift-mediodia-plate.png`, versión del set curado):
  > SCENE (Run & Gun, Barrio Italia, Santiago): TILT-SHIFT lens from a high balcony at 45 degrees with the classic miniature effect (only a thin horizontal band sharp); hard midday sun with crisp, graphic black shadows of trees, poles and people on pale sunlit pavement; a small film crew with a camera, a boom and a light panel interviews a café owner on the corner; the camera operator wears a small azure-blue (#0375DB) cap; one orange (#F55D01) sandbag. Strong geometry of shadows and street lines.
  >
  > FOREGROUND (planned): the pale sunlit pavement dissolved in the tilt-shift blur, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, almost white; its center calm and even.
- **Medido:** `camaras/3-tilt-shift` logo 7,82:1, Con 81, disp. tono 26° (colorimetría cercana a T3); `cruce/X4` logo
  9,27:1, lecho 24/14/235, Q 0,15 % **[medido]**.
- **Formatos:** 4:5; 16:9 excelente (la franja nítida es horizontal) **[criterio]**.

### 3.7 Contrapicado (vista de gusano)

- **Ajuste:** «worm's-eye view, the camera resting on the floor, 24mm lens at f/2.8, looking steeply up».
- **Qué comunica:** dirección, decisión, oficio audiovisual en acción.
- **Usar en:** Run & Gun, dirección de rodaje, retratos de liderazgo en acción.
- **Lecho:** borde de maleta de equipo mate en el piso, **DARK near black**.
- **Prompt verbatim** (`camaras/batch.json`, `4-contrapicado-plate.png`):
  > CAMERA: worm's-eye view, the camera resting on the floor, 24mm lens at f/2.8, looking steeply up. SCENE: a Run & Gun camera operator (a young Colombian woman in a plain azure-blue #0375DB hoodie) stands tall holding a compact cinema camera on a shoulder rig, framing something above, with concentration; behind her a clean industrial studio ceiling with soft skylight. Story accent: the tiny red-orange recording light on the camera.
  > FOREGROUND (planned): the edge of a matte-black hard equipment case lying on the floor right in front of the lens, spanning the entire width of the bottom 20% of the frame, falling out of focus gradually, DARK near black; its center calm and even.
- **Medido:** logo blanco 17,3:1; lecho 13/7/24; **Q 6,51 %** (tragaluz); azul **17,0 %** (hoodie, demasiado) **[medido]**.
  Versión con Julio (`personas/J2-rodaje-polo`): Q 5,23 %, logo 18,6:1.
- **Fallos y fix:** el hoodie azul grande viola la regla de dos modos → prenda más pequeña o azul en objeto; el
  tragaluz quema → pedir «skylight keeps detail» **[criterio, pendiente de probar]**.

### 3.8 Reflejo en vidrio

- **Ajuste:** 50 mm f/2, «shot THROUGH and ONTO the glass wall of a meeting room».
- **Qué comunica:** la estrategia con la ciudad encima; capas; el journey dibujado. Es la toma **más sobria** (C media
  5,5 en la versión de día) **[medido]**.
- **Usar en:** estrategia, customer journey, research, consultoría.
- **Lecho:** zócalo y parante del vidrio, **DARK charcoal**.
- **Prompt verbatim** (`cruce/batch.json`, `X3-reflejo-dorado-plate.png`):
  > SCENE (strategy, Bogotá): golden hour, shot through and onto the glass wall of a meeting room so the warm, glowing city skyline and mountains reflect across the glass; inside, an Efeonce strategist (a Mexican man in his forties, light linen shirt) draws the last arrow of a customer journey in azure-blue (#0375DB) marker on the glass while a client executive (a Colombian woman in her fifties) leans in, a slice of low sun lighting both faces; one lime (#6EC207) sticky note with a check. 50mm lens at f/2, focus on the marker tip and their faces.
  >
  > FOREGROUND (planned): the lower frame of the glass wall (matte charcoal mullion and sill), so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), DARK charcoal; its center calm and even.
- **Medido:** `camaras/5-reflejo` (día) logo 17,5:1, C media 5,5, lima 0,43 %; `cruce/X3` (dorada) logo 18,2:1, b* altas
  **+21,3** (dorado intencional), disp. tono 17°; `personas/N2-reflejo` logo 9,5:1 **[medido]**.

### 3.9 Tele 200 mm

- **Ajuste:** «200mm telephoto lens at f/2.8 from across a street, strong compression and creamy background».
- **Qué comunica:** equipo en la ciudad, editorial; en escenario, la voz de Efeonce vista desde el público.
- **Usar en:** equipo, cultura, mercados (CDMX, Bogotá, Miami), eventos y charlas.
- **Lecho:** techo de auto sin logos (calle) o cabezas del público (escenario), **DARK**.
- **Prompt verbatim — calle** (`camaras/batch.json`, `6-tele-200-plate.png`):
  > CAMERA: 200mm telephoto lens at f/2.8 from across a street, strong compression and creamy background. SCENE: Mexico City, Roma Norte, late afternoon golden light: three members of an Efeonce team (a woman carrying a camera bag, a man with a laptop under his arm wearing a plain azure-blue #0375DB overshirt, and a young woman laughing) cross the street toward the camera mid-conversation, jacaranda trees and pastel facades compressed behind them. Story accent: one orange (#F55D01) scarf.
  > FOREGROUND (planned): the roof of a plain dark-grey passing car (no logos, no text) very close to the lens, spanning the entire width of the bottom 20%, dissolved into a soft, abstract, dark blur with no visible details, DARK; its center calm and even.
- **Prompt verbatim — escenario** (`personas/J3-escenario.txt`):
  > SCENE: Julio speaking on a small stage at a marketing talk in Santiago, wearing a dark navy blazer over a white shirt, mid-gesture explaining with open hands, lit by a warm spotlight with a soft dark background and a large screen behind him glowing azure blue (#0375DB) with abstract shapes (no text); 200mm lens at f/2.8 from the back of the audience.
  >
  > FOREGROUND (planned): the heads and shoulders of the audience in the front rows, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), DARK silhouettes; its center calm and even.
- **Medido:** calle logo 16,8:1, b* altas +10,3 (editorial cálido); `JN3-calle` 12,7:1; `J3-escenario` 15,1:1 con
  azul **23,5 %** (pantalla = campo protagonista) **[medido]**.

### 3.10 Macro

- **Ajuste:** 100 mm macro f/4 a centímetros del material; o 85 mm f/2 en primer plano de manos.
- **Qué comunica:** la textura del oficio; pausa visual en una grilla.
- **Usar en:** Creative, producto, contenido; como respiro entre tomas con personas.
- **Lecho:** la misma superficie fuera de foco.
- **Prompt verbatim** (`palancas/batch.json`, `T1-macro-pintura-plate.png`):
  > SCENE (craft macro, no people's faces): extreme macro of a paint roller at the exact moment it lays fresh, glossy bright azure-blue (#0375DB) paint over a clean white wall: the wet ridges and tiny air bubbles of the paint catch a hard raking beam of sunlight, the crisp edge between wet blue and dry white runs diagonally across the frame; only the fingers of a hand on the roller handle at the edge. 100mm macro lens at f/4, focus on the wet paint edge.
  >
  > FOREGROUND (planned): the soft white wall surface close to the lens, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, warm white; its center calm and even.
- **Medido:** logo navy 8,7:1; lecho 11/6/230; azul 43,3 % **[medido]**.
- **Fallo de serie:** es pintura, y la serie tenía demasiadas piezas de pintura → «nosotros NO somos Berel»
  **[decisión del operador]**. Usar macro sobre materiales de **otras industrias** (café, harina, tela, papel).

### 3.11 Retrato 105–135 mm

- **Ajuste:** 105 mm f/2 (ambiental) a 135 mm f/2 (editorial), ojo, foco en los ojos, mirada fuera de cuadro.
- **Qué comunica:** personas con carácter, no modelos; liderazgo tranquilo.
- **Usar en:** equipo, liderazgo, página de nosotros, thought leadership.
- **Lecho:** borde de mesa o escritorio del visitante, **VERY LIGHT** en un rayo de sol.
- **Prompt verbatim** (`impacto/batch.json`, `I5-retrato-persianas-plate.png`):
  > SCENE (team portrait, Bogotá): a striking editorial portrait of an Efeonce creative director (a Colombian man in his forties, salt-and-pepper beard, plain charcoal shirt), seated, turned three-quarters, looking out of frame with calm intensity; hard sunlight through venetian blinds throws crisp graphic stripes of light and shadow across his face, shirt and the pale wall behind; one small azure-blue (#0375DB) ceramic cup on the table catches a stripe of light. 135mm lens at f/2, focus on his eyes.
  >
  > FOREGROUND (planned): the edge of the pale oak table on the camera side, very close to the lens, spanning the ENTIRE width of the bottom 18% of the frame, dissolved into a smooth out-of-focus blur (never a hard band), VERY LIGHT, pale oak in a stripe of sun, almost white; its center calm and even.
- **Medido:** I5 logo navy 8,5:1, Con 93, Q 1,38 %; R1 (polo, 105 mm) 8,1:1; R2 (CDMX, 135 mm) 6,2:1 con **Q 3,05 %**;
  J1 (Julio, 135 mm) 5,3:1 **[medido]**.
- **Fallos:** la taza azul se repitió en I5, K3, K1 y JN1 → variar el portador del azul (cuaderno en J1) **[criterio]**.
  Sin firma cuando el emblema bordado del polo se lee a tamaño de consumo (una sola marca protagonista) **[decisión
  del operador]**.

### 3.12 Marco dentro del marco

- **Ajuste:** 50 mm f/2,8 «from a dim corridor through an open doorway into a bright room».
- **Qué comunica:** foco, estrategia observada, geometría fuerte con grandes áreas oscuras en calma.
- **Prompt verbatim** (`impacto/bfix.json`, `I3b-marco-plate.png`):
  > SCENE (Strategy, Lima): frame within a frame. Shot from a dim corridor through an open doorway into a bright room: inside, a single strategist (a Peruvian woman in her forties, cream linen shirt) stands at a wall covered with a neat grid of pale sticky notes and printed frames, one column of cards in azure blue (#0375DB), placing a card, lit by a single hard slice of afternoon sun that cuts across the wall and her; the dark door frame and corridor walls form a strong geometric frame with large calm dark areas. 50mm lens at f/2.8, focus on her.
  >
  > FOREGROUND (planned): the edge of a low dark walnut console in the corridor, so close to the lens that it dissolves into a soft abstract dark blur with no visible edges or grain, very close to the lens, spanning the ENTIRE width of the bottom 18% of the frame, dissolved into a smooth out-of-focus blur (never a hard band), DARK walnut in shadow; its center calm and even.
- **Medido:** logo blanco 16,8:1; lecho 12/7/23; disp. tono **14°** (la más baja del set); Con 69 **[medido]**.
- **Fallo y fix:** la versión I3 dejaba ver veta de la consola; se agregó «dissolves into an abstract blur … with no
  visible edges or grain» (I3b). Regla: pedir **«dissolves into abstract blur»** **[medido]**.

### 3.13 Escala

- **Ajuste:** 35 mm f/4 a la altura del ojo; persona pequeña en espacio enorme.
- **Qué comunica:** magnitud del dato, minimalismo, espacio negativo.
- **Prompt verbatim** (`impacto/batch.json`, `I4-escala-plate.png`):
  > SCENE (Revenue & data, Mexico City): scale and minimalism. A very large, clean, pale concrete gallery-like space with tall windows; a single analyst (a Mexican man in his thirties, charcoal knit) stands small in the frame in front of a huge glowing azure-blue (#0375DB) wall screen showing a clean data landscape of soft abstract shapes (no text), his silhouette rim-lit by the screen, long soft shadows on the polished floor; vast calm negative space above. 35mm lens at f/4, eye level, focus on the man.
  >
  > FOREGROUND (planned): the pale polished concrete floor close to the lens, very close to the lens, spanning the ENTIRE width of the bottom 18% of the frame, dissolved into a smooth out-of-focus blur (never a hard band), VERY LIGHT, luminous pale concrete; its center calm and even.
- **Medido:** logo navy **4,92:1** (el más bajo que pasa); azul 18,4 %; Cp95 71 **[medido]**. El reflejo azul en el
  piso ensucia el lecho: pedir «the floor near the lens receives no screen reflection» **[criterio, pendiente]**.
- **Formatos de esta toma:** adaptación a 16:9 con espacio negativo lateral **[pendiente]**.

### 3.14 Barrido (movimiento)

- **Ajuste:** 35 mm, «slow shutter PANNING with them».
- **Qué comunica:** velocidad, energía, producción en la calle.
- **Prompt verbatim** (`palancas/batch.json`, `M1-movimiento-plate.png`):
  > SCENE (Run & Gun in motion, Lima): the crew moves fast through the bright, clean central market of Surquillo in Lima: a camera operator walking backward with a gimbal filming a chef who explains while walking between stalls of colorful fruit; shot with a slow shutter PANNING with them: the chef and the operator are sharp while the stalls and passers-by stream into horizontal motion blur, conveying speed and energy. Accent: the operator's small azure-blue (#0375DB) cap; one orange (#F55D01) crate of fruit. 35mm lens, focus on the chef.
  >
  > FOREGROUND (planned): the out-of-focus edge of a fruit stall counter with dark wood, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), DARK wood in shadow; its center calm and even.
- **Medido:** logo blanco 19,1:1; Q **2,84 %**; naranja 1,02 % **[medido]**. Ventaja: los letreros quedan ilegibles
  por el barrido (menos riesgo de marcas de terceros) **[medido, visual]**.

### 3.15 Noche

- **Ajuste:** 50 mm f/1,8, foco en el rostro; luz del monitor (visto de espaldas) + una lámpara pequeña.
- **Qué comunica:** cierre de proyecto, alivio, equipo comprometido.
- **Prompt verbatim** (`curado/batch.json`, `K3-noche-plate.png`):
  > SCENE (night, Santiago): 9 pm in a quiet, clean studio on a high floor; outside the floor-to-ceiling window, the city lights of Santiago and the dark silhouette of the Andes. Two Efeonce creatives (a young Chilean woman and a Venezuelan man in his thirties) finish a campaign together, faces lit softly by the glow of a large monitor facing them (screen seen from behind, content not visible) and by one small warm desk lamp; the woman leans back laughing with relief, he points at the monitor. NIGHT COLOR RULE: natural mixed light, skin natural and warm, city lights small warm and white points, NO teal-and-orange, NO neon; shadows deep but ALWAYS with visible texture and detail in clothes, desk and room (no pure black areas). Accent: one azure-blue (#0375DB) mug. 50mm lens at f/1.8, focus on her face.
  >
  > FOREGROUND (planned): the dark edge of the desk, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), DARK but with subtle texture; its center calm and even.
- **Medido:** aplastado 18,5 % (N1) → **7,1 %** (K3); logo 18,4:1 **[medido]**.

### 3.16 Por encima del respaldo

- **Ajuste:** 85 mm f/1,8 «from behind the empty seat reserved for the viewer, at seated shoulder height».
- **Qué comunica:** el espectador tiene su silla en la presentación.
- **Prompt verbatim** (`v2/batch-texto.json`, `02-tinta-respaldo-plate.png`):
  > SCENE: presentation wall. 85mm lens at f/1.8, from behind the empty seat reserved for the viewer, at seated shoulder height. A Chilean creative director in his forties, rolled-up sleeves, pins printed campaign frames onto a large felt board while turning to explain; two client executives seated at the table follow him (seen in three-quarter back view). Focus on the creative director.
  >
  > FOREGROUND (planned from the start, part of the point of view): the nearest part of the top of the backrest of the empty chair in front of the camera (warm-grey felt upholstery, softly curved top, no straight edge) is very close to the lens and spans the ENTIRE width of the frame; it falls out of focus GRADUALLY with a smooth, natural optical falloff over the bottom quarter of the frame (the nearest part very blurred, softening progressively), never a hard band; nothing on that nearest part.
- **Nota:** esta toma nació en la V2 (salas tonales), que el operador rechazó por genérica; el **ángulo** se conserva,
  la escena debe tener obra real **[decisión del operador + criterio]**. Medido: logo blanco 11,6:1; lecho 15/9/53 **[medido]**.

### 3.17 Mesa larga en profundidad

- **Ajuste:** 135 mm f/2, «camera very low, just a few centimeters above the near end of a long pale oak table».
- **Qué comunica:** retrato sereno al fondo; la mesa conduce la mirada.
- **Prompt verbatim** (`v2/batch-relecho.json`, `09-calido-mesa-larga-v2-plate.png`):
  > SCENE: portrait at the end of a long table. 135mm lens at f/2, camera very low, just a few centimeters above the near end of a long pale oak table. At the far end, a Chilean strategist in her late forties in an oatmeal knit reviews a printed colour proof, holding it with both hands, calm concentration; she sits in the right third of the frame, open calm plaster wall to her left. Focus on her eyes; the long tabletop comes gradually into focus toward her.
  >
  > FOREGROUND (planned from the start, part of the point of view): the nearest part of the long pale oak table is very close to the lens and spans the ENTIRE width of the frame; it falls out of focus GRADUALLY with a smooth, natural optical falloff over the bottom quarter of the frame (the nearest part very blurred, softening progressively), never a hard band; nothing on that nearest part. That nearest part is very pale bleached ash wood lit directly by the window daylight, so bright it is almost white (much lighter than anything else in the lower part of the frame), with no shadow falling on it.
- **Nota:** la versión sin la última oración (`09-calido-mesa-larga`) salió en tono medio; la «relecho» fijó el tono.
  Medido: v1 logo **3,15:1 (falla)**, lecho lum 142 (tono medio) → v2 logo navy **9,26:1**, lecho 11/6/236 **[medido]**.

### 3.18 Por encima del hombro (pantalla en mano)

- **Ajuste:** 85 mm f/2, foco en el teléfono y la mano; rostros algo más suaves pero legibles.
- **Qué comunica:** el momento de descubrimiento (la marca del cliente aparece en la respuesta de una IA).
- **Usar en:** SEO/AEO, producto digital, apps.
- **Prompt verbatim** (`oficio3/batch.json`, `1-aeo-miami-plate.png`):
  > SCENE (service: AI search visibility; story accent: result lime): a bright, clean, modern office in Miami, palm trees and bay light through the window. Over-the-shoulder close view: a client marketing director (a Cuban-American woman in her forties, cream silk blouse) holds her phone and turns it slightly toward an Efeonce strategist beside her (a Venezuelan man in his thirties, azure-blue overshirt #0375DB) who leans in, both smiling with surprise. The phone screen is seen clearly and almost straight-on and is FULLY filled with flat, uniform, pure chroma-green (#00FF00), edge to edge, no reflections. 85mm lens at f/2, focus on the phone and her hand; faces slightly softer but readable.
  >
  > FOREGROUND (planned, a real element of the scene between camera and subject): the pale oak edge of the table, very close to the lens, spanning the ENTIRE width of the bottom 20% of the frame, falling out of focus GRADUALLY (smooth optical falloff, never a hard band), VERY LIGHT, bright pale oak lit by daylight, almost white; its center area calm and even.
- **Medido:** logo navy 6,9:1; azul **15,9 %** (camisa: demasiado); b* sombras **−11,7** (sombras frías) **[medido]**.
- **Fallos:** camisa azul grande → reducir a prenda pequeña u objeto; la pantalla se curó por edición generativa (ver
  [pipeline §6](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#6-curación-generativa-de-pantallas)); defecto menor:
  el borde inferior del teléfono se fundió con la UI.

### 3.19 Picado 60° sobre la obra

- **Ajuste:** 50 mm f/4, «high-angle view (about 60 degrees down)»; foco en la prueba principal.
- **Qué comunica:** la obra sobre la mesa y la mano que la corrige: dirección de arte en acto.
- **Prompt verbatim** (`curado/batch.json`, `K1-kv-cafe-plate.png`):
  > SCENE (creative art direction, Santiago studio): high-angle view over a clean light table with a row of large printed proofs of a campaign key visual for a specialty coffee brand (a striking photograph of a barista's hands pouring milk into a cup, steam rising, warm tones, no text, no logos). A hard, low beam of morning sun rakes across the prints; an art director's hand holds a loupe over the main proof while a second hand circles the steam with an orange (#F55D01) grease pencil. One azure-blue (#0375DB) ceramic cup stands at the corner of the table. Clean and cared-for studio. 50mm lens at f/4, focus on the main proof. Exposed for highlights: the prints keep full color and detail.
  >
  > FOREGROUND (planned): the near edge of the light table, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, warm white; its center calm and even.
- **Medido:** K1 logo navy 8,9:1, Q 0,33 %; C3 (pintura, retirada de la serie) 8,6:1 **[medido]**.
- **Fallos y fix:** la mesa de luz encendida quemó 31,5 % (C2) → «backlight dimmed to a soft glow» + «Exposed for
  highlights» (C3/K1). La primera versión de esta toma era de pintura (categoría de un cliente real) → se cambió a
  café **[decisión del operador]**.

### 3.20 Respaldo del espectador (B, «tu lugar en la mesa»)

- **Ajuste:** 70 mm f/2, «seated eye level, from the empty seat reserved for the viewer at the head of the table».
- **Prompt verbatim** (`asiento/batch.json`, `B-silla-plate.png`, extracto de cámara y primer plano):
  > Camera: 70mm lens at f/2, seated eye level, from the empty seat reserved for the viewer at the head of the table, focus on the consultant. FOREGROUND (planned, part of the point of view): at the bottom center of the frame is the TOP OF THE BACKREST OF THE EMPTY CHAIR in front of the camera, dark charcoal fabric upholstery, a soft gentle curve (not a straight line), completely out of focus, spanning about 80% of the frame width and occupying the bottom 18% of the frame; it is clearly the empty seat that belongs to the viewer.
- **Nota:** «about 80% of the frame width» deja bordes con escena; las versiones posteriores piden «ENTIRE width»
  **[criterio]**. Medido: logo blanco 18,6:1; lecho 12/7/17 **[medido]**.

---

## 4. Palancas de impacto (nivel +1)

> **Dónde vive qué (2026-09-20).** El catálogo de palancas es
> [`EFEONCE_PHOTO_LEVERS_CATALOG_V1.md`](./EFEONCE_PHOTO_LEVERS_CATALOG_V1.md): **33 en cuatro familias**, con la
> ficha de cada una. Esta sección conserva **lo medido en cámara** —qué le hace cada palanca al contraste y al
> b\*— que es lo que este documento aporta y no está en el otro. **Una toma no es una palanca:** una toma dice
> *con qué* se fotografía (lente, altura, distancia) y una palanca *qué hace* la foto; se combinan.

El operador pidió «un nivel más para garantizar impacto visual» **[decisión del operador]**. La ronda nivel +1
(`impacto/`, `cruce/`, `palancas/`) mostró que **el impacto viene de la luz y la composición, no del modelo**
**[criterio, medido]**. Bloque verbatim en [bloques de prompt §3.2](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md#32-impacto-v1).

| Palanca | Cómo se pide | Ejemplos | Efecto medido |
|---|---|---|---|
| **Luz con carácter** | «a hard, directional beam of real sunlight or a single strong source», persianas, contraluz, mediodía duro, hora dorada | I1 harina (haz de amanecer), I5 persianas, X4 mediodía, X3 dorada | Contraste sube de 53 (T3 sereno) a 69–93 |
| **Hora del día** | Amanecer / mediodía duro / hora dorada / noche, declarada en la escena | I1 (dawn), X4 (hard midday), X3/JN3 (golden hour), K3 (9 pm) | b* altas +3 (mediodía) a +21 (dorada) |
| **Momento decisivo** | «at the peak moment», «throws her head back laughing», «mid-clap» | I1 (harina en el aire), X1 (festejo del pipeline), K2b (risa de la encargada) | Cualitativo: la foto tiene un «antes» y un «después» |
| **Geometría** | Marco en marco, escala, líneas de fuga, sombras gráficas | I3b, I4, X4 | Disp. tono baja (I3b 14°) por la calma del campo |
| **Tres planos** | «THREE distinct depth planes (blurred foreground, sharp subject, soft background)» | Todas las del nivel +1 | Es la firma misma: el primer plano es el lecho |
| **Bloque de color** | Un campo azul protagonista (papel, pantalla, instalación) o una hoja azul bajo el objeto | I2 (52 %), I6b (hoja azul), C2 (35,8 %) | Cp95 58–71 legítimo |

Regla de uso **[criterio]**: una **idea visual** por cuadro; combinar máximo dos palancas fuertes (ej. hora dorada +
reflejo en X3). Más palancas = imagen de stock recargada.

---

## 5. Formatos

| Formato | Estado | Regla de lecho y logo |
|---|---|---|
| **4:5 1152×1440** | **Probado** | Lecho 18 % en `foto:prompt`; firma vigente 20 % del lado corto. La corrida inicial midió logos al 15 % **[histórico]** |
| **9:16 1152×2048** | **Probado en plates nativos** | Lecho 22 % en `foto:prompt`; ubicación final de la firma en Stories/Reels pendiente de aprobación |
| **16:9 2048×1152** | **Probado en plates nativos** | Lecho 16 % en `foto:prompt`; tomas naturales: tilt-shift, escala, mesa larga, dron |
| 1:1 | **[pendiente]** | Propuesta: lecho 20–25 % **[criterio]**; tomas naturales: ojo de pez, macro |

Recomendación **[criterio]**: generar **nativo** en el formato final (el `--size` de `pnpm ai:image`), no recortar un
4:5; el lecho y el logo deben planearse en la toma.

Pendiente adicional del operador: «las imágenes deben dejar espacio a veces para donde se vaya a agregar los textos»
**[pendiente, no trabajado]**.

---

## 6. `high` vs `xhigh`

| Aspecto | `high` | `xhigh` |
|---|---|---|
| Uso | Explorar, rondas, iteración | **Sólo masters** aprobados |
| Costo aprox. (1152×1440) | ≈ USD 0,05 | ≈ USD 0,09 (1,8×) |
| Diferencia visual | — | Mejora modesta de detalle fino (`impacto/high-vs-xhigh.jpg`) |
| Medido (I1 harina) | Q 0,71 % · A 10,4 % · b* altas +4,2 · Con 80 | Q 1,19 % · A 7,9 % · b* altas +8,3 · Con 81 |

Lectura: `xhigh` no cambia la colorimetría de forma sistemática; es otra toma con el mismo prompt, con algo más de
detalle **[medido]**. No sirve para «arreglar» una pieza.

---

## 7. Pendientes

| # | Pendiente |
|---|---|
| 1 | 1:1 nativo y posición final de firma en 9:16 y 16:9 **[pendiente]**; los plates de 9:16 y 16:9 ya fueron probados |
| 2 | Firma para tomas todo-enfocado (dron) **[pendiente]** |
| 3 | Re-medir lechos con cajas ajustadas por pieza (este catálogo usa una caja estándar) **[pendiente]** |
| 4 | Contrapicado sin quemado de tragaluz **[pendiente]** |
| 5 | Espacio para texto por toma **[pendiente]** |

## Delta 2026-09-20 — seis tomas con atmósfera y acción suspendida **[medido]**

Ronda `ai-generations/2026-09-20_angulos-atmosfera/` (fichas en `fichas/`, prompts verbatim en `prompts/`).
Cubre seis lentes y ángulos que el catálogo tenía pendientes o sin combinar con las palancas nuevas.

| Pieza | Cámara / lente / ángulo | Escena | Palanca | Lecho | Resultado |
|---|---|---|---|---|---|
| A1 | Macro 100 mm f/4, obturador congelado | Tostaduría, granos volcados del cucharón | suspendido + polvo en el haz | borde oscuro de mesa · 16,24:1 | Sirve; la palanca se lee de inmediato |
| A2 | 35 mm, obturador lento, **paneando** | Mercado en Lima, operador Run & Gun | registro documental | cajón de fruta · 13,85:1 | Sujeto nítido sobre el mercado en estelas |
| A3 | **Tilt-shift** 45° desde balcón | Rodaje callejero en Roma Norte, CDMX | bruma | baranda · 11,78:1 | Efecto miniatura + haces entre edificios |
| A4 | 50 mm f/2 **a través de vidrio** | Journey dibujado, Bogotá, hora dorada | reflejo de ciudad como capa | marco de aluminio · 7,11:1 | Identidad sostenida. **Ojo:** dibujó flechas y círculos en el vidrio, al límite de «sin texto generado» |
| A5 | 35 mm f/4, **escala** | Nave industrial, pantalla mural | bruma → columnas de luz | banco de concreto · **3,16:1 ✗** | La toma funciona; **el lecho falla y se regenera** |
| A6 | 24 mm f/2.8, **cámara en el piso** | Set nocturno en Miami, contraluz duro | suspendido + humo | maleta de equipo · 18,96:1 | La más cinematográfica de la ronda |

**Tres aprendizajes:**

1. **La atmósfera es la palanca de mayor retorno.** A5 y A6 no existen sin ella: lo que se fotografía ahí es el
   aire. En una escena de luz plana no tiene dónde vivir y se lee pegada.
2. **El concreto claro no sirve de lecho** (A5, 3,16:1), igual que el concreto pulido de `N4`: se cambia de
   lecho, no se insiste.
3. **La ronda se pasó de dosis**: 2 de 6 con acción suspendida cuando el tope es 1 de 4. El comando ahora lo
   cuenta y lo nombra con el número exacto.
