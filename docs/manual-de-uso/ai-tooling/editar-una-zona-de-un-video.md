# Editar solo una zona de un video (inpainting de video)

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-10-02 por Claude (TASK-1965)
> **Ultima actualizacion:** 2026-10-03 por Claude — (1.1) seccion «Para agentes»: arbol de decision (motor, mascara fija o keyframes, estrategia), lineas de comando, codigos de salida (0/2/1; en video no hay 3), regla del tope de costo y checklist al 100 %; codigo 1 y tope de costo en la tabla de estados; resultado del canario. Antes (1.0, TASK-1965) creacion
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
| `La estimación (USD X) supera el tope…` (codigo 1) | El costo estimado pasa el tope (default USD 1); no se gasto nada | Confirma el monto y repite con `--yes` |
| `… acepta hasta 15 s` / `… hasta 50 MB` (codigo 1) | El clip excede el limite del motor | Corta o comprime el clip |
| `FATAL: …` (codigo 1) | Error de entrada o del proveedor | Lee el mensaje: no es un resultado |

El `final.mp4` pierde un poco por el codec: la verificacion exacta es sobre los PNG, antes de codificar.

**Resultado medido** (canario del 2026-10-02, `fal:flux3-edit`): clip de 5 s con camara quieta, objeto estable en los
120 cuadros, deriva 11,16/255 (bajo el umbral de 12) y zona protegida en delta 0.

## Estrategia `first-frame`

Con `--strategy first-frame` el comando edita primero un cuadro (`--frame-time`, default 0) con el pipeline de
imagen y pasa ese cuadro editado como referencia al motor. Sirve cuando el objeto debe verse exactamente de una
forma. Solo funciona con motores que reciben imagenes (`fal:seedance25-edit`); con `flux3-edit` el comando se niega.
`fal:seedance25-edit` **no tiene canario propio todavia** y, con marcas o personas reales, puede rechazar despues de
encolar y cobrar el intento: es un riesgo puntual, no un filtro sistematico (guia de seleccion, §5.3 y §6.8).
Presupuesta ese posible rechazo y ten `flux3-edit` como alternativa.

## Que no hacer

- **No edites con la camara en movimiento y una mascara fija**: la zona queda pegada a la pantalla, no al objeto.
  Usa keyframes o espera el seguimiento automatico (TASK-1979: SAM 2 + VACE).
- **No subas `--max-drift` para forzar un clip que aborto** sin mirar `engine-raw.mp4`: el aborto existe porque
  recomponer sobre un encuadre corrido se ve fantasma. Ojo: el aborto ocurre despues de recibir la salida del motor,
  asi que ese intento ya se pago.
- **No generes logos ni marcas con el motor**: se componen despues con el arte oficial. El comando se detiene si el
  prompt los nombra (`--allow-brand` solo si la edicion toca el contexto).
- **No confies solo en el veredicto**: un `PASS` con la zona sin cambios es un pedido no cumplido.

## Problemas comunes

- **`No se encontro ffmpeg`**: `brew install ffmpeg`.
- **El objeto aparece cortado en el borde de la zona**: la mascara es chica; agrandala con `--dilate` o un rect mayor.
- **Parpadeo alto dentro de la zona**: el motor no sostiene el objeto entre cuadros; prueba otro motor o un clip mas
  corto.
- **El video final no tiene audio**: el original no tenia pista de audio (el comando lo informa al arrancar).

## Para agentes

Para un agente que opera `pnpm ai:inpaint video` sin supervision continua. El contrato es
`pnpm ai:inpaint video --help`: si algo de aqui difiere, gana el `--help`.

### Arbol de decision

```text
¿El cambio toca un logo, una marca o una persona real?
├─ logo/marca → NO con IA: se compone despues con el arte oficial
└─ persona real o marca en cuadro → seedance25-edit sirve, pero puede rechazar y cobrar el intento (riesgo puntual):
   presupuestalo y, si rechaza, usa flux3-edit

¿El clip cumple el motor? fal:flux3-edit: MP4 ≤ 15 s y ≤ 50 MB  (fal:seedance25-edit: ≤ 30 s, sin canario propio)
└─ no → cortar el clip antes; no hay otro camino verificado

¿La camara esta quieta?
├─ si, y la zona no se mueve ....... --mask mascara.png              (mascara fija, del tamano del video)
├─ la zona se desplaza ............. --mask-keyframes zona.json       (caja interpolada en linea recta)
└─ camara en movimiento ............ no hay seguimiento automatico: esperar TASK-1979 (SAM 2 + VACE) o no editar

Motor y estrategia
├─ default, verificado 2026-10-02 .. --engine fal:flux3-edit --strategy edit-recompose
└─ el objeto debe verse EXACTO ..... --strategy first-frame --engine fal:seedance25-edit
                                     (edita un cuadro con el pipeline de imagen; sin canario: tratar como experimento)
```

