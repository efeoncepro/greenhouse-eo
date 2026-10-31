# TASK-2059 — Motion de la sala y de «Vive el servicio»

Contrato reescrito el 2026-10-31 desde las notas del canvas aprobado («Motion — gramática de la sala» y «Gramática
líquida — vivir el servicio») y el código de `efeonce-rooms` `claude/rooms-approved-ui`. Hereda el contrato de
[TASK-2079](TASK-2079-rooms-orbit-foundation-motion.md): lento-rápido-lento, llegar con impacto, un protagonista a la
vez y sin salto de velocidad entre movimientos.

Fuentes de valores, en `src/components/orbit/motion.ts`:

- `ORBIT_TIMING`: anillo 0–500 ms, arco 400–1400, esfera 1400–1700, halo 1200–2000, medida 600, salto 900 (cerca) o
  1200 (lejos) con fase de elevación del 45 %, mapa 700, revelado del mapa 200, iris 650.
- `ORBIT_EASE`: `arrive` = `axisMotion.ease.emphasized` `cubic-bezier(0.2, 0, 0, 1)`; `transform` =
  `axisMotion.ease.standard` `cubic-bezier(0.4, 0, 0.2, 1)`; `exit` = `axisMotion.ease.emphasizedAccelerate`
  `cubic-bezier(0.3, 0, 0.8, 0.15)` (mapeo `efeonceGraphicLine.motion.curves`).
- `SERVICE_TIMING`: morph 1100 (pico 0,5, desplazamiento 140, aplastado 0,025), marco 1000, cromo 700, seguidores de la
  lente `[0.3, 0.2, 0.15, 0.11]`, crecimiento 0,12, borde 7, viajes brief 1600 / vuelta 1300 / ajuste 1400 / vuelta de
  ajuste 1200 / aprobación 1300, trabajo 1400 (brief) y 1100 (ajuste), bloom 1000, ripple 900, salpicadura 700, cierre
  1600, eco 900, reunión 1300, conteo 900 con 500 de espera, token 45, órbita 0,16 rad/s, reposo 0, asentar 3,2,
  gota 260. `SERVICE_SPRING` = `cubic-bezier(0.2, 1.4, 0.3, 1)`.
- CSS: `--room-duration` = `axisMotion.duration.standard` (200 ms), `--room-duration-short` = 150 ms,
  `--room-ease-arrive`, `--room-ease-transform`, `--room-ease-exit` (`src/styles/theme.ts`).

## Inventario — la sala

| Movimiento | Disparo | Duración | Curva | Qué se mueve | Movimiento reducido |
|---|---|---|---|---|---|
| Salto orbital | Botón de la barra, ← → o escena del mapa estando en un capítulo | 900 ms; 1200 si el destino está a más de 1,5 radios | Elevación (0–45 %) `exit`; aterrizaje `arrive` | Una WAAPI sobre `.room-camera-world`: aleja hasta `liftScale` (≥ 0,36, menor cuanto más lejos) en el punto medio y acerca al destino | Corte directo; foco y hash iguales |
| Llegada del contenido | Fin del aterrizaje (o 420 ms después de entrar desde el mapa); dura 1200 ms (`ARRIVAL_MS`) | 760 ms con 70 ms de escalonado por elemento; la pieza `feature` 1100 ms | `arrive` | `.room-rise` sube 28 px y aparece; `.room-iris-in` abre la pieza con `clip-path: circle()` desde arriba a la izquierda y escala 1,04 → 1 | Sin animación; el contenido ya está |
| Mapa | «Mapa», `M` o Escape; y del mapa a un capítulo | 700 ms | `arrive` | La cámara aleja a la escala de mapa; anillo, arco de recorrido y etiquetas aparecen por opacidad en 200 ms (`transform`) | Corte directo |
| Bienvenida | Al entrar al mapa | 800 ms con 300 ms de espera | `arrive` | La bienvenida sube y aparece | Sin animación |
| Iris | Explorar pieza o una evidencia | Abrir 650 ms; cerrar es corte | `arrive` | `clip-path: circle()` desde el centro del botón de origen hasta cubrir el viewport | Aparece sin transición |
| Cambio de adaptación | Botón de proporción en el explorador | Marco 600 ms; imagen 420 ms | Marco `transform`; imagen `arrive` | El marco cambia de ancho y alto a la nueva proporción sin recortar; la imagen nueva aparece por opacidad | Cambio directo |
| Hoja de radiografía | Al abrir la radiografía | 700 ms con 200 ms de espera | `arrive` | La hoja sube 28 px y aparece | Sin animación |
| Hoja de capítulos (móvil) | «Capítulos · NN/NN» | Abrir 420 ms; cerrar es corte | `arrive` | La hoja sube desde abajo (`translateY(100%)` → 0) | Aparece sin transición |
| Ir a un capítulo (móvil) | Fila de la hoja | La del navegador | Scroll suave nativo | `scrollIntoView` al inicio del capítulo | Scroll directo (`behavior: 'auto'`) |
| Reacción a puntero | Hover sobre una pieza de galería o una tarjeta de escena | 200 ms (`--room-duration`) | `arrive` | Pieza −10 px; tarjeta −4 px con fondo teal tenue y borde; flecha +4 px | Sin desplazamiento |
| Cursor en vivo | Cada evento `cursor.move` recibido | 120 ms | Lineal | `translate` del cursor ajeno, reproyectado cada cuadro mientras la cámara se mueve | Salto directo a la posición |
| Burbuja de pregunta | `question.created` | 500 ms; se retira a los 9 s | `arrive` | La burbuja sube y aparece | Sin animación; mismo tiempo en pantalla |
| Grano | — | Estático | — | — | Se mantiene |

