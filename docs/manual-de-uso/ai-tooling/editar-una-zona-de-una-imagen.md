# Editar solo una zona de una imagen (inpainting con mascara)

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-16 por Claude
> **Ultima actualizacion:** 2026-09-16 por Claude — elección GPT Image 2 vs 2.5 Sunburst vs Flare con enlace a la guía canónica de selección; el costo de 2.5 sí se estima antes con la fórmula oficial; brechas conocidas del comando (`--size`/`--background` sin validar, PNG siempre, `--count` = N pedidos pagados)
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

## Que no hacer

- **No asumas que editar es mas barato que generar.** Es al reves: medido el 2026-09-16 en calidad baja,
  editar costo **2,3 veces** lo que costo generar. El modelo devuelve la imagen **completa** aunque la
  mascara acote el cambio, asi que la salida se cobra igual, y ademas se suma leer la imagen original.
  El sobrecosto se diluye al subir calidad (~1,15x en `high`, ~1,04x en `max`).
- **No uses una edicion para quitar un fondo.** Para eso esta `pnpm ai:image:rmbg`, que corre local y no le
  cobra nada al proveedor. Pedirselo al modelo cuesta como una imagen nueva.
- **No pagues por la mascara**: no cuesta nada. El `usage` es identico con y sin ella. Lo que se cobra es
  la imagen base.
- No uses `--input-fidelity` con modelos 2.5: no lo transportan. La preservacion se pide por prompt.

## Brechas conocidas del comando (2026-09-16)

Leídas en el código de `scripts/ai/generate-image.ts`; están registradas para corregirse:

- **`--size` y `--background` no se validan** en el comando: un valor inválido llega tal cual al API. Si el API lo
  rechaza antes de cobrar: sin dato. Revisa el valor antes de correr (tamaños con lados múltiplos de 16, relación
  entre 1:3 y 3:1, borde ≤ 3840).
- **El formato de salida es siempre PNG**: no hay `--format` ni compresión.
- **`--count N` hace N pedidos separados de 1 imagen y pagas N veces.**
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
