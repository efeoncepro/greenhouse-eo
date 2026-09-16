# Operar el CLI de fal: Seedream 5, Seedance 2.5/2.0, Minimax H3, Flux 3 y Wan 3.0

> **Tipo de documento:** Manual de uso
> **Version:** 1.3
> **Creado:** 2026-09-16 por agente
> **Ultima actualizacion:** 2026-09-16 por Claude — Wan 3.0 y Wan 3.0 Prime (texto, imagen y referencias a video; `--duration auto`, `--thinking` con `--web-url`/`--file`, `--no-prompt-expansion`, `--seed`), advertencia de saldo agotado en fal y 403 `Exhausted balance`; antes, Flux 3 (draft → enhance, primer/ultimo cuadro, keyframes, edit y extend) y video a video con Seedance 2.5 (`--task editing|extension`, sin verificar); antes, Minimax H3 (video, camera-controls, LoRA y entrenamiento), retome por `--request-id` y cierre de la brecha de `--task`
> **Modulo:** AI Tooling / Asset Generation
> **Comando:** `pnpm ai:fal`
> **Documentacion tecnica:** [GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md](../../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) §Carril operativo
> **Documentacion funcional:** [Generador Visual de Assets con IA](../../documentation/ai-tooling/generador-visual-assets.md)

## Para que sirve

Para generar desde la terminal, a traves de fal.ai:

- **imagenes** con Seedream 5 (Pro o Lite), desde texto o editando con referencias;
- **capas editables** a partir de una imagen plana (Seedream 5 Pro layerize);
- **video** con Seedance 2.5 o 2.0, desde texto, desde una imagen o desde referencias;
- **video rapido y barato** con Minimax H3 (base, Max y Max Turbo), incluido **control de camara** sobre una
  imagen, video con **LoRAs** y **entrenamiento de LoRAs** propias;
- **video con Flux 3**: borrador barato que se mejora a version final, video desde texto, imagen, primer y ultimo
  cuadro o keyframes, y **video a video** (editar un clip o extenderlo);
- **video a video con Seedance 2.5** (editar o extender un clip desde referencias), todavia sin verificar;
- **video con Wan 3.0 y Wan 3.0 Prime**: desde texto, desde una imagen (con ultimo cuadro opcional) o desde
  referencias, de 2 a 30 s o con largo elegido por el modelo, y desde referencias puede **basarse en una pagina web
  o un documento**. Sólo `wan3-t2v` esta verificado; el resto espera a que se recargue el saldo de fal.

Es un comando **hermano** de `pnpm ai:image`, no su reemplazo: para GPT Image se sigue usando `ai:image`. Todo lo
que produce es trabajo fuera del portal; nada se genera en tiempo real para usuarios.

## Antes de empezar

- Trabaja en la raiz del repo. El comando lee `.env.local` y resuelve la llave de fal desde Secret Manager
  (`FAL_API_KEY_SECRET_REF`); nunca pegues la llave en la terminal ni en un archivo.
- 🔴 **Al 2026-09-16 el saldo de fal esta agotado:** toda corrida falla con HTTP 403 `Exhausted balance` antes de
  encolar (no cobra). Hasta que una persona con acceso a la facturacion de fal recargue saldo, sólo funciona
  `--list`. Ver "Problemas comunes".
- 🔴 **Toda corrida cuesta dinero real, salvo `--list`.** El comando **no informa el costo** de cada corrida
  porque fal no devuelve ese dato. Antes de un lote o de un video largo, revisa el precio vigente en la pagina del
  modelo en `fal.ai/models` y anota la fecha en que lo consultaste.
- Decide donde va la salida. Sin `--out` ni `--out-dir`, los archivos caen en `public/images/generated/`. Para
  exploracion usa una carpeta bajo `ai-generations/` (por ejemplo `ai-generations/2026-09-16_mi-pieza/`).
- Revisa el estado de lo que vas a usar (gratis):

```bash
pnpm ai:fal --list
```

## Paso a paso

### 1. Elige la capacidad

`--list` agrupa las capacidades en IMAGE, VIDEO y TRAINING, y muestra cada `id`, su slug y si esta
`verificada <fecha>`, `SIN VERIFICAR` o `[NO OPERABLE POR COLA]`.

