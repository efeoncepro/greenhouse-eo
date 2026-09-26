# SKY × Efeonce — revisión 6

## Objetivo y fallos corregidos

Pieza cinematográfica completa de 30 segundos. Una solicitud Seedance para toda la continuidad. La generación visual lleva `generate_audio=false`. Música instrumental y SFX se producen y mezclan aparte; ningún audio de versiones anteriores entra al máster.

La revisión 5 reiniciaba la aproximación al cortar al tercer ángulo del avión y restringía los paneles a mirar de frente, contradiciendo los recorridos laterales. Esta revisión utiliza el primer tramo visual de Minimax como referencia de movimiento y una nueva referencia fotográfica de salida trasera para el avión.

## Desglose de dirección

| Tiempo objetivo | Acción y lectura | Cámara / continuidad |
|---|---|---|
| 0–2,2 | Caja de búsqueda y pregunta | A: establecimiento aéreo; B: travelling macro lateral, panel anclado al mundo |
| 2,2–4,2 | Tres resultados SKY | C: órbita baja oblicua, profundidad y primer plano de nubes |
| 4,2–5,6 | Solo turno del usuario | A: reencuadre y pausa; resultados retirados antes de la respuesta |
| 5,6–8 | Respuesta del LLM y cita SKY | C: arco con cambio real de perspectiva y pausa frontal para leer |
| 8–9,5 | Cita morada brilla y ocupa el encuadre | B: macro y avance dentro del brillo; la interfaz termina aquí |
| 9,5–11,8 | A320neo se aproxima | A: cámara anclada; crecimiento rápido y creíble en escala |
| 11,8–12,7 | Avión pasa completo sobre cámara | C: contrapicado del fuselaje; velocidad conservada |
| 12,7–15,5 | Avión continúa alejándose | B: tres cuartos trasero, cola hacia cámara y nariz alejándose; nunca reiniciar aproximación |
| 15,5–18 | Un año creando con SKY. | A: travelling de tipografía espacial, con pausa de lectura |
| 18–20,5 | +2.000 piezas. | B: acercamiento de escala más fuerte |
| 20,5–23 | Y ahora nos eligió como su agencia SEO/AEO. | C: órbita y estabilización para lectura |
| 23–25 | ¡Gracias, SKY! | A: ascenso de cámara |
| 25–27 | Cierre azul Efeonce / SKY / URL bubble | Composición fija completa |
| 27–28,2 | Fondo azul cambia a morado SKY | Logos y URL permanecen fijos |
| 28,2–30 | Cierre morado | Pausa final |

## Jerarquía de referencias

1. Activos oficiales: geometría del mismo A320neo, livery, logos, textos y tipografía.
2. Referencias fotográficas: material del avión, luz y cielo realista. La nueva vista trasera reemplaza la anterior lateral/frontal.
3. Vídeo Minimax 0–5,8 s: exclusivamente movimiento y perspectiva de interfaz. No transferir su tipografía, avión ni audio.
4. Placas de UI: estados narrativos inequívocos. Las placas son guías, no diapositivas estáticas.

## Revisión del resultado, no solo del prompt

- Confirmar cero streams de audio en el bruto de Seedance antes de mezclar.
- Examinar la secuencia completa a cuatro fotogramas por segundo y los cortes de vuelo con más detalle.
- Comprobar presencia y orden de los estados: búsqueda, resultado, turno solo, respuesta, cita, brillo, avión, mensajes, gracias, azul, morado.
- Rechazar tercera vista que vuelva a presentar el morro hacia cámara, cambie la dirección o produzca desaceleración aparente abrupta.
- Rechazar avión de plástico, cambio de modelo, humo de alas, morphing de motores o geometría imposible.
- Comprobar perspectiva y parallax reales de interfaz, y legibilidad de las pausas. No confundir inclinación del horizonte con desplazamiento de cámara.
- Comprobar que no reaparece ningún chip en los mensajes posteriores al avión.
- Medir duración, resolución, nivel de audio y pico real del archivo entregado. Transcribir el audio final como comprobación adicional de ausencia de palabras.
- Registrar incumplimientos sin declarar aprobado un render solo porque terminó.

## Audio

Música original electrónica/orquestal solicitada en modo instrumental explícito. SFX separados de UI, brillo y un único paso de reactor con caída Doppler. Sin narrador, diálogo, canto, coro ni radio. La mezcla mapea únicamente el vídeo nuevo y las fuentes nuevas. El sonido del paso se alinea al instante real del avión, no al tiempo supuesto del prompt.

## Evidencia

`references.json`: 30 referencias con hashes. `sky-v6.prompt.txt`: instrucción completa. `estimate.log`: payload con audio desactivado y referencia Minimax. `submit.log`: ID único del trabajo. `audio-sources.json`: procedencia de las fuentes sonoras. La revisión del render se registra después de inspeccionarlo.
