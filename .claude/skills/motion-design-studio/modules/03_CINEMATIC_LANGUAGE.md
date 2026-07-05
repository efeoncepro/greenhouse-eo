# 03 · Lenguaje cinematográfico — cámara, lente, luz, composición

> **Sello de frescura.** Módulo **estable** (craft atemporal). No se reverifica por fecha. El lenguaje de
> cámara/lente/luz/composición es la gramática con la que un plano **significa** algo. Aplica igual filme
> una persona con una cámara real o se dirija una IA de video: la IA responde a **terminología técnica
> precisa** ("slow push-in", "tracking shot", "aerial"), no a "que se vea cinematográfico".

## Tipos de plano (encuadre y distancia al sujeto)

| Plano | Qué muestra | Comunica | Uso típico |
|---|---|---|---|
| **Extreme wide / establishing** | El entorno completo, sujeto pequeño o ausente | Contexto, escala, "dónde estamos" | Apertura de secuencia, geografía, épica |
| **Wide / long shot** | Sujeto de cuerpo entero + entorno | Situación, relación con el espacio | Presentar personaje/producto en contexto |
| **Medium** | De cintura para arriba | Conversación, neutralidad, lectura de gesto | Explainer, entrevista, acción media |
| **Close-up** | Rostro / detalle del producto | Emoción, intimidad, importancia | Momento emocional, feature clave, textura |
| **Extreme close-up** | Ojos, textura, micro-detalle | Tensión, intensidad, foco absoluto | Beat dramático, macro de producto |
| **Insert / cutaway** | Un detalle fuera de la acción principal | Información, ritmo, énfasis | Un botón, un reloj, una mano |
| **Over-the-shoulder (OTS)** | Sujeto visto tras el hombro de otro | Relación, diálogo, punto de vista | Escenas de conversación |

Regla de gramática: la secuencia clásica va de **amplio → cerrado** (establecer contexto, luego acercar a
la emoción/detalle). Saltar directo a close sin establecer desorienta (a veces a propósito). No cruces dos
planos casi idénticos en encaje (jump cut involuntario) — cambia el encuadre ≥30° o el tamaño de plano.

---

## Movimientos de cámara → emoción (tabla maestra)

| Movimiento | Qué es | Comunica |
|---|---|---|
| **Static / locked** | Cámara fija | Estabilidad, observación, control, formalidad |
| **Pan** | Gira horizontal sobre su eje | Revelar, seguir, conectar espacios lateralmente |
| **Tilt** | Gira vertical sobre su eje | Revelar altura/escala (arriba=poder, abajo=sumisión) |
| **Dolly in / push-in** | Se acerca físicamente al sujeto | Intimidad creciente, tensión, "presta atención" |
| **Dolly out / pull-back** | Se aleja físicamente | Revelación de contexto, aislamiento, cierre, "el mundo es grande" |
| **Truck / crab** | Se desplaza lateral | Seguir en paralelo, mostrar amplitud, dinamismo |
| **Pedestal** | Sube/baja sin inclinar | Cambio de nivel elegante, revelar plano vertical |
| **Crane / jib** | Se eleva/desciende en arco amplio | Épica, gran revelación, majestuosidad |
| **Aerial / drone** | Vista desde el aire | Escala, geografía, apertura impresionante |
| **Orbit / arc** | Gira alrededor del sujeto | Heroísmo, producto premium, "míralo en 360" |
| **Tracking / follow** | Sigue al sujeto en movimiento | Inmersión, acompañar la acción, energía |
| **Crash zoom** | Zoom óptico muy rápido | Impacto, sorpresa, comedia, énfasis abrupto |
| **Slow zoom / creep** | Zoom óptico lento y casi imperceptible | Tensión que sube sin que el ojo lo note |
| **Handheld** | Cámara en mano, micro-inestable | Realismo, urgencia, documental, crudeza, tensión |
| **Steadicam / gimbal** | Fluido pero móvil | Elegancia en movimiento, seguir sin sacudir |
| **Whip pan** | Pan violento y borroso | Transición energética, cambio de escena, ritmo |

Distinción clave que la IA sí entiende: **dolly/push-in (la cámara se mueve físicamente)** ≠ **zoom (la
lente cambia de focal)**. El push-in cambia la perspectiva y se siente inmersivo; el zoom aplana y se
siente observacional. Nómbralos distinto al dirigir.

