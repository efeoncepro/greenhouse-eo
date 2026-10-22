# Pricing V3 — operación local para agentes

TASK-2022 completa el flujo local bajo [ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Manual ejecutable](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) y
[referencia funcional completa](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md).

**Empieza aquí (2026-10-11).** Las versiones vigentes no se nombran a mano: las nombra `current.json`, y un comando
las usa con `--current`. Qué nombra lo imprime `current show`; la fuente es el comando, no esta línea. Como hecho
fechado: la noche del 2026-10-11 eran `catalog.review-v10.json`,
`resources.review-v10.json` y `../v3-resources/ai-credits.review-v1.json` (por la mañana, tras la oferta SEO/AEO,
eran el catálogo v8 y la policy v6; por la tarde el catálogo pasó a v9 y la policy por v7, v8, v9 y v10; por la
noche el catálogo pasó a v10). El siguiente catálogo sería v11. La policy pasó a v11 esa noche
(`resources.review-v11.json`, cambio `adobe-price-decided.change.json`: el precio de Adobe sin descuento queda
`confirmed`; ningún monto cambia). Y con la última emisión del 2026-10-11 el catálogo pasó a v11
(`catalog.review-v11.json`, versión `operating-review-2026-10-11-v11`, cambio `offer-commercial-unit.change.json`:
cada oferta declara la unidad comercial con que se vende; ningún precio, costo, factor ni política cambia). Desde
entonces el puntero nombra catálogo v11, policy v11 y créditos v1, y el siguiente catálogo sería v12.

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
```

Cómo funciona el puntero, cómo se mueve y qué archivos son de v6:
[delta del 2026-10-11](#delta-2026-10-11--puntero-de-versiones-vigentes-catálogo-v6-y-policy-v6). Qué es el catálogo
v7: [delta de staffing](#delta-2026-10-11--catálogo-v7-piso-de-margen-de-staffing). Qué traen el catálogo v9 y las
policies v7 y v8 (forma del engagement, puesta en marcha, Adobe como se factura, plazos de compromiso y tres
lecturas nuevas):
[delta del catálogo v9](#delta-2026-10-11--catálogo-v9-y-policies-v7-y-v8-forma-del-engagement-puesta-en-marcha-adobe-y-lecturas).
Qué trae el catálogo v10 (costos de terceros de un encargo, reserva de contingencia y factores de país cerrados) y
cómo se lee una cotización con terceros:
[delta del catálogo v10](#delta-2026-10-11--catálogo-v10-y-contrato-140-costos-de-terceros-reserva-de-contingencia-y-factores-de-país).
Cómo sale el documento de cotización para el cliente de una cotización congelada (`compose document`) y qué ejemplos
lo muestran:
[delta del documento](#delta-2026-10-11--compose-document-el-documento-de-cotización-de-una-cotización-congelada).
Cómo se declaran los asientos de una herramienta tal como se compran, los meses iguales una sola vez, las opciones y
la cortesía de un documento, y qué hace `--out` cuando la cotización no calcula:
[último delta](#delta-2026-10-11--asientos-como-se-compran-períodos-declarados-una-vez-opciones-y-cortesía-del-documento-y---out).
Cómo se lee un adicional opcional que amplía la cotización base (`compose increment`, `compose document --increment`)
y qué deja fuera del cotizador la decisión de que una cotización no es un contrato:
[delta del cierre](#delta-2026-10-11-cierre--compose-increment-un-adicional-que-amplía-la-base-se-lee-como-un-incremento).
Qué trae el catálogo v11 y lo que se agregó con él —un precio por todo el trabajo (`agreed_total`), la unidad
comercial de cada oferta, la evidencia de la dedicación, `compose assess` contra el piso de la propia oferta y el
documento de un precio de programa o de proyecto (`combine`)—:
[delta del catálogo v11](#delta-2026-10-11-última--catálogo-v11-un-precio-por-todo-el-trabajo-la-unidad-de-cada-oferta-y-la-evidencia-de-las-horas).
Donde una viñeta o un delta anterior dice «el vigente es…», «último delta» o «hay que pasar la ruta», léelo como
historia fechada.

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
  *Corrección 2026-10-11 (tarde):* dejó de ser la vigente ese mismo día; v6 queda como padre congelado.
- `resources.review-v7.json` (cambio `adobe-invoice.change.json`, aplicado sobre v6 con `resources preview|apply`):
  Adobe como lo factura el proveedor. Dos productos en CLP con IVA, tres licencias cada uno: `adobe` (Creative Cloud
  Pro, que ya incluye Express) y `adobe-express` (para Social Media Manager, Community Manager, Content Manager y
  Content Creator). Agrega la tarea `express-design`, el precio `renewal-scenario` para cuando termine el descuento
  y el campo `commitmentTermMonths` (12 en Adobe). El «Adobe 180 combinado, 306 condicional» de v2 a v6 ya no rige.
- `adobe-invoice.change.json` (`pricing-v3-resource-change/1`, `kind: "policy"`): el reemplazo íntegro que produjo
  v7 desde v6.
- `resources.review-v8.json` (cambio `supplier-contract-terms.change.json`, aplicado sobre v7): sólo agrega plazos
  de compromiso, dichos por el CEO el 2026-10-11: Notion 1 mes y los dos precios mensuales de Microsoft 365 1 mes.
  Ningún importe, moneda ni unidad cambió.
- `supplier-contract-terms.change.json` (`pricing-v3-resource-change/1`, `kind: "policy"`): el reemplazo íntegro que
  produjo v8 desde v7.
- `resources.review-v9.json` (cambio `microsoft-invoice-adobe-renewal.change.json`, aplicado sobre v8): tres hechos
  que el CEO mostró el 2026-10-11. Microsoft 365 como se factura (factura G185142527 del 2026-09-16: Business
  Standard, USD 14,70 por licencia al mes, seis licencias, sin impuesto); su precio `current` deja de estar
  pendiente. Notion como se factura (factura 0D8C80A9-0039 del 2026-09-21: Business mensual, nueve miembros a USD
  24, más 3000 créditos a USD 30, sin impuesto); mismos importes, ahora citan la factura. Y la fecha en que renueva
  el contrato de Adobe, 2026-11-16, en el campo nuevo `commitmentRenewsOn`, que pasa a ser también su `reviewBy`.
- `microsoft-invoice-adobe-renewal.change.json` (`pricing-v3-resource-change/1`, `kind: "policy"`): el reemplazo
  íntegro que produjo v9 desde v8.
- `resources.review-v10.json` (cambio `adobe-without-discount.change.json`, aplicado sobre v9): Creative Cloud Pro
  se cotiza sin su descuento, por decisión del CEO del 2026-10-11. El `current` de `adobe` pasa a CLP 325.405,5 al
  mes (estimado); el importe facturado con descuento queda como `invoiced-with-discount` (CLP 162.605, confirmado),
  sólo por elección explícita; `renewal-scenario` desaparece. Nada más cambia.
- `adobe-without-discount.change.json` (`pricing-v3-resource-change/1`, `kind: "policy"`): el reemplazo íntegro que
  produjo v10 desde v9.
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
  *Corrección 2026-10-11 (posterior):* el vigente pasó a ser `catalog.review-v7.json`; v6 queda como padre congelado.
- `catalog.review-v7.json` (change-set `staffing-margin-floor.change.json`, aplicado sobre v6 con
  `catalog preview|apply`): las 32 políticas de precio de `talent-assurance-staffing` (una persona vendida por
  dedicación) pasan del recargo histórico con mínimo 0 a margen objetivo por tier (0,30 / 0,30 / 0,35 / 0,40) con
  `minimumMargin` 0,25, desde el 2026-10-11. Piso y objetivos: decisión del CEO (los objetivos sobre propuesta del agente).
  *Corrección 2026-10-11 (posterior):* el vigente pasó a ser `catalog.review-v8.json`; v7 queda como padre congelado.
- `staffing-margin-floor.change.json` (`pricing-v3-catalog-change/1`): los 32 `replace` que produjeron v7 desde v6.
- `catalog.review-v8.json` (change-set `seo-aeo-managed-service.change.json`, aplicado sobre v7 con
  `catalog preview|apply`): agrega la oferta `seo-aeo-managed-service`, los servicios gestionados de la práctica
  SEO/AEO, con 32 políticas de precio (margen objetivo 0,55, `minimumMargin` 0,45, `confirmed`) vigentes desde el
  2026-10-11. No toca ninguna política existente. Es el catálogo que nombra el puntero al 2026-10-11.
  *Corrección 2026-10-11 (tarde):* el puntero pasó a `catalog.review-v9.json` ese mismo día; v8 queda como padre
  congelado.
- `seo-aeo-managed-service.change.json` (`pricing-v3-catalog-change/1`): los 32 `add` que produjeron v8 desde v7.
- `catalog.review-v9.json` (change-set `engagement-forms-setup-clp.change.json`, aplicado sobre v8 con
  `catalog preview|apply`): la forma del engagement como registro `engagement_factor` (`engagement:on_going` con
  razón 1 y `engagement:on_demand` con razón 1,10); dos provisiones de puesta en marcha por persona
  (`provision-account-onboarding`, USD 200, por defecto; `provision-recruiting`, USD 500, opcional), con la revisión
  2 de los siete kits de staffing y el retiro de `trial-setup`; y `fx:CLP:USD` = 0,001. Todo vigente desde el
  2026-10-11. No toca políticas de precio ni pisos.
- `engagement-forms-setup-clp.change.json` (`pricing-v3-catalog-change/1`): las 13 operaciones que produjeron v9
  desde v8 (5 `add`, 7 `replace` y 1 `retire`).
- `catalog.review-v10.json` (change-set `third-party-contingency-factors.change.json`, aplicado sobre v9 con
  `catalog preview|apply`): cinco reglas de precio para costos de terceros, una por categoría (`third_party_policy`:
  `production`, `talent` y `printing` con recargo de 10 %, piso 5 % y redondeo comercial; `media` y `licences` al
  costo, sin redondeo); dos reservas de contingencia (`contingency_reserve`: 12 % del costo de las personas para
  `creative-managed-service` y `seo-aeo-managed-service` vendidos On-Demand), todo `estimated` y vigente desde el
  2026-10-11; y los factores de país que seguían estimados, cerrados como valores de política `confirmed` desde el
  2026-10-12. No toca políticas de precio ni pisos. Las tasas y la reserva son estimaciones propuestas por el agente
  que el CEO aceptó; los factores de país los cerró el CEO.
- `third-party-contingency-factors.change.json` (`pricing-v3-catalog-change/1`): las 15 operaciones que produjeron
  v10 desde v9 (7 `add` y 8 `replace`).
- `managed-care-colombia.demand.json` → `managed-care-colombia.artifact.json`: el servicio gestionado sintético de
  `managed-care.*` para un cliente de Colombia con equipo en Colombia, en COP y con fecha 2026-10-11. Es el primer
  artefacto firmado por el motor `pricing-v3-local/1.2.0` y el que la guarda de artefactos congelados exige para ese
  motor.
  *Corrección 2026-10-11 (tarde):* el artefacto sigue respondiendo `verified: true`. La demanda, cotizada de nuevo
  con `--current`, queda `needs_input` con `RESOURCE_ALLOCATION_REQUIRED` para `adobe-express`: sus dos líneas de
  Community Manager incluyen `express-design` desde la policy v7. Para volver a cotizarla hay que declarar esa
  asignación o excluir la tarea con motivo (`work[].excludedProfileTasks`).
- `designer-on-demand.demand.json` → `designer-on-demand.artifact.json`: un mes de un diseñador senior dedicado en
  Chile, On-Demand, en CLP, con una licencia de tres de Creative Cloud Pro, Higgsfield y Magnific. Es el primer
  artefacto firmado por el motor `pricing-v3-local/1.3.0` y el que la guarda exige para ese motor. Se congeló con el
  catálogo v9 y la policy v7.
- `managed-on-demand-third-party.demand.json` → `managed-on-demand-third-party.artifact.json`: un servicio
  gestionado creativo vendido On-Demand en Chile, un período, en CLP, con cuatro costos de terceros declarados: una
  producción en CLP, talento en USD y medios al costo, refacturados, y una licencia que el cliente paga directo. Es
  el primer artefacto firmado por el motor `pricing-v3-local/1.4.0` y el que la guarda exige para ese motor. Los
  proveedores del ejemplo son marcadores, no proveedores reales. Se congeló con el catálogo v10 y la policy v10.
- `designer-three-months-iva.demand.json` → `designer-three-months-iva.artifact.json`: el mismo diseñador senior
  dedicado en Chile, On-Demand y en CLP, por **tres meses** y con un impuesto resuelto: IVA de 19 %, declarado sólo
  para el ejemplo y no como criterio tributario para ningún cliente. Es la primera cotización versionada con varios
  períodos y con impuesto. Motor `pricing-v3-local/1.3.0`; se congeló con el catálogo v10 y la policy v11.
- `designer-startup-courtesy.demand.json` → `designer-startup-courtesy.artifact.json`: la demanda de
  `designer-three-months-iva` con un ajuste más, un neto pactado de cero sobre la puesta en marcha
  (`kind: "agreed_net"`, `amount: "0"`, `billing: "setup"`), declarado sólo para el ejemplo y no como una aprobación
  comercial. Es el ejemplo de una línea bonificada: su fila de puesta en marcha queda en neto cero y conserva el
  precio que tenía antes de la rebaja, que el documento imprime como valor de referencia. Motor
  `pricing-v3-local/1.3.0`; se congeló con el catálogo v10 y la policy v11.
- `designer-startup-courtesy.option-copywriter.demand.json` → `.option-copywriter.artifact.json` y
  `designer-startup-courtesy.option-motion.demand.json` → `.option-motion.artifact.json`: las cotizaciones de dos
  opciones adicionales de ese documento, cada una sola. La primera es un redactor por tres meses iguales, con su
  puesta en marcha dejada fuera por un ajuste declarado; la segunda, una persona de video por un mes, con su puesta
  en marcha dentro. Las dos tienen el mismo neto en todos sus períodos, que es lo que el documento exige para
  imprimirlas como un solo importe. Motor `pricing-v3-local/1.3.0`, catálogo v10 y policy v11.
- `designer-startup-courtesy.document-brief.json` → `designer-startup-courtesy.document.json`: el brief marca la
  puesta en marcha con `courtesy: true` y nombra las dos opciones (`options`, `optionsTexts`); los datos se emiten
  con `compose document` y un `--option` por opción.
- `managed-addon-increment.demand.json` → `managed-addon-increment.artifact.json`: la cotización base del ejemplo de
  un adicional leído como incremento. Un servicio gestionado On-Going de tres meses, con tres líneas (una persona
  dedicada, un líder al 20 % y un especialista al 10 %), un fee mensual pactado e IVA de 19 %; todo declarado sólo
  para el ejemplo, no como una aprobación comercial ni un criterio tributario. Motor `pricing-v3-local/1.3.0`; se
  congeló con el catálogo v10, la policy v11 y los créditos v1.
- `managed-addon-increment.with-addon.demand.json` → `managed-addon-increment.with-addon.artifact.json`: el mismo
  servicio **con el adicional adentro**. Es la demanda base con tres cambios: la dedicación del líder pasa de `0.2` a
  `0.28` en su misma línea, las dos herramientas que se reparten por dedicación declarada suben con ella, y el neto
  pactado mensual sube en el precio pactado del adicional. Mismas fuentes, misma fecha y los mismos tres períodos.
  Es el artefacto que reciben `compose increment --input` y `compose document --increment`.
- `managed-addon-increment.option-standalone.demand.json` → `.option-standalone.artifact.json`: el mismo adicional
  cotizado **solo**, como una línea nueva del líder al 8 %, con su precio pactado. Está para comparar: muestra el
  costo que una cotización suelta le pone a un adicional que sólo amplía a una persona de la base. No es la forma de
  entregar ese adicional.
- `managed-addon-increment.increment.json`: la lectura `pricing-v3-quote-increment/1` que `compose increment` emite
  con los dos primeros artefactos. Es interna: trae costo y margen. No se edita: se vuelve a emitir.
- `managed-addon-increment.document-brief.json` → `managed-addon-increment.document.json`: el brief nombra el
  adicional en `options` con la clave `conversations` (el comprador es inventado); los datos se emiten con
  `compose document` sobre la base y `--increment conversations=<el artefacto con el adicional>`. `source` registra
  `option1Basis: "increment"`.
- `<nombre>.document-brief.json` → `<nombre>.document.json`, para `designer-on-demand`, `designer-three-months-iva`
  y `managed-on-demand-third-party`: el brief del documento de cotización (sólo textos y presentación; el comprador
  es inventado) y los datos que `compose document` emite desde el artefacto del mismo nombre, en la versión 2 de los
  datos de la [plantilla A4 de cotización](../../../docs/commercial/templates/cotizacion-a4/README.md). Un
  `.document.json` no se edita: se vuelve a emitir.
- `managed-care.workload.json` + `managed-care.brief.json` → `managed-care.demand.json`: servicio gestionado sintético
  dimensionado por volumen; lo verifica `pricing-v3-workload.test.ts` derivando el margen mínimo del catálogo.
- `operational-gaps.json`: faltantes económicos/operativos por owner y acción, sin solicitar otra vez salarios que el operador no tiene.
  *Corrección 2026-10-11:* la base de costo quedó decidida (el costo objetivo del Excel de pricing, no la nómina);
  no hay salarios que pedir ni nómina que conectar.
  *Cambios 2026-10-11 (tras el primer caso real):* `NAMED_SEATS_UNDER_TWO_PLANS` quedó cerrado el mismo día en que
  se abrió (el ítem se conserva, con «nada pendiente»), y se agregó `OPTION_QUOTES_REPEAT_PER_LINE_FEES`.
  *Cambio 2026-10-11 (cierre):* `OPTION_QUOTES_REPEAT_PER_LINE_FEES` quedó cerrado ese mismo día: un adicional que
  amplía a personas de la base se lee con `compose increment` (el ítem se conserva, con «nada pendiente»).
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
*Corrección 2026-10-11 (cierre):* bajo `expired` queda sólo lo que de verdad bloquea. Un registro del catálogo cuya
vigencia pasó y al que otro registro vigente responde sale bajo `priceReview.superseded`, sin bloqueo.

Legacy `v3-catalog/`, `v3-composition/`, Excel/seeds y todos sus artifacts se conservan. Las nuevas fixtures tampoco
se sobrescriben. El próximo costo/plan pide versión y nueva quote. TASK-2017 mantiene economía parcial; API/UI/MCP
canónicos e inventario live tienen frontera propia.

## Contratos, selección y mantenimiento

El catálogo monetario, policy de recursos y catálogo de créditos son tres inputs separados. Las demandas
conservan `commercialUnit`, brief, trabajo/usuarios/tareas, selección IA/servicio, allocations por mes,
presupuestos, FX y cobertura cliente cuando aplica. Los planes añaden portfolio opcional; éste conserva clientes,
parte interna y no asignada con reconciliación. Named seats y paquetes/bundles no se convierten en cuentas
compartidas por repartir costo.
*Corrección 2026-10-11 (tras el primer caso real):* «allocations por mes» admite ahora varios planes de una
herramienta en un mes, y un mes igual a otros se declara una vez con `periodIds`. Repartir un costo sigue sin ser
permiso para compartir una cuenta; que dos personas usen un asiento se declara aparte, con su motivo (`seatSharing`),
y un asiento pagado sin uso, con `idleSeats`. Ver el
[último delta](#delta-2026-10-11--asientos-como-se-compran-períodos-declarados-una-vez-opciones-y-cortesía-del-documento-y---out).

`resources inspect` expone planes y hashes; `catalog validate` expone digest monetario. Mantenimiento monetario
usa change-set incremental; policy/créditos usan replacement completo. Ambos requieren preview/impacto, base
correcta y confirmación del digest para apply, escribiendo un sucesor nuevo. Seleccionar explícitamente rutas de
catálogo/policy/créditos; apply no cambia defaults ni artefactos anteriores.
*Corrección 2026-10-11:* para usar lo vigente ya no se escriben las rutas: se pasa `--current`. `apply` sigue sin
activar nada; después de emitir una versión en esta carpeta hay que mover el puntero con `current set`.

Las fixtures del diseñador y servicio son simulaciones calculadas; assessment conserva gaps y preview sólo
proyecta precio para revisión. Los ejemplos no financian el interno/no asignado mediante ventas supuestas.
40%/35% son propuesta genérica; Creative Practice conserva 45% bruto aprobado. No usar el diagnóstico genérico
como certificado de cumplimiento del piso de una práctica.
*Corrección 2026-10-11 (última):* esa propuesta 40%/35% ya no existe en `compose assess`. Se retiró: `margin` trae
la regla de precio de la oferta de cada línea (`pricingPolicies[]`) y `belowPolicyFloor`. Los archivos
`designer.assessment.json` y `service.assessment.json` de esta carpeta son salidas congeladas de antes y conservan
las claves antiguas. Las suscripciones de ChatGPT/Claude no incluyen
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
  *Corrección 2026-10-11 (posterior):* se cotiza con `--current`; a qué resuelve lo imprime `current show` (al
  2026-10-11, catálogo v8 + policy v6). Ver los últimos deltas.
  *Corrección 2026-10-11 (tarde):* ese paréntesis es de la mañana. Por la tarde `current show` imprimía el
  catálogo v9 y la policy v8, y al cierre del día la policy v10; puede haber cambiado después.
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
  *Corrección 2026-10-11 (posterior):* se cotiza con `--current`; a qué resuelve lo imprime `current show` (al
  2026-10-11, `catalog.review-v8.json` + `resources.review-v6.json` + el mismo catálogo de créditos). Sin `--current`
  ni `--catalog` la CLI sigue leyendo review-v1.
  *Corrección 2026-10-11 (tarde):* ese paréntesis es de la mañana; por la tarde eran el catálogo v9 y la policy
  v8. La fuente es `current show`.
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
  *Corrección 2026-10-11 (noche):* la tabla es la de v5. El CEO cerró los factores de país ese mismo día («deja eso
  cerrado ya»): en el catálogo v10 todos los que aquí dicen «estimado» son valores de política `confirmed` desde el
  2026-10-12, con los mismos valores. Una cotización fechada el 2026-10-11 todavía lee la estimación.
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
  *Corrección 2026-10-11 (noche):* `COUNTRY_FACTORS_UNVALIDATED` quedó cerrado por el CEO; no es un pendiente del
  operador. Un factor se revisa sólo si una contratación real o un negocio cerrado en ese país lo contradice.
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
  *Corrección 2026-10-11 (noche):* lo último dejó de importar desde el 2026-10-12: con el catálogo v10 ningún
  factor de país es estimado.
- **Ledger.** `operational-gaps.json` agregó `UNIT_PRICE_REVIEW` y actualizó `QUOTE_FX_REVIEW` y
  `LOCALIZED_TALENT_COSTS`.

### Corridas del 2026-10-11 con `--current` (v6 + v6)

- `resources inspect --current --date 2026-10-11`: `priceReview` sin revisiones vencidas ni fechas próximas y con un
  solo `expired`, el registro EUR→USD del BCE de un día (así se leía ese día; desde el cierre del 2026-10-11 ese
  registro sale bajo `superseded`, con `supersededBy` `fx:EUR:USD`, y `expired` queda vacío). Con la policy v5 a la misma fecha, 24 de los 25 precios
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

## Delta 2026-10-11 — catálogo v7: piso de margen de staffing

Decisión: [delta del ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--piso-de-margen-de-staff-augmentation-catálogo-v7).

- **Archivos nuevos.** `catalog.review-v7.json` (versión `operating-review-2026-10-11-v7`) y su change-set
  `staffing-margin-floor.change.json`. El puntero pasó a nombrar el catálogo v7; policy y créditos no cambiaron.
- **Qué cambia.** La oferta `talent-assurance-staffing` tiene piso de margen de 25 % (decisión del CEO, 2026-10-11)
  y un objetivo de 30 %, 35 % o 40 % según el tier del perfil (propuesto por el agente y confirmado por el CEO el
  mismo día; `confirmed`, `COMMERCIAL_POLICY` en el ledger). Un neto acordado bajo el piso sale marcado `MARGIN_BELOW_FLOOR`.
- **Qué no cambia.** `creative-managed-service` (45/45), el resto de v6 y todos los artefactos. Una cotización con
  fecha anterior al 2026-10-11 conserva el recargo histórico. El siguiente catálogo fue `catalog.review-v8.json`
  (delta siguiente).

## Delta 2026-10-11 — catálogo v8: oferta de la práctica SEO/AEO

Decisión: [delta del ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--oferta-propia-de-la-práctica-seoaeo-catálogo-v8).

- **Archivos nuevos.** `catalog.review-v8.json` (versión `operating-review-2026-10-11-v8`) y su change-set
  `seo-aeo-managed-service.change.json`. El puntero pasó a nombrar el catálogo v8; policy y créditos no cambiaron.
- **Qué agrega.** Una tercera oferta, `seo-aeo-managed-service` (servicios gestionados de la práctica SEO/AEO): 32
  registros `pricing:<profileId>:seo-aeo-managed-service`, revisión 1, con margen objetivo 55 % y piso 45 %. El piso
  lo aprobó el CEO el 2026-07-13; el objetivo, extremo bajo de la banda 55–60 % de esa práctica, lo propuso el agente
  y el CEO lo confirmó el 2026-10-11 (`confirmed`, `COMMERCIAL_POLICY` en el ledger).
- **Tres ofertas, tres políticas.** `creative-managed-service` (práctica creativa, 45/45), `seo-aeo-managed-service`
  (práctica SEO/AEO, 55/45) y `talent-assurance-staffing` (una persona por dedicación, 30/35/40 por tier con piso 25).
  Son 96 políticas de precio vigentes, más las 32 revisiones reemplazadas de staffing.
- **Qué no cambia.** Las otras dos ofertas, el resto de v7 y todos los artefactos. La oferta nueva rige para
  cotizaciones fechadas desde el 2026-10-11. El siguiente catálogo sería `catalog.review-v9.json`.
  *Corrección 2026-10-11 (tarde):* v9 se emitió ese mismo día (último delta). Las tres ofertas no cambiaron.
- **Medido el 2026-10-11.** `managed-care.demand.json` copiado fuera de esta carpeta con
  `offerId: "seo-aeo-managed-service"` y fecha 2026-10-11, con `--current`: CLP 11.640.000 al mes, margen 0,5507, motor
  `pricing-v3-local/1.1.0`, ninguna línea bajo el piso. Evidencia fechada, no fixture.
  *Corrección 2026-10-11 (tarde):* con la policy v7 en adelante esa misma copia queda `needs_input`
  (`RESOURCE_ALLOCATION_REQUIRED` para `adobe-express`). Excluyendo `express-design` en las dos líneas de Community
  Manager, con motivo, vuelve a dar lo mismo: CLP 11.640.000, margen 0,5507, motor 1.1.0, ninguna línea bajo el piso.

## Delta 2026-10-11 — catálogo v9 y policies v7 y v8: forma del engagement, puesta en marcha, Adobe y lecturas

Decisiones: [contrato 1.3.0](../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-130-la-forma-del-engagement-como-dato-propio),
[puesta en marcha](../../../docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--provisiones-de-puesta-en-marcha-costeadas-catálogo-v9),
[Adobe, CLP y plazo de compromiso](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--plazo-de-compromiso-de-una-licencia-adobe-como-se-factura-y-costos-en-clp)
y [tres lecturas](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos).

- **Archivos nuevos.** `catalog.review-v9.json` y su change-set `engagement-forms-setup-clp.change.json`;
  `resources.review-v7.json` y su cambio `adobe-invoice.change.json`; `resources.review-v8.json` y su cambio
  `supplier-contract-terms.change.json`; `resources.review-v9.json` y su cambio
  `microsoft-invoice-adobe-renewal.change.json`; `resources.review-v10.json` y su cambio
  `adobe-without-discount.change.json`; `designer-on-demand.demand.json` y `designer-on-demand.artifact.json`. El
  puntero quedó, al cierre del 2026-10-11, en catálogo v9 + policy v10 + créditos v1; lo vigente lo imprime
  `current show`.
  *Corrección 2026-10-11 (noche):* esa noche el puntero pasó a catálogo v10 (delta siguiente).
- **Qué no se toca.** Las versiones anteriores y todos los artefactos. Las tres ofertas y sus pisos no cambiaron.
- **Forma del engagement.** El brief admite `"engagementForm": "on_going" | "on_demand"` (los ids son datos del
  catálogo). Es aparte de `engagementCode`, que sigue en `monthly` y sigue eligiendo la política. On-Demand lleva una
  razón de 1,10 sobre el precio de toda la fila; el costo y el piso no se mueven, así que la prima cuenta como
  margen. Con el campo, la cotización sale con el motor `pricing-v3-local/1.3.0`; sin él, nada cambia y el resultado
  no dice qué forma se asumió. No hay Hybrid (se cotiza como dos cotizaciones) ni Licence/Consulting.
- **Puesta en marcha.** Cada persona que entra a una cuenta lleva `provision-account-onboarding` (USD 200, una vez).
  El reclutamiento es opcional: `"choices": [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]`
  (USD 500, una vez). Las dos son estimaciones propuestas por el agente y aceptadas por el CEO. La regla del
  workbook de cobrar un mes del recurso no entra al cotizador. `managed-service-core` no tiene puesta en marcha.
- **Adobe.** Dos productos en CLP con IVA, tres licencias cada uno: Creative Cloud Pro y Adobe Express (CLP 16.240
  al mes). La demanda que use una herramienta en CLP nombra `fx:CLP:USD` en `fxRecordIds`. Creative Cloud Pro se
  factura hoy con 50 % de descuento (CLP 162.605 al mes) y el CEO espera que termine en unos dos meses; que termine
  justo en la renovación del 2026-11-16 no está confirmado. Desde la policy v10, por decisión del CEO, **se cotiza
  sin el descuento**: `current` es CLP 325.405,5 al mes por las tres licencias (valor decidido por el CEO sobre el precio de
  lista de la factura; `confirmed` desde la policy v11), y una licencia de tres es CLP 108.468,5. El importe facturado sigue disponible como
  `invoiced-with-discount` (una licencia: CLP 54.202), sólo para un trabajo que termina antes que el descuento y
  sólo si el operador lo elige. Ya no existe `renewal-scenario`.
- **Plazo de compromiso** (`commitmentTermMonths`, en la entrada de precio): por cuántos meses hay que pagar una
  licencia una vez tomada. Es un dato del asiento, no del contrato firmado. Adobe 12 (la cuenta no baja al quitar
  una licencia hasta que el contrato renueva); Notion 1; Microsoft 365 1 (contrato anual, pero quitar una licencia
  baja la cuenta). Sin el campo la lectura dice «no declarado», que no es «sin compromiso». Desde la policy v9 la
  entrada admite además `commitmentRenewsOn` (fecha ISO, sólo junto con el plazo): la fecha en que renueva el
  contrato. Con ella `compose commitments` cuenta lo que queda del plazo en curso; la licencia queda atada hasta la
  primera renovación posterior al último mes cotizado (`commitment.boundUntil`). Adobe la declara: 2026-11-16.
  Límite conocido: un precio con plazo y sin fecha se sigue leyendo como un plazo entero desde el primer mes
  cotizado, que para un contrato que ya corre es un techo y no una medida; con fecha, un mes cubierto en parte
  cuenta entero.
- **Tres lecturas de un artefacto congelado**, además de `compose split`. Ninguna forma un precio y las tres salen
  con exit 3:

  ```bash
  pnpm --silent pricing:v3 compose schedule --input artifact.json --milestones milestones.json
  pnpm --silent pricing:v3 compose cash --input artifact.json
  pnpm --silent pricing:v3 compose commitments --input artifact.json
  ```

  `schedule` reparte el neto en hitos (`[{ "id", "label", "share", "periodId" | "when" }]`; las participaciones
  suman exactamente 1). `cash` separa el costo por naturaleza, la caja nueva a proveedores y la caja sobre capacidad
  contratada, que no es margen ni decide precio. `commitments` lista lo que queda comprometido con proveedores
  después del último período; es para engagements acotados, no un aviso de rutina.
- **Demandas anteriores.** Una demanda escrita para la policy v6 con Social Media Manager, Community Manager, Content
  Manager o Content Creator queda `needs_input` con `--current` (`RESOURCE_ALLOCATION_REQUIRED` para
  `adobe-express`) hasta que declare la asignación o excluya `express-design` con motivo.
- **Lo que todavía no se puede.** Decir si un asiento se compra para el trabajo. *Corrección 2026-10-11 (cierre):*
  esta lista traía «declarar el plazo del contrato con el cliente». No es algo que falte: el CEO decidió que la
  duración del contrato y la fecha de inicio del servicio quedan fuera del cotizador, porque una cotización no es un
  contrato. Una cotización sigue teniendo períodos, no un plazo. Un engagement de menos de un mes se expresa como horas dentro de un
  período. No se modelan costos de terceros de un encargo ni una reserva de contingencia para alcance fijo.
  *Corrección 2026-10-11 (noche):* lo último dejó de ser cierto ese mismo día: los dos se modelan desde el contrato
  1.4.0 y el catálogo v10 (delta siguiente).

### Corridas del 2026-10-11

- `designer-on-demand.artifact.json`: `replay` responde `verified: true`. Motor `pricing-v3-local/1.3.0`, costo
  1.768.438, neto CLP 2.790.000, margen 0,3661, `engagementAdjustment` 252.635, ninguna línea marcada. Congeló la
  policy v7: Adobe con descuento. Las cinco viñetas siguientes son de ese artefacto.
- La misma demanda sin `engagementForm`, con las versiones del artefacto: motor 1.1.0, mismo costo, neto CLP
  2.540.000, margen 0,3037.
- `compose split --tools adobe,higgsfield,magnific` sobre el artefacto: kit 190.000 y persona 2.600.000.
- `compose schedule` con 50/30/20: 1.400.000, 840.000 y 550.000.
- `compose cash`: personas 1.310.000, provisiones 50.000, fee de plataforma 49.000, puesta en marcha 200.000,
  herramientas 159.438 (créditos 64.436 y asientos 95.002); caja nueva a proveedores 43.770; caja sobre capacidad
  contratada 2.746.230.
- `compose commitments` sobre el artefacto (policy v7): un solo compromiso, la licencia de Adobe, leído como
  liberado al paquete compartido; Notion y Microsoft 365 salen como plazo no declarado. El artefacto no conoce la
  fecha de renovación: su lectura supone un plazo entero y sus importes son un techo.
- La misma demanda vuelta a cotizar con `--current` (policy v10, fuera de esta carpeta): costo 1.822.704, neto CLP
  2.870.000, margen 0,3649, `engagementAdjustment` 260.387, porque Creative Cloud Pro entra sin descuento; sin
  `engagementForm`, neto CLP 2.610.000 y margen 0,3016. Eligiendo `invoiced-with-discount` vuelve a dar las cifras
  del artefacto (1.768.438 y 2.790.000). El costo de Microsoft 365 no se mueve: la demanda elige el precio público
  `public-standard-teams-monthly` y no `current`.
- `compose commitments` sobre esa cotización nueva: el único compromiso sigue siendo Adobe, leído contra su
  renovación. Queda un mes, CLP 108.468, liberado al paquete compartido (una licencia de tres); la licencia queda
  atada hasta el 2026-11-16 y la señal es `SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT`. Notion y Microsoft 365 declaran
  un mes y no dejan nada.

Evidencia fechada. El único artefacto que se agregó a esta carpeta es el de `designer-on-demand`.

## Delta 2026-10-11 — catálogo v10 y contrato 1.4.0: costos de terceros, reserva de contingencia y factores de país

Decisiones: [contrato 1.4.0](../../../docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia)
y [cómo se lee una cotización con terceros y reserva](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

- **Archivos nuevos.** `catalog.review-v10.json` (versión `operating-review-2026-10-11-v10`) y su change-set
  `third-party-contingency-factors.change.json`; `managed-on-demand-third-party.demand.json` y
  `managed-on-demand-third-party.artifact.json`. El puntero pasó a nombrar el catálogo v10; policy (v10) y créditos
  (v1) no cambiaron. Lo vigente lo imprime `current show`.
- **Qué no se toca.** Las versiones anteriores y todos los artefactos. Las tres ofertas, sus políticas y sus pisos
  no cambiaron.
- **Costos de terceros.** El brief declara cada costo en `thirdPartyCosts[]` con categoría, concepto, proveedor,
  importe, moneda, cantidad, períodos y evidencia. `settlement: "reinvoiced"` lo vuelve una fila propia de la
  cotización, con el precio y el piso de la regla de su categoría; `settlement: "client_direct"` lo deja como una
  nota que no entra a ningún total. La cotización nunca escribe una tasa. `periodIds` es obligatorio.
- **Reserva de contingencia.** No se declara: sale del catálogo según la oferta y la forma. Hoy la llevan los dos
  servicios gestionados cuando el brief declara `"engagementForm": "on_demand"`. Es un costo, así que se vende con
  el margen de la oferta y con la razón On-Demand. Sólo sale con
  `"contingency": { "kind": "waived", "reason": "…" }`, y queda marcada.
- **Dos márgenes.** El resumen trae el margen mezclado (`marginRateRoundedDown`) y el del trabajo propio
  (`ownWork.marginRateRoundedDown`). El primero baja con todo lo que se refactura al costo o cerca; el segundo es el
  que se compara con el piso de la oferta. No hay veredicto a nivel de cotización: el piso se juzga por fila.
- **Quién decidió qué.** Las tasas de terceros y el 12 % de la reserva son estimaciones propuestas por el agente
  que el CEO aceptó el 2026-10-11, para ajustar con el primer trabajo real. Los factores de país los cerró el CEO
  ese día: no son un pendiente del operador. HubSpot no hace falta en las cotizaciones por ahora, según el CEO; su
  precio queda pendiente a propósito.
- **Ledger.** `operational-gaps.json` agregó `THIRD_PARTY_AND_CONTINGENCY` y cerró `COUNTRY_FACTORS_UNVALIDATED`.
- **Lo que todavía no se puede.** Decir cuándo se le paga a un proveedor o si una compra ata más allá del trabajo;
  cobrar una comisión sobre lo que el cliente paga directo; una tarifa de proveedores recurrentes; un tratamiento
  de impuesto por fila; una cotización con terceros y sin ninguna línea de equipo; la reserva para un servicio
  On-Going ganado en una licitación con multas; liberar la reserva después de la entrega.

### Corridas del 2026-10-11 (noche)

Todas sobre `managed-on-demand-third-party.artifact.json`, salvo donde se dice otra cosa. Los costos se nombran por
su concepto.

- `replay`: `verified: true`, motor `pricing-v3-local/1.4.0`. Costo 14.750.055, neto CLP 21.033.333, margen mezclado
  0,2987. Terceros refacturados: costo 9.083.333 y neto 9.663.333. Trabajo propio: costo 5.666.722, neto 11.370.000,
  margen 0,5016. Reserva 436.800, que es 12 % de 3.640.000. Ninguna fila marcada.
- Filas de terceros: producción 4.500.000 → 4.950.000; talento, USD 1.250 → costo 1.250.000 y neto 1.380.000;
  medios 3.333.333 → 3.333.333, exactos.
- `compose assess`: `margin.ownWorkRate` 0,5016, `proposedFloorReadOn: "ownWorkRate"`, `belowProposedFloor: false`
  (así salía esa noche; desde el final del 2026-10-11 esas dos claves no existen y la misma corrida trae
  `pricingPolicies[]`, `thirdPartyPolicies[]` y `belowPolicyFloor: false`);
  brechas `THIRD_PARTY_FX_EXPOSURE` (talento), `THIRD_PARTY_COST_EVIDENCE_REQUIRED` (medios) y
  `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED`.
- `compose preview`: fee del período 11.370.000 más tres ítems de terceros; `clientPaidDirectly` con la licencia,
  USD 890, sin convertir.
- `compose split --tools all`: herramientas 2.020.000, persona 9.350.000 y terceros 9.663.333.
- `compose cash`: personas 3.640.000, provisiones 300.000, fee de plataforma 294.000, asientos y paquetes 995.922,
  terceros 9.083.333 y reserva 436.800; caja nueva a proveedores 9.083.333; caja sobre capacidad contratada
  11.950.000.
- `compose schedule` con 50/50 y el anticipo en el período 1: 10.520.000 y 10.513.333. Con 30/70: 6.310.000 y
  14.723.333, y el período 1 queda 2.773.333 por debajo de lo que cuestan sus proveedores.
- `compose commitments`: tres compras a terceros vistas y fuera de la lectura
  (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`); un compromiso leído, la bandeja social con precio por año.
