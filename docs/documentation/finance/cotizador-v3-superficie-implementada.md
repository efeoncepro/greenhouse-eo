# Cotizador V3: superficie local implementada

Estado verificado el 2026-10-09, TASK-2016/2019/2020/2021/2022. Este documento describe el comportamiento
ejecutable; el [contrato objetivo](cotizador-v3-contrato-y-validacion.md) conserva la dirección de evolución.
El [manual operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) es la entrada para Codex y
Claude. El [cotizador canónico](cotizador.md) conserva su API, permisos, lifecycle y consumidores actuales.
Los párrafos fechados 2026-10-10 describen el endurecimiento posterior de la CLI (errores tipados, resumen
derivado y veredicto de piso); el resto conserva el estado verificado del 2026-10-09.
Los párrafos marcados «motor 1.1» describen el cambio posterior del mismo 2026-10-10: contrato 1.1.0 del kernel,
neto pactado, redondeo comercial y catálogo v4
([ADR](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)).
Los párrafos marcados «motor 1.2» describen el cambio del 2026-10-11: contrato 1.2.0 del kernel (el piso acompaña al
factor de mercado), factores de país con valor y catálogo v5
([delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado)).
Los párrafos marcados «versiones vigentes (2026-10-11)» describen el cambio posterior de ese mismo día, que no toca
ningún contrato del kernel: un puntero que dice qué versiones son las vigentes, precios unitarios que no vencen,
avisos de la corrida, la lectura de qué dato estimado pesa más y el catálogo v6. El resumen para leer primero está
en [Qué versiones se usan hoy](#qué-versiones-se-usan-hoy-2026-10-11).
Los párrafos marcados «motor 1.3» o «lecturas (2026-10-11)» describen el cambio de la tarde de ese mismo día: el
contrato 1.3.0 del kernel (la forma del trabajo, On-Going u On-Demand, como dato propio), el catálogo v9, la policy
v7 con Adobe tal como se factura, la policy v8 con el plazo durante el cual hay que seguir pagando cada licencia, la
policy v9 con Microsoft 365 y Notion tal como se facturan y la fecha en que se renueva el contrato de Adobe, la
policy v10 que cotiza Creative Cloud Pro sin su descuento, y
tres lecturas nuevas de una cotización ya congelada. El resumen para leer primero
está en [Forma del trabajo: On-Going y On-Demand](#forma-del-trabajo-on-going-y-on-demand-2026-10-11) y en
[Tres lecturas de una cotización congelada](#tres-lecturas-de-una-cotización-congelada-2026-10-11).
Los párrafos marcados «motor 1.4» describen el cambio de la noche de ese mismo día: el contrato 1.4.0 del kernel
(los costos de terceros de un trabajo y una reserva de contingencia para trabajos de alcance fijo) y el catálogo v10,
que además deja cerrados los factores de país. El resumen para leer primero está en
[Costos de terceros y reserva de contingencia](#costos-de-terceros-y-reserva-de-contingencia-2026-10-11).
Los párrafos marcados «documento (2026-10-11)» describen el último cambio de esa noche, que no toca ningún contrato
del kernel ni ninguna cotización congelada: una lectura nueva, `compose document`, que convierte una cotización
congelada en los datos de su documento para el cliente (la plantilla A4 de cotización, en su versión 2). El resumen
para leer primero está en
[El documento de cotización para el cliente](#el-documento-de-cotización-para-el-cliente-2026-10-11).
Los párrafos marcados «asientos y opciones (2026-10-11)» describen lo que se corrigió ese mismo día después de
cotizar el primer caso real de punta a punta: los asientos de una herramienta se declaran como se compran, los meses
iguales se declaran una vez, el documento admite opciones adicionales y líneas bonificadas, y `--out` guarda una
cotización calculada o no guarda nada. No toca ningún contrato del kernel, y todos los artefactos congelados se
reproducen igual. El resumen para leer primero está en
[Asientos como se compran y períodos declarados una vez](#asientos-como-se-compran-y-períodos-declarados-una-vez-2026-10-11).

## Qué versiones se usan hoy (2026-10-11)

Esta sección resume, en lenguaje simple, lo que cambia para quien cotiza. El detalle de cada punto está más abajo o
en el documento que se enlaza.

- **Un puntero dice cuáles son las versiones vigentes.** El archivo `data/pricing/v3-operating/current.json` nombra
  el catálogo de precios, la policy de recursos (las reglas y precios de herramientas) y el catálogo de créditos IA
  que se usan hoy. Al cotizar agregas `--current` y la CLI toma esas tres fuentes sin que escribas el nombre de
  ningún archivo. Ya no hace falta saber si «la vigente es la v5 o la v6»: `pnpm --silent pricing:v3 current show`
  lo responde. Cómo se mueve el puntero: [mantenimiento](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).
- **Un precio unitario no vence.** El precio de una licencia vale hasta que alguien lo reemplaza por otro. Lo que sí
  tiene es una fecha de revisión, que avisa cuando toca volver a mirarlo y nunca bloquea una cotización. La cantidad
  de licencias no es parte del precio: se declara en cada cotización.
- **El resumen puede traer avisos de la corrida.** Son notas sobre el momento en que se cotizó (por ejemplo, que la
  fecha de la cotización es anterior a valores más nuevos del catálogo). No forman parte de la cotización congelada
  y no bloquean. Claves y forma: [contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).
- **El resumen ordena qué datos estimados cargan más costo.** Para cada dato estimado dice cuánto costo descansa en
  él y cuántos puntos de margen se perderían si ese dato fuera 10 % más alto. Sirve para decidir qué confirmar
  primero. Cómo leerlo: [provisiones y costos](cotizador-v3-provisiones-y-costos.md#qué-dato-estimado-conviene-confirmar-primero-2026-10-11).
- **El costo de las personas es un costo objetivo.** Sale del Excel de pricing y representa el nivel salarial al que
  el CEO quiere llevar al equipo; no es la nómina de hoy. Por eso el margen real actual sobre las personas es mayor
  que el que muestra el cotizador. Detalle y límites:
  [provisiones y costos](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11).
- **Todavía no se puede emitir una cotización en EUR.** El catálogo v6 permite convertir a USD una herramienta que se
  paga en EUR, pero no existe la tasa inversa ni una regla de redondeo para EUR. A un cliente de España se le cotiza
  en USD.

Nada de esto convierte una simulación en un precio aprobado, un costo validado o una cotización emitida.

## Forma del trabajo: On-Going y On-Demand (2026-10-11)

**Qué es y para qué sirve.** La forma del trabajo dice qué tipo de compromiso se vende. *On-Going* es un servicio
continuo, que se renueva mes a mes. *On-Demand* es un trabajo acotado: tiene alcance, inicio, término, aceptación y
salida definidos. Hasta este cambio el cotizador no distinguía entre los dos y todo se cotizaba como continuo. Ahora
la forma es un dato propio del pedido y cambia el precio.

**Qué no es.** No es una cuarta oferta ni un modelo de entrega: las ofertas siguen siendo tres. Tampoco es la
cadencia de cobro. El campo `engagementCode` (hoy `monthly`) sigue diciendo cada cuánto se factura y sigue eligiendo
la política de precio; la forma va en un campo aparte y opcional, `engagementForm`, con los valores `on_going` y
`on_demand`.

**Cuánto cambia el precio.** On-Demand vale 10 % más que On-Going. El catálogo lo guarda como una razón de precio
(`priceRatio`): 1 para On-Going y 1,10 para On-Demand, en un registro por forma (`engagement_factor`). La razón
multiplica el precio de **toda** la fila —persona, fee de plataforma, provisiones y herramientas, tanto la
mensualidad como la puesta en marcha— después de la política de precio y del factor de mercado, y antes del redondeo
comercial y de cualquier descuento o precio pactado.

**Qué queda igual.**

- El costo. La forma no mueve ningún costo.
- El piso de margen. El piso de cada fila es, cifra por cifra, el de la misma fila cotizada sin forma. El 10 % cuenta
  como margen: un descuento puede consumirlo, pero sólo hasta el mismo piso que tendría el trabajo en On-Going.
- Las cotizaciones anteriores. Un pedido que no declara la forma se calcula exactamente como antes y con el mismo
  contrato que antes.

**Por qué 10 %, y qué parte es costo y qué parte es política.** Un trabajo acotado trae costos que un servicio
continuo reparte en el tiempo: ponerlo en marcha, coordinarlo y sostener compromisos con proveedores que duran más
que el trabajo. Esa parte de la diferencia es costo real, y en V3 se costea aparte en vez de esconderse en el
recargo: la puesta en marcha
([provisiones](cotizador-v3-provisiones-y-costos.md#puesta-en-marcha-onboarding-por-persona-y-reclutamiento-opcional-2026-10-11)),
la coordinación y los compromisos con proveedores que siguen después del trabajo
([lectura de compromisos](#tres-lecturas-de-una-cotización-congelada-2026-10-11)). El 10 % es la otra parte: una
decisión de política comercial, no una medición. Es el multiplicador de «modelo comercial» que ya traía el Excel de
pricing (On-Going 0 %, On-Demand +10 %), el mismo concepto que usa el cotizador de Greenhouse en producción. El CEO eligió este diseño —un
registro por forma en vez de duplicar las políticas de precio— y preguntó si 10 % era correcto, dejando el ajuste al
agente. El agente lo mantuvo: es el extremo bajo del 10–15 % que una agencia suele descontar a un servicio continuo
frente a su tarifa de proyecto.

**Ejemplo medido el 2026-10-11** (`designer-on-demand.demand.json` →
`designer-on-demand.artifact.json` en [`data/pricing/v3-operating/`](../../../data/pricing/v3-operating/README.md)):
un mes de un diseñador senior dedicado, persona y cliente en Chile, salida en CLP, oferta de persona por dedicación.
Es una simulación de prueba. Las cifras de la tabla son las del artefacto congelado, que usó el catálogo v9 y la
policy v7: Creative Cloud Pro con el descuento con que se factura hoy.

| | On-Going | On-Demand |
| --- | --- | --- |
| Mensualidad | 2.250.000 | 2.470.000 |
| Puesta en marcha (onboarding) | 290.000 | 320.000 |
| Neto del mes | 2.540.000 | 2.790.000 |
| Costo | 1.768.438 | 1.768.438 |
| Margen sobre el costo del catálogo | 30,4 % | 36,6 % |
| Piso de la mensualidad / de la puesta en marcha | 2.091.251 / 266.667 | 2.091.251 / 266.667 |
| Líneas bajo el piso | 0 | 0 |

La diferencia entre los dos netos es 250.000 y no exactamente el 10 %: cada fila se redondea a su múltiplo comercial
después de aplicar la razón. El ajuste antes de redondear (`engagementAdjustment`) es 252.635.

Desde la policy v10 una cotización nueva toma Creative Cloud Pro sin descuento. La misma demanda vuelta a cotizar
ese día con `--current` da costo 1.822.704 en las dos formas, neto 2.610.000 On-Going (margen 30,2 %) y 2.870.000
On-Demand (margen 36,5 %), con `engagementAdjustment` 260.387. Los ejemplos que siguen en este documento usan las
cifras del artefacto congelado.

**Qué no puede expresar todavía un trabajo acotado.**

- La duración del contrato no es un dato de entrada: una cotización tiene períodos, no un plazo. El cotizador no
  sabe si un mes es un trabajo de un mes o el mes representativo de un servicio continuo.
- Un trabajo de menos de un mes se expresa como horas dentro de un período; no hay períodos más cortos.
- Los costos de terceros del trabajo y una reserva de contingencia para alcance fijo no estaban modelados cuando se
  escribió esta lista. Existen desde el contrato 1.4.0, de la noche del mismo 2026-10-11:
  [costos de terceros y reserva de contingencia](#costos-de-terceros-y-reserva-de-contingencia-2026-10-11).
- Sólo existen On-Going y On-Demand. No hay forma híbrida ni de licencia o consultoría: un trabajo híbrido se cotiza
  como dos cotizaciones, una base On-Demand y una operación On-Going.
- Un pedido que no declara la forma se calcula como On-Going y no avisa. Declararla es responsabilidad de quien
  cotiza.
- La razón no tiene un tope en el catálogo, y la protección contractual de un trabajo acotado (plazo mínimo,
  cláusula de salida) es materia del contrato, no del cotizador.

Qué significa On-Demand en el modelo de negocio:
[modelo operativo de proyectos](../../business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md) y
[Efeonce Factory](../../business-models/factory/EFEONCE_FACTORY_BUSINESS_MODEL_V1.md), la ruta comercial reservada a
los trabajos On-Demand. Contrato, claves y fallas:
[contrato 1.3.0](cotizador-v3-contrato-y-validacion.md#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11).

## Costos de terceros y reserva de contingencia (2026-10-11)

**Qué son y para qué sirven.** Son dos cosas que un trabajo real trae y que el cotizador no sabía expresar hasta el
contrato 1.4.0. Antes se sumaban a mano, fuera de la cotización, y el margen y el veredicto de piso no las veían.

- Un **costo de terceros** es algo que se compra a un proveedor para ese trabajo y que no es parte del equipo ni
  una herramienta del catálogo: una producción audiovisual, un locutor y sus derechos de uso, una impresión, la
  inversión en medios, una licencia.
- Una **reserva de contingencia** es un colchón dentro del costo para absorber sobrecostos cuando el alcance es
  fijo. Si un trabajo de alcance cerrado toma más horas que las previstas, el precio ya no se mueve; la reserva es
  lo que cubre esa diferencia.

### Costos de terceros: quién le paga al proveedor

Cada costo se declara en el pedido (`brief.thirdPartyCosts[]`) con un identificador, su categoría, un nombre, el
proveedor, el importe y su moneda, la cantidad, los períodos en que cae y la evidencia del importe (la cotización
del proveedor: referencia, vigencia y estado). Lo primero que se declara es quién le paga al proveedor
(`settlement`), porque cambia todo lo demás:

| Quién paga | Valor | Qué pasa en la cotización |
| --- | --- | --- |
| Efeonce le paga al proveedor y se lo refactura al cliente | `reinvoiced` | Es una fila propia de la cotización, con su costo, su precio y su piso. Entra a los totales, al margen y a la caja |
| El cliente le paga directo al proveedor | `client_direct` | Es una nota. No entra a ningún total, costo, cifra de caja ni conversión de moneda; se muestra aparte, en su propia moneda |

El precio de un costo refacturado no se escribe en el pedido: el pedido lleva sólo la **categoría**, y la regla de
precio de cada categoría vive en el catálogo. Reglas del catálogo v10:

| Categoría | Regla de precio | Piso de la fila | Redondeo |
| --- | --- | --- | --- |
| Producción, talento e impresión (`production`, `talent`, `printing`) | Costo del proveedor más 10 % de gestión | 5 % de margen | Comercial: sube al múltiplo de la moneda |
| Medios y licencias (`media`, `licences`) | Al costo, sin recargo | 0 | Ninguno: se cobra exactamente el costo |

El 10 % es el fee de gestión de proyectos que ya traía el Excel de pricing, y «sin margen sobre la inversión en
medios» es la regla que el operador ya aplicaba a los medios pagados. Las cinco reglas son **estimaciones**: las
propuso el agente y el CEO las aceptó el 2026-10-11 («seguiré tu recomendación»), para ajustarlas con el primer
trabajo real. Los registros están marcados como estimados.

Cómo se comporta una fila de terceros:

- Queda **fuera** del factor de mercado, de la razón On-Demand y de los descuentos por tasa. Un proveedor cobra lo
  mismo sea cual sea el país del cliente o la forma del trabajo, y un descuento sobre el servicio no rebaja lo que
  hay que pagarle. El único ajuste que la alcanza es un neto pactado explícito (`agreed_net` con
  `billing: "third_party"`) que nombra los costos.
- Los períodos son obligatorios (`periodIds`): un costo de una sola vez nunca se multiplica en silencio por los
  meses de la cotización.
- Si el proveedor cobra en la moneda de la cotización, no hay conversión y el importe entra exacto. Si cobra en
  otra, se convierte con el tipo de cambio que la cotización congela, y la evaluación lo avisa: al proveedor se le
  paga al tipo de cambio del día del pago.
- Una cotización de proveedor vencida bloquea la cotización siguiente (`STALE_SOURCE`); una estimada la deja en
  revisión.
- El nombre del proveedor y la referencia de su cotización quedan en el pedido congelado, pero no salen en el
  resumen ni en la vista para el cliente: ahí un costo se nombra por su identificador, su nombre y su categoría.

### Dos márgenes, y cuál se compara contra el piso

Una cotización con terceros tiene dos márgenes, y confundirlos lleva a una decisión equivocada.

- El **margen mezclado** es el de toda la cotización (`marginRateRoundedDown`). Baja con todo lo que se refactura
  al costo o cerca del costo: mientras más medios o producción lleva un trabajo, más bajo se ve, aunque el trabajo
  del equipo esté igual de bien vendido.
- El **margen del trabajo propio** (`ownWork.marginRateRoundedDown`) es el mismo cálculo sin las filas de terceros:
  equipo, herramientas, provisiones y reserva. Es el que se compara contra el piso de la oferta: 45 % en los
  servicios gestionados, 25 % en una persona vendida por dedicación.

Quien juzgue una cotización con terceros por el margen mezclado va a rechazar trabajo sano o, peor, va a bajarle
el precio al equipo para «recuperar» un margen que nunca estuvo en riesgo. No existe un veredicto único para toda
la cotización sobre ninguno de los dos márgenes: el piso se juzga fila por fila, una fila del equipo contra su
política de precio y una fila de terceros contra la regla de su categoría.

### Reserva de contingencia: un costo que se vende con margen

Un servicio gestionado vendido On-Demand lleva una reserva de 12 % del costo de las personas del equipo. El catálogo
v10 la carga para las dos ofertas de servicio gestionado (`creative-managed-service` y `seo-aeo-managed-service`)
cuando el pedido declara `engagementForm: on_demand`. El 12 % es el colchón que el operador usó en una oferta de
licitación; lo propuso el agente y lo aceptó el CEO el 2026-10-11, también como estimación para ajustar con el
primer trabajo real.

- **Es un costo, no un recargo.** Se suma al costo de cada fila del equipo. Como cualquier otro costo, se vende con
  el margen de la oferta y con la razón On-Demand, y sube el piso de la fila. En el ejemplo de más abajo, 436.800 de
  reserva en el costo se convierten en 870.000 de precio. Una reserva vendida al costo dejaría de proteger el
  margen justo cuando se usa.
- **Nunca incluye las filas de terceros.** Se calcula sobre el costo de las personas.
- **Sale sólo por una renuncia declarada.** El pedido la quita con `contingency: { kind: "waived", reason }`. La
  reserva pasa a cero, el resumen levanta la señal `CONTINGENCY_RESERVE_WAIVED` y dice cuánto se dejó fuera. Un
  servicio gestionado declarado On-Demand no tiene otra forma de cotizarse sin ella.
- **Una persona por dedicación no lleva reserva.** En staff augmentation el cliente dirige el trabajo y el riesgo
  de alcance es suyo.
- **Si el pedido no declara la forma, la reserva no se evalúa, y el cotizador lo dice.** La cotización trae el
  supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`, para que una forma olvidada no signifique en
  silencio «sin reserva».

El colchón que las prácticas sumaban a mano para un trabajo de alcance fijo se puede expresar ahora en un servicio
gestionado On-Demand. El colchón de un servicio On-Going ganado en una licitación con multas **no** está modelado.

### Ejemplo congelado, vuelto a correr el 2026-10-11

[`managed-on-demand-third-party.demand.json`](../../../data/pricing/v3-operating/managed-on-demand-third-party.demand.json)
→ `.artifact.json` es el primer artefacto firmado por el motor 1.4.0: un servicio gestionado creativo vendido
On-Demand en Chile, un mes, salida en CLP, con una producción en pesos, talento en dólares, medios al costo y una
licencia que paga el cliente. Es una simulación de prueba; los proveedores son nombres de ejemplo. Cifras del
artefacto, reproducidas con `replay` y vueltas a obtener cotizando la demanda con `--current`:

| | Costo | Neto | Piso de la fila |
| --- | --- | --- | --- |
| Producción audiovisual (proveedor en CLP, +10 %) | 4.500.000 | 4.950.000 | 4.736.843 |
| Talento: USD 1.250 a 1.000 CLP por USD, +10 % y redondeo | 1.250.000 | 1.380.000 | 1.315.790 |
| Medios pagados, al costo | 3.333.333 | 3.333.333 | 3.333.333 |
| **Terceros refacturados** | **9.083.333** | **9.663.333** | — |
| **Trabajo propio** (equipo, herramientas, provisiones y reserva) | **5.666.722** | **11.370.000** | Por fila del equipo |
| **Total de la cotización** | **14.750.055** | **21.033.333** | — |
| Banco de imágenes que paga el cliente (USD 890) | Fuera | Fuera | — |

- Margen mezclado: 29,87 %. Margen del trabajo propio: 50,16 %. Ninguna fila está bajo su piso. Leído por el
  margen mezclado, este trabajo parecería estar quince puntos bajo el piso de 45 % de la oferta; no lo está.
- El trabajo propio supera el 45 % objetivo de la oferta porque es On-Demand: la razón 1,10 suma margen
  (`engagementAdjustment` 1.030.311).
- Los terceros son el 45,9 % del neto y dejan 580.000 de margen, todo de producción y talento.
- La reserva es 436.800, el 12 % de 3.640.000 de costo de personas, y pesa 2,1 % del neto.
- El total no es un múltiplo de 10.000 porque los medios se cobran exactamente al costo, sin redondeo.

La misma demanda con un solo cambio, cotizada ese día con `--current` (copias sin versionar):

| Cambio | Contrato | Costo | Neto | Margen mezclado | Margen del trabajo propio |
| --- | --- | --- | --- | --- | --- |
| Ninguno (el ejemplo) | 1.4.0 | 14.750.055 | 21.033.333 | 29,87 % | 50,16 % |
| Con la reserva renunciada y su motivo | 1.4.0 | 14.313.255 | 20.163.333 | 29,01 % | 50,19 % |
| Sin costos de terceros | 1.4.0 | 5.666.722 | 11.370.000 | 50,16 % | 50,16 % |
| Declarada On-Going | 1.4.0 | 14.313.255 | 19.193.333 | 25,43 % | 45,12 % |
| Sin declarar la forma | 1.4.0 | 14.313.255 | 19.193.333 | 25,43 % | 45,12 % |
| Sin forma y sólo con la licencia que paga el cliente | 1.1.0 | 5.229.922 | 9.530.000 | 45,12 % | — |

- Renunciar a la reserva baja el precio en 870.000 y el costo en 436.800, y queda señalado
  (`totals.contingencyReserveWaived` 436.800).
- On-Going no lleva reserva. La fila «sin declarar la forma» da las mismas cifras, pero trae el supuesto de que la
  reserva no se evaluó.
- La última fila muestra que una nota de costo pagado por el cliente no cambia el contrato ni ninguna cifra: la
  cotización se calcula como antes y la nota viaja aparte.
- Con la cotización de la productora vencida el 2026-10-08, la cotización queda `needs_input` (salida 2) con
  `STALE_SOURCE`, y `runNotices.priceDates.expired` nombra el costo.

### Qué no está modelado

- **Cuándo se le paga al proveedor.** La cotización congela el período en que cae un costo, no la fecha de pago ni
  las condiciones del proveedor. No puede decir si Efeonce le paga al proveedor antes de cobrarle al cliente.
- **Si una compra obliga más allá del trabajo.** Un plazo mínimo, un cargo por cancelar o unos derechos de uso que
  duran más que el trabajo (como los doce meses del ejemplo) no se leen: la lectura de compromisos los deja fuera a
  propósito y lo dice.
- **Una comisión sobre lo que el cliente paga directo.** Un costo `client_direct` es sólo una nota.
- **Una lista de precios de proveedores recurrentes.** Cada costo llega con su propia evidencia.
- **El tratamiento de impuesto por fila**, y una cotización que sólo tenga terceros, sin ninguna línea de equipo.
- **La reserva de un servicio On-Going ganado en licitación con multas**, y la liberación de la reserva después de
  la entrega.

Contrato, claves y fallas:
[contrato 1.4.0](cotizador-v3-contrato-y-validacion.md#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11).
Por qué la reserva es un costo y qué pasa con los factores de país:
[provisiones y costos](cotizador-v3-provisiones-y-costos.md#costos-de-terceros-y-reserva-de-contingencia-como-costos-2026-10-11).

## Tres lecturas de una cotización congelada (2026-10-11)

Una lectura toma una cotización ya calculada y guardada (el artefacto) y la presenta de otra manera para responder
una pregunta. Las tres comprueban primero que el artefacto se reproduce igual, y **ninguna cambia un precio, un costo
ni un total**. Son vistas internas: traen costos. Igual que `compose split`, que ya existía, salen con código 3
(cálculo en revisión).

| Lectura | Pregunta que responde | Qué necesita | Qué no puede saber |
| --- | --- | --- | --- |
| Calendario de pagos — `compose schedule` | ¿Cómo se reparte el neto cotizado en hitos de pago? | El artefacto y un archivo con los hitos: cada uno con su parte del total | No comprueba fechas, aceptaciones ni pagos. No es una factura ni un monto cobrado |
| Lectura de caja — `compose cash` | ¿Cuánta caja nueva obliga a pagar a proveedores este trabajo, y cuánta caja agrega si se hace con gente ya contratada? | Sólo el artefacto | Si una licencia se compra para el trabajo o ya existía, si hay que contratar a alguien, y nada de lo cobrado |
| Compromisos con proveedores — `compose commitments` | ¿Qué queda comprometido con proveedores después del último período cotizado? | Sólo el artefacto | La duración real del contrato: conoce los períodos cotizados, no el plazo |

**Calendario de pagos.** El archivo de hitos es una lista: cada hito tiene un identificador, un nombre, su parte del
total (`share`, una fracción decimal) y cuándo ocurre (un período o un texto libre). Las partes deben sumar
exactamente 1. Cada monto se redondea al múltiplo comercial de la cotización y el último hito toma lo que falta, así
que los montos suman exactamente el neto cotizado. El impuesto aparece sólo si la cotización lo resolvió. Con el
ejemplo anterior y hitos de 50 %, 30 % y 20 %: 1.400.000, 840.000 y 550.000, que suman 2.790.000.

**Lectura de caja.** Pone el neto al lado de su costo completo y de su margen (los lee, no los recalcula), separa el
costo por naturaleza (personas, provisiones, fee de plataforma, puesta en marcha, presupuestos de créditos y
licencias) y calcula dos cifras:

- La **caja nueva a proveedores**: lo que la cotización obliga a comprar además de lo que ya se paga. Hoy sólo
  cuenta los paquetes extra de créditos IA declarados.
- La **caja que el trabajo agrega sobre capacidad ya contratada**: neto menos esa caja nueva. No es un margen y no
  decide precio. Supone que las personas ya están contratadas con o sin este trabajo y que no se compra ninguna
  licencia para él; la salida lo dice en `restsOn` y lista en `notDerivable` lo que no puede saber.

En el ejemplo: neto 2.790.000, costo completo 1.768.438, caja nueva a proveedores 43.770 (dos paquetes de créditos) y
caja agregada sobre capacidad ya contratada 2.746.230. La cifra que decide si el trabajo es viable sigue siendo el
margen sobre el costo completo.

**Compromisos con proveedores.** Lista lo que sigue comprometido cuando terminan los períodos cotizados: herramientas
con precio anual, herramientas cuya licencia hay que seguir pagando más tiempo que lo cotizado y créditos IA que
sobran, con su vencimiento. Para cada uno dice cuánto está comprometido, cuánto cubre la cotización y cuánto queda. Si
la licencia es compartida, ese resto vuelve a la capacidad compartida y no se cuenta como varado; si la cotización es
el único uso declarado, queda varado salvo que otro trabajo la use.

El dato que usa es el plazo que la policy declara para cada precio: cuánto tiempo hay que seguir pagando una licencia
una vez que se toma. Habla de la licencia, no del papel del contrato. Lo declaró el CEO el 2026-10-11:

- **Adobe, plan anual pagado mes a mes.** Una licencia comprada sigue disponible y se sigue cobrando hasta que el
  contrato se renueva; la cuenta no baja si se deja de usar. La policy lo declara como un plazo de doce meses.
- **Microsoft 365, un mes.** El contrato es anual y se paga mes a mes, pero asignar o quitar una licencia sube o
  baja la cuenta mensual. No queda nada comprometido cuando termina un trabajo corto.
- **Notion, un mes.** Se paga mes a mes, sin más compromiso.
- **HubSpot, sin declarar.** Es anual, pero el CEO indicó el 2026-10-11 que hoy no se necesita en las cotizaciones.
  Su precio queda pendiente a propósito y por eso no lleva plazo: no es un dato que alguien deba.

Un plazo de un mes es una declaración, distinta de «nadie lo dijo»: para una herramienta sin plazo declarado la
lectura responde que no está declarado.

Desde la policy v9 un precio puede declarar además **la fecha en que se renueva el contrato**. Con ella la lectura
deja de suponer un plazo entero y cuenta lo que queda del plazo que ya corre: la licencia queda atada hasta la
primera renovación posterior al último mes cotizado (`boundUntil` en la salida), y lo comprometido son los meses
que empiezan antes de esa fecha. Si la cotización cruza una renovación, la licencia queda atada hasta la siguiente y
la lectura lo avisa con `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`: en la renovación se puede cambiar el número de
licencias, pero sólo de las que ya no se necesitan. El contrato de Adobe se renueva el 2026-11-16, según la consola
del proveedor que mostró el CEO; es el único que declara la fecha.

En el ejemplo, vuelto a cotizar el 2026-10-11 con las versiones vigentes (policy v10), aparece sólo Adobe: después
del mes cotizado queda **un mes** de la licencia de Creative Cloud Pro, CLP 108.468 (un tercio del precio sin
descuento), atada hasta el 2026-11-16. Como la demanda la declara dentro de un paquete compartido de tres
licencias, ese mes vuelve al paquete en vez de contarse como varado. Microsoft 365 y Notion no aparecen, porque su
plazo de un mes queda cubierto por el mes cotizado. El artefacto versionado `designer-on-demand.artifact.json` se
congeló con la policy v7, anterior a esas declaraciones: su propia lectura muestra también sólo Adobe, pero sin
fecha de renovación, y lista Notion y Microsoft 365 como no declarados. Un artefacto congelado no cambia cuando la
policy cambia.

Límite conocido: un precio que declara plazo y no declara fecha de renovación se sigue leyendo como un plazo entero
contado desde el primer mes cotizado, aunque el contrato ya esté corriendo y le quede menos; ese monto es un techo.
Es lo que muestra la lectura del artefacto versionado. Con fecha, un mes que el plazo cubre sólo en parte cuenta
entero, así que la lectura puede pasarse hasta por un mes, y no sabe qué cuesta salir antes de la renovación. Los
precios por año no usan ninguno de los dos datos.

Como no distingue un trabajo de un mes del mes representativo de un servicio continuo, esta lectura se pide a
propósito para trabajos acotados; no es un aviso automático.

Asientos y opciones (2026-10-11): la lectura tiene una cuarta clase de entrada, la única que está **dentro** de los
períodos cotizados. Cuando la demanda declara asientos pagados que nadie usa (`idleSeats`), cada herramienta y plan
con asientos ociosos sale como `kind: "idle_seat"`: cuántos meses-asiento son, cuánto cuestan (una parte del costo
que la cotización ya tiene; no es un monto para sumar) y que el uso no cubre nada de ellos. La señal es
`PAID_SEAT_IDLE_WITHIN_ENGAGEMENT` y el total, `totals.idleSeats`. Una cotización sin asientos ociosos no trae nada
de esto. Qué es un asiento ocioso:
[Asientos como se compran](#asientos-como-se-compran-y-períodos-declarados-una-vez-2026-10-11).

`compose split` no cambió de propósito. Con una forma declarada, el kit de herramientas lleva la razón de la forma
igual que cualquier otro componente: en el ejemplo, kit 190.000 más persona 2.600.000.

**Motor 1.4 (2026-10-11): cómo leen estas lecturas una cotización con terceros y reserva.** Las cuatro siguen sin
cambiar un total. Medido sobre el
[ejemplo con terceros](#ejemplo-congelado-vuelto-a-correr-el-2026-10-11) (`managed-on-demand-third-party.artifact.json`):

- **Calendario de pagos.** Reparte el neto completo, costos refacturados incluidos. Agrega `thirdParty.byPeriod`,
  que compara lo que se les paga a los proveedores de un período con los hitos puestos en ese período. Con hitos de
  30 %, 40 % y 30 % y sólo el primero puesto en el mes cotizado: 6.310.000, 8.410.000 y 6.313.333. Los proveedores
  de ese mes cuestan 9.083.333, así que `supplierCostAboveMilestones` es 2.773.333: Efeonce pone esa diferencia hasta
  cobrar un hito posterior. No conoce fechas de pago a proveedores; un hito sin período no se compara con nada.
- **Lectura de caja.** El costo por naturaleza suma dos: `thirdParty` 9.083.333 y `contingencyReserve` 436.800. La
  caja nueva a proveedores incluye ahora lo que se les paga a los proveedores de costos refacturados: 9.083.333. La
  caja agregada sobre capacidad ya contratada es 11.950.000 (21.033.333 menos esa caja nueva). La reserva es una
  provisión dentro del costo: no se le paga a nadie, no compromete caja y no cuenta como capacidad
  (`capacityCostAbsorbed` 3.940.000 son personas y provisiones). El costo que paga el cliente aparece listado y no
  se cuenta en ninguna cifra. `results.marginAtFullCost` trae al lado `ownWork`, el margen del trabajo propio.
- **Compromisos con proveedores.** Las compras a terceros quedan fuera de esta lectura a propósito: dice cuántas vio
  (`reviewed.thirdPartyPurchasesOutsideThisReading`, 3 en el ejemplo) y que sus condiciones no están congeladas
  (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`). En el ejemplo lo único que lista es la bandeja de atención social, una
  herramienta a precio anual: 9.576.000 comprometidos, 798.000 dentro del mes cotizado y 8.778.000 que quedan
  varados si nada más la usa. Los derechos de uso por doce meses del talento no aparecen: es justo lo que esta
  lectura no sabe.
- **Persona y kit (`compose split`).** Con filas de terceros son tres partes que suman el neto: kit 2.020.000,
  persona 9.350.000 y terceros 9.663.333. La reserva queda dentro de la parte de la persona.

## El documento de cotización para el cliente (2026-10-11)

Las lecturas anteriores son internas. Ésta produce lo que el cliente lee. `compose document` toma una cotización ya
congelada y emite los datos de su documento, que la
[plantilla A4 de cotización](../../commercial/templates/cotizacion-a4/README.md) convierte en HTML y PDF. Como las
demás lecturas, comprueba primero que el artefacto se reproduce igual y **no cambia un precio, un costo ni un
total**. A diferencia de ellas no trae costos: el documento no muestra costo, margen, tarifa, proveedor, política ni
identificadores internos.

**Por qué este documento.** Efeonce tiene dos documentos de cotización: el PDF del cotizador de Greenhouse, que se
arma desde las tablas de cotizaciones, y la plantilla A4, que ya se usó en cotizaciones entregadas. El CEO los
comparó sobre renders reales el 2026-10-11 y decidió que el documento de una cotización V3 es la plantilla A4:
presenta un precio por un servicio, no horas y una tarifa por rol, en pocas páginas densas y con la línea gráfica
vigente. Lo que la plantilla no tiene es un registro detrás: número de cotización, versiones, verificación, firmas,
aprobación, envío y CRM existen sólo en el cotizador de Greenhouse. La dirección acordada es llevar más adelante
este diseño a ese cotizador, que aporta lo que falta; ese paso no ha empezado.
[Decisión y alternativas descartadas](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--el-documento-de-cotización-de-una-cotización-v3-compose-document).

**Dos fuentes que no se mezclan.**

| Sale de | Qué |
| --- | --- |
| La cotización congelada | Toda cifra: la moneda, la fecha del documento, las líneas y su neto, el impuesto, el total, los costos que el cliente paga directo, los importes de un calendario de pagos y el valor de referencia de una línea bonificada |
| La cotización congelada de cada opción | El precio de esa opción adicional (asientos y opciones, 2026-10-11): cada opción se cotiza aparte y su precio sale de su propio artefacto |
| El brief del documento | Todo texto: referencia, quién emite y para quién, portada, nombre del servicio, alcance, calendario del trabajo, textos de la sección de precio y condiciones. También cómo se presentan las líneas: nombre, detalle y grupo, si una línea bonificada se muestra, y el nombre y la unidad de cada opción |

El brief (`pricing-v3-quote-document-brief/1`) no tiene dónde escribir un importe, una moneda, una tasa de impuesto
ni una fecha: uno que trae alguno se rechaza. Por eso un documento no puede contradecir a su cotización. Para cambiar
una cifra se cambia la cotización y se vuelve a emitir.

**Cómo se usa.** Tres pasos; el detalle está en el
[manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#producir-el-documento-de-cotización).

1. `compose document --input <artefacto>`, sin brief, imprime un andamio: las cifras de la cotización, cada línea
   bajo su clave con el nombre y el grupo que tendría por defecto, y los textos por llenar. Sale con código 2
   (falta información).
2. Con el brief lleno, `compose document --input <artefacto> --brief <brief> --out <datos>` emite los datos del
   documento. Sale con código 3: es el borrador de una cotización en revisión. Si el documento lleva opciones
   adicionales, los dos pasos reciben además `--option <clave>=<artefacto de la opción>`, una vez por opción.
3. `node scripts/documents/render-cotizacion-a4.mjs --data <datos> --out <carpeta nueva>` genera el HTML, el PDF,
   un manifiesto y las capturas para revisar.

**Las líneas.** Salen de la misma función que decide lo que muestra `compose preview`: hay una sola frontera entre
una cotización y lo que lee un cliente. `compose preview` las imprime período por período y su salida no cambió; el
documento las reúne a lo largo del plazo.

- Un servicio gestionado es una línea de fee, nunca su equipo ni sus horas. Una cotización vendida por líneas (una
  persona por dedicación) tiene una línea por cada una. La puesta en marcha y cada costo de terceros refacturado van
  en líneas propias.
- Los meses consecutivos en que un concepto cuesta lo mismo son una sola línea: la cantidad es «n meses», el valor
  unitario es el neto de un mes y el neto es su suma exacta. Un cobro único es «1 pago único», sin valor unitario.
- Si el neto de un concepto cambia durante el plazo, sale una línea por cada tramo y el detalle dice qué meses cubre
  («Mes 3», «Meses 1 a 2»). Un mes con neto cero no se cobra y, por defecto, no imprime nada; la excepción es una
  línea bonificada que el brief pide mostrar (ver «Línea bonificada», más abajo).
- Las líneas se agrupan por defecto en «Servicio», «Puesta en marcha» y «Costos de terceros».
- Cada línea tiene una clave con la que el brief puede cambiarle el nombre, agregarle un detalle o moverla de grupo.
  La clave nunca se imprime.

**El impuesto es el de la cotización.**

| Cómo quedó el impuesto en la cotización | Qué imprime el documento |
| --- | --- |
| Tasa aplicada sobre el neto (`exclusive`) | La tasa y el impuesto que la cotización congeló; el total es el de la cotización |
| Sin resolver (`not_resolved`) | Impuesto y total «Por confirmar» |
| No aplica (`not_applicable`) | «No aplica»; el total es igual al neto |

El documento imprime la cifra de la cotización y nunca hace un segundo cálculo. La cotización calcula el impuesto mes
a mes y suma los resultados; calcularlo una sola vez sobre el total puede dar una unidad de diferencia, y entonces
habría dos cifras para la misma cotización. La plantilla trae un
[ejemplo de esa diferencia](../../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio).

**Tres bloques opcionales.** Eran dos hasta el cambio «asientos y opciones (2026-10-11)», que agregó el tercero.

- **Costos que el cliente paga directo a su proveedor.** Aparecen si la cotización los declara. Se imprimen aparte,
  cada uno en su propia moneda, sin convertir y fuera de todo total.
- **Calendario de pagos.** Aparece si el brief declara `paymentMilestones`, la misma lista que recibe
  `compose schedule --milestones`: partes del neto, nunca importes. Los importes se derivan y suman exactamente el
  neto. Cada hito dice cuándo se cobra: en un período de la cotización o con un texto.
- **Opciones adicionales.** Aparecen si la corrida recibe la cotización congelada de cada opción con
  `--option <clave>=<artefacto>` (hasta ocho). Se imprimen en un bloque propio, fuera de las líneas, del neto, del
  impuesto y del total.

**Opciones adicionales (asientos y opciones, 2026-10-11).** Un servicio que el cliente puede contratar aparte se
muestra con su precio sin entrar a la cotización. La regla es una sola: **el precio de una opción sale de su propia
cotización congelada**, nunca de un texto.

- Cada opción se cotiza sola, como cualquier cotización, y su artefacto se entrega al documento con `--option`. Se
  verifica por replay igual que la cotización base.
- El precio que se imprime es el neto de **uno** de sus períodos. Por eso una opción sólo se acepta si está
  calculada, está en la moneda de la cotización base, tiene el mismo neto en todos sus períodos y no declara costos
  que el cliente paga directo. Tampoco puede ser la cotización base ni repetir la de otra opción.
- El brief nombra exactamente las opciones entregadas, ni una más ni una menos: para cada una, su nombre, la unidad
  en que se lee el precio («al mes», «por mes de campaña») y un detalle opcional. No tiene dónde escribir el precio.
- El documento las imprime bajo un rótulo que dice que están fuera de la cotización y que sus valores son netos. Ese
  texto es fijo y lo pone la plantilla.

**Línea bonificada (asientos y opciones, 2026-10-11).** Una línea que la cotización deja en cero con un ajuste
explícito (por ejemplo, una puesta en marcha que se regala a cambio de un compromiso de plazo) no imprime nada por
defecto. Si el brief marca su clave con `courtesy: true`, el documento la imprime como «Bonificado» con su «Valor de
referencia»: el precio que esa línea tenía antes de la rebaja, **leído de la cotización congelada**. No suma al
subtotal, al impuesto ni al total. Una línea que se cobra no se puede marcar. El andamio lista las claves
bonificadas, con su valor de referencia, bajo `waived`.

En la cotización, la fila bonificada sigue siendo una rebaja real: el kernel la marca bajo su piso
(`MARGIN_BELOW_FLOOR`) y el resumen la lista en `marginFloor.lines`. Regalarla es una decisión del operador, no un
efecto del documento.

**Cuándo no se emite.** Cada garantía es un rechazo, no un documento equivocado: las líneas suman exactamente el
neto de la cotización; la cotización está calculada; cada importe se puede escribir en su moneda y el contenido
cabe en los límites de la plantilla (hasta 40 líneas, 8 costos pagados por el cliente y 12 hitos); el impuesto
corresponde a su tasa; y cada opción es un solo importe que dice todo de ella (`QUOTE_DOCUMENT_OPTION_INVALID` si no).
Códigos y reglas:
[contrato](cotizador-v3-contrato-y-validacion.md#documento-de-cotización-compose-document-2026-10-11).

**Es un borrador.** Los datos salen con `status: "draft"`. Un documento producido aquí no es una `quotation_id`, un
precio aprobado ni una cotización emitida, y nada lo registra en Greenhouse ni en el CRM. Los datos llevan además el
origen del cálculo (`source`: sistema, identidad del cálculo, digest y motor), que llega al manifiesto del render y
nunca se imprime.

**Ejemplos congelados, vueltos a emitir y a generar el 2026-10-11.** Cada uno tiene su brief
(`<nombre>.document-brief.json`, con un comprador inventado) y los datos que emite la CLI
(`<nombre>.document.json`), en [`data/pricing/v3-operating/`](../../../data/pricing/v3-operating/README.md). Importes
en CLP.

| Ejemplo | Líneas | Neto | Impuesto y total | Páginas |
| --- | --- | --- | --- | --- |
| `designer-on-demand` (contrato 1.3.0, un mes) | «Diseñador visual sénior», 1 mes, 2.470.000; «Puesta en marcha del servicio», 1 pago único, 320.000 | 2.790.000 | Sin resolver: «Por confirmar» | 4 |
| `designer-three-months-iva` (contrato 1.3.0, tres meses) | El mismo diseñador, 3 meses × 2.550.000 = 7.650.000; puesta en marcha, 320.000 | 7.970.000 | IVA 19 %: 1.514.300; total 9.484.300 | 4 |
| `managed-on-demand-third-party` (contrato 1.4.0, un mes) | Fee del servicio 11.370.000; tres costos de terceros: 4.950.000, 1.380.000 y 3.333.333 | 21.033.333 | Sin resolver: «Por confirmar» | 5 |
| `designer-startup-courtesy` (contrato 1.3.0, tres meses; asientos y opciones) | El mismo diseñador, 3 meses × 2.550.000 = 7.650.000; puesta en marcha «Bonificado», valor de referencia 320.000. Dos opciones: 2.580.000 «al mes» y 3.570.000 «por mes de campaña» | 7.650.000 | IVA 19 %: 1.453.500; total 9.103.500 | 5 |

- `designer-startup-courtesy` es el ejemplo de una línea bonificada y de dos opciones. Su demanda es la de
  `designer-three-months-iva` con un ajuste más: un neto pactado de cero sobre la puesta en marcha. Por eso el neto
  baja en los 320.000 de esa fila y esa cifra aparece sólo como valor de referencia. Cada opción tiene su propia
  demanda y su propio artefacto (`designer-startup-courtesy.option-copywriter.*` y `.option-motion.*`); ninguna
  entra al neto, al impuesto ni al total.
- `designer-three-months-iva` es una cotización congelada nueva (demanda y artefacto), la primera versionada con
  varios períodos y con el impuesto resuelto. Su IVA de 19 % es la fuente de impuesto de un ejemplo, no un criterio
  tributario para ningún cliente. Su mensualidad difiere de la del ejemplo de un mes porque aquél se congeló con una
  policy anterior, cuando Creative Cloud Pro todavía se cotizaba con su descuento.
- En `managed-on-demand-third-party` el documento imprime aparte el costo que paga el cliente (USD 890, sin
  convertir) y un calendario de pagos de 50 %, 30 % y 20 %: 10.520.000, 6.310.000 y 4.203.333, que suman el neto.

**Qué no está modelado.** No describir nada de esto como existente:

- Los textos del documento (alcance, condiciones) se escriben por cotización en el brief. Nada los trae de un
  catálogo ni de una biblioteca de condiciones.
- El reparto en persona y kit de herramientas (`compose split`) todavía no es una forma del documento: un documento
  imprime las líneas propias de la cotización.
- No hay número de cotización, historial de versiones, verificación por QR, firmas, aprobación ni envío. Existen
  sólo en el cotizador de Greenhouse, y esta lectura no escribe en él.
- La portada es una página fija; las de alcance y de condiciones, también (hasta 7 filas de alcance, 3 fases de
  calendario y 6 condiciones). Un título de portada demasiado largo hace fallar la generación: se acorta.
- El documento se emite en la moneda de la cotización, sin conversión a otra.
- Generar el HTML y el PDF necesita un Chromium local (Playwright), como todos los documentos de
  `scripts/documents/`.
- **La puesta en marcha de un servicio gestionado no tiene valor de referencia.** El catálogo no le carga puesta en
  marcha a un servicio gestionado, así que su cotización no tiene una fila que bonificar: una «puesta en marcha
  bonificada» de un servicio gestionado sigue siendo un texto del brief, sin cifra, hasta que el catálogo la costee
  (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC` en el ledger).
- **El margen de una opción que sólo suma dedicación es un piso, no la cifra real.** Una opción que agrega
  dedicación de personas que ya están en la cotización base es una línea nueva en su propia cotización, y vuelve a
  llevar el fee de plataforma por línea y su parte de las herramientas base. Su costo queda sobrestimado y su margen
  es una cota inferior. El precio impreso no cambia (`OPTION_QUOTES_REPEAT_PER_LINE_FEES` en el ledger).
- La duración del contrato y una fecha de inicio que el cliente define después: una cotización tiene meses fechados
  desde su fecha de cotización.

Datos, reglas de composición y límites de la plantilla:
[su manual](../../commercial/templates/cotizacion-a4/README.md).

## Asientos como se compran y períodos declarados una vez (2026-10-11)

**Qué es y para qué sirve.** Una herramienta con licencias nominativas (un asiento por persona) rara vez se compra
de la forma más simple. Un equipo puede tener un asiento anual y sumar uno mensual en los meses de campaña; puede
pagar todo el año un asiento que su persona usa sólo algunos meses; o dos personas pueden turnarse un mismo asiento.
Hasta este cambio la demanda no podía decir ninguna de las tres cosas: admitía un solo plan por herramienta y mes, y
exigía tantos asientos como personas. Ahora las tres se declaran, y la regla que las une es más estricta que la
anterior: **todo asiento pagado se usa, se comparte o se declara ocioso, o la cotización no calcula.**

**De dónde salió.** El 2026-10-11 se cotizó de punta a punta el primer caso real: un servicio gestionado de doce
meses, con una persona de refuerzo en las semanas de campaña. El cotizador calculó bien —reprodujo el precio
acordado y coincidió con una estimación independiente— y se negó a calcular mientras una persona no tenía asiento
declarado, que es justo lo que debe hacer. Pero dejó a la vista cuatro límites: los planes de compra reales no se
podían expresar; una demanda de doce meses repetía cada herramienta doce veces; el documento no podía mostrar
opciones con precio ni una cortesía con su valor; y una corrida bloqueada dejaba un archivo en la ruta de salida. Los
cuatro están corregidos. Este cambio no agrega contrato ni motor: las claves nuevas de la demanda son opcionales y
una demanda que no las usa produce exactamente lo mismo que antes.

**Las tres formas de declarar un asiento.** Las tres viven en la demanda (`pricing-v3-composition-demand/1`).

| Lo que pasa en la realidad | Cómo se declara | Qué hace el cotizador |
| --- | --- | --- |
| **Dos planes conviven** en un mes: por ejemplo, un asiento anual y uno mensual en los meses de campaña | Dos entradas en `allocations` para la misma herramienta y el mismo mes, cada una con su `priceId` | Lee cada plan por separado, junta su costo y lo reparte entre las líneas que usan la herramienta. La misma herramienta, el mismo mes y el mismo `priceId` dos veces siguen siendo un duplicado |
| **Un asiento pagado que nadie usa** ese mes: un asiento anual cuya persona trabaja sólo algunos meses | `idleSeats` (cuántos) e `idleReason` (por qué se paga) en la entrada de ese plan | El costo del asiento ocioso se queda en la cotización, sobre las líneas que usan la herramienta. Si ese mes nadie la usa, la entrada nombra en `bornByLineIds` las líneas que lo cargan, en partes iguales |
| **Dos o más personas usan un mismo asiento**: la persona dedicada y la que la refuerza en campaña | Una entrada en `seatSharing`: la herramienta, los meses, las personas (dos o más) y el motivo | El grupo cuenta como un solo asiento y cada persona carga su fracción |

**La regla.** Para una herramienta nominativa con precio por asiento, en cada mes:

- asientos pagados − asientos declarados ociosos = asientos necesarios;
- los asientos necesarios son las personas que no están en ningún grupo, más uno por cada grupo que comparte.

Si faltan asientos, la cotización queda bloqueada con `INSUFFICIENT_NAMED_SEAT_CAPACITY`. Si sobran —se paga un
asiento que nadie usa y nadie declaró ocioso— queda bloqueada con `UNACCOUNTED_NAMED_SEATS`. Antes de este cambio ese
segundo caso salía con el primer código, que decía lo contrario de lo que pasaba. Cuando uno de los planes es un
paquete (un precio por un grupo de licencias), el paquete cuenta como capacidad: los asientos en uso más la
capacidad del paquete deben alcanzar para las personas, y un asiento ocioso nunca cuenta como capacidad de nadie.

**Cómo se reparte el costo.** El costo de todos los planes de una herramienta en un mes forma un solo fondo, que se
reparte entre las líneas que la usan según el peso de sus asientos. Una persona que comparte un asiento entre `g`
personas pesa `1/g`; una persona que aparece en varias funciones sigue contando como un solo asiento, dividido entre
esas funciones. El costo de un asiento ocioso está dentro de ese fondo: no desaparece ni se cobra aparte.

**Lo que no cambia en una cotización que ya existía.** Una herramienta con un solo plan por mes conserva
exactamente los identificadores que tenía, así que toda cotización congelada se reproduce byte a byte. Sólo una
herramienta que en algún mes tiene dos planes recibe un identificador por plan, y lo recibe en todos sus meses:
`composed:<herramienta>:<priceId>`, con la cobertura `tool:<herramienta>:<priceId>`. Así un asiento comprado por un
año mantiene una sola identidad durante el plazo, que es lo que sigue la regla de continuidad anual. Esa regla
(`ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY`) no cambió: un plan anual todavía no puede cambiar de cantidad ni tener
un hueco, pero un plan mensual a su lado ya no la dispara.

**Dónde se ve.** En el resumen, `attributions` trae una fila por plan. Cuando un mes declara asientos ociosos o
compartidos, o tiene dos planes, la fila agrega `seats` (`needed`, `paid`, `idle` y `sharedSeats`, con cuántas
personas comparten cada asiento y el motivo); `idle`, con los asientos ociosos de ese plan y su costo; y
`bornByLineIds` cuando nadie usa la herramienta. `compose commitments` lista los asientos ociosos como una entrada
propia (ver [las lecturas](#tres-lecturas-de-una-cotización-congelada-2026-10-11)). `compose assess` agrega dos
brechas de revisión: `IDLE_SEAT_COST_REVIEW` (confirmar que el asiento no se puede soltar, pausar ni reasignar, y que
el cliente debe cargarlo) y `SHARED_SEAT_TERMS_REVIEW` (confirmar que el proveedor permite compartir el asiento).
`compose split`, `compose cash` y `explain` no cambian de forma.

**Períodos declarados una vez.** Una entrada de la demanda que vale igual para varios meses se escribe una sola
vez, con `periodIds: [1, 2, 3]` en lugar de `periodId`. Lo admiten `allocations`, la demanda de créditos de cada
línea (`work[].creditDemand`), `clientProvidedTools` y `seatSharing`. Cada entrada lleva exactamente una de las dos
claves, y `periodIds` no repite un mes. Declarar doce meses iguales una vez es la misma demanda que doce entradas:
el cotizador la lee mes por mes. `compose plan` ya escribe así las asignaciones que deriva del portfolio cuando sus
meses son idénticos (lo que declaró quien llama queda como lo escribió), y `compose scaffold` lo pide en su pregunta
por cada herramienta. En el primer caso real, la
demanda de doce meses pasó de 48 entradas de asignación a 6. Dos cosas siguen por mes: los presupuestos de créditos
(`creditBudgets`), porque cada uno lleva sus fechas de compra y de vencimiento, y el portfolio, que conserva
`periodId`. Los costos de terceros ya usaban su propio `periodIds`, que es otra clave y sigue siendo obligatoria.

Una demanda reescrita con `periodIds` da los mismos totales, pero es otra demanda: el artefacto congela lo que se
declaró, así que su identidad (`calculationId`) es distinta. Un artefacto ya congelado no se reescribe.

**Qué no está modelado.** No describir nada de esto como existente:

- **Si el proveedor permite compartir un asiento nominativo.** Es una pregunta del contrato con el proveedor. La
  cotización registra la declaración y su motivo, y `compose assess` pide confirmarlo; no lo valida.
- **Si un asiento ocioso se puede soltar, pausar o reasignar.** Tampoco está en el artefacto.
- El cotizador no deduce asientos ociosos ni compartidos: si no se declaran, la cotización no calcula.

Claves, reglas y diagnósticos:
[contrato](cotizador-v3-contrato-y-validacion.md#demanda-de-composición-asientos-y-períodos-declarados-una-vez-2026-10-11).
Un ejemplo en palabras:
[selección de herramientas](cotizador-v3-seleccion-herramientas.md#asientos-de-una-herramienta-nominativa-las-tres-formas-de-declararlos-2026-10-11).
Paso a paso:
[manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#declarar-los-asientos-de-una-herramienta).
Por qué así y qué se descartó:
[decisión](../../architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--asientos-como-se-compran-y-períodos-declarados-una-vez).

## Las piezas y sus versiones

| Pieza                     | Contrato ejecutable                                         | Qué recibe y qué devuelve                                                                      |
| ------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Núcleo                    | `schemas.ts`, `calculate.ts`                                | Request y snapshot resueltos, contrato `1.0.0`, `1.1.0` (motor 1.1), `1.2.0` (motor 1.2), `1.3.0` (motor 1.3) o `1.4.0` (motor 1.4); cálculo Decimal sin archivos, DB, HTTP, proveedores o LLM |
| Catálogo monetario        | `pricing-v3-catalog/1`                                      | Perfiles, costos, kits, asignación, precio, países, monedas, factores y FX con fuentes; desde el motor 1.1, también reglas de redondeo (`kind: price_rounding`); desde el motor 1.2, `floorBasis` opcional en `market_factor`; desde el motor 1.3, la razón de precio de cada forma del trabajo (`kind: engagement_factor`); desde el motor 1.4, la regla de precio de cada categoría de costo de terceros (`kind: third_party_policy`) y la reserva de contingencia (`kind: contingency_reserve`) |
| Brief                     | `pricing-v3-brief/1`                                        | Necesidad, selecciones y ajustes comerciales (`discount`, `agreed_net`); el resolver devuelve bindings, supuestos, pendientes y el contrato que emite al kernel. Motor 1.3: `engagementForm` opcional, la forma del trabajo. Motor 1.4: `thirdPartyCosts[]` opcional, los costos de terceros del trabajo, y `contingency` opcional, sólo para renunciar a la reserva con un motivo |
| Policy de recursos        | `pricing-v3-resource-policy/1`                              | Base común, tareas, reglas de perfil, acceso, planes y capacidades; modo `review_only`. Versiones vigentes (2026-10-11): cada precio admite `reviewBy`, una fecha de revisión que avisa y no bloquea. Lecturas (2026-10-11): cada precio admite además `commitmentTermMonths`, los meses que hay que seguir pagando una licencia una vez tomada; no entra a ningún cálculo |
| Puntero de versiones vigentes | `pricing-v3-current/1` (`adapters/current-versions.ts`) | Versiones vigentes (2026-10-11): `data/pricing/v3-operating/current.json` nombra catálogo, policy y catálogo de créditos por ruta, versión y digest; `--current` lo usa y `current show\|set` lo lee y lo reemplaza |
| Fechas de los precios     | `resources/price-review.ts`                                 | Versiones vigentes (2026-10-11): lectura derivada de qué fechas de revisión pasaron, cuáles vencen pronto y qué vigencias ya terminaron; no cambia ningún precio ni resultado |
| Demanda compuesta         | `pricing-v3-composition-demand/1`                           | Brief, trabajo, usuarios, tareas, IA, allocations, presupuestos y cobertura cliente. Asientos y opciones (2026-10-11, claves opcionales, misma versión): `periodIds` en vez de `periodId`, `idleSeats`, `idleReason` y `bornByLineIds` en una asignación, y `seatSharing` |
| Plan                      | `pricing-v3-operating-plan/1`                               | Demanda y portfolio opcional; produce demanda resuelta sin elegir reparto arbitrario           |
| Portfolio                 | `pricing-v3-resource-portfolio/1`                           | Capacidad de clientes, interna y sin asignar; genera allocations y reconciliación              |
| Créditos                  | `pricing-v3-credit-catalog/1`, `pricing-v3-credit-budget/1` | Suscripción, paquetes y demanda por proveedor; presupuesto, caja y remanente                   |
| Mantenimiento monetario   | `pricing-v3-catalog-change/1`                               | Add/replace/retire y dimensiones nuevas; preview con impacto y sucesor con audit               |
| Mantenimiento de recursos | `pricing-v3-resource-change/1`                              | Replacement completo `policy` o `credits`; preview con impacto y sucesor nuevo                 |
| Composición congelada     | `pricing-v3-resource-composition/1`                         | Catálogo, policy, créditos, demanda y resultado completos; digest y replay verificable         |
| Preview                   | `pricing-v3-composition-preview/1`                          | Proyección local de precio, calendario e impuestos; no una cotización emitida                  |
| Resumen de composición    | `pricing-v3-composition-summary/1`                          | Lectura derivada del resultado congelado: bloqueos, señales, piso y caja; no decide nada. Motor 1.1 (aditivo): `engineVersion`, `commercialAdjustments`, `priceRounding`. Motor 1.2 (aditivo): `marketFactor` cuando el factor elegido cambia algo, y `floorNet` y `netShortOfFloor` por línea marcada. Versiones vigentes (2026-10-11, aditivo): `estimateExposure`; la CLI agrega además `runNotices`, que describe la corrida y no viene del resultado congelado. Motor 1.3 (aditivo): bloque `engagementForm` y `totals.engagementAdjustment`, sólo cuando el pedido declara la forma. Motor 1.4 (aditivo): bloques `ownWork`, `thirdParty` y `contingencyReserve`, sólo en una cotización 1.4.0 |
| Lecturas de una cotización congelada | `pricing-v3-price-split/1`, `pricing-v3-payment-schedule/1`, `pricing-v3-engagement-cash/1`, `pricing-v3-commitment-exposure/1` | Lecturas (2026-10-11): persona y kit, calendario de pagos, lectura de caja y compromisos con proveedores. Verifican el artefacto por replay y no cambian ningún total. Motor 1.4: las cuatro reconocen las filas de terceros y la reserva. Asientos y opciones (2026-10-11): compromisos lista los asientos ociosos declarados (`kind: "idle_seat"`) |
| Documento de cotización   | `pricing-v3-quote-document-brief/1`, `pricing-v3-quote-document-scaffold/1` (`resources/quote-document.ts`) | Documento (2026-10-11): recibe un artefacto congelado y un brief de textos; devuelve la versión 2 de los datos de la plantilla A4 de cotización, o el andamio del brief si no se entrega uno. Verifica el artefacto por replay, toma toda cifra de la cotización y no cambia ningún total. Asientos y opciones (2026-10-11): recibe además la cotización congelada de cada opción adicional (`--option`), y el brief admite `options`, `optionsTexts` y `lines.<clave>.courtesy` |
| Rechazos                  | `errors.ts`, `PricingV3Error`                               | Registro cerrado de códigos de dominio y adaptador; el detalle sólo nombra opción o ruta       |
| Registro de motores       | `PRICING_V3_ENGINES` en `schemas.ts`                        | Contrato de entrada → motor que firma: `1.0.0` → `pricing-v3-local/1.0.0`, `1.1.0` → `pricing-v3-local/1.1.0`, `1.2.0` → `pricing-v3-local/1.2.0` (motor 1.2), `1.3.0` → `pricing-v3-local/1.3.0` (motor 1.3), `1.4.0` → `pricing-v3-local/1.4.0` (motor 1.4); cada uno con su `precisionPolicy` |
| Guarda de artefactos      | `__tests__/pricing-v3-frozen-artifacts.test.ts`             | Reproduce cada `*.artifact.json` bajo `data/pricing/**` y los dos del caso SKY versionados; exige uno firmado por cada motor registrado |

Fuentes ejecutables: [dominio](../../../src/lib/finance/pricing-v3/),
[CLI](../../../scripts/commercial/pricing-v3.ts), [fixtures operativas](../../../data/pricing/v3-operating/README.md).
Versiones de reproducción: motor `pricing-v3-local/1.0.0`, desde el motor 1.1 también `pricing-v3-local/1.1.0` desde el motor 1.2 también `pricing-v3-local/1.2.0` desde el motor 1.3 también `pricing-v3-local/1.3.0` y desde el motor 1.4 también `pricing-v3-local/1.4.0` (cada artefacto se reproduce con el que lo firmó; `ENGINE_VERSION` ya no existe), artefacto de snapshot `pricing-v3-local-artifact/1`, quote de catálogo `pricing-v3-selection-quote/1` y composición `pricing-v3-resource-composition/1`. Las tres versiones de artefacto no cambiaron.
Las propiedades desconocidas de los inputs estrictos se rechazan. Versiones o hashes incompatibles no se
reinterpretan con la versión más reciente.

## Del pedido al precio

El agente interpreta el pedido y el alcance. El dominio resuelve IDs, valida selecciones y calcula.
`scaffold` prepara una demanda editable y preguntas: no adivina plan, divisor, usuarios reales o presupuesto IA.
Los IDs `planned-*` representan capacidad por confirmar. `plan` incorpora el reparto de la cuenta declarada;
`compose quote` congela la demanda y las tres fuentes. `explain` y `replay` usan esa evidencia congelada.

Un perfil mantiene su variante, seniority y tier. Implementador, desarrollador, consultor HubSpot y consultor
premium conservan costos separados. La tarea SEO de un Copywriter añade SEMrush sin cambiarlo por un SEO
Specialist. El tier selecciona una política de precio; no convierte un perfil especializado en IP propietaria.

El país del talento define localización del costo; el mercado de oferta ajusta el precio humano. Son dimensiones
independientes de moneda y FX. `specific` usa costo del país y no recibe un segundo factor salarial.
`reference_adjusted` exige un factor desde el país de referencia. Histórico sin país sólo se admite bajo la
opción explícita de simulación; no constituye una remuneración colombiana, peruana o chilena vigente.

Motor 1.2 (2026-10-11): hasta `catalog.review-v4` ningún costo declaraba país y todos los factores de mercado valían
1, así que el país de la persona sólo producía un supuesto y el del cliente sólo cambiaba moneda y redondeo. En
`catalog.review-v5` las dos dimensiones tienen valores. Los 32 costos del workbook son `reference_adjusted` con
referencia Chile, y `talentCountry` los multiplica por el registro `talent_factor` de ese país: mueve el costo y,
con él, el precio. `offerMarketCountry` selecciona el `market_factor` del país del cliente, que multiplica sólo el
precio del componente humano. Un costo `specific` de un país reemplaza al factor de talento para ese perfil. Sin
factor para el país de la persona la cotización queda `needs_input`. Cómo componen los dos ejes:
[contrato 1.2.0](cotizador-v3-contrato-y-validacion.md#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11).

## Cuenta económica y calendario

Se opera con cadenas decimales, decimal.js y precisión 80. Una tasa `"0.30"` significa 30%; markup y margen
objetivo son métodos diferentes. Las fórmulas pertenecen a [`calculate.ts`](../../../src/lib/finance/pricing-v3/calculate.ts); calendario/caja del catálogo a [`catalog/quote.ts`](../../../src/lib/finance/pricing-v3/catalog/quote.ts):

- Costo humano mensual = costo base × FTE facturable × personas × factor de talento aplicable × FX a moneda de cálculo.
- FTE solicitado = FTE explícito, o horas / horas por FTE de la política. Shared respeta su mínimo facturable;
  dedicated absorbe su FTE comprometido. Part time no implica shared ni licencia a media tarifa.
- Con markup, multiplicador = `1 + tasa`; con margen objetivo, `1 / (1 - tasa)`.
- Precio humano = costo humano × multiplicador × factor de mercado. Recursos elegibles reciben la política
  de precio cuando `basis=all_costs`; con `human_only` conservan costo como precio. El factor de mercado del contrato local se aplica al humano, no a todas las tools.
- Margen final = `(neto - costo) / neto`, después de descuento. Neto cero deja tasa de margen `null`.

Cada mes tiene resultado propio. `activePeriods` y `dedicationByPeriod` modelan activaciones y dedicación;
asignaciones de recursos indican meses específicos. El salario y políticas no se reprecian automáticamente
por mes. `uniformMonthlyNet=null` cuando el calendario no es uniforme. Setup se cobra una vez según su alcance.
Month/year/once distinguen recurrencia y pago; anual/12 es devengo, el compromiso anual se ve en `cashLedger`.
Variar una asignación anual o reactivarla tras pausa exige política, sin inventar cancelación o reembolso.

HALF_UP redondea cada línea a la precisión de su moneda; el total suma esas líneas. El único descuento global
se distribuye por base elegible con residual por mayor resto y desempate por `lineId`. No hay redondeo comercial
adicional ni cadena arbitraria de ajustes. Fee genérico de contratación/pagos, Assurance, gestión y setup son
recursos/coberturas explícitos: no porcentajes laborales o reservas escondidas ni una dependencia del nombre Deel.

Motor 1.1 (2026-10-10): el párrafo anterior describe el contrato 1.0.0, que sigue igual. En el contrato 1.1.0 sí hay
redondeo comercial y varios ajustes. Cada fila facturable con precio mayor que cero se eleva al múltiplo de la regla
`price_rounding` vigente para la moneda de salida, antes de los ajustes y nunca hacia abajo; una fila que cumplía su
piso antes de redondear lo sigue cumpliendo. Los ajustes son hasta 10, `discount` por tasa o `agreed_net` (neto
pactado por período; el motor deriva `discount` o `uplift` y llega al monto exacto), y cada fila recibe a lo más uno:
sigue sin haber cadena de ajustes sobre una misma fila. Margen final = `(neto − costo) / neto` sobre el neto después
de redondeo, descuento y recargo. Detalle: [contrato 1.1.0](cotizador-v3-contrato-y-validacion.md#contrato-110--ajustes-comerciales-y-redondeo-2026-10-10).

Motor 1.2 (2026-10-11): las fórmulas de costo, precio y margen no cambian. Cambia contra qué se compara el piso
cuando el factor de mercado elegido declara `floorBasis: "base_market"` y es menor que 1. Cada fila calcula
`ρ` = su precio de política con el factor ÷ su precio con factor 1 (ambos a la precisión de la moneda, antes del
redondeo comercial) y su piso pasa a ser `floorNet = costo × ρ / (1 − minimumMargin)`, elevado a la unidad de la
moneda. El kernel marca la fila cuando el neto final es menor que `floorNet`. Sin componente humano, con factor 1 o
mayor, o sin `floorBasis`, `ρ = 1` y el control es el de 1.1.0. El margen final sigue siendo `(neto − costo) / neto`:
en un mercado con factor menor que 1 puede quedar bajo el mínimo de la política sin que ninguna línea esté marcada.
Detalle: [contrato 1.2.0](cotizador-v3-contrato-y-validacion.md#contrato-120--el-piso-acompaña-al-factor-de-mercado-2026-10-11).

Motor 1.3 (2026-10-11): cuando el pedido declara la forma del trabajo, el precio de cada componente de la fila
—persona, fee, provisiones y herramientas— se multiplica por la razón de esa forma, después de la política de precio
y del factor de mercado y antes del redondeo comercial y de los ajustes. El costo no cambia y el piso tampoco:
`floorNet` es el de la misma fila cotizada sin forma. Cuando el factor de mercado lee su piso sobre el mercado base
(Colombia, Perú), el precio del mercado base se toma bajo la misma forma, así que `marketAdjustment`,
`marketPriceRatio` y `floorNet` son los mismos con forma y sin ella. El margen final sigue siendo
`(neto − costo) / neto`. Detalle:
[contrato 1.3.0](cotizador-v3-contrato-y-validacion.md#contrato-130--la-forma-del-trabajo-como-dato-propio-2026-10-11).

Motor 1.4 (2026-10-11): dos componentes de costo nuevos. La reserva de contingencia es un costo de cada fila del
equipo, `base × tasa` (hoy, el costo de las personas de la fila por 0,12); entra al precio por la política de precio
y por la razón de la forma como cualquier otro costo, y sube `floorNet`. Cada costo de terceros refacturado es una
fila propia de tipo `third_party`: su costo es `importe × cantidad` del proveedor en la moneda de salida, su precio
sale de la regla de su categoría y su piso es el de esa regla; no recibe factor de mercado, razón de la forma ni
descuento por tasa. El margen final sigue siendo `(neto − costo) / neto` sobre todo, terceros incluidos, y los
totales agregan el margen del trabajo propio, que es la misma cuenta sin las filas de terceros. Detalle:
[contrato 1.4.0](cotizador-v3-contrato-y-validacion.md#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11).

FX conserva par, tasa, fecha, fuente e IDs; convertir exige la dirección seleccionada, sin invertir o cruzar
automáticamente. La referencia EUR→USD de la fixture operativa es 1.1206 al 09-10-2026; permite simular Magnific,
no fija una tasa contractual. Impuestos pueden quedar pendientes con `tax=null` y `grandTotal=null`, no cero.
El kernel no infiere obligaciones fiscales por país.

Motor 1.1 (2026-10-10): en `catalog.review-v4.json` el tipo de cambio de cotización es un valor de política decidido
por el operador, con USD como moneda de referencia y un margen prudencial sobre el spot; no es una tasa observada ni
contractual. La referencia EUR→USD sigue fechada sólo el 2026-10-09: una cotización posterior que necesite EUR no
tiene tasa vigente. USD→CLF sigue siendo un valor estimado de 2025.

Versiones vigentes (2026-10-11): el catálogo v6 cierra ese hueco para las herramientas que se pagan en EUR. Agrega
una tasa de cotización EUR→USD de 1,20, sin fecha de término y marcada como estimada (la referencia del BCE era
1,1206). La eligió el agente aplicando la instrucción del operador de usar un margen prudencial sobre el spot; el
operador no la decidió expresamente para EUR. Con ella el catálogo tiene una tasa EUR→USD vigente en cualquier fecha
posterior; la demanda que la necesita, por ejemplo por Magnific, la nombra en `fxRecordIds` (registro `fx:EUR:USD`).
Lo que sigue faltando es el camino inverso: no hay tasa USD→EUR ni regla de redondeo para EUR, así que una
cotización con salida en EUR queda `needs_input` (`MISSING_CATALOG_SELECTION` en `fx.USD:EUR`). La referencia del BCE
anterior sigue apareciendo como vencida en `resources inspect`; es un pendiente conocido.

Lecturas (2026-10-11): el catálogo v9 agrega la tasa CLP→USD, 0,001, que es la inversa del tipo de cambio de
cotización que el CEO mantiene en 1.000 CLP por USD. Existe para que un costo facturado en pesos —hoy, Adobe— entre al
cálculo y vuelva a una cotización en CLP por el mismo importe. Igual que con una herramienta en EUR, la demanda que
usa una herramienta con precio en CLP nombra esa tasa en `fxRecordIds` (registro `fx:CLP:USD`); si falta, la
cotización queda `needs_input` con `RESOURCE_FX_SELECTION_REQUIRED`. Es un valor de política que debe moverse junto
con USD→CLP.

## Herramientas, personas y servicio

La selección combina Notion/Microsoft 365 comunes, tareas de perfil y tareas adicionales, IA explícita y
`serviceToolIds`. Una tool desconocida o un plan pendiente bloquea; no se sustituye por la opción barata.
Cada elección conserva razón y fuente. Las 32 reglas iniciales son revisables: alcance WordPress, plugins,
stock, publicación, video, UX, automatización o IA requiere evaluación específica.

`assigneeIds` identifica usuarios únicos: dos filas del mismo usuario no crean dos seats. `allocations` declara
por tool, mes y plan `priceId`, cantidad, cuota, driver, motivo y, cuando aplica, capacidad y seats contractuales.
Los nominativos requieren cantidad entera; seat por usuario no se convierte en pool en el portfolio.
Un paquete nominativo exige capacidad suficiente. Mínimos de contratación se mantienen separados de los
usuarios atribuidos a la cuenta. Ningún reparto de costo permite compartir credenciales ni prueba acceso real.

Asientos y opciones (2026-10-11): hasta ese día una herramienta admitía una sola asignación por mes y una
herramienta con precio por asiento exigía exactamente tantos asientos como personas. Ya no: una herramienta puede
tener varios planes en un mes, un asiento pagado puede declararse ocioso y varias personas pueden declarar que usan
un mismo asiento. Lo que se exige ahora es que cada asiento pagado quede explicado
([Asientos como se compran](#asientos-como-se-compran-y-períodos-declarados-una-vez-2026-10-11)). Que dos personas
usen un asiento es una declaración con su motivo sobre el uso, no un permiso para compartir una cuenta: si el
proveedor lo permite se confirma fuera del cotizador.

Hasta la policy v6, Adobe figuraba como un solo paquete: 180 USD/mes por 3 CC Teams+3 Express, declarado por el
operador, con 306 USD como escenario de un alza de 70 % sin fecha. Esos dos importes ya no son los vigentes.

Lecturas (2026-10-11): desde la policy v7 Adobe está cargado tal como se factura, a partir de la factura que mostró
el CEO, y son **dos productos**, no un paquete:

- **Adobe Creative Cloud Pro** (`adobe`): 3 licencias, CLP 162.605 al mes facturados con 50 % de descuento. Lo usan
  los diseñadores (tareas de diseño visual y edición de video) y ya incluye Adobe Express.
- **Adobe Express** (`adobe-express`): 3 licencias, CLP 16.240 al mes. Lo usan los perfiles de contenido (Social
  Media Manager, Community Manager, Content Manager y Content Creator), confirmados por el CEO.

Los importes son los totales de la factura **con IVA**, por decisión del CEO: el impuesto se recupera, pero no mes a
mes. Una licencia de tres es un tercio del paquete (CLP 54.202 al mes del importe facturado en Creative Cloud Pro,
CLP 108.468,5 del precio sin descuento); atribuirle el paquete
entero a una sola persona sobrestima sus herramientas. Un diseñador con Creative Cloud Pro y un community manager con
Adobe Express en la misma cotización son un equipo mixto normal; lo que se rechaza (`BUNDLED_TOOL_DOUBLE_COUNT`) es
que la **misma** persona o línea lleve el plan y además un producto que el plan ya incluye. El descuento de Creative
Cloud Pro termina pronto, y desde la policy v10, por decisión del CEO, una cotización nueva lo toma **sin
descuento**: el precio `current` es CLP 325.405,5 al mes por las tres licencias, el precio de lista de la factura,
y es un valor decidido (confirmado desde la policy v11), no un dato a la espera de otra factura. El importe facturado queda como `invoiced-with-discount`, sólo para un trabajo que
termina antes que el descuento y sólo si el operador lo elige. Una licencia de Adobe se paga mes a mes pero se sigue
cobrando hasta que el contrato anual se renueva, el 2026-11-16. Qué significa cada cosa
al cotizar: [selección de herramientas](cotizador-v3-seleccion-herramientas.md#adobe-dos-productos-y-quién-usa-cada-uno-2026-10-11)
y [provisiones y costos](cotizador-v3-provisiones-y-costos.md#adobe-tal-como-se-factura-y-el-plazo-del-contrato-2026-10-11).
Fuentes de precio y fechas de revisión son datos de selección, no garantía contractual futura.

Versiones vigentes (2026-10-11): un precio unitario no vence. Por decisión del operador (CEO), el precio de una
licencia es estable —en sus palabras, Notion o Microsoft 365 no cambian su precio—; lo que cambia es cuántas
licencias se contratan, y esa cantidad se declara en cada cotización. Hasta la policy `resources.review-v5` cada
precio de herramienta tenía una fecha de término cercana (casi todos, 30 días después de su evidencia) y una
cotización con fecha posterior quedaba bloqueada con `RESOURCE_PRICE_NOT_EFFECTIVE`. En la policy v6 los 25 precios
con importe propio valen hasta que se reemplacen y cada uno lleva una fecha de revisión, `reviewBy`, hoy el
2027-04-11. Esa fecha la eligió el agente (seis meses), no el operador. Pasada la fecha, la cotización se calcula
igual y el resumen lo avisa; el precio sólo cambia cuando se emite una versión nueva de la policy. La mayoría sigue
siendo precio de lista público marcado como estimado: que no venza no significa que esté confirmado. Cómo se revisan:
[mantenimiento](cotizador-v3-mantenimiento-catalogo.md#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11).

`role_capacity` mantiene funciones como unidad de la simulación. `managed_service` usa las mismas funciones
como costo interno y proyecta un fee por periodo más implementación. No convierte una suma de roles en SOW:
entregables, aceptación, cadencia, límites, responsabilidades y continuidad requieren validación de la práctica.
El preview del servicio omite perfiles, horas, headcount y países de talento.

`clientProvidedTools` identifica tool/mes/líneas, razón y evidencia confirmada para toda la ventana de uso.
Se omite costo Efeonce únicamente en las líneas cubiertas y queda motivo `client-provided`. Base común y tools
de créditos no se sustituyen con esta excepción. Duplicados, líneas desconocidas, evidencia insuficiente o
allocations que quedaron sin uso bloquean. Esto modela una cobertura declarada; no verifica un tenant del cliente.

## Reparto de pools y plataforma

El portfolio reconcilia exactamente `totalUnits = clientes + internalUnits + unallocatedUnits`. La cuota de
cada cuenta deriva de unidades/total, a 18 decimales con residual explícito. Con catálogo y fecha devuelve costo
mensual en moneda original, incluyendo interno y sin asignar. Capacidad insuficiente o duplicada deja pendientes.
Un plan no mezcla una allocation manual y otra derivada para la misma tool/mes.

Vercel y GCP usan el driver declarado por recurso; el rango Vercel 60–100 no se vuelve una cifra exacta sin
selección. No se inventa cartera, número de clientes ni ocupación. El ejemplo Adobe 160 unidades/40 cliente/80 interno/
40 sin asignar producía 45/90/45 USD con el paquete de 180 USD; con el precio de la policy v7 (corrida del
2026-10-11, importe facturado con descuento) produce CLP 40.651,25/81.302,5/40.651,25, que suman los 162.605 de
Creative Cloud Pro: hipótesis, no
distribución de Efeonce. Dentro de una cuenta, los recursos se
distribuyen por usuarios únicos; créditos por demanda. El motor no pondera internamente esas líneas por horas.

## IA: presupuesto atribuido frente a pago adicional

Higgsfield 139 USD/3000 créditos y Magnific 40 EUR/45000 créditos mensuales son bases declaradas. Costo de base
atribuido = cuota × créditos base asignados / incluidos. Déficit = demanda agregada − créditos base asignados.
El [planner](../../../src/lib/finance/pricing-v3/resources/credit-budget.ts) minimiza costo de packs enteros que cubren el déficit; no usa el costo medio de la suscripción como
precio del extra. Default permite una unidad de cada pack distinto; repetición requiere `allowRepeatedPacks`.

El compositor agrega demanda por proveedor/mes, compra el presupuesto de packs una vez y distribuye su costo
por consumo. Expone créditos adquiridos, remanente y caja extra; el coste completo del pack permanece atribuido,
sin monetizar un remanente futuro. Bases asignadas no pueden superar disponibilidad ni demanda, y la disponibilidad
declarada no supera la suscripción. Normales requieren ventana mensual compatible; suscripción activa cuando aplica.

Caducidad extra: 90 días Higgsfield, 3 años Magnific según capturas; cutoff date-only exclusivo y aniversario UTC
con ajuste de año bisiesto. No implica vigencia de promoción ni saldo live. Compra, impuestos, reservas,
auto-refill y reutilización de remanentes siguen fuera. Créditos de proveedores distintos no son intercambiables.
Los 30 USD de créditos Notion facturados se modelan como presupuesto separado, no como pack del planner Higgsfield/Magnific.
[Paquetes y algoritmos observables](cotizador-v3-creditos-ia.md).

## Fuentes, mantenimiento y reproducción

El catálogo operativo incorpora 32 perfiles y 25 tools históricas más nuevos recursos; las 26 filas originales
incluyen ETG-017, fee genérico separado. Factura, operador, referencia pública, histórico y estimado se conservan
distintos. Notion tiene factura 9 Business×24 USD más 30 USD por 3000 créditos para 21-09–21-10, cutoff 20-10 inclusivo;
facturado no significa pagado. Microsoft 365, SEMrush, ChatGPT y Claude tienen variantes públicas explícitas;
no prueban plan, número de usuarios ni gasto actual de Efeonce. Ventana interna de revisión no es promesa de precio.

Versiones vigentes (2026-10-11): los costos de persona del catálogo son un **costo objetivo**, no lo que Efeonce
paga hoy. Vienen del Excel de pricing y representan el nivel salarial al que el CEO quiere llevar al equipo; por
decisión suya el cotizador no usa la nómina real, que hoy es más baja. La consecuencia es que el margen real actual
sobre las personas es mayor que el que muestra una cotización. Conectar la nómina real no es una mejora pendiente.
[Explicación completa](cotizador-v3-provisiones-y-costos.md#la-base-de-costo-de-las-personas-es-un-costo-objetivo-2026-10-11).

Mantenimiento monetario y de recursos son carriles distintos. Preview valida schema/referencias/base, calcula
impactos y digest; apply reconstruye el mismo contexto/impacto y exige ese digest. Un cambio confirmado de importe
no hereda evidencia vieja. Change-set monetario retiene actor/audit; cambio de policy/créditos conserva reason y
preview y exige nueva versión completa. Ninguno activa automáticamente un archivo, compra, reajusta contratos
o modifica artefactos. Elegir sucesor requiere rutas explícitas. El CLI sin `--catalog` conserva review-v1.

Versiones vigentes (2026-10-11): ya no hace falta escribir las rutas a mano para usar lo vigente. Un puntero,
`data/pricing/v3-operating/current.json`, nombra el catálogo, la policy y el catálogo de créditos vigentes, cada uno
con su ruta, versión y digest (la huella de su contenido). Con `--current`, la CLI toma de ahí cada fuente que no
pasaste; si pasas una ruta explícita, gana la ruta. Antes de usar el puntero lo comprueba contra los archivos: si la
versión o el digest no coinciden, rechaza con `CURRENT_VERSIONS_MISMATCH` en vez de seguirlo. Sin `--current` todo
sigue como antes: sin `--catalog` se lee review-v1 y `--policy` y `--credits` son obligatorios. Qué nombra el puntero
lo imprime `pnpm --silent pricing:v3 current show`, y esa es la fuente: este documento no lo repite como vigente.
Como dato fechado, al cierre del 2026-10-11 el comando respondía `catalog.review-v9.json`, `resources.review-v10.json`
y `ai-credits.review-v1.json` (más temprano ese día, tras la oferta SEO/AEO, catálogo v8 y policy v6; por la noche, tras el motor 1.4, `catalog.review-v10.json` con la misma policy v10). Emitir una versión nueva no mueve el puntero: es un paso
aparte. [Cómo se mueve](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).

Un artefacto de composición congela catálogo, policy, créditos, demanda y resultado; `createdAt` queda fuera
del digest semántico. Replay verifica integridad y vuelve a calcular con la versión soportada disponible.
Explicación, comparación y nuevas versiones preservan lo anterior; no siguen punteros a precios actuales.
Eso vale también para el puntero de versiones vigentes: sólo se consulta al cotizar con `--current`. Un artefacto ya
congelado lleva sus tres fuentes dentro y nunca lo sigue; por eso las versiones anteriores no se borran ni se editan.
El presupuesto IA separado posee su propio formato: no es una quote válida para replay.
[Mantenimiento completo](cotizador-v3-mantenimiento-catalogo.md).

## Evaluación, salidas y límites

`compose assess` separa completitud matemática de evidencia: salario localizado, provisiones medidas,
suscripciones/acceso/capacidad reales, asignación simulada, impuestos/entidad, SOW y autorización comercial.
Siempre devuelve revisión. 40% objetivo/35% piso son propuesta, `approved=false`; no reemplazan la policy elegida ni pisos vigentes de la práctica. Creative Practice conserva 45% bruto aprobado; la práctica SEO/AEO tiene el mismo piso de 45% y, desde el 2026-10-11, su propia oferta con objetivo 55%; y desde esa fecha una persona vendida por dedicación (staff augmentation) tiene piso de 25%. Los tres los decidió el CEO: el aviso genérico de `assess` no certifica esos pisos ni permite una excepción. El agente debe calcular y verificar el piso de la oferta correspondiente.
TrialAssurance 25/operación 25/setup 100 permanecen recursos de prueba, no estándares de Talent Assurance.
Lecturas (2026-10-11): el setup de 100 USD dejó de seleccionarse desde esa fecha (catálogo v9). Lo reemplazan dos
provisiones de puesta en marcha con costo propio, todavía estimadas
([provisiones y costos](cotizador-v3-provisiones-y-costos.md#puesta-en-marcha-onboarding-por-persona-y-reclutamiento-opcional-2026-10-11));
una cotización con fecha anterior lo sigue resolviendo.

Delta 2026-10-10: `assess` ya reporta el piso de la política de precio seleccionada, sin recalcularlo. Agrega una
brecha `MARGIN_BELOW_POLICY_FLOOR` (owner Commercial/Finance) por cada línea que el kernel marcó
`MARGIN_BELOW_FLOOR`, y `margin.policyFloor.linesBelowFloor` con neto, margen, `marginRateRoundedDown` y
`marginAmountShortOfFloor` de cada una. `proposedTarget`/`proposedFloor` no cambian. El veredicto vale sólo si la
oferta elegida codifica el piso de su práctica: con `creative-managed-service` (objetivo y mínimo 0,45) lo hace, y
desde el catálogo v8 también `seo-aeo-managed-service` (práctica SEO/AEO: objetivo 0,55, mínimo 0,45); una
política con mínimo 0 no marca nada y `assess` no suple esa verificación (desde el catálogo v7 del 2026-10-11
`talent-assurance-staffing`, la persona por dedicación, también codifica el suyo: mínimo 0,25; sólo los catálogos
anteriores la dejan en mínimo 0). Con objetivo igual al mínimo, costo y precio
se redondean a CLP enteros por separado y una línea al piso puede quedar bajo él por menos de 1 CLP: el kernel la
marca y nunca sube el precio. En el ejemplo `managed-care.*` las seis líneas quedan cortas por 0,1 a 0,5 CLP;
`marginAmountShortOfFloor` distingue esa brecha de redondeo de un incumplimiento real.

Motor 1.1 (2026-10-10): lo anterior es el contrato 1.0.0 (el ejemplo con `catalog.review-v3`). Con una regla de
redondeo vigente, el contrato 1.1.0 conserva el piso de toda fila que lo cumplía antes de redondear: el mismo ejemplo
con `catalog.review-v4` no marca ninguna línea. `assess` no cambió; sigue leyendo sólo `MARGIN_BELOW_FLOOR`.

Motor 1.2 (2026-10-11): `assess` sigue leyendo sólo `MARGIN_BELOW_FLOOR` y el texto de su brecha no cambió. Agrega
`margin.policyFloor.marketFactor` cuando el factor elegido no es neutral, y cada entrada de `linesBelowFloor` de una
fila 1.2.0 trae `floorNet` y `netShortOfFloor`. `modeledRate` es el margen real: con un factor de mercado cuyo piso
acompaña al mercado base puede estar bajo el mínimo de la política con `linesBelowFloor` vacío. `proposedTarget` y
`proposedFloor` siguen siendo la propuesta genérica y no conocen el factor de mercado.

Versiones vigentes (2026-10-11): `assess` agrega `costEvidencePriority`, el orden en que conviene confirmar los
datos estimados del costo. Trae `currency`, `estimatedCost`, `confirmedCost`, `estimatedShareOfCost` y
`confirmFirst`, que son los cinco primeros datos del mismo ranking que el resumen publica en `estimateExposure`. No
es una brecha nueva ni cambia el estado: es una lectura para priorizar. Pendiente conocido: `assess` todavía no
lista como brecha propia que un factor de país sea estimado; hoy eso se ve en `reviewSignals` (`ESTIMATED_SOURCE`) y
en este ranking. Nota del motor 1.4: ese pendiente perdió su objeto. El CEO dejó cerrados los factores de país el
2026-10-11 y el catálogo v10 los registra como valores de política confirmados desde el 2026-10-12; una cotización
con fecha desde ese día ya no los reporta como estimados.

Motor 1.4 (2026-10-11): `assess` lee el piso propuesto sobre el trabajo propio. `margin` agrega `ownWorkRate` y
`proposedFloorReadOn: "ownWorkRate"`, y `belowProposedFloor` se evalúa sobre ese margen, no sobre el mezclado;
`modeledRate` sigue siendo el margen real de toda la cotización. En el ejemplo con terceros: `modeledRate` 0,2987,
`ownWorkRate` 0,5016 y `belowProposedFloor: false`. El 40 %/35 % sigue siendo la propuesta genérica sin aprobar. Hay
brechas nuevas, todas de revisión: `THIRD_PARTY_COST_EVIDENCE_REQUIRED` (el importe de un costo refacturado descansa
en evidencia sin confirmar), `THIRD_PARTY_FX_EXPOSURE` (el proveedor cobra en otra moneda que la cotización),
`THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED` (siempre que hay terceros: qué cubre cada costo, quién contrata, plazos de
pago, derechos de uso y qué cuesta cancelar), `THIRD_PARTY_TAX_TREATMENT_REVIEW` (sólo con impuesto `exclusive` y un
costo refacturado) y `CONTINGENCY_RESERVE_WAIVED` (la reserva se renunció). En el ejemplo aparecen las tres
primeras: el talento en USD, los medios con evidencia estimada y la de alcance y condiciones. En
`costEvidencePriority`, la cotización de un proveedor es un dato más del ranking: en el ejemplo el primero es la
inversión en medios, con 22,6 % del costo y 1,6 puntos de margen en juego.

`compose preview` admite simulación calculada en revisión y entrega JSON/Markdown con allowlist. Excluye
costos, margen, IDs/fuentes privados, providers, drivers y países de talento. No autoriza publicación o envío.
Desde el 2026-10-10, en `managed_service` los importes derivados (fee del período e implementación) conservan la
escala con que el kernel formateó la moneda: CLP mostraba `9508946.00` en la línea y `9508946` en el total.
`export` conserva el gate propio de cálculo completo dentro de policy; los ejemplos de composición en revisión
no lo evaden mediante preview. Ninguna salida crea quote canónica, aprobación, documento emitido o CRM write.
Documento (2026-10-11): `compose preview` sigue siendo la proyección para revisar. El documento que lee el cliente
lo produce `compose document` sobre esa misma proyección, sin agregar cifras propias, y sale como borrador
([El documento de cotización para el cliente](#el-documento-de-cotización-para-el-cliente-2026-10-11)).

CLI: JSON limpio por stdout con `pnpm --silent`; exit 0 técnico, exit 2 pendiente, exit 3 cálculo/revisión y exit 1
schema/argumentos/conflicto/adaptador/export rechazado, error sanitizado en stderr. `--out` usa ruta nueva
`wx`/0600; no sobrescribe. Códigos 2/3 exigen leer envelope, no concatenar pasos suponiendo exit 0.
Asientos y opciones (2026-10-11): el `--out` de una cotización (`calculate`, `quote` y `compose prepare|quote`)
guarda una cotización calculada o no guarda nada. Hasta ese día una corrida bloqueada escribía igual su artefacto, y
la corrida corregida chocaba con `OUTPUT_EXISTS` contra un archivo que nunca fue una cotización. Detalle en el delta
del mismo nombre, más abajo.

Delta 2026-10-10, qué imprime cada comando. Códigos de salida, flags, digests y el escritor `wx`/0600 no cambian.

- `compose prepare` y `compose quote` imprimen el resumen `pricing-v3-composition-summary/1`
  ([`resources/summary.ts`](../../../src/lib/finance/pricing-v3/resources/summary.ts)), no el resultado completo.
  `quote` incluye `replayDigest`; `prepare` no. El resultado completo existe sólo en el artefacto escrito con `--out`
  (bajo `semantic.result`) y se lee con `explain`, que no cambia. `prepare|quote` del carril de catálogo y `calculate`
  del kernel tampoco cambian.
- `replay` de un artefacto de composición imprime `{ verified, calculationId, summary }`; los artefactos de snapshot y
  de quote de catálogo conservan `{ verified, calculationId, result }`.
- El resumen sólo cuenta, agrupa y formatea. `diagnostics` trae los bloqueos completos (no vacío implica `totals` nulo
  y `needs_input`); `reviewSignals` agrupa todo diagnóstico de período por código y severidad con conteo, períodos,
  líneas y rutas; `marginFloor.lines` lista las líneas que el kernel marcó bajo su piso; `toolSelections` separa
  incluidas, aportadas por el cliente y excluidas con motivo, y sólo cuenta las no requeridas; `attributions`,
  `creditBudgets`, `resourceIncrementalCash`, `cashLedger` y `cashMeaning` mantienen separados costo atribuido y caja.
  `marginRateRoundedDown` es la tasa a 6 decimales redondeada hacia abajo; `totals.marginRate` conserva la exacta.
- Medido en `managed-care.*` (`catalog.review-v3` + `resources.review-v5`): stdout de `compose quote` pasó de 196 KB a
  unos 15 KB; con 12 períodos el resumen crece cerca de 1,5× y el resultado completo cerca de 8,8×.
- Exit 1 reporta en stderr `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`. `code` sale
  del [registro cerrado](../../../src/lib/finance/pricing-v3/errors.ts) de `PricingV3Error`, sin lista propia en la
  CLI; el registro es la fuente y este documento no copia su lista ni su conteo. Un documento que no pasa su schema
  sale como `SCHEMA_INVALID` con hasta 20 `{ path, rule }`. Los códigos de adaptador distinguen `INPUT_NOT_FOUND`,
  `INPUT_NOT_JSON`, `OUTPUT_EXISTS`, `OUTPUT_NOT_WRITABLE` y `UNKNOWN_OPTION`; `MISSING_ARGUMENT`, `INVALID_ARGUMENT`
  e `INVALID_FORMAT` nombran la opción cuando la falla es de una opción. `message` es estático: nunca aparece un valor,
  una ruta de archivo ni el mensaje de un parser o validador. `ADAPTER_FAILURE` significa «caso sin clasificar en el
  adaptador», no «fallo técnico». Antes, diez códigos que el dominio lanzaba salían como `ADAPTER_FAILURE`.
- Un precio realmente acordado se pasa por el motor como el único ajuste de descuento del brief
  (`brief.adjustments[]`, `kind: "discount"`, con `rate`, `lineIds` y `reason`); así el artefacto lleva el neto, el
  margen y el veredicto de piso reales. Decisiones, alternativas descartadas y el primer caso:
  [delta del ADR](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-10--endurecimiento-de-la-cli-errores-tipados-resumen-derivado-y-veredicto-de-piso).
  Corrección del mismo día (motor 1.1): el precio pactado se declara como `agreed_net`, sin calcular una tasa, y el
  brief admite hasta 10 ajustes sobre filas disjuntas. El método de la tasa queda como evidencia del contrato 1.0.0.

Motor 1.1 (2026-10-10), qué imprime cada comando. No hay comandos, flags ni códigos de salida nuevos.

- `compose prepare|quote` y `replay` de una composición: el mismo resumen `pricing-v3-composition-summary/1`, con
  tres claves aditivas. `engineVersion` es el motor del contrato con que se resolvió (`null` si la resolución no
  produjo ningún período); `commercialAdjustments` son los ajustes tal como los declara el brief congelado;
  `priceRounding` es la regla
  aplicada, `{ currency, multiple, scope: "offer" | "general", offerId, recordId, revision, sourceStatus }`, o `null`.
  En una quote 1.1.0, `totals` y los totales por período agregan `roundingAdjustment` y `uplift`; en una 1.0.0 esas
  claves no existen.
- `explain` (catálogo y composición) agrega `commercialAdjustments`: los dos datos anteriores, la identidad
  `net = undiscountedPrice + uplift − discount` y `rows[]` con el recorrido de precio por fila y período
  (`undiscountedPrice`, `roundingAdjustment`, `discount`, `uplift`, `net`; las dos claves nuevas sólo en filas 1.1.0).
- `prepare|quote` del carril de catálogo y `calculate` del kernel entregan el resultado completo como antes, con las
  claves nuevas cuando el contrato es 1.1.0.
- `compare` de dos artefactos de snapshot compara `roundingAdjustment` y `uplift` sólo si ambos lados los traen.
- `catalog search|show` aceptan `--kind price_rounding`.
- `compose preview`, `export` y la proyección cliente no cambian de forma: muestran el neto final, ya redondeado y
  ajustado, y nunca el desglose de redondeo, descuento o recargo.
- Un error de ajuste del kernel (`OVERLAPPING_ADJUSTMENTS`, `INVALID_AGREED_AMOUNT`, `AGREED_NET_WITHOUT_BASE`,
  `INVALID_PRICE_ROUNDING`, `DUPLICATE_ID`) sale en composición como bloqueo en `diagnostics` del resumen, con
  `totals` nulo y exit 2; en `quote` del carril de catálogo queda bajo `periods[].diagnostics` con
  `calculationStatus: needs_input`. `AMBIGUOUS_PRICE_ROUNDING` y un neto de `setup` que no cae en ningún período
  (`AGREED_NET_WITHOUT_BASE`, ruta `adjustments.<adjustmentId>`) son bloqueos de resolución.

Motor 1.2 (2026-10-11), qué imprime cada comando. No hay comandos, flags ni códigos de salida nuevos.

- `compose prepare|quote` y `replay` de una composición: el mismo resumen, con claves aditivas. `marketFactor`
  (`{ country, factor, floorBasis, recordId, revision, sourceStatus }`) aparece en la raíz **sólo** cuando el factor
  de mercado elegido cambia algo: factor distinto de 1 o `floorBasis` declarado. Con el factor neutral la clave no
  existe (no va en `null`), así que el resumen de una cotización anterior conserva sus claves. `floorBasis` es
  `"base_market"` o `null`; un factor mayor que 1 sin base de piso se nombra igual, y esa cotización sigue en 1.1.0.
  `engineVersion` es `pricing-v3-local/1.2.0` cuando el factor elegido declara `floorBasis`. En una quote 1.2.0,
  `totals` y los totales por período agregan `marketAdjustment`.
- `marginFloor.lines[]`: en una fila 1.2.0 cada línea marcada agrega `floorNet` y `netShortOfFloor`
  (`floorNet − net`). Si el piso de esa fila se lee sobre el mercado base (`ρ < 1`), `marginAmountShortOfFloor` es
  `null`: esa cifra sería la del mercado base. Si `ρ = 1` se conserva junto a las dos nuevas. `net`, `marginAmount`
  y `marginRateRoundedDown` son siempre los reales.
- `compose assess`: `margin.policyFloor` agrega `marketFactor` cuando no es neutral; `linesBelowFloor` trae las
  mismas claves nuevas por línea.
- `explain` (catálogo y composición): `commercialAdjustments` agrega `marketFactor` cuando la quote es 1.2.0, la
  identidad suma que `undiscountedPrice − roundingAdjustment − marketAdjustment` es el precio del mercado base, y cada
  fila 1.2.0 de `rows[]` agrega `marketAdjustment`, `marketPriceRatio` y `floorNet`.
- `prepare|quote` del carril de catálogo y `calculate` del kernel entregan el resultado completo, con las claves
  nuevas por fila y en totales cuando el contrato es 1.2.0.
- `compare` de dos artefactos de snapshot compara `marketAdjustment` sólo si ambos lados lo traen.
- `catalog search|show|validate` leen `floorBasis`; `catalog preview|apply` lo llevan en `add` y `replace`, y otro
  valor que no sea `base_market` se rechaza como `SCHEMA_INVALID`.
- `compose preview`, `export` y las proyecciones cliente no cambian: muestran el neto final y nada del ajuste de
  mercado, la razón ni el piso.
- Supuestos y señales: con `catalog.review-v5` y fecha desde el 2026-10-11, `assumptions` ya no trae
  `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` y el costo de la persona ya no sale como `ESTIMATED_SOURCE`; los factores de
  talento y de mercado estimados sí salen como `ESTIMATED_SOURCE` en `reviewSignals`.

Versiones vigentes (2026-10-11), qué imprime cada comando. Hay un comando nuevo (`current`), un interruptor nuevo
(`--current`) y dos códigos de rechazo nuevos; los códigos de salida 0, 1, 2 y 3 significan lo mismo que antes.

- `--current` es un interruptor sin valor. Lo aceptan todas las operaciones que reciben `--catalog`, `--policy` o
  `--credits`: `prepare` y `quote` del carril de catálogo, `catalog search|show|validate|preview|apply`,
  `resources inspect|portfolio|budget|preview|apply` y `compose scaffold|plan|prepare|quote`. Llena sólo las fuentes
  que no pasaste. En `resources budget`, que recibe el catálogo de créditos por `--catalog`, llena ese. `compose
  assess|preview`, `explain`, `replay`, `compare` y `export` no lo aceptan: leen un artefacto que ya lleva sus
  fuentes dentro. La forma recomendada de cotizar pasa a ser:

  ```bash
  pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
  ```

- `current show` imprime el puntero, su `pointerDigest`, el estado de cada fuente (`match`, `version_mismatch`,
  `digest_mismatch`, `invalid` o `unreadable`) y `consistent`. Sale con 0 si las tres coinciden y con 2 si no.
  `current show --input otro.json` revisa un puntero que no es el versionado.
- `current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>` reemplaza el puntero. El
  detalle del candado está en
  [mantenimiento](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).
- `compose prepare|quote`: el resumen agrega `estimateExposure`, que ordena los datos estimados por el costo que
  descansa en cada uno. `replay` de una composición lo imprime igual, porque se deriva del resultado congelado.
- `compose prepare|quote` pueden agregar `runNotices`, con `laterCatalogValues`, `priceDates` o ambos. Describe la
  corrida, no la cotización: no se guarda en el artefacto, `replay` no lo imprime y la clave no existe cuando no hay
  nada que avisar. Nunca bloquea; se informa al operador junto al resultado. Forma de las dos claves:
  [contrato](cotizador-v3-contrato-y-validacion.md#resumen-avisos-de-la-corrida-y-exposición-a-estimados-2026-10-11).
- `resources inspect` agrega `priceReview` (`{ withinDays, reviewDue, dueSoon, expired }`): fechas de revisión ya
  pasadas, fechas que caen en los próximos 30 días y vigencias que ya terminaron. Sólo estas últimas bloquean una
  cotización de esa fecha. Con `--current` incluye además el digest del catálogo de créditos.
- `compose assess` agrega `costEvidencePriority`, descrito en la sección de evaluación.
- `compose split --input <artefacto> --tools <ids|all>` presenta una cotización ya calculada en dos cifras por
  fila, la persona y un kit con las herramientas elegidas, sin cambiar el total. Sirve para vender una persona por
  dedicación mostrando las herramientas como ítem propio. Avisa si una de las dos partes queda bajo el piso aunque
  la fila lo cumpla. Es una lectura interna (trae costos), no un documento para el cliente.
- Rechazos nuevos del [registro](../../../src/lib/finance/pricing-v3/errors.ts), ambos con salida 1:
  `CURRENT_VERSIONS_MISMATCH` (el puntero y un archivo que nombra no coinciden) y `CURRENT_VERSIONS_CONFLICT` (el
  `--confirm` de `current set` no es el digest del puntero que se reemplaza, o se pasó un `--confirm` cuando el
  puntero de destino todavía no existe). Reemplazar un puntero existente sin `--confirm` es `MISSING_ARGUMENT`.

Motor 1.3 y lecturas (2026-10-11), qué imprime cada comando. Hay tres operaciones nuevas bajo `compose`
(`schedule`, `cash`, `commitments`) y tres rechazos nuevos; los códigos de salida significan lo mismo que antes.

- `compose prepare|quote` y `replay` de una composición: cuando el pedido declara la forma, el resumen agrega el
  bloque `engagementForm` (`{ form, priceRatio, scope, offerId, recordId, revision, sourceStatus }`) y los totales
  agregan `engagementAdjustment`. `engineVersion` es `pricing-v3-local/1.3.0`, también con On-Going y razón 1. Sin
  forma declarada ninguna de esas claves existe y el resumen es el de antes.
- `explain`: `commercialAdjustments` agrega `engagementForm`, la identidad suma que
  `undiscountedPrice − roundingAdjustment − engagementAdjustment` es el precio del mercado de la oferta sin la forma,
  y cada fila agrega `engagementAdjustment` y `engagementPriceRatio`.
- `compose assess`: `margin.policyFloor` agrega `engagementForm`. `proposedTarget` y `proposedFloor` no conocen la
  forma.
- `compose preview`, `export` y las proyecciones cliente muestran sólo el neto final; nada de la forma ni de su ajuste.
- `compose schedule --input <artefacto> --milestones <hitos.json> [--out …]`, `compose cash --input <artefacto>
  [--out …]` y `compose commitments --input <artefacto> [--out …]` son las
  [tres lecturas](#tres-lecturas-de-una-cotización-congelada-2026-10-11). Salen con 3; `commitments` sale con 2 si la
  cotización no llegó a calcularse. Ninguna acepta `--current`: leen un artefacto que ya lleva sus fuentes dentro.
- Rechazos nuevos del [registro](../../../src/lib/finance/pricing-v3/errors.ts), los tres con salida 1:
  `SCHEDULE_MILESTONES_INVALID` (los hitos no son válidos; `option: "milestones"` e `issues[]` con la regla, por
  ejemplo `shares_must_sum_to_one`), `SCHEDULE_REQUIRES_CALCULATED_QUOTE` y
  `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE` (la cotización no está calculada).
- Bloqueos nuevos al cotizar, con salida 2: `MISSING_CATALOG_SELECTION` en la ruta `engagementForm` (la forma
  declarada no tiene registro vigente a la fecha de la cotización), `AMBIGUOUS_SELECTION` en la misma ruta (dos
  registros vigentes del mismo nivel) y `RESOURCE_FX_SELECTION_REQUIRED` (una herramienta con precio en CLP sin su
  tasa en `fxRecordIds`).
- `catalog search|show` aceptan `--kind engagement_factor`.

Motor 1.4 (2026-10-11), qué imprime cada comando. No hay comandos, flags ni códigos de salida nuevos. Todas las
claves que siguen existen sólo en una cotización 1.4.0; una cotización de un contrato anterior conserva su resumen.

- `compose prepare|quote` y `replay` de una composición: el resumen agrega tres bloques. `ownWork`
  (`{ cost, net, marginAmount, marginRateRoundedDown }`) es el trabajo propio. `thirdParty` separa `reinvoiced`
  (`{ cost, net, marginAmount, shareOfNet, rows[] }`, una entrada por costo con su categoría, su regla, su precio y su
  piso), `clientDirect[]` (las notas de lo que paga el cliente) y `fxExposed[]` (los costos cuyo proveedor cobra en
  otra moneda). `contingencyReserve` trae la tasa, la base, el importe, su parte del neto, el registro que la decidió
  y, si se renunció, `waived: true` con el motivo y el importe dejado fuera. `totals` agrega `thirdPartyCost`,
  `thirdPartyNet`, `ownWorkMarginRate`, `contingencyReserve`, `contingencyBase` y `contingencyReserveWaived`.
  `marginRateRoundedDown` de la raíz sigue siendo el margen mezclado real. El resumen nunca trae el nombre de un
  proveedor ni la referencia de su cotización. `engineVersion` es `pricing-v3-local/1.4.0`.
- `estimateExposure`: la cotización de un proveedor con evidencia estimada entra al ranking como un dato de costo
  de tipo `third_party`; con evidencia confirmada cuenta en el costo confirmado. La reserva no es un dato del ranking: agranda en `(1 + tasa)` el peso de los
  datos sobre los que se calcula. Una regla de categoría o un registro de reserva estimados aparecen en
  `estimatedRules`.
- `runNotices.priceDates`: un aviso con `subject: "third_party_quote"` cuando la cotización de un proveedor venció o
  vence pronto. Un registro de reserva que termina no bloquea: la cotización siguiente simplemente no lleva reserva.
- `explain`: `commercialAdjustments` agrega `thirdPartyPolicies[]` (la regla aplicada a cada categoría y a qué
  costos) y `contingencyReserve`; las filas de terceros aparecen en el desglose de costo, y cada fila trae
  `contingencyReserve`, la parte de su costo que es reserva.
- `compose assess`: `margin.ownWorkRate`, `margin.proposedFloorReadOn` y las brechas nuevas descritas en la sección
  de evaluación.
- `compose preview` (vista para el cliente): el fee del servicio es sólo el trabajo propio; cada costo de terceros
  es un ítem aparte con su nombre y su neto final; y después de los totales, `clientPaidDirectly[]` lista lo que el
  cliente paga directo, en su propia moneda y sin convertir. Nunca muestra un proveedor, un costo ni una tasa. En el
  ejemplo: fee 11.370.000, producción 4.950.000, talento 1.380.000, medios 3.333.333, neto 21.033.333, y aparte el
  banco de imágenes por USD 890.
- `compose split`, `compose cash`, `compose schedule` y `compose commitments`: descritos en
  [las lecturas](#tres-lecturas-de-una-cotización-congelada-2026-10-11).
- Situaciones que bloquean al cotizar, con salida 2 (códigos nuevos y códigos de siempre en rutas nuevas):
  `AMBIGUOUS_CONTINGENCY_RESERVE` (dos registros de reserva del mismo
  nivel aplican al pedido), `CONTINGENCY_WAIVER_WITHOUT_RESERVE` (el pedido renuncia a una reserva que no le aplica),
  `DUPLICATE_THIRD_PARTY_COST_ID`, `INVALID_THIRD_PARTY_SCHEDULE`, `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD`,
  `MISSING_CATALOG_SELECTION` en la ruta `thirdPartyCosts.<costId>.policy` (la categoría no tiene regla vigente),
  `INVALID_ADJUSTMENT_LINE` (un descuento por tasa nombra un costo de terceros) y, sobre la cotización de un
  proveedor, `STALE_SOURCE` (vencida) o `MISSING_SOURCE_CONFIRMATION` (pendiente). Tabla completa:
  [modos de falla del contrato 1.4.0](cotizador-v3-contrato-y-validacion.md#contrato-140--costos-de-terceros-y-reserva-de-contingencia-2026-10-11).
- Supuesto nuevo: `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`, cuando el catálogo tiene reservas que
  dependen de la forma y el pedido no declara ninguna.
- `catalog search|show` aceptan `--kind third_party_policy` y `--kind contingency_reserve`.

Documento (2026-10-11), qué imprime cada comando. Hay una operación nueva bajo `compose`, `document`, y cinco
rechazos nuevos; los códigos de salida significan lo mismo que antes. Ningún otro comando cambió su salida.

- `compose document --input <artefacto>` (sin `--brief`) imprime el andamio `pricing-v3-quote-document-scaffold/1`:
  `quote` (fecha, moneda, períodos, neto, impuesto y total de la cotización), `lines[]` (cada línea como se
  imprimiría sin cambios, con su `key` y su `kind`), `clientPaidDirectly[]` si la cotización declara costos que paga
  el cliente, `optional` (las claves optativas del brief) y `brief` (el brief con cada texto vacío). Sale con 2.
  Con `--out` guarda sólo el `brief`. Un andamio sin llenar no pasa: cada texto vacío es un rechazo.
- `compose document --input <artefacto> --brief <brief> [--out <datos>]` imprime los datos del documento: la
  versión 2 del contrato de datos de la
  [plantilla A4](../../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio) y nada
  alrededor, porque la plantilla rechaza claves que no conoce. Sale con 3.
- No acepta `--current`, catálogo, policy ni créditos: lee un artefacto que ya lleva sus fuentes dentro. Un
  artefacto alterado se rechaza con `REPLAY_MISMATCH`.
- Rechazos nuevos del [registro](../../../src/lib/finance/pricing-v3/errors.ts), todos con salida 1 y, cuando hay
  un lugar que señalar, con `issues[]` de ruta y regla: `QUOTE_DOCUMENT_BRIEF_INVALID` (`option: "brief"`),
  `QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE`, `QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP`,
  `QUOTE_DOCUMENT_NOT_REPRESENTABLE` y `QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE` (los cuatro con `option: "input"`: se
  corrige la cotización, no el brief). Una lista de hitos inválida conserva el código de su propia lectura,
  `SCHEDULE_MILESTONES_INVALID`, aquí con `option: "brief"`. Tabla completa:
  [contrato](cotizador-v3-contrato-y-validacion.md#documento-de-cotización-compose-document-2026-10-11).
- El HTML y el PDF no los genera la CLI de pricing sino el generador de la plantilla:
  `node scripts/documents/render-cotizacion-a4.mjs --data <datos> --out <carpeta nueva>`.

Asientos y opciones (2026-10-11), qué imprime cada comando. Hay dos opciones nuevas, `--option` y `--keep-blocked`,
y un rechazo nuevo; no hay comandos nuevos y los códigos de salida significan lo mismo que antes.

- **`--out` es una cotización calculada o nada.** Vale para `calculate`, `quote` del carril de catálogo y
  `compose prepare|quote`. Una corrida que no calcula imprime igual todo lo que encontró, sale con 2, **no escribe
  nada** en `--out` y lo dice en `runNotices.output`: `{ option: "out", written: false, reason:
  "QUOTE_NOT_CALCULATED", statement }`. Como no quedó ningún archivo, la corrida corregida usa el mismo `--out`. Un
  archivo que ya existe nunca se sobrescribe (`OUTPUT_EXISTS`), igual que antes.
- **`--keep-blocked`** guarda a propósito el artefacto de una corrida que no calculó, para las lecturas que lo
  aceptan (`explain`, `replay`, `compose assess` y `compose commitments`). Exige `--out`; sin él es
  `INVALID_ARGUMENT` con `option: "keep-blocked"`. La corrida avisa en `runNotices.output` con `written: true` y
  `reason: "KEPT_BLOCKED"`: ese archivo no es una cotización y la corrida corregida necesita otra ruta. Una entrada
  que el contrato rechaza no produce artefacto, con el interruptor o sin él.
- `compose prepare|quote` y `replay` de una composición: en `attributions`, una fila por plan de cada herramienta.
  Las claves `seats`, `idle` y `bornByLineIds` existen sólo donde la demanda declaró asientos ociosos o compartidos,
  o dos planes en un mes; toda otra fila conserva las claves que tenía.
- Bloqueos nuevos al cotizar, con salida 2 y en `diagnostics`: `UNACCOUNTED_NAMED_SEATS`, `INVALID_IDLE_SEATS`,
  `IDLE_SEAT_BEARER_REQUIRED`, `IDLE_SEAT_BEARER_NOT_ALLOWED`, `INVALID_IDLE_SEAT_BEARER`, `INVALID_SEAT_SHARING`,
  `UNUSED_SEAT_SHARING` y `RESOURCE_HOLDING_ID_TOO_LONG`. La ruta de cada uno es `<período>:<herramienta>`, o
  `<período>:<herramienta>:<priceId>` cuando la herramienta tiene dos planes. Tabla completa:
  [contrato](cotizador-v3-contrato-y-validacion.md#demanda-de-composición-asientos-y-períodos-declarados-una-vez-2026-10-11).
- Una entrada de la demanda con `periodId` y `periodIds` a la vez, sin ninguna de las dos o con un mes repetido no
  pasa el schema: rechazo `SCHEMA_INVALID`, salida 1.
- `compose commitments`: entradas `kind: "idle_seat"`, la señal `PAID_SEAT_IDLE_WITHIN_ENGAGEMENT`,
  `totals.idleSeats` y `reviewed.holdingsWithIdleSeats`, sólo cuando la demanda declara un asiento ocioso.
- `compose assess`: brechas `IDLE_SEAT_COST_REVIEW` y `SHARED_SEAT_TERMS_REVIEW`.
- `compose document --option <clave>=<artefacto>`: repetible, hasta ocho. Sin `--brief`, el andamio agrega
  `options[]` (clave, precio, moneda, períodos e identidad del cálculo de cada opción) y, si la cotización bonifica
  alguna línea, `waived[]` (cada clave bonificada con su valor de referencia); el `brief` del andamio trae cada opción
  con su nombre y su unidad por llenar. Con `--brief`, los datos agregan el bloque `options` y, en una línea
  bonificada, `referenceNet`; `source` agrega la identidad del cálculo de cada opción.
- Rechazo nuevo del [registro](../../../src/lib/finance/pricing-v3/errors.ts), con salida 1:
  `QUOTE_DOCUMENT_OPTION_INVALID` (`option: "option"`): una opción no se puede imprimir como un solo importe. Un
  `--option` mal escrito (sin `=`, sin ruta, con una clave inválida o repetida) es `INVALID_ARGUMENT` con
  `option: "option"`.
- `compose preview`, `compose split`, `compose cash`, `compose schedule` y `explain` no cambian de forma.

Verificación de implementación TASK-2022: 135 tests V3 + 78 V2 = 213, 26 smokes CLI y replay de baselines preservados.
Readback del 2026-10-10 tras el endurecimiento de la CLI: `pnpm pricing:v3:test` con 9 archivos y 179 pruebas V3,
ESLint y `pnpm typecheck` limpios, y `pricing:v3 replay` con `verified: true` en los `*.artifact.json` presentes ese
día bajo `data/pricing/` (16) y en la carpeta del caso SKY (13). Los conteos de TASK-2022 siguen siendo la evidencia
fechada de ese cierre; `verification.cli.json` registra sólo operación y código de salida, así que sigue vigente.
Readback del 2026-10-10 tras el motor 1.1 y el catálogo v4: `pnpm pricing:v3:test` con 12 archivos y 320 pruebas V3,
ESLint y `pnpm typecheck` limpios, y `verified: true` en todos los `*.artifact.json` en disco: 16 bajo
`data/pricing/` y 14 en la carpeta del caso SKY (30). La guarda permanente cubre los versionados: 17 en el commit
`9e397278c` y 18 desde `72fbf10d4`, que agregó `acordado-neto.artifact.json`, el primero firmado por el motor 1.1.0.
Cotizaciones de prueba de ese día con `catalog.review-v4` + `resources.review-v5`:

| Caso | Contrato | Resultado |
| --- | --- | --- |
| SKY social care con `agreed_net` 4.990.000 | 1.1.0 | `undiscountedPrice` 5.430.000 (redondeo 9.855), `discount` 440.000, `net` 4.990.000 exacto; margen 0,402589; tres líneas marcadas, 236.579 CLP al mes bajo el piso en total |
| SKY al piso, sin precio pactado | 1.0.0 en v3 → 1.1.0 en v4 | 5.420.145 → 5.430.000; en v4, margen 0,450998 y ninguna línea marcada |
| `managed-care.demand.json` en v3 (CLP) | 1.0.0 | 9.508.946; seis líneas marcadas por fracciones de peso |
| `managed-care.demand.json` en v4 | 1.1.0 | CLP 9.530.000 · USD 9.530,00 · COP 34.900.000 · MXN 183.300,00 · PEN 35.300,00; todos múltiplos de su regla, ninguna línea marcada |

Los archivos `acordado-neto.*` del caso SKY están junto al
[registro de la excepción](../../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md).
Las cifras son evidencia fechada de esa corrida, no un contrato.

Readback del 2026-10-11 tras el motor 1.2 y el catálogo v5: `pnpm pricing:v3:test` con 13 archivos y 407 pruebas V3,
ESLint limpio, y `verified: true` en todos los `*.artifact.json` en disco: 17 bajo `data/pricing/` y 14 en la
carpeta del caso SKY (31). La guarda permanente cubre los versionados: 19 desde el commit `e8117442b`, que agregó
`managed-care-colombia.artifact.json`, el primero firmado por el motor 1.2.0.
Cotizaciones de prueba de ese día con `catalog.review-v5` + `resources.review-v5`: `managed-care.demand.json` con
`quoteDate` 2026-10-11 y salida en USD, cambiando sólo el país del cliente (`offerMarketCountry`) y el del equipo
(`talentCountry` de las seis líneas). Todas salen calculadas y en revisión (exit 3).

| Cliente / equipo | Contrato | Neto mensual USD | Costo USD | Margen real | Líneas marcadas |
| --- | --- | --- | --- | --- | --- |
| CL / CL | 1.1.0 | 9.530,00 | 5.229,94 | 0,4512 | 0 |
| CL / CO | 1.1.0 | 8.210,00 | 4.501,94 | 0,4516 | 0 |
| CO / CL | 1.2.0 | 8.890,00 | 5.229,94 | 0,4117 | 0 |
| CO / CO | 1.2.0 | 7.690,00 | 4.501,94 | 0,4145 | 0 |
| PE / PE | 1.2.0 | 8.260,00 | 4.683,94 | 0,4329 | 0 |
| MX / MX | 1.1.0 | 8.890,00 | 4.865,94 | 0,4526 | 0 |
| US / CL | 1.1.0 | 10.180,00 | 5.229,94 | 0,4862 | 0 |
| US / US | 1.1.0 | 39.300,00 | 19.789,94 | 0,4964 | 0 |
| ES / ES | 1.1.0 | 24.740,00 | 12.509,94 | 0,4943 | 0 |
| ES / CL | 1.1.0 | 10.180,00 | 5.229,94 | 0,4862 | 0 |

- El equipo en Colombia baja el costo (4.501,94 contra 5.229,94) y el precio con él: el margen queda en el de la
  política. El cliente en Colombia baja sólo el precio: en CO / CL `totals.marketAdjustment` es −661,84 y el margen
  real queda en 0,4117 sin ninguna línea marcada.
- Estados Unidos y España cotizan en 1.1.0 porque su factor de mercado, mayor que 1, no declara `floorBasis`; el
  resumen igual lo nombra en `marketFactor` y los totales no traen `marketAdjustment`. Con el factor neutral
  (CL, MX) `marketFactor` no aparece.
- En COP, cliente y equipo en Colombia
  ([`managed-care-colombia.demand.json`](../../../data/pricing/v3-operating/managed-care-colombia.demand.json) →
  `.artifact.json`, versionados): 28.100.000 al mes, costo 16.432.006, `marketAdjustment` −1.932.511, margen real
  0,4152, ninguna línea marcada, replay verificado. Sin `floorBasis`, esa misma cotización con factor 0,90 marcaba
  las seis líneas (medido antes del cambio).
- La misma cotización con un `agreed_net` de 24.000.000 (sin versionar): `discount` 4.100.000, margen real 0,3153 y
  las seis líneas marcadas, cada una con `floorNet` y `netShortOfFloor`; `marginAmountShortOfFloor` es `null` en
  todas. Primera línea: neto 10.163.701, piso 11.872.366, faltan 1.708.665.
- La demanda versionada original (`quoteDate` 2026-10-10) sobre v5 sigue dando CLP 9.530.000 en 1.1.0 y con el
  supuesto `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY`, también si se le cambia el mercado a Colombia: los valores de v5
  rigen desde el 2026-10-11.
- Una cotización en EUR para un cliente de España queda `needs_input` (falta la tasa USD→EUR vigente): no hay tipo
  de cambio ni regla de redondeo para EUR.

Readback del 2026-10-11 tras el puntero de versiones vigentes, la policy v6 y el catálogo v6, hecho con la CLI:
`current show` responde `consistent: true` con las tres fuentes en `match`, y `replay` da `verified: true` en los 31
`*.artifact.json` en disco (17 bajo `data/pricing/` y 14 en la carpeta del caso SKY). Corridas de ese día con
`--current`:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `managed-care-colombia.demand.json` (cliente y equipo en Colombia, COP, fecha 2026-10-11) | 3 | Contrato 1.2.0; neto 28.100.000, costo 16.432.006, margen real 0,4152; ninguna línea marcada; sin `runNotices` |
| Su `estimateExposure` | — | 98,7 % del costo descansa en datos estimados. Primero el factor de talento Colombia sobre Chile: 64,7 % del costo y 3,8 puntos de margen si fuera 10 % más alto. Después la bandeja de Sprout: 17,7 % y 1,0 punto |
| `managed-care.demand.json` (fecha 2026-10-10) | 3 | Contrato 1.1.0; CLP 9.530.000; `runNotices.laterCatalogValues` avisa 45 registros que rigen desde el 2026-10-11 (32 costos, 6 factores de talento, 6 de mercado y 1 tipo de cambio) |
| La demanda de Colombia con fecha 2026-12-15 | 3 | Calcula igual sobre la policy v6. La misma fecha con `--policy` en `resources.review-v5.json` queda `needs_input` por `RESOURCE_PRICE_NOT_EFFECTIVE` |
| La demanda de Colombia con fecha 2027-05-01 | 3 | Calcula igual; `runNotices.priceDates.reviewDue` lista los cuatro precios usados cuya fecha de revisión ya pasó |
| La demanda de Colombia con salida en EUR | 2 | `needs_input`: `MISSING_CATALOG_SELECTION` en `fx.USD:EUR` |

Las tres últimas filas usan copias de la demanda con un solo campo cambiado; no están versionadas. La exposición es
una lectura de sensibilidad sobre el resultado congelado, no un pronóstico ni una validación de esos datos.

Readback del 2026-10-11 por la tarde, tras el motor 1.3, el catálogo v9 y las policies v7 y v8, hecho con la CLI
y con el puntero en catálogo v9 y policy v8:
`current show` responde `consistent: true` con las tres fuentes en `match`, y `replay` da `verified: true` en los 18
`*.artifact.json` bajo `data/pricing/`, entre ellos `designer-on-demand.artifact.json`, el primero firmado por el
motor 1.3.0. Corridas de ese día con `--current`; salvo la primera, usan copias de la demanda con un solo cambio y
no están versionadas:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `designer-on-demand.demand.json` (On-Demand, Chile, CLP, un mes) | 3 | Contrato 1.3.0; neto 2.790.000, costo 1.768.438, margen 0,3662, `engagementAdjustment` 252.635; ninguna línea marcada. Mismas cifras que el artefacto versionado, que se congeló con la policy v7; la identidad (`calculationId`) es otra porque la corrida congela la policy v8 |
| La misma con `engagementForm: on_going` | 3 | Contrato 1.3.0 con razón 1; neto 2.540.000, mismo costo, margen 0,3038, `engagementAdjustment` 0 |
| La misma sin `engagementForm` | 3 | Contrato 1.1.0; neto 2.540.000; el resumen no trae `engagementForm` |
| La misma con una forma que el catálogo no tiene | 2 | `needs_input`: `MISSING_CATALOG_SELECTION` en `engagementForm` |
| La misma eligiendo además el reclutamiento | 3 | Costo 2.268.438, neto 3.570.000 (mensualidad 2.470.000 y puesta en marcha 1.100.000) |
| La misma con Adobe al precio posterior al descuento (`renewal-scenario`) | 3 | Costo 1.822.704, neto 2.870.000 |
| La misma sin `fx:CLP:USD` en `fxRecordIds` | 2 | `needs_input`: `RESOURCE_FX_SELECTION_REQUIRED` en `1:adobe` |
| Un diseñador con Creative Cloud Pro y un community manager con Adobe Express | 3 | Calcula: equipo mixto, sin `BUNDLED_TOOL_DOUBLE_COUNT` |
| El diseñador con Creative Cloud Pro y además Adobe Express | 2 | `needs_input`: `BUNDLED_TOOL_DOUBLE_COUNT` en `1:adobe` |
| `managed-care-colombia.demand.json` tal como está versionada | 2 | `needs_input`: `RESOURCE_ALLOCATION_REQUIRED` en `1:adobe-express`. Desde la policy v7 los perfiles de contenido piden Adobe Express |
| La misma excluyendo esa tarea, con su motivo, en las dos líneas de community manager | 3 | Contrato 1.2.0; las cifras de la tabla anterior: COP 28.100.000, costo 16.432.006, margen 0,4152 |

Dos consecuencias para los ejemplos anteriores de este documento:

- Las policies v7 y v8 rigen desde el 2026-10-11. Una demanda con fecha anterior cotizada con `--current` queda `needs_input`
  con `RESOURCE_POLICY_NOT_EFFECTIVE`: es el caso de `managed-care.demand.json` (fecha 2026-10-10), que en el readback
  anterior calculaba con la policy v6. Para reproducirla se pasan las fuentes de su época por ruta explícita; su
  artefacto congelado, como todos, se sigue reproduciendo con `replay`.
- Una demanda escrita para la policy v6 con un Social Media Manager, Community Manager, Content Manager o Content
  Creator necesita ahora declarar la asignación de Adobe Express o excluir esa tarea con un motivo
  (`work[].excludedProfileTasks`).

Esa tabla es de la tarde, con el puntero en la policy v8. Más tarde ese día el puntero pasó a la policy v10, que
cotiza Creative Cloud Pro sin descuento, y tres filas se leen distinto. La primera, con `--current`, da ahora costo
1.822.704 y neto 2.870.000 (margen 0,3649, `engagementAdjustment` 260.387); con `on_going` o sin forma, neto
2.610.000 y margen 0,3016. La fila de `renewal-scenario` ya no se puede correr: ese `priceId` no existe y sus
cifras son las del precio `current`. Y eligiendo `invoiced-with-discount` vuelven las cifras del artefacto
(1.768.438 y 2.790.000). Con reclutamiento, costo 2.322.704 y neto 3.650.000. Las demás filas con Creative Cloud
Pro no se volvieron a medir.

Readback del 2026-10-11 por la noche, tras el motor 1.4 y el catálogo v10, hecho con la CLI: `current show` responde
`consistent: true` con las tres fuentes en `match` (catálogo v10, policy v10, créditos v1), y `replay` da
`verified: true` en los 19 `*.artifact.json` bajo `data/pricing/`, entre ellos
`managed-on-demand-third-party.artifact.json`, el primero firmado por el motor 1.4.0. Hay al menos uno firmado por
cada motor: 1.0.0, 1.2.0, 1.3.0 y 1.4.0 en esa carpeta, y el de 1.1.0 en la carpeta del caso SKY. Corridas de ese
día con `--current`; salvo la primera, usan copias de la demanda con un solo cambio y no están versionadas:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `managed-on-demand-third-party.demand.json` | 3 | Contrato 1.4.0; neto 21.033.333, costo 14.750.055, margen mezclado 0,2987, margen del trabajo propio 0,5016, reserva 436.800; ninguna fila marcada. La misma identidad (`calculationId`) que el artefacto versionado. `runNotices.laterCatalogValues` avisa 8 registros que rigen desde el 2026-10-12: los factores de país confirmados |
| La misma con fecha 2026-10-12 | 3 | Las mismas cifras (equipo y cliente en Chile) y sin `runNotices` |
| La misma con la reserva renunciada | 3 | Neto 20.163.333, costo 14.313.255; `totals.contingencyReserveWaived` 436.800; señal `CONTINGENCY_RESERVE_WAIVED` |
| La misma declarada On-Going con una renuncia | 2 | `needs_input`: `CONTINGENCY_WAIVER_WITHOUT_RESERVE` en `contingency` |
| La misma con la oferta `seo-aeo-managed-service` y sin terceros | 3 | Contrato 1.4.0; la reserva de esa oferta, 436.800; costo 5.666.722, neto 13.880.000 |
| La misma con un neto pactado de 4.800.000 para la producción (`agreed_net`, `billing: "third_party"`) | 3 | Esa fila baja de 4.950.000 a 4.800.000 (`discount` 150.000), sobre su piso de 4.736.843; neto 20.883.333 |
| La misma con un descuento por tasa que nombra la producción | 2 | `needs_input`: `INVALID_ADJUSTMENT_LINE` |
| La misma con la cotización de la productora vencida el 2026-10-08 | 2 | `needs_input`: `STALE_SOURCE`; `runNotices.priceDates.expired` nombra el costo |
| La misma con esa cotización vigente hasta el 2026-10-25 | 3 | Calcula; `runNotices.priceDates.dueSoon` avisa que vence en 14 días |
| La misma con una categoría sin regla en el catálogo | 2 | `needs_input`: `MISSING_CATALOG_SELECTION` en `thirdPartyCosts.tp-production.policy` |
| La misma con un costo refacturado sin evidencia | 1 | Rechazo `SCHEMA_INVALID` en `brief.thirdPartyCosts.0.evidence` |
| `designer-on-demand.demand.json` (una persona por dedicación, On-Demand) | 3 | Contrato 1.3.0, sin reserva: costo 1.822.704, neto 2.870.000, las cifras de antes |

Readback del 2026-10-11, último de la noche, tras `compose document` y la versión 2 de la plantilla A4, hecho con la
CLI: `pnpm pricing:v3:test` con 25 archivos y 1.208 pruebas V3; las pruebas de la plantilla
(`node --test scripts/documents/render-cotizacion-a4.test.mjs scripts/documents/document-money.test.mjs`) con 25; y
`replay` con `verified: true` en los 20 `*.artifact.json` bajo `data/pricing/`, entre ellos el nuevo
`designer-three-months-iva.artifact.json` (motor 1.3.0, tres períodos: costo 5.068.112, neto 7.970.000, margen
0,3641, impuesto 1.514.300 y total 9.484.300; ninguna línea marcada). El puntero nombra el catálogo v10, la policy
v11 y los créditos v1, con `consistent: true`. Corridas de ese día sobre artefactos versionados; las de rechazo usan
copias de un brief con un solo cambio y no están versionadas:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `compose document` sobre `designer-three-months-iva.artifact.json`, sin brief | 2 | Andamio: neto 7.970.000, impuesto 1.514.300, total 9.484.300; dos líneas, `design` (3 meses a 2.550.000) y `design:setup` (1 pago único, 320.000) |
| El mismo con su brief versionado | 3 | Datos idénticos byte a byte a `designer-three-months-iva.document.json`; `vatRate` 0,19 y `taxAmount` 1.514.300 |
| `designer-on-demand` y `managed-on-demand-third-party` con sus briefs | 3 | Datos idénticos a los versionados; sin impuesto resuelto, `vatRate` es `null` y no hay `taxAmount` |
| Los tres documentos generados con la plantilla | 0 | 4, 4 y 5 páginas; el manifiesto registra el impuesto como declarado (`stated`) en el de tres meses y por confirmar (`pending`) en los otros dos |
| Un brief con una clave de importe, en la raíz o en `pricing` | 1 | `QUOTE_DOCUMENT_BRIEF_INVALID`, regla `unrecognized_keys` |
| Un brief que nombra una línea que la cotización no tiene | 1 | `QUOTE_DOCUMENT_BRIEF_INVALID`, regla `unknown_key` en la posición de esa entrada |
| Un brief con hitos que suman 0,9 | 1 | `SCHEDULE_MILESTONES_INVALID`, regla `shares_must_sum_to_one`, `option: "brief"` |
| Un brief con un hito sin período ni texto de cuándo | 1 | `QUOTE_DOCUMENT_BRIEF_INVALID`, regla `timing_required` |
| El andamio sin llenar entregado como brief | 1 | `QUOTE_DOCUMENT_BRIEF_INVALID`, una entrada por texto vacío |
| Un título de portada de tres líneas largas | 3 al emitir; 1 al generar | Los datos se emiten; el generador falla con «Contenido fuera del A4» y no deja documento |
| `compose document` con `--current` | 1 | `INVALID_ARGUMENT` con `option: "current"` |

Readback del 2026-10-11 tras «asientos y opciones», hecho con la CLI: `pnpm pricing:v3:test` con 27 archivos y
1.359 pruebas V3, y `replay` con `verified: true` en los 24 `*.artifact.json` versionados bajo `data/pricing/`, entre
ellos los tres nuevos: `designer-startup-courtesy.artifact.json` y sus dos opciones. Los tres son del motor 1.3.0 y
congelaron el catálogo v10 y la policy v11. Corridas de ese día; las que no nombran un archivo versionado usan
copias de la demanda de `designer-startup-courtesy` con un solo cambio y no están versionadas:

| Caso | Salida | Resultado |
| --- | --- | --- |
| `replay` de `designer-startup-courtesy.artifact.json` | 3 | Costo 5.068.112, precio antes del ajuste 7.970.000, rebaja 320.000, neto 7.650.000, impuesto 1.453.500 y total 9.103.500. Una fila marcada: la puesta en marcha bonificada |
| `compose document` sobre ese artefacto con sus dos `--option`, sin brief | 2 | Andamio: una línea (`design`, 3 meses a 2.550.000); `waived` con `design:setup` y su valor de referencia, 320.000; `options` con `copywriter` (2.580.000, tres períodos) y `motion` (3.570.000, un período) |
| El mismo con su brief versionado | 3 | Datos idénticos a `designer-startup-courtesy.document.json`: la línea bonificada con `net` 0 y `referenceNet` 320.000, y el bloque `options` |
| Ese documento generado con la plantilla | 0 | Cinco páginas |
| La demanda con `periodIds` en vez de una entrada por mes | 3 | 9 entradas de asignación pasan a 3. Mismo costo y mismo neto (5.068.112 y 7.650.000); otra identidad de cálculo |
| La demanda con dos asientos de Notion pagados y una persona | 2 | `needs_input`: `UNACCOUNTED_NAMED_SEATS` en `1:notion`, `2:notion` y `3:notion`. Con `--out`, ningún archivo; `runNotices.output` con `written: false` |
| La misma con `--keep-blocked` y otra ruta | 2 | El artefacto bloqueado se escribe; `runNotices.output` con `reason: "KEPT_BLOCKED"` |
| La misma declarando uno de los dos asientos ocioso, con su motivo | 3 | Calcula: costo 5.140.112, neto 7.770.000. `compose commitments` lista 3 meses-asiento ociosos; `compose assess`, `IDLE_SEAT_COST_REVIEW` en los tres meses |
| La demanda con un segundo plan de Microsoft 365 en el mes 2, con su asiento declarado ocioso | 3 | Calcula; `attributions` trae una fila por plan, y `seats` sólo en el mes 2 |
| La demanda con un grupo de `seatSharing` que nombra a alguien que no usa la herramienta | 2 | `needs_input`: `INVALID_SEAT_SHARING` |
| Una asignación con `periodId` y `periodIds` a la vez | 1 | Rechazo `SCHEMA_INVALID` en `allocations.0` |

Las cifras son evidencia fechada de esa corrida, no un contrato.
[Evidencia de comandos](../../../data/pricing/v3-operating/verification.cli.json). El inventario vivo, salarios
vigentes, medición de provisiones, policy comercial y términos reales siguen en
[ledger de pendientes](../../../data/pricing/v3-operating/operational-gaps.json). Cambios salariales por periodo,
drivers actuariales/contables, setup amortizado, fees porcentuales, ajustes encadenados y promoción de consumers
API/UI/MCP/Nexa necesitan extensión propia. La duración del contrato no es un dato de entrada. Los costos de terceros
de un trabajo y la reserva de contingencia para alcance fijo, que esta lista daba por no modelados, existen desde el
motor 1.4 (2026-10-11); lo que de ellos sigue sin modelarse —cuándo se le paga al proveedor, si una compra obliga más
allá del trabajo, una comisión sobre lo que el cliente paga directo, una lista de precios de proveedores recurrentes
y la reserva de un servicio On-Going ganado en licitación con multas— está en
[qué no está modelado](#qué-no-está-modelado). [Handoff de promoción](cotizador-v3-promocion-canonica.md).
