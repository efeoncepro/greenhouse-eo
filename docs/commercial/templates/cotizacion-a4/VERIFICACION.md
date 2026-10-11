# Revisión de la plantilla · 08/10/2026

Revisión de `vista-previa/`, generado desde `ejemplo.json`. El ejemplo se identifica como «Sin validez comercial». No acredita una nueva oferta enviada.

- PDF final: cuatro páginas A4 verticales, todas rasterizadas e inspeccionadas. Encabezados, pie, folios, tabla, montos y condiciones legibles, sin recortes ni superposiciones.
- Texto extraíble comprobado en los cuatro folios, incluidos neto, IVA, total y equivalente mensual. Fuentes incrustadas y Unicode según `pdffonts`; PDF etiquetado, sin JavaScript.
- HTML móvil a 390 px: inspección visual y `scrollWidth = innerWidth = 390`. Imágenes decodificadas y fuentes cargadas.
- Cuatro pruebas Node PASS: aritmética/IVA, validación de datos/estados, resolución única de slots y escape de texto/mes opcional.
- Prueba de contenido extenso: el generador rechazó el desborde A4 sin crear archivos de salida.
- Reserva mínima del pie: 33,5 px; encabezado interior: 22,3 px. [Manifiesto](vista-previa/manifest.json) y [capturas](vista-previa/qa/).
- Cotización presentada a UTEM: HTML/PDF conservan los SHA-256 previos. Esta plantilla no altera su expediente ni el CRM.
- Paridad de skills, gobierno de contexto/handoff y cierre documental PASS al corte; diff sin errores de espacios.

SHA-256 del ejemplo revisado:

| Archivo | SHA-256 |
| --- | --- |
| `cotizacion.html` | `3b5b943e33bdea1e65fc38549821d1d96a9c643f8ced261025787923d21a430f` |
| `cotizacion.pdf` | `cfccae4b98f4f1b559698d2b91d696bbcc9853cbf36249c84e8e10fdacfd9c66` |

El generador deja futuras revisiones visuales y auditorías de PDF como pendientes: este resultado sólo aplica al ejemplo guardado.

## Extensión multimoneda · 08/10/2026

- Diez pruebas unitarias: precisión ISO (0/2/3 decimales), límite seguro, half-up decimal exacto, pares/fechas/fuentes FX inválidos, impuestos explícitos/desconocidos y regresión CLP.
- Tres ejemplos completos generados: CLP con IVA 19% explícito; PEN nativo con centavos e impuestos pendientes; USD → PEN con snapshot BCRP/SBS venta 06/10. Cada uno produce cuatro páginas A4 y conserva ancho móvil de 390px. QA local: `.captures/cotizacion-a4-multimoneda-2026-10-08-{clp,pen,fx}/`.
- Los doce folios PDF fueron revisados: páginas 1/3 de cada versión y 2/4 comunes por comparación de hashes. Texto extraído y montos verificados; originales CLP de la cotización UTEM/vista previa preservados.
- Pibank PEN: 19 páginas verificadas en el [expediente](../../prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/README.md), anual 272,210.40 neto, alternativa 306,580.40, impuestos pendientes. Datos fuente USD, FX explícito, conciliación de unidades/subtotales/meses y promedios sin doble redondeo.
- Alcance: presentación documental local; no amplía FinanceCurrency, providers, pricing engine, readiness, ni crea registros/aprobaciones o sincronizaciones CRM.

## Versión 2 (varias líneas con precio) · 11/10/2026

Revisión de la versión 2 del contrato de datos y de su paginación. Los renders de esta revisión se generaron en una carpeta de trabajo fuera del repositorio; `vista-previa/` sigue siendo el ejemplo de la versión 1 y no se regeneró.

