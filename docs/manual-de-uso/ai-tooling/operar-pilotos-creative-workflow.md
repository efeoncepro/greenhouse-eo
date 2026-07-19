# Operar pilotos de Creative Workflow con motores de media IA

> Tipo de documento: Manual de uso operativo
>
> Estado: Aplicable a pilotos manuales versionados. No describe una pantalla de producto ni autoriza publicación automática.

## Para qué sirve

Este manual permite a un operador o agente ejecutar un piloto creativo de imagen o video de forma reproducible, con gasto controlado y evidencia suficiente para distinguir una falla de capacidad de un bloqueo de entrada. No presupone que un solo motor gobierne toda la pieza: la selección depende de la operación, del contrato de fidelidad de la referencia y de las invariantes aprobadas.

## Piloto híbrido de imagen Seedream 5 ↔ GPT Image 2

1. Declarar formatos, mensajes, cantidad de piezas, roles de aprobación, presupuesto y `target_executor` de cada relevo.
2. Usar Seedream Lite para divergencia o GPT Image 2 para una primera estructura, según la incertidumbre principal.
3. Seleccionar y aprobar un anchor. Registrar identidad, silueta, paleta, luz, fondo, safe zones e invariantes.
4. Completar `.codex/skills/design-studio/templates/model-handoff-contract.yaml` antes de cambiar de modelo.
5. Pasar a Seedream Pro sólo para desarrollar materialidad/atmósfera, o a GPT Image 2 sólo para organizar, adaptar o reparar. Repetir en el prompt todo lo que no debe cambiar.
6. Probar un mensaje completo en todos los formatos antes del lote. Para 30 piezas, usar anchors por mensaje y derivar en estrella.
7. Revisar el 100% de thumbnails y checks técnicos; inspeccionar a tamaño completo una muestra representativa por mensaje y formato. Anatomía, número de sujetos, copy field, crop y contraste son gates, no observaciones.
8. Componer texto, logo, legal y export final con una herramienta determinista declarada. Para ratios mayores a `3:1`, preferir composición externa sobre generación full-frame.

Si GPT duplica un sujeto para representar movimiento, declarar “exactamente un cuerpo, una cabeza y una cola; sólo las alas repiten fases desde un hombro común”. Si una corrección de escala se sobrepasa, usar límites duros de margen o porcentaje máximo, no “aproximadamente”. Si Seedream altera estructura, reducir la región editable y volver al último anchor aprobado.

Para transferir una salida local de GPT a Fal, usar upload temporal con ACL restrictiva; no hacer público un
bucket GCS ni ampliar permisos. Registrar hash/lineage sin persistir tokens de URL y traer el output de inmediato
al storage privado. `X-Fal-Store-IO: 0` reduce retención del payload, pero no vuelve privado un archivo CDN.

Los referentes ejecutados son la intro Glitch `El micrófono se abre` y la campaña multimodal
`ai-generations/2026-07-18_high-frequency-campaign-e2e/`. El primero prueba continuidad física/practical;
el segundo prueba familia de campaña, format wall, mezcla y release creativo sin activación.

## Producir la familia motion 15/10/6

1. Preparar un clean plate aprobado por ratio, sin copy ni logo.
2. Generar con Gemini Omni **una sola toma continua de 8 s** para `9:16` y otra para `16:9`. Guardar audio
   nativo, prompt, request ID, hash y `ffprobe`; no pedir todavía 15/10/6 al modelo.
3. Aprobar identidad, acción, cámara, continuidad, primer/medio/último frame y audio útil de cada single-shot.
4. Construir determinísticamente, por ratio:
   - hero 15 s: toma aprobada + montaje de stills reales + end card de 2,5 s;
   - master 10 s: 8 s de motion + end card de 2 s;
   - bumper 6 s: 4 s seleccionados + end card de 2 s.
5. El format wall sólo puede usar piezas finales reales del release y registrar sus paths/hashes. No generar
   miniaturas ficticias, UI falsa ni formatos que no existan.
6. Mezclar audio fuera del modelo. Para el piloto web/social: target `−16 LUFS` integrado, ceiling `≤ −1 dBTP`,
   AAC 48 kHz. Medir y después escuchar con audífonos y parlante de teléfono. Como referencia, los heroes
   validados midieron `−16,3/−16,4 LUFS` y `−2,0/−2,2 dBFS` de peak.
7. No abrir una nueva generación por trim, hold, orden, grade, end card, copy, format wall o loudness.
8. Usar Seedance 2.0 sólo si falta una toma, ángulo, blocking o continuidad física que no existe en el master
   aprobado. Documentar qué píxel/actuación falta y volver a revisar el take completo.

## Antes de ejecutar

