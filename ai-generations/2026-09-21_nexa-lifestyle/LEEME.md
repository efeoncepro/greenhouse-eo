# Lifestyle / Exterior urbano — el quinto contexto, y por qué no estaba (2026-09-21)

Cuatro referencias de vestuario para el contexto 5 del Character Bible §5.3, producidas por el camino
canónico y con la identidad tomada del catálogo, no escrita a mano. Motor `gpt-image-2.5-sunburst`,
`high`, 1024×1536. **USD 0,164 las cuatro** (≈ 0,041 c/u). Las imágenes están gitignoreadas; lo versionado
son los prompts verbatim y este registro.

## Por qué faltaba **[medido]**

🔴 **No fue descuido: el método no aplicaba.** Los otros cuatro contextos de `4-vestuario/` se produjeron
**injertando el rostro de la identidad canónica sobre material de la identidad B**. Las 6 imágenes de B del
contexto Lifestyle **llevan gafas de sol**, y el LEEME del set ya lo había medido: *«de las 23 de vestuario,
6 llevan gafas de sol: ahí no hay cara que injertar»*.

Y las gafas no son un defecto del material: **§5.3 las pide** — *«lentes de sol cat-eye sutil en acetato
navy oscuro, sólo en exteriores»*. O sea que el material fuente es **correcto en outfit e inservible como
referencia de identidad**, porque tapa justo donde vive la identidad.

Por eso estas cuatro se **generaron desde las anclas fotográficas** en vez de injertarse. Consecuencia
favorable: **son las únicas cuatro de `4-vestuario/` que NO arrastran la deuda de acabado sintético.**

**`lifestyle-1` y `lifestyle-3` van sin gafas a propósito**, para que el contexto tenga referencia de
identidad y no sólo de outfit.

## Las cuatro

| Salida | Outfit (§5.3 c5) | Gafas | Nota |
|---|---|---|---|
| `lifestyle-1-piloto` | Trench beige sobre blusa crema y pantalón navy, crossbody negro | no | Piloto. Se miró al 100 % antes de generar las otras tres |
| `lifestyle-2` | Chaqueta de cuero navy sobre blusa fluida, pantalón negro, crossbody cognac | cat-eye navy | |
| `lifestyle-3` | Trench beige sobre total negro, **pañuelo naranja** como único acento | no | El acento va solo, nunca dos juntos (§5.2) |
| `lifestyle-4` | Chaqueta de cuero navy, blusa crema, pantalón navy, rooftop | en la cabeza | Skyline fuera de foco |

Las cuatro con **Golden Nexa** (§9.2): sol bajo y direccional, sombras largas y suaves, nunca mediodía.
Las cuatro son de cuerpo entero y están declaradas en `vestuarioDeCuerpo`.

## Delta 2026-09-21 — las cuatro pasan a SMARTWATCH

Se generaron con el bloque de accesorios anterior, que pedía un reloj analógico. Tras la decisión del
operador —*«Nexa es tecnológica»*, [props tecnológicos](../../docs/operations/brand-photography/NEXA_TECH_PROPS_V1.md)—
las cuatro se **editaron** para llevar smartwatch, y de paso se corrigió el dedo del anillo al índice.

**Editar y no regenerar, por dos razones:** «editar conserva, generar reconstruye», y porque el dedo sólo se
gana editando. **Sin padear**, porque estas cuatro ya son **1024×1536 = 2:3**, que es un tamaño nativo del
modelo: el problema del reencuadre sólo aparece cuando el ratio del original no coincide con el `--size`.

Verificado con la misma grilla de veinteavos: **mentón, hombros, cintura y pies caen en las mismas líneas
que el original.** Sin reencuadre, como estaba previsto. Y el smartwatch al 100 %: caja rectangular
redondeada, pantalla y correa navy tejida.

USD 0,164 las cuatro ediciones. Los originales quedan en esta carpeta como `lifestyle-*.png`; lo que entró
al set son los `-smartwatch`.

## 🔴 El hallazgo: el DEDO del anillo no se sostiene por prompt **[medido]**

El bloque `accesorios` del catálogo pide, literal: *«a geometric matte-silver statement ring on the INDEX
finger of her right hand — **not a plain band, not gold, not on another finger**»*. Es tan explícito como se
puede escribir.

**El piloto lo puso en el dedo MEDIO.** Verificado ampliando la franja de manos al 100 %.

Lo que sí corrigió el bloque, medido contra la auditoría previa:

| Atributo | Antes (7 imágenes) | En el piloto |
|---|---|---|
| Aretes | **dorados en 5 de 5** | **plata** ✓ |
| Reloj | presente en 1 de 5 | presente, correa navy ✓ |
| Anillo, metal y forma | dorado, banda fina | **plata mate, geométrico** ✓ |
| Anillo, **dedo** | medio o anular en 5 de 5 | **medio** ✗ |

**Tres de los cuatro atributos del anillo se ganaron por texto; el dedo no.** Esto pone al anillo en la misma
clase que el emblema bordado: **lo sensible no se genera**. Las salidas posibles son las mismas de siempre —
que no se lea, componerlo después, o editarlo con máscara— más una cuarta que es decisión de marca: aceptar
el dedo que salga y bajar esa precisión de §5.1.

**Cerrado el mismo día:** el dedo **se gana editando**. Se comprobó en el ancla de manos y se aplicó a estas
cuatro en la misma pasada del smartwatch. La regla operativa que queda: **el dedo no se pide, se hereda** —
si la referencia que se antepone lo lleva bien, la pieza lo hereda; pedirlo por texto en una generación
desde cero da metal y forma correctos y el dedo equivocado.

## Reproducir

```bash
pnpm foto:doctor      # seis chequeos, sin costo
pnpm ai:image --prompt-file prompts/lifestyle-1.prompt.txt \
  --image ai-generations/_identidad-nexa/1-anclas/nexa-ancla-5-cuerpo-frontal.png \
  --image ai-generations/_identidad-nexa/1-anclas/nexa-ancla-2-rostro-tresquartos.png \
  --model gpt-image-2.5-sunburst --quality high --size 1024x1536 --out salidas/lifestyle-1.png
```

Los prompts se armaron tomando `identity` y `accesorios` del catálogo
([`build-prompt.mjs`](../../scripts/foto/build-prompt.mjs)), nunca escribiendo la identidad a mano.

## Nota de tamaño

El resto de `4-vestuario/` está a 1152×2048 y estas cuatro a **1024×1536**, que es un tamaño nativo del
modelo. No afecta su uso como referencia; queda anotado para que nadie lo lea como inconsistencia.