- La misma demanda con la reserva en `waived` (fuera de esta carpeta, con `--current`): neto CLP 20.163.333, que son
  870.000 menos; costo 14.313.255; `contingencyReserveWaived` 436.800 y la señal `CONTINGENCY_RESERVE_WAIVED`.
- La misma demanda sólo con la nota `client_direct` y sin `engagementForm` (fuera de esta carpeta): motor
  `pricing-v3-local/1.1.0`, neto CLP 9.530.000, y el supuesto
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`.
- El mismo ejemplo con equipo en Colombia y cliente en Perú (fuera de esta carpeta): fechado el 2026-10-11,
  `ESTIMATED_SOURCE` nombra los factores de talento y de mercado y `runNotices.laterCatalogValues` avisa 8 registros
  vigentes desde el 2026-10-12; fechado el 2026-10-12, ninguno de los dos, mismo costo y mismo neto.
- `replay` de los 19 artefactos versionados bajo `data/pricing/**`: todos `verified: true`.

Evidencia fechada. El único artefacto que se agregó a esta carpeta es el de `managed-on-demand-third-party`.

## Delta 2026-10-11 — `compose document`: el documento de cotización de una cotización congelada

Decisión: [el documento de una cotización V3 es la plantilla A4](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--el-documento-de-cotización-de-una-cotización-v3-compose-document).
Paso a paso: [manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#producir-el-documento-de-cotización).
Datos y reglas de la plantilla: [su README](../../../docs/commercial/templates/cotizacion-a4/README.md).

- **Archivos nuevos.** `designer-three-months-iva.demand.json` y `designer-three-months-iva.artifact.json`; y tres
  pares de brief y datos de documento: `designer-on-demand.document-brief.json` y `.document.json`,
  `designer-three-months-iva.document-brief.json` y `.document.json`, y
  `managed-on-demand-third-party.document-brief.json` y `.document.json`.
- **Qué no se toca.** Catálogo, policy, créditos y puntero no cambiaron: lo vigente lo imprime `current show`. Ningún
  artefacto anterior cambió, y `compose preview` imprime lo mismo que antes.
- **Qué hace.** Lee un artefacto de composición, lo verifica por replay y emite los datos del documento para el
  cliente. No recalcula nada y no cambia un total.

  ```bash
  pnpm --silent pricing:v3 compose document --input artifact.json                       # andamio del brief, exit 2
  pnpm --silent pricing:v3 compose document --input artifact.json --brief brief.json \
    --out data.json                                                                     # datos, exit 3
  node scripts/documents/render-cotizacion-a4.mjs --data data.json --out carpeta-nueva  # HTML, PDF y capturas
  ```

- **De dónde sale cada cosa.** Las cifras, la moneda, el impuesto, el total y la fecha salen de la cotización. El
  brief (`pricing-v3-quote-document-brief/1`) trae los textos y la presentación de las líneas, y no tiene clave para
  un importe, una moneda, una tasa ni una fecha: uno que la trae se rechaza con `QUOTE_DOCUMENT_BRIEF_INVALID`.
- **Qué ve el cliente.** Lo mismo que decide `compose preview`, reunido a lo largo del plazo: un servicio gestionado
  es su fee; cada costo de terceros refacturado, una línea con su concepto. Sin costos, márgenes, tarifas ni
  proveedores. Los meses consecutivos con el mismo neto son una línea («3 meses»); un cobro único, «1 pago único».
- **Impuesto.** Se imprime el de la cotización: la tasa y el importe congelado, «Por confirmar» si no se resolvió, o
  «No aplica».
- **Es un borrador.** Los datos salen con `status: "draft"` y exit 3. No es una `quotation_id`, un precio aprobado
  ni una cotización emitida, y nada se escribe en Greenhouse ni en el CRM.
- **Lo que todavía no se puede.** Traer los textos de un catálogo o de una biblioteca de condiciones. Presentar el
  reparto en persona y kit (`compose split`) como documento. Número de cotización, versiones, verificación por QR,
  firmas, aprobación y envío: existen sólo en el cotizador de Greenhouse. Un documento en otra moneda que la de la
  cotización. Una portada, un alcance o unas condiciones de más de una página.

### Corridas del 2026-10-11 (documento)

Cada documento se emitió con el brief versionado de su artefacto y se generó con la plantilla. Importes en CLP.

- `designer-three-months-iva.artifact.json`: `replay` responde `verified: true`. Motor `pricing-v3-local/1.3.0`,
  tres períodos, costo 5.068.112, neto 7.970.000, margen 0,3641, impuesto 1.514.300 y total 9.484.300; ninguna
  línea marcada.
- Su documento: «Diseñador visual sénior», 3 meses a 2.550.000, que son 7.650.000; «Puesta en marcha del servicio»,
  1 pago único, 320.000. Neto 7.970.000; IVA 19 %, 1.514.300; total 9.484.300. Cuatro páginas.
- `compose document` sobre ese artefacto sin brief: exit 2, con las dos líneas bajo las claves `design` y
  `design:setup`.
- Documento de `designer-on-demand`: «Diseñador visual sénior», 1 mes, 2.470.000; «Puesta en marcha del servicio»,
  1 pago único, 320.000. Neto 2.790.000; impuesto y total «Por confirmar». Cuatro páginas. La mensualidad es menor
  que la del ejemplo de tres meses porque este artefacto congeló la policy v7, con Creative Cloud Pro todavía con
  su descuento.
- Documento de `managed-on-demand-third-party`: fee 11.370.000 y tres costos de terceros (producción 4.950.000,
  talento 1.380.000 y medios 3.333.333). Neto 21.033.333; impuesto y total «Por confirmar». Aparte, la licencia que
  paga el cliente, USD 890, sin convertir. Calendario de pagos de 50 %, 30 % y 20 %: 10.520.000, 6.310.000 y
  4.203.333. Cinco páginas.
- Los tres `.document.json` vueltos a emitir son idénticos byte a byte a los versionados.
- `replay` de los 20 artefactos versionados bajo `data/pricing/**`: todos `verified: true`.
- `pnpm pricing:v3:test`: 25 archivos y 1.208 pruebas. Pruebas de la plantilla
  (`node --test scripts/documents/render-cotizacion-a4.test.mjs scripts/documents/document-money.test.mjs`): 25.

Evidencia fechada. El único artefacto que se agregó a esta carpeta es el de `designer-three-months-iva`.

## Delta 2026-10-11 — asientos como se compran, períodos declarados una vez, opciones y cortesía del documento, y `--out`

Lo que se corrigió después de cotizar de punta a punta el primer caso real, un servicio gestionado de doce meses.
Decisiones:
[asientos y períodos](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--asientos-como-se-compran-y-períodos-declarados-una-vez)
y [opciones, cortesía y `--out`](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--opciones-cortesía-y---out-después-del-primer-caso-real).
Paso a paso:
[asientos](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#declarar-los-asientos-de-una-herramienta)
y [opciones y cortesía](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#agregar-opciones-y-una-cortesía).
Datos y reglas de la plantilla: [su README](../../../docs/commercial/templates/cotizacion-a4/README.md).

- **Archivos nuevos.** `designer-startup-courtesy.demand.json`, `.artifact.json`, `.document-brief.json` y
  `.document.json`; y las dos opciones, `designer-startup-courtesy.option-copywriter.demand.json` y `.artifact.json`
  y `designer-startup-courtesy.option-motion.demand.json` y `.artifact.json`.
- **Qué no se toca.** Catálogo, policy, créditos y puntero no cambiaron: lo vigente lo imprime `current show`. No hay
  contrato ni motor nuevo. Ningún artefacto anterior cambió y todos se reproducen byte a byte.
- **Asientos.** En una herramienta nominativa con precio por asiento, la demanda declara lo que se compra: varios
  planes en un mes (una asignación por `priceId`), asientos pagados sin uso (`idleSeats` con `idleReason`) y
  personas que usan un mismo asiento (`seatSharing`, con su motivo). La regla: asientos pagados menos ociosos igual
  a asientos necesarios. Si falta uno, `INSUFFICIENT_NAMED_SEAT_CAPACITY`; si sobra uno sin explicar,
  `UNACCOUNTED_NAMED_SEATS`. El compositor no deduce nada.
- **Períodos.** `allocations`, `work[].creditDemand`, `clientProvidedTools` y `seatSharing` admiten `periodIds` en
  lugar de `periodId`: exactamente una de las dos. `creditBudgets` sigue con una entrada por período. Las demandas
  de ejemplo de esta carpeta siguen escritas con `periodId`; no se reescriben.
- **Opciones del documento.** `compose document --option <clave>=<artefacto>`, hasta ocho: la cotización congelada
  de cada opción. Su precio es el neto de uno de sus períodos y el brief sólo la nombra (`options`).
- **Cortesía.** Una línea que la cotización deja en cero con un ajuste explícito no imprime nada; con
  `lines.<clave>.courtesy: true` se imprime como «Bonificado» con su valor de referencia, tomado del artefacto.
- **`--out`.** `calculate`, `quote` y `compose prepare|quote` escriben `--out` sólo si la cotización calcula. Una
  corrida bloqueada no deja archivo y lo dice en `runNotices.output`; `--keep-blocked` guarda el artefacto bloqueado
  a propósito, en una ruta propia.
- **Ledger.** `operational-gaps.json` cerró `NAMED_SEATS_UNDER_TWO_PLANS` y agregó
  `OPTION_QUOTES_REPEAT_PER_LINE_FEES`.
- **Lo que todavía no se puede.** Validar que un proveedor permite compartir un asiento nominativo, o soltar uno
  ocioso. Bonificar con valor de referencia la puesta en marcha de un servicio gestionado, que no tiene esa fila
  (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`). Presentar el reparto en persona y kit
  como documento. Número de cotización, versiones, QR, firmas y aprobación: pertenecen al cotizador de Greenhouse;
  llevar este diseño allá es el paso acordado y no ha empezado.
  *Corrección 2026-10-11 (cierre):* esta lista traía dos puntos más, que salieron de ella. «Dar el margen real de una
  opción que sólo agrega dedicación de personas que ya están en la cotización base» ya se puede, con
  `compose increment`. «Declarar la duración del contrato o una fecha de inicio que el cliente define después» no es
  un pendiente: quedó fuera del cotizador por decisión del CEO. Los dos están en el
  [delta del cierre](#delta-2026-10-11-cierre--compose-increment-un-adicional-que-amplía-la-base-se-lee-como-un-incremento).

### Corridas del 2026-10-11 (asientos y opciones)

Importes en CLP. Las corridas «fuera de esta carpeta» usan copias de `designer-startup-courtesy.demand.json` con un
solo cambio, cotizadas con `--current`; no están versionadas.

- `designer-startup-courtesy.artifact.json`: `replay` responde `verified: true`. Motor `pricing-v3-local/1.3.0`,
  tres períodos, costo 5.068.112, precio antes del ajuste 7.970.000, rebaja 320.000, neto 7.650.000, impuesto
  1.453.500 y total 9.103.500. Una fila marcada bajo su piso: la puesta en marcha bonificada.
- Las dos opciones: `replay` responde `verified: true`. Redactor, tres períodos a 2.580.000; video, un período de
  3.570.000.
- Su documento: «Diseñador visual sénior», 3 meses a 2.550.000, que son 7.650.000; «Puesta en marcha del servicio»,
  «Bonificado», valor de referencia 320.000. Neto 7.650.000; IVA 19 %, 1.453.500; total 9.103.500. Opciones:
  2.580.000 «al mes» y 3.570.000 «por mes de campaña». Cinco páginas.
- `compose document` sobre ese artefacto con los dos `--option` y sin brief: exit 2, con la línea `design`, `waived`
  con `design:setup` y `options` con las dos claves.
- El `.document.json` vuelto a emitir es idéntico al versionado.
- La demanda con `periodIds` (fuera de esta carpeta): 9 asignaciones pasan a 3; mismo costo y mismo neto, otra
  identidad de cálculo.
- La demanda con dos asientos de Notion para una persona (fuera de esta carpeta): exit 2,
  `UNACCOUNTED_NAMED_SEATS` en los tres meses; con `--out`, ningún archivo y `runNotices.output` con
  `written: false`. Con `--keep-blocked` y otra ruta, el artefacto bloqueado queda escrito (`KEPT_BLOCKED`).
- La misma declarando uno de los dos asientos ocioso (fuera de esta carpeta): exit 3, costo 5.140.112 y neto
  7.770.000; `compose commitments` lista 3 meses-asiento ociosos y `compose assess`, `IDLE_SEAT_COST_REVIEW`.
- Dos personas en la línea y un solo asiento de Notion (fuera de esta carpeta): exit 2,
  `INSUFFICIENT_NAMED_SEAT_CAPACITY`. Con un grupo de `seatSharing` para las dos: exit 3, y `compose assess` lista
  `SHARED_SEAT_TERMS_REVIEW`.
- `replay` de los 24 artefactos versionados bajo `data/pricing/**`: todos `verified: true`.
- `pnpm pricing:v3:test`: 27 archivos y 1.359 pruebas.

Evidencia fechada. Los artefactos que se agregaron a esta carpeta son el de `designer-startup-courtesy` y los de sus
dos opciones.

## Delta 2026-10-11 (cierre) — `compose increment`: un adicional que amplía la base se lee como un incremento

No hay contrato del kernel, motor, catálogo ni policy nuevos, y el puntero no se mueve. Todos los artefactos
anteriores se reproducen igual. Paso a paso:
[manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#un-adicional-que-amplía-la-base-compose-increment).
Por qué así:
[decisión](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11-cierre--un-adicional-que-amplía-la-base-se-lee-como-un-incremento-compose-increment).

- **El límite que cerró.** `compose document --option` imprime un adicional desde su propia cotización. Cuando el
  adicional sólo le suma dedicación a personas que ya son líneas de la base, esa cotización es una línea nueva y
  vuelve a llevar lo que se cobra una vez por línea (el fee de plataforma y su parte de las herramientas base): su
  costo queda sobrestimado y su margen, subestimado. Era `OPTION_QUOTES_REPEAT_PER_LINE_FEES`.
- **La lectura.** Un adicional así se declara como la cotización congelada del servicio **con el adicional
  adentro**, y su neto, su costo y su margen son la diferencia con la cotización base:

  ```bash
  pnpm --silent pricing:v3 compose increment --input with-addon.artifact.json \
    --base base.artifact.json [--out incremento.json]                                  # exit 3
  ```

  Verifica los dos artefactos por replay y no recibe `--current`. Emite `pricing-v3-quote-increment/1`: por período
  y en total, `base`, `withAddOn` e `increment` (neto, costo, margen y tasa de margen), `costByComponentKind`,
  `netIncrementPerPeriod`, `changed { lines, tools, thirdPartyCosts }` y `versions`. Es interna: trae costo y
  margen.
- **En el documento.** `compose document --input base.artifact.json --brief brief.json --increment
  <clave>=<with-addon.artifact.json>`, repetible. Comparte con `--option` el límite de ocho y el bloque `options` del
  brief; una clave no se usa en las dos. Lo que se imprime es lo que el adicional le suma al neto de un período, que
  debe ser igual en cada período comparado. El cliente ve un precio; el costo y el margen no llegan al documento.
  `source` registra `option<N>Basis: "increment"`.
- **Comparables o rechazadas.** Dos cotizaciones se restan sólo si la diferencia puede significar el adicional y
  nada más; si no, la corrida sale con 1 y el código de la regla, sin aproximar:
  `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES`, `QUOTE_INCREMENT_CONTEXT_DIFFERS`,
  `QUOTE_INCREMENT_VERSIONS_DIFFER`, `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`, `QUOTE_INCREMENT_BASE_NOT_CONTAINED`
  y `QUOTE_INCREMENT_NET_NOT_POSITIVE`. En `compose document --increment` el código es el mismo, con
  `option: "increment"` y cada ruta bajo `options.<n>.`; `QUOTE_DOCUMENT_OPTION_INVALID` queda para las reglas
  propias del documento sobre un incremento ya comparable.
- **Cuál usar.** `--increment` para un adicional que amplía a personas de la base (más dedicación, más consumo),
  también si además trae una persona nueva. `--option` para un adicional que es sólo una persona nueva o un trabajo
  aparte. Una base cuyo costo cambia de un mes a otro no admite un período representativo: la cotización con el
  adicional se hace sobre los mismos períodos.
- **Una cotización no es un contrato.** Decisión del CEO del mismo cierre: la fecha de inicio del servicio y la
  duración del contrato no son datos del cotizador y no lo serán. Son materia del contrato y no mueven ningún costo,
  precio ni impuesto. Donde esta carpeta las listaba como algo que «todavía no se puede», quedó corregido. Una
  cotización sigue teniendo períodos fechados desde su fecha de cotización.
- **Ledger.** `operational-gaps.json` cerró `OPTION_QUOTES_REPEAT_PER_LINE_FEES`.
- **Lo que todavía no se puede.** Bonificar con valor de referencia la puesta en marcha de un servicio gestionado,
  que no tiene esa fila en el catálogo (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`). Validar las condiciones con que un
  proveedor permite compartir un asiento: queda fuera del cotizador. Presentar el reparto en persona y kit como
  documento. Número de cotización, versiones, QR, firmas y aprobación: pertenecen al cotizador de Greenhouse; llevar
  este diseño allá es el paso acordado y no ha empezado.

### Corridas del 2026-10-11 (cierre)

Importes en CLP. Las corridas «fuera de esta carpeta» usan copias con un solo cambio y no están versionadas.

- Los tres artefactos de `managed-addon-increment`: `replay` responde `verified: true`. Base: tres períodos, neto
  5.650.000 y costo 3.076.309 al mes; en total, neto 16.950.000, impuesto 3.220.500 y total 20.170.500. Con el
  adicional: neto 5.950.000 y costo 3.231.405 al mes. El adicional solo: neto 300.000 y costo 204.096 al mes.
- `compose increment` con `.with-addon` sobre la base: exit 3, idéntico al versionado
  `managed-addon-increment.increment.json`. Modo `same_periods`, tres períodos. Por mes: neto 300.000, costo 155.096
  y margen 144.904 (0,483013). En total: 900.000, 465.288 y 434.712. `netIncrementPerPeriod` es 300.000.
- `costByComponentKind`, en los tres meses: personas 456.000 y herramientas 9.288 de incremento; fee de plataforma,
  Talent Assurance y operaciones, cero. `changed`: la línea `lead` con más dedicación (de 0,2 a 0,28) y dos
  herramientas cuyo costo se movió, Notion y Microsoft 365; ningún costo de terceros.
- El mismo adicional cotizado solo cuesta 204.096 al mes, con margen 0,319680: 49.000 más que como incremento, que
  son el fee de plataforma de una línea.
- `compose document` sobre la base con su brief y `--increment conversations=<.with-addon>`: exit 3, datos idénticos
  al versionado `managed-addon-increment.document.json`. «Servicio gestionado de atención en redes», 3 meses a
  5.650.000; una opción de 300.000 «al mes»; `source.option1Basis` es `increment`. Con
  `--option conversations=<.option-standalone>` en su lugar se imprime la misma opción de 300.000 y `source` no trae
  `option1Basis`.
- El mismo `--increment` sin brief: exit 2, con `options` que lista `conversations`, 300.000, tres períodos y
  `basis: "increment"`.
- Esos datos generados con la plantilla: exit 0, cuatro páginas. Una copia de los datos con una línea larga en el
  título de portada (fuera de esta carpeta) hace salir al generador con 1 y «Contenido fuera del A4», sin dejar
  documento; se arregla acortando el título.
- Rechazos, todos con exit 1. Los dos artefactos intercambiados: `QUOTE_INCREMENT_BASE_NOT_CONTAINED` con
  `dedication_smaller`. `.option-standalone` como cotización con el adicional: el mismo código, con `line_missing`,
  `dedication_smaller` y `tool_missing`. La base también como `--increment` de su propio documento:
  `QUOTE_INCREMENT_NET_NOT_POSITIVE`, con `option: "increment"` y rutas `options.0.periods.<n>`. La misma clave en
  `--option` y en `--increment`: `INVALID_ARGUMENT`. Un artefacto alterado: `REPLAY_MISMATCH`, con `option` igual a
  `input` o a `base`. Sin `--base`: `MISSING_ARGUMENT`. Con `--current`: `INVALID_ARGUMENT`.
- La cotización con el adicional vuelta a cotizar con un solo período (fuera de esta carpeta): exit 3, modo
  `representative_period`, un período comparado que vale por los tres de la base; incremento de un período, 300.000
  de neto y 155.096 de costo, sin multiplicar.
- Las tres demandas sin su neto pactado, cotizadas con `--current` (fuera de esta carpeta): la cotización suelta pide
  380.000 al mes y el incremento es de 280.000 al mes.
- `replay` de los 26 artefactos versionados bajo `data/pricing/**`: todos `verified: true`.
- `pnpm pricing:v3:test`: 28 archivos y 1.445 pruebas.

Evidencia fechada. Los artefactos que se agregaron a esta carpeta son los tres de `managed-addon-increment`.

## Delta 2026-10-11 (última) — catálogo v11: un precio por todo el trabajo, la unidad de cada oferta y la evidencia de las horas

Catálogo nuevo, `catalog.review-v11.json`; el puntero se movió a él. No hay contrato del kernel, motor ni policy
nuevos, y todos los artefactos anteriores se reproducen igual. Paso a paso por tipo de negocio:
[manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-un-negocio-de-punta-a-punta).
Por qué así:
[decisión de flujo](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--un-precio-por-todo-el-trabajo-agreed_total)
y [decisión de composición](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--la-unidad-comercial-es-un-dato-de-la-oferta).

- **Catálogo v11 y su cambio.** `offer-commercial-unit.change.json` (`operating-offer-commercial-unit-2026-10-11`,
  sobre el v10) agrega tres registros de una clase nueva, `offer`, uno por oferta: `creative-managed-service` y
  `seo-aeo-managed-service` se venden como `managed_service`; `talent-assurance-staffing`, como `role_capacity`.
  Cada uno rige desde la primera fecha en que su oferta tiene política de precio (2026-10-10, 2026-10-11 y
  2026-10-09). El catálogo pasa de 391 a 394 registros. Ningún precio, costo, factor ni política cambia.
- **El puntero.** `current.json` nombra `catalog.review-v11.json` (`operating-review-2026-10-11-v11`),
  `resources.review-v11.json` y `../v3-resources/ai-credits.review-v1.json`. `current show` responde
  `"consistent": true`.
- **Qué hace el registro `offer`.** `compose scaffold` escribe la unidad comercial desde ahí, y una demanda que
  declara otra no calcula (`COMMERCIAL_UNIT_CONTRADICTS_OFFER`). Por eso `service.demand.json` y `service.plan.json`
  de esta carpeta, y `../v3-composition/seo-service.demand.json`, que emparejan la oferta de staffing con
  `managed_service`, ya no cotizan con `--current`. Sus artefactos congelados se siguen reproduciendo.
- **Un precio por todo el trabajo.** El brief admite el ajuste `agreed_total`: el neto de las líneas nombradas en
  todo el plazo, que la resolución reparte en netos acordados por período y clase de cobro. Ninguna demanda
  versionada de esta carpeta lo usa todavía; las corridas de abajo lo ejercitan sobre copias.
- **Evidencia de la dedicación.** `compose workload --brief` escribe `dedicationEvidence` en las líneas que
  dimensiona. Las demandas versionadas de esta carpeta son anteriores y no la declaran: su costo de persona sale en
  `estimateExposure.dedicationNotEvidenced`.
- **`compose assess`.** Ya no compara contra el 40 %/35 % genérico: informa la regla de precio de cada línea.
- **Ejemplo nuevo.** `managed-addon-increment.programme-price.document-brief.json` y su `.document.json`: la
  cotización de tres meses de `managed-addon-increment.artifact.json` impresa como un precio de programa, con
  `combine`, `cover.netLabel` y dos hitos de pago con su impuesto y su total. Se emite sin `--increment`.
- **Ejemplos que cambiaron.** Los cinco briefs de documento anteriores dejaron de declarar `schedule.note` y la
  condición «Plazo e inicio», que sólo decían lo que toda cotización implica; sus `.document.json` se volvieron a
  emitir y los tres con impuesto resuelto llevan ahora `taxPeriods`. Ningún importe cambió.
- **Ledger.** `operational-gaps.json` agrega `PROJECT_OFFER_NOT_MODELLED`, `PLATFORM_FEE_PER_LINE` (abierto, del
  CEO, con el peso medido en los ejemplos), `TOOLS_WITHOUT_CURRENT_PRICE`,
  `TENDER_CEILING_AND_SCORING_NOT_MODELLED`, `LATE_PAYMENT_COST_OF_MONEY_NOT_MODELLED`,
  `PLATFORM_PANEL_AND_INSIGHTS_NOT_COSTED` y `QUOTE_REGISTRY_IN_GREENHOUSE`; y precisa
  `ASSURANCE_OPERATIONS_ONBOARDING_COSTS` (las provisiones «TEST ONLY»), `MANAGED_SERVICE_SETUP_NOT_PARAMETRIC` y
  `COMMERCIAL_POLICY` (el 40/35 retirado de `compose assess` y la unidad comercial como dato del catálogo).
- **Lo que todavía no se puede.** Una oferta propia para proyectos únicos; una puesta en marcha con costo para un
  servicio gestionado; prorratear el fee de plataforma por dedicación; cotizar con el precio vigente de una
  herramienta que no tiene importe; modelar el precio techo y el puntaje de una licitación, o el costo financiero de
  un pago tardío. Número de cotización, versiones, QR, firmas y aprobación siguen siendo del cotizador de Greenhouse.

### Corridas del 2026-10-11 (última)

Importes en CLP. Las corridas «fuera de esta carpeta» usan copias y no están versionadas.

- `current show`: exit 0, `consistent: true`, las tres fuentes en `match`. `catalog validate --current`:
  `operating-review-2026-10-11-v11`, 394 registros.
- `catalog search --current --kind offer`: exit 0, tres registros. `--kind offers`: exit 1, `INVALID_ARGUMENT` con
  las catorce clases en `allowed`.
- `compose scaffold --current` de `writer.brief.json`: exit 2, `commercialUnit` `role_capacity`, del catálogo.
- `compose prepare --current` de cada demanda de esta carpeta: calculan (exit 3) `designer-on-demand` (2.870.000),
  `designer-three-months-iva` (7.970.000), `designer-startup-courtesy` (7.650.000) y sus dos opciones,
  `managed-addon-increment` (16.950.000) con sus dos variantes y `managed-on-demand-third-party` (21.033.333). No
  calculan (exit 2) las fechadas antes del 2026-10-11 (`designer`, `crm-client-tools`, `managed-care`, `service`) y
  `managed-care-colombia`, que no declara ni excluye Adobe Express.
- Una copia de `designer-on-demand.demand.json` con un `agreed_total` de 2.800.000 sobre `design` (fuera de esta
  carpeta): exit 3, neto 2.800.000, rebaja 70.000, reparto 2.487.804 (mensual) y 312.196 (puesta en marcha), margen
  0,3490, ninguna fila marcada.
- Una copia de `managed-on-demand-third-party.demand.json` con un `agreed_total` de 20.500.000 sobre sus seis
  líneas y sus tres costos refacturados (fuera de esta carpeta): exit 3, neto 20.500.000; la fila de medios, que se
  cobra al costo, queda marcada con `netShortOfFloor` 84.522. Con el total sólo sobre las seis líneas, en
  11.000.000: neto 20.663.333 y ninguna fila marcada.
- Un programa SEO/AEO de tres meses armado desde un brief con `compose scaffold` (fuera de esta carpeta), con IVA de
  19 % y un `agreed_total` de 9.500.000: exit 3, motor 1.4.0, precio de política 10.110.000, reparto 3.166.600,
  3.166.600 y 3.166.800 (unidad 100, `tax_exact`), impuesto 1.805.000 y total 11.305.000.
- `compose document` de `managed-addon-increment.artifact.json` con el brief `programme-price`: exit 3, idéntico al
  versionado. Una línea «1 programa» de 16.950.000; IVA 3.220.500; hitos de 8.480.000 + 1.611.200 = 10.091.200 y
  8.470.000 + 1.609.300 = 10.079.300. Generado con la plantilla: exit 0, cuatro páginas.
- `compose document` de `managed-addon-increment.artifact.json` con su brief y `--increment`: exit 3, idéntico a
  `managed-addon-increment.document.json`. Sin el flag: exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID`.
- `compose workload --brief` de `managed-care`: exit 0; `primary` y `backup` salen con `dedicationEvidence`
  `estimated`.
- `replay` de los 36 artefactos versionados del repositorio: todos `verified: true`.
- `pnpm pricing:v3:test`: 32 archivos y 1.582 pruebas.

Evidencia fechada. Los archivos que se agregaron a esta carpeta son `catalog.review-v11.json`,
`offer-commercial-unit.change.json` y los dos `managed-addon-increment.programme-price.*`.

## Delta 2026-10-11 (cierre de la segunda prueba) — lecturas que cambiaron, sin archivos nuevos

Tres agentes repitieron los tres negocios reales con la skill y el manual reescritos, sin abrir el código. Lo que
todavía encontraron cambió el cotizador en cinco puntos, todos aditivos. **Esta carpeta no recibió ningún archivo y
ninguno se regeneró**: no hay catálogo, policy ni contrato del kernel nuevos, el puntero no se movió y los 36
artefactos versionados responden `verified: true`. Lo que cambia es cómo se leen. Paso a paso:
[manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#cotizar-un-negocio-de-punta-a-punta).
Por qué así:
[decisión de flujo](../../../docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11-cierre--un-precio-todo-incluido-por-período-per-de-agreed_total)
y [decisión de composición](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11-cierre--la-evidencia-de-una-asignación-es-un-dato-declarado).

- **`compose assess` sobre los artefactos de esta carpeta.** Trae una entrada por brecha, con `periodIds`, bajo
  rutas sin período (`tools.<toolId>`, `result.lines.<lineId>`), y `gapOccurrences` con el total sin plegar.
  `ALLOCATION_EVIDENCE_REQUIRED` depende de la evidencia que declara cada asignación (`allocations[].evidence`) y
  ya no de las palabras de su `reason`. **Ninguna demanda de esta carpeta declara `evidence`**: son anteriores al
  campo, así que la brecha sale hoy en cada herramienta con asignación de cada artefacto, también en los que antes
  no la traían. `USER_ASSIGNMENT_REQUIRED` sale una vez por cotización; los ejemplos de esta carpeta llevan ids
  propios (`design-slot`, `care-slot`), escritos con la indicación anterior, y no la traen.
- **Los `*.assessment.json` versionados son fotos de su fecha.** `designer.assessment.json` y
  `service.assessment.json` (2026-10-09), igual que los de una carpeta de prospecto, son anteriores al assessment
  plegado: traen una brecha por mes, rutas `<período>:<herramienta>` y no traen `gapOccurrences`. No se regeneran
  ni se comparan con la lectura de hoy; la de hoy se obtiene con `compose assess` sobre el artefacto.
- **El resumen de `replay`.** Agrega `marginFloor.netShortOfFloor`, el total que falta sobre todas las filas
  marcadas, en los artefactos que tienen alguna y cuyo contrato trae el neto mínimo (1.2.0 en adelante).
  `designer-startup-courtesy.artifact.json` lo trae en 266.667: su puesta en marcha bonificada sale marcada, con
  neto 0, y su `netShortOfFloor` es su neto mínimo completo.
- **`compose scaffold` y `resources inspect`.** El andamio deja `work[].tasks` vacío (la receta del perfil va en
  `profileTasks` de la pregunta de cada línea), conserva los cupos `planned-<lineId>-<n>` y lista en `candidates`
  sólo los precios que una asignación puede nombrar, con los demás en `unavailablePrices`. `resources inspect` lee
  `availability` igual y agrega `priceReview.superseded`.
- **Un precio por período.** `agreed_total` admite `per: "period"`, y `combine` del brief del documento también.
  Ninguna demanda ni brief de esta carpeta lo usa; las corridas de abajo lo ejercitan sobre copias. Las demandas de
  ejemplo que sí lo declaran, con su evidencia de asignación y sus cupos sin asignar, están en la skill de pricing
  (`.claude/skills/efeonce-pricing-operator/references/examples/`).
- **Ledger.** `operational-gaps.json` agrega `PROVISION_EVIDENCE_READ_FROM_LABEL` (la comparación por texto que
  queda), `BLOCKERS_REPEATED_PER_PERIOD`, `QUOTE_DOCUMENT_ALTERNATIVES_NOT_MODELLED` y
  `ASSESSMENT_SNAPSHOTS_PREDATE_FOLDED_READING`.

### Corridas del 2026-10-11 (cierre de la segunda prueba)

Importes en CLP, con `--current`. Las corridas «sobre una copia» no están versionadas.

- `compose assess` de `managed-addon-increment.artifact.json`: exit 3, 16 entradas y `gapOccurrences` 36;
  `ALLOCATION_EVIDENCE_REQUIRED` en sus cuatro herramientas, con `periodIds` 1 a 3.
- Una copia de `designer-three-months-iva.demand.json` vendida On-Going con un `agreed_total` de 2.450.000 y
  `per: "period"` sobre `design`: exit 3; tres períodos de 2.450.000; neto 7.350.000, impuesto 1.396.500, total
  8.746.500; el primer mes repartido en 2.177.700 (mes) y 272.300 (puesta en marcha); ninguna fila marcada. A
  precio de política esa copia vale 7.250.000. Con 2.420.000, el plazo queda 10.000 sobre la política y la fila
  mensual del primer mes sale marcada (`marginFloor.netShortOfFloor` 12.506).
- `compose document` de esa cotización, sobre una copia de `designer-three-months-iva.document-brief.json` con
  `combine` de `design` y `design:setup` y `per: "period"`: exit 3, una línea «3 meses» a 2.450.000. Generado con
  la plantilla: exit 0, cuatro páginas.
- `compose document` de `managed-addon-increment.artifact.json` con su brief y `--increment`: exit 3, idéntico a
  `managed-addon-increment.document.json`.
- `replay` de `designer-startup-courtesy.artifact.json`: `verified: true`; `marginFloor.flaggedLinePeriods` 1 y
  `marginFloor.netShortOfFloor` 266.667.
- `resources inspect --current --date 2026-10-11`: exit 0; `expired` vacío y una entrada en `superseded`.
- `pnpm pricing:v3:test`: 33 archivos y 1.640 pruebas.

Evidencia fechada. No se agregó ningún archivo a esta carpeta; `operational-gaps.json` es el único que cambió.


## Actualización del 22/10/2026

Vigentes: catálogo v13, recursos v12 y créditos v1, verificados con `current show`. Se añadieron ECG-033 Trafficker, ECG-034 Email/SMS y ECG-035 Digital Strategist con costos CO estimados; Content Creator ECG-028 se conserva. Awario Pro entra como referencia pública y la plataforma Email/SMS permanece pendiente. Sin cambios de políticas comerciales ni FX original. [Cálculo y límites](../../../docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md).
