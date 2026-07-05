# 04 · Del brief a la producción — Storyboard, Animatic, Previs

> **Qué resuelve este módulo.** El puente entre "quiero un video" y "hay algo que producir".
> Ordena la cadena **brief → concepto → estructura narrativa → storyboard → animatic → previs →
> shotlist**. Es la fase donde se decide si el video funciona **antes de gastar** un solo crédito de
> IA o una sola hora de After Effects. El storyboard es el plano de obra; el animatic es el primer
> corte que **prueba el ritmo**. Aplica igual a producción humana y a producción IA: el storyboard
> **dirige ambas manos** — cada plano dibujado es un prompt de IA o una comp de AE esperando a existir.

**Regla madre del módulo:** *nunca se produce un plano que no esté en el storyboard, y nunca se
aprueba un storyboard que no haya pasado por animatic.* Iterar en papel/animatic cuesta minutos;
iterar en render cuesta créditos, horas y moral.

---

## 1. Leer (o exigir) un brief de motion

Un brief usable responde estas preguntas. Si faltan, no arranques: pregúntalas (o complétalas con
supuestos explícitos y márcalos como tales). Aterriza el cierre en `templates/motion-brief.md`.

| Campo | Pregunta que responde | Ejemplo |
|---|---|---|
| **Objetivo** | ¿Qué cambia en quien lo ve? (una sola frase) | "Que un CMO entienda que el grader mide su marca en IA en 20s" |
| **Audiencia** | ¿Quién, qué sabe, qué le importa? | CMO enterprise, escéptico, poco tiempo |
| **Mensaje único** | Si recuerda 1 cosa, ¿cuál? | "Tu marca ya se está evaluando en ChatGPT" |
| **Tono** | 3 adjetivos, no más | Cinematográfico · seguro · nítido |
| **Duración/formato** | Segundos + relación de aspecto + destino | 30s · 16:9 master + 9:16 corte social |
| **CTA** | ¿Qué hace después? | "Corre tu grader gratis" |
| **Marca** | SSOT, no-negociables, mascota | Efeonce (no Greenhouse), Nexa permitida |
| **Restricciones** | Presupuesto, deadline, legal, disclosure IA | 2 días, disclosure si hay rostro sintético |
| **Referencias** | 2-3 piezas "así se siente" + 1 "así NO" | + title sequence de A24 · − spot rápido genérico |

> Si el brief llega como conversación suelta, tu primer entregable **es el brief formalizado**, no el
> storyboard. Un concepto sobre un brief difuso se cae en revisión.

## 2. Concepto — la idea antes del plano

El concepto es **una frase + una imagen mental**, no un guion. Es la apuesta creativa que hace que
este video no sea intercambiable con cualquier otro. Método rápido:

1. **Traduce el mensaje único a una metáfora visual.** "Tu marca se evalúa sin que lo sepas" → una
   sala de tribunal en penumbra donde el logo del cliente está en el estrado, iluminado por un foco.
2. **Elige el vehículo:** narrativo (personaje + arco), demostrativo (producto en acción), abstracto
   (mograph/tipo kinética), documental (voces reales), o híbrido.
3. **Prueba el concepto en una línea (el "logline"):** *"Un CMO descubre, en tiempo real, que la IA
   ya tiene una opinión sobre su marca — y decide cambiarla."* Si el logline no engancha, el video
   tampoco lo hará.
4. **Valida contra el brief:** ¿sirve al objetivo? ¿es producible en el presupuesto? ¿respeta la marca?

Presenta **1 concepto fuerte con razón**, no 5 tibios. Si el operador pide opciones, da 2-3 conceptos
*divergentes* (distinto vehículo cada uno), no variaciones del mismo.

## 3. Estructura narrativa — el arco

Aun un spot de 15s tiene arco. La estructura no es adorno: es lo que hace que el ojo **no suelte**.

**El arco mínimo (aplica de 6s a 3min):**

```
GANCHO ──► TENSIÓN/DESARROLLO ──► GIRO/CLÍMAX ──► RESOLUCIÓN + CTA
 (0-3s)        (cuerpo)              (pico)         (cierre)
```

- **Gancho en 3 segundos (no-negociable 2026).** Los primeros 3s deciden si te quedas. No abras con
  logo ni con setup lento: abre con la imagen más fuerte, una pregunta visual, un movimiento, una
  anomalía. En vertical/social el gancho es aún más brutal — **el primer segundo** (as-of 2026-07 —
  reverificar; el umbral de retención sigue bajando por red). Ver `social-media-studio` para safe-zones.
