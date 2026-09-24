# SKY × Efeonce — iteración 7

## Encargo autorizado

Continuar la versión 6 que el operador valoró positivamente. Edición completa con Seedance 2.5, sin generar tramos independientes. Música y SFX nativos; ninguna voz. Mejorar sincronía, respuesta del chat, tipografía cinética (especialmente el +) y continuidad de las tres cámaras en todo el video.

## Base y referencias

- Master visual: `../v6/sky-v6-finished-silent.mp4`, 30 segundos. Identidad y hash en `baseline.json`.
- Las 30 referencias anteriores están conectadas al nodo; manifiesto con paths, hashes e identificadores en `preflight.json`.
- El video aprobado manda la secuencia y el diseño. Las imágenes conservan identidad y forma; no definen un montaje alternativo.
- No se pasa el video Minimax como referencia adicional.

## Ruta

- Fal: balance consultado sin saldo disponible en las dos cuentas.
- ElevenLabs: modelo `bytedance-seedance-v2.5-edit`, 720p, `generate_audio=true`, proporción/duración automáticas según origen.
- Flow: https://elevenlabs.io/app/flows/c1xwy5PjHyOFVHtKgBAy
- Higgsfield: alternativa autorizada; `seedance_2_5`, modo `video_edit`, audio nativo disponible. Render enviado, ID `6a04807f-9fac-4f69-8a85-64848be5bd25`; estimación 225 créditos Higgsfield.
- Estimación ElevenLabs: una generación, 100833.552 créditos del proveedor, US$22.18338144. No son Studio Credits de Efeonce.
- Primer intento: rechazo terminal por prompt mayor de 6000 caracteres; no produjo video. Registro `attempt1-validation-failure.json`.
- Segundo intento: prompt compacto de 5319 caracteres, registro `submission2.json`. Rechazo terminal por proporción de imágenes fuera de 0,4–2,5; afecta vistas aisladas del avión y tipografía panorámica. No produjo video.
- Exportación técnica sin costo en ElevenLabs (`eleven_composition`, generación `bVxgJ3IRu48wBrLEqwt7`): un único master visual, sin inferencia. Exportado para transferirlo a Higgsfield; ffprobe verificó H.264 720×1280, 30 s, sin audio tras remux.
- Higgsfield recibió el master completo y las mismas 30 referencias sin recortar. Petición y respuesta en `higgsfield-request.json` y `higgsfield-submission.json`.
- Verificación de transferencia: 720 fotogramas a 24 fps, comparación a 360×640, SSIM Y/U/V/All = 1,000000 entre origen y exportación. Evidencia `transfer-ssim.log`. La transferencia no introdujo cambios visuales en esa comparación.

## Revisión requerida del resultado

| Ventana | Cambio esperado | Estado |
|---|---|---|
| 0–1 s | Silencio breve, escritura con SFX, música solo desde Enter | Pendiente |
| 2–3,75 s | Sonidos ligados a las tres opciones | Pendiente |
| 3,75–8 s | Pregunta sola, respuesta que despliega, cita ligada a la respuesta | Pendiente |
| 8–9,5 s | Foco/clic/brillo del chip motivan transición y acento musical | Pendiente |
| 9,5–15,5 s | Avión idéntico, realista, velocidad y Doppler coherentes | Pendiente |
| 15,5–18 s | Título con llegada y pausa legible | Pendiente |
| 18–20,5 s | Plus independiente, luego número y piezas, lectura estable | Pendiente |
| 20,5–23 s | Jerarquía que termina en SEO/AEO | Pendiente |
| 23–25 s | Gracias con resolución emocional | Pendiente |
| 25–30 s | Logos/URL exactos, azul primero, morado después | Pendiente |
| Todo | Sin voz, sin escenas repetidas ni cortes añadidos | Pendiente |

No sustituir la versión 6 por un candidato con regresiones. Revisión por fotogramas y métricas no equivale a escucha humana ni aprobación del operador. Estado de distribución: revisión interna, sin publicación.


## Resultado nativo y decisión tras revisión — 2026-09-24

- Higgsfield terminó el render completo: `sky-v7-seedance-native.mp4` (29,709 s). El operador valoró positivamente su música y SFX; conservarlos como base.
- No cumple como entrega final: la secuencia del chat vuelve a resultados aproximadamente entre 5,75 y 8 s; aparece lectura hablada de los títulos. Scribe transcribió “Un año creando con Sky, dos mil piezas, y ahora nos eligió como su agencia SEO. Gracias, Sky.”. Evidencia: `native-audio-speech-failure.json`.
- El prompt sí contenía prohibiciones explícitas de narrar y leer texto. Por tanto, reforzar esas palabras no constituye garantía.
- Se separaron stems localmente con Demucs htdemucs_ft. `audio-clean.wav` es un candidato: Scribe completó su análisis sin reconocer palabras (transcripción vacía); la fidelidad perceptual todavía debe revisarse, pues la separación puede modificar timbre y SFX. El original se conserva.
- Se renderizaron alternativas editoriales de chat y títulos en `finish/`, sin reemplazar el master aprobado. No son una nueva generación Seedance.

### Generación nueva versus edición

Recomendación para una siguiente iteración cinematográfica: una generación completa de 30 s en `omni_reference`, con referencias de identidad y diseño asignadas expresamente a cada escena. Las mejoras abarcan coreografía del chat, tipografía y cámaras: una reconstrucción global puede ofrecer más libertad que solicitar conservación estricta y cambios simultáneos en un edit. Es una inferencia creativa, no una garantía de superioridad.

El edit sigue siendo preferible si se limita el objetivo a quitar voz manteniendo exactamente el video que ya gusta. No hay evidencia de que cambiar de modo resuelva automáticamente la narración.

Preflight de Higgsfield del 24 de septiembre: una generación nueva de 30 s, 720p, 9:16, audio activo, bitrate alto: 210 créditos sin referencias todavía en esa estimación. Edición anterior: 225 créditos. No se ha enviado una segunda generación de video; verificar presupuesto final con todos los medios antes de enviarla.

Preparación del próximo prompt:
- Separar identidad del avión, composición de interfaz, copy visual, cámara y audio.
- Designar las vistas aisladas como el MISMO avión, nunca como aeronaves distintas ni cuadros de un pase de diapositivas.
- Estados irreversibles: búsqueda → resultados → pregunta de usuario → respuesta → cita → avión → títulos → cierre; ninguna vuelta a resultados.
- Distinguir acción del objeto y trayectoria de cámara en cada bloque.
- El copy es material visual exclusivamente. No declararlo como diálogo, guion hablado ni subtítulos de un narrador.
- Audio permitido: instrumentos y SFX de las acciones. Cerrar con exclusión explícita de lectura, voces humanas/sintéticas y vocalizaciones. Esta formulación requiere prueba.
- Mantener la música/SFX aprobados como referencia tras verificar limpieza. Una referencia sonora guía tempo y ambiente; no garantiza copia exacta. Conservar el archivo original para poder restaurar el audio aprobado.

Fuentes consultadas: https://runware.ai/docs/models/bytedance-seedance-2-5/guides/prompting y https://runware.ai/docs/models/bytedance-seedance-2-5/guides/multi-reference-production . Esquema vivo de Higgsfield confirma `omni_reference`, `video_edit`, referencias de audio y `generate_audio`; no expone un parámetro separado para prohibir voz.
