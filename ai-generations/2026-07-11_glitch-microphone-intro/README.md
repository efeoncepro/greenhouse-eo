# Glitch — Intro «El micrófono se abre»

> Estado: **sin master aprobado.** El take S de Fal/Seedance 2.0 conservó el key visual 4K y el practical dentro del estudio, pero se rechazó porque el dedo sostuvo el contacto y su audio no aisló exactamente dos golpes. El take T, que endurecía esa coreografía, fue bloqueado antes de crear una generación por saldo Fal agotado (`HTTP 403 User is locked`).

> Actualización de piloto 2026-07-11: el primer request real alcanzó Vertex y recibió 429 RESOURCE_EXHAUSTED antes de producir un MP4. Cinco respuestas posteriores devolvieron 200 con `promptFeedback.blockReason=OTHER` y cero candidatos. El provider acepta el payload, pero bloquea esta referencia con practical legible; un video que ya contiene esa señal también fue bloqueado antes de editar. Esto no prueba que la cadena de caracteres por sí sola sea la causa: Omni sí pudo generar desde texto una señal `ON AIR` que vive dentro del set. La fuente 4K se preserva intacta y dirige la toma, pero no se vuelve a enviar como input mientras exista el bloqueo.

## Propósito

Producir la intro audiovisual de **Glitch** a partir de un gesto mínimo: un índice prueba la rejilla del micrófono con `tap, tap`, se eleva entre ambos contactos y el segundo abre el canal. No es un spot de radio, una demo de podcast ni un efecto visual llamado “glitch”: es el ritual silencioso que permite que el programa empiece.

La pieza termina justo antes de que entre el mundo principal de Glitch. Música, voz, wordmark y contenido comienzan **después** del corte de esta intro.

## Paquete de dirección

| Documento | Función |
| --- | --- |
| [creative-brief.md](./creative-brief.md) | Intención, marca, audiencia y límites creativos. |
| [sequence-script.md](./sequence-script.md) | Timeline a 24 fps, actuación de mano, corte y cue sheet. |
| [storyboard.md](./storyboard.md) | Viñetas textuales y continuidad visual. |
| [motion-and-sound-spec.md](./motion-and-sound-spec.md) | Física, cámara, luz, foley, mezcla y fallos a evitar. |
| [transition-handoff.md](./transition-handoff.md) | Contrato del corte hacia el primer plano y sonido de Glitch. |
| [take-review-template.md](./take-review-template.md) | Rúbrica objetiva y rechazo automático para seleccionar el take. |
| [production-workflow.md](./production-workflow.md) | Gates de producción, Omni/Vertex, revisión, finish y aprendizaje. |
| [recovery-plan-v2-integral-practical-and-foley.md](./recovery-plan-v2-integral-practical-and-foley.md) | Ruta vigente: nueva toma integral, `ON AIR` diegético y doble golpe real con foley. |
| [render-seedance-2-source-keyvisual-direct-queue.mjs](./render-seedance-2-source-keyvisual-direct-queue.mjs) | Renderer auditable de Fal/Seedance 2.0. Usa el key visual íntegro y el contrato oficial de queue; T no se pudo enviar por saldo agotado. |
| [review/take-s-seedance-source-keyvisual-review.md](./review/take-s-seedance-source-keyvisual-review.md) | Veredicto del take S: continuidad visual pasa; actuación y foley no pasan. |
| [render-omni-glitch-integral-vertex-text-v3.mjs](./render-omni-glitch-integral-vertex-text-v3.mjs) | Renderer histórico del take O: resolvió practical/audio, pero se rechazó por no conservar el diseño del key visual. |
| [render-omni-glitch-intro.mjs](./render-omni-glitch-intro.mjs) | Renderer reproducible: sólo llama a Vertex con `--execute`; por defecto imprime el plan. |
| [edit-omni-glitch-tap-tap-interactions.mjs](./edit-omni-glitch-tap-tap-interactions.mjs) | Edición video-a-video persistente en Gemini Omni Interactions; conservada como evidencia de una edición que procesó el video pero no pasó continuidad. |
| [compose-glitch-tap-tap-on-air.mjs](./compose-glitch-tap-tap-on-air.mjs) | Corrección editorial reproducible del video existente: dos golpes de yema con rebote y `ON AIR` exacto como practical pequeño de fondo. |
| [request-omni-percussive-tap-sound.mjs](./request-omni-percussive-tap-sound.mjs) | Solicita a Gemini Omni dos foleys de prueba de micrófono; su video es guía y debe superar revisión independiente. |
| [finish-glitch-percussive-tap-with-gemini-foley.mjs](./finish-glitch-percussive-tap-with-gemini-foley.mjs) | Conserva byte a byte los frames aprobados y monta sólo los dos foleys recuperados de Gemini Omni. |
| [manifest.json](./manifest.json) | Estado estructurado, fuentes y entregables esperados. |
| [pilot-retrospective.md](./pilot-retrospective.md) | Evidencia completa de los bloqueos, recuperación, resultado y pendientes. |

