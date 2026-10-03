# Greenhouse — Video de producto e interfaces con personas V1 (anexo de la taxonomía)

> **Tipo de documento:** Referencia técnica agent-facing (anexo de clasificación)
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude (sesión «Clasificación de producción de video con IA»)
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Taxonomía madre:** [GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md](GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) (este anexo
> profundiza los tipos `producto`, `demo-ui` e `hibrido` y la §3.15)
> **Datos medidos (precios, estado por motor):** [guía de selección](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) §4.3 y §7.4
> **Programa:** [EPIC-051](../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md) — TASK-1987 (producto físico compuesto)
> y TASK-1988 (kit propio de motion de UI y sincronía por acción)

---

## 0. Por qué un anexo

Es el género que más vamos a producir: **personas usando un producto, sobre todo un producto digital** (una app, un
portal, un asistente de IA, un SaaS). Concentra los tres ejes de dificultad más caros —manos y rostros (R),
interacción (I) y exactitud (E)— y tiene un problema que ningún otro tipo tiene: **sincronizar el gesto de una persona
con el cambio de una interfaz**. Necesita vocabulario propio para que una pieza se planifique por planos y no por
prompts.

Lo que este anexo **no** hace: no mide motores ni lleva precios (guía), no diseña la UI (`greenhouse-ux`,
`modern-ui`) y no reemplaza el método de producción.

Etiquetas: `[verificado]` corrida nuestra · `[decisión]` decisión del operador · `[criterio]` oficio, no medido ·
`[sin dato]`.

## 1. Dos reglas del operador que mandan sobre todo el anexo

1. **Pantalla dentro de una escena generada: la renderiza el modelo** `[decisión, 2026-09-11]`. El reemplazo de
   pantalla (green screen + texto determinístico por cuadro) no recibe la luz, los reflejos ni el movimiento del
   render y se ve pegado. Se protege con **pantallas «video-safe»** (pocas frases grandes, sin URLs ni letra chica),
   cada una como referencia de imagen. **Texto y marca exactos van fuera del dispositivo**, como overlay, o en un
   **inserto a pantalla completa**.
2. **Propio primero, proveedor como puente** `[decisión, 2026-10-03]`: toda la UI exacta sale de nuestras
   herramientas (captura, render en código); el proveedor pone las personas, el mundo y la luz.

**Consecuencia para producto físico:** el mismo argumento de la regla 1 vale para un producto compuesto sobre una toma
generada. Componerlo exacto conserva la forma y la marca, pero **sin un pase de integración (luz, reflejos, desenfoque
de movimiento) se ve pegado**. Por eso TASK-1987 exige ese pase y su canario compara contra el i2v nativo con el
criterio «¿se ve pegado?».

## 2. Producto físico

### 2.1 Técnicas por fidelidad del producto

| Técnica | Producto | Movimiento posible | Costo | Cuándo |
|---|---|---|---|---|
| Grabar el producto real (`capture.real`) | exacto | todo | rodaje | si existe el producto físico, casi siempre gana |
| 3D del producto (Blender, render determinístico) | exacto, con luz del render | todo, controlado | 0 créditos; modelo 3D + tiempo | rígido con modelo 3D; packshot premium |
| Producto compuesto cuadro a cuadro sobre plate (TASK-1987) | exacto | cuerpo rígido | bajo (a construir) | mundo generado + producto real, **con pase de integración** |
| Cámara sola sobre escena congelada (`h3max-camera`) | alto | sólo cámara | muy bajo | packshot de estudio |
| Still aprobado → i2v | medio: deforma texto y logo | libre | medio | ambiente; marca compuesta después |
| Sustituto + reemplazo (Genjutsu) | sin garantía | libre | créditos | variantes rápidas; puente |

### 2.2 La naturaleza del producto cambia la técnica

| Naturaleza | Ejemplo | Técnica preferida | Trampa |
|---|---|---|---|
| rígido simple | lata, botella, celular apagado | track planar o 3D + composición, o 3D completo | reflejos especulares delatan la composición |
| deformable | prenda, bolsa, comida | kit de la prenda puesta + generativo + `foto:emblema` cuadro a cuadro | no hay track rígido posible |
| con pantalla | celular encendido, laptop | regla 1: pantalla nativa «video-safe» + inserto | ver §3 |
| que se aplica o se vierte | pintura, crema, bebida servida | envase exacto (compuesto o 3D) + líquido generativo en capa aparte | la física (F = 3) es la falla principal |
| grande o lejano | avión, vehículo, edificio | renders oficiales como referencia + trabajo de cámara | proporciones y livery (caso SKY) |

