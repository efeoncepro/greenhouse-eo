# Cotizador V3: contrato del prototipo y plan de validación/convergencia

[Readback vigente del código y contratos](cotizador-v3-superficie-implementada.md): 135 testsV3 y 78 V2, 26 smokesCLI de TASK-2022. La tabla objetivo y el readback de la primera vertical que siguen no limitan el flujo operativo actual a TASK-2016.

- Fecha: 2026-10-09.
- Estado: contrato objetivo de bloques 2 y 3; núcleo y flujo local implementados en TASK-2016/2019/2020/2021/2022. La evidencia comercial y la integración canónica siguen pendientes.
- Owner de cálculo y economics: Commercial/Finance. Owner técnico del contrato y transición: Platform/Architecture.
- Modelo funcional: [prototipo V3](cotizador-cli-modelo-propuesto.md).
- ADRs de referencia: [Quote API Parity](../../architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md) y [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).

Esta definición fija comportamiento, estructura y criterios de aceptación. No fija salarios, porcentajes de tier, factores comerciales, tarifas, piso de margen o costos de Talent Assurance. El [manual ejecutable](../../manual-de-uso/finance/cotizar-v3-por-cli.md) distingue operaciones implementadas y límites de los contratos locales: 1.0.0, desde el 2026-10-10 1.1.0 (ver [Contrato 1.1.0](#contrato-110--ajustes-comerciales-y-redondeo-2026-10-10)) y desde el 2026-10-11 1.2.0 (ver [Contrato 1.2.0](#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11)) y 1.3.0 (ver [Contrato 1.3.0](#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11)) y, desde la noche de ese mismo día, 1.4.0 (ver [Contrato 1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11)): cinco contratos conviven. El cotizador canónico no cambia. Las claves del resumen que imprime la CLI, los avisos de la corrida y la lectura de exposición a datos estimados, también del 2026-10-11, están en [Resumen: avisos de la corrida y exposición a estimados](#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).

## Bloque 2 — Contrato del prototipo

### Fronteras y operaciones

El núcleo determinista recibe una solicitud resuelta y snapshots de configuración; devuelve un resultado interno. No importa CLI, UI, Next.js, DB, SDK de proveedor, transporte MCP ni filesystem. La resolución de catálogo, FX, identidad y archivos pertenece a adaptadores. No hay LLM dentro del cálculo.

| Operación        | Entrada                                        | Salida y límites                                                                                                |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Buscar catálogo  | Consulta, filtros y versión/contexto permitido | Candidatos con IDs, aliases y requisitos; no seleccionar automáticamente entre coincidencias ambiguas           |
| Validar/resolver | Solicitud y configuración explícita            | Entrada normalizada, defaults trazados, faltantes y conflictos                                                  |
| Calcular         | Entrada resuelta + snapshots                   | Resultado determinista o estado incompleto/ inválido; sin persistencia comercial                                |
| Explicar         | Resultado congelado íntegro                    | Operaciones, bases, supuestos y fuentes; sin volver a consultar el catálogo                                     |
| Comparar         | Dos o más resultados                           | Diferencias por componente, costo, precio y margen; señalar cambios de versión/alcance y resultados incompletos |
| Exportar         | Resultado + vista/formato permitidos           | JSON interno o Markdown comercial local; conserva condición de estimado, sin crear quote remota ni enviar       |

Estas operaciones son el contrato funcional, no nuevos nombres de capabilities canónicas. El futuro binding reutiliza el catálogo de capabilities y sus permisos; explicación/comparación no evaden la redacción por audiencia.

### Solicitud y configuración separadas

Se distinguen `request` (qué se quiere cotizar), `resolvedContext` (datos y políticas seleccionados por adaptadores) y `executionContext` (metadatos del transporte). Las rutas locales o credenciales no pertenecen al contrato del núcleo.

| Campo de `request`                           | Regla                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                              | Obligatorio; versión inicial `1.0.0`; desde el 2026-10-10 también `1.1.0` y desde el 2026-10-11 `1.2.0`, `1.3.0` y `1.4.0`, cada una con su propio motor; rechazar versión no soportada |
| `quoteDate`                                  | Fecha ISO `YYYY-MM-DD`, válida y explícita; el agente puede proponer la fecha actual, pero la registra en la solicitud          |
| `offerId`, `deliveryModel`, `engagementCode` | Oferta, modalidad de entrega y engagement separados; resolver desde catálogo, sin crear otra oferta por usar Staff Augmentation |
| `engagementForm`                             | Opcional, desde `1.3.0`: la forma del trabajo (`on_going`, `on_demand`), dato aparte de `engagementCode`; ausente, nada cambia                    |
| `thirdPartyCosts[]`                          | Opcional, sólo en `1.4.0`: los costos que se compran a un proveedor para el trabajo y se refacturan, cada uno con importe, moneda, cantidad, períodos y evidencia; ausente, nada cambia |
| `contingencyWaiver`                          | Opcional, sólo en `1.4.0`: la renuncia a la reserva de contingencia, con su motivo. En el brief se escribe `contingency: { kind: "waived", reason }`     |
| `offerMarketCountry`                         | País/mercado de venta confirmado, código ISO de país; mercados regionales requieren futura extensión expresa                    |
| `outputCurrency`                             | Moneda explícita y habilitada en el registro de monedas; ninguna moneda se deduce del país                                      |
| `duration`                                   | En V1: `{ unit: "month", periods: entero positivo }`; meses completos, sin prorrateo de días implícito                          |
| `lines[]`                                    | Al menos una línea; cada línea con `lineId` único, perfil resuelto y cantidades válidas                                         |
| `adjustments[]`                              | Opcional; ausencia significa ninguna modificación solicitada, sin desactivar reglas automáticas explícitas del paquete. `1.0.0`: a lo más un `discount`; `1.1.0`: hasta 10, `discount` o `agreed_net`, sobre filas disjuntas; `1.4.0`: un `agreed_net` puede además nombrar costos de terceros (`billing: "third_party"`) |
| `taxTreatment`                               | `not_resolved`, `not_applicable` con fundamento, o política resuelta; simulación neta permitida con impuestos pendientes        |

Por cada línea de talento:

- `profileId`, `seniorityCode`, `talentCountry`, `headcount` entero positivo.
- `dedication`: exactamente una unidad (`fte` u `hours_per_month`) y valor positivo; FTE por persona ≤1, varias personas se representan con headcount. Las fracciones/tasas usan representación decimal explícita.
- `allocationMode`: `shared` o `dedicated`, con `allocationPolicyRef`. No inferirlo de part time. La política compartida documenta capacidad atribuida y tratamiento de capacidad remanente; la dedicada documenta capacidad comprometida y costo absorbido.
- `toolAssignments`: kit resuelto y overrides explícitos; identifica usuario/slot, equipo o cuenta mediante IDs de asignación, sin exigir nombres personales. Cantidad de licencias deriva de las asignaciones, no del número de filas.
- `platformFeePolicyRef` y `talentAssurancePolicyRef`: referencias resueltas o condición `not_applicable` fundamentada por el paquete. No omitir la cobertura requerida para mejorar artificialmente el precio.
- `costOverride`, cuando exista: importe, moneda, unidad, país, fecha, fuente, naturaleza del costo y componentes incluidos. Reemplaza una base identificada; nunca agrega un costo duplicado ni constituye aprobación comercial.

La configuración resuelta contiene versiones/hashes y registros efectivos de catálogo, costos, jornada, asignación, tier, mercado, herramientas, fee de plataforma, Talent Assurance, addons, moneda, redondeo y FX. Define `calculationCurrency` para consolidar costos/precios; debe estar explícita en el snapshot, sin imponer USD en el contrato.

Un override no permite modificar el registro global. Un input con propiedades desconocidas o ambiguas devuelve error de validación; no se ignoran silenciosamente campos que el agente podría creer aplicados.

### Defaults permitidos y datos ausentes

- Defaults comerciales solo desde registros versionados y efectivos: kit, jornada, política de tier, capacidad o engagement. Cada default registra ruta, valor, registro/versión y razón. Si no hay coincidencia única, pedir dato.
- No hay defaults silenciosos para ambos países, moneda, costo, tasa FX, factor de país/mercado, número de personas, dedicación ni duración.
- `amount=0` exige una razón/fuente; `not_applicable` exige cobertura y fundamento. Dato desconocido conserva estado `missing`; no se trata como cero.
- Un factor neutral de 1 debe estar configurado para ese caso; no sustituye un país o política ausente. Conversión entre la misma moneda usa identidad matemática 1, trazada como tal.
- Los registros de costo distinguen `specific` de `reference_adjusted`, y datos confirmados de estimados. Un costo específico localizado evita el factor de costo adicional; no desactiva el ajuste del mercado.
- Si venció la vigencia o falta una política de antigüedad necesaria, se pide información. En modo de reproducción histórica se admite el snapshot fechado, marcado como histórico y sin declarar tarifa vigente.
- Las políticas de aplicación forman un grafo explícito por bases. Dependencias circulares o recargos sin base producen error; no se ejecutan fórmulas arbitrarias del caller.

### Convenciones numéricas y periodos

Los importes, FX, factores y tasas del contrato son cadenas decimales exactas. `"0.10"` significa 10%; no se acepta `"10"` como una forma alternativa del mismo porcentaje. Headcount y periodos son enteros. Se rechazan NaN, infinito, tasas de margen objetivo ≥1 y cantidades negativas. Descuentos/rebates se modelan como ajustes identificados; no como costos negativos anónimos.

Los cálculos usan aritmética decimal sin redondeos intermedios de dinero; una división periódica conserva al menos 12 decimales con precisión y estrategia versionadas. Implementación local: decimal.js 10.6.0, precisión 80, conforme al ADR del prototipo. Redondeo contable inicial definido: `HALF_UP` a la precisión monetaria del registro de moneda, al consolidar cada línea facturable. Los totales monetarios son suma de líneas redondeadas. Un descuento global se distribuye proporcionalmente sobre sus líneas elegibles; el residuo de unidades mínimas se asigna por mayor resto y, en empate, `lineId`, con trazabilidad.

Redondeo comercial adicional —por ejemplo, elevar a un múltiplo de precio— requiere una política del bloque 1 y aparece como ajuste separado. No se hereda automáticamente del Excel. Desde el 2026-10-10 esa política existe en el contrato 1.1.0: registro `price_rounding` del catálogo y campo `roundingAdjustment` del resultado; el contrato 1.0.0 sigue sin redondeo comercial. Los costos se consolidan con la misma precisión monetaria para calcular el margen final contra el neto cotizable; se conserva el valor de cálculo previo. Los controles usan el margen sin redondearlo a un porcentaje de presentación.

Cada periodo mensual tiene resultado propio. Si la configuración es homogénea, se muestra fee mensual uniforme; si varían costos o cargos, se muestra calendario por periodo, sin afirmar una recurrencia uniforme. Setup y otros cargos únicos se contabilizan una vez. Una amortización exige política explícita y no convive con el cobro íntegro del mismo setup. Costeo mensual de licencia anual y compromiso de caja anual aparecen separados.

Toda conversión guarda `from`, `to`, `rate`, `rateDate`, `source`, convención `importe_to = importe_from × rate` y propósito. Tasas invertidas/cruzadas requieren ruta explícita y componentes conservados. Si falta FX, no se muestra un total completo en la moneda solicitada. Cambiar solo la moneda no cambia el precio económico base; puede cambiar el importe presentado por FX/redondeo.

### Resultado y estados

Envelope interno propuesto:

| Campo                                          | Contenido                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `schemaVersion`, `engineVersion`               | Versión del contrato y versión exacta del motor                                             |
| `calculationId`, `replayDigest`                | Identidad local del contenido calculado; no son `quoteId` canónico                          |
| `calculationStatus`                            | `calculated`, `needs_input`, `invalid` o `failed`                                           |
| `reviewStatus`                                 | `within_policy`, `requires_review` o `not_evaluated`                                        |
| `binding`                                      | Siempre `false` para el cálculo del prototipo                                               |
| `normalizedRequest`, `configurationRefs`       | Solicitud resuelta y versiones/fuentes internas                                             |
| `periods[]`, `oneTimeLines[]`                  | Costos, precios y ajustes por periodo/línea; consumo variable separado                      |
| `totals`                                       | Recurrente, único, neto contratado; impuestos y total con impuestos solo si están resueltos |
| `margin`                                       | Costo total, contribución, margen real, objetivo/piso y resultado del control               |
| `explanation[]`                                | `stepId`, `ruleId`, entradas, base, operación, resultado, unidad, fuente y dependencias     |
| `assumptions[]`, `missingInputs[]`, `issues[]` | Defaults trazados, datos faltantes y diagnósticos estructurados                             |

`calculated` exige todos los datos necesarios para el neto y margen, incluyendo una política de control configurada. Estimaciones con procedencia declarada pueden calcularse: completo no significa costo real confirmado. Impuestos pendientes permiten cálculo neto completo, con `taxStatus=not_resolved`, `taxAmount=null` y `totalIncludingTax=null`.

`needs_input` devuelve todas las rutas faltantes detectables en la pasada. Los totales finales, margen agregado y total convertido quedan `null`; se pueden conservar componentes ya resueltos, nunca presentarlos como precio completo. `invalid` cubre contradicciones/formato/reglas imposibles; `failed` corresponde a un fallo inesperado del adaptador/ejecución, sin convertirlo en dato comercial faltante.

`requires_review` conserva los importes calculados y razones: margen bajo piso, excepción de capacidad, fuente no validada comercialmente u otra condición configurada. El sistema no eleva el precio, altera el costo ni aprueba automáticamente la excepción. El redondeo comercial del contrato 1.1.0 no contradice esto: es política de catálogo aplicada antes de los ajustes y del control, no una corrección de una fila marcada. `not_evaluated` aplica cuando no se completó el cálculo.

El estado de autorización comercial pertenece a un registro/proceso separado. El prototipo no crea `approved` ni `issued`. Una aprobación posterior referencia el digest exacto; un cambio de alcance, configuración o importe requiere una nueva revisión del resultado cambiado.

### Diagnósticos, CLI y exportación

Cada diagnóstico contiene `code`, `fieldPath`, `lineId`/`periodId` cuando aplique, `severity`, `message` y `resolution` con dato requerido/opciones seguras. Mensajes internos y comerciales se generan desde proyecciones permitidas; la prosa no filtra datos excluidos.

Códigos mínimos de diagnóstico de resultado: `MISSING_COST`, `MISSING_TALENT_COUNTRY`, `MISSING_OFFER_MARKET`, `MISSING_FX`, `MISSING_POLICY`, `AMBIGUOUS_PROFILE`, `STALE_SOURCE`, `INVALID_UNIT`, `CONFLICTING_DEDICATION`, `DUPLICATE_COVERAGE`, `POLICY_CYCLE`, `UNSUPPORTED_SCHEMA` y `MARGIN_BELOW_FLOOR`.

Los rechazos son otra familia y no viajan en el envelope (delta 2026-10-10). Cada uno es un `PricingV3Error` con un código del [registro cerrado](../../../src/lib/finance/pricing-v3/errors.ts), en dos grupos: dominio —por ejemplo `REPLAY_MISMATCH` y los conflictos de mantenimiento— y adaptador —`INPUT_NOT_FOUND`, `INPUT_NOT_JSON`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE`, `UNKNOWN_OPTION`, `SCHEMA_INVALID`, `MISSING_ARGUMENT`, `INVALID_ARGUMENT`, `INVALID_FORMAT`, entre otros—. El registro es la fuente de la lista; este documento no la reproduce ni la cuenta. `ADAPTER_FAILURE` queda fuera del registro: se reporta sólo para un caso que nadie clasificó y señala un caso faltante en el adaptador, no un «fallo técnico» genérico ni un error de quien llama.

| CLI propuesta                                                                     | Código de salida | Canal                                                                                                         |
| --------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Cálculo completo dentro de política                                               | 0                | Envelope JSON en stdout                                                                                       |
| Solicitud incompleta o inválida                                                   | 2                | Envelope estructurado en stdout; stderr reservado al reporte de rechazo                                       |
| Cálculo completo que requiere revisión                                            | 3                | Envelope JSON con razones en stdout                                                                           |
| Rechazo: argumentos, archivos, schema, conflicto de dominio o caso sin clasificar | 1                | `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }` en stderr; sin resultado exitoso |

`message` es estático. `option` nombra la opción a corregir, sin su valor; `issues` trae hasta 20 pares `{ path, rule }` cuando un documento no pasa su schema. El reporte nunca contiene un valor, una ruta de archivo ni el mensaje de un parser o validador. En el flujo local, un documento que no pasa el schema estricto de un adaptador (brief, demanda, policy, catálogo o artefacto) es un rechazo `SCHEMA_INVALID` con código 1; el estado `invalid` del envelope del kernel conserva el código 2.

El agente inspecciona el envelope incluso con códigos 2/3. Logs y progreso nunca se mezclan con JSON stdout. El transporte API/MCP mapea los mismos estados a su envelope gobernado; estos códigos CLI no imponen códigos HTTP.

El prototipo ofrece JSON interno y Markdown comercial de estimación para revisión. La exportación comercial requiere `calculated` y `within_policy`; un caso que requiere revisión solo produce expediente interno hasta resolver la excepción. Esa condición no es aprobación comercial: el documento se identifica como estimación/borrador. Con impuestos pendientes, muestra neto y ese estado; nunca un total final con impuestos inventados.

La vista comercial permite alcance, perfiles, dedicación, calendario/precio, setup, moneda, herramientas incluidas/aportadas, Talent Assurance, límites y condiciones confirmadas. Excluye costos, margen, factores internos, registros privados, overrides y diagnósticos sensibles. La redacción se aplica antes de llegar al consumidor. Tras integración, permisos derivan del contexto autenticado; un flag `--audience` no amplía derechos.

### Snapshot y reproducción

Un artefacto interno conserva solicitud, configuración completa necesaria o contenido direccionado por hash, motor exacto, contrato, políticas de precisión/redondeo, FX y resultado. Referencias sin contenido recuperable no bastan para replay. El digest cubre el payload semántico con serialización estable; timestamps de ejecución y correlación se guardan fuera de ese payload.

Mismas entradas/configuración y motor producen el mismo resultado y digest independientemente del consumidor. El adaptador puede tener otro timestamp/request ID. `explain` lee la evidencia original; `replay` usa la versión original disponible y valida digest; si no está disponible, informa incompatibilidad, no recalcula silenciosamente con la última. Un recálculo actual crea otro resultado y conserva referencia al anterior.

### Contrato 1.1.0 — ajustes comerciales y redondeo (2026-10-10)

Decisión: [ADR del motor 1.1](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Todo lo anterior de este bloque describe el contrato 1.0.0, que no cambió; esta sección describe lo que agrega 1.1.0. Fuentes ejecutables: [`schemas.ts`](../../../src/lib/finance/pricing-v3/schemas.ts), [`calculate.ts`](../../../src/lib/finance/pricing-v3/calculate.ts) y [`catalog/resolve.ts`](../../../src/lib/finance/pricing-v3/catalog/resolve.ts).

**Versiones.** El kernel acepta dos contratos de entrada (cinco desde el 2026-10-11: las secciones siguientes agregan [`1.2.0`](#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11), [`1.3.0`](#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11) y [`1.4.0`](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11)) y firma cada resultado con el motor de su contrato. El registro cerrado es `PRICING_V3_ENGINES` (`schemas.ts`); `ENGINE_VERSION` dejó de existir. Cada contrato nombra su propia aritmética en `precisionPolicy` (`PRICING_V3_PRECISION_POLICIES`, `calculate.ts`).

| `schemaVersion` de request y snapshot | `engineVersion` del resultado | Qué admite |
| --- | --- | --- |
| `1.0.0` | `pricing-v3-local/1.0.0` | Lo de siempre, byte a byte: a lo más un `discount`, sin redondeo comercial. Rechaza cualquier campo nuevo |
| `1.1.0` | `pricing-v3-local/1.1.0` | Hasta 10 ajustes (`discount` o `agreed_net`) sobre filas disjuntas y `snapshot.priceRounding` opcional |

- La versión la declara la entrada, y request y snapshot llevan la misma. El motor no la infiere ni la sube. Una entrada que no declara `1.1.0` ni, desde el 2026-10-11, `1.2.0`, `1.3.0` o `1.4.0` (otra versión, ninguna o un documento mal formado) se juzga con el esquema 1.0.0 y conserva los diagnósticos de siempre.
- En el carril de catálogo y composición el que llama no elige contrato: la resolución emite `1.1.0` sólo si el brief trae un ajuste que no sea un único `discount`, más de un ajuste, o si el catálogo tiene una regla `price_rounding` vigente a `quoteDate` para la moneda de salida. En cualquier otro caso emite `1.0.0`. La decisión depende sólo de lo congelado, así que una cotización anterior vuelve a resolver al mismo contrato y al mismo digest. Desde el 2026-10-11 hay tres condiciones previas, en este orden: si el brief refactura al menos un costo de terceros o el catálogo tiene una reserva de contingencia que aplica a esa cotización, emite `1.4.0`; si no, y el brief declara la forma del trabajo (`engagementForm`), emite `1.3.0`; si no, y el factor de mercado elegido declara `floorBasis`, emite `1.2.0`; sin ninguna de las tres, vale lo dicho aquí.
- Un cambio futuro de comportamiento agrega contrato y motor al registro; nunca modifica un contrato ya usado.

**Ajustes.** En el kernel van en `request.adjustments`; en catálogo y composición, en `brief.adjustments`.

```jsonc
{ "adjustmentId": "…", "kind": "discount", "rate": "0.05", "lineIds": ["a"], "reason": "…" }
{ "adjustmentId": "…", "kind": "agreed_net", "amount": "4990000", "billing": "monthly", "lineIds": ["a", "b"], "reason": "…" }
```

- `discount` no cambia: rebaja por tasa sobre las filas mensuales y de implementación de sus líneas.
- `agreed_net` es el neto pactado en la moneda de salida para las filas de la clase `billing` (`monthly` o `setup`) de sus líneas, **por período**. El motor reparte la diferencia contra el precio de esas filas por mayor resto con desempate por `lineId` y deja el neto exactamente en `amount`: si lo pactado es menor, la diferencia es `discount`; si es mayor, `uplift`.
- Una fila facturable es el par línea × clase en cada período y recibe a lo más un ajuste. Un `discount` reclama las dos clases de sus líneas; un `agreed_net`, sólo la suya.
- Un `agreed_net` de `setup` se envía sólo a los períodos donde alguna de sus líneas tiene un recurso de cobro único. Si no cae en ningún período, la resolución lo bloquea.
- `reason` es obligatorio. Un ajuste no aprueba nada: el control de piso corre sobre el neto final.

**Redondeo comercial.** La regla es un registro `price_rounding` del catálogo, por moneda: `{ "currency", "multiple", "offerId"? }`, con fuente y vigencia. La de una oferta prevalece sobre la general de su moneda; sin regla vigente para la moneda de salida no hay redondeo. Cada moneda declara su múltiplo: no se convierte el de otra por tipo de cambio, así que la misma oferta en dos monedas no da precios que sean conversión exacta uno del otro.

- Se aplica a cada fila facturable con precio mayor que cero, **antes** de los ajustes y siempre hacia arriba. El precio de política se calcula como en 1.0.0 (`HALF_UP` a la precisión de la moneda) y se eleva al múltiplo; la diferencia queda en `roundingAdjustment`.
- Conservación del piso: si la fila cumplía su `minimumMargin` antes de redondear, el precio redondeado es el menor múltiplo que también lo cumple sobre los importes presentados. Si no lo cumplía, sólo sube al múltiplo siguiente: el redondeo no repara una política que vende bajo su piso.
- «Cumplía antes de redondear» se lee sobre los importes sin redondear, a 60 de los 80 dígitos de trabajo. `MARGIN_BELOW_FLOOR` sigue comparando sin tolerancia alguna.

**Forma del resultado.** Filas y totales de un resultado 1.1.0 agregan `roundingAdjustment` y `uplift`. Identidad: `net = undiscountedPrice + uplift − discount`, y `undiscountedPrice` ya incluye el redondeo (precio de política = `undiscountedPrice − roundingAdjustment`). Un resultado 1.0.0 no tiene ninguna de las dos claves: no van en cero, no van, porque agregarlas cambiaría el digest de los artefactos anteriores. Los totales de una quote de catálogo o composición suman las dos claves sólo cuando la quote es 1.1.0 o, desde el 2026-10-11, 1.2.0, 1.3.0 o 1.4.0.

**Diagnósticos nuevos.** Todos son `error` del kernel y dejan el período en `invalid`; no son rechazos del registro de `errors.ts`.

| Código | Cuándo |
| --- | --- |
| `OVERLAPPING_ADJUSTMENTS` | Dos ajustes apuntan a la misma fila facturable |
| `INVALID_AGREED_AMOUNT` | `amount` con más decimales que la moneda de salida |
| `AGREED_NET_WITHOUT_BASE` | Un `agreed_net` sin filas a las que aplicarse, o con precio base cero y monto positivo |
| `INVALID_PRICE_ROUNDING` | `multiple` no es un número entero de unidades mínimas de la moneda |
| `DUPLICATE_ID` | `adjustmentId` repetido |

En composición suben a `diagnostics` del resumen como bloqueos, con totales nulos y exit 2. En `quote` del carril de catálogo quedan bajo `periods[].diagnostics` con `calculationStatus: needs_input`, como cualquier período fallido. La resolución agrega dos bloqueos propios: `AMBIGUOUS_PRICE_ROUNDING` (dos reglas aplicables del mismo nivel) y `AGREED_NET_WITHOUT_BASE` con ruta `adjustments.<adjustmentId>` (un neto de `setup` que no cae en ningún período). La validación del catálogo rechaza una regla con moneda no registrada (`PRICE_ROUNDING_CURRENCY_NOT_REGISTERED`) o con un múltiplo que no es entero en unidades mínimas (`INVALID_PRICE_ROUNDING_MULTIPLE`); esos sí son rechazos del [registro](../../../src/lib/finance/pricing-v3/errors.ts).

**Replay y guarda.** El replay acepta cualquier motor del registro y verifica por recálculo y digest; un motor fuera del registro es `REPLAY_MISMATCH`. [`pricing-v3-frozen-artifacts.test.ts`](../../../src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts) reproduce cada artefacto congelado y exige al menos uno firmado por cada motor registrado.

**Fuera de 1.1.0.** Redondeo sobre el total del período, terminaciones comerciales (se expresan como `agreed_net`), ajustes de otra clase y ajustes encadenados sobre una misma fila.

### Contrato 1.2.0 — el piso acompaña al factor de mercado (2026-10-11)

Decisión: [delta 1.2.0 del ADR del motor](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado). Los contratos 1.0.0 y 1.1.0 no cambiaron, byte a byte; esta sección describe sólo lo que agrega 1.2.0. Fuentes ejecutables: las tres de la sección anterior y [`pricing-v3-market-floor.test.ts`](../../../src/lib/finance/pricing-v3/__tests__/pricing-v3-market-floor.test.ts), que deriva la regla a mano con entradas pequeñas.

**Versiones.** Con éste conviven tres contratos (cuatro desde la tarde del mismo día, con [1.3.0](#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11), y cinco desde la noche, con [1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11)). `1.2.0` es un superconjunto de `1.1.0`: admite todo lo de la tabla anterior y un campo más.

| `schemaVersion` de request y snapshot | `engineVersion` del resultado | Qué agrega |
| --- | --- | --- |
| `1.2.0` | `pricing-v3-local/1.2.0` | `floorBasis: "base_market"` opcional en cada elemento de `snapshot.marketFactors[]`; filas y totales con el ajuste de mercado y el piso de ese mercado |

- El único valor de `floorBasis` es `"base_market"`. Ausente, el piso se lee sobre el neto final, como en todo contrato anterior. Un snapshot `1.0.0` o `1.1.0` que traiga el campo se rechaza; no se reinterpreta.
- En el catálogo el campo vive en el `value` del registro `market_factor`. En el carril de catálogo y composición la resolución emite `1.2.0` si y sólo si el factor de mercado **elegido para esa cotización** (el de `offerMarketCountry`, vigente a `quoteDate`) lo declara, también cuando ese factor vale 1. Es una propiedad declarada del registro, nunca una inferencia desde el valor del factor: un factor 0,90 sin `floorBasis` cotiza con `1.1.0` o `1.0.0` como siempre, y un `floorBasis` en el factor de otro país no cambia nada.

**Los dos ejes de país.** Existen desde 1.0.0 y son hechos distintos: lo que cuesta una persona según dónde vive, y lo que paga un mercado según dónde está el cliente. Lo nuevo de 1.2.0 es sólo cómo se juzga el piso cuando el segundo baja el precio.

| Eje | Campo de la demanda | Registro | Sobre qué actúa | Qué no toca |
| --- | --- | --- | --- | --- |
| Factor de talento | `talentCountry` de cada línea | `talent_factor` para el par (país de la persona, país de referencia del costo) | El **costo** humano de esa línea, y con él su precio de política | Herramientas, fees y provisiones; el piso |
| Factor de mercado | `offerMarketCountry` de la cotización | `market_factor` del país del cliente | El **precio del componente humano**; nunca el costo | Herramientas, fees y provisiones, que no reciben factor de mercado |

- **Cómo componen.** Costo humano = costo de referencia × factor de talento. Precio humano = costo humano × multiplicador de la política de precio × factor de mercado. Son independientes: el factor de talento no mueve la razón `ρ` de más abajo y el factor de mercado no mueve el costo.
- **Qué le pasa al margen.** Con el factor de talento, costo y precio bajan o suben juntos y el margen queda donde lo pone la política. Con un factor de mercado menor que 1 baja sólo el precio y el margen real cae; con uno mayor que 1, sube.
- **Factor de talento sólo sobre costos de referencia.** Se aplica a un registro de costo con `localization: { kind: "reference_adjusted", referenceCountry }`. Un costo `specific` de un país no recibe factor y sólo sirve a líneas cuyo `talentCountry` es ese país; si existe para el perfil y el país de la línea, prevalece sobre el de referencia, salvo que la línea elija otro registro con `costRecordId`.
- **Sin factor para el par, no hay total.** El kernel reporta `MISSING_TALENT_FACTOR`; en catálogo y composición la resolución bloquea con `MISSING_CATALOG_SELECTION` y ruta `lines.<lineId>.talentFactor`. En ambos casos el estado es `needs_input`. Nunca se asume un factor 1.

**Base del piso.** Aplica a una fila cuando el factor de mercado elegido declara `floorBasis: "base_market"` y es menor que 1.

- `ρ` = precio de política de la fila con el factor de mercado ÷ su precio de política con factor 1. Los dos se toman como se presentan: `HALF_UP` a la precisión de la moneda de salida y **antes** del redondeo comercial.
- `ρ = 1`, y el control es el de siempre, cuando el factor es mayor o igual a 1, cuando el factor no declara `floorBasis`, cuando la fila no tiene componente humano o cuando los dos precios presentados son iguales.
- Piso de la fila: `floorNet = costo presentado × ρ / (1 − minimumMargin)`, elevado a la unidad mínima de la moneda. La fila se marca `MARGIN_BELOW_FLOOR` cuando su neto final es menor que ese valor exacto; la comparación se hace sin dividir y sin tolerancia.
- Lo que la regla dice: el factor de mercado es una decisión de precio ya aprobada para ese país y el piso no la castiga otra vez. Un descuento o un `agreed_net` adicional sí cruza el piso, y el piso no se mueve por ellos.
- Lo que la regla no hace: no agrega holgura. Con margen objetivo igual al mínimo y sin regla de redondeo para la moneda, una fila a precio de política puede quedar marcada por un centavo, igual que en el mercado base. Con regla de redondeo, la conservación del piso usa este mismo `floorNet` («cumplía antes de redondear» se lee sobre el precio del mercado base sin redondear) y la fila no se marca.

**Forma del resultado.** Un resultado 1.2.0 tiene todas las claves de 1.1.0 y además:

| Dónde | Clave | Qué es |
| --- | --- | --- |
| Fila | `marketAdjustment` | Precio con el factor de mercado menos precio con factor 1, con signo y antes del redondeo comercial: negativo cuando el factor baja el precio, positivo cuando es mayor que 1, cero sin componente humano |
| Fila | `marketPriceRatio` | `ρ` como cadena decimal; `"1"` cuando la regla no aplica |
| Fila | `floorNet` | Menor neto que cumple `minimumMargin` en ese mercado, en la moneda de salida |
| Totales | `marketAdjustment` | Suma de las filas; en una quote de varios períodos, suma de los períodos |

Identidades: `net = undiscountedPrice + uplift − discount`, sin cambio, y `undiscountedPrice − roundingAdjustment − marketAdjustment` es el precio del mercado base. `marginAmount` y `marginRate` siguen siendo el margen real del neto final; ninguna clave trae un margen «equivalente al mercado base». Un resultado 1.0.0 o 1.1.0 no tiene ninguna de estas claves, tampoco en cero.

**Diagnósticos.** 1.2.0 no agrega códigos. `MARGIN_BELOW_FLOOR` conserva nombre, severidad y ruta; cambia el valor contra el que compara en las filas con `ρ < 1`.

**Lectura.** El resumen `pricing-v3-composition-summary/1` suma claves de forma aditiva. `marketFactor` (`{ country, factor, floorBasis, recordId, revision, sourceStatus }`) aparece en la raíz sólo cuando el factor elegido cambia algo —factor distinto de 1 o `floorBasis` declarado—; con el factor neutral la clave no existe. Cada línea marcada de una fila 1.2.0 trae `floorNet` y `netShortOfFloor` (`floorNet − net`); si su `ρ` es menor que 1, `marginAmountShortOfFloor` es `null`, y si es 1 se conserva. Detalle por comando en la [superficie implementada](cotizador-v3-superficie-implementada.md).

**Fuera de 1.2.0.** Factores por tipo de cliente (se expresan como `agreed_net`), factores de talento por perfil o seniority (se expresan como costo `specific`), un piso distinto por país escrito a mano y cualquier otra base del piso.

### Contrato 1.3.0 — la forma del trabajo como dato propio (2026-10-11)

Los contratos 1.0.0, 1.1.0 y 1.2.0 no cambiaron, byte a byte; esta sección describe sólo lo que agrega 1.3.0. Qué es la forma del trabajo y por qué existe, en lenguaje simple: [superficie implementada](cotizador-v3-superficie-implementada.md#forma-del-trabajo-on-going-y-on-demand-2026-10-11). Fuentes ejecutables: [`schemas.ts`](../../../src/lib/finance/pricing-v3/schemas.ts), [`calculate.ts`](../../../src/lib/finance/pricing-v3/calculate.ts), [`catalog/resolve.ts`](../../../src/lib/finance/pricing-v3/catalog/resolve.ts) y [`pricing-v3-engagement-form.test.ts`](../../../src/lib/finance/pricing-v3/__tests__/pricing-v3-engagement-form.test.ts).

**Versiones.** Conviven cuatro contratos (cinco desde la noche del mismo día, con [1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11)). `1.3.0` es un superconjunto de `1.2.0`: admite todo lo anterior y dos campos más.

| `schemaVersion` de request y snapshot | `engineVersion` del resultado | Qué agrega |
| --- | --- | --- |
| `1.3.0` | `pricing-v3-local/1.3.0` | `engagementForm` opcional en el request y `engagementFactors[]` opcional en el snapshot (`{ form, priceRatio, source }`); filas y totales con el ajuste de la forma |

- **Dos datos distintos.** `engagementCode` (hoy `monthly`) es la cadencia de cobro y sigue eligiendo la política de precio. `engagementForm` es la forma del compromiso que se vende. Uno no reemplaza al otro.
- **Las formas son datos.** El kernel no conoce una lista de formas: sólo la razón de la que nombra el request. Cuáles existen lo decide el catálogo, con un registro `engagement_factor` por forma, `{ form, priceRatio, offerId? }`. El registro de una oferta prevalece sobre el general de la misma forma. Hoy hay dos, ambos generales: `on_going` con razón 1 y `on_demand` con razón 1,10.
- **Quién elige el contrato.** En catálogo y composición la resolución emite `1.3.0` si y sólo si el brief declara `engagementForm`, también cuando la razón es 1: la forma declarada es parte de lo que la cotización congela. Sin el campo emite el contrato de siempre (`1.0.0` a `1.2.0`) y el resultado es idéntico byte a byte al de antes. Desde el contrato 1.4.0 hay un caso que va primero: si la cotización refactura un costo de terceros o le aplica una reserva de contingencia, el contrato es `1.4.0`, con forma declarada o sin ella. Un contrato anterior que traiga las claves nuevas se rechaza; no se reinterpreta.
- **Nunca se asume una razón.** Una forma declarada sin registro vigente a `quoteDate` bloquea la cotización; no se cotiza a razón 1 en silencio.

**Cómo entra al precio.** La razón multiplica el precio de cada componente de la fila —persona, fee de plataforma, provisiones y herramientas—, en las filas mensuales y en las de implementación. Orden: política de precio → factor de mercado → **razón de la forma** → redondeo comercial → `discount` o `agreed_net`.

- El costo no cambia.
- El piso no se mueve: `minimumMargin` y `floorNet` de una fila son, cifra por cifra, los de la misma fila cotizada sin forma. El neto que se compara contra ese piso sí lleva la razón. Una razón mayor que 1 es margen que la fila realmente tiene, y un descuento puede consumirla hasta el mismo piso. Una razón menor que 1 (un descuento por compromiso, que hoy no existe en el catálogo) podría dejar la fila bajo su piso, y se marcaría como cualquier otro precio.
- Con un factor de mercado que lee su piso sobre el mercado base (`floorBasis`), el precio del mercado base se toma bajo la misma forma. Por eso `marketAdjustment`, `marketPriceRatio` y `floorNet` son los mismos con forma y sin ella.

**Forma del resultado.** Un resultado 1.3.0 tiene todas las claves de 1.2.0 y además:

| Dónde | Clave | Qué es |
| --- | --- | --- |
| Fila | `engagementAdjustment` | Precio de política con la razón menos el mismo precio a razón 1, antes del redondeo comercial; cero con razón 1 |
| Fila | `engagementPriceRatio` | La razón aplicada, como cadena decimal; `"1"` sin forma o con la forma de referencia |
| Totales | `engagementAdjustment` | Suma de las filas; en una quote de varios períodos, suma de los períodos |

Identidades: `net = undiscountedPrice + uplift − discount`, sin cambio; `undiscountedPrice − roundingAdjustment − engagementAdjustment` es el precio del mercado de la oferta a razón 1, y restándole además `marketAdjustment` queda el precio del mercado base a esa razón. Un resultado 1.0.0, 1.1.0 o 1.2.0 no tiene ninguna de estas claves, tampoco en cero.

**Lectura.** El resumen `pricing-v3-composition-summary/1` agrega, sólo cuando el brief declara la forma, el bloque `engagementForm` (`{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }`, con `scope` `"general"` u `"offer"`) y `engagementAdjustment` en `totals` y en los totales por período. `explain` y `compose assess` repiten el bloque (`commercialAdjustments.engagementForm` y `margin.policyFloor.engagementForm`). `compose preview` y las proyecciones cliente muestran sólo el neto final.

**Modos de falla.**

| Situación | Qué pasa |
| --- | --- |
| El brief declara una forma sin registro vigente a `quoteDate` (una forma que no existe, o una fecha anterior al 2026-10-11) | Bloqueo `MISSING_CATALOG_SELECTION` en la ruta `engagementForm`; `needs_input`, salida 2 |
| Dos registros vigentes del nivel que prevalece (dos generales, o dos de la misma oferta) | Bloqueo `AMBIGUOUS_SELECTION` en `engagementForm`; salida 2 |
| El kernel recibe directamente un request con forma y un snapshot sin su razón | Diagnóstico `MISSING_ENGAGEMENT_FACTOR`; sin total |
| El brief no declara la forma | No es una falla: se cotiza como siempre, que equivale a On-Going, y **no hay aviso** |

**Ejemplo congelado.** [`designer-on-demand.demand.json`](../../../data/pricing/v3-operating/designer-on-demand.demand.json) → `.artifact.json` es el primer artefacto firmado por el motor 1.3.0, y la guarda de artefactos lo exige. Cifras del artefacto congelado (corrida del 2026-10-11 con la policy v7, Adobe con el descuento con que se factura): neto CLP 2.790.000, costo 1.768.438, `engagementAdjustment` 252.635, ninguna línea bajo el piso. La misma demanda con `on_going` daba 2.540.000 con el mismo costo y los mismos `floorNet`. Vuelta a cotizar ese día con `--current` y la policy v10, que toma Creative Cloud Pro sin descuento: costo 1.822.704, neto 2.870.000 On-Demand (`engagementAdjustment` 260.387) y 2.610.000 con `on_going`, ninguna línea bajo el piso.

**Fuera de 1.3.0.** Una forma híbrida (se cotiza como dos cotizaciones: una base On-Demand y una operación On-Going) y una de licencia o consultoría, que no están cargadas; un tope para la razón; la duración del contrato como dato de entrada (una cotización tiene períodos, no un plazo); y períodos de menos de un mes (se expresan como horas dentro de un período). Los costos de terceros de un trabajo y una reserva de contingencia para alcance fijo también quedaron fuera de 1.3.0; se construyeron esa misma noche como [contrato 1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11).

### Contrato 1.4.0 — costos de terceros y reserva de contingencia (2026-10-11)

Los contratos 1.0.0 a 1.3.0 no cambiaron, byte a byte; esta sección describe sólo lo que agrega 1.4.0. Qué es un
costo de terceros, qué es la reserva y para qué sirven, en lenguaje simple:
[superficie implementada](cotizador-v3-superficie-implementada.md#costos-de-terceros-y-reserva-de-contingencia-2026-10-11).
Fuentes ejecutables: [`schemas.ts`](../../../src/lib/finance/pricing-v3/schemas.ts),
[`calculate.ts`](../../../src/lib/finance/pricing-v3/calculate.ts),
[`catalog/resolve.ts`](../../../src/lib/finance/pricing-v3/catalog/resolve.ts) y
[`pricing-v3-third-party-reserve.test.ts`](../../../src/lib/finance/pricing-v3/__tests__/pricing-v3-third-party-reserve.test.ts).

**Versiones.** Conviven cinco contratos. `1.4.0` es un superconjunto de `1.3.0`: una cotización 1.4.0 puede usar
además neto pactado, redondeo comercial, factor de mercado y forma del trabajo. Todas las claves nuevas son
opcionales, como las de cada contrato anterior.

| `schemaVersion` de request y snapshot | `engineVersion` del resultado | Qué agrega |
| --- | --- | --- |
| `1.4.0` | `pricing-v3-local/1.4.0` | En el request, `thirdPartyCosts[]` y `contingencyWaiver`; en el snapshot, `thirdPartyPolicies[]` y `contingencyReserve`; filas de tipo `third_party` y totales del trabajo propio y de la reserva |

- **Quién elige el contrato.** En catálogo y composición la resolución emite `1.4.0` sólo en dos casos: el brief
  refactura al menos un costo de terceros, o exactamente un registro de reserva prevalece para esa cotización
  (también cuando el brief renuncia a ella: la renuncia es parte de lo que la cotización congela). En cualquier otro
  caso vale la cadena anterior, sin cambio. Un contrato anterior que traiga las claves nuevas se rechaza; no se
  reinterpreta.
- **Las cotizaciones anteriores no se mueven.** Un catálogo congelado antes de 1.4.0 no tiene reservas y un brief
  congelado antes no tiene costos, así que resuelven como siempre. Vuelto a comprobar el 2026-10-11 con `replay`:
  los 19 artefactos bajo `data/pricing/` y los dos versionados del caso SKY se reproducen con `verified: true`, cada
  uno con el motor que lo firmó.
- **Una nota no cambia el contrato.** Un brief que sólo declara costos pagados por el cliente (`client_direct`) se
  queda en su contrato anterior.

**Costos de terceros.** El brief los declara en `thirdPartyCosts[]`:

```jsonc
{ "costId": "…", "category": "production", "label": "…", "supplier": "…", "settlement": "reinvoiced",
  "amount": "4500000", "currency": "CLP", "quantity": "1", "periodIds": [1],
  "evidence": { "reference": "…", "effectiveFrom": "…", "effectiveUntil": "…", "status": "confirmed" } }
```

- `settlement` es `reinvoiced` (Efeonce paga y refactura) o `client_direct` (el cliente le paga al proveedor).
  Sólo los primeros llegan al kernel; los segundos quedan congelados en el brief como nota y no entran a ningún
  total, cifra de caja ni conversión.
- `periodIds` es obligatorio: en cada período listado se cobra `amount × quantity` completo. Un costo de una sola
  vez nunca se multiplica en silencio por los períodos de la cotización.
- `evidence` es obligatoria en un costo refacturado y opcional en una nota. Se juzga como cualquier fuente: vencida o
  pendiente, no hay total; estimada, la cotización queda en revisión.
- El brief lleva la categoría y nunca una tasa. La regla de precio sale del registro `third_party_policy` de esa
  categoría: `{ category, label, method, rate, minimumMargin, rounding, offerId? }`, con `method` `markup` o
  `target_margin` y `rounding` `commercial` o `none`. El registro de una oferta prevalece sobre el general.
- Cada costo refacturado es una fila facturable propia, de tipo `third_party` (`<costId>:<período>:third_party`), con
  el piso de su categoría. Nunca es un componente de una fila del equipo.
- **Qué no la toca.** El factor de mercado, la razón de la forma del trabajo y los descuentos por tasa. El único
  ajuste que llega a una fila de terceros es un `agreed_net` con `billing: "third_party"` que nombra `costId` en
  `lineIds`; con él la fila se puede marcar bajo el piso de su categoría (`MARGIN_BELOW_FLOOR`) como cualquier
  otra.
- **Moneda.** Si el proveedor cobra en la moneda de salida, no hay conversión: un viaje de ida y vuelta por la
  moneda de cálculo no devolvería el mismo importe. En otra moneda, pasa por la moneda de cálculo con las tasas que
  la cotización congela.
- **Redondeo.** `commercial` sube la fila al múltiplo de la regla de redondeo de la cotización; `none` deja el
  precio de la regla tal cual. Por eso el neto de una cotización con medios al costo puede no ser un múltiplo.

**Reserva de contingencia.** Es un registro `contingency_reserve` del catálogo:
`{ label, rate, base, offerId?, engagementForm? }`, con `rate` mayor que 0 y menor que 1, y `base` `human` (el costo
de las personas de la fila) u `own_costs` (todos los componentes de costo de la fila).

- **Cuál aplica.** Aplica un registro que no nombra nada que el brief contradiga (su oferta, su forma del trabajo),
  y prevalece el que nombra más dimensiones. Dos en el nivel que prevalece bloquean; no se elige uno.
- **Cómo entra.** El kernel la calcula como un componente de **costo** de cada fila del equipo: `base × rate`. Se
  vende por la política de precio y por la razón de la forma como cualquier costo, sube `floorNet` y nunca descansa
  sobre una fila de terceros.
- **Cómo sale.** Sólo con `brief.contingency = { kind: "waived", reason }`. El importe pasa a 0, se levanta el
  diagnóstico de revisión `CONTINGENCY_RESERVE_WAIVED` y `totals.contingencyReserveWaived` dice cuánto se dejó
  fuera. En una cotización renunciada `contingencyBase` es 0: sólo se informa lo que se dejó fuera.
- **Sin forma declarada no se evalúa, y se dice.** Si el catálogo tiene reservas que dependen de la forma y podrían
  aplicar a la oferta, y el brief no declara `engagementForm`, la cotización trae el supuesto
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`.
- **Una reserva que termina no bloquea.** Si la vigencia del registro termina, la cotización siguiente se calcula
  sin reserva y ningún diagnóstico lo dice; sólo un brief que la renuncia queda bloqueado. La lectura de fechas de
  los precios lista ese vencimiento con su consecuencia, como aviso.

**Forma del resultado.** Un resultado 1.4.0 tiene todas las claves de 1.3.0 y además:

| Dónde | Clave | Qué es |
| --- | --- | --- |
| Fila | `kind: "third_party"` | La fila es un costo refacturado. Su `marketAdjustment` y `engagementAdjustment` son 0 y su `engagementPriceRatio` es 1 |
| Fila | `contingencyReserve` | La parte del costo de la fila que es reserva; 0 en una fila de terceros o con la reserva renunciada |
| Totales | `thirdPartyCost`, `thirdPartyNet` | Costo y neto de las filas de terceros |
| Totales | `ownWorkMarginRate` | Margen del trabajo propio: el de la cotización sin las filas de terceros |
| Totales | `contingencyReserve`, `contingencyBase` | La reserva incluida en el costo y la base sobre la que se calculó |
| Totales | `contingencyReserveWaived` | Lo que se dejó fuera por una renuncia; 0 sin renuncia |

Identidades: cada total es la suma de sus filas; el trabajo propio es el total menos los terceros;
`ownWorkMarginRate = ((net − thirdPartyNet) − (cost − thirdPartyCost)) / (net − thirdPartyNet)`; y
`cost − contingencyReserve` es el costo de la misma cotización sin reserva. `marginAmount` y `marginRate` siguen
siendo el margen real de toda la cotización. El libro de caja (`cashLedger`) gana una entrada `third-party:<costId>`
por cada período en que cae el costo; la reserva no entra a ninguna entrada de caja. Un resultado de un contrato anterior no tiene ninguna de
estas claves, tampoco en cero.

**Lectura.** El resumen `pricing-v3-composition-summary/1` agrega tres bloques, sólo en una cotización 1.4.0:

| Bloque | Forma | Qué responde |
| --- | --- | --- |
| `ownWork` | `{ cost, net, marginAmount, marginRateRoundedDown }` | ¿Cómo está vendido el trabajo del equipo? Es el margen que se compara contra el piso de la oferta |
| `thirdParty` | `{ basis, reinvoiced { cost, net, marginAmount, shareOfNet, rows[] }, clientDirect[], fxExposed[] }` | ¿Qué se refactura, con qué regla y a qué precio? ¿Qué paga el cliente directo? ¿Qué costo tiene al proveedor en otra moneda? |
| `contingencyReserve` | `{ rate, base, amount, baseAmount, shareOfNet, waived, waiverReason?, waivedAmount?, recordId, revision, scope, sourceStatus }` | ¿Cuánta reserva lleva, de qué registro, y se renunció? |

- **Regla de lectura.** `marginRateRoundedDown` de la raíz sigue siendo el margen mezclado real. Baja con todo lo que
  se refactura al costo o cerca del costo y **no** es la cifra que se compara contra el piso de una oferta;
  `ownWork.marginRateRoundedDown` sí. No existe un veredicto de toda la cotización sobre ninguno de los dos: el piso
  se juzga por fila, una fila del equipo contra su política de precio y una de terceros contra la regla de su
  categoría. `marginFloor.lines` lista las filas marcadas de los dos tipos.
- Ni el nombre del proveedor ni la referencia de su evidencia están en el resumen: un costo se nombra por
  `costId`, nombre y categoría. Quedan en el brief congelado.
- `explain` agrega `commercialAdjustments.thirdPartyPolicies[]` y `commercialAdjustments.contingencyReserve`.
  `compose assess` agrega `margin.ownWorkRate` y `margin.proposedFloorReadOn: "ownWorkRate"`, y lee
  `belowProposedFloor` sobre el trabajo propio. `compose preview` muestra el fee como trabajo propio, un ítem por
  costo de terceros con su nombre y su neto final, y `clientPaidDirectly[]` después de los totales; nunca un
  proveedor, un costo ni una tasa. Detalle por comando en la
  [superficie implementada](cotizador-v3-superficie-implementada.md).

**Modos de falla.**

| Situación | Qué pasa |
| --- | --- |
| La cotización de un proveedor está vencida a `quoteDate` | Bloqueo `STALE_SOURCE` en el costo; `needs_input`, salida 2. `runNotices.priceDates.expired` lo nombra con `subject: "third_party_quote"` |
| La evidencia de un costo refacturado está `pending` | Bloqueo `MISSING_SOURCE_CONFIRMATION`; salida 2 |
| La evidencia de un costo refacturado está `estimated` | Calcula y queda en revisión (`ESTIMATED_SOURCE`); `assess` agrega `THIRD_PARTY_COST_EVIDENCE_REQUIRED` |
| Un costo refacturado sin `evidence`, o un costo sin `periodIds` | Rechazo `SCHEMA_INVALID`, salida 1 |
| La categoría de un costo no tiene regla vigente a `quoteDate` | Bloqueo `MISSING_CATALOG_SELECTION` en `thirdPartyCosts.<costId>.policy`; salida 2. El kernel, llamado directamente, reporta `MISSING_THIRD_PARTY_POLICY` |
| Dos costos con el mismo `costId`, o un `costId` igual al `lineId` de una línea | Bloqueo `DUPLICATE_THIRD_PARTY_COST_ID`; salida 2 |
| Un período repetido o fuera del plazo de la cotización | Bloqueo `INVALID_THIRD_PARTY_SCHEDULE`; salida 2 |
| Un costo refacturado en un período sin ninguna línea activa | Bloqueo `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD`; salida 2 |
| Un descuento por tasa, o un neto pactado del equipo, nombra un costo de terceros | Bloqueo `INVALID_ADJUSTMENT_LINE`; salida 2 |
| Un importe con más decimales que la moneda del proveedor | Diagnóstico `INVALID_THIRD_PARTY_AMOUNT`; sin total |
| Dos registros de reserva del nivel que prevalece | Bloqueo `AMBIGUOUS_CONTINGENCY_RESERVE` en `contingency`; salida 2 |
| El brief renuncia a una reserva que no le aplica (otra oferta, otra forma, una fecha anterior) | Bloqueo `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency`; salida 2 |
| El brief renuncia a una reserva que sí le aplica | No es una falla: calcula sin reserva, con `CONTINGENCY_RESERVE_WAIVED` en revisión. Si el registro es estimado, sigue saliendo `ESTIMATED_SOURCE` |
| El brief no declara la forma y el catálogo tiene reservas que dependen de ella | No es una falla: calcula sin reserva y trae el supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM` |
| Una regla de categoría imposible (`target_margin` con tasa 1 o mayor, o un piso mayor que el margen que la regla da) | Al validar el catálogo, rechazo `INVALID_THIRD_PARTY_POLICY`. Si un margen objetivo imposible llega al kernel, la fila se omite con el diagnóstico `INVALID_MARGIN_RATE` |
| Un registro de reserva con una tasa fuera de (0, 1) | Al validar el catálogo, rechazo `INVALID_CONTINGENCY_RESERVE` |

**Ejemplo congelado.**
[`managed-on-demand-third-party.demand.json`](../../../data/pricing/v3-operating/managed-on-demand-third-party.demand.json)
→ `.artifact.json` es el primer artefacto firmado por el motor 1.4.0, y la guarda de artefactos lo exige. Cifras del
artefacto, reproducidas el 2026-10-11 con `replay`: costo 14.750.055, neto CLP 21.033.333 y margen mezclado 29,87 %;
terceros con costo 9.083.333 y neto 9.663.333; trabajo propio con neto 11.370.000 y margen 50,16 %; reserva 436.800,
el 12 % de 3.640.000; ninguna fila bajo su piso. La misma demanda con la reserva renunciada: neto 20.163.333 y
`contingencyReserveWaived` 436.800.

**Fuera de 1.4.0.** Cuándo se le paga a un proveedor y si una compra obliga más allá del trabajo (un plazo mínimo,
derechos de uso que duran más que él); una comisión sobre los costos que paga el cliente; una lista de precios de
proveedores recurrentes; el tratamiento de impuesto por fila (la cotización tiene uno solo, y con `exclusive` se
aplica a todo el neto, terceros incluidos); una cotización con terceros y sin ninguna línea de equipo; la reserva
de un servicio On-Going ganado en una licitación con multas; y la liberación de la reserva después de la entrega.
Sigue abierto de antes: la duración del contrato, una licencia comprada para el trabajo, períodos de menos de un
mes, la forma híbrida, las cotizaciones en EUR y una vista para el cliente de las lecturas internas.

### Lecturas de una cotización congelada (2026-10-11)

Cuatro operaciones leen un artefacto de composición sin recalcular precios: `compose split` (que ya existía) y las tres nuevas. Todas verifican primero el artefacto por replay, todas llevan `binding: false` y ninguna cambia el total. Qué pregunta responde cada una: [superficie implementada](cotizador-v3-superficie-implementada.md#tres-lecturas-de-una-cotización-congelada-2026-10-11). Fuentes ejecutables: [`resources/engagement-view.ts`](../../../src/lib/finance/pricing-v3/resources/engagement-view.ts) y [`resources/commitment-exposure.ts`](../../../src/lib/finance/pricing-v3/resources/commitment-exposure.ts).

| Operación | `schemaVersion` de la salida | Entrada además del artefacto | Salida | Falla |
| --- | --- | --- | --- | --- |
| `compose schedule` | `pricing-v3-payment-schedule/1` | `--milestones`: arreglo JSON de `{ id, label, share, periodId? \| when? }` | 3 | `SCHEDULE_MILESTONES_INVALID` (salida 1, `option: "milestones"`, `issues[]`); `SCHEDULE_REQUIRES_CALCULATED_QUOTE` (salida 1) |
| `compose cash` | `pricing-v3-engagement-cash/1` | — | 3 | `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE` (salida 1) |
| `compose commitments` | `pricing-v3-commitment-exposure/1` | — | 3; 2 si la cotización no está calculada | — |

- **Calendario.** `share` es una cadena decimal y las partes deben sumar exactamente 1 (regla `shares_must_sum_to_one`). Cada monto se lee al múltiplo de redondeo de la cotización; el último hito es el neto menos los anteriores (`takesRemainder: true`, y `remainder.absorbed` dice cuánto redondeo absorbió). `tax` y `total` son `null` salvo que la cotización haya resuelto el impuesto.
- **Caja.** `results.marginAtFullCost` es el margen del resultado congelado y es la cifra que decide viabilidad. `results.cashAddedOnContractedCapacity` es `net − newSupplierCash`, y la salida lo marca `isMargin: false` y `decidesPrice: false`. `restsOn` enumera los supuestos y `notDerivable` lo que el artefacto no permite saber (si una licencia se compra para el trabajo, a quién se paga un fee, nada de lo cobrado).
- **Compromisos.** Cada entrada de `commitments[]` trae `committed`, `attributedWithinPeriods`, `unrecovered`, y reparte ese resto entre `strandedIfNothingElseUsesIt` y `releasedToSharedCapacity` según si la demanda declara la capacidad como compartida. `shorterCommitmentPrices` lista los precios de menor compromiso que la policy ofrece para la misma herramienta. `notDerivable` nombra las herramientas cuyo precio no declara plazo de contrato (`CONTRACT_TERM_NOT_FROZEN`) y las suscripciones de créditos cuyo plazo no está en el artefacto (`CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN`). La lectura usa la policy que el artefacto congeló: un artefacto anterior a la declaración de un plazo sigue mostrando esa herramienta como no declarada. Cuando el precio declara la fecha de renovación, la entrada trae además `commitment.termStartKnown`, `renewsOn`, `boundUntil` (hasta cuándo queda atada la licencia) y `renewsWithinQuotedPeriods`; `committed` es entonces lo atribuido dentro de la cotización más los meses que quedan, no un plazo entero, y su `notDerivable` lleva `commitment.exitTerms` en lugar de `commitment.termStart`. Si los períodos cotizados cruzan una renovación se suma la señal `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`, con el mismo importe del compromiso: no es dinero aparte. Límite conocido: un precio con plazo y sin fecha de renovación se sigue leyendo como un plazo entero desde el primer período cotizado que usa el precio, que sobrestima un contrato que ya está corriendo; con fecha, un mes cubierto en parte cuenta entero, así que puede sobrar hasta un mes.
- **El plazo es un dato de la policy.** `commitmentTermMonths` (entero de 1 a 120, opcional, por precio de herramienta) dice cuántos meses hay que seguir pagando una licencia una vez tomada. Habla de la licencia, no del papel del contrato: un contrato anual cuya cuenta baja apenas se quita una licencia obliga por 1; uno cuya licencia se sigue cobrando hasta que el contrato se renueva obliga por 12. Facturación (`price.unit`) y compromiso son hechos separados. El valor 1 también es una declaración —se paga mes a mes y se puede dejar—, distinta de no declarar nada. El campo no entra a ningún cálculo ni a un resultado congelado; sólo alimenta la lectura de compromisos. Un precio todavía pendiente no admite plazo. `commitmentRenewsOn` (fecha ISO, opcional) es la fecha en que se renueva el contrato y sólo se admite junto con `commitmentTermMonths`: el plazo dice cuánto obliga una licencia, la fecha dice en qué punto está el plazo que ya corre. Las renovaciones son esa fecha y cada plazo después de ella (una fecha ya pasada avanza a la siguiente); la licencia queda atada hasta la primera renovación estrictamente posterior al último día del último mes cotizado que usa el precio, y los meses que quedan son los meses calendario posteriores a ese período que empiezan antes de esa fecha. Un plazo de 1 nunca produce una entrada ni levanta `CONTRACT_RENEWAL_NOT_DECLARED`, con fecha o sin ella. Los precios con `unit: "year"` ignoran los dos campos.

- **Con terceros y reserva (contrato 1.4.0).** `compose split` presenta tres partes cuando hay filas de terceros
  (`tools + person + thirdParty = net`); la reserva queda dentro de `person`. `compose cash` suma las naturalezas
  `thirdParty` y `contingencyReserve` a `fullCostByNature`; `newSupplierCash` incluye lo que se les paga a los
  proveedores de costos refacturados (el costo congelado de esas filas); la reserva es una provisión dentro del
  costo, no es caja de nadie ni capacidad; los costos que paga el cliente se listan en
  `supplierCash.paidByClientDirectly` y no se cuentan en ninguna cifra; y `results.marginAtFullCost` trae `ownWork`.
  `compose schedule` reparte el neto completo, refacturados incluidos, y `thirdParty.byPeriod` muestra dónde los
  hitos puestos en un período son menores que el costo de los proveedores de ese período
  (`supplierCostAboveMilestones`). `compose commitments` deja las compras a terceros fuera a propósito: dice cuántas
  vio (`reviewed.thirdPartyPurchasesOutsideThisReading`) y que sus condiciones no están congeladas
  (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN` en `notDerivable`). Ninguna puede decir cuándo se le paga a un proveedor.

