# 02 · Timing, easing y ritmo

> **Sello de frescura.** Módulo **estable** (craft atemporal). No se reverifica por fecha. Timing y
> ritmo deciden si una animación **respira** o suena a metrónomo. Es el principio más profundo del §01,
> y el que más distingue a un profesional. Aplica igual anime persona, rig o IA.

## Timing vs spacing: la distinción que casi todos confunden

Son cosas distintas y ambas deciden el peso:

- **Timing** = **cuántos frames** dura una acción (el *tiempo total*). Define la velocidad general y la
  emoción: rápido = energía/liviano; lento = peso/gravedad/solemnidad.
- **Spacing** = **cómo se distribuyen** esos frames en el recorrido (la *distancia entre frame y frame*).
  Define el ease: frames juntos = lento; frames separados = rápido.

Dos animaciones pueden durar **los mismos 24 frames** (mismo timing) y sentirse opuestas según el
spacing: spacing uniforme se lee mecánico; spacing acumulado en los extremos (ease in/out) se lee vivo y
pesado. **El peso vive en el spacing.** Regla dura: si algo se siente robótico pero la duración es
correcta, el problema casi siempre es spacing, no timing.

| | Controla | Si lo cambias… |
|---|---|---|
| **Timing** | Duración total (nº de frames) | Cambia la velocidad y la energía del gesto |
| **Spacing** | Distribución de esos frames | Cambia el peso y la naturalidad (ease) |

---

## Frame rate: el reloj sobre el que trabajas

| fps | Sensación / uso | Notas |
|---|---|---|
| **24** | **Cine.** El estándar cinematográfico; ligero motion blur, "look film" | Base para brand film, spot, title sequence. Cadencia narrativa |
| **25 / 30** | Broadcast / web estándar | 25 = PAL; 30 = NTSC/redes. Un pelo más "de video", menos film |
| **48 / 50 / 60** | Alto frame rate, hiperreal, deporte, gaming | Se siente "demasiado real/barato" para narrativa; útil para slow-mo |
| **120+** | Overcrank para **slow motion** | Se filma alto y se reproduce a 24 → cámara lenta suave |

Reglas prácticas:

- **24fps es el default cinematográfico.** El "on twos" (animar cada 2 frames, 12 dibujos/seg) da un look
  clásico de animación; "on ones" (24 dibujos/seg) da fluidez extrema. Elige a propósito, no por descuido.
- **Slow-mo real** se logra grabando a fps alto y reproduciendo a 24, no ralentizando en post (eso da
  frame-blend borroso). En IA, pídelo como "slow motion, overcranked" no "make it slower".
- **Motion blur** en 24fps es amigo: suaviza el spacing rápido. Sin él, el movimiento rápido "stroboscopea".
- Mantén **un solo fps** en toda la timeline; mezclar fps sin conform crea judder (tirones).

---

## Curvas de easing: cómo leer una curva

Una curva de easing grafica **progreso (Y) vs tiempo (X)**. La **pendiente = velocidad**: pendiente
plana = lento; pendiente empinada = rápido. La forma de la curva ES la sensación del movimiento.

| Curva | Forma | Sensación | Cuándo |
|---|---|---|---|
| **Linear** | Recta diagonal | Mecánico, muerto, constante | Casi nunca para objetos vivos; sí para loops técnicos, giros constantes |
| **Ease-in** (accelerate) | Plana→empinada | Arranca lento, se va acelerando; "salida" | Algo que se lanza, sale de cuadro, gana energía |
| **Ease-out** (decelerate) | Empinada→plana | Entra rápido y se asienta; "llegada" natural | Algo que aparece, entra a cuadro, se posa. El más usado en entradas |
| **Ease-in-out** | S suave | Acelera y frena; el más natural | Movimiento completo A→B (cámara, título, transición) |
| **Ease dramático (custom bezier)** | S pronunciada / con overshoot | Snappy, con carácter, "premium" | Marca fuerte, mograph enérgico, hits sincronizados |
| **Overshoot / anticipation curve** | Pasa el destino y vuelve | Rebote, elasticidad, vida | Logos, badges, elementos con "pop" (usar con criterio) |

Cómo pensar el bezier: los dos handles controlan la aceleración inicial y la frenada final. Un handle de
salida largo y bajo = arranque muy lento (más dramático). Un handle de entrada largo y bajo = frenada
larga y elegante. La asimetría (entrar rápido, frenar lento) casi siempre se lee más caro que la simetría.

Regla dura: **linear es sospechoso**. Si un movimiento de objeto/cámara está en linear, casi siempre está
mal — necesita al menos ease-out. Excepciones legítimas: rotaciones continuas, scroll técnico, loops.

---

## Timing → emoción (tabla)