- **Versión 1 sin cambios.** `template.html` y `template.css` no se tocaron. El HTML de `ejemplo.json`, `ejemplo-pen.json` y `ejemplo-usd-pen.json` conserva su SHA-256 (`623988f8…`, `3bebc250…`, `d5ce5915…`), fijado como prueba permanente. Los `datos.json` de cotizaciones ya generadas con esta plantilla siguen validando. `ejemplo.json` se renderizó de principio a fin tras el cambio: cuatro páginas, mismo HTML.
- **Pruebas.** 25 pruebas Node PASS (21 del generador, 4 de dinero): referencias de la versión 1, sumas e impuesto en unidades menores, impuesto declarado (`taxAmount`) y su tolerancia, cada regla de validación, encabezados de grupo, columna de valor unitario, límites de paginación (una línea, una página exacta, una página más uno, tabla en varias páginas), bloques opcionales, `source` fuera del documento y rechazo de la conversión FX.
- **Ejemplos renderizados y revisados página por página** (capturas del navegador y PDF rasterizado): `ejemplo-lineas.json`, cuatro páginas, con la tabla, los totales y la nota en una sola página de inversión; `ejemplo-lineas-terceros.json`, cinco páginas, con la tabla en la página 3 y totales, calendario de pagos y bloque de costos pagados por el cliente en la 4. PDF A4 etiquetado, sin JavaScript, fuentes incrustadas, texto extraíble con importes y folios `0n / 0N` correctos. Móvil a 390 px sin desborde.
- **Datos emitidos por el puente de Pricing V3.** Los tres documentos de ejemplo del puente validan y se renderizan: dos en cuatro páginas (uno con impuesto declarado) y el del servicio gestionado en cinco. Durante la integración, ese tercero falló en la portada porque su título ocupaba demasiadas líneas: es el límite de la página fija, heredado de la versión 1, y se resolvió acortando el título en su brief.

### Calibración del presupuesto de paginación

`buildHtml` reparte la sección de inversión sin navegador. Mide el texto con las tablas de avance (`hmtx`/`cmap`) de las mismas fuentes que incrusta y suma las alturas de `template-lineas.css`. Valores medidos en Chromium (Playwright 1.59, medios de impresión) el 11/10/2026:

| Magnitud | Valor |
| --- | --- |
| Alto útil de una página interior (inicio del contenido → 6 px sobre el pie) | 882,56 px |
| Presupuesto usado (`FLOW.capacity`) | 870 px: deja 12,56 px de margen y aire sobre el divisor |
| Ancho de texto Poppins, medido / estimado | 0,9994–1,0003 |
| Ancho de texto Bricolage (variable), medido / tabla por defecto | hasta 1,16 en títulos (peso 760) y 1,10 en cifras (peso 600); se usan las cotas 1,18 y 1,11 |
| Conteo de líneas: 15.000 textos aleatorios en diez estilos y anchos | 0 casos por debajo de Chromium; en texto corrido, entre 1 % y 5 % cuentan una línea de más |
| Altura por bloque en los ejemplos (estimada − medida) | entre 0 y 0,45 px |
| Barrido: 300 documentos aleatorios (1 a 40 líneas, tres monedas, bloques opcionales) | 217 compuestos, 687 páginas de inversión: 0 desbordes, 0 páginas subestimadas; aire mínimo sobre el pie 20,4 px; sobrestimación máxima 43,5 px. 83 rechazados por el plan con mensaje (importes de miles de millones o un bloque más alto que una página) |

El presupuesto es conservador: nunca estima menos de lo que mide el navegador, y a veces pasa un bloque a la página siguiente cuando habría cabido por poco. La guarda sigue siendo la comprobación del render: si la estimación quedara corta, el documento falla con «Contenido fuera del A4» y no se escribe ningún archivo.

Hay que recalibrar si cambian `template.css` o `template-lineas.css`, las fuentes de marca, el pie institucional o los tokens de espaciado. La señal está en cada manifiesto: `checks.pagination` guarda `estimatedPx` y `measuredPx` por página de inversión, y `checks.layout[].gapPx` el aire real sobre el pie. Si la medida supera a la estimación, ajustar las alturas del plan (`planPricing`) o `FLOW` en el generador y volver a comprobar los límites con las pruebas.

## Línea bonificada, opciones y posición de los totales · 11/10/2026

