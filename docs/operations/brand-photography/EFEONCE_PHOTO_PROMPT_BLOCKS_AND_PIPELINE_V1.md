# Bloques de prompt y pipeline de producción — fotografía de marca Efeonce V1

> **Tipo de documento:** Especificación técnica de producción (prompts, comandos, scripts, QA)
> **Versión:** 1.0
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-19 por Claude
> **Documentación relacionada:** [Índice](./README.md) · [Lenguaje fotográfico (maestro)](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma: primer plano y logo](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Colorimetría](./EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Cámaras, lentes y ángulos](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Personas, identidad y vestuario](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Manual de uso](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md)

Este documento es el **cómo se produce**: los bloques de texto que se pegan en cada prompt (verbatim), la ficha de
toma, el pipeline paso a paso con los comandos exactos, la medición, la curación de pantallas, la composición de la
firma, el QA, los costos y las trampas conocidas.

Evidencia: `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/` («la corrida»). Los prompts de cada ronda están
verbatim en `rondas/<ronda>/batch*.json` y `*.txt` (versionados); las imágenes son locales (gitignoreadas).

Marcas: **[medido]**, **[decisión del operador]**, **[criterio]**, **[pendiente]** (ver [índice](./README.md)).

---

## 0. Portabilidad de motor — el estilo NO depende del generador

El lenguaje fotográfico es **texto de prompt + reglas de post-proceso + umbrales de medición**. Eso es portable a
cualquier generador (GPT Image, Gemini/Imagen, Seedream, Firefly, Midjourney, el que sea) y a cualquier agente
(Claude, Codex/ChatGPT, otro). **El motor es intercambiable; el estilo no.**

| Parte de este documento | Portabilidad |
|---|---|
| §1 anatomía del prompt · §2 ficha de toma · **§3 bloques verbatim** | **Portable**: se pegan tal cual en cualquier motor |
| §5 umbrales de medición · §7 QA y reglas duras | **Portable**: se verifican sobre el archivo resultante, no sobre el motor |
| §4 pipeline (`pnpm ai:image`, batches, hoja de contacto) · §6 curación con máscara | **Específico de nuestro CLI**: con otro motor se replica la intención, no los comandos |

**Obligatorio con cualquier motor, sin excepción:**

0. **Mirar las imágenes aprobadas antes de generar.** Abrir la hoja de contacto y al menos dos finales a tamaño
   completo comparables por sujetos u oficio; para Julio/Nexa, partir de
   `rondas/personas/julio-nexa-firmadas.jpg` y de sus finales individuales; para el color de la serie, abrir
   `rondas/curado/set-curado-12.jpg` (rutas bajo `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/`).
   Registrar en la ficha los archivos mirados y cómo viven el azul y el naranja **o** lima en la composición
   (luz, reflejo, material, superficie, relación entre planos o elemento propio de la escena), cómo funciona el
   lecho y qué distingue la escena de una foto de stock. No hay que inventar un objeto de color para completar la
   ficha. Un objeto funcional sí puede llevar un acento de marca si suma sutileza y elegancia a la escena; esta
   regla evita la obligación, no prohíbe los objetos **[aclaración del operador, 2026-09-20]**. Leer la skill o copiar un prompt
   anterior no acredita esta comparación visual. Si los binarios aprobados no están disponibles, recuperar esa
   referencia antes de generar una persona o una foto de marca.
1. Pegar los bloques verbatim de §3 (realismo, color system, balance de blancos, lecho/FOREGROUND, y IDENTITY +
   REFERENCES cuando hay personas reales). Un prompt de marca Efeonce sin estos bloques **no es del lenguaje**.
2. El plate se genera **sin logo, sin texto y sin marcas inventadas**. La firma es el SVG oficial **compuesto
   después** (20% del lado corto, centrado sobre el lecho desenfocado, contraste ≥ 4,5:1 medido; decisión del
   operador 2026-09-20). Un logo generado
   por el modelo es un descarte, no una corrección.
3. Formato **nativo** (4:5, 9:16, 16:9); nunca recortar un formato desde otro.
4. Medir antes de aprobar: nitidez del lecho (debe ser claramente menor que el sujeto) y contraste real de la zona
   de la firma y de cualquier zona reservada; medir y mirar también el azul activo y el acento de historia en los
   píxeles finales. La presencia en el texto del prompt no prueba presencia en la foto. Si no pasa, **se regenera el
   plate**; no se parcha con un scrim.
5. Si el motor no acepta imágenes de referencia, **no se improvisa la identidad de una persona real**: se usa una
   toma sin personas o se cambia de motor.

Si un motor nuevo rinde distinto con estos bloques, la corrección va al bloque (y queda registrada con su
evidencia), no a una versión paralela del estilo por herramienta.

---

## 1. Anatomía de un prompt

Orden canónico **[criterio, usado en todas las rondas aprobadas]**:

```text
[REALISMO v2]                 ← §3.1 (o su variante para personas con referencia, §3.1.1)
[IMPACTO v1]                  ← §3.2 (piezas de impacto) — o COLOR SYSTEM §3.3 (piezas serenas)
[WB / EXPOSICIÓN fuerte]      ← §3.4, cuando hay mesa de luz, blancos grandes o sala clara
[IDENTITY Julio / Nexa]       ← §3.6, sólo con personas reales de referencia
[REFERENCES ...]              ← §3.7, rol de cada imagen de referencia
SCENE: servicio · ciudad · luz y hora · momento · acento y su origen · lente y foco   ← ficha §2
[regla de NOCHE]              ← §3.5, dentro de SCENE, sólo de noche
FOREGROUND (planned): ...     ← §3.8, siempre al final, con tono declarado
```

