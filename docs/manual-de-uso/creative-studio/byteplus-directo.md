# Usar BytePlus directo

**OmniHuman 2.0 pertenece a Vision AI y no está conectado a estos comandos.** Ver su
[manual API separado](omnihuman-2-api.md): autenticación, límites y recuperación distintos.
El `--doctor` de esta CLI no valida acceso a Vision AI.

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

### Modo borrador de Seedance 2.5 (desde 2026-10-16)

Sirve para explorar barato y llevar a 1080p **la misma toma** que se aprobó, no otra parecida.

```bash
# 1. Borrador a 480p (siempre 480p; el comando rechaza otra resolución antes de llamar)
pnpm ai:byteplus --model seedance25 --draft --image cuadro.png --prompt-file toma.txt --duration 4 --out borrador.mp4 --yes
# 2. Final 1080p desde ese borrador: sin prompt, imágenes, duración, ratio ni audio
pnpm ai:byteplus --model seedance25 --from-draft <task-id-del-borrador> --out final-1080p.mp4 --yes
```

- **Contrato del fabricante** ([tutorial Seedance 2.5, Draft mode](https://ai.byteplus.com/ark/region:ap-southeast-1/docs/seedance-2-5#2.5_draft_mode)):
  el borrador lleva `draft: true` y sólo 480p; el final lleva `content: [{type: "draft_task", draft_task: {id}}]`,
  el mismo modelo y `resolution: "1080p"` (única admitida). BytePlus reutiliza prompt, referencias, duración, ratio,
  seed, audio y tipo de tarea del borrador: **reenviarlos es error aunque coincidan**, y el comando lo bloquea antes
  de llamar. Sólo admite además `watermark`, `return_last_frame`, `output_format`, `service_tier`,
  `execution_expires_after`, `priority`, `callback_url` y `safety_identifier` (vía `--input-file`).
- **Vigencia: 7 días desde `created_at` del borrador.** El recibo del borrador guarda `createdAt` y `draftExpiresAt`;
  `--from-draft` lee el borrador (GET, sin costo) y rechaza uno vencido o que no terminó, sin crear nada.
- **Cobro:** dos tareas independientes. El borrador se cobra como 480p y el final a la tarifa de 1080p (11,7 USD por
  millón de tokens sin video de entrada). Con primer cuadro el ratio es `adaptive` y no hay cota previa.
- **Medido el 2026-10-16** (plano de la lata, 4 s, primer cuadro 4:5, con audio): borrador 580×726, 39.887 tokens
  (≈ USD 0,43); final 1288×1610, 196.432 tokens (≈ USD 2,30). El final es la misma toma, cuadro a cuadro.
- `--draft` y `--from-draft` sólo existen para modelos con `draft` en el catálogo (hoy `seedance25`).

### Rostros humanos reales: rechazo por privacidad

Seedance 2.5 y 2.0 **no aceptan imágenes ni videos de entrada con rostros humanos reales**: responden
`InputImageSensitiveContentDetected.PrivacyInformation` (medido el 2026-10-16 con un cuadro fotorrealista de GPT Image).
El comando traduce ese error con las vías oficiales ([guía de retratos](https://docs.byteplus.com/en/docs/ModelArk/2608626)):

1. **Salidas propias de confianza:** una salida original con rostro de **Seedream 5.0 (lite/pro/flash)
   texto-a-imagen**, de un video de Seedance 2.x o de su último cuadro, generada en esta misma cuenta hace menos de
   30 días, sin editar ni recomprimir. Por eso el comando envía PNG/JPEG/WebP locales con sus bytes originales.
   Una edición o imagen-a-imagen de Seedream sobre una imagen externa no cuenta.
2. **Biblioteca privada de assets** (`asset://<asset-id>`): personajes propios (retratos virtuales) o personas reales
   autorizadas (retratos reales).
3. **Retratos reales autorizados:** la persona entra con su propia cuenta por QR, acepta y hace verificación en vivo.

Un cuadro de GPT Image con una persona no entra por ninguna de las tres vías sin ese proceso. Detalle verificado y
fuentes: [investigación del 2026-10-17](../../audits/creative-studio/BYTEPLUS_PORTRAIT_ASSETS_RESEARCH_2026-10-17.md).

**El KYC está aprobado (2026-10-17) y no levanta el filtro:** sólo habilita el plan. Re-prueba del 2026-10-17 con el
cuadro de Antonio (GPT Image): rechazo `InputImageSensitiveContentDetected.PrivacyInformation`, requestId
`021792214360538f9cb936a41ab283113693068986f31c344e0f1`, sin tarea ni cobro. No se «lava» un cuadro con rostro
pasándolo por Seedream.

**Personajes propios (Nexa y el elenco): biblioteca privada de retratos virtuales**
([guía](https://docs.byteplus.com/en/docs/ModelArk/2333565)). Es la vía para personajes que poseemos y que no se parecen
a ninguna persona real. En orden:

1. **KYC de organización.** **Hecho:** enviado el 2026-10-16, aprobado el 2026-10-17. Lo hace el operador: el agente no
   ingresa documentos de identidad ni datos tributarios.
2. **Advanced Creation Rights (Entry)**, gratuito. **Hecho:** activo desde el 2026-10-17. Cupo: **50 assets (archivos)
   y 50 grupos (personajes)**, compartido con los retratos reales. Con 2 imágenes por personaje alcanza para 25. El
   tier siguiente cuesta USD 1.400/mes o 14.000/año (oficial), sin reembolso; se evalúa recién cuando la herramienta
   de producción esté armada.
3. **Decisión y fila en el [ledger de cupos](../../operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md)**
   antes de subir (obligatorio), con la **carpeta de evidencia** que exige la carta de compromiso: fichas, prompts,
   logs de generación e intermedias.
4. **Subir:** Model Playground → My assets → Virtual Portrait → Manage assets → un grupo por personaje (la carta de
   compromiso se firma antes, al activar el plan, con un código que llega por correo; observado 2026-10-17). Por personaje, cuerpo entero vertical frontal y primer plano vertical frontal sin
   expresión (300–6000 px, proporción 0,4–2,5, menos de 30 MB). Estados: `Processing` → `Active` o `Failed`.
5. **Activar el Asset Service** de la cuenta (una vez), en la consola de ModelArk → Open Management, región
   ap-southeast-1. Sin eso, toda request con `asset://` falla con `InvalidParameter` en `content[n].image_url.url`
   («Your account has not activated the Asset Service»), aunque los archivos ya estén subidos (medido el 2026-10-17).
   La CLI lo explica así desde ese día. Lo activa el operador.
6. **Usarlos** cuando estén `Active`, como referencia, nombrándolos «Image 1» en el prompt (nunca el id):
   `pnpm ai:byteplus --model seedance25 --draft --references --image asset://<asset-id> ...`. Como primer cuadro
   (`--image` sin `--references`) no está documentado: probar con un borrador antes de planificar con él. Anotar
   grupo, asset id(s) y estado en el ledger.

Un personaje de una sola pieza no necesita cupo: genera su cuadro nativamente con Seedream 5.0 texto-a-imagen en esta
cuenta (y úsalo dentro de 30 días, sin editar) o produce sus planos en Higgsfield. Una persona real (por ejemplo,
Julio) va por la biblioteca de retratos reales y descuenta del mismo cupo. La gestión de assets por API exige AK/SK y
URL pública por archivo; no está implementada en este comando.

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
