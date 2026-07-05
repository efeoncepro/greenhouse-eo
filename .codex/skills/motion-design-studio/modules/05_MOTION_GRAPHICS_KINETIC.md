# 05 · Motion graphics, tipografía kinética y title sequences

> **Qué resuelve este módulo.** El motion **sin cámara real**: formas, texto y logos que se animan
> como lenguaje propio. Cubre **mograph** (animación de formas, transformaciones, transiciones,
> datos en movimiento), **tipografía kinética** (cuando el texto *es* la animación), **animación de
> logo** (identidad que cobra vida) y **title sequences** (openers cinematográficos que se volvieron
> parte de la identidad de marca en 2026). Aquí manda el craft de After Effects; la IA entra solo por
> las **puertas correctas** (plates y partículas de fondo, no el texto).

**Doctrina del módulo:** el mograph fino y la tipografía kinética se **autoran a mano** (AE) porque
dependen de timing al frame, kerning en movimiento y easing preciso — cosas donde la IA todavía
deriva (as-of 2026-07 — reverificar). La IA es brillante para el **detrás**: humo, polvo, luz
volumétrica, texturas orgánicas, plates cinematográficos sobre los que el texto vive.

---

## 1. Motion graphics (mograph) — el vocabulario

Mograph es animar **elementos gráficos** (formas, íconos, líneas, máscaras, datos) con intención.
Las tres familias de movimiento:

| Familia | Qué anima | Uso típico |
|---|---|---|
| **Transformación** | posición, escala, rotación, opacidad, anchor | entradas/salidas, énfasis, construcción |
| **Forma/path** | trim paths, morphing, stroke, fill, path draw | líneas que se dibujan, íconos que se construyen |
| **Transición** | wipe, mask reveal, shape-to-shape, dip-to-color | pasar de una escena/dato a otro |

**Principios que separan mograph pro de plantilla** (detalle en `modules/01` y `02`):

- **Todo entra y sale con easing**, nunca lineal. La curva por defecto es un ease-out asimétrico
  (rápido al entrar, freno suave). Lineal = amateur.
- **Secondary action + follow-through.** Cuando una forma para, algo secundario sigue un frame
  (overshoot leve, settle). Es lo que le da "peso" al gráfico.
- **Stagger.** Elementos que aparecen en cascada (2-4 frames de offset), no todos de golpe.
- **Anchor points correctos.** Escalar desde el centro vs. desde una esquina cambia todo el gesto.
- **Continuidad de movimiento.** El elemento sale de un plano en la dirección en que entra al
  siguiente — el ojo no se reinicia.

### Data-in-motion (animación de datos)

Los números que se animan cuentan mejor que los estáticos. Reglas:

- **Anima el cambio, no el chart.** Una barra que crece, un contador que sube, una línea que se
  dibuja — el movimiento *es* el dato apareciendo. Evita animar decoración sin significado.
- **El número final debe ser legible y quedarse quieto.** El count-up termina en un valor estable y
  con **tabular numerals** (ver `typography-design`) para que no baile el ancho.
- **Ritmo con la narración/música.** El pico del dato cae en el beat. Un KPI que sube tiene que
  *aterrizar* en el acento musical.
- **Un dato por beat.** No amontones 5 métricas simultáneas: es motion, no dashboard. Para viz de
  datos de producto (UI, no cine) → `dataviz-design`.

## 2. Tipografía kinética — el texto ES la animación

Kinetic type es cuando el mensaje se transmite por **cómo se mueve el texto**, sin depender de
personaje ni de cámara. Es una de las apuestas fuertes de 2026: empuja marca y mensaje con
mínimos recursos y máximo impacto (as-of 2026-07 — reverificar la vigencia estética; el *craft* es
estable).

**Las técnicas (el kit):**

