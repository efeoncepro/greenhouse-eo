# Glitch — Intro «El micrófono se abre»

> Estado: **sin master aprobado; producción detenida.** T–Z fallaron los dos contactos de 1–2 frames o la continuidad. El blocking 3D posterior demostró control temporal, pero fue rechazado por dirección porque la reconstrucción visual era claramente inferior al key visual. No se retima la actuación, no se recompone el `ON AIR`, no se prepara candidata y no se publica ni se copia nada a un bundle de producción.

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
| [recovery-plan-v3-integral-3d.md](./recovery-plan-v3-integral-3d.md) | Evidencia de una ruta 3D explorada y **rechazada por dirección visual**. |
| [review/source-state-and-creative-video-workflow-audit.md](./review/source-state-and-creative-video-workflow-audit.md) | Auditoría de causa raíz, benchmark Higgsfield/Magnific/Runway/Firefly/Flow/Luma y workflow corregido. |
| [review/v3-blocking-review.md](./review/v3-blocking-review.md) | Blocking: timing técnico válido, calidad visual rechazada; no continuar. |
| [build-blender-v3-blocking.py](./build-blender-v3-blocking.py) | Construcción reproducible de la escena proxy y sus dos contactos de un frame. |
| [v3-blocking.metadata.json](./v3-blocking.metadata.json) | Versión Blender, fuente/licencia, hashes y URIs privadas del blocking. |
| [render-seedance-2-source-keyvisual-direct-queue.mjs](./render-seedance-2-source-keyvisual-direct-queue.mjs) | Renderer auditable de Fal/Seedance 2.0. Usa el key visual íntegro y el contrato oficial de queue. |
| [review/take-s-seedance-source-keyvisual-review.md](./review/take-s-seedance-source-keyvisual-review.md) | Veredicto del take S: continuidad visual pasa; actuación y foley no pasan. |
| [review/take-t-seedance-source-keyvisual-review.md](./review/take-t-seedance-source-keyvisual-review.md) | Veredicto del take T: continuidad visual pasa; actuación y foley no pasan. |
| [review/takes-u-to-z-guided-recovery-review.md](./review/takes-u-to-z-guided-recovery-review.md) | Registro consolidado de requests, artefactos, costos, gates y rechazo de U–Z. |
| [render-seedance-2-reference-guided-tap-tap.mjs](./render-seedance-2-reference-guided-tap-tap.mjs) | Renderer versionado para las pruebas guiadas U/V/X/Z de Seedance. |
| [render-veo-3-1-hover-source-double-tap.mjs](./render-veo-3-1-hover-source-double-tap.mjs) | Renderer de W desde un frame hover íntegro y sin audio. |
| [edit-kling-o3-pro-tap-rebound.mjs](./edit-kling-o3-pro-tap-rebound.mjs) | Editor de Y; queda como evidencia rechazada, no como herramienta de finish aprobada. |
| [finish-glitch-monitor-response-master.mjs](./finish-glitch-monitor-response-master.mjs) | Finish de audio preparado pero **no ejecutado/promovido**: sólo sería válido después de aprobar un visual. |
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

El key visual 4K es la fuente canónica y se conserva para dirección, color, finish y archivo. El hash del archivo vuelto a entregar por el operador es idéntico al de esta fuente. La recuperación V2 prohíbe el perfil `sign-neutral-720-jpeg`: el `ON AIR` ya integrado no se borra para luego montarlo encima. En esta sesión, Omni bloqueó el key visual íntegro como referencia y también bloqueó el edit del video que ya contenía la señal. Por eso O generó un plano completo desde texto, dirigido por la fuente: el letrero nació en el set y no fue una composición posterior. Los binarios del piloto se conservan como evidencia y se archivan mediante `pnpm media:archive-ai-generation`; no son entregables ni pueden copiarse a producción.

## Resultado del piloto

Los seis fallos iniciales quedaron registrados: un límite de cuota y cinco bloqueos de entrada sin candidato. La recuperación aisló como gatillante probable el texto legible del letrero ON AIR. El perfil sign-neutral-720-jpeg conserva el key visual 4K, la mano, el micrófono, encuadre y luz, y difumina localmente sólo ese texto dentro del adapter de inferencia. El siguiente request produjo un MP4 válido en un intento.

