# Gemini Omni 1.2 Flash en la CLI local (1.1 Preview opcional)

**Corte:** 2026-11-05 (Omni 1.2 Flash). Evidencia previa de Omni 1.1: 2026-09-24. **Alcance:** tooling local `pnpm ai:omni` en Greenhouse. No cambia Globe, su catálogo, créditos, rutas ni despliegues.

> El nombre del archivo conserva `1-1` porque está enlazado desde arquitectura, skills y routers. El contenido vigente es el de Omni 1.2.

## 0. Qué cambió con Omni 1.2 (2026-11-05)

Google lanzó **Gemini Omni 1.2 Flash** el 2026-11-05 como **GA** en Google Cloud. La CLI lo usa **por defecto**; Omni 1.1 Flash Preview queda disponible con `--model 1.1` para reproducir clips anteriores.

| Tema | Omni 1.2 Flash | Omni 1.1 Flash Preview |
| --- | --- | --- |
| ID Cloud | `gemini-omni-1.2-flash` | `gemini-omni-1.1-flash-preview` |
| Etapa | GA; PayGo estándar, cuota fija y Provisioned Throughput | Preview; cuota fija y Provisioned Throughput, sin PayGo |
| Duración de generación | 3–15 s (texto, imagen, referencias); 3–10 s en primer/último cuadro y extensión | 3–10 s |
| Upscale | Sí: 360p→720p/1080p y 720p→1080p/4K | No |
| Edición conversacional | Sí, por `previous_interaction_id` | No probada |
| Precio del video de salida | ~USD 0,07/s a 720p (30 % menos que 1.1, según Google) | ~USD 0,10/s a 720p |
| Máx. tokens de salida | 260.640 | 57.920 |

Afirmaciones de Google (no medidas por nosotros): mejor adherencia a referencias de imagen y video, consistencia de personaje, objeto y escena de principio a fin, diálogo más natural con sincronía labial y varios hablantes, y menos cortes de salto no deseados. Google declara que aún mejora acción deportiva rápida, cambios de guion rápidos y física compleja. Las salidas llevan marca SynthID imperceptible y la ficha Cloud declara soporte C2PA.

**Transición del modelo anterior:** en la Developer API (`gemini-omni-1.1-flash`), desde el **2026-12-03** todas las solicitudes se enrutan automáticamente a 1.2 y se cobran a su tarifa. En Cloud, `gemini-omni-1.1-flash-preview` sigue listado sin fecha de retiro publicada al 2026-11-05.

