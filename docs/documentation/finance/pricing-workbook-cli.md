# Costear y explorar precios sin la UI del cotizador

Para cotizar sin leer el Excel y componer herramientas por trabajo, usar el [flujo local Cotizador V3](cotizador-v3-superficie-implementada.md) y su [manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Este documento conserva el carril histórico `pricing:workbook`, con fórmulas/overrides propios; no sustituye el catálogo versionado V3 ni el lifecycle del cotizador canónico.

La CLI local `pricing:workbook` permite trabajar desde el Excel de Julio sin depender de la UI,
la DB o una sesión del portal. Sirve para revisar la base histórica, introducir costos actualizados,
armar un equipo y comparar precios a distintos márgenes. Está disponible en el checkout local.

## Qué entrega

- Búsqueda de roles, herramientas, servicios y gastos adicionales por nombre o SKU.
- Costos desglosados, fórmulas y celdas de origen; recargo histórico separado de margen sobre venta.
- Auditoría de cachés de roles, tiers contradictorios, reglas desconectadas y servicios sin costeo.
- Escenarios de un perfil o equipos con varios perfiles, gastos mensuales y setup amortizado.
- Comparación de márgenes sobre el mismo plan; salida JSON para Codex, Claude y otros agentes locales.

El Excel es un punto de partida, no una obligación: `roleCostOverrideUsd` permite reemplazar su costo
por uno declarado en el JSON del plan, con referencia y fecha. No se modifica el libro ni su catálogo.
Estos costos son declarados por el operador; la herramienta no los verifica contra payroll.

## Cómo se calcula

Capacidad dedicada absorbe el costo completo de la persona aunque el plan pida menos horas.
Capacidad compartida asigna `costo mensual × horas pedidas / horas vendibles`; exige asumir explícitamente
que se vende el resto. Las horas vendibles deben descontar formación, ausencias y trabajo interno.
Las horas laborales del libro son el límite de referencia, no una garantía de disponibilidad.

Se suman gastos declarados para este plan y setup amortizado. Luego:

`precio mensual USD = costo declarado / (1 − margen objetivo − fee transaccional sobre venta)`

No se aplica automáticamente el recargo legacy ni los porcentajes manuales del Excel. Debes convertir
las reservas de gestión, capacitación, continuidad, herramientas y overhead a costos explícitos del plan.
Evitar duplicar costos ya contenidos en el costo mensual del rol, especialmente Deel y comisiones.

## Estados y límites

Los ejemplos incluidos son hipotéticos; no prueban salarios, reservas o tarifas vigentes.
`historical_unapproved` identifica consultas al Excel; `hypothesis_only`, resultados de cálculo.
No existe aprobación por calcular un precio. El resultado deja visibles fuente, fecha, supuestos,
capacidad y advertencias. No calcula impuestos, FX actual, licencias del cliente o consumos de proveedores
que no se hayan incluido como gastos. No crea ni envía una cotización.

La CLI proporciona la alternativa local de costeo solicitada. El motor y catálogo del portal conservan
su contrato para documentos y transacciones persistidas. No se diagnosticó ni corrigió la UI en esta entrega.

## Documentos relacionados

- [Manual y ejemplos](../../manual-de-uso/finance/consultar-excel-pricing-por-cli.md)
- [Contrato técnico](../../architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md)
- [Pricing comercial del portal](pricing-comercial.md)
