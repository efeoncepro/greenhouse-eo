# Canario real TASK-1973 — capas, borrar, mover, incorporar, fondo, detalle y expandir

> 2026-10-03 · Claude · gasto autorizado por el operador en dos tandas · gasto real ≈ USD 0,98 (0,18 + 0,29 de la comparación de expansión + 0,43 de la tercera tanda + 0,08 de borrado por instrucción + ≈ 0,15–0,35 de relight)
> Foto: `base.png` (copia de `2026-10-02_task-1965-canary/base.png`, 1536×1024: mesa de roble, taza, cuaderno, ventana).

## Resultado por técnica

| Técnica | Comando | Veredicto | Costo | Qué se vio al 100 % |
|---|---|---|---|---|
| Separar en capas | `pnpm ai:layers --image base.png` | ✓ 3 capas + base | ≈ 0,101 (3 × 0,03375; si la base se cobra, sin dato) | `#1` mesa, `#2` taza, `#3` cuaderno. **La base saca también la mesa** (`00-base.png` = pared y ventana) |
| Borrar con clean plate | `erase --layers … --layer mug` | ✓ PASS, código 0 | 0 | Taza y su sombra fuera; la mesa continúa; el cuaderno intacto (`inpaint/62d833a2edd6/`) |
| Mover | `move --layer notebook --dx -560 --dy 70` | ✓ PASS, delta 0 fuera de lo tocado | ≈ 0,010 | Cuaderno en su lugar nuevo con sombra de contacto; la taza conserva su base y su sombra (`move/be99f29165b0/`) |
| Incorporar en OTRA imagen | `place --from base.png --layer mug --at 0.22,0.47 --width 0.17` | ✓ PASS, delta 0 en el destino | 0 sin acabado · ≈ 0,010 con halo | La taza flotaba pegada; con el acabado gana sombra de contacto y reflejo en la mesa (`place/4039205b1359/`) |
| Cambiar fondo | `background --layer #1 --layer #2 --layer #3` | ✓ PASS, costura media 10,6/255 | ≈ 0,010 | Pared verde con sombra de planta; mesa, taza y cuaderno intactos (`inpaint/a673458bc672/`) |
| Pasada de detalle | `image --mask mascara-taza.png --zone-resolution 2048` | ✓ PASS mecánico | ≈ 0,022 | Generada a 1984×1856 y devuelta a su lugar; **Flare redibujó la taza** (perdió el pie) pese a pedir la misma forma |
| Expandir 9:16 | `expand --to 9:16` (Flare) | ⚠ código 3 | ≈ 0,014 | Flare **reencuadró** (escala 0,90): la escena original pegada no calza con lo generado. El detector lo vio |
| Expandir 1,91:1 | `expand --to 1.91:1` (Flare) | ⚠ código 3 | ≈ 0,009 | Igual (escala 0,88): costura vertical visible a ambos lados |

## Defectos que destapó el canario y ya están corregidos (commit `8fb2a9efe`)

1. **La base de Layerize no es la escena sin el objeto**: Layerize separa también las superficies, así que la base
   dejaba pared donde había mesa. El clean plate ahora es la base con **las demás capas recompuestas** por `z_index`
   (`plateWithoutLayers`).
2. **La sombra proyectada quedaba huérfana**. La capa de la superficie viene sin sombras: medido, la original es
   50–100 niveles más oscura que el plate bajo la sombra de la taza y ±2 en el resto. `detectCastShadow` la mide,
   crece desde el objeto y la suma a la zona (`--shadow off` la deja).
3. **La sombra del vecino**: mover el cuaderno se llevaba la base y la sombra de la taza, porque las dos sombras se
   tocan. La sombra pertenece al objeto más cercano y nunca se toma encima de otro objeto (`otherObjectsMask`).
4. **`--layer "mug"` coincidía con las tres capas**: Layerize describe cada capa citando a las demás. El nombre gana;
   la descripción sólo si ningún nombre coincide.

## Comparación de modelos para expandir (segunda tanda)

| Modelo | Formato | Veredicto | Costo | Qué se vio |
|---|---|---|---|---|
| Flux Fill (`fal:flux-pro-fill`) | 1,91:1 | ✓ PASS, código 0 | 0,100 | Mesa, ventana y alféizar continúan; uniones invisibles al 100 % (`inpaint/06eb30b0034d/`) |
| Sunburst `high`, sin máscara + guía | 1,91:1 | ⚠ código 3 | 0,036 | Copió el relleno en espejo como contenido: ventana en V y canto de mesa reflejados (`inpaint/333fe6146ca2/`) |
| Flux Fill | 9:16 | ✓ PASS, código 0 | 0,150 | Techo inclinado, ventana y patas coherentes; generado a 1088×1904 y escalado; **inventó una banca** en primer plano (`inpaint/df9cfdbda52e/`) |