### 2.3 Gestos con producto físico

| Gesto | R I F E | Banda | Técnica |
|---|---|---|---|
| sostener quieto («hero hold») | 2 2 0 2 | media | still con la mano ya agarrando + movimiento mínimo, o mano generada + producto compuesto |
| tocar, presionar | 3 2 0 3 | alta | partir: plano de mano + inserto del producto (lección Glitch: el still debe ser el estado inicial del gesto) |
| abrir, desempacar | 3 3 1 3 | alta/extrema | partir en tres tomas con insertos exactos |
| aplicar, verter, servir | 2 2 3 2 | alta | envase exacto + líquido generativo |
| ponerse, vestir | 2 3 1 2 | alta | kit de prenda puesta + i2v; marca tapada por la mano = vista de oclusión del kit |
| entregar entre personas | 3 3 0 2 + dos identidades | extrema | partir siempre |

## 3. Producto digital con personas

### 3.1 Clase de interfaz (decide de dónde sale la UI y qué derechos aplican)

| Clase | Ejemplo | Fuente de la UI | Regla |
|---|---|---|---|
| `ui-real-propia` | Greenhouse, Globe, Think | `pnpm fe:capture` (grabación real con sesión de agente) o render en código | datos de ejemplo de un tenant sandbox; nunca datos de clientes |
| `ui-real-cliente` | la app de un cliente | captura entregada por el cliente o grabada con su acceso | exacta; datos ficticios; aprobación del cliente |
| `ui-prototipo` | Figma de un producto en diseño | render en código desde el diseño (HTML + Playwright) | exacta respecto del prototipo aprobado |
| `ui-conceptual` | interfaz ficticia de campaña | generativa en exploración; el texto legible final sale de código | nunca prometer que es un producto real |
| `ui-terceros` | ChatGPT, Gemini, Google, Instagram | recreaciones gobernadas de AXIS (recursos AEO), nunca capturas | revisión de derechos de marca de terceros |

### 3.2 Dispositivos y superficies

| Superficie | Interacción típica | Qué cambia |
|---|---|---|
| teléfono | tap, swipe, scroll, pinch con el pulgar | pantalla chica en cuadro: casi nunca legible en un plano medio → inserto obligatorio para leer |
| laptop o escritorio | teclado, trackpad, mouse | pantalla legible en over-the-shoulder; tecleo = manos en movimiento repetitivo (R alto) |
| tablet | tap con dedo o lápiz | mixto |
| pantalla pública o kiosko | tap de pie, mirada | escala humana; reflejos del ambiente |
| reloj | mirada, tap mínimo | casi todo se resuelve con inserto |
| voz o asistente sin pantalla | hablar, escuchar | la UI es audio + respuesta visual flotante; lipsync (H12) |
| auto (infotainment) | tap y voz | movimiento del vehículo, reflejos |
| AR / interfaz en el espacio | gestos al aire | la UI flotante **es** el plano; se compone |

### 3.3 Gramática de planos (P1–P10)

Cada pieza del género se planifica como una secuencia de estos planos. La UI legible vive en P6, P7, P8 y P10; los
demás llevan personas, contexto y emoción.

| Plano | Qué muestra | Técnica | UI legible | R I E típicos | Camino |
|---|---|---|---|---|---|
| **P1** reacción | persona sin pantalla visible: emoción, alivio, sorpresa | generativo | — | 2 1 0 | proveedor (persona) |
| **P2** contexto | persona con el dispositivo; pantalla no legible | generativo con pantalla nativa «video-safe» | no | 2 2 1 | proveedor |
| **P3** por encima del hombro | pantalla visible detrás de la persona | pantalla nativa «video-safe» o desenfocada | aproximada | 1 2 3 | proveedor; la lectura va en P6 |
| **P4** POV | manos y pantalla desde los ojos del usuario | generativo; pantalla nativa | aproximada | 3 2 3 | proveedor; alta |
| **P5** macro del gesto | dedo que toca, mano en el trackpad | generativo corto | no | 3 2 1 | proveedor; empalma con P6 |
| **P6** inserto de UI | la interfaz a pantalla completa con su interacción | **propio**: captura o render, cursor/tap/zoom en código | **exacta** | 0 0 0 | propio, 0 créditos |
| **P7** UI flotante | paneles de la UI junto a la persona o en el espacio | **propio** compuesto fuera del dispositivo sobre P1/P2 | **exacta** | 2 1 0 | propio + proveedor |
| **P8** dentro de la interfaz | la persona o Nexa en un mundo hecho de la UI | composición de capas + generativo para el mundo | exacta en las capas | 2 1 2 | híbrido |
| **P9** pantalla dividida | persona a un lado, UI al otro | propio (montaje) | exacta | según P1 | propio |
| **P10** dispositivo 3D | packshot del dispositivo con la UI | **propio**: modelo 3D + UI como textura (la luz la resuelve el render) | exacta | 0 0 0 | propio |