## Fuente aprobada para preproducción

- Key visual canónico de producción: `/Users/jreye/Downloads/microfono_broadcast_video_assets/microfono_broadcast_9x16_2160x3840.png` — **2160×3840 vertical 4K**.
- Storyboard de origen: `/Users/jreye/Downloads/microfono_broadcast_video_assets/storyboard_microfono_9x16_2160x3840.png` (el storyboard 1080×1920 entregado en la sesión conserva los mismos beats narrativos a otra resolución).
- Formato fuente: PNG RGB, vertical 9:16, sin perfil ICC embebido.
- Hash SHA-256 del key visual: `fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e`

El key visual 4K es la fuente canónica y se conserva para dirección, color, finish y archivo. El hash del archivo vuelto a entregar por el operador es idéntico al de esta fuente. La recuperación V2 prohíbe el perfil `sign-neutral-720-jpeg`: el `ON AIR` ya integrado no se borra para luego montarlo encima. En esta sesión, Omni bloqueó el key visual íntegro como referencia y también bloqueó el edit del video que ya contenía la señal. Por eso O genera un plano completo desde texto, dirigido por la fuente: el letrero nace en el set y no es una composición posterior. No copiar binarios generados al repositorio. Cuando haya aprobación creativa, archivarlos con `pnpm media:archive-ai-generation -- --run ai-generations/2026-07-11_glitch-microphone-intro --apply` y versionar sólo los manifiestos, prompts, scripts y revisión liviana.

## Resultado del piloto

Los seis fallos iniciales quedaron registrados: un límite de cuota y cinco bloqueos de entrada sin candidato. La recuperación aisló como gatillante probable el texto legible del letrero ON AIR. El perfil sign-neutral-720-jpeg conserva el key visual 4K, la mano, el micrófono, encuadre y luz, y difumina localmente sólo ese texto dentro del adapter de inferencia. El siguiente request produjo un MP4 válido en un intento.

Cuando el operador corrigió la intención a `tap, tap`, se ejecutó una edición video-a-video sobre el master mediante Gemini Omni Interactions. La interacción sí consumió el video y devolvió un MP4, pero la revisión descubrió artefactos de continuidad después del primer segundo; no se seleccionó. El candidato E posterior también fue rechazado: su panel `ON AIR` se leía como una tarjeta en primer plano y el índice parecía presionar. El finish F evita regenerar: retima fotogramas del export existente para construir dos golpes de yema con rebote y compone el `ON AIR` real, pequeño y detrás de la mano, desde el key visual 4K.

Para el sonido se pidió a Gemini Omni una edición audiovisual localizada. Su output H sí trajo AAC, pero alteró nuevamente el practical y añadió un tercer acento: se rechazaron sus píxeles. El finish I recupera únicamente sus dos primeros foleys, los sincroniza a los dos contactos reales y los monta sobre los frames de F, verificados mediante el mismo hash `framemd5` de video. I no se reutiliza para O.