Decisión: Flux Fill es el default de `expand` (`EXPAND_DEFAULT_ADAPTER`); elegir un modelo de OpenAI avisa.

## Tercera tanda: costo de la base y borrado con modelo

| Prueba | Resultado | Costo |
|---|---|---|
| `ai:layers --force` con saldo antes/después | 4 capas esta vez (separó el marco de la ventana) + base; el saldo bajó **USD 0,17 = 5 × 0,03375**: **la base se cobra** | 0,17 |
| `erase --fill model` con Flare | ✗ código 3: dejó la base de la taza como un tazón y pegó un canto de mesa desalineado (reencuadre 2 %) | 0,013 |
| `erase --fill model --adapter fal:flux-pro-fill` | ✗ dibujó OTRA taza (mitad negra); el detector decía «borrado» → corregido: semejanza a objeto 1,46 vs 0,15 del borrado bueno | 0,10 |
| Ídem con prompt que describe el fondo | ✗ dibujó otra taza blanca; código 3 | 0,10 |
| `erase` con clean plate tras la corrección de superficie | ✓ PASS, sombra incluida (10 219 px), sin sombra huérfana | 0 |
| `move` tras la corrección | ✓ PASS, delta 0 fuera de lo tocado | 0,01 |

Correcciones (commit `920669ef2`): superficie = detrás en `z_index` y sostiene la base (la regla anterior dejaba la
mesa como «otro objeto» y la sombra cayó a 78 px) · residuo medido contra el fondo limpio · prompt de relleno que
describe el fondo · costo de Layerize con la base.

## Cuarta tanda: borrar con editores por instrucción

| Modelo | Resultado | Costo |
|---|---|---|
| **Sunburst** sin máscara + guía de zona | ✓ PASS, código 0; taza y sombra fuera, sin marcas (`inpaint/85f4594a15b5/`) | 0,010 |
| Seedream 5 Pro Edit | PASS, código 0, pero **fantasma tenue del asa** en la pared que el detector no ve (`inpaint/f68030c5e445/`) | 0,068 |

Decisión: con `--fill model` y OpenAI, el default es Sunburst (`ERASE_OPENAI_MODEL`). El prompt que describe el fondo
queda sólo para modelos de relleno con máscara (Flux Fill).

## Quinta tanda: relight de un compuesto (`place --finish element`)

La taza pegada sobre la pared verde con sol entre hojas (`place/bb0ae0c3bb2d/composed.png`); zona = taza + halo.

| Modelo | Resultado | Costo |
|---|---|---|
| **Sunburst** por instrucción | ✓ PASS; la taza intacta, sombra de contacto y asentada; relight sutil (zona 8,9/255) (`relight/…/0fde0812b198/`) | 0,010 |
| `fal:image-apps-relighting` (estilo `natural`) | PASS mecánico, ✗ **cambió el color del producto** (blanca → lila) y dejó una banda borrosa en la pared (`…/3ba6bf834dae/`) | 0,04 |
| `fal:iclight-v2` | PASS mecánico, ✗ luz más dramática pero **deformó la taza** e **inventó una ventana** en el halo; tardó > 120 s (el primer intento expiró en el cliente: posible cobro de ≈ 0,20 sin resultado) (`…/0b2aa657339e/`) | 0,10 |

**Prueba de concepto — transferencia de luz (USD 0, reutiliza la salida de IC-Light):** la luz y el tono de IC-Light,
suavizados (σ 6 y 14) dentro de la silueta, aplicados sobre los píxeles ORIGINALES de la taza: forma, asa y pie exactos,
rebote cálido en la base, delta 0 fuera de la taza + 60 px. Defectos: altas luces que saturan y una banda donde la
silueta de IC-Light no calza. Script `relight/light-transfer-poc.ts.txt`; salidas `relight/light-transfer-s6.png` y
`-s14.png`. Sigue en TASK-1977.

Decisión: para un objeto exacto, Sunburst por instrucción. IC-Light y el relighting por estilos quedan conectados y
verificados, pero no se recomiendan sobre producto, logo ni texto. Pendiente: probarlos para reiluminar una escena
entera, donde la forma del objeto importa menos.

## Pendiente

- Comparar con FLUX Erase y expandir con FLUX Outpainting (BFL): cuenta BFL pendiente.
- `foto:expandir` delegando en el núcleo (Slice 2): WIP de otra sesión en `scripts/foto/expandir.mjs`.