| Técnica | Qué hace | Cuándo |
|---|---|---|
| **Reveal (mask)** | el texto aparece tras una máscara que se corre | entradas limpias, editoriales |
| **Scale/pop** | palabra que crece al acento | énfasis, ritmo con beat |
| **Track / spacing** | el letter-spacing se abre o cierra en movimiento | tensión, respiración, lujo |
| **Character animation** | letra por letra (typewriter, cascada, jitter) | textura, humano, imperfecto |
| **Kern-in-motion** | el kerning se ajusta mientras entra | pulcritud tipográfica pro |
| **Path type** | texto que corre sobre una trayectoria | dinamismo, dirección |
| **Word swap / replace** | una palabra reemplaza a otra en el mismo lugar | contraste de mensaje |

**Reglas pro de tipografía kinética:**

- **Legibilidad primero.** Si no se lee, no es tipografía — es ruido. El texto tiene que ser legible
  el tiempo suficiente para leerse *a velocidad de lectura*, no de reflejo. Regla práctica: mínimo
  ~0.3s por palabra corta en pantalla, más si es clave.
- **Una idea por pantalla.** No metas párrafos; kinetic type vive de frases cortas, una por beat.
- **El movimiento sirve al sentido.** "Caída" cae, "explosión" estalla, "crece" escala. El gesto
  refuerza la palabra; si es decorativo y contradice el sentido, distrae.
- **Ritmo con audio.** El texto entra/sale en los acentos (ver módulo 07 sobre sync). Kinetic type
  sin sound design es la mitad de la pieza.
- **Jerarquía tipográfica en movimiento.** Peso, tamaño y timing marcan qué palabra manda. La
  palabra clave llega distinto (más grande, más tarde, con más freno). Craft fino → `typography-design`.

### 🔑 Regla pro de producción (la más importante del módulo)

> **Autora la tipografía en After Effects; usa IA solo para los plates/partículas de fondo detrás
> del texto.** Los modelos de video IA **no controlan el texto al frame** — deforman letras, rompen
> kerning, "alucinan" glifos y no respetan la tipografía de marca (as-of 2026-07 — reverificar; es
> la debilidad más persistente del video IA). El texto es craft humano: se autora con la fuente real,
> kerning real, easing real. La IA genera el **detrás vivo** — humo que se mueve, polvo en un haz,
> luz volumétrica, textura orgánica, un plate cinematográfico — y el texto se **compone encima** en
> AE. Esa división (texto humano + fondo IA) es la que hace kinetic type de nivel broadcast hoy.

## 3. Animación de logo — la identidad que cobra vida

Un logo estático se vuelve **firma en movimiento**. La tendencia 2026 es **identidad kinética**: la
marca no tiene *un* logo animado, tiene un **sistema de comportamiento** (cómo entra, cómo respira,
cómo sale) reutilizable en intros, stingers, bumpers y cierres.

**Cómo un logo cobra vida — patrones:**

- **Construcción (build-on).** El logo se dibuja/ensambla a partir de sus partes (trim paths, mask
  reveal, pieza por pieza). Cuenta el logo como proceso.
- **Reveal.** Aparece desde luz, humo, un wipe o un rack focus. Cinematográfico, de marca premium.
- **Signature loop / idle.** Un micro-movimiento vivo (respiración, brillo que recorre) para loops y
  esperas — la marca "está viva" sin gritar.
- **Morph/transición.** El logo se transforma desde/hacia otro elemento (ícono → logotipo, producto
  → marca). Une escena con identidad.
- **Sting de salida.** El cierre corto (0.5-1.5s) con sonido de marca (sonic logo, módulo 07) — lo
  que la gente recuerda.

**Reglas de logo animation:**

- **Respeta el logo final estático.** La animación termina en el lockup exacto de marca (proporción,
  color, aire). No dejes el logo "a medio construir" ni deformado. SSOT de marca → `efeonce/EFEONCE_OVERLAY.md`.
- **Corto y con firma.** Un opener de logo son segundos, no una película. La firma es reconocible en
  <2s.
- **Sonido y movimiento nacen juntos.** El sting visual y el sonic logo se diseñan como una sola cosa.
- **Consistencia de sistema.** El comportamiento del logo es el mismo en todos los canales — es
  identidad, no un efecto suelto.

## 4. Title sequences — el opener como identidad de marca

