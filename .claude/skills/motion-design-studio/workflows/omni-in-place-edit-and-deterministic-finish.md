# Omni in-place edit → revisión temporal → finish determinista

> **Estado:** validado sólo para ajustes editoriales que no cambian la verdad física del plano. La recuperación Glitch V2 (2026-07-11) delimita una excepción importante.
>
> **⚠️ Cambio de API (2026-07-20):** la **edición Omni migró a la Interactions API** y ahora vive **solo en la superficie Gemini-key** (`generativelanguage.googleapis.com/v1beta/interactions?key=…`), con `previous_interaction_id` + `store:true`. La **Vertex KEYLESS no edita** (`previous_interaction_id` → `400`; `GET /interactions/{id}` → `500`) — sirve solo generación. El piloto Glitch (`@google/genai` con `vertexai:true` sobre `generateContent`) usó un camino **ya retirado**; el aprendizaje operativo (clasificar el cambio, gate temporal, finish determinista) **sigue vigente**, pero el contrato de invocación cambió. Ver `../efeonce/GEMINI_OMNI_VERTEX.md §0/§4`.
>
> **Evidencia:** `ai-generations/2026-07-11_glitch-microphone-intro/pilot-retrospective.md` y [recovery-plan-v2-integral-practical-and-foley.md](../../../../ai-generations/2026-07-11_glitch-microphone-intro/recovery-plan-v2-integral-practical-and-foley.md). El candidato I está rechazado creativamente.
>
> **Límite de confianza:** una edición Omni persistente fue procesada y recuperada, pero se **rechazó** por artefactos de continuidad. El finish determinista sirve para montaje reversible sobre una actuación ya válida; **no** valida simular una actuación física ni insertar un practical diegético después. Revalidar disponibilidad, parámetros y pricing de Omni antes de cada producción.

## La idea en una frase

**No regeneres por reflejo, pero tampoco falsifiques la toma.** Primero clasifica el cambio: usa Omni Interactions sólo cuando la toma necesita píxeles/acción/objeto que no existen; usa edición determinista cuando el master ya contiene las poses correctas y el pedido es timing, orden, repetición, freeze, grade o corte. Si la acción física es el significado del plano, o un practical modifica su profundidad, oclusión o relación con una mano, hay que producir una toma integral nueva. Para foley nativo de Omni, se puede recuperar sólo audio de una edición audiovisual revisada, nunca aceptar por defecto su video.

## Cuándo usarla

- El operador quiere modificar un video ya aprobado como base, no abrir una nueva dirección de arte.
- El cambio es una actuación localizada, luz, objeto o apariencia que no puede construirse honestamente con los frames existentes → intentar **un** edit conversacional persistido.
- El cambio es alargar/acortar una pausa, repetir una acción **ya capturada y físicamente válida**, freeze, grade o elegir el corte → **post determinista**, sin gasto de generación.
- El operador necesita que el público lea un gesto corporal específico —por ejemplo golpear una malla y no presionarla— o que un letrero sea un objeto del set → **toma integral nueva** (IA, filmación o 3D), no retime ni composición tardía.
- El operador pide específicamente la textura/sincronía de foley de Omni → una edición audiovisual localizada como **guía de audio**, seguida de revisión y finish determinista; no pedir un edit literal `audio-only`.
- Existe un asset de origen autorizado para texto, logo o UI no diegéticos. Un practical de escena debe existir dentro de la toma desde el primer fotograma.

## Invariantes y no-negociables

1. `completed` / MP4 descargado = **candidato técnico**, nunca aprobación creativa.
2. Preservar input, prompt, `interaction_id`, output, hashes y el motivo de aceptación/rechazo.
3. No usar letras generadas para copy exacto. Los rótulos no diegéticos pueden venir de un asset real; un practical diegético se debe producir como parte del plate, no pegarse encima.
4. Un cambio generativo por interacción: no encadenar correcciones vagas ni gastar una ronda para arreglar el resultado de la anterior sin revisión.
5. Si el fallback reutiliza frames, sólo usar trayectorias continuas y reversos que conserven física legible; no esconder una anatomía rota con un retime. Si no existe en la fuente un strike real de uno a dos frames y rebote inmediato, se genera o filma una toma nueva.
6. Un practical que participa en el espacio narrativo no es un asset de finish: tiene que estar a escala, perspectiva y plano correctos porque nació dentro del set. Nunca se reconstruye como tarjeta foreground ni como overlay “bien trackeado”.
7. Audio nativo Omni es scratch. Si se reutiliza como materia prima, documentar sus ventanas, omitir eventos inventados y remuxarlo sobre la placa visual aprobada.

