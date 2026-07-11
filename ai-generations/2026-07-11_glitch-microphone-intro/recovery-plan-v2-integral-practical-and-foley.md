# Plan de recuperación V2 — practical integrado y doble golpe real

> Estado: **propuesto; no autoriza una nueva llamada de generación aún.** Este plan sustituye la ruta de corrección editorial de los takes F e I. Esos clips quedan **rechazados creativamente**: el `ON AIR` compuesto se percibe pegado y el gesto retimado todavía comunica presión, no prueba de sonido.

## Decisión de dirección

La pieza final se realizará como **una toma nueva, continua e íntegra que parte del key visual original intacto**. El `ON AIR` ya existe desde el primer fotograma como parte material de la cabina: una señal roja montada al fondo, con perspectiva, luz, desenfoque, oclusiones naturales y la misma óptica que el micrófono y la mano. No se permitirá borrarlo, neutralizarlo ni reconstruirlo después con crop, máscara, tracking, overlay, tarjeta, layer 2D ni composición sobre el video.

El gesto tampoco se corregirá con retime. La mano debe ser generada o filmada ejecutando una acción de percusión: `hover → golpe breve → rebote visible → hover → golpe breve → rebote`. Si una toma no lo hace, se descarta completa. No se “arregla” el dedo en post.

## Qué se conserva y qué se descarta

| Elemento | Decisión |
| --- | --- |
| Key visual 4K original | Es el **primer frame y referencia visual obligatoria**: cámara, luz, micrófono, consola, mano y `ON AIR` ya están resueltos. Su hash coincide con el archivo entregado nuevamente por el operador: `fde797…4608e`. |
| Storyboard entregado | Conserva la arquitectura narrativa `instante previo → contacto/activación → voz lista`. Sirve para los beats de la toma; el contacto se redefine como dos golpes suaves, no como la presión que sugieren algunos cuadros. |
| Take A de Omni | Sólo referencia histórica de tono y encuadre; no es placa final. |
| Takes E, F e I | Rechazados. No se reutilizan como base, ni visual ni sonora. |
| `ON AIR` | Debe nacer dentro de la toma nueva. Si sus letras derivan, parpadean o parecen añadidas, se rechaza el take entero. |
| Audio nativo de un modelo | Referencia de ritmo/alternativa de audición, nunca aceptación automática. El master se decide por su foley aislado. |

## Ruta recomendada en Google Cloud

1. **Preflight sin generar:** confirmar en Vertex el modelo Veo disponible, cuota, región, duración vertical y la ruta de image-to-video con audio. La evidencia del piloto ya descarta volver a usar el adapter que borraba o difuminaba el letrero, y tampoco justifica otro edit de Omni sobre los clips existentes.
2. **Referencia íntegra:** usar el key visual 4K original **sin adapter que borre el texto** como primer frame/referencia del video. El letrero rojo `ON AIR` ya está físicamente montado en el fondo; el job sólo puede animar la toma y debe conservarlo. Si el motor no acepta ese source o no retiene esa lectura física, no se pasa a una solución de post: se cambia de motor o de mano.
3. **Piloto de performance:** producir una única toma corta de validación con un motor de vídeo de Google Cloud apto para image-to-video y audio nativo. La toma debe ser un plano único, sin cortes ni movimiento de cámara protagonista. No se pide al modelo “arreglar” un clip previo.
4. **Dos takes dirigidos como máximo:** si el piloto pasa la geometría del set, se ejecutan sólo dos variaciones del mismo plano: una con una aproximación ligeramente más contenida y otra con un rebote de yema más legible. No se abren conceptos, encuadres ni estilos nuevos.
5. **Selección dura:** sólo un take que pase todos los gates visuales continúa a sonido. Si el modelo no conserva el practical como objeto de la escena, se detiene la generación y se pasa a una toma física o a una escena 3D completa; nunca a un overlay.

Gemini Omni sí permite generación/edición y audio nativo, pero su comportamiento en este piloto —entrada bloqueada con el practical legible y drift al editar— lo deja fuera de la ruta visual final. Veo se prueba como motor de toma completa, no como promesa de texto perfecto. La exactitud del `ON AIR` se valida en imagen, no se presupone por el nombre del modelo.

## Diseño de la toma nueva

### Puesta en escena

- Vertical 9:16, 24 fps, cinco segundos útiles; macro close-up de 70–85 mm, cámara bloqueada y foco sobre yema/rejilla.
- Micrófono sólido en primer plano derecho; consola y el `ON AIR` ya existentes en segundo plano. El letrero queda **detrás** de la línea de acción de la mano y no cruza su silueta en ningún frame.
- El `ON AIR` del key visual —rojo cálido, pequeño y montado en una superficie existente— debe permanecer sin rediseño. Debe conservar su profundidad de campo y su luz coherente; no flota, no recibe un halo de interfaz y no se mueve independientemente de la cámara.
- Luz low-key azul/navy del key visual, piel cálida y actividad de consola baja. Sin zoom, órbita, paneo, flash, glitch digital, UI ni texto adicional.

### Anatomía y actuación: un golpe, no una presión

