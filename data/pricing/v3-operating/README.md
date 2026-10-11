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
- `catalog.review-v4.json` (change-set `rounding-fx-confirmed-costs.change.json`, aplicado sobre v3 con
  `catalog preview|apply`): cinco reglas generales de redondeo comercial (`price_rounding`, una por moneda: CLP, USD,
  PEN, COP, MXN), tipo de cambio de cotización desde USD como valor de política con margen prudencial, y los 32
  costos del workbook confirmados por su autor sin cambio de importes. Es el catálogo vigente para cotizaciones
  nuevas, junto con `resources.review-v5.json`; v2 y v3 se conservan como padres congelados.
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

## Delta 2026-10-10 — resumen, veredicto de piso y errores

Decisión y alternativas en el [ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
Ningún artefacto de esta carpeta se regeneró: kernel, versión del motor y digests no cambiaron, y todos siguen
respondiendo `verified: true` a `pricing:v3 replay`.

- `designer.assessment.json` y `service.assessment.json` son evidencia fechada del 2026-10-09 y no traen el campo
  aditivo `margin.policyFloor`. `compose assess` hoy lo agrega; para estos dos artefactos sale con
  `linesBelowFloor: []` (el kernel no marcó ninguna línea en ellos) y el resto del contenido es idéntico.
- `verification.cli.json` registra sólo operación y código de salida; los códigos no cambiaron, así que sigue vigente.
- `operational-gaps.json` suma `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE`, y actualiza
  `MARGIN_FLOOR_SCOPE` (owner CEO; el piso de 45 % sigue siendo la norma y SKY social care 2027 es excepción aprobada).
  *Corrección del mismo día (motor 1.1):* esos dos códigos ya no están en el ledger; se retiraron como resueltos.
- `compose prepare|quote` sobre una demanda de esta carpeta imprime el resumen `pricing-v3-composition-summary/1`
  (`diagnostics`, `reviewSignals`, `marginFloor`, `toolSelections`, atribuciones y caja); el detalle completo queda en
  el artefacto de `--out`. `replay` de una composición responde `{ verified, calculationId, summary }`.
- `compose assess` agrega una brecha `MARGIN_BELOW_POLICY_FLOOR` por línea que el kernel marcó. En `managed-care.*`
  (`catalog.review-v3` + `resources.review-v5`) son las seis líneas, cortas por 0,1 a 0,5 CLP: objetivo y mínimo son
  0,45 y costo y precio se redondean a CLP enteros por separado. `marginAmountShortOfFloor` separa ese redondeo de un
  incumplimiento real; el kernel nunca sube el precio.
  *Corrección del mismo día (motor 1.1):* eso vale para `catalog.review-v3` (contrato 1.0.0). Con `catalog.review-v4`
  la misma demanda se redondea y no marca ninguna línea.
- Un precio acordado se registra como el descuento del brief (`brief.adjustments[]`), no editando un artefacto. Primer
  caso, fuera de esta carpeta:
  [excepción SKY](../../../docs/commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).
  *Corrección del mismo día (motor 1.1):* el ajuste vigente para un precio pactado es `agreed_net`, no un descuento
  con la tasa calculada a mano.
- Los rechazos de la CLI salen por stderr con un `code` del registro `src/lib/finance/pricing-v3/errors.ts`
  (`INPUT_NOT_FOUND`, `OUTPUT_EXISTS`, `SCHEMA_INVALID`…); `ADAPTER_FAILURE` significa caso sin clasificar.

## Delta 2026-10-10 — motor 1.1 y catálogo v4

Decisión: [ADR del motor 1.1](../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
Mantenimiento: [contrato del catálogo](../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md).

- **Archivos nuevos.** `catalog.review-v4.json` (versión `operating-review-2026-10-10-v4`) y
  `rounding-fx-confirmed-costs.change.json`, el change-set que lo produjo desde `catalog.review-v3.json`.
- **Qué usar para cotizar hoy.** `catalog.review-v4.json` + `resources.review-v5.json` +
  `../v3-resources/ai-credits.review-v1.json`. Con v4 toda cotización nueva en CLP, USD, COP, MXN o PEN fechada desde
  el 2026-10-10 se calcula con el contrato 1.1.0 y sale redondeada al múltiplo de su moneda. La CLI sin `--catalog`
  sigue leyendo review-v1: hay que pasar la ruta.
- **Qué no se toca.** `catalog.review-v2.json` y `catalog.review-v3.json` son los padres congelados de los artefactos
  que los usaron. Ningún artefacto de esta carpeta se regeneró: cada uno lleva su catálogo dentro, vuelve a resolver al
  contrato 1.0.0 y responde `verified: true`. La prueba `pricing-v3-frozen-artifacts.test.ts` los reproduce a todos en
  cada corrida.
- **Precio pactado.** Se declara en `brief.adjustments[]` como
  `{ "adjustmentId", "kind": "agreed_net", "amount", "billing": "monthly" | "setup", "lineIds", "reason" }`. El motor
  llega al monto exacto y registra la diferencia como `discount` o `uplift`.
- **Redondeo.** No se declara en la demanda: sale de la regla `price_rounding` del catálogo para la moneda de salida.
  El resumen la reporta en `priceRounding` y el monto en `totals.roundingAdjustment`.
- **Tipo de cambio.** Los `fx` de v4 desde USD son valores de política del operador, no cotizaciones de mercado. La
  referencia EUR→USD sigue fechada sólo el 2026-10-09 y USD→CLF sigue estimado: una demanda posterior que necesite
  EUR queda sin tasa vigente.
- **Costos.** Los 32 costos quedaron confirmados en su importe pero siguen sin país declarado; la resolución los sigue
  reportando como `ESTIMATED_SOURCE` con el supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`.
- **Ledger.** `operational-gaps.json` retiró `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE`,
  agregó `QUOTE_FX_REVIEW` y `COMMERCIAL_ROUNDING_SCOPE`, y actualizó `MARGIN_FLOOR_SCOPE` y `LOCALIZED_TALENT_COSTS`.
- **Corrida del 2026-10-10** con v4 + v5 sobre `managed-care.demand.json`: CLP 9.530.000, y cambiando sólo la moneda
  de salida, USD 9.530,00, COP 34.900.000, MXN 183.300,00 y PEN 35.300,00; todas calculadas, múltiplos de su regla y
  sin líneas marcadas. Con v3 la misma demanda da CLP 9.508.946 y seis líneas marcadas. Evidencia fechada, no fixture:
  la demanda versionada está en CLP y no se escribieron artefactos nuevos en esta carpeta.