| Quieres | `--capability` | Pide |
|---|---|---|
| Imagen desde texto, mejor acabado | `seedream5-pro` | `--prompt` |
| Imagen desde texto, explorar rapido | `seedream5-lite` | `--prompt` |
| Editar con referencias | `seedream5-pro-edit` (hasta 10) o `seedream5-lite-edit` | `--prompt` + uno o mas `--image` |
| Separar una imagen en capas | `seedream5-pro-layerize` | exactamente un `--image`; prompt opcional |
| Video desde texto | `seedance25-t2v`, `seedance20-t2v` (y variantes fast/mini/us) | `--prompt` |
| Video desde una imagen | `seedance25-i2v`, `seedance20-i2v` (y variantes) | `--prompt` + un `--image` |
| Video desde referencias | `seedance25-r2v`, `seedance20-r2v` (y variantes) | `--prompt` + uno o mas `--image` |
| Video H3 desde texto | `h3turbo-t2v` (el mas barato), `h3max-t2v`, `h3-t2v` | `--prompt` |
| Video H3 desde una imagen | `h3turbo-i2v`, `h3max-i2v`, `h3-i2v` | `--prompt` + un `--image`; `--end-image` opcional |
| Video H3 desde referencias | `h3max-r2v`, `h3-r2v` | `--prompt` + al menos una referencia (`--image`, `--video` o `--audio`) |
| Mover la camara sobre una imagen | `h3max-camera` | un `--image` + `--camera-trajectory`; prompt opcional |
| Video H3 con LoRA | `h3-t2v-lora`, `h3-i2v-lora`, `h3-r2v-lora` | lo mismo que su version sin LoRA + al menos un `--lora` |
| Entrenar una LoRA de H3 | `h3-train-t2v`, `h3-train-i2v`, `h3-train-flf2v`, `h3-train-ref2va` | `--training-data` |
| Video Flux 3 desde texto | `flux3-t2v` o su borrador `flux3-t2v-draft` | `--prompt` |
| Video Flux 3 desde una imagen | `flux3-i2v` o `flux3-i2v-draft` | `--prompt` + un `--image` |
| Video Flux 3 entre dos cuadros | `flux3-flf` o `flux3-flf-draft` | `--prompt` + `--image` (primer cuadro) + `--end-image` (ultimo), ambos obligatorios |
| Video Flux 3 por keyframes | `flux3-keyframes` o `flux3-keyframes-draft` | `--prompt` + de 1 a 10 `--keyframe <imagen>@<frame_index>` |
| Mejorar un borrador de Flux 3 | `flux3-enhance` | `--draft-cache <url>` (lo imprime el borrador) |
| Editar un video existente | `flux3-edit` (verificado) o `seedance25-r2v --task editing` (sin verificar) | `--prompt` + `--video` |
| Extender un video existente | `flux3-extend` / `flux3-extend-draft` (verificados) o `seedance25-r2v --task extension` (sin verificar) | `--prompt` + `--video` (en Flux 3, con pista de audio) |
| Video Wan 3.0 desde texto | `wan3-t2v` (verificado) o `wan3prime-t2v` | `--prompt` |
| Video Wan 3.0 desde una imagen | `wan3-i2v` o `wan3prime-i2v` (sin verificar) | un `--image` (primer cuadro); `--end-image` y `--prompt` opcionales |
| Video Wan 3.0 desde referencias | `wan3-r2v` o `wan3prime-r2v` (sin verificar) | al menos una referencia (`--image`, `--video` o `--audio`) **o** `--web-url` / `--file` con `--thinking`; prompt opcional |

Para video, elige la familia por sus limites:

| Familia | Duracion | Resoluciones | `--bitrate` |
|---|---|---|---|
| Seedance 2.5 | 4 a 30 s o `auto` | 480p, 720p, 1080p | si |
| Seedance 2.0 base | 4 a 15 s o `auto` | 480p, 720p, 1080p, 4k | si |
| Seedance 2.0 fast / us | 4 a 15 s o `auto` | 480p, 720p | si |
| Seedance 2.0 mini | 4 a 15 s o `auto` | 480p, 720p | no |

Aspectos en todas las Seedance: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`. La duracion minima de
Seedance es **4 s**: `--duration 3` falla en local.

Minimax H3 tiene otros limites y otra forma de escribirlos:

| Familia H3 | Duracion | Resoluciones (en mayusculas) | Precio fal 2026-09-16 |
|---|---|---|---|
| H3 base (`h3-*`) | 5 a 15 s, entero, sin `auto` | `480P`, `768P`, `2K`, `4K` (default `2K`) | USD 0,05 / s (con LoRA 0,0625 / s) |
| H3 Max (`h3max-*`) | 5 a 15 s | `480P`, `768P`, `1080P` (default `768P`; camera-controls `480P`) | USD 0,025 / s |
| H3 Max Turbo (`h3turbo-*`) | 5 a 15 s | `480P`, `768P`, `1080P` (default `768P`) | USD 0,0125 / s |

- Aspectos H3 en texto a video: `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (default `16:9`); en referencias se
  agrega `adaptive` (default). **Image-to-video no acepta `--aspect`**: el encuadre sale de la imagen.
- El comando acepta la resolucion sin distinguir mayusculas (`768p` sirve) y envia el valor correcto.
- H3 **no** acepta `--bitrate` ni `--no-audio`, y el video **sale con sonido** (ambiente o musica).
- `--prompt-expansion`: en H3 base es opcional (`disabled|fast|balanced|quality`); en Max y Turbo es obligatorio
  y sólo acepta `disabled|balanced|quality`. Si no lo pasas en Max o Turbo, el comando envia `balanced`.
- Precios consultados el 2026-09-16; confirmalos antes de un lote.

Flux 3 (video, no imagen) tiene su propio contrato:

