# Expandir, separar en capas, borrar, mover, cambiar fondo y rehacer detalle

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-10-03 por Claude (TASK-1973)
> **Ultima actualizacion:** 2026-10-03 por Claude (canario real: clean plate con las demas capas, sombra proyectada, `place`)
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:layers`, `pnpm ai:mask --from-layer`, `pnpm ai:inpaint expand|erase|move|place|background`, `pnpm ai:inpaint image --zone-resolution`
> **Documentacion relacionada:** [editar una zona de una imagen](editar-una-zona-de-una-imagen.md), [editar una zona de un video](editar-una-zona-de-un-video.md), [guia de seleccion de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md), [generador visual](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

## Para que sirve

Son tecnicas de edicion construidas sobre el mismo pipeline de `pnpm ai:inpaint`. Todas comparten su garantia: lo que
no se edita queda **identico** a la original y el comando lo verifica sobre el archivo escrito. Si un solo punto
cambio fuera de lo que se debia tocar, sale con codigo 2.

| Quiero… | Comando |
|---|---|
| Llevar una escena a otro formato sin regenerarla (4:5 → 9:16, 1:1 → 1,91:1) | `pnpm ai:inpaint expand` |
| Separar una foto en elementos con nombre (mascaras exactas y un clean plate) | `pnpm ai:layers` |
| La mascara de un elemento concreto (la taza, el sujeto) | `pnpm ai:mask --from-layer` |
| Borrar un objeto | `pnpm ai:inpaint erase` |
| Mover o escalar un objeto | `pnpm ai:inpaint move` |
| Incorporar un objeto de una foto en OTRA | `pnpm ai:inpaint place` |
| Cambiar el fondo dejando al sujeto intacto | `pnpm ai:inpaint background` |
| Rehacer un detalle a mas resolucion (manos, una textura) | `pnpm ai:inpaint image --zone-resolution 2048` |

## Antes de empezar

- Lo que sabes del pipeline base aplica igual: dry-run gratis, tope de costo con `--yes`, cache (repetir la misma
  entrada no paga), guarda de marca y `manifest.json`. Lee [editar una zona de una imagen](editar-una-zona-de-una-imagen.md).
- **Logos y marcas nunca se generan, borran, mueven ni reconstruyen con IA**: se componen con el arte oficial. La guarda
  mira tu prompt y tambien el nombre de la capa elegida.
- Elige el modelo con la guia de seleccion. Para la pieza final, **Sunburst es el mas potente** (edita sin mascara y
  recibe la zona como guia); Flare es el default verificado con mascara.

## Separar en capas: `pnpm ai:layers`

```bash
pnpm ai:layers --image foto.png --run ai-generations/<fecha>_<pieza> --dry-run   # cota de costo, gratis
pnpm ai:layers --image foto.png --run ai-generations/<fecha>_<pieza>
pnpm ai:layers --list ai-generations/<fecha>_<pieza>/layers/<id>/layers.json    # que capas salieron
```

- Funciona con **cualquier imagen**, no solo con las que genero Seedream.
- Devuelve la **imagen base** y hasta 16 capas, cada una con nombre, descripcion, alfa y caja. Todo queda en
  `layers.json`. **Ojo: la base saca TODO, tambien las superficies** (medido 2026-10-03: en una foto de mesa con taza y
  cuaderno salieron tres capas —mesa, taza, cuaderno— y la base era la pared sola). Por eso `erase`, `move` y `place`
  nunca usan la base sola: el *clean plate* de un elemento es la base **con las demas capas recompuestas encima**.
- `--prompt "<que separar>"` y `--bbox x0,y0,x1,y1` (fracciones, repetible) apuntan a elementos concretos.
- **Costo:** se cobra por capa (USD 0,034 hasta 1536², 0,0675 por encima) **y la base se cobra como una capa mas**
  (medido con el saldo de fal: 4 capas + base = USD 0,17). El numero de capas lo decide el modelo y varia entre
  corridas (la misma foto dio 3 y 4). El comando estima con una **cota** de 16 capas + base y pide `--yes` sobre el
  tope; despues registra lo que costo.
- **Las capas son contenido regenerado**: el modelo vuelve a dibujar cada elemento. Por eso se usan solo como
  **mascara** y como **clean plate**; los pixeles que no se editan siempre salen de tu original.

Mascara de un elemento:

```bash
pnpm ai:mask --base foto.png --from-layer <layers.json> --layer "mug" --feather 8 --out mascara-taza.png
```

`--layer` acepta el nombre (exacto o un fragmento sin ambiguedad; tambien busca en la descripcion) o el indice `#3`.
Repetible para unir varias capas.

## Borrar: `pnpm ai:inpaint erase`

```bash
pnpm ai:inpaint erase --image foto.png --layers <layers.json> --layer "mug"                    # clean plate, gratis
pnpm ai:inpaint erase --image foto.png --mask mascara.png --fill model          # Sunburst, por instruccion
```

