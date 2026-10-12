# Cotizador V3: contrato del prototipo y plan de validación/convergencia

[Readback vigente del código y contratos](cotizador-v3-superficie-implementada.md): 135 testsV3 y 78 V2, 26 smokesCLI de TASK-2022. La tabla objetivo y el readback de la primera vertical que siguen no limitan el flujo operativo actual a TASK-2016.

- Fecha: 2026-10-09.
- Estado: contrato objetivo de bloques 2 y 3; núcleo y flujo local implementados en TASK-2016/2019/2020/2021/2022. La evidencia comercial y la integración canónica siguen pendientes.
- Owner de cálculo y economics: Commercial/Finance. Owner técnico del contrato y transición: Platform/Architecture.
- Modelo funcional: [prototipo V3](cotizador-cli-modelo-propuesto.md).
- ADRs de referencia: [Quote API Parity](../../architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md) y [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).

Esta definición fija comportamiento, estructura y criterios de aceptación. No fija salarios, porcentajes de tier, factores comerciales, tarifas, piso de margen o costos de Talent Assurance. El [manual ejecutable](../../manual-de-uso/finance/cotizar-v3-por-cli.md) distingue operaciones implementadas y límites de los contratos locales: 1.0.0, desde el 2026-10-10 1.1.0 (ver [Contrato 1.1.0](#contrato-110--ajustes-comerciales-y-redondeo-2026-10-10)) y desde el 2026-10-11 1.2.0 (ver [Contrato 1.2.0](#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11)) y 1.3.0 (ver [Contrato 1.3.0](#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11)) y, desde la noche de ese mismo día, 1.4.0 (ver [Contrato 1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11)): cinco contratos conviven. El cotizador canónico no cambia. Las claves del resumen que imprime la CLI, los avisos de la corrida y la lectura de exposición a datos estimados, también del 2026-10-11, están en [Resumen: avisos de la corrida y exposición a estimados](#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11). El contrato de la lectura que emite el documento de cotización para el cliente, de la noche de ese mismo día, está en [Documento de cotización: `compose document`](#documento-de-cotización-compose-document-2026-10-11); no agrega ni cambia ningún contrato del kernel. Lo último de ese día, después de cotizar el primer caso real, está en [Demanda de composición: asientos y períodos declarados una vez](#demanda-de-composición-asientos-y-períodos-declarados-una-vez-2026-10-11) y en [`--out`: una cotización calculada o nada](#--out-una-cotización-calculada-o-nada-2026-10-11); las opciones adicionales y la línea bonificada del documento están dentro de su sección. Tampoco agregan ni cambian un contrato del kernel.

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
- Desde el 2026-10-11 el **brief** (catálogo y composición, nunca el kernel) admite una tercera clase, `agreed_total`: el neto de sus líneas en todo el plazo —o, con `per: "period"` (cierre del 2026-10-11), en cada período—, que la resolución convierte en un `agreed_net` por período y clase antes de llegar al kernel. Contrato: [Precio por todo el plazo](#precio-por-todo-el-plazo-agreed_total-del-brief-2026-10-11).
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

**Fuera de 1.1.0.** Redondeo sobre el total del período, terminaciones comerciales (se expresan como `agreed_net`), ajustes de otra clase y ajustes encadenados sobre una misma fila. Un precio por todo el plazo no es un ajuste de otra clase del kernel: desde el 2026-10-11 es una declaración del brief que se resuelve a netos acordados de este contrato.

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

**Fuera de 1.3.0.** Una forma híbrida (se cotiza como dos cotizaciones: una base On-Demand y una operación On-Going) y una de licencia o consultoría, que no están cargadas; un tope para la razón; y períodos de menos de un mes (se expresan como horas dentro de un período). La duración del contrato no es un dato de entrada de este contrato ni de ninguno: una cotización tiene períodos, no un plazo, y desde el 2026-10-11 (cierre) eso es una decisión del CEO y no un pendiente (ver [Una cotización no es un contrato](#una-cotización-no-es-un-contrato-2026-10-11)). Los costos de terceros de un trabajo y una reserva de contingencia para alcance fijo también quedaron fuera de 1.3.0; se construyeron esa misma noche como [contrato 1.4.0](#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11).

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
  ajuste del kernel que llega a una fila de terceros es un `agreed_net` con `billing: "third_party"` que nombra
  `costId` en `lineIds`; con él la fila se puede marcar bajo el piso de su categoría (`MARGIN_BELOW_FLOOR`) como
  cualquier otra. Desde el 2026-10-11 ese neto puede venir también de un `agreed_total` del brief que nombra el
  `costId`: la resolución lo reparte y le entrega al kernel el mismo `agreed_net`
  ([contrato](#precio-por-todo-el-plazo-agreed_total-del-brief-2026-10-11)).
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
  `compose assess` agrega `margin.ownWorkRate`, el margen del trabajo propio. (Ese contrato leía además sobre él
  una comparación genérica 40 %/35 %, con `proposedFloorReadOn` y `belowProposedFloor`; se retiró al final del
  2026-10-11. `margin` trae ahora `pricingPolicies[]`, `thirdPartyPolicies[]` y `belowPolicyFloor`, que es `true`
  sólo si el kernel marcó una fila.) `compose preview` muestra el fee como trabajo propio, un ítem por
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
Sigue abierto de antes: una licencia comprada para el trabajo, períodos de menos de un
mes, la forma híbrida, las cotizaciones en EUR y una vista para el cliente de las lecturas internas. La duración del
contrato, que esta lista traía, no sigue abierta: desde el 2026-10-11 (cierre) queda fuera del cotizador por decisión
([Una cotización no es un contrato](#una-cotización-no-es-un-contrato-2026-10-11)).

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

- **Asientos ociosos (2026-10-11, tras el primer caso real).** `compose commitments` tiene una cuarta clase de entrada, la única que está dentro de los períodos cotizados: `kind: "idle_seat"`, una por herramienta y plan con asientos que la demanda declara ociosos (`idleSeats`). Trae `periodIds`, `seats` (`unit`, `unitPrice`, `byPeriod[]` con `paid` e `idle`, `idleSeatMonths` y `reasons`), `committed` (asientos ociosos ÷ asientos pagados × el costo que el kernel guardó para ese plan en cada período: ya está dentro de `totals.cost`, no es un monto para sumar), `coveredByUse` (siempre cero), `carriedBy` (`lines_that_use_the_tool` o `lines_named_by_the_demand`, con sus líneas) e `incrementalCash: null`. `notDerivable` declara dos cosas que el artefacto no dice: si el asiento ya existe o hay que comprarlo, y si el proveedor permite soltarlo, pausarlo o dárselo a otra persona (`seats.release`). La señal es `PAID_SEAT_IDLE_WITHIN_ENGAGEMENT`; los totales agregan `idleSeats` (`count`, `idleSeatMonths`, `committed`, `coveredByUse`) y `reviewed` agrega `holdingsWithIdleSeats`. Un asiento ocioso nunca se cuenta otra vez en una entrada de precio anual o con plazo, que leen los meses posteriores a la cotización. Una cotización que no declara asientos ociosos no trae entrada, señal ni total de esta clase. `compose assess` agrega las brechas `IDLE_SEAT_COST_REVIEW` (owner Operations/Commercial) y `SHARED_SEAT_TERMS_REVIEW` (owner Operations/Legal), una por herramienta y período.

Estas lecturas contienen costo y margen. Son vistas internas, no documentos para el cliente. El documento para el cliente es otra lectura, con su propio contrato: la sección siguiente.

### Documento de cotización: `compose document` (2026-10-11)

Una quinta operación lee un artefacto de composición sin recalcular precios: `compose document` emite los datos del documento de cotización para el cliente, que la [plantilla A4](../../commercial/templates/cotizacion-a4/README.md) convierte en HTML y PDF. Verifica el artefacto por replay, no cambia ningún total y no agrega ni modifica un contrato del kernel: una cotización congelada con cualquiera de los contratos de composición se lee igual. Qué es y por qué existe: [superficie implementada](cotizador-v3-superficie-implementada.md#el-documento-de-cotización-para-el-cliente-2026-10-11). Fuentes ejecutables: [`resources/quote-document.ts`](../../../src/lib/finance/pricing-v3/resources/quote-document.ts) y, para lo que un cliente puede ver, `clientSafePeriodItems` en [`resources/readiness.ts`](../../../src/lib/finance/pricing-v3/resources/readiness.ts). El contrato de los datos emitidos y las reglas de composición pertenecen a la plantilla y no se repiten aquí: [versión 2 de sus datos](../../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio).

| Operación | Salida que imprime | Entrada además del artefacto | Salida | Falla |
| --- | --- | --- | --- | --- |
| `compose document` sin `--brief` | Andamio `pricing-v3-quote-document-scaffold/1`; `--out` guarda sólo su `brief` | — | 2 | Los rechazos que dependen de la cotización (ver tabla), salida 1 |
| `compose document --brief` | Datos del documento, `version: 2` de la plantilla A4; `--out` los guarda | `--brief`: objeto JSON `pricing-v3-quote-document-brief/1` | 3 | Todos los de la tabla, salida 1 |

Las dos formas admiten además `--option <clave>=<artefacto>`, repetible, hasta ocho veces (2026-10-11, tras el primer caso real): la cotización congelada de una opción adicional, verificada por replay igual que `--input`. La clave empieza con una letra o un dígito y admite letras, dígitos, `_` y `-`, hasta 40 caracteres. Un `--option` sin `=`, sin ruta o con una clave inválida o repetida es `INVALID_ARGUMENT` con `option: "option"`.

Desde el cierre del 2026-10-11 las dos formas admiten también `--increment <clave>=<artefacto>`, repetible: una opción adicional que amplía la cotización base, entregada como la cotización congelada **del servicio con el adicional adentro** y verificada por replay igual que `--input`. Comparte con `--option` la forma de la clave, el límite (ocho entre las dos) y el bloque `options` del brief. Una clave no puede usarse en las dos: la segunda vez es `INVALID_ARGUMENT`, con `option` igual a la opción que la repite (`option` o `increment`). Qué se exige de ese artefacto: «Opción entregada como incremento», más abajo en esta sección, y [la lectura del incremento](#incremento-de-un-adicional-compose-increment-2026-10-11).

**Dos fuentes separadas.** La cotización congelada entrega toda cifra; el brief, todo texto y la presentación de las líneas. La fecha del documento es la `quoteDate` de la cotización y la moneda es su moneda de salida, sin conversión. El andamio lista las cifras para quien escribe los textos; ninguna pertenece al brief.

**El brief (`pricing-v3-quote-document-brief/1`).** Todos sus objetos son estrictos. No existe en el schema, en ningún nivel, una clave para un importe, una moneda, una tasa de impuesto o una fecha: un brief que trae una se rechaza en vez de ignorarse.

| Clave | Contenido | Obligatoria |
| --- | --- | --- |
| `schemaVersion`, `reference` | La versión del brief y la referencia documental (una línea) | Sí |
| `supplier` | `name`, `taxId`, `contact`, `email` y `phone` | Sí |
| `buyer` | `name`, `taxId`, `unit` opcional (el área del cliente a la que se dirige el documento; obligatorio hasta el 2026-10-11), `contact` opcional (cierre del 2026-10-11: la persona a quien va dirigido, que la portada imprime tras «Atención:»; un texto propio, nunca en `unit`) y `logo` opcional (`{ path, source }`: un archivo local y la fuente HTTPS oficial de donde se tomó; o `null`) | Sí |
| `cover` | `label`, `title`, `subtitle` y, desde el 2026-10-11, `netLabel` opcional: el rótulo del neto en la portada, en lugar del de la plantilla. Un texto, nunca un importe | Sí |
| `service` | `name` | Sí |
| `scope` | `title`, `intro` y de 1 a 7 `rows` de `{ title, text }` | Sí |
| `schedule` | El calendario **del trabajo**: `title`, `note` opcional (una línea junto al título; obligatoria hasta el 2026-10-11) y de 1 a 3 `phases` de `{ label, title, text }` | Sí |
| `pricing` | `title`, `intro`, `summary` y `taxNote`; opcionales `taxLabel` (el nombre del impuesto) y `monthly` (`{ months, note }`: una cantidad de meses de 1 a 120, no un importe) | Sí |
| `conditions` | `title` y de 1 a 6 `rows` de `{ title, text }` | Sí |
| `locale` | Locale BCP 47 con que la plantilla da formato; sin él, la plantilla lo elige por la moneda | No |
| `lines` | Presentación de las líneas, por clave: `{ label?, detail?, group?, courtesy? }`. `courtesy: true` sólo en una clave que la cotización bonifica por completo | No |
| `combine` | Desde el 2026-10-11: lista de 1 a 40 entradas `{ keys, label, unit, detail?, group?, per? }`. Cada una imprime sus claves como una sola línea, un precio por todas ellas. Desde el cierre de ese día, `per: "period"` las suma mes a mes y las imprime como meses; esa forma no lleva `unit` | No |
| `options` | Nombre y unidad de cada opción adicional, por la clave con que se entregó su artefacto: `{ <clave>: { label, unit, detail? } }`. Nombra exactamente las opciones de la corrida, las de `--option` y las de `--increment` | Sí, si la corrida recibe `--option` o `--increment`; no se admite sin ninguno |
| `optionsTexts` | `{ title?, note? }` del bloque de opciones; sólo junto con opciones | No |
| `paymentMilestones` | De 1 a 12 hitos, la misma lista que recibe `compose schedule --milestones`: `{ id, label, share, periodId? \| when? }` | No |
| `paymentScheduleTexts` | `{ title?, note? }` del calendario de pagos; sólo junto con `paymentMilestones` | No |

Un texto de una línea tiene hasta 300 caracteres y no admite saltos; un párrafo, hasta 2.000. Un `title` es una línea o un arreglo de una a tres. Un texto vacío no pasa: por eso un andamio sin llenar se rechaza y nunca llega a ser un documento. El andamio no deja hueco para `buyer.unit`, `schedule.note` ni `cover.netLabel`: se omiten cuando sólo dirían lo que cualquier cotización implica; una clave presente es un texto no vacío.

**Claves de línea.** Sirven para que el brief nombre una línea; nunca se imprimen ni viajan en los datos. Una clave que la cotización no tiene es un error, porque un error de tipeo dejaría una línea con el nombre que nadie eligió.

| Cotización | Claves |
| --- | --- |
| Servicio gestionado | `fee`, `setup` y `third_party:<costId>` |
| Vendida por líneas | `<lineId>`, `<lineId>:setup` y `third_party:<costId>` |

**Cómo se forman las líneas.** Por clave, los períodos consecutivos con el mismo neto son una línea: `quantity` `{ value: n, unit: "meses" }` (o `"mes"`), `unitNet` el neto de un período y `net` su producto exacto. Un cobro que cae en un solo período y no es recurrente (puesta en marcha, costo de terceros) es `{ value: 1, unit: "pago único" }`, sin `unitNet`. Una clave cuyo neto cambia produce una línea por tramo, con los meses como `detail` salvo que el brief dé uno. Un período con neto cero no produce nada, salvo que su clave sea una línea bonificada que el brief marca (párrafo siguiente). Los grupos por defecto son «Servicio», «Puesta en marcha» y «Costos de terceros»; las líneas se ordenan por la primera aparición de su grupo.

**Claves combinadas (`combine`, 2026-10-11).** Una combinación es una línea impresa para varias claves de la cotización, o para una sola: `quantity` `{ value: 1, unit }` con la unidad que escribe el brief («programa», «proyecto», «servicio»), sin `unitNet`, y `net` igual a la suma exacta de todos los tramos de todas sus claves en todo el plazo. Esas claves no imprimen línea propia, así que las líneas suman el mismo neto con o sin combinaciones. La línea queda donde aparece la primera de sus claves en la cotización y, sin `group`, en el grupo por defecto de la primera clave que lista el brief. Es presentación: nombra claves y textos, nunca un importe. Una combinación no puede esconder una clave ni contarla dos veces, y cada caso es su propia regla: `unknown_key` (la cotización no tiene esa clave), `key_not_charged` (la cotización la bonifica por completo: una cortesía se imprime con su marca en `lines`), `duplicate_key` (ya está en esta combinación o en una anterior) y, en `lines`, `key_is_combined` (una entrada para una clave que no tiene línea propia). Una entrada se reporta por su posición (`combine.<n>`) y una clave por la suya (`combine.<n>.keys.<m>`).

**Combinación por período (`per`, cierre del 2026-10-11).** `per` dice sobre qué se suman las claves. `"term"`, o su ausencia, es el párrafo anterior, y la entrada debe nombrar `unit` (`missing_unit`). `"period"` suma las claves dentro de cada mes y pliega esas sumas como los netos de una sola clave: los meses consecutivos con la misma suma son una línea, `quantity` `{ value: n, unit: "meses" }` (o `"mes"`), `unitNet` la suma de un mes y `net` su producto; un mes en que la suma cambia, o en que ninguna de las claves se cobra, empieza otra línea, y cada una dice sus meses salvo que el brief dé un `detail`. Siempre se cuenta en meses y lleva `unitNet`, cualesquiera sean las clases de las claves que suma. La entrada no nombra `unit`: una que la trae se rechaza (`unit_not_allowed_per_period`) en vez de leerse de largo, porque ese texto no se imprimiría. Cualquier otro valor de `per` es `invalid_per`. Cada mes de cada clave está en exactamente una de esas sumas, así que las líneas suman lo mismo. Es como se imprime una cotización pactada con `agreed_total` y `per: "period"`.

**Línea bonificada (`courtesy`).** Una clave está bonificada cuando la cotización la deja en neto cero con un ajuste explícito en todos los períodos en que aparece (un `agreed_net` de `0` o un descuento que la anula) y no la cobra en ninguno. Por defecto no imprime nada y el brief no puede nombrarla. Con `lines.<clave>.courtesy: true`, se imprime con `net: "0"`, sin `unitNet`, y con `referenceNet`: el precio que la fila tenía antes de la rebaja (`undiscountedPrice`), sumado sobre los períodos consecutivos en que está bonificada. Ese valor sale de una función propia y segura para el cliente (`clientSafeWaivedItems` en [`resources/readiness.ts`](../../../src/lib/finance/pricing-v3/resources/readiness.ts)), el único lugar del que sale un valor de referencia; `compose preview` no cambió. La línea ocupa el lugar que tendría si se cobrara, cuenta contra el límite de 40 líneas y no suma al neto, al impuesto ni al total, ni a los meses y pagos que cuenta la tolerancia del impuesto. El andamio lista las claves bonificadas bajo `waived[]`, cada una como se imprimiría, y no marca ninguna: una cortesía se pide, nunca se supone.

**Opciones adicionales (`--option`, `options`).** Cada opción es la cotización congelada de esa opción sola. Su precio es el neto de uno de sus períodos, tal como el kernel lo congeló, y viaja en los datos como `options.items[]` (`label`, `detail?`, `net`, `unit`), con `options.title` y `options.note` del brief o sus textos por defecto. Para que un solo importe diga todo de la opción se exige que la cotización de la opción:

- esté calculada, con totales en todos sus períodos;
- esté en la moneda de la cotización base;
- tenga el mismo neto en todos sus períodos, y que su neto total sea ese importe por el número de períodos;
- no declare costos que el cliente paga directo;
- no sea la cotización base ni la de otra opción de la misma corrida.

Nada de una opción llega a las líneas, al neto, al impuesto ni al total de la cotización base. El brief no tiene clave para el precio de una opción. `source` agrega, por opción y en el orden en que se imprimen, `option<n>CalculationId` y `option<n>Digest`. El rótulo que dice que las opciones están fuera de la cotización lo pone la plantilla: [versión 2 de sus datos](../../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio).

**Opción entregada como incremento (`--increment`, 2026-10-11, cierre).** Ocupa el lugar de una opción en todo salvo en el origen de su precio: en vez del neto de una cotización de la opción sola, es lo que el adicional le suma al neto de un período de la cotización del documento. La CLI lee primero el incremento entre el artefacto de `--input` y el de `--increment` ([`compose increment`](#incremento-de-un-adicional-compose-increment-2026-10-11)); si las dos cotizaciones no son comparables, la corrida se rechaza con el código `QUOTE_INCREMENT_*` de la regla que falló y nada se aproxima. `QUOTE_DOCUMENT_OPTION_INVALID` cubre sólo las reglas propias del documento sobre un incremento ya comparable, que exige además que:

- sea un incremento sobre la cotización del documento y sobre ninguna otra;
- el adicional sume el mismo neto en cada período comparado (`netIncrementPerPeriod` no es `null`), y ese importe se pueda escribir en la moneda y no sea cero;
- la cotización con el adicional no agregue un costo que el cliente paga directo y que la cotización del documento no tenga;
- la cotización con el adicional no sea la del documento ni la de otra opción de la misma corrida.

El importe viaja en `options.items[]` igual que el de cualquier opción, y el brief la nombra igual. El costo y el margen del incremento no forman parte de los datos. `source` agrega para esa opción `option<n>CalculationId` y `option<n>Digest` de la cotización **con el adicional**, y `option<n>Basis: "increment"`; una opción de `--option` no trae `option<n>Basis`. En el andamio, su entrada de `options[]` trae `basis: "increment"`, `periods` es el número de períodos comparados y `optional` agrega la nota `options (increment)`.

**Regla de impuesto.** El documento imprime el impuesto que la cotización congeló; ni esta lectura ni la plantilla calculan otro.

| `taxTreatment` de la cotización | Lo que viaja en los datos | Lo que se exige |
| --- | --- | --- |
| `exclusive` | `vatRate` (la tasa) y `taxAmount` = `totals.tax` | La tasa está entre 0 y 1 y tiene hasta 4 decimales; `taxAmount` difiere del impuesto calculado una vez sobre el neto en, como máximo, una unidad menor de la moneda por cada **período de la cotización**; la cotización tiene de 1 a 120 períodos; y neto más impuesto es exactamente `totals.grandTotal`. Viaja además `taxPeriods`, el número de períodos, para que la plantilla aplique la misma tolerancia |
| `not_resolved` | `vatRate: null`; la plantilla imprime impuesto y total «Por confirmar» | La cotización no trae impuesto ni total |
| `not_applicable` | `vatRate: null` y `taxStatus: "not_applicable"`; la plantilla imprime «No aplica» y el total es el neto | El impuesto es cero y el total es igual al neto |

La tolerancia existe porque el kernel redondea el impuesto de cada período y suma; el impuesto del neto entero redondeado una sola vez puede ser otra cifra. Más allá de esa tolerancia el importe no es el impuesto de esa tasa sobre ese neto y no se emite nada. Hasta el 2026-10-11 la tolerancia se contaba por los meses o pagos que sumaban las cantidades de las líneas; desde ese día se cuenta por los períodos de la cotización, que es un hecho de la cotización y no de su presentación: combinar tres meses en un precio no cambia si un impuesto se acepta. Una cotización pactada con `agreed_total` bajo un impuesto exclusivo se reparte de modo que la diferencia es cero.

**Bloques opcionales.** Son tres; el tercero, `options`, está descrito arriba. `clientPaidDirectly[]` aparece sólo si la cotización declara costos que el cliente paga directo: concepto, importe y moneda tal como se declararon, con los meses como detalle; fuera de toda línea, suma y conversión. `paymentSchedule` aparece sólo si el brief declara `paymentMilestones`: los importes los calcula la lectura del calendario de pagos, suman exactamente el neto, y cada hito necesita `periodId` o `when` (la lectura `compose schedule` admite un hito sin ninguno; un documento que pide un pago dice cuándo). Desde el 2026-10-11, cuando la cotización resolvió su impuesto a una tasa exclusiva, cada hito viaja con `net`, `tax` y `total`: su parte del impuesto congelado y su total. Las partes suman el impuesto y el total de la cotización, cada `total` es su `net` más su `tax`, y el impuesto de un hito se sostiene contra la tasa sobre su neto dentro de la tolerancia del impuesto de la cotización más una unidad por el redondeo del reparto (`tax_not_representable`, `tax_differs_from_rate` y `tax_differs_from_quote` en `paymentSchedule.milestones`, las tres bajo `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE`). Un calendario cuyos hitos llevan impuesto no trae la nota por defecto «Importes netos, sin impuestos»; sólo la que escriba el brief.

**Lo que se rechaza.** Todos con salida 1. `option` dice qué corrige quien llama: `brief` (sus textos, sus claves de línea o de opción, o sus hitos), `input` (la cotización misma), `option` (la cotización de una opción) o `increment` (la cotización del servicio con el adicional, de una opción entregada con `--increment`). `issues[]` trae hasta 20 ubicaciones `{ path, rule }`; una entrada de `lines` o de `options` se reporta por su posición (`lines.2`, `options.0`), nunca por su clave ni por su contenido.

| `code` | `option` | Cuándo | Reglas (`rule`) |
| --- | --- | --- | --- |
| `QUOTE_DOCUMENT_BRIEF_INVALID` | `brief` | El brief no cumple su schema, nombra una línea que la cotización no tiene, o declara mal el calendario | `unrecognized_keys` (una clave que el schema no define: es lo que recibe un importe, una moneda, una tasa o una fecha); la regla del validador en la ruta de un texto vacío o mal formado; `unknown_key`, `not_an_object`, `unknown_field`, `invalid_label`, `invalid_detail`, `invalid_group` en `lines.<posición>`; `requires_payment_milestones` en `paymentScheduleTexts`; `timing_required` en `paymentMilestones.<posición>`. Desde el 2026-10-11: `invalid_courtesy` (no es un booleano) y `line_is_charged` (la marca está en una línea que se cobra) en `lines.<posición>.courtesy`; `unknown_key` también para una clave bonificada que el brief nombra sin marcarla; en `options`, `option_not_named` (el brief no nombra una opción entregada, o no trae `options` habiendo `--option`), y en `options.<posición>`, `unknown_key` (nombra una opción que no se entregó), `not_an_object`, `unknown_field`, `missing_label`, `missing_unit`, `invalid_label`, `invalid_unit` e `invalid_detail`; `requires_options` en `optionsTexts` |
| `SCHEDULE_MILESTONES_INVALID` | `brief` | La lista de hitos no pasa las reglas de `compose schedule`; el código es el de esa lectura y la ruta empieza en `paymentMilestones` | Las de esa lectura, por ejemplo `shares_must_sum_to_one` |
| `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE` | `input` | La cotización está bloqueada o no tiene totales | — |
| `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP` | `input` | Las líneas, o los hitos del calendario, no suman exactamente el neto de la cotización | `sum_differs_from_net` |
| `QUOTE_DOCUMENT_NOT_REPRESENTABLE` | `input` | Un importe no se puede escribir en su moneda, o el contenido excede lo que la plantilla admite | `currency_not_supported`, `amount_not_representable`, `negative_net`, `duplicate_key` (dos filas de un período sobre la misma clave), `empty`, `too_many` (más de 40 líneas o más de 8 costos pagados por el cliente), `quantity_not_representable` (una cantidad mayor que 9999); `reference_not_representable` en `lines.<posición>.courtesy` (el valor de referencia de una línea bonificada no se puede escribir en la moneda) |
| `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE` | `input` | El impuesto congelado no corresponde a su tratamiento o a su tasa | `tax_inconsistent`, `rate_not_representable`, `amount_not_representable`, `tax_differs_from_rate`, `total_differs_from_document`; desde el 2026-10-11, `too_many` en `periods` (más de 120 períodos) |
| `QUOTE_DOCUMENT_OPTION_INVALID` | `option`, o `increment` si la primera opción reportada se entregó con `--increment` | Una opción no se puede imprimir como un solo importe, o las opciones de la corrida están mal entregadas. Cada opción se reporta por su posición en la lista de la corrida, que reúne `--option` y `--increment` en el orden en que se escribieron (`options.<posición>`) | `not_calculated`, `currency_differs_from_quote`, `net_differs_between_periods`, `periods_differ_from_net`, `amount_not_representable` (también un neto de cero), `client_pays_costs_directly`, `same_as_quote` (es la cotización base), `duplicate_option` (la misma cotización dos veces), `invalid_key`, `duplicate_key`; `too_many` en `options` (más de 8). Sólo de una opción entregada como incremento: `increment_of_another_quote` (el incremento no es sobre la cotización del documento); `net_differs_between_periods` significa ahí que el adicional no suma lo mismo en cada período comparado |
| `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES`, `QUOTE_INCREMENT_CONTEXT_DIFFERS`, `QUOTE_INCREMENT_VERSIONS_DIFFER`, `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE`, `QUOTE_INCREMENT_BASE_NOT_CONTAINED`, `QUOTE_INCREMENT_NET_NOT_POSITIVE` | `increment` | Desde el cierre del 2026-10-11: la cotización de `--input` y la de un `--increment` no son comparables. El código es el de la lectura del incremento y cada ruta lleva delante `options.<posición>.` | Las de [esa lectura](#incremento-de-un-adicional-compose-increment-2026-10-11), por ejemplo `options.0.base.lines.1.periods.2` con `dedication_smaller` |

Los cuatro rechazos con `option: "input"` no se arreglan editando el brief ni los datos: se corrige la cotización y se vuelve a emitir. Lo mismo vale para `QUOTE_DOCUMENT_OPTION_INVALID`: se corrige la cotización de la opción, o cómo se entregó, nunca su precio a mano. Y para los `QUOTE_INCREMENT_*`: se corrige la cotización del servicio con el adicional hasta que contenga a la base bajo los mismos términos, o se entrega el adicional con `--option` si en realidad es sólo una persona nueva o un trabajo aparte. Un artefacto alterado se rechaza antes, con `REPLAY_MISMATCH`, y `option` nombra la opción que lo trae (`input`, `option` o `increment`).

**Qué garantiza y qué no.** Los datos llevan siempre `status: "draft"`: una composición es una simulación en revisión y esta lectura no aprueba nada. `source` (`system`, `calculationId`, `digest`, `engineVersion`) nombra el cálculo de origen; la plantilla lo copia a su manifiesto y no imprime nada de él. `compose preview` no cambió: imprime la misma proyección período por período. La lectura no emite una cotización, no crea una `quotation_id` y no escribe en Greenhouse ni en el CRM.

**Límites.** Un servicio gestionado no tiene puesta en marcha en el catálogo (`managed-service-core` no la pide), así que su cotización no tiene una fila que bonificar: su «puesta en marcha bonificada» es un texto del brief sin valor de referencia (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC` en el ledger). Una opción que sólo agrega dedicación de personas que ya están en la cotización base, entregada con `--option`, es una línea nueva en su propia cotización y vuelve a llevar el fee de plataforma por línea y su parte de las herramientas base: su costo está sobrestimado y su margen es una cota inferior, sin efecto sobre el precio impreso. Dejó de ser un límite en el cierre del 2026-10-11: ese adicional se entrega con `--increment` y su costo y su margen se leen con `compose increment` (`OPTION_QUOTES_REPEAT_PER_LINE_FEES`, cerrado en el ledger). Los textos se escriben por cotización; no vienen de un catálogo ni de una biblioteca de condiciones. El reparto en persona y kit de `compose split` no es una forma del documento. La moneda del documento es la de la cotización: la versión 2 de la plantilla rechaza una moneda de presentación distinta. Número de cotización, versiones, verificación por QR, firmas, aprobación y envío no existen aquí. Portada, alcance y condiciones son páginas fijas: un contenido que no cabe hace fallar al generador de la plantilla («Contenido fuera del A4»), después de que esta lectura ya emitió los datos.

### Incremento de un adicional: `compose increment` (2026-10-11)

Una sexta operación lee artefactos de composición sin recalcular precios, y es la única que lee dos: `compose increment` valora un adicional que amplía una cotización como la diferencia entre la cotización base y la cotización **del mismo servicio con el adicional adentro**. Verifica los dos artefactos por replay, no cambia ningún total y no agrega ni modifica un contrato del kernel. Cada cifra es un importe congelado de una cotización menos el mismo importe congelado de la otra. Qué es y por qué existe: [superficie implementada](cotizador-v3-superficie-implementada.md#un-adicional-que-amplía-la-base-se-lee-como-un-incremento-2026-10-11). Fuente ejecutable: [`resources/quote-increment.ts`](../../../src/lib/finance/pricing-v3/resources/quote-increment.ts).

| Operación | Salida que imprime | Entrada | Salida | Falla |
| --- | --- | --- | --- | --- |
| `compose increment` | Lectura `pricing-v3-quote-increment/1`; `--out` la guarda | `--input`: el artefacto de la cotización con el adicional. `--base`: el artefacto de la cotización base. No admite `--current`, catálogo, policy ni créditos | 3 | Los seis rechazos de la tabla, `REPLAY_MISMATCH`, `MISSING_ARGUMENT` (falta `--base` o `--input`), `INVALID_ARGUMENT` y `OUTPUT_EXISTS`; todos con salida 1 |

Es una lectura interna: contiene costo y margen, y lo declara con `audience: "internal"` y `binding: false`. Nunca se le muestra a un cliente. El documento de cotización toma de ella una sola cifra, `netIncrementPerPeriod`.

**La lectura (`pricing-v3-quote-increment/1`).**

| Clave | Contenido |
| --- | --- |
| `schemaVersion`, `binding`, `audience`, `statement`, `basis[]` | La versión, `false`, `"internal"` y los textos que dicen qué es la lectura y sobre qué descansa |
| `base`, `withAddOn` | `{ calculationId, replayDigest }` de cada cotización |
| `commercialUnit`, `currency` | La unidad comercial y la moneda, iguales en las dos |
| `versions` | `{ catalog, policy, credits }`: las versiones con que se congelaron las dos |
| `comparison` | `mode` (`same_periods` o `representative_period`), `basePeriods`, `withAddOnPeriods` y `comparedPeriods` |
| `periods[]` | Por período comparado: `periodId`, `basePeriodIds` (los períodos de la base con que se compara: el suyo, o todos cuando los representa) y `base`, `withAddOn` e `increment`, cada uno `{ net, cost, marginAmount, marginRateRoundedDown }` |
| `totals` | `comparedPeriods`; `base`, `withAddOn` e `increment` sumados sobre los períodos comparados; y `costByComponentKind[]`, una entrada `{ kind, base, withAddOn, increment }` por clase de componente del kernel |
| `netIncrementPerPeriod` | Lo que el adicional le suma al neto de un período, cuando le suma lo mismo a cada período comparado; `null` si difieren |
| `changed` | `lines[]` (`lineId`, `profile`, `change`: `added` o `dedication_grew`, y por grupo de períodos las personas y la dedicación en cada cotización y `capacityIncrement`), `tools[]` (`toolId`, `label` y, por grupo de períodos, el costo en cada cotización y su `increment`; sólo las herramientas cuyo costo se movió) y `thirdPartyCosts[]` (`costId`, `settlement`, `change`: `added` o `periods_added`, y `periodIds`) |

`marginRateRoundedDown` tiene seis decimales y se redondea hacia abajo, como en el resumen de composición; es `null` si el neto no es positivo. Los importes conservan la precisión de la moneda de salida. `costByComponentKind` y `changed.tools` leen el costo congelado de los componentes, convertido con el tipo de cambio de salida de cada uno y redondeado entrada por entrada: una entrada puede diferir en una unidad, y `cost` es la cifra que suma. En `representative_period` hay un solo período comparado: el incremento es por período de la base y no se multiplica por ningún número de períodos, porque ningún dato de entrada dice en cuántos corre el adicional.

**Cuándo dos cotizaciones son comparables.** Se restan sólo cuando la diferencia puede significar el adicional y nada más. Las reglas se revisan en este orden y la primera que falla rechaza la lectura; nada se aproxima.

| `code` | Qué exige | Rutas (`path`) y reglas (`rule`) |
| --- | --- | --- |
| `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES` | Las dos están calculadas, con totales en todos sus períodos | `base` o `withAddOn`: `not_calculated` |
| `QUOTE_INCREMENT_CONTEXT_DIFFERS` | Cotizan lo mismo bajo los mismos términos: moneda de salida, oferta, cuenta, tratamiento de impuesto, forma del trabajo, código de engagement, país de mercado de la oferta, fecha de cotización, modo y declaración de contingencia; la misma unidad comercial; y la misma moneda en los totales | `brief.<campo>`: `currency_differs`, `offer_differs`, `account_differs`, `tax_treatment_differs`, `engagement_form_differs`, `engagement_code_differs`, `market_differs`, `quote_date_differs`, `mode_differs`, `contingency_differs`; `commercialUnit`: `commercial_unit_differs`; `totals.currency`: `currency_differs` |
| `QUOTE_INCREMENT_VERSIONS_DIFFER` | El mismo catálogo, la misma policy de recursos y el mismo catálogo de créditos: la misma versión y el mismo contenido | `catalog`, `policy` o `credits`: `version_differs`, o `content_differs` (la misma versión con otro contenido es otra fuente) |
| `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE` | La cotización con el adicional tiene los mismos períodos que la base (`same_periods`), o un solo período que representa a una base de varios (`representative_period`). En el segundo caso la base es igual en todos sus períodos (neto, costo y líneas) y el período representativo no cobra nada una sola vez. En las dos cotizaciones los períodos suman sus totales | `periods`: `periods_differ`; `base` o `withAddOn`: `periods_differ_from_totals`; `base.periods.<período>`: `net_differs_between_periods`, `cost_differs_between_periods`, `lines_differ_between_periods`; `withAddOn.periods.<período>`: `one_off_in_representative_period` |
| `QUOTE_INCREMENT_BASE_NOT_CONTAINED` | La cotización con el adicional contiene a la base. Cada línea de la base está en ella con el mismo `lineId`, el mismo perfil y seniority, país, modo de asignación y base de precio y de costo (policy de asignación y de precio, kit, registro de costo, equipo y costo sin localizar), con cada elección de kit que hizo la base, y en cada período en que la base la tiene, con la misma unidad de dedicación y al menos las mismas personas y la misma dedicación. Cada costo de terceros de la base está sin cambios y en al menos los mismos períodos. Cada herramienta que la base carga a una línea se sigue cargando a esa línea | `base.lines.<posición>`: `line_missing`, `profile_differs`, `country_differs`, `allocation_mode_differs`, `basis_differs`, `choice_missing`; `base.lines.<posición>.periods.<período>`: `line_not_active`, `dedication_unit_differs`, `headcount_smaller`, `dedication_smaller`; `base.thirdPartyCosts.<posición>`: `cost_missing`, `cost_differs`, `period_missing`; `base.attributions.<posición>`: `tool_missing` |
| `QUOTE_INCREMENT_NET_NOT_POSITIVE` | El neto crece en cada período comparado | `periods.<período>`: `net_increment_not_positive` |

`issues[]` trae hasta 20 ubicaciones y nunca el contenido comparado. `option` es `input` (se corrige la cotización con el adicional, que es la que se arma para ampliar la base) y es `base` sólo cuando lo único que falla es la base. Lo que el acuerdo dice del precio (descuentos, netos pactados) no se compara: es donde se escribe el precio del adicional. Al costo no se le exige nada: un adicional puede no agregar ninguno. La cotización con el adicional puede tener además líneas que la base no tiene (`change: "added"` en `changed.lines`): la regla exige que contenga a la base, no que tenga sólo sus líneas, así que un adicional mixto —más dedicación de personas de la base y una persona nueva— también se lee como incremento.

**Qué garantiza y qué no.** La lectura no cambia un precio, un costo ni un estado, no aprueba el adicional y no es un precio nuevo. No escribe en Greenhouse ni en el CRM. Qué clase de adicional se entrega así y cuál con `--option`: [superficie implementada](cotizador-v3-superficie-implementada.md#un-adicional-que-amplía-la-base-se-lee-como-un-incremento-2026-10-11).

### Una cotización no es un contrato (2026-10-11)

Decisión del CEO del 2026-10-11 (cierre): la fecha de inicio del servicio y la duración del contrato **no son datos de entrada del cotizador y no lo serán**. Son materia del contrato y no mueven ningún costo, precio ni impuesto. Ningún contrato del kernel, brief, demanda ni lectura tiene una clave para ellas, y eso no es un pendiente: donde este documento las listaba como algo «fuera» o «abierto», se lee como fuera por decisión. Lo que cada lectura supone sobre el calendario no cambia y se sigue declarando: una cotización tiene períodos, fechados desde su `quoteDate`, y una lectura que depende de un calendario dice lo que supone de él.

### Demanda de composición: asientos y períodos declarados una vez (2026-10-11)

La demanda sigue siendo `pricing-v3-composition-demand/1`. Las claves que siguen son opcionales y aditivas: una demanda que no las usa se lee, se compone y se congela exactamente igual que antes, y todos los artefactos congelados se reproducen byte a byte. No hay contrato ni motor nuevo. Qué resuelven: [superficie implementada](cotizador-v3-superficie-implementada.md#asientos-como-se-compran-y-períodos-declarados-una-vez-2026-10-11). Fuentes ejecutables: [`resources/composition-contracts.ts`](../../../src/lib/finance/pricing-v3/resources/composition-contracts.ts) y [`resources/composition.ts`](../../../src/lib/finance/pricing-v3/resources/composition.ts).

**Claves nuevas y sus reglas de «una o la otra».**

| Clave | Dónde | Regla |
| --- | --- | --- |
| `periodIds` | `allocations[]`, `work[].creditDemand[]`, `clientProvidedTools[]` y `seatSharing[]` | Arreglo de 1 a 60 períodos, sin repetir. Cada entrada lleva **exactamente una** de `periodId` o `periodIds`: las dos, o ninguna, no pasan el schema (`SCHEMA_INVALID`, salida 1) |
| `idleSeats` e `idleReason` | `allocations[]` | Van **juntas o ninguna** (una sola no pasa el schema: `SCHEMA_INVALID`): un entero de 1 a 10.000 y un texto de hasta 1.000 caracteres. Sólo en una herramienta nominativa con precio por asiento, y nunca más que los asientos que la entrada paga |
| `bornByLineIds` | `allocations[]` | Las líneas que cargan el costo de los asientos ociosos, en partes iguales. **Obligatoria** cuando nadie usa la herramienta en el período (todos los asientos de la entrada son ociosos) y **rechazada** cuando alguien la usa: entonces el costo sigue al uso |
| `seatSharing[]` | Raíz de la demanda | `{ toolId, periodId \| periodIds, assigneeIds, reason }`: dos o más personas que usan un mismo asiento. Cada persona del grupo usa la herramienta en ese período y pertenece a un solo grupo |

`creditBudgets[]` conserva una entrada por período, porque cada una lleva sus fechas de compra y de vencimiento. El portfolio (`pricing-v3-resource-portfolio/1`) conserva `periodId`. El `periodIds` de `thirdPartyCosts[]` es una clave anterior y distinta, propia del brief, y sigue siendo obligatoria.

**Una entrada con `periodIds` es la misma demanda que una entrada por período.** La composición y todas las lecturas la leen de una sola forma, período por período y en el orden declarado; `periodId` y `periodIds` no pueden significar dos cosas en dos lugares. El artefacto congela lo que se declaró: reescribir una demanda con `periodIds` da los mismos totales y otra identidad de cálculo.

**Planes de una herramienta en un período.** Una herramienta puede tener varias asignaciones en un mismo período si cada una tiene un `priceId` distinto: cada una es un plan. La misma herramienta, el mismo período y el mismo `priceId` dos veces siguen siendo `DUPLICATE_RESOURCE_ALLOCATION`.

**La regla de los asientos.** Para una herramienta de acceso nominativo, sobre todos sus planes en el período:

- `pagados` = suma de `quantity` de los planes con precio por asiento; `ociosos` = suma de `idleSeats`; `capacidad` = suma de `seatCapacity` de los planes con precio por paquete;
- `necesarios` = personas que usan la herramienta y no están en ningún grupo de `seatSharing`, más uno por cada grupo;
- sin un plan por paquete: `pagados − ociosos` debe ser **igual** a `necesarios`;
- con un plan por paquete: `(pagados − ociosos) + capacidad` debe ser **al menos** `necesarios`, y `pagados − ociosos` no puede superarlo. Un asiento ocioso nunca cuenta como capacidad de alguien.

Todo asiento pagado se usa, se comparte o se declara ocioso, o la cotización no calcula. El compositor no deduce nada de esto.

**Costo.** El costo de todos los planes de una herramienta en un período se junta y se reparte entre las líneas que la usan por peso de asiento: una persona de un grupo de `g` pesa `1/g`, y una persona que aparece en varias líneas reparte su asiento entre ellas. El costo de un asiento ocioso está dentro de ese fondo. Cuando nadie usa la herramienta, lo cargan en partes iguales las líneas de `bornByLineIds`, y la fila de selección de cada una lleva el motivo `bears-idle-seat:<idleReason>`.

**Identidad.** Una herramienta con un solo plan por período conserva sus identificadores: recurso `composed:<toolId>`, cobertura `tool:<toolId>`. Una herramienta que en algún período tiene dos planes nombra cada plan por su precio, y lo hace **en todos sus períodos**: recurso `composed:<toolId>:<priceId>`, cobertura `tool:<toolId>:<priceId>` y, en el nombre que muestran las lecturas, el `priceId` entre paréntesis. El kernel ve un recurso y una cobertura por plan, y un asiento anual conserva una sola identidad durante el plazo, que es lo que sigue `ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY`. Esa regla no cambió: un plan anual no puede cambiar de cantidad ni tener un hueco; un plan mensual a su lado ya no la dispara.

**Diagnósticos.** Todos son bloqueos de composición: van en `diagnostics` del resumen, dejan `totals` en `null` y la corrida sale con 2. La ruta es `<período>:<toolId>`, o `<período>:<toolId>:<priceId>` cuando el diagnóstico es de un plan de una herramienta con varios.

| `code` | Cuándo |
| --- | --- |
| `INSUFFICIENT_NAMED_SEAT_CAPACITY` | Faltan asientos: los asientos en uso más la capacidad de paquete no alcanzan para las personas, o un plan por paquete no declara `seatCapacity`. Desde el cierre del 2026-10-11 `detail` dice cuál de las dos cosas y, en la primera, cuántos asientos necesita el período y cuántos provee la demanda (pagados uno a uno y en uso, y de capacidad de paquete) |
| `TEAM_CONTRACT_CAPACITY_REQUIRED` | El precio declara `minimumContractSeats` y la asignación no declara `contractSeatCount`, o declara menos que el mayor entre ese mínimo y los asientos que la asignación tiene que sentar. Desde el cierre del 2026-10-11 `detail` trae el mínimo del plan, los asientos a sentar y el menor `contractSeatCount` que cumple los dos. Sólo cuentas |
| `UNACCOUNTED_NAMED_SEATS` | Sobran asientos: se paga uno que nadie usa y que nadie declaró ocioso. Hasta el 2026-10-11 este caso también salía como `INSUFFICIENT_NAMED_SEAT_CAPACITY`. `detail` dice cuántos se pagan, cuántos se declaran ociosos y cuántos se necesitan |
| `INVALID_IDLE_SEATS` | `idleSeats` en una herramienta que no es nominativa, en un plan que no es por asiento, o mayor que los asientos que la entrada paga |
| `IDLE_SEAT_BEARER_REQUIRED` | Nadie usa la herramienta en el período y la entrada no nombra `bornByLineIds` |
| `IDLE_SEAT_BEARER_NOT_ALLOWED` | `bornByLineIds` cuando la herramienta tiene usuarios en el período, o en una entrada que no declara asientos ociosos (un paquete o una herramienta compartida que nadie usa es una asignación sin uso, no un asiento ocioso) |
| `INVALID_IDLE_SEAT_BEARER` | `bornByLineIds` repite una línea o nombra una que no es una línea activa de la cotización en ese período |
| `INVALID_SEAT_SHARING` | Un grupo sobre una herramienta que no es nominativa; una persona repetida en el grupo, en dos grupos, o que no usa la herramienta en ese período |
| `UNUSED_SEAT_SHARING` | Una entrada de `seatSharing` para una herramienta y un período en que nadie la usa |
| `RESOURCE_HOLDING_ID_TOO_LONG` | El identificador de un plan (herramienta más precio) supera los 120 caracteres que el kernel admite |
| `DUPLICATE_RESOURCE_ALLOCATION`, `UNUSED_RESOURCE_ALLOCATION`, `WHOLE_NAMED_LICENSE_REQUIRED`, `ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY` | Sin cambio de significado. Los dos primeros se leen ahora por plan |

**En el resumen.** `attributions` trae una fila por plan. Tres claves existen sólo donde la demanda las declaró; toda otra fila conserva las que tenía:

| Clave | Contenido |
| --- | --- |
| `seats` | `{ needed, paid, idle, packageCapacity?, sharedSeats[] }` sobre todos los planes de la herramienta en el período; `sharedSeats[]` trae `{ people, reason }` por grupo, nunca los identificadores de las personas. Aparece cuando el período declara asientos ociosos o compartidos, o tiene varios planes, y es igual en cada plan de la herramienta |
| `idle` | `{ seats, reason, attributedMonthlyCost }`: los asientos ociosos de ese plan y su parte del costo atribuido, en la moneda de la herramienta |
| `bornByLineIds` | Las líneas que la demanda nombró, cuando nadie usa la herramienta |

**Qué queda fuera.** Que el proveedor permita compartir un asiento nominativo, y que un asiento ocioso se pueda soltar, pausar o reasignar, son preguntas del contrato con el proveedor. La cotización registra la declaración y su motivo, `compose assess` pide confirmarlas y nada las valida.

### `--out`: una cotización calculada o nada (2026-10-11)

Vale para los tres comandos que congelan una cotización: `calculate`, `quote` del carril de catálogo y `compose prepare|quote`. Fuente ejecutable: [la CLI](../../../scripts/commercial/pricing-v3.ts).

| Corrida | Qué queda en `--out` | Qué imprime |
| --- | --- | --- |
| Calcula (salida 0 o 3) | El artefacto, en una ruta nueva (`wx`/0600) | Lo de siempre; sin aviso |
| No calcula (salida 2) | **Nada** | Todo lo que encontró, más `runNotices.output`: `{ option: "out", written: false, reason: "QUOTE_NOT_CALCULATED", statement }` |
| No calcula, con `--keep-blocked` | El artefacto bloqueado | Lo mismo, con `written: true` y `reason: "KEPT_BLOCKED"` |

- Como una corrida bloqueada no deja archivo, la corrida corregida usa el mismo `--out`. Hasta el 2026-10-11 el archivo quedaba escrito y esa segunda corrida fallaba con `OUTPUT_EXISTS` contra algo que nunca fue una cotización.
- `--keep-blocked` existe porque un artefacto bloqueado tiene lectores propios: `explain`, `replay`, `compose assess` y `compose commitments`. Exige `--out` (solo, es `INVALID_ARGUMENT` con `option: "keep-blocked"`) y una ruta propia: ese archivo no es una cotización, ninguna lectura de una cotización calculada lo acepta y la corrida corregida necesita otra ruta.
- Un archivo que existe nunca se sobrescribe: `OUTPUT_EXISTS`, como antes.
- En `calculate`, una entrada que el contrato rechaza no produce artefacto, con el interruptor o sin él.
- El aviso no cambia el código de salida ni el estado: los decide el resultado.

### Resumen: avisos de la corrida y exposición a estimados (2026-10-11)

Este cambio no agrega contrato ni motor: los contratos del kernel que existían esa mañana (`1.0.0`, `1.1.0`, `1.2.0`) y los artefactos congelados quedan iguales. El contrato `1.3.0` llegó esa tarde y el `1.4.0` esa noche; los dos están en las secciones anteriores. Cambia lo que la CLI **lee y avisa** alrededor del cálculo. Fuentes ejecutables: [`resources/summary.ts`](../../../src/lib/finance/pricing-v3/resources/summary.ts), [`resources/price-review.ts`](../../../src/lib/finance/pricing-v3/resources/price-review.ts), [`adapters/current-versions.ts`](../../../src/lib/finance/pricing-v3/adapters/current-versions.ts) y [la CLI](../../../scripts/commercial/pricing-v3.ts).

**Qué versiones entran al cálculo.** Un puntero, `data/pricing/v3-operating/current.json` (`pricing-v3-current/1`), nombra el catálogo, la policy y el catálogo de créditos vigentes. Con `--current` la CLI toma de ahí las fuentes que no se pasaron y las verifica antes de usarlas. El contrato del kernel no conoce el puntero: recibe, como siempre, fuentes ya resueltas, y el artefacto congela las tres dentro. Operación del puntero: [mantenimiento del catálogo](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).

**Claves del resumen.** `compose prepare|quote` imprimen el resumen `pricing-v3-composition-summary/1`; el detalle completo vive sólo en el artefacto de `--out`. Sus claves, agrupadas por lo que responden:

| Pregunta | Claves |
| --- | --- |
| ¿Qué corrida es y con qué motor? | `schemaVersion`, `version`, `binding` (siempre `false`), `commercialUnit`, `calculationId`, `replayDigest` (sólo `quote`), `engineVersion` |
| ¿En qué estado quedó? | `calculationStatus`, `reviewStatus`, `quoteReviewStatus`, `diagnostics` (bloqueos), `assumptions`, `reviewSignals` |
| ¿Cuánto da? | `totals`, `periods`, `marginRateRoundedDown`, `commercialAdjustments`, `agreedTotals` (sólo si el brief declara un `agreed_total`), `priceRounding`, `marketFactor` (sólo si el factor de mercado cambia algo), `engagementForm` (sólo si el pedido declara la forma del trabajo); en una cotización 1.4.0, además `ownWork`, `thirdParty` y `contingencyReserve` |
| ¿Cumple el piso? | `marginFloor` |
| ¿Qué herramientas y qué caja? | `toolSelections`, `attributions`, `creditBudgets`, `resourceIncrementalCash`, `cashLedger`, `cashMeaning` |
| ¿Qué dato estimado pesa más? | `estimateExposure` |
| ¿Dónde está el detalle? | `fullDetail` |
| ¿Hay algo que avisar de esta corrida? | `runNotices` (sólo cuando hay algo) |

**`runNotices`: describe la corrida, no la cotización.** Es la única clave que no sale del resultado congelado. La CLI la agrega al imprimir, comparando lo que se usó con las fuentes que tiene a la vista en ese momento.

- No se guarda en el artefacto, y `replay` del mismo artefacto no la imprime.
- No existe cuando no hay nada que avisar: no va vacía ni en `null`.
- Nunca bloquea y no cambia el código de salida. Quien cotiza la informa al operador junto al resultado.
- Tiene hasta tres miembros, cada uno presente sólo si aplica (eran dos hasta que el mismo 2026-10-11 se agregó `output`):

| Miembro | Forma | Qué dice |
| --- | --- | --- |
| `laterCatalogValues` | `{ quoteDate, newestEffectiveFrom, records, byKind }` | El catálogo tiene registros que empiezan a regir después de la fecha de la cotización. La cotización se calculó con los valores de su fecha, que es lo correcto para una cotización de ese día y un error silencioso si la demanda conservó una fecha vieja |
| `priceDates` | `{ withinDays, reviewDue, dueSoon, expired }` | Fechas de los precios que esta cotización usa: revisiones ya pasadas, fechas que caen dentro de `withinDays` (30 días) y vigencias terminadas |
| `output` | `{ option, written, reason, statement }` | Qué hizo la corrida con `--out` cuando la cotización no calculó: no escribió nada (`QUOTE_NOT_CALCULATED`) o escribió el artefacto bloqueado porque se pidió (`KEPT_BLOCKED`). Es el único miembro que también imprimen `calculate` y `quote` del carril de catálogo. [Regla](#--out-una-cotización-calculada-o-nada-2026-10-11) |

Cada aviso de `priceDates` trae `kind` (`hard_expiry`: vigencia, bloquea al pasar; `review`: fecha de revisión, nunca bloquea), `subject` (`tool_price`, `resource_policy`, `catalog_record`, `credit_provider` o, desde el contrato 1.4.0, `third_party_quote`: la vigencia de la cotización de un proveedor), `ref`, `label`, `date`, `daysLeft` y `blocksWith` (el diagnóstico que daría una vigencia pasada; `null` en una revisión).

`laterCatalogValues` nació ese mismo día en la raíz del resumen y se movió a `runNotices`, porque mezclaba lo que un replay vuelve a imprimir con lo que depende del momento de la corrida. Un consumidor que lea esa nota la busca dentro de `runNotices`; ya no está en la raíz del resumen y nunca estuvo en el artefacto.

**Vigencia y revisión de un precio.** Son dos fechas distintas. La vigencia (`effectiveUntil` de la fuente) sigue siendo dura: pasada esa fecha el dato no se selecciona y la cotización queda `needs_input`, como dice [Defaults permitidos y datos ausentes](#defaults-permitidos-y-datos-ausentes). La fecha de revisión (`reviewBy`, opcional, por precio de herramienta en la policy) sólo avisa. Desde la policy v6 los precios unitarios de herramientas tienen vigencia abierta y fecha de revisión: una cotización con fecha posterior ya no se bloquea por eso. Detalle: [precios unitarios](cotizador-v3-mantenimiento-catalogo.md#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11).

**`estimateExposure`: dónde pesa un dato estimado.** Se deriva del resultado congelado, sin recalcular nada, así que `replay` la imprime igual. Es `null` cuando la cotización no llegó a un total.

| Clave | Qué es |
| --- | --- |
| `currency`, `totalCost`, `net` | Moneda de salida, costo total y neto del resultado |
| `estimatedCost`, `confirmedCost` | Parte del costo que descansa en al menos un dato estimado y parte confirmada. Hasta el 2026-10-11 sumaban `totalCost`; desde ese día la identidad es `estimatedCost + dedicationNotEvidenced.cost + confirmedCost = totalCost` |
| `dedicationNotEvidenced` | `{ lineIds, cost, shareOfCost }` (2026-10-11): las líneas cuya dedicación no declara evidencia y el costo que esa dedicación gobierna donde ningún dato estimado ya lo cuenta. No es un estimado declarado y nunca se lee como confirmado |
| `estimatedShareOfCost` | `estimatedCost ÷ totalCost` |
| `costInputs[]` | Datos estimados del lado del costo, de mayor a menor `costAtRisk`. Cada uno trae `kind`, `id`, `label`, líneas y períodos, `costAtRisk`, `shareOfCost` y `marginRateLostIfTenPctHigher`. Desde el contrato 1.4.0, la cotización de un proveedor con evidencia estimada es un dato más, de `kind: third_party`. Desde el 2026-10-11, también la dedicación de una línea que el brief declara estimada: `kind: dedication`, `id` el `lineId` y, si la capacidad la fijó la regla de asignación, `capacitySetByRule: true` |
| `priceInputs[]` | Un factor de mercado estimado: mueve precio, nunca costo, y por eso no entra al ranking de costo |
| `estimatedRules[]` | Políticas estimadas que son reglas y no importes (capacidad facturada, política de precio, redondeo, impuesto y, desde el contrato 1.4.0, la regla de precio de una categoría de terceros y el registro de la reserva de contingencia); no admiten la lectura «10 % más alto» |

- `costAtRisk` es el costo que descansa en ese dato. `marginRateLostIfTenPctHigher` = 0,10 × `costAtRisk` ÷ `net`: los puntos de margen que se perderían si ese dato fuera 10 % más alto y el neto no cambiara. Se redondea hacia arriba para no mostrar una pérdida menor que la real.
- Un componente cuenta una sola vez en `estimatedCost` aunque dependa de dos datos estimados (por ejemplo, costo de la persona y factor de talento). Por eso la suma de `costInputs` puede superar `estimatedCost`.
- `compose assess` publica los cinco primeros en `costEvidencePriority.confirmFirst`, junto a `dedicationNotEvidenced`. Un dato que es un registro por perfil (el fee de plataforma, `fee:<perfil>`) ocupa una entrada por perfil.
- Es una lectura de sensibilidad. No es un pronóstico, no valida ningún dato y no cambia el estado de revisión.

**Rechazos y salidas.** El [registro](../../../src/lib/finance/pricing-v3/errors.ts) suma dos códigos de adaptador, ambos con salida 1: `CURRENT_VERSIONS_MISMATCH` (el puntero y un archivo que nombra no coinciden; `option: "current"`) y `CURRENT_VERSIONS_CONFLICT` (el `--confirm` de `current set` no es el digest del puntero que se reemplaza, o se ofreció un `--confirm` cuando el puntero de destino todavía no existe). Reemplazar un puntero existente sin `--confirm` es `MISSING_ARGUMENT` con `option: "confirm"`, no un conflicto. `current show` usa la convención de siempre: 0 si el puntero es consistente con sus archivos, 2 si no. Los códigos 0, 1, 2 y 3 de la tabla de la CLI no cambian de significado.

**Límites que este cambio no mueve.** No hay tasa USD→EUR ni regla de redondeo para EUR: una cotización con salida en EUR queda `needs_input`. El costo de las personas es un costo objetivo y no la nómina real ([provisiones y costos](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11)). Un resumen con avisos, o sin ellos, sigue siendo una simulación: no es un precio aprobado, un costo validado ni una cotización emitida.

### Precio por todo el plazo: `agreed_total` del brief (2026-10-11)

No agrega contrato ni motor: el kernel sigue recibiendo sólo `discount` y `agreed_net`. Es una declaración del brief (`pricing-v3-brief/1`, en catálogo y composición) que la resolución convierte en netos acordados del kernel. Un brief que no la usa resuelve como siempre y todos los artefactos congelados se reproducen igual. Fuentes ejecutables: [`catalog/agreed-total.ts`](../../../src/lib/finance/pricing-v3/catalog/agreed-total.ts), [`catalog/contracts.ts`](../../../src/lib/finance/pricing-v3/catalog/contracts.ts) y [`catalog/resolve.ts`](../../../src/lib/finance/pricing-v3/catalog/resolve.ts). Decisión: [delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--un-precio-por-todo-el-trabajo-agreed_total).

```jsonc
{ "adjustmentId": "…", "kind": "agreed_total", "amount": "9500000", "lineIds": ["a", "b"], "reason": "…" }
```

| Campo | Regla |
| --- | --- |
| `adjustmentId` | De 1 a 100 caracteres: el nombre de los netos que produce (`<adjustmentId>:<clase>`) tiene que caber en el id del kernel |
| `amount` | El neto de `lineIds`, en la moneda de salida, como cadena decimal y sin más decimales que la moneda: en todo el plazo, o en cada período si `per` es `period` |
| `per` | Optativo (cierre del 2026-10-11): `term` o `period`. Ausente significa `term`. Sin valor por defecto en el schema: el brief parseado está dentro de cada resultado congelado, y un total anterior conserva las claves que tenía |
| `lineIds` | Al menos uno. Líneas del brief y, para traerlos al precio, costos de terceros refacturados por su `costId`; líneas y costos comparten nombres |
| `reason` | Obligatorio |
| `billing` | No existe: el objeto es estricto y una clave de más es `SCHEMA_INVALID` |

`brief.adjustments` admite hasta 10 entradas entre las tres clases.

**Resolución en dos pasadas.** La primera es la resolución de siempre, con todos los costos de la cotización y sin los totales acordados; se cotiza una vez para leer el neto de política de cada grupo de filas que un total nombra. Un grupo es un período y una clase de cobro (`monthly`, `setup`, `third_party`). La segunda reparte:

- cada grupo con precio recibe `amount × policyNet del grupo ÷ policyNet de todos`, cortado hacia abajo a un múltiplo de la unidad de reparto;
- el último grupo con precio recibe lo que queda, así que los grupos suman `amount` exactamente y ninguno es negativo;
- un grupo cuyas filas valen cero no recibe neto acordado;
- cada parte llega a su período como un `agreed_net` de su clase, llamado `<adjustmentId>:<clase>`, con las líneas del grupo y el `reason` del total; dentro del grupo el kernel lo reparte entre las filas como cualquier neto acordado.

Corre cuando los inputs son definitivos: una composición agrega el costo de sus herramientas después de resolver, y un neto de política leído antes sería el de otra cotización. Es una función pura de la resolución, así que un replay desde el catálogo y el brief congelados hace las mismas dos pasadas y llega a los mismos inputs.

**Unidad de reparto.**

| `distributionUnitBasis` | Cuándo | `distributionUnit` | Efecto en el impuesto |
| --- | --- | --- | --- |
| `tax_exact` | `taxTreatment` `exclusive`, con tasa `p/q` en su mínima expresión | `q` unidades mínimas de la moneda (100 a 19 %; 400 a 19,25 %) | Cada parte tiene un impuesto sin nada que redondear; sólo el período del último grupo redondea, una vez, y los impuestos de los períodos suman el de la tasa sobre el total. Vale para las filas que el total nombra: una cotización con filas fuera de él, o con varios totales, redondea también esos períodos |
| `currency_precision` | Impuesto sin resolver o que no aplica | La unidad mínima de la moneda | — |
| `currency_precision_fallback` | La unidad exacta dejaría sin parte a un grupo que tiene precio | La unidad mínima de la moneda | El impuesto de la cotización puede diferir del de la tasa sobre el total en una unidad por período |

**Lo que se congela y se lee.** La resolución lleva `agreedTotals[]`, y el resumen, `explain` y `quote` del carril de catálogo lo publican bajo `agreedTotals`:

| Clave | Contenido |
| --- | --- |
| `adjustmentId`, `currency`, `amount` | Lo declarado |
| `policyNet` | El neto de política de las filas nombradas (primera pasada) |
| `per` | Sólo si el brief lo declara |
| `agreedNetOverTerm` | Sólo con `per: "period"`: la suma de lo que recibió cada período, es decir `amount` una vez por cada período en que las filas nombradas se cobran |
| `differenceFromPolicyNet` | `amount − policyNet`; con `per: "period"`, `agreedNetOverTerm − policyNet`. Negativo cuando se vende bajo el precio de política |
| `distributionUnit`, `distributionUnitBasis` | La unidad y su motivo |
| `distribution[]` | `{ billing, lineIds, policyNet, agreedNet, periodIds }`: los períodos con la misma parte se agrupan |

`commercialAdjustments` conserva el ajuste como se declaró. `policyNet` y `distribution` son `null` en una cotización cuyo total no se pudo repartir; sus diagnósticos dicen por qué. El contrato que emite la resolución es al menos `1.1.0`, porque el kernel recibe netos acordados.

**Bloqueos.** Todos son diagnósticos de la resolución (salida 2), no rechazos del registro de `errors.ts`.

| Código | Ruta | Cuándo |
| --- | --- | --- |
| `AGREED_TOTAL_OVERLAPS_ADJUSTMENT` | `adjustments.<adjustmentId>` | Una línea o un costo está dos veces en el total, o también en otro ajuste (`discount`, `agreed_net` u otro `agreed_total`) |
| `AGREED_TOTAL_NOT_REPRESENTABLE` | `adjustments.<adjustmentId>.amount` | `amount` tiene más decimales que la moneda de salida |
| `AGREED_TOTAL_WITHOUT_BASE` | `adjustments.<adjustmentId>` | Un total mayor que cero sobre filas que valen cero en todos los períodos. Con `per: "period"`, también cuando en algún período las filas nombradas existen y ninguna tiene precio; `detail` nombra los períodos |
| `AGREED_TOTAL_WITHOUT_POLICY_PRICE` | `adjustments.<adjustmentId>` | La cotización no calcula sin el total: no hay neto de política que repartir. Lo que detiene cada período lo dice el kernel |
| `ADJUSTMENTS_EXCEED_PERIOD_LIMIT` | `periods.<n>.adjustments` | Con los netos de un total, un período supera los 10 ajustes que admite el kernel |
| `DUPLICATE_ADJUSTMENT_ID` | `adjustments` | Un `adjustmentId` choca con otro o con el nombre de un neto repartido |
| `INVALID_ADJUSTMENT_LINE` | `adjustments` | Un total nombra un id que no es una línea ni un costo refacturado |

**Lo que no cambia.** El piso se juzga por fila sobre el neto final: un total bajo el precio de política rebaja todo lo que nombra en la misma proporción. `agreed_net` sigue siendo un importe por período y por clase.

**Por período (`per: "period"`, cierre del 2026-10-11).** El reparto de arriba se hace una vez por período, sobre los grupos de ese período solamente (su fila mensual, su puesta en marcha, los costos que refactura), en la misma unidad, y el último grupo con precio del período toma lo que queda. Cada período en que las filas nombradas se cobran suma `amount` exactamente, cualesquiera sean sus clases de cobro: la puesta en marcha que cae en el primer mes es parte del precio de ese mes y no una fila bonificada para que el mes cierre. Un período en que ninguna de las filas nombradas se cobra no tiene grupo y no recibe nada. Una sola unidad sirve a todo el total: si la unidad exacta del impuesto dejaría sin parte a un grupo de cualquier período, todos los períodos se reparten en la unidad mínima (`currency_precision_fallback`). Con todas las filas de un período dentro del total, el impuesto del período es el de la tasa sobre `amount`, redondeado una vez. El piso sigue siendo por fila: en el período de la puesta en marcha las dos filas reciben menos que su precio de política, y cualquiera puede quedar marcada aunque el plazo completo quede sobre la política.

### Unidad comercial de la oferta: registro `offer` del catálogo (2026-10-11)

El catálogo (`pricing-v3-catalog/1`) admite una clase de registro más, y el catálogo v11 la usa. No cambia ningún contrato del kernel: ningún input del kernel la lleva. Decisión: [delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--la-unidad-comercial-es-un-dato-de-la-oferta).

```jsonc
{ "kind": "offer", "value": { "offerId": "creative-managed-service", "label": "…", "commercialUnit": "managed_service" } }
```

- `commercialUnit` es `managed_service` o `role_capacity`, la misma lista cerrada que declara una demanda de composición (`COMMERCIAL_UNITS`).
- Un registro por oferta: una revisión no puede cambiarle el `offerId`. Lleva fuente, vigencia y nota como todo registro.
- La resolución lo enlaza cuando existe (`purpose: "offer"`). Un catálogo sin registro para la oferta no declara nada y la cotización resuelve como siempre; dos vigentes para la misma oferta bloquean como cualquier selección ambigua (`AMBIGUOUS_SELECTION` en `offerId`).
- La composición rechaza una demanda cuyo `commercialUnit` no es el del registro: `COMMERCIAL_UNIT_CONTRADICTS_OFFER` en `commercialUnit`, con las dos unidades, el registro y su revisión en `detail`. Salida 2.
- `compose scaffold` escribe la unidad del registro. Sin registro, o con dos, escribe `null` —que ninguna cotización acepta— y agrega la pregunta `COMMERCIAL_UNIT_REQUIRED` con las dos unidades en `candidates`.
- `catalog search|show --kind offer` lo consulta; `catalog show --kind offer --query <offerId>` lo encuentra por oferta.

### Evidencia de la dedicación: `dedicationEvidence` (2026-10-11)

Clave opcional de cada línea del brief, con el schema de toda fuente: `{ reference, effectiveFrom, effectiveUntil, status }`. No llega al kernel y no cambia ningún precio: la leen las lecturas de la cotización congelada. Sin valor por defecto.

| Estado de la evidencia | Qué pasa |
| --- | --- |
| `confirmed`, vigente en `quoteDate` | El costo que la dedicación gobierna cuenta según sus otros datos |
| `estimated`, vigente en `quoteDate` | La resolución deja el supuesto `DEDICATION_ESTIMATED` en `lines.<lineId>.dedicationEvidence`; `estimateExposure.costInputs` trae un dato `kind: "dedication"`, `id` el `lineId`; `compose assess` levanta `DEDICATION_EVIDENCE_REVIEW` |
| `pending` | Bloquea: `PENDING_DEDICATION_EVIDENCE` |
| Fuera de vigencia en `quoteDate` | Bloquea: `DEDICATION_EVIDENCE_NOT_EFFECTIVE` |
| No confirmada, en `mode: "commercial_draft"` | Bloquea: `UNCONFIRMED_DEDICATION_EVIDENCE` |
| Ausente | Calcula. El costo que la dedicación gobierna sale en `estimateExposure.dedicationNotEvidenced` y `compose assess` levanta `DEDICATION_NOT_EVIDENCED` |

- **Qué gobierna la dedicación.** Lo que la línea paga por su capacidad: su costo de persona, con la reserva de contingencia que descansa en él, y todo recurso de su kit que se reparta por la capacidad de la línea (`shareMode: fte`).
- **`capacitySetByRule`.** El dato `dedication` lo trae en `true` cuando la capacidad cobrada la fijó la regla de asignación y no la dedicación pedida (una línea `dedicated`, o un mínimo facturable): el costo es el mismo, pero no se mueve en proporción a la dedicación.
- **`compose workload --brief`** la escribe en cada línea que dimensiona: `reference` `workload:<versión>`; vigencia, el tramo en que rigen a la vez la capacidad y cada volumen o bloque fijo del que la línea toma parte; estado, el más débil de esas fuentes, y `estimated` si el workload es una simulación. Sin una fecha común, `WORKLOAD_SOURCES_NOT_CONCURRENT`. El cálculo trae la misma evidencia por línea en `evidence`.

**Horas como unidad de la dedicación.** `dedication` es `{ unit: "fte", value }` (hasta 1) o `{ unit: "hours_per_month", value }`. Las horas se dividen por `hoursPerFteMonth` de la regla de asignación de la línea; el resultado no puede superar 1 FTE (`INVALID_DEDICATION`). Una regla `dedicated` cobra `dedicatedBilledFte` cualquiera sea la dedicación; una `shared`, el mayor entre la dedicación y `minimumBilledFte`. En el catálogo vigente las dos reglas declaran 180 horas, mínimo 0 y dedicado 1, y están marcadas `estimated`: por eso salen en `estimateExposure.estimatedRules` como `allocation_policy`, con `billedFteSetByRuleOn` para las líneas declaradas en horas.

### Diagnósticos con su causa (2026-10-11)

Aditivo: los códigos que existían conservan su significado; cambian las claves que los acompañan.

- **Diagnósticos de resolución y composición** (`{ code, path, detail?, candidates? }`): `detail` dice qué regla falla, sin repetir el dato recibido; `candidates` lista ids utilizables.

  | Código | Qué agrega |
  | --- | --- |
  | `QUOTE_DATE_BEFORE_CATALOG` (nuevo) en `quoteDate` | Ningún registro del catálogo rige en `quoteDate`: se dice una vez, con la primera fecha en que rige, y no se reporta ninguna otra selección |
  | `QUOTE_DATE_BEFORE_OFFER_POLICY` (nuevo) en `offerId` | La oferta y su `engagementCode` no tienen política de precio en `quoteDate` y sí después: se dice una vez, con esa fecha, en vez de una selección faltante por línea |
  | `MISSING_CATALOG_SELECTION` | `detail` cuando el registro que la selección habría tomado empieza a regir después de `quoteDate`, con la fecha |
  | `RESOURCE_POLICY_NOT_EFFECTIVE` | `detail`: si la fecha es anterior o posterior a la vigencia de la policy, y la fecha límite |
  | `CLIENT_ACCESS_EVIDENCE_REQUIRED` | `detail`: el período y qué parte del requisito falla (no confirmada, empieza tarde, termina antes del último día del mes, o `lineIds` repite una línea) |
  | `RESOURCE_ALLOCATION_REQUIRED`, `RESOURCE_PRICE_SELECTION_REQUIRED` | `candidates`: los `priceId` de la herramienta que una asignación puede nombrar a la fecha de la cotización, leídos como los lee la composición (cierre del 2026-10-11; antes, los que no estaban pendientes) |
  | `RESOURCE_PRICE_PENDING`, `RESOURCE_PRICE_NOT_EFFECTIVE`, `CATALOG_RESOURCE_PRICE_REQUIRED`, `UNSUPPORTED_TOOL_PRICE_UNIT` | `detail`: por qué ese precio no se puede nombrar (el motivo que declara la policy, o la regla). Los tres últimos lo traen desde el cierre del 2026-10-11 |

  Cuando la resolución no construye ningún período (una fecha anterior al catálogo, una oferta sin política vigente), la composición ya no reporta cada entrada de la demanda como no usada: la causa queda sola.

- **Rechazos del adaptador** (`{ error: { code, message, option?, allowed?, issues? } }`): `allowed` acompaña a `option` cuando lo que la opción admite es una lista cerrada de la herramienta (un `--kind` de catálogo). Cada entrada de `issues` puede traer, además de `path` y `rule`, lo que el schema pedía en ese lugar: `limit` (`too_big`, `too_small`), `allowed` (un enum o un discriminador) o `expected` (el tipo). Son constantes del contrato; el valor recibido y el mensaje del validador nunca se leen.

### Evidencia de una asignación: `allocations[].evidence` (2026-10-11, cierre)

Clave opcional de cada asignación de la demanda de composición (`pricing-v3-composition-demand/1`), con el schema de toda fuente: `{ reference, effectiveFrom, effectiveUntil, status }`. Dice de dónde sale la asignación —el plan contratado, sus asientos y la parte que carga la cuenta— y si está confirmado. Sin valor por defecto: la demanda parseada está dentro de cada artefacto congelado. Un recurso de un portfolio (`pricing-v3-resource-portfolio/1`) admite la misma clave y la entrega tal cual a cada asignación que produce. Fuentes ejecutables: [`resources/composition-contracts.ts`](../../../src/lib/finance/pricing-v3/resources/composition-contracts.ts), [`resources/operating.ts`](../../../src/lib/finance/pricing-v3/resources/operating.ts) y [`resources/readiness.ts`](../../../src/lib/finance/pricing-v3/resources/readiness.ts).

- No llega al kernel, no bloquea y no cambia ningún cálculo. La composición la copia a la atribución de la herramienta, y de ahí la lee el assessment.
- `compose assess` levanta `ALLOCATION_EVIDENCE_REQUIRED` (owner Operations) por cada atribución cuya asignación no declara `evidence`, la declara con un `status` distinto de `confirmed`, o la declara con una vigencia que no incluye `quoteDate`. El texto de `action` dice cuál de las tres.
- Una herramienta que se compra en créditos no tiene asignación: su presupuesto es del catálogo de créditos, y no levanta la brecha.
- `reason` explica la asignación a quien la lee y ya no se lee por lo que dice. Hasta el cierre del 2026-10-11 la brecha dependía de que `reason` contuviera ciertas palabras en inglés.
- Ninguna demanda versionada de `data/pricing/v3-operating/` declara `evidence`: `assess` levanta hoy la brecha en cada una de sus herramientas con asignación.

### Assessment plegado y total bajo el piso (2026-10-11, cierre)

`compose assess` conserva su forma y agrega una clave. No cambia ningún artefacto.

| Clave | Contenido |
| --- | --- |
| `gaps[]` | `{ code, path, owner, action, periodIds? }`: una entrada por brecha. Una brecha de un período se levanta bajo una ruta sin él y las entradas que sólo difieren por período son una, con `periodIds`, en el lugar de la primera |
| `gapOccurrences` | El tamaño de la lista antes de plegar: cada entrada una vez por período que tiene, y una vez si no tiene ninguno |

| Brecha | Ruta |
| --- | --- |
| De una herramienta (`RESOURCE_ACCESS_AND_CAPACITY_REQUIRED`, `TOOL_COST_EVIDENCE_REVIEW`, `ALLOCATION_EVIDENCE_REQUIRED`, `IDLE_SEAT_COST_REVIEW`, `SHARED_SEAT_TERMS_REVIEW`) | `tools.<toolId>` |
| De una fila bajo su piso (`MARGIN_BELOW_POLICY_FLOOR`) | `result.lines.<lineId>`; en el artefacto, `periods.<periodId>.result.lines.<lineId>`, una vez por cada período de `periodIds` |
| `USER_ASSIGNMENT_REQUIRED` | `work.assigneeIds`, una vez por cotización, con cuántos cupos `planned-` hay en el texto de `action` |
| Un bloqueo de una cotización que no calculó | La ruta con que la cotización lo reportó (`<período>:<toolId>`), una entrada por período: no se pliega |

Una misma brecha levantada dos veces en un lugar y un período (una herramienta con dos planes) cuenta una sola.

El resumen `pricing-v3-composition-summary/1` agrega `marginFloor.netShortOfFloor`: la suma de `netShortOfFloor` sobre todas las filas marcadas, una por período (`flaggedLinePeriods`). `marginFloor.lines[]` pliega las filas que sólo difieren por período, así que cada entrada trae la cifra de un período. La clave existe sólo cuando hay filas marcadas y todas traen su neto mínimo (contrato 1.2.0 en adelante); una cotización de un contrato anterior conserva las claves que tenía. Una fila llevada a neto cero sale marcada con `marginRateRoundedDown` y `marginAmountShortOfFloor` en `null` y `netShortOfFloor` igual a su `floorNet`, y entra a esa suma.

### Andamio de la demanda: lo que escribe y lo que pregunta (2026-10-11, cierre)

`compose scaffold` escribe lo que la composición lee, y nada que leería de otra manera.

- `work[].tasks` es `[]`. La composición aplica siempre la receta del perfil de la línea (`profileTasks` de la policy) y le suma `work[].tasks`: son las tareas del trabajo más allá de la receta. La pregunta `WORK_TASKS_AND_USERS_REQUIRED` de cada línea trae la receta en `profileTasks`; una tarea de ella se deja fuera sólo con `excludedProfileTasks` (`{ task, reason }`).
- `work[].assigneeIds` son cupos, `planned-<lineId>-<n>`, uno por persona de la línea. Un cupo se queda mientras nadie esté asignado y se reemplaza por un id anónimo estable sólo cuando hay una persona específica asignada.
- La pregunta `TOOL_PLAN_AND_ALLOCATION_REQUIRED` de cada herramienta trae `candidates`, los `priceId` que una asignación puede nombrar a la fecha de la cotización, y, si los hay, `unavailablePrices[]`: `{ priceId, blocksWith, reason }`, con el diagnóstico que daría nombrarlo (`RESOURCE_PRICE_PENDING`, `RESOURCE_PRICE_NOT_EFFECTIVE`, `CATALOG_RESOURCE_PRICE_REQUIRED` o `UNSUPPORTED_TOOL_PRICE_UNIT`). Es una sola lectura, la misma con que la composición pone precio; `availability` de `resources inspect` la sigue: `needs_input` es un precio que una asignación no puede nombrar ese día.

### `priceReview.superseded` de `resources inspect` (2026-10-11, cierre)

`priceReview` es `{ withinDays, reviewDue, dueSoon, expired, superseded }`. Un registro del catálogo cuya vigencia pasó se lista bajo `expired`, con el diagnóstico con que bloquea, sólo cuando nada responde por él. Cuando otro registro vigente en la fecha de lectura responde la misma selección (otro `recordId` para el mismo par de monedas, el mismo costo o la misma regla), se lista bajo `superseded` con `supersededBy` (los ids de esos registros), `blocksWith` `null` y un texto en `consequence`: una cotización selecciona el vigente, y sólo una demanda o un brief que nombre el registro terminado por su id tiene que nombrar el otro. Un registro todavía vigente al que otro responderá desde el día siguiente a su término se queda en `dueSoon`, también sin bloqueo. `runNotices.priceDates` del resumen de una cotización no cambió de forma.

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
