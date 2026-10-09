# Antecedentes de recursos y plataforma

[Superficie V3 implementada y frontera comercial](../../../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

TASK-2017, revisión local. [Declaración del operador 2026-10-09](2026-10-09-operator.json) incorpora Higgsfield, Magnific, Adobe y costos Vercel/GCP. Fuente directa del operador; facturas/entidad/impuestos no verificados. No input CLI, catálogo comercial ni registro de asignaciones live.

Los importes actuales declarados se separan de proyecciones y reglas propuestas. Magnific conserva EUR; no se usa FX histórico del Excel. Adobe 180 USD/mes cubre todo el paquete 3 CC Teams+3 Express, confirmado posteriormente por el operador.306 es escenario del alza 70% con fecha/términos de renovación aún pendientes. La declaración raw anterior queda como antecedente histórico; la confirmación posterior está normalizada en la policy operativa. No aplicar desde hoy ni sumar Express dos veces.

Vercel 60–100 y GCP264 son mensuales, confirmados por el operador: pool 324–364 USD/mes. Reparto entre servicio e interno pendiente;100 Vercel sólo escenario conservador. No existe costo confirmado por cliente.

## Uso por agentes

Las [reglas de selección confirmadas](tool-selection.operator-2026-10-09.json) agregan Notion/Microsoft 365
como base común y SEMrush para redacción SEO; Adobe/IA dependen del trabajo. Incluyen Claude Team con
[cuatro referencias públicas verificadas](claude-team.public-pricing-2026-10-09.json), separadas de gasto
real/asignaciones aún desconocidos. [Reglas y límites](../../../../../docs/documentation/finance/cotizador-v3-seleccion-herramientas.md).
Estos JSON tampoco son inputs ejecutables ni actualizan kits automáticamente.

Las capturas posteriores completan [paquetes extra y planner IA](../../../v3-resources/README.md): suscripción y compra incremental separadas. Planner local operativo, sin import automático al catálogo monetario ni reservas live.

1. Leer estos inputs junto al [catálogo local](../../../v3-catalog/README.md), conservando fuente/fecha. No sustituir versiones ni quotes anteriores.
2. Completar planes, alcance contractual, fechas, asignaciones nominativas, seats libres y políticas de reparto con evidencia. `null` es desconocido; ausencia de nombres no significa cero asignaciones ni seats libres.
3. Para IA, validar créditos incluidos/reset/excedentes y presupuestar consumo por servicio. Cuota fija y consumo no se suman duplicados; crédito proveedor no es precio público, pieza, hora ni crédito comercial Efeonce.
4. Finance/Operations convierte sólo valores normalizados en nuevos registros/kit mediante [mantenimiento](../../../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md). Rangos, créditos y drivers no tienen import automático en el kernel actual.
5. Elegir nueva versión explícita, cotizar y explicar; aprobar precio requiere validar además todos los otros costos/políticas. Nada se escribió a DB/Greenhouse ni a cuentas proveedor.

[Tratamiento de costos compartidos](../../../../../docs/documentation/finance/cotizador-v3-provisiones-y-costos.md#licencias-y-plataforma-declaradas-por-el-operador).

Verificación local: JSON/5 registros, aritmética 306 y pool 324–364, asignaciones desconocidas y enlaces válidos; Excel, catálogos baseline/candidato y nueve artefactos piloto intactos frente a Git. Task lint 0 errores/0 warnings. Sin cambios de código; no requiere repetir tests del kernel. La promoción/asignación comercial sigue pendiente.

## Integración local TASK-2021

[Policy y compositor ejecutables](../../../v3-composition/README.md) normalizan selección/precios de revisión y unen herramientas, cuotas de plataforma declaradas y presupuesto IA al kernel. Estos antecedentes raw no se importan automáticamente. Adobe current sigue bloqueado en esa baseline review-v1; la [sucesora operativa](../../../v3-operating/README.md) modela el paquete confirmado sin alterarla. Claude público y datos históricos/asignaciones de ensayo no acreditan gastos actuales. Baseline/quotes previas intactas; economía TASK-2017 parcial.