Estas lecturas contienen costo y margen. Son vistas internas, no documentos para el cliente.

### Resumen: avisos de la corrida y exposición a estimados (2026-10-11)

Este cambio no agrega contrato ni motor: los contratos del kernel que existían esa mañana (`1.0.0`, `1.1.0`, `1.2.0`) y los artefactos congelados quedan iguales. El contrato `1.3.0` llegó esa tarde y el `1.4.0` esa noche; los dos están en las secciones anteriores. Cambia lo que la CLI **lee y avisa** alrededor del cálculo. Fuentes ejecutables: [`resources/summary.ts`](../../../src/lib/finance/pricing-v3/resources/summary.ts), [`resources/price-review.ts`](../../../src/lib/finance/pricing-v3/resources/price-review.ts), [`adapters/current-versions.ts`](../../../src/lib/finance/pricing-v3/adapters/current-versions.ts) y [la CLI](../../../scripts/commercial/pricing-v3.ts).

**Qué versiones entran al cálculo.** Un puntero, `data/pricing/v3-operating/current.json` (`pricing-v3-current/1`), nombra el catálogo, la policy y el catálogo de créditos vigentes. Con `--current` la CLI toma de ahí las fuentes que no se pasaron y las verifica antes de usarlas. El contrato del kernel no conoce el puntero: recibe, como siempre, fuentes ya resueltas, y el artefacto congela las tres dentro. Operación del puntero: [mantenimiento del catálogo](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).

