# V3 — Componentes de costo, provisiones y evidencia

Fecha: 2026-10-09. Propuesta interna ligada a TASK-2017; no valores aprobados ni asientos contables. El flujo local de TASK-2022 ejecuta asignaciones/presupuestos declarados, no estas fórmulas de drivers. La propuesta genérica 40%/35% no reemplaza el piso creativo 45% aprobado.
[Pricing Integrity Pack](../../business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md) posee las recomendaciones de política.
[Inputs de revisión](../../../data/pricing/v3-pilot/economics/commercial-policy-proposal/driver-inputs.json) registran drivers, unknowns y destinos en el catálogo candidato. No se pasan directamente a la CLI.

Actualización 2026-10-11: dos definiciones posteriores cambian cómo se lee el costo en el cotizador y están al final de este documento. [La base de costo de las personas es un costo objetivo](#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11), no la nómina de hoy, y el resumen de una cotización ordena [qué dato estimado conviene confirmar primero](#qué-dato-estimado-conviene-confirmar-primero-2026-10-11). El resto del documento conserva la propuesta del 2026-10-09.

Actualización 2026-10-11 (tarde): dos secciones más, también al final. La [puesta en marcha](#puesta-en-marcha-onboarding-por-persona-y-reclutamiento-opcional-2026-10-11) dejó de ser un importe de prueba y pasó a dos provisiones con costo propio, y [Adobe se cargó tal como se factura](#adobe-tal-como-se-factura-y-el-plazo-del-contrato-2026-10-11), en pesos, con su descuento temporal y el plazo de su contrato. Los importes de Adobe en USD que aparecen más abajo son el registro del 2026-10-09 y ya no son los vigentes.

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

> Nota 2026-10-11: los dos párrafos anteriores son el registro del 2026-10-09. Desde la policy v7 Adobe no es un paquete de 180 USD sino dos productos facturados en pesos, y el escenario de 306 USD se reemplazó por el precio de lista de la factura. Ver [Adobe tal como se factura](#adobe-tal-como-se-factura-y-el-plazo-del-contrato-2026-10-11).

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

Nota 2026-10-11 (tarde): la demanda versionada de ese ejemplo necesita ahora declarar o excluir Adobe Express en sus dos líneas de community manager (desde la policy v7 los perfiles de contenido lo piden). Vuelto a medir con las versiones vigentes y esa tarea excluida con su motivo, el neto, el margen y las cifras de la tabla son los mismos.

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

## Puesta en marcha: onboarding por persona y reclutamiento opcional (2026-10-11)

La puesta en marcha es lo que cuesta, una sola vez, que una persona empiece a trabajar en una cuenta. Hasta el catálogo v8 el cotizador usaba para eso un importe de prueba (100 USD, marcado «sólo prueba, sin medir»). Desde el catálogo v9 hay dos provisiones con costo propio. Las dos las propuso el agente y las aceptó el CEO el 2026-10-11; las dos siguen marcadas como **estimadas** y se van a medir en las dos próximas incorporaciones reales.

| Provisión | Importe | Cuándo se cobra | Cómo entra a la cotización |
| --- | --- | --- | --- |
| Onboarding a la cuenta (`provision-account-onboarding`) | 200 USD, una vez por persona | Siempre que una persona se suma a una cuenta: accesos, brief e inmersión en la marca | Por defecto. Es el requisito `setup` de los siete kits de staffing |
| Reclutamiento (`provision-recruiting`) | 500 USD, una vez por persona | Sólo cuando hay que contratar a una persona nueva para ese cliente | Opcional. La línea la elige con `choices: [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]`; nunca se aplica sola |

Cómo se comportan:

- Las dos llevan el margen de la oferta, igual que cualquier otro costo, y caen en la fila única de puesta en marcha de la línea. Si el trabajo declara una [forma](cotizador-v3-superficie-implementada.md#forma-del-trabajo-on-going-y-on-demand-2026-10-11), esa fila también lleva su razón de precio.
- El onboarding es **por persona**, no por cuenta. Consecuencia: una persona que se suma más tarde paga su propio onboarding. Antes la puesta en marcha se cobraba una vez por cuenta.
- El importe de prueba (`trial-setup`) dejó de seleccionarse desde el 2026-10-11. Una cotización con fecha anterior lo sigue resolviendo, y los artefactos ya congelados no cambian.
- El servicio gestionado (`managed-service-core`) no tiene requisito de puesta en marcha, ni antes ni ahora.

**Por qué no se trajo la regla del Excel.** El Excel de pricing cobraba un «recruiting & onboarding fee» igual a un mes del costo de la persona. En un refuerzo de un mes esa regla duplica el precio. Lo que la regla buscaba —no quedar descubierto si el cliente se va apenas se contrató a alguien para él— es una protección que pertenece a los términos del contrato (plazo mínimo cuando se recluta, cláusula de conversión). Eso es materia legal, no del cotizador. El cotizador cobra lo que la puesta en marcha cuesta.

Medido el 2026-10-11 en el ejemplo del diseñador senior por un mes en Chile, On-Demand y CLP (simulación de prueba), con las versiones del artefacto congelado: Adobe con el descuento con que se factura. Con la policy v10, que cotiza Creative Cloud Pro sin descuento, las dos primeras columnas no cambian y el neto del mes es 2.870.000 y 3.650.000:

| | Costo de puesta en marcha | Precio de la fila de puesta en marcha | Neto del mes |
| --- | --- | --- | --- |
| Sólo onboarding (el caso por defecto) | 200.000 | 320.000 | 2.790.000 |
| Onboarding y reclutamiento | 700.000 | 1.100.000 | 3.570.000 |

Ninguno de los dos importes es una medición. No los presentes como costo validado ni como tarifa aprobada.

## Adobe tal como se factura y el plazo del contrato (2026-10-11)

Desde la policy v7 el costo de Adobe sale de su factura (la del 2026-09-16, que mostró el CEO), no de una declaración. Quién usa cada producto está en [selección de herramientas](cotizador-v3-seleccion-herramientas.md#adobe-dos-productos-y-quién-usa-cada-uno-2026-10-11). Aquí está lo que cambia en el costo.

| Producto | Licencias | Importe mensual | Una licencia |
| --- | --- | --- | --- |
| Adobe Creative Cloud Pro, como se factura hoy (50 % de descuento) | 3 | CLP 162.605 | CLP 54.202 (un tercio) |
| Adobe Creative Cloud Pro, sin descuento: el precio con que se cotiza | 3 | CLP 325.405,5 | CLP 108.468,5 (un tercio) |
| Adobe Express | 3 | CLP 16.240 | CLP 5.413 (un tercio) |

**En pesos y con IVA.** Los importes son los totales de la factura, con IVA incluido, por decisión del CEO: el impuesto se recupera, pero no mes a mes, así que el costo mensual que el cotizador reconoce es el total pagado. La moneda es CLP, la de la factura. Para que un costo en pesos entre al cálculo y vuelva a una cotización en pesos por el mismo importe, el catálogo v9 tiene la tasa CLP→USD (0,001, la inversa del tipo de cambio de cotización de 1.000). La demanda que usa Adobe la nombra en `fxRecordIds` como `fx:CLP:USD`, igual que una herramienta en EUR nombra `fx:EUR:USD`; si falta, la cotización queda `needs_input`.

**Una licencia es un tercio, no el paquete.** Una persona que usa una de las tres licencias carga un tercio del importe. Una simulación anterior le atribuyó el paquete entero a una sola persona; los ejemplos escritos con esa cifra sobrestiman las herramientas.

**El descuento termina, y se cotiza sin él.** Creative Cloud Pro se factura hoy con un descuento de 50 % que, según el CEO, termina pronto: unos dos meses al cargarse la factura, unos 36 días al decidir esto. Si termina exactamente en la renovación del contrato no está confirmado. El CEO decidió el 2026-10-11 que se calcule sin descuento desde ya, porque un fee cotizado hoy tiene que sostenerse después. Desde la policy v10 la policy guarda estos dos precios:

- `current`: CLP 325.405,5 al mes, el precio de lista de la factura (CLP 91.150 por licencia más IVA). Es **estimado** hasta que exista una factura a precio completo. Es el que usa por defecto toda cotización nueva.
- `invoiced-with-discount`: CLP 162.605 al mes, lo que Adobe factura mientras dure el descuento, confirmado por la factura. Sólo entra si la demanda lo elige de forma explícita.

Los dos llevan fecha de revisión el 2026-11-16, la de la renovación. Hasta la policy v9 era al revés: `current` era el importe facturado y el precio de lista se llamaba `renewal-scenario`, que ya no existe.

Qué significa para una cotización: no hay que hacer nada para cubrir el fin del descuento, porque el precio por defecto ya es el que viene después. La excepción es un trabajo que termina antes que el descuento: ahí se puede elegir `invoiced-with-discount`, y esa elección es del operador, no del agente. Medido el 2026-10-11 en el mismo ejemplo del diseñador: con `current` el costo del mes es 1.822.704 y el neto 2.870.000; eligiendo `invoiced-with-discount`, 1.768.438 y 2.790.000, que son las cifras del artefacto congelado.

**Cómo se factura y por cuánto obliga son dos hechos distintos.** Adobe es un plan anual que se paga mes a mes: una licencia que se compra sigue disponible y se sigue cobrando hasta que el contrato se renueva, y la cuenta no baja si se deja de usar. La policy guarda las dos cosas por separado: la unidad del precio (`unit: month`) y el plazo (`commitmentTermMonths: 12`), que dice cuántos meses hay que seguir pagando una licencia una vez tomada. El plazo habla de la licencia, no del papel del contrato. No entra a ningún cálculo ni cambia un precio; sirve para la [lectura de compromisos](cotizador-v3-superficie-implementada.md#tres-lecturas-de-una-cotización-congelada-2026-10-11), que muestra cuánto queda comprometido cuando el trabajo termina antes. Desde la policy v9 la policy guarda también la fecha en que se renueva el contrato (`commitmentRenewsOn`): el de Adobe se renueva el 2026-11-16, según la consola del proveedor que mostró el CEO (plan anual pagado mes a mes; en la renovación se puede cambiar el número de licencias o cancelar el plan). Con esa fecha la lectura cuenta lo que queda del plazo que ya corre, no un plazo entero: en el ejemplo del diseñador, vuelto a cotizar con la policy v10, queda un mes de una licencia, CLP 108.468, atada hasta el 2026-11-16. Límite conocido: un precio con plazo y sin fecha se sigue leyendo como un plazo entero desde el primer mes cotizado, que es un techo; y con fecha, un mes cubierto sólo en parte cuenta entero.

Desde la policy v8 otros proveedores declaran su plazo, según lo dicho por el CEO el 2026-10-11. Microsoft 365 es el caso opuesto a Adobe: el contrato es anual y se paga mes a mes, pero asignar o quitar una licencia sube o baja el monto mensual, así que su plazo es un mes y no queda nada comprometido cuando termina un trabajo corto. Desde la policy v9 su precio `current` es el de la factura que mostró el CEO (G185142527, del 2026-09-16): Business Standard, USD 14,70 por licencia al mes, seis licencias, sin impuesto, confirmado. Los precios públicos de referencia (por ejemplo `public-standard-teams-monthly`, USD 16,80) siguen en la policy, y las demandas de ejemplo todavía los eligen; una cotización nueva debería elegir `current`. Notion se paga mes a mes, sin más compromiso: también un mes. Sus importes (nueve miembros Business a USD 24 y 3000 créditos a USD 30, sin impuesto) citan desde la v9 la factura 0D8C80A9-0039 del 2026-09-21. Un plazo de un mes es una declaración, distinta de no declarar nada. HubSpot es anual, pero su precio vigente está pendiente de evidencia y todavía no lleva plazo.

Lo que esto no resuelve: la lectura de caja no puede restar una licencia comprada para el trabajo, porque la demanda no declara si la licencia ya existía o se compra; y la mayoría de los demás precios de herramientas sigue siendo precio de lista estimado.
