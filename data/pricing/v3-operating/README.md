# Pricing V3 — operación local para agentes

TASK-2022 completa el flujo local bajo [ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Manual ejecutable](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).

- `catalog.review-v2.json`: sucesor generado por preview/apply; añade EUR y referenciaECB9oct2026,1.1206USD/EUR.
  Los costos/países y factores históricos permanecen; no salarios vigentes.
- `resources.review-v2.json`: 32 reglas de perfil; 25 tools históricas + Claude/Higgsfield/Magnific/Vercel/GCP/créditosNotion.
  Adobe180 combinado,306 condicional; Notion24/seat facturado; M365/SEMrush/ChatGPT/Claude públicos explícitos.
  Cada plan desconocido conserva `pendingReason`; ninguna variante se selecciona por defecto.
- `historical-resource-index.json`: 26 filas con nombre del Excel; ETG-017 se conserva como fee genérico de plataforma.
  Las filas vacías/reservas no son productos gratuitos.
- `evidence-2026-10-09.json`: confirmaciones/factura/referencias y lagunas. PDF privado extraído fuera del repo;
  sin datos de tarjeta, domicilio, URL firmada ni documento completo. Facturado no equivale a pagado.
- `portfolio.example.json`: ejemplo de capacidad160/40/80/40; no distribución real de Efeonce.
- `designer.plan.json` → `designer.demand.json` → `designer.artifact.json`: diseñador senior50%CO→CL,
  base actual/referencial, Adobe repartido e IAHiggsfield+Magnific con FX explícito.
- `service.plan.json` → `service.demand.json` → `service.artifact.json`: unidadservicio con dos funciones internas,
  base/SEMrush/Claude y portfolio de Vercel/GCP declarado para simulación.
- `crm-client-tools.demand.json` → `crm-client-tools.artifact.json`: varianteHubSpot histórica con acceso cliente
  **sintético** documentado; no prueba de cliente real, partner entitlement ni CRMwrite.
- `operational-gaps.json`: faltantes económicos/operativos por owner y acción, sin solicitar otra vez salarios que el operador no tiene.
- `*.assessment.json`, `*.preview.json`: pendientes y precio de simulación redactado; no export comercial autorizado.
- `writer.brief.json`: entrada para scaffold; tareaSEO debe confirmarse, no inferir salario distinto.
- `verification.cli.json`: smoke real de comandos y negativos; exit3 es estado de revisión, no fallo de cálculo.

Las fuentes temporales se seleccionan por fecha de cotización; el snapshot modela el plazo con esos valores
congelados. Una fuente vencida bloquea una nueva selección; no demuestra por sí sola reajuste contractual futuro.
Las variantes públicas tienen ventana interna de revisión de30días, no garantía del proveedor. InvoiceNotion sólo
sustenta el periodo declarado. Créditos adicionales retienen incertidumbre de precio vigente/impuestos/caducidad.

Legacy `v3-catalog/`, `v3-composition/`, Excel/seeds y todos sus artifacts se conservan. Las nuevas fixtures tampoco
se sobrescriben. El próximo costo/plan pide versión y nueva quote. TASK-2017 mantiene economía parcial; API/UI/MCP
canónicos e inventario live tienen frontera propia.