**Claves del resumen.** `compose prepare|quote` imprimen el resumen `pricing-v3-composition-summary/1`; el detalle completo vive sólo en el artefacto de `--out`. Sus claves, agrupadas por lo que responden:

| Pregunta | Claves |
| --- | --- |
| ¿Qué corrida es y con qué motor? | `schemaVersion`, `version`, `binding` (siempre `false`), `commercialUnit`, `calculationId`, `replayDigest` (sólo `quote`), `engineVersion` |
| ¿En qué estado quedó? | `calculationStatus`, `reviewStatus`, `quoteReviewStatus`, `diagnostics` (bloqueos), `assumptions`, `reviewSignals` |
| ¿Cuánto da? | `totals`, `periods`, `marginRateRoundedDown`, `commercialAdjustments`, `priceRounding`, `marketFactor` (sólo si el factor de mercado cambia algo), `engagementForm` (sólo si el pedido declara la forma del trabajo); en una cotización 1.4.0, además `ownWork`, `thirdParty` y `contingencyReserve` |
| ¿Cumple el piso? | `marginFloor` |
| ¿Qué herramientas y qué caja? | `toolSelections`, `attributions`, `creditBudgets`, `resourceIncrementalCash`, `cashLedger`, `cashMeaning` |
| ¿Qué dato estimado pesa más? | `estimateExposure` |
| ¿Dónde está el detalle? | `fullDetail` |
| ¿Hay algo que avisar de esta corrida? | `runNotices` (sólo cuando hay algo) |

