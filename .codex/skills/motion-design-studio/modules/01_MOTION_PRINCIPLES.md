# 01 · Los 12 principios de animación a nivel broadcast

> **Sello de frescura.** Módulo **estable** (craft atemporal). No se reverifica por fecha. Aplica
> igual anime una persona, un rig 3D o una IA de video. Los principios de Disney (Thomas & Johnston,
> *The Illusion of Life*, 1981) no son "cosas de dibujo animado": son las reglas de la **física del
> movimiento creíble** y del **peso**. Un spot IA en 8K con timing plano y sin arcos es mal motion.

## Por qué siguen mandando en 2026

Los 12 principios describen cómo el ojo humano lee **peso, fuerza, intención y vida** en algo que se
mueve. El cerebro detecta lo falso en milisegundos: un movimiento lineal, sin anticipación ni
follow-through, se lee como "robótico" aunque el render sea fotorrealista. Por eso también son la
**gramática con la que se dirige a una IA de video**: un prompt que no pide anticipación ni arco
produce movimiento muerto (§final). El principio es el idioma; la herramienta es el acento.

Dos macro-verdades que atraviesan los 12:

- **Nada se mueve a velocidad constante en la vida real.** Todo acelera y desacelera (ease). Ver §02.
- **Nada se mueve en línea recta perfecta.** Todo describe arcos. La línea recta se lee como mecánica.

---

## Los 12 — qué es · bien vs amateur · cómo aplicarlo

| # | Principio | Se ve BIEN cuando… | Se ve AMATEUR cuando… |
|---|---|---|---|
| 1 | Squash & stretch | El volumen se conserva; deforma en la dirección de la fuerza y vuelve | Estira sin conservar masa (parece goma), o no deforma nada (parece rígido) |
| 2 | Anticipación | Hay un pequeño movimiento contrario antes de la acción | La acción arranca "de la nada", sin carga |
| 3 | Staging | Una idea clara por plano; el ojo sabe dónde mirar | Todo compite; silueta ilegible; acción escondida |
| 4 | Straight-ahead / pose-to-pose | Se elige el método según la toma (fluido vs controlado) | Poses claves flojas o fluido sin estructura, deriva |
| 5 | Follow-through & overlapping | Las partes secundarias siguen y llegan desfasadas | Todo frena de golpe en el mismo frame, como bloque |
| 6 | Slow in & slow out (ease) | Se acumulan frames en los extremos, pocos al centro | Spacing uniforme → movimiento plano, mecánico |
| 7 | Arcos | Las trayectorias curvan de forma natural | Todo viaja en línea recta → se siente robótico |
| 8 | Secondary action | Un gesto de apoyo enriquece sin robar foco | La acción secundaria compite y confunde la principal |
| 9 | Timing | El número de frames comunica peso y emoción | Todo dura lo mismo; nada tiene masa distinta |
| 10 | Exaggeration | Se empuja la pose/acción más allá de lo literal, con criterio | Literal y tibio (sin vida) o caricaturesco sin control |
| 11 | Solid drawing / volumen | Formas con peso, perspectiva y espacio 3D coherente | Formas planas, se aplastan, pierden dimensión |
| 12 | Appeal | Diseño y movimiento con carisma y claridad de lectura | Genérico, ruidoso, sin personalidad ni jerarquía |

### Detalle operativo por principio

**1 · Squash & stretch.** La ley: **el volumen se conserva**. Una pelota que cae se estira vertical al
acelerar y se aplasta al impactar, pero su masa aparente no cambia. En mograph aplica a shapes, logos
que rebotan, lower-thirds que entran. Amateur: estirar sin recuperar (parece chicle) o congelar sin
deformar (parece piedra). Regla dura: si estiras en un eje, comprime en el otro para mantener área/volumen.

**2 · Anticipación.** Toda acción grande necesita una carga contraria: el salto se agacha antes, el
puñetazo retrocede, el título que sale a la derecha primero cede a la izquierda. La anticipación **le
avisa al ojo** qué va a pasar y le da peso. Sin ella el movimiento sorprende y se lee barato. En cámara:
un leve pull-back antes del push-in. En IA: pídelo explícito ("a subtle wind-up before…").

**3 · Staging.** Presentar la idea de forma inconfundible: silueta legible, contraste, una acción
principal por plano, el resto subordinado. Test de silueta: si en negro puro no se entiende la pose,
está mal montada. Staging es composición + timing + dirección de mirada trabajando juntos (enlaza §03).

**4 · Straight-ahead vs pose-to-pose.** *Straight-ahead* = animar frame a frame en secuencia (fuego,
humo, pelo, FX orgánico — fluido, impredecible). *Pose-to-pose* = definir keyframes fuertes y rellenar
(acción controlada, actuación, mograph). Lo pro combina: keys pose-to-pose para estructura, straight-ahead
para el secundario. En IA: keyframes primero (pose-to-pose) y dejar que el modelo interpole (§09 doctrina 7).

**5 · Follow-through & overlapping action.** Cuando el cuerpo frena, las partes con inercia (pelo, tela,
cola, antena, un panel del logo) **siguen y llegan tarde**, escalonadas. Overlapping = distintas partes
se mueven en tiempos distintos. Esto es lo que separa un motion vivo de uno de bloque. Regla: nada llega
exactamente en el mismo frame; ofrece 2–5 frames de desfase entre capas.

