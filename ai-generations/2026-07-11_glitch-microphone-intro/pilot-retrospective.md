# Retrospectivo del piloto Glitch — El micrófono se abre

> Estado al 2026-07-11: **sin candidato aprobado; gasto detenido después de Z.** T–Z probaron generación integral, guías temporales, guía de actuación y edición localizada. Ninguna toma pasó los dos contactos de 1–2 frames sin degradar continuidad. La evidencia queda en [review/takes-u-to-z-guided-recovery-review.md](./review/takes-u-to-z-guided-recovery-review.md).

## Propósito y alcance

Este documento conserva la evidencia completa de la primera ejecución del Creative Workflow de Glitch. El objetivo terminó definido como una intro vertical de silencio activo: el índice prueba el micrófono con `tap, lift, tap, lift`; cada contacto es un golpe breve de yema y rebote, y sólo el segundo activa una respuesta visual de señal sin convertirse en un efecto de glitch.

El alcance incluyó dirección creativa, preparación de referencia, generación image-to-video por Vertex, revisión técnica, selección de un corte editorial y una prueba de foley nativo de Omni. El posterior finish determinista queda documentado como evidencia de una decisión rechazada: hizo que el `ON AIR` se viera pegado y el gesto se leyera como presión. No incluyó publicación, música, locución, wordmark, upscale ni integración con una ruta de producto.

## Fuentes y contrato creativo

| Elemento | Evidencia |
| --- | --- |
| Key visual canónico | microfono_broadcast_9x16_2160x3840.png |
| Dimensiones | 2160x3840, PNG RGB, vertical 9:16 |
| Hash SHA-256 | fde797f7a096587392ea3cffb4ada4ff260f0e1329e38135ade32cae4904608e |
| Storyboard fuente | storyboard_microfono_9x16_2160x3840.png |
| Motor | Vertex AI, global, gemini-omni-flash-preview |
| Salida editorial prevista | Cinco segundos, 9:16, 24 fps, sin música ni voz antes del corte |

El PNG 4K nunca se modificó. Es la fuente de dirección, color, finish y archivo; ya contiene el `ON AIR` físico dentro del estudio. Los adapters existen únicamente como evidencia del piloto; V2 no admite adapters que borren o difuminen ese practical.

## Pregunta de diagnóstico

La pregunta no era si Omni estaba disponible. El mismo endpoint, modalidad de respuesta y patrón de inline image ya habían producido clips verticales y con personas dentro del workspace. La pregunta era por qué esta combinación de imagen y prompt no llegaba a generar candidatos.

La señal decisiva fue una respuesta HTTP 200 con promptFeedback poblado y candidates vacío. Eso significa que la entrada se bloqueó antes de generar video. El valor OTHER no identifica una categoría específica ni debe tratarse como una explicación de seguridad concluyente.

## Addendum de producción integral — Omni, no Veo

Los takes A–I ya ejecutados eran Gemini Omni sobre Vertex; Veo fue un intento de planificación equivocado que se detuvo y no dejó output de producción. La corrección posterior regresó a la ruta verificada `gemini-omni-flash-preview` / `generateContent` en `global`.

La evidencia nueva no permite afirmar que las letras `ON AIR` por sí solas bloqueen el modelo. Sí muestra un patrón operativo: la imagen íntegra con practical legible, su versión 720p y el video L que ya contenía esa señal fueron bloqueados antes de generar/editar con `promptFeedback.blockReason=OTHER`. En contraste, Omni aceptó una solicitud sólo de texto que describe una señal `ON AIR` física en la pared y generó el plano completo. La respuesta correcta no fue borrar o montar el letrero: fue conservar la fuente como dirección y generar íntegramente el mundo alternativo con el practical ya dentro.

El primer plate integral L fue rechazado: su contacto se prolongó y leía presión. El intento N de ordenar la acción por número de frame también fue rechazado: amplificó ese defecto y generó un segundo golpe resonante. El take O vuelve a una instrucción humana, no mecánica: `tap tap`, strike-and-bounce, hueco de aire visible, y dos foleys cortos. Su master Omni dura 3,008 s y la exportación de 5 s sólo clona el último frame del propio plano y prolonga el silencio; no añade ni manipula el `ON AIR`.

