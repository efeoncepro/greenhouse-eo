# Operar pilotos de Creative Workflow con motores de video IA

> Tipo de documento: Manual de uso operativo
>
> Estado: Aplicable a pilotos manuales versionados. No describe una pantalla de producto ni autoriza publicación automática.

## Para qué sirve

Este manual permite a un operador o agente ejecutar un piloto creativo de imagen a video de forma reproducible, con gasto controlado y evidencia suficiente para distinguir una falla de capacidad de un bloqueo de entrada. No presupone que Gemini Omni sea el motor de toda toma: la selección depende del contrato de fidelidad de la referencia, la física de la acción y la interpretación que el proyecto permite.

El referente ejecutado es la intro Glitch El micrófono se abre. Su retrospectivo canónico vive en ai-generations/2026-07-11_glitch-microphone-intro/pilot-retrospective.md.

## Antes de ejecutar

1. Crear una corrida versionada bajo ai-generations con brief, secuencia, storyboard, motion y sonido, manifest y renderer.
2. Mantener el key visual original como fuente canónica. No sobrescribirlo ni usar el storyboard multipanel como input.
3. Validar dirección, duración, formato, acción, audio y límite de gasto antes de llamar al modelo.
4. Elegir el motor mediante el gate `ancla visual flexible` vs `identidad de set`; no decidir por canal ni precio aislado. Ver [Selección de motor por contrato de fidelidad](../../../.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md).
5. Si se usará Omni/Vertex, autenticar ambos caminos de Google Cloud: gcloud auth login y gcloud auth application-default login. Si se usará Fal, comprobar saldo y credencial en Secret Manager sin exponerla.
6. Ejecutar primero el modo plan. Ningún plan debe llamar al proveedor.

## Gate de selección de motor

| Condición creativa | Primera mano | Evidencia |
| --- | --- | --- |
| Stills ficticios de una campaña: pueden reinterpretarse dentro del mismo lenguaje visual; no tienen copy ni practical exacto | Gemini Omni image-to-video | RRSS: `gpt-image-2` generó ocho key visuals; Omni animó seis referencias y se publicaron beats de cuatro segundos. |
| El key visual ya es la verdad de un set/producto/practical y debe mantener identidad espacial | Seedance image/reference-to-video | Glitch S conservó correctamente set, paleta y practical; el take sigue rechazado por gesto/foley, no por diseño. |
| Una toma requiere blocking, timing o cámara espacial preplaneada, y el look final puede reinterpretarse | Seedance reference-to-video con previs 3D exportada + keyframe | Capacidad externa documentada; exige endpoint con referencias de video y una prueba aislada. No es receta interna validada ni habilita reutilizar el blocking 3D rechazado de Glitch. |
| Se necesita explorar una acción inexistente mediante conversación y el plano tolera reinterpretación | Gemini Omni edit/generation | El resultado siempre pasa revisión temporal completa. |
| Sólo cambian ritmo, orden, trim, hold, grade o copy no diegético exacto | Edición determinista / mograph | No se generan píxeles ni se simula una física ausente. |

El canal no decide: un video de RRSS puede ser excelente con Omni si parte de un paquete de imágenes flexible, y una intro vertical puede requerir Seedance si el set es una identidad que no debe rediseñarse.

### Cuando la referencia es una previs 3D

Una previs de Blender, Unreal o Cinema 4D se exporta como video/playblast: Seedance no recibe el `.blend` ni una cámara 3D editable. Usar el video para bloquear cámara, encuadre, timing y acción, y una imagen alineada para materiales, personaje, luz y look final. Confirmar antes que el endpoint permite video + imagen como referencias; un modo limitado a image-to-video no sirve. El patrón sigue siendo probabilístico, por lo que revisar anatomía, contactos, texto y continuidad como cualquier otro take.

El detalle de capacidad, fuentes, prompt de intención y restricciones internas está en [Previsualización 3D con Seedance](../../documentation/ai-tooling/previs-3d-y-referencias-seedance.md). No usar esta nota para reabrir o reciclar el blocking 3D rechazado de Glitch.

## Flujo de generación

1. Preparar la referencia admitida por el motor elegido. Registrar dimensiones, hash, transformación y relación con el asset canónico. No borrar/difuminar un practical diegético para hacerlo compatible con un motor.
2. Ejecutar un solo take con una variable creativa controlada.
3. Guardar prompt, metadata, respuesta, master y resultados de ffprobe.
4. Separar el master de generación del export editorial. El master puede durar diez segundos; el corte útil se selecciona después de revisar.
5. No publicar, archivar ni declarar final un asset sin revisión humana.

## Si aparece HTTP 429 en Omni / Vertex

1. Revisar metadata y usar sólo el backoff limitado del renderer.
2. No cambiar el brief ni lanzar una batería paralela.
3. Si el límite persiste después de los reintentos definidos, detener la corrida y registrar capacidad pendiente.

## Si aparece HTTP 200 sin candidatos en Omni / Vertex

Un HTTP 200 no equivale a una generación. Si promptFeedback está presente y candidates está vacío, la entrada fue bloqueada antes de producir video.