- **Zona:** `--mask` (explicita: nunca se altera) o `--layers` + `--layer`, que se agranda `--grow` px (default 16)
  para llevarse el borde.
- **Sombra proyectada** (`--shadow auto`, default con capas): la capa de la superficie viene sin sombras, asi que la
  sombra del objeto se mide comparando la foto con el clean plate y se suma a la zona. Crece desde el objeto, nunca
  toma la sombra de un vecino y nunca pisa otro objeto. `--shadow off` la deja.
- **Relleno:** `--fill plate` (default con capas: el clean plate sin ese elemento, sin proveedor ni gasto, con
  correccion de color) o `--fill model` (un modelo reconstruye el fondo; por defecto Sunburst).
- Despues de verificar, **mide si el objeto sigue ahi**: que la zona haya cambiado y, con capas, que el resultado se
  parezca al fondo limpio y no a otro objeto. Si en ningun candidato quedo el fondo, sale con codigo 3 (revisar).
- **Que modelo borra** (canario del 2026-10-03, la misma taza):

  | Metodo | Resultado | Costo |
  |---|---|---|
  | Clean plate (con capas) | ✓ limpio | 0 |
  | **Sunburst** (default de `--fill model`) | ✓ limpio | ≈ 0,01 |
  | Seedream 5 Pro Edit | casi: queda un fantasma del asa en la pared | ≈ 0,07 |
  | Flare con mascara | ✗ dejo media taza | ≈ 0,01 |
  | Flux Fill | ✗ dibujo otra taza (dos veces) | ≈ 0,10 |

  Los que **llenan una mascara** (Flare con mascara, Flux Fill) ven la silueta del objeto y la rellenan con lo que
  sugiere: otro objeto. Los que **editan por instruccion** (Sunburst, Seedream) entienden «quita la taza». El detector
  atrapo los dos fallos con codigo 3; un fantasma tenue como el de Seedream no lo detecta: mira el resultado al 100 %.

## Mover o escalar: `pnpm ai:inpaint move`

```bash
pnpm ai:inpaint move --image foto.png --layers <layers.json> --layer "notebook" --dx -300 --dy 40 --scale 0.9
```

1. El hueco que deja el elemento —con su sombra, salvo `--shadow off`— se rellena con el clean plate sin ese elemento.
   El hueco nunca pisa a otro objeto.
2. El elemento se **recorta de tu original** con el alfa de su capa y se pega en la posicion nueva (la escala es
   alrededor de su centro).
3. `--harmonize auto` (default) hace una pasada **solo de sombra de contacto y reflejo** en un halo alrededor; `off`
   deja el compuesto sin IA ni gasto.
4. Verifica que todo lo demas quede identico a la original y lo deja en `move.json`.

## Incorporar en otra imagen: `pnpm ai:inpaint place`

```bash
pnpm ai:layers --image origen.png --run ai-generations/<fecha>_<pieza>
pnpm ai:inpaint place --image destino.png --from origen.png --layers <layers.json> --layer "mug" --at 0.22,0.47 --width 0.17
```

1. El elemento se **recorta de la imagen de origen** con el alfa de su capa.
2. Se pega en el destino con su centro en `--at` (fracciones x,y) y el ancho `--width` (fraccion del ancho del
   destino; sin `--width`, el mismo tamano en pixeles).
3. El modelo lo **termina**: `--finish halo` (default) pone solo sombra de contacto, reflejo y borde alrededor;
   `element` ademas lo relumina para que tome la luz de la escena (su forma puede variar: miralo al 100 %); `off` deja
   el pegado sin IA ni gasto.
4. Verifica que el destino quede identico fuera de lo pegado y de su acabado, y lo deja en `place.json`.

La escala y la perspectiva las decides tu: el comando no sabe que tan grande deberia verse el objeto en otra escena.

## Expandir a otro formato: `pnpm ai:inpaint expand`

```bash
pnpm ai:inpaint expand --image escena-4x5.png --to 9:16 --prompt "the same office continues above and below"
pnpm ai:inpaint expand --image escena-1x1.png --canvas 2048x1072 --scale 0.8 --anchor right --prompt "..."
```

- `--to` crece el lienzo en un solo eje; `--canvas` lo fija; `--scale` achica la escena dentro del lienzo (zoom out: la
  escena se re-muestrea); `--anchor` la apoya en un lado.
- Editable = el area nueva + una franja de fundido (`--blend`, default 24 px; 80–140 si el borde corta objetos) solo en
  los bordes que dan al area nueva. El interior de la escena queda en delta 0.
- El area nueva se rellena antes con **espejo de los bordes** (`--prefill mirror`); un relleno solido invita al modelo a
  inventar un panel.
