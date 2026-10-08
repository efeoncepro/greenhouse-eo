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
  riesgo y seis refinamientos. Medium en distintividad y lectura: la revisión de parecido por web está hecha (ver
  Revisión de parecido); faltan la prueba sin contexto del símbolo y la búsqueda formal de marca.
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
`@efeoncepro/axis-brand-assets` **0.4.27** (commits AXIS en `main`, empujados: `6e1621b` release, `1dfb95c` eslabón leve,
`f249e82` sin espacios al final de línea). Release `v0.4.27` en curso: verificar el tag antes de darlo por publicado.
Quedan sólo en el paquete, como Creative Studio, hasta que el índice de búsqueda del Lab se fragmente
(`AXIS_LOGO_EXCLUSIONS`). Nunca se editan a mano: regenerar es correr el generador, copiar a
`packages/brand-assets/assets/` y `apps/lab/public/branding/` de AXIS y correr `pnpm seal`. El generador quita los
espacios al final de línea que trae el logo de Efeonce (gate `git diff --check` de AXIS).

## Aplicaciones exploradas

El mismo canvas explora la marca en aplicaciones (enlace compartido, invitación por correo, modo presentación, pestaña
e ícono de app, señalética de sala, lanzamiento y la apertura en movimiento: las dos órbitas se acercan, se enlazan y la
esfera se posa a la 1:30; con movimiento reducido, sólo el cuadro final). Son **exploraciones**: no aprueban
composiciones de la sala, que siguen sujetas a los contratos de UI de Rooms y al QA visual tras el go de EPIC-052, ni una
animación de logo nueva. Las
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
- **Riesgo conocido:** dos anillos enlazados son una figura común (argollas, eslabones, marcas de círculos entrelazados);
  el riesgo mayor está en el nombre (ver Revisión de parecido). Antes de pauta o registro: prueba sin contexto del símbolo
  con 5–8 personas («¿qué ves?», la tarjeta está en el canvas) y búsqueda formal de marca (owner Efeonce Brand).
- **Reglas para cualquier versión futura, y para toda la línea:** la esfera nunca va en un cruce de las órbitas; una letra
  dentro de una órbita no puede ser R (se lee ®); dos círculos que sólo se tocan, sin enlazar, se leen como anteojos o ∞.
- **Pendiente:** verificar el tag `v0.4.27` de `@efeoncepro/axis-brand-assets` y que Greenhouse/Rooms lo consuman; la
  prueba sin contexto; la búsqueda formal de marca. Las composiciones de la sala siguen pendientes del go de EPIC-052.

## Revisión de parecido (2026-10-08)

Búsqueda web hecha el mismo día. **No es asesoría legal** ni sustituye una búsqueda formal de marca.

- **Logotipo:** no se encontró parecido con marcas conocidas (Audi, aros olímpicos, Mastercard) ni con proveedores de salas
  de venta digitales. Dos aros enlazados es un gesto común (stock, Radius en cripto): el símbolo solo es poco distintivo;
  la esfera Growth y la palabra lo diferencian.
- **Lecturas no deseadas del símbolo solo:** argollas de matrimonio con piedra (medio); el ícono de «enlace» 🔗 de las
  interfaces (medio); ⚣, el doble signo de Marte, porque la esfera a la 1:30 coincide con la flecha (bajo a medio, a
  tamaños chicos). Esposas, cadena, infinito, anteojos u «OO/CO»: bajo.
- **Nombre (el riesgo real):** «room/rooms» es casi genérico en la categoría (Aligned «Rooms», Arrows «Sales Rooms», DealHub
  DealRoom, GetAccept «Deal Room», Dock «sales rooms»). Antecedentes en EE.UU.: ZOOM ROOMS / ZOOMROOMS (Zoom,
  conferencias); ROOMS, serie 98150902 (clases 9 y 42, software de escenas 3D; Rooms de Things Inc, titular sin
  confirmar); y un ROOMS de 1993 en clase 9 (74284081, estado incierto). Chile (INAPI): no verificable por web.

**Recomendaciones:**

1. Búsqueda formal en INAPI y en las oficinas de los mercados de venta, clases 9, 35 y 42. Solicitar **«EFEONCE ROOMS»
   mixta** (palabra + diseño), no «ROOMS» solo. Revisar 98150902 y 74284081 en TSDR antes de cualquier presentación en
   EE.UU.
2. Usar siempre la firma **Efeonce | Rooms**; nunca «Rooms» suelto en publicidad.
3. Prueba sin contexto del símbolo a 16–32 px, en claro y oscuro, frente a 🔗, ⚣ y argollas de boda. Si confunde, el
   símbolo se muestra siempre junto a la palabra. **Nunca** mover la esfera a un cruce para diferenciarlo (regla 2 de la
   Decisión).
