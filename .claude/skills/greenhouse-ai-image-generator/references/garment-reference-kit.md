# Kit de referencia de prenda: vestir a alguien con ropa de marca sin que el modelo la invente

Mismo contrato que el [kit 3D del logo](logo-3d-reference-kit.md): **la referencia fija la prenda, el prompt fija la
persona y la escena**. Sin la vista correcta el modelo inventa la espalda, la capucha, el puño y la caída, y cada
pieza queda con un hoodie distinto.

Caso ejecutado: [`ai-generations/2026-09-17_hoodie-efeonce/LEEME.md`](../../../../ai-generations/2026-09-17_hoodie-efeonce/LEEME.md)
(hoodie Efeonce, 21 vistas, aprobado 2026-09-17). Entrega en OneDrive `5. Contenidos/13- Branding/Hoodie Efeonce/v01/`.
Pendientes por el mismo método: **polera** y **chaqueta**, que se diseñan desde cero (§8).

## Cuándo usarlo

- Hay que **vestir a Nexa o a una persona** con ropa de marca en una imagen generada.
- Hay que producir **merch** o mostrar una prenda como asset de marca (catálogo, deck, propuesta, redes).
- La prenda debe verse **igual en todas las piezas** de una campaña.

No es para: firmar una pieza (eso es AXIS con el SVG oficial), ni para el logo como objeto físico
([kit 3D del logo](logo-3d-reference-kit.md)), ni para la nave suelta
([biblioteca del isotipo](mascot-3d-pose-library.md#isotipo-propio-en-3d-con-dos-colores-caso-nave-de-efeonce)).

## 1. Definir la prenda base ANTES de las vistas

El kit sólo es consistente si existe **una** prenda y todas las vistas la copian. Cerrar y escribir estos siete
puntos antes de generar nada — son el bloque «imagen 1 es la prenda oficial» que después se repite verbatim:

1. **Silueta y corte:** tipo de prenda, calce (relajado unisex, entallado), largo, cuello, capucha (simple o doble
   capa), bolsillo, puños y ruedo (acanalados, rectos), cierre o sin cierre.
2. **Tela y peso:** fleece pesado, jersey liviano, softshell; cómo cae y cómo se arruga.
3. **Color de tela**, con el hex o el asset del que sale, y qué mide el QA (§6).
4. **Emblema:** cuál (isotipo o logo completo), dónde (pecho izquierdo), de qué tamaño y en qué tinta.
5. **Estampa de texto:** si la lleva, dónde, qué dice y a qué porcentaje del ancho de esa zona (§3).
6. **Herrajes y detalles:** cordones planos tono sobre tono, puntas sin metal, sin cierres, sin etiquetas visibles.
7. **Variantes de color** que entran al kit y qué cambia en cada una (en el hoodie: blanco hueso y gris jaspeado,
   con la tinta en navy `#023c70` en vez de blanca).

**De dónde sale la prenda base.** El hoodie partió de un **asset oficial ya existente** del sitio público
(`ai-generations/2026-09-17_kv-tu-ia-no-conoce/refs/efeonce-hoodie.png`), que fue la imagen 1 de todas las vistas.
Cuando no existe ese asset —polera y chaqueta— hay que **parirlo primero** (§8): una prenda base aprobada por el
operador, y recién entonces la serie.

## 2. Las vistas del kit

Cuatro familias. El hoodie llevó 21 vistas; una prenda más simple puede llevar menos, pero **ninguna familia se
salta**: la familia que falte es la que el modelo va a inventar.

| Familia | Vistas del hoodie | Para qué |
|---|---|---|
| **Prenda sola** (maniquí invisible) | frente · espalda con estampa · tres cuartos izq · tres cuartos der · lateral · capucha puesta · doblada · en percha | referencia por ángulo de toma; la base del kit |
| **Planos cenitales** (flat lay) | frente · espalda | mockups, catálogo, composiciones planas |
| **Detalles** (macro) | emblema del pecho · puño y cordón · interior de la capucha · cuello por dentro | primeros planos y cualquier toma donde la textura mande |
| **Puesta en cuerpo neutro** | frente · espalda · segundo cuerpo con otra contextura y otro tono de piel | cómo cae en un cuerpo real; es la que se pasa junto con las referencias de la persona |
| **Variantes de color** | blanco hueso frente y espalda · gris jaspeado frente y espalda | la misma construcción en otra tela |

**Las vistas puestas van sin rostro** (recorte del mentón al medio muslo) y con **cuerpos y tonos de piel
distintos**, para que la referencia no empuje siempre al mismo modelo.

**Regla de uso, la que más se olvida:** elegir la vista por el **ángulo de la toma**, no por costumbre. Si el sujeto
se ve de espaldas, la referencia es la espalda. Se pasa junto con las referencias de rostro y cuerpo de la persona.

## 3. El texto de la prenda se compone, no se genera

Ningún texto de marca se le pide al modelo. La estampa se arma **determinísticamente** y entra como **imagen 2**; el
modelo sólo la apoya sobre la tela y la deforma con los pliegues.

En el hoodie: `estampa-espalda.mjs` compone `public/branding/logo-negative.svg` + el eslogan «Empower your Growth»
con los tres pesos del contrato de marca de `src/config/efeonce-brand.ts` — *Empower* Poppins ExtraBold itálica,
*your* ExtraBold, *Growth* Black itálica — centrado respecto al logo y claramente más chico. Salen dos archivos: el
transparente y uno aplanado sobre el navy, para revisar el contraste antes de gastar.

En el prompt de esa vista, la instrucción es «reproduce la imagen 2 EXACTAMENTE, mismo lockup, misma ortografía,
mismas proporciones, misma tinta», más la ubicación y el porcentaje. Nunca se escribe el texto en el prompt como
única fuente.

⚠️ **Trampa de librsvg:** el eslogan partido en `<tspan>` **pierde los espacios**. Usar espacios duros (` `) y
`xml:space="preserve"`, y mirar el PNG antes de usarlo.

## 4. Proporciones declaradas (el modelo las mueve si no se fijan)

- **Emblema del pecho:** mismo tamaño y posición que el asset oficial. **Nunca se reduce** — corrección expresa del
  operador. El bloque base lo dice con todas sus letras: «do not resize or move the chest emblem — it keeps exactly
  the size and position it has in image 1».
- **Estampa de espalda: 38 % del ancho de la espalda.** Al 55 % no se veía realista. El prompt además la califica
  («a discreet, realistic print, not an oversized one») y ancla el borde superior («a hand's width below the hood
  seam»), porque el porcentaje solo no basta.
- Cualquier proporción nueva se **mide y se escribe en el manifiesto**, no se deja al criterio de la corrida.

## 5. Contrato de realismo (verbatim, va en TODOS los prompts)

Sin este bloque la prenda sale con aspecto de render 3D o de mockup plano. Copiar tal cual, en inglés, después del
delta de la vista:

```text
Realism contract — this must look like a REAL photograph of a real garment, not a 3D render or a flat mockup:
shot on a 100 mm lens at f/8, natural soft wrinkles and creases where the fabric falls, slightly asymmetric folds,
visible fleece nap with individual fibres catching the light, tiny lint and a couple of stray fibres, the seams and
topstitching slightly irregular as in real sewing, the ribbing showing its knit rows, micro shadows inside every fold.
Any print is screen-printed plastisol ink sitting ON the fibres: matte, very slightly raised, with a minimally broken
edge where the ink meets the nap, and it deforms with the folds of the fabric instead of floating flat.
No perfect symmetry, no plastic smoothness, no CGI sheen.
```

(`fleece nap` y `ribbing` se cambian por la textura real de la prenda nueva: `jersey knit`, `twill weave`, etc.
El resto no se toca.)

Y el cierre de estudio, también igual en todas:

```text
Product photography for a brand asset library: plain seamless light warm-gray studio background, soft large key light
from the upper left with gentle fill, realistic fabric texture with visible fibres, crisp focus over the whole garment,
soft contact shadow, no props, no people unless described above, nothing cropped, generous margin. No text overlay,
no watermark.
```

**Estructura del prompt de cada vista, en este orden:** bloque base de la prenda (idéntico en las 21) → delta de la
vista (una o dos frases: qué se ve y desde dónde) → contrato de realismo → cierre de estudio. El delta es lo único
que cambia. Guardar un `brief/<id>.prompt.txt` por vista: es lo que permite rehacer la serie sin reconstruirla.

🔴 **Si cambia el contrato, se rehace la serie COMPLETA.** La primera tanda del hoodie se generó antes del contrato
de realismo y no combinaba con el resto: una tanda vieja y una nueva juntas se leen como dos sesiones distintas. No
regenerar sólo la vista nueva.

## 6. QA medido, vista por vista

No basta mirar la grilla. Por cada vista:

1. **Color de tela medido**, no estimado. En el hoodie: entre (10,54,155) y (25,76,186) en las navy, con Δ máximo 38
   en los primeros planos porque la luz cercana lo oscurece. Registrar el rango aceptado en el manifiesto.
2. **Proporción y posición del emblema** contra el asset oficial. Si encogió, se regenera.
3. **Ortografía y lockup de la estampa**, con zoom. La espalda gris **perdió el eslogan** en un intento y la grilla
   no lo delataba.
4. **Una sola fotografía**, no un collage (§7).
5. **Coherencia de serie:** las vistas juntas tienen que leerse como una sesión — misma luz, misma tela, mismo tono
   de fondo.

## 7. Qué no se recorta, y otras trampas

- **Se recortan** (transparente además del fondo estudio): prenda sola y planos cenitales — 14 de las 21 vistas.
- **No se recortan:** los primeros planos y las vistas puestas. El macro desenfocado y el cuerpo con piel no
  sobreviven al recorte; se entregan como escena.
- ⚠️ Un pedido de «detalle de puño y cordón» devolvió un **collage de dos paneles**. Exigir en el prompt «ONE single
  close-up photograph (not a collage, not a split image)».
- ⚠️ Las variantes de color se piden como «SAME construction but in \<tela\>», declarando qué cambia en la tinta y
  cerrando con «everything else identical». Si no, cambia también el corte.

## 8. Prenda nueva que se diseña desde cero (polera, chaqueta)

Cuando **no existe** asset oficial de la prenda, el kit tiene un paso 0 que el hoodie no tuvo:

1. **Definir la prenda base según marca** (los siete puntos de §1) y escribirlos antes de generar. Decidir con
   `efeonce-brand-studio` lo que sea decisión de marca: qué emblema, dónde, en qué tinta, qué variantes existen.
2. **Generar 2–3 direcciones de la prenda base sola**, frente, con el contrato de realismo ya puesto, y **llevarlas
   al operador**. Ésta es la única aprobación que bloquea: todo lo demás se copia de aquí.
3. **Congelar la aprobada como imagen 1** de toda la serie y escribir su bloque base verbatim.
4. **Componer la estampa** con el script determinístico (§3) si la prenda lleva texto.
5. **Recién entonces generar las vistas** (§2), todas con el mismo bloque base + el delta de cada una.
6. **QA (§6), recorte selectivo (§7), manifiesto y entrega (§9).**

No saltarse el paso 2 para «ahorrar»: si la prenda base cambia después, se pierde la serie entera (§5).

## 9. Nomenclatura, manifiesto y entrega

**Nombre de archivo:**

```text
efeonce-<prenda>-<nn>-<id-vista>-<ancho>x<alto>-v01-<fondo-estudio|transparente>.png
# efeonce-hoodie-02-espalda-1600x1600-v01-fondo-estudio.png
```

**Manifiesto** `efeonce-<prenda>-manifiesto.json` junto a las vistas, con:

- `prenda`, `fuente` (de dónde salió la prenda base),
- `invariantes`: tela con el color medido, emblema, estampa, eslogan con su contrato de pesos, construcción,
- `como_usarla`: la regla del ángulo de la toma,
- `vistas[]`: `id`, `descripcion`, **`cuando_usarla`**, archivo con fondo, archivo transparente (si existe),
  `resolucion`.

`cuando_usarla` es lo que hace que la próxima sesión elija bien sin leer esta referencia. No omitirlo.

**Entrega:** OneDrive `5. Contenidos/13- Branding/<Prenda> Efeonce/v01/` según
[`ONEDRIVE_DELIVERY.md`](../../social-media-studio/efeonce/ONEDRIVE_DELIVERY.md).

## 10. Reproducir

```bash
# estampa determinística (si la prenda lleva texto)
node ai-generations/<fecha>_<prenda>-efeonce/estampa-espalda.mjs

# una vista: prenda base como imagen 1, estampa como imagen 2 cuando corresponde
pnpm ai:image --model gpt-image-2.5-sunburst \
  --image ref/<prenda>-base.png [--image ref/estampa-espalda.png] \
  --prompt "$(cat brief/02-espalda.prompt.txt)" --out out/<prenda>-02-espalda.png
```

Modelo `gpt-image-2.5-sunburst`, calidad `xhigh`. Costo medido: **≈ USD 0,14 por vista**; el hoodie tomó **26
generaciones para 21 vistas** contando descartes (≈ USD 3,6). Presupuestar el 25 % de descarte.