Cuando el operador corrigió la intención a `tap, tap`, se ejecutó una edición video-a-video sobre el master mediante Gemini Omni Interactions. La interacción sí consumió el video y devolvió un MP4, pero la revisión descubrió artefactos de continuidad después del primer segundo; no se seleccionó. El candidato E posterior también fue rechazado: su panel `ON AIR` se leía como una tarjeta en primer plano y el índice parecía presionar. El finish F evita regenerar: retima fotogramas del export existente para construir dos golpes de yema con rebote y compone el `ON AIR` real, pequeño y detrás de la mano, desde el key visual 4K.

Para el sonido se pidió a Gemini Omni una edición audiovisual localizada. Su output H sí trajo AAC, pero alteró nuevamente el practical y añadió un tercer acento: se rechazaron sus píxeles. El finish I recupera únicamente sus dos primeros foleys, los sincroniza a los dos contactos reales y los monta sobre los frames de F, verificados mediante el mismo hash `framemd5` de video. I no se reutiliza para O.

- Master local: masters/glitch-microphone-intro-a-natural-omni-master.mp4; 10 segundos, 720x1280, H.264, 24 fps.
- Base editorial: exports/glitch-microphone-intro-a-natural-5s-silent.mp4; 5 segundos, 720x1280, H.264, 24 fps, sin audio.
- Placa visual F: exports/glitch-microphone-intro-f-percussive-tap-on-air-5s-silent.mp4; 5 segundos, 720x1280, H.264, 24 fps, sin audio.
- Evidencia editorial I: `exports/glitch-microphone-intro-i-percussive-tap-on-air-5s-gemini-foley.mp4`; está **rechazada**, no es candidata actual.
- Take O: `masters/glitch-microphone-intro-o-omni-integral-natural-double-tap-master.mp4`; técnicamente resolvió practical/audio, pero se rechazó porque la toma text-only cambió el diseño, la paleta, el micrófono y la composición fuente.
- Ruta histórica de referencias separadas: se probó y no produjo una candidata. La ruta vigente es la decisión de estado inicial descrita en la auditoría; el `ON AIR` permanece materialmente dentro del set y nunca se compone después.

El 4K original sigue siendo la fuente creativa canónica. El adapter sólo existe para pasar el filtro de inferencia y no sustituye el asset de dirección, finish o archivo.

## Addendum Fal / Seedance 2.0

La prueba S se realizó con el endpoint oficial de Fal `bytedance/seedance-2.0/image-to-video`, usando el PNG 4K íntegro como `image_url`, salida 1080p 9:16, cinco segundos y audio nativo. El resultado es importante porque retuvo el diseño que Omni text-to-video había cambiado: mismo micrófono, misma cabina, misma paleta y el letrero ya integrado en la escenografía. No obstante, conservar la imagen no sustituye el gate de actuación: los dos contactos no son golpes instantáneos con rebote inequívoco y el audio incorpora actividad adicional. S queda rechazado íntegro; no se hace una reparación editorial.

El prompt T especificó ruptura inicial de contacto, dos impactos de máximo dos frames y una ventana aérea de ocho frames entre ambos. Tras la recarga, Fal aceptó un único request (`019f51ce-780f-7533-b4be-60e11f3e0d5b`) y devolvió el master 1080p de 5,042 s. T mantuvo fielmente el set y el `ON AIR` practical, pero los dos contactos permanecen varios frames sobre la rejilla y la pista tiene actividad anticipada y colas de resonancia; no pasa los gates de actuación ni de foley. El take completo queda rechazado y no se repara en post.

## Addendum de recuperación U–Z

Después de T se probaron rutas materialmente diferentes, no simples cambios cosméticos de prompt: U/V/X usaron Seedance reference-to-video con guías cada vez más compactas; W partió de un hover íntegro en Veo 3.1; Y intentó corregir sólo la actuación mediante Kling O3 Pro; Z usó la cadencia humana de O como referencia de movimiento y el 4K como verdad visual. Todos los outputs se revisaron a 24 fps.