1. Declarar `operating_mode`, operador de registro, aprobador creativo, aprobador de gasto, autoridad de derechos y owner de delivery. Los pilotos manuales actuales son `efeonce-managed`; este manual no habilita acceso cliente.
2. Crear una corrida versionada bajo ai-generations con brief, secuencia, storyboard, motion y sonido, manifest y renderer.
3. Mantener el key visual original como fuente canónica. No sobrescribirlo ni usar el storyboard multipanel como input.
4. Validar dirección, duración, formato, acción, audio y límite de gasto antes de llamar al modelo.
5. Elegir la mano mediante el gate `el master ya contiene la toma/física` vs `falta una toma, ángulo o continuidad física`; no decidir por canal ni precio aislado. Ver [Selección de motor por contrato de fidelidad](../../../.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md).
6. Si se usará Omni/Vertex, autenticar ambos caminos de Google Cloud: gcloud auth login y gcloud auth application-default login. Si se usará Fal, comprobar saldo y credencial en Secret Manager sin exponerla.
7. Ejecutar primero el modo plan. Ningún plan debe llamar al proveedor.

### Preflight enterprise del provider

1. Resolver una `capability` estable y una `route_id` exacta desde el registry; nunca entregar endpoint + JSON
   arbitrario a un agente. El registry de research no ejecuta por sí solo.
2. Confirmar `readiness=production_approved`, schema hash, owner, fecha de revisión, región, licencia, asset
   classification allowlist, retención, fallback y evidencia de eval. Si falta uno, detener.
3. Google nativo va directo a Google Cloud/Vertex; no seleccionar su réplica Fal.
4. Obtener pricing/usage vivo y guardar snapshot, moneda/FX, TTL y supuestos. Estimar costo fully-loaded por
   candidato aprobado, no un precio hardcodeado por request/segundo.
5. Pedir un approval token single-use ligado a plan hash, actor, workspace, route, hashes de inputs, cantidad,
   resolución/duración, región, costo máximo, fallbacks, policy revision y expiración.
6. Verificar privacidad con la matriz `classification × provider × endpoint × region × retention × territory`.
   Material restringido, biométrico, M&A, regulado o no publicado falla cerrado.
7. El runner debe usar submission fence/outbox/idempotencia, lease/heartbeat, reconciliación, DLQ y recuperación
   de reservas huérfanas. Si no puede probar que un retry no duplica gasto, no reintentar automáticamente.

### Exploración no es producción

Antes de crear un piloto, declarar si se está **explorando** una dirección o ejecutando una receta ya aprobada. Un agente puede recuperar contexto y proponer brief, referencias, shot list, ruta y estimate; debe entregar ese plan en forma editable. Sólo una aprobación humana habilita un run con gasto. No convertir una conversación, un prompt prometedor o un render aislado en un workflow compartible sin evidencia, rúbrica y límites explícitos. Contexto y preguntas abiertas: [RESEARCH-009](../../research/RESEARCH-009-creative-operations-agentic-workflows.md).

La persona creativa no tiene que traducir su intención a nodos. Durante el piloto debe registrar qué se preserva, qué se explora, qué se rechaza y qué se aprueba; esas decisiones son la materia prima de la futura receta. Ingeniería sólo interviene para volverlas ejecutables, seguras y observables.

### Modos futuros y escalamiento

`Client-operated`, `co-operated` y `efeonce-managed` usarán el mismo run y la misma memoria cuando exista Creative Studio. Cambiar de modo no debe abrir una carpeta paralela ni reiniciar el brief. En los pilotos manuales, cualquier participación del cliente sigue siendo dirección/review dentro de una operación `efeonce-managed`; no improvisar self-service, compartir credenciales ni prometer SLA de plataforma todavía.

## Gate de selección de motor

| Condición creativa | Primera mano | Evidencia |
| --- | --- | --- |
| Stills ficticios de una campaña: pueden reinterpretarse dentro del mismo lenguaje visual; no tienen copy ni practical exacto | Gemini Omni image-to-video | RRSS: `gpt-image-2` generó ocho key visuals; Omni animó seis referencias y se publicaron beats de cuatro segundos. |
| El master aprobado ya contiene actuación, ángulo e identidad; sólo cambian duración, orden, hold, grade, firma o audio | Edición determinista / mograph | La campaña del colibrí produjo la familia 15/10/6 desde dos single-shots Omni sin costo generativo incremental. |
| Falta una toma, ángulo, blocking o continuidad física que no existe en el material | Seedance 2.0 image/reference-to-video, como fallback | Glitch necesitaba una actuación física nueva; conservar set y cumplir gesto siguieron siendo gates separados. |
| Una toma nueva requiere cámara espacial preplaneada y el look final puede reinterpretarse | Seedance 2.0 reference-to-video con previs 3D exportada + keyframe | Capacidad externa documentada; exige endpoint con referencias de video y una prueba aislada. No es receta interna validada ni habilita reutilizar el blocking 3D rechazado de Glitch. |
| Se necesita explorar una acción inexistente mediante conversación y el plano tolera reinterpretación | Gemini Omni edit/generation | El resultado siempre pasa revisión temporal completa. |

