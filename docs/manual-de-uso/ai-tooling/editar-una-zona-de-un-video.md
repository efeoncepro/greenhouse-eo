# Editar solo una zona de un video (inpainting de video)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-02 por Claude (TASK-1965)
> **Ultima actualizacion:** 2026-10-02 por Claude
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:mask`, `pnpm ai:inpaint video`
> **Documentacion relacionada:** [editar una zona de una imagen](editar-una-zona-de-una-imagen.md), [CLI de fal](operar-cli-fal-seedream-seedance.md), [guia de seleccion de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md), [generador visual](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

## Para que sirve

Para cambiar **una zona** de un clip corto —agregar o quitar un objeto, cambiar un material— y que **todo lo demas
quede identico en cada cuadro**. El motor de video edita el clip completo por instruccion; el comando despues pega
solo la zona marcada, cuadro a cuadro, y verifica que lo de afuera no cambio.

No sirve para mover la camara, reencuadrar ni editar algo que se mueve mucho por el cuadro sin una mascara que lo
siga (ver [Que no hacer](#que-no-hacer)).

## Antes de empezar

- `ffmpeg` instalado (`brew install ffmpeg`). El comando lo revisa al arrancar.
- Clip MP4 corto: `fal:flux3-edit` acepta hasta **15 s y 50 MB**; `fal:seedance25-edit`, hasta 30 s.
- **Camara quieta** es el caso que funciona mejor: con mascara fija, la zona no se mueve.
- Costo: `flux3-edit` cobra **USD 0,03 por segundo del clip** (5 s ≈ USD 0,15). El comando lo estima antes de pedir y
  exige `--yes` sobre el tope (default USD 1).

## Paso a paso

### 1. Arma la mascara sobre un cuadro del clip

```bash
ffmpeg -v error -y -i clip.mp4 -frames:v 1 cuadro-0.png
pnpm ai:mask --base cuadro-0.png --rect 0.08,0.16,0.34,0.72 --feather 20 --out mascara.png
```

Mira la vista previa (`mascara-preview.png`). La mascara debe cubrir **el objeto entero con margen**: si lo que el
motor dibuja se sale de la zona, la recomposicion lo funde con el original y queda cortado.

Si la zona se mueve en el clip, usa keyframes en vez de un PNG fijo:

```json
{ "keyframes": [ { "t": 0, "rect": [0.10, 0.20, 0.35, 0.70] }, { "t": 4, "rect": [0.30, 0.20, 0.55, 0.70] } ], "feather": 16 }
```

Entre keyframes la caja se interpola en linea recta; antes del primero y despues del ultimo se queda quieta.

### 2. Prueba gratis con `--dry-run`

```bash
pnpm ai:inpaint video --video clip.mp4 --mask mascara.png --prompt "<que cambia en la zona>" --dry-run
```

Imprime resolucion, fps, duracion, si tiene audio, cobertura de la mascara y costo estimado, y guarda
`mask-preview-t0.png`. No llama al proveedor.

### 3. Corre la edicion

```bash
pnpm ai:inpaint video --video clip.mp4 --mask mascara.png \
  --prompt "Add a small green potted plant on the empty left side of the desk. Keep the camera locked and everything else unchanged." \
  --run ai-generations/2026-10-02_mi-pieza
