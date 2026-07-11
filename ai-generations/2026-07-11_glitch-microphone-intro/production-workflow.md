# Creative Workflow piloto — producir la intro de Glitch

> Actualización de ejecución 2026-07-11: se probó **Fal.ai / Seedance 2.0 image-to-video** con el key visual PNG 4K íntegro. S preservó correctamente diseño, cámara, colores, micrófono y practical físico, pero no aprobó la actuación ni el foley. T, la corrección dirigida de ese take, quedó bloqueado por `HTTP 403 User is locked — Exhausted balance` antes de generar. No se superpone, repone ni trackea el letrero.

> Estado: **operativamente bloqueado por saldo Fal.** F/I y O están rechazados creativamente: un practical diegético no se puede recomponer en post, una presión no se arregla mediante retime y una toma text-only no puede sustituir el diseño entregado. La ruta vigente es [recovery-plan-v2-integral-practical-and-foley.md](./recovery-plan-v2-integral-practical-and-foley.md); la evidencia de S/T está en [take-s-seedance-source-keyvisual-review.md](./review/take-s-seedance-source-keyvisual-review.md).

> Decisión de motor documentada: esta ruta no desplaza a Omni de RRSS. La landing de Redes Sociales partió de un set ficticio de imágenes generadas y Omni las convirtió en microescenas vivas publicadas; Glitch parte de una imagen que es la identidad exacta del set y exige física/tacto hero. La regla es seleccionar por fidelidad e interpretación permitidas, no por formato o canal: `.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`.

## Resultado de la recuperación

El piloto dejó evidencia útil pero no una ruta de finish aceptable. El input 4K directo y el adapter PNG 720p fueron bloqueados antes de generar candidatos; el perfil `sign-neutral-720-jpeg` produjo el take natural al borrar el `ON AIR` del adapter. Esa recuperación ya **no es admisible**: el letrero integrado en el key visual es parte esencial del set, no un elemento que se pueda neutralizar y reponer.

La corrección posterior del operador cambió la actuación a `tap, lift, tap, lift`. Se probó edición video-a-video con Gemini Omni Interactions sobre el master: la interacción procesó el video y devolvió MP4, pero no pasó revisión de continuidad. El primer finish editorial E también se rechazó por escalar el `ON AIR` como placa delante de la mano y por leerse como presión. El visual F se produce con `compose-glitch-tap-tap-on-air.mjs`: retima material existente como golpe de yema y rebote, y compone el panel `ON AIR` exacto desde el key visual 4K a escala de practical de fondo. No genera material nuevo ni pide letras al modelo.

El foley se solicitó luego a Omni mediante una edición audiovisual localizada. La formulación `audio-only` fue rechazada antes de generar; la formulación audiovisual devolvió MP4 con AAC, pero sus píxeles no pasaron continuidad (practical alterado y tercer acento). El finish I mantiene la placa F y recupera sólo las dos primeras ventanas de audio de Omni: `finish-glitch-percussive-tap-with-gemini-foley.mjs`. La revisión vigente vive en `review/take-i-percussive-tap-on-air-gemini-foley-review.md`.

Este checkpoint no habilita una recuperación que neutralice texto cuando el texto sea un practical diegético. Para la toma V2, el source entra intacto y un motor que no lo conserve se descarta; no se crea un workaround de post.

## Resultado esperado

Un take vertical 9:16, de aproximadamente cinco segundos útiles, que cumple los documentos de dirección de este paquete. El master generado conserva el material de origen y permite post de precisión para sonido, texto y finish.

## Gate 0 — aprobación antes de gastar

Revisar y aprobar en conjunto:

1. [creative-brief.md](./creative-brief.md)
2. [sequence-script.md](./sequence-script.md)
3. [storyboard.md](./storyboard.md)
4. [motion-and-sound-spec.md](./motion-and-sound-spec.md)
5. [transition-handoff.md](./transition-handoff.md) — debe tener una alternativa de destino elegida antes del edit final.

No producir si aún se discute duración, el grado de silencio, la naturaleza del contacto o si la música entra antes/después del corte.

## Gate 1 — preparar la referencia

1. Verificar el SHA-256 del key visual contra el README.
2. Conservar el PNG 2160×3840 como fuente inmutable.
3. Conservar el key visual original **2160×3840** como fuente canónica. Si un motor exige adaptación, sólo se permite una reducción sin crop que preserve integralmente el `ON AIR`, la mano y el micrófono. Quedan prohibidos el perfil `sign-neutral-720-jpeg` y cualquier neutralización del letrero.
4. No usar el storyboard compuesto como input de Omni: contiene tipografía, mosaicos y frames múltiples que el modelo podría mezclar.
5. Usar una sola imagen de referencia. El gesto de esta versión comienza en hover cercano y sólo recorre unos milímetros por contacto.

## Gate 2 — ruta Omni histórica (no ejecutar para V2)

