# Pricing V3 — operación local para agentes

TASK-2022 completa el flujo local bajo [ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Manual ejecutable](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) y
[referencia funcional completa](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md).

**Empieza aquí (2026-10-11).** Las versiones vigentes no se nombran a mano: las nombra `current.json`, y un comando
las usa con `--current`. Hoy apunta a `catalog.review-v6.json`, `resources.review-v6.json` y
`../v3-resources/ai-credits.review-v1.json`; la fuente es el comando, no esta línea.

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
```

Cómo funciona el puntero, cómo se mueve y qué archivos son de v6:
[delta del 2026-10-11](#delta-2026-10-11--puntero-de-versiones-vigentes-catálogo-v6-y-policy-v6).
Donde una viñeta o un delta anterior dice «el vigente es…» o «hay que pasar la ruta», léelo como historia fechada.

- `current.json` (`pricing-v3-current/1`): puntero a las versiones vigentes de catálogo, policy y créditos, cada una
  con ruta, versión y digest, más `updatedAt` y `reason`. Es el único archivo de esta carpeta que se reemplaza; se
  mueve con `pricing:v3 current set`, nunca a mano.
- `catalog.review-v2.json` (change-set `eur-reference.change.json`): sucesor generado por preview/apply; añade EUR y
  referenciaECB9 oct 2026,1.1206 USD/EUR.
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
  *Corrección 2026-10-11:* la vigente pasó a ser `resources.review-v6.json`. En v5 cada precio tiene fecha de
  término: una cotización fechada desde el 2026-10-21 se bloquea con `RESOURCE_PRICE_NOT_EFFECTIVE`.
- `resources.review-v6.json` (cambio `stable-unit-prices.change.json`, aplicado sobre v5 con
  `resources preview|apply`): los 25 precios de herramienta rigen hasta que se los reemplace y cada uno lleva una
  fecha de revisión (`reviewBy` 2027-04-11) que avisa sin bloquear. Ningún importe, moneda, unidad ni fuente cambió.
  Es la policy vigente; v2 a v5 se conservan.
- `catalog.review-v4.json` (change-set `rounding-fx-confirmed-costs.change.json`, aplicado sobre v3 con
  `catalog preview|apply`): cinco reglas generales de redondeo comercial (`price_rounding`, una por moneda: CLP, USD,
  PEN, COP, MXN), tipo de cambio de cotización desde USD como valor de política con margen prudencial, y los 32
  costos del workbook confirmados por su autor sin cambio de importes. Es el catálogo vigente para cotizaciones
  nuevas, junto con `resources.review-v5.json`; v2 y v3 se conservan como padres congelados.
  *Corrección 2026-10-11:* el vigente para cotizaciones nuevas pasó a ser `catalog.review-v5.json`; v4 queda como
  padre congelado.
- `catalog.review-v5.json` (change-set `country-factors.change.json`, aplicado sobre v4 con `catalog preview|apply`):
  los 32 costos del workbook declarados como costo de cada perfil en Chile, un factor de talento por país de la
  persona relativo a Chile, y un factor de mercado por país del cliente sobre el precio humano, con
  `floorBasis: "base_market"` en Colombia y Perú. Agrega España como país. Es el catálogo vigente para cotizaciones
  nuevas, junto con `resources.review-v5.json`; v2, v3 y v4 se conservan como padres congelados.
  *Corrección 2026-10-11:* el vigente pasó a ser `catalog.review-v6.json`; v5 queda como padre congelado.
- `catalog.review-v6.json` (change-set `eur-quote-fx.change.json`, aplicado sobre v5 con `catalog preview|apply`):
  agrega un solo registro, el tipo de cambio de cotización EUR→USD de 1,20, vigente desde el 2026-10-11, sin fecha
  de término y marcado como estimado. Es el catálogo vigente; v2 a v5 se conservan como padres congelados.
- `managed-care-colombia.demand.json` → `managed-care-colombia.artifact.json`: el servicio gestionado sintético de
  `managed-care.*` para un cliente de Colombia con equipo en Colombia, en COP y con fecha 2026-10-11. Es el primer
  artefacto firmado por el motor `pricing-v3-local/1.2.0` y el que la guarda de artefactos congelados exige para ese
  motor.
- `managed-care.workload.json` + `managed-care.brief.json` → `managed-care.demand.json`: servicio gestionado sintético
  dimensionado por volumen; lo verifica `pricing-v3-workload.test.ts` derivando el margen mínimo del catálogo.
- `operational-gaps.json`: faltantes económicos/operativos por owner y acción, sin solicitar otra vez salarios que el operador no tiene.
  *Corrección 2026-10-11:* la base de costo quedó decidida (el costo objetivo del Excel de pricing, no la nómina);
  no hay salarios que pedir ni nómina que conectar.
- `*.assessment.json`, `*.preview.json`: pendientes y precio de simulación redactado; no export comercial autorizado.
- `writer.brief.json`: entrada para scaffold; tareaSEO debe confirmarse, no inferir salario distinto.
- `verification.cli.json`: smoke real de comandos y negativos; exit 3 es estado de revisión, no fallo de cálculo.

Las fuentes temporales se seleccionan por fecha de cotización; el snapshot modela el plazo con esos valores
congelados. Una fuente vencida bloquea una nueva selección; no demuestra por sí sola reajuste contractual futuro.
Las variantes públicas tienen ventana interna de revisión de 30 días, no garantía del proveedor. InvoiceNotion sólo
sustenta el periodo declarado. Créditos adicionales retienen incertidumbre de precio vigente/impuestos/caducidad.

*Corrección 2026-10-11:* la ventana de 30 días y el período de la factura de Notion como término del precio valen
para las policies v2 a v5. En v6 un precio unitario de herramienta no vence: rige hasta que una versión nueva lo
reemplaza, y la revisión es una fecha (`reviewBy`) que avisa y nunca bloquea. Lo que sí bloquea sigue siendo una
vigencia dura vencida; `resources inspect` las lista en `priceReview.expired`.

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
*Corrección 2026-10-11:* para usar lo vigente ya no se escriben las rutas: se pasa `--current`. `apply` sigue sin
activar nada; después de emitir una versión en esta carpeta hay que mover el puntero con `current set`.

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
  *Corrección 2026-10-11:* desde hoy se cotiza con `catalog.review-v5.json`; con él, un cliente de Colombia o de
  Perú se calcula con el contrato 1.2.0. Ver el delta siguiente.
  *Corrección 2026-10-11 (posterior):* se cotiza con `--current`, que hoy resuelve a v6 + v6. Ver el último delta.
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
  *Corrección 2026-10-11:* eso vale hasta v5. v6 agrega EUR→USD 1,20 sin fecha de término (estimado).
- **Costos.** Los 32 costos quedaron confirmados en su importe pero siguen sin país declarado; la resolución los sigue
  reportando como `ESTIMATED_SOURCE` con el supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`.
  *Corrección 2026-10-11:* eso vale para v4. En v5 cada costo declara Chile como país de referencia y, con fecha
  desde el 2026-10-11, ni el aviso ni el supuesto aparecen sobre el costo de la persona.