> **Regla dura de dirección IA.** Usa el término técnico exacto: `slow push-in`, `orbit around subject`,
> `aerial establishing shot`, `handheld tracking`, `crane up reveal`, `whip pan transition`. El modelo
> mapea esos términos a movimientos reales. "Que la cámara se mueva cool" no dirige nada. Un movimiento
> por toma; combinar dos (p. ej. push-in + tilt) solo si la toma lo pide.

---

## Lente, distancia focal y profundidad de campo

| Focal | Ángulo | Efecto | Sensación |
|---|---|---|---|
| **Wide (14–35mm)** | Amplio | Exagera profundidad, distorsiona en bordes, "mete" al espectador | Inmersión, espacio, épica, tensión (rostros cercanos) |
| **Normal (~50mm)** | Como el ojo humano | Perspectiva natural, sin distorsión | Neutral, honesto, realista |
| **Tele (85–200mm)** | Estrecho | Comprime el espacio, aísla al sujeto del fondo, aplana | Intimidad, aislamiento, "acecho", retrato premium |

- **Profundidad de campo (DoF)**: rango enfocado. **Shallow DoF** (poca profundidad, fondo desenfocado) =
  cinematográfico, aísla y jerarquiza al sujeto, look premium. **Deep DoF** (todo enfocado) = informativo,
  documental, todo importa. Se controla con apertura (f-stop bajo = más bokeh) y focal (tele = menos DoF).
- **Bokeh**: la calidad del desenfoque de las luces de fondo (círculos suaves). Riqueza visual clásica de
  cine; en IA se pide como "shallow depth of field, creamy bokeh".
- **Rack focus / focus pull**: cambiar el foco de un plano a otro dentro de la toma → dirige la atención,
  revela, conecta foreground y background. Herramienta narrativa potente.
- **Lens flares, aberración, halación**: texturas de lente que dan "look film" (usar con criterio, no de
  más). Parte de la doctrina 2026 de texturas ricas.

En IA: nombra la focal y el DoF ("shot on 85mm, shallow depth of field", "wide 24mm, deep focus"). El
modelo reproduce la firma óptica de esa focal.

---

## Composición en movimiento

La composición no es estática: se recompone mientras cámara y sujetos se mueven. Principios:

- **Regla de tercios (viva)**: el sujeto sobre las líneas/intersecciones, pero el encuadre **evoluciona** —
  el sujeto puede cruzar de un tercio al otro durante la toma. Mantén el balance en cada momento.
- **Headroom**: espacio sobre la cabeza. Justo. Demasiado = flotante; muy poco = agobiante. Se mantiene
  aunque la cámara se mueva.
- **Leading room / nose room**: espacio **hacia donde mira o se mueve** el sujeto. Un sujeto mirando/andando
  a la derecha necesita aire a la derecha; encerrarlo contra el borde crea tensión (a veces buscada).
- **Líneas y guías**: líneas del entorno (arquitectura, horizonte, caminos) que dirigen el ojo hacia el
  sujeto o el punto de interés. En movimiento, las líneas cambian y pueden "entregar" el foco.
- **Balance y peso visual**: un elemento grande/brillante a un lado se equilibra con espacio o un elemento
  menor al otro. El desequilibrio comunica inestabilidad o dinamismo.
- **Horizonte y nivel**: horizonte nivelado = estabilidad; **dutch angle** (inclinado) = tensión,
  desorientación, algo "no está bien".

---

## Iluminación cinematográfica

La luz es dirección, no solo visibilidad. Esquema base **de tres puntos** y sus roles:

| Luz | Rol | Efecto |
|---|---|---|
| **Key light** | Luz principal, define la forma y de dónde "viene" la luz | Modela el rostro/objeto; su ángulo marca el drama |
| **Fill light** | Suaviza las sombras del key | Controla el contraste (poco fill = dramático; mucho = plano/suave) |
| **Rim / back light** | Detrás del sujeto, dibuja su contorno | Separa del fondo, da profundidad y "halo", look premium |

Ratios y estilos:

