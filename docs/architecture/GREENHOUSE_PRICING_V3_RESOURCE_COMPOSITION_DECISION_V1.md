# Pricing V3 — composición de recursos por demanda

- Status: Accepted para prototipo local, dirección autorizada por operador2026-10-09.
- Owner: Operations/Finance para reglas/costos/asignación; Platform para contrato.
- Work unit: TASK-2021.
- Predecessors: catálogo/mantenimiento V3 y presupuesto IA; no los sustituye.

## Decision

Policy de recursos versionada separada del catálogo monetario y crédito. Demanda declara perfiles/tareas,
slots de usuarios, selección IA, créditos y asignaciones por mes; no precios. Selección aplica base universal,
reglas de perfiles/tareas y elecciones explícitas. No confundir Copywriter con SEO Specialist ni cambiar salario
por requerir SEMrush. Cliente aporta alcance; catálogo/policy aportan valores y reglas.

Resolver primero componentes humanos y no-tool del kit elegido. Compositor inyecta recursos/asignaciones
normalizados en snapshots por periodo y reusa orquestador/kernel V3 para precio, márgenes y FX. Ninguna fórmula
comercial pertenece al agente o CLI. Baseline y formato legacy permanecen intactos; el nuevo artefacto congela
catálogo monetario, policy, créditos, demanda, selección y resultado para explain/replay independiente.

Cada precio tiene unidad/fuente/vigencia. Variantes múltiples requieren elección, no opción barata implícita.
Pool exige cantidad de paquetes/seats y cuota atribuida con razón; asignación dentro del quote pondera usuarios
únicos, reparto entre funciones de una misma persona explícitamente trazable. Licencias nominativas no se
comparten entre usuarios: cantidades requeridas por usuarios únicos. No reducir licencias por FTE. Pools de
plataforma requieren driver y capacidad externos al quote; no se inventa denominador de cartera ni se duplica
el costo íntegro por persona. Reconciliación es local al input, no reserva global.

Créditos se agregan por proveedor/mes antes de planear un paquete; consumo por función distribuye costo del
presupuesto con remanente visible. Saldo disponible declarado, no live. Cuota atribuida y nueva compra se
separan; caja modelada del kernel no es factura ni gasto incremental. No reutilizar créditos/paquetes fuera de
su ventana ni asumir remanente de otro cliente. FX requiere referencia explícita cuando se agrega otra moneda.

Servicios conservan unidad comercial/alcance; el quote de capacidad es costeo interno y no certifica venta por
hora, suficiencia de delivery o términos contractuales. Composición local es sólo simulación/requires_review;
planes nuevos/desconocidos, históricos y reparto sin confirmar no se convierten en costo operativo aprobado.

## Boundaries and failure

Dominio browser-safe, Zod/Decimal existentes; hash/FS sólo adapter/CLI. Sin DB/API/UI/MCP/provider writes,
compra, asignación live ni export público. Faltante/ambigüedad, usuarios inconsistentes, asignación sobrante,
consumo inválido, FX ausente o fecha incompatible → needs_input, sin total completo. Ningún precio inline.
Tool común obligatoria no desaparece por usar otro PMS cliente. Reemplazo de cuotas/precios exige versión nueva;
quotes anteriores sólo se verifican desde sus propios datos congelados.

## Verification / alternatives

Tres escenarios de selección, asignación y costo (SEO, diseño y servicio multirol), negativos, replay y
regresiones legacy. Rechazado: sumar todas las tools a todos, fórmulas en CLI, actualizar baseline in-place,
usar divisores históricos como permisos de compartir seats o facturas actuales. Reabrir para promoción
comercial, inventario/portfolio live, contratos de licencias y consumers canónicos.

## Operación vigente y guardas ampliadas

La policy inicial de tres perfiles y sus artifacts se conservan inmutables. TASK-2022 añadió una sucesora de
revisión con reglas para los 32 perfiles históricos: [flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md).
Los 26 recursos originales se clasifican en 25 herramientas y un fee de plataforma genérico; ese fee permanece
en el resolvedor monetario y no se duplica como herramienta ni depende de una marca como Deel.

El compositor ahora verifica seats nominativos enteros, cantidad por usuarios únicos, capacidad de paquete y
mínimo de contrato de Team; paquetes combinados no permiten sumar otra vez el componente incluido. Cobertura
aportada por el cliente exige líneas, motivo y evidencia confirmada que abarque todo el período de actividad,
no sólo el día de cotización. No sustituye Notion/Microsoft 365 internos ni el planner de créditos. Cobertura
parcial excluye sólo sus consumidores; cobertura/asignación sobrante o duplicada se rechaza.

Portfolio deriva cuotas desde unidades declaradas reconciliadas por recurso/período/cuenta y conserva la parte
interna, no asignada y residual. El reparto dentro de la cotización continúa ponderando usuarios únicos de las
funciones consumidoras; no inferir dedicación real a partir de esa distribución. Seat individual necesita
asignación por usuario y no se convierte en pool de cartera. `assess` separa cálculo y preparación económica;
`preview` proyecta únicamente datos comerciales allowlisted y estado de simulación. Nuevas versiones de policy
no cambian quotes existentes y ninguna de estas guardas demuestra compra, acceso real o reserva global.