- **Beats.** Divide el cuerpo en 3-6 *beats* (unidades de sentido). Cada beat mueve la historia un
  paso. Un beat = una idea = típicamente 1-3 planos. Si un beat no mueve nada, córtalo.
- **Giro/clímax.** El momento de mayor carga: la revelación, el producto en su mejor luz, el dato que
  duele. Colócalo ~70-80% del recorrido, no al final muerto.
- **Resolución + CTA.** Cierra la tensión y da la acción. El CTA cinematográfico se *gana* con el arco;
  no se pega como cartel.

**Marcos útiles según pieza:**

| Marco | Cuándo | Beats |
|---|---|---|
| **Problema → Agitación → Solución (PAS)** | spot/explainer comercial | duele · duele más · alivio |
| **Antes → Puente → Después** | producto que transforma | mundo viejo · el producto · mundo nuevo |
| **Pregunta → Viaje → Respuesta** | brand film, title-driven | intriga · exploración · revelación |
| **Gancho → Valor → Valor → CTA** | social corto, retención | detén el scroll · dato · dato · acción |

## 4. Storyboard — el plano de obra

El **storyboard** es la secuencia de viñetas que describe **cada plano**: qué se ve, cómo se
encuadra, cómo se mueve la cámara, qué pasa, cuánto dura. Es el documento que un tercero (o una IA)
podría producir sin ti en la sala.

**Qué lleva cada viñeta (celda):**

| Elemento | Qué anota | Notación |
|---|---|---|
| **# de plano** | orden y referencia | `SH-04` |
| **Frame** | dibujo/descripción de lo que se ve | boceto o descripción densa |
| **Tipo de plano** | escala del encuadre | WS/MS/CU/ECU (ver módulo 03) |
| **Movimiento de cámara** | qué hace la lente | push-in · pan-L · tilt-up · static · handheld |
| **Acción** | qué ocurre en el plano | "el logo se enciende, la cámara empuja" |
| **Diálogo/VO** | texto o locución sobre el plano | "VO: 'La IA ya te está mirando'" |
| **Duración** | segundos estimados | `2.5s` |
| **Audio/nota** | música, SFX, transición de salida | "swell + cut duro a negro" |

**Cómo "dibujarlo" cuando no dibujas** (caso IA/texto): describe el frame con la densidad de un prompt
de imagen — sujeto, encuadre, lente/focal, luz, atmósfera, color, movimiento. Ese texto **es** el
plano y luego alimenta directo el keyframe (módulo 09) o la comp de AE. Ejemplo de celda-texto:

```
SH-04 · CU · push-in lento (3s)
Frame: primerísimo plano del logo del cliente sobre un estrado de madera oscura,
un solo foco cenital lo recorta contra la penumbra; polvo suspendido en el haz.
Lente 85mm, f/2.0, foco en el logo, fondo diluido. Paleta navy + ámbar cálido.
Acción: la cámara empuja 10% mientras el foco sube de intensidad.
Audio: swell de cuerdas + subgrave; corta duro a negro al final.
```

**Densidad correcta:** entre 8 y 30 planos para un spot de 15-30s. Menos = estás saltando decisiones;
más = estás sobre-especificando toma que se decidirán en el edit. Un plano por *idea de encuadre*, no
por segundo.

**Notas de cámara y acción** — vocabulario mínimo para que cualquiera lo lea: `push-in / pull-out`
(dolly), `pan / tilt` (giro sobre eje), `truck / pedestal` (traslación lateral/vertical), `whip`
(giro brusco), `crane`, `handheld`, `static / locked`, `rack focus` (cambio de foco). Craft fino de
cada uno en `modules/03_CINEMATIC_LANGUAGE.md`.

## 5. Animatic — el primer corte que prueba el ritmo

El **animatic** es el storyboard **montado en el tiempo**: los frames puestos en una timeline con su
duración real + **audio scratch** (locución de referencia, música temp, SFX marcados). Es el primer
momento en que el video **existe como experiencia temporal** y puedes *sentir* si el ritmo funciona.

**Por qué el animatic va ANTES de producir — la regla económica del módulo:**