## Inventario — «Vive el servicio» (gramática líquida)

| Movimiento | Escena y disparo | Duración | Curva | Qué se mueve | Movimiento reducido |
|---|---|---|---|---|---|
| Panel nuevo | Todas: cambio de fase, tarjeta de persona, aviso | 620 ms | `arrive` | El panel sube 18 px y aparece | Sin animación |
| Morph líquido | Tu marca: elegir otro lugar | 1100 ms (`morph`) | Seno de 0 a 1 a 0 por cuadro (rAF) | `feDisplacementMap` sube de 0 a 140 en el pico y vuelve a 0; la turbulencia se afina; el escenario se aplasta ± 2,5 %; el contenido cambia en el pico (50 %), nunca a la vista | Cambio directo de lugar |
| Marco y cromo | Tu marca: el mismo cambio | Marco 1000 ms (`frame`); cromo 700 ms (`chrome`); esfera 1100 ms | `arrive` | La caja de la pieza toma la posición y el tamaño del nuevo soporte; el teléfono, la valla o el navegador aparecen con escala 0,97 → 1; la esfera gira 90° por paso | Directo |
| Lente de construcción | Tu marca: «Ver cómo está hecha» | Continuo mientras está abierta; crece con factor 0,12 por cuadro | Resorte por seguimiento (rAF) | Una gota principal y tres menores la persiguen con factores 0,3 / 0,2 / 0,15 / 0,11, fundidas por un filtro goo; dentro se ve la construcción. Sin puntero, deriva en una figura de Lissajous; con puntero, lo sigue. La nota más cercana (≤ 150 px) se anuncia | Lente quieta al centro, sin seguidores ni deriva; notas listadas para lectores |
| Carretera y story | Tu marca, lugares `ooh` y `story` | Rayas 2,6 s en bucle; barra de story 5 s en bucle | Lineal | Decorativo | Sin animación |
| Gota en tránsito | Ciclo: «Enviar brief», «Pedir este ajuste», «Aprobar» | Ida 1600 / vuelta 1300 (brief); 1400 / 1200 (ajuste); 1300 (aprobación); trabajo 1400 o 1100 | Ease-in-out cúbico literal en JS | Cuatro gotas (radios 17, 12, 9, 6) recorren el arco de la órbita entre «Tú» y Efeonce con retraso de 4 % entre sí y se absorben al llegar | Saltos de fase inmediatos |
| Salpicadura | Ciclo: llegada a Efeonce y eco en «Tú» 900 ms después de aprobar | 700 ms | Seno amortiguado | El polo rebota hasta 1,22 y un anillo crece de 30 a 90 y se desvanece | Sin salpicadura |
| Bloom y ripple | Ciclo: llega la propuesta / llega un ajuste | Bloom 1000 ms; ripple 900 ms | `arrive` (bloom en CSS) y seno (desplazamiento) | La pieza se abre en círculo y su desplazamiento baja de 90 a 0; el ajuste ondula hasta 60 y vuelve | La pieza aparece y cambia directo |
| Efecto del ajuste | Ciclo: la edición nueva aplica el ajuste | 900 ms | `arrive` | Filtro (luz, contraste, calidez) o encuadre más cerrado sobre la imagen | Directo |
| Cierre del ciclo | Ciclo: aprobado | Órbita 1600 ms; sello 700 ms tras 600 | Órbita `--room-ease`; sello `--sd-spring` | El trazo teal cierra la órbita completa; el sello «Aprobada» cae con giro de −8° | Órbita cerrada y sello sin animación |
| Pasos | Ciclo: cada fase | 900 ms | `arrive` | La línea de progreso avanza un 25 % por paso | Directo |
| Burbujas | Respuestas: siempre | Continuo | Seno | Cada pregunta deriva ± 9 px y ± 7 px; la membrana goo late ± 3 px | Quietas |
| Reunión | Respuestas: «Hoy» ↔ «Con el plan» | 1300 ms (`gather`) | Seno | Las burbujas se acercan un 60 % al centro y la membrana crece 26 px; la respuesta cambia en el pico y vuelven a separarse | Cambio directo |
| Conteo | Respuestas: mismo cambio | 900 ms tras 500 ms | Ease-out cúbico | «aparece en N de T» cuenta hasta el nuevo número | Número final directo |
| Respuesta que se escribe | Respuestas: elegir pregunta o momento | Un token cada 45 ms; cada token 360 ms | `arrive` | Las palabras aparecen con desenfoque 4 → 0; la marca se resalta; fuentes y nota 500 ms | Respuesta completa de una vez |
| Selector de momento | Respuestas | 600 ms | `cubic-bezier(0.2, 1.2, 0.3, 1)` literal | La tinta teal se desliza al botón activo | Directo |
| Órbita del equipo | Equipo: siempre | 0,16 rad/s; aceleración con factor `dt·2,5` | Integración por cuadro | Las personas giran sobre una elipse de 340 × 150 con profundidad (escala 0,74–1, opacidad 0,6–1) | Posiciones fijas |
| Reposo bajo el cursor | Equipo: puntero dentro o foco dentro del escenario | Frena con factor `dt·2,5` | — | La órbita se detiene (WCAG 2.2.2) y retoma al salir | No aplica: ya está quieta |
| Persona elegida | Equipo: clic en una persona | Asienta con factor `dt·3,2` | — | La órbita gira hasta dejar a la persona al frente; seis gotas viajan de ella a «Tú» | La persona queda al frente sin giro; gotas fijas |
| Semana | Equipo: al entrar y con «Ver la semana otra vez» | Gota 900 ms con 260 ms de escalonado (+300); día 760 ms (+1080) | Gota `cubic-bezier(0.55, 0, 1, 0.45)` literal; día `arrive` | Cada día recibe una gota que cae y se vierte en su tarjeta | Semana completa sin animación |

