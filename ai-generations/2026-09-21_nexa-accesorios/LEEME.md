# Los signature elements en el ancla de manos — y el dedo que sólo se gana editando (2026-09-21)

Una edición sobre `1-anclas/nexa-ancla-8-manos.png` para que el ancla porte los **cuatro** signature
elements del Character Bible §5.1. Motor `gpt-image-2.5-sunburst`, `xhigh`, `--input-fidelity high`.
**USD 0,074.** La candidata **NO reemplaza todavía** al ancla: es un asset canónico y el lock existe
precisamente para que la identidad no cambie en silencio.

## El hallazgo **[medido]**

🔴 **El DEDO del anillo se gana EDITANDO, no generando.** Es el par que faltaba del hallazgo de la corrida
de Lifestyle:

| Vía | Metal y forma | Presencia | **Dedo** |
|---|---|---|---|
| **Generar** con el bloque `accesorios` en el prompt | ✓ plata mate, geométrico | ✓ reloj y aretes aparecen | ✗ salió en el **medio** pese a «not on another finger» |
| **Editar** una foto existente con instrucción posicional | ✓ | ✓ | ✓ **índice** |

Es la misma ley que ya gobierna el resto del oficio —«editar conserva, generar reconstruye»— aplicada a un
detalle de dos centímetros. La consecuencia operativa: **el dedo no se pide, se hereda**. Si el ancla que se
antepone lo lleva bien, las piezas lo heredan; si se pide por texto en una generación desde cero, no.

## Lo que se corrigió

El ancla de manos **no tenía ningún accesorio**: manos completamente desnudas, sin anillo y sin reloj, y los
aretes dorados. Así que no fue reemplazar sino **añadir**, que es una edición más limpia.

| §5.1 pide | En la candidata |
|---|---|
| Anillo geométrico **plata mate**, **índice derecho** | ✓ signet facetado, plata cepillada, sin piedra, en el índice |
| Reloj **muñeca izquierda**, correa navy, **carátula pequeña y limpia** | ✓ dial plateado liso sin subdiales, correa navy |
| Aretes **plata**, no dorados | ✓ aros pequeños plateados |
| Uñas de **un solo color** | ✓ nude rosado en ambas manos |

Verificado ampliando cada zona al 100 %, no sobre la hoja de contacto.

## 🔴 v01 deformó al sujeto: editar con otro aspect ratio REENCUADRA **[medido]**

**`v01` quedó descartada.** El ancla es **2560×3200 (4:5)** y se editó pidiendo `--size 1024x1536`, que es
**2:3**. El modelo no recortó ni rellenó: **reencuadró**, y el sujeto cambió de escala. Medido sobre una
grilla de veinteavos con ambas normalizadas al mismo ancho: la cabeza pasó de ocupar **~30 %** del alto a
**~38 %**, y los hombros de ~45 % a ~55 %.

Lo detectó el operador a ojo antes que cualquier medición: *«la cabeza se ve más grande con respecto a su
cuerpo… parece una cabeza de caballo»*. Yo lo había reportado como simple pérdida de resolución, y era otra
cosa.

**Muerde siempre con el canon**, porque los tamaños del modelo son 1:1, 2:3 y 3:2 — **4:5 no está entre
ellos** y 4:5 es el formato de los plates y las anclas.

### `v02`: padear, editar, recortar

Se padea el original hasta 2:3 **espejando los bordes** (un pad de color sólido invita al modelo a
rellenarlo con invento), se edita declarando en el prompt que esas bandas son padding, y se recorta de
vuelta:

```
2560×3200 (4:5) → pad 320 arriba y abajo → 2560×3840 (2:3) → editar 1024×1536 → recortar 128 → 1024×1280 (4:5)
```

Medido con la misma grilla: **mentón, hombros y manos caen en las mismas líneas que el original.** La
proporción vuelve exacta. La receta quedó en el canon
([`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)).

## 🔴 El reloj ahora es un SMARTWATCH **[decisión del operador, 2026-09-21]**

*«Nexa es tecnológica»*: el reloj analógico de §5.1 —correa navy, carátula pequeña y limpia— queda
reemplazado por un **smartwatch**, caja rectangular redondeada con pantalla y correa navy. `v01` llevaba el
analógico y por eso también quedó obsoleta; `v02` lleva el smartwatch.

El ecosistema completo de dispositivos de Nexa —iPhone, iPad, MacBook, AirPods, DJI Osmo, DJI Mic, lavalier
Rode, Shure de podcast, cuerpo Sony o Canon— está en
[`NEXA_TECH_PROPS_V1.md`](../../docs/operations/brand-photography/NEXA_TECH_PROPS_V1.md).

## El costo que SÍ queda: resolución

El ancla original es **2560×3200** (`max`, USD 0,565). El modelo entrega vertical a **1024×1536**, así que la
candidata **pierde resolución**. En la ampliación del rostro se nota: el detalle de poros que el original
tiene a 2560 no está.

Eso no es necesariamente descalificante —el LEEME del set ya dejó escrito que *«más resolución no es más
fidelidad»*, y una referencia se consume a resolución limitada de todos modos— pero **degradar un ancla es
una decisión de marca, no una decisión técnica**. Queda abierta para el operador.

Tres salidas, si se quiere conservar la resolución:

1. Aceptar 1024×1536 para la vista `manos`, que es referencia y no master.
2. Regenerar el ancla a 2560×3200 desde cero **con** los accesorios declarados — pero ahí vuelve el problema
   del dedo, porque sería generar, no editar.
3. Componer el anillo de forma determinística sobre el original. Requiere arte del anillo, que hoy no existe
   como asset.

## Si se aprueba el reemplazo

```bash
cp ai-generations/2026-09-21_nexa-accesorios/salidas/manos-accesorios-v02.png \
   ai-generations/_identidad-nexa/1-anclas/nexa-ancla-8-manos.png
pnpm foto:assets:lock    # cambia el sha: sin esto, foto:assets:check falla
```

El original queda en el histórico de esta corrida antes de cualquier reemplazo.