- **Modelo: Flux Fill por defecto** (`fal:flux-pro-fill`, ≈ USD 0,05 por megapixel: 1,91:1 ≈ 0,10 y 9:16 ≈ 0,15).
  Es un modelo de relleno puro: sale al tamano de la entrada y continua la escena. Canario del 2026-10-03, misma foto y
  prompt: Flux continuo mesa, ventana y techo sin costura en 1,91:1 y 9:16; **Flare** achico la escena (escala
  0,88–0,90) y **Sunburst** copio el relleno en espejo como contenido (ventana y canto de mesa reflejados). Si eliges un
  modelo de OpenAI, el comando avisa.
- Flux genera el area nueva a menor resolucion en lienzos grandes (9:16 de 1536×2730 → 1088×1904) y la escala; la
  escena original conserva la suya. Puede **inventar elementos** en el area nueva (en el 9:16 agrego una banca): si
  molesta, describe en el prompt que hay alrededor y repite.
- `pnpm foto:expandir` sigue existiendo para el flujo de marca de CMP-004; su migracion a este nucleo esta pendiente
  (TASK-1973, Slice 2).

## Cambiar el fondo: `pnpm ai:inpaint background`

```bash
pnpm ai:inpaint background --image foto.png --prompt "a bright minimal studio with a white wall"
pnpm ai:inpaint background --image foto.png --layers <layers.json> --layer "person" --prompt "..."
```

El sujeto (matting local o capas) queda en delta 0; el fondo es su inverso. `--edge` (default 3 px) es la franja del
borde que el modelo rehace contra el fondo nuevo: el comando reporta su costura. **Miralo al 100 %** (pelo,
transparencias). Con personas reales del equipo rigen las reglas de identidad de fotografia de marca.

## Rehacer un detalle: `--zone-resolution`

```bash
pnpm ai:inpaint image --image foto.png --mask manos.png --zone-resolution 2048 --prompt "natural relaxed hands" --model gpt-image-2.5-sunburst
```

Genera la zona recortada a ese lado largo (512–4096) y la devuelve a su lugar. Avisa si el proveedor topa mas abajo.
**Es una reinterpretacion, no un escalado**: en el canario, Flare redibujo una taza y le quito el pie aunque el prompt
pedia la misma forma. Para conservar la forma exacta, usa un escalador; esto sirve para rehacer (manos, una textura).

## Que significan las senales

| Senal | Significado |
|---|---|
| `$ costo estimado ≤ USD X · cota…` | Layerize: maximo posible (16 capas + base). Lo real se registra en `layers.json` |
| `↺ esta imagen ya se separo…` | Cache: no se vuelve a pagar (`--force` para repetir) |
| `"X" coincide con varias capas` | Elige por indice (`#3`): evita editar la capa equivocada |
| `⚠ … el objeto puede seguir ahi` / codigo 3 | `erase` no vio cambio en el nucleo de la zona |
| `· costura en el borde del sujeto…` | `background`: cuanto cambio la franja del borde; revisala al 100 % |
| `◐ sombra proyectada incluida: N px` | `erase`/`move` sumaron la sombra del objeto a la zona |
| `⚠ el modelo REENCUADRO` / codigo 3 | La escena generada no calza con la original: no uses el resultado (al expandir, prueba Flux Fill) |
| `✗ FAIL` (codigo 2) | Algo fuera de lo que se debia tocar cambio: no uses el resultado |

## Que no hacer

- **No uses una capa como pixeles finales** de lo que no editas: es una reconstruccion.
- **No borres, muevas ni regeneres logos o marcas** con estas herramientas.
- **No subas el tope de costo de Layerize a ciegas**: la cota supone 16 capas; mira `--dry-run` primero.
- **No confies solo en el `PASS`**: garantiza que lo protegido no cambio, no que el resultado se vea bien.

## Problemas comunes

- **Layerize no separo el objeto que querias:** repite con `--prompt` describiendolo o con `--bbox` sobre su region.
- **El clean plate deja una mancha:** usa `erase --fill model` sobre la misma mascara.
- **Queda la sombra del objeto borrado:** sube `--grow` o revisa que corriste con capas (la sombra solo se mide con
  `--layers`); con una mascara explicita, dibujala incluyendo la sombra.
- **Al borrar o mover se llevo parte de otro objeto:** no deberia pasar; si pasa, corre con `--shadow off` y reporta
  el `manifest.json`.
- **Al expandir aparece un panel liso:** prueba `--prefill mirror` (default) y un prompt que describa que hay alrededor.

## Referencias tecnicas

- Codigo: `scripts/ai/inpaint/layers.ts`, `adapters/layerize-fal.ts`, `layers-cli.ts`, `erase.ts`, `techniques.ts`,
  `move.ts`, `place.ts`, `expand.ts`, `expand-run.ts`, `background.ts`.
- Canario real: `ai-generations/2026-10-03_task-1973-canary/README.md`.
- Contrato de Layerize: OpenAPI de fal leido el 2026-10-03 (`bounding_box.absolute` en pixeles de la base).
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
