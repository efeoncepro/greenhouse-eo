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
>
> Nota 2026-10-11 (posterior): el registro tiene cuatro contratos. El cuarto es `1.3.0` (motor
> `pricing-v3-local/1.3.0`), agregado con el mismo patrón: la forma del engagement como dato propio, con una razón
> de precio. Ver el
> [delta del contrato 1.3.0](#delta-2026-10-11--contrato-130-la-forma-del-engagement-como-dato-propio). La fuente del
> registro es `PRICING_V3_ENGINES` en `schemas.ts`, no esta tabla.
>
> Nota 2026-10-11 (noche): «cuatro contratos» es el conteo de esa tarde. El registro tiene cinco contratos que
> conviven: `1.0.0`, `1.1.0`, `1.2.0`, `1.3.0` y `1.4.0` (motor `pricing-v3-local/1.4.0`), agregado con el mismo
> patrón: los costos de terceros de un encargo y una reserva de contingencia. Ver el
> [delta del contrato 1.4.0](#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia). En el
> carril de catálogo y composición, la regla de emisión de `1.4.0` va antes que las de los contratos anteriores; un
> `agreed_net` admite además `billing: "third_party"`, sólo en ese contrato.

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
  *Nota 2026-10-11 (posterior):* «costo real» es aquí el costo objetivo de ese perfil en ese país, no lo que hoy se
  paga por nómina. Ver la nota de cierre de este delta.

**No decidido a propósito.** Factores por tipo de cliente (pyme, licitación, cliente estratégico), que hoy se
expresan como precio pactado; factores de talento por perfil o seniority, que hoy se expresan como costo específico;
y regla de redondeo y tipo de cambio para EUR, sin los cuales todavía no se puede cotizar en EUR a un cliente de
España (la resolución lo bloquea por falta de tasa USD→EUR).
*Nota 2026-10-11 (posterior):* sigue igual con el catálogo v6. Lo que v6 agrega es EUR→USD, para costos en EUR.

**Verificación (2026-10-11, local).** `pnpm pricing:v3:test`: 13 archivos y 407 pruebas; ESLint limpio. Todos los
artefactos congelados en disco responden `verified: true` (31 en esta máquina); la guarda permanente exige además
uno firmado por cada motor del registro, y el de `1.2.0` es
[`managed-care-colombia.artifact.json`](../../data/pricing/v3-operating/managed-care-colombia.artifact.json)
(cliente y equipo en Colombia, COP). Medido con el catálogo v5: esa cotización sale a precio de política con margen
real 0,4152 y ninguna línea marcada; antes de `floorBasis`, la misma cotización con factor 0,90 marcaba las seis.
[Readback con cifras](../documentation/finance/cotizador-v3-superficie-implementada.md).

**Nota 2026-10-11 (posterior) — lo que cambió después sin tocar el motor.** El registro sigue
teniendo tres contratos (`1.0.0`, `1.1.0`, `1.2.0`); `calculate.ts`, `schemas.ts` y la resolución no cambiaron.

- **Base de costo (decisión del operador, CEO).** Los costos por persona del catálogo son el costo objetivo: el
  nivel de remuneración que quiere alcanzar para el equipo, tomado del Excel de pricing. Decidió expresamente que el
  cotizador no use el costo real de nómina. La nómina actual está por debajo, así que el margen real de hoy
  sobre las personas es mayor que el que muestra el cotizador. Un costo `specific` se registra sólo donde el costo
  objetivo de un perfil en un país se aparta de la referencia de Chile por el factor de talento. **NUNCA** proponer
  conectar la nómina real, describir el costo del catálogo como lo que Efeonce paga hoy, ni escribir la
  remuneración de una persona.
- **Catálogo v6.** Agrega un tipo de cambio de cotización EUR→USD de 1,20 (referencia del BCE: 1,1206), vigente
  desde el 2026-10-11, sin fecha de término y marcado como estimado. Lo eligió el agente bajo la instrucción del
  operador de usar un margen prudencial; no fue decidido expresamente para EUR. No hay USD→EUR ni regla de redondeo
  para EUR.
- **Factores de talento.** Chile vale 1 por definición. Los de Colombia, Perú, México, España y Estados Unidos los
  propuso el agente y siguen marcados como estimados; no son una decisión del operador.
  *Nota 2026-10-11 (noche):* eso describe esa ronda. El CEO cerró los factores de país ese mismo día («deja eso
  cerrado ya»): el catálogo v10 registra los cinco factores de talento (y los factores de mercado de Perú, México y
  España) como valores de política `confirmed` desde el 2026-10-12. Son valores de política, no observaciones de
  mercado. Una cotización fechada el 2026-10-11 sigue leyendo la estimación.
  [Detalle](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).
- **Lectura.** El resumen agrega `estimateExposure` (dónde pesa más un dato estimado; en la cotización de Colombia
  el factor de talento lleva el 64,7 % del costo) y, cuando corresponde, `runNotices`. Ninguna de las dos claves es
  del motor ni entra al resultado que firma.
- **Versiones vigentes.** Ya no se nombran a mano: las nombra el puntero `current.json` y se usan con `--current`.

Decisiones, alternativas y reglas:
[delta del flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones).
`pnpm pricing:v3:test` al cierre de esa ronda: 16 archivos y 501 pruebas.

*Nota 2026-10-11 (tarde):* «el registro sigue teniendo tres contratos» y «`calculate.ts`, `schemas.ts` y la
resolución no cambiaron» describen esa ronda de la mañana. El mismo día, más tarde, los tres archivos cambiaron para
agregar el contrato `1.3.0`: es el delta siguiente. Los contratos `1.0.0`, `1.1.0` y `1.2.0` siguen byte a byte.

## Delta 2026-10-11 — contrato 1.3.0: la forma del engagement como dato propio

Diseño elegido por el operador (CEO) el 2026-10-11. Sigue el patrón de este ADR: contrato nuevo, motor nuevo en el
registro (`pricing-v3-local/1.3.0`, con su propio `precisionPolicy`), contratos anteriores intactos.

**Contexto.** El brief tenía un solo dato sobre el engagement, `engagementCode` (`monthly`), que es una cadencia de
facturación y es lo que selecciona la política de precio. No había dónde decir **qué forma de compromiso** se vende:
un servicio continuo o un encargo acotado (alcance, inicio, término, aceptación y salida). Todo se cotizaba al precio
de un compromiso continuo. El workbook de pricing y el cotizador de Greenhouse en producción ya llevan un
multiplicador por modelo comercial (On-Going 0 %, On-Demand +10 %, Hybrid +5 %, Licence/Consulting +15 %); el V3 no
lo tenía.

**Decisión.** La forma del engagement es un dato propio del brief, separado de `engagementCode`, y su efecto es una
razón de precio que vive en un registro de catálogo por forma.

- **En el kernel.** El contrato `1.3.0` contiene todo lo de `1.2.0` y agrega dos claves opcionales:
  `request.engagementForm` (un id) y `snapshot.engagementFactors[]` (`{ form, priceRatio, source }`, con
  `priceRatio` decimal positivo). El request declara la forma y el snapshot trae su razón, igual que el request
  declara el mercado de la oferta y el snapshot trae su factor. Las formas son datos: el kernel no conoce ninguna
  lista, sólo la razón de la que el request nombra. Las dos claves existen sólo en `1.3.0`: un contrato anterior que
  las traiga se rechaza, no se reinterpreta. Un input `1.2.0` reetiquetado `1.3.0` es válido y cotiza igual (razón 1,
  ajuste cero).
- **`engagementCode` no cambia.** Sigue seleccionando la política de precio. Con o sin forma, una cotización enlaza
  los mismos registros de política.
- **Dónde entra la razón en la formación del precio.** Por fila (línea × período × clase `monthly` o `setup`), en
  este orden:
  1. Costo de cada componente. La razón no lo toca; tampoco toca `cashCommitment`.
  2. Precio de política de cada componente: costo por el multiplicador de la política (las herramientas, fees y
     provisiones, sólo si la base de la política es `all_costs`).
  3. Factor de mercado, sólo sobre el componente humano.
  4. **Razón del engagement, sobre el precio de todos los componentes de la fila**: persona, fee de plataforma,
     provisiones y herramientas, en filas mensuales y de implementación. Se aplica al importe sin redondear.
  5. Presentación de la fila (`HALF_UP` a la precisión de la moneda): es el precio de política de esta cotización.
     El precio presentado es el producto exacto redondeado, no el precio presentado anterior por la razón.
  6. Redondeo comercial (`roundingAdjustment`), con su regla de conservación del piso.
  7. Ajustes (`discount`, `agreed_net`): se aplican sobre el precio que ya lleva la razón.

  El precio guardado de cada componente es el precio al que se vende, de modo que los componentes de una fila siguen
  sumando su precio sin redondear; su `trace` nombra la razón (`engagementPriceRatio`).
- **Forma del resultado 1.3.0.** Toda fila agrega `engagementAdjustment` (precio de política con la razón menos el
  mismo precio a razón 1, los dos presentados y antes del redondeo comercial; con signo) y `engagementPriceRatio`
  (la razón tal como la declara el snapshot; `"1"` cuando el request `1.3.0` no declara forma). Los totales agregan
  `engagementAdjustment`. Un resultado de un contrato anterior no tiene ninguna de las dos claves.
- **Identidad de la fila y de los totales**, exacta en cada paso:

  ```text
  precio del mercado base a razón 1
    + marketAdjustment       → precio de política en el mercado de la oferta (lo que forman 1.0.0 a 1.2.0)
    + engagementAdjustment   → precio de política de esta cotización
    + roundingAdjustment     → undiscountedPrice
    + uplift − discount      → net;   net − cost = marginAmount
  ```

  `undiscountedPrice − roundingAdjustment − engagementAdjustment − marketAdjustment` es el precio del mercado base
  sin forma. Los totales son la suma de las filas, clave por clave.
- **Con un factor de mercado cuyo piso sigue al mercado base** (`floorBasis: "base_market"`, hoy Colombia y Perú). La
  forma es una condición comercial de la cotización, no un efecto de país: pertenece al precio del mercado base tanto
  como al del mercado. La razón multiplica los dos términos de `ρ` y lo deja igual, y `ρ` se lee donde lo lee
  `1.2.0`: sobre los dos precios a razón 1, como se presentan. Por eso `marketAdjustment`, `marketPriceRatio` y
  `floorNet` son, dígito por dígito, los de la misma fila cotizada sin forma. En la conservación del piso del
  redondeo, «cumplía antes de redondear» se lee sobre el precio del mercado base **con** la razón (es el precio de
  esa fila a factor 1), y el mínimo conservado usa el mismo piso de siempre.
- **El piso no se mueve.** `minimumMargin` y `floorNet` son los de la fila sin forma, sin relajarse ni por una
  unidad de redondeo. Lo que cambia es el neto que se compara contra ese piso. Una razón mayor que 1 es margen que la
  fila tiene de verdad: la prima cuenta como margen, y un descuento puede consumirla hasta el mismo piso que rige en
  On-Going. Una razón menor que 1 es un precio como cualquier otro: puede dejar la fila bajo su piso, y entonces sale
  marcada `MARGIN_BELOW_FLOOR`; el redondeo no la repara (sólo la sube al múltiplo siguiente).
- **Errores del kernel.** Una forma declarada sin su razón en el snapshot retiene el cálculo:
  `MISSING_ENGAGEMENT_FACTOR` en `snapshot.engagementFactors` (`needs_input`). Nunca se asume una razón. Una forma
  repetida en el snapshot es `DUPLICATE_ID`. La fuente de la razón se juzga como cualquier otra (vigencia, `pending`,
  `estimated`).
- **En el catálogo.** Clase de registro `engagement_factor`: `{ form, priceRatio, offerId? }`. Un registro por forma
  (general); un registro con `offerId` prevalece sobre el general para esa oferta, y el de otra oferta nunca aplica.
  Se mantiene con el mismo `catalog preview|apply` que el resto; una revisión no puede convertir un registro en la
  razón de otra forma o de otra oferta.
- **En la resolución.** Emite `1.3.0` si y sólo si el brief declara `engagementForm`, también cuando la razón vale 1:
  la forma declarada es parte de lo que la cotización congela. Como `1.3.0` es superconjunto, esta regla va antes
  que las de `1.2.0` y `1.1.0`. Sin el campo no cambia nada: la cotización resuelve a su contrato `1.0.0`–`1.2.0`
  byte a byte, tenga el catálogo los registros `engagement_factor` que tenga. Una forma sin registro vigente a la
  fecha de la cotización es `MISSING_CATALOG_SELECTION` con ruta `engagementForm` (exit 2); dos vigentes en el nivel
  que prevalece, `AMBIGUOUS_SELECTION`; una razón `pending` bloquea con `PENDING_CATALOG_VALUE` y una `estimated` se
  cotiza bajo revisión.
- **Lectura.** El resumen agrega en la raíz `engagementForm`
  (`{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }`, con `scope` `general` u `offer`) y
  `totals.engagementAdjustment`; la razón 1 también se nombra. `compose assess` repite el bloque dentro de
  `margin.policyFloor`; `explain` lo agrega a `commercialAdjustments` y, por fila, `engagementAdjustment` y
  `engagementPriceRatio`. `compose preview` y las proyecciones cliente muestran sólo el neto final. `compose split`
  no cambia de propósito: el kit toma la razón como cualquier componente.

**Datos (catálogo v9).** Dos registros generales, `confirmed`, vigentes desde el 2026-10-11: `engagement:on_going`
con razón 1 y `engagement:on_demand` con razón 1,10. Sólo esas dos formas están cargadas. Una cotización con fecha
anterior que declare una forma no tiene registro vigente y queda `needs_input`.

**Quién decidió qué.** El CEO eligió este diseño (la «opción B») y preguntó si 10 % era lo correcto, dejando el
ajuste al agente. El agente lo mantuvo: es el extremo bajo del 10–15 % que las agencias descuentan a un retainer
frente a una tarifa de proyecto, y en el V3 la puesta en marcha, la coordinación y los compromisos con proveedores
se costean aparte en vez de esconderse en la prima.

**Qué es On-Demand.** Una **forma** de compromiso (acotado: alcance, inicio, término, aceptación y salida). No es
una cuarta oferta ni un modelo de delivery: `offerId` se sigue eligiendo por lo que se vende. Efeonce Factory es la
vía comercial reservada para los encargos On-Demand. Fuentes:
[modelo operativo de engagements y proyectos](../business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md) y
[modelo de negocio de Factory](../business-models/factory/EFEONCE_FACTORY_BUSINESS_MODEL_V1.md).

**Alternativa descartada.**

- *Duplicar las 96 políticas de precio por forma.* La prima viviría en 96 registros con tasas raras y cada cambio de
  objetivo habría que hacerlo dos veces. Un registro por forma deja la prima en un solo dato.

**Lo que el diseño fija a propósito** (está en el código y en sus pruebas, no fue una alternativa presentada al
operador):

- El contrato lo decide el brief, no el catálogo. Un brief congelado antes de `1.3.0` no puede declarar la forma y
  vuelve a resolver como siempre, aunque su catálogo gane registros después.
- Declarar la forma con razón 1 también emite `1.3.0`: lo que se congela es la forma, no sólo su efecto.
- La razón no entra al piso por ningún camino: ni a `minimumMargin` ni a `ρ` ni a `floorNet`.

**Reglas duras.**

- **NUNCA** usar `engagementCode` para decir la forma del compromiso, ni cambiarlo para que un encargo acotado
  seleccione otra política: la forma va en `engagementForm`.
- **NUNCA** crear políticas de precio por forma. La prima de una forma vive en su registro `engagement_factor`.
- **NUNCA** aplicar la prima a mano (un `uplift`, un `agreed_net` calculado o un precio inline) ni asumir una razón
  para una forma sin registro.
- **NUNCA** mover un piso por la forma, ni presentar la prima como intocable: es margen, y un descuento puede
  consumirla hasta el piso de la oferta.
- **NUNCA** tratar On-Demand como una oferta o un modelo de delivery, ni elegir la forma por el precio que deja.
- **NUNCA** cotizar Hybrid o Licence/Consulting con una razón inventada. Hybrid se cotiza como dos cotizaciones: una
  base On-Demand y una operación On-Going.
- **SIEMPRE** declarar `engagementForm` cuando el compromiso es acotado. Un brief sin el campo se cotiza como
  On-Going y el resultado no lo dice.
- **SIEMPRE** correr la guarda de artefactos congelados al tocar `calculate.ts`, `schemas.ts` o la resolución; exige
  un artefacto firmado por cada motor del registro.

**Verificación (2026-10-11, local).** El primer artefacto `1.3.0`, y el que la guarda exige para ese motor, es
[`designer-on-demand.artifact.json`](../../data/pricing/v3-operating/designer-on-demand.artifact.json): un mes de un
diseñador senior dedicado en Chile, On-Demand, en CLP. `replay` responde `verified: true`. Medido: costo 1.768.438,
neto 2.790.000, margen 36,6 %, `engagementAdjustment` 252.635, `roundingAdjustment` 11.026, ninguna línea bajo el
piso. La misma demanda sin `engagementForm`, con las mismas versiones, resuelve a `1.1.0`: mismo costo, neto
2.540.000 y margen 30,4 %.

**Sigue abierto.**

- No hay forma Hybrid ni Licence/Consulting, ni un tope para la razón.
- Una forma no declarada se cotiza como On-Going sin aviso.
  *Nota 2026-10-11 (noche):* sigue siendo así para el precio. Lo que cambió: si el catálogo tiene una reserva de
  contingencia por forma que podría aplicar a la oferta y el brief no declara `engagementForm`, la resolución deja el
  supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`. Con el catálogo v10 eso ocurre en las dos
  ofertas de servicio gestionado.
- El plazo del contrato con el cliente no es un input: una cotización tiene períodos, no un plazo.
- Un encargo de menos de un mes se expresa como horas dentro de un período.
- Todavía no se modelan los costos de terceros de un encargo ni una reserva de contingencia para trabajo de alcance
  fijo. No hay contrato de entrada ni datos para eso.
  *Nota 2026-10-11 (noche):* dejó de ser cierto ese mismo día. Los dos existen desde el contrato `1.4.0` y el
  catálogo v10: es el delta siguiente.

## Delta 2026-10-11 — contrato 1.4.0: costos de terceros y reserva de contingencia

Posterior al delta anterior, la noche del mismo día. Construido con el visto bueno del operador (CEO) a la
recomendación del agente («seguiré tu recomendación»). Sigue el patrón de este ADR: contrato nuevo, motor nuevo en el
registro (`pricing-v3-local/1.4.0`, con su propio `precisionPolicy`), contratos anteriores intactos. El registro
tiene cinco contratos.

**Contexto.** Un encargo de alcance fijo trae dos cosas que el motor no podía expresar.

1. **Lo que se compra a terceros para el trabajo** (producción, talento, medios, licencias, impresión) y se
   refactura al cliente. No entraba a la cotización: el motor sólo conoce líneas de equipo con sus recursos. Si se
   lo hubiera metido como un recurso de una línea, habría tomado el multiplicador de la política de esa persona
   (1,82 veces con un objetivo de 45 % sobre todos los costos), la razón de la forma del engagement y el descuento
   de la fila, y habría diluido el veredicto de piso de esa fila.
2. **Un colchón para el desvío de un trabajo de alcance fijo.** Las prácticas lo aplican a mano (el 12 % que el
   operador usó en una oferta de licitación). Fuera del motor, el margen que se muestra no cae cuando el colchón no
   se cobra, y el piso no se mueve.

**Decisión.** Las dos capacidades entran con un solo contrato.

- **Costos de terceros: el importe vive en la cotización y la regla de precio en el catálogo.** El brief declara
  cada costo con su proveedor, importe, moneda, cantidad, períodos y evidencia (referencia de la cotización del
  proveedor, fecha y vigencia). La regla vive en un registro `third_party_policy` **por categoría**: método, tasa,
  piso y redondeo. La cotización lleva sólo el id de la categoría, nunca una tasa.
- **Cada costo refacturado es una fila comercial propia**, de clase `third_party`, con el piso de su categoría.
  Nunca es un componente de una fila de equipo.
- **Lo que nunca toca una fila de terceros:** el multiplicador de una política de precio, el factor de mercado, la
  razón de la forma del engagement, un descuento por tasa y la reserva de contingencia. Lo único que mueve su precio
  es la regla de su categoría y un `agreed_net` explícito con `billing: "third_party"` que nombre ese costo.
- **Tipo de cambio de identidad.** Un proveedor que cobra en la moneda de salida no se convierte: un costo en CLP
  dentro de una cotización en CLP entra exacto. Cualquier otra moneda pasa por la moneda de cálculo con los tipos de
  cambio que la cotización congela.
- **Un costo que el cliente paga directo al proveedor es una nota.** Queda congelado en el brief y no llega al
  kernel, a ningún total, a ninguna cifra de caja ni a ninguna conversión.
- **La reserva de contingencia es un costo sobre una base declarada.** Un registro `contingency_reserve` del
  catálogo trae la tasa y la base (`human`: el costo de la persona; `own_costs`: todos los costos propios de la
  fila). La resolución lo elige por lo que el registro nombra —oferta, forma del engagement, ambas o ninguna— y el
  kernel lo agrega como componente de costo de cada fila de equipo. Nunca descansa sobre una fila de terceros.
- **Sale de una cotización sólo por una renuncia declarada:** `brief.contingency = { kind: "waived", reason }`. El
  importe pasa a cero, la cotización queda bajo revisión y los totales dicen cuánto se dejó de reservar.
- **Un contrato para las dos capacidades.** Tocan las mismas costuras (el costo de la fila, las claves de totales y
  el piso) y tienen que coincidir en una cosa: la base de la reserva se define excluyendo las filas de terceros.
- **Regla de emisión.** La resolución emite `1.4.0` si y sólo si el brief declara al menos un costo refacturado
  **o** exactamente un registro de reserva prevalece para la cotización, también cuando el brief renuncia a ella.
  En cualquier otro caso rige la cadena anterior sin cambio.

**En el kernel.** El contrato `1.4.0` contiene todo lo de `1.3.0` y agrega, todas opcionales:

| Dónde | Clave | Contenido |
| --- | --- | --- |
| request | `thirdPartyCosts[]` (hasta 50) | `{ costId, label, category, amount, currency, quantity, periodIds, source }`. Sólo los refacturados; sin proveedor. `amount` es el importe unitario en la moneda del proveedor; `source` es la evidencia del importe |
| request | `contingencyWaiver` | `{ reason }` |
| request | `adjustments[].billing` | Un `agreed_net` admite además `third_party`; sus `lineIds` son entonces `costId` |
| snapshot | `thirdPartyPolicies[]` | `{ category, method: markup \| target_margin, rate, minimumMargin, rounding: commercial \| none, source }`, una por categoría |
| snapshot | `contingencyReserve` | `{ rate, base: human \| own_costs, source }`, con `0 < rate < 1` |

Las categorías son datos: el kernel no conoce ninguna lista, sólo la regla de la que un costo nombra. Las claves
existen sólo en `1.4.0`: un contrato anterior que las traiga se rechaza, no se reinterpreta. Un input `1.3.0`
reetiquetado `1.4.0` es válido y cotiza igual. La etiqueta del componente de reserva es una constante del kernel
(`Contingency reserve`): el snapshot trae una tasa y una base, no un nombre; el registro que la nombra queda en los
enlaces de la cotización.

**En el brief** (`pricing-v3-brief/1`, dos campos opcionales y **sin valor por defecto**: el brief parseado está
dentro de todo resultado congelado, y un default movería el digest de cada artefacto anterior).

- `thirdPartyCosts[]`: `{ costId, category, label, supplier, settlement, amount, currency, quantity, periodIds,
  evidence }`. `settlement` es `reinvoiced` (Efeonce compra y refactura) o `client_direct` (el cliente le paga al
  proveedor). `periodIds` es obligatorio: el importe completo (`amount × quantity`) se cobra en cada período
  listado, así que un costo de una vez nunca se multiplica por el plazo en silencio. `evidence` (`reference`,
  `effectiveFrom`, `effectiveUntil`, `status`) es obligatoria en un costo refacturado y opcional en uno que paga el
  cliente. `supplier` es interno: queda en el brief y no llega al kernel.
- `contingency`: `{ kind: "waived", reason }`. Es una unión por `kind` para que otra declaración se pueda agregar
  después sin tocar ésta.

**En el catálogo** (`pricing-v3-catalog/1`, dos clases de registro nuevas; el catálogo tiene trece).

- `third_party_policy`: `{ category, label, method, rate, minimumMargin, rounding, offerId? }`. Un registro con
  `offerId` prevalece sobre el general de la misma categoría, y el de otra oferta nunca aplica. Refacturar al costo
  es `markup` con tasa 0, piso 0 y redondeo `none`. La validación rechaza una regla cuyo piso pide más margen del
  que su método da (`rate / (1 + rate)` en un `markup`, la tasa misma en un `target_margin`) o un margen objetivo de
  1 o más: `INVALID_THIRD_PARTY_POLICY`.
- `contingency_reserve`: `{ label, rate, base, offerId?, engagementForm? }`. Una tasa fuera de `0 < rate < 1` es
  `INVALID_CONTINGENCY_RESERVE`.
- Una revisión puede cambiar la regla de un registro, nunca de qué categoría, oferta o forma es la regla
  (`CATALOG_IDENTITY_CONFLICT`). La función de identidad del change-set ahora es exhaustiva: una clase de registro
  agregada a la unión sin su caso deja de compilar, en vez de comparar dos `undefined` y dejar pasar la revisión.

**En la resolución.**

- **Regla de precio de un costo.** Por `costId`: el registro de la oferta prevalece sobre el general. Ninguno
  vigente es `MISSING_CATALOG_SELECTION` y dos del nivel que prevalece `AMBIGUOUS_SELECTION`, los dos con ruta
  `thirdPartyCosts.<costId>.policy`. Una regla `pending` bloquea (`PENDING_CATALOG_VALUE`); una `estimated` se
  cotiza bajo revisión.
- **Reserva.** Aplican los registros que no nombran nada que el brief contradiga; gana el que nombra más
  dimensiones (oferta y forma vence a cualquiera de las dos sola, y cualquiera de las dos al general). Dos en el
  nivel que prevalece —también uno que nombra sólo la oferta contra otro que nombra sólo la forma— bloquean con
  `AMBIGUOUS_CONTINGENCY_RESERVE` (ruta `contingency`): no hay elección silenciosa.
- **Forma no declarada.** Si el catálogo tiene reservas por forma que podrían aplicar a la oferta y el brief no
  declara `engagementForm`, la resolución agrega el supuesto
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`. Es lo que evita que una forma olvidada signifique en
  silencio «sin reserva».
- **Renuncia sin reserva.** Un brief que renuncia a una reserva que ningún registro vigente le daría es un error
  del brief (otra oferta, otra forma, una fecha anterior): `CONTINGENCY_WAIVER_WITHOUT_RESERVE`.
- **Emisión.** `1.4.0` va primero en la cadena; como es superconjunto, una cotización `1.4.0` puede usar además
  neto pactado, redondeo, factor de mercado con `floorBasis` y forma del engagement. Un brief que sólo trae notas
  `client_direct` se queda en su contrato anterior, igual que una cotización para la que sólo existe la reserva de
  otra oferta o de otra forma. Un catálogo congelado antes de `1.4.0` no tiene reserva y un brief congelado antes no
  tiene costos: los dos vuelven a resolver como siempre.
- **Períodos.** Cada período es su propia entrada del kernel, así que un costo llega a cada período que lista como
  un costo del período 1 de esa entrada. Un período fuera del plazo o repetido es `INVALID_THIRD_PARTY_SCHEDULE`
  (también en una nota `client_direct`); un costo refacturado en un período sin ninguna línea activa es
  `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD`, porque ese período no tiene cotización de la que ser fila.
- **Ids.** Los ajustes nombran las filas por el id de su padre, así que costos y líneas comparten un espacio de
  nombres: un `costId` repetido o igual a un `lineId` es `DUPLICATE_THIRD_PARTY_COST_ID`.
- **Tipos de cambio.** Un costo en la moneda de salida no pide ningún registro. Uno en la moneda de cálculo usa el
  tipo de cambio de salida que la cotización ya congela. Cualquier otra moneda necesita su registro hacia la moneda
  de cálculo; si falta, `MISSING_CATALOG_SELECTION` en `fx.<moneda>:<moneda de cálculo>`.
- **Borrador comercial.** En `commercial_draft`, la evidencia de un costo refacturado que no esté `confirmed` es
  `UNCONFIRMED_THIRD_PARTY_COST`.
- **Enlaces.** `(costId, "third_party_policy")` y `("*", "contingency_reserve")`.

**Dónde entra cada elemento en la formación del precio, en orden.**

*Fila de equipo* (línea × período × clase `monthly` o `setup`):

1. Costo de cada componente: la persona (con su factor de talento) y los recursos de la fila.
2. Precio de política de cada componente: costo por el multiplicador de la política (los recursos, sólo si la base
   de la política es `all_costs`).
3. Factor de mercado, sólo sobre el componente humano.
4. **Reserva de contingencia.** Se lee con los componentes de la fila ya armados y antes de sumar su precio, así
   que nunca descansa sobre sí misma. Base: el costo del componente humano (`human`) o la suma de los costos de
   todos los componentes de la fila (`own_costs`). Reserva = base × tasa. Entra como un componente más, de clase
   `contingency_reserve`: su costo es la reserva; su precio, la reserva por el multiplicador cuando la política
   forma el precio sobre todos los costos, y al costo si no; `cashCommitment` 0; sin factor de mercado. Su `trace`
   lleva `rate`, `base` y `baseAmount`. No se agrega cuando la base es cero (una fila `setup` bajo base `human` no
   tiene persona) ni cuando el request trae la renuncia.
5. Razón de la forma del engagement, sobre el precio de todos los componentes de la fila, la reserva incluida.
6. Presentación de la fila (`HALF_UP` a la precisión de la moneda). `contingencyReserve` de la fila es el costo
   presentado menos el costo presentado que la fila tendría sin reserva: una diferencia de importes presentados,
   como `marketAdjustment`.
7. Redondeo comercial, con su regla de conservación del piso, que se lee sobre el costo con la reserva.
8. Ajustes (`discount`, `agreed_net` de `monthly` o `setup`).
9. Veredicto de piso sobre el neto final contra el costo con la reserva.

*Fila de terceros* (costo × período listado), después de todas las líneas:

1. Validación del costo: períodos sin repetir y dentro del plazo (`INVALID_PERIOD`), importe sin más decimales que
   la moneda del proveedor (`INVALID_THIRD_PARTY_AMOUNT`) y evidencia juzgada como cualquier fuente.
2. Conversión a la moneda de salida: factor 1 si el proveedor cobra en ella; si no, tipo de cambio de su moneda a
   la de cálculo por el tipo de cambio de salida.
3. Costo = `amount × quantity × factor`.
4. Precio por la regla de su categoría: `costo × (1 + rate)` en un `markup`, `costo / (1 − rate)` en un
   `target_margin`. Nada más: sin multiplicador de una línea, sin factor de mercado y sin razón de forma. Los tres
   precios del recorrido son el mismo, así que `marketAdjustment` y `engagementAdjustment` valen 0 y
   `marketPriceRatio` y `engagementPriceRatio` valen `"1"`, declare lo que declare la cotización.
5. Un solo componente, de clase `third_party`, **denominado en la moneda de salida** (a diferencia de todos los
   demás, que van en la moneda de cálculo). Su `trace` lo dice: `denominatedIn`, `outputFx: "1"`,
   `supplierCurrency`, `supplierAmount`, `fxPath` y `fxRate`. Su `cashCommitment` es su costo.
6. Presentación (`HALF_UP` a la precisión de la moneda de salida).
7. Redondeo comercial **sólo si la regla de la categoría dice `rounding: "commercial"`**, con la misma conservación
   del piso sobre el `minimumMargin` de la categoría. Con `none` el precio de política queda como está: un costo
   refacturado al costo en su propia moneda da neto exactamente igual a lo que cobra el proveedor.
8. Ajustes: sólo un `agreed_net` de `billing: "third_party"`, por período, repartido en proporción entre los costos
   que nombra. Un `discount` o un `agreed_net` de equipo que nombre un `costId`, o uno de terceros que nombre una
   línea, es `UNKNOWN_ADJUSTMENT_LINE`: un descuento por tasa no puede alcanzar lo que cobra un proveedor.
9. Veredicto de piso sobre su propio neto contra su propio costo, con el `minimumMargin` de su categoría.

La fila lleva `lineId` `<costId>:<período>:third_party`, `parentLineId` = `costId` y el `label` declarado.

**Forma del resultado 1.4.0** (un resultado de un contrato anterior no tiene ninguna de estas claves; no van en
cero: no van).

- Por fila: `kind` puede ser `third_party`, y toda fila agrega `contingencyReserve` (cero en una fila de
  terceros).
- En totales: `contingencyReserve`, `contingencyBase`, `contingencyReserveWaived`, `thirdPartyCost`,
  `thirdPartyNet` y `ownWorkMarginRate`.
- En el carril de catálogo y composición, el libro de caja (`cashLedger`) gana una entrada `third-party:<costId>`
  por período, que sale de la entrada del equipo (`human-monthly-and-once`): lo que compromete un costo refacturado
  se le paga a su proveedor.

**Identidades de los totales**, exactas:

- Cada total es la suma de sus filas, clave por clave. El recorrido de precio de `1.3.0` se conserva en toda fila.
- `thirdPartyCost` y `thirdPartyNet` son las sumas sobre las filas de terceros. El trabajo propio es el resto:
  `net − thirdPartyNet` y `cost − thirdPartyCost`.
- `ownWorkMarginRate = ((net − thirdPartyNet) − (cost − thirdPartyCost)) / (net − thirdPartyNet)`; `null` cuando
  la cotización no vende trabajo propio a un neto mayor que cero.
- `cost − contingencyReserve` es el costo de la misma cotización sin reserva.
- `contingencyBase` es el costo sobre el que descansa la reserva aplicada. `contingencyReserveWaived` es lo que una
  renuncia dejó fuera del costo: lo que `contingencyReserve` habría sido.
- `marginRate` no cambia de significado: sigue siendo el margen real de toda la cotización, mezclado.
- Un impuesto `exclusive` se aplica al neto entero, filas de terceros incluidas.

**Semántica del piso.**

- **No hay veredicto de piso a nivel de cotización**, ni sobre el margen mezclado ni sobre el del trabajo propio.
  `ownWorkMarginRate` es una lectura; el único veredicto sigue siendo `MARGIN_BELOW_FLOOR` por fila.
- **Fila de equipo:** el `minimumMargin` de su política de precio, sobre su propio neto contra su propio costo, la
  reserva incluida. Por eso `floorNet = costo × ρ / (1 − m)` sube con la reserva: un precio que no la cobra queda
  bajo el piso, y el mismo neto pactado sin reserva no.
- **Fila de terceros:** el `minimumMargin` de su categoría, sobre su propio neto, con `ρ = 1` siempre. Una
  categoría con piso 0 sólo sale marcada cuando se vende bajo el costo.
- **El veredicto de una fila no depende de ninguna otra.** Agregar o quitar un costo de terceros no cambia ningún
  importe, piso ni diagnóstico de una fila de equipo; un trabajo que es 60 % medios al costo deja intacto el
  veredicto del equipo.
- La prima de una forma es margen; la reserva es costo. Un descuento puede consumir la primera hasta el piso de la
  oferta; si consume la segunda, la fila queda bajo el piso.

| Regla anterior | Fila de equipo con reserva | Fila de terceros |
| --- | --- | --- |
| Redondeo por fila (`1.1.0`) | Sin cambio; la conservación usa el costo con la reserva | Según el dato `rounding` de su categoría |
| `floorBasis: "base_market"` (`1.2.0`) | `ρ` se lee igual; la reserva no recibe factor de mercado, así que su precio es el mismo en los dos mercados | `ρ = 1` siempre |
| Reparto de un `agreed_net` (`1.1.0`) | Sin cambio | Sólo `billing: "third_party"`, por período, en proporción entre los costos nombrados |
| Razón de la forma (`1.3.0`) | Aplica, reserva incluida | Nunca aplica |

**Errores y diagnósticos del kernel.** Nuevos: `MISSING_THIRD_PARTY_POLICY` (una categoría sin su regla retiene el
cálculo, `needs_input`: no se asume ninguna tasa, tampoco «al costo»), `INVALID_THIRD_PARTY_AMOUNT` (error),
`CONTINGENCY_WAIVER_WITHOUT_RESERVE` (error) y `CONTINGENCY_RESERVE_WAIVED` (revisión). Reusados: `DUPLICATE_ID`
(un `costId` igual a un `lineId`, o una categoría repetida en el snapshot), `INVALID_PERIOD`, `INVALID_MARGIN_RATE`,
`UNKNOWN_ADJUSTMENT_LINE`, `AGREED_NET_WITHOUT_BASE` y `MARGIN_BELOW_FLOOR`. La evidencia de un importe, la regla de
una categoría y la reserva se juzgan como cualquier fuente: fuera de vigencia a la fecha de la cotización,
`STALE_SOURCE` (una cotización de proveedor vencida retiene la cotización siguiente); `pending`,
`MISSING_SOURCE_CONFIRMATION`; `estimated`, `ESTIMATED_SOURCE` bajo revisión.

**Lectura.** Cómo describen una cotización `1.4.0` el resumen, `explain` y las lecturas `compose assess`, `preview`,
`split`, `cash`, `schedule` y `commitments`, y la regla para leer sus dos márgenes:
[delta del flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

**Datos (catálogo v10).** Cinco registros `third_party_policy` y dos `contingency_reserve`, todos `estimated` y
vigentes desde el 2026-10-11: son estimaciones propuestas por el agente que el CEO aceptó, para ajustar con el
primer trabajo real. Valores y quién decidió qué: el JSON, su `audit` y el mismo delta del flujo operativo.

**Alternativas descartadas** (razones del diseño con que se construyó el contrato; lo que el operador aceptó fue la
recomendación del agente sobre los valores, no una elección entre estas alternativas).

- *Un costo de terceros como componente de una fila de persona.* Tomaría el multiplicador de esa fila, la razón de
  la forma y su descuento, y diluiría el veredicto de piso de esa persona.
- *Importes de terceros en el catálogo.* No son precios reutilizables: cada trabajo pediría una versión del
  catálogo. Una tarifa de proveedores recurrentes puede llegar después como un registro al que la declaración
  apunte; `quantity × amount` tiene la forma para eso.
- *Una tasa o un recargo escrito en la cotización.* Rompe «el operador cambia un solo dato»: el brief lleva sólo el
  id de la categoría.
- *Inferir «al costo» o el redondeo desde `rate == 0`.* Este ADR ya descartó inferir una regla desde un valor (el
  piso desde `factor < 1`). El redondeo es un campo declarado, y una categoría sin regla no se asume al costo.
- *Un piso a nivel de cotización, neto de lo refacturado.* El kernel no tiene un piso de cotización; agregarlo
  crearía un segundo dueño del veredicto. Filas separadas dan la misma honestidad con el veredicto que ya existe.
- *Paridad con el costo directo del cotizador en producción.* Ahí un costo directo se vende al costo con
  cumplimiento `unknown`, que degrada toda la cotización a advertencia y diluye el margen agregado; el fee de
  gestión de 10 % se cobra sobre un subtotal que lo incluye; y no lleva proveedor, evidencia ni vigencia.
- *La reserva como recargo de precio o como `agreed_net`.* El margen que se muestra no caería cuando no se cobra, y
  el piso no se movería.
- *La reserva materializada por la resolución como un recurso fijo.* La composición inyecta las herramientas
  después de resolver, así que la base `own_costs` quedaría mal, y el factor de talento y el tipo de cambio no se
  trasladarían.
- *La reserva sumada al costo humano.* No se vería como un componente propio.
- *Dos contratos (`1.4.0` y después `1.5.0`).* Dos motores, dos artefactos de guarda y dos rondas de cambios en los
  lectores para capacidades que tienen que coincidir en la base.

**Dónde el código se aparta del diseño** (rige lo que hace el código).

- Las claves de `1.4.0` en el kernel son todas opcionales, como en toda capacidad anterior; el diseño pedía
  `thirdPartyCosts` y `thirdPartyPolicies` como arreglos obligatorios.
- La etiqueta de la reserva es una constante del kernel; el `label` del registro no viaja en el snapshot.
- En una cotización con renuncia, `contingencyBase` vale 0 junto con `contingencyReserve`: sólo se informa lo que
  se dejó de reservar (`contingencyReserveWaived`).
- Una reserva a la que se renuncia y cuyo registro es `estimated` sigue levantando `ESTIMATED_SOURCE`.
- Una regla de terceros con un margen objetivo imposible (1 o más) omite esa fila con el diagnóstico
  `INVALID_MARGIN_RATE`, y la entrada queda `invalid`.
- La caja de un costo de terceros es el costo congelado de su fila, ya en la moneda de salida.

**Reglas duras.**

- **NUNCA** escribir una tasa, un recargo o un margen de terceros en la cotización: el brief lleva la categoría y la
  regla sale del catálogo.
- **NUNCA** meter un costo de terceros como recurso, herramienta o provisión de una línea de equipo, ni declarar
  trabajo propio como «tercero» para dejarlo bajo un piso más bajo.
- **NUNCA** aplicar a una fila de terceros un factor de mercado, la razón de una forma o un descuento por tasa. El
  único ajuste que la alcanza es un `agreed_net` de `billing: "third_party"` con su motivo.
- **NUNCA** sumar ni convertir un costo `client_direct` a un total, a la caja o al precio: es una nota.
- **NUNCA** asumir «al costo» para una categoría sin regla, ni inferir el redondeo desde la tasa.
- **NUNCA** quitar la reserva bajando su tasa, con un descuento o editando el catálogo para una cotización: sale
  sólo por `brief.contingency`, con motivo, y queda marcada.
- **NUNCA** emitir un registro `contingency_reserve` en una versión del catálogo que alguna cotización ya congelada
  pueda volver a resolver: se emite sólo en una versión más nueva que toda cotización a la que no debe alcanzar. De
  lo contrario esa cotización resolvería a `1.4.0` y su replay fallaría.
- **NUNCA** presentar el margen del trabajo propio como el margen de la cotización, ni el mezclado como el número
  que se compara con el piso de una oferta. El veredicto es por fila.
- **SIEMPRE** declarar `periodIds` de cada costo: no existe «todos los períodos» por defecto.
- **SIEMPRE** registrar la evidencia de un costo refacturado (referencia, fecha y vigencia de la cotización del
  proveedor) antes de congelar.
- **SIEMPRE** declarar `engagementForm` en un servicio gestionado: una reserva por forma no se evalúa sin ella.
- **SIEMPRE** correr la guarda de artefactos congelados al tocar `calculate.ts`, `schemas.ts` o la resolución; exige
  un artefacto firmado por cada uno de los cinco motores.

**Verificación (2026-10-11, local).** El primer artefacto `1.4.0`, y el que la guarda exige para ese motor, es
[`managed-on-demand-third-party.artifact.json`](../../data/pricing/v3-operating/managed-on-demand-third-party.artifact.json):
un servicio gestionado creativo vendido On-Demand en Chile, un período, en CLP, con un costo de producción en CLP,
talento en USD, medios al costo y una licencia que paga el cliente. `replay` responde `verified: true`, motor
`pricing-v3-local/1.4.0`. Medido: costo 14.750.055, neto 21.033.333, margen mezclado 29,87 %; terceros con costo
9.083.333 y neto 9.663.333; trabajo propio con costo 5.666.722 y neto 11.370.000, margen 50,16 %; reserva 436.800,
que es 12 % de 3.640.000; ninguna fila bajo su piso. Las identidades cierran sobre esas cifras:
14.750.055 − 9.083.333 = 5.666.722 y 21.033.333 − 9.663.333 = 11.370.000. Variantes medidas fuera de la carpeta de
datos, con `--current`:

- Con `brief.contingency` en `waived`: motor `1.4.0`, costo 14.313.255 (436.800 menos), neto 20.163.333,
  `contingencyReserve` 0, `contingencyBase` 0, `contingencyReserveWaived` 436.800 y la señal
  `CONTINGENCY_RESERVE_WAIVED`. `ESTIMATED_SOURCE` sigue nombrando `snapshot.contingencyReserve`: el registro de la
  reserva es estimado y se juzga aunque se renuncie a ella.
- Sin costos refacturados (sólo la nota `client_direct`) y sin `engagementForm`: motor `1.1.0`, ninguna clave de
  `1.4.0` en los totales y el supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`.

`replay` por CLI de los 19 artefactos versionados bajo `data/pricing/**` y de los dos que la guarda suma fuera de
esa carpeta: los 21 responden `verified: true`; 16 firmados por `1.0.0`, uno por cada uno de `1.1.0`, `1.2.0`,
`1.3.0` y `1.4.0`, y una cotización bloqueada que no llegó a calcular. Las pruebas del contrato están en
`pricing-v3-third-party-reserve.test.ts` (kernel) y `pricing-v3-third-party-reserve-resolution.test.ts` (catálogo,
resolución, composición y CLI); esta nota no registra una corrida de la suite.

**Sigue abierto** (no está modelado; no describirlo como existente).

- Cuándo se le paga a un proveedor, y si una compra ata más allá del trabajo (un plazo mínimo, derechos de uso que
  lo sobreviven).
- Una comisión sobre los costos que el cliente paga directo.
- Una tarifa de proveedores recurrentes en el catálogo.
- Tratamiento de impuesto por fila: hoy una cotización tiene un solo tratamiento.
- Una cotización, o un período, con terceros y sin ninguna línea de equipo.
- La reserva para un servicio On-Going ganado en una licitación con multas: los dos registros de hoy son por forma
  On-Demand.
- La liberación de la reserva después de la entrega.
- De antes: el plazo del contrato con el cliente, un asiento comprado para el trabajo, períodos de menos de un mes,
  la forma Hybrid, cotizar en EUR y una vista apta para el cliente de las lecturas internas.

## No decidido a propósito

Redondeo sobre el total del período en vez de por fila; redondeo a terminaciones comerciales (por ejemplo
`…990.000`), que hoy se expresa como precio pactado; ajustes distintos de descuento y neto pactado; y la promoción
de todo esto al cotizador canónico, que conserva su ADR y su unidad de trabajo propias.
