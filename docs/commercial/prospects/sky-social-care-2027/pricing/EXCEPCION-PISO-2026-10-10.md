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
