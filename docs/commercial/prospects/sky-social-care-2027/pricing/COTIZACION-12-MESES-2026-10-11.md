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

## Versión vigente: `cotizacion-2027.*` y `../cotizacion/v4/` (11/10/2026, noche)

El cotizador ya permite declarar el asiento compartido como lo que es. `cotizacion-2027.demand.json` dice lo mismo que
la decisión del CEO, sin rodeos: cuenta mensual, un asiento, y en los cinco meses de campaña la persona dedicada y la
de refuerzo lo comparten (`seatSharing`); la persona de refuerzo conserva su tarea de responder. Da los mismos totales
que `cotizacion-12-meses-asiento-compartido.*`, mes a mes: costo CLP 38.972.628 en doce meses, margen 34,9 %. Esa
versión anterior expresaba el asiento compartido quitándole la tarea a la persona de refuerzo; queda como historia.

El documento vigente agrega los dos opcionales de la propuesta entregada, con su precio, en un bloque aparte que no
entra en el neto ni en el total. Cada uno sale de su propia cotización congelada:

| Opcional | Precio | Costo incremental al mes | Margen | Respaldo del margen |
| --- | --- | --- | --- | --- |
| Cobertura extendida (noches, fines de semana y feriados) | CLP 1.290.000 al mes | CLP 400.807 | 68,9 % | `cotizacion-2027.con-cobertura-extendida.*` |
| Conversaciones adicionales | CLP 290.000 por bloque de 200 | CLP 155.096 | 46,5 % | `cotizacion-2027.con-bloque-conversaciones.*` |

- Los precios son los de la propuesta entregada; los costos descansan en supuestos sin medir de esa propuesta.
- El margen se lee como incremento: cada `con-*.artifact.json` es la cotización principal con el opcional adentro, y
  `con-*.increment.json` (`compose increment`) da la diferencia de neto, costo y margen contra la principal. El costo
  incremental de la cobertura extendida coincide con el que la propuesta había estimado aparte.
- El precio que imprime el documento sale de las cotizaciones propias de cada opcional
  (`cotizacion-2027.opcion-*.artifact.json`). Su precio es correcto; su costo no sirve de referencia, porque vuelven a
  cargar el fee de plataforma por línea (mostraban 61,3 % y 29,6 %).
- La cobertura extendida no puede partir el primer día: depende de una consola propia. El documento no lo dice.
- La puesta en marcha sigue como texto («bonificadas») y sin valor de referencia: un servicio gestionado no tiene
  puesta en marcha en el catálogo, así que no hay cifra congelada que mostrar.

## Documento

`cotizacion-2027.document-brief.json` (texto, tomado de la propuesta entregada) →
`cotizacion-2027.document.json` (datos emitidos por el cotizador; no se editan a mano) →
`../cotizacion/v4/` (HTML, PDF de cinco páginas, manifiesto y capturas de revisión). Es la versión vigente.

`../cotizacion/v1/` y `../cotizacion/v2/` son emisiones anteriores, sin los opcionales con precio; `../cotizacion/v3/`
tiene los opcionales pero todavía decía que la fecha de inicio la define el cliente. Por indicación del CEO
(11/10/2026) el documento no menciona la fecha de inicio: se sobreentiende. El neto, el IVA y el total son los mismos
en las cuatro.

Es un borrador: sin número de cotización, firma ni verificación. El RUT del cliente figura «por confirmar». La forma y
el plazo de pago, el reajuste y la salida anticipada siguen abiertos.

Para reproducir: `pnpm --silent pricing:v3 replay --input <archivo>.artifact.json` y
`pnpm --silent pricing:v3 compose document --input cotizacion-2027.artifact.json --brief cotizacion-2027.document-brief.json --option extendida=cotizacion-2027.opcion-cobertura-extendida.artifact.json --option bloque=cotizacion-2027.opcion-bloque-conversaciones.artifact.json`.

## Variante con Redclick (14/10/2026)

Jaime Herrera respondió el 14/10 que SKY ya recibe los comentarios clasificados desde un partner (Redclick) y pidió
revisar el valor para un modelo de sólo respuesta. El CEO definió responder sin llevar la conversación a un precio
por comentario (el fee es por el servicio completo), cobrar la integración con Redclick en la puesta en marcha (deja
de ser bonificada) y bajar el fee a CLP 4.490.000 si el modelo es viable.

