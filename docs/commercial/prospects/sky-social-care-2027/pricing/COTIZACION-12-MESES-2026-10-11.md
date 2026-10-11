# SKY · social care 2027 — cotización de 12 meses y documento (11/10/2026)

Cotización congelada con las versiones vigentes del cotizador V3 (`--current`: catálogo v10, policy v11, créditos v1) y
documento para el cliente producido con `compose document`. Reproduce el precio acordado; no calcula uno nuevo.
Uso interno: los costos y márgenes de esta nota no van al cliente.

## Qué se cotizó

Alcance confirmado por la sesión que preparó la propuesta entregada (deck del 10/10/2026): servicio gestionado,
On-Going, 12 meses, cliente en Chile, CLP, IVA 19 %. Titular 100 %, líder 20 %, especialista de agentes 10 % y refuerzo
de campaña dentro del fee (una persona más durante una semana, hasta cinco semanas al año). Precio acordado como
`agreed_net`: CLP 4.990.000 al mes. Puesta en marcha bonificada, sin costear.

| | |
| --- | --- |
| Neto, 12 meses | CLP 59.880.000 |
| IVA 19 % | CLP 11.377.200 |
| Total | CLP 71.257.200 |

## Costo y margen, según cómo se compre el asiento de la persona de refuerzo

El precio es el mismo en las dos. Cambia el costo, porque la persona de refuerzo necesita su propio asiento
nominativo de la bandeja y el cotizador no puede expresar «un asiento anual más uno mensual sólo en campaña»
(pendiente `NAMED_SEATS_UNDER_TWO_PLANS` del registro del cotizador).

| Lectura | Archivos | Costo mensual promedio | Margen |
| --- | --- | --- | --- |
| Sin refuerzo (referencia; lo que respaldaba la excepción del 10/10) | no se guardó | CLP 2.978.244 | 40,3 % |
| Dos asientos anuales todo el año; refuerzo repartido en los 12 meses | `cotizacion-12-meses.*` | CLP 3.574.174 | 28,4 % |
| Cuenta con facturación mensual; segundo asiento en cinco meses de campaña | `cotizacion-12-meses-cuenta-mensual.*` | CLP 3.455.636 | 30,7 % |

- La primera usa sólo el precio público anual (USD 399 por asiento) y es la más conservadora: respalda el documento.
- La segunda usa el precio mensual (USD 499), tomado de guías de terceros y sin confirmar en la página oficial.
- En qué meses caen las campañas lo define SKY; en la segunda lectura se ubicaron en los meses 3, 5, 8, 10 y 11 como
  supuesto. No cambia el total del año.
- Las dos quedan bajo el piso de 45 %. La excepción registrada el 10/10/2026 se aprobó con 40,26 %, antes de incluir
  el refuerzo en el fee: el margen con el refuerzo adentro es menor que el de esa nota.
- Siguen siendo estimaciones: costos de las personas, provisiones de reemplazo y alerta, consumo de agentes, plan de
  Sprout sin contratar y las horas por conversación.

## Documento

`cotizacion-12-meses.document-brief.json` (texto, tomado de la propuesta entregada) →
`cotizacion-12-meses.document.json` (datos emitidos por el cotizador; no se editan a mano) →
`../cotizacion/v1/` (HTML, PDF de cuatro páginas, manifiesto y capturas de revisión).

Es un borrador: sin número de cotización, firma ni verificación. El RUT del cliente figura «por confirmar». Los
opcionales de la propuesta (cobertura extendida y bloques adicionales de conversaciones) se mencionan sin precio y se
cotizan aparte. La forma y el plazo de pago, el reajuste y la salida anticipada siguen abiertos.

Para reproducir: `pnpm --silent pricing:v3 replay --input <archivo>.artifact.json` y
`pnpm --silent pricing:v3 compose document --input cotizacion-12-meses.artifact.json --brief cotizacion-12-meses.document-brief.json`.