**La regla de oro del género:** la persona pone la emoción y la acción; **la UI se lee en un plano propio**. Forzar
la lectura dentro de un plano generado (P3/P4 con letra chica) es el error más caro (caso SKY: interfaz generada
dentro del cuadro, E = 3).

### 3.4 Verbos de interacción

| Verbo | Dónde | Dificultad del plano de persona | Cómo se resuelve la UI |
|---|---|---|---|
| mirar o leer | cualquiera | baja | P6 con sostén de lectura (tiempo quieto, lección CMP-001) |
| tap | teléfono, kiosko | alta (R = 3 en macro) | P5 + P6 con el tap animado en código, empalme por acción |
| swipe o scroll | teléfono, tablet | alta | P5 + P6 con scroll determinístico (velocidad legible) |
| pinch o zoom | teléfono, tablet | alta | P6 con zoom a una zona |
| teclear | laptop, teléfono | alta (manos repetitivas) | P6 con typing en código; P5 corto o desenfocado |
| click o arrastrar | escritorio | media | P6 con cursor sintético y estados hover/press |
| hablar | asistente | alta (lipsync) | P7 con la respuesta flotante; voz aparte + lipsync o persona de espaldas |
| recibir una notificación | teléfono, reloj | media | P1 (reacción) + P6 (la notificación exacta) |
| mostrar a otro | cualquiera | extrema (dos personas + pantalla) | partir: P1 de cada persona + P6 |
| escanear (QR, cámara) | teléfono | media | P5 + P6 con el resultado |
| aprobar o firmar | cualquiera | media | P6 con el estado de confirmación |

### 3.5 Coreografía y sincronía: el «guion de interfaz»

El problema propio del género: **el gesto de la persona y el cambio de la UI tienen que coincidir**, y ningún motor
generativo acierta un cuadro exacto `[criterio]`. La solución es de montaje, no de generación:

1. **Guion de interfaz** (antes de generar): lista de beats con `{plano, estado de la UI, acción de la persona,
   duración, cuadro del evento}` (por ejemplo, «P5 · el dedo toca · evento en 0,8 s» → «P6 · el botón pasa a
   presionado en el cuadro 0»). Es la fuente única de los tiempos para la UI (timeline del render en código) y para el
   prompt de la persona.
2. **Corte en la acción** (*cut on action*): se genera P5 y se **detecta el cuadro del contacto**; el corte a P6 se pone
   justo ahí, y P6 arranca con el evento. Así el ojo lee un solo gesto continuo aunque sean dos fuentes. Detectar ese
   cuadro hoy es manual (hueco H19).
3. **La UI manda el ritmo**: el render en código es determinístico; se ajusta la UI a la toma de persona elegida, no al
   revés (regenerar la persona para calzar un tiempo cuesta créditos; mover un evento en código cuesta 0).
4. **Luz de pantalla en la cara**: en P2–P5 la pone el modelo, porque la pantalla es nativa (regla 1). En P7 la UI
   flotante necesita una luz suave coherente en la persona; si no, se ve pegada.

### 3.6 Formatos narrativos del género

Recetas de planos (orientativas; cada pieza decide). La proporción persona/UI es tiempo en pantalla.

| Formato | Duración típica | Secuencia de planos | Persona / UI |
|---|---|---|---|
| **Feature spotlight** | 6–15 s | P2 → P5 → P6 → cierre | 40 / 60 |
| **Problema → solución** | 15–30 s | P1 (frustración) → P2 → P5 → P6 → P1 (alivio) → cierre | 60 / 40 |
| **Demo o walkthrough** | 30–90 s | P6 dominante con P7 de apoyo, voz en off | 10 / 90 |
| **Testimonio / UGC** | 15–45 s | P1 a cámara + P6 como B-roll + P7 | 70 / 30 |
| **Un día con el producto** | 15–30 s | P2 en varios contextos + P6 cortos | 60 / 40 |
| **Asistente conversacional** (Nexa u otra IA) | 10–30 s | P1 hablando → P7 respuesta flotante → P6 | 50 / 50 |
| **Tutorial** | 30–60 s | P6 por pasos con texto compuesto; P5 opcional | 10 / 90 |
| **Lanzamiento / teaser** | 6–15 s | P8 o P10 con UI parcial | 20 / 80 |
| **Marca / hero** | 15–30 s | P1 y P2 emocionales; UI mínima en P7 o P10 | 80 / 20 |