U, V y X conservaron el set, pero Seedance expandió cada “kiss” de un frame a apoyos de varios frames. W creó dos apoyos largos y añadió una luz blanca ajena. Y mantuvo la presión, conservó el orbe y terminó eliminando la mano. Z abrió ya en contacto y entregó una única ventana larga en lugar de dos taps. El costo estimado T–Z fue **US$10.44 más token billing de Seedance**. Los IDs, hashes y desglose están en [la revisión consolidada](./review/takes-u-to-z-guided-recovery-review.md).

La aclaración sonora del operador queda incorporada como contrato: el público debe oír la prueba **a través de la corneta/monitor del estudio**, es decir `dedo → cápsula/preamp → monitor`, no el golpe directo de piel sobre la malla. La pista final tendría exactamente dos respuestas de 80–120 ms y silencio digital fuera de ellas. Como ninguna imagen pasó primero, ese finish no se ejecutó sobre ningún take.

## Addendum 3D — ruta descartada

Se instaló Blender fuera del repo y se construyó un blocking integral para comprobar si el control cuadro a cuadro resolvía la actuación. Técnicamente sí fijó contactos únicos en frames 15/28 y rebotes en 16/29, con `ON AIR` modelado dentro de la escena. Creativamente falló: mano, antebrazo, micrófono, materiales, luz y composición se alejaban demasiado del key visual y el resultado se veía rudimentario. El operador lo rechazó expresamente. No se usará como referencia para otro modelo, no se continuará a lookdev y no se promoverá ningún píxel 3D.

## Auditoría de causa raíz — fuente contradictoria

La revisión posterior identificó el error upstream que debió detener la producción: el 4K canónico ya abre con la yema sobre la rejilla y los arcos azules visibles, mientras el contrato exige frame 0 en hover y señal sólo después del segundo tap. No es posible llamar a ese frame “verdad inicial inmutable” y pedir simultáneamente un estado inicial distinto. El preflight de Magnific detectó el mismo conflicto y bloqueó la generación antes de gastar.

La conclusión corregida no es “todos los modelos generativos están agotados”. Está agotado repetir el contrato sobre esta fuente incompatible. La ruta recomendada es aprobar primero un nuevo key visual precontacto —misma composición, micrófono, set, cromática y `ON AIR` practical; dedo elevado y señal de respuesta aún inactiva— y después escalar de un tap silencioso a doble tap, con máximo dos fallos equivalentes por arquitectura. Ver la [auditoría completa](./review/source-state-and-creative-video-workflow-audit.md).

## Alcance y no alcance

Incluye los artefactos del piloto y una planificación V2 para una nueva toma vertical de cinco segundos a 24 fps, con el `ON AIR` integrado al set y foley final diseñado como audio independiente.

No incluye música, locución, composición del wordmark, publicación, integración en una ruta ni upscale. Ninguna toma es entrega técnica promovible. Los renderers no ejecutan requests sin modo explícito y todo gasto queda gobernado.

## Estado del método

Este sigue siendo un **piloto de Creative Workflow** específico de Glitch y no autoriza publicación automática. La evidencia posterior invalida la aplicación de la receta de finish determinista a un practical narrativo y a una actuación táctil: en este tipo de plano, overlay/retime no son una corrección válida. La ruta V2 debe aprobar primero el set y la acción completa; la promoción de cualquier aprendizaje global queda pendiente de un take que supere esos gates.

## Condición para reabrir producción

No existe candidato técnico actual. La ronda equivalente desde el 4K contradictorio quedó cerrada tras Z y la ruta 3D quedó rechazada.

Antes de reabrir producción debe elegirse una sola narrativa: aceptar que el plano abre ya en contacto/señal, o —recomendado si se mantienen dos taps— aprobar un key visual precontacto fiel al diseño. Luego se prueba un tap silencioso; sólo si pasa se escala a doble tap y finalmente a dos respuestas de corneta. No se debe gastar otra ronda con el mismo first frame ni con cambios cosméticos de prompt; el retime correctivo sigue prohibido.
