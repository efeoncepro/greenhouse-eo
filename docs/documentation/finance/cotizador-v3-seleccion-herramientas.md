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
Las licencias nominativas se cuentan por usuarios distintos; no compartir identidades ni reducir un seat
al 50% por una dedicación parcial. Un mismo seat usado por una persona en varios servicios requiere reparto
documentado, no repetir su costo completo ni borrar todas las repeticiones por nombre del proveedor.
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
Usuarios únicos cuentan seats; varios roles comparten un pool según asignación declarada, sin descuento FTE.
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
