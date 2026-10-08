# ADR — Efeonce Rooms: su marca

- **Status:** Accepted (2026-10-08)
- **Date:** 2026-10-08
- **Owner:** Efeonce Brand
- **Scope:** la marca visual de [Efeonce Rooms](README.md) (logo, lockups, símbolo e ícono). No decide producto,
  infraestructura, publicación ni el go de [EPIC-052](../../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md);
  tampoco aprueba composiciones de la sala ni aplicaciones de marca (ver Aplicaciones exploradas).
- **Reversibility:** two-way-but-slow. Los archivos se regeneran en minutos; cuando la sala tenga clientes, el cambio tiene
  inercia de marca.
- **Confidence:** high en la forma: el operador la eligió viéndola junto a la ruta canónica y a la familia («Me encanta,
  junto con todas sus aplicaciones»). Medium en distintividad: falta la revisión de parecido (ver Consecuencias).
- **Validated as of:** 2026-10-08, sesión de diseño con el operador (canvas «Efeonce Rooms — Logo»).

## Contexto

El [ADR de producto](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) dejó el logo de Rooms pendiente de diseño dentro
de AXIS y la [dirección visual](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md) pedía no inventarlo
antes. El operador lo pidió «al estilo de Marketing Studio, Creative Studio, Efeonce Factory», con impacto visual. La
regla de la familia es «la órbita vive en la O»; «Rooms» tiene dos.

## Decisión

1. **Ruta B, «Encuentro».** «Rooms» en Poppins Bold, pasado a contornos; las dos «o» son **dos órbitas enlazadas**
   (quien propone y quien decide, en la misma sala) y la **única esfera** de la marca se posa en el cruce de arriba, el
   punto de encuentro, en el acento **Growth** (`#0e8c82` sobre papel, `#36c8bf` sobre oscuro): Rooms sirve a varias
   líneas de servicio, como Factory. En el cruce de abajo la segunda órbita pasa por encima de la primera.
2. **Misma geometría que la familia.** Anillo de 64 unidades, esfera de 88, aire de 22 y terminaciones concéntricas a la
   esfera ([`orbit-ring.mjs`](../../../scripts/brand/orbit-ring.mjs)). Separación de centros = 1,3 × radio medio: el
   cruce de abajo se lee y la esfera queda bajo la altura de mayúsculas. Los cortes se calculan como contornos, nunca
   como máscaras, para que el archivo se vea igual en cualquier visor (una prueba de AXIS lo exige).
3. **Símbolo: las dos órbitas sin letra.** Se lee a 24–32 px y no depende de la R; es favicon, avatar de la sala e ícono.

| Pieza | Archivo (`rooms-*`) | Dónde va |
| --- | --- | --- |
| Lockup **Efeonce \| Rooms** | `lockup` | Por defecto: encabezado de la sala, invitaciones, enlace compartido, decks |
| Compacto **efeonce Rooms** | `compact` | Chips y espacios muy angostos |
| Apilado (Efeonce arriba, Rooms debajo) | `stacked-lockup` | Portadas, modo presentación y formatos cuadrados |
| Símbolo: las dos órbitas enlazadas | `isotype` | Favicon, avatar de la sala, ícono de app; nunca junto al nombre |
| Ícono: la nave de Efeonce sobre «Rooms» liso | `icon` | Sólo lo que circula suelto (una sola esfera: la de la nave) |
| La palabra sola | `logo` | Insumo de las anteriores y piezas de lanzamiento |

Las seis piezas existen en `positive`, `negative` y `white` (18 SVG). Las genera
[`scripts/brand/build-rooms-logos.mjs`](../../../scripts/brand/build-rooms-logos.mjs) y se sellan en
`@efeoncepro/axis-brand-assets` **0.4.27** (commit AXIS `0c3d7ab`, local; el release del paquete requiere push y tag).
Quedan sólo en el paquete, como Creative Studio, hasta que el índice de búsqueda del Lab se fragmente. Nunca se editan a
mano.

## Aplicaciones exploradas

El mismo canvas explora la marca en aplicaciones (enlace compartido, invitación por correo, modo presentación, pestaña
e ícono de app, señalética de sala, lanzamiento y la apertura en movimiento). Son **exploraciones**: no aprueban
composiciones de la sala, que siguen sujetas a los contratos de UI de Rooms y al QA visual tras el go de EPIC-052. Las
piezas del cliente conservan su marca: la de Rooms nunca va encima del arte del cliente.

## Alternativas descartadas

| Ruta | Por qué no |
| --- | --- |
| A · canon: la órbita en la primera «o» | Familia inmediata, pero la segunda «o» queda como letra suelta junto a un anillo fino y se lee desigual |
| Las dos «o» como órbitas separadas con dos esferas | Dos esferas en una pieza contradicen la línea |
| R en órbita como símbolo | Depende de la letra; las dos órbitas son más propias del producto y se leen igual de chicas |
| Acento de una línea (Brand o Engine) | Rooms sirve a propuestas creativas y SEO/AEO, a veces en la misma sala |

## Consecuencias

- **Positivas:** Rooms entra a la fila de productos (Marketing Studio, Creative Studio, Factory) con el mismo anillo, esfera
  y gris, y su símbolo dice «encuentro» sin texto.
- **Riesgo conocido:** dos anillos enlazados son una figura común en marcas. Antes de pauta o registro, revisar parecido
  con marcas de círculos entrelazados en las clases relevantes (pendiente, owner Efeonce Brand).
- **Pendiente:** release de `@efeoncepro/axis-brand-assets` 0.4.27 (push + tag en AXIS) y que Greenhouse/Rooms lo
  consuman; las composiciones de la sala siguen pendientes del go de EPIC-052.