| Flux 3 | Duracion | `--resolution` | `--aspect` | Precio fal 2026-09-16 |
|---|---|---|---|---|
| `flux3-t2v`, `flux3-i2v` | `auto` o 5 a 20 s | `720p` o `1080p` (default `720p`) | si | USD 0,085 / s |
| `flux3-flf`, `flux3-keyframes` | 5 a 20 s, **sin** `auto` (default 5) | `720p` o `1080p` | si | USD 0,085 / s |
| `flux3-extend` | `auto` o 5 a 20 s (segundos **nuevos**) | `720p` o `1080p` | si | USD 0,205 / s |
| Borradores `*-draft` | como su version final | **no** | si | USD 0,03 / s (extend: 0,06 / s) |
| `flux3-edit` | **no** (hereda del origen) | **no** | **no** | USD 0,03 / s |
| `flux3-enhance` | **no** (hereda del borrador) | **no** | **no** | USD 0,085 / s |

- Aspectos Flux 3: `auto`, `21:9`, `2:1`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` (default `auto`).
- Sale con sonido por defecto; `--no-audio` lo apaga. No acepta `--bitrate`.
- `--safety-tolerance` de 0 a 4 (default 2).
- Los 12 endpoints estan verificados con corridas reales (2026-09-16). Son **mas lentos que H3**: entre 40 s y
  4 min por video.

Wan 3.0 y Wan 3.0 Prime comparten contrato y precio (OpenAPI y pricing de fal, 2026-09-16):

| Wan 3.0 | Duracion | `--resolution` | `--aspect` | Precio fal 2026-09-16 |
|---|---|---|---|---|
| `wan3-*`, `wan3prime-*` | 2 a 30 s (entero) o `auto` (default 5) | `480p`, `720p`, `1080p` (**default `1080p`**) | `adaptive` (default), `16:9`, `4:3`, `1:1`, `3:4`, `9:16` | USD 0,05 / s |

- ⚠️ **Si no pasas `--resolution`, sale en 1080p**, que es la opcion mas lenta. Para explorar, pide `480p` o `720p`.
- `--duration auto` deja que el modelo elija el largo segun el prompt y las referencias (en la corrida verificada
  eligio 5,04 s).
- Sale con sonido por defecto; `--no-audio` lo apaga. No acepta `--bitrate` ni `--prompt-expansion <modo>`.
- `--no-prompt-expansion` hace que use tu prompt tal cual (segun el proveedor ahorra 20 a 60 s, pero puede bajar la
  calidad). `--thinking` activa el razonamiento previo. `--seed <n>` (entero >= 0) fija la semilla.
- Referencias (`r2v`): hasta 10 `--image`, 5 `--video` (sumados hasta 15 s, al menos 16 fps) y 5 `--audio` (hasta
  15 s). Se citan en el prompt por posicion: «the subject in Image 1 walks past Video 1».
- Estado: `wan3-t2v` verificado el 2026-09-16; los otros 5 **sin verificar** porque el saldo de fal se agoto.

### 2. Corre el comando

Imagen desde texto:

```bash
pnpm ai:fal --capability seedream5-pro --prompt "<descripcion>" --out ai-generations/2026-09-16_mi-pieza/kv.png
```

Edicion con referencias (los archivos locales se suben solos al storage de fal):

```bash
pnpm ai:fal --capability seedream5-pro-edit --image base.png --image referencia.png \
  --prompt "<que cambia; conserva el resto>" --out ai-generations/2026-09-16_mi-pieza/kv-v2.png
```

Separacion por capas:

```bash
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ai-generations/2026-09-16_mi-pieza/capas
```

Video desde una imagen:

```bash
pnpm ai:fal --capability seedance25-i2v --image plate.png --prompt "<movimiento de camara y accion>" \
  --duration 5 --resolution 720p --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/clip.mp4
```

Opciones de video adicionales: `--end-image <path|url>` (ultimo cuadro, en image-to-video), `--no-audio`,
`--bitrate standard|high`, `--audio <path|url>` y `--video <path|url>` (repetibles, en reference-to-video) y
`--task reference|editing|extension` (sólo en `seedance25-r2v`; en cualquier otra capacidad el comando lo rechaza
antes de encolar).

#### Minimax H3

Video barato para explorar (Turbo, 480P, 5 s):

```bash
pnpm ai:fal --capability h3turbo-t2v --prompt "<escena y accion>" \
  --duration 5 --resolution 480P --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/h3-turbo.mp4
```

Desde una imagen, indicando tambien el ultimo cuadro (sin `--aspect`):

```bash
pnpm ai:fal --capability h3max-i2v --image inicio.png --end-image final.png \
  --prompt "<transicion entre ambos cuadros>" --duration 6 --resolution 768P \
  --out ai-generations/2026-09-16_mi-pieza/h3-i2v.mp4
```

Desde referencias (hasta 9 imagenes, 3 videos y 3 audios):

```bash
pnpm ai:fal --capability h3max-r2v --image personaje.png --image producto.png \
  --prompt "<como aparecen juntos>" --aspect adaptive --out ai-generations/2026-09-16_mi-pieza/h3-r2v.mp4