## Addendum Fal / Seedance 2.0

El operador autorizó probar Fal.ai con Seedance 2.0. S se generó mediante `bytedance/seedance-2.0/image-to-video` con el PNG 4K canónico íntegro, 1080p vertical, cinco segundos y audio nativo. A diferencia de la ruta text-only de Omni, retuvo el estudio entregado: composición, micrófono, boom, consola, colores y el practical de fondo. Esa continuidad es una evidencia positiva del motor, no una aprobación del take.

La revisión de S detectó contacto sostenido/ambiguo de la yema contra la rejilla y audio que no se puede aprobar como dos golpes secos exclusivos. Se rechaza íntegro y no se extraen sus píxeles ni audio. T fue preparado con el límite explícito de dos fotogramas por contacto, rebote y aire visible; Fal devolvió `HTTP 403 User is locked — Exhausted balance` antes de crear request o entregar output. Evidencia: [review/take-s-seedance-source-keyvisual-review.md](./review/take-s-seedance-source-keyvisual-review.md), metadata S/T y `render-seedance-2-source-keyvisual-direct-queue.mjs`.

## Línea de tiempo de ejecución

| Hora UTC | Input y acción | Resultado |
| --- | --- | --- |
| 10:01:29 | Take natural, referencia PNG 4K, prompt completo | HTTP 429 RESOURCE_EXHAUSTED; no se produjo MP4. |
| 10:03:49 | Take natural, segundo intento | HTTP 200, OTHER, cero candidatos. |
| 10:04:59 | Prompt simplificado, PNG 4K directo | HTTP 200, OTHER, cero candidatos. |
| 10:06:14 | Prompt simplificado, JPEG 4K directo | HTTP 200, OTHER, cero candidatos. |
| 10:07:33 | Prompt simplificado, PNG 720x1280 por Lanczos | HTTP 200, OTHER, cero candidatos. |
| 10:08:41 | Probe neutro, PNG 720x1280 | HTTP 200, OTHER, cero candidatos. El provider devolvió: The prompt could not be processed. Please try rephrasing the prompt or using different input. |
| 10:14:43–10:15:22 | Take natural, perfil sign-neutral-720-jpeg | Renderizado correcto en un intento. |
| 10:36 | Edición video-a-video persistente por Gemini Omni Interactions | MP4 válido de 10 s; rechazado en revisión por artefactos de continuidad después del primer segundo. |
| 10:40 | Corrección editorial del export Omni existente | Candidato E de 5 s: doble tap, señal tras el segundo contacto y `ON AIR` del key visual 4K. |
| 10:52 | Revisión creativa de E | Rechazado: el `ON AIR` tapaba el índice como overlay y la acción se leía como presión. |
| 10:54 | Finish visual F | Dos golpes de yema con rebote; panel `ON AIR` a escala de practical de fondo, sin ocluir la mano. |
| 11:00 | Interacción Omni `audio-only` | Falló pre-generación: `The prompt could not be processed`; no se produjo audio. |
| 11:02 | Interacción Omni audiovisual `video-97db98fe-6cd4-454a-ae75-caa20381e97f` | MP4 de 5,013 s con AAC 48 kHz; video rechazado por practical deformado y tercer acento, audio retenido para revisión. |
| 11:05 | Finish I | Se conservaron sólo los dos primeros foleys de Omni, se alinearon a la placa F y se descartaron todos los píxeles generados y el tercer transiente. |

Los primeros seis resultados están versionados en manifest.json y en los metadata de masters. No se ocultaron como reintentos de prompt porque son evidencia necesaria para repetir o diagnosticar el flujo.

## Hipótesis, prueba y conclusión

### Lo que la evidencia descarta

- No fue una credencial vencida: se renovaron el login de gcloud y las Application Default Credentials, y el request final usó el mismo proyecto y endpoint.
- No fue una incompatibilidad general de payload: el contrato contents, inlineData y responseModalities coincide con corridas Omni anteriores que sí produjeron video.
- No fue sólo la resolución: el PNG 720x1280 permitido también fue bloqueado.
- No fue sólo la dirección verbal: el probe con instrucción neutra fue bloqueado con el mismo input.

