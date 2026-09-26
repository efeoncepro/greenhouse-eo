# Gemini Omni 1.1 Flash en la CLI local

**Corte:** 2026-09-24. **Alcance:** tooling local `pnpm ai:omni` en Greenhouse. No cambia Globe, su catálogo, créditos, rutas ni despliegues. Los hechos de API y precio se revalidaron contra documentación oficial de Google; el acceso real se debe comprobar con el proyecto y una corrida de cada operación.

## 1. Decisión y arquitectura

`pnpm ai:fal` representa fal.ai e Higgsfield. Omni usa Google directo en un carril separado para no mezclar credenciales, semántica de jobs, costos y salida. El helper puro `src/lib/ai/gemini-omni-cli.ts` valida el contrato y construye el body. `scripts/ai/gemini-omni.ts` administra autenticación ADC, staging opcional en GCS, POST, GET, estado local mínimo y descarga.

```text
operador → ai:omni → validación local/estimate → GCS inputs si son archivos locales
         → GoogleAuth ADC → POST Interactions (una sola vez)
         → guardar interaction ID → GET de estado → GCS video → MP4 local opcional
```

La identidad exacta Cloud es `gemini-omni-1.1-flash-preview` en `global`, con OAuth Bearer y API `v1beta1`. `gemini-omni-1.1-flash` es la identidad distinta de Gemini Developer API; esta CLI no la usa. Modelo y URL están fijados deliberadamente, sin `--model` genérico ni fallback de superficie. [Ficha Cloud](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash) · [guía Developer](https://ai.google.dev/gemini-api/docs/omni).

El endpoint es `POST /v1beta1/projects/{project}/locations/global/interactions`. El mismo endpoint cubre las cinco tareas API; la CLI separa seis intenciones porque una o dos imágenes tienen roles distintos. Se consulta con `GET .../interactions/{id}`. `background:true` y `store:true` van en el nivel superior. `response_format` solicita `delivery:"uri"` y **exige** `gcs_uri` válido en Cloud; se fija `resolution`, `duration` y `aspect_ratio`. [RPC](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rpc/genai.vertex.v1beta1) · [Interactions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/interactions-api).

## 2. Matriz exhaustiva de la CLI

| `--task` | Tarea API | Entradas CLI | Shape enviado | Fuente |
| --- | --- | --- | --- | --- |
| `text` | `text_to_video` | prompt | elemento `text` | [Texto](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-text) |
| `image` | `image_to_video` | prompt + exactamente una `--image` | texto + imagen | [Imagen](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-an-image) |
| `frames` | `image_to_video` | prompt + `--first-frame` + `--last-frame` | texto + imagen inicial + final, en ese orden | [Fotogramas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-first-and-last-frames) |
| `reference` | `reference_to_video` | prompt + 1–10 imágenes y/o 1–3 videos | texto + referencias | [Referencias](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-references) |
| `edit` | `edit` | prompt + exactamente un video, imágenes opcionales | texto + referencias de imagen + video base | [Edición](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/edit-videos) · [notebook](https://github.com/GoogleCloudPlatform/generative-ai/blob/main/vision/getting-started/gemini_omni_1_1_flash_video_gen.ipynb) |
| `extend` | `extend` | prompt + exactamente un video | texto + video base | [Extensión](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/extend-videos) · [notebook](https://github.com/GoogleCloudPlatform/generative-ai/blob/main/vision/getting-started/gemini_omni_1_1_flash_video_gen.ipynb) |

`replace`, `restyle`, iluminación y cambios de objeto son instrucciones de `edit`, no endpoints API distintos. La guía Cloud de extensión muestra una **imagen** en su ejemplo aunque nombra `task:"extend"`; el notebook oficial usa un **video**. La CLI sigue el notebook y necesita un canary real de extensión para cerrar esa contradicción. Los ejemplos Cloud asíncronos también ubican `background` dentro de `input` y uno de edición dice `output` donde la referencia RPC indica `resolution`; se usa el contrato RPC, no esos ejemplos.

**Parámetros:** `--duration` acepta enteros de 3 a 10 s; `--aspect` acepta `16:9` o `9:16`; `--resolution` acepta `360p`, `720p`, `1080p` o `4k`. En `edit` sólo se envía resolución: aspecto y duración vienen del video fuente. En `extend` se envían resolución y duración, pero el aspecto se hereda; el endpoint rechazó `aspect_ratio` con HTTP 400 en un canary real. Video fuente: MP4; imágenes: PNG, JPEG o WebP. La ficha Cloud publica máximo 10 imágenes, 3 videos por prompt y video de entrada de hasta 10 s. La CLI valida cardinalidad, extensión y bytes de archivos locales, y su duración con `ffprobe` si son MP4 locales; la duración/códec de videos preexistentes en GCS requiere QA externo. 1080p/4K son salidas reescaladas según Google; no describirlas como captura nativa. [Ficha](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash).

## 3. Preflight GCP

1. Autenticar **ambos** carriles: `pnpm gcloud:auth:playwright -- --force`; verificar con `pnpm gcloud:auth:playwright -- --check-only`. El runner conserva los secretos en `.auth/` ignorada por Git, sin imprimir tokens.
2. Confirmar `efeonce-group` como proyecto activo o pasar `--project` explícito. El helper no cambia el perfil global ni opera el proyecto Globe.
3. Confirmar `aiplatform.googleapis.com` habilitada y permisos `aiplatform.interactions.create/get`. La CLI solicita scope `cloud-platform` con ADC. El acceso al bucket GCS para inputs/output debe existir también. [RPC](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rpc/genai.vertex.v1beta1).
4. Confirmar la cuota del modelo exacto: métrica `global_generate_content_requests_per_minute_per_project_per_base_model`, dimensión `gemini-omni-1.1-flash-preview`. Cloud publica **fixed quota**, sin PayGo para este modelo; cuenta GCP y billing por sí solos no bastan. [Cuotas](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/quotas).
5. Elegir un bucket **privado** para staging y output, con lifecycle/retención apropiados. No usar bucket público para material de cliente. La región de procesamiento del modelo es `global` y no satisface un requisito de residencia regional.
6. Revisar permisos de los inputs: imagen, video, marca, voz, rostro, música y persona. Esta CLI es producción técnica local; un MP4 generado no constituye aprobación creativa ni comercial.

## 4. Costo y confirmación

La CLI calcula únicamente el componente **video output nominal** con los valores Cloud publicados: 1.931 / 5.792 / 8.688 / 17.376 tokens por segundo para 360p / 720p / 1080p / 4K, a USD 17,50 por millón de tokens de video. Input multimodal, texto, razonamiento, impuestos, redondeo y descuentos no entran en esa cifra. A 10 s, el output nominal es aproximadamente USD 0,338 / 1,014 / 1,520 / 3,041 respectivamente. [Precios Cloud](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

`--estimate` valida y muestra el costo sin autenticar ni enviar. Para `edit` muestra una cota de video output de 10 s a la resolución solicitada, porque la duración fuente no se controla en `response_format`. Todo POST exige `--yes`. `--max-usd` (default 1) es una cota sobre el **componente nominal**, no un tope de facturación contractual; si el valor calculado la supera, el CLI falla antes de staging y POST. Para una pieza de 4K/10 s, usar un valor explícito mayor después de revisar el precio completo.

## 5. Recetas de uso

La salida de cada ejemplo va a un prefijo privado en GCS. Sustituye el bucket y el prompt. Las entradas locales necesitan `--staging-uri`; la CLI las sube con `gcloud storage cp` y conserva la URI GCS resultante. Las entradas ya en GCS no se duplican.

```bash
# Estimar y validar, sin gasto
pnpm ai:omni --task text --prompt 'Una esfera roja sobre fondo neutro' \
  --duration 3 --resolution 360p --gcs-output gs://BUCKET/omni/smoke/ --estimate

# Texto a video. --out espera la terminación y descarga el MP4.
pnpm ai:omni --task text --prompt 'Una esfera roja se desplaza lentamente' \
  --duration 3 --resolution 360p --gcs-output gs://BUCKET/omni/smoke/ \
  --yes --out ai-generations/omni-smoke.mp4

# Imagen inicial
pnpm ai:omni --task image --image placa.png --staging-uri gs://BUCKET/omni/inputs/ \
  --prompt 'Anima suavemente la cámara' --gcs-output gs://BUCKET/omni/image/ --yes

# Primer y último cuadro
pnpm ai:omni --task frames --first-frame inicio.png --last-frame final.png \
  --staging-uri gs://BUCKET/omni/inputs/ --prompt 'Transición continua entre ambos cuadros' \
  --gcs-output gs://BUCKET/omni/frames/ --yes

# Referencias de imagen y video
pnpm ai:omni --task reference --image gs://BUCKET/ref/estilo.png \
  --video gs://BUCKET/ref/movimiento.mp4 --prompt 'Usa el estilo y el movimiento de las referencias' \
  --gcs-output gs://BUCKET/omni/reference/ --yes

# Editar un MP4, con imagen de referencia opcional
pnpm ai:omni --task edit --video gs://BUCKET/source/toma.mp4 \
  --image gs://BUCKET/ref/paleta.png --prompt 'Cambia la luz a atardecer; conserva el movimiento' \
  --gcs-output gs://BUCKET/omni/edit/ --yes

# Extender un MP4 existente
pnpm ai:omni --task extend --video gs://BUCKET/source/toma.mp4 \
  --prompt 'Continúa la acción de forma natural' \
  --gcs-output gs://BUCKET/omni/extend/ --yes

# Retomar sin crear otro trabajo
pnpm ai:omni --status INTERACTION_ID
pnpm ai:omni --wait INTERACTION_ID --out ai-generations/continuacion.mp4
```

## 6. Recuperación, QA y evidencia

El POST se hace **una sola vez**. La respuesta entrega `interaction id`, que se muestra enseguida y se escribe en un JSON local con permisos `0600` bajo `~/.cache/greenhouse/omni/` (o `--state-file`). El estado local guarda identidad, proyecto, tarea, ID, URI de salida y hora; nunca prompt, token o bytes de medios. Si el POST termina en timeout sin ID, el resultado es **indeterminado**: buscar la interacción en Cloud antes de crear otra. `--status` y `--wait` sólo hacen GET y no cobran una nueva generación. La salida se extrae de `steps[type=model_output].content[type=video]`; `--out` descarga el MP4 y comprueba la cabecera `ftyp`.

Para aceptar una ruta como verificada, probar **cada tarea** con material autorizado y un presupuesto acotado; registrar ID, salida retenida, MIME/códec, dimensiones, duración, audio, hash, latencia, errores, tokens y factura real. Edit debe comparar continuidad/preservación; extend debe comprobar duración acumulada, costura, audio y semántica; frames debe verificar correspondencia del primer y último cuadro. Validar también `16:9`/`9:16`, 360p/720p antes de invertir en 1080p/4K. Revisar C2PA en bytes antes de declarar Content Credentials. Los videos finales requieren revisión humana y derechos de inputs.

La API retiene interacciones almacenadas/asíncronas temporalmente; el GCS privado es la autoridad de recuperación de salida para esta CLI. Definir lifecycle del bucket y borrar staging cuando corresponda. No usar `previous_interaction_id` en Cloud como hecho probado: el esquema RPC lo expone, pero la guía de edición Cloud muestra video fuente y el notebook demuestra el flujo por historial; la continuación stateful necesita una prueba propia antes de añadirse.

## 7. Evidencia real del 2026-09-24

Se renovaron y verificaron CLI + ADC para `efeonce-group`; `aiplatform.googleapis.com` está habilitada y la cuota efectiva del modelo exacto fue **10 solicitudes/minuto**. Se ejecutaron las seis intenciones por `pnpm ai:omni` con material sintético o generado dentro de esta prueba, salida 360p/3 s y GCS privado de desarrollo. Cada interacción terminó `completed`, entregó un MP4 descargable y declaró `gemini-omni-1.1-flash-preview`. Todos los MP4 tenían video H.264 640×360 a 24 fps y audio AAC; cinco duraban 3,029 s y `extend` entregó 6,037 s (clip original + continuación). Los seis outputs quedaron retenidos bajo `gs://efeonce-group-greenhouse-private-assets-dev/ai-tooling/omni-1-1-smoke-2026-09-24/`.

La inspección visual de un fotograma medio confirmó una esfera azul en el video fuente y naranja en el resultado de `edit`; un fotograma tardío de `extend` conservó la esfera azul y el fondo neutro. Esto comprueba que los endpoints devolvieron transformaciones visibles; no certifica todavía continuidad fina, mezcla de audio ni calidad final de campaña.

| CLI | Interaction ID | SHA-256 del MP4 local |
| --- | --- | --- |
| `text` | `ChA2ZjdkODNhY2VjMTkzMWJjEAgaATAqBG1haW4` | `4b045891cdf475df088b5fbda18a49558510fccca3d966bf7457e14d139a441d` |
| `image` | `ChA4MThlODdkNTMyNzFjNzQxEAgaATAqBG1haW4` | `e1254ccaf3b10a7a2d368a15d80121ecb0ea530b18886b8e5183adf3716923a5` |
| `frames` | `ChAwMjY3ODMyY2E2ZDVkZWNjEAgaATAqBG1haW4` | `2f31a371e0aef7a65cf76653f54ae3ba200835b4af9aa0c61376faaebdb4a52b` |
| `reference` | `ChAxMzA4NjhkOTAyOWJiMjc5EAgaATAqBG1haW4` | `29055c419cf178962334586ac5e8c15b61cc48cbb0d8059405d2072af73238a5` |
| `edit` (video + imagen) | `ChBmOWQzZTUyOTNmZGJiMzk3EAgaATAqBG1haW4` | `6dc75192100e4f902f037da449d2ce4a3d94f81ae02dda1ad1c353c92bcfb6f0` |
| `extend` | `ChA1NTYwM2NhYTg0MWM1NzBmEAgaATAqBG1haW4` | `af1a314356741427c8257a6f60fb57b1323d5ae12ee7f7ca350fbca69489ec75` |

El primer intento de `edit`/`extend` con un `response_format` genérico recibió HTTP 400. Se corrigió el cuerpo por tarea y se repitió con éxito. Dos probes diagnósticos mínimos también completaron y generaron outputs adicionales bajo `edit-minimal/` y `extend-resolution/`; el probe de extensión con `duration` pero sin `resolution` aceptó y completó, aunque su output no se usó para la matriz de aceptación. El componente nominal de video de las seis corridas CLI es aproximadamente USD 0,608 antes de input/texto/impuestos; no es una lectura de factura.

**Pendientes fuera del cableado CLI:** revisión temporal completa de fidelidad/continuidad y escucha de audio, inspección C2PA, factura real, lifecycle del bucket y prueba de 720p/1080p/4K, 9:16, límite de referencias y turnos stateful. La generación técnica no aprueba un asset comercial ni activa Globe.
