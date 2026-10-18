# SKY: conexión Search Console — 2026-10-15

Resultado: conexión activa al blog, lectura real de Google y reader canónico de Greenhouse verificados.

- Organización: `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`.
- Propiedad seleccionada: `https://blog.skyairline.com/`. Coincide con el alcance del blog; no se cambió el vínculo.
- OAuth: `webmasters.readonly`; Google sites.list confirma `siteFullUser` para esta propiedad. No se infiere ownership.
- Ficha de Production: HTTP 200, «Conectado», con el actor dedicado `agent@greenhouse.efeonce.org`.
- Worker inspeccionado: `ops-worker-00778-d74`, flag Search Console `true`.
- `readSearchConsoleAnalytics`: ok, cinco páginas reales de septiembre; conexión mantiene active y sin error. El reader actualiza normalmente `last_verified_at` durante la lectura.
- El reader se ejecutó localmente contra la conexión compartida y configuración actual del worker. La ficha se abrió directamente en Production; no se generó una edición de Insights.

## Datos reales del blog

Ventana 1–30 septiembre 2026. Search Analytics `type=web`, `dataState=final`, filtro de página exacto al host mediante regex, agregación `byPage`. Fechas de GSC corresponden a su calendario propio, distinto del de GA4. Total consultado sin dimensión de query, por lo que no se reconstruye desde búsquedas individuales anonimizadas.

| Métrica | Valor |
| --- | ---: |
| Clics | 28,718 |
| Impresiones | 2,080,377 |
| CTR | 1.380423% |
| Posición media | 7.769980 |

Las lecturas por página y por consulta también devolvieron HTTP 200. Las cinco páginas con más clics observadas son Equipaje de cabina (4.105), Equipaje de bodega (3.010), Tipos de equipaje (2.446), Cambiar vuelo SKY (1.417) y Viajar con perros (1.118).

## Alcance y continuidad

GA4 aporta sesiones/canales/comportamiento; Search Console aporta clics/impresiones/CTR/posición de Google Search. No sumar ni equiparar clics y sesiones. Se puede cruzar por URL la nueva fuente con el top 50 GA4 ya entregado, pero ese Excel no se modificó en esta verificación. No se ejecutó backfill ni snapshot-batch ni se certificó aquí la cobertura de la serie materializada para los informes automáticos.

Evidencia local ignorada, sin secretos: `.captures/sky-gsc-2026-10-15/search-console-readback.json`, `production-panel.json` y `production-panel.png`.


## Actualización del Excel del top 50 con Search Console

Pedido explícito del operador: añadir clics, impresiones, CTR, posición media y búsquedas por página al Excel existente.

- Se mantuvieron las mismas 50 URL y el orden del ranking GA4 de septiembre. Antes de consultar se extrajeron las URL del Excel real y se guardó su SHA-256. Copia exacta previa en `.captures/sky-gsc-2026-10-15/top50-before-gsc.xlsx`.
- Search Analytics: 1–30 septiembre 2026, `type=web`, `dataState=final`, `aggregationType=byPage`. Respuesta completa de páginas: 2721 filas. Coincidencia exacta de URL para las 50 páginas, sin normalizar rutas, combinar variantes o reconstruir métricas desde consultas.
- Por cada URL se consultaron hasta cinco búsquedas, con filtro `page equals URL`, orden de clics de Search Analytics y límite cinco. Se recibieron 244 términos en total. Tres páginas recibieron menos de cinco consultas; no se inventaron filas. Los términos anonimizados/ocultos por Google no se recuperan ni se usa la suma de consultas para representar el total de una página.
- Se importó y editó el workbook existente con Artifact Tool. Se añadieron R:V: clics GSC, impresiones GSC, CTR GSC, posición media GSC y principales búsquedas (hasta cinco, enumeradas por clics). Se amplió la misma tabla filtrable a `A11:V61`, preservando nombre y estilo; alturas ajustadas para leer las nuevas listas. CTR numérico con formato `0.00%`, posición numérica con `0.00`.
- Validación del archivo exportado: las 867 celdas previas del encabezado/datos A11:Q61 conservan sus valores; coincidencia de todas las métricas de las 50 páginas y de los 244 términos con la fuente. Paneles congelados conservados en C12, una sola tabla, ninguna celda de error. Revisión visual de las columnas nuevas, últimas páginas y columnas GA4.
- Archivo actualizado en su ruta original: `outputs/sky-blog-top50-2026-09/SKY-blog-top-50-canales-septiembre-2026.xlsx`.
- Fuentes y comprobación: `.captures/sky-gsc-2026-10-15/top50-gsc-september.json`, `top50-workbook-source.json`, `workbook-export-validation.json` y previews.
- No se modificó la conexión de Google ni se publicó, emitió o envió un informe de Insights.
