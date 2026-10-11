# Cotizador V3: contrato del prototipo y plan de validación/convergencia

[Readback vigente del código y contratos](cotizador-v3-superficie-implementada.md): 135 testsV3 y 78 V2, 26 smokesCLI de TASK-2022. La tabla objetivo y el readback de la primera vertical que siguen no limitan el flujo operativo actual a TASK-2016.

- Fecha: 2026-10-09.
- Estado: contrato objetivo de bloques 2 y 3; núcleo y flujo local implementados en TASK-2016/2019/2020/2021/2022. La evidencia comercial y la integración canónica siguen pendientes.
- Owner de cálculo y economics: Commercial/Finance. Owner técnico del contrato y transición: Platform/Architecture.
- Modelo funcional: [prototipo V3](cotizador-cli-modelo-propuesto.md).
- ADRs de referencia: [Quote API Parity](../../architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md) y [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).

Esta definición fija comportamiento, estructura y criterios de aceptación. No fija salarios, porcentajes de tier, factores comerciales, tarifas, piso de margen o costos de Talent Assurance. El [manual ejecutable](../../manual-de-uso/finance/cotizar-v3-por-cli.md) distingue operaciones implementadas y límites de los contratos locales: 1.0.0 y, desde el 2026-10-10, 1.1.0 (ver [Contrato 1.1.0](#contrato-110--ajustes-comerciales-y-redondeo-2026-10-10)). El cotizador canónico no cambia.

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
| `schemaVersion`                              | Obligatorio; versión inicial `1.0.0`; desde el 2026-10-10 también `1.1.0`, con su propio motor; rechazar versión no soportada   |
| `quoteDate`                                  | Fecha ISO `YYYY-MM-DD`, válida y explícita; el agente puede proponer la fecha actual, pero la registra en la solicitud          |
| `offerId`, `deliveryModel`, `engagementCode` | Oferta, modalidad de entrega y engagement separados; resolver desde catálogo, sin crear otra oferta por usar Staff Augmentation |
| `offerMarketCountry`                         | País/mercado de venta confirmado, código ISO de país; mercados regionales requieren futura extensión expresa                    |
| `outputCurrency`                             | Moneda explícita y habilitada en el registro de monedas; ninguna moneda se deduce del país                                      |
| `duration`                                   | En V1: `{ unit: "month", periods: entero positivo }`; meses completos, sin prorrateo de días implícito                          |
| `lines[]`                                    | Al menos una línea; cada línea con `lineId` único, perfil resuelto y cantidades válidas                                         |
| `adjustments[]`                              | Opcional; ausencia significa ninguna modificación solicitada, sin desactivar reglas automáticas explícitas del paquete. `1.0.0`: a lo más un `discount`; `1.1.0`: hasta 10, `discount` o `agreed_net`, sobre filas disjuntas |
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

**Versiones.** El kernel acepta dos contratos de entrada y firma cada resultado con el motor de su contrato. El registro cerrado es `PRICING_V3_ENGINES` (`schemas.ts`); `ENGINE_VERSION` dejó de existir. Cada contrato nombra su propia aritmética en `precisionPolicy` (`PRICING_V3_PRECISION_POLICIES`, `calculate.ts`).

| `schemaVersion` de request y snapshot | `engineVersion` del resultado | Qué admite |
| --- | --- | --- |
| `1.0.0` | `pricing-v3-local/1.0.0` | Lo de siempre, byte a byte: a lo más un `discount`, sin redondeo comercial. Rechaza cualquier campo nuevo |
| `1.1.0` | `pricing-v3-local/1.1.0` | Hasta 10 ajustes (`discount` o `agreed_net`) sobre filas disjuntas y `snapshot.priceRounding` opcional |

- La versión la declara la entrada, y request y snapshot llevan la misma. El motor no la infiere ni la sube. Una entrada que no declara `1.1.0` (otra versión, ninguna o un documento mal formado) se juzga con el esquema 1.0.0 y conserva los diagnósticos de siempre.
- En el carril de catálogo y composición el que llama no elige contrato: la resolución emite `1.1.0` sólo si el brief trae un ajuste que no sea un único `discount`, más de un ajuste, o si el catálogo tiene una regla `price_rounding` vigente a `quoteDate` para la moneda de salida. En cualquier otro caso emite `1.0.0`. La decisión depende sólo de lo congelado, así que una cotización anterior vuelve a resolver al mismo contrato y al mismo digest.
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

**Forma del resultado.** Filas y totales de un resultado 1.1.0 agregan `roundingAdjustment` y `uplift`. Identidad: `net = undiscountedPrice + uplift − discount`, y `undiscountedPrice` ya incluye el redondeo (precio de política = `undiscountedPrice − roundingAdjustment`). Un resultado 1.0.0 no tiene ninguna de las dos claves: no van en cero, no van, porque agregarlas cambiaría el digest de los artefactos anteriores. Los totales de una quote de catálogo o composición suman las dos claves sólo cuando la quote es 1.1.0.

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
