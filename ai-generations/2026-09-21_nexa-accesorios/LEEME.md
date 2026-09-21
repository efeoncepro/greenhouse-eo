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

## 🔴 El costo de la edición: resolución

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
cp ai-generations/2026-09-21_nexa-accesorios/salidas/manos-accesorios-v01.png \
   ai-generations/_identidad-nexa/1-anclas/nexa-ancla-8-manos.png
pnpm foto:assets:lock    # cambia el sha: sin esto, foto:assets:check falla
```

El original queda en el histórico de esta corrida antes de cualquier reemplazo.