## Reglas

- La órbita no gira, no late y no indica espera en la sala. En «Vive el servicio» la gota solo existe cuando hay trabajo
  moviéndose: no es un loader.
- Un solo protagonista: durante el salto no anima el contenido; sube cuando la cámara se asienta.
- Interrumpir: un segundo salto cancela el anterior (`Animation.cancel`) y parte desde la posición actual; nunca encola.
  En el morph de lugares, un cambio nuevo cancela el cuadro pendiente y parte otra vez.
- El foco no espera a la animación: se mueve al título destino al empezar el aterrizaje; el iris y la hoja cierran en
  corte.
- `prefers-reduced-motion` se lee con `matchMedia` y se reevalúa en caliente (`useReducedMotion`); `shouldAnimate`
  también aplica el estado final con la pestaña oculta o sin WAAPI.
- Excepciones a «ninguna curva literal» (deuda registrada, todas dentro de `service.css`, `invitation-stage.css` o JS
  de escena): `--sd-spring` redeclara el valor de `SERVICE_SPRING`; la tinta del selector de momento, la caída de la
  semana y el ease cúbico de la gota usan curvas propias. Se reemplazan por tokens cuando AXIS publique un resorte.

## GVC / Micro Evidence

- `.webm` de `/demo/sala` en 1440×900: salto 01 → 02 y 02 → 05 (lejano), mapa y vuelta, explorar pieza con cambio a
  9:16, radiografía, dos clics rápidos seguidos en la barra.
- `.webm` de cada escena en `/demo/vive/:blockId`: cambio de lugar con morph y lente abierta; ciclo completo con un
  ajuste y aprobación; «Hoy» ↔ «Con el plan»; elegir persona, mover el puntero dentro y fuera del escenario y repetir la
  semana.
- Repetir todo con `prefers-reduced-motion: reduce` y comprobar que el estado final es idéntico y no queda movimiento.
- Medir con Performance: ningún cuadro > 16 ms en el salto, el morph y la lente en escritorio; registrar el móvil de
  prueba disponible.
- Dossier: `docs/ui/reviews/TASK-2059-rooms-first-experience/`.

## Design Decision Log

- 2026-10-30 — Duraciones del salto (900/1200 con 45 % de elevación) y del mapa (700) del contrato de TASK-2079. El
  canvas proponía 480 + 820 ms y 900 ms; se conservó la base ya probada para que la sala y el laboratorio se muevan
  igual.
- 2026-10-30 — El contenido sube tras el aterrizaje (un protagonista a la vez); descartado animarlo durante el salto.
- 2026-10-31 — Gramática líquida con SVG (`feTurbulence`, `feDisplacementMap`, goo) y rAF; sin librería nueva.
  Alternativa descartada: Lottie o video, que no responden al contenido real de cada sala.
- 2026-10-31 — La órbita del equipo se detiene bajo el puntero y con foco dentro (WCAG 2.2.2).
- Riesgo abierto: la deriva de las burbujas de «Respuestas» y los bucles de la carretera y de la story no tienen pausa
  propia más allá del movimiento reducido. Con más de 5 s junto a otro contenido, WCAG 2.2.2 pide un control de pausa o
  detenerlos bajo el puntero, como la órbita del equipo. Se resuelve antes de la aceptación humana.
- Riesgo abierto: la hoja de radiografía no dibuja el hilo de 400 ms del canvas; hoy el hilo es una regla estática.