## Pasos encadenados

### 0. Clasificar el pedido antes de tocar el modelo

| Cambio solicitado | Mano por defecto | Motivo |
| --- | --- | --- |
| Nuevo objeto, gesto o transformación que no existe en el master | Gemini Omni Interactions | Requiere píxeles/temporalidad nueva. |
| Cambiar luz/atmósfera sin alterar identidad | Gemini Omni Interactions, con gate temporal | Puede aprovechar su edición localizada; no confiar continuidad sin revisión. |
| Reordenar beats, repetir gesto ya filmado, freeze/hold, trim o velocidad | Editor/NLE/FFmpeg determinista | No necesita contenido nuevo; es reversible, trazable y no gasta créditos. |
| Texto, logo, datos o UI no diegéticos exactos | Compositing desde asset fuente | Omni deforma tipografía; la fuente real garantiza marca y copy. |
| Practical diegético, interacción espacial o actuación física hero | Toma integral nueva / filmación / 3D completo | Un overlay o retime rompe profundidad, oclusión y causalidad física. |
| Tap, contacto, room tone, música o mezcla | Foley/post de audio | Registrar/crear foley aislado y sincronizarlo. Omni puede ser guía, no sustituto automático de escucha. |

### 1. Preparar una edición Omni sólo cuando de verdad haga falta

1. Verificar duración, fps, dimensiones, audio y hash del master. Guardar un export de rollback.
2. Escribir un prompt de una sola intención: **qué cambia, cuándo cambia, qué se preserva y qué no debe aparecer**. No combinar cámara, anatomía, estilo, señal y tipografía en un mismo pedido.
3. Editar es **stateful** y corre en la **superficie Gemini-key** (`POST https://generativelanguage.googleapis.com/v1beta/interactions?key=API_KEY`) encadenando `previous_interaction_id` — la Vertex keyless **no** edita (`400`). El clip base tuvo que generarse con `store:true`; el preview aguanta ~3 ediciones secuenciales y el store retiene 55 días (pago) / 1 día (free). Para una edición que puede tardar, crea la interacción con `background:true` + `store:true` y haz polling por ID.
4. Para `task:'edit'`, **no enviar `response_format.aspect_ratio`**: devolvió `400 Aspect ratio cannot be set in response format for edit task`. El edit preserva el aspect del input.
5. Extraer video sólo de `steps[type='model_output'].content[type='video']`; no recorrer recursivamente la interacción, porque podrías escribir el video de entrada como falso output.

### 2. Gate de recuperación y revisión temporal

1. Recuperar por `interaction_id` si el proceso local se interrumpió; no pagar una segunda generación para descargar un output ya persistido.
2. Revisar el clip completo a 1×, 0.5× y frame a frame en torno al cambio.
3. Generar contact sheet de inicio, contacto/acción, release y settle; incluir al menos una revisión de la zona editada y otra del fondo.
4. Rechazar automáticamente si cambia la cantidad/identidad/anatomía de mano, el objeto se deforma, la cámara deriva, aparece una banda/artefacto o el texto se vuelve ilegible.
5. Registrar por separado `provider completed` y `creative accepted/rejected`. No llamar “éxito” a una respuesta que sólo completó técnicamente.
6. Si se solicitó foley nativo, contar transientes y comprobar su alineación; un impacto extra no se acepta como respuesta de señal sin dirección explícita.

### 3. Fallback de finish determinista sobre el mismo video

