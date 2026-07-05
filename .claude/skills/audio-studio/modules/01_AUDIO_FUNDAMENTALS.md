# Módulo 01 — Fundamentos de audio (señal · niveles · espectro · dinámica · monitoreo)

> **Estable (craft atemporal).** Esta física del sonido y del flujo de señal no caduca:
> aplica igual lo produzca una persona o una IA. Es la base sobre la que se paran los
> módulos 02–10. Si la base está mal (clipeo, gain staging sucio, sala mala), ninguna
> voz IA impecable ni mezcla lujosa la salva.

Antes de dirigir una voz, generar música o abrir una mezcla, tienes que entender qué es
la señal, cómo se acumula, en qué banda vive cada cosa y cómo escuchar sin engañarte. Este
módulo es ese piso.

---

## 1. Señal y niveles — dBFS, headroom, gain staging

El audio digital se mide en **dBFS** (decibels Full Scale). El techo absoluto es **0 dBFS**:
un solo pico que lo cruza produce **clipeo** (distorsión digital, irreversible). Por eso NO
grabas ni mezclas pegado a 0 — trabajas con **headroom** (aire arriba del pico más alto).

| Concepto | Qué es | Objetivo de trabajo |
|---|---|---|
| **Peak (pico)** | muestra instantánea más alta | grabar picos entre **−20 y −12 dBFS** |
| **RMS / promedio** | energía percibida sostenida | referencia de qué tan "fuerte" suena de verdad |
| **Headroom** | distancia del pico a 0 dBFS | dejar **6–12 dB** libres al grabar y mezclar |
| **Noise floor** | ruido de fondo (sala + preamp) | lo más bajo posible; sala tratada lo baja |
| **True peak (dBTP)** | picos inter-muestra tras conversión | vigilar en master (ver módulo 09) |

**Gain staging correcto** = mantener un nivel sano en CADA etapa de la cadena, sin
sobrecargar ninguna:

1. **Fuente** (voz/instrumento) a distancia y energía consistentes.
2. **Preamp / interfaz**: sube ganancia hasta que los picos queden **−20 a −12 dBFS**. Si el
   preamp clipea, ninguna corrección posterior lo arregla — se re-graba.
3. **Grabación (DAW)**: registra en **24-bit** (ver §5) — el headroom te cubre; no necesitas
   grabar caliente "para que suene bien".
4. **Procesamiento**: cada plugin entra y sale a nivel similar; no dejes que un EQ o comp
   dispare +10 dB al siguiente.
5. **Bus / master**: llegar con margen para masterizar sin pelear contra picos.

> **Regla dura.** Grabar **caliente** (pegado a 0) es un error de novato: en 24-bit no ganas
> nada y arriesgas clip. Graba con headroom; sube el volumen al final, no en la fuente.

---

## 2. Espectro de frecuencias — qué vive en cada banda

El rango audible humano va de **~20 Hz a ~20 kHz**. Saber qué banda hace qué es lo que te
deja diagnosticar "suena opaco / embarrado / chillón / delgado" y actuar con EQ (módulo 09).

| Banda | Rango | Qué vive ahí | Si sobra | Si falta |
|---|---|---|---|---|
| **Sub-graves** | 20–60 Hz | retumbe, rumble, energía física | embarrado, boomy, gasta headroom | — (voz casi no usa) |
| **Graves** | 60–250 Hz | cuerpo, calidez, fundamental de voz masculina | tapado, "boxy" | delgado, sin peso |
| **Medios-bajos** | 250–500 Hz | cuerpo de la voz, calidez | "cartón", nasal, barroso | hueco |
| **Medios** | 500 Hz–2 kHz | inteligibilidad de la voz, ataque | duro, telefónico | difuso, lejano |
| **Presencia** | **2–5 kHz** | claridad, articulación, "adelanto" de la voz | fatigante, áspero | apagado, sin foco |
| **Brillo** | 5–10 kHz | definición, filos de consonantes, sibilancia | sibilante (ess/sh) | mate |
| **Aire** | **>10 kHz** | apertura, "aire", sensación de alta fidelidad | fino, frágil, ruido | cerrado, viejo |

