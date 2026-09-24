# SKY × Efeonce — generación completa v8

## Estado

Autorización del operador: «Bien, planea lo que te falte y lanza una generación completa».

Una generación enviada a Higgsfield, Seedance 2.5 `omni_reference`. Job `d95bc588-b929-4715-8ff7-ea26fe7128cd`. Completada y revisada el 2026-09-24: NO pasa QA. No sustituye la versión aprobada. Archivo `sky-v8-native.mp4`, 30,05 s, 720p; evidencia en `sky-v8-native-qa/` y `REVISION.md`. El operador avisó que había terminado antes de recibir la revisión; el seguimiento no cerró a tiempo.

Solicitud: 30 segundos, vertical 9:16, 720p, bitrate alto, música y SFX nativos. Preflight definitivo con todos los medios: 210 créditos. Una salida solicitada. No se enviaron videos anteriores como fuente de edición.

## Preparación

- 30 referencias visuales existentes: orden y hashes verificados; IDs reutilizados para evitar nuevas importaciones. `references.json` conserva el vínculo exacto con archivos locales.
- 1 referencia de audio: música/SFX de la v7, separados de la voz con Demucs. Scribe no reconoció palabras. Se transfirió su preview MP3 mediante remux sin recodificar, respetando el tipo `audio/mpeg` exigido por Higgsfield. La separación no garantiza fidelidad perceptual perfecta.
- Prompt de 5746 caracteres: cada referencia tiene una función. Copy identificado como material exclusivamente visual; bloque final de audio enumera sonidos permitidos y excluye narración, lectura y vocalizaciones.
- `request.json`, `estimate.json`, `submission.json` y `audio-reference.json` registran la operación.

## Secuencia y cámara

| Tiempo | Acción | Cámara y lectura |
|---|---|---|
| 0–2 | Escritura, Enter e inicio musical | B lateral hacia A frontal |
| 2–3,75 | Tres resultados, tres acentos | C oblicua, profundidad de interfaz |
| 3,75–4,85 | Pregunta de usuario sola | A desciende al abrir espacio |
| 4,85–8 | Respuesta progresiva y cita SKY | Lectura completa desde 6,1; foco en cita a 7,8 |
| 8–9,5 | Cita brilla y revela cielo | Push hacia la cita |
| 9,5–12 | Avión se aproxima ya en vuelo | A frontal tres cuartos, crece por velocidad relativa |
| 12–13 | Pasada sobre cámara | B baja, corte sobre movimiento y Doppler |
| 13–15,5 | Salida aérea | C trasera oblicua, cámara más lenta que avión |
| 15,5–18 | Un año creando con SKY | B profundidad hacia A legible |
| 18–20,5 | Plus, número, piezas | Plus actúa primero; composición estable desde 18,6 |
| 20,5–23 | Agencia SEO/AEO | C oblicua hacia frontal; texto completo desde 21,2 |
| 23–25 | Gracias | Llegada amplia y pausa |
| 25–27 | Efeonce/SKY y URL sobre azul | A fija |
| 27–30 | Fondo pasa a morado, cierre | Logos y URL inmóviles; morado desde 28,2 |

## Revisión al terminar

Verificar el archivo completo: secuencia sin retrocesos, identidad y realismo del avión en tres vistas, velocidad coherente, lectura y exactitud de copy/logos/URL, plus independiente, azul antes de morado. Verificar audio completo para detectar voz; el prompt no garantiza su ausencia. Comparar con la v6 aprobada y conservar ambas hasta revisión del operador. Sin publicación.

## Corrección del operador sobre resolución

El operador indicó que debió generarse directamente a 1080p. Aceptado: mínimo 1080p para entrega final y próximas generaciones. El job en curso sigue siendo 720p; cualquier escalado debe identificarse como tal y no como 1080p nativo. No lanzar una segunda generación solo por esta observación mientras la actual está pendiente.

## Flujo Draft sugerido por el operador

El operador señaló Preview/Draft para iterar a menor costo y luego generar 1080p desde el borrador. Verificación: la API oficial BytePlus soporta `draft=true` (480p) para Dreamina Seedance 2.5 y una solicitud final con `content.type=draft_task` y el ID del borrador. Artlist documenta el paso a 1080p desde el draft, cobro de ambos pasos y vigencia de 7 días. No equivale a una generación normal a 480p ni al modo Fast de Seedance 2.0.

El esquema vivo del conector Higgsfield usado aquí NO expone `draft` ni `draft_task_id`; sí 480p/720p/1080p y modos de generación, edición y extensión. No inferir que un campo libre sería transmitido al backend ni lanzar una prueba paga para comprobarlo. La disponibilidad operativa del flujo Draft→1080p en este conector aún no está confirmada. El job v8 es una generación normal 720p, no un Draft convertible por ese mecanismo. Usar Draft para próximas iteraciones cuando la ruta exponga de manera verificada ambas etapas; conservar el borrador y su ID, y revisar nuevamente el final.

Fuentes: https://docs.byteplus.com/zh-CN/docs/modelark/1520757 ; https://docs.byteplus.com/zh-CN/docs/modelark/2298881 ; https://help.artlist.io/hc/en-us/articles/38194082501021-Seedance-2-5 .

### Verificación directa posterior en la web de Higgsfield

Confirmado por Computer Use: el selector de modelos ofrece «Seedance 2.5 Draft — Nuevo — 480p — 4s-30s». Al seleccionarlo, la URL es https://higgsfield.ai/es/ai/video?model=seedance_2_5_draft y el botón muestra «Generar borrador 15» con duración 5 s. WebMCP `get_video_draft` devuelve modelo `seedance_2_5_draft`, precio mostrado/efectivo 15 y bloqueo `authentication_required` en el navegador sin sesión. No se ha generado nada desde la web. La existencia en Higgsfield está confirmada aunque su catálogo MCP consultado anteriormente no lo enumeró. La acción posterior de convertir ese draft a 1080p aún no se ha probado en Higgsfield.
