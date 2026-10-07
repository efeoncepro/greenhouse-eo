# Research ampliado Pibank Perú · 06-10-2026

**Preparado para revisión interna; no forecast, publicación ni baseline privada.**

Lectura principal: [investigación ampliada](../PIBANK-RESEARCH-AMPLIADO-2026-10-06.md).

- `keyword-dataset.json` / `.csv`: inventario exacto completo con fuentes, historia y clasificación candidata. Los carriles no acreditan elegibilidad y las sumas brutas no son TAM.
- `core-families.json`: segunda vista por core del proveedor, sin MAX universal ni suma de mercado.
- `monthly-demand-inputs.json` / `.csv`: panel manual entregado al modelo; adquisición 3.690, condicional 1.690, asistencia 4.070 y USD futuro 480, separados. SHA preservado en `validation.json`.
- `clusters-priorizados.json` / `.csv`: diez grupos con decisiones, dependencias y aceptación.
- `serp-evidence.json`, `serp-competitor-matrix.json`: capturas y competencia del panel, sin baseline LLM ni share of voice global.
- `official-source-ledger.json`: 17 fuentes primarias de producto, regulación, Google y proveedor.
- `aeo-capabilities.json` y preflights: capacidades de catálogo y dos GET reales, sin llamadas pagadas de respuestas/mentions/scraper/AI Mode.
- `coverage-and-costs.json`, `request-ledger.json`, previews/requests/providers: trazabilidad de cobertura, paginación, costo y barreras. Known subtotal US$1,14582; costo total observado N/D por una solicitud abortada. BBVA parcial 500/1.544. No retry ni compras adicionales.
- `validation.json`: 63 verificaciones proporcionales del dataset, panel, costos, cobertura y enlaces.

Los scripts de construcción trabajan sólo con los raws existentes. `run-batch.py` es evidencia del carril CLI y se detiene ante costo desconocido: no debe ejecutarse de nuevo sin resolver ese estado y definir un nuevo lote. No regenerar el panel del modelo sin coordinar su snapshot/hash con el owner del modelo anual.