Ruta validada internamente:

```text
POST https://aiplatform.googleapis.com/v1/projects/efeonce-group/locations/global/publishers/google/models/gemini-omni-flash-preview:generateContent
```

- Región: `global`.
- Autenticación local antes de producción: `gcloud auth login` y `gcloud auth application-default login`.
- Headers: bearer token de ADC, `x-goog-user-project: efeonce-group`, JSON.
- Contrato obligatorio: `generationConfig.responseModalities: ["TEXT", "VIDEO"]`.
- Input: `inlineData` PNG + prompt de dirección; no usar `instances`.
- Guardar prompt, referencia, respuesta de texto, metadata de uso y MP4 master.

El renderer reproducible de esta corrida es `render-omni-glitch-intro.mjs`:

```bash
node ai-generations/2026-07-11_glitch-microphone-intro/render-omni-glitch-intro.mjs --plan
node ai-generations/2026-07-11_glitch-microphone-intro/render-omni-glitch-intro.mjs --execute
node ai-generations/2026-07-11_glitch-microphone-intro/render-omni-glitch-intro.mjs --execute --only=natural
```

El modo por defecto y `--plan` no escriben ni llaman a Vertex. Sólo `--execute` genera; antes valida el hash del key visual 4K, ADC y autenticación de `gcloud`. Ante `429` o `5xx`, el renderer aplica reintento exponencial truncado de 8 s y 16 s, registra los intentos en metadata y falla cerrado después del tercer intento; nunca repite una corrida completa en silencio.

Los masters verticales de Omni ya generados en este workspace han entregado `720×1280`, 24 fps y 10 s desde referencias 9:16. Esa resolución pertenece al **master de salida**; el input de esta corrida sigue siendo el key visual 4K. Diseñar los primeros 5 s como beat completo y conservar el resto como material de evaluación.

## Gate 3 — estrategia de divergencia controlada

Generar **tres takes**, no tres conceptos:

| Take | Variable permitida | Invariantes |
| --- | --- | --- |
| A · natural | Máxima quietud; respuesta de señal casi invisible. | Pose, cámara, contacto, paleta, no música, no texto. |
| B · táctil | Foco y rebote de yema un poco más legibles. | Mismos invariantes; sin aumentar la fuerza del golpe ni sostener el contacto. |
| C · señal | Arcos/actividad de consola ligeramente más presentes después del contacto. | La respuesta sigue al contacto; no se vuelve VFX. |

Presupuesto de referencia: un clip Omni de 10 s cuesta aproximadamente USD 1 en el contrato vigente, sujeto a reverificación previa. No pasar a una segunda ronda sin revisar los tres takes completos.

## Prompt base de producción

```text
Create one calm 24fps vertical cinematic broadcast-studio shot using the supplied 720x1280 reference image as the visual guide. Preserve its composition, the microphone, the hand and the existing navy, blue, green and warm practical lighting.

The first frame shows the index fingertip hovering naturally only a few millimeters above the microphone grille. Make two distinct, very small percussive soundcheck strikes: strike, rebound, strike, rebound. Each contact lasts one to two frames and immediately returns to a clear hover; it is never a press or a held finger. Keep the wrist, hand, microphone and studio stable. Use one locked close camera with a barely perceptible slow push-in and shallow depth of field.

Only after the second strike, let the existing blue signal arcs pulse once very softly and distant console lights become slightly more active. The final moment is calm and still, ready for a hard cut to the next program scene. Keep the ON AIR practical small, physically mounted in the background and never in front of the finger.

No added people, no cuts, no text overlays, no music or speech.
```

Solicitar audio de scratch como parte de una edición audiovisual localizada, no con una instrucción `audio-only`: describir dos ticks secos de yema contra malla, sin música, voz, room tone, radio estática ni beep. El output completo sigue siendo un candidato que debe pasar gate visual y sonoro por separado.

## Gate 4 — revisión de imagen y selección

1. Extraer contact sheet a 1 fps y revisar el master a velocidad real, 0,5× y frame a frame alrededor del contacto.
2. Medir con `ffprobe`: orientación 9:16, 24 fps y duración real.
3. Puntuar cada take con [take-review-template.md](./take-review-template.md), incluido rechazo automático y umbral de aprobación.
4. Seleccionar uno o declarar que ningún take pasa; no “arreglar” con un trim un error anatómico o de concepto.
5. Si Vertex devuelve `429`, revisar el metadata de fallo y reintentar sólo el take afectado después del backoff interno; no lanzar otra ronda ni cambiar el prompt hasta distinguir capacidad de un fallo creativo.
6. Si Vertex responde `200` pero no entrega `inlineData` de video, revisar `responseSummary` en el metadata (finish reason, safety/prompt feedback y texto) antes de reintentar; esa respuesta no se asume como fallo de cámara ni de prompt.
7. Ante `promptFeedback.blockReason=OTHER`, revisar prompt y compatibilidad del input antes de generar variantes. En este piloto, la ficha oficial de Vertex confirmó que las referencias Omni son 720p: derivar el adaptador `720×1280` desde el master 4K antes de atribuir el bloqueo al key visual.
8. Si persiste el bloqueo con el adaptador 720p, correr un único `--only=probe` con el mismo input y una instrucción neutra. Si tampoco genera candidato, clasificar el key visual como rechazado por el preview y cambiar de mano (nuevo keyframe, otro motor o composición humana), no seguir gastando en variantes.

