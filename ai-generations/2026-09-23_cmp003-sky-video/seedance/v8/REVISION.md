# Revisión v8 — 2026-09-24

## Resultado

Render completado; NO aprobado por QA. Sin nuevas generaciones de video ni publicación durante esta revisión.

Evidencia: revisión visual de seis hojas de contacto, 4 fotogramas por segundo, cubriendo 0–30 s; ffprobe y métricas en `sky-v8-native-qa/`. No equivale a reproducción auditiva perceptual completa. Audio íntegro transcrito con Eleven Scribe, resultado en `native-audio-speech-review.json`.

- 0–2,25 s: escritura con encuadre muy cerrado que recorta la consulta mientras se forma; la pregunta queda visible al alejarse.
- 2,75–4,25 s: aparecen los tres resultados.
- 5,5–8,75 s: reaparecen los resultados. Se omite el turno de usuario y la respuesta LLM prevista. El chip SKY sustituye visualmente parte de la tercera tarjeta. Regresión narrativa bloqueante.
- 10–15,75 s: aproximación, pasada cercana y salida trasera del avión. Se conservan el avión y cielo fotográficos en las muestras. La continuidad de velocidad exige reproducción temporal, no queda certificada solo por hojas de contacto.
- 16–18 s: «Un año creando con SKY.» pequeño, con amplia superficie vacía.
- 18,25–20,75 s: «+2.000 piezas.» legible. El cambio de color también afecta a los números; la actuación independiente del plus no está lograda en las muestras.
- 21–24,75 s: «su agencia» aparece antes de completar la línea introductoria; SEO/AEO llega después. Se dificulta el orden de lectura previsto.
- 25–26,75 s: gracias.
- 27–30 s: azul y luego morado correctos; URL muy pequeña y tenue. Marcas sintetizadas: requieren comprobación contra SVG oficial antes de aprobar.

## Voz y lectura

Scribe: «Un año creando con Sky. Dos mil piezas. Y ahora nos eligió como su agencia SEO-DO. Gracias, Sky.»

La detección confirma voz y respalda el reporte del operador de lectura incorrecta en SEO/AEO. ASR no es una medición fonética exacta. El plus de +2.000 tampoco se refleja como «más de» en la lectura. El operador precisa que el problema es la mala lectura, no solamente la existencia de voz; esto no se considera aprobación automática para añadir narración en próximas versiones.

El audio de referencia limpio y la prohibición en el prompt no evitaron voz nueva. El esquema de fal ofrece `generate_audio`, pero no controles separados para voz, música y SFX. Desactivarlo elimina toda generación de audio; pedir solo música/SFX en el prompt sigue siendo una instrucción probabilística. Si se acuerda voz, se debe escribir una pista hablada explícita con pronunciación de las siglas, separada del copy visual, y revisarla de nuevo. Si se mantiene sin voz, conservar música/SFX aprobados mediante una pista controlada es la alternativa verificable.

## Fal: saldo y Draft

Lectura autenticada con `pnpm ai:fal --balance`: cuenta A −3,86 USD; cuenta B 46,74 USD.

Catálogo vivo `GET https://api.fal.ai/v1/models?q=seedance&limit=100`: 27 endpoints, `has_more=false`, ninguno Draft. Evidencia completa: `fal-seedance-catalog.json`.

Esquema vivo `bytedance/seedance-2.5/reference-to-video`: resoluciones 480p, 720p y 1080p; tareas reference, editing y extension. Sin `draft`, `draft_task` ni mecanismo de promoción. Evidencia: `fal-seedance-reference-schema.json`.

Conclusión: Draft→final de Seedance no está expuesto por la API pública de fal consultada. 480p normal y Seedance 2.0 Fast/Mini no equivalen a ese flujo. Higgsfield web sí mostró Seedance 2.5 Draft; el conector MCP no lo expone, y la promoción a 1080p en esa web aún no se verificó.

Fuentes: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api ; https://fal.ai/docs/platform-apis/v1/models .

Próxima generación final: mínimo 1080p nativo. Corregir la secuencia AEO, jerarquía de lectura y cierre antes de gastar en otro render completo.
