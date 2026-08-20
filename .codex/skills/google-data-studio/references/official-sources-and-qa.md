# Fuentes oficiales y QA

## Identidad y frescura

Google renombró Looker Studio como **Data Studio** el 16 de abril de 2026. Acepta aliases y URLs heredadas, pero
prefiere documentación actual bajo `docs.cloud.google.com/data-studio/`.

- Anuncio: [Data Studio is Data Studio](https://cloud.google.com/blog/products/data-analytics/looker-studio-is-data-studio)
- Historial: [Data Studio became Looker Studio in 2022](https://cloud.google.com/blog/products/data-analytics/looker-next-evolution-business-intelligence-data-studio)
- Estado actual: [Data Studio release notes](https://docs.cloud.google.com/data-studio/release-notes)

Última revisión de este índice: **2026-08-20**. Última release observada: **2026-08-13**. Esa release anunció
fullscreen charts, rotación de texto/imágenes/shapes, búsqueda de settings y copy chart as image. Los rollouts pueden
ser graduales: documentación publicada no demuestra disponibilidad en la cuenta.

## Índice de fuentes

| Topic                 | Canonical URL                                                                           | Scope/status                                  | Revalidar cuando                          |
| --------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| Release notes         | https://docs.cloud.google.com/data-studio/release-notes                                 | producción, previews, cambios y deprecations  | antes de trabajo importante o UI distinta |
| Chart catalog         | https://docs.cloud.google.com/data-studio/types-of-charts                               | familias nativas                              | nuevo chart o catálogo incompleto         |
| Modern Charts         | https://docs.cloud.google.com/data-studio/modern-charts                                 | defaults/configuración moderna                | reporte classic o estilo diferente        |
| Controls              | https://docs.cloud.google.com/data-studio/about-controls                                | filtros, parámetros y data/dimension controls | alcance o label inesperado                |
| Cross-source controls | https://docs.cloud.google.com/data-studio/use-controls-across-data-sources              | override report-level de field IDs            | control no afecta varias fuentes          |
| Filter properties     | https://docs.cloud.google.com/data-studio/about-filter-properties                       | filtros persistentes                          | conflicto de scopes                       |
| Parameters            | https://docs.cloud.google.com/data-studio/parameters                                    | text/number/boolean, URL, SQL/conectores      | input, seguridad o default cambia         |
| Calculated fields     | https://docs.cloud.google.com/data-studio/about-calculated-fields                       | source vs chart-specific                      | fórmula o blend depende del alcance       |
| Functions             | https://docs.cloud.google.com/data-studio/function-list                                 | catálogo de fórmulas                          | función o sintaxis no reconocida          |
| Blends                | https://docs.cloud.google.com/data-studio/how-blends-work                               | joins y preagregación                         | totales o claves dudosas                  |
| Data sources          | https://docs.cloud.google.com/data-studio/about-data-sources                            | embedded/reusable y conectores                | copy, ownership o blast radius            |
| Google Sheets         | https://docs.cloud.google.com/data-studio/connect-to-google-sheets                      | worksheet, rango y tipos                      | onboarding o schema drift                 |
| BigQuery              | https://docs.cloud.google.com/data-studio/connect-to-google-bigquery                    | tabla/view/query, billing y permisos          | costo, región o acceso                    |
| Search Console        | https://docs.cloud.google.com/data-studio/connect-to-search-console                     | URL/Site Impression y aggregation type        | reporting SEO o cambio de fuente          |
| GSC metrics           | https://support.google.com/webmasters/answer/7042828                                    | clicks, impressions, CTR y Average Position   | semántica, polaridad o atribución         |
| GSC aggregation       | https://support.google.com/webmasters/answer/17011364                                   | propiedad vs página y freshness               | reconciliación de totales                 |
| GSC analysis          | https://support.google.com/webmasters/answer/17010961                                   | tendencias, CTR, posición y segmentación      | interpretación o readout cliente          |
| GSC formulas          | https://support.google.com/webmasters/answer/12917174                                   | agregación de exports y fórmulas              | modelado fuera del conector               |
| Credentials           | https://docs.cloud.google.com/data-studio/data-credentials-article                      | owner/viewer/service account                  | acceso a datos o sharing                  |
| Viewer email          | https://docs.cloud.google.com/data-studio/filter-by-email-address                       | seguridad por fila y consentimiento           | audiencias, public link o delivery        |
| Refresh fields        | https://docs.cloud.google.com/data-studio/refresh-data-source-fields                    | sincronización de schema                      | columnas agregadas/removidas              |
| Reconnect             | https://docs.cloud.google.com/data-studio/edit-the-data-source-connection               | cambio de conexión                            | tabla, range o query cambió               |
| Extracts              | https://docs.cloud.google.com/data-studio/extract-data-for-faster-performance           | snapshot, tamaño y actualización              | rendimiento o truncamiento                |
| Copy report           | https://docs.cloud.google.com/data-studio/copy-a-report                                 | source mapping y credenciales                 | template o rollback                       |
| Version history       | https://docs.cloud.google.com/data-studio/see-whats-changed-in-reports-and-data-sources | reporte vs fuentes y credenciales             | restauración o auditoría                  |
| Report publishing     | https://docs.cloud.google.com/data-studio/report-publishing                             | draft vs published y bypasses                 | edición, verificación o rollout           |
| Responsive reports    | https://docs.cloud.google.com/data-studio/create-a-responsive-report                    | layout adaptable y límites                    | mobile/embed/conversión                   |
| Layout                | https://docs.cloud.google.com/data-studio/report-and-page-layout                        | canvas, navegación y report-level             | reestructuración de páginas               |
| Performance           | https://docs.cloud.google.com/data-studio/improve-performance                           | fuente, consultas y reporte                   | latencia/costo                            |
| Freshness             | https://docs.cloud.google.com/data-studio/manage-data-freshness                         | caché/refresh                                 | dato stale o refresh costoso              |
| Scheduled delivery    | https://docs.cloud.google.com/data-studio/schedule-automatic-report-delivery            | PDF, filtros y destinatarios                  | transmisión programada                    |
| Alerts                | https://docs.cloud.google.com/data-studio/create-alerts-on-a-chart                      | thresholds y defaults                         | notificación de datos                     |
| Sharing               | https://docs.cloud.google.com/data-studio/ways-to-share-your-reports                    | personas, grupos, links y delivery            | cambio de audiencia                       |
| Embedding             | https://docs.cloud.google.com/data-studio/embed-a-report                                | iframe/oEmbed                                 | embed o autenticación                     |
| Personal report links | https://docs.cloud.google.com/data-studio/get-a-personal-report-link                    | copia personal Pro                            | contenido oculto o sharing                |
| Roles                 | https://docs.cloud.google.com/data-studio/roles-and-permissions                         | assets/workspaces/IAM                         | Pro u organización                        |
| Data Studio API       | https://developers.google.com/data-studio/integrate/api                                 | assets y permisos; sin canvas                 | automatización organizacional             |
| Linking API           | https://developers.google.com/data-studio/integrate/linking-api                         | reportes desde templates                      | creación a escala                         |
| Troubleshooting       | https://docs.cloud.google.com/data-studio/troubleshooting-guide                         | Error ID y diagnóstico por capas              | error de conector/render                  |

## Protocolo de actualización

Antes de afirmar una función o ejecutar una edición importante:

1. lee release notes desde la fecha de este índice;
2. abre la referencia oficial de la capacidad exacta;
3. identifica `GA|Preview|Beta|Deprecated|rolling out`, `Free|Pro` y connector scope;
4. verifica en vivo idioma, cuenta, edit/view, classic/modern y freeform/responsive;
5. registra labels anteriores/actuales solo si cambian la automatización;
6. si docs y UI discrepan, reporta la discrepancia y usa el estado visible sin inventar disponibilidad.

No uses blogs de terceros como autoridad de límites, permisos o seguridad. Pueden servir para descubrir una hipótesis
que luego se verifica en docs/UI.

## Checklist de QA

### Datos

- [ ] Definiciones, grain, fórmula, agregación, timezone y período están explícitos.
- [ ] Totales y ratios reconcilian con una fuente independiente.
- [ ] Null, zero, duplicados, outliers y no-data tienen comportamiento definido.
- [ ] Blends prueban cardinalidad, filas no matcheadas y filtros pre/post join.
- [ ] Freshness y última actualización no inducen una falsa actualidad.
- [ ] Schema drift se prueba sin confundir refresh de datos, refresh de fields y reconnect.

### Interacción

- [ ] Cada control afecta exactamente los componentes esperados.
- [ ] Defaults, selección, múltiples valores y reset funcionan.
- [ ] Date range usa la dimensión correcta.
- [ ] Cross-filter, drill, optional metrics, links y botones tienen camino de salida/reset.
- [ ] Cambiar página no conserva ni pierde estado de forma accidental.

### Visual y accesibilidad

- [ ] Jerarquía, unidades, labels, legends y títulos permiten entender la pregunta.
- [ ] Color no es el único portador de significado y el contraste es suficiente.
- [ ] No hay truncado, overlap, overflow o componentes fuera de canvas en viewports requeridos.
- [ ] Teclado, foco y nombres accesibles se verifican donde la UI los expone.
- [ ] Loading, empty, error y no-permission son distinguibles.

### Rendimiento y operación

- [ ] Se mide view mode con filtros representativos.
- [ ] No hay queries/blends/componentes duplicados sin necesidad.
- [ ] Refresh/extract/caché equilibran actualidad, cuota y costo.
- [ ] Extracts respetan tamaño, filas, actualización y semántica; no existe truncamiento silencioso.
- [ ] Console/page errors y HTTP failures relevantes están saneados y explicados.

### Acceso y distribución

- [ ] Report roles y data credentials se revisan por separado.
- [ ] Embedded/reusable y blast radius están registrados.
- [ ] Sharing, exportación, embed y delivery coinciden con la audiencia autorizada.
- [ ] Seguridad por fila prueba actor autorizado, actor sin filas, consentimiento rechazado y embed.
- [ ] Controles, parámetros, URLs y páginas ocultas no se tratan como límites de autorización.
- [ ] Conectores/visualizaciones de terceros tienen proveedor, datos, costo y consentimiento claros.
- [ ] Existe copy/version de rollback y se conocen sus límites.
- [ ] Una copia se prueba como credential owner y como otro actor cuando hay embedded Owner's Credentials.
- [ ] Delivery/alertas validan edición, destino, destinatarios, filtros y contenido materializado.
- [ ] Publishing, versión draft/published y cambios que bypass Publish están registrados y verificados.

## Forward tests para la skill

Evalúa la skill con pedidos realistas y sin darle la solución esperada:

1. Diseñar un dashboard ejecutivo desde BigQuery con KPIs, tendencia, tabla y target parametrizado.
2. Diagnosticar un control `Region` que filtra algunos charts pero no otros de otra data source.
3. Corregir un blend con totales inflados por grain y join key no única.
4. Mejorar un reporte lento sin sacrificar freshness ni crear costo oculto.
5. Convertir una necesidad mobile en decisión freeform/responsive con limitaciones explícitas.
6. Auditar credenciales, sharing y embed sin ampliar acceso.
7. Operar una UI localizada con labels cambiados sin depender de coordenadas stale.
8. Copiar como credential owner y como otro actor, y reemplazar una fuente con schema parcialmente incompatible.
9. Diagnosticar schema drift de Sheets o BigQuery distinguiendo refresh, refresh fields y reconnect.
10. Validar row-level security por email dentro de un embed con consentimiento denegado y actor sin filas.
11. Decidir entre Data Studio API, Linking API y navegador sin prometer edición programática del canvas.
12. Auditar un schedule entre Free/Pro y email/Chat/Slack sin asumir preview, filtros o personalización equivalentes.
13. Mejorar un reporte con publishing activo sin confundir draft autosaved, published y restore/version history.
14. Corregir la semántica de Average Position dentro de un combo con clicks e impressions sin invertir las otras
    series.
15. Verificar ambos estados de color de un scorecard `lower_better` cuando el dato actual materializa solo uno.
16. Detectar que una página `Junio–Agosto` usa realmente `13 mayo–20 agosto` y que agosto está incompleto.
17. Modelar un portafolio con URLs nuevas y reescritas sin asignarles el mismo baseline.
18. Interpretar clicks e impressions al alza con Average Position peor sin convertir una hipótesis de cobertura en
    causalidad.
19. Preparar un pitch cliente desde Search Console sin llamar sesiones, leads, ventas o ROI a sus clicks.

La evaluación aprueba solo si separa análisis de mutación, selecciona la referencia correcta, protege credenciales y
sharing, produce criterios verificables y declara límites/incertidumbre. Los casos SEO además exigen fuente/grain,
polaridad, rango efectivo, cohortes compatibles y separación entre dato, inferencia e impacto demostrado.