Tres cambios en la versión 2: la línea bonificada (`lines[].referenceNet`), el bloque de opciones (`options`) y la regla que mantiene los totales junto a su tabla. Los renders de esta revisión se generaron en una carpeta de trabajo fuera del repositorio.

- **Documentos existentes.** Los estilos nuevos viven en `template-lineas-opciones.css` y sólo se incluyen en el documento que usa una línea bonificada o el bloque de opciones. Medido antes y después del cambio: el HTML de los tres ejemplos de la versión 1 conserva su SHA-256 (`623988f8…`, `3bebc250…`, `d5ce5915…`); el de `ejemplo-lineas.json` (`9cab83ed…`) y `ejemplo-lineas-terceros.json` (`433ee479…`) también, y ambos quedan fijados como prueba permanente. De los tres documentos emitidos por el puente de Pricing V3, dos no cambian (`c29e3688…`, `076891f8…`) y uno cambia a propósito, por la regla de los totales que se describe abajo.
- **Pruebas.** 30 pruebas Node PASS (26 del generador, 4 de dinero). Las cinco nuevas cubren: HTML y estilos sin cambio cuando no se usan las capacidades nuevas; línea bonificada (texto, valor de referencia fuera de los totales, altura de fila, ancho de columna y cada rechazo); bloque de opciones (posición, advertencia fija, unidad, moneda, escape y título por defecto); cada regla de validación de `options`; y la posición de los totales en sus cuatro casos.
- **Ejemplo nuevo.** `ejemplo-lineas-opcionales.json`, cinco páginas: tabla con la línea bonificada, totales y nota en la página 3; bloque de opciones en la 4. Las cinco páginas se revisaron en captura del navegador; PDF A4 de cinco páginas, etiquetado, sin JavaScript, fuentes incrustadas y texto extraíble («Bonificado», «Valor de referencia», importes y unidades de las opciones). A 390 px, sin desborde: la tabla conserva sus columnas y cada opción apila valor y unidad bajo su texto.
- **Validación más estricta.** Todo importe de la versión 2 se comprueba al validar contra la precisión segura de presentación, con el nombre de su campo. Antes, un importe fuera de esa precisión pasaba la validación y fallaba al componer, sin decir cuál era.

### Posición de los totales: qué se midió

En `managed-on-demand-third-party.document.json` (cuatro líneas en dos grupos) los totales pasaban a la página siguiente y dejaban un tercio de la página en blanco bajo la tabla. Medido en Chromium:

| Magnitud | Valor |
| --- | --- |
| Alto útil de la página | 882,56 px |
| Fin de la tabla | 587,47 px (quedan 295,09 px) |
| Totales: separación y tres filas | 22 + 232 = 254 px (terminarían en 841,47 px) |
| Nota tributaria, dos líneas: separación y texto | 14 + 36,27 = 50,27 px (terminaría en 891,74 px) |

Los totales cabían; con su nota, el conjunto se pasaba 9,18 px del alto útil y habría invadido el divisor del pie. No era un exceso de prudencia del presupuesto: tampoco cabía con el alto real. El defecto estaba en tratar los totales y la nota como un bloque indivisible. Ahora, si bajo la tabla caben los totales y no la nota, los totales quedan con la tabla y la nota abre la página siguiente, siempre que el bloque que sigue quepa allí con ella; sin bloque siguiente, o si este no cabe junto a la nota, totales y nota pasan juntos como antes, porque una nota sola en una página es peor que un salto. El presupuesto (`FLOW.capacity`, 870 px) no cambió.

Resultado en ese documento: sigue en cinco páginas; la página 3 lleva tabla y totales (841,47 px medidos, 47,1 px de aire sobre el pie) y la 4 abre con la nota, seguida del calendario de pagos y del bloque de costos pagados por el cliente. Su HTML pasa de `e5f7d04a…` a `aff31c17…`. Ningún otro documento del repositorio cambia.

### Calibración de los bloques nuevos