Fuentes: [ficha Cloud 1.2](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-2-flash) · [anuncio Cloud GA](https://cloud.google.com/blog/products/ai-machine-learning/gemini-omni-1-2-flash-generally-available) · [anuncio Google](https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-omni-1-2-flash/) · [guía Developer](https://aistudio.google.com/docs/omni) · [ficha Cloud 1.1](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash).

## 1. Decisión y arquitectura

`pnpm ai:fal` representa fal.ai e Higgsfield. Omni usa Google directo en un carril separado para no mezclar credenciales, semántica de jobs, costos y salida. El helper puro `src/lib/ai/gemini-omni-cli.ts` contiene el registro de modelos (límites por modelo y tarea), valida el contrato y construye el body. `scripts/ai/gemini-omni.ts` administra autenticación ADC, staging opcional en GCS, POST, GET, estado local mínimo y descarga.

```text
operador → ai:omni → validación local/estimate → GCS inputs si son archivos locales
         → GoogleAuth ADC → POST Interactions (una sola vez)
         → guardar interaction ID → GET de estado → GCS video → MP4 local opcional
```

Endpoint: `POST https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/interactions`, OAuth Bearer, región `global`. Se consulta con `GET .../interactions/{id}`. Omni sólo funciona por Interactions: `generateContent`, Live API y Chat Completions no están soportados. `--model` sólo acepta `1.2`, `1.1` o sus IDs Cloud exactos; no hay fallback de superficie ni IDs de la Developer API. [Interactions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/interactions).

Si la respuesta declara un modelo fuera de Omni 1.1/1.2, la CLI **avisa y conserva el ID**; ya no lanza error. Lanzar después de un submit pagado escondía el interaction ID que se necesita para recuperar el clip.

## 2. Matriz de la CLI

| `--task` | Tarea API | Entradas CLI | Duración 1.2 | Duración 1.1 | Fuente |
| --- | --- | --- | --- | --- | --- |
| `text` | `text_to_video` | prompt | 3–15 s | 3–10 s | [Texto](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-text) |
| `image` | `image_to_video` | prompt + exactamente una `--image` (primer cuadro) | 3–15 s | 3–10 s | [Imagen](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-an-image) |
| `frames` | `image_to_video` | prompt + `--first-frame` + `--last-frame` | 3–10 s | 3–10 s | [Fotogramas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first-and-last-frames) |
| `reference` | `reference_to_video` | prompt + imágenes y/o videos de referencia | 3–15 s | 3–10 s | [Referencias](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-references) |
| `edit` | `edit` | prompt + un video (o `--previous`) + imágenes opcionales | = duración del fuente (≤ 15 s) | = fuente (≤ 10 s) | [Edición](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/edit-videos) |
| `extend` | `extend` | prompt + un video + imágenes opcionales (sólo 1.2) | 3–10 s de extensión | 3–10 s | [Extensión](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/extend-videos) |
| `upscale` | `upscale` | un video (o `--previous`) + `--source-resolution`; prompt opcional | = fuente (≤ 15 s) | no disponible | [Upscale](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/upscale-videos) |

**Límites de entrada que valida la CLI:**

- **Referencias (1.2):** hasta **6 imágenes** (la guía Developer: hasta 3 por personaje para hasta 2 personajes; la ficha Cloud publica 10 imágenes por prompt, la CLI aplica el límite más estricto). Videos de referencia: hasta 3 si la salida dura 3–10 s, **sólo 1** si dura 11–15 s; cada video de referencia local debe durar ≤ 3 s. En 1.1 se conserva el límite anterior: 10 imágenes y 3 videos.
- **Edición (1.2):** hasta 2 imágenes de referencia opcionales; el video fuente dura ≤ 15 s y la salida conserva su duración. En 1.1, hasta 10 imágenes y fuente ≤ 10 s.
- **Extensión (1.2):** hasta 2 imágenes de referencia opcionales; el video fuente puede durar **cualquier largo**: el modelo usa hasta los últimos 10 s, genera 3–10 s nuevos y los concatena sobre hasta los últimos 30 s del fuente (salida total de hasta 40 s). En 1.1 el fuente local se limita a 10 s.
- **Upscale (1.2):** fuente 360p o 720p de hasta 15 s, 16:9 o 9:16; 24 fps se conserva. Transiciones válidas: 360p→720p, 360p→1080p, 720p→1080p, 720p→4K. 360p→4K y 1080p→4K no existen.

**Parámetros:** `--aspect` acepta `16:9` o `9:16`; `--resolution` acepta `360p`, `720p`, `1080p` o `4k`. En `edit` y `upscale` sólo se envía resolución: aspecto y duración vienen del fuente. En `extend` se envían resolución y duración, pero el aspecto se hereda (el endpoint rechazó `aspect_ratio` con HTTP 400 en el canary de 1.1). Video fuente: MP4; imágenes: PNG, JPEG o WebP. La CLI valida cardinalidad, extensión y bytes de archivos locales, y la duración con `ffprobe` si son MP4 locales; la duración/códec de videos que ya están en GCS requiere QA externo. Google presenta 1080p/4K como salidas reescaladas; no describirlas como captura nativa.

## 3. Draft → upscale y turnos (`--previous`)

Omni 1.2 permite producir barato y pagar alta resolución sólo por la toma elegida:

1. Generar borradores a 360p o 720p.
2. Corregir con `edit` sobre el mismo clip, si hace falta.
3. Reescalar la toma ganadora con `--task upscale`.

`--previous <interaction-id>` continúa sobre el video del turno anterior en `edit` o `upscale`, sin volver a subir el video. La CLI envía `previous_interaction_id`, `store:true` y el contenido envuelto en `{"type":"user_input","content":[...]}`, como en el ejemplo oficial de upscale. Las interacciones almacenadas o asíncronas se retienen **hasta 7 días**; para upscale, el turno anterior debe ser el inmediatamente previo y haber generado un video 360p o 720p.

> **Sin canary propio:** el shape de `--previous` sale de la documentación Cloud (ejemplo de upscale). Hasta que una corrida real lo confirme, tratar `--previous` como contrato documentado, no verificado. Si falla, usar el video de GCS como `--video`.

## 4. Preflight GCP

1. Autenticar **ambos** carriles: `pnpm gcloud:auth:playwright -- --force`; verificar con `pnpm gcloud:auth:playwright -- --check-only`. El runner conserva los secretos en `.auth/` ignorada por Git, sin imprimir tokens.
2. Confirmar `efeonce-group` como proyecto activo o pasar `--project` explícito. El helper no cambia el perfil global ni opera el proyecto Globe.
3. Confirmar `aiplatform.googleapis.com` habilitada y permisos `aiplatform.interactions.create/get`. La CLI solicita scope `cloud-platform` con ADC. El acceso al bucket GCS para inputs/output debe existir también.
4. Confirmar cuota del modelo exacto: métrica `global_generate_content_requests_per_minute_per_project_per_base_model` con dimensión `gemini-omni-1.2-flash` (o `gemini-omni-1.1-flash-preview`). 1.2 admite PayGo estándar; 1.1 sólo cuota fija. [Cuotas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas).
5. Elegir un bucket **privado** para staging y output, con lifecycle/retención apropiados. No usar bucket público para material de cliente. La región de procesamiento del modelo es `global` y no satisface un requisito de residencia regional.
6. Revisar permisos de los inputs: imagen, video, marca, voz, rostro, música y persona. Las referencias de audio de 1.2 están restringidas por lista de acceso de Google y la CLI no las expone. Esta CLI es producción técnica local; un MP4 generado no constituye aprobación creativa ni comercial.

## 5. Costo y confirmación

La CLI calcula únicamente el componente **video output nominal**. Los tokens de video por segundo no cambiaron entre versiones: **1.931 / 5.792 / 8.688 / 17.376** para 360p / 720p / 1080p / 4K. Cambió el precio por token:

| Modelo | USD por 1M tokens de video | 360p/s | 720p/s | 1080p/s | 4K/s | 15 s a 720p |
| --- | --- | --- | --- | --- | --- | --- |
| Omni 1.2 Flash | **12,00** | 0,023 | 0,070 | 0,104 | 0,209 | ~1,04 |
| Omni 1.1 Flash Preview | 17,50 | 0,034 | 0,101 | 0,152 | 0,304 | (máx. 10 s) |

**Upscale** se cobra con la misma tarifa por token, con tokens propios por transición y **0 tokens de input**: 360p→720p y 720p→1080p **2.896 tok/s**, 360p→1080p **5.792 tok/s**, 720p→4K **11.584 tok/s**. Un upscale de 10 s 720p→4K ≈ USD 1,39 de video output.

> **De dónde sale el USD 12/1M en Cloud:** la tabla de precios Cloud no se pudo leer (página renderizada por JavaScript). El valor es la tarifa publicada en la Developer API y coincide con el USD 0,07/s a 720p que publica el anuncio Cloud (5.792 × 12 / 1M ≈ 0,0695). Confirmar contra la factura real o la consola de precios.

`--estimate` valida y muestra el costo sin autenticar ni enviar. Para `edit` muestra una cota del máximo del modelo (15 s en 1.2, 10 s en 1.1). Para `upscale` estima con `--duration` como largo del fuente (por defecto 15 s). Todo POST exige `--yes`. `--max-usd` (default **1**) es una cota sobre el **componente nominal**, no un tope de facturación; si el valor la supera, la CLI falla antes del staging y del POST. **Un clip 1.2 de 15 s a 720p (~USD 1,04) ya supera el default:** pasa `--max-usd` explícito después de revisar el precio completo.

## 6. Recetas de uso

La salida va a un prefijo privado en GCS. Sustituye el bucket y el prompt. Las entradas locales necesitan `--staging-uri`; la CLI las sube con `gcloud storage cp`. Las entradas ya en GCS no se duplican.

```bash
# Estimar y validar, sin gasto
pnpm ai:omni --task text --prompt 'Una esfera roja sobre fondo neutro' \
  --duration 3 --resolution 360p --gcs-output gs://BUCKET/omni/smoke/ --estimate

# Texto a video 1.2 de 15 s (borrador 360p). --out espera y descarga el MP4.
pnpm ai:omni --task text --prompt 'Una esfera roja se desplaza lentamente' \
  --duration 15 --resolution 360p --gcs-output gs://BUCKET/omni/draft/ \
  --yes --out ai-generations/omni-draft.mp4

# Reescalar el borrador elegido 360p → 1080p (sólo 1.2)
pnpm ai:omni --task upscale --video gs://BUCKET/omni/draft/clip.mp4 \
  --source-resolution 360p --resolution 1080p --duration 15 \
  --gcs-output gs://BUCKET/omni/final/ --max-usd 1.2 --yes

# Reescalar el video del turno anterior sin volver a subirlo
pnpm ai:omni --task upscale --previous INTERACTION_ID \
  --source-resolution 720p --resolution 4k --duration 10 \
  --gcs-output gs://BUCKET/omni/final/ --max-usd 1.5 --yes

# Editar el clip del turno anterior
pnpm ai:omni --task edit --previous INTERACTION_ID \
  --prompt 'Cambia la luz a atardecer; conserva el movimiento' \
  --gcs-output gs://BUCKET/omni/edit/ --max-usd 1.1 --yes

# Imagen inicial
pnpm ai:omni --task image --image placa.png --staging-uri gs://BUCKET/omni/inputs/ \
  --prompt 'Anima suavemente la cámara' --gcs-output gs://BUCKET/omni/image/ --yes

# Primer y último cuadro (máx. 10 s)
pnpm ai:omni --task frames --first-frame inicio.png --last-frame final.png \
  --staging-uri gs://BUCKET/omni/inputs/ --prompt 'Transición continua entre ambos cuadros' \
  --gcs-output gs://BUCKET/omni/frames/ --yes

# Referencias de imagen y video
pnpm ai:omni --task reference --image gs://BUCKET/ref/estilo.png \
  --video gs://BUCKET/ref/movimiento.mp4 --prompt 'Usa el estilo y el movimiento de las referencias' \
  --gcs-output gs://BUCKET/omni/reference/ --yes

# Extender un MP4 existente (1.2 acepta fuente de cualquier largo)
pnpm ai:omni --task extend --video gs://BUCKET/source/toma.mp4 \
  --prompt 'Continúa la acción de forma natural' \
  --gcs-output gs://BUCKET/omni/extend/ --yes

# Reproducir con el modelo anterior
pnpm ai:omni --model 1.1 --task text --prompt '...' --duration 5 \
  --gcs-output gs://BUCKET/omni/legacy/ --yes

# Retomar sin crear otro trabajo
pnpm ai:omni --status INTERACTION_ID
pnpm ai:omni --wait INTERACTION_ID --out ai-generations/continuacion.mp4
```

## 7. Recuperación, QA y evidencia

El POST se hace **una sola vez**. La respuesta entrega `interaction id`, que se muestra enseguida y se escribe en un JSON local con permisos `0600` bajo `~/.cache/greenhouse/omni/` (o `--state-file`). El estado local guarda identidad del modelo, proyecto, tarea, ID, `previousInteractionId` si aplica, URI de salida y hora; nunca prompt, token o bytes de medios. Si el POST termina en timeout sin ID, el resultado es **indeterminado**: buscar la interacción en Cloud antes de crear otra. `--status` y `--wait` sólo hacen GET y no cobran una nueva generación. La salida se extrae de `steps[type=model_output].content[type=video]`; `--out` descarga el MP4 y comprueba la cabecera `ftyp`.

Para aceptar una ruta como verificada, probar **cada tarea** con material autorizado y un presupuesto acotado; registrar ID, salida retenida, MIME/códec, dimensiones, duración, audio, hash, latencia, errores, tokens y factura real. Edit debe comparar continuidad/preservación; extend debe comprobar duración acumulada, costura, audio y semántica; frames debe verificar correspondencia del primer y último cuadro; upscale debe comparar detalle contra el borrador sin cambios de contenido. Antes de mostrar un video con sonido o animación, el control estándar es `pnpm ai:listen --measure-only` (ffmpeg, sin costo); Gemini, si se usa, es segunda opinión y siempre con `--verify`. Ver [escuchar y mirar media](escuchar-y-mirar-media-con-gemini.md).

El GCS privado es la autoridad de recuperación de salida para esta CLI. Definir lifecycle del bucket y borrar staging cuando corresponda.

### 7.1 Estado de verificación de Omni 1.2 (2026-11-05)

- **Verificado en vivo (sólo lectura):** `GET https://aiplatform.googleapis.com/v1beta1/publishers/google/models/gemini-omni-1.2-flash` respondió 200 con `launchStage: "GA"`; el mismo GET para `gemini-omni-1.1-flash-preview` también respondió 200.
- **Verificado en local:** 17 pruebas del contrato (`src/lib/ai/gemini-omni-cli.test.ts`) y `--estimate` de la CLI para texto 15 s, upscale por archivo y por `--previous`, transición inválida y límites de frames/1.1.
- **Sin verificar en vivo:** ninguna generación 1.2 se ha ejecutado todavía. Faltan canaries de las siete tareas, en especial `upscale` y `--previous`, 15 s, 9:16, límites de referencias, factura real y C2PA en bytes.

## 8. Evidencia histórica de Omni 1.1 (2026-09-24)

Se renovaron y verificaron CLI + ADC para `efeonce-group`; `aiplatform.googleapis.com` está habilitada y la cuota efectiva del modelo exacto fue **10 solicitudes/minuto**. Se ejecutaron las seis intenciones por `pnpm ai:omni` con material sintético o generado dentro de esta prueba, salida 360p/3 s y GCS privado de desarrollo. Cada interacción terminó `completed`, entregó un MP4 descargable y declaró `gemini-omni-1.1-flash-preview`. Todos los MP4 tenían video H.264 640×360 a 24 fps y audio AAC; cinco duraban 3,029 s y `extend` entregó 6,037 s (clip original + continuación). Los seis outputs quedaron retenidos bajo `gs://efeonce-group-greenhouse-private-assets-dev/ai-tooling/omni-1-1-smoke-2026-09-24/`.

La inspección visual de un fotograma medio confirmó una esfera azul en el video fuente y naranja en el resultado de `edit`; un fotograma tardío de `extend` conservó la esfera azul y el fondo neutro. Esto comprueba que los endpoints devolvieron transformaciones visibles; no certifica continuidad fina, mezcla de audio ni calidad final de campaña.

| CLI | Interaction ID | SHA-256 del MP4 local |
| --- | --- | --- |
| `text` | `ChA2ZjdkODNhY2VjMTkzMWJjEAgaATAqBG1haW4` | `4b045891cdf475df088b5fbda18a49558510fccca3d966bf7457e14d139a441d` |
| `image` | `ChA4MThlODdkNTMyNzFjNzQxEAgaATAqBG1haW4` | `e1254ccaf3b10a7a2d368a15d80121ecb0ea530b18886b8e5183adf3716923a5` |
| `frames` | `ChAwMjY3ODMyY2E2ZDVkZWNjEAgaATAqBG1haW4` | `2f31a371e0aef7a65cf76653f54ae3ba200835b4af9aa0c61376faaebdb4a52b` |
| `reference` | `ChAxMzA4NjhkOTAyOWJiMjc5EAgaATAqBG1haW4` | `29055c419cf178962334586ac5e8c15b61cc48cbb0d8059405d2072af73238a5` |
| `edit` (video + imagen) | `ChBmOWQzZTUyOTNmZGJiMzk3EAgaATAqBG1haW4` | `6dc75192100e4f902f037da449d2ce4a3d94f81ae02dda1ad1c353c92bcfb6f0` |
| `extend` | `ChA1NTYwM2NhYTg0MWM1NzBmEAgaATAqBG1haW4` | `af1a314356741427c8257a6f60fb57b1323d5ae12ee7f7ca350fbca69489ec75` |

El primer intento de `edit`/`extend` con un `response_format` genérico recibió HTTP 400. Se corrigió el cuerpo por tarea y se repitió con éxito. El componente nominal de video de las seis corridas fue aproximadamente USD 0,608 antes de input/texto/impuestos; no es una lectura de factura.

**Pendientes:** revisión temporal completa de fidelidad/continuidad y escucha de audio, inspección C2PA, factura real, lifecycle del bucket, canaries de 1.2 (incluidos upscale y turnos), 9:16 y límites de referencias. La generación técnica no aprueba un asset comercial ni activa Globe.
