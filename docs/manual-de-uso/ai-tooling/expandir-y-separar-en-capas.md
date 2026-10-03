# Expandir, separar en capas, borrar, mover, cambiar fondo y rehacer detalle

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude (TASK-1973)
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:layers`, `pnpm ai:mask --from-layer`, `pnpm ai:inpaint expand|erase|move|background`, `pnpm ai:inpaint image --zone-resolution`
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
- Devuelve la **imagen base** (la escena sin los elementos: un *clean plate*) y hasta 16 capas, cada una con nombre,
  descripcion, alfa y caja. Todo queda en `layers.json`.
- `--prompt "<que separar>"` y `--bbox x0,y0,x1,y1` (fracciones, repetible) apuntan a elementos concretos.
- **Costo:** se cobra por capa (USD 0,034 hasta 1536², 0,0675 por encima) y el numero de capas lo decide el modelo. El
  comando estima con una **cota** de 16 capas + base y pide `--yes` sobre el tope; despues registra lo que costo.
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
pnpm ai:inpaint erase --image foto.png --mask mascara.png --fill model --model gpt-image-2.5-flare
```

- **Zona:** `--mask` (explicita: nunca se altera) o `--layers` + `--layer`, que se agranda `--grow` px (default 16)
  para llevarse el borde y la sombra de contacto.
- **Relleno:** `--fill plate` (default con capas: la base de Layerize, sin proveedor ni gasto, con correccion de color)
  o `--fill model` (un modelo reconstruye el fondo).
- Despues de verificar, **mide si el objeto sigue ahi**. Si en ningun candidato cambio, sale con codigo 3 (revisar).

## Mover o escalar: `pnpm ai:inpaint move`

```bash
pnpm ai:inpaint move --image foto.png --layers <layers.json> --layer "notebook" --dx -300 --dy 40 --scale 0.9
```

1. El hueco que deja el elemento se rellena con el clean plate.
2. El elemento se **recorta de tu original** con el alfa de su capa y se pega en la posicion nueva (la escala es
   alrededor de su centro).
3. `--harmonize auto` (default) hace una pasada **solo de sombra de contacto y reflejo** en un halo alrededor; `off`
   deja el compuesto sin IA ni gasto.
4. Verifica que todo lo demas quede identico a la original y lo deja en `move.json`.

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

## Que significan las senales

| Senal | Significado |
|---|---|
| `$ costo estimado ≤ USD X · cota…` | Layerize: maximo posible (16 capas + base). Lo real se registra en `layers.json` |
| `↺ esta imagen ya se separo…` | Cache: no se vuelve a pagar (`--force` para repetir) |
| `"X" coincide con varias capas` | Elige por indice (`#3`): evita editar la capa equivocada |
| `⚠ … el objeto puede seguir ahi` / codigo 3 | `erase` no vio cambio en el nucleo de la zona |
| `· costura en el borde del sujeto…` | `background`: cuanto cambio la franja del borde; revisala al 100 % |
| `✗ FAIL` (codigo 2) | Algo fuera de lo que se debia tocar cambio: no uses el resultado |

## Que no hacer

- **No uses una capa como pixeles finales** de lo que no editas: es una reconstruccion.
- **No borres, muevas ni regeneres logos o marcas** con estas herramientas.
- **No subas el tope de costo de Layerize a ciegas**: la cota supone 16 capas; mira `--dry-run` primero.
- **No confies solo en el `PASS`**: garantiza que lo protegido no cambio, no que el resultado se vea bien.

## Problemas comunes

- **Layerize no separo el objeto que querias:** repite con `--prompt` describiendolo o con `--bbox` sobre su region.
- **El clean plate deja una mancha:** usa `erase --fill model` sobre la misma mascara.
- **Al expandir aparece un panel liso:** prueba `--prefill mirror` (default) y un prompt que describa que hay alrededor.

## Referencias tecnicas

- Codigo: `scripts/ai/inpaint/layers.ts`, `adapters/layerize-fal.ts`, `layers-cli.ts`, `erase.ts`, `techniques.ts`,
  `move.ts`, `expand.ts`, `expand-run.ts`, `background.ts`.
- Contrato de Layerize: OpenAPI de fal leido el 2026-10-03 (`bounding_box.absolute` en pixeles de la base).
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) §Pipeline de inpainting.