| Magnitud | Valor |
| --- | --- |
| Página de inversión del ejemplo nuevo (estimada − medida) | 0,14 px en la página 3; 0,12 px en la 4 |
| Rótulo «Valor de referencia» a 8 pt | 101,8 px: cabe en la columna mínima del valor neto (117,5 px útiles) sin ensancharla |
| Importe más ancho probado en la columna de las opciones (USD, en el límite de la precisión segura) | 174,6 px de 197,6 px disponibles |
| Barrido: 300 documentos aleatorios con líneas bonificadas (211) y bloque de opciones (217), tres monedas | 267 compuestos, 770 páginas de inversión: 0 desbordes, 0 páginas subestimadas; aire mínimo sobre el pie 19,0 px; sobrestimación máxima 43,1 px |
| Bloque de opciones (estimado − medido), 217 bloques | entre 0 y 42,3 px; nunca por debajo |
| Filas con línea bonificada (estimado − medido), 595 filas | entre 0 y 21,4 px; nunca por debajo |
| Páginas donde la nota abrió la página siguiente | 24, todas sin desborde |
| Rechazados por el plan | 33, con mensaje: un bloque de opciones más alto que una página |

La sobrestimación viene del conteo de líneas, que es conservador a propósito. Las reglas de recalibración de la sección anterior valen también para `template-lineas-opciones.css`.

## Páginas fijas: comprobación sin navegador · 11/10/2026

Dos veces se versionó un ejemplo cuya portada no cabía: el título pasaba la validación y `buildHtml`, y sólo fallaba en el navegador. Desde esta revisión `buildHtml` estima también la portada, la página de alcance y la de condiciones, en las dos versiones del contrato, y falla con «Contenido fuera del A4» y la causa. La estimación no escribe nada en el HTML: los SHA-256 de la versión 1 (`623988f8…`, `3bebc250…`, `d5ce5915…`) y los fijados de la versión 2 (`9cab83ed…`, `433ee479…`) no cambian.

- **Los dos fallos conocidos se rechazan sin navegador**, en 0,15 s y sin crear la carpeta de salida. Título `["Contenidos y comunidad,", "gestionados de punta", "a punta."]` con la bajada de su documento: Chromium mide 860,91 px y la estimación da 861,00 px, de 802,75 px disponibles. Título `["Atención en redes", "como servicio gestionado,", "con una opción."]`: 829,80 px medidos, 829,89 px estimados. En ambos una entrada no entra en el ancho del título (676,3 px y 696,2 px medidos, de 550 px) y se parte.
- **Ningún documento que hoy se compone se rechaza.** Comprobados en Chromium, con la estimación al lado, los 17 que existen: los seis `ejemplo*.json`, `vista-previa/datos.json`, los cinco `data/pricing/v3-operating/*.document.json` y los cinco `datos.json` de esta plantilla bajo `docs/commercial/prospects/` (cuatro versiones de una cotización de varias líneas y una de precio único con logo). Los 17 se componen; estimación menos medida: 0,06–0,08 px en la portada, 0,13–0,23 px en alcance y 0,02–0,03 px en condiciones, nunca por debajo. Espacio libre estimado mínimo: 34,9 px en la portada (dos documentos del puente, con título de tres líneas y bajada de cuatro), 79,8 px en alcance y 125,1 px en condiciones.
- **Pruebas.** 35 pruebas Node PASS (31 del generador, 4 de dinero). Las cinco nuevas: los dos fallos conocidos, en las dos versiones; todos los documentos versionados de la plantilla y del puente se componen; bloques, capacidades y cada causa de rechazo; el logo del cliente; y las piezas de medición (instancia de la fuente variable contra anchos medidos, líneas sin partir palabras, proporción de imágenes).

### Cómo se estima