El canal no decide. Tampoco basta “identidad de set” para regenerar: primero se pregunta si la toma y la física
ya existen. Omni puede crear el single-shot flexible; Seedance 2.0 sólo cubre la toma/ángulo/continuidad ausente.

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
5. Si se requiere un cambio sobre el clip, clasificarlo antes de llamar un modelo: montaje/finish existente va a
   edición determinista; cambio localizado que necesita píxeles puede usar una interacción persistente; una
   nueva toma/ángulo/continuidad física va al fallback Seedance 2.0. Revisar siempre el video entero.
6. Si la edición generativa deriva cámara, anatomía o textura, rechazarla. Cuando las poses correctas ya existen en el video, usar una corrección determinista y reversible de timing/orden; no generar otro plano sólo por reordenar el gesto. Si el gesto físico es el significado del plano y la fuente no lo contiene, crear una toma integral nueva: no simularlo por retime.
7. Componer texto/logos no diegéticos desde sus assets reales. No pedir al modelo que reconstruya tipografía legible; documentar la región, fuente y hash usados. No componer en post un practical que deba pertenecer al mundo del video: se valida dentro de la toma o se rechaza.
8. Si el contrato pide foley controlado, el audio nativo de Omni se trata como guía. Un edit literal `audio-only` puede fallar; una edición audiovisual localizada puede aportar eventos útiles pero sus píxeles deben pasar QA por separado. Para un contacto físico específico, preferir/cotejar foley aislado que conserve material + acción + fuerza + espacio; sincronizado no equivale a creíble.
9. Probar el hard cut con el siguiente plano real antes de decidir upscale o entrega.

### Cómo elegir entre editar con Omni y editar el clip existente

1. **Cambio localizado que necesita píxeles y tolera reinterpretación:** usar una interacción Omni persistente,
   una instrucción acotada y guardar su ID. No incluir `aspect_ratio` en una tarea `edit` si el proveedor ya
   preserva el formato del input.
2. **Falta una toma, ángulo o continuidad física completa:** usar Seedance 2.0 como fallback con la referencia
   aprobada. No simular una actuación ausente mediante retime.
3. **Sólo cambia el montaje:** para repetir un gesto ya correcto, cambiar pausas, reordenar beats, construir la
   familia 15/10/6 o hacer hold/freeze, trabajar sobre el mismo master con un editor determinista. Texto/logo
   no diegético, format wall y foley pueden montarse después.
4. En todos los casos, revisar el resultado entero a velocidad real, 0,5× y por frames; un MP4 disponible sólo
   es candidato técnico.
5. Todo texto/logo/practical exacto sale del asset canónico con su hash registrado. El video IA puede ser el
   plate, nunca la fuente de verdad tipográfica.

## Cierre y archivo

1. Actualizar manifest, README, retrospectivo, índice de generaciones y Handoff con estado real.
2. Confirmar que el manifest conserva operating mode, operador, aprobadores y owner de delivery; si una responsabilidad cambió, registrar el handback/escalamiento sin perder lineage.
3. Si el take sigue pendiente de aprobación, declararlo candidato técnico; no entrega final.
4. Al aprobarse, archivar los binarios mediante el flujo gobernado de media y registrar URI, hash, tamaño y propietario.
5. Registrar costo confirmado sólo cuando el ledger o proveedor lo permita; no inferir monto por tokens.

### Creative release no es activación

Cerrar assets y QA permite registrar `creative_release_complete`; no autoriza medios. Mantener
`activationStatus: not_activated` hasta aprobar audiencia, landing, UTMs, pixel/CAPI, conversión, presupuesto,
trafficking, legal, experimento y escucha final por dispositivo. No usar `completado` como sinónimo de campaña
publicada.

## Referencias

- Documentación funcional: docs/documentation/ai-tooling/estudio-de-flujos-creativos.md
- Regla de selección y evidencia cruzada: `.codex/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`
- Piloto Glitch: ai-generations/2026-07-11_glitch-microphone-intro/
- Ruta vigente Glitch: ai-generations/2026-07-11_glitch-microphone-intro/recovery-plan-v2-integral-practical-and-foley.md
- Evidencia rechazada del take I: ai-generations/2026-07-11_glitch-microphone-intro/review/take-i-percussive-tap-on-air-gemini-foley-review.md
- Campaña multimodal 15/10/6: ai-generations/2026-07-18_high-frequency-campaign-e2e/
- Contrato técnico de campaña: docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md
- Método Layout Design & Finishing: docs/manual-de-uso/ai-tooling/producir-layout-design-y-finishing.md
