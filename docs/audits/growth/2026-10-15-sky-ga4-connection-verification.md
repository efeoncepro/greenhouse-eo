# SKY: conexión GA4 y verificación de lectura — 2026-10-15

Resultado: conexión corregida y datos disponibles mediante los readers canónicos de Greenhouse.

## Identidad y corrección aplicada

- Organización: Sky Airline, `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`.
- Verificación autenticada en Production como `agent@greenhouse.efeonce.org`; ficha HTTP 200.
- Propiedad inicialmente conectada: `400286281`, «SKY web GA4 - Prod (Last click)», active y scope `analytics.readonly`.
- Google devolvió HTTP 200 sin filas para septiembre, 8–14 de octubre y los últimos siete días cerrados. Eso acredita acceso pero no datos utilizables para esas ventanas; no prueba ausencia de tráfico en SKY.
- La cuenta consentida también permite leer `354430952`, «SKY web GA4 - Prod», con flujo web `https://www.skyairline.com`, zona `America/Santiago`, USD y Analytics 360. Devuelve datos en ambas ventanas.
- Se corrigió el vínculo mediante el endpoint de producto `POST /api/admin/growth/analytics-ga4/select-property`, misma organización y propiedad `354430952`. Respuesta HTTP 200, active; no fue necesario repetir OAuth ni ampliar scopes.
- Readback independiente de la ficha Production: «Conectado», nombre e ID correctos. Conexión final active y `lastErrorCode=null`.

## Evidencia de datos

Lecturas agregadas de GA4 por día (una sola consulta por ventana, sin sumar desgloses independientes):

| Ventana | Sesiones |
| --- | ---: |
| 2026-09-01 a 2026-09-30 | 6,443,305 |
| 2026-10-08 a 2026-10-14 | 1,522,532 |

El reader canónico `readGa4Analytics` y `readGa4ChannelWindow`, con la conexión compartida y la configuración GA4 de la revisión vigente `ops-worker-00778-d74` (flag true), devolvieron:

- 2026-09-01 a 2026-10-01 (fin exclusivo): ok, propiedad `354430952`, 1993 filas de canal/fuente; adapters `ga4OrganicFacts` y `ga4AiFacts` con hechos y cero rechazos.
- 2026-10-08 a 2026-10-15 (fin exclusivo): ok, propiedad `354430952`, 618 filas de canal/fuente; adapters `ga4OrganicFacts` y `ga4AiFacts` con hechos y cero rechazos.

También pasó una lectura diaria de sesiones, usuarios, sesiones con interacción y duración media de sesión para 8–14 de octubre. No sumar usuarios diarios para inferir usuarios únicos de la ventana. Los desgloses canal/fuente no sustituyen un total agregado solicitado a Google.

## Alcance de lo verificado

- Production UI y API de selección/catálogo se verificaron en el despliegue publicado; catálogo de Insights HTTP 200, módulos SEO/AEO/ICO disponibles para SKY.
- Las consultas Data API son reales y usan el consentimiento persistido de SKY. Los readers y adapters se ejecutaron localmente contra esa conexión, con configuración GA4 leída del worker; no se ejecutó una generación/render dentro de Vercel o del worker.
- Los resultados mostrados corresponden al sitio completo. No son mediciones exclusivas del blog ni atribución del trabajo de Efeonce.
- No se creó, emitió, compartió ni envió una edición de Insights. Las ediciones selladas anteriores no se actualizan por este cambio.
- Conversions y scoring GA4 del grader no se acreditan con esta comprobación.
- La consulta exploratoria amplia del histórico de la propiedad inicial (2023 a hoy) agotó su timeout de 45 s; no se usa para afirmar que nunca tuvo datos. Las ventanas acotadas sí devolvieron HTTP 200 vacío.

## Archivos locales de evidencia

Todos en `.captures/sky-ga4-2026-10-15/` (ignorados por Git, sin credenciales):

