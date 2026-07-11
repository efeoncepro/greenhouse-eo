# Plan de recuperación V2 — practical integrado y doble golpe real

> Estado: **sin toma aprobada; rutas generativas T–Z agotadas y gasto detenido.** Este plan sustituyó la corrección editorial de F e I. Esos clips siguen **rechazados creativamente**: el `ON AIR` compuesto se percibe pegado y el gesto retimado comunica presión, no prueba de sonido.

## Addendum de ejecución — Fal / Seedance 2.0

S usó el key visual 4K íntegro como referencia de `bytedance/seedance-2.0/image-to-video`, sin borrar, difuminar ni recomponer el `ON AIR`. La continuidad del set aprobó: cámara, paleta, cabina, mano, micrófono y practical quedaron fieles al material entregado. S se rechaza completo porque el índice se queda apoyado demasiado tiempo y el audio nativo no deja dos golpes aislados comprobables. La revisión canónica es [take-s-seedance-source-keyvisual-review.md](./review/take-s-seedance-source-keyvisual-review.md).

T se ejecutó después de la recarga (`019f51ce-780f-7533-b4be-60e11f3e0d5b`). Conservó el set y el practical, pero sostuvo ambos contactos y su audio nativo tuvo actividad fuera del patrón de dos respuestas. U/V/X intentaron transferir guías temporales de uno o dos frames; Seedance volvió a expandirlas. W/Veo produjo dos contactos largos y una luz ajena; Y/Kling no corrigió la presión y degradó la continuidad; Z/Seedance usó una actuación humana como referencia, pero abrió apoyado y no separó dos taps. La evidencia consolidada está en [review/takes-u-to-z-guided-recovery-review.md](./review/takes-u-to-z-guided-recovery-review.md).

No se autoriza otra variante equivalente de generación, edición o prompt. El costo estimado T–Z es US$10.44 más token billing de Seedance. No existe master ni candidata; no se mezcla audio, no se publica y no se copia ningún output a producción.

## Evidencia histórica de Omni / Vertex

La ruta no usa Veo. Los takes anteriores A–I y el take O se realizaron con `gemini-omni-flash-preview` en Vertex AI, región `global`. La imagen 4K íntegra y el video generado con una señal legible fueron bloqueados antes de generar/editar con `promptFeedback.blockReason=OTHER`; no se pudo aislar que la palabra fuera la causa única. Una generación Omni sólo desde texto sí produjo una señal `ON AIR` físicamente montada en el set. Por ello se usó el key visual como dirección y se generó una toma de reemplazo íntegra, no una capa ni una recomposición.

El take O quedó rechazado por el operador: aunque su practical y foley aislados eran plausibles, la toma text-only cambió el diseño, la paleta, el micrófono y la composición fuente. El take N se descartó porque una coreografía por frames convirtió el segundo gesto en presión. La regla vigente es dirigir el comportamiento humano y auditar cada frame; los límites temporales de T son un criterio de aceptación, no una licencia para convertir la acción en una animación rígida.

## Decisión de dirección

La pieza final se realizará como **una toma nueva, continua e íntegra dirigida por el key visual original**. El `ON AIR` existe desde el primer fotograma como parte material de la cabina: una señal roja montada al fondo, con perspectiva, luz, desenfoque, oclusiones naturales y la misma óptica que el micrófono y la mano. No se permitirá borrarlo, neutralizarlo ni reconstruirlo después con crop, máscara, tracking, overlay, tarjeta, layer 2D ni composición sobre el video. Si el proveedor bloquea el source intacto, no se fuerza ese input: se genera el plate completo desde texto bajo esta dirección.

El gesto tampoco se corregirá con retime. La mano debe ser generada o filmada ejecutando una acción de percusión: `hover → golpe breve → rebote visible → hover → golpe breve → rebote`. Si una toma no lo hace, se descarta completa. No se “arregla” el dedo en post.

## Qué se conserva y qué se descarta

