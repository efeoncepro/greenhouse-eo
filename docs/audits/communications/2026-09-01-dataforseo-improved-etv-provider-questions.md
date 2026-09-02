# DataForSEO Improved ETV — correo de aclaración contractual

- Fecha: 2026-09-01
- Estado: **respondido por DataForSEO; contrato incorporado el 2026-09-02**
- Canal principal: responder al remitente visible del aviso de cuenta
- Destinatario: Yevhen Tishchenko `<yevhen.tishchenko@dataforseo.com>`
- Asunto: `Questions about the improved ETV rollout and API contract`
- Fallback si rebota o no responde: [formulario oficial](https://dataforseo.com/contact), chat de soporte o `info@dataforseo.com`

## Borrador

Hi Yevhen,

Thank you for the advance notice about the improved ETV formula. We use ETV across current and historical
DataForSEO Labs workflows, so we want to adopt the new methodology without introducing unexplained breaks in
our time series.

Could you please clarify the following points?

1. Which exact DataForSEO Labs endpoints and response fields support `use_improved_etv`?
2. Does the new formula apply only to organic `etv`, or also to paid, featured snippet, local pack, AI Overview
   reference, and other ETV aggregates?
3. Until November 1, 2026, is the default `false`, with `true` opting into the new formula? After that date, will
   `false` still preserve the legacy calculation, and if so, until when?
4. What is the exact cutover time and timezone?
5. For Historical Rank Overview and Historical Bulk Traffic Estimation, does the improved formula recalculate
   prior periods, return a parallel historical series, or only affect data collected after the cutover?
6. Can the same historical month return different ETV values depending on `use_improved_etv`, and is the applied
   formula version exposed anywhere in the response?
7. Will `estimated_paid_traffic_cost` be recalculated from the improved organic ETV?
8. How does `use_improved_etv` interact with `include_clickstream_data` and the separate `clickstream_etv` field?
   Can both parameters be used together?
9. Does `use_improved_etv` change request pricing? Does the existing double-price rule remain limited to
   `include_clickstream_data: true`?
10. Is the new parameter already supported in Sandbox, and can you share an updated API reference, OpenAPI
    specification, changelog entry, or request/response example?

An endpoint compatibility matrix and guidance on preserving comparable historical series would be especially
helpful.

Best regards,  
Julio Reyes Rangel

## Notas operativas

- El remitente visible no es una dirección `no-reply`; responder a ese hilo es el primer canal razonable.
- El correo pide contrato, no soporte de implementación. No incluye credenciales, payloads reales, clientes ni
  datos sensibles.
- El hilo fue enviado y recibió respuesta de Yevhen Tishchenko el 2026-09-02T01:12:57Z. La evidencia primaria
  permanece en Outlook; este documento conserva sólo el resumen contractual necesario y no replica identificadores
  internos del buzón.
- La respuesta resuelve endpoints, campos, booleano, corte, históricos, coste, convivencia con clickstream y
  disponibilidad productiva. No confirma expresamente Sandbox y las páginas OpenAPI/changelog seguían en preparación.

## Respuesta contractual recibida

### Cobertura

`use_improved_etv` está operativo en producción para variantes Google y Bing, incluidas rutas legacy, en estas
14 familias Labs:

1. Ranked Keywords.
2. SERP Competitors.
3. Relevant Pages.
4. Subdomains.
5. Competitors by Domain.
6. Categories for Domain.
7. Domain Intersection.
8. Page Intersection.
9. Domain Rank Overview.
10. Historical Rank Overview.
11. Historical SERPs.
12. Bulk Traffic Estimation.
13. Historical Bulk Traffic Estimation.
14. Domain Metrics by Categories.

Keyword Suggestions y Keyword Ideas no devuelven ETV y quedan fuera. La fórmula afecta todos los campos ETV,
incluidos agregados `organic`, `paid`, `featured_snippet`, `local_pack`, referencias de AI Overview,
`ranked_serp_element.serp_item.etv`, ETV de SERP Competitors y `estimated_paid_traffic_cost`.

### Semántica y calendario

- Cuentas registradas antes del 2026-09-01 mantienen legacy por default durante la transición; `true` solicita
  improved y `false` legacy.
- Cuentas registradas desde el 2026-09-01T00:00:00Z nacen con improved por default.
- El corte global es **2026-11-01T00:00:00Z**. Desde ese instante improved es obligatorio: `false` se ignora y no
  existe fallback legacy posterior.
- La respuesta no expone la versión aplicada. DataForSEO recomienda registrar en el cliente el flag y la fecha del
  request; Greenhouse agrega además la versión de policy y deriva el método efectivo según el contrato temporal.

### Cálculo e históricos

- Organic usa curvas CTR sensibles a posición, intención y composición del SERP.
- Elementos no orgánicos con URL comparten los clics residuales después de organic según posición absoluta.
- En AI Overview, la estimación se reparte uniformemente entre dominios únicos citados; no representa clics
  observados por cita.
- Julio de 2026 en adelante se recomputa completamente con improved.
- Los meses anteriores se convierten mediante un factor de calibración derivado del ratio legacy/improved de julio
  de 2026 para cada dominio. Son aproximaciones, no recomputación keyword por keyword.
- Hasta el corte, el mismo mes histórico puede devolver legacy o improved según el flag.

### Precio y clickstream

- `use_improved_etv` no cambia el precio del request.
- Un A/B exacto requiere dos requests normales, uno por fórmula.
- `include_clickstream_data` es independiente, puede combinarse con improved y conserva su multiplicador de precio.
- `clickstream_etv` no forma parte de la fórmula improved y no cambia con `use_improved_etv`.
- `estimated_paid_traffic_cost` se recalcula como ETV improved por CPC, tanto por item como en agregados.

## Pendientes no bloqueantes

- Confirmación explícita de que Sandbox acepta el nuevo parámetro.
- URLs finales de documentación, OpenAPI y changelog cuando DataForSEO las publique.