```

Control de camara sobre una escena quieta (hasta 12 puntos; `elevation` de -90 a 90, `time` de 0 a 1):

```bash
pnpm ai:fal --capability h3max-camera --image escena.png \
  --camera-trajectory '[{"distance":1,"elevation":10,"azimuth":0,"time":0},{"distance":1,"elevation":10,"azimuth":60,"time":1}]' \
  --out ai-generations/2026-09-16_mi-pieza/h3-camara.mp4
```

Sin `--prompt`, la escena queda congelada y sólo se mueve la camara.

Con LoRA (hasta 3; `path` es una URL o un repo de Hugging Face, y la escala va de 0 a 4):

```bash
pnpm ai:fal --capability h3-t2v-lora --prompt "<escena>" \
  --lora https://<url-de-la-lora>@1 --out ai-generations/2026-09-16_mi-pieza/h3-lora.mp4
```

Entrenamiento de una LoRA (se cobra por paso: `h3-train-t2v` con 2000 pasos ronda USD 10; `h3-train-ref2va`,
USD 30):

```bash
pnpm ai:fal --capability h3-train-t2v --training-data dataset.zip --steps 1500 --rank 32 \
  --trigger "estilo efeonce" --out-dir ai-generations/2026-09-16_mi-lora
```

- `--steps` de 1 a 15000 (default 2000), `--rank` `8|16|32|64|128` (default 32), `--learning-rate` de 1e-6 a 1
  (default 2e-4). El resto de los ajustes (cuadros, frame rate, resolucion, condicionamiento) va por `--input`.
- Al terminar descarga `lora.*`, `config.*` y, si lo pediste, `debug-dataset.*`.
- `h3max-director` **no se puede usar** con este comando: es video en vivo guiado en tiempo real, no un trabajo
  de cola. El comando lo explica y se detiene.

#### Flux 3

Borrador barato y despues version final. El borrador imprime su `draft_cache` y el comando listo para mejorarlo:

```bash
pnpm ai:fal --capability flux3-t2v-draft --prompt "<escena y accion>" --duration 5 --aspect 16:9 \
  --out ai-generations/2026-09-16_mi-pieza/flux3-draft.mp4
# el CLI imprime:
#   draft_cache: <url>
#   mejóralo con: pnpm ai:fal --capability flux3-enhance --draft-cache "<url>" --out <ruta>
pnpm ai:fal --capability flux3-enhance --draft-cache "<url>" --out ai-generations/2026-09-16_mi-pieza/flux3-final.mp4
```

Copia el comando que imprime el CLI tal cual: `flux3-enhance` no acepta `--prompt`, `--duration`, `--resolution`
ni `--aspect`; todo sale del borrador. En la prueba, el borrador salio 1280×704 y la mejora 1920×1088.

Desde una imagen:

```bash
pnpm ai:fal --capability flux3-i2v --image plate.png --prompt "<movimiento>" \
  --duration 5 --resolution 1080p --out ai-generations/2026-09-16_mi-pieza/flux3-i2v.mp4
```

Entre un primer y un ultimo cuadro (los dos son obligatorios; duracion sin `auto`):

```bash
pnpm ai:fal --capability flux3-flf --image inicio.png --end-image final.png \
  --prompt "<transicion>" --duration 5 --out ai-generations/2026-09-16_mi-pieza/flux3-flf.mp4
```

Por keyframes (de 1 a 10; `@` separa la imagen del numero de cuadro, entero desde 0; se probo con `@0` y `@96` en
un clip de 5 s a 24 fps):

```bash
pnpm ai:fal --capability flux3-keyframes --keyframe inicio.png@0 --keyframe clave.png@96 \
  --prompt "<que pasa entre cuadros>" --duration 5 --out ai-generations/2026-09-16_mi-pieza/flux3-kf.mp4
```

Editar un video existente (conserva movimiento, ritmo y encuadre; sin `--duration`, `--resolution` ni `--aspect`):

```bash
pnpm ai:fal --capability flux3-edit --video clip.mp4 --prompt "<que cambia: estilo, luz, material>" \
  --out ai-generations/2026-09-16_mi-pieza/flux3-edit.mp4
```

Extender un video (el origen **debe traer pista de audio**; la salida es **solo la continuacion**):

```bash
pnpm ai:fal --capability flux3-extend --video clip.mp4 --prompt "<como sigue la accion>" \
  --duration 5 --out ai-generations/2026-09-16_mi-pieza/flux3-continuacion.mp4
```

- `--duration` son los segundos **nuevos** (5 → 5 s nuevos; `auto` entrego 15 s).
- Para tener el clip completo, une origen y continuacion en tu editor o con `ffmpeg`.
- El origen va por `--video` (MP4, menos de 50 MB y menos de 15 s segun el proveedor); edit y extend no aceptan
  `--image`.
- `--safety-tolerance 0-4` aplica a todos los Flux 3 si necesitas ajustar el filtro del proveedor.

#### Video a video con Seedance 2.5 (sin verificar)

Fal no tiene un endpoint "video a video" de Seedance: se hace con `seedance25-r2v` y `--task`. ⚠️ Estas corridas
**no estan verificadas en real**; el comando advierte antes de gastar. Contrato leido del OpenAPI del proveedor:

Editar un clip (el proveedor fuerza duracion y aspecto a `auto`, asi que no pases `--duration` ni `--aspect`):

```bash
pnpm ai:fal --capability seedance25-r2v --task editing --video clip.mp4 \
  --prompt "Cambia @Video1 a <nuevo estilo>, conserva la accion" --out ai-generations/2026-09-16_mi-pieza/sd-edit.mp4