| Pieza | Medida |
| --- | --- |
| Alto útil de la portada (sobretítulo y referencia de una línea) | 802,75 px; cada línea de más en la referencia resta 18 px |
| Alto útil de alcance y condiciones | 882,56 px, el de toda página interior. Aquí se usa completo: la estimación no baja de la medida, así que no hace falta el margen de 12,56 px de la sección de inversión |
| Títulos (Bricolage, variable) | Avances exactos de la instancia que usa el navegador: peso 760 (600 en el nombre del cliente) y tamaño óptico igual al tamaño del texto, leídos de `fvar`/`HVAR`. Antes se usaba la tabla por defecto con una cota (1,18): en el título de portada la tabla por defecto queda un 4 % corta y la instancia coincide con Chromium entre 0,994 y 1,000 |
| Holgura de títulos | 1 %, por el kerning que añade el navegador. En 40.000 párrafos: sin holgura, una línea de menos en 1 de cada 1.000; con 0,5 % o con 1 %, en ninguno |
| Holgura de Poppins | 0,1 %. En 76.000 párrafos, ninguno cuenta de menos ni siquiera sin holgura; con el 1 % de la sección de inversión, uno de cada 30 contaba una línea de más, y en una página fija eso es un rechazo |
| Palabras | Estas páginas no usan `overflow-wrap`: una palabra sólo se corta en guiones y barras. El conteo corta donde corta el navegador o menos |
| Filas flexibles (caja de inversión, encabezado del calendario, línea de contacto) | Cota inferior del reparto: cada elemento conserva lo que le dejan los demás sin ceder. Exacta mientras la fila cabe; pesimista, nunca optimista, cuando no |
| Rejillas (oferente y responsable, fases del calendario) | Pistas iguales, salvo que una palabra larga, como un correo, ensanche la suya y estreche las demás |

### Barridos contra Chromium

| Barrido | Resultado |
| --- | --- |
| 1.600 portadas aleatorias (título, bajada, etiqueta, referencia, cliente, resumen, importes y oferente), puestas en el DOM de un documento compuesto | 741 caben y se aceptan; 839 no caben y se rechazan; **0 fallos sin detectar**; 0 estimaciones por debajo de la medida. 20 rechazos de más (1,25 %): 8 por una línea de título que entraba por menos del 1 %, 8 por importes de miles de millones en el mismo margen, 4 por otros textos. El 91 % de las estimaciones coincide con la medida en menos de 0,5 px |
| 500 documentos aleatorios, de las dos versiones, con todas las páginas fijas variadas y un logo en uno de cada siete | 296 compuestos, 888 páginas fijas: 0 fallos sin detectar, 0 por debajo (mínimo −0,01 px). Se aceptaron, y cabían, páginas con 2,2 px de aire real. Coinciden en menos de 0,5 px el 94 % de las portadas, el 86 % de las páginas de alcance y el 95 % de las de condiciones; la mayor sobrestimación, 93,5 px, es la cota de una fila flexible con una nota de calendario de varias líneas |

Lo que queda fuera: la página de inversión de la versión 1, que sólo cubre el render; una portada cuyo logo no declara dimensiones; y el desborde horizontal en la versión 1, que su render tampoco comprueba. Recalibrar si cambian `template.css`, las fuentes de marca, el logo o el pie: `checks.fixedPages` de cada manifiesto guarda estimación y medida, y una medida mayor que la estimación es la señal.


## Encabezado interior, textos opcionales e impuesto por hito · 11/10/2026

Seis cambios en la versión 2: el encabezado de las páginas interiores, `buyer.unit`, `schedule.note` y `paymentSchedule.note` opcionales, `cover.netLabel`, el impuesto y el total de cada hito del calendario de pagos, y `taxPeriods`. La versión 1 no cambia. Los renders de esta revisión se generaron en una carpeta de trabajo fuera del repositorio; `vista-previa/` no se regeneró.