### Recuperación aplicada

Se creó el perfil sign-neutral-720-jpeg. Parte del PNG 4K, escala a 720x1280 y difumina únicamente el rectángulo del letrero legible ON AIR en el adapter. Mantiene mano, micrófono, composición, encuadre, paleta y luz. El adapter es JPEG sin metadata de origen y su hash es df0a460dfbd9222b27fe84d7351b9327e4332248b5263fcd6c663b95b47de0de.

El request que usa ese perfil generó el master en un intento. Eso prueba una conducta del provider, no una solución creativa: el perfil queda prohibido para V2 porque eliminó un elemento esencial de la puesta en escena.

### Límite de la conclusión

La prueba cambió dos variables a la vez: texto legible y contenedor PNG a JPEG. Por eso el letrero es un gatillante probable, no una causa demostrada de forma aislada. La regla reusable no es afirmar que todo texto bloquea Omni; es documentar la entrada exacta, hacer una sola recuperación mínima, preservar el asset canónico y detener nuevas rondas si la recuperación no entrega candidato.

## Resultado producido

| Artefacto | Estado |
| --- | --- |
| Master Omni | masters/glitch-microphone-intro-a-natural-omni-master.mp4 |
| Master técnico | 10.000 s, 720x1280, H.264, 24 fps, 2478786 bytes |
| Export base | exports/glitch-microphone-intro-a-natural-5s-silent.mp4 |
| Export base técnico | 5.000 s, 720x1280, H.264, 24 fps, sin pista de audio, 1447706 bytes |
| Metadata de uso | 59810 tokens totales, tráfico ON_DEMAND |
| Revisión base | review/take-a-natural-review.md, 20 de 25, aprobar para post |
| Placa visual F | Evidencia rechazada: `ON AIR` repuesto en post y gesto retimado. No es aprobable. |
| Candidato vigente | Ninguno. I también está rechazado; ver review/take-i-percussive-tap-on-air-gemini-foley-review.md. |

### Corrección de actuación y tipografía

El take A no comunicaba con precisión el `tap tap` pedido por el operador y el adapter había dejado el practical de fondo como blur. Se usó Gemini Omni Interactions para editar el video existente, con una interacción persistida (`video-b1998a20-6009-44b9-b975-c039eb047f75`). Aunque el proveedor procesó el video y devolvió un MP4, la hoja de contacto mostró fallos de continuidad a partir de ~1 s; ese resultado se rechazó y queda trazado, no se disfraza como candidato.

La primera salida editorial E no regeneró el plano, pero no pasó dirección: su crop de `ON AIR` era demasiado grande y quedaba delante de la mano; además el ritmo se interpretaba como presión. Se conserva como evidencia rechazada. El mismo script fue corregido para producir F: usa un panel 180×118 del visual 4K a x=400/y=257, en el plano de fondo, y arma dos trayectorias de strike-and-rebound. El segundo rebote toma la retirada real de la fuente en avance, no un reverso que pudiera crear un salto.

La revisión técnica de F no encontró dedos extra, penetración de la rejilla, deriva de cámara ni texto generado. Sin embargo, la revisión creativa posterior determinó que el `ON AIR` repuesto todavía parecía una capa añadida y que la actuación se leía como presión. Eso basta para rechazarlo, aunque las métricas de frame fueran correctas.

Para añadir el sonido pedido por el operador, la primera formulación `audio-only` fue rechazada por Omni antes de producir. La segunda interacción audiovisual completó y devolvió AAC 48 kHz, pero su video convirtió el practical en tipografía inestable y añadió un tercer acento, por lo que sus píxeles se rechazaron. `finish-glitch-percussive-tap-with-gemini-foley.mjs` extrajo sólo las ventanas 0,30–0,57 s y 0,83–1,20 s de su audio, descartó el tercer transiente cercano a 2,1 s, y sincronizó sus inicios a los contactos de la placa F. El candidato I mantiene el mismo hash `framemd5` de todos los frames de F y añade una única pista AAC estéreo 48 kHz.

## Decisiones de producción