**Anclas para voz** (las que más vas a usar):
- **Fundamental de voz**: ~85–180 Hz (masculina), ~165–255 Hz (femenina).
- **Inteligibilidad de la voz**: ~**100 Hz a 8 kHz** es donde vive la voz hablada útil.
- **Presencia / que la voz "se adelante"**: realce suave en **2–5 kHz**.
- **Aire / cercanía premium**: shelf muy suave **>10 kHz**.
- **Sibilancia (ess, sh)**: **5–9 kHz** — se doma con de-esser, no cortando todo el brillo.
- **Rumble / pop de plosivas / aire acondicionado**: high-pass **~80 Hz** en voz limpia la base.

---

## 3. Dinámica — rango, transientes, por qué comprimir

**Rango dinámico** = diferencia entre el pasaje más suave y el más fuerte. Una voz humana
natural tiene rango alto: susurra y grita. **Transiente** = el golpe inicial rápido de un
sonido (la "t", la "p", el ataque de un tambor). La dinámica es expresión — pero **demasiada**
dinámica hace que el oyente suba y baje el volumen constantemente.

**Por qué comprimir** (detalle de ejecución en módulo 09):
- **Consistencia**: la voz baja no se pierde y la alta no revienta — se sostiene inteligible.
- **Densidad / pegada**: acerca la voz al oyente, la hace sonar "producida" y presente.
- **Control de transientes**: doma picos que gastarían headroom.
- **Contexto ruidoso**: podcast en auto/gimnasio necesita rango dinámico controlado o se pierde.

| Término | Qué es |
|---|---|
| **Threshold** | nivel donde el compresor empieza a actuar |
| **Ratio** | cuánto reduce sobre el threshold (voz típica 2:1 a 4:1) |
| **Attack / Release** | qué tan rápido agarra y suelta (attack lento deja pasar transiente) |
| **Make-up gain** | recupera el nivel perdido tras comprimir |
| **Limiting** | compresión extrema (ratio ∞) — pared final antes de 0 dBFS |

> No comprimas por reflejo. Primero pregúntate: ¿el problema es dinámica (comprimir) o
> balance espectral (EQ)? Comprimir un problema de EQ solo lo hace más denso y peor.

---

## 4. Estéreo, mono, paneo, imagen

- **Mono**: una sola señal, sin posición horizontal. **La voz hablada, el podcast y la mayoría
  de VO se graban y viven en mono** — es más robusto (colapsa bien en un solo altavoz de
  teléfono, no tiene problemas de fase). No hay nada de malo en mono para voz.
- **Estéreo**: dos canales (L/R) → sensación de ancho y posición. Música, ambientes y SFX
  aprovechan estéreo; la voz protagonista casi siempre va **centrada**.
- **Paneo**: ubicar un elemento entre L y R. Centro = voz principal, bombo, bajo. Laterales =
  ambientes, coros, elementos de color.
- **Imagen estéreo**: el "cuadro" ancho donde se ubican los elementos. Cuídala: si todo está al
  centro suena angosto; si todo está abierto pierde foco.
- **Fase / mono-compatibilidad**: si dos señales similares están desfasadas, al sumar a mono se
  cancelan (voz que desaparece en el altavoz del teléfono). **Chequea SIEMPRE tu mezcla en mono**
  antes de entregar — mucha gente escucha en un solo parlante.

> **Regla.** Todo lo central e importante (voz, low end) va **mono y centrado**. El ancho es
> para color y ambiente, no para lo que el mensaje necesita que se entienda.

---

## 5. Sample rate y bit depth — 24-bit / 48 kHz

- **Sample rate**: cuántas muestras por segundo. **48 kHz** es el estándar de producción para
  voz/video/podcast (44.1 kHz es legado de CD/música). Captura hasta ~24 kHz, cubre todo el oído.
- **Bit depth**: resolución de cada muestra = rango dinámico y noise floor. **Graba en 24-bit**:
  te da ~144 dB de rango teórico y muchísimo headroom, así grabar conservador (−20 a −12 dBFS)
  no cuesta calidad. **16-bit** es solo formato de entrega final (no de grabación).