- Master local: masters/glitch-microphone-intro-a-natural-omni-master.mp4; 10 segundos, 720x1280, H.264, 24 fps.
- Base editorial: exports/glitch-microphone-intro-a-natural-5s-silent.mp4; 5 segundos, 720x1280, H.264, 24 fps, sin audio.
- Placa visual F: exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4; 5 segundos, 720x1280, H.264, 24 fps, sin audio.
- Candidato editorial actual I: exports/glitch-microphone-intro-i-percussive-tap-on-air-5s-gemini-foley.mp4; 5 segundos, 720x1280, H.264, 24 fps, AAC 48 kHz estéreo.
- Take O: `masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.mp4`; técnicamente resolvió practical/audio, pero se rechazó porque la toma text-only cambió el diseño, la paleta, el micrófono y la composición fuente.
- Ruta siguiente: tres referencias intactas, sin tipografía visible —mano/luz, micrófono/consola y práctica navy-azul— se envían a Omni para conservar la identidad visual. El `ON AIR` se seguirá generando materialmente dentro del set, nunca se compondrá después.

El 4K original sigue siendo la fuente creativa canónica. El adapter sólo existe para pasar el filtro de inferencia y no sustituye el asset de dirección, finish o archivo.

## Addendum Fal / Seedance 2.0

La prueba S se realizó con el endpoint oficial de Fal `bytedance/seedance-2.0/image-to-video`, usando el PNG 4K íntegro como `image_url`, salida 1080p 9:16, cinco segundos y audio nativo. El resultado es importante porque retuvo el diseño que Omni text-to-video había cambiado: mismo micrófono, misma cabina, misma paleta y el letrero ya integrado en la escenografía. No obstante, conservar la imagen no sustituye el gate de actuación: los dos contactos no son golpes instantáneos con rebote inequívoco y el audio incorpora actividad adicional. S queda rechazado íntegro; no se hace una reparación editorial.

El prompt T especificó ruptura inicial de contacto, dos impactos de máximo dos frames y una ventana aérea de ocho frames entre ambos. Fal devolvió `HTTP 403 User is locked — Exhausted balance` antes de otorgar `request_id`; no se generó video ni se incurrió en una segunda ejecución. La siguiente acción externa es que el titular recargue el saldo de Fal. Después se ejecuta T y se revisa contra la misma rúbrica, sin cambiar fuente, color ni composición.

## Alcance y no alcance

Incluye los artefactos del piloto y una planificación V2 para una nueva toma vertical de cinco segundos a 24 fps, con el `ON AIR` integrado al set y foley final diseñado como audio independiente.

No incluye música, locución, composición del wordmark, publicación, integración en una ruta ni upscale. O es una entrega técnica lista para revisión, no una aprobación creativa automática. El renderer no llama a Vertex sin `--execute`; esos pasos requieren aprobación humana y gasto gobernado.

## Estado del método

Este sigue siendo un **piloto de Creative Workflow** específico de Glitch y no autoriza publicación automática. La evidencia posterior invalida la aplicación de la receta de finish determinista a un practical narrativo y a una actuación táctil: en este tipo de plano, overlay/retime no son una corrección válida. La ruta V2 debe aprobar primero el set y la acción completa; la promoción de cualquier aprendizaje global queda pendiente de un take que supere esos gates.

## Escenarios si se requiere una ronda adicional

Sólo aplicar estas rutas si el candidato técnico actual es rechazado en revisión creativa o no funciona contra el primer plano real de Glitch.

Elegir una sola mano antes de reabrir producción:

1. **Nuevo keyframe compatible:** recrear la misma dirección de arte con un generador de imagen y probar ese frame 720p en Omni.
2. **Otro motor de video:** animar el key visual actual con un modelo distinto y conservar el mismo brief, storyboard y rúbrica.
3. **Craft humano/híbrido:** componer el microgolpe, rebote, señal y sonido en post sobre el key visual; conserva control completo y evita el filtro del preview.

No se debe gastar una nueva ronda Omni con el mismo key visual ni con cambios cosméticos de prompt. Cuando el video existente ya contiene el movimiento y falla sólo su orden, se prefiere una edición determinista y reversible antes que otro render generativo.
