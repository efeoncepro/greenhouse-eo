# Operar el CLI de fal: Seedream 5 y Seedance 2.5/2.0

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-16 por agente
> **Ultima actualizacion:** 2026-09-16 por agente
> **Modulo:** AI Tooling / Asset Generation
> **Comando:** `pnpm ai:fal`
> **Documentacion tecnica:** [GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md](../../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) §Carril operativo
> **Documentacion funcional:** [Generador Visual de Assets con IA](../../documentation/ai-tooling/generador-visual-assets.md)

## Para que sirve

Para generar desde la terminal, a traves de fal.ai:

- **imagenes** con Seedream 5 (Pro o Lite), desde texto o editando con referencias;
- **capas editables** a partir de una imagen plana (Seedream 5 Pro layerize);
- **video** con Seedance 2.5 o 2.0, desde texto, desde una imagen o desde referencias.

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

`--list` muestra cada `id`, su slug y si esta `verificada <fecha>` o `SIN VERIFICAR`.

| Quieres | `--capability` | Pide |
|---|---|---|
| Imagen desde texto, mejor acabado | `seedream5-pro` | `--prompt` |
| Imagen desde texto, explorar rapido | `seedream5-lite` | `--prompt` |
| Editar con referencias | `seedream5-pro-edit` (hasta 10) o `seedream5-lite-edit` | `--prompt` + uno o mas `--image` |
| Separar una imagen en capas | `seedream5-pro-layerize` | exactamente un `--image`; prompt opcional |
| Video desde texto | `seedance25-t2v`, `seedance20-t2v` (y variantes fast/mini/us) | `--prompt` |
| Video desde una imagen | `seedance25-i2v`, `seedance20-i2v` (y variantes) | `--prompt` + un `--image` |
| Video desde referencias | `seedance25-r2v`, `seedance20-r2v` (y variantes) | `--prompt` + uno o mas `--image` |

Para video, elige la familia por sus limites:

| Familia | Duracion maxima | Resoluciones | `--bitrate` |
|---|---|---|---|
| Seedance 2.5 | 30 s | 480p, 720p, 1080p | si |
| Seedance 2.0 base | 15 s | 480p, 720p, 1080p, 4k | si |
| Seedance 2.0 fast / us | 15 s | 480p, 720p | si |
| Seedance 2.0 mini | 15 s | 480p, 720p | no |

Aspectos en todas: `auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.

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
`--task reference|editing|extension` (sólo en el reference-to-video de 2.5).

Opciones generales: `--prompt-file <path>` para prompts largos, `--size` (enum del proveedor o `WxH`), `--count`,
`--format jpeg|png`, `--timeout <ms>` y `--json` para ver la respuesta cruda.

Un modelo de fal que no esta en el registro se puede correr por su slug, con los campos extra en JSON:

```bash
pnpm ai:fal --model <slug/de/fal> --prompt "<texto>" --input '{"campo":"valor"}'
```

### 3. Espera

El comando imprime `→ <slug>` y espera. Imagen: el limite por defecto es 180 s (las corridas verificadas
tardaron entre 44 y 116 s). Video: el limite sube solo a 900 s (las corridas verificadas tardaron 147 a 194 s).
Si necesitas mas, usa `--timeout`.

### 4. Revisa lo que entrego

- Imagen o video: `✓ <KB> · <ruta>` por archivo y al final `done · <ms> · N asset(s)`.
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
| `--task sólo aplica a reference-to-video…` | Usaste `--task` en texto o imagen a video. |
| `requiere --prompt` / `requiere al menos un --image` / `no recibe imágenes de entrada` | Faltan o sobran entradas para esa capacidad. |
| `FATAL: <slug> falló (HTTP …)` | El proveedor rechazo el trabajo; el detalle viene despues de los dos puntos. |
| `HTTP 408` en el FATAL | Se acabo el tiempo de espera. El trabajo pudo haber seguido en fal y cobrarse. |
| `⚠ el output no trajo "<clave>"` | La respuesta tiene otra forma que la esperada. Repite con `--json` para verla. |
| `✓ sin assets descargables` | El modelo respondio pero no habia archivos que bajar. |

## Que no hacer

- **No corras una capacidad para "ver si existe".** Cualquier corrida sin `--list` gasta. Para confirmar un slug
  sin generar, usa el metodo barato del catalogo tecnico (POST vacio: 404 no existe, 422 existe).
- **No armes slugs a mano sumando proveedor y version.** El prefijo `fal-ai/` depende del endpoint: Seedream 5 y
  Seedance 2.0/2.5 van sin prefijo, Seedream 4/4.5 y Seedance 1/1.5 con prefijo. Con el prefijo equivocado el
  pedido parece aceptado y despues da 404, sin avisar.
- **No pases `--task` a un reference-to-video de 2.0.** Sólo el de 2.5 lo acepta, y el comando no lo bloquea en 2.0.
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
- **Timeout en video.** Sube `--timeout`; antes de repetir, considera que la corrida anterior pudo cobrarse igual.
- **Las capas salieron pero no se donde va cada una.** Esta en `layers.json` de la misma carpeta; si usaste `--out`
  en vez de `--out-dir`, busca `layers.json` en `public/images/generated/`.
- **Una capacidad sin verificar devolvio otra forma.** Corre con `--json`, revisa la clave real y ajusta el registro.

## Referencias tecnicas

- CLI: `scripts/ai/fal-image.ts` (`pnpm ai:fal`)
- Registro de capacidades: `src/lib/ai/fal-capabilities.ts`
- Cliente canonico: `src/lib/ai/fal.ts` (`runFalModel`, `uploadFalFile`)
- Catalogo y contratos: `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Carril operativo
- Arquitectura del generador: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- Guia operativa de agentes: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` §Generate via fal CLI