### Lineas de comando

```bash
RUN=ai-generations/<fecha>_<pieza>

ffmpeg -v error -y -i clip.mp4 -frames:v 1 cuadro-0.png
pnpm ai:mask --base cuadro-0.png --rect 0.08,0.16,0.34,0.72 --feather 20 --out mascara.png

# Siempre primero el dry-run (gratis: resolucion, fps, duracion, audio, cobertura y costo)
pnpm ai:inpaint video --video clip.mp4 --mask mascara.png --prompt "<que cambia en la zona>. Keep the camera locked and everything else unchanged." --run $RUN --dry-run

# Corrida real
pnpm ai:inpaint video --video clip.mp4 --mask mascara.png --prompt "<que cambia en la zona>. Keep the camera locked and everything else unchanged." --run $RUN
```

### Codigos de salida y que hacer con cada uno

| Codigo | Significa | Que hace el agente |
|---|---|---|
| `0` PASS | La zona protegida quedo en delta 0 en todos los cuadros (secuencia PNG, antes de codificar) | Revisar `contact-sheet.png` y el video completo (checklist de abajo). PASS no prueba que el pedido se cumplio |
| `2` FAIL | Algun cuadro cambio fuera de la mascara | **Nunca usar el video.** Leer `manifest.json` (`worstFrame`) y reportar |
| `1` error | Clip fuera de limites, tope de costo superado sin `--yes`, la duracion no calza, el motor movio el encuadre (deriva > `--max-drift`), o error del proveedor (`FATAL: …`) | Leer el mensaje. Con el tope de costo, detenerse y pedir autorizacion. Con la deriva, **el motor ya se pago**: mirar `engine-raw.mp4` y reportar; no subir `--max-drift` sin que un humano lo haya revisado |

En video no hay codigo 3: el aviso «la zona editable casi no cambio» se imprime pero el codigo sigue siendo 0. Leerlo
siempre.

### Regla del tope de costo

1. **`--dry-run` siempre primero.** `fal:flux3-edit` cobra USD 0,03 por segundo del clip de origen (5 s ≈ USD 0,15).
2. Tope: `--max-usd` o `AI_COST_CONFIRM_USD` (default USD 1). Sobre el tope el comando sale con codigo 1 sin gastar.
3. `--yes` o subir `--max-usd` **solo con autorizacion humana explicita del monto en el chat**.
4. Repetir la misma entrada no paga (cache); `--force` vuelve a pagar: solo con una razon. Con `first-frame` se paga
   tambien el cuadro de imagen.

### Revision visual al 100 % (obligatoria con PASS)

- [ ] **El pedido se cumplio** en todo el clip, no solo en el primer cuadro (mirar la hoja de seis cuadros y el video).
- [ ] **Parpadeo**: el objeto no titila ni cambia de forma entre cuadros (el comando mide el parpadeo, no lo juzga).
- [ ] **Costuras**: el borde de la mascara no se nota en movimiento (halo, cambio de tono, linea).
- [ ] **Fantasmas**: sin imagenes dobles en el borde de la zona (sintoma de un encuadre corrido).
- [ ] **Elementos inventados**: nada nuevo dentro de la zona que nadie pidio.
- [ ] **Objeto cortado**: lo dibujado no se sale de la mascara (si se sale, queda fundido y cortado).
- [ ] **Audio**: el `final.mp4` conserva el audio del original (si el original lo tenia).
- [ ] **Sin logos ni texto generados**; personas reales con su identidad intacta.

Si un punto falla, no se entrega aunque el codigo sea 0.

## Referencias tecnicas

- Codigo: `scripts/ai/inpaint/pipeline-video.ts`, `scripts/ai/inpaint/video-mask.ts`, `scripts/ai/inpaint/ffmpeg.ts`,
  `scripts/ai/inpaint/adapters/video-fal.ts`.
- CLI: `scripts/ai/inpaint/cli.ts` (`pnpm ai:inpaint video --help` es el contrato); catalogo `src/lib/ai/fal-capabilities.ts`
  (`flux3-edit`).
- Canario 2026-10-02: `ai-generations/2026-10-02_task-1965-canary/` (README y manifiestos).
- Task: `docs/tasks/complete/TASK-1965-ai-inpaint-image-video-cli-pipeline.md`.
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
