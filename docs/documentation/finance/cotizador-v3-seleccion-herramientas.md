# V3 — Selección de herramientas por trabajo

Fecha: 2026-10-09. Owner: Operations para necesidades/asignaciones; Finance para costos/reparto.
Requisitos confirmados bajo TASK-2017; composición local bajo TASK-2021y flujo operativo ampliado bajo TASK-2022. [Contrato funcional implementado](cotizador-v3-superficie-implementada.md). Evidencia comercial e inventario live pendientes.
Se reutiliza el [ADR de catálogo y kits](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).

## Necesidad antes de costo

Cada pedido combina base común, perfil, tareas y alcance del servicio. El agente interpreta el trabajo y
selecciona requisitos desde reglas documentadas; la CLI resuelve costos normalizados y calcula. Seleccionar
una herramienta no implica cobrar una suscripción completa nueva a cada cliente o persona.

Las [reglas legibles por agentes](../../../data/pricing/v3-pilot/economics/resource-inputs/tool-selection.operator-2026-10-09.json)
son antecedentes confirmados de necesidades, no un schema ejecutable, catálogo monetario ni input CLI.

| Recurso               | Regla confirmada o pendiente                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Notion                | Requerido para todos los roles que participan: PMS de Efeonce                                     |
| Microsoft 365         | Requerido para todos los roles que participan: base común de trabajo                              |
| SEMrush               | Requerido en redacción SEO, según el ejemplo confirmado por el operador                           |
| Adobe                 | Redacción SEO sola no lo requiere; una tarea de producción visual puede justificarlo. Desde el 2026-10-11 son dos productos: [ver abajo](#adobe-dos-productos-y-quién-usa-cada-uno-2026-10-11) |
| Higgsfield y Magnific | Seleccionar por trabajo visual y presupuesto de consumo; asignaciones concretas pendientes        |
| ChatGPT y Claude Team | Incluir licencia cuando el trabajo y la asignación la necesitan; planes y asignaciones pendientes |
| Vercel y GCP          | Reparto de plataforma según cobertura del servicio y driver aprobado; no seat por persona         |

Sólo Notion/Microsoft 365 quedaron confirmados como universales. El operador añadió Claude Team al conjunto
de recursos que deben costearse; no definió uso universal, variante Standard/Premium ni que ChatGPT y Claude
sean obligatorios simultáneamente. Si una tarea necesita ambos se costean ambos con justificación; si una
alternativa cubre el requisito, la elección es explícita y no se decide sólo por el menor precio.

Notion del cliente u otro PMS no acreditan que desaparezca el requisito operativo Efeonce. Cualquier
excepción a la base requiere decisión explícita y cobertura suficiente; las opciones históricas
`allowClientProvided` del catálogo no prueban esa excepción ni un costo cero.

## Asignación y desglose

Separar quién necesita acceso, qué suscripción/seat lo cubre y qué parte de su costo corresponde al trabajo.
Las licencias nominativas se cuentan por usuarios distintos, siempre en asientos enteros: una dedicación parcial no
convierte un seat en medio seat. Otra cosa es qué parte del costo de ese seat carga un trabajo: un mismo seat usado
por una persona en varios servicios requiere reparto documentado, no repetir su costo completo ni borrar todas las
repeticiones por nombre del proveedor. Ese reparto se declara en la demanda (`serviceShare` con su `driver`), y los
ejemplos vigentes lo hacen por la dedicación declarada de la persona
([cómo](#asientos-de-una-persona-a-tiempo-parcial-precios-sin-importe-y-lo-que-el-trabajo-agrega-2026-10-11)).
Desde el 2026-10-11, que dos personas usen un mismo seat ya no es algo que la demanda no pueda decir: se declara
expresamente, con su motivo, y que el proveedor lo permita se confirma aparte. Lo que sigue sin admitirse es
repartir el costo de un seat entre personas sin declararlo. Detalle:
[las tres formas de declarar un asiento](#asientos-de-una-herramienta-nominativa-las-tres-formas-de-declararlos-2026-10-11).
Suscripción, periodo y asignación identifican el costo que se reconcilia; consumo IA y caja adicional tienen
tratamiento separado. Una licencia existente mantiene costo atribuible aunque no exija comprar otra.

El desglose esperado conserva para cada recurso: regla/razón, plan, usuario o grupo consumidor, cantidad,
periodo, costo original/moneda/fuente, driver y cuota asignada, costo del trabajo y saldo interno/no asignado.
Ausencias de precio o reparto producen pendiente; no precio cero ni porcentaje inventado. Los costos que
ya cubre otro componente no se suman de nuevo. En servicios se incluyen como costo interno, conservando
la unidad comercial de alcance/cadencia; el consumo de herramientas no obliga a vender horas personales.

Ejemplo de selección, sin precio: redactor SEO → Notion + Microsoft 365 + SEMrush + IA elegida para el
trabajo. Adobe se omite si sólo redacta; Higgsfield/Magnific se agregan si también produce imágenes que lo
requieren. IA seleccionada aún necesita plan/asignación o créditos presupuestados explícitos.

## Claude Team: referencia pública

[Precios oficiales](https://claude.com/pricing), consultados 2026-10-09: Standard 25 USD/seat/mes con pago mensual,
o equivalente 20 USD/mes con pago anual; Premium 125 USD/mes, o equivalente 100 USD/mes anual. Las anualidades
derivadas son 240/1200 USD por seat, no pagos mensuales de 20/100. La
[ayuda oficial vigente](https://support.claude.com/en/articles/9266767-what-is-the-team-plan) indica mínimo
dos miembros y precios estadounidenses sin impuestos; precio/moneda regional pueden variar.

[Registro de las cuatro variantes](../../../data/pricing/v3-pilot/economics/resource-inputs/claude-team.public-pricing-2026-10-09.json)
separa precio público de contrato real. No elegir variante, cantidad ni calendario de Efeonce por inferencia.
Sin factura/plan real no se confirma gasto actual; sin distribución no se confirma costo por cliente.
Precio del seat tampoco acredita presupuesto de consumo adicional o cobertura de una integración API.

## Qué funciona y qué falta

[Composición CLI local](../../manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) implementa
base común + perfil/tareas + IA/servicio, asignaciones por mes, presupuestos IA integrados al kernel y artefacto
congelado con explain/replay. [Policy ejecutable y tres casos](../../../data/pricing/v3-composition/README.md)
normalizan las reglas anteriores. El registro raw del operador sigue siendo antecedente, no input CLI.

El agente interpreta demanda y elige variantes/supuestos explícitos; el dominio exige base/selección y
calcula desde precios versionados. No elige automáticamente variante barata ni porcentajes de reparto.
Usuarios únicos cuentan seats (salvo los que la demanda declara que comparten uno, desde el 2026-10-11); varios
roles comparten un pool según asignación declarada. El dominio no aplica ningún descuento por FTE por su cuenta: la
parte del costo que carga la cotización es la que la demanda declara con su driver.
Créditos se agregan por proveedor/mes antes de elegir packs. El desglose conserva selección/omisiones,
fuente, usuarios, cantidad, driver, costo/cuota y remanentes; caja adicional separada de costo atribuido.

Copywriter y SEO Specialist siguen distintos: tareaSEO agrega SEMrush sin cambiar salario por inferencia.
La composición de servicio es costeo/modelado interno y no certifica alcance, precio o contrato de delivery.
Quote/prepare legacy conservan kits explícitos previos; el binding nuevo ocurre con `compose`, no mutando baseline.

TASK-2022 agrega [flujo operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) y
[policy sucesora](../../../data/pricing/v3-operating/README.md):32 perfiles/25 tools históricas más nuevos recursos,
feeETG-017 separado, portfolio de capacidad declarada, cobertura cliente, readiness y preview seguro.
Adobe 180 USD cubre 3 CC+3 Express (operador confirmado),306 es escenario sin fecha conocida (registro del
2026-10-09; desde la policy v7 no son los importes vigentes: ver la sección de Adobe más abajo). Notion 24/seat y
créditos 30 USD tienen respaldo de factura por periodo; públicoM365/SEMrush/ChatGPT/Claude sigue separado de gasto
real. EUR/FX referencial explícito permite simularMagnific. Planes, salarios, usuarios y cartera reales pendientes
quedan en evaluación; no inventario live o integración canónica. Legacy permanece intacto y TASK-2017 parcial.

Nota 2026-10-11, precio y cantidad son dos cosas distintas. Por decisión del operador (CEO), el precio unitario de
una herramienta no vence: vale hasta que se reemplaza por otro y lleva una fecha de revisión que avisa sin bloquear.
Lo que cambia de una cotización a otra es la cantidad de licencias, que se declara en cada cotización junto con las
asignaciones. Esto no confirma ningún precio: la mayoría sigue siendo precio de lista público marcado como estimado,
y el plan realmente contratado sigue pendiente. Microsoft 365 dejó de estar en ese grupo con la policy v9: su precio
`current` es el de la factura que mostró el CEO (G185142527, del 2026-09-16: Business Standard, USD 14,70 por
licencia al mes, seis licencias, sin impuesto), confirmado. Sus precios públicos (por ejemplo
`public-standard-teams-monthly`, USD 16,80) siguen en la policy y las demandas de ejemplo todavía los eligen; una
cotización nueva debería elegir `current`. Notion (nueve miembros Business a USD 24 y 3000 créditos a USD 30, sin
impuesto) cita desde la v9 su factura 0D8C80A9-0039 del 2026-09-21. La policy vigente la nombra el puntero de
versiones y se usa con
`--current`. Detalle: [precios unitarios](cotizador-v3-mantenimiento-catalogo.md#precios-unitarios-vigencia-y-fecha-de-revisión-2026-10-11)
y [puntero](cotizador-v3-mantenimiento-catalogo.md#puntero-de-versiones-vigentes-2026-10-11).

## Adobe: dos productos y quién usa cada uno (2026-10-11)

Hasta la policy v6 Adobe figuraba como un solo paquete declarado por el operador. Desde la policy v7 está cargado
como aparece en su factura (la del 2026-09-16, que mostró el CEO), y son dos productos distintos con usuarios
distintos:

| Producto | Quién lo usa | Tareas que lo piden | Licencias e importe |
| --- | --- | --- | --- |
| Adobe Creative Cloud Pro (`adobe`) | Diseñadores | Diseño visual y edición de video (`visual-design`, `video-editing`) | 3 licencias. Se cotiza a CLP 325.405,5 al mes, el precio sin descuento; hoy se factura a CLP 162.605. Ya incluye Adobe Express |
| Adobe Express (`adobe-express`) | Perfiles de contenido: Social Media Manager, Community Manager, Content Manager y Content Creator | Diseño con Adobe Express (`express-design`) | 3 licencias, CLP 16.240 al mes |

Qué perfiles de contenido usan Adobe Express lo confirmó el CEO. Desde la policy v7 esos cuatro perfiles traen la
tarea `express-design` en su receta, así que el cotizador les pide la herramienta sin que nadie la agregue.

Reglas para cotizar:

- **Una licencia es un tercio del paquete.** Cada producto se compra como un paquete de tres licencias. Una persona
  que usa una carga un tercio del importe (CLP 108.468,5 al mes en Creative Cloud Pro al precio sin descuento, CLP
  54.202 al importe facturado hoy, y CLP 5.413 en Adobe Express); no se le atribuye el paquete entero. La demanda lo
  declara en la asignación: una licencia de tres.
- **Un equipo mixto es normal.** Un diseñador con Creative Cloud Pro y un community manager con Adobe Express en la
  misma cotización calculan sin problema. Lo que el cotizador rechaza (`BUNDLED_TOOL_DOUBLE_COUNT`) es que la **misma**
  persona o línea lleve Creative Cloud Pro y además Adobe Express, porque el primero ya lo incluye.
- **Los importes están en pesos y con IVA**, por decisión del CEO. La demanda que usa cualquiera de los dos productos
  nombra la tasa `fx:CLP:USD` en `fxRecordIds`.
- **Si el rol no diseña, se excluye la tarea con su motivo.** Por ejemplo, un community manager que sólo responde
  comentarios. Se declara en `work[].excludedProfileTasks`. Sin la asignación ni la exclusión, la cotización queda
  `needs_input` con `RESOURCE_ALLOCATION_REQUIRED`. Las demandas escritas antes de la policy v7 con alguno de esos
  cuatro perfiles están en ese caso.
- **Creative Cloud Pro se cotiza sin su descuento.** El descuento de 50 % termina pronto y el CEO decidió el
  2026-10-11 que se calcule sin él desde ya. Desde la policy v10 el precio `current` es el de lista y es el que toma
  toda cotización nueva; no hay que elegir nada. El importe facturado con descuento queda como
  `invoiced-with-discount`, sólo para un trabajo que termina antes que el descuento, y elegirlo es decisión del
  operador. Ya no existe `renewal-scenario`.
- **Una licencia de Adobe se sigue cobrando hasta que su contrato anual se renueva**, el 2026-11-16 según la consola
  del proveedor que mostró el CEO; en la renovación se puede cambiar el número de licencias o cancelar el plan. Que
  el descuento termine justo en esa fecha no está confirmado. Qué significa el plazo:
  [provisiones y costos](cotizador-v3-provisiones-y-costos.md#adobe-tal-como-se-factura-y-el-plazo-del-contrato-2026-10-11).

El importe de Adobe Express y el importe facturado de Creative Cloud Pro están confirmados por la factura; el precio
sin descuento con que se cotiza es el precio de lista de esa misma factura y es un valor decidido por el CEO
(confirmado desde la policy v11). Nada de eso confirma
quién tiene asignada cada licencia: las asignaciones de los ejemplos siguen siendo simulaciones.

## Asientos de una herramienta nominativa: las tres formas de declararlos (2026-10-11)

Una herramienta nominativa con precio por asiento es la que se paga por persona: cada persona que la usa necesita un
asiento, y el asiento se paga entero aunque esa persona le dedique una fracción de su tiempo (qué parte de ese pago
carga cada cotización es una declaración aparte:
[abajo](#asientos-de-una-persona-a-tiempo-parcial-precios-sin-importe-y-lo-que-el-trabajo-agrega-2026-10-11)). Hasta el 2026-10-11 la
demanda sólo podía decir «tantas personas, tantos asientos, un solo plan». La compra real suele ser otra cosa, y
desde ese día se declara tal como es. Hay tres formas, que se pueden combinar:

| Forma | Cuándo se usa | Qué se escribe en la demanda |
| --- | --- | --- |
| **Dos planes a la vez** | La herramienta se tiene bajo más de un plan en un mismo mes: un asiento anual y, además, uno mensual en ciertos meses | Una asignación por plan, cada una con su `priceId` |
| **Un asiento ocioso** | Se paga un asiento que ese mes nadie usa | En la asignación de ese plan, `idleSeats` (cuántos) e `idleReason` (por qué se paga igual) |
| **Un asiento compartido** | Dos o más personas usan el mismo asiento | Una entrada en `seatSharing` con la herramienta, los meses, las personas y el motivo |

La regla que las une: **en cada mes, los asientos pagados menos los declarados ociosos son exactamente los que se
necesitan**, contando una vez a cada persona que no comparte y una vez a cada grupo que comparte. Si falta un
asiento, o si sobra uno que nadie explicó, la cotización no calcula. El cotizador no completa la cuenta por su
lado: no supone que un asiento sobrante está ocioso ni que dos personas se turnan uno.

**Un ejemplo, en palabras.** Un servicio gestionado de doce meses. Una persona atiende la herramienta todo el año;
una segunda persona la refuerza sólo en los cinco meses de campaña. La herramienta se paga por asiento. Hay tres
maneras reales de comprarla, y las tres se pueden cotizar:

1. **Un asiento, compartido.** Se paga un asiento todo el año y las dos personas lo usan por turnos en los meses de
   campaña. La demanda declara un asiento en cada mes y, para los cinco meses de campaña, un grupo de `seatSharing`
   con las dos personas y el motivo. En esos meses el grupo cuenta como un asiento y cada persona carga la mitad; en
   los otros siete, el asiento es entero de la primera. Lo que hay que confirmar fuera del cotizador es que el
   proveedor permita que dos personas usen un asiento nominativo.
2. **Un asiento anual y uno mensual en campaña.** La primera persona tiene un asiento anual; para la segunda se
   contrata un asiento mensual sólo en los cinco meses de campaña. La demanda declara el plan anual en los doce meses
   y, en los cinco de campaña, una segunda asignación de la misma herramienta con el plan mensual. En esos meses hay
   dos asientos pagados y dos personas: la cuenta cierra sin nada ocioso.
3. **Dos asientos anuales, uno ocioso parte del año.** Los dos asientos se compran por el año. La demanda declara dos
   asientos en los doce meses y, en los siete meses en que la segunda persona no trabaja, un asiento ocioso con su
   motivo. El costo de ese asiento no desaparece: se queda en la cotización, sobre las líneas que usan la
   herramienta, y la lectura de compromisos lo muestra aparte como siete meses-asiento pagados que nadie usa.

Las tres dan costos distintos, y por eso importa declarar la que de verdad se va a comprar. Cuál conviene es una
decisión de compra del operador, no del cotizador. Lo que nunca se hace para que la cuenta cierre es quitarle a una
persona la tarea que le pide la herramienta: la demanda diría que esa persona no la usa, y el costo quedaría fuera
de la cotización.

Un caso más, menos frecuente: un mes en que nadie usa la herramienta y el asiento se paga igual. Todos los asientos
de esa asignación se declaran ociosos, y como no hay líneas que la usen, la asignación nombra en `bornByLineIds` las
líneas que cargan ese costo, en partes iguales.

Qué no resuelve el cotizador: si el proveedor permite compartir un asiento, y si un asiento ocioso se puede soltar,
pausar o reasignar mientras tanto. Son condiciones del contrato con el proveedor. La cotización registra lo que se
declaró y su motivo, y `compose assess` las lista como puntos por confirmar.

Reglas, claves y diagnósticos:
[contrato](cotizador-v3-contrato-y-validacion.md#demanda-de-composición-asientos-y-períodos-declarados-una-vez-2026-10-11).
Cómo se declara paso a paso:
[manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#declarar-los-asientos-de-una-herramienta).

## Asientos de una persona a tiempo parcial, precios sin importe y lo que el trabajo agrega (2026-10-11)

Tres puntos que aparecieron al cotizar negocios reales con sólo la documentación a la vista. Ninguno cambia una
regla: dicen cómo se aplica.

**Cuántos asientos se pagan y cuánto carga la cotización son dos datos.** El primero (`quantity`) es siempre un
número entero en una herramienta nominativa. El segundo (`serviceShare`, con su `driver`) lo declara la demanda y
puede ser una fracción; la CLI sólo comprueba que sea `allocatedUnits ÷ totalUnits`, truncado a 18 decimales, y
bloquea con `ALLOCATION_DRIVER_MISMATCH` si no. Los ejemplos versionados lo aplican así:

| Caso | Qué declara el ejemplo |
| --- | --- |
| Una persona dedicada a la cuenta (`designer-on-demand`) | Un asiento de Notion y uno de Microsoft 365, cargados enteros |
| Personas compartidas con otras cuentas (`managed-addon-increment`: 1, 0,2 y 0,1 de dedicación) | Tres asientos de cada herramienta base, y la cotización carga 1,3 de 3: de cada asiento, la parte igual a la dedicación declarada |
| Un asiento comprado para el servicio (la bandeja de los ejemplos `managed-care`) | Un asiento por persona, cargado entero aunque la persona trabaje una fracción de su tiempo |
| Una licencia de un paquete (Adobe en `designer-on-demand`) | Una de las tres licencias: un tercio del paquete, que es un dato de la compra y no una fracción de horas |

Ningún ejemplo versionado tiene una persona compartida con licencia de Adobe: en ese caso se carga la licencia
entera (una de tres) y se informa como supuesto; cargarla por dedicación lo decide el operador. Dentro de la
cotización, el costo de una herramienta se reparte entre las líneas que la usan por asiento, no por horas.

**Un precio puede no tener importe.** `resources inspect` muestra cada precio de una herramienta con su
disponibilidad: `needs_input` (una asignación no puede nombrarlo ese día: está pendiente, fuera de vigencia, su
registro no trae monto o se cobra una sola vez; desde el cierre del 2026-10-11 es la misma lectura con que la
composición pone precio) o `reference_only` (tiene un importe vigente; es una referencia porque un precio no prueba
que el asiento exista ni que el plan sea el contratado). `historical` es el nombre de un precio: el valor del Excel histórico,
marcado estimado. En la policy vigente (v11, leída con `--date 2026-10-12`), el precio `current` de 22 de las 33 herramientas está en
`needs_input`; HubSpot no tiene ningún precio con importe, a propósito. La demanda
nombra entonces otro precio de la misma herramienta —un plan público o el histórico— y esa elección es un supuesto
de la cotización que se informa. Nombrar un precio pendiente bloquea con `RESOURCE_PRICE_PENDING`; uno que no
existe, con `RESOURCE_PRICE_SELECTION_REQUIRED` y los precios utilizables en `candidates`.

**El andamio pregunta por lo que el brief permite saber.** `compose scaffold` recibe sólo un brief: pregunta por
las herramientas base (Notion y Microsoft 365) y por las de las tareas de la receta de cada perfil. Lo que el
trabajo agrega se declara en `work[]`: tareas más allá de la receta del perfil (`tasks`, que el andamio deja vacío
desde el cierre del 2026-10-11), herramientas de IA con su motivo (`aiToolIds`, `aiSelectionReason`) y, para un
servicio, `serviceToolIds`. Se declara sólo lo que el negocio
compromete. Una herramienta de créditos pide además su demanda (`work[].creditDemand`, créditos enteros por
proveedor y mes) y su presupuesto (`creditBudgets`, uno por herramienta y mes, con fechas dentro del mes
calendario de ese período contado desde la fecha de la cotización).

**Una herramienta que aporta el cliente** se declara sólo con evidencia confirmada que cubra todo el uso. Sin ella,
`CLIENT_ACCESS_EVIDENCE_REQUIRED` dice desde el 2026-10-11 qué parte falla; la herramienta se deja fuera del
trabajo —excluyendo con su motivo la tarea que la pide— y se dice en las condiciones del documento que la aporta el
cliente.

Paso a paso: [manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#paso-2--componer-la-demanda).

## Evidencia de la asignación, precios utilizables y cuentas de asientos (2026-10-11, cierre)

Tres agentes repitieron los mismos negocios con la documentación reescrita y sin abrir el código. Lo que todavía
tropezó en la selección de herramientas es lo que sigue. Es aditivo: ninguna policy cambió y todas las cotizaciones
congeladas se reproducen igual.

**De dónde sale una asignación es un dato, no una frase.** Cada asignación de la demanda admite `evidence`
(referencia, vigencia y estado): el plan contratado, sus asientos y la parte que carga la cuenta, y si eso está
confirmado. No bloquea ni cambia ningún costo. `compose assess` levanta `ALLOCATION_EVIDENCE_REQUIRED` por cada
herramienta cuya asignación no la declara, la declara sin confirmar o con una vigencia que no incluye la fecha de la
cotización. Antes esa brecha dependía de que el `reason` contuviera ciertas palabras en inglés; ya no se lee lo que
dice. Una hipótesis se declara `estimated` y la brecha lo informa; `confirmed` corresponde sólo con la factura o la
consola del proveedor a la vista. Las herramientas que se compran en créditos no llevan asignación ni esta brecha.
Ninguna demanda versionada de `data/pricing/v3-operating/` declara `evidence`: son anteriores al campo.

**El andamio ofrece sólo los precios que sirven.** La pregunta de cada herramienta trae en `candidates` los precios
que una asignación puede nombrar a la fecha de la cotización, y en `unavailablePrices` los demás, cada uno con el
diagnóstico que daría nombrarlo y su motivo. No toda herramienta tiene un precio llamado `current`: Claude Team,
Vercel, GCP, los créditos de Notion y el consumo de agentes sólo tienen precios con otro nombre.

**Lo que escribe el andamio en `work[]`.** `tasks` viene vacío: la receta del perfil se aplica sola y sale en la
pregunta de la línea (`profileTasks`); en `tasks` van sólo las tareas del trabajo más allá de la receta, y una tarea
de la receta se quita sólo con `excludedProfileTasks`. `assigneeIds` trae un cupo por persona
(`planned-<lineId>-<n>`), que se queda mientras nadie esté asignado y se reemplaza por un id anónimo estable sólo
cuando hay una persona específica asignada. Los asientos se cuentan por id distinto.

**Tres campos de una asignación que no estaban explicados.**

| Campo | Cuándo se declara | Qué pasa si falta |
| --- | --- | --- |
| `seatCapacity` | Una herramienta nominativa con precio por paquete (`basis` `package`): Adobe, y también los precios `historical` de Notion o de Figma. Es cuántas personas sienta lo que se compra | `INSUFFICIENT_NAMED_SEAT_CAPACITY`; si supera los asientos incluidos del plan por la cantidad de paquetes, `PACKAGE_SEAT_CAPACITY_EXCEEDED` |
| `contractSeatCount` | Un precio que se vende con un mínimo de asientos por contrato (`minimumContractSeats`: 2 en los planes de equipo de ChatGPT y de Claude). Es cuántos asientos tiene el contrato entero | `TEAM_CONTRACT_CAPACITY_REQUIRED`. No mueve el costo, que sigue siendo cantidad por precio por parte atribuida |
| `driver` en horas | Una persona a tiempo parcial: `totalUnits` las horas de un mes a tiempo completo y `allocatedUnits` las de la cotización. `driver.unit` es un nombre libre | Nada: el cotizador sólo comprueba que `serviceShare` sea el cociente |

**Los diagnósticos de asientos traen sus cuentas.** `INSUFFICIENT_NAMED_SEAT_CAPACITY` dice en `detail` cuántos
asientos necesita el período y cuántos provee la demanda; `TEAM_CONTRACT_CAPACITY_REQUIRED`, el mínimo del plan, los
asientos que la asignación sienta y el menor `contractSeatCount` que sirve.

**Herramientas compartidas y del servicio.** Una herramienta compartida (SEMrush, HubSpot, Metricool) se declara con
los paquetes que se pagan y la parte que carga la cotización. No hay regla para el denominador —cuentas, proyectos,
usuarios o consumo—: es un supuesto que se escribe en `driver` y en `reason` y se informa. `serviceToolIds` nombra
las herramientas que usa el servicio y no la tarea de una persona: entran en todas las líneas de la cotización y su
costo se reparte entre ellas.

**Una persona más sobre una suscripción de créditos que ya existe.** Su presupuesto declara cuántos créditos de la
suscripción mensual quedan libres para la cotización y cuántos toma; el resto se compra en packs. Cuántos quedan
libres no está medido: es una hipótesis que se informa como tal.

Reglas y claves: [contrato](cotizador-v3-contrato-y-validacion.md#evidencia-de-una-asignación-allocationsevidence-2026-10-11-cierre).
Paso a paso: [manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#paso-2--componer-la-demanda).