```

Extender un clip (sin `--aspect`; duracion de 4 a 30 s o `auto`):

```bash
pnpm ai:fal --capability seedance25-r2v --task extension --video clip.mp4 \
  --prompt "Continua @Video1: <que pasa despues>" --duration 8 --out ai-generations/2026-09-16_mi-pieza/sd-extension.mp4
```

- `--task reference` (o no pasarlo) usa el video solo como guia. En **Seedance 2.0** (`seedance20-r2v` y sus
  variantes) no existe `--task`: el video solo guia, no edita ni extiende.
- Las referencias se citan en el prompt como `@Image1`, `@Video1`, `@Audio1`.
- Siempre hace falta al menos un `--image` o un `--video`; el audio solo no alcanza.
- Topes 2.5: hasta 30 imagenes, 10 videos (cada uno de 1,8 a 30,2 s, hasta 200 MB, de 300 a 6000 px por lado, de 24
  a 60 fps; sumados hasta 30,2 s) y 10 audios (cada uno de 1,8 a 30,2 s, hasta 15 MB; sumados hasta 30,2 s), 50
  archivos en total.
- Topes 2.0: hasta 9 imagenes, 3 videos (sumados de 2 a 15 s, menos de 50 MB, entre ~480p y ~720p) y 3 audios
  (sumados hasta 15 s), 12 archivos en total.
- Si una corrida funciona, anota la fecha en `src/lib/ai/fal-capabilities.ts`; si no, guarda el error con `--json`.

#### Wan 3.0

Desde texto, dejando que el modelo elija el largo, en 480p para explorar (camino verificado):

```bash
pnpm ai:fal --capability wan3-t2v --prompt "<escena y accion>" --duration auto --resolution 480p \
  --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/wan3-t2v.mp4
```

Desde una imagen, con ultimo cuadro opcional (el prompt tambien es opcional):

```bash
pnpm ai:fal --capability wan3-i2v --image inicio.png --end-image final.png \
  --prompt "<transicion>" --duration 6 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-i2v.mp4
```

Desde referencias (hasta 10 imagenes, 5 videos y 5 audios, citados por posicion):

```bash
pnpm ai:fal --capability wan3-r2v --image personaje.png --image producto.png --video movimiento.mp4 \
  --prompt "the subject in Image 1 holds the product in Image 2 and moves like Video 1" \
  --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-r2v.mp4
```

Basado en una pagina web publica (exige `--thinking`; no hace falta ninguna referencia de medios):

```bash
pnpm ai:fal --capability wan3-r2v --thinking --web-url https://<pagina-publica> \
  --prompt "<que pieza quieres a partir de esa pagina>" --duration auto --resolution 720p \
  --out ai-generations/2026-09-16_mi-pieza/wan3-web.mp4
```

Basado en un documento (local o URL; el comando sube el archivo local; tambien exige `--thinking`):

```bash
pnpm ai:fal --capability wan3-r2v --thinking --file brief.pdf \
  --prompt "<que pieza quieres a partir del documento>" --resolution 720p \
  --out ai-generations/2026-09-16_mi-pieza/wan3-doc.mp4
```

Prompt exacto, semilla fija y sin sonido:

```bash
pnpm ai:fal --capability wan3-t2v --prompt "<texto exacto>" --no-prompt-expansion --seed 7 --no-audio \
  --duration 5 --resolution 480p --out ai-generations/2026-09-16_mi-pieza/wan3-exacto.mp4