### 3.7 Cast del género

- **Personas tipo** del ICP del cliente (ejecutiva, pyme, operador, estudiante): elenco ficticio con casting de campaña
  fijado en la ficha; nunca una persona real presentada como cliente si es generada (§3.9).
- **Personas del equipo de Efeonce**: consentimiento de imagen y voz; motores sin filtro de personas reales.
- **Nexa como agente** en productos propios (Greenhouse, Globe): encarna al asistente; aparece en P7 y P8 junto a la UI
  real, con su canon (identidad A, isotipo compuesto). Es el cast natural del formato «asistente conversacional».
- **Manos sin rostro** (P4, P5): bajan R y P; útiles para no cargar identidad en los planos de gesto.

### 3.8 Localización: el multiplicador del género

La UI en código se localiza a costo 0 (otro idioma, otra moneda, otro mercado); las tomas de persona se reutilizan si
no hablan a cámara. Diseñar el guion para que **la palabra viva en P6/P7** (localizable) y no en la boca de la persona
(lipsync por idioma, H12) multiplica las versiones por mercado sin regenerar. Con persona que habla: voz aparte por
idioma + lipsync (TASK-1985) o doblaje (puente Higgsfield).

### 3.9 Derechos, privacidad y verdad publicitaria

| Riesgo | Regla | Dueño |
|---|---|---|
| datos reales de clientes en una captura | sólo tenant sandbox y datos ficticios | operador + `legal-privacy-ip-operator` |
| testimonio con persona generada | **nunca presentarla como un cliente real**; si el formato es testimonio, usar personas reales con consentimiento o declararlo como dramatización | `legal-privacy-ip-operator` |
| UI de terceros (ChatGPT, Google, redes) | recreaciones gobernadas de AXIS; revisión de marcas de terceros | ídem |
| función que el producto todavía no tiene | no mostrar UI conceptual como real en un ad de producto | operador |
| persona real del equipo | consentimiento de imagen y voz por uso | ídem |

### 3.10 QA específico del género

- **Legibilidad a tamaño de plataforma**: el texto de P6/P7 se lee en un teléfono a tamaño de feed (tamaño mínimo y
  contraste medidos).
- **Sincronía**: el evento de UI cae a ≤ 2 cuadros del contacto del gesto en el corte `[criterio, a calibrar en C13]`.
- **Coherencia entre pantalla nativa e inserto**: la pantalla aproximada de P2–P5 no contradice la UI exacta de P6
  (mismo layout general, misma paleta).
- **Manos**: cinco dedos, sin fusiones, contacto creíble con la superficie.
- **Luz**: la cara recibe la luz de la pantalla en P2–P5; la UI flotante de P7 no queda pegada.
- **Tiempo de lectura**: cada texto se sostiene quieto lo suficiente para leerlo.
- **Safe zones** de la plataforma sobre P6/P7 (la interfaz de Reels o TikTok tapa partes del cuadro).

## 4. Huecos propios del género

| # | Hueco | Severidad | Dónde se cierra |
|---|---|---|---|
| H19 | Detectar el cuadro del contacto del gesto para cortar en la acción | A | TASK-1988 |
| H20 | Kit propio de motion de UI (cursor, tap, scroll, typing, zoom, llamadas, marco de dispositivo) sobre captura o render | A | TASK-1988 |
| H21 | Producto físico exacto compuesto con oclusión de manos e integración de luz | B | TASK-1987 (+ TASK-1984 para la luz) |
| H22 | Biblioteca de modelos 3D de dispositivos para P10 | C | follow-up |
| H23 | Ningún canario del género (persona + UI, producto en mano) | A | C12 y C13 (EPIC-051) |

## 5. Pilotos

- **Digital (C13):** nuestro propio portal, grabado con `pnpm fe:capture` en un tenant de ejemplo: sin marcas de
  terceros ni datos de clientes. Formato «feature spotlight» (P2 → P5 → P6 → cierre) con dos caminos comparados:
  pantalla nativa «video-safe» en P3/P4 contra partir con P6.
- **Físico (C12):** producto pendiente de decisión del operador (cliente, merch de Efeonce u objeto neutro).
