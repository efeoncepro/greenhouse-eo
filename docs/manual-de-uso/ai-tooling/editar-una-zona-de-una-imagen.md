# Editar solo una zona de una imagen (inpainting con mascara)

> **Tipo de documento:** Manual de uso
> **Version:** 1.4
> **Creado:** 2026-09-16 por Claude
> **Ultima actualizacion:** 2026-09-17 por Claude — (1.4) `--key-background` para huecos opacos de objeto claro sobre fondo oscuro. Antes (1.3) `pnpm ai:image:rmbg` rellena huecos internos por defecto; cuándo usar `--no-fill-holes`. Antes (1.2) brechas del comando corregidas (commit `17196ead1`): `--size` y `--background` se validan antes de gastar, nuevo `--format png|jpeg|webp`, aviso de `--count N` y línea `$ costo estimado` antes de pedir. Antes (1.1): elección GPT Image 2 vs 2.5 Sunburst vs Flare con enlace a la guía canónica de selección; el costo de 2.5 sí se estima antes con la fórmula oficial; brechas conocidas del comando (`--size`/`--background` sin validar, PNG siempre, `--count` = N pedidos pagados)
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:image --image ... --mask ...`, `pnpm ai:image:rmbg`
> **Documentacion relacionada:** `docs/documentation/ai-tooling/generador-visual-assets.md`, `.claude/skills/greenhouse-ai-image-generator/SKILL.md`, `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`

## Para que sirve

Para cambiar **una zona concreta** de una imagen que ya existe y dejar el resto igual: poner un objeto sobre
una mesa vacia, reemplazar un elemento, corregir un detalle. La zona se marca con una segunda imagen llamada
**mascara**.

## Antes de empezar

### Elige el modelo: GPT Image 2, 2.5 Sunburst o 2.5 Flare

La guía canónica para elegir modelo (este comando y `pnpm ai:fal`) es
[GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
Resumen para `pnpm ai:image` (fuentes oficiales de OpenAI y mediciones propias del 2026-09-16):

| Modelo (`--model`) | Cuándo | Qué tener en cuenta |
|---|---|---|
| `gpt-image-2.5-sunburst` | Edición precisa con máscara o pieza final donde importa no tocar lo demás | El más capaz según OpenAI; #1 en edición en Arena y Artificial Analysis (rankings externos, septiembre 2026). Más lento: 80,6 s vs 46,0 s de Flare en `max` a 1024² |
| `gpt-image-2.5-flare` | Uso diario de calidad, iteraciones y pruebas | El rápido; mismo contrato, mismo costo y mismo consumo que Sunburst para igual `quality × size` |
| `gpt-image-2` | Cuando necesitas Batch (mitad de precio) o reproducir un flujo existente | Sigue siendo el **default del comando** si no pasas `--model`; OpenAI ya recomienda 2.5 para integraciones nuevas. Calidad hasta `high` (sin `xhigh`/`max`) |

Equivalencias de costo (tokens de salida): 2.5 `high` = GPT Image 2 `medium`, y 2.5 `max` = GPT Image 2 `high`. Es
decir, el default del comando (`gpt-image-2` · `high`) cuesta lo mismo que 2.5 en `max`.

### Preparación

- Necesitas la imagen original y saber que zona vas a reemplazar.
- La mascara debe cumplir tres condiciones o el comando falla **antes** de gastar: mismo formato que la
  imagen original, mismas dimensiones exactas, y las zonas a reemplazar en **transparente**.
- Decide la calidad con criterio de costo (ver la advertencia de mas abajo).

## Paso a paso

### 1. Crea la mascara

La mascara es un PNG del mismo tamano que la imagen, opaco en todo salvo la zona que quieres cambiar.
Este script la genera con un rectangulo transparente; ajusta las cuatro fracciones para mover la zona.

```bash
node -e "
const sharp=require('sharp');
(async()=>{
  const src='BASE.png', out='MASK.png';
  const {width:W,height:H}=await sharp(src).metadata();
  const px=Buffer.alloc(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    // zona a reemplazar: 33%-67% del ancho, 42%-72% del alto
    const hole = x>W*0.33 && x<W*0.67 && y>H*0.42 && y<H*0.72;
    px[i]=0; px[i+1]=0; px[i+2]=0; px[i+3]= hole?0:255;
  }
  await sharp(px,{raw:{width:W,height:H,channels:4}}).png().toFile(out);
})()
"
```

### 2. Corre la edicion

```bash
pnpm ai:image --image BASE.png --mask MASK.png \
  --model gpt-image-2.5-flare --quality low --size 1024x1024 \
  --prompt "Que va en la zona. Keep everything else exactly the same." \
  --out RESULTADO.png
