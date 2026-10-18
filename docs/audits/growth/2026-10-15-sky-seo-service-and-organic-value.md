# SKY — servicio SEO y piloto de valor orgánico, 15-10-2026

## Pedido y estado real

Julio autorizó «hagámoslo todo» después de revisar crear el documento del servicio, una skill de cuenta y
el indicador de valor publicitario equivalente. Entrega: marco de servicio + skill espejo + método +
foundation local de cálculo/lectura + CLI + Excel con datos reales. La cifra no está publicada en un panel,
API/MCP, cron o nueva edición de Insights. No se efectuó commit, push, deploy, envío o publicación CMS.

## Fuentes revisadas

- [Reunión Natalia/Pilar/Julio del 15-10](https://app.notion.com/p/3fa39c2fefe78144b63bead05ce5e), con transcripción.
- [Playbook Producción · Blog SKY](https://app.notion.com/p/06531fec27634eed98b73094ba05ce5e), fuente viva editorial.
- [Propuesta Flujo de trabajo + SKILL](https://app.notion.com/p/3ed39c2fefe780e4aaddde27f828e3a3), antecedente visual.
- Readers y contratos reales GSC, CPC, visibilidad por URL/subdominio y metodología ETV.
- Documentación oficial de Google Search Analytics y DataForSEO enlazada en el método.

Las notas de Notion carecen de verificación nativa certificada; la transcripción soporta los compromisos
registrados. El marco mantiene las cifras históricas del cliente como declaraciones por verificar. No
convierte la expectativa de tres meses en una garantía ni afirma anexo firmado, WordPress operativo o penalización.

## Artefactos y código

- [Marco de cuenta](../../services/sky-blog-seo/README.md): alcance, compromisos, responsables, plan noviembre–enero,
  baseline, dependencias y aceptación; enlaza el playbook existente sin duplicarlo.
- Skills `.codex/skills/sky-blog-seo/` y `.claude/skills/sky-blog-seo/`, registradas en el gate de espejos y router.
- [Método](../../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md),
  [ADR](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md),
  [funcional](../../documentation/growth/valor-publicitario-organico.md),
  [manual](../../manual-de-uso/growth/valorar-trafico-organico.md).
- `src/lib/growth/seo/organic-traffic-value/calculate.ts`: cálculo puro, controles, cobertura, marca/país y procedencia.
- `collect.ts`: reader GSC existente con verificación previa de la propiedad; controles y detalle paginado.
- Parámetros GSC aditivos de filtros, búsqueda, estado y agregación, conservando el payload previo al omitirlos.
- `readKeywordMarketData` añade fecha real del snapshot por keyword, sin inventarla en el parser de proveedor.
- `scripts/seo/organic-traffic-value.ts`: extracción opcional, lectura CPC y JSON sin recompra ni tracking.

## Extracción y compra puntual

GSC: organización `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`, propiedad `https://blog.skyairline.com/`,
host exacto. Septiembre 1–30, web/final/byPage. 2.721 controles de páginas, suma exactamente 28.718 clics,
igual al control global sin query. 4.051 filas page/query/country con clics positivos, 9.301 clics visibles.
Paginación agotada; Google conserva límites y consultas no expuestas. 19.417 clics no se reconstruyen.

El cache previo no tenía las 222 consultas únicas de la muestra anterior en Chile/Perú ni una valoración
de visibilidad del subdominio para esos mercados. Se amplió la selección al detalle disponible completo,
sin limitarla a los cinco términos del top 50. 2.646 keywords únicas por mercado solicitadas en cinco batches
de hasta 700. Preview USD 0,37752, techo total USD 0,50. Compra puntual por CLI/transporte canónicos,
org real, consumer SEO, entitlement y ledger existentes. No se agregaron tracked keywords ni cuotas recurrentes.

| Mercado / batch | Task de proveedor | Costo USD | Snapshots escritos |
| --- | --- | ---: | ---: |
| Chile 0 | `10152006-1987-0607-0000-665188b445b5` | 0,06552 | 446 |
| Chile 1 | `10152008-1987-0607-0000-ad0f70e56d59` | 0,06204 | 417 |
| Chile 2 | `10152009-1987-0607-0000-b75f0dd82e3a` | 0,04788 | 299 |
| Perú 0 | `10152010-1987-0607-0000-0f61b0ce1137` | 0,05112 | 326 |
| Perú 1 | `10152010-1987-0607-0000-bbb7e51411e6` | 0,01404 | 17 |
| Total | Cinco tasks exitosas con costo conocido | **0,24060** | **1.505** |

Cada recibo conserva el ID exacto y status 20000. Escritura por `parseKeywordOverviewItem` y
`persistKeywordMarketData`. Lectura posterior independiente mediante `readKeywordMarketData`: 1.162 snapshots
de Chile y 343 de Perú, todos capturados el 15-10. Algunas keywords no tienen CPC, aunque sí otras métricas.
Una respuesta excedió el buffer de stdout del wrapper después de guardarse el recibo exitoso. Se reconcilió
ese recibo y se persistió sin recompra, continuando el mismo plan y el acumulado de gasto.

## Resultado del piloto

Método `gsc_clicks_country_cpc_v1`. CPC capturados en octubre aplicados a septiembre; valoración retrospectiva
a esos precios, no una serie de CPC históricos. Países distintos de Chile/Perú permanecen sin valorar.

| Medida | Resultado |
| --- | ---: |
| Control de clics GSC blog | 28.718 |
| Clics de consultas visibles | 9.301 |
| Clics con CPC disponible | 3.824 |
| Cobertura sobre el total | **13,3157%** |
| Clics visibles sin valorar | 5.477 |
| Valor equivalente parcial USD | **2.116,38** |
| Chile | USD 1.700,37 sobre 3.113 clics valorados |
| Perú | USD 416,01 sobre 711 clics valorados |
| Marca | USD 1.497,40 sobre 2.724 clics valorados |
| Sin marca | USD 618,98 sobre 1.100 clics valorados |

La cobertura de consultas es 32,3874%. No se extrapoló al total. El dinero es un proxy estimado y no acredita
ahorro efectivo, ingresos o ROI. Marca/país desglosan el detalle disponible, sin afirmar denominadores globales propios.

## Excel y verificación

Archivo original actualizado: `outputs/sky-blog-top50-2026-09/SKY-blog-top-50-canales-septiembre-2026.xlsx`.

- Conserva las 1.122 celdas A11:V61 de GA4/GSC y el ranking de 50 páginas, incluidos los 244 términos anteriores.
- W:AA añade valor estimado, clics valorados, cobertura, clics visibles y no expuestos por URL exacta.
- Añade `Valor orgánico` (resumen global, país y marca) y `Cálculo por consulta` (4.051 filas, CPC/fechas,
  productos y 2.721 controles originales). La pestaña inicial se mantiene primero.
- Valores monetarios y conteos tipados, fórmulas enlazadas, filtros nativos, tabla original ampliada a
  `A11:AA61` y paneles originales C12 preservados. CPC ausente y cero real ejercitados/restaurados.
- 50 resultados por página y resumen contrastados con el cálculo canónico. Revisión visual de las tres
  vistas nuevas. Lectura independiente del XLSX guardado: 1.122 celdas previas idénticas, 4.051 filas de fuente
  y productos comprobados, dos tablas, panes preservados y cero celdas de error. No se certificó Excel nativo.

Checks de código/documentación: 69 pruebas focalizadas pasan; TypeScript completo con heap 8GB pasa
(el primer intento con 4GB agotó memoria); ESLint focalizado pasa; skill valida y gate de espejos/contexto pasan.
El cálculo afirma cobertura de procedencia con el caminador canónico, además de sus resultados numéricos.

## Evidencia y continuidad

Evidencia local ignorada, sin credenciales: `.captures/sky-gsc-2026-10-15/organic-value-gsc-inputs.json`,
`organic-market/plan.json`, cinco previews/payloads/recibos, `organic-value-cache-check.json`,
`organic-value-export-readback.json`, `organic-value-workbook-validation.json` y tres previews de las vistas.
Salida reproducible: `outputs/sky-blog-top50-2026-09/valor-organico-septiembre-2026.json`.

El histórico completo de migración, WordPress y anexo siguen pendientes. Para incorporar el indicador a
una superficie productiva hay que definir su unidad formal y promoción, acceso y entrega API/MCP/Insights.
El piloto y el contrato técnico dejan ese siguiente alcance explícito, sin afirmar que ya esté desplegado.
