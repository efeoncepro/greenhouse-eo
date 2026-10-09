# Composición local V3: herramientas por demanda

[Superficie V3 implementada y frontera comercial](../../../docs/documentation/finance/cotizador-v3-superficie-implementada.md). Este conjunto conserva su versión/caso original; las fuentes y la policy operativa sucesora se seleccionan explícitamente y no alteran resultados congelados.

TASK-2021. [Manual](../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md) y
[ADR](../../../docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md).
`resources.review-v1.json` es policy ejecutable de revisión; el catálogo monetario y de créditos se selecciona
por separado. No lee Excel ni declaraciones raw en runtime. Motor puro; CLI primer consumer.

Policy inicial para Copywriter, diseñador senior y SEO Specialist; otros perfiles bloquean hasta completar sus reglas.
Base común Notion/Microsoft 365; tareas/perfil agregan SEMrush o Adobe; IA por selección justificada o tarea
visual; plataforma según servicio. Costos desde referencias de catálogo o variantes declaradas con fuente.
Cambiar policy/precios requiere versión nueva explícita; no altera artifacts existentes.

## Casos de simulación verificados

Un mes, talentoCO→mercadoCL,50% por rol, país del costo histórico desconocido autorizado como simulación.
El precio sale de política histórica del catálogo, no margen objetivo/piso propuestos. Setup de prueba incluido
en el mes; Assurance/operación siguen placeholders, no costos medidos. No impuestos determinados.

| Caso                                             | Herramientas seleccionadas                                   | Costo total USD | Neto simulado USD |
| ------------------------------------------------ | ------------------------------------------------------------ | --------------: | ----------------: |
| [Redactor SEO](seo-writer.demand.json)           | Notion, M365, SEMrush, Claude Standard mensual               |        1.038,00 |          1.297,50 |
| [Diseñador](designer.demand.json)                | Notion, M365, Adobe histórico, ChatGPT histórico, Higgsfield |          996,78 |          1.295,81 |
| [Servicio SEO multirol](seo-service.demand.json) | Notion, M365, SEMrush,2 seats Claude, Vercel/GCP compartidos |        2.048,40 |          2.945,22 |

Artefactos congelados: [redactor](seo-writer.artifact.json), [diseñador](designer.artifact.json),
[servicio](seo-service.artifact.json). Replay verificado; son internos/requires_review, sin precio aprobado.
El identificador de oferta `talent-assurance-staffing` se conserva sólo para seleccionar la policy de pricing
histórica del ensayo; `commercialUnit=managed_service` preserva el servicio y no valida precio/contrato de éste.

Asignaciones **hipotéticas** explícitas: Notion 25%, M36520%, SEMrush 10%, Vercel/GCP10%; todas usan driver
de 100 unidades y asignación 25/20/10 respectivamente, no cartera medida. Seats/capacidad son slots de prueba,
no personas o permisos reales. Diseñador usa Adobe 80 históricos al 25%, no los 180 actuales sin desglose.
Redactor usaClaude 25 USD público para un seat; servicio dosseats 50, contrato 2 declarado en el ejemplo, no factura.

Higgsfield:1000 créditos previstos,400 de cuota disponible declarada;600 extra requieren 500+100 por 32,25 USD.
Cuota atribuida 18,53; presupuesto total 50,78 integrado al quote y compra adicional 32,25 separada.
Magnific está conectado al mismo planner/kernel, pero EUR/FX falta en baseline; seleccionarlo devuelve
pendiente hasta aportar catálogo con moneda y tasa de fuente explícita. TestEURusa 1,1 sintético, nunca tasa real.

Fuentes de normalización: [costos operador](../v3-pilot/economics/resource-inputs/2026-10-09-operator.json),
[reglas](../v3-pilot/economics/resource-inputs/tool-selection.operator-2026-10-09.json),
[Claude público](../v3-pilot/economics/resource-inputs/claude-team.public-pricing-2026-10-09.json),
[baseline](../v3-catalog/catalog.review-v1.json) y [packs](../v3-resources/ai-credits.review-v1.json).
No son factura/inventario actuales; priceId=current pendientes no tienen fallback automático.
