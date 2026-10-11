# Pricing V3 — motor 1.1: precio acordado, redondeo comercial y versiones convivientes

- Status: `Accepted` para el prototipo local; aprobado por el operador (CEO) el 2026-10-10.
- Date: 2026-10-10.
- Owner: Commercial/Finance + Platform/Architecture.
- Scope: contrato del kernel, catálogo, resolución, composición y replay del cotizador V3 local. No altera el
  cotizador canónico, DB, API ni permisos.
- Reversibility: one-way para los artefactos que usen el contrato 1.1; two-way para todo lo demás (el contrato 1.0
  queda intacto y sigue siendo el que usa cualquier entrada sin las capacidades nuevas).
- Depende de: [prototipo local](GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md),
  [flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y su delta de endurecimiento de la CLI.

## Contexto

Dos pasos de toda cotización real ocurrían fuera del motor:

1. **El precio acordado.** El motor sólo aceptaba un descuento por tasa. Para registrar un precio pactado había que
   calcular la tasa a mano con decimales suficientes (0,0793605 para llegar a CLP 4.990.000; con 0,07936 salía
   4.990.002). Un precio pactado **sobre** el precio calculado no se podía registrar.
2. **El redondeo comercial.** El motor entrega 5.420.145 y se vende en cifras redondas. El contrato ya lo preveía
   («redondeo comercial adicional requiere una política y aparece como ajuste separado») y lo dejaba fuera de alcance.

Consecuencia medida: el precio pactado de SKY social care quedó fuera del artefacto, que mostraba 45 % cuando el
margen real era 40,26 %. Y una oferta con margen objetivo igual a su piso marcaba líneas bajo el piso por fracciones
de peso, porque costo y precio se redondean por separado.

La restricción que gobierna la solución: **un artefacto congelado se verifica recalculándolo**. El replay del kernel
exigía la versión exacta del motor, y el replay de catálogo y composición vuelve a resolver desde el catálogo, la
política y la demanda congelados. Cualquier cambio que altere el resultado de una entrada existente rompe la
verificación de todas las cotizaciones guardadas.

## Decisión

### 1. Versiones convivientes por contrato de entrada

El kernel acepta dos contratos de entrada y los mantiene a ambos:

| Contrato (`request.schemaVersion` y `snapshot.schemaVersion`) | Motor que firma el resultado | Comportamiento |
| --- | --- | --- |
| `1.0.0` | `pricing-v3-local/1.0.0` | El de siempre, byte a byte. Rechaza cualquier campo nuevo. |
| `1.1.0` | `pricing-v3-local/1.1.0` | Agrega precio acordado, varios ajustes disjuntos y redondeo comercial. |

- La versión la declara la entrada; el motor nunca la infiere ni la «actualiza». Request y snapshot llevan la misma.
- El resultado de una entrada 1.0.0 conserva forma, valores, `engineVersion` y `precisionPolicy` exactos. Los campos
  nuevos **no existen** en un resultado 1.0.0 (no van en cero: no van).
- El replay acepta cualquier versión de un registro cerrado de versiones soportadas y sigue verificando por
  recálculo y digest. Una versión fuera del registro es `REPLAY_MISMATCH`.
- En el carril de catálogo y composición, la resolución emite `1.1.0` **sólo si** la entrada congelada usa una
  capacidad nueva (un ajuste que no sea un único descuento por tasa, o una regla de redondeo vigente para la moneda
  de salida). En cualquier otro caso emite `1.0.0`, igual que antes. La decisión es función de lo congelado, así que
  los artefactos anteriores vuelven a resolver al mismo contrato y al mismo digest.

Un cambio futuro de comportamiento sigue el mismo patrón: contrato nuevo, motor nuevo en el registro, contratos
anteriores intactos. Nunca se modifica el comportamiento de un contrato ya usado.

> Nota 2026-10-11: el registro tiene desde hoy un tercer contrato, `1.2.0` (motor `pricing-v3-local/1.2.0`), agregado
> con ese mismo patrón. La tabla y las reglas de esta sección siguen describiendo `1.0.0` y `1.1.0` sin cambio; lo
> que agrega `1.2.0` está en el [delta del 2026-10-11](#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado).

### 2. Ajustes comerciales (contrato 1.1.0)

`request.adjustments` admite hasta 10 ajustes de dos clases:

```jsonc
{ "adjustmentId": "…", "kind": "discount", "rate": "0.05", "lineIds": ["a"], "reason": "…" }
{ "adjustmentId": "…", "kind": "agreed_net", "amount": "4990000", "billing": "monthly", "lineIds": ["a", "b"], "reason": "…" }
```

- **`discount`**: sin cambios. Rebaja por tasa sobre todas las filas facturables (mensuales y de implementación) de
  las líneas indicadas.
- **`agreed_net`**: el neto pactado, en la moneda de salida, para las filas de la clase `billing` (`monthly` o
  `setup`) de las líneas indicadas, **por período**. El motor calcula la diferencia contra el precio de esas filas y
  la reparte en proporción a cada fila, por mayor resto, con desempate por `lineId` (el mismo algoritmo del
  descuento). Si el pactado es menor, la diferencia es `discount`; si es mayor, es `uplift`. La suma de netos de esas
  filas en el período es exactamente `amount`.
- Cada fila facturable recibe a lo más un ajuste. Dos ajustes que apunten a la misma fila son un error
  (`OVERLAPPING_ADJUSTMENTS`); no hay orden de aplicación que resolver.
- Errores de entrada (estado `invalid`, sin resultado): `amount` con más decimales que la moneda
  (`INVALID_AGREED_AMOUNT`); un `agreed_net` sin filas a las que aplicarse o con precio base cero y monto positivo
  (`AGREED_NET_WITHOUT_BASE`); `adjustmentId` repetido (`DUPLICATE_ID`).
- `reason` sigue siendo obligatorio. Un ajuste no aprueba nada: el control de piso corre sobre el neto final.
- En el carril de catálogo y composición los ajustes se declaran en `brief.adjustments` (mismo esquema y mismo tope)
  y la resolución los copia al request de cada período. Un `discount` reclama las dos clases de fila de sus líneas;
  un `agreed_net`, sólo la clase que declara.
- **Neto pactado de implementación.** La resolución arma una entrada del kernel por período y las filas `setup`
  existen sólo donde se cobra un recurso de una vez. Un `agreed_net` con `billing: "setup"` se envía únicamente a los
  períodos en que alguna de sus líneas tiene esa fila; si no cae en ningún período, la resolución bloquea con
  `AGREED_NET_WITHOUT_BASE` (ruta `adjustments.<adjustmentId>`), la misma condición que nombra el kernel vista sobre
  todo el plazo.
- **Dónde aparecen estos errores.** El kernel los reporta como diagnósticos `error` del período (estado `invalid`).
  En composición suben a `diagnostics` del resumen como bloqueos (`periods.<n>.request.adjustments`), con totales
  nulos, `needs_input` y exit 2. En `quote` del carril de catálogo quedan bajo `periods[].diagnostics`, con
  `calculationStatus: needs_input` y `diagnostics` de la quote vacío, como siempre ocurrió con un período fallido.

### 3. Redondeo comercial (contrato 1.1.0)

`snapshot.priceRounding` es opcional: `{ "multiple": "10000", "source": { … } }`, en la moneda de salida.

- Se aplica a cada fila facturable con precio mayor que cero, **antes** de los ajustes. El precio de política se
  calcula como siempre (`HALF_UP` a la precisión de la moneda) y se eleva al múltiplo siguiente. La diferencia queda
  en `roundingAdjustment`, visible por fila y en totales. Nunca redondea hacia abajo.
- **Regla de conservación del piso.** Si la fila cumplía su `minimumMargin` antes de redondear (sobre los importes
  sin redondear), el precio redondeado es el menor múltiplo que también lo cumple sobre los importes presentados:
  `ceil(max(precio, costo_presentado / (1 − minimumMargin)) / múltiplo) × múltiplo`. El redondeo no puede convertir
  una fila que cumple en una fila marcada. Si la fila **no** cumplía antes de redondear, sólo se eleva al múltiplo
  siguiente: el redondeo no corrige una política que vende bajo su piso.
- `multiple` debe ser un múltiplo entero de la unidad mínima de la moneda (`INVALID_PRICE_ROUNDING` si no). El
  catálogo lo rechaza antes, al validarse: moneda no registrada (`PRICE_ROUNDING_CURRENCY_NOT_REGISTERED`) o múltiplo
  que no es un número entero de unidades mínimas (`INVALID_PRICE_ROUNDING_MULTIPLE`).
- «Cumplía antes de redondear» se lee sobre los importes sin redondear, a 60 de los 80 dígitos de trabajo. Un precio
  construido como `costo / (1 − piso)` queda un pelo sobre o bajo el piso por el último dígito de la división; leerlo
  a 60 dígitos lo vuelve determinista. El control `MARGIN_BELOW_FLOOR` no usa tolerancia alguna.
- La regla vive en el catálogo como registro `price_rounding`, **por moneda**, con fuente y vigencia como cualquier
  otro registro: `{ "currency": "CLP", "multiple": "10000" }`. Un registro puede llevar además `offerId`; la regla de
  una oferta prevalece sobre la general de su moneda. Cada moneda de cotización declara su propio múltiplo: no se
  convierte el múltiplo de otra moneda por tipo de cambio. Sin registro vigente para la moneda de salida no hay
  redondeo en esa moneda. Más de una regla aplicable del mismo nivel es un bloqueo de resolución
  (`AMBIGUOUS_PRICE_ROUNDING`); la validación del catálogo sólo rechaza revisiones solapadas de un mismo `recordId`,
  como en cualquier otra clase de registro.
- Una misma oferta cotizada en dos monedas redondea cada una a su múltiplo: los dos precios no son la conversión
  exacta uno del otro, y eso es lo esperado.

### 4. Forma del resultado 1.1.0

Por fila y en totales: `undiscountedPrice` (precio de política más `roundingAdjustment`), `roundingAdjustment`,
`discount`, `uplift`, `net`. Identidad: `net = undiscountedPrice + uplift − discount`. `precisionPolicy` lleva un
nombre propio de la versión. El control `MARGIN_BELOW_FLOOR` no cambia: compara el margen del neto final con
`minimumMargin` y sólo informa.

### 5. Guarda permanente

Una prueba reproduce **todos** los artefactos congelados versionados bajo `data/pricing/**` y exige
`verified: true`. La lista se obtiene por búsqueda, no se escribe a mano. Es el verificador real de que el contrato
1.0.0 no se movió: cualquier cambio futuro del motor la corre.

Implementada en
[`pricing-v3-frozen-artifacts.test.ts`](../../src/lib/finance/pricing-v3/__tests__/pricing-v3-frozen-artifacts.test.ts):
recorre `data/pricing/**` buscando `*.artifact.json`, suma los dos artefactos versionados del caso SKY social care
(el acuerdo como descuento por tasa en 1.0.0 y como neto pactado en 1.1.0), reproduce cada uno con el replay de su
carril y compara digest e identidad. Exige además al menos un artefacto congelado firmado por **cada** motor del
registro: un motor registrado sin artefacto no tiene nada que lo proteja. Un artefacto de un carril que la guarda no
sabe reproducir es una falla, nunca un salto.

## Alternativas descartadas

- *Cambiar el redondeo o el control de piso del motor actual.* Altera resultados de entradas existentes y deja sin
  verificación a todas las cotizaciones guardadas.
- *Copiar el kernel 1.0 a un archivo congelado y despachar por versión.* Duplica 550 líneas de aritmética para un
  cambio que es aditivo. Queda disponible si alguna vez un contrato nuevo no puede convivir en el mismo código.
- *Agregar campos nuevos en cero a todos los resultados.* Cambia el digest de cada artefacto anterior.
- *Que el motor decida la versión según lo que encuentre en la entrada.* El contrato lo declara el que llama; un
  consumidor que no conoce 1.1 debe ser rechazado, no reinterpretado.
- *Subir el margen objetivo sobre el piso para evitar el aviso por redondeo.* Es una decisión de precio, no de
  aritmética; el operador mantuvo objetivo y piso en 45 %.
- *Tolerancia en la comparación de piso.* Esconde incumplimientos reales pequeños y contradice «los controles usan el
  margen sin redondearlo».
- *Redondear sobre el total del período y repartir.* No garantiza el piso por línea: una línea puede recibir cero del
  reparto y seguir marcada.
- *Guardar el precio acordado sólo como dato del expediente.* Es lo que había: el artefacto mostraba un margen que no
  era el real.

## Cuatro pilares

- **Seguridad.** Nada sale del prototipo local. Un ajuste exige motivo y queda en el artefacto. El redondeo sólo
  sube el precio y sólo por política registrada con fuente. Ningún ajuste aprueba una excepción: `binding=false`,
  `requires_review` y el control de piso se conservan.
- **Robustez.** Un contrato desconocido se rechaza. Los ajustes no se solapan por construcción. El neto pactado se
  alcanza exacto, sin tasas calculadas a mano. La regla de conservación del piso es una fórmula cerrada, sin
  iteraciones. El contrato 1.0.0 está protegido por la guarda de artefactos congelados.
- **Resiliencia.** Cada artefacto lleva la versión que lo calculó y se sigue verificando con ella. Volver atrás es
  dejar de usar las capacidades nuevas; lo anterior nunca dejó de funcionar.
- **Escalabilidad.** El patrón de contrato versionado admite el siguiente cambio de comportamiento sin tocar los
  anteriores. La regla de redondeo es dato por moneda: una oferta o un país nuevo no exigen código.

## Reglas duras

- **NUNCA** cambiar el comportamiento de un contrato de entrada ya usado; se agrega un contrato y un motor al registro.
- **NUNCA** agregar a un resultado un campo que cambie el digest de artefactos de contratos anteriores.
- **NUNCA** calcular a mano una tasa para llegar a un precio pactado: se declara `agreed_net`.
- **NUNCA** redondear un precio fuera del motor ni hacia abajo; el redondeo es política del catálogo.
- **NUNCA** usar el redondeo o un ajuste para «cumplir» un piso: el piso se controla sobre el neto final y un
  incumplimiento es una decisión del operador, registrada con su motivo.
- **SIEMPRE** correr la guarda de artefactos congelados al tocar `calculate.ts`, `schemas.ts` o la resolución.
- **SIEMPRE** registrar el precio realmente pactado en la demanda antes de congelar la cotización.

## Delta 2026-10-11 — contrato 1.2.0: el piso acompaña al factor de mercado

Aprobado por el operador (CEO) el 2026-10-11. Sigue el patrón de este ADR: contrato nuevo, motor nuevo en el
registro, contratos anteriores intactos.

**Contexto.** El motor tiene dos ejes de país desde el contrato 1.0.0: el factor de talento (costo, según el país de
la persona) y el factor de mercado (precio del componente humano, según el país del cliente). Hasta el catálogo v4
los cinco factores de mercado valían 1 y no había ningún factor de talento registrado (los costos no declaraban
país), así que el país sólo cambiaba moneda y redondeo. Al declarar un factor de mercado menor que 1 (Colombia 0,90), el precio
baja y el costo no: el margen real cae bajo el piso de la política y **toda** cotización de ese mercado sale marcada
(medido: 6 de 6 líneas, margen 41,2 % contra piso 45 %). Un control que marca todo deja de leerse.

**Decisión.** El factor de mercado es una decisión de precio ya aprobada para ese país; el piso se evalúa sobre el
precio del mercado base y no vuelve a castigar ese ajuste. Un descuento adicional sí lo cruza.

- El contrato `1.2.0` contiene todo lo de `1.1.0` y agrega un campo opcional en cada factor de mercado del snapshot:
  `"floorBasis": "base_market"`. Ausente, el piso se evalúa sobre el neto final, como siempre. El campo sólo existe
  en `1.2.0`: un snapshot `1.0.0` o `1.1.0` que lo traiga se rechaza, no se reinterpreta. El motor que firma es
  `pricing-v3-local/1.2.0`, con su propio `precisionPolicy`; `1.0.0` y `1.1.0` siguen byte a byte.
- Con `floorBasis: "base_market"` y factor menor que 1, cada fila facturable compara su precio de política con el
  que habría tenido con factor 1 (`precio base`). La razón `ρ = precio / precio base` es cuánto bajó esa fila por el
  mercado. Los dos precios se toman **como se presentan**: `HALF_UP` a la precisión de la moneda de salida y antes
  del redondeo comercial; no son los importes sin redondear. Las herramientas no reciben factor de mercado, así que
  `ρ` es propia de cada fila.
- `ρ = 1`, y el control es el de siempre, cuando el factor es mayor o igual a 1, cuando el factor no declara
  `floorBasis`, cuando la fila no tiene componente humano o cuando los dos precios presentados son iguales.
- **Piso de la fila en ese mercado:** `floorNet = costo_presentado × ρ / (1 − minimumMargin)`, elevado a la unidad
  mínima de la moneda. La fila se marca `MARGIN_BELOW_FLOOR` si su neto final es menor que ese valor exacto. La
  comparación se hace sin dividir: `neto × (1 − m) × precio base < costo × precio`; esos productos de tres importes
  se calculan a 240 dígitos para que sean exactos.
- **Consecuencia.** La regla traslada el piso, no agrega holgura. Con margen objetivo igual al mínimo y **sin**
  regla de redondeo para la moneda, una fila a precio de política puede seguir marcada por un centavo, igual que le
  pasaría en el mercado base, porque costo y precio se redondean por separado. Con regla de redondeo, la
  conservación usa este mismo piso y la fila no se marca.
- La regla de conservación del piso del redondeo usa el mismo piso: «cumplía antes de redondear» se lee sobre el
  precio base sin redondear, a 60 dígitos, y el mínimo conservado es
  `ceil(max(precio, costo_presentado × ρ / (1 − m)) / múltiplo) × múltiplo`.
- **Forma del resultado 1.2.0.** Toda fila agrega `marketAdjustment` (precio con el factor menos precio base, ambos
  presentados y antes del redondeo comercial; con signo: negativo cuando el factor baja el precio, positivo cuando
  es mayor que 1, cero sin componente humano), `marketPriceRatio` (`ρ` como cadena decimal; `"1"` cuando la regla no
  aplica) y `floorNet` (con `ρ = 1` es el piso de siempre, `costo / (1 − m)` elevado a la unidad). Los totales
  agregan `marketAdjustment`. Identidad: `undiscountedPrice − roundingAdjustment − marketAdjustment` es el precio del
  mercado base. El margen real (`marginAmount`, `marginRate`) no cambia de significado: sigue siendo el del neto
  final contra el costo. Un resultado `1.0.0` o `1.1.0` no tiene ninguna de estas claves.
- **En el catálogo** el registro `market_factor` admite `floorBasis`. La resolución emite `1.2.0` si y sólo si el
  factor de mercado **elegido para esa cotización** lo declara, también cuando ese factor vale 1 o más y no cambia
  ningún veredicto; un `floorBasis` en el factor de otro país no altera nada. En cualquier otro caso sigue emitiendo
  `1.1.0` o `1.0.0` con las reglas anteriores: un factor distinto de 1 sin `floorBasis` cotiza como siempre. Es una
  propiedad declarada del dato, no una inferencia desde el valor del factor: un catálogo congelado antes de hoy no
  la tiene y vuelve a resolver a su contrato.
- **Lectura.** El resumen (`pricing-v3-composition-summary/1`, aditivo) agrega en la raíz `marketFactor`
  (`{ country, factor, floorBasis, recordId, revision, sourceStatus }`) **sólo** cuando el factor elegido cambia algo
  (factor distinto de 1 o `floorBasis` declarado); con el factor neutral la clave no existe, no va en `null`. Por
  línea marcada de una fila 1.2.0 agrega `floorNet` y `netShortOfFloor` (`floorNet − net`); en las filas con
  `ρ < 1`, `marginAmountShortOfFloor` es `null`, porque esa cifra sería la del mercado base, y en las filas con
  `ρ = 1` se conserva. `assess` agrega `marketFactor` dentro de `margin.policyFloor`; `explain` agrega
  `commercialAdjustments.marketFactor` y, por fila, `marketAdjustment`, `marketPriceRatio` y `floorNet`.
  `compose preview` y las proyecciones cliente siguen mostrando sólo netos finales. Nunca se muestra el margen del
  mercado base en lugar del real.

**Factor de talento.** No requiere contrato nuevo: existe desde 1.0.0. Un costo declarado como referencia de un país
(`localization: { kind: "reference_adjusted", referenceCountry }`) se multiplica por el registro `talent_factor` del
par (país de la persona, país de referencia); un costo `specific` de un país no recibe factor y debe coincidir con
el `talentCountry` de la línea. Sin factor para el par, la cotización queda `needs_input`: `MISSING_TALENT_FACTOR`
en el kernel y, en el carril de catálogo y composición, `MISSING_CATALOG_SELECTION` con ruta
`lines.<lineId>.talentFactor`. La decisión de datos del 2026-10-11 es declarar los costos del Excel como referencia
de Chile y registrar un factor por país de la persona.

**Datos (catálogo v5).** `catalog.review-v5.json` registra las dos palancas con vigencia desde el 2026-10-11: los
costos del workbook como costo de cada perfil en Chile, un factor de talento por país de la persona relativo a Chile
y un factor de mercado por país del cliente, con `floorBasis: "base_market"` en los dos mercados cuyo factor es
menor que 1 (Colombia y Perú). Hasta v4 todos los factores de mercado valían 1 y el país del cliente sólo cambiaba
moneda y redondeo: la hoja «Factor País» del workbook era una tabla guía que ninguna fórmula referenciaba. Valores,
fuentes y cuáles son estimaciones: el JSON, su `audit` y
[mantenimiento del catálogo](../documentation/finance/cotizador-v3-mantenimiento-catalogo.md#factores-de-país-talento-y-mercado-2026-10-11).

**Alternativas descartadas.**

- *Piso parejo en todos los mercados.* Convierte cada cotización de un mercado más barato en una excepción y vacía
  de sentido el aviso.
- *Un piso distinto por país, escrito a mano.* Dos números por país que mantener, y nada impide que queden
  incoherentes con el factor. Derivarlo del factor deja un solo dato por mercado.
- *Inferir la regla desde `factor < 1`.* Cambiaría el veredicto de cualquier catálogo anterior que tuviera un factor
  distinto de 1; la regla debe estar declarada en el dato.
- *Bajar el costo junto con el precio.* El costo sólo baja si la persona es de un país más barato; eso es el factor
  de talento, que es otro hecho.

**Reglas duras.**

- **NUNCA** presentar el margen equivalente al mercado base como si fuera el margen real.
- **NUNCA** declarar `floorBasis` en un factor de mercado sin una decisión del operador sobre ese mercado.
- **NUNCA** usar el factor de talento para representar lo que paga un mercado, ni el de mercado para representar lo
  que cuesta una persona: son hechos distintos y se declaran por separado.
- **SIEMPRE** que exista el costo real de un perfil en un país, registrarlo como costo específico; el factor de
  talento es la aproximación para cuando ese dato no existe.

**No decidido a propósito.** Factores por tipo de cliente (pyme, licitación, cliente estratégico), que hoy se
expresan como precio pactado; factores de talento por perfil o seniority, que hoy se expresan como costo específico;
y regla de redondeo y tipo de cambio para EUR, sin los cuales todavía no se puede cotizar en EUR a un cliente de
España (la resolución lo bloquea por falta de tasa USD→EUR).

**Verificación (2026-10-11, local).** `pnpm pricing:v3:test`: 13 archivos y 407 pruebas; ESLint limpio. Todos los
artefactos congelados en disco responden `verified: true` (31 en esta máquina); la guarda permanente exige además
uno firmado por cada motor del registro, y el de `1.2.0` es
[`managed-care-colombia.artifact.json`](../../data/pricing/v3-operating/managed-care-colombia.artifact.json)
(cliente y equipo en Colombia, COP). Medido con el catálogo v5: esa cotización sale a precio de política con margen
real 0,4152 y ninguna línea marcada; antes de `floorBasis`, la misma cotización con factor 0,90 marcaba las seis.
[Readback con cifras](../documentation/finance/cotizador-v3-superficie-implementada.md).

## No decidido a propósito

Redondeo sobre el total del período en vez de por fila; redondeo a terminaciones comerciales (por ejemplo
`…990.000`), que hoy se expresa como precio pactado; ajustes distintos de descuento y neto pactado; y la promoción
de todo esto al cotizador canónico, que conserva su ADR y su unidad de trabajo propias.