```

Antes de pedir, el comando imprime la estimación con la fórmula oficial de tokens de salida:

```
  $ costo estimado ≈ USD 0.006 (1 × 196 tokens de salida × USD 30/1M; la entrada suma aparte)
```

Es sólo informativa (no pide confirmación) y no incluye la imagen base de entrada. Con `--size auto` o un modelo sin
grilla publicada imprime `$ costo: sin estimación …`. El formato del resultado sale de `--format png|jpeg|webp` o, si
no lo pasas, de la extensión de `--out` (`.jpg` → JPEG, `.webp` → WebP; si no, PNG), y el archivo se guarda con esa
extensión. `--background transparent` con JPEG se rechaza.

### 3. Lee el `usage` que imprime

```
✓ 1018KB · gpt-image-2.5-flare · 1024x1024 · low
    usage: in 1056 (img 1024 · txt 32) · out 196 · total 1252
```

Ese `usage` **confirma** el costo real. Corrección 2026-09-16: el costo de la familia 2.5 **sí se puede estimar
antes de gastar**: la guía oficial de OpenAI publica una calculadora que cubre 2.5 y su fórmula reproduce exactamente
lo medido (196 / 1.756 / 7.024 tokens de salida en `low` / `high` / `max` a 1024²). La fórmula está en
`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.5. Recuerda sumar la imagen base como
entrada (1.024 tokens a 1024²).

### 4. Revisa el resultado mirandolo

Abre la imagen y comparala con la original. **No confies en una diferencia promedio de pixeles**: un objeto
chico mueve muy poco el promedio y parece que no paso nada. Hay que mirar.

## Que significan las senales

| Senal | Que significa |
|---|---|
| `--mask requires --image` | Pasaste mascara sin imagen base. Sin ese corte, el pedido habria salido como una imagen nueva ignorando la mascara. |
| `OpenAI image mask must use the same format as the first image input` | La mascara y la imagen tienen formatos distintos (por ejemplo JPEG y PNG). |
| Error de dimensiones | La mascara no mide exactamente lo mismo que la imagen base. |
| `usage` con `img 0` | No viajo ninguna imagen: fue una generacion desde cero, no una edicion. |
| `--size "…" no es válido…` / `"<modelo>" sólo acepta 1024x1024, 1536x1024, 1024x1536, auto…` | El tamaño no cumple la grilla del modelo. Se detuvo antes de gastar. |
| `--background "…" no es válido…` / `--format "…" no es válido…` | Valor fuera de `auto|opaque|transparent` o de `png|jpeg|webp`. |
| `$ costo estimado ≈ USD X (…)` | Estimación previa del output; la entrada suma aparte. No se cobró nada todavía. |
| `⚠ --count N: son N pedidos separados…` | Vas a pagar N pedidos. |

## Que no hacer

- **No asumas que editar es mas barato que generar.** Es al reves: medido el 2026-09-16 en calidad baja,
  editar costo **2,3 veces** lo que costo generar. El modelo devuelve la imagen **completa** aunque la
  mascara acote el cambio, asi que la salida se cobra igual, y ademas se suma leer la imagen original.
  El sobrecosto se diluye al subir calidad (~1,15x en `high`, ~1,04x en `max`).