- `production-panel.json` / `.png`: estado original.
- `data-readback-before.json`: primera lectura canónica, sin filas.
- `property-history.json`: inventario SKY y timeout del histórico amplio.
- `property-comparison.json`: comparación real entre tres propiedades, ventanas acotadas.
- `main-property-streams.json`: dominio de la propiedad de producción.
- `property-selection-receipt.json`: corrección por API canónica.
- `production-panel-after.json` / `.png`: readback publicado independiente.
- `data-readback.json`: consultas canónicas y adapters tras corregir.
- `production-insights-catalog.json`: habilitación de Insights.


## Verificación adicional: blog SKY

A petición del operador, se consultó la propiedad conectada `354430952` con filtro exacto `hostName = blog.skyairline.com`. Google devolvió HTTP 200:

| Ventana | Sesiones con actividad en el host | Vistas de página |
| --- | ---: | ---: |
| 1–30 septiembre 2026 | 38.332 | 61.984 |
| 8–14 octubre 2026 | 8.109 | 12.584 |

Una consulta adicional por `hostName + pagePath`, ordenada por vistas y limitada a diez resultados, confirmó artículos como `/equipaje-de-cabina/`, `/equipaje-de-bodega/`, `/tipos-de-equipaje/` y `/cambiar-vuelo-sky/`. La API declaró 1.376 filas en septiembre; no se descargó el resto y no se interpreta ese número como artículos únicos (incluye raíz y categorías). Los totales de la tabla provienen de la consulta agregada por host, nunca de sumar las páginas.

La conexión contiene los datos del blog, pero no hay alcance de contenido configurado para SKY (`readSeoContentScope` devuelve null). El reader GA4 canónico actual admite filtros por ruta de entrada, no por hostname; `Ga4ReportDimension` tampoco incluye `hostName` ni `pagePath`. Estas comprobaciones del blog usaron una consulta directa a Data API con el consentimiento existente, sin alterar el vínculo ni los scopes. Para que Insights mida automáticamente sólo el subdominio del blog hace falta extender el contrato de filtro por host y conectarlo a su alcance; configurar únicamente `/blog` sería incorrecto, pues el blog vive en un subdominio y sus artículos cuelgan de la raíz. No se implementó esa ampliación ni se generó una edición.

Evidencia: `.captures/sky-ga4-2026-10-15/blog-readback.json`.


## Extracción solicitada: top 50 páginas y canales

- Período elegido y comunicado: septiembre 2026 (1–30), último mes completo; zona `America/Santiago`.
- Filtro exacto `hostName=blog.skyairline.com`; propiedad activa `354430952`.
- Ranking: dimensiones `pagePath`, métricas `sessions` y `screenPageViews`, orden descendente por sesiones y desempate por ruta ascendente. Top 50 de 1.376 rutas devueltas por GA4.
- Desglose: `pagePath + sessionDefaultChannelGroup`, filtro por las 50 rutas exactas y host del blog. Respuesta completa de 326 filas; 13 canales presentes. No se filtraron portada ni categorías porque se solicitaron páginas.
- Interpretación: sesiones con actividad en cada página, no exclusivamente páginas de entrada. Una misma sesión puede visitar más de una página. No sumar filas para representar sesiones únicas del blog.
- Diferencia observada: suma de sesiones por canal distinta del total de página en 14 rutas. En `/equipaje-de-cabina/`, el total independiente es 4.990 y la suma del desglose 4.917. Una consulta de control de esa única página, sin `inListFilter`, reproduce las 4.917; no es pérdida del cruce local ni del filtro de 50 rutas. Las vistas coinciden por página en los 50 casos. Se conserva lo entregado por Google, sin inferir una causa ni normalizar las cifras para que sumen. No se recibió indicador de sampling/thresholding en metadata.
- Todas las celdas de ranking, URL, sesiones, vistas y 13 canales se contrastaron con el JSON de fuente exportado. Excel con tabla filtrable y encabezados/primeras dos columnas congelados.
- Canal dominante según sesiones: Organic Search en 42 páginas, Email en 7 y Direct en 1.
- Excel: `outputs/sky-blog-top50-2026-09/SKY-blog-top-50-canales-septiembre-2026.xlsx`.
- Evidencia: `.captures/sky-ga4-2026-10-15/blog-top50-september.json`, `blog-top50-control.json` y previews del workbook.
- Sin cambios adicionales al vínculo GA4, schema, lectores, scopes o informes sellados de Insights.
