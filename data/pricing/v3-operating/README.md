# Pricing V3 — operación local para agentes

TASK-2022 completa el flujo local bajo [ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Manual ejecutable](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) y
[referencia funcional completa](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md).

- `catalog.review-v2.json`: sucesor generado por preview/apply; añade EUR y referenciaECB9 oct 2026,1.1206 USD/EUR.
  Los costos/países y factores históricos permanecen; no salarios vigentes.
- `resources.review-v2.json`: 32 reglas de perfil; 25 tools históricas + Claude/Higgsfield/Magnific/Vercel/GCP/créditosNotion.
  Adobe 180 combinado,306 condicional; Notion 24/seat facturado; M365/SEMrush/ChatGPT/Claude públicos explícitos.
  Cada plan desconocido conserva `pendingReason`; ninguna variante se selecciona por defecto.
- `historical-resource-index.json`: 26 filas con nombre del Excel; ETG-017 se conserva como fee genérico de plataforma.
  Las filas vacías/reservas no son productos gratuitos.
- `evidence-2026-10-09.json`: confirmaciones/factura/referencias y lagunas. PDF privado extraído fuera del repo;
  sin datos de tarjeta, domicilio, URL firmada ni documento completo. Facturado no equivale a pagado.
- `portfolio.example.json`: ejemplo de capacidad 160/40/80/40; no distribución real de Efeonce.
- `designer.plan.json` → `designer.demand.json` → `designer.artifact.json`: diseñador senior 50% CO→CL,
  base actual/referencial, Adobe repartido e IAHiggsfield+Magnific con FX explícito.
- `service.plan.json` → `service.demand.json` → `service.artifact.json`: unidadservicio con dos funciones internas,
  base/SEMrush/Claude y portfolio de Vercel/GCP declarado para simulación.
- `crm-client-tools.demand.json` → `crm-client-tools.artifact.json`: varianteHubSpot histórica con acceso cliente
  **sintético** documentado; no prueba de cliente real, partner entitlement ni CRM write.
- `catalog.review-v3.json` (change-set `creative-managed-service.change.json`): política de precio
  `creative-managed-service` con margen objetivo y mínimo 45 % para los 32 perfiles, kit `managed-service-core` sin
  herramientas y dos provisiones declaradas como estimación. v2 se conserva; nada se activa por defecto.
- `resources.review-v3.json` (cambio `managed-service-resources.change.json`): tarea `social-care` con `social-inbox`
  (precios reportados, plan vigente pendiente) y `agent-runtime-usage` por cada 1.000 ítems (hipótesis sin medir).
- `resources.review-v4.json` (cambio `sprout-social-inbox.change.json`): `social-inbox` pasa a ser Sprout Social
  Advanced con asientos nominativos: USD 399 por asiento al mes con facturación anual (página oficial, leída el
  10/10/2026) y USD 499 con facturación mensual (guías de terceros). El plan contratado sigue pendiente.
- `resources.review-v5.json` (cambio `sprout-professional-plan.change.json`): agrega Sprout Professional (USD 299 por
  asiento, perfiles ilimitados, sin API ni informes de atención). Es la versión vigente para servicios gestionados.
- `managed-care.workload.json` + `managed-care.brief.json` → `managed-care.demand.json`: servicio gestionado sintético
  dimensionado por volumen; lo verifica `pricing-v3-workload.test.ts` derivando el margen mínimo del catálogo.
- `operational-gaps.json`: faltantes económicos/operativos por owner y acción, sin solicitar otra vez salarios que el operador no tiene.
- `*.assessment.json`, `*.preview.json`: pendientes y precio de simulación redactado; no export comercial autorizado.
- `writer.brief.json`: entrada para scaffold; tareaSEO debe confirmarse, no inferir salario distinto.
- `verification.cli.json`: smoke real de comandos y negativos; exit 3 es estado de revisión, no fallo de cálculo.

Las fuentes temporales se seleccionan por fecha de cotización; el snapshot modela el plazo con esos valores
congelados. Una fuente vencida bloquea una nueva selección; no demuestra por sí sola reajuste contractual futuro.
Las variantes públicas tienen ventana interna de revisión de 30 días, no garantía del proveedor. InvoiceNotion sólo
sustenta el periodo declarado. Créditos adicionales retienen incertidumbre de precio vigente/impuestos/caducidad.

Legacy `v3-catalog/`, `v3-composition/`, Excel/seeds y todos sus artifacts se conservan. Las nuevas fixtures tampoco
se sobrescriben. El próximo costo/plan pide versión y nueva quote. TASK-2017 mantiene economía parcial; API/UI/MCP
canónicos e inventario live tienen frontera propia.

## Contratos, selección y mantenimiento

El catálogo monetario, policy de recursos y catálogo de créditos son tres inputs separados. Las demandas
conservan `commercialUnit`, brief, trabajo/usuarios/tareas, selección IA/servicio, allocations por mes,
presupuestos, FX y cobertura cliente cuando aplica. Los planes añaden portfolio opcional; éste conserva clientes,
parte interna y no asignada con reconciliación. Named seats y paquetes/bundles no se convierten en cuentas
compartidas por repartir costo.

`resources inspect` expone planes y hashes; `catalog validate` expone digest monetario. Mantenimiento monetario
usa change-set incremental; policy/créditos usan replacement completo. Ambos requieren preview/impacto, base
correcta y confirmación del digest para apply, escribiendo un sucesor nuevo. Seleccionar explícitamente rutas de
catálogo/policy/créditos; apply no cambia defaults ni artefactos anteriores.

Las fixtures del diseñador y servicio son simulaciones calculadas; assessment conserva gaps y preview sólo
proyecta precio para revisión. Los ejemplos no financian el interno/no asignado mediante ventas supuestas.
40%/35% son propuesta genérica; Creative Practice conserva 45% bruto aprobado. No usar el diagnóstico genérico
como certificado de cumplimiento del piso de una práctica. Las suscripciones de ChatGPT/Claude no incluyen
consumo API por el hecho de registrar el seat.

Evidencia de TASK-2022:135 tests V3 +78 V2 =213, y 26 smokes de `verification.cli.json`; esos conteos describen el
cierre de implementación, no una corrida nueva por editar este README. Regenerar un caso usa una ruta nueva
`wx`/0600 y el mismo snapshot. Compartir el artefacto interno a un cliente expone costo/margen/fuentes; usar
únicamente proyección allowlist revisada, y nunca inferir autorización de envío desde un preview.