### Recuperación cuando el source probe falla

El probe de este piloto falló con `promptFeedback.blockReason=OTHER`. Para este caso se validó una única alternativa dentro de Omni: un plano completo text-to-video dirigido por el key visual, con el practical generado como geometría/material de set desde el primer frame. Reutilizar el mismo input bloqueado no es un experimento nuevo y queda prohibido hasta que el proveedor explique o cambie el comportamiento del preview. No convertir esta excepción en una licencia para overlay.

### Rechazo automático

- Mano, uñas, nudillos o dedos cambian de identidad o cantidad.
- El dedo atraviesa/deforma el micrófono o el brazo rebota como si fuera blando.
- La cámara hace zoom, paneo, orbit o deriva.
- La señal aparece antes del contacto o se vuelve un VFX dominante.
- Se interpreta texto falso, pantalla legible, logo inventado o glitch digital.
- La intro parece un still con zoom sin impacto/rebote humano.

### Corrección de un video existente — límite histórico

Gemini Omni admite edición conversacional de video y preservación de partes no mencionadas. Usar ese camino cuando el cambio requiera contenido visual que no existe en el master, guardar el `interaction_id` y revisar el resultado completo antes de aceptarlo. Si la edición introduce drift de cámara, anatomía o artefactos, no seguir refinando a ciegas.

Cuando el material existente ya contiene las poses necesarias y el cambio es sólo de orden, timing o freeze, se puede usar una corrección determinista. Para Glitch V2 quedan prohibidos el script de retime y toda composición de `ON AIR`: la actuación y el practical se validan sólo en una toma integral nueva.

```bash
node ai-generations/2026-07-11_glitch-microphone-intro/compose-glitch-tap-tap-on-air.mjs --plan
node ai-generations/2026-07-11_glitch-microphone-intro/compose-glitch-tap-tap-on-air.mjs --execute
```

El script es reversible: toma el export Omni de cinco segundos, retima dos trayectorias reales del índice como strike-and-rebound y compone `ON AIR` desde el key visual canónico a escala de fondo. Su objetivo no es esconder un defecto anatómico; es mantener exactamente la mano, cámara y typography supplied cuando la salida generativa no conserva esos contratos.

## Gate 5 — post, sonido y finish (V2)

1. Editar el take elegido a los primeros ~5 s definidos en `sequence-script.md`.
2. Tratar el audio nativo de modelo como guía candidata, no como finish. El foley final se registra/genera de forma aislada y debe pasar el gate de `piel → malla → cuerpo de micrófono` de la especificación V2. No recuperar el audio del take I ni montar foley sobre una placa determinista rechazada.

3. Mantener silencio fuera de los dos foleys; no incorporar room tone, música, voz, beep ni un tercer transiente inventado.
4. Se pueden componer wordmarks o textos no diegéticos posteriores; nunca el `ON AIR` ni otro elemento que deba pertenecer al estudio.
5. Completar y aprobar [transition-handoff.md](./transition-handoff.md) con el primer frame, primer transiente y destino real de Glitch.
6. Grading: conservar navy/azul/verde/piel y evitar negros aplastados o verdes fluorescentes.
7. Si se requiere alta resolución, usar enhancement de secuencia frame-consistent sólo sobre el take final aprobado.
8. Hacer QC en monitor, laptop y móvil; revisar sincronía, colores, artefactos, audio y lectura del corte hacia el programa.

## Gate 6 — documentar aprendizaje

Al terminar la primera producción:

1. Actualizar `manifest.json` con take elegido, costes, hashes, dimensiones, estado y rutas de archivo remoto.
2. Agregar una entrada de resultado a este README e indexar la corrida como producida.
3. Documentar qué prompt/take falló y por qué; el aprendizaje negativo es parte del piloto.
4. Sólo si el resultado aprobado se puede repetir, proponer una versión generalizada en `.codex/skills/motion-design-studio/workflows/`.

## Estructura esperada de la corrida al producir

```text
refs/                 # key visual 4K canónico o copia 4K normalizada; nunca una reducción de generación
prompts/              # prompts verbatim por take
masters/              # locales/gitignored; archivar al aprobar
exports/              # derivados de entrega locales/gitignored
review/               # contact sheets y notas de selección
artifacts.remote.json # se crea al archivar binarios aprobados
```
