# Equipos humano-agente — investigación para la práctica RevOps & CRM

> Corte: 2026-09-19 · Estado: investigación, no disponibilidad contractual ni oferta aprobada.
> Decisión que habilita: diseñar una oferta de transformación que vaya más allá de readiness y configuración de agentes.

## Hallazgo

**Convergencia de mercado (confianza alta):** los proveedores desplazan el valor desde registrar datos y usar una UI fija hacia trabajar con contexto compartido, agentes que ejecutan jobs, coordinación entre ellos y acceso al sistema desde otras interfaces. HubSpot presenta Growth Context, Smart CRM que se actualiza, Breeze Assistant y un *agentic team*. Salesforce presenta AIforce como capa que expone datos, lógica, permisos y acciones a las interfaces donde trabajan personas y agentes; Agentforce suma agentes por job y orquestación multiagente. Son estrategias distintas, no paridad funcional ni licencia equivalente.

**Inferencia de Efeonce (confianza media; requiere validación comercial):** el trabajo de mayor valor para un partner será rediseñar procesos y equipos humanos alrededor de esta capacidad, no sólo preparar datos o activar productos. Microsoft denomina *Work Chart* al cambio de funciones estáticas a equipos organizados alrededor del trabajo; su investigación describe la colaboración humano-agente como una transformación de roles, handoffs y estándares, pero no prueba demanda pagada específica para Efeonce. NIST AI RMF pide roles y supervisión diferenciados para configuraciones humano-IA y medición continua del riesgo. Ninguna fuente prueba por sí sola un precio, margen o ROI de nuestra oferta.

## Qué está verificado y qué no

| Afirmación | Evidencia y límite |
| --- | --- |
| HubSpot articula un equipo agéntico sobre contexto compartido. | Spotlight/partner enablement, septiembre 2026. Agent Hub y Agent Builder constan como **public beta** para clientes elegibles; no implica disponibilidad en cada portal, créditos incluidos ni SLA. |
| Salesforce anuncia AIforce y agents orientados a jobs, con Multi-Agent Orchestration **GA** según su newsroom. | Anuncios de 11 y 15 de septiembre. GA del componente no valida entitlement, integración, región ni runtime del cliente. Hunter aparece en piloto; AI Skills y Agent Optimizer tienen fechas posteriores. |
| El rediseño del trabajo importa tanto como la tecnología. | Microsoft Work Trend Index 2025/2026 y NIST AI RMF; evidencia de investigación y marco, no causalidad universal ni garantía de resultados. |
| Hay una oportunidad comercial para Efeonce. | **Hipótesis** de posicionamiento: validar con entrevistas, diagnósticos pagados, primer equipo en producción, renovación y margen. No se infiere del número de asistentes a eventos ni de métricas promocionales de vendors. |

## Implicaciones para el diseño del servicio

1. **Unidad de diseño: workflow, no bot.** Mapear disparadores, decisiones, datos, acciones, excepciones y interfaces desde el resultado del cliente hacia atrás. Distinguir automatización determinista, copiloto, agente delegado y decisión exclusivamente humana.
2. **Organigrama híbrido operativo.** Nombrar sponsor, dueño del proceso, operadores, responsable de conocimiento, seguridad/datos y responsable de operación de agentes. A cada agente asignar job, autoridad, contexto, herramientas, límites, dueño humano, handoff y criterio de retiro. El agente no es persona jurídica ni reemplaza accountability.
3. **Autonomía proporcional al riesgo.** Read-only → borrador/propuesta → acción reversible con límites → acción externa o sensible con aprobación. La progresión exige evidencia, no se concede por el nombre del producto. Las salidas de impacto legal, financiero, reputacional o irreversible requieren controles específicos.
4. **Capacidad de supervisión.** El cuello de botella puede moverse del trabajo repetitivo a revisión, excepciones y mantenimiento del conocimiento. Medir carga de revisión, tasa de escalamiento, error escapado, rework y tiempo efectivo liberado; no maximizar agentes por empleado como objetivo en sí.
5. **Operación y cambio.** Rediseñar rituales, capacitación, estándares de calidad, soporte, gestión de incidentes, comunicaciones a clientes y mejora continua. Si el equipo humano no cambia cómo trabaja, la activación técnica no equivale a transformación.
6. **Economía completa.** Separar honorarios de diseño/implementación/operación, licencias, créditos/consumo, integraciones, costo de supervisión humana, error/recuperación, seguridad y change management. Medir costo por outcome válido, no sólo costo por invocación.

## Hipótesis a validar con clientes

- El primer buyer puede ser COO, CRO, CMO o líder de Servicio; el sponsor debe compartir autoridad con el owner del proceso y el responsable de riesgo.
- Un blueprint autónomo se paga si permite decidir roles, inversión, controles y secuencia aunque Efeonce no implemente.
- La expansión desde un equipo en producción hacia varias áreas vale más que vender agentes aislados, pero aumenta carga de change management, integración y assurance.
- Los segmentos HubSpot-first y Salesforce-first pueden comprar el mismo método con arquitecturas y riesgos de delivery diferentes; el híbrido requiere autoridad explícita por sistema.

## Fuentes primarias consultadas

- [HubSpot Fall 2026 Spotlight](https://www.hubspot.com/company-news/fall-26-spotlight) y [Partner Enablement Kit](https://offers.hubspot.com/fall-2026-spotlight-partner-enablement-kit), septiembre 2026.
- [HubSpot Agent Hub y Agent Builder](https://www.hubspot.com/company-news/meet-agent-hub-and-agent-builder), julio 2026; [documentación Agent Builder](https://knowledge.hubspot.com/ai/create-and-customize-agents-in-the-agent-builder).
- [Salesforce AIforce](https://www.salesforce.com/news/stories/aiforce-announcement/), septiembre 2026; [Agentforce job-ready agents y orquestación](https://www.salesforce.com/news/stories/agentforce-job-ready-ai-agents/), septiembre 2026.
- [Microsoft Work Trend Index 2025](https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born) y [2026](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization). Investigación del propio proveedor; útil para dirección, no para prometer resultados.
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) y [human-AI interaction](https://airc.nist.gov/airmf-resources/airmf/appendices/app-c-ai-risk-management-and-human-ai-interaction/). Marco voluntario; no equivale a certificación o cumplimiento legal.

## Siguiente prueba

Discovery con operadores y buyers de cuentas reales → al menos un blueprint pagado → primer workflow en producción con baseline, evaluación, adopción, incidentes, economics y decisión de expansión. Sin esas pruebas, mantener la oferta como `Approved for validation`, no como Product Service comercialmente aprobado.