- **No uses una edicion para quitar un fondo.** Para eso esta `pnpm ai:image:rmbg`, que corre local y no le
  cobra nada al proveedor. Pedirselo al modelo cuesta como una imagen nueva.
  Desde 2026-09-17 el recorte **rellena por defecto los huecos internos** que el matting deja transparentes
  por error (ojos, visores, glifos): la salida muestra `huecos internos rellenados=<px>/<componentes>`. Un hueco
  cuyo color se parece al fondo de estudio se respeta y sigue transparente. Usa `--no-fill-holes` solo si el sujeto
  tiene huecos reales que deben quedar transparentes y **no** se parecen al fondo (por ejemplo, un fondo de otro
  color visible a traves de un aro). Verifica siempre el recorte sobre un fondo oscuro (navy): ahi se ven los huecos
  y los halos que sobre blanco pasan desapercibidos.
- **Objeto claro sobre fondo oscuro: agrega `--key-background`.** El matting puede dejar opacos los huecos por los
  que se ve el fondo (ventanas, cortes de una orbita): `pnpm ai:image:rmbg <in.png> <out.png> --key-background`
  los vacia (defaults `42 30`: umbral de distancia al color de fondo y tamaño minimo del hueco). Si el fondo es claro
  y desenfocado o es un macro, sube el tamaño minimo (`--key-background 30 800`). La salida muestra
  `huecos de fondo vaciados=<px>/<componentes>`. No lo uses si el sujeto tiene zonas del mismo color que el fondo:
  tambien se borrarian. Revisa el resultado sobre un fondo de contraste fuerte (por ejemplo terracota) con zoom al
  100 %; el gris azulado no deja ver restos de navy.
- **No pagues por la mascara**: no cuesta nada. El `usage` es identico con y sin ella. Lo que se cobra es
  la imagen base.
- No uses `--input-fidelity` con modelos 2.5: no lo transportan. La preservacion se pide por prompt.

## Brechas conocidas del comando (2026-09-16)

Corregidas el 2026-09-16 (commit `17196ead1`): `--size` se valida antes de gastar (GPT Image 2 y 2.5: `auto` o
ANCHOxALTO con lados múltiplos de 16, borde ≤ 3840, relación ≤ 3:1 y área entre 655.360 y 8.294.400 px; modelos
anteriores: sólo `1024x1024`, `1536x1024`, `1024x1536` o `auto`); `--background` se valida; existe
`--format png|jpeg|webp`; el comando avisa que `--count N` son N pedidos pagados y estima el costo antes de pedir.
Lo que sigue abierto:

- **`--count N` sigue haciendo N pedidos separados de 1 imagen y pagas N veces** (ahora con aviso).
- La estimación no pide confirmación ni suma la imagen de entrada; no hay control de compresión.
- `--input-fidelity` con 2.5 o 2 se ignora en silencio, y no hay `--moderation`.
- Sin `--out` ni `--out-dir`, guarda en `public/images/generated/`: para exploraciones usa `--out` a
  `ai-generations/` o al scratchpad.

## Problemas comunes

- **El modelo cambio cosas fuera de la zona.** Repite en el prompt que conserve el resto
  ("keep everything else exactly the same") y revisa que la mascara sea realmente opaca fuera de la zona.
- **No se ve ningun cambio.** Confirma que el `usage` muestre `img` distinto de cero; si es cero, el comando
  corrio como generacion y la mascara no viajo.
- **La zona quedo bien pero el estilo no calza.** Sube la calidad un escalon; el costo del output sube pero
  el de la imagen base no cambia.

## Referencias tecnicas

- Guía canónica de selección de modelos: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
- Contrato del proveedor: `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`
- Cliente canonico: `src/lib/ai/openai-image.ts` (`editOpenAIImage`)
- CLI: `scripts/ai/generate-image.ts`
- Medicion de costo con evidencia: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`
