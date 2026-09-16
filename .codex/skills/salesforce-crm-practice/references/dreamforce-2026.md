# Dreamforce 2026 — lanzamientos y estado de evidencia

Investigación verificada el **2026-09-16** sobre los anuncios del 15 de septiembre de 2026. Este documento
es un ledger de producto, no una autorización comercial ni evidencia de disponibilidad para una org concreta.

## Lanzamientos y superficies

| Superficie | Qué aporta | Estado anunciado | Regla de uso |
|---|---|---|---|
| **AIforce** | Capa de interfaz para llevar datos, metadata, workflows, lógica, permisos, seguridad, gobierno y acciones de Salesforce a interfaces de IA | Presentado el 15/09; disponibilidad depende de cada superficie | Trátalo como arquitectura/producto paraguas, no como SKU único ni como reemplazo automático de Lightning |
| **Claudeforce / Salesforce in Claude** | Servidor MCP preconfigurado, Salesforce dentro de Claude, 37 skills de ventas y plug-in de Claude Code con más de 40 skills | Open beta para clientes; Salesforce menciona AppExchange y Claude Enterprise Marketplace | Beta no es GA; confirma región, contrato, cuenta Claude Enterprise, permisos y retención |
| **Slackforce** | Slack Surfaces e inteligencia de Salesforce dentro de conversaciones, workflows e interfaces interactivas | Parte del lanzamiento de AIforce; disponibilidad concreta por capacidad/entitlement | Verifica la feature en la org y el workspace; no asumas paridad con Claudeforce |
| **Agentforce Coworker** | Interfaz agentic junto a Lightning, con activación sin migración según Salesforce | Salesforce declara disponibilidad inmediata | Confirma entitlement, permisos, acciones, consumo y guardrails antes de comprometerlo |
| **Koa** | Modelo de razonamiento CRM construido sobre NVIDIA Nemotron 3 Super, orientado a tareas multistep y tool use | Pilotos seleccionados; GA prevista en invierno de 2026 en regiones de EE. UU. | No lo presentes como GA, modelo generalista ni sustituto de todos los modelos de Agentforce |
| **Missionforce + NVIDIA** | Modelos post-entrenados y cómputo acelerado para entornos privados, regulados y air-gapped | Missionforce Operations GA en EE. UU.; modelos NVIDIA para clientes seleccionados desde octubre de 2026 | Confirma producto, región, entorno de despliegue y requisitos regulatorios; no extrapoles a CRM estándar |

## Cambios de Agentforce mostrados o anunciados en la misma ventana

Salesforce presentó agentes orientados a trabajos concretos: Casey (help), Paige (IT/RR. HH.), Carter (shopper),
Hunter (outbound sales), Marshall (supply chain), Piper (inbound pipeline) y Fin (customer operations).
La cartera incorpora un runtime de largo horizonte, con memoria, ejecución durable y dirección dinámica. Casey,
Paige, Carter, Marshall, Piper y Fin se anunciaron como GA; Hunter quedó en piloto con GA prevista para noviembre
de 2026. Multi-Agent Orchestration se anunció como GA; AI Skills y Agent Optimizer quedaron para piloto/GA
posterior. Verifica release notes y contrato antes de vender cualquiera de estas capacidades.

## Interoperabilidad anunciada el 15/09

- **AWS:** Salesforce en Amazon Quick, agentes AWS en Slack, modelos de Bedrock en Agentforce, zero-copy con
  servicios AWS y A2A entre Agentforce Voice y Amazon Connect Customer. Varias capacidades son GA; A2A de voz
  quedó para otoño de 2026.
- **Google Cloud:** Salesforce headless/MCP y Agentforce con Gemini Enterprise, Tableau en Gemini, modelos Gemini
  en Agentforce, Hyperforce sobre Google Cloud y expansión zero-copy con BigQuery. La disponibilidad mezcla GA,
  beta, private preview y migraciones de clientes en Q4 2026.
- **Siemens:** Teamcenter SLM se conecta con Agentforce para poner conocimiento de ingeniería en ventas y servicio.
  Es un caso de cliente y partnership, no evidencia de que la integración esté disponible para cualquier org.

## Interpretación operativa

Salesforce está separando tres decisiones que antes aparecían juntas: el **contexto gobernado** (Data 360,
Customer 360 y permisos), el **motor de razonamiento** (Koa, Claude, Gemini, Bedrock u otros) y la **interfaz**
(Lightning, Slack, Claude, Coworker, Amazon Quick o Gemini). La calidad de datos, semántica, permisos, acciones,
evaluación, supervisión y costo de consumo son por tanto parte del alcance; una demo o anuncio no prueba resultado
operativo.

## Fuentes primarias

- [AIforce](https://www.salesforce.com/news/stories/aiforce-announcement/) — Salesforce, 2026-09-15.
- [Koa](https://www.salesforce.com/news/press-releases/2026/09/15/koa-reasoning-model/) — Salesforce/NVIDIA, 2026-09-15.
- [Agentforce job-ready agents](https://www.salesforce.com/ap/news/press-releases/2026/09/14/ph-salesforce-expands-agentforce-with-a-new-portfolio-of-ai-agents-built-for-high-value-work/) — Salesforce, 2026-09-14.
- [AWS collaboration](https://www.salesforce.com/news/stories/aws-salesforce-enterprise-ai-expansion/) — Salesforce/AWS, 2026-09-15.
- [Google Cloud collaboration](https://www.salesforce.com/news/stories/salesforce-google-cloud-unify-infrastructure-and-agents/) — Salesforce/Google Cloud, 2026-09-15.
- [Siemens partnership](https://www.salesforce.com/news/press-releases/2026/09/15/siemens-agentforce-redefine-industrial-sales-service/) — Salesforce/Siemens, 2026-09-15.