- **Versión 1 sin cambios.** `template.html` y `template.css` no se tocaron. El HTML de `ejemplo.json`, `ejemplo-pen.json` y `ejemplo-usd-pen.json` conserva su SHA-256 (`623988f8…`, `3bebc250…`, `d5ce5915…`), igual que el de `vista-previa/datos.json` y el de la cotización de precio único ya entregada. `ejemplo.json` se renderizó de principio a fin: cuatro páginas.
- **Pruebas.** 40 pruebas Node PASS (36 del generador, 4 de dinero). Las cinco nuevas cubren el encabezado interior (marcado, sin unidad, referencia de una, dos y tres líneas, palabra que no cabe, versión 1 intacta); las claves opcionales, el rechazo de claves mal escritas en `buyer`, `cover` y `schedule`, y su efecto en la estimación de las páginas fijas; la tabla del calendario con impuesto por hito, sus estilos condicionales y su altura estimada; cada regla de validación de `tax` y `total`; y `taxPeriods`.
- **`taxPeriods`.** La tolerancia de `taxAmount` contaba las cantidades de las líneas, así que la misma cotización se aceptaba con sus meses plegados («3 meses») y se rechazaba impresa como un solo precio («1 programa»). Con `taxPeriods` la tolerancia son los periodos tributados que la cotización declara; sin la clave rige la regla anterior, y ningún documento que la omite cambia. La clave no se imprime: el HTML de un documento es el mismo con ella y sin ella.
- **Ejemplo nuevo.** `ejemplo-lineas-proyecto.json`, cuatro páginas: un proyecto de precio fijo en una línea de cantidad 1, sin unidad del cliente ni nota de calendario, con rótulo de portada propio y un calendario de dos pagos con su IVA. Las cuatro páginas se revisaron en captura del navegador; PDF A4 de cuatro páginas, etiquetado, sin JavaScript, fuentes incrustadas y texto extraíble (encabezado, importes e hitos). A 390 px, sin desborde: cada hito apila su valor neto, su impuesto y su total con su rótulo.
- **Documentos renderizados y leídos.** Los cuatro ejemplos de la versión 2, los tres de la versión 1 y los seis documentos emitidos por el puente de Pricing V3 que existían al cierre (uno de ellos, con precio de programa, usa todas las claves nuevas). Los trece se componen; estimación menos medida, entre 0,02 y 0,44 px, nunca por debajo.

### Qué cambia en un documento que no usa nada nuevo

Sólo el encabezado de sus páginas interiores. Medido sobre los doce documentos de la versión 2 que existían antes del cambio (tres ejemplos, cinco del puente y cuatro `datos.json` de una cotización entregada), comparando el HTML del generador anterior con el nuevo, elemento por elemento y regla por regla: las únicas diferencias son el marcado de los encabezados (42 en total) y las reglas de estilo del encabezado. Portada, alcance, inversión, condiciones y pie salen byte a byte iguales. El HTML de los doce cambia de SHA-256 por esa razón y sólo por ella.

| Documento (datos anteriores al cambio) | Antes | Después |
| --- | --- | --- |
| `ejemplo-lineas.json` | `9cab83ed…` | `ad7f0005…` |
| `ejemplo-lineas-terceros.json` | `433ee479…` | `7acecf16…` |
| `ejemplo-lineas-opcionales.json` | `4665361c…` | `8690c5f5…` |
| Puente: `designer-on-demand` | `c29e3688…` | `4db28b15…` |
| Puente: `designer-startup-courtesy` | `04b12c11…` | `60b076fa…` |
| Puente: `designer-three-months-iva` | `076891f8…` | `2d4914ef…` |
| Puente: `managed-addon-increment` | `62318e40…` | `9e75eb33…` |
| Puente: `managed-on-demand-third-party` | `aff31c17…` | `b7cc7848…` |

Después de medir eso, los tres ejemplos de la versión 2 dejaron de declarar la nota «Desde el inicio acordado» y la condición «Plazo e inicio», que no decían nada; con sus datos actuales, `ejemplo-lineas.json` y `ejemplo-lineas-terceros.json` quedan fijados como prueba permanente en `d92402cb…` y `e7734761…`. Las cotizaciones de la versión 2 ya entregadas conservan sus archivos; si se regeneran desde sus datos, saldrán con el encabezado nuevo.

### Encabezado interior: qué se midió

Con el marcado anterior, la referencia era un elemento de bloque dentro de la línea de la sección: siempre saltaba a su propia línea y dejaba el «·» colgando al final de la anterior, con cualquier referencia, corta o larga. Ahora la unidad del cliente, la sección y la referencia son tres líneas hermanas, sin separador.

