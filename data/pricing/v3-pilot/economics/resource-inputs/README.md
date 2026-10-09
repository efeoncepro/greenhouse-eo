# Antecedentes de recursos y plataforma

TASK-2017, revisión local. [Declaración del operador2026-10-09](2026-10-09-operator.json) incorpora Higgsfield, Magnific, Adobe y costos Vercel/GCP. Fuente directa del operador; facturas/entidad/impuestos no verificados. No input CLI, catálogo comercial ni registro de asignaciones live.

Los importes actuales declarados se separan de proyecciones y reglas propuestas. Magnific conserva EUR; no se usa FX histórico del Excel. Adobe conserva180 actuales, seis licencias de dos planes y aumento70% con cobertura/fecha pendientes; frecuencia mensual por contexto aún por confirmar.306 sólo es proyección si180 es la base afectada. No aplicar desde hoy ni sumar Express dos veces.

Vercel60–100 y GCP264 son mensuales, confirmados por el operador: pool324–364USD/mes. Reparto entre servicio e interno pendiente;100Vercel sólo escenario conservador. No existe costo confirmado por cliente.

## Uso por agentes

Las capturas posteriores completan [paquetes extra y planner IA](../../../v3-resources/README.md): suscripción y compra incremental separadas. Planner local operativo, sin import automático al catálogo monetario ni reservas live.

1. Leer estos inputs junto al [catálogo local](../../../v3-catalog/README.md), conservando fuente/fecha. No sustituir versiones ni quotes anteriores.
2. Completar planes, alcance contractual, fechas, asignaciones nominativas, seats libres y políticas de reparto con evidencia. `null` es desconocido; ausencia de nombres no significa cero asignaciones ni seats libres.
3. Para IA, validar créditos incluidos/reset/excedentes y presupuestar consumo por servicio. Cuota fija y consumo no se suman duplicados; crédito proveedor no es precio público, pieza, hora ni crédito comercial Efeonce.
4. Finance/Operations convierte sólo valores normalizados en nuevos registros/kit mediante [mantenimiento](../../../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md). Rangos, créditos y drivers no tienen import automático en el kernel actual.
5. Elegir nueva versión explícita, cotizar y explicar; aprobar precio requiere validar además todos los otros costos/políticas. Nada se escribió a DB/Greenhouse ni a cuentas proveedor.

[Tratamiento de costos compartidos](../../../../../docs/documentation/finance/cotizador-v3-provisiones-y-costos.md#licencias-y-plataforma-declaradas-por-el-operador).

Verificación local: JSON/5registros, aritmética306 y pool324–364, asignaciones desconocidas y enlaces válidos; Excel, catálogos baseline/candidato y nueve artefactos piloto intactos frente a Git. Task lint0errores/0warnings. Sin cambios de código; no requiere repetir tests del kernel. La promoción/asignación comercial sigue pendiente.