| Elemento | Decisión |
| --- | --- |
| Key visual 4K original | Es la **referencia de dirección obligatoria**: cámara, luz, micrófono, consola, mano y `ON AIR` ya están resueltos. Su hash coincide con el archivo entregado nuevamente por el operador: `fde797…4608e`. No se transmite mientras Omni bloquee el practical legible. |
| Storyboard entregado | Conserva la arquitectura narrativa `instante previo → contacto/activación → voz lista`. Sirve para los beats de la toma; el contacto se redefine como dos golpes suaves, no como la presión que sugieren algunos cuadros. |
| Take A de Omni | Sólo referencia histórica de tono y encuadre; no es placa final. |
| Takes E, F e I | Rechazados. No se reutilizan como base, ni visual ni sonora. |
| `ON AIR` | Debe nacer dentro de la toma nueva. Si sus letras derivan, parpadean o parecen añadidas, se rechaza el take entero. |
| Audio nativo de un modelo | Referencia de ritmo/alternativa de audición, nunca aceptación automática. El master se decide por su foley aislado. |

## Ruta histórica en Google Cloud (no ejecutar para V2)

1. **Preflight sin generar:** confirmar en Vertex el modelo Omni, cuota, región y autenticación de `gcloud`. La evidencia descarta volver a usar el adapter que borraba o difuminaba el letrero, y tampoco justifica otro edit de Omni sobre clips que ya contengan el practical bloqueado.
2. **Input discriminado:** probar una vez el key visual íntegro sin adapter. Si devuelve `OTHER` tanto con prompt mínimo como con probe neutro, registrar la evidencia y dejar de insistir con ese mismo input.
3. **Toma íntegra Omni:** generar sólo desde texto el plano completo, usando el key visual y storyboard como dirección; la señal `ON AIR` se describe como practical físico del set, nunca como texto sobrepuesto.
4. **Dos takes dirigidos como máximo:** variar la dirección humana —una aproximación contenida y un rebote de yema más legible— sin numerar fotogramas ni abrir conceptos/encuadres nuevos.
5. **Selección dura:** sólo un take que pase set, actuación y sonido continúa a finish. Si la señal se degrada o parece overlay, se rechaza el take entero; nunca se repara en post.

Gemini Omni permite generación/edición y audio nativo, pero el preview puede bloquear una combinación de input sin especificar causa. En esta ejecución, Omni siguió siendo el motor visual final porque sí consiguió una toma íntegra mediante texto. La exactitud del `ON AIR` se valida en imagen, no se presupone por el nombre del modelo.

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

La ruta preferida es capturar o generar la salida real de una cadena de prueba `micrófono → preamp → corneta/monitor`: el gesto físico excita la cápsula, pero el espectador oye la respuesta amplificada del sistema, no el golpe de yema contra la rejilla en primer plano. Se escogen dos respuestas breves de monitor, se sincronizan al fotograma de contacto y se mantienen sin música, voz, room tone persistente ni tercer acento. Si se usa sonido nativo de un modelo, será una toma candidata sometida a la misma escucha; no se conserva sólo por estar sincronizada.

| Capa | Debe oírse | No debe oírse |
| --- | --- | --- |
| Ataque | Impulso de cápsula/preamp reproducido por el monitor; corto, limitado en banda y no close-miked. | Click de mouse, botón plástico, golpe directo de uña o piel sobre metal. |
| Cuerpo | Respuesta grave/media contenida de la corneta/monitor, con carácter de señal amplificada. | Pop subgrave excesivo, boom cinematográfico, campana metálica o resonancia larga. |
| Cola | Decaimiento amortiguado de cono de aproximadamente 80–120 ms. | Reverb de sala evidente, whoosh, beep, estática o música. |
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

Un modelo generativo no obtiene aprobación por prometer texto legible o contacto breve: debe demostrar ambos dentro del plano. T–Z demostraron que, con la fuente actual contradictoria, el set puede preservarse pero el contacto se expande de forma sistemática; las ediciones además introdujeron artefactos. La ruta vigente es aprobar primero una fuente precontacto coherente —mismo set, practical y composición, pero dedo en hover y señal aún no disparada— o cambiar explícitamente la narrativa para aceptar el contacto inicial. La ruta 3D fue explorada y rechazada por dirección. Ninguna alternativa habilita retimar el dedo ni componer un rótulo sobre un video ya terminado.

## Resultado buscado

El espectador ve un estudio real, un micrófono real y un técnico probándolo con dos toques suaves. Escucha dos respuestas breves por la corneta/monitor —la confirmación de que el canal tiene señal—, no el golpe acústico sobre la rejilla ni dos clics. Sólo entonces Glitch puede abrirse.