1. Guardar la respuesta exacta, incluido block reason, mensaje, hash de referencia y prompt.
2. Verificar que el input cumple resolución, aspect ratio y MIME permitidos.
3. Ejecutar una sola prueba neutra con el mismo input para separar dirección verbal de contenido visual.
4. Si el probe también se bloquea, no repetir prompts cosméticos.
5. Permitir una única recuperación mínima y trazable sobre el adapter, por ejemplo neutralizar texto legible que **no** sea parte esencial de la acción o la puesta en escena. Nunca modificar el asset canónico. Un letrero práctico, una etiqueta espacial o cualquier texto que el espectador deba entender como objeto del mundo no se neutraliza: se cambia de motor o de mano.
6. Cambiar una sola familia de variables y registrar el cambio. Si se modifica texto y contenedor a la vez, documentar que la causalidad no queda aislada.
7. Si la recuperación falla, cambiar de mano: keyframe compatible nuevo, otro motor o craft humano e híbrido.

No se debe intentar desactivar filtros, ocultar contenido sensible ni presentar una recuperación de adapter como aprobación automática de un asset.

## Si Fal responde `403 User is locked — Exhausted balance`

1. Detener el take: no existe candidato, request ID ni razón creativa que depurar.
2. Guardar el error y el prompt planificado en el manifest; no declarar que hubo una segunda generación ni inferir cargo.
3. Registrar `operativamente bloqueado` en Handoff con el titular de la cuenta como responsable de recargar saldo.
4. Tras la recarga, ejecutar sólo el take ya planificado y someterlo a la misma revisión; no convertir el bloqueo financiero en una batería de prompts nuevos.

## Revisión y post

1. Confirmar con ffprobe formato, duración y fps.
2. Revisar el gesto a velocidad real, media velocidad y frame a frame.
3. Rechazar dedos extra, anatomía inestable, penetración de objetos, texto inventado, cámara no dirigida o señal que antecede al contacto.
4. Puntuar el take usando una rúbrica persistente.
5. Si se requiere un cambio sobre el clip ya producido, usar primero edición video-a-video persistente y guardar el identificador de interacción. Revisar el video entero: una respuesta completada no equivale a continuidad aprobada.
6. Si la edición generativa deriva cámara, anatomía o textura, rechazarla. Cuando las poses correctas ya existen en el video, usar una corrección determinista y reversible de timing/orden; no generar otro plano sólo por reordenar el gesto. Si el gesto físico es el significado del plano y la fuente no lo contiene, crear una toma integral nueva: no simularlo por retime.
7. Componer texto/logos no diegéticos desde sus assets reales. No pedir al modelo que reconstruya tipografía legible; documentar la región, fuente y hash usados. No componer en post un practical que deba pertenecer al mundo del video: se valida dentro de la toma o se rechaza.
8. Si el contrato pide foley controlado, el audio nativo de Omni se trata como guía. Un edit literal `audio-only` puede fallar; una edición audiovisual localizada puede aportar eventos útiles pero sus píxeles deben pasar QA por separado. Para un contacto físico específico, preferir/cotejar foley aislado que conserve material + acción + fuerza + espacio; sincronizado no equivale a creíble.
9. Probar el hard cut con el siguiente plano real antes de decidir upscale o entrega.

### Cómo elegir entre editar con Omni y editar el clip existente

1. **Faltan píxeles o una acción que no existe:** usar una interacción Omni persistente, una instrucción acotada y guardar su ID. No incluir `aspect_ratio` en una tarea `edit` si el proveedor ya preserva el formato del input.
2. **Sólo cambia el montaje:** para repetir un gesto ya correcto, cambiar pausas, reordenar beats o hacer hold/freeze, trabajar sobre el mismo master con un editor determinista. No abrir otra generación. Texto/logo no diegético y foley pueden montarse después; un practical de set o una actuación física que aún no existe requieren una toma nueva. Si el operador pide textura de foley nativo Omni, usarla sólo como guía de audio y conservar eventos que pasen escucha, no sus píxeles por defecto.
3. En ambos casos, revisar el resultado entero a velocidad real, 0,5× y por frames; un MP4 disponible sólo es candidato técnico.
4. Todo texto/logo/practical exacto sale del asset canónico con su hash registrado. El video IA puede ser el plate, nunca la fuente de verdad tipográfica.

## Cierre y archivo

1. Actualizar manifest, README, retrospectivo, índice de generaciones y Handoff con estado real.
2. Si el take sigue pendiente de aprobación, declararlo candidato técnico; no entrega final.
3. Al aprobarse, archivar los binarios mediante el flujo gobernado de media y registrar URI, hash, tamaño y propietario.
4. Registrar costo confirmado sólo cuando el ledger o proveedor lo permita; no inferir monto por tokens.

## Referencias

- Documentación funcional: docs/documentation/ai-tooling/estudio-de-flujos-creativos.md
- Regla de selección y evidencia cruzada: `.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`
- Piloto Glitch: ai-generations/2026-07-11_glitch-microphone-intro/
- Ruta vigente Glitch: ai-generations/2026-07-11_glitch-microphone-intro/recovery-plan-v2-integral-practical-and-foley.md
- Evidencia rechazada del take I: ai-generations/2026-07-11_glitch-microphone-intro/review/take-i-percussive-tap-on-air-gemini-foley-review.md
