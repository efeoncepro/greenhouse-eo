# V3 — Selección de herramientas por trabajo

Fecha: 2026-10-09. Owner: Operations para necesidades/asignaciones; Finance para costos/reparto.
Requisitos confirmados bajo TASK-2017; composición local implementada bajo TASK-2021. Valores operativos e inventario live pendientes.
Se reutiliza el [ADR de catálogo y kits](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md).

## Necesidad antes de costo

Cada pedido combina base común, perfil, tareas y alcance del servicio. El agente interpreta el trabajo y
selecciona requisitos desde reglas documentadas; la CLI resuelve costos normalizados y calcula. Seleccionar
una herramienta no implica cobrar una suscripción completa nueva a cada cliente o persona.

Las [reglas legibles por agentes](../../../data/pricing/v3-pilot/economics/resource-inputs/tool-selection.operator-2026-10-09.json)
son antecedentes confirmados de necesidades, no un schema ejecutable, catálogo monetario ni input CLI.

| Recurso | Regla confirmada o pendiente |
| --- | --- |
| Notion | Requerido para todos los roles que participan: PMS de Efeonce |
| Microsoft 365 | Requerido para todos los roles que participan: base común de trabajo |
| SEMrush | Requerido en redacción SEO, según el ejemplo confirmado por el operador |
| Adobe | Redacción SEO sola no lo requiere; una tarea de producción visual puede justificarlo |
| Higgsfield y Magnific | Seleccionar por trabajo visual y presupuesto de consumo; asignaciones concretas pendientes |
| ChatGPT y Claude Team | Incluir licencia cuando el trabajo y la asignación la necesitan; planes y asignaciones pendientes |
| Vercel y GCP | Reparto de plataforma según cobertura del servicio y driver aprobado; no seat por persona |

Sólo Notion/Microsoft365 quedaron confirmados como universales. El operador añadió Claude Team al conjunto
de recursos que deben costearse; no definió uso universal, variante Standard/Premium ni que ChatGPT y Claude
sean obligatorios simultáneamente. Si una tarea necesita ambos se costean ambos con justificación; si una
alternativa cubre el requisito, la elección es explícita y no se decide sólo por el menor precio.

Notion del cliente u otro PMS no acreditan que desaparezca el requisito operativo Efeonce. Cualquier
excepción a la base requiere decisión explícita y cobertura suficiente; las opciones históricas
`allowClientProvided` del catálogo no prueban esa excepción ni un costo cero.

## Asignación y desglose

Separar quién necesita acceso, qué suscripción/seat lo cubre y qué parte de su costo corresponde al trabajo.
Las licencias nominativas se cuentan por usuarios distintos; no compartir identidades ni reducir un seat
al50% por una dedicación parcial. Un mismo seat usado por una persona en varios servicios requiere reparto
documentado, no repetir su costo completo ni borrar todas las repeticiones por nombre del proveedor.
Suscripción, periodo y asignación identifican el costo que se reconcilia; consumo IA y caja adicional tienen
tratamiento separado. Una licencia existente mantiene costo atribuible aunque no exija comprar otra.

El desglose esperado conserva para cada recurso: regla/razón, plan, usuario o grupo consumidor, cantidad,
periodo, costo original/moneda/fuente, driver y cuota asignada, costo del trabajo y saldo interno/no asignado.
Ausencias de precio o reparto producen pendiente; no precio cero ni porcentaje inventado. Los costos que
ya cubre otro componente no se suman de nuevo. En servicios se incluyen como costo interno, conservando
la unidad comercial de alcance/cadencia; el consumo de herramientas no obliga a vender horas personales.

Ejemplo de selección, sin precio: redactor SEO → Notion + Microsoft365 + SEMrush + IA elegida para el
trabajo. Adobe se omite si sólo redacta; Higgsfield/Magnific se agregan si también produce imágenes que lo
requieren. IA seleccionada aún necesita plan/asignación o créditos presupuestados explícitos.

## Claude Team: referencia pública

[Precios oficiales](https://claude.com/pricing), consultados2026-10-09: Standard25USD/seat/mes con pago mensual,
o equivalente20USD/mes con pago anual; Premium125USD/mes, o equivalente100USD/mes anual. Las anualidades
derivadas son240/1200USD por seat, no pagos mensuales de20/100. La
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
[policy sucesora](../../../data/pricing/v3-operating/README.md):32perfiles/25tools históricas más nuevos recursos,
feeETG-017 separado, portfolio de capacidad declarada, cobertura cliente, readiness y preview seguro.
Adobe180USD cubre3CC+3Express (operador confirmado),306 es escenario sin fecha conocida. Notion24/seat y
créditos30USD tienen respaldo de factura por periodo; públicoM365/SEMrush/ChatGPT/Claude sigue separado de gasto
real. EUR/FX referencial explícito permite simularMagnific. Planes, salarios, usuarios y cartera reales pendientes
quedan en evaluación; no inventario live o integración canónica. Legacy permanece intacto y TASK-2017 parcial.