Todo prompt pide **4:5 vertical** hoy (el bloque de realismo lo dice). Otros formatos: [pendiente], ver
[catálogo §5](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md#5-formatos).

---

## 2. Ficha de toma (plantilla)

Se llena **antes** de escribir el prompt. Una ficha = una foto.

| Campo | Qué poner | Ejemplo (K1, KV café) |
|---|---|---|
| Servicio / oficio | Qué servicio de Efeonce se ve trabajando | Dirección de arte / Creative Services |
| Obra visible | La cosa concreta que se está haciendo | Pruebas impresas de un KV |
| Mecanismo | Sistema, traza o dato que se ve | Lupa + corrección con lápiz graso |
| Industria (no-cliente) | Café, bebidas, panadería, retail, finanzas, gastronomía, eventos. **Nunca la categoría de un cliente real** | Café de especialidad |
| Mercado / ciudad | Santiago, CDMX, Bogotá, Lima, Miami | Santiago |
| Cámara / lente / ángulo | Del [catálogo](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) | Picado 60°, 50 mm f/4 |
| Luz y hora | Haz de sol, persianas, contraluz, dorada, mediodía, noche | Haz bajo de sol de mañana |
| Momento | La tensión o el pico de la acción | La mano marca el vapor |
| Azul (la casa) | Dónde vive `#0375DB` en la relación entre luz, material, espacio y planos; no exige un objeto | Reflejo azul de una escena en uso sobre el vidrio de la cabina |
| Acento de historia | Cómo se integra el naranja (idea) **o** lima (resultado) a la situación sin utilería impuesta | Un borde cálido de luz de la acción, coherente con el lugar |
| Lecho + tono | Primer plano planeado + DARK / VERY LIGHT | Borde de la mesa de luz, VERY LIGHT |
| Formato | 4:5 (probado) | 4:5 1152×1440 |
| Firma | Logo / selección AXIS / sin firma | Logo |
| Personas | Casting, o Julio/Nexa con referencias | Sólo manos |

---

## 3. Bloques verbatim

### 3.1 Realismo v2

> ⚠️ **El formato NO va dentro de este bloque, pero SÍ va en el prompt.** Hasta 2026-09-20 este bloque terminaba
> con «Vertical 4:5.» hardcodeado; copiarlo así mete una instrucción contradictoria en todo 9:16, 16:9 y 1:1. La cola
> ya fue removida. Lo que hacen los prompts **aprobados** de la ronda `texto` **[medido en
> `rondas/texto/bv2-{45,916,169}.json`]**: declaran el formato **una sola vez, en la sección de composición/reserva**,
> con su texto propio por formato — «VERTICAL 4:5 composition.», «VERTICAL 9:16 composition for Stories/Reels.»,
> «HORIZONTAL 16:9 composition.» — y ahí mismo va el límite de sujetos y la zona reservada. El porcentaje del lecho
> también cambia: **4:5 → 18%**, **9:16 → 22%**, **16:9 → 16%**. Regla: el formato vive donde vive la composición,
> nunca dentro de un bloque que se reusa en los cuatro formatos.

Archivo: `prompts/bloque-realismo-v2.txt`. Nace de la regla del operador «una buena imagen de IA es la que no se
siente que es IA» y de su rechazo a la suciedad **[decisión del operador]**.

```text
IT MUST NOT LOOK AI-GENERATED: a real candid documentary photograph taken by a working photographer on a full-frame mirrorless camera with a real lens. Realism comes from PEOPLE, LIGHT AND MATERIALS, not from dirt: visible skin pores, fine wrinkles, uneven skin tone, stray hairs, natural fabric creases, real paper texture, soft dust visible only in a beam of light, slight motion blur on moving hands, subtle natural lens vignetting, a slightly imperfect un-staged composition. The SPACE is clean, cared-for and organized like a premium creative studio: only one or two lived-in details (a mug, a notebook); NO dirt, NO stains, NO coffee rings, NO loose tape scraps, NO tangled cables, NO mess. No plastic skin, no perfect symmetry, no glossy CGI surfaces, no over-sharpening, no HDR, no beauty retouching, no stock-photo smiles. Natural true-to-life color with no color grading; highlights keep detail, shadows open. Latin American people with real, characterful faces. No text, no letters, no numbers, no logos, no watermarks anywhere.
```

#### 3.1.1 Variante para personas con referencia (Julio / Nexa)

Idéntico pero **sin** la oración «Latin American people with real, characterful faces.» (la identidad la dan las
referencias y el bloque IDENTITY; la oración de casting compite con ellas) **[criterio, usado en `rondas/personas/`]**.

#### 3.1.2 Versión retirada (v1) — no usar

La v1 pedía «fingerprints and smudges, … lived-in clutter (cables, tape, mugs, scraps)». Resultado: suciedad. El
operador: «tanto desorden y suciedad tampoco se ve bien» **[decisión del operador]**. Queda sólo en
`rondas/oficio2/batch.json` como historia.

### 3.2 Impacto v1

Archivo: `prompts/bloque-impacto-v1.txt`. Se usa en las piezas de nivel +1 (`impacto/`, `cruce/`, `palancas/`,
`curado/`, `personas/`).

```text
VISUAL IMPACT (this is an award-level editorial photograph, the kind that stops the scroll): ONE bold visual idea per frame; LIGHT WITH CHARACTER — a hard, directional beam of real sunlight or a single strong source sculpting the subject, with crisp graphic shadows and rich but detailed darks (never flat, never evenly lit); a DECISIVE MOMENT at the peak of the action; a GRAPHIC COMPOSITION with strong geometry, clear figure-ground separation and generous calm negative space; THREE distinct depth planes (blurred foreground, sharp subject, soft background). COLOR: natural true-to-life color, no grading; a restrained palette where bright azure blue (#0375DB) emerges naturally in the spatial composition through scene light, reflections, real materials or the relationship between depth planes, creating graphic rhythm without requiring a separate blue prop; everything else calm and neutral-warm; highlights keep detail; white balance warm-neutral, shadows never blue.
```

### 3.3 Color system (piezas serenas y cámaras)

Verbatim de `rondas/camaras/batch.json`. Reemplaza al bloque de impacto cuando la pieza no busca impacto máximo.

```text
COLOR SYSTEM: a calm tonal background field; skin and real materials; bright azure blue (#0375DB) integrated naturally through scene light, reflections, materials or the relationship between spatial planes, with no separate color prop required; plus at most ONE small story accent arising from the scene and its composition. Moderate contrast. WHITE BALANCE AND EXPOSURE: warm-neutral daylight (about 5200K), whites very slightly warm, never bluish; shadows neutral, never blue; exposed for the highlights, bright surfaces keep texture and detail.
```

La variante corta usada en `oficio3/` (sin WB) queda como evidencia histórica de esa ronda; para nuevas fichas se
aplica la formulación anterior, que admite color integrado en la composición sin utilería obligatoria.

### 3.4 Balance de blancos y exposición (versión fuerte)

Verbatim de `rondas/oficio3/bfix.json`. Obligatorio con mesas de luz, blancos grandes o salas claras. Efecto medido:
Lima b* altas −7,2 → 0,0; KV quemado 31,5 % → 0,05 % ([colorimetría §5.2](./EFEONCE_PHOTO_COLORIMETRY_V1.md#52-efecto-medido-del-bloque-de-balance-y-exposición)).

```text
WHITE BALANCE AND EXPOSURE: warm-neutral daylight white balance (about 5200K): whites read clean and very slightly warm, never bluish; shadows neutral, never blue or cyan. Exposed for the highlights: bright surfaces keep texture and detail, nothing pure white or blown out except tiny specular glints.
```

### 3.5 Regla de noche

Va **dentro** de SCENE. Verbatim de `rondas/curado/batch.json` (K3). Aplastado 18,5 % → 7,1 % **[medido]**.

```text
NIGHT COLOR RULE: natural mixed light, skin natural and warm, city lights small warm and white points, NO teal-and-orange, NO neon; shadows deep but ALWAYS with visible texture and detail in clothes, desk and room (no pure black areas).
```

### 3.6 IDENTITY (personas reales)

Verbatim de `rondas/personas/*.txt`. Detalle y QA en [Personas](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md).

```text
IDENTITY (critical): the man is the SAME real person shown in the reference images. His face is LONG AND LEAN: measured from hairline to the bottom of the beard it is roughly 1.5 times TALLER than it is WIDE at the cheekbones — a long vertical oval, NOT round, NOT square, NOT chubby. If in doubt make it longer and narrower, never wider. FOREHEAD tall and open, with a RECEDING HAIRLINE pulling back at both temples into bare corners. CHEEKS flat and slightly hollow under the cheekbones. BEARD full and LONG, extending well BELOW the jawline past the chin, with heavy grey in the moustache, chin and lower beard, darker at the sideburns and a clean cheek line — never a short beard hugging the jaw. JAW narrowing to the chin, separated from a visible slim neck; no double chin, no jowls. GLASSES rectangular metal-rim with a THICK brushed-silver bar across the TOP of both lenses and wide flat temple arms — never rimless, thin-wire, round or plastic. HAIR cut SHORT and close at the sides and around the ears, almost faded, and the GREY IS CONCENTRATED THERE so the sides read clearly lighter than the top; on top, defined curls of MODERATE volume, dominant tone dark with scattered grey — never a tall voluminous hairstyle and never uniformly grey. BROWS thick and fairly straight. EXPRESSION a slight closed-mouth smile, eyes engaged. Warm brown skin with visible pores, mid-forties: do not rejuvenate, beautify or soften. Broad-shouldered and solid in the body, while the FACE stays long and lean.
```

```text
IDENTITY (critical): the woman is NEXA, the SAME person shown in the Nexa reference images: a woman in her early thirties with long dark wavy hair, fair olive skin, dark eyes and defined brows. Preserve her face and hair EXACTLY as in the references; only pose, clothing, light and setting change.
```

> **Delta 2026-09-20 — el bloque de Julio pasó de adjetivos a geometría.** El anterior («short
> salt-and-pepper curly hair, thin rectangular silver-rim glasses, a full dark beard with grey»)
> describía rasgos sin proporciones, y el modelo rellenaba: cara más redonda, montura al aire, barba
> corta, pelo de volumen parejo. Cuatro iteraciones ese día (v1→v4) mostraron que **«cara delgada» no
> significa nada para el modelo y una proporción declarada sí**. El bloque vigente fija el óvalo
> (1,5× más alto que ancho), la frente con entradas, las mejillas planas, la barba por debajo del
> mentón, la barra superior de la montura y —lo que más lo hace reconocible— los **laterales cortos
> con el gris concentrado ahí**. El texto de arriba es el que emite `pnpm foto:prompt`; un test lo
> verifica contra este documento en los dos sentidos.

### 3.7 REFERENCES (rol de cada imagen)

Cada `--image` necesita una frase que diga **qué tomar y qué ignorar** **[criterio, medido en QA de identidad]**.

| Caso | Texto verbatim |
|---|---|
| Julio solo | «REFERENCES: Images 1-3 are Julio (identity only; ignore their clothing and backgrounds).» |
| Julio + polo | «REFERENCES: Images 1-3 are Julio (identity only). Images 4-5 are the Efeonce team polo (deep navy pique with a small embroidered emblem on the left chest): use it as his exact garment.» |
| Julio + Nexa | «REFERENCES: Images 1-2 are Julio (identity only). Images 3-4 are Nexa (identity only). Ignore the clothing and backgrounds of all references.» |
| Nexa sola | «REFERENCES: Images 1-3 are Nexa (identity only; ignore their clothing and backgrounds).» |
| Polo (equipo) | «REFERENCES: Image 1 and Image 2 show the Efeonce team polo (deep navy pique polo with a small embroidered emblem on the left chest). Use them ONLY as the exact garment: same color, collar, fabric and embroidered emblem in the same position and size. Do not copy the studio background or presentation.» |
| Nave 3D (emblema) | «REFERENCES: Image 1 is the official white 3D model of the Efeonce ship emblem. Reproduce EXACTLY this object — same silhouette, the ring/orbit with its cuts, the three small windows, same proportions — as a real, physical, finely made matte white ceramic sculpture about 20 cm long. Do not redraw or simplify it.» (`rondas/v2/edit-nave.txt`) |

Rutas de referencia:

| Referencia | Ruta |
|---|---|
| Julio (rostro) | `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-01.png`, `-04.png` |
| Julio (cuerpo) | `ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-07.png` |
| Nexa | `ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png`, `nexa-the-point.png`, `nexa-the-listen.png` |
| Polo | `ai-generations/2026-09-17_polo-efeonce/final/efeonce-polo-navy-01-frente…png`, `…-10-detalle-bordado…png` |

### 3.8 FOREGROUND (plantilla del lecho)

Plantilla consolidada de las rondas `cruce/`, `curado/`, `palancas/`, `personas/` **[medido: todas las del set
curado]**. Siempre al final del prompt.

> ⚠️ **`<PCT>` cambia por formato, no es 18% siempre.** Hasta 2026-09-20 esta plantilla tenía «18%» hardcodeado, que
> es el valor de 4:5. Medido en `rondas/texto/bv2-{45,916,169}.json`: **4:5 → `18%`**, **9:16 → `22%`**,
> **16:9 → `16%`**. Un lecho de 18% en 16:9 se come la escena; en 9:16 queda corto. Es el mismo bug de clase que
> «Vertical 4:5.»: un valor de un formato metido dentro de un bloque que se reusa en todos.

```text
FOREGROUND (planned): <herramienta o superficie propia de la escena, sin logos ni texto>, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom <PCT> of the frame (never a hard band), <TONO>; its center calm and even.
```

| `<TONO>` | Texto verbatim que funcionó |
|---|---|
| Oscuro | «DARK near black» · «DARK in shadow» · «DARK walnut in shadow» · «DARK charcoal» · «DARK but with subtle texture» (noche) |
| Claro | «VERY LIGHT, pale oak in sun, almost white» · «VERY LIGHT, warm white» · «VERY LIGHT, bleached pale oak lit directly by daylight, almost white, the brightest surface in the lower frame» |

Refuerzos cuando el lecho sale nítido (retail): «the lens is almost touching a row of … shot wide open at f/1.4, so
they dissolve completely into a smooth, abstract, creamy dark blur with no shapes, highlights, edges or details at
all» (`curado/b2.json`, K2b). Sin esto la fila de botellas/latas salió nítida dos veces (p99 90 y 47) **[medido en
sesión]**. Catálogo de lechos por toma: [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) y
[catálogo](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md).

Excepción dron (todo enfocado): «BOTTOM AREA (planned): the bottom <PCT> of the frame is a calm, even band of very
pale, almost white limestone paving in full sun, seamless with no joints or lines, with nothing on it (no people, no
shadows, no objects).»

### 3.8.0 Dónde va la luz y dónde va la reserva **[medido 2026-09-20]**

> **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra pareja que esa luz deja, nunca en su
> camino.**

Es la regla que hacía falta y que nadie había escrito, aunque el canon ya la practicaba. **Verificado en el prompt
versionado de la pieza aprobada** `rondas/texto/bv2-169.json`: la luz es «a single hard beam of low sunlight cuts
through the window… the flour glows inside the sunbeam», y la reserva es «the LEFT 42% is a DEEP, warm, evenly
toned shadow on a plain wall». La luz sobre el panadero; el texto en la sombra del muro.

Se descubrió rompiéndola: al pedir la sombra gráfica de la ventana **sobre el muro que ERA la reserva**, el
contraste de la pieza cayó de **82 a 77** y la zona de texto de **0,24 a 0,22** **[medido por la sesión de capa
gráfica]**. Pedir «campo parejo» y «luz dura» sobre la misma superficie es una contradicción, y el modelo la
resuelve **aplanando la escena entera**. Eso explica buena parte de una tanda de 34 planchas planas, más que el
bloque de impacto ausente.

Corolario operativo: escribir la luz **dentro de la escena** sube el contraste de verdad (una toma pasó de 45 a
**70**; otra con identidad dio **82**, por encima de la pieza aprobada que da 73). Pero la superficie que recibe la
luz y la que aloja la reserva **tienen que ser distintas**.

### 3.8.1 SELECTION TARGET (objeto para enmarcar con caja AXIS) **[sin validar — bloque nuevo 2026-09-20]**

Se pide cuando la pieza llevará **caja de selección**. La caja AXIS usa trazo `#a6cdf5` con tiradores blancos:
**desaparece sobre fondo claro**, y el campo oscuro se consigue por **escenografía**, nunca por degradado ni scrim.
Piso: **≥ 3:1 del trazo contra la foto en los cuatro lados del perímetro**, medidos por separado. Sin este bloque
ninguna toma lo cumple: los plates existentes dan 1,0–2,5:1, y el que parecía pasar cayó a 1,81:1 en los costados
**[medido por la sesión de capa gráfica, 2026-09-19]**.

```text
SELECTION TARGET (planned): <un solo objeto propio de la escena, sin logos ni texto: la obra en revisión, la pieza terminada, la muestra>, complete and unobstructed, sitting clearly SEPARATED from everything else, with generous empty room on ALL FOUR sides of it. On every side of that object — above, below, left and right — the scene itself is a DEEP, evenly toned dark field (<materia oscura de la escena>), dark enough for a light blue outline to read against it; no bright surface, no window, no lamp, no pale tabletop and no light-coloured object touches or crosses that perimeter.
```

`<materia oscura de la escena>` es escenografía real, no un fondo abstracto: «a matt ink-blue studio wall in shadow»,
«dark walnut worktop in shadow», «a black acoustic panel», «the unlit depth of the room behind». Si la toma no admite
ninguno, **la toma no sirve para enmarcar**: cambiar de toma en vez de forzar el bloque.

**Conflicto con el lecho claro:** en las tomas 11, 13, 17, 18 y 19 el lecho de la firma es claro y contiguo al objeto.
Ver el conflicto abierto en
[reserva de espacio §3.1](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — **pendiente de decisión del operador**; no
generar plates que pidan las dos cosas a la vez.

### 3.8.2 MARGIN FIELD (campo profundo para una voz secundaria) **[sin validar — bloque nuevo 2026-09-20]**

Se pide cuando la pieza llevará una **voz secundaria tipo cita** al margen. No basta una zona calma: la banda debe ser
**vertical**, de tono declarado y parejo, y seguir libre **hasta al menos el 40% del alto**. Todos los plates actuales
cambian de tono antes del 33% y dan ≤ 1,7:1; el caso aprobado «¿Claude o Codex?» da 10,09:1 ahí **[medido por la
sesión de capa gráfica, 2026-09-19]**.

```text
MARGIN FIELD (planned): down the LEFT side of the frame, a continuous vertical band about 30% of the frame width runs unbroken from the top of the frame to BELOW the 40% mark of the frame height. That whole band is one single <TONO> surface of the scene itself (<materia de la escena>), evenly lit and even in tone from top to bottom, with NOTHING crossing it: no person, no furniture edge, no window, no cable, no light beam, no bright highlight and no change of material anywhere inside it.
```

`<TONO>` usa el mismo vocabulario del §3.8 («DEEP, evenly toned shadow… dark enough for white text» / «VERY LIGHT,
warm white… light enough for dark text»). El error típico es pedir «calma»: el modelo cambia de material a media
altura y la banda se corta.

**No compatible** con las tomas 4 (ojo de pez de grupo), 5 (dron cenital), 10 (macro) y 14 (barrido): ninguna tiene
margen vertical libre. En esas, la voz secundaria va en otra parte o no va.

### 3.8.3 Regla del lecho: el verbatim pide algo CERCA DEL LENTE **[NO CONCLUYENTE — corregido 2026-09-20]**

> 🔴 **Esta sección decía «[medido]» y no se sostiene. La corrijo acá en vez de borrarla, porque el error importa
> más que la regla.**

Lo que afirmé: que el lecho falla cuando el verbatim no pone nada cerca del lente, con tres mediciones de la toma 19
(4:5 con la frase 0,0002 ✓ · 16:9 sin la frase 0,0043 ✗ · 16:9 con la frase 0,0035 ✓).

**Lo que realmente se puede verificar hoy:**

| Afirmación | Estado |
|---|---|
| 4:5 con la frase da 0,0002 | **[medido]**, prompt versionado (`piloto-reservas/rondas/p1/batch-45.json`) |
| 16:9 con la frase da 0,0035 | **[medido]** el archivo; el prompt **no está versionado** |
| 16:9 **sin** la frase da 0,0043 | **[no verificable]**: ese prompt no se guardó |
| «la diferencia es el verbatim» | **[refutado o al menos sin respaldo]** |

Tres razones para no sostenerla:

1. **Todos los prompts de la toma 19 que SÍ están versionados llevan la frase** (`brief/batch-11.json`,
   `brief/batch-916.json`): es parte de la plantilla de la ficha, no algo que se ponga a mano. Que la corrida de
   16:9 careciera de ella sería la excepción, no la regla.
2. La sesión de capa gráfica midió las dos franjas con energía fina/gruesa y salen **estadísticamente iguales en
   todas las escalas** (0,162/0,470 contra 0,150/0,454). Parecen tener el mismo lecho.
3. Si son iguales, lo único que separa 0,0002 de 0,0035 es el **formato** (4:5 contra 16:9), no el verbatim. Sería
   un confundido de libro: comparé dos corridas que diferían en más de una variable y le atribuí la diferencia a la
   que me convenía.

**Qué queda en pie, y por qué el comando no cambia:** `pnpm foto:prompt` sigue emitiendo la frase siempre, en los
cuatro formatos, y hay un test que lo verifica. Pero eso ahora es **precaución barata, no una regla medida**: la
frase no cuesta nada, describe lo que un lecho ES, y todas las corridas aprobadas la llevan. **NUNCA la cites como
evidencia de causa.**

**La lección de proceso, que vale más:** los prompts de esas dos corridas **no se versionaron**, y por eso la
pregunta no se puede cerrar ni en un sentido ni en el otro. El canon de la carpeta ya lo pedía —«una regla nueva
entra con su evidencia (ruta de la pieza y medición), no de memoria»— y yo escribí una regla citando una corrida
cuya evidencia no existe. `pnpm foto:prompt --batch` deja el prompt versionado por construcción; usarlo cierra
este agujero.

### 3.9 Bloques históricos (V2, rechazados como genéricos)

`rondas/v2/` usó bloques «World-class creative agency photography … SET: one single tonal color family …» y
«ROOM PALETTE (ink family / warm-neutral family)». El operador rechazó la V2: «muy muy genérico, efeonce es una
agencia creativa también» **[decisión del operador]**. Se conservan dos aprendizajes: pedir paredes tinta **por
material** y la paleta cálida sin azul en sala («NO blue elements in the room at all»). No usar los bloques completos.

---

## 4. Pipeline paso a paso

| Paso | Qué | Herramienta | Salida |
|---|---|---|---|
| 1 | Ficha de toma (§2) | Documento / prompt | Ficha |
| 2 | Armar prompt (§1) y batch JSON | **`pnpm foto:prompt <ficha.json> --batch <out.json>`** | `batch.json` |
| 3 | Generar plates | `pnpm ai:image --batch` | `*-plate.png` |
| 4 | Hoja de contacto y revisión | Visor / Read | Lista de candidatas |
| 5 | Medir lecho y reservas | **`pnpm foto:validar <plate.png>`** | Tabla de las seis reservas |
| 6 | Regenerar si falla (§5.3) | `pnpm ai:image` | Nuevo plate |
| 7 | Pantallas por curación generativa (si hay pantalla) | `--image` + `--mask` | Plate con UI integrada |
| 8 | Firma / selección AXIS | `componer.mjs` | `*-final.png` |
| 9 | Métricas Lab | `metricas.cjs` | Tabla |
| 10 | QA al zoom (§8) | Ojo humano | Aprobada / regenerar |
| 11 | Grilla para revisión del operador | sharp (hoja de contacto) | `*.jpg` |

### 4.0 Requisitos de la máquina (lo único que no viaja con el repo)

```bash
pnpm foto:doctor          # ¿puede esta máquina producir un plate? Si no, dice exactamente qué falta
pnpm foto:doctor --json   # para encadenar; sale con código 1 si algo bloquea
```

**No lista variables: ejercita la cadena.** Una variable presente no prueba que el secreto resuelva, y un secreto
que resuelve no prueba que la clave sirva. Los seis chequeos hacen la operación real, y el de la clave usa
`/v1/models`, que **no cobra**. La clave nunca se imprime.

Los comandos y los bloques están versionados; **la credencial no**. Lo que el doctor verifica:

| Requisito | Cómo se verifica | Si falta |
|---|---|---|
| `OPENAI_API_KEY_SECRET_REF` en `.env.local` | `grep OPENAI_API_KEY .env.local` | `.env.local` está gitignored por diseño. Pedirlo al operador; el valor canónico es el nombre del secreto `greenhouse-openai-api-key`, **nunca la clave cruda** |
| Credenciales de aplicación de gcloud (ADC) vigentes | `gcloud auth application-default print-access-token` | `pnpm gcloud:auth:playwright -- --force`. Las ADC **expiran**: un fallo de resolución de secreto suele ser esto y no la clave |

`pnpm foto:prompt` y `pnpm foto:validar` **no** necesitan credencial: arman el prompt y miden archivos locales. La
credencial la necesita sólo `pnpm ai:image`. Eso permite preparar y revisar una tanda entera sin acceso, y pedir la
generación después.

El doctor también verifica que los bloques compartidos no traigan un valor de formato adentro, con la misma guarda
de `foto:prompt`, y que `sharp` esté disponible (es lo que mide). Un fallo de resolución de secreto **casi siempre
es la ADC vencida**, no la clave: el doctor los distingue.

Todo lo demás —bloques, tabla de formatos, umbrales, arnés— vive en `scripts/foto/` y viaja con el repo.

### 4.1 Preparar la carpeta de la corrida

```bash
cd /Users/jreye/Documents/greenhouse-eo
RUN=ai-generations/$(date +%F)_<slug>
mkdir -p $RUN/rondas/<ronda> $RUN/prompts $RUN/scripts
cp ai-generations/2026-09-19_lenguaje-fotografico-efeonce/prompts/bloque-*.txt $RUN/prompts/
cp ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/{medir.mjs,metricas.cjs,componer.mjs} $RUN/scripts/
```

`ai-generations/` es la carpeta durable de corridas (no `.captures/`, que se purga) **[criterio, memoria del
operador]**.

### 4.2 Construir el batch — `pnpm foto:prompt`

**No armes el prompt a mano.** Dos veces se coló un valor de un formato dentro de un bloque compartido y ninguna se
vio hasta medir: «Vertical 4:5.» al final del bloque de realismo, y «bottom 18%» en la plantilla del lecho. Mientras
armar un prompt sea copiar y pegar, ese bug vuelve.

```bash
pnpm foto:prompt --ficha-ejemplo > rondas/<ronda>/ficha.json   # plantilla para editar
pnpm foto:prompt rondas/<ronda>/ficha.json                     # ver el prompt resuelto
pnpm foto:prompt rondas/<ronda>/ficha.json --batch rondas/<ronda>/batch.json
```

La ficha declara **intención**; el comando resuelve los valores:

| Campo de la ficha | Qué es |
|---|---|
| `formato` | `4:5` · `9:16` · `16:9` · `1:1`. Determina `--size`, la frase que declara el formato, el **porcentaje del lecho** y el **límite de sujetos**. Es la única fuente de esos cuatro valores |
| `escena` | El párrafo `SCENE (...)` de la toma. Obligatorio: el modelo no inventa la escena |
| `lecho.objeto` / `lecho.tono` | Qué se pone cerca del lente y con qué tono declarado. Obligatorio: la firma siempre necesita su lecho |
| `reservas.texto` | `{ muro, tinta }` — zona de titular, con la geometría del formato |
| `reservas.seleccion` | `{ objeto, campo }` — bloque §3.8.1 |
| `reservas.margen` | `{ superficie, tinta }` — bloque §3.8.2 |
| `toma` | Número del catálogo de cámaras. Habilita el chequeo de incompatibilidad toma ↔ reserva |
| `impacto` | `false` para omitir el bloque de impacto (por defecto va) |

Cinco cosas que el comando **impide**, todas verificadas:

1. Un bloque compartido con un valor de formato adentro → **aborta** nombrando la frase culpable.
2. Pedir una reserva en una toma que no la admite (margen en 4, 5, 10, 14) → **aborta** con el porqué.
3. Mezclar formatos en un batch → **aborta**: `pnpm ai:image --batch` toma un solo `--size`.
4. Olvidar el lecho o la escena → **aborta**.
5. Escribir el JSON con `echo` y romper comillas → no aplica: lo escribe el comando.
6. **Una tanda de más de 6 fichas sin piloto** → **aborta**. Cada ficha necesita `piloto: "<ruta a un plate ya
   generado de esa misma ficha>"` que exista en disco. La calidad nunca vino de un prompt mejor: vino de generar
   poco y **mirar cada plate**. Con 34 de una sola vez nadie mira ninguna —se mira una hoja de contacto, que es
   donde una cara de stock o un fondo plano pasan desapercibidos— y eso costó 34 planchas sin dirección
   fotográfica el 2026-09-20.
7. **Un ancla de categoría de cliente** (hoy: pintura) → **aborta**. **[decisión del operador]** «nosotros NO somos
   Berel». La regla estaba escrita desde el 19/09 y una sesión generó igual un macro de un rodillo de pintura: un
   doc no impide nada. La tabla es extensible y se amplía **sólo** con lo que el operador declare.

Quedan dos **avisos** que no bloquean, porque la medición es débil: si la escena no declara **fuente de luz** o
**momento**. El aviso sobre pantallas, paneles o superficies azules se retiró: esos campos pueden estar integrados
naturalmente en la composición, como muestran varias tomas aprobadas. La ronda que el operador aprobó
declara luz y momento en el **100%** de sus escenas; la tanda que perdió calidad, en 64% y 26%, con **0% de planos
de profundidad** **[medido]**.

El comando imprime al final el `pnpm ai:image` exacto con el `--size` que corresponde. **`1:1` no tiene ronda
validada** y el comando lo advierte: sus números son criterio, no medición.

<details><summary>Cómo se hacía antes (histórico, ya no usar)</summary>

### 4.2-bis Construir el batch con Python

Los prompts tienen comillas, apóstrofes y `#`: **no** escribir el JSON a mano ni con `echo` **[medido: comillas rotas
en sesión]**.

```bash
python3 - <<'EOF'
import json
R = open('prompts/bloque-realismo-v2.txt').read().strip()
I = open('prompts/bloque-impacto-v1.txt').read().strip()
shots = [
  ("K1-kv-cafe-plate.png", """SCENE (creative art direction, Santiago studio): ... 50mm lens at f/4, focus on the main proof.""",
   """FOREGROUND (planned): the near edge of the light table, so close to the lens that it dissolves into a soft abstract blur with no visible edges or details, spanning the ENTIRE width of the bottom 18% of the frame (never a hard band), VERY LIGHT, warm white; its center calm and even."""),
]
batch = [{"filename": f, "prompt": f"{R}\n\n{I}\n\n{scene}\n\n{fg}"} for f, scene, fg in shots]
json.dump(batch, open('rondas/<ronda>/batch.json', 'w'), ensure_ascii=False, indent=1)
EOF
```

</details>

### 4.3 Generar

```bash
pnpm ai:image --batch $RUN/rondas/<ronda>/batch.json --out $RUN/rondas/<ronda> \
  --model gpt-image-2.5-flare --quality high --size 1152x1440
```

| Parámetro | Valor | Por qué |
|---|---|---|
| `--model` | `gpt-image-2.5-flare` para escenas sin identidad; `gpt-image-2.5-sunburst` con referencias de identidad o ediciones | Sunburst sostuvo mejor la identidad al mismo costo por quality×size **[medido]** |
| `--quality` | `high` para explorar; `xhigh` sólo masters | xhigh ≈ 1,8× costo, mejora modesta ([catálogo §6](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md#6-high-vs-xhigh)) |
| `--size` | `1152x1440` (4:5) | Único formato probado |
| `--out` | **Directorio** (sin extensión) en modo `--batch` | Desde el commit `5946f14a0`; antes se ignoraba y las imágenes caían en `public/images/generated` (§9) |

Con referencias (una sola imagen, no batch):

```bash
R="--image ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-01.png --image ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-04.png --image ai-generations/2026-09-17_equipo-vestuario/refs/julio-reyes-07.png"
pnpm ai:image ${=R} --prompt-file $RUN/rondas/personas/J1-retrato.txt \
  --out $RUN/rondas/personas/J1-retrato-plate.png \
  --model gpt-image-2.5-sunburst --quality high --size 1152x1440
```

`${=R}` es obligatorio en zsh (§9).

### 4.4 Revisar la hoja de contacto

Mirar todas las candidatas juntas antes de medir: la serie se juzga como serie (sesgos repetidos, taza azul, paneles
azules, pintura) **[criterio]**.

---

## 5. Medición y umbrales para regenerar

> **El comando canónico es `pnpm foto:validar <plate.png>`.** Valida las **seis reservas** del
> [contrato de reserva](./EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) sobre un plate limpio, detecta el formato
> solo y aplica el porcentaje de lecho que corresponde. Sale con código 1 si alguna reserva **evaluada** falla, así
> que se encadena en un gate.
>
> ```bash
> pnpm foto:validar <plate.png>                                  # lecho, aire, campo al margen
> pnpm foto:validar <plate.png> --zona-texto                     # exige además la zona de titular
> pnpm foto:validar <plate.png> --objeto 0.20,0.32,0.77,0.61     # exige además el perímetro de la caja
> ```
>
> `--zona-texto` y `--objeto` son **opt-in**: un plate que no pide esa reserva no reprueba por no tenerla. Las
> coordenadas van en **fracciones** del lienzo (0–1), nunca en píxeles. `--padding-x` / `--padding-y` barren el
> padding de la caja: el perímetro que importa es el de la **caja**, no el del objeto (ver el piloto del
> 2026-09-20).
>
> Los scripts sueltos `medir.mjs` y `metricas.cjs` de la carpeta de la corrida siguen sirviendo para medir una caja
> arbitraria o las métricas Lab, pero **para las reservas el comando es el dueño**.

### 5.0 Umbrales que aplica el comando

| Reserva | Umbral | Origen |
|---|---|---|
| 1 · zona de texto | contraste ≥ 4,5:1 con alguna tinta **y calma L\* < 0,5**; banda ≥ 0,28 del alto (vertical) o ≥ 0,45 del ancho (16:9) | **[medido]** ronda `texto` |
| 2 · objeto para enmarcar | trazo `#a6cdf5` ≥ 3:1 en los **cuatro** lados del perímetro de la caja | **[medido]** capa gráfica |
| 3 · lecho de la firma | mejor tinta ≥ 4,5:1 **y** nitidez < 0,004 — **señal débil, ver §5.1** | **[frágil]** |
| 4 · aire para cursores | calma L* < 1,0 en ambos costados | **[criterio]** |
| 5 · campo profundo al margen | banda continua ≥ 0,40 del alto, con calma L\* < 0,5 | **[medido]** piloto: alcanzable, da 0,60 |

> **`CALMA_MAX` mide calma, NO detecta la «losa».** Una losa ES calma: ése es justamente su problema. El plate que
> el operador rechazó por «extremadamente forzado» pasa este umbral, igual que pasaba el anterior. El detector de la
> losa está en la **entrada**, no en la salida: la guarda de `foto:prompt` que aborta si la materia de la superficie
> falta o es genérica. Tres métricas distintas —planitud, canto y calma en L\*— no distinguen la versión rechazada de
> la buena, porque la diferencia es **semántica**: si la cosa oscura es identificable como algo. Eso no lo mide un
> píxel, y fingir que sí sería el mismo error que esta corrida viene cazando.
| color · sombras no azules | b\* del cuartil oscuro ≥ −8 | **[medido]**, con confundido declarado |
| 6 · lecho por formato | 4:5 18% · 9:16 22% · 16:9 16% · 1:1 18% **[sin validar]** | **[medido]** `bv2-{45,916,169}` |



### 5.1 Lecho (`medir.mjs`)

```bash
cd $RUN
node scripts/medir.mjs rondas/<ronda>/<pieza>-plate.png '{"lecho":[0.30,0.87,0.70,0.995],"rostro":[0.40,0.25,0.60,0.45]}'
```

Salida: `lecho  max  13  p99   7  lum media 19`. Coordenadas relativas `[x0, y0, x1, y1]`. Ajustar la caja del rostro
a cada pieza. Definición: [colorimetría §7.2](./EFEONCE_PHOTO_COLORIMETRY_V1.md#72-medirmjs--nitidez-del-lecho-firma).

### 5.2 Métricas Lab (`metricas.cjs`)

```bash
node scripts/metricas.cjs K1=rondas/curado/K1-kv-cafe-plate.png K3=rondas/curado/K3-noche-plate.png
```

Imprime una tabla (`console.table`) con Lmedia, p1, p99, quemado, aplastado, contraste, Cmedia, Cp95, dispTono, bAltas,
bSombras, azul, naranja, lima y piel. Medir siempre el **plate** (sin logo). Rangos por contexto:
[colorimetría §7.4](./EFEONCE_PHOTO_COLORIMETRY_V1.md#74-rangos-objetivo-por-contexto).

### 5.3 Cuándo regenerar

| Señal | Umbral | Acción |
|---|---|---|
| Lecho nítido | p99 > ~20 o max > ~25 | Regenerar con «so close … no visible edges or details» (+ «almost touching … f/1.4» en retail) |
| Lecho tono medio | `lum media` ~100–175 | Regenerar declarando DARK o VERY LIGHT («the brightest surface in the lower frame») |
| Logo < 4,5:1 | `componer.mjs` lo reporta | Regenerar el lecho; nunca oscurecer/aclarar la foto a mano |
| Quemado / aplastado fuera de rango | Según contexto | Bloque WB/exposición, regla de noche, «highlights keep detail» |
| Azul intermedio en ropa | `azul` 10–18 % por una prenda | Revisar si parece vestuario de catálogo; integrar el azul mediante luz, material o relaciones espaciales de la escena |
| Marca de terceros o texto | Cualquiera visible al zoom | «completely unbranded, no brand names, no text, no logos anywhere on the body» |
| Identidad | Rasgo cambiado (lentes, barba, edad) | Regenerar con Sunburst + IDENTITY + roles de referencia |

---

### 5.1 Por qué la calma se mide en L\*, y por qué el lecho no es confiable **[medido 2026-09-20]**

El umbral de calma estaba en **luminancia lineal (Y)**, y Y no es perceptual: la misma textura física salta unas
15× más arriba de la escala que abajo. Un umbral en Y **premia la oscuridad**. Consecuencia medida: la losa oscura
que el operador rechazó por «extremadamente forzado» pasaba con **12× de margen**, mientras un muro pálido
genuinamente liso reprobaba. El detector empujaba justo hacia el defecto.

En **L\*** un paso vale lo mismo en cualquier nivel. El piso de 0,5 no es a ojo; sale de medir los dos extremos:

| Deben pasar (reservas reales) | L\* | Deben reprobar (escena viva) | L\* |
|---|---|---|---|
| T19 claro, banda | 0,18 | P3 lado derecho (monitor) | 0,89 |
| P3 banda izquierda | 0,24 | P1 zona del objeto | 1,29 |
| P2 banda izquierda · T13 claro | 0,29 | P2 lado derecho (la sala) | 2,44 |

El hueco va de 0,29 a 0,89; **0,5** queda a ~1,7× del peor que pasa y ~1,8× del mejor que falla.

**El lecho se queda en Y a propósito, y su umbral es frágil.** Sobre seis lechos: en L\* el lecho **no disuelto**
(0,18) es **indistinguible** de los disueltos (0,17–0,20), así que pasarlo a L\* le quitaría toda capacidad de
detectar; pero en Y separa por un pelo —0,0035 el disuelto contra 0,0043 el que no, 20% de margen, que es ruido—.
Honestamente: **este chequeo no mide desenfoque de forma confiable en ninguno de los dos espacios.** Sirve como
señal débil; la prueba real del lecho sigue siendo mirar el plate. Medirlo bien pide otra métrica (varianza de
laplaciano o energía de alta frecuencia normalizada) y está **[pendiente]**.


## 6. Curación generativa de pantallas

Regla del operador: «las composiciones deterministas no me gustan tanto a menos que sean referencias para pasarla al
modelo y curar con IA generativa» **[decisión del operador]**. Por eso **nunca se pega una UI** sobre la foto.

### 6.1 Pasos

| # | Paso | Detalle |
|---|---|---|
| 1 | Plate con pantalla en chroma | Pedir en SCENE: «the wall screen, seen almost straight-on and entirely inside the frame, is FULLY filled with flat uniform pure chroma-green (#00FF00), no reflections» |
| 2 | UI de referencia determinística | `node ui-ref.cjs` (pipeline 1600×900, 4 columnas «Calificado · Propuesta · Negociación · Ganado», tarjeta «Ganado» en lima `#6EC207`, puntos en azul `#0375DB`, Poppins trazada con fontkit) o `node ui-ia.cjs` (respuesta de IA en teléfono 900×1900 con card «Recomendado» con borde lima). Se ejecutan desde la carpeta de la ronda; escriben `ui-pipeline-ref.png` / `ui-ia-ref.png` |
| 3 | Máscara del chroma | §6.2 |
| 4 | Edición con máscara | §6.3 |
| 5 | Restaurar fuera de la pantalla | Componer: dentro de la máscara la edición, fuera el plate original, con alfa suavizado (`alpha-chroma.png`, `alpha-phone.png` en la corrida) |
| 6 | QA al zoom | Caras (delta medio medido 16,5: cambian poco pero cambian), bordes del dispositivo, reflejos |

### 6.2 Máscara (receta)

Scripts guardados en la corrida (2026-09-19): `scripts/mascara-chroma.cjs <plate> <mask.png> <alpha.png>` y
`scripts/restaurar-fuera-de-pantalla.cjs <plate> <edit> <alpha.png> <out.png>`. La receta equivalente es:

```js
// mask.mjs <plate> <mask.png> <alpha.png>
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const [plate, maskOut, alphaOut] = process.argv.slice(2)
const { data, info } = await sharp(plate).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const chroma = Buffer.alloc(W * H)
for (let i = 0; i < W * H; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
  chroma[i] = g > 120 && g > 1.4 * r && g > 1.4 * b ? 255 : 0          // 255 = pantalla verde
}
// Dilatar: blur 2 + threshold 20. extractChannel(0) es OBLIGATORIO: sin él sharp devuelve 3 canales
const dil = await sharp(chroma, { raw: { width: W, height: H, channels: 1 } })
  .blur(2).threshold(20).extractChannel(0).raw().toBuffer()
// Máscara para la API: alfa 0 = zona a editar, alfa 255 = protegida
const rgba = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) { rgba[i * 4 + 3] = 255 - dil[i] }
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(maskOut)
// Alfa suavizado para restaurar el plate fuera de la pantalla
await sharp(dil, { raw: { width: W, height: H, channels: 1 } }).blur(1.5).png().toFile(alphaOut)
```

Errores reales de la sesión:

- Sin `extractChannel(0)` la máscara salió de 3 canales y **se desalineó**: 2 intentos fallidos **[medido]**.
- Una **máscara rectangular** incluyó a una persona parada delante de la pantalla → la edición la convirtió en
  fantasma. La máscara debe salir del chroma, no de un rectángulo **[medido]**.
- La máscara **no preserva píxeles**: el modelo regenera toda la imagen y las caras pueden variar; por eso el paso 5
  restaura desde el plate **[medido]**.

### 6.3 Edición

```bash
pnpm ai:image --image rondas/cruce/X1-pipeline-atardecer-plate.png --image rondas/oficio2/ui-pipeline-ref.png \
  --mask rondas/cruce/mask.png --prompt-file rondas/cruce/prompt.txt \
  --out rondas/cruce/X1-edit.png --model gpt-image-2.5-sunburst --quality high --size 1152x1440
```

Prompt verbatim que funcionó (`rondas/cruce/prompt.txt`):

```text
Replace ALL of the flat chroma-green on the wall screen with the interface shown in Image 2, so that no green remains anywhere on the screen. The screen is a real lit LED display photographed in the room, lit in a warm golden-hour room; add a gentle warm glare of the low sun on the glass. Follow the screen's exact edges and perspective, keep the bezel, add the natural slight glare, a faint reflection of the window, the photo's white balance and a slight focus falloff so it looks photographed, not pasted. Keep the layout, colors and the lime-green "Ganado" card faithful to Image 2. Do not change the people, their faces, hands, expressions, the table, the window or the city. It must look like one real photograph.
```

Variantes verbatim: pantalla parcialmente tapada por una persona (`oficio2/prompt-pantalla2.txt`: «the interface
continues naturally BEHIND him») y teléfono (`oficio3/prompt-phone.txt`: «keep the phone bezel, her fingers and thumb
in front of the screen where they overlap»). Defecto conocido del teléfono: el borde inferior se fundió con la UI
**[medido, visual]**.

---

## 7. Composición de la firma y selección AXIS (`componer.mjs`)

```bash
cd $RUN
LOGO=0.20 node scripts/componer.mjs rondas/<ronda>/<pieza>-plate.png rondas/<ronda>/<pieza>-final.png
# con selección colaborativa AXIS:
LOGO=0.20 CSCALE=1.8 node scripts/componer.mjs rondas/cruce/X1-final-plate.png rondas/cruce/X1-final.png \
  '{"box":{"left":620,"top":180,"right":1040,"bottom":480},"cursors":[{"id":"c1","kind":"collaborator","label":"Cliente","anchor":"top-start"},{"id":"c2","kind":"collaborator","label":"RevOps","anchor":"top-end"}],"colors":{"c1":"#6EC207","c2":"#0375DB"},"padding":"compact","local":"bottom-end"}'
# (valores de caja ilustrativos: medir el objeto real en píxeles del plate)
```

| Parámetro | Qué hace | Valor canónico |
|---|---|---|
| `LOGO` (env) | Ancho del logo como fracción del ancho del lienzo. El default del script histórico sigue en `0.15`: declarar el valor al invocarlo | **0.20** **[decisión del operador, 2026-09-20]**; contraste ≥ 4,5:1 medido |
| `CSCALE` (env) | Escala de las etiquetas de los cursores colaboradores | 1.8 (default) |
| Posición | Centrado horizontal; centro vertical a 93,5 % del alto | Fija en el script |
| Color del logo | Compara blanco (`public/branding/logo-negative.svg`) vs navy (`logo-full.svg`) contra el píxel más claro / más oscuro del área del logo; elige el de mayor contraste | Mínimo 4,5:1 |
| JSON de selección (3.er argumento) | `box` = límites del objeto en píxeles `{left, top, right, bottom}`; `cursors` = `{id, kind: "collaborator", label, anchor}` con `anchor` en una esquina (`top-start`, `top-end`, `bottom-end`, `bottom-start`); `colors` = `#rrggbb` por id; `padding` (`standard`/`compact`); `local` = ancla del cursor local (default `bottom-end`) | Etiquetas cortas: Arte, Cliente, SEO, RevOps, Nexa. Anclas **hacia el espacio libre**: hacia el borde, las etiquetas salen del lienzo y el script aborta |

Implementación: usa `resolveCollaborationSelectionIntent` (`@efeoncepro/axis-ui-contracts`) y
`renderCollaborationSelection` (`scripts/creative/layout-compiler/axis-advertising.mjs`); convierte cada `<text>` en
trazos con fontkit (Poppins Bold) y **aborta** si queda un `<text>` o si una etiqueta sale del lienzo
(`evidence.withinCanvas`). Colores por rol: Cliente lima `#6EC207`, Arte naranja `#F55D01`, RevOps/Efeonce azul
`#0375DB`, Nexa `#D6246E`, SEO `#12AFA2`. **Nunca** etiquetar con el nombre de un cliente real («Berel» → «Cliente»)
**[decisión del operador]**. Reglas completas: [Firma](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md).

Salida: `…-final.png logo blanco 18.82:1 selección OK`.

`firmar.mjs` (firma v1: `node firmar.mjs <plate> <out> <cy_frac> [ancho_frac]`) queda como histórico; usar
`componer.mjs`.

---

## 8. QA final (checklist)

| # | Chequeo | Cómo | Bloquea |
|---|---|---|---|
| 1 | Test de sustitución: con el logo de otra agencia, ¿deja de funcionar? | Mirar | Sí |
| 2 | Hay obra, mecanismo e idea (no reunión genérica) | Mirar vs ficha | Sí |
| 3 | No parece IA: piel, manos, dedos, texto fantasma, simetría | Zoom 200 % | Sí |
| 4 | Limpio sin suciedad | Mirar | Sí |
| 5 | Azul y un solo acento (naranja **o** lima) integrados naturalmente en la composición; ningún objeto de color obligatorio ni cuota rígida de píxeles | Mirar + `metricas.cjs` como apoyo | Sí |
| 6 | Sin grade; b* sombras −3 a +3; quemado/aplastado en rango | `metricas.cjs` | Revisar |
| 7 | Lecho desenfocado, tono declarado, transición gradual (≥ 5 % del alto) | `medir.mjs` + zoom | Sí |
| 8 | Logo ≥ 4,5:1, 15 % de ancho, no parece sello | `componer.mjs` | Sí |
| 9 | Sin marcas de terceros ni inscripciones (cámaras, botellas, autos) | Zoom | Sí |
| 10 | Sin categoría de un cliente real ni insinuación de trabajo con él | Leer la escena | Sí |
| 11 | Identidad de Julio/Nexa y emblema del polo letra por letra | Zoom junto a la referencia | Sí |
| 12 | Nadie mira a cámara (salvo decisión explícita) | Mirar | Revisar |
| 13 | La serie varía cómo integra los colores; no repite utilería ni paneles por inercia | Hoja de contacto | Revisar |
| 14 | Funciona a 390 px de ancho | Reducir y mirar | Revisar |
| 15 | Para publicar: ¿necesita equipo real? (casting de IA = stock premium) | Criterio | Revisar **[criterio]** |

---

## 9. Costos por operación

| Operación | Costo aprox. | Fuente |
|---|---|---|
| Flare o Sunburst, `high`, 1152×1440 | ≈ USD 0,05 por imagen (1669 tokens de salida) | [medido] |
| `xhigh`, 1152×1440 | ≈ USD 0,09 | [medido] |
| Edición con `--image` / `--mask` | ≈ USD 0,07–0,10 (suma tokens de entrada) | [medido] |
| Sesión completa del 2026-09-19 | ≈ USD 6–7 en ~95 imágenes | [medido] |
| `medir.mjs`, `metricas.cjs`, `componer.mjs` | USD 0 (local) | — |

---

## 10. Trampas conocidas (gotchas)

| Trampa | Síntoma | Solución |
|---|---|---|
| zsh no divide variables | `R="--image a --image b"; pnpm ai:image $R …` pasa un solo argumento; 8 llamadas fallaron (sin costo) | `pnpm ai:image ${=R} …` |
| Glob sin coincidencias en zsh | `cp rondas/*/*-final.png dest/` aborta el comando entero si un patrón no calza | `setopt nullglob` antes de copiar con globs |
| `--batch` ignoraba `--out` | Imágenes caían en `public/images/generated` (dentro del repo) | Corregido en `5946f14a0`: `--out` sin extensión = directorio del lote; con extensión de imagen aborta antes de gastar |
| Máscara de 3 canales | Edición desalineada | `extractChannel(0)` (§6.2) |
| Máscara rectangular | Persona delante de la pantalla sale fantasma | Máscara desde el chroma |
| Marcas de terceros | Cámara con «Blackmagic»; quedó una inscripción diminuta en I6b | «completely unbranded, generic … (no brand names, no text, no logos anywhere on the body)» + zoom |
| Lecho de tono medio | Logo sin contraste (6+ fallos, lum 139–171) | Declarar tono siempre |
| JSON a mano | Comillas rotas | `json.dump` (§4.2) |
| `componer.mjs` sin `LOGO` | Antes: logo al 20 % | Default corregido a 0,15 el 2026-09-19; `LOGO` sólo para variar |
| Medir la pieza firmada | El logo contamina las métricas | Medir el plate |

---

## 11. Estado de los scripts

| Script | Ubicación | Estado |
|---|---|---|
| `medir.mjs` | `scripts/` de la corrida | Vigente; rutas absolutas a `node_modules/sharp` del repo |
| `metricas.cjs` | Ídem | Vigente |
| `componer.mjs` | Ídem (copia de trabajo en `rondas/oficio2/`) | Vigente |
| `ui-ref.cjs`, `ui-ia.cjs` | Ídem (copias en `rondas/oficio2/`, `rondas/oficio3/`) | Vigentes como plantilla de UI de referencia |
| `firmar.mjs` | Ídem | Histórico (firma v1) |
| `efeonce-look.mjs` | Ídem | **Descartado** (grade V0) |
| Script de máscara | No persistido | Receta en §6.2 **[pendiente: persistir]** |
| Comando `pnpm` (p. ej. `pnpm brand-photo:measure`) | — | **[pendiente]**: promover a `scripts/` del repo con tests y umbrales por contexto |
