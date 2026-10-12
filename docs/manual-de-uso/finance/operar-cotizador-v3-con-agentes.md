# Cotizador V3: flujo completo para Codex y Claude

TASK-2022, 2026-10-09. Prototipo local ejecutable. Entrada:
[data y casos](../../../data/pricing/v3-operating/README.md),
[ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
[Referencia funcional de todo lo implementado](../../documentation/finance/cotizador-v3-superficie-implementada.md):
contratos, fórmulas, periodos, selección, costos, evidencia, mantenimiento y límites.
Desde el 2026-10-10: motor 1.1 (precio acordado y redondeo comercial) y catálogo v4
([decisión](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)).
Desde el 2026-10-11: catálogo v5 con factores por país del cliente y de cada persona, y contrato 1.2.0, en el que el
piso de margen acompaña al factor de mercado (delta 2026-10-11 de la misma decisión;
[cómo cotizar por país](#cotizar-según-el-país-del-cliente-y-del-equipo)).
También desde el 2026-10-11: un puntero nombra las versiones vigentes y `--current` las carga
([Versiones vigentes](#versiones-vigentes)); el catálogo v6 y la policy v6 dejan los precios unitarios sin vencimiento
([Un precio unitario no vence](#un-precio-unitario-no-vence)); y el resumen trae avisos de la corrida (`runNotices`) y
dónde pesa cada dato estimado (`estimateExposure`), en [Leer el resumen](#leer-el-resumen).
Más tarde el mismo 2026-10-11: contrato 1.3.0 con la forma del compromiso
([Cotizar On-Demand u On-Going](#cotizar-on-demand-u-on-going)); provisiones de puesta en marcha en vez del marcador
de prueba ([Puesta en marcha](#puesta-en-marcha-onboarding-y-reclutamiento)); Adobe como se factura, en CLP y con
plazo de contrato ([Herramientas con contrato](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)); y tres
lecturas de una cotización congelada: calendario de pagos, caja y compromisos con proveedores
([Tres lecturas de una cotización](#tres-lecturas-de-una-cotización)).
Por la noche del 2026-10-11: contrato 1.4.0 y catálogo v10, con los costos de terceros de un trabajo
([Costos de terceros](#costos-de-terceros)), la reserva de contingencia de un alcance fijo
([Reserva de contingencia](#reserva-de-contingencia)) y el margen del trabajo propio junto al margen total
([Cómo leer una cotización con terceros](#cómo-leer-una-cotización-con-terceros)); y los factores de país cerrados
como valores de política, confirmados desde el 2026-10-12 ([Valores vigentes](#valores-vigentes)).
Lo último de esa noche: `compose document` convierte una cotización congelada en su documento para el cliente, sobre
la plantilla A4 de cotización ([Producir el documento de cotización](#producir-el-documento-de-cotización)).
Y después de cotizar el primer caso real, ese mismo día: los asientos de una herramienta se declaran como se compran
y los meses iguales se declaran una vez ([Declarar los asientos de una herramienta](#declarar-los-asientos-de-una-herramienta));
el documento admite opciones adicionales y una línea bonificada
([Agregar opciones y una cortesía](#agregar-opciones-y-una-cortesía)); y una corrida bloqueada ya no deja un archivo
en `--out` ([Qué hace una corrida bloqueada](#qué-hace-una-corrida-bloqueada)).
Y al cierre de ese día: un adicional opcional que amplía la cotización base se lee como la diferencia entre dos
cotizaciones congeladas, con `compose increment`, y se imprime con `compose document --increment`
([Un adicional que amplía la base](#un-adicional-que-amplía-la-base-compose-increment)); y el CEO decidió que la
fecha de inicio del servicio y la duración del contrato no son datos del cotizador, porque una cotización no es un
contrato: ya no se listan como pendientes.
Lo último del 2026-10-11, después de cotizar tres negocios reales más: catálogo v11, en el que cada oferta declara
la unidad comercial con que se vende; un precio por todo el trabajo (`agreed_total`); la evidencia de la dedicación
de cada línea; `compose assess` juzga contra el piso de la propia oferta; los diagnósticos nombran su causa; y el
documento imprime un precio de programa o de proyecto (`combine`). Todo está en
[Cotizar un negocio de punta a punta](#cotizar-un-negocio-de-punta-a-punta), que es por donde se empieza.

El operador puede pedir «cotiza un diseñador senior al 50%, talento Colombia, mercado Chile».
El agente consulta perfiles y recursos, interpreta las tareas, completa una demanda explícita y usa la CLI.
El dominio calcula; el agente explica el resultado desde el artefacto. Si falta un dato, devuelve su campo y motivo.
Una simulación calculada sigue pendiente de revisión comercial.

## Cotizar un negocio de punta a punta

**Para qué sirve.** Llevar un negocio desde el pedido hasta el documento para el cliente sin leer el resto del
manual: elegir qué se cotiza, armar la demanda, registrar el precio pactado, leer el resultado y emitir el
documento. Cada paso enlaza a la sección que lo detalla. Los comandos y las cifras de esta sección se corrieron el
2026-10-11 con las versiones vigentes (catálogo v11, policy v11, créditos v1).

**Antes de empezar.**

- `pnpm --silent pricing:v3 current show` responde `"consistent": true`. Toda corrida que carga fuentes usa
  `--current` ([Versiones vigentes](#versiones-vigentes)).
- La demanda lleva la fecha del día en `brief.quoteDate`. Una cotización no puede llevar una fecha anterior a los
  datos que usa ([qué pasa si la lleva](#una-fecha-anterior-a-los-datos)).
- Tienes del negocio: qué se vende, el país del cliente, la moneda, el equipo con su dedicación y, si existe, el
  precio ya conversado. Lo que no tienes no se inventa: se declara como estimación con su evidencia y se informa
  como supuesto.
- Quién decide: el precio que se presenta, los pisos y toda excepción son del CEO. Tú entregas el margen real que
  calcula el motor, lo que quedó estimado y lo que quedó bajo un piso. El costo de una persona es el **costo
  objetivo** del perfil, no la nómina. Una cotización no es un contrato: la fecha de inicio y la duración del
  contrato no son datos del cotizador.

### Paso 1 — Elegir oferta, unidad, forma y periodos

Son cuatro decisiones y las cuatro salen del negocio, no de la herramienta.

| Tipo de negocio | `brief.offerId` | `commercialUnit` | `brief.engagementForm` | `brief.periods` | Precio pactado | Cómo sale en el documento |
| --- | --- | --- | --- | --- | --- | --- |
| Una persona por dedicación, como refuerzo acotado (un mes, unas semanas) | `talent-assurance-staffing` | `role_capacity` | `on_demand` | Los meses del refuerzo; `1` si dura un mes o menos | `agreed_total` si se pactó un precio por todo (mes y puesta en marcha); `agreed_net` si se pactó un valor por mes | Una línea por persona («1 mes») y su puesta en marcha («1 pago único»), o una sola con `combine` |
| Una persona por dedicación, de forma continua | `talent-assurance-staffing` | `role_capacity` | `on_going` | Los meses del compromiso inicial; `1` si no hay ninguno | `agreed_net` con `billing: "monthly"` | «N meses» al valor de un mes, y la puesta en marcha aparte |
| Un servicio gestionado recurrente de la práctica creativa (contenido, diseño, social care, producción) | `creative-managed-service` | `managed_service` | `on_going` | Los meses del compromiso inicial; `1` si no hay ninguno | `agreed_net` con `billing: "monthly"` | Una línea de fee: «N meses» al valor de un mes |
| Un programa SEO/AEO | `seo-aeo-managed-service` | `managed_service` | `on_going` si continúa mes a mes; `on_demand` si tiene inicio, término y entregables | Los meses del programa | `agreed_net` mensual, o `agreed_total` si el precio es por el programa | Fee por meses, o «1 programa» con `combine` |
| Un programa de plazo fijo con un solo precio (por ejemplo, tres meses en una licitación) | La oferta de servicio gestionado de la práctica que lo entrega | `managed_service` | `on_demand` | Los meses del programa | `agreed_total` | «1 programa» con `combine` y `cover.netLabel` |
| Un proyecto único de alcance cerrado (un sitio web, una campaña) | La oferta de servicio gestionado de la práctica que lo entrega: **no existe una oferta propia para proyectos** | `managed_service` | `on_demand` | `1` si dura unas semanas; sus meses si dura más | `agreed_total` | «1 proyecto» con `combine` y `cover.netLabel` |

Cómo leer la tabla:

- **La oferta** la decide lo que se vende y la práctica que lo entrega, nunca el margen que deja pasar
  ([Oferta y piso de margen](#selección-y-asignación)). Hoy hay tres. Un proyecto único se cotiza con una oferta de
  servicio gestionado vendida On-Demand a un solo precio, porque no hay otra; si el proyecto no es de la práctica
  creativa ni de la SEO/AEO, cuál de las dos corresponde lo decide el operador y se informa como supuesto.
- **La unidad comercial no se elige.** Desde el catálogo v11 es un dato de la oferta (registro `offer`):
  `compose scaffold` la escribe sola, y una demanda que declare otra no calcula
  (`COMMERCIAL_UNIT_CONTRADICTS_OFFER`). `managed_service` se vende como un fee y nunca muestra a su equipo;
  `role_capacity` se vende línea por línea. Para verlo:
  `pnpm --silent pricing:v3 catalog search --current --kind offer` (exit 0, tres registros).
- **La forma se decide por el negocio, aunque no haya a quién preguntar.** Es `on_demand` si el trabajo tiene un
  alcance acotado, un inicio y un término, y una entrega o aceptación que lo cierra. Es `on_going` si es un servicio
  mensual que sigue hasta que alguien lo termina. Si tiene las dos cosas, son dos cotizaciones. La forma se declara
  siempre: sin ella el precio sale como On-Going y nada avisa. Si la decidiste tú con ese criterio, dilo al
  entregar.
- **On-Demand cambia el precio.** Multiplica por `1,10` el precio de todas las filas del equipo, en cualquier oferta.
  En las dos ofertas de servicio gestionado suma además la reserva de contingencia: 12 % del costo de persona, como
  costo ([Cotizar On-Demand u On-Going](#cotizar-on-demand-u-on-going),
  [Reserva de contingencia](#reserva-de-contingencia)). Una persona por dedicación no lleva reserva.
- **Los periodos son los meses que la cotización valoriza, no la duración del contrato.** Cuántos poner:

  | Lo que se vende | `periods` | Qué imprime el documento |
  | --- | --- | --- |
  | Un precio mensual con compromiso inicial de N meses | N | «N meses» al valor de un mes y el neto de los N. La portada imprime el neto de esos N meses: nómbralo con `cover.netLabel` |
  | Un precio mensual sin compromiso declarado | `1` | «1 mes» |
  | Un programa de N meses | N | Una línea por tramo de meses iguales, o «1 programa» con `combine` |
  | Un proyecto de unas semanas | `1` | «1 mes», o «1 proyecto» con `combine` |

  No hay periodos más cortos que un mes: un trabajo de dos semanas es un periodo con la dedicación que corresponde
  ([horas como unidad](#paso-2--componer-la-demanda)). Lo que se cobra una sola vez (la puesta en marcha) cae en el
  periodo en que entra la persona; un costo de terceros, en los periodos que declara.

### Paso 2 — Componer la demanda

1. **Descubre perfiles y herramientas** a la fecha del día. `--query` filtra por texto:

   ```bash
   pnpm --silent pricing:v3 resources inspect --current --date 2026-10-12 --query seo
   ```

   Devuelve exit 0 con `profiles` (id exacto, kit por defecto y las tareas de su receta) y `tools` con sus precios.

2. **Escribe el brief** (`pricing-v3-brief/1`): fecha, oferta, `engagementCode: "monthly"`, forma, país del
   cliente, moneda, periodos y una línea por perfil. Por línea:

   | Campo | Qué se escribe |
   | --- | --- |
   | `profile` | El id exacto del perfil (`ECG-020`) |
   | `talentCountry` | El país donde está la persona; mueve su costo ([por país](#cotizar-según-el-país-del-cliente-y-del-equipo)) |
   | `headcount` | Personas de esa línea |
   | `dedication` | `{ "unit": "fte", "value": "0.5" }` (hasta `1`) o `{ "unit": "hours_per_month", "value": "90" }` |
   | `allocationMode`, `allocationPolicyId` | `shared` con `allocation:shared`: se cobra la dedicación declarada. `dedicated` con `allocation:dedicated`: se cobra la persona completa (1 FTE), cualquiera sea la dedicación escrita |
   | `kitId` | En un servicio gestionado, `managed-service-core`. En una persona por dedicación se omite: toma el kit de su perfil |
   | `dedicationEvidence` | De dónde sale la dedicación y si es un hecho o una estimación (abajo) |

   **Horas como unidad.** `hours_per_month` se convierte a FTE dividiendo por las horas de un mes a tiempo completo
   de la regla de asignación de la línea (`hoursPerFteMonth`): hoy `180` en `allocation:shared` y en
   `allocation:dedicated`, las dos marcadas `estimated`. 90 horas son 0,5 FTE. Más de 180 horas da
   `INVALID_DEDICATION`. El resumen lo dice en `estimateExposure.estimatedRules`: la regla `allocation_policy` lista
   la línea en `billedFteSetByRuleOn`. Para verla:
   `pnpm --silent pricing:v3 catalog search --current --kind allocation`.

   **Evidencia de la dedicación.** `dedicationEvidence` tiene la forma de toda evidencia:

   ```json
   "dedicationEvidence": {
     "reference": "scope-estimate:seo-programme-example",
     "effectiveFrom": "2026-10-01",
     "effectiveUntil": "2026-12-31",
     "status": "estimated"
   }
   ```

   - `status` es `confirmed` (la dedicación está acordada o medida) o `estimated` (la estimaste tú o el operador).
     `pending` no calcula (`PENDING_DEDICATION_EVIDENCE`), y tampoco una evidencia que no rige en `quoteDate`
     (`DEDICATION_EVIDENCE_NOT_EFFECTIVE`).
   - `reference` es un identificador de la fuente, no el documento ni un nombre de persona.
   - `compose workload --brief` la escribe sola en las líneas que dimensiona
     ([por volumen](#cotizar-un-servicio-gestionado-por-volumen)).
   - **Sin ella la cotización calcula, pero el costo de esa persona no cuenta como confirmado.** Si adivinaste las
     horas, decláralo `estimated`: es lo que hace que la cotización lo diga
     ([cómo se lee](#dónde-pesa-un-dato-estimado-estimateexposure)).

3. **Saca el andamio de la demanda.** Siempre devuelve exit 2: deja preguntas.

   ```bash
   pnpm --silent pricing:v3 compose scaffold --current --input /tmp/mi-brief.json > /tmp/mi-andamio.json
   ```

   - `demand.commercialUnit` viene del catálogo. Si viene `null` con la pregunta `COMMERCIAL_UNIT_REQUIRED`, el
     catálogo no la declara para esa oferta: la confirma el operador.
   - `demand.work[].assigneeIds` trae `planned-<lineId>-<n>`. Son marcadores, no personas ni asientos comprados.
     Reemplázalos por un **id anónimo estable**: un texto que nombra el puesto y que se repite igual en todas las
     líneas, periodos y cotizaciones donde es la misma persona (`seo-slot`, `care-titular`). Nunca un nombre, un
     correo ni un RUT. Cuando nadie está asignado todavía, el id del puesto basta. Si dejas un `planned-`,
     `compose assess` lo marca con `USER_ASSIGNMENT_REQUIRED`.
   - **El andamio pregunta sólo por lo que el brief permite saber**: las herramientas base (Notion y Microsoft 365)
     y las de las tareas de la receta de cada perfil. No pregunta por lo que el trabajo agrega.

4. **Declara lo que el trabajo agrega, y sólo lo que el negocio compromete.** Va en `work[]`, por línea:

   - `tasks`: tareas adicionales a la receta del perfil; cada una trae sus herramientas.
   - `aiToolIds` con `aiSelectionReason`: herramientas de IA, sólo si el trabajo las usa.
   - `excludedProfileTasks`: una tarea de la receta que este trabajo no hace, con su motivo.
   - `serviceToolIds` (raíz de la demanda): herramientas del servicio que no son de una persona, como
     `agent-runtime-usage`.

   Una herramienta «por si acaso» no se declara: entra al costo y al precio.

5. **Declara una asignación por cada herramienta incluida** (`allocations`), con `periodIds` cuando los meses son
   iguales:

   - `priceId`: uno con importe. En `resources inspect`, cada precio trae `availability`: `needs_input` (hoy no
     tiene importe: está pendiente, fuera de vigencia o su registro no tiene monto) o `reference_only` (tiene un
     importe vigente; «referencia» porque un precio no prueba que el asiento exista). `historical` es un `priceId`:
     el valor del Excel histórico, marcado estimado. Si `current` está en `needs_input`, se elige entre los que
     tienen importe el que corresponde a como se compra la herramienta —un plan público `public-…` o
     `historical`— y **la elección se informa como supuesto**. Nombrar un precio pendiente da
     `RESOURCE_PRICE_PENDING`; uno que no existe, `RESOURCE_PRICE_SELECTION_REQUIRED` con los utilizables en
     `candidates`.
   - `quantity`: asientos o paquetes que se pagan, siempre enteros en una herramienta nominativa.
   - `driver` y `serviceShare`: qué parte de ese costo carga esta cotización. **`serviceShare` es exactamente
     `allocatedUnits ÷ totalUnits`, truncado (no redondeado) a 18 decimales**: `1` de `3` es
     `"0.333333333333333333"`. Otra cifra da `ALLOCATION_DRIVER_MISMATCH`.
   - Cuánto carga una persona a tiempo parcial:
     [Asientos de una persona a tiempo parcial](#asientos-de-una-persona-a-tiempo-parcial).
   - Herramienta con precio en CLP (Adobe) o en EUR (Magnific): nombra `fx:CLP:USD` o `fx:EUR:USD` en `fxRecordIds`.

6. **Créditos de IA.** Una herramienta de créditos (Higgsfield, Magnific) pide dos cosas por cada mes en que se usa:

   - en la línea, `work[].creditDemand`: `{ "periodIds": [1, 2, 3], "toolId": "higgsfield", "credits": 1000 }`,
     créditos **enteros** de ese proveedor en cada mes;
   - en la raíz, `creditBudgets`: una entrada por herramienta y por mes, con `purchaseDate` y `useBy` **dentro del
     mes calendario de ese periodo**. El periodo 1 es el mes de `quoteDate`; el periodo 2, el siguiente. En el
     periodo 1, `purchaseDate` no puede ser anterior a `quoteDate`. Si no, `CREDIT_PERIOD_WINDOW_MISMATCH`.

   Faltar la demanda da `CREDIT_DEMAND_REQUIRED`; faltar el presupuesto, `CREDIT_BUDGET_REQUIRED`
   ([planner](presupuestar-creditos-ia-v3.md)).

7. **Una herramienta que aporta el cliente** se declara en `clientProvidedTools` sólo con evidencia `confirmed` que
   cubra todo el uso. Sin esa evidencia la corrida da `CLIENT_ACCESS_EVIDENCE_REQUIRED` y su `detail` dice qué
   parte falla. En ese caso no se inventa la evidencia: la herramienta se deja fuera del trabajo y se dice en las
   condiciones del documento que la aporta el cliente
   ([detalle](#herramientas-del-cliente-y-créditos)).

8. **Cotiza hasta que calcule.** `compose prepare` no escribe nada; `compose quote --out` congela.

   ```bash
   pnpm --silent pricing:v3 compose prepare --current --input /tmp/mi-demanda.json
   pnpm --silent pricing:v3 compose quote --current --input /tmp/mi-demanda.json \
     --out /tmp/mi-cotizacion.artifact.json > /tmp/mi-cotizacion.summary.json
   ```

   Exit 2 es falta de información: cada entrada de `diagnostics` trae `code`, `path` y, cuando la causa se puede
   nombrar, `detail` o `candidates` ([tabla](#diagnósticos-que-nombran-su-causa)). Exit 3 es calculado y en
   revisión.

**Dos costos que entran solos y hay que conocer.**

- **El fee de plataforma se cobra entero por línea y por mes, cualquiera sea la dedicación.** Es el requisito
  `platform` de todos los kits: USD 49 al mes por cada persona de la línea (`fee:<perfil>`, estimado; con
  `headcount` 1, que es lo usual, es uno por línea, y con `headcount` 2 son dos). Pesa poco en una persona a
  tiempo completo y mucho en una línea chica o en muchas líneas parciales. Medido en los ejemplos versionados: 2,8 %
  del costo en `designer-on-demand` (una línea completa); 4,8 % en `managed-addon-increment` (tres líneas, dos de
  ellas a 0,2 y 0,1); y 24,0 % en `managed-addon-increment.option-standalone` (una línea de 0,08). Si debe
  prorratearse por dedicación es una decisión **abierta** del CEO: hoy no se prorratea y no se corrige a mano.
- **Las provisiones «TEST ONLY» de los kits de una persona por dedicación.** Los requisitos `assurance` y
  `operations` de esos kits resuelven a `trial-assurance` y `trial-operations`: USD 25 al mes cada una, con la
  etiqueta «TEST ONLY, NOT MEASURED». Son marcadores de prueba heredados, no costos medidos: salen como estimados
  en `estimateExposure` y `compose assess` levanta `PROVISION_COST_EVIDENCE_REQUIRED`. Están pendientes de medición
  (`ASSURANCE_OPERATIONS_ONBOARDING_COSTS` en el ledger). Se informan así; no se quitan ni se presentan como costo
  real.

### Paso 3 — Registrar el precio pactado

Sin precio pactado no se declara nada: el precio es el de la política. Con uno, se declara en `brief.adjustments`
y pasa por el motor, para que el piso se compruebe contra el precio real.

| Lo que se pactó | Ajuste | `amount` es | Qué cubre |
| --- | --- | --- | --- |
| Un precio por todo el trabajo: un programa, un proyecto, un mes con su puesta en marcha incluida | `agreed_total` | El neto de las líneas nombradas **en todo el plazo** | Todos los periodos y todas las clases de cobro (mensual y puesta en marcha) de esas líneas. Si `lineIds` nombra además un costo refacturado por su `costId`, también lo cubre |
| Un precio por mes | `agreed_net` con `billing: "monthly"` | El neto de esas líneas **en cada periodo** | Las filas mensuales. La puesta en marcha queda al precio de la política |
| Un precio para la puesta en marcha | `agreed_net` con `billing: "setup"` | El neto de esas filas en el periodo en que caen | Las filas de puesta en marcha |
| Un neto para un costo de terceros | `agreed_net` con `billing: "third_party"` | El neto de ese costo en cada periodo | Las filas de los `costId` nombrados |
| Un descuento pactado como porcentaje | `discount` | Una tasa | Las filas mensuales y de puesta en marcha de esas líneas |

```json
"adjustments": [
  {
    "adjustmentId": "programme-price",
    "kind": "agreed_total",
    "amount": "9500000",
    "lineIds": ["seo", "lead"],
    "reason": "Precio acordado por el programa de tres meses, todo incluido. Quién lo aprobó y cuándo."
  }
]
```

- Un `agreed_total` no lleva `billing`. Una línea o un costo que nombra no puede estar en otro ajuste
  (`AGREED_TOTAL_OVERLAPS_ADJUSTMENT`).
- El cotizador reparte el total entre los periodos en proporción al precio de política de cada uno, y el último
  toma lo que sobra: los periodos suman exactamente el total, pero **pueden no ser iguales entre sí**. Con un
  impuesto exclusivo reparte en una unidad en la que el impuesto no se redondea (100 pesos a 19 %), así que el
  impuesto de la cotización es el de la tasa sobre el total.
- Ningún ajuste aprueba nada: una fila bajo su piso sale marcada igual.

Detalle, reglas y fallas: [Registrar el precio acordado](#registrar-el-precio-acordado).

### Paso 4 — Leer el resultado

Del resumen que imprimió `compose quote` ([Leer el resumen](#leer-el-resumen)), en este orden:

1. `calculationStatus` es `calculated` y `diagnostics` está vacío. Si no, no hay precio.
2. `totals.net`, y `periods[].totals.net` por mes. Con un ajuste, `totals.discount` o `totals.uplift` dicen cuánto
   se apartó del precio de política; con un `agreed_total`, `agreedTotals` trae el reparto.
3. `marginRateRoundedDown`: el margen real. Con costos de terceros, además `ownWork.marginRateRoundedDown`.
4. `marginFloor.lines[]`: las filas bajo su piso. En cada una, `netShortOfFloor` responde «cuánto más tendría que
   valer» ([qué significa cada clave](#qué-significa-una-línea-marcada)). Una fila marcada se le lleva al CEO antes
   de presentar nada.
5. `estimateExposure`: cuánto del costo es estimado, cuánto depende de una dedicación sin evidencia
   (`dedicationNotEvidenced`) y qué dato conviene confirmar primero.
6. `assumptions`, `reviewSignals` y `runNotices`: se informan todos. `HISTORICAL_ONLY` sale en toda cotización: el
   catálogo es de revisión, no una lista de precios aprobada.

Después, sobre el artefacto: `compose assess` (qué falta por evidenciar y contra qué piso se juzgó cada fila) y, en
un trabajo acotado, `compose commitments`
([Tres lecturas de una cotización](#tres-lecturas-de-una-cotización)).

### Paso 5 — Producir el documento

1. `compose document --input <artefacto> --out <brief>` devuelve exit 2 y deja el brief con cada texto por llenar y
   cada línea bajo su clave.
2. Llena sólo textos. Decide cómo se imprime el precio:

   - **Por meses (lo que sale sin hacer nada):** cada clave es un concepto plegado por meses, «3 meses» al valor de
     uno. Si el neto cambia entre meses, sale una línea por tramo.
   - **Un precio por todo (`combine`):** varias claves, o una sola, como una línea de cantidad 1, sin valor
     unitario, con la suma exacta del plazo:

     ```json
     "combine": [
       { "keys": ["fee"], "label": "Programa SEO/AEO de tres meses", "unit": "programa" }
     ]
     ```

     Úsalo siempre que el precio se pactó con `agreed_total`: su reparto deja el último mes distinto y, plegado por
     meses, el documento imprimiría dos tramos.

3. `cover.netLabel` nombra el neto de la portada cuando «Valor neto del servicio completo» no es lo que se cobra:
   «Valor neto del programa», «Valor neto del proyecto», o «Valor neto de los tres primeros meses» en un servicio
   mensual que continúa.
4. `paymentMilestones` si hay hitos de pago. Con un impuesto exclusivo, cada hito se imprime con su neto, su
   impuesto y su total.
5. `buyer.unit` y `schedule.note` son optativos y el andamio no los trae: se omiten antes que llenarlos con
   relleno. No se escribe quién define la fecha de inicio.
6. Lo que el documento no tiene como dato va como texto en `conditions.rows`: la vigencia de la oferta, la forma y
   el plazo de pago, y lo que el cliente debe aportar (accesos, lineamientos, una herramienta propia).
7. La portada lleva la leyenda de borrador mientras el CEO no apruebe el precio. Que el precio lo haya puesto él no
   es todavía la excepción a un piso: si hay filas marcadas, se las muestras con lo que falta y la leyenda se
   mantiene hasta que apruebe con esa información.
8. Emite los datos con `--brief` (exit 3) y genera el PDF con `render-cotizacion-a4.mjs`.

Detalle: [Producir el documento de cotización](#producir-el-documento-de-cotización).

### Caso A — Una persona por un mes, con un precio por todo

Un diseñador sénior a tiempo completo durante un mes, cliente y persona en Chile, en CLP. Refuerzo acotado:
`talent-assurance-staffing`, `role_capacity`, `on_demand`, un periodo. La demanda es la versionada
[`designer-on-demand.demand.json`](../../../data/pricing/v3-operating/designer-on-demand.demand.json).

```bash
caso=data/pricing/v3-operating/designer-on-demand

pnpm --silent pricing:v3 compose prepare --current --input "$caso.demand.json"
```

Exit 3. Precio de política: `totals.net` `2870000` (fila mensual 2.550.000 y puesta en marcha 320.000), costo
`1822704`, margen `0.364911`, motor `pricing-v3-local/1.3.0`, ninguna fila bajo el piso de 25 %.

El cliente acepta 2.800.000 por el mes completo, puesta en marcha incluida. Es un precio por todo: `agreed_total`.

```bash
node -e '
const fs = require("fs")
const demand = JSON.parse(fs.readFileSync("data/pricing/v3-operating/designer-on-demand.demand.json", "utf8"))
demand.brief.adjustments = [{
  adjustmentId: "job-price",
  kind: "agreed_total",
  amount: "2800000",
  lineIds: ["design"],
  reason: "Example: price agreed for the month, start-up included. Declared for this example; not a commercial approval."
}]
fs.writeFileSync("/tmp/caso-a.demand.json", JSON.stringify(demand, null, 2) + "\n", { flag: "wx" })
'

pnpm --silent pricing:v3 compose quote --current --input /tmp/caso-a.demand.json \
  --out /tmp/caso-a.artifact.json > /tmp/caso-a.summary.json
```

Exit 3. Qué leer:

| Clave | Valor | Qué dice |
| --- | --- | --- |
| `totals.net` | `2800000` | Exactamente lo pactado |
| `totals.discount` | `70000` | Lo que el acuerdo rebajó del precio de política |
| `agreedTotals[0].distribution` | `monthly` 2.487.804 y `setup` 312.196 | El total repartido entre las dos clases de cobro, en proporción a 2.550.000 y 320.000 |
| `agreedTotals[0].distributionUnitBasis` | `currency_precision` | El impuesto no está resuelto: reparte al peso |
| `marginRateRoundedDown` | `0.349034` | Margen real |
| `marginFloor.lines` | `[]` | Ninguna fila bajo el piso |
| `estimateExposure.dedicationNotEvidenced` | `design`, `1310000` (71,9 % del costo) | La línea no declara `dedicationEvidence`: el costo de la persona no cuenta como confirmado |

Para el documento, las dos claves (`design` y `design:setup`) en una línea:

```json
"cover": { "netLabel": "Valor neto del servicio" },
"combine": [
  {
    "keys": ["design", "design:setup"],
    "label": "Diseñador visual sénior por un mes",
    "detail": "Dedicación completa, con su puesta en marcha",
    "unit": "servicio"
  }
]
```

Sobre una copia de `designer-on-demand.document-brief.json` sin su bloque `lines` (una clave combinada no admite
entrada en `lines`), `compose document` devuelve exit 3 con una sola línea, «1 servicio», neto 2.800.000 e impuesto
«Por confirmar». Generado, son cuatro páginas.

**Variante: la misma persona tres meses, con un valor por mes.** Sobre
[`designer-three-months-iva.demand.json`](../../../data/pricing/v3-operating/designer-three-months-iva.demand.json)
(tres periodos, IVA de 19 % declarado sólo para el ejemplo; política: 7.970.000), un valor pactado de 2.450.000 al
mes es un `agreed_net`: `"kind": "agreed_net"`, `"amount": "2450000"`, `"billing": "monthly"`,
`"lineIds": ["design"]`. Resultado: periodos de 2.770.000 (el mes más la puesta en marcha de 320.000, que el acuerdo
no cubre), 2.450.000 y 2.450.000; neto 7.670.000, impuesto 1.457.300, total 9.127.300, margen `0.339229`. El
documento, sin `combine`, imprime «3 meses» a 2.450.000 y «1 pago único» de 320.000.

### Caso B — Un servicio gestionado recurrente, con un valor por mes

Un servicio de atención en redes de la práctica creativa, continuo, con tres meses de compromiso inicial y un fee
pactado de 5.650.000 al mes: `creative-managed-service`, `managed_service`, `on_going`, tres periodos y un
`agreed_net` mensual sobre sus tres líneas. Es el ejemplo versionado `managed-addon-increment`.

```bash
caso=data/pricing/v3-operating/managed-addon-increment

pnpm --silent pricing:v3 replay --input "$caso.artifact.json"
pnpm --silent pricing:v3 compose assess --input "$caso.artifact.json"
pnpm --silent pricing:v3 compose document --input "$caso.artifact.json" \
  --brief "$caso.document-brief.json" \
  --increment conversations="$caso.with-addon.artifact.json" \
  --out /tmp/caso-b.document.json
```

Los tres devuelven exit 3 y `replay` responde `"verified": true`. Neto 16.950.000 (3 × 5.650.000), IVA 3.220.500,
total 20.170.500, margen `0.455520`, ninguna fila bajo el piso de 45 %. `assess` trae en
`margin.pricingPolicies` la regla con que se puso precio a las tres líneas (`creative-managed-service`,
`target_margin` `0.45`, `minimumMargin` `0.45`) y `belowPolicyFloor: false`. El documento imprime una línea de fee:
«3 meses» a 5.650.000, y es idéntico al versionado `managed-addon-increment.document.json`. El brief de ese ejemplo
nombra además una opción adicional, por eso la corrida lleva `--increment`
([adicionales](#un-adicional-que-amplía-la-base-compose-increment)): sin el flag se rechaza con
`QUOTE_DOCUMENT_BRIEF_INVALID`, porque el brief nombra una opción que la corrida no recibió. En un servicio que
sigue después del tercer mes, la portada nombra su neto con `cover.netLabel` («Valor neto de los tres primeros
meses»); el brief versionado no lo declara.

### Caso C — Un programa SEO/AEO de tres meses, con un precio por el programa

Un especialista SEO a 90 horas al mes y un líder a 0,1, tres meses con inicio y término, cliente y equipo en Chile,
CLP, IVA de 19 % declarado sólo para el ejemplo. Programa acotado de la práctica SEO/AEO:
`seo-aeo-managed-service`, `managed_service`, `on_demand`, tres periodos.

1. El brief, en `/tmp/caso-c.brief.json`:

   ```json
   {
     "schemaVersion": "pricing-v3-brief/1",
     "mode": "simulation",
     "quoteDate": "2026-10-12",
     "offerId": "seo-aeo-managed-service",
     "engagementCode": "monthly",
     "engagementForm": "on_demand",
     "accountId": "seo-programme-example",
     "offerMarketCountry": "CL",
     "outputCurrency": "CLP",
     "periods": 3,
     "lines": [
       {
         "lineId": "seo",
         "profile": "ECG-020",
         "talentCountry": "CL",
         "headcount": 1,
         "dedication": { "unit": "hours_per_month", "value": "90" },
         "allocationMode": "shared",
         "allocationPolicyId": "allocation:shared",
         "kitId": "managed-service-core",
         "allowUnlocalizedCost": false,
         "choices": []
       },
       {
         "lineId": "lead",
         "profile": "ECG-001",
         "talentCountry": "CL",
         "headcount": 1,
         "dedication": { "unit": "fte", "value": "0.1" },
         "allocationMode": "shared",
         "allocationPolicyId": "allocation:shared",
         "kitId": "managed-service-core",
         "allowUnlocalizedCost": false,
         "choices": []
       }
     ]
   }
   ```

2. El andamio y la demanda completa. El andamio (exit 2) trae `commercialUnit: "managed_service"` y pregunta por
   Notion, Microsoft 365 y SEMrush, que es la herramienta de la tarea `seo-writing` del perfil:

   ```bash
   pnpm --silent pricing:v3 compose scaffold --current --input /tmp/caso-c.brief.json > /tmp/caso-c.scaffold.json

   node -e '
   const fs = require("fs")
   const demand = JSON.parse(fs.readFileSync("/tmp/caso-c.scaffold.json", "utf8")).demand
   demand.brief.taxTreatment = {
     kind: "exclusive", rate: "0.19", policyRef: "example:iva-cl-19",
     source: { reference: "example: IVA 19 % declared for this example; not a tax ruling for any client",
       effectiveFrom: "2026-01-01", effectiveUntil: "9999-12-31", status: "confirmed" }
   }
   for (const line of demand.brief.lines)
     line.dedicationEvidence = { reference: "scope-estimate:seo-programme-example",
       effectiveFrom: "2026-10-01", effectiveUntil: "2026-12-31", status: "estimated" }
   demand.work[0].assigneeIds = ["seo-slot"]
   demand.work[1].assigneeIds = ["lead-slot"]
   const base = (toolId) => ({ periodIds: [1, 2, 3], toolId, priceId: "current", quantity: "2", seatCapacity: 2,
     serviceShare: "0.3", driver: { unit: "declared-fte-share", totalUnits: "2", allocatedUnits: "0.6" },
     reason: "Example hypothesis: two named seats (the SEO specialist and the lead); the programme carries 0.6 of 2, its declared dedication." })
   demand.allocations = [base("notion"), base("microsoft-365"), {
     periodIds: [1, 2, 3], toolId: "semrush", priceId: "public-seo-pro-monthly", quantity: "1", serviceShare: "0.25",
     driver: { unit: "projects-on-the-account", totalUnits: "4", allocatedUnits: "1" },
     reason: "Example hypothesis: one of four projects of the shared account. Public list price; the contracted plan is not confirmed." }]
   demand.brief.adjustments = [{ adjustmentId: "programme-price", kind: "agreed_total", amount: "9500000",
     lineIds: ["seo", "lead"],
     reason: "Example: price agreed for the three-month programme, all included. Declared for this example; not a commercial approval." }]
   fs.writeFileSync("/tmp/caso-c.demand.json", JSON.stringify(demand, null, 2) + "\n", { flag: "wx" })
   '
   ```

   Lo que el script decide y hay que informar: `current` de SEMrush está en `needs_input`, así que usa el plan
   público `public-seo-pro-monthly` (supuesto); los dos asientos de Notion y de Microsoft 365 se cargan por la
   dedicación declarada, 0,6 de 2; y la dedicación de las dos líneas es una estimación.

3. Cotiza:

   ```bash
   pnpm --silent pricing:v3 compose quote --current --input /tmp/caso-c.demand.json \
     --out /tmp/caso-c.artifact.json > /tmp/caso-c.summary.json
   ```

   Exit 3, motor `pricing-v3-local/1.4.0` (lleva reserva de contingencia).

   | Clave | Valor | Qué dice |
   | --- | --- | --- |
   | `agreedTotals[0].policyNet` | `10110000` | El precio de política del programa: 3.370.000 al mes. Es lo que da la misma demanda sin el ajuste |
   | `totals.net` | `9500000` | Lo pactado |
   | `agreedTotals[0].differenceFromPolicyNet` | `-610000` | Lo que el acuerdo rebajó |
   | `agreedTotals[0].distribution` | 3.166.600 en los periodos 1 y 2; 3.166.800 en el 3 | El reparto: el último mes toma lo que sobra |
   | `agreedTotals[0].distributionUnit`, `distributionUnitBasis` | `100`, `tax_exact` | Reparte de a 100 pesos para que el IVA no se redondee |
   | `totals.tax`, `totals.grandTotal` | `1805000`, `11305000` | Exactamente 19 % de 9.500.000 |
   | `totals.cost`, `totals.contingencyReserve` | `4131024`, `392400` | Costo del plazo; la reserva es 12 % del costo de persona (3.270.000) |
   | `marginRateRoundedDown` | `0.565155` | Margen real; al precio de política era `0.591392` |
   | `marginFloor.lines` | `[]` | Ninguna fila bajo el piso de 45 % |
   | `estimateExposure.estimatedShareOfCost` | `0.983137` | Casi todo el costo es estimado, porque la dedicación lo es |
   | `estimateExposure.costInputs[0]` | `dedication` / `seo`, `shareOfCost` `0.732022`, `marginRateLostIfTenPctHigher` `0.031832` | Lo primero a confirmar son las horas del especialista: 10 % más de horas son 3,2 puntos de margen |
   | `reviewSignals` | `ESTIMATED_SOURCE`, `HISTORICAL_ONLY` | Datos estimados y catálogo de revisión |

   Sin `dedicationEvidence` el precio es el mismo y la lectura es otra: `estimatedShareOfCost` `0.096577` y
   `dedicationNotEvidenced.cost` `3662400` (88,7 % del costo). Parecería una cotización con poco costo estimado; no
   lo es.

4. `compose assess` sobre el artefacto (exit 3): `margin.pricingPolicies` trae `seo-aeo-managed-service`,
   `target_margin` `0.55`, `minimumMargin` `0.45`; `belowPolicyFloor: false`; y dos gaps
   `DEDICATION_EVIDENCE_REVIEW`, uno por línea.

5. El documento. Sin brief, el andamio muestra por qué hace falta `combine`: la clave `fee` saldría en dos líneas,
   «Meses 1 a 2» a 3.166.600 y «Mes 3» a 3.166.800. Con este bloque, sobre una copia de
   [`managed-addon-increment.programme-price.document-brief.json`](../../../data/pricing/v3-operating/managed-addon-increment.programme-price.document-brief.json)
   con sus textos cambiados:

   ```json
   "cover": { "netLabel": "Valor neto del programa" },
   "combine": [
     {
       "keys": ["fee"],
       "label": "Programa SEO/AEO de tres meses",
       "detail": "Equipo, herramientas y dirección del programa",
       "unit": "programa"
     }
   ],
   "paymentMilestones": [
     { "id": "advance", "label": "Anticipo", "share": "0.5", "when": "A la aceptación de la cotización" },
     { "id": "closing", "label": "Saldo", "share": "0.5", "when": "Contra la entrega del balance del programa" }
   ]
   ```

   `compose document` devuelve exit 3: una línea «1 programa» de 9.500.000; `vatRate` `0.19`, `taxAmount`
   `1805000`, `taxPeriods` `3`; y dos hitos de 4.750.000 de neto, 902.500 de IVA y 5.652.500 de total cada uno.
   Generado, son cuatro páginas.

El ejemplo versionado de un precio de programa es ese mismo brief sobre `managed-addon-increment.artifact.json`:
una línea «1 programa» de 16.950.000, IVA 3.220.500, y hitos de 8.480.000 + 1.611.200 = 10.091.200 y
8.470.000 + 1.609.300 = 10.079.300.

### Caso D — Un proyecto único de alcance cerrado, con un solo precio

Una campaña de un mes con producción, talento y medios comprados a terceros: servicio gestionado de la práctica
creativa vendido On-Demand, un periodo. Es el ejemplo versionado
[`managed-on-demand-third-party.demand.json`](../../../data/pricing/v3-operating/managed-on-demand-third-party.demand.json):
política 21.033.333, de los cuales 11.370.000 son trabajo propio y 9.663.333 terceros refacturados
([Cómo leer una cotización con terceros](#cómo-leer-una-cotización-con-terceros)).

Un precio por el proyecto se puede pactar de dos maneras, y dan resultados distintos:

| Qué cubre el `agreed_total` | `lineIds` | Resultado medido |
| --- | --- | --- |
| Sólo el trabajo propio, en 11.000.000 | Las seis líneas del equipo | Neto 20.663.333: 11.000.000 más los terceros a su regla (9.663.333). Margen del trabajo propio `0.484843`. Ninguna fila marcada |
| Todo el proyecto, en 20.500.000 | Las seis líneas y `tp-production`, `tp-talent`, `tp-media` | Neto 20.500.000: 11.081.695 de trabajo propio y 9.418.305 de terceros. Margen del trabajo propio `0.488641`. **La fila de medios sale marcada** |

En la segunda, la rebaja se reparte en proporción entre todo lo nombrado, también los medios, que se cobran al costo
y tienen su piso en el costo: `tp-media` queda en 3.248.811 contra un `floorNet` de 3.333.333, con
`netShortOfFloor` `84522`. Un precio por todo bajo el precio de política deja bajo su piso a lo que se refactura al
costo. Si eso no es lo que se pactó, los costos que se traspasan al costo quedan fuera del `agreed_total`; si lo es,
es una fila marcada y la decide el CEO.

Para el documento, todo en una línea «1 proyecto»:

```json
"cover": { "netLabel": "Valor neto del proyecto" },
"combine": [
  {
    "keys": ["fee", "third_party:tp-production", "third_party:tp-talent", "third_party:tp-media"],
    "label": "Campaña de contenidos y comunidad",
    "detail": "Servicio, producción, talento y medios",
    "unit": "proyecto"
  }
]
```

Sobre el artefacto de la segunda variante y una copia de `managed-on-demand-third-party.document-brief.json` sin su
bloque `lines`: exit 3, una línea «1 proyecto» de 20.500.000, impuesto «Por confirmar», hitos de 10.250.000,
6.150.000 y 4.100.000, y aparte el costo de USD 890 que paga el cliente. Generado, son cinco páginas. Combinar es
una decisión de presentación: sin `combine`, el fee y cada costo de terceros son una línea cada uno.

### Lo que hoy no se puede cotizar así

Se dice cuando el negocio lo toca; no se resuelve por cuenta propia:

- una oferta propia para proyectos únicos (se usa una de servicio gestionado, On-Demand);
- la puesta en marcha de un servicio gestionado como costo (su kit no la tiene);
- el fee de plataforma prorrateado por dedicación (decisión abierta del CEO);
- el costo medido detrás de las provisiones «TEST ONLY»;
- una herramienta cuyo precio vigente no tiene importe: se elige otro precio y se informa;
- el precio techo del comprador y la lógica de puntaje de una licitación;
- el costo financiero de un pago tardío;
- el panel de Greenhouse e Insights como recursos con costo;
- número de cotización, versiones, QR, firmas y aprobación: son del cotizador de Greenhouse, y adoptarlos es el
  paso siguiente acordado, todavía sin empezar.

Fuera del cotizador por decisión del CEO, no como pendiente: la fecha de inicio y la duración del contrato.

## Archivos y comandos

### Versiones vigentes

Las versiones vigentes no se nombran a mano. El archivo `data/pricing/v3-operating/current.json` (el puntero,
`pricing-v3-current/1`) dice cuál es el catálogo monetario, la policy de recursos y el catálogo de créditos vigentes,
cada uno con su ruta, su versión y su digest. Toda cotización nueva los carga con `--current`, desde la raíz del repo:

```bash
pnpm --silent pricing:v3 current show
pnpm --silent pricing:v3 catalog validate --current
```

`current show` devuelve exit 0 con `"consistent": true` y, por fuente, `"status": "match"`, e imprime qué archivo y
qué versión nombra el puntero; esa es la fuente, no este manual. Hasta la noche del 2026-10-11 eran
`catalog.review-v10.json` (`operating-review-2026-10-11-v10`), `resources.review-v11.json`
(`operating-review-2026-10-11-v11`) y `ai-credits.review-v1.json`. Con la última emisión de ese día el catálogo pasó
a `catalog.review-v11.json` (`operating-review-2026-10-11-v11`, 394 registros); la policy y los créditos son los
mismos. `catalog validate --current` responde esa versión del catálogo, con exit 0. Los siguientes serían el
catálogo v12 y la policy v12.

- `--current` es un interruptor sin valor. Rellena cada uno de `--catalog`, `--policy` y `--credits` que el comando
  acepta y que no recibió; una opción escrita a mano gana sobre el puntero. En `resources budget` rellena `--catalog`
  con el catálogo de créditos.
- Antes de usar una fuente, la CLI comprueba que el archivo tenga la versión y el digest que dice el puntero. Si no
  coinciden rechaza con `CURRENT_VERSIONS_MISMATCH` (exit 1): no cotiza con un puntero desalineado.
- Sin `--current` nada cambió: sin `--catalog` la CLI cae en la baseline histórica `review-2026-10-09-v1`, y
  `--policy` y `--credits` siguen siendo obligatorios. La CLI no elige sola la versión más reciente.
- Una ruta explícita (`--catalog data/pricing/v3-operating/catalog.review-vN.json`) queda sólo para repetir un caso
  con las versiones de su fecha. Las versiones anteriores no se borran ni se editan: las cotizaciones congeladas
  dependen de ellas.
- Quién mueve el puntero y cuándo:
  [mantenimiento](catalogo-v3-seleccion-y-actualizacion.md#versiones-vigentes-el-puntero-currentjson).

El catálogo vigente conserva lo del v5 (redondeo comercial por moneda, tipo de cambio de cotización, los 32 costos de
persona confirmados y declarados como el costo de cada perfil en Chile, y los factores por país del cliente y de cada
persona), el tipo de cambio de cotización EUR→USD que el v6 agregó para las herramientas con precio en EUR, el piso
de margen de la oferta de staffing desde el v7 y la oferta propia de la práctica SEO/AEO desde el v8
([Oferta y piso de margen](#selección-y-asignación)). El v9 agrega la forma del compromiso con su razón de precio,
las dos provisiones de puesta en marcha y el tipo de cambio CLP→USD para un costo facturado en CLP. El v10 agrega
la regla de precio de los costos de terceros por categoría y la reserva de contingencia de los servicios gestionados
vendidos On-Demand, y deja confirmados desde el 2026-10-12 los factores de país que seguían estimados. El v11 agrega
un registro `offer` por cada oferta, con la unidad comercial con que se vende; no cambia ningún precio, costo, factor
ni política ([Oferta y piso de margen](#selección-y-asignación)).
La policy vigente tiene 27 precios de herramientas que rigen hasta que se reemplacen, cada uno con una fecha de
revisión ([Un precio unitario no vence](#un-precio-unitario-no-vence)). La v7 registró Adobe como se factura (dos
productos, en CLP) y la v8 declaró por cuánto tiempo hay que pagar una licencia de Notion o de Microsoft 365 una
vez tomada: un mes. La v9 cargó Microsoft 365 y Notion como se facturan y la fecha en que renueva el contrato de
Adobe, y la v10 dejó como precio por defecto de Creative Cloud Pro el precio sin descuento
([Herramientas con contrato](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)).

**La fecha de la demanda decide qué valores recibe.** Cada valor del catálogo y de la policy se toma según
`brief.quoteDate`, no según el archivo que se carga. La policy vigente rige desde el 2026-10-11, igual que la forma
del compromiso, las provisiones de puesta en marcha y los factores de país: una cotización nueva lleva la fecha del
día en `quoteDate`, y al copiar un ejemplo anterior se cambia también esa fecha. Para repetir un caso anterior se
nombran las versiones de su fecha ([abajo](#secuencia-de-comandos)).

#### Una fecha anterior a los datos

**Una cotización no puede llevar una fecha anterior a los datos que usa.** Con las versiones vigentes, una demanda
fechada antes del 2026-10-11 no calcula (exit 2), y desde el 2026-10-11 el diagnóstico nombra la causa y la fecha a
la que hay que moverse, en vez de una lista de selecciones faltantes:

| `quoteDate` de la demanda | Qué devuelve `diagnostics` | Qué significa |
| --- | --- | --- |
| Anterior al 2026-10-09 | `QUOTE_DATE_BEFORE_CATALOG` en `quoteDate`, con la primera fecha en que rige el catálogo en `detail` | Ningún valor del catálogo rige ese día. No se reporta nada más del catálogo |
| Anterior a la primera política de precio de la oferta (2026-10-11 en `seo-aeo-managed-service`) | `QUOTE_DATE_BEFORE_OFFER_POLICY` en `offerId`, una sola vez, con la fecha en `detail` | La oferta todavía no tenía política de precio. Antes salía un `MISSING_CATALOG_SELECTION` por línea |
| Anterior al registro de una selección (forma del compromiso, factor de país, regla de terceros…) | `MISSING_CATALOG_SELECTION` en su `path`, con `detail` «The quote date is before the first date a record for this selection is in force…» | El registro existe, pero empieza a regir después |
| Anterior al 2026-10-11 | `RESOURCE_POLICY_NOT_EFFECTIVE` en `policy.source`, con la fecha en `detail` | La policy de recursos vigente rige desde ese día |

En los cuatro casos se corrige igual: la fecha del día en `quoteDate`. No se cambia la vigencia de un registro ni se
nombra una versión anterior para que una cotización nueva pase.

**`runNotices.laterCatalogValues` es el aviso de lo mismo cuando la corrida sí calcula.** Dice que el catálogo
tiene valores que empiezan a regir después de la fecha de la demanda y que por eso no se usaron: trae la fecha de la
demanda (`quoteDate`), la fecha más reciente en que empieza a regir un valor (`newestEffectiveFrom`), cuántos
valores quedaron fuera (`records`) y cuántos de cada clase (`byKind`). La cotización se calculó con los valores de
su fecha, sin error. Si aparece en una cotización nueva, la fecha está atrasada: corregir `quoteDate` y volver a
correr. No aparece cuando la fecha está al día, ni en `replay`, que reproduce una cotización tal como se congeló
([Avisos de la corrida](#avisos-de-la-corrida-runnotices)).

**Único caso en que el aviso sale con la fecha correcta: una cotización fechada 2026-10-11.** El catálogo v10
confirma ocho factores de país desde el 2026-10-12 (cinco de talento y tres de mercado), así que toda cotización con
`quoteDate` 2026-10-11 trae `laterCatalogValues` con `newestEffectiveFrom` `2026-10-12`, `records` `8` y `byKind`
`{ "talent_factor": 5, "market_factor": 3 }`. Los valores son los mismos; cambia su estado: ese día se leen como
estimados y desde el 2026-10-12 como confirmados ([Valores vigentes](#valores-vigentes)). Se informa tal cual; desde
el 2026-10-12, con la fecha del día, el aviso no sale.

Los catálogos y las policies anteriores a los que nombra el puntero son padres congelados: las cotizaciones hechas
con ellos se siguen reproduciendo igual con `replay`, y en este manual sólo se nombran para repetir un ejemplo
anterior.

### Secuencia de comandos

La secuencia es la misma para cualquier pedido: descubrir, armar la demanda, cotizar, explicar y evaluar. Con las
versiones vigentes, la fecha del día en `quoteDate` y en `--date`, y rutas `--out` nuevas:

```bash
pnpm --silent pricing:v3 resources inspect --current --date 2026-10-11 --query diseñador

pnpm --silent pricing:v3 compose scaffold --current --input data/pricing/v3-operating/writer.brief.json

pnpm --silent pricing:v3 resources portfolio --current --date 2026-10-11 \
  --input data/pricing/v3-operating/portfolio.example.json

# El plan versionado del diseñador está fechado el 2026-10-09: se copia con la fecha del día y con los dos tipos
# de cambio que hoy necesita, EUR→USD (Magnific) y CLP→USD (Adobe). Un archivo versionado no se edita.
sed -e 's/"quoteDate": "2026-10-09"/"quoteDate": "2026-10-11"/' \
  -e 's/"purchaseDate": "2026-10-09"/"purchaseDate": "2026-10-11"/' \
  -e 's/"fx:EUR:USD:ECB:2026-10-09"/"fx:EUR:USD", "fx:CLP:USD"/' \
  data/pricing/v3-operating/designer.plan.json > /tmp/plan-v3-hoy.json

pnpm --silent pricing:v3 compose plan --current --input /tmp/plan-v3-hoy.json --out /tmp/demanda-v3-hoy.json

pnpm --silent pricing:v3 compose quote --current --input /tmp/demanda-v3-hoy.json \
  --out /tmp/cotizacion-v3-hoy.json

pnpm --silent pricing:v3 explain --input /tmp/cotizacion-v3-hoy.json
pnpm --silent pricing:v3 replay --input /tmp/cotizacion-v3-hoy.json
pnpm --silent pricing:v3 compose assess --input /tmp/cotizacion-v3-hoy.json
pnpm --silent pricing:v3 compose preview --input /tmp/cotizacion-v3-hoy.json \
  --format markdown --out /tmp/preview-v3-hoy.md
```

`inspect` devuelve exit 0, `scaffold` exit 2 (siempre deja preguntas; `demand.commercialUnit` es el que el catálogo
declara para la oferta, aquí `role_capacity`) y los demás exit 3. El resumen de
`compose quote` trae `engineVersion` `pricing-v3-local/1.1.0`, `totals.net` `1450.00` en USD y
`priceRounding.multiple` `10`; el preview lo muestra como 1.160,00 del diseñador más 290,00 de implementación
inicial, que es el onboarding de la persona ([Puesta en marcha](#puesta-en-marcha-onboarding-y-reclutamiento)). El
plan no declara forma del compromiso, así que cotiza como On-Going y el resumen no trae `engagementForm`
([Cotizar On-Demand u On-Going](#cotizar-on-demand-u-on-going)). Es una persona por dedicación: no lleva reserva de
contingencia ni el supuesto que la acompaña ([Reserva de contingencia](#reserva-de-contingencia)). Con la fecha
2026-10-11 el resumen trae `runNotices.laterCatalogValues` por los ocho factores de país que rigen desde el día
siguiente ([Versiones vigentes](#versiones-vigentes)). Sin `fx:CLP:USD` en `fxRecordIds`, `compose plan`
devuelve exit 2 con `RESOURCE_FX_SELECTION_REQUIRED` en `1:adobe`: Adobe tiene precio en CLP. `explain`, `replay`,
`compose assess`, `compose preview`, `compose split`, `compose schedule`, `compose cash`, `compose commitments`,
`compose document` y `compose increment` leen sólo artefactos: no reciben `--current` ni versiones.

**Repetir un ejemplo con las versiones de su fecha.** El ejemplo original del diseñador está fechado el 2026-10-09 y
usa una herramienta con precio en EUR cuya referencia de cambio de entonces rige sólo ese día. Para reproducirlo tal
como se cotizó se nombran las versiones que regían esa fecha; es el caso en que sí se escriben rutas de versión:

```bash
ejemplo_catalog=data/pricing/v3-operating/catalog.review-v2.json
ejemplo_policy=data/pricing/v3-operating/resources.review-v2.json
ejemplo_credits=data/pricing/v3-resources/ai-credits.review-v1.json

pnpm --silent pricing:v3 resources inspect --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$ejemplo_credits" --date 2026-10-09 --query diseñador

pnpm --silent pricing:v3 compose scaffold --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --input data/pricing/v3-operating/writer.brief.json

pnpm --silent pricing:v3 resources portfolio --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --date 2026-10-09 \
  --input data/pricing/v3-operating/portfolio.example.json

pnpm --silent pricing:v3 compose plan --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$ejemplo_credits" \
  --input data/pricing/v3-operating/designer.plan.json --out /tmp/demanda-v3-nueva.json

pnpm --silent pricing:v3 compose quote --catalog "$ejemplo_catalog" \
  --policy "$ejemplo_policy" --credits "$ejemplo_credits" \
  --input /tmp/demanda-v3-nueva.json --out /tmp/cotizacion-v3-nueva.json

pnpm --silent pricing:v3 explain --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 replay --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose assess --input /tmp/cotizacion-v3-nueva.json
pnpm --silent pricing:v3 compose preview --input /tmp/cotizacion-v3-nueva.json \
  --format markdown --out /tmp/preview-v3-nuevo.md
```

Los códigos de salida son los mismos. Aquí el resumen de `compose quote` trae `engineVersion`
`pricing-v3-local/1.0.0` y `priceRounding: null` (es una cotización anterior al redondeo), y
`runNotices.priceDates.dueSoon` nombra cuatro vigencias que con esas versiones terminaban dentro de los 30 días
siguientes (la referencia EUR→USD de ese día y los precios de Notion, Adobe y Microsoft 365). Con `--current`, ese
plan sin copiar devuelve exit 2 con `RESOURCE_POLICY_NOT_EFFECTIVE` y `RESOURCE_PRICE_NOT_EFFECTIVE` en `1:adobe` y
`1:notion`: la policy vigente y esos precios rigen desde el 2026-10-11.

Las rutas `--out` deben ser nuevas; nunca sobrescriben un padre o artefacto. Desde el 2026-10-11 el `--out` de una
cotización guarda una cotización calculada o no guarda nada
([Qué hace una corrida bloqueada](#qué-hace-una-corrida-bloqueada)). JSON en stdout es interfaz para agentes.
Exit 0: operación técnica verificada. Exit 2: falta información. Exit 3: preparado/calculado en revisión;
**no es un error de cálculo ni una aprobación comercial**. Replay de una composición en revisión devuelve 3.
Exit 1: rechazo (entrada inválida, conflicto, overwrite o export comercial bloqueado). stdout queda vacío y stderr
trae un único JSON: `{ "error": { "code", "message", "option"?, "allowed"?, "issues"? }, "binding": false }`. `code`
nombra la causa y sale de un registro cerrado ([`errors.ts`](../../../src/lib/finance/pricing-v3/errors.ts));
`message` es un texto fijo que no describe el caso; `option` nombra la opción a corregir, sin su valor; `allowed`,
cuando la opción admite una lista cerrada, la trae (un `--kind` que no existe devuelve los catorce que sí);
`issues` lista hasta 20 ubicaciones `{ "path", "rule" }` dentro del documento rechazado. Desde el 2026-10-11 una
ubicación dice además qué pedía el contrato en ese lugar, cuando la regla lo tiene: `limit` (el tope que rompió un
tamaño o un número, en `too_big` y `too_small`), `allowed` (la lista cerrada de un enum) o `expected` (el tipo
esperado). El reporte nunca contiene el valor recibido, una ruta de archivo ni el mensaje de un parser: decidir por
`code`, no por el texto. Tabla en
[Qué hacer con cada error](#qué-hacer-con-cada-error).
No concatenar una secuencia con `&&` esperando exit 0 de una simulación: interpretar explícitamente estos estados.

### Elegir el comando y su input

| Comando                                                | Input/formato                                                      | Resultado y estado                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `current show` / `current set`                         | Sin input / las tres rutas, `--reason` y `--confirm`               | Puntero de versiones vigentes, su `pointerDigest` y estado por fuente (exit 0 coherente, 2 si no) / puntero nuevo |
| `catalog search` / `catalog show` / `catalog validate` | Catálogo monetario, consulta/kind y fecha opcionales               | Registros con fuentes o digest validado; no vigencia comercial aprobada. `--kind third_party_policy` y `--kind contingency_reserve` listan las reglas de terceros y la reserva; `--kind offer`, la unidad comercial de cada oferta; `--kind allocation`, las horas de un mes a tiempo completo. Un `--kind` que no existe devuelve en `allowed` los catorce admitidos |
| `prepare` / `quote`                                    | Brief y catálogo                                                   | Selección / quote del carril de kits; no recibe demanda compuesta                                            |
| `validate` / `calculate`                               | Request + snapshot resuelto                                        | Validación / artefacto del núcleo; no lee Excel ni descubre tools. `calculate --out` escribe sólo si calcula; `--keep-blocked` guarda el bloqueado |
| `resources inspect`                                    | Catálogo + policy + fecha; créditos opcionales                     | Perfiles, tools, planes, fee separado, necesidades y hashes; precio vencido deja `needs_input` en su entrada; `priceReview` lista revisiones y vigencias por fecha |
| `compose workload`                                     | Volúmenes, capacidad y reparto por línea (`pricing-v3-workload/1`); `--brief` y `--out` para escribir un brief | Dedicación por línea a partir del volumen; con `--brief`, un brief nuevo con `dedication` y `dedicationEvidence` en las líneas dimensionadas; exit 0 listo, 2 si falta algo. No recibe `--current` |
| `compose scaffold`                                     | Brief + policy + catálogo                                          | Demanda editable con slots y preguntas, siempre exit 2; completar planes/asignaciones/alcance. `commercialUnit` es el que el catálogo declara para la oferta; si no lo declara, `null` y la pregunta `COMMERCIAL_UNIT_REQUIRED` |
| `resources portfolio`                                  | Portfolio + policy; fecha/catálogo para costos                     | Cuotas reconciliadas, interno/sin asignar y residual; exit 3 preparado o 2 pendiente                         |
| `compose plan`                                         | Plan con demanda y portfolio opcional + las tres fuentes           | Demanda resuelta y cálculo de prueba; `--out` guarda la demanda, **no** el artefacto                         |
| `compose prepare` / `compose quote`                    | Demanda + catálogo/policy/créditos                                 | Resumen derivado en stdout; `quote` añade `replayDigest`; `runNotices` si la corrida tiene avisos; `agreedTotals` si la demanda declara un `agreed_total`; `ownWork`, `thirdParty` y `contingencyReserve` en una cotización 1.4.0. Resultado completo sólo en el artefacto de `--out`, que se escribe sólo si la cotización calcula; `--keep-blocked` guarda a propósito uno bloqueado |
| `resources budget`                                     | Request de créditos; `--catalog` es catálogo de packs              | Presupuesto independiente; no es input de quote/replay de cotizaciones                                       |
| `explain` / `replay`                                   | Artefacto snapshot, catálogo o composición                         | Detalle completo / verificación con inputs congelados, sin sucesor; replay de composición devuelve resumen   |
| `compare`                                              | Dos artefactos compatibles de snapshot o catálogo                  | Diferencias internas; el CLI actual no compara artefactos de composición directamente                        |
| `compose assess`                                       | Artefacto compuesto                                                | Gaps, `costEvidencePriority` (qué dato estimado confirmar primero y qué costo depende de una dedicación sin evidencia) y `margin`: el margen real, la regla de precio con que se cotizó cada línea (`pricingPolicies`, con su objetivo y su piso) y si el kernel marcó alguna fila bajo su piso (`belowPolicyFloor`); siempre revisión, no aprueba excepciones; JSON |
| `compose preview`                                      | Artefacto compuesto calculado                                      | Allowlist JSON/Markdown para revisión; fee agregado si servicio, un ítem por costo de terceros y lo que el cliente paga directo aparte; importes en escala de moneda, sin emisión |
| `compose split`                                        | Artefacto compuesto calculado + `--tools`                          | El mismo neto presentado en dos cifras por fila: persona y kit de herramientas (tres con terceros); no cambia el total; JSON |
| `compose schedule`                                     | Artefacto compuesto calculado + `--milestones` (arreglo JSON)      | Calendario de pagos: el neto repartido en hitos que suman exactamente el neto, terceros incluidos; no es factura ni cobro; exit 3 |
| `compose cash`                                         | Artefacto compuesto calculado                                      | Lectura de caja: neto, costo completo por naturaleza, caja nueva a proveedores (incluye los terceros refacturados) y caja sobre capacidad ya contratada; no es margen ni decide precio; exit 3 |
| `compose commitments`                                  | Artefacto compuesto                                                | Compromisos con proveedores que duran más que los periodos cotizados; deja fuera las compras a terceros y lo dice; informa, no recomienda; exit 3 (2 si la cotización no está calculada) |
| `compose increment`                                    | Dos artefactos compuestos calculados: `--input`, la cotización con el adicional adentro; `--base`, la cotización base | Lectura interna de un adicional que amplía la base: neto, costo y margen del adicional como diferencia entre las dos cotizaciones, por periodo y en total, y de qué está hecho. No cambia ningún total ni aprueba nada; rechaza dos cotizaciones que no son comparables; exit 3 |
| `compose document`                                     | Artefacto compuesto calculado; `--brief` con los textos del documento; por cada opción adicional, `--option <clave>=<artefacto>` (la opción cotizada sola) o `--increment <clave>=<artefacto>` (el servicio con el adicional adentro) | Sin `--brief`, el andamio del brief (exit 2). Con `--brief`, los datos del documento para el cliente sobre la plantilla A4: toda cifra sale de la cotización; borrador, no emisión; exit 3. El PDF lo genera `render-cotizacion-a4.mjs` |
| `catalog preview` / `catalog apply`                    | Change-set monetario; impacto de briefs opcional                   | Preview / sucesor nuevo; apply exige digest confirmado y `--out`                                             |
| `resources preview` / `resources apply`                | Replacement completo policy/créditos; impacto de demandas opcional | Preview / sucesor nuevo; mismo contexto/hash/impacto, sin selección automática                               |
| `export`                                               | Artefacto completo dentro de policy                                | Gate propio de borrador: composiciones review-only actuales siguen bloqueadas                                |

En toda fila que pide catálogo, policy o créditos, esas fuentes se cargan con `--current`
([Versiones vigentes](#versiones-vigentes)). La excepción es `current set`, que recibe las tres rutas escritas.

Los formatos no son intercambiables. `compose prepare` y `compose quote` imprimen el mismo resumen derivado
([Leer el resumen](#leer-el-resumen)); el resultado completo existe **sólo** en el artefacto que escribe `--out`.
Un `compose quote` sin `--out` no deja el detalle en ninguna parte: cotizar siempre con `--out` y leer el detalle
con `explain` sobre ese archivo (salida grande; pedirla sólo cuando haga falta un componente). Si la cotización no
calcula, `--out` no escribe nada y el resumen lo dice en `runNotices.output`. `replay` de una
composición responde `{ verified, calculationId, summary }`: verifica el archivo y devuelve su resumen, no el
resultado entero. `compose assess` añade un gap `MARGIN_BELOW_POLICY_FLOOR` por cada línea que el kernel marcó bajo
el piso de su política y las lista en `margin.policyFloor.linesBelowFloor`. Desde el 2026-10-11 no compara contra
ningún margen genérico: el 40 %/35 % que traía como propuesta se retiró, y `margin.pricingPolicies` dice con qué
regla (objetivo y piso de su propia oferta) se cotizó cada línea.
`compose preview` imprime los importes derivados en la escala de la moneda (CLP sin decimales) y sólo el neto final:
no detalla redondeo, descuento ni recargo. Los carriles
`prepare`/`quote` de catálogo y `calculate` del núcleo conservan su salida. Opciones ajenas al subcomando se rechazan
con `INVALID_ARGUMENT` y el nombre de la opción; no se interpretan como ejecutadas. Para actualizar el catálogo
monetario, obtener `digest` con `catalog validate --current`; para policy/créditos, usar
`policyDigest`/`creditCatalogDigest` de `resources inspect --current`.

### Qué hace una corrida bloqueada

Vale para `compose prepare`, `compose quote`, `quote` del carril de catálogo y `calculate`, desde el 2026-10-11.

1. La corrida imprime igual todo lo que encontró: `diagnostics` con cada bloqueo y su `path`. Sale con exit 2.
2. **No escribe nada en `--out`.** El resumen lo dice en `runNotices.output`: `written: false` y `reason`
   `QUOTE_NOT_CALCULATED`.
3. Corrige la demanda y vuelve a correr **con el mismo `--out`**. No hay archivo que borrar ni nombre nuevo que
   inventar.

Antes de esa fecha la corrida bloqueada dejaba su artefacto y la corrida corregida chocaba con `OUTPUT_EXISTS`. Ya no
pasa: un `OUTPUT_EXISTS` significa ahora que en esa ruta hay una cotización calculada (u otro archivo), y la regla de
siempre sigue en pie: se elige una ruta nueva y no se borra un artefacto congelado.

Si de verdad necesitas el artefacto bloqueado —para leerlo con `explain`, `replay`, `compose assess` o
`compose commitments`— agrégale `--keep-blocked` y dale una ruta propia:

```bash
pnpm --silent pricing:v3 compose quote --current --input /tmp/demanda.json \
  --out /tmp/demanda.bloqueada.json --keep-blocked
```

`runNotices.output` responde entonces `written: true` y `reason` `KEPT_BLOCKED`. Ese archivo no es una cotización:
`compose document`, `compose schedule` y `compose cash` lo rechazan, y la corrida corregida va a otra ruta.
`--keep-blocked` sin `--out` es `INVALID_ARGUMENT` con `option: "keep-blocked"`.

### Qué hacer con cada error

Códigos del adaptador (argumentos, archivos y formatos). La lista completa y los códigos de dominio están en el
[registro](../../../src/lib/finance/pricing-v3/errors.ts); si un código no aparece aquí, leerlo allí.

| `code`                                   | Qué pasó                                                               | Qué corregir                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `UNKNOWN_COMMAND`                        | El comando no existe                                                   | Revisar con `pnpm --silent pricing:v3 help`                                                       |
| `UNKNOWN_OPTION`                         | La opción en `option` no existe (ej. `--inptu`)                        | Corregir el nombre de la opción                                                                   |
| `INVALID_ARGUMENT`                       | El subcomando no acepta la opción en `option`, o su valor no es válido | Quitar esa opción o corregir su valor; sin `option`, revisar comando/subcomando                   |
| `MISSING_ARGUMENT`                       | Falta la opción en `option`, o llegó sin valor                         | Agregarla con su valor                                                                            |
| `INVALID_FORMAT`                         | `--format` no admitido (`json` o `markdown`; `assess` sólo `json`)     | Usar un formato admitido                                                                          |
| `INPUT_NOT_FOUND`                        | El archivo de la opción en `option` no existe o no se puede leer       | Corregir la ruta de esa opción                                                                    |
| `INPUT_NOT_JSON`                         | El archivo de la opción en `option` no es JSON                         | Entregar el JSON correcto; un Markdown o un preview no son input                                  |
| `SCHEMA_INVALID`                         | Un documento no cumple su schema; `issues` trae `path` y `rule`        | Corregir cada `path`. No indica qué archivo: revisar el que contiene esos campos                  |
| `OUTPUT_EXISTS`                          | La ruta de `--out` ya existe                                           | Elegir un nombre nuevo; nunca borrar un artefacto congelado para reutilizar su ruta. Una corrida bloqueada ya no deja archivo, así que no es la causa ([detalle](#qué-hace-una-corrida-bloqueada)) |
| `OUTPUT_NOT_WRITABLE`                    | La carpeta de `--out` no existe o no permite escribir                  | Crear la carpeta o elegir otra ruta                                                               |
| `PLAN_REQUIRES_VALID_ALLOCATION`         | `compose plan --out` sin demanda resuelta                              | Correr sin `--out`, resolver lo que reporta el plan y repetir                                     |
| `WORKLOAD_REQUIRES_VALID_DIMENSIONING`   | `compose workload --out` sin dimensionamiento listo                    | Correr sin `--out`, resolver lo pendiente y repetir                                               |
| `EXPORT_REQUIRES_COMPLETE_WITHIN_POLICY` | `export` sobre un cálculo en revisión o una composición                | No hay arreglo de argumentos: export bloqueado; en composición, revisar con `compose preview`     |
| `CURRENT_VERSIONS_MISMATCH`              | `--current`: un archivo no tiene la versión o el digest del puntero    | `current show` dice qué fuente y su `status`. No cotizar con rutas a mano para saltarlo: [arreglo](#problemas-comunes) |
| `CURRENT_VERSIONS_CONFLICT`              | `current set`: el `--confirm` no es el del puntero que se reemplaza    | Leer `pointerDigest` con `current show` y repetir. Sin puntero previo no se pasa `--confirm`      |
| `SCHEDULE_MILESTONES_INVALID`            | `compose schedule`: el archivo de `--milestones` no sirve; `option` es `milestones` e `issues` trae `path` y `rule` | Corregir cada `path` ([reglas](#calendario-de-pagos-compose-schedule)); `shares_must_sum_to_one` pide que las partes sumen exactamente 1 |
| `SCHEDULE_REQUIRES_CALCULATED_QUOTE`     | `compose schedule` sobre una cotización bloqueada (`needs_input`)      | No hay neto que repartir: resolver los bloqueos de la demanda y volver a cotizar                  |
| `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE` | `compose cash` sobre una cotización bloqueada                       | Lo mismo: resolver los bloqueos y volver a cotizar                                                |
| `QUOTE_DOCUMENT_BRIEF_INVALID`           | `compose document`: el brief del documento no sirve; `option` es `brief` e `issues` trae `path` y `rule` | Corregir cada `path` ([casos](#problemas-comunes-del-documento)); `unrecognized_keys` suele ser un importe, una moneda, una tasa o una fecha, que el brief no admite |
| `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE` | `compose document` sobre una cotización bloqueada                    | No hay cifras que imprimir: resolver los bloqueos de la demanda y volver a cotizar                |
| `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP`, `QUOTE_DOCUMENT_NOT_REPRESENTABLE`, `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE` | `compose document`: la cotización no se puede representar en el documento; `option` es `input` | No se arregla en el brief ni a mano: leer `issues` ([casos](#problemas-comunes-del-documento)) y cambiar la cotización o reportarlo |
| `QUOTE_DOCUMENT_OPTION_INVALID`          | `compose document`: una opción adicional no se puede imprimir como un solo importe; `option` es `option` (o `increment`, si la opción se entregó con `--increment`) e `issues` nombra cada opción por su posición en la lista de la corrida | No se arregla en el brief ni escribiendo el precio: se corrige la cotización de la opción ([reglas](#agregar-opciones-y-una-cortesía)) |
| `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES`, `QUOTE_INCREMENT_CONTEXT_DIFFERS`, `QUOTE_INCREMENT_VERSIONS_DIFFER`, `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`, `QUOTE_INCREMENT_BASE_NOT_CONTAINED`, `QUOTE_INCREMENT_NET_NOT_POSITIVE` | `compose increment`, o `compose document --increment`: la cotización base y la cotización con el adicional no son comparables. `option` es `input` (`base` si sólo falla la base) en `compose increment`, e `increment` en el documento; `issues` trae `path` y `rule` | No se aproxima ni se arregla a mano: se corrige la cotización con el adicional hasta que contenga a la base bajo los mismos términos ([qué hacer con cada uno](#si-las-dos-cotizaciones-no-se-pueden-restar)) |
| `ADAPTER_FAILURE`                        | Falla que nadie clasificó: es un hueco de la herramienta               | No es un error del pedido. No reintentar a ciegas: reportar el comando exacto a quien la mantiene |

Los conflictos de dominio llegan con su propio código, sin `option`: `REPLAY_MISMATCH` (el artefacto fue modificado o
su versión no está soportada: no editarlo, volver a cotizar), `CATALOG_BASE_CONFLICT` / `RESOURCE_BASE_CONFLICT` (el
`baseDigest` del change-set no corresponde a la base entregada), `CATALOG_PREVIEW_CONFLICT` /
`RESOURCE_PREVIEW_CONFLICT` (el `--confirm` no corresponde al preview vigente: repetir el preview). Un exit 2 o 3 no
es un error: el motivo está en el JSON de stdout, no en stderr. Ahí llegan, en `diagnostics`, las fallas de selección
de la forma del compromiso: `MISSING_CATALOG_SELECTION` con `path` `engagementForm` (la forma declarada no tiene
registro vigente a la fecha de la demanda) y `AMBIGUOUS_SELECTION` en el mismo `path` (dos registros vigentes del
mismo nivel para esa forma). También llegan ahí los diagnósticos de los costos de terceros y de la reserva de
contingencia ([tabla](#si-un-costo-de-terceros-o-la-reserva-fallan)), y los de los asientos de una herramienta
([tabla](#si-la-cuenta-de-asientos-no-cierra)). `compose commitments` sobre una cotización
bloqueada tampoco es un rechazo: devuelve exit 2 con `calculationStatus` `needs_input`.

### Diagnósticos que nombran su causa

Un exit 2 no es un error de argumentos: la demanda necesita algo. Cada entrada de `diagnostics` trae `code` y `path`
y, desde el 2026-10-11, lo que hace falta para corregirla sin leer el código: `detail` (qué parte falla, por regla y
nunca con el dato que escribiste) o `candidates` (los ids utilizables). Los de esa fecha:

| `code` y `path` | Qué pasó | Qué hacer |
| --- | --- | --- |
| `QUOTE_DATE_BEFORE_CATALOG` en `quoteDate` | La demanda está fechada antes del primer día en que rige el catálogo; `detail` dice cuál | Fecha del día en `quoteDate` ([detalle](#una-fecha-anterior-a-los-datos)) |
| `QUOTE_DATE_BEFORE_OFFER_POLICY` en `offerId` | La oferta no tenía política de precio ese día; `detail` dice desde cuándo la tiene | Lo mismo |
| `RESOURCE_POLICY_NOT_EFFECTIVE` en `policy.source` | La fecha cae fuera de la vigencia de la policy de recursos; `detail` dice de qué lado y la fecha | Lo mismo. No nombrar una policy anterior para una cotización nueva |
| `COMMERCIAL_UNIT_CONTRADICTS_OFFER` en `commercialUnit` | La demanda declara una unidad comercial y el catálogo vende esa oferta con otra; `detail` nombra las dos y el registro | Corregir `commercialUnit` al que declara el catálogo. Si lo que se vende es otra cosa, lo que cambia es `offerId` |
| `RESOURCE_ALLOCATION_REQUIRED` en `<periodo>:<herramienta>` | El trabajo de ese mes usa la herramienta y la demanda no declara su asignación; `candidates` trae los `priceId` con importe | Declarar la asignación con uno de esos precios, o excluir con motivo la tarea que la pide si este trabajo no la hace |
| `RESOURCE_PRICE_SELECTION_REQUIRED` en el mismo `path` | La asignación nombra un `priceId` que la herramienta no tiene; `candidates` trae los utilizables | Nombrar uno de ellos |
| `RESOURCE_PRICE_PENDING` en el mismo `path` | El `priceId` existe pero hoy no tiene importe; `detail` trae el motivo que declara la policy | Elegir un precio con importe e informar la elección como supuesto |
| `ALLOCATION_DRIVER_MISMATCH` en el mismo `path` | `serviceShare` no es `allocatedUnits ÷ totalUnits` truncado a 18 decimales, o `allocatedUnits` supera a `totalUnits` | Recalcular `serviceShare` desde el driver |
| `CLIENT_ACCESS_EVIDENCE_REQUIRED` en la herramienta | La evidencia de una herramienta que aporta el cliente no alcanza; `detail` dice el periodo y qué falla: no está confirmada, empieza después del primer día que debe cubrir, termina antes del último día del mes, o `lineIds` repite una línea | Conseguir la evidencia. Si no existe, quitar la entrada de `clientProvidedTools`, dejar la herramienta fuera del trabajo y decirlo en las condiciones ([detalle](#herramientas-del-cliente-y-créditos)) |
| `PENDING_DEDICATION_EVIDENCE`, `DEDICATION_EVIDENCE_NOT_EFFECTIVE` en `lines.<lineId>.dedicationEvidence` | La evidencia de la dedicación está `pending`, o no rige en `quoteDate` | Declararla `estimated` o `confirmed`, con una vigencia que incluya la fecha de la demanda |
| `AGREED_TOTAL_OVERLAPS_ADJUSTMENT` en `adjustments.<adjustmentId>` | Una línea o un costo que nombra el total está dos veces en él, o en otro ajuste | Dejar cada línea en un solo ajuste ([reglas](#registrar-el-precio-acordado)) |
| `AGREED_TOTAL_NOT_REPRESENTABLE` en `adjustments.<adjustmentId>.amount` | El total tiene más decimales que la moneda | Escribirlo en la escala de la moneda |
| `AGREED_TOTAL_WITHOUT_BASE` en `adjustments.<adjustmentId>` | Un total mayor que cero sobre filas que valen cero en todos los periodos | Corregir `lineIds` |
| `AGREED_TOTAL_WITHOUT_POLICY_PRICE` en `adjustments.<adjustmentId>` | La cotización no calcula sin el total, así que no hay precio de política sobre el cual repartirlo | Resolver primero los demás diagnósticos de la corrida |
| `ADJUSTMENTS_EXCEED_PERIOD_LIMIT` en `periods.<n>.adjustments` | Un total se vuelve hasta un ajuste por clase de cobro en cada periodo; con los demás, ese periodo supera los 10 que admite | Reducir los ajustes declarados |
| `DUPLICATE_ADJUSTMENT_ID` en `adjustments` | Un `adjustmentId` choca con otro, o con el nombre que toma un total al repartirse (`<adjustmentId>:monthly`, `:setup`, `:third_party`) | Un id distinto por ajuste |
| `INVALID_DEDICATION` en `periods.<n>.request.lines.<i>.dedication` | La dedicación supera 1 FTE: más de `1` en `fte`, o más horas que las de un mes a tiempo completo | Corregirla, o subir `headcount` |

Los demás diagnósticos están en la tabla de su tema: [asientos](#si-la-cuenta-de-asientos-no-cierra),
[terceros y reserva](#si-un-costo-de-terceros-o-la-reserva-fallan), [forma del compromiso](#cotizar-on-demand-u-on-going)
y [Problemas comunes](#problemas-comunes).

## Selección y asignación

1. Resolver la variante exacta del perfil: consultores HubSpot y otros niveles mantienen costos distintos.
2. Confirmar tareas y alcance: Copywriter con tareaSEO requiere SEMrush; no cambia al salario de SEO Specialist.
3. Base común Notion/Microsoft 365; añadir Adobe, plataformas e IA sólo cuando el trabajo lo requiere.
4. Elegir `priceId`, frecuencia y plan explícitos. Público, operador, factura e histórico conservan fuente separada.
5. Identificar usuarios con IDs estables sin PII. `planned-*` son slots, nunca personas contratadas ni seats existentes.
   Un id estable es un texto que nombra el puesto y se repite igual donde es la misma persona (`design-slot`,
   `care-titular`): el cotizador cuenta asientos por esos ids, así que la misma persona con dos ids paga dos asientos y
   dos personas con el mismo id, uno. Cuando nadie está asignado todavía, el id del puesto basta; nunca un nombre, un
   correo ni un RUT. Un `planned-*` que queda en la demanda sale en `compose assess` como `USER_ASSIGNMENT_REQUIRED`.
6. Declarar cantidad, capacidad contractual, driver y parte atribuida por mes. No hay reparto automático por FTE:
   `serviceShare` se escribe, y tiene que ser exactamente `allocatedUnits ÷ totalUnits` truncado a 18 decimales
   (`ALLOCATION_DRIVER_MISMATCH` si no).
   Los asientos de una herramienta nominativa se declaran como se compran, y los meses iguales, una sola vez
   ([Declarar los asientos de una herramienta](#declarar-los-asientos-de-una-herramienta)).
7. Presupuestar créditos por proveedor/mes; la CLI suma consumo de roles y elige paquetes discretos una sola vez.
8. Examinar diagnóstico, desglose y evaluación económica antes de compartir siquiera un precio de prueba.

**Base de costo: el costo objetivo, no la nómina.** Los costos de persona del catálogo vienen del Excel de pricing y
representan el nivel de sueldo que el operador (CEO) quiere alcanzar para el equipo. Es su decisión del 2026-10-11:
no quiere que el cotizador use el costo real de nómina. La nómina actual está bajo ese costo, así que el margen real
de hoy sobre las personas es mayor que el que muestra el cotizador. Al explicar un resultado, ese costo se nombra
«costo objetivo del perfil»: no es lo que Efeonce paga hoy. No propongas conectar la nómina real como mejora ni
reemplaces un costo del catálogo por uno de nómina. Un costo específico se registra sólo cuando el costo objetivo de
un perfil en un país se aparta del costo de Chile por su factor
([cuándo](#cuándo-registrar-el-costo-específico-de-un-perfil-en-un-país)).

**Oferta y piso de margen.** La oferta del brief (`brief.offerId`) elige la política de precio de cada perfil y, con
ella, el objetivo y el piso que el motor vigila. Hay tres, todas decididas por el CEO. Se elige por lo que se vende y
por la práctica que lo entrega ([tabla por tipo de negocio](#paso-1--elegir-oferta-unidad-forma-y-periodos)). Desde
el catálogo v11 la unidad comercial de cada una es un dato del catálogo (registro `offer`,
`catalog search --current --kind offer`): `compose scaffold` la escribe y una demanda que declare otra no calcula
(`COMMERCIAL_UNIT_CONTRADICTS_OFFER`). No existe una oferta propia para un proyecto único de alcance cerrado: hoy se
cotiza con una oferta de servicio gestionado vendida On-Demand a un solo precio, y se dice así.

- Una persona vendida por dedicación (staff augmentation): `offerId: "talent-assurance-staffing"`, con
  `commercialUnit: "role_capacity"`. Piso de 25 % (2026-10-11, catálogo v7). El objetivo es 30 %, 35 % o 40 % según el
  tier del perfil; esos objetivos los propuso el agente y el CEO los confirmó el mismo día (`COMMERCIAL_POLICY` en el
  ledger). Elígela cuando el cliente compra la dedicación de una persona y dirige su trabajo.
- Un servicio gestionado de la práctica creativa: `offerId: "creative-managed-service"`, con
  `commercialUnit: "managed_service"`. Piso de 45 % y objetivo de 45 % (2026-10-10). Elígela cuando Efeonce opera un
  servicio creativo recurrente (contenido, diseño, social care, producción).
- Un servicio gestionado de la práctica SEO/AEO: `offerId: "seo-aeo-managed-service"`, con
  `commercialUnit: "managed_service"`. Piso de 45 % (aprobado el 2026-07-13) y objetivo de 55 %, el extremo bajo de la
  banda 55–60 % de esa práctica, propuesto por el agente y confirmado por el CEO el 2026-10-11 (catálogo v8). Elígela
  cuando Efeonce opera un programa SEO/AEO recurrente. Rige para cotizaciones fechadas desde el 2026-10-11; con una
  fecha anterior la corrida queda `needs_input` con `MISSING_CATALOG_SELECTION` en `lines.<lineId>.pricing`.

No elijas una oferta por el margen que deja pasar: ni la de staffing para un servicio gestionado porque su piso es
más bajo, ni la creativa para un programa SEO/AEO, que saldría a 45 % y no a su objetivo. Sobre un piso, el objetivo
puede subirse por oferta o por perfil con una versión nueva del catálogo; nunca se baja el piso para que un precio
pase. Si declaras un neto acordado bajo el piso, el
cotizador no lo rechaza ni lo corrige: marca la línea con `MARGIN_BELOW_FLOOR` y la lista en `marginFloor.lines[]` del
resumen, con su `minimumMargin` y su margen real ([Leer el resumen](#leer-el-resumen)). Eso se le informa al operador
tal cual; no se «arregla» quitando costo, con un descuento ni con el redondeo. La excepción bajo un piso es del CEO,
caso por caso, y no sirve de referencia para otro cliente. Una cotización con fecha anterior al 2026-10-11 conserva
el recargo histórico de staffing, sin piso; eso vale para un artefacto ya congelado o para un caso repetido con las
versiones de su fecha, porque con `--current` una demanda con esa fecha no calcula
([por qué](#una-fecha-anterior-a-los-datos)).

**La oferta no es la forma del compromiso.** Qué se vende lo dice `offerId`; si es un trabajo continuo o uno acotado
lo dice otro campo, `brief.engagementForm`, que mueve el precio y nunca el piso
([Cotizar On-Demand u On-Going](#cotizar-on-demand-u-on-going)). `engagementCode` (`monthly`) sigue siendo la
cadencia de cobro que elige la política de precio: no se cambia para expresar la forma. En las dos ofertas de
servicio gestionado la forma decide además si la cotización lleva la reserva de contingencia
([Reserva de contingencia](#reserva-de-contingencia)).

Las 32 reglas de perfil son **reglas iniciales para revisión**, no recetas universales completas ni autorización
de compras. Hay tareas adicionales para WordPress, UX, video, stock, datos, comunidad y automatización.
Añadir sólo las necesidades del alcance: un desarrollador no exige automáticamente hosting o plugins WordPress.
Un servicio `managed_service` conserva roles como costo interno y proyecta un fee por periodo más implementación,
si la hay. Su SOW, entregables, aceptación, límites y responsabilidades necesitan validación propia.

## Reparto por capacidad declarada

`pricing-v3-resource-portfolio/1` declara recurso/plan/mes, cantidad, unidad, total, unidades por cuenta,
internas y sin asignar. Las tres partes deben reconciliar exactamente. Cuota = unidades de cuenta / total;
Decimal mantiene el residual explícito. Con fecha/catálogo, se presenta también costo mensual en moneda original.
No convertir EUR a USD sin la referenciaFX explícita en demanda.

Ejemplo **hipotético** (`portfolio.example.json`, corrido con `--current` y la policy v10): Adobe Creative Cloud
Pro CLP 325.405,5 al mes (el precio sin descuento), capacidad 160, cliente 40, interno 80, sin asignar 40 → CLP
81.351,375 / 162.702,75 / 81.351,375.
El 25% deriva de las unidades del ejemplo; no se guarda como default de cartera. Ese ejemplo reparte un paquete
entre cuentas por capacidad declarada. Cuando lo que se atribuye es la licencia de una persona, la parte es una de
las tres licencias del paquete (1/3), no esas horas
([Herramientas con contrato](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)); y cuánto carga la
cotización del asiento de una persona a tiempo parcial está en
[Asientos de una persona a tiempo parcial](#asientos-de-una-persona-a-tiempo-parcial). Vercel/GCP se reparten con el
mismo contrato por capacidad de plataforma declarada. No inventar 10 clientes ni aplicar el rango de Vercel como
importe exacto: seleccionar mínimo 60 o máximo 100 explícitamente hasta contar con factura/consumo concreto.

Seats nominativos por usuario (`basis=seat`) se declaran en la demanda con cantidad entera, usuarios y driver;
el portfolio de pools no los convierte en una suscripción compartida. Un paquete nominativo, como Adobe, puede
repartirse por capacidad manteniendo el límite de usuarios (3 CC por paquete). Repartir un costo no es permiso para
compartir una cuenta: desde el 2026-10-11, que dos personas usen un mismo asiento se declara aparte, con su motivo
(`seatSharing`), y que el proveedor lo permita se confirma fuera del cotizador
([Declarar los asientos de una herramienta](#declarar-los-asientos-de-una-herramienta)). La reconciliación entre todas las cuentas/usuarios reales requiere su inventario declarado;
este flujo no reserva ni fiscaliza asignaciones live. Las funciones internas de una cuenta distribuyen el costo
por usuarios únicos; los créditos por consumo. No atribuirles una ponderación por horas que no fue implementada.

## Herramientas del cliente y créditos

`clientProvidedTools` declara herramienta/mes/líneas, motivo y evidencia confirmada que cubra la ventana de uso.
El costo del recurso Efeonce se omite sólo para esas líneas; el desglose registra `client-provided`.
BaseNotion/M365 y herramientas de créditos no se sustituyen por esta excepción. Sin evidencia, con vigencia
insuficiente o cobertura de líneas desconocidas, el cálculo completo queda bloqueado.

**Qué tiene que cubrir la evidencia.** Estado `confirmed` y una vigencia que cubra todo el uso del periodo: en el
periodo 1, desde `quoteDate` hasta el último día de ese mes; en los demás, el mes calendario completo. Si no,
`CLIENT_ACCESS_EVIDENCE_REQUIRED` en la herramienta, y desde el 2026-10-11 su `detail` dice el periodo y qué parte
falla: que no está confirmada, que empieza después del primer día que debe cubrir, que termina antes del último día
del mes, o que `lineIds` nombra una línea dos veces. Notion, Microsoft 365 o una herramienta de créditos en
`clientProvidedTools` dan `CLIENT_COVERAGE_NOT_ALLOWED`.

**Si el cliente dice que la aporta y no hay evidencia confirmada.** No se escribe una evidencia que no existe ni se
marca `confirmed` para que la corrida pase. Se quita la entrada de `clientProvidedTools` y la herramienta se deja
fuera del trabajo: si la pide una tarea de la receta del perfil, se excluye esa tarea en
`work[].excludedProfileTasks` con el motivo («la herramienta la aporta el cliente»); si la agregaste tú en `tasks` o
`aiToolIds`, se quita de ahí. Y se dice en las condiciones del documento que el cliente la aporta: es un supuesto de
la cotización, no un dato comprobado.

**Cómo se llenan los créditos.** La demanda de créditos va en la línea que los usa y el presupuesto, en la raíz:

- `work[].creditDemand`: `{ periodId | periodIds, toolId, credits }`. `credits` es un entero (de 1 a 1.000.000):
  los créditos de ese proveedor que la línea consume en cada mes nombrado. Una herramienta de créditos incluida en
  una línea sin demanda en un mes da `CREDIT_DEMAND_REQUIRED`.
- `creditBudgets`: una entrada por herramienta y por mes (no admite `periodIds`), con `purchaseDate`, `useBy`,
  `subscriptionCreditsAllocated`, `subscriptionCreditsAvailable`, `activeSubscription` y `allowRepeatedPacks`.
  `purchaseDate` y `useBy` tienen que caer **dentro del mes calendario del periodo**, contado desde `quoteDate`: el
  periodo 1 es el mes de la fecha de la demanda y el periodo 2, el siguiente. `purchaseDate` no puede ser anterior a
  `quoteDate`. Fuera de eso, `CREDIT_PERIOD_WINDOW_MISMATCH`; sin presupuesto, `CREDIT_BUDGET_REQUIRED`.
- La CLI suma la demanda de todas las líneas de ese proveedor y mes y elige los packs una sola vez.

Higgsfield 139 USD/3000 créditos y Magnific 40 EUR/45000 créditos son bases reportadas. Se atribuye la parte de créditos
base presupuestada y se suma el costo completo del pack extra requerido. Se muestran caja extra, créditos
sobrantes y vencimiento; no confundir costo atribuido con dinero nuevo por pagar. Remanentes no se descuentan
de otra cotización sin un presupuesto/inventario explícito. Créditos de herramientas distintas no son fungibles.
[Planner y vigencias](presupuestar-creditos-ia-v3.md).

## Declarar los asientos de una herramienta

**Para qué sirve.** Decirle al cotizador cómo se compra de verdad una herramienta nominativa con precio por asiento
(una licencia por persona), para que el costo que entra a la cotización sea el de esa compra. Desde el 2026-10-11 la
demanda puede decir tres cosas que antes no podía: que hay dos planes a la vez, que un asiento pagado está ocioso y
que dos personas comparten un asiento. Son claves opcionales de la misma demanda
(`pricing-v3-composition-demand/1`): una demanda que no las usa funciona igual que antes.

**La regla que el cotizador comprueba, mes por mes:**

> asientos pagados − asientos declarados ociosos = asientos necesarios

Los necesarios son las personas que usan la herramienta y no comparten, más uno por cada grupo que comparte. Si la
cuenta no cierra, la corrida queda bloqueada (exit 2). El cotizador no la cierra por ti: no supone que un asiento
sobrante está ocioso ni que dos personas se turnan uno.

**Antes de empezar.** Pregunta y anota, con su fuente:

- cuántos asientos se pagan en cada mes y bajo qué plan (`priceId`): anual, mensual, o los dos;
- quién usa la herramienta en cada mes (los `assigneeIds` de las líneas cuya tarea la pide);
- si en algún mes hay un asiento pagado sin persona, y por qué se paga igual;
- si dos personas van a usar un mismo asiento, y si el proveedor lo permite. Esto último no lo valida el cotizador.

Los ejemplos usan la bandeja de atención social (`social-inbox`) de un servicio de doce meses: una persona todo el
año (`care-titular`) y otra de refuerzo en cinco meses de campaña (`care-refuerzo`). Los motivos son de ejemplo.

### Asientos de una persona a tiempo parcial

Son dos cosas distintas y las dos se declaran:

- **Cuántos asientos se pagan (`quantity`).** Siempre enteros en una herramienta nominativa: una licencia no se
  compra por fracciones, y cada asiento pagado se usa, se comparte o se declara ocioso.
- **Qué parte de ese costo carga esta cotización (`serviceShare`, con su `driver`).** Puede ser una fracción. El
  cotizador no la deduce de la dedicación: la escribe la demanda y la CLI sólo comprueba que sea
  `allocatedUnits ÷ totalUnits`.

Así lo aplican los ejemplos versionados:

| Caso | Ejemplo | Qué declara |
| --- | --- | --- |
| Persona dedicada a la cuenta | `designer-on-demand`: Notion y Microsoft 365 | Un asiento, `serviceShare` `"1"`: el asiento es de esa persona y esa persona es de esta cuenta |
| Personas compartidas con otras cuentas | `managed-addon-increment`: tres personas a 1, 0,2 y 0,1 | Tres asientos (`quantity` `"3"`) y la cotización carga `1.3` de `3` (`driver.unit` `declared-fte-share`, `serviceShare` `"0.433333333333333333"`): de cada asiento, la parte igual a la dedicación declarada. El resto es de las otras cuentas de esas personas |
| Asiento comprado para el servicio | Los ejemplos `managed-care`: la bandeja `social-inbox` | Un asiento por persona que la trabaja, `serviceShare` `"1"`, aunque esa persona dedique una fracción de su tiempo: se compra para este servicio y no lo usa nadie más |
| Una licencia de un paquete | `designer-on-demand`: Adobe Creative Cloud Pro | Una de las tres licencias del paquete: `1` de `3`, `serviceShare` `"0.333333333333333333"` |

- En Adobe, el tercio es lo que una licencia es del paquete: un dato de la compra. Lo que no se hace es reemplazarlo
  por horas del paquete (40 de 160 horas no son «un cuarto de Adobe» para quien tiene una licencia).
- Ningún ejemplo versionado tiene una persona **compartida** con licencia de Adobe. En ese caso se carga la licencia
  completa (1 de 3) y se informa como supuesto; cargarla por dedicación, como las herramientas base, lo decide el
  operador y se declara con su driver y su motivo.
- Dentro de la cotización, el costo de una herramienta se reparte entre las líneas que la usan por asiento, no por
  horas. Por eso una línea de 0,1 FTE con asiento propio carga el mismo costo de herramienta base que una de 1 FTE
  de esa misma cotización.

### Caso 1 — dos personas comparten un asiento

1. Declara el asiento que se paga, una vez para todos los meses:

   ```json
   {
     "periodIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
     "toolId": "social-inbox",
     "priceId": "sprout-advanced-monthly",
     "quantity": "1",
     "serviceShare": "1",
     "driver": { "unit": "named-seats", "totalUnits": "1", "allocatedUnits": "1" },
     "reason": "Un asiento de la bandeja para el servicio."
   }
   ```

2. Declara el grupo, en la raíz de la demanda, sólo en los meses en que las dos personas usan la herramienta:

   ```json
   "seatSharing": [
     {
       "periodIds": [3, 6, 9, 11, 12],
       "toolId": "social-inbox",
       "assigneeIds": ["care-titular", "care-refuerzo"],
       "reason": "En los meses de campaña la persona dedicada y la de refuerzo usan el mismo asiento por turnos. Decisión del operador; permiso del proveedor por confirmar."
     }
   ]
   ```

3. Cotiza. En esos meses el grupo cuenta como un asiento y cada persona carga la mitad.

Cada persona del grupo tiene que usar la herramienta en ese mes y estar en un solo grupo. Un grupo necesita al
menos dos personas y un motivo.

### Caso 2 — dos planes a la vez

1. Declara el plan de todo el año.
2. Agrega una segunda asignación **de la misma herramienta** con el otro `priceId`, en los meses en que rige:

   ```json
   {
     "periodIds": [3, 6, 9, 11, 12],
     "toolId": "social-inbox",
     "priceId": "sprout-advanced-monthly",
     "quantity": "1",
     "serviceShare": "1",
     "driver": { "unit": "named-seats", "totalUnits": "1", "allocatedUnits": "1" },
     "reason": "Asiento mensual para la persona de refuerzo en los meses de campaña."
   }
   ```

3. Cotiza. En esos meses hay dos asientos pagados y dos personas; en los demás, uno y una.

El costo de los dos planes se junta y se reparte entre las líneas que usan la herramienta. El resumen muestra una
fila por plan en `attributions`. La misma herramienta, el mismo mes y el mismo `priceId` dos veces siguen siendo un
duplicado (`DUPLICATE_RESOURCE_ALLOCATION`). Un plan anual no puede cambiar de cantidad ni tener un mes sin declarar
(`ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY`); un plan mensual a su lado no lo afecta.

### Caso 3 — un asiento pagado que nadie usa

1. Declara los asientos que se pagan. Donde alguno no tiene persona, agrega `idleSeats` e `idleReason`, que van
   siempre juntos. Como el dato cambia entre meses, son dos entradas del mismo plan:

   ```json
   {
     "periodIds": [3, 6, 9, 11, 12],
     "toolId": "social-inbox",
     "priceId": "sprout-advanced-annual",
     "quantity": "2",
     "serviceShare": "1",
     "driver": { "unit": "named-seats", "totalUnits": "2", "allocatedUnits": "2" },
     "reason": "Dos asientos anuales; los dos en uso en campaña."
   },
   {
     "periodIds": [1, 2, 4, 5, 7, 8, 10],
     "toolId": "social-inbox",
     "priceId": "sprout-advanced-annual",
     "quantity": "2",
     "serviceShare": "1",
     "driver": { "unit": "named-seats", "totalUnits": "2", "allocatedUnits": "2" },
     "reason": "Dos asientos anuales; uno sin persona fuera de campaña.",
     "idleSeats": 1,
     "idleReason": "El asiento de la persona de refuerzo se compra por el año y no se puede soltar entre campañas."
   }
   ```

2. Cotiza. El costo del asiento ocioso se queda en la cotización, sobre las líneas que usan la herramienta.
3. Corre `compose commitments` sobre el artefacto y lleva al operador lo que muestra: una entrada `idle_seat` con los
   meses-asiento ociosos (siete en este ejemplo: un asiento en siete meses) y su costo.

Si en un mes **nadie** usa la herramienta y el asiento se paga igual, todos los asientos de esa entrada son ociosos
(`idleSeats` igual a `quantity`) y la entrada nombra en `bornByLineIds` las líneas que cargan el costo, en partes
iguales. Con alguien usando la herramienta, `bornByLineIds` se rechaza: el costo sigue al uso.

### Declarar un mes una sola vez (`periodIds`)

Cuando una entrada vale igual para varios meses, escríbela una vez con `periodIds` en lugar de repetirla con
`periodId`. Lo admiten las asignaciones (`allocations`), la demanda de créditos de cada línea
(`work[].creditDemand`), las herramientas que aporta el cliente (`clientProvidedTools`) y `seatSharing`.

- Cada entrada lleva `periodId` o `periodIds`, nunca las dos ni ninguna, y `periodIds` no repite un mes. Si no, la
  demanda no pasa su schema: exit 1 con `SCHEMA_INVALID`.
- Es la misma demanda que una entrada por mes: el cotizador la lee mes por mes. Los totales no cambian.
- `creditBudgets` sigue con una entrada por mes: cada una lleva sus fechas de compra y de vencimiento.
- No confundir con el `periodIds` de un costo de terceros, que ya existía y es obligatorio
  ([Costos de terceros](#costos-de-terceros)).
- `compose plan` escribe así las asignaciones que deriva del portfolio. Un archivo versionado no se reescribe para
  acortarlo: el artefacto congela lo que se declaró, y otra forma de declarar es otra identidad de cálculo.

Verificado el 2026-10-11 sobre una copia de `designer-startup-courtesy.demand.json`: sus 9 asignaciones (tres
herramientas por tres meses) pasan a 3 y la corrida da el mismo costo y el mismo neto, 5.068.112 y 7.650.000.

### Cómo se lee en el resultado

| Dónde | Qué aparece | Qué hacer |
| --- | --- | --- |
| Resumen, `attributions` | Una fila por plan. `seats` (`needed`, `paid`, `idle`, `sharedSeats`), `idle` y `bornByLineIds`, sólo donde se declararon: `seats` existe únicamente cuando ese mes hay un asiento compartido, uno ocioso o más de un plan. Una herramienta con un solo plan y un asiento por persona no trae `seats`, y eso no es un faltante | Comprobar que la cuenta es la que dijo el operador y decirle qué asiento se paga sin uso y cuál se comparte |
| `compose commitments` | Entradas `idle_seat`, la señal `PAID_SEAT_IDLE_WITHIN_ENGAGEMENT` y `totals.idleSeats` | Informar los meses-asiento ociosos y su costo. Ese costo ya está dentro de la cotización: no se suma |
| `compose assess` | `IDLE_SEAT_COST_REVIEW` y `SHARED_SEAT_TERMS_REVIEW`, por herramienta y mes | Son puntos por confirmar con el proveedor y con el operador, no errores |

### Si la cuenta de asientos no cierra

Todos llegan en `diagnostics` del resumen, con exit 2. El `path` es `<período>:<herramienta>`, o
`<período>:<herramienta>:<priceId>` si la herramienta tiene dos planes.

| `code` | Qué pasó | Qué hacer |
| --- | --- | --- |
| `INSUFFICIENT_NAMED_SEAT_CAPACITY` | Faltan asientos: hay más personas que asientos en uso | Declarar el asiento que falta (otro plan o más cantidad) o, si de verdad comparten uno, el grupo en `seatSharing`. **No quitarle la tarea a una persona** |
| `UNACCOUNTED_NAMED_SEATS` | Sobran asientos: se paga uno que nadie usa y nadie declaró ocioso. `detail` dice cuántos se pagan, cuántos son ociosos y cuántos se necesitan | Si se paga de verdad, declararlo con `idleSeats` e `idleReason`. Si no se paga, bajar `quantity` |
| `INVALID_IDLE_SEATS` | `idleSeats` en una herramienta que no es nominativa por asiento, o mayor que `quantity` | Corregir la cantidad; un paquete o una herramienta compartida no tienen asiento ocioso |
| `IDLE_SEAT_BEARER_REQUIRED` | Nadie usa la herramienta ese mes y la entrada no dice quién carga el asiento | Nombrar las líneas en `bornByLineIds`, con el acuerdo del operador |
| `IDLE_SEAT_BEARER_NOT_ALLOWED` | `bornByLineIds` en un mes en que la herramienta tiene usuarios, o en una entrada sin asientos ociosos | Quitar `bornByLineIds` |
| `INVALID_IDLE_SEAT_BEARER` | `bornByLineIds` repite una línea o nombra una que no está activa ese mes | Corregir los `lineId` |
| `INVALID_SEAT_SHARING` | El grupo nombra a alguien que no usa la herramienta ese mes, repite una persona, la pone en dos grupos, o la herramienta no es nominativa | Corregir el grupo; sólo comparten quienes usan la herramienta ese mes |
| `UNUSED_SEAT_SHARING` | Un grupo para un mes en que nadie usa la herramienta | Quitar ese mes de `periodIds` |
| `RESOURCE_HOLDING_ID_TOO_LONG` | Con dos planes, el nombre de la herramienta más el del precio supera lo que admite el motor | No se arregla en la demanda: reportarlo a quien mantiene la policy |

### Qué no hacer con los asientos

- **No quitarle una tarea a una persona para que los asientos calcen.** Si la persona usa la herramienta, la tarea
  se queda y el asiento se declara: propio, compartido o de otro plan. Excluir la tarea saca el costo de la
  cotización y deja un margen que no es el real.
- **No declarar un asiento compartido porque es más barato.** Se declara cuando es lo que se va a hacer y el
  operador lo decidió, con el motivo; que el proveedor lo permita es un pendiente que se informa.
- **No esconder un asiento ocioso bajando `quantity`** si el asiento se paga, ni repartirlo como si alguien lo usara.
- **No inventar el motivo** de un asiento ocioso o compartido, ni las líneas que lo cargan: se preguntan.
- **No presentar el costo de un asiento ocioso como un monto aparte**: ya está en el costo de la cotización.

## Actualizar valores sin alterar cotizaciones anteriores

FX de cotización y reglas de redondeo:
[mantenimiento del catálogo monetario](catalogo-v3-seleccion-y-actualizacion.md#cambiar-el-redondeo-o-el-fx-de-cotización).
Factores de país (talento y mercado) y costo de un perfil en un país:
[factores de país y costos específicos](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país).
Planes/reglas o packsIA: `resources preview` / `resources apply`. Change-set completo:

```json
{
  "schemaVersion": "pricing-v3-resource-change/1",
  "kind": "policy",
  "baseDigest": "SHA256_DE_LA_POLICY_ACTUAL",
  "reason": "Factura, responsable, fecha y motivo de la revisión",
  "replacement": { "schemaVersion": "pricing-v3-resource-policy/1", "version": "VERSION_NUEVA" }
}
```

`replacement` lleva **todo** el documento válido, no sólo esos dos campos ilustrativos; `kind=credits` usa el
schema de catálogo de créditos. Obtener `policyDigest` y `creditCatalogDigest` desde
`resources inspect --current --date <fecha>`; una base incorrecta bloquea. Conservar el change-set y el preview como
evidencia de autor/motivo/impacto.

```bash
pnpm --silent pricing:v3 resources preview --current \
  --input cambio-recursos.json --impact demandas-impacto.json --out preview-recursos-nuevo.json

pnpm --silent pricing:v3 resources apply --current \
  --input cambio-recursos.json --impact demandas-impacto.json \
  --confirm DIGEST_DEL_PREVIEW --out data/pricing/v3-operating/resources.review-vN.json
```

`cambio-recursos.json`, `demandas-impacto.json`, `DIGEST_DEL_PREVIEW` y `vN` son marcadores: el digest es el
`previewDigest` que devuelve `preview` (exit 0) y `vN` es el número siguiente al de la policy vigente.
`--impact` es array de demandas estructuradas. Apply revalida schema/referencias/base/impacto/digest y versión
nueva, y escribe el sucesor en una ruta nueva. Un monto confirmado no hereda una factura anterior al cambiar;
requiere nueva referencia. Cambios de costos/packs de créditos requieren evidencia nueva. La cadencia de revisión
y owners sigue el [contrato](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md).
No es monitor automático ni contrato de reajuste al cliente. Replay de una cotización anterior usa sus inputs
congelados. Creative Cloud Pro se cotiza por defecto sin su descuento (`current`); el importe que Adobe factura
mientras dura el descuento está cargado como `invoiced-with-discount` y sólo entra si el operador lo elige
([cuándo](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)).

**Emitir la versión no la deja vigente.** `apply` no toca el puntero: `--current` sigue cargando la versión anterior
hasta que se mueve con `current set`, y mientras tanto `pnpm pricing:v3:test` queda en rojo, porque una guarda exige
que el puntero nombre la versión de número más alto de cada carpeta. Los pasos son los mismos para el catálogo
monetario y para la policy:
[mover el puntero](catalogo-v3-seleccion-y-actualizacion.md#versiones-vigentes-el-puntero-currentjson).

### Un precio unitario no vence

Decisión del operador (CEO) del 2026-10-11: el precio unitario de una suscripción no vence. Notion o Microsoft 365 no
cambian su precio; lo que cambia es cuántas licencias se contratan.

- **Qué tiene la policy vigente.** Sus 27 precios de herramientas rigen hasta que alguien los reemplace
  (`effectiveUntil` `9999-12-31`). 24 llevan `reviewBy: "2027-04-11"`; los tres de Adobe (`current` e
  `invoiced-with-discount` de Creative Cloud Pro, y `current` de Adobe Express) llevan `reviewBy: "2026-11-16"`, el
  día en que renueva su contrato. Antes de la v6 casi
  todos (24 de 25) terminaban dentro de los 30 días de su evidencia, y una cotización con fecha posterior quedaba
  bloqueada con `RESOURCE_PRICE_NOT_EFFECTIVE`.
- **`reviewBy`** es un campo opcional de cada precio de la policy: la fecha para volver a mirar ese precio. Avisa,
  nunca bloquea y nunca cambia un resultado. La fecha a seis meses la eligió el agente al emitir la v6; no es una
  decisión explícita del operador y se cambia con otra versión.
- **`commitmentTermMonths`** es otro campo opcional del precio: por cuántos meses hay que pagar una licencia una vez
  tomada. Tampoco cambia un resultado; lo lee `compose commitments`
  ([Herramientas con contrato](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)). Junto con él se puede
  declarar **`commitmentRenewsOn`**, la fecha en que renueva el contrato.
- **Un precio cambia sólo con una versión nueva de la policy** (`resources preview` → `resources apply` → mover el
  puntero). No se corrige en la demanda ni editando la versión vigente.
- **La cantidad de licencias se declara en cada cotización** (asignaciones de la demanda); no es parte del precio.
- **22 de los 27 siguen marcados `estimated`**; la mayoría es precio público de lista. Salen en `reviewSignals`
  como `ESTIMATED_SOURCE` y en `estimateExposure` con su peso. Pendiente en el ledger como `UNIT_PRICE_REVIEW`
  (confirmar el plan contratado donde el precio es de lista).

`resources inspect` lee las fechas a la fecha que se le pasa y las devuelve en `priceReview`:

```bash
pnpm --silent pricing:v3 resources inspect --current --date 2026-10-11
```

| Clave de `priceReview` | Qué lista                                                                                 | Qué hacer                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `reviewDue`            | Fechas de revisión que ya pasaron                                                         | Avisar al operador; no bloquea. Revisar el precio y, si cambió, emitir una versión          |
| `dueSoon`              | Vigencias duras y fechas de revisión que caen dentro de `withinDays` (30) días            | Avisar antes de que una vigencia dura bloquee la próxima cotización                         |
| `expired`              | Vigencias duras que ya pasaron: una cotización con esa fecha no puede usar ese valor      | `blocksWith` dice el diagnóstico que saldría; el valor se reemplaza con una versión nueva   |

Cada entrada trae `kind` (`review` o `hard_expiry`), `subject` (`tool_price`, `resource_policy`, `catalog_record` o
`credit_provider`), `ref`, `date`, `daysLeft` (negativo si ya pasó) y `blocksWith` (`null` en una revisión). Dos
casos del contrato 1.4.0: en el resumen de una cotización, la vigencia de la cotización de un proveedor sale con
`subject` `third_party_quote` y `blocksWith` `STALE_SOURCE`
([Costos de terceros](#costos-de-terceros)); y el fin de un registro de reserva de contingencia sale como
`catalog_record` con `blocksWith` `null` y un texto en `consequence`, porque no bloquea: la cotización siguiente
simplemente no lleva reserva ([Reserva de contingencia](#reserva-de-contingencia)). Con
`--date 2026-10-11` devuelve exit 0, `reviewDue` y `dueSoon` vacíos y una entrada en `expired`:
`fx:EUR:USD:ECB:2026-10-09`, la referencia EUR→USD de un solo día. No afecta a una cotización nueva, que usa el tipo
de cambio de cotización `fx:EUR:USD`; sigue apareciendo porque el registro anterior no se retiró. Con `--date`
2026-11-15 los tres precios de Adobe (los dos de Creative Cloud Pro y el de Adobe Express) pasan a `dueSoon`
(`daysLeft` `1`) y desde el 2026-11-17 a `reviewDue`; con `--date` 2027-03-20 los otros 24 pasan a `dueSoon`
(`daysLeft` `22`), y desde el 2027-04-12 los 27 están en `reviewDue`.

## Cotizar un servicio gestionado por volumen

Para un servicio que se vende por capacidad y se dimensiona por volumen (social care, soporte, producción recurrente),
usar las versiones vigentes (`--current`) y la oferta de la práctica que lo entrega: `creative-managed-service` en el
ejemplo, `seo-aeo-managed-service` si es un programa SEO/AEO.

```bash
# 1. Volumen → dedicación. Sin --brief sólo calcula; con --brief escribe un brief nuevo.
pnpm --silent pricing:v3 compose workload --input data/pricing/v3-operating/managed-care.workload.json \
  --brief data/pricing/v3-operating/managed-care.brief.json --out /tmp/brief-dimensionado.json

# 2. Completar la demanda sobre el brief dimensionado. La demanda versionada del ejemplo está fechada el
#    2026-10-10 y no excluye la tarea de diseño que hoy trae la receta de Community Manager: se copia con la
#    fecha del día y con esa tarea excluida en las dos personas que atienden la bandeja. No se edita el original.
node -e '
const fs = require("fs")
const demand = JSON.parse(fs.readFileSync("data/pricing/v3-operating/managed-care.demand.json", "utf8"))
demand.brief.quoteDate = "2026-10-11"
for (const work of demand.work.filter(w => ["primary", "backup"].includes(w.lineId)))
  work.excludedProfileTasks.push({ task: "express-design", reason: "This role answers the inbox; it does not design pieces." })
fs.writeFileSync("/tmp/servicio-gestionado.demand.json", JSON.stringify(demand, null, 2) + "\n", { flag: "wx" })
'

# 3. Cotizar: artefacto en --out, resumen en stdout.
pnpm --silent pricing:v3 compose quote --current --input /tmp/servicio-gestionado.demand.json \
  --out /tmp/servicio-gestionado.artifact.json > /tmp/servicio-gestionado.summary.json
```

Los pasos 1 y 2 devuelven exit 0 y el paso 3 exit 3 (calculado, en revisión). Si una ruta de `--out` ya existe la CLI
rechaza con `OUTPUT_EXISTS`: elegir otro nombre.

Qué declarar en el workload (`pricing-v3-workload/1`):

- `capacity`: horas productivas y horas contratadas de un mes a tiempo completo, con su fuente.
- `drivers`: unidades al mes y minutos por unidad. La unidad es un nombre libre.
- `fixedWork`: horas fijas al mes que no dependen del volumen.
- `lines`: qué parte de cada driver y de cada bloque fijo toma cada línea del brief, y las horas de presencia que
  debe cubrir aunque no haya volumen. Las cuotas de cada driver y de cada bloque deben sumar 1.
- `rounding.fteStep`: paso al que se redondea la dedicación, siempre hacia arriba.

`compose workload` devuelve exit 0 con el cálculo listo y exit 2 si falta algo. Los casos que pide resolver a una
persona: horas sin dueño, una línea que no existe en el brief, y una línea que necesita más de lo que su dotación
declarada puede dar (`LINE_OVER_CAPACITY`: se sube la dotación o se reparte el trabajo, no se redondea).

**La dedicación dimensionada lleva su evidencia.** Desde el 2026-10-11, con `--brief`, cada línea que el workload
dimensiona sale con `dedication` y con `dedicationEvidence`: la referencia es `workload:<versión>`, la vigencia es
el tramo en que rigen a la vez todas sus fuentes (la capacidad y cada volumen o bloque fijo del que la línea toma
parte), y el estado es el más débil de ellas. Un workload en `mode: "simulation"` es siempre `estimated`. En el
ejemplo, `primary` y `backup` salen con `workload:managed-care-extended-example-v1`, `estimated`, vigente del
2026-10-10 al 2026-12-31; las otras cuatro líneas, que el workload no nombra, conservan lo que el brief traía (aquí,
ninguna evidencia). Si las fuentes de una línea no coinciden en ninguna fecha, `WORKLOAD_SOURCES_NOT_CONCURRENT`.
Con eso la cotización dice sola que sus horas son una estimación
([cómo se lee](#dónde-pesa-un-dato-estimado-estimateexposure)). La demanda versionada del paso 2 es anterior y no
trae evidencia: su costo de persona sale en `dedicationNotEvidenced`.

En la demanda:

- Las líneas usan `kitId: "managed-service-core"`. Las provisiones (`assurance`, `operations`) son opcionales y se
  eligen en `choices`; basta declararlas en una línea para cargarlas una vez.
- Si la receta del perfil trae una tarea que este servicio no hace, se excluye con motivo:
  `"excludedProfileTasks": [{ "task": "social-publishing", "reason": "…" }]`. No se edita la receta.
- Desde la policy v7 la receta de cuatro perfiles de contenido (Social Media Manager, Community Manager, Content
  Manager y Content Creator) trae la tarea `express-design`, que pide Adobe Express. Una línea con uno de esos
  perfiles declara la asignación de `adobe-express` o excluye la tarea con su motivo; si no, la corrida queda
  `needs_input` con `RESOURCE_ALLOCATION_REQUIRED` en `<periodo>:adobe-express`. Aquí las dos personas que atienden
  la bandeja responden mensajes y no diseñan piezas: se excluye. Un Community Manager que sí arma piezas lleva la
  asignación ([Herramientas con contrato](#herramientas-con-contrato-adobe-y-los-plazos-del-proveedor)). No se
  excluye la tarea sólo para que la corrida pase.
- Un servicio gestionado no tiene requisito de puesta en marcha: el kit `managed-service-core` no carga onboarding
  ni admite reclutamiento ([Puesta en marcha](#puesta-en-marcha-onboarding-y-reclutamiento)).
- La bandeja de social care (`social-inbox`) es Sprout Social Advanced con asientos nominativos: un asiento por
  persona que trabaja la bandeja —salvo que la demanda declare que dos personas comparten uno, o que hay un asiento
  pagado y ocioso ([cómo](#declarar-los-asientos-de-una-herramienta))—, con `priceId: "sprout-advanced-annual"` (USD 399 por asiento al mes, precio
  público con facturación anual). Alternativa más barata: `sprout-professional-annual` (USD 299; perfiles ilimitados,
  sin API, integraciones ni informes de atención). El plan Standard no sirve con más de cinco perfiles. Un asiento se paga completo aunque la persona dedique una fracción de su tiempo, y como se compra para este servicio la cotización lo carga entero (`serviceShare` `"1"`); las herramientas base de una persona compartida con otras cuentas son otro caso ([cuál](#asientos-de-una-persona-a-tiempo-parcial)).
- El consumo de agentes se declara en `serviceToolIds: ["agent-runtime-usage"]` con una asignación cuya cantidad es
  el número de bloques de 1.000 ítems procesados al mes.

La política pone cada fila al piso (margen objetivo 45 %, mínimo 45 %) y el catálogo la sube al múltiplo de su
moneda: el ejemplo (cliente y equipo en Chile) sale en CLP 9.530.000 al mes, de ellos 21.054 de redondeo, con margen
`0.451214` y ninguna línea bajo el piso. El 45 % es el piso de margen de los servicios gestionados (decisión del CEO, 2026-10-10): un servicio
donde se puede ganar más sube su margen objetivo en su propia política, no el piso. Así lo hace la oferta SEO/AEO:
la misma copia con `offerId: "seo-aeo-managed-service"` sale en CLP 11.640.000 al mes, con margen `0.550693`, motor
`pricing-v3-local/1.1.0` y ninguna línea bajo el piso.

**Desde el catálogo v10 la forma del compromiso cambia este resultado.** La demanda del ejemplo no declara
`engagementForm`, y las dos ofertas de servicio gestionado tienen una reserva de contingencia para la forma
On-Demand. Por eso el resumen de las dos corridas de arriba trae, en `assumptions`, el supuesto
`CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`: el precio es el mismo de antes, pero el cotizador avisa
que no evaluó la reserva porque no sabe la forma. Se resuelve declarándola en el `brief`:

- `"engagementForm": "on_going"` (servicio continuo): mismo neto, CLP 9.530.000, sin reserva y sin el supuesto; el
  motor pasa a `pricing-v3-local/1.3.0`.
- `"engagementForm": "on_demand"` (alcance fijo): la cotización lleva el recargo de la forma y la reserva. La misma
  copia sale en CLP 11.370.000, con costo 5.666.722 (436.800 de reserva), margen `0.501607` y motor
  `pricing-v3-local/1.4.0` ([Reserva de contingencia](#reserva-de-contingencia)).

Un supuesto no bloquea, pero no se deja pasar: se pregunta la forma y se vuelve a correr.

Sigue siendo una simulación en revisión. Las provisiones y el consumo de agentes son hipótesis declaradas y el plan
de Sprout es precio público. Los 32 costos de persona están confirmados por su autor (el CEO) con los montos del
Excel y, desde el catálogo v5, declarados como el costo de cada perfil en Chile.

`managed-care.demand.json` está fechada el 2026-10-10, un día antes de esa declaración y del inicio de la policy
vigente. Cotizada tal cual con `--current` no calcula: exit 2 con `RESOURCE_POLICY_NOT_EFFECTIVE` en `policy.source`,
`RESOURCE_PRICE_NOT_EFFECTIVE` en `1:notion` y `RESOURCE_ALLOCATION_REQUIRED` en `1:adobe-express`, y su resumen
avisa en `runNotices.laterCatalogValues` que hay 137 valores del catálogo posteriores a esa fecha (136 con el
catálogo v10; el v11 suma el registro `offer` de la práctica SEO/AEO, que rige desde el 2026-10-11). Por eso el paso 2
la copia con la fecha del día: la copia da el precio de arriba —cliente y equipo en Chile: los dos factores de país
valen 1— sin el supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`. Para un cliente o un equipo de otro país:
[Cotizar según el país del cliente y del equipo](#cotizar-según-el-país-del-cliente-y-del-equipo).

## Leer el resumen

`compose prepare` y `compose quote` imprimen el resumen `pricing-v3-composition-summary/1`; `replay` de una
composición lo devuelve dentro de `summary`. Es una lectura derivada del resultado congelado: cuenta, agrupa y
quita repeticiones, no decide nada. El paso 3 de la sección anterior dejó el resumen en
`/tmp/servicio-gestionado.summary.json` y el artefacto en `/tmp/servicio-gestionado.artifact.json`; sobre ese artefacto:

```bash
pnpm --silent pricing:v3 replay --input /tmp/servicio-gestionado.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/servicio-gestionado.artifact.json
```

Los dos devuelven exit 3 en este ejemplo, igual que el `compose quote` que lo generó. El resumen pesa unos 19 KB;
`explain` del mismo artefacto, unos 237 KB.

| Parte                                                                   | Qué dice                                                                                                                                                                                                                                                                                                                                                                                                                                               | Qué hacer                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculationId`, `replayDigest`                                         | Identidad del cálculo. `replayDigest` sólo aparece en `quote` y en `replay`: es lo que una reproducción debe igualar                                                                                                                                                                                                                                                                                                                                   | Citarlos al registrar o compartir el caso                                                                                                                                                                                                                             |
| `calculationStatus`, `diagnostics`                                      | `diagnostics` son los **bloqueos**, completos. Si no está vacío, el estado es `needs_input`, `totals` es `null` y el exit es 2                                                                                                                                                                                                                                                                                                                         | Resolver cada bloqueo en la demanda (su `path` dice dónde) y volver a correr. No presentar precio                                                                                                                                                                     |
| `reviewStatus`, `quoteReviewStatus`                                     | Revisión de la composición (siempre `requires_review`) y revisión que devuelve el kernel                                                                                                                                                                                                                                                                                                                                                               | Tratar el número como simulación; ninguno de los dos es una aprobación                                                                                                                                                                                                |
| `engineVersion` | Motor que calculó: `pricing-v3-local/1.4.0` si la demanda refactura al menos un costo de terceros o si la cotización tiene una reserva de contingencia (también cuando se renuncia a ella); si no, `pricing-v3-local/1.3.0` si la demanda declara la forma del compromiso (`brief.engagementForm`), también con razón 1; si no, `pricing-v3-local/1.2.0` si el factor de mercado del país del cliente declara que el piso lo acompaña (hoy Colombia y Perú); `pricing-v3-local/1.1.0` si la cotización usa un neto acordado, varios ajustes o una regla de redondeo para su moneda; `pricing-v3-local/1.0.0` en los demás casos. `null` si la demanda quedó bloqueada antes de llegar al motor | No se elige: sale de la demanda y del catálogo. Dice qué lectura de `totals` y del piso aplica |
| `totals`, `marginRateRoundedDown` | Del plazo: `cost`, `undiscountedPrice` (precio calculado; ya incluye el factor de mercado, la razón de la forma del compromiso y el redondeo), `discount`, `net`, margen, impuestos y moneda. Con el motor 1.1.0 se agregan `roundingAdjustment` (lo que sumó el redondeo) y `uplift` (recargo de un neto acordado sobre el precio); en una cotización 1.0.0 esas dos claves no existen. Con el motor 1.2.0 se agrega `marketAdjustment`: cuánto movió el precio el factor de mercado, con signo (negativo en un mercado bajo 1). Con el motor 1.3.0 se agrega `engagementAdjustment`: cuánto movió el precio la forma del compromiso (`"0"` en On-Going). Los dos son informativos y no se suman otra vez. Con el motor 1.4.0 se agregan `thirdPartyCost` y `thirdPartyNet` (costo y neto de las filas de terceros, ya incluidos en `cost` y `net`), `ownWorkMarginRate` (margen del trabajo propio), `contingencyReserve` (reserva dentro de `cost`), `contingencyBase` (costo sobre el que se calculó) y `contingencyReserveWaived` (reserva a la que se renunció). `net = undiscountedPrice + uplift − discount`. `marginRateRoundedDown` es **siempre el margen real** del neto final contra el costo, a 6 decimales y redondeado hacia abajo, en cualquier mercado; con terceros es el margen **mezclado** | Leer el margen de aquí, no recalcularlo. Es el que se informa al operador, también cuando ninguna línea sale marcada. Con costos de terceros se informa junto al de `ownWork`, que es el que se compara con el piso de la oferta ([regla](#cómo-leer-una-cotización-con-terceros)). `tax` y `grandTotal` en `null` significan impuestos pendientes, no cero |
| `commercialAdjustments` | Los ajustes tal como los declara el `brief` congelado: precio por todo el plazo (`agreed_total`), neto acordado por periodo (`agreed_net`) o descuento por tasa (`discount`), con su `reason`. `[]` si no hay | Comprobar que el monto y el motivo son los que aprobó el operador ([Registrar el precio acordado](#registrar-el-precio-acordado)) |
| `agreedTotals` | Sólo si la demanda declara un `agreed_total`. Por cada uno: `amount` (lo pactado), `policyNet` (lo que esas filas valían al precio de política), `differenceFromPolicyNet` (negativo si se vendió bajo él), `distributionUnit` y `distributionUnitBasis` (en qué unidad se repartió y por qué) y `distribution`: una entrada por clase de cobro y neto, con `policyNet`, `agreedNet` y los `periodIds` que lo llevan | Comprobar que `amount` es lo pactado y que el reparto suma eso. El último periodo puede diferir de los demás: tomó lo que sobraba ([cómo se reparte](#un-precio-por-todo-el-trabajo-agreed_total)) |
| `priceRounding`                                                         | Regla de redondeo aplicada a la moneda de salida: `{ currency, multiple, scope, offerId, recordId, revision, sourceStatus }`; `scope` es `general` (regla de la moneda) u `offer` (regla propia de la oferta, que prevalece). `null`: esta cotización no redondea                                                                                                                                                                                      | Con valor, una línea marcada es un incumplimiento real; con `null`, leer «Qué significa una línea marcada» abajo                                                                                                                                                            |
| `marketFactor` | Factor de mercado del país del cliente: `{ country, factor, floorBasis, recordId, revision, sourceStatus }`. Sólo aparece cuando cambia algo: factor distinto de 1 o `floorBasis` declarado. Con cliente en Chile o México (factor 1) la clave no existe. `floorBasis: "base_market"` dice que el piso se lee sobre el precio del mercado base; `null`, sobre el neto final. `sourceStatus` dice si el factor es una decisión (`confirmed`) o un estimado (`estimated`) | Comprobar que el país es el del cliente. Con `floorBasis`, leer «Qué significa una línea marcada» abajo. Si esperabas un factor y la clave no está, revisar `offerMarketCountry` y `quoteDate` ([por país](#cotizar-según-el-país-del-cliente-y-del-equipo)) |
| `engagementForm` | Forma del compromiso que la demanda declaró y su razón de precio: `{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }`; `scope` es `general` (registro de la forma) u `offer` (registro propio de la oferta, que prevalece). La clave sólo existe si la demanda declara la forma; aparece también con razón 1 | Comprobar que la forma es la del pedido. Si la clave no está, la cotización se calculó como On-Going sin decirlo: en un trabajo acotado, declarar la forma y volver a correr ([formas](#cotizar-on-demand-u-on-going)) |
| `ownWork`, `thirdParty`, `contingencyReserve` | Sólo en una cotización 1.4.0. `ownWork`: costo, neto y margen de la cotización sin las filas de terceros. `thirdParty`: lo refacturado (`reinvoiced`, con una fila por costo), lo que el cliente paga directo (`clientDirect`, fuera de todo total) y los costos con proveedor en otra moneda (`fxExposed`). `contingencyReserve`: tasa, base, monto y si se renunció a ella. En una cotización anterior las tres claves no existen | [Cómo leer una cotización con terceros](#cómo-leer-una-cotización-con-terceros). Comparar con el piso de la oferta el margen de `ownWork`, no el mezclado |
| `periods[]`                                                             | Estado y totales de cada periodo                                                                                                                                                                                                                                                                                                                                                                                                                       | Revisar que ningún periodo quede sin calcular y si el neto varía entre meses                                                                                                                                                                                          |
| `assumptions` | Supuestos con que se resolvió el pedido. `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` (el costo no declara país y se asume para el de la línea) sólo aparece en demandas fechadas antes del 2026-10-11; desde esa fecha los costos son el costo en Chile y el país de la persona entra por su factor. `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM` aparece cuando la oferta tiene una reserva de contingencia que depende de la forma del compromiso y la demanda no declara la forma: la reserva no se evaluó. `DEDICATION_ESTIMATED` (una por línea, en `lines.<lineId>.dedicationEvidence`) aparece cuando la demanda declara que la dedicación de esa línea es una estimación | Declararlos al explicar el precio. Si aparece el primero en una cotización nueva, la fecha de la demanda es anterior al catálogo v5: los factores de país no se aplicaron. Si aparece el segundo, preguntar la forma, declararla y volver a correr ([reserva](#reserva-de-contingencia)). El tercero no se corrige: se informa que las horas son una estimación y cuánto pesan ([exposición](#dónde-pesa-un-dato-estimado-estimateexposure)) |
| `reviewSignals[]` | Todos los diagnósticos de los periodos, una entrada por código y severidad, con `count`, `periodIds`, `lineIds` y `paths`. No bloquean los totales. Un factor de país sale como `ESTIMATED_SOURCE` con `paths` `snapshot.talentFactors` (país de la persona) o `snapshot.marketFactors` (país del cliente) sólo en una cotización fechada 2026-10-11: desde el 2026-10-12 están confirmados. La reserva de contingencia y las reglas de terceros, que son estimadas, salen con `paths` `snapshot.contingencyReserve` y `snapshot.thirdPartyPolicies.<categoría>`; una renuncia a la reserva, como `CONTINGENCY_RESERVE_WAIVED` | Explicar cada código presente (`ESTIMATED_SOURCE`, `HISTORICAL_ONLY`, `MARGIN_BELOW_FLOOR`, `CONTINGENCY_RESERVE_WAIVED`…); `paths` dice qué dato lo origina. Con un dato estimado, decir que el precio depende de un estimado. `HISTORICAL_ONLY` (`paths` `snapshot.mode`, una vez por periodo) sale en **toda** cotización: el catálogo vigente está declarado `historical`, es decir, sus valores son de revisión y no una lista de precios aprobada para emitir. No apunta a ningún dato de la demanda ni se corrige en ella; se informa como «simulación sobre un catálogo en revisión» |
| `marginFloor.lines[]` | Líneas que el kernel marcó bajo su piso (una fila de equipo, el de su política; una fila de terceros, con `kind` `third_party`, el de su categoría): `minimumMargin`, `net`, `marginAmount`, `marginRateRoundedDown` (margen real de la línea) y cuánto falta, en hasta tres claves: `floorNet` (el neto mínimo que cumple el piso), `netShortOfFloor` (cuánto más tendría que valer la fila) y `marginAmountShortOfFloor` (margen que falta al neto actual). Cuáles vienen depende del motor, no sólo del país | Ver «Qué significa una línea marcada» abajo |
| `toolSelections`                                                        | `counts` y las herramientas incluidas, las que aporta el cliente y las excluidas con motivo                                                                                                                                                                                                                                                                                                                                                            | Confirmar que cada herramienta incluida corresponde al alcance y que cada exclusión tiene un motivo defendible                                                                                                                                                        |
| `attributions`                                                          | Por herramienta y precio (una fila por plan): estado de la fuente, cantidad, parte del servicio y costo mensual completo, atribuido y sin asignar. Sólo donde la demanda lo declaró: `seats` (`needed`, `paid`, `idle`, `sharedSeats`), `idle` (asientos ociosos de ese plan, su motivo y su costo) y `bornByLineIds` (las líneas que cargan un asiento que nadie usa) | Revisar fuentes no confirmadas y el costo que queda sin asignar. Con `idle` o `sharedSeats`, decirle al operador qué asiento se paga sin uso y qué asiento se comparte, con el motivo declarado ([asientos](#declarar-los-asientos-de-una-herramienta)) |
| `creditBudgets`, `resourceIncrementalCash`, `cashLedger`, `cashMeaning` | Presupuesto de créditos y caja. Costo atribuido no es dinero nuevo por pagar; `cashMeaning` lo explica                                                                                                                                                                                                                                                                                                                                                 | No presentar `cashCommitment` como factura ni como compra                                                                                                                                                                                                             |
| `estimateExposure` | Cuánto del costo descansa en datos estimados, cuánto depende de una dedicación que nadie evidenció (`dedicationNotEvidenced`) y, por dato, cuánto costo depende de él (`costAtRisk`, `shareOfCost`, `marginRateLostIfTenPctHigher`). La dedicación estimada de una línea (`kind` `dedication`) y la cotización estimada de un proveedor (`kind` `third_party`) son datos del ranking. `null` si la cotización quedó bloqueada | Decirle al operador qué dato estimado conviene confirmar primero ([Dónde pesa un dato estimado](#dónde-pesa-un-dato-estimado-estimateexposure)). Es una lectura de sensibilidad, no una validación |
| `runNotices` | Avisos sobre la corrida, no sobre la cotización: `laterCatalogValues` (la demanda está fechada antes de valores más nuevos del catálogo) y `priceDates` (fechas de revisión o de vigencia de los precios que esta cotización usa, incluida la vigencia de la cotización de cada proveedor). Desde el 2026-10-11, también `output`: qué hizo la corrida con `--out` cuando la cotización no calculó. La clave no existe si no hay nada que avisar; no está en el artefacto ni en `replay` | Nunca bloquea. Informarlo al operador junto al resultado ([Avisos de la corrida](#avisos-de-la-corrida-runnotices)). Con `output.written: false`, corregir la demanda y repetir con el mismo `--out` |
| `fullDetail` | Recuerda que el detalle vive en el artefacto, bajo `semantic.result` | Ir al artefacto con `explain` para una fila de selección, una asignación o los componentes de costo de una línea. `explain.commercialAdjustments.rows` trae el recorrido del precio por fila: `undiscountedPrice`, `roundingAdjustment`, `discount`, `uplift` y `net`; con el motor 1.2.0, además `marketAdjustment`, `marketPriceRatio` (cuánto del precio base conserva la fila tras el factor) y `floorNet`; con el motor 1.3.0, además `engagementAdjustment` y `engagementPriceRatio` por fila, y `explain.commercialAdjustments.engagementForm`; con el motor 1.4.0, además `contingencyReserve` por fila, las filas de terceros (`kind` `third_party`) y `explain.commercialAdjustments.thirdPartyPolicies[]` y `.contingencyReserve` |

Las filas que sólo difieren por periodo se agrupan en una con `periodIds`.

### Qué significa una línea marcada

El kernel compara el neto final de cada línea con el piso de su política y la marca (`MARGIN_BELOW_FLOOR`); nunca
corrige un incumplimiento.

**Las tres claves de «cuánto falta».** Medidas sobre `designer-on-demand.demand.json` con `--current`, cliente en
Chile, y un `agreed_net` mensual de 2.000.000 (piso de 25 %, costo de la fila 1.622.704):

| Clave | En el ejemplo | Qué responde |
| --- | --- | --- |
| `floorNet` | `2163606` | El neto mínimo de esa fila que cumple su piso, con el costo que tiene |
| `netShortOfFloor` | `163606` | **Cuánto más tendría que valer la fila** para cumplirlo: `floorNet − net`. Es la cifra que se lleva al operador |
| `marginAmountShortOfFloor` | `122704` | Cuánto margen falta si el neto no se mueve: `minimumMargin × net − marginAmount`. Sirve para distinguir un faltante de redondeo de una decisión de precio; no es lo que hay que subir el precio |

Cuáles trae cada línea:

| Cotización | `marginAmountShortOfFloor` | `floorNet` y `netShortOfFloor` |
| --- | --- | --- |
| Motor 1.0.0 o 1.1.0 (cliente en Chile, México, Estados Unidos o España, sin forma declarada, sin terceros ni reserva) | Sí | No existen |
| Motor 1.2.0 o posterior con el piso leído sobre el neto final (los mismos países, con la forma declarada o con terceros o reserva) | Sí | Sí |
| Cliente en Colombia o Perú (el piso acompaña al factor) | `null` | Sí |

Como toda cotización nueva declara la forma del compromiso, una línea marcada de un cliente en Chile trae hoy las
tres. La misma demanda sin `engagementForm` (motor 1.1.0) trae sólo `marginAmountShortOfFloor` `122704`.

La lectura de «marcada» depende además de dos claves del resumen, `marketFactor` y `priceRounding`:

- **Dónde se lee el piso** (`marketFactor.floorBasis`):
  - Sin `marketFactor`, o con `floorBasis: null` (cliente en Chile, México, Estados Unidos o España): el piso se lee
    sobre el neto final. Ninguna línea marcada significa que el margen de cada línea cumple el mínimo de su política.
  - Con `floorBasis: "base_market"` (cliente en Colombia o Perú, `engineVersion` `pricing-v3-local/1.2.0`, o `1.3.0`
    si la demanda declara además la forma del compromiso): el piso se
    lee sobre el precio que la línea habría tenido en el mercado base (Chile); la rebaja por país ya es una decisión
    de precio y no se marca. **Ninguna línea marcada significa «al precio aprobado para ese país», no «sobre el
    45 %»**: el margen real de esa cotización está bajo el mínimo de la política (41,5 % en el ejemplo de Colombia) y
    se lee en `marginRateRoundedDown`. Una línea sale marcada cuando su neto queda bajo `floorNet`, es decir, cuando
    hay una rebaja adicional a la del país.
- **Una fila de terceros tiene su propio piso** (`kind: "third_party"`): el de la regla de su categoría, no el de la
  oferta. No recibe factor de mercado ni razón de la forma, así que su piso se lee sobre su neto final en cualquier
  país. Sale marcada sólo cuando un neto acordado la deja bajo ese piso
  ([Costos de terceros](#costos-de-terceros)).
- **La forma del compromiso no mueve el piso** (`engagementForm`): el recargo de On-Demand cuenta como margen, así
  que un descuento puede consumirlo hasta el mismo piso que rige en On-Going. Una línea marcada se lee igual con o
  sin forma declarada.
- **Con regla de redondeo** (`priceRounding` con valor, `engineVersion` 1.1.0 o posterior): es toda cotización nueva
  sobre el catálogo vigente en CLP, USD, COP, MXN o PEN. El precio de cada fila facturable se sube al múltiplo siguiente de
  su moneda antes de aplicar ajustes; lo agregado queda en `roundingAdjustment` y nunca se redondea hacia abajo. Una
  fila que cumplía su piso antes de redondear lo sigue cumpliendo después, así que una línea cotizada al piso no sale
  marcada: en el ejemplo `managed-care`, `marginFloor.lines` está vacío. **Una línea marcada es un incumplimiento
  real** —un neto acordado o un descuento la dejó bajo el piso de su mercado— y requiere una decisión del operador
  antes de presentarla ([Registrar el precio acordado](#registrar-el-precio-acordado)). El redondeo no se usa para
  «cumplir» un piso.
- **Sin regla** (`priceRounding: null`): cotizaciones congeladas sobre catálogos anteriores al v4, donde
  `engineVersion` es `pricing-v3-local/1.0.0`, y monedas sin regla, como CLF. Rige la lectura anterior: costo y precio
  se redondean por separado a la unidad de la moneda y una línea al piso puede quedar bajo él por menos de una unidad
  (el mismo `managed-care` sobre el catálogo v3 marca seis líneas con `marginAmountShortOfFloor` entre 0,1 y 0,5).
  Faltan fracciones sin ningún ajuste: es redondeo, decirlo así, no es una excepción. Faltan miles: incumplimiento
  real.

### Avisos de la corrida (`runNotices`)

`compose prepare` y `compose quote` pueden agregar al resumen una clave `runNotices`. Describe la corrida —esta
demanda contra las fuentes de hoy—, no la cotización: no se congela en el artefacto, `replay` no la devuelve y la
clave no existe cuando no hay nada que avisar. Tiene hasta tres miembros (el tercero, `output`, desde el
2026-10-11):

| Miembro              | Qué dice                                                                                                                                                                                                    | Qué hacer                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `laterCatalogValues` | `{ quoteDate, newestEffectiveFrom, records, byKind }`: el catálogo tiene valores que empiezan a regir después de la fecha de la demanda. La cotización se calculó con los valores de su fecha, sin error     | En una cotización nueva la fecha está atrasada: corregir `quoteDate` y volver a correr. Si se repite a propósito un caso anterior, decir que usa los valores de esa fecha. Excepción: con `quoteDate` 2026-10-11 sale siempre, por los ocho factores de país confirmados desde el 2026-10-12 |
| `priceDates`         | `{ withinDays, reviewDue, dueSoon, expired }`, sólo para los precios, registros y proveedores que esta cotización usa, leídos a su `quoteDate`. Las entradas son las de `priceReview` de `resources inspect` | Entrada `review`: avisar que toca revisar ese precio. Entrada `hard_expiry` en `dueSoon`: ese valor deja de servir en esa fecha; avisarlo antes de que bloquee la próxima cotización. Con `subject` `third_party_quote`: la cotización de ese proveedor vence y hay que pedirle una nueva |
| `output`             | `{ option, written, reason, statement }`: la cotización no calculó. Con `written: false` y `reason` `QUOTE_NOT_CALCULATED`, `--out` no escribió nada; con `written: true` y `reason` `KEPT_BLOCKED`, escribió el artefacto bloqueado porque se pidió con `--keep-blocked` | Con `written: false`: resolver los `diagnostics` y repetir con el mismo `--out`. Con `KEPT_BLOCKED`: ese archivo no es una cotización; la corrida corregida va a otra ruta ([detalle](#qué-hace-una-corrida-bloqueada)) |

Reglas de lectura:

- `runNotices` nunca bloquea: no cambia el código de salida, el estado ni ningún total. `output` acompaña a una
  corrida que ya estaba bloqueada por sus `diagnostics`; no es la causa del bloqueo.
- Se informa al operador junto al resultado. No se omite por ser «sólo un aviso» ni se presenta como un error.
- Queda sólo en el stdout de esa corrida. Si el aviso importa para el expediente, se guarda el resumen que imprimió
  `compose quote` (como hace el ejemplo del servicio gestionado con `> …summary.json`).

Casos verificados con `--current`: `managed-care.demand.json` (fechada 2026-10-10) queda bloqueada por la fecha
(exit 2, `RESOURCE_POLICY_NOT_EFFECTIVE`) y aun así trae `laterCatalogValues` con `newestEffectiveFrom` `2026-10-12`
y `records` `137` (64 políticas de precio, 32 costos, 11 factores de talento, 9 de mercado, 7 kits, 5 reglas de
terceros, 2 reservas de contingencia, 2 tipos de cambio, 2 formas del compromiso, 2 recursos y, desde el catálogo
v11, 1 registro `offer`; con el v10 eran 136); la copia de
`managed-care-colombia.demand.json` que arma
[el ejemplo de Colombia](#en-colombia-y-perú-el-piso-acompaña-al-factor) (fechada 2026-10-11) trae
`laterCatalogValues` con `records` `8` (los factores de país confirmados desde el día siguiente); esa misma copia
fechada 2026-10-12 no trae `runNotices`; y fechada 2027-03-20 trae `priceDates.dueSoon` con cuatro revisiones para
el 2027-04-11 (`daysLeft` `22`) y calcula igual, con exit 3. El
[ejemplo con terceros](#cómo-leer-una-cotización-con-terceros), copiado con fecha 2026-11-10, trae en
`priceDates.dueSoon` tres entradas `third_party_quote` para el 2026-11-30 (`daysLeft` `20`, `blocksWith`
`STALE_SOURCE`).

### Dónde pesa un dato estimado (`estimateExposure`)

Casi toda cotización usa datos marcados `estimated`. `reviewSignals` dice cuáles; `estimateExposure` dice cuánto pesa
cada uno, para decidir **cuál confirmar primero**. Se deriva del resultado congelado, sin recalcular nada, así que
también viene en `replay`.

| Clave                                                    | Qué dice                                                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `currency`, `totalCost`, `net`                           | Costo y neto del plazo: los mismos de `totals`                                                                                                                                                                                        |
| `estimatedCost`, `confirmedCost`, `estimatedShareOfCost` | Cuánto del costo depende de al menos un dato estimado y cuánto está confirmado. Un componente cuenta una sola vez aunque dependa de dos datos estimados. Desde el 2026-10-11 los dos montos ya no suman solos `totalCost`: `estimatedCost + dedicationNotEvidenced.cost + confirmedCost = totalCost` |
| `dedicationNotEvidenced` | `{ lineIds, cost, shareOfCost }`: las líneas cuya dedicación no declara `dedicationEvidence` y el costo que esa dedicación gobierna (el costo de la persona y la reserva que descansa en él) donde ningún dato estimado ya lo cuenta. No es un estimado que alguien declaró y nunca se lee como confirmado. `cost` `0` con líneas listadas significa que ese costo ya estaba contado como estimado por otro dato |
| `costInputs[]`                                           | Los datos estimados del lado del costo, de mayor a menor `costAtRisk`: `kind` (`dedication`, `talent_factor`, `person_cost`, `fx`, `tool`, `platform_fee`, `talent_assurance`, `operations`, `setup`, `third_party`), `id`, `label`, `lineIds` y `periodIds`. `dedication` es la dedicación de una línea que la demanda declara estimada; su `id` es el `lineId` y su `costAtRisk`, el costo que esa dedicación gobierna. Con `capacitySetByRule: true` la capacidad cobrada la fijó la regla de asignación (una línea `dedicated`) y la lectura «10 % más alto» no aplica en proporción. `third_party` es el monto de un proveedor cuya evidencia está `estimated`; su `id` es el `costId`. El fee de plataforma es un registro por perfil (`fee:<perfil>`): una cotización con varias líneas trae una entrada `platform_fee` por cada perfil distinto |
| `costAtRisk`                                             | Costo de esta cotización que depende de ese dato. Como un componente puede depender de dos datos, la suma de los `costAtRisk` puede superar `estimatedCost`                                                                           |
| `shareOfCost`                                            | `costAtRisk ÷ totalCost`                                                                                                                                                                                                              |
| `marginRateLostIfTenPctHigher`                           | Margen que se pierde si ese dato resulta 10 % más alto y el neto no cambia: `0,10 × costAtRisk ÷ net`, redondeado hacia arriba. `0.037825` son 3,8 puntos de margen                                                                   |
| `priceInputs[]`                                          | Un factor de mercado estimado: mueve el precio, nunca el costo, y no entra en el ranking. Trae `priceOnFactor` (precio de las personas que multiplica) y `marketAdjustment`. Sólo en cotizaciones fechadas 2026-10-11 con cliente en Perú, México o España: desde el 2026-10-12 esos factores están confirmados |
| `estimatedRules[]`                                       | Políticas estimadas que son reglas y no montos (capacidad facturada, política de precio y, desde el contrato 1.4.0, `contingency_reserve` y `third_party_policy`). No admiten la lectura «10 % más alto» y quedan fuera del ranking. La reserva no es un dato del ranking: agranda en `(1 + tasa)` el costo que depende de los datos de su base |

Ejemplo, la copia de `managed-care-colombia.demand.json` de
[el ejemplo de Colombia](#en-colombia-y-perú-el-piso-acompaña-al-factor), con `--current` y fechada 2026-10-11, el
último día en que el factor de talento de Colombia se lee como estimado (COP 28.100.000, margen real 41,5 %):

| Dato estimado (`kind` / `id`)                   | `shareOfCost`       | `marginRateLostIfTenPctHigher` |
| ----------------------------------------------- | ------------------- | ------------------------------ |
| Todo el costo estimado (`estimatedShareOfCost`) | `0.987206` (98,7 %) | no aplica                      |
| `talent_factor` / `CO:CL`                       | `0.646835` (64,7 %) | `0.037825` (3,8 puntos)        |
| `tool` / `social-inbox`                         | `0.177258` (17,7 %) | `0.010366` (1,0 punto)         |

La misma copia fechada 2026-10-12 da el mismo precio y otra lectura, porque los factores de país ya están
confirmados: `estimatedShareOfCost` baja a `0.340370` (34,0 %), `talent_factor` sale del ranking y el primer dato es
`tool` / `social-inbox`, con los mismos `0.177258` y `0.010366`. Pero ese 34,0 % no deja el resto como confirmado:
la copia no declara de dónde salen sus dedicaciones, así que `dedicationNotEvidenced.cost` es `10628800` (64,7 % del
costo, sus seis líneas) y `confirmedCost` es `210238`, apenas 1,3 %. El 2026-10-11 ese mismo costo de persona ya
contaba como estimado por el factor de talento, y por eso `dedicationNotEvidenced.cost` era `0`.

Qué hacer con esto:

1. Decírselo al operador junto al precio: qué parte del costo es estimada, qué parte depende de una dedicación sin
   evidencia, cuál es el primer dato a confirmar y cuántos puntos de margen mueve. En el ejemplo fechado 2026-10-12:
   «un tercio del costo es estimado y casi dos tercios dependen de dedicaciones que nadie respaldó; de lo estimado,
   lo primero a confirmar es el plan de Sprout (1,0 punto de margen por cada 10 % de error)».
   Una cotización cuyas horas adivinaste no se presenta como confirmada: se declara `dedicationEvidence` con
   `status: "estimated"` y la dedicación entra al ranking con su peso
   ([caso](#caso-c--un-programa-seoaeo-de-tres-meses-con-un-precio-por-el-programa)).
2. Leerlo como sensibilidad, no como validación ni pronóstico. No dice que el dato esté mal ni que el margen vaya a
   bajar: dice dónde un error costaría más.
3. No usarlo para aprobar ni rechazar una cotización, ni para «corregir» un dato en la demanda. Un dato se confirma
   con evidencia y se cambia emitiendo una versión nueva del catálogo o de la policy.
4. Con `quoteDate` 2026-10-11 o posterior, el costo de persona en Chile no aparece en este ranking: está confirmado
   por su autor como costo objetivo ([base de costo](#selección-y-asignación)). El factor de talento de otro país
   aparece sólo con `quoteDate` 2026-10-11; desde el 2026-10-12 es un valor de política confirmado y no entra.

`compose assess` entrega el mismo orden en `costEvidencePriority`: `{ currency, estimatedCost, confirmedCost,
estimatedShareOfCost, dedicationNotEvidenced, confirmFirst }`, donde `confirmFirst` son los cinco primeros
`costInputs`. Un dato que se cobra por línea ocupa un lugar por cada registro: dos líneas de perfiles distintos traen
dos entradas `platform_fee`, y entre los cinco primeros pueden quedar varias del mismo tipo. `assess` agrega además
un gap por línea: `DEDICATION_NOT_EVIDENCED` si la línea no declara evidencia y `DEDICATION_EVIDENCE_REVIEW` si la
declara estimada. Es la forma de
priorizar los gaps de evidencia, que por sí solos se leen todos igual. `assess` no lista un factor de país estimado
entre sus `gaps`; en `confirmFirst` sí aparece (sólo en cotizaciones fechadas 2026-10-11).

## Cotizar según el país del cliente y del equipo

Desde el catálogo v5 el país cambia el resultado, por dos caminos independientes. Los dos se declaran en la demanda
y rigen para demandas con `quoteDate` 2026-10-11 o posterior.

| Campo de la demanda           | Qué declara                                                              | Qué cambia                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brief.offerMarketCountry`    | El país del cliente (uno por cotización)                                 | El **precio**: la parte humana de cada línea se multiplica por el factor de mercado de ese país. Herramientas y fees no reciben factor. El costo no cambia, así que el margen real sí cambia            |
| `brief.lines[].talentCountry` | El país donde está cada persona (uno por línea; el equipo puede mezclar) | El **costo** de esa persona: el costo del perfil en Chile por el factor de talento de su país. El precio sale del costo con el margen objetivo de la política, así que también cambia; el margen casi no |

Son códigos de dos letras y deben estar en el catálogo: hoy `CL`, `CO`, `PE`, `MX`, `US` y `ES`. No se infiere uno
del otro ni de la moneda: un cliente chileno con equipo en Colombia es `offerMarketCountry: "CL"` y
`talentCountry: "CO"` en cada línea.

### Valores vigentes

| País | Factor de talento (costo, respecto de Chile) | Factor de mercado (precio de la parte humana) | El piso acompaña al factor |
| ---- | -------------------------------------------- | --------------------------------------------- | -------------------------- |
| CL   | `1`, por definición: es la referencia        | `1`                                           | No                         |
| CO   | `0.80`                                       | `0.90`                                        | Sí                         |
| PE   | `0.85`                                       | `0.95`                                        | Sí                         |
| MX   | `0.90`                                       | `1`                                           | No                         |
| US   | `5`                                          | `1.10`                                        | No                         |
| ES   | `3`                                          | `1.10`                                        | No                         |

**Los doce valores son valores de política confirmados. Está cerrado.**

- **Decidido** por el operador (CEO) el 2026-10-11: los 32 costos del Excel son el costo de cada perfil en Chile; el
  precio sigue al país del cliente y el costo al país de la persona; factor de mercado de Chile 1, Colombia 0,90 y
  Estados Unidos 1,10, tomados de los rangos de «Factor País» del Excel; y en los mercados bajo 1 el piso acompaña al
  factor. Esos tres factores de mercado y el factor de talento de Chile están confirmados desde el 2026-10-11.
- **Cerrados por el CEO el 2026-10-11 («deja eso cerrado ya»)** como los valores con que se cotiza: los cinco
  factores de talento fuera de Chile (CO 0,80; PE 0,85; MX 0,90; ES 3; US 5) y los factores de mercado de Perú,
  México y España (0,95; 1; 1,10). Los propuso el agente —los de talento, desde avisos de empleo y guías salariales
  leídos ese día— y el catálogo v10 los registra como confirmados **desde el 2026-10-12**. Son valores de política,
  no observaciones de mercado: uno se revisa sólo cuando una contratación real o un negocio cerrado en ese país lo
  contradice, con una versión nueva del catálogo.
- **Qué cambia según la fecha de la demanda.** Con `quoteDate` 2026-10-11 esos ocho factores todavía se leen como
  estimados: salen en `reviewSignals` como `ESTIMATED_SOURCE`, pesan en `estimateExposure` y el resumen trae
  `runNotices.laterCatalogValues`. Con `quoteDate` 2026-10-12 o posterior no sale ninguna de las tres cosas. El
  precio es el mismo en las dos fechas.
- **No se le vuelve a plantear al operador** como una decisión pendiente ni como un dato por validar. En el ledger,
  `COUNTRY_FACTORS_UNVALIDATED` quedó cerrado: no debe nada.
- **No están en el cotizador** los factores por tipo de cliente que trae el Excel (pyme 0,9; licitación pública
  0,85–0,95; cliente estratégico 0,95). Un precio así se registra como neto acordado con su motivo
  ([Registrar el precio acordado](#registrar-el-precio-acordado)); no se aplica el porcentaje a mano.

Para ver lo que tiene el catálogo (los dos devuelven exit 0; `"resolution": "ambiguous"` sólo dice que la consulta
devolvió varios registros):

```bash
pnpm --silent pricing:v3 catalog search --kind market_factor --current --date 2026-10-11
pnpm --silent pricing:v3 catalog search --kind talent_factor --current --date 2026-10-11
```

### Cómo se combinan

Los dos factores se aplican a la vez y ninguno compensa al otro. El ejemplo `managed-care` (seis líneas, un mes),
con la copia fechada 2026-10-11 de [el servicio gestionado](#cotizar-un-servicio-gestionado-por-volumen) y cotizado
en USD para aislar el efecto del país; todas las filas son `calculated`, exit 3. Las cifras son las mismas con la
copia fechada 2026-10-12:

| Cliente | Equipo | `totals.cost` | `totals.net` al mes | `marginRateRoundedDown` | Líneas marcadas | Motor |
| ------- | ------ | ------------- | ------------------- | ----------------------- | --------------- | ----- |
| CL      | CL     | 5229.94       | 9530.00             | `0.451213`              | 0               | 1.1.0 |
| CL      | CO     | 4501.94       | 8210.00             | `0.451651`              | 0               | 1.1.0 |
| CO      | CL     | 5229.94       | 8890.00             | `0.411705`              | 0               | 1.2.0 |
| CO      | CO     | 4501.94       | 7690.00             | `0.414572`              | 0               | 1.2.0 |
| PE      | PE     | 4683.94       | 8260.00             | `0.432937`              | 0               | 1.2.0 |
| MX      | MX     | 4865.94       | 8890.00             | `0.452650`              | 0               | 1.1.0 |
| US      | CL     | 5229.94       | 10180.00            | `0.486253`              | 0               | 1.1.0 |
| US      | US     | 19789.94      | 39300.00            | `0.496439`              | 0               | 1.1.0 |
| ES      | ES     | 12509.94      | 24740.00            | `0.494343`              | 0               | 1.1.0 |

- **El país del equipo mueve costo y precio juntos**: equipo en Colombia en vez de Chile baja el costo de 5.229,94 a
  4.501,94 y el precio de 9.530 a 8.210; el margen queda en 45 %.
- **El país del cliente mueve sólo el precio**: el mismo equipo chileno se vende en 8.890 a un cliente colombiano y en
  10.180 a uno estadounidense, con el mismo costo. Por eso el margen real baja a 41,2 % en Colombia y sube a 48,6 % en
  Estados Unidos.
- **El factor de mercado no es el descuento total**: sólo toca la parte humana. Con factor 0,90 el precio del ejemplo
  baja entre 6 % y 7 %, no 10 %, porque herramientas y fees se cobran igual.
- **Equipo en España o Estados Unidos**: los factores 3 y 5 son un solo número para todos los perfiles. Las dos
  últimas filas muestran cuánto pesan; si el costo objetivo de un perfil en ese país se aparta de ese número, se
  registra su costo específico ([abajo](#cuándo-registrar-el-costo-específico-de-un-perfil-en-un-país)).

Para cotizar una combinación se copia la demanda a una ruta nueva y se cambian los campos; un archivo versionado no
se edita. Cliente y equipo en Colombia, en USD, desde la copia `/tmp/servicio-gestionado.demand.json` que dejó el
paso 2 de [el servicio gestionado](#cotizar-un-servicio-gestionado-por-volumen):

```bash
sed -e 's/"offerMarketCountry": "CL"/"offerMarketCountry": "CO"/' \
  -e 's/"talentCountry": "CL"/"talentCountry": "CO"/' \
  -e 's/"outputCurrency": "CLP"/"outputCurrency": "USD"/' \
  /tmp/servicio-gestionado.demand.json > /tmp/servicio-gestionado-co.demand.json

pnpm --silent pricing:v3 compose prepare --current --input /tmp/servicio-gestionado-co.demand.json
```

Devuelve exit 3 con `totals.net` `7690.00`, `engineVersion` `pricing-v3-local/1.2.0`, `marketFactor.factor` `0.90`
y `totals.marketAdjustment` `-529.47`. Comprobar siempre en el resumen que el país entró: `marketFactor` trae el país
del cliente (salvo Chile y México, cuyo factor 1 no cambia nada y no se muestra) y `assumptions` no trae
`UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`. Si ese supuesto aparece, la demanda está fechada antes del 2026-10-11 y
ningún factor de país se aplicó. (La copia no declara forma del compromiso, así que `assumptions` trae el supuesto
de la reserva no evaluada: [Reserva de contingencia](#reserva-de-contingencia).)

**País sin factor.** Un `talentCountry` sin factor de talento devuelve exit 2 con `MISSING_CATALOG_SELECTION` en
`lines.<lineId>.talentFactor`; un `offerMarketCountry` sin factor de mercado, exit 2 con `MISSING_CATALOG_SELECTION`
en `offerMarketCountry`. No hay precio y no se sustituye por un país «parecido»: el factor se agrega al catálogo con
una decisión del operador ([cómo](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país)).
En el carril del núcleo (`calculate`) el mismo faltante se llama `MISSING_TALENT_FACTOR`.

### En Colombia y Perú el piso acompaña al factor

El factor de mercado de esos dos países declara `floorBasis: "base_market"`: el 45 % se comprueba sobre el precio que
cada línea habría tenido en el mercado base (Chile). La rebaja por país ya es una decisión de precio y no se vuelve a
marcar. Tres consecuencias que hay que tener presentes al leer el resultado:

1. Una cotización al precio de política **no sale marcada aunque su margen real esté bajo 45 %**: 41,5 % con cliente
   y equipo en Colombia, 43,3 % en Perú. `marginFloor.lines` vacío significa ahí «al precio aprobado para ese país».
2. `marginRateRoundedDown` es siempre el margen real. Es el número que se lleva al operador; no se presenta el 45 %
   del mercado base como si fuera el margen de la cotización.
3. Una rebaja **adicional** sí sale marcada, y la línea dice cuánto falta: `floorNet` es el neto mínimo de esa línea
   en ese mercado y `netShortOfFloor` lo que le falta al neto actual para alcanzarlo.

Caso versionado: [`managed-care-colombia.demand.json`](../../../data/pricing/v3-operating/managed-care-colombia.demand.json)
(cliente y equipo en Colombia, en COP) y su artefacto congelado. La demanda versionada es anterior a la policy v7:
cotizada tal cual con `--current` devuelve exit 2 con `RESOURCE_ALLOCATION_REQUIRED` en `1:adobe-express`, porque
sus dos Community Managers no declaran Adobe Express ni excluyen la tarea. Se copia con la exclusión —atienden la
bandeja, no diseñan— y se cotiza la copia; el artefacto congelado se sigue reproduciendo. El `node` devuelve exit 0,
los otros dos comandos exit 3, y `replay` responde `"verified": true`:

```bash
node -e '
const fs = require("fs")
const demand = JSON.parse(fs.readFileSync("data/pricing/v3-operating/managed-care-colombia.demand.json", "utf8"))
for (const work of demand.work.filter(w => ["primary", "backup"].includes(w.lineId)))
  work.excludedProfileTasks.push({ task: "express-design", reason: "This role answers the inbox; it does not design pieces." })
fs.writeFileSync("/tmp/servicio-gestionado-colombia.demand.json", JSON.stringify(demand, null, 2) + "\n", { flag: "wx" })
'

pnpm --silent pricing:v3 compose prepare --current --input /tmp/servicio-gestionado-colombia.demand.json

pnpm --silent pricing:v3 replay --input data/pricing/v3-operating/managed-care-colombia.artifact.json
```

| Caso                                                | `totals.net` al mes | Margen real         | Líneas marcadas | Qué dice la primera línea (`primary`)                                |
| --------------------------------------------------- | ------------------- | ------------------- | --------------- | -------------------------------------------------------------------- |
| Al precio de política                               | COP 28.100.000      | 41,5 % (`0.415231`) | 0               | No aparece en `marginFloor.lines`                                    |
| Con un `agreed_net` de 24.000.000 por las seis líneas | COP 24.000.000      | 31,5 % (`0.315333`) | 6               | `net` 10.163.701, `floorNet` 11.872.366, `netShortOfFloor` 1.708.665 |

El segundo caso es esa misma copia, guardada en otra ruta, con un neto acordado mensual sobre sus seis líneas.

En el segundo caso las seis líneas suman 3.943.867 de `netShortOfFloor`: es lo que le falta a ese neto para
alcanzar el mínimo de Colombia, no para llegar al 45 % de margen real. `totals.marketAdjustment` es `-1932511` en los
dos: lo que el factor 0,90 ya había rebajado antes del acuerdo. Una línea marcada es un incumplimiento real y la
excepción la decide el operador («Quién decide», en [Registrar el precio acordado](#registrar-el-precio-acordado)).

En los mercados sin `floorBasis` (Chile, México, Estados Unidos, España) el piso se lee sobre el neto final, como
siempre, y la línea marcada trae `marginAmountShortOfFloor`; desde el motor 1.2.0 trae además `floorNet` y
`netShortOfFloor`, que ahí se leen igual: el neto mínimo de la fila y lo que le falta
([las tres claves](#qué-significa-una-línea-marcada)).

### País no es moneda

`offerMarketCountry` fija el factor; `outputCurrency` fija el FX de cotización y el múltiplo de redondeo
([Cotizar en otra moneda](#cotizar-en-otra-moneda)). Se eligen por separado: a un cliente colombiano se le puede
cotizar en USD (7.690,00 con equipo en Colombia) o en COP (28.100.000), y cambiar sólo la moneda no aplica ningún
factor: la misma demanda con cliente y equipo en Chile, pedida en COP, da 34.900.000. Para un cliente de otro país
se cambian los dos campos.

España está registrada como país, pero una cotización no se puede emitir en EUR: no hay FX de cotización USD→EUR ni
regla de redondeo para EUR. Con `outputCurrency: "EUR"` devuelve exit 2 (`MISSING_CATALOG_SELECTION` en
`fx.USD:EUR`). A un cliente español se le cotiza en USD. El tipo de cambio EUR→USD que sí existe desde el catálogo v6
va en el otro sentido: convierte el costo de una herramienta con precio en EUR
([Cotizar en otra moneda](#cotizar-en-otra-moneda)).

### Cuándo registrar el costo específico de un perfil en un país

El factor de talento es un valor de política: un solo número por país, igual para un diseñador junior y para un
consultor senior. Cuando el costo de un perfil en un país se aparta del costo de Chile por ese factor, se registra en
el catálogo como **costo específico** de ese perfil y ese país. A partir de su fecha de vigencia, una línea con ese
perfil y ese `talentCountry` usa ese costo, sin factor de talento; las personas del mismo perfil en otros países
siguen con el costo de Chile por su factor.

El costo que se registra es el **costo objetivo** que el operador decide para ese perfil en ese país, igual que los
32 costos de Chile ([base de costo](#selección-y-asignación)): no es la nómina de una persona. El valor lo decide el
operador, como todo valor del catálogo.

Conviene plantearlo antes de presentar un precio cuando el equipo está en España o Estados Unidos, cuando el perfil o
su seniority se apartan del promedio del país, y cuando el caso es grande o recurrente. No se corrige el costo
cambiando el factor del país (afecta a todos los perfiles) ni usando el factor de mercado (es otro hecho: lo que
paga el cliente). Pasos y change-set:
[registrar el costo de un perfil en un país](catalogo-v3-seleccion-y-actualizacion.md#cambiar-un-factor-de-país-o-registrar-el-costo-de-un-perfil-en-un-país).
En el ledger está como `LOCALIZED_TALENT_COSTS`: la base de costo quedó decidida y sólo falta el registro donde un
perfil se aparte de su factor. Es la única vía para apartarse de un factor de país: el factor mismo está cerrado.

## Cotizar en otra moneda

La moneda de la cotización es `brief.outputCurrency`: `CLP`, `USD`, `COP`, `MXN` o `PEN`. La moneda no dice de qué
país es el cliente ni aplica un factor de país: eso lo declaran otros campos
([País no es moneda](#país-no-es-moneda)). Un archivo versionado no se edita: copiar la demanda a una ruta nueva y
cambiar ese campo. Con las versiones vigentes, desde la copia fechada 2026-10-11 de
[el servicio gestionado](#cotizar-un-servicio-gestionado-por-volumen):

```bash
sed 's/"outputCurrency": "CLP"/"outputCurrency": "USD"/' \
  /tmp/servicio-gestionado.demand.json > /tmp/servicio-gestionado-usd.demand.json

pnpm --silent pricing:v3 compose prepare --current --input /tmp/servicio-gestionado-usd.demand.json
```

Devuelve exit 3 con `totals.net` `9530.00` y `totals.currency` `USD`.

- **USD es la moneda de referencia.** Los costos se calculan en USD y se convierten al final con el FX de cotización
  del catálogo (`catalog search --kind fx --current --date 2026-10-11` lo lista). No se deriva un FX inverso ni
  cruzado.
- **El FX de cotización es una política, no el tipo de cambio del día.** Lo decidió el CEO el 2026-10-10 con un margen
  prudencial sobre el mercado, para sostener un precio durante el plazo:

  | Par     | FX de cotización | Mercado observado |
  | ------- | ---------------- | ----------------- |
  | USD→CLP | `1000`           | cerca de 937      |
  | USD→COP | `3650`           | cerca de 3219     |
  | USD→MXN | `19.25`          | cerca de 17,98    |
  | USD→PEN | `3.70`           | cerca de 3,435    |

  No presentarlo como tipo de cambio de mercado ni usarlo para liquidar un pago. Su revisión es decisión del operador
  (`QUOTE_FX_REVIEW` en el ledger).

- **Cada moneda redondea a su propio múltiplo**, por fila facturable y siempre hacia arriba: CLP 10.000, USD 10,
  COP 50.000, MXN 100 y PEN 50 (`catalog search --kind price_rounding --current --date 2026-10-11`).
  Por eso la misma oferta en dos monedas **no es la conversión exacta** una de la otra, y eso es lo esperado. El
  ejemplo `managed-care` (cliente y equipo en Chile, copia fechada 2026-10-11), cotizado en cada moneda (todas
  `calculated`, exit 3, motor 1.1.0, ninguna línea bajo el piso):

  | Moneda | `totals.net` | `totals.roundingAdjustment` |
  | ------ | ------------ | --------------------------- |
  | CLP    | 9530000      | 21054                       |
  | USD    | 9530.00      | 21.05                       |
  | COP    | 34900000     | 192348                      |
  | MXN    | 183300.00    | 252.82                      |
  | PEN    | 35300.00     | 116.91                      |

  USD 9.530 al FX de cotización serían COP 34.784.500; cotizado en COP sale 34.900.000. Para dar el precio en una
  moneda, cotizar en esa moneda; no convertir a mano el resultado de otra. Estas cifras son de un cliente chileno:
  la fila COP no es el precio para un cliente colombiano, que con el mismo equipo en Chile sale en 32.400.000 y con
  el equipo en Colombia en 28.100.000.

- **Un precio acordado va en la moneda de salida**: el `amount` de un `agreed_net` o de un `agreed_total` se declara
  en esa moneda y con sus decimales (CLP y COP, ninguno; USD, MXN y PEN, hasta dos).
- **Moneda sin regla de redondeo** (hoy CLF): calcula, pero sin redondear (`priceRounding: null`, motor 1.0.0) y con un
  FX USD→CLF estimado de 2025; las líneas al piso vuelven a salir marcadas por fracciones. No presentar un precio en
  CLF mientras el operador no decida su FX y su múltiplo (`QUOTE_FX_REVIEW`, `COMMERCIAL_ROUNDING_SCOPE`).
- **Moneda sin FX de salida** (EUR, o cualquier otra): exit 2, `calculationStatus` `needs_input`, `totals` `null` y
  en `diagnostics` un `MISSING_CATALOG_SELECTION` en `fx.USD:<moneda>`. No hay precio y no se inventa una tasa: el FX
  se agrega al catálogo ([mantenimiento](catalogo-v3-seleccion-y-actualizacion.md#cambiar-el-redondeo-o-el-fx-de-cotización)).
  **Una cotización no se puede emitir en EUR**: no hay FX de cotización USD→EUR ni múltiplo para EUR. Vale también
  para un cliente español: España tiene factores de país y se cotiza en USD.
- **Herramienta con precio en EUR** (Magnific): el costo se convierte a USD con el registro que la demanda nombra en
  `fxRecordIds`. Desde el catálogo v6 existe `fx:EUR:USD`, un FX de cotización EUR→USD de `1.20` que rige desde el
  2026-10-11 sin fecha de término: una cotización con esa fecha o posterior lo selecciona con
  `"fxRecordIds": ["fx:EUR:USD"]`. Está marcado `estimated`: lo propuso el agente aplicando al EUR el margen
  prudencial que el operador fijó para las otras monedas (referencia ECB `1.1206`), y el operador no lo decidió de
  forma explícita. Sale en `reviewSignals` como `ESTIMATED_SOURCE`; decirlo al presentar el precio. El registro
  anterior, `fx:EUR:USD:ECB:2026-10-09`, rige sólo ese día: una demanda con fecha posterior que lo nombre devuelve
  exit 2 con `RESOURCE_FX_SELECTION_REQUIRED` y `UNUSED_FX_SELECTION`.
- **Herramienta con precio en CLP** (Adobe Creative Cloud Pro y Adobe Express, desde la policy v7): igual que con el
  EUR, la demanda nombra el registro en `fxRecordIds`: `"fx:CLP:USD"`, que el catálogo v9 trae en `0.001`, el inverso
  del FX de cotización USD→CLP `1000`. Por eso un costo en CLP vuelve a una cotización en CLP por el mismo monto. Es
  un valor de política (`confirmed`) y se mueve junto con `fx:USD:CLP`. Sin él, la corrida queda `needs_input` con
  `RESOURCE_FX_SELECTION_REQUIRED` en `<periodo>:adobe`. Una demanda con Adobe y Magnific nombra los dos:
  `"fxRecordIds": ["fx:CLP:USD", "fx:EUR:USD"]`.

## Cotizar On-Demand u On-Going

**Para qué sirve.** Decirle al cotizador si lo que se vende es un trabajo continuo (On-Going) o uno acotado
(On-Demand), para que el precio lleve el recargo de la forma. Es el contrato 1.3.0, motor `pricing-v3-local/1.3.0`.
En un servicio gestionado la forma On-Demand trae además la reserva de contingencia, y esa cotización la firma el
motor `pricing-v3-local/1.4.0` ([Reserva de contingencia](#reserva-de-contingencia)). Una persona por dedicación no
lleva reserva: el ejemplo de esta sección sigue en 1.3.0.

**Qué es la forma y qué no es.**

- Es una **forma de compromiso**: On-Demand es un trabajo con alcance, inicio, término, aceptación y salida
  definidos; On-Going es una relación continua. No es una cuarta oferta ni un modelo de entrega: la oferta la sigue
  eligiendo `offerId` y el modelo de entrega no cambia. Efeonce Factory es la ruta comercial reservada para trabajos
  On-Demand ([modelo de engagement](../../business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md),
  [modelo de Factory](../../business-models/factory/EFEONCE_FACTORY_BUSINESS_MODEL_V1.md)).
- Es un campo propio, `brief.engagementForm`, distinto de `brief.engagementCode` (`monthly`), que es la cadencia de
  cobro y sigue eligiendo la política de precio. No se cambia uno para expresar el otro.
- Los valores son datos del catálogo, no una lista de la CLI. Hoy hay dos, vigentes desde el 2026-10-11 y generales
  para toda oferta: `on_going` (razón de precio `1`) y `on_demand` (razón `1.10`). Se ven con
  `pnpm --silent pricing:v3 catalog search --kind engagement_factor --current --date 2026-10-11` (exit 0).
- Quién lo decidió: el CEO eligió este diseño —un registro por forma en vez de duplicar las 96 políticas de precio—
  y preguntó si 10 % era correcto, dejando el ajuste al agente, que lo mantuvo: es el extremo bajo del 10–15 % que
  las agencias descuentan a un retainer frente a una tarifa de proyecto, y en V3 la puesta en marcha, la coordinación
  y los compromisos con proveedores se costean aparte en vez de esconderse en el recargo. El Excel de pricing y el
  cotizador de Greenhouse ya traían ese multiplicador (On-Going 0 %, On-Demand +10 %).

**Antes de empezar.** Decidir la forma por el negocio: es `on_demand` si el trabajo tiene un alcance acotado, un
inicio y un término, y una entrega o aceptación que lo cierra; es `on_going` si es un servicio mensual que sigue
hasta que alguien lo termina. Si el operador está disponible, se le confirma; si no, se decide con ese criterio, se
declara siempre y se dice al entregar que la forma la decidiste tú. Tener presente lo que la forma trae consigo: el
10 % sobre todas las filas del equipo y, en un servicio gestionado, la reserva de contingencia. Comprobar que la
demanda está fechada 2026-10-11 o después; y, si es un trabajo acotado, qué deja fuera el cotizador (al final de
esta sección).

**Paso a paso.**

1. Declarar la forma en el `brief` de la demanda, junto a la cadencia:

   ```json
   "engagementCode": "monthly",
   "engagementForm": "on_demand",
   ```

2. Cotizar como siempre. El ejemplo de referencia es
   [`designer-on-demand.demand.json`](../../../data/pricing/v3-operating/designer-on-demand.demand.json): un mes de un
   diseñador senior dedicado en Chile, On-Demand, en CLP, con una de las tres licencias de Adobe, Higgsfield y
   Magnific. Los dos comandos devuelven exit 3; `replay` responde `"verified": true` sobre el artefacto congelado, el
   primero firmado por el motor 1.3.0. **Las cifras del ejemplo de referencia en este manual son las del artefacto
   congelado** (policy v7: Creative Cloud Pro con el descuento con que se factura; costo 1.768.438, neto 2.790.000).
   El primer comando, con `--current` y la policy v10, cotiza Creative Cloud Pro sin descuento y da costo 1.822.704 y
   neto 2.870.000:

   ```bash
   pnpm --silent pricing:v3 compose quote --current \
     --input data/pricing/v3-operating/designer-on-demand.demand.json \
     --out /tmp/disenador-on-demand.artifact.json > /tmp/disenador-on-demand.summary.json

   pnpm --silent pricing:v3 replay --input data/pricing/v3-operating/designer-on-demand.artifact.json
   ```

3. Leer en el resumen `engineVersion`, `engagementForm` y `totals.engagementAdjustment`, y el margen en
   `marginRateRoundedDown`.

**Qué hace la forma al precio, al costo, al piso y al redondeo.**

- **Precio:** la razón multiplica el precio de **toda** la fila —persona, fee de plataforma, provisiones,
  herramientas, filas mensuales y de puesta en marcha—, después de la política de precio y del factor de mercado, y
  antes del redondeo comercial y de cualquier `discount` o `agreed_net`.
- **Costo:** no cambia.
- **Piso:** no se mueve. El recargo cuenta como margen, así que un descuento puede consumirlo hasta el mismo piso
  que rige en On-Going. En un mercado cuyo piso acompaña al factor (Colombia, Perú) el precio del mercado base se lee
  bajo la misma forma: `marketAdjustment`, `marketPriceRatio` y `floorNet` son los mismos con y sin forma.
- **Redondeo:** se aplica después de la razón, por fila y hacia arriba, así que la diferencia entre las dos formas no
  es exactamente 10 %.

El ejemplo de referencia en sus tres variantes (copias de la demanda fuera de `data/`, con las versiones del
artefacto congelado, Adobe con descuento; todas `calculated`, exit 3, costo `1768438` y ninguna línea bajo el piso de
25 %). Con `--current` y la policy v10 el costo es `1822704` y los netos son 2.870.000 (`engagementAdjustment`
`260387`, margen `0.364911`), 2.610.000 y 2.610.000 (margen `0.301645`); la lectura de la tabla es la misma:

| `engagementForm` en la demanda | `engineVersion`          | `totals.net` | `totals.engagementAdjustment` | Margen real | `engagementForm` en el resumen |
| ------------------------------ | ------------------------ | ------------ | ----------------------------- | ----------- | ------------------------------ |
| `"on_demand"`                  | `pricing-v3-local/1.3.0` | 2.790.000    | `252635`                      | `0.366151`  | `priceRatio` `1.10`            |
| `"on_going"`                   | `pricing-v3-local/1.3.0` | 2.540.000    | `0`                           | `0.303764`  | `priceRatio` `1`               |
| No declarada                   | `pricing-v3-local/1.1.0` | 2.540.000    | La clave no existe            | `0.303764`  | La clave no existe             |

- En On-Demand el neto son dos filas: mensual 2.470.000 y puesta en marcha 320.000. En On-Going, 2.250.000 y
  290.000. La diferencia total es 9,8 %, no 10 %, por el redondeo de cada fila al múltiplo de CLP 10.000. (Con la
  policy v10 la fila mensual es 2.550.000 y 2.320.000; la de puesta en marcha no cambia.)
- Con un `discount` de 9 % sobre la versión On-Demand el neto queda en 2.538.900, el margen en `0.303462` y ninguna
  línea sale marcada: el descuento consumió el recargo y el piso sigue siendo 25 %. Con un `agreed_net` de 2.000.000
  sobre la fila mensual, la línea sale marcada y le faltan los mismos 68.438 de margen en On-Demand y en On-Going.

**Cómo leer `engagementForm` y `engagementAdjustment`.**

- `engagementForm` (raíz del resumen): `{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }`.
  `scope` `general` es el registro de la forma; `offer`, uno propio de esa oferta, que prevalece. La clave existe
  sólo si la demanda declara la forma, también con razón 1.
- `totals.engagementAdjustment`: cuánto movió el precio la forma, ya incluido en `undiscountedPrice`; no se suma
  otra vez. `explain.commercialAdjustments.rows` trae `engagementAdjustment` y `engagementPriceRatio` por fila;
  `compose assess` repite la forma en `margin.policyFloor`; `compose preview` muestra sólo el neto final.
- **Una forma no declarada cotiza como On-Going y no avisa:** sin el campo no hay `engagementForm` en el resumen ni
  `engagementAdjustment`, y el contrato es el de siempre (1.0.0 a 1.2.0, idéntico byte a byte). Si el trabajo es
  acotado y la clave no está en el resumen, falta declararla.

**Híbrido son dos cotizaciones.** No hay forma `hybrid` ni de licencia o consultoría. Un trabajo con una base
acotada y una operación continua se cotiza como dos demandas: una On-Demand para la base y una On-Going para la
operación.

**Lo que el cotizador todavía no cubre en un trabajo acotado.**

- La duración del contrato no es un input y no lo será: una cotización tiene periodos, no un plazo. Es una decisión
  del CEO (2026-10-11, cierre), no un pendiente: la duración y la fecha de inicio del servicio son materia del
  contrato y no mueven ningún costo, precio ni impuesto.
- Un trabajo de menos de un mes se expresa como horas dentro de un periodo; no hay periodos más cortos. La unidad
  es `{ "unit": "hours_per_month", "value": "…" }` y se convierte a FTE con las 180 horas de un mes a tiempo
  completo de la regla de asignación ([horas como unidad](#paso-2--componer-la-demanda)).
- Los costos de terceros y la reserva de contingencia **sí** están modelados desde el contrato 1.4.0
  ([Costos de terceros](#costos-de-terceros), [Reserva de contingencia](#reserva-de-contingencia)). Lo que falta de
  ellos está en [Lo que todavía no está modelado](#lo-que-todavía-no-está-modelado).
- No hay tope a la razón ni formas Híbrido o Licencia/Consultoría.
- Qué compromisos con proveedores quedan después del trabajo se lee aparte, con `compose commitments`
  ([Tres lecturas de una cotización](#tres-lecturas-de-una-cotización)).

**Si la selección falla.** Exit 2, sin precio, con el motivo en `diagnostics`:

| Qué devuelve                                            | Causa                                                                                                  | Arreglo                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `MISSING_CATALOG_SELECTION` con `path` `engagementForm` | La forma no tiene registro vigente a la fecha de la demanda: un id que no existe (`hybrid`) o una fecha anterior al 2026-10-11 | Usar `on_going` u `on_demand` y la fecha del día. Una forma nueva la decide el operador y entra por el catálogo |
| `AMBIGUOUS_SELECTION` con `path` `engagementForm`       | Dos registros vigentes del mismo nivel para esa forma                                                  | Es un error del catálogo: se corrige con una versión que retire el duplicado              |

## Puesta en marcha: onboarding y reclutamiento

**Para qué sirve.** Cobrar una sola vez lo que cuesta incorporar a una persona a una cuenta. Desde el catálogo v9
(cotizaciones fechadas desde el 2026-10-11) reemplaza al marcador de prueba de USD 100 (`trial-setup`).

**Qué hay.** Dos provisiones, las dos por persona, las dos de cobro único y las dos estimadas: las propuso el agente
y el CEO las aceptó, para medirlas en las próximas dos incorporaciones reales.

| Recurso                        | Monto   | Cuándo entra                                                                                   |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| `provision-account-onboarding` | USD 200 | Siempre, una vez por cada persona que se suma a una cuenta: es el requisito `setup` de los siete kits de staffing |
| `provision-recruiting`         | USD 500 | Sólo si se elige: cuando hay que contratar a una persona nueva para ese cliente                |

**Paso a paso.**

1. Onboarding: no se declara nada. Una línea de staffing lo carga sola.
2. Reclutamiento: se elige en `choices` de la línea de esa persona, con esta entrada exacta:

   ```json
   "choices": [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]
   ```

3. Leer la fila de puesta en marcha. Las dos provisiones llevan el margen de la oferta (la política pone precio sobre
   todos los costos) y la razón de la forma del compromiso, y caen en la única fila `setup` de la línea. En el
   ejemplo de referencia (On-Demand, CLP): sólo onboarding, fila de 320.000 y neto total 2.790.000; con
   reclutamiento, fila de 1.100.000 y neto total 3.570.000 (con la policy v10 las filas son las mismas y los netos
   2.870.000 y 3.650.000). `compose preview` la muestra como «Implementación inicial».

**Qué significan las señales.**

- Las dos salen en `reviewSignals` como `ESTIMATED_SOURCE` (`snapshot.resources.provision-account-onboarding`) y en
  `estimateExposure` con `kind` `setup`: decirlo al presentar el precio.
- **Quien se suma después paga la suya.** Antes la puesta en marcha era una por cuenta; ahora es por persona: una
  segunda persona que entra en el periodo 2 trae su propia fila de puesta en marcha en ese periodo.
- **Un servicio gestionado no tiene puesta en marcha.** El kit `managed-service-core` no la pide, ni antes ni ahora.
  Una entrada de reclutamiento en una línea de ese kit devuelve exit 2 con `UNKNOWN_RESOURCE_REQUIREMENT` en
  `lines.<lineId>`.
- Una cotización fechada antes del 2026-10-11 sigue resolviendo `trial-setup`.

**Un precio «todo incluido».** Si lo pactado es un solo precio por la persona y su puesta en marcha, no se pacta
cada fila por separado ni se reparte a mano: es un `agreed_total` sobre la línea, que cubre la fila mensual y la de
puesta en marcha juntas ([caso](#caso-a--una-persona-por-un-mes-con-un-precio-por-todo)).

**Qué no hacer.**

- No aplicar la regla del Excel «fee de reclutamiento y onboarding = un mes del costo del recurso»: no está en el
  cotizador, porque en un refuerzo de un mes duplicaría el precio. La protección que buscaba (plazo mínimo cuando se
  recluta, cláusula de conversión) va en los términos del contrato: es un tema legal, no del cotizador.
- No agregar reclutamiento «por si acaso»: sólo cuando de verdad hay que contratar a alguien para ese cliente.
- No presentar los dos montos como costos medidos: son estimaciones pendientes de medir.

## Herramientas con contrato: Adobe y los plazos del proveedor

**Para qué sirve.** Cotizar Adobe con el precio correcto y saber qué herramienta sigue cobrándose cuando el trabajo
termina. Policy v7 (Adobe como se factura), v8 (plazos), v9 (Microsoft 365 y Notion como se facturan, fecha de
renovación de Adobe) y v10 (Creative Cloud Pro sin descuento), con el catálogo v9 o posterior; rige para demandas
fechadas desde el 2026-10-11.

**Adobe son dos productos, no un paquete.** Fuente: la factura de Adobe 3582641940 del 2026-09-16, que mostró el
CEO.

| `toolId`        | Producto                 | Licencias | Precio `current` (paquete, al mes) | Quién lo usa                                                                              | Tareas                           |
| --------------- | ------------------------ | --------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| `adobe`         | Adobe Creative Cloud Pro | 3         | CLP 325.405,5 (sin descuento)      | Diseñadores. Ya incluye Adobe Express                                                     | `visual-design`, `video-editing` |
| `adobe-express` | Adobe Express            | 3         | CLP 16.240                         | Perfiles de contenido: Social Media Manager, Community Manager, Content Manager y Content Creator | `express-design`                 |

- Los cuatro perfiles de contenido los confirmó el CEO. Su receta trae `express-design`: la línea declara la
  asignación de `adobe-express` o excluye la tarea con su motivo (`work[].excludedProfileTasks`).
- **Los montos incluyen IVA**, por decisión del CEO: el impuesto se recupera, pero no mes a mes.
- **La moneda es CLP**, como se factura. La demanda nombra `fx:CLP:USD` en `fxRecordIds`
  ([Cotizar en otra moneda](#cotizar-en-otra-moneda)).

**Una licencia es un tercio del paquete.** El precio es del paquete de tres licencias; a una persona se le atribuye
una. Así lo declara el ejemplo de referencia (aquí con el motivo resumido), y son CLP 108.468,5 al mes por una
licencia de Creative Cloud Pro al precio `current` (CLP 54.202 al importe facturado con descuento) y CLP 5.413 por
una de Adobe Express:

```json
{
  "periodId": 1,
  "toolId": "adobe",
  "priceId": "current",
  "quantity": "1",
  "seatCapacity": 3,
  "serviceShare": "0.333333333333333333",
  "driver": { "unit": "assigned-user-seat", "totalUnits": "3", "allocatedUnits": "1" },
  "reason": "Una de las tres licencias de Creative Cloud Pro la usa esta persona; las otras dos quedan en el equipo interno."
}
```

Atribuirle el paquete entero a una persona (`serviceShare: "1"`) sobrestima las herramientas: en el ejemplo de
referencia el neto sube de 2.790.000 a 2.960.000 con las versiones del artefacto, y de 2.870.000 a 3.220.000 con
`--current` y la policy v10. Los ejemplos anteriores a la policy v7 que lo hacían no sirven de referencia.

**Creative Cloud Pro se cotiza sin su descuento.** Adobe lo factura hoy con un 50 % de descuento que termina pronto
(unos 36 días al 2026-10-11; que termine justo en la renovación no está confirmado). El CEO decidió ese día que se
calcule sin descuento desde ya, y la policy v10 lo deja así:

| `priceId` de `adobe`     | Al mes (tres licencias) | Una licencia  | Estado                                                    |
| ------------------------ | ----------------------- | ------------- | --------------------------------------------------------- |
| `current`                | CLP 325.405,5           | CLP 108.468,5 | `confirmed` desde la policy v11: valor decidido por el CEO  |
| `invoiced-with-discount` | CLP 162.605             | CLP 54.202    | `confirmed` por la factura                                |

- `current` es el precio de lista de la factura (CLP 91.150 por licencia más IVA) y es lo que usa toda cotización
  nueva. No hay que elegir nada para cubrir el fin del descuento.
- `invoiced-with-discount` es la excepción: un trabajo que termina antes que el descuento. Se elige con
  `"priceId": "invoiced-with-discount"` en la asignación de `adobe`, **sólo si el operador lo decide**, y se dice en
  la entrega cuál se usó. En el ejemplo de referencia da 2.790.000; con `current`, 2.870.000.
- `renewal-scenario` ya no existe: era el nombre del precio de lista hasta la policy v9. Una demanda que lo nombre
  queda `needs_input` con `RESOURCE_PRICE_SELECTION_REQUIRED` en `<periodo>:adobe` (exit 2); se cambia a `current`.
- Los dos precios llevan `reviewBy: "2026-11-16"`. Adobe Express no tiene descuento y no cambia.

**Plazo del proveedor (`commitmentTermMonths`).** Campo opcional de cada precio de la policy: por cuántos meses hay
que pagar una licencia **una vez tomada**. Habla del asiento, no del papel del contrato. Admite de 1 a 120; `1` es
una declaración —se paga mes a mes y se puede soltar—, distinta de «nadie lo dijo». Lo que factura el precio
(`price.unit`) y lo que obliga son dos hechos separados. El campo nunca entra a un cálculo ni a un resultado
congelado: sólo lo lee `compose commitments`. Lo declarado, dicho por el CEO el 2026-10-11:

| Herramienta                                   | `commitmentTermMonths` | Por qué                                                                                               |
| --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Adobe Creative Cloud Pro y Adobe Express      | `12`                   | Plan anual pagado mes a mes: una licencia comprada queda disponible y se sigue cobrando hasta que el contrato se renueva; la factura no baja antes |
| Microsoft 365 (precios mensuales)             | `1`                    | Contrato anual facturado mes a mes, pero asignar o quitar una licencia sube o baja el monto mensual. Desde la policy v9 `current` es el de la factura G185142527 del 2026-09-16: Business Standard, USD 14,70 por licencia, seis licencias, sin impuesto |
| Notion (`current`)                            | `1`                    | Se paga mes a mes, sin más compromiso. Factura 0D8C80A9-0039 del 2026-09-21: Business mensual, nueve miembros a USD 24, más 3000 créditos a USD 30, sin impuesto |
| HubSpot                                       | No declarado           | Se contrata por un año, pero el CEO indicó el 2026-10-11 que hoy no hace falta en las cotizaciones: su precio queda sin cargar a propósito. No es un dato que el cotizador espere |

Las facturas y la consola de Adobe las mostró el CEO, y el comportamiento del asiento de Microsoft 365 lo afirmó él.
Los precios públicos de Microsoft 365 (`public-standard-teams-monthly`, USD 16,80, y los demás) siguen en la policy:
una cotización nueva debería elegir `current`. El ejemplo de referencia y las demás demandas versionadas eligen
todavía el precio público, así que el precio facturado no mueve ninguna de sus cifras.

**Fecha de renovación (`commitmentRenewsOn`).** Campo opcional del precio, fecha ISO, que sólo se admite junto con
`commitmentTermMonths`. El plazo dice cuánto obliga un asiento; la fecha dice en qué punto está el plazo que ya
corre. El contrato de Adobe renueva el **2026-11-16**, según la consola del proveedor: plan anual pagado mes a mes;
en la renovación se puede cambiar el número de licencias o cancelar el plan. Los tres precios de Adobe la declaran.

Las demás herramientas con precio mensual no declaran plazo, y la lectura de compromisos lo dice. Límite conocido:
un precio que declara plazo y no declara fecha se sigue leyendo como un plazo entero desde el primer mes cotizado, y
los precios por año ignoran los dos campos
([Compromisos con proveedores](#compromisos-con-proveedores-compose-commitments)).

**Equipo mixto.** Un diseñador con Creative Cloud Pro y un Community Manager con Adobe Express en la misma cotización
es un equipo mixto normal: cada uno lleva su asignación y la corrida calcula. `BUNDLED_TOOL_DOUBLE_COUNT` (exit 2, en
`<periodo>:adobe`) sale sólo cuando la **misma** línea o la misma persona tiene el plan y un producto que el plan ya
incluye: un diseñador con Creative Cloud Pro no lleva además Adobe Express.

**Qué no hacer.**

- No quitarle el IVA a los montos de Adobe ni pasarlos a USD a mano.
- No atribuir el paquete entero a una persona, ni reemplazar su licencia por una fracción de las horas del paquete:
  quien usa una licencia carga una de tres. Para una persona compartida con otras cuentas, ver
  [Asientos de una persona a tiempo parcial](#asientos-de-una-persona-a-tiempo-parcial).
- No elegir `invoiced-with-discount` por cuenta propia: es para un trabajo que termina antes que el descuento y lo
  decide el operador. Tampoco nombrar `renewal-scenario`, que ya no existe.
- No declarar `adobe-express` en una línea que ya lleva `adobe`, ni excluir `express-design` sin un motivo cierto.
- No leer `commitmentTermMonths` como parte del precio, ni inventar un plazo para una herramienta que no lo declara.

## Costos de terceros

**Para qué sirve.** Poner dentro de la cotización lo que se le compra a otro para un trabajo —una productora, talento,
impresión, medios, una licencia comprada para ese trabajo— con su propia regla de precio y su propio piso, sin
mezclarlo con el equipo. Es el contrato 1.4.0, motor `pricing-v3-local/1.4.0`, con el catálogo v10; rige para
demandas fechadas desde el 2026-10-11.

**Cuándo usarlo.** Cuando el costo es de un proveedor externo, se compra para este trabajo y tiene un monto con
respaldo (una cotización del proveedor, un plan de medios). No es el lugar para una herramienta de Efeonce (va por
la policy y sus asignaciones), una persona (va como línea) ni una provisión.

**Las dos liquidaciones (`settlement`).** Lo primero que se le pregunta al operador es quién le paga al proveedor.

| `settlement`    | Qué significa                                                     | Qué hace el cotizador                                                                                                                                             |
| --------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reinvoiced`    | Efeonce le compra al proveedor, le paga y se lo factura al cliente | Lo convierte en una fila comercial propia, con la regla de precio de su categoría. Entra al costo, al neto, al margen y a la caja. `evidence` es obligatoria      |
| `client_direct` | El cliente contrata al proveedor y le paga directo                 | Lo deja congelado en el `brief` como una nota. No llega al motor ni a ningún total, cifra de caja o conversión. `evidence` es opcional                            |

Una demanda que sólo trae costos `client_direct` se queda en el contrato que ya tenía: no pasa a 1.4.0 por ellos.

**Antes de empezar.** Tener de cada costo la cotización del proveedor (referencia, fecha y hasta cuándo vale), su
moneda, en qué periodo cae y quién le paga; y leer las categorías vigentes, que son datos del catálogo y no una
lista de la CLI:

```bash
pnpm --silent pricing:v3 catalog search --current --kind third_party_policy
```

Devuelve exit 0 con cinco registros (`"resolution": "ambiguous"` sólo dice que la consulta devolvió varios):

| `category`   | Regla (`method`, `rate`) | Piso de la fila (`minimumMargin`) | Redondeo (`rounding`) | Qué significa                                            |
| ------------ | ------------------------ | --------------------------------- | --------------------- | -------------------------------------------------------- |
| `production` | `markup`, `0.10`         | `0.05`                            | `commercial`          | Costo más 10 %, subido al múltiplo de la moneda          |
| `talent`     | `markup`, `0.10`         | `0.05`                            | `commercial`          | Lo mismo                                                 |
| `printing`   | `markup`, `0.10`         | `0.05`                            | `commercial`          | Lo mismo                                                 |
| `media`      | `markup`, `0`            | `0`                               | `none`                | Se cobra exactamente al costo, sin redondear             |
| `licences`   | `markup`, `0`            | `0`                               | `none`                | Lo mismo                                                 |

El 10 % es el fee de gestión de proyecto del Excel de pricing; «sin margen sobre la inversión en medios» es la
regla del propio operador para medios pagados. Las cinco reglas las propuso el agente y el CEO las aceptó el
2026-10-11 («seguiré tu recomendación») como estimaciones por ajustar con el primer trabajo real: los registros
están `estimated` y salen en `reviewSignals` como `ESTIMATED_SOURCE`. Un registro con `offerId` es propio de esa
oferta y prevalece sobre el general; hoy los cinco son generales.

**Paso a paso.**

1. Declarar los costos en el `brief` de la demanda, en `thirdPartyCosts`. Este es el bloque del ejemplo de
   referencia,
   [`managed-on-demand-third-party.demand.json`](../../../data/pricing/v3-operating/managed-on-demand-third-party.demand.json),
   tal como está en el archivo: tres costos refacturados y uno que paga el cliente. Los nombres de proveedor son
   marcadores.

   ```json
   "thirdPartyCosts": [
     {
       "costId": "tp-production",
       "category": "production",
       "label": "Producción audiovisual de la campaña",
       "supplier": "Productora de ejemplo",
       "settlement": "reinvoiced",
       "amount": "4500000",
       "currency": "CLP",
       "quantity": "1",
       "periodIds": [1],
       "evidence": {
         "reference": "supplier-quote:example-production:COT-0001",
         "effectiveFrom": "2026-10-05",
         "effectiveUntil": "2026-11-30",
         "status": "confirmed"
       }
     },
     {
       "costId": "tp-talent",
       "category": "talent",
       "label": "Talento: locución y derechos de uso por 12 meses",
       "supplier": "Agencia de talento de ejemplo",
       "settlement": "reinvoiced",
       "amount": "1250.00",
       "currency": "USD",
       "quantity": "1",
       "periodIds": [1],
       "evidence": {
         "reference": "supplier-quote:example-talent:Q-0001",
         "effectiveFrom": "2026-10-05",
         "effectiveUntil": "2026-11-30",
         "status": "confirmed"
       }
     },
     {
       "costId": "tp-media",
       "category": "media",
       "label": "Inversión en medios pagados",
       "supplier": "Plataforma de medios de ejemplo",
       "settlement": "reinvoiced",
       "amount": "3333333",
       "currency": "CLP",
       "quantity": "1",
       "periodIds": [1],
       "evidence": {
         "reference": "media-plan:example:2026-10",
         "effectiveFrom": "2026-10-05",
         "effectiveUntil": "2026-11-30",
         "status": "estimated"
       }
     },
     {
       "costId": "tp-stock",
       "category": "licences",
       "label": "Banco de imágenes contratado por el cliente",
       "supplier": "Banco de imágenes de ejemplo",
       "settlement": "client_direct",
       "amount": "890.00",
       "currency": "USD",
       "quantity": "1",
       "periodIds": [1]
     }
   ]
   ```

2. Revisar cada campo:

   | Campo        | Qué se escribe                                                                                                                                                                                                 |
   | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `costId`     | Un id estable y único. No puede repetirse ni ser igual al `lineId` de una línea: costos y líneas comparten nombres, porque un ajuste los nombra por ese id                                                    |
   | `category`   | Una de las categorías del catálogo. La demanda lleva sólo el id: **nunca una tasa**                                                                                                                            |
   | `label`      | El nombre del ítem. **Es lo que ve el cliente** en `compose preview`: se escribe para él, sin nombrar al proveedor ni un costo                                                                                 |
   | `supplier`   | El proveedor. Es interno: se queda en el `brief` congelado y no sale en el resumen ni en ninguna lectura                                                                                                       |
   | `settlement` | `reinvoiced` o `client_direct`                                                                                                                                                                                 |
   | `amount`     | El monto unitario del proveedor, antes de la regla de precio, como cadena, mayor que cero y sin más decimales que su moneda (`"4500000"` en CLP, `"1250.00"` en USD)                                           |
   | `currency`   | La moneda en que cobra el proveedor, tres letras. No tiene que ser la de la cotización                                                                                                                         |
   | `quantity`   | Un entero de 1 a 9999, como cadena (`"1"`). El costo es `amount × quantity`                                                                                                                                    |
   | `periodIds`  | Obligatorio. Los periodos en que se cobra, sin repetir. **El costo completo se cobra en cada periodo listado**: un costo único lleva un solo periodo; uno mensual de tres meses, `[1, 2, 3]`                   |
   | `evidence`   | El respaldo del monto: `reference` (un id de la cotización del proveedor, no el documento), `effectiveFrom`, `effectiveUntil` y `status` (`confirmed`, `estimated` o `pending`). Obligatoria si `reinvoiced`   |

   Se admiten hasta 50 costos. El objeto es estricto: un campo de más (por ejemplo una tasa) se rechaza con
   `SCHEMA_INVALID`.

3. Cotizar como siempre y verificar el artefacto de referencia. Los dos comandos devuelven exit 3 y `replay`
   responde `"verified": true`; el primero reproduce el mismo `calculationId` del artefacto congelado:

   ```bash
   pnpm --silent pricing:v3 compose quote --current \
     --input data/pricing/v3-operating/managed-on-demand-third-party.demand.json \
     --out /tmp/terceros.artifact.json > /tmp/terceros.summary.json

   pnpm --silent pricing:v3 replay --input data/pricing/v3-operating/managed-on-demand-third-party.artifact.json
   ```

4. Leer el resultado: [Cómo leer una cotización con terceros](#cómo-leer-una-cotización-con-terceros).

**Cómo se calcula una fila de terceros.** Cada costo refacturado es una fila propia por periodo, de clase
`third_party` (`<costId>:<periodo>:third_party`), nunca un componente de una fila del equipo.

- Costo: `amount × quantity`, llevado a la moneda de la cotización.
- Precio: con `markup`, costo × (1 + tasa); con `target_margin`, costo ÷ (1 − tasa).
- Redondeo: con `rounding: "commercial"` la fila sube al múltiplo de la moneda de la cotización; con `"none"` queda
  exacta.
- Piso: el `minimumMargin` de su categoría. La fila trae `floorNet`, el neto mínimo que lo cumple.

En el ejemplo de referencia (CLP):

| `costId`        | Proveedor cobra | Costo en la cotización | Neto      | Margen de la fila | `floorNet` |
| --------------- | --------------- | ---------------------- | --------- | ----------------- | ---------- |
| `tp-production` | CLP 4.500.000   | 4.500.000              | 4.950.000 | 450.000           | 4.736.843  |
| `tp-talent`     | USD 1.250,00    | 1.250.000              | 1.380.000 | 130.000           | 1.315.790  |
| `tp-media`      | CLP 3.333.333   | 3.333.333              | 3.333.333 | 0                 | 3.333.333  |

El talento sale en 1.380.000 y no en 1.375.000 porque su regla redondea: 5.000 de `roundingAdjustment`. Los medios
se cobran al peso.

**Lo que nunca toca a una fila de terceros.** El factor de mercado del país del cliente, la razón de la forma del
compromiso (el 10 % de On-Demand), un `discount` por tasa, la reserva de contingencia y la política de precio de la
oferta. Un `discount` o un `agreed_net` de clase `monthly` o `setup` que nombre un `costId` devuelve exit 2 con
`INVALID_ADJUSTMENT_LINE`. A una fila de terceros llegan sólo dos ajustes, los dos explícitos: un neto acordado de
clase `third_party` (abajo) o un `agreed_total` que nombre su `costId` y la traiga dentro del precio de todo el
trabajo ([cómo](#un-precio-por-todo-el-trabajo-agreed_total)). Un `agreed_total` que no la nombra la deja fuera, a
su regla.

### Acordar el neto de un costo de terceros

Cuando el operador pacta con el cliente un neto distinto para un costo, se declara en `brief.adjustments` con
`billing: "third_party"` y los `costId` en `lineIds`. El motivo de este ejemplo es ilustrativo:

```json
"adjustments": [
  {
    "adjustmentId": "produccion-acordada",
    "kind": "agreed_net",
    "amount": "4800000",
    "billing": "third_party",
    "lineIds": ["tp-production"],
    "reason": "Neto acordado con el cliente por la producción; aprobado por el operador el 2026-10-11."
  }
]
```

- `amount` es el neto de esas filas por periodo, en la moneda de la cotización, igual que en
  [Registrar el precio acordado](#registrar-el-precio-acordado). `lineIds` sólo admite costos `reinvoiced`: nombrar
  uno `client_direct` devuelve `INVALID_ADJUSTMENT_LINE`.
- Sobre una copia del ejemplo, ese ajuste deja la fila en 4.800.000 (`discount` 150.000), el neto total en
  20.883.333 y ninguna fila marcada: 4.800.000 está sobre el `floorNet` de 4.736.843.
- Con `amount` `"4600000"` la fila sale marcada: `marginFloor.lines[]` la trae con `kind` `third_party`,
  `minimumMargin` `0.05`, `floorNet` `4736843` y `netShortOfFloor` `136843`. Es un incumplimiento real del piso de
  esa categoría y lo decide el operador, como cualquier otro.

### Moneda de un costo de terceros

- **Proveedor en la moneda de la cotización: no hay conversión.** Un proveedor en CLP dentro de una cotización en
  CLP entra por su monto exacto (4.500.000 y 3.333.333 en el ejemplo).
- **Proveedor en otra moneda:** el monto pasa por la moneda de cálculo (USD) con los tipos de cambio que la
  cotización congela. En el ejemplo, USD 1.250,00 al FX de cotización USD→CLP `1000` (`fxPath` `USD>CLP`). Un
  proveedor en EUR en esa misma cotización pasaría por `EUR>USD>CLP`, a `1200`.
- **El tipo de cambio se elige solo.** A diferencia de una herramienta con precio en otra moneda, el par de un costo
  de terceros **no** se nombra en `fxRecordIds`: hacerlo devuelve exit 2 con `UNUSED_FX_SELECTION`. Si el catálogo
  no tiene ese par, `MISSING_CATALOG_SELECTION` en `fx.<par>`.
- **La brecha de exposición.** El resumen lista en `thirdParty.fxExposed` los costos cuyo proveedor cobra en otra
  moneda (`tp-talent`), y `compose assess` levanta `THIRD_PARTY_FX_EXPOSURE` por cada uno: la fila se convirtió con
  el FX congelado en la cotización y al proveedor se le paga al tipo de cambio del día del pago. Se le lleva al
  operador para que acuerde una cláusula de reajuste o un margen de cambio explícito. El cotizador no agrega ninguno.

### Vigencia y estado de la cotización del proveedor

La `evidence` de un costo refacturado se juzga como cualquier fuente, contra `quoteDate`:

| Estado de la `evidence`                                         | Qué pasa                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `confirmed` y `quoteDate` entre `effectiveFrom` y `effectiveUntil` | Calcula                                                                                                                                                |
| `estimated`                                                     | Calcula, en revisión: `ESTIMATED_SOURCE`, el gap `THIRD_PARTY_COST_EVIDENCE_REQUIRED` en `compose assess` y una entrada `third_party` en `estimateExposure` |
| `pending`                                                       | No calcula: exit 2 con `MISSING_SOURCE_CONFIRMATION`                                                                                                    |
| `quoteDate` fuera de la vigencia (cotización vencida o posterior) | No calcula: exit 2 con `STALE_SOURCE` en `periods.<n>.request.thirdPartyCosts.<i>.source`                                                              |

El ejemplo copiado con fecha 2026-12-01 queda bloqueado con tres `STALE_SOURCE`: las tres cotizaciones valían hasta
el 2026-11-30. Antes de eso el resumen avisa: copiado con fecha 2026-11-10 trae en `runNotices.priceDates.dueSoon`
tres entradas con `subject` `third_party_quote`, `date` `2026-11-30`, `daysLeft` `20` y `blocksWith`
`STALE_SOURCE`. Una cotización vencida no se arregla moviendo la fecha de la `evidence`: se le pide una nueva al
proveedor.

### Un costo que paga el cliente

Un costo `client_direct` es una nota: no está en el costo, en el neto, en el margen ni en ninguna cifra de caja, y
su monto se muestra en su propia moneda, sin convertir. Dónde aparece:

- en el resumen, en `thirdParty.clientDirect[]`;
- en `compose preview`, en `clientPaidDirectly[]` y, en Markdown, en un bloque aparte después del neto: «Pagado
  directamente por el cliente a su proveedor. No forma parte de esta cotización ni de su neto»;
- en `compose cash`, en `supplierCash.paidByClientDirectly`;
- en `compose assess`, dentro del gap `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED`.

No hay una comisión sobre lo que el cliente paga directo: si se pacta una, hoy se registra aparte y se dice.

### Qué no hacer con los costos de terceros

- No escribir una tasa en la demanda ni calcular a mano el precio de una fila: la regla es la de la categoría.
- No esconder un costo de proveedor dentro de una línea de persona, de una herramienta o de una provisión, ni
  restarlo como un descuento.
- No elegir la categoría por la regla que conviene (`media` o `licences` para cobrar al costo algo que es
  producción).
- No declarar `client_direct` un costo que Efeonce va a pagar para sacarlo del margen, ni `reinvoiced` uno que paga
  el cliente.
- No repetir un costo único en varios periodos: se multiplica.
- No marcar `confirmed` una `evidence` sin cotización del proveedor, ni estirar su vigencia para que la corrida pase.
- No escribir el proveedor ni su monto en `label`: el `label` llega al cliente.
- No nombrar el tipo de cambio de un costo en `fxRecordIds`.

## Reserva de contingencia

**Qué es.** Un porcentaje sobre el costo del equipo que el cotizador agrega **como costo** a cada fila del equipo
de un trabajo de alcance fijo, para cubrir sobrecostos. No es un fee, no es un descuento disponible y no se le paga
a nadie: es una provisión dentro del costo. Es parte del contrato 1.4.0.

**Cuándo se aplica.** La reserva es un registro del catálogo y la cotización lo recibe sola, según su oferta y su
forma del compromiso:

```bash
pnpm --silent pricing:v3 catalog search --current --kind contingency_reserve
```

Devuelve exit 0 con dos registros, los dos de `rate` `0.12` y `base` `human`:

| `recordId`                                      | Oferta                     | Forma       |
| ----------------------------------------------- | -------------------------- | ----------- |
| `contingency:creative-managed-service:on_demand` | `creative-managed-service` | `on_demand` |
| `contingency:seo-aeo-managed-service:on_demand`  | `seo-aeo-managed-service`  | `on_demand` |

- **Se aplica** a un servicio gestionado (creativo o SEO/AEO) cuya demanda declara `"engagementForm": "on_demand"` y
  está fechada desde el 2026-10-11.
- **No se aplica** a un servicio gestionado On-Going ni a una persona vendida por dedicación
  (`talent-assurance-staffing`), en ninguna forma: ahí el cliente dirige el trabajo.
- `base: "human"` es el costo de persona de cada fila del equipo; `own_costs` sería todo el costo propio de la fila.
  Nunca descansa sobre una fila de terceros.
- El 12 % es el colchón que el operador usó en una oferta de licitación. Lo propuso el agente y el CEO lo aceptó el
  2026-10-11 («seguiré tu recomendación») como estimación por ajustar con el primer trabajo real: los dos registros
  están `estimated`.

**Paso a paso.** No se declara nada para tenerla: basta la oferta y la forma. Sobre la copia fechada 2026-10-11 de
[el servicio gestionado](#cotizar-un-servicio-gestionado-por-volumen) (cliente y equipo en Chile, CLP), con
`"engagementForm": "on_demand"` en el `brief`:

| Qué                                                      | Valor                    |
| -------------------------------------------------------- | ------------------------ |
| `engineVersion`                                          | `pricing-v3-local/1.4.0` |
| `totals.contingencyBase` (costo de persona del equipo)   | 3.640.000                |
| `totals.contingencyReserve` (12 %, dentro de `totals.cost`) | 436.800               |
| `totals.cost`                                            | 5.666.722                |
| `totals.net`                                             | 11.370.000               |
| `marginRateRoundedDown`                                  | `0.501607`               |

**Es un costo, así que se vende.** La reserva entra al costo de la fila antes de la política de precio: lleva el
margen de la oferta y la razón de On-Demand como cualquier otro costo, y sube el neto mínimo de la fila
(`floorNet`). En el ejemplo, 436.800 de costo se vuelven 870.000 de precio: la misma demanda con la reserva
renunciada da 10.500.000 en vez de 11.370.000. `totals.cost − totals.contingencyReserve` es el costo de esa misma
cotización sin reserva.

**Cómo renunciar a ella.** La reserva sale de una cotización de una sola manera: una renuncia declarada en el
`brief`, con su motivo.

```json
"contingency": { "kind": "waived", "reason": "El cliente asume el riesgo de alcance: todo cambio va por orden de cambio firmada." }
```

Qué hace una renuncia, medido sobre el mismo ejemplo:

- La reserva pasa a `0`, el costo baja a 5.229.922 y el neto a 10.500.000 (870.000 menos).
- `totals.contingencyReserveWaived` informa lo que se dejó fuera (`436800`) y `totals.contingencyBase` queda en `0`.
  El resumen trae `contingencyReserve.waived` `true`, `waiverReason` y `waivedAmount`.
- La cotización queda marcada: `reviewSignals` trae `CONTINGENCY_RESERVE_WAIVED` y `compose assess` un gap con el
  mismo código. Sigue firmada por el motor 1.4.0: la renuncia es parte de lo que la cotización congela.
- El `reason` es obligatorio (sin él, `SCHEMA_INVALID`). Dice quién decidió renunciar y por qué el riesgo de alcance
  queda cubierto de otra forma.
- Una renuncia donde no hay reserva que renunciar (otra oferta, forma On-Going, fecha anterior) no se ignora:
  exit 2 con `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency`.

**Si la forma no está declarada.** El cotizador no puede saber si la reserva aplica y lo dice: la cotización calcula
sin reserva y `assumptions` trae `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`, con el registro que no
se evaluó en `candidates`. Le pasa a toda cotización de servicio gestionado que no declara `engagementForm`,
incluido [el ejemplo del servicio gestionado](#cotizar-un-servicio-gestionado-por-volumen). Se pregunta la forma, se
declara (`on_going` u `on_demand`) y se vuelve a correr; el supuesto no se deja en una cotización que se presenta.

**Qué significan las señales.**

- `contingencyReserve` en el resumen: `{ rate, base, amount, baseAmount, shareOfNet, waived, recordId, revision,
  scope, sourceStatus }`, más `waiverReason` y `waivedAmount` si se renunció. La clave no existe si la cotización no
  tiene reserva.
- `ESTIMATED_SOURCE` con `paths` `snapshot.contingencyReserve`: la tasa es una estimación. Sale también en una
  cotización que renuncia a la reserva.
- En `estimateExposure`, la reserva no es un dato del ranking: aparece en `estimatedRules` y agranda en
  `(1 + tasa)` el costo que depende de los datos de su base.
- `compose split` la deja dentro de la persona; `compose cash` la muestra como una naturaleza propia
  (`contingencyReserve`), que no es caja de nadie ni capacidad contratada.

**Qué no hacer.**

- No renunciar a la reserva para llegar a un precio sin decirlo: una renuncia se decide con el operador, lleva su
  motivo y queda marcada.
- No omitir `engagementForm` para que la reserva no entre, ni declarar `on_going` un trabajo de alcance fijo.
- No sumar una reserva a mano como una línea, una provisión o un porcentaje sobre el precio: ya está en el costo.
- No presentarla como margen ni como un descuento que se puede ofrecer.
- No presentar el 12 % como un dato medido: es una estimación.

## Cómo leer una cotización con terceros

**Para qué sirve.** Explicar bien una cotización 1.4.0. Con costos de terceros el margen total deja de decir si el
trabajo propio está bien vendido, y el cotizador entrega las dos lecturas. Todas las cifras de esta sección salen
del ejemplo de referencia, `managed-on-demand-third-party.demand.json` y su artefacto: un servicio gestionado
creativo vendido On-Demand en Chile, en CLP, con una producción en CLP, talento en USD, medios al costo y una
licencia que paga el cliente.

**Antes de empezar.** Tener el artefacto. Las lecturas se corren sobre el de referencia; todas devuelven exit 3:

```bash
terceros=data/pricing/v3-operating/managed-on-demand-third-party.artifact.json

pnpm --silent pricing:v3 replay --input "$terceros"
pnpm --silent pricing:v3 compose assess --input "$terceros"
pnpm --silent pricing:v3 compose preview --input "$terceros" --format markdown --out /tmp/terceros-preview.md
pnpm --silent pricing:v3 compose split --input "$terceros" --tools all
pnpm --silent pricing:v3 compose cash --input "$terceros"
pnpm --silent pricing:v3 compose commitments --input "$terceros"
pnpm --silent pricing:v3 compose schedule --input "$terceros" --milestones /tmp/hitos.json
```

`/tmp/hitos.json` es el archivo de hitos de [Calendario de pagos](#calendario-de-pagos-compose-schedule).

### La regla de lectura

| Lectura                                  | Costo      | Neto       | Margen                   |
| ---------------------------------------- | ---------- | ---------- | ------------------------ |
| Toda la cotización (`totals`)            | 14.750.055 | 21.033.333 | 29,87 % (`0.298729`)     |
| Terceros refacturados (`thirdParty.reinvoiced`) | 9.083.333 | 9.663.333 | 580.000 de margen  |
| Trabajo propio (`ownWork`)               | 5.666.722  | 11.370.000 | 50,16 % (`0.501607`)     |

- **El margen mezclado baja con todo lo que se refactura al costo o cerca del costo.** 29,87 % no dice que el
  servicio esté mal vendido: casi la mitad del neto (`shareOfNet` `0.459429`) son compras que se traspasan.
- **El número que se compara con el piso de la oferta es `ownWork.marginRateRoundedDown`**, no el mezclado. Aquí,
  50,16 % contra el piso de 45 %.
- **No hay un veredicto a nivel de cotización sobre ninguno de los dos.** El piso se juzga por fila: una fila del
  equipo contra la política de su oferta, una fila de terceros contra la regla de su categoría. En el ejemplo
  `marginFloor.lines` está vacío: ninguna fila está bajo su piso.
- Se le informan al operador los dos márgenes, cada uno con su nombre. No se presenta el mezclado como «el margen
  del servicio» ni el del trabajo propio como «el margen de la cotización».

Identidades que se pueden comprobar: trabajo propio = `totals` − terceros (11.370.000 = 21.033.333 − 9.663.333;
5.666.722 = 14.750.055 − 9.083.333), y cada total es la suma de sus filas.

### En el resumen

- **`thirdParty.reinvoiced`**: `cost`, `net`, `marginAmount`, `shareOfNet` y `rows[]`, una por costo, con `costId`,
  `label`, `category`, el monto y la moneda del proveedor, el estado y las fechas de su `evidence`, la regla aplicada
  (`policy`), `cost`, `net`, `marginAmount`, `minimumMargin` y `floorNet`. **No trae el nombre del proveedor ni la
  referencia de su cotización**: un costo se nombra por `costId`, `label` y categoría; lo demás queda en el `brief`
  congelado.
- **`thirdParty.clientDirect[]`**: lo que paga el cliente, como se declaró. **`thirdParty.fxExposed[]`**: los
  `costId` con proveedor en otra moneda.
- **`contingencyReserve`**: aquí `amount` `436800`, `baseAmount` `3640000`, `rate` `0.12`, `shareOfNet`
  `0.020767`, `waived` `false`.
- **`estimateExposure`**: la cotización estimada de un proveedor es un dato del ranking. En el ejemplo el primero es
  `third_party` / `tp-media`, con `shareOfCost` `0.225988` y `marginRateLostIfTenPctHigher` `0.015848`: los medios
  son un plan estimado y se cobran al costo, así que un 10 % más de inversión son 1,6 puntos de margen mezclado si
  el neto no se mueve. Las reglas de terceros y la reserva, que son estimadas, están en `estimatedRules`.
- **`cashLedger`**: una entrada `third-party:<costId>` por costo, en el periodo en que cae.

### En cada lectura del artefacto

- **`compose assess`.** `margin.modeledRate` es el margen mezclado y `margin.ownWorkRate`, el del trabajo propio.
  No compara ninguno de los dos con un margen genérico: la comparación 40 %/35 % que traía se retiró el 2026-10-11
  (`proposedTarget`, `proposedFloor`, `belowProposedFloor` y `proposedFloorReadOn` ya no existen). En su lugar
  `margin.pricingPolicies[]` dice con qué regla se puso precio a cada línea (aquí `creative-managed-service`,
  `target_margin` `0.45`, `minimumMargin` `0.45`, las seis líneas), `margin.thirdPartyPolicies[]` trae la regla de
  cada categoría con sus `costIds` (`production` y `talent`: `markup` `0.10`, piso `0.05`; `media`: `markup` `0`,
  piso `0`) y `margin.belowPolicyFloor` es `true` sólo si el kernel marcó alguna fila; aquí, `false`. Gaps propios
  de una cotización con terceros:

  | Gap                                    | Cuándo sale                                                              | Qué hacer                                                                                             |
  | -------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
  | `THIRD_PARTY_COST_EVIDENCE_REQUIRED`   | Un costo refacturado cuya `evidence` no está `confirmed` (`tp-media`)    | Conseguir la cotización del proveedor con su referencia, fecha y vigencia                             |
  | `THIRD_PARTY_FX_EXPOSURE`              | Un costo refacturado con proveedor en otra moneda (`tp-talent`)          | Acordar una cláusula de reajuste o un margen de cambio explícito                                      |
  | `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED` | La demanda declara algún costo de terceros, de cualquier liquidación     | Validar qué cubre cada uno, quién contrata y paga, plazos de pago, derechos de uso y qué cuesta cancelar |
  | `THIRD_PARTY_TAX_TREATMENT_REVIEW`     | Hay un costo refacturado y el impuesto de la cotización es `exclusive`   | Confirmar que cada fila de terceros lleva el tratamiento del servicio: la tasa se aplicó a todo el neto |
  | `CONTINGENCY_RESERVE_WAIVED`           | La demanda renuncia a la reserva                                          | Llevarle al operador el monto que quedó fuera y el motivo                                             |

  En el ejemplo salen los tres primeros.

- **`compose preview`** (lo que ve el cliente). El fee es sólo el trabajo propio y cada costo de terceros es un ítem
  con su `label` y su neto final:

  | Ítem                                             | Neto (CLP) |
  | ------------------------------------------------ | ---------- |
  | Servicio gestionado — fee del periodo            | 11.370.000 |
  | Producción audiovisual de la campaña             | 4.950.000  |
  | Talento: locución y derechos de uso por 12 meses | 1.380.000  |
  | Inversión en medios pagados                      | 3.333.333  |
  | Neto del plazo                                   | 21.033.333 |

  Después del neto, `clientPaidDirectly[]`: «Banco de imágenes contratado por el cliente: 890.00 USD (periodo 1)»,
  en su moneda y sin convertir. **Nunca muestra un proveedor, un costo, una tasa ni la reserva** (que va dentro del
  fee).

- **`compose split`.** Con filas de terceros la presentación tiene **tres** partes y
  `tools.net + person.net + thirdParty.net` es el neto de cada fila. Con `--tools all`: kit 2.020.000 + persona
  9.350.000 + terceros 9.663.333 = 21.033.333. La reserva queda dentro de la persona. Una fila de terceros es
  entera `thirdParty`.

- **`compose cash`.** `fullCostByNature` suma dos naturalezas: `thirdParty` (9.083.333) y `contingencyReserve`
  (436.800). **`newSupplierCash` incluye ahora lo que se les paga a los proveedores de los costos refacturados**:
  9.083.333, detallado en `supplierCash.thirdParty.purchases[]`; por eso `cashAddedOnContractedCapacity` es
  11.950.000 (21.033.333 − 9.083.333). La reserva es una provisión dentro del costo: no es caja de nadie y no está
  en `capacityCostAbsorbed`. Lo que paga el cliente se lista en `supplierCash.paidByClientDirectly` y no se cuenta
  en ninguna cifra. `results.marginAtFullCost.ownWork` repite el margen del trabajo propio. `restsOn` agrega un
  supuesto —que cada costo se paga al monto que la cotización congeló— y `notDerivable` dice que la fecha en que se
  le paga a un proveedor no se puede leer (`supplierCash.thirdParty.paymentDate`).

- **`compose schedule`.** Reparte **todo** el neto, costos refacturados incluidos: con los hitos del ejemplo,
  10.520.000, 6.310.000 y 4.203.333. El bloque `thirdParty` compara por periodo lo que se les paga a los proveedores
  con los hitos puestos en ese periodo: en el periodo 1, `supplierCost` 9.083.333 contra `milestonesPlacedInPeriod`
  6.310.000, `supplierCostAboveMilestones` 2.773.333. Esa diferencia es lo que la empresa adelanta hasta cobrar un
  hito posterior. Un hito con `when` o sin periodo no se compara con nada (`milestonesInNoPeriod`), y el hito que
  declara un periodo trae `thirdPartyCostInPeriod`.

- **`compose commitments`.** Las compras a terceros quedan **fuera** de esta lectura a propósito: un costo
  refacturado se congela como un monto en un periodo, sin plazo mínimo, cargo de cancelación ni derechos que sigan
  corriendo. La lectura dice cuántas vio (`reviewed.thirdPartyPurchasesOutsideThisReading`: `3`) y lo declara en
  `notDerivable` con `THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`. Que no aparezca un compromiso por una compra a un
  tercero no significa que no lo haya: se revisa en el contrato con el proveedor.

- **Fechas de precio.** La vigencia de cada cotización de proveedor es una fecha dura del resumen
  (`runNotices.priceDates`, `subject` `third_party_quote`,
  [detalle](#vigencia-y-estado-de-la-cotización-del-proveedor)). El fin de un registro de reserva no bloquea: la
  cotización siguiente no lleva reserva ([Reserva de contingencia](#reserva-de-contingencia)).

Ninguna de estas lecturas, salvo `compose preview`, va al cliente: traen costos, márgenes y montos de proveedor.

### Si un costo de terceros o la reserva fallan

Todos llegan en `diagnostics` del resumen, con exit 2 y sin precio, salvo donde se indica:

| Qué devuelve                                                                       | Causa                                                                                                                                  | Arreglo                                                                                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `MISSING_CATALOG_SELECTION` en `thirdPartyCosts.<costId>.policy`                    | La categoría no tiene regla vigente a la fecha de la demanda; por ejemplo, un id que no existe en el catálogo                          | Usar una categoría del catálogo. Una categoría nueva la decide el operador y entra por el catálogo        |
| `AMBIGUOUS_SELECTION` en `thirdPartyCosts.<costId>.policy`                          | Dos reglas vigentes del mismo nivel para esa categoría                                                                                 | Error del catálogo: versión nueva que retire el duplicado                                                  |
| `MISSING_THIRD_PARTY_POLICY`                                                        | Sólo en el carril del núcleo (`calculate`): el snapshot no trae la regla de la categoría de un costo                                   | Agregar la regla a `snapshot.thirdPartyPolicies`. En `compose` este faltante es el de la primera fila     |
| `INVALID_THIRD_PARTY_AMOUNT` en `periods.<n>.request.thirdPartyCosts.<i>.amount`    | `amount` tiene más decimales que la moneda del proveedor                                                                               | Escribirlo en la escala de su moneda                                                                       |
| `DUPLICATE_THIRD_PARTY_COST_ID` en `thirdPartyCosts`                                | Un `costId` repetido, o igual al `lineId` de una línea                                                                                  | Un id distinto por costo y distinto de toda línea                                                          |
| `INVALID_THIRD_PARTY_SCHEDULE` en `thirdPartyCosts.<costId>`                        | `periodIds` repite un periodo o nombra uno que la cotización no tiene                                                                   | Listar periodos de 1 a `brief.periods`, sin repetir                                                        |
| `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD` en `thirdPartyCosts.<costId>`              | Un costo refacturado cae en un periodo en que ninguna línea del equipo está activa                                                      | Moverlo a un periodo cotizado, o activar una línea en ese periodo                                          |
| `UNCONFIRMED_THIRD_PARTY_COST` en `thirdPartyCosts.<costId>.evidence`               | Demanda en `mode: "commercial_draft"` con un costo refacturado cuya `evidence` no está `confirmed`                                      | Confirmar la cotización del proveedor. Hoy toda composición es simulación: sale junto a otros bloqueos     |
| `STALE_SOURCE` en `periods.<n>.request.thirdPartyCosts.<i>.source`                  | `quoteDate` fuera de la vigencia de la cotización del proveedor                                                                         | Pedirle una cotización nueva al proveedor y actualizar la `evidence`                                       |
| `MISSING_SOURCE_CONFIRMATION` en la misma ruta                                      | `evidence.status` es `pending`                                                                                                          | Conseguir el respaldo; `estimated` calcula en revisión                                                     |
| `INVALID_ADJUSTMENT_LINE` en `adjustments`                                          | Un `discount`, o un `agreed_net` `monthly`/`setup`, nombra un `costId`; o un `agreed_net` `third_party` nombra una línea o un costo `client_direct`; o un `agreed_total` nombra un id que no es una línea ni un costo refacturado | Las líneas van con `monthly`/`setup`; los costos refacturados, con `third_party`. Un `agreed_total` admite líneas y costos refacturados juntos |
| `UNUSED_FX_SELECTION` en un `fx:…`                                                  | `fxRecordIds` nombra el par de la moneda de un proveedor                                                                                | Quitarlo: el tipo de cambio de un costo de terceros se elige solo                                          |
| `AMBIGUOUS_CONTINGENCY_RESERVE` en `contingency`                                    | Dos registros de reserva del mismo nivel aplican a la cotización; `candidates` los lista                                                | Error del catálogo: versión nueva que retire uno                                                           |
| `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency`                               | La demanda renuncia a una reserva que esta cotización no tiene                                                                          | Quitar `contingency`, o corregir la oferta, la forma o la fecha                                            |
| `CONTINGENCY_RESERVE_WAIVED` (exit 3, en `reviewSignals`; no bloquea)               | La demanda renuncia a la reserva y había una                                                                                            | No es un error: informar el monto renunciado y el motivo                                                   |
| Exit 1, `SCHEMA_INVALID` en stderr (`issues` da el `path`)                          | Falta `evidence` en un costo `reinvoiced`, falta `reason` en la renuncia, `amount` o `quantity` no son cadenas válidas, o sobra un campo | Corregir cada `path`                                                                                       |

### Lo que todavía no está modelado

Se dice cuando el pedido lo toca; no se resuelve por cuenta propia en una cotización:

- cuándo se le paga a un proveedor, y si una compra obliga más allá del trabajo (plazo mínimo, derechos de uso que
  siguen corriendo);
- una comisión sobre lo que el cliente paga directo;
- una tarifa registrada de proveedores recurrentes: cada costo se declara en su cotización;
- un tratamiento de impuestos por fila: hay uno por cotización;
- una cotización sólo de terceros, sin ninguna línea de equipo;
- la reserva para un servicio On-Going ganado en una licitación con multas;
- la liberación de la reserva después de la entrega.

En el ledger: `THIRD_PARTY_AND_CONTINGENCY`.

## Registrar el precio acordado

El precio que el operador acuerda de verdad tiene que pasar por el motor. Si se anota sólo en la propuesta, el
artefacto congelado sigue mostrando el precio calculado y nadie comprueba el piso contra el precio real. El precio se
declara directo, en `brief.adjustments`: no se calcula ninguna tasa a mano.

**Hay dos ajustes para un precio pactado, y se elige por cómo se pactó:**

| Se pactó | Ajuste | `amount` es |
| --- | --- | --- |
| Un valor por mes (un fee mensual, el valor mensual de una persona), o un valor para una sola clase de cobro | `agreed_net`, con `billing` | El neto de esas líneas **en cada periodo**, para esa clase de cobro. En doce meses, el plazo suma doce veces `amount` |
| Un precio por todo el trabajo (un programa, un proyecto, un precio «todo incluido» con su puesta en marcha) | `agreed_total`, sin `billing` | El neto de esas líneas **en todo el plazo**: todos los periodos y todas las clases de cobro juntas |

Antes del 2026-10-11 sólo existía el primero, y un precio por todo el trabajo había que dividirlo a mano entre meses
y clases. Ya no: se declara el total y el cotizador lo reparte.

### Un precio por mes (`agreed_net`)

1. Cotizar sin ajustes con `--current` y leer `totals.undiscountedPrice`: es el precio calculado, ya redondeado.
2. Copiar la demanda a un archivo nuevo y declarar el acuerdo dentro de `brief`:

   ```json
   "adjustments": [
     {
       "adjustmentId": "sky-precio-acordado",
       "kind": "agreed_net",
       "amount": "4990000",
       "billing": "monthly",
       "lineIds": ["titular", "lider", "agentes"],
       "reason": "Precio base acordado CLP 4.990.000 más IVA al mes, todo incluido. Excepción al piso de 45 % aprobada por el CEO el 2026-10-10 por ser cliente vigente."
     }
   ]
   ```

   - `amount`: el neto acordado antes de impuestos, en la moneda de salida, como cadena y sin más decimales que los de
     la moneda.
   - Es **por periodo y por clase de cobro**: con `billing: "monthly"` es lo que se factura cada mes por esas líneas.
     Si lo pactado es un monto por todo el plazo, no se divide a mano: es un `agreed_total`
     ([abajo](#un-precio-por-todo-el-trabajo-agreed_total)).
   - `billing`: `monthly` acuerda las filas mensuales de esas líneas; `setup`, las de implementación (cobro único), y
     sólo rige en los periodos que tienen filas de implementación. Acordar las dos cosas por separado son dos
     ajustes. Un tercer valor, `third_party`, acuerda el neto de costos de terceros: ahí `lineIds` lleva `costId`, no
     líneas ([cómo](#acordar-el-neto-de-un-costo-de-terceros)).
   - `lineIds`: los IDs de las líneas del brief que cubre el acuerdo. El motor reparte la diferencia entre sus filas
     en proporción al precio de cada una.
   - `reason`: obligatorio. Dice qué se acordó, quién lo aprobó y cuándo.
   - El monto puede quedar bajo o sobre el precio calculado. Si es menor, la diferencia sale como `discount` (rebaja);
     si es mayor, como `uplift` (recargo). En ambos casos el neto de esas filas es exactamente `amount`.

3. Volver a correr con `compose prepare` y comprobar en el resumen: el neto de cada periodo (`periods[].totals.net`;
   `totals.net` suma todo el plazo) es el monto acordado más lo que facturen las filas que el acuerdo no cubre,
   `commercialAdjustments` trae el ajuste con su motivo y `engineVersion` es `pricing-v3-local/1.1.0` (`1.2.0` con
   cliente en Colombia o Perú; `1.3.0` si la demanda declara la forma del compromiso; `1.4.0` si refactura un costo
   de terceros o lleva reserva de contingencia). El motor no juzga si el monto
   es razonable (acepta incluso `"0"`): revisar la cifra antes de congelar.
4. Leer el margen real en `marginRateRoundedDown` y las líneas bajo el piso en `marginFloor.lines[]`. En cada una,
   `netShortOfFloor` dice cuánto más tendría que valer la fila para cumplir su piso y `floorNet`, cuál es ese neto
   mínimo; `marginAmountShortOfFloor` es el margen que falta si el neto no se mueve. Qué claves trae cada línea
   depende del motor y del país del cliente ([las tres claves](#qué-significa-una-línea-marcada)). Una línea marcada
   es un incumplimiento real: se lleva al operador antes de congelar.
5. Congelar con `compose quote --out` en una ruta nueva, guardar el resumen y correr `compose assess` sobre el
   artefacto. Conservar los cuatro archivos junto al expediente, con una nota de la decisión.

### Un precio por todo el trabajo (`agreed_total`)

```json
"adjustments": [
  {
    "adjustmentId": "programme-price",
    "kind": "agreed_total",
    "amount": "9500000",
    "lineIds": ["seo", "lead"],
    "reason": "Precio acordado por el programa de tres meses, todo incluido. Quién lo aprobó y cuándo."
  }
]
```

- `amount`: el neto de todo lo que nombra `lineIds`, en todo el plazo, en la moneda de salida y con sus decimales.
- `lineIds`: líneas del brief y, si el precio los incluye, costos de terceros refacturados, por su `costId`. Un costo
  que no se nombra queda fuera del total, a la regla de su categoría.
- No lleva `billing`: cubre las filas mensuales, las de puesta en marcha y, de los costos nombrados, las de terceros.
- `adjustmentId` admite hasta 100 caracteres; `reason` es obligatorio.
- Lo que nombra un `agreed_total` no puede estar dos veces en él ni en ningún otro ajuste —`discount`, `agreed_net` u
  otro `agreed_total`—: `AGREED_TOTAL_OVERLAPS_ADJUSTMENT`.

**Cómo lo reparte el cotizador.** El motor no conoce el total: recibe netos acordados por periodo, como siempre. La
resolución hace dos pasadas:

1. Cotiza la demanda una vez **sin** el acuerdo y lee el neto de política de cada grupo de filas que el total nombra:
   un grupo es un periodo y una clase de cobro (`monthly`, `setup`, `third_party`).
2. Reparte el total entre los grupos en proporción a ese neto. Cada parte se corta hacia abajo a un múltiplo de la
   unidad de reparto y el último grupo con precio toma lo que queda. Los grupos suman exactamente el total. A cada
   periodo le llega un `agreed_net` por clase, llamado `<adjustmentId>:<clase>`.

El resumen lo deja en `agreedTotals`, y el artefacto lo congela:

| Clave | Qué dice |
| --- | --- |
| `amount`, `currency` | El total declarado |
| `policyNet` | Lo que esas filas valían al precio de política: el neto de la primera pasada |
| `differenceFromPolicyNet` | `amount − policyNet`. Negativo: se vendió bajo el precio de política |
| `distributionUnit`, `distributionUnitBasis` | La unidad de la que cada parte es múltiplo, y por qué (abajo) |
| `distribution[]` | Por clase de cobro y neto: `policyNet`, `agreedNet` y los `periodIds` que lo llevan. Periodos con la misma parte se juntan en una entrada |

**La unidad de reparto cuida el impuesto.** El kernel redondea el impuesto de cada periodo y la cotización los suma;
repartido al peso, un total puede dejar un impuesto a un peso del de la tasa sobre el total.

| `distributionUnitBasis` | Cuándo | Unidad | Impuesto de la cotización |
| --- | --- | --- | --- |
| `tax_exact` | Impuesto exclusivo con tasa `p/q` en su mínima expresión | `q` unidades mínimas de la moneda: 100 pesos o USD 1,00 a 19 %; 400 pesos a 19,25 % | Exactamente la tasa sobre el total, redondeada una vez. Vale para una cotización cuyas filas están todas dentro de un solo `agreed_total` |
| `currency_precision` | Impuesto sin resolver o que no aplica | La unidad mínima de la moneda | No hay impuesto que cuidar |
| `currency_precision_fallback` | La unidad exacta es más grande que la parte de algún grupo, que quedaría en cero | La unidad mínima de la moneda | Puede diferir del impuesto del total en una unidad por periodo |

Ejemplo, medido: 9.500.000 por un programa de tres meses a 19 % se reparte en 3.166.600, 3.166.600 y 3.166.800
(unidad `100`, `tax_exact`), y el impuesto es 1.805.000, que es 19 % de 9.500.000
([caso completo](#caso-c--un-programa-seoaeo-de-tres-meses-con-un-precio-por-el-programa)).

**Qué tener presente.**

- **Los periodos pueden no ser iguales**: el último toma el resto. En el documento, un fee pactado así sale partido
  en dos tramos si se pliega por meses; se imprime como un solo precio con `combine`
  ([Producir el documento](#producir-el-documento-de-cotización)).
- **El piso sigue siendo por fila.** El reparto es proporcional al precio de política, así que una rebaja le toca a
  todo lo nombrado en la misma proporción, también a un costo de terceros que se cobra al costo y tiene su piso en el
  costo: esa fila sale marcada ([caso medido](#caso-d--un-proyecto-único-de-alcance-cerrado-con-un-solo-precio)).
- **Sobre el precio de política también sirve**: la diferencia sale como `uplift`.
- **No sirve para acordar un mes**: para un valor mensual es `agreed_net`. Y no convive con otro ajuste sobre las
  mismas líneas: si una parte del trabajo tiene su propio precio pactado, o entra al total o se nombra aparte, con
  otras líneas.

### Reglas comunes y fallas

Se admiten hasta 10 ajustes y cada fila facturable recibe a lo más uno. Un `agreed_total` cuenta en cada periodo
como un ajuste por clase de cobro que alcanza; si con los demás un periodo supera los 10, la corrida devuelve
`ADJUSTMENTS_EXCEED_PERIOD_LIMIT`. Un `discount` (rebaja por tasa, para un descuento que de verdad se pacta como
porcentaje) toma las filas mensuales y las de implementación de sus líneas, así que no convive con un `agreed_net`
ni con un `agreed_total` sobre la misma línea. Ningún ajuste aprueba nada: el piso se controla sobre el neto final.
Si el ajuste está mal declarado no hay precio:

| Qué devuelve                                               | Causa                                                                                 | Arreglo                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Exit 2, `diagnostics` con `OVERLAPPING_ADJUSTMENTS`        | Dos ajustes apuntan a la misma fila                                                   | Dejar un ajuste por fila; separar por líneas o por `billing` |
| Exit 2, `diagnostics` con `INVALID_AGREED_AMOUNT`          | `amount` tiene más decimales que la moneda                                            | Escribir el monto en la escala de la moneda                  |
| Exit 2, `diagnostics` con `AGREED_NET_WITHOUT_BASE`        | No hay filas de esa clase que acordar (ej. `setup` en un servicio sin implementación) | Corregir `billing` o `lineIds`                               |
| Exit 2, `diagnostics` con `DUPLICATE_ID`                   | `adjustmentId` repetido                                                               | Un ID distinto por ajuste                                    |
| Exit 2, `diagnostics` con `INVALID_ADJUSTMENT_LINE`        | Un `lineId` no existe en el brief, o un `agreed_total` nombra un id que no es una línea ni un costo refacturado | Usar los IDs de `brief.lines` y los `costId` refacturados |
| Exit 2, `AGREED_TOTAL_OVERLAPS_ADJUSTMENT` en `adjustments.<adjustmentId>` | Algo que nombra el total está dos veces en él o en otro ajuste | Dejar cada línea y cada costo en un solo ajuste |
| Exit 2, `AGREED_TOTAL_NOT_REPRESENTABLE` en `adjustments.<adjustmentId>.amount` | El total tiene más decimales que la moneda | Escribirlo en la escala de la moneda |
| Exit 2, `AGREED_TOTAL_WITHOUT_BASE` en `adjustments.<adjustmentId>` | Un total mayor que cero sobre filas que valen cero en todos los periodos | Corregir `lineIds` |
| Exit 2, `AGREED_TOTAL_WITHOUT_POLICY_PRICE` en `adjustments.<adjustmentId>` | La cotización no calcula sin el acuerdo: no hay precio de política que repartir | Resolver los otros diagnósticos de la corrida; este desaparece con ellos |
| Exit 2, `ADJUSTMENTS_EXCEED_PERIOD_LIMIT` en `periods.<n>.adjustments` | Con el reparto de un total, ese periodo supera los 10 ajustes | Reducir los ajustes declarados |
| Exit 2, `DUPLICATE_ADJUSTMENT_ID` en `adjustments` | Un `adjustmentId` choca con otro o con `<adjustmentId>:monthly`, `:setup` o `:third_party` de un total | Un ID distinto por ajuste |
| Exit 1, `SCHEMA_INVALID` en stderr (`issues` da el `path`) | Falta `reason`, `amount` no es una cadena, un campo sobra (un `billing` en un `agreed_total`) o hay más de 10 ajustes | Corregir cada `path`                                         |

El método anterior —un `discount` cuya tasa `1 − neto ÷ precio` se calculaba a mano con siete decimales— sólo sirve
para leer artefactos congelados antes del motor 1.1 (`acordado.*` de SKY); no se usa para registrar un acuerdo nuevo.

Caso real, SKY social care 2027, congelado sobre el catálogo v4 y la policy v5 (su demanda está fechada 2026-10-10,
antes del inicio de la policy vigente, así que se repite con las versiones de su fecha): precio calculado
CLP 5.430.000 al mes (incluye 9.855 de
redondeo), acordado 4.990.000 → el motor deriva una rebaja de 440.000 y el neto es exactamente 4.990.000; margen
40,26 % (`0.402589`), tres líneas marcadas y CLP 236.579 al mes de margen bajo el piso en total. Archivos en
`docs/commercial/prospects/sky-social-care-2027/pricing/`: `acordado-neto.demand.json`,
`acordado-neto.artifact.json`, `acordado-neto.summary.json`, `acordado-neto.assessment.json` y la
[nota de la excepción](../../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md). Los
`acordado.*` anteriores (tasa 0,0793605 sobre el catálogo v3, precio al piso 5.420.145, mismo neto y mismo margen)
siguen siendo válidos y reproducibles. Sin precio acordado, la misma demanda (`final.demand.json`) da 5.430.000 y
ninguna línea marcada. Los tres comandos devuelven exit 3; `compose prepare` recalcula la demanda con las versiones
de su fecha, escritas a mano, y avisa en `runNotices.priceDates.dueSoon` de tres vigencias duras de la policy v5
(Notion, Microsoft 365 y la bandeja de Sprout); `replay` y `compose assess` leen el artefacto congelado. Con
`--current` esa demanda devuelve exit 2 (`RESOURCE_POLICY_NOT_EFFECTIVE`):

```bash
pnpm --silent pricing:v3 compose prepare \
  --catalog data/pricing/v3-operating/catalog.review-v4.json \
  --policy data/pricing/v3-operating/resources.review-v5.json \
  --credits data/pricing/v3-resources/ai-credits.review-v1.json \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.demand.json

pnpm --silent pricing:v3 replay \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json

pnpm --silent pricing:v3 compose assess \
  --input docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json
```

**Quién decide.** Márgenes, pisos, precios, cifras comerciales y excepciones al piso son decisión del operador (CEO y
dueño). El agente le lleva el margen real que entrega el motor y una recomendación; no aprueba, no da una excepción
por implícita ni usa el redondeo o un ajuste para «cumplir» un piso, y `compose assess` tampoco la aprueba. Aprobada
la excepción, se registra con su motivo en `reason` y en una nota junto al artefacto. Confirmado el 2026-10-10: el
45 % es el piso de margen de los servicios gestionados, y un servicio donde se puede ganar más sube su margen
objetivo, no el piso; la política `creative-managed-service` se mantiene en objetivo 0,45 y mínimo 0,45; SKY social
care es una excepción aprobada por ser cliente vigente. No usar el precio de SKY ni su margen como referencia para
otro cliente. Confirmado el 2026-10-11: una persona vendida por dedicación (`talent-assurance-staffing`) tiene piso
de 25 % y de ahí sube según el caso; los objetivos por tier (30 %, 35 % y 40 %) los propuso el agente y el CEO los
confirmó. Confirmado el mismo día: los servicios gestionados de la práctica SEO/AEO llevan su propia oferta
(`seo-aeo-managed-service`), con el piso de 45 % que el CEO aprobó el 2026-07-13 y objetivo 55 %, el extremo bajo de
su banda 55–60 %, propuesto por el agente y confirmado por él.
Confirmado el 2026-10-11: el precio sigue al país del cliente, el costo al país de la persona y, en los
mercados con factor bajo 1, el piso acompaña al factor; el piso de la oferta (45 % o 25 %) sigue rigiendo en el
mercado base. Declarar `floorBasis` en otro mercado, o cambiar un factor, es decisión del operador.
También del 2026-10-11: la forma del compromiso como dato propio con un registro por forma la eligió el CEO, y el
10 % de On-Demand lo mantuvo el agente por encargo suyo; las dos provisiones de puesta en marcha las propuso el
agente y el CEO las aceptó como estimaciones por medir; Adobe se cotiza como se factura, en CLP y con IVA, por
decisión del CEO; los cuatro perfiles de contenido que usan Adobe Express los confirmó él; y los plazos por los que
se paga una licencia de Adobe, Microsoft 365 y Notion los declaró él, lo mismo que cotizar Creative Cloud Pro sin
descuento. Una forma nueva, otra razón, otro monto de
puesta en marcha u otro plazo son decisión del operador y entran por una versión del catálogo o de la policy.
Por la noche del 2026-10-11: el CEO cerró los factores de país («deja eso cerrado ya»), confirmados desde el
2026-10-12; las reglas de precio de los costos de terceros (10 % con piso de 5 % en producción, talento e impresión;
al costo en medios y licencias) y la reserva de contingencia de 12 % las propuso el agente y él las aceptó
(«seguiré tu recomendación») como estimaciones por ajustar con el primer trabajo real; y dijo que HubSpot no hace
falta hoy en las cotizaciones. Otra tasa, otra categoría u otra reserva son decisión suya y entran por una versión
del catálogo.

Abierto, registrado en el [ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json): la
revisión del FX de cotización cuando el mercado se mueva más allá de su margen, más el FX de CLF y el de EUR —el
EUR→USD `1.20` del v6 es un estimado sin decisión explícita, y no hay USD→EUR— (`QUOTE_FX_REVIEW`); los múltiplos
de redondeo para otras monedas o para una oferta que deba redondear distinto (`COMMERCIAL_ROUNDING_SCOPE`); el costo
específico de un perfil en un país donde se aparte del costo de Chile por su factor (`LOCALIZED_TALENT_COSTS`; la
base de costo quedó decidida: costo objetivo, no nómina); la revisión de cada precio unitario de herramienta en su
fecha (`UNIT_PRICE_REVIEW`); y el ajuste de las tasas de terceros y de la reserva con el primer trabajo real que las
use (`THIRD_PARTY_AND_CONTINGENCY`). El alcance del piso (`MARGIN_FLOOR_SCOPE`) y los factores de país
(`COUNTRY_FACTORS_UNVALIDATED`) quedaron decididos: no deben nada.
Tampoco se decidió, a propósito, redondear sobre el total del periodo en vez de por fila ni redondear a
terminaciones comerciales como 990.000 (un precio así se registra como neto acordado), ni factores por tipo de
cliente (también neto acordado) ni factores de talento por perfil o seniority (se expresan como costo específico).
Sin modelar todavía, y se dice cuando el pedido lo toca: si un asiento se compra para el trabajo, el plazo de las herramientas que no lo declaran, la fecha en que
se renueva un contrato que no la declara, los periodos menores a un mes, una cotización en EUR, las formas Híbrido y
Licencia/Consultoría y una vista de las lecturas internas lista para el cliente; y, de los costos de terceros y la
reserva, lo que lista
[Lo que todavía no está modelado](#lo-que-todavía-no-está-modelado).
No resolver nada de esto por cuenta propia en una cotización.
Nota 2026-10-11 (cierre): la duración del contrato salió de esa lista. No está «sin modelar todavía»: el CEO decidió
que, igual que la fecha de inicio del servicio, queda fuera del cotizador, porque una cotización no es un contrato.
Una cotización sigue teniendo periodos, no un plazo.
Nota 2026-10-11 (noche): desde `compose document` el cliente sí tiene un documento propio, con las líneas de la
cotización y, si se pide, su calendario de pagos. Sigue sin existir una versión para el cliente del reparto en
persona y kit, de la lectura de caja y de los compromisos; lo que falta del documento está en
[Lo que el documento todavía no hace](#lo-que-el-documento-todavía-no-hace).
Nota 2026-10-11 (última): después de tres negocios reales más, la lista de lo abierto y de lo no modelado queda así.
**Abierto y del CEO, sin decidir:** si el fee de plataforma (USD 49 al mes por persona de cada línea, entero cualquiera sea la
dedicación) debe prorratearse por dedicación (`PLATFORM_FEE_PER_LINE` en el ledger). No se presenta como decidido en
ningún sentido ni se prorratea a mano. **Sin modelar, y se dice cuando el negocio lo toca:** una oferta propia para
proyectos únicos (`PROJECT_OFFER_NOT_MODELLED`); un costo de puesta en marcha para un servicio gestionado
(`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`); el costo medido detrás de las provisiones «TEST ONLY» de los kits de una
persona por dedicación (`ASSURANCE_OPERATIONS_ONBOARDING_COSTS`); las herramientas cuyo precio vigente no tiene
importe; el precio techo del comprador y la lógica de puntaje de una licitación; el costo financiero de un pago
tardío; el panel de Greenhouse e Insights como recursos con costo; y número de cotización, versiones, QR, firmas y
aprobación, que son del cotizador de Greenhouse (adoptarlos es el paso siguiente acordado, sin empezar).
**Cerrado ese día:** un precio por todo el trabajo (`agreed_total`), la unidad comercial de cada oferta como dato
del catálogo, la evidencia de la dedicación y el documento de un precio de programa o de proyecto (`combine`).

## Presentar el precio en fee de la persona y kit de herramientas

Sirve cuando se vende una persona por dedicación y conviene mostrar las herramientas como un ítem propio: el cliente
compara el fee de la persona con una contratación y ve aparte lo que cuestan Adobe o las herramientas de IA. Es una
**presentación** de una cotización ya calculada: el total no cambia y no se recalcula nada.

```bash
pnpm --silent pricing:v3 compose split --input data/pricing/v3-operating/designer-on-demand.artifact.json \
  --tools adobe,higgsfield,magnific
```

- `--tools` es obligatorio. Qué herramientas se muestran aparte lo decide el operador; el cotizador no lo adivina.
  `all` separa todas las que la cotización atribuye. Recomendación vigente: dejar dentro del fee lo básico de trabajo
  (Notion, Microsoft 365) y mostrar aparte las especializadas y de IA.
- `--label "…"` cambia el nombre del kit (por defecto «Kit de herramientas»). `--out` guarda el JSON.
- Sale con código 3, como `compose assess`: es una lectura para revisar, no una cotización emitida. El artefacto se
  verifica antes de leerlo; uno alterado se rechaza con `REPLAY_MISMATCH`.

Cómo leer la salida (`pricing-v3-price-split/1`):

- En cada fila y periodo, `tools.net + person.net` es exactamente el neto de la fila. `totals` trae las dos sumas.
- **Kit:** el precio que la política ya le había dado a esas herramientas, con el mismo descuento o ajuste de la
  fila, subido al múltiplo de redondeo de la moneda. **Persona:** el resto de la fila: la persona, la plataforma,
  las provisiones, las herramientas que no se separaron y el redondeo de la fila.
- El factor de mercado por país queda entero en la persona: el motor sólo lo aplica al componente humano.
- Con la forma del compromiso declarada (contrato 1.3.0), el kit lleva la razón de la forma como cualquier
  componente: cada parte carga su propia porción del recargo.
- En una cotización con costos de terceros (contrato 1.4.0) hay una tercera parte, `thirdParty`, y la suma es
  `tools.net + person.net + thirdParty.net`. La reserva de contingencia queda dentro de la persona
  ([ejemplo](#en-cada-lectura-del-artefacto)).
- `person.belowFloor` y `partsBelowFloorWhileRowMeetsIt` avisan cuando una parte queda bajo el piso aunque la fila
  lo cumpla. Pasa sobre todo cuando objetivo y piso son iguales y el kit se redondea hacia arriba. Importa si el
  cliente puede quitar el kit: lo que queda es esa parte de persona. Se informa al operador; no se corrige a mano.
- La salida trae costos y márgenes: es interna. No se entrega al cliente tal cual.

Ejemplo verificado, el del comando de arriba (diseñador senior dedicado en Chile, On-Demand, CLP, un periodo, una de
las tres licencias de Adobe, con las cifras del artefacto congelado: Adobe con descuento): fila mensual 2.470.000 =
persona 2.280.000 + kit 190.000 (Adobe, Higgsfield y Magnific); la puesta en marcha (320.000) queda entera en la
persona. En total, persona 2.600.000 + kit 190.000 = 2.790.000, con margen 36,5 % y 37,5 %; ninguna parte bajo el piso de 25 %. Devuelve exit 3.

## Tres lecturas de una cotización

**Para qué sirven.** Responder tres preguntas sobre una cotización ya congelada sin tocarla: cuándo se cobra, qué
caja mueve y qué queda comprometido con proveedores cuando termina. Como `compose split`, las tres leen un artefacto
de composición, lo verifican con `replay` antes de leerlo (uno alterado se rechaza con `REPLAY_MISMATCH`), no
recalculan ni cambian nada, no reciben `--current` y aceptan `--out` para guardar el JSON en una ruta nueva. Sirven
sobre todo en un trabajo acotado (On-Demand). Lo que cada una agrega cuando la cotización trae costos de terceros o
reserva de contingencia está en [Cómo leer una cotización con terceros](#en-cada-lectura-del-artefacto); el ejemplo
de esta sección no los tiene y sus salidas no cambiaron.

**Antes de empezar.** Tener el artefacto que escribió `compose quote --out`. Los ejemplos usan el de referencia,
`data/pricing/v3-operating/designer-on-demand.artifact.json` (neto CLP 2.790.000).

### Calendario de pagos (`compose schedule`)

**Qué entra.** El artefacto y un archivo de hitos: un arreglo JSON de `{ id, label, share }`, con `periodId` (un
periodo de la cotización) o `when` (texto libre: «a la aceptación») opcionales, nunca los dos. `share` es una cadena
decimal y las partes suman exactamente 1.

```bash
cat > /tmp/hitos.json <<'JSON'
[
  { "id": "anticipo", "label": "Anticipo al firmar", "share": "0.5", "when": "A la firma" },
  { "id": "entrega", "label": "Entrega de las piezas", "share": "0.3", "periodId": 1 },
  { "id": "cierre", "label": "Cierre y aceptación", "share": "0.2", "when": "A la aceptación" }
]
JSON

pnpm --silent pricing:v3 compose schedule --input data/pricing/v3-operating/designer-on-demand.artifact.json \
  --milestones /tmp/hitos.json
```

Devuelve exit 3 con `pricing-v3-payment-schedule/1`: 1.400.000, 840.000 y 550.000, que suman 2.790.000.

**Cómo leerlo.**

- `milestones[].amount`: la parte de cada hito, leída al múltiplo de redondeo con que se congeló la cotización (o a
  la unidad de la moneda si no tiene regla). El último hito (`takesRemainder: true`) recibe lo que queda del neto:
  aquí 550.000 y no 558.000, y `remainder.absorbed` (`-8000`) dice cuánto absorbió.
- `totals.net` es el neto de la cotización: los montos suman exactamente eso.
- `tax` y `total` vienen sólo si la cotización resolvió impuestos; si no, `null`. Aquí no se supone ninguna tasa.
  Con el impuesto resuelto, cada hito trae su parte del impuesto congelado y su total, y las partes suman el
  impuesto y el total de la cotización: sobre `designer-three-months-iva.artifact.json` (neto 7.970.000, IVA
  1.514.300), los mismos tres hitos son 3.990.000 + 758.100 = 4.748.100, 2.390.000 + 454.100 = 2.844.100 y
  1.590.000 + 302.100 = 1.892.100.

**Lo que declara de sí mismo.** Es un calendario: dice cuándo vence un monto. **No es una factura ni un monto
cobrado, y no es un precio nuevo.** `periodId` y `when` son lo que declaró quien llamó: nada comprueba una fecha, una
aceptación ni un pago.

**Cuándo correrlo.** Cuando el operador quiere proponer hitos de pago para un trabajo acotado. Los porcentajes los
decide él.

**Si el archivo de hitos no sirve:** exit 1, `SCHEDULE_MILESTONES_INVALID` con `option: "milestones"` e `issues`:

| `rule`                                                                    | Qué corregir                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `empty`, `too_many`                                                       | El archivo es un arreglo con al menos un hito y a lo más 60                        |
| `shares_must_sum_to_one`                                                  | Las partes suman exactamente 1                                                     |
| `share_not_decimal`, `share_not_positive`, `share_above_one`              | `share` es una cadena decimal (`"0.5"`, no `0.5`), mayor que 0 y no mayor que 1    |
| `not_an_object`, `duplicate_id`, `invalid_id`, `invalid_label`, `unknown_field` | Cada hito es un objeto con un `id` distinto, `label` de una línea y sólo los campos admitidos |
| `unknown_period`, `invalid_when`, `period_and_when`                       | `periodId` es un periodo de la cotización; `when`, un texto de una línea; no van juntos |
| `amount_not_representable`                                                | Una parte tan chica que, al múltiplo de la moneda, deja un hito sin monto: cambiarla |

Sin `--milestones` el rechazo es `MISSING_ARGUMENT`; sobre una cotización bloqueada,
`SCHEDULE_REQUIRES_CALCULATED_QUOTE`.

### Lectura de caja (`compose cash`)

```bash
pnpm --silent pricing:v3 compose cash --input data/pricing/v3-operating/designer-on-demand.artifact.json
```

Devuelve exit 3 con `pricing-v3-engagement-cash/1`.

**Cómo leerlo.**

| Parte                                        | Qué dice                                                                                                                  | En el ejemplo                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `totals.net`, `fullCost`, `marginAtFullCost` | Neto, costo completo atribuido y margen, **leídos** de la cotización, no recalculados                                     | 2.790.000, 1.768.438 y 1.021.562 (`0.366151`) |
| `fullCostByNature`                           | El costo por naturaleza: `people`, `provisions`, `platformFee`, `setup`, `toolCreditBudgets` y `toolSeatsAndPackages`; suman `fullCost`. En una cotización 1.4.0 se agregan `thirdParty` y `contingencyReserve` | —                             |
| `newSupplierCash`                            | La caja **nueva** que la cotización hace pagar a proveedores: los packs extra de créditos declarados y, en una cotización 1.4.0, el costo de cada tercero refacturado | 43.770                        |
| `cashAddedOnContractedCapacity`              | `net − newSupplierCash`: la caja que el trabajo suma una vez cobrado, **si** las personas son capacidad ya contratada     | 2.746.230                     |
| `results.marginAtFullCost`                   | El margen sobre el costo completo, con `decides: "viability"` y las filas bajo el piso                                    | Ninguna fila bajo el piso     |
| `restsOn`, `notDerivable`                    | Los supuestos de esa cifra y lo que el artefacto no permite saber                                                         | Ver abajo                     |

**Lo que declara de sí mismo.** `cashAddedOnContractedCapacity` trae `isMargin: false` y `decidesPrice: false`.
Descansa en tres supuestos (`restsOn`): que cada persona del trabajo es capacidad que la empresa ya paga, con o sin
este trabajo; que las provisiones son reservas y no compras; y que no se compra ningún asiento, paquete, fee de
plataforma ni recurso de puesta en marcha para el trabajo. `notDerivable` dice lo que no se puede leer: si un asiento
ya existe o hay que comprarlo (uno comprado para el trabajo se paga a su precio completo, no a su parte atribuida),
si el fee de plataforma o la puesta en marcha se pagan a un tercero, y nada de lo cobrado: una cotización no tiene
facturas ni pagos.

**Cuándo correrla.** Cuando el operador pregunta cuánta caja deja un trabajo acotado que se hace con el equipo que
ya está. El margen que decide si el trabajo es viable sigue siendo el del costo completo.

Sobre una cotización bloqueada rechaza con `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE`.

### Compromisos con proveedores (`compose commitments`)

```bash
pnpm --silent pricing:v3 compose commitments --input data/pricing/v3-operating/designer-on-demand.artifact.json
```

Devuelve exit 3 con `pricing-v3-commitment-exposure/1` (exit 2, con `calculationStatus` `needs_input`, si la
cotización no está calculada; no es un rechazo).

**Qué informa.** Lo que la cotización deja comprometido con proveedores después de su último periodo cotizado, de
tres clases:

- herramientas con precio **por año** (`annual_price`): el año se compromete al abrir el plazo y la cotización cubre
  un doceavo por periodo;
- herramientas con precio mensual que **declaran un plazo** (`termed_monthly_price`, `commitmentTermMonths` mayor que
  los periodos cotizados que la usan): se factura mes a mes y nada se paga por adelantado, pero los meses restantes
  quedan comprometidos;
- **créditos de IA** que sobran de un pack, con su vencimiento.

Desde el 2026-10-11 informa además una cuarta clase, la única que está **dentro** de los periodos cotizados:

- **asientos pagados que nadie usa** (`idle_seat`): los que la demanda declara ociosos con `idleSeats`. Por
  herramienta y plan trae los periodos, `seats.byPeriod` (pagados y ociosos en cada uno), `seats.idleSeatMonths`
  (un asiento ocioso en un mes cuenta uno), los motivos declarados, `committed` (su costo) y `coveredByUse`, que es
  siempre cero. `carriedBy` dice quién lo carga: las líneas que usan la herramienta o las que la demanda nombró. La
  señal es `PAID_SEAT_IDLE_WITHIN_ENGAGEMENT` y el total, `totals.idleSeats`. **Ese costo ya está dentro del costo de
  la cotización: no es un monto para sumarle.** La lectura no sabe si el asiento ya existe o hay que comprarlo, ni
  si el proveedor deja soltarlo, pausarlo o dárselo a otra persona. Una cotización sin asientos ociosos no trae nada
  de esto.

**Cómo leerlo.** Por cada compromiso: `committed` (lo comprometido), `attributedWithinPeriods` (lo que la cotización
cubre), `unrecovered` (lo que queda) y `sharing`, que decide a dónde va ese resto:

- `sharing.basis` `sole_declared_user` (la cotización declara ser el único usuario): el resto sale en
  `strandedIfNothingElseUsesIt`, lo que queda varado si nada más lo usa. La señal es
  `COMMITMENT_OUTLIVES_ENGAGEMENT`.
- `sharing.basis` `shared_declared_capacity` (la demanda declara una parte de una capacidad compartida, como una de
  las tres licencias de Adobe): el resto sale en `releasedToSharedCapacity`; vuelve al paquete compartido y no queda
  varado porque esta cotización termine. La señal es `SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT`.
- `shorterCommitmentPrices` y la señal `SHORTER_COMMITMENT_PRICE_IN_POLICY`: precios de la misma herramienta que la
  policy ofrece con menos compromiso, y cuánto más costarían en los periodos cotizados. La policy no dice que sean el
  mismo plan.
- `notDerivable` (raíz): `CONTRACT_TERM_NOT_FROZEN` lista las herramientas mensuales cuyo precio no declara plazo;
  `CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN`, las suscripciones de créditos.
- **Cuando el precio declara la fecha de renovación**, la entrada trae `commitment.termStartKnown`, `renewsOn`,
  `boundUntil` y `renewsWithinQuotedPeriods`. `boundUntil` es hasta cuándo queda atada la licencia: la primera
  renovación estrictamente posterior al último día del último mes calendario cotizado que usa el precio (una fecha
  declarada que ya pasó avanza a la siguiente de la serie). Lo que queda son los meses calendario posteriores a ese
  periodo que empiezan antes de `boundUntil`, y `committed` es lo cubierto más esos meses, no un plazo entero. Si
  los periodos cotizados cruzan una renovación, la licencia queda atada hasta la **siguiente** y se suma la señal
  `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`, con el mismo importe (no se suma al del compromiso): en la renovación se
  puede cambiar el número de licencias, pero sólo de las que ya no se necesitan. El `notDerivable` de la entrada
  lleva `commitment.exitTerms` en vez de `commitment.termStart`.
- Un plazo de `1` nunca produce una entrada ni `CONTRACT_RENEWAL_NOT_DECLARED`, con fecha o sin ella.

Con los plazos de hoy: una licencia de Adobe se sigue cobrando hasta que el contrato se renueva, así que aparece en
la lectura de un trabajo corto; una de Microsoft 365 o de Notion se suelta al quitar el asiento (plazo de un mes) y
no aparece. En el ejemplo de referencia aparece sólo Adobe, como capacidad compartida.

**La lectura depende de la policy que congeló el artefacto.** `designer-on-demand.artifact.json` congeló la policy
v7, donde Notion y Microsoft 365 no declaraban plazo y Adobe no declaraba fecha de renovación: su lectura los lista
en `CONTRACT_TERM_NOT_FROZEN` y lee Adobe como un plazo entero, sin `boundUntil`; esos montos son un techo. La misma
demanda vuelta a cotizar con `--current` (policy v10, medido el 2026-10-11) ya no los lista y lee Adobe contra su
renovación: **un mes** después del cotizado, CLP 108.468, en `releasedToSharedCapacity` (una licencia de tres),
`boundUntil` 2026-11-16, señal `SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT`. Al citar una lectura, decir de qué artefacto
es.

**Los límites que declara.**

- No distingue un trabajo de un mes de un mes representativo de un servicio continuo: conoce los periodos cotizados,
  no la duración del contrato. Leído contra un acuerdo más largo, un compromiso de esta lista puede no sobrevivir a
  nada. Por eso es un comando que se corre para trabajos acotados, no un aviso automático.
- **Sin fecha de renovación, supone un plazo entero desde el primer mes cotizado.** Un contrato que ya corre obliga
  por menos, así que los montos de un precio con plazo y sin `commitmentRenewsOn` son un techo, no una cifra para
  presentar. Hoy sólo los precios de Adobe declaran la fecha.
- **Con fecha, un mes cubierto en parte cuenta entero**: la lectura puede pasarse hasta por un mes. Y no sabe qué
  cuesta salir antes de la renovación ni si el contrato se renueva (`commitment.exitTerms`).
- Los precios por año (`unit: 'year'`) ignoran el plazo y la fecha: se siguen leyendo como un año desde el periodo
  que abre.
- No sabe si el asiento ya existe o hay que contratarlo (`incrementalCash` en `null`), ni quién tiene las otras
  licencias de un paquete.
- Informa; no recomienda ni aplica nada. Si un compromiso es aceptable lo decide el operador.

**Cuándo correrla.** Antes de presentar un trabajo acotado que usa herramientas con precio anual o con plazo
declarado, para llevarle al operador qué queda comprometido y si es capacidad compartida o varada.

### Qué no hacer con las tres lecturas

- No presentar el calendario como factura, cobro ni precio nuevo.
- No usar `cashAddedOnContractedCapacity` como margen ni para decidir o defender un precio: el precio sale del costo
  completo y del piso de la oferta. No quitarle sus supuestos al informarla.
- No decidir por el operador qué compromiso es aceptable, ni cambiar un plan o un `priceId` porque la lectura muestre
  uno con menos compromiso.
- No leer la falta de un compromiso como «no hay contrato»: puede ser un plazo que nadie declaró.
- No entregar ninguna de las tres al cliente tal cual: traen costos y márgenes.

## Producir el documento de cotización

**Para qué sirve.** Convertir una cotización ya congelada en el documento que lee el cliente: un PDF A4 con portada,
alcance, precio y condiciones. `compose document` emite los datos del documento y la
[plantilla A4 de cotización](../../commercial/templates/cotizacion-a4/README.md) los convierte en HTML y PDF. Como
`compose split` y las tres lecturas, lee un artefacto de composición, lo verifica con `replay` antes de leerlo (uno
alterado se rechaza con `REPLAY_MISMATCH`), no recalcula ni cambia nada y no recibe `--current`. A diferencia de
ellas, lo que produce no trae costos, márgenes, tarifas, proveedores ni identificadores internos: es la única salida
de este manual pensada para entregarse a un cliente.

**La regla que ordena todo.** Las cifras salen de la cotización; los textos, del brief del documento. El brief no
tiene dónde escribir un importe, una moneda, una tasa de impuesto ni una fecha, y si trae uno se rechaza. Cuando una
cifra del documento no es la que se quiere, se cambia la cotización y se vuelve a emitir.

**Por qué la plantilla A4.** El CEO decidió el 2026-10-11 que el documento para el cliente de una cotización V3 es
esta plantilla y no el PDF del cotizador de Greenhouse
([decisión](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--el-documento-de-cotización-de-una-cotización-v3-compose-document)).
Que ese cotizador adopte más adelante este diseño es la dirección acordada; todavía no empieza.

**Antes de empezar.**

- El artefacto que escribió `compose quote --out`, con la cotización calculada. Los ejemplos usan
  `data/pricing/v3-operating/designer-three-months-iva.artifact.json`: un diseñador por tres meses, neto CLP
  7.970.000, con un IVA de 19 % declarado sólo para el ejemplo.
- La cotización ya revisada: `compose assess`, pisos, avisos de la corrida. El documento no revisa nada de eso, y
  una excepción la decide el operador (CEO).
- Los textos: quién emite, para quién, alcance, calendario del trabajo y condiciones. Los datos del oferente y del
  comprador se confirman antes de escribirlos, como indica la
  [plantilla](../../commercial/templates/cotizacion-a4/README.md#datos-y-slots).
- Para generar el PDF: Node, Playwright con su Chromium y las dependencias de marca de este repo.

### Paso a paso

**1. Sacar el andamio del brief.**

```bash
artefacto=data/pricing/v3-operating/designer-three-months-iva.artifact.json

pnpm --silent pricing:v3 compose document --input "$artefacto" --out /tmp/documento-brief.json
```

Devuelve exit 2 —falta información, no es un error— e imprime `pricing-v3-quote-document-scaffold/1`. `--out` guarda
sólo el brief, listo para editar. Qué leer en stdout:

- `quote`: fecha, moneda, períodos, neto, impuesto y total de la cotización. Aquí: 2026-10-11, CLP, 3 períodos,
  7.970.000, 1.514.300 y 9.484.300. Son para quien escribe los textos; no se copian al brief.
- `lines[]`: cada línea como saldría sin cambios, con su `key`. Aquí `design` (3 meses a 2.550.000, que son
  7.650.000) y `design:setup` (1 pago único, 320.000).
- `clientPaidDirectly[]`: sólo si la cotización declara costos que el cliente paga directo.
- `waived[]`: sólo si la cotización bonifica por completo alguna línea; cada una con su valor de referencia.
- `options[]`: sólo si la corrida recibió `--option`; cada opción con su precio
  ([Agregar opciones y una cortesía](#agregar-opciones-y-una-cortesía)).
- `optional`: las claves optativas del brief y qué hace cada una.
- `brief`: el brief con cada texto vacío y cada línea bajo su clave, con el nombre y el grupo que tendría por
  defecto.

**2. Llenar el brief. Sólo textos.**

- Llenar **todos** los textos que el andamio trae vacíos: `reference`; `supplier` (`name`, `taxId`, `contact`,
  `email`, `phone`); `buyer` (`name`, `taxId`); `cover` (`label`, `title`, `subtitle`); `service.name`; `scope`
  (`title`, `intro`, `rows`); `schedule` (`title`, `phases`); `pricing` (`title`, `intro`, `summary`, `taxNote`) y
  `conditions` (`title`, `rows`). Un texto vacío se rechaza.
- **Tres textos son optativos y el andamio no les deja hueco** (desde el 2026-10-11): `buyer.unit` (el área del
  cliente a la que va el documento), `schedule.note` (una línea junto al título del calendario del trabajo) y
  `cover.netLabel` (el rótulo del neto en la portada). Se escriben sólo cuando dicen algo: no se repite el nombre
  del cliente como unidad ni se anota que el trabajo «empieza en la fecha acordada». Nunca se escribe quién define
  la fecha de inicio. Una clave presente es un texto no vacío.
- `scope.rows` admite de 1 a 7 filas; `schedule.phases`, de 1 a 3; `conditions.rows`, de 1 a 6. Un título es una
  línea o un arreglo de hasta tres líneas cortas. `schedule` es el calendario **del trabajo**; el de pagos es
  `paymentMilestones`.
- `lines` presenta cada línea por su clave, con `label`, `detail` y `group`, los tres optativos. El nombre por
  defecto viene de la cotización («Senior Visual Designer», «Implementación inicial»): cámbialo por el que debe leer
  el cliente. Una clave que no se nombra conserva su nombre y su grupo; una clave que la cotización no tiene es un
  error. Las claves nunca se imprimen.

  ```json
  "lines": {
    "design": { "label": "Diseñador visual sénior", "detail": "Dedicación completa" },
    "design:setup": { "label": "Puesta en marcha del servicio" }
  }
  ```

- Mientras el precio no esté aprobado, la portada y las condiciones lo dicen. Los ejemplos usan «Borrador · Sin
  validez comercial» en `cover.label`. **Si el precio lo fijó el propio CEO y aun así hay filas bajo su piso**, la
  leyenda no se quita por eso: un precio dictado dice cuánto se cobra, no que él vio qué filas quedan marcadas ni
  cuánto les falta. Se le muestran (`marginFloor.lines[]`, con `netShortOfFloor`) y la leyenda se mantiene hasta
  que apruebe el precio con esa información; se cambia por indicación suya. `status: "draft"` en los datos no
  cambia en ningún caso.
- **Lo que el documento no tiene como dato se escribe en `conditions.rows`** (de 1 a 6 filas): la vigencia de la
  oferta, la forma y el plazo de pago, y lo que el cliente debe aportar (accesos, lineamientos, aprobaciones, una
  herramienta propia). Ninguno de los tres sale de la cotización, y la fecha de inicio y la duración del contrato
  no van.
- Optativos, según `optional`: `paymentMilestones` y `paymentScheduleTexts` (calendario de pagos),
  `pricing.monthly` (`{ months, note }`: una cantidad de meses, no un importe), `pricing.taxLabel`, `buyer.logo`,
  `buyer.unit`, `schedule.note`, `cover.netLabel`, `combine` y `locale`. Desde el 2026-10-11, también `lines.<clave>.courtesy`, `options` y `optionsTexts`
  ([Agregar opciones y una cortesía](#agregar-opciones-y-una-cortesía)).

Las claves según el tipo de cotización:

| Cotización                                      | Claves                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| Servicio gestionado                             | `fee`, `setup` y `third_party:<costId>`               |
| Vendida por líneas (una persona por dedicación) | `<lineId>`, `<lineId>:setup` y `third_party:<costId>` |

**Cantidad y unidad de cada línea.** Sin hacer nada, cada clave es un concepto plegado por meses: «3 meses» al
valor de uno y el neto de los tres; un periodo solo es «1 mes»; un cobro único, «1 pago único» sin valor unitario; y
un concepto cuyo neto cambia durante el plazo sale en una línea por tramo. Para un precio por todo —un programa, un
proyecto— se usa `combine`, desde el 2026-10-11:

```json
"combine": [
  {
    "keys": ["fee"],
    "label": "Programa de atención en redes sociales",
    "detail": "Equipo, herramientas y continuidad de la atención",
    "unit": "programa"
  }
]
```

- Cada entrada imprime sus claves como **una** línea: cantidad 1 de `unit` («programa», «proyecto», «servicio»), sin
  valor unitario, y por neto la suma exacta que la cotización congeló para esas claves en todo el plazo.
- `keys`, `label` y `unit` son obligatorios; `detail` y `group`, optativos. Se admiten hasta 40 entradas.
- Una sola clave se puede combinar: un fee impreso como precio de programa en vez de meses.
- Una clave va en una sola combinación (`duplicate_key`) y entonces no lleva entrada en `lines`
  (`key_is_combined`). Una clave que la cotización no tiene es `unknown_key`; una que bonifica por completo no se
  combina (`key_not_charged`): una cortesía se imprime con su propia marca.
- Es presentación: las líneas suman el mismo neto con o sin `combine`, y el bloque no tiene dónde escribir un
  importe.
- La línea queda donde aparece la primera de sus claves y, sin `group`, en el grupo por defecto de la primera que
  lista el brief.
- **Úsalo cuando el precio se pactó con `agreed_total`**: su reparto deja el último mes distinto de los demás, y
  plegado por meses el documento imprimiría dos tramos («Meses 1 a 2», «Mes 3») de un precio que el cliente conoce
  como uno solo.

Con `combine` va casi siempre `cover.netLabel`: la portada imprime el neto de la cotización bajo el rótulo «Valor
neto del servicio completo», y `cover.netLabel` lo reemplaza por el que corresponde («Valor neto del programa»,
«Valor neto del proyecto»). En un servicio mensual que sigue después de los meses cotizados ese rótulo tampoco es
cierto: se nombra lo que la cifra es («Valor neto de los tres primeros meses»).

**3. Emitir los datos del documento.**

```bash
pnpm --silent pricing:v3 compose document --input "$artefacto" \
  --brief data/pricing/v3-operating/designer-three-months-iva.document-brief.json \
  --out /tmp/documento-datos.json
```

Devuelve exit 3: es el borrador de una cotización en revisión. Imprime y guarda los datos del documento (la versión
2 de los datos de la plantilla). Con este ejemplo: dos líneas que suman 7.970.000, `vatRate` `0.19`, `taxAmount`
`1514300`, el impuesto que la cotización congeló, y `taxPeriods` `3`, los periodos sobre los que el kernel redondeó
ese impuesto. El archivo es idéntico al versionado
`designer-three-months-iva.document.json`. Con tu propio brief, usa la ruta del paso 1 ya llena.

**4. Generar el HTML y el PDF.**

```bash
node scripts/documents/render-cotizacion-a4.mjs --data /tmp/documento-datos.json --out /tmp/documento-v1
```

La carpeta de `--out` debe ser nueva o estar vacía. Quedan `cotizacion.html`, `cotizacion.pdf`, `datos.json`,
`manifest.json` y las capturas de revisión en `qa/` (`pagina-1.png`… y `mobile.png`). Con este ejemplo, exit 0 y
cuatro páginas. Si el contenido no cabe, falla con «Contenido fuera del A4», dice qué página y no deja nada escrito.

**5. Revisar las capturas y el PDF, página por página.**

- Portada: título completo, comprador, neto y total.
- Alcance y calendario del trabajo: sin textos de ejemplo ni frases cortadas.
- Precio: cada línea con su cantidad, su valor unitario y su neto; el subtotal; el impuesto y el total, o «Por
  confirmar»; y, si existen, el calendario de pagos y los costos que paga el cliente.
- Condiciones: vigencia y forma de pago.
- Las cifras impresas son las del resumen de la cotización. Si no coinciden, es un defecto de la herramienta: se
  reporta, no se corrige a mano.

Las capturas son del navegador y no reemplazan abrir el PDF. El manifiesto nace con la revisión visual y la del PDF
pendientes: qué mirar y cómo registrarlo está en la
[plantilla](../../commercial/templates/cotizacion-a4/README.md#uso-rápido).

**6. Entregar.** Como borrador, salvo que el operador haya aprobado el precio. Enviarlo, registrarlo en el CRM o
crear la cotización en Greenhouse son acciones aparte, con su propia autorización; este flujo no hace ninguna.

### Agregar opciones y una cortesía

Las dos cosas siguen la regla de todo el documento: la cifra sale de una cotización congelada, nunca de un texto.
El ejemplo versionado es `designer-startup-courtesy`: un diseñador sénior vendido por líneas durante tres meses,
On-Demand, con IVA de 19 % declarado sólo para el ejemplo, la puesta en marcha bonificada y dos opciones.

**Una opción adicional** es un servicio que el cliente puede contratar aparte y que el documento muestra con su
precio, fuera de la cotización.

Antes de cotizarla, mira de qué clase es. Si es **otra persona u otro trabajo** (un redactor, un mes de video), se
cotiza sola y se pasa con `--option`: son los pasos de aquí abajo. Si sólo **le suma dedicación o consumo a
personas que ya son líneas de la cotización base**, no se cotiza sola: se pasa con `--increment`, y los pasos están
en [Un adicional que amplía la base](#un-adicional-que-amplía-la-base-compose-increment).

1. **Cotiza la opción sola**, como cualquier cotización: su propia demanda, `compose quote --current --out`, su
   propia revisión. Queda un artefacto por opción.
2. **Comprueba que se puede mostrar como un solo importe.** El precio que se imprime es el neto de uno de sus
   periodos, así que la cotización de la opción tiene que estar calculada, estar en la moneda de la cotización base,
   tener el mismo neto en todos sus periodos y no declarar costos que el cliente paga directo. Una opción con puesta
   en marcha cobrada en el primer mes no cumple si tiene más de un periodo: o se cotiza por un solo periodo (la opción `motion` del ejemplo: un mes, con su puesta en
   marcha dentro), o su puesta en marcha se deja fuera con un ajuste declarado (la opción `copywriter`: tres meses
   iguales).
3. **Pásala al documento** con `--option <clave>=<artefacto>`, una vez por opción y hasta ocho. La clave la eliges
   tú (letras, dígitos, `_` y `-`) y es con la que el brief nombra la opción; nunca se imprime.
4. **Nómbrala en el brief.** `options` lleva una entrada por cada opción entregada, ni una más ni una menos:

   ```json
   "options": {
     "copywriter": { "label": "Redactor creativo", "unit": "al mes", "detail": "Dedicación completa." },
     "motion": { "label": "Edición de video y animación", "unit": "por mes de campaña" }
   },
   "optionsTexts": { "title": "Servicios opcionales", "note": "Cada opción se contrata por separado." }
   ```

   `label` y `unit` son obligatorios; `detail` y `optionsTexts` son optativos. No hay dónde escribir el precio.

**Una cortesía** es una línea que la cotización regala y que el documento muestra con su valor de referencia.

1. **Bonifícala en la cotización**, no en el documento: un ajuste explícito que deja esa fila en cero. En el ejemplo
   es un neto pactado de `0` sobre la puesta en marcha (`kind: "agreed_net"`, `amount: "0"`, `billing: "setup"`, con
   su `reason`). Regalarla es una decisión del operador: la fila queda marcada bajo su piso en el resumen.
2. **Mira el andamio.** Si la cotización bonifica una línea, `waived[]` la lista con su clave y su valor de
   referencia: el precio que tenía antes de la rebaja.
3. **Márcala en el brief** con `courtesy: true` en su clave, con el nombre y el detalle que quieras:

   ```json
   "design:setup": {
     "label": "Puesta en marcha del servicio",
     "detail": "Cortesía por el compromiso de tres meses",
     "courtesy": true
   }
   ```

   Sin la marca, la línea bonificada no imprime nada, y nombrarla en el brief sin marcarla es un error.

Emitir, con el ejemplo versionado:

```bash
base=data/pricing/v3-operating/designer-startup-courtesy

pnpm --silent pricing:v3 compose document --input "$base.artifact.json" \
  --brief "$base.document-brief.json" \
  --option copywriter="$base.option-copywriter.artifact.json" \
  --option motion="$base.option-motion.artifact.json" \
  --out /tmp/documento-con-opciones.json
```

Devuelve exit 3 y los datos son idénticos al versionado `designer-startup-courtesy.document.json`: una línea de 3
meses a 2.550.000 (7.650.000); la puesta en marcha con neto `0` y `referenceNet` `320000`; neto 7.650.000; IVA
1.453.500; y las dos opciones, 2.580.000 «al mes» y 3.570.000 «por mes de campaña». El total, 9.103.500, lo imprime
la plantilla con el neto y el impuesto. Generado, son cinco páginas. Los mismos `--option` sin `--brief` dan el
andamio, con `waived` y `options`.

Un límite que se dice cuando el pedido lo toca:

- **Un servicio gestionado no tiene una puesta en marcha que bonificar.** Su kit no carga puesta en marcha, así que
  la cotización no tiene esa fila: una «puesta en marcha bonificada» de un servicio gestionado es un texto de las
  condiciones, sin valor de referencia. No se le inventa uno.

Y uno que dejó de serlo el 2026-10-11 (cierre): el margen de una opción que sólo suma dedicación de una persona que
ya está en la cotización base. Cotizada sola con `--option`, esa opción es una línea nueva y vuelve a llevar el fee
de plataforma por línea y su parte de las herramientas base, así que su margen sale más bajo que el real. Ya no se
informa una cota inferior: ese adicional se pasa con `--increment` y su margen se lee con `compose increment`
([sección siguiente](#un-adicional-que-amplía-la-base-compose-increment)).

### Un adicional que amplía la base (`compose increment`)

**Para qué sirve.** Para saber cuánto cuesta y cuánto deja un adicional opcional que **amplía a personas que ya
están en la cotización base**, y para imprimirlo en el documento con el precio correcto. El adicional no se cotiza
solo: se cotiza el mismo servicio con el adicional adentro, y `compose increment` resta las dos cotizaciones
congeladas. Su neto, su costo y su margen son esa diferencia. Nada se recalcula y ningún total cambia.

**Por qué no cotizarlo solo.** Una cotización del adicional solo es una línea nueva. Si el adicional son unos puntos
más de una persona que ya es una línea de la base, esa línea nueva vuelve a llevar lo que se cobra una vez por
línea, cualquiera sea su dedicación: el fee de plataforma y su parte de las herramientas base. Su costo sale más
alto que el real y su margen, más bajo; a precio de policy, además, pide más de lo que el mismo adicional le sube al
precio del servicio. En la cotización del servicio con el adicional adentro la persona es una sola línea con la
dedicación sumada, y nada se cobra dos veces.

**Cuál usar.**

| El adicional                                                                 | Se pasa con   | Qué artefacto se entrega                              |
| ---------------------------------------------------------------------------- | ------------- | ----------------------------------------------------- |
| Más dedicación o más consumo de personas que ya son líneas de la base        | `--increment` | La cotización del servicio **con el adicional adentro** |
| Mixto: amplía a personas de la base y además trae una persona nueva          | `--increment` | La misma: la persona nueva entra como una línea nueva de esa cotización |
| Sólo una persona nueva o un trabajo aparte (un redactor, un mes de video)    | `--option`    | La cotización del adicional **solo**                  |

La cotización con el adicional puede traer líneas nuevas además de más dedicación en las que ya existían: lo que no
puede es perder o cambiar algo de la base. `changed.lines` de la lectura dice qué encontró en cada línea:
`dedication_grew` (una línea de la base con más personas o más dedicación) o `added` (una línea que la base no
tiene).

**Antes de empezar.**

- El artefacto de la cotización base, calculado. Una cotización bloqueada no sirve.
- El precio del adicional lo decide el operador. Si está pactado, se declara en la cotización con el adicional, no
  en el brief ni en un texto.
- Las dos cotizaciones se hacen con las mismas versiones (`--current` el mismo día) y la misma `quoteDate`.

**Paso a paso.** El ejemplo versionado es `managed-addon-increment`: un servicio gestionado de tres meses con un fee
pactado de 5.650.000 al mes, y un adicional de ocho puntos más de dedicación de su líder (de `0.2` a `0.28`),
pactado en 300.000 al mes. Importes en CLP; el comprador es inventado.

1. **Copia la demanda de la base** a una ruta nueva. Un archivo versionado no se edita.
2. **Agrega el adicional en las mismas líneas.** La dedicación que se le suma a una persona que ya es una línea de
   la base no va en una línea nueva: sube la dedicación (o las personas) de esa línea, con su mismo `lineId`. Todo lo
   demás de la línea queda igual: perfil y seniority, país, modo de asignación, unidad de la dedicación, kit con sus
   elecciones, y las policies y el registro de costo que la línea nombre. En el ejemplo, `dedication.value` de la
   línea `lead` pasa de `0.2` a `0.28`. Si el adicional trae además a alguien que no está en la base, esa persona sí
   es una línea nueva.
3. **Ajusta lo que depende de esa dedicación.** Si una herramienta se reparte por la dedicación declarada, su
   asignación sube con ella: en el ejemplo, Notion y Microsoft 365 pasan de `allocatedUnits` `1.3` a `1.38` (y
   `serviceShare`, de `0.4333…` a `0.46`). No quites ninguna herramienta ni ningún costo de terceros de la base.
4. **Escribe el precio del adicional donde la cotización escribe sus precios.** Si la base tiene un neto pactado, el
   de la cotización con el adicional es ese neto más el precio pactado del adicional: en el ejemplo, el
   `agreed_net` mensual pasa de `5650000` a `5950000`, con su `reason`. Sin precio pactado, se deja que la policy
   lo calcule y el incremento de neto es lo que resulte.
5. **Deja igual todo lo demás**: moneda, oferta, cuenta, impuesto, forma del compromiso, `engagementCode`, país de
   mercado, `quoteDate`, modo y contingencia; y los mismos periodos que la base.
6. **Cotiza** con `compose quote --current --input <demanda> --out <artefacto nuevo>` y revisa el resumen como el de
   cualquier cotización.
7. **Lee el incremento:**

   ```bash
   base=data/pricing/v3-operating/managed-addon-increment

   pnpm --silent pricing:v3 compose increment \
     --input "$base.with-addon.artifact.json" \
     --base "$base.artifact.json" \
     --out /tmp/incremento.json
   ```

   Devuelve exit 3 y una lectura idéntica a la versionada `managed-addon-increment.increment.json`. `--input` es
   siempre la cotización **con** el adicional y `--base`, la base. No recibe `--current`: los dos artefactos traen
   sus fuentes dentro, y los dos se verifican por replay.

8. **Imprímelo en el documento**, si va al cliente. La cotización del documento es la base; el adicional entra como
   una opción:

   ```bash
   pnpm --silent pricing:v3 compose document --input "$base.artifact.json" \
     --brief "$base.document-brief.json" \
     --increment conversations="$base.with-addon.artifact.json" \
     --out /tmp/documento-con-incremento.json
   ```

   Devuelve exit 3 y datos idénticos a `managed-addon-increment.document.json`: una línea de fee, 3 meses a
   5.650.000 (16.950.000); IVA 3.220.500; y una opción de 300.000 «al mes». El brief la nombra en `options` igual
   que a cualquier opción (clave `conversations`, con `label` y `unit`). Sin `--brief`, el andamio la lista en
   `options[]` con `basis: "increment"`. Generado con la plantilla, son cuatro páginas.

**Cómo se lee la lectura.** Es `pricing-v3-quote-increment/1`, con `audience: "internal"`.

| Clave                          | Qué mirar                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `periods[].increment`          | Neto, costo, margen en importe y tasa de margen del adicional en ese periodo. Al lado, `base` y `withAddOn`: las mismas cifras de cada cotización                        |
| `totals.increment`             | Lo mismo sumado sobre los periodos comparados                                                                                                                          |
| `netIncrementPerPeriod`        | Lo que el adicional le suma al neto de un periodo. Es la cifra que imprime el documento. `null` si no suma lo mismo en todos: entonces el documento no la puede imprimir |
| `totals.costByComponentKind`   | Dónde está el costo del adicional. Si el adicional no trae líneas nuevas, una clase que se cobra una vez por línea (el fee de plataforma) tiene incremento cero |
| `changed`                      | De qué está hecho: líneas nuevas o con más dedicación, herramientas cuyo costo se movió y costos de terceros que agrega. Si aparece algo que no esperabas, revisa la demanda |
| `comparison.mode`              | `same_periods` (cada periodo con el suyo) o `representative_period` (un periodo que vale por todos los de la base)                                                      |
| `versions`, `base`, `withAddOn` | Con qué fuentes y de qué dos cotizaciones sale la lectura. Al citarla, di de qué artefactos es                                                                         |

En el ejemplo, por mes:

| Lectura                                       | Neto    | Costo   | Margen  |
| --------------------------------------------- | ------- | ------- | ------- |
| El adicional como incremento                  | 300.000 | 155.096 | 48,30 % |
| El mismo adicional cotizado solo (`.option-standalone`) | 300.000 | 204.096 | 31,97 % |

Los 49.000 de diferencia son el fee de plataforma que la cotización suelta vuelve a llevar por ser una línea nueva.
En `costByComponentKind` el fee de plataforma tiene incremento cero, y el costo del adicional está en las personas y
en las dos herramientas que se reparten por dedicación. El documento imprime 300.000 «al mes» con cualquiera de las
dos formas; lo que cambia es el costo y el margen con que el operador decide.

**Un periodo representativo.** La cotización con el adicional puede tener un solo periodo aunque la base tenga
varios, y entonces vale por todos (`representative_period`). Sólo se acepta si la base es igual en todos sus
periodos (neto, costo y líneas) y ese periodo no cobra nada una sola vez. El incremento que devuelve es el de un
periodo: la lectura no lo multiplica, porque ningún dato dice en cuántos periodos corre el adicional. Una base cuyo
costo cambia de un mes a otro (una persona activa sólo algunos meses) no lo admite: cotiza el servicio con el
adicional sobre los mismos periodos de la base.

**Al informar.** Entrega el margen del incremento, no el de una cotización suelta del mismo adicional, y di de qué
dos artefactos sale. La lectura es interna: trae costo y margen y no va al cliente. No aprueba el adicional ni su
precio: eso lo decide el operador.

### Si las dos cotizaciones no se pueden restar

Dos cotizaciones se restan sólo cuando la diferencia puede significar el adicional y nada más. Si no, la corrida
sale con exit 1 y el código de la regla que falló; nunca devuelve una cifra aproximada. `issues` trae `path` y
`rule`. En `compose document --increment`, el código es el mismo, `option` es `increment` y cada ruta lleva delante
`options.<n>.`, la posición de esa opción en la corrida.

| Código                                       | Qué pasó                                                                                                                                                         | Qué hacer                                                                                                                                                      |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES` | Una de las dos cotizaciones está bloqueada (`not_calculated` en `base` o en `withAddOn`)                                                                         | Resolver los `diagnostics` de esa demanda y volver a cotizarla                                                                                                 |
| `QUOTE_INCREMENT_CONTEXT_DIFFERS`            | No cotizan lo mismo bajo los mismos términos: difieren en moneda, oferta, cuenta, impuesto, forma del compromiso, unidad comercial, `engagementCode`, país de mercado, `quoteDate`, modo o contingencia | La regla dice en qué (`quote_date_differs`, `offer_differs`…). Corregir la demanda con el adicional para que copie ese dato de la base, y volver a cotizar      |
| `QUOTE_INCREMENT_VERSIONS_DIFFER`            | Se congelaron con otro catálogo, otra policy u otro catálogo de créditos (`version_differs`), o con la misma versión y otro contenido (`content_differs`)        | Volver a cotizar las dos con las mismas fuentes. Una diferencia entre versiones metería un cambio de precio dentro del costo del adicional                      |
| `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`     | Los periodos no calzan (`periods_differ`); o se usó un periodo representativo sobre una base que no es igual en todos sus periodos (neto, costo o líneas); o ese periodo cobra algo una sola vez, como una puesta en marcha (`one_off_in_representative_period`); o en alguna de las dos cotizaciones los periodos no suman sus totales | Cotizar el servicio con el adicional sobre los mismos periodos de la base                                                                                      |
| `QUOTE_INCREMENT_BASE_NOT_CONTAINED`         | La cotización con el adicional no contiene a la base: falta una línea (`line_missing`); cambió su perfil, su país o su modo de asignación; cambió su base de precio o de costo: policy de asignación, policy de precio, kit, registro de costo o equipo (`basis_differs`); perdió una elección de kit (`choice_missing`); cambió la unidad de su dedicación (`dedication_unit_differs`); tiene menos personas o menos dedicación (`dedication_smaller`); o falta un costo de terceros o una herramienta de la base | Lo usual: se pasaron los artefactos al revés, o se pasó la cotización del adicional solo. Armar la cotización con el adicional a partir de la demanda de la base |
| `QUOTE_INCREMENT_NET_NOT_POSITIVE`           | En algún periodo comparado la cotización con el adicional no vale más que la base                                                                                | Revisar el precio del adicional en esa cotización. Si se pasó la base en los dos lados, corregir la ruta                                                        |

`QUOTE_DOCUMENT_OPTION_INVALID` queda sólo para las reglas propias del documento sobre un incremento que ya es
comparable, con `option: "increment"`: `net_differs_between_periods` (el adicional no suma lo mismo en cada periodo
comparado, así que no hay un solo importe que imprimir), `client_pays_costs_directly` (el adicional trae un costo que
el cliente paga directo y que la base no tiene), `amount_not_representable`, `duplicate_option` (la misma cotización
con el adicional dos veces) y `too_many` (más de ocho opciones entre `--option` y `--increment`). Un `--increment`
mal escrito, o con una clave que ya usa un `--option`, es `INVALID_ARGUMENT`.

En `compose increment`, `option` es `input` (se corrige la cotización con el adicional) y es `base` sólo cuando lo
único que falla es la base.

### Qué no hacer con un adicional

- **No cotizar solo un adicional que amplía a personas de la base** para sacar su margen: sale más bajo que el real.
  Un adicional que es sólo una persona nueva o un trabajo aparte se cotiza solo y se pasa con `--option`.
- **No poner en una línea nueva la dedicación que se le suma a una persona de la base**: se sube la dedicación de
  la línea que ya existe. Una línea nueva es para alguien que la base no tiene.
- **No quitar ni cambiar nada de la base** en esa cotización (una línea, una herramienta, un costo de terceros, la
  fecha) para que la resta pase. Si la base cambia, se vuelve a cotizar la base.
- **No restar a mano dos cotizaciones que la herramienta rechazó**, ni informar una cifra aproximada.
- **No multiplicar por tu cuenta el incremento de un periodo representativo** por un número de meses: ningún dato
  dice en cuántos corre el adicional.
- **No mostrarle la lectura al cliente** ni copiar su costo o su margen a un texto del documento.
- **No escribir el precio del adicional en el brief.** Sale de la cotización con el adicional.

### Cómo sale cada cosa en el documento

- **Líneas y meses.** Los meses consecutivos en que un concepto cuesta lo mismo son una línea: «3 meses», el valor
  de un mes y el neto de los tres. Un cobro único es «1 pago único», sin valor unitario. Si el neto de un concepto
  cambia durante el plazo, sale una línea por tramo y el detalle dice qué meses cubre («Mes 3», «Meses 1 a 2»). Un
  mes con neto cero no imprime nada, salvo una línea bonificada que el brief marca.
- **Un precio por todo (`combine`).** Las claves que el brief combina salen como una línea de cantidad 1 con la
  unidad que el brief escribe («1 programa»), sin valor unitario y con la suma exacta del plazo. Esas claves no
  imprimen línea propia.
- **Portada.** El neto de la cotización bajo «Valor neto del servicio completo», o bajo `cover.netLabel` si el brief
  lo declara.
- **Línea bonificada.** Sale sólo si el brief marca su clave con `courtesy: true`: «Bonificado» y, debajo, su «Valor
  de referencia», el precio que la cotización tenía para esa fila antes de la rebaja. No suma al subtotal, al
  impuesto ni al total.
- **Grupos.** Por defecto «Servicio», «Puesta en marcha» y «Costos de terceros». El brief puede mover una línea a
  otro grupo con `group`.
- **Servicio gestionado.** Una línea de fee. Nunca el equipo ni sus horas.
- **Costos de terceros refacturados.** Una línea por costo, con el concepto que declaró la cotización y su neto
  final. Nunca el proveedor.
- **Costos que el cliente paga directo.** Un bloque aparte, en su propia moneda, sin convertir y fuera de todo total.
  Sale solo cuando la cotización los declara.
- **Calendario de pagos.** Sale cuando el brief declara `paymentMilestones`, la misma lista de
  [`compose schedule`](#calendario-de-pagos-compose-schedule): partes del neto que suman exactamente 1. Los importes
  los calcula la herramienta y suman el neto. Aquí cada hito necesita `periodId` o `when`, y se admiten hasta 12.
  Con un impuesto exclusivo resuelto, cada hito se imprime con su neto, su parte del impuesto congelado y su total,
  y las partes suman el impuesto y el total de la cotización; el calendario no lleva entonces la nota «Importes
  netos, sin impuestos» salvo que el brief escriba una. Con el impuesto sin resolver o que no aplica, un hito es su
  neto.
- **Impuesto.** El de la cotización: la tasa y el importe que congeló, «Por confirmar» si no lo resolvió, o «No
  aplica» si lo declaró así. Nunca se recalcula. Los datos llevan `taxPeriods`, los periodos de la cotización: el
  kernel redondea el impuesto de cada periodo y la cotización los suma, así que el impuesto congelado se acepta si
  está a no más de una unidad mínima por periodo del impuesto de la tasa sobre el neto, se presenten las líneas por
  meses o combinadas. Una cotización pactada con `agreed_total` se reparte de modo que su impuesto es exactamente el
  de la tasa sobre el total.
- **Opciones adicionales.** Un bloque aparte, el último de la sección de precio, con el rótulo «Opcional · Fuera de
  esta cotización» y una frase fija que dice que no forman parte de la cotización y que sus valores son netos. Sale
  sólo cuando la corrida recibe `--option` o `--increment`. Ninguna opción entra a una línea, al neto, al impuesto ni
  al total. Una opción pasada con `--increment` se imprime igual que las demás: un nombre, un importe y una unidad.

Ejemplos versionados, emitidos y generados el 2026-10-11 (importes en CLP; el comprador es inventado):

| Ejemplo (`data/pricing/v3-operating/`) | Qué muestra                                                                                                                                                      | Neto       | Impuesto y total                     | Páginas |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------ | ------- |
| `designer-on-demand`                   | Un mes y una puesta en marcha: 2.470.000 y 320.000                                                                                                               | 2.790.000  | «Por confirmar»                      | 4       |
| `designer-three-months-iva`            | Tres meses en una línea (3 × 2.550.000) y una puesta en marcha de 320.000                                                                                        | 7.970.000  | IVA 19 %: 1.514.300; total 9.484.300 | 4       |
| `managed-on-demand-third-party`        | Fee de 11.370.000 y tres costos de terceros (4.950.000, 1.380.000 y 3.333.333); aparte, un costo de USD 890 que paga el cliente; calendario de 50 %, 30 % y 20 % | 21.033.333 | «Por confirmar»                      | 5       |
| `designer-startup-courtesy`            | Tres meses en una línea (3 × 2.550.000), la puesta en marcha bonificada con valor de referencia 320.000 y dos opciones (2.580.000 al mes y 3.570.000 por mes de campaña) | 7.650.000  | IVA 19 %: 1.453.500; total 9.103.500 | 5       |
| `managed-addon-increment`              | Un fee de servicio gestionado en una línea (3 × 5.650.000) y una opción pasada con `--increment`, 300.000 al mes (cierre del 2026-10-11)                          | 16.950.000 | IVA 19 %: 3.220.500; total 20.170.500 | 4       |
| `managed-addon-increment.programme-price` | La misma cotización impresa como un precio de programa: una línea «1 programa» con `combine`, `cover.netLabel` «Valor neto del programa» y dos hitos con su IVA y su total (8.480.000 + 1.611.200 = 10.091.200; 8.470.000 + 1.609.300 = 10.079.300). Se emite sobre `managed-addon-increment.artifact.json`, sin `--increment` | 16.950.000 | IVA 19 %: 3.220.500; total 20.170.500 | 4       |

El calendario del tercer ejemplo: 10.520.000, 6.310.000 y 4.203.333. Cada ejemplo tiene su
`<nombre>.document-brief.json` y su `<nombre>.document.json`.

### Qué significan los estados

| Señal                                  | Qué significa                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Exit 2 sin `--brief`                   | Salió el andamio: falta el brief. No es un error                                                                                              |
| Exit 3 con `--brief`                   | Se emitieron los datos de un borrador. La cotización sigue en revisión: no es una aprobación                                                  |
| Exit 1                                 | Rechazo: stdout vacío, `error.code` en stderr y ningún dato emitido. `option` dice si se corrige el brief (`brief`), la cotización (`input`) o la de una opción (`option`, o `increment` si se pasó con `--increment`) |
| `status: "draft"` en los datos         | Siempre. Es el estado de preparación del archivo, no un estado de aprobación de Greenhouse                                                    |
| Impuesto y total «Por confirmar»       | La cotización no resolvió el impuesto. No se arregla en el brief                                                                              |
| Impuesto «No aplica»                   | La cotización declaró que no aplica; el total es igual al neto                                                                                |
| Una tasa con su importe                | La cotización resolvió el impuesto; se imprime su cifra, no un cálculo nuevo                                                                  |
| `source` en los datos                  | El cálculo de origen y, si hay opciones, el de cada una. Con `option<N>Basis: "increment"`, el cálculo nombrado es la cotización con el adicional y el precio es su diferencia con la del documento. Llega al manifiesto y no se imprime |
| «Bonificado» con un valor de referencia | Una línea que la cotización regala y el brief pidió mostrar. No es un cobro ni un descuento sobre el total                                   |
| Bloque «Opcional · Fuera de esta cotización» | Opciones con el precio de su propia cotización, o con lo que le suman al neto de un periodo si se pasaron con `--increment`. No están contratadas ni sumadas |
| Exit 0 del generador                   | HTML y PDF generados y la comprobación de páginas pasó. La revisión visual sigue pendiente                                                    |
| «Contenido fuera del A4» del generador | Un contenido no cabe en su página. No se generó nada                                                                                          |

### Qué no hacer con el documento

- **No escribir una cifra a mano.** En el brief se rechaza. Tampoco repetir importes dentro de los textos libres:
  nada los compara con la cotización y quedan viejos al volver a cotizar.
- **No editar los datos emitidos** ni el `datos.json` de una carpeta generada. Se cambia la cotización o el brief y
  se emite de nuevo, en rutas nuevas.
- **No resolver un impuesto «Por confirmar» en un texto.** El tratamiento lo decide el operador, se declara en la
  demanda y se vuelve a cotizar.
- **No presentar el documento como una cotización aprobada o emitida**, ni ponerle un número de cotización de
  Greenhouse. No es una `quotation_id` y nada lo registró.
- **No quitar la leyenda de borrador** mientras el operador no haya aprobado el precio.
- **No agregar al documento lo que traen las lecturas internas** (costos, márgenes, la reserva, el nombre de un
  proveedor, el reparto en persona y kit), ni entregar el andamio.
- **No reutilizar la carpeta de un documento ya entregado.** Una corrección es una versión nueva en una carpeta
  nueva.
- **No acortar un contenido quitando una obligación** para que quepa en la página.
- **No escribir a mano el precio de una opción**, ni en el brief ni en un texto libre. Cada opción se cotiza y su
  artefacto se pasa con `--option`; si amplía a personas de la base, se pasa con `--increment` la cotización del
  servicio con el adicional adentro ([cuál usar](#un-adicional-que-amplía-la-base-compose-increment)).
- **No escribir a mano un valor de referencia**, ni decir «bonificado» de una línea que la cotización cobra. La
  cortesía se declara en la cotización y se marca en el brief; el valor lo pone la herramienta.
- **No presentar una opción como parte del total**, ni sumar su precio al neto en un texto.
- **No llenar `buyer.unit`, `schedule.note` ni `cover.netLabel` con relleno** para que el brief «quede completo»:
  son optativos y se omiten. Tampoco escribir quién define la fecha de inicio.
- **No plegar por meses un precio que se pactó por todo el trabajo**, ni combinar claves para esconder una línea:
  `combine` es para imprimir como uno un precio que el cliente conoce como uno.
- **No quitar la leyenda de borrador porque el precio lo dictó el CEO** si hay filas bajo su piso que él no ha
  visto: se le muestran primero.

### Problemas comunes del documento

| Síntoma                                                                                      | Causa                                                                                                                                         | Qué hacer                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con la regla `unrecognized_keys`                      | El brief trae una clave que no existe. El caso típico es un importe, una moneda, una tasa o una fecha                                         | Quitarla. `path` dice en qué objeto está (vacío es la raíz). Las cifras salen de la cotización                                             |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `unknown_key` en `lines.<n>`                      | `lines` nombra una clave que la cotización no tiene: un error de tipeo o el brief de otra cotización                                          | Copiar las claves del andamio. `<n>` es la posición de la entrada, contando desde 0                                                        |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con muchas entradas                                   | Quedaron textos vacíos, o se entregó el andamio sin llenar                                                                                    | Llenar cada `path` de `issues`                                                                                                             |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `timing_required` o `requires_payment_milestones` | Un hito sin `periodId` ni `when`, o `paymentScheduleTexts` sin `paymentMilestones`                                                            | Decir cuándo se cobra cada hito; quitar los textos del calendario si no hay hitos                                                          |
| Exit 1, `SCHEDULE_MILESTONES_INVALID` con `option: "brief"`                                  | La lista de hitos no cumple las reglas del calendario de pagos                                                                                | [Tabla de reglas](#calendario-de-pagos-compose-schedule); la ruta empieza en `paymentMilestones`                                           |
| Exit 1, `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE`                                           | La cotización está bloqueada (`needs_input`)                                                                                                  | Resolver los `diagnostics` de la demanda, cotizar con un `--out` nuevo y leer ese artefacto                                                |
| Exit 1, `QUOTE_DOCUMENT_NOT_REPRESENTABLE`                                                   | La cotización no cabe en el documento: más de 40 líneas, más de 8 costos pagados por el cliente, o un importe que su moneda no puede escribir | No se arregla en el brief. Leer `issues` y llevarle al operador qué excede; se cambia la cotización                                        |
| Exit 1, `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP` o `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE`        | Las líneas no suman el neto; o el impuesto congelado se aparta del de su tasa sobre el neto en más de una unidad mínima por periodo; o la tasa tiene más de 4 decimales; o la cotización tiene más de 120 periodos | No emitir a mano. Es una cotización que el documento no puede representar: reportar el comando exacto a quien mantiene la herramienta      |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `duplicate_key`, `key_not_charged` o `unknown_key` en `combine.<n>.keys.<m>` | Una clave está en dos combinaciones (o dos veces en una); o es una línea que la cotización bonifica por completo; o la cotización no la tiene | Cada clave en una sola combinación; una cortesía se imprime con `courtesy: true` en `lines`; copiar las claves del andamio. `<n>` y `<m>` son posiciones, desde 0 |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `key_is_combined` en `lines.<n>`                  | `lines` nombra una clave que ya está en `combine`: esa clave no tiene línea propia                                                            | Quitar la entrada de `lines`; el nombre y el detalle de la línea combinada van en `combine`                                                |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `missing_label`, `missing_unit` o `invalid_keys` en `combine.<n>` | A una combinación le falta el nombre, la unidad o la lista de claves                                                              | Llenarlos: `keys`, `label` y `unit` son obligatorios                                                                                       |
| El generador falla con «El encabezado de las páginas interiores no cabe…»                    | El encabezado interior admite tres líneas entre la unidad del cliente, la sección y la referencia: con `buyer.unit`, la referencia tiene que caber en una; sin ella, en dos | Acortar `reference`, o acortar o quitar `buyer.unit`. Falla antes de abrir el navegador y dice qué acortar ([plantilla](../../commercial/templates/cotizacion-a4/README.md#páginas-fijas-portada-alcance-y-condiciones)) |
| Una línea de fee pactada con `agreed_total` sale partida en «Meses 1 a 2» y «Mes 3»          | El reparto del total deja el último periodo con el resto                                                                                      | Imprimirla como un precio con `combine`                                                                                                    |
| El documento imprime impuesto y total «Por confirmar»                                        | La cotización se congeló con el impuesto sin resolver                                                                                         | Es correcto. Si el operador ya decidió el tratamiento, declararlo en la demanda y volver a cotizar                                         |
| El generador falla con «Contenido fuera del A4» y nombra la página 1                         | El título de la portada es demasiado largo: la portada es una página fija. Cada entrada de `cover.title` es una línea del diseño, y la que no entra en el ancho del título se parte en dos y empuja lo demás | Acortar `cover.title` o `cover.subtitle`, emitir de nuevo y generar. Como orientación, sin logo caben un título de tres líneas con una bajada de hasta cinco, o uno de cuatro con una bajada de hasta tres. Un `cover.netLabel` largo también suma altura. La tipografía no se reduce |
| El generador falla con «Contenido fuera del A4» en alcance o condiciones                     | Demasiadas filas o textos largos para una página fija                                                                                         | Acortar la redacción sin quitar obligaciones                                                                                               |
| El generador dice que la carpeta de salida contiene archivos                                 | `--out` apunta a una carpeta con contenido                                                                                                    | Usar una carpeta nueva; cada versión conserva la suya                                                                                      |
| Una línea sale partida en dos, con «Mes 1» y «Meses 2 a 3»                                   | El neto de ese concepto cambia entre meses                                                                                                    | Es lo que dice la cotización. Un `detail` del brief en esa clave reemplaza el texto de los meses en todos sus tramos: mejor no ponerlo ahí |
| Exit 1, `REPLAY_MISMATCH`                                                                    | El artefacto fue editado, o `--input` no es un artefacto de composición                                                                       | No editarlo: volver a cotizar                                                                                                              |
| Exit 1, `QUOTE_DOCUMENT_OPTION_INVALID` con `net_differs_between_periods` en `options.<n>`   | La opción no cuesta lo mismo todos sus meses: lo usual es una puesta en marcha cobrada en el primero                                           | Cotizar la opción por un solo periodo, o dejar su puesta en marcha fuera con un ajuste declarado. `<n>` es su posición entre los `--option`, desde 0 |
| Exit 1, `QUOTE_DOCUMENT_OPTION_INVALID` con otra regla                                       | `not_calculated`, `currency_differs_from_quote`, `client_pays_costs_directly`, `same_as_quote` (se pasó la cotización base como opción), `duplicate_option`, `too_many` (más de 8) | Corregir la cotización de la opción o cómo se entregó. Nunca escribir su precio                                                             |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `option_not_named` o `unknown_key` en `options`   | El brief y los `--option` no nombran las mismas opciones                                                                                      | Una entrada de `options` por cada `--option`, con la misma clave                                                                           |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `missing_label` o `missing_unit` en `options.<n>` | A una opción le falta el nombre o la unidad                                                                                                   | Llenarlos: el andamio los trae vacíos                                                                                                      |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `line_is_charged` en `lines.<n>.courtesy`         | Se marcó como cortesía una línea que la cotización cobra                                                                                      | Quitar la marca. Si de verdad se regala, se declara el ajuste en la demanda y se vuelve a cotizar                                          |
| Exit 1, `QUOTE_DOCUMENT_BRIEF_INVALID` con `unknown_key` en una línea que el andamio lista bajo `waived` | El brief nombra una línea bonificada sin `courtesy: true`                                                                         | Marcarla, o quitarla del brief si no se quiere mostrar                                                                                     |
| Exit 1, `INVALID_ARGUMENT` con `option: "option"`                                            | Un `--option` mal escrito: sin `=`, sin ruta, con una clave inválida o con la clave repetida                                                  | Escribirlo como `--option clave=ruta.artifact.json`                                                                                        |
| Exit 1, `INVALID_ARGUMENT` con `option: "increment"`                                         | Un `--increment` mal escrito, o con una clave que ya usa otro `--option` o `--increment`                                                      | Escribirlo como `--increment clave=ruta.artifact.json`; una clave se usa una sola vez en la corrida                                        |
| Exit 1, un código `QUOTE_INCREMENT_*` con `option: "increment"`                              | La cotización del documento y la de un `--increment` no son comparables                                                                       | [Tabla](#si-las-dos-cotizaciones-no-se-pueden-restar). Lo usual: se pasó la cotización del adicional solo, que va con `--option`           |
| Exit 1, `QUOTE_DOCUMENT_OPTION_INVALID` con `option: "increment"` y `net_differs_between_periods` | El adicional no le suma lo mismo al neto en cada periodo comparado                                                                       | Revisar el precio del adicional en la cotización con el adicional; un solo importe sólo dice todo de él si es igual cada periodo           |
| El margen de una opción sale mucho más bajo que el esperado                                  | Es un adicional que amplía a personas de la base y se cotizó solo: repite el fee de plataforma por línea y las herramientas base               | Cotizar el servicio con el adicional adentro y leerlo con `compose increment`                                                              |
| La puesta en marcha bonificada de un servicio gestionado no muestra valor de referencia      | Un servicio gestionado no tiene fila de puesta en marcha en su cotización                                                                     | Es el límite actual: se dice en un texto de las condiciones, sin cifra                                                                     |
| Exit 1, `OUTPUT_EXISTS`                                                                      | La ruta de `--out` ya existe                                                                                                                  | Elegir una ruta nueva                                                                                                                      |

### Lo que el documento todavía no hace

Se dice cuando el pedido lo toca; no se resuelve por cuenta propia:

- Traer los textos de alcance o de condiciones de un catálogo o de una biblioteca: se escriben por cotización.
- Presentar el reparto en persona y kit de herramientas (`compose split`): el documento imprime las líneas propias
  de la cotización.
- Número de cotización, historial de versiones, verificación por QR, firmas, aprobación y envío: existen sólo en el
  cotizador de Greenhouse, y este flujo no escribe en él.
- Una portada, un alcance o unas condiciones de más de una página: son páginas fijas.
- Un documento en una moneda distinta de la de la cotización.
- Un valor de referencia para la puesta en marcha de un servicio gestionado: su cotización no tiene esa fila.
- Llevar como dato la vigencia de la oferta, la forma y el plazo de pago o lo que el cliente debe aportar: no son
  datos de la cotización y se escriben como texto en `conditions.rows`.

Dos puntos que esta lista traía ya no están en ella (2026-10-11, cierre):

- El margen real de una opción que sólo agrega dedicación de personas que ya están en la cotización base se lee con
  [`compose increment`](#un-adicional-que-amplía-la-base-compose-increment).
- La duración del contrato y la fecha de inicio del servicio no son algo que al documento le falte: el CEO decidió
  que quedan fuera del cotizador, porque una cotización no es un contrato y esos datos no mueven ningún costo, precio
  ni impuesto. La cotización sigue teniendo meses fechados desde su fecha. En el brief, un texto se escribe sólo
  cuando le dice al cliente algo que necesita: no se escribe quién define la fecha de inicio.

Referencias: [plantilla, datos y reglas de composición](../../commercial/templates/cotizacion-a4/README.md),
[registro de revisión de la plantilla](../../commercial/templates/cotizacion-a4/VERIFICACION.md),
[una sola moneda por documento](../../commercial/templates/cotizacion-a4/MULTIMONEDA.md),
[contrato del brief y rechazos](../../documentation/finance/cotizador-v3-contrato-y-validacion.md#documento-de-cotización-compose-document-2026-10-11)
y [qué es y qué no es](../../documentation/finance/cotizador-v3-superficie-implementada.md#el-documento-de-cotización-para-el-cliente-2026-10-11).

## Qué no hacer

- **No nombrar versiones a mano en una cotización nueva.** Se usa `--current`. Una ruta `…review-vN.json` queda sólo
  para repetir un caso con las versiones de su fecha, y el texto que la acompaña lo dice.
- **No saltarse un `CURRENT_VERSIONS_MISMATCH`** pasando las rutas a mano: el puntero y los archivos están
  desalineados y eso se arregla antes de cotizar.
- **No omitir `runNotices`** al informar un resultado ni tratarlo como error: no bloquea, y el operador tiene que
  verlo.
- **No leer `estimateExposure` ni `costEvidencePriority` como validación, pronóstico o aprobación.** Ordenan qué
  confirmar primero; no dicen que un dato esté bien.
- **No proponer conectar la nómina real** ni reemplazar un costo del catálogo por uno de nómina. No llamar al costo
  del catálogo «lo que Efeonce paga»: es el costo objetivo. El margen real de hoy sobre las personas es mayor que el
  que muestra el cotizador, y así se dice si el operador pregunta.
- **No escribir el sueldo de una persona** en una demanda, una nota o un documento. El cotizador trabaja con costos
  por perfil.
- **No emitir ni ofrecer una cotización en EUR.** España se cotiza en USD. Tampoco convertir a mano el resultado de
  otra moneda.
- **No usar el precio de SKY ni su margen como referencia** para otro cliente. Es una excepción que el operador
  aprobó para ese cliente; la norma es el piso de 45 % en servicios gestionados y de 25 % en una persona por
  dedicación.
- **No decidir cifras comerciales.** Márgenes, pisos, precios, FX de cotización, múltiplos de redondeo, factores de
  país, `floorBasis` y excepciones son del operador (CEO). El agente lleva el margen real y una recomendación.
- **No elegir la oferta por el margen que deja pasar.** Un programa SEO/AEO gestionado va con
  `seo-aeo-managed-service`, no con la oferta creativa; un servicio gestionado no va con la de staffing.
- **No atribuirle al operador lo que propuso el agente**: la fecha de revisión `2027-04-11` y el FX de cotización
  EUR→USD `1.20` se presentan como estimados pendientes de su decisión. El 10 % de On-Demand lo mantuvo el agente por
  encargo del CEO; los montos de puesta en marcha, las reglas de terceros y el 12 % de la reserva los propuso el
  agente y el CEO los aceptó como estimaciones.
- **No reabrir los factores de país.** El CEO los cerró el 2026-10-11 y están confirmados desde el 2026-10-12: no se
  presentan como estimados, como un dato por validar ni como una decisión que él deba. Si un perfil se aparta de su
  factor, se registra su costo específico.
- **No pedir el precio de HubSpot como un dato pendiente**: el CEO indicó que hoy no hace falta en las cotizaciones.
- **No cotizar un trabajo acotado sin declarar la forma.** Sin `engagementForm` el precio sale como On-Going y nada
  avisa. Tampoco declarar On-Demand para subir un precio, usar `engagementCode` para expresar la forma ni inventar un
  id de forma: Híbrido son dos cotizaciones.
- **No tratar On-Demand como una oferta ni como un modelo de entrega.** Es una forma de compromiso; la oferta la
  sigue eligiendo `offerId`.
- **No aplicar el «mes de costo» del Excel como fee de reclutamiento y onboarding**, ni agregar reclutamiento si no
  hay que contratar a nadie. Las dos provisiones son estimaciones: se presentan así.
- **No atribuir un paquete entero de Adobe a una persona** (una licencia es un tercio), no quitarle el IVA a sus
  montos, no olvidar `fx:CLP:USD` y no excluir `express-design` sólo para que la corrida pase.
- **No usar la lectura de caja como margen ni para decidir un precio**, no presentar el calendario de pagos como
  factura, y no decidir qué compromiso con un proveedor es aceptable: se informa y decide el operador. Tampoco
  presentar como cifra cierta el monto comprometido de un precio con plazo que no declara fecha de renovación: es un
  techo ([límites](#compromisos-con-proveedores-compose-commitments)).
- **No prometer lo que el cotizador no modela** en un trabajo acotado: periodos menores a un mes, ni lo que falta de
  terceros y reserva ([lista](#lo-que-todavía-no-está-modelado)).
- **No pedir la fecha de inicio del servicio ni la duración del contrato como datos de una cotización**, ni
  presentarlas como algo que el cotizador deba. Son materia del contrato y quedan fuera por decisión del CEO
  (2026-10-11). Tampoco escribir en el documento quién define la fecha de inicio.
- **No escribir una tasa en la demanda** para un costo de terceros: la demanda lleva la categoría y el catálogo pone
  la regla.
- **No esconder un costo de proveedor** dentro de una línea de persona, de una herramienta o de una provisión, ni
  restarlo como un descuento: se declara en `thirdPartyCosts` con su liquidación y su respaldo.
- **No renunciar a la reserva de contingencia para llegar a un precio sin decirlo**, ni omitir `engagementForm` para
  que no entre. La renuncia la decide el operador, lleva su motivo y queda marcada.
- **No comparar el margen mezclado con el piso de la oferta.** Con costos de terceros el número que se compara es
  `ownWork.marginRateRoundedDown`; se informan los dos, cada uno con su nombre.
- **No mostrarle al cliente las lecturas internas** (resumen, `explain`, `assess`, `split`, `cash`, `schedule`,
  `commitments`): traen costos, márgenes, la reserva y montos de proveedor. Al cliente va el documento que arma
  `compose document` ([Producir el documento de cotización](#producir-el-documento-de-cotización)); `compose preview`
  es la misma proyección, para revisar antes.
- **No escribir a mano una cifra del documento de cotización ni editar los datos que emite `compose document`.**
  Toda cifra sale de la cotización congelada: si hay que cambiar una, se cambia la cotización y se emite de nuevo.
  Y no presentar ese documento como una cotización aprobada, emitida o registrada en Greenhouse: es un borrador
  ([lista completa](#qué-no-hacer-con-el-documento)).
- **No quitarle una tarea a una persona para que los asientos de una herramienta calcen.** Un asiento pagado se
  usa, se comparte o se declara ocioso; lo que falte o sobre se declara con su motivo
  ([Declarar los asientos de una herramienta](#declarar-los-asientos-de-una-herramienta)). Tampoco declarar un
  asiento compartido sólo porque baja el costo.
- **No escribir a mano el precio de una opción ni un valor de referencia.** La opción se cotiza y se pasa con
  `--option`; la cortesía se bonifica en la cotización y se marca en el brief
  ([Agregar opciones y una cortesía](#agregar-opciones-y-una-cortesía)).
- **No cotizar solo un adicional que amplía a personas de la base, ni informar su margen desde esa cotización.** Se
  cotiza el servicio con el adicional adentro y se lee con `compose increment`; dos cotizaciones que la herramienta
  no acepta restar no se restan a mano
  ([Un adicional que amplía la base](#un-adicional-que-amplía-la-base-compose-increment)).
- **No tratar un artefacto guardado con `--keep-blocked` como una cotización**, ni buscar el archivo de una corrida
  bloqueada: no lo dejó ([Qué hace una corrida bloqueada](#qué-hace-una-corrida-bloqueada)).
- **No dividir a mano un precio pactado por todo el trabajo** entre meses o entre fee y puesta en marcha: se declara
  como `agreed_total` y lo reparte el cotizador. Y no usar `agreed_total` para un valor mensual: ese es `agreed_net`
  ([cuál usar](#registrar-el-precio-acordado)).
- **No cambiar `commercialUnit` para que una demanda pase.** La unidad es de la oferta y la declara el catálogo; si
  lo que se vende es otra cosa, cambia la oferta.
- **No presentar como confirmado un costo cuyas horas adivinaste.** Se declara `dedicationEvidence` con
  `status: "estimated"`; sin evidencia, se informa lo que trae `dedicationNotEvidenced`. Tampoco marcar `confirmed`
  una dedicación que nadie acordó ni midió.
- **No prorratear a mano el fee de plataforma** de una línea parcial ni quitarlo: hoy se cobra entero por línea, y
  si debe prorratearse es una decisión abierta del CEO. Tampoco quitar las provisiones «TEST ONLY» ni presentarlas
  como costo medido.
- **No inventar la evidencia de una herramienta que aporta el cliente** ni marcarla `confirmed`: sin evidencia, la
  herramienta queda fuera del trabajo y se dice en las condiciones.
- **No elegir el precio de una herramienta sin decirlo** cuando `current` no tiene importe: el `priceId` elegido es
  un supuesto de la cotización.
- **No fechar una cotización antes de los datos que usa**, ni nombrar versiones anteriores para que pase.
- **No citar un margen propuesto de 40 % o un piso de 35 %**: esa comparación genérica de `compose assess` se retiró
  el 2026-10-11 y nunca fue un piso. Los pisos son los de cada oferta.
- **No usar el redondeo, un ajuste ni un cambio de fecha para «cumplir» un piso** o para llegar a un precio.
- **No editar un archivo versionado** (catálogo, policy, demanda de ejemplo, artefacto): se copia a una ruta nueva o
  se emite una versión.

## Problemas comunes

| Síntoma                                                                                                                                  | Causa                                                                                                                                                                     | Qué hacer                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exit 1, `CURRENT_VERSIONS_MISMATCH` con `option: "current"`                                                                              | Un archivo no tiene la versión o el digest que dice el puntero: se editó un archivo versionado, o el puntero quedó apuntando a otra cosa                                  | `pnpm --silent pricing:v3 current show` (exit 2) dice qué fuente y su `status`: `version_mismatch`, `digest_mismatch` (mismo nombre de versión, otro contenido), `invalid` o `unreadable`. Avisar al operador; restaurar el archivo o mover el puntero |
| Exit 1, `CURRENT_VERSIONS_CONFLICT` en `current set`                                                                                     | `--confirm` no es el `pointerDigest` del puntero que se reemplaza (alguien lo movió entre medio), o se pasó `--confirm` para un destino que no existe                     | Volver a leer con `current show`, comprobar que el puntero actual es el esperado y repetir. Sin `--confirm` al reemplazar, el rechazo es `MISSING_ARGUMENT` con `option: "confirm"`                                                               |
| `pnpm pricing:v3:test` en rojo después de emitir un catálogo o una policy                                                                | Se emitió la versión y no se movió el puntero: la guarda exige que nombre la versión de número más alto                                                                   | Mover el puntero ([pasos](catalogo-v3-seleccion-y-actualizacion.md#versiones-vigentes-el-puntero-currentjson))                                                                                                                                    |
| El resumen trae `runNotices.laterCatalogValues`; faltan `marketFactor` o sobra `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`; el precio no es el esperado | La demanda está fechada antes de valores más nuevos del catálogo (se copió un ejemplo sin cambiar `quoteDate`). La CLI calcula con los valores de esa fecha y no falla     | Copiar la demanda con la fecha del día y volver a correr. Si la fecha anterior es a propósito, decirlo al informar                                                                                                                                |
| Exit 2, `AMBIGUOUS_SELECTION` en `lines.<lineId>.talentFactor` (u otro selector) en todas las cotizaciones de un país, tras un cambio de catálogo | Se agregó un segundo registro de factor con otro `recordId` para el mismo país. `catalog preview` y `catalog apply` lo aceptan; el bloqueo aparece recién al cotizar      | Emitir una versión que retire el duplicado (`operation: "retire"`, con fecha posterior a su inicio) y mover el puntero. Las cotizaciones fechadas mientras el duplicado estuvo vigente siguen ambiguas: se cotiza con fecha desde el retiro        |
| Exit 2, `RESOURCE_POLICY_NOT_EFFECTIVE` en `policy.source`                                                                               | La demanda o el plan tienen una fecha anterior al inicio de la policy vigente (2026-10-11). Le pasa a `managed-care.demand.json` y a las demandas de SKY, fechadas 2026-10-10 | Cotización nueva: fecha del día. Caso anterior: repetirlo con las versiones de su fecha                                                                                                                                                           |
| Exit 2, `RESOURCE_ALLOCATION_REQUIRED` en `<periodo>:adobe-express`                                                                      | Una línea con Social Media Manager, Community Manager, Content Manager o Content Creator: su receta pide Adobe Express desde la policy v7. Le pasa a `managed-care-colombia.demand.json` con `--current` | Si la persona arma piezas, declarar la asignación de `adobe-express` (una licencia = 1/3). Si no (atiende una bandeja), excluir `express-design` con su motivo en `work[].excludedProfileTasks`. En una copia: el archivo versionado no se edita |
| Exit 2, `RESOURCE_FX_SELECTION_REQUIRED` en `<periodo>:adobe`                                                                            | La demanda usa Adobe, que tiene precio en CLP, y `fxRecordIds` no nombra `fx:CLP:USD`                                                                                     | Agregar `"fx:CLP:USD"` a `fxRecordIds` ([Cotizar en otra moneda](#cotizar-en-otra-moneda))                                                                                                                                                        |
| Exit 2, `BUNDLED_TOOL_DOUBLE_COUNT` en `<periodo>:adobe`                                                                                 | La misma línea o persona tiene Creative Cloud Pro y Adobe Express, que el plan ya incluye                                                                                 | Quitar `adobe-express` de esa persona. Dos personas distintas, una con cada producto, no lo disparan                                                                                                                                              |
| Exit 2, `MISSING_CATALOG_SELECTION` en `engagementForm`                                                                                  | La forma declarada no tiene registro vigente: un id que no existe, o una demanda fechada antes del 2026-10-11                                                             | Usar `on_going` u `on_demand` y la fecha del día ([formas](#cotizar-on-demand-u-on-going))                                                                                                                                                        |
| Un trabajo acotado sale al mismo precio que uno continuo y el resumen no trae `engagementForm`                                           | La demanda no declara la forma: cotiza como On-Going y no avisa                                                                                                           | Declarar `"engagementForm": "on_demand"` en el `brief` y volver a correr                                                                                                                                                                          |
| El precio de un ejemplo de staffing no coincide con uno anterior                                                                         | La puesta en marcha pasó de USD 100 por cuenta a USD 200 por persona, y Adobe de un paquete en USD a una licencia de tres en CLP                                          | Volver a cotizar con `--current`; no copiar cifras de un ejemplo anterior al catálogo v9                                                                                                                                                          |
| Exit 2, `UNKNOWN_RESOURCE_REQUIREMENT` en `lines.<lineId>`                                                                               | `choices` nombra un requisito que el kit de la línea no tiene: reclutamiento en un servicio gestionado                                                                    | Quitar esa entrada: `managed-service-core` no tiene puesta en marcha                                                                                                                                                                              |
| Exit 1, `SCHEDULE_MILESTONES_INVALID`                                                                                                    | El archivo de `--milestones` no cumple las reglas; `issues` trae `path` y `rule`                                                                                          | [Tabla de reglas](#calendario-de-pagos-compose-schedule)                                                                                                                                                                                          |
| Exit 1, `SCHEDULE_REQUIRES_CALCULATED_QUOTE` o `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE`                                               | `compose schedule` o `compose cash` sobre un artefacto de una cotización bloqueada                                                                                        | Resolver los `diagnostics` de la demanda, volver a cotizar con `--out` nuevo y leer ese artefacto                                                                                                                                                 |
| `compose commitments` no lista una herramienta que se esperaba, o la lista bajo `CONTRACT_TERM_NOT_FROZEN`                               | El artefacto congeló una policy que no declaraba ese plazo, o el plazo declarado no supera los periodos cotizados                                                         | Mirar qué policy congeló el artefacto; volver a cotizar con `--current` si se quiere la lectura de hoy                                                                                                                                            |
| Exit 2, `RESOURCE_FX_SELECTION_REQUIRED` junto a `UNUSED_FX_SELECTION`                                                                   | Una herramienta con precio en EUR y `fxRecordIds` nombra la referencia de un solo día (`fx:EUR:USD:ECB:2026-10-09`)                                                       | Nombrar `fx:EUR:USD` en `fxRecordIds` ([Cotizar en otra moneda](#cotizar-en-otra-moneda))                                                                                                                                                         |
| Exit 2, `MISSING_CATALOG_SELECTION` en `fx.USD:EUR`                                                                                      | Se pidió `outputCurrency: "EUR"`                                                                                                                                          | Cotizar en USD. No hay cotización en EUR                                                                                                                                                                                                          |
| Exit 1, `INVALID_ARGUMENT` con `option: "current"`                                                                                       | `--current` con un valor (`--current=…`) o en un comando que no carga fuentes (`explain`, `replay`, `compose assess`, `compose preview`, `compose split`, `compose schedule`, `compose cash`, `compose commitments`, `compose document`, `compose increment`, `current`) | Quitarlo, o escribirlo sin valor                                                                                                                                                                                                                  |
| El resumen de un servicio gestionado trae `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM` en `assumptions`                  | La demanda no declara `engagementForm` y la oferta tiene una reserva de contingencia para la forma On-Demand: no se evaluó. Le pasa a los ejemplos `managed-care` | Preguntar la forma, declarar `on_going` u `on_demand` y volver a correr ([reserva](#reserva-de-contingencia))                                                                                                                                     |
| Un servicio gestionado On-Demand sale más caro que antes del catálogo v10 y el motor es `1.4.0`                                          | Ahora lleva la reserva de contingencia: 12 % del costo de persona, como costo                                                                                             | Es lo esperado. `contingencyReserve` en el resumen dice cuánto. No se quita cambiando la forma: se renuncia con motivo, si el operador lo decide                                                                                                  |
| Una cotización fechada 2026-10-11 trae `runNotices.laterCatalogValues` con `records` `8`                                                 | Los ocho factores de país confirmados rigen desde el 2026-10-12                                                                                                           | Informarlo. No es una fecha atrasada: desde el 2026-10-12, con la fecha del día, no sale                                                                                                                                                           |
| El margen de una cotización con terceros parece bajo el piso y ninguna línea sale marcada                                                | `marginRateRoundedDown` es el margen mezclado; el piso se juzga por fila                                                                                                  | Leer `ownWork.marginRateRoundedDown` y `marginFloor.lines` ([regla](#la-regla-de-lectura))                                                                                                                                                        |
| Exit 2, `MISSING_CATALOG_SELECTION` en `thirdPartyCosts.<costId>.policy`                                                                 | La categoría del costo no tiene regla vigente                                                                                                                             | Usar una categoría de `catalog search --current --kind third_party_policy`                                                                                                                                                                        |
| Exit 2, `STALE_SOURCE` en `periods.<n>.request.thirdPartyCosts.<i>.source`                                                               | La cotización del proveedor no rige a la fecha de la demanda                                                                                                              | Pedir una nueva y actualizar la `evidence`; no estirar la vigencia a mano                                                                                                                                                                         |
| Exit 2, `UNUSED_FX_SELECTION` tras agregar un costo de terceros en otra moneda                                                           | Se nombró el par de la moneda del proveedor en `fxRecordIds`                                                                                                              | Quitarlo: ese tipo de cambio se elige solo                                                                                                                                                                                                         |
| Exit 2, `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency`                                                                            | La demanda renuncia a una reserva que esta cotización no tiene (otra oferta, On-Going, sin forma)                                                                         | Quitar `contingency` o corregir oferta y forma                                                                                                                                                                                                    |
| Un costo de terceros aparece multiplicado                                                                                                | `periodIds` lista varios periodos: el costo completo se cobra en cada uno; o `quantity` mayor que 1                                                                       | Un costo único lleva un solo periodo                                                                                                                                                                                                              |
| Exit 2 y no aparece el archivo de `--out`                                                                                                | La cotización no calculó: desde el 2026-10-11 `--out` no escribe nada en ese caso. `runNotices.output` lo dice                                                            | Resolver los `diagnostics` y repetir con el mismo `--out` ([detalle](#qué-hace-una-corrida-bloqueada))                                                                                                                                            |
| Exit 2, `UNACCOUNTED_NAMED_SEATS` o `INSUFFICIENT_NAMED_SEAT_CAPACITY` en `<periodo>:<herramienta>`                                      | Los asientos pagados menos los ociosos no son los que se necesitan: sobra uno sin explicar, o falta uno                                                                    | Declarar el asiento como es: ocioso, compartido o de otro plan ([tabla](#si-la-cuenta-de-asientos-no-cierra)). No quitar la tarea de la persona                                                                                                    |
| Exit 1, `SCHEMA_INVALID` en `allocations.<n>` con la regla `custom`                                                                      | La entrada trae `periodId` y `periodIds` a la vez, ninguna de las dos, un mes repetido, o `idleSeats` sin `idleReason`                                                     | Dejar una sola de las dos claves de periodo; `idleSeats` e `idleReason` van juntos                                                                                                                                                                |
| Exit 1, `OUTPUT_EXISTS`                                                                                                                  | La ruta de `--out` ya existe                                                                                                                                              | Elegir una ruta nueva; no borrar un artefacto para reutilizar su nombre                                                                                                                                                                           |
| Exit 2, `COMMERCIAL_UNIT_CONTRADICTS_OFFER` en `commercialUnit` | La demanda declara una unidad comercial distinta de la que el catálogo v11 declara para su oferta. Le pasa con `--current` a dos demandas versionadas antiguas, `data/pricing/v3-operating/service.demand.json` (y el plan `service.plan.json`, que la contiene) y `data/pricing/v3-composition/seo-service.demand.json`, que emparejan la oferta de staffing con `managed_service`; sus artefactos congelados se siguen reproduciendo con `replay` | Usar la unidad de la oferta (`compose scaffold` la escribe), o cambiar la oferta si lo que se vende es otra cosa |
| `compose scaffold` deja `commercialUnit` en `null` y pregunta `COMMERCIAL_UNIT_REQUIRED` | El catálogo no tiene un registro `offer` vigente para esa oferta, o tiene dos | La confirma el operador; una demanda sin unidad no se cotiza |
| Exit 2, `QUOTE_DATE_BEFORE_CATALOG` o `QUOTE_DATE_BEFORE_OFFER_POLICY` | La demanda está fechada antes de los datos que usa | Fecha del día en `quoteDate` ([detalle](#una-fecha-anterior-a-los-datos)) |
| Exit 2, `RESOURCE_PRICE_PENDING` en `<periodo>:<herramienta>` | La asignación nombra un precio que hoy no tiene importe (suele ser `current`) | Elegir uno de los que `resources inspect` muestra con `availability` `reference_only` e informar la elección |
| Exit 2, `ALLOCATION_DRIVER_MISMATCH` en `<periodo>:<herramienta>` | `serviceShare` no es `allocatedUnits ÷ totalUnits` truncado a 18 decimales (por ejemplo `0.33` o `0.333333333333333334` para 1 de 3) | Escribir el cociente truncado: `"0.333333333333333333"` |
| Exit 2, `CREDIT_PERIOD_WINDOW_MISMATCH` en `<periodo>:<herramienta>` | Las fechas de un `creditBudgets` no caen en el mes calendario de su periodo, o `purchaseDate` es anterior a `quoteDate`. Pasa al copiar un ejemplo y cambiar sólo `quoteDate` | Fechar cada presupuesto dentro del mes de su periodo, contado desde `quoteDate` |
| Exit 2, `AGREED_TOTAL_OVERLAPS_ADJUSTMENT` | Una línea está en un `agreed_total` y en otro ajuste | Un ajuste por línea ([reglas](#un-precio-por-todo-el-trabajo-agreed_total)) |
| El costo de una persona no aparece como estimado ni como confirmado | La línea no declara `dedicationEvidence`: ese costo está en `estimateExposure.dedicationNotEvidenced` | Declarar de dónde sale la dedicación y si es un hecho o una estimación |
| El neto de los periodos no es igual aunque el precio se pactó como uno | Es un `agreed_total`: el último periodo toma lo que sobra del reparto | Es lo esperado; `agreedTotals.distribution` lo muestra. En el documento, `combine` |
| El margen de una línea chica sale muy bajo | El fee de plataforma se cobra entero por línea: en una línea de 0,08 FTE fue 24 % de su costo en el ejemplo versionado | Informarlo. Si es un adicional de una persona que ya está en la base, se lee con `compose increment`. No se prorratea a mano |

Los demás rechazos están en [Qué hacer con cada error](#qué-hacer-con-cada-error); los de costos de terceros y
reserva, en [su tabla](#si-un-costo-de-terceros-o-la-reserva-fallan); los de los asientos de una herramienta, en
[la suya](#si-la-cuenta-de-asientos-no-cierra); y los del documento de cotización (un brief con un importe, una
clave de línea desconocida, una opción que no se puede imprimir, un título de portada que no cabe, un impuesto «Por
confirmar»), en [Problemas comunes del documento](#problemas-comunes-del-documento); y los de un adicional leído como
incremento, en [Si las dos cotizaciones no se pueden restar](#si-las-dos-cotizaciones-no-se-pueden-restar).

## Pendientes que permanecen visibles

`compose assess` separa cálculo y evidencia: salario/localización, provisionesAssurance/operación/onboarding,
planes actuales, acceso/usuarios, capacidad real, margen comercial, entidad/impuestos y alcance del servicio.
Los montos de los 32 costos de persona están confirmados desde el catálogo v4 y declarados como costo en Chile desde
el v5: con una demanda fechada 2026-10-11 o después `assess` ya no emite `HUMAN_COST_EVIDENCE_REQUIRED`; con una
fechada antes lo sigue emitiendo por línea, porque ese día los registros no declaraban país. `assess` no avisa de un
factor de país estimado entre sus `gaps`: eso se lee en `reviewSignals` del resumen, y su peso, en
`costEvidencePriority` ([Dónde pesa un dato estimado](#dónde-pesa-un-dato-estimado-estimateexposure)). Cuando el
factor de mercado cambia algo, `margin.policyFloor.marketFactor` lo repite. Con costos de terceros o una renuncia a
la reserva, `assess` agrega sus propios gaps y trae el margen del trabajo propio junto al mezclado
([detalle](#en-cada-lectura-del-artefacto)). Desde el 2026-10-11 agrega además un gap por línea según la evidencia
de su dedicación (`DEDICATION_NOT_EVIDENCED` o `DEDICATION_EVIDENCE_REVIEW`). `PROVISION_COST_EVIDENCE_REQUIRED`, que
ya existía, marca cada provisión no medida: las «TEST ONLY» de los kits de una persona por dedicación y las
hipótesis de reemplazo y guardia de un servicio gestionado.
`assess` ya no compara contra un 40 %/35 % genérico: esa propuesta, que nunca fue una aprobación, se retiró el
2026-10-11. `margin.pricingPolicies` dice con qué regla de su propia oferta se cotizó cada línea y
`margin.belowPolicyFloor`, si el kernel marcó alguna fila. Los pisos aprobados son los de cada oferta (45 % en los servicios gestionados de las prácticas creativa y SEO/AEO, 25 % en una persona por dedicación); `assess` no los sustituye ni aprueba una excepción. El precio que se presenta y toda excepción los decide el operador (CEO). El preview está redactado, local y marcado como simulación;
no es oferta emitida. La promoción futura tiene [mapa de integración](../../documentation/finance/cotizador-v3-promocion-canonica.md),
con la autoridad y lifecycle del cotizador vigente. Este trabajo no despliega ni escribe API/DB/CRM.

Para registrar una licencia nueva, pedir plan, moneda, frecuencia, importe, seats/capacidad, cobertura,
acceso nominativo/compartido y evidencia/fecha. Primero registrar selección y costo en policy/catalog,
luego la asignación en demanda/portfolio. No inferir usuarios habilitados desde una factura ni sustituir un
contrato desconocido por una referencia pública. Las facturas privadas y enlaces firmados no se copian al repo:
registrar referencia, hash y hechos financieros mínimos. [Ledger de pendientes por owner](../../../data/pricing/v3-operating/operational-gaps.json).
