# Usar BytePlus directo

Carril local del operador. Consume ModelArk/Seed Speech del fabricante en Johor y conserva Fal como alternativa
explícita. No es una ruta de Globe, que permanece hibernado. [Decisión](../../architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md).

## Estado y credenciales

Claves creadas el 2026-10-12: `efeonce-media-directa` (12 familias de media, sin LLMs ni modelos futuros) y
`efeonce-speech-directa` (Seed Speech, proyecto default). Valores en Secret Manager de `efeonce-group`:
`greenhouse-byteplus-api-key` y `greenhouse-byteplus-speech-api-key`. `.env.local` sólo contiene sus referencias.
El resolver de los comandos usa `greenhouse-portal`; tiene `secretAccessor` únicamente sobre esas dos claves.
No se montaron secretos ni se desplegó ningún servicio.

```bash
pnpm ai:byteplus --list
pnpm ai:byteplus --doctor
```

`doctor` consulta tareas de video y consulta una tarea ASR inexistente, sin enviar media, crear tareas ni generar.
Permiso de lectura/autenticación no prueba calidad, derechos ni una generación real de todos los modelos.
La activación de Seedance 1.5 Pro está cerrada por el fabricante: no se incluye como ejecutable.

## Imagen y capas

```bash
pnpm ai:byteplus --model seedream5-flash --prompt-file brief.txt --out imagen.png --estimate
pnpm ai:byteplus --model seedream5-flash --prompt-file brief.txt --out imagen.png --yes
pnpm ai:byteplus --model seedream5-pro --image referencia.png --prompt-file edicion.txt --size 2K --out edit.png --yes
pnpm ai:layers --image pieza.png --provider byteplus --image-size auto_1K --dry-run
pnpm ai:layers --image pieza.png --provider byteplus --image-size auto_1K --run ai-generations/pieza --yes
pnpm ai:layers --image pieza.png --provider byteplus --model seedream5-flash --run ai-generations/pieza-flash --yes
pnpm ai:layers --image pieza.png --provider fal --run ai-generations/pieza-fal --yes
```

`ai:layers` usa BytePlus Pro por defecto. La salida conserva `00-base.png`, PNGs con alfa y `layers.json`:
`ai:mask --from-layer` e `ai:inpaint --layers` usan el mismo contrato. Base y capas son contenido reconstruido:
no implican preservación de todos los píxeles ni un PSD con texto/vector editable.
La caché incluye proveedor, modelo, digest de entrada, resolución y prompt. Una corrida recibida sin documento
completo no se vuelve a cobrar automáticamente; se conserva un recibo y exige revisión o `--force` explícito.

Las solicitudes de imagen esperan hasta 600 s: Pro standard con varias referencias tardó 227 s en una
prueba real. Un timeout no prueba que BytePlus haya cancelado o dejado de cobrar. No hay retry automático;
volver a ejecutar es otra solicitud. [Nexa cine: Pro máximo frente a Sunburst max](../../audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md).
[Cuatro iconos frente a Flare max](../../audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md):
ocho PNG nativos 2048² verificados, sin alfa en esa prueba de fondo opaco; Pro US$0,081 por icono.

Tarifas observadas 2026-10-12, estimadas, no settlement: Flash US$0,018 por salida/capa; Pro US$0,0405/0,081
por imagen y US$0,02025/0,0405 por capa según área ≤/>2,61 millones de píxeles. Se incluye la base; cada capa
se calcula por su tamaño real. El número de capas varía: la cota usa 17 salidas al tier mayor. Lite US$0,0315,
4.5 US$0,036 y 4.0 US$0,027 por imagen. No se aplica otra vez el descuento a esas tarifas.

## Video

```bash
pnpm ai:byteplus --model seedance25 --prompt-file video.txt --duration 5 --resolution 720p --aspect 16:9 --estimate
pnpm ai:byteplus --model seedance25 --prompt-file video.txt --duration 5 --resolution 720p --aspect 16:9 --out clip.mp4 --yes
pnpm ai:byteplus --model seedance2-fast --image inicio.png --prompt-file video.txt --out clip-fast.mp4 --detach --yes
pnpm ai:byteplus --model seedance25 --task-id <id-devuelto> --status
pnpm ai:byteplus --model seedance25 --task-id <id-devuelto> --out clip-recuperado.mp4
```

Todas las seis versiones activadas están en `--list`. `--image` es primer cuadro; `--end-image` es último cuadro;
`--references` convierte las imágenes en referencias. `--video` y `--audio` de referencia de video requieren
URLs HTTPS autorizadas. `--input-file` admite campos avanzados del fabricante; no hace uploads implícitos.
Seedance 2.5 ofrece `--operation edit|extend` con video de entrada. Editar usa ratio adaptive y duration -1.
Extender y generar desde primer/último cuadro también usan ratio adaptive; su estimación depende del input
y no se inventa una cota. Seedance 2.x admite como mínimo 4 segundos. La cotización por ratio usa las
dimensiones nominales del fabricante; el uso real puede variar por padding/audio y se registra por solicitud.
El ID se imprime y se guarda en `receipt.json` antes del polling. Un timeout no reencola ni cancela el trabajo.
Las salidas se guardan localmente antes de que venza la URL. Los recibos no guardan URLs firmadas.

