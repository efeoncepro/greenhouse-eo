# Nexa — set de ángulos derivados, 2026-09-21

Los seis ángulos que las referencias frontales de Nexa no cubrían, y que eran la causa medida de que su
rostro derivara en cada generación: sin referencia del ángulo, el modelo reconstruye la cara. Julio tenía
seis desde el 2026-09-20; Nexa tenía cero.

Motor `gpt-image-2.5-sunburst` `high` 1024×1024, **edición** (`--image`) desde
`ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-avatar-34-v2.png`. Gasto: 7 imágenes ≈ USD 0,37 de salida (una v01 descartada + las seis v02).
Las imágenes están gitignoreadas; lo versionado son los prompts verbatim y este registro.

Entregables en `ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/nexa-*.png`,
declarados como `vistas` en el bloque `nexa` de `scripts/foto/build-prompt.mjs`.

## La identidad, primero

Desde abril conviven **dos rostros distintos** bajo el nombre «Nexa», y el catálogo mezclaba los dos.
Medido por sha256 el 2026-09-21:

| Serie | Identidad | Rasgos |
|---|---|---|
| `01. Material/01. Avatar/Avatar/` (8) · bustos con hoodie (5) · estudio blazer naranja (~20) | **A** | delineado del párpado superior con rabillo, cejas gruesas de arco definido, nariz corta de punta redondeada, labios llenos, óvalo más ancho |
| `Poses y expresiones/` (24) · `Vestuario/` (23) · turnaround `hf_20260327_182342` | **B** | sin delineado, cejas más rectas, nariz más larga con puente alto, labios más finos, óvalo más largo |

`nexa-the-breakdown.png` (3ª referencia del catálogo hasta hoy) es `Poses y expresiones/The
Breakdown/hf_20260409_212045_aff0e…`, o sea **B**. Con 2 referencias en A y 1 en B el modelo promedia; en
el KV «Tu IA no conoce tu negocio» ganó A **por mayoría**, no porque la mezcla no existiera. Eso explica
que el defecto llevara meses latente.

**El operador eligió la serie Avatar (A) como Nexa canónica el 2026-09-21.** `the-breakdown` sale del
catálogo y entra `nexa-avatar-frontal-v2` (= `Avatar Frontal v2.png`), de la misma serie. La serie B sigue
siendo material válido de **pose, vestuario y escenario** — nunca de rostro.

## Las tres reglas heredadas, y qué costaron acá

Vienen del canon (`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`, delta del 2026-09-20). Las tres se
confirmaron:

1. **Editar conserva, generar reconstruye.** Se editó desde el retrato cercano, nunca se generó de cero.
2. **Marcadores verificables, no grados.** «rotated 45 degrees» **no giró la cabeza**: la v01 volvió en el
   mismo ángulo de la referencia, con el fondo y la prenda ya correctos. Lo que la movió fueron dos
   frases: declarar la inversión respecto a la referencia («en la referencia está girada hacia SU
   DERECHA; aquí debe girar al lado OPUESTO») y anclar la dirección al cuadro («su nariz apunta al BORDE
   DERECHO»). A partir de ahí los seis salieron a la primera.
3. **Dale píxeles al rostro.** Se partió del único retrato cercano del set; los planos generales dejan la
   cara en pocos píxeles y el modelo la rellena.

Una cuarta, propia de esta corrida: **el iris salía miel.** «very dark brown, never amber» no alcanzó — la
v01 midió rgb(117,78,61) contra rgb(95,67,53) del mismo ojo en la referencia. Lo que lo bajó fue pedir un
marrón **plano y uniforme, tan oscuro que la pupila apenas se distingue del iris, sin anillo más claro ni
brillo limbal**, y añadir «si dudas, más oscuro, nunca más claro».

## Convención de nombres

El sufijo nombra **hacia dónde gira ella**, no qué lado se ve — leído de las imágenes de Julio, no de sus
prompts (el de perfil se contradice en el texto y sólo el resultado es fiable):

| Vista | Ella gira | La cámara ve | Su nariz apunta |
|---|---|---|---|
| `45-izq` / `perfil-izq` | a su izquierda | el lado **derecho** de su cara | a la **derecha** del cuadro |
| `45-der` / `perfil-der` | a su derecha | el lado **izquierdo** | a la **izquierda** del cuadro |
| `trasero` | 135° a su izquierda | nuca, hombro derecho, un filo de mejilla | fuera de cuadro |
| `espalda` | 180° | sólo nuca y pelo | — |

## QA aplicado

Rostro al 100% de las seis contra la referencia: óvalo, arco de ceja, nariz, labios y **delineado del
párpado** —el rasgo que separa A de B— presentes en todas. Iris revisado ampliado en las cinco con ojo
visible: castaño oscuro uniforme, sin anillo dorado.

Nota de método: **medir el iris por coordenada fija no sirve**. Tres de cinco mediciones cayeron en piel
(rgb ~210,150,120) o en la pupila. El iris se verifica mirándolo ampliado, que además es el criterio con el
que el operador rechazó las pasadas anteriores.

## Lo que sigue

- El turnaround `hf_20260327_182342` (3072×5504, grilla 3×3) tiene 9 vistas **de la identidad B**, incluido
  un macro de rostro y una cabeza inclinada hacia abajo. No sirve de ancla de rostro con A canónica, pero
  es el mejor banco de **poses** que existe.
- La biblioteca catalogada de Nexa **no tiene una sola hoja de expresiones**: las 24 poses son planos
  enteros donde la cabeza ocupa ~16% del alto, y 8 de esos 24 archivos repiten el mismo registro de media
  sonrisa. Con la identidad ya resuelta, ése es el hueco siguiente.