1. Encontrar en el master una trayectoria **ya válida** para cada beat. No construir un doble tap de una presión o de poses sin impacto físico.
2. Construir la timeline con segmentos contiguos; usar reverse únicamente para una retirada que se lea físicamente. Mantener fps, aspecto y cámara de origen.
3. Componer sólo texto/logo/UI no diegéticos desde el asset canónico. No añadir practicals que deban existir dentro del mundo de la toma.
4. Añadir foley separado por cada contacto y una respuesta de señal sólo donde la dirección la pida. Sin música ni VO si el concepto exige silencio activo.
5. Si el output audiovisual de Omni falla visualmente pero sus foleys sirven, extraer sólo ventanas aprobadas, sincronizarlas sobre la placa aceptada y omitir todo acento no solicitado. Demostrar que los frames finales coinciden con la placa, por ejemplo con `framemd5`.
6. Verificar duración, fps, audio, hash y contact sheet del resultado. El output recibe un nuevo ID de candidato, pero conserva lineage hacia el master de Omni.

## Caso Glitch: aprendizaje negativo que cambia la ruta

- El crop/overlay de `ON AIR` de F/I se percibió pegado aunque se ajustó a perspectiva y quedó en segundo plano: por tanto no pasa un gate de integración diegética.
- El retime de la mano se leyó como presión aunque se intentó construir strike/rebound: la semántica de la actuación debe nacer de la performance, no del montaje.
- El audio de Omni contenía un tercer acento y no sonaba como la rejilla de un micrófono: se descarta como foley final.
- La ruta vigente es una toma íntegra con practical físico o plenamente integrado en la generación/3D, dos impactos de yema y foley aislado aprobado por escucha.

## Qué NO hacer / gotchas

- ❌ Tomar `status: completed` como QA visual. El error puede estar fuera del primer frame o sólo aparecer al final del clip.
- ❌ Mandar `aspect_ratio` en un edit Interactions; el provider lo rechazó en este caso.
- ❌ Buscar output recorriendo el input de la interacción; devuelve un falso positivo idéntico al source.
- ❌ Pedir a Omni que escriba o repare el `ON AIR`, wordmark, precio, UI o copy exactos.
- ❌ Convertir una corrección de timing en rondas de regeneración caras e incontrolables.
- ❌ Retimar un gesto si ninguna porción de la fuente tiene anatomía/contacto válidos. En ese caso hace falta una toma nueva, no montaje engañoso.
- ❌ Usar un overlay, crop, máscara o tracking para un letrero que el espectador debe entender como parte del set; aun bien compuesto delata una capa añadida.
- ❌ Pedir `audio-only` en Interactions y asumir que el provider tratará el video como inmutable. En Glitch fue rechazado antes de generar; pedir una edición audiovisual localizada, revisar el output y conservar sólo audio si pasa su propio gate.
- ❌ Conservar un audio Omni entero porque tiene un golpe bueno: recorta sólo los eventos solicitados, elimina cualquier transiente inventado y conserva la placa visual aprobada.

## Gasto y aprobación

- Omni edit consume generación: estimar y confirmar antes de ejecutar; `background:true` no sustituye la aprobación.
- La recuperación de un `interaction_id` y el post determinista no vuelven a gastar créditos del modelo.
- Aprobación humana obligatoria antes de foley final, upscale, archive, publicación o entrega.

## Evidencia y documentación mínima

- Prompt, input hash, interaction ID, metadata del provider y output hash.
- Contact sheet + revisión temporal, con aceptación/rechazo explícito.
- EDL de los ajustes permitidos, fuente/hash de cada overlay no diegético y especificación de sonido. Para un practical integral: referencia/base de escena, gate de profundidad y revisión de oclusión.
- Manifest/README/retrospectivo del run, índice de workflows, manual operativo y handoff si cambia continuidad activa.

## Referencias

- Contrato Omni: `../efeonce/GEMINI_OMNI_VERTEX.md` y `../efeonce/GEMINI_OMNI_CAPABILITIES.md`.
- Montaje: `../modules/06_EDITING_MONTAGE_PACING.md`.
- Sonido: `../modules/07_SOUND_MUSIC_DESIGN.md` y `audio-studio`.
- Compositing: `../modules/11_VFX_COMPOSITING.md`.
- Caso canónico: `ai-generations/2026-07-11_glitch-microphone-intro/`.
