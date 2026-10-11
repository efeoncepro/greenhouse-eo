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

## Decisión del CEO (11/10/2026): cuenta mensual y un solo asiento compartido

Sprout con facturación mensual y **un solo asiento**: la persona de refuerzo no lleva asiento propio y comparte el de
la persona dedicada en las semanas de campaña. Es la lectura que respalda el documento vigente.

| Lectura | Archivos | Costo mensual promedio | Margen |
| --- | --- | --- | --- |
| **Vigente: cuenta mensual, un asiento compartido** | `cotizacion-12-meses-asiento-compartido.*` | CLP 3.247.719 | 34,9 % |
| Referencia: un asiento compartido con facturación anual | no se guardó | CLP 3.147.719 | 36,9 % |
| Sin refuerzo (lo que respaldaba la excepción del 10/10) | no se guardó | CLP 2.978.244 | 40,3 % |

Lecturas anteriores a la decisión, con un asiento propio para la persona de refuerzo (quedan como historia):

| Lectura | Archivos | Costo mensual promedio | Margen |
| --- | --- | --- | --- |
| Dos asientos anuales todo el año; refuerzo repartido en los 12 meses | `cotizacion-12-meses.*` | CLP 3.574.174 | 28,4 % |
| Cuenta mensual; segundo asiento en cinco meses de campaña | `cotizacion-12-meses-cuenta-mensual.*` | CLP 3.455.636 | 30,7 % |

- El precio al cliente es el mismo en todas; cambia sólo el costo.
- Precio de Sprout Advanced: la página oficial (leída el 11/10/2026) muestra USD 399 por asiento al mes con facturación
  anual y no muestra precio con facturación mensual. Los USD 499 de la cuenta mensual vienen de guías de terceros y
  siguen sin confirmar. Con un solo asiento, la cuenta mensual cuesta USD 100 más al mes que la anual (dos puntos de
  margen); a cambio no obliga por un año.
- Asiento compartido: los asientos de Sprout son nominativos. Que dos personas usen el mismo usuario en una semana de
  campaña no está validado con Sprout.
- En qué meses caen las campañas lo define SKY; se ubicaron en los meses 3, 5, 8, 10 y 11 como supuesto. No cambia el
  total del año.
- Todas quedan bajo el piso de 45 %. La excepción registrada el 10/10/2026 se aprobó con 40,26 %, antes de incluir el
  refuerzo en el fee. El CEO conoció el 11/10/2026 el margen con el refuerzo adentro y definió la cuenta mensual con
  asiento compartido.
- Siguen siendo estimaciones: costos de las personas, provisiones de reemplazo y alerta, consumo de agentes, plan de
  Sprout sin contratar y las horas por conversación.

## Documento

`cotizacion-12-meses.document-brief.json` (texto, tomado de la propuesta entregada) →
`cotizacion-12-meses-asiento-compartido.document.json` (datos emitidos por el cotizador; no se editan a mano) →
`../cotizacion/v2/` (HTML, PDF de cuatro páginas, manifiesto y capturas de revisión). Es la versión vigente.

`../cotizacion/v1/` es la primera emisión, respaldada por la lectura de dos asientos anuales. Lo que ve el cliente es
idéntico en las dos versiones; cambia sólo la cotización que la respalda.

Es un borrador: sin número de cotización, firma ni verificación. El RUT del cliente figura «por confirmar». Los
opcionales de la propuesta (cobertura extendida y bloques adicionales de conversaciones) se mencionan sin precio y se
cotizan aparte. La forma y el plazo de pago, el reajuste y la salida anticipada siguen abiertos.

Para reproducir: `pnpm --silent pricing:v3 replay --input <archivo>.artifact.json` y
`pnpm --silent pricing:v3 compose document --input cotizacion-12-meses-asiento-compartido.artifact.json --brief cotizacion-12-meses.document-brief.json`.