Las tarifas estimadas salen del catálogo de la cuenta. Con video de entrada hay mínimos de tokens variables:
no se inventa una cota. `--max-usd` sólo opera sobre una estimación conocida y no es un límite impuesto a BytePlus.
`usage.completion_tokens` de la respuesta es la evidencia de consumo; estimación y factura son hechos distintos.

## Comparación de costos de Seedance 2.5

Para 30 s, 16:9, sin video de entrada: **720p US$6,93** y **1080p US$17,06** por BytePlus con la tarifa
de cuenta; Fal y la tarifa base de Higgsfield API dan US$13,87 / US$34,12. Descuento final de Higgsfield no
confirmado; el conector por créditos no forma parte de esta comparación.
[Fuente, fórmula y límites del estimador local](../../audits/creative-studio/BYTEPLUS_DIRECT_PRICING_COMPARISON_2026-10-12.md).

## Audio, voz y ASR

```bash
pnpm ai:byteplus --model seed-audio --prompt-file audio.txt --out audio.mp3 --yes
pnpm ai:byteplus --model tts2 --speaker <id-de-Voice-Library> --prompt-file narracion.txt --out voz.mp3 --yes
pnpm ai:byteplus --model asr2-file --audio https://<archivo-autorizado>/audio.wav --out-dir ai-generations/asr --detach --yes
pnpm ai:byteplus --model asr2-file --task-id <id-devuelto> --out transcript.json
pnpm ai:byteplus --model asr2-stream --audio entrada.wav --input-file asr.json --out transcript.json --yes
pnpm ai:byteplus --model interpretation2 --audio entrada.wav --input-file interpretacion.json --out-dir ai-generations/interpretacion --yes
```

TTS 1/2 y Voice Replication 1/2 usan HTTP NDJSON con el resource ID del catálogo. Se concatena el audio base64
y se exige el evento terminal; un stream truncado falla. Voice Replication requiere un speaker ID adquirido y
consentimiento vigente. Enrollment es una operación separada: `--operation enroll --consent --input-file ...`
con speaker_id y audio del contrato; nunca compra slots. La primera síntesis de una voz puede activar un slot
facturable según el contrato del fabricante; no se ejecutó durante esta conexión.

ASR 1/2 de archivos usa submit/query con UUID persistido. ASR streaming usa el protocolo binario gzip del
fabricante. Interpretación usa protobuf, espera SessionStarted antes del audio y exige SessionFinished.
Streaming local admite WAV PCM mono, 16 bits y 16 kHz; no modifica ni elimina la entrada. Los modelos de voz
conservan precio desconocido en esta CLI y exigen `--yes`; no se promete que los trials cubran la corrida.

Ejemplo mínimo `interpretacion.json` (S2T, inglés a español):

```json
{"request":{"mode":"s2t","source_language":"en","target_language":"es"}}
```

S2S requiere además `target_audio` (`format: pcm`, `rate: 24000`), `speaker_id` y `tts_resource_id`. Corpus
personalizado no se expone sin un esquema actualizado. Los protocolos se contrastaron con los archivos oficiales,
sin ejecutar sus demos (uno de los demos borra la entrada al convertir audio).

## Verificación y límites

La instalación no genera contenido por sí sola. Discovery, doctor, estimate y dry-run no cobran.
Generación con `ai:byteplus` requiere `--yes`; `ai:layers` conserva su fence de costo existente.
Las pruebas unitarias verifican transporte, secretos, no retry, precios, alfa/cajas, caché y protocolos.
Seedream 4/4.5 devuelve JPEG; el comando lo convierte localmente a PNG cuando ésa es la extensión solicitada.
Una salida o recibo existente bloquea un nuevo envío accidental; video/ASR se recuperan por task ID.
La disponibilidad de una función en el fabricante no prueba una salida correcta para una pieza de producción.
[Auditoría de esta conexión](../../audits/creative-studio/BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md):
imagen, capas, máscara y video sintéticos; las voces no se clonaron ni se generaron en este canary.
La conexión queda versionada localmente; no hay push/deploy ni promoción de rutas.

Fuentes: [imagen](https://docs.byteplus.com/en/docs/ModelArk/image-generation-api),
[video](https://docs.byteplus.com/en/docs/ModelArk/create-video-generation-task-api),
[TTS](https://docs.byteplus.com/en/docs/byteplusvoice/unidirectional_tts_http),
[ASR](https://docs.byteplus.com/en/docs/byteplusvoice/asraudiofile),
[interpretación](https://docs.byteplus.com/en/docs/byteplusvoice/liveinterpretationapi).
