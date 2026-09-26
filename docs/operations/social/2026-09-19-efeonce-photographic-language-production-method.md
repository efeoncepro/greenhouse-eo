# Lenguaje Fotográfico Efeonce (2026-09-19): del grade navy a «El oficio a la vista»

> **Tipo de documento:** Bitácora técnica y creativa del caso
> **Versión:** 1.1
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-20 por Claude
> **Documentación relacionada:** [Lenguaje fotográfico V1](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Firma](../brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) · [Colorimetría](../brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md) · [Cámaras](../brand-photography/EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) · [Prompts y pipeline](../brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) · [Personas](../brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · [Corrida](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md)

Owner: Social Media Studio / Efeonce. Operador: Julio Reyes. Una sola sesión, 2026-09-19.
Esta bitácora cuenta **cómo se llegó**; las reglas vigentes viven en
[`docs/operations/brand-photography/`](../brand-photography/README.md). Las imágenes son locales (gitignoreadas); los
prompts verbatim y scripts están versionados en la corrida.

Convenciones: **[medido]** · **[decisión del operador]** · **[criterio]** · **[pendiente]**.

## 1. Estado final

| Tema | Estado |
|---|---|
| Dirección | **Aprobada** por el operador: «todas me gustaron». Pidió documentarla |
| Piezas | ~95 imágenes generadas en 14 rondas; ninguna publicada ni programada |
| Destacadas por el operador | N1b (ojo de pez fuerte con Nexa) y N1 (borde de mesa a ras): «son dos ángulos que podemos usar» |
| Costo | ≈ USD 6–7 en total **[medido]** (≈ USD 0,05 por imagen `high` 1152×1440; `xhigh` ≈ 0,09; ediciones ≈ 0,07–0,10). Costo por ronda: no registrado |
| Clasificación | Sistema consistente; **no** activo distintivo medido (falta prueba de reconocimiento) |
| Pendientes | Espacio para texto, 9:16 y 16:9, firma de dron, scripts a `pnpm`, prueba de reconocimiento, masters `xhigh`, equipo real, pruebas con Clawd/Codex/3D |

## 2. El encargo

> «que incluso al ver una foto y su colorimetría se pueda sentir que es un elemento o foto de la agencia»

Punto de partida técnico: una propuesta de «look» basada en un grade de color («Navy Shadow»: negros levantados y
llevados al navy de marca `#023c70`, L\* 25 a\* +5 b\* −34,7 h 278°), un bloque navy en escena y luz ámbar. Quedó en
`prompts/PROPUESTA_LENGUAJE_FOTOGRAFICO_V1.md` y el script `scripts/efeonce-look.mjs` (grade + check). Ambos quedaron
**descartados** en la ronda 1.

## 3. Rondas

### Ronda 1 — `ejemplos/`: color natural vs grade navy

| | |
|---|---|
| Qué se probó | Dos escenas (retrato de oficio, mesa de trabajo) en crudo y con el grade V0 |
| Resultado | Hojas antes/después `ej1-retrato-oficio-antes-despues.jpg`, `ej2-mesa-trabajo-antes-despues.jpg` |
| Decisión del operador | «los de la izquierda me gustan más» → color natural, sin grade. Además: «necesitamos vernos como una agencia premium basado en cómo nos vendemos» |
| Aprendizaje | La firma no puede ser un filtro. El color se resuelve en la toma (luz, material, balance), no en post |

### Ronda 2 — `asiento/`: «asiento en la mesa»

| | |
|---|---|
| Qué se probó | La firma pedida por el operador: primer plano desenfocado entre cámara y sujeto con el logo centrado. Variantes: A/A2 borde de la mesa, B respaldo de silla, C/C2 escritorio del visitante. Firma v1 con `firmar.mjs`; medición con `medir.mjs` |
| Resultado | El primer plano se puede **planear desde el prompt** sin añadir objeto. Redacción inicial: «strongly out-of-focus soft band … bottom 13%» (invitaba a banda) |
| Decisión del operador | La firma: «un leve desenfoque … el objeto NO debe ser forzado sino planeado y natural desde el inicio» |
| Aprendizaje | Nace el patrón «la foto se toma desde un lugar en el trabajo». Se mide el lecho con Sobel antes de firmar |

### Ronda 3 — `territorios/`: galería, claroscuro, set tonal

| | |
|---|---|
| Qué se probó | T1/T1b galería, T2 claroscuro («sombra»), T3 set tonal verde |
| Resultado | T3 sereno y limpio. Métricas de referencia de T3 **[medido]**: L media 18, p99 81, 0% quemado, contraste 53, C\* p95 19, dispersión de tono 23°, b\* altas +11,4, sombras +1,7 |
| Decisión del operador | Le gustó T3 y la limpieza y color de los sets y oficinas de podcasts de marketing de EE. UU. Quiere premium, sofisticada, moderna, «agencia A1 de clase mundial» |
| Aprendizaje | T3 queda como referencia de serenidad (contraste 53), no de impacto |

### Ronda 4 — `paleta/`: tinta, podcast, claro

| | |
|---|---|
| Qué se probó | P1 sala tinta, P2 set de podcast, P3 sala clara, firmadas |
| Resultado **[medido]** | El azul de P1/P2 salió **más oscuro** que el tinta pedido (L 7–8 contra 16,6), C/L 1,95. Un HEX en el prompt se interpreta laxo (ΔE 15–19). Las lámparas prácticas encendidas de P2 subieron b\* de altas luces a +20 y el cuadro se leyó como podcast-stock |
| Decisión del operador | «la colorimetría no es vestir de navy»; preguntó por el lima y el naranja |
| Aprendizaje | Pedir color por **material** («dusty matte deep ink blue, low sheen»), no por HEX. En sets oscuros, lámparas apagadas o puntuales. Se definen roles: azul activo = la casa, naranja = la idea, lima = el resultado |

### Ronda 5 — `v2/`: grilla V2 de 9

| | |
|---|---|
| Qué se probó | Nueve piezas en dos registros (tinta y cálido) cubriendo los tres modos: equipo con uniforme (polo navy), personas sin marca, sin personas (sala vacía, bodegón), nave 3D. Re-lechos (`batch-relecho.json`), ediciones de polo (`edits-polo.json`), QA de emblemas (`qa-emblemas.jpg`) |
| Resultado | Grilla `grilla-v2.jpg`: salas tonales tinta o neutras, gente trabajando sobre papeles en mesas, logo centrado |
| Decisión del operador | «muy muy genérico, efeonce es una agencia creativa también» → **rechazada** |
| Aprendizaje | Se estaba fotografiando una consultora (mesas, papeles, reuniones). Falta una **idea** de agencia creativa, no un estilo. Navy en pared y polo se funden (ΔE 12,4 **[medido]**). Se formaliza la barra de juicio y los arquetipos a evitar (consultora, performance, creativa pura) |

### Ronda 6 — `oficio/`: «El oficio a la vista» (6 piezas)

| | |
|---|---|
| Qué se probó | La idea nueva: la obra y el oficio de cada servicio. 01 rodaje en panadería (lecho matte box), 02 corrección de color (lecho consola), 03 revisión de KV sobre mesa de luz con selección AXIS «Cliente» / «Dirección de arte», 04 AEO con cursores SEO y Nexa, 05 góndola, 06 pipeline en pantalla |
| Resultado | Hoja `oficio-a-la-vista.jpg`. FOREGROUND reescrito como «a real tool of this craft that naturally sits between the camera and the subject», 20% inferior, desenfoque gradual |
| Decisión del operador | Se sigue por esta línea. Sobre realismo: «una buena imagen de IA es la que no se siente que es IA». La primera versión anti-IA con «clutter, coffee rings, tape» se rechazó: «tanto desorden y suciedad tampoco se ve bien» |
| Aprendizaje | Nace `prompts/bloque-realismo-v2.txt`: realismo desde personas, luz y materiales, en espacios limpios. La selección AXIS funciona mejor sobre objetos grandes que sobre UI pequeña |

### Ronda 7 — `oficio2/`: rodaje macro, pipeline con pantalla curada, KV limpio

| | |
|---|---|
| Qué se probó | A rodaje macro; B pipeline en Lima/Bogotá con **pantalla curada**; C/C2 KV cenital y KV limpio |
| Resultado | Método de pantallas: plate con pantalla en chroma verde puro (#00FF00) → UI de referencia determinística (`ui-ref.cjs`) → `pnpm ai:image --image plate --image ui --mask` pidiendo integración (glare, reflejo, perspectiva, oclusión) → restaurar fuera de la pantalla desde el plate con alfa suavizado. Cuatro iteraciones del plate del pipeline (`B-pipeline-lima-v2…v4`) |
| Fallos **[medido]** | La máscara sin `extractChannel(0)` salía de 3 canales y se desalineaba: 2 intentos fallidos. Una máscara rectangular incluyó a una persona delante de la pantalla y dejó un fantasma. Balance (asociación a esta ronda inferida por las piezas Lima y KV; el inventario no la fecha): b\* de altas luces en Lima pasó de −7,2 a 0,0; el KV quemado bajó de 31,5% a 0,05% y sus altas pasaron de b\* 0,4 a +6,7 al exponer para altas luces y fijar ~5200 K |
| Decisión del operador | «Las composiciones deterministas no me gustan tanto a menos que sean referencias para pasarla al modelo y curar con IA generativa» |
| Aprendizaje | La UI determinística es **insumo**, nunca pieza final. Detección de chroma: g > 120, g > 1,4r, g > 1,4b; dilatar (blur 2 + threshold 20); alfa 0 = zona a editar |

### Ronda 8 — `oficio3/`: AEO Miami, góndola CDMX, retrato con polo, Lima sin personas

| | |
|---|---|
| Qué se probó | 1 AEO en Miami con **celular curado** (`ui-ia.cjs`), 2 góndola en CDMX, 3 retrato con polo, 4 Lima sin personas, fixes (`bfix.json`) |
| Resultado | Pipeline (Bogotá) y celular (Miami) integrados. Defecto menor: el borde inferior del teléfono se fundió con la UI. Caras tras la pasada enmascarada: delta medio 16,5 **[medido]** (poco, pero cambian) |
| Aprendizaje | La máscara no preserva píxeles: revisar identidad al zoom después de cada edición. Camisa azul en Miami = 16% del cuadro **[medido]**: azul intermedio en ropa grande no funciona |

### Ronda 9 — `camaras/`: seis cámaras

| | |
|---|---|
| Qué se probó | Ojo de pez (8 mm, grupo en la mesa), dron cenital (instalación de cuadrados azules), tilt-shift (rodaje de calle desde balcón), contrapicado 24 mm (camarógrafa, lecho maleta), reflejo en vidrio 50 mm (journey), tele 200 mm (equipo en CDMX, lecho techo de auto) |
| Resultado **[medido]** | Ojo de pez grupo 5,3:1, quemado 1,55%. Dron sin desenfoque: pavimento gris medio 3,11:1 → casi blanco 7,5:1, pero la franja se ve algo puesta. Tilt-shift 7,8–9,3:1, colorimetría cercana a T3. Contrapicado: quemado 6,5% por el tragaluz; hoodie azul 17% del cuadro. Reflejo: la más sobria (C media 5,5). Tele 200: altas +10, editorial |
| Aprendizaje | Plantilla FOREGROUND vigente («so close to the lens that it dissolves… bottom 18%… never a hard band, <TONO>»). El tilt-shift es el mejor lecho natural. El dron queda como excepción abierta |

### Ronda 10 — `impacto/`: nivel +1

| | |
|---|---|
| Qué se probó | Palancas de impacto: I1 harina en el aire con haz de sol, I2 set azul con rodillo (lecho: espalda del fotógrafo), I3/I3b marco dentro del marco, I4 escala frente a pantalla gigante, I5 retrato con persianas, I6/I6b objeto (cámara sobre plinto con papel azul). Comparación `high` vs `xhigh` |
| Resultado **[medido]** | `xhigh` cuesta 1,8× y mejora poco el detalle fino (`high-vs-xhigh.jpg`). Harina: aplastado 10,4% (clave baja, en el límite). Dispersión de tono bajó a 14–30° en 4 de 6 piezas. Set azul 52% del cuadro; pantalla gigante 18%: el azul funciona como **campo protagonista** |
| Decisión del operador | Origen: «falta un nivel más para garantizar impacto visual» |
| Aprendizaje | `prompts/bloque-impacto-v1.txt`. El impacto viene de la luz y la composición, no del modelo. Azul en dos modos legítimos: acento 3–10% o campo protagonista; nunca intermedio en ropa |

### Ronda 11 — `cruce/`: nivel +1 aplicado a piezas previas

| | |
|---|---|
| Qué se probó | X1 pipeline al atardecer (con edición y máscara), X2 góndola a contraluz, X3 reflejo dorado, X4 tilt-shift a mediodía |
| Resultado **[medido]** | Góndola a contraluz: quemado 9,6% → 1,6% corregido |
| Aprendizaje | Las palancas de impacto se pueden aplicar a cualquier servicio. Contraluz tolera quemado hasta ~2–3% |

### Ronda 12 — `palancas/`: noche, movimiento, macro, retratos

| | |
|---|---|
| Qué se probó | N1 noche (cierre de proyecto), M1 barrido en movimiento, T1 macro, R1 retrato con polo, R2 retrato CDMX |
| Resultado **[medido]** | Noche: aplastado 18,5% → 7,1% al pedir «shadows deep but always with visible texture». Barrido: los letreros quedan ilegibles (útil) |
| Aprendizaje | Regla noche. El macro de esta ronda era de pintura: entra en el sesgo detectado después |

### Ronda 13 — `curado/`: set curado 12 sin pintura

| | |
|---|---|
| Qué se probó | Selección de 12 piezas sin pintura + tres nuevas: K1 KV de café, K2/K2b retail de bebidas, K3 noche corregida |
| Resultado | `set-curado-12.jpg`. K2b: el lecho de botellas falló 2 veces con la redacción corta (p99 90 y 47 **[medido]**) hasta pedir «lens almost touching… f/1.4… no shapes, highlights, edges» |
| Decisión del operador | «nosotros NO somos Berel»: demasiadas piezas con pintura (categoría de un cliente real) |
| Aprendizaje | Variar industrias no-cliente (café, bebidas, panadería, retail, finanzas, gastronomía, eventos). Memoria `feedback_brand_photo_no_client_category_anchor.md`. Sesgo de utilería: la taza azul aparece en persianas, noche, KV café y JN1 |

### Ronda 14 — `personas/`: Julio y Nexa

| | |
|---|---|
| Qué se probó | Motor `gpt-image-2.5-sunburst` con referencias con rol y bloques IDENTITY. J1 retrato 135 mm, J2 rodaje con polo 24 mm contrapicado, J3 escenario 200 mm, N1 ojo de pez (borde de mesa a ras), N1b ojo de pez fuerte, N2 reflejo dorado, JN1 mesa 50 mm, JN2 podcast 135 mm, JN3 calle 200 mm |
| Resultado **[medido]** | Identidad de Julio sostenida en 5 tomas (135/24/200/50/200 mm), Nexa consistente (`qa-identidad.jpg`). N1: 3,70:1 (tono medio del lecho, falló). N1b: 6,16:1. El emblema del polo salió cercano al kit |
| Fallos | 8 llamadas fallaron (sin costo) porque zsh no separaba los `--image` de una variable: se usa `${=R}` |
| Decisión del operador | Aprobó todo; «son dos ángulos que podemos usar» (N1b y N1) |
| Aprendizaje | La identidad se sostiene entre lentes muy distintos con 2–3 referencias y bloque IDENTITY. Paneles azules grandes de fondo se repiten entre escenario y podcast: variar |


### Rondas finales (tras documentar): personas 2 y mascotas / 3D

- **Personas ronda 2** (`rondas/personas2/`): J4 asiento a ras 16 mm, J5 respaldo 85 mm, N3 barrido Lima, N4 escala
  Bogotá, JN4 ojo de pez desde el borde, JN5 noche. N4 necesitó 3 intentos: el concreto pulido quedó de tono medio
  (2,99:1) y con reflejos (2,73:1, lecho p99 26); se resolvió con un banco bajo oscuro de galería (15,4:1).
- **Mascotas y 3D** (`rondas/mascotas/`): Julio con Clawd y Codex en el escritorio, Nexa con Codex en el vidrio, los
  cuatro en ojo de pez, Julio y Nexa bajo el logo 3D en muro de piedra (sin firma), Nexa sosteniendo la nave (sin
  firma). QA de marca en `rondas/mascotas/qa-marca-mascotas.jpg`: mascotas fieles al kit; nave con órbita y tres
  ventanas; logo 3D cercano, a revisar letra por letra.
- Costo ≈ USD 0,90 (13 imágenes Sunburst high). Todo en OneDrive `referencias/06-…` y `07-…`; el archivo completo de
  las 16 rondas (243 imágenes) en `archivo-todas-las-pruebas/`.

### Espacio para texto y formatos nativos

- 3 escenas × 4:5/9:16/16:9 con titular de prueba. v1: la zona «calma» sin tono dio 1,3–4,3:1 y cabezas dentro de la zona. v2: tono declarado + límite de cabezas + autoajuste del compositor → 9/9 pasan (titular 5,7–15,2:1, firma 5,4–20,3:1). 16:9 es el formato que mejor reserva espacio. Detalle en [espacio para texto y formatos](../brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md).

## 4. Fallos y correcciones con números

| Fallo | Número | Corrección |
|---|---|---|
| Logo sin contraste sobre madera de tono medio | 6+ piezas, luminancia media 139–171; N1 3,70:1 | Declarar el tono del lecho en el prompt (N1b 6,16:1) |
| Lecho de botellas/latas nítido | p99 90 y 47 | «almost touching, f/1.4, no edges» |
| Transición del lecho como banda | Cortes de 1–3% del alto | Transición ≥ 5% del alto; «never a hard band» |
| Logo leído como sello | Ancho 20% | Ancho 15% |
| Quemado en contraluz | 9,6% | 1,6% |
| Sombras aplastadas de noche | 18,5% | 7,1% |
| KV quemado | 31,5% | 0,05% |
| Altas luces frías en Lima | b\* −7,2 | 0,0 |
| Azul por HEX | ΔE 15–19; L 7–8 vs 16,6 | Pedir por material |
| Lámparas prácticas | b\* altas +20 | Apagadas o puntuales en sets oscuros |
| Máscara desalineada | 2 intentos | `extractChannel(0)` |
| Fantasma por máscara rectangular | 1 pieza | Máscara por chroma, no rectángulo |
| Dron sin lecho | 3,11:1 | Pavimento casi blanco 7,5:1; decisión pendiente |
| Batch que ignoraba `--out` | — | Corregido en el CLI (commit `5946f14a0`): `--out <dir>` sin extensión es directorio; con extensión aborta |
| Glob sin match en zsh | Aborta el comando entero | `setopt nullglob` |

## 5. Sesgos detectados

| Sesgo | Cómo se detectó | Regla |
|---|---|---|
| Anclar la serie en la categoría de un cliente (pintura = Berel) | Operador | Industrias no-cliente; nunca insinuar trabajo con un cliente real |
| Etiqueta con nombre de cliente | Revisión («Berel» en un cursor) | Etiqueta «Cliente» |
| Misma taza azul | Revisión de la grilla | Variar el objeto de acento |
| Marcas de terceros en objetos | Zoom (cámara tipo «Blackmagic») | «completely unbranded, no brand names» + QA; quedó una inscripción diminuta |
| Paneles azules de fondo repetidos | Revisión de escenario y podcast | Variar |
| Casting de modelo | Subagente adversarial | Caras con carácter; equipo real para publicar |
| Acento de utilería (jarrón, libro naranja) | Revisión | El acento nace de la situación |

## 6. Método de trabajo que quedó

Ficha de toma → prompt (realismo + impacto + color + escena + FOREGROUND) → `pnpm ai:image --batch <json> --out <dir>
--model gpt-image-2.5-flare --quality high --size 1152x1440` (Sunburst con identidad o edición) → hoja de contacto →
`medir.mjs` en el lecho → regenerar si p99 > ~20 o tono medio → pantallas por curación → `componer.mjs` con
`LOGO=0.15` → `metricas.cjs` → QA al zoom (identidad, emblema, marcas, texto) → grilla. Los batch JSON se construyen
con Python `json.dump` para no romper comillas. Detalle en
[Prompts y pipeline](../brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

## 7. Qué sigue

- Pruebas con Clawd, Codex, logo y nave 3D junto a Julio y Nexa (en curso tras esta documentación).
- Espacio para texto (pedido explícito, no trabajado).
- 9:16 y 16:9 nativos; firma de dron; scripts a `pnpm`; masters `xhigh` con limpieza; sesión con equipo real;
  prueba de reconocimiento (n ≥ 100, distractores coherentes, antes/después).

## Delta 2026-09-20 — El prompt deja de armarse a mano, las reservas llegan a seis y la calma se mide en L\*

El 19 quedaron las reglas; el 20 quedó el **taller**. Esta ronda no buscó imágenes bonitas: buscó que la regla dejara
de depender de que alguien la recordara al pegar bloques. Marcas de esta sección: **[medido]** ·
**[decisión del operador]** · **[pendiente]** · **[refutado]**.

### 1. Tres comandos, y el defecto que los justifica

El prompt se armaba concatenando bloques a mano. Por esa vía **«Vertical 4:5.» vivió dentro del bloque de realismo
compartido** y «bottom 18%» dentro de la plantilla del lecho: un valor de UN formato metido en un bloque que usan
TODOS, sin que nadie lo viera. La regla nueva es corta: **nunca armar un prompt de foto de marca concatenando bloques a
mano**.

| Comando | Qué hace | Notas duras |
|---|---|---|
| `pnpm foto:doctor` | ¿Esta máquina puede generar? Seis chequeos que **ejercitan la cadena**: bloques presentes y sin contaminar · sharp · ADC de gcloud (pide un token real) · referencia al secreto · el secreto resolviendo · la clave aceptada por OpenAI vía `/v1/models` (**sin costo**) | La clave nunca se imprime. Sale 1 si algo bloquea. Verificado en los dos sentidos: con ADC vencida señaló el comando exacto, tras renovarla pasaron los seis, y quitando un bloque sale 1 |
| `pnpm foto:prompt <ficha.json> [--batch <out>]` | Arma el prompt desde una ficha de toma. El formato, el % del lecho y el límite de sujetos salen de **UNA tabla** | `--ficha-ejemplo` imprime la plantilla; el comando imprime el `ai:image` exacto con su `--size` |
| `pnpm foto:validar <plate.png> [--zona-texto] [--objeto x0,y0,x1,y1] [--padding-x/-y]` | Valida las **seis** reservas sobre el plate limpio. Sale 1 si una reserva **evaluada** falla | `--zona-texto` y `--objeto` son **opt-in**. Coordenadas en **fracciones** (0–1), nunca en píxeles |

27 tests en `scripts/foto/build-prompt.test.ts` cubren las guardas: bloque compartido con un valor de formato adentro ·
reserva pedida en una toma que no la admite · batch que mezcla formatos · falta el lecho o la escena · **materia de la
superficie ausente o genérica** («a wall», «the surface»). Los bloques pasaron a vivir en `scripts/foto/bloques/`, no
en una carpeta de corrida fechada.

`foto:prompt` y `foto:validar` **no necesitan credencial**: se puede preparar y validar una tanda entera sin acceso. Lo
único que no viaja con el repo es `.env.local` con `OPENAI_API_KEY_SECRET_REF="greenhouse-openai-api-key"` (el
**nombre** del secreto, nunca la clave cruda) y las ADC de gcloud vigentes
(`pnpm gcloud:auth:playwright -- --force`).

### 2. Las reservas pasan de cuatro a seis

Canon: [`EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md`](../brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md).
Zona de texto · objeto para enmarcar · lecho de la firma · aire para cursores · **campo profundo al margen** ·
**lecho por formato**.

- **Lecho por formato [medido]:** 4:5 **18%** · 9:16 **22%** · 16:9 **16%** · 1:1 **18%** *(sin validar)*. Deja de ser
  un 18% heredado de un solo formato.
- **Objeto para enmarcar:** campo oscuro y parejo en los **cuatro** lados; trazo `#a6cdf5` ≥ **3:1** por lado.
- **Campo profundo al margen:** banda vertical, tono declarado, continua **hasta ≥ 0,40 del alto**.
- Bloques de prompt nuevos: **§3.8.1 SELECTION TARGET** y **§3.8.2 MARGIN FIELD**, ambos `[sin validar]` al nacer.

### 3. Piloto de reservas (3 plates, USD 0,142)

Carpeta: `ai-generations/2026-09-20_piloto-reservas/` · OneDrive
`13- Branding/Lenguaje Fotografico Efeonce/v01/referencias/11-piloto-reservas-2026-09-20/`.

- **MARGIN FIELD pasa** en 4:5 y en 16:9 nativo, con **banda continua hasta 0,60** del alto. El caso aprobado
  «¿Claude o Codex?» daba 0,35 simplemente porque nadie se lo había pedido **[medido]**.
- **SELECTION TARGET sirve con padding, y hay punto dulce, no monotonía [medido]:** 0,00 → 1,02:1 ✗ ·
  **0,02 → 3,29:1 ✓** · 0,04 → 2,83:1 ✗. Con 0 falla porque el objeto trae su propio borde claro; con 0,04 la caja
  toca a las personas. Subir el padding no mejora el contraste de forma monótona: hay que buscar el punto.

### 4. El umbral de calma se mide en L\*, no en luminancia lineal **[medido]**

La luminancia lineal no es perceptual: la misma textura salta ~15× más arriba de la escala que abajo, así que un umbral
en Y **premia la oscuridad**. Medido en los dos extremos: la **«losa» que el operador rechazó pasaba con 12× de
margen** mientras un muro pálido liso reprobaba. `CALMA_MAX = 0.5` sale de ahí — pasa 0,18–0,29, reprueba 0,89–2,44.

El alcance hay que decirlo honesto: **`CALMA_MAX` mide calma, NO detecta la losa** — una losa *es* calma. Las tres
métricas (planitud, canto, calma) no distinguen la versión rechazada de la buena, porque la diferencia es **semántica**.
El detector real está en la **entrada**: la guarda de materia de `foto:prompt`.

El lecho, en cambio, **se queda en Y y es señal débil `[frágil]`**: en L\* el lecho no disuelto es indistinguible de los
disueltos, y en Y separa por 20%, que es ruido. Medir desenfoque bien queda **[pendiente]**.

### 5. Una regla que se retiró **[refutado]**

§3.8.3 afirmaba, con etiqueta **[medido]**, que el lecho falla cuando el verbatim no pone nada cerca del lente. No se
sostiene: el prompt de la corrida que supuestamente no la llevaba **nunca se versionó**, todos los prompts de esa toma
que sí sobreviven la llevan, y las dos franjas miden estadísticamente igual. Lo que separaba los números era el
**formato**. El comando sigue emitiendo la frase, pero como **precaución declarada**, nunca como evidencia de causa.

### 6. El tono nunca fue el problema: la materia lo es **[decisión del operador, 2026-09-20]**

> «No, no todo tiene que ser claro; de hecho faltaba probar los oscuros. El tema era que el modelo estaba poniendo un
> objeto sin sentido para lograrlo.»

Una reserva **oscura está perfecta** cuando la superficie oscura existe de verdad y **tiene nombre**. Lo prohibido es la
reserva **sin materia**, en cualquier tono. Decidir el tono por regla global —clara u oscura— es el error, y es el que
casi se codifica al leer los rechazos como un problema de luminancia.

### 7. Qué queda abierto

- **Aprobado:** el lenguaje fotográfico y las reglas de reserva **de la toma**.
- **NO aprobado:** la **capa de composición gráfica** sobre la foto (tipografía, jerarquía, cursores). Su canon es
  `efeonce-advertising-creative`, no los ejemplos de la carpeta de fotografía.
- **Abierto [pendiente — operador]:** sólo la **reserva 2** (perímetro oscuro de la caja contra lecho claro de la firma).
- Otros pendientes: 1:1 con lecho medido · firma en tomas sin desenfoque (dron, `url-lum`) · masters `xhigh` · prueba
  de reconocimiento (n ≥ 100) · sesión Run & Gun con el equipo real.