- El ritmo (dónde cortar, cuánto dura cada beat, cuándo entra la música) **solo se puede juzgar en el
  tiempo**, nunca en viñetas estáticas. Un storyboard puede verse perfecto y ser un video muerto.
- Iterar el ritmo en animatic cuesta **minutos y cero créditos**. Iterarlo después de renderizar con
  IA cuesta **créditos + regenerar tomas + rehacer edit**. Descubrir en el animatic que el beat 3
  sobra te ahorra producir un plano que ibas a cortar igual.
- El animatic es el artefacto que **aprueba el cliente/operador** antes de gastar. Aprobar prosa o
  viñetas sueltas garantiza sorpresas en revisión.

**Cómo armarlo (barato):** frames del storyboard (bocetos, stills, o incluso keyframes IA de baja
resolución) en DaVinci/Premiere/AE, cada uno con su duración, + una pista de audio scratch (VO leída
por ti, música temp libre de derechos, SFX marcados con beeps o placeholders). No necesita ser bonito;
necesita tener el **timing real**.

**Checklist de aprobación del animatic** (no produzcas hasta marcar todo):

- [ ] El gancho engancha en los primeros 3s (o 1s en vertical).
- [ ] Cada beat se lee y mueve la historia; ninguno sobra ni se siente largo.
- [ ] La duración total cae dentro del formato objetivo (±10%).
- [ ] La música y los cortes conversan (el corte cae en el beat musical — ver módulo 06).
- [ ] El clímax pega donde debe; la resolución no se arrastra.
- [ ] El CTA se entiende sin narración adicional.
- [ ] Nada viola la marca (SSOT Efeonce, disclosure IA si aplica).

## 6. Previs (cuando aplica)

**Previs** (previsualización) es el escalón para tomas **complejas de cámara/3D**: una maqueta 3D
tosca (Blender/C4D, o incluso bloqueo en IA) que resuelve **movimiento de cámara, encuadre y timing
espacial** antes del render final. Úsalo solo cuando el plano tiene coreografía de cámara no trivial,
paralaje, o interacción 3D — un spot de tipo kinética plana no lo necesita. En pipeline IA, el previs
equivale a **generar keyframes de prueba** para bloquear el camera move antes de comprometer la toma
final (módulo 09). Regla: previs solo los planos donde el riesgo de cámara justifica el costo.

## 7. Shotlist — el puente a la producción

La **shotlist** es la traducción del storyboard aprobado a **órdenes de producción**: la tabla que
dice, plano por plano, con qué mano se hace y con qué especificación. Es lo que abres para producir.
Cierra en `templates/animatic-shotlist.md`.

| Col | Contenido |
|---|---|
| **Shot ID** | `SH-04` (mismo del storyboard) |
| **Descripción** | una línea del plano |
| **Plano / cámara** | CU · push-in |
| **Duración** | 2.5s |
| **Mano** | IA · humano (AE/Blender) · híbrido |
| **Modelo/herramienta** | ej. keyframe → i2v (módulo 09) · AE mograph |
| **Ref/keyframe** | link al still o prompt de partida |
| **Audio del plano** | swell + cut a negro |
| **Estado** | pendiente · en producción · aprobado |

**Aplica a las dos manos:** para IA, cada fila es un `shot-prompt-sheet.md` (módulo 09) esperando
llenarse; para humano, es la especde handoff a After Effects/Blender. El storyboard es el jefe común:
si la toma IA no calza con su celda de storyboard, se regenera — no se acepta "porque salió linda".

---

## Reglas duras del módulo

- **NUNCA** produzcas un plano que no exista en el storyboard aprobado.
- **NUNCA** apruebes producción sin animatic: el ritmo no se juzga en viñetas estáticas.
- **NUNCA** abras con logo o setup lento — el gancho va en los primeros 3s (1s en vertical).
- **NUNCA** confundas concepto con guion: el concepto es una frase + una imagen, no un libreto.
- **SIEMPRE** formaliza el brief antes del concepto; un concepto sobre brief difuso se cae en revisión.
- **SIEMPRE** deja que el storyboard dirija ambas manos (IA y humano): es el contrato común.
- **SIEMPRE** cierra con artefacto: `motion-brief.md`, `storyboard.md`, `animatic-shotlist.md`.

**Delega:** craft de cámara/lente/luz → `modules/03`; ritmo del corte → `modules/06`; safe-zones y
duración por red → `social-media-studio`; producción IA de cada toma → `modules/09` + `higgsfield-*`.
