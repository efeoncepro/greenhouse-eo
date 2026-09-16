# Operar el CLI de fal: Seedream 5, Seedance 2.5/2.0 y Minimax H3

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-16 por agente
> **Ultima actualizacion:** 2026-09-16 por Claude — Minimax H3 (video, camera-controls, LoRA y entrenamiento), retome por `--request-id` y cierre de la brecha de `--task`
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
  imagen, video con **LoRAs** y **entrenamiento de LoRAs** propias.

Es un comando **hermano** de `pnpm ai:image`, no su reemplazo: para GPT Image se sigue usando `ai:image`. Todo lo
que produce es trabajo fuera del portal; nada se genera en tiempo real para usuarios.

## Antes de empezar

- Trabaja en la raiz del repo. El comando lee `.env.local` y resuelve la llave de fal desde Secret Manager
  (`FAL_API_KEY_SECRET_REF`); nunca pegues la llave en la terminal ni en un archivo.
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

Para video, elige la familia por sus limites:

| Familia | Duracion maxima | Resoluciones | `--bitrate` |
|---|---|---|---|
| Seedance 2.5 | 30 s | 480p, 720p, 1080p | si |
| Seedance 2.0 base | 15 s | 480p, 720p, 1080p, 4k | si |
| Seedance 2.0 fast / us | 15 s | 480p, 720p | si |
| Seedance 2.0 mini | 15 s | 480p, 720p | no |

Aspectos en todas las Seedance: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.

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
verificadas tardaron entre 44 y 116 s), video 15 min (Seedance tardo 147 a 194 s; H3, entre 3 y 8 s) y
entrenamiento 3 h. Si necesitas mas, usa `--timeout`.

Si el tiempo de espera se acaba (`HTTP 408`), **el trabajo sigue corriendo y cobrando en fal**. El comando imprime
el comando para retomarlo:

```bash
pnpm ai:fal --capability <id> --request-id <request_id> --out <ruta>
```

Retomar **no reenvia el pedido ni vuelve a cobrar**: sólo espera el mismo trabajo y descarga el resultado (se
verifico que el archivo sale identico). Funciona para todas las capacidades, no sólo H3.

### 4. Revisa lo que entrego

- Imagen o video: `✓ <KB> · <ruta>` por archivo y al final `done · <ms> · N asset(s) · request_id <id>`.
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
- **No uses `h3max-director`.** No funciona por cola; no hay forma de operarlo con este comando.
- **No marques una capacidad como verificada** en el registro sin haberla corrido de verdad.
- **No uses este comando para Gemini Omni.** Omni se conecta directo con Google, no por fal.
- **No lo conectes al portal.** Es produccion fuera de linea; el runtime de imagen del producto es otro.
- **No guardes las URLs temporales de fal** en manifests ni documentos; guarda los archivos descargados.
- No dejes exploraciones en `public/images/generated/` ni en `.captures/`.

## Problemas comunes

- **`fal.ai no está configurado. Define FAL_API_KEY o FAL_API_KEY_SECRET_REF.`** Falta la referencia en
  `.env.local` o la sesion de Google Cloud vencio. Reautentica `gcloud` y vuelve a intentar.
- **HTTP 403 con `Exhausted balance`.** La cuenta de fal no tiene saldo; lo resuelve quien administra la cuenta.
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
- Catalogo y contratos: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Carril operativo y §Minimax H3
- Arquitectura del generador: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- Guia operativa de agentes: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` §Generate via fal CLI
