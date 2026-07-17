# TASK-1410 — Radiografía AEO · Flow Contract

## Meta

- Status: `implemented`
- Owner task: `TASK-1410 — Radiografía AEO`
- Related wireframe: `docs/ui/wireframes/TASK-1410-aeo-article-xray.md`
- Related motion: `docs/ui/motion/TASK-1410-aeo-article-xray-motion.md`
- Surface: repo **`efeonce-think`** (Astro 7) → `think.efeoncepro.com/muestras/<slug>-<token>`
- Arquitectura: `docs/think/radiografia-aeo-architecture.md`

## Por qué esto es un FLOW y no una pantalla

La V1 metía **cinco trabajos en una página**. El síntoma que reportó el operador —*"el artículo se ve plano"*— tenía su causa raíz acá: **el artículo nunca tuvo espacio para ser LEÍDO**, porque el panel de máquina le comía el 46% del ancho. Se le había aplicado densidad de *product UI* a un artefacto **editorial**.

Un flow le da a cada trabajo su pantalla — y **cada pantalla es además una lámina** del deck.

## Los cuatro nodos

| # | Ruta | Trabajo | Acoplamiento |
|---|---|---|---|
| ① | `/muestras/<slug>-<token>` | **El hueco.** El SERP real: quién ocupa hoy ese espacio y por qué el cliente no está. Es la portada y es el golpe. | no |
| ② | `…/articulo` | **El artículo.** Ancho completo, sin panel. **Acá se LEE.** | **no** (deliberado) |
| ③ | `…/radiografia` | **La radiografía.** El split. Funciona porque el evaluador **ya leyó** el artículo: la revelación aterriza en vez de competir. | **sí** |
| ④ | `…/atomizacion` | **Dónde más vive.** Los átomos, cada uno con su **línea de sangre** al bloque que lo parió. | sí (de vuelta al artículo) |

**Gate:** el assert 31 falla si la ② trae acoplamiento (ahí se lee, no se inspecciona) y el 32 si la ③ lo pierde.

## Navegación

- **Riel pegajoso** de 4 pasos, con `aria-current="step"` y ✓ en lo recorrido. **Su trabajo no es navegar: es avisar que el recorrido tiene más pantallas.** Sin él, nadie sabe que existen.
- **"Siguiente" grande** al pie, con la frase que engancha (*"¿Y qué lee una máquina de esto?"*).
- **Cada paso es una URL propia** → el deck enlaza directo. La URL que ya circulaba **sigue viva**: es la portada.
- **Sin JavaScript funciona igual**: son enlaces `<a>`.

## Transiciones

**View Transitions cross-document, CSS puro, cero JS** (`@view-transition { navigation: auto }`).

| Transición | Comportamiento |
|---|---|
| Chrome + riel | **No se animan.** Son el marco estable: si parpadean, el evaluador pierde el punto de referencia |
| **② → ③** | **La que cuenta la historia.** El artículo que acabas de leer **se encoge y se convierte en el espécimen** bajo el instrumento (`view-transition-name: xr-article`) |
| El instrumento | **LLEGA** desde la derecha (`::view-transition-new(xr-inst)`), no aparece |
| Contenido de pantalla | Desplazamiento corto de 10px: **dirección, no espectáculo** |
| `prefers-reduced-motion` | Todas a `none`. **El significado nunca estuvo en el movimiento** |

## Móvil

El instrumento queda a **diez pantallas** del artículo cuando se apila. Sin la **hoja inferior**, tocabas un bloque, se encendía el chip *"↓ 3 datos"*… **y no pasaba nada más**: el argumento central **no existía en un teléfono**. La hoja sube al tocar, con tirador, botón de cierre y **focus return** al bloque que la abrió (assert 30).

## Estados

- **Sin JS:** las 4 pantallas se sirven completas; el par héroe de la ③ viene **pintado desde el HTML**. Se pierde el resaltado sincronizado, **no el contenido**. El *hint* que promete interactividad viene `hidden` y solo aparece con JS (assert 23).
- **Error / loading / empty:** no aplican. Es estático, sin fetch. Un payload incompleto **rompe el build**, no produce un estado vacío.

## Design decision log

- **Descartado: todo en una pantalla.** Ver arriba. Fue la V1 y falló por la razón correcta.
- **Descartado: el artículo con acoplamiento en la ②.** Contamina la lectura. El evaluador tiene que **juzgar el contenido** antes de que le mostremos la maquinaria.
- **Descartado: `<ClientRouter />` de Astro.** Las view transitions cross-document nativas son CSS puro y no hidratan nada. No hay nada que un router JS aporte acá.
- **Descartado: líneas SVG conectoras** entre el artículo y su schema. Exigen geometría en cada scroll/resize, se rompen con el panel scrolleando por dentro, y apiladas no significan nada.