```

- Para Wan 3.0 Prime, cambia `wan3-` por `wan3prime-`: mismas opciones y mismo precio.
- `--web-url` y `--file` **sólo** funcionan en `wan3-r2v` y `wan3prime-r2v`, y siempre con `--thinking`.
- La via web/documento, i2v, r2v y toda la linea Prime **no tienen corrida real**; el comando advierte antes de
  gastar. Si una funciona, anota la fecha en `src/lib/ai/fal-capabilities.ts`.

Opciones generales: `--prompt-file <path>` para prompts largos, `--size` (enum del proveedor o `WxH`), `--count`,
`--format jpeg|png`, `--timeout <ms>`, `--json` para ver la respuesta cruda y `--request-id <id>` para retomar un
trabajo ya encolado.

Un modelo de fal que no esta en el registro se puede correr por su slug, con los campos extra en JSON:

```bash
pnpm ai:fal --model <slug/de/fal> --prompt "<texto>" --input '{"campo":"valor"}'
```

### 3. Espera (y retoma si hace falta)

El comando imprime `→ <slug> · hasta Ns de espera` y, apenas fal acepta el trabajo,
`⋯ encolado · request_id <id>`. **Anota ese `request_id`.** Limites por defecto: imagen 3 min (las corridas
verificadas tardaron entre 44 y 116 s), video 15 min (Seedance tardo 147 a 194 s; H3, entre 3 y 8 s; Flux 3, de 40 s a 4 min) y
entrenamiento 3 h. Si necesitas mas, usa `--timeout`.

Si el tiempo de espera se acaba (`HTTP 408`), **el trabajo sigue corriendo y cobrando en fal**. El comando imprime
el comando para retomarlo:

```bash
pnpm ai:fal --capability <id> --request-id <request_id> --out <ruta>
```

Retomar **no reenvia el pedido ni vuelve a cobrar**: sólo espera el mismo trabajo y descarga el resultado (se
verifico que el archivo sale identico). Funciona para todas las capacidades, no sólo H3: el camino es el mismo.
Ojo: esa prueba se hizo con un video de H3 Max Turbo; con Seedream y Seedance todavia no se ha retomado un
trabajo real.

### 4. Revisa lo que entrego

- Imagen o video: `✓ <KB> · <ruta>` por archivo y al final `done · <ms> · N asset(s) · request_id <id>`.
- Borrador de Flux 3: ademas del video, `draft_cache: <url>` y la linea `mejóralo con: …`. Copiala para mejorarlo.
- Extension de Flux 3: el archivo es **solo el tramo nuevo**; arranca en el ultimo cuadro del origen.
- Wan 3.0: la respuesta trae `actual_prompt` (el prompt que el modelo reescribio), `duration` y `seed`; el comando
  muestra un extracto del prompt reescrito. Con `--no-prompt-expansion`, `actual_prompt` viene vacio (`null`).
- H3: el comando muestra un extracto de `prompt expandido` (lo que el modelo entendio, incluido el sonido que
  agrego); `--json` lo trae entero.
- Entrenamiento: `lora.*` y `config.*` en la carpeta de salida. Guardalos juntos.
- Capas: un PNG por capa con nombre `NN-<nombre>.png` (`NN` es el orden de apilado segun `z_index`; la imagen base viene primero) y
  `layers.json` con nombre, descripcion, `z_index` y `bounding_box` de cada una. **Guarda `layers.json` junto a los
  PNG**: es lo unico que dice donde va cada capa.
- Mira el resultado. En capas, confirma que la transparencia sea real (tambien en huecos internos). En video,
  revisa primer, medio y ultimo cuadro, y confirma resolucion y duracion (por ejemplo con `ffprobe`).

## Que significan las senales

| Senal | Que significa |
|---|---|
| `verificada 2026-09-16` en `--list` | La capacidad ya se corrio contra el API real y funciono. |
| `SIN VERIFICAR` en `--list` | Esta conectada pero nunca se probo. Puede fallar o devolver otra forma. |
| `⚠ "<id>" está declarada pero NO verificada…` | Aviso antes de gastar en una capacidad sin probar. Si funciona, hay que anotar la fecha en `src/lib/ai/fal-capabilities.ts`. |
| `↑ subiendo <archivo> …` | Un archivo local se esta subiendo al storage de fal para que el modelo lo lea por URL. |
| `--duration Ns excede el máximo…` / `--resolution … no está…` / `--aspect … no está…` | El pedido no cabe en ese endpoint. Se detuvo **antes de cobrar** y el mensaje dice que valores acepta. |
| `"<id>" no acepta --bitrate…` | Usaste `--bitrate` en una variante mini. |
| `"<id>" no acepta --task; sólo Seedance 2.5 reference-to-video lo expone.` | Usaste `--task` fuera de `seedance25-r2v`. Se detuvo antes de cobrar. |
| `"<id>" no acepta --aspect: el encuadre sale de la imagen de entrada.` | Usaste `--aspect` en un image-to-video de H3. Quitalo. |
| `--prompt-expansion "<modo>" no está en "<id>"…` | Pediste un modo que esa familia no tiene (por ejemplo `fast` en Max o Turbo). |
| `"<id>" exige al menos un --lora …` / `no acepta --lora; usa su variante /lora.` | LoRA faltante en una variante `-lora`, o LoRA pasada a una variante sin LoRA. |
| `--camera-trajectory …` | La trayectoria no es JSON valido, trae mas de 12 puntos o algun valor esta fuera de rango. |
| `… sólo aplica a entrenamiento de LoRA.` | Usaste `--steps`, `--rank`, `--learning-rate`, `--trigger` o `--training-data` fuera de un entrenador. |
| `"<id>" no acepta --resolution: los drafts salen a resolución fija; …` | Pasaste `--resolution` a un borrador de Flux 3. La resolucion final sale de `flux3-enhance`. |
| `"<id>" no acepta --duration: hereda la del video de origen.` | `flux3-edit` o `flux3-enhance` no reciben duracion. Quitala. |
| `"<id>" no acepta --duration auto; usa 5–20.` | `flux3-flf` y `flux3-keyframes` piden un entero. |
| `"<id>" exige --end-image: el último cuadro es obligatorio.` | Falta el ultimo cuadro en `flux3-flf`. |
| `"<id>" recibe las imágenes como --keyframe <imagen>@<frame_index>, no como --image.` | Usaste `--image` en `flux3-keyframes`. |
| `--keyframe "…" debe tener la forma <imagen>@<frame_index>…` | Falta el `@` o el indice no es un entero >= 0. |
| `"<id>" parte de un video: pásalo con --video, no con --image.` | `flux3-edit` y `flux3-extend` reciben el clip por `--video`. |
| `"<id>" exige que el video de origen traiga pista de audio…` | Extension de Flux 3 con un origen local sin sonido. Se detuvo antes de subir. |
| `⚠ no se pudo verificar la pista de audio del origen…` | El origen es una URL o no tienes `ffprobe`. Si no trae audio, fal lo rechazara despues de encolar. |
| `"<id>" exige --draft-cache <url>…` / `no acepta --draft-cache…` | `flux3-enhance` necesita el `draft_cache` de un borrador; ninguna otra capacidad lo usa. |
| `--task <tarea> necesita el video de origen por --video.` | `editing` y `extension` en `seedance25-r2v` requieren `--video`. |
| `--task editing ignora --duration y --aspect…` / `--task extension ignora --aspect…` | El proveedor los fuerza a `auto`; quitalos. |
| `"<id>" necesita al menos una imagen o un video de referencia; el audio solo no alcanza.` | Reference-to-video de Seedance con solo `--audio`. |
| `--web-url exige --thinking …` / `--file exige --thinking …` | En Wan 3.0 referencias a video, la fuente web o documento necesita el razonamiento previo. Agrega `--thinking`. |
| `"<id>" no acepta --web-url; sólo Wan 3.0 referencias a video se basa en una web o un documento.` | Usaste `--web-url` o `--file` fuera de `wan3-r2v` / `wan3prime-r2v`. |
| `--web-url debe ser una URL pública http(s).` | La direccion no es `http(s)://`. |
| `"<id>" no acepta --no-prompt-expansion; usa --prompt-expansion disabled.` | Usaste el flag de Wan en H3, que tiene modos. |
| `--seed debe ser un entero >= 0.` | La semilla no es un entero positivo o cero. |
| `"<id>" no se puede operar desde este CLI: …` | Capacidad marcada `[NO OPERABLE POR COLA]` (hoy, `h3max-director`). |
| `⋯ encolado · request_id <id>` | fal acepto el trabajo; desde aqui cuenta como gasto. Anota el id. |
| `⚠ --request-id no podrá retomar este trabajo: …` | La direccion de cola de ese modelo no sigue la regla habitual; si vence el tiempo, no se podra retomar con el comando. |
| `↻ retomando <slug> · request <id>` | Estas retomando un trabajo existente; no se cobra de nuevo. |
| `requiere --prompt` / `requiere al menos un --image` / `no recibe imágenes de entrada` | Faltan o sobran entradas para esa capacidad. |
| `FATAL: <slug> falló (HTTP …)` | El proveedor rechazo el trabajo; el detalle viene despues de los dos puntos. |
| `HTTP 408` en el FATAL | Se acabo el tiempo de espera. El trabajo **sigue en fal y se cobra**; el comando imprime como retomarlo. |
| `⚠ el output no trajo "<clave>"` | La respuesta tiene otra forma que la esperada. Repite con `--json` para verla. |
| `✓ sin assets descargables` | El modelo respondio pero no habia archivos que bajar. |