| Timing / velocidad | Comunica | Ejemplos de uso |
|---|---|---|
| **Muy rápido** (snappy, pocos frames) | Energía, urgencia, juventud, tecnología, alerta | Spot enérgico, sports, gaming, glitch, transiciones punchy |
| **Rápido pero suave** | Confianza, agilidad, producto premium ágil | Reveal de feature, UI hero cinematográfico |
| **Medio** | Neutral, informativo, claro | Explainer corporativo, lower-thirds, narrativa estándar |
| **Lento** | Peso, gravedad, lujo, solemnidad, emoción | Brand film emocional, apertura de marca, luxury, memoriam |
| **Muy lento / hold** | Tensión, contemplación, importancia | Beat dramático antes de un reveal, título que respira |

El **hold (pausa)** es una herramienta activa, no tiempo muerto: un frame o beat de quietud **antes** de un
reveal genera tensión y hace que el movimiento siguiente pegue más fuerte. En comedia es el "beat" del
timing cómico; en drama es el aire antes del golpe. Regla: si todo se mueve siempre, nada destaca. Dale
al ojo momentos de quietud para que el movimiento signifique.

---

## Ritmo, tempo y el BEAT

El **ritmo** de una pieza es el patrón de movimiento y quietud, corte y hold, en el tiempo. El **tempo**
es su velocidad general. Un edit sin ritmo se siente monótono aunque cada toma esté bien.

- **Variar el ritmo** mantiene vivo: alterna tomas largas con ráfagas cortas, movimiento con quietud.
  La monotonía (todo del mismo largo) adormece; el contraste engancha.
- **Construir hacia un clímax**: acelerar el ritmo (cortes más cortos, movimiento más rápido) hacia el
  punto alto y luego soltar. Es la estructura de casi todo sizzle/trailer.

### Sincronizar al BEAT musical (el corazón del edit)

Cuando hay música, el movimiento y el corte deben conversar con ella. El **beat** es el pulso; los **hit
points** son acentos fuertes (un golpe de bombo, un stab, un downbeat de compás).

- **Cortar al beat**: los cortes que caen en el pulso se sienten intencionales y satisfactorios. Marca los
  beats primero (map de la pista) y edita contra esa grilla.
- **Sincronizar movimiento a hit points**: un reveal, un impacto de logo, un flash o un push-in que aterriza
  **exactamente** en un stab musical crea un momento "premium". La sincronía audio-visual es de lo que más
  eleva la percepción de calidad. (Enlaza §07 sound/music.)
- **Downbeat vs upbeat**: los momentos grandes van en downbeat (inicio de compás, más fuerte); los detalles
  y transiciones pueden ir en subdivisiones. No pongas el reveal principal en un tiempo débil.
- **Anticipar el hit**: a veces el movimiento **arranca 2–3 frames antes** del beat para "aterrizar" justo
  en él (por la anticipación del §01). Pegar el inicio exacto al beat puede llegar tarde en la percepción.

Regla dura: si la música y la imagen no están sincronizadas en los momentos clave, la pieza se siente
desalineada aunque cada capa esté bien. El sync es donde se juega la sensación de acabado.

---

## Aceleración y desaceleración física

Todo objeto con masa **no puede** arrancar ni parar instantáneo. La aceleración da la sensación de fuerza
aplicada; la desaceleración da la sensación de resistencia/inercia. Reglas:

- Objeto **pesado**: aceleración lenta y sostenida, frenada larga (mucho ease-out). Poco snap.
- Objeto **liviano**: aceleración instantánea posible, mucho follow-through, puede overshoot.
- **Fricción/resistencia** (agua, viscosidad): desaceleración marcada, sin rebote.
- **Elasticidad** (resorte, goma): overshoot + oscilación amortiguada (cada rebote más chico).

En dirección IA: traduce a física, no a números. "Heavy, strains to start, decelerates long" dirige mejor
que "slow". "Snappy with a small bounce settle" dirige un overshoot elástico.

---

## Checklist de timing y ritmo

- [ ] ¿El **fps** está definido a propósito (24 para film) y es uno solo en toda la timeline?
- [ ] ¿El **spacing** tiene ease (frames acumulados en los extremos), o es uniforme/lineal (muerto)?
- [ ] ¿Cada movimiento de objeto/cámara usa una **curva** distinta de linear (al menos ease-out)?
- [ ] ¿El **timing** comunica el peso/emoción correctos (rápido=energía, lento=gravedad)?
- [ ] ¿Hay **holds/pausas** deliberados que hagan destacar los momentos clave?
- [ ] ¿El **ritmo del edit varía** (largo vs corto, movimiento vs quietud), o es monótono?
- [ ] Con música: ¿los **cortes caen al beat** y los reveals aterrizan en **hit points**?
- [ ] ¿Los momentos grandes van en **downbeat**, no en tiempos débiles?
- [ ] En slow-mo: ¿es overcrank real o un frame-blend borroso (evitarlo)?
- [ ] ¿La aceleración/desaceleración es coherente con la **masa** del objeto?

Si el conjunto se siente "de metrónomo", ataca spacing (ease) y variación de ritmo primero: son los dos
que más rápido convierten un movimiento correcto en uno que respira.
