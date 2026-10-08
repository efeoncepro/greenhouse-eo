# ADR — Efeonce Rooms: su marca

- **Status:** Accepted (2026-10-08)
- **Date:** 2026-10-08
- **Owner:** Efeonce Brand
- **Scope:** la marca visual de [Efeonce Rooms](README.md) (logo, lockups, símbolo e ícono). No decide producto,
  infraestructura, publicación ni el go de [EPIC-052](../../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md);
  tampoco aprueba composiciones de la sala ni aplicaciones de marca (ver Aplicaciones exploradas).
- **Reversibility:** two-way-but-slow. Los archivos se regeneran en minutos; cuando la sala tenga clientes, el cambio tiene
  inercia de marca.
- **Confidence:** high en la forma: el operador la eligió viéndola junto a la ruta canónica, la familia, tres variantes de
  riesgo y seis refinamientos. Medium en distintividad y lectura: faltan la prueba sin contexto y la revisión de parecido
  (ver Consecuencias).
- **Validated as of:** 2026-10-08, sesión de diseño con el operador (canvas «Efeonce Rooms — Logo», páginas «Logo»,
  «Aplicaciones» y «Variantes del símbolo»).

## Contexto

El [ADR de producto](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) dejó el logo de Rooms pendiente de diseño dentro
de AXIS y la [dirección visual](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md) pedía no inventarlo
antes. El operador lo pidió «al estilo de Marketing Studio, Creative Studio, Efeonce Factory», con impacto visual. La
regla de la familia es «la órbita vive en la O»; «Rooms» tiene dos.

## Decisión

1. **«Eslabón leve».** «Rooms» en Poppins Bold, pasado a contornos; las dos «o» son **dos órbitas enlazadas como
   eslabones** (quien propone y quien decide, en la misma sala): arriba la segunda pasa por encima de la primera y abajo
   la primera por encima de la segunda. Los centros están a **1,6 × el radio medio**, así el cruce es corto, la almendra
   central queda angosta y vacía, y la palabra sigue leyéndose «oo».
2. **La esfera a la 1:30 de la segunda órbita, nunca en un cruce.** Es la posición de toda la familia, en el acento
   **Growth** (`#0e8c82` sobre papel, `#36c8bf` sobre oscuro): Rooms sirve a varias líneas, como Factory. La primera
   versión aprobada ponía la esfera en el cruce de arriba («el punto de encuentro»); el operador advirtió que una esfera
   en la punta de la almendra que forman dos círculos se lee, sin contexto, como una figura anatómica propia de la
   publicidad íntima femenina, y se descartó el mismo día, antes de publicar el paquete.
3. **Misma geometría que la familia.** Anillo de 64 unidades, esfera de 88, aire de 22 y terminaciones concéntricas a la
   esfera. Los cortes se calculan como contornos, nunca como máscaras, para que el archivo se vea igual en cualquier visor
   (una prueba de AXIS lo exige). El cruce se invierte (arriba la segunda) para que ningún corte caiga junto a la esfera.
4. **Símbolo: las dos órbitas sin letra.** Favicon, avatar de la sala e ícono; nunca la R en órbita, que se lee como ®.

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
`@efeoncepro/axis-brand-assets` **0.4.27** (commits AXIS `0c3d7ab` y `046f494`, locales; el release del paquete requiere
push y tag).
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
| Esfera en el cruce de arriba («Encuentro», 1,3) | Aprobada primero y descartada el mismo día: la esfera en la punta de la almendra se lee como figura anatómica |
| Cruce angosto con la esfera en el cruce | Baja el riesgo pero lo conserva; la silueta se parece a «CO» |
| R en órbita como símbolo | Se lee como ®, el símbolo de marca registrada |
| Superposición plana, sin entrelazar | Reaparece la almendra al centro, aunque vacía |
| Escalón (la segunda órbita más alta) | Gana movimiento en el símbolo, pero en la palabra la «o» flota sobre la línea |
| Órbitas que sólo se tocan (2,0) | La más neutra, pero genérica: anteojos, binoculares, un ∞; se pierde el enlace |
| Eslabón profundo (1,0) o a 1,3 | Más denso; a 16 px se empasta |
| Las dos «o» como órbitas separadas con dos esferas | Dos esferas en una pieza contradicen la línea |
| Acento de una línea (Brand o Engine) | Rooms sirve a propuestas creativas y SEO/AEO, a veces en la misma sala |

## Consecuencias

- **Positivas:** Rooms entra a la fila de productos (Marketing Studio, Creative Studio, Factory) con el mismo anillo, esfera
  y gris, y su símbolo dice «enlace» sin texto.
- **Riesgo conocido:** dos anillos enlazados son una figura común (argollas, eslabones, marcas de círculos entrelazados).
  Antes de pauta o registro: prueba sin contexto del símbolo con 5–8 personas («¿qué ves?», la tarjeta está en el canvas)
  y revisión de parecido en las clases relevantes (pendiente, owner Efeonce Brand).
- **Regla para cualquier versión futura:** la esfera nunca va en un cruce de las órbitas.
- **Pendiente:** release de `@efeoncepro/axis-brand-assets` 0.4.27 (push + tag en AXIS) y que Greenhouse/Rooms lo
  consuman; las composiciones de la sala siguen pendientes del go de EPIC-052.