## Que no hacer

- **No corras una capacidad para "ver si existe".** Cualquier corrida sin `--list` gasta. Para confirmar un slug
  sin generar, usa el metodo barato del catalogo tecnico (POST vacio: 404 no existe, 422 existe).
- **No armes slugs a mano sumando proveedor y version.** El prefijo `fal-ai/` depende del endpoint: Seedream 5 y
  Seedance 2.0/2.5 van sin prefijo, Seedream 4/4.5 y Seedance 1/1.5 con prefijo. Con el prefijo equivocado el
  pedido parece aceptado y despues da 404, sin avisar.
- **No relances un video que vencio por tiempo.** Retomalo con `--request-id`: relanzarlo paga dos veces.
- **No extiendas con Flux 3 un clip generado con `--no-audio`.** Fal lo acepta en cola y despues lo rechaza.
- **No esperes el clip completo de `flux3-extend`.** Entrega solo la continuacion; la union se hace en edicion.
- **No uses Seedance 2.0 para editar o extender.** Su video de referencia solo guia; eso es de Seedance 2.5.
- **No uses `h3max-director`.** No funciona por cola; no hay forma de operarlo con este comando.
- **No marques una capacidad como verificada** en el registro sin haberla corrido de verdad.
- **No uses este comando para Gemini Omni ni para Nano Banana Pro.** Los dos se conectan directo con Google, no por
  fal, aunque fal los liste (decision del operador, 2026-09-16).
- **No dejes Wan 3.0 en su resolucion por defecto para explorar.** Sin `--resolution` sale en 1080p.
- **No lo conectes al portal.** Es produccion fuera de linea; el runtime de imagen del producto es otro.
- **No guardes las URLs temporales de fal** en manifests ni documentos; guarda los archivos descargados.
- No dejes exploraciones en `public/images/generated/` ni en `.captures/`.