**6 · Slow in & slow out (ease).** Casi todo arranca lento, acelera y frena. Se logra **acumulando frames
en los extremos** y espaciándolos al centro (spacing, ver §02). Es el principio más transferido a UI, pero
en cine se empuja más: acelerar/desacelerar con curvas custom (bezier), no solo "ease".

**7 · Arcos.** Manos, cabezas, objetos lanzados, cámara — todo viaja en curva. Traza la trayectoria: si es
recta, córtala. Un pan de cámara que sube describe un leve arco; un logo que entra baja en curva. La
línea recta perfecta es la firma número uno del movimiento robótico/amateur.

**8 · Secondary action.** Gestos de apoyo que **refuerzan** la acción principal: una mirada, un parpadeo,
partículas que acompañan un impacto, una sombra que reacciona. Regla dura: si la secundaria roba foco a la
principal, sóbrala o quítala. Enriquece, no compite.

**9 · Timing.** El **número de frames** de una acción define su peso y su emoción. Pocos frames = rápido,
liviano, energía. Muchos frames = lento, pesado, gravedad. Un objeto pesado necesita más frames para
arrancar y frenar. El timing es el principio más profundo — tiene módulo propio (§02).

**10 · Exaggeration.** Empujar la pose, la deformación o el timing **más allá de lo literal** para que
lea claro y con vida — con criterio de marca. No es "caricaturesco": es enfatizar lo esencial. Un
enterprise brand film exagera sutil (un push-in un pelo más largo, un flare un poco más rico); un spot
enérgico exagera fuerte. Lo tibio-literal es la muerte del appeal.

**11 · Solid drawing / volumen.** Las formas ocupan espacio 3D coherente: perspectiva, peso, no se
aplastan al girar. En 3D/IA es "no rompas la geometría ni el volumen entre frames". En mograph 2D es
mantener consistencia de grosor, luz y profundidad. La deriva de volumen (character warp en IA) rompe la
ilusión — por eso Soul ID / refs (§09).

**12 · Appeal.** Carisma + claridad de lectura. No es "bonito": es que el diseño y el movimiento tengan
personalidad y sean fáciles de leer. Silueta fuerte, jerarquía clara, ni ruidoso ni genérico. El appeal
es la suma de los otros 11 bien resueltos + intención de dirección.

---

## Peso y física: el subtexto de los 12

El **peso aparente** es la prueba maestra. Se construye combinando timing (§9), ease (§6), squash/stretch
(§1), follow-through (§5) y arcos (§7). Reglas físicas prácticas:

- Objeto **pesado**: arranca lento (mucha anticipación), acelera poco, frena largo, poco squash.
- Objeto **liviano**: reacciona rápido, flota, mucho follow-through/overlap, arcos amplios.
- **Impacto**: el frame de contacto es el más importante — squash máximo, quizá 1–2 frames de "smear"
  o un hold breve para que el ojo lo registre. Sin impacto marcado, la fuerza no se siente.
- **Gravedad**: la aceleración de caída aumenta (spacing creciente); el rebote pierde altura y energía
  progresivamente (decay). Un rebote de altura constante se lee falso.

---

## Dirigir IA con los 12 principios

Un modelo de video interpola movimiento; si el prompt no pide vida, entrega vida plana. Traduce cada
principio a lenguaje de dirección:

| Principio | Prompt muerto (evítalo) | Prompt vivo (dirígelo así) |
|---|---|---|
| Anticipación | "the logo moves right" | "the logo winds up slightly left, then snaps right" |
| Ease | "camera moves in" | "slow, gentle push-in that eases in and settles" |
| Arcos | "the object flies up" | "the object arcs upward along a curved path" |
| Follow-through | "hair moves" | "hair trails and settles a beat after the head stops" |
| Timing/peso | "a heavy door opens" | "a heavy door opens slowly, straining, with weight" |
| Overlapping | "everything animates in" | "elements stagger in, offset by a few frames each" |

Regla dura de dirección IA: **nombra la física, no el adjetivo**. "Que se vea cool" no dirige nada;
"eases in, arcs, settles with follow-through" sí. Si la toma sale robótica, casi siempre falta
anticipación, ease o arco — audita en ese orden.

---

## Checklist "¿este movimiento se siente vivo?"

- [ ] ¿Hay **anticipación** antes de cada acción importante (una carga contraria)?
- [ ] ¿El movimiento **acelera y desacelera** (ease), o va a velocidad constante (muerto)?
- [ ] ¿Las trayectorias **curvan** (arcos), o viajan en línea recta (robótico)?
- [ ] ¿Las partes secundarias **siguen y llegan desfasadas** (follow-through/overlap), o frenan en bloque?
- [ ] ¿El **timing** comunica el peso correcto (pesado = lento/largo, liviano = rápido/flotante)?
- [ ] En impactos: ¿hay **squash/hold/smear** en el frame de contacto para registrar la fuerza?
- [ ] ¿La **silueta** de cada pose clave es legible en negro puro (staging)?
- [ ] ¿La **acción secundaria** refuerza sin robar foco a la principal?
- [ ] ¿Se **conserva el volumen** entre frames (sin warp ni aplastado no intencional)?
- [ ] ¿El conjunto tiene **appeal** — personalidad + claridad, ni genérico ni ruidoso?

Si tres o más quedan sin marcar, el movimiento se leerá "de plantilla". Vuelve a anticipación, ease y
arcos: son los tres que más rápido matan o salvan una toma.