En 2026 el **title sequence** dejó de ser exclusivo del cine: marcas, productos y series de contenido
abren con openers cinematográficos que **son parte de la identidad**. Es la carta de presentación con
más carga estética de una pieza.

**El lenguaje del title sequence cinematográfico 2026** (as-of 2026-07 — reverificar la moda;
los ingredientes son craft estable):

| Ingrediente | Cómo se usa |
|---|---|
| **Tipografía film** | tipos de peso alto, tratamiento cinematográfico (serif de display, condensadas, grabadas), no la fuente de UI |
| **Cámara lenta** | movimientos de cámara lentos y deliberados, slow-motion sobre detalle |
| **Sombras profundas** | contraste alto, negros ricos, iluminación dramática de un solo foco |
| **Flares y luz** | destellos de lente, haces volumétricos, luz que atraviesa |
| **Humo, polvo, partículas** | atmósfera orgánica que da textura y profundidad al aire |
| **Sound design** | swells, subgraves, risers, silencios; el sonido *es* la mitad del opener (módulo 07) |
| **Ritmo tipográfico** | los títulos entran/salen con timing musical, no todos iguales |

**Anatomía de un opener (estructura típica):**

```
Negro + sonido ──► primer título (mood) ──► construcción atmosférica (planos de textura)
──► pico: el nombre/marca (el momento) ──► resolución + entrada al contenido
```

**Reglas de title sequence:**

- **El opener promete el tono de todo lo que viene.** Si el contenido no cumple lo que el opener
  promete, decepciona. Diseña el opener al tono real de la pieza.
- **Menos títulos, más peso.** Cada tarjeta de título respira; no amontones créditos como lista.
- **Texto humano, atmósfera IA.** Igual que kinetic type: la tipografía se autora en AE; el humo,
  polvo, luz y plates pueden venir de IA (módulo 09) y componerse detrás.
- **Sound design no es opcional.** Un opener sin diseño sonoro es maqueta. Diseña imagen y sonido
  juntos desde el storyboard (módulo 04 + 07).

## 5. Cómo se produce (las dos manos, por pieza)

| Pieza | Mano principal | IA entra en… |
|---|---|---|
| Mograph / data-in-motion | After Effects (humano) | plates de fondo, texturas |
| Tipografía kinética | After Effects (humano) | plates/partículas detrás del texto |
| Animación de logo | AE / Blender (humano) | fondo, reveal atmosférico |
| Title sequence | AE (texto) + comp | humo, polvo, luz, plates cinematográficos (i2v, módulo 09) |

El puente humano↔IA (cuándo cada mano, gasto gobernado, handoff con spec) vive en
`modules/10_PRODUCTION_STUDIO.md`. La producción concreta del video IA de fondo → `modules/09` +
`higgsfield-*`.

---

## Reglas duras del módulo

- **NUNCA** dejes que la IA anime el texto de una pieza de marca: deriva, rompe kerning y alucina
  glifos. Texto = After Effects; IA = plates/partículas de fondo.
- **NUNCA** animes con easing lineal ni con todo entrando de golpe (usa easing + stagger).
- **NUNCA** sacrifiques legibilidad por efecto: si el texto no se lee a velocidad de lectura, sobra.
- **NUNCA** dejes el logo deformado o "a medio construir" al final — cierra en el lockup exacto de marca.
- **NUNCA** entregues un title sequence sin sound design: es la mitad de la pieza.
- **SIEMPRE** haz que el movimiento sirva al sentido de la palabra/dato, no lo contradiga.
- **SIEMPRE** diseña logo/opener con su sonido desde el storyboard, no lo pegues después.
- **SIEMPRE** trata la identidad kinética como sistema de comportamiento, no como efecto suelto.

**Delega:** craft fino de tipo (peso, kerning, escala, numerales) → `typography-design`; viz de datos
de producto/UI → `dataviz-design`; producción del plate IA → `modules/09` + `higgsfield-*`; sonido y
sync → `modules/07`; cierre en `templates/kinetic-type-spec.md`.
