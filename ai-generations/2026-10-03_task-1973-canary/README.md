# Canario real TASK-1973 — capas, borrar, mover, incorporar, fondo, detalle y expandir

> 2026-10-03 · Claude · gasto autorizado por el operador en dos tandas · gasto real ≈ USD 0,47 (0,18 + 0,29 de la comparación de expansión)
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

## Pendiente

- `erase --fill model` en vivo (≈ USD 0,01).
- `foto:expandir` delegando en el núcleo (Slice 2): WIP de otra sesión en `scripts/foto/expandir.mjs`.
