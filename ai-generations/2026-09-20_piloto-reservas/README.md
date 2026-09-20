# Piloto de reservas nuevas — 2026-09-20

Prueba de los dos bloques de prompt nuevos (`SELECTION TARGET` y `MARGIN FIELD`) antes de gastar en una tanda
grande. Tres plates, USD 0,142, `gpt-image-2.5-flare` a `quality high`.

- **Canon de la toma:** [`EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md`](../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)
- **Bloques:** [`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](../../docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) §3.8.1 y §3.8.2
- **Arnés:** `ai-generations/2026-09-19_capa-grafica-foto/scripts/validar-reservas.mjs` (sesión de capa gráfica)
- **Espejo OneDrive:** `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/referencias/11-piloto-reservas-2026-09-20/`

## Las tres imágenes

| Archivo | Qué prueba | Toma | Formato | Resultado |
|---|---|---|---|---|
| `P1-selection-target-45-plate.png` | Bloque **SELECTION TARGET**: objeto aislado con campo oscuro en los cuatro lados | Picado 60° sobre mesa **ink-blue oscura** (variante de la toma 19 del catálogo, con la mesa oscura en vez de mesa de luz clara) | 4:5 · 1152×1440 | **Sirve, con padding.** Ver §Hallazgo |
| `P2-margin-field-45-plate.png` | Bloque **MARGIN FIELD**: banda vertical de tono parejo al margen izquierdo | Marco en marco desde pasillo oscuro (toma 12) | 4:5 · 1152×1440 | **Pasa: banda continua hasta 0,60 del alto** |
| `P3-margin-field-169-plate.png` | El mismo bloque en **16:9 nativo** + el fix del lecho por formato (16%) | Noche, colorista en sala de edición (toma 15) | 16:9 · 2048×1152 | **Pasa: 0,60 · lecho 16% correcto** |

Los prompts exactos están en `rondas/p1/batch-45.json` y `rondas/p1/batch-169.json` (versionados, espejados en
OneDrive). Las imágenes son locales y están gitignoreadas: **la copia compartible es la de OneDrive**.

## Cómo se eligieron las tomas

Las tres tienen **lecho naturalmente oscuro** (mesa ink-blue, consola de pasillo, borde de consola de edición). Eso
evita a propósito el [conflicto abierto perímetro-oscuro vs lecho-claro](../../docs/operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md)
(§3.1), que sigue **pendiente de decisión del operador** y que sólo afecta a las tomas 11, 13, 17, 18 y 19 con su
lecho claro original.

## Medición (arnés de la sesión de capa gráfica)

| Reserva | P1 | P2 | P3 |
|---|---|---|---|
| 1 · zona de texto | 0,00 ✗ | 0,00 ✗ | 0,16 ✗ |
| 2 · objeto para enmarcar | ver §Hallazgo | no pedida | no pedida |
| 3 · lecho de la firma | 17,69:1 · nitidez 0,0002 ✓ | 5,88:1 · 0,0008 ✓ | 19,21:1 · 0,0002 ✓ (16%) |
| 4 · aire para cursores | ✓ | ✓ | ✓ |
| 5 · campo profundo al margen | 0,00 ✗ | **0,60 ✓** | **0,60 ✓** |

El ✗ de la reserva 1 **no es un fallo del plate**: ninguno de los tres pidió zona de texto. El arnés la marca como
fallida en vez de «no pedida», a diferencia de lo que hace con la reserva 2 (muestra `—`). Reportado a la sesión de
capa gráfica.

## Hallazgo: el trazo necesita padding, y hay punto dulce

La reserva 2 medida **pegada al borde del objeto falla (peor lado 1,02:1)**, pero eso es un supuesto del arnés, no
un defecto del plate: la caja AXIS se dibuja con `padding`, no lamiendo el objeto. Medido sobre P1 moviendo el
perímetro:

| Padding (fracción del lienzo) | Peor lado | Pasa (≥3:1) |
|---|---|---|
| 0,00 | 1,02 | ✗ |
| **0,02** | **3,29** | **✓** |
| 0,04 | 2,83 | ✗ |

Dos cosas que esto enseña **[medido]**:

1. **Con 0,00 falla porque el objeto trae su propio borde claro.** El proof impreso tiene margen blanco de papel; el
   trazo `#a6cdf5` cae mitad sobre ese blanco. El bloque `SELECTION TARGET` garantiza campo oscuro **alrededor** del
   objeto pero no dice nada del **borde propio del objeto**. Falta esa cláusula, o se elige un objeto a sangre.
2. **Con 0,04 vuelve a fallar** porque la caja crece hasta tocar la manga naranja y las manos. Hay un **punto dulce**,
   no una monotonía: más aire no es siempre mejor.

Pendiente de la sesión de capa gráfica: si el padding es parte del contrato de la caja, el arnés debe medir el
perímetro **de la caja**, no el del objeto.

## Errores propios de esta corrida

- En P1 arrastré «All heads and hands stay BELOW 36% of the frame height», que es la regla de la **zona de texto
  superior** y no aplica a una toma con `SELECTION TARGET`. El modelo la ignoró parcialmente (manos en el tercio
  superior) y no afectó el resultado, pero es copy-paste sin pensar.
- Volvió a aparecer la **taza** en P1 y P3: el sesgo de props del modelo sigue vivo. Si estorba, nombrarla en el
  negativo.