- **Low-key** (mucho contraste, sombras profundas, poco fill): drama, misterio, lujo, tensión, noir.
- **High-key** (poco contraste, luminoso, sombras suaves): optimismo, limpieza, corporativo, producto claro.
- **Contraluz / backlight**: sujeto contra la luz → silueta, atmósfera, emoción, épica (hora dorada).
- **Motivated light**: la luz parece venir de una fuente real de la escena (ventana, lámpara) → credibilidad.
- **Hora dorada (golden hour)**: luz baja, cálida, larga, suave — la más "cinematográfica" por defecto.
  **Hora azul (blue hour)**: crepúsculo frío, melancólico. Ambas son direcciones de luz, no solo momentos.
- **Color de luz**: cálida (ámbar) = acogedor, nostálgico, humano; fría (azul) = tecnológico, distante,
  nocturno. El contraste cálido/frío en una misma toma da riqueza (enlaza §08 color grade).

En IA: dirige la luz explícita — "backlit, golden hour, warm rim light, deep shadows, low-key" produce un
look totalmente distinto a "well lit". La luz es de lo que más eleva la percepción cinematográfica.

---

## Profundidad y capas (parallax)

Un plano se siente 3D cuando tiene **capas separadas** en profundidad:

- **Foreground (FG)**: algo cerca de la cámara (una hoja, humo, un objeto desenfocado) que enmarca y da
  profundidad instantánea.
- **Midground (MG)**: el sujeto principal, el plano de acción.
- **Background (BG)**: el entorno, el contexto, a menudo desenfocado.

El **parallax** — cuando las capas se mueven a **distinta velocidad** al mover la cámara (la cercana más
rápido que la lejana) — es lo que vende la profundidad. En mograph 2.5D es la técnica central; en IA se
pide con "layered depth, foreground element, parallax as camera moves". Añadir un elemento de FG (partículas,
humo, un objeto borroso) transforma un plano plano en uno con profundidad.

---

## Continuidad y el eje de 180°

La **regla de los 180°**: traza una línea imaginaria entre los dos sujetos (o la dirección de acción); la
cámara debe quedarse **en un solo lado** de esa línea. Cruzarla ("crossing the line") invierte las
posiciones en pantalla y desorienta — de pronto los personajes parecen mirar al lado equivocado.

- Mantén la **dirección de miradas y movimiento** consistente entre cortes: si el sujeto sale por la
  derecha, entra al siguiente plano por la izquierda (continuidad de dirección).
- **Match cut / match on action**: cortar en mitad de una acción, continuándola en el plano siguiente →
  edición invisible, fluida. Es la base de la continuidad (enlaza §06 edición).
- Cruzar el eje **a propósito** (con un plano de transición neutro, o un movimiento de cámara que cruce en
  vivo) es válido para desorientar deliberadamente. Cruzarlo por accidente es un error de continuidad.
- **Eyeline match**: la mirada de un personaje debe coincidir con la posición de lo que mira en el corte
  siguiente. Si mira arriba-derecha, el objeto va arriba-derecha.

---

## Checklist de lenguaje cinematográfico

- [ ] ¿El **tipo de plano** sirve a la intención (wide=contexto, close=emoción)?
- [ ] ¿La secuencia respeta **amplio→cerrado**, o rompe el orden a propósito?
- [ ] ¿El **movimiento de cámara** comunica la emoción correcta (push-in=tensión, pull-back=revelación)?
- [ ] ¿Distingues **dolly/push-in** (mover) de **zoom** (focal) al dirigir?
- [ ] ¿La **focal y el DoF** están elegidos (tele+shallow=aislar/premium; wide+deep=épica/inmersión)?
- [ ] En composición: ¿hay **headroom** correcto y **leading room** hacia donde mira/va el sujeto?
- [ ] ¿La **iluminación** tiene intención (key/fill/rim; low-key dramático vs high-key limpio)?
- [ ] ¿Hay **capas de profundidad** (FG/MG/BG) y parallax, o el plano es plano?
- [ ] ¿Se respeta el **eje de 180°** y la continuidad de miradas/dirección entre cortes?
- [ ] Dirigiendo IA: ¿usé **terminología técnica precisa** en vez de adjetivos vagos?

Si el plano se siente "de stock" o plano, ataca primero: luz con intención, una capa de foreground para
profundidad, y un movimiento de cámara nombrado con precisión. Son los tres que más rápido lo vuelven cine.