| Magnitud | Valor |
| --- | --- |
| Ancho del bloque de texto del encabezado | 527,6 px: el ancho útil menos el logo (110 px) y su separación (20 px) |
| Alto de línea | 18,47 px (7,7 pt × 1,8) |
| Líneas que admite | 3: con una cuarta, el borde del encabezado queda a 3,8 px del contenido y el render lo rechaza (exige 6 px) |
| Borde del encabezado, con y sin unidad | a 121,34 px del borde de la página: el bloque reserva siempre tres líneas y centra las que tenga con el logo |
| Aire entre el encabezado y el contenido | 22,27 px en todos los casos (antes, 22,30 px con tres líneas) |
| Referencia de dos líneas con unidad (cuatro líneas) | Antes pasaba la validación y fallaba en el navegador con el mensaje genérico; ahora falla al validar, en 0,15 s, y dice qué acortar |

En pantallas de menos de 820 px el encabezado pasa a formar parte del flujo de la página. Antes era un bloque superpuesto de alto fijo, y una referencia que se partía en esa anchura quedaba encima del contenido (medido en un documento del puente: el encabezado terminaba 13 px por debajo del inicio del contenido). No afecta a la impresión.

### Calendario de pagos con impuesto por hito

La tabla tiene cuatro columnas: el hito con su fecha o condición debajo (como el concepto y su detalle en la tabla de líneas), el valor neto, el impuesto y el total. Las tres columnas de importes parten del 15 %, 13 % y 17 % del ancho y sólo crecen si su cabecera o su importe mayor lo exige; el hito recibe el resto y nunca baja del 40 %. Una primera versión con cinco columnas (hito y condición separados) se descartó tras verla renderizada: la condición se partía en dos líneas junto a una columna de hito casi vacía, y un importe de millones con decimales dejaba la tabla sin sitio.

| Magnitud | Valor |
| --- | --- |
| Bloque del calendario en el ejemplo nuevo (estimado − medido) | 0,44 px en la página de inversión; 192,33 px estimados para el bloque |
| Importes que admite la tabla | Los que admite la portada: en CLP, USD y PEN la caja de inversión de la portada rechaza antes un importe demasiado ancho |
| Fila de un hito | 24 px de relleno, 1 px de borde y una línea de 17,25 px por cada línea del hito y de su condición |

### Barrido contra Chromium

400 documentos aleatorios de la versión 2 (dos semillas), con y sin unidad del cliente, referencias de 1 a 16 palabras, con y sin nota de calendario, con y sin rótulo de portada, tres monedas, cinco tasas y un calendario de 1 a 12 hitos, cuatro de cada cinco con impuesto por hito repartido sobre el total acumulado.

| Resultado | Valor |
| --- | --- |
| Compuestos | 233 documentos, 1.149 páginas: 0 desbordes, 0 páginas subestimadas, 0 textos fuera de su caja |
| Encabezado: líneas estimadas frente a las del navegador | Iguales en los 233 (94 de dos líneas, 98 de tres con unidad, 41 de tres con la referencia en dos) |
| Bloque del calendario de pagos (estimado − medido), 233 bloques, 184 con impuesto | entre 0,33 y 18,5 px; nunca por debajo |
| Páginas fijas (estimado − medido) | entre 0,03 y 70,2 px; la mayor sobrestimación es la cota de la fila del calendario con una nota larga |
| Aire mínimo sobre el pie; bajo el encabezado | 18,4 px; 22,27 px |
| Rechazados por el plan, con mensaje | 167: 39 por el encabezado, 53 por importes del calendario demasiado anchos, 26 por importes que no caben en la portada y 49 por un calendario más alto que una página |

Lo que el barrido encontró y no es de este cambio: 13 de los documentos compuestos desbordan a 390 px, todos por el importe de la portada (millones de dólares o miles de millones de soles a 32 pt), con el rótulo fijo o con uno propio. El generador ya los rechaza en el render con «El documento desborda en móvil».

Las reglas de recalibración de las secciones anteriores valen también para `template-lineas-hitos.css` y para el encabezado: `checks.interiorHeader` de cada manifiesto guarda las líneas estimadas, y `checks.layout[].headerGapPx`, el aire real bajo el encabezado.