## Problemas comunes

- **`fal.ai no está configurado. Define FAL_API_KEY o FAL_API_KEY_SECRET_REF.`** Falta la referencia en
  `.env.local` o la sesion de Google Cloud vencio. Reautentica `gcloud` y vuelve a intentar.
- **HTTP 403 `User is locked. Reason: Exhausted balance`.** La cuenta de fal se quedo sin saldo (pasa desde el
  2026-09-16). Falla antes de encolar, asi que no cobra. No es un error del comando ni del slug: no reintentes ni
  cambies de capacidad. Lo resuelve una persona con acceso a la facturacion de fal recargando saldo en
  `fal.ai/dashboard/billing`; un agente no recarga saldo ni ingresa medios de pago. Despues, re-corre lo que
  quedo pendiente (por ejemplo los cinco Wan 3.0 sin verificar).
- **`--web-url` o `--file` sin `--thinking`.** Wan 3.0 necesita el razonamiento previo para leer la fuente: agrega
  `--thinking`.
- **`--web-url` o `--file` en `wan3-t2v`, `wan3-i2v` u otra familia.** Sólo lo aceptan `wan3-r2v` y `wan3prime-r2v`.
- **Wan 3.0 rechaza la duracion.** Acepta un entero de 2 a 30 s o `auto`: `--duration 1` falla por minimo y
  `--duration 40` excede el maximo.
- **`wan3-r2v` pide al menos una referencia.** Pasa un `--image`, `--video` o `--audio`, o usa `--web-url` / `--file`
  con `--thinking`.
- **Resultado 404 despues de encolar bien.** Casi siempre es el prefijo del slug equivocado (ver "Que no hacer").
- **Timeout en video o entrenamiento.** No repitas el pedido: copia el comando de retome que imprimio el CLI
  (`--request-id`) y, si hace falta, agrega un `--timeout` mayor.
- **H3 rechaza la duracion.** H3 exige un entero de 5 a 15 s: `--duration 3` o `--duration auto` fallan en local.
- **H3 rechaza `4K`.** Sólo H3 base llega a `2K`/`4K`; Max y Max Turbo llegan a `1080P`. Cambia de capacidad o de
  resolucion.
- **`--aspect` en un image-to-video de H3.** No se acepta: recorta o compone la imagen de entrada con el formato
  que quieres.
- **`--prompt-expansion fast` en Max o Turbo.** Esas familias sólo aceptan `disabled`, `balanced` o `quality`.
- **Reference-to-video sin referencias.** H3 pide al menos una: `--image`, `--video` o `--audio`.
- **Extender con Flux 3 falla con `422 Invalid request parameters` despues de encolar.** Casi siempre el origen no
  trae pista de audio. Regeneralo sin `--no-audio` (camino verificado). El CLI tambien sugiere agregarle una pista
  aunque sea de silencio (por ejemplo con `ffmpeg` y `anullsrc`); ese camino **no se ha probado** contra fal.
- **`flux3-extend` entrego menos de lo que esperabas.** Es solo el tramo nuevo; une origen y continuacion en post.
- **`--resolution` en un borrador de Flux 3.** Los borradores no la aceptan; pasa a `flux3-enhance` con el
  `draft_cache` para la version final.
- **`--image` en `flux3-keyframes`, `flux3-edit` o `flux3-extend`.** Keyframes usa `--keyframe img@indice`; edit y
  extend usan `--video`.
- **`--task editing` con `--duration` (o `--aspect`).** El proveedor fuerza ambos a `auto`; quitalos. En `extension`
  solo sobra `--aspect`.
- **Seedance con solo audio de referencia.** El audio es solo apoyo: agrega al menos un `--image` o un `--video`.
- **Seedance rechaza `--duration 2` o `3`.** El minimo es 4 s (o `auto`).
- **`--task` en `seedance20-r2v`.** Solo `seedance25-r2v` lo acepta.
- **Querias usar el modo Director.** No es operable por cola; necesitaria un cliente en tiempo real que hoy no
  existe.
- **Una variante con LoRA o un entrenador fallo o devolvio otra forma.** Estan sin verificar: corre con `--json` y
  revisa la respuesta antes de tocar el registro.
- **Las capas salieron pero no se donde va cada una.** Esta en `layers.json` de la misma carpeta; si usaste `--out`
  en vez de `--out-dir`, busca `layers.json` en `public/images/generated/`.
- **Una capacidad sin verificar devolvio otra forma.** Corre con `--json`, revisa la clave real y ajusta el registro.

## Referencias tecnicas

- CLI: `scripts/ai/fal-image.ts` (`pnpm ai:fal`)
- Registro de capacidades: `src/lib/ai/fal-capabilities.ts`
- Cliente canonico: `src/lib/ai/fal.ts` (`runFalModel`, `uploadFalFile`)
- Catalogo y contratos: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Carril operativo, §Seedance video
  a video, §Minimax H3, §Flux 3, §Wan 3.0 y §Candidatos evaluados, no conectados (Kling 3, Grok Imagine)
- Arquitectura del generador: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- Guia operativa de agentes: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` §Generate via fal CLI