- **Ledger.** `operational-gaps.json` retiró `FLOOR_PRICE_ROUNDS_UNDER_FLOOR` y `AGREED_PRICE_OUTSIDE_ENGINE`,
  agregó `QUOTE_FX_REVIEW` y `COMMERCIAL_ROUNDING_SCOPE`, y actualizó `MARGIN_FLOOR_SCOPE` y `LOCALIZED_TALENT_COSTS`.
- **Corrida del 2026-10-10** con v4 + v5 sobre `managed-care.demand.json`: CLP 9.530.000, y cambiando sólo la moneda
  de salida, USD 9.530,00, COP 34.900.000, MXN 183.300,00 y PEN 35.300,00; todas calculadas, múltiplos de su regla y
  sin líneas marcadas. Con v3 la misma demanda da CLP 9.508.946 y seis líneas marcadas. Evidencia fechada, no fixture:
  la demanda versionada está en CLP y no se escribieron artefactos nuevos en esta carpeta.

## Delta 2026-10-11 — motor 1.2, factores de país y catálogo v5

Decisión: [delta 1.2.0 del ADR del motor](../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado).
Mantenimiento: [factores de país](../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md#factores-de-país-talento-y-mercado-2026-10-11).

- **Archivos nuevos.** `catalog.review-v5.json` (versión `operating-review-2026-10-11-v5`),
  `country-factors.change.json` (el change-set que lo produjo desde `catalog.review-v4.json`),
  `managed-care-colombia.demand.json` y `managed-care-colombia.artifact.json`.
- **Qué usar para cotizar hoy.** `catalog.review-v5.json` + `resources.review-v5.json` +
  `../v3-resources/ai-credits.review-v1.json`. La CLI sin `--catalog` sigue leyendo review-v1: hay que pasar la ruta.
  *Corrección 2026-10-11 (posterior):* se cotiza con `--current`, que hoy resuelve a `catalog.review-v6.json` +
  `resources.review-v6.json` + el mismo catálogo de créditos. Sin `--current` ni `--catalog` la CLI sigue leyendo
  review-v1.
- **Qué no se toca.** `catalog.review-v2.json`, `catalog.review-v3.json` y `catalog.review-v4.json` son los padres
  congelados de los artefactos que los usaron. Ningún artefacto anterior de esta carpeta se regeneró: cada uno
  vuelve a resolver a su contrato y responde `verified: true`.
- **Dos países, dos efectos.** `talentCountry` de cada línea (país de la persona) ajusta el **costo** por el factor
  de talento, relativo a Chile. `offerMarketCountry` (país del cliente) ajusta el **precio del componente humano**
  por el factor de mercado. Herramientas, fees y provisiones no reciben ninguno. Hasta v4 todos los factores de
  mercado valían 1 y ningún costo declaraba país: el país sólo cambiaba moneda y redondeo.
- **Valores de v5**, vigentes desde el 2026-10-11 (la fuente es el JSON):

  | País | Factor de talento | Factor de mercado | Piso sobre el mercado base |
  | --- | --- | --- | --- |
  | CL | 1 (confirmado, por definición) | 1 (confirmado) | no |
  | CO | 0,80 (estimado) | 0,90 (confirmado) | sí |
  | PE | 0,85 (estimado) | 0,95 (estimado) | sí |
  | MX | 0,90 (estimado) | 1 (estimado) | no |
  | US | 5 (estimado) | 1,10 (confirmado) | no |
  | ES | 3 (estimado) | 1,10 (estimado) | no |

  Los factores de talento estimados salen de avisos de empleo y guías salariales leídos el 2026-10-11, uno por país
  para todos los perfiles. Los de mercado confirmados los decidió el operador (CEO) desde los rangos de la hoja
  «Factor País» del workbook, que era una tabla guía que ninguna fórmula referenciaba.
- **Piso en Colombia y Perú.** Su factor de mercado declara `floorBasis: "base_market"`: la cotización se calcula
  con el contrato 1.2.0 y el piso de cada fila acompaña al factor. A precio de política ninguna línea sale marcada,
  aunque el margen real quede cerca de 41 % (CO) y 43 % (PE); un descuento o un neto pactado adicional sí cruza el
  piso. 45 % sigue siendo el piso de los servicios gestionados en el mercado base. El resumen nombra el factor en
  `marketFactor` y muestra siempre el margen real.
- **Fecha de cotización.** Los valores nuevos rigen desde el 2026-10-11. Una demanda con fecha anterior sobre v5
  sigue resolviendo los valores de la época de v4: `managed-care.demand.json` (2026-10-10) sobre v5 da los mismos
  CLP 9.530.000 de la corrida anterior.
- **Costo real por perfil y país.** Cuando exista, se registra como costo `specific` de ese país y reemplaza al
  factor de talento para ese perfil.
  *Corrección 2026-10-11 (posterior):* «costo real» es el costo objetivo de ese perfil en ese país, no la nómina.
  Ver «Base de costo» en el último delta.
- **Lo que todavía no se puede.** Cotizar en EUR a un cliente de España: no hay regla de redondeo ni tipo de cambio
  vigente para EUR (*corrección 2026-10-11:* v6 agrega EUR→USD para costos en EUR; sigue sin haber USD→EUR ni
  redondeo, así que España se cotiza en USD). Factores por tipo de cliente (pyme, licitación, cliente
  estratégico): hoy son un `agreed_net`.
  Factores de talento por perfil o seniority: hoy son un costo específico.
- **Ledger.** `operational-gaps.json` agregó `COUNTRY_FACTORS_UNVALIDATED` (validar cada factor con contrataciones
  reales y con negocios cerrados o perdidos) y actualizó `LOCALIZED_TALENT_COSTS`.
- **Corrida del 2026-10-11** con v5 + v5. `managed-care-colombia.demand.json`: COP 28.100.000 al mes, margen real
  0,4152, ninguna línea marcada; el artefacto versionado responde `verified: true`. La misma demanda con un
  `agreed_net` de 24.000.000: margen 0,3153 y las seis líneas marcadas, cada una con su `floorNet` y
  `netShortOfFloor`. Sobre `managed-care.demand.json` con fecha 2026-10-11 y salida en USD, por cliente / equipo:
  CL/CL 9.530,00 · CL/CO 8.210,00 · CO/CL 8.890,00 · CO/CO 7.690,00 · PE/PE 8.260,00 · MX/MX 8.890,00 ·
  US/CL 10.180,00 · US/US 39.300,00 · ES/ES 24.740,00 · ES/CL 10.180,00; ninguna con líneas marcadas. Salvo el par
  Colombia versionado, es evidencia fechada y no fixture: no se escribieron más artefactos en esta carpeta.
  [Tabla con costo, margen y contrato](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md).

## Delta 2026-10-11 — puntero de versiones vigentes, catálogo v6 y policy v6

Decisiones: [puntero](../../../docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--puntero-a-las-versiones-vigentes),
[precios que no vencen](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--un-precio-unitario-no-vence-vigencia-dura-y-fecha-de-revisión)
y [avisos, exposición y base de costo](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones).

- **Archivos nuevos.** `current.json`; `catalog.review-v6.json` (versión `operating-review-2026-10-11-v6`) y su
  change-set `eur-quote-fx.change.json`; `resources.review-v6.json` (versión `operating-review-2026-10-11-v6`) y su
  cambio `stable-unit-prices.change.json`. No se agregó ni se regeneró ningún artefacto.
- **Qué usar para cotizar hoy.** `--current`. No hace falta escribir ninguna ruta de versión.
- **Qué no se toca.** Las versiones v2 a v5 del catálogo y de la policy, y todos los artefactos. Nunca se borran ni
  se editan: son los padres de los artefactos congelados.

### `current.json`: qué es y cómo se usa

Forma (`pricing-v3-current/1`); cada fuente lleva ruta relativa a la raíz del repositorio, versión y digest:

```jsonc
{
  "schemaVersion": "pricing-v3-current/1",
  "updatedAt": "2026-10-11",
  "reason": "…por qué cambiaron las versiones vigentes…",
  "catalog": { "path": "data/pricing/v3-operating/catalog.review-v6.json", "version": "…", "digest": "…" },
  "policy": { "path": "data/pricing/v3-operating/resources.review-v6.json", "version": "…", "digest": "…" },
  "credits": { "path": "data/pricing/v3-resources/ai-credits.review-v1.json", "version": "…", "digest": "…" }
}
```

- **Usarlo.** `--current` es un interruptor sin valor. Completa cada una de `--catalog`, `--policy` y `--credits` que
  no pasaste, en toda operación que las recibe (`prepare`, `quote`, `catalog *`, `resources *`,
  `compose scaffold|plan|prepare|quote`). Antes verifica versión y digest de cada archivo contra el puntero; si algo
  no coincide rechaza con `CURRENT_VERSIONS_MISMATCH` y no calcula. Un flag explícito gana. En `resources budget`
  completa `--catalog` con el catálogo de créditos.
- **Sin `--current`** todo sigue como antes: sin `--catalog` se lee `../v3-catalog/catalog.review-v1.json`, y
  `--policy` y `--credits` son obligatorios.
- **Verlo.** `pnpm --silent pricing:v3 current show` imprime el puntero, su `pointerDigest`, el `status` de cada
  fuente (`match | version_mismatch | digest_mismatch | invalid | unreadable`) y `consistent`. Exit 0 si todo
  coincide, 2 si no.

### Cómo mover el puntero

Se mueve cada vez que `catalog apply` o `resources apply` emite una versión en esta carpeta (o un
`ai-credits.review-vN.json` en `../v3-resources/`). Si no, `pnpm pricing:v3:test` falla: una prueba exige que el
puntero nombre la versión de número más alto de cada familia, y el mensaje trae el comando.

1. Lee el puntero actual y copia su `pointerDigest`:
   `pnpm --silent pricing:v3 current show`
2. Reemplázalo, siempre con las tres fuentes aunque sólo cambie una:

   ```bash
   pnpm --silent pricing:v3 current set \
     --catalog data/pricing/v3-operating/catalog.review-vN.json \
     --policy data/pricing/v3-operating/resources.review-vN.json \
     --credits data/pricing/v3-resources/ai-credits.review-vN.json \
     --reason "por qué cambian las versiones vigentes" \
     --confirm <pointerDigest del paso 1>
   ```

3. Verifica: `current show` responde `consistent: true` y `pnpm pricing:v3:test` queda en verde.

- Versión y digest los calcula el comando desde los archivos; no se escriben. Las rutas deben estar dentro del
  repositorio.
- `--confirm` que no coincide con el puntero actual: `CURRENT_VERSIONS_CONFLICT` (otro lo movió desde que lo leíste;
  vuelve al paso 1). Sin `--confirm`: `MISSING_ARGUMENT`.
- Para revisar antes de reemplazar: `--out otra-ruta.json` escribe el puntero en otro archivo (si ese archivo no
  existe, sin `--confirm`) y `current show --input otra-ruta.json` lo verifica.
- No edites `current.json` a mano y no escribas en esta carpeta una versión que todavía no deba ser la vigente.

### Los dos cambios que produjeron v6

- `stable-unit-prices.change.json` (`pricing-v3-resource-change/1`, `kind: "policy"`): reemplazo íntegro de la
  policy sobre v5 (lleva el `baseDigest` de v5). Decisión del operador (CEO, 2026-10-11): un precio unitario no
  vence; lo que varía es la cantidad de asientos, que se declara en cada cotización. Los 25 precios de herramienta
  pasan a regir hasta que se los reemplace y cada uno lleva `reviewBy` 2027-04-11. Esa fecha, a seis meses, la eligió
  el agente. Ningún importe, moneda, unidad ni referencia de fuente cambió, y la mayoría de esos precios siguen
  siendo precios públicos de lista marcados como estimados.
- `eur-quote-fx.change.json` (`pricing-v3-catalog-change/1`, `changeId` `operating-eur-quote-fx-2026-10-11`): una
  operación `add` del registro `fx:EUR:USD`, 1,20 USD por EUR (referencia del BCE: 1,1206), vigente desde el
  2026-10-11, sin fecha de término y marcado como estimado. El valor lo eligió el agente bajo la instrucción del
  operador de usar un margen prudencial sobre el spot; no fue decidido expresamente para EUR. El registro del BCE de
  un solo día (`fx:EUR:USD:ECB:2026-10-09`) se conserva.

### Qué cambia al cotizar

- **Fechas.** Con v6 una cotización con fecha posterior ya no se bloquea por la vigencia de un precio de
  herramienta. Con v5 se bloquea desde el 2026-10-21 (`RESOURCE_PRICE_NOT_EFFECTIVE`, primero en Notion).
- **`reviewBy`.** Es una fecha para volver a mirar el precio. Avisa, nunca bloquea y nunca cambia un resultado. Un
  precio cambia sólo emitiendo una versión nueva de la policy.
- **`resources inspect`** devuelve `priceReview`: `reviewDue` (revisiones ya pasadas), `dueSoon` (vigencias duras o
  revisiones dentro de 30 días) y `expired` (vigencias duras ya pasadas).
- **`runNotices`.** `compose prepare|quote` pueden agregar esta clave al resumen. No queda en el artefacto y no
  existe cuando no hay nada que decir. Trae `laterCatalogValues` (la demanda tiene una fecha anterior a valores más
  nuevos del catálogo; antes esta clave iba en la raíz del resumen) y `priceDates` (fechas de los precios que la
  cotización usó). Nunca bloquea: se informa al operador junto al resultado.
- **`estimateExposure`.** El resumen ordena los datos de costo estimados por el costo que descansa sobre cada uno
  (`costAtRisk`, `shareOfCost`, `marginRateLostIfTenPctHigher`), sin recalcular nada. `compose assess` entrega el
  mismo orden en `costEvidencePriority`. Sirve para decidir qué dato confirmar primero; no es pronóstico ni
  validación.
- **Base de costo.** Decisión del operador (CEO, 2026-10-11): los costos por persona del catálogo son el costo
  objetivo, el nivel de remuneración que quiere alcanzar para el equipo, no la nómina actual. El cotizador no usa
  la nómina, y el margen real de hoy sobre las personas es mayor que el que muestra. No propongas conectar la
  nómina ni describas el costo del catálogo como lo que Efeonce paga hoy.
- **Lo que todavía no se puede.** Cotizar en EUR (no hay USD→EUR ni regla de redondeo para EUR; España se cotiza en
  USD). CLF sigue sin regla de redondeo y con un tipo de cambio estimado de 2025. Un registro de factor duplicado
  pasa `catalog preview` y recién bloquea al cotizar, con `AMBIGUOUS_SELECTION`. `compose assess` no lista los
  factores de país estimados como brecha.
- **Ledger.** `operational-gaps.json` agregó `UNIT_PRICE_REVIEW` y actualizó `QUOTE_FX_REVIEW` y
  `LOCALIZED_TALENT_COSTS`.

### Corridas del 2026-10-11 con `--current` (v6 + v6)

- `resources inspect --current --date 2026-10-11`: `priceReview` sin revisiones vencidas ni fechas próximas y con un
  solo `expired`, el registro EUR→USD del BCE de un día. Con la policy v5 a la misma fecha, 24 de los 25 precios
  salían en `dueSoon` por su fecha de término.
- `managed-care-colombia.demand.json`: exit 3 (calculada, requiere revisión), motor `pricing-v3-local/1.2.0`,
  COP 28.100.000 al mes, margen real 0,4152, ninguna línea marcada, sin `runNotices`. Es el mismo neto del artefacto
  versionado, que se calculó con v5 + v5 y sigue respondiendo `verified: true`. `estimateExposure`: el 98,7 % del
  costo descansa sobre datos estimados; el factor de talento de Colombia sobre la referencia de Chile lleva el
  64,7 % del costo y costaría 3,8 puntos de margen si fuera 10 % más alto; la bandeja de Sprout, 17,7 % y 1,0 punto.
- `managed-care.demand.json` (fecha 2026-10-10): CLP 9.530.000, motor `pricing-v3-local/1.1.0`, y `runNotices` con
  `laterCatalogValues`: 45 registros del catálogo vigentes desde el 2026-10-11 que esa fecha no usa.
- La demanda de Colombia con la fecha cambiada a 2026-12-15: con v6 calcula; con la policy v5 queda `needs_input`
  con `RESOURCE_PRICE_NOT_EFFECTIVE` en Notion, Microsoft 365 y la bandeja social.

Evidencia fechada, no fixture: no se escribió ningún artefacto en esta carpeta. `pnpm pricing:v3:test`: 16 archivos
y 501 pruebas.