- **Regla de producción canónica**: **graba y trabaja en 24-bit / 48 kHz**; convierte a
  16-bit / formato destino recién en la entrega/master (módulo 09).
- No subas el sample rate "por las dudas" (96 kHz) salvo que un flujo específico lo pida: más
  peso, más CPU, cero beneficio audible para voz hablada.

---

## 6. El oído — fatiga, igual sonoridad, escuchar bajo

Tu herramienta de decisión es el oído, y **el oído miente de formas predecibles**:

- **Curvas de igual sonoridad (Fletcher–Munson)**: el oído NO es plano. A **volumen alto**
  percibes más graves y más agudos; a **volumen bajo** el medio domina. Por eso una mezcla que
  suena "llena" fuerte suena delgada bajo. **Toma decisiones de balance a volumen moderado** y
  chequea a volumen bajo — si la voz se entiende y el balance aguanta bajo, aguanta en todos lados.
- **Fatiga auditiva**: tras ~45–60 min tu oído se cansa y pierdes juicio (tiendes a subir todo y
  a exagerar agudos). **Descansa cada 45–60 min.** Las decisiones de la 3.ª hora suelen ser malas.
- **Adaptación**: te acostumbras a lo que sea que estés escuchando (incluso a algo malo).
  Compara con **referencias** externas y descansa el oído para "resetear".
- **Escuchar bajo es una prueba de verdad**: si tu mezcla comunica el mensaje a volumen bajo,
  está bien balanceada. La mayoría del consumo real es a volumen bajo, en dispositivos malos.

---

## 7. Monitoreo — monitores, auriculares, sala

Lo que decides depende de lo que oyes. **Lo que oyes depende MÁS de la sala que del equipo.**

- **Monitores (parlantes)**: dan imagen estéreo real y relación natural con la sala; ideales para
  mezcla si la sala está tratada. Sin tratamiento, la sala colorea y te miente.
- **Auriculares**: aíslan de la sala (útil en sala mala), exponen detalle, clicks y ruido; pero
  exageran la separación estéreo y cansan. **Buenos para editar/limpiar y para chequear detalle**,
  riesgosos para decidir todo el balance. **Chequea en ambos** más un parlante "malo" (teléfono).
- **La sala manda**: reflexiones y modos de sala distorsionan graves y medios. Un ambiente tratado
  con monitores modestos supera a monitores caros en una sala reflectante (ver módulo 02 para el
  tratamiento práctico de la sala de grabación).
- **Nivel de monitoreo consistente**: mezcla siempre alrededor del mismo volumen moderado. Cambiar
  de volumen cambia tu percepción (§6) y tus decisiones dejan de ser comparables.
- **Referencias**: ten 1–2 piezas pro del mismo tipo (podcast, VO, música) y compara balance,
  loudness y brillo contra ellas. Es el ancla externa contra la adaptación de tu oído.

---

## 8. Checklist — "buena base de audio"

- [ ] Grabado en **24-bit / 48 kHz**.
- [ ] Picos entre **−20 y −12 dBFS**; **cero clipeo** (nada tocando 0 dBFS).
- [ ] Headroom de **6–12 dB** conservado a lo largo de la cadena.
- [ ] **Gain staging** sano etapa por etapa (ningún plugin dispara el nivel al siguiente).
- [ ] **Noise floor** bajo y parejo (sala + preamp); sin hum/rumble evidente.
- [ ] High-pass **~80 Hz** aplicado en voz limpia si no aporta cuerpo real.
- [ ] Voz protagonista **mono y centrada**; ancho reservado para color/ambiente.
- [ ] Mezcla **chequeada en mono** (sin cancelaciones de fase que borren la voz).
- [ ] Balance decidido a **volumen moderado** y verificado **a volumen bajo**.
- [ ] Verificado en **≥2 sistemas** (monitores/auriculares + un parlante "malo").
- [ ] Descansos cada **45–60 min** para no decidir con oído fatigado.
- [ ] Comparado contra **referencia** externa del mismo tipo de pieza.

> **Cierre.** Con esta base sana, los módulos siguientes (dirección de voz, música, mezcla) parten
> de material limpio. Sin ella, cada módulo posterior está corrigiendo en vez de crear.
