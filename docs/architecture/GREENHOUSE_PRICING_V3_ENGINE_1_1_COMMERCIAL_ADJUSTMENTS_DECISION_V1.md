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
- `multiple` debe ser un múltiplo entero de la unidad mínima de la moneda (`INVALID_PRICE_ROUNDING` si no).
- «Cumplía antes de redondear» se lee sobre los importes sin redondear, a 60 de los 80 dígitos de trabajo. Un precio
  construido como `costo / (1 − piso)` queda un pelo sobre o bajo el piso por el último dígito de la división; leerlo
  a 60 dígitos lo vuelve determinista. El control `MARGIN_BELOW_FLOOR` no usa tolerancia alguna.
- La regla vive en el catálogo como registro `price_rounding`, **por moneda**, con fuente y vigencia como cualquier
  otro registro: `{ "currency": "CLP", "multiple": "10000" }`. Un registro puede llevar además `offerId`; la regla de
  una oferta prevalece sobre la general de su moneda. Cada moneda de cotización declara su propio múltiplo: no se
  convierte el múltiplo de otra moneda por tipo de cambio. Sin registro vigente para la moneda de salida no hay
  redondeo en esa moneda. Más de una regla aplicable del mismo nivel es un bloqueo (`AMBIGUOUS_PRICE_ROUNDING`).
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

## No decidido a propósito

Redondeo sobre el total del período en vez de por fila; redondeo a terminaciones comerciales (por ejemplo
`…990.000`), que hoy se expresa como precio pactado; ajustes distintos de descuento y neto pactado; y la promoción
de todo esto al cotizador canónico, que conserva su ADR y su unidad de trabajo propias.
