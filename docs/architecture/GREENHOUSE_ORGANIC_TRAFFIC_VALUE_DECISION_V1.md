# ADR — Valor del tráfico orgánico con clics GSC y CPC por país

**Estado:** Accepted para foundation local y piloto de cuenta, autorizado por Julio el 15-10-2026.
**Dominio:** Growth SEO / Search Visibility 360. **Método:** `gsc_clicks_country_cpc_v1`.
**Alcance de entrega:** cálculo canónico, extracción por readers existentes, CLI de operador, skill y Excel.
API/MCP, UI, jobs, persistencia del derivado y publicación de Insights no forman parte de este rollout.

## Problema y decisión

SKY solicitó valorar en términos publicitarios el tráfico orgánico de su blog. El valor nativo de DataForSEO
usa ETV modelado. Para esta pregunta usamos clics observados de GSC multiplicados por CPC del mismo país,
con controles de cobertura, sin atribuir ahorro efectivo o ROI.

Se reutilizan `readSearchConsoleAnalytics`, `readKeywordMarketData`, `parseKeywordOverviewItem`,
`persistKeywordMarketData`, el transporte DataForSEO y su gate/ledger. `querySearchAnalytics` acepta de
forma aditiva filtros, tipo de búsqueda, estado final y agregación; omitirlos mantiene el request previo.
No hay otro cliente, otro presupuesto ni tablas nuevas. La extracción verifica el binding activo de la org
contra la propiedad solicitada y corta si difiere. No cambia OAuth ni conecta propiedades por inferencia.

El cálculo puro vive en `src/lib/growth/seo/organic-traffic-value/calculate.ts`; el collector en `collect.ts`.
El collector consulta control global, control por página y detalle page/query/country paginado. Agotar
paginación no implica recuperar consultas privadas ni toda la cola limitada por Google. Un límite propio
alcanzado produce error, no una captura presentada como completa.

## Contrato del resultado

- Moneda USD; suma de productos sin redondeos intermedios, agregado a centavos.
- Valores financieros estimados con procedencia de CPC; clics con procedencia GSC, usando `seoProvenance`.
- Controles de total y página sin query. La suma de controles por página debe reconciliar con el global.
- Duplicados exactos page/query/país y CPC normalizado/país son errores. URLs se conservan exactas.
- `null` significa CPC/valor no disponible. Un CPC de cero explícito es válido. Sin clics valorables,
  el resultado monetario es `null`, no cero. No extrapolar ni imputar a búsquedas ocultas.
- Cobertura = clics valorados / control del mismo alcance; mostrar también clics visibles/no expuestos.
- Marca/sin marca y país desglosan el detalle disponible; sin control propio no afirman cobertura total.
- CPC captura y actualización del proveedor permanecen fechados. Septiembre valorado a precios de octubre
  se identifica como valoración retrospectiva con precios actuales; no se etiqueta CPC histórico.

El valor nativo `organicEstimatedTrafficCostUsd` conserva su método ETV independiente. No sumar ambas
valoraciones ni cambiar su significado. El indicador nuevo no depende de la revisión de fórmula ETV.

## Operación, costo y reversibilidad

La CLI de operador trabaja con export GSC y snapshots de CPC. Una compra nueva pasa por `pnpm dataforseo`
con payload explícito, preview, org, consumer SEO, estimación y ceiling, y conserva task/costo/estado.
Después se persiste sólo por el writer existente. No crea tracked keywords ni compromisos recurrentes.
Ante respuesta perdida, costo desconocido o error de task, detener y reconciliar antes de recomprar.

No hay migración, cron, deploy o modificación de ediciones previas. El retiro consiste en dejar de ejecutar
el análisis y conservar los artefactos de evidencia. Los snapshots CPC legítimos siguen disponibles a sus
readers canónicos, sin borrar evidencia. La habilitación de una superficie productiva requiere su unidad
formal de trabajo, ownership API/MCP y pruebas de autorización; este ADR no declara esa superficie disponible.

## Fuentes y validación

[Método de cuenta](../services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md) ·
[manual](../manual-de-uso/growth/valorar-trafico-organico.md) ·
[arquitectura SEO](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) ·
[versionado ETV](GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md).

Pruebas requeridas: país correcto, CPC cero/ausente, duplicados, reconciliación, marca/sin marca,
propiedad equivocada, paginación y compatibilidad del request previo. El piloto real y sus límites se
registran en la auditoría de entrega de SKY; no sustituir esa lectura por pruebas unitarias.