`cotizacion-2027-redclick.*`: la vigente con agentes sólo de redacción (dos paquetes de mil en lugar de diez) y fee
acordado CLP 4.490.000. El asiento de Sprout sigue adentro porque en el catálogo la tarea de responder exige una
bandeja; quitarlo pide un cambio de catálogo (una opción de respuesta desde las herramientas de cada red).

| Lectura | Costo mensual promedio | Margen |
| --- | --- | --- |
| Vigente, CLP 4.990.000 | CLP 3.247.719 | 34,9 % |
| Redclick con Sprout, CLP 4.490.000 (calculada) | CLP 3.167.720 | 29,4 % |
| Redclick sin Sprout, CLP 4.490.000 (calculada menos USD 499 al mes, unos CLP 499.000 al cambio de la corrida) | ≈ CLP 2.668.700 | ≈ 40,6 % |
| Piso de 45 % sin Sprout | — | precio ≈ CLP 4.850.000 |

- Los CLP 4.490.000 se sostienen sólo si se responde sin Sprout. Con Sprout, el margen baja a 29,4 %.
- Sin verificar: que Redclick tenga API y qué entrega (no aparece en la web), que responder desde las herramientas de
  cada red sea viable para 13 cuentas, el precio mensual de Sprout y el consumo de los agentes.
- La puesta en marcha con la integración no está cotizada: depende de revisar la API de Redclick.

### Decisión del mismo día: se mantiene Sprout, en plan Professional

El CEO descartó responder desde las herramientas de cada red: con este volumen no es operable. Con Redclick, la
bandeja sólo sirve para responder (los comentarios llegan clasificados por su API), así que no hace falta la API de
Sprout, que sólo trae el plan Advanced. `cotizacion-2027-redclick-professional.*`: un asiento de Sprout Professional
con facturación anual, alineada al contrato de 12 meses.

| Lectura (calculada) | Fee mensual | Costo mensual promedio | Margen |
| --- | --- | --- | --- |
| Redclick + Sprout Professional anual | CLP 4.490.000 | CLP 2.967.720 | 33,9 % |
| Redclick + Sprout Professional anual | CLP 4.690.000 | CLP 2.967.720 | 36,7 % |

- La fila «Redclick sin Sprout» de la tabla anterior queda descartada.
- Precio de Professional (USD 299 al mes con pago anual) tomado de la página de Sprout, sin confirmar con ellos; el
  precio con facturación mensual no aparece. Que Professional cubra las 13 cuentas y el uso compartido del asiento
  en campaña están sin validar.

### Sin líder de servicio (14/10/2026)

El CEO decidió quitar la línea de líder de servicio (20 %): ese rol lo asume él o la misma persona dedicada. Se
quitó también su asiento de Notion y Microsoft 365. Costo calculado, que no depende del fee:

| Variante | Archivos | Costo mensual promedio | Precio al 45 % |
| --- | --- | --- | --- |
| Modelo actual (Sprout Advanced mensual, agentes clasifican) | `cotizacion-2027-sin-lider.*` | CLP 2.810.980 | ≈ CLP 5.111.000 |
| Redclick (Sprout Professional anual, agentes sólo redactan) | `cotizacion-2027-redclick-sin-lider.*` | CLP 2.530.981 | ≈ CLP 4.602.000 |

| Fee mensual | Margen, modelo actual | Margen, Redclick |
| --- | --- | --- |
| CLP 4.990.000 | 43,7 % | — |
| CLP 4.490.000 | 37,4 % | 43,6 % |
| CLP 4.290.000 | 34,5 % | 41,0 % |

- El tiempo del CEO como líder no está costeado. Las ausencias de la persona dedicada se cubren con la reserva de
  reemplazo que ya trae su línea.

### Oferta ajustada a CLP 4.490.000 (14/10/2026)

Redclick quedó descartado como base del precio: su clasificación sirve para estadística y alertas, y responder desde
cada red no es operable con este volumen (decisión del CEO). La oferta ajustada es el modelo actual sin líder de
servicio: `cotizacion-2027-sin-lider.*` con fee acordado CLP 4.490.000 (neto 12 meses CLP 53.880.000, IVA
CLP 10.237.200, total CLP 64.117.200), costo CLP 2.810.980 al mes, margen 37,4 %. Documento:
`cotizacion-2027-sin-lider.document-brief.json` (Equipo: «supervisión directa de Efeonce») →
`cotizacion-2027-sin-lider.document.json` → `../cotizacion/v5/`, copiado a OneDrive como
«Efeonce - Oferta Económica Social Care SKY 2027 (14-10-2026).pdf». Las variantes `redclick*` quedan como historia.