1. El take natural queda como fuente técnica; E, F, H e I están rechazados. No hay placa visual ni candidato editorial vigente.
2. Para este tipo de plano, `ON AIR` es parte de la escenografía y no pertenece al post. La toma V2 parte del key visual intacto y rechaza una generación que no conserve el practical.
3. El audio nativo Omni es guía candidata, no materia prima de aceptación. El foley final debe pasar una escucha de la respuesta amplificada `micrófono → preamp → monitor/corneta`, no del golpe directo sobre la malla.
4. El montaje determinista conserva valor para timing que no cambie el significado físico; no puede reconstruir este gesto ni este practical.
5. Los binarios del run se archivan en GCS como evidencia rechazada y con manifiesto remoto; no se publicó nada ni se copió a un bundle de producción.

## Ronda Fal T–Z y cierre de gasto

T se ejecutó después de recargar Fal y confirmó que Seedance puede retener el diseño y el `ON AIR` diegético, pero volvió sostenidos los dos contactos y añadió actividad/colas sonoras. U/V/X intentaron referencia temporal con contactos cada vez más compactos; el modelo los expandió sistemáticamente. W/Veo partió de un hover íntegro, pero hizo contactos largos e inventó un orbe. Y/Kling intentó una edición localizada y produjo presión, el mismo orbe y desaparición de la mano. Z transfirió la cadencia de O, pero abrió apoyado y no entregó dos taps separados.

La ronda T–Z costó aproximadamente US$10.44 más token billing de Seedance. Al no existir visual aprobado, `finish-glitch-monitor-response-master.mjs` no se ejecuta como entrega. La corrección del operador sobre audio queda canonizada: deben oírse exactamente dos respuestas amplificadas de la cadena `micrófono → preamp → corneta/monitor`, no dos golpes directos de piel contra la rejilla.

La auditoría posterior encontró una causa más temprana: el 4K ya muestra contacto y señal, aunque el contrato exige hover y señal posterior. La ruta fundada ya no es otro prompt ni 3D —3D fue rechazado por dirección— sino resolver el estado inicial. Si se mantiene la acción, debe aprobarse primero un key visual precontacto fiel al diseño y después probar un tap silencioso antes de escalar.

## Procedimiento reproducible

El procedimiento anterior es histórico. El procedimiento vigente separa verdad de diseño y first frame operativo: valida su compatibilidad, aprueba el estado precontacto, ejecuta preflight del producto, prueba un tap silencioso y sólo después escala a doble tap y audio. Ver [la auditoría de causa raíz](./review/source-state-and-creative-video-workflow-audit.md).

El renderer y las variantes están en render-omni-glitch-intro.mjs. El procedimiento operativo reusable está en docs/manual-de-uso/ai-tooling/operar-pilotos-creative-workflow.md.

## Qué queda pendiente

- Decisión narrativa: aceptar el contacto inicial actual o aprobar un key visual precontacto.
- Si se mantiene el doble tap, prueba silenciosa de un solo contacto con referencia ground-truth y stop rule de dos fallos equivalentes.
- Aprobación creativa del gesto, timing y frame de corte de esa nueva fuente.
- Aprobación de exactamente dos respuestas de corneta/monitor y revisión de la transición con el primer plano real de Glitch.
- Decisión de upscale después del corte aprobado.
- Verificación del archive gobernado de masters y evidencia rechazada.
- Confirmación de gasto desde el ledger o facturación del proveedor, si se necesita conciliación financiera.

## Qué no cambia

Este piloto no cambia el runtime de Greenhouse, no crea una pantalla Studio, no modifica el catálogo de herramientas IA, no publica assets y no aprueba una política global de filtros. El Estudio de Flujos Creativos sigue siendo una propuesta de producto separada.

## Aprendizaje promovido a las skills

Las skills Codex y Claude se corrigieron: el finish determinista se limita a ajustes editoriales que no cambian la verdad física del plano. Una actuación táctil hero y un practical diegético son parte de la toma íntegra, no de una capa posterior. En este caso el diseño sonoro no presenta el contacto acústico directo: presenta la cadena capturada y amplificada `piel/malla → cápsula/preamp → corneta/monitor`, con sólo dos respuestas y gate de escucha propio. Un output `completed` sigue siendo candidato técnico hasta pasar revisión temporal y creativa.