```

Que hace, en orden:

1. Sube el clip al motor y descarga su salida (`engine-raw.mp4`).
2. Lleva esa salida a la **resolucion, fps y duracion del original** (tolera un cuadro de diferencia).
3. **Mide cuanto movio el motor la zona protegida.** Si la deriva media supera `--max-drift` (default 12/255),
   **aborta**: recomponer sobre un encuadre corrido produce imagenes fantasma.
4. Recompone **cada cuadro**: entra la zona de la mascara y el resto queda con el byte original.
5. Verifica la zona protegida en **delta 0** sobre la secuencia PNG y mide el **parpadeo** dentro de la zona.
6. Codifica `final.mp4` (H.264, CRF 12) y **copia el audio del original**.

### 4. Lee el resultado

```
⇄ deriva media de la zona protegida: 11.16/255 (umbral 12)
✓ PASS · 120 cuadros · zona protegida delta maximo 0/255 · parpadeo 3.90 · cambio en la zona 22.8/255
```

En la carpeta de la corrida (`<run>/inpaint-video/<id>/`): `final.mp4`, `engine-raw.mp4`, `contact-sheet.png` (seis
cuadros repartidos), `mask-preview-t0.png` y `manifest.json`. **Mira la hoja y el video**: el veredicto garantiza lo
que no se toco, no que el pedido se haya cumplido.

## Que significan los estados

| Señal | Significado | Que hacer |
|---|---|---|
| `PASS` | La zona protegida quedo identica en todos los cuadros (secuencia PNG) | Revisa el video y la hoja de cuadros |
| `FAIL` (codigo 2) | Algun cuadro cambio fuera de la mascara | No uses el video; revisa `manifest.json` (`worstFrame`) |
| `el motor movio el encuadre` | La deriva supero `--max-drift` | Cambia de motor, estabiliza el clip o, si lo revisaste, sube `--max-drift` |
| `la duracion no calza` | El motor devolvio mas de un cuadro de diferencia | Corta el clip a la duracion que el motor respeta |
| `la zona editable casi no cambio` | El motor ignoro el pedido | Reescribe el prompt o agranda la mascara |
| `↺ misma entrada ya generada` | Caché: no se vuelve a pagar | `--force` para regenerar |

El `final.mp4` pierde un poco por el codec: la verificacion exacta es sobre los PNG, antes de codificar.

## Estrategia `first-frame`

Con `--strategy first-frame` el comando edita primero un cuadro (`--frame-time`, default 0) con el pipeline de
imagen y pasa ese cuadro editado como referencia al motor. Sirve cuando el objeto debe verse exactamente de una
forma. Solo funciona con motores que reciben imagenes (`fal:seedance25-edit`); con `flux3-edit` el comando se niega.
`fal:seedance25-edit` **no tiene canario propio todavia** y su filtro rechaza marcas y personas reales y cobra el
intento (guia de seleccion, §6.8).

## Que no hacer

- **No edites con la camara en movimiento y una mascara fija**: la zona queda pegada a la pantalla, no al objeto.
  Usa keyframes o espera el seguimiento automatico (follow-up de TASK-1965).
- **No subas `--max-drift` para forzar un clip que aborto** sin mirar `engine-raw.mp4`: el aborto existe porque
  recomponer sobre un encuadre corrido se ve fantasma.
- **No generes logos ni marcas con el motor**: se componen despues con el arte oficial. El comando se detiene si el
  prompt los nombra (`--allow-brand` solo si la edicion toca el contexto).
- **No confies solo en el veredicto**: un `PASS` con la zona sin cambios es un pedido no cumplido.

## Problemas comunes

- **`No se encontro ffmpeg`**: `brew install ffmpeg`.
- **El objeto aparece cortado en el borde de la zona**: la mascara es chica; agrandala con `--dilate` o un rect mayor.
- **Parpadeo alto dentro de la zona**: el motor no sostiene el objeto entre cuadros; prueba otro motor o un clip mas
  corto.
- **El video final no tiene audio**: el original no tenia pista de audio (el comando lo informa al arrancar).

## Referencias tecnicas

- Codigo: `scripts/ai/inpaint/pipeline-video.ts`, `scripts/ai/inpaint/video-mask.ts`, `scripts/ai/inpaint/ffmpeg.ts`,
  `scripts/ai/inpaint/adapters/video-fal.ts`.
- Canario 2026-10-02: `ai-generations/2026-10-02_task-1965-canary/` (README y manifiestos).
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
