# SKY · social care 2027 — excepción al piso de margen

Registro interno del 10/10/2026. No es una cotización emitida.

## Decisión

El precio base acordado, **CLP 4.990.000 más IVA al mes, todo incluido**, queda bajo el piso de 45 % de la práctica
creativa. El operador (Julio Reyes, CEO) lo confirmó como excepción el 10/10/2026: «Sky es una excepción, es cliente».

El piso de 45 % sigue siendo la norma para servicios gestionados de la práctica creativa. La política
`creative-managed-service` no cambia (objetivo 45 %, mínimo 45 %). Este caso no sirve de referencia de margen para
otros clientes.

## Lo que dice el motor

`acordado.demand.json` es `final.demand.json` más un descuento explícito con motivo (tasa 0,0793605 sobre el precio al
piso). `acordado.artifact.json` congela el cálculo y se reproduce con `pricing:v3 replay` (`verified: true`).

| Concepto | CLP al mes |
| --- | --- |
| Costo modelado | 2.981.079 |
| Precio al piso de 45 % | 5.420.145 |
| Descuento | 430.145 |
| Precio acordado (neto) | 4.990.000 |
| Margen sobre el total | 40,26 % |

El motor marca las tres líneas bajo el piso; `acordado.assessment.json` las lista como `MARGIN_BELOW_POLICY_FLOOR`.
Para llegar a 45 % con este precio faltan CLP 236.579 de margen al mes (suma de `marginAmountShortOfFloor` en
`acordado.summary.json`).

`final.artifact.json` muestra 45 % porque contiene el precio al piso, no el acordado. La cifra que vale para el
margen real es la de `acordado.*`.

## Lo que sigue sin verificar

El margen está calculado sobre un costo modelado, no medido: sueldos históricos sin cargas confirmadas, reemplazos y
guardia como hipótesis, consumo de agentes sin medidor, dólar fijo a 1.000 y puesta en marcha obsequiada fuera del
costo. Si el costo real de las personas sale 15 % más alto, el margen baja a cerca de 34 %.

## Mismo acuerdo con el motor 1.1 (10/10/2026, más tarde)

Desde el motor 1.1 el precio pactado se declara directo, sin calcular una tasa: `acordado-neto.demand.json` lleva un
ajuste `agreed_net` de 4.990.000 mensuales sobre las tres líneas, y se cotiza con el catálogo `catalog.review-v4.json`
(redondeo comercial de CLP 10.000 por línea). El resultado económico es el mismo:

| Concepto | CLP al mes |
| --- | --- |
| Costo modelado | 2.981.079 |
| Precio al piso, redondeado | 5.430.000 |
| Descuento que calcula el motor | 440.000 |
| Precio acordado (neto) | 4.990.000 |
| Margen sobre el total | 40,26 % |

`acordado-neto.artifact.json` se reproduce con `pricing:v3 replay`. Los archivos `acordado.*` anteriores (descuento por
tasa, catálogo v3) siguen siendo válidos y reproducibles; quedan como registro de cómo se hizo antes.

Ese mismo día el operador confirmó como válidos los sueldos del Excel de pricing, que él construyó. Siguen siendo
hipótesis los reemplazos, la guardia y el consumo de agentes.

## Delta 2026-10-11 — el margen con el refuerzo de campaña dentro del fee

Esta nota registró la excepción con 40,26 %, antes de que el refuerzo de campaña pasara a estar incluido en el fee.
Cotizado a 12 meses con las versiones vigentes y el refuerzo adentro, el margen es 34,9 % con la forma de compra que
el CEO definió el 11/10/2026: Sprout con facturación mensual y un solo asiento, compartido con la persona de refuerzo.
El precio no cambia. Detalle y lecturas alternativas:
[cotización de 12 meses](COTIZACION-12-MESES-2026-10-11.md).
