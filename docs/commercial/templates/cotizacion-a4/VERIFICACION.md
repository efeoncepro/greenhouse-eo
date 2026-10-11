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