**`runNotices`: describe la corrida, no la cotización.** Es la única clave que no sale del resultado congelado. La CLI la agrega al imprimir, comparando lo que se usó con las fuentes que tiene a la vista en ese momento.

- No se guarda en el artefacto, y `replay` del mismo artefacto no la imprime.
- No existe cuando no hay nada que avisar: no va vacía ni en `null`.
- Nunca bloquea y no cambia el código de salida. Quien cotiza la informa al operador junto al resultado.
- Tiene hasta dos miembros, cada uno presente sólo si aplica:

| Miembro | Forma | Qué dice |
| --- | --- | --- |
| `laterCatalogValues` | `{ quoteDate, newestEffectiveFrom, records, byKind }` | El catálogo tiene registros que empiezan a regir después de la fecha de la cotización. La cotización se calculó con los valores de su fecha, que es lo correcto para una cotización de ese día y un error silencioso si la demanda conservó una fecha vieja |
| `priceDates` | `{ withinDays, reviewDue, dueSoon, expired }` | Fechas de los precios que esta cotización usa: revisiones ya pasadas, fechas que caen dentro de `withinDays` (30 días) y vigencias terminadas |

Cada aviso de `priceDates` trae `kind` (`hard_expiry`: vigencia, bloquea al pasar; `review`: fecha de revisión, nunca bloquea), `subject` (`tool_price`, `resource_policy`, `catalog_record`, `credit_provider` o, desde el contrato 1.4.0, `third_party_quote`: la vigencia de la cotización de un proveedor), `ref`, `label`, `date`, `daysLeft` y `blocksWith` (el diagnóstico que daría una vigencia pasada; `null` en una revisión).

