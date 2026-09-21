# Nexa — set de ángulos derivados, 2026-09-21

Los seis ángulos que las referencias frontales de Nexa no cubrían, y que eran la causa medida de que su
rostro derivara en cada generación: sin referencia del ángulo, el modelo reconstruye la cara. Julio tenía
seis desde el 2026-09-20; Nexa tenía cero.

Motor `gpt-image-2.5-sunburst` `high` 1024×1024, **edición** (`--image`) desde
`ai-generations/2026-09-17_nexa-logo-estudio/refs/nexa-avatar-34-v2.png`. Gasto: 9 imágenes ≈ USD 0,50 de salida (una v01 descartada, las seis v02 de cabeza y hombros, y dos de cuerpo entero a 1536×2304).
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

## Segunda tanda: cuerpo entero y el cupo de dos personas

El set de cabeza y hombros dejaba una pregunta abierta: ¿hace falta cuerpo entero por ángulo? Medido, la
respuesta fue **casi no**, y el hueco real estaba en otro sitio.

**Lo que NO hacía falta.** El cuerpo no es lo que deriva. P2 —Nexa agachada en la góndola, postura
compleja— salió bien partiendo de una sola referencia de cuerpo, y esa referencia es de ella de pie y de
frente: el modelo extrapola la postura. Lo que no extrapola es el rostro, que es donde ya están los seis
ángulos.

**Lo que sí hacía falta, y no era una pose.** Con DOS personas en cuadro el cupo baja a dos referencias
por cabeza y se tomaban las dos primeras de la lista. Las dos primeras de Julio son **ambas de rostro**
(`ap-04` y `ap-08`; la de cuerpo es `ap-11`), así que se quedaba sin cuerpo entero — siempre. Y en Nexa la
de cuerpo se caía en cuanto se pedía una vista. O sea: en piezas de dos personas a cuerpo entero el modelo
estaba inventando las dos siluetas, en silencio, porque la pieza sale igual.

Arreglado declarando qué referencia lleva el cuerpo (`cuerpo:`) y garantizando que viaje siempre que
quepa, sustituyendo la última —la menos decisiva, porque la vista va primera y manda—. Con la otra cara de
la regla: si la vista pedida **ya** es de cuerpo entero, no se añade el cuerpo frontal, o la toma quedaría
con dos cuerpos y ningún rostro cercano. Cubierto por cuatro tests, verificados desactivando el arreglo:
dos de ellos fallan sin él.

**Las dos vistas de cuerpo que sí se produjeron:** `cuerpo-perfil-izq` y `cuerpo-espalda`. Son las siluetas
que ninguna referencia cubría —todos los cuerpos enteros que existen son frontales— y las que más cambian
la proporción percibida en una serie. Generadas a **1536×2304**, no a 1024: a página entera el rostro cae a
~120 px y el modelo lo rellena, que es la regla 3 del canon aplicada al cuerpo.

## Por qué no se cablearon más referencias de la carpeta

La carpeta `01. Material/01. Avatar/` tiene 58 archivos, pero para **ancla de identidad** casi ninguno
sirve, y conviene dejarlo escrito para que nadie lo reintente:

- Los 4 retratos grandes del 2026-03-27 son **ambiguos**: cejas gruesas como A, pero sin el delineado del
  párpado que define a A. No se clasifican con confianza en ninguna de las dos, así que no entran.
- El turnaround del mismo día y las 24 poses y 23 de vestuario son **identidad B**.
- La sesión de estudio con blazer naranja es A y tiene cuerpos enteros limpios sobre fondo blanco, pero
  **todos frontales** —el ángulo que ya está cubierto— y el naranja es acento de marca en bloque grande:
  como referencia arrastra color igual que el navy.

El set de referencia se mantiene estrecho y verificable a propósito: tres referencias de la serie Avatar
más las ocho vistas derivadas, todas ancladas al mismo retrato cercano.

## Lo que sigue

- El turnaround `hf_20260327_182342` (3072×5504, grilla 3×3) tiene 9 vistas **de la identidad B**, incluido
  un macro de rostro y una cabeza inclinada hacia abajo. No sirve de ancla de rostro con A canónica, pero
  es el mejor banco de **poses** que existe.
- La biblioteca catalogada de Nexa **no tiene una sola hoja de expresiones**: las 24 poses son planos
  enteros donde la cabeza ocupa ~16% del alto, y 8 de esos 24 archivos repiten el mismo registro de media
  sonrisa. Con la identidad ya resuelta, ése es el hueco siguiente.
