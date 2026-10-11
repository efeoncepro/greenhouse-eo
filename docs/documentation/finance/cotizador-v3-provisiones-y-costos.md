# V3 — Componentes de costo, provisiones y evidencia

Fecha: 2026-10-09. Propuesta interna ligada a TASK-2017; no valores aprobados ni asientos contables. El flujo local de TASK-2022 ejecuta asignaciones/presupuestos declarados, no estas fórmulas de drivers. La propuesta genérica 40%/35% no reemplaza el piso creativo 45% aprobado.
[Pricing Integrity Pack](../../business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md) posee las recomendaciones de política.
[Inputs de revisión](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/driver-inputs.json) registran drivers, unknowns y destinos en el catálogo candidato. No se pasan directamente a la CLI.

Actualización 2026-10-11: dos definiciones posteriores cambian cómo se lee el costo en el cotizador y están al final de este documento. [La base de costo de las personas es un costo objetivo](#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11), no la nómina de hoy, y el resumen de una cotización ordena [qué dato estimado conviene confirmar primero](#qué-dato-estimado-conviene-confirmar-primero-2026-10-11). El resto del documento conserva la propuesta del 2026-10-09.

## Perímetro y fórmula de cada componente

| Componente           | Base de cálculo propuesta                                                              | Tratamiento y prevención de doble costo                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Remuneración         | Honorario/salario autorizado + bonos contractuales + cargas aplicables                 | País, modalidad y coberturas de People/Finance; no sumar cargas ya incluidas                                                 |
| Capacidad no vendida | Loaded cost comprometido menos costo financiado por capacidad vendida                  | Si se compromete persona completa y sólo se vende 50%, no asumir el resto vendido; no sumar bench además de full-FTE         |
| Formación            | Tiempo protegido de especialista, tiempo de mentor y cursos                            | Si especialista está remunerado, restar horas de capacidad útil; sumar sólo curso/mentor incremental o asignación no contada |
| Evaluación/QA        | Horas del verificador/lead × rate cargado                                              | Assessment inicial a setup; QA periódico a Assurance. Lead recurrente que ya incluye QA no se duplica                        |
| Respaldo             | Horas reservadas/retainer de backup + accesos específicos                              | Identificar rol equivalente y disponibilidad real; no costear sólo un nombre en lista                                        |
| Reemplazo            | Frecuencia de eventos × costo de selección, transición y overlap / meses del horizonte | Sin frecuencia observada no declarar una reserva esperada; simular un evento y decidir quién financia exposición             |
| Gestión              | Horas de Account/Delivery/Operations × rate cargado                                    | Presupuesto de coordinación/reporte/cobranza según modelo; no repetir horas del lead de QA                                   |
| Onboarding           | Trabajo inicial incremental de contexto, acceso, assessment y handoff                  | Costear por actor; cobrar una sola vez o incluir expresamente, sin amortizar dos veces                                       |
| Licencias            | Precio/contrato × seats/unidades y cuota de asignación demostrada                      | No dividir una licencia personal entre usuarios ni por FTE automáticamente; annual, pago y compromiso separados              |
| Infraestructura      | Uso de equipo, soporte, conectividad/seguridad y política de amortización Finance      | Costo periódico y compra inicial de caja son distintos; no duplicar depreciación con compra como costo operativo             |
| Financiación         | Capital realmente financiado × tasa y plazo efectivo, más comisiones aplicables        | DSO no es gasto en sí; separar caja y costo financiero, no sumar una reserva porcentual opaca                                |
| FX                   | Conversión con snapshot de pares/fecha/fuente; estrés de exposición específica         | No aplicar shock FX a costos ya fijados en USD ni usar factor país como cambio de moneda                                     |
| Exposición anual     | Compromiso pendiente no reasignable o cancelación contractual                          | No sumar todo el anual además de los meses ya devengados; probar reasignación y caja                                         |
| Impuestos            | Tratamiento fiscal de cada entidad/operación                                           | IVA recuperable/no recuperable, retenciones y renta no son un factor genérico; aprobación Finance correspondiente            |

La provisión contable exige criterio propio; una reserva presupuestaria de contingencia no se convierte en un pasivo por llamarla «provisión». El resumen oficial de [IAS37](https://www.ifrs.org/issued-standards/list-of-standards/ias-37-provisions-contingent-liabilities-and-contingent-assets/) distingue obligaciones presentes de pérdidas operativas futuras. Este documento propone gestión/costeo, no su reconocimiento contable.

## Actividades iniciales propuestas, sin inventar rates

Para diseñador senior 50%, probar mensualmente: 2 h de aprendizaje del especialista, 1 h de mentor y 2 h de verificación/QA; 2 h de coordinación de cuenta. Inicialmente: 4 h de inmersión del especialista, 2 h de assessment/lead y 2 h de accesos/coordinación. Son presupuestos de actividad para discutir, no estándares medidos ni garantías.

No convertir las 2 h+4 h del especialista en un cargo adicional si ya están pagadas: reconocerlas dentro de su dedicación y explicar la capacidad neta. Si el cliente exige 50% de capacidad de ejecución **más** formación/onboarding, costear el compromiso adicional; no vender como neto el tiempo bruto.
180 h/FTE es referencia del prototipo, no jornada legal colombiana. People/Operations debe definir horas útiles por mes, ausencias y simultaneidad del backup. No publicar 90 h netas sin descontar todas las actividades del caso.

Para reemplazo, preparar downside con un evento realista cuyo costo desglosa selección, trabajo de transición y coexistencia. Frecuencia, horas y rates siguen null. Para bench, contrastar costo 50% compartido frente a persona completa; no sumar luego otro 50% de reserva.

## Conectar las evidencias al catálogo y a la CLI

1. Revisión contiene fórmula/driver, responsable, cobertura y evidencia requerida; importes actuales ausentes siguen null.
2. Finance convierte cada driver medido en un monto de recurso con moneda/unidad/fuente y vigencia, o registra exclusión/zeroReason fundamentado.
3. Change-set agrega/reemplaza esos registros y el kit. No pegar costos o reservas del expediente en el brief.
4. Preview muestra impacto; apply produce nueva versión. El agente selecciona `--catalog`, resuelve el brief y ejecuta quote/explain/replay. Desde el 2026-10-11, cuando esa versión pasa a ser la vigente se mueve el [puntero de versiones vigentes](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11) y se cotiza con `--current`, sin nombrar el archivo.
5. Revisar costo completo, margen tras ajustes, caja, recruitability y alcance antes de aprobación comercial.

El [catálogo candidato](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/catalog.proposed.json) mantiene pendientes separados para formación/verificación, backup/reemplazo, gestión, infraestructura, setup, financiación y anualidades. No reutiliza trial-assurance 25/operations 25 para aparentar cobertura comercial.
El [brief comercial](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/commercial-readiness.brief.json) exige esos registros y conserva bloqueo. No publica catálogo ni habilita fuente confirmed por cambiar etiquetas.

## Qué representa hoy el motor

Recursos ya normalizados month/year/once, dedicación y asignación, países separados, markup/margen, descuentos, snapshots y desglose. No hidrata fórmulas de drivers, probabilidad de reemplazo, activos/depreciación, interés por DSO o mínimos de procurement desde este documento.
El kernel staffing tampoco certifica delivery de un pod. Estas brechas se resuelven con evidencia/recursos explícitos o una futura extensión formal; no esconderlas en un monto global.
Compromiso anual con pago mensual necesita términos de contrato separados: unit=month no demuestra cancelación mensual. Si no se puede representar correctamente caja/costo, no promocionar el caso.

## Licencias y plataforma declaradas por el operador

[Presupuesto IA y recargas](cotizador-v3-creditos-ia.md): primitive/CLI incorpora paquetes enteros observados, remanente/caducidad y costo de compra separado de cuota existente. El [compositor](../../manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) integra presupuestos y asignaciones declaradas al quote local; el reparto real de plataforma sigue pendiente.

[Registro 2026-10-09](../../../data/pricing/v3-pilot/economics/resource-inputs/README.md): Higgsfield 139 USD/mes con 3000 créditos, Magnific 40 EUR/mes con 45000 créditos, Adobe 180 USD/mes y 3 CC Teams+3 Express, Vercel 60–100 USD/mes, GCP/BBDD264 USD/mes. Son declaraciones del operador; no facturas verificadas, import automático, accesos asignados ni tarifa aprobada. Magnific mantiene EUR y requiere FX explícito al convertir.

Adobe: el operador confirmó 180 USD/mes para todo el paquete 3 CC Teams+3 Express.306 USD/mes es escenario condicional del alza 70%; fecha y términos de renovación siguen pendientes. No dividir entre seis seats de planes distintos, duplicar Express ni anticipar renovación sin fecha. La policy sucesora aplica capacidad 3 CC por paquete y protección de bundle; la baseline histórica conserva su información original.

Tratamiento propuesto para revisar con Finance/Operations:

- Seat nominativo: costo según plan/persona y reparto entre servicios donde trabaja, con evidencia; no dividir por FTE sin regla ni compartir usuarios por supuesto.
- Higgsfield/Magnific: cuota fija y presupuesto de consumo por servicio. `139/3000` y `40/45000` son referencias de costo medio del paquete si se utiliza completo, no tarifa marginal ni equivalencia entre proveedores. Asignaciones más remanente/interno deben reconciliar la cuota. Un consumo no cubierto puede exigir packs observados del planner, con precio/condiciones por revisar antes de compra; no sumar cuota completa y el mismo costo de créditos otra vez.
- Vercel/GCP: pool compartido 324–364 USD/mes. Separar consumo atribuible a servicios y operación interna; revisar si cada proveedor necesita driver propio. Cada servicio absorbe `pool mensual × proporción de delivery × proporción del servicio`, con denominadores medidos y policy aprobada. No asignar todo el pool a cada cliente/persona ni ocultar capacidad interna/no vendida redistribuyéndola.
- Vercel 100 es escenario conservador de presupuesto, no costo fijo confirmado. Reparto igual entre cuentas elegibles sólo sirve como simulación mientras falten elegibilidad, número de cuentas y policy. No duplica un addon de operaciones ni overhead que ya cubra esta infraestructura.

En servicio gestionado, equipo/esfuerzo/licencias/IA/plataforma son inputs internos de costo; la unidad comercial conserva alcance, cadencia y límites acordados. El rol/capacidad ofertado especifica su dedicación y cobertura. El kernel staffing actual no adquiere soporte de composición comercial de servicios por registrar estos antecedentes.

[Flujo operativo implementado](cotizador-v3-superficie-implementada.md): portfolio por capacidad declarada aprobado como método, parte interna/sin asignar reconciliada, fuenteFX EUR referencial explícita, créditoIA agregado y evaluación de evidencias. Notion conserva factura 24 USD/seat y 30 USD de créditos por periodo; otras variantes públicas no acreditan gasto real. Datos operativos pendientes: asignaciones por persona/cuenta, permisos/planes actuales, fechas de renovación, compromiso/plazo, consumo y capacidad real. Las formulas de actividad de este documento siguen siendo propuesta; no se ejecutan ni se convierten en provisión contable por correr la CLI. Baseline/quotes previas quedan intactas y no se modifica runtime cloud.

## La base de costo de las personas es un costo objetivo (2026-10-11)

Decisión del operador (CEO) del 2026-10-11. Registro: `LOCALIZED_TALENT_COSTS` en el [ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json).

**Qué es el costo de una persona en el cotizador.** Es el importe del Excel de pricing (`efeonce-pricing-model-v1.xlsx`), que construyó el propio CEO. Representa el nivel salarial al que quiere llevar al equipo. El catálogo lo declara como el costo de cada perfil en Chile; el país de la persona lo ajusta con un factor de talento por país.

**Qué no es.** No es la nómina de hoy. El CEO decidió expresamente que el cotizador **no** use el costo real de nómina, que actualmente es más bajo que el del catálogo.

**Qué consecuencia tiene.** El margen real actual sobre las personas es mayor que el que muestra una cotización. El cotizador cotiza como si el equipo ya ganara el nivel objetivo; mientras la nómina real esté por debajo, la diferencia queda como margen adicional que el cotizador no muestra.

Cómo leerlo y qué evitar:

- El margen de una cotización es el margen **contra el costo objetivo**. No es el margen contable del mes ni el realizado. Los demás documentos del cotizador llaman «margen real» al margen del neto final contra el costo del catálogo; ese término no se refiere a la nómina.
- Los pisos de margen (45 % en los servicios gestionados de las prácticas creativa y SEO/AEO, 25 % en una persona vendida por dedicación) se leen sobre ese mismo costo objetivo. Esta decisión no cambió ningún piso.
- No describas el costo del catálogo como «lo que Efeonce paga hoy».
- No propongas «conectar la nómina real» como mejora del cotizador. No es un pendiente: es una decisión tomada.
- No escribas la cifra salarial de ninguna persona en documentos, briefs ni salidas para clientes.
- Que la fuente de esos costos esté marcada `confirmed` significa que su autor confirma el valor objetivo. No significa que ese importe se pague hoy.

Qué sí queda abierto: un registro de costo específico (`specific`) sólo donde el costo objetivo de un perfil en un país se aparte del costo de Chile por el factor de talento de ese país. Los factores de talento de Colombia, Perú, México, España y Estados Unidos siguen siendo estimaciones por elección del operador, que pidió que se propusieran y quedaran marcadas así (`COUNTRY_FACTORS_UNVALIDATED`); validarlos espera referencias reales, no es una decisión que él deba, y es distinto de cambiar la base de costo.

Esta definición aplica al costo humano. Las demás filas de la tabla de componentes —formación, QA, respaldo, reemplazo, gestión, licencias, infraestructura— siguen como propuesta por medir.

## Qué dato estimado conviene confirmar primero (2026-10-11)

Una cotización casi siempre mezcla datos confirmados y datos estimados. Hasta ahora el resumen avisaba que había estimados (`ESTIMATED_SOURCE`), pero todos los avisos se leían igual. Desde el 2026-10-11 el resumen de `compose prepare|quote` trae `estimateExposure`, que los **ordena por el costo que descansa en cada uno**. Fuente ejecutable: [`resources/summary.ts`](../../../src/lib/finance/pricing-v3/resources/summary.ts).

Lo que responde, en lenguaje simple:

| Pregunta | Dónde mirar |
| --- | --- |
| ¿Qué parte del costo depende de algún dato estimado? | `estimatedShareOfCost` (y los importes `estimatedCost` y `confirmedCost`) |
| ¿Cuál es el dato estimado que más pesa? | El primero de `costInputs[]`; la lista va de mayor a menor |
| ¿Cuánto costo descansa en ese dato? | `costAtRisk` y `shareOfCost` |
| ¿Cuánto margen está en juego? | `marginRateLostIfTenPctHigher`: puntos de margen que se perderían si ese dato fuera 10 % más alto y el precio no cambiara |

La cuenta del margen en juego es `0,10 × costAtRisk ÷ neto`. Un valor de `0.037825` se lee como 3,8 puntos de margen.

Ejemplo medido el 2026-10-11 con las versiones vigentes: servicio gestionado sintético para un cliente de Colombia con equipo en Colombia, COP 28.100.000 al mes y margen de 41,5 % sobre el costo del catálogo. Es una simulación de prueba, no una cotización emitida.

| Dato estimado | Parte del costo | Margen en juego si fuera 10 % más alto |
| --- | --- | --- |
| Todos los datos estimados juntos | 98,7 % | — |
| Factor de talento de Colombia sobre la referencia Chile | 64,7 % | 3,8 puntos |
| Bandeja de atención de Sprout Social (precio de lista) | 17,7 % | 1,0 punto |
| Reserva de cobertura por ausencias (hipótesis sin medir) | 4,4 % | 0,3 puntos |

Lectura: en esa cotización lo primero que conviene validar es el factor de talento de Colombia, no el precio de una licencia. La misma demanda con equipo y cliente en Chile da otra lectura: sólo el 29,3 % del costo descansa en estimados y el primero de la lista es la bandeja de Sprout (15,3 % del costo, 0,8 puntos), porque el factor de talento de Chile es 1 por definición y el costo de las personas es el objetivo ya confirmado por su autor.

Reglas para leerlo bien:

- Es una lectura de **sensibilidad**, no un pronóstico. No dice que el dato vaya a subir 10 % ni que esté mal.
- No valida nada. Un dato sigue estimado hasta que alguien lo confirma con evidencia y se emite una versión nueva.
- No recalcula la cotización: se deriva del resultado ya congelado, y `replay` lo muestra igual.
- «Confirmado» en esta lectura significa que la fuente del dato está confirmada. Para el costo de una persona eso es el costo objetivo de la sección anterior, no un costo medido contra la nómina.
- Un componente que depende de dos datos estimados cuenta una sola vez en el total estimado. Por eso la suma de la lista puede ser mayor que `estimatedCost`.
- Un factor de mercado estimado aparece aparte, en `priceInputs[]`: mueve el precio, no el costo.
- Las políticas estimadas que son reglas y no importes (capacidad facturada, política de precio, redondeo, impuesto) aparecen en `estimatedRules[]` y quedan fuera del ranking.

`compose assess` muestra los cinco primeros en `costEvidencePriority.confirmFirst`, junto a las brechas de evidencia. Pendiente conocido: `assess` todavía no lista como brecha propia que un factor de país sea estimado; hoy se ve en este ranking y en `reviewSignals`.

Claves completas: [contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).