`laterCatalogValues` nació ese mismo día en la raíz del resumen y se movió a `runNotices`, porque mezclaba lo que un replay vuelve a imprimir con lo que depende del momento de la corrida. Un consumidor que lea esa nota la busca dentro de `runNotices`; ya no está en la raíz del resumen y nunca estuvo en el artefacto.

**Vigencia y revisión de un precio.** Son dos fechas distintas. La vigencia (`effectiveUntil` de la fuente) sigue siendo dura: pasada esa fecha el dato no se selecciona y la cotización queda `needs_input`, como dice [Defaults permitidos y datos ausentes](#defaults-permitidos-y-datos-ausentes). La fecha de revisión (`reviewBy`, opcional, por precio de herramienta en la policy) sólo avisa. Desde la policy v6 los precios unitarios de herramientas tienen vigencia abierta y fecha de revisión: una cotización con fecha posterior ya no se bloquea por eso. Detalle: [precios unitarios](cotizador-v3-mantenimiento-catalogo.md#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11).

**`estimateExposure`: dónde pesa un dato estimado.** Se deriva del resultado congelado, sin recalcular nada, así que `replay` la imprime igual. Es `null` cuando la cotización no llegó a un total.

| Clave | Qué es |
| --- | --- |
| `currency`, `totalCost`, `net` | Moneda de salida, costo total y neto del resultado |
| `estimatedCost`, `confirmedCost` | Parte del costo que descansa en al menos un dato estimado y parte que no; suman `totalCost` |
| `estimatedShareOfCost` | `estimatedCost ÷ totalCost` |
| `costInputs[]` | Datos estimados del lado del costo, de mayor a menor `costAtRisk`. Cada uno trae `kind`, `id`, `label`, líneas y períodos, `costAtRisk`, `shareOfCost` y `marginRateLostIfTenPctHigher`. Desde el contrato 1.4.0, la cotización de un proveedor con evidencia estimada es un dato más, de `kind: third_party` |
| `priceInputs[]` | Un factor de mercado estimado: mueve precio, nunca costo, y por eso no entra al ranking de costo |
| `estimatedRules[]` | Políticas estimadas que son reglas y no importes (capacidad facturada, política de precio, redondeo, impuesto y, desde el contrato 1.4.0, la regla de precio de una categoría de terceros y el registro de la reserva de contingencia); no admiten la lectura «10 % más alto» |

- `costAtRisk` es el costo que descansa en ese dato. `marginRateLostIfTenPctHigher` = 0,10 × `costAtRisk` ÷ `net`: los puntos de margen que se perderían si ese dato fuera 10 % más alto y el neto no cambiara. Se redondea hacia arriba para no mostrar una pérdida menor que la real.
- Un componente cuenta una sola vez en `estimatedCost` aunque dependa de dos datos estimados (por ejemplo, costo de la persona y factor de talento). Por eso la suma de `costInputs` puede superar `estimatedCost`.
- `compose assess` publica los cinco primeros en `costEvidencePriority.confirmFirst`.
- Es una lectura de sensibilidad. No es un pronóstico, no valida ningún dato y no cambia el estado de revisión.

**Rechazos y salidas.** El [registro](../../../src/lib/finance/pricing-v3/errors.ts) suma dos códigos de adaptador, ambos con salida 1: `CURRENT_VERSIONS_MISMATCH` (el puntero y un archivo que nombra no coinciden; `option: "current"`) y `CURRENT_VERSIONS_CONFLICT` (el `--confirm` de `current set` no es el digest del puntero que se reemplaza, o se ofreció un `--confirm` cuando el puntero de destino todavía no existe). Reemplazar un puntero existente sin `--confirm` es `MISSING_ARGUMENT` con `option: "confirm"`, no un conflicto. `current show` usa la convención de siempre: 0 si el puntero es consistente con sus archivos, 2 si no. Los códigos 0, 1, 2 y 3 de la tabla de la CLI no cambian de significado.

**Límites que este cambio no mueve.** No hay tasa USD→EUR ni regla de redondeo para EUR: una cotización con salida en EUR queda `needs_input`. El costo de las personas es un costo objetivo y no la nómina real ([provisiones y costos](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11)). Un resumen con avisos, o sin ellos, sigue siendo una simulación: no es un precio aprobado, un costo validado ni una cotización emitida.

## Bloque 3 — Pruebas y convergencia

### Casos mínimos del prototipo

Todos los fixtures se marcan `synthetic_test` o `historical_reference`; nunca se publican como salarios/tarifas vigentes. Los resultados esperados se calculan de manera independiente y se revisan aritméticamente, no se copian del motor probado. La tabla expresa criterios del contrato objetivo; su evidencia ejecutada debe contrastarse con los tests y auditorías de cada unidad, sin dar por cubiertos todos los escenarios futuros por el total de pruebas locales.

| ID    | Caso                                                      | Evidencia esperada                                                                  |
| ----- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| V3-01 | Un perfil, un periodo y costo completo                    | Reconcilian costo, precio, contribución y margen con cálculo independiente          |
| V3-02 | Mismo talento y condiciones; dos mercados                 | Costo idéntico; cambia solo la base comercial elegible y margen resultante          |
| V3-03 | Costo localizado frente a referencia ajustada             | Costo específico sin segundo factor; fuente y ruta visibles                         |
| V3-04 | 50% compartido frente a capacidad dedicada                | Costeo según cada política; horas entregadas no reducen licencias/fees por defecto  |
| V3-05 | Dos personas con kit común                                | Dos seats cuando corresponda; recurso compartido una vez según asignación           |
| V3-06 | Licencia anual y AI variable                              | Anual/12 para costeo; caja anual aparte; consumo presupuestado y límites visibles   |
| V3-07 | Fee o Talent Assurance ya cubierto                        | Cobertura identificada sin doble costo; conflicto sin resolver no da total completo |
| V3-08 | Tres meses y setup                                        | Recurrencia por periodo + único una vez; no doble cobro de setup amortizado         |
| V3-09 | Markup frente a margen objetivo                           | Fórmulas distintas con las mismas bases; porcentajes inequívocos                    |
| V3-10 | Descuento que cruza piso de margen                        | Neto y margen recalculados; `requires_review`, sin ajuste ni aprobación automática  |
| V3-11 | FX y cambio solo de moneda                                | Par/dirección/fecha preservados; base económica igual; redondeo explicable          |
| V3-12 | Faltantes, fuentes vencidas y ambigüedad                  | Rutas útiles; sin costo cero, factor neutral o moneda sustitutos                    |
| V3-13 | Cantidades inválidas, versiones y ciclo                   | Rechazo determinista; sin recursión, fórmula arbitraria o normalización silenciosa  |
| V3-14 | Rounding y descuento global                               | Suma de líneas igual al total; residuo distribuido determinísticamente              |
| V3-15 | Vista cliente y diagnóstico sensible                      | Sin costos/margen/factores/fuentes privadas en JSON, Markdown o mensajes            |
| V3-16 | Núcleo directo frente a CLI                               | Igual resultado semántico/digest; diferencias solo de transporte                    |
| V3-17 | Replay tras cambiar catálogo                              | Resultado original intacto y reproducible; recálculo actual con nueva identidad     |
| V3-18 | Periodos con condiciones distintas e impuestos pendientes | Calendario real; neto completo con total con impuestos ausente                      |
| V3-19 | Caso completo del Excel histórico                         | Coincidencia bajo política histórica explícita; diferencias de V3 documentadas      |

Los fixtures históricos son evidencia de extracción, no el criterio único de corrección de V3. No se requiere reproducir errores del prototipo. Para servicios con política de mercado incompleta, el resultado correcto es modalidad no habilitada/dato pendiente.

Gate local: todos los casos pertinentes pasan; dinero final coincide exactamente a la precisión configurada; ningún faltante se transforma en total completo; no hay regla en el parser CLI ni fuga en la exportación. Aritmética, contratos y aislamiento se verifican automáticamente; Commercial/Finance revisa explicación, cobertura y pertinencia del modelo con casos reales del catálogo inicial.

### Baseline del código canónico, inspección inicial 2026-10-09

La evidencia siguiente es lectura de código, no comprobación de deployment, DB, UI o permisos efectivos.

| Área actual            | Evidencia y consecuencia para V3                                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrato de simulación | `src/lib/finance/pricing/simulate-input-schema.ts` usa `countryFactorCode` único, horas/FTE y líneas role/person/tool/addon/direct_cost. V3 necesita migración semántica explícita hacia dos dimensiones de país |
| Envelope de simulación | `simulate-quote-pricing.ts` envuelve V2, conserva `binding:false` y aplica redacción. Evaluar reuso del primitive y envelope mediante adaptación versionada                                                      |
| Motor V2               | `pricing-engine-v2.ts` importa readers de catálogo/costos y conversión. Separar resolución IO y cálculo; evaluar qué lógica se conserva antes de decidir reemplazo                                               |
| Factor país            | V2 multiplica precios de roles/personas y herramientas por `countryFactorApplied`. V3 no extiende automáticamente el factor comercial del perfil a SaaS; diferencia intencional a contrastar                     |
| Defaults y redondeo    | V2 tiene fallbacks numéricos/factor neutral y redondeos `round2`; V3 exige política explícita y diagnóstico de faltantes. No heredar conducta sin revisión                                                       |
| Redacción              | `pricing-output-redaction.ts` distingue internal/client/public y costStackVisible, con recorte de notas/warnings. Conservar la política de permisos y evaluar adaptación al nuevo output                         |
| Persistencia/lifecycle | `quotation-pricing-orchestrator.ts` persiste/recalcula y `submit-quote-from-builder.ts` invoca V2. Integración debe cubrir estos caminos; no basta cambiar el endpoint de simulación                             |

Las rutas son candidatas a reuso, no una declaración de compatibilidad binaria. Antes de integración hace falta completar un inventario de imports, readers, rutas, UI, Nexa/MCP, snapshots, pricing de servicios, impuestos, overrides, approvals, revenue metrics y consumidores de quote-to-cash.

### Fases y gates de transición

| Fase                           | Trabajo                                                                                            | Gate de salida                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0: contrato y datos iniciales | Esta definición + parámetros del bloque 1 para un catálogo pequeño                                 | Contrato coherente, datos con procedencia, alcance habilitado y casos esperados definidos                                                                      |
| P1: prototipo local            | Núcleo separado, adaptadores locales, CLI y exportación                                            | Casos V3 pertinentes pasan y revisión Commercial/Finance de escenarios iniciales                                                                               |
| P2: baseline y contraste       | Inventario canónico + simulación V2/V3 de escenarios equivalentes                                  | Todas las diferencias clasificadas: intención V3, redondeo, cambio de fuente/política, defecto o caso no equivalente; ninguna diferencia monetaria inexplicada |
| P3: adaptación canónica        | Reusar capabilities/readers, adaptar inputs/outputs y snapshots; mantener V2                       | Compatibilidad de consumidores, permisos/redacción, integración de simulación y pruebas de regresión; ningún write nuevo para comparar                         |
| P4: piloto interno             | Selección versionada de motor para alcance delimitado, con rollback preparado                      | Casos reales revisados, evidencia de rutas habilitadas y cero diferencias inexplicadas/fugas/recalculo histórico                                               |
| P5: promoción por capacidades  | Adopción de consumidores y lifecycle probado; retiro de rutas legacy cuando no tengan dependientes | Parity matrix verificada por capacidad/audiencia y decisión de promoción registrada con evidencia                                                              |

P0 termina como definición, pero no se declara listo para construir con el catálogo inicial hasta completar los parámetros aplicables del bloque 1. P2 puede revisar código sin escribir ni desplegar V3. Crear un paquete/repositorio/servicio, migrar DB o desplegar requieren su unidad de trabajo y decisión de placement; no son prerequisitos de P1.

### Compatibilidad, comparación y rollback

- El contraste usa iguales datos de costo, fuente/fecha, alcance, periodo, monedas y FX cuando la semántica es equivalente. Cambios intencionales se prueban contra una expectativa V3 independiente; igualdad con V2 no es obligatoria para corregir reglas.
- Imports y consumidores se mapean a capabilities antes del cutover. No implementar wrappers con fórmulas propias para esconder incompatibilidades.
- En authoring se recalcula del lado canónico y se guarda versión/snapshot; no se confía en un total enviado por UI/CLI/agente. La simulación local no se importa como aprobación o emisión.
- Nuevas cotizaciones pueden elegir V3 solo mediante configuración gobernada del lado servidor. La versión persistida identifica qué motor calculó cada resultado; ausencia en legacy se interpreta mediante un mapping de migración documentado, no como V3.
- Cotizaciones emitidas conservan importes y snapshots. V3 no recalcula historia automáticamente. Re-cotizar crea revisión/nuevo resultado conforme al lifecycle canónico.
- Rollback dirige cálculos nuevos elegibles a V2; resultados V3 existentes conservan su identificación y requieren soporte de lectura/replay. No se editan retroactivamente sus cifras para fingir que se calcularon en V2.
- Si una migración requiere schema, usar cambios aditivos compatibles primero. Retirar V2/readers/campos exige inventario sin dependientes, conservación de evidencia histórica y plan de retiro propio.
- Detener/promover de vuelta ante fuga de datos, alteración de historia, diferencias monetarias inexplicadas o fallos de un consumidor habilitado. El tiempo de rollback y métricas de performance se fijan con baseline runtime antes de P4; no se inventa un SLA en esta definición local.

### Matriz de Full API Parity objetivo

| Capacidad               | Núcleo/contrato único                                         | Validación por consumidor habilitado                                                          |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Discovery               | Reader autorizado + IDs/aliases compartidos                   | Misma resolución/ambigüedad con igual contexto y versión; catálogo privado no cruza a público |
| Simulación              | Primitive canónico que invoca V3                              | CLI, UI, API, Nexa y MCP: mismo resultado económico interno; proyección según permisos        |
| Explicación/comparación | Snapshot/resultado permitido                                  | No recalcular ni filtrar detalle privado; misma semántica dentro de la audiencia autorizada   |
| Exportación             | Proyección/documento desde resultado exacto                   | Importes/scope fieles; permisos y estado preservados; representación no es authoring          |
| Autorar/emitir/aprobar  | Commands/lifecycle canónicos existentes o evolución gobernada | Authz, idempotencia, snapshot y estados; consumers solo cuando tengan carril autorizado       |

MCP externo sigue simulate-only según ADR vigente. La misma familia de capacidades no exige que todas sean visibles a todas las audiencias. El acceso public/self-service se considera pendiente hasta habilitación específica y no bloquea el prototipo.

### Evidencia, owners y cierre

Cada fase registra versión de código/configuración, fixtures, resultados, diferencias, capacidades/consumidores probados, limitaciones y decisión de avance. Platform/Architecture valida contratos y aislamiento; Commercial/Finance valida economics; práctica/Operations valida herramientas, capacidad y Talent Assurance. La promoción canónica requiere la decisión del operador y evidencia de la fase, sin confundir diseño aprobado con deployment.

Esta definición conserva el contrato objetivo de los bloques 2 y 3. Los ADRs locales aceptados y las unidades TASK-2016/2019/2020/2021/2022 respaldan el prototipo ejecutable; la decisión de transición al cotizador canónico mantiene su gate propio. La [superficie implementada](cotizador-v3-superficie-implementada.md) distingue cálculo, catálogo, composición y operación ya probados de extensiones futuras; no se afirma integración API/UI/MCP por haber completado pruebas locales.

## Readback de primera vertical local — 2026-10-09

TASK-2016 implementa cálculo mensual Staffing, costos humanos y recursos explícitos, países separados, FX, markup/margen objetivo, un descuento global, periodos variables de recursos, impuestos explícitos, snapshots/replay y exportación redactada. [ADR local](../../architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md), [schema ejecutable](../../../src/lib/finance/pricing-v3/schemas.ts), [manual y límites](../../manual-de-uso/finance/cotizar-v3-por-cli.md), [evidencia](../../audits/commercial/2026-10-09-pricing-v3-local-prototype.md).

El contrato funcional anterior conserva la dirección objetivo; no todos sus casos equivalen a capacidades habilitadas. Quedan fuera del contrato local: costOverride en request, salarios variables por periodo, consumo AI medido, fees porcentuales sobre ingresos, setups amortizados, rounding comercial, múltiples ajustes y servicios compuestos. Los inputs no implementados se rechazan, sin simular soporte. Corrección del 2026-10-10: esa lista describe el contrato 1.0.0. El redondeo comercial y varios ajustes sobre filas disjuntas, incluido el neto pactado, existen en el contrato 1.1.0; el resto de la lista sigue fuera de ambos. No se ha contrastado todo V2/V3, adoptado catálogo operativo ni integrado consumers UI/API/MCP/Nexa. La combinación Colombia→Chile devuelve pendientes honestos.