El índice entra desde arriba en una curva corta. La acción está impulsada por la articulación interfalángica distal y el nudillo; el antebrazo, muñeca y palma quedan casi inmóviles. La yema, no la uña ni un botón inexistente, hace contacto con la parte superior-frontal de la malla metálica, en un ángulo suave de unos 30–45°. Es un chequeo de audio cuidadoso, no un golpe fuerte.

En cada golpe:

1. la yema espera suspendida a 6–10 mm de la malla;
2. acelera una distancia muy corta;
3. toca la malla por uno, y nunca más de dos, fotogramas;
4. revierte inmediatamente y deja una separación aérea visible de 8–12 mm.

No debe haber una fase de dedo aplastado, malla comprimida, brazo de micrófono vibrando, arrastre sobre la rejilla ni un descenso lento seguido de una liberación. Cualquiera de esas señales hace que el espectador lea “presionar”.

### Timing de actuación a 24 fps

| Tiempo | Acción visible | Criterio |
| --- | --- | --- |
| 0.00–0.54 s | Hover inicial estable. | El espectador entiende qué parte tocará. |
| 0.54–0.62 s | Descenso corto del primer golpe. | Curva humana, no movimiento lineal mecánico. |
| 0.62–0.67 s | Contacto 1 y rebote. | Contacto de 1–2 frames; la yema vuelve a aire. |
| 0.67–1.08 s | Hover intermedio. | Separación inequívoca entre ambos golpes. |
| 1.08–1.17 s | Descenso corto del segundo golpe. | Mismo material y gesto; no un botón. |
| 1.17–1.25 s | Contacto 2 y rebote. | Segunda retirada clara; sin presión sostenida. |
| 1.33–1.70 s | Respuesta de estudio mínima. | Sólo entonces: señal azul existente y consola levemente vivas. |
| 1.70–5.00 s | Settle y corte seco. | Sin música ni tercer evento. |

## Diseño sonoro final

El sonido debe ser el de una yema golpeando suavemente la **rejilla de un micrófono de broadcast en un estudio**, no el de un botón, teclado, interruptor, metal hueco ni efecto de UI.

La ruta preferida es capturar foley aislado de un micrófono real de construcción equivalente: registrar la respuesta mecánica del propio micrófono y una toma cercana de la rejilla a 48 kHz / 24-bit. Se escogen dos golpes de yema suaves, se sincronizan al fotograma de contacto y se mezclan sin música, voz, room tone ni tercer acento. Si se usa sonido nativo de Veo/Gemini, será una toma candidata sometida a la misma escucha; no se conserva por estar sincronizada.

| Capa | Debe oírse | No debe oírse |
| --- | --- | --- |
| Ataque | `toc` corto y amortiguado de yema sobre malla. | Click de mouse, botón plástico, golpe de uña. |
| Cuerpo | Pequeña respuesta grave/media de cápsula y cuerpo del micrófono. | Pop subgrave excesivo, campana metálica o resonancia larga. |
| Cola | Decaimiento seco de aproximadamente 80–120 ms. | Reverb de sala, whoosh, beep, estática o música. |
| Patrón | Dos eventos y sólo dos, en el frame de ambos contactos. | Acento de la señal, tercer golpe o subida musical. |

El segundo golpe puede ser mínimamente más afirmado por interpretación, pero no un “doble click” ni una puntuación electrónica. La respuesta visual posterior no añade un sonido: el silencio que sigue deja que el motivo respire.

## Gates no negociables

### Gate visual de set

- `ON AIR` es parte del mundo desde el primer frame, se lee correctamente y conserva su geometría durante el take.
- Su profundidad, sombras, perspectiva y oclusiones coinciden con el set. No cruza ni tapa el dedo.
- Si el texto cambia, se vuelve blur ilegible, se despega, se reubica o adquiere look de overlay: **rechazo completo**.

### Gate de actuación

- Exactamente dos impactos: yema, malla, 1–2 frames, rebote visible y aire entre ambos.
- Sin presión, deformación de la malla, arrastre, dedos extra o cambio de anatomía.
- La mano y el micrófono permanecen estables; no hay retime correctivo de la performance.

### Gate sonoro

- Dos transientes, sincronizados con ambos contactos y comprobados a velocidad real y a 0,5×.
- Audición comparada en monitores/auriculares, laptop y móvil.
- Rechazo si suena a UI, botón, teclado, golpe fuerte, resonancia de metal exagerada, música, voz, ambiente o tercer evento.

### Gate de entrega

- Sólo se hace un upscale de secuencia o compresión final sobre el take aprobado. Ningún proceso posterior puede modificar la posición/lectura del letrero ni reanimar la mano.
- Se archivan prompt, modelo, fuente, metadata, contact sheet, revisión de frames y decisión de foley para poder auditar el workflow.

## Fallback honesto

Un modelo generativo no obtiene aprobación por prometer texto legible: debe demostrarlo dentro de este plano. Si las dos tomas completas no pasan el gate del `ON AIR`, la ruta correcta es una fuente con practical físico real o una escena 3D íntegra donde el letrero sea geometría del set. Esa alternativa preserva la integración material; **no habilita** volver a componer un rótulo sobre un video ya terminado.

## Resultado buscado

El espectador ve un estudio real, un micrófono real y un técnico probándolo con dos toques suaves. Escucha dos `toc` breves de micrófono, no dos clics. Sólo entonces el estudio responde y Glitch puede abrirse.
